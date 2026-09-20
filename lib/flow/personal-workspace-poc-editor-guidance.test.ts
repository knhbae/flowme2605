import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES, fingerprintPersonalWorkspacePocAuthoringSource } from './personal-workspace-poc-authoring';
import { PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG } from './personal-workspace-poc-validation-examples';
import { analyzePersonalWorkspacePocAuthoringFidelity } from './personal-workspace-poc-authoring-fidelity';
import { projectPersonalWorkspacePocAuthoringSourceLines } from './personal-workspace-poc-source-editor';
import { buildPersonalWorkspacePocEditorLineGuides } from './personal-workspace-poc-editor-guidance';
import { buildPersonalWorkspacePocLiveEditorPresentation } from './personal-workspace-poc-editor-presentation';
import type { PersonalWorkspacePocLiveEditorLineGuide } from './personal-workspace-poc-editor-presentation';

const rawCases = [
  ...PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.map(template => template.scaffold),
  ...PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG.map(example => example.rawText),
  '# 한글 🙂\r\n## 준비\r- [ ] 제목\n\t- 장소: 긴 '.repeat(4),
  '# \n## \n- [ ] \n  - 날짜: \n',
  '# 제목\n## 준비\n- [ ] 할 일\n  - 장소: ' + '긴한글🙂'.repeat(100),
  '# 문서\n```html\n- [ ] 보호할 줄\n```\n<!-- - [ ] 댓글 -->\n| 표 | 값 |',
];

function project(rawText: string, start = 0, end = start) {
  const sourceFingerprint = fingerprintPersonalWorkspacePocAuthoringSource(rawText);
  const fidelityManifest = analyzePersonalWorkspacePocAuthoringFidelity({ rawText, sourceFingerprint }).manifest;
  return { rawText, sourceFingerprint, fidelityManifest, selectionStart: start, selectionEnd: end,
    view: 'flow' as const, ghostEnabled: true };
}

// The pre-extraction React mapping, kept here as the exact behavioral oracle.
function beforeReactMapping(input: ReturnType<typeof project>): readonly PersonalWorkspacePocLiveEditorLineGuide[] {
  const sourceLineByNumber = new Map(input.fidelityManifest.sourceLines.map(line => [line.line, line]));
  return projectPersonalWorkspacePocAuthoringSourceLines(input).lines.map(line => {
    const sourceLine = sourceLineByNumber.get(line.line);
    const kind = line.reason === 'unsupported' ? 'unsupported'
      : line.reason === 'protected' ? 'protected' : line.reason === 'incomplete' ? 'incomplete' : 'safe';
    const sourceKind = sourceLine?.kind;
    return {
      line: line.line, kind,
      role: sourceKind === 'title' ? 'title' : sourceKind === 'section' ? 'section'
        : sourceKind === 'item' ? 'task' : sourceKind === 'property' ? 'property' : 'prose',
      hierarchyDepth: line.hierarchyDepth, showHierarchyGuide: line.showHierarchyGuide,
      ...(line.presentationText ? { presentationText: line.presentationText } : {}),
      ...(line.ghost ? { ghost: {
        valueStart: line.ghost.valueLocator.valueStartOffset - line.source.startOffset,
        valueEnd: line.ghost.valueLocator.valueEndOffset - line.source.startOffset,
        expectedValue: '' as const, text: line.ghost.text,
      } } : {}),
    };
  });
}

test('K3-A line adapter preserves the React mapping over six scaffolds, 31 examples and four edge sources', () => {
  assert.equal(rawCases.length, 41);
  for (const rawText of rawCases) {
    for (const [start, end] of [[0, 0], [rawText.length, rawText.length], [0, rawText.length]]) {
      const input = project(rawText, start, end);
      const before = JSON.stringify(input);
      assert.deepEqual(buildPersonalWorkspacePocEditorLineGuides(input), beforeReactMapping(input));
      assert.equal(JSON.stringify(input), before);
    }
  }
});

