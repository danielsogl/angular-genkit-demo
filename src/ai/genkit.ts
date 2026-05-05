import { anthropic } from '@genkit-ai/anthropic';
import { genkit } from 'genkit';

export { ADVISOR_SYSTEM_PROMPT } from './advisor-system-prompt.js';

// The Anthropic plugin throws synchronously when no API key is present. During
// prerender / route extraction the worker has no environment, so we fall back
// to a sentinel value that lets module construction succeed. Any actual flow
// invocation without a real key still fails — surfaced as the German error
// bubble in the UI per design.
const apiKey = process.env['ANTHROPIC_API_KEY'] ?? 'missing-anthropic-api-key';

export const ai = genkit({
  plugins: [anthropic({ apiKey })],
  model: anthropic.model('claude-sonnet-4-5'),
});
