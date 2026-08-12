import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifySavedPlanEditorOrigin,
  isSupportedSavedPlanEditorOrigin,
  type ClassifySavedPlanEditorOriginInput,
} from './saved-plan-editor-origin';
import type { SavedFlowMapSnapshot, SavedFlowRecord } from './storage';

const savedAt = '2026-08-12T03:00:00.000Z';

function canonicalRecord(flowSlug = 'personal-copy:moving-1'): SavedFlowRecord & { schemaVersion: 2 } {
  return {
    schemaVersion: 2,
    slug: flowSlug,
    savedAt,
    personalCopyKey: flowSlug,
    sourceFlowKey: 'flow:moving-d30-basic',
    sourceFlowSlug: 'moving-d30-basic',
    sourceVersion: 'moving-d30-v1',
    lastSaveRequestId: 'save-request-1',
    savedItemCount: 3,
    selectedArtifactMode: 'calendar',
    dateIntent: 'custom',
    anchor: '2026-09-01',
  };
}

function legacyRecord(flowSlug = 'moving-d30-basic'): SavedFlowRecord {
  return {
    slug: flowSlug,
    savedAt,
    personalTitle: '내 이사 준비',
    selectedArtifactMode: 'calendar',
    dateIntent: 'custom',
    anchor: '2026-09-01',
  };
}

function savedMap(flowSlug = 'source-backed-moving-d30'): SavedFlowMapSnapshot {
  return {
    mapId: 'moving-map-1',
    title: '이사 준비 Flow Map',
    version: 'moving-map-v1',
    savedAt,
    anchor: '2026-09-01',
    flowSlugs: [flowSlug, 'source-backed-moving-after'],
  };
}

const canonicalInput: ClassifySavedPlanEditorOriginInput = {
  flowSlug: 'personal-copy:moving-1',
  bundleFlowSlug: 'moving-d30-basic',
  bundleStatus: 'published',
  savedRecord: canonicalRecord(),
};

test('classifies all supported origins in storage-owner precedence order', () => {
  const cases: Array<{
    name: string;
    input: ClassifySavedPlanEditorOriginInput;
    expectedKind: string;
  }> = [
    {
      name: 'source-backed map wins over draft slug and schema-v2 companion record',
      input: {
        flowSlug: 'url-draft-map-child',
        bundleFlowSlug: 'url-draft-map-child',
        bundleStatus: 'draft',
        savedMap: savedMap('url-draft-map-child'),
        savedRecord: canonicalRecord('url-draft-map-child'),
      },
      expectedKind: 'source-backed-map',
    },
    {
      name: 'personal draft wins over a schema-v2-shaped companion record',
      input: {
        flowSlug: 'url-draft-memo-1',
        bundleFlowSlug: 'url-draft-memo-1',
        bundleStatus: 'draft',
        savedRecord: canonicalRecord('url-draft-memo-1'),
      },
      expectedKind: 'personal-draft',
    },
    {
      name: 'valid schema-v2 identity is a canonical personal copy',
      input: canonicalInput,
      expectedKind: 'canonical-personal-copy',
    },
    {
      name: 'unversioned saved record is a legacy saved plan',
      input: {
        flowSlug: 'moving-d30-basic',
        bundleFlowSlug: 'moving-d30-basic',
        bundleStatus: 'published',
        savedRecord: legacyRecord(),
      },
      expectedKind: 'legacy-saved-plan',
    },
  ];

  cases.forEach(({ name, input, expectedKind }) => {
    assert.equal(classifySavedPlanEditorOrigin(input).kind, expectedKind, name);
  });
});

