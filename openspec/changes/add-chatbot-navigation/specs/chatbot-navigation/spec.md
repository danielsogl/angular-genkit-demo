## ADDED Requirements

### Requirement: Advisor chat exposes a navigate tool whose target enum is derived from `NAV_ITEMS`

The advisor-chat Genkit flow SHALL expose exactly one tool named `navigate` to the model. The tool's input schema SHALL accept a single field `target` whose value MUST be one of the route segments declared in the shared `NAV_ITEMS` constant. The set of allowed targets MUST be derived programmatically from `NAV_ITEMS` (e.g. `NAV_ITEMS.map(i => i.route)` typed via `as const`) so that adding, renaming, or removing an entry in `NAV_ITEMS` automatically updates the tool's enum without any change to the tool definition. The tool's description SHALL be composed from each `NAV_ITEMS` row's `label` and `aliases` fields, and SHALL instruct the model to call it whenever the advisor asks (in German or English) to open, show, or navigate to a section using verbs like "öffne", "zeige", "gehe zu", or "navigiere".

#### Scenario: Tool input schema rejects an unknown target

- **WHEN** the model calls the `navigate` tool with `{ target: 'einstellung' }` (typo) or any value not in `NAV_ITEMS.map(i => i.route)`
- **THEN** Zod validation rejects the call before any side effect
- **AND** the flow does not emit a navigate event over the stream

#### Scenario: Tool description lists each section's label and aliases

- **WHEN** the exported `navigateTool` definition is read
- **THEN** for every entry in `NAV_ITEMS` the description string contains that entry's `label` and at least one of its `aliases`
- **AND** it instructs the model to call the tool when the advisor uses verbs like "öffne", "zeige", "gehe zu", or "navigiere"

#### Scenario: Single declarative source drives routes, sidenav, and tool

- **GIVEN** `NAV_ITEMS` is the framework-free single source of truth
- **WHEN** the application is built and the advisor-chat flow is initialised
- **THEN** the `Routes` array, the side navigation, and the `navigate` tool's input enum are all derived from `NAV_ITEMS` without any hand-written duplicate of the route list
- **AND** appending a single new entry to `NAV_ITEMS` is the only edit required to register a new chat-navigable destination (a TypeScript compile error MUST follow if any consumer hard-codes a route segment that diverges from `NAV_ITEMS`)

### Requirement: Flow streams text deltas and navigate events as a discriminated union

The advisor-chat flow's `streamSchema` SHALL be a discriminated union with two variants: `{ type: 'text', delta: string }` for token-level text chunks and `{ type: 'navigate', target: <enum> }` for tool-call events. The flow SHALL forward text content as `text` events and SHALL convert any `toolRequest` chunk whose name is `navigate` into a single `navigate` event carrying only the validated `target` value. The final flow output SHALL remain a `{ reply: string }` object containing the full assembled assistant reply text.

#### Scenario: Text-only turn yields only text events

- **WHEN** the advisor sends a message that does not request navigation (e.g., "Was kannst du?") and the model replies with prose only
- **THEN** every chunk on the stream is a `{ type: 'text', delta }` event
- **AND** no `navigate` event is emitted

#### Scenario: Navigation turn emits a navigate event alongside text

- **WHEN** the advisor sends "Öffne Einstellungen" and the model calls the `navigate` tool with `{ target: 'einstellungen' }`
- **THEN** the stream contains exactly one `{ type: 'navigate', target: 'einstellungen' }` event
- **AND** the stream also contains text events for the model's German confirmation
- **AND** the final awaited output's `reply` field equals the concatenation of all `text` event deltas

#### Scenario: At most one navigate event per turn

- **WHEN** the model attempts to call `navigate` more than once in a single turn
- **THEN** the flow emits only the first `navigate` event over the stream
- **AND** subsequent navigate tool calls in the same turn are ignored without producing extra events

### Requirement: Client dispatches navigate events to the Angular router

