import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import inputPlans from '../../../lib/flow/integrated-poc/text-input-plan.cjs';
import { createProgramRegionDraft, previewProgramRegionText, programRegionError } from './ProgramFolderRegionEditor';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from '../../../lib/flow/integrated-poc/text-workspace';
import { readProgramFolderRegions, planProgramRegionEdit } from '../../../lib/flow/integrated-poc/folder-document-regions';

function fixture() {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '영역 시험' });
  state = { ...state, folders: [...state.folders, { id: 'work', title: '업무', parentId: null }] };
  const id = state.documents[0].id;
  state = M.editText(state, id, '[2026-10-01]\n- 업무\n  - 메모\n  - [ ] 할 일\n외부 메모\n[2026-10-02]\n- 업무\n  - 둘째 메모');
  state = { ...state, bindings: state.documents[0].lines.flatMap(line => line.text === '- 업무' ? [{ kind: 'scope' as const, docId: id, lineId: line.id, scopeId: 'work' }] : []), taskScopes: { ...state.taskScopes }, itemScopes: { ...state.itemScopes } };
  for (const row of M.parseDocument(state.documents[0], state).rows) if (row.ancestorScopeIds?.includes('work')) {
    if (row.id in state.taskScopes) state.taskScopes[row.id] = 'work';
    if (row.id in state.itemScopes) state.itemScopes[row.id] = 'work';
  }
  assert(M.validate(state));
  return { state, id };
}
function harness() {
  const f = fixture(), view = readProgramFolderRegions(f.state, f.id, 'work')!;
  let current = f.state, readonly = false, accepted = true, saved = true, writes = 0, acceptCalls = 0;
  const snapshots: TextWorkspaceState[] = [];
  const controller = createProgramRegionDraft({ workspace: () => current, readonly: () => readonly, notify() {},
    accept: (next, before) => { acceptCalls++; assert.equal(before, current); if (!accepted) return false; current = next; snapshots.push(next); return true; },
    persist: async () => { writes++; return saved; } });
  return { ...f, view, controller, current: () => current, snapshots, writes: () => writes, accepts: () => acceptCalls,
    readonly: () => { readonly = true; }, reject: () => { accepted = false; }, failSave: () => { saved = false; }, allowSave: () => { saved = true; },
    external: () => { current = M.editText(current, f.id, M.raw(current.documents[0]).replace('외부 메모', '외부 메모 변경')); } };
}

test('local edit commits checked full document exactly once and preserves hidden text and identity', async () => {
  const h = harness(), region = h.view.regions[0];
  assert(h.controller.update(h.view, region.key, region.raw.replace('메모', '메모 수정')));
  assert(h.controller.hasPending()); assert.equal(h.writes(), 0);
  assert(await h.controller.flush()); assert.equal(h.writes(), 1); assert(!h.controller.hasPending());
  assert.match(M.raw(h.current().documents[0]), /외부 메모/); assert.match(M.raw(h.current().documents[0]), /둘째 메모/);
  assert.deepEqual(h.current().documents[0].lines.map(row => row.id), h.state.documents[0].lines.map(row => row.id));
});
test('boundary escape and deleted original lines preserve local draft, full recovery and zero writes', async () => {
  for (const raw of ['- 밖으로 나감', '']) {
    const h = harness(), region = h.view.regions[0]; h.controller.update(h.view, region.key, raw);
    assert.equal(await h.controller.flush(), false); assert.equal(h.writes(), 0); assert(h.controller.hasPending());
    assert.equal(h.controller.getState().pending?.raw, raw); assert.match(h.controller.captureRaw(), /외부 메모/); assert.match(h.controller.captureRaw(), /둘째 메모/);
    assert(h.controller.getState().error); h.controller.discard(); assert(!h.controller.hasPending());
    assert.equal(h.current(), h.state);
  }
});
test('composition prevents parsing, saving and discard until it ends', async () => {
  const h = harness(), region = h.view.regions[0]; h.controller.update(h.view, region.key, region.raw.replace('메모', '한글 메모'));
  h.controller.compose(true); assert.equal(await h.controller.flush(), false); assert.equal(h.accepts(), 0); assert.equal(h.writes(), 0);
  h.controller.discard(); assert(h.controller.hasPending()); assert.match(h.controller.getState().error, /한글 입력/);
  h.controller.compose(false); assert(await h.controller.flush()); assert.equal(h.writes(), 1);
});
test('external workspace change and rejected parent authority retain exact input without writer calls', async () => {
  for (const mode of ['external', 'parent']) {
    const h = harness(), region = h.view.regions[0], input = region.raw.replace('메모', '보관할 메모');
    h.controller.update(h.view, region.key, input); if (mode === 'external') h.external(); else h.reject();
    assert.equal(await h.controller.flush(), false); assert.equal(h.controller.getState().pending?.raw, input);
    assert.match(h.controller.getState().error, /다른 곳에서/); assert.equal(h.writes(), 0);
  }
});
test('failed persistence delegates full draft recovery to shared controller and retries without replaying fragment', async () => {
  const h = harness(), region = h.view.regions[0]; h.controller.update(h.view, region.key, region.raw.replace('메모', '저장할 메모')); h.failSave();
  assert.equal(await h.controller.flush(), false); assert(!h.controller.hasPending()); assert.equal(h.accepts(), 1);
  assert.match(M.raw(h.current().documents[0]), /저장할 메모/); h.allowSave(); assert(await h.controller.flush()); assert.equal(h.accepts(), 1); assert.equal(h.writes(), 2);
});
test('read-only transition preserves pending input and blocks acceptance, and other regions cannot race it', async () => {
  const h = harness(), region = h.view.regions[0]; h.controller.update(h.view, region.key, region.raw.replace('메모', '입력 메모'));
  assert.equal(h.controller.update(h.view, h.view.regions[1].key, '  - 다른 입력'), false);
  h.readonly(); assert.equal(await h.controller.flush(), false); assert.equal(h.accepts(), 0); assert(h.controller.hasPending());
});
test('partial title propagation and ambiguous multi-field diagnostics explain recovery', () => {
  assert.match(programRegionError('linked-document-change'), /다른 문서/);
  assert.match(programRegionError('existing-line-removed'), /한 줄씩/);
  assert.match(programRegionError('row-context-change'), /입력을 받은 뒤 전체 문서/);
});

