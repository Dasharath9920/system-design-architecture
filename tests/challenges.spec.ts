import { expect, test, type Page } from '@playwright/test';

async function openChallenge(page: Page, difficulty: 'Easy' | 'Medium' | 'Hard', selection = 0) {
  await page.addInitScript((value) => {
    Math.random = () => value;
    sessionStorage.clear();
  }, selection);
  await page.goto('/');
  await page.getByRole('button', { name: 'Challenges', exact: true }).click();
  const selector = page.getByRole('dialog', { name: 'System design challenges' });
  await expect(selector).toContainText('Choose difficulty');
  await expect(selector.getByRole('button', { name: /Easy/ })).toBeVisible();
  await expect(selector.getByRole('button', { name: /Medium/ })).toBeVisible();
  await expect(selector.getByRole('button', { name: /Hard/ })).toBeVisible();
  await selector.getByRole('button', { name: new RegExp(`^${difficulty}`) }).click();
  await expect(
    page.getByRole('complementary', { name: 'Active system design challenge' }),
  ).toBeVisible();
}

async function finishFlow(page: Page, buttonName: 'Run flow' | 'Test fix') {
  await page.getByRole('button', { name: buttonName, exact: true }).click();
  await page.getByRole('button', { name: 'Flow options' }).click();
  await page.getByRole('combobox', { name: 'Playback speed' }).selectOption('0');
  await page.getByRole('button', { name: 'Close flow options' }).click();
  await expect(
    page.getByRole('complementary', { name: 'Active system design challenge' }),
  ).toContainText(
    buttonName === 'Run flow'
      ? 'Where would you change the design?'
      : /SOLVED|BOTTLENECK REMAINS|PROBLEM UNCHANGED/,
    { timeout: 10000 },
  );
  await expect(page.locator('.request-packet, .architecture-node.is-active')).toHaveCount(0);
}

test('easy challenge runs the baseline, applies a contextual fix, and solves the same workload', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openChallenge(page, 'Easy');
  const panel = page.getByRole('complementary', { name: 'Active system design challenge' });
  await expect(panel).toContainText('Single Server Overload');
  await expect(panel).not.toContainText('SIMULATED');
  await expect(page).toHaveURL(/architecture\/commerce\/generic\/app-overload-challenge$/);

  await finishFlow(page, 'Run flow');
  await expect(page.getByRole('status').filter({ hasText: 'DIAGNOSE' })).toBeVisible();
  await expect(page.getByTestId('concept-rw-service')).toContainText('SIMULATED');
  await page.getByTestId('concept-rw-service').hover();
  await expect(page.getByTestId('concept-rw-service')).toContainText('Modify');
  await page.getByTestId('concept-rw-service').click();
  const actions = page.getByRole('dialog', { name: 'Modify architecture' });
  const choices = actions.locator('.challenge-popover-options > button');
  await expect(choices).toHaveCount(2);
  await expect(choices.first()).not.toContainText('Add load balancer');
  await actions.getByRole('button', { name: /Add load balancer \+ instances/ }).click();
  await actions.getByRole('button', { name: 'Apply change' }).click();
  await expect(page.getByTestId('concept-challenge-add_load_balancer')).toBeVisible();
  await expect(panel).toContainText('Architecture updated');

  await finishFlow(page, 'Test fix');
  await expect(panel).toContainText('SOLVED');
  await expect(panel).toContainText('Scale replaceable application instances horizontally');
  await expect(panel).toContainText('54%');
  await expect(panel).toContainText('98%');
  await expect(page.locator('.world-completion')).toBeHidden();
  await panel.getByRole('button', { name: /Next challenge/ }).click();
  await expect(panel).toContainText('Read-Heavy Database');
  expect(errors).toEqual([]);
});

test('medium challenge reports partial improvement and reset clears the proposed change', async ({
  page,
}) => {
  await openChallenge(page, 'Medium');
  const panel = page.getByRole('complementary', { name: 'Active system design challenge' });
  await expect(panel).toContainText('Cache Stampede');
  await finishFlow(page, 'Run flow');

  await page.getByTestId('concept-rw-posts').click();
  const actions = page.getByRole('dialog', { name: 'Modify architecture' });
  await actions.getByRole('button', { name: /Add read replica/ }).click();
  await actions.getByRole('button', { name: 'Apply change' }).click();
  await finishFlow(page, 'Test fix');
  await expect(panel).toContainText('BOTTLENECK REMAINS');
  await expect(panel).not.toContainText('Problem remains');
  await expect(panel).toContainText('Replica capacity absorbs part of the spike');

  await panel.getByRole('button', { name: 'More challenge options' }).click();
  await panel.getByRole('button', { name: /Reset challenge/ }).click();
  await expect(panel).not.toContainText('BOTTLENECK REMAINS');
  await expect(panel).not.toContainText('Add read replica');
  await expect(page.getByTestId('concept-rw-posts')).not.toContainText('Add read replica');
});

