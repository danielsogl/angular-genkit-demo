## 1. Shared `NAV_ITEMS` source of truth

- [x] 1.1 Create `src/shared/nav-items.ts` exporting `NAV_ITEMS` as `readonly NavItem[]` declared `as const satisfies readonly NavItem[]`. Each entry is `{ route, label, icon, aliases }`. Initial entries: Übersicht (`route: ''`), Depot (`'depot'`), Kundenakte (`'kundenakte'`), Unterlagen (`'unterlagen'`), Einstellungen (`'einstellungen'`). The module MUST NOT import any Angular or Genkit symbol so it can be consumed by both bundles.
- [x] 1.2 Export the derived literal-string union type `NavItemRoute = (typeof NAV_ITEMS)[number]['route']` plus a helper `buildNavigateToolDescription(items: readonly NavItem[]): string` that composes the German description from each row's `label` + `aliases`.
- [x] 1.3 Replace the existing `src/app/shell/nav-items.ts` so it becomes a one-line `export { NAV_ITEMS, type NavItem, type NavItemRoute } from '../../shared/nav-items';` re-export. Existing sidenav imports keep working without changes.

## 2. Routes generated from `NAV_ITEMS`

- [x] 2.1 Update `src/app/shell/placeholder/placeholder.ts` so it reads its title reactively from `ActivatedRoute.data` (via `inject(ActivatedRoute)` + `toSignal(route.data)` + a `computed` that reads `data.title`) and renders it as the `<h1>`. Keep `OnPush` and the existing styles. No new `@Input` is required.
- [x] 2.2 Add a pure factory `buildShellRoutes(items: readonly NavItem[]): Route[]` (next to `app.routes.ts` or inline) that maps each item to `{ path: item.route, data: { title: item.label }, loadComponent: () => import('./shell/placeholder/placeholder').then((m) => m.Placeholder) }`.
- [x] 2.3 Rewrite `src/app/app.routes.ts` so the dashboard-shell children come from `buildShellRoutes(NAV_ITEMS)`. Remove the legacy literal entries `'overview'`, `'library'`, `'settings'`.
- [x] 2.4 Add a Vitest covering the "All five routes resolve" and "Each route renders its German heading" scenarios using `RouterTestingHarness` to navigate to each `NAV_ITEMS[i].route` and assert the rendered heading equals `NAV_ITEMS[i].label`.

## 3. Genkit `navigate` tool derived from `NAV_ITEMS`

- [x] 3.1 Create `src/ai/tools/navigate.tool.ts`. Build the enum tuple with `const navigationTargets = NAV_ITEMS.map((i) => i.route) as unknown as readonly [NavItemRoute, ...NavItemRoute[]]`. Define the tool: input `z.object({ target: z.enum(navigationTargets) })`, output `z.object({ navigated: z.literal(true), target: z.enum(navigationTargets) })`, description `buildNavigateToolDescription(NAV_ITEMS)`. Handler returns `{ navigated: true, target: input.target }`.
- [x] 3.2 Add a Vitest scenario "Targets and routes share a single source of truth": assert that the tool's input schema's enum, derived from `NAV_ITEMS`, accepts every `NAV_ITEMS[i].route` and rejects any other string. The test MUST use `NAV_ITEMS` directly so adding a new item without updating the tool keeps the test green automatically.
- [x] 3.3 Extend `ADVISOR_SYSTEM_PROMPT` (or a sibling constant) with a paragraph instructing the model to call `navigate` at most once per turn when the advisor asks to open / show / navigate to a section, and to follow the call with a one-sentence German confirmation.

## 4. Stream-event schema and flow rewrite

- [x] 4.1 In `src/ai/flows/advisor-chat-schema.ts`, add `ChatStreamEventSchema = z.discriminatedUnion('type', [TextDeltaEventSchema, NavigateEventSchema])`, where `TextDeltaEventSchema = z.object({ type: z.literal('text'), delta: z.string() })` and `NavigateEventSchema = z.object({ type: z.literal('navigate'), target: z.enum(navigationTargets) })`. The `navigationTargets` tuple is imported from the shared `NAV_ITEMS` module so adding a destination expands the union automatically. Export the inferred TS types.
- [x] 4.2 Update `src/ai/flows/advisor-chat.flow.ts` to set `streamSchema: ChatStreamEventSchema`, register `tools: [navigateTool]`, set `maxTurns: 2`, and inside the chunk loop branch on content parts: text → `sendChunk({ type: 'text', delta })`, `toolRequest` named `navigate` → `sendChunk({ type: 'navigate', target: input.target })`. Track a `navigateEmitted` flag so only the first navigate request per turn is forwarded.
- [x] 4.3 Confirm the awaited `response.text` (final reply) still equals the concatenation of forwarded text deltas; this is the new contract for `output.reply`.

