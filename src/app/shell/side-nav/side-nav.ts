import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { NAV_ITEMS } from '../nav-items';

@Component({
  selector: 'app-side-nav',
  imports: [MatIconModule, MatListModule, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './side-nav.html',
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    nav {
      display: block;
      padding: 0.5rem 0;
    }

    a {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      color: var(--mat-sys-on-surface);
      text-decoration: none;
      border-radius: 9999px;
      margin: 0.125rem 0.5rem;
    }

    a:hover {
      background: var(--mat-sys-surface-container);
    }

    a.active {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }

    a.active:focus-visible,
    a:focus-visible {
      outline: 2px solid var(--mat-sys-primary);
      outline-offset: 2px;
    }

    :host(.collapsed) .label {
      display: none;
    }

    :host(.collapsed) a {
      justify-content: center;
      margin: 0.125rem 0.5rem;
      padding: 0.75rem;
    }
  `,
  host: {
    '[class.collapsed]': 'collapsed()',
  },
})
export class SideNav {
  readonly collapsed = input<boolean>(false);
  protected readonly items = NAV_ITEMS;
}
