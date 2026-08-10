import { expect, test } from '@playwright/test';

import {
  expectFlowUserDataWriteQueued,
  holdFlowUserDataWriteLock,
  releaseFlowUserDataWriteLock,
} from './helpers/flow-user-data-write-lock';

const P22_MAP_SNAPSHOT_KEY = 'flow:map:saved:middle-school-math-1';
const RESTART_SAVED_FLOW_KEY = 'flow:saved:restart-moving-d30';

test.beforeEach(async ({ page }) => {
  await page.goto('/flows');
  await page.evaluate(() => window.localStorage.clear());
});

test('P22 composite setup and reset wait for the shared Flow user-data write lock', async ({ page }) => {
  await page.goto('/flow-lab/p22-observation');
  await holdFlowUserDataWriteLock(page);

  const prepare = page.getByTestId('p22-observation-prepare-version-review');
  await prepare.click();
  await expectFlowUserDataWriteQueued(page);
  await expect(prepare).toBeDisabled();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), P22_MAP_SNAPSHOT_KEY)).toBeNull();

  await releaseFlowUserDataWriteLock(page);
  await expect(page).toHaveURL('/my?sort=next');
  expect(await page.evaluate((key) => window.localStorage.getItem(key), P22_MAP_SNAPSHOT_KEY)).not.toBeNull();

  await page.goto('/flow-lab/p22-observation');
  await holdFlowUserDataWriteLock(page);
  const reset = page.getByTestId('p22-observation-reset');
  await reset.click();
  await expectFlowUserDataWriteQueued(page);
  await expect(reset).toBeDisabled();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), P22_MAP_SNAPSHOT_KEY)).not.toBeNull();

  await releaseFlowUserDataWriteLock(page);
  await expect(page.getByRole('status')).toContainText('P22 반복 사용 관찰 상태를 지웠습니다.');
  expect(await page.evaluate((key) => window.localStorage.getItem(key), P22_MAP_SNAPSHOT_KEY)).toBeNull();
});

test('the moving restart save waits for the shared Flow user-data write lock', async ({ page }) => {
  await page.evaluate(() => window.localStorage.setItem('flow:auth:demo-user', 'true'));
  await page.goto('/restart/moving-d30');
  await holdFlowUserDataWriteLock(page);

  const save = page.getByTestId('moving-restart-save-to-my-flow');
  await save.click();
  await expectFlowUserDataWriteQueued(page);
  await expect(save).toBeDisabled();
  expect(await page.evaluate((key) => window.localStorage.getItem(key), RESTART_SAVED_FLOW_KEY)).toBeNull();

  await releaseFlowUserDataWriteLock(page);
  await expect(page.getByRole('link', { name: '내 Flow에서 보기' })).toBeVisible();
  const record = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || 'null'), RESTART_SAVED_FLOW_KEY);
  expect(record).toMatchObject({
    slug: 'restart-moving-d30',
    selectedArtifactMode: 'calendar',
    anchor: '2026-06-27',
  });
  expect(record.items.length).toBeGreaterThan(0);
});
