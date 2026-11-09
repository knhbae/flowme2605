import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { ProgramPublicFlow, ProgramPublicItem, ProgramPublicVersion } from './contract';
import { programCardShape, programFlowCardLines, programSummaryAnchor, programSummaryLine } from './program-discovery-display';
import { PROGRAM_OFFICIAL_LABEL, programFlowAttributionLabel } from './alpha-official-actors';

// Core3 P2 (11/8, X6·X7): the Flow tab opens on 찾기 with one head line ("Flow", [이야기], ⋯) and three-line cards;
// the detail's one action stays fixed above the tab bar. Nothing saved, served or called changes.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const discovery = read('../../../components/flow/integrated-poc/ProgramDiscovery.tsx');
const alpha = read('../../../components/flow/integrated-poc/AlphaWorkspace.tsx');
const css = read('../../../components/flow/integrated-poc/ProgramDiscovery.module.css');

const item = (id: string, schedule: ProgramPublicItem['schedule'], title = `할 일 ${id}`): ProgramPublicItem =>
  ({ id, title, description: '', completionCriteria: '', sourceUrl: null, schedule, subchecks: [] });
const repeat = (): ProgramPublicItem['schedule'] =>
  ({ kind: 'recurring', version: 1, rule: { version: 1, semantics: 'authoring-v1', frequency: 'weekly', interval: 1, end: null }, start: { kind: 'undated' }, time: null, timeZone: null });
const version = (items: ProgramPublicItem[], extra: Partial<ProgramPublicVersion> = {}): ProgramPublicVersion => ({ id: 'version-a', flowId: 'flow-a', number: 1, parentVersionId: null,
  title: '이사 준비 2주', summary: '기준일: 이사일\n이사일 전후로 전입·인터넷·짐 정리를\n날짜에 맞춰 합니다.', items, createdBy: 'member-x', createdAt: '2026-11-08T00:00:00.000Z',
  source: { kind: 'user-text', label: '직접 정리', url: null, checkedAt: null }, ...extra });
const flow = (extra: Partial<ProgramPublicFlow> = {}): ProgramPublicFlow =>
  ({ id: 'flow-a', ownerId: 'member-x', currentVersionId: 'version-a', category: '생활', situations: ['이사'], derivedFrom: null, archived: false, ...extra });

test('three card lines: title + tag, one summary line without the 기준일 line, "할 일 n · 일정 모양 · 분야"', () => {
  const moving = version([item('1', { kind: 'relative', days: -14 }, '짐 목록 만들기'), item('2', { kind: 'undated' })]);
  const official = programFlowCardLines(flow(), moving, { needsReview: false, inMyDocuments: false, official: true });
  assert.equal(official.tag, '공식');
  assert.equal(official.oneLine, '이사일 전후로 전입·인터넷·짐 정리를 날짜에 맞춰 합니다.');
  assert.equal(official.brief, '할 일 2 · 이사일 기준 · 생활');
  // A Flow already in my documents says so (grey) before 공식; a review badge still wins over both.
  assert.equal(programFlowCardLines(flow(), moving, { needsReview: false, inMyDocuments: true, official: true }).tag, '내 문서에 있음');
  assert.equal(programFlowCardLines(flow(), moving, { needsReview: true, inMyDocuments: true, official: true }).tag, '출처 재검토 필요');
  assert.equal(programFlowCardLines(flow(), moving, { needsReview: false, inMyDocuments: false }).tag, null);
  // A catalog Flow names its 기준일 in its metadata; that name wins over the summary line.
  assert.equal(programFlowCardLines(flow(), moving, { needsReview: false, inMyDocuments: false, anchorLabel: '출생일' }).brief, '할 일 2 · 출생일 기준 · 생활');
  assert.equal(programSummaryAnchor('이사 전 할 일'), null);
  assert.equal(programSummaryLine('한 줄\n두 줄'), '한 줄 두 줄');
});

test('schedule shape on the card: every item repeats, anchored (even with a repeat line), some repeat, fixed, undated', () => {
  assert.equal(programCardShape(version([item('1', repeat()), item('2', repeat())]), null), '↻ 반복');
  assert.equal(programCardShape(version([item('1', repeat()), item('2', { kind: 'relative', days: 1 })]), '이사일'), '이사일 기준');
  assert.equal(programCardShape(version([item('1', { kind: 'undated' }, '짐 정리 30분 @매주 토'), item('2', { kind: 'relative', days: -14 })]), null), '기준일 기준');
  assert.equal(programCardShape(version([item('1', repeat()), item('2', { kind: 'fixed', date: '2026-11-20' })]), null), '반복 포함');
  assert.equal(programCardShape(version([item('1', { kind: 'fixed', date: '2026-11-20' }), item('2', { kind: 'relative', days: 1 })]), null), '기준일 기준');
  assert.equal(programCardShape(version([item('1', { kind: 'fixed', date: '2026-11-20' }), item('2', { kind: 'undated' })]), null), '날짜 고정');
  assert.equal(programCardShape(version([item('1', { kind: 'undated' })]), null), '날짜 미정');
  assert.equal(programCardShape(version([]), null), '날짜 미정');
});

test('공식 comes only from the official actors, as before; its label is one constant', () => {
  const view = version([]);
  assert.equal(programFlowAttributionLabel(flow(), view, ['member-x']), PROGRAM_OFFICIAL_LABEL);
  assert.equal(programFlowAttributionLabel(flow(), view, []), '사용자가 정리한 자료');
  assert(discovery.includes('official: programFlowAttributionLabel(row, current, officialActors, data) === PROGRAM_OFFICIAL_LABEL'));
});

test('the wiring: one head line, three-line cards, no sub-tabs, the Flow tab opens 찾기, the action sits on the tab bar', () => {
  // Head: "Flow", [이야기] (a text button the host wires to 이야기), ⋯.
  assert(discovery.includes(`<h1>{onOpenStories ? 'Flow' : 'Flow 찾기'}</h1>`));
  assert(discovery.includes('data-open-stories disabled={pending} onClick={onOpenStories}>이야기</button>'));
  assert(alpha.includes("onOpenStories={() => void navigate({ view: 'community' })}"));
  // The sub-tabs are gone; 이야기 keeps a way back to 찾기.
  assert(!alpha.includes('aria-label="둘러보기 종류"') && !alpha.includes('lastBrowse'));
  assert(alpha.includes(`{destination.view === 'community' && <nav className={styles.browseNavigation} aria-label="이야기 위치">`));
  // Cards: three spans and an accessible name that reads the same three lines; no first task or source line.
  const card = discovery.slice(discovery.indexOf('data-card-lines="3"'), discovery.indexOf('</button></li>;', discovery.indexOf('data-card-lines="3"')));
  assert(card.includes("aria-label={[lines.title, lines.tag, lines.oneLine, lines.brief].filter(Boolean).join(', ')}"));
  assert(!card.includes('lines.firstItem') && !card.includes('lines.source') && !card.includes('lines.meta'));
  assert(css.includes('.flowCard[data-card-lines="3"] .cardSummary{-webkit-line-clamp:1;'));
  // Detail: one action (가져오기, or 내 문서 열기 for a Flow already taken), fixed right above the 60px tab bar.
  assert(discovery.includes(": '가져오기';") && discovery.includes('>내 문서 열기</button>'));
  // F6-B1: the tab bar is 68px now.
  assert(css.includes('bottom:calc(68px + env(safe-area-inset-bottom));z-index:30;'));
  assert(!css.includes('bottom:calc(76px + env(safe-area-inset-bottom))'));
});
