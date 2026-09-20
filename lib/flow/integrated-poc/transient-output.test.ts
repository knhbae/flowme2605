import test from 'node:test';
import assert from 'node:assert/strict';
import { createTransientOutputDraft, previewTransientOutput, confirmTransientOutput, confirmedTransientOutput, type TransientOutputDraft } from './transient-output';
const now = '2026-09-12T10:20:30.000Z';
function make(raw: string, title = '원문 제목', sourceUrl = 'https://example.com/article'): TransientOutputDraft {
  const result = createTransientOutputDraft(raw, { id: 'transient-test', title, sourceUrl }, now); assert(result.ok); return result.draft;
}
test('ordinary prose stays one memo with complete source rather than invented checklist actions', () => {
  const raw = '여행 경험을 쓴 문장입니다.\n\n<!-- 원문 주석 -->\n[2026-10-01]\n해석하지 않은 날짜 블록 설명';
  const draft = make(raw); assert.equal(draft.rows.length, 1); assert.equal(draft.rows[0].kind, 'memo'); assert.equal(draft.rows[0].description, raw);
  assert.equal(draft.rows[0].scheduleKind, 'undated'); const output = previewTransientOutput(draft, now); assert(output.ok);
  assert(output.payload.includes(raw)); assert(output.payload.includes('https://example.com/article')); assert(output.payload.includes('공개하거나 개인 문서에 저장한 판본이 아닙니다'));
});
test('existing parser retains ordered task groups, subchecks, date context and every nonblank source segment', () => {
  const raw = '출처의 조건\n[2026-10-01]\n- [ ] 예약\n  조건 설명\n  - [ ] 여권\n- [ ] 확인\n마지막 주석';
  const draft = make(raw); assert.equal(draft.rows.length, 3); assert.deepEqual(draft.rows.map(row => row.kind), ['memo', 'task', 'task']);
  assert.equal(draft.rows.map(row => row.sourceText).join('\n'), raw); assert.deepEqual(draft.rows[1].subchecks.map(row => row.title), ['여권']);
  assert.equal(draft.rows[1].scheduleValue, '2026-10-01'); assert.equal(draft.rows[2].description, '- [ ] 확인\n마지막 주석');
});
test('explicit fixed/relative/undated output respects selection and excludes undated only from ICS', () => {
  const draft = make('- [ ] 첫째\n- [ ] 둘째\n- [ ] 셋째');
  draft.rows[0].scheduleKind = 'fixed'; draft.rows[0].scheduleValue = '2026-10-01';
  draft.rows[1].scheduleKind = 'relative'; draft.rows[1].scheduleValue = '-2'; draft.anchor = '2026-11-10'; draft.format = 'ics';
  const output = previewTransientOutput(draft, now); assert(output.ok); assert(output.payload.includes('DTSTART;VALUE=DATE:20261001')); assert(output.payload.includes('DTSTART;VALUE=DATE:20261108'));
  assert.deepEqual(output.undatedItemIds, [draft.rows[2].id]); assert.equal((output.payload.match(/BEGIN:VEVENT/g) ?? []).length, 2);
  draft.rows[1].selected = false; draft.format = 'txt'; const selected = previewTransientOutput(draft, now); assert(selected.ok); assert(!selected.payload.includes('둘째')); assert(selected.payload.includes('셋째'));
});
test('confirmation freezes actual bytes and every edit invalidates prior confirmed payload', () => {
  const draft = make('- [ ] 예약'); draft.rows[0].scheduleKind = 'fixed'; draft.rows[0].scheduleValue = '2026-10-01'; draft.format = 'ics';
  assert.deepEqual(confirmedTransientOutput(draft), { ok: false, reason: 'confirmation-required' });
  const confirmed = confirmTransientOutput(draft, now); assert(confirmed.ok); const bytes = confirmedTransientOutput(confirmed.draft); assert(bytes.ok); assert(bytes.payload.includes('DTSTAMP:20260912T102030Z'));
  assert.deepEqual(previewTransientOutput(draft, now), bytes);
  for (const patch of [{ title: '바뀐 제목' }, { anchor: '2026-11-10' }, { sourceUrl: 'https://example.com/new' }, { format: 'csv' as const }, { raw: '바뀐 원문' }, { rows: draft.rows.map(row => ({ ...row, description: '수정한 설명' })) }]) {
    assert.deepEqual(confirmedTransientOutput({ ...confirmed.draft, ...patch }), { ok: false, reason: 'confirmation-required' });
  }
});
test('unsafe URL, invalid date, empty selection and incomplete source never produce confirmed bytes', () => {
  assert.deepEqual(createTransientOutputDraft(' \n', { id: 'x', title: '', sourceUrl: '' }, now), { ok: false, reason: 'empty-source' });
  assert.deepEqual(createTransientOutputDraft('x'.repeat(30001), { id: 'x', title: '', sourceUrl: '' }, now), { ok: false, reason: 'source-limit' });
  const draft = make('내용', '', 'https://127.0.0.1/?token=secret'); assert.equal(draft.sourceUrl, ''); assert(draft.warnings.some(warning => warning.includes('제외'))); assert.equal(draft.rows[0].description, '내용');
  draft.sourceUrl = 'https://example.com/?token=secret'; assert.deepEqual(previewTransientOutput(draft, now), { ok: false, reason: 'invalid-source-url' }); draft.sourceUrl = '';
  draft.rows[0].scheduleKind = 'fixed'; draft.rows[0].scheduleValue = '2026-02-30'; assert.deepEqual(previewTransientOutput(draft, now), { ok: false, reason: 'invalid-date' });
  draft.rows[0].scheduleKind = 'relative'; draft.rows[0].scheduleValue = '-1'; assert.deepEqual(previewTransientOutput(draft, now), { ok: false, reason: 'missing-anchor' });
  draft.rows[0].selected = false; assert.deepEqual(confirmTransientOutput(draft, now), { ok: false, reason: 'no-items' });
});
test('output remains pure across repeated rendering, JSON navigation restoration and confirmation', () => {
  const draft = make('한 문단\n두 번째 문장'), before = JSON.stringify(draft);
  for (const format of ['txt', 'csv', 'ics'] as const) previewTransientOutput({ ...draft, format }, now);
  const confirmed = confirmTransientOutput(draft, now); assert(confirmed.ok); assert.equal(JSON.stringify(draft), before);
  const restored = JSON.parse(JSON.stringify(confirmed.draft)); assert.deepEqual(confirmedTransientOutput(restored), confirmedTransientOutput(confirmed.draft));
});
