## ADDED Requirements

### Requirement: Composer offers a voice input toggle

The chat composer SHALL render a microphone toggle button between the text input and the send button. The button SHALL be a Material icon-button with a German `aria-label`, an `aria-pressed` attribute that reflects whether a recording is in progress, and a focus indicator that meets WCAG AA contrast. When the user agent does not support speech recognition (no `MediaRecorder`, no `Worker`, or no `navigator.mediaDevices.getUserMedia`) the button SHALL still render but be permanently `disabled` with an `aria-label` that explains the lack of support in German.

#### Scenario: Mic button is visible in the composer

- **WHEN** the chat panel is open
- **THEN** a button with an accessible German name such as "Spracheingabe starten" is visible inside the composer between the text input and the send button
- **AND** the button is not disabled in a supported browser

#### Scenario: Mic button reflects pressed state

- **WHEN** the advisor activates the mic button and a recording starts
- **THEN** the button's `aria-pressed` attribute becomes `"true"`
- **AND** the accessible name changes to indicate that a click will stop the recording (e.g. "Spracheingabe stoppen")

#### Scenario: Mic button is disabled in unsupported browsers

- **WHEN** the chat panel renders in a user agent without `MediaRecorder` or `navigator.mediaDevices`
- **THEN** the mic button is rendered with `disabled="true"`
- **AND** its `aria-label` informs the user in German that voice input is not supported in the current browser

### Requirement: Mic toggle starts and stops a recording

Activating the mic button SHALL toggle a single in-flight recording. While idle the toggle SHALL request microphone permission via `navigator.mediaDevices.getUserMedia`, lazily ensure the speech recognition worker is initialised, start a `MediaRecorder`, and surface a "recording" status. While recording the toggle SHALL stop the recorder, release the microphone tracks, transition to a "transcribing" status, and resolve with the recognised text. Two concurrent recordings SHALL NOT be possible.

#### Scenario: First activation starts a recording

- **WHEN** the chat panel is open and the advisor activates the mic button while it is idle
- **THEN** the user agent prompts for microphone permission (or reuses an existing grant)
- **AND** the speech recognition status becomes `recording`
- **AND** an audible recording status is announced to assistive tech via an `aria-live="polite"` region in German such as "Aufnahme läuft"

#### Scenario: Second activation stops the recording and transcribes

- **WHEN** a recording is in progress and the advisor activates the mic button again
- **THEN** the recording stops and the microphone tracks are released
- **AND** the speech recognition status transitions to `transcribing`
- **AND** when transcription resolves, the resulting German text is delivered to the composer

#### Scenario: Concurrent activations are ignored

- **WHEN** a recording is already in progress and the advisor activates the mic button by holding the keyboard or via a double click
- **THEN** at most one `MediaRecorder` is created
- **AND** the second activation either stops the recording or is ignored, never starting a parallel recording

### Requirement: Speech recognition runs on-device through a Web Worker with Whisper-small

The application SHALL load `@huggingface/transformers` only inside a dedicated Web Worker. The worker SHALL host a single Whisper automatic-speech-recognition pipeline using a multilingual Whisper-small ONNX model (e.g. `onnx-community/whisper-small`) configured with `language: 'german'` and `task: 'transcribe'`. The worker SHALL prefer the WebGPU backend when `navigator.gpu` is available and SHALL fall back to the WASM backend otherwise. The worker module SHALL NOT be loaded by the server-side renderer.

#### Scenario: Worker is created lazily, not at app boot

- **WHEN** the advisor opens the application and never activates the mic button
- **THEN** no Web Worker for speech recognition is created
- **AND** `@huggingface/transformers` is not present in the initial JavaScript bundle

#### Scenario: First activation loads the model and emits progress

- **WHEN** the advisor activates the mic button for the first time in a session
- **THEN** the speech recognition status passes through `loading-model` before `recording`
- **AND** a German progress hint such as "Sprachmodell wird geladen …" is visible in the panel during the load

#### Scenario: Audio is downmixed to mono 16 kHz before inference

