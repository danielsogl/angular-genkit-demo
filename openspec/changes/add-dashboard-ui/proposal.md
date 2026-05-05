## Why

The application currently boots into the default Angular starter template and has no shell to host actual product features. Before any dashboard, chat, or settings views can be built, we need a reusable application shell that gives users a consistent place to navigate, identify themselves, and choose a visual theme. Establishing this shell now — using Angular Material v3 components that are already installed — keeps later feature work focused on functionality instead of layout plumbing.

## What Changes

- Replace the placeholder content in `src/app/app.html` with a Material-based application shell composed of a top app bar and a collapsible left navigation drawer.
- Add a top navigation bar that displays the currently signed-in user (name + avatar placeholder) and a theme switcher (light / dark / system).
- Add a collapsible left side navigation that toggles between an expanded mode (icon + label) and a collapsed rail mode (icon only), with placeholder navigation items.
- Introduce a Material 3 theme via the `mat.theme` SCSS mixin, with `color-scheme: light dark` and an explicit dark-mode override class on `<html>` so the theme switcher can force a mode regardless of system preference.
- Add a `CurrentUserService` that exposes the currently signed-in user as a signal. For this change the service returns a hard-coded mock user — real authentication is out of scope.
- Add a `ThemeService` that persists the selected mode (`light` / `dark` / `system`) to `localStorage` and applies the `dark-mode` class on `<html>` when needed. The service must be SSR-safe (no `window`/`localStorage` access during server rendering).
- Wire all routes through a `DashboardShellComponent` so feature routes render inside `<mat-sidenav-content>`. Keep the placeholder nav items as inert links for now.

## Capabilities

### New Capabilities

- `dashboard-shell`: Application shell composed of top bar, collapsible side navigation, and routed content area; hosts every feature route.
- `theming`: Material 3 theme configuration plus a runtime theme switcher (light / dark / system) with persistence and SSR-safe behavior.
- `current-user`: Read-only access to the currently signed-in user as a signal, exposed to the shell. Backed by a mock implementation in this change.

### Modified Capabilities

_None — `openspec/specs/` is currently empty._

## Impact

- **Source code**: `src/app/app.html`, `src/app/app.ts`, `src/app/app.config.ts`, `src/app/app.routes.ts`, `src/styles.scss`, `src/index.html` (add `mat-app-background` class on `<body>`), plus new files under `src/app/shell/`, `src/app/theming/`, and `src/app/user/`.
- **Dependencies**: No new packages. Uses already-installed `@angular/material@^21`, `@angular/cdk@^21`.
- **SSR**: Theme application and persistence must run only in the browser; the server bundle must not touch `window` / `localStorage` / `document` directly. Use `isPlatformBrowser` guards or `afterNextRender`.
- **Accessibility**: Top bar and side nav must meet WCAG AA — keyboard navigable, visible focus, correct ARIA roles (`<nav>`, `aria-label`, `aria-current="page"` on active nav item, `aria-expanded` on the collapse toggle), and the theme switcher must announce its current selection.
- **Tests**: New Vitest specs for `ThemeService`, `CurrentUserService`, and the shell component (toggle behavior, theme switching, user display). Existing `app.spec.ts` will be updated for the new template.
- **Out of scope**: Real authentication, real navigation targets, mobile-specific gestures, i18n, persisted nav-collapsed state across reloads (can be a follow-up).
