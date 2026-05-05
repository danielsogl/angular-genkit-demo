# advisor-chatbot Specification

## Purpose

TBD - created by archiving change add-advisor-chatbot. Update Purpose after archive.

## Requirements

### Requirement: Floating launcher is reachable from every routed view

The application SHALL render a single floating action button (FAB) anchored to the bottom-right of the viewport on every route inside the dashboard shell. The FAB SHALL display a Material bot icon, carry an accessible name in German that identifies it as the assistant launcher, and overlay the routed content without altering the layout of `<main>`.

#### Scenario: FAB is present on the default route

- **WHEN** the advisor loads any route rendered inside the dashboard shell
- **THEN** a single FAB with a bot icon is visible in the bottom-right corner of the viewport
- **AND** the FAB has an accessible name in German such as "Assistent öffnen"

#### Scenario: FAB is keyboard-reachable

- **WHEN** the advisor tabs through the page from the top of the document
- **THEN** the FAB receives focus
- **AND** the focus indicator is visually distinguishable per WCAG AA contrast

#### Scenario: FAB does not duplicate per route

- **WHEN** the advisor navigates between routes inside the shell
- **THEN** exactly one FAB exists in the document at any time
- **AND** the FAB is not re-mounted between route transitions inside the shell

### Requirement: Chat panel opens and closes from the launcher

Activating the FAB SHALL toggle a non-modal floating chat panel anchored near the FAB. The panel SHALL be dismissible without leaving the current route, and SHALL not trap focus or dim the rest of the page. The launcher's `aria-expanded` attribute SHALL reflect the panel's open state.

#### Scenario: Panel opens on FAB activation

- **WHEN** the FAB has focus and the advisor presses Enter, Space, or clicks it while the panel is closed
- **THEN** the chat panel becomes visible
- **AND** the FAB's `aria-expanded` attribute becomes `"true"`
- **AND** focus moves to the message input inside the panel

#### Scenario: Panel closes on FAB activation

- **WHEN** the chat panel is open and the advisor activates the FAB again
- **THEN** the chat panel is no longer rendered
- **AND** the FAB's `aria-expanded` attribute becomes `"false"`
- **AND** focus returns to the FAB

#### Scenario: Panel close via Escape

- **WHEN** the chat panel is open and any element inside the panel has focus and the advisor presses Escape
- **THEN** the chat panel closes
- **AND** focus returns to the FAB

#### Scenario: Panel does not block the rest of the app

- **WHEN** the chat panel is open
- **THEN** the routed content remains interactive (links and buttons outside the panel can be clicked and focused)
- **AND** no page-wide backdrop is rendered

### Requirement: Bot greets the advisor by name in German

When the chat panel opens for the first time in a session, the panel SHALL display a single assistant message that greets the advisor in German. If `CurrentUserService.user()` returns a non-null user, the greeting SHALL include the user's `name`. If it returns `null`, the greeting SHALL fall back to a neutral German salutation. The greeting SHALL be rendered without making a network request, so it appears immediately.

#### Scenario: Greeting includes the advisor's name

- **WHEN** `CurrentUserService.user()` returns a user with `name` "Daniel Sogl" and the panel opens for the first time
- **THEN** the panel shows an assistant message containing the substring "Daniel Sogl"
- **AND** the message text is in German (e.g. starts with a German salutation such as "Hallo", "Guten Tag", or "Willkommen")

#### Scenario: Greeting falls back when no user is signed in

- **WHEN** `CurrentUserService.user()` returns `null` and the panel opens for the first time
- **THEN** the panel shows an assistant message that is a neutral German salutation
- **AND** the message does not contain a placeholder such as "null", "undefined", or an empty name fragment

#### Scenario: Greeting is deterministic (no flow call)

- **WHEN** the panel opens for the first time
- **THEN** no request is made to `/api/chat`
- **AND** the greeting is visible in the panel immediately on the same animation frame as the panel itself

### Requirement: Advisor can send a message and receive a streamed reply

The chat panel SHALL provide a single-line message input and a send action. Submitting a non-empty message SHALL append a user-role message to the transcript and invoke the Genkit advisor-chat flow. Reply chunks from the flow SHALL stream into a single assistant-role message that grows as chunks arrive. While streaming, the input SHALL be disabled and a streaming indicator SHALL be present.

#### Scenario: Sending a message via the send button

- **WHEN** the advisor types "Was kannst du?" into the input and clicks the send button
- **THEN** a user-role message containing "Was kannst du?" is appended to the transcript
- **AND** the input is cleared
- **AND** the chat client invokes the advisor-chat flow with the typed message

