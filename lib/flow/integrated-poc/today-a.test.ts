import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { programDateChipLabel, programDayHeadingParts, programPeriodTitleParts } from './today-title';

// Today visual A (bundle 6, 11/7, spec T1–T11): the 오늘 screen in the writing view's look. Presentation only.
const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
const space = read('components/flow/integrated-poc/ProgramSpace.tsx');
const css = read('components/flow/integrated-poc/ProgramSpace.module.css');
const alpha = read('components/flow/integrated-poc/AlphaWorkspace.tsx');
const today = '2026-11-07';

test('T1: the title in two parts — 오늘 + its long date; another day; a week', () => {
  assert.deepEqual(programPeriodTitleParts('today', today, today), { main: '오늘', sub: '11월 7일 토요일' });
  assert.deepEqual(programPeriodTitleParts('today', '2026-11-09', today), { main: '11월 9일', sub: '월요일' });
  assert.deepEqual(programPeriodTitleParts('week', today, today), { main: '이번 주', sub: '11월 2일 ~ 8일' });
  assert.deepEqual(programPeriodTitleParts('week', '2026-10-30', today), { main: '주간', sub: '10월 26일 ~ 11월 1일' });
  assert.equal(programPeriodTitleParts('month', today, today), null);
  assert.match(space, /<h1>\{titleParts \? <><span className=\{styles\.titleMain\}>\{titleParts\.main\}<\/span><span className=\{styles\.titleSub\}>/);
});

test('T3: the date chip says today and what is left, or the day; it opens the date input, which stays in the page', () => {
  assert.equal(programDateChipLabel('today', today, today, 3), '오늘 · 3개 남음');
  assert.equal(programDateChipLabel('today', '2026-11-09', today, 0), '11월 9일 월');
  assert.equal(programDateChipLabel('week', today, today, 0), '이번 주');
  assert.equal(programDateChipLabel('month', today, today, 0), '11월');
  assert.equal(programDateChipLabel('month', '2027-01-03', today, 0), '2027년 1월');
  assert.match(space, /<button type="button" className=\{styles\.dateChip\} onClick=\{openDatePicker\}>/);
  assert.match(space, /<label className=\{styles\.dateField\}>날짜<input id="program-query-date" type="date"/);
  assert.match(space, /try \{ input\.showPicker\(\); \} catch \{ input\.focus\(\); \}/);
  assert.match(css, /\.dateNav > \.dateField \{ position: absolute; width: 1px; height: 1px;[^}]*clip-path: inset\(50%\);/);
});

test('T9: day headings as in writing (오늘·어제·내일 + date, else the long date); their spoken name is the old label', () => {
  assert.deepEqual(programDayHeadingParts(today, today), { relative: '오늘', main: '오늘', sub: '11월 7일 토요일' });
  assert.deepEqual(programDayHeadingParts('2026-11-06', today), { relative: '어제', main: '어제', sub: '11월 6일 금요일' });
  assert.deepEqual(programDayHeadingParts('2026-11-08', today), { relative: '내일', main: '내일', sub: '11월 8일 일요일' });
  assert.deepEqual(programDayHeadingParts('2026-11-05', today), { relative: null, main: '11월 5일 목요일', sub: '' });
  assert.match(space, /<h2 className=\{styles\.executionGroup\} aria-label=\{item\.addDate \? item\.label : undefined\}>/);
});

test('T4·T5·T7·T8: finished rows are not struck through and their box is not a primary fill; no off-token colors left', () => {
  assert.doesNotMatch(css, /line-through/);
  const done = css.match(/\.space \.check > \.checkMark\[data-check="done"\] \{[^}]*\}/)![0];
  assert.doesNotMatch(done, /primary/);
  assert.match(done, /border-color: var\(--flowme-b-line\); background: var\(--flowme-b-canvas\);/);
  for (const color of ['#eef2ff', '#dfd2b8', '#785627']) assert.ok(!css.includes(color), color);
  // #fcf8ed stays only on the copy header's unverified state (not this screen).
  const beige = css.split('\n').filter(line => line.includes('#fcf8ed'));
  assert.ok(beige.length === 1 && beige[0].trim().startsWith('.copyHeader[data-state="unverified"]'));
});

test('T2·T6·T10·T11: the phone ＋ circle, the row folder, the quiet saved state, 56px rows', () => {
  assert.match(space, /className=\{styles\.noteAdd\} aria-expanded=\{noteQuickOpen\}.*>할 일 추가<\/button>/);
  assert.match(css, /@media \(max-width: 700px\) \{\n  \.space\[data-note-layout="true"\] \.notePeriodActions > \.noteAdd \{/);
  assert.match(space, /<span className=\{styles\.rowFolder\}>\/ \{scope\}<\/span>/);
  assert.match(space, /if \(!actualFolderId \|\| actualFolderId === 'folder-unfiled'\) return null;/);
  assert.match(alpha, /data-quiet=\{!pendingUnknown && !pending && !snapshot\?\.retryableRejectedDraft/);
  assert.match(css, /\.periodStatus p\[data-quiet="true"\] \{ position: absolute;/);
  assert.match(css, /\.executionView \.task \{ min-height: 56px; padding-block: 4px; border-block: 0; \}/);
  assert.match(css, /:is\(\[data-period="today"\], \[data-period="week"\]\) \{ max-width: 760px; \}/);
});
