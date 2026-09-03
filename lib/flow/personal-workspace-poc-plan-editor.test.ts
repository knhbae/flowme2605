import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_STATE_KEY,
  PERSONAL_WORKSPACE_POC_STORAGE_PREFIX,
  PERSONAL_WORKSPACE_POC_VERSION,
  getPersonalWorkspacePocFlowItemFieldOwnership,
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocAuthoredFlow,
  type PersonalWorkspacePocFlow,
  type PersonalWorkspacePocOrigin,
  type PersonalWorkspacePocReadModel,
  type PersonalWorkspacePocState,
} from './personal-workspace-poc-contract';
import {
  analyzePersonalWorkspacePocAuthoringFidelity,
} from './personal-workspace-poc-authoring-fidelity';
import {
  fingerprintPersonalWorkspacePocAuthoringSource,
  materializePersonalWorkspacePocAuthoring,
} from './personal-workspace-poc-authoring';
import {
  createFlowEditorSession,
  executeFlowEditorCommit,
  reduceFlowEditorSession,
  type FlowEditorCommitEffect,
  type FlowEditorReturnPoint,
  type FlowEditorSession,
} from './flow-editor-transaction';
import {
  applyPersonalWorkspacePocPlanItemDraft,
  canonicalPersonalWorkspacePocPlanEditorBytes,
  createPersonalWorkspacePocPlanEditorHandlers,
  fingerprintPersonalWorkspacePocPlanEditorBytes,
  normalizePersonalWorkspacePocPlanOverlay,
  openPersonalWorkspacePocPlanEditor,
  openPersonalWorkspacePocPlanItemEditor,
  preflightPersonalWorkspacePocPlanCommit,
  validatePersonalWorkspacePocPlanDraft,
  validatePersonalWorkspacePocPlanItemDraft,
  type PersonalWorkspacePocPlanDraft,
  type PersonalWorkspacePocPlanItemDraft,
} from './personal-workspace-poc-plan-editor';
import {
  applyPersonalWorkspacePocTransition,
  createPersonalWorkspacePocState,
  isPersonalWorkspacePocState,
} from './personal-workspace-poc-state';

const T0 = '2026-09-02T00:00:00.000Z';
const T1 = '2026-09-02T01:00:00.000Z';

class RecordingStorage {
  private readonly values = new Map<string, string>();

  readonly setCalls: Array<{ key: string; value: string }> = [];
  readonly removeCalls: string[] = [];
  clearCalls = 0;

  constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial)) this.values.set(key, value);
  }

  get length(): number {
    return this.values.size;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.setCalls.push({ key, value });
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.removeCalls.push(key);
    this.values.delete(key);
  }

  clear(): void {
    this.clearCalls += 1;
    this.values.clear();
  }
}

type Fixture = Readonly<{
  flow: PersonalWorkspacePocFlow;
  model: PersonalWorkspacePocReadModel;
  state: PersonalWorkspacePocState;
  raw: string;
  firstRef: string;
  secondRef: string;
}>;

function makeFlow(
  origin: PersonalWorkspacePocOrigin,
  suffix: string = origin,
): PersonalWorkspacePocFlow {
  const savedCopyId = `copy-${suffix}`;
  const flowId = `flow-${suffix}`;
  const flowRef = toPersonalWorkspacePocFlowRef(savedCopyId, flowId);
  const firstRef = toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, 'first');
  const secondRef = toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, 'second');
  const sectionId = `section-${suffix}`;
  const ownsSectionTitle = origin === 'personal-draft';
  return {
    ref: flowRef,
    savedCopyId,
    flowId,
    sourceSlug: `source-${suffix}`,
    title: `원본 Flow ${suffix}`,
    origin,
    anchorDate: '2026-09-01',
    sections: [{
      sectionId,
      title: '준비',
      sourceOrder: 0,
      titleOwner: ownsSectionTitle ? 'existing-personal' : 'source',
      editCapability: ownsSectionTitle ? 'poc-shadow' : 'read-only',
    }],
    items: [
      {
        ref: firstRef,
        savedCopyId,
        flowId,
        itemId: 'first',
        title: '첫 할 일',
        description: '원본 메모',
        sectionId,
        sectionTitle: '준비',
        sourceOrder: 0,
        sourceDate: '2026-09-03',
      },
      {
        ref: secondRef,
        savedCopyId,
        flowId,
        itemId: 'second',
        title: '둘째 할 일',
        sourceOrder: 1,
      },
    ],
  };
}

