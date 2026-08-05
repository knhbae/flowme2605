import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDraftToken,
  createIdempotencyKey,
  createPersonalCopyKey,
  createSourceKey,
  type PublicSaveChoice,
  type SaveIntent,
} from './public-save-lifecycle';
import { buildPublicFlowSaveStorageKeyPlan } from './public-flow-save-transaction';
import {
  PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_HISTORY_KEY,
  createPublicFlowSaveRecoveryJournal,
  matchesPublicFlowSaveRecoveryCommitMarker,
  mergePublicFlowSaveRecoveryJournal,
  normalizePublicFlowSaveRecoveryJournal,
  normalizePublicFlowSaveSessionDraft,
  readPublicFlowSaveRecoveryJournal,
  reconstructPublicSaveRecoveryRequiredState,
  removePublicFlowSaveRecoveryJournal,
  restorePublicFlowSaveRecoveryJournal,
  type PublicFlowSaveRecoveryJournal,
  type PublicFlowSaveRecoveryJournalInput,
  type PublicFlowSaveRecoveryStorage,
} from './public-flow-save-recovery-journal';

const sourceFlowSlug = 'moving-d30';
const idempotencyKey = 'save-request:journal-1';

function savingIntent(
  personalCopyKey = 'personal-copy:journal-1',
): SaveIntent {
  return {
    sourceKey: createSourceKey('public-flow:moving-d30'),
    personalCopyKey: createPersonalCopyKey(personalCopyKey),
    idempotencyKey: createIdempotencyKey(idempotencyKey),
    draftToken: createDraftToken('draft:moving-d30:journal-1'),
  };
}

function rawValues(
  entries: readonly (readonly [string, string | null])[],
): Record<string, string | null> {
  return Object.fromEntries(entries);
}

function recoveryWriteKeys(personalCopyKey = 'personal-copy:journal-1'): string[] {
  const plan = buildPublicFlowSaveStorageKeyPlan(personalCopyKey);
  return plan.allKeys.filter((key) => key !== plan.canonicalOriginKey);
}

function sessionDraft() {
  return {
    titleDraft: '내 30일 이사 준비',
    anchor: '2026-08-04',
    anchorMode: 'custom' as const,
    itemStates: {
      'item:packing': {
        skipped: false,
        note: '깨지기 쉬운 물건부터 포장',
        personalOrder: 0,
        personalExcluded: false,
      },
    },
    itemPersonalizations: {
      'item:packing': {
        title: '주방 깨지기 쉬운 물건 포장',
        detail: '신문지와 완충재를 함께 사용',
        date: '2026-08-05',
      },
      'item:address': { date: null },
    },
    weekdaySelection: ['월', '수', '금'],
    routineDefinition: {
      schemaVersion: 1 as const,
      time: '07:30',
      durationMinutes: 30,
      end: { mode: 'count' as const, count: 12 },
    },
  };
}

function recoveryInput(
  choice: PublicSaveChoice = {
    kind: 'create',
    personalCopyKey: createPersonalCopyKey('personal-copy:journal-1'),
  },
  intent = savingIntent(),
): PublicFlowSaveRecoveryJournalInput {
  const keys = recoveryWriteKeys(choice.personalCopyKey);
  const entries = keys.map((key, index) => [
    key,
    index === keys.length - 1 ? null : `before-${index}`,
  ] as const);
  const expectedEntries = keys.map((key, index) => [
    key,
    index === keys.length - 1
      ? '{"lastSaveRequestId":"save-request:journal-1"}'
      : `after-${index}`,
  ] as const);
  return {
    sourceFlowSlug,
    intent,
    choice,
    attempt: 2,
    rawBackup: {
      keys: entries.map(([key]) => key),
      values: rawValues(entries),
    },
    expectedPostSaveRaw: {
      keys: expectedEntries.map(([key]) => key),
      values: rawValues(expectedEntries),
    },
    sessionDraft: sessionDraft(),
  };
}

function journal(): PublicFlowSaveRecoveryJournal {
  const result = createPublicFlowSaveRecoveryJournal(recoveryInput());
  assert.ok(result);
  return result;
}

class InstrumentedRecoveryStorage implements PublicFlowSaveRecoveryStorage {
  private readonly values = new Map<string, string>();

