import { expect, test, type Page } from '@playwright/test';

const nodes = (page: Page) => page.locator('[data-testid^="concept-"]');
const concept = (page: Page, id: string) => page.getByTestId(`concept-${id}`);
const overviewHeading = 'One system. A world of connections.';

async function openUniverse(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: overviewHeading })).toBeVisible();
  await expect(nodes(page)).toHaveCount(18);
  await expect(concept(page, 'client')).toBeVisible();
}

async function zoomPercent(page: Page): Promise<number> {
  return Number.parseInt(await page.locator('.canvas-tools > span').innerText(), 10);
}

async function viewport(page: Page): Promise<{ x: number; y: number; zoom: number }> {
  return page.locator('.react-flow__viewport').evaluate((element) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    return { x: matrix.e, y: matrix.f, zoom: matrix.a };
  });
}

async function settleViewport(page: Page): Promise<void> {
  // React Flow animates the camera. A rounded percentage can reach its final
  // value before the translation has settled, so observe the real transform.
  await page.locator('.react-flow__viewport').evaluate(async (element) => {
    let previous = '';
    let stableFrames = 0;
    const deadline = performance.now() + 3_000;
    await new Promise<void>((resolve, reject) => {
      const frame = () => {
        const current = getComputedStyle(element).transform;
        stableFrames = current === previous ? stableFrames + 1 : 0;
        previous = current;
        if (stableFrames >= 12) resolve();
        else if (performance.now() > deadline)
          reject(new Error('Architecture camera did not settle'));
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  });
}

test('opens directly into 18 non-overlapping components without runtime errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openUniverse(page);
  await expect(page.locator('.canvas-status')).toContainText('18 components');
  await expect(page.getByRole('button', { name: 'Visualize request', exact: true })).toBeVisible();
  await expect(page.getByRole('complementary')).toHaveCount(0);

  const boxes = await nodes(page).evaluateAll((elements) =>
    elements.map((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        id: element.getAttribute('data-testid'),
        x: bounds.x,
        y: bounds.y,
        right: bounds.right,
        bottom: bounds.bottom,
      };
    }),
  );
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      expect(
        a.x >= b.right || a.right <= b.x || a.y >= b.bottom || a.bottom <= b.y,
        `${a.id} overlaps ${b.id}`,
      ).toBeTruthy();
    }
  }
  expect(errors).toEqual([]);
});

