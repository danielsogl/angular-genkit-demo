# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Detailed Angular/TypeScript coding standards live in `.claude/CLAUDE.md` and are loaded automatically — do not duplicate them here.

## Stack

- Angular 21 with SSR (`@angular/ssr`, `outputMode: "server"`, entry `src/server.ts`)
- Vitest for unit / component tests (NOT Jest — assertion/mock APIs differ)
- Playwright for end-to-end / browser tests (`e2e/` directory)
- Angular Material 21 + CDK available
- SCSS for styles (`inlineStyleLanguage: "scss"`)
- npm 11 (enforced via `packageManager` field in `package.json`)
- Genkit 1.33 with `genkitx-azure-openai` (Azure OpenAI is the only LLM provider — Anthropic/multiplex code has been removed; do not reintroduce it)
- In-browser STT via `@huggingface/transformers` (Whisper-small, German, runs in a Web Worker)

## Commands

- `npm start` — dev server on http://localhost:4200
- `npm run build` — production build (client + server bundles into `dist/`)
- `npm test` — Vitest suite via `ng test`
- `npm run e2e` — Playwright end-to-end tests
- `npm run lint` — ESLint over `src/**/*.{ts,html}`
- `npm run format` / `npm run format:check` — Prettier write / check
- `npm run serve:ssr:angular-ai-chat` — run the SSR server (requires a prior `npm run build`)

## Testing strategy: BDD with Vitest + playwright-bdd

Every feature is validated with BDD tests anchored to the `WHEN/THEN` scenarios in its OpenSpec capability spec (`openspec/changes/<change>/specs/**/*.md`).

- **Vitest** owns unit + component coverage. One `describe` per OpenSpec **Requirement**, one `it('Scenario: <name>', ...)` per **Scenario**. The body is structured `// Given … // When … // Then …`.
- **playwright-bdd** owns end-to-end coverage. Gherkin lives in `e2e/features/<capability>.feature` (one feature file per OpenSpec capability) and step definitions live in `e2e/steps/`. The `Feature` and `Scenario` names MUST match the OpenSpec scenarios verbatim. `bddgen` (run via `npm run e2e`) compiles the `.feature` files into Playwright specs in `.features-gen/` (gitignored).
- Step definitions use accessible locators (`getByRole`, `getByLabel`, `getByTestId`) — never CSS selectors tied to Material's internal DOM. Cucumber matches steps by text only, so a phrase used in `Given` must not be redefined as `When`.
- Every spec scenario MUST be covered by at least one Vitest **or** Playwright test; user-facing flows (theme switching, nav toggle, route navigation, persistence across reload) MUST have a Playwright scenario.
- `playwright.config.ts` runs `npm start` via `webServer`, with two projects: `chromium` (desktop) and `mobile-chrome` (handset).

## Verification before reporting a feature done

After implementing any feature, run all of these and fix anything that fails:

```
npm run lint && npm test && npm run e2e && npm run format:check && npm run build
```

Do not mark a feature complete unless both `npm test` (Vitest) and `npm run e2e` (Playwright) pass.

## Pre-commit (lefthook)

`lefthook` runs on `git commit` and auto-fixes staged files with `eslint --fix` and `prettier --write`, then re-stages them. Do not bypass with `--no-verify`. If a hook fails, fix the underlying issue and create a new commit (do not amend).

## AI flows (Genkit)

- All flows live in `src/ai/flows/<name>.flow.ts` with co-located `<name>.flow.spec.ts` (Vitest). Schemas go in `<name>-schema.ts`, prompt parts in `<name>.preamble.ts` (each with its own spec).
- Flows are registered via `ai.defineFlow` and exposed through `@genkit-ai/express`. Streaming uses `ai.generateStream` — keep it streaming, don't collapse to `generate`.
- Tools use `ai.defineTool` with zod input/output schemas. Co-locate tool definitions with the flow that owns them.
- Genkit dev UI: `npm run genkit:ui` (runs `genkit start -- npx tsx --watch src/ai/index.ts`).
- Before guessing a Genkit fix, consult the `developing-genkit-js` skill's `common-errors.md`.

## OpenSpec workflow

OpenSpec is active in `openspec/` (changes, specs, config). For non-trivial changes, propose through OpenSpec before implementing — use the `openspec-propose` / `openspec-apply` / `openspec-archive-change` skills rather than jumping straight to code. Do **not** auto-propose: wait for an explicit signal from the user before opening an OpenSpec change.

## Skill loading conventions

- Load `angular-developer` before writing or modifying Angular code.
- Load `developing-genkit-js` before writing or modifying Genkit flows/tools.

## MCP servers (`.mcp.json`)

- `context7` — fetch current library/framework docs; prefer over web search for library questions
- `angular-cli` — Angular CLI introspection; call `list_projects` first, then `get_best_practices` before writing Angular code