function authoredFlow(options: Readonly<{ blocked?: boolean }> = {}): PersonalWorkspacePocAuthoredFlow {
  const rawText = options.blocked
    ? '# 내가 쓴 Flow\n- [ ] 첫 할 일\n  - [ ] 하위 확인\n    - [ ] 지원 범위 밖 중첩 할 일\n- [ ] 둘째 할 일'
    : '# 내가 쓴 Flow\n## 준비\n- [ ] 첫 할 일\n- [ ] 둘째 할 일';
  if (!options.blocked) {
    const materialized = materializePersonalWorkspacePocAuthoring({
      handoffId: 'handoff-clean',
      documentId: 'document-1',
      revisionId: 'revision-1',
      rawText,
      committedAt: T0,
    });
    assert.equal(materialized.ok, true);
    if (!materialized.ok) throw new Error('clean authoring fixture must materialize');
    return materialized.flow;
  }

  const base = makeFlow('authoring-handoff', 'authored-blocked');
  const sourceFingerprint = fingerprintPersonalWorkspacePocAuthoringSource(rawText);
  const fidelityManifest = analyzePersonalWorkspacePocAuthoringFidelity({
    rawText,
    sourceFingerprint,
  }).manifest;
  return {
    ...base,
    origin: 'authoring-handoff',
    authoring: {
      source: 'text-authoring-poc-v1',
      handoffId: `handoff-${options.blocked ? 'blocked' : 'clean'}`,
      documentId: 'document-1',
      revisionId: 'revision-1',
      parseResultId: 'parse-1',
      sourceSnapshotId: 'snapshot-1',
      rawText,
      sourceFingerprint,
      fidelityManifest,
      committedAt: T0,
    },
  };
}

function fixture(
  origin: PersonalWorkspacePocOrigin = 'legacy-saved-plan',
  options: Readonly<{ placement?: boolean; blockedAuthoring?: boolean }> = {},
): Fixture {
  const flow = origin === 'authoring-handoff'
    ? authoredFlow({ blocked: options.blockedAuthoring })
    : makeFlow(origin);
  const firstRef = flow.items[0].ref;
  const secondRef = flow.items[1].ref;
  const state = createPersonalWorkspacePocState(T0);
  const model: PersonalWorkspacePocReadModel = {
    version: PERSONAL_WORKSPACE_POC_VERSION,
    flows: origin === 'authoring-handoff' && !options.blockedAuthoring ? [] : [flow],
  };
  if (origin === 'authoring-handoff' && !options.blockedAuthoring) {
    state.authoredFlows = [flow as PersonalWorkspacePocAuthoredFlow];
    state.authoringReceipts = [{
      handoffId: (flow as PersonalWorkspacePocAuthoredFlow).authoring.handoffId,
      flowRef: flow.ref,
      committedAt: (flow as PersonalWorkspacePocAuthoredFlow).authoring.committedAt,
    }];
  }
  if (options.placement ?? true) {
    state.placements[firstRef] = {
      itemRef: firstRef,
      scheduleMode: 'fixed_date',
      date: '2026-09-20',
      time: '09:00',
      timelinePolicy: 'excluded',
    };
  }
  return { flow, model, state, raw: JSON.stringify(state), firstRef, secondRef };
}

function openReady(value: Fixture) {
  const opened = openPersonalWorkspacePocPlanEditor({
    baseModel: value.model,
    state: value.state,
    stateRaw: value.raw,
    flowRef: value.flow.ref,
  });
  if (!opened.ok) throw new Error(opened.failure.code);
  assert.equal(opened.ok, true);
  return opened;
}

const RETURN_POINT: FlowEditorReturnPoint = {
  location: { route: '/my', query: '?personalWorkspacePoc=v1' },
  scroll: [],
  focus: { targetKey: 'personal-plan-open' },
};

function onlyCommitEffect(
  effects: readonly unknown[],
): FlowEditorCommitEffect<PersonalWorkspacePocPlanDraft, PersonalWorkspacePocPlanItemDraft> {
  assert.equal(effects.length, 1);
  const effect = effects[0] as FlowEditorCommitEffect<
    PersonalWorkspacePocPlanDraft,
    PersonalWorkspacePocPlanItemDraft
  >;
  assert.equal(effect.type, 'commit');
  return effect;
}