  readonly failReads: Set<number>;
  readonly failMutations: Set<number>;
  readCalls = 0;
  mutationCalls = 0;

  constructor(
    seed: Record<string, string>,
    failures: { reads?: readonly number[]; mutations?: readonly number[] } = {},
  ) {
    Object.entries(seed).forEach(([key, value]) => this.values.set(key, value));
    this.failReads = new Set(failures.reads ?? []);
    this.failMutations = new Set(failures.mutations ?? []);
  }

  getItem(key: string): string | null {
    this.readCalls += 1;
    if (this.failReads.has(this.readCalls)) throw new Error(`read ${this.readCalls}`);
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.mutationCalls += 1;
    // Mutate first to model Storage implementations that surface an exception
    // after applying a write. Recovery must compensate this key too.
    this.values.set(key, value);
    if (this.failMutations.has(this.mutationCalls)) {
      throw new Error(`mutation ${this.mutationCalls}`);
    }
  }

  removeItem(key: string): void {
    this.mutationCalls += 1;
    this.values.delete(key);
    if (this.failMutations.has(this.mutationCalls)) {
      throw new Error(`mutation ${this.mutationCalls}`);
    }
  }

  snapshot(keys: readonly string[]): Record<string, string | null> {
    return Object.fromEntries(keys.map((key) => [key, this.values.get(key) ?? null]));
  }
}

function journalForRawSnapshots(
  keys: readonly string[],
  before: Readonly<Record<string, string | null>>,
  intendedAfter: Readonly<Record<string, string | null>>,
): PublicFlowSaveRecoveryJournal {
  const result = createPublicFlowSaveRecoveryJournal({
    ...recoveryInput(),
    rawBackup: { keys: [...keys], values: { ...before } },
    expectedPostSaveRaw: { keys: [...keys], values: { ...intendedAfter } },
  });
  assert.ok(result);
  return result;
}

test('journal validates and preserves the saving identity, choice, attempt, and exact raw bytes', () => {
  const result = journal();

  assert.equal(result.schemaVersion, 3);
  assert.equal(result.sourceFlowSlug, sourceFlowSlug);
  assert.equal(result.intent.sourceKey, 'public-flow:moving-d30');
  assert.equal(result.intent.personalCopyKey, 'personal-copy:journal-1');
  assert.equal(result.intent.idempotencyKey, idempotencyKey);
  assert.equal(result.intent.draftToken, 'draft:moving-d30:journal-1');
  assert.deepEqual(result.choice, {
    kind: 'create',
    personalCopyKey: 'personal-copy:journal-1',
  });
  assert.equal(result.attempt, 2);
  assert.deepEqual(result.rawBackup.keys, recoveryWriteKeys());
  assert.equal(
    result.rawBackup.values['flow:my-flow:item-drafts'],
    'before-0',
  );
  assert.equal(
    result.rawBackup.values['flow:saved:personal-copy:journal-1'],
    null,
  );
  assert.deepEqual(result.expectedPostSaveRaw.keys, result.rawBackup.keys);
  assert.equal(
    result.expectedPostSaveRaw.values['flow:saved:personal-copy:journal-1'],
    '{"lastSaveRequestId":"save-request:journal-1"}',
  );
  assert.deepEqual(result.sessionDraft, sessionDraft());
});

test('overwrite can target an existing identity while create and copy must use the reserved identity', () => {
  const intent = savingIntent('personal-copy:new-reservation');
  const overwrite = createPublicFlowSaveRecoveryJournal(recoveryInput({
    kind: 'overwrite',
    personalCopyKey: createPersonalCopyKey('personal-copy:existing'),
  }, intent));
  assert.equal(overwrite?.choice.personalCopyKey, 'personal-copy:existing');

  for (const kind of ['create', 'copy'] as const) {
    const mismatched = {
      schemaVersion: 3,
      ...recoveryInput({
        kind,
        personalCopyKey: createPersonalCopyKey('personal-copy:not-reserved'),
      }, intent),
    };
    assert.equal(normalizePublicFlowSaveRecoveryJournal(mismatched), undefined);
  }
});

