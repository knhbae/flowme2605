const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('./model.js');
const singleFile = require('./build-single-file.cjs');
const losslessRuntime = require('./lossless-authoring-runtime.cjs').loadCommonJs();

const here = __dirname;
const htmlPath = path.join(here, '..', '2026-09-02-flowme-integrated-flow-poc-standalone-ko.html');
const androidHtmlPath = path.join(here, '..', '2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html');
const modelPath = path.join(here, 'model.js');
const appPath = path.join(here, 'app.js');
const stylePath = path.join(here, 'style.css');
const shellPath = path.join(here, 'standalone-shell.html');
const stateTask = (state, id) => state.tasks.find(entry => entry.id === id);
const stateFlow = (state, id) => state.flows.find(entry => entry.id === id);

function validSource() {
  return '# 이사 전 준비\n- 기준일: 2026-09-20\n\n일반 메모는 원문에만 남습니다.\n\n## 계약\n- [ ] 견적 비교\n  - 상대 날짜: D-14\n  - 자료: https://example.com/quote\n\n## 입주\n- [ ] 열쇠 받기\n  - 날짜: 2026-09-20\n  - 시간: 10:30\n  - 시간대: Asia/Seoul';
}

function recurringSource(recurrence, recurrenceEnd) {
  return '# 아침 루틴\n\n이 문장은 Item이 아닌 원문 메모입니다.\n\n## 준비\n- [ ] 물 마시기\n  - 설명: 천천히 한 잔을 마십니다\n  - 메모: 250ml\n  - 날짜: 2026-09-02\n  - 시간: 07:30\n  - 시간대: Asia/Seoul\n  - 장소: 주방\n  - 소요 시간: 10\n  - 반복: ' + recurrence + '\n' + (recurrenceEnd ? '  - 반복 종료: ' + recurrenceEnd + '\n' : '') + '  - 실행 조건: 아침 식사 전\n  - 완료 기준: 빈 컵을 씻기\n  - [ ] 컵 씻기\n  - 자료: https://example.com/water\n  - 출처: https://example.com/source\n  - 주의: 너무 빠르게 마시지 않기';
}

function confirmedHandoff(overrides) {
  return M.makeHandoff(validSource(), Object.assign({
    draftId: 'draft-a',
    handoffId: 'handoff-a',
    sourceConfirmed: true,
    folderId: 'move'
  }, overrides));
}

test('two versioned standalone storage keys stay inside the exact PoC prefix', () => {
  assert.equal(M.VERSION, 1);
  assert.equal(M.STORAGE_KEY, 'flow:poc:personal-workspace:v1:standalone-integrated');
  assert.equal(M.DRAFT_STORAGE_KEY, 'flow:poc:personal-workspace:v1:standalone-integrated:draft');
});

test('six approved templates match the React authoring contract byte for byte without creating canonical Items', () => {
  const expected = [
    { id: 'exercise-phased-4w-v1', label: '단계별 반복', description: '단계마다 기간과 반복할 일이 달라요.', exampleLabel: '4주 운동 적응', exampleSource: '# 4주 운동 적응\n- 기준일: 2026-09-07\n\n## 1단계\n- [ ] 걷기 20분\n  - 날짜: 2026-09-07\n  - 반복: 매주 월, 수, 금\n  - 반복 종료: 2026-09-20', scaffold: '# \n- 기준일: \n\n## \n- [ ] \n  - 날짜: \n  - 반복: \n  - 반복 종료: ' },
    { id: 'exercise-weekly-repeat-v1', label: '같은 일정 반복', description: '정한 기간 동안 같은 일정으로 반복해요.', exampleLabel: '주간 운동 루틴', exampleSource: '# 주간 운동 루틴\n- 기준일: 2026-09-07\n\n## 이번 주\n- [ ] 아침 스트레칭\n  - 날짜: 2026-09-07\n  - 반복: 매주 월, 수, 금\n  - 반복 종료: 2026-10-02', scaffold: '# \n- 기준일: \n\n## \n- [ ] \n  - 날짜: \n  - 반복: \n  - 반복 종료: ' },
    { id: 'moving-dday-v1', label: '기준일 전후 준비', description: '한 날짜를 기준으로 앞뒤 할 일을 적어요.', exampleLabel: '이사 준비', exampleSource: '# 이사 준비\n- 기준일: 2026-10-10\n\n## 계약\n- [ ] 주소 변경 신청\n  - 상대 날짜: D-7', scaffold: '# \n- 기준일: \n\n## \n- [ ] \n  - 상대 날짜: ' },
    { id: 'wedding-dday-v1', label: '기준일 전후 준비 + 자료', description: '앞뒤 할 일과 참고 링크를 함께 적어요.', exampleLabel: '결혼 준비', exampleSource: '# 결혼 준비\n- 기준일: 2027-04-17\n\n## 예약\n- [ ] 식장 계약 확인\n  - 상대 날짜: D-180\n  - 자료: https://example.com/venue', scaffold: '# \n- 기준일: \n\n## \n- [ ] \n  - 상대 날짜: \n  - 자료: ' },
    { id: 'travel-itinerary-prep-v1', label: '준비 + 날짜별 일정', description: '사전 준비와 날짜별 시간·장소를 함께 적어요.', exampleLabel: '여행 준비와 날짜별 일정', exampleSource: '# 제주 여행\n- 기준일: 2026-10-03\n\n## 출발 전\n- [ ] 온라인 체크인\n  - 상대 날짜: D-1\n\n## 첫째 날\n- [ ] 렌터카 받기\n  - 날짜: 2026-10-03\n  - 시간: 11:00\n  - 시간대: Asia/Seoul\n  - 장소: 제주공항', scaffold: '# \n- 기준일: \n\n## \n- [ ] \n  - 상대 날짜: \n\n## \n- [ ] \n  - 날짜: \n  - 시간: \n  - 시간대: \n  - 장소: ' },
    { id: 'exam-dday-study-v1', label: '반복 준비 + 목표일', description: '반복할 일과 마지막 일정을 함께 적어요.', exampleLabel: '시험 준비', exampleSource: '# 자격시험 준비\n- 기준일: 2026-11-14\n\n- [ ] 기출문제 풀기\n  - 날짜: 2026-10-13\n  - 반복: 매주 화, 목\n  - 반복 종료: 2026-11-12\n  - 완료 기준: 오답을 다시 설명할 수 있다\n\n- [ ] 시험 응시\n  - 날짜: 2026-11-14', scaffold: '# \n- 기준일: \n\n- [ ] \n  - 날짜: \n  - 반복: \n  - 반복 종료: \n  - 완료 기준: \n\n- [ ] \n  - 날짜: ' }
  ];
  assert.deepEqual(M.TEMPLATE_CATALOG, expected);
  M.TEMPLATE_CATALOG.forEach(template => {
    const parsed = M.parseSource(template.scaffold);
    assert.equal(parsed.itemCount, 0);
    assert.equal(parsed.issues.some(issue => issue.code === 'missing-items'), true);
  });
});

test('template picker explains structure and examples without inserting UI copy', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  assert.doesNotMatch(app, /TEMPLATE_PRESENTATION/u);
  assert.match(app, /previewTemplate\.exampleSource/u);
  assert.match(app, /id="template-example-preview"/u);
  assert.match(app, /role="region"[^>]*aria-labelledby="template-example-label"/u);
  assert.match(app, /examplePreview\.removeAttribute\('aria-live'\)/u);
  assert.match(app, /exampleLabel\.setAttribute\('aria-live', 'polite'\)/u);
  assert.match(app, /data-template-preview-id/u);
  assert.match(app, /setAuthoringTemplatePreview/u);
  assert.match(app, /document\.addEventListener\('focusin'/u);
  assert.match(app, /\['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'Home', 'End'\]/u);
  assert.match(app, /틀 이름·설명·예시는 원문에 들어가지 않습니다/u);
  M.TEMPLATE_CATALOG.forEach(template => {
    assert.equal(template.scaffold.includes(template.label), false);
    assert.equal(template.scaffold.includes(template.description), false);
    assert.equal(template.scaffold.includes(template.exampleLabel), false);
    assert.equal(template.scaffold.includes(template.exampleSource), false);
  });
});

test('recognized blank ghosts preserve CRLF and trailing-newline source bytes without becoming source', () => {
  const source = [
    '# ',
    '## ',
    '- [ ] ',
    '  - [ ] ',
    '- 기준일: ',
    '  - 상대 날짜: ',
    '  - 날짜: ',
    '  - 장소: ',
    '  - 자료: ',
    '  - 완료 기준: ',
    '  - 시간: ',
    '  - 반복: ',
    '# 이미 입력함',
    '  - 날짜:  ',
    '',
  ].join('\r\n');
  const lines = M.authoringGhostLines(source);
  assert.equal(lines.map(line => line.rawLine + line.terminator).join(''), source);
  assert.equal(lines.length, 15);
  assert.deepEqual(
    lines.filter(line => line.ghost).map(line => ({
      line: line.line,
      hintId: line.ghost.hintId,
      offset: line.ghost.offset,
      text: line.ghost.text,
    })),
    [
      { line: 1, hintId: 'flow-title', offset: 2, text: '예: 8월 제주 여행 준비' },
      { line: 2, hintId: 'step-title', offset: 3, text: '예: 예약' },
      { line: 3, hintId: 'root-item', offset: 6, text: '예: 항공권 확인' },
      { line: 4, hintId: 'child-check', offset: 8, text: '예: 예약번호 확인' },
      { line: 5, hintId: 'anchor-date', offset: 7, text: '예: 2026-09-02' },
      { line: 6, hintId: 'relative-date', offset: 11, text: '예: D-7' },
      { line: 7, hintId: 'fixed-date', offset: 8, text: '예: 2026-09-02' },
      { line: 8, hintId: 'place', offset: 8, text: '예: 김포공항' },
      { line: 9, hintId: 'resource', offset: 8, text: '예: https://example.com' },
      { line: 10, hintId: 'completion-criteria', offset: 11, text: '예: 예약번호를 메모에 남김' },
    ],
  );
  assert.equal(lines[10].ghost, null);
  assert.equal(lines[11].ghost, null);
  assert.equal(lines[12].ghost, null);
  assert.equal(lines[13].ghost, null);
  assert.equal(lines[14].rawLine, '');
  assert.equal(lines[14].terminator, '');
});

test('inline input examples stay a non-editable aria-hidden overlay owned by one textarea', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(app, /id="authoring-ghost-toggle"/u);
  assert.match(app, /aria-pressed="/u);
  assert.match(app, />입력 예시<\/button>/u);
  assert.match(app, /id="authoring-ghost-overlay"[^>]*aria-hidden="true"/u);
  assert.match(app, /id="authoring-ghost-scroll"/u);
  assert.equal((app.match(/<textarea id="flow-editor"/gu) || []).length, 1);
  assert.equal((app.match(/contenteditable/gu) || []).length, 0);
  assert.match(style, /\.authoring-ghost-overlay[^}]*pointer-events:\s*none/su);
  assert.match(style, /\.authoring-ghost-overlay[^}]*user-select:\s*none/su);
  assert.match(style, /\.authoring-ghost-overlay[^}]*overflow:\s*hidden/su);
});

test('template browsing is zero-source-write and insertion fails closed on non-empty source', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const pickerStart = app.indexOf('function setTemplatePickerOpen');
  const pickerEnd = app.indexOf('function renderReceipt', pickerStart);
  assert.ok(pickerStart >= 0 && pickerEnd > pickerStart);
  const pickerController = app.slice(pickerStart, pickerEnd);
  assert.doesNotMatch(pickerController, /rawText\s*=/u);
  assert.doesNotMatch(pickerController, /M\.writeEnvelope|localStorage|setItem/u);
  assert.match(app, /authoring\.rawText\.length > 0/u);
  assert.match(app, /editor\.value !== authoring\.rawText/u);
  assert.equal((app.match(/editor\.setRangeText\(/gu) || []).length, 0);
  assert.equal((app.match(/document\.execCommand\('insertText'/gu) || []).length, 2);
  assert.match(app, /nativeSourcePlanInputEventCount > 0/u);
  assert.match(app, /commandAccepted === true && editor\.value === template\.scaffold/u);
  assert.doesNotMatch(app, /templateEditHistory|wantsUndo|wantsRedo/u);
  assert.doesNotMatch(app, /현재 원문을 선택한 구조 틀로 바꿀까요/u);
  assert.match(app, /작성 틀을 닫았어요/u);
});

test('authoring uses compact input and result states with optional review and no manual source checkbox', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.doesNotMatch(app, /id="source-confirmed"/u);
  assert.doesNotMatch(app, />1 작성</u);
  assert.doesNotMatch(app, />2 구조 확인</u);
  assert.doesNotMatch(app, />3 저장</u);
  assert.match(app, /id="authoring-tab-input"/u);
  assert.match(app, /id="authoring-tab-result"/u);
  assert.match(app, /id="authoring-review"/u);
  assert.match(app, /현재 원문을 실행할 Item으로 정리한 결과/u);
  assert.match(style, /\.authoring-mobile-tabs/u);
  assert.match(style, /\.authoring-save-action[^}]*position: sticky/u);
  assert.match(style, /\.template-choice\[data-preview-active="true"\]/u);
  assert.match(style, /@media \(max-width: 1023px\)[\s\S]*\.authoring-pane\.active \{ display: block; \}/u);
});

