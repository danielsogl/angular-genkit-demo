import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-chat-launcher',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'chat-launcher-host',
  },
  template: `
    <button
      mat-fab
      type="button"
      color="primary"
      class="chat-launcher-fab"
      [attr.aria-expanded]="panelOpen()"
      aria-label="Assistent öffnen"
      (click)="togglePanel.emit()"
    >
      <mat-icon>smart_toy</mat-icon>
    </button>
  `,
  styleUrl: './chat-launcher.scss',
})
export class ChatLauncher {
  readonly panelOpen = input.required<boolean>();
  readonly togglePanel = output<void>();
}
