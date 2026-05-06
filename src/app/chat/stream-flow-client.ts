/**
 * Minimal client for Genkit's Express SSE flow protocol.
 *
 * Wire format produced by `@genkit-ai/express`'s `expressHandler` when the
 * client requests `Accept: text/event-stream`:
 *
 *   data: {"message": <stream chunk>}
 *   data: {"result": <final output>}
 *   data: {"error": {"message": "..."}}    // on failure
 *
 * Returns an async iterable of stream chunks plus a promise that resolves to
 * the final output. Same surface as Genkit's `streamFlow`, kept local to avoid
 * pulling `genkit/beta/client` into the browser bundle (it transitively
 * depends on `@genkit-ai/core`, which uses dynamic CommonJS requires that
 * break in Vite/esbuild ESM environments).
 */

import { InjectionToken } from '@angular/core';

export interface StreamFlowOptions<I> {
  readonly url: string;
  readonly input: I;
  readonly abortSignal?: AbortSignal;
}

export interface StreamFlowResult<O, S> {
  readonly stream: AsyncIterable<S>;
  readonly output: Promise<O>;
}

export type StreamFlowFn = <O, S, I = unknown>(
  opts: StreamFlowOptions<I>,
) => StreamFlowResult<O, S>;

export const STREAM_FLOW = new InjectionToken<StreamFlowFn>('STREAM_FLOW', {
  providedIn: 'root',
  factory: () => streamFlow,
});

export function streamFlow<O, S, I = unknown>(opts: StreamFlowOptions<I>): StreamFlowResult<O, S> {
  let resolveOutput!: (value: O) => void;
  let rejectOutput!: (err: Error) => void;
  const output = new Promise<O>((resolve, reject) => {
    resolveOutput = resolve;
    rejectOutput = reject;
  });

  async function* iterate(): AsyncIterable<S> {
    let response: Response;
    try {
      response = await fetch(opts.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ data: opts.input }),
        signal: opts.abortSignal,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      rejectOutput(error);
      throw error;
    }

    if (!response.ok || !response.body) {
      const error = new Error(`Flow request failed: ${response.status} ${response.statusText}`);
      rejectOutput(error);
      throw error;
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    let resolved = false;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let lineEnd = buffer.indexOf('\n');
        while (lineEnd >= 0) {
          const line = buffer.slice(0, lineEnd).trim();
          buffer = buffer.slice(lineEnd + 1);
          lineEnd = buffer.indexOf('\n');
          if (!line.startsWith('data:')) continue;
          const json = line.slice(line.indexOf(':') + 1).trim();
          if (!json) continue;
          const event = JSON.parse(json) as
            | { message: S }
            | { result: O }
            | { error: { message?: string } };
          if ('message' in event) {
            yield event.message;
          } else if ('result' in event) {
            resolveOutput(event.result);
            resolved = true;
          } else if ('error' in event) {
            const error = new Error(event.error.message ?? 'Flow error');
            rejectOutput(error);
            throw error;
          }
        }
      }
      if (!resolved) {
        rejectOutput(new Error('Flow stream ended before result was received'));
      }
    } finally {
      reader.releaseLock();
    }
  }

  return { stream: iterate(), output };
}
