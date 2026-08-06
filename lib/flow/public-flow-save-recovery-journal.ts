import {
  createDraftToken,
  createIdempotencyKey,
  createPersonalCopyKey,
  createSourceKey,
  type PublicSaveChoice,
  type PublicSaveFailure,
  type PublicSaveRecoveryRequiredState,
  type SaveIntent,
} from './public-save-lifecycle';
import {
  buildPublicFlowSaveStorageKeyPlan,
  isValidPublicFlowItemStateRecord,
  type PublicFlowSaveRawBackup,
} from './public-flow-save-transaction';
import type { PublicItemPersonalization } from './public-item-personalization';
import type { SavedFlowRoutineDefinition, SavedFlowRoutineEnd } from './storage';
import type { FlowItemState } from './types';

export const PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_SCHEMA_VERSION = 3 as const;
export const PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_HISTORY_KEY =
  'flowPublicSaveRecoveryJournal';

const SOURCE_FLOW_SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/u;
const SAVE_IDENTITY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const MAX_STORAGE_KEY_LENGTH = 1_024;
const MAX_BACKUP_KEY_COUNT = 128;
const MAX_SESSION_DRAFT_TITLE_LENGTH = 500;
const MAX_SESSION_DRAFT_ITEM_COUNT = 500;
const MAX_SESSION_DRAFT_ITEM_ID_LENGTH = 256;
const MAX_SESSION_DRAFT_ITEM_TITLE_LENGTH = 500;
const MAX_SESSION_DRAFT_ITEM_TEXT_LENGTH = 20_000;
const MAX_SESSION_DRAFT_TOTAL_TEXT_LENGTH = 1_000_000;
const MAX_PERSONAL_ORDER = 100_000;
const WEEKDAY_VALUES = new Set(['월', '화', '수', '목', '금', '토', '일']);

export type PublicFlowSaveSessionDraft = Readonly<{
  titleDraft: string;
  anchor: string;
  anchorMode: 'custom' | 'undated' | 'example';
  itemStates: Record<string, FlowItemState>;
  itemPersonalizations: Record<string, PublicItemPersonalization>;
  weekdaySelection: string[];
  routineDefinition: SavedFlowRoutineDefinition;
}>;

export type PublicFlowSaveRecoveryJournal = Readonly<{
  schemaVersion: typeof PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_SCHEMA_VERSION;
  sourceFlowSlug: string;
  intent: SaveIntent;
  choice: PublicSaveChoice;
  attempt: number;
  rawBackup: PublicFlowSaveRawBackup;
  /** Exact raw values the interrupted save intended to write. */
  expectedPostSaveRaw: PublicFlowSaveRawBackup;
  /** In-memory public edits required to rehydrate a forced reload safely. */
  sessionDraft: PublicFlowSaveSessionDraft;
}>;

export type PublicFlowSaveRecoveryJournalInput = Omit<
  PublicFlowSaveRecoveryJournal,
  'schemaVersion'
>;

export type PublicFlowSaveRecoveryJournalMatch = Readonly<{
  sourceFlowSlug: string;
  idempotencyKey?: string;
}>;

export type PublicFlowSaveRecoveryStorage = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>;

export type PublicFlowSaveRecoveryResult = Readonly<{
  /** Whether every key now exactly matches the journal's pre-save backup. */
  complete: boolean;
  /** Keys restored before a restore mutation failed. */
  restoredKeys: string[];
  /** A snapshot-read or restore-mutation key that failed. */
  failedKeys: string[];
  /** Keys containing neither the journal's pre-save nor intended post-save raw value. */
  conflictKeys: string[];
  /** Whether a failed restore left the exact pre-recovery snapshot intact. */
  rollbackComplete: boolean;
}>;

