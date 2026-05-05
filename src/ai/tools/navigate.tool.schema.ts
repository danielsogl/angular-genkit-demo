import { z } from '@genkit-ai/core';

import {
  NAV_ITEMS,
  buildNavigateToolDescription,
  navigationTargets,
} from '../../shared/nav-items.js';

export const NavigateToolInputSchema = z.object({
  target: z.enum(navigationTargets),
});
export type NavigateToolInput = z.infer<typeof NavigateToolInputSchema>;

export const NavigateToolOutputSchema = z.object({
  navigated: z.literal(true),
  target: z.enum(navigationTargets),
});
export type NavigateToolOutput = z.infer<typeof NavigateToolOutputSchema>;

export const NAVIGATE_TOOL_DESCRIPTION = buildNavigateToolDescription(NAV_ITEMS);
