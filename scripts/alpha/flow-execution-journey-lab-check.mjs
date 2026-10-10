import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// Pure synthetic model and static HTML checks only. This does not open a browser
// or read/write production data, localStorage, account state, or the application.
const file = fileURLToPath(new URL('../../docs/content-audit/2026-10-01-flowme-flow-execution-journey-lab-ko.html', import.meta.url));
const html = readFileSync(file, 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]);
assert.equal(scripts.length, 2, 'Expected the standalone model and UI inline scripts');
scripts.forEach((script, index) => new vm.Script(script, { filename: `${file}:script-${index}` }));
const context = vm.createContext({});
vm.runInContext(scripts[0], context);
const M = context.FlowExecutionJourneyModel;
let passed = 0;
let failed = 0;

function check(id, name, fn) {
  try {
    fn();
    passed++;
    console.log(`PASS ${id} ${name}`);
  } catch (error) {
    failed++;
    console.error(`FAIL ${id} ${name}: ${error.message}`);
  }
}

function equalBytes(left, right) {
  assert.equal(JSON.stringify(left), JSON.stringify(right));
}

const seed = M.seed();
const original = JSON.stringify(seed);
const origin = M.sourceBytes;
const documentId = 'personal-native-1';
const itemId = 'native:source-task-a';
const actorId = M.ACTOR;
const edit = {
  type: 'edit', actorId, documentId, itemId,
  title: '개인 준비 확인', date: '2026-10-02', note: '내 상황 메모',
};
const changed = M.change(seed, edit);
const complete = M.change(changed, { type: 'complete', actorId, documentId, itemId, done: true });
const reopen = M.change(complete, { type: 'complete', actorId, documentId, itemId, done: false });
const keeps = [{ title: 'keep', date: 'keep' }, { title: 'keep', date: 'keep' }];
const choices = [{ title: 'incoming', date: 'keep' }, keeps[1]];
const compared = M.change(complete, { type: 'compare', actorId, documentId, version: 2, choices });
const adopted = M.change(compared, { type: 'adopt', actorId, kind: 'public', version: 2 });

