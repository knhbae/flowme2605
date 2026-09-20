import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalWorkspacePocEntryAuthoringBridge as create } from './personal-workspace-poc-entry-authoring-bridge';
const A = Object.freeze({ stateRaw: 'state A', sourceRaw: 'source A', modelJson: '{}', draftRaw: '{"version":1,"rawText":" A\r\n "}', libraryRaw: null });
test('EB01 own typing/helper bytes advance only with exact successful result', () => {
  const bridge = create(A), next = { ...A, draftRaw: 'B' }, ticket = bridge.begin(A)!;
  const before = bridge.scope(A, 'document A');
  assert.equal(bridge.scope(next, 'document A')?.scopeBinding, before?.scopeBinding);
  assert.equal(bridge.finish(ticket, next, { draftRaw: 'B' }), true);
  assert.deepEqual(bridge.inspect(next), next);
  assert.equal(bridge.finish(ticket, next, { draftRaw: 'B' }), false);
});
test('EB02 observed external ABA never rebases same bytes', () => {
  const bridge = create(A), ticket = bridge.begin(A)!;
  bridge.invalidate();
  assert.equal(bridge.inspect(A), undefined);
  assert.equal(bridge.scope(A, 'A'), undefined);
  assert.equal(bridge.finish(ticket, A, {}), false);
});
test('EB03 unobserved draft/binding and nondraft drift latch at current read', () => {
  for (const key of ['stateRaw', 'sourceRaw', 'modelJson', 'draftRaw', 'libraryRaw'] as const) {
    const bridge = create(A);
    assert.equal(bridge.inspect({ ...A, [key]: 'foreign X' }), undefined);
    assert.equal(bridge.inspect(A), undefined);
  }
});
test('EB04 failed reads are not empty or a new baseline; prewrite may retry', () => {
  const bridge = create(A);
  assert.equal(bridge.inspect(undefined), undefined);
  assert.equal(bridge.scope(undefined, 'A'), undefined);
  assert.equal(bridge.isLocked(), false);
  assert.deepEqual(bridge.inspect(A), A);
  const ticket = bridge.begin(A)!;
  assert.equal(bridge.finish(ticket, undefined, { draftRaw: 'B' }), false);
  assert.equal(bridge.isLocked(), true);
});
test('EB05 creator atomic/library-only and handoff adopt only declared exact fields', () => {
  const bridge = create(A);
  let owned: { stateRaw: string | null; sourceRaw: string | null; modelJson: string; draftRaw: string | null; libraryRaw: string | null } = { ...A };
  for (const updates of [{ draftRaw: 'creator B', libraryRaw: 'library B' }, { libraryRaw: 'library C' }, { draftRaw: null, stateRaw: 'state B' }]) {
    const current = bridge.inspect(owned)!;
    const ticket = bridge.begin(current)!;
    const next = { ...current, ...updates };
    assert.equal(bridge.finish(ticket, next, updates), true);
    owned = next;
  }
});
test('EB06 another field or post-write foreign X cannot become own bytes', () => {
  for (const next of [{ ...A, draftRaw: 'X' }, { ...A, draftRaw: 'B', sourceRaw: 'X' }]) {
    const bridge = create(A), ticket = bridge.begin(A)!;
    assert.equal(bridge.finish(ticket, next, { draftRaw: 'B' }), false);
    assert.equal(bridge.isLocked(), true);
  }
});
test('EB07 canceled, cloned, foreign and stale concurrent tickets have no authority', () => {
  const bridge = create(A), other = create(A), ticket = bridge.begin(A)!, second = bridge.begin(A)!;
  assert.equal(other.finish(ticket, A, {}), false);
  assert.equal(bridge.finish({ ...ticket }, A, {}), false);
  assert.equal(bridge.abandon(second), true);
  assert.equal(bridge.finish(second, A, {}), false);
  const concurrent = bridge.begin(A)!;
  assert.equal(bridge.finish(ticket, A, {}), true);
  assert.equal(bridge.finish(concurrent, A, {}), false);
});
test('EB08 malformed/prototype/accessor/unknown fields never execute getters', () => {
  let calls = 0;
  const getter = { ...A, get draftRaw() { calls += 1; return 'X'; } };
  for (const value of [getter, { ...A, extra: null }, Object.create(A), { ...A, modelJson: null }, null]) {
    const bridge = create(value);
    assert.equal(bridge.inspect(A), undefined);
  }
  const bridge = create(A), ticket = bridge.begin(A)!;
  assert.equal(bridge.finish(ticket, A, { get draftRaw() { calls += 1; return A.draftRaw; } }), false);
  assert.equal(calls, 0);
});
