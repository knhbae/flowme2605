'use strict';

// v11-only independent QA. No argument records an unexecuted plan.
// --run --final is reserved for the owner's runtime freeze notification.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const KEY = 'flowme:ux-review:text-workspace-v11:20260908';
const URL = process.env.FLOWME_V11_URL || 'http://127.0.0.1:8771/index.html';
const ONLY = (process.argv.find(arg => arg.startsWith('--only=')) || '').slice(7);
const RESULT = path.join(__dirname, ONLY ? 'browser-regression-results-'+ONLY.toLowerCase()+'.json' : 'browser-regression-results.json');
const IMAGE_DIR = path.resolve(__dirname, '../../../output/playwright/flowme-text-v11');
const SOURCES = ['app.js', 'model.js', 'editor.js', 'index.html', 'styles.css', 'editor.css'];
const HOLD_MS = 600; // Runtime contract: 450 ms; 8 px pre-threshold cancellation.
const PLAN = [
  ['R901', 'v11 격리 저장·기본 입력·재진입', 'keyboard', 'v11 키/version과 원문·줄 ID 보존'],
  ['R902', '마우스 상태칸 탭', 'mouse', '빠른 조절창 열기·완료/기록 0'],
  ['R903', '터치 상태칸 탭', 'cdp-touch', 'trusted touch 경로·빠른 조절창·완료/기록 0'],
  ['R904', 'Task 길게 누름과 실제 후손', 'cdp-touch', '체크/메모/시간 포함·다음 형제 제외·완료 0'],
  ['R905', '폴더·Flow 아이콘 길게 누름', 'cdp-touch', '같은 선택 규칙·원본과 완료 불변'],
  ['R906', '손을 떼어도 선택 유지·취소', 'cdp-touch', 'inline 위치 유지·취소·다른 뷰 진입 후 선택 정리'],
  ['R907', '마우스 드래그·삽입선·Undo/Redo', 'mouse', '놓을 때 원자적 이동 1회·ID/속성 보존'],
  ['R908', '터치 길게 누른 뒤 드래그', 'cdp-touch', 'pointer capture를 통한 실제 입력 경로·원자적 이동'],
  ['R909', '임계 전 스크롤', 'cdp-touch', '8px 초과 이동은 스크롤·선택/완료/이동 0'],
  ['R910', 'pointercancel', 'cdp-touch', 'touchCancel 이후 원문·완료·순서 불변'],
  ['R911', '편집기 밖에 놓기', 'cdp-touch', '삽입 위치 없는 drop은 이동/완료 0'],
  ['R912', '텍스트 영역 길게 누름', 'cdp-touch', '본문의 원문 보존·묶음 선택 가로채기 없음'],
  ['R913', '줄 메뉴·키보드·Escape', 'keyboard', '드래그 없이 진입·선택 취소·원문 보존'],
  ['R914', '이동 목적지 버튼과 키보드', 'keyboard', '가능한 대상만 제시·Enter 확정·한 번 Undo'],
  ['R915', '저장 실패에서 선택 차단·재시도', 'cdp-touch+keyboard', '미저장 입력 유지·선택 차단·재시도 후 복구'],
  ['R916', '두 탭 충돌에서 선택 차단', 'cdp-touch+keyboard', '현재 입력 보존·외부 저장 덮어쓰기 0'],
  ['R917', '참조 이동·reload·기간/원문', 'keyboard', 'ID·기존 날짜·owner·참조 원본·canonical 개수 유지'],
  ['R918', '390px·1194px 선택과 inline 위치', 'geometry', '폰트 로드·선택 범위·inline 위치 버튼·가로 넘침'],
  ['R919', '화면 밖 이동·Undo/Redo 포커스', 'keyboard', '38행 문서의 동일 Task ID 아이콘을 보이게 하고 포커스 복원']
,
  ['R920', '편집·텍스트 longpress 후 ⋮·이동 포커스', 'cdp-touch+keyboard', '현재 줄 조작 유지·명시 이동 시 textarea blur·원문 보존'],
  ['R921', '이동 중 실제 viewport 축소·복귀', 'keyboard', 'resize 모사에서 선택·inline 위치·원문 보존; 실제 키보드 미검증'],
  ['R922', 'visualViewport 높이·offset 모사', 'synthetic-viewport', '합성 viewport 이벤트와 CDP 터치·실기기 증거를 구분'],
  ['R923', '+ 추가 문법·관계와 실제 삽입', 'keyboard', '조작 항목 없음·같은 높이/하위 체크/메모 추가를 원문으로 확인'],
  ['R924', '⋮ 기존 줄 조작 전용', 'keyboard', '추가 항목 없음·날짜/메모/이동·취소 원문 보존'],
  ['R925', '폴더·Flow 원래 내용과 접기 분리', 'keyboard', '아이콘 탐색·접기 비탐색·원문과 소속 보존'],
  ['R926', '접기 원문·ID·기간·reload', 'keyboard', '보기 상태만 변경·canonical 개수와 원문 불변'],
  ['R927', '접힌 원문의 안전한 편집 전환', 'keyboard', '숨은 textarea 비편집·펼친 후 같은 sourceIndex에서 입력'],
  ['R928', '잘못된 입력·저장 실패·접기 복구', 'keyboard', '미반영 원문 보존·작업 차단·정확한 복구 후 저장 재개'],
  ['R929', '3 viewport·큰 글자·짧은 화면', 'layout', '390/1194/834·large-text CSS 모사·수평 넘침 및 도구 영역']
].map(([id, name, input, expectation]) => ({ id, name, input, expectation }));
const runners = new Map();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const raw = page => page.locator('.tle-textarea'); // Also inspect hidden source while folded.
const bar = page => page.locator('.tle-root.tle-has-move-selection'); // Selection state, not a toolbar.
const button = (page, name) => page.getByRole('button', { name, exact: true });
const hashSources = dir => Object.fromEntries(SOURCES.map(name => [name,
  crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, name))).digest('hex')]));
