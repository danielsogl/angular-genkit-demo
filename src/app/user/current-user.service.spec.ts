import { TestBed } from '@angular/core/testing';

import { CurrentUserService } from './current-user.service';

describe('CurrentUserService', () => {
  describe('Current user is exposed as a signal', () => {
    it('Scenario: Service is a singleton', () => {
      // Given the service is injected twice
      const a = TestBed.inject(CurrentUserService);
      const b = TestBed.inject(CurrentUserService);
      // When both consumers read the user signal
      // Then they observe the same instance and the same value
      expect(a).toBe(b);
      expect(a.user()).toBe(b.user());
    });

    it('Scenario: Signal is read-only to consumers', () => {
      // Given a consumer accessing the user signal
      const service = TestBed.inject(CurrentUserService);
      // When inspecting the signal API
      // Then it has no `set` or `update` method exposed publicly
      const accessor = service.user as unknown as Record<string, unknown>;
      expect(typeof accessor['set']).toBe('undefined');
      expect(typeof accessor['update']).toBe('undefined');
    });
  });

  describe('User type defines display fields', () => {
    it('Scenario: Required fields are present on the mock user', () => {
      // Given the service returns a user
      const user = TestBed.inject(CurrentUserService).user();
      // Then the required fields are non-empty strings
      expect(user).not.toBeNull();
      expect(user?.id).toMatch(/.+/);
      expect(user?.name).toMatch(/.+/);
      expect(user?.email).toMatch(/.+@.+/);
      expect(user?.initials).toMatch(/.+/);
    });
  });

  describe('Mock user is provided for now', () => {
    it('Scenario: Mock user is returned on first read', () => {
      // Given a fresh injector
      // When the user is read
      const user = TestBed.inject(CurrentUserService).user();
      // Then the mock user with deterministic fields is returned
      expect(user).toEqual({
        id: '1',
        name: 'Daniel Sogl',
        email: 'daniel.sogl@thinktecture.com',
        initials: 'DS',
      });
    });

    it('Scenario: Implementation is replaceable in place', () => {
      // Given consumers depend only on the Signal<User | null> shape
      const service = TestBed.inject(CurrentUserService);
      // When inspecting the public surface
      const surface = Object.keys(service).filter((key) => !key.startsWith('#'));
      // Then only the `user` signal is exposed
      expect(surface).toEqual(['user']);
      expect(typeof service.user).toBe('function');
    });
  });
});
