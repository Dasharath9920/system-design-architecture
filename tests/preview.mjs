import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
const localChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseURL = process.env.PREVIEW_URL || 'http://127.0.0.1:5173/';
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    (existsSync(localChrome) ? localChrome : undefined),
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
await page.goto(baseURL);
await page.waitForTimeout(1800);
await page.screenshot({ path: 'tests/overview.png' });
const nodes = await page.locator('.react-flow__node').count();
await page.getByTestId('concept-cache').click();
await page.waitForTimeout(900);
await page.screenshot({ path: 'tests/inspector.png' });
await page.getByRole('button', { name: 'Find anything' }).click();
await page.getByRole('textbox', { name: 'Search concepts' }).fill('PostgreSQL');
await page
  .getByRole('dialog')
  .getByRole('button')
  .filter({ has: page.locator('strong', { hasText: /^PostgreSQL$/ }) })
  .click();
await page
  .getByRole('complementary')
  .getByRole('button', { name: /^Explore \d+ concepts$/ })
  .click();
await page.waitForTimeout(900);
await page.getByRole('button', { name: 'Visualize request', exact: true }).click();
await page.getByRole('button', { name: 'Pause flow', exact: true }).click();
await page.getByRole('button', { name: 'Go to step 3', exact: true }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: 'tests/postgresql.png' });
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await mobile.goto(baseURL);
await mobile.waitForTimeout(1500);
await mobile.screenshot({ path: 'tests/mobile.png' });
console.log(
  JSON.stringify({
    errors,
    nodes,
    title: await page.title(),
    deepFlow: await page.locator('.story-text strong').innerText(),
    mobileOverflow: await mobile.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  }),
);
await browser.close();
