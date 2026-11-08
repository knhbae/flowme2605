import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// W11 (writing W0 items 22·04): around the title one notice line at most, by priority saved input > the
// development notice > the new-document notice. The saved-input notice stays (it is about kept input; the 더보기
// badge alone is too quiet) and moves into the note chrome's one slot. Plus the W3 follow-up: a date or time
// label starts at its task's title, as the W0 mockup draws it, not at the left edge.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const host = read('../../../components/flow/integrated-poc/AlphaWorkspace.tsx');
const space = read('../../../components/flow/integrated-poc/ProgramSpace.tsx');
const spaceCss = read('../../../components/flow/integrated-poc/ProgramSpace.module.css');
const hostCss = read('../../../components/flow/integrated-poc/AlphaWorkspace.module.css');
const vendor = read('./vendor/text-editor.cjs');
const editorCss = read('./vendor/text-editor.css');

test('one slot under the title on 쓰기: saved input first, then the development notice; the new-document line goes quiet', () => {
  // Review P1: only the 쓰기 tab moves the saved-input notice under the title. 오늘·분류 keep it above the work
  // pane, where it shows (the writing slot is hidden there), and it still comes before the development notice.
  assert.match(host, /const writingTab = usesNoteChrome && mainTab === 'documents';/);
  // Core3 P1 (X5, 11/8): the band is gone. The slot under the title takes this document's own saved input (one small
  // line to the 복구함), then the development notice; a new entry anywhere is said once by the bottom toast.
  assert.match(host, /const noteNotice = writingTab \? documentRecovery \|\| publicNotice : publicNotice;/);
  assert.match(host, /const noteNoticeShown = writingTab && \(!!documentRecovery \|\| !devNoticeSeen\);/);
  assert.match(host, /noteHeader=\{usesNoteChrome \? noteNotice : undefined\} noteNoticeShown=\{noteNoticeShown\}/);
  assert(host.includes('{!usesNoteChrome && publicNotice}'));
  assert(!host.includes('savedNotice'), 'no band left on any screen');
  assert.match(host, /<button type="button" onClick=\{event => openRecoveryBox\(event\.currentTarget\)\}>이 문서에 복구할 입력 \{documentRecoveries\}개 ›<\/button>/);
  assert.match(space, /data-writing-entry-notice data-quiet=\{props\.noteNoticeShown \? 'true' : undefined\}/);
  const quiet = spaceCss.slice(spaceCss.indexOf('.writingEntryNotice[data-quiet="true"] {'));
  for (const kept of ['position: absolute;', 'width: 1px;', 'height: 1px;', 'overflow: hidden;', 'clip-path: inset(50%);']) assert(quiet.slice(0, quiet.indexOf('}')).includes(kept), kept);
});

test('the development notice, closed, is one line beside 확인', () => {
  assert.match(hostCss, /\.devNotice > \.notice:not\(\[open\]\) > summary \{ overflow: hidden; white-space: nowrap; text-overflow: ellipsis; \}/);
  assert.match(hostCss, /\.devNotice \{ display: flex; align-items: center; gap: 8px; min-width: 0; \}/);
});

test('W3 follow-up: a date or time label starts at its task title, measured after the reading insets', () => {
  const geometry = vendor.slice(vendor.indexOf('function syncGeometry('), vendor.indexOf('// Everything below measures the final layout.'));
  assert(geometry.indexOf('applyReadingTaskInset') < geometry.indexOf('syncPropertyLabelInset'));
  const sync = vendor.slice(vendor.indexOf('function syncPropertyLabelInset('), vendor.indexOf('function applyPropertyLabelInset('));
  assert.match(sync, /const owner = row\.dataset\.checkOwner === undefined \? null : rows\[Number\(row\.dataset\.checkOwner\)\];/);
  assert.match(sync, /owner\.querySelector\('\.tle-task-title, \.tle-task-title-complete'\)/);
  // A RAW owner (the caret's row, or composing) is measured on its text, so the label does not jump.
  assert.match(sync, /const text = owner\.firstChild\.textContent \|\| '', task = TASK\.exec\(text\);/);
  assert.match(editorCss.replace(/\r\n/g, '\n'), /\.tle-property-date-label \{ left: var\(--tle-label-inset, var\(--tle-indent, 0px\)\); color: var\(--flowme-b-muted\); font-weight: 400; \}/);
});
