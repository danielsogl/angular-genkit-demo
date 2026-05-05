import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { CurrentUserService } from '../../user/current-user.service';
import { ThemeSwitcher } from '../../theming/theme-switcher/theme-switcher';

@Component({
  selector: 'app-top-bar',
  imports: [ThemeSwitcher],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="brand">Plansecur</span>
    <span class="spacer"></span>
    @if (user(); as currentUser) {
      <span class="user">
        <span data-testid="current-user-name" class="user-name">{{ currentUser.name }}</span>
        <span
          data-testid="current-user-avatar"
          class="user-avatar"
          [attr.aria-label]="'Avatar for ' + currentUser.name"
          >{{ currentUser.initials }}</span
        >
      </span>
    }
    <app-theme-switcher />
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
    }

    .brand {
      font: var(--mat-sys-title-medium);
    }

    .spacer {
      flex: 1 1 auto;
    }

    .user {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .user-name {
      font: var(--mat-sys-label-large);
    }

    .user-avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 50%;
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
      font: var(--mat-sys-label-large);
    }
  `,
})
export class TopBar {
  readonly #currentUser = inject(CurrentUserService);
  protected readonly user = this.#currentUser.user;
}
