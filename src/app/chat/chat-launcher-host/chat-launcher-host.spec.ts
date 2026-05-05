import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ChatLauncherHost } from './chat-launcher-host';

const flush = async () => {
  await TestBed.inject(ApplicationRef).whenStable();
};

const setup = async () => {
  const fixture = TestBed.createComponent(ChatLauncherHost);
  fixture.detectChanges();
  await flush();
  return fixture;
};

const queryFab = (root: HTMLElement): HTMLButtonElement | null =>
  root.querySelector<HTMLButtonElement>('button.chat-launcher-fab');

const queryDialog = (root: HTMLElement): HTMLElement | null =>
  root.querySelector<HTMLElement>('[role="dialog"]');

const queryInput = (root: HTMLElement): HTMLInputElement | null =>
  root.querySelector<HTMLInputElement>('input.chat-panel__input');

describe('ChatLauncherHost', () => {
  describe('Floating launcher is reachable from every routed view', () => {
    it('Scenario: FAB is present on the default route', async () => {
      // Given the host renders inside the dashboard shell
      const fixture = await setup();
      const root = fixture.nativeElement as HTMLElement;
      // When the FAB is queried
      const fab = queryFab(root);
      // Then a single FAB with a German accessible name is present
      expect(fab).not.toBeNull();
      expect(root.querySelectorAll('button.chat-launcher-fab').length).toBe(1);
      expect(fab?.getAttribute('aria-label')).toBe('Assistent öffnen');
    });
  });

  describe('Chat panel opens and closes from the launcher', () => {
    it('Scenario: Panel opens on FAB activation', async () => {
      // Given the panel is closed
      const fixture = await setup();
      const root = fixture.nativeElement as HTMLElement;
      const fab = queryFab(root)!;
      expect(fab.getAttribute('aria-expanded')).toBe('false');
      expect(queryDialog(root)).toBeNull();
      // When the advisor activates the FAB
      fab.click();
      fixture.detectChanges();
      await flush();
      // Then the panel is rendered, aria-expanded toggles, and an input exists
      expect(queryDialog(root)).not.toBeNull();
      expect(fab.getAttribute('aria-expanded')).toBe('true');
      expect(queryInput(root)).not.toBeNull();
    });

    it('Scenario: Panel closes on FAB activation', async () => {
      // Given the panel is open
      const fixture = await setup();
      const root = fixture.nativeElement as HTMLElement;
      const fab = queryFab(root)!;
      fab.click();
      fixture.detectChanges();
      await flush();
      expect(queryDialog(root)).not.toBeNull();
      // When the advisor activates the FAB again
      fab.click();
      fixture.detectChanges();
      await flush();
      // Then the panel is gone and aria-expanded is false
      expect(queryDialog(root)).toBeNull();
      expect(fab.getAttribute('aria-expanded')).toBe('false');
    });

    it('Scenario: Panel close via Escape', async () => {
      // Given the panel is open
      const fixture = await setup();
      const root = fixture.nativeElement as HTMLElement;
      queryFab(root)!.click();
      fixture.detectChanges();
      await flush();
      const dialog = queryDialog(root)!;
      expect(dialog).not.toBeNull();
      // When Escape is pressed inside the dialog
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      await flush();
      // Then the panel closes
      expect(queryDialog(root)).toBeNull();
    });
  });
});
