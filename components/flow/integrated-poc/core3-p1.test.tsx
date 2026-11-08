import './test-css-modules';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ProgramFlowTodayBand, type ProgramFlowBandRow } from './ProgramFlowTodayBand';

// Core3 P1 (user-approved mockup 11/8): the 오늘 Flow band is one folded line by default — its count and the first two
// titles, the whole line a button — opened in place; opened is what this device remembers.
const row = (id: string, title: string, done = false): ProgramFlowBandRow => ({ id, title, flowTitle: '이사 준비 2주', flowDocumentId: 'copy', done, busy: false, repeat: null });
const rows = [row('a', '짐 목록 만들기'), row('b', '전입 신고 예약'), row('c', '인터넷 이전'), row('d', '냉장고 비우기')];
const band = (list = rows) => renderToStaticMarkup(<ProgramFlowTodayBand rows={list} open={list.filter(entry => !entry.done).length} failed={null}
  onCheck={() => {}} onOpenFlow={() => {}} onShowToday={() => {}} />);

test('folded by default: one line with the count and the first two open titles, the whole line a button', () => {
  const html = band();
  assert.match(html, /<button type="button" id="[^"]+" class="[^"]*head[^"]*" aria-expanded="false"/);
  assert(html.includes('오늘 Flow 할 일') && html.includes('>4<'));
  assert(html.includes('짐 목록 만들기 · 전입 신고 예약') && !html.includes('인터넷 이전'));
  assert(!html.includes('data-band-task'), 'no rows until opened');
  assert(!html.includes('오늘에서 모두 보기'));
  assert.equal(band([]), '', 'no rows, no band');
  assert(band([row('x', '끝낸 일', true), row('y', '남은 일')]).includes('>남은 일<'), 'the summary names open ones');
});

test('opened in place: three rows with checks and "Flow 이름 ›", then 오늘에서 모두 보기; opened is remembered here', () => {
  const source = readFileSync(join(process.cwd(), 'components/flow/integrated-poc/ProgramFlowTodayBand.tsx'), 'utf8');
  assert(source.includes("const OPEN_KEY = 'flowme-flow-today-band-open:v1';"));
  assert(source.includes("useEffect(() => { try { setOpened(localStorage.getItem(OPEN_KEY) === '1'); } catch { /* folded, then */ } }, []);"));
  assert(source.includes('{opened && <><ul id={`${uid}-rows`}'));
  assert(source.includes("{more > 0 ? `${more}개 더 · 오늘에서 모두 보기` : '오늘에서 모두 보기'}"));
  assert(source.includes('>{row.flowTitle} ›</button>'));
  // The keyboard still sends it away, as before.
  const css = readFileSync(join(process.cwd(), 'components/flow/integrated-poc/ProgramFlowTodayBand.module.css'), 'utf8');
  assert(css.includes(':global([data-writing-keyboard="true"]) .band { display: none; }'));
});

test('X4 stays: the writing head\'s 날짜별 | 폴더별 and chips are still held back', () => {
  const space = readFileSync(join(process.cwd(), 'components/flow/integrated-poc/ProgramSpace.tsx'), 'utf8');
  assert(space.includes('export const PROGRAM_WRITING_VIEW_SWITCH = false;'));
});
