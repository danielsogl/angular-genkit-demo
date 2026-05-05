import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import type { Customer } from '../../shared/customer';
import { CustomerStore } from './customer-store';
import { KundenaktePage } from './kundenakte-page';

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
  advisorNotes: 'Erfahrene Anlegerin.',
  products: [{ name: 'DWS Top Dividende', category: 'Aktienfonds', value: 78_200 }],
};

describe('KundenaktePage', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('Page renders the page heading and reacts to the store', () => {
    it('Scenario: Empty state shows the page heading and guidance', () => {
      const fixture = TestBed.createComponent(KundenaktePage);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('h1')?.textContent).toBe('Kundenakte');
      expect(root.querySelector('.kundenakte__empty')?.textContent).toMatch(/Wählen Sie oben/);
      expect(root.querySelector('article')).toBeNull();
    });

    it('Scenario: Loaded customer is rendered with name, depot, and products', () => {
      TestBed.inject(CustomerStore).setCurrent(SAMPLE);
      const fixture = TestBed.createComponent(KundenaktePage);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('h1')?.textContent).toBe('Kundenakte');
      expect(root.querySelector('#customer-name')?.textContent).toBe('Anna Müller');
      expect(root.querySelector('[data-testid="depot-value"]')?.textContent?.trim()).toBe(
        '185.400 €',
      );
      expect(root.querySelector('.kundenakte__products li')?.textContent).toMatch(/DWS Top/);
    });
  });

  describe('Picker lets the advisor select a customer directly', () => {
    it('Scenario: Picker lists every fake customer', () => {
      const fixture = TestBed.createComponent(KundenaktePage);
      fixture.detectChanges();
      const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.kundenakte__picker-button',
      );
      expect(buttons.length).toBeGreaterThanOrEqual(2);
      const labels = Array.from(buttons).map((b) => b.textContent?.trim() ?? '');
      expect(labels.some((l) => l.includes('Anna Müller'))).toBe(true);
      expect(labels.some((l) => l.includes('Bernd Schmidt'))).toBe(true);
    });

    it('Scenario: Clicking a picker entry stores the customer and marks it pressed', () => {
      const fixture = TestBed.createComponent(KundenaktePage);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const buttons = root.querySelectorAll<HTMLButtonElement>('.kundenakte__picker-button');
      const target = Array.from(buttons).find((b) => b.textContent?.includes('Anna Müller'));
      expect(target).toBeDefined();
      target!.click();
      fixture.detectChanges();
      const store = TestBed.inject(CustomerStore);
      expect(store.currentCustomerId()).toBe('c-001');
      expect(target!.getAttribute('aria-pressed')).toBe('true');
      expect(root.querySelector('#customer-name')?.textContent).toBe('Anna Müller');
    });
  });
});