test('pending native Enter can keep blank source bytes without creating an Item or changing hidden lines', async () => {
  const h = harness(), region = h.view.regions[0], raw = region.raw + '\n';
  assert(h.controller.update(h.view, region.key, raw));
  assert(await h.controller.flush()); assert.equal(h.writes(), 1);
  assert.equal(M.tasks(h.current()).length, M.tasks(h.state).length);
  const originalIds = new Set(h.state.documents[0].lines.map(line => line.id));
  assert.deepEqual(h.current().documents[0].lines.filter(line => originalIds.has(line.id)), h.state.documents[0].lines);
});

test('native Enter followed by autosave and memo typing accepts both full drafts with one stable blank ID', async () => {
  const h = harness(), region = h.view.regions[0];
  assert(h.controller.update(h.view, region.key, region.raw + '\n  '));
  assert(await h.controller.flush()); assert.equal(h.writes(), 1);
  const saved = h.current(), view = readProgramFolderRegions(saved, h.id, 'work')!, current = view.regions[0];
  const blankId = saved.documents[0].lines[current.endIndex - 1].id;
  const raw = current.raw + '둘째 문장';
  const preview = previewProgramRegionText(view, current.key, raw)!;
  assert.equal(preview.lineId(preview.rows.length - 1), blankId);
  assert(h.controller.update(view, current.key, raw));
  assert(await h.controller.flush()); assert.equal(h.writes(), 2); assert.equal(h.accepts(), 2);
  assert.equal(h.controller.getState().error, ''); assert(!h.controller.hasPending());
  assert.equal(h.current().documents[0].lines[current.endIndex - 1].id, blankId);
  assert.equal(M.tasks(h.current()).length, M.tasks(h.state).length);
  assert.deepEqual(h.current().progressRecords, h.state.progressRecords);
  assert.match(M.raw(h.current().documents[0]), /외부 메모/); assert.match(M.raw(h.current().documents[0]), /둘째 메모/);
});

