import type { ProgramData, ProgramTransition } from './contract';

export type ProgramDestination = {
  view: 'space' | 'discover' | 'community' | 'activity' | 'flow' | 'legacy' | 'creator';
  id?: string;
  versionId?: string;
  itemId?: string;
  replyId?: string;
  action?: 'publish';
  returnActorId?: string;
  executionKey?: string;
  publicOutputReturn?: string;
};
export type ProgramNavigate = (destination: ProgramDestination, options?: { writingLineId?: string; replace?: boolean }) => void;
export type ProgramMutationResult = { ok: true; result: string; changed?: boolean; presentationPending?: true } | { ok: false; reason: string };
/** All program writers go through the same serialized, validated owner. */
export type ProgramMutate = (
  label: string,
  build: (current: ProgramData) => ProgramTransition<string>,
  options?: { groupId?: string; history?: boolean },
) => Promise<ProgramMutationResult>;

export function programErrorMessage(reason: string): string {
  const messages: Record<string, string> = {
    invalid: '입력 내용을 확인해 주세요. 저장된 내용은 바뀌지 않았습니다.',
    missing: '연결한 내용이 없거나 보관되었습니다. 현재 목록에서 다시 선택해 주세요.',
    forbidden: '이 내용은 현재 선택한 작성자가 수정할 수 없습니다.',
    conflict: '다른 변경이 먼저 저장되었습니다. 내 입력은 유지됩니다. 최신 내용을 확인한 뒤 다시 시도해 주세요.',
    'duplicate-request': '이미 처리한 요청과 내용이 다릅니다. 결과를 확인한 뒤 다시 시도해 주세요.',
    limit: '이 로컬 PoC의 저장 한도에 도달했습니다. 원문을 파일로 보관해 주세요.',
    unresolved: '해결하지 않은 변경이 있습니다. 비교 내용을 먼저 확인해 주세요.',
    'storage-unavailable': '저장하지 못했습니다. 입력을 유지한 채 다시 시도하거나 원문을 파일로 보관해 주세요.',
    'readback-failed': '저장 결과를 확인하지 못했습니다. 다시 열기 전에 원문을 보관해 주세요.',
    'recovery-required': '저장 상태 확인이 필요합니다. 입력을 보관한 뒤 새로고침해 주세요.',
    'presentation-pending': '앞선 저장은 완료됐지만 화면 갱신이 필요합니다. 저장된 화면을 다시 확인한 뒤 변경해 주세요.',
  };
  return messages[reason] ?? '변경을 저장하지 못했습니다. 입력을 확인하고 다시 시도해 주세요.';
}
