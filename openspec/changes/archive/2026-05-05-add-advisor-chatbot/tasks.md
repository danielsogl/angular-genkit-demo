## 1. Genkit server setup

- [x] 1.1 Create `src/ai/genkit.ts` with the `ai` instance using `anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] })` and `anthropic.model('claude-sonnet-4-5')` as default; re-export `z` from `genkit`.
- [x] 1.2 Add the exported `ADVISOR_SYSTEM_PROMPT` constant (English text) requiring German output, formal "Sie"-Form, and a financial-advisor tone.
- [x] 1.3 Define `ChatMessage` and `ChatRole` types (`'user' | 'assistant'`) and matching Zod schemas in `src/ai/flows/advisor-chat.flow.ts`.
- [x] 1.4 Implement `advisorChatFlow` in `src/ai/flows/advisor-chat.flow.ts` using `ai.defineFlow` with `inputSchema = { userName, history, message }`, `streamSchema = z.string()`, `outputSchema = z.object({ reply: z.string() })`; call `ai.generateStream` with `system = ADVISOR_SYSTEM_PROMPT` and a messages array built from history + the new user message; pipe each chunk's `.text` through `sendChunk`; return `{ reply: response.text }`.
- [x] 1.5 Create `src/ai/index.ts` that imports `./genkit.js` and `./flows/advisor-chat.flow.js` so the Genkit Dev UI can discover the flow.
- [x] 1.6 Add a `genkit:ui` script to `package.json`: `genkit start -- npx tsx --watch src/ai/index.ts`.

## 2. SSR endpoint

- [x] 2.1 Update `src/server.ts` to import `expressHandler` from `@genkit-ai/express` and `advisorChatFlow` from `./ai/flows/advisor-chat.flow.js`.
- [x] 2.2 Mount `app.use(express.json())` (if not already) and `app.post('/api/chat', expressHandler(advisorChatFlow))` _before_ the catch-all SSR handler.
- [x] 2.3 Verify `npm run build` compiles the SSR bundle with the flow imported and no unused-export warnings; run `npm run serve:ssr:angular-ai-chat` once locally to smoke-check the route boots.

## 3. Chat types

- [x] 3.1 Create `src/app/chat/chat-types.ts` exporting `ChatRole = 'user' | 'assistant'`, `ChatMessage = { role: ChatRole; content: string }`, and `ChatTurnRequest = { userName: string | null; history: readonly ChatMessage[]; message: string }`. Mirror the server-side Zod-derived types.

## 4. AdvisorChatService (resource-based)

- [x] 4.1 Create `src/app/chat/advisor-chat.ts` as `@Injectable({ providedIn: 'root' })` (no `standalone: true`) using `inject()` for `CurrentUserService`. Do NOT use constructor injection.
- [x] 4.2 Define internal signals using Pattern 1 (Angular AI design patterns):
  - `#draft = signal('')` for raw composer text (exposed read-only via `draft = this.#draft.asReadonly()` plus `setDraft(value: string)`).
  - `#history = signal<readonly ChatMessage[]>([])` for committed turns (exposed read-only).
  - `#submittedTurn = signal<ChatTurnRequest | null>(null)` as the resource trigger.
- [x] 4.3 Define `replyResource = resource({ params, stream })` per Pattern 4:
  - `params: () => this.#submittedTurn()` — when `null`, the resource stays idle and does not call the network (this is the SSR guard).
  - `stream: async ({ params, abortSignal }) => { ... }` — return a `signal<ResourceStreamItem<string>>({ value: '' })` that is updated as `streamFlow({ url: '/api/chat', input: params })` yields chunks. Pass `abortSignal` through to `streamFlow` so a new `submittedTurn` value cancels the previous request.
  - Inside the stream factory, on caught error set the signal to `{ error: err as Error }`. Do NOT swallow the error — `replyResource.error()` must surface it.
