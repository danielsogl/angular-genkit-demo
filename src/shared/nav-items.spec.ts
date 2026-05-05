import { describe, expect, it } from 'vitest';

import { NAV_ITEMS, buildNavigateToolDescription, navigationTargets } from './nav-items';

describe('Advisor chat exposes a navigate tool whose target enum is derived from NAV_ITEMS', () => {
  it('Scenario: Single declarative source drives routes, sidenav, and tool', () => {
    // Given NAV_ITEMS is the framework-free single source of truth
    // When the constant is inspected
    // Then it is a non-empty tuple with a stable structure
    expect(NAV_ITEMS.length).toBeGreaterThan(0);
    for (const item of NAV_ITEMS) {
      expect(typeof item.route).toBe('string');
      expect(typeof item.label).toBe('string');
      expect(item.label.length).toBeGreaterThan(0);
      expect(typeof item.icon).toBe('string');
      expect(item.icon.length).toBeGreaterThan(0);
      expect(Array.isArray(item.aliases)).toBe(true);
      expect(item.aliases.length).toBeGreaterThan(0);
    }

    // And navigationTargets matches NAV_ITEMS one-to-one
    expect(navigationTargets).toEqual(NAV_ITEMS.map((item) => item.route));
  });

  it('Scenario: Tool description lists each section label and at least one alias', () => {
    // Given the helper that composes the German tool description
    // When invoked with NAV_ITEMS
    const description = buildNavigateToolDescription(NAV_ITEMS);
    // Then it mentions every label and at least one alias for each item
    for (const item of NAV_ITEMS) {
      expect(description).toContain(item.label);
      const mentionedAlias = item.aliases.some((alias) => description.includes(alias));
      expect(mentionedAlias).toBe(true);
    }
    // And it instructs the model to use the German navigation verbs
    expect(description).toMatch(/öffne/i);
    expect(description).toMatch(/zeige/i);
    expect(description).toMatch(/gehe zu/i);
    expect(description).toMatch(/navigiere/i);
  });
});
