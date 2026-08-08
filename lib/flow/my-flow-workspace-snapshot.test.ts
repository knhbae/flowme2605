import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  P0_CONTRACT_FLOW_BUNDLE,
  P0_CONTRACT_FLOW_ITEM_IDS,
} from './effective-flow-contract.fixtures';
import {
  buildEffectiveFlowSnapshot,
  type EffectiveFlowSnapshot,
} from './effective-flow-snapshot';
import { setFlowItemPersonalExclusion } from './flow-item-state';
import {
  buildMyFlowWorkspaceSnapshot,
  type BuildMyFlowWorkspaceSnapshotOptionsV1,
  type MyFlowWorkspaceFlowInputV1,
} from './my-flow-workspace-snapshot';
import { resolvePublicDateIntent } from './public-date-intent';

function buildEffectiveSnapshot(
  title = '개인 P0 실행 계획',
): EffectiveFlowSnapshot {
  const excluded = setFlowItemPersonalExclusion(undefined, true);
  assert.ok(excluded);
  return buildEffectiveFlowSnapshot({
    bundle: P0_CONTRACT_FLOW_BUNDLE,
    effectiveTitle: title,
    dateIntent: resolvePublicDateIntent({
      anchorType: P0_CONTRACT_FLOW_BUNDLE.flow.anchor_type,
      mode: 'custom',
      customAnchor: '2030-09-01',
      exampleAnchor: '',
    }),
    itemStates: {
      [P0_CONTRACT_FLOW_ITEM_IDS[2]]: excluded,
    },
    completedItemIds: [P0_CONTRACT_FLOW_ITEM_IDS[0]],
    completionEnabled: true,
    personalLayerState: 'persisted',
  });
}

function flowInput(
  savedFlowSlug: string,
  overrides: Partial<MyFlowWorkspaceFlowInputV1> = {},
): MyFlowWorkspaceFlowInputV1 {
  return {
    savedFlowSlug,
    effectiveSnapshot: buildEffectiveSnapshot(),
    done: 1,
    total: 2,
    archived: false,
    lastVisited: '2030-09-02T03:04:05.000Z',
    itemTargets: [{
      itemId: P0_CONTRACT_FLOW_ITEM_IDS[0],
      target: {
        itemKey: `${savedFlowSlug}::${P0_CONTRACT_FLOW_ITEM_IDS[0]}::2030-09-01`,
        itemDate: '2030-09-01',
      },
    }, {
      itemId: P0_CONTRACT_FLOW_ITEM_IDS[0],
      target: {
        itemKey: `${savedFlowSlug}::${P0_CONTRACT_FLOW_ITEM_IDS[0]}::2030-09-02`,
        itemDate: '2030-09-02',
      },
    }],
    ...overrides,
  };
}

function options(
  flows: readonly MyFlowWorkspaceFlowInputV1[],
  overrides: Partial<BuildMyFlowWorkspaceSnapshotOptionsV1['library']> = {},
): BuildMyFlowWorkspaceSnapshotOptionsV1 {
  const savedFlowSlugs = flows
    .map((flow) => flow.savedFlowSlug.trim())
    .filter(Boolean);
  return {
    flows,
    library: {
      query: '',
      filter: 'all',
      viewport: 'wide',
      controls: { search: false, filters: false, mode: 'compact' },
      eligibleFlowSlugs: savedFlowSlugs,
      filteredFlowSlugs: savedFlowSlugs,
      mobileFlowSlugs: savedFlowSlugs,
      hiddenMobileCount: 0,
      mobileInventoryExpanded: false,
      ...overrides,
    },
  };
}

