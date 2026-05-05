import { ApplicationRef, Injectable, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AdvisorChatService } from '../advisor-chat';
import type { ChatMessage as ChatMessageModel } from '../chat-types';
import {
  SpeechRecognitionService,
  type RecognitionStatus,
} from '../voice/speech-recognition.service';
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

@Injectable()
class FakeSpeechRecognitionService {
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
  readonly isAvailable = computed(() => this.#status() !== 'unsupported');

  nextTranscript = '';
  startCalls = 0;
  stopCalls = 0;

  async start(): Promise<void> {
    this.startCalls += 1;
    this.#error.set(undefined);
    if (this.#status() === 'unsupported') {
      return;
    }
    this.#status.set('recording');
  }

  async stop(): Promise<string | undefined> {
    this.stopCalls += 1;
    if (this.#status() !== 'recording') {
      return undefined;
    }
    this.#status.set('transcribing');
    const text = this.nextTranscript.trim();
    this.#status.set('idle');
    return text || undefined;
  }

  async toggle(): Promise<string | undefined> {
    if (this.isRecording()) {
      return this.stop();
    }
    await this.start();
    return undefined;
  }

  setStatus(status: RecognitionStatus, error?: string): void {
    this.#status.set(status);
    if (error !== undefined) {
      this.#error.set(error);
    }
  }

  setProgress(progress: number): void {
    this.#progress.set(progress);
  }
}

const flush = async () => {
  await TestBed.inject(ApplicationRef).whenStable();
};

const setup = async () => {
  TestBed.configureTestingModule({
    providers: [
      { provide: AdvisorChatService, useClass: FakeAdvisorChat },
      { provide: SpeechRecognitionService, useClass: FakeSpeechRecognitionService },
    ],
  });
  const fake = TestBed.inject(AdvisorChatService) as unknown as FakeAdvisorChat;
  const speech = TestBed.inject(
    SpeechRecognitionService,
  ) as unknown as FakeSpeechRecognitionService;
  const fixture = TestBed.createComponent(ChatPanel);
  fixture.detectChanges();
  await flush();
  return { fixture, fake, speech };
};

const queryInput = (root: HTMLElement): HTMLInputElement =>
  root.querySelector<HTMLInputElement>('input.chat-panel__input')!;

const querySend = (root: HTMLElement): HTMLButtonElement =>
  root.querySelector<HTMLButtonElement>('button[type="submit"]')!;

const queryMic = (root: HTMLElement): HTMLButtonElement =>
  root.querySelector<HTMLButtonElement>('app-voice-input-button button')!;

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

  describe('Composer offers a voice input toggle', () => {
    it('Scenario: Mic button is visible in the composer', async () => {
      // Given a supported browser and an open chat panel
      const { fixture } = await setup();
      const root = fixture.nativeElement as HTMLElement;
      const mic = queryMic(root);
      // Then the mic button is between input and send button
      expect(mic).not.toBeNull();
      expect(mic.getAttribute('aria-label')).toBe('Spracheingabe starten');
      expect(mic.disabled).toBe(false);
      const composerChildren = Array.from(root.querySelectorAll('.chat-panel__composer > *'));
      const inputIndex = composerChildren.findIndex((el) =>
        el.classList.contains('chat-panel__input'),
      );
      const micIndex = composerChildren.findIndex((el) => el.classList.contains('chat-panel__mic'));
      const sendIndex = composerChildren.findIndex(
        (el) => (el as HTMLElement).getAttribute('type') === 'submit',
      );
      expect(inputIndex).toBeLessThan(micIndex);
      expect(micIndex).toBeLessThan(sendIndex);
    });

    it('Scenario: Mic button reflects pressed state', async () => {
      // Given a supported browser and an idle mic
      const { fixture, speech } = await setup();
      const root = fixture.nativeElement as HTMLElement;
      const mic = queryMic(root);
      expect(mic.getAttribute('aria-pressed')).toBe('false');
      // When recording starts
      speech.setStatus('recording');
      fixture.detectChanges();
      await flush();
      // Then the button reports pressed and offers the stop label
      expect(mic.getAttribute('aria-pressed')).toBe('true');
      expect(mic.getAttribute('aria-label')).toBe('Spracheingabe stoppen');
    });

    it('Scenario: Mic button is disabled in unsupported browsers', async () => {
      // Given the user agent does not support speech recognition
      const { fixture, speech } = await setup();
      speech.setStatus('unsupported', 'Spracheingabe wird in diesem Browser nicht unterstützt.');
      fixture.detectChanges();
      await flush();
      const mic = queryMic(fixture.nativeElement as HTMLElement);
      // Then the button is disabled with a German explanation
      expect(mic.disabled).toBe(true);
      expect(mic.getAttribute('aria-label')).toBe(
        'Spracheingabe wird in diesem Browser nicht unterstützt',
      );
    });
  });

