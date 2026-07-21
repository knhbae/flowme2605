export const FLOWME_LOCAL_BACKUP_FORMAT = 'flowme-local-backup';
export const FLOWME_LOCAL_BACKUP_SCHEMA_VERSION = 1;
export const FLOWME_LOCAL_BACKUP_MAX_BYTES = 8 * 1024 * 1024;
export const FLOWME_LOCAL_BACKUP_MAX_ENTRIES = 1000;

const EXACT_EXECUTION_KEYS = new Set([
  'flow_builder_mvp_bundles_v11',
  'flow:meta:last-visit',
  'flow:my-flow:step-item-checks',
  'flow:my-flow:item-drafts',
  'flow:my-flow:date-overrides',
  'flow:my-flow:occurrence-execution',
  'flow:my-flow:hidden-flows',
  'flow:my-flow:lifecycle:v1',
  'flow:url-first:supply-candidates',
]);

const EXECUTION_KEY_PREFIXES = [
  'flow_builder_mvp_checks_',
  'flow_builder_mvp_reactions_',
  'flow_builder_mvp_comparison_',
  'flow_builder_mvp_workbench_',
  'flow_builder_mvp_item_state_',
  'flow:saved:',
  'flow:map:saved:',
  'flow:map:persistence:',
  'flow:my-flow:completion-feedback:',
  'flow:my-flow:execution-notes:',
  'flow:my-flow:structural-overlay:',
  'flow:run-registry:',
  'flow:completion-detected-at:',
];

const FLOW_ANCHOR_KEY_PATTERN = /^flow:[^:]+:anchorDate$/;

export type FlowMeStorageLike = {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type FlowMeLocalBackupSummary = {
  entryCount: number;
  savedFlowRecordCount: number;
  savedMapCount: number;
  completedRunCount: number;
  requestRecordCount: number;
};

export type FlowMeLocalBackup = {
  format: typeof FLOWME_LOCAL_BACKUP_FORMAT;
  schemaVersion: typeof FLOWME_LOCAL_BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  entries: Record<string, string>;
  summary: FlowMeLocalBackupSummary;
};

export type FlowMeLocalBackupErrorCode =
  | 'invalid_json'
  | 'invalid_format'
  | 'unsupported_version'
  | 'invalid_entry'
  | 'too_many_entries'
  | 'too_large'
  | 'restore_failed';

export class FlowMeLocalBackupError extends Error {
  constructor(
    public readonly code: FlowMeLocalBackupErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'FlowMeLocalBackupError';
  }
}

export function isFlowMeExecutionStorageKey(key: string): boolean {
  return (
    EXACT_EXECUTION_KEYS.has(key) ||
    FLOW_ANCHOR_KEY_PATTERN.test(key) ||
    EXECUTION_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}

function collectExecutionEntries(storage: FlowMeStorageLike): Record<string, string> {
  const entries: Array<[string, string]> = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !isFlowMeExecutionStorageKey(key)) continue;
    const value = storage.getItem(key);
    if (value !== null) entries.push([key, value]);
  }
  return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)));
}

function countCompletedRuns(entries: Record<string, string>): number {
  return Object.entries(entries).reduce((count, [key, value]) => {
    if (!key.startsWith('flow:run-registry:')) return count;
    try {
      const parsed = JSON.parse(value) as { runs?: Array<{ status?: unknown }> };
      if (!Array.isArray(parsed.runs)) return count;
      return count + parsed.runs.filter((run) => run?.status === 'completed').length;
    } catch {
      return count;
    }
  }, 0);
}

