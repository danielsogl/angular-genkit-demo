import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CurrentUserService } from '../../user/current-user.service';
import { TopBar } from './top-bar';
import { User } from '../../user/user';

class FakeCurrentUserService {
  readonly #user = signal<User | null>(null);
  readonly user = this.#user.asReadonly();
  setUser(user: User | null): void {
    this.#user.set(user);
  }
}

const setup = (initialUser: User | null) => {
  const fakeService = new FakeCurrentUserService();
  fakeService.setUser(initialUser);
  TestBed.configureTestingModule({
    providers: [{ provide: CurrentUserService, useValue: fakeService }],
  });
  const fixture = TestBed.createComponent(TopBar);
  fixture.detectChanges();
  return { fixture, fakeService };
};

describe('TopBar', () => {
  describe('Top bar shows current user and theme switcher', () => {
    it('Scenario: Authenticated user is displayed', () => {
      // Given a non-null current user
      const user: User = {
        id: '42',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        initials: 'AL',
      };
      const { fixture } = setup(user);
      const root = fixture.nativeElement as HTMLElement;
      // Then the name and avatar with accessible label are rendered
      const name = root.querySelector('[data-testid="current-user-name"]');
      const avatar = root.querySelector('[data-testid="current-user-avatar"]');
      expect(name?.textContent?.trim()).toBe('Ada Lovelace');
      expect(avatar?.textContent?.trim()).toBe('AL');
      expect(avatar?.getAttribute('aria-label')).toContain('Ada Lovelace');
    });

    it('Scenario: No user available', () => {
      // Given the current user is null
      const { fixture } = setup(null);
      const root = fixture.nativeElement as HTMLElement;
      // Then neither the name nor avatar render
      expect(root.querySelector('[data-testid="current-user-name"]')).toBeNull();
      expect(root.querySelector('[data-testid="current-user-avatar"]')).toBeNull();
      // And the theme switcher remains reachable
      expect(root.querySelector('app-theme-switcher')).not.toBeNull();
    });

    it('Scenario: Theme switcher is reachable via keyboard', () => {
      // Given a current user is rendered
      const user: User = {
        id: '1',
        name: 'Daniel Sogl',
        email: 'daniel.sogl@thinktecture.com',
        initials: 'DS',
      };
      const { fixture } = setup(user);
      const root = fixture.nativeElement as HTMLElement;
      // Then the theme switcher is present and its trigger is a focusable button
      const switcher = root.querySelector('app-theme-switcher');
      expect(switcher).not.toBeNull();
      const trigger = switcher?.querySelector('button');
      expect(trigger).not.toBeNull();
      expect((trigger as HTMLButtonElement).disabled).toBe(false);
    });
  });
});
