import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  PersonalWorkspacePocLiveEditor,
  buildPersonalWorkspacePocLiveEditorPresentation,
  didPersonalWorkspacePocNativeReplacementCommit,
  type PersonalWorkspacePocLiveEditorLineGuide,
  type PersonalWorkspacePocLiveEditorSnapshot,
} from './PersonalWorkspacePocLiveEditor';

const componentSource = readFileSync(
  new URL('./PersonalWorkspacePocLiveEditor.tsx', import.meta.url),
  'utf8',
);

const guides: readonly PersonalWorkspacePocLiveEditorLineGuide[] = [
  {
    line: 1,
    kind: 'safe',
    role: 'title',
    presentationText: '  제목',
  },
  {
    line: 2,
    kind: 'safe',
    role: 'task',
    hierarchyDepth: 1,
    showHierarchyGuide: true,
    presentationText: '  할일',
  },
  {
    line: 3,
    kind: 'incomplete',
    role: 'property',
    presentationText: '  미완',
  },
  {
    line: 4,
    kind: 'protected',
    role: 'prose',
    presentationText: '  보호',
  },
  {
    line: 5,
    kind: 'unsupported',
    role: 'prose',
    presentationText: '  제외',
  },
  {
    line: 6,
    kind: 'safe',
    role: 'section',
    presentationText: '길이가 맞지 않음',
  },
];

test('presentation keeps selected and unsafe lines raw and only presents exact-length safe lines', () => {
  const value = '# 제목\n- 할일\n: 미완\n! 보호\n? 제외\n## 구역';
  const result = buildPersonalWorkspacePocLiveEditorPresentation(
    value,
    guides,
    { start: value.indexOf('- 할일'), end: value.indexOf('- 할일') },
    { flowViewVisible: true, ghostVisible: true },
  );

  assert.deepEqual(
    result.map((line) => [line.line, line.displayText, line.mode]),
    [
      [1, '  제목', 'presented'],
      [2, '- 할일', 'raw'],
      [3, ': 미완', 'raw'],
      [4, '! 보호', 'raw'],
      [5, '? 제외', 'raw'],
      [6, '## 구역', 'raw'],
    ],
  );
});

test('moving only the caret renders the previous line and keeps only the current line raw', () => {
  const value = '# 제목\n- 할일';
  const firstCaret = buildPersonalWorkspacePocLiveEditorPresentation(
    value,
    guides,
    { start: 0, end: 0 },
    { flowViewVisible: true, ghostVisible: true },
  );
  const secondLineStart = value.indexOf('- 할일');
  const secondCaret = buildPersonalWorkspacePocLiveEditorPresentation(
    value,
    guides,
    { start: secondLineStart, end: secondLineStart },
    { flowViewVisible: true, ghostVisible: true },
  );

  assert.deepEqual(firstCaret.slice(0, 2).map((line) => line.mode), ['raw', 'presented']);
  assert.deepEqual(secondCaret.slice(0, 2).map((line) => line.mode), ['presented', 'raw']);
  assert.deepEqual(
    firstCaret.slice(0, 2).map((line) => [line.hierarchyDepth, line.showHierarchyGuide]),
    [[0, false], [1, true]],
  );
  assert.deepEqual(
    secondCaret.slice(0, 2).map((line) => line.showHierarchyGuide),
    [false, false],
  );
});

test('flow view off is exact raw text and duplicate or invalid guides fail safe', () => {
  const value = '# 제목\n- 할일';
  const result = buildPersonalWorkspacePocLiveEditorPresentation(
    value,
    [
      ...guides,
      { line: 1, kind: 'safe', presentationText: 'BAD!' },
      { line: 0, kind: 'safe', presentationText: '' },
    ],
    { start: value.length, end: value.length },
    { flowViewVisible: false, ghostVisible: true },
  );

  assert.equal(result.map((line) => line.displayText).join('\n'), value);
  assert.ok(result.every((line) => line.mode === 'raw'));
});

