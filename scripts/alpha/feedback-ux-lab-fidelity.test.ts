import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { isProgramFolderLinkPreviewCurrent, programFolderLinkPreview, type ProgramFolderLinkRelation } from '../../lib/flow/integrated-poc/folder-link-preview';
import { linkProgramFolder } from '../../lib/flow/integrated-poc/folder-link-slot';
import { programFolderInputSuggestion, programFolderPath } from '../../lib/flow/integrated-poc/folder-link-suggestions';
import { createEmptyTextWorkspace, textWorkspaceModel as M } from '../../lib/flow/integrated-poc/text-workspace';

// Static HTML + standalone VM + production pure model only. This does not open
// the app/browser, start a server, call Auth/API, or read/write browser storage.
const file = fileURLToPath(new URL('../../docs/content-audit/2026-10-02-flowme-feedback-ux-bundle-lab-ko.html', import.meta.url));
const html = readFileSync(file, 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]);
assert.equal(scripts.length, 2);
const context = vm.createContext({});
new vm.Script(scripts[0], { filename: `${file}:model` }).runInContext(context, { timeout: 1_000 });

type LabFolder = { id: string; title: string; path: string };
type LabPreview = { sourceIndex: number; source: string; destination: number; relation: ProgramFolderLinkRelation; label: string; key: string };
type LabState = { version: number; sequence: number; folders: LabFolder[]; links: { sourceIndex: number; folderId: string; destination: number }[]; [key: string]: unknown };
type LabModel = {
  KEY: string; source: readonly string[]; sourceBytes: string;
  seed(): LabState; valid(state: LabState): boolean;
  preview(state: LabState, index: number): LabPreview;
  change(state: LabState, action: Record<string, unknown>): LabState;
};
const lab = context.FeedbackUxLabModel as LabModel;
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

function productFixture() {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: 'HTML 위치 충실도 합성 문서' });
  state = { ...state, folders: [...state.folders,
    { id: 'fidelity-learning', title: '학습', parentId: null },
    { id: 'fidelity-project', title: '프로젝트', parentId: null },
    { id: 'folder-work', title: '업무', parentId: null },
    { id: 'folder-study', title: '공부', parentId: 'fidelity-learning' },
    { id: 'folder-other-study', title: '공부', parentId: 'fidelity-project' }] };
  const docId = state.documents[0].id;
  state = M.editText(state, docId, lab.source.join('\n'));
  assert(M.validate(state)); assert.equal(M.raw(M.getDocument(state, docId)), lab.source.join('\n'));
  return { state, docId, doc: M.getDocument(state, docId)! };
}

test('the first inline script is an isolated, frozen four-row model with explicit simulation limits', () => {
  for (const [index, script] of scripts.entries()) new vm.Script(script, { filename: `${file}:script-${index}` });
  assert(Object.isFrozen(lab.source));
  assert.deepEqual(plain(lab.source), ['- 준비 묶음', '  - 준비 메모', '- 공부', '- [ ] 별도 할 일']);
  assert.equal(lab.sourceBytes, JSON.stringify(lab.source)); assert(lab.valid(lab.seed()));
  assert.equal(lab.KEY, 'flow:poc:personal-workspace:v1:feedback-ux-lab:v1');
  assert.doesNotMatch(scripts[0], /localStorage|sessionStorage|fetch\(|XMLHttpRequest/);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /실제 앱의 계정·문서·DB와 연결되지 않습니다/);
  assert.match(html, /정책 검토용/); assert.match(html, /제품 구현으로 판정하지 않습니다/);
});

const rowCases = [
  { index: 0, relation: 'after-subtree', destination: 2, label: '하위 묶음 뒤 3번째 줄에 연결' },
  { index: 1, relation: 'same-line', destination: 1, label: '2번째 현재 줄에서 연결' },
  { index: 2, relation: 'same-line', destination: 2, label: '3번째 현재 줄에서 연결' },
  { index: 3, relation: 'after-line', destination: 4, label: '현재 줄 바로 아래 5번째 줄에 연결' },
] as const;
for (const expected of rowCases) test(`seed row ${expected.index + 1}: standalone ${expected.relation} placement matches the actual pure preview`, () => {
  const seed = lab.seed(), f = productFixture();
  const labBefore = JSON.stringify(seed), productBefore = JSON.stringify(f.state);
  const standalone = lab.preview(seed, expected.index);
  const product = programFolderLinkPreview(f.state, f.docId, f.doc.lines[expected.index].id)!;
  assert(product);
  assert.equal(standalone.source, product.source?.text);
  assert.equal(standalone.relation, expected.relation); assert.equal(standalone.relation, product.destination.relation);
  assert.equal(standalone.destination, expected.destination); assert.equal(standalone.destination, product.destination.index);
  assert.equal(standalone.label, expected.label); assert.equal(standalone.label, product.locationLabel);
  assert.equal(JSON.stringify(seed), labBefore); assert.equal(JSON.stringify(f.state), productBefore);
  assert.equal(lab.sourceBytes, JSON.stringify(lab.source));
});

