import type { AlphaSyncSnapshot } from './alpha-sync/controller';
import { pendingResultUnknown } from './save-status';

/** One status slot, most severe first: 1–4 warnings, 6 saving, 7 editing, 8 saved.
 *  (5, an R4 wait, stays in the message area for now.) */
export type ProgramStatusLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type ProgramStatus = { level: ProgramStatusLevel; label: string };

const labels: Partial<Record<AlphaSyncSnapshot['status'], string>> = {
  'signed-out': '로그인이 필요합니다', 'session-expired': '로그인이 만료되었습니다', 'recovery-required': '저장 상태를 확인해 주세요',
  'same-location': '변경 없음', cancelled: '취소했습니다',
};

/** The server side of the slot, read from the same values that already draw the server status
 *  and its recovery box. Presentation only: no save, lock or recovery action reads this. */
export function programServerStatus(input: {
  snapshot: Pick<AlphaSyncSnapshot, 'status' | 'pending' | 'busy' | 'draft' | 'retryableRejectedDraft' | 'retryableNativeHandoff' | 'retryableRejectedSocialDraft'> | null | undefined;
  storageError: boolean; external: boolean; participationRecovery: boolean;
}): ProgramStatus {
  const { snapshot, storageError, external } = input;
  if (storageError) return { level: 1, label: '입력 보관 실패' };
  if (!snapshot) return { level: 6, label: '개인공간을 여는 중…' };
  if (['signed-out', 'session-expired', 'recovery-required'].includes(snapshot.status)) return { level: 1, label: labels[snapshot.status]! };
  // A social draft's own recovery owns the moment; the server line then shows no status of its own.
  if (input.participationRecovery) return { level: 8, label: '저장됨' };
  const pending = !!snapshot.pending, rejected = !!(snapshot.retryableRejectedDraft || snapshot.retryableNativeHandoff || snapshot.retryableRejectedSocialDraft);
  if (external || snapshot.status === 'conflict') return { level: 2, label: '다른 변경이 먼저 저장됨' };
  if (snapshot.status === 'not-sent' && !pending) return { level: 3, label: '보내지 못함 · 다시 저장' };
  if (snapshot.draft && !pending && !rejected) return { level: 2, label: '입력 보호 · 확인' };
  if (rejected && !pending) return { level: 3, label: '저장 안 됨 · 입력 보존' };
  if (pendingResultUnknown(snapshot)) return { level: 4, label: '저장 여부 확인 못 함' };
  if (pending || snapshot.status === 'saving') return { level: 6, label: '저장 중…' };
  return { level: 8, label: labels[snapshot.status] ?? '저장됨' };
}

/** The editor side: its save error, then saving or locked, then unsaved input, then saved. */
export function programEditorStatus(input: { readOnly: boolean; readOnlyLabel?: string; error: boolean; locked: boolean;
  saving: boolean; checking: boolean; pending: boolean }): ProgramStatus {
  if (input.readOnly) return { level: 8, label: input.readOnlyLabel || '읽기 전용' };
  if (input.error) return { level: 3, label: '저장 확인 필요' };
  if (input.locked) return { level: 6, label: '저장 중 · 입력 잠시 멈춤' };
  if (input.saving || input.checking) return { level: 6, label: '저장 중…' };
  if (input.pending) return { level: 7, label: '편집 중' };
  return { level: 8, label: '저장됨' };
}

/** The server's status takes the slot when it is more severe, or equally severe as a warning.
 *  At saving, editing or saved the editor's own words win, so two "저장됨" show once. */
export function serverStatusWins(server: ProgramStatus | null | undefined, editor: ProgramStatus): boolean {
  return !!server && (server.level < editor.level || server.level === editor.level && server.level <= 4);
}
