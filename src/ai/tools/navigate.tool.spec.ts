import { describe, expect, it } from 'vitest';

import { NAV_ITEMS } from '../../shared/nav-items';
import {
  NAVIGATE_TOOL_DESCRIPTION,
  NavigateToolInputSchema,
  NavigateToolOutputSchema,
} from './navigate.tool.schema';

describe('Advisor chat exposes a navigate tool whose target enum is derived from NAV_ITEMS', () => {
  it('Scenario: Tool input schema accepts every NAV_ITEMS route', () => {
    // Given the navigate tool's input schema
    for (const item of NAV_ITEMS) {
      // When parsing an input with that item's route as target
      const result = NavigateToolInputSchema.safeParse({ target: item.route });
      // Then it is accepted
      expect(result.success).toBe(true);
    }
  });

  it('Scenario: Tool input schema rejects an unknown target', () => {
    // Given a typo or value not in NAV_ITEMS.map(i => i.route)
    const result = NavigateToolInputSchema.safeParse({ target: 'einstellung' });
    const otherResult = NavigateToolInputSchema.safeParse({ target: 'profile' });
    // Then Zod validation rejects the call before any side effect
    expect(result.success).toBe(false);
    expect(otherResult.success).toBe(false);
  });

  it('Scenario: Tool description lists each section label and aliases', () => {
    // Given the exported description string
    const description = NAVIGATE_TOOL_DESCRIPTION;
    // Then for every NAV_ITEMS entry it contains the label and at least one alias
    for (const item of NAV_ITEMS) {
      expect(description).toContain(item.label);
      const mentioned = item.aliases.some((alias) => description.includes(alias));
      expect(mentioned).toBe(true);
    }
    // And it instructs the model to react to the canonical German verbs
    expect(description).toMatch(/öffne/i);
    expect(description).toMatch(/zeige/i);
    expect(description).toMatch(/gehe zu/i);
    expect(description).toMatch(/navigiere/i);
  });

  it('Scenario: Tool output schema mirrors the input enum', () => {
    // Given the output schema
    for (const item of NAV_ITEMS) {
      // When parsing the canonical handler ack for that route
      const result = NavigateToolOutputSchema.safeParse({
        navigated: true,
        target: item.route,
      });
      // Then it accepts every valid target alongside the literal flag
      expect(result.success).toBe(true);
    }
    // And it rejects an unknown target
    const bad = NavigateToolOutputSchema.safeParse({
      navigated: true,
      target: 'einstellung',
    });
    expect(bad.success).toBe(false);
  });
});
