import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProgramPrivateSpace, ProgramPublicFlow, ProgramPublicItem, ProgramPublicVersion } from './contract';
import {
  programFlowBadge, programFlowCardLines, programImportArrivalNotice, programImportFailure, programItemDateLabel, programObjectParticle, programLiveCopies, programLiveCopy,
  programSortFlowsByRecent, programSourceLine, programVersionScheduleShape, programVersionUsesAnchor, PROGRAM_IMPORT_GENERIC_FAILURE,
} from './program-discovery-display';

const item = (id: string, schedule: ProgramPublicItem['schedule'], title = `할 일 ${id}`): ProgramPublicItem =>
  ({ id, title, description: '', completionCriteria: '', sourceUrl: null, schedule, subchecks: [] });
const weekly = (start: { kind: 'undated' } | { kind: 'relative'; days: number } = { kind: 'undated' }, frequency: 'daily' | 'weekly' | 'monthly' = 'weekly'): ProgramPublicItem['schedule'] =>
  ({ kind: 'recurring', version: 1, rule: { version: 1, semantics: 'authoring-v1', frequency, interval: 1, end: null }, start, time: null, timeZone: null });
const version = (items: ProgramPublicItem[], extra: Partial<ProgramPublicVersion> = {}): ProgramPublicVersion => ({ id: 'version-a', flowId: 'flow-a', number: 1, parentVersionId: null,
  title: '이사 준비', summary: '이사 전 할 일을\n순서대로 정리했습니다.', items, createdBy: 'member-x', createdAt: '2026-10-30T10:00:00.000Z',
  source: { kind: 'user-text', label: '직접 정리', url: null, checkedAt: null }, ...extra });
const flow = (id = 'flow-a', extra: Partial<ProgramPublicFlow> = {}): ProgramPublicFlow =>
  ({ id, ownerId: 'member-x', currentVersionId: 'version-a', category: '생활', situations: ['이사', '혼자 살기', '주말'], derivedFrom: null, archived: false, ...extra });

test('schedule shape: recurrence first (one frequency named), then anchor, then fixed dates, else undated', () => {
  assert.equal(programVersionScheduleShape(version([item('1', { kind: 'undated' }), item('2', weekly())])), '매주 반복 포함');
  assert.equal(programVersionScheduleShape(version([item('1', weekly(undefined, 'daily')), item('2', weekly(undefined, 'daily'))])), '매일 반복 포함');
  assert.equal(programVersionScheduleShape(version([item('1', weekly(undefined, 'monthly'))])), '매월 반복 포함');
  assert.equal(programVersionScheduleShape(version([item('1', weekly()), item('2', weekly(undefined, 'daily'))])), '반복 포함');
  assert.equal(programVersionScheduleShape(version([item('1', { kind: 'fixed', date: '2026-11-03' }), item('2', { kind: 'relative', days: -3 })])), '기준일부터');
  assert.equal(programVersionScheduleShape(version([item('1', { kind: 'fixed', date: '2026-11-03' }), item('2', { kind: 'undated' })])), '날짜 지정');
  assert.equal(programVersionScheduleShape(version([item('1', { kind: 'undated' })])), '날짜 미정');
  assert.equal(programVersionScheduleShape(version([])), '날짜 미정');
});

test('one badge by priority: unverified (catalog- ID) > source review > in my documents', () => {
  assert.equal(programFlowBadge({ flowId: 'catalog-move', needsReview: true, inMyDocuments: true }), '미확인');
  assert.equal(programFlowBadge({ flowId: 'flow-a', needsReview: true, inMyDocuments: true }), '출처 재검토 필요');
  assert.equal(programFlowBadge({ flowId: 'flow-a', needsReview: false, inMyDocuments: true }), '내 문서에 있음');
  assert.equal(programFlowBadge({ flowId: 'flow-a', needsReview: false, inMyDocuments: false }), null);
});

test('card lines: first task, counts with shape and two situations, source with a check date only when recorded', () => {
  const lines = programFlowCardLines(flow(), version([item('1', { kind: 'relative', days: -30 }, '짐 줄이기'), item('2', { kind: 'undated' })]), { needsReview: false, inMyDocuments: true });
  assert.deepEqual(lines, { title: '이사 준비', badge: '내 문서에 있음', summary: '이사 전 할 일을 순서대로 정리했습니다.', firstItem: '첫 할 일 짐 줄이기',
    meta: '할 일 2개 · 기준일부터 · 생활 · 이사 · 혼자 살기', source: '출처 직접 정리' });
  assert.equal(programFlowCardLines(flow(), version([]), { needsReview: false, inMyDocuments: false }).firstItem, null);
  assert.equal(programSourceLine({ kind: 'repository-source', label: '정부24 안내', checkedAt: '2026-09-23' }), '출처 정부24 안내 · 9/23 확인');
  assert.equal(programSourceLine({ kind: 'repository-source', label: '정부24 안내', checkedAt: '2026-09-23T03:00:00.000Z' }), '출처 정부24 안내 · 9/23 확인');
  assert.equal(programSourceLine({ kind: 'simulated-example', label: '합성 자료', checkedAt: null }), '출처 합성 자료 · 합성 예시');
  assert.equal(programSourceLine({ kind: 'user-text', label: '직접 정리', checkedAt: '  ' }), '출처 직접 정리');
});

