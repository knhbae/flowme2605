import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import plans from './text-input-plan.cjs';
import { createEmptyTextWorkspace, textEditorRows, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { readProgramFolderRegions as readRegions, planProgramRegionEdit as editRegion } from './folder-document-regions';
import { createProgramController } from './controller';
import { createProgramData } from './program-data';
import { PROGRAM_STATE_KEY, programResult } from './contract';

const vendor = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8');
function section(start: string, end: string) {
  const a = vendor.indexOf(start), b = vendor.indexOf(end, a);
  assert(a >= 0 && b > a, `Current native editor section missing: ${start}`);
  return vendor.slice(a, b);
}
function seed(raw: string) {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '작성 회귀' });
  const id = state.documents[0].id;
  state = M.editText(state, id, raw);
  assert.equal(M.raw(M.getDocument(state, id)), raw);
  assert(M.validate(state));
  return { state, id };
}
const lineEnd = (raw: string, index: number) => raw.split('\n').slice(0, index + 1).join('\n').length;

// Run the shipped keyboard/input callbacks against simulated native insertText.
// This checks dispatch + current parser contracts, not browser Undo or OS IME.
function nativeFixture(raw: string, initial?: TextWorkspaceState, documentId?: string) {
  const f = initial && documentId ? { state: initial, id: documentId } : seed(raw);
  const callbacks = new Map<string, (event?: Record<string, unknown>) => void>();
  const published: string[] = [], commands: string[] = [];
  const textarea = {
    value: raw, selectionStart: 0, selectionEnd: 0, selectionDirection: 'none', scrollTop: 0, scrollLeft: 0, readOnly: false,
    focus() {}, setSelectionRange(start: number, end: number, direction = 'none') {
      this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction;
    },
  };
  function nativeInsert(text: string, inputType = 'insertText') {
    const start = textarea.selectionStart;
    textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(textarea.selectionEnd);
    textarea.setSelectionRange(start + text.length, start + text.length);
    callbacks.get('input')!({ inputType, isComposing: false });
  }
  const context = vm.createContext({
    textarea, inputPlans: plans, destroyed: false, composing: false, nativeDepth: 0, pendingChange: false,
    selection: { start: 0, end: 0, direction: 'none' }, lastReported: raw, nextTabLeaves: false,
    foldedIds: new Set(), moveState: null, gesture: null, compositionAnchor: 0, viewport: {},
    root: { classList: { add() {}, remove() {} } },
    config: { getRowMeta: () => textEditorRows(M.editTextResult(f.state, f.id, textarea.value).state, f.id),
      canApplyInput: () => true, onChange: (value: string) => published.push(value) },
    doc: { execCommand(kind: string, _ui: boolean, text: string) {
      assert.equal(kind, 'insertText'); commands.push(text); nativeInsert(text); return true;
    } },
    unfoldAll() {}, cancelMove() {}, render() {}, maybeRequestPicker() {}, scheduleRender() {},
    captureEndCaretReveal() {}, captureBlurReveal() {}, syncGeometry() {},
    listen: (_target: unknown, name: string, callback: (event?: Record<string, unknown>) => void) => callbacks.set(name, callback),
  });
  vm.runInContext(section('  const DATE =', '  function create(container, options) {') +
    section('    function remember() {', '    function scheduleRender() {') +
    section('    function getRowMeta() {', '    function icon(kind) {') +
    section('    function rejectInput(intent) {', "    listen(textarea, 'input',") +
    section("    listen(textarea, 'input',", "    listen(doc, 'selectionchange',"), context);
  function press(key: string, options: { shiftKey?: boolean; isComposing?: boolean } = {}) {
    let prevented = false;
    const event = { key, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, defaultPrevented: false,
      ...options, preventDefault: () => { prevented = true; } };
    callbacks.get('keydown')!(event);
    if (!prevented && key === 'Enter' && !options.isComposing) nativeInsert('\n', 'insertLineBreak');
    return prevented;
  }
  function preview() {
    const result = M.editTextResult(f.state, f.id, textarea.value);
    assert.equal(result.reason, null, textarea.value);
    return result.state;
  }
  return { ...f, textarea, context, callbacks, published, commands, nativeInsert, press, preview,
    caret: (start: number, end = start, direction = 'none') => textarea.setSelectionRange(start, end, direction) };
}

