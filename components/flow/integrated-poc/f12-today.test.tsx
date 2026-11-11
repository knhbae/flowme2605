import './test-css-modules';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProgramFlowRuns, ProgramRechecks, programFlowRunNextLabel } from './ProgramFlowRuns';
import { ProgramDeferAsk } from './ProgramDeferAsk';
import { ProgramDateSheet } from './ProgramDateSheet';
import type { ProgramDeferPlan, ProgramFlowRun } from '@/lib/flow/integrated-poc/flow-run-progress';

// F12 1차 (PRD §20-4 ①②③, W-FLOW-04·05·07·08·09·10, UX r3 C3·C4·D1·D2·D4·E2): 오늘's progress lines, '다시 확인할 일',
// the once-per-run question and the date sheet's last-day stop; and how ProgramSpace wires them.
const step = (taskId: string, title: string, date: string | null, done = false) => ({ taskId, title, date, done });
const run = (key: string, title: string, extra: Partial<ProgramFlowRun> = {}): ProgramFlowRun => ({ key, kind: 'copy', documentId: `doc-${key}`, title, done: 2, total: 7, basis: 'last',
  anchor: '2026-12-21', mark: 'D-12', steps: [step('a', '발표자 선정', '2026-11-30', true), step('b', '발표자 공지', '2026-12-09')], next: step('b', '발표자 공지', '2026-12-09'), wait: null, ...extra });
const NO = new Set<string>();
const lines = (runs: ProgramFlowRun[], tablet = false, saving = NO) => renderToStaticMarkup(<ProgramFlowRuns runs={runs} today="2026-12-09" tablet={tablet} saving={saving} onCheck={() => {}} onOpen={() => {}} />);

test('a progress line: name · n/m · D-n · 다음: step · 오늘, with a box that checks the step (PRD §20-4 ①)', () => {
  const html = lines([run('p', '월간 발표')]);
  assert(html.includes('월간 발표') && html.includes('2/7') && html.includes('D-12'));
  assert(html.includes('다음: 발표자 공지 · 오늘'));
  assert.match(html, /<button type="button" class="[^"]*check[^"]*" aria-label="발표자 공지 완료" aria-pressed="false"/);
  assert.equal(lines([]), '', 'no running Flow: nothing');
  assert(lines([run('p', '월간 발표')], false, new Set(['b'])).includes('확인 중'), 'its step saving: 확인 중 beside the numbers (W-FLOW-05)');
});

test('waiting: no box, 기다림: subcheck (n일째); without a check record no days (W-FLOW-07)', () => {
  const waiting = run('p', '월간 발표', { wait: { taskId: 's', title: '인사팀 답 확인', parentId: 'a', date: '2026-12-03', days: 3 } });
  const html = lines([waiting]);
  assert(html.includes('기다림: 인사팀 답 확인 (3일째)'));
  assert(!html.includes('aria-label="발표자 공지 완료"'), 'a waiting line has no box');
  assert(lines([{ ...waiting, wait: { ...waiting.wait!, days: null } }]).includes('기다림: 인사팀 답 확인<'), 'typed [x]: no days made up');
});

test('folding: a phone shows 3 and folds the rest into \'Flow n개 더\' with the waiting and undated counted; a tablet shows 5', () => {
  const many = [run('1', '하나'), run('2', '둘'), run('3', '셋'), run('4', '넷', { wait: { taskId: 's', title: '답', parentId: 'a', date: null, days: 1 } }), run('5', '다섯', { next: step('x', '미정 단계', null) })];
  const phone = lines(many);
  assert.equal((phone.match(/data-flow-run=/g) ?? []).length, 3);
  assert(phone.includes('Flow 2개 더 · 기다림 1 · 날짜 미정 1'));
  assert.equal((lines(many, true).match(/data-flow-run=/g) ?? []).length, 5);
  assert.equal(programFlowRunNextLabel('2026-12-10', '2026-12-09'), '내일');
  assert.equal(programFlowRunNextLabel(null, '2026-12-09'), '날짜 미정');
});

test('다시 확인할 일: a dashed box, the step it waits under, and [내일] that moves only the day to look again (W-FLOW-08)', () => {
  const html = renderToStaticMarkup(<ProgramRechecks rows={[{ taskId: 's', title: '하준님 답 확인', parentId: 'p', parentTitle: '⑤ 발표 시간 협의', docId: 'd', docTitle: '월간 발표', date: '2026-12-16', days: 2 }]}
    today="2026-12-16" saving={NO} onCheck={() => {}} onTomorrow={() => {}} onOpen={() => {}} />);
  assert(html.includes('다시 확인할 일') && html.includes('[내일] = 다시 볼 날만'));
  assert(html.includes('하준님 답 확인') && html.includes('⑤ 발표 시간 협의 · 기다림 2일째'));
  assert(html.includes('>내일</button>'));
  assert.equal(renderToStaticMarkup(<ProgramRechecks rows={[]} today="2026-12-16" saving={NO} onCheck={() => {}} onTomorrow={() => {}} onOpen={() => {}} />), '');
});