test('merge survives a reload round-trip, preserves navigation state, and does not mutate its input', () => {
  const currentState = {
    __NA: true,
    navigation: { segment: '/flows/moving-d30' },
  };
  const currentSnapshot = structuredClone(currentState);
  const merged = mergePublicFlowSaveRecoveryJournal(currentState, journal());

  assert.notEqual(merged, currentState);
  assert.deepEqual(currentState, currentSnapshot);
  assert.equal((merged as Record<string, unknown>).__NA, true);

  const afterReload = structuredClone(merged);
  const restored = readPublicFlowSaveRecoveryJournal(afterReload, {
    sourceFlowSlug,
  });
  assert.ok(restored);
  assert.equal(restored.intent.idempotencyKey, idempotencyKey);
  assert.equal(restored.rawBackup.values['flow:my-flow:item-drafts'], 'before-0');
});

test('merge handles an empty state and leaves non-record foreign state untouched', () => {
  const fromNull = mergePublicFlowSaveRecoveryJournal(null, journal());
  assert.ok(fromNull && typeof fromNull === 'object');
  assert.ok(PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_HISTORY_KEY in (fromNull as object));

  const foreignState = ['navigation', 'state'];
  assert.equal(
    mergePublicFlowSaveRecoveryJournal(foreignState, journal()),
    foreignState,
  );
  const navigationState = { __NA: true };
  assert.equal(
    mergePublicFlowSaveRecoveryJournal(navigationState, { schemaVersion: 1 }),
    navigationState,
  );
});

test('read rejects a malformed, inherited, unsupported-version, or another-source payload', () => {
  const valid = journal();
  const read = (state: unknown, slug = sourceFlowSlug) => (
    readPublicFlowSaveRecoveryJournal(state, { sourceFlowSlug: slug })
  );

  assert.equal(read({
    [PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_HISTORY_KEY]: {
      ...valid,
      schemaVersion: 1,
    },
  }), undefined);
  assert.equal(read({
    [PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_HISTORY_KEY]: {
      ...valid,
      schemaVersion: 2,
    },
  }), undefined);
  assert.equal(read({
    [PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_HISTORY_KEY]: {
      ...valid,
      foreignField: true,
    },
  }), undefined);
  assert.equal(read({
    [PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_HISTORY_KEY]: valid,
  }, 'another-flow'), undefined);

  const inherited = Object.create({
    [PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_HISTORY_KEY]: valid,
  });
  assert.equal(read(inherited), undefined);

  let getterCalled = false;
  const accessorState = {} as Record<string, unknown>;
  Object.defineProperty(accessorState, PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_HISTORY_KEY, {
    enumerable: true,
    get() {
      getterCalled = true;
      return valid;
    },
  });
  assert.equal(read(accessorState), undefined);
  assert.equal(getterCalled, false);
});

test('normalization rejects malformed identity, attempt, schema shape, and hostile values', () => {
  const base = journal();
  const malformed: unknown[] = [
    { ...base, sourceFlowSlug: '../moving-d30' },
    { ...base, attempt: 0 },
    { ...base, attempt: 1.5 },
    { ...base, unexpected: true },
    { ...base, intent: { ...base.intent, idempotencyKey: 'bad key with spaces' } },
    { ...base, intent: { ...base.intent, draftToken: '' } },
    { ...base, choice: { kind: 'delete', personalCopyKey: 'personal-copy:journal-1' } },
  ];
  malformed.forEach((value) => {
    assert.equal(normalizePublicFlowSaveRecoveryJournal(value), undefined);
  });

  const hostile = new Proxy({}, {
    getPrototypeOf() {
      throw new Error('hostile history payload');
    },
  });
  assert.doesNotThrow(() => normalizePublicFlowSaveRecoveryJournal(hostile));
  assert.equal(normalizePublicFlowSaveRecoveryJournal(hostile), undefined);
});

