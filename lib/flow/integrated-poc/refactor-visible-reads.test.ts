import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createProgramPrivateSpace } from './program-data';
import { programCarryoverGroupScope, planProgramCarryover, programCarryoverItems } from './carryover';

const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function expression(name: string, memo = false) {
  const found: ts.Node[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name && node.initializer) {
      found.push(memo && ts.isCallExpression(node.initializer) ? node.initializer.arguments[0] : node.initializer);
    }
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found.push(node);
    ts.forEachChild(node, visit);
  }; visit(tree); assert.equal(found.length, 1, name); return found[0].getText(tree);
}
function run<T>(text: string, scope: Record<string, unknown>, declaration = false): T {
  const code = ts.transpileModule(declaration ? text : `const value = (${text});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(scope), code + (declaration ? ';return openCarrySheet;' : ';return value;'))(...Object.values(scope)) as T;
}

for (const period of ['documents', 'month', 'today']) for (const selecting of [null, { selected: true }]) test(`same-task scope computes only for its actual visible consumer (${period}, selecting=${!!selecting})`, () => {
  const space = createProgramPrivateSpace(); let calls = 0;
  const read = run<() => ReturnType<typeof programCarryoverGroupScope> | null>(expression('sameGroupScope', true), {
    period, selecting, space, programCarryoverGroupScope: (value: typeof space) => { calls++; return programCarryoverGroupScope(value); },
  });
  const result = read(), needed = period === 'today' && !selecting;
  assert.equal(calls, needed ? 1 : 0); assert.equal(typeof result, needed ? 'function' : 'object');
  assert.deepEqual(space, createProgramPrivateSpace(), 'the display reader never changes source or records');
});

for (const carrySheetShown of [false, true]) test(`closed carry sheet does not plan or count source items (shown=${carrySheetShown})`, () => {
  const space = createProgramPrivateSpace(); let plans = 0, visits = 0;
  const carryItems = new Proxy([] as ReturnType<typeof programCarryoverItems>, { get(target, key, receiver) { visits++; return Reflect.get(target, key, receiver); } });
  const read = run<() => ReturnType<typeof planProgramCarryover> | null>(expression('carrySheetPlan', true), {
    carrySheetShown, carryItems, carrySheetSpace: space, period: 'today', today: '2026-11-14', carryChoices: new Map(),
    planProgramCarryover: (...args: Parameters<typeof planProgramCarryover>) => { plans++; return planProgramCarryover(...args); },
  }); read();
  const counts = run<number[]>(expression('carryCounts'), { carrySheetShown, carryItems, carryChoiceOf: () => 'today' });
  assert.deepEqual(counts, [0, 0, 0]); assert.equal(plans, carrySheetShown ? 1 : 0);
  if (!carrySheetShown) assert.equal(visits, 0, 'even enumeration must stay out of a closed sheet');
});

test('native close event cannot clear an already reopened carry sheet; explicit close keeps its snapshot and choices', () => {
  let callback = '';
  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(tree) === 'dialog'
      && node.attributes.properties.some(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(tree) === 'ref'
        && attribute.initializer?.getText(tree) === '{carrySheet}')) {
      const attr = node.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(tree) === 'onClose') as ts.JsxAttribute;
      assert(attr && ts.isJsxExpression(attr.initializer!) && attr.initializer.expression); callback = attr.initializer.expression.getText(tree);
    } ts.forEachChild(node, visit);
  }; visit(tree); assert(callback);
  const shown: boolean[] = [], onClose = run<(event: { currentTarget: { open: boolean } }) => void>(callback, { setCarrySheetShown: (value: boolean) => shown.push(value) });
  onClose({ currentTarget: { open: true } }); assert.equal(shown.length, 0, 'queued old close event after reopen is stale');
  onClose({ currentTarget: { open: false } }); assert.equal(JSON.stringify(shown), '[false]');
  const dialog = { open: true, close() { this.open = false; } };
  const forbidden = () => { throw Error('close must not clear choices or source'); };
  const close = run<() => void>(expression('closeCarrySheet'), { carrySheet: { current: dialog }, setCarrySheetShown: (value: boolean) => shown.push(value),
    setCarryItems: forbidden, setCarryChoices: forbidden, setCarrySheetSpace: forbidden });
  close(); assert.equal(dialog.open, false); assert.equal(JSON.stringify(shown), '[false,false]');
});

test('reopening the sheet reads latest source before showing it and preserves the passed conflict choices', () => {
  const latest = createProgramPrivateSpace(), previous = createProgramPrivateSpace(), calls: string[] = []; let stored: unknown, choices: unknown;
  const dialog = { open: false, showModal() { this.open = true; calls.push('show'); } };
  const open = run<(keep?: ReadonlyMap<string, string>, from?: typeof latest) => void>(expression('openCarrySheet'), {
    dataRef: { current: { spaces: { owner: latest } } }, actorId: 'owner', space: previous, today: '2026-11-14',
    programCarryoverItems: (value: typeof latest) => { assert.equal(value, latest); calls.push('read'); return [{ kind: 'one', choice: 'today' }, { kind: 'two', choice: 'delete' }]; },
    setCarrySheetSpace: (value: unknown) => { stored = value; calls.push('source'); }, setCarryItems: () => calls.push('items'),
    setCarrySheetNote: () => {}, setCarryChoices: (value: unknown) => { choices = value; calls.push('choices'); }, carrySheet: { current: dialog },
    setCarrySheetShown: (value: boolean) => { assert.equal(value, true); calls.push('visible'); },
  }, true);
  open(new Map([['one', 'undated']])); assert.equal(stored, latest);
  assert.deepEqual(choices, new Map([['one', 'undated'], ['two', 'delete']]));
  assert.deepEqual(calls, ['read', 'source', 'items', 'choices', 'show', 'visible']);
});
