import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { materializePersonalWorkspacePocAuthoring } from './personal-workspace-poc-authoring';
import {
  PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY as KEY,
  applyPersonalWorkspacePocSourceCandidate,
  createPersonalWorkspacePocLocalFixtureEnvelope,
  createPersonalWorkspacePocSourceCandidateStore,
  resolvePersonalWorkspacePocSourceCandidateChange,
  stagePersonalWorkspacePocSourceCandidate,
  undoPersonalWorkspacePocSourceCandidate,
} from './personal-workspace-poc-source-candidates';
import { parsePersonalWorkspacePocSourceCandidateStore, savePersonalWorkspacePocSourceCandidateStore } from './personal-workspace-poc-source-candidate-storage';

// C2 characterization: real materialization, candidate transitions and writer.
// Storage and foreign writes are test-owned Maps. No browser/operating storage.
// Foreign injection is not a native storage event or an atomic-CAS simulation.
const PRODUCT = 'lib/flow/personal-workspace-poc-source-candidate-storage.ts';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const sourceHash = hash(fs.readFileSync(PRODUCT, 'utf8'));
const expectedHash = process.env.FLOWME_EXPECT_SOURCE_WRITER_SHA;
if (expectedHash) assert.equal(sourceHash, expectedHash.toLowerCase());
const T0 = '2026-09-04T00:00:00.000Z', T1 = '2026-09-04T00:01:00.000Z';
const T2 = '2026-09-04T00:02:00.000Z', T3 = '2026-09-04T00:03:00.000Z', T4 = '2026-09-04T00:04:00.000Z';
const SENTINEL = 'flow:source-storage-safety:sentinel';
const SENTINEL_RAW = '  테스트 소유 운영경계 표식\r\n🌿 ';

function fixture(id = 'main') {
  const materialized = materializePersonalWorkspacePocAuthoring({
    handoffId: `safety-handoff-${id}`, documentId: `safety-document-${id}`,
    revisionId: `safety-base-${id}`, rawText: '# 주말 준비\n- [ ] 장보기', committedAt: T0,
  });
  assert.equal(materialized.ok, true); if (!materialized.ok) throw Error('invalid real materialization');
  const envelope = createPersonalWorkspacePocLocalFixtureEnvelope(materialized.flow, {
    incomingRawText: '# 주말 준비\n- [ ] 장보기\n- [ ] 빨래', incomingRevisionId: `safety-incoming-${id}`,
    candidateId: `safety-candidate-${id}`, createdAt: T1,
  });
  assert.equal(envelope.ok, true); if (!envelope.ok) throw Error('invalid actual local comparison fixture');
  let store = stagePersonalWorkspacePocSourceCandidate(createPersonalWorkspacePocSourceCandidateStore(T0), envelope.envelope, envelope.current, T1).store;
  for (const change of envelope.envelope.changes) {
    store = resolvePersonalWorkspacePocSourceCandidateChange(store, {
      candidateId: envelope.envelope.candidateId, changeId: change.changeId, resolution: 'use-incoming', now: T2,
    }).store;
  }
  const applied = applyPersonalWorkspacePocSourceCandidate(store, { candidateId: envelope.envelope.candidateId, current: envelope.current, now: T3 });
  assert.equal(applied.changed, true); assert.equal(applied.code, 'applied');
  const undone = undoPersonalWorkspacePocSourceCandidate(applied.store, T4);
  assert.equal(undone.changed, true); assert.equal(undone.code, 'undone');
  return { resolved: store, applied: applied.store, undone: undone.store };
}

function storageFixture(beforeRaw: string, foreignRaw?: string, fault?: 'mismatch' | 'read-error') {
  const data = new Map([[KEY, beforeRaw], [SENTINEL, SENTINEL_RAW]]);
  const calls: { method: 'setItem' | 'removeItem'; key: string; beforeHash: string | null; afterHash: string | null }[] = [];
  const injections: { kind: string; foreignHash: string }[] = [];
  let armed = false, injected = false;
  const storage = {
    getItem(key: string) {
      if (key === KEY && armed && !injected && foreignRaw && fault) {
        injected = true;
        // Deliberate external write, attributed separately from product APIs.
        data.set(KEY, foreignRaw); injections.push({ kind: fault, foreignHash: hash(foreignRaw) });
        if (fault === 'read-error') throw new Error('test-only: readback failed after foreign X');
      }
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      assert.equal(key, KEY, 'Only the assigned PoC source-candidate key may be written');
      calls.push({ method: 'setItem', key, beforeHash: data.has(key) ? hash(data.get(key)!) : null, afterHash: hash(value) });
      data.set(key, value); armed = true;
    },
    removeItem(key: string) {
      assert.equal(key, KEY);
      calls.push({ method: 'removeItem', key, beforeHash: data.has(key) ? hash(data.get(key)!) : null, afterHash: null });
      data.delete(key);
    },
  };
  return { storage, calls, injections, raw: () => data.get(KEY)!, sentinel: () => data.get(SENTINEL) };
}

