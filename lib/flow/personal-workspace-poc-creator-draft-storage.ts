import { PERSONAL_WORKSPACE_POC_STORAGE_PREFIX } from './personal-workspace-poc-contract';
import {
  PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY,
  isPersonalWorkspacePocCreatorDraftLibrary,
  type PersonalWorkspacePocCreatorDraftLibrary,
} from './personal-workspace-poc-creator-drafts';

export type PersonalWorkspacePocCreatorDraftLibraryLoadResult =
  | Readonly<{ kind: 'empty'; raw: null }>
  | Readonly<{
      kind: 'ready';
      raw: string;
      library: PersonalWorkspacePocCreatorDraftLibrary;
    }>
  | Readonly<{
      kind: 'corrupt';
      raw: string | null;
      reason: string;
    }>;

export type PersonalWorkspacePocCreatorDraftLibrarySaveResult =
  | Readonly<{
      ok: true;
      kind: 'saved' | 'no-op';
      serialized: string;
    }>
  | Readonly<{
      ok: false;
      error: string;
      rollback: 'not-needed' | 'complete' | 'recovery-required';
    }>;

function assertCreatorDraftLibraryKey(): void {
  if (
    PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY
      !== `${PERSONAL_WORKSPACE_POC_STORAGE_PREFIX}creator-drafts`
  ) throw new Error('creator-draft-library-storage-boundary-violation');
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function serializePersonalWorkspacePocCreatorDraftLibrary(
  library: PersonalWorkspacePocCreatorDraftLibrary,
): string {
  if (!isPersonalWorkspacePocCreatorDraftLibrary(library)) {
    throw new TypeError('invalid-creator-draft-library');
  }
  return JSON.stringify(library);
}

export function loadPersonalWorkspacePocCreatorDraftLibrary(
  storage: Pick<Storage, 'getItem'>,
): PersonalWorkspacePocCreatorDraftLibraryLoadResult {
  let raw: string | null;
  try {
    assertCreatorDraftLibraryKey();
    raw = storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY);
  } catch {
    return { kind: 'corrupt', raw: null, reason: 'storage-read-failed' };
  }
  if (raw === null) return { kind: 'empty', raw: null };
  try {
    const value = JSON.parse(raw) as unknown;
    return isPersonalWorkspacePocCreatorDraftLibrary(value)
      ? { kind: 'ready', raw, library: value }
      : { kind: 'corrupt', raw, reason: 'invalid-creator-draft-library' };
  } catch {
    return { kind: 'corrupt', raw, reason: 'invalid-json' };
  }
}

/**
 * Saves one exact library payload with optimistic byte-level comparison.
 * A stale expected value performs no mutation. Write failures restore and
 * verify the exact previous bytes; callers must fail closed when recovery is
 * reported as required.
 */
export function savePersonalWorkspacePocCreatorDraftLibrary(input: Readonly<{
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  expectedRawValue: string | null;
  library: PersonalWorkspacePocCreatorDraftLibrary;
}>): PersonalWorkspacePocCreatorDraftLibrarySaveResult {
  if (input.expectedRawValue !== null) {
    let expected: unknown;
    try {
      expected = JSON.parse(input.expectedRawValue) as unknown;
    } catch {
      return {
        ok: false,
        error: 'invalid-expected-creator-draft-library',
        rollback: 'not-needed',
      };
    }
    if (!isPersonalWorkspacePocCreatorDraftLibrary(expected)) {
      return {
        ok: false,
        error: 'invalid-expected-creator-draft-library',
        rollback: 'not-needed',
      };
    }
  }
  let serialized: string;
  try {
    assertCreatorDraftLibraryKey();
    serialized = serializePersonalWorkspacePocCreatorDraftLibrary(input.library);
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error, 'invalid-creator-draft-library'),
      rollback: 'not-needed',
    };
  }

  let previous: string | null;
  try {
    previous = input.storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY);
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error, 'creator-draft-library-storage-read-failed'),
      rollback: 'not-needed',
    };
  }
  if (previous !== input.expectedRawValue) {
    return { ok: false, error: 'stale-creator-draft-library', rollback: 'not-needed' };
  }
  if (previous === serialized) return { ok: true, kind: 'no-op', serialized };

  try {
    input.storage.setItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY, serialized);
    if (input.storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY) !== serialized) {
      throw new Error('creator-draft-library-storage-verification-failed');
    }
    return { ok: true, kind: 'saved', serialized };
  } catch (error) {
    let rollback: 'complete' | 'recovery-required' = 'complete';
    try {
      if (previous === null) {
        input.storage.removeItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY);
      } else {
        input.storage.setItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY, previous);
      }
      if (input.storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_LIBRARY_KEY) !== previous) {
        rollback = 'recovery-required';
      }
    } catch {
      rollback = 'recovery-required';
    }
    return {
      ok: false,
      error: errorMessage(error, 'creator-draft-library-storage-write-failed'),
      rollback,
    };
  }
}