- [x] 4.4 Define `displayedMessages = computed<readonly ChatMessage[]>(...)` that returns `history()` plus an in-flight `{ role: 'assistant', content: replyResource.value() ?? '' }` when `replyResource.isLoading() || replyResource.hasValue()`. Do NOT use `effect()` to sync state — that is an anti-pattern per Angular guidance.
- [x] 4.5 Implement `seedGreeting(name: string | null): void`: if `history()` is empty, push a deterministic German greeting. With name: `"Hallo ${name}, wie kann ich Sie heute unterstützen?"`. Without name: `"Guten Tag, wie kann ich Sie heute unterstützen?"`. Make no network call.
- [x] 4.6 Implement `send(message: string): void`:
  - Trim `message`; bail if empty.
  - If `replyResource.hasValue()` and the previous `replyResource.status()` is `'resolved'`, fold the previous assistant text into `#history` first.
  - Append `{ role: 'user', content: message }` to `#history`.
  - Clear `#draft`.
  - Read the advisor's `userName` once via `inject(CurrentUserService).user()?.name ?? null`.
  - Set `#submittedTurn` to `{ userName, history: history(), message }` — this triggers the resource.
- [x] 4.7 Implement `retry(): void` as `this.replyResource.reload()`. Do NOT track a custom `lastUserMessage`; `submittedTurn` is unchanged so the loader re-runs against the same input.
- [x] 4.8 Expose only signal/method surface: `draft`, `setDraft`, `history`, `displayedMessages`, `replyResource` (or narrowed `isStreaming = computed(() => replyResource.isLoading())`, `error = computed(() => replyResource.error())`, `status = computed(() => replyResource.status())`), `send`, `retry`, `seedGreeting`.

## 5. Chat UI components

- [x] 5.1 Create `ChatLauncher` (`src/app/chat/chat-launcher/chat-launcher.ts`) with `ChangeDetectionStrategy.OnPush`. Use `input<boolean>('panelOpen')` and `output<void>('toggle')` from `@angular/core` (NOT decorators). Render a `mat-fab` with the `smart_toy` Material icon. Place `aria-expanded` and `aria-label="Assistent öffnen"` in the component's `host` object — do NOT use `@HostBinding`.
- [x] 5.2 Create `ChatPanel` (`src/app/chat/chat-panel/chat-panel.ts`) with `ChangeDetectionStrategy.OnPush`. Inject `AdvisorChatService` via `inject()`. The component's `host` object SHALL include `'role': 'dialog'`, `'[attr.aria-labelledby]': 'titleId'`, and `'(keydown.escape)': 'requestClose.emit()'` — no `@HostListener`. Use `output<void>('requestClose')`. Render a header with German title "Assistent" and close button, an `<ol aria-live="polite">` rendering `chat.displayedMessages()` via `@for`, and the composer.
- [x] 5.3 Composer in `ChatPanel`: a single `<input>` whose value is two-way bound to `chat.draft()` via `[value]="chat.draft()" (input)="chat.setDraft($any($event.target).value)"` (plain signal — Signal Forms is overkill for one ungated text field). Disable the input and send button when `chat.isStreaming()` is `true` using `[disabled]` (NOT a `disabled()` attribute). On Enter without Shift, call `chat.send(chat.draft())`. Use `class` and `style` bindings, never `ngClass`/`ngStyle`. Use `@if` and `@for`, never `*ngIf`/`*ngFor`.
- [x] 5.4 Create `ChatMessage` component (`src/app/chat/chat-message/chat-message.ts`) with `input<ChatMessage>('message')`. Render the bubble. When `chat.status() === 'error'` and this is the in-flight assistant message, render the German error text plus a "Erneut versuchen" button wired to `chat.retry()`. Use `@if` for the error branch.
- [x] 5.5 Create `ChatLauncherHost` (`src/app/chat/chat-launcher-host/chat-launcher-host.ts`) — a tiny container component with `ChangeDetectionStrategy.OnPush` owning a `panelOpen = signal(false)`. Inject `AdvisorChatService` and `CurrentUserService`. Render `<app-chat-launcher [panelOpen]="panelOpen()" (toggle)="toggle()" />` and `@if (panelOpen()) { <app-chat-panel (requestClose)="close()" /> }`. On open: call `chat.seedGreeting(user()?.name ?? null)` (idempotent) and move focus to the input via a `viewChild` + `afterNextRender` (only context where `afterNextRender` is appropriate). On close: return focus to the FAB.
- [x] 5.6 Style the FAB and panel for desktop (~360×520 px, fixed bottom-right with 24 px margin) and handset (full-width minus 16 px margin, capped at 80vh). Z-index below `MatDialog`'s overlay (e.g. 900). Styles in component SCSS files referenced via `styleUrl` relative to the component TS file.