const DEFAULT_RECOVERY_ERROR: PublicSaveFailure = {
  code: 'rollback_incomplete',
  message: 'The previous save did not restore every original storage value.',
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Reflect.ownKeys(value).every((key) => {
    if (typeof key !== 'string') return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return Boolean(descriptor && 'value' in descriptor);
  });
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length
    && expected.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function normalizeSourceFlowSlug(value: unknown): string | undefined {
  return typeof value === 'string' && SOURCE_FLOW_SLUG_PATTERN.test(value)
    ? value
    : undefined;
}

function normalizeSaveIdentity(value: unknown): string | undefined {
  return typeof value === 'string' && SAVE_IDENTITY_PATTERN.test(value)
    ? value
    : undefined;
}

function normalizeRawBackup(value: unknown): PublicFlowSaveRawBackup | undefined {
  if (
    !isPlainRecord(value)
    || !hasExactKeys(value, ['keys', 'values'])
    || !Array.isArray(value.keys)
    || !isPlainRecord(value.values)
    || value.keys.length === 0
    || value.keys.length > MAX_BACKUP_KEY_COUNT
  ) {
    return undefined;
  }

  const keys: string[] = [];
  const seen = new Set<string>();
  for (const key of value.keys) {
    if (
      typeof key !== 'string'
      || key.length === 0
      || key.length > MAX_STORAGE_KEY_LENGTH
      || key.includes('\0')
      || seen.has(key)
    ) {
      return undefined;
    }
    seen.add(key);
    keys.push(key);
  }

  const rawValues = value.values;
  const rawValueKeys = Object.keys(rawValues);
  if (
    rawValueKeys.length !== keys.length
    || rawValueKeys.some((key) => !seen.has(key))
  ) {
    return undefined;
  }

  const entries: [string, string | null][] = [];
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(rawValues, key)) return undefined;
    const raw = rawValues[key];
    if (raw !== null && typeof raw !== 'string') return undefined;
    entries.push([key, raw]);
  }

  return {
    keys,
    // Object.fromEntries preserves storage keys such as "__proto__" as own
    // data properties instead of treating them as object prototype setters.
    values: Object.fromEntries(entries),
  };
}

function normalizeIntent(value: unknown): SaveIntent | undefined {
  if (
    !isPlainRecord(value)
    || !hasExactKeys(value, [
      'sourceKey',
      'personalCopyKey',
      'idempotencyKey',
      'draftToken',
    ])
  ) {
    return undefined;
  }

  const sourceKey = normalizeSaveIdentity(value.sourceKey);
  const personalCopyKey = normalizeSaveIdentity(value.personalCopyKey);
  const idempotencyKey = normalizeSaveIdentity(value.idempotencyKey);
  const draftToken = normalizeSaveIdentity(value.draftToken);
  if (!sourceKey || !personalCopyKey || !idempotencyKey || !draftToken) {
    return undefined;
  }

  return {
    sourceKey: createSourceKey(sourceKey),
    personalCopyKey: createPersonalCopyKey(personalCopyKey),
    idempotencyKey: createIdempotencyKey(idempotencyKey),
    draftToken: createDraftToken(draftToken),
  };
}

function normalizeChoice(
  value: unknown,
  intent: SaveIntent,
): PublicSaveChoice | undefined {
  if (
    !isPlainRecord(value)
    || !hasExactKeys(value, ['kind', 'personalCopyKey'])
    || (
      value.kind !== 'create'
      && value.kind !== 'overwrite'
      && value.kind !== 'copy'
    )
  ) {
    return undefined;
  }

  const personalCopyKey = normalizeSaveIdentity(value.personalCopyKey);
  if (!personalCopyKey) return undefined;

  // Create and copy must use the identity reserved in the saving intent.
  // Overwrite deliberately targets an already-existing identity and can differ.
  if (
    value.kind !== 'overwrite'
    && personalCopyKey !== intent.personalCopyKey
  ) {
    return undefined;
  }

  return {
    kind: value.kind,
    personalCopyKey: createPersonalCopyKey(personalCopyKey),
  };
}

