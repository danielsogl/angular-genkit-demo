import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import { Then } from './fixtures';

Then(
  'AXE reports no {string} or {string} violations',
  async ({ page }, first: string, second: string) => {
    const impacts = [first, second];
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((v) => impacts.includes(v.impact ?? ''));
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  },
);