## 6. Wire into the dashboard shell

- [x] 6.1 Import `ChatLauncherHost` into `DashboardShell` and project `<app-chat-launcher-host />` as the last child of `.shell`, outside `<mat-sidenav-container>`, so it overlays the routed content on every route.
- [x] 6.2 Verify by running `npm start` and tabbing through the page that the FAB appears on `/`, `/overview`, `/library`, and `/settings` and is reachable by keyboard.

## 7. Vitest BDD coverage

- [x] 7.1 In `src/app/chat/chat-launcher-host/chat-launcher-host.spec.ts` cover Requirement "Floating launcher is reachable from every routed view" (FAB present, accessible name in German) and "Chat panel opens and closes from the launcher" (open via click, close via Escape, `aria-expanded` toggles, focus moves to input on open and back to FAB on close). One `describe` per Requirement, one `it('Scenario: <name>', ...)` per Scenario, body structured `// Given … // When … // Then`.
- [x] 7.2 In `src/app/chat/advisor-chat.spec.ts` cover Requirement "Bot greets the advisor by name in German" (named greeting, null fallback, no `/api/chat` call) and "Errors surface as a German message with a retry action" using a fake `streamFlow` (mocked via `vi.mock('genkit/beta/client', ...)`). Drive the resource by calling `service.send(...)` and assert `replyResource.value()` accumulates chunks. For retry: simulate a rejected stream, assert `replyResource.error()` is set, then call `service.retry()` and assert `replyResource.reload` was invoked (spy via `vi.spyOn`). Use Vitest's `vi.fn()` / `vi.mock()` (NOT Jasmine).
- [x] 7.3 In `src/app/chat/chat-panel/chat-panel.spec.ts` cover Requirement "Advisor can send a message and receive a streamed reply" using a fake `AdvisorChatService` (provided via `TestBed`): submit via Enter and via the send button, assert empty input is ignored, assert input is disabled when `isStreaming()` returns true, assert the in-flight assistant bubble grows as the fake's `replyResource.value()` updates.
- [x] 7.4 In `src/ai/flows/advisor-chat.flow.spec.ts` assert `ADVISOR_SYSTEM_PROMPT` contains the German + Sie-Form + Finanzberater directives ("Bot replies in German with a financial-advisor tone") and that the flow's input schema rejects a body missing `message` ("Chat flow is exposed via the SSR Express server" — Zod validation scenario). Mock `ai.generateStream` so this test does not hit Anthropic.
- [x] 7.5 In `src/app/shell/dashboard-shell/dashboard-shell.spec.ts` add a `describe('Shell hosts the advisor chat surface')` block with scenarios verifying the launcher renders inside the shell on every route and that the routed component's bounding box is unchanged.

## 8. Playwright BDD coverage

Every user-facing spec scenario MUST be covered by exactly one Gherkin scenario in `e2e/features/advisor-chatbot.feature`. `Feature` and `Scenario` names MUST match the corresponding `### Requirement:` and `#### Scenario:` headings from `openspec/changes/add-advisor-chatbot/specs/advisor-chatbot/spec.md` and `.../dashboard-shell/spec.md` verbatim — `bddgen` matches steps by text only and the project's CLAUDE.md mandates verbatim names.