test('CRLF, lone CR, LF, and a trailing terminator share exact logical line geometry', () => {
  const value = '# 제목\r\n- 할일\r: 값\n';
  const mixedGuides: readonly PersonalWorkspacePocLiveEditorLineGuide[] = [
    { line: 1, kind: 'safe', role: 'title', presentationText: '  제목' },
    { line: 2, kind: 'safe', role: 'task', presentationText: '  할일' },
    { line: 3, kind: 'safe', role: 'property', presentationText: '  값' },
    {
      line: 4,
      kind: 'safe',
      role: 'task',
      ghost: { valueStart: 0, valueEnd: 0, expectedValue: '', text: '다음 할 일' },
    },
  ];
  const secondLineStart = value.indexOf('- 할일');

  const onSecondLine = buildPersonalWorkspacePocLiveEditorPresentation(
    value,
    mixedGuides,
    { start: secondLineStart, end: secondLineStart },
    { flowViewVisible: true, ghostVisible: true },
  );
  assert.deepEqual(onSecondLine.map((line) => line.rawText), ['# 제목', '- 할일', ': 값', '']);
  assert.deepEqual(onSecondLine.map((line) => line.displayText), ['  제목', '- 할일', '  값', '']);

  const insideCrLf = buildPersonalWorkspacePocLiveEditorPresentation(
    value,
    mixedGuides,
    { start: value.indexOf('\r\n') + 1, end: value.indexOf('\r\n') + 1 },
    { flowViewVisible: true, ghostVisible: true },
  );
  assert.equal(insideCrLf[0]?.mode, 'raw');
  assert.equal(insideCrLf[1]?.mode, 'presented');

  const afterLoneCr = value.indexOf('\r', value.indexOf('\r\n') + 2) + 1;
  const onThirdLine = buildPersonalWorkspacePocLiveEditorPresentation(
    value,
    mixedGuides,
    { start: afterLoneCr, end: afterLoneCr },
    { flowViewVisible: true, ghostVisible: true },
  );
  assert.equal(onThirdLine[1]?.mode, 'presented');
  assert.equal(onThirdLine[2]?.mode, 'raw');

  const onTrailingBlank = buildPersonalWorkspacePocLiveEditorPresentation(
    value,
    mixedGuides,
    { start: value.length, end: value.length },
    { flowViewVisible: true, ghostVisible: true },
  );
  assert.deepEqual(onTrailingBlank[3]?.ghost, { offset: 0, text: '다음 할 일' });
});

test('Flow view shows every recognized blank ghost independent of selection and text view shows none', () => {
  const value = '# \n- [ ] ';
  const ghostGuides: readonly PersonalWorkspacePocLiveEditorLineGuide[] = [
    {
      line: 1,
      kind: 'incomplete',
      role: 'title',
      ghost: { valueStart: 2, valueEnd: 2, expectedValue: '', text: '예: 이사 준비' },
    },
    {
      line: 2,
      kind: 'safe',
      role: 'task',
      ghost: { valueStart: 6, valueEnd: 6, expectedValue: '', text: '예: 주소 변경' },
    },
  ];

  const visible = buildPersonalWorkspacePocLiveEditorPresentation(
    value,
    ghostGuides,
    { start: 2, end: 2 },
    { flowViewVisible: true, ghostVisible: true },
  );
  assert.deepEqual(visible[0]?.ghost, { offset: 2, text: '예: 이사 준비' });
  assert.deepEqual(visible[1]?.ghost, { offset: 6, text: '예: 주소 변경' });

  const selected = buildPersonalWorkspacePocLiveEditorPresentation(
    value,
    ghostGuides,
    { start: 2, end: value.length },
    { flowViewVisible: true, ghostVisible: true },
  );
  assert.deepEqual(
    selected.map((line) => line.ghost?.text),
    ['예: 이사 준비', '예: 주소 변경'],
  );

  const hidden = buildPersonalWorkspacePocLiveEditorPresentation(
    value,
    ghostGuides,
    { start: 2, end: 2 },
    { flowViewVisible: true, ghostVisible: false },
  );
  assert.ok(hidden.every((line) => line.ghost === undefined));

  const plainText = buildPersonalWorkspacePocLiveEditorPresentation(
    value,
    ghostGuides,
    { start: 2, end: 2 },
    { flowViewVisible: false, ghostVisible: true },
  );
  assert.ok(plainText.every((line) => line.ghost === undefined));

  const blockedKinds = (['protected', 'unsupported'] as const).map((kind) => (
    buildPersonalWorkspacePocLiveEditorPresentation(
      '# ',
      [{
        line: 1,
        kind,
        ghost: { valueStart: 2, valueEnd: 2, expectedValue: '', text: '숨겨야 함' },
      }],
      { start: 2, end: 2 },
      { flowViewVisible: true, ghostVisible: true },
    )[0]?.ghost
  ));
  assert.deepEqual(blockedKinds, [undefined, undefined]);
});

