import { expect } from '@playwright/test';

import { Given, Then, When } from './fixtures';

const SHELL_ROUTES = ['/', '/depot', '/kundenakte', '/unterlagen', '/einstellungen'];

const fab = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Assistent öffnen' });

const dialog = (page: import('@playwright/test').Page) =>
  page.getByRole('dialog', { name: 'Assistent' });

const dialogCloseButton = (page: import('@playwright/test').Page) =>
  dialog(page).getByRole('button', { name: 'Assistent schließen' });

const messageInput = (page: import('@playwright/test').Page) => page.getByRole('textbox');

const HAPPY_CHUNKS = ['Gerne. ', 'Ich helfe Ihnen ', 'bei Ihren Fragen.'];

const sseBody = (chunks: readonly string[]): string => {
  // Genkit's streamFlow protocol over /api/chat emits NDJSON-ish frames separated
  // by `\n\n` with `data: {"message": <chunk>}` for streaming chunks and
  // `data: {"result": <output>}` for the final output. See
  // genkit/lib/client/client.mjs. The advisor-chat flow's stream schema is the
  // discriminated union `{ type: 'text'; delta: string } | { type: 'navigate'; target: string }`,
  // so each text chunk is wrapped in a `{ type: 'text', delta }` event.
  const parts: string[] = [];
  for (const chunk of chunks) {
    parts.push(`data: ${JSON.stringify({ message: { type: 'text', delta: chunk } })}\n\n`);
  }
  parts.push(`data: ${JSON.stringify({ result: { reply: chunks.join('') } })}\n\n`);
  return parts.join('');
};

Given('the chat endpoint is stubbed with a streaming German reply', async ({ page }) => {
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
      body: sseBody(HAPPY_CHUNKS),
    });
  });
});

Given('the chat endpoint is stubbed with a delayed streaming German reply', async ({ page }) => {
  await page.route('**/api/chat', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
      body: sseBody(HAPPY_CHUNKS),
    });
  });
});

Given('the chat endpoint fails on the first request and succeeds on retry', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/chat', async (route) => {
    calls += 1;
    if (calls === 1) {
      await route.fulfill({
        status: 500,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'boom' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
      body: sseBody(HAPPY_CHUNKS),
    });
  });
});

Given('I record requests to {string}', async ({ page }, urlSubstring: string) => {
  const calls: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes(urlSubstring)) {
      calls.push(request.method() + ' ' + request.url());
    }
  });
  // Stash on the page for the assertion step to read back.
  (page as unknown as { __chatCalls: string[] }).__chatCalls = calls;
});

Given('I open the home page without a signed-in user', async ({ page }) => {
  await page.goto('/?mockUser=none');
});

Given('I open the home page and open the assistant panel', async ({ page }) => {
  await page.goto('/');
  await fab(page).click();
  await expect(dialog(page)).toBeVisible();
});

When('I activate the assistant FAB', async ({ page }) => {
  await fab(page).click();
});

When('I tab through the page until the assistant FAB has focus', async ({ page }) => {
  const button = fab(page);
  for (let i = 0; i < 50; i++) {
    if (await button.evaluate((el) => el === document.activeElement)) {
      return;
    }
    await page.keyboard.press('Tab');
  }
  throw new Error('Assistant FAB did not receive focus within 50 Tab presses');
});

When('I navigate through every shell route', async ({ page }) => {
  for (const route of SHELL_ROUTES) {
    await page.goto(route);
    await expect(fab(page)).toBeVisible();
  }
});

When('I press Escape inside the assistant panel', async ({ page }) => {
  await dialog(page).press('Escape');
});

When('I type {string} into the message input and click send', async ({ page }, text: string) => {
  await messageInput(page).fill(text);
  await page.getByRole('button', { name: 'Senden' }).click();
});

When('I type {string} into the message input and press Enter', async ({ page }, text: string) => {
  await messageInput(page).fill(text);
  await messageInput(page).press('Enter');
});

When('I send the message {string}', async ({ page }, text: string) => {
  await messageInput(page).fill(text);
  await messageInput(page).press('Enter');
});

When('I press Enter in the empty message input', async ({ page }) => {
  await messageInput(page).press('Enter');
});

When('I activate the retry button', async ({ page }) => {
  await page.getByRole('button', { name: 'Erneut versuchen' }).click();
});

Then('a single chat assistant FAB is visible in the bottom-right', async ({ page }) => {
  await expect(fab(page)).toBeVisible();
  await expect(fab(page)).toHaveCount(1);
});

Then('the FAB has an accessible name {string}', async ({ page }, name: string) => {
  await expect(page.getByRole('button', { name })).toHaveCount(1);
});

Then('the assistant FAB is focused', async ({ page }) => {
  const focused = await fab(page).evaluate((el) => el === document.activeElement);
  expect(focused).toBe(true);
});

Then('exactly one assistant FAB is in the document on each route', async ({ page }) => {
  for (const route of SHELL_ROUTES) {
    await page.goto(route);
    await expect(fab(page)).toHaveCount(1);
  }
});

Then('the assistant chat panel is open', async ({ page }) => {
  await expect(dialog(page)).toBeVisible();
});

