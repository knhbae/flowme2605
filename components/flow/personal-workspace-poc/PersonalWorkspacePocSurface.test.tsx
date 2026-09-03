import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  getPersonalWorkspacePocAutoScrollDelta,
  getPersonalWorkspacePocMoveTriggerSelector,
  getPersonalWorkspacePocMoveTriggerToken,
  getPersonalWorkspacePocNextLocalDayDelay,
  parsePersonalWorkspacePocEditorVerifiedStateRaw,
  PersonalWorkspacePocTaskReadOnlyDetails,
  resolvePersonalWorkspacePocReorderControl,
  resolvePersonalWorkspacePocReorderPosition,
  shouldClosePersonalWorkspacePocMovePanel,
  shouldUsePersonalWorkspacePocItemSheet,
} from './PersonalWorkspacePocSurface';
import { createPersonalWorkspacePocState } from '@/lib/flow/personal-workspace-poc-state';

const source = readFileSync(new URL('./PersonalWorkspacePocSurface.tsx', import.meta.url), 'utf8');
const routeSource = readFileSync(new URL('./PersonalWorkspacePocRoute.tsx', import.meta.url), 'utf8');

test('workspace boot recovers a bounded PoC transaction before loading state', () => {
  const recovery = routeSource.indexOf(
    'recoverPersonalWorkspacePocStorageCommit(window.localStorage)',
  );
  const stateLoad = routeSource.indexOf(
    'loadPersonalWorkspacePocState(window.localStorage)',
  );
  assert.ok(recovery >= 0);
  assert.ok(stateLoad > recovery);
  assert.match(routeSource, /!recovery\.recovered[\s\S]*window\.location\.replace\('\/my'\)/u);
});

test('local day rolls at the next local midnight and refreshes after app resume', () => {
  const localNow = new Date(2026, 8, 2, 23, 59, 30, 0);
  assert.equal(getPersonalWorkspacePocNextLocalDayDelay(localNow), 30_000);
  assert.match(source, /const \[today, setToday\] = useState\(\(\) => localIsoDate\(\)\)/u);
  assert.match(source, /getPersonalWorkspacePocNextLocalDayDelay\(new Date\(\)\) \+ 25/u);
  assert.match(source, /window\.addEventListener\('focus', refreshLocalDay\)/u);
  assert.match(source, /document\.addEventListener\('visibilitychange', refreshVisibleLocalDay\)/u);
  assert.match(source, /if \(!document\.hidden\) refreshLocalDay\(\)/u);
});

