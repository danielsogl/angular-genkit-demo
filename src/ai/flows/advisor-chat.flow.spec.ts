import { describe, expect, it } from 'vitest';

import { ADVISOR_SYSTEM_PROMPT } from '../advisor-system-prompt';
import { ChatTurnRequestSchema, type ChatStreamEvent } from './advisor-chat-schema';
import { multiplexAdvisorStream } from './advisor-chat.multiplex';

interface ModelChunk {
  readonly content: readonly {
    readonly text?: string;
    readonly toolRequest?: {
      readonly name: string;
      readonly input?: unknown;
      readonly partial?: boolean;
    };
  }[];
}

const fixtureStream = async function* (chunks: readonly ModelChunk[]): AsyncIterable<ModelChunk> {
  for (const chunk of chunks) {
    yield chunk;
  }
};

const collect = async (chunks: readonly ModelChunk[]): Promise<ChatStreamEvent[]> => {
  const events: ChatStreamEvent[] = [];
  await multiplexAdvisorStream(fixtureStream(chunks), (event) => events.push(event));
  return events;
};

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

  describe('Flow streams text deltas and navigate events as a discriminated union', () => {
    it('Scenario: Text-only turn yields only text events', async () => {
      // Given a model stream with prose-only chunks
      const events = await collect([
        { content: [{ text: 'Ich kann ' }] },
        { content: [{ text: 'Ihnen helfen.' }] },
      ]);
      // Then every emitted event is a text delta
      expect(events).toHaveLength(2);
      expect(events.every((e) => e.type === 'text')).toBe(true);
      expect(events.filter((e) => e.type === 'navigate')).toHaveLength(0);
      // And the concatenated text matches the model output
      const text = events
        .filter((e): e is Extract<ChatStreamEvent, { type: 'text' }> => e.type === 'text')
        .map((e) => e.delta)
        .join('');
      expect(text).toBe('Ich kann Ihnen helfen.');
    });

    it('Scenario: Navigation turn emits a navigate event alongside text', async () => {
      // Given the model calls the navigate tool with target=einstellungen and follows up with text
      const events = await collect([
        {
          content: [{ toolRequest: { name: 'navigate', input: { target: 'einstellungen' } } }],
        },
        { content: [{ text: 'Ich öffne ' }] },
        { content: [{ text: 'die Einstellungen.' }] },
      ]);
      // Then there is exactly one navigate event with the typed target
      const navigateEvents = events.filter(
        (e): e is Extract<ChatStreamEvent, { type: 'navigate' }> => e.type === 'navigate',
      );
      expect(navigateEvents).toHaveLength(1);
      expect(navigateEvents[0].target).toBe('einstellungen');
      // And the text events concatenate to the German confirmation
      const text = events
        .filter((e): e is Extract<ChatStreamEvent, { type: 'text' }> => e.type === 'text')
        .map((e) => e.delta)
        .join('');
      expect(text).toBe('Ich öffne die Einstellungen.');
    });

    it('Scenario: At most one navigate event per turn', async () => {
      // Given the model attempts to call navigate twice in one turn
      const events = await collect([
        { content: [{ toolRequest: { name: 'navigate', input: { target: 'depot' } } }] },
        {
          content: [{ toolRequest: { name: 'navigate', input: { target: 'einstellungen' } } }],
        },
      ]);
      // Then only the first navigate event is forwarded
      const navigateEvents = events.filter(
        (e): e is Extract<ChatStreamEvent, { type: 'navigate' }> => e.type === 'navigate',
      );
      expect(navigateEvents).toHaveLength(1);
      expect(navigateEvents[0].target).toBe('depot');
    });

    it('Scenario: Partial tool-request chunks are not forwarded', async () => {
      // Given the model emits a partial tool request followed by the final one
      const events = await collect([
        {
          content: [
            {
              toolRequest: { name: 'navigate', input: { target: 'depot' }, partial: true },
            },
          ],
        },
        { content: [{ toolRequest: { name: 'navigate', input: { target: 'depot' } } }] },
      ]);
      // Then only the final, non-partial request becomes a navigate event
      const navigateEvents = events.filter(
        (e): e is Extract<ChatStreamEvent, { type: 'navigate' }> => e.type === 'navigate',
      );
      expect(navigateEvents).toHaveLength(1);
      expect(navigateEvents[0].target).toBe('depot');
    });
  });
});
