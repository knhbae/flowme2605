import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { createProgramData } from './program-data';
import { connectPersonalFlow, createPersonalFlow, setPersonalRepeat } from './personal-authoring-commands';
import { documentHasPersonalAuthoring } from './personal-authoring';
import { textWorkspaceModel as M } from './text-workspace';
import type { ProgramData, ProgramTransition } from './contract';

// Run the actual expressions from the components; they do not render React or a browser.
function component(file: string) {
  const source = readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8');
  return { source, tree: ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX) };
}
function find<T extends ts.Node>(tree: ts.SourceFile, match: (node: ts.Node) => node is T): T[] {
  const found: T[] = [];
  const visit = (node: ts.Node) => { if (match(node)) found.push(node); ts.forEachChild(node, visit); };
  visit(tree);
  return found;
}
const js = (code: string) => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function editorSettings(file: string, scope: Record<string, unknown>) {
  const { tree } = component(file);
  const settings: Record<string, () => boolean> = {};
  for (const property of find(tree, ts.isPropertyAssignment)) {
    const name = property.name.getText(tree);
    const call = ts.findAncestor(property, ts.isCallExpression);
    if (!['lineBreakEnter', 'typingPickers', 'plusOpensAuthoring', 'listEnterV2', 'explicitAddOnly'].includes(name) || call?.expression.getText(tree) !== 'nativeEditor.create') continue;
    settings[name] = new Function(...Object.keys(scope), `return ${js(`(${property.initializer.getText(tree)})`)}`)(...Object.values(scope));
  }
  return settings;
}

test('the body editor keeps list Enter; the flag turns typed pickers off, the writing ＋ on, and list Enter v2 on', () => {
  const read = (authoringMode: boolean) => {
    const settings = editorSettings('ProgramTextEditor.tsx', { propsRef: { current: { authoringMode } } });
    assert.deepEqual(Object.keys(settings).sort(), ['lineBreakEnter', 'listEnterV2', 'plusOpensAuthoring', 'typingPickers']);
    return [settings.lineBreakEnter(), settings.typingPickers(), settings.plusOpensAuthoring(), settings.listEnterV2()];
  };
  assert.deepEqual(read(true), [false, false, true, true]);
  assert.deepEqual(read(false), [false, true, false, false]);
});

test('the folder region editor passes the same Enter, picker, and list Enter v2 settings', () => {
  for (const listEnterV2 of [false, true]) {
    const settings = editorSettings('ProgramFolderRegionEditor.tsx', { latest: { current: { listEnterV2 } } });
    assert.deepEqual([settings.lineBreakEnter(), settings.typingPickers(), settings.listEnterV2()], [false, false, listEnterV2]);
  }
  const { tree } = component('ProgramTextEditor.tsx');
  const region = find(tree, ts.isJsxAttribute).filter(attribute => attribute.name.getText(tree) === 'listEnterV2');
  assert.deepEqual(region.map(attribute => attribute.initializer?.getText(tree)), ['{!!props.authoringMode}']);
});

test('with the writing tools on, an untitled task cannot be checked; titled tasks and the flag off are unchanged', () => {
  const { tree } = component('ProgramTextEditor.tsx');
  const declaration = (name: string) => find(tree, ts.isVariableDeclaration).filter(node => node.name.getText(tree) === name)[0]?.initializer;
  const pattern = declaration('EMPTY_TITLE_TASK'), check = declaration('checkActionsDisabled');
  assert(pattern && check);
  const lines = ['- [ ] ', '- [ ] 장보기', '  - [x]   ', '- [50%] '];
  const run = (authoringMode: boolean) => {
    const disabled = new Function('EMPTY_TITLE_TASK', 'draftRef', 'checkPendingRef', 'inputLockedRef', 'propsRef', 'composingRef', 'regionPendingRef', 'currentDoc',
      `return ${js(`(${check.getText(tree)})`)}`)(new Function(`return ${pattern.getText(tree)}`)(),
      { current: { getState: () => ({ invalid: false, saving: false, raw: '' }) } }, { current: null }, { current: false },
      { current: { readOnly: false, authoringMode } }, { current: false }, { current: false }, () => ({ lines: lines.map(text => ({ text })) }));
    return lines.map((_, index) => disabled(index));
  };
  assert.deepEqual(run(true), [true, false, true, true]);
  assert.deepEqual(run(false), [false, false, false, false]);
});

test('writing tools follow the workspace flag, never a per-document or per-browser choice', () => {
  const { source, tree } = component('ProgramSpace.tsx');
  assert(!source.includes('native-writing-ui'), 'no per-browser selection key');
  const modes = find(tree, ts.isJsxAttribute).filter(attribute => attribute.name.getText(tree) === 'authoringMode');
  assert.equal(modes.length, 1);
  assert.equal(modes[0].initializer?.getText(tree), '{!!props.nativeAuthoringEnabled}');
  const editor = component('ProgramTextEditor.tsx').source;
  assert(/props\.authoringMode&&props\.onOpenPersonalAuthoring&&<button type="button" onClick=\{\(\)=>\{closePanel\(\);props\.onOpenPersonalAuthoring\?\.\(\);\}\}>반복·Flow 만들기<\/button>/.test(editor));
});

