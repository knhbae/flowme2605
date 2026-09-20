const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const M = require('./model.js');
const C = require('./workspace-checkpoint.js');
const P = require('./personal-plan-context.js');
const PD = require('./personal-plan-display.js');
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function actualFunction(name) {
  const start = app.indexOf('  function ' + name + '(');
  const end = app.indexOf('\n  function ', start + 1);
  assert.ok(start >= 0 && end > start, name);
  return app.slice(start, end);
}
function fixture(time) {
  const raw = '# 시간 보존\r\n- [ ] 접수\r\n  - 날짜: 2026-09-05' + (time ? '\r\n  - 시간: ' + time : '');
  const handoff = M.makeHandoff(raw, { draftId: 'time-presenter', handoffId: 'time-presenter-copy', sourceConfirmed: true, folderId: null });
  const committed = M.apply(M.seedState(), { type: 'commit-authoring', handoff, now: '2026-09-05T00:00:00.000Z' });
  assert.equal(committed.changed, true);
  const flow = committed.state.flows.find(entry => entry.handoffId === 'time-presenter-copy');
  const projection = M.resultProjection(committed.state, flow.id, { baseDate: '2026-09-05', selectedDate: '2026-09-05' });
  assert.ok(projection);
  return { state: committed.state, flow, projection, raw };
}
function presenter(values) {
  const sandbox = { escapeHtml, ...values };
  for (const name of ['window', 'document', 'localStorage', 'fetch']) Object.defineProperty(sandbox, name, { get() { throw new Error('Read-only presenter used ' + name); } });
  vm.createContext(sandbox);
  if (values.state) {
    // The new display dependency consumes the real checkpoint/PD reader. The
    // fixture explicitly has no source candidate; no success flag bypasses it.
    const checkpoint = C.fromLegacy(JSON.stringify({ version: 1, state: values.state(), undo: null }));
    assert.equal(checkpoint.ok, true, checkpoint.reason);
    const display = PD.projectPersonalPlanDisplay({ checkpoint: checkpoint.checkpoint,
      sourceRead: { ok: true, raw: null }, sourceEpoch: 0 });
    assert.equal(display.ok, true, display.reason);
    assert.equal(display.mode, 'legacy-display');
    Object.assign(sandbox, { M, P, PD, envelope: checkpoint.checkpoint,
      workspaceEpoch: 0, personalDisplayCache: null, sourceCandidateStoreStatus: 'empty',
      sourceCandidateRaw: null, personalPlanSourceEpoch: 0 });
    for (const name of ['sourcePacketFromLoaded', 'personalDisplayPacket', 'personalExecutionOnly',
      'personalStructurePacket', 'personalResultProjection', 'personalItemSection']) {
      vm.runInContext(actualFunction(name), sandbox);
    }
    assert.equal(sandbox.personalDisplayPacket().mode, 'legacy-display');
  }
  return sandbox;
}
for (const time of ['09:30', '11:45']) {
  test('B0-T standalone Todo/Calendar summary retains existing typed time ' + time, () => {
    const data = fixture(time); const before = JSON.stringify(data);
    const sandbox = presenter({});
    vm.runInContext(actualFunction('resultItemSummary'), sandbox);
    assert.equal(data.projection.items[0].time, time);
    assert.ok(sandbox.resultItemSummary(data.projection.items[0]).includes(time));
    assert.equal(JSON.stringify(data), before);
  });
}

test('B0-T standalone untimed result summary does not invent a time from source date or title', () => {
  const data = fixture(''); const sandbox = presenter({});
  vm.runInContext(actualFunction('resultItemSummary'), sandbox);
  assert.doesNotMatch(sandbox.resultItemSummary({ ...data.projection.items[0], title: '09:30에 확인?' }), /09:30|시간 undefined|시간 null/);
});

test('B0-T standalone Sheet shows the existing typed time without changing CSV or source projection', () => {
  const data = fixture('09:30'); const before = JSON.stringify(data);
  const sandbox = presenter({ M, state: () => data.state, resultProjectionOptions: () => ({ baseDate: '2026-09-05', selectedDate: '2026-09-05' }), resultView: 'sheet', resultOccurrencePage: 1 });
  vm.runInContext(actualFunction('renderResultPanel'), sandbox);
  assert.equal(data.projection.sheet[0].time, '09:30');
  const html = sandbox.renderResultPanel(data.flow);
  assert.match(html, /<th>시간<\/th>/);
  assert.match(html, /<td>09:30<\/td>/);
  assert.equal(JSON.stringify(data), before);
});

for (const time of ['09:30', '']) {
  test('B0-T standalone Item detail displays only its existing execution time: ' + (time || 'untimed'), () => {
    const data = fixture(time); const before = JSON.stringify(data);
    const task = data.state.tasks.find(entry => entry.flowId === data.flow.id);
    const sandbox = presenter({ state: () => data.state, flowById: () => data.flow, screen: { view: 'today' }, itemReturn: null,
      contextLabel: () => '오늘', sourceTitle: entry => entry.sourceTitle || entry.title,
      flowDisplayTitle: entry => entry.title, folderTitle: () => '미분류', dateLabel: value => value || '날짜 미정',
      renderItemSourceDetails: () => '', moveTarget: null });
    vm.runInContext(actualFunction('renderItemDetail'), sandbox);
    const html = sandbox.renderItemDetail(task);
    if (time) assert.match(html, /<span>실행 시간<\/span><strong>09:30<\/strong>/);
    else assert.doesNotMatch(html, /실행 시간/);
    assert.equal(JSON.stringify(data), before);
  });
}
