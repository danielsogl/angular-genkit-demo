// Load `.env` so AZURE_OPENAI_API_KEY and the related endpoint/deployment vars
// are available before any module that needs them is evaluated. This file MUST
// be imported before `./ai/...` so the Genkit Azure OpenAI plugin sees the
// credentials during its synchronous initialization.
//
// In production the key is supplied by the deployment environment directly, so
// a missing `.env` file is fine. We also tolerate the file missing during
// `ng build`'s route-extraction step, where the worker has no environment.
try {
  process.loadEnvFile();
} catch {
  // No .env file or unsupported Node version — fall back to the existing env.
}
