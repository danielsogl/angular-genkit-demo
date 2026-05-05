import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { Mode, ThemeService } from '../theme.service';

interface ModeOption {
  readonly value: Mode;
  readonly label: string;
  readonly icon: string;
}

const MODE_OPTIONS: readonly ModeOption[] = [
  { value: 'light', label: 'Light', icon: 'light_mode' },
  { value: 'dark', label: 'Dark', icon: 'dark_mode' },
  { value: 'system', label: 'System', icon: 'settings_brightness' },
];

@Component({
  selector: 'app-theme-switcher',
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      mat-icon-button
      type="button"
      [attr.aria-label]="triggerLabel()"
      [matMenuTriggerFor]="menu"
    >
      <mat-icon>{{ activeOption().icon }}</mat-icon>
    </button>
    <mat-menu #menu="matMenu">
      @for (option of options; track option.value) {
        <button
          mat-menu-item
          type="button"
          role="menuitemradio"
          [attr.aria-checked]="option.value === mode()"
          [attr.aria-label]="option.label"
          (click)="select(option.value)"
        >
          <mat-icon>{{ option.icon }}</mat-icon>
          <span>{{ option.label }}</span>
        </button>
      }
    </mat-menu>
  `,
})
export class ThemeSwitcher {
  readonly #theme = inject(ThemeService);

  protected readonly options = MODE_OPTIONS;
  protected readonly mode = this.#theme.mode;
  protected readonly activeOption = computed(
    () => MODE_OPTIONS.find((option) => option.value === this.mode()) ?? MODE_OPTIONS[2],
  );
  protected readonly triggerLabel = computed(
    () => `Theme: ${this.activeOption().label.toLowerCase()}`,
  );

  protected select(mode: Mode): void {
    this.#theme.setMode(mode);
  }
}
