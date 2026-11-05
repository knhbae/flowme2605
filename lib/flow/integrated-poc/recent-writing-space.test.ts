import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// 11/5 쓰기 '최근만 쓰기' (W-a): how the writing view hands its editor the recent part and takes the whole back.
// The model is proven in recent-writing.test.ts; the browser check (3-month document, 390 and 1280) is in the report.
const space = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');
const mount = space.slice(space.indexOf('{opened.filter(id => docs.some(doc => doc.id === id)).map(id => {'), space.indexOf('{selectedDoc && !selectedArchived && <ProgramRecurrence'));

test('W-a: the editor gets the recent part, keyed by it, and its first position in the recent part\'s terms', () => {
  assert(mount.includes("<TextEditor key={recent ? `recent:${recentDoneShown[id] ? 'done' : 'folded'}` : 'whole'}"));
  assert(mount.includes('workspace={recent ? recent.workspace : space.text}'));
  assert(mount.includes('initialPosition={recent && initial ? recentPosition(id, recent, initial, false) : initial}'));
  // No recent part: a folder or collection view, a document shown whole, or one that cannot be written.
  assert(space.includes("if (collectionMode || folderId || recentWhole[id] || !space.text.documents.some(doc => doc.id === id) || programDocumentContentLock(space, id) !== 'active') return null;"));
});

test('W-a: a save, its checks and its confirmation go through the whole document', () => {
  assert(mount.includes('const whole = recentWide(id, recent, next), expected = options?.expectedWorkspace && recentWide(id, recent, options.expectedWorkspace, false);'));
  assert(mount.includes('if (!whole.ok || expected && !expected.ok) {'));
  assert(mount.includes('return editorCommit(id, whole.state, label, options && {'));
  assert(mount.includes('return whole.ok && programPreservesLockedDocumentContent(space, whole.state) && programPreservesSeriesMetadata(space, whole.state)'));
  assert(mount.includes('return view ? accept(recentNarrow(id, view, before), recentNarrow(id, view, next)) : accept(before, next, ack);'));
  // The 복구함 keeps the whole document, and a structural capture is whole too.
  assert(mount.includes('return view ? extendProgramRecentRaw(base, id, programRecentHidden(base, view.hold), raw) : raw;'));
  assert(mount.includes('return before.ok && next.ok ? { ...draft, before: before.state, next: next.state } : draft;'));
  // Positions are kept (and saved) in the whole document's terms.
  assert(mount.includes('const view = recentViewRef.current(id), position = view ? recentPosition(id, view, shownPosition, true) : shownPosition;'));
});

test('W-a: a line opened from elsewhere (원문에서 보기, an import) that is folded opens the whole document', () => {
  assert(space.includes('if (targetPosition && recentViewRef.current(id)?.hidden.has(taskId!)) await showRecentWhole(id, true);'));
  assert(space.includes('if (recentViewRef.current(notice.documentId)?.hidden.has(notice.lineId!)) { void showRecentWhole(notice.documentId, true); return; }'));
  assert(space.includes('const doc = shownDocument(id);'));
});

test('W-a: the folded days\' line and the way back, as the proposal words them, remembered on the device', () => {
  assert(space.includes('<p><span>지난 기록 · {through ? `${recentDay(through)}까지 ` : \'\'}{sum(\'days\')}일</span><small>할 일 {sum(\'tasks\')}개 · 남은 일 {sum(\'open\')}개</small></p>'));
  assert(space.includes("'찾은 줄이 지난 기록에 있어 펼쳤습니다' : hold.lineIds.size ? '지난 기록을 펼쳤습니다 · 길면 입력이 느려질 수 있습니다' : '전체 문서를 보고 있습니다'"));
  assert(space.includes('data-recent-action="past-show" onClick={() => void showRecentWhole(id)}>펼치기</button>'));
  assert(space.includes('data-recent-action="past-fold" onClick={() => void showRecentOnly(id)}>최근만 보기</button>'));
  assert(space.includes('const recentWholeKey = `flow:alpha:writing-whole:v1:${actorId}`;'));
  // Either way, writing still being saved stops it.
  assert(space.includes("if (!found && !await settleRecent(id)) { setMessage('작성 중인 입력을 저장한 뒤 지난 기록을 펼쳐 주세요.'); return; }"));
});

test('W-b: [미정]\'s folded finished tasks have their line under the body, [보기] / [접기] remembered on the device', () => {
  assert(space.includes("{view.done.whole ? `날짜 미정 · 끝낸 일 ${view.done.count}개` : `✓ 날짜 미정에서 끝낸 일 ${view.done.count}개`}"));
  assert(space.includes('data-recent-action="done-show" onClick={() => void showRecentDone(id, true)}>보기</button>'));
  assert(space.includes('data-recent-action="done-fold" onClick={() => void showRecentDone(id, false)}>접기</button>'));
  // Both under the body: one line of two buttons, their full words as names.
  assert(space.includes('if (atEnd && view?.done.count && view.folds.some(fold => fold.atEnd)) return recentPairLine(id, view);'));
  assert(space.includes("aria-label={`${done} · 보기`} onClick={() => void showRecentDone(id, true)}>✓ 끝낸 일 {view.done.count}개 보기</button>"));
  assert(space.includes("aria-label={`${past} · 펼치기`} onClick={() => void showRecentWhole(id)}>지난 기록 {sum('days')}일 펼치기</button>"));
  assert(space.includes('const recentDoneKey = `flow:alpha:writing-done:v1:${actorId}`;'));
  assert(space.includes('recentHolds.current[id] = programRecentHold(space.text, id, today, { done: !recentDoneShownRef.current[id] });'));
  // Under the body with the old days' line, so the body keeps the lines its fold freed.
  assert(space.includes('const done = atEnd ? recentDoneLine(id, view) : null, past = recentPastLine(id, view, atEnd);'));
});

test('총괄 조건 4: the document menu goes to the whole document any time and back, remembered on the device', () => {
  assert(space.includes("data-recent-action={recentWhole[selectedDoc.id] ? 'menu-recent' : 'menu-whole'}"));
  assert(space.includes("void (recentWhole[selectedDoc.id] ? showRecentOnly(selectedDoc.id) : showRecentWhole(selectedDoc.id)); }}>{recentWhole[selectedDoc.id] ? '최근만 보기' : '전체 보기'}</button>}"));
  // Shown for a document the writing view folds (the whole one is the only view of a short one); the default is the recent part.
  assert(space.includes("{period === 'documents' && !collectionMode && !folderId && recentHoldOf(selectedDoc.id) && <button"));
  assert(space.includes('const [recentWhole, setRecentWhole] = useState<Record<string, true>>(() => {'));
});

test('W-a: each key re-renders the writing view, so its whole-document reads are kept while the text is the same', () => {
  assert(space.includes('const known = repeatLabels.current.get(space.text)?.get(id);'));
  const authoring = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramPersonalAuthoring.tsx', import.meta.url), 'utf8');
  assert(authoring.includes('},[space.text,doc.id]);'));
  assert(space.includes('const known = recentWideKnown.current.get(next);'));
});
