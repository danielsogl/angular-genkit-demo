import { ai } from '../genkit.js';
import {
  NAVIGATE_TOOL_DESCRIPTION,
  NavigateToolInputSchema,
  NavigateToolOutputSchema,
} from './navigate.tool.schema.js';

export {
  NAVIGATE_TOOL_DESCRIPTION,
  NavigateToolInputSchema,
  NavigateToolOutputSchema,
} from './navigate.tool.schema.js';
export type { NavigateToolInput, NavigateToolOutput } from './navigate.tool.schema.js';

export const navigateTool = ai.defineTool(
  {
    name: 'navigate',
    description: NAVIGATE_TOOL_DESCRIPTION,
    inputSchema: NavigateToolInputSchema,
    outputSchema: NavigateToolOutputSchema,
  },
  async ({ target }) => ({ navigated: true as const, target }),
);
