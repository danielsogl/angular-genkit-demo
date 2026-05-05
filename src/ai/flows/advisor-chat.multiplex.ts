import type { ChatStreamEvent } from './advisor-chat-schema.js';
import type { GetCustomerOutput } from '../tools/get-customer.tool.schema.js';
import type { NavigateToolInput } from '../tools/navigate.tool.schema.js';

interface ModelStreamChunk {
  readonly content: readonly {
    readonly text?: string;
    readonly toolRequest?: {
      readonly name: string;
      readonly input?: unknown;
      readonly partial?: boolean;
    };
    readonly toolResponse?: {
      readonly name: string;
      readonly output?: unknown;
    };
  }[];
}

export interface MultiplexResult {
  readonly assembledText: string;
}

export async function multiplexAdvisorStream(
  source: AsyncIterable<ModelStreamChunk>,
  sendChunk: (event: ChatStreamEvent) => void,
): Promise<MultiplexResult> {
  let navigateEmitted = false;
  let lastCustomer: GetCustomerOutput | undefined;
  let assembledText = '';

  for await (const chunk of source) {
    for (const part of chunk.content) {
      if (part.text) {
        assembledText += part.text;
        sendChunk({ type: 'text', delta: part.text });
        continue;
      }
      if (
        !navigateEmitted &&
        part.toolRequest &&
        part.toolRequest.name === 'navigate' &&
        part.toolRequest.partial !== true
      ) {
        const input = part.toolRequest.input as NavigateToolInput | undefined;
        if (input?.target !== undefined) {
          sendChunk({ type: 'navigate', target: input.target });
          navigateEmitted = true;
        }
        continue;
      }
      if (part.toolResponse && part.toolResponse.name === 'getCustomer') {
        const output = part.toolResponse.output as GetCustomerOutput | undefined;
        if (output && typeof output === 'object' && 'id' in output) {
          lastCustomer = output;
        }
      }
    }
  }

  if (lastCustomer) {
    sendChunk({ type: 'customer-loaded', customer: lastCustomer });
  }

  return { assembledText };
}
