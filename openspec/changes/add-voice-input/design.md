# Design: voice input via Transformers.js + Whisper-small

## Context

The advisor chat panel today is text-only. Advisors want to dictate while in meetings or on a phone, and the project-wide privacy stance favours doing as much as possible on-device. The existing chat composer is a simple `<input>` with a send button driven by signals on `AdvisorChatService`. The application is Angular 21 with SSR via `@angular/ssr` and is built with `@angular/build` (esbuild). Tests run on Vitest (jsdom) and Playwright (`playwright-bdd`).

`@huggingface/transformers` v3 ships ONNX Runtime Web, supports a WebGPU backend, and can run Whisper inside a Web Worker, which is the standard way to keep the main thread responsive. Whisper-small is the user-chosen quality target — better German than `base` while still cacheable on the client.

## Goals / Non-Goals

**Goals:**

- On-device speech-to-text for German user utterances inside the chat composer.
- Toggle interaction (click to start, click to stop) with full keyboard + screen-reader support.
- Append the transcript to the existing draft, never replace.
- No initial-bundle bloat: Transformers.js and ONNX runtime live in a worker chunk that is created only when the advisor actually clicks the mic button.
- Clean SSR build: server bundle never touches `Worker`, `MediaRecorder`, `AudioContext`, or `navigator.mediaDevices`.
- Accessibility: visible focus, ARIA-pressed, German labels, ARIA-live status updates.
- BDD coverage: every new requirement has at least one Vitest or Playwright scenario; the user-facing flow has a Playwright scenario.

**Non-Goals:**

- Streaming/real-time partial transcripts. Whisper-small in the browser is too slow for live streaming; we transcribe once at stop.
- Multi-language. The recogniser is hard-coded to German.
- Server-side transcription fallback. If the browser cannot run the worker (no WebAssembly, no `MediaRecorder`, denied mic), the feature gracefully degrades to "unsupported" and the advisor types as before.
- Custom voice activity detection. The advisor presses to stop.
- Persisting raw audio. Audio buffers stay in memory and are released after transcription.

## Decisions

### Decision: model = `onnx-community/whisper-small`, dtype `q4` on WebGPU, `q8` on WASM

Whisper-small (multilingual) is the user's stated choice. The `onnx-community/whisper-small` repository on Hugging Face is the canonical ONNX export maintained alongside Transformers.js. We pick `dtype: 'q4'` when WebGPU is available (smaller download, comparable quality on GPU) and `dtype: 'q8'` on the WASM backend (q4 has stability issues on WASM in some browsers).

**Alternatives considered:**

- `Xenova/whisper-small` — older mirror, still works but `onnx-community` is the active home for new exports.
- Whisper-base — faster, smaller (~74 MB) but noticeably worse on German fachvokabular like "ETF-Sparplan" and "Riester-Rente".
- Whisper-large-v3 — best quality, but >600 MB even quantized; impractical first-load.

### Decision: Web Worker via `new Worker(new URL('./speech-recognition.worker', import.meta.url), { type: 'module' })`

Angular's `@angular/build` (esbuild) supports the standard `new URL(...)` worker pattern and emits a separate ESM worker chunk. This keeps `@huggingface/transformers` out of the main bundle entirely — the import lives **only** inside the worker file.

The worker uses the Hugging Face documented singleton pattern: a `getPipeline()` function caches the pipeline promise so initialisation happens once.

**Alternatives considered:**

- `WorkerGlobalScope` via classic `importScripts` — incompatible with Angular's module-based build.
- Loading Transformers.js on the main thread — inference would block UI; ASR can take seconds even for short clips.
- Service Worker — wrong tool for compute; would also conflict with Angular's SSR + hydration story.

### Decision: audio capture with `MediaRecorder` → decode + downsample with `OfflineAudioContext`

`MediaRecorder` is widely supported, gives us a browser-chosen container (`audio/webm;codecs=opus` on Chromium, `audio/mp4` on Safari). After stop, we feed the blob through:

1. `new AudioContext()` + `decodeAudioData(arrayBuffer)` for format-agnostic decoding.
2. `OfflineAudioContext(1, durationInSamples, 16000)` to downmix to mono and resample to 16 kHz, which is what Whisper expects.
3. Pass the resulting `Float32Array` to the worker via `postMessage` with the buffer marked as a transferable, avoiding a copy.

