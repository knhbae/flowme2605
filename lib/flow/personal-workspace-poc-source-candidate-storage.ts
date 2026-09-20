import { PERSONAL_WORKSPACE_POC_STORAGE_PREFIX } from './personal-workspace-poc-contract';
import {
  PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY,
  isPersonalWorkspacePocSourceCandidateStore,
  type PersonalWorkspacePocSourceCandidateStore,
} from './personal-workspace-poc-source-candidates';

export type PersonalWorkspacePocSourceCandidateStoreLoadResult =
  | Readonly<{ kind: 'empty'; raw: null }>
  | Readonly<{
      kind: 'ready';
      raw: string;
      store: PersonalWorkspacePocSourceCandidateStore;
    }>
  | Readonly<{
      kind: 'corrupt';
      raw: string | null;
      reason: string;
    }>;

export type PersonalWorkspacePocSourceCandidateStoreSaveResult =
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

function assertSourceCandidateKey(): void {
  if (PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY
    !== `${PERSONAL_WORKSPACE_POC_STORAGE_PREFIX}source-candidates`) {
    throw new Error('source-candidate-storage-boundary-violation');
  }
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function serializePersonalWorkspacePocSourceCandidateStore(
  store: PersonalWorkspacePocSourceCandidateStore,
): string {
  if (!isPersonalWorkspacePocSourceCandidateStore(store)) {
    throw new TypeError('invalid-source-candidate-store');
  }
  return JSON.stringify(store);
}

export function parsePersonalWorkspacePocSourceCandidateStore(
  raw: string,
): Readonly<
  | { ok: true; store: PersonalWorkspacePocSourceCandidateStore }
  | { ok: false; reason: 'invalid-json' | 'invalid-source-candidate-store' }
> {
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }
  return isPersonalWorkspacePocSourceCandidateStore(value)
    ? { ok: true, store: value }
    : { ok: false, reason: 'invalid-source-candidate-store' };
}

export function loadPersonalWorkspacePocSourceCandidateStore(
  storage: Pick<Storage, 'getItem'>,
): PersonalWorkspacePocSourceCandidateStoreLoadResult {
  let raw: string | null;
  try {
    assertSourceCandidateKey();
    raw = storage.getItem(PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY);
  } catch {
    return { kind: 'corrupt', raw: null, reason: 'storage-read-failed' };
  }
  if (raw === null) return { kind: 'empty', raw: null };
  const parsed = parsePersonalWorkspacePocSourceCandidateStore(raw);
  return parsed.ok
    ? { kind: 'ready', raw, store: parsed.store }
    : { kind: 'corrupt', raw, reason: parsed.reason };
}

/**
 * The full candidate envelope, resolution set, effective source version and
 * one-step Undo snapshot live in one value. One setItem therefore commits the
 * complete source transition; byte CAS and verified rollback fail closed.
 */
export function savePersonalWorkspacePocSourceCandidateStore(input: Readonly<{
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  expectedRawValue: string | null;
  store: PersonalWorkspacePocSourceCandidateStore;
}>): PersonalWorkspacePocSourceCandidateStoreSaveResult {
  if (input.expectedRawValue !== null) {
    const expected = parsePersonalWorkspacePocSourceCandidateStore(input.expectedRawValue);
    if (!expected.ok) {
      return {
        ok: false,
        error: 'invalid-expected-source-candidate-store',
        rollback: 'not-needed',
      };
    }
  }
  let serialized: string;
  try {
    assertSourceCandidateKey();
    serialized = serializePersonalWorkspacePocSourceCandidateStore(input.store);
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error, 'invalid-source-candidate-store'),
      rollback: 'not-needed',
    };
  }

  let previous: string | null;
  try {
    previous = input.storage.getItem(PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY);
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error, 'source-candidate-storage-read-failed'),
      rollback: 'not-needed',
    };
  }
  if (previous !== input.expectedRawValue) {
    return {
      ok: false,
      error: 'stale-source-candidate-store',
      rollback: 'not-needed',
    };
  }
  if (previous === serialized) return { ok: true, kind: 'no-op', serialized };

  try {
    input.storage.setItem(PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY, serialized);
    if (input.storage.getItem(PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY)
      !== serialized) {
      throw new Error('source-candidate-storage-verification-failed');
    }
    return { ok: true, kind: 'saved', serialized };
  } catch (error) {
    let rollback: 'not-needed' | 'complete' | 'recovery-required' = 'recovery-required';
    try {
      const current = input.storage.getItem(PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY);
      if (current === previous) {
        rollback = 'not-needed';
      } else if (current === serialized) {
        // A failed write/readback does not grant ownership of a later value.
        // This exact check is not a native, cross-document atomic CAS.
        if (previous === null) {
          input.storage.removeItem(PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY);
        } else {
          input.storage.setItem(PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY, previous);
        }
        if (input.storage.getItem(PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY)
          === previous) rollback = 'complete';
      }
    } catch {
      rollback = 'recovery-required';
    }
    return {
      ok: false,
      error: errorMessage(error, 'source-candidate-storage-write-failed'),
      rollback,
    };
  }
}