function isBoundedDraftString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string'
    && value.length <= maxLength
    && !value.includes('\0');
}

function isValidPlainDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function isValidDraftItemId(value: string): boolean {
  return value.length > 0
    && value.length <= MAX_SESSION_DRAFT_ITEM_ID_LENGTH
    && value.trim() === value
    && !value.includes('\0');
}

function normalizeSessionItemStates(
  value: unknown,
): { value: Record<string, FlowItemState>; textLength: number } | undefined {
  if (!isPlainRecord(value)) return undefined;
  const untypedEntries = Object.entries(value);
  if (untypedEntries.some(([, candidate]) => !isPlainRecord(candidate))) return undefined;
  if (!isValidPublicFlowItemStateRecord(value)) return undefined;
  const entries = Object.entries(value as Record<string, FlowItemState>);
  if (entries.length > MAX_SESSION_DRAFT_ITEM_COUNT) return undefined;

  let textLength = 0;
  const normalizedEntries: [string, FlowItemState][] = [];
  for (const [itemId, candidate] of entries) {
    if (!isValidDraftItemId(itemId)) return undefined;
    textLength += itemId.length;
    const normalized: FlowItemState = {};
    if (Object.prototype.hasOwnProperty.call(candidate, 'skipped')) {
      if (typeof candidate.skipped !== 'boolean') return undefined;
      normalized.skipped = candidate.skipped;
    }
    if (Object.prototype.hasOwnProperty.call(candidate, 'note')) {
      if (!isBoundedDraftString(candidate.note, MAX_SESSION_DRAFT_ITEM_TEXT_LENGTH)) {
        return undefined;
      }
      normalized.note = candidate.note;
      textLength += candidate.note.length;
    }
    if (Object.prototype.hasOwnProperty.call(candidate, 'personalOrder')) {
      if (
        !Number.isSafeInteger(candidate.personalOrder)
        || Number(candidate.personalOrder) < 0
        || Number(candidate.personalOrder) > MAX_PERSONAL_ORDER
      ) {
        return undefined;
      }
      normalized.personalOrder = Number(candidate.personalOrder);
    }
    if (Object.prototype.hasOwnProperty.call(candidate, 'personalExcluded')) {
      if (typeof candidate.personalExcluded !== 'boolean') return undefined;
      normalized.personalExcluded = candidate.personalExcluded;
    }
    normalizedEntries.push([itemId, normalized]);
  }

  return {
    value: Object.fromEntries(normalizedEntries),
    textLength,
  };
}

function normalizeSessionItemPersonalizations(
  value: unknown,
): { value: Record<string, PublicItemPersonalization>; textLength: number } | undefined {
  if (!isPlainRecord(value)) return undefined;
  const entries = Object.entries(value);
  if (entries.length > MAX_SESSION_DRAFT_ITEM_COUNT) return undefined;

  let textLength = 0;
  const normalizedEntries: [string, PublicItemPersonalization][] = [];
  for (const [itemId, candidate] of entries) {
    if (!isValidDraftItemId(itemId) || !isPlainRecord(candidate)) return undefined;
    const fields = Object.keys(candidate);
    if (fields.some((field) => !['title', 'detail', 'date'].includes(field))) {
      return undefined;
    }
    textLength += itemId.length;
    const normalized: PublicItemPersonalization = {};
    if (Object.prototype.hasOwnProperty.call(candidate, 'title')) {
      if (!isBoundedDraftString(candidate.title, MAX_SESSION_DRAFT_ITEM_TITLE_LENGTH)) {
        return undefined;
      }
      normalized.title = candidate.title;
      textLength += candidate.title.length;
    }
    if (Object.prototype.hasOwnProperty.call(candidate, 'detail')) {
      if (!isBoundedDraftString(candidate.detail, MAX_SESSION_DRAFT_ITEM_TEXT_LENGTH)) {
        return undefined;
      }
      normalized.detail = candidate.detail;
      textLength += candidate.detail.length;
    }
    if (Object.prototype.hasOwnProperty.call(candidate, 'date')) {
      if (
        candidate.date !== null
        && (typeof candidate.date !== 'string' || !isValidPlainDate(candidate.date))
      ) {
        return undefined;
      }
      normalized.date = candidate.date;
      if (candidate.date) textLength += candidate.date.length;
    }
    normalizedEntries.push([itemId, normalized]);
  }

  return {
    value: Object.fromEntries(normalizedEntries),
    textLength,
  };
}

