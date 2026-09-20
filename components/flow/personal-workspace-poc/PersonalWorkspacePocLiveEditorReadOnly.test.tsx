import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

import { PersonalWorkspacePocLiveEditor, type PersonalWorkspacePocLiveEditorHandle,
  type PersonalWorkspacePocLiveEditorProps } from './PersonalWorkspacePocLiveEditor';

const componentUrl = new URL('./PersonalWorkspacePocLiveEditor.tsx', import.meta.url);
const componentSource = readFileSync(componentUrl, 'utf8');
const surfaceSource = readFileSync(new URL('./PersonalWorkspacePocAuthoringSurface.tsx', import.meta.url), 'utf8');
const raw = '# A\n- [ ] 원문 그대로';
const props = { editorId: 'read-only-editor', documentId: 'same-document', initialValue: raw };

// Execute the actual imperative component closure with deterministic hook/DOM
// adapters. This is a unit fixture, not React mounting, native Undo, or a browser.
function imperativeFixture() {
  let commands = 0;
  class Element { focus() {} }
  const ownerDocument = {
    activeElement: null as Element | null,
    defaultView: { setTimeout: (callback: () => void) => { queueMicrotask(callback); return 1; }, clearTimeout() {} },
    execCommand: () => { commands += 1; return false; },
  };
  class Textarea extends Element {
    value = raw; readOnly = false; disabled = false;
    selectionStart = 0; selectionEnd = 0;
    selectionDirection: 'forward' | 'backward' | 'none' = 'none';
    scrollTop = 19; scrollLeft = 3; ownerDocument = ownerDocument;
    focus() { ownerDocument.activeElement = this; }
    setSelectionRange(start: number, end: number, direction: 'forward' | 'backward' | 'none') {
      this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction;
    }
  }
  const textarea = new Textarea();
  const refs: Array<{ current: unknown }> = [];
  let refIndex = 0;
  const handle = { current: null as PersonalWorkspacePocLiveEditorHandle | null };
  const hookReact = { ...React,
    forwardRef: (render: unknown) => render,
    useRef: (value: unknown) => {
      const index = refIndex++;
      return refs[index] ?? (refs[index] = { current: index === 1 ? textarea : value });
    },
    useState: (value: unknown) => [typeof value === 'function' ? value() : value, () => {}],
    useCallback: (value: unknown) => value,
    useMemo: (factory: () => unknown) => factory(),
    useLayoutEffect: () => {},
    useImperativeHandle: (target: typeof handle, factory: () => PersonalWorkspacePocLiveEditorHandle) => { target.current = factory(); },
  };
  const loaded = { exports: {} as { PersonalWorkspacePocLiveEditor: (input: PersonalWorkspacePocLiveEditorProps, target: typeof handle) => React.ReactNode } };
  const require = createRequire(componentUrl);
  const compiled = ts.transpileModule(componentSource, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } });
  vm.runInNewContext(compiled.outputText, {
    module: loaded, exports: loaded.exports,
    require: (id: string) => id === 'react' ? hookReact : require(id),
    HTMLElement: Element, HTMLTextAreaElement: Textarea,
  });
  function findTextarea(node: React.ReactNode): React.ReactElement<Record<string, unknown>> | undefined {
    if (!React.isValidElement<Record<string, unknown>>(node)) return undefined;
    if (node.type === 'textarea') return node;
    for (const child of React.Children.toArray(node.props.children as React.ReactNode)) {
      const found = findTextarea(child); if (found) return found;
    }
    return undefined;
  }
  const render = (readOnly?: boolean) => {
    refIndex = 0;
    const node = loaded.exports.PersonalWorkspacePocLiveEditor({ ...props, readOnly }, handle);
    const control = findTextarea(node);
    assert.ok(control, 'actual component renders its native textarea');
    textarea.readOnly = Boolean(control.props.readOnly);
    textarea.disabled = Boolean(control.props.disabled);
    assert.ok(handle.current);
    return handle.current;
  };
  return { textarea, render, commands: () => commands };
}

test('C1RO01 omitted and false preserve identical writable SSR output', () => {
  const omitted = renderToStaticMarkup(<PersonalWorkspacePocLiveEditor {...props} />);
  const explicit = renderToStaticMarkup(<PersonalWorkspacePocLiveEditor {...props} readOnly={false} />);
  assert.equal(explicit, omitted);
  assert.doesNotMatch(omitted, /\breadOnly=|\bdisabled=/u);
  assert.equal(omitted.match(/<textarea\b/gu)?.length, 1);
});