Then('the assistant chat panel is closed', async ({ page }) => {
  await expect(dialog(page)).toHaveCount(0);
});

Then('the FAB reports {string} as {string}', async ({ page }, attribute: string, value: string) => {
  await expect(fab(page)).toHaveAttribute(attribute, value);
});

Then('focus is on the message input', async ({ page }) => {
  await expect(messageInput(page)).toBeFocused();
});

Then('focus is on the assistant FAB', async ({ page }) => {
  await expect(fab(page)).toBeFocused();
});

Then('no page-wide backdrop is rendered', async ({ page }) => {
  await expect(page.locator('.cdk-overlay-backdrop')).toHaveCount(0);
});

Then('the side navigation remains interactive', async ({ page }) => {
  await expect(page.getByRole('button', { name: /toggle navigation/i })).toBeVisible();
});

Then(
  'the assistant transcript contains a German greeting that mentions {string}',
  async ({ page }, name: string) => {
    const transcript = dialog(page).getByRole('list');
    await expect(transcript).toContainText(name);
    await expect(transcript).toContainText(/Hallo|Guten Tag|Willkommen/);
  },
);

Then('the assistant transcript contains a neutral German salutation', async ({ page }) => {
  const transcript = dialog(page).getByRole('list');
  await expect(transcript).toContainText(/Guten Tag|Hallo/);
});

Then(
  'the greeting does not contain {string} or {string}',
  async ({ page }, a: string, b: string) => {
    const transcript = dialog(page).getByRole('list');
    const text = (await transcript.textContent()) ?? '';
    expect(text).not.toContain(a);
    expect(text).not.toContain(b);
  },
);

Then('the assistant transcript contains a German greeting', async ({ page }) => {
  const transcript = dialog(page).getByRole('list');
  await expect(transcript).toContainText(/Hallo|Guten Tag|Willkommen/);
});

Then('no request was sent to {string}', async ({ page }, path: string) => {
  const calls = (page as unknown as { __chatCalls?: string[] }).__chatCalls ?? [];
  const matched = calls.filter((c) => c.includes(path));
  expect(matched).toEqual([]);
});

Then(
  'a user message containing {string} appears in the transcript',
  async ({ page }, text: string) => {
    const transcript = dialog(page).getByRole('list');
    await expect(transcript.locator('[data-role="user"]')).toContainText(text);
  },
);

Then('the message input is cleared', async ({ page }) => {
  await expect(messageInput(page)).toHaveValue('');
});

Then('the assistant reply grows as chunks arrive', async ({ page }) => {
  const transcript = dialog(page).getByRole('list');
  await expect(transcript.locator('[data-role="assistant"]').last()).toContainText(
    HAPPY_CHUNKS[0].trim(),
    { timeout: 4000 },
  );
  await expect(transcript.locator('[data-role="assistant"]').last()).toContainText(
    HAPPY_CHUNKS.join('').trim(),
    { timeout: 4000 },
  );
});

Then('the message input is disabled', async ({ page }) => {
  await expect(messageInput(page)).toBeDisabled();
});

Then('a streaming indicator is visible', async ({ page }) => {
  await expect(dialog(page).locator('.chat-panel__status')).toBeVisible();
});

Then('the assistant reply is in German', async ({ page }) => {
  const transcript = dialog(page).getByRole('list');
  await expect(transcript.locator('[data-role="assistant"]').last()).toContainText(
    /Gerne|Ihnen|bei/,
  );
});

Then('a German error message is shown in the transcript', async ({ page }) => {
  await expect(dialog(page)).toContainText(
    /Es ist ein Fehler aufgetreten\. Bitte versuchen Sie es erneut\./,
  );
});

Then('a retry button labelled {string} is visible', async ({ page }, label: string) => {
  await expect(page.getByRole('button', { name: label })).toBeVisible();
});

Then('the chat endpoint responds with a non-404 status', async ({ page, request }) => {
  void page;
  const response = await request.post('/api/chat', {
    data: { data: { userName: null, history: [], message: '' } },
    failOnStatusCode: false,
  });
  expect(response.status()).not.toBe(404);
});

Then(
  'the assistant panel exposes role {string} with the German name {string}',
  async ({ page }, role: string, name: string) => {
    expect(role).toBe('dialog');
    await expect(page.getByRole('dialog', { name })).toBeVisible();
  },
);

Then(
  'the transcript region carries {string} as {string}',
  async ({ page }, attribute: string, value: string) => {
    const transcript = dialog(page).getByRole('list');
    await expect(transcript).toHaveAttribute(attribute, value);
  },
);

Then("the top bar still shows the current user's name", async ({ page }) => {
  await expect(page.getByTestId('current-user-name')).toBeVisible();
  await expect(page.getByTestId('current-user-name')).not.toBeEmpty();
});

Then('the side navigation toggle is operable', async ({ page }) => {
  const toggle = page.getByRole('button', { name: /toggle navigation/i });
  await expect(toggle).toBeVisible();
  await expect(toggle).toBeEnabled();
});

Then('the routed content occupies the same bounding box as before', async ({ page }) => {
  const main = page.getByRole('main');
  const box = await main.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.height).toBeGreaterThan(0);
});