test('five saved-plan origins open with exact guards and no source or execution fields in drafts', () => {
  const origins: PersonalWorkspacePocOrigin[] = [
    'source-backed-map',
    'personal-draft',
    'canonical-personal-copy',
    'legacy-saved-plan',
    'authoring-handoff',
  ];
  for (const origin of origins) {
    const value = fixture(origin);
    const opened = openReady(value);
    assert.equal(opened.draft.origin, origin);
    assert.equal(opened.guard.openedStateRaw, value.raw);
    assert.equal(opened.guard.openedStateRevision, 0);
    assert.equal(opened.guard.canonicalSourceBytes, canonicalPersonalWorkspacePocPlanEditorBytes(value.flow));
    assert.equal(
      opened.guard.canonicalSourceFingerprint,
      fingerprintPersonalWorkspacePocPlanEditorBytes(opened.guard.canonicalSourceBytes),
    );
    assert.equal(Object.hasOwn(opened.draft, 'source'), false);
    assert.equal(Object.hasOwn(opened.draft, 'placements'), false);
    assert.equal(Object.hasOwn(opened.draft.items[value.firstRef], 'sourceTitle'), false);
    assert.equal(Object.hasOwn(opened.draft.items[value.firstRef], 'executionPlacement'), false);
    const expectedEditable = origin === 'personal-draft' || origin === 'authoring-handoff';
    assert.equal(Object.keys(opened.draft.sectionTitles ?? {}).length, expectedEditable ? 1 : 0);
    assert.equal(
      opened.guard.sectionIdentities.filter((section) => section.editCapability === 'poc-shadow').length,
      expectedEditable ? 1 : 0,
    );
  }
});

test('two staged Item applies write nothing; one final Plan apply writes one state revision and Undo', async () => {
  const value = fixture();
  const opened = openReady(value);
  const storage = new RecordingStorage({ [PERSONAL_WORKSPACE_POC_STATE_KEY]: value.raw });
  const handlers = createPersonalWorkspacePocPlanEditorHandlers({
    storage,
    guard: opened.guard,
    readCurrentState: () => value.state,
    readCurrentBaseModel: () => value.model,
    now: () => T1,
  });
  let session: FlowEditorSession<PersonalWorkspacePocPlanDraft, PersonalWorkspacePocPlanItemDraft> =
    createFlowEditorSession({
      id: 'plan-editor-1',
      context: 'saved-overlay',
      draft: opened.draft,
      returnPoint: RETURN_POINT,
    });

  const applyItem = async (
    itemRef: string,
    edit: (draft: PersonalWorkspacePocPlanItemDraft) => PersonalWorkspacePocPlanItemDraft,
    requestId: string,
  ) => {
    const itemOpen = openPersonalWorkspacePocPlanItemEditor({
      parentDraft: session.plan?.draft as PersonalWorkspacePocPlanDraft,
      itemRef,
    });
    assert.equal(itemOpen.ok, true);
    if (!itemOpen.ok) return;
    session = reduceFlowEditorSession(session, {
      type: 'open-item',
      input: {
        id: `item-editor-${requestId}`,
        draft: itemOpen.draft,
        returnPoint: RETURN_POINT,
      },
    }).state;
    const edited = edit(itemOpen.draft);
    session = reduceFlowEditorSession(session, {
      type: 'replace-item-draft',
      draft: edited,
      validation: validatePersonalWorkspacePocPlanItemDraft(edited),
    }).state;
    const requested = reduceFlowEditorSession(session, { type: 'request-commit', requestId });
    const event = await executeFlowEditorCommit(onlyCommitEffect(requested.effects), handlers);
    session = reduceFlowEditorSession(requested.state, event).state;
    session = reduceFlowEditorSession(session, { type: 'settle-success' }).state;
  };

  await applyItem(value.firstRef, (draft) => ({
    ...draft,
    memo: { mode: 'override', value: '' },
    schedule: { mode: 'unscheduled' },
  }), 'item-one');
  await applyItem(value.secondRef, (draft) => ({
    ...draft,
    title: { mode: 'override', value: '둘째 할 일 수정' },
    schedule: { mode: 'fixed_date', date: '2026-09-12' },
  }), 'item-two');
  assert.equal(storage.setCalls.length, 0);
  assert.equal(storage.removeCalls.length, 0);
  assert.equal(session.plan?.status, 'dirty-valid');

  const requested = reduceFlowEditorSession(session, {
    type: 'request-commit',
    requestId: 'plan-one',
  });
  const event = await executeFlowEditorCommit(onlyCommitEffect(requested.effects), handlers);
  assert.equal(event.type, 'commit-succeeded');
  const storedRaw = storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY);
  assert.notEqual(storedRaw, null);
  const stored = JSON.parse(storedRaw as string) as PersonalWorkspacePocState;
  assert.equal(isPersonalWorkspacePocState(stored), true);
  assert.equal(stored.revision, 1);
  assert.equal(stored.undo?.snapshot.revision, 0);
  assert.equal(stored.personalPlanOverlays?.[value.flow.ref].items[value.firstRef].memo, '');
  assert.deepEqual(
    stored.personalPlanOverlays?.[value.flow.ref].items[value.firstRef].schedule,
    { mode: 'unscheduled' },
  );
  assert.equal(
    stored.personalPlanOverlays?.[value.flow.ref].items[value.secondRef].title,
    '둘째 할 일 수정',
  );
  assert.equal(
    storage.setCalls.filter((call) => call.key === PERSONAL_WORKSPACE_POC_STATE_KEY).length,
    1,
  );
  assert.deepEqual(stored.placements, value.state.placements);
  assert.equal(storage.clearCalls, 0);
  assert.equal(
    [...storage.setCalls.map((call) => call.key), ...storage.removeCalls]
      .every((key) => key.startsWith(PERSONAL_WORKSPACE_POC_STORAGE_PREFIX)),
    true,
  );
});

