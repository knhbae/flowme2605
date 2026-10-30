import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// W3 review (Codex, FIX): P1 a tap in the middle of a memo, heading or time row in the reading view put the caret
// at the line end, because editReadingPoint only mapped task titles and a row's own first text node; W3 wrapped
// that text in spans. P2 a long heading lost everything after its first line (the date label's one-line
// ellipsis). Also: the reading surface did not expose a heading's role and level.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const vendor = read('./vendor/text-editor.cjs');
const css = read('./vendor/text-editor.css');
const rule = (selector: string) => {
  const at = css.indexOf(`${selector} {`);
  assert(at >= 0, selector);
  return css.slice(at, css.indexOf('}', at) + 1);
};
type Span = { classList: { contains(name: string): boolean }; textContent: string; previousSibling?: Span | null };
const span = (classes: string, text: string, previous?: Span): Span =>
  ({ classList: { contains: name => classes.split(' ').includes(name) }, textContent: text, previousSibling: previous ?? null });
const paintedSourceOffset = new Function(`${vendor.slice(vendor.indexOf('function paintedSourceOffset('), vendor.indexOf('function editReadingPoint('))}; return paintedSourceOffset;`)() as
  (span: Span | null, text: string, at: number) => number | null;

test('P1: a tap inside a memo marks or its note lands on the same source character', () => {
  const line = '  - 메모: 지난 회의 결정부터 확인', marker = span('tle-memo-syntax', '  - 메모: ');
  const note = span('tle-memo-text', '지난 회의 결정부터 확인', marker);
  assert.equal(paintedSourceOffset(marker, line, 0), 0);
  assert.equal(paintedSourceOffset(note, line, 0), line.indexOf('지난'));
  assert.equal(paintedSourceOffset(note, line, 3), line.indexOf('회의'));
  assert.equal(paintedSourceOffset(note, line, note.textContent.length), line.length);
});

test('P1: a heading title is the line\'s suffix: front, middle and end map past the #s', () => {
  const line = '## 회의 기록', title = span('tle-date-label tle-heading-label', '회의 기록');
  assert.equal(paintedSourceOffset(title, line, 0), 3);
  assert.equal(paintedSourceOffset(title, line, 3), line.indexOf('기록'));
  assert.equal(paintedSourceOffset(title, line, title.textContent.length), line.length);
});

test('P1: a property label maps its name onto the key and the rest onto the value', () => {
  const time = '  - 시간: 09:00', timeLabel = span('tle-date-label tle-property-date-label', '시간 오전 9:00');
  assert.equal(paintedSourceOffset(timeLabel, time, 0), time.indexOf('시간'));
  assert.equal(paintedSourceOffset(timeLabel, time, 2), time.indexOf(':'));
  assert.equal(paintedSourceOffset(timeLabel, time, 3), time.indexOf('09'));
  assert.equal(paintedSourceOffset(timeLabel, time, timeLabel.textContent.length), time.length);
  const middle = paintedSourceOffset(timeLabel, time, 7)!;
  assert(middle > time.indexOf('09') && middle < time.length, String(middle));
  const date = '    - 날짜: 2026-10-31', dateLabel = span('tle-date-label tle-property-date-label', '예정일 10월 31일 (토)');
  assert.equal(paintedSourceOffset(dateLabel, date, 0), date.indexOf('날짜'));
  assert.equal(paintedSourceOffset(dateLabel, date, dateLabel.textContent.length), date.length);
  // A date head label ('10월 30일 (금)') and anything else keep the old rule: the line end.
  assert.equal(paintedSourceOffset(span('tle-date-label', '10월 30일 (금)'), '[2026-10-30]', 2), null);
  assert.equal(paintedSourceOffset(null, time, 2), null);
});

test('P1: editReadingPoint uses that offset, clamped to the line, and keeps the tapped height', () => {
  const tap = vendor.slice(vendor.indexOf('function editReadingPoint('), vendor.indexOf('function applyFoldView('));
  assert.match(tap, /const painted = node && node\.nodeType === 3 && !title && node !== row\.firstChild && row\.contains\(node\)\s*\? paintedSourceOffset\(node\.parentElement, line\.text, hit\.startOffset\) : null;/);
  assert.match(tap, /\} else if \(painted !== null\) \{\s*offset = line\.start \+ Math\.max\(0, Math\.min\(line\.text\.length, painted\)\);\s*screenTop = hit\.getBoundingClientRect\(\)\.top;/);
});

test('P2: a long heading wraps over its RAW box with the same advances; no ellipsis', () => {
  const heading = rule('.tle-heading-label');
  for (const kept of ['inset: 0;', 'text-indent: var(--tle-indent, 0px);', 'white-space: pre-wrap;', 'overflow-wrap: break-word;', 'text-overflow: clip;', 'font-weight: 400;', '-webkit-text-stroke: 0.6px currentColor;']) {
    assert(heading.includes(kept), kept);
  }
  // It comes after the date label rule it narrows, so it wins at the same specificity.
  assert(css.indexOf('.tle-heading-label {') > css.indexOf('.tle-date-label {'));
});

test('the reading surface exposes a heading with its level', () => {
  assert.match(vendor, /title\.setAttribute\('role', 'heading'\);\s*title\.setAttribute\('aria-level', String\(heading\[1\]\.length\)\);/);
});