test('C2-W00 normal control: actual apply and Undo each save once and reload valid', () => {
  const f = fixture();
  for (const operation of ['apply', 'undo'] as const) {
    const before = operation === 'apply' ? f.resolved : f.applied;
    const after = operation === 'apply' ? f.applied : f.undone;
    const s = storageFixture(JSON.stringify(before));
    const result = savePersonalWorkspacePocSourceCandidateStore({ storage: s.storage, expectedRawValue: JSON.stringify(before), store: after });
    assert.equal(result.ok, true); assert.equal(result.ok && result.kind, 'saved');
    assert.equal(s.raw(), JSON.stringify(after)); assert.equal(parsePersonalWorkspacePocSourceCandidateStore(s.raw()).ok, true);
    assert.equal(s.calls.length, 1); assert.equal(s.sentinel(), SENTINEL_RAW); assert.deepEqual(s.injections, []);
    console.log(JSON.stringify({ id: 'C2-W00', operation, sourceHash, productApis: s.calls, externalInjections: 0, sentinelEqual: true }));
  }
});

for (const operation of ['apply', 'undo'] as const) {
  for (const fault of ['mismatch', 'read-error'] as const) {
    test(`C2-W-${operation}-${fault}: foreign X at failed readback is preserved, never rolled back as owned`, () => {
      const f = fixture(), foreignRaw = JSON.stringify(fixture('foreign-X').applied);
      assert.equal(parsePersonalWorkspacePocSourceCandidateStore(foreignRaw).ok, true, 'X is a real, valid independent candidate store');
      const before = operation === 'apply' ? f.resolved : f.applied;
      const after = operation === 'apply' ? f.applied : f.undone;
      const beforeRaw = JSON.stringify(before), s = storageFixture(beforeRaw, foreignRaw, fault);
      const result = savePersonalWorkspacePocSourceCandidateStore({ storage: s.storage, expectedRawValue: beforeRaw, store: after });
      console.log(JSON.stringify({ id: `C2-W-${operation}-${fault}`, sourceHash, result,
        beforeHash: hash(beforeRaw), candidateHash: hash(JSON.stringify(after)), foreignHash: hash(foreignRaw), finalHash: hash(s.raw()),
        foreignPreserved: s.raw() === foreignRaw, restoredBefore: s.raw() === beforeRaw, productApis: s.calls,
        externalInjections: s.injections, sentinelEqual: s.sentinel() === SENTINEL_RAW }));
      assert.equal(s.injections.length, 1); assert.equal(s.sentinel(), SENTINEL_RAW); assert.equal(result.ok, false);
      assert.equal(s.raw() === foreignRaw, true, 'Do not overwrite foreign X with the earlier before snapshot');
      assert.equal(s.calls.length, 1, 'No owned rollback write after the foreign value is installed');
      assert.equal(!result.ok && result.rollback, 'recovery-required', 'Foreign ownership cannot be reported as verified rollback');
    });
  }
}

