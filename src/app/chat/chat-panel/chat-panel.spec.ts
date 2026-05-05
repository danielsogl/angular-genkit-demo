import { ApplicationRef, Injectable, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AdvisorChatService } from '../advisor-chat';
import type { ChatMessage as ChatMessageModel } from '../chat-types';
import { ChatPanel } from './chat-panel';

interface FakeReplyResource {
  isLoading: () => boolean;
  hasValue: () => boolean;
  status: () => 'idle' | 'loading' | 'resolved' | 'error' | 'reloading' | 'local';
  value: () => string;
  error: () => Error | undefined;
  reload: () => void;
}

@Injectable()
class FakeAdvisorChat {
  readonly #draft = signal('');
  readonly #history = signal<readonly ChatMessageModel[]>([]);
  readonly #replyValue = signal('');
  readonly #loading = signal(false);
  readonly #status = signal<'idle' | 'loading' | 'resolved' | 'error' | 'reloading' | 'local'>(
    'idle',
  );

  readonly draft = this.#draft.asReadonly();
  readonly history = this.#history.asReadonly();
  readonly isStreaming = computed(() => this.#loading());
  readonly status = computed(() => this.#status());
  readonly error = computed<Error | undefined>(() => undefined);

  readonly replyResource: FakeReplyResource = {
    isLoading: () => this.#loading(),
    hasValue: () => this.#replyValue().length > 0,
    status: () => this.#status(),
    value: () => this.#replyValue(),
    error: () => undefined,
    reload: () => undefined,
  };

  readonly displayedMessages = computed<readonly ChatMessageModel[]>(() => {
    const base = this.#history();
    if (this.#loading() || this.#replyValue().length > 0) {
      return [...base, { role: 'assistant', content: this.#replyValue() }];
    }
    return base;
  });

  readonly sendCalls: string[] = [];

  setDraft(value: string): void {
    this.#draft.set(value);
  }

  send(message: string): void {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }
    this.sendCalls.push(trimmed);
    this.#history.update((prev) => [...prev, { role: 'user', content: trimmed }]);
    this.#draft.set('');
    this.#loading.set(true);
    this.#status.set('loading');
  }

  retry(): void {
    /* fake */
  }

  setStreaming(streaming: boolean): void {
    this.#loading.set(streaming);
    this.#status.set(streaming ? 'loading' : 'resolved');
  }

  setReplyChunk(text: string): void {
    this.#replyValue.set(text);
  }

  seedHistory(messages: readonly ChatMessageModel[]): void {
    this.#history.set(messages);
  }
}

const flush = async () => {
  await TestBed.inject(ApplicationRef).whenStable();
};

const setup = async () => {
  TestBed.configureTestingModule({
    providers: [{ provide: AdvisorChatService, useClass: FakeAdvisorChat }],
  });
  const fake = TestBed.inject(AdvisorChatService) as unknown as FakeAdvisorChat;
  const fixture = TestBed.createComponent(ChatPanel);
  fixture.detectChanges();
  await flush();
  return { fixture, fake };
};

const queryInput = (root: HTMLElement): HTMLInputElement =>
  root.querySelector<HTMLInputElement>('input.chat-panel__input')!;

const querySend = (root: HTMLElement): HTMLButtonElement =>
  root.querySelector<HTMLButtonElement>('button[type="submit"]')!;

describe('ChatPanel', () => {
  describe('Advisor can send a message and receive a streamed reply', () => {
    it('Scenario: Sending a message via the send button', async () => {
      // Given the composer has a non-empty value
      const { fixture, fake } = await setup();
      const root = fixture.nativeElement as HTMLElement;
      const input = queryInput(root);
      input.value = 'Was kannst du?';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      // When the advisor clicks send
      querySend(root).click();
      fixture.detectChanges();
      await flush();
      // Then send is invoked, transcript appends the user message, input clears
      expect(fake.sendCalls).toEqual(['Was kannst du?']);
      expect(input.value).toBe('');
      const userBubble = root.querySelector('[data-role="user"] .chat-message__text');
      expect(userBubble?.textContent).toContain('Was kannst du?');
    });

    it('Scenario: Sending a message via Enter', async () => {
      // Given the composer has text
      const { fixture, fake } = await setup();
      const root = fixture.nativeElement as HTMLElement;
      const input = queryInput(root);
      input.value = 'Hallo';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      // When Enter is pressed without Shift
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      );
      fixture.detectChanges();
      await flush();
      // Then send is invoked
      expect(fake.sendCalls).toEqual(['Hallo']);
    });

    it('Scenario: Empty message is ignored', async () => {
      // Given the composer is empty
      const { fixture, fake } = await setup();
      const root = fixture.nativeElement as HTMLElement;
      // When the send button is clicked
      const sendBtn = querySend(root);
      sendBtn.removeAttribute('disabled');
      sendBtn.click();
      fixture.detectChanges();
      await flush();
      // Then no send call is recorded
      expect(fake.sendCalls).toHaveLength(0);
    });

    it('Scenario: Input disabled while streaming', async () => {
      // Given a reply is streaming
      const { fixture, fake } = await setup();
      fake.setStreaming(true);
      fixture.detectChanges();
      await flush();
      // When the input and submit button are inspected
      const root = fixture.nativeElement as HTMLElement;
      const input = queryInput(root);
      const sendBtn = querySend(root);
      // Then both are disabled and a status indicator is present
      expect(input.disabled).toBe(true);
      expect(sendBtn.disabled).toBe(true);
      expect(root.querySelector('.chat-panel__status')).not.toBeNull();
    });

    it('Scenario: Streamed reply appears progressively', async () => {
      // Given a reply chunk has been emitted while streaming
      const { fixture, fake } = await setup();
      fake.setStreaming(true);
      fake.setReplyChunk('Gerne. ');
      fixture.detectChanges();
      await flush();
      const root = fixture.nativeElement as HTMLElement;
      const assistant = root.querySelector('[data-role="assistant"] .chat-message__text');
      expect(assistant?.textContent).toContain('Gerne.');
      // When more chunks arrive
      fake.setReplyChunk('Gerne. Ich helfe Ihnen.');
      fixture.detectChanges();
      await flush();
      // Then the same single bubble grows in place
      const allAssistant = root.querySelectorAll('[data-role="assistant"]');
      expect(allAssistant.length).toBe(1);
      expect(allAssistant[0].textContent).toContain('Gerne. Ich helfe Ihnen.');
    });
  });
});