function normalizeRoutineEnd(value: unknown): SavedFlowRoutineEnd | undefined {
  if (!isPlainRecord(value) || typeof value.mode !== 'string') return undefined;
  if (value.mode === 'source' || value.mode === 'none') {
    return hasExactKeys(value, ['mode']) ? { mode: value.mode } : undefined;
  }
  if (value.mode === 'until') {
    return hasExactKeys(value, ['mode', 'date'])
      && typeof value.date === 'string'
      && isValidPlainDate(value.date)
      ? { mode: 'until', date: value.date }
      : undefined;
  }
  if (value.mode === 'count') {
    return hasExactKeys(value, ['mode', 'count'])
      && Number.isSafeInteger(value.count)
      && Number(value.count) >= 1
      && Number(value.count) <= 10_000
      ? { mode: 'count', count: Number(value.count) }
      : undefined;
  }
  return undefined;
}

function normalizeSessionRoutineDefinition(
  value: unknown,
): SavedFlowRoutineDefinition | undefined {
  if (!isPlainRecord(value)) return undefined;
  const fields = Object.keys(value);
  if (
    !Object.prototype.hasOwnProperty.call(value, 'schemaVersion')
    || !Object.prototype.hasOwnProperty.call(value, 'end')
    || fields.some((field) => ![
      'schemaVersion',
      'time',
      'durationMinutes',
      'end',
    ].includes(field))
    || value.schemaVersion !== 1
  ) {
    return undefined;
  }

  const end = normalizeRoutineEnd(value.end);
  if (!end) return undefined;

  const hasTime = Object.prototype.hasOwnProperty.call(value, 'time');
  const time = value.time;
  if (hasTime && (typeof time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(time))) {
    return undefined;
  }

  const hasDuration = Object.prototype.hasOwnProperty.call(value, 'durationMinutes');
  const durationMinutes = value.durationMinutes;
  if (
    hasDuration
    && (
      !hasTime
      || !Number.isSafeInteger(durationMinutes)
      || Number(durationMinutes) < 5
      || Number(durationMinutes) > 1_440
    )
  ) {
    return undefined;
  }

  return {
    schemaVersion: 1,
    ...(hasTime ? { time: time as string } : {}),
    ...(hasDuration ? { durationMinutes: Number(durationMinutes) } : {}),
    end,
  };
}

