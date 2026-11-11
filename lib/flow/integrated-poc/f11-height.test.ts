import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// F11 쓰기 화면 세로 공간 (11/11, 안2, RULES W-HEIGHT-01~05): one notice line under the tool bar, the fold bar one line
// shown or folded, 8 around the page and the card. Checked on screen at 1280×655 and 390 (inbox/authprobe-dev-*).
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const alpha = read('../../../components/flow/integrated-poc/AlphaWorkspace.tsx'), editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx');
const space = read('../../../components/flow/integrated-poc/ProgramSpace.tsx'), editorCss = read('../../../components/flow/integrated-poc/ProgramTextEditor.module.css');

test('W-HEIGHT-01/02: the save state, this document\'s kept input and the last message share one line, the most pressing first', () => {
  const line = alpha.slice(alpha.indexOf('const alertLine: ProgramAlertLine | null'), alpha.indexOf('const noteNotice ='));
  assert.ok(line.indexOf('needsInputProtection ?') < line.indexOf('documentRecoveries > 0 ?') && line.indexOf('documentRecoveries > 0 ?') < line.indexOf('message && !participationMessage ?'));
  assert.match(line, /pendingUnknown \? \{ label: snapshot\?\.busy \? '확인 중…' : '다시 확인', run: \(\) => \{ void resolvePendingResult\(\); \}/);
  assert.match(line, /recoveries: documentRecoveries, openRecovery: opener => openRecoveryBox\(opener\)/);
  // The box at the tool bar, the 안내 line and the line under the title step aside for it.
  assert.match(alpha, /recovery: destination\.view === 'space' && needsInputProtection && !alertLine \?/);
  assert.match(alpha, /extras: destination\.view === 'space' && message && !participationMessage && !alertLine/);
  // The editor: its own trouble first (with the host's words and 다시 확인 when it has them), then the host's line, then
  // the space's passing notice; the rest under [자세히]; the tool bar says '확인 필요' only.
  assert.match(editor, /action: hostWarn\?\.action \?\? \(props\.readOnly \? null : \{ label: '다시 저장'/);
  assert.match(editor, /const baseAlert: ProgramAlertLine \| null = ownAlert \?\? serverView\?\.alert \?\? \(serverView && props\.hostNotice \?/);
  assert.match(editor, /\{alertLine\?\.tone === 'warn' \? <span className=\{styles\.status\} data-alert-short>확인 필요<\/span> :/);
  assert.match(editor, /    <\/div>\n    \{alertView\}\n    \{props\.headBelow &&/);
  // A phone shows two buttons at most.
  assert.match(editorCss, /@media \(max-width: 600px\) \{ \.alertActions > button:nth-of-type\(n\+3\) \{ display: none; \}/);
  // The space hands its message to that line on 쓰기 (no banner there).
  assert.match(space, /const noteLineMessage = !!message && message !== FIND_BLOCKED && !!props\.noteHeader && period === 'documents' && !!selectedDoc && !collectionMode;/);
  assert.match(space, /: noteLineMessage \? null : <p role="alert" className=\{styles\.error\}>\{message\}<\/p>\)\}/);
  assert.match(space, /hostNotice=\{noteLineMessage && selected === id \? \{ text: message, close: \(\) => setMessage\(''\) \} : undefined\}/);
});

test('W-HEIGHT-03: the finished tasks share the one fold line with the old days, folded ([보기]) or shown ([접기])', () => {
  assert.match(space, /if \(atEnd && view && \(view\.done\.count \|\| shownDone\) && view\.folds\.some\(fold => fold\.atEnd\)\) return recentPairLine\(id, view, shownDone\);/);
  assert.match(space, />✓ 끝낸 일 \{shownDone\}개 접기<\/button>/);
});
