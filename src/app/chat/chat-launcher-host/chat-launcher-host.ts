import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { CurrentUserService } from '../../user/current-user.service';
import { AdvisorChatService } from '../advisor-chat';
import { ChatLauncher } from '../chat-launcher/chat-launcher';
import { ChatPanel } from '../chat-panel/chat-panel';

@Component({
  selector: 'app-chat-launcher-host',
  imports: [ChatLauncher, ChatPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-chat-launcher #launcher [panelOpen]="panelOpen()" (togglePanel)="toggle()" />
    @if (panelOpen()) {
      <app-chat-panel #panel (requestClose)="close()" />
    }
  `,
})
export class ChatLauncherHost {
  readonly #chat = inject(AdvisorChatService);
  readonly #currentUser = inject(CurrentUserService);
  readonly #injector = inject(Injector);

  readonly panelOpen = signal(false);

  readonly launcher = viewChild.required('launcher', { read: ElementRef });
  readonly panel = viewChild<ChatPanel>('panel');

  toggle(): void {
    if (this.panelOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  private open(): void {
    this.panelOpen.set(true);
    this.#chat.seedGreeting(this.#currentUser.user()?.name ?? null);
    afterNextRender(
      {
        write: () => {
          this.panel()?.focusComposer();
        },
      },
      { injector: this.#injector },
    );
  }

  close(): void {
    if (!this.panelOpen()) {
      return;
    }
    this.panelOpen.set(false);
    afterNextRender(
      {
        write: () => {
          const root = this.launcher().nativeElement as HTMLElement;
          root.querySelector<HTMLButtonElement>('button')?.focus();
        },
      },
      { injector: this.#injector },
    );
  }
}
