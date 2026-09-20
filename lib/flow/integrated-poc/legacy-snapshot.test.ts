import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { inspectProgramLegacySnapshotPayload, validateProgramLegacySnapshotPayload, type ProgramLegacySnapshotPayload } from './legacy-snapshot';
import { inspectProgramLegacy } from './legacy-projection';
import { createProgramData, createProgramEnvelope, validateProgramData, validateProgramEnvelope } from './program-data';
import { loadProgramStore } from './program-store';
import { PROGRAM_STATE_KEY, programClone } from './contract';
import { toPersonalWorkspacePocFlowRef, toPersonalWorkspacePocFlowItemRef, toPersonalWorkspacePocMapGroupRef } from '../personal-workspace-poc-contract';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { createPersonalWorkspacePocSourceCandidateStore } from '../personal-workspace-poc-source-candidates';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';

const NOW = '2026-09-12T00:00:00.000Z';
type Mutable<T> = T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;
function fixture(): Mutable<ProgramLegacySnapshotPayload> {
  const savedCopyId = 'snapshot-copy', flowId = 'snapshot-flow', itemId = 'snapshot-item';
  return { model: { version: 1, flows: [{ savedCopyId, flowId, ref: toPersonalWorkspacePocFlowRef(savedCopyId, flowId),
    sourceSlug: 'snapshot-source', origin: 'legacy-saved-plan', title: '원래 계획', items: [{ savedCopyId, flowId, itemId,
      ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, itemId), title: '원래 할 일', sourceOrder: 0 }] }] },
  state: createPersonalWorkspacePocState(NOW) as Mutable<ProgramLegacySnapshotPayload['state']> };
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function corruptedPayloads(): unknown[] {
  const unsupported = fixture(); unsupported.model.flows[0].origin = 'not-supported' as 'legacy-saved-plan';
  const duplicateFlow = fixture(); duplicateFlow.model.flows.push(programClone(duplicateFlow.model.flows[0]));
  const duplicateItem = fixture(); duplicateItem.model.flows[0].items.push(programClone(duplicateItem.model.flows[0].items[0]));
  const badRef = fixture(); badRef.model.flows[0].items[0].ref = 'foreign-ref';
  const badState = fixture(); badState.state.placements['foreign'] = { itemRef: 'foreign', scheduleMode: 'unscheduled', timelinePolicy: 'auto' };
  const badStore = fixture(); badStore.sourceCandidateStore = { ...programClone(createPersonalWorkspacePocSourceCandidateStore(NOW)), version: 91 as 1 } as Mutable<NonNullable<ProgramLegacySnapshotPayload['sourceCandidateStore']>>;
  return [{ model: null, state: null }, { ...fixture(), model: null }, { ...fixture(), state: null }, { ...fixture(), model: [] },
    { ...fixture(), state: {} }, { ...fixture(), unexpected: true }, { ...fixture(), sourceCandidateStore: null }, unsupported, duplicateFlow, duplicateItem, badRef, badState, badStore];
}

test('S01 genuine 2-field and 3-field snapshot formats validate without input mutation', () => {
  for (const payload of [fixture(), { ...fixture(), sourceCandidateStore: createPersonalWorkspacePocSourceCandidateStore(NOW) }]) {
    const before = JSON.stringify(payload), inspected = inspectProgramLegacySnapshotPayload(freeze(payload));
    assert.ok(inspected.ok); assert.equal(validateProgramLegacySnapshotPayload(payload), true);
    assert.equal(inspected.raw, before); assert.equal(JSON.stringify(payload), before);
  }
});

test('S02 null/shape/origin/duplicate identity/foreign ref/source-store corruption all fail structurally', () => {
  for (const payload of corruptedPayloads()) {
    const before = JSON.stringify(payload);
    assert.equal(validateProgramLegacySnapshotPayload(payload), false, before.slice(0, 150));
    assert.equal(inspectProgramLegacySnapshotPayload(payload).ok, false);
    assert.equal(JSON.stringify(payload), before);
  }
});

test('S03 state folder, membership and execution references cannot point outside the original model', () => {
  const foreignFolder = fixture(); foreignFolder.state.memberships = [{ member: 'saved_flow', memberRef: foreignFolder.model.flows[0].ref, folderId: 'missing-folder', orderKey: 0 }];
  const foreignFlow = fixture(); foreignFlow.state.memberships = [{ member: 'saved_flow', memberRef: 'saved-flow:missing:foreign', orderKey: 0 }];
  const foreignCompletion = fixture(); foreignCompletion.state.completions['flow-item:missing:flow:item'] = { status: 'completed', completedAt: NOW };
  for (const payload of [foreignFolder, foreignFlow, foreignCompletion]) assert.equal(validateProgramLegacySnapshotPayload(payload), false);
});

test('S04 malformed Map group is invalid but a complete review-held Map remains a valid snapshot', () => {
  const held = fixture(); held.model.flows[0].origin = 'source-backed-map';
  held.model.flows[0].presentation = { mapGroup: { groupRef: toPersonalWorkspacePocMapGroupRef('map-one'), ownerId: 'map-one', title: '검토 대기',
    childCount: 1, childOrder: 0, executionState: 'review-hold', reviewReasons: ['원문 검토 필요'] } };
  assert.equal(validateProgramLegacySnapshotPayload(held), true);
  const execution = inspectProgramLegacy(held.model, held.state); assert.equal(execution.ok, false);
  if (!execution.ok) assert.deepEqual(execution.issues, [{ code: 'map-review-required', ref: held.model.flows[0].ref }]);
  const incomplete = programClone(held); incomplete.model.flows[0].presentation!.mapGroup!.childCount = 2;
  assert.equal(validateProgramLegacySnapshotPayload(incomplete), false);
  const foreign = programClone(held); foreign.model.flows[0].presentation!.mapGroup!.groupRef = 'flow-group:foreign';
  assert.equal(validateProgramLegacySnapshotPayload(foreign), false);
});

