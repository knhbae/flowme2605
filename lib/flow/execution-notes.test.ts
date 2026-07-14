import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getMyFlowExecutionNotesForItem,
  MY_FLOW_EXECUTION_NOTE_MAX_LENGTH,
  normalizeMyFlowExecutionNotes,
  upsertMyFlowExecutionNote,
} from './execution-notes';

test('execution notes keep private observations separate from source corrections', () => {
  const privateNotes = upsertMyFlowExecutionNote([], {
    itemId: 'flow::item-a',
    itemTitle: '견적 비교',
    kind: 'private',
    note: '다음에는 세 주 전에 예약',
  }, '2026-07-14T01:00:00.000Z');
  const notes = upsertMyFlowExecutionNote(privateNotes, {
    itemId: 'flow::item-a',
    itemTitle: '견적 비교',
    kind: 'source_correction',
    note: '비교 기준을 원문에 보강',
    sourceUrl: 'https://example.com/source',
  }, '2026-07-14T01:01:00.000Z');

  assert.equal(notes.length, 2);
  const itemNotes = getMyFlowExecutionNotesForItem(notes, 'flow::item-a');
  assert.equal(itemNotes.private?.note, '다음에는 세 주 전에 예약');
  assert.equal(itemNotes.source_correction?.note, '비교 기준을 원문에 보강');
});

test('saving an empty note removes only the selected note kind', () => {
  const notes = normalizeMyFlowExecutionNotes([
    {
      itemId: 'flow::item-a',
      itemTitle: '견적 비교',
      kind: 'private',
      note: '개인 기록',
      updatedAt: '2026-07-14T01:00:00.000Z',
    },
    {
      itemId: 'flow::item-a',
      itemTitle: '견적 비교',
      kind: 'source_correction',
      note: '원본 알림',
      updatedAt: '2026-07-14T01:01:00.000Z',
    },
  ]);

  const next = upsertMyFlowExecutionNote(notes, {
    itemId: 'flow::item-a',
    itemTitle: '견적 비교',
    kind: 'private',
    note: '   ',
  });

  assert.deepEqual(next.map((note) => note.kind), ['source_correction']);
});

test('occurrence identities keep recurring execution notes independent', () => {
  const first = upsertMyFlowExecutionNote([], {
    itemId: 'routine::occurrence-1',
    itemTitle: '운동 1회차',
    kind: 'private',
    note: '무릎 상태 양호',
  }, '2026-07-14T01:00:00.000Z');
  const second = upsertMyFlowExecutionNote(first, {
    itemId: 'routine::occurrence-2',
    itemTitle: '운동 2회차',
    kind: 'private',
    note: '강도 낮춤',
  }, '2026-07-14T02:00:00.000Z');

  assert.equal(second.length, 2);
  assert.notEqual(second[0].itemId, second[1].itemId);
});

test('normalization deduplicates identities and drops malformed records', () => {
  const notes = normalizeMyFlowExecutionNotes([
    null,
    { itemId: '', itemTitle: '잘못된 기록', kind: 'private', note: '메모', updatedAt: 'now' },
    {
      itemId: 'flow::item-a',
      itemTitle: '이전 제목',
      kind: 'private',
      note: '이전 메모',
      updatedAt: '2026-07-14T01:00:00.000Z',
    },
    {
      itemId: 'flow::item-a',
      itemTitle: '현재 제목',
      kind: 'private',
      note: '현재 메모',
      updatedAt: '2026-07-14T02:00:00.000Z',
    },
  ]);

  assert.equal(notes.length, 1);
  assert.equal(notes[0].itemTitle, '현재 제목');
  assert.equal(notes[0].note, '현재 메모');
});

test('execution note length and source URL are bounded without changing identity', () => {
  const notes = upsertMyFlowExecutionNote([], {
    itemId: 'flow::item-a',
    itemTitle: '확인하기',
    kind: 'source_correction',
    note: '가'.repeat(MY_FLOW_EXECUTION_NOTE_MAX_LENGTH + 20),
    sourceUrl: 'javascript:alert(1)',
  }, '2026-07-14T01:00:00.000Z');

  assert.equal(notes[0].note.length, MY_FLOW_EXECUTION_NOTE_MAX_LENGTH);
  assert.equal(notes[0].sourceUrl, undefined);
  assert.equal(notes[0].itemId, 'flow::item-a');
});
