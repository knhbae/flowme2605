import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const expressions = new Map<string, string>();
let cancelSource = '', contractSource = '';
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'PROGRAM_MOVE_GESTURE_V1') contractSource = node.initializer!.getText(tree);
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'cancelHold') cancelSource = node.getText(tree);
  if (ts.isJsxAttribute(node) && node.name.getText(tree).startsWith('onPointer') && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
    expressions.set(node.name.getText(tree), node.initializer.expression.getText(tree));
  }
  ts.forEachChild(node, visit);
}
visit(tree);

function harness() {
  let now = 0, sequence = 0, writes = 0, moving: string | null = null;
  const timers = new Map<number, { at: number; run: () => void }>();
  const sandbox = {
    hold: { current: null as number | null }, holdPoint: { current: null as { x: number; y: number } | null },
    suppressPointerClick: { current: null as string | null }, entry: { key: 'same-entry' }, task: { id: 'same-task' },
    setMoving: (value: string | null) => { moving = value; }, run: () => { writes++; },
    setTimeout: (run: () => void, delay: number) => { const id = ++sequence; timers.set(id, { at: now + delay, run }); return id; },
    clearTimeout: (id: number) => { timers.delete(id); },
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(`const PROGRAM_MOVE_GESTURE_V1 = ${contractSource}; ${cancelSource}`, context);
  const handlers = Object.fromEntries([...expressions].map(([name, expression]) => [name, vm.runInContext(`(${expression})`, context)])) as Record<string, (event?: { pointerType: string; clientX: number; clientY: number }) => void>;
  return {
    sandbox, handlers, moving: () => moving, writes: () => writes, pending: () => timers.size,
    advance(ms: number) {
      const target = now + ms;
      for (const [id, timer] of [...timers].sort((a, b) => a[1].at - b[1].at)) {
        if (timer.at <= target && timers.has(id)) { now = timer.at; timers.delete(id); timer.run(); }
      }
      now = target;
    },
  };
}
const point = (x = 0, y = 0, pointerType = 'touch') => ({ pointerType, clientX: x, clientY: y });

test('versioned move gesture restores A06 / V41-004 and V41-005 thresholds', () => {
  const contract = vm.runInNewContext(contractSource);
  assert.equal(contract.version, 1); assert.equal(contract.holdMs, 350); assert.equal(contract.cancelDistancePx, 8);
  assert.equal(Object.isFrozen(contract), true);
  const ledger = readFileSync(new URL('../../../docs/specs/2026-09-12-flowme-integrated-product-poc-program/alpha-transition.md', import.meta.url), 'utf8');
  assert.match(ledger, /A06[^\n]*350ms[^\n]*8px/);
});

test('actual touch handler opens at 350ms, not before, without a storage command', () => {
  const h = harness(); h.handlers.onPointerDown(point());
  h.advance(349); assert.equal(h.moving(), null);
  h.advance(1); assert.equal(h.moving(), 'same-entry');
  assert.equal(h.sandbox.suppressPointerClick.current, 'same-task'); assert.equal(h.writes(), 0);
});

test('movement below 8px retains hold, but exactly 8px cancels and suppresses its synthetic click', () => {
  const retained = harness(); retained.handlers.onPointerDown(point()); retained.handlers.onPointerMove(point(7.99));
  retained.advance(350); assert.equal(retained.moving(), 'same-entry');
  for (const [x, y] of [[8, 0], [0, 8], [-8, 0], [6, 6]]) {
    const h = harness(); h.handlers.onPointerDown(point()); h.handlers.onPointerMove(point(x, y));
    assert.equal(h.pending(), 0); h.advance(500);
    assert.equal(h.moving(), null); assert.equal(h.sandbox.suppressPointerClick.current, 'same-task'); assert.equal(h.writes(), 0);
  }
});

test('pointer release or cancellation stops a pending hold; cancellation also closes move UI', () => {
  for (const event of ['onPointerUp', 'onPointerCancel']) {
    const h = harness(); h.handlers.onPointerDown(point()); h.advance(349); h.handlers[event](); h.advance(500);
    assert.equal(h.pending(), 0); assert.equal(h.moving(), null); assert.equal(h.writes(), 0);
  }
  const h = harness(); h.handlers.onPointerDown(point()); h.advance(350); h.handlers.onPointerCancel();
  assert.equal(h.moving(), null); assert.equal(h.sandbox.suppressPointerClick.current, 'same-task');
});

test('mouse and pen keep existing non-long-press paths', () => {
  for (const type of ['mouse', 'pen']) {
    const h = harness(); h.handlers.onPointerDown(point(0, 0, type)); h.advance(500);
    assert.equal(h.pending(), 0); assert.equal(h.moving(), null); assert.equal(h.writes(), 0);
  }
});
