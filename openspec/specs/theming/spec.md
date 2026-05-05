# theming Specification

## Purpose

TBD - created by archiving change add-dashboard-ui. Update Purpose after archive.

## Requirements

### Requirement: Application uses an Angular Material 3 theme

The application SHALL configure a single Angular Material 3 theme using the `mat.theme` SCSS mixin in the global stylesheet. The theme SHALL define a color palette, typography family, and density value, and SHALL emit CSS variables on the `html` element so they apply across the entire application.

#### Scenario: Theme is applied globally

- **WHEN** any Material component is rendered inside the application
- **THEN** that component's design tokens resolve to the values produced by the configured `mat.theme` mixin
- **AND** the `html` element carries the CSS variables emitted by `mat.theme`

#### Scenario: Body uses the Material background

- **WHEN** the application is rendered
- **THEN** the `body` element uses the Material background and foreground colors (e.g. via the `mat-app-background` class) so theme changes propagate to the document background

### Requirement: Theme switcher exposes light, dark, and system modes

The application SHALL expose a theme switcher that lets the user choose between three modes: `light`, `dark`, and `system`. The current selection SHALL be visible in the switcher and SHALL be announced to assistive technology.

#### Scenario: User selects light mode

- **WHEN** the user picks `light` in the theme switcher
- **THEN** the application renders in light colors
- **AND** the `html` element does not carry the `dark-mode` class
- **AND** the switcher displays `light` as the active option

#### Scenario: User selects dark mode

- **WHEN** the user picks `dark` in the theme switcher
- **THEN** the application renders in dark colors
- **AND** the `html` element carries the `dark-mode` class
- **AND** the switcher displays `dark` as the active option

#### Scenario: User selects system mode and OS prefers dark

- **WHEN** the user picks `system` in the theme switcher and the operating system reports `prefers-color-scheme: dark`
- **THEN** the application renders in dark colors
- **AND** the `html` element carries the `dark-mode` class
- **AND** the switcher displays `system` as the active option

#### Scenario: System mode reacts to live OS changes

- **WHEN** the active mode is `system` and the operating system's color scheme preference changes
- **THEN** the application updates its colors to match the new preference without a page reload

### Requirement: Theme selection is persisted across reloads

The application SHALL persist the selected theme mode in `localStorage` and restore it on the next visit. If no value is stored, the default mode SHALL be `system`.

#### Scenario: Selection survives reload

- **WHEN** the user picks `dark` and reloads the page
- **THEN** the application renders in dark colors immediately on the next load
- **AND** the switcher displays `dark` as the active option

#### Scenario: First visit defaults to system

- **WHEN** no theme value is stored in `localStorage` and the user visits the application
- **THEN** the active mode is `system`

### Requirement: Theme service is SSR-safe

The theme service SHALL not access `window`, `document`, or `localStorage` during server-side rendering. All browser-only side effects SHALL be deferred until the application is running in the browser.

#### Scenario: Server render does not touch browser globals

- **WHEN** the application is rendered on the server
- **THEN** instantiating the theme service does not throw
- **AND** no read or write of `window`, `document`, or `localStorage` occurs during server rendering

#### Scenario: Browser hydration applies the stored theme

- **WHEN** the application hydrates in the browser and a stored theme value exists
- **THEN** the stored value is applied to the `html` element before the user interacts with the page
