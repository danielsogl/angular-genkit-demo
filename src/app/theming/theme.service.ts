import {
  afterNextRender,
  computed,
  Injectable,
  PLATFORM_ID,
  Signal,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Mode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme-mode';
const DARK_CLASS = 'dark-mode';
const DARK_QUERY = '(prefers-color-scheme: dark)';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly #platformId = inject(PLATFORM_ID);
  readonly #isBrowser = isPlatformBrowser(this.#platformId);

  readonly #mode = signal<Mode>('system');
  readonly #systemPrefersDark = signal(false);

  readonly mode: Signal<Mode> = this.#mode.asReadonly();
  readonly resolvedMode = computed<'light' | 'dark'>(() => {
    const mode = this.#mode();
    if (mode === 'system') {
      return this.#systemPrefersDark() ? 'dark' : 'light';
    }
    return mode;
  });

  constructor() {
    afterNextRender(() => {
      const stored = this.#readStoredMode();
      if (stored) {
        this.#mode.set(stored);
      }

      const media = window.matchMedia(DARK_QUERY);
      this.#systemPrefersDark.set(media.matches);
      media.addEventListener('change', (event) => {
        this.#systemPrefersDark.set(event.matches);
        this.#applyDarkClass();
      });

      this.#applyDarkClass();
    });
  }

  setMode(mode: Mode): void {
    this.#mode.set(mode);
    if (!this.#isBrowser) {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, mode);
    this.#applyDarkClass();
  }

  #readStoredMode(): Mode | null {
    if (!this.#isBrowser) {
      return null;
    }
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark' || value === 'system') {
      return value;
    }
    return null;
  }

  #applyDarkClass(): void {
    if (!this.#isBrowser) {
      return;
    }
    const root = document.documentElement;
    if (this.resolvedMode() === 'dark') {
      root.classList.add(DARK_CLASS);
    } else {
      root.classList.remove(DARK_CLASS);
    }
  }
}
