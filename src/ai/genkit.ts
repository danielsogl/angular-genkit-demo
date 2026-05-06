import { genkit } from 'genkit';
import { azureOpenAI, gpt4o } from 'genkitx-azure-openai';

export { ADVISOR_SYSTEM_PROMPT } from './advisor-system-prompt.js';

// The Azure OpenAI plugin throws synchronously when no API key / endpoint is
// present. During prerender / route extraction the worker has no environment,
// so we fall back to sentinel values that let module construction succeed.
// Any actual flow invocation without real credentials still fails — surfaced
// as the German error bubble in the UI per design.
const apiKey = process.env['AZURE_OPENAI_API_KEY'] ?? 'missing-azure-openai-api-key';
const endpoint = process.env['AZURE_OPENAI_ENDPOINT'] ?? 'https://missing.openai.azure.com/';
const apiVersion = process.env['AZURE_OPENAI_API_VERSION'] ?? '2024-10-21';
// Azure deployment name — the path segment Azure uses to route the request.
// Default matches the canonical model name so a deployment named `gpt-4o`
// works without extra config; override when the deployment is named otherwise.
const deployment = process.env['AZURE_OPENAI_DEPLOYMENT'] ?? 'gpt-4o';

export const ai = genkit({
  plugins: [azureOpenAI({ apiKey, endpoint, apiVersion, deployment })],
  model: gpt4o,
});
