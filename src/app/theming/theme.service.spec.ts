import { ApplicationRef, PLATFORM_ID, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

type MediaQueryHandler = (event: { matches: boolean }) => void;

class FakeMediaQueryList {
  matches = false;
  readonly listeners = new Set<MediaQueryHandler>();
  addEventListener(_type: 'change', handler: MediaQueryHandler): void {
    this.listeners.add(handler);
  }
  removeEventListener(_type: 'change', handler: MediaQueryHandler): void {
    this.listeners.delete(handler);
  }
  fire(matches: boolean): void {
    this.matches = matches;
    for (const listener of this.listeners) {
      listener({ matches });
    }
  }
}

const flushAfterRender = async () => {
  await TestBed.inject(ApplicationRef).whenStable();
};

describe('ThemeService', () => {
  let mediaList: FakeMediaQueryList;
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    mediaList = new FakeMediaQueryList();
    originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => {
      if (query === '(prefers-color-scheme: dark)') {
        return mediaList as unknown as MediaQueryList;
      }
      const noop = () => undefined;
      return {
        matches: false,
        addEventListener: noop,
        removeEventListener: noop,
      } as unknown as MediaQueryList;
    }) as typeof window.matchMedia;
    window.localStorage.clear();
    document.documentElement.classList.remove('dark-mode');
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    window.localStorage.clear();
    document.documentElement.classList.remove('dark-mode');
  });

  describe('Theme selection is persisted across reloads', () => {
    it('Scenario: First visit defaults to system', async () => {
      // Given no value is stored in localStorage
      // When the service is instantiated
      const service = TestBed.inject(ThemeService);
      await flushAfterRender();
      // Then the default mode is system
      expect(service.mode()).toBe('system');
    });

    it('Scenario: Selection survives reload', async () => {
      // Given the user has previously selected dark
      window.localStorage.setItem('theme-mode', 'dark');
      // When the service initializes (simulating a reload)
      const service = TestBed.inject(ThemeService);
      await flushAfterRender();
      // Then the resolved mode is dark and the dark-mode class is applied
      expect(service.mode()).toBe('dark');
      expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
    });
  });

  describe('Theme switcher exposes light, dark, and system modes', () => {
    it('Scenario: User selects dark mode', async () => {
      // Given the service is ready
      const service = TestBed.inject(ThemeService);
      await flushAfterRender();
      // When the user picks dark
      service.setMode('dark');
      // Then the dark-mode class is on html and the choice is persisted
      expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
      expect(window.localStorage.getItem('theme-mode')).toBe('dark');
      expect(service.mode()).toBe('dark');
    });

    it('Scenario: User selects light mode', async () => {
      // Given dark mode is currently active
      const service = TestBed.inject(ThemeService);
      await flushAfterRender();
      service.setMode('dark');
      // When the user picks light
      service.setMode('light');
      // Then the dark-mode class is removed and the choice is persisted
      expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
      expect(window.localStorage.getItem('theme-mode')).toBe('light');
      expect(service.mode()).toBe('light');
    });

    it('Scenario: User selects system mode and OS prefers dark', async () => {
      // Given the OS prefers dark
      mediaList.matches = true;
      const service = TestBed.inject(ThemeService);
      await flushAfterRender();
      // When the user selects system
      service.setMode('system');
      // Then the html element carries the dark-mode class
      expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
      expect(service.mode()).toBe('system');
    });

    it('Scenario: System mode reacts to live OS changes', async () => {
      // Given the active mode is system and the OS prefers light
      mediaList.matches = false;
      const service = TestBed.inject(ThemeService);
      await flushAfterRender();
      service.setMode('system');
      expect(document.documentElement.classList.contains('dark-mode')).toBe(false);
      // When the OS color-scheme preference flips to dark
      mediaList.fire(true);
      // Then the dark-mode class is applied without a reload
      expect(document.documentElement.classList.contains('dark-mode')).toBe(true);
    });
  });

  describe('Theme service is SSR-safe', () => {
    it('Scenario: Server render does not touch browser globals', () => {
      // Given the service is instantiated under the server platform
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      // When the service is created without invoking afterNextRender
      const create = () =>
        runInInjectionContext(TestBed.inject(ApplicationRef).injector, () =>
          TestBed.inject(ThemeService),
        );
      // Then construction does not throw and the default mode is system
      expect(create).not.toThrow();
      expect(create().mode()).toBe('system');
    });
  });
});
