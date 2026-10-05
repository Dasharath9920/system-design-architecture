import { expect, test } from '@playwright/test';

test('default surface is a light playground with only global navigation and canvas controls', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Find anything' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose architecture preset' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play flow' })).toBeVisible();
  await expect(page.locator('.connection-legend, .canvas-status, .version-mark')).toHaveCount(0);
  await expect(page.locator('.react-flow__minimap, .graph-band')).toHaveCount(0);
  await expect(page.getByText('Architecture lens', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Auto Follow', { exact: false })).toHaveCount(0);
  await expect(page.getByTestId('concept-client')).not.toContainText('CONCEPT');

  await expect(page.locator('.canvas-container')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await expect(page.locator('.canvas-container')).toHaveCSS('border-radius', '20px');
  await expect(page.getByTestId('concept-client')).toHaveCSS(
    'background-color',
    'rgb(238, 240, 243)',
  );

  await page.getByRole('button', { name: 'Challenges' }).click();
  const challengeModal = page.getByRole('dialog', { name: 'System design challenges' });
  await expect(challengeModal).toHaveCSS('background-color', 'rgb(251, 250, 255)');
  await expect(challengeModal.getByText('Easy', { exact: true })).toHaveCSS(
    'color',
    'rgb(52, 49, 59)',
  );
  await page.getByRole('button', { name: 'Close challenges' }).click();

  await page.locator('.react-flow__edge').first().hover({ force: true });
  await expect(page.locator('.edge-label').first()).toContainText(/REQUEST|ASYNC EVENT|TELEMETRY/);
  await expect(page.locator('.edge-label').first()).toContainText('→');
});

test('navbar theme control switches the full canvas and persists the preference', async ({
  page,
}) => {
  await page.goto('/');
  const client = page.getByTestId('concept-client');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();
  await expect(client).toHaveCSS('background-color', 'rgb(238, 240, 243)');

  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.universe-app')).toHaveClass(/theme-dark/);
  await expect(page.locator('.canvas-container')).toHaveCSS('background-color', 'rgb(16, 17, 23)');
  await expect(client).toHaveCSS('background-color', 'rgb(23, 25, 33)');
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeVisible();
});

test('world flow keeps advanced controls contextual and teaches through the graph', async ({
  page,
}) => {
  await page.goto('/architecture/chat/discord/send-message');
  await expect(page.locator('.world-context-options')).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Playback speed' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Flow options' }).click();
  const options = page.getByRole('dialog', { name: 'Flow options' });
  await expect(options.getByRole('combobox', { name: 'Playback speed' })).toBeVisible();
  await expect(options.getByRole('combobox', { name: 'Debug condition' })).toBeVisible();
  await options.getByRole('button', { name: 'Close flow options' }).click();

  await page.getByRole('button', { name: 'Play flow', exact: true }).click();
  await expect(page.locator('.world-step-card')).toBeVisible();
  await expect(page.locator('.world-step-count')).toContainText(/1 \/ \d+/);
  await expect(page.locator('.architecture-node.is-active')).toHaveCount(2);
  await expect(page.locator('.architecture-node.is-dimmed').first()).toHaveCSS('opacity', '0.42');
});

test('mobile keeps architecture identity, canvas, and controls inside the viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/architecture/chat/discord/send-message');
  await expect(page.getByRole('button', { name: 'Choose architecture preset' })).toContainText(
    'Messaging',
  );
  await expect(page.locator('.canvas-container')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Flow options' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  const controls = await page.locator('.canvas-tools').boundingBox();
  const player = await page.locator('.world-player-bar').boundingBox();
  expect(controls && player && controls.y + controls.height <= player.y).toBeTruthy();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('.universe-app')).toHaveClass(/theme-dark/);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});
