import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { FAKE_CUSTOMERS } from '../../ai/data/customers';
import type { Customer } from '../../shared/customer';
import { CustomerStore } from './customer-store';

@Component({
  selector: 'app-kundenakte-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kundenakte-page.html',
  styleUrl: './kundenakte-page.scss',
})
export class KundenaktePage {
  readonly #store = inject(CustomerStore);

  protected readonly customers = FAKE_CUSTOMERS;
  protected readonly customer = this.#store.currentCustomer;

  protected readonly fullName = computed(() => {
    const c = this.customer();
    return c ? `${c.firstName} ${c.lastName}` : '';
  });

  protected readonly depotFormatted = computed(() => {
    const c = this.customer();
    return c ? c.depotValue.toLocaleString('de-DE') + ' €' : '';
  });

  protected readonly currentId = computed(() => this.customer()?.id ?? null);

  protected formatProductValue(value: number): string {
    return value.toLocaleString('de-DE') + ' €';
  }

  protected pick(customer: Customer): void {
    this.#store.setCurrent(customer);
  }
}
