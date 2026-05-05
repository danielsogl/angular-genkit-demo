/// <reference lib="webworker" />

import { env, pipeline, type ProgressInfo } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

const ctx = self as unknown as DedicatedWorkerGlobalScope;

const detectDevice = async (): Promise<'webgpu' | 'wasm'> => {
  const nav = navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } };
  try {
    if (nav.gpu && (await nav.gpu.requestAdapter())) {
      return 'webgpu';
    }
  } catch {
    /* fall through */
  }
  return 'wasm';
};

const transcriberReady = (async () => {
  const device = await detectDevice();
  const transcriber = await pipeline(
    'automatic-speech-recognition',
    'onnx-community/whisper-small',
    {
      device,
      dtype: device === 'webgpu' ? 'q4' : 'q8',
      progress_callback: (info: ProgressInfo) => {
        if (info.status === 'progress_total') {
          ctx.postMessage({ type: 'progress', progress: info.progress });
        }
      },
    },
  );
  ctx.postMessage({ type: 'ready' });
  return transcriber;
})();

transcriberReady.catch((err: unknown) => {
  ctx.postMessage({
    type: 'error',
    error: err instanceof Error ? err.message : String(err),
  });
});

ctx.addEventListener('message', async (event: MessageEvent<{ audio: Float32Array }>) => {
  try {
    const transcriber = await transcriberReady;
    const result = await transcriber(event.data.audio, {
      language: 'german',
      task: 'transcribe',
    });
    const text = Array.isArray(result) ? result.map((r) => r.text).join(' ') : result.text;
    ctx.postMessage({ type: 'transcribed', text });
  } catch (err) {
    ctx.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
