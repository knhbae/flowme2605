import assert from 'node:assert/strict';
import test from 'node:test';
import { k3bImportedMemoFixture, K3B_MEMO_ORIGINS, K3B_MEMO_SOURCE, K3B_MEMO_CRITERION } from '../../tests/fixtures/personal-workspace-k3b-imported-memo';
import { buildPersonalWorkspacePocReadModel } from './personal-workspace-poc-read-model';
import { getPersonalWorkspacePocInheritedMemo } from './personal-workspace-poc-plan-memo-baseline';

function project(fixture: ReturnType<typeof k3bImportedMemoFixture>) {
  const entries = Object.fromEntries(fixture.entries), before = JSON.stringify(fixture);
  const storage = { get length() { return fixture.entries.length; },
    key: (index: number) => fixture.entries[index]?.[0] ?? null, getItem: (key: string) => entries[key] ?? null,
    setItem() { throw new Error('forbidden read-model write'); },
    removeItem() { throw new Error('forbidden read-model removal'); }, clear() { throw new Error('forbidden clear'); },
  };
  const result = buildPersonalWorkspacePocReadModel(storage, fixture.bundles);
  assert.equal(JSON.stringify(fixture), before);
  return result;
}

for (const kind of [...K3B_MEMO_ORIGINS, 'strict-map'] as const) {
  test(`B0-M raw imported memo ${kind} preserves presence, CRLF, whitespace and source-equal ownership`, () => {
    const fixture = k3bImportedMemoFixture({ strictMap: kind === 'strict-map' });
    const entries = Object.fromEntries(fixture.entries), before = JSON.stringify(fixture);
    let writes = 0;
    const storage = {
      get length() { return fixture.entries.length; }, key: (index: number) => fixture.entries[index]?.[0] ?? null,
      getItem: (key: string) => entries[key] ?? null,
      setItem() { writes++; throw new Error('read-only fixture'); },
      removeItem() { writes++; throw new Error('read-only fixture'); }, clear() { writes++; throw new Error('read-only fixture'); },
    };
    const result = buildPersonalWorkspacePocReadModel(storage, fixture.bundles);
    assert.ok(result.ok, result.ok ? '' : result.reason);
    assert.equal(result.model.flows.length, 4);
    const flow = result.model.flows.find(value => value.origin === (kind === 'strict-map' ? 'source-backed-map' : kind));
    assert.ok(flow);
    const observations = flow.items.map(item => ({ id: item.itemId, inherited: getPersonalWorkspacePocInheritedMemo(item),
      owner: item.fieldOwnership?.description.existingPersonal.owner, effective: item.fieldOwnership?.description.effective.value }));
    assert.deepEqual(observations.map(value => value.inherited), fixture.memos);
    observations.forEach((value, index) => assert.equal(value.owner, fixture.memos[index] === undefined ? 'none' : 'existing-personal'));
    for (const item of flow.items) {
      assert.equal(item.fieldOwnership?.description.source.value, K3B_MEMO_SOURCE);
      assert.equal(item.completionCriterion, K3B_MEMO_CRITERION);
    }
    assert.equal(writes, 0); assert.equal(JSON.stringify(fixture), before);
  });
}

test('B0-M raw user-created structural memos retain exact values and explicit empty draft wins', () => {
  const fixture = k3bImportedMemoFixture();
  const slug = fixture.owners[1], flowId = fixture.bundles[1].flow.id;
  fixture.entries.push([`flow:my-flow:structural-overlay:${slug}`, JSON.stringify({
    schemaVersion: 1, savedCopyId: slug, flowId,
    userItems: fixture.memos.map((memo, index) => ({ itemId: `user-${index}`, provenance: 'user_created', title: `추가한 할 일 ${index}`,
      ...(memo === undefined ? {} : { personalMemo: memo }), createdAt: '2026-09-05T01:00:00.000Z', orderKey: index })),
    itemTombstones: [], orderOverride: [], selection: { mode: 'all_except_excluded', includedItemIds: [], excludedItemIds: [] },
    updatedAt: '2026-09-05T01:00:00.000Z',
  })]);
  const read = project(fixture); assert.ok(read.ok, read.ok ? '' : read.reason);
  const users = read.model.flows.find(flow => flow.origin === 'personal-draft')!.items.filter(item => item.itemId.startsWith('user-'));
  assert.deepEqual(users.map(getPersonalWorkspacePocInheritedMemo), fixture.memos);
  const drafts = fixture.entries.find(entry => entry[0] === 'flow:my-flow:item-drafts')!;
  drafts[1] = JSON.stringify({ ...JSON.parse(drafts[1]), [`${slug}::user-0::draft-overlay`]: { memo: '' } });
  const changed = project(fixture); assert.ok(changed.ok, changed.ok ? '' : changed.reason);
  assert.equal(getPersonalWorkspacePocInheritedMemo(changed.model.flows.find(flow => flow.origin === 'personal-draft')!.items.find(item => item.itemId === 'user-0')!), '');
});

test('B0-M raw date-scoped explicit blank memo still wins the canonical value without changing its identity', () => {
  const fixture = k3bImportedMemoFixture(), drafts = fixture.entries.find(entry => entry[0] === 'flow:my-flow:item-drafts')!;
  drafts[1] = JSON.stringify({ ...JSON.parse(drafts[1]), 'copy:k3b-memo::memo-item-0::2026-09-05': { memo: '' } });
  const result = project(fixture); assert.ok(result.ok, result.ok ? '' : result.reason);
  const item = result.model.flows.find(flow => flow.origin === 'canonical-personal-copy')!.items[0];
  assert.equal(getPersonalWorkspacePocInheritedMemo(item), '');
  assert.equal(item.fieldOwnership?.description.effective.value, '');
  assert.equal(item.fieldOwnership?.description.source.value, K3B_MEMO_SOURCE);
});

test('B0-M unsupported blank Map userMemo remains fail-closed rather than broadening its operational schema', () => {
  for (const memo of ['', ' \t ']) {
    const fixture = k3bImportedMemoFixture(), map = fixture.entries.find(entry => entry[0] === 'flow:map:saved:k3b-memo-map-owner')!;
    const raw = JSON.parse(map[1]); raw.personalCopy.stepOverridesByFlow['k3b-memo-map']['memo-item-0'].userMemo = memo;
    map[1] = JSON.stringify(raw);
    assert.deepEqual(project(fixture), { ok: false, reason: 'malformed-saved-map' });
  }
});