test('#15 title-end Enter puts a sibling after a numeric Item, its properties and nested children', () => {
  const raw = '[2026-10-01]\n- [20%] 부모\n  - 메모: 부모 메모\n  - 시간: 09:00\n  - [ ] 자식\n    - 메모: 자식 메모\n    - [ ] 손자\n- [ ] 뒤 형제';
  const f = nativeFixture(raw), beforeItems = M.parseDocument(M.getDocument(f.state, f.id)!, f.state).items;
  f.caret(lineEnd(raw, 1)); assert(f.press('Enter')); f.nativeInsert('새 형제');
  assert.equal(f.textarea.value, raw.replace('\n- [ ] 뒤 형제', '\n- [ ] 새 형제\n- [ ] 뒤 형제'));
  const next = f.preview(), items = M.parseDocument(M.getDocument(next, f.id)!, next).items;
  for (const item of beforeItems) {
    const { sourceIndex: beforeIndex, ...beforeIdentity } = item;
    const { sourceIndex: afterIndex, ...afterIdentity } = items.find(entry => entry.id === item.id)!;
    assert.deepEqual(afterIdentity, beforeIdentity);
    assert.equal(afterIndex, beforeIndex + (item.title === '뒤 형제' ? 1 : 0));
  }
  assert.equal(items.find(entry => entry.title === '새 형제')!.parentItemId, null);
  assert.deepEqual(next.documents[0].lines.filter(line => f.state.documents[0].lines.some(old => old.id === line.id)), f.state.documents[0].lines);
});

test('#15 empty-check Enter removes only its scaffold and does not turn a memo into an Item', () => {
  const raw = '- [ ] 부모\n  - [ ] \n- 일반 메모\n- [ ] 뒤 할 일', f = nativeFixture(raw);
  const ids = M.tasks(f.state).map(task => task.id);
  f.caret(lineEnd(raw, 1)); assert(f.press('Enter'));
  assert.equal(f.textarea.value, '- [ ] 부모\n\n- 일반 메모\n- [ ] 뒤 할 일');
  const next = f.preview(); assert.deepEqual(M.tasks(next).map(task => task.id), ids);
  assert.equal(M.rowMeta(next, f.id).find(row => row.text === '- 일반 메모')!.kind, 'note');
});

test('#15 title-middle Enter keeps the split input while the parser refuses ambiguous saved identity', () => {
  const raw = '- [ ] 첫째둘째\n- [ ] 뒤 할 일', f = nativeFixture(raw), nextId = M.tasks(f.state)[1].id;
  f.caret(raw.indexOf('둘째')); assert(f.press('Enter'));
  assert.equal(f.textarea.value, '- [ ] 첫째\n- [ ] 둘째\n- [ ] 뒤 할 일');
  const before = JSON.stringify(f.state), result = M.editTextResult(f.state, f.id, f.textarea.value);
  assert.equal(result.reason, 'identity-ambiguous');
  assert.equal(result.state, f.state);
  assert.equal(JSON.stringify(f.state), before);
  assert.equal(M.tasks(result.state).find(task => task.title === '뒤 할 일')!.id, nextId);
  assert.deepEqual(f.published, [f.textarea.value], 'rejected input remains available to the draft owner');
});

test('#15 selection and ShiftEnter keep literal newline behavior instead of adding another checkbox', () => {
  const raw = '- [ ] 첫째둘째\n- [ ] 뒤 할 일';
  for (const variant of ['selection', 'shift'] as const) {
    const f = nativeFixture(raw), start = raw.indexOf('둘째');
    f.caret(start, variant === 'selection' ? start + 2 : start);
    assert.equal(f.press('Enter', { shiftKey: variant === 'shift' }), false);
    assert.equal(f.textarea.value, variant === 'selection' ? '- [ ] 첫째\n\n- [ ] 뒤 할 일' : '- [ ] 첫째\n둘째\n- [ ] 뒤 할 일');
    assert.equal(f.commands.length, 0, 'no synthetic checkbox transaction for literal Enter');
  }
});