test('the once-per-run question: three ways with their dates, 겹칠 때만 first; a way past a last-day anchor cannot be chosen (W-FLOW-09·10)', () => {
  const plan = (moves: [string, string | null, string][], blocked: string | null = null): ProgramDeferPlan => ({ ask: true, blocked: blocked ? { taskId: 'x', title: blocked } : null,
    moves: moves.map(([title, from, to], index) => ({ taskId: `t${index}`, title, from, to })) });
  const html = renderToStaticMarkup(<ProgramDeferAsk title="하준님 답 확인" date="2026-12-17" today="2026-12-16" nextTitle="회의실 예약" nextDate="2026-12-16" anchor="2026-12-21" last
    plans={{ overlap: plan([['하준님 답 확인', '2026-12-16', '2026-12-17'], ['회의실 예약', '2026-12-16', '2026-12-17']]), 'keep-gaps': plan([['하준님 답 확인', '2026-12-16', '2026-12-17']], '발표 진행'), none: plan([['하준님 답 확인', '2026-12-16', '2026-12-17']]) }}
    onChoose={() => {}} onCancel={() => {}} />);
  assert(html.includes('겹칠 때만 밀기') && html.includes('기본') && html.includes('간격 지키며 밀기') && html.includes('뒤 단계 그대로'));
  assert(html.includes('회의실 예약 12월 16일 (수) → 12월 17일 (목)'));
  assert(html.includes('기준일 12월 21일 (월) 고정'));
  assert.match(html, /role="radio" aria-checked="true"[^>]*data-defer-mode="overlap"/);
  assert.match(html, /aria-checked="false" disabled=""[^>]*data-defer-mode="keep-gaps"/);
  assert(html.includes('발표 진행이(가) 기준일'));
  assert(html.includes('이 Flow에서 한 번만 묻습니다'));
});

test('the date sheet stops at a last-day Flow\'s anchor: later days hatched and not pickable (W-FLOW-10)', () => {
  const html = renderToStaticMarkup(<ProgramDateSheet title="회의실 예약" summary="월간 발표 · D-3" today="2026-12-18" current="2026-12-18" marked={new Set()} notAfter="2026-12-21"
    blockedNote="기준일 12월 21일 (월) 뒤로는 옮길 수 없습니다." onPick={() => {}} />);
  assert.match(html, /data-date="2026-12-22"[^>]*disabled=""[^>]*data-after-anchor="true"|data-date="2026-12-22"[^>]*data-after-anchor="true"/);
  assert(!/data-date="2026-12-21"[^>]*data-after-anchor/.test(html), 'the anchor day itself can be picked');
  assert(html.includes('기준일 12월 21일 (월) 뒤로는 옮길 수 없습니다.'));
});

test('ProgramSpace wires them: lines and rechecks over 오늘, the day close from 18:00, [내일] through the defer plan, [건너뛰기] by the rule', () => {
  const space = readFileSync(join(process.cwd(), 'components/flow/integrated-poc/ProgramSpace.tsx'), 'utf8').replace(/\r\n/g, '\n');
  assert(space.includes('{todayHere() && <ProgramFlowRuns runs={flowRuns} today={today} tablet={!phoneLayout} saving={completingTaskIds} onCheck={checkRunStep} onOpen={openRun} />}'));
  assert(space.includes('{todayHere() && <ProgramRechecks rows={rechecks}'));
  assert(space.includes("const todayHere = () => period === 'today' && date === today && !folderTab && !selecting && !monthGrid && !folderId && !query;"));
  assert(space.includes('const closing = () => todayHere() && closeHour >= PROGRAM_DAY_CLOSE_HOUR;'));
  assert(space.includes('if (task) void checkTaskFromList(task);'), 'a line\'s box is the list\'s own check');
  assert(space.includes("const mode = !plans.overlap.ask ? 'none' : chosen ?? readProgramDeferChoice(owner.key);"));
  assert(space.includes('if (plan.blocked) { setMessage('), 'past the anchor: nothing moves, said');
  assert(space.includes("void moveTaskHere(task.id, { kind: 'date', date: nextDate });"), 'my own task: W-MENU-07');
  assert(space.includes('const next = programRepeatNextDate(marker.rule, task.date, today);'));
  assert(space.includes("patch: { date: tomorrow } }), true);"), 'a recheck\'s [내일] changes only its date');
  // 390 browser check (11/11): the sheet a long press opens is under the finger; the lifting tap must not pick a day.
  assert(space.includes('onPick={value => { if (Date.now() - closeSheet.at < PROGRAM_CLOSE_SHEET_SETTLE_MS) return;'));
  assert(space.includes('export const PROGRAM_CLOSE_SHEET_SETTLE_MS = 500;'));
  const css = readFileSync(join(process.cwd(), 'components/flow/integrated-poc/ProgramSpace.module.css'), 'utf8');
  assert(css.includes('.space .executionView .task[data-close-row] { grid-template-columns: 48px minmax(0, 1fr) auto 48px; }'), '[내일] has its own column (390: it was squeezed into the ⋯ column)');
  // UX r3 D1 (총괄 11/11 23:4x): the finished rows fold into '끝낸 일 n' in the day close, and leave the list there.
  assert(space.includes("{closeDoneOpen && <ul className={styles.tasks}>{done.map(item => renderListItem(item))}</ul>}</div>)(shownItems.filter(closeDoneRow))}"));
  assert(space.includes('{(closing() ? shownItems.filter(item => !closeDoneRow(item)) : shownItems).map(item => renderListItem(item))}'));
});
