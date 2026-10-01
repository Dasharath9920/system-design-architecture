import { test, expect } from '@playwright/test';

const showcases = [
  ['social/instagram/home-feed', 'rw-client', 'feed'],
  ['chat/discord/send-message', 'rw-client', 'delivered'],
  ['video/netflix/playback', 'rw-client', 'playing'],
  ['ride/uber/request-ride', 'rw-client', 'matched'],
  ['commerce/amazon/place-order', 'rw-client', 'confirmed'],
  ['search/google/search-query', 'rw-client', 'results'],
  ['files/dropbox/upload-file', 'rw-device', 'synced'],
  ['music/spotify/play-song', 'rw-client', 'playing'],
  ['gaming/fortnite/movement', 'rw-client', 'reconciled'],
  ['payments/stripe/make-payment', 'rw-client', 'authorized'],
];
for (const [route, client, result] of showcases) {
  test(`${route}: completion is quiet, client reflects result, restart clears the story`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/architecture/${route}`);
    await page.getByRole('combobox', { name: 'Playback speed' }).selectOption('0');
    await page.getByRole('button', { name: 'Play flow', exact: true }).click();
    await expect(page.locator('.world-completion')).toBeVisible();
    await expect(page.getByTestId(`concept-${client}`).locator('.client-preview')).toHaveAttribute(
      'data-preview-state',
      result,
    );
    await expect(
      page.locator(
        '.request-packet, .packet-following, .edge-active, .architecture-node.is-active, .node-processing',
      ),
    ).toHaveCount(0);
    await expect.poll(() => page.locator('.edge-visited').count()).toBeGreaterThan(0);
    await page.screenshot({ path: `tests/showcase-${route.split('/')[0]}.png` });
    await page.getByRole('button', { name: 'Restart flow', exact: true }).click();
    await expect(page.locator('.world-completion, .edge-visited')).toHaveCount(0);
    await expect(page.getByTestId(`concept-${client}`).locator('.client-preview')).toHaveAttribute(
      'data-preview-state',
      'idle',
    );
    expect(errors).toEqual([]);
  });
}

test('cinematic start, packet inspection, backward scrub, cinema escape, and trace close', async ({
  page,
}) => {
  await page.goto('/architecture/chat/discord/send-message');
  await page.getByRole('button', { name: 'Play flow', exact: true }).click();
  await expect(page.locator('.scenario-slate')).toBeVisible();
  await expect(page.locator('.request-packet')).toHaveCount(0);
  await expect(page.locator('.world-packet')).toHaveCount(1);
  await page.getByRole('button', { name: 'Pause flow' }).click();
  await page.locator('.world-packet').press('Enter');
  await expect(page.getByRole('complementary')).toContainText('Hello');
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await page.getByRole('slider', { name: 'Scrub flow' }).fill('10000');
  await page.getByRole('slider', { name: 'Scrub flow' }).fill('0');
  await expect(page.getByTestId('concept-rw-client').locator('.client-preview')).toHaveAttribute(
    'data-preview-state',
    'sending',
  );
  await page.getByRole('button', { name: 'Cinema mode', exact: true }).click();
  await expect(page.locator('.universe-app')).toHaveClass(/cinema-mode/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.universe-app')).not.toHaveClass(/cinema-mode/);
  await page.getByRole('combobox', { name: 'Architecture lens' }).selectOption('observability');
  await expect(
    page.getByRole('complementary', { name: 'Simulated distributed trace' }),
  ).toContainText('SIMULATED LATENCY');
  await page.getByRole('button', { name: 'Close trace' }).click();
  await expect(page.locator('.trace-panel')).toHaveCount(0);
});

test('explicit motion off preserves learning and disables packet and node animations', async ({
  page,
}) => {
  await page.goto('/architecture/video/netflix/playback');
  await page.getByRole('combobox', { name: 'Motion preference' }).selectOption('off');
  await page.getByRole('button', { name: 'Play flow', exact: true }).click();
  await expect(page.locator('.architecture-node.is-active')).toHaveCount(2);
  await expect(page.locator('.semantic-packet')).toHaveCount(0);
  expect(
    await page
      .locator('.architecture-node')
      .evaluateAll(
        (nodes) =>
          nodes
            .flatMap((n) => n.getAnimations({ subtree: true }))
            .filter((a) => a.playState === 'running').length,
      ),
  ).toBe(0);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Motion preference' })).toHaveValue('off');
});

test('queue sandbox retains a burst while consumers pause and resumes after adding a consumer', async ({
  page,
}) => {
  await page.goto('/architecture/chat/discord/group-message');
  await page.getByTestId('concept-rw-events').click();
  await page.getByRole('button', { name: 'Produce a burst', exact: true }).click();
  await expect(page.getByTestId('concept-rw-events')).toContainText('14 PENDING');
  await page.getByRole('button', { name: 'Pause consumers', exact: true }).click();
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await page.getByRole('combobox', { name: 'Playback speed' }).selectOption('0');
  await page.getByRole('button', { name: 'Play flow', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume flow', exact: true })).toContainText(
    'Consumer paused',
  );
  await expect(page.locator('.world-step-heading')).toContainText('STEP 4');
  await expect(page.locator('.request-packet')).toHaveCount(0);
  await page.getByRole('button', { name: 'Resume flow', exact: true }).click();
  await page.getByRole('button', { name: 'Add consumer (1)', exact: true }).click();
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await page.getByRole('button', { name: 'Resume flow', exact: true }).click();
  await expect(page.locator('.world-completion')).toBeVisible();
  await expect(page.getByTestId('concept-rw-events')).toContainText('13 PENDING');
});

test('concept failover demonstration distinguishes the failed primary from the promoted standby', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('concept-database').click();
  await page.getByRole('button', { name: /Show me/ }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next concept step' }).click();
  await expect(page.locator('.concept-demo')).toContainText('UNREACHABLE');
  await expect(page.locator('.concept-demo')).toContainText('PROMOTED');
  await expect(page.getByRole('button', { name: 'Next concept step' })).toBeDisabled();
  await page.getByRole('button', { name: 'Reset concept demonstration' }).click();
  await expect(page.locator('.concept-demo svg[role="img"]')).toHaveCount(0);
});
