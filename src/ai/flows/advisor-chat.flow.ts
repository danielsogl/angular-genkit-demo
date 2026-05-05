import { ADVISOR_SYSTEM_PROMPT } from '../advisor-system-prompt.js';
import { ai } from '../genkit.js';
import { navigateTool } from '../tools/navigate.tool.js';
import type { NavigateToolInput } from '../tools/navigate.tool.schema.js';
import {
  ChatStreamEventSchema,
  ChatTurnRequestSchema,
  ChatTurnResponseSchema,
  type ChatRole,
} from './advisor-chat-schema.js';

export {
  ChatRoleSchema,
  ChatMessageSchema,
  ChatTurnRequestSchema,
  ChatTurnResponseSchema,
  ChatStreamEventSchema,
  TextDeltaEventSchema,
  NavigateEventSchema,
} from './advisor-chat-schema.js';
export type {
  ChatRole,
  ChatMessage,
  ChatTurnRequest,
  ChatTurnResponse,
  ChatStreamEvent,
  TextDeltaEvent,
  NavigateEvent,
} from './advisor-chat-schema.js';
export { multiplexAdvisorStream } from './advisor-chat.multiplex.js';

export const advisorChatFlow = ai.defineFlow(
  {
    name: 'advisorChatFlow',
    inputSchema: ChatTurnRequestSchema,
    outputSchema: ChatTurnResponseSchema,
    streamSchema: ChatStreamEventSchema,
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

    // The Anthropic Genkit plugin (v0.2.0) does not yet parse `input_json_delta`
    // events from streaming tool-use responses, so we drive the model
    // non-streaming and synthesize our own discriminated stream events from the
    // assembled response. See https://genkit.dev/docs/js/integrations/anthropic/.
    const response = await ai.generate({
      system: `${ADVISOR_SYSTEM_PROMPT}\n\n${userPreamble}`,
      messages,
      tools: [navigateTool],
      maxTurns: 2,
    });

    // With maxTurns > 1 the navigate tool_request lives in an intermediate
    // assistant message, not in `response.toolRequests` (which only reflects
    // the final message's parts). Walk the full conversation to find it.
    let navigateInput: NavigateToolInput | undefined;
    for (const msg of response.messages) {
      if (msg.role !== 'model') continue;
      for (const part of msg.content) {
        const tr = (part as { toolRequest?: { name: string; input?: unknown } }).toolRequest;
        if (tr?.name === 'navigate') {
          const input = tr.input as NavigateToolInput | undefined;
          if (input?.target !== undefined) {
            navigateInput = input;
            break;
          }
        }
      }
      if (navigateInput) break;
    }
    if (navigateInput) {
      sendChunk({ type: 'navigate', target: navigateInput.target });
    }

    const reply = response.text;
    if (reply) {
      sendChunk({ type: 'text', delta: reply });
    }

    return { reply };
  },
);
