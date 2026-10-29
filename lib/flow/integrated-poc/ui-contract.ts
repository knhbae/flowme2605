import type {TextWorkspaceState} from './text-workspace';
import type {ProgramWritingPosition} from './contract';
import type { ProgramData, ProgramTransition } from './contract';
import type { AlphaCreatorIntent } from './alpha-creator/contract';
import type { AlphaSocialIntent } from './alpha-social/contract';
import type { AlphaAccount, AlphaPrivateCommand } from './alpha-persistence/contract';
import type { AlphaSyncSnapshot } from './alpha-sync/controller';

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
export type ProgramMutationResult = { ok: true; result: string; flowId?: string; changed?: boolean; presentationPending?: true } | { ok: false; reason: string };
/** Exact private command observations from the controller, never inferred from boolean text commits. */
export type ProgramPrivateMutationObservation = {
  generation: number; before: AlphaAccount; command: AlphaPrivateCommand; snapshot: AlphaSyncSnapshot;
} & ({ phase: 'prepared' } | { phase: 'settled'; result: ProgramMutationResult });
export type ProgramPrivateMutationObserver = (event: ProgramPrivateMutationObservation) => void;
/** All program writers go through the same serialized, validated owner. */
export type ProgramMutate = (
  label: string,
  build: (current: ProgramData) => ProgramTransition<string>,
  options?: { alphaWriting?:{documentId:string;expected:TextWorkspaceState;next:TextWorkspaceState;position?:ProgramWritingPosition;workingGeneration:number;canSubmit?:()=>boolean}; groupId?: string; history?: boolean; alphaCreator?: AlphaCreatorIntent | (() => AlphaCreatorIntent); alphaSocial?: AlphaSocialIntent | (() => AlphaSocialIntent); onPrivateMutation?: ProgramPrivateMutationObserver;
    /** The click fixed its whole intent up front, so it may wait out the host's automatic read instead of being refused as busy. */
    awaitAutomaticRead?: boolean },
) => Promise<ProgramMutationResult>;

/** Only the host observing live controller state should show/clear this notice. */
export const PROGRAM_BUSY_NOTICE = '방금 누른 것은 실행하지 않았습니다. 저장이나 서버 확인이 끝난 뒤 필요하면 다시 눌러 주세요.';
/** A tap waiting out a refresh runs by itself. Asking for a retry here would let
 *  the second tap reopen the task the first tap is about to complete. */
export const PROGRAM_QUEUED_NOTICE = '서버 확인이 끝나면 이어서 처리합니다. 다시 누르지 않아도 됩니다.';
/** A source open waiting out the same check. The list owns it: a later action
 *  cancels the open and clears this too. */
export const PROGRAM_SOURCE_QUEUED_NOTICE = '서버 확인이 끝나면 원문을 엽니다. 다시 누르지 않아도 됩니다.';

export function programErrorMessage(reason: string): string {
  const messages: Record<string, string> = {
    'duplicate-folder-name': '같은 위치에 같은 이름의 폴더가 있습니다. 다른 이름을 입력해 주세요.',
    invalid: '입력 내용을 확인해 주세요. 저장된 내용은 바뀌지 않았습니다.',
    missing: '연결한 내용이 없거나 보관되었습니다. 현재 목록에서 다시 선택해 주세요.',
    forbidden: '이 내용은 현재 선택한 작성자가 수정할 수 없습니다.',
    conflict: '다른 변경이 먼저 저장되었습니다. 내 입력은 유지됩니다. 최신 내용을 확인한 뒤 다시 시도해 주세요.',
    'duplicate-request': '이미 처리한 요청과 내용이 다릅니다. 결과를 확인한 뒤 다시 시도해 주세요.',
    limit: '보관 한도를 넘어 이번 변경을 적용하지 않았습니다. 입력을 따로 복사해 보관해 주세요. 기존 기록은 자동으로 지우지 않습니다.',
    unresolved: '해결하지 않은 변경이 있습니다. 비교 내용을 먼저 확인해 주세요.',
    busy: '다른 요청과 겹쳐 이번 요청은 실행하지 않았습니다. 필요한 변경이 남아 있으면 다시 시도해 주세요.',
    'storage-unavailable': '저장하지 못했습니다. 입력을 유지한 채 다시 시도하거나 원문을 파일로 보관해 주세요.',
    'readback-failed': '저장 결과를 확인하지 못했습니다. 다시 열기 전에 원문을 보관해 주세요.',
    'checking-result': '저장 여부가 아직 확인되지 않았습니다. 입력을 보관하고 저장 결과 확인 · 같은 요청 재시도를 눌러 주세요.',
    'recovery-required': '저장 상태 확인이 필요합니다. 입력을 보관한 뒤 새로고침해 주세요.',
    'presentation-pending': '앞선 저장은 완료됐지만 화면 갱신이 필요합니다. 저장된 화면을 다시 확인한 뒤 변경해 주세요.',
  };
  return messages[reason] ?? '변경을 저장하지 못했습니다. 입력을 확인하고 다시 시도해 주세요.';
}
