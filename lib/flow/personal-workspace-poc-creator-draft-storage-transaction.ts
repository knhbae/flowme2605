import { PERSONAL_WORKSPACE_POC_STORAGE_PREFIX } from './personal-workspace-poc-contract';
import {
  PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY,
  isPersonalWorkspacePocCreatorDraftLibrary,
  type PersonalWorkspacePocCreatorDraftLibrary,
} from './personal-workspace-poc-creator-drafts';
import {
  loadPersonalWorkspacePocCreatorDraftLibrary,
  serializePersonalWorkspacePocCreatorDraftLibrary,
} from './personal-workspace-poc-creator-draft-storage';
import {
  PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,
  loadPersonalWorkspacePocAuthoringDraft,
  type PersonalWorkspacePocAuthoringDraft,
  type PersonalWorkspacePocStorage,
} from './personal-workspace-poc-storage';

export const PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY =
  `${PERSONAL_WORKSPACE_POC_STORAGE_PREFIX}creator-draft-storage-recovery:v1`;
export const PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_COMMIT_MARKER_KEY =
  `${PERSONAL_WORKSPACE_POC_STORAGE_PREFIX}creator-draft-storage-commit-marker:v1`;

const TARGET_KEYS = [
  PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,
  PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY,
] as const;

type TargetKey = typeof TARGET_KEYS[number];

type CreatorDraftStorageTarget = Readonly<{
  key: TargetKey;
  beforeRaw: string | null;
  afterRaw: string | null;
}>;

type CreatorDraftStorageRecoveryJournal = Readonly<{
  schemaVersion: 1;
  transactionId: string;
  targets: readonly CreatorDraftStorageTarget[];
  commitMarker: Readonly<{
    key: typeof PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_COMMIT_MARKER_KEY;
    value: string;
    previousValue: string | null;
  }>;
}>;

export type PersonalWorkspacePocCreatorDraftAtomicSaveResult =
  | Readonly<{
      ok: true;
      kind: 'saved' | 'no-op';
      serializedLibrary: string;
      serializedAuthoringDraft: string;
    }>
  | Readonly<{
      ok: false;
      error: string;
      rollback: 'not-needed' | 'complete' | 'recovery-required';
    }>;

export type PersonalWorkspacePocCreatorDraftStorageRecoveryResult = Readonly<{
  found: boolean;
  recovered: boolean;
  transactionId?: string;
  outcome?: 'committed' | 'rolled-back';
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return keys.length === sortedExpected.length
    && keys.every((key, index) => key === sortedExpected[index]);
}

