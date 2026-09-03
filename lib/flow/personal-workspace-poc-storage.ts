import {
  PERSONAL_WORKSPACE_POC_STATE_KEY,
  PERSONAL_WORKSPACE_POC_STORAGE_PREFIX,
  type PersonalWorkspacePocState,
} from './personal-workspace-poc-contract';
import {
  getPersonalWorkspacePocAuthoringTemplate,
  type PersonalWorkspacePocAuthoringTemplateId,
} from './personal-workspace-poc-authoring';
import { isPersonalWorkspacePocState } from './personal-workspace-poc-state';

export type PersonalWorkspacePocStorage = Pick<
  Storage,
  'length' | 'key' | 'getItem' | 'setItem' | 'removeItem'
>;

export type PersonalWorkspacePocLoadResult =
  | { kind: 'empty' }
  | { kind: 'ready'; state: PersonalWorkspacePocState }
  | { kind: 'corrupt'; reason: string };

export type PersonalWorkspacePocSaveResult =
  | { ok: true; serialized: string }
  | { ok: false; error: string };

export const PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY =
  `${PERSONAL_WORKSPACE_POC_STORAGE_PREFIX}authoring-draft`;

export type PersonalWorkspacePocAuthoringDraft = Readonly<{
  version: 1;
  rawText: string;
  templateId?: PersonalWorkspacePocAuthoringTemplateId;
}>;

export type PersonalWorkspacePocAuthoringDraftLoadResult =
  | { kind: 'empty' }
  | { kind: 'ready'; draft: PersonalWorkspacePocAuthoringDraft }
  | { kind: 'corrupt'; reason: string };

function isAllowedPocKey(key: string): boolean {
  return key.startsWith(PERSONAL_WORKSPACE_POC_STORAGE_PREFIX);
}

function assertAllowedPocKey(key: string): void {
  if (!isAllowedPocKey(key)) {
    throw new Error(`PoC storage boundary violation: ${key}`);
  }
}

function isPersonalWorkspacePocAuthoringDraft(
  value: unknown,
): value is PersonalWorkspacePocAuthoringDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.version === 1
    && typeof candidate.rawText === 'string'
    && (
      candidate.templateId === undefined
      || (
        typeof candidate.templateId === 'string'
        && getPersonalWorkspacePocAuthoringTemplate(candidate.templateId) !== null
      )
    );
}

export function loadPersonalWorkspacePocAuthoringDraft(
  storage: Pick<Storage, 'getItem'>,
): PersonalWorkspacePocAuthoringDraftLoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY);
  } catch {
    return { kind: 'corrupt', reason: 'storage-read-failed' };
  }
  if (raw === null) return { kind: 'empty' };
  try {
    const value = JSON.parse(raw) as unknown;
    return isPersonalWorkspacePocAuthoringDraft(value)
      ? { kind: 'ready', draft: value }
      : { kind: 'corrupt', reason: 'invalid-authoring-draft' };
  } catch {
    return { kind: 'corrupt', reason: 'invalid-json' };
  }
}

export function savePersonalWorkspacePocAuthoringDraft(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
  draft: PersonalWorkspacePocAuthoringDraft,
): PersonalWorkspacePocSaveResult {
  if (!isPersonalWorkspacePocAuthoringDraft(draft)) {
    return { ok: false, error: 'invalid-authoring-draft' };
  }
  const key = PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY;
  assertAllowedPocKey(key);
  const serialized = JSON.stringify(draft);
  let previous: string | null = null;
  try {
    previous = storage.getItem(key);
    storage.setItem(key, serialized);
    if (storage.getItem(key) !== serialized) throw new Error('storage-verification-failed');
    return { ok: true, serialized };
  } catch (error) {
    try {
      if (previous === null) storage.removeItem(key);
      else storage.setItem(key, previous);
    } catch {
      // The caller keeps the in-memory draft and reports the failed persistence.
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'storage-write-failed',
    };
  }
}

export function clearPersonalWorkspacePocAuthoringDraft(
  storage: Pick<Storage, 'removeItem'>,
): { ok: true } | { ok: false; error: string } {
  try {
    assertAllowedPocKey(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY);
    storage.removeItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'storage-remove-failed',
    };
  }
}

export function loadPersonalWorkspacePocState(
  storage: Pick<Storage, 'getItem'>,
): PersonalWorkspacePocLoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY);
  } catch {
    return { kind: 'corrupt', reason: 'storage-read-failed' };
  }
  if (raw === null) return { kind: 'empty' };
  try {
    const value = JSON.parse(raw) as unknown;
    return isPersonalWorkspacePocState(value)
      ? { kind: 'ready', state: value }
      : { kind: 'corrupt', reason: 'invalid-state-payload' };
  } catch {
    return { kind: 'corrupt', reason: 'invalid-json' };
  }
}

export function savePersonalWorkspacePocState(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
  state: PersonalWorkspacePocState,
): PersonalWorkspacePocSaveResult {
  if (!isPersonalWorkspacePocState(state)) {
    return { ok: false, error: 'invalid-state' };
  }

  const key = PERSONAL_WORKSPACE_POC_STATE_KEY;
  assertAllowedPocKey(key);
  const serialized = JSON.stringify(state);
  let previous: string | null = null;
  try {
    previous = storage.getItem(key);
    storage.setItem(key, serialized);
    if (storage.getItem(key) !== serialized) throw new Error('storage-verification-failed');
    return { ok: true, serialized };
  } catch (error) {
    try {
      if (previous === null) storage.removeItem(key);
      else storage.setItem(key, previous);
    } catch {
      // The caller keeps its pre-commit in-memory state and fails closed.
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'storage-write-failed',
    };
  }
}

export function resetPersonalWorkspacePocStorage(
  storage: PersonalWorkspacePocStorage,
):
  | { ok: true; removedKeys: string[] }
  | { ok: false; error: string; rollbackOk: boolean } {
  let snapshots: Array<Readonly<{ key: string; value: string | null }>> = [];
  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key): key is string => Boolean(key?.startsWith(PERSONAL_WORKSPACE_POC_STORAGE_PREFIX)));
    snapshots = keys.map((key) => {
      assertAllowedPocKey(key);
      return { key, value: storage.getItem(key) };
    });
    keys.forEach((key) => {
      storage.removeItem(key);
      if (storage.getItem(key) !== null) throw new Error('storage-reset-verification-failed');
    });
    return { ok: true, removedKeys: keys };
  } catch (error) {
    let rollbackOk = true;
    snapshots.forEach(({ key, value }) => {
      try {
        assertAllowedPocKey(key);
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
        if (storage.getItem(key) !== value) throw new Error('storage-reset-rollback-verification-failed');
      } catch {
        rollbackOk = false;
      }
    });
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'storage-reset-failed',
      rollbackOk,
    };
  }
}
