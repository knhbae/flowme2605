import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRoutineHorizon } from './routine-horizon';
import type { FlowBundle } from './types';

function bundle(routineDurationDays?: number): Pick<FlowBundle, 'flow' | 'repeatRules'> {
  return {
    flow: {
      id: 'routine',
      slug: 'routine',
      title: '반복 Flow',
      category: '테스트',
      structure_type: 'routine',
      anchor_type: 'start_date',
      status: 'published',
      created_at: '2026-07-21T00:00:00.000Z',
      updated_at: '2026-07-21T00:00:00.000Z',
      ...(routineDurationDays ? { routine_duration_days: routineDurationDays } : {}),
    },
  };
}

test('an open routine keeps a four-week UI preview without inventing a series end', () => {
  assert.deepEqual(resolveRoutineHorizon(bundle()), {
    previewWeeks: 4,
    previewDays: 28,
    previewLabel: '미리보기 4주',
    seriesEndPolicy: 'open_ended',
    seriesEndLabel: '종료일 없음',
  });
});

test('a source-defined four-week program stays distinct from a four-week preview', () => {
  assert.deepEqual(resolveRoutineHorizon(bundle(28)), {
    previewWeeks: 4,
    previewDays: 28,
    previewLabel: '미리보기 4주',
    seriesEndPolicy: 'source_defined',
    seriesEndLabel: '4주 프로그램',
    sourceDurationDays: 28,
  });
});

test('a short source program limits the preview without changing its source duration', () => {
  assert.deepEqual(resolveRoutineHorizon(bundle(14)), {
    previewWeeks: 2,
    previewDays: 14,
    previewLabel: '미리보기 2주',
    seriesEndPolicy: 'source_defined',
    seriesEndLabel: '2주 프로그램',
    sourceDurationDays: 14,
  });
});
