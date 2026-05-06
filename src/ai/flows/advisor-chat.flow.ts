import { ADVISOR_SYSTEM_PROMPT } from '../advisor-system-prompt.js';
import { ai } from '../genkit.js';
import { getCustomerTool } from '../tools/get-customer.tool.js';
import type { GetCustomerOutput } from '../tools/get-customer.tool.schema.js';
import { listCustomersTool } from '../tools/list-customers.tool.js';
import { navigateTool } from '../tools/navigate.tool.js';
import type { NavigateToolInput } from '../tools/navigate.tool.schema.js';
import {
  ChatStreamEventSchema,
  ChatTurnRequestSchema,
  ChatTurnResponseSchema,
  type ChatRole,
} from './advisor-chat-schema.js';
import { buildSystemPreamble } from './advisor-chat.preamble.js';

export {
  ChatRoleSchema,
  ChatMessageSchema,
  ChatTurnRequestSchema,
  ChatTurnResponseSchema,
  ChatStreamEventSchema,
  TextDeltaEventSchema,
  NavigateEventSchema,
  CustomerLoadedEventSchema,
} from './advisor-chat-schema.js';
export type {
  ChatRole,
  ChatMessage,
  ChatTurnRequest,
  ChatTurnResponse,
  ChatStreamEvent,
  TextDeltaEvent,
  NavigateEvent,
  CustomerLoadedEvent,
} from './advisor-chat-schema.js';
export { multiplexAdvisorStream } from './advisor-chat.multiplex.js';

export const advisorChatFlow = ai.defineFlow(
  {
    name: 'advisorChatFlow',
    inputSchema: ChatTurnRequestSchema,
    outputSchema: ChatTurnResponseSchema,
    streamSchema: ChatStreamEventSchema,
  },
  async ({ userName, history, message, currentCustomerId, loadCustomer }, sendChunk) => {
    const systemPrompt = buildSystemPreamble(ADVISOR_SYSTEM_PROMPT, {
      userName,
      currentCustomerId,
      loadCustomer,
    });

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

    // We drive the model non-streaming and synthesize our own discriminated
    // stream events from the assembled response. Token-level streaming on the
    // model side is a separate follow-up — keeping this path stable across
    // the Anthropic → Azure OpenAI provider switch.
    const response = await ai.generate({
      system: systemPrompt,
      messages,
      tools: [navigateTool, listCustomersTool, getCustomerTool],
      maxTurns: 3,
    });

    // With maxTurns > 1 tool requests live in intermediate assistant messages,
    // not in `response.toolRequests` (which only reflects the final message's
    // parts). Walk the whole conversation. We forward at most one navigate
    // event per turn (matching the system prompt rule) and at most one
    // customer-loaded event with the latest successful getCustomer payload
    // (so the page state reflects the customer the agent ended up referring to).
    let navigateInput: NavigateToolInput | undefined;
    let lastLoadedCustomer: GetCustomerOutput | undefined;
    for (const msg of response.messages) {
      if (msg.role === 'model') {
        for (const part of msg.content) {
          const tr = (part as { toolRequest?: { name: string; input?: unknown } }).toolRequest;
          if (!tr) continue;
          if (tr.name === 'navigate' && !navigateInput) {
            const input = tr.input as NavigateToolInput | undefined;
            if (input?.target !== undefined) {
              navigateInput = input;
            }
          }
        }
        continue;
      }
      if (msg.role === 'tool') {
        for (const part of msg.content) {
          const tres = (
            part as {
              toolResponse?: { name: string; output?: unknown };
            }
          ).toolResponse;
          if (tres?.name !== 'getCustomer') continue;
          const output = tres.output as GetCustomerOutput | undefined;
          if (output && typeof output === 'object' && 'id' in output) {
            lastLoadedCustomer = output;
          }
        }
      }
    }

    if (navigateInput) {
      sendChunk({ type: 'navigate', target: navigateInput.target });
    }

    if (lastLoadedCustomer) {
      sendChunk({ type: 'customer-loaded', customer: lastLoadedCustomer });
    }

    const reply = response.text;
    if (reply) {
      sendChunk({ type: 'text', delta: reply });
    }

    return { reply };
  },
);
