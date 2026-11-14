import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
const start = source.indexOf('  function freshNoticeHolds() {'), end = source.indexOf('  function syncFreshNotice()', start);
assert(start > 0 && end > start);
const actual = new vm.Script(`(() => {${source.slice(start, end)} return freshNoticeHolds();})()`);
function scene() {
  const calls = { layout: 0, fresh: 0, rows: 0 };
  const area = { value: 'folder\nfirst\nlast\nnext', selectionStart: 8 };
  const ctx: any = { propsRef: { current: { docId: 'doc', active: true } }, textArea: () => area,
    draftRef: { current: { folderOperation: () => ({ id: 'op', lineId: 'folder' }),
      freshFolderLine: () => { calls.fresh++; return true; }, getState: () => ({ working: {} }) } },
    folderNoticeRef: { current: { operationId: 'op' } },
    hostRef: { current: { getClientRects: () => { calls.layout++; return [{}]; } } },
    textEditorRows: () => { calls.rows++; return [{ id: 'folder', subtreeEndIndex: 3 }, { id: 'first' }, { id: 'last' }, { id: 'next' }]; } };
  return { ctx, area, calls, run: () => actual.runInNewContext(ctx) };
}
test('ordinary typing with no fresh folder operation never forces host layout', () => {
  const s = scene(); s.ctx.draftRef.current.folderOperation = () => null;
  assert.equal(s.run(), false); assert.deepEqual(s.calls, { layout: 0, fresh: 0, rows: 0 });
});
test('missing controller, missing area, another notice and inactive/folder view do not measure layout', () => {
  for (const change of [(s: ReturnType<typeof scene>) => { s.ctx.draftRef.current = null; },
    (s: ReturnType<typeof scene>) => { s.ctx.textArea = () => null; },
    (s: ReturnType<typeof scene>) => { s.ctx.folderNoticeRef.current.operationId = 'older'; },
    (s: ReturnType<typeof scene>) => { s.ctx.propsRef.current.active = false; },
    (s: ReturnType<typeof scene>) => { s.ctx.propsRef.current.folderId = 'folder'; }]) {
    const s = scene(); change(s); assert.equal(s.run(), false); assert.equal(s.calls.layout, 0);
  }
});
test('a real matching notice measures the visible host and retains the same subtree boundaries', () => {
  const s = scene(); assert.equal(s.run(), true); assert.deepEqual(s.calls, { layout: 1, fresh: 1, rows: 1 });
  s.area.selectionStart = s.area.value.length; assert.equal(s.run(), false);
});
test('a hidden or missing host still ends the hold before checking the fresh folder line', () => {
  for (const missing of [false, true]) { const s = scene();
    if (missing) s.ctx.hostRef.current = null; else s.ctx.hostRef.current.getClientRects = () => { s.calls.layout++; return []; };
    assert.equal(s.run(), false); assert.equal(s.calls.fresh, 0); assert.equal(s.calls.rows, 0);
  }
});
test('a no-longer-fresh folder operation ends the notice and never reads task rows', () => {
  const s = scene(); s.ctx.draftRef.current.freshFolderLine = () => { s.calls.fresh++; return false; };
  assert.equal(s.run(), false); assert.deepEqual(s.calls, { layout: 1, fresh: 1, rows: 0 });
});