// Same actual candidate DTO drives both public writers; no duplicated product
// rollback logic. These 13 bounded fault schedules are loops, not 26 new tests.
const standalone = require('../../docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/model.js') as {
  writeSourceCandidateStore(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
    store: ReturnType<typeof fixture>['applied'], expectedRaw: string | null): string;
};
const faultSchedules = [
  ['noop', 0, undefined, 'candidate'],
  ['stale', 0, 'not-needed', 'foreign'],
  ['initial-read-error', 0, 'not-needed', 'before'],
  ['throw-before', 1, 'not-needed', 'before'],
  ['throw-before-empty', 1, 'not-needed', 'before'],
  ['throw-after', 2, 'complete', 'before'],
  ['throw-after-empty', 2, 'complete', 'before'],
  ['readback-error', 2, 'complete', 'before'],
  ['readback-mismatch', 2, 'complete', 'before'],
  ['afterwrite-unreadable', 1, 'recovery-required', 'candidate'],
  ['rollback-write-error', 2, 'recovery-required', 'candidate'],
  ['rollback-read-error', 2, 'recovery-required', 'before'],
  ['foreign-deleted', 1, 'recovery-required', 'absent'],
] as const;
for (const runtime of ['shared', 'standalone'] as const) {
  test(`C2-W-matrix-${runtime}: 13 actual writer failure/noop/CAS schedules retain exact ownership`, () => {
    const f = fixture(), candidate = JSON.stringify(f.applied), foreign = JSON.stringify(fixture('matrix-X').applied);
    for (const [mode, expectedCalls, expectedRollback, finalKind] of faultSchedules) {
      const before = mode.endsWith('-empty') ? null : JSON.stringify(f.resolved);
      let current = mode === 'noop' ? candidate : mode === 'stale' ? foreign : before;
      let reads = 0;
      const calls: { method: string; key: string; afterHash: string | null; threw?: boolean }[] = [];
      const storage = {
        getItem(key: string): string | null {
          if (key === SENTINEL) return SENTINEL_RAW;
          assert.equal(key, KEY); reads += 1;
          if ((mode === 'initial-read-error' && reads === 1)
            || (mode === 'readback-error' && reads === 2)
            || (mode === 'afterwrite-unreadable' && reads >= 2)
            || (mode === 'rollback-read-error' && reads === 4)) throw Error(`fault:${mode}`);
          if (['readback-mismatch', 'rollback-write-error', 'rollback-read-error'].includes(mode) && reads === 2) return 'test-only transient mismatched read';
          if (mode === 'foreign-deleted' && reads === 2) current = null;
          return current;
        },
        setItem(key: string, value: string) {
          assert.equal(key, KEY); calls.push({ method: 'setItem', key, afterHash: hash(value) });
          if ((mode.startsWith('throw-before') && calls.length === 1) || (mode === 'rollback-write-error' && calls.length === 2)) {
            calls[calls.length - 1].threw = true; throw Error(`fault:${mode}`);
          }
          current = value;
          if (mode.startsWith('throw-after') && calls.length === 1) { calls[0].threw = true; throw Error(`fault:${mode}`); }
        },
        removeItem(key: string) { assert.equal(key, KEY); calls.push({ method: 'removeItem', key, afterHash: null }); current = null; },
      };
      const expectedRawValue = mode === 'noop' ? candidate : before;
      let ok: boolean, rollback: string | undefined, error: string | undefined;
      if (runtime === 'shared') {
        const result = savePersonalWorkspacePocSourceCandidateStore({ storage, expectedRawValue, store: f.applied });
        ok = result.ok; if (!result.ok) { rollback = result.rollback; error = result.error; }
      } else {
        try { standalone.writeSourceCandidateStore(storage, f.applied, expectedRawValue); ok = true; }
        catch (caught) {
          ok = false; const failure = caught as Error & { rollback?: string; rollbackError?: Error };
          rollback = failure.rollback; error = failure.message;
          // The preexisting standalone throw ABI has no rollback marker before
          // its write try block; prove zero API, not fabricate a result field.
          if (mode === 'stale' || mode === 'initial-read-error') rollback = calls.length === 0 ? 'not-needed' : rollback;
          if (expectedRollback === 'recovery-required') assert.ok(failure.rollbackError, mode);
        }
      }
      const expectedFinal = finalKind === 'candidate' ? candidate : finalKind === 'foreign' ? foreign : finalKind === 'absent' ? null : before;
      console.log(JSON.stringify({ id: `C2-W-matrix-${runtime}`, mode, sourceHash, ok, rollback, error,
        beforeHash: before === null ? null : hash(before), finalHash: current === null ? null : hash(current),
        exactFinal: current === expectedFinal, productApis: calls, externalInjections: mode === 'foreign-deleted' ? 1 : 0, sentinelEqual: storage.getItem(SENTINEL) === SENTINEL_RAW }));
      assert.equal(ok, mode === 'noop', mode); assert.equal(rollback, expectedRollback, mode);
      assert.equal(calls.length, expectedCalls, mode); assert.equal(current, expectedFinal, mode);
      assert.equal(storage.getItem(SENTINEL), SENTINEL_RAW, mode);
    }
  });
}

test.after(() => {
  assert.equal(hash(fs.readFileSync(PRODUCT, 'utf8')), sourceHash, 'Product writer changed during characterization');
});
