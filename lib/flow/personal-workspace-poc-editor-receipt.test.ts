import assert from 'node:assert/strict';
import test from 'node:test';

import {
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocFlow,
} from './personal-workspace-poc-contract';
import { summarizePersonalWorkspacePocPlanDraftChanges } from './personal-workspace-poc-editor-receipt';
import type { PersonalWorkspacePocPlanDraft } from './personal-workspace-poc-plan-editor';

const flowRef = toPersonalWorkspacePocFlowRef('copy', 'flow');
const firstRef = toPersonalWorkspacePocFlowItemRef('copy', 'flow', 'first');
const secondRef = toPersonalWorkspacePocFlowItemRef('copy', 'flow', 'second');
const sourceFlow: PersonalWorkspacePocFlow = {
  ref: flowRef,
  savedCopyId: 'copy',
  flowId: 'flow',
  sourceSlug: 'source',
  title: '원본 Flow',
  origin: 'legacy-saved-plan',
  items: [
    { ref: firstRef, savedCopyId: 'copy', flowId: 'flow', itemId: 'first', title: '첫 일', description: '원본 메모', sourceOrder: 0, sourceDate: '2026-09-03' },
    { ref: secondRef, savedCopyId: 'copy', flowId: 'flow', itemId: 'second', title: '둘째 일', sourceOrder: 1 },
  ],
};

const baseline: PersonalWorkspacePocPlanDraft = {
  version: 1,
  guardId: 'guard',
  flowRef,
  savedCopyId: 'copy',
  flowId: 'flow',
  origin: 'legacy-saved-plan',
  title: { mode: 'inherit' },
  orderedItemRefs: [firstRef, secondRef],
  items: {
    [firstRef]: { version: 1, guardId: 'guard', identity: { itemRef: firstRef, savedCopyId: 'copy', flowId: 'flow', itemId: 'first' }, title: { mode: 'inherit' }, memo: { mode: 'inherit' }, schedule: { mode: 'inherit' } },
    [secondRef]: { version: 1, guardId: 'guard', identity: { itemRef: secondRef, savedCopyId: 'copy', flowId: 'flow', itemId: 'second' }, title: { mode: 'inherit' }, memo: { mode: 'inherit' }, schedule: { mode: 'inherit' } },
  },
};

test('Plan receipt summary reports exact bounded values and affected stable refs', () => {
  const draft: PersonalWorkspacePocPlanDraft = {
    ...structuredClone(baseline),
    title: { mode: 'override', value: '내 Flow' },
    orderedItemRefs: [secondRef, firstRef],
    items: {
      ...structuredClone(baseline.items),
      [firstRef]: {
        ...structuredClone(baseline.items[firstRef]),
        title: { mode: 'override', value: '내 첫 일' },
        memo: { mode: 'override', value: '개인 메모' },
        schedule: { mode: 'fixed_date', date: '2026-09-10' },
      },
    },
  };
  const result = summarizePersonalWorkspacePocPlanDraftChanges({ sourceFlow, baseline, draft });

  assert.deepEqual(result.affectedRefs, [flowRef, firstRef]);
  assert.deepEqual(result.changes.map((change) => [change.field, change.before, change.after]), [
    ['flow.title', '원본 · 원본 Flow', '내 계획 · 내 Flow'],
    ['flow.item-order', `${firstRef} → ${secondRef}`, `${secondRef} → ${firstRef}`],
    ['item.first.title', '원본 · 첫 일', '내 계획 · 내 첫 일'],
    ['item.first.memo', '원본 · 원본 메모', '내 계획 · 개인 메모'],
    ['item.first.schedule', '원본 일정 · 2026-09-03', '내 계획 · 2026-09-10'],
  ]);
});

