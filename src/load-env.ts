// Load `.env` so ANTHROPIC_API_KEY is available before any module that needs it
// is evaluated. This file MUST be imported before `./ai/...` so the Genkit
// Anthropic plugin sees the key during its synchronous initialization.
//
// In production the key is supplied by the deployment environment directly, so
// a missing `.env` file is fine. We also tolerate the file missing during
// `ng build`'s route-extraction step, where the worker has no environment.
try {
  process.loadEnvFile();
} catch {
  // No .env file or unsupported Node version — fall back to the existing env.
}
