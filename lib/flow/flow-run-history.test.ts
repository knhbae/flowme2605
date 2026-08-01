import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFlowRunHistoryListExportArtifacts } from './flow-run-history';
import type { FlowRunRecord } from './storage';

test('completed run general exports include Item memo but exclude private notes and unsent corrections', () => {
  const run: FlowRunRecord = {
    schemaVersion: 1,
    runId: 'run-1',
    flowSlug: 'moving',
    status: 'completed',
    startedAt: '2026-07-01T00:00:00.000Z',
    completedAt: '2026-07-02T00:00:00.000Z',
    completionSnapshot: {
      checks: { boxes: true },
      itemStates: {},
      stepItemChecks: {},
      comparisonState: { candidates: [], notes: {} },
      workbenchState: { occurrences: {}, logRows: {}, memoCards: {} },
      reactionLogs: {},
      itemSnapshots: [
        {
          itemId: 'boxes',
          title: '박스 준비',
          status: 'done',
          scheduleState: 'unscheduled',
          memo: '다음 실행에도 쓸 Item 메모',
          personalOrderRank: 0,
        },
      ],
      executionNotes: [
        {
          itemId: 'moving::boxes::none',
          itemTitle: '박스 준비',
          kind: 'private',
          note: '중간 크기 박스가 들기 편했어요.',
          updatedAt: '2026-07-02T00:00:00.000Z',
        },
        {
          itemId: 'moving::boxes::none',
          itemTitle: '박스 준비',
          kind: 'source_correction',
          note: '무게 제한 안내가 필요해요.',
          updatedAt: '2026-07-02T00:01:00.000Z',
        },
      ],
    },
  };

  const artifacts = buildFlowRunHistoryListExportArtifacts(run, '이사 준비');
  assert.ok(artifacts);
  assert.match(artifacts.memoText, /다음 실행에도 쓸 Item 메모/u);
  assert.doesNotMatch(artifacts.memoText, /중간 크기 박스가 들기 편했어요/u);
  assert.doesNotMatch(artifacts.memoText, /무게 제한 안내가 필요해요/u);
  assert.doesNotMatch(artifacts.checklistText, /무게 제한 안내/u);
  assert.doesNotMatch(artifacts.sheetTsv, /무게 제한 안내/u);
});
