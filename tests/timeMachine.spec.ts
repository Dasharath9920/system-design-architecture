import { expect, test } from '@playwright/test';

test('generic web app scales through bottleneck, partial decision, fix, validation, and history', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Time Machine' }).click();
  const panel = page.getByRole('region', { name: 'Architecture Time Machine' });
  await expect(panel).toBeVisible();
  await expect(page.locator('[data-testid^="concept-"]')).toHaveCount(3);
  await expect(page.getByTestId('concept-services')).toContainText('CPU 18%');
  await expect(panel).toContainText('≈ 20 req/s');

  await panel.getByRole('button', { name: 'Test 10K users' }).click();
  await expect(panel.getByText('Traffic ramp')).toBeVisible();
  await expect(panel.getByText('APP SERVER BOTTLENECK')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('concept-services')).toHaveClass(/challenge-problem/);
  await expect(panel).toContainText('≈ 2K req/s');

  await panel.getByRole('button', { name: /Add Redis/ }).click();
  await expect(panel.getByText('PARTIAL IMPROVEMENT')).toBeVisible();
  await expect(panel).toContainText('application CPU remains');
  await panel.getByRole('button', { name: /Add app servers/ }).click();
  await expect(panel.getByText('Evolving architecture')).toBeVisible();
  await expect(page.getByTestId('concept-load-balancer')).toBeVisible();
  await expect(panel.getByText('Re-running workload')).toBeVisible();
  await expect(panel.getByText('System stable', { exact: true })).toBeVisible({ timeout: 5_000 });
  await expect(panel).toContainText('96%');
  await expect(panel).toContainText('42%');
  await expect(page.locator('[data-testid^="concept-"]')).toHaveCount(4);

  await page.getByRole('button', { name: '100 users, completed' }).click();
  await expect(page.locator('[data-testid^="concept-"]')).toHaveCount(3);
  await expect(panel).toContainText('Viewing a saved architecture stage');
  await panel.getByRole('button', { name: 'Return to 10K' }).click();
  await expect(page.getByTestId('concept-load-balancer')).toBeVisible();
});

test('time machine offers five scenario-specific starting architectures', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Time Machine' }).click();
  const panel = page.getByRole('region', { name: 'Architecture Time Machine' });
  const selector = panel.getByRole('combobox', { name: 'Choose Time Machine system' });

  const cases = [
    ['social-feed', 'concept-database'],
    ['messaging', 'concept-realtime'],
    ['video-streaming', 'concept-storage'],
    ['ecommerce', 'concept-services'],
  ];
  for (const [scenario, node] of cases) {
    await selector.selectOption(scenario);
    await expect(page.getByTestId(node)).toBeVisible();
    await expect(page.locator('[data-testid^="concept-"]')).toHaveCount(3);
  }
});

test('time machine remains usable with reduced motion on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Time Machine' }).click();
  const panel = page.getByRole('region', { name: 'Architecture Time Machine' });
  await panel.getByRole('button', { name: 'Test 10K users' }).click();
  await expect(panel.getByText('APP SERVER BOTTLENECK')).toBeVisible({ timeout: 2_000 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await expect(page.getByRole('navigation', { name: 'Architecture history' })).toBeVisible();
});
