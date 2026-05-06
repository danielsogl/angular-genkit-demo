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

    const { stream, response } = ai.generateStream({
      system: systemPrompt,
      messages,
      tools: [navigateTool, listCustomersTool, getCustomerTool],
      maxTurns: 3,
    });

    // Stream text deltas live, and forward customer-loaded as soon as the
    // getCustomer tool returns. Navigate input arrives only as fragments in
    // chunks (the OpenAI SDK emits empty `input` until finish_reason fires);
    // we read the parsed value from `response.messages` after the stream ends.
    let lastLoadedCustomer: GetCustomerOutput | undefined;
    let assembledText = '';
    for await (const chunk of stream) {
      for (const part of chunk.content) {
        if (part.text) {
          assembledText += part.text;
          sendChunk({ type: 'text', delta: part.text });
          continue;
        }
        const tres = (part as { toolResponse?: { name: string; output?: unknown } }).toolResponse;
        if (tres?.name === 'getCustomer') {
          const output = tres.output as GetCustomerOutput | undefined;
          if (output && typeof output === 'object' && 'id' in output) {
            lastLoadedCustomer = output;
          }
        }
      }
    }

    const finalResponse = await response;

    let navigateInput: NavigateToolInput | undefined;
    for (const msg of finalResponse.messages) {
      if (msg.role !== 'model') continue;
      for (const part of msg.content) {
        const tr = (part as { toolRequest?: { name: string; input?: unknown } }).toolRequest;
        if (tr?.name === 'navigate' && !navigateInput) {
          const input = tr.input as NavigateToolInput | undefined;
          if (input?.target !== undefined) {
            navigateInput = input;
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

    return { reply: assembledText };
  },
);