function isRawValue(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isAllowedTargetKey(value: unknown): value is TargetKey {
  return typeof value === 'string'
    && (TARGET_KEYS as readonly string[]).includes(value)
    && value.startsWith(PERSONAL_WORKSPACE_POC_STORAGE_PREFIX);
}

function loadAuthoringDraftRaw(raw: string | null) {
  if (raw === null) return { kind: 'empty' as const };
  return loadPersonalWorkspacePocAuthoringDraft({
    getItem: (key: string) => key === PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY ? raw : null,
  });
}

function loadLibraryRaw(raw: string | null) {
  if (raw === null) return { kind: 'empty' as const };
  return loadPersonalWorkspacePocCreatorDraftLibrary({
    getItem: (key: string) => key === PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY ? raw : null,
  });
}

function isValidBeforeRaw(key: TargetKey, raw: string | null): boolean {
  const loaded = key === PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY
    ? loadLibraryRaw(raw)
    : loadAuthoringDraftRaw(raw);
  return loaded.kind === 'empty' || loaded.kind === 'ready';
}

function isValidAfterRaw(key: TargetKey, raw: string | null): boolean {
  if (raw === null) return false;
  const loaded = key === PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY
    ? loadLibraryRaw(raw)
    : loadAuthoringDraftRaw(raw);
  return loaded.kind === 'ready';
}

function parseRecoveryJournal(value: unknown): CreatorDraftStorageRecoveryJournal | null {
  if (!isRecord(value) || !hasExactKeys(
    value,
    ['schemaVersion', 'transactionId', 'targets', 'commitMarker'],
  )) return null;
  if (
    value.schemaVersion !== 1
    || typeof value.transactionId !== 'string'
    || !value.transactionId.trim()
    || !Array.isArray(value.targets)
    || value.targets.length !== TARGET_KEYS.length
  ) return null;

  const targets: CreatorDraftStorageTarget[] = [];
  for (let index = 0; index < value.targets.length; index += 1) {
    const candidate = value.targets[index];
    if (
      !isRecord(candidate)
      || !hasExactKeys(candidate, ['key', 'beforeRaw', 'afterRaw'])
      || candidate.key !== TARGET_KEYS[index]
      || !isAllowedTargetKey(candidate.key)
      || !isRawValue(candidate.beforeRaw)
      || !isRawValue(candidate.afterRaw)
      || !isValidBeforeRaw(candidate.key, candidate.beforeRaw)
      || !isValidAfterRaw(candidate.key, candidate.afterRaw)
    ) return null;
    targets.push(candidate as CreatorDraftStorageTarget);
  }

  if (!isRecord(value.commitMarker) || !hasExactKeys(
    value.commitMarker,
    ['key', 'value', 'previousValue'],
  )) return null;
  if (
    value.commitMarker.key !== PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_COMMIT_MARKER_KEY
    || value.commitMarker.value !== value.transactionId
    || !isRawValue(value.commitMarker.previousValue)
    || value.commitMarker.previousValue === value.commitMarker.value
  ) return null;

  const afterLibraryLoad = loadLibraryRaw(
    targets.find((target) => target.key === PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY)
      ?.afterRaw ?? null,
  );
  const afterDraftLoad = loadAuthoringDraftRaw(
    targets.find((target) => target.key === PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY)
      ?.afterRaw ?? null,
  );
  if (
    afterLibraryLoad.kind !== 'ready'
    || afterDraftLoad.kind !== 'ready'
    || !(
      bindingMatchesLibrary(afterLibraryLoad.library, afterDraftLoad.draft)
      || archiveAndUnbindMatch({
        beforeLibraryRaw: targets.find(
          (target) => target.key === PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY,
        )?.beforeRaw ?? null,
        afterLibrary: afterLibraryLoad.library,
        beforeDraftRaw: targets.find(
          (target) => target.key === PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,
        )?.beforeRaw ?? null,
        afterDraft: afterDraftLoad.draft,
      })
      || undoAndUnbindMatch({
        beforeLibraryRaw: targets.find(
          (target) => target.key === PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY,
        )?.beforeRaw ?? null,
        afterLibrary: afterLibraryLoad.library,
        beforeDraftRaw: targets.find(
          (target) => target.key === PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,
        )?.beforeRaw ?? null,
        afterDraft: afterDraftLoad.draft,
      })
    )
  ) return null;

  return {
    schemaVersion: 1,
    transactionId: value.transactionId,
    targets,
    commitMarker: {
      key: PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_COMMIT_MARKER_KEY,
      value: value.transactionId,
      previousValue: value.commitMarker.previousValue,
    },
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function readTargets(
  storage: Pick<Storage, 'getItem'>,
  targets: readonly CreatorDraftStorageTarget[],
): Readonly<Record<TargetKey, string | null>> {
  return {
    [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY]: storage.getItem(
      PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,
    ),
    [PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY]: storage.getItem(
      PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY,
    ),
  } satisfies Record<TargetKey, string | null>;
}

function allTargetsMatch(
  current: Readonly<Record<TargetKey, string | null>>,
  targets: readonly CreatorDraftStorageTarget[],
  side: 'beforeRaw' | 'afterRaw',
): boolean {
  return targets.every((target) => current[target.key] === target[side]);
}

function allTargetsRecoverable(
  current: Readonly<Record<TargetKey, string | null>>,
  targets: readonly CreatorDraftStorageTarget[],
): boolean {
  return targets.every((target) => {
    const raw = current[target.key];
    return raw === target.beforeRaw || raw === target.afterRaw;
  });
}

function writeExactRaw(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
  key: string,
  raw: string | null,
): void {
  if (raw === null) storage.removeItem(key);
  else storage.setItem(key, raw);
  if (storage.getItem(key) !== raw) throw new Error(`creator-draft-storage-verification-failed:${key}`);
}

function restoreMarkerBestEffort(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
  marker: CreatorDraftStorageRecoveryJournal['commitMarker'],
): void {
  try {
    if (storage.getItem(marker.key) !== marker.value) return;
    writeExactRaw(storage, marker.key, marker.previousValue);
  } catch {
    // The journal is already gone after commit; a stale PoC-only marker is harmless.
  }
}

function rollbackUncommitted(
  storage: PersonalWorkspacePocStorage,
  journal: CreatorDraftStorageRecoveryJournal,
  journalRaw: string,
): boolean {
  let current: Readonly<Record<TargetKey, string | null>>;
  let currentMarker: string | null;
  let currentJournal: string | null;
  try {
    current = readTargets(storage, journal.targets);
    currentMarker = storage.getItem(journal.commitMarker.key);
    currentJournal = storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY);
  } catch {
    return false;
  }
  if (
    currentMarker !== journal.commitMarker.previousValue
    || !allTargetsRecoverable(current, journal.targets)
    || (currentJournal !== null && currentJournal !== journalRaw)
  ) return false;

  try {
    for (const target of journal.targets) {
      if (current[target.key] === target.afterRaw && target.afterRaw !== target.beforeRaw) {
        if (storage.getItem(target.key) !== current[target.key]) return false;
        writeExactRaw(storage, target.key, target.beforeRaw);
      }
    }
    if (currentJournal === journalRaw) {
      storage.removeItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY);
      if (storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY) !== null) {
        return false;
      }
    }
    const restored = readTargets(storage, journal.targets);
    return allTargetsMatch(restored, journal.targets, 'beforeRaw')
      && storage.getItem(journal.commitMarker.key) === journal.commitMarker.previousValue;
  } catch {
    return false;
  }
}