test('memo empty string and all three Plan schedules normalize without touching execution placement', () => {
  const value = fixture();
  const opened = openReady(value);
  const sourcePlacement = canonicalPersonalWorkspacePocPlanEditorBytes(value.state.placements);

  const schedules: PersonalWorkspacePocPlanItemDraft['schedule'][] = [
    { mode: 'inherit' },
    { mode: 'fixed_date', date: '2026-10-01' },
    { mode: 'unscheduled' },
  ];
  for (const schedule of schedules) {
    const draft: PersonalWorkspacePocPlanDraft = {
      ...structuredClone(opened.draft),
      items: {
        ...structuredClone(opened.draft.items),
        [value.firstRef]: {
          ...opened.draft.items[value.firstRef],
          memo: { mode: 'override', value: '' },
          schedule,
        },
      },
    };
    const overlay = normalizePersonalWorkspacePocPlanOverlay({
      draft,
      guard: opened.guard,
      sourceFlow: value.flow,
    });
    assert.equal(overlay.items[value.firstRef].memo, '');
    assert.deepEqual(
      overlay.items[value.firstRef].schedule,
      schedule.mode === 'inherit' ? undefined : schedule,
    );
    const result = preflightPersonalWorkspacePocPlanCommit({
      draft,
      guard: opened.guard,
      currentBaseModel: value.model,
      currentState: value.state,
      currentStateRaw: value.raw,
      now: T1,
    });
    assert.equal(result.ok, true, result.ok ? undefined : result.failure.code);
    assert.equal(
      result.ok && canonicalPersonalWorkspacePocPlanEditorBytes(result.state.placements),
      sourcePlacement,
    );
  }
});

test('personal-draft and authoring-handoff section titles commit, reload, and Undo as one shadow change', () => {
  for (const origin of ['personal-draft', 'authoring-handoff'] as const) {
    const value = fixture(origin, { placement: false });
    const opened = openReady(value);
    const sectionId = Object.keys(opened.draft.sectionTitles ?? {})[0];
    assert.ok(sectionId);
    const rawSource = origin === 'authoring-handoff'
      ? (value.flow as PersonalWorkspacePocAuthoredFlow).authoring.rawText
      : undefined;
    const draft: PersonalWorkspacePocPlanDraft = {
      ...structuredClone(opened.draft),
      sectionTitles: {
        ...structuredClone(opened.draft.sectionTitles ?? {}),
        [sectionId]: { mode: 'override', value: '내 실행 구간' },
      },
    };
    const result = preflightPersonalWorkspacePocPlanCommit({
      draft,
      guard: opened.guard,
      currentBaseModel: value.model,
      currentState: value.state,
      currentStateRaw: value.raw,
      now: T1,
    });
    assert.equal(result.ok, true, result.ok ? undefined : result.failure.code);
    if (!result.ok) continue;
    assert.equal(result.kind, 'change');
    assert.deepEqual(result.overlay.sectionTitles, { [sectionId]: '내 실행 구간' });
    assert.equal(result.state.revision, 1);
    assert.deepEqual(result.state.undo?.snapshot.personalPlanOverlays, {});
    if (origin === 'authoring-handoff') {
      const storedFlow = result.state.authoredFlows?.[0];
      assert.equal(storedFlow?.authoring.rawText, rawSource);
    }

    const reloaded = structuredClone(JSON.parse(JSON.stringify(result.state))) as PersonalWorkspacePocState;
    assert.equal(isPersonalWorkspacePocState(reloaded), true);
    const reopened = openPersonalWorkspacePocPlanEditor({
      baseModel: value.model,
      state: reloaded,
      stateRaw: JSON.stringify(reloaded),
      flowRef: value.flow.ref,
    });
    assert.equal(reopened.ok, true, reopened.ok ? undefined : reopened.failure.code);
    if (reopened.ok) {
      assert.deepEqual(reopened.draft.sectionTitles?.[sectionId], {
        mode: 'override',
        value: '내 실행 구간',
      });
    }

    const undone = applyPersonalWorkspacePocTransition(result.state, { type: 'undo', now: T1 });
    assert.equal(undone.changed, true);
    assert.deepEqual(undone.state.personalPlanOverlays, {});
  }
});