function expectedWorkspaceItem(
  row: EffectiveFlowSnapshot['committed']['rows'][number],
  targets: readonly Readonly<{ itemKey: string; itemDate?: string }>[] = [],
) {
  return {
    id: row.id,
    sourceItemId: row.sourceItemId,
    ownership: row.ownership,
    role: row.role,
    completable: row.completable,
    title: row.title,
    ...(row.description !== undefined ? { description: row.description } : {}),
    ...(row.memo !== undefined ? { memo: row.memo } : {}),
    ...(row.completionCriterion !== undefined
      ? { completionCriterion: row.completionCriterion }
      : {}),
    ...(row.section !== undefined ? { section: row.section } : {}),
    orderRank: row.orderRank,
    included: row.included,
    completed: row.completed,
    schedule: {
      state: row.schedule.state,
      ...(row.schedule.date !== undefined ? { date: row.schedule.date } : {}),
      ...(row.schedule.repeatRule !== undefined
        ? { repeatRule: row.schedule.repeatRule }
        : {}),
    },
    resources: row.resources.map((resource) => ({ ...resource })),
    ...(row.caution !== undefined ? { caution: row.caution } : {}),
    eligibleShapes: [...row.eligibleShapes],
    targets: targets.map((target) => ({ ...target })),
  };
}

test('separates personal saved-copy identity from source identity and preserves effective truth', () => {
  const input = flowInput('personal-p0-copy');
  const workspace = buildMyFlowWorkspaceSnapshot(options([input], {
    selectedFlowSlug: 'personal-p0-copy',
  }));
  const flow = workspace.flows[0];
  assert.ok(flow);

  assert.equal(workspace.schemaVersion, 1);
  assert.equal(workspace.source, 'effective_flow_snapshot');
  assert.equal(workspace.writeOwner, 'none');
  assert.equal(flow.identity.savedFlowSlug, 'personal-p0-copy');
  assert.equal(flow.identity.sourceFlowId, input.effectiveSnapshot.identity.flowId);
  assert.equal(flow.identity.sourceFlowSlug, input.effectiveSnapshot.identity.flowSlug);
  assert.notEqual(flow.identity.savedFlowSlug, flow.identity.sourceFlowSlug);
  assert.deepEqual(flow.versions, {
    source: input.effectiveSnapshot.layers.source.version,
    personal: input.effectiveSnapshot.layers.personal.version,
    execution: input.effectiveSnapshot.layers.execution.version,
  });
  assert.deepEqual(flow.sourceItemIds, input.effectiveSnapshot.layers.source.itemIds);
  assert.deepEqual(
    flow.result.items.map((item) => item.id),
    input.effectiveSnapshot.committed.rows.map((row) => row.id),
  );
  assert.deepEqual(
    flow.result.excludedItems.map((item) => item.id),
    input.effectiveSnapshot.committed.excludedRows.map((row) => row.id),
  );
  assert.deepEqual(flow.result.counts, input.effectiveSnapshot.committed.counts);
  assert.deepEqual(
    flow.result.capabilities,
    input.effectiveSnapshot.committed.capabilities,
  );
  assert.deepEqual(flow.result.exportPlan, input.effectiveSnapshot.committed.exportPlan);
  assert.deepEqual(flow.result.items[0]?.targets, [
    {
      itemKey: 'personal-p0-copy::p0-contract-item-a::2030-09-01',
      itemDate: '2030-09-01',
    },
    {
      itemKey: 'personal-p0-copy::p0-contract-item-a::2030-09-02',
      itemDate: '2030-09-02',
    },
  ]);
  assert.deepEqual(workspace.selection, {
    kind: 'flow',
    savedFlowSlug: 'personal-p0-copy',
  });
  assert.equal(workspace.integrity.status, 'ok');
  assert.deepEqual(workspace.integrity.diagnostics, []);
});