test('session draft normalization returns detached clones for every mutable nested layer', () => {
  const draft = sessionDraft();
  const created = createPublicFlowSaveRecoveryJournal({
    ...recoveryInput(),
    sessionDraft: draft,
  });
  assert.ok(created);

  assert.notEqual(created.sessionDraft, draft);
  assert.notEqual(created.sessionDraft.itemStates, draft.itemStates);
  assert.notEqual(created.sessionDraft.itemStates['item:packing'], draft.itemStates['item:packing']);
  assert.notEqual(created.sessionDraft.itemPersonalizations, draft.itemPersonalizations);
  assert.notEqual(
    created.sessionDraft.itemPersonalizations['item:packing'],
    draft.itemPersonalizations['item:packing'],
  );
  assert.notEqual(created.sessionDraft.weekdaySelection, draft.weekdaySelection);
  assert.notEqual(created.sessionDraft.routineDefinition, draft.routineDefinition);
  assert.notEqual(created.sessionDraft.routineDefinition.end, draft.routineDefinition.end);

  draft.itemStates['item:packing'].note = 'mutated after journal creation';
  draft.itemPersonalizations['item:packing'].detail = 'mutated detail';
  draft.weekdaySelection[0] = '화';
  draft.routineDefinition.end.count = 99;

  assert.equal(
    created.sessionDraft.itemStates['item:packing']?.note,
    '깨지기 쉬운 물건부터 포장',
  );
  assert.equal(
    created.sessionDraft.itemPersonalizations['item:packing']?.detail,
    '신문지와 완충재를 함께 사용',
  );
  assert.deepEqual(created.sessionDraft.weekdaySelection, ['월', '수', '금']);
  assert.deepEqual(created.sessionDraft.routineDefinition.end, {
    mode: 'count',
    count: 12,
  });
});

test('session draft rejects missing, extra, oversized, non-finite, and invalid nested values', () => {
  const base = sessionDraft();
  const { anchor: _anchor, ...missingAnchor } = base;
  const tooManyItemStates = Object.fromEntries(Array.from(
    { length: 501 },
    (_, index) => [`item:${index}`, {}],
  ));
  const malformed: unknown[] = [
    missingAnchor,
    { ...base, foreignField: true },
    { ...base, titleDraft: 'x'.repeat(501) },
    { ...base, titleDraft: 'title\0draft' },
    { ...base, anchor: '2026-02-30' },
    { ...base, anchorMode: 'saved' },
    { ...base, itemStates: [] },
    { ...base, itemStates: tooManyItemStates },
    { ...base, itemStates: { ' item:packing': {} } },
    { ...base, itemStates: { 'item:packing': { unknown: true } } },
    { ...base, itemStates: { 'item:packing': { note: 'x'.repeat(20_001) } } },
    { ...base, itemStates: { 'item:packing': { personalOrder: Number.NaN } } },
    { ...base, itemStates: { 'item:packing': { personalOrder: Number.POSITIVE_INFINITY } } },
    { ...base, itemStates: { 'item:packing': { personalOrder: 1.5 } } },
    { ...base, itemStates: { 'item:packing': { personalOrder: -1 } } },
    { ...base, itemPersonalizations: [] },
    { ...base, itemPersonalizations: { 'item:packing': { memo: 'unknown field' } } },
    { ...base, itemPersonalizations: { 'item:packing': { title: 'x'.repeat(501) } } },
    { ...base, itemPersonalizations: { 'item:packing': { detail: 'x'.repeat(20_001) } } },
    { ...base, itemPersonalizations: { 'item:packing': { date: '2026-02-30' } } },
    { ...base, weekdaySelection: ['월', '월'] },
    { ...base, weekdaySelection: ['MON'] },
    { ...base, routineDefinition: { ...base.routineDefinition, unknown: true } },
    { ...base, routineDefinition: { ...base.routineDefinition, schemaVersion: 2 } },
    { ...base, routineDefinition: { ...base.routineDefinition, time: '24:00' } },
    { ...base, routineDefinition: { ...base.routineDefinition, durationMinutes: Number.NaN } },
    { ...base, routineDefinition: { ...base.routineDefinition, durationMinutes: 5.5 } },
    {
      ...base,
      routineDefinition: { schemaVersion: 1, durationMinutes: 30, end: { mode: 'none' } },
    },
    {
      ...base,
      routineDefinition: { schemaVersion: 1, end: { mode: 'until', date: '2026-02-30' } },
    },
    {
      ...base,
      routineDefinition: { schemaVersion: 1, end: { mode: 'count', count: Number.POSITIVE_INFINITY } },
    },
    {
      ...base,
      routineDefinition: { schemaVersion: 1, end: { mode: 'none', count: 3 } },
    },
  ];

  malformed.forEach((value, index) => {
    assert.equal(
      normalizePublicFlowSaveSessionDraft(value),
      undefined,
      `malformed session draft ${index}`,
    );
  });
});

