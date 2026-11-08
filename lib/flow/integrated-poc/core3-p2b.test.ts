import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { programFlowProgressShort } from './flow-loop';

// Core3 P2b (11/8): the three places P2 left apart from the approved mockup — the detail's 기준일 (FIG 11), the
// arrival notice as the bottom toast (FIG 13) and the 분야·상황 pills (FIG 10). Nothing saved, served or called changes.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const discovery = read('../../../components/flow/integrated-poc/ProgramDiscovery.tsx');
const alpha = read('../../../components/flow/integrated-poc/AlphaWorkspace.tsx');
const space = read('../../../components/flow/integrated-poc/ProgramSpace.tsx');
const discoveryCss = read('../../../components/flow/integrated-poc/ProgramDiscovery.module.css');
const spaceCss = read('../../../components/flow/integrated-poc/ProgramSpace.module.css');

test('내 진행 in short: done/tasks, or a repeat-only copy\'s checks this week; nothing to count keeps the long line', () => {
  const base = { tasks: 0, done: 0, repeats: 0, started: 0, week: 0, finished: false };
  assert.equal(programFlowProgressShort({ ...base, tasks: 6, done: 2 }), '내 진행 2/6');
  assert.equal(programFlowProgressShort({ ...base, tasks: 6, done: 2, repeats: 1, week: 3 }), '내 진행 2/6');
  assert.equal(programFlowProgressShort({ ...base, repeats: 2, week: 3 }), '내 진행 · 이번 주 3번 체크');
  assert.equal(programFlowProgressShort(base), null);
});

test('FIG 11: no 기준일 field above the list; the head says the dates come with it; 내 도구로 받기 keeps the field', () => {
  const list = discovery.indexOf('<section aria-labelledby={`${uid}-items`}>'), output = discovery.indexOf('{outputOpen && !flow.archived && <section className={styles.outputSection}');
  const field = discovery.indexOf('<label className={`${styles.field} ${styles.anchorRow}`}><span>{anchorName}</span><input type="date" value={detail.anchor}');
  assert(list > 0 && output > list && field > output, 'the field is in the output section only');
  assert.equal(discovery.split('styles.anchorRow').length - 1, 1);
  assert(discovery.includes('{anchorUsed && !flow.archived && !existingCopy && !detail.anchor && <span className={styles.itemsHint} data-anchor-hint> · {anchorName} 정하면 날짜가 나옵니다</span>}'));
  assert(discovery.includes("const anchorName = sourceMeta?.anchorLabel ?? programSummaryAnchor(version.summary) ?? '기준일';"));
});

test('FIG 11: a copy I took says "내 진행 2/6 · 기준일 바꾸기"; the button opens my copy\'s settings (the existing 내 기준일)', () => {
  assert(discovery.includes('{existingCopy && progressShort ? <p className={styles.copyLine} data-flow-progress data-copy-line><span>{progressShort}</span>'));
  assert(discovery.includes('{anchorUsed && onChangeCopyAnchor && <> · <button type="button" className={styles.linkButton} disabled={pending} onClick={() => onChangeCopyAnchor(existingCopy.id)}>기준일 바꾸기</button></>}'));
  assert(alpha.includes('onChangeCopyAnchor={setInspector}'));
  // The one big action stays 내 문서 열기.
  assert(discovery.includes('data-testid="program-existing-copy-return" disabled={pending} onClick={() => navigate({ view: \'space\', id: existingCopy.documentId })}>내 문서 열기</button>'));
});

test('FIG 13: the arrival notice (a new document) is the bottom toast; a target document\'s notice stays in place', () => {
  // P2c: only a Flow's arrival (toastOpen set where it is made); the link notices stay in the document.
  assert(alpha.includes('...(importArrival.toastOpen !== undefined ? { toast: { open: importArrival.toastOpen, onClose: closeArrivalToast, hold: arrivalToastLife.hold } } : {}),'));
  assert.equal(alpha.split('toastOpen: true').length - 1, 1, 'only the Flow arrival');
  assert(space.includes("data-arrival-toast={props.importNotice.toast ? '' : undefined} {...props.importNotice.toast?.hold}>"));
  const toast = spaceCss.slice(spaceCss.indexOf('.space .importNotice[data-arrival-toast] {'));
  assert(toast.includes('position: fixed;') && toast.includes('background: var(--flowme-b-ink); color: #fff;'));
  assert(spaceCss.includes('.space .importNotice[data-arrival-toast] > .importCalendar { background: #fff; color: var(--flowme-b-primary); }'));
  assert(spaceCss.includes('bottom: calc(60px + env(safe-area-inset-bottom) + 12px); } }'));
  assert(spaceCss.includes(':global([data-writing-keyboard="true"]) .space .importNotice[data-arrival-toast] { display: none; }'));
});

test('FIG 10: 분야·상황 are pills, 44px to press; a chosen one looks selected', () => {
  assert(discoveryCss.includes('.page .filterSelect select{-webkit-appearance:none;appearance:none;width:auto;min-width:88px;min-height:44px;padding:0 34px 0 16px;border:1px solid var(--flowme-b-line);border-radius:22px;'));
  assert(discoveryCss.includes('.page .filterSelect select:not(:has(option[value=""]:checked)){'));
  assert(discovery.includes('<option value="">분야</option>') && discovery.includes('<option value="">상황</option>'));
});
