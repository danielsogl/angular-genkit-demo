import { describe, expect, it } from 'vitest';

import { ADVISOR_SYSTEM_PROMPT } from '../advisor-system-prompt';
import {
  buildCustomerPreamble,
  buildSystemPreamble,
  buildUserPreamble,
} from './advisor-chat.preamble';

describe('buildSystemPreamble', () => {
  describe('User preamble adapts to authenticated state', () => {
    it('Scenario: Authenticated advisor is addressed by name', () => {
      expect(buildUserPreamble('Daniel Sogl')).toContain('Daniel Sogl');
    });

    it('Scenario: Anonymous advisor uses a neutral salutation hint', () => {
      expect(buildUserPreamble(null)).toMatch(/neutral German salutation/i);
    });
  });

  describe('Customer preamble decides between full-load and brief reminder', () => {
    it('Scenario: No customer selected announces empty context', () => {
      const text = buildCustomerPreamble({ currentCustomerId: null, loadCustomer: false });
      expect(text).toMatch(/keine Kundenakte/);
    });

    it('Scenario: loadCustomer=true embeds the full customer JSON', () => {
      const text = buildCustomerPreamble({ currentCustomerId: 'c-001', loadCustomer: true });
      expect(text).toContain('KUNDE_KONTEXT_JSON');
      expect(text).toContain('"id": "c-001"');
      expect(text).toContain('"lastName": "Müller"');
      expect(text).toMatch(/geöffnet bzw. gewechselt/);
    });

    it('Scenario: loadCustomer=false sends only a short reminder', () => {
      const text = buildCustomerPreamble({ currentCustomerId: 'c-001', loadCustomer: false });
      expect(text).not.toContain('KUNDE_KONTEXT_JSON');
      expect(text).toMatch(/Anna Müller/);
      expect(text).toMatch(/aktuell die Kundenakte/);
    });

    it('Scenario: Unknown customer id surfaces a clarification request', () => {
      const text = buildCustomerPreamble({ currentCustomerId: 'c-zzz', loadCustomer: true });
      expect(text).toMatch(/kein passender Kunde/);
    });
  });

  describe('System preamble composes the system prompt with the user and customer sections', () => {
    it('Scenario: Output begins with the advisor system prompt', () => {
      const text = buildSystemPreamble(ADVISOR_SYSTEM_PROMPT, {
        userName: 'Daniel',
        currentCustomerId: null,
        loadCustomer: false,
      });
      expect(text.startsWith(ADVISOR_SYSTEM_PROMPT)).toBe(true);
    });

    it('Scenario: Full-load case includes the JSON payload at the end', () => {
      const text = buildSystemPreamble(ADVISOR_SYSTEM_PROMPT, {
        userName: 'Daniel',
        currentCustomerId: 'c-002',
        loadCustomer: true,
      });
      expect(text).toContain('"id": "c-002"');
      expect(text).toContain('Daniel');
    });
  });
});