test('section title commit writes one state revision inside the existing v1 prefix', async () => {
  const value = fixture('personal-draft', { placement: false });
  const opened = openReady(value);
  const sectionId = Object.keys(opened.draft.sectionTitles ?? {})[0];
  const draft: PersonalWorkspacePocPlanDraft = {
    ...opened.draft,
    sectionTitles: { [sectionId]: { mode: 'override', value: '저장한 구간' } },
  };
  const storage = new RecordingStorage({ [PERSONAL_WORKSPACE_POC_STATE_KEY]: value.raw });
  const handlers = createPersonalWorkspacePocPlanEditorHandlers({
    storage,
    guard: opened.guard,
    readCurrentState: () => value.state,
    readCurrentBaseModel: () => value.model,
    now: () => T1,
  });
  const prepared = await handlers.preparePersonalOverlay({
    transactionId: 'section-title-commit',
    requestId: 'section-title-request',
    revision: 1,
    draft,
  });
  await prepared.commit();

  assert.equal(
    storage.setCalls.filter((call) => call.key === PERSONAL_WORKSPACE_POC_STATE_KEY).length,
    1,
  );
  assert.equal(storage.clearCalls, 0);
  assert.equal(
    [...storage.setCalls.map((call) => call.key), ...storage.removeCalls]
      .every((key) => key.startsWith(PERSONAL_WORKSPACE_POC_STORAGE_PREFIX)),
    true,
  );
  const stored = JSON.parse(storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY) ?? 'null') as PersonalWorkspacePocState;
  assert.equal(stored.version, PERSONAL_WORKSPACE_POC_VERSION);
  assert.deepEqual(stored.personalPlanOverlays?.[value.flow.ref].sectionTitles, {
    [sectionId]: '저장한 구간',
  });
});

test('blank, foreign, duplicate, read-only, and stale section title edits fail closed', () => {
  const personal = fixture('personal-draft', { placement: false });
  const opened = openReady(personal);
  const sectionId = Object.keys(opened.draft.sectionTitles ?? {})[0];
  const commit = (draft: PersonalWorkspacePocPlanDraft, model = personal.model) => (
    preflightPersonalWorkspacePocPlanCommit({
      draft,
      guard: opened.guard,
      currentBaseModel: model,
      currentState: personal.state,
      currentStateRaw: personal.raw,
      now: T1,
    })
  );

  const blank = commit({
    ...opened.draft,
    sectionTitles: { [sectionId]: { mode: 'override', value: '' } },
  });
  assert.equal(blank.ok, false);
  assert.equal(!blank.ok && blank.failure.firstErrorFocus, '[data-personal-plan-section-title]');

  const foreign = commit({
    ...opened.draft,
    sectionTitles: {
      ...(opened.draft.sectionTitles ?? {}),
      foreign: { mode: 'override', value: '다른 구간' },
    },
  });
  assert.equal(foreign.ok, false);
  assert.equal(!foreign.ok && foreign.failure.code, 'foreign-section-title-draft');

  const duplicateFlow: PersonalWorkspacePocFlow = {
    ...personal.flow,
    sections: [
      ...(personal.flow.sections ?? []),
      { ...(personal.flow.sections ?? [])[0], sourceOrder: 1 },
    ],
  };
  const duplicate = openPersonalWorkspacePocPlanEditor({
    baseModel: { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [duplicateFlow] },
    state: personal.state,
    stateRaw: personal.raw,
    flowRef: personal.flow.ref,
  });
  assert.equal(duplicate.ok, false);
  assert.equal(!duplicate.ok && duplicate.failure.code, 'invalid-section-catalog');

  const sourceOwned = fixture('legacy-saved-plan', { placement: false });
  const sourceOpened = openReady(sourceOwned);
  const readOnly = preflightPersonalWorkspacePocPlanCommit({
    draft: {
      ...sourceOpened.draft,
      sectionTitles: {
        [(sourceOwned.flow.sections ?? [])[0].sectionId]: {
          mode: 'override',
          value: '바꾸면 안 됨',
        },
      },
    },
    guard: sourceOpened.guard,
    currentBaseModel: sourceOwned.model,
    currentState: sourceOwned.state,
    currentStateRaw: sourceOwned.raw,
    now: T1,
  });
  assert.equal(readOnly.ok, false);
  assert.equal(!readOnly.ok && readOnly.failure.code, 'read-only-section-title');

  const changedSectionFlow: PersonalWorkspacePocFlow = {
    ...personal.flow,
    sections: (personal.flow.sections ?? []).map((section) => ({
      ...section,
      title: '원본에서 바뀐 구간',
    })),
    items: personal.flow.items.map((item) => (
      item.sectionId
        ? { ...item, sectionTitle: '원본에서 바뀐 구간' }
        : item
    )),
  };
  const stale = commit(opened.draft, {
    version: PERSONAL_WORKSPACE_POC_VERSION,
    flows: [changedSectionFlow],
  });
  assert.equal(stale.ok, false);
  assert.equal(!stale.ok && stale.failure.code, 'stale-source-bytes');
});

