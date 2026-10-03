'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const htmlPath = path.join(__dirname, '..', '2026-10-02-flowme-ux-comparison-gaps-ko.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const source = id => {
  const match = html.match(new RegExp('<script id="' + id + '">([\\s\\S]*?)</script>'));
  assert(match, 'missing inline script ' + id); return match[1];
};
const modelSource = source('lab-model'), uiSource = source('lab-ui');
const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '');
const normalize = value => JSON.parse(JSON.stringify(value));
function model() {
  const context = vm.createContext({});
  new vm.Script(modelSource, { filename: htmlPath + '#lab-model' }).runInContext(context);
  return context.FlowUxComparisonLab;
}
function storage(initial = null) {
  const map = new Map([['protected-flow-key', 'unchanged-sentinel']]);
  const reads = [], writes = [];
  const api = model(); if (initial !== null) map.set(api.KEY, initial);
  return { map, reads, writes, getItem(key) { reads.push(key); assert.equal(key, api.KEY); return map.get(key) ?? null; },
    setItem(key, value) { assert.equal(key, api.KEY); assert.equal(typeof value, 'string'); writes.push([key, value]); map.set(key, value); },
    removeItem() { throw Error('remove forbidden'); }, clear() { throw Error('clear forbidden'); } };
}
function ui(options = {}) {
  const elements = {};
  for (const match of markup.matchAll(/\bid="([^"]+)"/g)) {
    const handlers = {};
    elements[match[1]] = { value: '', hidden: false, disabled: false, textContent: '', className: '', attributes: {},
      addEventListener(type, handler) { handlers[type] = handler; },
      setAttribute(name, value) { this.attributes[name] = value; },
      focus() { document.activeElement = this; },
      trigger(type, event = {}) { if (handlers[type]) handlers[type](event); },
      click() { if (!this.disabled) this.trigger('click'); } };
  }
  elements.concept.value = 'tool'; elements.purpose.value = 'personal';
  elements.response.value = 'success'; elements.receipt.value = 'confirmed'; elements['save-preview'].hidden = true;
  const documentHandlers = {};
  const document = { activeElement: null, getElementById(id) { assert(elements[id], 'unknown DOM ID ' + id); return elements[id]; }, addEventListener(type, handler) { documentHandlers[type] = handler; } };
  const store = options.storage || storage();
  const context = vm.createContext({ document });
  Object.defineProperty(context, 'localStorage', { get() { if (options.denied) throw Error('SecurityError'); return store; } });
  new vm.Script(modelSource, { filename: htmlPath + '#lab-model' }).runInContext(context);
  new vm.Script(uiSource, { filename: htmlPath + '#lab-ui' }).runInContext(context);
  return { elements, store, document, key: context.FlowUxComparisonLab.KEY,
    input(text) { elements['draft-text'].value = text; elements['draft-text'].trigger('input'); },
    save(response = 'success') { elements.response.value = response; elements.prepare.click(); elements.confirm.click(); },
    keydown(key) { let prevented = false; documentHandlers.keydown({ key, preventDefault() { prevented = true; } }); return prevented; } };
}

