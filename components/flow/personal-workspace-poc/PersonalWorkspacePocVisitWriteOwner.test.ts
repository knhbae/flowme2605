import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { PERSONAL_WORKSPACE_POC_STATE_KEY, toPersonalWorkspacePocQuickItemRef, type PersonalWorkspacePocTransition } from '../../../lib/flow/personal-workspace-poc-contract';
import { applyPersonalWorkspacePocTransition, createPersonalWorkspacePocState, validatePersonalWorkspacePocStateReferences } from '../../../lib/flow/personal-workspace-poc-state';
import { buildPersonalWorkspacePocReadModel } from '../../../lib/flow/personal-workspace-poc-read-model';
import { composePersonalWorkspacePocReadModel } from '../../../lib/flow/personal-workspace-poc-composition';
import { isPersonalWorkspacePocEditorStateRawCurrent } from '../../../lib/flow/personal-workspace-poc-editor-storage-evidence';
import { commitPersonalWorkspacePocStorage } from '../../../lib/flow/personal-workspace-poc-storage-transaction';

// Actual TSX commitTransition closure, not its copied implementation. The state
// transition, read-model composition, reference validator and PoC transaction
// writer are real modules. Only scheduling, React setters and contextual-result
// presentation are deterministic stubs. Ref lifecycle replacement is simulated;
// this is NOT a mounted React, SSR, native Back, Web Lock, or browser test.
const relative = 'components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx';
const file = path.join(process.cwd(), relative), source = process.env.FLOWME_VISIT_WRITE_OWNER_BASELINE === '1'
  ? readPocSourceBaseline('visit-surface') : fs.readFileSync(file, 'utf8');
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const beforeHash = digest(source);
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const callbacks: ts.ArrowFunction[] = [];
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'commitTransition'
    && node.initializer && ts.isCallExpression(node.initializer)
    && ts.isIdentifier(node.initializer.expression) && node.initializer.expression.text === 'useCallback'
    && ts.isArrowFunction(node.initializer.arguments[0])) callbacks.push(node.initializer.arguments[0]);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(callbacks.length, 1, 'Reinspect a changed actual closure instead of substituting a test implementation');
