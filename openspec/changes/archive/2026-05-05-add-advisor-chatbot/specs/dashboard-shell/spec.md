## ADDED Requirements

### Requirement: Shell hosts the advisor chat surface

The `DashboardShellComponent` SHALL render the advisor chat launcher (FAB) as a child of the shell, outside the routed `<main>` content area, so that it appears on every routed view without per-route configuration. The launcher SHALL overlay the routed content via fixed positioning and SHALL NOT shift the layout or interfere with the existing top bar, side navigation, or routed view.

#### Scenario: Launcher renders inside the shell on every route

- **WHEN** the advisor navigates to any route rendered by the shell
- **THEN** the document contains exactly one chat launcher element rendered as a child of the shell (not of the routed component)
- **AND** the launcher is positioned outside `<main>` so it overlays rather than displaces the routed content

#### Scenario: Launcher does not affect existing shell chrome

- **WHEN** the chat launcher is rendered
- **THEN** the top bar still contains the existing user info and theme switcher
- **AND** the side navigation still toggles between expanded and rail modes
- **AND** the routed content area still occupies the same bounding box it occupied before this change

#### Scenario: Routed components do not render their own launcher

- **WHEN** any feature route's component is rendered
- **THEN** that component does not include its own chat launcher or chat panel element