check('FL01', 'HTML two inline scripts parse', () => assert.equal(scripts.length, 2));
check('FL02', 'single exact lab prefix', () => {
  assert.equal(M.KEY, 'flow:poc:personal-workspace:v1:journey-lab:flow-execution:v1');
});
check('FL03', 'valid seeded native binding', () => assert.equal(M.valid(seed), true));
check('FL04', 'native lookup is readonly same identity', () => {
  assert.equal(M.inspect(seed, actorId), documentId);
  assert.equal(JSON.stringify(seed), original);
});
check('FL05', 'missing stale foreign actor fail closed', () => {
  for (const mode of ['missing', 'stale', 'foreign']) assert.equal(M.inspect(seed, actorId, mode), null);
  assert.equal(M.inspect(seed, 'synthetic-other'), null);
});
check('FL06', 'private edit original bytes preserved', () => {
  assert.equal(JSON.stringify(seed), original);
  assert.equal(JSON.stringify(M.catalog), origin);
  assert.equal(changed.documents[0].items[0].note, '내 상황 메모');
});
check('FL07', 'all periods point to same Item', () => {
  for (const view of ['today', 'week', 'month']) {
    assert.equal(M.visible(changed, view, '2026-10-02').find(row => row.id === itemId).documentId, documentId);
  }
});
check('FL08', 'period query readonly', () => {
  const before = JSON.stringify(changed);
  M.visible(changed, 'month');
  assert.equal(JSON.stringify(changed), before);
});
check('FL09', 'same value edit no mutation', () => equalBytes(M.change(changed, edit), changed));
check('FL10', 'foreign private write rejected', () => {
  assert.throws(() => M.change(seed, { ...edit, actorId: 'synthetic-other' }));
});
check('FL11', 'completion reopens same Item with local history', () => {
  assert.equal(complete.documents[0].items[0].done, true);
  assert.equal(reopen.documents[0].items[0].done, false);
  assert.equal(reopen.documents[0].items[0].history.length, 2);
  assert.equal(reopen.documents[0].items[0].id, itemId);
});
check('FL12', 'comparison all keep no mutation', () => {
  equalBytes(M.change(changed, { type: 'compare', actorId, documentId, version: 2, choices: keeps }), changed);
});
check('FL13', 'explicit field comparison preserves progress note identity', () => {
  const row = compared.documents[0].items[0];
  assert.equal(row.done, true);
  assert.equal(row.note, '내 상황 메모');
  assert.equal(row.date, '2026-10-02');
  assert.equal(row.id, itemId);
  assert.equal(compared.nativeBinding.version, 2);
});
check('FL14', 'same selected field value comparison no mutation', () => {
  equalBytes(M.change(compared, { type: 'compare', actorId, documentId, version: 2, choices }), compared);
});
check('FL15', 'explicit public copy independent owner and completion', () => {
  assert.equal(adopted.documents.length, 2);
  assert.equal(adopted.documents[1].ownerId, actorId);
  assert.equal(adopted.documents[1].kind, 'public');
  assert.equal(adopted.documents[1].items[0].done, false);
  assert.equal(M.catalog.public[1].items[0].done, true);
});
check('FL16', 'existing public adoption same value no mutation', () => {
  equalBytes(M.change(adopted, { type: 'adopt', actorId, kind: 'public', version: 1 }), adopted);
});
check('FL17', 'save and Undo snapshots round trip', () => {
  const restored = M.decode(M.encode(adopted, [seed, changed, complete]));
  equalBytes(restored.data, adopted);
  equalBytes(restored.undo.at(-1), complete);
  assert.equal(M.valid(restored.undo.at(-1)), true);
});
check('FL18', 'corrupt payload fail closed', () => {
  for (const wire of ['{', 'null', '{}', '{"schema":9,"data":{},"undo":[]}']) assert.throws(() => M.decode(wire));
});
check('FL19', 'tampered binding and Item fail closed', () => {
  const mutations = [
    data => { data.nativeBinding.actorId = 'synthetic-other'; },
    data => { data.nativeBinding.documentId = 'missing'; },
    data => { data.nativeBinding.version = 2; },
    data => { data.documents[0].items[0].id = 'other'; },
    data => { data.documents[0].items[0].date = '2026-02-30'; },
    data => { data.documents[0].extra = 'unexpected'; },
    data => { data.documents[0].items[0].done = true; },
  ];
  for (const mutate of mutations) {
    const bad = M.clone(seed);
    mutate(bad);
    assert.equal(M.valid(bad), false);
    assert.throws(() => M.decode(JSON.stringify({ schema: 1, data: bad, undo: [] })));
  }
});
check('FL20', 'tampered Undo rejected', () => {
  const bad = M.clone(seed);
  bad.nativeBinding.documentId = 'bad';
  assert.throws(() => M.encode(seed, [bad]));
});
check('FL21', 'fixed sources deep frozen and unchanged', () => {
  assert.equal(Object.isFrozen(M.catalog.creator[0].items[0]), true);
  assert.equal(JSON.stringify(M.catalog), origin);
});
check('FL22', 'all storage access uses exact key no clear network', () => {
  assert.equal((html.match(/localStorage\.setItem\(M\.KEY/g) || []).length, 1);
  assert.equal((html.match(/localStorage\.removeItem\(M\.KEY/g) || []).length, 1);
  const calls = [...html.matchAll(/localStorage\.(getItem|setItem|removeItem)\(([^,)]+)/g)];
  assert.ok(calls.length > 0);
  assert.ok(calls.every(call => call[2] === 'M.KEY'));
  assert.doesNotMatch(html, /localStorage\.clear\(|fetch\(|XMLHttpRequest|sessionStorage|https?:\/\//);
  assert.match(html, /connect-src 'none'/);
});
check('FL23', 'static ids unique with semantic controls', () => {
  const prefix = html.split('<script data-model>')[0];
  const ids = [...prefix.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(prefix, /<dialog[^>]*aria-labelledby=/);
  assert.match(prefix, /<nav aria-label=/);
  assert.doesNotMatch(prefix, /draggable=/);
  assert.equal(html.split(/\r?\n/).filter(line => /[\t ]+$/.test(line)).length, 0);
});
check('FL24', 'responsive five target sizes disclosed not claimed', () => {
  for (const size of ['375×812', '390×844', '844×390', '1024×768', '1440×900']) assert.ok(html.includes(size));
  assert.ok(html.includes('검증 완료 표시가 아닙니다'));
});

console.log(JSON.stringify({
  scope: 'standalone synthetic lab: pure model and static HTML only',
  passed, failed, total: passed + failed, skipped: 0,
  storageKey: M.KEY,
  browserVerified: false, productVerified: false,
}));
if (failed > 0) process.exitCode = 1;
