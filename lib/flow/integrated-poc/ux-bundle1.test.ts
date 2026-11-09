import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEV_NOTICE_TEXT, DEV_NOTICE_VERSION } from './dev-notice';
import { programImportArrivalNotice, programImportRepeatNotice } from './program-discovery-display';

// UX 1차 묶음 (11/6, UX audit 2311): the person uses FlowMe for real; the screens stop saying it is a development build.
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
const component = (name: string) => read(`components/flow/integrated-poc/${name}`);

test('A1·A2: no development wording on the sign-in screen, the workspace or the publish steps', () => {
  for (const name of ['AlphaAuthPanel.tsx', 'AlphaWorkspace.tsx', 'ProgramCommunity.tsx', 'ProgramPublisher.tsx', 'ProgramShareLink.tsx'])
    for (const word of ['개발계', '로그인 검증', '개발 화면', '개발 설정', '개발용 통합 검증판', '유일본', 'Alpha에 로그인한', "'합성 검증'"]) assert(!component(name).includes(word), `${name}: ${word}`);
  assert(!DEV_NOTICE_TEXT.includes('개발'));
  assert.equal(DEV_NOTICE_TEXT, '공개한 Flow와 글은 로그인한 다른 사용자도 봅니다. 내 문서와 할 일은 나만 봅니다.');
  assert.equal(DEV_NOTICE_VERSION, '2026-10-31', 'the acknowledgement key stays, so the notice does not show again');
  const signIn = component('AlphaAuthPanel.tsx');
  // F6-B1 (방향 B): the sign-in says it in one sentence on navy, above the form (the page's description stays below).
  assert(signIn.includes('<p className={styles.tagline}>해 본 사람의 계획을<br /><span>내 일정으로.</span></p>'));
  assert(signIn.includes('<h1 id="alpha-heading">지금은 로그인할 수 없습니다</h1><p>잠시 뒤 다시 시도해 주세요.</p>'));
  assert(signIn.includes("return '지금 이메일을 보낼 수 없습니다. 잠시 뒤 다시 시도해 주세요.';"));
  assert(signIn.includes('<h2>처음 오셨네요</h2><p>빈 공간을 만들고 시작합니다.</p>'));
  assert(!signIn.includes('personalWorkspacePoc'), 'the old local PoC is not linked before signing in');
  const workspace = component('AlphaWorkspace.tsx');
  assert(workspace.includes('<a className={styles.menuLink} href="/my?personalWorkspacePoc=v1">이 기기에만 저장한 예전 자료</a>'), '…it is reached from 더보기 › 자료');
  assert(workspace.includes('<summary>공개한 Flow와 글만 다른 사용자에게 보입니다.</summary>'));
  assert(!workspace.includes('styles.development'), 'no 개발계 / 합성 검증 label in the header');
  assert(workspace.includes('<details className={styles.menuNote}><summary>기록 정보</summary><small className={styles.account}>서버 기록 번호'), 'the record number only when asked');
  assert(component('ProgramShareLink.tsx').includes("'FlowMe에 로그인한 사람만 열 수 있습니다.'"));
  assert(read('app/alpha/page.tsx').includes("title: 'FlowMe',"));
});

test('B1: a new document says what came in and offers 되돌리기 there only, by the existing undo, while it is the last change', () => {
  assert.equal(programImportArrivalNotice('근력 운동', false, programImportRepeatNotice(2, 0)), '‘근력 운동’을 가져왔습니다. 반복 2개를 넣었습니다. 날짜가 있는 할 일은 오늘에도 보입니다.');
  assert.match(programImportArrivalNotice('근력 운동', true), /휴지통으로 옮길 수 있습니다/);
  const workspace = component('AlphaWorkspace.tsx');
  // Not the general message (which stayed on 오늘, Flow 찾기 and 내 활동), but the document's own notice slot.
  assert(!workspace.includes('setMessage(programImportArrivalNotice('));
  assert(workspace.includes("setImportArrival(previous => previous && (previous.actorId !== session.userId || destination.view !== 'space' || destination.id !== previous.documentId) ? null : previous);"));
  assert(workspace.includes("try { await history('undo'); }"), 'the same server undo as 더보기 › 되돌리기');
  assert(workspace.includes("onCancel: importArrival.revision !== null && snapshot?.account?.revision === importArrival.revision && !!snapshot?.canUndo && !external ? () => { void undoImportArrival(); } : undefined"));
  assert(component('ProgramSpace.tsx').includes("props.importNotice.actionLabel ?? '이번 가져오기 취소'"));
});

