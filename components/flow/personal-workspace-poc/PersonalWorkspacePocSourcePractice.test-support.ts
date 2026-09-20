import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

import ts from 'typescript';
import { materializePersonalWorkspacePocAuthoring } from '../../../lib/flow/personal-workspace-poc-authoring';
import { PERSONAL_WORKSPACE_POC_STATE_KEY, PERSONAL_WORKSPACE_POC_VERSION } from '../../../lib/flow/personal-workspace-poc-contract';
import { applyPersonalWorkspacePocTransition, createPersonalWorkspacePocState, validatePersonalWorkspacePocStateReferences } from '../../../lib/flow/personal-workspace-poc-state';
import { composePersonalWorkspacePocReadModel } from '../../../lib/flow/personal-workspace-poc-composition';
import {
  PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY as KEY,
  applyPersonalWorkspacePocSourceCandidate, createPersonalWorkspacePocLocalFixtureEnvelope,
  createPersonalWorkspacePocSourceCandidateStore, resolvePersonalWorkspacePocSourceCandidateChange,
  stagePersonalWorkspacePocSourceCandidate, undoPersonalWorkspacePocSourceCandidate,
  createPersonalWorkspacePocCurrentSourceFromAuthoredFlow, inspectPersonalWorkspacePocSourceCandidateCatalog,
  isPersonalWorkspacePocSourceCandidateStore, deferPersonalWorkspacePocSourceCandidate,
  clearPersonalWorkspacePocSourceCandidateChangeResolution,
} from '../../../lib/flow/personal-workspace-poc-source-candidates';
import { loadPersonalWorkspacePocSourceCandidateStore, parsePersonalWorkspacePocSourceCandidateStore, savePersonalWorkspacePocSourceCandidateStore } from '../../../lib/flow/personal-workspace-poc-source-candidate-storage';

