import { Injectable, signal } from '@angular/core';

import { User } from './user';

const MOCK_USER: User = {
  id: '1',
  name: 'Daniel Sogl',
  email: 'daniel.sogl@thinktecture.com',
  initials: 'DS',
};

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  readonly #user = signal<User | null>(MOCK_USER);
  readonly user = this.#user.asReadonly();
}