#### Scenario: Sending a message via Enter

- **WHEN** the message input has focus and the advisor types text and presses Enter
- **THEN** the same behaviour as the send button is observed (user message appended, flow invoked)

#### Scenario: Streamed reply appears progressively

- **WHEN** the advisor-chat flow emits successive text chunks for an in-flight reply
- **THEN** a single assistant-role message in the transcript grows to include each chunk as it arrives
- **AND** no additional assistant messages are appended until the stream completes

#### Scenario: Empty message is ignored

- **WHEN** the advisor activates the send button while the input is empty or whitespace-only
- **THEN** no message is appended to the transcript
- **AND** no request is made to `/api/chat`

#### Scenario: Input disabled while streaming

- **WHEN** a reply is currently streaming
- **THEN** the message input is disabled
- **AND** the send button is disabled
- **AND** a visible streaming indicator is present in the panel

### Requirement: Bot replies in German with a financial-advisor tone

The advisor-chat flow SHALL be configured with a system prompt that requires German output and a professional, advisor-appropriate tone (formal "Sie"-Form, no slang). The system prompt MAY be authored in English. The system prompt SHALL be exposed as a single exported constant so its content can be asserted in tests.

#### Scenario: System prompt mandates German output

- **WHEN** the exported `ADVISOR_SYSTEM_PROMPT` constant is read
- **THEN** it contains an explicit instruction to always respond in German
- **AND** it contains an instruction to address the user as a Finanzberater / financial advisor with formal "Sie"-Form

#### Scenario: Reply is German for an English question

- **WHEN** the advisor sends the English message "What can you do?" via the chat panel
- **THEN** the streamed assistant reply is in German
- **AND** the reply does not address the user with "du" or other informal pronouns

### Requirement: Errors surface as a German message with a retry action

If the advisor-chat flow rejects, times out, or the stream closes before any chunk is received, the panel SHALL replace the in-flight assistant message with a German error message and a retry control. The advisor SHALL be able to retry the same input without retyping it.

#### Scenario: Flow rejection shows German error

- **WHEN** the advisor-chat flow rejects with any error during a send
- **THEN** the in-flight assistant message is replaced with a German error message such as "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut."
- **AND** a retry control labelled in German (e.g. "Erneut versuchen") is visible inside the error message
- **AND** the input is re-enabled

#### Scenario: Retry re-invokes the flow with the previous message

- **WHEN** the panel is in the error state and the advisor activates the retry control
- **THEN** the chat client invokes the advisor-chat flow again with the same user message that produced the error
- **AND** the error message is removed from the transcript

### Requirement: Chat flow is exposed via the SSR Express server

The Angular SSR Express server SHALL mount the advisor-chat Genkit flow at the relative path `/api/chat` using `expressHandler` from `@genkit-ai/express`. The flow SHALL accept `{ userName: string | null, history: ChatMessage[], message: string }` and SHALL emit a stream of text chunks plus a final string output.

#### Scenario: Endpoint exists at /api/chat

- **WHEN** the SSR server starts
- **THEN** the path `/api/chat` is registered as a POST handler returning the Genkit flow response

#### Scenario: Flow input contract is enforced by Zod schema

- **WHEN** a request to `/api/chat` is made with a body missing the `message` field
- **THEN** the flow rejects the request with a validation error before invoking the model

#### Scenario: Flow streams text chunks

- **WHEN** the flow is invoked with a valid input via `streamFlow` from `genkit/beta/client`
- **THEN** the returned stream yields one or more text chunks
- **AND** the awaited final output is a single string equal to the concatenation of the streamed chunks (or the model's final text)

### Requirement: Chat surface meets accessibility minimums

The FAB and chat panel SHALL pass automated AXE checks with zero violations of severity `serious` or `critical`. Interactive elements SHALL have accessible names in German, the panel SHALL have an accessible role and name, and the message transcript SHALL be announced via an `aria-live="polite"` region so streaming replies are perceivable to screen-reader users without stealing focus.

#### Scenario: Panel has an accessible name and role

- **WHEN** the chat panel is open
- **THEN** the panel root has `role="dialog"` (or equivalent) and an accessible name in German such as "Assistent"
- **AND** the panel is labelled by a heading inside the panel

#### Scenario: Streaming replies are announced

- **WHEN** the chat panel is open and a reply is streaming
- **THEN** the message transcript region carries `aria-live="polite"`
- **AND** the streaming indicator has an accessible label in German

#### Scenario: AXE finds no violations

- **WHEN** AXE is run against the rendered shell with the chat panel open
- **THEN** there are zero violations of severity `serious` or `critical`
