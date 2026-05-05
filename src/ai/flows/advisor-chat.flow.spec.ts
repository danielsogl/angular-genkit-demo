import { describe, expect, it } from 'vitest';

import { ADVISOR_SYSTEM_PROMPT } from '../advisor-system-prompt';
import { ChatTurnRequestSchema } from './advisor-chat-schema';

describe('advisorChatFlow', () => {
  describe('Bot replies in German with a financial-advisor tone', () => {
    it('Scenario: System prompt mandates German output', () => {
      // Given the exported system prompt
      const prompt = ADVISOR_SYSTEM_PROMPT;
      // Then it requires German output, formal Sie, and Finanzberater tone
      expect(prompt).toMatch(/respond in German|always.*German/i);
      expect(prompt).toMatch(/Sie-Form|Sie-form|"Sie"/);
      expect(prompt.toLowerCase()).toContain('financial advisor');
      expect(prompt.toLowerCase()).toMatch(/finanzberater/);
    });
  });

  describe('Chat flow is exposed via the SSR Express server', () => {
    it('Scenario: Flow input contract is enforced by Zod schema', () => {
      // Given a body missing the `message` field
      const result = ChatTurnRequestSchema.safeParse({
        userName: 'Daniel',
        history: [],
      });
      // Then validation fails
      expect(result.success).toBe(false);
    });

    it('Scenario: Empty message is rejected by the schema', () => {
      // Given an empty message
      const result = ChatTurnRequestSchema.safeParse({
        userName: 'Daniel',
        history: [],
        message: '',
      });
      // Then validation fails
      expect(result.success).toBe(false);
    });

    it('Scenario: Valid input passes validation', () => {
      // Given a well-formed body
      const result = ChatTurnRequestSchema.safeParse({
        userName: 'Daniel',
        history: [{ role: 'user', content: 'Hallo' }],
        message: 'Wie geht es?',
      });
      // Then it parses successfully
      expect(result.success).toBe(true);
    });
  });
});