test('clean and same-value drafts are semantic no-ops with zero storage mutation', async () => {
  const value = fixture();
  const opened = openReady(value);
  const clean = preflightPersonalWorkspacePocPlanCommit({
    draft: opened.draft,
    guard: opened.guard,
    currentBaseModel: value.model,
    currentState: value.state,
    currentStateRaw: value.raw,
    now: T1,
  });
  assert.equal(clean.ok && clean.kind, 'no-op');

  const sameValue: PersonalWorkspacePocPlanDraft = {
    ...opened.draft,
    title: { mode: 'override', value: value.flow.title },
  };
  const storage = new RecordingStorage({ [PERSONAL_WORKSPACE_POC_STATE_KEY]: value.raw });
  const handlers = createPersonalWorkspacePocPlanEditorHandlers({
    storage,
    guard: opened.guard,
    readCurrentState: () => value.state,
    readCurrentBaseModel: () => value.model,
    now: () => T1,
  });
  const operation = await handlers.preparePersonalOverlay({
    transactionId: 'same-plan',
    requestId: 'same-request',
    revision: 1,
    draft: sameValue,
  });
  await operation.commit();
  assert.equal(storage.setCalls.length, 0);
  assert.equal(storage.removeCalls.length, 0);
  assert.equal(storage.clearCalls, 0);
});

test('stale revision, exact raw bytes, in-memory state, and canonical source all fail closed', () => {
  const value = fixture();
  const opened = openReady(value);
  const edit: PersonalWorkspacePocPlanDraft = {
    ...opened.draft,
    title: { mode: 'override', value: '수정 제목' },
  };
  const check = (options: Partial<{
    state: PersonalWorkspacePocState;
    raw: string;
    model: PersonalWorkspacePocReadModel;
  }>) => preflightPersonalWorkspacePocPlanCommit({
    draft: edit,
    guard: opened.guard,
    currentBaseModel: options.model ?? value.model,
    currentState: options.state ?? value.state,
    currentStateRaw: options.raw ?? value.raw,
    now: T1,
  });

  const staleRevision = check({ state: { ...value.state, revision: 1 } });
  assert.equal(staleRevision.ok, false);
  assert.equal(!staleRevision.ok && staleRevision.failure.code, 'stale-state-revision');

  const staleRaw = check({ raw: `${value.raw} ` });
  assert.equal(staleRaw.ok, false);
  assert.equal(!staleRaw.ok && staleRaw.failure.code, 'stale-state-raw');

  const staleMemory = check({ state: { ...value.state, updatedAt: T1 } });
  assert.equal(staleMemory.ok, false);
  assert.equal(!staleMemory.ok && staleMemory.failure.code, 'current-state-raw-mismatch');

  const changedFlow = { ...value.flow, title: '원본 변경' };
  const staleSource = check({
    model: { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [changedFlow] },
  });
  assert.equal(staleSource.ok, false);
  assert.equal(!staleSource.ok && staleSource.failure.code, 'stale-source-bytes');
});

