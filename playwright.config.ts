import { defineConfig, devices } from '@playwright/test';
import { cucumberReporter, defineBddProject } from 'playwright-bdd';

const isCi = !!process.env['CI'];

const desktopBdd = defineBddProject({
  name: 'chromium',
  features: 'e2e/features/**/*.feature',
  steps: 'e2e/steps/**/*.ts',
  tags: 'not @handset',
});

const handsetBdd = defineBddProject({
  name: 'mobile-chrome',
  features: 'e2e/features/**/*.feature',
  steps: 'e2e/steps/**/*.ts',
  tags: 'not @desktop',
});

export default defineConfig({
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 1 : undefined,
  reporter: [['list'], cucumberReporter('html', { outputFile: 'playwright-report/cucumber.html' })],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  projects: [
    {
      ...desktopBdd,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      ...handsetBdd,
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: !isCi,
    timeout: 120_000,
  },
});