test('standalone visual layer uses the v4.1 white gray teal flat-list contract', () => {
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(style, /--bg: #ffffff/u);
  assert.match(style, /--surface-soft: #f5f7f8/u);
  assert.match(style, /--blue: #087f73/u);
  assert.match(style, /\.flow-row, \.task-row \{ border: 0; border-bottom: 1px solid var\(--line\); border-radius: 0/u);
  assert.match(style, /\.mobile-header-link \{ min-height: 48px/u);
  assert.match(style, /--standalone-safe-bottom: env\(safe-area-inset-bottom, 0px\)/u);
  assert.match(style, /\.toast \{[^}]*var\(--standalone-safe-bottom\)/u);
  assert.match(style, /dialog \{ width: calc\(100vw - 16px - var\(--standalone-safe-left\) - var\(--standalone-safe-right\)\)/u);
  assert.match(style, /\.app-shell\.app-shell-wide \{ grid-template-columns: minmax\(0, 1fr\); \}/u);
});

test('parser preserves source, ignores prose and resolves explicit dates only', () => {
  const source = validSource();
  const parsed = M.parseSource(source);
  assert.equal(parsed.rawText, source);
  assert.equal(parsed.sourceFingerprint, M.fingerprint(source));
  assert.equal(parsed.title, '이사 전 준비');
  assert.equal(parsed.itemCount, 2);
  assert.equal(parsed.ignoredLineCount, 1);
  assert.equal(parsed.steps[0].items[0].date, '2026-09-06');
  assert.equal(parsed.steps[1].items[0].date, '2026-09-20');
  assert.equal(parsed.steps[1].items[0].time, '10:30');
  assert.deepEqual(parsed.issues, []);
});

test('invalid nonblank date, time, timezone, URL and relative date block handoff', () => {
  const source = '# 잘못된 입력\n- 기준일: 2026-02-30\n## 단계\n- [ ] 확인\n  - 날짜: 2026-13-01\n  - 시간: 25:00\n  - 시간대: Seoul\n  - 자료: javascript:alert(1)\n  - 상대 날짜: 다음주';
  const codes = M.parseSource(source).issues.map(issue => issue.code);
  assert.deepEqual(codes, ['invalid-anchor-date', 'invalid-date', 'invalid-time', 'invalid-timezone', 'invalid-url', 'invalid-relative-date']);
});

test('four saved-plan origins seed once and remain collision-free', () => {
  const state = M.seedState();
  assert.deepEqual(M.validate(state), []);
  assert.deepEqual(state.flows.map(flow => flow.origin), ['source-backed-map', 'personal-draft', 'canonical-personal-copy', 'legacy-saved-plan']);
  assert.equal(state.flows.every(flow => flow.folderId === null), true);
  assert.equal(new Set(state.flows.map(flow => flow.ref)).size, 4);
  const itemRefs = state.tasks.filter(task => task.flowId).map(task => task.ref);
  assert.equal(new Set(itemRefs).size, itemRefs.length);
});

test('explicit authoring handoff commits atomically and preserves raw source', () => {
  const before = M.initialEnvelope();
  const handoff = confirmedHandoff();
  const result = M.transitionEnvelope(before, { type: 'commit-authoring', handoff, now: '2026-09-02T01:00:00.000Z' });
  assert.equal(result.changed, true);
  assert.equal(result.envelope.state.revision, 1);
  assert.equal(result.envelope.state.flows.length, before.state.flows.length + 1);
  assert.equal(result.envelope.state.tasks.length, before.state.tasks.length + 2);
  const receipt = result.envelope.state.lastReceipt;
  const flow = stateFlow(result.envelope.state, receipt.flowId);
  assert.equal(flow.origin, 'authoring-handoff');
  assert.equal(flow.rawText, handoff.rawText);
  assert.equal(flow.sourceFingerprint, M.fingerprint(handoff.rawText));
  assert.equal(flow.folderId, 'move');
  assert.equal(flow.savedCopyId, 'poc-handoff-a');
  assert.equal(flow.sourceFlowId, 'authoring-draft-a');
  assert.equal(flow.ref, 'saved-flow:poc-handoff-a:authoring-draft-a');
  flow.steps.flatMap(step => step.itemIds).forEach(id => {
    const item = stateTask(result.envelope.state, id);
    assert.equal(item.flowId, flow.id);
    assert.equal(item.folderId, null);
    assert.equal(M.effectiveFolder(result.envelope.state, item), 'move');
    assert.match(item.ref, /^flow-item:poc-handoff-a:authoring-draft-a:item-\d+$/u);
  });
  assert.deepEqual(M.validate(result.envelope.state), []);
  assert.deepEqual(result.envelope.undo, before.state);
});

test('same source from different drafts has a stable handoff identity and causes no duplicate state mutation', () => {
  const firstHandoff = confirmedHandoff({ draftId: 'draft-a', handoffId: undefined });
  const secondHandoff = confirmedHandoff({ draftId: 'draft-b', handoffId: undefined });
  assert.equal(firstHandoff.handoffId, secondHandoff.handoffId);
  const first = M.transitionEnvelope(M.initialEnvelope(), { type: 'commit-authoring', handoff: firstHandoff });
  const beforeBytes = JSON.stringify(first.envelope);
  const second = M.transitionEnvelope(first.envelope, { type: 'commit-authoring', handoff: secondHandoff });
  assert.equal(second.changed, false);
  assert.equal(second.error, undefined);
  assert.equal(JSON.stringify(second.envelope), beforeBytes);
  assert.equal(second.envelope.state.flows.filter(flow => flow.handoffId === firstHandoff.handoffId).length, 1);
});

test('unconfirmed or invalid source fails closed with zero mutation', () => {
  const envelope = M.initialEnvelope();
  const before = JSON.stringify(envelope);
  const unconfirmed = confirmedHandoff({ sourceConfirmed: false });
  const rejected = M.transitionEnvelope(envelope, { type: 'commit-authoring', handoff: unconfirmed });
  assert.equal(rejected.changed, false);
  assert.equal(rejected.error, 'source-unconfirmed');
  assert.equal(JSON.stringify(rejected.envelope), before);
  const invalid = M.makeHandoff('# 제목\n그냥 메모', { draftId: 'x', handoffId: 'x', sourceConfirmed: true });
  const invalidResult = M.transitionEnvelope(envelope, { type: 'commit-authoring', handoff: invalid });
  assert.equal(invalidResult.changed, false);
  assert.equal(invalidResult.error, 'invalid-source');
  assert.equal(JSON.stringify(invalidResult.envelope), before);
});

test('quick item supports date, folder, completion, reopen and undo', () => {
  let envelope = M.initialEnvelope();
  envelope = M.transitionEnvelope(envelope, { type: 'add-quick', title: '전입 신고', date: null, folderId: null }).envelope;
  const id = envelope.state.tasks.find(task => task.title === '전입 신고').id;
  envelope = M.transitionEnvelope(envelope, { type: 'schedule', id, date: M.TODAY }).envelope;
  envelope = M.transitionEnvelope(envelope, { type: 'move-folder', kind: 'task', id, folderId: 'admin' }).envelope;
  envelope = M.transitionEnvelope(envelope, { type: 'complete', id, done: true }).envelope;
  assert.equal(stateTask(envelope.state, id).date, M.TODAY);
  assert.equal(stateTask(envelope.state, id).folderId, 'admin');
  assert.equal(stateTask(envelope.state, id).done, true);
  const reopened = M.transitionEnvelope(envelope, { type: 'complete', id, done: false });
  assert.equal(stateTask(reopened.envelope.state, id).done, false);
  const undone = M.undoEnvelope(reopened.envelope);
  assert.equal(undone.changed, true);
  assert.equal(stateTask(undone.envelope.state, id).done, true);
});

test('Flow Item date movement keeps source date and Flow membership', () => {
  const envelope = M.initialEnvelope();
  const original = stateTask(envelope.state, 'contract');
  const moved = M.transitionEnvelope(envelope, { type: 'schedule', id: 'contract', date: M.TODAY });
  const item = stateTask(moved.envelope.state, 'contract');
  assert.equal(item.date, M.TODAY);
  assert.equal(item.sourceDate, original.sourceDate);
  assert.equal(item.flowId, original.flowId);
  assert.equal(item.folderId, null);
});

test('one staged personal-plan commit preserves source and drives all four result projections', () => {
  const before = M.initialEnvelope();
  const flow = stateFlow(before.state, 'moving');
  const sourceTitle = flow.sourceTitle;
  const sourceItemTitle = stateTask(before.state, 'quote').sourceTitle;
  const committed = M.transitionEnvelope(before, {
    type: 'commit-personal-plan',
    flowId: 'moving',
    title: '내 이사 준비',
    items: [
      { id: 'quote', title: '내 견적 비교', memo: '세 곳에 같은 조건으로 요청', planDate: '2026-09-08' },
      { id: 'contract', title: '계약 확인', memo: '', planDate: null }
    ]
  });
  assert.equal(committed.changed, true);
  assert.equal(committed.envelope.state.revision, before.state.revision + 1);
  assert.equal(stateFlow(committed.envelope.state, 'moving').sourceTitle, sourceTitle);
  assert.equal(stateTask(committed.envelope.state, 'quote').sourceTitle, sourceItemTitle);
  assert.equal(stateTask(committed.envelope.state, 'quote').sourceDate, null);
  const scheduled = M.transitionEnvelope(committed.envelope, { type: 'schedule', id: 'quote', date: '2026-09-09' });
  const projection = M.resultProjection(scheduled.envelope.state, 'moving');
  assert.deepEqual(projection.itemRefs, projection.todo);
  assert.deepEqual(projection.itemRefs, projection.items.map(item => item.ref));
  assert.equal(projection.items[0].date, '2026-09-08');
  assert.equal(projection.items[0].executionDate, '2026-09-09');
  assert.deepEqual(projection.calendar['2026-09-09'], [projection.itemRefs[0]]);
  assert.equal((projection.calendar['2026-09-08'] || []).includes(projection.itemRefs[0]), false);
  assert.equal(projection.sheet[0].planDate, '2026-09-08');
  assert.equal(projection.sheet[0].executionDate, '2026-09-09');
  assert.match(projection.textLines.join('\n'), /내 이사 준비[\s\S]*내 견적 비교[\s\S]*계획 날짜: 2026-09-08[\s\S]*메모: 세 곳/u);
  assert.match(projection.txt, /1\. ☐ 내 견적 비교/u);
  const undone = M.undoEnvelope(committed.envelope);
  assert.equal(undone.changed, true);
  assert.equal(stateFlow(undone.envelope.state, 'moving').title, '이사 준비 저장본');
  assert.equal(stateTask(undone.envelope.state, 'quote').title, '견적 3곳 비교');
});

test('personal-plan rejects foreign or malformed staged values with zero mutation', () => {
  const envelope = M.initialEnvelope();
  const before = JSON.stringify(envelope);
  const result = M.transitionEnvelope(envelope, {
    type: 'commit-personal-plan',
    flowId: 'moving',
    title: '개인 제목',
    items: [{ id: 'call', title: '빠른 할 일 침범', memo: '', planDate: null }]
  });
  assert.equal(result.changed, false);
  assert.equal(result.error, 'invalid-plan-items');
  assert.equal(JSON.stringify(result.envelope), before);
});

test('QuickItem detail edit uses one dedicated transition and remains undoable', () => {
  const before = M.initialEnvelope();
  const edited = M.transitionEnvelope(before, {
    type: 'update-quick',
    id: 'call',
    title: '관리실 엘리베이터 예약',
    memo: '오전 10시 사용 가능 여부 확인',
    date: '2026-09-04',
    folderId: 'admin',
  });
  assert.equal(edited.changed, true);
  assert.deepEqual(
    (({ title, memo, date, folderId }) => ({ title, memo, date, folderId }))(stateTask(edited.envelope.state, 'call')),
    {
      title: '관리실 엘리베이터 예약',
      memo: '오전 10시 사용 가능 여부 확인',
      date: '2026-09-04',
      folderId: 'admin',
    },
  );
  assert.equal(edited.envelope.state.revision, before.state.revision + 1);
  assert.equal(M.undoEnvelope(edited.envelope).envelope.state.tasks.find(task => task.id === 'call').title, '관리실에 전화');

  const rejected = M.transitionEnvelope(before, {
    type: 'update-quick',
    id: 'quote',
    title: 'Flow Item 침범',
    memo: '',
    date: null,
    folderId: null,
  });
  assert.equal(rejected.changed, false);
  assert.equal(rejected.error, 'invalid-quick-item');
  assert.equal(rejected.envelope, before);
});

test('same position and order are no-op transitions', () => {
  const envelope = M.initialEnvelope();
  const sameDate = M.transitionEnvelope(envelope, { type: 'schedule', id: 'meeting', date: M.TODAY });
  assert.equal(sameDate.changed, false);
  assert.equal(sameDate.envelope, envelope);
  const ids = M.viewTaskIds(envelope.state, 'today');
  const sameOrder = M.transitionEnvelope(envelope, { type: 'reorder', context: 'today', ids });
  assert.equal(sameOrder.changed, false);
  assert.equal(sameOrder.envelope, envelope);
});

test('manual order stays scoped to its exact view', () => {
  const envelope = M.initialEnvelope();
  const today = M.viewTaskIds(envelope.state, 'today');
  const weekBefore = M.viewTaskIds(envelope.state, 'week');
  const reordered = M.transitionEnvelope(envelope, { type: 'reorder', context: 'today', ids: today.slice().reverse() });
  assert.deepEqual(M.viewTaskIds(reordered.envelope.state, 'today'), today.slice().reverse());
  assert.deepEqual(M.viewTaskIds(reordered.envelope.state, 'week'), weekBefore);
  const app = fs.readFileSync(appPath, 'utf8');
  assert.match(app, /function renderMovePanelBody\(target\)[\s\S]*data-action="move-up"[\s\S]*data-action="move-down"/u);
  assert.match(app, /return transition\(\{ type: 'reorder', context, ids: reordered \}\)/u);
  assert.match(app, /event\.altKey[\s\S]*moveOrder/u);
  assert.match(app, /reorderAtPosition\(dragged\.id, row\.dataset\.taskId, row\.dataset\.context, row\.dataset\.dropPosition === 'after' \? 'after' : 'before'\)/u);
  assert.match(app, /class="drag-handle"[\s\S]*draggable="true"/u);
  assert.doesNotMatch(app, /class="task-row[^\n]*draggable="true"/u);
  assert.match(app, /closest\('\.drag-handle\[draggable="true"\]'\)/u);
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(style, /\.drag-handle \{[^}]*width: 48px;[^}]*min-width: 48px;[^}]*height: 48px;/u);
  assert.match(style, /\.task-row \{[^}]*touch-action: pan-y;/u);
});

test('move menu restores top and bottom actions through the same reorder transition', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  assert.match(app, /data-action="move-top"[\s\S]*>맨 위<\/button>[\s\S]*data-action="move-up"[\s\S]*data-action="move-down"[\s\S]*data-action="move-bottom"[\s\S]*>맨 아래<\/button>/u);
  assert.match(app, /function moveOrderToEdge\(id, context, edge\)[\s\S]*edge === 'top' \? 0 : ids\.length - 1[\s\S]*commitPeerOrder\(context, ids, reordered\)/u);
  assert.match(app, /function commitPeerOrder\(context, peerIds, reorderedPeers\)[\s\S]*return transition\(\{ type: 'reorder', context, ids: reordered \}\)/u);
  assert.match(app, /action === 'move-top'[\s\S]*moveOrderToEdge\([^)]*'top'\)[\s\S]*action === 'move-bottom'[\s\S]*moveOrderToEdge\([^)]*'bottom'\)/u);
});

test('month timeline gives every visible date an accessible QuickItem entry point', () => {
  const date = M.addDays(M.TODAY, 6);
  const added = M.transitionEnvelope(M.initialEnvelope(), { type: 'add-quick', title: '날짜별 추가', date, folderId: null });
  const quick = added.envelope.state.tasks.find(task => task.title === '날짜별 추가');
  assert.equal(quick.date, date);
  assert.equal(M.viewTaskIds(added.envelope.state, 'month').includes(quick.id), true);

  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(app, /function renderMonthTaskGroups\(ids\)[\s\S]*allDates[\s\S]*showEmptyMonthDates \? allDates : activeDates/u);
  assert.match(app, /class="period-day"[\s\S]*aria-labelledby=[\s\S]*class="month-date-add"[\s\S]*data-action="add-quick" data-date=/u);
  assert.match(app, /할 일 없는 날짜 ' \+ emptyDateCount \+ '일 보기/u);
  assert.match(app, /action === 'toggle-empty-month'[\s\S]*showEmptyMonthDates = !showEmptyMonthDates[\s\S]*빈 날짜를 펼쳤어요/u);
  assert.match(style, /\.month-date-add, \.month-empty-toggle \{[^}]*min-height: 44px;/u);
});

test('desktop reorder corridor exposes before and after lines, live position copy, and edge auto-scroll', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(app, /function reorderAtPosition\(sourceId, targetId, context, position\)[\s\S]*position === 'after' \? targetIndex \+ 1 : targetIndex/u);
  assert.match(app, /function dropPosition\(row, clientY\)[\s\S]*bounds\.top \+ bounds\.height \/ 2 \? 'after' : 'before'/u);
  assert.match(app, /function showDropPosition\(row, position\)[\s\S]*position === 'after' \? 'drop-after' : 'drop-before'[\s\S]*아직 저장 안 됨/u);
  assert.match(app, /function updateDragAutoScroll\(clientY\)[\s\S]*prefers-reduced-motion: reduce[\s\S]*requestAnimationFrame\(runDragAutoScroll\)/u);
  assert.match(app, /dragged\.list\.classList\.add\('reorder-corridor'\)/u);
  assert.match(app, /if \(dragged\) updateDragAutoScroll\(event\.clientY\)/u);
  assert.match(app, /event\.key === 'Escape' && dragged[\s\S]*finishDrag\(\)/u);
  assert.match(app, /window\.addEventListener\('blur'[\s\S]*if \(dragged\)[\s\S]*finishDrag\(\)/u);
  assert.match(app, /window\.addEventListener\('resize'[\s\S]*if \(dragged\)[\s\S]*finishDrag\(\)/u);
  assert.match(app, /document\.addEventListener\('visibilitychange'[\s\S]*document\.hidden[\s\S]*finishDrag\(\)/u);
  assert.match(app, /목록 순서는 오른쪽 손잡이 통로에서 바꿉니다/u);
  assert.match(style, /\.task-list\.reorder-corridor \{[^}]*outline:/u);
  assert.match(style, /\.task-row\.drop-before::before, \.task-row\.drop-after::after \{[^}]*height: 3px;/u);
  assert.match(style, /\.task-row\.drop-before::before \{ top: -2px; \}/u);
  assert.match(style, /\.task-row\.drop-after::after \{ bottom: -2px; \}/u);
});

test('touch order menu starts only on the handle and canceled gestures suppress one follow-up click', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(app, /class="drag-handle"[\s\S]*data-id=[\s\S]*data-context=[\s\S]*aria-describedby=/u);
  assert.match(app, /const handle = event\.target\.closest\('\.drag-handle'\);[\s\S]*openMovePanel\(handle\.dataset\.moveKind, handle\.dataset\.id, handle\.dataset\.context, handle, true\)/u);
  assert.match(app, /class="visually-hidden">손잡이를 짧게 누르거나 Enter 또는 Space/u);
  assert.match(app, /350밀리초 길게 누르거나 마우스로 끌어도 같은 이동 대상을 사용합니다/u);
  assert.match(app, /8픽셀 전에 움직이거나 목록 밖에 놓거나 Escape, pointer cancel, 창 이탈, 화면 크기 변경/u);
  assert.match(app, /const LONG_PRESS_DELAY_MS = 350/u);
  assert.match(app, /const LONG_PRESS_CANCEL_DISTANCE_PX = 8/u);
  assert.match(app, /event\.target\.closest\('\.drag-handle'\)/u);
  assert.doesNotMatch(app, /event\.target\.closest\('\.task-row'\)[\s\S]{0,240}setTimeout/u);
  assert.match(app, /const distance = Math\.hypot\([\s\S]*pointerOrigin\.phase === 'armed' && distance >= LONG_PRESS_CANCEL_DISTANCE_PX/u);
  assert.match(app, /document\.addEventListener\('pointercancel'[\s\S]*cancelHandlePress\('손잡이 누르기 취소', true\)/u);
  assert.match(app, /document\.addEventListener\('pointercancel'[\s\S]*event\.pointerType === 'mouse' && event\.isTrusted[\s\S]*suppressNextHandleClick\(handle\)[\s\S]*finishDrag\(\)/u);
  assert.match(app, /document\.addEventListener\('scroll'[\s\S]*cancelHandlePress\('스크롤로 누르기 취소', true\)[\s\S]*\}, true\)/u);
  assert.match(app, /consumeSuppressedHandleClick\(handle\)[\s\S]*event\.stopImmediatePropagation\(\)/u);
  assert.match(app, /suppressedHandleClick = null;[\s\S]*return true;/u);
  assert.match(app, /function finishDrag\(\)[\s\S]*stopDragAutoScroll\(\)[\s\S]*classList\.remove\('dragging', 'drop-target', 'drop-before', 'drop-after', 'reorder-corridor'\)[\s\S]*dragged = null/u);
  assert.match(app, /finally \{[\s\S]*finishDrag\(\)/u);
  assert.match(app, /document\.addEventListener\('dragend', \(\) => \{[\s\S]*이동을 취소했어요[\s\S]*finishDrag\(\)/u);
  assert.match(style, /\.visually-hidden \{[^}]*clip: rect\(0 0 0 0\)/u);
  assert.match(style, /\.drag-handle \{[^}]*touch-action: none;[^}]*user-select: none;/u);
});

test('standalone movement uses one left nonmodal panel for Task and Flow with neutral and zero-write exits', () => {
  const shell = fs.readFileSync(shellPath, 'utf8');
  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(shell, /<aside[\s\S]*id="move-panel"[\s\S]*role="dialog"[\s\S]*aria-modal="false"[\s\S]*hidden/u);
  assert.match(shell, /class="move-panel-kicker">이동할 곳</u);
  assert.match(shell, /id="save-status"[^>]*role="status"[^>]*aria-live="polite"/u);
  assert.match(shell, /id="move-panel-status"[^>]*aria-live="off"/u);
  assert.match(shell, /id="toast"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/u);
  assert.match(shell, /id="toast-retry"[^>]*data-action="retry"/u);
  assert.equal((shell.match(/aria-live="polite"/gu) || []).length, 2);
  assert.match(shell, /<dialog id="dialog"/u);
  assert.match(style, /\.move-panel \{[\s\S]*position: fixed;[\s\S]*left: var\(--standalone-safe-left\);[\s\S]*width: min\(300px, calc\(100vw - 168px[\s\S]*overflow-y: auto;/u);
  assert.match(style, /\.move-panel\[hidden\] \{ display: none; \}/u);
  assert.match(style, /\.move-destination\[aria-current="true"\][^}]*background: var\(--surface-soft\)/u);
  assert.match(style, /\.move-panel-head \.icon-button \{ min-width: 48px; min-height: 48px; \}/u);
  assert.match(style, /\.move-destination \{ min-height: 48px;/u);

  assert.match(app, /data-move-kind="task"[\s\S]*aria-controls="move-panel"[\s\S]*aria-expanded=/u);
  assert.match(app, /data-move-kind="flow"[\s\S]*aria-controls="move-panel"[\s\S]*aria-expanded=/u);
  assert.match(app, /function openMovePanel\(kind, id, context, opener, focusPanel\)/u);
  assert.match(app, /action === 'task-menu'\) openTaskMenu\([^;]*control, true\)/u);
  assert.match(app, /action === 'flow-menu'\) openFlowMenu\([^;]*control, true\)/u);
  assert.match(app, /moveHandle && \(event\.key === 'Enter' \|\| event\.key === ' '\)[\s\S]*openMovePanel\(/u);
  assert.match(app, /document\.addEventListener\('dragstart'[\s\S]*openMovePanel\(kind, id, row\.dataset\.context, handle, false\)/u);
  assert.match(app, /window\.setTimeout\([\s\S]*openMovePanel\(gesture\.kind, gesture\.id, gesture\.context, gesture\.handle, false\)[\s\S]*LONG_PRESS_DELAY_MS/u);

  assert.match(app, /data-move-destination="folder"[\s\S]*data-current="' \+ current/u);
  assert.match(app, /data-move-destination="date"[\s\S]*data-current="' \+ current/u);
  assert.match(app, /const changed = transition\(\{ type: 'move-folder', kind: moveTarget\.kind, id: moveTarget\.id, folderId \}\)/u);
  assert.match(app, /const changed = transition\(\{ type: 'schedule', id: moveTarget\.id, date: control\.dataset\.date \|\| null \}\)/u);
  assert.match(app, /이미 같은 위치입니다\./u);
  assert.match(app, /Flow Item의 폴더는 부모 Flow와 함께 이동합니다\./u);
  assert.match(app, /event\.key === 'Escape' && movePanelOpen\(\)[\s\S]*이동을 취소했어요/u);
  assert.match(app, /document\.addEventListener\('pointercancel'[\s\S]*이동을 취소했어요/u);
  assert.match(app, /window\.addEventListener\('blur'[\s\S]*이동을 취소했어요/u);
  assert.match(app, /window\.addEventListener\('resize'[\s\S]*화면 크기가 바뀌어 이동을 취소했어요/u);
  const cancelSection = app.slice(app.indexOf("if (event.key === 'Escape' && movePanelOpen())"), app.indexOf("document.addEventListener('pointerdown'"));
  assert.doesNotMatch(cancelSection, /transition\(|writeCandidate\(|M\.writeEnvelope/u);
});

test('folder deletion keeps content and moves it to unfiled', () => {
  let envelope = M.initialEnvelope();
  envelope = M.transitionEnvelope(envelope, { type: 'move-folder', kind: 'flow', id: 'moving', folderId: 'move' }).envelope;
  const deleted = M.transitionEnvelope(envelope, { type: 'delete-folder', id: 'move' });
  assert.equal(deleted.changed, true);
  assert.equal(stateFlow(deleted.envelope.state, 'moving').folderId, null);
  assert.equal(deleted.envelope.state.folders.some(folder => folder.id === 'move'), false);
  assert.equal(deleted.envelope.state.folders.find(folder => folder.id === 'admin').parentId, null);
  assert.deepEqual(M.validate(deleted.envelope.state), []);
});

test('write, reload and exact reset preserve seeded operating bytes', () => {
  const operating = {
    'flow:saved:plans': '{"opaque":true,"spacing":"kept"}',
    'flow:canonical:bundle': '00ff\nraw',
    'another:key': 'unchanged'
  };
  const storage = M.createMemoryStorage(operating);
  const before = storage.snapshot();
  const envelope = M.transitionEnvelope(M.initialEnvelope(), { type: 'complete', id: 'meeting', done: true }).envelope;
  M.writeEnvelope(storage, envelope);
  const restored = M.loadEnvelope(storage);
  assert.equal(restored.status, 'restored');
  assert.equal(stateTask(restored.envelope.state, 'meeting').done, true);
  Object.keys(operating).forEach(key => assert.equal(storage.snapshot()[key], before[key]));
  M.writeAuthoringDraft(storage, {
    draftId: 'draft-reset',
    rawText: '# 작성 중',
    templateId: 'moving-dday-v1',
    folderId: 'move'
  });
  const mutatingCalls = storage.calls.filter(call => call[0] === 'setItem' || call[0] === 'removeItem');
  assert.equal(mutatingCalls.every(call => call[1] === M.STORAGE_KEY || call[1] === M.DRAFT_STORAGE_KEY), true);
  M.resetPoc(storage);
  assert.equal(storage.snapshot()[M.STORAGE_KEY], undefined);
  assert.equal(storage.snapshot()[M.DRAFT_STORAGE_KEY], undefined);
  assert.deepEqual(storage.snapshot(), operating);
});

test('authoring commit writes state and removes its draft as one exact two-key transaction', () => {
  const operating = { 'flow:saved:plans': '  keep exact bytes  ' };
  const storage = M.createMemoryStorage(operating);
  M.writeAuthoringDraft(storage, {
    draftId: 'draft-atomic',
    rawText: validSource(),
    templateId: null,
    folderId: null
  });
  const result = M.transitionEnvelope(M.initialEnvelope(), {
    type: 'commit-authoring',
    handoff: confirmedHandoff({ handoffId: undefined })
  });
  assert.equal(result.changed, true);
  const bytes = M.writeAuthoringCommit(storage, result.envelope);
  assert.equal(storage.snapshot()[M.STORAGE_KEY], bytes);
  assert.equal(storage.snapshot()[M.DRAFT_STORAGE_KEY], undefined);
  assert.equal(storage.snapshot()['flow:saved:plans'], operating['flow:saved:plans']);
  const mutations = storage.calls.filter(call => call[0] === 'setItem' || call[0] === 'removeItem');
  assert.equal(mutations.every(call => call[1] === M.STORAGE_KEY || call[1] === M.DRAFT_STORAGE_KEY), true);
});

test('authoring commit restores both exact bytes when draft cleanup fails', () => {
  const beforeState = JSON.stringify(M.initialEnvelope());
  const beforeDraft = '{"version":1,"draftId":"draft-before","rawText":"# before","templateId":null,"folderId":null}';
  const operatingKey = 'flow:saved:plans';
  const values = new Map([
    [M.STORAGE_KEY, beforeState],
    [M.DRAFT_STORAGE_KEY, beforeDraft],
    [operatingKey, '  operating bytes  ']
  ]);
  let failDraftRemove = true;
  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) {
      if (key === M.DRAFT_STORAGE_KEY && failDraftRemove) {
        failDraftRemove = false;
        throw new Error('blocked-draft-cleanup');
      }
      values.delete(key);
    }
  };
  const result = M.transitionEnvelope(M.initialEnvelope(), {
    type: 'commit-authoring',
    handoff: confirmedHandoff({ handoffId: undefined })
  });
  assert.throws(() => M.writeAuthoringCommit(storage, result.envelope), /blocked-draft-cleanup/u);
  assert.equal(values.get(M.STORAGE_KEY), beforeState);
  assert.equal(values.get(M.DRAFT_STORAGE_KEY), beforeDraft);
  assert.equal(values.get(operatingKey), '  operating bytes  ');
});

test('authoring draft restores raw text and template without persisting UI or manual history ownership', () => {
  const storage = M.createMemoryStorage({ 'flow:saved:plans': 'keep-bytes' });
  const draft = {
    draftId: 'draft-reload',
    rawText: '# 작성 중 Flow\n\n## 준비\n- [ ] 확인',
    templateId: 'moving-dday-v1',
    templatePickerOpen: true,
    sourceConfirmed: true,
    folderId: 'move'
  };
  const bytes = M.writeAuthoringDraft(storage, draft);
  assert.equal(storage.snapshot()[M.DRAFT_STORAGE_KEY], bytes);
  const restored = M.loadAuthoringDraft(storage);
  assert.equal(restored.status, 'restored');
  assert.equal(restored.authoring.rawText, draft.rawText);
  assert.equal(restored.authoring.templateId, draft.templateId);
  assert.equal(restored.authoring.folderId, 'move');
  assert.equal(restored.authoring.sourceConfirmed, false);
  assert.equal(restored.authoring.templatePickerOpen, false);
  assert.equal(Object.prototype.hasOwnProperty.call(restored.authoring, 'templateEditHistory'), false);
  assert.equal(bytes.includes('templateEditHistory'), false);
  assert.equal(storage.snapshot()['flow:saved:plans'], 'keep-bytes');
  assert.equal(storage.calls.filter(call => call[0] === 'setItem' || call[0] === 'removeItem').every(call => call[1] === M.DRAFT_STORAGE_KEY), true);
});

test('corrupt authoring draft fails closed without mutation', () => {
  const corrupt = '{broken-draft';
  const storage = M.createMemoryStorage({ [M.DRAFT_STORAGE_KEY]: corrupt, 'flow:saved:plans': 'exact' });
  const result = M.loadAuthoringDraft(storage);
  assert.equal(result.status, 'corrupt');
  assert.equal(result.authoring, null);
  assert.equal(storage.snapshot()[M.DRAFT_STORAGE_KEY], corrupt);
  assert.equal(storage.snapshot()['flow:saved:plans'], 'exact');
  assert.equal(storage.calls.some(call => call[0] === 'setItem' || call[0] === 'removeItem'), false);
});

test('two-key reset rolls both PoC bytes back when the second removal fails', () => {
  const original = {
    [M.STORAGE_KEY]: JSON.stringify(M.initialEnvelope()),
    [M.DRAFT_STORAGE_KEY]: '{"version":1,"draft":"opaque"}',
    'flow:saved:plans': 'operating-exact'
  };
  const memory = M.createMemoryStorage(original);
  let failDraftRemovalOnce = true;
  const storage = {
    getItem(key) { return memory.getItem(key); },
    setItem(key, value) { return memory.setItem(key, value); },
    removeItem(key) {
      if (key === M.DRAFT_STORAGE_KEY && failDraftRemovalOnce) {
        failDraftRemovalOnce = false;
        throw new Error('blocked-second-remove');
      }
      return memory.removeItem(key);
    }
  };
  assert.throws(() => M.resetPoc(storage), /blocked-second-remove/u);
  assert.deepEqual(memory.snapshot(), original);
});

test('corrupt payload fails closed without writing or deleting it', () => {
  const corrupt = '{not-json';
  const storage = M.createMemoryStorage({ [M.STORAGE_KEY]: corrupt, 'flow:saved:plans': 'bytes' });
  const result = M.loadEnvelope(storage);
  assert.equal(result.status, 'corrupt');
  assert.deepEqual(M.validate(result.envelope.state), []);
  assert.equal(storage.snapshot()[M.STORAGE_KEY], corrupt);
  assert.equal(storage.snapshot()['flow:saved:plans'], 'bytes');
  assert.equal(storage.calls.some(call => call[0] === 'setItem' || call[0] === 'removeItem'), false);
});

test('storage exception leaves prior bytes unchanged', () => {
  const before = JSON.stringify(M.initialEnvelope());
  const storage = {
    getItem() { return before; },
    setItem() { throw new Error('quota'); },
    removeItem() { throw new Error('rollback blocked'); }
  };
  const candidate = M.transitionEnvelope(M.initialEnvelope(), { type: 'complete', id: 'meeting', done: true }).envelope;
  assert.throws(() => M.writeEnvelope(storage, candidate), /quota/);
  assert.equal(storage.getItem(M.STORAGE_KEY), before);
});

test('standalone sources contain no broad clear or operating writer', () => {
  const model = fs.readFileSync(modelPath, 'utf8');
  const app = fs.readFileSync(appPath, 'utf8');
  const joined = model + '\n' + app;
  assert.equal((joined.match(/localStorage\.clear\s*\(/gu) || []).length, 0);
  assert.equal((joined.match(/\.clear\s*\(/gu) || []).length, 0);
  assert.doesNotMatch(joined, /setItem\s*\(\s*['"]flow:(?!poc:personal-workspace:v1:standalone-integrated)/u);
  assert.doesNotMatch(joined, /removeItem\s*\(\s*['"]flow:(?!poc:personal-workspace:v1:standalone-integrated)/u);
  assert.match(app, /replace\(\/&\/g, '&amp;'\)/u);
  assert.match(app, /escapeHtml\(flow\.rawText\)/u);
});

test('app safely selects one storage and exposes volatile mode copy', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  assert.match(app, /function acquireStorage\(\)/u);
  assert.match(app, /const candidate = window\.localStorage/u);
  assert.match(app, /candidate\.getItem\(M\.STORAGE_KEY\)/u);
  assert.match(app, /candidate\.getItem\(M\.DRAFT_STORAGE_KEY\)/u);
  assert.match(app, /storage: M\.createMemoryStorage\(\), mode: 'volatile'/u);
  assert.match(app, /M\.loadEnvelope\(storage\)/u);
  assert.match(app, /M\.writeEnvelope\(storage, candidate\)/u);
  assert.match(app, /M\.writeAuthoringDraft\(storage, authoring\)/u);
  assert.match(app, /M\.resetPoc\(storage\)/u);
  assert.equal((app.match(/window\.localStorage/gu) || []).length, 1);
  assert.match(app, /임시 모드 · 새로고침하면 초기화/u);
  assert.match(app, /elements\.app\.dataset\.storageMode = storageMode/u);
  assert.doesNotMatch(app, /templateEditHistory/u);
  assert.doesNotMatch(app, /wantsUndo|wantsRedo/u);
  assert.match(app, /document\.execCommand\('insertText'/u);
});

test('standalone exposes one Plan and Item grammar across detail, staged edit, QuickItem edit and result views', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const model = fs.readFileSync(modelPath, 'utf8');
  assert.match(model, /case 'commit-personal-plan'/u);
  assert.match(model, /function resultProjection\(state, flowId, options\)/u);
  assert.match(app, /data-editor-field-group="source-read-only"/u);
  ['Flow 제목', 'Item 제목', '메모', '계획 날짜'].forEach(label => assert.match(app, new RegExp(label, 'u')));
  assert.match(app, /Plan 전체 저장/u);
  assert.match(app, /data-product-plan-item-grammar="v1"/u);
  assert.match(app, /data-action="open-item-detail"/u);
  assert.match(app, /data-testid="standalone-item-detail"/u);
  assert.match(app, /data-testid="standalone-item-editor"/u);
  assert.match(app, /action === 'result-open-item'\) openItemDetail/u);
  assert.match(app, /action === 'open-item-detail'\) openItemDetail/u);
  assert.match(app, /itemDraft\.mode === 'plan'[\s\S]*staged\.title = itemDraft\.title\.trim\(\)[\s\S]*type: 'plan-editor'/u);
  assert.match(app, /type: 'update-quick'/u);
  assert.match(app, /\['txt', 'TXT'\], \['todo', '할 일'\], \['calendar', '캘린더'\], \['sheet', '표'\]/u);
  assert.match(app, /data-result-item-refs/u);
  assert.match(app, /data-item-ref=[\s\S]*data-effective-date=[\s\S]*data-completed=/u);
  assert.match(app, /type: 'commit-personal-plan'/u);
  assert.doesNotMatch(app, /localStorage\.clear\s*\(/u);
});

test('duplicate saved copies get deterministic presentation-only labels in list and detail paths', () => {
  const state = M.seedState();
  const first = stateFlow(state, 'moving');
  const second = Object.assign({}, first, {
    id: 'moving-second-copy',
    ref: 'saved-flow:copy-map-moving-z:flow-moving',
    savedCopyId: 'copy-map-moving-z',
    title: '회사 이사 준비 저장본',
    steps: [],
  });
  state.flows.push(second);
  const sourceBytes = JSON.stringify(state);

  const displays = M.copyDisambiguation(state);
  assert.equal(displays.get('moving').displayTitle, '사본 1 · 이사 준비 저장본');
  assert.equal(displays.get('moving-second-copy').displayTitle, '사본 2 · 회사 이사 준비 저장본');
  assert.equal(M.flowDisplayTitle(state, first), '사본 1 · 이사 준비 저장본');
  assert.equal(JSON.stringify(state), sourceBytes);

  state.trashEntries = [{ kind: 'flow', id: 'moving', deletedAt: '2026-09-03T00:00:00.000Z' }];
  const afterTrash = M.copyDisambiguation(state);
  assert.equal(afterTrash.has('moving'), false);
  assert.equal(afterTrash.get('moving-second-copy').displayTitle, '회사 이사 준비 저장본');

  const app = fs.readFileSync(appPath, 'utf8');
  assert.match(app, /function flowDisplayTitle\(flow\)/u);
  assert.match(app, /escapeHtml\(displayTitle\)/u);
  assert.match(app, /<h1>' \+ escapeHtml\(flowDisplayTitle\(flow\)\)/u);
});

test('result tabs expose a controlled panel and roving Arrow Home End keyboard behavior', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  assert.match(app, /id="standalone-result-tab-' \+ entry\[0\]/u);
  assert.match(app, /aria-controls="standalone-result-panel"/u);
  assert.match(app, /tabindex="' \+ \(resultView === entry\[0\] \? '0' : '-1'\)/u);
  assert.match(app, /id="standalone-result-panel"[\s\S]*role="tabpanel"[\s\S]*aria-labelledby="standalone-result-tab-/u);
  assert.match(app, /const resultTab = event\.target\.closest\('\[role="tab"\]\[data-action="result-tab"\]'\)/u);
  assert.match(app, /\['ArrowLeft', 'ArrowRight', 'Home', 'End'\]/u);
  assert.match(app, /focusAfterRender\('#standalone-result-tab-' \+ resultView\)/u);
});

test('default product shell keeps diagnostics in data attributes and removes implementation copy', () => {
  const shell = fs.readFileSync(shellPath, 'utf8');
  const app = fs.readFileSync(appPath, 'utf8');
  ['통합 흐름 PoC · 로컬 전용', '성공한 변경 ', '원문 · 읽기 전용', '개인 shadow state', '저장 0건', '변경 0건'].forEach(copy => {
    assert.equal(app.includes(copy), false);
    assert.equal(shell.includes(copy), false);
  });
  assert.match(shell, /id="standalone-diagnostics"[^>]*hidden[^>]*aria-hidden="true"/u);
  assert.match(app, /dataset\.successfulMutations = String\(successfulMutations\)/u);
  assert.match(app, /dataset\.storageKey = M\.STORAGE_KEY/u);
  assert.match(app, /setSaveStatus\('저장 중…', 'saving'\)/u);
  assert.match(app, /setSaveStatus\('저장하지 못했어요\.', 'error'\)/u);
  assert.match(app, /showToast\([^\n]*writeCandidate\(candidate, message, onSuccess\)[^\n]*'error'\)/u);
  assert.match(app, /elements\.saveStatus\.setAttribute\('role', mode === 'error' \? 'alert' : 'status'\)/u);
  assert.match(app, /dialogReturnFocus = document\.activeElement instanceof HTMLElement/u);
  assert.match(app, /focusAfterRender\('\[autofocus\]', '#dialog \[data-action="close-dialog"\]'\)/u);
  const stagedStart = app.indexOf("if (itemDraft.mode === 'plan')");
  const stagedEnd = app.indexOf('const quickDraft = Object.assign', stagedStart);
  assert.ok(stagedStart >= 0 && stagedEnd > stagedStart);
  assert.doesNotMatch(app.slice(stagedStart, stagedEnd), /transitionEnvelope|writeCandidate|writeEnvelope|setItem/u);
});

test('authoring layout owns viewport height so editor and primary action share the first frame', () => {
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(style, /\.app-shell\.app-shell-wide \{ height: calc\(100dvh - 60px/u);
  assert.match(style, /\.authoring-shell \{[^}]*height: 100%;[^}]*grid-template-rows: auto minmax\(0, 1fr\)/u);
  assert.match(style, /\.flow-editor-frame \{[^}]*flex: 1 1 180px;[^}]*min-height: 150px/u);
  assert.match(style, /@media \(max-width: 1023px\)[\s\S]*\.authoring-pane\.active \{ display: flex !important;[\s\S]*\.authoring-input-actions \{ display: grid;/u);
  assert.match(style, /@media \(max-width: 700px\)[\s\S]*\.flow-editor-frame \{[^}]*min-height: 120px/u);
  assert.match(style, /@media \(orientation: landscape\) and \(max-height: 500px\) and \(max-width: 1023px\)[\s\S]*\.flow-editor-frame, \.flow-editor-frame \.flow-editor \{ min-height: 68px;/u);
});

test('fixed TXT todo calendar and sheet slots share one ordered Item manifest', () => {
  assert.equal(M.RESULT_PROJECTION_VERSION, 3);
  let envelope = M.initialEnvelope();
  envelope = M.transitionEnvelope(envelope, { type: 'complete', id: 'quote', done: true }).envelope;
  envelope = M.transitionEnvelope(envelope, { type: 'schedule', id: 'quote', date: '2026-09-08' }).envelope;
  const projection = M.resultProjection(envelope.state, 'moving');
  assert.equal(projection.contractVersion, 3);
  assert.deepEqual(Object.keys(projection.slots), ['txt', 'todo', 'calendar', 'sheet']);
  Object.values(projection.slots).forEach(slot => assert.deepEqual(slot.itemRefs, projection.itemRefs));
  assert.deepEqual(projection.sheet.map(row => row.itemRef), projection.itemRefs);
  assert.equal(projection.sheet[0].status, '완료');
  assert.equal(projection.items[0].executionDate, '2026-09-08');
  assert.deepEqual(projection.calendar['2026-09-08'], [projection.itemRefs[0]]);
  assert.equal((projection.calendar.undated || []).includes(projection.itemRefs[0]), false);
  assert.equal(projection.workingSource.editable, false);
  assert.equal(projection.slots.txt.kind, 'copy-only');
  assert.notEqual(projection.workingSource, projection.slots.txt);
  assert.equal(projection.calendar.cells.length, 42);
  assert.equal(projection.calendar.weekCount, 6);
  assert.equal(projection.calendar.weekStartsOn, 'sunday');
  assert.equal(projection.calendar.datePolicy, 'effective-date-execution-first');
  assert.equal(projection.downloads.version, 2);
  assert.equal(projection.downloads.txt.payload, projection.txt);
  assert.equal(projection.downloads.txt.bom, false);
  assert.equal(/\r/u.test(projection.downloads.txt.payload), false);
  assert.equal(projection.downloads.csv.payload.startsWith('\uFEFF'), true);
  assert.equal(projection.downloads.csv.payload.endsWith('\r\n'), true);
  assert.equal(projection.downloads.sourceMutationCount, 0);

  const authored = M.authoringResultProjection(validSource());
  assert.equal(authored.contractVersion, 3);
  assert.deepEqual(Object.keys(authored.slots), ['txt', 'todo', 'calendar', 'sheet']);
  Object.values(authored.slots).forEach(slot => assert.deepEqual(slot.itemRefs, authored.itemRefs));
  assert.deepEqual(authored.sheet.map(row => row.itemRef), authored.itemRefs);
  assert.equal(authored.workingSource.rawText, validSource());
  assert.equal(authored.workingSource.editable, true);
  assert.match(authored.flowRef, /^saved-flow:[^:]+:[^:]+$/u);
  authored.itemRefs.forEach(ref => assert.match(ref, /^flow-item:[^:]+:[^:]+:[^:]+$/u));
  assert.deepEqual(M.authoringResultProjection(validSource()).itemRefs, authored.itemRefs);
});

test('standalone result TXT normalizes CRLF and lone CR to one final LF', () => {
  const state = M.seedState();
  const quote = state.tasks.find(task => task.id === 'quote');
  quote.memo = '첫 줄\r\n둘째 줄\r마지막 줄\n\n';
  const projection = M.resultProjection(state, 'moving');

  assert.equal(projection.txt.includes('\r'), false);
  assert.equal(projection.txt.endsWith('\n'), true);
  assert.equal(projection.txt.endsWith('\n\n'), false);
  assert.equal(projection.downloads.txt.payload, projection.txt);
  assert.match(projection.txt, /메모:\n     첫 줄\n     둘째 줄\n     마지막 줄\n/u);

  const direct = M.buildResultDownloads('정규화', 'copy-01', [], '가\r\n나\r다\n\n', []);
  assert.equal(direct.txt.payload, '가\n나\n다\n');
});

test('standalone Calendar excludes hidden Items and keeps stored context order for the same date', () => {
  const state = M.seedState();
  const quote = state.tasks.find(task => task.id === 'quote');
  const contract = state.tasks.find(task => task.id === 'contract');
  quote.date = M.TODAY;
  contract.date = M.TODAY;
  const todayIds = M.viewTaskIds(state, 'today');
  state.orders.today = ['contract', 'quote'].concat(
    todayIds.filter(id => id !== 'contract' && id !== 'quote'),
  );

  const ordered = M.resultProjection(state, 'moving', {
    baseDate: M.TODAY,
    selectedDate: M.TODAY,
  });
  assert.deepEqual(ordered.calendar[M.TODAY], [contract.ref, quote.ref]);
  assert.deepEqual(ordered.calendar.selectedItemRefs, [contract.ref, quote.ref]);
  assert.deepEqual(
    ordered.calendar.cells.find(cell => cell.date === M.TODAY).itemRefs,
    [contract.ref, quote.ref],
  );
  assert.equal(ordered.items.find(item => item.id === 'contract').contextOrder, 0);
  assert.equal(ordered.items.find(item => item.id === 'quote').contextOrder, 1);

  quote.timelinePolicy = 'excluded';
  const hiddenDated = M.resultProjection(state, 'moving', {
    baseDate: M.TODAY,
    selectedDate: M.TODAY,
  });
  assert.deepEqual(hiddenDated.calendar[M.TODAY], [contract.ref]);
  assert.deepEqual(hiddenDated.calendar.selectedItemRefs, [contract.ref]);
  assert.equal(hiddenDated.calendar.monthItemRefs.includes(quote.ref), false);
  assert.equal(hiddenDated.calendar.itemRefs.includes(quote.ref), true);

  quote.date = null;
  const hiddenUndated = M.resultProjection(state, 'moving', {
    baseDate: M.TODAY,
    selectedDate: M.TODAY,
  });
  assert.equal(hiddenUndated.calendar.undatedItemRefs.includes(quote.ref), false);
  assert.equal((hiddenUndated.calendar.undated || []).includes(quote.ref), false);
});

test('lossless source adapter preserves safe tables and fails closed for risky input', () => {
  assert.equal(M.LOSSLESS_AUTHORING_VERSION, 1);
  assert.deepEqual(M.LOSSLESS_AUTHORING_LIMITS, {
    utf8Bytes: 1024 * 1024,
    physicalLines: 20000,
    logicalCells: 50000,
  });
  const cases = [
    ['tsv', '순서\t주제\t활동\n1\t첫 번째\t강의 듣기\n2\t두 번째\t실습하기'],
    ['csv', '순서,작품,자료\n1,"어린 왕자, 낭독본",https://example.com/1\n2,오만과 편견,https://example.com/2'],
    ['markdown', '| 순서 | 주제 | 활동 |\n| --- | --- | --- |\n| 1 | 왼쪽 \\| 오른쪽 | 실행 |'],
  ];
  for (const [format, rawText] of cases) {
    const analysis = M.analyzeLosslessAuthoring(rawText);
    assert.equal(analysis.status, 'safe-table', format);
    assert.equal(analysis.tables[0].format, format);
    assert.equal(analysis.rawText, rawText);
    assert.equal(analysis.projection.kind, 'sheet-source-rows');
    assert.equal(analysis.projection.generatedItemCount, 0);
    assert.equal(analysis.projection.generatedTodoCount, 0);
    assert.equal(analysis.projection.generatedCalendarCount, 0);
    assert.equal(analysis.sourceMutationCount, 0);
  }
  const unsafe = '열1,열2\r\n1,=SUM(A1)';
  const fallback = M.analyzeLosslessAuthoring(unsafe);
  assert.equal(fallback.status, 'raw-fallback');
  assert.equal(fallback.fallback.active, true);
  assert.equal(fallback.fallback.rawText, unsafe);
  assert.equal(fallback.sourceMutationCount, 0);
});

test('lossless runtime reuses the canonical mixed-block contract with exact row and cell locators', () => {
  const rawText = [
    '장문 원문',
    '',
    '> 이름,상태',
    '> 인용,유지',
    '',
    '```csv',
    '이름,상태',
    '코드,유지',
    '```',
    '',
    '<section>',
    '이름,상태',
    'HTML,유지',
    '</section>',
    '',
    '<!--',
    '이름,상태',
    '주석,유지',
    '-->',
    '',
    '순서\t설명\t빈칸',
    '1\t"왼쪽\t오른쪽"\t',
  ].join('\n');
  const analysis = M.analyzeLosslessAuthoring(rawText);
  const canonical = losslessRuntime.analyzePersonalWorkspacePocLosslessAuthoring(rawText);

  assert.deepEqual(analysis, canonical);
  assert.equal(analysis.status, 'safe-table');
  assert.deepEqual(
    analysis.blocks.map(block => block.kind),
    ['prose', 'blank', 'blockquote', 'blank', 'code-fence', 'blank', 'html', 'blank', 'comment', 'blank', 'table'],
  );
  assert.equal(analysis.tables.length, 1);
  assert.equal(analysis.tables[0].format, 'tsv');
  assert.deepEqual(analysis.tables[0].rows, [['1', '왼쪽\t오른쪽', '']]);
  assert.equal(analysis.blocks.map(block => block.rawText).join(''), rawText);
  const sourceCell = analysis.tables[0].sourceRows[1].cells[1];
  assert.equal(sourceCell.rawText, '"왼쪽\t오른쪽"');
  assert.deepEqual(
    losslessRuntime.locatePersonalWorkspacePocLosslessSource(rawText, sourceCell.locator),
    { valid: true, rawText: sourceCell.rawText },
  );
  assert.equal(analysis.projection.generatedItemCount, 0);
  assert.equal(analysis.projection.generatedTodoCount, 0);
  assert.equal(analysis.projection.generatedCalendarCount, 0);
  assert.equal(analysis.sourceMutationCount, 0);
});

test('mixed Flow prose plus a risky table uses the same exact raw fallback as the canonical adapter', () => {
  const rawText = [
    '# 제목',
    '- [ ] 명시한 실행 항목',
    '',
    '열1,열2',
    '1,=SUM(A1)',
  ].join('\n');
  const analysis = M.analyzeLosslessAuthoring(rawText);
  const canonical = losslessRuntime.analyzePersonalWorkspacePocLosslessAuthoring(rawText);

  assert.deepEqual(analysis, canonical);
  assert.equal(analysis.status, 'raw-fallback');
  assert.equal(analysis.fallback.active, true);
  assert.equal(analysis.fallback.reason, 'formula-like-cell');
  assert.equal(analysis.fallback.rawText, rawText);
  assert.equal(analysis.blocks.map(block => block.rawText).join(''), rawText);
  assert.equal(analysis.projection.kind, 'none');
  assert.equal(analysis.sourceMutationCount, 0);
});

test('Flow and QuickItem trash lifecycle restores and persists while permanent deletion is unrecoverable', () => {
  const initial = M.initialEnvelope();
  const flowTrash = M.transitionEnvelope(initial, { type: 'move-to-trash', kind: 'flow', id: 'moving', now: '2026-09-03T01:00:00.000Z' });
  assert.equal(flowTrash.changed, true);
  assert.deepEqual(M.trashManifest(flowTrash.envelope.state).map(entry => [entry.kind, entry.id]), [['flow', 'moving']]);
  assert.equal(M.viewTaskIds(flowTrash.envelope.state, 'undated').includes('quote'), false);
  assert.equal(M.resultProjection(flowTrash.envelope.state, 'moving'), null);

  const storage = M.createMemoryStorage({ 'flow:operating:fixture': 'UNCHANGED' });
  M.writeEnvelope(storage, flowTrash.envelope);
  const restoredBytes = M.loadEnvelope(storage);
  assert.equal(restoredBytes.status, 'restored');
  assert.equal(M.isTrashedFlow(restoredBytes.envelope.state, 'moving'), true);
  assert.equal(storage.snapshot()['flow:operating:fixture'], 'UNCHANGED');

  const restored = M.transitionEnvelope(flowTrash.envelope, { type: 'restore-from-trash', kind: 'flow', id: 'moving' });
  assert.equal(restored.changed, true);
  assert.equal(M.isTrashedFlow(restored.envelope.state, 'moving'), false);
  const restoredUndo = M.undoEnvelope(restored.envelope);
  assert.equal(M.isTrashedFlow(restoredUndo.envelope.state, 'moving'), true);

  const unconfirmed = M.transitionEnvelope(flowTrash.envelope, { type: 'permanently-delete-from-trash', kind: 'flow', id: 'moving', confirmed: false });
  assert.equal(unconfirmed.changed, false);
  assert.equal(unconfirmed.error, 'confirmation-required');
  assert.equal(JSON.stringify(unconfirmed.envelope), JSON.stringify(flowTrash.envelope));
  const removed = M.transitionEnvelope(flowTrash.envelope, { type: 'permanently-delete-from-trash', kind: 'flow', id: 'moving', confirmed: true });
  assert.equal(removed.changed, true);
  assert.equal(stateFlow(removed.envelope.state, 'moving'), undefined);
  assert.equal(stateTask(removed.envelope.state, 'quote'), undefined);
  assert.equal(removed.envelope.undo, null);
  const removedUndo = M.undoEnvelope(removed.envelope);
  assert.equal(removedUndo.changed, false);
  assert.equal(stateFlow(removedUndo.envelope.state, 'moving'), undefined);
  assert.equal(stateTask(removedUndo.envelope.state, 'quote'), undefined);

  const quickTrash = M.transitionEnvelope(initial, { type: 'move-to-trash', kind: 'quick', id: 'call' });
  assert.equal(quickTrash.changed, true);
  assert.equal(M.isTrashedTask(quickTrash.envelope.state, stateTask(quickTrash.envelope.state, 'call')), true);
  const quickRestore = M.transitionEnvelope(quickTrash.envelope, { type: 'restore-from-trash', kind: 'quick', id: 'call' });
  assert.equal(quickRestore.changed, true);
  assert.equal(M.isTrashedTask(quickRestore.envelope.state, stateTask(quickRestore.envelope.state, 'call')), false);

  const corruptState = M.seedState();
  corruptState.trashEntries = [{ kind: 'flow', id: 'missing', deletedAt: '2026-09-03T00:00:00.000Z' }];
  const corruptStorage = M.createMemoryStorage({ [M.STORAGE_KEY]: JSON.stringify({ version: 1, state: corruptState, undo: null }) });
  const failedClosed = M.loadEnvelope(corruptStorage);
  assert.equal(failedClosed.status, 'corrupt');
  assert.deepEqual(failedClosed.envelope, M.initialEnvelope());
  assert.equal(corruptStorage.snapshot()[M.STORAGE_KEY], JSON.stringify({ version: 1, state: corruptState, undo: null }));
});

test('versioned authoring property catalog exposes four groups and edits all sixteen properties', () => {
  assert.equal(M.AUTHORING_PROPERTY_CATALOG_VERSION, 2);
  assert.deepEqual(M.AUTHORING_PROPERTY_CATALOG.map(entry => entry.key), [
    'date', 'relativeDate', 'time', 'timezone', 'place', 'duration', 'detail', 'completion',
    'condition', 'resource', 'repeat', 'repeatEnd', 'guide', 'caution', 'source', 'subcheck'
  ]);
  assert.deepEqual(M.AUTHORING_PROPERTY_GROUPS.map(group => group.key), [
    'schedule', 'execution', 'content', 'provenance'
  ]);
  assert.deepEqual(Object.fromEntries(M.AUTHORING_PROPERTY_GROUPS.map(group => [
    group.key,
    M.AUTHORING_PROPERTY_CATALOG.filter(entry => entry.group === group.key).map(entry => entry.key),
  ])), {
    schedule: ['date', 'relativeDate', 'time', 'timezone', 'place', 'duration', 'repeat', 'repeatEnd'],
    execution: ['completion', 'condition', 'subcheck'],
    content: ['detail', 'resource', 'guide', 'caution'],
    provenance: ['source'],
  });
  assert.deepEqual(M.AUTHORING_PROPERTY_CATALOG.filter(entry => entry.writeSupport === 'editable').map(entry => entry.key), [
    'date', 'relativeDate', 'time', 'timezone', 'place', 'duration', 'detail', 'completion',
    'condition', 'resource', 'repeat', 'repeatEnd', 'guide', 'caution', 'source', 'subcheck'
  ]);
  const source = '# 여행\n## 준비\n- [ ] 체크인\n  - 날짜: 2026-09-10\n  - 장소: 공항';
  const located = M.locateAuthoringPropertyValue({ rawText: source, expectedSourceFingerprint: M.fingerprint(source), itemSourceLine: 3, key: 'place' });
  assert.equal(located.status, 'located');
  assert.equal(source.slice(located.selection.start, located.selection.end), '공항');

  const edit = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: source, expectedSourceFingerprint: M.fingerprint(source), itemSourceLine: 3, key: 'place', value: '김포공항' });
  assert.equal(edit.status, 'applied');
  assert.equal(edit.mutationCount, 1);
  assert.equal(edit.nextRawText.slice(edit.selection.start, edit.selection.end), '김포공항');
  assert.match(edit.nextRawText, /  - 장소: 김포공항/u);

  let simpleSource = edit.nextRawText;
  for (const [key, value] of [
    ['date', '2026-09-11'],
    ['duration', '30분'],
    ['detail', '탑승 수속 순서를 확인한다'],
    ['completion', '모바일 탑승권이 보이면 완료'],
    ['condition', '출발 2시간 전'],
    ['resource', '[항공권](https://example.com/ticket)'],
    ['source', 'https://example.com/original'],
  ]) {
    const planned = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: simpleSource, expectedSourceFingerprint: M.fingerprint(simpleSource), itemSourceLine: 3, key, value });
    assert.equal(planned.status, 'applied', key);
    assert.equal(planned.mutationCount, 1, key);
    simpleSource = planned.nextRawText;
  }
  assert.deepEqual(M.parseSource(simpleSource).issues, []);

  const pairedTime = M.planAuthoringPropertyBatchEdit({
    intent: 'apply',
    rawText: simpleSource,
    expectedSourceFingerprint: M.fingerprint(simpleSource),
    itemSourceLine: 3,
    updates: [{ key: 'time', value: '09:30' }, { key: 'timezone', value: 'Asia/Seoul' }],
  });
  assert.equal(pairedTime.status, 'applied');
  assert.equal(pairedTime.mutationCount, 1);
  assert.equal(pairedTime.transaction.kind, 'property-batch-edit');
  assert.equal(pairedTime.transaction.changes.length, 1);
  assert.match(pairedTime.nextRawText, /  - 시간: 09:30\n  - 시간대: Asia\/Seoul/u);

  const beforeNearMiss = '# 여행\n## 준비\n- [ ] 체크인\n  - 시간: 09:30\n-[] 공백 빠진 줄';
  const insertBeforeNearMiss = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: beforeNearMiss, expectedSourceFingerprint: M.fingerprint(beforeNearMiss), itemSourceLine: 3, key: 'timezone', value: 'Asia/Seoul' });
  assert.equal(insertBeforeNearMiss.status, 'applied');
  assert.match(insertBeforeNearMiss.nextRawText, /  - 시간: 09:30\n  - 시간대: Asia\/Seoul\n-\[\] 공백 빠진 줄/u);

  const missingTimezoneDependency = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: source, expectedSourceFingerprint: M.fingerprint(source), itemSourceLine: 3, key: 'timezone', value: 'Asia\/Seoul' });
  assert.equal(missingTimezoneDependency.status, 'blocked');
  assert.equal(missingTimezoneDependency.reason, 'missing-dependency');
  assert.equal(missingTimezoneDependency.mutationCount, 0);
  assert.equal(missingTimezoneDependency.rawText, source);

  const stale = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: source, expectedSourceFingerprint: 'stale', itemSourceLine: 3, key: 'place', value: '제주공항' });
  assert.equal(stale.status, 'blocked');
  assert.equal(stale.reason, 'stale-source');
  assert.equal(stale.mutationCount, 0);
  const cancelled = M.planAuthoringPropertyEdit({ intent: 'cancel', rawText: source, expectedSourceFingerprint: M.fingerprint(source), itemSourceLine: 3, key: 'place', value: '제주공항' });
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.mutationCount, 0);
  assert.equal(cancelled.rawText, source);

  const relativeBase = '# 준비\n- 기준일: 2026-09-20\n## 단계\n- [ ] 확인';
  const relativeDate = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: relativeBase, expectedSourceFingerprint: M.fingerprint(relativeBase), itemSourceLine: 4, key: 'relativeDate', value: 'D-2' });
  assert.equal(relativeDate.status, 'applied');
  assert.match(relativeDate.nextRawText, /  - 상대 날짜: D-2/u);
  const conflictingDate = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: relativeDate.nextRawText, expectedSourceFingerprint: M.fingerprint(relativeDate.nextRawText), itemSourceLine: 4, key: 'date', value: '2026-09-19' });
  assert.equal(conflictingDate.status, 'blocked');
  assert.equal(conflictingDate.reason, 'conflicting-schedule');
  assert.equal(conflictingDate.mutationCount, 0);

  const recurrenceBase = '# 루틴\n## 실행\n- [ ] 걷기\n  - 날짜: 2026-09-10';
  const pairedRepeat = M.planAuthoringPropertyBatchEdit({
    intent: 'apply',
    rawText: recurrenceBase,
    expectedSourceFingerprint: M.fingerprint(recurrenceBase),
    itemSourceLine: 3,
    updates: [{ key: 'repeat', value: '매주 월, 수' }, { key: 'repeatEnd', value: '2026-09-30' }],
  });
  assert.equal(pairedRepeat.status, 'applied');
  assert.equal(pairedRepeat.mutationCount, 1);
  assert.equal(pairedRepeat.transaction.changes.length, 1);
  assert.match(pairedRepeat.nextRawText, /  - 반복: 매주 월, 수\n  - 반복 종료: 2026-09-30/u);
  assert.deepEqual(M.parseSource(pairedRepeat.nextRawText).issues, []);

  const repeatOnly = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: recurrenceBase, expectedSourceFingerprint: M.fingerprint(recurrenceBase), itemSourceLine: 3, key: 'repeat', value: '매일' });
  assert.equal(repeatOnly.status, 'applied');
  assert.equal(repeatOnly.mutationCount, 1);
  assert.match(repeatOnly.nextRawText, /  - 반복: 매일$/u);

  const staleBatch = M.planAuthoringPropertyBatchEdit({ intent: 'apply', rawText: recurrenceBase, expectedSourceFingerprint: 'stale', itemSourceLine: 3, updates: [{ key: 'repeat', value: '매일' }, { key: 'repeatEnd', value: '10회' }] });
  assert.equal(staleBatch.status, 'blocked');
  assert.equal(staleBatch.reason, 'stale-source');
  assert.equal(staleBatch.mutationCount, 0);
  assert.equal(staleBatch.rawText, recurrenceBase);
  const cancelledBatch = M.planAuthoringPropertyBatchEdit({ intent: 'cancel', rawText: recurrenceBase, expectedSourceFingerprint: M.fingerprint(recurrenceBase), itemSourceLine: 3, updates: [{ key: 'repeat', value: '매일' }, { key: 'repeatEnd', value: '10회' }] });
  assert.equal(cancelledBatch.status, 'cancelled');
  assert.equal(cancelledBatch.mutationCount, 0);
  assert.equal(cancelledBatch.rawText, recurrenceBase);
});

test('guide and caution append distinct instances while subchecks add and re-enter the exact instance', () => {
  const noticeSource = '# 안전\r\n## 준비\r\n- [ ] 출발 점검\r\n  - 안내: 기존 안내\r\n  - 주의: 기존 주의';
  const guide = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: noticeSource, expectedSourceFingerprint: M.fingerprint(noticeSource), itemSourceLine: 3, key: 'guide', value: '새 안내' });
  assert.equal(guide.status, 'applied');
  assert.equal(guide.mutationCount, 1);
  assert.match(guide.nextRawText, /  - 안내: 기존 안내\r\n  - 주의: 기존 주의\r\n  - 안내: 새 안내$/u);
  const caution = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: guide.nextRawText, expectedSourceFingerprint: M.fingerprint(guide.nextRawText), itemSourceLine: 3, key: 'caution', value: '새 주의' });
  assert.equal(caution.status, 'applied');
  assert.equal(M.listAuthoringPropertyInstances({ rawText: caution.nextRawText, itemSourceLine: 3, key: 'guide' }).length, 2);
  assert.equal(M.listAuthoringPropertyInstances({ rawText: caution.nextRawText, itemSourceLine: 3, key: 'caution' }).length, 2);
  const duplicateGuide = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: caution.nextRawText, expectedSourceFingerprint: M.fingerprint(caution.nextRawText), itemSourceLine: 3, key: 'guide', value: '새 안내' });
  assert.equal(duplicateGuide.status, 'no-op');
  assert.equal(duplicateGuide.mutationCount, 0);
  assert.equal(duplicateGuide.rawText, caution.nextRawText);

  const subcheckSource = '# 체크\n## 준비\n- [ ] 예약\n  - [ ] 번호 확인\n  - 설명: 기존 설명';
  const added = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: subcheckSource, expectedSourceFingerprint: M.fingerprint(subcheckSource), itemSourceLine: 3, key: 'subcheck', value: '결제 확인' });
  assert.equal(added.status, 'applied');
  assert.equal(added.mutationCount, 1);
  assert.match(added.nextRawText, /  - \[ \] 번호 확인\n  - \[ \] 결제 확인\n  - 설명: 기존 설명/u);
  assert.equal(M.parseSource(added.nextRawText).itemCount, 1);
  const instances = M.listAuthoringPropertyInstances({ rawText: added.nextRawText, itemSourceLine: 3, key: 'subcheck' });
  assert.deepEqual(instances.map(instance => instance.rawValue), ['번호 확인', '결제 확인']);
  const exact = M.locateAuthoringPropertyValue({ rawText: added.nextRawText, expectedSourceFingerprint: M.fingerprint(added.nextRawText), itemSourceLine: 3, propertySourceLine: instances[1].sourceLine, key: 'subcheck' });
  assert.equal(exact.status, 'located');
  assert.equal(added.nextRawText.slice(exact.selection.start, exact.selection.end), '결제 확인');
  const duplicateSubcheck = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: added.nextRawText, expectedSourceFingerprint: M.fingerprint(added.nextRawText), itemSourceLine: 3, key: 'subcheck', value: '결제 확인' });
  assert.equal(duplicateSubcheck.status, 'no-op');
  assert.equal(duplicateSubcheck.mutationCount, 0);

  const markdownResource = '# 링크\n## 확인\n- [ ] 자료 열기\n  - 자료: [공식 문서](https://example.com/docs)';
  const resourceLocated = M.locateAuthoringPropertyValue({ rawText: markdownResource, expectedSourceFingerprint: M.fingerprint(markdownResource), itemSourceLine: 3, key: 'resource' });
  assert.equal(resourceLocated.status, 'located');
  assert.equal(markdownResource.slice(resourceLocated.selection.start, resourceLocated.selection.end), '[공식 문서](https://example.com/docs)');

  const duplicateSingleton = '# 중복\n## 확인\n- [ ] 장소\n  - 장소: 서울\n  - 장소: 부산';
  const ambiguous = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: duplicateSingleton, expectedSourceFingerprint: M.fingerprint(duplicateSingleton), itemSourceLine: 3, key: 'place', value: '대전' });
  assert.equal(ambiguous.status, 'blocked');
  assert.equal(ambiguous.reason, 'duplicate-property');
  assert.equal(ambiguous.mutationCount, 0);
  assert.equal(ambiguous.rawText, duplicateSingleton);
});

