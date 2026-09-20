import assert from 'node:assert/strict';
import test from 'node:test';
import { materializePersonalWorkspacePocAuthoring } from './personal-workspace-poc-authoring';
import { composePersonalWorkspacePocReadModel } from './personal-workspace-poc-composition';
import { PERSONAL_WORKSPACE_POC_VERSION, type PersonalWorkspacePocAuthoredFlow } from './personal-workspace-poc-contract';
import { getPersonalWorkspacePocItemDetails } from './personal-workspace-poc-item-details';
import { createPersonalWorkspacePocState } from './personal-workspace-poc-state';
import { buildPersonalWorkspacePocTasks } from './personal-workspace-poc-view-model';

function authored(): PersonalWorkspacePocAuthoredFlow {
  const result = materializePersonalWorkspacePocAuthoring({
    rawText: '# 준비\n- [ ] 접수\n  - 설명: 안내문을 읽는다\n  - 완료 기준: 접수번호를 받았다\n- [ ] 연락\n  - 완료 기준: 담당자 답변을 받았다',
    documentId: 'p3j-document', revisionId: 'p3j-revision', handoffId: 'p3j-handoff',
    committedAt: '2026-09-05T01:00:00.000Z',
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('fixture materialization failed');
  return result.flow;
}

test('P3-J authoring criteria use exact identity even after Item order and titles change', () => {
  const flow = authored();
  const original = JSON.stringify(flow);
  const item = { ...flow.items[0], title: '개인 제목', sourceOrder: 8 };
  assert.deepEqual(getPersonalWorkspacePocItemDetails(flow, item), {
    description: '안내문을 읽는다', completionCriterion: '접수번호를 받았다',
  });
  assert.equal(JSON.stringify(flow), original);
  assert.equal(getPersonalWorkspacePocItemDetails(flow, { ...item, savedCopyId: 'wrong-copy' }).completionCriterion, undefined);
});

test('P3-J authored source and criterion remain distinct from a changed or cleared personal memo', () => {
  const flow = authored();
  const item = flow.items[0];
  const model = { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [] };
  const initial = { ...createPersonalWorkspacePocState('2026-09-05T01:00:00.000Z'), authoredFlows: [flow] };
  const before = JSON.stringify(initial);
  for (const memo of ['예약번호는 내 수첩에', '']) {
    const state = {
      ...initial,
      personalPlanOverlays: {
        [flow.ref]: { flowRef: flow.ref, savedCopyId: flow.savedCopyId, flowId: flow.flowId,
          items: { [item.ref]: { itemRef: item.ref, memo } } },
      },
    };
    const result = composePersonalWorkspacePocReadModel(model, state);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const task = buildPersonalWorkspacePocTasks(result.model, state)[0];
    assert.equal(task.description, '안내문을 읽는다');
    assert.equal(task.completionCriterion, '접수번호를 받았다');
    assert.equal(task.memo, memo || undefined);
  }
  assert.equal(JSON.stringify(initial), before);
});

test('P3-J no criterion is fabricated from description, personal memo, or legacy authoring order', () => {
  const flow = authored();
  const legacy = { ...flow, authoring: { ...flow.authoring, sourceLineItemIdentityMap: undefined } };
  assert.equal(getPersonalWorkspacePocItemDetails(legacy, flow.items[0]).completionCriterion, undefined);
  const saved = { ...flow, origin: 'legacy-saved-plan' as const };
  assert.equal(getPersonalWorkspacePocItemDetails(saved, flow.items[0]).completionCriterion, undefined);
});