function accept(result: ProgramTransition<string>) { assert(result.ok); return result; }
function fixture() {
  const initial = createProgramData();
  initial.spaces[initial.activeActorId].text = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }],
    documents: [{ id: 'doc', title: '합성', folder: '합성', folderId: 'f', lines: [{ id: 'p', text: '- [ ] 원래 할 일' }] },
      { id: 'other', title: '다른 문서', folder: '합성', folderId: 'f', lines: [{ id: 'q', text: '- [ ] 다른 할 일' }] }],
    flows: [], bindings: [], taskScopes: { p: 'f', q: 'f' }, itemScopes: { p: 'f', q: 'f' }, progressRecords: [] };
  const created = accept(createPersonalFlow(initial, { documentId: 'doc', title: '새 반복', taskIds: ['p'] }));
  return { data: created.data, flowId: created.result };
}
function shows(data: ProgramData, documentId: string, requests: string[] = []) {
  const { tree } = component('ProgramSpace.tsx');
  const [declaration] = find(tree, ts.isFunctionDeclaration).filter(node => node.name?.text === 'showsPersonalAuthoring');
  assert(declaration);
  const run = new Function('authoringRequests', 'space', 'M', 'documentHasPersonalAuthoring', `${js(declaration.getText(tree))}; return showsPersonalAuthoring;`)(
    requests, data.spaces[data.activeActorId], M, documentHasPersonalAuthoring);
  return run(documentId) as boolean;
}

test('the Flow·repeat box shows only where the document has a Flow, a repeat, or linked tasks, or after the ＋ menu asks', () => {
  const { data, flowId } = fixture();
  assert.equal(shows(data, 'doc'), false);
  assert.equal(shows(data, 'doc', ['doc']), true);
  assert.equal(shows(data, flowId), true);

  const repeated = accept(setPersonalRepeat(data, { taskId: 'p', rule: { kind: 'daily', startDate: '2026-10-30', end: { kind: 'count', count: 2 } } })).data;
  assert.equal(shows(repeated, 'doc'), true);

  const linked = accept(connectPersonalFlow(data, { flowId, documentId: 'other' })).data;
  assert.equal(shows(linked, 'other'), true);
  // Another document's Flow rule does not reach a plain document.
  const flowRule = accept(setPersonalRepeat(data, { flowId, rule: { kind: 'daily', startDate: '2026-10-30', end: { kind: 'count', count: 2 } } })).data;
  assert.equal(shows(flowRule, 'doc'), false);
});

test('a document owns personal authoring when it is a Flow, a Flow start, or has a live repeat', () => {
  const { data, flowId } = fixture(), owner = () => data.spaces[data.activeActorId].personalAuthoring;
  assert.equal(documentHasPersonalAuthoring(owner(), flowId, []), true);
  assert.equal(documentHasPersonalAuthoring(owner(), 'doc', ['p']), false);
  assert.equal(documentHasPersonalAuthoring(undefined, 'doc', ['p']), false);
  assert.equal(documentHasPersonalAuthoring({ version: 1, flows: [], series: [], executions: [{ id: 'e', flowId, versionId: 'v', anchorDate: '2026-10-30', executionDocumentId: 'start-doc', taskIds: {} }] }, 'start-doc', []), true);
});

test('the writing bar keeps its contract: order, never dimmed by composition or saves, focus kept, presses held', () => {
  const { source } = component('ProgramTextEditor.tsx');
  const between = (from: string, to: string) => { const start = source.indexOf(from), stop = source.indexOf(to, start); assert(start > 0 && stop > start, from); return source.slice(start, stop); };
  const buttons = between('function barButtons(', '\n  }');
  const order = ["barButton('task'", "barButton('outdent'", "barButton('indent'", "barButton('enter'", "barButton('menu'"].map(token => buttons.indexOf(token));
  assert(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), 'bar order ☐ ← → ↵ ＋');
  assert(source.includes('const barOff = inputLocked || !!props.readOnly;'));
  const button = between('function barButton(', '\n  }');
  assert(button.includes('disabled={barOff || off}') && button.includes('onPointerDown={event => { event.preventDefault(); }}'));
  assert(source.includes('const busy = composingRef.current || !!draftRef.current?.getState().saving && !indentsNow(action);')
    && source.includes('barHold.press(action, busy, area ? writingBarTarget(area, area.value, area.selectionStart, settled) : null)'));
  assert(between('function runBar(', '\n  }').includes('target.instance.enter(true)'));
  assert(/const writingBar = <div ref=\{barRef\} className=\{styles\.writingBar\} role="toolbar" aria-label="쓰기 도구" data-editor-tools>/.test(source));
  // Under the body, or right after the folder region being edited.
  assert(source.includes('{props.authoringMode && !folderView && writingBar}') && source.includes('afterActive={props.authoringMode ? writingBar : undefined}'));
  assert(source.includes("{props.authoringMode && barButtons('toolbar')}"));
  const css = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.module.css', import.meta.url), 'utf8');
  assert(css.includes('.writingBar { display: none; }'));
  assert(css.includes('.editor:has(.host textarea:focus, [data-folder-region] textarea:focus, .writingBar :focus) .writingBar {'));
  assert(css.includes('.toolbar > .toolbarBarButton { display: none; }'));
});