test('near-miss recovery is explicit, exact and cancel-safe', () => {
  const source = '# 체크\n-[] 빠진 공백\n```\n-[] 코드 예시\n```\n- [ ] 정상 항목';
  const targets = M.listAuthoringNearMissTargets(source);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].title, '빠진 공백');
  const cancelled = M.planAuthoringNearMissRepair({ intent: 'cancel', rawText: source, expectedSourceFingerprint: M.fingerprint(source), targetId: targets[0].targetId });
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.mutationCount, 0);
  assert.equal(cancelled.rawText, source);
  const repaired = M.planAuthoringNearMissRepair({ intent: 'apply', rawText: source, expectedSourceFingerprint: M.fingerprint(source), targetId: targets[0].targetId });
  assert.equal(repaired.status, 'repaired');
  assert.equal(repaired.mutationCount, 1);
  assert.match(repaired.nextRawText, /# 체크\n- \[ \] 빠진 공백/u);
  assert.equal(repaired.nextRawText.slice(repaired.selection.start, repaired.selection.end), '빠진 공백');
  assert.match(repaired.nextRawText, /```\n-\[\] 코드 예시\n```/u);
  const stale = M.planAuthoringNearMissRepair({ intent: 'apply', rawText: source + '\n', expectedSourceFingerprint: M.fingerprint(source), targetId: targets[0].targetId });
  assert.equal(stale.status, 'blocked');
  assert.equal(stale.reason, 'stale-source');
  assert.equal(stale.mutationCount, 0);
});

