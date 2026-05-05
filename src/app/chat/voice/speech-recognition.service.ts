import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type RecognitionStatus =
  | 'idle'
  | 'unsupported'
  | 'loading-model'
  | 'recording'
  | 'transcribing'
  | 'error';

const TARGET_SAMPLE_RATE = 16_000;
const ERROR_PERMISSION = 'Mikrofonzugriff wurde verweigert.';
const ERROR_GENERIC = 'Spracheingabe fehlgeschlagen. Bitte erneut versuchen.';
const ERROR_UNSUPPORTED = 'Spracheingabe wird in diesem Browser nicht unterstützt.';

type WorkerMessage =
  | { type: 'progress'; progress: number }
  | { type: 'ready' }
  | { type: 'transcribed'; text: string }
  | { type: 'error'; error: string };

@Injectable({ providedIn: 'root' })
export class SpeechRecognitionService {
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly #status = signal<RecognitionStatus>('idle');
  readonly #error = signal<string | undefined>(undefined);
  readonly #progress = signal(0);

  readonly status = this.#status.asReadonly();
  readonly error = this.#error.asReadonly();
  readonly progress = this.#progress.asReadonly();

  readonly isRecording = computed(() => this.#status() === 'recording');
  readonly isLoading = computed(() => {
    const s = this.#status();
    return s === 'loading-model' || s === 'transcribing';
  });
  readonly isBusy = computed(() => this.isRecording() || this.isLoading());
  readonly isAvailable = computed(() => this.#isBrowser && this.#status() !== 'unsupported');

  #worker: Worker | undefined;
  #stream: MediaStream | undefined;
  #recorder: MediaRecorder | undefined;
  #chunks: Blob[] = [];

  async start(): Promise<void> {
    if (!this.#isBrowser || this.isBusy()) {
      return;
    }
    if (!this.#supported()) {
      this.#status.set('unsupported');
      this.#error.set(ERROR_UNSUPPORTED);
      return;
    }

    this.#error.set(undefined);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.#fail(ERROR_PERMISSION);
      return;
    }

    try {
      await this.#ensureWorker();
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      this.#fail(ERROR_GENERIC);
      return;
    }

    this.#stream = stream;
    this.#chunks = [];
    this.#recorder = new MediaRecorder(stream);
    this.#recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        this.#chunks.push(event.data);
      }
    });
    this.#recorder.start();
    this.#status.set('recording');
  }

  async stop(): Promise<string | undefined> {
    if (this.#status() !== 'recording' || !this.#recorder) {
      return undefined;
    }

    const recorder = this.#recorder;
    await new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true });
      recorder.stop();
    });

    this.#stream?.getTracks().forEach((track) => track.stop());
    this.#stream = undefined;
    this.#recorder = undefined;
    this.#status.set('transcribing');

    try {
      const blob = new Blob(this.#chunks, { type: recorder.mimeType });
      this.#chunks = [];
      const audio = await this.#decodeToMono16k(blob);
      const text = await this.#transcribe(audio);
      this.#status.set('idle');
      return text.trim();
    } catch {
      this.#fail(ERROR_GENERIC);
      return undefined;
    }
  }

  async toggle(): Promise<string | undefined> {
    if (this.isRecording()) {
      return this.stop();
    }
    await this.start();
    return undefined;
  }

  #fail(message: string): void {
    this.#status.set('error');
    this.#error.set(message);
  }

  #supported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined' &&
      typeof Worker !== 'undefined' &&
      typeof AudioContext !== 'undefined' &&
      typeof OfflineAudioContext !== 'undefined'
    );
  }

  async #ensureWorker(): Promise<Worker> {
    if (this.#worker) {
      return this.#worker;
    }
    this.#status.set('loading-model');
    this.#progress.set(0);
    const worker = new Worker(new URL('./speech-recognition.worker', import.meta.url), {
      type: 'module',
    });
    await new Promise<void>((resolve, reject) => {
      const onMessage = (event: MessageEvent<WorkerMessage>) => {
        const data = event.data;
        if (data.type === 'progress') {
          const next = Math.max(0, Math.min(100, Math.round(data.progress)));
          if (next > this.#progress()) {
            this.#progress.set(next);
          }
          return;
        }
        if (data.type === 'ready') {
          worker.removeEventListener('message', onMessage);
          resolve();
          return;
        }
        if (data.type === 'error') {
          worker.removeEventListener('message', onMessage);
          reject(new Error(data.error));
        }
      };
      worker.addEventListener('message', onMessage);
    });
    this.#worker = worker;
    return worker;
  }

  #transcribe(audio: Float32Array): Promise<string> {
    const worker = this.#worker;
    if (!worker) {
      return Promise.reject(new Error('Worker is not initialised'));
    }
    return new Promise((resolve, reject) => {
      const onMessage = (event: MessageEvent<WorkerMessage>) => {
        const data = event.data;
        if (data.type === 'transcribed') {
          worker.removeEventListener('message', onMessage);
          resolve(data.text);
        } else if (data.type === 'error') {
          worker.removeEventListener('message', onMessage);
          reject(new Error(data.error));
        }
      };
      worker.addEventListener('message', onMessage);
      worker.postMessage({ audio }, [audio.buffer]);
    });
  }

  async #decodeToMono16k(blob: Blob): Promise<Float32Array> {
    const arrayBuffer = await blob.arrayBuffer();
    const decoder = new AudioContext();
    const decoded = await decoder.decodeAudioData(arrayBuffer).finally(() => decoder.close());
    const length = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE));
    const offline = new OfflineAudioContext(1, length, TARGET_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0).slice();
  }
}