function countCandidateRequests(entries: Record<string, string>): number {
  try {
    const parsed = JSON.parse(entries['flow:url-first:supply-candidates'] ?? '[]');
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export function summarizeFlowMeLocalBackupEntries(entries: Record<string, string>): FlowMeLocalBackupSummary {
  const keys = Object.keys(entries);
  return {
    entryCount: keys.length,
    savedFlowRecordCount: keys.filter((key) => key.startsWith('flow:saved:')).length,
    savedMapCount: keys.filter((key) => key.startsWith('flow:map:saved:')).length,
    completedRunCount: countCompletedRuns(entries),
    requestRecordCount: countCandidateRequests(entries),
  };
}

export function buildFlowMeLocalBackup(
  storage: FlowMeStorageLike,
  exportedAt = new Date().toISOString(),
): FlowMeLocalBackup {
  const entries = collectExecutionEntries(storage);
  return {
    format: FLOWME_LOCAL_BACKUP_FORMAT,
    schemaVersion: FLOWME_LOCAL_BACKUP_SCHEMA_VERSION,
    exportedAt,
    entries,
    summary: summarizeFlowMeLocalBackupEntries(entries),
  };
}

export function serializeFlowMeLocalBackup(backup: FlowMeLocalBackup): string {
  return JSON.stringify(backup, null, 2);
}

function getUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function parseFlowMeLocalBackup(serialized: string): FlowMeLocalBackup {
  if (getUtf8ByteLength(serialized) > FLOWME_LOCAL_BACKUP_MAX_BYTES) {
    throw new FlowMeLocalBackupError('too_large', 'Backup exceeds the supported size.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new FlowMeLocalBackupError('invalid_json', 'Backup is not valid JSON.');
  }

  if (!isRecord(parsed) || parsed.format !== FLOWME_LOCAL_BACKUP_FORMAT) {
    throw new FlowMeLocalBackupError('invalid_format', 'Backup format is not supported.');
  }
  if (parsed.schemaVersion !== FLOWME_LOCAL_BACKUP_SCHEMA_VERSION) {
    throw new FlowMeLocalBackupError('unsupported_version', 'Backup version is not supported.');
  }
  if (typeof parsed.exportedAt !== 'string' || !Number.isFinite(Date.parse(parsed.exportedAt))) {
    throw new FlowMeLocalBackupError('invalid_format', 'Backup date is invalid.');
  }
  if (!isRecord(parsed.entries)) {
    throw new FlowMeLocalBackupError('invalid_format', 'Backup entries are missing.');
  }

  const rawEntries = Object.entries(parsed.entries);
  if (rawEntries.length > FLOWME_LOCAL_BACKUP_MAX_ENTRIES) {
    throw new FlowMeLocalBackupError('too_many_entries', 'Backup has too many entries.');
  }
  const entries: Record<string, string> = {};
  for (const [key, value] of rawEntries) {
    if (!isFlowMeExecutionStorageKey(key) || typeof value !== 'string') {
      throw new FlowMeLocalBackupError('invalid_entry', `Unsupported backup entry: ${key}`);
    }
    entries[key] = value;
  }

  return {
    format: FLOWME_LOCAL_BACKUP_FORMAT,
    schemaVersion: FLOWME_LOCAL_BACKUP_SCHEMA_VERSION,
    exportedAt: parsed.exportedAt,
    entries,
    summary: summarizeFlowMeLocalBackupEntries(entries),
  };
}

function removeCurrentExecutionEntries(storage: FlowMeStorageLike): void {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && isFlowMeExecutionStorageKey(key)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
}

function writeEntries(storage: FlowMeStorageLike, entries: Record<string, string>): void {
  Object.entries(entries).forEach(([key, value]) => storage.setItem(key, value));
}

export function restoreFlowMeLocalBackup(storage: FlowMeStorageLike, backup: FlowMeLocalBackup): void {
  const currentEntries = collectExecutionEntries(storage);
  try {
    removeCurrentExecutionEntries(storage);
    writeEntries(storage, backup.entries);
  } catch (error) {
    try {
      removeCurrentExecutionEntries(storage);
      writeEntries(storage, currentEntries);
    } catch {
      // Keep the original failure as the actionable error; rollback is best effort.
    }
    throw new FlowMeLocalBackupError(
      'restore_failed',
      error instanceof Error ? error.message : 'Backup restore failed.',
    );
  }
}

export function getFlowMeLocalBackupFilename(exportedAt: string): string {
  const date = Number.isFinite(Date.parse(exportedAt)) ? exportedAt.slice(0, 10) : 'backup';
  return `flowme-backup-${date}.json`;
}
