## Context

The portal already ships an Angular 21 SSR shell (`DashboardShell`) that wraps every routed view, a `CurrentUserService` exposing the signed-in advisor as a signal, and a Material 21 design system. Genkit 1.33 is installed (`genkit`, `@genkit-ai/anthropic`, `@genkit-ai/express`) but unused — there is no Genkit instance, no flow, and `src/server.ts` only wires SSR.

We adopt two reference designs:

1. **Genkit + Angular** (https://genkit.dev/docs/js/frameworks/angular/) — define the flow on the server, mount it on the SSR Express app via `expressHandler`, and call it from the client with `streamFlow` from `genkit/beta/client`.
2. **Angular AI design patterns** (https://angular.dev/ai/design-patterns) — model the in-flight reply as `resource({ stream })`, separate raw-input and submitted-input signals (Pattern 1), use `linkedSignal` to accumulate streamed content into transcript history (Pattern 2), and rely on `resource.reload()` / `resource.error()` / `resource.status()` for retry and error state (Pattern 3).

We replace the Genkit guide's `googleAI` plugin with `@genkit-ai/anthropic` because that's what the project already depends on. We replace the guide's hand-rolled `streamFlow()` consumer with the Angular AI pattern's `resource({ stream })` wrapper because that is the framework-recommended way to bring async streams into signal-based state.

This change is the conversational shell: the surface (FAB + panel) and the first end-to-end greeting flow. It is intentionally small so follow-up changes can layer in tools (route navigation, customer-data lookups) without rewriting the foundation.

## Goals / Non-Goals

**Goals:**

- A persistent, route-agnostic chat surface reachable from every view in the dashboard shell.
- A streaming Genkit flow on the SSR Express server that an Angular client can call without bespoke HTTP plumbing.
- A bot persona that addresses the advisor by name in German with a professional, advisor-appropriate tone.
- Tests anchored to the BDD scenarios in this change's specs (Vitest for components/flow, Playwright for the user-visible flow).
- Accessibility on par with the rest of the shell: AXE-clean, keyboard-operable, focus management on open/close.

**Non-Goals:**

- Tools that change application state, navigate routes, or read customer data — deferred to a follow-up change.
- Server-side conversation persistence; the in-memory transcript lives only on the client signal during the page lifetime.
- Multi-turn memory beyond the current session (no database, no Genkit `chat()` long-term store yet).
- Authentication or rate-limiting of `/api/chat` beyond what the SSR server already provides.
- Multilingual UI; the bot speaks German only. Prompts may be authored in English.
- Markdown rendering in messages — plain text only for the first iteration.

## Decisions

### 1. Anthropic plugin instead of Google AI

The Angular guide uses `@genkit-ai/google-genai`, but the project already depends on `@genkit-ai/anthropic` (added in commit `ef7453a`). Standardising on Anthropic avoids introducing a second model provider and matches the `ANTHROPIC_API_KEY` the user is expected to already hold. We use `anthropic.model('claude-sonnet-4-5')` as the default and document the env var as a deployment requirement.

**Alternative considered**: Google Gemini via `@genkit-ai/google-genai`. Rejected to avoid an unused second provider and an extra API key.

### 2. Streaming via `expressHandler` + `resource({ stream })`

**Server**: the flow is defined with `streamSchema: z.string()` and emits text chunks via `sendChunk`. Mounted at `/api/chat` via `@genkit-ai/express`'s `expressHandler`.

**Client**: instead of consuming `streamFlow()` imperatively in a service, we wrap it in `resource({ stream })` per the Angular AI streaming pattern (Pattern 4 in the official guide). The resource exposes the in-flight reply as a signal that the template reads through `replyResource.value()`, with `isLoading()` / `hasValue()` / `error()` / `status()` giving us loading and error states for free, and `reload()` providing built-in retry. This is materially better than a manual store because:

- It's the Angular-recommended pattern, so anyone reading the code recognises it.
- Cancellation is automatic via the resource's `abortSignal` (passed into the `streamFlow` request).
- Retry is `replyResource.reload()` — no custom code path.
- Error state is `replyResource.error()` — we don't track it ourselves.

```ts
// Pattern 4 + Pattern 1 sketch
submittedTurn = signal<ChatTurnRequest | null>(null);

replyResource = resource({
  params: () => this.submittedTurn(),
  stream: async ({ params, abortSignal }) => {
    const data = signal<ResourceStreamItem<string>>({ value: '' });
    if (!params) return data;
    const { stream, output } = streamFlow<string, string>({
      url: '/api/chat',
      input: params,
      abortSignal,
    });
    (async () => {
      try {
        for await (const chunk of stream) {
          data.update((prev) => ('value' in prev ? { value: prev.value + chunk } : prev));
        }
        await output;
      } catch (err) {
        data.set({ error: err as Error });
      }
    })();
    return data;
  },
});
```

**Alternative considered**: Non-streaming `runFlow` + `resource({ loader })`. Rejected because typical Anthropic responses take seconds; without streaming the panel feels frozen.

**Alternative considered**: Imperative `ChatStore` with `send()`/`update()` mutating signals. Rejected because it duplicates state already exposed by `resource` (loading, error, status) and contradicts the official Angular AI pattern.

### 3. Flow input includes the user identity

Rather than embedding the advisor's name into the system prompt at flow-definition time, the flow accepts `{ userName: string | null, history: ChatMessage[], message: string }` as input and the server-side prompt template interpolates the name. The greeting on first open is _not_ a server call: the panel shows a deterministic German greeting derived from `CurrentUserService.user()?.name` so the first paint is instant and works offline. The flow is invoked only when the advisor sends an actual message.

**Alternative considered**: Have the flow generate the greeting too. Rejected because (a) it costs a network round-trip on every panel open, (b) it makes the greeting non-deterministic, which is brittle for Playwright assertions, and (c) the brief is "greet the user", not "hold a conversation about greeting them".

### 4. System prompt authored in English, output enforced in German

The system prompt is in English (per the user's brief that prompts may be English) and includes a hard instruction: "You always respond in German, regardless of the language the user writes in. You address the user as a financial advisor (Finanzberater) using formal but warm professional German (Sie-Form, no slang, no over-formality). Keep replies concise unless asked otherwise."

We do _not_ translate user input before sending — Claude handles the bilingual case natively. We _do_ assert German output behaviourally in tests (e.g., the greeting contains the user's name and a German salutation).

### 5. FAB hosted by the dashboard shell, not the routed view

The shell adds a `<app-chat-launcher />` projected outside `<main>` so it floats above the routed content area on every route. Putting it in the shell (rather than inside individual feature routes) satisfies the existing `dashboard-shell` requirement that no per-route configuration is needed for chrome.

The FAB uses `mat-fab` with the Material `smart_toy` icon; the panel is an `@if`-guarded element positioned `fixed bottom-right`, sized for a desktop sidebar (~360×520 px) and full-width minus margins on handset breakpoints. We do _not_ use `MatDialog` because the panel is non-modal — the advisor must keep using the app while it's open.

**Alternative considered**: `MatDialog` or `MatBottomSheet`. Rejected: both seize focus and dim the page, contradicting the "assist while working" intent.

### 6. State shape: trigger signal + `resource` + `linkedSignal` history

Following Pattern 1 (separate input from submitted) and Pattern 2 (`linkedSignal` for accumulation), the chat feature owns three signals plus the resource:

```ts
// Raw composer text — bound 1:1 to the input element
draft = signal('');

// Committed turns — what the transcript renders for past messages
history = signal<readonly ChatMessage[]>([]);

// Trigger: set on submit, read by the resource's params
submittedTurn = signal<ChatTurnRequest | null>(null);

// Streamed reply for the current turn
replyResource = resource({ params: () => this.submittedTurn(), stream: ... });

// What the template iterates over: history + the live in-flight assistant bubble
displayedMessages = computed<readonly ChatMessage[]>(() => {
  const base = this.history();
  if (this.replyResource.isLoading() || this.replyResource.hasValue()) {
    return [...base, { role: 'assistant', content: this.replyResource.value() ?? '' }];
  }
  return base;
});
```

When the user sends a new message:

1. Append the user message **and** the previous finalized assistant turn (if any) to `history`.
2. Clear `draft`.
3. Set `submittedTurn` to `{ userName, history: history(), message }`. The resource sees a new `params` value, aborts any prior stream, and starts a fresh one.

We do not use `effect` to commit the resource value into `history` — the references explicitly call that an anti-pattern. Instead, the commit happens at the next `send()` (lazy) or on panel close. For the v1 contract this is sufficient: the in-flight bubble is visually identical to a finalized one, and the only observable difference is that `replyResource.reload()` would re-run the _current_ turn, which is what retry needs anyway.

**Imports** are isolated: `streamFlow` from `genkit/beta/client` is imported only inside the resource factory, and the resource itself lives in a single feature-scoped service so components stay testable with a fake service.

The relative URL `/api/chat` is used so the same code path works under `ng serve` (which runs the SSR Express app for `/api/*`) and under the production SSR server. No baseURL config needed.

### 7. Folder layout

```
src/
  ai/
    genkit.ts             # `ai` instance, default model, system prompt constants
    flows/
      advisor-chat.flow.ts
    index.ts              # imports flow for genkit start dev UI
  app/
    chat/
      chat-launcher/      # FAB component (input(panelOpen), output(toggle))
      chat-panel/         # panel component (header, message list, composer)
      chat-message/       # individual message bubble
      advisor-chat.ts     # AdvisorChatService: history, submittedTurn, replyResource, displayedMessages
      chat-types.ts       # public types: ChatMessage, ChatRole, ChatTurnRequest
```

`AdvisorChatService` is `@Injectable({ providedIn: 'root' })` and exposes only signals plus `send(message: string)`, `retry()` (which calls `replyResource.reload()`), and `seedGreeting(name: string | null)`. Its public surface is signal-only — no observables, no promises (apart from the awaited stream completion inside the resource factory). We do not pull in `@ngrx/signals` for one feature.

### 8. Error handling via resource state

Two failure modes matter: (a) flow rejection (network / API key missing / model error) and (b) abort (user closes panel or sends a new turn mid-stream). Both surface through `replyResource.error()` and `replyResource.status()`. The template renders a German error bubble ("Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.") plus a "Erneut versuchen" button when `replyResource.status() === 'error'`. The button calls `replyResource.reload()`, which re-runs the loader against the unchanged `submittedTurn` value — exactly the retry-with-same-input semantics we want, with no custom `lastUserMessage` tracking. We log the underlying error to the console for developer debugging and never to the UI.

Aborts triggered by the user closing the panel are intentional and not reported as errors; the resource simply yields nothing further.

### 9. SSR vs. browser

`streamFlow` uses `fetch` with streaming response bodies and only runs in the browser. We do **not** need `afterNextRender` or platform guards because `resource` defers automatically: while `submittedTurn()` is `null`, `params` is `null` and the resource stays in `'idle'` without invoking the loader. SSR prerender therefore renders the empty panel with the deterministic greeting and never opens a streaming connection. The first stream starts only after a user-initiated `send()` in the browser.

### 10. `host` object for keyboard handling

The chat panel handles `Escape` to close. Per the project's CLAUDE.md, we do **not** use `@HostListener`; the listener lives in the component's `host` object:

```ts
@Component({
  selector: 'app-chat-panel',
  host: {
    'role': 'dialog',
    '[attr.aria-labelledby]': 'titleId',
    '(keydown.escape)': 'requestClose()',
  },
  ...
})
```

Likewise, `aria-expanded` on the launcher FAB is bound via the `host` object using the `panelOpen` input.

## Risks / Trade-offs

- [ANTHROPIC_API_KEY missing in dev] → The flow will throw on first send. Mitigation: document the env var in `proposal.md` impact and surface a clear German error message in the UI; do not crash the page. The greeting is deterministic so the panel still works visibly without a key.
- [Streaming over SSR Express dev server] → `ng serve` in Angular 21 with `outputMode: "server"` runs the SSR Express app for `/api/*` routes; this is the supported pattern per the Genkit Angular guide. Risk: dev-server proxying could buffer responses and break perceived streaming. Mitigation: rely on `expressHandler`'s SSE-friendly transport, verify in a Playwright scenario that _partial_ assistant text appears within 2 s of send.
- [`resource` API is experimental] → `resource()` is documented as experimental in Angular 21. Risk: minor API drift in a patch release. Mitigation: confine usage to `AdvisorChatService` so a future migration touches one file; keep a Vitest spec asserting the public method surface (`send`, `retry`, signals) so a breaking change is caught immediately.
- [`streamFlow` abort wiring] → If `streamFlow` does not honour the `abortSignal` we pass through, sending a second message before the first completes could leak HTTP connections. Mitigation: verify in a Vitest spec that aborting the resource (by changing `params`) terminates the underlying iterator; if `streamFlow` ignores the signal, fall back to wrapping it in an `AbortController.signal`-aware `fetch` adapter.
- [Bot persona drift] → The system prompt is the only contract enforcing "German, professional advisor tone". Mitigation: extract it as a single exported constant (`ADVISOR_SYSTEM_PROMPT`) and add a Vitest assertion that the constant contains the German + tone directives so accidental edits get flagged.
- [Adding chrome to the shell] → The shell currently has zero overlay UI; adding a FAB risks shifting layout or covering the FAB used by future features. Mitigation: position the FAB in a fixed `position: fixed` z-layer above content but below `MatDialog`'s overlay (z-index < 1000), and verify on both desktop and `mobile-chrome` Playwright projects.
- [Client transcript reset on reload] → Conversations are lost on navigation away from the SPA boundary or hard reload. Acceptable for v1; a persisted history is explicitly out of scope and can layer on top of the existing signal store later.

## Migration Plan

This is additive. There are no data migrations and no breaking API changes. Deployment requires `ANTHROPIC_API_KEY` in the SSR runtime environment; without it, the chat panel renders and shows the deterministic greeting but any send returns the German error message. Rollback is "remove the FAB from the shell template and the `/api/chat` route from `server.ts`" — no persisted state to clean up.

## Open Questions

- Should the FAB be hidden on the (currently nonexistent) login route once auth lands? Out of scope here, but the shell should be the single owner that can opt out per-route in the future.
- What's the model budget? We default to `claude-sonnet-4-5`; if cost is a concern we can switch to `claude-haiku-4-5` later by editing one constant in `src/ai/genkit.ts` — no spec change required.
