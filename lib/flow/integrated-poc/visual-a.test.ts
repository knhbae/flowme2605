import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PROGRAM_SCHEMA, type ProgramData, type ProgramTransition } from './contract';
import { createProgramPrivateSpace } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { programSame } from './controller';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { materializeAccount } from './alpha-persistence/program-adapter';
import { emptyAlphaReferences } from './alpha-social/projection';
import { extendProgramRecent, programRecentFolds, programRecentHidden, programRecentHold, restrictProgramRecent } from './recent-writing';

// Visual A (11/7, the user's pick: a calm document). Mostly paint; the one behavior is that an empty line left at the
// very top of the recent view (the 40px gap over the first day on the 13:07 phone capture) folds with the rest.
const owner = '88888888-8888-4888-8888-888888888888', today = '2026-11-07';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: owner, requestId: `visual-a-${++request}`, expectedSpace: data.spaces[owner] });
function write(raw: string) {
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const initial = materializeAccount(account, emptyAlphaReferences(owner)).data;
  const made = ok(createProgramDocument(initial, { ...base(initial), title: '업무', raw }));
  return { text: made.data.spaces[owner].text, docId: made.result };
}
const rawOf = (state: TextWorkspaceState, docId: string) => M.raw(M.getDocument(state, docId));
function document(lead: boolean) {
  const lines = ['[미정]', '- /집안 일', '  - [x] 서랍 정리', '  - [x] 요리 연습', '', '[2026-11-07]', '- /회사 일', '  - [ ] 오늘 회의', '',
    '[2026-11-06]', '- /회사 일', '  - [x] 업적 평가 입력', ''];
  for (let i = 0; i < 40; i++) { const d = new Date(Date.UTC(2026, 10, 4 - i)).toISOString().slice(0, 10); lines.push(`[${d}]`, '- /회사 일', `  - [x] 보고서 ${i}`, '- /공부', '  - [x] 책', ''); }
  return (lead ? '\n' : '') + lines.join('\n');
}

test('an empty line left at the very top of the recent view folds with the rest; it is no 지난 기록 and comes back whole', () => {
  const { text, docId } = write(document(true));
  const hold = programRecentHold(text, docId, today)!;
  assert(hold && hold.lead?.size === 1, 'the one empty first line is held');
  const hidden = programRecentHidden(text, hold), restricted = restrictProgramRecent(text, docId, hidden);
  assert.equal(rawOf(restricted, docId).split('\n')[0], '[2026-11-07]', 'the first day is the first line in view');
  assert(programRecentFolds(text, docId, hidden).every(fold => fold.days > 0), 'no fold of empty lines alone');
  const back = extendProgramRecent(text, restricted, docId, hidden);
  assert(back.ok && programSame(back.state, text) && rawOf(back.state, docId) === rawOf(text, docId), 'put back exactly');
  // An empty line typed at the top during the session stays in view (it is not in the held set).
  const typed = M.editTextResult(restricted, docId, `\n${rawOf(restricted, docId)}`);
  assert.equal(typed.reason, null);
  assert.equal(rawOf(restrictProgramRecent(typed.state, docId, programRecentHidden(typed.state, hold)), docId).split('\n')[0], '');
  // Without an empty first line nothing is held for it.
  const plain = write(document(false));
  assert.equal(programRecentHold(plain.text, plain.docId, today)!.lead, undefined);
});

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
test('the paint: finished tasks pale, folder lines a quiet "/ 이름", today named, white phone tabs, one phone head line', () => {
  const vendor = read('./vendor/text-editor.cjs'), editorCss = read('../../../components/flow/integrated-poc/ProgramTextEditor.module.css');
  const space = read('../../../components/flow/integrated-poc/ProgramSpace.tsx'), alphaCss = read('../../../components/flow/integrated-poc/AlphaWorkspace.module.css');
  // The renderer only marks: data-relative on a head line's label (its text stays the date), data-caret-scope on the fold.
  assert(vendor.includes("const dateSpan = makeSpan('tle-date-label', label), near = relativeDay(line);") && vendor.includes('if (near) dateSpan.dataset.relative = near;'));
  assert(vendor.includes("if (row.dataset.caretScope === 'true') button.dataset.caretScope = 'true';"));
  for (const rule of [
    '.host :global(.tle-check-glyph[data-checked="true"]) { border-color: var(--flowme-b-line); background: var(--flowme-b-canvas); color: var(--flowme-b-muted); }',
    '.host :global(.tle-task-title-complete) { text-decoration: none; }',
    '.host :global(.tle-root[data-mode="live"] .tle-line-native-scope .tle-active-scope-icon) { display: none; }',
    '.host :global(.tle-root[data-mode="live"] .tle-fold-toggle.tle-scope-control[aria-expanded="true"]:not([data-caret-scope])) { visibility: hidden; }',
    ".host :global(.tle-line-date > .tle-date-label[data-relative=\"today\"]::before) { content: '오늘'; color: var(--flowme-b-primary); }",
  ]) assert(editorCss.includes(rule), rule);
  // The folder name keeps the RAW size (U45): no font-size on it.
  assert(!/tle-active-scope-name[^{]*\{[^}]*font-size/.test(editorCss));
  assert(alphaCss.includes('.page[data-alpha-frame="b"] .globalNavigation { background: var(--flowme-b-surface); border-top: 1px solid var(--flowme-b-line); }'));
  assert(space.includes('const phoneLayout = useSyncExternalStore(watchPhoneHead, () => phoneHead().matches, () => false);'));
  // The pair under the body says what it folds (only [미정]'s finished tasks), short enough for 360px.
  assert(space.includes('>날짜 미정 끝낸 일 {view.done.count}개</button>') && space.includes(">지난 {sum('days')}일 펼치기</button>"));
});
