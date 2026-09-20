import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createProgramData } from './program-data';
import { createProgramDocument } from './private-space';
import { programCheckpointForWritingTarget } from './writing-navigation';
import { programMutationFeedbackAfterNavigation, type ProgramMutationFeedback } from './mutation-feedback';
import { programLocation, programCheckpointForNavigation, programNavigationMatchesDocument, emptyProgramCommunityPresentation } from './navigation';

const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramApp.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramApp.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function callback(name: string, context: Record<string, unknown>): (...args: any[]) => any {
  let selected: ts.Expression | undefined;
  const visit = (node: ts.Node) => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name && node.initializer && ts.isCallExpression(node.initializer)) selected = node.initializer.arguments[0]; ts.forEachChild(node, visit); };
  visit(ast); assert(selected, name);
  const code = ts.transpileModule(`const handler = ${selected.getText(ast)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(context), `${code}; return handler;`)(...Object.values(context));
}
function fixture() {
  const seed = createProgramData(), actorId = seed.activeActorId;
  const created = createProgramDocument(seed, { actorId, expectedSpace: seed.spaces[actorId], requestId: 'writing-race', title: '문서', raw: '소개\n- [x] 돌아올 항목\n  - 시간: 15:00' }); assert(created.ok);
  const data = created.data, doc = data.spaces[actorId].text.documents[0], destination = { view: 'space' as const, id: doc.id };
  const historyWrites: unknown[] = [], location = { hash: programLocation({ ...destination, executionKey: JSON.stringify(['text-task', doc.id, doc.lines[1].id]), returnActorId: actorId }) };
  const history = { state: null as any, replaceState(state: unknown, _title: string, url: string) { this.state = state; location.hash = url; historyWrites.push(state); }, pushState(state: unknown, _title: string, url: string) { this.replaceState(state, _title, url); } };
  const pendingNavigation = { current: null as any }, restoringNavigation = { current: false }, positions = { current: new Map() };
  const destinationRef = { current: destination }, current = { current: { envelope: { data } } };
  let feedback: ProgramMutationFeedback = { status: '이전 글 삭제 · 저장됨', failed: false, completion: { actorId, location: '#flowme/community/previous-post', resultId: 'previous-post' } };
  const feedbackWrites: ProgramMutationFeedback[] = [];
  const scopeFeedbackToDestination = callback('scopeFeedbackToDestination', { current, programLocation, programMutationFeedbackAfterNavigation,
    setFeedback: (update: (previous: ProgramMutationFeedback) => ProgramMutationFeedback) => { feedback = update(feedback); feedbackWrites.push(feedback); } });
  class Element { id = ''; }
  const context = { current, pendingNavigation, restoringNavigation, positions, destinationRef, window: { location, history, scrollY: 0 }, document: { activeElement: new Element() }, HTMLElement: Element,
    spaceNavigation: { current: { actorId, capture: () => ({ writing: { [doc.id]: { start: 0, end: 0, scrollTop: 0 } }, space: { selected: doc.id } }) } },
    discoveryStatesRef: { current: {} }, discoveryNavigation: { current: null }, communityStatesRef: { current: {} }, emptyProgramCommunityPresentation, programLocation, programNavigationMatchesDocument,
    allowOutputReturnNavigation: () => true, settings: { current: null }, programCheckpointForNavigation, programCheckpointForWritingTarget,
    scopeFeedbackToDestination, setDestination: (next: any) => { destinationRef.current = next; }, setSeen: () => {} };
  const rememberNavigation = callback('rememberNavigation', context), navigate = callback('navigate', { ...context, rememberNavigation });
  return { ...context, navigate, rememberNavigation, doc, data, actorId, destination, historyWrites, feedbackWrites };
}

test('actual App callbacks protect explicit row checkpoint from queued click/scroll capture before restoration effect', () => {
  const f = fixture(), before = JSON.stringify(f.data);
  f.navigate(f.destination, { writingLineId: f.doc.lines[1].id });
  assert.deepEqual(f.feedbackWrites, [{ status: '', failed: false }]);
  const written = f.window.history.state, count = f.historyWrites.length;
  assert.equal(written.flowmeProgram.focus, `program-text-${f.doc.id}`);
  assert.equal(written.flowmeProgram.writing[f.doc.id].start, f.doc.lines[0].text.length + 1);
  assert(f.pendingNavigation.current); assert.equal(f.restoringNavigation.current, false);
  for (let i = 0; i < 5; i++) f.rememberNavigation();
  assert.equal(f.historyWrites.length, count); assert.equal(f.window.history.state, written); assert.equal(JSON.stringify(f.data), before);
  f.pendingNavigation.current = null; f.rememberNavigation(); assert.equal(f.historyWrites.length, count + 1);
});

test('same-document explicit navigation remains protected and missing target cannot poison pending restoration', () => {
  const f = fixture(); f.window.location.hash = programLocation(f.destination);
  f.navigate(f.destination, { writingLineId: f.doc.lines[1].id }); const pending = f.pendingNavigation.current, before = f.window.history.state;
  f.navigate(f.destination, { writingLineId: 'missing-row' });
  assert.equal(f.feedbackWrites.length, 1, 'rejected navigation cannot clear feedback again');
  assert.equal(f.pendingNavigation.current, pending); assert.equal(f.window.history.state, before);
  f.rememberNavigation(); assert.equal(f.window.history.state, before);
});

test('App restoration reads authoritative pending checkpoint and only its own completion releases it', () => {
  const effect = source.slice(source.indexOf('const pendingAtStart = pendingNavigation.current;'), source.indexOf('const navigate: ProgramNavigate'));
  assert.match(effect, /pendingAtStart\?\.actorId === actorId && pendingAtStart.location === location/);
  assert.match(effect, /pendingAtStart.checkpoint : window.history.state\?\.flowmeProgram/);
  assert.match(effect, /if \(pendingNavigation.current === pendingAtStart\) pendingNavigation.current = null/);
  assert(effect.indexOf('pendingNavigation.current = null') < effect.indexOf('restoringNavigation.current = false; rememberNavigation()'));
});