test('standalone recurrence grammar matches the versioned contract and bare weekday aliases fail closed', () => {
  assert.equal(M.OCCURRENCE_CONTRACT_VERSION, 1);
  assert.deepEqual(M.parseRecurrence('매일'), {
    ok: true,
    rule: { version: 1, raw: '매일', frequency: 'daily', interval: 1 },
  });
  assert.deepEqual(M.parseRecurrence('2주마다 목, 화, 목', '5회'), {
    ok: true,
    rule: {
      version: 1,
      raw: '2주마다 목, 화, 목',
      frequency: 'weekly',
      interval: 2,
      weekdays: ['TU', 'TH'],
      end: { mode: 'count', count: 5, raw: '5회' },
    },
  });
  assert.equal(M.parseRecurrence('매월 31일', '2026-05-31').ok, true);
  assert.deepEqual(M.parseRecurrence('월, 수', '3회'), { ok: false, reason: 'invalid-recurrence' });
  assert.deepEqual(M.parseRecurrence('매일', '언젠가'), { ok: false, reason: 'invalid-recurrence-end' });
  assert.equal(M.parseSource(recurringSource('월, 수', '3회')).issues.some(issue => issue.code === 'invalid-recurrence'), true);
  assert.equal(M.parseSource(recurringSource('매일', '') .replace('  - 날짜: 2026-09-02\n', '')).issues.some(issue => issue.code === 'missing-recurrence-start'), true);
});

