// Stub format for /api/chat in this suite:
//   The Angular client uses Genkit's streamFlow protocol over /api/chat.
//   That protocol expects newline-delimited frames of the form
//     `data: {"message": <chunk>}\n\n` for each streamed chunk
//   followed by a terminator
//     `data: {"result": <output>}\n\n`
//   The chunk shape mirrors the flow's `streamSchema` — for the
//   add-chatbot-navigation change this is the discriminated union
//     { type: 'text'; delta: string } | { type: 'navigate'; target: string }
//   Steps below build that body deterministically so the e2e suite never
//   touches the real model.

import { expect } from '@playwright/test';

import { Given, Then } from './fixtures';

interface TextEvent {
  readonly type: 'text';
  readonly delta: string;
}

interface NavigateEvent {
  readonly type: 'navigate';
  readonly target: string;
}

type StreamEvent = TextEvent | NavigateEvent;

const sseBody = (events: readonly StreamEvent[], reply: string): string => {
  const parts: string[] = [];
  for (const event of events) {
    parts.push(`data: ${JSON.stringify({ message: event })}\n\n`);
  }
  parts.push(`data: ${JSON.stringify({ result: { reply } })}\n\n`);
  return parts.join('');
};

Given(
  'the chat endpoint is stubbed to navigate to {string} with confirmation {string}',
  async ({ page }, target: string, confirmation: string) => {
    const events: StreamEvent[] = [
      { type: 'navigate', target },
      { type: 'text', delta: confirmation },
    ];
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
        body: sseBody(events, confirmation),
      });
    });
  },
);

Given('the chat endpoint is stubbed with a German text-only reply', async ({ page }) => {
  const reply =
    'Ich kann Sie bei den Bereichen Übersicht, Depot, Kundenakte, Unterlagen und Einstellungen unterstützen.';
  const events: StreamEvent[] = [{ type: 'text', delta: reply }];
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
      body: sseBody(events, reply),
    });
  });
});

Then('the URL becomes {string}', async ({ page }, path: string) => {
  await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}$`));
});

Then('the URL stays at the default route', async ({ page }) => {
  await expect(page).toHaveURL(/\/$/);
});

Then('the routed main shows the heading {string}', async ({ page }, heading: string) => {
  await expect(
    page.getByRole('main').getByRole('heading', { level: 1, name: heading }),
  ).toBeVisible();
});
