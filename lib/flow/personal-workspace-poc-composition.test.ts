import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_VERSION,
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocAuthoredFlow,
  type PersonalWorkspacePocReadModel,
} from './personal-workspace-poc-contract';
import { composePersonalWorkspacePocReadModel } from './personal-workspace-poc-composition';
import { createPersonalWorkspacePocState } from './personal-workspace-poc-state';

const NOW = '2026-09-02T00:00:00.000Z';

function authored(handoffId = 'handoff-one'): PersonalWorkspacePocAuthoredFlow {
  const savedCopyId = `authored-copy-${handoffId}`;
  const flowId = `authored-flow-${handoffId}`;
  const sectionId = `authored-section-${handoffId}`;
  return {
    ref: toPersonalWorkspacePocFlowRef(savedCopyId, flowId),
    savedCopyId,
    flowId,
    sourceSlug: flowId,
    title: '내가 쓴 Flow',
    origin: 'authoring-handoff',
    sections: [{
      sectionId,
      title: '작성 구간',
      sourceOrder: 0,
      titleOwner: 'authoring',
      editCapability: 'poc-shadow',
    }],
    items: [{
      ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, 'item-1'),
      savedCopyId,
      flowId,
      itemId: 'item-1',
      title: '첫 할 일',
      sectionId,
      sectionTitle: '작성 구간',
      sourceOrder: 0,
    }],
    authoring: {
      handoffId,
      documentId: `document-${handoffId}`,
      revisionId: `revision-${handoffId}`,
      parseResultId: `parse-${handoffId}`,
      sourceSnapshotId: `source-${handoffId}`,
      rawText: '# 내가 쓴 Flow\n- [ ] 첫 할 일',
      sourceFingerprint: 'raw-v1:example',
      committedAt: NOW,
    },
  };
}

test('composes committed PoC-authored flows without changing the base model', () => {
  const base: PersonalWorkspacePocReadModel = {
    version: PERSONAL_WORKSPACE_POC_VERSION,
    flows: [],
  };
  const state = createPersonalWorkspacePocState(NOW);
  const authoredFlow = authored();
  state.authoredFlows = [authoredFlow];
  state.personalPlanOverlays = {
    [authoredFlow.ref]: {
      flowRef: authoredFlow.ref,
      savedCopyId: authoredFlow.savedCopyId,
      flowId: authoredFlow.flowId,
      sectionTitles: { [authoredFlow.sections?.[0].sectionId ?? '']: '개인 실행 구간' },
      items: {},
    },
  };
  const result = composePersonalWorkspacePocReadModel(base, state);
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.model.flows.length, 1);
  assert.equal(result.ok && result.model.flows[0].sections?.[0].title, '개인 실행 구간');
  assert.equal(result.ok && result.model.flows[0].items[0].sectionTitle, '개인 실행 구간');
  assert.equal(authoredFlow.sections?.[0].title, '작성 구간');
  assert.equal(base.flows.length, 0);
});

test('fails closed on flow and item identity collisions', () => {
  const flow = authored();
  const state = createPersonalWorkspacePocState(NOW);
  state.authoredFlows = [flow];
  const duplicateFlow = composePersonalWorkspacePocReadModel({
    version: PERSONAL_WORKSPACE_POC_VERSION,
    flows: [flow],
  }, state);
  assert.deepEqual(duplicateFlow, { ok: false, reason: 'duplicate-flow-identity' });

  const other = authored('handoff-two');
  state.authoredFlows = [{
    ...other,
    items: [{ ...other.items[0], ref: flow.items[0].ref }],
  }];
  const duplicateItem = composePersonalWorkspacePocReadModel({
    version: PERSONAL_WORKSPACE_POC_VERSION,
    flows: [flow],
  }, state);
  assert.deepEqual(duplicateItem, { ok: false, reason: 'duplicate-item-identity' });
});

test('composes a PoC personal plan overlay without changing source or execution state', () => {
  const savedCopyId = 'copy-one';
  const flowId = 'flow-one';
  const flowRef = toPersonalWorkspacePocFlowRef(savedCopyId, flowId);
  const firstRef = toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, 'first');
  const secondRef = toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, 'second');
  const base: PersonalWorkspacePocReadModel = {
    version: PERSONAL_WORKSPACE_POC_VERSION,
    flows: [{
      ref: flowRef,
      savedCopyId,
      flowId,
      sourceSlug: 'source-one',
      title: '원본 Flow',
      origin: 'legacy-saved-plan',
      items: [
        { ref: firstRef, savedCopyId, flowId, itemId: 'first', title: '첫째', description: '원본 메모', sourceOrder: 0, sourceDate: '2026-09-03' },
        { ref: secondRef, savedCopyId, flowId, itemId: 'second', title: '둘째', sourceOrder: 1 },
      ],
    }],
  };
  const state = createPersonalWorkspacePocState(NOW);
  state.placements[firstRef] = {
    itemRef: firstRef,
    scheduleMode: 'fixed_date',
    date: '2026-09-10',
    timelinePolicy: 'auto',
  };
  state.personalPlanOverlays = {
    [flowRef]: {
      flowRef,
      savedCopyId,
      flowId,
      title: '내 Flow',
      orderedItemRefs: [secondRef, firstRef],
      items: {
        [firstRef]: {
          itemRef: firstRef,
          memo: '',
          schedule: { mode: 'unscheduled' },
        },
      },
    },
  };

  const result = composePersonalWorkspacePocReadModel(base, state);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const flow = result.model.flows[0];
  assert.equal(flow.title, '내 Flow');
  assert.deepEqual(flow.items.map((item) => item.ref), [secondRef, firstRef]);
  assert.equal(flow.items[1].description, '');
  assert.equal(flow.items[1].sourceDate, undefined);
  assert.equal(flow.fieldOwnership?.title.source.value, '원본 Flow');
  assert.equal(flow.fieldOwnership?.title.effective.owner, 'poc-personal');
  assert.equal(flow.items[1].fieldOwnership?.description.source.value, '원본 메모');
  assert.equal(flow.items[1].fieldOwnership?.description.effective.value, '');
  assert.equal(flow.items[1].fieldOwnership?.dateDerivation.strategy, 'poc-personal-schedule');
  assert.equal(state.placements[firstRef].date, '2026-09-10');
  assert.equal(base.flows[0].title, '원본 Flow');
  assert.equal(base.flows[0].items[0].description, '원본 메모');
});