test('count, ISO end and stable occurrence identity include the explicit start exactly once', () => {
  const input = {
    sourceItemRef: 'savedCopyId:copy-a|flowId:flow-a|itemId:item-a',
    startDate: '2026-08-04',
    recurrence: '매주 월요일',
    recurrenceEnd: '3회',
  };
  const result = M.expandOccurrences(input);
  assert.equal(result.ok, true);
  assert.deepEqual(result.manifest.originalDates, ['2026-08-04', '2026-08-10', '2026-08-17']);
  assert.deepEqual(result.manifest.rows.map(row => row.occurrenceIndex), [1, 2, 3]);
  assert.equal(result.manifest.totalCount, 3);
  assert.equal(result.manifest.hasMore, false);
  result.manifest.rows.forEach(row => {
    assert.equal(row.rowId, row.occurrenceId);
    assert.equal(row.sourceItemRef, input.sourceItemRef);
    assert.equal(row.occurrenceId, M.buildOccurrenceId(row.seriesId, row.originalDate));
  });

  const compact = M.parseRecurrence('2주마다 화,목', '5회').rule;
  const spaced = M.parseRecurrence('2 주마다 화 / 목', '5 회').rule;
  assert.equal(M.buildOccurrenceSeriesId(input.sourceItemRef, compact), M.buildOccurrenceSeriesId(input.sourceItemRef, spaced));

  const monthly = M.expandOccurrences({
    sourceItemRef: 'copy/flow/monthly',
    startDate: '2026-01-31',
    recurrence: '매월 31일',
    recurrenceEnd: '2026-05-31',
  });
  assert.equal(monthly.ok, true);
  assert.deepEqual(monthly.manifest.originalDates, ['2026-01-31', '2026-03-31', '2026-05-31']);
});

