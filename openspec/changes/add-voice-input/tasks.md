## 1. Setup

- [x] 1.1 Add `@huggingface/transformers` (latest v3.x) to `dependencies` in `package.json` and run `npm install`.
- [x] 1.2 Verify the package is browser-only (no peer warnings) and that `npm run build` still succeeds before any further code changes.

## 2. Speech recognition worker

- [x] 2.1 Create `src/app/chat/voice/speech-recognition.worker.ts` that imports `pipeline` and `env` from `@huggingface/transformers`, sets `env.allowLocalModels = false`, and defines a `getPipeline()` singleton for `automatic-speech-recognition` on `onnx-community/whisper-small`.
- [x] 2.2 In the worker, detect WebGPU via `'gpu' in navigator` + `navigator.gpu.requestAdapter()` and pick `device: 'webgpu' | 'wasm'` plus `dtype: 'q4' | 'q8'` accordingly.
- [x] 2.3 Forward Transformers.js progress events (`status === 'progress'`) to the main thread as `{ type: 'progress', progress, file }` messages.
- [x] 2.4 Handle `init` and `transcribe` inbound messages; emit `ready`, `transcribed` (with text), and `error` outbound messages. The transcribe call MUST pass `language: 'german'`, `task: 'transcribe'`, `chunk_length_s: 30`, `stride_length_s: 5`, `return_timestamps: false`.

## 3. SpeechRecognitionService

- [x] 3.1 Create `src/app/chat/voice/speech-recognition.service.ts` as a `providedIn: 'root'` service with private signals for `status` and `error`, plus public readonly signals and the derived computed signals `isRecording`, `isLoading`, `isBusy`, `isAvailable`.
- [x] 3.2 Inject `PLATFORM_ID` and gate every browser-API touch behind `isPlatformBrowser`. The constructor MUST be safe to instantiate on the server.
- [x] 3.3 Implement support detection (`navigator.mediaDevices?.getUserMedia`, `MediaRecorder`, `Worker`, `AudioContext`); transition to `unsupported` on the first call when missing.
- [x] 3.4 Implement `start()`: clear any prior `error`, request the mic via `getUserMedia({ audio: true })`, lazily create the worker (`new Worker(new URL('./speech-recognition.worker', import.meta.url), { type: 'module' })`), wait for the `ready` message while exposing `loading-model` status, then start a `MediaRecorder` and flip status to `recording`.
- [x] 3.5 Implement `stop()`: stop the recorder, release the `MediaStream` tracks, decode the recorded blob via `AudioContext.decodeAudioData`, downmix + resample to 16 kHz mono with `OfflineAudioContext`, post the resulting `Float32Array` to the worker, await the `transcribed` message, and resolve with the trimmed text. Transition status to `transcribing` then back to `idle`.
- [x] 3.6 Implement an internal `toggle()` (or expose `start`/`stop` and let the component branch) so a single user activation does the right thing based on current status.
- [x] 3.7 Map errors from `getUserMedia`, the worker, and audio decoding to German error strings on the `error` signal and set status to `error`. The next `start()` MUST clear the error.
- [x] 3.8 Make `start()` and the inner state machine idempotent: calling `start()` while `isBusy()` is a no-op; calling `stop()` outside of `recording` resolves to `undefined`.

## 4. Composer integration

- [x] 4.1 Inject `SpeechRecognitionService` into `ChatPanel`. Render a `mat-icon-button` between the input and send button with `aria-label` toggling between "Spracheingabe starten" and "Spracheingabe stoppen", `aria-pressed` bound to `speech.isRecording()`, and `disabled` reflecting `chat.isStreaming() || speech.isLoading() || !speech.isAvailable()`.
- [x] 4.2 When the mic button is permanently `unsupported`, set the `aria-label` to a German "wird in diesem Browser nicht unterstützt" variant and keep `disabled` true.
- [x] 4.3 On click, call a panel method that branches on `speech.isRecording()` between `start()` and `stop()`. After `stop()` resolves with a non-empty transcript, set the composer draft to `current ? current + ' ' + transcript : transcript` via `chat.setDraft(...)`, then refocus the message input.
- [x] 4.4 Disable the message input and the send button while `speech.isBusy()` returns true (in addition to the existing `chat.isStreaming()` gate).
- [x] 4.5 Render an ARIA-live status block in the panel for `loading-model`, `recording`, `transcribing`, and `error`. Reuse the existing `.chat-panel__status` style for non-error states; add a new error-style modifier for the error state. The error region MUST use `role="alert"` and German copy.
- [x] 4.6 Update `chat-panel.scss` so the new icon button sits between the input and send button without breaking the mobile layout.