**Alternatives considered:**

- `AudioContext({ sampleRate: 16000 })` directly — rejected by Safari with "AudioContext was not allowed to start" and by some Chromium flag combinations.
- Web Audio `AudioWorklet` capturing raw frames — more complex, and the gain (lower latency) is irrelevant since we transcribe after stop, not live.
- `getUserMedia` with `MediaStreamTrackProcessor` — Chromium-only.

### Decision: lazy-load worker on first activation

The `SpeechRecognitionService` does not construct the worker in its constructor. The worker is created in the first `start()` call. This way, advisors who never use voice input pay no bundle cost beyond the small service module itself.

The first activation triggers two costs in sequence: model download (cached afterwards by Transformers.js using the IndexedDB / Cache Storage backend) and the WebGPU / WASM warmup. Both are surfaced as the `loading-model` status with progress.

### Decision: transcript append, with single space separator

If the draft is empty, the transcript replaces it; otherwise we concatenate `draft + ' ' + transcript.trim()`. The user explicitly chose "verknüpfen" over "ersetzen". Trailing/leading whitespace from Whisper is trimmed because Whisper outputs leading spaces on most utterances.

### Decision: status state machine — `idle | unsupported | loading-model | recording | transcribing | error`

Single `WritableSignal<Status>` plus derived `computed` signals (`isRecording`, `isLoading`, `isBusy`). The chat composer reads these to disable input/send while the mic is in use. `unsupported` is sticky once detected; `error` clears back to `idle` on the next successful `start()`.

### Decision: SSR-safety via `isPlatformBrowser`

The service constructor only reads the platform ID. All browser-API touches (`navigator.mediaDevices.getUserMedia`, `new Worker`, `new AudioContext`, `new MediaRecorder`) live behind a `#isBrowser` guard. The component reads `service.isAvailable()` to decide whether to render the mic button at all on the server pass — but renders it eagerly on the client because hydration can replace it.

### Decision: tests rely on a fake service for the panel; service tests mock `Worker`/`MediaRecorder`/`getUserMedia`

The Vitest environment is jsdom; none of the audio APIs are real. ChatPanel scenarios use a `FakeSpeechRecognitionService` (the same pattern already used for `FakeAdvisorChat`). The service's own scenarios mock `navigator.mediaDevices`, `Worker`, and `MediaRecorder` to drive the state machine deterministically. Playwright covers the user-visible UI states (button presence, ARIA, disabled while reply is streaming) but does not actually run Whisper — model download and inference are out-of-scope for CI.

## Risks / Trade-offs

- **First-load model download is large** → Cache the weights via the default Transformers.js browser cache (IndexedDB-backed via the OPFS adapter when available). Show progress so the user understands the wait. Document the size in the `loading-model` UI string ("Sprachmodell wird geladen, dies kann beim ersten Mal ein paar Sekunden dauern").
- **WebGPU not universally available** → Detect via `'gpu' in navigator` + `requestAdapter()`; fall back to WASM. WASM with SIMD + threads is fast enough for short utterances of Whisper-small.
- **Bundle budget breach** → The worker chunk is excluded from the initial budget by Angular's builder, but verify with `npm run build` and inspect the production output. If a budget warning appears for the worker, adjust `angular.json` to widen the budget for that named chunk only (not the initial bundle).
- **Safari iOS has stricter `MediaRecorder` MIME support** → Decode via `decodeAudioData` which handles whatever Safari produces. WebGPU is shipped on Safari 17+; we still degrade to WASM on older Safari.
- **Long recordings** → `chunk_length_s: 30, stride_length_s: 5` so Whisper handles utterances longer than 30 s by chunked inference. We do not impose a hard time cap; advisors who hold the mic too long simply wait longer for transcription.
- **Permission denied** → Surface a German error, set status to `error`, leave the composer typable. Permission is requested fresh on each `start()` after an `error`.
- **Two mic toggles racing (e.g. double-click)** → `start()` is a no-op when `isBusy()`; `stop()` is a no-op unless status is `recording`.

## Migration Plan

Single-PR change, no flags, no data migration. Rollback = revert PR; the worker chunk and dependency are removed and the composer goes back to text-only.

## Open Questions

_None at proposal time. Open questions move to `tasks.md` if they surface during apply._
