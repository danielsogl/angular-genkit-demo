import { ApplicationRef, Injectable, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { SpeechRecognitionService, type RecognitionStatus } from '../speech-recognition.service';
import { VoiceInputButton } from './voice-input-button';

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
    this.#status.set('recording');
  }

  async stop(): Promise<string | undefined> {
    this.stopCalls += 1;
    if (this.#status() !== 'recording') {
      return undefined;
    }
    this.#status.set('idle');
    const text = this.nextTranscript.trim();
    return text || undefined;
  }

  setStatus(status: RecognitionStatus): void {
    this.#status.set(status);
  }
}

const flush = async () => {
  await TestBed.inject(ApplicationRef).whenStable();
};

const setup = async () => {
  TestBed.configureTestingModule({
    providers: [{ provide: SpeechRecognitionService, useClass: FakeSpeechRecognitionService }],
  });
  const speech = TestBed.inject(
    SpeechRecognitionService,
  ) as unknown as FakeSpeechRecognitionService;
  const fixture = TestBed.createComponent(VoiceInputButton);
  fixture.detectChanges();
  await flush();
  return { fixture, speech };
};

const queryButton = (root: HTMLElement): HTMLButtonElement =>
  root.querySelector<HTMLButtonElement>('button')!;

describe('VoiceInputButton', () => {
  describe('Reflects speech recognition state', () => {
    it('Scenario: Idle exposes the start label and is not pressed', async () => {
      // Given an idle speech service
      const { fixture } = await setup();
      // When the button renders
      const btn = queryButton(fixture.nativeElement as HTMLElement);
      // Then it advertises the start action
      expect(btn.getAttribute('aria-label')).toBe('Spracheingabe starten');
      expect(btn.getAttribute('aria-pressed')).toBe('false');
      expect(btn.disabled).toBe(false);
    });

    it('Scenario: Recording switches the label to stop and pressed=true', async () => {
      // Given a button bound to a service that begins recording
      const { fixture, speech } = await setup();
      // When recording starts
      speech.setStatus('recording');
      fixture.detectChanges();
      await flush();
      // Then the button reflects the pressed/stop state
      const btn = queryButton(fixture.nativeElement as HTMLElement);
      expect(btn.getAttribute('aria-label')).toBe('Spracheingabe stoppen');
      expect(btn.getAttribute('aria-pressed')).toBe('true');
    });

    it('Scenario: Unsupported browser disables the button with German hint', async () => {
      // Given the speech service reports the browser is unsupported
      const { fixture, speech } = await setup();
      speech.setStatus('unsupported');
      fixture.detectChanges();
      await flush();
      // When the button renders
      const btn = queryButton(fixture.nativeElement as HTMLElement);
      // Then it is disabled and explains why in German
      expect(btn.disabled).toBe(true);
      expect(btn.getAttribute('aria-label')).toBe(
        'Spracheingabe wird in diesem Browser nicht unterstützt',
      );
    });

    it('Scenario: External disabled input disables the button', async () => {
      // Given an idle service
      const { fixture } = await setup();
      // When the parent passes disabled=true
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      await flush();
      // Then the inner button is disabled
      expect(queryButton(fixture.nativeElement as HTMLElement).disabled).toBe(true);
    });
  });

  describe('Toggle behaviour', () => {
    it('Scenario: First click starts a recording', async () => {
      // Given an idle button
      const { fixture, speech } = await setup();
      // When the user clicks the mic
      queryButton(fixture.nativeElement as HTMLElement).click();
      await flush();
      // Then the speech service is asked to start
      expect(speech.startCalls).toBe(1);
      expect(speech.isRecording()).toBe(true);
    });

    it('Scenario: Second click stops and emits the transcript', async () => {
      // Given a recording with a pending transcript
      const { fixture, speech } = await setup();
      speech.nextTranscript = 'Hallo Welt';
      speech.setStatus('recording');
      fixture.detectChanges();
      const transcripts: string[] = [];
      fixture.componentInstance.transcript.subscribe((value) => transcripts.push(value));
      // When the user clicks again
      queryButton(fixture.nativeElement as HTMLElement).click();
      await flush();
      // Then stop is invoked and the transcript is emitted
      expect(speech.stopCalls).toBe(1);
      expect(transcripts).toEqual(['Hallo Welt']);
    });

    it('Scenario: Empty transcript is not emitted', async () => {
      // Given a recording that yields no text
      const { fixture, speech } = await setup();
      speech.nextTranscript = '   ';
      speech.setStatus('recording');
      fixture.detectChanges();
      const transcripts: string[] = [];
      fixture.componentInstance.transcript.subscribe((value) => transcripts.push(value));
      // When the user clicks again
      queryButton(fixture.nativeElement as HTMLElement).click();
      await flush();
      // Then no transcript event is emitted
      expect(transcripts).toEqual([]);
    });
  });
});
