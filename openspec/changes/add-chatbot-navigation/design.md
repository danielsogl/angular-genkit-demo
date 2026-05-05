## Context

The advisor chatbot currently streams text-only replies through a Genkit flow at `/api/chat` (`src/ai/flows/advisor-chat.flow.ts`). The Angular client (`AdvisorChatService`, `src/app/chat/advisor-chat.ts`) consumes that stream via `streamFlow<{ reply: string }, string>` and appends concatenated chunks to a single assistant bubble. Routes today are static placeholders (`/`, `/overview`, `/library`, `/settings`) all rendered by one `Placeholder` component, and the side navigation reads from the `NAV_ITEMS` constant in `src/app/shell/nav-items.ts`.

We want advisors to drive navigation by speaking German prompts ("Öffne Einstellungen", "Gehe zum Depot"). That requires (a) the model deciding _what_ to navigate to and (b) the client _executing_ that navigation safely on the main thread. Genkit 1.33's tool calling already exposes `toolRequest` content parts inside streamed chunks, so we can lean on the framework rather than parsing free text.

**Key constraints**

- Stack is Angular 21 + Angular SSR + Genkit 1.33 with `@genkit-ai/anthropic` (Claude Sonnet 4.5).
- Stream schema is currently `z.string()`; broadening it is a breaking change to the wire format.
- The chat panel must keep working when the user just chats — text-only replies must still stream as today.
- BDD tests are mandatory: Vitest for flow + service, Playwright/playwright-bdd for the user-visible flow.

## Goals / Non-Goals

**Goals:**

- Define a single Genkit tool — `navigate` — that the model can call with a target identifier from a closed enum (`uebersicht | depot | kundenakte | unterlagen | einstellungen`).
- Stream tool-call events to the Angular client over the existing `/api/chat` connection without opening a second channel.
- Have `AdvisorChatService` translate tool-call events into `Router.navigate([...])` calls and surface a short German confirmation in the assistant bubble.
- Add `/depot`, `/kundenakte`, `/unterlagen` placeholder routes; rename `/library` → `/unterlagen` and `/settings` → `/einstellungen` so the URL segment matches the spoken target. Keep `/overview` (default landing) as `uebersicht`.
- Reuse the existing `Placeholder` component, parameterising its title so each route renders a distinct heading (Übersicht / Depot / Kundenakte / Unterlagen / Einstellungen).
- Cover behavior with BDD tests anchored to the WHEN/THEN scenarios in the new spec: Vitest for the flow's tool plumbing and the service's dispatch; Playwright for "user types phrase → URL changes → page heading updates".

**Non-Goals:**

- Real feature pages for Depot / Kundenakte / Unterlagen — those remain placeholders.
- Multi-step navigation flows ("open settings, then click theme") — one navigate tool call per turn is enough.
- Authentication / authorization on the new routes — orthogonal.
- Voice input — this is text-only chat.
- Internationalisation: target identifiers are German because users speak German; we do not add an English mapping yet.
- Deep-linking inside a route (e.g., `/einstellungen#theme`) — only top-level route segments are addressable.

## Decisions

### 1. `NAV_ITEMS` is the single declarative source; routes, sidenav, and tool enum are _derived_

Promote `NAV_ITEMS` to a framework-free module `src/shared/nav-items.ts`, declared `as const` so each row's `route` is a string literal:

```ts
export const NAV_ITEMS = [
  {
    route: '',
    label: 'Übersicht',
    icon: 'dashboard',
    aliases: ['Übersicht', 'Startseite', 'Home'],
  },
  { route: 'depot', label: 'Depot', icon: 'account_balance', aliases: ['Depot', 'Portfolio'] },
  {
    route: 'kundenakte',
    label: 'Kundenakte',
    icon: 'folder_shared',
    aliases: ['Kundenakte', 'Kundendossier'],
  },
  {
    route: 'unterlagen',
    label: 'Unterlagen',
    icon: 'folder',
    aliases: ['Unterlagen', 'Dokumente', 'Library'],
  },
  {
    route: 'einstellungen',
    label: 'Einstellungen',
    icon: 'settings',
    aliases: ['Einstellungen', 'Settings'],
  },
] as const satisfies readonly NavItem[];

export type NavItemRoute = (typeof NAV_ITEMS)[number]['route'];
```

Three things are derived from this constant — adding a destination is a one-line edit:

- **The Angular `Routes` array** is produced by a pure factory `buildShellRoutes(NAV_ITEMS)` in `src/app/app.routes.ts`. It maps each `NavItem` to `{ path: item.route, data: { title: item.label }, loadComponent: () => import(...).then(m => m.Placeholder) }`. The shell wrapper around the children stays in `app.routes.ts` for visibility.
- **The sidenav** keeps importing `NAV_ITEMS` from `src/app/shell/nav-items.ts`, which becomes a one-line re-export from the shared module so existing imports do not break.
- **The Genkit tool's enum** is `z.enum(NAV_ITEMS.map((i) => i.route) as unknown as readonly [NavItemRoute, ...NavItemRoute[]])`. With `NAV_ITEMS` typed `as const`, the assertion preserves the literal union; the tool description is built by concatenating `label` + `aliases` from each row.

