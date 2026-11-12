import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { moveTaskLocation, readTaskLocationFolder, type TaskLocationTarget } from './task-location-move';

const raw = '[2026-11-10]\n- /합성 A\n  - [ ] 합성 부모\n    - 날짜: 2026-11-11\n    - 시간: 09:30\n    - 메모: 합성 메모\n    - [ ] 합성 하위\n  - [ ] 합성 다음\n- /합성 B\n  - [ ] 합성 기존\n[2026-11-12]\n- /합성 A\n  - [ ] 합성 목적';
function fixture(value = raw) {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '합성 이동' });
  const documentId = state.documents[0].id;
  const stack: { depth: number; id: string }[] = [];
  const tagged = value.split('\n').map(line => {
    const match = /^( *)- \/(.+)$/.exec(line); if (!match) return line;
    const depth = match[1].length / 2; while (stack.length && stack.at(-1)!.depth >= depth) stack.pop();
    const parentId = depth ? stack.at(-1)?.id ?? null : null, title = match[2];
    let folder = state.folders.find(item => item.title === title && item.parentId === parentId);
    if (!folder) { folder = { id: 'fixture-folder-' + state.folders.length, title, parentId }; state = { ...state, folders: [...state.folders, folder] }; }
    stack.push({ depth, id: folder.id });
    return `${line} <!-- flowme-folder:v1 id=${encodeURIComponent(folder.id)} -->`;
  }).join('\n');
  state = M.editText(state, documentId, tagged, { folderText: true });
  assert.ok(M.validate(state));
  return { state, documentId, taskId: M.tasks(state).find(task => task.title.startsWith('합성 부모'))!.id };
}
function apply(f: ReturnType<typeof fixture>, target: TaskLocationTarget) {
  const before = JSON.stringify(f.state), result = moveTaskLocation(f.state, { documentId: f.documentId, taskId: f.taskId, target });
  assert.equal(JSON.stringify(f.state), before, 'source is immutable');
  assert.equal(result.ok, true, JSON.stringify(result)); if (!result.ok) throw Error(result.reason);
  return result;
}

test('folder: the complete bundle goes to the existing declaration end; IDs, dates, time, records and empty head remain', () => {
  const f = fixture(), folderId = f.state.folders.find(folder => folder.title === '합성 B')!.id;
  const childId = f.state.documents[0].lines.find(line => line.text.includes('합성 하위'))!.id;
  f.state = M.recordProgress(f.state, childId, '2026-11-10', 50);
  const result = apply(f, { kind: 'folder', folderId }), nextRaw = M.raw(result.next.documents[0]);
  assert.equal(nextRaw, '[2026-11-10]\n- /합성 A\n  - [ ] 합성 다음\n- /합성 B\n  - [ ] 합성 기존\n  - [ ] 합성 부모\n    - 날짜: 2026-11-11\n    - 시간: 09:30\n    - 메모: 합성 메모\n    - [50%] 합성 하위\n[2026-11-12]\n- /합성 A\n  - [ ] 합성 목적');
  assert.equal(result.declarations, 0);
  assert.deepEqual(new Set(result.next.documents[0].lines.map(line => line.id)), new Set(f.state.documents[0].lines.map(line => line.id)));
  assert.equal(result.next.itemScopes[childId], folderId);
  assert.deepEqual(result.next.progressRecords, f.state.progressRecords);
  assert.equal(M.tasks(result.next).find(task => task.id === f.taskId)?.date, '2026-11-11');
});

test('date: root direct date is removed; same-folder destination is reused and time/children/memo stay', () => {
  const f = fixture(), result = apply(f, { kind: 'date', date: '2026-11-12' });
  assert.equal(M.raw(result.next.documents[0]), '[2026-11-10]\n- /합성 A\n  - [ ] 합성 다음\n- /합성 B\n  - [ ] 합성 기존\n[2026-11-12]\n- /합성 A\n  - [ ] 합성 목적\n  - [ ] 합성 부모\n    - 시간: 09:30\n    - 메모: 합성 메모\n    - [ ] 합성 하위');
  assert.equal(result.declarations, 0);
  const task = M.tasks(result.next).find(task => task.id === f.taskId)!;
  assert.equal(task.date, '2026-11-12'); assert.equal(task.time, '09:30'); assert.equal(task.explicitDate, false);
  const removed = f.state.documents[0].lines.find(line => line.text.includes('- 날짜:'))!.id;
  assert.deepEqual(new Set(result.next.documents[0].lines.map(line => line.id)), new Set(f.state.documents[0].lines.filter(line => line.id !== removed).map(line => line.id)));
});