test('Plan receipt summary reports a personal section title once at Flow scope', () => {
  const editableFlow = {
    ...sourceFlow,
    sections: [{
      sectionId: 'section:prepare',
      title: '준비',
      sourceOrder: 0,
      titleOwner: 'existing-personal',
      editCapability: 'poc-shadow',
    }],
  } as const;
  const sectionBaseline = {
    ...baseline,
    sectionTitles: { 'section:prepare': { mode: 'inherit' as const, value: '' } },
  };
  const draft = {
    ...sectionBaseline,
    sectionTitles: { 'section:prepare': { mode: 'override' as const, value: '출발 준비' } },
  };
  assert.deepEqual(summarizePersonalWorkspacePocPlanDraftChanges({
    sourceFlow: editableFlow,
    baseline: sectionBaseline,
    draft,
  }), {
    affectedRefs: [sourceFlow.ref],
    changes: [{
      owner: 'poc-personal-plan',
      field: 'section.section:prepare.title',
      label: '준비 · 구간 제목',
      before: '원본 · 준비',
      after: '내 계획 · 출발 준비',
    }],
  });
});

test('same visible date still reports the source-to-personal schedule ownership change', () => {
  const draft: PersonalWorkspacePocPlanDraft = {
    ...structuredClone(baseline),
    items: {
      ...structuredClone(baseline.items),
      [firstRef]: {
        ...structuredClone(baseline.items[firstRef]),
        schedule: { mode: 'fixed_date', date: '2026-09-03' },
      },
      [secondRef]: {
        ...structuredClone(baseline.items[secondRef]),
        schedule: { mode: 'unscheduled' },
      },
    },
  };

  const result = summarizePersonalWorkspacePocPlanDraftChanges({ sourceFlow, baseline, draft });

  assert.deepEqual(result.affectedRefs, [firstRef, secondRef]);
  assert.deepEqual(result.changes.map((change) => [change.field, change.before, change.after]), [
    ['item.first.schedule', '원본 일정 · 2026-09-03', '내 계획 · 2026-09-03'],
    ['item.second.schedule', '원본 일정 · 날짜 미정', '내 계획 · 날짜 미정'],
  ]);
});

test('same visible text still distinguishes inherited and personal ownership', () => {
  const seededBaseline: PersonalWorkspacePocPlanDraft = {
    ...structuredClone(baseline),
    title: { mode: 'override', value: '원본 Flow' },
    items: {
      ...structuredClone(baseline.items),
      [firstRef]: {
        ...structuredClone(baseline.items[firstRef]),
        memo: { mode: 'override', value: '원본 메모' },
      },
    },
  };
  const draft: PersonalWorkspacePocPlanDraft = {
    ...structuredClone(seededBaseline),
    title: { mode: 'inherit' },
    items: {
      ...structuredClone(seededBaseline.items),
      [firstRef]: {
        ...structuredClone(seededBaseline.items[firstRef]),
        memo: { mode: 'inherit' },
      },
    },
  };

  const result = summarizePersonalWorkspacePocPlanDraftChanges({
    sourceFlow,
    baseline: seededBaseline,
    draft,
  });

  assert.deepEqual(result.affectedRefs, [flowRef, firstRef]);
  assert.deepEqual(result.changes.map((change) => [change.field, change.before, change.after]), [
    ['flow.title', '내 계획 · 원본 Flow', '원본 · 원본 Flow'],
    ['item.first.memo', '내 계획 · 원본 메모', '원본 · 원본 메모'],
  ]);
});

test('unchanged and inherited drafts produce no receipt changes', () => {
  assert.deepEqual(
    summarizePersonalWorkspacePocPlanDraftChanges({ sourceFlow, baseline, draft: baseline }),
    { changes: [], affectedRefs: [] },
  );
});

test('long or multiline memo is represented without copying source bytes into receipt', () => {
  const memo = `첫 줄\n${'가'.repeat(200)}`;
  const draft: PersonalWorkspacePocPlanDraft = {
    ...structuredClone(baseline),
    items: {
      ...structuredClone(baseline.items),
      [firstRef]: {
        ...structuredClone(baseline.items[firstRef]),
        memo: { mode: 'override', value: memo },
      },
    },
  };
  const result = summarizePersonalWorkspacePocPlanDraftChanges({ sourceFlow, baseline, draft });
  const change = result.changes.find((candidate) => candidate.field === 'item.first.memo');
  assert.equal(change?.after, `내 계획 · ${memo.length}자`);
  assert.doesNotMatch(JSON.stringify(result), /첫 줄/u);
});