test('reports the existing persistence owners as capabilities without defining new storage keys', () => {
  const cases: Array<{
    input: ClassifySavedPlanEditorOriginInput;
    expected: Record<string, string>;
  }> = [
    {
      input: {
        flowSlug: 'source-backed-moving-d30',
        bundleFlowSlug: 'source-backed-moving-d30',
        bundleStatus: 'published',
        savedMap: savedMap(),
      },
      expected: {
        titleOwner: 'saved-map',
        anchorOwner: 'saved-map-and-child-flows',
        compositionOwner: 'map-personal-copy-and-item-state',
        itemValueOwner: 'map-step-override-and-global-memo',
        recordPolicy: 'preserve-map-child-records',
      },
    },
    {
      input: {
        flowSlug: 'url-draft-memo-1',
        bundleFlowSlug: 'url-draft-memo-1',
        bundleStatus: 'draft',
      },
      expected: {
        titleOwner: 'bundle',
        anchorOwner: 'saved-flow',
        compositionOwner: 'structural-overlay-and-item-state',
        itemValueOwner: 'structural-and-global-personalization',
        recordPolicy: 'preserve-personal-draft-record',
      },
    },
    {
      input: canonicalInput,
      expected: {
        titleOwner: 'saved-record',
        anchorOwner: 'saved-flow',
        compositionOwner: 'item-state',
        itemValueOwner: 'global-personalization',
        recordPolicy: 'require-schema-v2',
      },
    },
    {
      input: {
        flowSlug: 'moving-d30-basic',
        bundleFlowSlug: 'moving-d30-basic',
        bundleStatus: 'published',
        savedRecord: legacyRecord(),
      },
      expected: {
        titleOwner: 'saved-record',
        anchorOwner: 'saved-flow',
        compositionOwner: 'item-state',
        itemValueOwner: 'global-personalization',
        recordPolicy: 'preserve-legacy-record',
      },
    },
  ];

  cases.forEach(({ input, expected }) => {
    const origin = classifySavedPlanEditorOrigin(input);
    assert.equal(isSupportedSavedPlanEditorOrigin(origin), true);
    if (!isSupportedSavedPlanEditorOrigin(origin)) return;
    assert.deepEqual(origin.capabilities, expected);
  });
});

test('distinguishes direct maps that need personal-copy initialization from existing personal copies', () => {
  const direct = classifySavedPlanEditorOrigin({
    flowSlug: 'source-backed-moving-d30',
    bundleFlowSlug: 'source-backed-moving-d30',
    bundleStatus: 'published',
    savedMap: savedMap(),
  });
  assert.equal(direct.kind, 'source-backed-map');
  if (direct.kind === 'source-backed-map') {
    assert.equal(direct.personalCopyState, 'initialize-on-save');
  }

  const withPersonalCopy = savedMap();
  withPersonalCopy.personalCopy = {
    source: 'personal_edit',
    includedStepIdsByFlow: { 'source-backed-moving-d30': ['moving-quotes'] },
    excludedStepIdsByFlow: { 'source-backed-moving-d30': [] },
  };
  const personal = classifySavedPlanEditorOrigin({
    flowSlug: 'source-backed-moving-d30',
    bundleFlowSlug: 'source-backed-moving-d30',
    bundleStatus: 'published',
    savedMap: withPersonalCopy,
  });
  assert.equal(personal.kind, 'source-backed-map');
  if (personal.kind === 'source-backed-map') {
    assert.equal(personal.personalCopyState, 'existing');
  }
});

test('fails closed for every required schema-v2 identity violation instead of falling through to legacy', () => {
  const mutations: Array<{
    name: string;
    mutate: (record: Record<string, unknown>) => void;
  }> = [
    { name: 'record slug mismatch', mutate: (record) => { record.slug = 'another-copy'; } },
    { name: 'missing personal copy key', mutate: (record) => { delete record.personalCopyKey; } },
    { name: 'personal copy key mismatch', mutate: (record) => { record.personalCopyKey = 'another-copy'; } },
    { name: 'missing source flow key', mutate: (record) => { delete record.sourceFlowKey; } },
    { name: 'blank source flow slug', mutate: (record) => { record.sourceFlowSlug = '   '; } },
    { name: 'missing source version', mutate: (record) => { delete record.sourceVersion; } },
    { name: 'missing save request id', mutate: (record) => { delete record.lastSaveRequestId; } },
    { name: 'negative saved item count', mutate: (record) => { record.savedItemCount = -1; } },
    { name: 'fractional saved item count', mutate: (record) => { record.savedItemCount = 1.5; } },
    { name: 'missing base saved-record field', mutate: (record) => { delete record.savedAt; } },
  ];

  mutations.forEach(({ name, mutate }) => {
    const record = structuredClone(canonicalRecord()) as unknown as Record<string, unknown>;
    mutate(record);
    assert.deepEqual(
      classifySavedPlanEditorOrigin({ ...canonicalInput, savedRecord: record }),
      {
        kind: 'unsupported',
        flowSlug: canonicalInput.flowSlug,
        reason: 'malformed-schema-v2-identity',
      },
      name,
    );
  });
});