- **WHEN** a recording stops and is sent to the worker
- **THEN** the buffer delivered to the Whisper pipeline is a single-channel `Float32Array` sampled at 16 kHz
- **AND** the pipeline is invoked with `language: 'german'` and `task: 'transcribe'`

#### Scenario: Worker is not bundled into the SSR server

- **WHEN** the production server bundle is built and inspected
- **THEN** the SSR entry does not import `@huggingface/transformers`
- **AND** the SSR entry does not reference the speech recognition worker module

### Requirement: Transcribed text is appended to the composer draft and auto-sent

A successful transcription SHALL be appended to the existing composer draft, separated by a single space when the draft is non-empty. The trimmed transcript SHALL never replace existing draft text. Once the merged draft is computed, the chat panel SHALL immediately submit it to the advisor-chat flow without requiring a second user action — unless a reply is already streaming, in which case the merged draft SHALL be left in the composer for the advisor to send manually.

#### Scenario: Append into an empty draft

- **WHEN** the composer draft is empty and a transcription resolves with "Wie hoch ist die Inflation"
- **THEN** the merged value submitted to the advisor-chat flow is "Wie hoch ist die Inflation"

#### Scenario: Append after existing draft text

- **WHEN** the composer draft already contains "Bitte erkläre " and a transcription resolves with " den ETF-Sparplan"
- **THEN** the merged value submitted to the advisor-chat flow is "Bitte erkläre den ETF-Sparplan"
- **AND** the leading and trailing whitespace from the transcript has been trimmed
- **AND** exactly one space separates the previous draft from the appended transcript

#### Scenario: Transcript auto-sends as a prompt

- **WHEN** a transcription resolves with non-empty text and no reply is currently streaming
- **THEN** the advisor-chat flow is invoked with the merged draft on the same task
- **AND** no manual click on the send button is required
- **AND** the composer draft clears once the send pipeline has accepted the message

#### Scenario: Auto-send is suppressed while a reply is streaming

- **WHEN** a transcription resolves while the advisor-chat flow is still streaming a previous reply
- **THEN** the merged draft is set on the composer
- **AND** the advisor-chat flow is NOT invoked again until the previous reply finishes

### Requirement: Voice input does not interfere with sending and streaming

While a reply is currently streaming from the advisor-chat flow, the mic button SHALL be disabled. While a recording or transcription is in progress, the message input and the send button SHALL be disabled so the advisor cannot submit a half-finished draft. Once the speech recognition status returns to `idle` (or `error`), the composer SHALL be re-enabled, subject to the regular streaming gating.

#### Scenario: Mic disabled while a reply streams

- **WHEN** the advisor-chat flow is currently streaming a reply
- **THEN** the mic button is disabled

#### Scenario: Send disabled while recording

- **WHEN** the speech recognition status is `recording` or `transcribing`
- **THEN** the message input is disabled
- **AND** the send button is disabled

### Requirement: Voice errors surface as a German message and clear on the next activation

If microphone permission is denied, the worker fails to initialise, or transcription rejects, the panel SHALL show a non-blocking German error message in an ARIA-live region. The status SHALL transition to `error` and the composer SHALL remain typable. The next mic activation SHALL clear the error and retry the full flow from scratch.

#### Scenario: Permission denied shows a German error

- **WHEN** the advisor activates the mic button and `getUserMedia` rejects with a permission error
- **THEN** an ARIA-live message in German is rendered such as "Mikrofonzugriff wurde verweigert."
- **AND** the speech recognition status is `error`
- **AND** the message input remains usable

#### Scenario: Worker failure shows a German error

- **WHEN** the speech recognition worker fails to initialise or transcription rejects
- **THEN** an ARIA-live message in German is rendered such as "Spracheingabe fehlgeschlagen. Bitte erneut versuchen."
- **AND** the speech recognition status is `error`

#### Scenario: Next activation clears the error

- **WHEN** the speech recognition status is `error` and the advisor activates the mic button again
- **THEN** the previous error message is cleared
- **AND** the flow restarts from `loading-model` (if needed) or `recording`
