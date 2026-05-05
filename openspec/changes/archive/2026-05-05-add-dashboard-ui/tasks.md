## 1. Theming foundation

- [x] 1.1 Configure the M3 theme in `src/styles.scss` with `@use '@angular/material' as mat;`, `mat.theme(...)` (violet palette, Roboto, density 0), `color-scheme: light;` on `html`, and `html.dark-mode { color-scheme: dark; }`
- [x] 1.2 Apply the `mat-app-background` class to `<body>` in `src/index.html` so the document background follows the theme
- [x] 1.3 Verify `npm run build` still succeeds with the new SCSS configuration (Angular v21 + Material v21 no longer require `provideAnimationsAsync()` — animations are handled via native CSS)

## 2. Theming service and switcher

- [x] 2.1 Create `src/app/theming/theme.service.ts` with `providedIn: 'root'`, a `Mode = 'light' | 'dark' | 'system'` type, and a public `mode = signal<Mode>('system')`
- [x] 2.2 Implement SSR guards: inject `PLATFORM_ID`, only read `localStorage` and call `matchMedia` when `isPlatformBrowser` is true; defer all DOM side effects to `afterNextRender`
- [x] 2.3 Implement a `setMode(mode: Mode)` method that updates the signal, persists to `localStorage` under a stable key (e.g. `'theme-mode'`), and toggles the `dark-mode` class on `document.documentElement`
- [x] 2.4 Subscribe to `matchMedia('(prefers-color-scheme: dark)')` `change` events (browser only) so `system` mode reacts to live OS changes
- [x] 2.5 Create `src/app/theming/theme-switcher/theme-switcher.ts` as an inline-template standalone component using `mat-icon-button` + `mat-menu` with three radio-style options (`light`, `dark`, `system`); set `changeDetection: OnPush`
- [x] 2.6 Ensure the switcher exposes the active mode to AT (e.g. `aria-label` on the trigger that includes the active mode; menu items use `role="menuitemradio"` with `aria-checked`)
- [x] 2.7 Add a Vitest spec `theme.service.spec.ts` with one `describe` per requirement in `specs/theming/spec.md` and one `it('Scenario: …', …)` per scenario, body structured `// Given / // When / // Then`. Cover at minimum: default mode is `system`, `setMode('dark')` adds the `dark-mode` class, `setMode('light')` removes it, value is persisted to `localStorage`, server-side instantiation does not throw
- [x] 2.8 Add a Vitest spec for `ThemeSwitcherComponent` mirroring its scenarios: clicking each menu option calls `ThemeService.setMode` with the matching value and reflects the active mode in `aria-checked`

## 3. Current user service

- [x] 3.1 Create `src/app/user/user.ts` exporting a `User` type with `id`, `name`, `email`, `initials` (all `string`)
- [x] 3.2 Create `src/app/user/current-user.service.ts` with `providedIn: 'root'`, a private `signal<User | null>(...)` initialized to a mock user, and a public read-only accessor (e.g. `user = this.#user.asReadonly()`)
- [x] 3.3 Add a Vitest spec `current-user.service.spec.ts` that maps each scenario in `specs/current-user/spec.md` to one `it('Scenario: …', …)`: singleton injection returns the same instance, signal is read-only, mock user has the required non-empty fields

## 4. Shell layout components

- [x] 4.1 Create `src/app/shell/nav-items.ts` exporting a `NAV_ITEMS` constant: array of `{ label: string; icon: string; route: string }` with three placeholder entries (e.g. `Overview / dashboard / 'overview'`, `Library / folder / 'library'`, `Settings / settings / 'settings'`)
- [x] 4.2 Create `src/app/shell/dashboard-shell/dashboard-shell.{ts,html,scss}` as a standalone component with `OnPush`, importing `MatToolbarModule`, `MatSidenavModule`, `MatIconModule`, `MatButtonModule`, `RouterOutlet`, plus the `TopBar` and `SideNav` children
- [x] 4.3 Inject `BreakpointObserver`, observe `Breakpoints.Handset`, and convert it with `toSignal({ initialValue: false })` to a `isHandset` signal
- [x] 4.4 Add `collapsed = signal(false)` and `drawerOpen = signal(false)`; expose `mode = computed(() => this.isHandset() ? 'over' : 'side')` and `opened = computed(() => this.isHandset() ? this.drawerOpen() : true)` for the `<mat-sidenav>`
- [x] 4.5 Build the template: `<header><mat-toolbar>` containing the toggle button + `<app-top-bar>`, then `<mat-sidenav-container>` with `<mat-sidenav>` hosting `<app-side-nav>`, and `<mat-sidenav-content>` containing a `<main>` landmark with `<router-outlet/>`
- [x] 4.6 Bind the side nav width via class binding (`[class.rail]="collapsed() && !isHandset()"`) and define `.rail` (~72px) / default (~240px) widths in `dashboard-shell.scss`
- [x] 4.7 Wire the toggle button: on handset, toggle `drawerOpen`; otherwise toggle `collapsed`. Set `aria-expanded` on the button to reflect the relevant signal
- [x] 4.8 Create `src/app/shell/top-bar/top-bar.ts` (inline template, OnPush) that injects `CurrentUserService`, renders the user's name + initials avatar, and embeds `<app-theme-switcher>`. Hide the user block when `user()` is `null`
- [x] 4.9 Create `src/app/shell/side-nav/side-nav.{ts,html}` (OnPush) with an `input<boolean>` named `collapsed`; render a `<nav aria-label="Primary">` listing `NAV_ITEMS` via `routerLink`, `routerLinkActive`, `[attr.aria-current]="rla.isActive ? 'page' : null"`. In rail mode, hide labels and keep `aria-label` on each item equal to its `label`
- [x] 4.10 Create `src/app/shell/placeholder/placeholder.ts` (inline template, OnPush) that renders a single `<h1>` greeting so the routed area is non-empty