test('#16 Enter and ShiftEnter continue the selected parent or child memo on its same Item', () => {
  const raw = '[2026-10-01]\n- [ ] 부모\n  - 메모: 부모 설명\n  - 시간: 09:00\n  - [ ] 자식\n    - 메모: 자식 설명\n- [ ] 다른 할 일';
  for (const [index, shiftKey, title] of [[2, false, '부모'], [5, true, '자식']] as const) {
    const f = nativeFixture(raw), original = M.parseDocument(M.getDocument(f.state, f.id)!, f.state).items;
    f.caret(lineEnd(raw, index)); assert(f.press('Enter', { shiftKey })); f.nativeInsert('추가 설명');
    const next = f.preview(), items = M.parseDocument(M.getDocument(next, f.id)!, next).items;
    assert.equal(items.length, original.length);
    for (const item of original) {
      const updated = items.find(entry => entry.id === item.id)!;
      assert.equal(updated.note, item.title === title ? item.note + '\n추가 설명' : item.note);
      for (const key of ['date', 'time', 'parentItemId', 'scopeId'] as const) assert.equal(updated[key], item[key]);
    }
    assert.deepEqual(next.progressRecords, f.state.progressRecords);
  }
});

test('#15/#16 memo continuation followed by title-end Enter leaves both memo lines on the original Item', () => {
  const raw = '- [ ] 원래 할 일\n  - 메모: 첫째\n  - 시간: 10:00\n- [ ] 뒤 할 일', f = nativeFixture(raw);
  f.caret(lineEnd(raw, 1)); f.press('Enter'); f.nativeInsert('둘째');
  f.caret(lineEnd(f.textarea.value, 0)); f.press('Enter'); f.nativeInsert('새 형제');
  const items = M.tasks(f.preview());
  assert.deepEqual(items.map(task => task.title), ['원래 할 일', '새 형제', '뒤 할 일']);
  assert.equal(items[0].note, '첫째\n둘째'); assert.equal(items[0].time, '10:00');
  assert.equal(items[1].note, ''); assert.equal(items[1].time, null);
  assert.equal(items[0].id, M.tasks(f.state)[0].id); assert.equal(items[2].id, M.tasks(f.state)[1].id);
});

test('#6 immediate ShiftTab/Tab uses the original subtree and restores exact source and caret', () => {
  const raw = '- 부모 목록\n  - 선택 목록\n    - 메모 줄\n    - [ ] 자식\n  - 뒤 형제\n- 외부', f = nativeFixture(raw);
  const caret = raw.indexOf('선택') + 1; f.caret(caret);
  assert(f.press('Tab', { shiftKey: true })); assert(f.press('Tab'));
  assert.equal(f.textarea.value, raw); assert.equal(f.textarea.selectionStart, caret);
  assert.deepEqual(f.preview(), f.state);
});

test('#6 inverse lease expires after typing, selection or simulated composition rather than swallowing new intent', () => {
  const raw = '- 부모\n  - 선택\n  - 뒤 형제';
  for (const kind of ['input', 'selection', 'composition'] as const) {
    const f = nativeFixture(raw); f.caret(raw.indexOf('선택')); f.press('Tab', { shiftKey: true });
    const selected = f.textarea.selectionStart, outdented = f.textarea.value;
    if (kind === 'input') { f.nativeInsert('x'); f.caret(selected, selected + 1); f.nativeInsert(''); }
    if (kind === 'selection') { f.caret(selected + 1); f.callbacks.get('select')!(); vm.runInContext('remember()', f.context); f.caret(selected); }
    if (kind === 'composition') { f.callbacks.get('compositionstart')!(); assert.equal(f.press('Enter', { isComposing: true }), false); f.callbacks.get('compositionend')!(); }
    assert.equal(f.textarea.value, outdented);
    assert.equal(vm.runInContext('indentLease', f.context), null);
    f.caret(selected); assert(f.press('Tab'));
    assert.notEqual(f.textarea.value, raw, `${kind}: expired lease must recompute the current outline`);
  }
});

