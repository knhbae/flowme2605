export const PERMANENT_SAVED_FLOW_DELETION_RECOVERY_JOURNAL_SCHEMA_VERSION = 1 as const;
export const PERMANENT_SAVED_FLOW_DELETION_RECOVERY_JOURNAL_STORAGE_KEY =
  'flow:permanent-saved-flow-deletion-recovery:v1';

const MAX_SAVED_PLAN_ID_LENGTH = 512;
const MAX_FLOW_TITLE_LENGTH = 500;

export type PermanentSavedFlowDeletionRecoveryPhase =
  | 'prepared'
  | 'deletion_confirmed';

export type PermanentSavedFlowDeletionRecoveryJournal = Readonly<{
  schemaVersion: typeof PERMANENT_SAVED_FLOW_DELETION_RECOVERY_JOURNAL_SCHEMA_VERSION;
  phase: PermanentSavedFlowDeletionRecoveryPhase;
  savedPlanId: string;
  flowTitle: string;
}>;

export type PermanentSavedFlowDeletionRecoveryStorage = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>;

export type PermanentSavedFlowDeletionRecoveryReadResult = Readonly<{
  status: 'empty' | 'valid' | 'malformed' | 'unsupported' | 'failed';
  journal?: PermanentSavedFlowDeletionRecoveryJournal;
  raw?: string | null;
  message?: string;
}>;

export type PermanentSavedFlowDeletionRecoveryWriteResult = Readonly<{
  status: 'stored' | 'blocked' | 'failed';
  journal?: PermanentSavedFlowDeletionRecoveryJournal;
  message?: string;
  rollbackComplete?: boolean;
}>;

export type PermanentSavedFlowDeletionRecoveryClearResult = Readonly<{
  status: 'cleared' | 'not_found' | 'blocked' | 'failed';
  message?: string;
}>;

function isPlainDataRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    return Reflect.ownKeys(value).every((key) => {
      if (typeof key !== 'string') return false;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return Boolean(descriptor && 'value' in descriptor);
    });
  } catch {
    return false;
  }
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length
    && expected.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function normalizeBoundedText(value: unknown, maxLength: number): string | undefined {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length > maxLength
    || value.trim() !== value
    || value.includes('\0')
  ) return undefined;
  return value;
}

export function normalizePermanentSavedFlowDeletionRecoveryJournal(
  value: unknown,
): PermanentSavedFlowDeletionRecoveryJournal | undefined {
  try {
    if (
      !isPlainDataRecord(value)
      || !hasExactKeys(value, ['schemaVersion', 'phase', 'savedPlanId', 'flowTitle'])
      || value.schemaVersion !== PERMANENT_SAVED_FLOW_DELETION_RECOVERY_JOURNAL_SCHEMA_VERSION
      || (value.phase !== 'prepared' && value.phase !== 'deletion_confirmed')
    ) return undefined;
    const savedPlanId = normalizeBoundedText(value.savedPlanId, MAX_SAVED_PLAN_ID_LENGTH);
    const flowTitle = normalizeBoundedText(value.flowTitle, MAX_FLOW_TITLE_LENGTH);
    if (!savedPlanId || !flowTitle) return undefined;
    return Object.freeze({
      schemaVersion: PERMANENT_SAVED_FLOW_DELETION_RECOVERY_JOURNAL_SCHEMA_VERSION,
      phase: value.phase,
      savedPlanId,
      flowTitle,
    });
  } catch {
    return undefined;
  }
}

function createJournal(input: Readonly<{
  phase: PermanentSavedFlowDeletionRecoveryPhase;
  savedPlanId: string;
  flowTitle: string;
}>): PermanentSavedFlowDeletionRecoveryJournal | undefined {
  return normalizePermanentSavedFlowDeletionRecoveryJournal({
    schemaVersion: PERMANENT_SAVED_FLOW_DELETION_RECOVERY_JOURNAL_SCHEMA_VERSION,
    ...input,
  });
}

export function readPermanentSavedFlowDeletionRecoveryJournal(
  storage: Pick<PermanentSavedFlowDeletionRecoveryStorage, 'getItem'>,
): PermanentSavedFlowDeletionRecoveryReadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(PERMANENT_SAVED_FLOW_DELETION_RECOVERY_JOURNAL_STORAGE_KEY);
  } catch (error) {
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'The deletion recovery journal could not be read.',
    };
  }
  if (raw === null) return { status: 'empty', raw };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'malformed', raw };
  }
  if (
    isPlainDataRecord(parsed)
    && Object.prototype.hasOwnProperty.call(parsed, 'schemaVersion')
    && parsed.schemaVersion !== PERMANENT_SAVED_FLOW_DELETION_RECOVERY_JOURNAL_SCHEMA_VERSION
  ) return { status: 'unsupported', raw };
  const journal = normalizePermanentSavedFlowDeletionRecoveryJournal(parsed);
  return journal ? { status: 'valid', journal, raw } : { status: 'malformed', raw };
}

export function isPermanentSavedFlowDeletionConfirmedForPlan(
  read: PermanentSavedFlowDeletionRecoveryReadResult,
  savedPlanId: string,
): boolean {
  return read.status === 'valid'
    && read.journal?.savedPlanId === savedPlanId
    && read.journal.phase === 'deletion_confirmed';
}

