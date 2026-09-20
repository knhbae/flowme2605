import type { ProgramData } from './contract';
import { stableAuthoringJson } from './native-creator-vendor/text-authoring/identity';
import { isValidAuthoringDate } from './native-creator-vendor/text-authoring/recurrence';
import { readProgramPublicCopyExecutionTarget } from './public-copy-execution-target';
import { programPublicCopyExecutionRef, readProgramPublicCopyRecurrenceSource } from './public-copy-recurrence';
import { readProgramExecutionOccurrences, type ProgramExecutionOccurrenceRow } from './recurrence-state';

type Read = { ok: false; reason: string; documentId?: string; lineId?: string } | { ok: true; documentId: string; lineId: string; row: ProgramExecutionOccurrenceRow };
/** Read-only consumer beneath the envelope gate. Contract-fixture tests may call
 * this reader while the live recurring public store is still closed; it neither
 * validates a whole envelope nor authorizes storage or UI entry on its own. */
export function readProgramPublicCopyOutputOccurrence(data: ProgramData, input: { actorId: string; executionKey: string; today: string }): Read {
  const fail = (reason: string, target?: { documentId: string; lineId: string }): Read => ({ ok: false, reason, ...target });
  try {
    if (input.actorId !== data.activeActorId || !Object.hasOwn(data.spaces, input.actorId)) return fail('다른 인물의 개인 사본은 열지 않습니다.');
    const target = readProgramPublicCopyExecutionTarget(input.executionKey);
    if (!target?.basis || !isValidAuthoringDate(input.today)) return fail('출력 당시의 판본을 확인할 수 없습니다. 다른 회차로 바꾸지 않았습니다.');
    const source = readProgramPublicCopyRecurrenceSource(data.spaces[input.actorId], data.public, target.copyId);
    if (!source.ok || source.source.flowId !== target.flowId) return fail('원래 개인 사본을 정확히 찾을 수 없습니다.');
    const item = source.source.items.find(entry => entry.item.id === target.itemId);
    const location = item ? { documentId: item.documentId, lineId: item.lineId } : undefined;
    if (!item || item.scheduleVersionId !== target.basis.versionId || stableAuthoringJson(item.item.schedule) !== stableAuthoringJson(target.basis.schedule))
      return fail('출력 뒤 수용한 일정 판본이 바뀌었습니다. 원래 문서에서 비교·복구 상태를 확인해 주세요.', location);
    const read = readProgramExecutionOccurrences(data, { actorId: input.actorId, flowRef: programPublicCopyExecutionRef(target.copyId),
      localToday: input.today, window: target.window });
    if (!read.ok) return fail('회차 원문을 안전하게 읽지 못했습니다.', location);
    const row = read.rows.find(row => row.key === target.occurrenceKey);
    if (!row || row.personalPlan || row.sourceConflict || row.mapReviewHold || row.flowInactive || row.planExcluded || row.planSuperseded || row.participation !== 'included')
      return fail('해당 회차는 현재 실행에서 확인할 수 없습니다. 원문 비교와 보관된 기록을 확인해 주세요.', location);
    return { ok: true, documentId: item.documentId, lineId: item.lineId, row };
  } catch { return fail('복귀 정보를 안전하게 확인하지 못했습니다. 저장된 내용은 바뀌지 않았습니다.'); }
}