test('native Enter preflight accepts materialized saved prose plus one new blank, then typing can save both', async () => {
  const h = harness(), region = h.view.regions[0];
  h.controller.update(h.view, region.key, region.raw + '\n  '); assert(await h.controller.flush());
  const view = readProgramFolderRegions(h.current(), h.id, 'work')!, current = view.regions[0], blankId = h.current().documents[0].lines[current.endIndex - 1].id;
  const raw = current.raw + '둘째 문장', events = new Map<string, (event?: any) => void>(), commands: string[] = [], writes: string[] = [];
  const area: any = { value: raw, selectionStart: raw.length, selectionEnd: raw.length, selectionDirection: 'none', scrollTop: 0, scrollLeft: 0, readOnly: false,
    focus() {}, style: { setProperty() {} }, setSelectionRange(start: number, end: number, direction = 'none') { this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction; } };
  const source = readFileSync(new URL('../../../lib/flow/integrated-poc/vendor/text-editor.cjs', import.meta.url), 'utf8');
  const section = (start: string, end: string) => { const a = source.indexOf(start), b = source.indexOf(end, a); assert(a >= 0 && b > a); return source.slice(a, b); };
  const context: any = vm.createContext({ textarea: area, composing: false, destroyed: false, nativeDepth: 0, pendingChange: false, nextTabLeaves: false,
    selection: { start: raw.length, end: raw.length, direction: 'none' }, lastReported: raw, foldedIds: new Set(), moveState: null, gesture: null,
    config: { canApplyInput: (nextRaw: string, intent: { kind: string }) => { assert.equal(intent.kind, 'enter'); return planProgramRegionEdit(h.current(), view, current.key, nextRaw).ok; },
      onInputRejected() { assert.fail('ordinary note Enter must remain within the proven region'); }, onChange: (value: string) => writes.push(value) },
    inputPlans, root: { classList: { add() {}, remove() {} } }, doc: { execCommand(command: string, _ui: unknown, text: string) {
      commands.push(command); area.value = area.value.slice(0, area.selectionStart) + text + area.value.slice(area.selectionEnd);
      const caret = area.selectionStart + text.length; area.setSelectionRange(caret, caret); events.get('input')?.({ inputType: 'insertText' }); return true;
    } }, viewport: {}, compositionAnchor: 0,
    getRowMeta: () => previewProgramRegionText(view, current.key, area.value)?.rows ?? [], cancelMove() {}, unfoldAll() {}, render() {}, scheduleRender() {}, syncGeometry() {}, captureBlurReveal() {}, maybeRequestPicker() {},
    indentation: (line: string) => { const prefix = /^[ \t]*/.exec(line)![0]; return { prefix, columns: prefix.replace(/\t/g, '  ').length }; },
    dateLabel: () => false, matchTask: () => null, EMPTY_TASK: /^(\s*)-\s+\[([ xX]|\d+(?:\.\d+)?%?)\]\s*$/, TASK: /^(\s*)-\s+\[([ xX]|\d+(?:\.\d+)?%?)\](\s+)(.*)$/, MAX_DEPTH: 32,
    listen: (_target: unknown, name: string, handler: (event?: any) => void) => events.set(name, handler),
  });
  vm.runInContext(section('  function protectedFenceLines(lines) {', '  function create(container, options) {')
    + section('    function remember() {', '    function scheduleRender() {')
    + section('    function rejectInput(intent) {', "    listen(doc, 'selectionchange',"), context);
  const event: any = { key: 'Enter', shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, isComposing: false, keyCode: 0, defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; } };
  events.get('keydown')!(event);
  assert(event.defaultPrevented); assert.equal(area.value, raw + '\n  '); assert.deepEqual(commands, ['insertText']); assert.deepEqual(writes, [area.value]);
  h.controller.update(view, current.key, area.value + '셋째 문장'); assert(await h.controller.flush());
  assert.equal(h.writes(), 2); assert.equal(h.current().documents[0].lines[current.endIndex - 1].id, blankId);
  assert.equal(h.controller.getState().error, ''); assert.equal(M.tasks(h.current()).length, M.tasks(h.state).length);
});

test('native metadata preview resolves existing IDs after inserted lines and leaves new identities unset', () => {
  const h = harness(), region = h.view.regions[0], taskLine = h.state.documents[0].lines.find(line => line.text.includes('[ ]'))!;
  const raw = region.raw.replace('  - [ ]', '  - 새 메모\n  - [ ]');
  const preview = previewProgramRegionText(h.view, region.key, raw)!;
  assert.equal(preview.rows[2].id, taskLine.id); assert.equal(preview.lineId(2), taskLine.id);
  assert.equal(preview.lineId(1), null);
  assert.equal(preview.offset, h.view.fullRaw.indexOf(region.raw));
  assert.match(preview.fullRaw, /외부 메모/); assert.match(preview.fullRaw, /둘째 메모/);
  assert.equal(h.writes(), 0); assert.equal(h.accepts(), 0);
});

test('invalid native metadata preview preserves exact full input and reports no guessed source identity', () => {
  const h = harness(), region = h.view.regions[0], raw = region.raw.replace('[ ]', '[101%]');
  const preview = previewProgramRegionText(h.view, region.key, raw)!;
  assert.equal(preview.rows.length, 0); assert.equal(preview.lineId(1), null);
  assert(preview.fullRaw.includes(raw)); assert.match(preview.fullRaw, /외부 메모/);
  assert.equal(h.writes(), 0);
});

test('preview refuses a fabricated capability and never writes or accepts the local input', () => {
  const h = harness(), region = h.view.regions[0];
  assert.equal(previewProgramRegionText({ ...h.view }, region.key, region.raw), null);
  assert.equal(h.writes(), 0); assert.equal(h.accepts(), 0);
});
