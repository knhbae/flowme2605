export const FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_SCHEMA_VERSION = 1 as const;
export const FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY =
  'flow:export-receipt-cleanup-journal:v1';

const MAX_SAVED_PLAN_ID_LENGTH = 512;
const MAX_FLOW_TITLE_LENGTH = 500;

export type FlowExportReceiptCleanupJournalPhase =
  | 'prepared'
  | 'cleanup_required';

export type FlowExportReceiptCleanupJournal = Readonly<{
  schemaVersion: typeof FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_SCHEMA_VERSION;
  phase: FlowExportReceiptCleanupJournalPhase;
  savedPlanId: string;
  flowTitle: string;
}>;

export type FlowExportReceiptCleanupJournalStorage = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>;

export type FlowExportReceiptCleanupJournalReadResult = Readonly<{
  status: 'empty' | 'valid' | 'malformed' | 'unsupported' | 'failed';
  journal?: FlowExportReceiptCleanupJournal;
  raw?: string | null;
  message?: string;
}>;

export type FlowExportReceiptCleanupJournalWriteResult = Readonly<{
  status: 'stored' | 'blocked' | 'failed';
  journal?: FlowExportReceiptCleanupJournal;
  message?: string;
  rollbackComplete?: boolean;
}>;

export type FlowExportReceiptCleanupJournalClearResult = Readonly<{
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
  ) {
    return undefined;
  }
  return value;
}

export function normalizeFlowExportReceiptCleanupJournal(
  value: unknown,
): FlowExportReceiptCleanupJournal | undefined {
  try {
    if (
      !isPlainDataRecord(value)
      || !hasExactKeys(value, ['schemaVersion', 'phase', 'savedPlanId', 'flowTitle'])
      || value.schemaVersion !== FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_SCHEMA_VERSION
      || (value.phase !== 'prepared' && value.phase !== 'cleanup_required')
    ) {
      return undefined;
    }
    const savedPlanId = normalizeBoundedText(value.savedPlanId, MAX_SAVED_PLAN_ID_LENGTH);
    const flowTitle = normalizeBoundedText(value.flowTitle, MAX_FLOW_TITLE_LENGTH);
    if (!savedPlanId || !flowTitle) return undefined;
    return Object.freeze({
      schemaVersion: FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_SCHEMA_VERSION,
      phase: value.phase,
      savedPlanId,
      flowTitle,
    });
  } catch {
    return undefined;
  }
}

function createJournal(input: Readonly<{
  phase: FlowExportReceiptCleanupJournalPhase;
  savedPlanId: string;
  flowTitle: string;
}>): FlowExportReceiptCleanupJournal | undefined {
  return normalizeFlowExportReceiptCleanupJournal({
    schemaVersion: FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_SCHEMA_VERSION,
    ...input,
  });
}

export function readFlowExportReceiptCleanupJournal(
  storage: Pick<FlowExportReceiptCleanupJournalStorage, 'getItem'>,
): FlowExportReceiptCleanupJournalReadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY);
  } catch (error) {
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'The cleanup journal could not be read.',
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
    && parsed.schemaVersion !== FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_SCHEMA_VERSION
  ) {
    return { status: 'unsupported', raw };
  }
  const journal = normalizeFlowExportReceiptCleanupJournal(parsed);
  return journal
    ? { status: 'valid', journal, raw }
    : { status: 'malformed', raw };
}

function restoreRawJournal(
  storage: FlowExportReceiptCleanupJournalStorage,
  raw: string | null,
): boolean {
  try {
    if (raw === null) storage.removeItem(FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY);
    else storage.setItem(FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY, raw);
    return storage.getItem(FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY) === raw;
  } catch {
    return false;
  }
}

function storeJournal(
  storage: FlowExportReceiptCleanupJournalStorage,
  journal: FlowExportReceiptCleanupJournal,
  rawBefore: string | null,
): FlowExportReceiptCleanupJournalWriteResult {
  const raw = JSON.stringify(journal);
  try {
    storage.setItem(FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY, raw);
    if (storage.getItem(FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY) !== raw) {
      throw new Error('The cleanup journal write could not be verified.');
    }
    return { status: 'stored', journal };
  } catch (error) {
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'The cleanup journal could not be stored.',
      rollbackComplete: restoreRawJournal(storage, rawBefore),
    };
  }
}