test('K3-A extracted presentation keeps the exact pre-extraction executable source', () => {
  // Captured from reviewed LiveEditor 68a4844094ed... before extraction. The
  // regression must remain runnable without a local output/ backup directory.
  const current = readFileSync(new URL('./personal-workspace-poc-editor-presentation.ts', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(createHash('sha256').update(current.slice(current.indexOf('function clampOffset(')).trim()).digest('hex'),
    '33316c8c327867fbb3c3c3c52d6f0c7272076371b1213f0724b4b39725b04d46');
});

test('K3-A plain view is raw with no ghost or hierarchy decoration for all existing source assets', () => {
  for (const rawText of rawCases) {
    const input = project(rawText);
    const guides = buildPersonalWorkspacePocEditorLineGuides(input);
    const lines = buildPersonalWorkspacePocLiveEditorPresentation(rawText, guides, { start: 0, end: 0 }, { flowViewVisible: false, ghostVisible: true });
    assert.ok(lines.every(line => line.rawText === line.displayText && line.mode === 'raw' && !line.ghost && !line.showHierarchyGuide));
    assert.deepEqual(lines.map(line => line.rawText), rawText.split(/\r\n|\r|\n/u));
  }
});

test('K3-A selected ranges are raw while blank ghosts remain decorative in Flow view', () => {
  const rawText = '# \n## 준비\n- [ ] \n  - 날짜: ';
  const input = project(rawText, 0, rawText.length);
  const lines = buildPersonalWorkspacePocLiveEditorPresentation(rawText, buildPersonalWorkspacePocEditorLineGuides(input),
    { start: 0, end: rawText.length }, { flowViewVisible: true, ghostVisible: true });
  assert.ok(lines.every(line => line.mode === 'raw' && line.displayText === line.rawText));
  assert.ok(lines.filter(line => line.ghost).length >= 2);
  assert.equal(input.rawText, rawText);
});

test('K3-A stale fingerprint, manifest and invalid selection fail back to raw with no ghost', () => {
  const rawText = '# 제목\n## 준비\n- [ ] 할 일\n  - 장소: ';
  const input = project(rawText);
  const mismatchedManifest = project('# 다른 문서').fidelityManifest;
  for (const candidate of [
    { ...input, sourceFingerprint: 'stale' },
    { ...input, fidelityManifest: mismatchedManifest },
    { ...input, selectionStart: -1 },
    { ...input, selectionEnd: rawText.length + 1 },
  ]) {
    const guides = buildPersonalWorkspacePocEditorLineGuides(candidate);
    const lines = buildPersonalWorkspacePocLiveEditorPresentation(rawText, guides, { start: 0, end: 0 }, { flowViewVisible: true, ghostVisible: true });
    assert.ok(lines.every(line => line.mode === 'raw' && line.rawText === line.displayText && !line.ghost));
  }
});

test('K3-A geometry guard rejects length-changing, multiline and unsupported presentations', () => {
  const rawText = '# 한글🙂\t긴줄';
  for (const guide of [
    { line: 1, kind: 'safe' as const, presentationText: rawText + 'x' },
    { line: 1, kind: 'safe' as const, presentationText: rawText.slice(0, -1) + '\n' },
    { line: 1, kind: 'unsupported' as const, presentationText: ' '.repeat(rawText.length) },
  ]) {
    const lines = buildPersonalWorkspacePocLiveEditorPresentation(rawText + '\n', [guide], { start: rawText.length + 1, end: rawText.length + 1 }, { flowViewVisible: true, ghostVisible: true });
    assert.equal(lines[0].mode, 'raw');
    assert.equal(lines[0].displayText, rawText);
  }
});

test('K3-A review messages remain explicit and do not become source or ghost content', () => {
  const input = project('# 문서\n## 준비\n- [ ] 할 일');
  const issues = Object.freeze([{ line: 3, message: '검토 안내' }]);
  const guides = buildPersonalWorkspacePocEditorLineGuides({ ...input, issues });
  assert.equal(guides.find(line => line.line === 3)?.reviewMessage, '검토 안내');
  assert.equal(input.rawText.includes('검토 안내'), false);
  assert.ok(guides.every(line => line.ghost?.text !== '검토 안내'));
});

test('K3-A guidance without a supplied manifest has the same exact projection', () => {
  for (const rawText of rawCases) {
    const input = project(rawText);
    assert.deepEqual(buildPersonalWorkspacePocEditorLineGuides({ ...input, fidelityManifest: undefined }),
      buildPersonalWorkspacePocEditorLineGuides(input));
  }
});