- **Why this layout?** A regression where someone adds a sidenav item but forgets to register the route, or vice versa, is impossible — there is one literal to edit. The `aliases` field puts the German user vocabulary next to the route segment, where it is easiest to keep in sync.
- **Why a framework-free module under `src/shared/`?** It is imported from both the Angular bundle and the Genkit flow; pulling in any Angular symbol would drag the whole framework into the SSR Genkit handler graph.
- **Why `as const` rather than a runtime helper that infers types?** `as const` gives Zod's `z.enum` a literal tuple it can narrow; a runtime `.map()` on a non-`as const` array would degrade the type to `string[]` and weaken the tool's input contract.

### 2. The `navigate` tool defines target via the derived enum, not a hand-written list

`src/ai/tools/navigate.tool.ts` builds the tool from `NAV_ITEMS`:

```ts
const navigationTargets = NAV_ITEMS.map((i) => i.route) as unknown as readonly [
  NavItemRoute,
  ...NavItemRoute[],
];

export const navigateTool = ai.defineTool(
  {
    name: 'navigate',
    description: buildNavigateToolDescription(NAV_ITEMS), // composes "Use this tool when the advisor asks to open / show / navigate to a section. Targets: ..."
    inputSchema: z.object({ target: z.enum(navigationTargets) }),
    outputSchema: z.object({ navigated: z.literal(true), target: z.enum(navigationTargets) }),
  },
  async ({ target }) => ({ navigated: true, target }),
);
```

The handler is intentionally a no-op that returns a structured ack — the _side effect_ (calling `Router.navigateByUrl`) happens on the client.

- **Why an enum over a free string?** Determinism. The model cannot hallucinate a path the app does not have; Zod rejects out-of-range values before any chunk is streamed.
- **Why compose the description from `NAV_ITEMS` rather than write it once and copy-paste?** When a destination is added, its German aliases must reach the model prompt. Sourcing the description from `aliases` makes that automatic.
- **Why a no-op handler instead of `returnToolRequests: true`?** With a real handler, the model still receives a tool response and can produce a one-line German confirmation ("Ich öffne die Einstellungen.") in the same turn. With `returnToolRequests: true` we'd have to manage the tool loop manually in the flow and fabricate a fake response, which is more code and makes streaming order harder to reason about.
- **Alternative considered**: emit a `ROUTE:depot` sentinel inside the assistant text and parse it on the client. Rejected — fragile, indistinguishable from content the model might quote, and bypasses Genkit's typed tool surface.

### 3. Stream schema becomes a discriminated union, not a string

Change `streamSchema` in `advisor-chat.flow.ts` from `z.string()` to `ChatStreamEventSchema = z.discriminatedUnion('type', [TextDeltaSchema, NavigateEventSchema])`. Inside the flow's `for await (const chunk of stream)` loop, branch on the chunk's content parts: `text` → emit `{ type: 'text', delta }`; `toolRequest` whose `name === 'navigate'` → emit `{ type: 'navigate', target }`.

- **Why a single multiplexed stream?** The client already opens exactly one stream per turn; doubling that to a second SSE channel for tool events would force coordination across two error paths. One typed channel keeps `streamFlow`'s ergonomics.
- **Why discriminated union over open shape?** Lets TypeScript force the client to `switch (event.type)` and prevents silently dropping new event types in the future.
- **Why translate Genkit's `toolRequest` shape into our own enum-payload?** Genkit's `toolRequest` includes name + ref + raw input; the client only needs `target`. Translating in the flow means the wire surface stays narrow and the client never sees Genkit-internal fields.

### 4. Client dispatches navigation from the stream consumer in `AdvisorChatService`

Inject `Router` into `AdvisorChatService` (`providedIn: 'root'`). In the existing `for await (const chunk of stream)` loop inside `replyResource`, switch on `chunk.type`:

- `'text'` → keep current behavior (append delta to the resource value).
- `'navigate'` → call `router.navigateByUrl('/' + event.target)`. The event's `target` is already the literal route segment (because the tool's enum _is_ the set of route segments — see Decision 1), so no lookup table is needed. The dispatcher only needs to prefix `/`.

- **Zone / injection context**: the app does not opt into zoneless change detection (no `provideZonelessChangeDetection` in `app.config.ts`), so async-iterator callbacks run inside the zone and `router.navigateByUrl` triggers change detection normally. No `runInInjectionContext` wrapping is needed because `Router` is captured via `inject()` at construction time, not inside the async callback.
- **SSR safety**: `Router` is available during SSR but its navigation is a no-op for server-rendered output. This service is only consumed by the chat panel, which itself only renders client-side, so there is no risk of double navigation.
- **Alternative considered**: have the chat panel component (not the service) react to a `navigate$` output from the service. Rejected — couples navigation to a particular consumer, breaks if multiple chat panels ever exist (e.g., a debug tool), and forces the panel to know about routing.