`AdvisorChatService` SHALL inject Angular's `Router` and consume the discriminated stream from `/api/chat`. On each `text` event the service SHALL append the delta to the in-flight assistant message exactly as today. On a `navigate` event the service SHALL invoke `Router.navigateByUrl('/' + event.target)`; because `event.target` is already the literal route segment from the shared `NAV_ITEMS` constant, no lookup table is needed. The dispatch SHALL run only once per turn even if multiple `navigate` events arrive, and SHALL be skipped on the SSR platform.

#### Scenario: Text events still grow the assistant message

- **WHEN** a stream emits the events `{ type: 'text', delta: 'Ich öffne ' }` then `{ type: 'text', delta: 'die Einstellungen.' }`
- **THEN** the assistant message in `displayedMessages()` ends with "Ich öffne die Einstellungen."
- **AND** no router navigation happens

#### Scenario: Navigate event triggers Router.navigateByUrl with the literal route segment

- **WHEN** the stream emits `{ type: 'navigate', target: 'depot' }`
- **THEN** `Router.navigateByUrl` is called with `'/' + event.target` (i.e. `/depot`) — no lookup table or re-mapping step is needed because the event's `target` IS the route segment from `NAV_ITEMS`
- **AND** the call happens on the browser platform only (skipped during SSR)

#### Scenario: Duplicate navigate events in one turn are debounced

- **GIVEN** a single chat turn emits two `navigate` events back-to-back
- **WHEN** the service consumes the stream
- **THEN** `Router.navigateByUrl` is called exactly once for that turn
- **AND** the second event is silently dropped

#### Scenario: Navigation does not interrupt text streaming

- **WHEN** a stream interleaves `text` and `navigate` events in the order text → navigate → text
- **THEN** the assistant message contains both text deltas in order
- **AND** the navigate dispatch does not clear or reset the in-flight message

### Requirement: Advisor can navigate via German chat phrases end-to-end

When the advisor types a German navigation phrase ("Öffne Einstellungen", "Zeige Depot", "Gehe zur Kundenakte", "Navigiere zu Unterlagen", "Gehe auf Übersicht") into the chat panel, the URL SHALL change to the matching segment, the routed view SHALL render the new placeholder page, and the chat panel SHALL remain open and show the assistant's spoken confirmation. The behaviour SHALL be covered by a Playwright BDD scenario per phrase variant.

#### Scenario: "Öffne Einstellungen" navigates to /einstellungen

- **GIVEN** the chat panel is open on the default route
- **WHEN** the advisor types "Öffne Einstellungen" and submits
- **THEN** the URL becomes `/einstellungen`
- **AND** the routed `<main>` shows a heading "Einstellungen"
- **AND** the chat panel is still open and contains an assistant message in German confirming the navigation

#### Scenario: "Zeige Depot" navigates to /depot

- **GIVEN** the chat panel is open on the default route
- **WHEN** the advisor types "Zeige Depot" and submits
- **THEN** the URL becomes `/depot`
- **AND** the routed `<main>` shows a heading "Depot"
- **AND** the chat panel remains open

#### Scenario: "Gehe zur Kundenakte" navigates to /kundenakte

- **GIVEN** the chat panel is open on the default route
- **WHEN** the advisor types "Gehe zur Kundenakte" and submits
- **THEN** the URL becomes `/kundenakte`
- **AND** the routed `<main>` shows a heading "Kundenakte"

#### Scenario: "Navigiere zu Unterlagen" navigates to /unterlagen

- **GIVEN** the chat panel is open on the default route
- **WHEN** the advisor types "Navigiere zu Unterlagen" and submits
- **THEN** the URL becomes `/unterlagen`
- **AND** the routed `<main>` shows a heading "Unterlagen"

#### Scenario: Non-navigation message does not change the URL

- **GIVEN** the chat panel is open on the default route
- **WHEN** the advisor types "Was kannst du?" and submits
- **THEN** the URL remains the default route
- **AND** the chat panel renders an assistant text reply
