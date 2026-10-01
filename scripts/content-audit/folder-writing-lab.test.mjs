import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const M = createRequire(import.meta.url)('./folder-writing-lab-model.cjs');
const normalize = value => JSON.parse(JSON.stringify(value));
const source = readFileSync(new URL('../../docs/content-audit/2026-10-01-flowme-folder-writing-lab-ko.html', import.meta.url), 'utf8');
const ids = items => Array.from(items, item => item.row.id);
const link = folderId => ({ type: 'link', docId: 'doc-weekend', id: 'w2', folderId });
const edit = (id, text) => ({ type: 'edit', docId: 'doc-weekend', id, text });

test('standalone inline model and CJS expose one identical source and v1 contract', () => {
  assert.equal(M.KEY, 'flow:poc:personal-workspace:v1:folder-writing-lab');
  assert.equal(M.PROTOTYPE_VERSION, 1);
  const sandbox = {};
  vm.runInNewContext(source.match(/<script data-folder-writing-model>([\s\S]*?)<\/script>/)[1], sandbox);
  assert.deepEqual(normalize(sandbox.FolderWritingModel.seed()), normalize(M.seed()));
  assert.equal(JSON.parse(M.encode(M.seed(), [])).version, 1);
});
test('synthetic seed has distinct source identities and preserves ordinary memo', () => {
  const data = M.seed();
  assert.equal(M.valid(data), true);
  assert.equal(new Set(data.documents.flatMap(d => d.rows.map(r => r.id))).size, 26);
  assert.equal(data.documents[0].rows[0].kind, 'memo');
  assert.equal(data.documents[0].storageFolderId, 'home');
});
test('exact-name suggestion differentiates full paths and performs no mutation', () => {
  const data = M.seed(), before = JSON.stringify(data);
  assert.deepEqual(normalize(M.suggestions(data, 'doc-weekend', 'w2', '여행')), [{ id: 'travel', path: '개인 / 여행' }, { id: 'work-travel', path: '회사 / 여행' }]);
  assert.equal(M.suggestions(data, 'doc-weekend', 'w2', '여행 ').length, 0);
  assert.equal(M.suggestions(data, 'doc-weekend', 'w2', '여').length, 0);
  assert.equal(M.suggestions(data, 'doc-weekend', 'w2', '미일치').length, 0);
  assert.equal(JSON.stringify(data), before);
});
test('memo and child-bearing list are not converted through suggestions', () => {
  const data = M.seed();
  assert.equal(M.suggestions(data, 'doc-weekend', 'w1', '여행').length, 0);
  assert.equal(M.suggestions(data, 'doc-weekend', 'w19', '준비').length, 0);
  assert.throws(() => M.change(data, [{ ...link('packing'), id: 'w19' }]));
});
test('explicit link keeps same row and count, duplicate confirmation is a no-op', () => {
  const data = M.seed(), next = M.change(data, [link('travel')]);
  assert.equal(next.documents[0].rows.length, data.documents[0].rows.length);
  assert.equal(next.documents[0].rows[1].id, 'w2');
  assert.equal(next.documents[0].rows[1].folderId, 'travel');
  assert.equal(next.revision, 1);
  assert.deepEqual(normalize(M.change(next, [link('travel')])), normalize(next));
  assert.equal(data.documents[0].rows[1].kind, 'list');
});
test('draft text plus explicit link is one revision and one operation batch', () => {
  const next = M.change(M.seed(), [edit('w2', '준비'), link('packing')]);
  assert.equal(next.revision, 1);
  assert.equal(next.documents[0].rows[1].folderId, 'packing');
  assert.equal(next.documents[0].rows[1].text, '준비');
});
test('document, discontinuous folder regions and all-document tasks differ', () => {
  const data = M.seed();
  assert.equal(M.visible(data, 'doc-weekend', 'document', 'travel').length, 20);
  assert.deepEqual(ids(M.visible(data, 'doc-weekend', 'region', 'travel')), ['w4', 'w5', 'w6', 'w7', 'w8', 'w16', 'w17', 'w18']);
  assert.deepEqual(ids(M.visible(data, 'doc-weekend', 'tasks', 'travel')), ['w6', 'w8', 'w17', 'n5']);
});
test('single subtree region and nested same-name folders remain distinct', () => {
  const data = M.seed();
  assert.deepEqual(ids(M.visible(data, 'doc-weekend', 'region', 'packing')), ['w7', 'w8']);
  assert.deepEqual(ids(M.visible(data, 'doc-weekend', 'region', 'work-packing')), ['w13', 'w14']);
  assert.deepEqual(ids(M.visible(data, 'doc-weekend', 'tasks', 'work-travel')), ['w12', 'w14']);
});
test('other-document-only match is empty here but visible in folder tasks', () => {
  const data = M.seed();
  assert.deepEqual(ids(M.visible(data, 'doc-weekend', 'region', 'home')), []);
  assert.deepEqual(ids(M.visible(data, 'doc-weekend', 'tasks', 'home')), ['n3']);
});
test('out-of-folder lines stay outside and prior hidden dates are inherited', () => {
  const data = M.seed(), doc = data.documents[0];
  assert.equal(M.context(doc, doc.rows.find(r => r.id === 'w9')).folderId, null);
  const region = M.visible(data, doc.id, 'region', 'travel');
  assert.equal(region.find(i => i.row.id === 'w6').date, '2026-10-01');
  assert.equal(region.find(i => i.row.id === 'w17').date, '2026-10-03');
  assert.equal(region.find(i => i.row.id === 'w5').date, null);
});
test('scoped edit preserves hidden rows, dates, completion history and second document', () => {
  const data = M.seed(), next = M.change(data, [edit('w8', '충전기와 케이블 가방에 넣기')]);
  for (const r of data.documents[0].rows) if (r.id !== 'w8') assert.deepEqual(normalize(next.documents[0].rows.find(x => x.id === r.id)), normalize(r));
  assert.deepEqual(normalize(next.documents[1]), normalize(data.documents[1]));
  assert.equal(next.documents[0].rows[7].id, 'w8');
  assert.equal(next.documents[0].raw.includes('충전기와 케이블'), true);
});
test('undo snapshot survives reload with full document, memos and history', () => {
  const data = M.seed(), next = M.change(data, [edit('w8', '충전기 변경')]);
  const loaded = M.decode(M.encode(next, [data]));
  assert.deepEqual(normalize(loaded.data), normalize(next));
  assert.deepEqual(normalize(loaded.undo[0]), normalize(data));
  assert.equal(loaded.undo[0].documents[0].rows[16].history.length, 1);
});
test('revision conflict and structural multiline changes fail without source mutation', () => {
  const data = M.seed(), before = JSON.stringify(data);
  assert.throws(() => M.change(data, [edit('w8', '변경')], 8));
  assert.throws(() => M.change(data, [edit('w8', '첫 줄\n둘째 줄')]));
  assert.throws(() => M.change(data, [edit('w8', '변경'), link('home')]));
  assert.equal(JSON.stringify(data), before);
});
test('malformed payloads, raw mismatch, missing row, cycles and unsupported version reject', () => {
  const wire = JSON.parse(M.encode(M.seed(), []));
  for (const damage of [v => { v.version = 2; }, v => { v.data.documents[0].raw += '변경'; }, v => { v.data.documents[0].rows.pop(); }, v => { v.data.documents[0].rows[0].parent = 'w2'; }, v => { v.undo = [{}]; }]) {
    const bad = structuredClone(wire); damage(bad); assert.throws(() => M.decode(JSON.stringify(bad)));
  }
  assert.throws(() => M.decode('{bad'));
});
test('completion changes same task and preserves inherited date', () => {
  const next = M.change(M.seed(), [{ type: 'complete', docId: 'doc-weekend', id: 'w8' }]);
  const r = next.documents[0].rows[7];
  assert.equal(r.done, true);
  assert.equal(r.history.length, 1);
  assert.equal(M.context(next.documents[0], r).date, '2026-10-01');
});
test('all view and suggestion paths leave encoded source byte-identical', () => {
  const data = M.seed(), before = M.encode(data, []);
  for (const f of M.FOLDERS) for (const d of data.documents) for (const view of ['document', 'region', 'tasks']) M.visible(data, d.id, view, f.id);
  M.suggestions(data, 'doc-weekend', 'w2', '여행');
  assert.equal(M.encode(data, []), before);
});
test('HTML storage surface is exact-key only and prohibits external resources', () => {
  assert.equal(/localStorage\.clear\s*\(/.test(source), false);
  assert.deepEqual([...source.matchAll(/localStorage\.(?:setItem|removeItem)\(([^,)]*)/g)].map(m => m[1]), ['M.KEY', 'M.KEY']);
  assert.equal(/<script\s+src=|<link[^>]+href=|\bfetch\s*\(|XMLHttpRequest|WebSocket/.test(source), false);
  assert.ok(source.includes("connect-src 'none'"));
  assert.ok(source.includes("window.addEventListener('beforeunload'"));
  assert.ok(source.includes("addEventListener('compositionstart'"));
});
test('both inline scripts parse independently without external module loading', () => {
  const scripts = [...source.matchAll(/<script(?: data-folder-writing-model)?>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 2);
  for (const script of scripts) assert.doesNotThrow(() => new vm.Script(script[1]));
});