### 5. Routes are generated from `NAV_ITEMS`; `Placeholder` reads its title from route data

`app.routes.ts` calls `buildShellRoutes(NAV_ITEMS)` instead of spelling out children. The factory returns one child route per item: `{ path: item.route, data: { title: item.label }, loadComponent: () => import('./shell/placeholder/placeholder').then(m => m.Placeholder) }`. The `Placeholder` component reads `title` reactively from `ActivatedRoute.data` via `toSignal(route.data)` plus a `computed`, so a single OnPush component serves all destinations.

The legacy English routes `/overview`, `/library`, `/settings` are removed (no redirects — bookmarks were never advertised; we accept the breakage as listed in the proposal).

- **Why a factory instead of a literal `Routes` array?** It is the mechanism that makes adding a destination a one-line edit. Without it, `app.routes.ts` would still need a manual entry per item, defeating the purpose of the shared constant.
- **Why drop the old routes outright instead of redirecting?** This app has no production users yet (workshop scaffold); redirects would just be code we'd delete next sprint.
- **Why `data.title` over five wrapper components?** One source of truth, less code, and `Placeholder` stays a single OnPush component.

### 6. Test layout follows existing BDD convention

- **Vitest** (per `.claude/CLAUDE.md` testing strategy): one `describe` per Requirement, one `it('Scenario: <name>', …)` per Scenario, body structured `// Given … // When … // Then …`.
  - `src/ai/flows/advisor-chat.flow.spec.ts` — covers tool definition, enum validation, and stream-event multiplexing.
  - `src/app/chat/advisor-chat.spec.ts` — covers the service's tool-call dispatch using a stubbed `Router`.
- **Playwright + playwright-bdd**: new `e2e/features/chatbot-navigation.feature` with `Feature` and `Scenario` names verbatim from the new spec; steps under `e2e/steps/chatbot-navigation.steps.ts`. Locators use `getByRole('navigation')`, `getByLabel('Nachricht')`, `getByRole('main')` — never CSS selectors tied to Material's internal DOM.

## Risks / Trade-offs

- **Risk**: Claude Sonnet 4.5 occasionally calls a tool with the right intent but the wrong enum value (e.g., spells `"einstellung"`). → **Mitigation**: Zod's enum rejects pre-call; the flow catches the rejection, emits an apologetic German text chunk, and skips the navigate event. Covered by a Vitest scenario.
- **Risk**: Two consecutive tool calls in one turn (model navigates twice). → **Mitigation**: Cap with `maxTurns: 2` and explicitly tell the system prompt "rufe `navigate` höchstens einmal pro Antwort auf". The dispatcher also debounces — only the first `navigate` event per turn is honored.
- **Risk**: Renaming `/library` and `/settings` breaks the existing Playwright tests for `dashboard-shell`. → **Mitigation**: As part of this change, update the existing feature files to assert on the new German routes; the modified `dashboard-shell` capability spec covers this.
- **Risk**: `Router.navigate` on SSR fires during prerender. → **Mitigation**: `AdvisorChatService` is only entered when the chat panel mounts; the panel is client-only because it's lazy-mounted inside the FAB toggle. We add a `isPlatformBrowser` guard around the navigate call as belt-and-braces.
- **Trade-off**: We rewrite the wire format of `/api/chat` from `string` chunks to a typed event stream. Any other (hypothetical) consumer of the flow breaks. There are no other consumers today, so the cost is zero, but it is a one-way door — once shipped, downstream stream parsers must handle the union.

## Migration Plan

1. Land the new `chatbot-navigation` capability spec and the deltas to `advisor-chatbot` and `dashboard-shell` (this OpenSpec change).
2. Add the framework-free `src/shared/nav-items.ts` module first; have `src/app/shell/nav-items.ts` re-export from it. Import it from both the Genkit tool and the Angular client.
3. Replace `app.routes.ts` with the `buildShellRoutes(NAV_ITEMS)` factory, update `Placeholder` to read `title` from route data, and verify the sidenav still renders the same entries — all in one commit so the sidenav, URL, and page heading stay consistent.
4. Switch the flow's stream schema to the discriminated union; update the service's stream consumer in the same commit (wire format change is atomic).
5. Add tests last per requirement → scenario, run `npm run lint && npm test && npm run e2e && npm run format:check && npm run build` before reporting done.

## Open Questions

- Should the assistant bubble visually distinguish a navigation-only reply (e.g., a small chip "→ Depot")? Default plan: render the model's spoken text as usual; do not add UI chrome for the tool call. Revisit after first user testing.
- Do we want a soft "did you mean Depot?" confirmation when the model is unsure? Out of scope for v1 — the enum is small enough that the model rarely guesses wrong; revisit if telemetry shows otherwise.
