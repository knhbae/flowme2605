'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const ts = require('typescript');
const M = require('./model.js');
const C = require('./workspace-checkpoint.js');
const P = require('./personal-plan-context.js');
const PD = require('./personal-plan-display.js');
const Rank = require('./timeline-result-rank.js');
const repoRoot = path.resolve(__dirname, '../../..');
const beforeFile = path.join(repoRoot, 'output/poc-gap-implementation/k3c/before-standalone-entry-20260906-01/app.js');
const currentFile = path.join(__dirname, 'app.js');
const beforeSource = fs.readFileSync(beforeFile, 'utf8'), currentSource = fs.readFileSync(currentFile, 'utf8');
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
const bytes = value => JSON.stringify(value);
const VIEWS = ['txt', 'todo', 'calendar', 'sheet'];
const NAMES = ['escapeHtml', 'sourcePacketFromLoaded', 'personalDisplayPacket', 'personalExecutionOnly',
  'personalStructurePacket', 'personalResultProjection', 'state', 'resultProjectionOptions', 'resultItemIdentityAttributes',
  'resultItemSummary', 'renderOccurrenceFacts', 'renderStaticResultItem', 'renderResultItem', 'renderResultCalendar', 'renderResultPanel'];
function actualFunctions(source, extra = []) {
  const file = ts.createSourceFile('actual-app.js', source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  assert.equal(file.parseDiagnostics.length, 0, 'actual app parses before extraction');
  const names = [...NAMES, ...extra], found = new Map();
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name && names.includes(node.name.text)) {
      assert.equal(found.has(node.name.text), false, 'unambiguous actual declaration ' + node.name.text);
      found.set(node.name.text, node.getText(file));
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  for (const name of names) assert.equal(found.has(name), true, 'actual declaration exists: ' + name);
  return names.map(name => found.get(name)).join('\n');
}
const beforeFunctions = actualFunctions(beforeSource), currentFunctions = actualFunctions(currentSource, ['renderPersonalEntryResult']);
assert.equal(sha(beforeSource).toUpperCase(), 'DF4E08A960A97D59926F7E17B195B1B65A376BC96186AE54E6D9E6B4C0869CF7');
test.after(() => {
  const afterSource = fs.readFileSync(currentFile, 'utf8');
  assert.equal(sha(actualFunctions(afterSource, ['renderPersonalEntryResult'])), sha(currentFunctions), 'audited result function bodies stay exact during this run');
  console.log('ENTRY_RESULT_VM_BOUNDARY ' + bytes({ beforeAppSha: sha(beforeSource), currentAppStartSha: sha(currentSource),
    currentAppEndSha: sha(afterSource), wholeAppFrozen: false, currentResultFunctionsSha: sha(currentFunctions),
    functionBodiesExact: true, scope: 'actual AST-extracted app functions + genuine C/PD/M; VM HTML output, not mounted/browser/device' }));
});
function fixture(kind = 'seed') {
  const state = M.seedState(), task = state.tasks.find(task => task.id === 'quote');
  if (kind === 'time' || kind === 'recurrence' || kind === 'escape') {
    task.time = '09:30'; task.date = task.sourceDate = '2026-09-05';
  }
  if (kind === 'recurrence') task.sourceProperties = { '반복': '매일', '반복 종료': '3회', '장소': '실제 fixture 장소', '설명': '원문 설명' };
  if (kind === 'escape') { task.title = '<script>unsafe()</script> & "제목"'; task.sourceProperties = { '설명': '<img src=x onerror=unsafe()>' }; }
  assert.deepEqual(M.validate(state), []);
  const converted = C.fromLegacy(bytes({ version: 1, state, undo: null })); assert.equal(converted.ok, true, converted.reason);
  return { state, checkpoint: converted.checkpoint, flow: state.flows.find(flow => flow.id === 'moving') };
}
function harness(f, original = false) {
  let ambient = 0;
  const context = vm.createContext({ M, C, P, PD, envelope: f.checkpoint, workspaceEpoch: 0, personalPlanSourceEpoch: 0,
    personalDisplayCache: null, sourceCandidateRaw: null, sourceCandidateStoreStatus: 'empty', resultRankCheckpoint: null,
    resultRankReader: null, resultCalendarBaseDate: '2026-09-05', resultCalendarSelectedDate: '2026-09-05',
    resultOccurrencePage: 1, resultView: 'txt' });
  for (const key of ['document', 'localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest']) {
    Object.defineProperty(context, key, { get() { ambient += 1; throw new Error('presenter must not access ' + key); } });
  }
  context.window = new Proxy(Object.freeze({ FlowPocTimelineResultRank: Rank }), { get(target, key) {
    if (key === 'FlowPocTimelineResultRank') return target[key]; ambient += 1; throw new Error('presenter ambient window ' + String(key));
  } });
  vm.runInContext(original ? beforeFunctions : currentFunctions, context);
  assert.equal(context.personalDisplayPacket().mode, 'legacy-display', 'actual PD confirms absence, not a fake permission flag');
  const projection = context.personalResultProjection(f.flow.id); assert.ok(projection);
  return { context, projection, ambient: () => ambient,
    default(view) { context.resultView = view; return context.renderResultPanel(f.flow); },
    readOnly(view) { return context.renderResultPanel(f.flow, { readOnly: true, projection, view, page: 1 }); } };
}
function decode(value) { return value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); }
function attr(html, name) {
  const match = html.match(new RegExp('(?:^|\\s)' + name + '="([^"]*)"'));
  return match ? decode(match[1]) : undefined;
}
function headers(html) { return [...html.matchAll(/<th>([^<]*)<\/th>/g)].map(match => decode(match[1])); }
function rows(html) {
  const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/); assert.ok(body);
  return [...body[1].matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/g)].map(match => ({ attributes: match[1],
    cells: [...match[2].matchAll(/<td>([\s\S]*?)<\/td>/g)].map(cell => decode(cell[1])) }));
}

