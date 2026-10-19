import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';

type Candidate = { id: string; title: string };
type Fixture = {
  text: { documents: Candidate[]; flows: Candidate[] };
  archivedDocumentIds: string[];
  documentTrash?: Record<string, unknown>;
  retentionDocuments?: Record<string, string>;
};
const programPath = resolve(__dirname, 'ProgramSpace.tsx');
const guardPath = resolve(__dirname, '../../../lib/flow/integrated-poc/reference-execution-guard.ts');
function find(root: ts.Node, predicate: (node: ts.Node) => boolean): ts.Node {
  let found: ts.Node | undefined;
  function visit(node: ts.Node) {
    if (found) return;
    if (predicate(node)) found = node;
    else ts.forEachChild(node, visit);
  }
  visit(root); assert(found, 'production source node must exist'); return found;
}
function evaluate(source: string, context: Record<string, unknown>) {
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React,
  }, reportDiagnostics: true });
  assert.equal(compiled.diagnostics?.length ?? 0, 0);
  return vm.runInNewContext(compiled.outputText, context);
}

// Execute the production label/select, including its options and onChange.
// Isolate the existing pure guard declaration to avoid importing unrelated
// editor/creator modules. Neither predicate nor lifecycle policy is recreated.
const program = ts.createSourceFile(programPath, readFileSync(programPath, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const label = find(program, node => ts.isJsxElement(node) && node.openingElement.tagName.getText(program) === 'label'
  && node.children.some(child => ts.isJsxText(child) && child.text.trim() === '다른 문서에 연결')).getText(program);
const guard = ts.createSourceFile(guardPath, readFileSync(guardPath, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const guardDeclaration = find(guard, node => ts.isFunctionDeclaration(node) && node.name?.text === 'programDocumentContentLock').getText(guard);
const guardExports: { programDocumentContentLock?: (space: Fixture, id: string) => string } = {};
evaluate(guardDeclaration, { exports: guardExports });
const contentLock = guardExports.programDocumentContentLock!;
assert.equal(typeof contentLock, 'function');

function children(node: any): any[] {
  const values = React.Children.toArray(node.props.children);
  return values.flatMap((child: any) => [child, ...(child?.props ? children(child) : [])]);
}
function render(space: Fixture, sourceId = 'source') {
  const commands: unknown[] = [], calls: string[] = [];
  const tree = evaluate(`(${label});`, {
    React, space, detailTask: { id: 'task-original', docId: sourceId }, styles: { field: 'field' },
    programDocumentContentLock: (value: Fixture, id: string) => { calls.push(id); return contentLock(value, id); },
    base: () => ({ actorId: 'synthetic-actor', requestId: 'synthetic-link' }),
    run: async (name: string, build: (current: unknown) => unknown) => { commands.push(name); return build({}); },
    linkProgramTask: (_current: unknown, input: unknown) => { commands.push(input); return { ok: true }; },
  });
  const nodes = children(tree), select = nodes.find(node => node.type === 'select'); assert(select);
  const options = children(select).filter(node => node.type === 'option');
  return { select, options, commands, calls, ids: options.map(option => option.props.value) };
}
function fixture(): Fixture {
  return {
    text: { documents: ['source', 'active', 'archived', 'trash', 'retained'].map(id => ({ id, title: `문서 ${id}` })),
      flows: [{ id: 'active-flow', title: '기존 계획' }] },
    archivedDocumentIds: ['archived'], documentTrash: { trash: { trashedAt: '2026-10-19' } },
    // The retention map value is the document identity; its key is different.
    retentionDocuments: { 'prior-version-owner': 'retained' },
  };
}

test('link options exclude self, archive, trash and retained documents using the existing guard', async () => {
  const space = fixture(), before = JSON.stringify(space), h = render(space);
  assert.deepEqual(h.ids, ['', 'active']);
  assert.equal(h.options[0].props.children, '문서 선택');
  assert.equal(h.options[1].props.children, '문서 active');
  assert.deepEqual(h.calls, ['active', 'archived', 'trash', 'retained']);
  assert.equal(contentLock(space, 'trash'), 'trash');
  assert.equal(contentLock(space, 'retained'), 'retention');
  await h.select.props.onChange({ target: { value: 'active' } });
  assert.deepEqual(JSON.parse(JSON.stringify(h.commands)), ['같은 할 일 연결', {
    actorId: 'synthetic-actor', requestId: 'synthetic-link', documentId: 'active', taskId: 'task-original',
  }]);
  assert.equal(JSON.stringify(space), before, 'candidate rendering must not mutate private state');
});

test('no eligible destination leaves the placeholder and choosing it issues no command', async () => {
  const space = fixture(); space.text.documents = space.text.documents.filter(doc => doc.id !== 'active');
  const h = render(space); assert.deepEqual(h.ids, ['']);
  assert.equal(h.select.props.defaultValue, '');
  await h.select.props.onChange({ target: { value: '' } });
  assert.deepEqual(h.commands, []);
});

test('optional lifecycle maps and a source flow preserve active document order and document-only scope', () => {
  const space: Fixture = { text: {
    documents: [{ id: 'second', title: '두 번째' }, { id: 'first', title: '첫 번째' }],
    flows: [{ id: 'source-flow', title: '원래 계획' }, { id: 'other-flow', title: '다른 계획' }],
  }, archivedDocumentIds: [] };
  const h = render(space, 'source-flow');
  assert.deepEqual(h.ids, ['', 'second', 'first']);
  assert.equal(contentLock(space, 'second'), 'active');
});