test('session draft rejects accessor and proxy-backed nested records without leaking an exception', () => {
  let getterCalled = false;
  const accessorItemState = Object.defineProperty({}, 'note', {
    enumerable: true,
    get() {
      getterCalled = true;
      return 'hostile';
    },
  });
  const accessorDraft = {
    ...sessionDraft(),
    itemStates: { 'item:packing': accessorItemState },
  };
  assert.doesNotThrow(() => normalizePublicFlowSaveSessionDraft(accessorDraft));
  assert.equal(normalizePublicFlowSaveSessionDraft(accessorDraft), undefined);
  assert.equal(getterCalled, false);

  const hostilePersonalizations = new Proxy({}, {
    getPrototypeOf() {
      throw new Error('hostile nested proxy');
    },
  });
  assert.doesNotThrow(() => normalizePublicFlowSaveSessionDraft({
    ...sessionDraft(),
    itemPersonalizations: hostilePersonalizations,
  }));
  assert.equal(normalizePublicFlowSaveSessionDraft({
    ...sessionDraft(),
    itemPersonalizations: hostilePersonalizations,
  }), undefined);
});

test('raw backup validation requires a one-to-one key/value snapshot without coercion', () => {
  const base = journal();
  const withBackups = (rawBackup: unknown, expectedPostSaveRaw: unknown = base.expectedPostSaveRaw) => ({
    ...base,
    rawBackup,
    expectedPostSaveRaw,
  });
  const validKeys = [...base.rawBackup.keys];
  const validValues = { ...base.rawBackup.values };

  const malformedBackups = [
    { keys: [], values: {} },
    {
      keys: [validKeys[0], validKeys[0], ...validKeys.slice(2)],
      values: validValues,
    },
    {
      keys: validKeys,
      values: Object.fromEntries(validKeys.slice(1).map((key) => [key, validValues[key]])),
    },
    { keys: validKeys, values: { ...validValues, extra: null } },
    { keys: validKeys, values: { ...validValues, [validKeys[1]]: 42 } },
    { keys: ['flow:key\0a'], values: { 'flow:key\0a': null } },
  ];
  malformedBackups.forEach((rawBackup) => {
    assert.equal(
      normalizePublicFlowSaveRecoveryJournal(withBackups(rawBackup)),
      undefined,
    );
  });

  assert.equal(normalizePublicFlowSaveRecoveryJournal(withBackups(
    {
      keys: validKeys,
      values: validValues,
    },
    {
      keys: [...validKeys].reverse(),
      values: { ...base.expectedPostSaveRaw.values },
    },
  )), undefined);
  assert.equal(normalizePublicFlowSaveRecoveryJournal(withBackups(
    {
      keys: validKeys,
      values: validValues,
    },
    {
      keys: validKeys.slice(0, -1),
      values: Object.fromEntries(
        validKeys.slice(0, -1).map((key) => [key, base.expectedPostSaveRaw.values[key]]),
      ),
    },
  )), undefined);

  const injectedKey = 'flow:unrelated:user-data';
  const injectedKeys = [...validKeys.slice(0, -1), injectedKey];
  assert.equal(normalizePublicFlowSaveRecoveryJournal(withBackups(
    {
      keys: injectedKeys,
      values: Object.fromEntries(injectedKeys.map((key) => [key, null])),
    },
    {
      keys: injectedKeys,
      values: Object.fromEntries(injectedKeys.map((key) => [key, 'hostile'])),
    },
  )), undefined);
  assert.equal(normalizePublicFlowSaveRecoveryJournal(withBackups(
    {
      keys: [...validKeys].reverse(),
      values: validValues,
    },
    {
      keys: [...validKeys].reverse(),
      values: { ...base.expectedPostSaveRaw.values },
    },
  )), undefined);
});

