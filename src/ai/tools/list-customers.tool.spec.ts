import { describe, expect, it } from 'vitest';

import { FAKE_CUSTOMERS } from '../data/customers';
import { listCustomersHandler } from './list-customers.tool.handler';

describe('listCustomers tool', () => {
  describe('Tool returns advisor customer summaries', () => {
    it('Scenario: No query returns the full list with id+name+shortInfo', async () => {
      const output = await listCustomersHandler({});
      expect(output.customers).toHaveLength(FAKE_CUSTOMERS.length);
      for (const summary of output.customers) {
        expect(summary).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          shortInfo: expect.any(String),
        });
      }
    });

    it('Scenario: Query filters customers by name', async () => {
      const output = await listCustomersHandler({ query: 'becker' });
      expect(output.customers).toHaveLength(1);
      expect(output.customers[0].name).toBe('Dieter Becker');
    });

    it('Scenario: Query without matches returns empty array', async () => {
      const output = await listCustomersHandler({ query: 'mustermann' });
      expect(output.customers).toEqual([]);
    });
  });
});
