## MODIFIED Requirements

### Requirement: Chat flow is exposed via the SSR Express server

The Angular SSR Express server SHALL mount the advisor-chat Genkit flow at the relative path `/api/chat` using `expressHandler` from `@genkit-ai/express`. The flow SHALL accept `{ userName: string | null, history: ChatMessage[], message: string }` and SHALL emit a stream of typed events plus a final `{ reply: string }` output. The stream's event schema SHALL be a discriminated union of `{ type: 'text', delta: string }` and `{ type: 'navigate', target: <navigation-target-enum> }`. The flow SHALL register the `navigate` tool from `chatbot-navigation` so the model can request route changes.

#### Scenario: Endpoint exists at /api/chat

- **WHEN** the SSR server starts
- **THEN** the path `/api/chat` is registered as a POST handler returning the Genkit flow response

#### Scenario: Flow input contract is enforced by Zod schema

- **WHEN** a request to `/api/chat` is made with a body missing the `message` field
- **THEN** the flow rejects the request with a validation error before invoking the model

#### Scenario: Flow streams typed events

- **WHEN** the flow is invoked with a valid input via `streamFlow` from `genkit/beta/client`
- **THEN** the returned stream yields events that are each either `{ type: 'text', delta: string }` or `{ type: 'navigate', target: <enum> }`
- **AND** the awaited final output is `{ reply: string }` whose `reply` equals the concatenation of all `text` event deltas

#### Scenario: Flow registers the navigate tool

- **WHEN** the advisor-chat flow's `generateStream` call is inspected
- **THEN** the `tools` option includes the `navigate` tool exported by the `chatbot-navigation` capability
- **AND** the model receives that tool's description as part of its prompt context

### Requirement: Advisor can send a message and receive a streamed reply

The chat panel SHALL provide a single-line message input and a send action. Submitting a non-empty message SHALL append a user-role message to the transcript and invoke the Genkit advisor-chat flow. Reply text deltas from the flow SHALL stream into a single assistant-role message that grows as deltas arrive. While streaming, the input SHALL be disabled and a streaming indicator SHALL be present. Stream events of type `navigate` SHALL be handled by the navigation dispatcher (see `chatbot-navigation`) and SHALL NOT appear as visible text in the assistant bubble.

#### Scenario: Sending a message via the send button

- **WHEN** the advisor types "Was kannst du?" into the input and clicks the send button
- **THEN** a user-role message containing "Was kannst du?" is appended to the transcript
- **AND** the input is cleared
- **AND** the chat client invokes the advisor-chat flow with the typed message

#### Scenario: Sending a message via Enter

- **WHEN** the message input has focus and the advisor types text and presses Enter
- **THEN** the same behaviour as the send button is observed (user message appended, flow invoked)

#### Scenario: Streamed reply appears progressively

- **WHEN** the advisor-chat flow emits successive `text` events for an in-flight reply
- **THEN** a single assistant-role message in the transcript grows to include each delta as it arrives
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

#### Scenario: Navigate events do not appear in the assistant bubble

- **WHEN** the stream emits a `{ type: 'navigate', target }` event between text deltas
- **THEN** the assistant bubble's text content contains only the concatenated text deltas
- **AND** no JSON, target identifier, or tool-call metadata is rendered as visible text