test('a missing date head and folder declaration are created once at the safe document end', () => {
  const f = fixture(), result = apply(f, { kind: 'date', date: '2026-11-13' });
  const text = M.raw(result.next.documents[0]);
  assert.equal(text.split('[2026-11-13]').length - 1, 1); assert.equal(result.declarations, 1);
  assert.ok(text.endsWith('[2026-11-13]\n- /합성 A\n  - [ ] 합성 부모\n    - 시간: 09:30\n    - 메모: 합성 메모\n    - [ ] 합성 하위'));
});

test('undated and unfiled destinations are real positions, with no duplicate tasks', () => {
  const f = fixture(), unfiled = apply(f, { kind: 'folder', folderId: 'folder-unfiled' });
  assert.equal(M.tasks(unfiled.next).find(task => task.id === f.taskId)?.scopeId, 'folder-unfiled');
  const unfiledRow=M.rowMeta(unfiled.next,f.documentId).find(row=>row.id===f.taskId)!;
  assert.ok(unfiledRow.ancestorScopeId===null||unfiledRow.ancestorScopeId==='folder-unfiled',JSON.stringify(unfiledRow));
  assert.ok(!unfiledRow.scopeMismatch);
  assert.ok(M.raw(unfiled.next.documents[0]).includes('\n- [ ] 합성 부모\n  - 날짜:'));
  const undated = apply(f, { kind: 'date', date: null });
  assert.equal(M.tasks(undated.next).find(task => task.id === f.taskId)?.date, null);
  assert.ok(M.raw(undated.next.documents[0]).includes('[미정]\n- /합성 A'));
});

test('folder move without a date head stays in the undated prelude, leaving future sections alone', () => {
  const f = fixture('- [ ] 합성 부모\n  - 메모: 합성\n[2026-11-12]\n- [ ] 합성 목적');
  const result = apply(f, { kind: 'new-folder', title: '합성 새 폴더' });
  assert.equal(M.raw(result.next.documents[0]), '- /합성 새 폴더\n  - [ ] 합성 부모\n    - 메모: 합성\n[2026-11-12]\n- [ ] 합성 목적');
  assert.equal(result.createdFolder, true); assert.equal(result.declarations, 1);
});

test('nested folder destinations reuse their exact declared ancestor', () => {
  const f = fixture('[2026-11-10]\n- /합성 A\n  - /합성 자식\n    - [ ] 합성 기존\n- [ ] 합성 부모\n  - 메모: 합성');
  const folderId = f.state.folders.find(folder => folder.title === '합성 자식')!.id;
  const result = apply(f, { kind: 'folder', folderId });
  assert.equal(result.declarations, 0);
  assert.ok(M.raw(result.next.documents[0]).endsWith('    - [ ] 합성 부모\n      - 메모: 합성'));
});

test('two equal date headers: a folder choice stays in the original exact section', () => {
  const f = fixture('[2026-11-10]\n- /합성 B\n  - [ ] 합성 앞\n[2026-11-10]\n- [ ] 합성 부모\n  - 메모: 합성');
  const folderId = f.state.folders.find(folder => folder.title === '합성 B')!.id;
  const result = apply(f, { kind: 'folder', folderId });
  assert.equal(M.raw(result.next.documents[0]), '[2026-11-10]\n- /합성 B\n  - [ ] 합성 앞\n[2026-11-10]\n- /합성 B\n  - [ ] 합성 부모\n    - 메모: 합성');
});

test('two destination date heads: a date choice reuses the later existing same-folder declaration',()=>{
  const f=fixture('[2026-11-10]\n- /합성 A\n  - [ ] 합성 부모\n[2026-11-12]\n- /합성 B\n  - [ ] 합성 첫 구획\n[2026-11-12]\n- /합성 A\n  - [ ] 합성 기존 목적');
  const beforeIds=f.state.documents[0].lines.map(line=>line.id),result=apply(f,{kind:'date',date:'2026-11-12'}),after=M.raw(result.next.documents[0]);
  assert.equal(result.declarations,0);
  assert.equal(after,'[2026-11-10]\n- /합성 A\n[2026-11-12]\n- /합성 B\n  - [ ] 합성 첫 구획\n[2026-11-12]\n- /합성 A\n  - [ ] 합성 기존 목적\n  - [ ] 합성 부모');
  assert.deepEqual(new Set(result.next.documents[0].lines.map(line=>line.id)),new Set(beforeIds));
  assert.equal(result.next.bindings.filter(binding=>binding.kind==='scope').length,f.state.bindings.filter(binding=>binding.kind==='scope').length);
});