test('C1RO02 read-only keeps the accessible source and does not disable focus or copying', () => {
  const markup = renderToStaticMarkup(<PersonalWorkspacePocLiveEditor {...props} readOnly />);
  const textarea = markup.match(/<textarea\b[^>]*>[\s\S]*?<\/textarea>/u)?.[0] ?? '';
  assert.match(textarea, /readOnly=""/u);
  assert.doesNotMatch(textarea, /\bdisabled=|tabindex="-1"/u);
  assert.match(textarea, /aria-labelledby=/u);
  assert.ok(textarea.includes(raw));
  assert.equal(markup.replace(' readOnly=""', '').replace(' readonly=""', ''),
    renderToStaticMarkup(<PersonalWorkspacePocLiveEditor {...props} />));
});

test('C1RO03 a stale writable handle checks current DOM readOnly before any native command', async () => {
  const fixture = imperativeFixture();
  const oldHandle = fixture.render(false);
  const expected = oldHandle.readSnapshot(); assert.ok(expected);
  fixture.render(true);
  const result = await oldHandle.applyNativeReplacement({ expected, replacement: 'X' });
  assert.equal(result.ok, false);
  assert.equal(fixture.commands(), 0);
  assert.equal(fixture.textarea.value, raw);
  assert.deepEqual(oldHandle.readSnapshot(), expected);
});

test('C1RO04 read-only still permits focusRange with exact selection, direction and scroll', () => {
  const fixture = imperativeFixture();
  const handle = fixture.render(true);
  assert.equal(handle.focusRange(2, 8, 'backward'), true);
  assert.equal(fixture.textarea.ownerDocument.activeElement, fixture.textarea);
  assert.deepEqual([fixture.textarea.selectionStart, fixture.textarea.selectionEnd, fixture.textarea.selectionDirection], [2, 8, 'backward']);
  assert.deepEqual([fixture.textarea.scrollTop, fixture.textarea.scrollLeft], [19, 3]);
  assert.equal(fixture.textarea.value, raw);
  assert.equal(fixture.commands(), 0);
});

test('C1RO05 default writable path still reaches the native command and preserves rejected input', async () => {
  const fixture = imperativeFixture();
  const handle = fixture.render();
  const expected = handle.readSnapshot(); assert.ok(expected);
  const result = await handle.applyNativeReplacement({ expected, replacement: 'X' });
  assert.equal(fixture.commands(), 1);
  assert.equal(result.ok, false);
  assert.equal(fixture.textarea.value, raw);
  assert.deepEqual(handle.readSnapshot(), expected);
});

test('C1RO06 search preserves helper ownership, suppresses floating handlers, and restores the previous status only when owned', () => {
  const entry = surfaceSource.slice(surfaceSource.indexOf('<button type="button" data-testid="personal-workspace-authoring-find-existing"'), surfaceSource.indexOf('}}>기존 Flow 찾기</button>'));
  assert.match(entry, /if \(!lastDraftPersistenceOk\.current\)/u);
  assert.doesNotMatch(entry, /\|\| propertyEditor|\|\| overlay|\|\| templatePickerOpen|\|\| validationExamplesOpen/u);
  assert.match(entry, /entryReturnStatus\.current = status/u);
  assert.match(surfaceSource, /if \(!authoringStarted\) return;\s*if \(!overlay && !templatePickerOpen && !propertyEditor\) return/u);
  assert.match(surfaceSource, /target instanceof Element && target\.closest\('\[data-testid="personal-workspace-authoring-find-existing"\]'\)/u);
  assert.match(surfaceSource, /data-testid="personal-workspace-authoring-owned-overlays" hidden=\{!authoringStarted\} inert=\{!authoringStarted\}/u);
  assert.match(surfaceSource, /if \(!currentOwnedEntry\(\)\) entryWriteFailure\(\);\s*else if \(entryReturnStatus\.current\) setStatus\(entryReturnStatus\.current\)/u);
  assert.match(surfaceSource, /const authoringSourceReadOnly = entryAuthoringBridge\.isLocked\(\) \|\| sourceHelperRecoveryRequired\.current/u);
  assert.match(surfaceSource, /disabled=\{pending\.current && !authoringSourceReadOnly\}\s*readOnly=\{authoringSourceReadOnly\}/u);
  assert.doesNotMatch(componentSource, /textarea\.value\s*=|value=\{mirrorValue\}/u);
});
