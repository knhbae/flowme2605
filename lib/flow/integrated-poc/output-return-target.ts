import type { ProgramData } from './contract';
import type { ProgramDestination } from './ui-contract';
import { validateProgramData, programDate } from './program-data';
import { isProgramExecutionTargetKey } from './recurrence-order-contract';
import { textWorkspaceModel as M } from './text-workspace';
import { programReferenceExecutionAccess } from './reference-execution-guard';
import { programSeriesMetadata } from './recurrence-target';
import { resolveProgramExecutionSource } from './execution-source';
import { readProgramExecutionOccurrences, programOccurrenceWindowFor, type ProgramExecutionOccurrenceRow } from './recurrence-state';
import { readProgramPersonalRecurrences } from './program-recurrence-plan-state';
import { readProgramRecurrencePlan } from './program-recurrence-plan';
import { readProgramPublicCopyOutputOccurrence } from './public-copy-output-return';

export type ProgramOutputReturnRead = { kind: 'unavailable'; reason: string; documentId?: string; lineId?: string }
  | { kind: 'task'; documentId: string; lineId: string; title: string }
  | { kind: 'occurrence'; documentId: string; lineId: string; row: ProgramExecutionOccurrenceRow };
/** Resolve stable identities against CURRENT owners; no title/date-index fallback or writes. */
export function readProgramOutputReturnTarget(data: ProgramData, destination: ProgramDestination, today: string): ProgramOutputReturnRead {
  const unavailable = (reason: string, target?: { documentId: string; lineId: string }): ProgramOutputReturnRead => ({ kind: 'unavailable', reason, ...target });
  // Do not inspect or expose the other actor's document, even its title.
  if (destination.returnActorId !== data.activeActorId) return unavailable('이 링크를 만든 인물과 현재 인물이 다릅니다. 인물을 직접 확인한 뒤 링크를 다시 열어 주세요.');
  if (!validateProgramData(data) || !programDate(today) || destination.view !== 'space' || !destination.id || !isProgramExecutionTargetKey(destination.executionKey)) return unavailable('복귀 링크를 확인할 수 없습니다. 저장된 내용은 바뀌지 않았습니다.');
  const space = data.spaces[data.activeActorId], tuple: string[] = JSON.parse(destination.executionKey);
  const access = (lineId: string) => {
    const a = programReferenceExecutionAccess(space, lineId);
    if (!a.documentId) return unavailable(a.reason!);
    const target = { documentId: a.documentId, lineId };
    if (a.reason) return unavailable(a.reason, target);
    if (a.documentId !== destination.id) return unavailable('항목이 다른 문서로 이동했습니다. 아래에서 현재 원래 위치를 직접 열 수 있습니다.', target);
    return null;
  };
  if (tuple[1] === 'public-copy-return/1' || tuple[1] === 'public-copy-occurrence/1') {
    const read = readProgramPublicCopyOutputOccurrence(data, { actorId: data.activeActorId, executionKey: destination.executionKey, today });
    if (!read.ok) return unavailable(read.reason, read.documentId && read.lineId ? { documentId: read.documentId, lineId: read.lineId } : undefined);
    const blocked = access(read.lineId); if (blocked) return blocked;
    return { kind: 'occurrence', documentId: read.documentId, lineId: read.lineId, row: read.row };
  }
  if (tuple[0] === 'text-task') {
    if (tuple[1] !== destination.id) return unavailable('문서와 항목의 식별자가 맞지 않습니다.');
    const blocked = access(tuple[2]); if (blocked) return blocked;
    const task = M.tasks(space.text).find(task => task.id === tuple[2] && task.docId === destination.id);
    return task ? { kind: 'task', documentId: task.docId, lineId: task.id, title: task.title } : unavailable('이 행은 더 이상 실행 항목이 아닙니다. 원문에서 확인해 주세요.', { documentId: destination.id, lineId: tuple[2] });
  }
  const key = JSON.stringify(tuple.slice(1)), personal = tuple[1] === 'program-personal-occurrence/1';
  const owner = personal && tuple[2] === data.activeActorId ? space.recurrencePlans?.owners[tuple[3]] : undefined;
  if (personal && !owner) return unavailable('연결한 개인 반복 계획을 찾을 수 없습니다. 다른 회차로 바꾸지 않았습니다.');
  const metadata = programSeriesMetadata(space).filter(meta => {
    if(tuple[1]==='native-creator')return meta.nativeOwnerId===tuple[2]&&meta.itemId===tuple[3];
    if (owner) return meta.flowRef === owner.source.sourceFlowRef && meta.itemRef === owner.source.sourceItemRef;
    if (tuple[1] === 'creator') {
      const source = resolveProgramExecutionSource(space, meta.flowRef);
      return source.ok && source.kind === 'creator' && source.owner.id === tuple[2]
        && source.revision.rows.some(row => row.rowId === tuple[3] && row.itemRef === meta.itemRef);
    }
    return meta.savedCopyId === tuple[2] && meta.flowId === tuple[3] && meta.itemId === tuple[4];
  });
  if (metadata.length !== 1) return unavailable('원래 반복 항목을 정확히 찾을 수 없습니다. 삭제되었거나 원문 규칙이 바뀌었을 수 있습니다. 다른 회차를 대신 열지 않았습니다.');
  const meta = metadata[0], blocked = access(meta.lineId); if (blocked) return blocked;
  const target = { documentId: destination.id, lineId: meta.lineId };
  let found: ProgramExecutionOccurrenceRow | undefined;
  const occurrenceDate = tuple[1]==='native-creator'?tuple[6]:/:occurrence:(\d{4}-\d{2}-\d{2})(?:T(?:all-day|\d{2}:\d{2}))?$/.exec(tuple.at(-1)!)?.[1];
  if (!occurrenceDate || !programDate(occurrenceDate)) return unavailable('회차 식별자를 확인할 수 없습니다.', target);
  if (owner) {
    const read = readProgramRecurrencePlan(owner, { start: occurrenceDate, end: occurrenceDate });
    if (!read.ok) return unavailable('개인 계획을 안전하게 읽지 못했습니다.', target);
    const stored = read.value.executionEntries[key], date = stored?.schedule.date ?? occurrenceDate;
    const current = readProgramPersonalRecurrences(data, { actorId: data.activeActorId, ownerId: owner.ownerId, localToday: today, range: { start: date, end: date } });
    if (current.ok) found = current.value.rows.find(row => row.key === key);
  } else {
    const input = { actorId: data.activeActorId, flowRef: meta.flowRef, localToday: today, skipPersonalPlans: false };
    const stored = space.recurrenceExecution?.entries[key];
    const initial = readProgramExecutionOccurrences(data, { ...input, ...(stored ? { window: programOccurrenceWindowFor(stored) } : {}) });
    if (!initial.ok) return unavailable('회차 원문을 안전하게 읽지 못했습니다.', target);
    found = initial.rows.find(row => row.key === key);
    if (!found) {
      const seriesId = tuple[1]==='native-creator'?tuple[4]:tuple.at(-2)!, series = initial.series.find(series => series.manifest.seriesId === seriesId);
      if (series) {
        const week = Math.floor((Date.parse(occurrenceDate) - Date.parse(series.startDate)) / 604800000);
        // Reuse the source expander's bounds, never manufacture an occurrence.
        if (series.manifest.mode === 'open-ended' && week >= 0 && week <= 512) {
          const read = readProgramExecutionOccurrences(data, { ...input, window: { windowOffsetWeeks: week, windowWeeks: 1 } });
          if (read.ok) found = read.rows.find(row => row.key === key);
        } else if (series.manifest.mode === 'finite') for (let offset = 0; offset <= 10000 && !found; offset += 200) {
          const read = readProgramExecutionOccurrences(data, { ...input, window: { finiteOffset: offset, finiteLimit: 200 } });
          if (!read.ok) break; found = read.rows.find(row => row.key === key);
          const current = read.series.find(series => series.manifest.seriesId === seriesId);
          if (!current?.manifest.hasMore || (current.manifest.rows.at(-1)?.originalDate ?? '') > occurrenceDate) break;
        }
      }
    }
  }
  if (!found || found.key !== key) return unavailable('해당 회차는 현재 계획에서 확인할 수 없습니다. 원문 비교와 보관된 회차 기록을 확인해 주세요.', target);
  if (found.sourceConflict || found.mapReviewHold || found.flowInactive || found.planExcluded || found.planSuperseded || found.participation !== 'included') return unavailable('이 회차는 보류·제외되었거나 원문 또는 계획이 바뀌었습니다. 원래 문서에서 비교·복구 상태를 먼저 확인해 주세요.', target);
  return { kind: 'occurrence', ...target, row: found };
}
