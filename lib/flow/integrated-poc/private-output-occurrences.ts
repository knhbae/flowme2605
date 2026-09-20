import type { ProgramData } from './contract';
import { programDate } from './program-data';
import { programSeriesMetadata, programSeriesVisibleInDocument } from './recurrence-target';
import { readProgramOccurrencePeriod } from './recurrence-state';
import { resolveProgramExecutionSource } from './execution-source';
import { classifyProgramUrl } from './output';
import type { PrivateOutputRow } from './private-output';
import { textWorkspaceModel as M } from './text-workspace';
import { programOccurrenceTargetKey } from './recurrence-order';
import { isProgramExecutionTargetKey } from './recurrence-order-contract';
import { programPublicCopyOutputTargetKey } from './public-copy-execution-target';
import { programStructuredRecurrence } from './legacy-source-context';
import { programRecurringScheduleLabel } from './public-recurrence-contract';

/** Replaceable PoC output contract; not a recurrence end or operating schema. */
export const PRIVATE_OUTPUT_OCCURRENCES_V1 = Object.freeze({ version: 1, maxRangeDays: 366 });
export type PrivateOutputOccurrenceRange = { from: string; to: string; includeUndated: boolean };
export function validPrivateOutputOccurrenceRange(range: PrivateOutputOccurrenceRange): boolean {
  return !!range && programDate(range.from) && programDate(range.to) && typeof range.includeUndated === 'boolean'
    && range.from <= range.to && (Date.parse(range.to) - Date.parse(range.from)) / 86400000 < PRIVATE_OUTPUT_OCCURRENCES_V1.maxRangeDays;
}
/** Explicit bounded read, no series checkbox and no fabricated occurrence IDs. */
export function inspectPrivateOutputOccurrences(data: ProgramData, input: { actorId: string; documentId: string; occurrenceRange?: PrivateOutputOccurrenceRange }, members: Set<string>, selectedScopes: ReadonlySet<string> = new Set()) {
  const space = data.spaces[input.actorId], range = input.occurrenceRange;
  if (range && !validPrivateOutputOccurrenceRange(range)) return { ok: false as const, reason: 'invalid-occurrence-range' as const };
  const metadata = programSeriesMetadata(space).filter(item => {
    if (space.archivedDocumentIds.includes(item.documentId) || space.documentTrash?.[item.documentId]) return false;
    const document = M.getDocument(space.text, item.documentId);
    // Series headings intentionally are not checkbox tasks. Use their explicit
    // owner when present, otherwise the same Flow/document ownership contract.
    const scopeId = space.text.itemScopes[item.lineId] ?? space.text.taskScopes[item.lineId]
      ?? (space.text.flows.some(flow => flow.id === item.documentId) ? item.documentId : document?.folderId);
    return programSeriesVisibleInDocument(space, item, input.documentId) || members.has(item.lineId) || !!scopeId && selectedScopes.has(scopeId);
  });
  const warnings: string[] = [], rows = new Map<string, PrivateOutputRow>();
  if (metadata.length && !range) warnings.push('반복 규칙은 한 개의 할 일로 출력하지 않습니다. 회차를 내보내려면 조회 기간을 적용하고 회차를 선택하세요.');
  if (range) for (const flowRef of new Set(metadata.map(item => item.flowRef))) {
    const periods = [readProgramOccurrencePeriod(data, { actorId: input.actorId, flowRef, localToday: range.from, from: range.from, to: range.to })];
    if (range.includeUndated) periods.push(readProgramOccurrencePeriod(data, { actorId: input.actorId, flowRef, localToday: range.from, undatedOnly: true }));
    const source = resolveProgramExecutionSource(space, flowRef, data.public);
    if (!source.ok || periods.some(period => !period.ok)) return { ok: false as const, reason: 'occurrence-source-unavailable' as const };
    for (const period of periods) if (period.ok) {
      if (period.pendingStarts?.some(entry => metadata.some(item => item.itemRef === entry.itemRef))) warnings.push('시작일이 미정인 반복은 회차를 만들지 않았습니다. 개인 사본에서 날짜를 정한 뒤 출력할 수 있습니다.');
      if (period.truncated) warnings.push('원본의 안전한 회차 조회 상한에 닿았습니다. 표시된 회차만 선택할 수 있으며 반복 종료를 뜻하지 않습니다.');
      if (period.sourceConflictKeys.length) warnings.push('원본이 바뀐 이전 회차 기록은 출력에서 제외했습니다. 원본 비교에서 확인할 수 있습니다.');
      for (const row of period.rows) {
        if (!metadata.some(item => item.flowRef === flowRef && item.itemRef === row.sourceItemRef) || row.mapReviewHold || row.sourceConflict || row.flowInactive || row.participation !== 'included') continue;
        const attrs = source.contexts.get(row.sourceItemRef)?.attributes;
        const completionCriteria = attrs && 'completionCriteria' in attrs ? attrs.completionCriteria : undefined;
        const subchecks = attrs && 'subchecks' in attrs ? attrs.subchecks : undefined;
        const structured = source.kind === 'legacy' ? programStructuredRecurrence(source.contexts.get(row.sourceItemRef)) : undefined;
        // Keep authenticated structured provenance in the read-only output. Do
        // not invent authored properties, rewrite a source owner, or describe a
        // user's saved workout weekdays as the creator's fixed prescription.
        const sourceNotes = structured ? [structured.sourceTitle ? `원문: ${structured.sourceTitle}` : '',
          `일정 근거: ${structured.ruleBasis === 'saved-calendar-setting' ? '저장한 개인 캘린더 설정' : '원문의 반복 규칙'}`,
          structured.conversionNote ? `원문 구성 안내: ${structured.conversionNote}` : '',
          structured.warning ? `원문 주의: ${structured.warning}` : ''] : [];
        const publicOwner = row.identity.publicOwner;
        const scheduleVersion = publicOwner ? data.public.versions.find(version => version.id === publicOwner.scheduleVersionId && version.flowId === publicOwner.flowId) : undefined;
        // The public-copy reader already puts the accepted description in
        // row.memo, including personal-plan rows. Add provenance, not the same
        // prose again; never deduplicate text the author intentionally repeated.
        if (publicOwner && scheduleVersion) sourceNotes.push(`수용한 일정 판본: ${scheduleVersion.number}`, `원래 반복: ${programRecurringScheduleLabel(publicOwner.schedule)}`,
          `출처: ${scheduleVersion.source.label}`, scheduleVersion.source.url ?? '',
          completionCriteria ? `완료 기준: ${completionCriteria}` : '');
        const safe = (value: string | null | undefined) => value && classifyProgramUrl(value, []).kind !== 'invalid' ? value : null;
        const id = `occurrence:${row.key}`;
        const owners = metadata.filter(item => item.flowRef === flowRef && item.itemRef === row.sourceItemRef);
        const documents = owners.length === 1 ? [...space.text.documents, ...space.text.flows].filter(doc => doc.lines.some(line => line.id === owners[0].lineId)) : [];
        const executionKey = row.identity.publicOwner && !row.personalPlan ? programPublicCopyOutputTargetKey(row.identity) : programOccurrenceTargetKey(row);
        const returnTarget = documents.length === 1 && isProgramExecutionTargetKey(executionKey) ? { documentId: documents[0].id, executionKey } : undefined;
        rows.set(id, { id, kind: 'occurrence', title: `${row.title} · ${row.personalPlan ? `${row.originalDate} 개인 회차` : `${row.occurrenceIndex}회차`}`, date: row.executionDate,
          progress: row.completion === 'completed' ? 100 : 0, note: [row.memo, row.completedAt ? `완료 시각: ${row.completedAt}` : '', ...sourceNotes].filter(Boolean).join('\n'),
          // originalDate belongs to the expanded execution plan. A personally
          // rebuilt series has no one-to-one source occurrence date to invent.
          planDate: row.originalDate, time: row.time,
          ...(returnTarget ? { returnTarget } : {}),
          sourceDate: attrs?.resolvedDate ?? attrs?.date ?? source.flow.items.find(item => item.ref === row.sourceItemRef)?.sourceDate ?? null,
          sourceTime: attrs?.time ?? null, timeZone: row.timeZone ?? attrs?.timeZone ?? null,
          sourceUrl: safe(attrs?.sourceUrl ?? structured?.sourceUrl ?? scheduleVersion?.source.url), resourceUrl: safe(attrs?.resourceUrl),
          subchecks: (subchecks ?? []).map(check => ({ id: check.subcheckId, title: check.title })) });
      }
    }
  }
  return { ok: true as const, rows: [...rows.values()], hasRecurrences: metadata.length > 0, warnings: [...new Set(warnings)] };
}