export function normalizePublicFlowSaveSessionDraft(
  value: unknown,
): PublicFlowSaveSessionDraft | undefined {
  try {
    if (
      !isPlainRecord(value)
      || !hasExactKeys(value, [
        'titleDraft',
        'anchor',
        'anchorMode',
        'itemStates',
        'itemPersonalizations',
        'weekdaySelection',
        'routineDefinition',
      ])
      || !isBoundedDraftString(value.titleDraft, MAX_SESSION_DRAFT_TITLE_LENGTH)
      || typeof value.anchor !== 'string'
      || (value.anchor !== '' && !isValidPlainDate(value.anchor))
      || (
        value.anchorMode !== 'custom'
        && value.anchorMode !== 'undated'
        && value.anchorMode !== 'example'
      )
      || !Array.isArray(value.weekdaySelection)
      || value.weekdaySelection.length > WEEKDAY_VALUES.size
    ) {
      return undefined;
    }

    const itemStates = normalizeSessionItemStates(value.itemStates);
    const itemPersonalizations = normalizeSessionItemPersonalizations(
      value.itemPersonalizations,
    );
    const routineDefinition = normalizeSessionRoutineDefinition(value.routineDefinition);
    if (!itemStates || !itemPersonalizations || !routineDefinition) return undefined;

    const weekdaySelection: string[] = [];
    const seenWeekdays = new Set<string>();
    for (const weekday of value.weekdaySelection) {
      if (
        typeof weekday !== 'string'
        || !WEEKDAY_VALUES.has(weekday)
        || seenWeekdays.has(weekday)
      ) {
        return undefined;
      }
      seenWeekdays.add(weekday);
      weekdaySelection.push(weekday);
    }

    const routineTextLength = (routineDefinition.time?.length ?? 0)
      + (routineDefinition.end.mode === 'until' ? routineDefinition.end.date.length : 0);
    const totalTextLength = value.titleDraft.length
      + value.anchor.length
      + weekdaySelection.reduce((total, weekday) => total + weekday.length, 0)
      + itemStates.textLength
      + itemPersonalizations.textLength
      + routineTextLength;
    if (totalTextLength > MAX_SESSION_DRAFT_TOTAL_TEXT_LENGTH) return undefined;

    return {
      titleDraft: value.titleDraft,
      anchor: value.anchor,
      anchorMode: value.anchorMode,
      itemStates: itemStates.value,
      itemPersonalizations: itemPersonalizations.value,
      weekdaySelection,
      routineDefinition,
    };
  } catch {
    return undefined;
  }
}

export function normalizePublicFlowSaveRecoveryJournal(
  value: unknown,
): PublicFlowSaveRecoveryJournal | undefined {
  try {
    if (
      !isPlainRecord(value)
      || !hasExactKeys(value, [
        'schemaVersion',
        'sourceFlowSlug',
        'intent',
        'choice',
        'attempt',
        'rawBackup',
        'expectedPostSaveRaw',
        'sessionDraft',
      ])
      || value.schemaVersion !== PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_SCHEMA_VERSION
    ) {
      return undefined;
    }

    const sourceFlowSlug = normalizeSourceFlowSlug(value.sourceFlowSlug);
    const intent = normalizeIntent(value.intent);
    const attempt = value.attempt;
    const rawBackup = normalizeRawBackup(value.rawBackup);
    const expectedPostSaveRaw = normalizeRawBackup(value.expectedPostSaveRaw);
    const sessionDraft = normalizePublicFlowSaveSessionDraft(value.sessionDraft);
    if (
      !sourceFlowSlug
      || !intent
      || !Number.isSafeInteger(attempt)
      || Number(attempt) < 1
      || !rawBackup
      || !expectedPostSaveRaw
      || !sessionDraft
      || expectedPostSaveRaw.keys.length !== rawBackup.keys.length
      || expectedPostSaveRaw.keys.some(
        (key, index) => key !== rawBackup.keys[index],
      )
    ) {
      return undefined;
    }

    const choice = normalizeChoice(value.choice, intent);
    if (!choice) return undefined;

    const keyPlan = buildPublicFlowSaveStorageKeyPlan(choice.personalCopyKey);
    const writeKeySet = new Set([
      keyPlan.itemDraftsKey,
      keyPlan.dateOverridesKey,
      keyPlan.itemStateKey,
      keyPlan.anchorKey,
      keyPlan.lastVisitKey,
      keyPlan.savedRecordKey,
    ]);
    const actualWriteKeys = keyPlan.allKeys.filter(
      (key) => writeKeySet.has(key),
    );
    if (
      actualWriteKeys.length !== 6
      || rawBackup.keys.length !== actualWriteKeys.length
      || rawBackup.keys.some((key, index) => key !== actualWriteKeys[index])
    ) {
      return undefined;
    }

    return {
      schemaVersion: PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_SCHEMA_VERSION,
      sourceFlowSlug,
      intent,
      choice,
      attempt: Number(attempt),
      rawBackup,
      expectedPostSaveRaw,
      sessionDraft,
    };
  } catch {
    // history.state is an untrusted browser boundary. Hostile accessors and
    // proxies must fail closed without taking down the current Flow screen.
    return undefined;
  }
}