test('inspects a component, follows its connections, and enters and exits focus', async ({
  page,
}) => {
  await openUniverse(page);
  await concept(page, 'cache').click();
  const inspector = page.getByRole('complementary', { name: 'Cache inspector', exact: true });
  await expect(inspector.getByRole('heading', { name: 'Cache', exact: true })).toBeVisible();
  await expect(inspector.getByRole('heading', { name: 'WHY IT EXISTS' })).toBeVisible();
  await expect(inspector.getByRole('heading', { name: 'THE TRADE-OFFS' })).toBeAttached();
  await inspector.getByRole('button', { name: /^Connections/ }).click();
  await expect(inspector.getByText('Cache lookup', { exact: true })).toBeVisible();
  await inspector.getByRole('button', { name: 'Focus component', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Focus mode' })).toBeVisible();
  await expect(page.locator('.architecture-node.is-dimmed').first()).toBeAttached();
  await inspector.getByRole('button', { name: 'Exit focus', exact: true }).click();
  await expect(page.locator('.architecture-node.is-dimmed')).toHaveCount(0);
  await inspector.getByRole('button', { name: 'Close inspector' }).click();
  await expect(page.getByRole('complementary')).toHaveCount(0);
});

test('expands cache and Redis, then collapses through the breadcrumb', async ({ page }) => {
  await openUniverse(page);
  await page.getByRole('button', { name: 'Explore Cache', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inside Cache', exact: true })).toBeVisible();
  await expect(concept(page, 'redis')).toBeVisible();
  await expect(concept(page, 'client')).toHaveCount(0);
  await page.getByRole('button', { name: 'Explore Redis', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inside Redis', exact: true })).toBeVisible();
  await expect(concept(page, 'redis-cluster')).toBeVisible();
  await page.locator('.breadcrumb').getByRole('button', { name: 'Cache', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inside Cache', exact: true })).toBeVisible();
  await page.locator('.breadcrumb').getByRole('button', { name: 'Universe', exact: true }).click();
  await expect(nodes(page)).toHaveCount(18);
  await expect(page.getByRole('heading', { name: overviewHeading })).toBeVisible();
});

test('keyboard search reveals Redis in its architecture and supports empty results', async ({
  page,
}) => {
  await openUniverse(page);
  await page.keyboard.press('Control+k');
  const search = page.getByRole('dialog', { name: 'Search the universe' });
  await expect(search).toBeVisible();
  await search.getByRole('textbox', { name: 'Search concepts' }).fill('Redis');
  await search
    .getByRole('button')
    .filter({ has: page.locator('strong', { hasText: /^Redis$/ }) })
    .click();
  await expect(search).toHaveCount(0);
  await expect(
    page.getByRole('complementary', { name: 'Redis inspector', exact: true }),
  ).toBeVisible();
  await expect(concept(page, 'redis')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Inside Cache', exact: true })).toBeVisible();
  await page.keyboard.press('Control+k');
  await search.getByRole('textbox', { name: 'Search concepts' }).fill('no-such-concept-zzzzzz');
  await expect(search.getByText('No matching concepts yet')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(search).toHaveCount(0);
});

test('search intent configures a video architecture instead of leaving the canvas', async ({
  page,
}) => {
  await openUniverse(page);
  await page.keyboard.press('Control+k');
  await page
    .getByRole('textbox', { name: 'Search concepts' })
    .fill('How does Netflix-scale video delivery work?');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Explore Netflix/ })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/architecture\/video\/netflix\/playback/);
  await expect(concept(page, 'rw-storage')).toBeVisible();
  await expect(concept(page, 'rw-cdn')).toContainText('Open Connect Appliance');
  await expect(concept(page, 'rw-realtime')).toHaveCount(0);
});

test('zoom, drag pan, fit, keyboard pan, and reset manipulate the viewport', async ({ page }) => {
  await openUniverse(page);
  // Fitting settles the initial camera before its geometry is compared.
  await page.getByRole('button', { name: 'Fit architecture', exact: true }).click();
  await settleViewport(page);
  await expect.poll(() => zoomPercent(page)).toBeGreaterThan(20);
  const initialZoom = await zoomPercent(page);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await settleViewport(page);
  await expect.poll(() => zoomPercent(page)).toBeGreaterThan(initialZoom);
  await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await settleViewport(page);
  await expect
    .poll(async () => Math.abs((await zoomPercent(page)) - initialZoom))
    .toBeLessThanOrEqual(2);

  const beforePan = await viewport(page);
  const pane = await page.locator('.react-flow__pane').boundingBox();
  if (!pane) throw new Error('Architecture pane has no geometry');
  await page.mouse.move(pane.x + 16, pane.y + pane.height / 2);
  await page.mouse.down();
  await page.mouse.move(pane.x + 140, pane.y + pane.height / 2 + 60, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => Math.abs((await viewport(page)).x - beforePan.x))
    .toBeGreaterThan(50);

  await page.getByRole('button', { name: 'Fit architecture', exact: true }).click();
  await expect.poll(async () => Math.abs((await viewport(page)).x - beforePan.x)).toBeLessThan(3);
  // Move focus to the page so arrow keys pan the canvas, not a selected node.
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  const fitted = await viewport(page);
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await viewport(page)).x).toBeLessThan(fitted.x - 50);
  await page.getByRole('button', { name: 'Reset universe', exact: true }).click();
  await expect.poll(async () => Math.abs((await viewport(page)).x - fitted.x)).toBeLessThan(3);
  await expect(nodes(page)).toHaveCount(18);
});

test('clicking a graph edge explains the actual connection', async ({ page }) => {
  await openUniverse(page);
  const path = page.locator(
    '.react-flow__edge[data-id="services-cache"] .react-flow__edge-interaction',
  );
  await expect(path).toHaveCount(1);
  // SVG curves have mostly empty bounding boxes. Dispatch on the actual path,
  // rather than asking Playwright to click the empty center of that box.
  await path.dispatchEvent('click', { bubbles: true });
  const inspector = page.getByRole('complementary', { name: 'Connection inspector' });
  await expect(inspector.getByRole('heading', { name: 'Cache lookup', exact: true })).toBeVisible();
  await expect(inspector.getByText(/The application asks the cache/)).toBeVisible();
  await expect(
    inspector.getByRole('button', { name: 'Application Services', exact: true }),
  ).toBeVisible();
  await inspector.getByRole('button', { name: 'Close inspector' }).click();
  await expect(inspector).toHaveCount(0);
});

test('presets select the appropriate graph and reset restores production', async ({ page }) => {
  await openUniverse(page);
  await page.locator('.preset-trigger').click();
  await page.getByRole('button', { name: /^URL shortener / }).click();
  await expect(page.locator('.breadcrumb')).toContainText('URL shortener');
  await expect(nodes(page)).toHaveCount(12);
  await expect(concept(page, 'auth')).toHaveCount(0);
  await expect(concept(page, 'database')).toBeVisible();
  await page.getByRole('button', { name: 'Reset universe', exact: true }).click();
  await expect(page.locator('.breadcrumb')).toContainText('Production system');
  await expect(nodes(page)).toHaveCount(18);
});

test('request visualization plays, pauses, advances, and closes', async ({ page }) => {
  await openUniverse(page);
  await page.getByRole('button', { name: 'Visualize request', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause flow', exact: true })).toBeVisible();
  await expect(page.locator('.simulation-story')).toContainText('Resolve the hostname');
  await expect(page.locator('.request-packet').first()).toBeAttached();
  await page.getByRole('button', { name: 'Pause flow', exact: true }).click();
  await page.getByRole('button', { name: 'Go to step 1', exact: true }).click();
  const before = await page.locator('.story-text strong').innerText();
  await page.getByRole('button', { name: 'Next simulation step', exact: true }).click();
  await expect(page.locator('.story-text strong')).not.toHaveText(before);
  await expect(page.locator('.simulation-story')).toContainText('Keep the answer until its TTL');
  await expect(page.getByRole('button', { name: 'Visualize request', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close visualization' }).click();
  await expect(page.locator('.simulation-story')).toHaveCount(0);
  await expect(page.locator('.request-packet')).toHaveCount(0);
});

test('completed visualization clears its last frame and resets to the beginning', async ({
  page,
}) => {
  await openUniverse(page);
  await page.getByRole('button', { name: 'Choose request scenario' }).click();
  await page.getByRole('button', { name: /Edge cache hit/ }).click();
  await page.getByRole('button', { name: 'Visualize request', exact: true }).click();

  await expect(page.locator('.simulation-story')).toContainText('Resolve the hostname');
  await expect(page.locator('.simulation-story')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator('.request-packet')).toHaveCount(0);
  await expect(page.locator('.architecture-node.is-active')).toHaveCount(0);
  await expect(page.locator('.architecture-edge.edge-active')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Visualize request', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restart visualization' })).toHaveCount(0);

  // Starting again begins at step one rather than reviving the terminal frame.
  await page.getByRole('button', { name: 'Visualize request', exact: true }).click();
  await expect(page.locator('.simulation-story')).toContainText('Resolve the hostname');
});

test('traffic changes capacity, and cache failure shows a recoverable bypass', async ({ page }) => {
  await openUniverse(page);
  await page.getByRole('button', { name: 'Adjust traffic' }).click();
  await page.getByRole('button', { name: 'Surge', exact: true }).click();
  await expect(page.locator('.scale-notice')).toContainText('6 service instances');
  await expect(concept(page, 'services')).toContainText('6 instances');
  await expect(concept(page, 'database')).toContainText('2 read replicas');
  await page.getByRole('button', { name: 'Adjust traffic' }).click();
  await concept(page, 'cache').click();
  await page
    .getByRole('complementary', { name: 'Cache inspector' })
    .getByRole('button', { name: 'Simulate failure' })
    .click();
  await expect(concept(page, 'cache')).toHaveClass(/is-failed/);
  await expect(page.locator('.failure-notice')).toContainText('Cache unavailable');
  await expect(page.locator('.failure-notice')).toContainText('reads the database directly');
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await page.getByRole('button', { name: 'Visualize request', exact: true }).click();
  await page.getByRole('button', { name: 'Pause flow', exact: true }).click();
  await page.getByRole('button', { name: 'Go to step 10', exact: true }).click();
  await expect(page.locator('.simulation-story')).toContainText('Cache timeout · bypass the cache');
  await page.getByRole('button', { name: 'Next simulation step', exact: true }).click();
  await expect(page.locator('.simulation-story')).toContainText('Database traffic increases');
  await page
    .locator('.failure-notice')
    .getByRole('button', { name: 'Recover', exact: true })
    .click();
  await expect(concept(page, 'cache')).not.toHaveClass(/is-failed/);
  await expect(page.locator('.failure-notice')).toHaveCount(0);
  await expect(page.locator('.simulation-story')).toHaveCount(0);
});

test('PostgreSQL playback stays inside its architecture and illuminates the primary and WAL', async ({
  page,
}) => {
  await openUniverse(page);
  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: 'Search concepts' }).fill('PostgreSQL');
  await page
    .getByRole('dialog')
    .getByRole('button')
    .filter({ has: page.locator('strong', { hasText: /^PostgreSQL$/ }) })
    .click();
  const inspector = page.getByRole('complementary', { name: 'PostgreSQL inspector', exact: true });
  await inspector.getByRole('button', { name: /^Explore \d+ concepts$/ }).click();
  await expect(page.getByRole('heading', { name: 'Inside PostgreSQL', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Visualize request', exact: true }).click();
  await expect(page.locator('.simulation-story')).toContainText('Borrow a bounded connection');
  await expect(concept(page, 'pg-primary')).toHaveClass(/is-active/);
  await expect(concept(page, 'connection-pool')).toHaveClass(/is-active/);
  await expect(concept(page, 'client')).toHaveCount(0);
  await page.getByRole('button', { name: 'Pause flow', exact: true }).click();
  await page.getByRole('button', { name: 'Next simulation step', exact: true }).click();
  await expect(concept(page, 'wal')).toHaveClass(/is-active/);
  await expect(page.getByRole('heading', { name: 'Inside PostgreSQL', exact: true })).toBeVisible();
});

test('semantic zoom expands a selected component and collapses when zoomed out', async ({
  page,
}) => {
  await openUniverse(page);
  await concept(page, 'cache').click();
  await expect(
    page.getByRole('complementary', { name: 'Cache inspector', exact: true }),
  ).toBeVisible();
  // Depth changes deliberately suppress semantic zoom for 1.1 seconds so a
  // programmatic fit cannot immediately undo the navigation that caused it.
  await page.waitForTimeout(1_200);
  await settleViewport(page);
  const deepHeading = page.getByRole('heading', { name: 'Inside Cache', exact: true });
  for (let count = 0; count < 8 && !(await deepHeading.isVisible()); count++) {
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await settleViewport(page);
  }
  await expect(deepHeading).toBeVisible();
  await expect(concept(page, 'redis')).toBeVisible();
  await page.waitForTimeout(1_200);
  const rootHeading = page.getByRole('heading', { name: overviewHeading });
  for (let count = 0; count < 10 && !(await rootHeading.isVisible()); count++) {
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
    await settleViewport(page);
  }
  await expect(rootHeading).toBeVisible();
  await expect(nodes(page)).toHaveCount(18);
});

test('searching for a root outside the current preset reveals it in production', async ({
  page,
}) => {
  await openUniverse(page);
  await page.getByRole('button', { name: 'Choose architecture preset', exact: true }).click();
  await page.getByRole('button', { name: /^URL shortener / }).click();
  await expect(concept(page, 'notifications')).toHaveCount(0);
  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: 'Search concepts' }).fill('Notifications');
  await page
    .getByRole('dialog')
    .getByRole('button')
    .filter({ has: page.locator('strong', { hasText: /^Notifications$/ }) })
    .click();
  await expect(page.locator('.breadcrumb')).toContainText('Production system');
  await expect(concept(page, 'notifications')).toBeVisible();
  await expect(
    page.getByRole('complementary', { name: 'Notifications inspector', exact: true }),
  ).toBeVisible();
  await expect(nodes(page)).toHaveCount(18);
});

test.describe('small screen', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('keeps the canvas usable and opens inspection as a contained bottom sheet', async ({
    page,
  }) => {
    await openUniverse(page);
    await expect(page.getByRole('button', { name: 'Find anything' })).toBeVisible();
    await page.getByRole('button', { name: 'Find anything' }).click();
    await page.getByRole('textbox', { name: 'Search concepts' }).fill('Redis');
    await page
      .getByRole('dialog')
      .getByRole('button')
      .filter({ has: page.locator('strong', { hasText: /^Redis$/ }) })
      .click();
    const inspector = page.getByRole('complementary', { name: 'Redis inspector', exact: true });
    await expect(inspector).toBeVisible();
    const bounds = await inspector.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    await inspector.getByRole('button', { name: 'Close inspector' }).click();
    await page
      .locator('.breadcrumb')
      .getByRole('button', { name: 'Universe', exact: true })
      .click();
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await page.getByRole('button', { name: 'Fit architecture', exact: true }).click();
    await expect(nodes(page)).toHaveCount(18);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('teaches each request step without animated packets', async ({ page }) => {
    await openUniverse(page);
    await page.getByRole('button', { name: 'Visualize request', exact: true }).click();
    await expect(page.locator('.simulation-story')).toBeVisible();
    await expect(page.locator('.architecture-node.is-active').first()).toBeVisible();
    await expect(page.locator('.request-packet')).toHaveCount(0);
    await page.getByRole('button', { name: 'Pause flow', exact: true }).click();
    await page.getByRole('button', { name: 'Next simulation step', exact: true }).click();
    await expect(page.locator('.request-packet')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Close visualization' })).toBeVisible();
  });
});
