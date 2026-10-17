import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createProgramData, createProgramPrivateSpace } from '../../../lib/flow/integrated-poc/program-data';
import { createEmptyTextWorkspace, textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import { createProgramWritingEntry } from '../../../lib/flow/integrated-poc/writing-entry';
import { programDocumentContentLock } from '../../../lib/flow/integrated-poc/reference-execution-guard';

// Execute the actual UI callbacks with the real writing transition. Browser
// screenshots/focus are recorded separately; these are not physical IME tests.
const spaceTree = ts.createSourceFile('ProgramSpace.tsx', readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const editorTree = ts.createSourceFile('ProgramTextEditor.tsx', readFileSync(new URL('./ProgramTextEditor.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(tree: ts.SourceFile, predicate: (node: ts.Node) => boolean): ts.Node {
  let found: ts.Node | undefined;
  function visit(node: ts.Node) { if (!found && predicate(node)) found = node; if (!found) ts.forEachChild(node, visit); }
  visit(tree); assert(found); return found;
}

for (const scenario of ['empty', 'saved-body', 'draft-body', 'dirty', 'composing', 'saving', 'locked', 'preparing', 'archived', 'missing-reader', 'foreign-actor', 'save-failed'] as const) {
  test(`writing example uses the existing blank-document boundary: ${scenario}`, async () => {
    const data = createProgramData(), actorId = data.activeActorId, owner = createProgramPrivateSpace();
    owner.text = M.addDocument(createEmptyTextWorkspace(), { title: '빈 글' });
    const id = owner.text.documents[0].id;
    if (scenario === 'saved-body') owner.text = M.editText(owner.text, id, '보존할 본문');
    if (scenario === 'archived') owner.archivedDocumentIds.push(id);
    data.spaces[actorId] = owner;
    if (scenario === 'foreign-actor') data.activeActorId = 'different-owner';
    const preparing = { current: scenario === 'preparing' }, inputLockCount = { current: scenario === 'locked' ? 1 : 0 };
    const tools = { open: true }, notices: string[] = [], focus: unknown[] = [], commits: any[] = [];
    let releases = 0;
    const raw = scenario === 'draft-body' ? '아직 저장 전인 입력' : scenario === 'saved-body' ? '보존할 본문' : '';
    const context = { selectedRef: { current: id }, dataRef: { current: data }, actorId, M, programDocumentContentLock,
      draftReaders: { current: scenario === 'missing-reader' ? {} : { [id]: () => raw } },
      saveStatusReaders: { current: { [id]: () => ({ composing: scenario === 'composing', saving: scenario === 'saving', failed: false }) } },
      preparing, inputLockCount, dirty: { current: { [id]: scenario === 'dirty' } },
      setMessage: (message: string) => notices.push(message), document: { activeElement: {} },
      lockInput: () => () => { releases++; }, setPreparingDocumentAction() {}, PROGRAM_EMPTY_EXAMPLE: '- [ ] 예시 할 일\n자유 메모',
      editorCommit: async (docId: string, next: any, label: string, options: any) => {
        assert.equal(docId, id); assert.equal(label, '작성 예시 넣기'); assert.equal(options.expectedWorkspace, owner.text);
        commits.push(next); return scenario !== 'save-failed';
      },
      root: { current: { querySelectorAll: () => [tools] } }, setWritingFocus: (request: unknown) => focus.push(request),
    };
    const callback = find(spaceTree, n => ts.isFunctionDeclaration(n) && n.name?.text === 'applyWritingExample');
    const saved = await evaluate(callback.getText(spaceTree), context)();
    assert.equal(saved, scenario === 'empty');
    assert.equal(commits.length, scenario === 'empty' || scenario === 'save-failed' ? 1 : 0);
    assert.equal(releases, commits.length);
    assert.equal(tools.open, scenario !== 'empty'); assert.equal(focus.length, scenario === 'empty' ? 1 : 0);
    assert.equal(M.raw(owner.text.documents[0]), scenario === 'saved-body' ? '보존할 본문' : '');
    if (scenario === 'empty') assert.equal(M.raw(M.getDocument(commits[0], id)), '- [ ] 예시 할 일\n자유 메모');
  });
}
function evaluate(expression: string, context: Record<string, unknown>) {
  const compiled = ts.transpileModule(`const callback = (${expression});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(context), `${compiled};return callback;`)(...Object.values(context));
}

test('hidden retained editors close only their tools without touching the native input or focus', () => {
  const effect = find(editorTree, n => ts.isCallExpression(n) && n.expression.getText(editorTree) === 'useEffect'
    && !!n.arguments[0]?.getText(editorTree).includes("'[data-editor-tools]'")) as ts.CallExpression;
  for (const active of [true, false, undefined]) {
    const tools = { open: true };
    const hostRef = { current: { closest: (selector: string) => { assert.equal(selector, 'section'); return {
      querySelector: (selector: string) => { assert.equal(selector, '[data-editor-tools]'); return tools; },
    }; } } };
    evaluate(effect.arguments[0].getText(editorTree), { props: { active }, hostRef })();
    assert.equal(tools.open, active !== false);
  }
});

test('task actions have a task title while insertion and protected contexts keep their own names', () => {
  const declaration = find(editorTree, n => ts.isVariableDeclaration(n) && n.name.getText(editorTree) === 'title') as ts.VariableDeclaration;
  for (const [panel, row, protectedExecutionPanel, expected] of [
    [{ kind: 'insert' }, { progressTargetId: 'task-id' }, false, '항목 작업'],
    [{ kind: 'insert' }, { kind: 'memo' }, false, '이 위치에 추가'],
    [{ kind: 'date' }, { progressTargetId: 'task-id' }, false, '항목 날짜'],
    [{ kind: 'insert' }, { progressTargetId: 'task-id' }, true, '연결된 항목'],
  ] as const) assert.equal(evaluate(declaration.initializer!.getText(editorTree), { panel, row, protectedExecutionPanel }), expected);
});

for (const scenario of ['reuse-remembered', 'reuse-new-position', 'create', 'failed', 'flush-failed', 'locked'] as const) {
  test(`new writing feedback follows the real result: ${scenario}`, async () => {
    let data = createProgramData();
    const actorId = data.activeActorId, space = createProgramPrivateSpace();
    space.text = M.addDocument(createEmptyTextWorkspace(), { title: '이름이 남아 있는 글' });
    const id = space.text.documents[0].id;
    if (['create', 'failed', 'flush-failed', 'locked'].includes(scenario)) space.text = M.editText(space.text, id, '- [ ] 보존할 기존 내용');
    if (scenario !== 'reuse-new-position') space.position.documentId = id;
    data.spaces[actorId] = space;
    const originalRaw = M.raw(space.text.documents[0]);
    const notices: any[] = [], tools = { open: true }, navigation: any[] = [];
    let changed: boolean | undefined, releases = 0;
    const context = { document: { activeElement: {} }, actorId, space, preparing: { current: false },
      inputLockCount: { current: scenario === 'locked' ? 1 : 0 }, lockInput: () => () => { releases++; },
      setPreparingDocumentAction() {}, moveFlush: { current: null }, flushAllEditors: async () => scenario !== 'flush-failed',
      setMessage() {}, setWritingNotice: (value: unknown) => notices.push(value), writingRequest: { current: null },
      programId: () => 'txt-ux-writing-request', selectedRef: { current: id }, createProgramWritingEntry,
      root: { current: { querySelectorAll: () => [tools] } }, setWritingFocus() {},
      setSelected() {}, setOpened() {}, setFolderId() {}, setPeriod() {}, setLibraryOpen() {},
      props: { navigate: (destination: unknown) => navigation.push(destination) },
      run: async (_label: string, build: any) => {
        if (scenario === 'failed') return { ok: false, reason: 'conflict' };
        const result = build(data); assert(result.ok); changed = result.changed; data = result.data; return result;
      },
    };
    const declaration = find(spaceTree, n => ts.isFunctionDeclaration(n) && n.name?.text === 'beginWriting');
    await evaluate(declaration.getText(spaceTree), context)();
    assert.equal(M.raw(data.spaces[actorId].text.documents.find(doc => doc.id === id)), originalRaw);
    if (['failed', 'flush-failed', 'locked'].includes(scenario)) {
      assert.equal(notices.filter(Boolean).length, 0); assert.equal(navigation.length, 0); assert.equal(tools.open, true);
    } else {
      assert.equal(tools.open, false); assert.equal(navigation.length, 1);
      assert.match(notices.at(-1).text, scenario === 'create' ? /새 글.*열/ : /빈 글|내용이 없는 현재 글/);
      assert.equal(data.spaces[actorId].text.documents.length, scenario === 'create' ? 2 : 1);
      if (scenario === 'reuse-new-position') assert.equal(changed, true, 'a position-only reuse must not be reported as creation');
    }
    assert.equal(releases, scenario === 'locked' ? 0 : 1);
  });
}
