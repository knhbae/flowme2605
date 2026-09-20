import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_VERSION,
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  toPersonalWorkspacePocMapGroupRef,
  type PersonalWorkspacePocFlow,
  type PersonalWorkspacePocOrigin,
  type PersonalWorkspacePocReadModel,
} from './personal-workspace-poc-contract';
import {
  buildPersonalWorkspacePocMapGroupCatalog,
  reducePersonalWorkspacePocMapSelection,
  type PersonalWorkspacePocIntegratedResultState,
} from './personal-workspace-poc-map-selection';

function flow(
  index: number,
  options: {
    title?: string;
    origin?: PersonalWorkspacePocOrigin;
    map?: {
      ownerId: string;
      title: string;
      childOrder: number;
      childCount: number;
      executionState?: 'executable' | 'review-hold';
    };
  } = {},
): PersonalWorkspacePocFlow {
  const savedCopyId = `copy:${index}`;
  const flowId = `flow:${index}`;
  const itemId = `item:${index}`;
  return {
    ref: toPersonalWorkspacePocFlowRef(savedCopyId, flowId),
    savedCopyId,
    flowId,
    sourceSlug: `source-${index}`,
    title: options.title ?? `Flow ${index}`,
    origin: options.origin ?? (options.map ? 'source-backed-map' : 'legacy-saved-plan'),
    ...(options.map
      ? {
          presentation: {
            mapGroup: {
              groupRef: toPersonalWorkspacePocMapGroupRef(options.map.ownerId),
              ownerId: options.map.ownerId,
              title: options.map.title,
              childOrder: options.map.childOrder,
              childCount: options.map.childCount,
              executionState: options.map.executionState ?? 'executable',
              reviewReasons: [],
            },
          },
        }
      : {}),
    items: [{
      ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, itemId),
      savedCopyId,
      flowId,
      itemId,
      title: `할 일 ${index}`,
      sourceOrder: 0,
    }],
  };
}

function model(flows: readonly PersonalWorkspacePocFlow[]): PersonalWorkspacePocReadModel {
  return { version: PERSONAL_WORKSPACE_POC_VERSION, flows };
}

test('single-child Map is flattened while multi-child Map is grouped in source order', () => {
  const single = flow(1, {
    title: '한 개짜리', map: { ownerId: 'single', title: '숨겨야 할 Map명', childOrder: 0, childCount: 1 },
  });
  const multiSecond = flow(3, {
    title: '두 번째', map: { ownerId: 'multi', title: '여행 준비', childOrder: 1, childCount: 2 },
  });
  const regular = flow(4, { title: '개별 Flow' });
  const multiFirst = flow(2, {
    title: '첫 번째', map: { ownerId: 'multi', title: '여행 준비', childOrder: 0, childCount: 2 },
  });
  const result = buildPersonalWorkspacePocMapGroupCatalog(model([
    multiSecond, regular, single, multiFirst,
  ]));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.catalog.groups.map((group) => ({
    kind: group.kind,
    title: group.title,
    childTitles: group.children.map((child) => child.title),
  })), [
    { kind: 'flow', title: '개별 Flow', childTitles: ['개별 Flow'] },
    { kind: 'map', title: '여행 준비', childTitles: ['첫 번째', '두 번째'] },
    { kind: 'flow', title: '한 개짜리', childTitles: ['한 개짜리'] },
  ]);
  const flattened = result.catalog.groups.find((group) => group.title === '한 개짜리');
  assert.equal(flattened?.groupRef, single.ref);
  assert.equal(JSON.stringify(flattened).includes('숨겨야 할 Map명'), false);
});

test('group catalog and fingerprint are deterministic for the same ordered read model', () => {
  const values = [
    flow(1, { map: { ownerId: 'map', title: '묶음', childOrder: 0, childCount: 2 } }),
    flow(2, { map: { ownerId: 'map', title: '묶음', childOrder: 1, childCount: 2 } }),
  ];
  const first = buildPersonalWorkspacePocMapGroupCatalog(model(values));
  const second = buildPersonalWorkspacePocMapGroupCatalog(model(values));
  assert.deepEqual(second, first);
  assert.equal(first.ok && first.catalog.readModelFingerprint.startsWith(
    'personal-workspace-read-model:v1:',
  ), true);
});

test('review-held and unsupported Map presentation fail closed as non-executable', () => {
  const held = flow(1, {
    map: {
      ownerId: 'held', title: '검토 중', childOrder: 0, childCount: 1,
      executionState: 'review-hold',
    },
  });
  const heldWithReason = {
    ...held,
    presentation: {
      mapGroup: {
        ...held.presentation?.mapGroup,
        reviewReasons: ['원문 검토가 필요합니다.'],
      },
    },
  } as PersonalWorkspacePocFlow;
  assert.deepEqual(buildPersonalWorkspacePocMapGroupCatalog(model([heldWithReason])), {
    ok: false,
    reason: 'map-review-hold',
    blockedGroupRef: toPersonalWorkspacePocMapGroupRef('held'),
    reviewReasons: ['원문 검토가 필요합니다.'],
  });

  const unsupported = {
    ...held,
    presentation: {
      mapGroup: {
        ...held.presentation?.mapGroup,
        executionState: 'future-state',
      },
    },
  } as unknown as PersonalWorkspacePocFlow;
  assert.deepEqual(buildPersonalWorkspacePocMapGroupCatalog(model([unsupported])), {
    ok: false,
    reason: 'unsupported-map-state',
    blockedGroupRef: toPersonalWorkspacePocMapGroupRef('held'),
  });
});

