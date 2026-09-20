import type { PreparedFlowEditorPlanCommit } from './flow-editor-transaction';
import {
  prepareFlowEditorStorageCommit,
  recoverFlowEditorStorageCommit,
} from './flow-editor-storage-transaction';
import {
  PERSONAL_WORKSPACE_POC_STATE_KEY,
  PERSONAL_WORKSPACE_POC_STORAGE_PREFIX,
  type PersonalWorkspacePocState,
} from './personal-workspace-poc-contract';
import { isPersonalWorkspacePocState } from './personal-workspace-poc-state';
import {
  PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,
  type PersonalWorkspacePocStorage,
} from './personal-workspace-poc-storage';

export const PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY =
  `${PERSONAL_WORKSPACE_POC_STORAGE_PREFIX}editor-storage-recovery:v1`;
export const PERSONAL_WORKSPACE_POC_STORAGE_COMMIT_MARKER_KEY =
  `${PERSONAL_WORKSPACE_POC_STORAGE_PREFIX}editor-storage-commit-marker:v1`;

const PERSONAL_WORKSPACE_POC_ATOMIC_TARGET_KEYS = new Set([
  PERSONAL_WORKSPACE_POC_STATE_KEY,
  PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,
]);

const PERSONAL_WORKSPACE_POC_RECOVERY_ERROR_CODE = 'personal-workspace-poc-recovery-required';

type PersonalWorkspacePocRecoveryRequiredFailure = Readonly<{
  kind: 'storage';
  code: 'rollback_incomplete';
  message: string;
  firstErrorFocus: string;
  personalWorkspacePocCode: typeof PERSONAL_WORKSPACE_POC_RECOVERY_ERROR_CODE;
}>;

function recoveryRequiredFailure(): PersonalWorkspacePocRecoveryRequiredFailure {
  return {
    kind: 'storage',
    code: 'rollback_incomplete',
    message: '이전 저장을 먼저 복구해야 합니다. 새로고침해 복구 상태를 확인해 주세요.',
    firstErrorFocus: '[data-editor-error-summary]',
    personalWorkspacePocCode: PERSONAL_WORKSPACE_POC_RECOVERY_ERROR_CODE,
  };
}

function isRecoveryRequiredFailure(value: unknown): value is PersonalWorkspacePocRecoveryRequiredFailure {
  return isRecord(value)
    && value.personalWorkspacePocCode === PERSONAL_WORKSPACE_POC_RECOVERY_ERROR_CODE
    && value.kind === 'storage'
    && value.code === 'rollback_incomplete';
}

export type PreparedPersonalWorkspacePocStorageCommit =
  PreparedFlowEditorPlanCommit & Readonly<{
    kind: 'no-op' | 'prepared';
    serializedState: string;
    removesAuthoringDraft: boolean;
    draftMutation: 'keep' | 'remove' | 'set-exact-raw';
  }>;

export type PersonalWorkspacePocAtomicSaveResult =
  | Readonly<{
      ok: true;
      kind: 'saved' | 'no-op';
      serializedState: string;
    }>
  | Readonly<{
      ok: false;
      error: string;
      rollback: 'complete' | 'recovery-required';
    }>;

export type PersonalWorkspacePocStorageRecoveryResult = Readonly<{
  found: boolean;
  recovered: boolean;
  transactionId?: string;
  outcome?: 'committed' | 'rolled-back';
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAllowedPocAtomicTargetKey(key: unknown): key is string {
  return typeof key === 'string'
    && key.startsWith(PERSONAL_WORKSPACE_POC_STORAGE_PREFIX)
    && PERSONAL_WORKSPACE_POC_ATOMIC_TARGET_KEYS.has(key);
}

function hasSafePocRecoveryBoundary(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.targetKeys)) return false;
  if (
    value.targetKeys.length === 0
    || value.targetKeys.some((key) => !isAllowedPocAtomicTargetKey(key))
  ) return false;

  if (!isRecord(value.snapshot) || !Array.isArray(value.snapshot.keys)) return false;
  if (value.snapshot.keys.some((key) => !isAllowedPocAtomicTargetKey(key))) return false;

  return isRecord(value.commitMarker)
    && value.commitMarker.key === PERSONAL_WORKSPACE_POC_STORAGE_COMMIT_MARKER_KEY;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

/**
 * Prepares one PoC-only transaction for the versioned workspace state and,
 * when requested, removal of the authoring draft. Preparation is read-only.
 * The caller can pass the returned operation directly to the shared Plan editor
 * commit executor because it satisfies PreparedFlowEditorPlanCommit.
 */