## 5. Tests — Vitest (BDD per spec scenario)

- [x] 5.1 Extend `chat-panel.spec.ts` with a `FakeSpeechRecognitionService` exposing the same signals + `start`/`stop` API. Provide it via `TestBed.configureTestingModule`.
- [x] 5.2 Add a `describe` block per new requirement from the spec delta. Implement scenarios verbatim from `specs/advisor-chatbot/spec.md` for: mic button visibility, pressed state toggling, unsupported state, append into empty/non-empty draft, mic disabled while reply streams, send disabled while recording, error rendering, error clears on next activation.
- [x] 5.3 Create `src/app/chat/voice/speech-recognition.service.spec.ts` with focused scenarios that mock `navigator.mediaDevices`, `MediaRecorder`, `Worker`, and `AudioContext` to drive the state machine through the happy path and the permission-denied path.

## 6. Tests — Playwright BDD

- [x] 6.1 Create `e2e/features/advisor-chatbot-voice.feature`. The feature title and scenario titles MUST match the spec scenario names verbatim. Cover at minimum: mic button visibility, `aria-pressed` toggling on a stubbed/granted browser permission, mic disabled while a reply streams, message input disabled while status is `recording`/`transcribing`, German error copy when permission is denied.
- [x] 6.2 Add the matching steps in `e2e/steps/voice.steps.ts` (or extend `advisor-chatbot.steps.ts`). Use `getByRole('button', { name: ... })`, `getByRole('textbox')`, and Playwright's `context.grantPermissions(['microphone'])` / `context.clearPermissions()` to drive the permission paths. Stub the `SpeechRecognitionService.start/stop` flow via `page.addInitScript` (e.g. by attaching a `window.__voiceTestHook__` the service consults under a test-only flag) so the real Whisper model never has to run in CI.
- [x] 6.3 Tag the heaviest scenarios with `@desktop` only if mobile Chrome cannot grant microphone permissions; otherwise leave them untagged so both projects exercise the flow.

## 7. Build, budgets, and SSR safety

- [x] 7.1 Run `npm run build` and confirm the worker chunk is emitted as a separate output file and the initial bundle still satisfies the 500 kB warn / 1 MB error budget. If a worker-named budget warning appears, add a budget exception for that chunk in `angular.json` instead of widening the initial budget.
- [x] 7.2 Inspect the SSR server bundle for any `@huggingface/transformers` reference; if one slips in (e.g. via a static import in the service), restructure the service so the worker URL stays behind a method instead of a top-level expression.
- [ ] 7.3 Smoke-test SSR via `npm run build && npm run serve:ssr:angular-ai-chat`, load `/`, and verify no console errors mentioning `Worker`, `MediaRecorder`, `navigator`, or `gpu`. (Static grep of dist/server confirms zero references to `huggingface`, `onnx-community`, `whisper`, `speech-recognition.worker`, `new Worker`, or `navigator.gpu`; runtime smoke test still pending.)

## 8. Verification

- [x] 8.1 Run the full project verification chain and fix anything that fails: `npm run lint && npm test && npm run e2e && npm run format:check && npm run build`.
- [ ] 8.2 Manually test the happy path in Chromium: open the assistant, click the mic, speak a German sentence, click the mic again, verify the German transcript appears in the composer, edit, send, and confirm the assistant replies normally.
- [ ] 8.3 Manually test the permission-denied path: revoke microphone permission, click the mic, verify the German error copy in the panel, then re-grant and verify recovery on the next click.