test('finite 30-row and open-ended four-week bounds extend cumulatively without changing prior IDs', () => {
  const finiteBase = { sourceItemRef: 'copy/flow/finite', startDate: '2026-08-01', recurrence: '매일', recurrenceEnd: '35회' };
  const firstFinite = M.expandOccurrences(finiteBase).manifest;
  const grownFinite = M.expandOccurrences(Object.assign({}, finiteBase, { finiteLimit: 35 })).manifest;
  assert.equal(M.FINITE_RECURRENCE_PAGE_SIZE, 30);
  assert.equal(firstFinite.rows.length, 30);
  assert.equal(firstFinite.hasMore, true);
  assert.deepEqual(grownFinite.occurrenceIds.slice(0, 30), firstFinite.occurrenceIds);

  const openBase = { sourceItemRef: 'copy/flow/open', startDate: '2026-08-03', recurrence: '매일' };
  const firstOpen = M.expandOccurrences(openBase).manifest;
  const grownOpen = M.expandOccurrences(Object.assign({}, openBase, { windowWeeks: 8 })).manifest;
  assert.equal(M.OPEN_ENDED_RECURRENCE_WEEKS, 4);
  assert.deepEqual(firstOpen.window, { start: '2026-08-03', end: '2026-08-30', offsetWeeks: 0, weeks: 4 });
  assert.equal(firstOpen.rows.length, 28);
  assert.equal(firstOpen.hasMore, true);
  assert.deepEqual(grownOpen.occurrenceIds.slice(0, 28), firstOpen.occurrenceIds);
  assert.deepEqual(M.expandOccurrences(Object.assign({}, openBase, { windowWeeks: 0 })), { ok: false, reason: 'invalid-open-ended-window' });
});

