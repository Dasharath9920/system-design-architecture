import { expect, test, type Page } from '@playwright/test';

async function openChallenge(page: Page, difficulty: 'Easy' | 'Medium' | 'Hard') {
  await page.addInitScript(() => {
    Math.random = () => 0;
    sessionStorage.clear();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Challenges', exact: true }).click();
  const selector = page.getByRole('dialog', { name: 'System design challenges' });
  await expect(selector).toContainText('Choose difficulty');
  await expect(selector.getByRole('button', { name: /Easy/ })).toBeVisible();
  await expect(selector.getByRole('button', { name: /Medium/ })).toBeVisible();
  await expect(selector.getByRole('button', { name: /Hard/ })).toBeVisible();
  await selector.getByRole('button', { name: new RegExp(`^${difficulty}`) }).click();
  await expect(page.getByRole('complementary', { name: 'Active system design challenge' })).toBeVisible();
}

async function finishFlow(page: Page, buttonName: 'Run flow' | 'Test solution') {
  await page.getByRole('button', { name: 'Flow options' }).click();
  await page.getByRole('combobox', { name: 'Playback speed' }).selectOption('0');
  await page.getByRole('button', { name: 'Close flow options' }).click();
  await page.getByRole('button', { name: buttonName, exact: true }).click();
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
  await expect(page).toHaveURL(/architecture\/commerce\/generic\/search-product$/);

  await finishFlow(page, 'Run flow');
  await expect(page.getByTestId('concept-rw-service')).toContainText('SIMULATED');
  await page.getByTestId('concept-rw-service').click();
  const inspector = page.getByRole('complementary').filter({ hasText: 'MODIFY SYSTEM' });
  await expect(inspector).not.toContainText('TOUCH THE SYSTEM');
  await inspector.getByRole('button', { name: /Add load balancer \+ instances/ }).click();
  await expect(page.getByTestId('concept-rw-service')).toContainText(
    'Add load balancer + instances',
  );
  await page.getByRole('button', { name: 'Close inspector' }).click();

  await finishFlow(page, 'Test solution');
  await expect(panel).toContainText('Challenge solved');
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
  const inspector = page.getByRole('complementary').filter({ hasText: 'MODIFY SYSTEM' });
  await inspector.getByRole('button', { name: /Add read replica/ }).click();
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await finishFlow(page, 'Test solution');
  await expect(panel).toContainText('Partial improvement');
  await expect(panel).not.toContainText('Problem remains');
  await expect(panel).toContainText('Replica capacity absorbs part of the spike');

  await panel.getByRole('button', { name: 'More challenge options' }).click();
  await panel.getByRole('button', { name: /Reset challenge/ }).click();
  await expect(panel).not.toContainText('Partial improvement');
  await expect(panel).not.toContainText('Add read replica');
  await expect(page.getByTestId('concept-rw-posts')).not.toContainText('Add read replica');
});

test('hard challenge reveals progressive guidance and can apply the authored solution', async ({
  page,
}) => {
  await openChallenge(page, 'Hard');
  const panel = page.getByRole('complementary', { name: 'Active system design challenge' });
  await expect(panel).toContainText('The Celebrity Problem');
  await panel.getByRole('button', { name: /Hint/ }).click();
  await expect(panel).toContainText('Hint 1');
  await expect(panel).not.toContainText('Hint 2');
  await panel.getByRole('button', { name: /Hint/ }).click();
  await expect(panel).toContainText('Hint 2');
  await page.getByRole('button', { name: 'Flow options' }).click();
  await page.getByRole('combobox', { name: 'Playback speed' }).selectOption('0');
  await page.getByRole('button', { name: 'Close flow options' }).click();
  await panel.getByRole('button', { name: 'More challenge options' }).click();
  await panel.getByRole('button', { name: 'Show solution', exact: true }).click();
  await expect(panel).toContainText('WHY IT WORKS');
  await expect(panel).toContainText('Challenge solved');
  await expect(panel).toContainText('Use hybrid fanout');
});

test('challenge selector and panel fit on a mobile viewport without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openChallenge(page, 'Easy');
  await expect(page.getByRole('complementary', { name: 'Active system design challenge' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
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