test('preserves every non-default Flow and Item field plus included and excluded order', () => {
  const excluded = setFlowItemPersonalExclusion(undefined, true);
  assert.ok(excluded);
  const effectiveSnapshot = buildEffectiveFlowSnapshot({
    bundle: P0_CONTRACT_FLOW_BUNDLE,
    effectiveTitle: '개인화한 계약 실행 계획',
    dateIntent: resolvePublicDateIntent({
      anchorType: P0_CONTRACT_FLOW_BUNDLE.flow.anchor_type,
      mode: 'custom',
      customAnchor: '2030-09-01',
      exampleAnchor: '',
    }),
    itemStates: {
      [P0_CONTRACT_FLOW_ITEM_IDS[2]]: excluded,
    },
    publicItemPersonalizations: {
      [P0_CONTRACT_FLOW_ITEM_IDS[0]]: {
        title: '개인화 계약 항목 A',
        detail: '개인 메모 A',
        date: '2030-10-03',
      },
      [P0_CONTRACT_FLOW_ITEM_IDS[1]]: {
        title: '개인화 계약 항목 B',
        detail: '개인 메모 B',
        date: null,
      },
    },
    orderOverride: [
      P0_CONTRACT_FLOW_ITEM_IDS[1],
      P0_CONTRACT_FLOW_ITEM_IDS[0],
      P0_CONTRACT_FLOW_ITEM_IDS[2],
    ],
    completedItemIds: [P0_CONTRACT_FLOW_ITEM_IDS[0]],
    completionEnabled: true,
    personalLayerState: 'persisted',
  });
  const itemTargets = {
    [P0_CONTRACT_FLOW_ITEM_IDS[0]]: [{
      itemKey: 'personal-rich-copy::item-a::2030-10-03',
      itemDate: '2030-10-03',
    }],
    [P0_CONTRACT_FLOW_ITEM_IDS[1]]: [{
      itemKey: 'personal-rich-copy::item-b::first',
    }, {
      itemKey: 'personal-rich-copy::item-b::second',
      itemDate: '2030-10-04',
    }],
  } as const;
  const workspace = buildMyFlowWorkspaceSnapshot(options([flowInput(
    'personal-rich-copy',
    {
      effectiveSnapshot,
      done: 1,
      total: 2,
      archived: true,
      lastVisited: '2030-10-05T06:07:08.000Z',
      itemTargets: Object.entries(itemTargets).flatMap(([itemId, targets]) => (
        targets.map((target) => ({ itemId, target }))
      )),
    },
  )]));
  const flow = workspace.flows[0];
  assert.ok(flow);

  assert.deepEqual(flow, {
    identity: {
      savedFlowSlug: 'personal-rich-copy',
      sourceFlowId: effectiveSnapshot.identity.flowId,
      sourceFlowSlug: effectiveSnapshot.identity.flowSlug,
    },
    versions: {
      source: effectiveSnapshot.layers.source.version,
      personal: effectiveSnapshot.layers.personal.version,
      execution: effectiveSnapshot.layers.execution.version,
    },
    sourceItemIds: [...effectiveSnapshot.layers.source.itemIds],
    title: effectiveSnapshot.effectiveTitle,
    archived: true,
    lastVisited: '2030-10-05T06:07:08.000Z',
    progress: { done: 1, total: 2, percent: 50, state: 'open' },
    dateIntent: effectiveSnapshot.dateIntent,
    result: {
      selectedShape: effectiveSnapshot.committed.selectedShape,
      selectedArtifactMode: effectiveSnapshot.committed.selectedArtifactMode,
      label: effectiveSnapshot.committed.label,
      dateState: effectiveSnapshot.committed.dateState,
      counts: effectiveSnapshot.committed.counts,
      capabilities: effectiveSnapshot.committed.capabilities,
      exportPlan: effectiveSnapshot.committed.exportPlan,
      items: effectiveSnapshot.committed.rows.map((row) => expectedWorkspaceItem(
        row,
        itemTargets[row.id as keyof typeof itemTargets] ?? [],
      )),
      excludedItems: effectiveSnapshot.committed.excludedRows.map((row) => (
        expectedWorkspaceItem(
          row,
          itemTargets[row.id as keyof typeof itemTargets] ?? [],
        )
      )),
    },
  });
  assert.deepEqual(
    flow.result.items.map((item) => item.id),
    [P0_CONTRACT_FLOW_ITEM_IDS[1], P0_CONTRACT_FLOW_ITEM_IDS[0]],
  );
  assert.deepEqual(
    flow.result.excludedItems.map((item) => item.id),
    [P0_CONTRACT_FLOW_ITEM_IDS[2]],
  );
  assert.equal(workspace.integrity.status, 'ok');
});