const optionalSourceHashes = dir => SOURCES.every(name => fs.existsSync(path.join(dir, name))) ? hashSources(dir) : null;
async function frames(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function saved(page) { await page.waitForFunction(() => document.querySelector('#save-status').textContent === '이 기기에 저장됨'); }
async function docId(page) { return page.evaluate(() => new URLSearchParams(location.hash.slice(1)).get('doc')); }
async function observed(page) {
  return page.evaluate(() => {
    const m = window.TextWorkspaceModel, state = m.read(localStorage).state;
    const id = new URLSearchParams(location.hash.slice(1)).get('doc'), doc = m.getDocument(state, id);
    return { state, id, raw: m.raw(doc), lines: doc.lines, rows: m.rowMeta(state, id), tasks: m.tasks(state) };
  });
}
function business(data) {
  return data.tasks.map(t => ({ id: t.id, docId: t.docId, title: t.title, date: t.date, done: t.done,
    note: t.note, time: t.time, scopeId: t.scopeId, subchecks: t.subchecks })).sort((a, b) => a.id.localeCompare(b.id));
}
async function moveSelection(page, lineId) {
  return page.evaluate(lineId => {
    const m = window.TextWorkspaceModel, s = m.read(localStorage).state, id = new URLSearchParams(location.hash.slice(1)).get('doc');
    return { selected: m.selectionForMove(s, id, lineId), targets: m.moveTargets(s, id, lineId) };
  }, lineId);
}
async function newDoc(page, title) {
  if (!await page.locator('#navigation [data-action="new-document"]').isVisible()) await button(page, '탐색').click();
  await button(page, '새 문서').click();
  await page.locator('#new-title').fill(title || '이동 검사 문서'); await page.locator('#new-folder').selectOption('folder-unfiled');
  await page.locator('#new-document-form button[type="submit"]').click(); await saved(page);
}
async function fixture(page, extra) {
  await newDoc(page); await raw(page).fill('[2026-09-07]\n- [ ] 그룹 A\n  - 메모: 원문 메모\n  - 시간: 10:00\n  - [ ] 하위 A\n- [ ] 그룹 B\n- [ ] 그룹 C' + (extra || ''));
  await saved(page); await page.locator('#document-title').click(); await frames(page); return observed(page);
}
async function caret(page, index) {
  await raw(page).evaluate((input, index) => {
    const lines = input.value.split('\n'), position = lines.slice(0, index + 1).join('\n').length;
    input.focus(); input.setSelectionRange(position, position); input.dispatchEvent(new Event('select', { bubbles: true }));
  }, index); await frames(page);
}
async function reveal(page, index) {
  await raw(page).evaluate((input, index) => {
    const row = document.querySelector('.tle-line[data-line-index="' + index + '"]');
    if (row) input.scrollTop = Math.max(0, row.offsetTop - 80);
  }, index);
  await page.locator('#document-title').click(); await frames(page);
}
async function handle(page, index, kind) {
  await reveal(page, index);
  return page.locator((kind === 'scope' ? '.tle-scope-open' : '.tle-check-hit') + '[data-line-index="' + index + '"]');
}
async function point(locator) {
  await locator.waitFor({ state: 'visible' }); const box = await locator.boundingBox(); assert(box);
  return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
}
async function touchDriver(context, page) {
  const session = await context.newCDPSession(page);
  const send = (type, p) => session.send('Input.dispatchTouchEvent', { type,
    touchPoints: p ? [{ x: p.x, y: p.y, id: 1, radiusX: 2, radiusY: 2, force: 1 }] : [] });
  return { start: p => send('touchStart', p), move: p => send('touchMove', p),
    end: () => send('touchEnd'), cancel: () => send('touchCancel'), detach: () => session.detach() };
}
async function longpress(page, touch, locator, release = true) {
  const p = await point(locator); await touch.start(p); await pause(HOLD_MS);
  await bar(page).waitFor({ state: 'visible' });
  if (release) { await touch.end(); await frames(page); }
  return p;
}
async function selectedIds(page, data) {
  const indexes = await page.locator('.tle-line.tle-move-selected').evaluateAll(rows => rows.map(r => Number(r.dataset.lineIndex)));
  return indexes.map(i => data.lines[i].id);
}
async function clearMove(page) {
  if (await bar(page).isVisible()) await page.keyboard.press('Escape');
  await frames(page);
}
async function choose(page, targetId) {
  const target = page.locator('.tle-move-target-button[data-move-target="' + (targetId === null ? '__end' : targetId) + '"]');
  await target.evaluate(e=>{const i=Number(e.dataset.lineIndex),rows=document.querySelectorAll('.tle-line'),row=rows[i],last=rows[rows.length-1],input=document.querySelector('.tle-textarea');input.scrollTop=Math.max(0,(row?row.offsetTop:last.offsetTop+last.offsetHeight)-80);});await frames(page);await target.scrollIntoViewIfNeeded();
  await target.focus(); await frames(page);const depth=await page.locator('.tle-move-selected').first().evaluate(e=>{const m=TextWorkspaceModel,s=m.read(localStorage).state,id=new URLSearchParams(location.hash.slice(1)).get('doc');return m.rowMeta(s,id)[Number(e.dataset.lineIndex)].depth;});for(let i=0;i<65&&Number(await target.getAttribute('data-depth'))!==depth;i++){await target.press(Number(await target.getAttribute('data-depth'))>depth?'ArrowLeft':'ArrowRight');await frames(page);}assert.equal(Number(await target.getAttribute('data-depth')),depth);assert.equal(await target.evaluate(e=>document.activeElement===e),true,'Keyboard target setup must own focus.');
  await page.keyboard.press('Enter'); await saved(page);
}
async function undoRedo(page, before, after) {
  await page.locator('#undo-button').click(); await saved(page); assert.deepEqual(await observed(page), before);
  await page.keyboard.press('Control+Shift+z'); await saved(page); assert.deepEqual(await observed(page), after);
}
function assertMoved(before, after, selected, beforeLineId) {
  assert.deepEqual(business(after), business(before)); assert.deepEqual(after.state.bindings, before.state.bindings);
  assert.deepEqual(after.state.folders, before.state.folders); assert.deepEqual(after.state.progressRecords,before.state.progressRecords);
  const selectedSet = new Set(selected.lineIds), originalIds = before.lines.map(l => l.id);
  const desired = originalIds.filter(id => !selectedSet.has(id));
  const index = beforeLineId === null ? desired.length : desired.indexOf(beforeLineId); assert(index >= 0);
  desired.splice(index, 0, ...selected.lineIds);
  assert.deepEqual(after.lines.map(l => l.id).filter(id => originalIds.includes(id)), desired);
  for (const old of before.rows) assert.equal(after.rows.find(r => r.id === old.id).depth, old.depth);
}
async function dragTo(page, touch, before, input) {
  const selection = await moveSelection(page, before.lines[1].id), targetId = before.lines[6].id;
  assert(selection.targets.some(t => t.beforeLineId === targetId));
  const locator = await handle(page, 1), start = await point(locator);
  if (input === 'mouse') { await page.mouse.move(start.x, start.y); await page.mouse.down(); await pause(HOLD_MS); await bar(page).waitFor({ state: 'visible' }); }
  else await longpress(page, touch, locator, false);
  const box = await page.locator('.tle-line[data-line-index="6"]').boundingBox(); assert(box);
  const end = { x: start.x, y: Math.round(box.y + 2) }; // Keep the original horizontal depth for inherited regression.
  if (input === 'mouse') await page.mouse.move(end.x, end.y, { steps: 5 }); else await touch.move(end);
  await page.locator('.tle-move-drop').waitFor({ state: 'visible' });
  if (input === 'mouse') await page.mouse.up(); else await touch.end();
  await saved(page); const after = await observed(page); assertMoved(before, after, selection.selected, targetId);
  await undoRedo(page, before, after);
  return { sourceLineIds: selection.selected.lineIds, beforeLineId: targetId, completionChanges: 0, oneUndoRestoresOriginal: true };
}

runners.set('R901', async ({ page }) => {
  await newDoc(page, 'v11 저장 확인'); await raw(page).fill('v11 메모  보존\n- 일반 목록'); await saved(page);
  const before = await observed(page); await page.reload(); await raw(page).waitFor(); const after = await observed(page);
  assert.deepEqual(after, before);
  assert.deepEqual(await page.evaluate(() => [...new Set(window.__reviewStorage.map(e => e.key))]), [KEY]);
  return { reloadPreservesSourceAndIds: true, storageObservation: 'isolated context only' };
});
runners.set('R902',async({page})=>{const before=await observed(page);await(await handle(page,1)).click();await page.locator('#quick-progress-form').waitFor();await frames(page);assert.equal(await page.locator('#quick-percent').inputValue(),'100');assert.deepEqual(await observed(page),before);assert.equal(await bar(page).isVisible(),false);await page.keyboard.press('Escape');assert.deepEqual(await observed(page),before);return {quickOpen:true,completionChanges:0,progressRecords:0};});
runners.set('R903',async({page,touch})=>{const before=await observed(page),p=await point(await handle(page,1));await touch.start(p);await pause(70);await touch.end();await page.locator('#quick-progress-form').waitFor();assert.deepEqual(await observed(page),before);assert.equal(await bar(page).isVisible(),false);await page.keyboard.press('Escape');assert.deepEqual(await observed(page),before);return {quickOpen:true,completionChanges:0,progressRecords:0};});
runners.set('R904', async ({ page, touch }) => {
  const before = await fixture(page), selection = await moveSelection(page, before.lines[1].id);
  assert.deepEqual(selection.selected.lineIds, before.lines.slice(1, 5).map(l => l.id));
  await longpress(page, touch, await handle(page, 1));
  assert.deepEqual(await selectedIds(page, before), selection.selected.lineIds); assert.deepEqual(await observed(page), before);
  return { selectedLineIds: selection.selected.lineIds, includesMemoTimeAndSubcheck: true, nextSiblingExcluded: true, completionChanges: 0 };
});
runners.set('R905', async ({ page, touch }) => {
  const before = await observed(page), checks = [];
  for (const scopeId of ['folder-move', 'flow-move-d30']) {
    const row = before.rows.find(r => r.kind === 'scope' && r.scopeId === scopeId), selection = await moveSelection(page, row.id);
    await longpress(page, touch, await handle(page, row.index, 'scope'));
    assert.deepEqual(await selectedIds(page, before), selection.selected.lineIds); assert.deepEqual(await observed(page), before);
    assert.equal(await page.locator('#dialog').evaluate(d => d.open), false); checks.push({ scopeId, selectedLineIds: selection.selected.lineIds }); await clearMove(page);
  }
  return { checks, canonicalChanges: 0 };
});
runners.set('R906', async ({ page, touch }) => {
  const before = await fixture(page); await longpress(page, touch, await handle(page, 1)); await pause(500);
  assert.equal(await bar(page).isVisible(), true); assert((await page.locator('.tle-move-target-button').count())>0);
  await clearMove(page); assert.equal(await bar(page).isVisible(), false); assert.deepEqual(await observed(page), before);
  await longpress(page, touch, await handle(page, 1)); await page.getByRole('tab', { name: '주', exact: true }).click();
  assert.equal(await bar(page).isVisible(), false); await page.getByRole('tab', { name: '문서', exact: true }).click();
  assert.equal(await bar(page).isVisible(), false); assert.deepEqual(await observed(page), before);
  return { retainedAfterRelease: true, cancelAndNavigationClearSelection: true, mutations: 0 };
});
runners.set('R907', async ({ page, touch }) => dragTo(page, touch, await fixture(page), 'mouse'));
runners.set('R908', async ({ page, touch }) => dragTo(page, touch, await fixture(page), 'touch'));
runners.set('R909', async ({ page, touch }) => {
  const before = await fixture(page, '\n' + Array.from({ length: 35 }, (_, i) => '스크롤 메모 ' + i).join('\n'));
  const p = await point(await handle(page, 1)), scrollBefore = await raw(page).evaluate(e => e.scrollTop);
  await touch.start(p); await pause(80);
  for (let n = 1; n <= 5; n++) { await touch.move({ x: p.x, y: p.y - n * 20 }); await pause(25); }
  await touch.end(); await pause(150);
  const scrollAfter = await raw(page).evaluate(e => e.scrollTop);
  assert(scrollAfter > scrollBefore, 'Icon gesture must permit actual pre-threshold scrolling.');
  assert.equal(await bar(page).isVisible(), false); assert.deepEqual(await observed(page), before);
  return { scrollBefore, scrollAfter, mutations: 0, selected: false };
});
runners.set('R910', async ({ page, touch }) => {
  const before = await fixture(page); await longpress(page, touch, await handle(page, 1), false); await touch.cancel(); await frames(page);
  assert.deepEqual(await observed(page), before);
  assert(await page.evaluate(() => window.__reviewEvents.some(e => e.type === 'pointercancel' && e.trusted && e.pointerType === 'touch')));
  const phases = await page.locator('.tle-root').getAttribute('data-move-phase');
  assert(!['pending', 'dragging'].includes(phases)); return { touchCancel: true, mutations: 0 };
});
runners.set('R911', async ({ page, touch }) => {
  const before = await fixture(page); await longpress(page, touch, await handle(page, 1), false);
  await touch.move({ x: 3, y: 20 }); await touch.end(); await frames(page);
  assert.deepEqual(await observed(page), before); return { dropOutsideEditor: true, mutations: 0 };
});
runners.set('R912', async ({ page, touch }) => {
  const before = await fixture(page); await caret(page, 1);
  const row = await page.locator('.tle-line[data-line-index="1"]').boundingBox(); assert(row);
  await touch.start({ x: Math.round(row.x + 150), y: Math.round(row.y + row.height / 2) }); await pause(HOLD_MS); await touch.end(); await frames(page);
  assert.equal(await bar(page).isVisible(), false); assert.equal(await raw(page).inputValue(), before.raw); assert.deepEqual(await observed(page), before);
  return { textAreaSourcePreserved: true, moveSelection: false, nativeSelectionHandles: 'not asserted' };
});
runners.set('R913', async ({ page }) => {
  const before = await fixture(page); await caret(page, 1); await page.keyboard.press('Alt+Shift+m');
  await bar(page).waitFor({ state: 'visible' }); await page.keyboard.press('Escape'); assert.equal(await bar(page).isVisible(), false);
  await caret(page, 1); await page.locator('.tle-row-menu').click(); await page.locator('#dialog [data-action="move-row"]').click();
  await bar(page).waitFor({ state: 'visible' }); await page.keyboard.press('Escape'); assert.equal(await bar(page).isVisible(), false);
  assert.deepEqual(await observed(page), before); return { shortcutAndRowMenu: true, escapePreservesSource: true };
});
runners.set('R914', async ({ page }) => {
  const before = await fixture(page), selection = await moveSelection(page, before.lines[1].id), targetId = before.lines[6].id;
  await caret(page, 1); await page.keyboard.press('Alt+Shift+m');
  const offered = await page.locator('.tle-move-target-button').evaluateAll(list => list.map(b => b.dataset.moveTarget === '__end' ? null : b.dataset.moveTarget));
  assert.deepEqual(offered, [...new Set(selection.targets.map(t => t.beforeLineId))]); assert(offered.includes(targetId));
  await page.keyboard.press('Escape'); assert.equal(await bar(page).isVisible(), false); assert.deepEqual(await observed(page), before);
  await caret(page,1);await page.keyboard.press('Alt+Shift+m');await choose(page, targetId); const after = await observed(page); assertMoved(before, after, selection.selected, targetId);
  await undoRedo(page, before, after); return { keyboardDestination: targetId, offeredTargets: offered, oneUndoRestoresOriginal: true };
});
runners.set('R915', async ({ page, touch }) => {
  const before = await fixture(page), pending = before.raw + '\n저장 실패 중 메모';
  await page.evaluate(() => { window.__reviewStorageFailure = true; }); await raw(page).fill(pending);
  await page.waitForFunction(() => document.querySelector('#save-status').textContent === '저장하지 못함');
  const p = await point(await handle(page, 1)); await touch.start(p); await pause(HOLD_MS); await touch.end(); await frames(page);
  assert.equal(await bar(page).isVisible(), false); await caret(page, 1); await page.keyboard.press('Alt+Shift+m');
  assert.equal(await bar(page).isVisible(), false); assert.equal(await raw(page).inputValue(), pending); assert.deepEqual(await observed(page), before);
  await page.evaluate(() => { window.__reviewStorageFailure = false; }); await button(page, '다시 저장').click(); await saved(page);
  assert.equal((await observed(page)).raw, pending); await caret(page, 1); await page.keyboard.press('Alt+Shift+m');
  await bar(page).waitFor({ state: 'visible' }); return { failedInputPreserved: true, selectionBlockedUntilRetry: true };
});
runners.set('R916', async ({ page, context, touch, url }) => {
  const before = await fixture(page), pending = before.raw + '\n충돌 중 입력';
  const other = await context.newPage(); await other.goto(url); await raw(other).waitFor();
  await page.evaluate(() => { window.__reviewStorageFailure = true; }); await raw(page).fill(pending);
  await other.locator('#document-title').fill('다른 탭 제목'); await saved(other);
  await page.waitForFunction(() => document.querySelector('.tle-textarea').readOnly);
  const stored = await observed(page), p = await point(await handle(page, 1));
  await touch.start(p); await pause(HOLD_MS); await touch.end(); await frames(page);
  assert.equal(await bar(page).isVisible(), false); assert.equal(await raw(page).inputValue(), pending); assert.deepEqual(await observed(page), stored);
  return { conflictBlocksSelection: true, pendingSourcePreserved: true, externalStateNotOverwritten: true };
});
runners.set('R917', async ({ page }) => {
  const before = await observed(page), row = before.rows.find(r => r.isReference), selection = await moveSelection(page, row.id);
  const target = selection.targets.find(t => t.index > selection.selected.endIndex); assert(target, 'Seed reference needs a non-noop later target.');
  await caret(page, row.index); await page.keyboard.press('Alt+Shift+m'); await choose(page, target.beforeLineId);
  const after = await observed(page); assertMoved(before, after, selection.selected, target.beforeLineId);
  assert.deepEqual(after.state.flows, before.state.flows);
  await page.reload(); await raw(page).waitFor(); assert.deepEqual(await observed(page), after);
  await page.getByRole('tab', { name: '전체', exact: true }).click(); assert.equal(await page.locator('[data-task-row]').count(), after.tasks.length);
  await page.getByRole('tab', { name: '문서', exact: true }).click(); assert.deepEqual(await observed(page), after);
  return { referenceId: row.taskId, effectiveDatesAndOwnersPreserved: true, sourceFlowUnchanged: true, reloadAndPeriodCanonicalCount: after.tasks.length };
});
runners.set('R918', async ({ page, touch }) => {
 const before=await fixture(page),checks=[],screenshots=[];for(const [width,height] of [[390,844],[1194,834]]){await clearMove(page);await page.setViewportSize({width,height});await page.evaluate(()=>document.fonts.ready);await longpress(page,touch,await handle(page,1));const t=page.locator('.tle-move-target-button:visible').first();await t.scrollIntoViewIfNeeded();const g=await geometry(page,'.tle-move-target-button:visible');inViewport(g);assert.equal(g.innerWidth,g.scrollWidth);assert.equal((await selectedIds(page,before)).length,4);assert.equal(await page.locator('#move-bar').count(),0);assert.equal(await page.locator('#dialog').evaluate(e=>e.open),false);checks.push(g);screenshots.push(await capture(page,'inline-selected-'+width+'x'+height));}assert.deepEqual(await observed(page),before);return {checks,screenshots,removedMoveBarAndDialog:true,realDevice:false};
});
runners.set('R919', async ({ page }) => {
  const before = await fixture(page, '\n' + Array.from({ length: 30 }, (_, i) => '긴 문서 메모 ' + i).join('\n') + '\n- [ ] 마지막 항목');
  const sourceId = before.lines[1].id, targetId = before.lines.at(-1).id, selection = await moveSelection(page, sourceId);
  assert.equal(before.lines.length, 38); assert(selection.targets.some(t => t.beforeLineId === targetId));
  async function assertFocusAt(data) {
    const expected = data.rows.find(r => r.id === sourceId);
    const measured = await page.evaluate(() => {
      const active = document.activeElement, input = document.querySelector('.tle-textarea'), a = active.getBoundingClientRect(), b = input.getBoundingClientRect();
      return { index: Number(active.dataset.lineIndex), className: active.className, hidden: active.hidden,
        box: { top: a.top, bottom: a.bottom }, viewport: { top: b.top, bottom: b.bottom }, scrollTop: input.scrollTop };
    });
    assert.equal(measured.index, expected.index); assert.match(measured.className, /tle-check-hit/); assert.equal(measured.hidden, false);
    assert(measured.box.top >= measured.viewport.top - 1 && measured.box.bottom <= measured.viewport.bottom + 1);
    return measured;
  }
  await caret(page, 1); await page.keyboard.press('Alt+Shift+m'); await choose(page, targetId); await frames(page);
  const after = await observed(page); assertMoved(before, after, selection.selected, targetId);
  const movedFocus = await assertFocusAt(after);
  await page.locator('#undo-button').click(); await saved(page); await frames(page); assert.deepEqual(await observed(page), before);
  const undoFocus = await assertFocusAt(before);
  await page.keyboard.press('Control+Shift+z'); await saved(page); await frames(page); assert.deepEqual(await observed(page), after);
  const redoFocus = await assertFocusAt(after);
  return { sourceId, documentLines: 38, movedFocus, undoFocus, redoFocus };
});

async function rowMenu(page, index) {
  await caret(page, index); await page.locator('.tle-row-menu').click();
  await page.locator('#dialog').waitFor({ state: 'visible' });
}
async function geometry(page, selector) {
  return page.locator(selector).first().evaluate(e => {
    const r=e.getBoundingClientRect(),v=visualViewport;
    return { x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,
      viewport:{width:v.width,height:v.height,left:v.offsetLeft,top:v.offsetTop},innerWidth,scrollWidth:document.documentElement.scrollWidth };
  });
}
function inViewport(g) {
  assert(g.x>=g.viewport.left-1&&g.right<=g.viewport.left+g.viewport.width+1,JSON.stringify(g));
  assert(g.y>=g.viewport.top-1&&g.bottom<=g.viewport.top+g.viewport.height+1,JSON.stringify(g));
}
async function fold(page, index) {
  await reveal(page,index); await page.locator('.tle-fold-toggle[data-line-index="'+index+'"]').click(); await frames(page);
  assert.equal(await page.locator('.tle-root').evaluate(e=>e.classList.contains('tle-folded-view')),true);
}
async function capture(page,name){fs.mkdirSync(IMAGE_DIR,{recursive:true});const file=path.join(IMAGE_DIR,name+'.png');await page.screenshot({path:file});return file;}
runners.set('R920', async ({page,touch}) => {
  const screenshots=[await capture(page,'initial-390x844')];
  const before=await fixture(page); await caret(page,1);
  assert.equal(await raw(page).evaluate(e=>document.activeElement===e),true);
  assert.equal(await page.locator('.tle-row-menu').isVisible(),true);
  const line=await page.locator('.tle-line[data-line-index="1"]').boundingBox(); assert(line);
  await touch.start({x:Math.round(line.x+150),y:Math.round(line.y+line.height/2)});await pause(HOLD_MS);await touch.end();await frames(page);
  assert.equal(await page.locator('.tle-row-menu').isVisible(),true);assert.equal(await raw(page).inputValue(),before.raw);
  await page.locator('.tle-row-menu').click();screenshots.push(await capture(page,'row-menu-390x844')); await page.locator('#dialog [data-action="move-row"]').click();await frames(page);
  assert.equal(await bar(page).isVisible(),true);assert.equal(await raw(page).evaluate(e=>document.activeElement===e),false);
  assert.deepEqual(await observed(page),before);
  return {editingMenuVisible:true,textLongpressMenuVisible:true,moveBlursTextarea:true,nativeSelectionHandles:'not asserted',realKeyboard:'not tested',screenshots};
});
runners.set('R921', async ({page}) => {
  await page.setViewportSize({width:390,height:844}); const before=await fixture(page);await caret(page,1);await page.keyboard.press('Alt+Shift+m');
  const selected=await selectedIds(page,before),checks=[];
  for(const height of [500,844]){
    await page.setViewportSize({width:390,height});await frames(page);await pause(150);
    assert.deepEqual(await selectedIds(page,before),selected);assert.equal(await bar(page).isVisible(),true);
    assert.equal(await raw(page).evaluate(e=>document.activeElement===e),false);
    await page.locator('.tle-move-target-button:visible').first().scrollIntoViewIfNeeded();const g=await geometry(page,'.tle-move-target-button:visible');inViewport(g);checks.push(g);
  }
  assert.deepEqual(await observed(page),before);return {method:'Playwright actual browser viewport resize; no soft keyboard',checks,selected};
});
runners.set('R922', async ({page}) => {
 await page.setViewportSize({width:390,height:844});const before=await fixture(page);await caret(page,1);await page.keyboard.press('Alt+Shift+m');const selected=await selectedIds(page,before);
 await page.evaluate(()=>{Object.defineProperty(visualViewport,'height',{configurable:true,get:()=>420});Object.defineProperty(visualViewport,'offsetTop',{configurable:true,get:()=>90});visualViewport.dispatchEvent(new Event('resize'));visualViewport.dispatchEvent(new Event('scroll'));});await frames(page);
 assert.deepEqual(await selectedIds(page,before),selected);assert.equal(await page.locator('#move-bar').count(),0);assert.equal(await page.locator('#dialog').evaluate(e=>e.open),false);const targets=await page.locator('.tle-move-target-button').count();assert(targets>0);
 await page.evaluate(()=>{delete visualViewport.height;delete visualViewport.offsetTop;visualViewport.dispatchEvent(new Event('resize'));});await frames(page);assert.deepEqual(await selectedIds(page,before),selected);assert.deepEqual(await observed(page),before);return {method:'Synthetic viewport getters/events; not physical keyboard',inlineTargets:targets,noAnchoredMovePanel:true,selectionPreserved:true};
});
runners.set('R923', async ({page}) => {
  await page.setViewportSize({width:390,height:844});const checks=[],screenshots=[];
  for(const kind of ['task','subcheck','note']){
    const before=await fixture(page),lineId=before.lines[1].id;
    const option=await page.evaluate(({id,lineId,kind})=>{const m=TextWorkspaceModel;return m.insertionOptions(m.read(localStorage).state,id,lineId).find(x=>x.kind===kind);},{id:before.id,lineId,kind});assert(option);
    await caret(page,1);await page.locator('.tle-plus').click();
    if(kind==='task')screenshots.push(await capture(page,'add-menu-390x844'));
    const actions=await page.locator('#dialog-body [data-action]').evaluateAll(es=>es.map(e=>e.dataset.action));
    assert(!actions.some(a=>['move-row','indent-row','outdent-row','task-date','task-detail','unlink','rename-scope'].includes(a)));
    const entry=page.locator('#dialog [data-action="insert-plan"][data-kind="'+kind+'"]');
    assert.equal(await entry.locator('svg').count(),1);assert.equal((await entry.locator('small').textContent()).trim(),option.relation);
    assert.equal((await entry.locator('code').textContent()).trim(),option.syntax.trim());await entry.click();
    const insertion=before.raw.slice(0,option.offset)+option.text+before.raw.slice(option.offset);
    assert.equal(await raw(page).inputValue(),insertion);assert.equal(await raw(page).evaluate(e=>e.selectionStart),option.caretOffset);
    await page.keyboard.insertText('추가 검증');await saved(page);const after=await observed(page);
    assert.equal(after.raw,insertion.slice(0,option.caretOffset)+'추가 검증'+insertion.slice(option.caretOffset));
    const added=after.rows.find(r=>r.text.includes('추가 검증'));assert(added);assert.equal(added.depth,option.depth);
    if(kind==='subcheck'||kind==='note')assert.equal(added.taskId,lineId);
    if(kind==='task'){assert.equal(added.kind,'task');assert.equal(after.tasks.length,before.tasks.length+1);}
    else assert.equal(after.tasks.length,before.tasks.length);
    assert(before.lines.every(l=>after.lines.some(n=>n.id===l.id&&n.text===l.text)));
    checks.push({kind,relation:option.relation,syntax:option.syntax,depth:added.depth,parent:added.taskId||null});
  }
  assert.match(await page.locator('[data-action="date-section"]').textContent(),/문서 끝/);
  return {checks,addOnly:true,endDateExplicit:true,screenshots};
});
runners.set('R924', async ({page}) => {
  const before=await fixture(page);await rowMenu(page,1);
  const actions=await page.locator('#dialog-body [data-action]').evaluateAll(es=>es.map(e=>e.dataset.action));
  assert(actions.includes('move-row')&&actions.includes('task-date')&&actions.includes('task-detail'));
  assert(!actions.some(a=>['insert-plan','picker-task','picker-scope','insert-task','child-scope','import-flow-items'].includes(a)));
  await page.keyboard.press('Escape');assert.deepEqual(await observed(page),before);
  return {actions,operateOnly:true,cancelMutations:0};
});
runners.set('R925', async ({page}) => {
  await page.setViewportSize({width:390,height:844});await frames(page);
  const before=await observed(page),scopeRow=before.rows.find(r=>r.scopeId==='folder-move'&&r.kind==='scope');
  const hash=await page.evaluate(()=>location.hash);await fold(page,scopeRow.index);
  assert.equal(await page.evaluate(()=>location.hash),hash);assert.deepEqual(await observed(page),before);
  const screenshots=[await capture(page,'folded-390x844')];
  await page.locator('.tle-fold-toggle[data-line-index="'+scopeRow.index+'"]').click();await frames(page);
  await (await handle(page,scopeRow.index,'scope')).click();
  const folderRoute=await page.evaluate(()=>Object.fromEntries(new URLSearchParams(location.hash.slice(1))));
  assert.equal(folderRoute.view,'all');assert.equal(folderRoute.folder,'folder-move');assert.deepEqual((await observed(page)).state,before.state);
  await page.getByRole('tab',{name:'문서',exact:true}).click();
  const flowRow=before.rows.find(r=>r.scopeId==='flow-move-d30'&&r.kind==='scope');await (await handle(page,flowRow.index,'scope')).click();
  assert.equal(await docId(page),'flow-move-d30');assert.deepEqual((await observed(page)).state,before.state);
  return {foldNavigation:false,folderRoute,flowOriginalDoc:await docId(page),sourceMutations:0,screenshots};
});
runners.set('R926', async ({page}) => {
  const before=await observed(page);await fold(page,2);
  assert.equal(await raw(page).inputValue(),before.raw);assert.deepEqual(await observed(page),before);
  await page.getByRole('tab',{name:'전체',exact:true}).click();assert.equal(await page.locator('[data-task-row]').count(),before.tasks.length);
  await page.getByRole('tab',{name:'문서',exact:true}).click();assert.deepEqual(await observed(page),before);
  await page.reload();await raw(page).waitFor();assert.deepEqual(await observed(page),before);
  return {rawAndIdsUnchanged:true,periodCanonicalCount:before.tasks.length,reloadPreserved:true,foldPersistence:'not required'};
});
runners.set('R927', async ({page}) => {
  const before=await observed(page);await fold(page,2);
  const hidden=await raw(page).evaluate(e=>({readonly:e.readOnly,inert:e.inert,tabIndex:e.tabIndex,aria:e.getAttribute('aria-hidden'),visibility:getComputedStyle(e).visibility}));
  assert.equal(hidden.inert,true);assert.equal(hidden.tabIndex,-1);assert.equal(hidden.aria,'true');assert.equal(hidden.visibility,'hidden');
  await page.locator('.tle-line[data-line-index="1"]').click();await frames(page);
  assert.equal(await page.locator('.tle-root').evaluate(e=>e.classList.contains('tle-folded-view')),false);
  const focus=await raw(page).evaluate(e=>({active:document.activeElement===e,index:e.value.slice(0,e.selectionStart).split('\n').length-1,readonly:e.readOnly}));
  assert.equal(focus.active,true);assert.equal(focus.index,1);assert.equal(focus.readonly,false);
  await page.keyboard.press('End');await page.keyboard.insertText(' 편집 검증');await saved(page);const after=await observed(page);
  assert.equal(after.lines[1].text,before.lines[1].text+' 편집 검증');assert.deepEqual(after.lines.map(l=>l.id),before.lines.map(l=>l.id));
  assert.deepEqual(after.lines.filter((l,i)=>i!==1),before.lines.filter((l,i)=>i!==1));assert.deepEqual(after.state.flows,before.state.flows);
  return {hidden,focus,editedLine:1,hiddenLinesPreserved:true};
});
runners.set('R928', async ({page}) => {
  await page.locator('#document-title').fill('복구 검사');await saved(page);const before=await observed(page);
  const valid=before.raw+'\n마지막 정상 입력',lines=valid.split('\n');lines.splice(9,0,'      - 메모: 참조에 붙일 수 없는 속성');const invalid=lines.join('\n');
  assert.equal(await page.evaluate(({id,text})=>{const m=TextWorkspaceModel,s=m.read(localStorage).state;return m.editText(s,id,text)===s;},{id:before.id,text:invalid}),true);
  await raw(page).fill(valid);await raw(page).fill(invalid);
  await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='저장하지 못함');
  await page.getByRole('tab',{name:'주',exact:true}).click();assert.equal(await page.getByRole('tab',{name:'문서',exact:true}).getAttribute('aria-selected'),'true');
  assert.equal(await raw(page).inputValue(),invalid);assert.deepEqual(await observed(page),before);
  const disabled=await page.locator('.tle-check-hit').evaluateAll(es=>es.every(e=>e.disabled));assert.equal(disabled,true);
  await raw(page).fill(valid);await saved(page);assert.equal((await observed(page)).raw,valid);
  assert.equal(await page.locator('.tle-check-hit').first().isEnabled(),true);
  const pending=valid+'\n저장 실패 보존';await page.evaluate(()=>{window.__reviewStorageFailure=true;});await raw(page).fill(pending);
  await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='저장하지 못함');
  await page.locator('#document-title').click();await frames(page);
  const foldControl=page.locator('.tle-fold-toggle[data-line-index="2"]');
  if(await foldControl.isEnabled()){await foldControl.click();await frames(page);}
  assert.equal(await raw(page).inputValue(),pending);assert.equal((await observed(page)).raw,valid);
  await page.evaluate(()=>{window.__reviewStorageFailure=false;});await button(page,'다시 저장').click();await saved(page);
  assert.equal((await observed(page)).raw,pending);
  return {invalidFixture:'property under existing reference, no large-document fixture',invalidInputPreserved:true,normalDraftTimerRecovered:true,saveFailureFoldNoLoss:true,retrySaved:true};
});
runners.set('R929', async ({page}) => {
  const before=await fixture(page,'\n- [ ] 한글과 긴 제목으로 줄바꿈을 확인하는 할 일 입니다\n  - 메모: 작은 화면과 큰 글자에서 원문과 표시의 높이를 확인합니다'),checks=[],screenshots=[];
  fs.mkdirSync(IMAGE_DIR,{recursive:true});
  for(const [width,height] of [[390,844],[1194,834],[834,1194]]){
    await clearMove(page);await page.setViewportSize({width,height});
    const style=await page.addStyleTag({content:'.tle-root{--tle-font:23px!important;--tle-line:56px!important} body{font-size:20px!important}'});
    await page.evaluate(()=>document.fonts.ready);await frames(page);
    await raw(page).focus();await page.keyboard.press('Control+Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('End');await frames(page);
    assert.equal(await raw(page).evaluate(e=>e.value.slice(0,e.selectionStart).split('\n').length-1),1);
    assert.equal(await page.locator('.tle-row-menu').isVisible(),true);await page.keyboard.press('Alt+Shift+m');await frames(page);
    await page.locator('.tle-move-target-button:visible').first().scrollIntoViewIfNeeded();const g=await geometry(page,'.tle-move-target-button:visible');inViewport(g);assert.equal(g.innerWidth,g.scrollWidth);
    const heights=await page.evaluate(()=>({textarea:document.querySelector('.tle-textarea').scrollHeight,mirror:document.querySelector('.tle-presentation').scrollHeight,font:getComputedStyle(document.querySelector('.tle-textarea')).fontSize}));
    assert(Math.abs(heights.textarea-heights.mirror)<=2,JSON.stringify(heights));
    const image=path.join(IMAGE_DIR,'large-text-'+width+'x'+height+'.png');await page.screenshot({path:image});screenshots.push(image);checks.push({width,height,g,heights});
    await page.setViewportSize({width,height:Math.min(500,height)});await frames(page);await page.locator('.tle-move-target-button:visible').first().scrollIntoViewIfNeeded();const short=await geometry(page,'.tle-move-target-button:visible');inViewport(short);assert.equal(short.innerWidth,short.scrollWidth);checks.push({shortened:true,g:short});
    await style.evaluate(e=>e.remove());
  }
  assert.deepEqual(await observed(page),before);return {method:'CSS font/line-height + viewport resize simulation; not OS text scale or keyboard',checks,screenshots,realDevices:0};
});

function reportPlan() {
  return { schema: 'flowme-ux-v11-move-review', mode: 'planned', createdAt: new Date().toISOString(), url: URL,
    storageKey: KEY, runtimeContract: { longpressMs: 450, prethresholdCancelPx: 8, selectionEnd: 'exclusive' },
    method: 'Independent ephemeral Chromium contexts. CDP touch is browser input emulation, not physical-device validation. Completion APIs are wrapped only to log calls; original arguments, return values and behavior are unchanged.',
    observedUsers: 0, realDevices: 0, productionIntegration: 0, syntheticPointerEvents: 'none; do not relabel CDP touch as physical touch',
    sourceHashesBefore: null, sourceHashesAfter: null, sourcesUnchangedDuringRun: null,
    summary: { planned: PLAN.length, executed: 0, passed: null, failed: null, notRun: PLAN.length },
    cases: PLAN.map(entry => ({ ...entry, status: 'not_run', evidence: null, events: [], console: [], pageErrors: [] })) };
}
function write(report) { fs.writeFileSync(RESULT, JSON.stringify(report, null, 2) + '\n', 'utf8'); }
async function main() {
  const report = reportPlan();
  if (!process.argv.includes('--run')) {
    if (fs.existsSync(RESULT) && JSON.parse(fs.readFileSync(RESULT, 'utf8')).mode === 'executed') {
      console.log('기존 실행 결과를 보존했습니다. --run --final로 새 검사를 실행하세요.'); return;
    }
    write(report); console.log('v11 시나리오 계획 저장. 실제 브라우저 실행 0건.'); return;
  }
  report.phase = process.argv.includes('--final') ? 'final' : 'preliminary';
  if (ONLY) { assert.equal(report.phase,'preliminary','Final must execute the full suite.'); report.only=ONLY; }
  report.url = process.argv.find(arg => /^https?:\/\//.test(arg)) || URL;
  report.sourceHashesBefore = hashSources(__dirname);
  const previousDir = path.join(__dirname, '../2026-09-08-flowme-text-workspace-ux-v10');
  report.v10HashesBefore = optionalSourceHashes(previousDir);
  const model = require('./model.js'); assert.equal(model.KEY, KEY); assert.equal(model.createState().version, 11);
  for (const api of ['selectionForMove', 'moveTargets', 'moveSubtree']) assert.equal(typeof model[api], 'function');
  if (fs.existsSync(RESULT)) {
    const previous = JSON.parse(fs.readFileSync(RESULT, 'utf8'));
    if(previous.mode==='executed'&&JSON.stringify(previous.sourceHashesAfter)!==JSON.stringify(report.sourceHashesBefore)){
      const archive=path.join(__dirname,'browser-regression-results-previous-runtime.json');if(!fs.existsSync(archive))fs.writeFileSync(archive,JSON.stringify(previous,null,2)+'\n');
    }
    if (previous.mode === 'executed' && previous.summary.failed) {
      const archive = path.join(__dirname, previous.phase==='final'?'browser-regression-results-final-initial.json':'browser-regression-results-initial.json'); if (!fs.existsSync(archive)) fs.writeFileSync(archive, JSON.stringify(previous, null, 2) + '\n');
    }
  }
  const { chromium } = require('playwright'), browser = await chromium.launch({ headless: true });
  report.mode = 'executed'; report.startedAt = new Date().toISOString(); report.browser = browser.version();
  try {
    for (const entry of report.cases) {
      if (ONLY && entry.id !== ONLY) continue;
      if (!runners.has(entry.id)) continue;
      const useTouch = entry.input.includes('touch') || entry.input === 'geometry';
      const context = await browser.newContext({ viewport: useTouch ? { width: 390, height: 844 } : { width: 1194, height: 834 }, hasTouch: true, isMobile: useTouch });
      await context.addInitScript(({ key }) => {
        window.__reviewStorage = []; window.__reviewEvents = [];
        for (const method of ['getItem', 'setItem', 'removeItem']) {
          const original = Storage.prototype[method];
          Storage.prototype[method] = function(name, value) {
            window.__reviewStorage.push({ method, key: String(name) });
            if (method === 'setItem' && name === key && window.__reviewStorageFailure) throw new DOMException('Review injected failure', 'QuotaExceededError');
            return method === 'setItem' ? original.call(this, name, value) : original.call(this, name);
          };
        }
        for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'click']) {
          document.addEventListener(type, event => {
            if (window.__reviewEvents.length >= 500) return;
            window.__reviewEvents.push({ type, trusted: event.isTrusted, pointerType: event.pointerType || '', time: performance.now(),
              className: typeof event.target.className === 'string' ? event.target.className : '', lineIndex: event.target.dataset?.lineIndex ?? null });
          }, true);
        }
      }, { key: KEY });
      const page = await context.newPage(); page.setDefaultTimeout(8000); const touch = await touchDriver(context, page);
      page.on('console', msg => { if (['error', 'warning'].includes(msg.type())) entry.console.push({ type: msg.type(), text: msg.text() }); });
      page.on('pageerror', error => entry.pageErrors.push(error.message)); const start = Date.now();
      try {
        await page.goto(report.url); await raw(page).waitFor(); await page.evaluate(() => document.fonts.ready.then(() => true));
        assert.equal(await page.evaluate(() => window.TextWorkspaceModel.KEY), KEY);
        await page.evaluate(() => {
          const model = window.TextWorkspaceModel; window.__reviewCompletionCalls = [];
          for (const name of ['updateTask', 'updateSubcheck']) {
            const original = model[name];
            model[name] = function(...args) {
              const patch = args[args.length - 1];
              if (name === 'updateSubcheck' || (patch && typeof patch.done === 'boolean')) {
                window.__reviewCompletionCalls.push({ api: name, id: args[1], detail: JSON.parse(JSON.stringify(args.slice(2))) });
              }
              return original.apply(this, args);
            };
          }
        });
        entry.evidence = await runners.get(entry.id)({ page, context, touch, url: report.url });
        entry.completionCalls = await page.evaluate(() => window.__reviewCompletionCalls || []);
        assert.equal(entry.completionCalls.length, 0, 'Canonical short tap opens quick progress; selection/move/cancel must never toggle completion.');
        entry.events = await page.evaluate(() => window.__reviewEvents);
        if (entry.input.includes('cdp-touch') || entry.input === 'geometry') assert(entry.events.some(e => e.type === 'pointerdown' && e.pointerType === 'touch' && e.trusted), 'Trusted CDP touch pointer evidence is required.');
        assert.deepEqual(entry.pageErrors, []); entry.status = 'passed';
      } catch (error) {
        entry.status = 'failed'; entry.error = error.stack || String(error);
        entry.events = await page.evaluate(() => window.__reviewEvents).catch(() => []);
        entry.diagnostic = await page.evaluate(() => ({ url: location.href, raw: document.querySelector('.tle-textarea')?.value,
          save: document.querySelector('#save-status')?.textContent, error: document.querySelector('#save-error-text')?.textContent,
          moveBarHidden: document.querySelector('#move-bar')?.hidden, moveStatus: document.querySelector('#move-status')?.textContent,
          selectedIndexes: [...document.querySelectorAll('.tle-move-selected')].map(e => e.dataset.lineIndex) })).catch(() => null);
      } finally { entry.elapsedMs = Date.now() - start; await touch.detach().catch(() => {}); await context.close(); }
      console.log(entry.id + ' ' + entry.status + ' (' + entry.elapsedMs + ' ms)' + (entry.error ? '\n' + entry.error : ''));
    }
  } finally { await browser.close(); }
  report.finishedAt = new Date().toISOString(); report.sourceHashesAfter = hashSources(__dirname); report.v10HashesAfter = optionalSourceHashes(previousDir);
  report.sourcesUnchangedDuringRun = JSON.stringify(report.sourceHashesBefore) === JSON.stringify(report.sourceHashesAfter);
  report.v10UnchangedDuringRun = report.v10HashesBefore === null ? null : JSON.stringify(report.v10HashesBefore) === JSON.stringify(report.v10HashesAfter);
  const passed = report.cases.filter(c => c.status === 'passed').length, failed = report.cases.filter(c => c.status === 'failed').length;
  report.summary = { planned: PLAN.length, executed: passed + failed, passed, failed, notRun: PLAN.length - passed - failed };
  write(report); console.log(JSON.stringify(report.summary));
  if (failed || (!ONLY && report.summary.notRun) || !report.sourcesUnchangedDuringRun || report.v10UnchangedDuringRun === false) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
