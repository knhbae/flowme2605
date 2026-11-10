import { programFailure, type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { programSame } from './controller';
import { programDocumentContentLock, programReferenceExecutionAccess } from './reference-execution-guard';
import { programTaskRepeatMember } from './task-date-move';
import { updateProgramTask, type ProgramPrivateMutationBase } from './private-space';
import { programTextTransition } from './program-text-transition';
import { textWorkspaceModel as M } from './text-workspace';
import { moveTaskLocation, type TaskLocationTarget } from './task-location-move';

export type TaskLocationPolicy = { kind: 'move' | 'date-only' | 'blocked'; taskId: string; documentId: string | null; message: string };

/** Source IDs and existing copy/repeat/access metadata decide the exception; labels never identify a task. */
export function readTaskLocationPolicy(space: ProgramPrivateSpace, lineId: string, visibleDocumentId?: string): TaskLocationPolicy {
  const shown = visibleDocumentId ? M.rowMeta(space.text, visibleDocumentId).find(row => row.id === lineId) : undefined;
  const taskId = shown?.progressTargetId ?? shown?.taskId ?? lineId, task = M.tasks(space.text).find(item => item.id === taskId);
  const documentId = task?.docId ?? null;
  const out = (kind: TaskLocationPolicy['kind'], message: string): TaskLocationPolicy => ({ kind, taskId, documentId, message });
  if (!task || !documentId) return out('blocked', '원래 할 일을 확인해 주세요.');
  const access = programReferenceExecutionAccess(space, taskId);
  if (access.kind !== 'active' || programDocumentContentLock(space, documentId) !== 'active') return out('blocked', access.reason || '원래 문서의 보관 상태를 확인해 주세요.');
  if (shown && (shown.isReference || task.docId !== visibleDocumentId)) return out('date-only', '다른 문서의 항목은 자리 그대로 날짜만 바꿉니다.');
  if (space.text.flows.some(doc => doc.id === documentId) || task.scopeKind === 'flow'
    || space.copies.some(copy => copy.documentId === documentId || Object.values(copy.itemLines).includes(taskId) || Object.values(copy.subcheckLines).some(children=>Object.values(children).includes(taskId)))
    || space.savedBindings.some(binding => binding.documentId === documentId || Object.values(binding.itemLines).includes(taskId))) return out('date-only', 'Flow 사본은 순서를 유지하고 날짜만 바꿉니다.');
  if (programTaskRepeatMember(space, taskId)) return out('date-only', '반복 할 일은 자리 그대로 날짜만 바꿉니다.');
  return out('move', '하위 할 일·메모도 같이 옮깁니다.');
}

export type TaskLocationCommandInput = ProgramPrivateMutationBase & { taskId: string; documentId?: string; target: TaskLocationTarget };

/** A date-only exception never borrows the legacy whole-workspace undo.
 * Begin authority precedes the write; a lost ACK is not proof that nothing was saved. */
export async function commitTaskDateWithUndo<T>(input:{begin:()=> (()=>T|null)|null|undefined;apply:()=>Promise<boolean>}):Promise<{kind:'blocked'|'unconfirmed'}|{kind:'saved';capability:T|null}>{
  const finish=input.begin();
  if(!finish)return{kind:'blocked'};
  if(!await input.apply())return{kind:'unconfirmed'};
  return{kind:'saved',capability:finish()};
}

/** Uses the existing private text transaction. The save/HTTP/CAS owners and command format are unchanged. */
export function moveProgramTaskLocation(data: ProgramData, input: TaskLocationCommandInput): ProgramTransition<string> {
  const space = data.spaces[input.actorId];
  if (!space || data.activeActorId !== input.actorId || !programSame(space, input.expectedSpace)) return programFailure(data, 'conflict');
  const policy = readTaskLocationPolicy(space, input.taskId, input.documentId);
  if (policy.kind === 'blocked' || !policy.documentId) return programFailure(data, 'unresolved');
  if (policy.kind === 'date-only') {
    if (input.target.kind !== 'date') return programFailure(data, 'unresolved');
    return updateProgramTask(data, { ...input, taskId: policy.taskId, patch: { date: input.target.date,
      ...(input.target.time !== undefined ? { time: input.target.time } : {}) } });
  }
  const moved = moveTaskLocation(space.text, { documentId: policy.documentId, taskId: policy.taskId, target: input.target });
  if (!moved.ok) return programFailure(data, 'unresolved');
  return programTextTransition(data, { actorId: input.actorId, documentId: policy.documentId, expected: space.text, next: moved.next });
}

/** An exact one-step source undo. A later edit or remote text refresh ends this capability. */
export function undoProgramTaskLocation(data:ProgramData,input:{actorId:string;documentId:string;before:ProgramPrivateSpace['text'];after:ProgramPrivateSpace['text']}):ProgramTransition<string>{
  if(data.activeActorId!==input.actorId||!data.spaces[input.actorId]||!programSame(data.spaces[input.actorId].text,input.after))return programFailure(data,'conflict');
  return programTextTransition(data,{actorId:input.actorId,documentId:input.documentId,expected:input.after,next:input.before});
}