test('is deterministic, JSON-safe, pure, and shares no nested effective result references', () => {
  const input = flowInput('personal-p0-copy');
  const buildOptions = options([input]);
  const inputBefore = JSON.stringify(buildOptions);
  const first = buildMyFlowWorkspaceSnapshot(buildOptions);
  const second = buildMyFlowWorkspaceSnapshot(buildOptions);

  assert.deepEqual(first, second);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  assert.equal(JSON.stringify(buildOptions), inputBefore);
  assert.notEqual(first.flows, buildOptions.flows);
  assert.notEqual(first.library.eligibleFlowSlugs, buildOptions.library.eligibleFlowSlugs);

  const outputFlow = first.flows[0];
  const source = input.effectiveSnapshot;
  assert.ok(outputFlow);
  assert.notEqual(outputFlow.sourceItemIds, source.layers.source.itemIds);
  assert.notEqual(outputFlow.dateIntent, source.dateIntent);
  assert.notEqual(outputFlow.dateIntent.primaryAction, source.dateIntent.primaryAction);
  assert.notEqual(outputFlow.result.items, source.committed.rows);
  assert.notEqual(outputFlow.result.items[0], source.committed.rows[0]);
  assert.notEqual(outputFlow.result.items[0]?.schedule, source.committed.rows[0]?.schedule);
  assert.notEqual(outputFlow.result.items[0]?.resources, source.committed.rows[0]?.resources);
  assert.notEqual(outputFlow.result.items[0]?.eligibleShapes, source.committed.rows[0]?.eligibleShapes);
  assert.notEqual(outputFlow.result.counts, source.committed.counts);
  assert.notEqual(outputFlow.result.capabilities, source.committed.capabilities);
  assert.notEqual(outputFlow.result.exportPlan, source.committed.exportPlan);
  assert.notEqual(
    outputFlow.result.exportPlan.formats.calendar.omittedItemIds,
    source.committed.exportPlan.formats.calendar.omittedItemIds,
  );
});

test('sorts the Flow fact table deterministically while preserving each UI list order', () => {
  const workspace = buildMyFlowWorkspaceSnapshot(options([
    flowInput('saved-z'),
    flowInput('saved-a', {
      effectiveSnapshot: buildEffectiveSnapshot('A 계획'),
      done: 2,
      total: 2,
    }),
  ], {
    eligibleFlowSlugs: ['saved-z', 'saved-a'],
    filteredFlowSlugs: ['saved-a', 'saved-z'],
    mobileFlowSlugs: ['saved-z', 'saved-a'],
  }));

  assert.deepEqual(
    workspace.flows.map((flow) => flow.identity.savedFlowSlug),
    ['saved-a', 'saved-z'],
  );
  assert.deepEqual(workspace.library.eligibleFlowSlugs, ['saved-z', 'saved-a']);
  assert.deepEqual(workspace.library.filteredFlowSlugs, ['saved-a', 'saved-z']);
  assert.deepEqual(workspace.library.mobileFlowSlugs, ['saved-z', 'saved-a']);
  assert.deepEqual(workspace.flows[0]?.progress, {
    done: 2,
    total: 2,
    percent: 100,
    state: 'done',
  });
});