import { getPersonalWorkspacePocEffectiveSourceFlow } from '../../../lib/flow/personal-workspace-poc-canonical-ownership';
import { isPersonalWorkspacePocMemberInactive } from '../../../lib/flow/personal-workspace-poc-state';
import { isPersonalWorkspacePocEditorStateRawCurrent } from '../../../lib/flow/personal-workspace-poc-editor-storage-evidence';
// Actual TSX function bodies AND mounted-owner/storage observer effects, AST-extracted.
// Actual candidate/composition/reference/writer modules; deterministic isolated
// RAF, memory storage and React setter recorders. NOT React mount/SSR/browser,
// actual navigation or browser Web Lock. Lock recorder delegates the actual supplied operation.
const FILE = 'components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx';
const WRITER = 'lib/flow/personal-workspace-poc-source-candidate-storage.ts';
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const source = fs.readFileSync(FILE, 'utf8'), sourceHash = hash(source), writerHash = hash(fs.readFileSync(WRITER, 'utf8'));
if (process.env.FLOWME_EXPECT_WORKSPACE_SURFACE_SHA) assert.equal(sourceHash, process.env.FLOWME_EXPECT_WORKSPACE_SURFACE_SHA.toLowerCase());
if (process.env.FLOWME_EXPECT_SOURCE_WRITER_SHA) assert.equal(writerHash, process.env.FLOWME_EXPECT_SOURCE_WRITER_SHA.toLowerCase());
const ast = ts.createSourceFile(FILE, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['inspectSourcePractice', 'sourcePracticeAllowed', 'rejectSourcePractice', 'sourcePracticeOwnerCurrent',
  'captureSourcePractice', 'adoptSourcePractice', 'startSourcePractice', 'openSourceUpdateReview', 'deferSourceUpdateReview',
  'resolveSourceUpdateChange', 'runSourcePracticeWrite', 'applySourceUpdate', 'undoSourceUpdate'];
const callbacks = new Map<string, ts.ArrowFunction[]>(), ownerEffects: ts.ArrowFunction[] = [], observers: ts.ArrowFunction[] = [], stateObservers: ts.ArrowFunction[] = [];
const helpers: ts.FunctionDeclaration[] = [];
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && names.includes(node.name.text) && node.initializer) {
    const init = node.initializer;
    const fn = ts.isArrowFunction(init) ? init : ts.isCallExpression(init) && ts.isIdentifier(init.expression)
      && init.expression.text === 'useCallback' && ts.isArrowFunction(init.arguments[0]) ? init.arguments[0] : undefined;
    if (fn) callbacks.set(node.name.text, [...(callbacks.get(node.name.text) ?? []), fn]);
  }
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'useEffect'
    && ts.isArrowFunction(node.arguments[0])) {
    if (node.arguments[0].getText(ast).includes('workspaceWriteOwner.current = owner')) ownerEffects.push(node.arguments[0]);
    if (node.arguments[0].getText(ast).includes("window.addEventListener('storage', observe)")
      && node.arguments[0].getText(ast).includes('sourcePracticeWorkspaceEpoch.current += 1')) observers.push(node.arguments[0]);
    if (node.arguments[0].getText(ast).includes("sourcePracticeObservedState.current = raw")) stateObservers.push(node.arguments[0]);
  }
  if (ts.isFunctionDeclaration(node) && ['mergePersonalWorkspacePocSourcePracticeMemory', 'buildPersonalWorkspacePocSourceUpdateFixtureRaw'].includes(node.name?.text ?? '')) helpers.push(node);
  ts.forEachChild(node, visit);
}
visit(ast); assert.equal(ownerEffects.length, 1); assert.equal(observers.length, 1); assert.equal(stateObservers.length, 1); assert.equal(helpers.length, 2);
for (const name of names) assert.equal(callbacks.get(name)?.length, 1, 'Reinspect actual ' + name + ' rather than copying its implementation');
const compiled = ts.transpileModule([
  ...helpers.map(node => node.getText(ast).replace(/^export\s+/, '')),
  'const mountOwner = ' + ownerEffects[0].getText(ast) + ';',
  'const mountObserver = ' + observers[0].getText(ast) + ';',
  'const observeState = ' + stateObservers[0].getText(ast) + ';',
  ...names.map(name => 'const ' + name + ' = ' + callbacks.get(name)![0].getText(ast) + ';'),
].join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const T0 = '2026-09-04T00:00:00.000Z', T1 = '2026-09-04T00:01:00.000Z';
const T2 = '2026-09-04T00:02:00.000Z', T3 = '2026-09-04T00:03:00.000Z', T4 = '2026-09-04T00:04:00.000Z';
const SENTINEL = 'flow:source-write-owner:sentinel', SENTINEL_RAW = '  테스트 소유 표식\r\n🌿 ';

export function setup(operation: 'apply' | 'undo' = 'apply') {
  const materialized = materializePersonalWorkspacePocAuthoring({ handoffId: 'source-owner-handoff', documentId: 'source-owner-document',
    revisionId: 'source-owner-base', rawText: '# 주말 준비\n- [ ] 장보기', committedAt: T0 });
  assert.equal(materialized.ok, true); if (!materialized.ok) throw Error('invalid actual materialization');
  const envelope = createPersonalWorkspacePocLocalFixtureEnvelope(materialized.flow, {
    incomingRawText: '# 주말 준비\n- [ ] 장보기\n- [ ] 빨래', incomingRevisionId: 'source-owner-incoming', candidateId: 'source-owner-candidate', createdAt: T1,
  });
  assert.equal(envelope.ok, true); if (!envelope.ok) throw Error('invalid actual local comparison fixture');
  let store = stagePersonalWorkspacePocSourceCandidate(createPersonalWorkspacePocSourceCandidateStore(T0), envelope.envelope, envelope.current, T1).store;
  for (const change of envelope.envelope.changes) store = resolvePersonalWorkspacePocSourceCandidateChange(store, {
    candidateId: envelope.envelope.candidateId, changeId: change.changeId, resolution: 'use-incoming', now: T2,
  }).store;
  if (operation === 'undo') {
    const applied = applyPersonalWorkspacePocSourceCandidate(store, { candidateId: envelope.envelope.candidateId, current: envelope.current, now: T3 });
    assert.equal(applied.code, 'applied'); store = applied.store;
  }
  const committed = applyPersonalWorkspacePocTransition(createPersonalWorkspacePocState(T0), {
    type: 'commit-authoring-handoff', flow: materialized.flow, sourceConfirmed: true,
    confirmedSourceFingerprint: materialized.flow.authoring.sourceFingerprint,
    blockingIssues: [], lossFields: [], lossAccepted: false, existingFlowRefs: [], undoAuthoringDraftRawValue: null, now: T0,
  });
  assert.equal(committed.changed, true, JSON.stringify({ error: committed.error, message: committed.message }));
  const state = committed.state;
  const stateBefore = JSON.stringify(state), initialModel = { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [] };
  const currentModel = composePersonalWorkspacePocReadModel(initialModel, state, store);
  assert.equal(currentModel.ok, true); if (!currentModel.ok) throw Error('invalid actual source composition');
  assert.equal(validatePersonalWorkspacePocStateReferences(state, currentModel.model).ok, true);
  const initialRaw = JSON.stringify(store), data = new Map([[KEY, initialRaw], [PERSONAL_WORKSPACE_POC_STATE_KEY, stateBefore], [SENTINEL, SENTINEL_RAW]]);
  const calls: { method: 'setItem' | 'removeItem'; key: string; afterHash: string | null }[] = [];
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { assert.equal(key, KEY); data.set(key, value); calls.push({ method: 'setItem', key, afterHash: hash(value) }); },
    removeItem: (key: string) => { assert.equal(key, KEY); data.delete(key); calls.push({ method: 'removeItem', key, afterHash: null }); },
  };
  const workspaceWriteOwner = { current: undefined as object | undefined }, pending = { current: false };
  const sourceCandidateStoreRef = { current: store }, sourceCandidateRawRef = { current: initialRaw };
  const frames: (() => void)[] = [], publications: { name: string; value: unknown }[] = [];
  let writerCalls = 0, lockCalls = 0;
  const record = (name: string) => (value: unknown) => { publications.push({ name, value }); };
  const listeners = new Map<string, (event: unknown) => void>();
  const values: Record<string, any> = {
    workspaceWriteOwner, pending, sourceCandidateStoreRef, sourceCandidateRawRef, stateRef: { current: state }, initialModel,
    sourceUpdateEnvelope: envelope.envelope,
    sourcePracticeOwner: {current: undefined}, sourcePracticePending: {current: undefined}, sourcePracticeWorkspaceEpoch: {current: 0},
    sourcePracticeRecovery: {current: false}, sourcePracticeFlowRef: {current: materialized.flow.ref},
    sourcePracticeObservedState: {current: stateBefore}, state,
    sourcePracticeBaseStore: {current: store}, sourcePracticeStaleCandidates: {current: new Set<string>()},
    sourcePracticeSelections: {}, planScreenRef: {current: 'flow-detail'}, planSourceEpoch: {current: 0},
    planObservedSource: {current: initialRaw}, editorOwner: {current: undefined}, contextualRecovery: {current: undefined},
    planDisplayRef: {current: undefined}, contextualReceiptRef: {current: undefined},
    PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY: KEY, PERSONAL_WORKSPACE_POC_STATE_KEY,
    window: { localStorage: storage, location: { href: 'http://127.0.0.1:3182/my?personalWorkspacePoc=v1#fixture' },
      addEventListener: (name: string, fn: (event: unknown) => void) => listeners.set(name, fn),
      removeEventListener: (name: string) => listeners.delete(name),
      requestAnimationFrame: (fn: () => void) => { frames.push(fn); return frames.length; } },
    Date: class extends Date { constructor() { super(T4); } },
    setSourceCandidateStore: record('store'), setSourceCandidateRaw: record('raw'),
    setSourceUpdateStatus: record('source-status'), setSourceUpdateError: record('source-error'),
    setSourcePracticeSelections: (fn: (value: unknown) => unknown) => { values.sourcePracticeSelections = fn(values.sourcePracticeSelections); },
    setSourceUpdateSelectedChangeId: record('selected-change'),
    setSourceUpdateLaterChangeIds: record('later-changes'), setSourceUpdateOpen: record('open'), setStatus: record('status'),
    createPersonalWorkspacePocCurrentSourceFromAuthoredFlow, inspectPersonalWorkspacePocSourceCandidateCatalog,
    isPersonalWorkspacePocSourceCandidateStore, deferPersonalWorkspacePocSourceCandidate,
    clearPersonalWorkspacePocSourceCandidateChangeResolution, resolvePersonalWorkspacePocSourceCandidateChange,
    createPersonalWorkspacePocLocalFixtureEnvelope, createPersonalWorkspacePocSourceCandidateStore,
    getPersonalWorkspacePocEffectiveSourceFlow, isPersonalWorkspacePocMemberInactive,
    isPersonalWorkspacePocEditorStateRawCurrent, loadPersonalWorkspacePocSourceCandidateStore,
    stagePersonalWorkspacePocSourceCandidate, applyPersonalWorkspacePocSourceCandidate, undoPersonalWorkspacePocSourceCandidate,
    composePersonalWorkspacePocReadModel, validatePersonalWorkspacePocStateReferences,
    savePersonalWorkspacePocSourceCandidateStore: (input: Parameters<typeof savePersonalWorkspacePocSourceCandidateStore>[0]) => {
      writerCalls += 1; return savePersonalWorkspacePocSourceCandidateStore(input);
    },
    withFlowUserDataWriteLock: async (callback: () => unknown) => { lockCalls += 1; return { ok: true, value: await callback() }; },
  };
  const actual = new Function('env', 'with(env){' + compiled + '\nreturn { mountOwner, mountObserver, '
    + names.join(',') + ',observeState,mergePersonalWorkspacePocSourcePracticeMemory };}')(values) as Record<string, (...args: any[]) => any>;
  const cleanupOwner = actual.mountOwner(); assert.ok(workspaceWriteOwner.current);
  const cleanupObserver = actual.mountObserver();
  actual.openSourceUpdateReview(envelope.envelope.candidateId);
  assert.ok(values.sourcePracticeOwner.current, 'Genuine actual opener issues its current private owner');
  publications.length = 0;
  const cleanup = () => { cleanupOwner(); cleanupObserver(); };
  const start = () => operation === 'apply' ? actual.applySourceUpdate() : actual.undoSourceUpdate(envelope.envelope.candidateId);
  const finish = async (promise: Promise<void>) => { assert.equal(frames.length, 1); frames.shift()!(); await promise; };
  const facts = () => ({ operation, sourceHash, writerHash, writerCalls, lockCalls, productApis: calls,
    initialHash: hash(initialRaw), finalHash: hash(storage.getItem(KEY)!), stateEqual: JSON.stringify(state) === stateBefore,
    sentinelEqual: storage.getItem(SENTINEL) === SENTINEL_RAW, ownerEnded: workspaceWriteOwner.current === undefined,
    publications: publications.map(p => p.name === 'raw' || p.name === 'store' ? { name: p.name, value: 'omitted-test-fixture-payload' } : p) });
  return { start, cleanup, finish, facts, publications, storage, initialRaw, sourceCandidateRawRef, sourceCandidateStoreRef, store, pending,
    actual, values, listeners, data, calls, envelope, materialized, state, frames };
}

export const verifySourcePins = () => {
  assert.equal(hash(fs.readFileSync(FILE, 'utf8')), sourceHash);
  assert.equal(hash(fs.readFileSync(WRITER, 'utf8')), writerHash);
};
