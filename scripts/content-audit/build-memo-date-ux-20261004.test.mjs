import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = readFileSync(path.join(root, 'docs/content-audit/2026-10-04-flowme-memo-date-ux-ko.html'), 'utf8');
const source = file => readFileSync(path.join(root, file), 'utf8');
const script = id => {
  const result = new RegExp(`<script id="${id}">([\\s\\S]*?)<\\/script>`).exec(html);
  assert(result, `Missing script ${id}`);
  return result[1];
};
const context = vm.createContext({ Date, Math, JSON, Map, Set });
for (const id of ['engine-model', 'engine-input', 'lab-model']) vm.runInContext(script(id), context);
const M = context.MemoDateModel;
const newLab = () => context.createMemoDateLab(M, context.MemoDateInputPlans);
const plain = value => JSON.parse(JSON.stringify(value));
const differentSectionTarget = lab => lab.moveChoices().find(target => {
  const result = lab.previewMove(target.targetKey);
  return result.pending && lab.dateSource(result.pending.after).sectionDate !== lab.dateSource().sectionDate;
});

test('single file embeds exact current CJS source and executable UI syntax', () => {
  for (const [id, marker, file] of [['engine-model', 'VENDOR_MODEL', 'lib/flow/integrated-poc/vendor/text-model.cjs'], ['engine-input', 'INPUT_PLAN', 'lib/flow/integrated-poc/text-input-plan.cjs']]) {
    const embedded = new RegExp(`/\\* ${marker}_START \\*/\\r?\\n([\\s\\S]*?)\\r?\\n/\\* ${marker}_END \\*/`).exec(script(id));
    assert(embedded);
    assert.equal(embedded[1].replace(/<\\\/script/gi, '</script'), source(file));
  }
  new vm.Script(script('lab-ui'));
  assert(!/<(?:script|link|img)[^>]+(?:src|href)=/i.test(html));
  assert(!/\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB)\b/.test(script('lab-ui')));
  assert(!/innerHTML|insertAdjacentHTML/.test(script('lab-ui')));
  assert(html.includes("connect-src 'none'"));
  assert(html.includes('min-height:44px'));
});
test('initial fixture shows three distinct Items, two-line memo, time and history', () => {
  const lab = newLab();
  assert(M.validate(lab.state));
  assert.equal(lab.tasks().length, 3);
  assert.equal(lab.item().note, '목차부터 읽어 보기\n빠진 근거 표시하기');
  assert.equal(lab.item().time, '09:00');
  assert.equal(M.progressHistory(lab.state, lab.selectedId).length, 2);
  assert.equal(lab.count().notes, 1);
});
test('memo end Enter uses actual plan and applies to the same Item note', () => {
  const lab = newLab(), raw = lab.raw(), marker = '  - 메모: 빠진 근거 표시하기';
  const end = raw.indexOf(marker) + marker.length;
  const plan = lab.memoEnter(raw, end, end);
  assert(plan);
  assert.equal(plan.text, '\n  - 메모: ');
  const input = plan.nextRaw.slice(0, plan.selectionAfter.start) + '추가한 문장' + plan.nextRaw.slice(plan.selectionAfter.end);
  const id = lab.selectedId, history = plain(lab.state.progressRecords);
  assert(lab.previewRaw(input).changed);assert(lab.apply());
  assert.equal(lab.item().id, id);assert.equal(lab.tasks().length, 3);
  assert.equal(lab.item().note, '목차부터 읽어 보기\n빠진 근거 표시하기\n추가한 문장');
  assert.deepEqual(plain(lab.state.progressRecords), history);
});
test('ordinary sentence and blank line do not create an Item or attach a memo property', () => {
  const lab = newLab(), input = lab.raw() + '\n\n별도 문서 메모';
  const note = lab.item().note;
  assert(lab.previewRaw(input).changed);assert(lab.apply());
  assert.equal(lab.tasks().length, 3);assert.equal(lab.item().note, note);assert.equal(lab.count().notes, 2);
  assert.equal(lab.memoEnter(input, input.length, input.length), null);
});
test('current structural move changes the source section but preserves complete Item meaning', () => {
  const lab = newLab(), before = plain(lab.item()), history = plain(lab.state.progressRecords);
  const target = differentSectionTarget(lab);assert(target);
  assert(lab.previewMove(target.targetKey).changed);assert(lab.apply());
  assert.notEqual(lab.item().groupDate, before.groupDate);
  for (const key of ['id', 'date', 'note', 'time', 'done', 'scopeId']) assert.equal(lab.item()[key], before[key]);
  assert.deepEqual(plain(lab.state.progressRecords), history);
});
test('individual date and undated time remain intact during source movement', () => {
  for (const id of ['md-task-b', 'md-task-c']) {
    const lab = newLab();lab.select(id);const before = plain(lab.item());const target = differentSectionTarget(lab);assert(target);
    assert(lab.previewMove(target.targetKey).changed);assert(lab.apply());
    assert.equal(lab.item().date, before.date);assert.equal(lab.item().time, before.time);assert.equal(lab.item().id, id);
  }
});
test('follow result is available only as a proposed comparison and uses existing restore', () => {
  const lab = newLab();lab.select('md-task-b');const before = plain(lab.state);
  assert(lab.previewFollow().error);assert.deepEqual(plain(lab.state), before);
  lab.mode = 'proposed';assert(lab.previewFollow().changed);assert(lab.apply());
  assert.equal(lab.item().date, '2026-10-04');assert.equal(lab.item().explicitDate, false);assert.equal(lab.item().id, 'md-task-b');
  assert.deepEqual(plain(lab.state.progressRecords), before.progressRecords);
});
test('date update changes execution date while retaining source position and time', () => {
  const lab = newLab();lab.select('md-task-c');const before = plain(lab.item());
  assert(lab.previewDate('2026-10-10').changed);assert(lab.apply());
  assert.equal(lab.item().date, '2026-10-10');assert.equal(lab.item().sourceIndex, before.sourceIndex);assert.equal(lab.item().time, '14:30');
  assert.equal(lab.item().groupDate, before.groupDate);assert.equal(lab.item().id, before.id);
});
test('cancel leaves original state byte-equivalent and snapshot Undo restores all fields', () => {
  const lab = newLab(), before = JSON.stringify(lab.state);
  assert(lab.previewDate('2026-10-10').changed);lab.cancel();assert.equal(JSON.stringify(lab.state), before);assert(!lab.canUndo);
  assert(lab.previewDate('2026-10-10').changed);assert(lab.apply());assert(lab.canUndo);assert(lab.undo());
  assert.equal(JSON.stringify(lab.state), before);assert.equal(lab.selectedId, 'md-task-a');
});
test('rejected ambiguous title replacement preserves raw input and committed snapshot', () => {
  const lab = newLab(), before = JSON.stringify(lab.state);
  const input = '[2026-10-04]\n- [ ] 전혀 다른 첫 제목\n- [ ] 전혀 다른 둘째 제목\n[2026-10-06]\n일반 문장';
  const result = lab.previewRaw(input);
  assert(result.error);assert.equal(result.input, input);assert.equal(JSON.stringify(lab.state), before);assert(!lab.pending);
});
test('invalid date, same date, wrong move and Undo without history do not mutate state', () => {
  const lab = newLab(), before = JSON.stringify(lab.state);
  assert(lab.previewDate('2026-02-30').error);assert.equal(lab.previewDate(lab.item().date).changed, false);
  assert(lab.previewMove('missing').error);assert.equal(lab.undo(), false);assert.equal(JSON.stringify(lab.state), before);
});
test('source markup is literal data; reset discards only the temporary fixture state', () => {
  const lab = newLab(), input = lab.raw() + '\n</script><img src="example.invalid" onerror="alert(1)">';
  assert(lab.previewRaw(input).changed);assert(lab.apply());assert(lab.raw().includes('</script><img'));
  assert.equal(lab.tasks().length, 3);lab.reset();assert.equal(lab.tasks().length, 3);assert(!lab.raw().includes('</script>'));
});
test('actual UI selection handlers guard dirty input before changing owner or opening a preview', () => {
  const ui = script('lab-ui');
  const handlers = [
    ["byId('item-select')", 'change'], ["byId('case-move')", 'click'],
    ["byId('case-exception')", 'click'], ["byId('case-undated')", 'click'],
    ['source', 'click'], ['change', 'click'],
  ];
  for (const [target, eventName] of handlers) {
    const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const body = new RegExp(`${escaped}\\.addEventListener\\('${eventName}',(?:event|\\(\\))=>\\{([\\s\\S]*?)\\}\\);`).exec(ui)?.[1];
    assert(body, `Missing event handler ${target}`);
    assert(body.indexOf('dirtyGuard()') < body.indexOf('lab.select('), `${target} changes owner before its guard`);
    const lab = newLab(), before = JSON.stringify(lab.state), selectedId = lab.selectedId;
    const event = { target: { value: 'md-task-c' }, currentTarget: {} };
    const forbidden = () => assert.fail(`${target} continued after rejected dirty input`);
    const invoke = vm.runInNewContext(`(event)=>{${body}}`, {lab,dirtyGuard:()=>false,renderResult:forbidden,openPreview:forbidden,showView:forbidden,focusLine:forbidden,task:{id:'md-task-c',sourceIndex:9},change:{}});
    invoke(event);
    assert.equal(lab.selectedId, selectedId);assert.equal(JSON.stringify(lab.state), before);
    if (target === "byId('item-select')") assert.equal(event.target.value, selectedId);
  }
  assert(ui.includes('if(lab.pending)return;lab.mode=mode;render();'));
});
test('proposed result provenance survives mode changes and restores with snapshot Undo or reset', () => {
  const lab = newLab();lab.select('md-task-b');lab.mode='proposed';
  assert.equal(lab.hasProposedResult,false);assert(lab.previewFollow().changed);lab.cancel();assert.equal(lab.hasProposedResult,false);
  assert(lab.previewFollow().changed);assert(lab.apply());assert.equal(lab.hasProposedResult,true);
  lab.mode='current';assert.equal(lab.hasProposedResult,true);
  assert(lab.previewDate('2026-10-10').changed);assert(lab.apply());assert(lab.undo());assert.equal(lab.hasProposedResult,true);
  assert(lab.undo());assert.equal(lab.hasProposedResult,false);assert.equal(lab.item().date,'2026-10-07');
  lab.mode='proposed';assert(lab.previewFollow().changed);assert(lab.apply());lab.reset();assert.equal(lab.hasProposedResult,false);
  assert(!Object.prototype.hasOwnProperty.call(lab.state,'hasProposedResult'));
  assert(script('lab-ui').includes('lab.hasProposedResult?\'현재 모델로 조작합니다. 앞서 적용한 비교안 결과는 임시 상태에 남아 있습니다.'));
});