test('reports duplicate and malformed data in-band while retaining a usable first Flow', () => {
  const primary = flowInput('saved-a', {
    done: 9,
    total: 2,
    itemTargets: [
      {
        itemId: P0_CONTRACT_FLOW_ITEM_IDS[0],
        target: { itemKey: 'first-target', itemDate: '2030-09-01' },
      },
      {
        itemId: P0_CONTRACT_FLOW_ITEM_IDS[0],
        target: { itemKey: 'first-target', itemDate: '2030-09-01' },
      },
      {
        itemId: 'missing-item',
        target: { itemKey: 'orphan-target' },
      },
      {
        itemId: P0_CONTRACT_FLOW_ITEM_IDS[1],
        target: { itemKey: '', itemDate: 'not-a-date' },
      },
    ],
  });
  const workspace = buildMyFlowWorkspaceSnapshot(options([
    { ...flowInput('missing'), savedFlowSlug: '   ' },
    primary,
    flowInput('saved-a', { done: 0, total: 2 }),
  ], {
    selectedFlowSlug: 'saved-a',
    eligibleFlowSlugs: ['saved-a', 'saved-a', 'unknown'],
    filteredFlowSlugs: ['saved-a'],
    mobileFlowSlugs: ['unknown', 'saved-a'],
    hiddenMobileCount: -4,
  }));

  assert.equal(workspace.integrity.status, 'degraded');
  assert.deepEqual(workspace.selection, { kind: 'flow', savedFlowSlug: 'saved-a' });
  assert.deepEqual(
    workspace.flows.map((flow) => flow.identity.savedFlowSlug),
    ['saved-a'],
  );
  assert.deepEqual(workspace.flows[0]?.progress, {
    done: 2,
    total: 2,
    percent: 100,
    state: 'done',
  });
  assert.deepEqual(workspace.flows[0]?.result.items[0]?.targets, [{
    itemKey: 'first-target',
    itemDate: '2030-09-01',
  }]);
  assert.equal(workspace.library.hiddenMobileCount, 0);
  assert.deepEqual(workspace.library.eligibleFlowSlugs, ['saved-a']);
  assert.deepEqual(workspace.library.mobileFlowSlugs, ['saved-a']);

  const codes = new Set(workspace.integrity.diagnostics.map((entry) => entry.code));
  for (const expected of [
    'ambiguous_selected_flow_slug',
    'duplicate_item_target',
    'duplicate_library_flow_slug',
    'duplicate_saved_flow_slug',
    'invalid_item_target',
    'invalid_mobile_hidden_count',
    'invalid_progress_count',
    'missing_saved_flow_slug',
    'orphan_item_target',
    'unknown_library_flow_slug',
  ] as const) {
    assert.ok(codes.has(expected), `missing diagnostic ${expected}`);
  }
});

test('falls back to the library for a stale selection without throwing', () => {
  const build = () => buildMyFlowWorkspaceSnapshot(options([
    flowInput('saved-a'),
  ], {
    selectedFlowSlug: 'deleted-copy',
  }));
  assert.doesNotThrow(build);
  const workspace = build();
  assert.deepEqual(workspace.selection, { kind: 'library' });
  assert.ok(workspace.integrity.diagnostics.some(
    (entry) => entry.code === 'stale_selected_flow_slug',
  ));

  const noSelection = buildMyFlowWorkspaceSnapshot(options([flowInput('saved-a')]));
  assert.deepEqual(noSelection.selection, { kind: 'library' });
  assert.equal(noSelection.integrity.status, 'ok');

  const emptySelection = buildMyFlowWorkspaceSnapshot(options([
    flowInput('saved-a'),
  ], {
    selectedFlowSlug: '   ',
  }));
  assert.deepEqual(emptySelection.selection, { kind: 'library' });
  assert.ok(emptySelection.integrity.diagnostics.some(
    (entry) => entry.code === 'missing_selected_flow_slug',
  ));
});

test('keeps the projection module free of React, browser, persistence, and receipt owners', () => {
  const source = readFileSync(
    new URL('./my-flow-workspace-snapshot.ts', import.meta.url),
    'utf8',
  );
  const imports = Array.from(
    source.matchAll(/from\s+['"]([^'"]+)['"]/gu),
    (match) => match[1],
  );
  assert.deepEqual(imports, [
    './effective-flow-snapshot',
    './my-flow-local-ia',
  ]);
  for (const forbidden of [
    /\bReact\b/u,
    /\bwindow\b/u,
    /\bdocument\b/u,
    /\blocalStorage\b/u,
    /\bsessionStorage\b/u,
    /AppClient/u,
    /export-receipt/u,
    /result-transfer/u,
    /from\s+['"].*storage['"]/u,
  ]) {
    assert.doesNotMatch(source, forbidden);
  }
});
