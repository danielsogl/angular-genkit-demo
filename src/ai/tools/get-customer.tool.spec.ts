import { describe, expect, it } from 'vitest';

import { getCustomerHandler } from './get-customer.tool.handler';
import { GetCustomerInputSchema } from './get-customer.tool.schema';

describe('getCustomer tool', () => {
  describe('Input schema enforces id-or-query', () => {
    it('Scenario: Empty input is rejected', () => {
      const result = GetCustomerInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('Scenario: Either id or query alone is accepted', () => {
      expect(GetCustomerInputSchema.safeParse({ id: 'c-001' }).success).toBe(true);
      expect(GetCustomerInputSchema.safeParse({ query: 'Müller' }).success).toBe(true);
    });
  });

  describe('Tool resolves customers from the fake dataset', () => {
    it('Scenario: Lookup by ID returns full customer record', async () => {
      const customer = await getCustomerHandler({ id: 'c-002' });
      expect(customer.lastName).toBe('Schmidt');
      expect(customer.products.length).toBeGreaterThan(0);
    });

    it('Scenario: Lookup by unique name returns the customer', async () => {
      const customer = await getCustomerHandler({ query: 'Weber' });
      expect(customer.id).toBe('c-003');
    });

    it('Scenario: Unknown id throws a German error', async () => {
      await expect(getCustomerHandler({ id: 'c-999' })).rejects.toThrow(/Kein Kunde mit ID/);
    });

    it('Scenario: Unknown query throws a German error', async () => {
      await expect(getCustomerHandler({ query: 'Mustermann' })).rejects.toThrow(/Kein Kunde passt/);
    });
  });
});