test('one stable section shadow updates every projection Item and remains source-immutable', () => {
  const savedCopyId = 'personal-copy';
  const flowId = 'personal-flow';
  const flowRef = toPersonalWorkspacePocFlowRef(savedCopyId, flowId);
  const sectionId = 'section-one';
  const item = (itemId: string, sourceOrder: number) => ({
    ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, itemId),
    savedCopyId,
    flowId,
    itemId,
    title: itemId,
    sectionId,
    sectionTitle: '원래 구간',
    sourceOrder,
  });
  const base: PersonalWorkspacePocReadModel = {
    version: PERSONAL_WORKSPACE_POC_VERSION,
    flows: [{
      ref: flowRef,
      savedCopyId,
      flowId,
      sourceSlug: 'url-draft-personal',
      title: '개인 초안',
      origin: 'personal-draft',
      sections: [{
        sectionId,
        title: '원래 구간',
        sourceOrder: 0,
        titleOwner: 'existing-personal',
        editCapability: 'poc-shadow',
      }],
      items: [item('first', 0), item('second', 1)],
    }],
  };
  const state = createPersonalWorkspacePocState(NOW);
  state.personalPlanOverlays = {
    [flowRef]: {
      flowRef,
      savedCopyId,
      flowId,
      sectionTitles: { [sectionId]: '내 실행 구간' },
      items: {},
    },
  };

  const result = composePersonalWorkspacePocReadModel(base, state);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.model.flows[0].sections?.[0].title, '내 실행 구간');
  assert.deepEqual(
    result.model.flows[0].items.map((entry) => entry.sectionTitle),
    ['내 실행 구간', '내 실행 구간'],
  );
  assert.equal(base.flows[0].sections?.[0].title, '원래 구간');
  assert.deepEqual(base.flows[0].items.map((entry) => entry.sectionTitle), ['원래 구간', '원래 구간']);
});

test('section composition rejects source-owned, foreign, duplicate, and blank aliases', () => {
  const savedCopyId = 'source-copy';
  const flowId = 'source-flow';
  const flowRef = toPersonalWorkspacePocFlowRef(savedCopyId, flowId);
  const itemRef = toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, 'item');
  const baseFlow = {
    ref: flowRef,
    savedCopyId,
    flowId,
    sourceSlug: 'source',
    title: '원본',
    origin: 'legacy-saved-plan' as const,
    sections: [{
      sectionId: 'source-section',
      title: '원본 구간',
      sourceOrder: 0,
      titleOwner: 'source' as const,
      editCapability: 'read-only' as const,
    }],
    items: [{
      ref: itemRef,
      savedCopyId,
      flowId,
      itemId: 'item',
      title: '할 일',
      sectionId: 'source-section',
      sectionTitle: '원본 구간',
      sourceOrder: 0,
    }],
  };
  const composeWith = (
    flow: PersonalWorkspacePocReadModel['flows'][number],
    sectionTitles: Record<string, string>,
  ) => {
    const state = createPersonalWorkspacePocState(NOW);
    state.personalPlanOverlays = {
      [flowRef]: { flowRef, savedCopyId, flowId, sectionTitles, items: {} },
    };
    return composePersonalWorkspacePocReadModel({
      version: PERSONAL_WORKSPACE_POC_VERSION,
      flows: [flow],
    }, state);
  };
  assert.deepEqual(composeWith(baseFlow, { 'source-section': '금지' }), {
    ok: false,
    reason: 'invalid-personal-plan-overlay',
  });
  assert.deepEqual(composeWith({
    ...baseFlow,
    origin: 'personal-draft',
    sections: [{ ...baseFlow.sections[0], titleOwner: 'existing-personal', editCapability: 'poc-shadow' }],
  }, { foreign: '다른 구간' }), { ok: false, reason: 'invalid-personal-plan-overlay' });
  assert.deepEqual(composeWith({
    ...baseFlow,
    origin: 'personal-draft',
    sections: [
      { ...baseFlow.sections[0], titleOwner: 'existing-personal', editCapability: 'poc-shadow' },
      { ...baseFlow.sections[0], titleOwner: 'existing-personal', editCapability: 'poc-shadow', sourceOrder: 1 },
    ],
  }, { 'source-section': '내 구간' }), { ok: false, reason: 'invalid-personal-plan-overlay' });
  assert.deepEqual(composeWith({
    ...baseFlow,
    origin: 'personal-draft',
    sections: [{ ...baseFlow.sections[0], titleOwner: 'existing-personal', editCapability: 'poc-shadow' }],
  }, { 'source-section': ' ' }), { ok: false, reason: 'invalid-personal-plan-overlay' });
});