test('one occurrence manifest drives TXT Todo Calendar and Sheet with repeat-only occurrence IDs', () => {
  const projection = M.authoringResultProjection(recurringSource('매일', '3회'));
  assert.deepEqual(projection.issues, []);
  assert.equal(projection.sourceItemRefs.length, 1);
  assert.equal(projection.itemRefs.length, 3);
  assert.equal(projection.occurrenceIds.length, 3);
  assert.deepEqual(projection.rowIds, projection.itemRefs);
  assert.deepEqual(projection.occurrenceIds, projection.itemRefs);
  Object.values(projection.slots).forEach(slot => {
    assert.deepEqual(slot.sourceItemRefs, projection.sourceItemRefs);
    assert.deepEqual(slot.itemRefs, projection.itemRefs);
    assert.deepEqual(slot.rowIds, projection.rowIds);
    assert.deepEqual(slot.occurrenceIds, projection.occurrenceIds);
  });
  assert.deepEqual(projection.todo, projection.itemRefs);
  assert.deepEqual(projection.sheet.map(row => row.itemRef), projection.itemRefs);
  assert.deepEqual(projection.sheet.map(row => row.originalDate), ['2026-09-02', '2026-09-03', '2026-09-04']);
  assert.deepEqual(projection.calendar.itemRefs, projection.itemRefs);
  assert.deepEqual(projection.calendar['2026-09-02'], [projection.itemRefs[0]]);
  assert.deepEqual(projection.occurrenceManifest.rows.map(row => row.rowId), projection.itemRefs);
  assert.deepEqual(projection.downloads.occurrenceIds, projection.occurrenceIds);
});

test('complete TXT has one exact UTF-8 LF payload with every approved field in fixed order', () => {
  const txt = M.serializeCompleteResultTxt('아침 루틴', [{
    stepId: 'step-1',
    sectionTitle: '준비',
    title: '물 마시기',
    occurrenceIndex: 1,
    completed: false,
    executionDate: '2026-09-02',
    time: '07:30',
    memo: '',
    recurrenceSummary: '매일 · 3회',
    sourceProperties: {
      '설명': '천천히 한 잔', '메모': '250ml', '완료 기준': '빈 컵 씻기', '시간대': 'Asia/Seoul', '장소': '주방',
      '소요 시간': '10', '실행 조건': '아침 식사 전', '주의': '천천히 마시기',
    },
    subchecks: [{ title: '컵 씻기', sourceChecked: false }],
    resources: ['https://example.com/water'],
    sources: ['https://example.com/source'],
  }], ['일반 문장']);
  assert.equal(txt, '아침 루틴\n=====\n\n[준비]\n1. ☐ 물 마시기 · 1회차\n   설명: 천천히 한 잔\n   메모: 250ml\n   완료 기준: 빈 컵 씻기\n   날짜: 2026-09-02\n   시간: 07:30\n   시간대: Asia/Seoul\n   장소: 주방\n   소요 시간: 10분\n   반복: 매일 · 3회\n   실행 조건: 아침 식사 전\n   체크리스트:\n     ☐ 컵 씻기\n   자료: https://example.com/water\n   출처: https://example.com/source\n   주의: 천천히 마시기\n\n[원문 메모]\n- 일반 문장\n');
  assert.equal(txt.includes('\r'), false);
  assert.equal(txt.endsWith('\n'), true);
  assert.equal(txt.endsWith('\n\n'), false);
  assert.equal(txt.split('\n').some(line => /[ \t]+$/u.test(line)), false);

  const projection = M.authoringResultProjection(recurringSource('매일', '3회'));
  assert.equal(projection.slots.txt.value, projection.txt);
  assert.equal(projection.slots.txt.download.payload, projection.txt);
  assert.equal(projection.downloads.txt.payload, projection.txt);
  assert.match(projection.txt, /\n   메모: 250ml\n/u);
  assert.match(projection.txt, /\n\[원문 메모\]\n- 이 문장은 Item이 아닌 원문 메모입니다\.\n$/u);
});

