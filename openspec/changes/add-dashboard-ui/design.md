## Context

The project is a fresh Angular 21 application with SSR (`@angular/ssr`, `outputMode: "server"`), Vitest tests, SCSS styles, and `@angular/material@^21` + `@angular/cdk@^21` already installed. The default Angular starter template is still in `src/app/app.html`, routes are empty, and no Material theme is configured. We need to replace the starter content with a real application shell before any feature work begins.

Constraints driving the design:

- **Material 3 (M3)**: Use the M3 token-based system (`mat.theme` mixin) — no Material 2 helpers.
- **Signals + OnPush**: Per project standards; no RxJS for component state, no `ngClass` / `ngStyle`, no `@HostBinding` / `@HostListener`.
- **SSR-safe**: The server bundle must not call `window`, `document`, or `localStorage` at module evaluation. Browser-only side effects belong in `afterNextRender` or `isPlatformBrowser` guards.
- **A11y**: WCAG AA, AXE-clean. Top bar and side nav must be keyboard navigable with visible focus and correct ARIA semantics.
- **No new dependencies**: Solve everything with packages already in `package.json`.

Stakeholders: only the immediate Angular team — there are no production users yet.

## Goals / Non-Goals

**Goals:**

- A reusable `DashboardShellComponent` that wraps every routed feature in a `mat-toolbar` + `mat-sidenav-container` layout.
- A side nav that toggles between **expanded** (icon + label, ~240px) and **collapsed rail** (icon only, ~72px) on desktop, and switches to **over** mode (full-width drawer with backdrop) below the `Breakpoints.Handset` breakpoint.
- A `ThemeService` that supports `light` / `dark` / `system` modes, persists the choice in `localStorage`, and survives SSR without touching browser globals on the server.
- A `CurrentUserService` exposing a `Signal<User | null>` consumed by the top bar to render the user's name and an avatar placeholder.
- Tests that cover the user-visible behavior (nav toggle, theme switch, user display) without snapshotting Material's internal DOM.

**Non-Goals:**

- Real authentication, user fetching, or session handling (`CurrentUserService` returns a hard-coded mock).
- Real navigation targets — nav items are inert placeholders.
- Persisting the side-nav collapsed state across reloads.
- Mobile-specific gestures (swipe to open / close).
- i18n / RTL support beyond what Material provides out of the box.
- Customizing the M3 palette beyond picking one of the prebuilt palettes.

## Decisions

### 1. Use `<mat-sidenav-container>` with `mode="side"` + `opened="true"` and a manual rail/expanded width

**Choice**: One `<mat-sidenav>` element whose width is bound to a signal-driven CSS class (`rail` vs `expanded`). On desktop, `mode` is `"side"` and `opened` is always `true`; the collapse button only changes the width. Below the handset breakpoint, `mode` switches to `"over"` and `opened` becomes a togglable signal so the drawer slides over content with a backdrop.