test('stale replica read is diagnosed on the graph and rerouted on the same replay', async ({
  page,
}) => {
  await openChallenge(page, 'Medium', 0.31);
  const panel = page.getByRole('complementary', { name: 'Active system design challenge' });
  await expect(panel).toContainText('I Saved It, Then It Disappeared');
  await finishFlow(page, 'Run flow');
  await expect(panel).toContainText('immediate read returned an older version');
  await expect(page.getByTestId('concept-rw-metadata')).toContainText('STALE VERSION');
  await expect(page.getByTestId('concept-rw-client')).toContainText('Expected v2');

  const readEdge = page.getByRole('group', { name: 'Edge from rw-gateway to rw-replica' });
  await page.waitForTimeout(700);
  const hitPoint = await readEdge.locator('.react-flow__edge-interaction').evaluate((element) => {
    const path = element as SVGPathElement;
    const samples: string[] = [];
    for (let fraction = 0.1; fraction < 0.95; fraction += 0.05) {
      const point = path
        .getPointAtLength(path.getTotalLength() * fraction)
        .matrixTransform(path.getScreenCTM()!);
      const hit = document.elementFromPoint(point.x, point.y);
      samples.push(`${Math.round(point.x)},${Math.round(point.y)}:${hit?.getAttribute('class')}`);
      if (hit?.closest('[data-id="rw-gateway--rw-replica"]')) return { x: point.x, y: point.y };
    }
    throw new Error(`No visible hit segment on read edge: ${samples.join(' | ')}`);
  });
  await page.mouse.move(hitPoint.x, hitPoint.y);
  await expect(page.getByText('MODIFY FLOW')).toBeVisible();
  await readEdge.locator('.architecture-edge').focus();
  await readEdge.locator('.architecture-edge').press('Enter');
  const actions = page.getByRole('dialog', { name: 'Modify architecture' });
  await actions.getByRole('button', { name: /Use read-your-writes routing/ }).click();
  await actions.getByRole('button', { name: 'Apply change' }).click();
  await expect(panel).toContainText('Architecture updated');
  await finishFlow(page, 'Test fix');
  await expect(panel).toContainText('SOLVED');
  await expect(page.getByTestId('concept-rw-client')).toContainText('Latest version v2');
  await expect(panel).toContainText('Writer affinity reduces read distribution');
});

test('hard challenge reveals progressive guidance and can apply the authored solution', async ({
  page,
}) => {
  await openChallenge(page, 'Hard');
  const panel = page.getByRole('complementary', { name: 'Active system design challenge' });
  await expect(panel).toContainText('The Celebrity Problem');
  await panel.getByRole('button', { name: /Hint/ }).click();
  await expect(panel).toContainText('WHAT TO OBSERVE');
  await expect(panel).not.toContainText('WHERE TO LOOK');
  await panel.getByRole('button', { name: /Hint/ }).click();
  await expect(panel).toContainText('WHERE TO LOOK');
  await panel.getByRole('button', { name: 'More challenge options' }).click();
  await panel.getByRole('button', { name: 'Show solution', exact: true }).click();
  await page.getByRole('button', { name: 'Flow options' }).click();
  await page.getByRole('combobox', { name: 'Playback speed' }).selectOption('0');
  await page.getByRole('button', { name: 'Close flow options' }).click();
  await expect(panel).toContainText('WHY IT WORKS');
  await expect(panel).toContainText('SOLVED');
  await expect(panel).toContainText('Hybrid fanout chooses strategy');
});

test('challenge selector and panel fit on a mobile viewport without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openChallenge(page, 'Easy');
  await expect(
    page.getByRole('complementary', { name: 'Active system design challenge' }),
  ).toBeVisible();
  await finishFlow(page, 'Run flow');
  await expect(page.getByRole('status').filter({ hasText: 'DIAGNOSE' })).toBeVisible();
  await page.getByTestId('concept-rw-service').click();
  const popover = page.getByRole('dialog', { name: 'Modify architecture' });
  await expect(popover).toBeVisible();
  expect(
    await popover.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
    }),
  ).toBeTruthy();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});

test('refresh keeps challenge mode and randomizes away from the previous challenge', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Challenges', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'System design challenges' })
    .getByRole('button', { name: /^Easy/ })
    .click();
  const panel = page.getByRole('complementary', { name: 'Active system design challenge' });
  await expect(panel).toContainText('Single Server Overload');
  await page.reload();
  await expect(panel).toContainText('Read-Heavy Database');
  await expect(page).toHaveURL(/architecture\/social\/generic\/home-feed$/);
});