test('S05 valid authoring recurrence is storage-valid while new execution remains explicitly unsupported', () => {
  const payload = fixture();
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: 'snapshot-repeat', documentId: 'repeat-document', revisionId: 'repeat-version',
    rawText: '# 반복\n- [ ] 운동\n  - 날짜: 2026-09-15\n  - 반복: 매일\n  - 반복 종료: 3회\n', committedAt: NOW });
  assert.ok(made.ok);
  payload.state.authoredFlows = [programClone(made.flow) as Mutable<typeof made.flow>];
  payload.state.authoringReceipts = [{ handoffId: made.flow.authoring.handoffId, flowRef: made.flow.ref, committedAt: NOW }];
  assert.equal(validateProgramLegacySnapshotPayload(payload), true);
  const projected = inspectProgramLegacy(payload.model, payload.state); assert.equal(projected.ok, false);
  if (!projected.ok) assert.ok(projected.issues.some(issue => issue.code === 'recurrence-window-required'));
  const data = createProgramData(); data.spaces['local-user'].legacySnapshot = { workspaceId: payload.state.workspaceId, revision: payload.state.revision, raw: JSON.stringify(payload) };
  assert.equal(validateProgramData(data), true, 'valid source snapshot is not rejected merely because execution is unsupported');
});

test('S06 accessors, sparse arrays, cyclic and silently dropped payload values fail without executing input code', () => {
  const accessor = fixture(); let reads = 0;
  Object.defineProperty(accessor.model.flows[0], 'title', { enumerable: true, get() { reads++; return 'bad'; } });
  assert.equal(validateProgramLegacySnapshotPayload(accessor), false); assert.equal(reads, 0);
  const sparse = fixture(); sparse.model.flows = new Array(2); assert.equal(validateProgramLegacySnapshotPayload(sparse), false);
  const cycle: Record<string, unknown> = { ...fixture() }; cycle.cycle = cycle; assert.equal(validateProgramLegacySnapshotPayload(cycle), false);
  assert.equal(validateProgramLegacySnapshotPayload({ ...fixture(), sourceCandidateStore: undefined }), false);
  assert.equal(validateProgramLegacySnapshotPayload({ ...fixture(), [Symbol('hidden')]: 'discarded' }), false);
});

test('S07 shared ProgramData/envelope/store predicates reject damaged nested snapshots instead of normalizing or overwriting them', () => {
  for (const payload of corruptedPayloads()) {
    const data = createProgramData(); data.spaces['local-user'].legacySnapshot = { workspaceId: 'local-device-poc-v1', revision: 0, raw: JSON.stringify(payload) };
    assert.equal(validateProgramData(data), false);
    const envelope = createProgramEnvelope(data), raw = JSON.stringify(envelope); let writes = 0;
    const port = { getItem(key: string) { assert.equal(key, PROGRAM_STATE_KEY); return raw; }, setItem() { writes++; }, removeItem() { writes++; } };
    assert.deepEqual(loadProgramStore(port, validateProgramEnvelope), { kind: 'corrupt', raw }); assert.equal(writes, 0);
  }
});

test('S08 snapshot validation excludes Program cycles; only the exact Map memory-reader edge can reach operating read-model', () => {
  const visited = new Set<string>(), root = path.resolve('lib/flow/integrated-poc/legacy-snapshot.ts');
  const allowedReader = path.resolve('lib/flow/integrated-poc/legacy-map-source.ts'), readModel = path.resolve('lib/flow/personal-workspace-poc-read-model.ts');
  let allowedEdges = 0;
  function walk(file: string) {
    if (visited.has(file)) return; visited.add(file);
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text; if (!specifier.startsWith('.')) continue;
      const stem = path.resolve(path.dirname(file), specifier), target = [stem + '.ts', stem + '.tsx', path.join(stem, 'index.ts')].find(existsSync);
      if (target === readModel) {
        assert.equal(file, allowedReader, 'no other runtime read-model import is allowed');
        const clause = statement.importClause;
        assert.ok(clause && !clause.name && clause.namedBindings && ts.isNamedImports(clause.namedBindings));
        assert.equal(clause.namedBindings.elements.length, 1);
        assert.equal(clause.namedBindings.elements[0].name.text, 'buildPersonalWorkspacePocReadModel');
        assert.equal(clause.namedBindings.elements[0].propertyName, undefined, 'no aliased operating reader');
        allowedEdges++;
      }
      if (target) walk(target);
    }
  }
  walk(root);
  assert.equal(allowedEdges, 1);
  for (const filename of ['program-data.ts', 'legacy-projection.ts', 'controller.ts']) {
    assert.equal([...visited].some(file => path.basename(file) === filename), false, filename);
  }
  const direct = readFileSync(root, 'utf8');
  assert.doesNotMatch(direct, /\b(?:localStorage|sessionStorage|fetch|setItem|removeItem)\s*[.(]/u);
});