**Why**: The Material sidenav docs (https://material.angular.dev/components/sidenav) describe three modes — `over`, `push`, `side`. Using a single sidenav and animating its width gives us the rail pattern without a third-party component, and `mode="side"` shrinks `mat-sidenav-content` automatically so the routed view never overlaps the rail.

**Alternatives considered**:

- _Two separate sidenavs (one rail, one expanded)_ — duplicates DOM and ARIA structure; harder to keep in sync.
- _Always `mode="over"` with a fixed-position rail_ — loses Material's automatic content shrink and forces us to reimplement focus trapping.

### 2. `BreakpointObserver` from `@angular/cdk/layout` for the handset switch, exposed as a signal via `toSignal`

**Choice**: Inject `BreakpointObserver`, observe `Breakpoints.Handset`, and convert the result with `toSignal` (initial value `false`) inside the shell component.

**Why**: It is the official Angular CDK API for responsive layout, SSR-safe (the observable simply does not emit during server rendering when the initial value is used), and the result composes cleanly with `computed()` for the sidenav `mode` and `opened` inputs.

**Alternatives considered**:

- _CSS-only (`@media` + `@container`)_ — cannot drive component inputs (`mode`, `opened`) from CSS.
- _`window.matchMedia` directly_ — requires SSR guards we would otherwise avoid.

### 3. M3 theme via `mat.theme`, dark mode via `color-scheme` + `.dark-mode` class on `<html>`

**Choice**: In `src/styles.scss`:

```scss
@use '@angular/material' as mat;

html {
  color-scheme: light;
  @include mat.theme(
    (
      color: mat.$violet-palette,
      typography: Roboto,
      density: 0,
    )
  );
}

html.dark-mode {
  color-scheme: dark;
}
```

`ThemeService` toggles the `dark-mode` class on `document.documentElement` based on the resolved mode (for `system`, it watches `matchMedia('(prefers-color-scheme: dark)')`).

**Why**: This matches the recommended pattern in the Material theming guide (https://material.angular.dev/guide/theming) — `mat.theme` outputs CSS variables that respond to `color-scheme`, so a class flip is enough to switch the entire UI without re-rendering. Defaulting `color-scheme` to `light` (instead of `light dark`) means "system" mode is an explicit opt-in driven by JS, which gives us deterministic behavior when the user has chosen a non-system mode.

**Alternatives considered**:

- _`color-scheme: light dark` only, no class_ — cannot force light or dark independent of OS preference, which the theme switcher requires.
- _Two separate theme blocks (one for light, one for `.dark` class)_ — works in M3, but doubles emitted CSS variables and is unnecessary when `light-dark()` already does the work.

### 4. SSR-safe `ThemeService` using `inject(PLATFORM_ID)` + `afterNextRender`

**Choice**: The service stores `mode` as a signal. The constructor reads `localStorage` only when `isPlatformBrowser(platformId)` is true; on the server it stays at the default `"system"`. A `linkedSignal`-style `effect()` applies the resolved class to `document.documentElement` and writes back to `localStorage`, but the effect is registered inside `afterNextRender` so it never runs during server rendering.

**Why**: `provideClientHydration(withEventReplay())` is already in `app.config.ts`. Touching `document` during SSR would crash the server bundle. `afterNextRender` is the modern, signals-friendly Angular API for browser-only side effects.

**Alternatives considered**:

- _`DOCUMENT` injection token + plain `effect()`_ — works, but `effect()` runs on the server too unless gated; `afterNextRender` makes the intent explicit.
- _Always read from `localStorage` and rely on a `try/catch`_ — silently swallows real bugs; rejected per project guidelines on error handling.

### 5. `CurrentUserService` returns a static signal for now

**Choice**: `providedIn: 'root'` service exposing `readonly user = signal<User | null>({ id: '1', name: 'Daniel Sogl', email: 'daniel.sogl@thinktecture.com', initials: 'DS' });`. No API, no async loading.

**Why**: Real authentication is explicitly out of scope. A signal-shaped API means the eventual real implementation is a drop-in replacement — consumers (`DashboardShellComponent`, future guards) do not change.

**Alternatives considered**:

- _Hard-code the user in the component_ — couples the shell to mock data; future swap requires touching the template.

### 6. Routes render inside the shell via a wrapper route

**Choice**: `app.routes.ts` declares one parent route `{ path: '', component: DashboardShellComponent, children: [ … ] }`. Feature routes are added as lazy children later. For this change, the only child is a placeholder `{ path: '', loadComponent: () => import('./shell/placeholder/placeholder').then(m => m.Placeholder) }` so the routed area is not empty.

**Why**: Keeps the shell as the single owner of the layout and gives every future feature route the toolbar + sidenav for free. Lazy loading is set up from day one per project standards.

### 7. BDD test mapping: Vitest for units, Playwright for E2E

**Choice**: Every OpenSpec scenario in `specs/**/*.md` is covered by a BDD-style test. Vitest covers the service- and component-level scenarios; Playwright covers the user-facing scenarios that span routing, theming persistence across reload, and the responsive sidenav. Test names mirror the spec verbatim (`it('Scenario: Toggle from expanded to collapsed', …)`), and the body uses `// Given / // When / // Then` comments so the test reads as Gherkin.

**Why**: The spec scenarios are already in `WHEN/THEN` form — keeping the tests in lock-step with them makes traceability obvious (any failing scenario points directly back to the requirement) and prevents the test names from drifting into implementation detail.

**Alternatives considered**:

- _A Cucumber/Gherkin runner with `.feature` files_ — would require duplicating the scenarios already living in `openspec/`. The OpenSpec change directory is the single source of truth; tests reference it.
- _Playwright only, no Vitest_ — too slow for tight feedback on signals/services and hides regressions in pure logic.

### 8. Component file layout

```
src/app/
  shell/
    dashboard-shell/
      dashboard-shell.ts
      dashboard-shell.html
      dashboard-shell.scss
    top-bar/
      top-bar.ts            # inline template — small, self-contained
    side-nav/
      side-nav.ts
      side-nav.html
    nav-items.ts            # exported NAV_ITEMS constant (label, icon, route)
    placeholder/
      placeholder.ts        # inline template — "Select a section"
  theming/
    theme.service.ts
    theme-switcher/
      theme-switcher.ts     # inline template — mat-menu with three options
  user/
    current-user.service.ts
    user.ts                 # User type
```

**Why**: Splits responsibilities so the shell template is readable, the top bar and side nav can be tested in isolation, and theming + user concerns are clearly separated from layout. Inline templates are used per project standards for small components.

## Risks / Trade-offs

- **CSS variables vs deep style overrides** → We rely entirely on M3 design tokens; if a future design demands per-component overrides, we will need to add scoped overrides per the Material theming guide. Mitigation: document the chosen palette and density in `styles.scss` so deviations are visible.
- **Side-nav `mode` switch causes a transient layout shift on breakpoint crossings** → Acceptable for now; if it becomes user-visible, debounce the breakpoint signal or animate `mode` transitions.
- **`color-scheme` defaults to `light`, not `light dark`** → Users with a dark-mode OS will see light mode until they pick "system" or "dark". This is intentional — it makes the switcher's "system" option a deliberate choice — but worth flagging. Mitigation: ship with `mode = 'system'` as the default so first-time users get OS-matched theming anyway.
- **`localStorage` quota / availability** → Mitigation: only write `localStorage` from `afterNextRender`; if `localStorage` access throws (private browsing in some browsers), let the error surface in dev — do not silently swallow. The default `"system"` mode is safe.
- **Mock `CurrentUserService` could leak into prod if forgotten** → Mitigation: add a TODO comment with a reference to the follow-up task in `tasks.md`. The service file is kept in `src/app/user/` so the eventual real implementation replaces it in place.
- **Vitest + Angular Material**: Angular v21 + Material v21 no longer rely on the legacy animations module — animations are driven by native CSS, so no `provideAnimationsAsync` / `provideNoopAnimations` is required in tests or in `app.config.ts`.
- **Playwright start-up cost** → Adds a dev dependency, an `e2e/` directory, and a `webServer` block in `playwright.config.ts` that runs `npm start`. Mitigation: scope the initial suite to one spec file per capability so CI time stays bounded; rely on Vitest for tight feedback loops during development.

## Migration Plan

This is a greenfield change — no existing users, no rollback concerns. Steps:

1. Land theme + services first (no UI impact).
2. Land shell components and switch routing in one commit.
3. Delete the starter template content from `app.html` in the same commit so we do not ship a half-migrated UI.

Verification: `npm run lint && npm test && npm run format:check && npm run build`, then `npm start` and visually confirm:

- Toolbar shows mock user and theme switcher.
- Side nav collapses to rail and back.
- Theme switcher cycles light / dark / system and persists across reload.
- Below the handset breakpoint, side nav becomes an overlay with a working close button.

## Open Questions

- Should the rail width and expanded width be design tokens we expose, or hard-coded SCSS variables for now? **Default**: hard-code in `dashboard-shell.scss` until a second consumer appears.
- Should "system" mode also react to live OS theme changes (`matchMedia` `change` event), or only read the preference on load? **Default**: react live — it is a few extra lines and matches what users expect from modern apps.
