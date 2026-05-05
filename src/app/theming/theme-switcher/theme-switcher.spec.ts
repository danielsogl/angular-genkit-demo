import { TestBed } from '@angular/core/testing';

import { ThemeSwitcher } from './theme-switcher';
import { ThemeService } from '../theme.service';

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark-mode');
  });

  describe('Theme switcher exposes light, dark, and system modes', () => {
    it('Scenario: User selects dark mode', async () => {
      // Given the switcher is rendered
      const fixture = TestBed.createComponent(ThemeSwitcher);
      fixture.detectChanges();
      const trigger = fixture.nativeElement.querySelector(
        'button[aria-label]',
      ) as HTMLButtonElement;
      // When the user opens the menu and clicks dark
      trigger.click();
      fixture.detectChanges();
      const menu = document.querySelector('.mat-mdc-menu-panel');
      const items = menu?.querySelectorAll('button[role="menuitemradio"]');
      const darkItem = Array.from(items ?? []).find(
        (el) => el.getAttribute('aria-label') === 'Dark',
      ) as HTMLButtonElement | undefined;
      darkItem?.click();
      fixture.detectChanges();
      // Then the service is updated and the trigger label reflects dark mode
      expect(TestBed.inject(ThemeService).mode()).toBe('dark');
      expect(trigger.getAttribute('aria-label')).toMatch(/dark/i);
    });

    it('Scenario: User selects system mode', async () => {
      // Given the switcher is rendered
      const fixture = TestBed.createComponent(ThemeSwitcher);
      fixture.detectChanges();
      const trigger = fixture.nativeElement.querySelector(
        'button[aria-label]',
      ) as HTMLButtonElement;
      // When the user opens the menu and clicks system
      trigger.click();
      fixture.detectChanges();
      const items = document.querySelectorAll('button[role="menuitemradio"]');
      const systemItem = Array.from(items).find(
        (el) => el.getAttribute('aria-label') === 'System',
      ) as HTMLButtonElement | undefined;
      systemItem?.click();
      fixture.detectChanges();
      // Then the service mode is system
      expect(TestBed.inject(ThemeService).mode()).toBe('system');
    });
  });

  describe('Active mode is announced to assistive technology', () => {
    it('Scenario: Active option is marked aria-checked', async () => {
      // Given the user has selected light mode
      const fixture = TestBed.createComponent(ThemeSwitcher);
      fixture.detectChanges();
      TestBed.inject(ThemeService).setMode('light');
      fixture.detectChanges();
      const trigger = fixture.nativeElement.querySelector(
        'button[aria-label]',
      ) as HTMLButtonElement;
      // When the menu is opened
      trigger.click();
      fixture.detectChanges();
      // Then exactly the light item is aria-checked
      const items = Array.from(
        document.querySelectorAll<HTMLButtonElement>('button[role="menuitemradio"]'),
      );
      const checked = items.filter((el) => el.getAttribute('aria-checked') === 'true');
      expect(checked).toHaveLength(1);
      expect(checked[0].getAttribute('aria-label')).toBe('Light');
    });
  });
});
