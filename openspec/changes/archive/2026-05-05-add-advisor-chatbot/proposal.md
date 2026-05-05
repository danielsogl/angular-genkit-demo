## Why

Financial advisors using the portal currently have no in-app assistant. Tasks like locating a feature, retrieving a client's information, or jumping to a specific view require manual navigation. We want a Genkit-powered chatbot that, over time, can navigate the app and surface end-customer data on demand. This change introduces the conversational surface and a first end-to-end greeting flow as the foundation; navigation control and customer-data tools are explicitly out of scope here and will land in follow-up changes.

## What Changes

- Add a floating action button (FAB) anchored to the bottom-right of the dashboard shell, showing a Material bot icon, that opens and closes a floating chat panel.
- Add a floating chat panel that overlays the current view, contains a scrollable message list, a single-line message input, and a send action; the panel does not take the user out of the current route.
- On panel open, the bot greets the advisor by name (read from `CurrentUserService`) in German with an advisor-appropriate, professional tone; if no user is signed in, the bot uses a neutral German greeting.
- Conversations are conducted in German. Prompts and code identifiers MAY be authored in English; user-visible text MUST be German.
- Add a Genkit chat flow that powers replies via `@genkit-ai/anthropic` (already a project dependency), exposed through the existing Angular SSR Express server at `/api/chat` using `@genkit-ai/express`.
- Expose the flow as a streamed response so the advisor sees tokens as they arrive.
- Add Vitest BDD coverage for the FAB/panel component and Genkit flow contract, and Playwright BDD coverage for opening the panel and seeing a personalised greeting.

This change does NOT yet add tools that navigate routes, mutate state, or read end-customer data — that surface is reserved for a follow-up change once the conversational shell is in place.

## Capabilities

### New Capabilities

- `advisor-chatbot`: Floating chat surface (FAB + panel) and the Genkit-backed reply pipeline that greets the advisor by name and answers in German with a professional advisor tone.

### Modified Capabilities

- `dashboard-shell`: The shell SHALL host the chat FAB so it is reachable from every routed view without per-route configuration.

## Impact

- **New code**:
  - `src/app/chat/` — Angular feature (FAB, panel, message list, input, chat client service).
  - `src/ai/genkit.ts` — Genkit instance configured with the Anthropic plugin.
  - `src/ai/flows/advisor-chat.flow.ts` — streaming chat flow.
  - `src/ai/index.ts` — Dev UI entry that imports the flow.
- **Modified code**:
  - `src/server.ts` — mounts `/api/chat` via `expressHandler` from `@genkit-ai/express`.
  - `src/app/shell/dashboard-shell/dashboard-shell.{ts,html}` — projects the chat FAB into the shell so it overlays the routed content area.
- **Spec deltas**: new `advisor-chatbot` spec; `dashboard-shell` gains a requirement for hosting the chat surface.
- **Dependencies**: no new runtime deps (uses existing `genkit`, `@genkit-ai/anthropic`, `@genkit-ai/express`); requires `ANTHROPIC_API_KEY` in the SSR environment.
- **Tests**: new Vitest specs under `src/app/chat/` and `src/ai/flows/`; new `e2e/features/advisor-chatbot.feature` plus matching steps under `e2e/steps/`.
- **Out of scope**: navigation tools, customer-data tools, persisted conversation history, multi-session memory, authentication of the chat endpoint beyond what the SSR server already enforces.