function restoreRaw(
  storage: PermanentSavedFlowDeletionRecoveryStorage,
  raw: string | null,
): boolean {
  try {
    if (raw === null) storage.removeItem(PERMANENT_SAVED_FLOW_DELETION_RECOVERY_JOURNAL_STORAGE_KEY);
    else storage.setItem(PERMANENT_SAVED_FLOW_DELETION_RECOVERY_JOURNAL_STORAGE_KEY, raw);
    return storage.getItem(PERMANENT_SAVED_FLOW_DELETION_RECOVERY_JOURNAL_STORAGE_KEY) === raw;
  } catch {
    return false;
  }
}

function storeJournal(
  storage: PermanentSavedFlowDeletionRecoveryStorage,
  journal: PermanentSavedFlowDeletionRecoveryJournal,
  rawBefore: string | null,
): PermanentSavedFlowDeletionRecoveryWriteResult {
  const raw = JSON.stringify(journal);
  try {
    storage.setItem(PERMANENT_SAVED_FLOW_DELETION_RECOVERY_JOURNAL_STORAGE_KEY, raw);
    if (storage.getItem(PERMANENT_SAVED_FLOW_DELETION_RECOVERY_JOURNAL_STORAGE_KEY) !== raw) {
      throw new Error('The deletion recovery journal write could not be verified.');
    }
    return { status: 'stored', journal };
  } catch (error) {
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'The deletion recovery journal could not be stored.',
      rollbackComplete: restoreRaw(storage, rawBefore),
    };
  }
}

export function preparePermanentSavedFlowDeletionRecoveryJournal(
  storage: PermanentSavedFlowDeletionRecoveryStorage,
  input: Readonly<{ savedPlanId: string; flowTitle: string }>,
): PermanentSavedFlowDeletionRecoveryWriteResult {
  const journal = createJournal({ phase: 'prepared', ...input });
  if (!journal) return { status: 'blocked', message: 'A valid saved plan identity is required.' };
  const current = readPermanentSavedFlowDeletionRecoveryJournal(storage);
  if (current.status === 'failed') return { status: 'failed', message: current.message };
  if (current.status === 'valid') {
    return {
      status: 'blocked',
      journal: current.journal,
      message: 'An earlier permanent deletion must be resolved first.',
    };
  }
  if (current.status !== 'empty') {
    return { status: 'blocked', message: 'An existing deletion recovery journal could not be verified.' };
  }
  return storeJournal(storage, journal, current.raw ?? null);
}

export function confirmPermanentSavedFlowDeletionRecoveryJournal(
  storage: PermanentSavedFlowDeletionRecoveryStorage,
  savedPlanId: string,
): PermanentSavedFlowDeletionRecoveryWriteResult {
  const normalizedSavedPlanId = normalizeBoundedText(savedPlanId, MAX_SAVED_PLAN_ID_LENGTH);
  if (!normalizedSavedPlanId) return { status: 'blocked', message: 'A valid saved plan identity is required.' };
  const current = readPermanentSavedFlowDeletionRecoveryJournal(storage);
  if (current.status === 'failed') return { status: 'failed', message: current.message };
  if (current.status !== 'valid' || !current.journal) {
    return { status: 'blocked', message: 'The prepared deletion recovery journal is unavailable.' };
  }
  if (current.journal.savedPlanId !== normalizedSavedPlanId) {
    return {
      status: 'blocked',
      journal: current.journal,
      message: 'The deletion recovery journal belongs to another saved plan.',
    };
  }
  if (current.journal.phase === 'deletion_confirmed') return { status: 'stored', journal: current.journal };
  const journal = createJournal({ ...current.journal, phase: 'deletion_confirmed' });
  if (!journal) return { status: 'blocked', message: 'The deletion recovery journal is invalid.' };
  return storeJournal(storage, journal, current.raw ?? null);
}

export function clearPermanentSavedFlowDeletionRecoveryJournal(
  storage: Pick<PermanentSavedFlowDeletionRecoveryStorage, 'getItem' | 'removeItem'>,
  savedPlanId: string,
): PermanentSavedFlowDeletionRecoveryClearResult {
  const normalizedSavedPlanId = normalizeBoundedText(savedPlanId, MAX_SAVED_PLAN_ID_LENGTH);
  if (!normalizedSavedPlanId) return { status: 'blocked', message: 'A valid saved plan identity is required.' };
  const current = readPermanentSavedFlowDeletionRecoveryJournal(storage);
  if (current.status === 'empty') return { status: 'not_found' };
  if (current.status === 'failed') return { status: 'failed', message: current.message };
  if (current.status !== 'valid' || !current.journal) {
    return { status: 'blocked', message: 'The deletion recovery journal could not be verified.' };
  }
  if (current.journal.savedPlanId !== normalizedSavedPlanId) {
    return { status: 'blocked', message: 'The deletion recovery journal belongs to another saved plan.' };
  }
  try {
    storage.removeItem(PERMANENT_SAVED_FLOW_DELETION_RECOVERY_JOURNAL_STORAGE_KEY);
    if (storage.getItem(PERMANENT_SAVED_FLOW_DELETION_RECOVERY_JOURNAL_STORAGE_KEY) !== null) {
      throw new Error('The deletion recovery journal removal could not be verified.');
    }
    return { status: 'cleared' };
  } catch (error) {
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'The deletion recovery journal could not be cleared.',
    };
  }
}