export function preparePersonalWorkspacePocStorageCommit(input: Readonly<{
  storage: PersonalWorkspacePocStorage;
  state: PersonalWorkspacePocState;
  transactionId: string;
  removeAuthoringDraft?: boolean;
  /** `undefined` keeps the key, `null` removes it, and a string restores exact bytes. */
  authoringDraftRawValue?: string | null;
}>): PreparedPersonalWorkspacePocStorageCommit {
  if (!isPersonalWorkspacePocState(input.state)) {
    throw new TypeError('invalid-personal-workspace-poc-state');
  }
  if (!input.transactionId.trim()) {
    throw new TypeError('personal-workspace-poc-transaction-id-required');
  }
  if (input.removeAuthoringDraft && input.authoringDraftRawValue !== undefined) {
    throw new TypeError('personal-workspace-poc-conflicting-draft-mutation');
  }

  const outstandingRecovery = input.storage.getItem(
    PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY,
  );
  if (outstandingRecovery !== null) {
    throw recoveryRequiredFailure();
  }

  const serializedState = JSON.stringify(input.state);
  const draftMutation = input.authoringDraftRawValue !== undefined
    ? input.authoringDraftRawValue === null
      ? 'remove' as const
      : 'set-exact-raw' as const
    : input.removeAuthoringDraft
      ? 'remove' as const
      : 'keep' as const;
  const removesAuthoringDraft = draftMutation === 'remove';
  const stateIsUnchanged = input.storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY)
    === serializedState;
  const desiredDraftRawValue = draftMutation === 'set-exact-raw'
    ? input.authoringDraftRawValue as string
    : null;
  const draftIsUnchanged = draftMutation === 'keep'
    || input.storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY)
      === desiredDraftRawValue;

  if (stateIsUnchanged && draftIsUnchanged) {
    return {
      kind: 'no-op',
      serializedState,
      removesAuthoringDraft,
      draftMutation,
      commit: () => undefined,
      rollbackAndVerify: () => true,
    };
  }

  const targetKeys = draftMutation !== 'keep'
    ? [PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY, PERSONAL_WORKSPACE_POC_STATE_KEY]
    : [PERSONAL_WORKSPACE_POC_STATE_KEY];
  const operation = prepareFlowEditorStorageCommit({
    storage: input.storage,
    recovery: {
      journalStorage: input.storage,
      key: PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY,
      commitMarkerKey: PERSONAL_WORKSPACE_POC_STORAGE_COMMIT_MARKER_KEY,
      transactionId: input.transactionId,
      targetKeys,
    },
    commit: () => {
      input.storage.setItem(PERSONAL_WORKSPACE_POC_STATE_KEY, serializedState);
      if (input.storage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY) !== serializedState) {
        throw new Error('personal-workspace-poc-state-verification-failed');
      }

      if (draftMutation === 'remove') {
        input.storage.removeItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY);
      } else if (draftMutation === 'set-exact-raw') {
        input.storage.setItem(
          PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,
          desiredDraftRawValue as string,
        );
      }
      if (draftMutation !== 'keep'
        && input.storage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY)
          !== desiredDraftRawValue) {
        throw new Error('personal-workspace-poc-draft-mutation-verification-failed');
      }
    },
  });

  return {
    ...operation,
    kind: 'prepared',
    serializedState,
    removesAuthoringDraft,
    draftMutation,
  };
}

/** Runs the prepared operation and reports whether a failed commit rolled back exactly. */
export function commitPersonalWorkspacePocStorage(input: Readonly<{
  storage: PersonalWorkspacePocStorage;
  state: PersonalWorkspacePocState;
  transactionId: string;
  removeAuthoringDraft?: boolean;
  authoringDraftRawValue?: string | null;
}>): PersonalWorkspacePocAtomicSaveResult {
  let operation: PreparedPersonalWorkspacePocStorageCommit;
  try {
    operation = preparePersonalWorkspacePocStorageCommit(input);
  } catch (error) {
    const recoveryRequired = isRecoveryRequiredFailure(error);
    const errorText = recoveryRequired
      ? PERSONAL_WORKSPACE_POC_RECOVERY_ERROR_CODE
      : errorMessage(error, 'personal-workspace-poc-storage-prepare-failed');
    return {
      ok: false,
      error: errorText,
      rollback: recoveryRequired ? 'recovery-required' : 'complete',
    };
  }

  if (operation.kind === 'no-op') {
    return { ok: true, kind: 'no-op', serializedState: operation.serializedState };
  }

  try {
    operation.commit();
    return { ok: true, kind: 'saved', serializedState: operation.serializedState };
  } catch (error) {
    try {
      const rollbackOk = operation.rollbackAndVerify();
      return {
        ok: false,
        error: errorMessage(error, 'personal-workspace-poc-storage-commit-failed'),
        rollback: rollbackOk ? 'complete' : 'recovery-required',
      };
    } catch {
      return {
        ok: false,
        error: errorMessage(error, 'personal-workspace-poc-storage-commit-failed'),
        rollback: 'recovery-required',
      };
    }
  }
}

/**
 * Recovers only journals whose target, snapshot, and marker stay inside the
 * exact PoC contract. Malformed or out-of-bound journals are left untouched.
 */
export function recoverPersonalWorkspacePocStorageCommit(
  storage: PersonalWorkspacePocStorage,
): PersonalWorkspacePocStorageRecoveryResult {
  const raw = storage.getItem(PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY);
  if (raw === null) return { found: false, recovered: true };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { found: true, recovered: false };
  }
  if (!hasSafePocRecoveryBoundary(parsed)) {
    return { found: true, recovered: false };
  }

  return recoverFlowEditorStorageCommit({
    storage,
    journalStorage: storage,
    key: PERSONAL_WORKSPACE_POC_STORAGE_RECOVERY_KEY,
    commitMarkerKey: PERSONAL_WORKSPACE_POC_STORAGE_COMMIT_MARKER_KEY,
  });
}