test('does not downgrade an explicit unsupported saved-record schema to legacy', () => {
  const result = classifySavedPlanEditorOrigin({
    flowSlug: 'future-plan',
    bundleFlowSlug: 'future-plan',
    bundleStatus: 'published',
    savedRecord: {
      ...legacyRecord('future-plan'),
      schemaVersion: 3,
    },
  });
  assert.deepEqual(result, {
    kind: 'unsupported',
    flowSlug: 'future-plan',
    reason: 'unsupported-saved-record-schema',
  });
});

test('fails closed on an invalid map owner rather than selecting a lower-priority record', () => {
  const malformedMap = {
    ...savedMap('personal-copy:moving-1'),
    title: '',
  } as SavedFlowMapSnapshot;
  assert.deepEqual(
    classifySavedPlanEditorOrigin({ ...canonicalInput, savedMap: malformedMap }),
    {
      kind: 'unsupported',
      flowSlug: canonicalInput.flowSlug,
      reason: 'malformed-source-backed-map',
    },
  );

  assert.deepEqual(
    classifySavedPlanEditorOrigin({ ...canonicalInput, savedMap: savedMap('another-flow') }),
    {
      kind: 'unsupported',
      flowSlug: canonicalInput.flowSlug,
      reason: 'source-backed-map-flow-mismatch',
    },
  );
});

test('fails closed on invalid personal-draft ownership instead of selecting its companion record', () => {
  const cases: Array<{
    input: ClassifySavedPlanEditorOriginInput;
    reason: string;
  }> = [
    {
      input: {
        flowSlug: 'url-draft-memo-1',
        bundleFlowSlug: 'another-bundle',
        bundleStatus: 'draft',
        savedRecord: legacyRecord('url-draft-memo-1'),
      },
      reason: 'personal-draft-identity-mismatch',
    },
    {
      input: {
        flowSlug: 'url-draft-memo-1',
        bundleFlowSlug: 'url-draft-memo-1',
        bundleStatus: 'published',
        savedRecord: legacyRecord('url-draft-memo-1'),
      },
      reason: 'personal-draft-status-mismatch',
    },
  ];

  cases.forEach(({ input, reason }) => {
    assert.deepEqual(classifySavedPlanEditorOrigin(input), {
      kind: 'unsupported',
      flowSlug: input.flowSlug,
      reason,
    });
  });
});

test('returns normalized record snapshots and does not mutate caller-owned input', () => {
  const savedRecord = {
    ...legacyRecord(),
    personalTitle: '  내 계획  ',
  };
  const input: ClassifySavedPlanEditorOriginInput = {
    flowSlug: 'moving-d30-basic',
    bundleFlowSlug: 'moving-d30-basic',
    bundleStatus: 'published',
    savedRecord,
  };
  const before = structuredClone(input);
  const origin = classifySavedPlanEditorOrigin(input);

  assert.deepEqual(input, before);
  assert.equal(origin.kind, 'legacy-saved-plan');
  if (origin.kind === 'legacy-saved-plan') {
    assert.equal(origin.savedRecord.personalTitle, '내 계획');
    assert.notEqual(origin.savedRecord, savedRecord);
  }
});

test('reports missing and malformed legacy records as unsupported', () => {
  const base = {
    flowSlug: 'moving-d30-basic',
    bundleFlowSlug: 'moving-d30-basic',
    bundleStatus: 'published',
  };
  assert.deepEqual(classifySavedPlanEditorOrigin(base), {
    kind: 'unsupported',
    flowSlug: 'moving-d30-basic',
    reason: 'missing-saved-record',
  });
  assert.deepEqual(classifySavedPlanEditorOrigin({ ...base, savedRecord: [] }), {
    kind: 'unsupported',
    flowSlug: 'moving-d30-basic',
    reason: 'malformed-legacy-saved-record',
  });
  assert.deepEqual(classifySavedPlanEditorOrigin({
    ...base,
    savedRecord: legacyRecord('another-plan'),
  }), {
    kind: 'unsupported',
    flowSlug: 'moving-d30-basic',
    reason: 'malformed-legacy-saved-record',
  });
});