test('editor success validates exact state bytes and publishes after synchronous owner cleanup', () => {
  const state = { ...createPersonalWorkspacePocState('2026-09-02T00:00:00.000Z'), revision: 1 };
  const raw = JSON.stringify(state);
  assert.deepEqual(parsePersonalWorkspacePocEditorVerifiedStateRaw(raw), state);
  assert.equal(parsePersonalWorkspacePocEditorVerifiedStateRaw(` ${raw}`), undefined);
  assert.equal(parsePersonalWorkspacePocEditorVerifiedStateRaw('{"revision":1}'), undefined);

  const closeStart = source.indexOf('const closeEditorHistory = useCallback');
  const closeEnd = source.indexOf('const finalizeSuccessfulEditorAttempt', closeStart);
  const closeSource = source.slice(closeStart, closeEnd);
  assert.ok(closeStart >= 0 && closeEnd > closeStart);
  assert.match(closeSource, /editorHistoryPopstateConsume\.current = true;[\s\S]*action\(\);[\s\S]*window\.history\.back\(\)/u);
  assert.ok(closeSource.indexOf('action();') < closeSource.indexOf('window.history.back();'));
  const planSucceededStart = source.indexOf('planEditorCommitSucceeded.current =');
  const planSucceededEnd = source.indexOf('planEditorRearm.current =', planSucceededStart);
  assert.doesNotMatch(
    source.slice(planSucceededStart, planSucceededEnd),
    /finalizeSuccessfulEditorAttempt/u,
  );
  const planClosedStart = source.indexOf('planEditorClosed.current =');
  const quickClosedStart = source.indexOf('quickEditorClosed.current =', planClosedStart);
  const popstateStart = source.indexOf('useEffect(() => {', quickClosedStart);
  assert.match(
    source.slice(planClosedStart, quickClosedStart),
    /editorOwner\.current = undefined;[\s\S]*if \(shouldFinalize\) finalizeSuccessfulEditorAttempt\(attempt\)/u,
  );
  assert.match(
    source.slice(quickClosedStart, popstateStart),
    /editorOwner\.current = undefined;[\s\S]*if \(shouldFinalize\) finalizeSuccessfulEditorAttempt\(attempt\)/u,
  );
  assert.match(source, /if \(editorHistoryPopstateConsume\.current\) \{[\s\S]*editorHistoryPopstateConsume\.current = false;[\s\S]*return;/u);
  assert.doesNotMatch(source, /editorHistoryPopstateConsume\.current \|\| pending\.current/u);
  assert.match(source, /instrumentPersonalWorkspacePocEditorStorageCommit\(operation, evidence, \{[\s\S]*readTargetRaw:[\s\S]*parseTargetRaw:/u);
});

test('editor retry and Undo receipts use bounded guards and observed write evidence', () => {
  assert.match(source, /retryDescriptor: personalWorkspacePocPlanRetryDescriptor\(draft, guard\)/u);
  assert.match(source, /retryDescriptor: personalWorkspacePocQuickRetryDescriptor\(draft, baseline\)/u);
  assert.match(source, /active\.status !== 'recoverable-error'/u);
  assert.match(source, /payload: attempt\.retryDescriptor\.payload/u);
  assert.match(source, /guard: attempt\.retryDescriptor\.guard/u);
  assert.match(source, /item-cancel:\$\{closingActive\?\.id/u);
  assert.match(source, /const undoStorageEvidence = createPersonalWorkspacePocEditorStorageEvidence\(\)/u);
  assert.match(source, /targetWriteCount: undoStorageEvidence\.successfulTargetMutationCount/u);
  assert.match(source, /supportWriteCount: undoStorageEvidence\.successfulSupportMutationCount/u);
  assert.doesNotMatch(source, /supportWriteCount: 4/u);
});

test('move trigger identity stays selector-safe and distinguishes every opener', () => {
  const ref = 'flow-item:copy%3Aone:flow%2Fone:item%20one';
  const handle = getPersonalWorkspacePocMoveTriggerToken(ref, 'task-handle');
  const menu = getPersonalWorkspacePocMoveTriggerToken(ref, 'task-more');
  const flowHandle = getPersonalWorkspacePocMoveTriggerToken(ref, 'flow-handle');
  const flowMenu = getPersonalWorkspacePocMoveTriggerToken(ref, 'flow-card');

  assert.notEqual(handle, menu);
  assert.notEqual(flowHandle, flowMenu);
  assert.notEqual(flowHandle, handle);
  assert.equal(
    getPersonalWorkspacePocMoveTriggerSelector(ref, 'task-handle'),
    `[data-personal-workspace-move-trigger="${handle}"]`,
  );
  assert.doesNotMatch(handle, /\s/u);
});

test('move panel closes only after a persisted change', () => {
  assert.equal(shouldClosePersonalWorkspacePocMovePanel('changed'), true);
  assert.equal(shouldClosePersonalWorkspacePocMovePanel('unchanged'), false);
  assert.equal(shouldClosePersonalWorkspacePocMovePanel('failed'), false);
});

test('trash lifecycle is reachable, searchable, reversible, and permanently deletes only after warning', () => {
  assert.match(source, /\['trash', `휴지통 \$\{trashRows\.length\}`\]/u);
  assert.match(source, /data-testid="personal-workspace-move-to-trash"[\s\S]*휴지통으로 이동/u);
  assert.match(source, /data-testid="personal-workspace-trash-search"/u);
  assert.match(source, /data-testid="personal-workspace-trash-visible-count"/u);
  assert.match(source, /type: 'restore-from-trash'/u);
  const confirmStart = source.indexOf('testId="personal-workspace-trash-delete-confirm"');
  const confirmEnd = source.indexOf('{resetConfirmOpen ?', confirmStart);
  assert.ok(confirmStart >= 0 && confirmEnd > confirmStart);
  const confirmSource = source.slice(confirmStart, confirmEnd);
  assert.match(confirmSource, /복원할 수 없습니다/u);
  assert.match(confirmSource, /type: 'permanently-delete-from-trash'/u);
  assert.ok(
    confirmSource.indexOf('복원할 수 없습니다')
      < confirmSource.indexOf("type: 'permanently-delete-from-trash'"),
  );
  assert.match(confirmSource, /영구 삭제를 취소했어요/u);
});

test('right-corridor midpoint resolves before and after through one deterministic order', () => {
  const currentOrderedRefKeys = ['a', 'b', 'c', 'd'];
  assert.deepEqual(resolvePersonalWorkspacePocReorderPosition({
    currentOrderedRefKeys,
    draggedRef: 'd',
    targetRef: 'b',
    targetTitle: '두 번째',
    pointerY: 110,
    targetTop: 100,
    targetHeight: 40,
  }), {
    kind: 'changed',
    position: 'before',
    orderedRefKeys: ['a', 'd', 'b', 'c'],
    message: '두 번째 앞에 놓기',
  });
  assert.deepEqual(resolvePersonalWorkspacePocReorderPosition({
    currentOrderedRefKeys,
    draggedRef: 'a',
    targetRef: 'c',
    targetTitle: '세 번째',
    pointerY: 130,
    targetTop: 100,
    targetHeight: 40,
  }), {
    kind: 'changed',
    position: 'after',
    orderedRefKeys: ['b', 'c', 'a', 'd'],
    message: '세 번째 뒤에 놓기',
  });
});

test('right-corridor current and invalid positions stay mutation-free', () => {
  const currentOrderedRefKeys = ['a', 'b', 'c'];
  assert.deepEqual(resolvePersonalWorkspacePocReorderPosition({
    currentOrderedRefKeys,
    draggedRef: 'b',
    targetRef: 'b',
    targetTitle: '두 번째',
    pointerY: 120,
    targetTop: 100,
    targetHeight: 40,
  }), { kind: 'current', message: '이미 같은 위치입니다.' });
  assert.deepEqual(resolvePersonalWorkspacePocReorderPosition({
    currentOrderedRefKeys,
    draggedRef: 'b',
    targetRef: 'c',
    targetTitle: '세 번째',
    pointerY: 110,
    targetTop: 100,
    targetHeight: 40,
  }), { kind: 'current', message: '이미 같은 위치입니다.' });
  assert.deepEqual(resolvePersonalWorkspacePocReorderPosition({
    currentOrderedRefKeys,
    draggedRef: 'outside',
    targetRef: 'a',
    targetTitle: '첫 번째',
    pointerY: 110,
    targetTop: 100,
    targetHeight: 40,
  }), { kind: 'invalid', message: '같은 목록 안의 항목에 놓아 주세요.' });
});

test('boundary and one-step controls resolve through the same pure reorder contract', () => {
  const currentOrderedRefKeys = ['a', 'b', 'c', 'd'];
  const titleByRef = { a: '첫 번째', b: '두 번째', c: '세 번째', d: '네 번째' };

  assert.deepEqual(resolvePersonalWorkspacePocReorderControl({
    currentOrderedRefKeys,
    draggedRef: 'c',
    control: 'top',
    titleByRef,
  }), {
    kind: 'changed',
    position: 'before',
    orderedRefKeys: ['c', 'a', 'b', 'd'],
    message: '첫 번째 앞에 놓기',
  });
  assert.deepEqual(resolvePersonalWorkspacePocReorderControl({
    currentOrderedRefKeys,
    draggedRef: 'b',
    control: 'bottom',
    titleByRef,
  }), {
    kind: 'changed',
    position: 'after',
    orderedRefKeys: ['a', 'c', 'd', 'b'],
    message: '네 번째 뒤에 놓기',
  });
  assert.deepEqual(resolvePersonalWorkspacePocReorderControl({
    currentOrderedRefKeys,
    draggedRef: 'c',
    control: 'previous',
    titleByRef,
  }).kind, 'changed');
  assert.deepEqual(resolvePersonalWorkspacePocReorderControl({
    currentOrderedRefKeys,
    draggedRef: 'b',
    control: 'next',
    titleByRef,
  }).kind, 'changed');
});

test('boundary controls reject missing items and keep existing edges mutation-free', () => {
  const currentOrderedRefKeys = ['a', 'b', 'c'];
  assert.deepEqual(resolvePersonalWorkspacePocReorderControl({
    currentOrderedRefKeys,
    draggedRef: 'a',
    control: 'top',
  }), { kind: 'current', message: '이미 같은 위치입니다.' });
  assert.deepEqual(resolvePersonalWorkspacePocReorderControl({
    currentOrderedRefKeys,
    draggedRef: 'c',
    control: 'bottom',
  }), { kind: 'current', message: '이미 같은 위치입니다.' });
  assert.deepEqual(resolvePersonalWorkspacePocReorderControl({
    currentOrderedRefKeys,
    draggedRef: 'outside',
    control: 'previous',
  }), { kind: 'invalid', message: '같은 목록 안의 항목을 선택해 주세요.' });
});

test('edge auto-scroll uses a 36-72px zone and caps reduced-motion speed', () => {
  assert.equal(getPersonalWorkspacePocAutoScrollDelta({ pointerY: 200, top: 0, bottom: 400 }), 0);
  assert.equal(getPersonalWorkspacePocAutoScrollDelta({ pointerY: 8, top: 0, bottom: 400 }), -16);
  assert.equal(getPersonalWorkspacePocAutoScrollDelta({ pointerY: 392, top: 0, bottom: 400 }), 16);
  assert.equal(getPersonalWorkspacePocAutoScrollDelta({
    pointerY: -100,
    top: 0,
    bottom: 400,
    reducedMotion: true,
  }), -8);
  assert.equal(getPersonalWorkspacePocAutoScrollDelta({ pointerY: 20, top: 20, bottom: 20 }), 0);
});

test('item detail uses a sheet until the full desktop inspector is available', () => {
  assert.equal(shouldUsePersonalWorkspacePocItemSheet('mobile'), true);
  assert.equal(shouldUsePersonalWorkspacePocItemSheet('stacked'), true);
  assert.equal(shouldUsePersonalWorkspacePocItemSheet('desktop_compact'), true);
  assert.equal(shouldUsePersonalWorkspacePocItemSheet('desktop_full'), false);
});

test('item detail renders projected Flow Item content as read-only text', () => {
  const markup = renderToStaticMarkup(
    <dl>
      <PersonalWorkspacePocTaskReadOnlyDetails
        task={{
          ref: 'flow-item:copy:flow:item',
          kind: 'flow_item',
          title: '접수하기',
          description: '장소: 시민회관\n자료: https://example.com/guide\n완료 기준: 접수를 마쳤다',
          sourceTimingLabel: 'D-1 · 10:00 · Asia/Seoul',
          completed: false,
          timelinePolicy: 'auto',
          sourceOrder: 0,
        }}
      />
    </dl>,
  );

  assert.match(markup, /data-testid="personal-workspace-item-description"/u);
  assert.match(markup, /장소: 시민회관\n자료: https:\/\/example\.com\/guide\n완료 기준: 접수를 마쳤다/u);
  assert.match(markup, /data-testid="personal-workspace-item-source-timing"/u);
  assert.match(markup, /D-1 · 10:00 · Asia\/Seoul/u);
  assert.doesNotMatch(markup, /<(?:input|textarea|button)\b/u);
});

test('surface keeps semantic preflight before the PoC atomic save call', () => {
  const composition = source.indexOf(
    'const nextComposition = composePersonalWorkspacePocReadModel(initialModel, result.state)',
  );
  const preflight = source.indexOf('const semanticPreflight = nextComposition.ok');
  const save = source.indexOf(
    'const saved = commitPersonalWorkspacePocStorage({',
  );

  assert.ok(composition >= 0);
  assert.ok(preflight > composition);
  assert.ok(save > preflight);
  assert.match(source, /semanticPreflight\.ok[\s\S]*kind: 'failure'[\s\S]*return 'failed'/u);
  assert.doesNotMatch(source, /savePersonalWorkspacePocState\(/u);
  assert.match(source, /authoringDraftRawValue: result\.storageCompanion\.rawValue/u);
});

test('surface exposes the separate authoring entrance and preserved source for authored flows', () => {
  assert.match(source, /href="\/flows\/new\?personalWorkspacePoc=v1"/u);
  assert.match(source, /data-testid="personal-workspace-create-flow"/u);
  assert.match(source, /data-testid="personal-workspace-authored-source"/u);
  assert.match(source, /authoring\.rawText/u);
  assert.match(source, /composePersonalWorkspacePocReadModel\(initialModel, state\)/u);
});

test('mobile item overlay and non-modal move panel carry focus, Escape, and one live-status owner', () => {
  assert.match(source, /testId="personal-workspace-item-sheet"/u);
  assert.match(source, /initialFocusSelector="#poc-flow-item-detail"/u);
  assert.match(source, /returnFocusSelector=\{`\[data-todo-detail-link=/u);
  assert.match(source, /activeItemOpen: !itemUsesSheet && Boolean\(activeTask\)/u);
  assert.match(source, /headingId: 'personal-workspace-flow-detail-heading'/u);
  assert.match(source, /target\.scrollIntoView\(\{ block: 'nearest', inline: 'nearest' \}\)/u);
  assert.match(source, /viewportWidth < 1280[\s\S]*focusAfterRender\('#poc-flow-item-detail'/u);
  assert.match(source, /aria-labelledby="personal-workspace-flow-item-detail-title"/u);

  assert.match(source, /data-testid="personal-workspace-move-panel"/u);
  assert.match(source, /role="dialog"/u);
  assert.match(source, /top: 'calc\(max\(0\.5rem, var\(--personal-workspace-safe-top\)\) \+ 4\.5rem\)'/u);
  assert.match(source, /bottom: 'max\(0\.5rem, var\(--personal-workspace-safe-bottom\)\)'/u);
  assert.match(source, /left: 'max\(0px, var\(--personal-workspace-safe-left\)\)'/u);
  assert.match(source, /width: 'min\(18\.75rem, max\(8rem, calc\(100vw - 10\.5rem/u);
  assert.doesNotMatch(source, /className="grid gap-5 py-4 md:grid-cols-2"/u);
  assert.match(source, /sm:grid-cols-2/u);
  assert.match(source, /orientation: landscape/u);
  assert.match(source, /lg:grid-cols-\[240px_minmax\(0,920px\)\]/u);
  assert.doesNotMatch(source, /aria-modal="true"[\s\S]*data-testid="personal-workspace-move-panel"/u);
  assert.match(source, /postMoveFocusSelector\.current = moveReturnFocusSelector/u);
  assert.match(source, /event\.key !== 'Escape' \|\| pending\.current/u);
  assert.match(source, /data-testid="personal-workspace-move-status"/u);
  assert.match(source, /data-testid="personal-workspace-move-status"[\s\S]*?aria-live="off"/u);
  assert.match(source, /receipt && status\.receiptStatus === receipt\.status/u);
  assert.match(source, /receiptStatus: 'success'/u);
  assert.match(source, /receiptStatus: 'undone'/u);
  assert.match(source, /data-testid="personal-workspace-transaction-status"[\s\S]*?role=\{receiptOwnsTransactionStatus \? undefined : status\.kind === 'failure' \? 'alert' : 'status'\}[\s\S]*?aria-live=\{receiptOwnsTransactionStatus \? 'off' : status\.kind === 'failure' \? 'assertive' : 'polite'\}/u);
  assert.match(source, /aria-hidden=\{receiptOwnsTransactionStatus \? true : undefined\}/u);
});

test('drag date targets and outside-drop cancellation converge on the move transition path', () => {
  assert.match(source, /data-testid=\{`personal-workspace-date-target-\$\{index\}`\}[\s\S]*data-personal-workspace-drop-kind="date"[\s\S]*data-personal-workspace-drop-date=\{date\}[\s\S]*onDrop=\{\(event\) => \{[\s\S]*void moveDate\(date\)/u);
  assert.match(source, /data-testid="personal-workspace-date-target-undated"[\s\S]*data-personal-workspace-drop-kind="undated"[\s\S]*void moveDate\(undefined\)/u);
  assert.match(source, /resolveActiveMoveAtPoint[\s\S]*data-personal-workspace-drop-kind[\s\S]*kind: 'date'/u);
  assert.match(source, /finishActiveMove[\s\S]*result\.kind === 'date'[\s\S]*type: 'move-date'[\s\S]*itemRef: activeTarget\.task\.ref/u);
  assert.match(source, /data-testid="personal-workspace-date-restore"/u);
  assert.match(source, /type: 'restore-execution-date'/u);
  assert.match(source, /원래 계획 날짜 따르기/u);
  assert.match(source, /onDragEnd=\{\(\) => \{[\s\S]*대상 밖에 놓아 이동을 취소했어요\./u);
  assert.match(source, /if \(!nativeDragStarted\.current\) onCancel\('포인터 이동을 취소했어요\.'\)/u);
});

test('active right corridor exposes insertion feedback and commits through the existing reorder transition', () => {
  assert.match(source, /data-personal-workspace-reorder-target=\{corridorActive \? 'true' : undefined\}/u);
  assert.match(source, /data-personal-workspace-reorder-position=\{reorderPreviewPosition\}/u);
  assert.match(source, /data-testid="personal-workspace-reorder-insertion-line"/u);
  assert.match(source, /reorderPreviewPosition === 'before' \? 'top-\[-2px\]' : 'bottom-\[-2px\]'/u);
  assert.match(source, /message: `\$\{targetTitle\} \$\{position === 'before' \? '앞' : '뒤'\}에 놓기`/u);
  assert.match(source, /finishActiveMove[\s\S]*type: 'reorder'[\s\S]*orderedRefKeys: result\.resolution\.orderedRefKeys/u);
  assert.match(source, /aria-expanded=\{expanded\}/u);
  assert.match(source, /expanded=\{sourceActive\}/u);
});

test('active move cleanup cancels edge scrolling without invoking a storage path', () => {
  assert.match(source, /window\.requestAnimationFrame\(runAutoScroll\)/u);
  assert.match(source, /window\.cancelAnimationFrame\(autoScrollFrame\.current\)/u);
  assert.match(source, /activeMoveSession\.current = undefined/u);
  assert.match(source, /window\.addEventListener\('scroll', cancelActiveSessionForScroll/u);
  assert.match(source, /window\.addEventListener\('wheel', cancelActiveSessionForWheel/u);
  assert.match(source, /document\.addEventListener\('visibilitychange', onVisibilityChange\)/u);
  assert.match(source, /cancelMove\('빠른 스크롤로 이동을 취소했어요\.'\)/u);
  assert.match(source, /runAutoScroll[\s\S]*resolveActiveMoveAtPoint\(session\.lastX, session\.lastY\)[\s\S]*window\.requestAnimationFrame\(runAutoScroll\)/u);
  assert.doesNotMatch(source, /if \(!target\) resolveActive/u);
  assert.doesNotMatch(source, /runAutoScroll[\s\S]{0,800}savePersonalWorkspacePocState/u);
});

test('touch cancellation suppresses only the synthetic click and exposes accessible movement guidance', () => {
  assert.match(source, /const distance = Math\.hypot\([\s\S]*if \(session\.phase === 'armed' && distance >= 8\)/u);
  assert.match(source, /suppressClickUntil\.current = Date\.now\(\) \+ 700/u);
  assert.match(source, /Date\.now\(\) <= suppressClickUntil\.current/u);
  assert.match(source, /aria-describedby=\{describedBy\}/u);
  assert.match(source, /describedBy="personal-workspace-move-handle-instructions"/u);
  assert.match(source, /오른쪽 재정렬 통로의 전용 손잡이를 짧게 누르거나 350밀리초 동안 길게 누르면 이동할 곳을 엽니다/u);
  assert.match(source, /날짜와 폴더는 화면 왼쪽의 이동 패널에서 선택/u);
  assert.match(source, /같은 목록의 순서는 오른쪽 전용 손잡이에서 위쪽 또는 아래쪽 화살표 키로 바꿉니다/u);
  assert.match(source, /길게 누르기 시작 전에 손가락이 8픽셀 이상 움직이거나/u);
  assert.match(source, /포인터 동작이 취소되거나, Escape 키를 누르거나 이동 창을 닫으면 변경 없이 취소됩니다/u);
  assert.match(source, /window\.addEventListener\('blur', cancelPendingPress\)/u);
  assert.match(source, /window\.addEventListener\('resize', cancelPendingPress\)/u);
});

test('Flow rows share the move handle lifecycle but expose folder-only movement', () => {
  assert.match(source, /data-personal-workspace-flow-ref=\{flow\.ref\}/u);
  assert.match(source, /testId="personal-workspace-flow-move-handle"/u);
  assert.match(source, /triggerToken=\{getPersonalWorkspacePocMoveTriggerToken\(flow\.ref, 'flow-handle'\)\}/u);
  assert.match(source, /describedBy="personal-workspace-flow-move-handle-instructions"/u);
  assert.match(source, /beginActiveMoveSession\([\s\S]*?'pointer',[\s\S]*?\{ kind: 'flow', flow \}/u);
  assert.match(source, /member: activeTarget\.kind === 'flow' \? 'saved_flow' : 'quick_item'/u);
  assert.match(source, /activeTarget\.kind !== 'task'[\s\S]*Flow 전체의 일정은 옮기지 않습니다/u);
  assert.match(source, /result\.resolution\.kind === 'invalid'[\s\S]*activeTarget\.kind !== 'task'[\s\S]*!activeTarget\.group/u);
  assert.match(source, /Flow 전체의 폴더만 바뀌며 원본 일정과 안의 할 일 실행 위치는 그대로 유지됩니다/u);
  assert.match(source, /testId="personal-workspace-move-handle"/u);
});

test('surface provides a skip link and testable four-side safe-area seams', () => {
  assert.match(source, /개인공간 본문으로 건너뛰기/u);
  assert.match(source, /href="#personal-workspace-view-heading"/u);
  assert.match(source, /--personal-workspace-safe-top/u);
  assert.match(source, /--personal-workspace-safe-right/u);
  assert.match(source, /--personal-workspace-safe-bottom/u);
  assert.match(source, /--personal-workspace-safe-left/u);
  assert.match(source, /padding-right: max\(1rem, var\(--personal-workspace-safe-right\)\)/u);
  assert.match(source, /padding-left: max\(1rem, var\(--personal-workspace-safe-left\)\)/u);
  assert.match(source, /padding-top: max\(\.25rem, var\(--personal-workspace-safe-top\)\) !important/u);
  assert.match(source, /const PERSONAL_WORKSPACE_POC_BOTTOM_SHEET_SAFE_STYLE: CSSProperties/u);
  assert.match(source, /left: 'var\(--personal-workspace-safe-left\)'/u);
  assert.match(source, /right: 'var\(--personal-workspace-safe-right\)'/u);
  assert.match(source, /bottom: 'var\(--personal-workspace-safe-bottom\)'/u);
  assert.match(source, /maxHeight: 'calc\(86dvh - var\(--personal-workspace-safe-top\) - var\(--personal-workspace-safe-bottom\)\)'/u);
  assert.match(source, /paddingBottom: 'calc\(1rem \+ var\(--personal-workspace-safe-bottom\)\)'/u);
  assert.equal(
    source.match(/dialogProps=\{\{ style: PERSONAL_WORKSPACE_POC_BOTTOM_SHEET_SAFE_STYLE \}\}/gu)?.length,
    3,
  );
});

test('quick authoring has explicit toggle, cancel, Escape, and reset confirmation contracts', () => {
  assert.match(source, /section !== 'month' && !quickFormOpen && !folderFormOpen \? \([\s\S]*data-testid="personal-workspace-quick-toggle"/u);
  assert.match(source, /data-product-primary="quick-item-open"/u);
  assert.match(source, /aria-controls="personal-workspace-quick-form"/u);
  assert.match(source, /closeQuickForm\(\)/u);
  assert.match(source, /event\.key !== 'Escape'/u);
  assert.match(source, /testId="personal-workspace-reset-confirm"/u);
  assert.match(source, /이 기기 기록 초기화/u);
  assert.match(source, /data-testid="personal-workspace-reset-open"/u);
  assert.match(source, /가져온 원본 Flow는 지우지 않습니다\./u);
});

test('reset shares editor and pending guards plus the global Flow write lock', () => {
  const resetBody = source.match(
    /const resetWorkspace = async \(\) => \{([\s\S]*?)\n  \};\n\n  const cancelMove/u,
  )?.[1] ?? '';
  assert.match(resetBody, /pending\.current[\s\S]*editorOwner\.current[\s\S]*planEditor\.active[\s\S]*quickEditor\.active/u);
  assert.match(resetBody, /pending\.current = true/u);
  assert.match(resetBody, /withFlowUserDataWriteLock\([\s\S]*resetPersonalWorkspacePocStorage\(window\.localStorage\)/u);
  assert.match(resetBody, /pending\.current = false/u);
  assert.ok(resetBody.indexOf('withFlowUserDataWriteLock') < resetBody.indexOf('setState(emptyState)'));
  assert.match(resetBody, /setReceipt\(undefined\)/u);
  assert.match(resetBody, /setQuickFormOpen\(false\)/u);
  assert.match(resetBody, /setFolderFormOpen\(false\)/u);
  assert.match(resetBody, /setResetConfirmOpen\(false\)/u);
  assert.match(source, /data-testid="personal-workspace-reset-confirm-action"[\s\S]*disabled=\{pending\.current\}[\s\S]*void resetWorkspace\(\)/u);
});

test('QuickItem order is hidden while its unsaved draft date differs from persisted placement', () => {
  assert.match(source, /const quickDraftDateMatchesPersisted = activeQuickEditor\.draft\.executionDate === task\?\.date/u);
  assert.match(source, /const contextRows = quickDraftDateMatchesPersisted[\s\S]*\? tasks\.filter/u);
  assert.match(source, /orderLabel: quickDraftDateMatchesPersisted && contextIndex >= 0/u);
});

test('an open editor owns the only live failure alert', () => {
  assert.match(source, /const editorOwnsFailureAlert = Boolean\([\s\S]*receipt\?\.status === 'failure'[\s\S]*planEditor\.active\?\.failure \|\| quickEditor\.active\?\.failure/u);
  assert.match(source, /<PersonalWorkspacePocReceiptSurface[\s\S]*announce=\{!editorOwnsFailureAlert\}/u);
});
