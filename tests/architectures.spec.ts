import { expect, test } from '@playwright/test';

async function openFlowOptions(page: import('@playwright/test').Page) {
  const options = page.getByRole('dialog', { name: 'Flow options' });
  if (!(await options.isVisible()))
    await page.getByRole('button', { name: 'Flow options', exact: true }).click();
  return options;
}

async function openMore(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'More options' }).click();
  return page.getByRole('menu', { name: 'More options' });
}

test('selector navigates generic pattern to sourced company on the same canvas', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Choose architecture preset' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Video Streaming/ })
    .click();
  const options = page.locator('[data-option]');
  await expect(options.first()).toContainText('Generic Pattern');
  await options.first().click();
  await expect(page).toHaveURL(/architecture\/video\/generic\/playback/);
  await page.locator('.react-flow').evaluate((el) => el.setAttribute('data-persistent', 'yes'));
  await page.getByRole('button', { name: 'Choose architecture preset' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Video Streaming/ }).click();
  await page.getByRole('button', { name: /Netflix/ }).click();
  await expect(page.getByTestId('concept-rw-cdn')).toContainText('Open Connect Appliance');
  await expect(page.locator('.react-flow')).toHaveAttribute('data-persistent', 'yes');
  const more = await openMore(page);
  await more.getByRole('combobox', { name: 'Compare architecture' }).selectOption('generic');
  await expect(page.getByTestId('concept-rw-cdn')).toHaveClass(/compare-different/);
  const sourcesMenu = await openMore(page);
  await sourcesMenu.getByRole('menuitem', { name: 'Sources' }).click();
  await expect(page.getByRole('complementary', { name: 'Architecture sources' })).toContainText(
    'Open Connect overview',
  );
  await page.getByRole('button', { name: 'Close sources' }).click();
  await expect(page.getByTestId('concept-rw-client')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'tests/realworld-netflix.png' });
  expect(errors).toEqual([]);
});
test('deep links, browser history, and global company search restore the right world', async ({
  page,
}) => {
  await page.goto('/architecture/ride/uber/location-update');
  await expect(page.getByRole('combobox', { name: 'Choose flow' })).toHaveValue('location-update');
  await page.getByRole('combobox', { name: 'Choose flow' }).selectOption('complete-trip');
  await expect(page).toHaveURL(/complete-trip$/);
  await page.goBack();
  await expect(page.getByRole('combobox', { name: 'Choose flow' })).toHaveValue('location-update');
  await page.reload();
  await expect(page.getByTestId('concept-rw-driver')).toBeVisible();
  await page.getByRole('button', { name: 'Find anything' }).click();
  await page.getByRole('textbox', { name: 'Search concepts' }).fill('Netflix');
  await page.getByRole('button', { name: /Explore Netflix/ }).click();
  await expect(page).toHaveURL(/video\/netflix\/playback$/);
  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('button', { name: 'Explore' })
    .click();
  await expect(page.getByTestId('concept-client')).toBeVisible();
});
test('parallel paths animate together, pause holds motion, and completion resets every packet', async ({
  page,
}) => {
  await page.goto('/architecture/search/google/search-query');
  await openFlowOptions(page);
  await page.getByRole('button', { name: 'Toggle flow timeline' }).click();
  await page.getByRole('button', { name: /Search partition A \+ Search partition B/ }).click();
  await page.getByRole('button', { name: 'Close flow timeline' }).click();
  await expect(page.locator('.world-packet')).toHaveCount(2);
  await expect(page.locator('.world-step-card')).toContainText('Search partition');
  await page.getByRole('button', { name: 'Resume flow' }).click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Pause flow' }).click();
  const time = await page
    .locator('.world-packet')
    .first()
    .evaluate((el) => el.getAnimations()[0]?.currentTime);
  await page.waitForTimeout(350);
  const later = await page
    .locator('.world-packet')
    .first()
    .evaluate((el) => el.getAnimations()[0]?.currentTime);
  expect(later).toBe(time);
  await expect(page.getByTestId('concept-rw-client')).toHaveCSS('filter', 'none');
  await page.screenshot({ path: 'tests/realworld-parallel.png' });
  await openFlowOptions(page);
  await page.getByRole('button', { name: 'Toggle flow timeline' }).click();
  await page.locator('.world-timeline > button').nth(5).click();
  await openFlowOptions(page);
  await page.getByRole('combobox', { name: 'Playback speed' }).selectOption('0');
  await page.getByRole('button', { name: 'Close flow options' }).click();
  await page.getByRole('button', { name: 'Resume flow' }).click();
  await expect(page.locator('.world-completion')).toBeVisible();
  await expect(page.locator('.request-packet')).toHaveCount(0);
  await expect(page.locator('.architecture-node.is-active')).toHaveCount(0);
  await expect(page.locator('.edge-active')).toHaveCount(0);
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect(page.locator('.world-step-count')).toContainText('1 /');
  await page.getByRole('button', { name: 'Restart flow', exact: true }).click();
  await expect(page.locator('.world-step-card')).toHaveCount(0);
  await expect(page.locator('.request-packet')).toHaveCount(0);
});
test('cache and failure branches change the timeline and inspection pauses the flow', async ({
  page,
}) => {
  await page.goto('/architecture/video/netflix/playback');
  await openFlowOptions(page);
  await page.getByRole('combobox', { name: 'Debug condition' }).selectOption('cache-hit');
  await page.getByRole('button', { name: 'Toggle flow timeline' }).click();
  await expect(page.locator('.world-timeline')).not.toContainText('Cold edge');
  await page.getByRole('button', { name: 'Close flow timeline' }).click();
  await page.getByRole('button', { name: 'Play flow', exact: true }).click();
  await page.getByTestId('concept-rw-cdn').click();
  await expect(page.getByRole('button', { name: 'Resume flow' })).toBeVisible();
  const inspector = page.getByRole('complementary');
  await expect(inspector).toContainText('verified');
  await inspector.getByRole('button', { name: /Explore CDN/ }).click();
  await expect(page.getByTestId('concept-cdn')).toBeVisible();
  await page.getByRole('button', { name: /Return to Netflix/ }).click();
  await expect(page.getByTestId('concept-rw-cdn')).toBeVisible();
  await page.goto('/architecture/commerce/amazon/place-order');
  await openFlowOptions(page);
  await page.getByRole('combobox', { name: 'Debug condition' }).selectOption('payment-timeout');
  await page.getByRole('button', { name: 'Toggle flow timeline' }).click();
  await expect(page.locator('.world-timeline')).toContainText('Release reservation');
  await expect(page.locator('.world-timeline')).not.toContainText('Order confirmed');
});
test('reduced motion retains step highlighting without moving packets', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/architecture/chat/discord/send-message');
  await page.getByRole('button', { name: 'Play flow', exact: true }).click();
  await expect(page.locator('.architecture-node.is-active')).toHaveCount(2);
  await expect(page.locator('.request-packet')).toHaveCount(0);
  await page.getByRole('button', { name: 'Pause flow' }).click();
  await page.getByRole('button', { name: 'Next flow step' }).click();
  await expect(page.locator('.world-step-count')).toContainText('2 /');
});
test('mobile player and architecture explorer fit without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/architecture/gaming/fortnite/movement');
  await page.getByRole('button', { name: 'Play flow', exact: true }).click();
  await expect(page.locator('.world-packet')).toHaveCount(1);
  await page.getByRole('button', { name: 'Pause flow' }).click();
  await expect(page.getByRole('combobox', { name: 'Playback speed' })).toHaveCount(0);
  const flowOptions = await openFlowOptions(page);
  await expect(flowOptions.getByRole('combobox', { name: 'Playback speed' })).toBeVisible();
  await expect(flowOptions.getByRole('combobox', { name: 'Debug condition' })).toBeVisible();
  await flowOptions.getByRole('button', { name: 'Close flow options' }).click();
  await expect
    .poll(async () => {
      const bounds = await page.getByTestId('concept-rw-server').boundingBox();
      return !!bounds && bounds.x >= 0 && bounds.x + bounds.width <= 390;
    })
    .toBeTruthy();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: 'tests/realworld-mobile.png' });
  await page.getByRole('button', { name: 'Choose architecture preset' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});

test('social, sync, audio, and payment families run their own flows without runtime errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const route of [
    'social/instagram/home-feed',
    'files/dropbox/upload-file',
    'music/spotify/play-song',
    'payments/stripe/make-payment',
  ]) {
    await page.goto(`/architecture/${route}`);
    await page.getByRole('button', { name: 'Play flow', exact: true }).click();
    await page.getByRole('button', { name: 'Pause flow' }).click();
    await page.getByRole('button', { name: 'Next flow step' }).click();
    await expect(page.locator('.world-step-count')).toContainText('2 /');
    await expect(page.locator('.world-packet')).toHaveCount(1);
    await page.getByRole('button', { name: 'Restart flow' }).click();
    await expect(page.locator('.request-packet')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
