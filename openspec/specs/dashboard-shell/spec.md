# dashboard-shell Specification

## Purpose

TBD - created by archiving change add-dashboard-ui. Update Purpose after archive.

## Requirements

### Requirement: Application shell wraps every routed view

The application SHALL render every feature route inside a single `DashboardShellComponent` that provides a top app bar, a left side navigation, and a routed content area. No feature route shall render its own toolbar or side navigation.

#### Scenario: Routed view is wrapped in the shell

- **WHEN** the user navigates to any application route
- **THEN** the page renders the top bar, the left side navigation, and the route's component inside the shell's content area
- **AND** the top bar and side navigation are present on every route without per-route configuration

#### Scenario: Routed view has no duplicate chrome

- **WHEN** a feature route's component is rendered
- **THEN** that component does not include its own `mat-toolbar` or `mat-sidenav` elements

### Requirement: Top bar shows current user and theme switcher

The top bar SHALL display the currently signed-in user (name and avatar placeholder) and a theme switcher control. The user information SHALL be read from `CurrentUserService` as a signal so it updates reactively without manual subscriptions.

#### Scenario: Authenticated user is displayed

- **WHEN** `CurrentUserService.user()` returns a non-null user
- **THEN** the top bar shows the user's display name and an avatar placeholder containing the user's initials
- **AND** the avatar placeholder has an accessible label that includes the user's full name

#### Scenario: No user available

- **WHEN** `CurrentUserService.user()` returns `null`
- **THEN** the top bar shows neither the name nor the avatar placeholder
- **AND** the theme switcher remains visible and functional

#### Scenario: Theme switcher is reachable via keyboard

- **WHEN** the user tabs through the page from the top of the document
- **THEN** the theme switcher receives focus before the side navigation toggle
- **AND** the focused state is visually distinguishable per WCAG AA

### Requirement: Side navigation can collapse to a rail

On viewports at or above the handset breakpoint, the side navigation SHALL be permanently visible and toggle between an expanded mode (icon plus label) and a collapsed rail mode (icon only). The toggle control SHALL live in the top bar and be operable by both mouse and keyboard.

#### Scenario: Toggle from expanded to collapsed

- **WHEN** the side navigation is in expanded mode and the user activates the collapse toggle
- **THEN** the side navigation transitions to rail mode showing only icons
- **AND** the routed content area expands to fill the reclaimed horizontal space
- **AND** the toggle's `aria-expanded` attribute becomes `"false"`

#### Scenario: Toggle from collapsed to expanded

- **WHEN** the side navigation is in rail mode and the user activates the collapse toggle
- **THEN** the side navigation transitions to expanded mode showing icons and labels
- **AND** the toggle's `aria-expanded` attribute becomes `"true"`

#### Scenario: Keyboard activation

- **WHEN** the collapse toggle has focus and the user presses Enter or Space
- **THEN** the side navigation toggles between expanded and collapsed modes

### Requirement: Side navigation adapts to small viewports

Below the handset breakpoint the side navigation SHALL switch to an overlay drawer that opens above the content with a backdrop and starts in the closed state. Activating a navigation item or the backdrop SHALL close the drawer.

#### Scenario: Drawer is closed by default on handset

- **WHEN** the viewport is below the handset breakpoint and the shell first renders
- **THEN** the side navigation is closed and the routed content occupies the full viewport width
- **AND** activating the toggle in the top bar opens the drawer with a backdrop

#### Scenario: Drawer closes on backdrop click

- **WHEN** the side navigation drawer is open on a handset viewport and the user clicks the backdrop
- **THEN** the drawer closes
- **AND** focus returns to the toggle control that opened it

### Requirement: Side navigation displays placeholder items

The side navigation SHALL render a fixed list of placeholder navigation items provided by a single exported constant. Each item SHALL include a label, a Material icon name, and a route. Items SHALL be reachable by keyboard and announce the active route.

#### Scenario: Items render with icon and label

- **WHEN** the side navigation is in expanded mode
- **THEN** each placeholder item renders both its Material icon and its label
- **AND** the items appear in the order declared by the exported constant

#### Scenario: Items render only the icon in rail mode

- **WHEN** the side navigation is in rail mode
- **THEN** each placeholder item renders only its Material icon
- **AND** the icon has an accessible name equal to the item's label (e.g. via `aria-label` or a tooltip)

#### Scenario: Active item is announced

- **WHEN** the current route matches a navigation item's route
- **THEN** that item carries `aria-current="page"`
- **AND** that item is visually distinguishable from inactive items per WCAG AA contrast

### Requirement: Shell meets accessibility minimums

The shell SHALL pass automated AXE checks and follow WCAG AA. The side navigation SHALL be wrapped in a `<nav>` landmark with an accessible name, the top bar SHALL be a `<header>` landmark, and the routed content area SHALL be a `<main>` landmark.

#### Scenario: Landmarks are present

- **WHEN** the shell is rendered
- **THEN** the document contains exactly one `<header>`, one `<nav>` with an accessible name, and one `<main>` element inside the shell

#### Scenario: AXE finds no violations

- **WHEN** AXE is run against the rendered shell with mock user data
- **THEN** there are zero violations of severity `serious` or `critical`
