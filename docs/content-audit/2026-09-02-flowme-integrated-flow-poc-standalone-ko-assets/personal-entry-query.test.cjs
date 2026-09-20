'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { M, C, NOW, clone } = require('./k3b-plan-lossless-gate.fixture.cjs');
const R = require('./personal-entry-read.js');
const PD = require('./personal-plan-display.js');
const file = path.join(__dirname, 'personal-entry-query.js');
const runtimeFile = path.join(__dirname, 'personal-entry-query-runtime.cjs');
const Q = fs.existsSync(file) ? require(file) : {};
const Runtime = fs.existsSync(runtimeFile) ? require(runtimeFile) : {};
const bytes = value => JSON.stringify(value);
const root = path.resolve(__dirname, '../../..');
const sourceFiles = [file, runtimeFile, __filename, path.join(__dirname, 'personal-entry-read.js'),
  path.join(root, 'lib/flow/personal-workspace-poc-entry.ts'), path.join(root, 'lib/flow/url-first-lookup.ts'),
  path.join(root, 'lib/flow/personal-workspace-poc-contract.ts')];
const hashes = () => sourceFiles.map(file => ({ file: path.relative(root, file).replaceAll('\\', '/'),
  sha256: fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null }));
const beforeHashes = hashes();
test.after(() => {
  const afterHashes = hashes(); assert.deepEqual(afterHashes, beforeHashes);
  console.log('ENTRY_QUERY_SOURCE_BOUNDARY ' + bytes({ before: beforeHashes, after: afterHashes, exact: true,
    scope: 'pure local query/classification; no application, browser history, current authority or external I/O' }));
});
function api() {
  assert.equal(typeof Q.resolvePersonalEntry, 'function', 'new query adapter must exist');
  assert.equal(typeof Runtime.loadCommonJs, 'function', 'actual canonical bundle loader must exist');
  assert.equal(typeof Runtime.buildBrowserText, 'function', 'actual canonical browser bundle must exist');
}
function fixture(state = M.seedState()) {
  const from = C.fromLegacy(bytes({ version: 1, state, undo: null })); assert.equal(from.ok, true, from.reason);
  const input = { checkpoint: from.checkpoint, sourceRead: { ok: true, raw: null }, sourceEpoch: 0 };
  const read = R.createPersonalEntryReadPacket(input); assert.equal(read.ok, true, read.reason);
  const catalog = R.readPersonalEntryCatalog(read.packet).catalog;
  return { state, input, packet: read.packet, catalog };
}
function resolve(raw, f = fixture(), reader = Q) {
  api(); const state = bytes(f.input), packet = bytes(f.packet);
  const result = reader.resolvePersonalEntry(raw, f.packet);
  assert.equal(bytes(f.input), state); assert.equal(bytes(f.packet), packet);
  assert.equal(result.ok, true, result.reason); assert.equal(result.resolution.rawInput, raw);
  if (result.resolution.kind !== 'empty') assert.deepEqual(JSON.parse(bytes(result.resolution.textContinuation)), { rawText: raw, requiresExplicitChoice: true });
  return result;
}
const canonical = (raw, model = { version: 1, flows: [] }) => Runtime.loadCommonJs().resolvePersonalWorkspacePocEntry(raw, model);
function nonMap() {
  const state = M.seedState(); state.flows = state.flows.filter(flow => flow.origin !== 'source-backed-map');
  const ids = new Set(state.flows.map(flow => flow.id)); state.tasks = state.tasks.filter(task => task.flowId === null || ids.has(task.flowId));
  return fixture(state);
}
function canonicalFixture(f) {
  // Real exact saved identities/current text in a non-map canonical fixture;
  // no source URL, source-title, description or invented Map metadata.
  return { version: 1, flows: f.catalog.copies.map(copy => ({ ref: copy.flowRef, savedCopyId: copy.savedCopyId,
    flowId: copy.flowId, sourceSlug: 'test-fixture-only', title: copy.title, origin: copy.origin,
    items: copy.items.map((item, sourceOrder) => ({ ref: item.itemRef, savedCopyId: item.savedCopyId,
      flowId: item.flowId, itemId: item.itemId, title: item.title, sourceOrder })) })) };
}
function browserRuntime(overrides = {}, touch = () => {}) {
  api(); const context = vm.createContext({ URL, URLSearchParams, FlowMeIntegratedPoc: M,
    FlowPocWorkspaceCheckpoint: C, FlowPocPersonalPlanDisplay: PD, ...overrides });
  for (const name of ['window', 'document', 'localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest']) {
    Object.defineProperty(context, name, { get() { touch(name); throw new Error('forbidden ambient ' + name); } });
  }
  vm.runInContext('Date.now=()=>{throw new Error("clock forbidden")};Math.random=()=>{throw new Error("random forbidden")};', context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'personal-entry-read.js'), 'utf8'), context);
  vm.runInContext(Runtime.buildBrowserText(), context);
  for (const [key, value] of Object.entries(overrides)) context[key] = value;
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  return context;
}