test('duplicate, foreign, missing, and changed identities are rejected', () => {
  const value = fixture('legacy-saved-plan', { placement: false });
  const duplicate = openPersonalWorkspacePocPlanEditor({
    baseModel: { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [value.flow, value.flow] },
    state: value.state,
    stateRaw: value.raw,
    flowRef: value.flow.ref,
  });
  assert.equal(duplicate.ok, false);
  assert.equal(!duplicate.ok && duplicate.failure.code, 'duplicate-flow-identity');

  const opened = openReady(value);
  const foreignDraft: PersonalWorkspacePocPlanDraft = {
    ...structuredClone(opened.draft),
    items: {
      ...structuredClone(opened.draft.items),
      [value.firstRef]: {
        ...opened.draft.items[value.firstRef],
        identity: { ...opened.draft.items[value.firstRef].identity, itemId: 'foreign' },
      },
    },
  };
  const foreign = preflightPersonalWorkspacePocPlanCommit({
    draft: foreignDraft,
    guard: opened.guard,
    currentBaseModel: value.model,
    currentState: value.state,
    currentStateRaw: value.raw,
    now: T1,
  });
  assert.equal(foreign.ok, false);
  assert.equal(!foreign.ok && foreign.failure.code, 'invalid-item-draft-identity');

  const missing = preflightPersonalWorkspacePocPlanCommit({
    draft: opened.draft,
    guard: opened.guard,
    currentBaseModel: { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [] },
    currentState: value.state,
    currentStateRaw: value.raw,
    now: T1,
  });
  assert.equal(missing.ok, false);
  assert.equal(!missing.ok && missing.failure.code, 'missing-flow');

  const changedItem = {
    ...value.flow.items[0],
    itemId: 'replacement',
    ref: toPersonalWorkspacePocFlowItemRef(value.flow.savedCopyId, value.flow.flowId, 'replacement'),
  };
  const changed = preflightPersonalWorkspacePocPlanCommit({
    draft: opened.draft,
    guard: opened.guard,
    currentBaseModel: {
      version: PERSONAL_WORKSPACE_POC_VERSION,
      flows: [{ ...value.flow, items: [changedItem, value.flow.items[1]] }],
    },
    currentState: value.state,
    currentStateRaw: value.raw,
    now: T1,
  });
  assert.equal(changed.ok, false);
  assert.equal(!changed.ok && changed.failure.code, 'changed-item-identities');
});

test('authoring fidelity blockers and missing fidelity manifests fail closed', () => {
  const blocked = fixture('authoring-handoff', { blockedAuthoring: true });
  const result = openPersonalWorkspacePocPlanEditor({
    baseModel: blocked.model,
    state: blocked.state,
    stateRaw: blocked.raw,
    flowRef: blocked.flow.ref,
  });
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.failure.code, 'authoring-fidelity-blocked');

  const missingFlow = authoredFlow();
  const missingManifest: PersonalWorkspacePocAuthoredFlow = {
    ...missingFlow,
    authoring: { ...missingFlow.authoring, fidelityManifest: undefined },
  };
  const state = createPersonalWorkspacePocState(T0);
  const missing = openPersonalWorkspacePocPlanEditor({
    baseModel: { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [missingManifest] },
    state,
    stateRaw: JSON.stringify(state),
    flowRef: missingManifest.ref,
  });
  assert.equal(missing.ok, false);
  assert.equal(!missing.ok && missing.failure.code, 'authoring-fidelity-missing');
});

