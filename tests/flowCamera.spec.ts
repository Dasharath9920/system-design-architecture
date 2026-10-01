import { test, expect, type Page } from '@playwright/test';
async function viewport(page: Page) {
  return page.locator('.react-flow__viewport').evaluate((el) => {
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return { x: m.e, y: m.f, zoom: m.a };
  });
}
async function settle(page: Page) {
  await expect
    .poll(async () => {
      const a = await viewport(page);
      await page.waitForTimeout(120);
      const b = await viewport(page);
      return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.zoom - b.zoom);
    })
    .toBeLessThan(0.01);
}
async function framed(page: Page, ids: string[]) {
  await expect
    .poll(async () => {
      const canvas = await page.locator('.canvas-container').boundingBox();
      if (!canvas) return false;
      for (const id of ids) {
        const b = await page.getByTestId(`concept-${id}`).boundingBox();
        if (
          !b ||
          b.x < canvas.x + 10 ||
          b.y < canvas.y + 10 ||
          b.x + b.width > canvas.x + canvas.width - 10 ||
          b.y + b.height > canvas.y + canvas.height - 10
        )
          return false;
      }
      return true;
    })
    .toBeTruthy();
}

test('frames both endpoints before travel, pause holds position, reset restores exact saved overview', async ({
  page,
}) => {
  await page.goto('/architecture/chat/discord/send-message');
  await expect(page.getByTestId('concept-rw-client')).toBeVisible();
  await settle(page);
  const original = await viewport(page);
  await page.getByRole('button', { name: 'Play flow', exact: true }).click();
  await expect(page.locator('.world-packet')).toHaveCount(1);
  await framed(page, ['rw-client', 'rw-connection']);
  await page.getByRole('button', { name: 'Pause flow', exact: true }).click();
  const paused = await viewport(page);
  await page.waitForTimeout(650);
  expect(await viewport(page)).toEqual(paused);
  expect(paused.zoom).toBeGreaterThan(original.zoom);
  await page.screenshot({ path: 'tests/camera-focused.png' });
  await page.getByRole('button', { name: 'Restart flow', exact: true }).click();
  await expect
    .poll(async () => {
      const v = await viewport(page);
      return (
        Math.abs(v.x - original.x) + Math.abs(v.y - original.y) + Math.abs(v.zoom - original.zoom)
      );
    })
    .toBeLessThan(0.1);
});

test('manual pan disables follow across steps and Auto Follow off preserves manual view', async ({
  page,
}) => {
  await page.goto('/architecture/chat/discord/send-message');
  await page.getByRole('button', { name: 'Play flow', exact: true }).click();
  await expect(page.locator('.world-packet')).toHaveCount(1);
  const pane = await page.locator('.react-flow__pane').boundingBox();
  if (!pane) throw new Error('Missing canvas');
  await page.mouse.move(pane.x + 25, pane.y + 25);
  await page.mouse.down();
  await page.mouse.move(pane.x + 140, pane.y + 95, { steps: 8 });
  await page.mouse.up();
  const manual = await viewport(page);
  await expect(page.locator('.world-step-heading')).toContainText('STEP 2');
  expect(await viewport(page)).toEqual(manual);
  await page.getByRole('button', { name: 'Pause flow', exact: true }).click();
  await page.getByRole('button', { name: 'Auto follow flow', exact: true }).click();
  await page.getByRole('button', { name: 'Resume flow', exact: true }).click();
  await expect(page.locator('.world-step-heading')).toContainText('STEP 3');
  expect(await viewport(page)).toEqual(manual);
});

test('parallel camera frames all destinations and adapts to a smaller viewport', async ({
  page,
}) => {
  await page.goto('/architecture/search/google/search-query');
  await page.getByRole('combobox', { name: 'Playback speed' }).selectOption('2');
  await page.getByRole('button', { name: 'Play flow', exact: true }).click();
  await expect(page.locator('.world-step-heading')).toContainText('PARALLEL', { timeout: 15000 });
  await expect(page.locator('.world-packet')).toHaveCount(2);
  await framed(page, ['rw-service', 'rw-shard-a', 'rw-shard-b']);
  await page.setViewportSize({ width: 700, height: 900 });
  await framed(page, ['rw-service', 'rw-shard-a', 'rw-shard-b']);
});

