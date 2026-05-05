import { ai } from '../genkit.js';
import { listCustomersHandler } from './list-customers.tool.handler.js';
import {
  LIST_CUSTOMERS_TOOL_DESCRIPTION,
  ListCustomersInputSchema,
  ListCustomersOutputSchema,
} from './list-customers.tool.schema.js';

export {
  CustomerSummarySchema,
  LIST_CUSTOMERS_TOOL_DESCRIPTION,
  ListCustomersInputSchema,
  ListCustomersOutputSchema,
} from './list-customers.tool.schema.js';
export type {
  CustomerSummaryDto,
  ListCustomersInput,
  ListCustomersOutput,
} from './list-customers.tool.schema.js';
export { listCustomersHandler } from './list-customers.tool.handler.js';

export const listCustomersTool = ai.defineTool(
  {
    name: 'listCustomers',
    description: LIST_CUSTOMERS_TOOL_DESCRIPTION,
    inputSchema: ListCustomersInputSchema,
    outputSchema: ListCustomersOutputSchema,
  },
  listCustomersHandler,
);
