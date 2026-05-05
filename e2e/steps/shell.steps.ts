import { expect } from '@playwright/test';
import { Given, Then, When } from './fixtures';

Then('I see the application header', async ({ page }) => {
  await expect(page.getByRole('banner')).toBeVisible();
});

Then('I see a primary navigation landmark', async ({ page }) => {
  await expect(page.getByRole('navigation', { name: /primary/i })).toBeVisible();
});

Then('I see the main content landmark', async ({ page }) => {
  await expect(page.getByRole('main')).toBeVisible();
});

When('I activate the side navigation toggle', async ({ page }) => {
  await page.getByRole('button', { name: /toggle navigation/i }).click();
});

Given('the side navigation is collapsed', async ({ page }) => {
  const toggle = page.getByRole('button', { name: /toggle navigation/i });
  if ((await toggle.getAttribute('aria-expanded')) !== 'false') {
    await toggle.click();
  }
});

Then('the side navigation is in rail mode', async ({ page }) => {
  await expect(page.locator('mat-sidenav.rail')).toBeVisible();
});

Then('the side navigation is in expanded mode', async ({ page }) => {
  await expect(page.locator('mat-sidenav.rail')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: /primary/i })).toBeVisible();
});

Then(
  'the toggle reports {string} as {string}',
  async ({ page }, attribute: string, value: string) => {
    const toggle = page.getByRole('button', { name: /toggle navigation/i });
    await expect(toggle).toHaveAttribute(attribute, value);
  },
);

When('I navigate to the first placeholder route', async ({ page }) => {
  await page
    .getByRole('navigation', { name: /primary/i })
    .getByRole('link')
    .first()
    .click();
});

Then(
  'the active navigation item carries {string} as {string}',
  async ({ page }, attribute: string, value: string) => {
    const active = page
      .getByRole('navigation', { name: /primary/i })
      .locator(`[${attribute}="${value}"]`);
    await expect(active).toHaveCount(1);
  },
);

Then('the side navigation drawer is closed', async ({ page }) => {
  await expect(page.locator('mat-sidenav')).toHaveAttribute('aria-hidden', 'true');
});

Then('the side navigation drawer is open', async ({ page }) => {
  await expect(page.locator('mat-sidenav')).not.toHaveAttribute('aria-hidden', 'true');
});