test('same named folder choices retain distinct IDs and paths in the lab and actual proposal predicate', () => {
  const seed = lab.seed(), f = productFixture(), lineId = f.doc.lines[2].id;
  const suggestion = programFolderInputSuggestion(f.state, f.docId, lineId)!;
  assert(suggestion);
  const expected = plain(seed.folders.filter(folder => folder.title === '공부'));
  assert.deepEqual(suggestion.folders, expected);
  for (const choice of expected) {
    assert.equal(programFolderPath(f.state, choice.id), choice.path);
    const labLinked = lab.change(seed, { type: 'link', preview: lab.preview(seed, 2), folderId: choice.id });
    const productLinked = linkProgramFolder(f.state, f.docId, lineId, { scopeId: choice.id });
    assert.equal(labLinked.links[0].folderId, choice.id);
    assert.deepEqual(productLinked.bindings.find(binding => binding.lineId === lineId), { kind: 'scope', docId: f.docId, lineId, scopeId: choice.id });
    assert.deepEqual(M.getDocument(productLinked, f.docId)!.lines, f.doc.lines);
  }
});

test('bounded lab linking preserves frozen example rows; the actual writer adds or replaces a real line', () => {
  for (const { index } of rowCases) {
    const seed = lab.seed(), f = productFixture(), before = JSON.stringify(f.state);
    const productPreview = programFolderLinkPreview(f.state, f.docId, f.doc.lines[index].id)!;
    const standalone = lab.change(seed, { type: 'link', preview: lab.preview(seed, index), folderId: 'folder-study' });
    const linked = linkProgramFolder(f.state, f.docId, f.doc.lines[index].id, { scopeId: 'folder-study' });
    assert.notEqual(linked, f.state); assert(lab.valid(standalone)); assert(M.validate(linked));
    assert.equal(lab.sourceBytes, JSON.stringify(lab.source));
    assert.equal(standalone.links[0].destination, productPreview.destination.index);
    const result = M.getDocument(linked, f.docId)!;
    if (productPreview.destination.relation === 'same-line') {
      assert.equal(result.lines.length, f.doc.lines.length);
      assert.equal(result.lines[index].id, f.doc.lines[index].id);
      assert.equal(result.lines[index].text, `${'  '.repeat(productPreview.destination.depth)}- 공부`);
      for (const [lineIndex, line] of f.doc.lines.entries()) if (lineIndex !== index) assert.deepEqual(result.lines[lineIndex], line);
      // The lab's source array stays fixed; a direct menu may replace the actual
      // selected leaf's title. It is not a source serializer fidelity claim.
      if (index === 1) assert.notEqual(result.lines[index].text, lab.source[index]);
    } else {
      assert.equal(result.lines.length, f.doc.lines.length + 1);
      assert.equal(result.lines[productPreview.destination.index].text, '- 공부');
      for (const line of f.doc.lines) assert.deepEqual(result.lines.find(entry => entry.id === line.id), line);
    }
    assert.equal(JSON.stringify(f.state), before);
  }
});

test('the four-row lab coordinates are bounded examples, not the actual post-insertion row sequence', () => {
  const seed = lab.seed(), f = productFixture();
  const first = lab.preview(seed, 0);
  const standalone = lab.change(seed, { type: 'link', preview: first, folderId: 'folder-study' });
  const linked = linkProgramFolder(f.state, f.docId, f.doc.lines[0].id, { scopeId: 'folder-study' });
  const nextProduct = programFolderLinkPreview(linked, f.docId, f.doc.lines[2].id)!;
  // The lab still refers to its frozen third example. In the actual source,
  // that same original line ID has shifted down after an explicit insertion.
  assert.equal(lab.preview(standalone, 2).destination, 2);
  assert.equal(nextProduct.destination.index, 3);
  assert.notEqual(lab.preview(standalone, 2).label, nextProduct.locationLabel);
  for (const index of [-1, 4, 1.5]) assert.throws(() => lab.preview(seed, index));
});

test('stale decisions fail in their own contracts without treating VM checks as app or browser validation', () => {
  const seed = lab.seed(), capture = lab.preview(seed, 2), f = productFixture();
  const productCapture = programFolderLinkPreview(f.state, f.docId, f.doc.lines[2].id)!;
  const changedLab = plain(seed); changedLab.folders[1].path = '바뀐 경로 / 공부';
  assert(lab.valid(changedLab));
  assert.throws(() => lab.change(changedLab, { type: 'link', preview: capture, folderId: 'folder-study' }), /위치가 바뀌었습니다/);
  const changedProduct = M.editText(f.state, f.docId, lab.source.map((line, index) => index === 2 ? '- 바뀐 이름' : line).join('\n'));
  assert(M.validate(changedProduct)); assert.equal(isProgramFolderLinkPreviewCurrent(changedProduct, productCapture), false);
  assert.equal(JSON.stringify(lab.source), lab.sourceBytes);
  // Neither VM exposes a browser, storage port or application controller.
  assert.equal(context.window, undefined); assert.equal(context.document, undefined); assert.equal(context.localStorage, undefined);
});