function serializeAuthoringDraft(draft: PersonalWorkspacePocAuthoringDraft): string {
  const raw = JSON.stringify(draft);
  if (loadAuthoringDraftRaw(raw).kind !== 'ready') {
    throw new TypeError('invalid-creator-bound-authoring-draft');
  }
  return raw;
}

function preserveExactRawWhenUnchanged(
  expectedRaw: string | null,
  serializedNext: string,
  kind: 'library' | 'draft',
): string {
  if (expectedRaw === null) return serializedNext;
  if (kind === 'library') {
    const loaded = loadLibraryRaw(expectedRaw);
    return loaded.kind === 'ready' && JSON.stringify(loaded.library) === serializedNext
      ? expectedRaw
      : serializedNext;
  }
  const loaded = loadAuthoringDraftRaw(expectedRaw);
  return loaded.kind === 'ready' && JSON.stringify(loaded.draft) === serializedNext
    ? expectedRaw
    : serializedNext;
}

function bindingMatchesLibrary(
  library: PersonalWorkspacePocCreatorDraftLibrary,
  draft: PersonalWorkspacePocAuthoringDraft,
): boolean {
  const binding = draft.creatorBinding;
  if (!binding) return false;
  const record = library.records[binding.draftId];
  return record !== undefined
    && record.status === 'active'
    && record.rawText === draft.rawText
    && record.templateId === draft.templateId;
}

function archiveAndUnbindMatch(input: Readonly<{
  beforeLibraryRaw: string | null;
  afterLibrary: PersonalWorkspacePocCreatorDraftLibrary;
  beforeDraftRaw: string | null;
  afterDraft: PersonalWorkspacePocAuthoringDraft;
}>): boolean {
  if (input.afterDraft.creatorBinding) return false;
  const beforeLibraryLoad = loadLibraryRaw(input.beforeLibraryRaw);
  const beforeDraftLoad = loadAuthoringDraftRaw(input.beforeDraftRaw);
  if (beforeLibraryLoad.kind !== 'ready' || beforeDraftLoad.kind !== 'ready') return false;
  const beforeDraft = beforeDraftLoad.draft;
  const binding = beforeDraft.creatorBinding;
  if (!binding) return false;
  const beforeLibrary = beforeLibraryLoad.library;
  const beforeRecord = beforeLibrary.records[binding.draftId];
  const afterRecord = input.afterLibrary.records[binding.draftId];
  if (!beforeRecord || !afterRecord) return false;
  if (
    beforeRecord.status !== 'active'
    || afterRecord.status !== 'archived'
    || afterRecord.recordRevision !== beforeRecord.recordRevision + 1
    || afterRecord.updatedAt !== afterRecord.archivedAt
    || input.afterLibrary.revision !== beforeLibrary.revision + 1
    || input.afterLibrary.updatedAt !== afterRecord.updatedAt
    || beforeDraft.rawText !== beforeRecord.rawText
    || beforeDraft.templateId !== beforeRecord.templateId
    || input.afterDraft.rawText !== beforeDraft.rawText
    || input.afterDraft.templateId !== beforeDraft.templateId
  ) return false;

  const stableRecordFields = (record: typeof beforeRecord) => ({
    draftId: record.draftId,
    owner: record.owner,
    title: record.title,
    rawText: record.rawText,
    templateId: record.templateId,
    sourceFingerprint: record.sourceFingerprint,
    createdAt: record.createdAt,
    clonedFrom: record.clonedFrom,
  });
  if (JSON.stringify(stableRecordFields(beforeRecord)) !== JSON.stringify(stableRecordFields(afterRecord))) {
    return false;
  }
  const beforeOtherRecords = Object.fromEntries(
    Object.entries(beforeLibrary.records).filter(([draftId]) => draftId !== binding.draftId),
  );
  const afterOtherRecords = Object.fromEntries(
    Object.entries(input.afterLibrary.records).filter(([draftId]) => draftId !== binding.draftId),
  );
  if (JSON.stringify(beforeOtherRecords) !== JSON.stringify(afterOtherRecords)) return false;
  return JSON.stringify(input.afterLibrary.undo?.snapshot) === JSON.stringify({
    revision: beforeLibrary.revision,
    records: beforeLibrary.records,
    updatedAt: beforeLibrary.updatedAt,
  });
}

