import { expect } from '@playwright/test';
import { Then } from './fixtures';

Then("the top bar shows the current user's name", async ({ page }) => {
  await expect(page.getByTestId('current-user-name')).toBeVisible();
  await expect(page.getByTestId('current-user-name')).not.toBeEmpty();
});

Then("the avatar placeholder shows the user's initials", async ({ page }) => {
  const avatar = page.getByTestId('current-user-avatar');
  await expect(avatar).toBeVisible();
  await expect(avatar).toHaveText(/^[A-Z]{1,3}$/);
});

Then('the avatar placeholder has an accessible name including the full name', async ({ page }) => {
  const name = (await page.getByTestId('current-user-name').textContent())?.trim() ?? '';
  expect(name.length).toBeGreaterThan(0);
  const avatar = page.getByTestId('current-user-avatar');
  await expect(avatar).toHaveAttribute('aria-label', new RegExp(name, 'i'));
});
