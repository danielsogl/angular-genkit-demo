import { expect } from '@playwright/test';
import { Given, Then } from './fixtures';

Given('I open the home page', async ({ page }) => {
  await page.goto('/');
});

Given('I open the home page on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
});

Then('the page has a title', async ({ page }) => {
  await expect(page).toHaveTitle(/.+/);
});