function undoAndUnbindMatch(input: Readonly<{
  beforeLibraryRaw: string | null;
  afterLibrary: PersonalWorkspacePocCreatorDraftLibrary;
  beforeDraftRaw: string | null;
  afterDraft: PersonalWorkspacePocAuthoringDraft;
}>): boolean {
  if (input.afterDraft.creatorBinding || input.afterLibrary.undo !== undefined) return false;
  const beforeLibraryLoad = loadLibraryRaw(input.beforeLibraryRaw);
  const beforeDraftLoad = loadAuthoringDraftRaw(input.beforeDraftRaw);
  if (beforeLibraryLoad.kind !== 'ready' || beforeDraftLoad.kind !== 'ready') return false;
  const beforeLibrary = beforeLibraryLoad.library;
  const beforeDraft = beforeDraftLoad.draft;
  const binding = beforeDraft.creatorBinding;
  const snapshot = beforeLibrary.undo?.snapshot;
  if (!binding || !snapshot) return false;
  const beforeRecord = beforeLibrary.records[binding.draftId];
  if (
    !beforeRecord
    || beforeRecord.status !== 'active'
    || beforeRecord.rawText !== beforeDraft.rawText
    || beforeRecord.templateId !== beforeDraft.templateId
    || input.afterDraft.rawText !== beforeDraft.rawText
    || input.afterDraft.templateId !== beforeDraft.templateId
    || input.afterLibrary.revision !== beforeLibrary.revision + 1
    || input.afterLibrary.updatedAt < beforeLibrary.updatedAt
    || JSON.stringify(input.afterLibrary.records) !== JSON.stringify(snapshot.records)
  ) return false;
  const afterBoundRecord = input.afterLibrary.records[binding.draftId];
  return afterBoundRecord === undefined
    || afterBoundRecord.status !== 'active'
    || afterBoundRecord.rawText !== beforeDraft.rawText
    || afterBoundRecord.templateId !== beforeDraft.templateId;
}

/**
 * Atomically persists a durable CreatorDraft and its creator-bound working copy.
 * Both exact expected byte strings are compared before the first mutation.
 */
