import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PROGRAM_SCAFFOLD_LINE, programScaffoldRemoval } from './writing-scaffold';

// Sheet '추가' (11/10): a line start the line menu wrote and nobody typed into is taken away when the caret goes on.
const raw = ['[2026-11-10]', '- /EA', '  - [ ] 10minit! 선정 및 공지', '    - [ ] 후기 요청 메일 보내기', '  - [ ] ', '- /지식 허브', '  - [ ] 자료 정리'].join('\n');
const at = (text: string, line: number, column = 0) => text.split('\n').slice(0, line).reduce((sum, row) => sum + row.length + 1, 0) + column;

test('bare starts only: a task, a memo, a note; anything typed is the person\'s line', () => {
  // int5 QA P3-INT5-2: the menu's 소제목 ('## ') and 일반 글 (an empty line) starts too.
  for (const line of ['  - [ ] ', '    - 메모: ', '  - ', '- [ ] ', '## ', '']) assert(PROGRAM_SCAFFOLD_LINE.test(line), JSON.stringify(line));
  for (const line of ['  - [ ] 자료', '    - 메모: 우유', '  - 글', '  ', '- [x] ', '[2026-11-10]', '## 제목', '설명']) assert(!PROGRAM_SCAFFOLD_LINE.test(line), JSON.stringify(line));
});

test('the line and its own break go; the caret below moves up with the text, above stays', () => {
  const below = at(raw, 6, 4), removal = programScaffoldRemoval(raw, 4, { start: below, end: below })!;
  assert.equal(removal.nextRaw, ['[2026-11-10]', '- /EA', '  - [ ] 10minit! 선정 및 공지', '    - [ ] 후기 요청 메일 보내기', '- /지식 허브', '  - [ ] 자료 정리'].join('\n'));
  assert.equal(removal.nextRaw.slice(removal.selection.start, removal.selection.start + 4), '[ ] ');
  const above = at(raw, 2, 5);
  assert.deepEqual(programScaffoldRemoval(raw, 4, { start: above, end: above })!.selection, { start: above, end: above, direction: 'none' });
  // At the end, the break before it goes instead.
  const end = raw + '\n  - [ ] ', last = programScaffoldRemoval(end, 7, { start: 0, end: 0 })!;
  assert.equal(last.nextRaw, raw);
  assert.equal(programScaffoldRemoval(raw, 2, { start: 0, end: 0 }), null, 'a written task stays');
  assert.equal(programScaffoldRemoval('- [ ] ', 0, { start: 0, end: 0 }), null, 'the only line stays');
});

test('the editor: remembered after the menu\'s insertion, settled when the caret moves (not composing, not a folder view)', () => {
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert(editor.includes("scaffoldRef.current=line&&programScaffoldRemoval(plan.nextRaw,index,plan.selectionAfter)?{lineId:line.id,text:line.text}:null;"));
  assert(editor.includes("if(!held||!area||!controller||composingRef.current||propsRef.current.folderId)return;"));
  assert(editor.includes("if(!doc||index<0||doc.lines[index].text!==held.text){scaffoldRef.current=null;return;}"));
  assert(editor.includes("if(area.value.slice(0,area.selectionStart).split('\\n').length-1===index)return;"));
  assert(editor.includes("editorRef.current?.replaceRange(removal.from,removal.to,'',{selectionAfter:removal.selection})"));
  assert(editor.includes('const settleOnMove = () => { settleRepeatLines(false); settleScaffold(); }'));
});

test('int5 QA P3-INT5-2: a 소제목 or 일반 글 start left as written goes with its break', () => {
  const step = '[2026-11-10]\n- [ ] 일\n## \n- [ ] 다음';
  assert.equal(programScaffoldRemoval(step, 2, { start: 0, end: 0 })!.nextRaw, '[2026-11-10]\n- [ ] 일\n- [ ] 다음');
  const free = '[2026-11-10]\n- [ ] 일\n\n- [ ] 다음';
  assert.equal(programScaffoldRemoval(free, 2, { start: 0, end: 0 })!.nextRaw, '[2026-11-10]\n- [ ] 일\n- [ ] 다음');
  assert.equal(programScaffoldRemoval('[2026-11-10]\n- [ ] 일\n', 2, { start: 0, end: 0 })!.nextRaw, '[2026-11-10]\n- [ ] 일', 'at the end: the break before it');
});

test('int5 QA P2-INT5-1: a ↶ bringing back a start leaves the caret at its end, nothing selected; P3-INT5-3: the import list\'s icons', () => {
  const read = (name: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const editor = read('ProgramTextEditor.tsx'), discovery = read('ProgramDiscovery.tsx');
  assert(editor.includes("if(editorRef.current?.replaceRange(removal.from,removal.to,'',{selectionAfter:removal.selection}))scaffoldRestoreRef.current={raw,caret};"));
  assert(editor.includes("if(restore&&textarea){if(textarea.value===restore.raw){scaffoldRestoreRef.current=null;textarea.setSelectionRange(restore.caret,restore.caret);}else if(input.inputType!=='historyUndo')scaffoldRestoreRef.current=null;}"));
  assert(discovery.includes('data-task-clip={item.id}>{programRepeatText(dateLabel)}</span>') && discovery.includes("<ProgramIcon name={open ? 'down' : 'right'} size={20} />") && !/>\{open \? '▾' : '▸'\}</.test(discovery));
});
