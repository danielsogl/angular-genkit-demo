import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { Given, Then, When } from './fixtures';

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Assistent' });

const micButton = (page: Page, name: string | RegExp) => dialog(page).getByRole('button', { name });

Given('the speech recognition service is stubbed to capture activations', async ({ page }) => {
  await page.addInitScript(() => {
    const fakeStream = {
      getTracks: () => [{ stop: () => undefined }],
    } as unknown as MediaStream;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => fakeStream } satisfies Partial<MediaDevices>,
    });
    class FakeRecorder extends EventTarget {
      mimeType = 'audio/webm';
      start() {
        return undefined;
      }
      stop() {
        this.dispatchEvent(new Event('stop'));
      }
    }
    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: FakeRecorder,
    });
    class FakeWorker extends EventTarget {
      constructor() {
        super();
        queueMicrotask(() => {
          this.dispatchEvent(new MessageEvent('message', { data: { type: 'ready' } }));
        });
      }
      postMessage(_data: unknown): void {
        queueMicrotask(() => {
          this.dispatchEvent(
            new MessageEvent('message', {
              data: { type: 'transcribed', text: 'Test-Transkript' },
            }),
          );
        });
      }
      terminate(): void {
        return undefined;
      }
    }
    Object.defineProperty(window, 'Worker', {
      configurable: true,
      value: FakeWorker,
    });
  });
});

Then(
  'a button labelled {string} is visible inside the composer',
  async ({ page }, label: string) => {
    await expect(micButton(page, label)).toBeVisible();
  },
);

Then('the mic button sits between the message input and the send button', async ({ page }) => {
  const composer = dialog(page).locator('.chat-panel__composer');
  const order = await composer.evaluate((el) => {
    const children = Array.from((el as HTMLElement).children) as HTMLElement[];
    return {
      input: children.findIndex((c) => c.classList.contains('chat-panel__input')),
      mic: children.findIndex((c) => c.classList.contains('chat-panel__mic')),
      send: children.findIndex((c) => c.getAttribute('type') === 'submit'),
    };
  });
  expect(order.input).toBeLessThan(order.mic);
  expect(order.mic).toBeLessThan(order.send);
});

When('I activate the mic button', async ({ page }) => {
  await micButton(page, /Spracheingabe (starten|stoppen)/).click();
});

Then('the mic button has aria-pressed {string}', async ({ page }, value: string) => {
  await expect(micButton(page, /Spracheingabe (starten|stoppen)/)).toHaveAttribute(
    'aria-pressed',
    value,
  );
});

Then('the mic button is labelled {string}', async ({ page }, label: string) => {
  await expect(micButton(page, label)).toBeVisible();
});

Then('the mic button is disabled', async ({ page }) => {
  await expect(micButton(page, /Spracheingabe (starten|stoppen)/)).toBeDisabled();
});