test('static: Korean standalone HTML has only two inline scripts and no external media or execution', () => {
  assert.match(html, /<html lang="ko">/); assert.equal((html.match(/<script\b/g) || []).length, 2);
  assert.doesNotMatch(html, /<(?:iframe|img|link|form)\b|\bsrc=/i);
  assert.doesNotMatch(modelSource + uiSource, /\b(?:fetch|XMLHttpRequest|WebSocket|indexedDB|sessionStorage|sendBeacon)\b/);
});
test('static: CSP denies connections, media and form submission', () => {
  for (const value of ["default-src 'none'", "connect-src 'none'", "img-src 'none'", "form-action 'none'", "base-uri 'none'"]) assert(html.includes(value));
});
test('static: script syntax is valid without browser execution', () => {
  assert.doesNotThrow(() => new vm.Script(modelSource)); assert.doesNotThrow(() => new vm.Script(uiSource));
});
test('static: exact dedicated key appears once and removal/global clear are absent', () => {
  const key = 'flow:poc:personal-workspace:v1:ux-comparison-lab:v1';
  assert.equal(html.split(key).length - 1, 1); assert.doesNotMatch(modelSource + uiSource, /removeItem|\.clear\s*\(|\.key\s*\(/);
});
test('static: IDs are unique and label targets exist', () => {
  const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]); assert.equal(new Set(ids).size, ids.length);
  for (const match of markup.matchAll(/\bfor="([^"]+)"/g)) assert(ids.includes(match[1]));
});
test('static: requirement and UX-review links resolve inside the current worktree', () => {
  for (const match of markup.matchAll(/href="([^"#][^"]+)"/g)) { assert(!/^[a-z]+:/i.test(match[1])); assert(fs.existsSync(path.resolve(path.dirname(htmlPath), match[1]))); }
});
test('static: boundary and unexecuted browser/device/fidelity status stay visible', () => {
  for (const value of ['실제 앱·계정·DB', '브라우저 렌더', '실기기', '관찰 사용자', '미실행', '제품 디자인 채택', '별도 schema/영구 문법은 미확정']) assert(markup.includes(value));
  assert.doesNotMatch(markup, /10\/10|fidelity\s*100|사용자\s*점수\s*[:：]\s*\d/);
});
test('static: existing report colors and responsive declarations are retained without rendering claims', () => {
  for (const value of ['#163331', '#f2f6f4', '#08796f', '@media(max-width:650px)', 'prefers-reduced-motion', ':focus-visible']) assert(html.includes(value));
});

test('model: four concepts and three optional purposes exist', () => {
  const api = model(); assert.deepEqual(Object.keys(api.concepts), ['tool','community','service','knowledge']);
  assert.deepEqual(Object.keys(api.purposes), ['personal','reuse','contribute']);
});
test('model: initial state is valid, private and unchanged', () => {
  const api = model(), state = api.initial(); assert(api.valid(state)); assert.equal(state.ack.actor, 'lab-me');
  assert.equal(state.requests, 0); assert.equal(state.commits, 0); assert.equal(state.pending, null);
});
test('model: editing preserves acknowledged draft, owner and success count', () => {
  const api = model(), before = api.initial(), result = api.edit(before, '새 비공개 초안\n개인 메모');
  assert.equal(result.state.input, '새 비공개 초안\n개인 메모'); assert.deepEqual(normalize(result.state.ack), normalize(before.ack));
  assert.equal(result.state.commits, 0); assert.equal(before.input, before.ack.text);
});
test('model: same text, cancellation and preparation error produce no new request or successful change', () => {
  const api = model(), state = api.initial();
  assert.equal(api.save(state, 'after', 'success').kind, 'no-change');
  const edited = api.edit(state, '편집 입력').state;
  for (const result of [api.cancel(edited), api.save(edited, 'after', 'error')]) {
    assert.deepEqual(normalize(result.state), normalize(edited)); assert.equal(result.state.requests, 0); assert.equal(result.state.commits, 0);
  }
});
test('model: confirmed refusal retains input with zero success and no unknown request', () => {
  const api = model(), state = api.edit(api.initial(), '고칠 초안').state, result = api.save(state, 'after', 'rejected');
  assert.equal(result.kind, 'rejected'); assert.equal(result.state.requests, 1); assert.equal(result.state.commits, 0);
  assert.equal(result.state.input, '고칠 초안'); assert.equal(result.state.pending, null); assert(api.valid(result.state));
});
test('model: before blocks direct retry while preserving rejected request and changed input', () => {
  const api = model(); const rejected = api.save(api.edit(api.initial(), '첫 초안').state, 'before', 'rejected').state;
  const edited = api.edit(rejected, '고친 초안').state, result = api.save(edited, 'before', 'success');
  assert.equal(result.kind, 'blocked'); assert.deepEqual(normalize(result.state), normalize(edited)); assert.equal(result.state.requests, 1);
});
test('model: after saves the revised draft with one fresh explicit request and one successful change', () => {
  const api = model(), rejected = api.save(api.edit(api.initial(), '첫 초안').state, 'after', 'rejected').state;
  const result = api.save(api.edit(rejected, '고친 초안').state, 'after', 'success');
  assert.equal(result.kind, 'saved'); assert.equal(result.state.ack.text, '고친 초안'); assert.equal(result.state.requests, 2);
  assert.equal(result.state.commits, 1); assert.equal(result.state.rejected, null); assert(api.valid(result.state));
});
test('model: repeated definitive refusals retain input and never report a successful change', () => {
  const api = model(); let state = api.edit(api.initial(), '계속 거절되는 초안').state;
  for (let i = 0; i < 3; i++) state = api.save(state, 'after', 'rejected').state;
  assert.equal(state.requests, 3); assert.equal(state.commits, 0); assert.equal(state.input, '계속 거절되는 초안'); assert(api.valid(state));
});
for (const response of ['unknown-before','unknown-after']) {
  test('model: ' + response + ' blocks all fresh saves but preserves later input and exact pending bytes', () => {
    const api = model(), pending = api.save(api.edit(api.initial(), '당시 요청 본문').state, 'after', response).state;
    const edited = api.edit(pending, '그 뒤 이어 쓴 입력').state, result = api.save(edited, 'after', 'success');
    assert.equal(result.kind, 'held'); assert.equal(result.state.pending.id, 'lab-request-1'); assert.equal(result.state.pending.text, '당시 요청 본문');
    assert.equal(result.state.input, '그 뒤 이어 쓴 입력'); assert.equal(result.state.requests, 1); assert(api.valid(result.state));
  });
  test('model: ' + response + ' resolves once and leaves later input without an automatic successor', () => {
    const api = model(); let state = api.save(api.edit(api.initial(), '당시 요청 본문').state, 'after', response).state;
    state = api.edit(state, '그 뒤 이어 쓴 입력').state; state = api.resolve(state, 'confirmed').state;
    assert.equal(state.ack.text, '당시 요청 본문'); assert.equal(state.input, '그 뒤 이어 쓴 입력');
    assert.equal(state.requests, 1); assert.equal(state.commits, 1); assert.equal(state.pending, null); assert(api.valid(state));
    assert.equal(api.resolve(state, 'confirmed').kind, 'no-change');
    const next = api.save(state, 'after', 'success').state; assert.equal(next.requests, 2); assert.equal(next.commits, 2);
  });
}
test('model: unresolved receipt lookup retains one request and no premature acknowledgement', () => {
  const api = model(), state = api.save(api.edit(api.initial(), '불명 초안').state, 'after', 'unknown-after').state;
  const result = api.resolve(state, 'unresolved'); assert.equal(result.kind, 'unknown'); assert.equal(result.state.requests, 1);
  assert.equal(result.state.checks, 1); assert.equal(result.state.ack.revision, 0); assert.equal(result.state.pending.id, 'lab-request-1');
});
test('model: blank, oversized and unsupported choices do not create a request', () => {
  const api = model(), state = api.initial();
  assert.equal(api.save(api.edit(state, '  ').state, 'after', 'success').kind, 'error');
  assert.equal(api.edit(state, 'x'.repeat(2001)).kind, 'invalid');
  assert.equal(api.save(api.edit(state, '본문').state, 'other', 'success').kind, 'invalid');
  assert.equal(api.save(api.edit(state, '본문').state, 'after', 'publish').kind, 'invalid');
});
test('model: revision/request/transaction limits fail closed without changing state', () => {
  const api = model(), state = api.initial(); state.sequence = state.requests = state.commits = state.remote.revision = state.ack.revision = 100000;
  state.input = '한도 다음 입력'; assert(api.valid(state)); const result = api.save(state, 'after', 'success');
  assert.equal(result.kind, 'limit'); assert.deepEqual(normalize(result.state), normalize(state));
});

test('storage: only the exact key is read/written and protected sentinel is unchanged', () => {
  const api = model(), store = storage(), port = api.storagePort(() => store); assert.equal(port.read().locked, false);
  port.write(api.edit(api.initial(), '시험 입력').state); port.read(); assert.equal(store.map.get('protected-flow-key'), 'unchanged-sentinel');
  assert(store.reads.every(key => key === api.KEY)); assert(store.writes.every(([key]) => key === api.KEY));
});
test('storage: denied getter falls back to memory and reopens the same local model', () => {
  const api = model(), port = api.storagePort(() => { throw Error('SecurityError'); });
  assert.equal(port.read().mode, 'memory'); const state = api.edit(api.initial(), '메모리 입력').state;
  assert(port.write(state).ok); const reopened = port.read(); assert.equal(reopened.mode, 'memory'); assert.equal(reopened.state.input, '메모리 입력');
});
test('storage: failed write falls back to memory without claiming persistent storage', () => {
  const api = model(), store = storage(); store.setItem = () => { throw Error('QuotaExceededError'); };
  const port = api.storagePort(() => store); port.read(); const state = api.edit(api.initial(), '할당 실패 입력').state;
  assert.equal(port.write(state).mode, 'memory'); assert.equal(port.read().state.input, '할당 실패 입력'); assert.equal(store.map.get('protected-flow-key'), 'unchanged-sentinel');
});
test('storage: a later read denial keeps the last safe in-memory mirror', () => {
  const api = model(), store = storage(), port = api.storagePort(() => store); port.read();
  port.write(api.edit(api.initial(), '안전 사본').state); store.getItem = () => { throw Error('SecurityError'); };
  const reopened = port.read(); assert.equal(reopened.mode, 'memory'); assert.equal(reopened.state.input, '안전 사본');
});
test('storage: malformed, foreign-owner, extra-field, huge and inconsistent payloads lock with zero writes', () => {
  const api = model(), initial = normalize(api.initial()), corruptions = ['{broken', 'x'.repeat(18001), JSON.stringify({ ...initial, extra: true }), JSON.stringify({ ...initial, ack: { ...initial.ack, actor: 'other' } }), JSON.stringify({ ...initial, commits: 1 })];
  for (const raw of corruptions) {
    const store = storage(raw), port = api.storagePort(() => store), loaded = port.read(); assert.equal(loaded.locked, true);
    assert.equal(port.write(api.initial()).ok, false); assert.equal(store.writes.length, 0); assert.equal(store.map.get(api.KEY), raw);
  }
});
test('storage: non-applied pending cannot conceal changed remote text', () => {
  const api = model(), state = api.save(api.edit(api.initial(), '당시 본문').state, 'after', 'unknown-before').state;
  state.remote.text = '변조 본문'; assert.equal(api.valid(state), false); assert.equal(api.parse(JSON.stringify(state)), null);
});
test('storage: runtime corruption before a write is not overwritten', () => {
  const api = model(), store = storage(), port = api.storagePort(() => store); port.read(); store.map.set(api.KEY, '{broken');
  assert.equal(port.write(api.edit(api.initial(), '입력').state).ok, false); assert.equal(store.writes.length, 0); assert.equal(store.map.get(api.KEY), '{broken');
});
test('storage: all unknown state, selection-free input and rejection survive exact-key re-entry', () => {
  const api = model(), store = storage(), port = api.storagePort(() => store); port.read();
  let state = api.save(api.edit(api.initial(), '요청 본문').state, 'after', 'unknown-after').state; state = api.edit(state, '이어서 쓴 본문').state;
  port.write(state); const reopened = api.storagePort(() => store).read(); assert.equal(reopened.state.pending.id, 'lab-request-1'); assert.equal(reopened.state.input, '이어서 쓴 본문'); assert(api.valid(reopened.state));
});
for (const response of ['success','rejected','unknown-before','unknown-after']) {
  test('model/storage: allowed 2000-control text round-trips and reopens after ' + response, () => {
    const api = model(), acknowledgedText = '\u0001'.repeat(2000), inputText = '\u0002'.repeat(2000);
    const acknowledged = api.save(api.edit(api.initial(), acknowledgedText).state, 'after', 'success').state;
    assert(api.valid(acknowledged));
    const state = api.save(api.edit(acknowledged, inputText).state, 'after', response).state;
    assert(api.valid(state));
    const raw = JSON.stringify(state), parsed = api.parse(raw);
    assert(parsed, 'serialized valid state must remain readable');
    assert.deepEqual(normalize(parsed), normalize(state));
    const store = storage(), port = api.storagePort(() => store); assert.equal(port.read().locked, false);
    assert.equal(port.write(state).ok, true); assert.equal(store.map.get(api.KEY), raw);
    const reopened = api.storagePort(() => store).read();
    assert.equal(reopened.locked, false); assert.equal(reopened.mode, 'local');
    assert.deepEqual(normalize(reopened.state), normalize(state));
    assert(store.reads.every(key => key === api.KEY)); assert.equal(store.writes.length, 1);
    assert(store.writes.every(([key]) => key === api.KEY)); assert.equal(store.map.get('protected-flow-key'), 'unchanged-sentinel');
  });
}
test('storage: very large padded valid JSON stays refused with zero writes', () => {
  const api = model(), raw = JSON.stringify(api.initial()) + ' '.repeat(100000);
  assert.equal(api.parse(raw), null);
  const store = storage(raw), port = api.storagePort(() => store), loaded = port.read();
  assert.equal(loaded.locked, true); assert.equal(port.write(api.initial()).ok, false);
  assert.equal(store.writes.length, 0); assert.equal(store.map.get(api.KEY), raw);
  assert(store.reads.every(key => key === api.KEY)); assert.equal(store.map.get('protected-flow-key'), 'unchanged-sentinel');
});

test('VM UI: bootstrap reads one key, sets default comparison and does not write', () => {
  const app = ui(); assert.equal(app.store.writes.length, 0); assert.equal(app.elements['concept-title'].textContent, '문서에서 시작');
  assert.equal(app.elements.after.attributes['aria-pressed'], 'true'); assert.equal(app.elements.resolve.disabled, true);
});
test('VM UI: all four concept and three purpose choices update text without storage writes', () => {
  const app = ui();
  for (const concept of ['tool','community','service','knowledge']) { app.elements.concept.value = concept; app.elements.concept.trigger('change'); assert(app.elements['concept-description'].textContent.length > 10); }
  for (const purpose of ['personal','reuse','contribute']) { app.elements.purpose.value = purpose; app.elements.purpose.trigger('change'); assert(app.elements['purpose-sample'].textContent.includes('가상')); }
  app.elements.before.click(); app.elements.after.click(); assert.equal(app.store.writes.length, 0);
});
test('VM UI: preview and cancellation preserve typed input and perform zero additional writes/requests', () => {
  const app = ui(); app.input('입력 보존'); const writes = app.store.writes.length;
  app.elements.prepare.click(); assert.equal(app.elements['save-preview'].hidden, false); assert.equal(app.document.activeElement, app.elements.confirm);
  app.elements.cancel.click(); assert.equal(app.elements['save-preview'].hidden, true); assert.equal(app.elements['draft-text'].value, '입력 보존');
  assert.equal(app.store.writes.length, writes); assert.equal(app.elements.requests.textContent, '0'); assert.equal(app.document.activeElement, app.elements.prepare);
});
test('VM UI: Escape follows the same cancel path and never submits', () => {
  const app = ui(); app.input('취소 대상'); app.elements.prepare.click(); const writes = app.store.writes.length;
  assert.equal(app.keydown('Escape'), true); assert.equal(app.elements['save-preview'].hidden, true); assert.equal(app.store.writes.length, writes); assert.equal(app.elements.requests.textContent, '0');
});
test('VM UI: changing draft input closes an old preview and a hidden confirmation cannot save', () => {
  const app = ui(); app.input('옛 preview'); app.elements.prepare.click(); app.input('새 입력');
  assert.equal(app.elements['save-preview'].hidden, true); app.elements.confirm.click(); assert.equal(app.elements.requests.textContent, '0');
});
test('VM UI: before blocks revised retry; switching after explicitly confirms the revised private draft', () => {
  const app = ui(); app.elements.before.click(); app.input('초기 요청'); app.save('rejected'); app.input('수정 입력'); app.save('success');
  assert.equal(app.elements.requests.textContent, '1'); assert.equal(app.elements.commits.textContent, '0');
  app.elements.after.click(); app.save('success'); assert.equal(app.elements.requests.textContent, '2'); assert.equal(app.elements.commits.textContent, '1');
  assert.equal(app.elements['ack-text'].textContent, '수정 입력'); assert.equal(app.store.map.get('protected-flow-key'), 'unchanged-sentinel');
});
test('VM UI: unknown ACK keeps exact request and later input; resolving never auto-saves a successor', () => {
  const app = ui(); app.input('불명 요청 본문'); app.save('unknown-after'); app.input('그 뒤 입력'); app.save('success');
  assert.equal(app.elements.requests.textContent, '1'); assert.equal(app.elements['pending-text'].textContent, '불명 요청 본문');
  app.elements.resolve.click(); assert.equal(app.elements.requests.textContent, '1'); assert.equal(app.elements.commits.textContent, '1');
  assert.equal(app.elements['ack-text'].textContent, '불명 요청 본문'); assert.equal(app.elements['draft-text'].value, '그 뒤 입력');
});
test('VM UI: repeated receipt unknown remains unresolved across dedicated-key re-entry', () => {
  const app = ui(); app.input('대기 입력'); app.save('unknown-before'); app.elements.receipt.value = 'unresolved'; app.elements.resolve.click(); app.elements.reopen.click();
  assert.equal(app.elements.requests.textContent, '1'); assert.equal(app.elements.checks.textContent, '1'); assert.equal(app.elements.commits.textContent, '0');
  assert(app.elements['pending-id'].textContent.includes('lab-request-1')); assert.equal(app.elements['draft-text'].value, '대기 입력');
});
test('VM UI: no-change and preparation error produce zero additional key writes', () => {
  const app = ui(); app.save('success'); assert.equal(app.store.writes.length, 0);
  app.input('준비 오류 입력'); const writes = app.store.writes.length; app.save('error');
  assert.equal(app.store.writes.length, writes); assert.equal(app.elements.requests.textContent, '0'); assert.equal(app.elements['draft-text'].value, '준비 오류 입력');
});
test('VM UI: local-file storage denial shows memory-only status and preserves input on in-window re-entry', () => {
  const app = ui({ denied: true }); assert(app.elements['storage-note'].textContent.includes('메모리'));
  app.input('메모리 초안'); app.save('success'); app.elements.reopen.click(); assert.equal(app.elements['ack-text'].textContent, '메모리 초안'); assert.equal(app.store.writes.length, 0);
});
test('VM UI: allowed 2000-control text stays readable and unlocked after save and reopen', () => {
  const app = ui(), inputText = '\u0001\u0002'.repeat(1000);
  app.input(inputText); app.save('success');
  assert.equal(app.elements['locked-note'].hidden, true); assert.equal(app.elements.commits.textContent, '1');
  const writes = app.store.writes.length; app.elements.reopen.click();
  assert.equal(app.elements['locked-note'].hidden, true);
  assert.equal(app.elements['draft-text'].disabled, false); assert.equal(app.elements.prepare.disabled, false);
  assert.equal(app.elements['draft-text'].value, inputText); assert.equal(app.elements['ack-text'].textContent, inputText);
  assert.equal(app.elements.requests.textContent, '1'); assert.equal(app.elements.commits.textContent, '1');
  assert.equal(app.store.writes.length, writes); assert.equal(app.store.map.get('protected-flow-key'), 'unchanged-sentinel');
  assert(app.store.reads.every(key => key === app.key)); assert(app.store.writes.every(([key]) => key === app.key));
});
test('VM UI: corrupt payload disables all mutation controls and performs zero key writes', () => {
  const store = storage('{broken'), app = ui({ storage: store });
  for (const id of ['draft-text','prepare','confirm','cancel','resolve','reopen']) assert.equal(app.elements[id].disabled, true);
  app.elements.prepare.click(); app.elements.confirm.click(); assert.equal(store.writes.length, 0); assert.equal(store.map.get(app.key), '{broken'); assert.equal(app.elements['locked-note'].hidden, false);
});