test('EQ01 versioned query and actual canonical CJS/IIFE runtime expose no writers', () => {
  api(); assert.equal(Q.VERSION, 1); assert.equal(Q.CONTRACT, 'flowme-standalone-personal-entry-query-v1');
  assert.deepEqual(Object.keys(Q).sort(), ['CONTRACT', 'VERSION', 'resolvePersonalEntry']);
  assert.equal(path.resolve(Runtime.canonicalEntry), path.join(root, 'lib/flow/personal-workspace-poc-entry.ts'));
  assert.deepEqual(Object.keys(Runtime.loadCommonJs()), ['resolvePersonalWorkspacePocEntry']);
  const browser = Runtime.buildBrowserText(); assert.match(browser, /FlowPocPersonalEntryCanonical/);
  assert.equal(browser, Runtime.buildBrowserText(), 'write:false memory build is deterministic for fixed sources');
  console.log('ENTRY_QUERY_CANONICAL_BUNDLE ' + bytes({ format: 'iife', global: 'FlowPocPersonalEntryCanonical',
    bytes: Buffer.byteLength(browser, 'utf8'), sha256: crypto.createHash('sha256').update(browser).digest('hex'), write: false }));
});
test('EQ02 empty input preserves raw bytes and canonical normalization but returns no implicit full list', () => {
  api(); const f = fixture(); assert.equal(f.catalog.copies.length, 4);
  for (const raw of ['', ' \r\n\t ', '\u3000']) {
    assert.deepEqual(resolve(raw, f), canonical(raw)); assert.deepEqual(resolve(raw, f).resolution.matches, []);
  }
});
test('EQ03 all four local origins remain searchable while Map grouping is explicitly unavailable and canonical gate unchanged', () => {
  api(); const f = fixture(), query = resolve('이사 준비', f).resolution;
  assert.equal(query.kind, 'query'); assert.equal(query.matches.length, 1);
  assert.equal(query.matches[0].origin, 'source-backed-map');
  assert.equal(f.catalog.copies[0].grouping.status, 'unavailable');
  assert.equal(canonical('이사 준비', canonicalFixture(f)).reason, 'unsupported-map-presentation');
  for (const copy of f.catalog.copies) {
    const found = resolve(copy.title, f).resolution;
    assert.equal(found.kind, 'query'); assert.ok(found.matches.some(match => match.flowRef === copy.flowRef));
    assert.equal(found.matches.find(match => match.flowRef === copy.flowRef).origin, copy.origin);
  }
});
test('EQ04 exact non-map canonical fixtures preserve query/title/item-text results and deterministic match order', () => {
  api(); const f = nonMap(), model = canonicalFixture(f);
  const rawValues = ['개인 Flow', '세탁기', ...f.catalog.copies.map(copy => copy.items[0].title)];
  for (const raw of rawValues) assert.deepEqual(resolve(raw, f), canonical(raw, model));
});
test('EQ05 NFKC/case/whitespace normalization is canonical and equal-title ordering falls back to full ref', () => {
  api(); const state = M.seedState();
  state.flows.forEach(flow => { flow.title = '같은 FLOW 제목'; });
  state.tasks.filter(task => task.flowId !== null).forEach(task => { task.title = 'FLOW 실행 항목'; });
  const f = fixture(state), raw = ' \tＦＬＯＷ\r\n ', result = resolve(raw, f).resolution;
  assert.equal(result.normalizedInput, canonical(raw).resolution.normalizedInput);
  assert.deepEqual(result.matches.map(match => match.matchedBy), Array(4).fill(['title', 'item-text']));
  assert.deepEqual(result.matches.map(match => match.flowRef), f.catalog.copies.map(copy => copy.flowRef).sort((a, b) => a.localeCompare(b)));
  assert.equal(result.textContinuation.rawText, raw);
});
test('EQ06 URL classification/canonicalization is reused, but catalog with no URL facts always yields an explicit miss', () => {
  api(); const f = nonMap(), model = canonicalFixture(f);
  for (const raw of [' http://www.example.com/plan/?utm_source=x&b=2&a=1#part ', 'https://example.com/한글', 'https://example.com/no-saved-copy']) {
    const result = resolve(raw, f); assert.deepEqual(result, canonical(raw, model));
    assert.equal(result.resolution.kind, 'url'); assert.equal(result.resolution.lookupStatus, 'miss');
    assert.deepEqual(result.resolution.matches, []);
  }
  const state = M.seedState(); state.flows[0].title = 'https://example.com/plan'; state.flows[0].sourceUrl = 'https://example.com/plan';
  assert.equal(resolve('https://example.com/plan', fixture(state)).resolution.lookupStatus, 'miss');
});
test('EQ07 invalid URL-like and unsafe schemes preserve canonical invalid-url decisions without anchor facts', () => {
  api(); const f = nonMap();
  for (const raw of ['https//example.com/a', 'ftp://example.com/a', 'www.example.com/a', 'javascript:alert(1)', 'data:text/html,hi']) {
    const result = resolve(raw, f); assert.deepEqual(result, canonical(raw, canonicalFixture(f)));
    assert.equal(result.resolution.kind, 'invalid-url'); assert.equal('canonicalUrl' in result.resolution, false);
  }
});
test('EQ08 unmatched multiline text remains memo with exact explicit-choice continuation, never a generated Flow', () => {
  api(); const f = nonMap(), raw = '  주말에 창고를 정리하고\r\n기부할 물건을 나누기\t';
  const result = resolve(raw, f); assert.deepEqual(result, canonical(raw, canonicalFixture(f)));
  assert.equal(result.resolution.kind, 'memo'); assert.equal(result.resolution.textContinuation.requiresExplicitChoice, true);
});
test('EQ09 source-title/description/section/memo are not fabricated as local searchable title/item facts', () => {
  api(); const state = M.seedState(); state.flows[0].sourceTitle = '출처 전용 검색어';
  state.flows[0].steps[0].title = '구간 전용 검색어';
  const task = state.tasks.find(task => task.id === 'quote'); task.sourceDescription = '설명 전용 검색어'; task.memo = '개인 메모 검색어';
  const f = fixture(state);
  for (const raw of ['출처 전용 검색어', '구간 전용 검색어', '설명 전용 검색어', '개인 메모 검색어']) {
    assert.equal(resolve(raw, f).resolution.kind, 'memo');
  }
  const result = resolve('이사', f).resolution;
  for (const match of result.matches) assert.equal(match.matchedBy.includes('source-title'), false);
});
test('EQ10 genuine personal title overrides are searchable and the previous source title is not a discovery alias', () => {
  api(); const base = fixture(), flow = base.input.checkpoint.state.flows[0];
  const opened = C.inspectSourceBoundPersonalPlanContext(base.input.checkpoint,
    { flowRef: flow.ref, sourceRead: base.input.sourceRead, sourceEpoch: 0 }); assert.equal(opened.ok, true, opened.reason);
  const draft = clone(opened.draft); draft.title = { mode: 'override', value: '개인 전용 제목' };
  const changed = C.transitionCheckpoint(base.input.checkpoint, { type: 'commit-source-bound-personal-plan-context',
    context: opened.context, draft, sourceRead: base.input.sourceRead, sourceEpoch: 0, now: NOW }); assert.equal(changed.changed, true);
  const input = { ...base.input, checkpoint: changed.checkpoint }, captured = R.createPersonalEntryReadPacket(input);
  assert.equal(captured.ok, true); const f = { ...base, input, packet: captured.packet };
  assert.equal(resolve('개인 전용 제목', f).resolution.kind, 'query');
  assert.equal(resolve(flow.title, f).resolution.kind, 'memo');
});
test('EQ11 authored and trashed copies stay outside local matches instead of becoming canonical lookalikes', () => {
  api(); const base = fixture(), handoff = M.makeHandoff('# 작성 전용 검색\n- [ ] 작성 검색 항목',
    { draftId: 'query-draft', handoffId: 'query-handoff', sourceConfirmed: true, folderId: null });
  const committed = C.transitionCheckpoint(base.input.checkpoint, { type: 'commit-authoring', handoff, now: NOW }); assert.equal(committed.changed, true);
  const trashed = C.transitionCheckpoint(committed.checkpoint, { type: 'move-to-trash', kind: 'flow', id: 'moving', now: NOW }); assert.equal(trashed.changed, true);
  const input = { ...base.input, checkpoint: trashed.checkpoint }, captured = R.createPersonalEntryReadPacket(input); assert.equal(captured.ok, true);
  const f = { ...base, input, packet: captured.packet };
  assert.equal(resolve('작성 전용 검색', f).resolution.kind, 'memo'); assert.equal(resolve('이사 준비 저장본', f).resolution.kind, 'memo');
});
test('EQ12 non-string raw input is rejected without coercion, getters or outward exceptions', () => {
  api(); const f = fixture(); let calls = 0;
  const trap = { toString() { calls += 1; throw new Error('coercion'); } };
  const getter = {}; Object.defineProperty(getter, 'rawInput', { get() { calls += 1; throw new Error('getter'); } });
  for (const raw of [undefined, null, false, 42, Symbol('raw'), ['query'], trap, getter, new String('query')]) {
    let result; assert.doesNotThrow(() => { result = Q.resolvePersonalEntry(raw, f.packet); });
    assert.equal(result.ok, false); assert.equal(result.scope, 'entry-query'); assert.equal('rawInput' in result, false);
  }
  assert.equal(calls, 0);
});
test('EQ13 copied/foreign/revoked packets fail before even empty or URL input can open a read path', () => {
  api(); const f = fixture(), browser = browserRuntime();
  const foreign = browser.FlowPocPersonalEntryRead.createPersonalEntryReadPacket(f.input).packet;
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (const packet of [undefined, {}, clone(f.packet), foreign, revoked.proxy]) for (const raw of ['', '이사', 'https://example.com']) {
    const result = Q.resolvePersonalEntry(raw, packet); assert.equal(result.ok, false); assert.equal(result.rawInput, raw);
    assert.equal('resolution' in result, false);
  }
});
test('EQ14 resolutions are frozen detached reads, retain all matches, and grant no current storage authority', () => {
  api(); const f = fixture(), first = resolve('이사', f), saved = bytes(first);
  assert.equal(Object.isFrozen(first), true); assert.equal(Object.isFrozen(first.resolution.matches), true);
  assert.throws(() => { first.resolution.matches[0].title = '위조'; }, TypeError);
  f.input.sourceEpoch += 1; f.input.checkpoint.state.flows[0].title = '이후 변경';
  const second = resolve('이사', f); assert.equal(bytes(second), saved); assert.notEqual(first.resolution, second.resolution);
  assert.equal('canWrite' in first, false); assert.equal('authority' in first, false);
  // App must independently invalidate capture-time packet reuse on S/source observation, including ABA.
});
test('EQ15 actual browser bundle and CommonJS adapter agree with no ambient storage/network/clock/random', () => {
  api(); let touches = 0; const context = browserRuntime({}, () => { touches += 1; }), f = fixture();
  const browserPacket = context.FlowPocPersonalEntryRead.createPersonalEntryReadPacket(f.input); assert.equal(browserPacket.ok, true);
  for (const raw of ['', '이사', '  세탁기\r\n ', 'https://www.example.com/?utm_source=a', 'javascript:alert(1)', '개인 미등록 메모']) {
    const actual = context.FlowPocPersonalEntryQuery.resolvePersonalEntry(raw, browserPacket.packet);
    assert.deepEqual(JSON.parse(bytes(actual)), resolve(raw, f));
  }
  assert.equal(touches, 0);
});
test('EQ16 missing or throwing canonical/reader dependencies block rather than using a hand-coded resolver fallback', () => {
  api(); const f = fixture(); let canonicalCalls = 0;
  const variants = [ [{ FlowPocPersonalEntryCanonical: undefined }, 'entry-canonical-unavailable'],
    [{ FlowPocPersonalEntryRead: undefined }, 'entry-reader-unavailable'],
    [{ FlowPocPersonalEntryRead: { ...R, VERSION: 99 } }, 'entry-reader-unavailable'],
    [{ FlowPocPersonalEntryCanonical: { resolvePersonalWorkspacePocEntry() { canonicalCalls += 1; throw new Error('canonical failed'); } } }, 'invalid-entry-query'] ];
  for (const [override, reason] of variants) {
    const browser = browserRuntime(override);
    const reader = browser.FlowPocPersonalEntryRead;
    const packet = reader ? reader.createPersonalEntryReadPacket(f.input).packet : f.packet;
    const result = browser.FlowPocPersonalEntryQuery.resolvePersonalEntry('이사', packet);
    assert.equal(result.ok, false); assert.equal(result.reason, reason);
  }
  assert.equal(canonicalCalls, 1, 'actual throwing dependency is reached with its genuine packet, not rejected earlier by a foreign brand');
});
test('EQ17 empty-model canonical use cannot manufacture a hit or accept malformed/foreign match output', () => {
  api(); const f = fixture(); let seen = 0;
  const actual = Runtime.loadCommonJs();
  const wrapper = { resolvePersonalWorkspacePocEntry(raw, model) {
    seen += 1; assert.equal(model.version, 1); assert.deepEqual(JSON.parse(bytes(model.flows)), []);
    return actual.resolvePersonalWorkspacePocEntry(raw, model);
  } };
  const browser = browserRuntime({ FlowPocPersonalEntryCanonical: wrapper, FlowPocPersonalEntryRead: R });
  assert.equal(browser.FlowPocPersonalEntryQuery.resolvePersonalEntry('이사', f.packet).ok, true); assert.ok(seen > 1);
  for (const result of [{ ok: true, resolution: { kind: 'query', rawInput: '이사', normalizedInput: '이사', matches: [{ flowRef: 'foreign' }] } },
    { ok: true, resolution: { kind: 'memo', rawInput: 'wrong', normalizedInput: '이사', matches: [] } }]) {
    const bad = browserRuntime({ FlowPocPersonalEntryRead: R, FlowPocPersonalEntryCanonical: { resolvePersonalWorkspacePocEntry: () => result } });
    assert.equal(bad.FlowPocPersonalEntryQuery.resolvePersonalEntry('이사', f.packet).ok, false);
  }
});
