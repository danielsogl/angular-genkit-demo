## Why

Today the advisor chatbot can only reply with text — users still have to find and click sidenav items to move around the app. Advisors want to drive the UI conversationally ("Öffne Einstellungen", "Zeige Depot", "Gehe zur Kundenakte") so they can keep their hands on the chat and stay in flow. To support this, the chatbot must be able to invoke navigation as a Genkit tool, and the application must expose stable target routes that map to the German section names users actually say.

## What Changes

- Promote `NAV_ITEMS` to the **single declarative source** of navigable destinations, in a framework-free shared module (`src/shared/nav-items.ts`). The Angular `Routes` array, the sidenav, AND the Genkit `navigate` tool's allowed-target enum SHALL all be derived from this one constant — adding a destination is a one-line edit, never a multi-file change.
- Add Genkit tool calling to the advisor chat flow so the model can request route changes via a typed `navigate` tool. The tool's `target` parameter is a Zod enum derived (via `as const`) from `NAV_ITEMS`; the tool's description is composed from the same constant's `label` + `aliases` fields.
- Stream tool-call events from the flow to the client alongside text chunks, so the UI can both render the assistant's confirmation and trigger navigation.
- Update `AdvisorChatService` to consume tool-call events and call Angular `Router.navigateByUrl()` on the main thread; navigation MUST happen inside Angular's zone/signal context so the route updates and the chat panel stays open.
- Replace the static `app.routes.ts` children with a `buildShellRoutes(NAV_ITEMS)` factory so routes are generated from `NAV_ITEMS`. Initial entries: Übersicht (`''`, default landing), Depot (`'depot'`), Kundenakte (`'kundenakte'`), Unterlagen (`'unterlagen'`), Einstellungen (`'einstellungen'`). The legacy English routes `/overview`, `/library`, `/settings` are removed.
- Cover the new behavior with BDD tests: Vitest scenarios for the flow's tool-call shape, the service's navigation handling, and the derivation of routes/tool enum from `NAV_ITEMS`; plus a Playwright feature for the end-to-end "user says it, page changes" flow.

## Capabilities

### New Capabilities

- `chatbot-navigation`: Defines the contract for the chatbot's `navigate` tool — its allowed targets, the streamed tool-call event shape, how the client maps tool calls to router navigation, and the user-facing confirmation behavior.

### Modified Capabilities

- `advisor-chatbot`: The chat flow now exposes a `navigate` tool to the model and streams tool-call events; the existing text-streaming requirements stay intact.
- `dashboard-shell`: `NAV_ITEMS` is rewritten with German labels and the four target routes plus Übersicht; routes `/library` and `/settings` are replaced by `/unterlagen` and `/einstellungen`; two new routes `/depot` and `/kundenakte` are added — all backed by the existing placeholder page component.

## Impact

- **Code**: new shared module `src/shared/nav-items.ts` (single source of truth, framework-free), `src/ai/flows/advisor-chat.flow.ts` (add tool, change stream schema), new `src/ai/tools/navigate.tool.ts` (enum + description derived from shared module), `src/app/chat/advisor-chat.ts` (handle tool events, inject `Router`), `src/app/app.routes.ts` (children produced by `buildShellRoutes(NAV_ITEMS)`), `src/app/shell/nav-items.ts` (re-exports the shared constant; existing imports keep working), possibly `src/app/shell/side-nav/side-nav.ts` for label updates.
- **Tests**: New Vitest specs under `src/ai/flows/` and `src/app/chat/` for tool dispatch + router invocation; new `e2e/features/chatbot-navigation.feature` and step file under `e2e/steps/`.
- **Specs**: New `openspec/specs/chatbot-navigation/spec.md`; deltas to `openspec/specs/advisor-chatbot/spec.md` and `openspec/specs/dashboard-shell/spec.md`.
- **No new runtime deps**: tool calling is part of the already-installed Genkit beta client; `@angular/router` is already wired.
- **Breaking**: URL paths `/library` and `/settings` are renamed; any bookmarks or external links break. Internal references (sidenav, tests) are updated as part of this change.
