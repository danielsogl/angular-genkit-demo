import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import type { Customer } from '../../shared/customer';
import { CustomerStore } from './customer-store';

const SAMPLE: Customer = {
  id: 'c-001',
  firstName: 'Anna',
  lastName: 'Müller',
  age: 43,
  email: 'anna.mueller@example.de',
  phone: '+49 30 1234567',
  address: 'Beethovenstraße 12, 10117 Berlin',
  riskProfile: 4,
  depotValue: 185_400,
  lastContact: '2026-04-12',
  advisorNotes: 'Notiz',
  products: [],
};

describe('CustomerStore', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('Store exposes the currently loaded customer as a signal', () => {
    it('Scenario: Initial state has no customer', () => {
      const store = TestBed.inject(CustomerStore);
      expect(store.currentCustomer()).toBeNull();
      expect(store.currentCustomerId()).toBeNull();
    });

    it('Scenario: setCurrent stores the customer and exposes its id', () => {
      const store = TestBed.inject(CustomerStore);
      store.setCurrent(SAMPLE);
      expect(store.currentCustomer()).toBe(SAMPLE);
      expect(store.currentCustomerId()).toBe('c-001');
    });

    it('Scenario: clear resets the store', () => {
      const store = TestBed.inject(CustomerStore);
      store.setCurrent(SAMPLE);
      store.clear();
      expect(store.currentCustomer()).toBeNull();
      expect(store.currentCustomerId()).toBeNull();
    });
  });
});