export function createPublicFlowSaveRecoveryJournal(
  input: PublicFlowSaveRecoveryJournalInput,
): PublicFlowSaveRecoveryJournal | undefined {
  return normalizePublicFlowSaveRecoveryJournal({
    schemaVersion: PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_SCHEMA_VERSION,
    ...input,
  });
}

function getOwnHistoryValue(
  state: Record<string, unknown>,
  key: string,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(state, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

function copyHistoryState(state: Record<string, unknown>): Record<string, unknown> | undefined {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(state)) {
    const descriptor = Object.getOwnPropertyDescriptor(state, key);
    if (!descriptor || !('value' in descriptor)) return undefined;
    Object.defineProperty(result, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: descriptor.value,
    });
  }
  return result;
}

/**
 * Returns a new history state without mutating the caller's object. An invalid
 * journal or non-record foreign state is returned unchanged, so a caller never
 * destroys navigation metadata while attempting to persist recovery data.
 */
export function mergePublicFlowSaveRecoveryJournal(
  historyState: unknown,
  journalValue: unknown,
): unknown {
  const journal = normalizePublicFlowSaveRecoveryJournal(journalValue);
  if (!journal) return historyState;

  try {
    const base = historyState === null || historyState === undefined
      ? {}
      : isPlainRecord(historyState)
        ? copyHistoryState(historyState)
        : undefined;
    if (!base) return historyState;
    base[PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_HISTORY_KEY] = journal;
    return base;
  } catch {
    return historyState;
  }
}

export function readPublicFlowSaveRecoveryJournal(
  historyState: unknown,
  match: PublicFlowSaveRecoveryJournalMatch,
): PublicFlowSaveRecoveryJournal | undefined {
  try {
    const sourceFlowSlug = normalizeSourceFlowSlug(match.sourceFlowSlug);
    const idempotencyKey = match.idempotencyKey === undefined
      ? undefined
      : normalizeSaveIdentity(match.idempotencyKey);
    if (
      !sourceFlowSlug
      || (match.idempotencyKey !== undefined && !idempotencyKey)
      || !isPlainRecord(historyState)
    ) {
      return undefined;
    }

    const journal = normalizePublicFlowSaveRecoveryJournal(
      getOwnHistoryValue(historyState, PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_HISTORY_KEY),
    );
    if (
      !journal
      || journal.sourceFlowSlug !== sourceFlowSlug
      || (idempotencyKey !== undefined && journal.intent.idempotencyKey !== idempotencyKey)
    ) {
      return undefined;
    }
    return journal;
  } catch {
    return undefined;
  }
}

/**
 * Removes only the exact, normalized journal named by source and idempotency.
 * Malformed, unsupported-version, or another Flow's payload is left untouched.
 */
export function removePublicFlowSaveRecoveryJournal(
  historyState: unknown,
  match: Required<PublicFlowSaveRecoveryJournalMatch>,
): unknown {
  const journal = readPublicFlowSaveRecoveryJournal(historyState, match);
  if (!journal || !isPlainRecord(historyState)) return historyState;

  try {
    const nextState = copyHistoryState(historyState);
    if (!nextState) return historyState;
    delete nextState[PUBLIC_FLOW_SAVE_RECOVERY_JOURNAL_HISTORY_KEY];
    return nextState;
  } catch {
    return historyState;
  }
}

