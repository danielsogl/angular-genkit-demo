import { ai } from '../genkit.js';
import { getCustomerHandler } from './get-customer.tool.handler.js';
import {
  GET_CUSTOMER_TOOL_DESCRIPTION,
  GetCustomerInputSchema,
  GetCustomerOutputSchema,
} from './get-customer.tool.schema.js';

export {
  CustomerProductSchema,
  CustomerSchema,
  GET_CUSTOMER_TOOL_DESCRIPTION,
  GetCustomerInputSchema,
  GetCustomerOutputSchema,
} from './get-customer.tool.schema.js';
export type {
  CustomerDto,
  CustomerProductDto,
  GetCustomerInput,
  GetCustomerOutput,
} from './get-customer.tool.schema.js';
export { getCustomerHandler, toGetCustomerOutput } from './get-customer.tool.handler.js';

export const getCustomerTool = ai.defineTool(
  {
    name: 'getCustomer',
    description: GET_CUSTOMER_TOOL_DESCRIPTION,
    inputSchema: GetCustomerInputSchema,
    outputSchema: GetCustomerOutputSchema,
  },
  getCustomerHandler,
);
