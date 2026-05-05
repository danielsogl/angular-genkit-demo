# Add voice input to the advisor chat composer

## Why

Advisors talking with the assistant currently have to type every message. In meeting situations and on mobile, dictation is faster and more natural. We want a privacy-friendly speech-to-text path that runs **entirely in the user's browser** — no audio leaves the device — for German-only conversations with the chat assistant.

## What Changes

- Add a microphone toggle button to the chat composer (between the input and the send button) that the advisor activates with click or keyboard.
- Capture microphone audio via `MediaRecorder` after explicit user permission.
- Run on-device automatic speech recognition with **Whisper-small (multilingual)** through `@huggingface/transformers` inside a dedicated **Web Worker**, with WebGPU acceleration where available and a WASM fallback otherwise.
- Append the transcribed text to whatever is currently in the composer draft (do not replace) so the advisor can mix typing and speech.
- Surface progress and lifecycle states (model download, recording, transcribing, error) with German-localised, ARIA-live announcements.
- Lazy-load the Transformers.js code path so the initial bundle stays inside existing budgets.
- Cover the new behaviour with Vitest scenarios for the composer and a Playwright BDD feature for the user-facing flow, mirroring the OpenSpec scenarios verbatim.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `advisor-chatbot`: The composer gains a voice input control with new requirements covering recording lifecycle, model loading, draft merging, accessibility, and error handling.

## Impact

- **New runtime dependency**: `@huggingface/transformers` (browser-only; only loaded on first activation of the mic button).
- **New source files** under `src/app/chat/voice/` (worker + service + tests).
- **Modified files**: `src/app/chat/chat-panel/chat-panel.{ts,scss,spec.ts}`.
- **New test files**: `e2e/features/advisor-chatbot-voice.feature` plus matching steps.
- **Bundle**: Worker chunk holds Transformers.js + ONNX runtime — emitted as a separate worker chunk, not part of the initial bundle. Whisper-small weights (~244 MB at q8 / smaller at q4) stream from the Hugging Face CDN on first use and are cached in the browser by Transformers.js.
- **SSR**: All browser APIs (`navigator.mediaDevices`, `Worker`, `AudioContext`, `MediaRecorder`) gated behind `isPlatformBrowser` so the server build stays clean.
- **Accessibility**: New ARIA-live status region; the mic toggle exposes `aria-pressed` and a German `aria-label`.
- **Privacy**: Audio is processed entirely on-device; the worker never makes outbound network calls beyond fetching model weights from the Hugging Face CDN.
