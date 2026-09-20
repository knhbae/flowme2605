import {
  PERSONAL_WORKSPACE_POC_VERSION,
  type PersonalWorkspacePocReadModel,
  type PersonalWorkspacePocState,
} from './personal-workspace-poc-contract';
import { materializePersonalWorkspacePocAuthoring } from './personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from './personal-workspace-poc-state';

export const PERSONAL_WORKSPACE_POC_RESULT_PROJECTION_FIXTURE_RAW_TEXT = [
  '# 이사 준비',
  '- 기준일: 2026-09-20',
  '',
  '원문의 일반 문장은 Item으로 추정하지 않는다.',
  '## 계약 전',
  '- [ ] 계약서 확인',
  '  - 날짜: 2026-09-10',
  '  - 장소: 시청 민원실',
  '  - 자료: https://example.com/contract?lang=ko',
  '  - 완료 기준: 필수 조항을 다시 읽음',
  '- [ ] 이사 박스 라벨 붙이기',
  '  - 상대 날짜: D-2',
  '',
].join('\r\n');

export type PersonalWorkspacePocResultProjectionFixture = Readonly<{
  model: PersonalWorkspacePocReadModel;
  state: PersonalWorkspacePocState;
  flowRef: string;
  itemRefs: readonly [string, string];
  rawText: string;
  localToday: '2026-09-03';
  selectedDate: '2026-09-10';
}>;

/** Deterministic P1 fixture shared by pure-model and presenter tests. */
export function createPersonalWorkspacePocResultProjectionFixture(): PersonalWorkspacePocResultProjectionFixture {
  const materialized = materializePersonalWorkspacePocAuthoring({
    handoffId: 'projection-p1-handoff',
    documentId: 'projection-p1-document',
    revisionId: 'projection-p1-revision',
    rawText: PERSONAL_WORKSPACE_POC_RESULT_PROJECTION_FIXTURE_RAW_TEXT,
    committedAt: '2026-09-03T00:00:00.000Z',
  });
  if (!materialized.ok || materialized.flow.items.length !== 2) {
    throw new Error('The P1 result projection fixture must materialize exactly two Items.');
  }

  const [first, second] = materialized.flow.items;
  const state = createPersonalWorkspacePocState('2026-09-03T00:00:00.000Z');
  state.personalPlanOverlays = {
    [materialized.flow.ref]: {
      flowRef: materialized.flow.ref,
      savedCopyId: materialized.flow.savedCopyId,
      flowId: materialized.flow.flowId,
      title: '나의 이사 준비',
      orderedItemRefs: [first.ref, second.ref],
      items: {
        [second.ref]: {
          itemRef: second.ref,
          memo: '내 라벨지 위치\r\n입구 옆',
        },
      },
    },
  };
  state.placements[first.ref] = {
    itemRef: first.ref,
    scheduleMode: 'fixed_date',
    date: '2026-09-11',
    time: '09:30',
    timelinePolicy: 'included',
  };
  state.completions[second.ref] = {
    status: 'completed',
    completedAt: '2026-09-03T01:00:00.000Z',
  };

  return {
    model: {
      version: PERSONAL_WORKSPACE_POC_VERSION,
      flows: [materialized.flow],
    },
    state,
    flowRef: materialized.flow.ref,
    itemRefs: [first.ref, second.ref],
    rawText: PERSONAL_WORKSPACE_POC_RESULT_PROJECTION_FIXTURE_RAW_TEXT,
    localToday: '2026-09-03',
    selectedDate: '2026-09-10',
  };
}