## 5. Routing and bootstrap

- [x] 5.1 Update `src/app/app.routes.ts` to declare a single parent route `{ path: '', component: DashboardShellComponent, children: [{ path: '', loadComponent: () => import('./shell/placeholder/placeholder').then(m => m.Placeholder) }] }`
- [x] 5.2 Update `src/app/app.ts` and `src/app/app.html` so `App` only renders `<router-outlet/>`; remove the starter SVG, pill list, and inline styles
- [x] 5.3 Confirm `provideClientHydration(withEventReplay())` remains in `app.config.ts`

## 6. Vitest BDD coverage for the shell

- [x] 6.1 Update `src/app/app.spec.ts` to render `App` with `provideRouter([])`, asserting the `<router-outlet>` is present
- [x] 6.2 Add `dashboard-shell.spec.ts` with one `describe` per requirement in `specs/dashboard-shell/spec.md`. Required scenarios: toggle flips `aria-expanded` and the sidenav `rail` class on desktop; sidenav starts closed and the toggle opens it on handset (use a fake `BreakpointObserver`); shell exposes `<header>`, `<nav>` with accessible name, and `<main>` landmarks
- [x] 6.3 Add `top-bar.spec.ts` covering: renders user's name and initials when `CurrentUserService.user()` is non-null; renders neither when it is `null`; theme switcher remains reachable in both cases
- [x] 6.4 Add `side-nav.spec.ts` covering: renders all `NAV_ITEMS`; hides labels when `collapsed` is `true`; keeps icons and per-item `aria-label` equal to the item label in both modes; active route gets `aria-current="page"`

## 7. playwright-bdd end-to-end coverage

The playwright-bdd scaffold is already in place: `playwright.config.ts`, `e2e/features/*.feature` (sanity, dashboard-shell, theming, current-user, a11y), `e2e/steps/*.ts`, `e2e/tsconfig.json`, `npm run e2e` / `e2e:ui` / `e2e:report` scripts, and `.gitignore` updates. Remaining work is wiring the steps to the real DOM as the shell components land.

- [x] 7.1 Add stable hooks the steps already expect on the components: toggle button accessible name `Toggle navigation`, theme switcher trigger accessible name containing `theme`, theme menu items as `role="menuitemradio"` with `aria-checked` and labels matching `light` / `dark` / `system`, primary nav as `<nav aria-label="Primary">`, top-bar testids `current-user-name` and `current-user-avatar`, and `aria-label` on the avatar that includes the user's full name
- [x] 7.2 Confirm `npm run e2e` boots the dev server and the sanity feature passes, then iterate on `e2e/features/dashboard-shell.feature` until all scenarios pass on both `chromium` and `mobile-chrome` projects
- [x] 7.3 Iterate on `e2e/features/theming.feature` until all scenarios pass, including reload persistence
- [x] 7.4 Iterate on `e2e/features/current-user.feature` until all scenarios pass
- [x] 7.5 Iterate on `e2e/features/a11y.feature` until `AxeBuilder` reports zero `serious` or `critical` violations
- [x] 7.6 If new scenarios are added to any spec under `openspec/changes/add-dashboard-ui/specs/`, add a matching `Scenario:` block to the corresponding `.feature` file with the same name verbatim, and add or reuse step definitions under `e2e/steps/`

## 8. Verification

- [x] 8.1 Run `npm run lint` and fix any violations
- [x] 8.2 Run `npm test` (Vitest) and fix any failures
- [x] 8.3 Run `npm run e2e` (Playwright) and fix any failures
- [x] 8.4 Run `npm run format:check` (or `npm run format` if it fails) so Prettier passes
- [x] 8.5 Run `npm run build` and confirm both client and server bundles succeed
- [x] 8.6 Manually smoke-test `npm start` on `http://localhost:4200`: toolbar shows the mock user, theme switcher cycles light/dark/system and survives reload, side nav collapses to a rail and expands again, layout switches to an overlay drawer below the handset breakpoint (covered by Playwright BDD scenarios on chromium and mobile-chrome projects)