test('B2·B3·B4·C1·C2·C3·C6·B9: the layout fixes are CSS on the screens named, with the source line in one line', () => {
  const discovery = read('components/flow/integrated-poc/ProgramDiscovery.module.css');
  assert(discovery.includes('.page .destinationChoice input{flex:none;width:20px;height:20px;min-height:0;margin:3px 0 0}'));
  assert(discovery.includes('.sourceLine a{display:inline-block;padding:11px 0;margin:-11px 0}'));
  assert(discovery.includes('.summaryClamp{overflow:hidden;max-height:3lh}') && !discovery.includes('-webkit-line-clamp:3'));
  assert(discovery.includes('.summaryMore{display:block;margin-left:auto;min-height:44px!important;padding:0!important;border:0!important;background:none!important}'));
  const detail = component('ProgramDiscovery.tsx');
  assert(!detail.includes('{longSummary && <button'), 'PC also shows 더 보기 only when the summary is cut');
  assert(!detail.includes('출처 확인 기록'));
  const workspaceCss = read('components/flow/integrated-poc/AlphaWorkspace.module.css');
  assert(workspaceCss.includes('@media (max-width: 700px) { .triedPrompt { top: auto; bottom: calc(68px + env(safe-area-inset-bottom) + 12px);')); // F6-B1: 68px tabs
  assert(workspaceCss.includes('.recoveryBox > summary::-webkit-details-marker { display: none; }'));
  assert(read('components/flow/integrated-poc/ProgramSpace.module.css').includes('@media (max-width: 700px) { .space[data-note-layout="true"] .notePeriodTitle h1 { font-size: 20px; line-height: 28px; } }'));
  const editorCss = read('components/flow/integrated-poc/ProgramTextEditor.module.css');
  assert(editorCss.includes('.tle-line-property:not(.tle-line-date-property)) { color: var(--flowme-b-muted); }'));
  // B9 keeps the RAW ruler (U45): no hanging indent comes back for wrapped property lines.
  assert(editorCss.includes(':is(.tle-line-prose,.tle-line-property:not(.tle-line-date-property))) { padding-left: 0; text-indent: 0; }'));
});

test('B7·C5: 내 활동 starts with its title; a today row is read as it shows', () => {
  const community = component('ProgramCommunity.tsx');
  // Core3 P3 (FIG 14): 나's head is its title alone (글 쓰기 under 내가 쓴 글); the 복구함 line follows it.
  assert(community.includes("{view !== 'activity' && writePost}</header>\n    {view === 'activity' && activityTabs}"));
  assert(community.includes('<div className={styles.actions}>{writePost}</div>'));
  assert(component('ProgramPublicationManagement.tsx').includes("!document ? '이 Flow와 연결된 내 문서가 없습니다.'"), 'missing source feedback follows the Flow into its shared management view');
  const space = component('ProgramSpace.tsx');
  assert(space.includes("${origin.label !== '직접 작성' ? ` · ${origin.label}` : ''} · ${task.docTitle} 원문 열기"));
  assert(space.includes('`반복 ${repeatShown.marker.label}`'));
});

test('C8: the app page names FlowMe, says what it is, and has a 180px home screen icon', () => {
  const page = read('app/alpha/page.tsx');
  assert(page.includes("description: '할 일과 메모를 한곳에 쓰고, 다른 사람의 Flow를 내 계획으로 가져옵니다.'"));
  assert(page.includes("apple: { url: '/alpha/apple-touch-icon.png', sizes: '180x180' }"));
  const png = readFileSync(join(process.cwd(), 'public/alpha/apple-touch-icon.png'));
  assert.equal(png.subarray(1, 4).toString('latin1'), 'PNG');
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [180, 180]);
});