test('one occurrence date and completion survive reload, reopen and Undo without changing source Item', () => {
  const rawText = recurringSource('매일', '3회');
  const handoff = M.makeHandoff(rawText, { draftId: 'recurrence-draft', handoffId: 'recurrence-handoff', sourceConfirmed: true, folderId: null });
  let envelope = M.transitionEnvelope(M.initialEnvelope(), { type: 'commit-authoring', handoff }).envelope;
  const flowId = envelope.state.lastReceipt.flowId;
  const flow = stateFlow(envelope.state, flowId);
  const sourceTask = stateTask(envelope.state, flow.steps[0].itemIds[0]);
  const sourceBefore = JSON.stringify(sourceTask);
  const initial = M.resultProjection(envelope.state, flowId);
  const selected = initial.items[1];
  const otherRowsBefore = initial.items.filter(item => item.occurrenceId !== selected.occurrenceId).map(item => ({ id: item.occurrenceId, date: item.executionDate, completed: item.completed }));

  const moved = M.transitionEnvelope(envelope, { type: 'move-occurrence-date', sourceItemRef: selected.sourceItemRef, occurrenceId: selected.occurrenceId, originalDate: selected.originalDate, date: '2026-09-10' });
  assert.equal(moved.changed, true);
  envelope = moved.envelope;
  let projection = M.resultProjection(envelope.state, flowId);
  assert.equal(projection.items.find(item => item.occurrenceId === selected.occurrenceId).executionDate, '2026-09-10');
  assert.deepEqual(projection.items.filter(item => item.occurrenceId !== selected.occurrenceId).map(item => ({ id: item.occurrenceId, date: item.executionDate, completed: item.completed })), otherRowsBefore);
  assert.equal(JSON.stringify(stateTask(envelope.state, sourceTask.id)), sourceBefore);

  const completed = M.transitionEnvelope(envelope, { type: 'complete-occurrence', sourceItemRef: selected.sourceItemRef, occurrenceId: selected.occurrenceId, originalDate: selected.originalDate, done: true, completedAt: '2026-09-03T00:00:00.000Z' });
  assert.equal(completed.changed, true);
  assert.equal(M.resultProjection(completed.envelope.state, flowId).items.find(item => item.occurrenceId === selected.occurrenceId).completed, true);
  const undone = M.undoEnvelope(completed.envelope);
  assert.equal(undone.changed, true);
  assert.equal(M.resultProjection(undone.envelope.state, flowId).items.find(item => item.occurrenceId === selected.occurrenceId).completed, false);
  assert.equal(M.resultProjection(undone.envelope.state, flowId).items.find(item => item.occurrenceId === selected.occurrenceId).executionDate, '2026-09-10');

  const operating = { 'flow:saved:plans': '{"byte":"exact"}', 'flow:other': 'unchanged' };
  const storage = M.createMemoryStorage(operating);
  M.writeEnvelope(storage, completed.envelope);
  const restored = M.loadEnvelope(storage);
  assert.equal(restored.status, 'restored');
  projection = M.resultProjection(restored.envelope.state, flowId);
  assert.equal(projection.items.find(item => item.occurrenceId === selected.occurrenceId).executionDate, '2026-09-10');
  assert.equal(projection.items.find(item => item.occurrenceId === selected.occurrenceId).completed, true);
  assert.equal(storage.snapshot()['flow:saved:plans'], operating['flow:saved:plans']);
  assert.equal(storage.snapshot()['flow:other'], operating['flow:other']);
  storage.calls.filter(call => call[0] === 'setItem' || call[0] === 'removeItem').forEach(call => assert.equal(call[1], M.STORAGE_KEY));

  const reopened = M.transitionEnvelope(restored.envelope, { type: 'complete-occurrence', sourceItemRef: selected.sourceItemRef, occurrenceId: selected.occurrenceId, originalDate: selected.originalDate, done: false });
  assert.equal(reopened.changed, true);
  assert.equal(M.resultProjection(reopened.envelope.state, flowId).items.find(item => item.occurrenceId === selected.occurrenceId).completed, false);
  assert.equal(JSON.stringify(stateTask(reopened.envelope.state, sourceTask.id)), sourceBefore);
});

test('same, invalid, corrupt and cancelled occurrence paths perform zero mutation', () => {
  const handoff = M.makeHandoff(recurringSource('매일', '3회'), { draftId: 'no-op-draft', handoffId: 'no-op-handoff', sourceConfirmed: true, folderId: null });
  const envelope = M.transitionEnvelope(M.initialEnvelope(), { type: 'commit-authoring', handoff }).envelope;
  const flowId = envelope.state.lastReceipt.flowId;
  const selected = M.resultProjection(envelope.state, flowId).items[0];
  const before = JSON.stringify(envelope);
  const same = M.transitionEnvelope(envelope, { type: 'move-occurrence-date', sourceItemRef: selected.sourceItemRef, occurrenceId: selected.occurrenceId, originalDate: selected.originalDate, date: selected.originalDate });
  assert.equal(same.changed, false);
  assert.equal(JSON.stringify(same.envelope), before);
  const invalidDate = M.transitionEnvelope(envelope, { type: 'move-occurrence-date', sourceItemRef: selected.sourceItemRef, occurrenceId: selected.occurrenceId, originalDate: selected.originalDate, date: '2026-02-30' });
  assert.equal(invalidDate.changed, false);
  assert.equal(JSON.stringify(invalidDate.envelope), before);
  const invalidIdentity = M.transitionEnvelope(envelope, { type: 'complete-occurrence', sourceItemRef: selected.sourceItemRef, occurrenceId: selected.occurrenceId + '-wrong', originalDate: selected.originalDate, done: true });
  assert.equal(invalidIdentity.changed, false);
  assert.equal(JSON.stringify(invalidIdentity.envelope), before);
  const sameCompletion = M.transitionEnvelope(envelope, { type: 'complete-occurrence', sourceItemRef: selected.sourceItemRef, occurrenceId: selected.occurrenceId, originalDate: selected.originalDate, done: false });
  assert.equal(sameCompletion.changed, false);
  assert.equal(JSON.stringify(sameCompletion.envelope), before);

  const corrupt = JSON.parse(before);
  corrupt.state.occurrenceOverrides['not-an-occurrence'] = { sourceItemRef: selected.sourceItemRef, originalDate: selected.originalDate, completed: true };
  const storage = M.createMemoryStorage({ [M.STORAGE_KEY]: JSON.stringify(corrupt), 'flow:saved:plans': 'exact' });
  const callsBefore = storage.calls.length;
  assert.equal(M.loadEnvelope(storage).status, 'corrupt');
  assert.equal(storage.snapshot()['flow:saved:plans'], 'exact');
  assert.equal(storage.calls.slice(callsBefore).some(call => call[0] === 'setItem' || call[0] === 'removeItem'), false);
});

test('standalone occurrence UI exposes source Item, bounded expansion and shadow-only per-occurrence actions', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(app, /data-source-item-ref=/u);
  assert.match(app, /data-row-id=/u);
  assert.match(app, /data-occurrence-id=/u);
  assert.match(app, /data-action="move-result-occurrence-date"/u);
  assert.match(app, /data-action="toggle-result-occurrence-complete"/u);
  assert.match(app, /이 회차 다시 열기/u);
  assert.match(app, /원본 Item은 바뀌지 않습니다/u);
  assert.match(app, /data-dialog-form="occurrence-date"/u);
  assert.match(app, /data-action="close-dialog">취소/u);
  assert.match(app, /resultOccurrencePage < 130/u);
  assert.match(app, /authoringOccurrencePage < 130/u);
  assert.match(app, /horizonAtLimit \? ' disabled'/u);
  assert.match(app, /resultProjectionOptions\(\)/u);
  assert.match(app, /authoringProjectionOptions\(\)/u);
  assert.match(style, /\.result-occurrence-actions/u);
  assert.match(style, /\.result-horizon/u);
});

test('standalone UI exposes fixed result, trash and P2-C property parity controls', () => {
  const app = fs.readFileSync(appPath, 'utf8');
  const style = fs.readFileSync(stylePath, 'utf8');
  assert.match(app, /\['txt', 'TXT'\], \['todo', '할 일'\], \['calendar', '캘린더'\], \['sheet', '표'\]/u);
  assert.match(app, /data-copy-only="true"/u);
  assert.match(app, /data-action="download-result-txt"/u);
  assert.match(app, /data-action="download-result-csv"/u);
  assert.match(app, /data-action="download-authoring-txt"/u);
  assert.match(app, /data-action="download-authoring-csv"/u);
  assert.match(app, /function downloadLocalResult\(file\)/u);
  assert.match(app, /URL\.revokeObjectURL\(objectUrl\)/u);
  assert.match(app, /다운로드를 요청했어요/u);
  assert.doesNotMatch(app, /다운로드를 시작했어요/u);
  assert.match(app, /data-calendar-week-count=/u);
  assert.match(app, /data-testid="standalone-lossless-table"/u);
  assert.match(app, /data-testid="standalone-lossless-raw"/u);
  assert.match(app, /data-working-source/u);
  assert.match(app, /data-action="move-to-trash"/u);
  assert.match(app, /data-action="restore-trash"/u);
  assert.match(app, /data-action="permanent-delete"/u);
  assert.match(app, /영구 삭제할까요/u);
  assert.match(app, /영구 삭제 뒤에는 Undo하거나 복구할 수 없어요/u);
  assert.doesNotMatch(app, /영구 삭제[^.\n]*곧바로 Undo/u);
  assert.match(app, /data-action="open-authoring-properties"/u);
  assert.match(app, /data-authoring-property-tray="true"/u);
  assert.match(app, /data-action="choose-authoring-property-group"/u);
  assert.match(app, /data-action="edit-authoring-property"/u);
  assert.match(app, /data-authoring-inline-form="true"/u);
  assert.match(app, /if \(entry\.editor === 'native-date'\) return 'date';[\s\S]*if \(entry\.editor === 'native-time'\) return 'time';[\s\S]*return 'text';/u);
  assert.doesNotMatch(app, /entry\.valueKind === 'url'\) return 'url'/u);
  assert.match(app, /data-dialog-form="authoring-dependent-property"/u);
  assert.match(app, /data-dependent-kind=/u);
  assert.match(app, /\['relativeDate', 'timezone', 'repeat'\]\.includes\(kind\)/u);
  assert.doesNotMatch(app, /data-dialog-form="authoring-property"/u);
  assert.match(app, /data-action="locate-authoring-property"/u);
  assert.match(app, /data-property-source-line=/u);
  assert.match(app, /data-action="repair-near-miss"/u);
  assert.match(app, /planAuthoringPropertyBatchEdit/u);
  assert.match(app, /시간과 시간대를 한 번에 적용하고 Undo 한 번으로 되돌립니다/u);
  assert.match(app, /종료를 입력하면 반복과 한 번에 적용합니다/u);
  assert.match(app, /kind === 'repeat' && !repeatEndValue/u);
  assert.match(app, /작성 원문 → 결과/u);
  assert.match(app, /WorkingSource와 결과가 함께 갱신됩니다/u);
  assert.match(app, /shadow 수정은 이 원문으로 돌아오지 않습니다/u);
  assert.match(app, /이미 같은 값이에요\. 원문은 바뀌지 않았습니다\./u);
  assert.match(app, /취소했어요\. 원문은 바뀌지 않았습니다\./u);
  assert.match(app, /그대로 두기/u);
  assert.match(app, /authoringSourceMutationCount/u);
  assert.match(style, /\.result-sheet-scroll/u);
  assert.match(style, /\.trash-row/u);
  assert.match(style, /\.property-inline-tray \{ position: static/u);
  assert.match(style, /\.property-inline-form \{ position: static/u);
  assert.match(style, /\.property-group-chooser/u);
  assert.match(style, /\.property-dependent-form/u);
});

test('single-file build is deterministic and contains inline CSS, model and app', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const androidHtml = fs.readFileSync(androidHtmlPath, 'utf8');
  assert.equal(html, singleFile.buildText());
  assert.equal(androidHtml, html);
  assert.match(html, /<title>FlowMe 개인공간<\/title>/u);
  assert.match(html, /flow:poc:personal-workspace:v1:standalone-integrated/u);
  assert.match(html, /data-flowme-standalone-inline="style"/u);
  assert.match(html, /data-flowme-standalone-inline="lossless-authoring"/u);
  assert.match(html, /data-flowme-standalone-inline="model"/u);
  assert.match(html, /data-flowme-standalone-inline="app"/u);
  assert.ok(
    html.indexOf('data-flowme-standalone-inline="lossless-authoring"')
      < html.indexOf('data-flowme-standalone-inline="model"'),
  );
  assert.match(html, /FlowMePersonalWorkspaceLosslessAuthoring/u);
  assert.match(html, /id="compact-undo-button"/u);
  assert.match(html, /\[elements\.undo, elements\.compactUndo\]/u);
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc=/iu);
  assert.doesNotMatch(html, /<link\b[^>]*\brel="stylesheet"/iu);
  assert.doesNotMatch(html, /__FLOWME_INLINE_(?:STYLE|LOSSLESS_AUTHORING|MODEL|APP)__/u);
});

test('static boot fallback remains when JavaScript is blocked', () => {
  const shell = fs.readFileSync(singleFile.paths.shell, 'utf8');
  const html = fs.readFileSync(htmlPath, 'utf8');
  [shell, html].forEach(source => {
    assert.match(source, /id="boot-fallback"/u);
    assert.match(source, /이 안내가 계속 보이면 현재 미리보기에서는 화면을 조작할 수 없습니다/u);
    assert.match(source, /Chrome, Safari 또는 데스크톱 브라우저에서 열어 주세요/u);
  });
});
