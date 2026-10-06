import { expect, test, type Page } from '@playwright/test';

async function search(page: Page, query: string) {
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('textbox', { name: 'Search concepts' }).fill(query);
  await page
    .getByRole('button', { name: /X-Ray ·/ })
    .first()
    .click();
  await expect(page.getByRole('region', { name: 'X-Ray mode' })).toBeVisible();
}

test('component entry, progressive depth, step/reset, and exact viewport restoration', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByTestId('concept-database').click();
  await page.waitForTimeout(750);
  const transform = await page
    .locator('.canvas-container .react-flow__viewport')
    .getAttribute('style');
  await page.getByRole('button', { name: 'X-Ray · Open internals' }).click();
  const xray = page.getByRole('region', { name: 'X-Ray mode' });
  await expect(
    xray.getByRole('heading', { name: 'PostgreSQL', exact: true }).first(),
  ).toBeVisible();
  await xray.locator('.xray-node').filter({ hasText: 'MVCC & locks' }).click();
  await xray.getByRole('button', { name: 'Dive deeper' }).click();
  await expect(xray.getByRole('heading', { name: 'MVCC', exact: true, level: 2 })).toBeVisible();
  await xray.getByRole('button', { name: 'Next demonstration step' }).click();
  await expect(xray.locator('.xray-demo-caption')).toContainText('A starts');
  await xray.getByRole('button', { name: 'Next demonstration step' }).click();
  await expect(xray.locator('.xray-demo-caption')).toContainText('B commits v2');
  await xray.getByRole('button', { name: 'Reset demonstration' }).click();
  await expect(xray.locator('.xray-node code')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/xray-light.png' });
  await xray.getByRole('button', { name: 'Return to architecture' }).click();
  await expect(xray).toBeHidden();
  await expect(page.locator('.canvas-container .react-flow__viewport')).toHaveAttribute(
    'style',
    transform!,
  );
  await expect(page.getByRole('button', { name: 'X-Ray · Open internals' })).toBeFocused();
  expect(errors).toEqual([]);
});

test('search opens mechanisms, playback completes without lingering animation, and Escape goes back', async ({
  page,
}) => {
  await page.goto('/');
  await search(page, 'Kafka ISR');
  const xray = page.getByRole('region', { name: 'X-Ray mode' });
  await expect(xray.getByRole('heading', { name: 'ISR & KRaft', level: 2 })).toBeVisible();
  await xray.locator('.xray-demo').getByRole('button', { name: 'Show me', exact: true }).click();
  await expect(xray.locator('.xray-demo-caption')).toContainText('Another replica fails', {
    timeout: 12000,
  });
  await expect(
    xray.locator('.xray-demo').getByRole('button', { name: 'Show me', exact: true }),
  ).toBeVisible({ timeout: 4000 });
  await expect(xray.locator('.xray-node.active, .react-flow__edge.animated')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(xray.getByRole('heading', { name: 'Kafka', exact: true }).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(xray).toBeHidden();
});

test('challenge exploration preserves the diagnosis and exact return state', async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.31;
    sessionStorage.clear();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Challenges', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'System design challenges' })
    .getByRole('button', { name: /Medium/ })
    .click();
  const panel = page.getByRole('complementary', { name: 'Active system design challenge' });
  await panel.getByRole('button', { name: 'Run flow', exact: true }).click();
  await page.getByRole('button', { name: 'Flow options' }).click();
  await page.getByRole('combobox', { name: 'Playback speed' }).selectOption('0');
  await page.getByRole('button', { name: 'Close flow options' }).click();
  await expect(panel).toContainText('Where would you change the design?', { timeout: 12000 });
  const text = await panel.innerText();
  await panel.getByRole('button', { name: 'Understand this component' }).click();
  await expect(
    page.getByRole('heading', { name: 'Read replicas', exact: true, level: 2 }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Return to Challenge' }).click();
  await expect(panel).toHaveText(text, { useInnerText: true });
});

test('mobile reduced-motion X-Ray keeps controls accessible in both themes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('sdu-theme', 'dark'));
  await page.goto('/');
  await search(page, 'token bucket');
  const xray = page.getByRole('region', { name: 'X-Ray mode' });
  await expect(xray.getByRole('heading', { name: 'Token bucket', level: 2 })).toBeVisible();
  await xray.getByRole('button', { name: 'Next demonstration step' }).click();
  await expect(xray.locator('.xray-demo-caption')).toContainText('Refill');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: 'test-results/xray-mobile-dark.png' });
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(xray).toBeHidden();
});

test('Time Machine returns to its current stage after exploring an added component', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Time Machine', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Architecture Time Machine' });
  await panel.getByRole('button', { name: 'Test 10K users' }).click();
  await expect(panel).toContainText('APP SERVER BOTTLENECK');
  await panel.getByRole('button', { name: /Add app servers/ }).click();
  await expect(panel).toContainText('System stable');
  await panel.getByRole('button', { name: /Why was Load Balancer added/ }).click();
  await expect(page.getByRole('region', { name: 'X-Ray mode' })).toBeVisible();
  await page.getByRole('button', { name: 'Return to Time Machine' }).click();
  await expect(panel).toContainText('System stable');
  await expect(page.getByTestId('concept-load-balancer')).toBeVisible();
});

test('X-Ray suspends an in-progress traffic ramp and resumes without rewinding users', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Time Machine', exact: true }).click();
  await page.getByRole('button', { name: 'Test 10K users' }).click();
  await page.waitForTimeout(450);
  await search(page, 'MVCC');
  const readUsers = () =>
    page.evaluate<number>(
      "import('/src/time-machine/state.ts').then(({useTimeMachine}) => useTimeMachine.getState().rampUsers)",
    );
  const users = await readUsers();
  await page.waitForTimeout(500);
  expect(await readUsers()).toBe(users);
  await page.getByRole('button', { name: 'Return to Time Machine' }).click();
  await page.waitForTimeout(200);
  expect(await readUsers()).toBeGreaterThanOrEqual(users);
  await expect(page.getByRole('region', { name: 'Architecture Time Machine' })).toContainText(
    'APP SERVER BOTTLENECK',
  );
});