test('invalid destination and mixed folder subtree fail without mutating source', () => {
  const f = fixture();
  for (const target of [{kind:'date',date:'2026-02-30'},{kind:'folder',folderId:'missing'},{kind:'new-folder',title:'합성 A'}] as TaskLocationTarget[]) {
    const before = JSON.stringify(f.state); assert.equal(moveTaskLocation(f.state,{...f,target}).ok,false); assert.equal(JSON.stringify(f.state),before);
  }
  const mixed = fixture('- [ ] 합성 부모\n  - 메모: 합성');
  mixed.state = M.editText(mixed.state,mixed.documentId,'- [ ] 합성 부모\n  - /합성 별도 폴더\n    - [ ] 합성 하위');
  mixed.taskId = M.tasks(mixed.state).find(task=>task.title==='합성 부모')!.id;
  assert.deepEqual(moveTaskLocation(mixed.state,{documentId:mixed.documentId,taskId:mixed.taskId,target:{kind:'date',date:'2026-11-12'}}),{ok:false,reason:'mixed-subtree'});
});

test('12 folder choices reuse same-section declarations, never creating another task or declaration', () => {
  const f = fixture(), initialIds = f.state.documents[0].lines.map(line=>line.id);
  const initialDeclarations = f.state.bindings.filter(binding=>binding.kind==='scope').length;
  for(let i=0;i<12;i++){
    const folderId=f.state.folders.find(folder=>folder.title===(i%2?'합성 A':'합성 B'))!.id;
    const result=apply(f,{kind:'folder',folderId});assert.equal(result.declarations,0);f.state=result.next;
    assert.equal(f.state.bindings.filter(binding=>binding.kind==='scope').length,initialDeclarations);
    assert.deepEqual(new Set(f.state.documents[0].lines.map(line=>line.id)),new Set(initialIds));
  }
});

test('an explicit date/time form edits only the selected time while relocating', () => {
  const f=fixture(), result=apply(f,{kind:'date',date:'2026-11-12',time:''});
  assert.equal(M.tasks(result.next).find(task=>task.id===f.taskId)?.time,null);
  assert.ok(!M.raw(result.next.documents[0]).includes('- 시간:'));
});

test('the pure move rejects a repeat marker even if a caller bypasses the sheet policy',()=>{
  const f=fixture('- [ ] 합성 부모 @매주 월'), before=JSON.stringify(f.state);
  assert.equal(moveTaskLocation(f.state,{documentId:f.documentId,taskId:f.taskId,target:{kind:'date',date:'2026-11-12'}}).ok,false);
  assert.equal(JSON.stringify(f.state),before);
});