test('a valid journal reconstructs the locked recovery lifecycle after reload', () => {
  const restored = reconstructPublicSaveRecoveryRequiredState(journal(), {
    code: 'rollback_incomplete',
    message: '원래 저장 상태를 모두 복구해야 합니다.',
  });

  assert.ok(restored);
  assert.equal(restored.status, 'recovery_required');
  assert.equal(restored.draftToken, 'draft:moving-d30:journal-1');
  assert.equal(restored.intent.idempotencyKey, idempotencyKey);
  assert.equal(restored.choice.kind, 'create');
  assert.equal(restored.attempt, 2);
  assert.deepEqual(restored.error, {
    code: 'rollback_incomplete',
    message: '원래 저장 상태를 모두 복구해야 합니다.',
  });

  assert.equal(reconstructPublicSaveRecoveryRequiredState(journal(), {
    code: 'storage_write_failed',
    message: 'This state is retryable, not recovery-required.',
  }), undefined);
});

test('caller-provided idempotency marker distinguishes a committed save from recovery work', () => {
  const recovery = journal();
  assert.equal(
    matchesPublicFlowSaveRecoveryCommitMarker(recovery, idempotencyKey),
    true,
  );
  assert.equal(
    matchesPublicFlowSaveRecoveryCommitMarker(recovery, 'save-request:another'),
    false,
  );
  assert.equal(matchesPublicFlowSaveRecoveryCommitMarker(recovery, ''), false);
  assert.equal(matchesPublicFlowSaveRecoveryCommitMarker({ schemaVersion: 1 }, idempotencyKey), false);
});

test('remove clears only an exact source/idempotency journal and preserves every foreign field', () => {
  const valid = journal();
  const state = {
    __NA: true,
    nested: { keep: 'same reference' },
    [PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_HISTORY_KEY]: valid,
  };

  const wrongSource = removePublicFlowSaveRecoveryJournal(state, {
    sourceFlowSlug: 'another-flow',
    idempotencyKey,
  });
  assert.equal(wrongSource, state);

  const wrongRequest = removePublicFlowSaveRecoveryJournal(state, {
    sourceFlowSlug,
    idempotencyKey: 'save-request:another',
  });
  assert.equal(wrongRequest, state);

  const removed = removePublicFlowSaveRecoveryJournal(state, {
    sourceFlowSlug,
    idempotencyKey,
  }) as Record<string, unknown>;
  assert.notEqual(removed, state);
  assert.equal(removed.__NA, true);
  assert.equal(removed.nested, state.nested);
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      removed,
      PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_HISTORY_KEY,
    ),
    false,
  );
  assert.ok(PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_HISTORY_KEY in state);

  const malformedState = {
    __NA: true,
    [PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_HISTORY_KEY]: { schemaVersion: 99 },
  };
  assert.equal(removePublicFlowSaveRecoveryJournal(malformedState, {
    sourceFlowSlug,
    idempotencyKey,
  }), malformedState);
});

test('CAS recovery accepts a mixed pre-save/post-save partial state and restores exact pre-save bytes', () => {
  const keys = recoveryWriteKeys();
  const before = Object.fromEntries(keys.map((key, index) => [
    key,
    index % 2 === 0 ? `before-${index}` : null,
  ]));
  const intendedAfter = Object.fromEntries(keys.map((key, index) => [
    key,
    `after-${index}`,
  ]));
  const interruptedState = Object.fromEntries(keys.map((key, index) => [
    key,
    index % 2 === 0 ? before[key] : intendedAfter[key],
  ])) as Record<string, string>;
  const storage = new InstrumentedRecoveryStorage(interruptedState);

  const result = restorePublicFlowSaveRecoveryJournal(
    storage,
    journalForRawSnapshots(keys, before, intendedAfter),
  );

  assert.deepEqual(result, {
    complete: true,
    restoredKeys: [...keys].reverse().filter((_, index) => index % 2 === 0),
    failedKeys: [],
    conflictKeys: [],
    rollbackComplete: true,
  });
  assert.equal(storage.mutationCalls, keys.length / 2);
  assert.deepEqual(storage.snapshot(keys), before);
});

test('a third-party or newer value is an explicit conflict and causes zero recovery writes', () => {
  const keys = recoveryWriteKeys();
  const before = Object.fromEntries(keys.map((key, index) => [key, `before-${index}`]));
  const intendedAfter = Object.fromEntries(keys.map((key, index) => [key, `after-${index}`]));
  const conflictKey = keys[1];
  const current = {
    ...intendedAfter,
    [conflictKey]: 'third-party-newer-value',
  } as Record<string, string>;
  const storage = new InstrumentedRecoveryStorage(current);

  const result = restorePublicFlowSaveRecoveryJournal(
    storage,
    journalForRawSnapshots(keys, before, intendedAfter),
  );

  assert.deepEqual(result, {
    complete: false,
    restoredKeys: [],
    failedKeys: [],
    conflictKeys: [conflictKey],
    rollbackComplete: true,
  });
  assert.equal(storage.mutationCalls, 0);
  assert.deepEqual(storage.snapshot(keys), current);
});

