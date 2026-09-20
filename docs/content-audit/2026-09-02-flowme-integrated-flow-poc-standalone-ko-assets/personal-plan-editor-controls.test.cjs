'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const modulePath = path.join(__dirname, 'personal-plan-editor-controls.js');
const U = fs.existsSync(modulePath) ? require(modulePath) : {};

test('UIC01 source-owned title has explicit inherited mode and no editable text field until selected', () => {
  const html = U.renderTextControl({ scope: 'plan', field: 'flow-title', draft: { mode: 'inherit' }, baseline: { owner: 'source', present: true, value: '원래 제목' } });
  assert.match(html, /data-plan-mode="flow-title"/); assert.match(html, /원본 따르기/);
  assert.match(html, /원래 제목/); assert.doesNotMatch(html, /<input/);
});
test('UIC02 existing-personal title does not manufacture a restore-to-source label', () => {
  const html = U.renderTextControl({ scope: 'item', field: 'title', draft: { mode: 'inherit' }, baseline: { owner: 'existing-personal-baseline', present: true, value: '내 제목' } });
  assert.match(html, /기존 제목 유지/); assert.doesNotMatch(html, /원본 따르기|원문 복원/);
});
test('UIC03 absent, explicit empty and whitespace-only inherited personal memo have distinct output', () => {
  const render = baseline => U.renderTextControl({ scope: 'item', field: 'memo', draft: { mode: 'inherit' }, baseline: { owner: 'existing-personal-baseline', ...baseline } });
  assert.match(render({ present: false }), /개인 메모 없음/);
  assert.match(render({ present: true, value: '' }), /빈 메모/);
  const raw = '  \r\n\t ';
  assert.ok(render({ present: true, value: raw }).includes(raw));
  assert.doesNotMatch(render({ present: true, value: raw }), /빈 메모|개인 메모 없음/);
});
test('UIC04 explicit text and attribute content is escaped, and empty title stays invalid without trimming the draft', () => {
  const draft = { mode: 'override', value: '  <img src=x onerror="bad">\r\n  ' }, before = JSON.stringify(draft);
  const html = U.renderTextControl({ scope: 'plan', field: 'flow-title', draft, baseline: { owner: 'source', present: true, value: '원본' } });
  assert.doesNotMatch(html, /<img/); assert.match(html, /&lt;img/); assert.match(html, /&quot;bad&quot;/);
  assert.equal(JSON.stringify(draft), before);
  const invalid = U.renderTextControl({ scope: 'item', field: 'title', draft: { mode: 'override', value: '' }, baseline: { owner: 'source', present: true, value: '원본' } });
  assert.match(invalid, /aria-invalid="true"/); assert.match(invalid, /제목을 입력/); assert.match(invalid, /value=""/);
});
test('UIC05 memo override renders exact empty/CRLF safely and does not copy source description', () => {
  for (const value of ['', '  개인\r\n메모\t ', '</textarea><script>bad</script>']) {
    const html = U.renderTextControl({ scope: 'item', field: 'memo', draft: { mode: 'override', value }, baseline: { owner: 'existing-personal-baseline', present: false } });
    assert.match(html, /<textarea/); assert.doesNotMatch(html, /<script>|aria-invalid="true"/);
    if (!value.includes('<')) assert.ok(html.includes('>' + value + '</textarea>'));
  }
});
test('UIC06 date mode shows inherited owner, explicit fixed invalid input, and intentional unscheduled separately', () => {
  const inherited = U.renderScheduleControl({ draft: { mode: 'inherit' }, baseline: { owner: 'existing-personal-baseline', date: '2026-09-08' } });
  assert.match(inherited, /기존 계획 유지/); assert.match(inherited, /2026-09-08/); assert.doesNotMatch(inherited, /type="date"/);
  const fixed = U.renderScheduleControl({ draft: { mode: 'fixed_date', date: '' }, baseline: { owner: 'source', date: null } });
  assert.match(fixed, /type="date"/); assert.match(fixed, /aria-invalid="true"/); assert.match(fixed, /날짜를 선택/);
  const none = U.renderScheduleControl({ draft: { mode: 'unscheduled' }, baseline: { owner: 'source', date: '2026-09-08' } });
  assert.match(none, /날짜를 정하지 않습니다/); assert.doesNotMatch(none, /type="date"/);
});
test('UIC07 text mode transition matches original React behavior and preserves exact blank/CRLF intent', () => {
  assert.deepEqual(U.changeTextMode({ mode: 'inherit' }, 'override', '  기준\r\n'), { mode: 'override', value: '  기준\r\n' });
  assert.deepEqual(U.changeTextMode({ mode: 'override', value: '' }, 'override', '기준'), { mode: 'override', value: '' });
  assert.deepEqual(U.changeTextMode({ mode: 'override', value: '개인' }, 'inherit', '기준'), { mode: 'inherit' });
});
test('UIC08 entering fixed date never infers today or inherited date; same fixed pin stays explicit', () => {
  assert.deepEqual(U.changeScheduleMode({ mode: 'inherit' }, 'fixed_date'), { mode: 'fixed_date', date: '' });
  assert.deepEqual(U.changeScheduleMode({ mode: 'fixed_date', date: '2026-09-08' }, 'fixed_date'), { mode: 'fixed_date', date: '2026-09-08' });
  assert.deepEqual(U.changeScheduleMode({ mode: 'fixed_date', date: '' }, 'unscheduled'), { mode: 'unscheduled' });
  assert.deepEqual(U.changeScheduleMode({ mode: 'unscheduled' }, 'inherit'), { mode: 'inherit' });
});
test('UIC09 malformed or foreign modes cannot silently fall back to inherit', () => {
  assert.equal(typeof U.changeTextMode, 'function'); assert.equal(typeof U.renderScheduleControl, 'function');
  assert.throws(() => U.changeTextMode({ mode: 'inherit' }, 'unknown', 'x'));
  assert.throws(() => U.changeScheduleMode({ mode: 'inherit' }, 'unknown'));
  assert.throws(() => U.renderTextControl({ scope: 'foreign', field: 'title', draft: { mode: 'inherit' }, baseline: { present: true, value: 'x' } }));
  assert.throws(() => U.renderScheduleControl({ draft: { mode: 'fixed_date', date: null }, baseline: { owner: 'source', date: null } }));
});
test('UIC10 labels, values and errors are associated with unique fixed IDs for Plan and Item controls', () => {
  const plan = U.renderTextControl({ scope: 'plan', field: 'flow-title', draft: { mode: 'override', value: '' }, baseline: { owner: 'source', present: true, value: 'x' } });
  const item = U.renderTextControl({ scope: 'item', field: 'title', draft: { mode: 'override', value: '' }, baseline: { owner: 'source', present: true, value: 'x' } });
  assert.match(plan, /for="plan-flow-title-mode"/); assert.match(plan, /id="plan-flow-title-mode"/);
  assert.match(plan, /aria-describedby="plan-flow-title-error"/); assert.match(plan, /id="plan-flow-title-error"/);
  assert.match(item, /aria-describedby="item-title-error"/); assert.doesNotMatch(item, /id="plan-flow-title/);
});
test('UIC11 inherited value presentation never exposes internal refs or an authority marker', () => {
  const html = U.renderTextControl({ scope: 'item', field: 'memo', draft: { mode: 'inherit' }, baseline: { owner: 'existing-personal-baseline', present: true, value: '메모' } });
  assert.doesNotMatch(html, /sourceReady|trusted|sourceEpoch|saved-flow:|flow:poc:/);
});
test('UIC12 actual UMD presenter and mode changes perform no ambient I/O', () => {
  let accesses = 0; const sandbox = {};
  for (const key of ['localStorage', 'document', 'window', 'fetch']) Object.defineProperty(sandbox, key, { get() { accesses++; throw new Error(key); } });
  vm.runInContext(fs.readFileSync(modulePath, 'utf8'), vm.createContext(sandbox));
  const result = sandbox.FlowPocPersonalPlanEditorControls.changeScheduleMode({ mode: 'inherit' }, 'fixed_date');
  assert.equal(JSON.stringify(result), '{"mode":"fixed_date","date":""}'); assert.equal(accesses, 0);
});
