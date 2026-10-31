import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// C6b in the space: the bar's [날짜 바꾸기 · n개] opens the date sheet (a sheet on a phone, a menu under the bar on a
// PC); a choice is one save of the whole list (one server intent when a copy is in it), waiting out a read and pressed
// once; then the notice with [되돌리기] (and [그날 보기] when the rows left the view), which is one save back.
const read = (file: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const space = read('ProgramSpace.tsx'), css = read('ProgramSpace.module.css');
const body = (name: string) => { const from = space.indexOf(`function ${name}(`); return space.slice(from, space.indexOf('\n  }\n', from)); };

test('each pick keeps what its task had when picked, sent as the move\'s expectation', () => {
  assert.match(space, /type Selecting = \{ keys: ReadonlySet<string>; expected: ReadonlyMap<string, \{ taskId: string; date: string \| null; time: string \}>;/);
  assert.match(space, /const withPicks = \(current: Selecting, keys: ReadonlySet<string>\): Selecting =>/);
  assert.match(body('pickRow'), /withPicks\(current, shift \? programSelectRange\(/);
  assert.match(space, /onClick=\{\(\) => setSelecting\(current => current && withPicks\(current, programSelectDay\(current\.keys, keys\)\.selected\)\)\}/);
});

test('the bar opens the sheet; a choice is one save of the list, pressed once, waiting out a read', () => {
  assert.match(space, /<button type="button" className=\{styles\.selectApply\} disabled=\{!selecting\.keys\.size \|\| datesPending\} aria-busy=\{datesPending \|\| undefined\} aria-haspopup="dialog"/);
  assert.match(space, /\{datesPending \? '옮기는 중…' : `날짜 바꾸기\$\{selecting\.keys\.size \? ` · \$\{selecting\.keys\.size\}개` : ''\}`\}/);
  assert.match(space, /<dialog ref=\{datesSheet\} className=\{`\$\{styles\.findDialog\} \$\{styles\.datesSheet\}`\} aria-labelledby="program-dates-title"/);
  assert.match(space, /<h2 id="program-dates-title">\{selecting\.keys\.size\}개를 어느 날로 옮길까요\?<\/h2>/);
  assert.match(body('openDatesSheet'), /if \(window\.matchMedia\('\(min-width: 701px\)'\)\.matches\) sheet\.show\(\); else sheet\.showModal\(\);/);
  const apply = body('applySelectDates');
  assert.match(apply, /if \(!selecting \|\| datesBusy\.current\) return;/);
  // One save: the one command, the whole list; with a copy in it, as one social intent.
  assert.equal(apply.match(/countedMutate\(/g)?.length, 1);
  assert.match(apply, /countedMutate\('날짜 한꺼번에 바꾸기', current => moveProgramTaskDates\(current, \{ actorId, requestId, moves \}\),\s*\{ history: true, awaitAutomaticRead: true, \.\.\.\(programTaskDateMovesSocial\(space, moves\) \? \{ alphaSocial: \{ type: 'private-task-dates' as const, moves \} \} : \{\}\) \}\);/);
  assert(!/for \([^)]*moves[^)]*\)[\s\S]{0,80}(run|mutate)\(/.test(apply), 'never a save per task');
  // Changed since: nothing moved, 고르기 and the picks stay.
  assert.match(apply, /else if \(result\.reason === 'conflict'\) setSelectNotice\('그사이 바뀐 할 일이 있어 옮기지 않았습니다\. 다시 확인해 주세요\.'\);/);
});

test('after it: 고르기 ends, the notice offers 되돌리기 (one save back) and 그날 보기 when the rows left the view', () => {
  const apply = body('applySelectDates');
  assert.match(apply, /if \(selectingNow\.current\) stopSelecting\(\);/);
  assert.match(apply, /setDatesNotice\(\{ actorId, count: picks\.length, date: target, undo: programTaskDateUndo\(before, moves\), taskIds: moves\.map\(move => move\.taskId\), shownAt: Date\.now\(\) \}\);/);
  const undo = body('restoreSelectDates');
  assert.equal(undo.match(/countedMutate\(/g)?.length, 1);
  assert.match(undo, /moveProgramTaskDates\(current, \{ actorId, requestId, moves: notice\.undo \}\)/);
  assert.match(undo, /refused: '그 뒤 바뀐 할 일이 있어 되돌리지 않았습니다'/);
  assert.match(space, /actions: datesNotice\.refused \|\| datesNotice\.undone \|\| datesPending \? \[\] : \[\{ label: '되돌리기', run: \(\) => void restoreSelectDates\(datesNotice\) \}, \.\.\.\(datesLeft \? \[\{ label: '그날 보기', run: \(\) => void showMovedDay\(datesNotice\.date\) \}\] : \[\]\)\]/);
  assert.match(space, /' · 지금 보기에서는 빠졌습니다'/);
  // It stays (a choice) until another save or a view change.
  assert.match(space, /tone: datesNotice\.refused \? 'warn' : datesNotice\.undone \? 'info' : 'choose'/);
  assert.match(space, /useEffect\(\(\) => \{ setDatesNotice\(null\); \}, \[actorId, period, date, folderId, query\]\);/);
  assert.match(space, /if \(result\.ok && result\.changed !== false\) setDatesNotice\(null\);/);
});

test('the sheet\'s look: a W5 sheet on a phone, a small menu under the bar on a PC', () => {
  assert.match(css, /\.space \.datesSheet \{/);
  assert.match(css, /@media \(min-width: 701px\) \{[\s\S]*?\.space \.datesSheet \{ position: absolute;/);
});