## 5. Client-side dispatch in `AdvisorChatService`

- [x] 5.1 In `src/app/chat/advisor-chat.ts`, update the `streamFlow` generic to the new event type (`streamFlow<{ reply: string }, ChatStreamEvent>`).
- [x] 5.2 Inject `Router` and `PLATFORM_ID` (with `isPlatformBrowser`) at the top of the service.
- [x] 5.3 Inside the `for await (const chunk of stream)` loop, switch on `chunk.type`. For `'text'` keep the existing `data.update` behaviour using `chunk.delta`. For `'navigate'` call `router.navigateByUrl('/' + chunk.target)` (the target is already the literal route segment from `NAV_ITEMS`) only on the browser, only once per turn (use a local `dispatched` flag inside the resource factory).
- [x] 5.4 Verify that resetting state across turns still works (the `dispatched` flag is per-turn, not per-service).

## 6. Vitest BDD coverage

- [x] 6.1 Add `src/shared/nav-items.spec.ts` covering the "Single declarative source drives routes, sidenav, and tool" scenarios: assert that `NAV_ITEMS` is a non-empty `as const` tuple and that `buildNavigateToolDescription(NAV_ITEMS)` mentions every `label` and at least one `aliases` entry per row.
- [x] 6.2 Add `src/ai/tools/navigate.tool.spec.ts` covering the "Tool input schema rejects an unknown target" and "Tool description lists each section's label and aliases" scenarios. The tests SHALL iterate `NAV_ITEMS` rather than hard-coding identifiers, so they keep passing when a new item is added. One `describe` per Requirement, one `it('Scenario: <name>', ...)` per Scenario, body structured `// Given / // When / // Then`.
- [x] 6.3 Add `src/ai/flows/advisor-chat.flow.spec.ts` covering "Text-only turn yields only text events", "Navigation turn emits a navigate event alongside text", and "At most one navigate event per turn" by stubbing `ai.generateStream` with a fixture iterator.
- [x] 6.4 Add `src/app/chat/advisor-chat.spec.ts` covering the `AdvisorChatService` scenarios under "Client dispatches navigate events to the Angular router". Stub `Router` with `vi.fn()`, drive the service via a fake stream from `streamFlow` (use a module mock for `genkit/beta/client`).

## 7. Playwright BDD coverage

- [x] 7.1 Create `e2e/features/chatbot-navigation.feature` with `Feature: Chatbot navigation` and one `Scenario` per WHEN/THEN block in the "Advisor can navigate via German chat phrases end-to-end" requirement (Öffne Einstellungen, Zeige Depot, Gehe zur Kundenakte, Navigiere zu Unterlagen, plus the negative "Was kannst du?"). Names MUST match the spec verbatim.
- [x] 7.2 Create `e2e/steps/chatbot-navigation.steps.ts` with steps that open the chat panel via `getByRole('button', { name: 'Assistent öffnen' })`, type into the message input via `getByLabel('Nachricht')`, submit, then assert the URL with `expect(page).toHaveURL(/\/depot$/)` and the heading via `getByRole('heading', { level: 1, name: 'Depot' })`.
- [x] 7.3 Stub the `/api/chat` endpoint via `page.route('**/api/chat', ...)` in a `BeforeAll` step so the e2e suite does not rely on the real model. The stub returns a deterministic stream that emits the corresponding `navigate` event followed by a confirmation text delta. Document the stub format in a top-of-file comment.
- [x] 7.4 Update any existing dashboard-shell e2e steps that referenced `/library` or `/settings` to the new German routes so the suite still passes.

## 8. Verification

- [x] 8.1 Run `npm run lint` and fix every reported issue.
- [x] 8.2 Run `npm test` — every new `it('Scenario: <name>', …)` MUST be green.
- [x] 8.3 Run `npm run e2e` — every Gherkin scenario MUST be green on both the `chromium` and `mobile-chrome` Playwright projects.
- [x] 8.4 Run `npm run format:check` and `npm run build` to confirm Prettier compliance and a clean production build.
- [ ] 8.5 Manually smoke-test in `npm start`: open the chat, say "Öffne Einstellungen", verify the URL changes and the heading reads "Einstellungen"; repeat for Depot, Kundenakte, Unterlagen.

## 9. Spec sync

- [ ] 9.1 Once verification passes, run `openspec archive add-chatbot-navigation` so the deltas are merged into `openspec/specs/advisor-chatbot/spec.md`, `openspec/specs/dashboard-shell/spec.md`, and a new `openspec/specs/chatbot-navigation/spec.md` is created.