test('a line bound to another document task is never structurally moved',()=>{
  const f=fixture();let state=M.addDocument(f.state,{title:'합성 참조 글'}), documentId=state.documents.at(-1)!.id;
  state=M.linkTask(state,documentId,0,f.taskId);assert.ok(M.validate(state));
  const lineId=state.documents.at(-1)!.lines[0].id,before=JSON.stringify(state);
  assert.equal(moveTaskLocation(state,{documentId,taskId:lineId,target:{kind:'date',date:'2026-11-12'}}).ok,false);
  assert.equal(JSON.stringify(state),before);
});
test('11/11 dateslot: a missing date head goes in the document date order (R1), newest first or oldest first; reopened the same', () => {
  const N = '[2026-11-10]\n- [ ] 오늘 일\n[2026-11-08]\n- [ ] 합성 부모\n- [ ] 지난 일 둘\n[2026-11-05]\n- [ ] 오래된 일';
  const O = '[2026-11-05]\n- [ ] 오래된 일\n[2026-11-08]\n- [ ] 합성 부모\n- [ ] 지난 일 둘\n[2026-11-10]\n- [ ] 오늘 일';
  const cases: [string, string, string, string][] = [
    // Newest first: today exists; tomorrow and next week go on top; a past day between goes before the older head; one
    // older than every head goes at the end.
    ['newest, today', N, '2026-11-10', '[2026-11-10]\n- [ ] 오늘 일\n- [ ] 합성 부모\n[2026-11-08]\n- [ ] 지난 일 둘\n[2026-11-05]\n- [ ] 오래된 일'],
    ['newest, tomorrow', N, '2026-11-11', '[2026-11-11]\n- [ ] 합성 부모\n[2026-11-10]\n- [ ] 오늘 일\n[2026-11-08]\n- [ ] 지난 일 둘\n[2026-11-05]\n- [ ] 오래된 일'],
    ['newest, next week', N, '2026-11-17', '[2026-11-17]\n- [ ] 합성 부모\n[2026-11-10]\n- [ ] 오늘 일\n[2026-11-08]\n- [ ] 지난 일 둘\n[2026-11-05]\n- [ ] 오래된 일'],
    ['newest, past between', N, '2026-11-06', '[2026-11-10]\n- [ ] 오늘 일\n[2026-11-08]\n- [ ] 지난 일 둘\n\n[2026-11-06]\n- [ ] 합성 부모\n[2026-11-05]\n- [ ] 오래된 일'],
    ['newest, past oldest', N, '2026-11-01', '[2026-11-10]\n- [ ] 오늘 일\n[2026-11-08]\n- [ ] 지난 일 둘\n[2026-11-05]\n- [ ] 오래된 일\n\n[2026-11-01]\n- [ ] 합성 부모'],
    // Oldest first: later days at the end, a past day before the next later head, one older than every head on top.
    ['oldest, today', O, '2026-11-10', '[2026-11-05]\n- [ ] 오래된 일\n[2026-11-08]\n- [ ] 지난 일 둘\n[2026-11-10]\n- [ ] 오늘 일\n- [ ] 합성 부모'],
    ['oldest, tomorrow', O, '2026-11-11', '[2026-11-05]\n- [ ] 오래된 일\n[2026-11-08]\n- [ ] 지난 일 둘\n[2026-11-10]\n- [ ] 오늘 일\n\n[2026-11-11]\n- [ ] 합성 부모'],
    ['oldest, next week', O, '2026-11-17', '[2026-11-05]\n- [ ] 오래된 일\n[2026-11-08]\n- [ ] 지난 일 둘\n[2026-11-10]\n- [ ] 오늘 일\n\n[2026-11-17]\n- [ ] 합성 부모'],
    ['oldest, past between', O, '2026-11-06', '[2026-11-05]\n- [ ] 오래된 일\n\n[2026-11-06]\n- [ ] 합성 부모\n[2026-11-08]\n- [ ] 지난 일 둘\n[2026-11-10]\n- [ ] 오늘 일'],
    ['oldest, past oldest', O, '2026-11-01', '[2026-11-01]\n- [ ] 합성 부모\n[2026-11-05]\n- [ ] 오래된 일\n[2026-11-08]\n- [ ] 지난 일 둘\n[2026-11-10]\n- [ ] 오늘 일'],
    // F10 W-ORDER-01 (11/11): one dated head is a new document, oldest first (as the bar): a later day goes under it;
    // words above the first head stay above; [미정] stays last.
    ['one head', '메모 한 줄\n[2026-11-10]\n- [ ] 합성 부모\n- [ ] 오늘 일', '2026-11-11', '메모 한 줄\n[2026-11-10]\n- [ ] 오늘 일\n\n[2026-11-11]\n- [ ] 합성 부모'],
    ['before 미정', '[2026-11-10]\n- [ ] 합성 부모\n- [ ] 오늘 일\n[미정]\n- [ ] 언젠가', '2026-11-12', '[2026-11-10]\n- [ ] 오늘 일\n\n[2026-11-12]\n- [ ] 합성 부모\n[미정]\n- [ ] 언젠가'],
    ['one head, earlier day', '[2026-11-10]\n- [ ] 합성 부모\n- [ ] 오늘 일\n[미정]\n- [ ] 언젠가', '2026-11-01', '[2026-11-01]\n- [ ] 합성 부모\n[2026-11-10]\n- [ ] 오늘 일\n[미정]\n- [ ] 언젠가'],
  ];
  for (const [label, source, date, expected] of cases) {
    const f = fixture(source), result = apply(f, { kind: 'date', date }), text = M.raw(result.next.documents[0]);
    assert.equal(text, expected, label);
    assert.equal(M.tasks(result.next).find(task => task.id === f.taskId)?.date, date, label);
    // Only the bundle and (when made) its head moved: every other line keeps its words and order.
    // Redesign 3 (mockup ③): a blank line keeps a new day apart from the lines before it.
    const others = (value: string) => value.split('\n').filter(line => line !== '- [ ] 합성 부모' && line !== `[${date}]` && line !== '');
    assert.deepEqual(others(text), others(source), label);
    // Reopened (the saved words read anew): the same text, the task on that day, every other task's day unchanged.
    let reopened = M.addDocument(createEmptyTextWorkspace(), { title: '다시 열기' });
    reopened = M.editText(reopened, reopened.documents[0].id, text, { folderText: true });
    assert.equal(M.raw(reopened.documents[0]), text, label);
    const days = (state: TextWorkspaceState) => Object.fromEntries(M.tasks(state).map(task => [task.title, task.date]));
    assert.deepEqual(days(reopened), { ...days(f.state), '합성 부모': date }, label);
  }
});