export function reconstructPublicSaveRecoveryRequiredState(
  journalValue: unknown,
  error: PublicSaveFailure = DEFAULT_RECOVERY_ERROR,
): PublicSaveRecoveryRequiredState | undefined {
  const journal = normalizePublicFlowSaveRecoveryJournal(journalValue);
  if (
    !journal
    || error.code !== 'rollback_incomplete'
    || !error.message.trim()
  ) {
    return undefined;
  }

  return {
    status: 'recovery_required',
    draftToken: journal.intent.draftToken,
    intent: journal.intent,
    choice: journal.choice,
    attempt: journal.attempt,
    error: {
      code: 'rollback_incomplete',
      message: error.message,
    },
  };
}

/**
 * The caller owns the durable saved-record lookup. Passing that record's
 * idempotency marker here separates an already committed save from a journal
 * that still requires restoring its exact raw backup.
 */
export function matchesPublicFlowSaveRecoveryCommitMarker(
  journalValue: unknown,
  committedIdempotencyKey: unknown,
): boolean {
  const journal = normalizePublicFlowSaveRecoveryJournal(journalValue);
  const marker = normalizeSaveIdentity(committedIdempotencyKey);
  return Boolean(journal && marker && journal.intent.idempotencyKey === marker);
}

/**
 * Restores an interrupted save only while every current value is still one of
 * the two values owned by that save: its exact pre-save backup or its intended
 * post-save value. A third value belongs to later/foreign work and blocks all
 * recovery writes.
 */
export function restorePublicFlowSaveRecoveryJournal(
  storage: PublicFlowSaveRecoveryStorage,
  journalValue: unknown,
): PublicFlowSaveRecoveryResult {
  const journal = normalizePublicFlowSaveRecoveryJournal(journalValue);
  if (!journal) {
    return {
      complete: false,
      restoredKeys: [],
      failedKeys: [],
      conflictKeys: [],
      rollbackComplete: true,
    };
  }

  const keys = [...journal.rawBackup.keys];
  const preRecoveryValues = new Map<string, string | null>();
  for (const key of keys) {
    try {
      preRecoveryValues.set(key, storage.getItem(key));
    } catch {
      // Snapshot every key before the first mutation. A read failure therefore
      // returns with storage untouched and no compensating write required.
      return {
        complete: false,
        restoredKeys: [],
        failedKeys: [key],
        conflictKeys: [],
        rollbackComplete: true,
      };
    }
  }

  const conflictKeys = keys.filter((key) => {
    const current = preRecoveryValues.get(key);
    return current !== journal.rawBackup.values[key]
      && current !== journal.expectedPostSaveRaw.values[key];
  });
  if (conflictKeys.length > 0) {
    return {
      complete: false,
      restoredKeys: [],
      failedKeys: [],
      conflictKeys,
      rollbackComplete: true,
    };
  }

  const restoreOrder = [...keys].reverse().filter(
    (key) => preRecoveryValues.get(key) !== journal.rawBackup.values[key],
  );
  const restoredKeys: string[] = [];
  for (const key of restoreOrder) {
    try {
      const raw = journal.rawBackup.values[key];
      if (raw === null) storage.removeItem(key);
      else storage.setItem(key, raw);
      restoredKeys.push(key);
    } catch {
      let rollbackComplete = true;
      // Restore every key, including the one whose mutation threw: a Storage
      // implementation can apply a mutation and then surface an exception.
      for (const rollbackKey of keys) {
        try {
          const raw = preRecoveryValues.get(rollbackKey);
          if (raw === null || raw === undefined) storage.removeItem(rollbackKey);
          else storage.setItem(rollbackKey, raw);
        } catch {
          rollbackComplete = false;
        }
      }
      return {
        complete: false,
        restoredKeys,
        failedKeys: [key],
        conflictKeys: [],
        rollbackComplete,
      };
    }
  }

  return {
    complete: true,
    restoredKeys,
    failedKeys: [],
    conflictKeys: [],
    rollbackComplete: true,
  };
}