test('component has one accessible native textarea and an inert decorative Flow overlay', () => {
  const markup = renderToStaticMarkup(
    <PersonalWorkspacePocLiveEditor
      editorId="editor-one"
      documentId="document-one"
      initialValue="# 제목\n- 할일"
      lineGuides={guides}
      defaultReviewVisible
    />,
  );

  assert.equal(markup.match(/<textarea\b/gu)?.length, 1);
  assert.match(markup, /<label[^>]+for="personal-workspace-live-editor-editor-one"/u);
  assert.match(markup, /data-testid="personal-workspace-live-editor-textarea"/u);
  assert.match(markup, /aria-labelledby="personal-workspace-live-editor-editor-one-label"/u);
  assert.match(markup, /font-mono text-base leading-6/u);
  assert.match(
    markup,
    /data-testid="personal-workspace-live-editor-presentation-overlay"[^>]+aria-hidden="true"[^>]+pointer-events-none[^>]+select-none/u,
  );
  assert.match(markup, /user-select:none/u);
  assert.match(markup, /data-testid="personal-workspace-live-editor-review"/u);
  assert.match(markup, /aria-pressed="true"/u);
  assert.match(markup, />순수 텍스트</u);
  assert.match(markup, />Flow 편집</u);
  assert.match(markup, />입력 예시</u);
});