export function prepareFlowExportReceiptCleanupJournal(
  storage: FlowExportReceiptCleanupJournalStorage,
  input: Readonly<{ savedPlanId: string; flowTitle: string }>,
): FlowExportReceiptCleanupJournalWriteResult {
  const journal = createJournal({ phase: 'prepared', ...input });
  if (!journal) {
    return { status: 'blocked', message: 'A valid saved plan identity is required.' };
  }
  const current = readFlowExportReceiptCleanupJournal(storage);
  if (current.status === 'failed') {
    return { status: 'failed', message: current.message };
  }
  if (current.status === 'malformed' || current.status === 'unsupported') {
    return {
      status: 'blocked',
      message: 'An existing cleanup journal could not be verified.',
    };
  }
  if (current.status === 'valid') {
    if (
      current.journal?.phase === 'prepared'
      && current.journal.savedPlanId === journal.savedPlanId
    ) {
      return { status: 'stored', journal: current.journal };
    }
    return {
      status: 'blocked',
      journal: current.journal,
      message: 'Another receipt cleanup must be resolved first.',
    };
  }
  return storeJournal(storage, journal, current.raw ?? null);
}

export function markFlowExportReceiptCleanupRequired(
  storage: FlowExportReceiptCleanupJournalStorage,
  savedPlanId: string,
): FlowExportReceiptCleanupJournalWriteResult {
  const normalizedSavedPlanId = normalizeBoundedText(savedPlanId, MAX_SAVED_PLAN_ID_LENGTH);
  if (!normalizedSavedPlanId) {
    return { status: 'blocked', message: 'A valid saved plan identity is required.' };
  }
  const current = readFlowExportReceiptCleanupJournal(storage);
  if (current.status === 'failed') return { status: 'failed', message: current.message };
  if (current.status !== 'valid' || !current.journal) {
    return { status: 'blocked', message: 'The prepared cleanup journal is unavailable.' };
  }
  if (current.journal.savedPlanId !== normalizedSavedPlanId) {
    return {
      status: 'blocked',
      journal: current.journal,
      message: 'The prepared cleanup journal belongs to another saved plan.',
    };
  }
  if (current.journal.phase === 'cleanup_required') {
    return { status: 'stored', journal: current.journal };
  }
  const journal = createJournal({ ...current.journal, phase: 'cleanup_required' });
  if (!journal) return { status: 'blocked', message: 'The cleanup journal is invalid.' };
  return storeJournal(storage, journal, current.raw ?? null);
}

export function clearFlowExportReceiptCleanupJournal(
  storage: Pick<FlowExportReceiptCleanupJournalStorage, 'getItem' | 'removeItem'>,
  savedPlanId: string,
): FlowExportReceiptCleanupJournalClearResult {
  const normalizedSavedPlanId = normalizeBoundedText(savedPlanId, MAX_SAVED_PLAN_ID_LENGTH);
  if (!normalizedSavedPlanId) {
    return { status: 'blocked', message: 'A valid saved plan identity is required.' };
  }
  const current = readFlowExportReceiptCleanupJournal(storage);
  if (current.status === 'empty') return { status: 'not_found' };
  if (current.status === 'failed') return { status: 'failed', message: current.message };
  if (current.status !== 'valid' || !current.journal) {
    return { status: 'blocked', message: 'The cleanup journal could not be verified.' };
  }
  if (current.journal.savedPlanId !== normalizedSavedPlanId) {
    return { status: 'blocked', message: 'The cleanup journal belongs to another saved plan.' };
  }
  try {
    storage.removeItem(FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY);
    if (storage.getItem(FLOW_EXPORT_RECEIPT_CLEANUP_JOURNAL_STORAGE_KEY) !== null) {
      throw new Error('The cleanup journal removal could not be verified.');
    }
    return { status: 'cleared' };
  } catch (error) {
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'The cleanup journal could not be cleared.',
    };
  }
}