function regionFixture() {
  const raw = '숨은 앞  \n[2026-10-01]\n- 업무\n  - [ ] 같은 제목\n    - 메모: 첫 날짜 메모\n    - 시간: 09:00\n- 숨은 중간  \n[2026-10-02]\n- 업무\n  - [ ] 같은 제목\n    - 메모: 둘째 날짜 메모\n숨은 끝  ';
  const f = seed('숨은 앞  \n[2026-10-01]\n- 업무\n- 숨은 중간  \n[2026-10-02]\n- 업무\n숨은 끝  ');
  f.state = { ...f.state, folders: [...f.state.folders, { id: 'work', title: '업무', parentId: null }] };
  for (const index of [2, 5]) f.state = M.attachScope(f.state, f.id, index, 'work');
  const result = M.editTextResult(f.state, f.id, raw);
  assert.equal(result.reason, null); f.state = result.state;
  for (const task of M.tasks(f.state)) f.state = M.recordProgress(f.state, task.id, '2026-09-30', 20);
  assert(M.validate(f.state)); assert.equal(readRegions(f.state, f.id, 'work')!.regions.length, 2);
  return f;
}

test('#13/#21 serial edits in disjoint folder regions keep same-title Items distinct, preserve hidden bytes and Undo exactly', async () => {
  const f = regionFixture(), data = createProgramData(), actorId = data.activeActorId;
  data.spaces[actorId].text = f.state;
  const storage = new Map<string, string>([['flow:operating', '{"keep":" exact  bytes "}']]), writes: string[] = [];
  const controller = createProgramController({ initialData: data, exclusive: async work => work(), storage: {
    getItem: key => storage.get(key) ?? null, setItem: (key, value) => { writes.push(key); storage.set(key, value); }, removeItem: key => storage.delete(key),
  } });
  assert(controller.ok);
  const original = M.tasks(f.state), originalLines = f.state.documents[0].lines;
  const stale = readRegions(f.state, f.id, 'work')!;
  for (const [index, before, after] of [[0, '첫 날짜 메모', '첫 날짜만 수정'], [1, '둘째 날짜 메모', '둘째 날짜만 수정']] as const) {
    const result = await controller.mutate('메모 편집', current => {
      const workspace = current.spaces[actorId].text, view = readRegions(workspace, f.id, 'work')!, region = view.regions[index];
      const edited = editRegion(workspace, view, region.key, region.raw.replace(before, after));
      assert(edited.ok, JSON.stringify(edited));
      return programResult(current, { ...current, spaces: { ...current.spaces, [actorId]: { ...current.spaces[actorId], text: edited.next } } }, f.id);
    }, { actorId });
    assert(result.ok, JSON.stringify(result));
  }
  const next = controller.snapshot().envelope.data.spaces[actorId].text, tasks = M.tasks(next);
  assert.deepEqual(tasks.map(task => [task.id, task.title, task.date]), original.map(task => [task.id, task.title, task.date]));
  assert.deepEqual(tasks.map(task => task.note), ['첫 날짜만 수정', '둘째 날짜만 수정']);
  assert.deepEqual(next.documents[0].lines.filter(line => !line.text.includes('- 메모:')), originalLines.filter(line => !line.text.includes('- 메모:')));
  assert.deepEqual(next.progressRecords, f.state.progressRecords); assert.deepEqual(next.bindings, f.state.bindings);
  assert.deepEqual(editRegion(next, stale, stale.regions[0].key, stale.regions[0].raw + '\n  - 새 메모'), { ok: false, reason: 'stale-workspace' });
  assert((await controller.undo(actorId)).ok); assert((await controller.undo(actorId)).ok);
  assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId].text, f.state);
  assert.deepEqual(writes, [PROGRAM_STATE_KEY, PROGRAM_STATE_KEY, PROGRAM_STATE_KEY, PROGRAM_STATE_KEY]);
  assert.equal(storage.get('flow:operating'), '{"keep":" exact  bytes "}');
});

test('#13/#21 fragment structure and memo-owner escape remain rejected with original source and history intact', () => {
  const f = regionFixture(), view = readRegions(f.state, f.id, 'work')!, region = view.regions[0], before = JSON.stringify(f.state);
  for (const replacement of [region.raw.replace('  - [ ] 같은 제목', '    - [ ] 같은 제목'),
    region.raw.replace('    - 메모:', '  - 메모:'), region.raw + '\n- 폴더 밖 새 줄',
    region.raw.replace('    - 메모: 첫 날짜 메모', '    새 들여쓴 메모'), region.raw.replace('09:00', '09:00\n[2026-10-05]')]) {
    assert.equal(editRegion(f.state, view, region.key, replacement).ok, false, replacement);
    assert.equal(JSON.stringify(f.state), before);
  }
});