test('imperative edit path is strict, native, one logical dispatch, and has no value fallback', () => {
  assert.match(componentSource, /useImperativeHandle\(forwardedRef/u);
  assert.match(componentSource, /readSnapshot/u);
  assert.match(componentSource, /rawText/u);
  assert.match(componentSource, /sourceFingerprint/u);
  assert.match(componentSource, /selectionDirection/u);
  assert.match(componentSource, /scrollTop/u);
  assert.match(componentSource, /scrollLeft/u);
  assert.match(componentSource, /dispatchCount/u);
  assert.match(componentSource, /composing/u);
  assert.match(componentSource, /snapshotsMatch\(request\.expected, current\)/u);
  assert.equal(componentSource.match(/execCommand\('insertText'/gu)?.length, 1);
  assert.match(componentSource, /after\.dispatchCount - input\.beforeDispatchCount === 1/u);
  assert.match(componentSource, /observation\.eventCount \+= 1/u);
  assert.match(componentSource, /independently of the browser's raw input event count/u);
  assert.match(componentSource, /addEventListener\('input', handleNativeInput\)/u);
  assert.match(componentSource, /useLayoutEffect\(\(\) => \{[\s\S]*addEventListener\('input', handleNativeInput\)/u);
  assert.doesNotMatch(componentSource, /onInput=\{/u);
  assert.doesNotMatch(componentSource, /textarea\.value\s*=/u);
  assert.doesNotMatch(componentSource, /value=\{mirrorValue\}/u);
  assert.match(componentSource, /defaultValue=\{initialValue\}/u);
});

test('exact bytes and one logical revision accept a burst of native input events', () => {
  const after: PersonalWorkspacePocLiveEditorSnapshot = {
    editorId: 'editor',
    documentId: 'document',
    rawText: '# inserted',
    sourceFingerprint: 'raw-v1:10:example',
    selectionStart: 10,
    selectionEnd: 10,
    selectionDirection: 'none',
    scrollTop: 0,
    scrollLeft: 0,
    dispatchCount: 8,
    composing: false,
  };

  assert.equal(didPersonalWorkspacePocNativeReplacementCommit({
    expectedRawText: '# inserted',
    beforeDispatchCount: 7,
    observedNativeInputEventCount: 1,
    after,
  }), true);
  assert.equal(didPersonalWorkspacePocNativeReplacementCommit({
    expectedRawText: '# inserted',
    beforeDispatchCount: 7,
    observedNativeInputEventCount: 12,
    after,
  }), true);
  assert.equal(didPersonalWorkspacePocNativeReplacementCommit({
    expectedRawText: '# inserted',
    beforeDispatchCount: 8,
    observedNativeInputEventCount: 1,
    after,
  }), false);
  assert.equal(didPersonalWorkspacePocNativeReplacementCommit({
    expectedRawText: '# other',
    beforeDispatchCount: 7,
    observedNativeInputEventCount: 1,
    after,
  }), false);
  assert.equal(didPersonalWorkspacePocNativeReplacementCommit({
    expectedRawText: '# inserted',
    beforeDispatchCount: 6,
    observedNativeInputEventCount: 1,
    after,
  }), false);
  assert.equal(didPersonalWorkspacePocNativeReplacementCommit({
    expectedRawText: '# inserted',
    beforeDispatchCount: 7,
    observedNativeInputEventCount: 1,
    after: null,
  }), false);
  assert.equal(didPersonalWorkspacePocNativeReplacementCommit({
    expectedRawText: '# inserted',
    beforeDispatchCount: 7,
    observedNativeInputEventCount: 0,
    after,
  }), false);
});

test('composition and rejected native commands stop without a synthetic edit fallback', () => {
  const composingGuard = componentSource.indexOf('composingRef.current || current.composing');
  const command = componentSource.indexOf("ownerDocument.execCommand('insertText'");
  const rejected = componentSource.indexOf("reason: commandAccepted ? 'native-transaction-diverged' : 'native-command-rejected'");

  assert.ok(composingGuard >= 0);
  assert.ok(command > composingGuard);
  assert.ok(rejected > command);
  assert.match(componentSource, /onCompositionStart/u);
  assert.match(componentSource, /onCompositionEnd/u);
  assert.doesNotMatch(componentSource, /dispatchEvent\(/u);
  assert.doesNotMatch(componentSource, /new InputEvent/u);
});

test('view option buttons preserve editor selection and never conditionally own the textarea', () => {
  assert.match(componentSource, /onPointerDown=\{preserveEditorSelectionOnPointerDown\}/u);
  assert.equal(componentSource.match(/data-testid="personal-workspace-live-editor-(?:text-view|flow-view|ghost|review)-toggle"/gu)?.length, 4);
  const overlayBranch = componentSource.indexOf('{flowViewVisible ? (');
  const textarea = componentSource.indexOf('<textarea');
  assert.ok(overlayBranch >= 0);
  assert.ok(textarea > overlayBranch);
  assert.match(componentSource, /\) : null\}\n        <textarea/u);
  assert.match(componentSource, /const identity = useRef\(Object\.freeze\(\{ editorId, documentId \}\)\)/u);
  assert.match(componentSource, /Mount-time source bytes, loaded only after draft recovery/u);
  assert.match(componentSource, /onSelectionChangeRef\.current\?\.\(snapshot\)/u);
});

test('context helper and one-level hierarchy stay presentation-only and geometry guarded', () => {
  assert.match(componentSource, /data-testid="personal-workspace-authoring-helper-anchor"/u);
  assert.match(componentSource, /data-source-line=\{contextAction\.sourceLine\}/u);
  assert.match(componentSource, /data-owner=\{contextAction\.owner\}/u);
  assert.match(componentSource, /aria-controls=\{contextAction\.controlsId\}/u);
  assert.match(componentSource, /className="absolute right-2[^"]+h-12 w-12/u);
  assert.match(componentSource, /showHierarchyGuide: Boolean\(canPresent && guide\?\.showHierarchyGuide\)/u);
  assert.match(componentSource, /data-hierarchy-depth=\{line\.hierarchyDepth\}/u);
  assert.match(componentSource, /data-hierarchy-guide=\{line\.showHierarchyGuide \? 'true' : 'false'\}/u);
  assert.match(componentSource, /data-hanging-indent=\{line\.showHierarchyGuide \? '2ch' : '0'\}/u);
  assert.match(componentSource, /isSameLengthSingleLine\(rawText, guide\.presentationText\)/u);
});