test('missing children, duplicate order, foreign metadata, and duplicate identity fail closed', () => {
  const missing = flow(1, {
    map: { ownerId: 'map', title: '묶음', childOrder: 0, childCount: 2 },
  });
  assert.equal(buildPersonalWorkspacePocMapGroupCatalog(model([missing])).ok, false);
  assert.deepEqual(buildPersonalWorkspacePocMapGroupCatalog(model([missing, missing])), {
    ok: false,
    reason: 'duplicate-flow-identity',
  });

  const duplicateOrder = flow(2, {
    map: { ownerId: 'map', title: '묶음', childOrder: 0, childCount: 2 },
  });
  assert.deepEqual(buildPersonalWorkspacePocMapGroupCatalog(model([missing, duplicateOrder])), {
    ok: false,
    reason: 'map-child-order-mismatch',
    blockedGroupRef: toPersonalWorkspacePocMapGroupRef('map'),
  });

  const foreign = {
    ...flow(3),
    presentation: missing.presentation,
  };
  assert.deepEqual(buildPersonalWorkspacePocMapGroupCatalog(model([foreign])), {
    ok: false,
    reason: 'foreign-map-presentation',
  });
});

test('one child reducer resets result to Text, closes detail, and returns heading focus', () => {
  const first = flow(1, {
    map: { ownerId: 'map', title: '묶음', childOrder: 0, childCount: 2 },
  });
  const second = flow(2, {
    map: { ownerId: 'map', title: '묶음', childOrder: 1, childCount: 2 },
  });
  const grouped = buildPersonalWorkspacePocMapGroupCatalog(model([first, second]));
  assert.equal(grouped.ok, true);
  if (!grouped.ok) return;
  const state: PersonalWorkspacePocIntegratedResultState = {
    selectedGroupRef: toPersonalWorkspacePocMapGroupRef('map'),
    selectedFlowRef: first.ref,
    resultView: 'todo',
    openItemRef: first.items[0].ref,
  };
  const result = reducePersonalWorkspacePocMapSelection(grouped.catalog, state, {
    type: 'select-integrated-flow-child',
    groupRef: toPersonalWorkspacePocMapGroupRef('map'),
    childFlowRef: second.ref,
    expectedReadModelFingerprint: grouped.catalog.readModelFingerprint,
  });
  assert.deepEqual(result, {
    ok: true,
    changed: true,
    state: {
      selectedGroupRef: toPersonalWorkspacePocMapGroupRef('map'),
      selectedFlowRef: second.ref,
      resultView: 'text',
      openItemRef: null,
      focusReturn: { kind: 'flow-result-heading', flowRef: second.ref },
    },
  });
  if (result.ok) assert.equal(result.state.openItemRef, null);
});

test('same child, stale fingerprint, foreign child, and flattened group mutate nothing', () => {
  const first = flow(1, {
    map: { ownerId: 'map', title: '묶음', childOrder: 0, childCount: 2 },
  });
  const second = flow(2, {
    map: { ownerId: 'map', title: '묶음', childOrder: 1, childCount: 2 },
  });
  const regular = flow(3);
  const grouped = buildPersonalWorkspacePocMapGroupCatalog(model([first, second, regular]));
  assert.equal(grouped.ok, true);
  if (!grouped.ok) return;
  const state: PersonalWorkspacePocIntegratedResultState = {
    selectedGroupRef: toPersonalWorkspacePocMapGroupRef('map'),
    selectedFlowRef: first.ref,
    resultView: 'calendar',
    openItemRef: first.items[0].ref,
  };
  const base = {
    type: 'select-integrated-flow-child' as const,
    groupRef: toPersonalWorkspacePocMapGroupRef('map'),
    childFlowRef: first.ref,
    expectedReadModelFingerprint: grouped.catalog.readModelFingerprint,
  };
  const same = reducePersonalWorkspacePocMapSelection(grouped.catalog, state, base);
  assert.equal(same.changed, false);
  assert.strictEqual(same.state, state);

  const stale = reducePersonalWorkspacePocMapSelection(grouped.catalog, state, {
    ...base, childFlowRef: second.ref, expectedReadModelFingerprint: 'stale',
  });
  assert.deepEqual({
    ok: stale.ok,
    changed: stale.changed,
    reason: 'reason' in stale ? stale.reason : undefined,
  }, {
    ok: false, changed: false, reason: 'stale-read-model',
  });
  assert.strictEqual(stale.state, state);

  const foreign = reducePersonalWorkspacePocMapSelection(grouped.catalog, state, {
    ...base, childFlowRef: regular.ref,
  });
  assert.equal(foreign.ok, false);
  assert.strictEqual(foreign.state, state);

  const flattened = reducePersonalWorkspacePocMapSelection(grouped.catalog, state, {
    ...base, groupRef: regular.ref, childFlowRef: regular.ref,
  });
  assert.equal(flattened.ok, false);
  assert.strictEqual(flattened.state, state);
});
