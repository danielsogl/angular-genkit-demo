import { Injectable, computed, signal } from '@angular/core';

import type { Customer } from '../../shared/customer';

@Injectable({ providedIn: 'root' })
export class CustomerStore {
  readonly #current = signal<Customer | null>(null);

  readonly currentCustomer = this.#current.asReadonly();
  readonly currentCustomerId = computed(() => this.#current()?.id ?? null);

  setCurrent(customer: Customer): void {
    this.#current.set(customer);
  }

  clear(): void {
    this.#current.set(null);
  }
}
