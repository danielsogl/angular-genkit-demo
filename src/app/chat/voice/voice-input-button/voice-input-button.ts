import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { SpeechRecognitionService } from '../speech-recognition.service';

@Component({
  selector: 'app-voice-input-button',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      mat-icon-button
      type="button"
      [attr.aria-label]="label()"
      [attr.aria-pressed]="speech.isRecording()"
      [disabled]="isDisabled()"
      (click)="onToggle()"
    >
      <mat-icon>{{ speech.isRecording() ? 'stop_circle' : 'mic' }}</mat-icon>
    </button>
  `,
  styleUrl: './voice-input-button.scss',
})
export class VoiceInputButton {
  protected readonly speech = inject(SpeechRecognitionService);

  readonly disabled = input(false);
  readonly transcript = output<string>();

  protected readonly isDisabled = computed(
    () => this.disabled() || !this.speech.isAvailable() || this.speech.isLoading(),
  );

  protected readonly label = computed(() => {
    if (!this.speech.isAvailable()) {
      return 'Spracheingabe wird in diesem Browser nicht unterstützt';
    }
    return this.speech.isRecording() ? 'Spracheingabe stoppen' : 'Spracheingabe starten';
  });

  protected async onToggle(): Promise<void> {
    if (this.speech.isRecording()) {
      const text = await this.speech.stop();
      if (text) {
        this.transcript.emit(text);
      }
      return;
    }
    await this.speech.start();
  }
}
