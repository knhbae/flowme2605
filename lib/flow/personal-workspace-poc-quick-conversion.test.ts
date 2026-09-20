import assert from 'node:assert/strict';
import test from 'node:test';

import { toPersonalWorkspacePocQuickItemRef } from './personal-workspace-poc-contract';
import { materializePersonalWorkspacePocQuickConversion } from './personal-workspace-poc-quick-conversion';

const QUICK = {
  quickItemId: 'quick / 여행',
  title: '여권 갱신 준비',
  memo: '사진 규격 다시 확인',
  status: 'completed' as const,
  completedAt: '2026-09-01T00:00:00.000Z',
  createdAt: '2026-08-31T00:00:00.000Z',
};

test('materializes one deterministic open Item without mutating the QuickItem snapshot', () => {
  const before = structuredClone(QUICK);
  const input = {
    quickItem: QUICK,
    quickItemRef: toPersonalWorkspacePocQuickItemRef(QUICK.quickItemId),
    flowTitle: '여권 갱신 Flow',
    stateRevision: 7,
    committedAt: '2026-09-01T00:01:00.000Z',
  };

  const first = materializePersonalWorkspacePocQuickConversion(input);
  const repeated = materializePersonalWorkspacePocQuickConversion(input);

  assert.deepEqual(QUICK, before);
  assert.deepEqual(first, repeated);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.conversionId, 'quick-item-to-flow:v1:quick%20%2F%20%EC%97%AC%ED%96%89:revision-7');
  assert.equal(first.flow.items.length, 1);
  assert.equal(first.flow.title, '여권 갱신 Flow');
  assert.equal(first.flow.items[0].title, QUICK.title);
  assert.equal(first.flow.authoring.rawText, `# ${input.flowTitle}\n\n- [ ] ${QUICK.title}`);
  assert.equal(first.flow.authoring.parsedItems?.[0]?.title, QUICK.title);
  assert.equal(first.itemRef, first.flow.items[0].ref);
});

test('rejects foreign identity, multiline titles, and invalid revision without materializing', () => {
  const valid = {
    quickItem: QUICK,
    quickItemRef: toPersonalWorkspacePocQuickItemRef(QUICK.quickItemId),
    flowTitle: '여권 갱신 Flow',
    stateRevision: 7,
    committedAt: '2026-09-01T00:01:00.000Z',
  };

  assert.deepEqual(
    materializePersonalWorkspacePocQuickConversion({ ...valid, quickItemRef: 'quick-item:foreign' }),
    { ok: false, error: 'invalid-quick-item-ref' },
  );
  assert.deepEqual(
    materializePersonalWorkspacePocQuickConversion({ ...valid, flowTitle: '두 줄\nFlow' }),
    { ok: false, error: 'invalid-flow-title' },
  );
  assert.deepEqual(
    materializePersonalWorkspacePocQuickConversion({
      ...valid,
      quickItem: { ...QUICK, title: '두 줄\n할 일' },
    }),
    { ok: false, error: 'invalid-quick-title' },
  );
  assert.deepEqual(
    materializePersonalWorkspacePocQuickConversion({ ...valid, stateRevision: -1 }),
    { ok: false, error: 'materialization-failed' },
  );
});
