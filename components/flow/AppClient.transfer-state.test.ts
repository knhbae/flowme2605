import assert from 'node:assert/strict';
import test from 'node:test';

import type { PublicFlowSaveHandoff } from '@/lib/flow/public-flow-save-handoff';
import { resolveMyFlowSaveBannerAfterTransfer } from './AppClient';

function buildSaveBanner(personalCopyKey: string): PublicFlowSaveHandoff {
  return {
    schemaVersion: 1,
    token: 'save-token-1',
    sourceFlowSlug: 'source-flow',
    personalCopyKey,
    idempotencyKey: 'save-idempotency-1',
    itemCount: 3,
    decision: 'copy',
    targetHref: `/my?view=flows&flow=${personalCopyKey}`,
    rawBackup: { keys: [], values: {} },
    expectedPostSaveRaw: { keys: [], values: {} },
  };
}

test('result transfer clears the save-only undo banner only for the same saved plan', () => {
  const banner = buildSaveBanner('personal-copy-a');

  assert.equal(
    resolveMyFlowSaveBannerAfterTransfer(banner, {
      state: 'succeeded',
      request: { savedPlanId: 'personal-copy-a' },
    }),
    null,
  );
  assert.equal(
    resolveMyFlowSaveBannerAfterTransfer(banner, {
      state: 'partial_local',
      request: { savedPlanId: 'personal-copy-a' },
    }),
    null,
  );
  assert.strictEqual(
    resolveMyFlowSaveBannerAfterTransfer(banner, {
      state: 'succeeded',
      request: { savedPlanId: 'personal-copy-b' },
    }),
    banner,
  );
  assert.strictEqual(
    resolveMyFlowSaveBannerAfterTransfer(banner, {
      state: 'succeeded',
      request: { savedPlanId: undefined },
    }),
    banner,
  );
  assert.strictEqual(
    resolveMyFlowSaveBannerAfterTransfer(banner, {
      state: 'failed',
      request: { savedPlanId: 'personal-copy-a' },
    }),
    banner,
  );
});
