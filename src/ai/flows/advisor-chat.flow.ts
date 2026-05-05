import { z } from '@genkit-ai/core';

import { ADVISOR_SYSTEM_PROMPT } from '../advisor-system-prompt.js';
import { ai } from '../genkit.js';
import {
  ChatTurnRequestSchema,
  ChatTurnResponseSchema,
  type ChatRole,
} from './advisor-chat-schema.js';

export {
  ChatRoleSchema,
  ChatMessageSchema,
  ChatTurnRequestSchema,
  ChatTurnResponseSchema,
} from './advisor-chat-schema.js';
export type {
  ChatRole,
  ChatMessage,
  ChatTurnRequest,
  ChatTurnResponse,
} from './advisor-chat-schema.js';

export const advisorChatFlow = ai.defineFlow(
  {
    name: 'advisorChatFlow',
    inputSchema: ChatTurnRequestSchema,
    outputSchema: ChatTurnResponseSchema,
    streamSchema: z.string(),
  },
  async ({ userName, history, message }, sendChunk) => {
    const userPreamble = userName
      ? `The advisor's name is ${userName}. Address them by name when natural.`
      : 'The advisor is not signed in; use a neutral German salutation.';

    const messages = history
      .map((m: { role: ChatRole; content: string }) => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        content: [{ text: m.content }],
      }))
      .concat([
        {
          role: 'user' as const,
          content: [{ text: message }],
        },
      ]);

    const { stream, response } = ai.generateStream({
      system: `${ADVISOR_SYSTEM_PROMPT}\n\n${userPreamble}`,
      messages,
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        sendChunk(text);
      }
    }

    const finalResponse = await response;
    return { reply: finalResponse.text };
  },
);
