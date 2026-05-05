# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Detailed Angular/TypeScript coding standards live in `.claude/CLAUDE.md` and are loaded automatically — do not duplicate them here.

## Stack

- Angular 21 with SSR (`@angular/ssr`, `outputMode: "server"`, entry `src/server.ts`)
- Vitest for unit tests (NOT Jest — assertion/mock APIs differ)
- Angular Material 21 + CDK available
- SCSS for styles (`inlineStyleLanguage: "scss"`)
- npm 11 (enforced via `packageManager` field in `package.json`)

## Commands

- `npm start` — dev server on http://localhost:4200
- `npm run build` — production build (client + server bundles into `dist/`)
- `npm test` — Vitest suite via `ng test`
- `npm run lint` — ESLint over `src/**/*.{ts,html}`
- `npm run format` / `npm run format:check` — Prettier write / check
- `npm run serve:ssr:angular-ai-chat` — run the SSR server (requires a prior `npm run build`)

## Verification before reporting a task done

Run all of these and fix anything that fails:

```
npm run lint && npm test && npm run format:check && npm run build
```

## Pre-commit (lefthook)

`lefthook` runs on `git commit` and auto-fixes staged files with `eslint --fix` and `prettier --write`, then re-stages them. Do not bypass with `--no-verify`. If a hook fails, fix the underlying issue and create a new commit (do not amend).

## OpenSpec workflow

OpenSpec is active in `openspec/` (changes, specs, config). For non-trivial changes, propose through OpenSpec before implementing — use the `openspec-propose` / `openspec-apply` / `openspec-archive-change` skills rather than jumping straight to code.

## MCP servers (`.mcp.json`)

- `context7` — fetch current library/framework docs; prefer over web search for library questions
- `angular-cli` — Angular CLI introspection; call `list_projects` first, then `get_best_practices` before writing Angular code