test('natural completion holds the final view then returns to the captured overview', async ({
  page,
}) => {
  await page.goto('/architecture/chat/discord/send-message');
  await expect(page.getByTestId('concept-rw-client')).toBeVisible();
  await settle(page);
  const original = await viewport(page);
  await page.getByRole('combobox', { name: 'Playback speed' }).selectOption('0');
  await page.getByRole('button', { name: 'Play flow', exact: true }).click();
  await expect(page.locator('.world-completion')).toBeVisible();
  const final = await viewport(page);
  await page.waitForTimeout(350);
  expect(await viewport(page)).toEqual(final);
  await expect
    .poll(async () => {
      const v = await viewport(page);
      return (
        Math.abs(v.x - original.x) + Math.abs(v.y - original.y) + Math.abs(v.zoom - original.zoom)
      );
    })
    .toBeLessThan(0.1);
  await expect(page.locator('.request-packet, .edge-active')).toHaveCount(0);
  await page.screenshot({ path: 'tests/camera-restored.png' });
});

test('mobile and reduced motion frame both ends without moving packets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/architecture/gaming/fortnite/movement');
  await page.getByRole('button', { name: 'Play flow', exact: true }).click();
  await framed(page, ['rw-client', 'rw-server']);
  await expect(page.locator('.request-packet')).toHaveCount(0);
  await page.getByRole('button', { name: 'Pause flow', exact: true }).click();
  const paused = await viewport(page);
  await page.waitForTimeout(250);
  expect(await viewport(page)).toEqual(paused);
});

test('switching scenarios restores the overview without a stale camera callback', async ({
  page,
}) => {
  await page.goto('/architecture/chat/discord/send-message');
  await expect(page.getByTestId('concept-rw-client')).toBeVisible();
  await settle(page);
  const original = await viewport(page);
  await page.getByRole('button', { name: 'Play flow', exact: true }).click();
  await expect(page.locator('.world-packet')).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Choose flow' }).selectOption('group-message');
  await expect
    .poll(async () => {
      const v = await viewport(page);
      return (
        Math.abs(v.x - original.x) + Math.abs(v.y - original.y) + Math.abs(v.zoom - original.zoom)
      );
    })
    .toBeLessThan(0.1);
  await expect(page.locator('.request-packet')).toHaveCount(0);
});

test('resume leaves the paused frame alone and re-enables following at the next step', async ({
  page,
}) => {
  await page.goto('/architecture/chat/discord/send-message');
  await page.getByRole('button', { name: 'Play flow', exact: true }).click();
  await expect(page.locator('.world-packet')).toHaveCount(1);
  const pane = await page.locator('.react-flow__pane').boundingBox();
  if (!pane) throw new Error('Missing canvas');
  await page.mouse.move(pane.x + 20, pane.y + 20);
  await page.mouse.down();
  await page.mouse.move(pane.x + 370, pane.y + 30, { steps: 5 });
  await page.mouse.up();
  await page.getByRole('button', { name: 'Pause flow', exact: true }).click();
  const paused = await viewport(page);
  await page.getByRole('button', { name: 'Resume flow', exact: true }).click();
  expect(await viewport(page)).toEqual(paused);
  await expect(page.locator('.world-step-heading')).toContainText('STEP 2');
  await expect(page.locator('.world-packet')).toHaveCount(1);
  await framed(page, ['rw-connection', 'rw-service']);
});

test('classic reset restores the overview and resuming its last step finishes without restarting', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('concept-client')).toBeVisible();
  await settle(page);
  const original = await viewport(page);
  await page.getByRole('button', { name: 'Visualize request', exact: true }).click();
  await expect(page.locator('.request-packet')).toHaveCount(1);
  await page.getByRole('button', { name: 'Pause flow', exact: true }).click();
  await page.getByRole('button', { name: 'Restart visualization', exact: true }).click();
  await expect(page.locator('.simulation-story')).toHaveCount(0);
  await expect
    .poll(async () => {
      const v = await viewport(page);
      return (
        Math.abs(v.x - original.x) + Math.abs(v.y - original.y) + Math.abs(v.zoom - original.zoom)
      );
    })
    .toBeLessThan(0.1);
  await page.getByRole('button', { name: 'Visualize request', exact: true }).click();
  await page.getByRole('button', { name: 'Pause flow', exact: true }).click();
  const last = page.locator('.story-progress button[aria-label^="Go to step"]').last();
  const label = await last.getAttribute('aria-label');
  await last.click();
  await page.getByRole('button', { name: 'Visualize request', exact: true }).click();
  await expect(page.locator('.story-progress button.current')).toHaveAttribute(
    'aria-label',
    label!,
  );
  await expect(page.locator('.simulation-story')).toHaveCount(0);
});
