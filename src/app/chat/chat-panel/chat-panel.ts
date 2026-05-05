import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  viewChild,
  type ElementRef,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AdvisorChatService } from '../advisor-chat';
import { ChatMessage } from '../chat-message/chat-message';
import { SpeechRecognitionService } from '../voice/speech-recognition.service';
import { VoiceInputButton } from '../voice/voice-input-button/voice-input-button';

let nextId = 0;

@Component({
  selector: 'app-chat-panel',
  imports: [MatButtonModule, MatIconModule, ChatMessage, VoiceInputButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'dialog',
    '[attr.aria-labelledby]': 'titleId',
    '(keydown.escape)': 'requestClose.emit()',
  },
  template: `
    <header class="chat-panel__header">
      <h2 [id]="titleId" class="chat-panel__title">Assistent</h2>
      <button
        mat-icon-button
        type="button"
        aria-label="Assistent schließen"
        (click)="requestClose.emit()"
      >
        <mat-icon>close</mat-icon>
      </button>
    </header>

    <ol
      class="chat-panel__messages"
      aria-live="polite"
      aria-relevant="additions"
      [attr.aria-busy]="chat.isStreaming()"
    >
      @for (msg of chat.displayedMessages(); track $index; let last = $last) {
        <li>
          <app-chat-message [message]="msg" [isInFlight]="last && msg.role === 'assistant'" />
        </li>
      }
    </ol>

    @if (chat.isStreaming()) {
      <p class="chat-panel__status" aria-label="Antwort wird gestreamt">Antwort wird gestreamt …</p>
    }

    @switch (speech.status()) {
      @case ('loading-model') {
        <p class="chat-panel__status" aria-live="polite">
          Sprachmodell wird geladen … {{ speech.progress() }}%
        </p>
      }
      @case ('recording') {
        <p class="chat-panel__status chat-panel__status--recording" aria-live="polite">
          Aufnahme läuft …
        </p>
      }
      @case ('transcribing') {
        <p class="chat-panel__status" aria-live="polite">Transkription läuft …</p>
      }
      @case ('error') {
        <p
          class="chat-panel__status chat-panel__status--error"
          role="alert"
          data-testid="voice-error"
        >
          {{ speech.error() }}
        </p>
      }
    }

    <form class="chat-panel__composer" (submit)="onSubmit($event)">
      <label class="chat-panel__visually-hidden" [attr.for]="inputId"
        >Nachricht an den Assistenten</label
      >
      <input
        #composerInput
        type="text"
        autocomplete="off"
        class="chat-panel__input"
        placeholder="Wie kann ich helfen?"
        [id]="inputId"
        [value]="chat.draft()"
        [disabled]="isComposerDisabled()"
        (input)="onInput($event)"
        (keydown.enter)="onEnter($event)"
      />
      <app-voice-input-button
        class="chat-panel__mic"
        [disabled]="chat.isStreaming()"
        (transcript)="onTranscript($event)"
      />
      <button
        mat-flat-button
        type="submit"
        color="primary"
        [disabled]="isComposerDisabled() || !canSend()"
      >
        Senden
      </button>
    </form>
  `,
  styleUrl: './chat-panel.scss',
})
export class ChatPanel {
  protected readonly chat = inject(AdvisorChatService);
  protected readonly speech = inject(SpeechRecognitionService);

  readonly requestClose = output<void>();

  protected readonly titleId = `chat-panel-title-${++nextId}`;
  protected readonly inputId = `chat-panel-input-${nextId}`;

  readonly composerInput = viewChild<ElementRef<HTMLInputElement>>('composerInput');

  protected readonly canSend = computed(() => this.chat.draft().trim().length > 0);

  protected readonly isComposerDisabled = computed(
    () => this.chat.isStreaming() || this.speech.isBusy(),
  );

  focusComposer(): void {
    this.composerInput()?.nativeElement.focus();
  }

  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.chat.setDraft(target.value);
  }

  protected onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) {
      return;
    }
    keyboardEvent.preventDefault();
    this.submit();
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submit();
  }

  protected onTranscript(transcript: string): void {
    const trimmedDraft = this.chat.draft().trimEnd();
    const merged = trimmedDraft ? `${trimmedDraft} ${transcript}` : transcript;
    this.chat.setDraft(merged);
    if (!this.chat.isStreaming()) {
      this.chat.send(merged);
    }
  }

  private submit(): void {
    const value = this.chat.draft();
    if (this.chat.isStreaming() || !value.trim()) {
      return;
    }
    this.chat.send(value);
  }
}
