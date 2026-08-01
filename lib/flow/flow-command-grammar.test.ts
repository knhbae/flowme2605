import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FLOW_COMMAND_LABELS,
  buildFlowManagementCommandModel,
  getExportScopeActionLabel,
  getOccurrenceCommandLabels,
  getStructuralItemCommandLabels,
} from './flow-command-grammar';

test('active Flow management keeps adjustment, reuse, source, and archive in one order', () => {
  assert.deepEqual(
    buildFlowManagementCommandModel({
      archived: false,
      canAdjust: true,
      canReuse: true,
      hasSource: true,
    }).map((command) => command.id),
    ['adjust', 'reuse', 'source', 'archive'],
  );
});

test('archived Flow management keeps recovery before permanent deletion', () => {
  const commands = buildFlowManagementCommandModel({
    archived: true,
    hasSource: true,
  });

  assert.deepEqual(
    commands.map((command) => command.id),
    ['restore', 'backup', 'source', 'permanent_delete'],
  );
  assert.equal(commands.at(-1)?.role, 'destructive');
  assert.equal(commands.at(-1)?.label, FLOW_COMMAND_LABELS.permanentlyDeleteFlow);
});

test('source exclusion and personal deletion remain different user actions', () => {
  assert.deepEqual(getStructuralItemCommandLabels('source'), {
    remove: '이 Flow에서 제외',
    restore: '다시 포함',
  });
  assert.deepEqual(getStructuralItemCommandLabels('personal'), {
    remove: '항목 삭제',
    restore: '항목 복구',
  });
});

test('occurrence actions always name the affected recurrence scope', () => {
  assert.deepEqual(getOccurrenceCommandLabels(), {
    skip: '이번 회차 건너뛰기',
    resume: '이번 회차 다시 진행',
    hold: '이번 회차 보류',
    adjustSeries: '반복 일정 조정',
  });
});

test('portable export entry labels expose scope and actual count', () => {
  assert.equal(getExportScopeActionLabel('flow', 24), '전체 24개 옮기기');
  assert.equal(getExportScopeActionLabel('selected', 3), '선택한 3개 옮기기');
  assert.equal(getExportScopeActionLabel('item', 1), '현재 항목 1개 옮기기');
  assert.equal(getExportScopeActionLabel('flow', Number.NaN), '전체 0개 옮기기');
});