const compiled = ts.transpileModule(`const commitTransition = ${callbacks[0].getText(ast)};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const NOW = '2026-09-06T00:00:00.000Z';
const LATER = '2026-09-06T00:00:01.000Z';
const HREF = 'http://127.0.0.1:3182/my?personalWorkspacePoc=v1#flow=fixture';
const SENTINEL = 'flow:visit-write-owner:sentinel';
const SENTINEL_RAW = '  원본/운영 경계\r\n🌿 ';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

function setup() {
  const initial = applyPersonalWorkspacePocTransition(createPersonalWorkspacePocState(NOW), {
    type: 'create-quick-item', quickItemId: 'visit-owner-item', title: '실제 순수 완료 대상', date: '2026-09-06', now: NOW,
  });
  assert.equal(initial.changed, true);
  const initialRaw = JSON.stringify(initial.state);
  const data = new Map([[PERSONAL_WORKSPACE_POC_STATE_KEY, initialRaw], [SENTINEL, SENTINEL_RAW]]);
  const calls: { method: 'setItem' | 'removeItem'; key: string; before: string | null; after: string | null }[] = [];
  const storage = {
    get length() { return data.size; },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem(key: string, value: string) {
      assert.ok(key.startsWith('flow:poc:personal-workspace:v1:'));
      const before = data.get(key) ?? null; data.set(key, value); calls.push({ method: 'setItem', key, before, after: value });
    },
    removeItem(key: string) {
      assert.ok(key.startsWith('flow:poc:personal-workspace:v1:'));
      const before = data.get(key) ?? null; data.delete(key); calls.push({ method: 'removeItem', key, before, after: null });
    },
  };
  const base = buildPersonalWorkspacePocReadModel(storage, []);
  assert.equal(base.ok, true); if (!base.ok) throw Error(base.reason);
  const owner = { current: {} as object | undefined }, pending = { current: false };
  const stateRef = { current: initial.state };
  const frames: (() => void)[] = [], lockGates: ReturnType<typeof deferred>[] = [];
  const status: { kind: string; message: string }[] = [], publishedStates: unknown[] = [], settledResults: unknown[] = [];
  let writerCalls = 0, afterWriter: (() => void) | undefined;
  const location = { href: HREF };
  const values = {
    workspaceWriteOwner: owner,
    window: { location, localStorage: storage, requestAnimationFrame: (callback: () => void) => { frames.push(callback); return frames.length; } },
    editorOwner: { current: undefined }, planEditor: { active: undefined }, quickEditor: { active: undefined }, pending,
    contextualOwnerRef: { current: { epoch: 0 } }, contextualRecovery: { current: false }, contextualReceiptRef: { current: undefined },
    contextualIntent: { current: () => ({ operation: 'complete' }) },
    beginAttempt: () => ({ ok: true, ticket: { kind: 'transition', epoch: 0 }, state: { epoch: 0 } }),
    settleAttempt: (_owner: unknown, _ticket: unknown, outcome: unknown) => { settledResults.push(outcome); return { state: { epoch: 0 } }; },
    settleUndo: () => { throw Error('This bounded closure test did not request Undo'); },
    setResultOwner: () => undefined,
    resultFacts: (raw: string | null) => ({ raw }),
    interruptResult: () => undefined, discardPlanDisplay: () => undefined,
    setStatus: (value: { kind: string; message: string }) => status.push(value),
    setState: (value: unknown) => publishedStates.push(value), setReceipt: () => undefined,
    stateRef, initialModel: base.model, PERSONAL_WORKSPACE_POC_STATE_KEY,
    isPersonalWorkspacePocEditorStateRawCurrent, applyPersonalWorkspacePocTransition,
    composePersonalWorkspacePocReadModel, validatePersonalWorkspacePocStateReferences,
    createPersonalWorkspacePocEditorEvidenceStorage: () => { throw Error('No evidence-storage argument was requested'); },
    commitPersonalWorkspacePocStorage: (input: Parameters<typeof commitPersonalWorkspacePocStorage>[0]) => {
      writerCalls += 1;
      const result = commitPersonalWorkspacePocStorage(input);
      afterWriter?.();
      return result;
    },
    withFlowUserDataWriteLock: async (callback: () => unknown) => {
      const gate = deferred(); lockGates.push(gate); await gate.promise;
      return { ok: true, value: await callback() };
    },
  };
  const commit = new Function(...Object.keys(values), `${compiled}\nreturn commitTransition;`)(...Object.values(values)) as
    (action: PersonalWorkspacePocTransition) => Promise<'changed' | 'unchanged' | 'failed'>;
  const action: PersonalWorkspacePocTransition = { type: 'complete', itemRef: toPersonalWorkspacePocQuickItemRef('visit-owner-item'), completed: true, now: LATER };
  const flushFrame = async () => {
    assert.equal(frames.length, 1, 'The real closure must reach exactly one rAF');
    frames.shift()!(); await Promise.resolve(); await Promise.resolve();
  };
  const releaseLock = () => {
    assert.equal(lockGates.length, 1, 'The real closure must have queued exactly one lock callback');
    lockGates.shift()!.resolve();
  };
  const assertNoLateEffects = () => {
    assert.equal(writerCalls, 0); assert.deepEqual(calls, []);
    assert.equal(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY), initialRaw);
    assert.equal(storage.getItem(SENTINEL), SENTINEL_RAW);
    assert.equal(stateRef.current, initial.state); assert.deepEqual(publishedStates, []); assert.deepEqual(settledResults, []);
    assert.deepEqual(status.map(value => value.kind), ['saving']);
    assert.equal(pending.current, false);
  };
  return { commit, action, owner, location, pending, stateRef, initial, initialRaw, storage, calls, status, publishedStates, settledResults,
    frames, lockGates, flushFrame, releaseLock, assertNoLateEffects, writerCalls: () => writerCalls,
    setAfterWriter: (callback: () => void) => { afterWriter = callback; } };
}

test('real closure preserves normal completion and never rolls back an already committed ended-owner transaction', async () => {
  const normal = setup(), operation = normal.commit(normal.action);
  await normal.flushFrame(); normal.releaseLock();
  assert.equal(await operation, 'changed'); assert.equal(normal.writerCalls(), 1);
  assert.equal(normal.calls.filter(call => call.key === PERSONAL_WORKSPACE_POC_STATE_KEY && call.method === 'setItem').length, 1);
  assert.equal(normal.calls.length, 5, 'One actual state write plus four actual journal/marker mutations');
  assert.equal(normal.stateRef.current.quickItems[0].status, 'completed');
  assert.equal(normal.publishedStates.length, 1); assert.equal(normal.settledResults.length, 1);
  assert.deepEqual(normal.status.map(value => value.kind), ['saving', 'success']);
  assert.equal(normal.storage.getItem(SENTINEL), SENTINEL_RAW);

  // A deterministic teardown between synchronous commit and promise delivery
  // must suppress presentation, not invent a rollback of the durable success.
  const ended = setup(); ended.setAfterWriter(() => { ended.owner.current = undefined; });
  const endedOperation = ended.commit(ended.action); await ended.flushFrame(); ended.releaseLock();
  assert.equal(await endedOperation, 'unchanged'); assert.equal(ended.writerCalls(), 1);
  assert.equal(ended.calls.length, 5);
  assert.equal(JSON.parse(ended.storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY)!).quickItems[0].status, 'completed');
  assert.equal(ended.stateRef.current, ended.initial.state);
  assert.deepEqual(ended.publishedStates, []); assert.deepEqual(ended.settledResults, []);
  assert.deepEqual(ended.status.map(value => value.kind), ['saving']);
});

test('ending the captured owner before its rAF returns never queues a lock or writer', async () => {
  const fixture = setup(), operation = fixture.commit(fixture.action);
  fixture.owner.current = undefined; await fixture.flushFrame();
  const observedLockCount = fixture.lockGates.length;
  // Drain an unexpected legacy callback before asserting; the baseline must
  // report a bounded RED instead of waiting forever on its deterministic gate.
  if (observedLockCount > 0) fixture.releaseLock();
  assert.equal(await operation, 'unchanged'); assert.equal(observedLockCount, 0);
  fixture.assertNoLateEffects();
});

test('ending the captured owner while the actual closure awaits the lock prevents its writer', async () => {
  const fixture = setup(), operation = fixture.commit(fixture.action);
  await fixture.flushFrame(); fixture.owner.current = undefined; fixture.releaseLock();
  assert.equal(await operation, 'unchanged'); fixture.assertNoLateEffects();
});

test('a replacement owner at the identical href cannot adopt the previous pending callback', async () => {
  const fixture = setup(), capturedOwner = fixture.owner.current, operation = fixture.commit(fixture.action);
  await fixture.flushFrame(); fixture.owner.current = {};
  assert.notEqual(fixture.owner.current, capturedOwner); assert.equal(fixture.location.href, HREF);
  fixture.releaseLock(); assert.equal(await operation, 'unchanged'); fixture.assertNoLateEffects();
});

test('a different href invalidates the pending callback even if its owner ref still exists', async () => {
  const fixture = setup(), operation = fixture.commit(fixture.action);
  await fixture.flushFrame(); fixture.location.href = 'http://127.0.0.1:3182/flows/new?personalWorkspacePoc=v1';
  fixture.releaseLock(); assert.equal(await operation, 'unchanged'); fixture.assertNoLateEffects();
});

test.after(() => {
  assert.equal(digest(fs.readFileSync(file, 'utf8')), beforeHash, 'Source must remain frozen during this closure run');
  console.log(JSON.stringify({ scope: 'actual-TSX-closure/deterministic-scheduler/real-PoC-model-and-writer', source: relative,
    sha256: beforeHash, registrations: 5, fixtureInstances: 6, browserRuns: 0, SSR: false }));
});
import { readPocSourceBaseline } from '../../../tests/fixtures/poc-source-baselines/read';