export function commitPersonalWorkspacePocCreatorDraftStorage(input: Readonly<{
  storage: PersonalWorkspacePocStorage;
  transactionId: string;
  expectedLibraryRawValue: string | null;
  library: PersonalWorkspacePocCreatorDraftLibrary;
  expectedAuthoringDraftRawValue: string | null;
  authoringDraft: PersonalWorkspacePocAuthoringDraft;
}>): PersonalWorkspacePocCreatorDraftAtomicSaveResult {
  let outstandingRecovery: string | null;
  try {
    outstandingRecovery = input.storage.getItem(
      PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY,
    );
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error, 'creator-draft-storage-read-failed'),
      rollback: 'not-needed',
    };
  }
  if (outstandingRecovery !== null) {
    return {
      ok: false,
      error: 'personal-workspace-poc-creator-draft-recovery-required',
      rollback: 'recovery-required',
    };
  }
  if (!input.transactionId.trim()) {
    return { ok: false, error: 'creator-draft-transaction-id-required', rollback: 'not-needed' };
  }
  if (
    (input.expectedLibraryRawValue !== null
      && loadLibraryRaw(input.expectedLibraryRawValue).kind !== 'ready')
    || (input.expectedAuthoringDraftRawValue !== null
      && loadAuthoringDraftRaw(input.expectedAuthoringDraftRawValue).kind !== 'ready')
    || !isPersonalWorkspacePocCreatorDraftLibrary(input.library)
    || !(
      bindingMatchesLibrary(input.library, input.authoringDraft)
      || archiveAndUnbindMatch({
        beforeLibraryRaw: input.expectedLibraryRawValue,
        afterLibrary: input.library,
        beforeDraftRaw: input.expectedAuthoringDraftRawValue,
        afterDraft: input.authoringDraft,
      })
      || undoAndUnbindMatch({
        beforeLibraryRaw: input.expectedLibraryRawValue,
        afterLibrary: input.library,
        beforeDraftRaw: input.expectedAuthoringDraftRawValue,
        afterDraft: input.authoringDraft,
      })
    )
  ) {
    return { ok: false, error: 'invalid-creator-draft-transaction', rollback: 'not-needed' };
  }

  let serializedLibrary: string;
  let serializedAuthoringDraft: string;
  try {
    serializedLibrary = preserveExactRawWhenUnchanged(
      input.expectedLibraryRawValue,
      serializePersonalWorkspacePocCreatorDraftLibrary(input.library),
      'library',
    );
    serializedAuthoringDraft = preserveExactRawWhenUnchanged(
      input.expectedAuthoringDraftRawValue,
      serializeAuthoringDraft(input.authoringDraft),
      'draft',
    );
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error, 'invalid-creator-draft-transaction'),
      rollback: 'not-needed',
    };
  }

  let currentLibrary: string | null;
  let currentAuthoringDraft: string | null;
  let previousMarker: string | null;
  try {
    currentLibrary = input.storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY);
    currentAuthoringDraft = input.storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY);
    previousMarker = input.storage.getItem(
      PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_COMMIT_MARKER_KEY,
    );
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error, 'creator-draft-storage-read-failed'),
      rollback: 'not-needed',
    };
  }
  if (
    currentLibrary !== input.expectedLibraryRawValue
    || currentAuthoringDraft !== input.expectedAuthoringDraftRawValue
  ) {
    return { ok: false, error: 'stale-creator-draft-storage', rollback: 'not-needed' };
  }
  if (
    currentLibrary === serializedLibrary
    && currentAuthoringDraft === serializedAuthoringDraft
  ) {
    return {
      ok: true,
      kind: 'no-op',
      serializedLibrary,
      serializedAuthoringDraft,
    };
  }
  if (previousMarker === input.transactionId) {
    return { ok: false, error: 'creator-draft-transaction-id-reused', rollback: 'not-needed' };
  }

  const targets: readonly CreatorDraftStorageTarget[] = [
    {
      key: PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,
      beforeRaw: currentAuthoringDraft,
      afterRaw: serializedAuthoringDraft,
    },
    {
      key: PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY,
      beforeRaw: currentLibrary,
      afterRaw: serializedLibrary,
    },
  ];
  const journal: CreatorDraftStorageRecoveryJournal = {
    schemaVersion: 1,
    transactionId: input.transactionId,
    targets,
    commitMarker: {
      key: PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_COMMIT_MARKER_KEY,
      value: input.transactionId,
      previousValue: previousMarker,
    },
  };
  const journalRaw = JSON.stringify(journal);

  try {
    if (
      input.storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY) !== null
    ) throw new Error('personal-workspace-poc-creator-draft-recovery-required');
    if (
      input.storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_COMMIT_MARKER_KEY)
        !== previousMarker
    ) throw new Error('stale-creator-draft-storage');
    input.storage.setItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY, journalRaw);
    if (input.storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY) !== journalRaw) {
      throw new Error('creator-draft-recovery-journal-verification-failed');
    }

    if (input.storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY) !== currentLibrary) {
      throw new Error('stale-creator-draft-storage');
    }
    if (currentLibrary !== serializedLibrary) {
      writeExactRaw(
        input.storage,
        PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY,
        serializedLibrary,
      );
    }

    if (input.storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY) !== currentAuthoringDraft) {
      throw new Error('stale-creator-draft-storage');
    }
    if (currentAuthoringDraft !== serializedAuthoringDraft) {
      writeExactRaw(
        input.storage,
        PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,
        serializedAuthoringDraft,
      );
    }

    const readyToCommit = readTargets(input.storage, targets);
    if (!allTargetsMatch(readyToCommit, targets, 'afterRaw')) {
      throw new Error('stale-creator-draft-storage');
    }
    if (
      input.storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_COMMIT_MARKER_KEY)
        !== previousMarker
    ) throw new Error('stale-creator-draft-storage');

    input.storage.setItem(
      PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_COMMIT_MARKER_KEY,
      input.transactionId,
    );
    if (
      input.storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_COMMIT_MARKER_KEY)
        !== input.transactionId
    ) throw new Error('creator-draft-commit-marker-verification-failed');

    if (
      input.storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY)
        !== journalRaw
    ) throw new Error('stale-creator-draft-recovery-journal');
    input.storage.removeItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY);
    if (input.storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY) !== null) {
      throw new Error('creator-draft-recovery-journal-cleanup-failed');
    }
    restoreMarkerBestEffort(input.storage, journal.commitMarker);
    return { ok: true, kind: 'saved', serializedLibrary, serializedAuthoringDraft };
  } catch (error) {
    let marker: string | null = null;
    try {
      marker = input.storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_COMMIT_MARKER_KEY);
    } catch {
      // Fail closed below.
    }
    const rollback = marker === input.transactionId
      ? 'recovery-required' as const
      : rollbackUncommitted(input.storage, journal, journalRaw)
        ? 'complete' as const
        : 'recovery-required' as const;
    return {
      ok: false,
      error: errorMessage(error, 'creator-draft-storage-commit-failed'),
      rollback,
    };
  }
}

