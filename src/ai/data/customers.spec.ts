import { describe, expect, it } from 'vitest';

import {
  FAKE_CUSTOMERS,
  findCustomersByQuery,
  getCustomerById,
  listCustomerSummaries,
} from './customers';

describe('FAKE_CUSTOMERS dataset', () => {
  describe('Customer dataset is non-empty and uniquely keyed', () => {
    it('Scenario: Dataset has at least one customer', () => {
      expect(FAKE_CUSTOMERS.length).toBeGreaterThanOrEqual(1);
    });

    it('Scenario: All customer IDs are unique', () => {
      const ids = FAKE_CUSTOMERS.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('getCustomerById resolves customers by primary key', () => {
    it('Scenario: Known ID returns the matching customer', () => {
      const result = getCustomerById('c-001');
      expect(result?.lastName).toBe('Müller');
    });

    it('Scenario: Unknown ID returns undefined', () => {
      expect(getCustomerById('does-not-exist')).toBeUndefined();
    });
  });

  describe('findCustomersByQuery searches case-insensitively across name fields', () => {
    it('Scenario: Empty query returns the full dataset', () => {
      expect(findCustomersByQuery('')).toEqual(FAKE_CUSTOMERS);
    });

    it('Scenario: Last name match (case-insensitive) returns one customer', () => {
      const result = findCustomersByQuery('müller');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c-001');
    });

    it('Scenario: First name match returns one customer', () => {
      const result = findCustomersByQuery('Bernd');
      expect(result).toHaveLength(1);
      expect(result[0].lastName).toBe('Schmidt');
    });

    it('Scenario: Unknown name returns empty', () => {
      expect(findCustomersByQuery('Mustermann')).toEqual([]);
    });
  });

  describe('listCustomerSummaries produces compact summaries', () => {
    it('Scenario: Without query, returns one summary per customer', () => {
      const summaries = listCustomerSummaries();
      expect(summaries).toHaveLength(FAKE_CUSTOMERS.length);
      expect(summaries[0]).toMatchObject({ id: 'c-001', name: 'Anna Müller' });
      expect(summaries[0].shortInfo).toMatch(/Risikoklasse/);
    });

    it('Scenario: With query, returns only matches', () => {
      const summaries = listCustomerSummaries('weber');
      expect(summaries).toHaveLength(1);
      expect(summaries[0].name).toBe('Carla Weber');
    });
  });
});
