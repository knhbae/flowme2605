import './test-css-modules';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProgramFlowTodayBand, type ProgramFlowBandRow } from './ProgramFlowTodayBand';

// Core3 P1 (user-approved mockup 11/8), widened by F8 1단계 (11/10) into '이어지는 일': one folded line by default — its
// count, the Flows among them and the first two titles, the whole line a button — opened in place; opened is what this
// device remembers (a new key, folded by default).
const row = (id: string, title: string, done = false, kind: ProgramFlowBandRow['kind'] = 'moved'): ProgramFlowBandRow => ({ id, title, kind,
  meta: kind === 'flow' ? [] : ['11/7에 씀', '미룸'], flowTitle: kind === 'flow' ? '이사 준비 2주' : null, flowDocumentId: kind === 'flow' ? 'copy' : null, percent: null, done, busy: false, repeat: null });
const rows = [row('a', '짐 목록 만들기', false, 'flow'), row('b', '전입 신고 예약'), row('c', '인터넷 이전'), row('d', '냉장고 비우기')];
const band = (list = rows, late = 0) => renderToStaticMarkup(<ProgramFlowTodayBand rows={list} open={list.filter(entry => !entry.done).length}
  flow={list.filter(entry => entry.kind === 'flow').length} late={late} failed={null} onCheck={() => {}} onShowSource={() => {}} onDefer={() => {}} onShowToday={() => {}} />);

test('folded by default: one line with the count, the Flows among them and the first two open titles, the whole line a button', () => {
  const html = band();
  assert.match(html, /<button type="button" id="[^"]+" class="[^"]*head[^"]*" aria-expanded="false"/);
  assert(html.includes('이어지는 일') && html.includes('>4<') && html.includes('aria-label="Flow 1"'));
  assert(html.includes('짐 목록 만들기 · 전입 신고 예약') && !html.includes('인터넷 이전'));
  assert(!html.includes('data-band-task'), 'no rows until opened');
  assert.equal(band([]), '', 'nothing continuing and nothing late: no band');
  const lateOnly = band([], 3);
  assert(lateOnly.includes('밀린 일 3가지') && lateOnly.includes('오늘 탭에서 정리'), 'only late ones: one today-navigation line');
  assert(!lateOnly.includes('이어지는 일') && !lateOnly.includes('aria-expanded'), 'no zero continuing count or expansion when only late');
  assert(band([row('x', '끝낸 일', true), row('y', '남은 일')]).includes('>남은 일<'), 'the summary names open ones');
});

test('opened in place: five rows (check, the words and where they were written as the source, 미루기), more and the late line', () => {
  const source = readFileSync(join(process.cwd(), 'components/flow/integrated-poc/ProgramFlowTodayBand.tsx'), 'utf8');
  assert(source.includes("const OPEN_KEY = 'flowme-continue-band-open:v2';") && source.includes('export const PROGRAM_FLOW_BAND_ROWS = 5;'));
  assert(source.includes("useEffect(() => { try { setOpened(localStorage.getItem(OPEN_KEY) === '1'); } catch { /* folded, then */ } }, []);"));
  assert(source.includes('<button type="button" className={styles.text} onClick={() => props.onShowSource(row.id)}'));
  assert(source.includes("{!row.done && <button type=\"button\" className={styles.defer} onClick={() => props.onDefer(row.id)} aria-label={`${row.title} 미루기`}>미루기</button>}"));
  assert(source.includes('{more}개 더 · 오늘 탭에서 보기<ProgramIcon name="right" size={16} />'));
  assert(source.includes("<span><span className={styles.late}>밀린 일 {props.late}가지</span>{' · 오늘 탭에서 정리'}</span><ProgramIcon name=\"right\" size={16} />"));
  // The keyboard still sends it away, as before.
  const css = readFileSync(join(process.cwd(), 'components/flow/integrated-poc/ProgramFlowTodayBand.module.css'), 'utf8');
  assert(css.includes(':global([data-writing-keyboard="true"]) .band { display: none; }'));
  assert(css.includes('.rows > li[data-kind="flow"] .check > span[data-check="open"] { border-color: var(--flowme-b-flow); }'));
});

test('X4 stays: the writing head\'s 날짜별 | 폴더별 and chips are still held back', () => {
  const space = readFileSync(join(process.cwd(), 'components/flow/integrated-poc/ProgramSpace.tsx'), 'utf8');
  assert(space.includes('export const PROGRAM_WRITING_VIEW_SWITCH = false;'));
});