test('newest current version first; equal times keep the stored order', () => {
  const rows = [['a', '2026-10-01T00:00:00.000Z'], ['b', '2026-10-30T00:00:00.000Z'], ['c', '2026-10-01T00:00:00.000Z']]
    .map(([id, createdAt]) => ({ flow: flow(id), version: version([], { id, createdAt }) }));
  assert.deepEqual(programSortFlowsByRecent(rows).map(row => row.flow.id), ['b', 'a', 'c']);
});

test('live copy: the document exists and is not in the trash', () => {
  const space = { copies: [{ flowId: 'flow-a', documentId: 'doc-a' }, { flowId: 'flow-b', documentId: 'doc-b' }, { flowId: 'flow-c', documentId: 'doc-gone' }],
    documentTrash: { 'doc-b': { trashedAt: '2026-10-30', wasArchived: false } }, text: { documents: [{ id: 'doc-b' }], flows: [{ id: 'doc-a' }] } } as unknown as ProgramPrivateSpace;
  assert.equal(programLiveCopy(space, 'flow-a')?.documentId, 'doc-a');
  assert.equal(programLiveCopy(space, 'flow-b'), undefined);
  assert.equal(programLiveCopy(space, 'flow-c'), undefined);
  assert.deepEqual([...programLiveCopies(space).keys()], ['flow-a']);
});

test('detail dates follow the anchor; without one a relative row reads before/after', () => {
  assert.equal(programItemDateLabel(item('1', { kind: 'relative', days: -30 }), null), '기준일 30일 전');
  assert.equal(programItemDateLabel(item('1', { kind: 'relative', days: 3 }), null), '기준일 3일 후');
  assert.equal(programItemDateLabel(item('1', { kind: 'relative', days: 0 }), null), '기준일 당일');
  assert.equal(programItemDateLabel(item('1', { kind: 'relative', days: -30 }), '2026-12-01'), '11/1 (일)');
  assert.equal(programItemDateLabel(item('1', { kind: 'fixed', date: '2026-11-02' }), null), '11/2 (월)');
  assert.equal(programItemDateLabel(item('1', { kind: 'undated' }), '2026-12-01'), '날짜 미정');
  assert.equal(programVersionUsesAnchor(version([item('1', { kind: 'undated' }), item('2', weekly({ kind: 'relative', days: 0 }))])), true);
  assert.equal(programVersionUsesAnchor(version([item('1', { kind: 'relative', days: 2 }), item('2', { kind: 'undated' })]), ['2']), false);
});

test('failure reasons map to their D1 texts only when the screen shows the cause', () => {
  assert.match(programImportFailure('limit', { copyConflict: false, onHold: false }).text, /^Flow 문서가 100개라/);
  assert.deepEqual(programImportFailure('conflict', { copyConflict: true, onHold: false }), { text: '이미 다른 판본(또는 기준일)으로 가져온 사본이 있습니다.', continueCopy: true });
  // An external change also arrives as 'conflict'; without a differing copy it is the ordinary retry text.
  assert.deepEqual(programImportFailure('conflict', { copyConflict: false, onHold: false }), { text: PROGRAM_IMPORT_GENERIC_FAILURE, continueCopy: false });
  assert.match(programImportFailure('unresolved', { copyConflict: false, onHold: true }).text, /^출처를 다시 확인하는 중이라/);
  assert.equal(programImportFailure('unresolved', { copyConflict: false, onHold: false }).text, PROGRAM_IMPORT_GENERIC_FAILURE);
  for (const reason of ['missing', 'invalid', 'unavailable', 'session-expired']) assert.equal(programImportFailure(reason, { copyConflict: false, onHold: false }).text, PROGRAM_IMPORT_GENERIC_FAILURE);
  assert.match(programImportArrivalNotice('이사 준비', false), /^‘이사 준비’를 가져왔습니다\. 날짜가 있는 할 일은 오늘에도 보입니다\. .*되돌리기/);
  assert.match(programImportArrivalNotice('이사 준비', true), /휴지통으로 옮길 수 있습니다/);
  assert.deepEqual(['짐 싸기', '연말정산', '시험 2주', 'Plan A', '이사 준비 '].map(programObjectParticle), ['를', '을', '를', '을(를)', '를']);
});
