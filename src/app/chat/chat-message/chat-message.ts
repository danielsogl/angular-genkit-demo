import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { AdvisorChatService } from '../advisor-chat';
import type { ChatMessage as ChatMessageModel } from '../chat-types';

@Component({
  selector: 'app-chat-message',
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'chat-message',
    '[attr.data-role]': 'message().role',
    '[class.is-error]': 'isErrorBubble()',
  },
  template: `
    @if (isErrorBubble()) {
      <p class="chat-message__error-text">
        Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.
      </p>
      <button mat-stroked-button type="button" class="chat-message__retry" (click)="chat.retry()">
        Erneut versuchen
      </button>
    } @else {
      <p class="chat-message__text">{{ message().content }}</p>
    }
  `,
  styleUrl: './chat-message.scss',
})
export class ChatMessage {
  protected readonly chat = inject(AdvisorChatService);
  readonly message = input.required<ChatMessageModel>();
  readonly isInFlight = input<boolean>(false);

  protected readonly isErrorBubble = computed(
    () => this.isInFlight() && this.chat.status() === 'error',
  );
}