  describe('Mic toggle starts and stops a recording', () => {
    it('Scenario: First activation starts a recording', async () => {
      // Given an idle mic
      const { fixture, speech } = await setup();
      const root = fixture.nativeElement as HTMLElement;
      // When the user clicks the mic button
      queryMic(root).click();
      fixture.detectChanges();
      await flush();
      // Then start was called
      expect(speech.startCalls).toBe(1);
      expect(speech.isRecording()).toBe(true);
    });

    it('Scenario: Second activation stops the recording and transcribes', async () => {
      // Given a recording in progress that will yield a transcript
      const { fixture, fake, speech } = await setup();
      speech.nextTranscript = 'Wie hoch ist die Inflation';
      speech.setStatus('recording');
      fixture.detectChanges();
      // When the user clicks the mic button again
      queryMic(fixture.nativeElement as HTMLElement).click();
      await flush();
      fixture.detectChanges();
      // Then stop was called and the transcript was auto-sent to the chat flow
      expect(speech.stopCalls).toBe(1);
      expect(fake.sendCalls).toEqual(['Wie hoch ist die Inflation']);
    });
  });

  describe('Transcribed text is appended to the composer draft and auto-sent', () => {
    it('Scenario: Append into an empty draft', async () => {
      // Given an empty draft
      const { fixture, fake, speech } = await setup();
      speech.nextTranscript = 'Wie hoch ist die Inflation';
      speech.setStatus('recording');
      // When the recording stops with a transcript
      queryMic(fixture.nativeElement as HTMLElement).click();
      await flush();
      // Then the merged value is sent to the chat flow
      expect(fake.sendCalls).toEqual(['Wie hoch ist die Inflation']);
    });

    it('Scenario: Append after existing draft text', async () => {
      // Given an existing draft with trailing space
      const { fixture, fake, speech } = await setup();
      fake.setDraft('Bitte erkläre ');
      speech.nextTranscript = ' den ETF-Sparplan';
      speech.setStatus('recording');
      // When the recording stops with a transcript that has leading whitespace
      queryMic(fixture.nativeElement as HTMLElement).click();
      await flush();
      // Then the merged value is sent with exactly one separator space
      expect(fake.sendCalls).toEqual(['Bitte erkläre den ETF-Sparplan']);
    });

    it('Scenario: Transcript auto-sends as a prompt', async () => {
      // Given an idle chat and a recording about to yield a transcript
      const { fixture, fake, speech } = await setup();
      speech.nextTranscript = 'Erkläre Riester';
      speech.setStatus('recording');
      // When the recording stops
      queryMic(fixture.nativeElement as HTMLElement).click();
      await flush();
      // Then exactly one send call for the transcript fires without a manual click
      expect(fake.sendCalls).toEqual(['Erkläre Riester']);
      expect(fake.draft()).toBe('');
    });

    it('Scenario: Auto-send is suppressed while a reply is streaming', async () => {
      // Given the chat is currently streaming a previous reply
      const { fixture, fake, speech } = await setup();
      fake.setStreaming(true);
      speech.nextTranscript = 'Folgefrage';
      speech.setStatus('recording');
      // When the recording stops
      queryMic(fixture.nativeElement as HTMLElement).click();
      await flush();
      // Then the merged draft is set but no new send call fires
      expect(fake.draft()).toBe('Folgefrage');
      expect(fake.sendCalls).toEqual([]);
    });
  });

  describe('Voice input does not interfere with sending and streaming', () => {
    it('Scenario: Mic disabled while a reply streams', async () => {
      // Given the chat is currently streaming a reply
      const { fixture, fake } = await setup();
      fake.setStreaming(true);
      fixture.detectChanges();
      await flush();
      // Then the mic button is disabled
      const mic = queryMic(fixture.nativeElement as HTMLElement);
      expect(mic.disabled).toBe(true);
    });

    it('Scenario: Send disabled while recording', async () => {
      // Given the speech recognition is recording
      const { fixture, fake, speech } = await setup();
      fake.setDraft('Hallo');
      speech.setStatus('recording');
      fixture.detectChanges();
      await flush();
      const root = fixture.nativeElement as HTMLElement;
      // Then the message input and the send button are disabled
      expect(queryInput(root).disabled).toBe(true);
      expect(querySend(root).disabled).toBe(true);
    });
  });

  describe('Voice errors surface as a German message and clear on the next activation', () => {
    it('Scenario: Permission denied shows a German error', async () => {
      // Given the speech service has just emitted a permission error
      const { fixture, speech } = await setup();
      speech.setStatus('error', 'Mikrofonzugriff wurde verweigert.');
      fixture.detectChanges();
      await flush();
      const root = fixture.nativeElement as HTMLElement;
      const alert = root.querySelector('[data-testid="voice-error"]');
      // Then a German alert is rendered and the input remains usable
      expect(alert?.getAttribute('role')).toBe('alert');
      expect(alert?.textContent).toContain('Mikrofonzugriff wurde verweigert.');
      expect(queryInput(root).disabled).toBe(false);
    });

    it('Scenario: Next activation clears the error', async () => {
      // Given a previous voice error is visible
      const { fixture, speech } = await setup();
      speech.setStatus('error', 'Spracheingabe fehlgeschlagen. Bitte erneut versuchen.');
      fixture.detectChanges();
      await flush();
      // When the user activates the mic button again
      queryMic(fixture.nativeElement as HTMLElement).click();
      await flush();
      fixture.detectChanges();
      // Then the previous error is cleared and recording starts
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('[data-testid="voice-error"]')).toBeNull();
      expect(speech.startCalls).toBe(1);
    });
  });
});
