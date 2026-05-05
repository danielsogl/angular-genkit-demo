import { expect } from '@playwright/test';
import { Then, When } from './fixtures';

When('I select the {string} theme in the theme switcher', async ({ page }, mode: string) => {
  await page.getByRole('button', { name: /theme/i }).click();
  await page.getByRole('menuitemradio', { name: new RegExp(mode, 'i') }).click();
});

Then('the html element has the {string} class', async ({ page }, className: string) => {
  await expect(page.locator('html')).toHaveClass(new RegExp(`(^|\\s)${className}(\\s|$)`));
});

Then('the html element does not have the {string} class', async ({ page }, className: string) => {
  const cls = (await page.locator('html').getAttribute('class')) ?? '';
  expect(cls.split(/\s+/)).not.toContain(className);
});

Then('the theme switcher reports {string} as the active option', async ({ page }, mode: string) => {
  await page.getByRole('button', { name: /theme/i }).click();
  const item = page.getByRole('menuitemradio', { name: new RegExp(mode, 'i') });
  await expect(item).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
});

When('I reload the page', async ({ page }) => {
  await page.reload();
});
