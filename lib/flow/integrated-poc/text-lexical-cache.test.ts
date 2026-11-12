import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

// The browser may reuse syntax; the server remains uncached. Neither path may
// alter identities, accepted RAW, deadlines, progress, or later query results.
const source = readFileSync(new URL('./vendor/text-model.cjs', import.meta.url), 'utf8');
function model(browser: boolean) {
  let serial = 0;
  const context = vm.createContext({ module: { exports: {} }, ...(browser ? { window: {} } : {}),
    crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++serial).padStart(12, '0')}` } });
  new vm.Script(source).runInContext(context);
  return context.module.exports as any;
}
const plain = (value: unknown) => JSON.parse(JSON.stringify(value));
const seed = () => ({ version: 11, documents: [], flows: [], folders: [{ id: 'folder-unfiled', title: '미분류', parentId: null }], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] });

test('browser syntax reuse preserves server RAW, IDs and interpretation across edits and section years', () => {
  const browser = model(true), server = model(false);
  let a = browser.addDocument(seed(), { title: '합성' }), b = server.addDocument(seed(), { title: '합성' });
  const id = a.documents[0].id;
  for (const year of ['2024', '2025', '2026', '2024']) for (const mark of [' ', '25%', '1.0', '100%', 'x', 'NaN', '']) {
    const raw = [`[${year}-02-20]`, `- [${mark}] 운동`, '  - 마감: 2/29', '  - 기다림: 2026-11-01', '  - 메모: 보존', '- [ ] 다른 할 일'].join('\n');
    const left = browser.editTextResult(a, id, raw, { folderText: true, progressDate: '2026-11-12' });
    const right = server.editTextResult(b, id, raw, { folderText: true, progressDate: '2026-11-12' });
    assert.deepEqual(plain(left), plain(right)); a = left.state; b = right.state;
    for (let n = 0; n < 3; n++) {
      assert.deepEqual(plain(browser.rowMeta(a, id)), plain(server.rowMeta(b, id)));
      assert.deepEqual(plain(browser.tasks(a)), plain(server.tasks(b)));
    }
    assert.equal(browser.raw(browser.getDocument(a, id)), server.raw(server.getDocument(b, id)));
  }
});

test('public progress results remain detached and cannot poison later lexical reads', () => {
  const M = model(true);
  for (const token of [' ', 'x', '0.29', '1', '1.0', '1.0%', '101%', '', null, undefined]) {
    const expected = plain(M.parseProgressToken(token)), first = M.parseProgressToken(token), next = M.parseProgressToken(token);
    assert.notEqual(first, next); assert.equal(Object.isFrozen(first), false);
    first.ok = !first.ok; first.percent = 73; first.kind = 'poison';
    assert.deepEqual(plain(M.parseProgressToken(token)), expected);
  }
});