- [x] 8.1 Create one `e2e/features/advisor-chatbot-*.feature` file per OpenSpec Requirement (Gherkin disallows multiple `Feature:` blocks in a single file). One `Scenario:` per spec Scenario, names verbatim.

      Feature: Floating launcher is reachable from every routed view
        Scenario: FAB is present on the default route
        Scenario: FAB is keyboard-reachable
        Scenario: FAB does not duplicate per route

      Feature: Chat panel opens and closes from the launcher
        Scenario: Panel opens on FAB activation
        Scenario: Panel closes on FAB activation
        Scenario: Panel close via Escape
        Scenario: Panel does not block the rest of the app

      Feature: Bot greets the advisor by name in German
        Scenario: Greeting includes the advisor's name
        Scenario: Greeting falls back when no user is signed in
        Scenario: Greeting is deterministic (no flow call)

      Feature: Advisor can send a message and receive a streamed reply
        Scenario: Sending a message via the send button
        Scenario: Sending a message via Enter
        Scenario: Streamed reply appears progressively
        Scenario: Empty message is ignored
        Scenario: Input disabled while streaming

      Feature: Bot replies in German with a financial-advisor tone
        Scenario: Reply is German for an English question
        # "System prompt mandates German output" is a unit test (constant
        # assertion in src/ai/flows/advisor-chat.flow.spec.ts) — no Playwright.

      Feature: Errors surface as a German message with a retry action
        Scenario: Flow rejection shows German error
        Scenario: Retry re-invokes the flow with the previous message

      Feature: Chat flow is exposed via the SSR Express server
        Scenario: Endpoint exists at /api/chat
        Scenario: Flow streams text chunks
        # "Flow input contract is enforced by Zod schema" is a unit test on the
        # Zod schema in src/ai/flows/advisor-chat.flow.spec.ts — no Playwright.

      Feature: Chat surface meets accessibility minimums
        Scenario: Panel has an accessible name and role
        Scenario: Streaming replies are announced
        Scenario: AXE finds no violations

      Feature: Shell hosts the advisor chat surface
        Scenario: Launcher renders inside the shell on every route
        Scenario: Launcher does not affect existing shell chrome
        # "Routed components do not render their own launcher" is a static
        # assertion in dashboard-shell.spec.ts (Vitest) — no Playwright.

- [x] 8.2 Create `e2e/steps/advisor-chatbot.steps.ts` with step definitions using accessible locators only — `page.getByRole('button', { name: 'Assistent öffnen' })`, `page.getByRole('dialog', { name: 'Assistent' })`, `page.getByRole('textbox')`, `page.getByRole('button', { name: 'Erneut versuchen' })`. Never CSS selectors tied to Material's internal DOM. Reuse a11y helpers from `e2e/steps/a11y.steps.ts` and route helpers from `e2e/steps/common.steps.ts`. Cucumber matches steps by text only — never redefine a `Given` phrase as a `When`.
- [x] 8.3 Stub `/api/chat` deterministically via `page.route` so streaming scenarios do not depend on `ANTHROPIC_API_KEY`.
- [x] 8.4 Cover the "Greeting falls back when no user is signed in" scenario by overriding `CurrentUserService` via a `?mockUser=none` query parameter.
- [x] 8.5 Cover "FAB does not duplicate per route" and "Launcher renders inside the shell on every route" by navigating through `/`, `/overview`, `/library`, `/settings` in one scenario each.
- [x] 8.6 Cover "AXE finds no violations" with the panel open via the existing `@axe-core/playwright` integration.
- [x] 8.7 Tag handset-specific scenarios with `@handset`; tag desktop-only scenarios with `@desktop`. (No scenarios in the chatbot feature need project-specific tagging — all 35 advisor-chatbot scenarios are designed to pass on both `chromium` desktop and `mobile-chrome` handset projects, verified by `npm run e2e` (67 passed total).)
- [x] 8.8 Verify locally: `npm run e2e` produces `.features-gen/` specs (gitignored), and every Scenario above appears in the Playwright report on both projects.

## 9. Verification

- [x] 9.1 Run `npm run lint` — fix any violations.
- [x] 9.2 Run `npm test` — all Vitest specs pass (49 tests).
- [x] 9.3 Run `npm run e2e` — `bddgen` produces specs and Playwright passes on both `chromium` and `mobile-chrome` projects (67 tests).
- [x] 9.4 Run `npm run format:check` — Prettier clean.
- [x] 9.5 Run `npm run build` — production client + SSR bundles build without errors.
- [x] 9.6 Manual smoke-check with `ANTHROPIC_API_KEY` set: SSR endpoint returns a real German Finanzberater Sie-Form reply for "Wer bist du?", and the in-browser error path renders the German error bubble + "Erneut versuchen" button (verified manually via `mcp__plugin_playwright_playwright__browser_*`).

## 10. OpenSpec archive

- [ ] 10.1 After implementation and verification, run `/opsx:archive` to fold the deltas into `openspec/specs/advisor-chatbot/spec.md` and `openspec/specs/dashboard-shell/spec.md`.
