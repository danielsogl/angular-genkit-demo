import {
  Injectable,
  PLATFORM_ID,
  computed,
  inject,
  resource,
  signal,
  type Signal,
} from '@angular/core';
import type { ResourceStreamItem } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { streamFlow } from 'genkit/beta/client';

import type { ChatStreamEvent } from '../../ai/flows/advisor-chat-schema';
import { CurrentUserService } from '../user/current-user.service';
import type { ChatMessage, ChatTurnRequest } from './chat-types';

@Injectable({ providedIn: 'root' })
export class AdvisorChatService {
  readonly #currentUser = inject(CurrentUserService);
  readonly #router = inject(Router);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly #draft = signal('');
  readonly #history = signal<readonly ChatMessage[]>([]);
  readonly #submittedTurn = signal<ChatTurnRequest | undefined>(undefined);
  readonly #streaming = signal(false);

  readonly draft = this.#draft.asReadonly();
  readonly history = this.#history.asReadonly();

  readonly replyResource = resource<string, ChatTurnRequest | undefined>({
    params: () => this.#submittedTurn(),
    defaultValue: '',
    stream: async ({ params, abortSignal }) => {
      const data = signal<ResourceStreamItem<string>>({ value: '' });
      this.#streaming.set(true);
      const { stream, output } = streamFlow<{ reply: string }, ChatStreamEvent>({
        url: '/api/chat',
        input: params,
        abortSignal,
      });
      let dispatched = false;
      void (async () => {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'text') {
              const delta = chunk.delta;
              data.update((prev) => ('value' in prev ? { value: prev.value + delta } : prev));
              continue;
            }
            if (chunk.type === 'navigate' && !dispatched && this.#isBrowser) {
              dispatched = true;
              void this.#router.navigateByUrl('/' + chunk.target);
            }
          }
          await output;
        } catch (err) {
          console.error('[AdvisorChat] flow stream failed', err);
          data.set({ error: err instanceof Error ? err : new Error(String(err)) });
        } finally {
          this.#streaming.set(false);
        }
      })();
      return data;
    },
  });

  // The resource Promise resolves as soon as the stream factory returns the data
  // signal, so `replyResource.isLoading()` flips off before chunks arrive. The
  // `#streaming` flag below tracks the actual chunk-receiving window so the
  // composer stays disabled until the stream closes.
  readonly isStreaming = computed(() => this.replyResource.isLoading() || this.#streaming());
  readonly status = computed(() => this.replyResource.status());
  readonly error: Signal<Error | undefined> = computed(() => this.replyResource.error());

  readonly displayedMessages = computed<readonly ChatMessage[]>(() => {
    const base = this.#history();
    const status = this.replyResource.status();
    // While `params` is null the resource sits in `idle` and we render only
    // committed history. Once a turn is submitted the in-flight assistant
    // bubble appears alongside the user message and grows with streamed text.
    if (status === 'idle') {
      return base;
    }
    // `value()` throws when the resource is in an error state, so route around
    // it for the error case. The bubble's content is replaced by the German
    // error template in <app-chat-message> based on `chat.status()`.
    const content = status === 'error' ? '' : (this.replyResource.value() ?? '');
    return [...base, { role: 'assistant', content }];
  });

  setDraft(value: string): void {
    this.#draft.set(value);
  }

  seedGreeting(name: string | null): void {
    if (this.#history().length > 0) {
      return;
    }
    const content = name
      ? `Hallo ${name}, wie kann ich Sie heute unterstützen?`
      : 'Guten Tag, wie kann ich Sie heute unterstützen?';
    this.#history.set([{ role: 'assistant', content }]);
  }

  send(message: string): void {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    if (this.replyResource.hasValue() && this.replyResource.status() === 'resolved') {
      const completed = this.replyResource.value();
      if (completed) {
        this.#history.update((prev) => [...prev, { role: 'assistant', content: completed }]);
      }
    }

    this.#history.update((prev) => [...prev, { role: 'user', content: trimmed }]);
    this.#draft.set('');

    const userName = this.#currentUser.user()?.name ?? null;
    this.#submittedTurn.set({
      userName,
      history: this.#history(),
      message: trimmed,
    });
  }

  retry(): void {
    this.replyResource.reload();
  }
}