test('a stale journal never overwrites a later save with a different committed raw marker', () => {
  const staleJournal = journal();
  const keys = [...staleJournal.rawBackup.keys];
  const savedRecordKey = keys[keys.length - 1];
  const laterCommittedRaw = '{"lastSaveRequestId":"save-request:journal-2"}';
  const storage = new InstrumentedRecoveryStorage({
    ...Object.fromEntries(keys.map((key) => [
      key,
      staleJournal.expectedPostSaveRaw.values[key] ?? '',
    ])),
    [savedRecordKey]: laterCommittedRaw,
  });

  const result = restorePublicFlowSaveRecoveryJournal(storage, staleJournal);

  assert.deepEqual(result, {
    complete: false,
    restoredKeys: [],
    failedKeys: [],
    conflictKeys: [savedRecordKey],
    rollbackComplete: true,
  });
  assert.equal(storage.mutationCalls, 0);
  assert.equal(storage.snapshot([savedRecordKey])[savedRecordKey], laterCommittedRaw);
});

test('a read failure at every snapshot position aborts before the first recovery write', () => {
  const recovery = journal();
  const keys = [...recovery.rawBackup.keys];
  const afterSave = Object.fromEntries(keys.map((key) => [
    key,
    recovery.expectedPostSaveRaw.values[key] ?? '',
  ]));

  for (let failAt = 1; failAt <= keys.length; failAt += 1) {
    const storage = new InstrumentedRecoveryStorage(afterSave, { reads: [failAt] });
    const result = restorePublicFlowSaveRecoveryJournal(storage, recovery);

    assert.deepEqual(result, {
      complete: false,
      restoredKeys: [],
      failedKeys: [keys[failAt - 1]],
      conflictKeys: [],
      rollbackComplete: true,
    });
    assert.equal(storage.mutationCalls, 0);
    assert.deepEqual(storage.snapshot(keys), afterSave);
  }
});

test('a failure at every restore position compensates to the exact pre-recovery snapshot', () => {
  const keys = recoveryWriteKeys();
  const before = Object.fromEntries(keys.map((key, index) => [
    key,
    index % 2 === 0 ? `before-${index}` : null,
  ]));
  const intendedAfter = Object.fromEntries(keys.map((key, index) => [key, `after-${index}`]));
  const afterSave = { ...intendedAfter } as Record<string, string>;
  const recovery = journalForRawSnapshots(keys, before, intendedAfter);
  const restoreOrder = [...keys].reverse();

  for (let failAt = 1; failAt <= restoreOrder.length; failAt += 1) {
    const storage = new InstrumentedRecoveryStorage(afterSave, {
      mutations: [failAt],
    });
    const result = restorePublicFlowSaveRecoveryJournal(storage, recovery);

    assert.equal(result.complete, false, `failure ${failAt} completion`);
    assert.equal(result.rollbackComplete, true, `failure ${failAt} compensation`);
    assert.deepEqual(result.failedKeys, [restoreOrder[failAt - 1]]);
    assert.deepEqual(result.restoredKeys, restoreOrder.slice(0, failAt - 1));
    assert.deepEqual(result.conflictKeys, []);
    assert.deepEqual(
      storage.snapshot(keys),
      afterSave,
      `failure ${failAt} exact pre-recovery snapshot`,
    );
  }
});

test('invalid recovery journals fail closed before storage is read or mutated', () => {
  const storage = new InstrumentedRecoveryStorage({});
  const result = restorePublicFlowSaveRecoveryJournal(storage, {
    schemaVersion: 1,
    sourceFlowSlug,
  });

  assert.deepEqual(result, {
    complete: false,
    restoredKeys: [],
    failedKeys: [],
    conflictKeys: [],
    rollbackComplete: true,
  });
  assert.equal(storage.readCalls, 0);
  assert.equal(storage.mutationCalls, 0);
});