test('EPR01 existing no-prop result preserves DF4E08 except the three approved C3 presentation changes across four views and three fixtures', () => {
  function approvedC3Presentation(markup, flowId) {
    const changes = [
      ['<h2>원본 Item과 실행 회차, 네 결과</h2><p>TXT, 할 일, 캘린더, 표가 같은 회차 식별자·순서·날짜·완료 상태를 사용합니다.</p>', '<h2>다른 방식으로 보기</h2>'],
      ['<button class="button" type="button" data-action="open-plan-editor" data-id="' + flowId + '">Plan 편집</button>', ''],
      ['<summary>WorkingSource 확인</summary><p>결과 TXT와 분리된 읽기 전용 원문입니다. 저장한 개인 shadow 변경은 이 원문에 역반영되지 않습니다.</p>', '<summary>원문 보기</summary><p>개인 편집은 원문을 바꾸지 않아요.</p>'],
    ];
    for (const [before, after] of changes) {
      assert.equal(markup.split(before).length, 2, 'one exact approved presentation site');
      markup = markup.replace(before, after);
    }
    return markup;
  }
  for (const kind of ['seed', 'time', 'recurrence']) {
    const f = fixture(kind), before = bytes(f), original = harness(f, true), current = harness(f);
    for (const view of VIEWS) assert.equal(current.default(view), approvedC3Presentation(original.default(view), f.flow.id), kind + '/' + view);
    assert.equal(bytes(f), before); assert.equal(original.ambient(), 0); assert.equal(current.ambient(), 0);
  }
});
test('EPR02 new readonly four views expose only local read actions with no writer/export controls or ambient effects', () => {
  const f = fixture('recurrence'), before = bytes(f), runtime = harness(f), projectionBefore = bytes(runtime.projection);
  const allowed = ['entry-tab', 'entry-open-item', 'entry-calendar-shift', 'entry-calendar-select', 'entry-more-occurrences'];
  for (const view of VIEWS) {
    const html = runtime.readOnly(view); assert.equal(attr(html, 'data-read-only'), 'true');
    const actions = [...html.matchAll(/data-action="([^"]*)"/g)].map(match => match[1]);
    assert.ok(actions.length > 0); assert.ok(actions.every(action => allowed.includes(action)), bytes(actions));
    assert.doesNotMatch(html, /data-action="(?:open-plan-editor|result-open-item|move-result-occurrence-date|toggle-result-occurrence-complete|copy-result-txt|download-result-txt|download-result-csv)"|<input|<form|onclick=/);
  }
  assert.equal(bytes(f), before); assert.equal(bytes(runtime.projection), projectionBefore); assert.equal(runtime.ambient(), 0);
});
test('EPR03 readonly Sheet retains all eight existing columns and actual typed time instead of dropping read-only fields', () => {
  const runtime = harness(fixture('time')), html = runtime.readOnly('sheet');
  assert.equal(runtime.projection.sheet[0].time, '09:30');
  assert.deepEqual(headers(runtime.default('sheet')), ['순서', '회차', '구간', '할 일', '원 발생일', '실행 날짜', '시간', '상태']);
  assert.deepEqual(headers(html), headers(runtime.default('sheet')));
  assert.equal(rows(html)[0].cells[6], '09:30');
});
test('EPR04 readonly Sheet preserves each real recurrence index and occurrenceId, including the ordinary source row', () => {
  const runtime = harness(fixture('recurrence')), html = runtime.readOnly('sheet'), displayed = rows(html);
  assert.equal(runtime.projection.sheet.filter(row => row.occurrenceId).length, 3);
  assert.equal(displayed.length, runtime.projection.sheet.length);
  runtime.projection.sheet.forEach((row, index) => {
    assert.equal(attr(displayed[index].attributes, 'data-occurrence-id'), row.occurrenceId || '');
    assert.equal(displayed[index].cells[1], row.occurrenceIndex ? row.occurrenceIndex + '회차' : '—');
  });
});
test('EPR05 readonly four-view manifests equal existing result source/row/occurrence identities without rekeying', () => {
  const runtime = harness(fixture('recurrence'));
  for (const view of VIEWS) {
    const html = runtime.readOnly(view), ordinary = runtime.default(view);
    for (const key of ['data-flow-ref', 'data-result-item-refs', 'data-result-source-item-refs', 'data-result-row-ids', 'data-result-occurrence-ids']) {
      assert.equal(attr(html, key), attr(ordinary, key), view + ':' + key);
    }
  }
});
test('EPR06 readonly TXT/Todo/Calendar keep actual time and escaped values without changing projection/source bytes', () => {
  const f = fixture('escape'), before = bytes(f), runtime = harness(f), original = bytes(runtime.projection);
  for (const view of ['txt', 'todo', 'calendar']) {
    const html = runtime.readOnly(view);
    assert.match(html, /09:30/); assert.match(html, /&lt;script&gt;unsafe\(\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>|<img src=x/);
  }
  assert.equal(bytes(f), before); assert.equal(bytes(runtime.projection), original); assert.equal(runtime.ambient(), 0);
});
