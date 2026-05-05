import { expect } from '@playwright/test';

import { Given, Then, When } from './fixtures';

interface TextEvent {
  readonly type: 'text';
  readonly delta: string;
}

interface CustomerLoadedEvent {
  readonly type: 'customer-loaded';
  readonly customer: Record<string, unknown>;
}

type StreamEvent = TextEvent | CustomerLoadedEvent;

const sseBody = (events: readonly StreamEvent[], reply: string): string => {
  const parts: string[] = [];
  for (const event of events) {
    parts.push(`data: ${JSON.stringify({ message: event })}\n\n`);
  }
  parts.push(`data: ${JSON.stringify({ result: { reply } })}\n\n`);
  return parts.join('');
};

const FAKE_C001 = {
  id: 'c-001',
  firstName: 'Anna',
  lastName: 'Müller',
  age: 43,
  email: 'anna.mueller@example.de',
  phone: '+49 30 1234567',
  address: 'Beethovenstraße 12, 10117 Berlin',
  riskProfile: 4,
  depotValue: 185_400,
  lastContact: '2026-04-12',
  advisorNotes: 'Erfahrene Anlegerin.',
  products: [{ name: 'DWS Top Dividende', category: 'Aktienfonds', value: 78_200 }],
};

Given('the chat endpoint is stubbed with a German list of fake customers', async ({ page }) => {
  const reply =
    'Sie haben aktuell vier Kunden: Anna Müller, Bernd Schmidt, Carla Weber und Dieter Becker.';
  const events: StreamEvent[] = [{ type: 'text', delta: reply }];
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
      body: sseBody(events, reply),
    });
  });
});

Given(
  'the chat endpoint is stubbed to load customer {string} with name {string}',
  async ({ page }, customerId: string, name: string) => {
    void customerId;
    const reply = `Die Kundenakte von ${name} ist geöffnet.`;
    const events: StreamEvent[] = [
      { type: 'customer-loaded', customer: FAKE_C001 },
      { type: 'text', delta: reply },
    ];
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
        body: sseBody(events, reply),
      });
    });
  },
);

When('I navigate to {string}', async ({ page }, path: string) => {
  await page.goto(path);
});

When('I open the assistant panel', async ({ page }) => {
  await page.getByRole('button', { name: 'Assistent öffnen' }).click();
  await expect(page.getByRole('dialog', { name: 'Assistent' })).toBeVisible();
});

When('I pick the customer {string} from the picker', async ({ page }, name: string) => {
  await page
    .getByRole('main')
    .getByRole('button', { name: new RegExp(name) })
    .click();
});

Given('the chat endpoint records the request payload', async ({ page }) => {
  const captured: { body: string }[] = [];
  (page as unknown as { __chatPayloads: { body: string }[] }).__chatPayloads = captured;
  await page.route('**/api/chat', async (route) => {
    const body = route.request().postData() ?? '';
    captured.push({ body });
    const reply = 'OK.';
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
      body:
        `data: ${JSON.stringify({ message: { type: 'text', delta: reply } })}\n\n` +
        `data: ${JSON.stringify({ result: { reply } })}\n\n`,
    });
  });
});

Then('the routed main contains {string}', async ({ page }, text: string) => {
  await expect(page.getByRole('main')).toContainText(text);
});

Then('the routed main shows a picker entry for {string}', async ({ page }, name: string) => {
  await expect(
    page.getByRole('main').getByRole('button', { name: new RegExp(name) }),
  ).toBeVisible();
});

const readCaptured = (page: import('@playwright/test').Page) =>
  (page as unknown as { __chatPayloads?: { body: string }[] }).__chatPayloads ?? [];

Then(
  'the recorded chat request had currentCustomerId {string}',
  async ({ page }, expected: string) => {
    await expect.poll(() => readCaptured(page).length, { timeout: 5000 }).toBeGreaterThan(0);
    const captured = readCaptured(page);
    const last = captured[captured.length - 1];
    const parsed = JSON.parse(last.body) as { data: { currentCustomerId: unknown } };
    expect(parsed.data.currentCustomerId).toBe(expected);
  },
);

Then('the recorded chat request had loadCustomer {word}', async ({ page }, expected: string) => {
  await expect.poll(() => readCaptured(page).length, { timeout: 5000 }).toBeGreaterThan(0);
  const captured = readCaptured(page);
  const last = captured[captured.length - 1];
  const parsed = JSON.parse(last.body) as { data: { loadCustomer: unknown } };
  expect(parsed.data.loadCustomer).toBe(expected === 'true');
});

Then('the assistant reply mentions {string}', async ({ page }, text: string) => {
  const dialog = page.getByRole('dialog', { name: 'Assistent' });
  await expect(dialog.getByRole('list').locator('[data-role="assistant"]').last()).toContainText(
    text,
  );
});
