## ADDED Requirements

### Requirement: Application generates dashboard routes from `NAV_ITEMS`

The application SHALL produce its dashboard-shell child routes from the shared `NAV_ITEMS` constant via a pure factory (e.g. `buildShellRoutes(NAV_ITEMS)`). For each entry the factory SHALL register a child route with `path: item.route`, `data: { title: item.label }`, and `loadComponent` resolving to the existing `Placeholder` component. Adding, renaming, or removing an entry in `NAV_ITEMS` SHALL be the only edit required to add, rename, or remove a navigable section. The `Placeholder` component SHALL render the route's `data.title` as its `<h1>` heading.

#### Scenario: Each NAV_ITEMS entry resolves to a route with its German heading

- **WHEN** the advisor navigates to `/' + item.route` for any `item` in `NAV_ITEMS`
- **THEN** the routed `<main>` shows an `<h1>` whose text equals `item.label`
- **AND** the `Placeholder` component reads its title from the activated route's `data.title`

#### Scenario: Initial NAV_ITEMS resolves to the five expected destinations

- **WHEN** the application starts with the initial `NAV_ITEMS` (Übersicht, Depot, Kundenakte, Unterlagen, Einstellungen)
- **THEN** navigating in turn to `/`, `/depot`, `/kundenakte`, `/unterlagen`, `/einstellungen` renders the headings "Übersicht", "Depot", "Kundenakte", "Unterlagen", "Einstellungen" respectively

#### Scenario: Adding a NAV_ITEMS entry registers a route without further edits

- **GIVEN** a developer appends a new entry to `NAV_ITEMS` (e.g. `{ route: 'beratung', label: 'Beratung', icon: 'support_agent', aliases: ['Beratung', 'Support'] }`) and changes nothing else
- **WHEN** the application is rebuilt
- **THEN** `/beratung` resolves to the `Placeholder` component with the heading "Beratung"
- **AND** the side navigation lists the new entry
- **AND** the chatbot's `navigate` tool accepts `'beratung'` as a valid target

#### Scenario: Default route matches the first NAV_ITEMS entry

- **WHEN** the advisor opens the application root URL
- **THEN** the routed `<main>` shows the heading equal to `NAV_ITEMS[0].label` (initially "Übersicht")

## MODIFIED Requirements

### Requirement: Side navigation displays placeholder items

The side navigation SHALL render the navigation items provided by the shared `NAV_ITEMS` constant in their declared order. Each item SHALL include a German label, a Material icon name, a route segment, and a list of German aliases used by the chatbot tool's description. The initial `NAV_ITEMS` SHALL contain Übersicht, Depot, Kundenakte, Unterlagen, Einstellungen in that order. Items SHALL be reachable by keyboard and announce the active route. Because the dashboard's `Routes` array is generated from `NAV_ITEMS` (see "Application generates dashboard routes from `NAV_ITEMS`") and the chatbot's `navigate` tool enum is also derived from `NAV_ITEMS`, the sidenav, the URL, and the chatbot tool's allowed targets cannot drift.

#### Scenario: Items render with icon and label

- **WHEN** the side navigation is in expanded mode
- **THEN** for each entry in `NAV_ITEMS` (in declared order) the sidenav renders both the entry's Material icon and its German `label`
- **AND** the initial render matches the order Übersicht, Depot, Kundenakte, Unterlagen, Einstellungen

#### Scenario: Items render only the icon in rail mode

- **WHEN** the side navigation is in rail mode
- **THEN** each placeholder item renders only its Material icon
- **AND** the icon has an accessible name equal to the item's German label (e.g. via `aria-label` or a tooltip)

#### Scenario: Active item is announced

- **WHEN** the current route matches a navigation item's route
- **THEN** that item carries `aria-current="page"`
- **AND** that item is visually distinguishable from inactive items per WCAG AA contrast

#### Scenario: NAV_ITEMS is the single source for sidenav, routes, and tool

- **WHEN** the application starts
- **THEN** every `route` value the sidenav renders comes from `NAV_ITEMS`
- **AND** every child route registered under the dashboard shell was generated from `NAV_ITEMS` by `buildShellRoutes`
- **AND** the chatbot's `navigate` tool accepts exactly the set of route segments declared in `NAV_ITEMS`

## REMOVED Requirements

### Requirement: Legacy English placeholder routes (`/overview`, `/library`, `/settings`)

**Reason**: The application now uses German route segments (`''`, `/depot`, `/kundenakte`, `/unterlagen`, `/einstellungen`) so the chatbot's `navigate` tool can address routes by the same German identifiers users speak. The English segments `/overview`, `/library`, and `/settings` are removed; `/library` is replaced by `/unterlagen`, `/settings` is replaced by `/einstellungen`, and `/overview` collapses into the default route `''`.

**Migration**: There are no production users of these URLs. Internal references in tests, documentation, and `NAV_ITEMS` are updated as part of the `add-chatbot-navigation` change. External bookmarks (none known) would need to be updated manually; no redirects are added.
