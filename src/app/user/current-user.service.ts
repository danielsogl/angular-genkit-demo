import { Injectable, signal } from '@angular/core';

import { User } from './user';

const MOCK_USER: User = {
  id: '1',
  name: 'Daniel Sogl',
  email: 'daniel.sogl@thinktecture.com',
  initials: 'DS',
};

const initialUser = (): User | null => {
  if (typeof window === 'undefined') {
    return MOCK_USER;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get('mockUser') === 'none' ? null : MOCK_USER;
};

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  readonly #user = signal<User | null>(initialUser());
  readonly user = this.#user.asReadonly();
}
