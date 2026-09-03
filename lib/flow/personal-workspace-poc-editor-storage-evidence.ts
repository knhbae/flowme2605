import {
  PERSONAL_WORKSPACE_POC_STATE_KEY,
  type PersonalWorkspacePocState,
} from './personal-workspace-poc-contract';
import type { PreparedFlowEditorPlanCommit } from './flow-editor-transaction';
import type { PersonalWorkspacePocStorage } from './personal-workspace-poc-storage';

export type PersonalWorkspacePocEditorStorageEvidence = {
  commitStarted: boolean;
  successfulTargetMutationCount: number;
  successfulSupportMutationCount: number;
  /** Exact bytes accepted by the real state-key writer for this attempt. */
  lastSuccessfulTargetRaw?: string | null;
  /** Exact, strictly parsed state re-read while the commit lock was still held. */
  verifiedTargetRaw?: string;
  verifiedTargetState?: PersonalWorkspacePocState;
  rollback: 'not-attempted' | 'complete' | 'recovery-required';
};

export type PersonalWorkspacePocEditorTargetVerification = Readonly<{
  readTargetRaw: () => string | null;
  parseTargetRaw: (raw: string) => PersonalWorkspacePocState | undefined;
}>;

export function createPersonalWorkspacePocEditorStorageEvidence(): PersonalWorkspacePocEditorStorageEvidence {
  return {
    commitStarted: false,
    successfulTargetMutationCount: 0,
    successfulSupportMutationCount: 0,
    rollback: 'not-attempted',
  };
}

/**
 * The first unsaved revision may legitimately have no state key. Every later
 * in-memory state must match the exact bytes last written by this PoC.
 */
export function isPersonalWorkspacePocEditorStateRawCurrent(
  state: PersonalWorkspacePocState,
  raw: string | null,
): boolean {
  return raw === null
    ? state.revision === 0
    : raw === JSON.stringify(state);
}

function recordSuccessfulMutation(
  evidence: PersonalWorkspacePocEditorStorageEvidence,
  key: string,
  rawValue: string | null,
) {
  if (key === PERSONAL_WORKSPACE_POC_STATE_KEY) {
    evidence.successfulTargetMutationCount += 1;
    evidence.lastSuccessfulTargetRaw = rawValue;
  } else {
    evidence.successfulSupportMutationCount += 1;
  }
}

/**
 * Delegates to the real PoC storage while recording only mutations that
 * returned successfully. Reads are deliberately transparent and uncounted.
 */
export function createPersonalWorkspacePocEditorEvidenceStorage(
  storage: PersonalWorkspacePocStorage,
  evidence: PersonalWorkspacePocEditorStorageEvidence,
): PersonalWorkspacePocStorage {
  return {
    get length() {
      return storage.length;
    },
    key: (index) => storage.key(index),
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => {
      storage.setItem(key, value);
      recordSuccessfulMutation(evidence, key, value);
    },
    removeItem: (key) => {
      storage.removeItem(key);
      recordSuccessfulMutation(evidence, key, null);
    },
  };
}

/** Adds commit/rollback lifecycle evidence without changing transaction semantics. */
export function instrumentPersonalWorkspacePocEditorStorageCommit(
  operation: PreparedFlowEditorPlanCommit,
  evidence: PersonalWorkspacePocEditorStorageEvidence,
  targetVerification?: PersonalWorkspacePocEditorTargetVerification,
): PreparedFlowEditorPlanCommit {
  return {
    commit: async () => {
      evidence.commitStarted = true;
      await operation.commit();
      if (!targetVerification) return;

      let targetRaw: string | null;
      try {
        targetRaw = targetVerification.readTargetRaw();
      } catch {
        throw editorTargetVerificationFailure(
          'editor-target-read-failed',
          '저장 결과를 다시 읽지 못했습니다. 입력 내용은 그대로 유지됩니다.',
        );
      }
      if (
        evidence.successfulTargetMutationCount !== 1
        || typeof evidence.lastSuccessfulTargetRaw !== 'string'
        || targetRaw !== evidence.lastSuccessfulTargetRaw
      ) {
        throw editorTargetVerificationFailure(
          'editor-target-bytes-mismatch',
          '저장 결과의 정확한 bytes를 확인하지 못했습니다. 입력 내용은 그대로 유지됩니다.',
        );
      }

      let parsed: PersonalWorkspacePocState | undefined;
      try {
        parsed = targetVerification.parseTargetRaw(targetRaw);
      } catch {
        parsed = undefined;
      }
      if (!parsed) {
        throw editorTargetVerificationFailure(
          'editor-target-parse-failed',
          '저장 결과를 안전한 상태로 해석하지 못했습니다. 입력 내용은 그대로 유지됩니다.',
        );
      }
      evidence.verifiedTargetRaw = targetRaw;
      evidence.verifiedTargetState = parsed;
    },
    rollbackAndVerify: async () => {
      try {
        const restored = await operation.rollbackAndVerify();
        evidence.rollback = restored ? 'complete' : 'recovery-required';
        return restored;
      } catch (error) {
        evidence.rollback = 'recovery-required';
        throw error;
      }
    },
  };
}

function editorTargetVerificationFailure(code: string, message: string): Error {
  return Object.assign(new Error(message), {
    kind: 'storage' as const,
    code,
    firstErrorFocus: '[data-editor-error-summary]',
  });
}

export function resolvePersonalWorkspacePocEditorFailureEvidence(
  evidence: PersonalWorkspacePocEditorStorageEvidence | undefined,
  recoveryRequired: boolean,
): Readonly<{
  supportWriteCount: number;
  rollback: 'not-needed' | 'complete' | 'recovery-required';
}> {
  if (recoveryRequired || evidence?.rollback === 'recovery-required') {
    return {
      supportWriteCount: evidence?.successfulSupportMutationCount ?? 0,
      rollback: 'recovery-required',
    };
  }
  if (evidence?.rollback === 'complete') {
    return {
      supportWriteCount: evidence.successfulSupportMutationCount,
      rollback: 'complete',
    };
  }
  return { supportWriteCount: 0, rollback: 'not-needed' };
}