test('unsupported source schedules, invalid dates, and blank or untrimmed titles are blocked', () => {
  const value = fixture();
  const ownership = getPersonalWorkspacePocFlowItemFieldOwnership(
    value.flow.items[0],
    value.flow.origin,
    value.flow,
  );
  const unsupportedFlow: PersonalWorkspacePocFlow = {
    ...value.flow,
    items: [{
      ...value.flow.items[0],
      fieldOwnership: {
        ...ownership,
        dateDerivation: {
          ...ownership.dateDerivation,
          sourceSchedule: {
            mode: 'unsupported',
            sourceMode: 'recurrence',
            owner: 'source',
            provenance: 'flow-bundle',
          },
          strategy: 'unsupported-source-schedule',
        },
      },
    }, value.flow.items[1]],
  };
  const unsupported = openPersonalWorkspacePocPlanEditor({
    baseModel: { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [unsupportedFlow] },
    state: value.state,
    stateRaw: value.raw,
    flowRef: unsupportedFlow.ref,
  });
  assert.equal(unsupported.ok, false);
  assert.equal(!unsupported.ok && unsupported.failure.code, 'unsupported-plan-schedule');

  const opened = openReady(value);
  const invalidDate: PersonalWorkspacePocPlanDraft = {
    ...structuredClone(opened.draft),
    items: {
      ...structuredClone(opened.draft.items),
      [value.firstRef]: {
        ...opened.draft.items[value.firstRef],
        schedule: { mode: 'fixed_date', date: '2026-02-30' },
      },
    },
  };
  assert.deepEqual(validatePersonalWorkspacePocPlanDraft(invalidDate), {
    valid: false,
    firstErrorFocus: '[data-personal-plan-item-date]',
  });

  const blankTitle: PersonalWorkspacePocPlanDraft = {
    ...opened.draft,
    title: { mode: 'override', value: '' },
  };
  assert.deepEqual(validatePersonalWorkspacePocPlanDraft(blankTitle), {
    valid: false,
    firstErrorFocus: '[data-personal-plan-title]',
  });
  const untrimmedItem = {
    ...opened.draft.items[value.firstRef],
    title: { mode: 'override' as const, value: ' 제목 ' },
  };
  assert.deepEqual(validatePersonalWorkspacePocPlanItemDraft(untrimmedItem), {
    valid: false,
    firstErrorFocus: '[data-personal-plan-item-title]',
  });
});

test('pure Item apply changes only the parent draft and preserves input bytes', () => {
  const value = fixture();
  const opened = openReady(value);
  const item = openPersonalWorkspacePocPlanItemEditor({
    parentDraft: opened.draft,
    itemRef: value.firstRef,
  });
  assert.equal(item.ok, true);
  if (!item.ok) return;
  const parentBefore = canonicalPersonalWorkspacePocPlanEditorBytes(opened.draft);
  const edited = { ...item.draft, memo: { mode: 'override' as const, value: '' } };
  const applied = applyPersonalWorkspacePocPlanItemDraft({
    parentDraft: opened.draft,
    itemDraft: edited,
    trustedGuardId: opened.guard.guardId,
  });
  assert.deepEqual(applied.validation, { valid: true });
  assert.deepEqual(applied.draft.items[value.firstRef].memo, { mode: 'override', value: '' });
  assert.equal(canonicalPersonalWorkspacePocPlanEditorBytes(opened.draft), parentBefore);
});

test('public editor roles are forbidden and do not call any writer', async () => {
  const value = fixture();
  const opened = openReady(value);
  const storage = new RecordingStorage({ [PERSONAL_WORKSPACE_POC_STATE_KEY]: value.raw });
  const handlers = createPersonalWorkspacePocPlanEditorHandlers({
    storage,
    guard: opened.guard,
    readCurrentState: () => value.state,
    readCurrentBaseModel: () => value.model,
    now: () => T1,
  });
  assert.throws(
    () => handlers.preparePublicDraft({
      transactionId: 'public-plan',
      requestId: 'public-request',
      revision: 1,
      draft: opened.draft,
    }),
    (error: unknown) => (error as { code?: string }).code === 'public-editor-role-forbidden',
  );
  assert.throws(
    () => handlers.applyItemToParentPublicDraft({
      parentDraft: opened.draft,
      itemDraft: opened.draft.items[value.firstRef],
    }),
    (error: unknown) => (error as { code?: string }).code === 'public-editor-role-forbidden',
  );
  assert.equal(storage.setCalls.length, 0);
  assert.equal(storage.removeCalls.length, 0);
  assert.equal(storage.clearCalls, 0);
});

test('canonical bytes and fingerprints are deterministic across object key order', () => {
  const left = { z: 1, nested: { b: '둘', a: '하나' }, list: [{ y: 2, x: 1 }] };
  const right = { list: [{ x: 1, y: 2 }], nested: { a: '하나', b: '둘' }, z: 1 };
  const leftBytes = canonicalPersonalWorkspacePocPlanEditorBytes(left);
  const rightBytes = canonicalPersonalWorkspacePocPlanEditorBytes(right);
  assert.equal(leftBytes, rightBytes);
  assert.equal(
    fingerprintPersonalWorkspacePocPlanEditorBytes(leftBytes),
    fingerprintPersonalWorkspacePocPlanEditorBytes(rightBytes),
  );
});