/**
 * Recovers only a strict two-target PoC journal. All current target bytes are
 * inspected before the first write. A third value leaves every byte untouched.
 */
export function recoverPersonalWorkspacePocCreatorDraftStorage(
  storage: PersonalWorkspacePocStorage,
): PersonalWorkspacePocCreatorDraftStorageRecoveryResult {
  let raw: string | null;
  try {
    raw = storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY);
  } catch {
    return { found: true, recovered: false };
  }
  if (raw === null) return { found: false, recovered: true };

  let journal: CreatorDraftStorageRecoveryJournal | null = null;
  try {
    journal = parseRecoveryJournal(JSON.parse(raw) as unknown);
  } catch {
    return { found: true, recovered: false };
  }
  if (!journal) return { found: true, recovered: false };

  let current: Readonly<Record<TargetKey, string | null>>;
  let marker: string | null;
  try {
    current = readTargets(storage, journal.targets);
    marker = storage.getItem(journal.commitMarker.key);
  } catch {
    return { found: true, recovered: false, transactionId: journal.transactionId };
  }

  if (marker === journal.commitMarker.value) {
    if (!allTargetsMatch(current, journal.targets, 'afterRaw')) {
      return { found: true, recovered: false, transactionId: journal.transactionId };
    }
    try {
      if (storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY) !== raw) {
        return { found: true, recovered: false, transactionId: journal.transactionId };
      }
      storage.removeItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY);
      if (storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY) !== null) {
        return { found: true, recovered: false, transactionId: journal.transactionId };
      }
      restoreMarkerBestEffort(storage, journal.commitMarker);
      return {
        found: true,
        recovered: true,
        transactionId: journal.transactionId,
        outcome: 'committed',
      };
    } catch {
      return { found: true, recovered: false, transactionId: journal.transactionId };
    }
  }

  if (
    marker !== journal.commitMarker.previousValue
    || !allTargetsRecoverable(current, journal.targets)
  ) {
    return { found: true, recovered: false, transactionId: journal.transactionId };
  }

  try {
    for (const target of journal.targets) {
      if (current[target.key] === target.afterRaw && target.afterRaw !== target.beforeRaw) {
        if (storage.getItem(target.key) !== current[target.key]) {
          return { found: true, recovered: false, transactionId: journal.transactionId };
        }
        writeExactRaw(storage, target.key, target.beforeRaw);
      }
    }
    const restored = readTargets(storage, journal.targets);
    if (!allTargetsMatch(restored, journal.targets, 'beforeRaw')) {
      return { found: true, recovered: false, transactionId: journal.transactionId };
    }
    if (storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY) !== raw) {
      return { found: true, recovered: false, transactionId: journal.transactionId };
    }
    storage.removeItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY);
    if (storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY) !== null) {
      return { found: true, recovered: false, transactionId: journal.transactionId };
    }
    return {
      found: true,
      recovered: true,
      transactionId: journal.transactionId,
      outcome: 'rolled-back',
    };
  } catch {
    return { found: true, recovered: false, transactionId: journal.transactionId };
  }
}
