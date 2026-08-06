import { expect, type Page } from '@playwright/test';

import { FLOW_USER_DATA_WRITE_LOCK } from '../../../lib/flow/storage-write-lock';

type FlowWriteLockTestWindow = Window & {
  __flowUserDataWriteLockHeld?: boolean;
  __releaseFlowUserDataWriteLock?: () => void;
};

export async function holdFlowUserDataWriteLock(page: Page): Promise<void> {
  await page.evaluate((lockName) => {
    const scope = window as FlowWriteLockTestWindow;
    scope.__flowUserDataWriteLockHeld = false;
    scope.__releaseFlowUserDataWriteLock = undefined;
    void navigator.locks.request(lockName, { mode: 'exclusive' }, async () => {
      scope.__flowUserDataWriteLockHeld = true;
      await new Promise<void>((resolve) => {
        scope.__releaseFlowUserDataWriteLock = resolve;
      });
    });
  }, FLOW_USER_DATA_WRITE_LOCK);
  await expect.poll(() => page.evaluate(() => (
    (window as FlowWriteLockTestWindow).__flowUserDataWriteLockHeld === true
  ))).toBe(true);
}

export async function expectFlowUserDataWriteQueued(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(async (lockName) => {
    const snapshot = await navigator.locks.query();
    return snapshot.pending?.some((lock) => lock.name === lockName) === true;
  }, FLOW_USER_DATA_WRITE_LOCK)).toBe(true);
}

export async function releaseFlowUserDataWriteLock(page: Page): Promise<void> {
  await page.evaluate(() => {
    const scope = window as FlowWriteLockTestWindow;
    scope.__releaseFlowUserDataWriteLock?.();
    scope.__releaseFlowUserDataWriteLock = undefined;
  });
}
