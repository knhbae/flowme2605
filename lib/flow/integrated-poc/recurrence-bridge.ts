import { inspectProgramLegacySnapshotPayload, type ProgramLegacySnapshotPayload } from './legacy-snapshot';
import { buildPersonalWorkspacePocResultProjection } from '../personal-workspace-poc-result-projection';
import { expandPersonalWorkspacePocOccurrences, type PersonalWorkspacePocOccurrenceManifest } from '../personal-workspace-poc-occurrence';
import { isPersonalWorkspacePocMemberInactive } from '../personal-workspace-poc-state';
import { resolveRoutineHorizon } from '../routine-horizon';
import type { FlowBundle } from '../types';
import { getPersonalWorkspacePocFlowItemFieldOwnership } from '../personal-workspace-poc-contract';
import { getPersonalWorkspacePocItemDetails } from '../personal-workspace-poc-item-details';
import type { PersonalWorkspacePocResultSourceAttributes } from '../personal-workspace-poc-source-attributes-contract';
import type { ProgramResolvedExecutionSource } from './execution-source';
import { programLegacySourceExecutionHandoff, programLegacyExecutionContexts } from './legacy-source-lifecycle-contract';
import type { ProgramOccurrenceIdentity } from './recurrence-state-contract';
import { creatorExecutionItemRef } from './creator-execution-contract';
import { programStructuredRecurrence } from './legacy-source-context';
import { expandProgramStructuredOccurrences, programStructuredOccurrenceOwner } from './structured-map-execution';

export interface ProgramRecurrenceWindow {
  finiteOffset?: number; finiteLimit?: number; windowOffsetWeeks?: number; windowWeeks?: number;
}
export interface ProgramRecurrenceRow {
  publicOwner?: ProgramOccurrenceIdentity['publicOwner'];
  publicExcluded?: boolean;
  structuredOwner?: ProgramOccurrenceIdentity['structuredOwner'];
  structuredSourceRule?: ProgramOccurrenceIdentity['sourceRule'];
  nativeOwner?: ProgramOccurrenceIdentity['nativeOwner'];
  creatorOwner?: ProgramOccurrenceIdentity['creatorOwner'];
  timeZone?: string | null;
  key: string; savedCopyId?: string; flowId?: string; itemId: string; sourceItemRef: string;
  occurrenceId: string; seriesId: string; occurrenceIndex: number;
  title: string; memo: string; time: string | null; originalDate: string; executionDate: string | null;
  executionScheduleMode: 'inherit' | 'fixed_date' | 'unscheduled';
  completion: 'unrecorded' | 'open' | 'completed'; completedAt: string | null;
  flowInactive: boolean; mapReviewHold: boolean;
}

/** Authored sources use the genuine materialized Flow and Program row owner,
 * never a synthetic saved-copy snapshot or legacy execution state. */
export function inspectProgramCreatorRecurrence(source: Extract<ProgramResolvedExecutionSource, { kind: 'creator' }>, window: ProgramRecurrenceWindow = {}): ProgramRecurrenceInspection {
  if (Object.keys(window).some(key => !['finiteOffset','finiteLimit','windowOffsetWeeks','windowWeeks'].includes(key))
    || !Number.isSafeInteger(window.finiteOffset ?? 0) || (window.finiteOffset ?? 0) < 0 || (window.finiteOffset ?? 0) > 10000
    || !Number.isSafeInteger(window.finiteLimit ?? 30) || (window.finiteLimit ?? 30) < 1 || (window.finiteLimit ?? 30) > 200
    || !Number.isSafeInteger(window.windowOffsetWeeks ?? 0) || (window.windowOffsetWeeks ?? 0) < 0 || (window.windowOffsetWeeks ?? 0) > 512
    || !Number.isSafeInteger(window.windowWeeks ?? 4) || (window.windowWeeks ?? 4) < 1 || (window.windowWeeks ?? 4) > 8) return { ok: false, reason: 'invalid-window' };
  const rows: ProgramRecurrenceRow[] = [], series: Extract<ProgramRecurrenceInspection, { ok: true }>['series'] = [];
  for (const binding of source.revision.rows.filter(row => row.kind === 'series')) {
    const item = source.flow.items.find(row => row.ref === binding.itemRef), attrs = source.contexts.get(binding.itemRef)?.attributes;
    const startDate = attrs?.resolvedDate ?? attrs?.date ?? item?.sourceDate;
    if (!item || !attrs?.recurrence || !startDate) return { ok: false, reason: 'missing-recurrence-source' };
    const executionItemRef = creatorExecutionItemRef(source.owner.id, binding.rowId);
    const expanded = expandPersonalWorkspacePocOccurrences({ sourceItemRef: executionItemRef, startDate, recurrence: attrs.recurrence,
      ...(attrs.recurrenceEnd ? { recurrenceEnd: attrs.recurrenceEnd } : {}), ...window });
    if (!expanded.ok) return expanded;
    series.push({ sourceItemRef: item.ref, startDate, manifest: expanded.manifest });
    for (const occurrence of expanded.manifest.rows) rows.push({ key: occurrence.occurrenceId,
      creatorOwner: { kind: 'creator', ownerId: source.owner.id, rowId: binding.rowId, executionItemRef },
      savedCopyId: item.savedCopyId, flowId: item.flowId, itemId: item.itemId, sourceItemRef: item.ref,
      occurrenceId: occurrence.occurrenceId, seriesId: occurrence.seriesId, occurrenceIndex: occurrence.occurrenceIndex,
      title: item.title, memo: item.description ?? '', time: attrs.time ?? null, timeZone: attrs.timeZone ?? null,
      originalDate: occurrence.originalDate, executionDate: occurrence.originalDate, executionScheduleMode: 'inherit',
      completion: 'unrecorded', completedAt: null, flowInactive: source.inactive, mapReviewHold: false });
  }
  return { ok: true, flowRef: source.flow.ref, sourceSnapshotRaw: source.revision.raw, rows, series, outsideWindowExceptionIds: [],
    calendar: [...new Set(rows.map(r => r.executionDate))].map(date => ({ date, occurrenceIds: rows.filter(r => r.executionDate === date).map(r => r.occurrenceId) })),
    unsupportedCapabilities: ['per-occurrence-hold', 'per-occurrence-exclusion', 'persist-expanded-window'] };
}
export type ProgramRecurrenceInspection = { ok: false; reason: string } | {
  ok: true; flowRef: string; sourceSnapshotRaw: string; rows: ProgramRecurrenceRow[];
  series: { sourceItemRef: string; startDate: string; manifest: PersonalWorkspacePocOccurrenceManifest }[];
  /** Valid definitions awaiting an explicit personal date, not corrupt payloads or executable undated occurrences. */
  pendingStarts?: { itemId: string; itemRef: string; title: string; documentId: string; lineId: string; reason: 'anchor-required' | 'start-required' }[];
  /** Existing exceptions outside the selected original-date page are retained, not reclassified as foreign. */
  outsideWindowExceptionIds: string[];
  calendar: { date: string | null; occurrenceIds: string[] }[];
  unsupportedCapabilities: readonly ['per-occurrence-hold', 'per-occurrence-exclusion', 'persist-expanded-window'];
};

/** Pure bounded read adapter. The existing source/projection contracts own dates and
 * recurrence grammar. A view window is never a repeat end or a new saved series. */
export function inspectProgramRecurrence(snapshot: ProgramLegacySnapshotPayload, input: {
  flowRef: string; localToday: string; window?: ProgramRecurrenceWindow;
  /** Only a genuine retained FlowBundle may supply its routine-duration policy. */
  horizonSource?: Pick<FlowBundle, 'flow' | 'repeatRules'>;
}): ProgramRecurrenceInspection {
  const fail = (reason: string): ProgramRecurrenceInspection => ({ ok: false, reason });
  const checked = inspectProgramLegacySnapshotPayload(snapshot);
  if (!checked.ok) return fail(checked.issues[0].code);
  const window = input.window ?? {};
  if (Object.keys(window).some(key => !['finiteOffset', 'finiteLimit', 'windowOffsetWeeks', 'windowWeeks'].includes(key))) return fail('invalid-window');
  const finiteOffset = window.finiteOffset ?? 0, finiteLimit = window.finiteLimit ?? 30;
  const windowOffsetWeeks = window.windowOffsetWeeks ?? 0;
  const windowWeeks = window.windowWeeks ?? (input.horizonSource ? resolveRoutineHorizon(input.horizonSource).previewWeeks : 4);
  if (!Number.isSafeInteger(finiteOffset) || finiteOffset < 0 || finiteOffset > 10000 || !Number.isSafeInteger(finiteLimit) || finiteLimit < 1 || finiteLimit > 200 ||
    !Number.isSafeInteger(windowOffsetWeeks) || windowOffsetWeeks < 0 || windowOffsetWeeks > 512 || !Number.isSafeInteger(windowWeeks) || windowWeeks < 1 || windowWeeks > 8) return fail('invalid-window');
  const flow = checked.model.flows.find(entry => entry.ref === input.flowRef);
  if (!flow) return fail('missing-flow');
  // Obtain canonical plan/title/memo facts through the existing calendar/result
  // projection. Keep execution exceptions in their original owner below; its
  // default first-page validator must not mistake a different read page for loss.
  const sourceTyped = checked.sourceContextByFlow.get(flow.ref);
  const typed = sourceTyped ? programLegacyExecutionContexts(snapshot.sourceLifecycle?.owners[flow.ref], sourceTyped) : undefined;
  const baseline = typed ? null : buildPersonalWorkspacePocResultProjection({ model: checked.model,
    state: { ...snapshot.state, occurrencePlacements: {}, occurrenceCompletions: {} },
    flowRef: flow.ref, localToday: input.localToday, sourceIndex: checked.sourceIndex, purpose: 'personal-execution' });
  if (baseline && !baseline.ok) return fail(baseline.reason);
  type Seed = { savedCopyId: string; flowId: string; itemId: string; title: string; memo?: string; time?: string; planDate?: string; sourceAttributes?: PersonalWorkspacePocResultSourceAttributes };
  const seeds = new Map<string, Seed>();
  const starts = new Map<string, string>();
  if (typed) {
    for (const item of flow.items) {
      const attrs = typed.get(item.ref)?.attributes; if (!attrs?.recurrence) continue;
      const ownership = getPersonalWorkspacePocFlowItemFieldOwnership(item, flow.origin, flow), overlay = snapshot.state.personalPlanOverlays?.[flow.ref]?.items[item.ref];
      const handedOff = programLegacySourceExecutionHandoff(snapshot.sourceLifecycle?.owners[flow.ref], item.ref);
      const structured = programStructuredRecurrence(typed.get(item.ref));
      const startDate = structured?.startDate ?? (!handedOff && overlay?.schedule?.mode === 'fixed_date' ? overlay.schedule.date : !handedOff && overlay?.schedule?.mode === 'unscheduled' ? undefined
        : ownership.date.source.value ?? ownership.dateDerivation.effectiveDate.value ?? item.sourceDate);
      if (!startDate || (!handedOff && (snapshot.state.placements[item.ref] || snapshot.state.completions[item.ref]))) return fail('invalid-occurrence-state');
      const details = getPersonalWorkspacePocItemDetails(flow, item);
      seeds.set(item.ref, { savedCopyId: item.savedCopyId, flowId: item.flowId, itemId: item.itemId, title: item.title,
        memo: overlay && Object.hasOwn(overlay, 'memo') ? overlay.memo : details.memo, time: attrs.time, planDate: startDate, sourceAttributes: attrs });
      starts.set(item.ref, startDate);
    }
  } else if (baseline?.ok) {
    for (const row of baseline.projection.items) if (row.occurrenceId && row.sourceItemRef && row.savedCopyId && row.flowId && row.itemId) {
      seeds.set(row.sourceItemRef, { ...row, savedCopyId: row.savedCopyId, flowId: row.flowId, itemId: row.itemId });
      if (row.originalOccurrenceDate && (!starts.has(row.sourceItemRef) || starts.get(row.sourceItemRef)! > row.originalOccurrenceDate)) starts.set(row.sourceItemRef, row.originalOccurrenceDate);
    }
  }
  const rows: ProgramRecurrenceRow[] = [], series: Extract<ProgramRecurrenceInspection, { ok: true }>['series'] = [];
  for (const [sourceItemRef, seed] of seeds) {
    const attributes = seed.sourceAttributes;
    if (!sourceItemRef || !attributes?.recurrence || !seed.planDate || !seed.savedCopyId || !seed.flowId || !seed.itemId) return fail('missing-recurrence-source');
    // The baseline contains several occurrences; original start is the earliest,
    // never whichever seed happens to be the last Map insertion.
    const startDate = starts.get(sourceItemRef)!;
    const structured = programStructuredRecurrence(typed?.get(sourceItemRef));
    const structuredSourceRule = structured ? { startDate: structured.startDate, recurrence: structured.sourceRepeatRule, recurrenceEnd: structured.endDate } : undefined;
    const expanded = structuredSourceRule ? expandProgramStructuredOccurrences({ sourceFlowRef: flow.ref, itemId: seed.itemId, sourceItemRef,
      sourceRule: structuredSourceRule }, { finiteOffset, finiteLimit, windowOffsetWeeks, windowWeeks }) : expandPersonalWorkspacePocOccurrences({ sourceItemRef, startDate, recurrence: attributes.recurrence,
      ...(attributes.recurrenceEnd ? { recurrenceEnd: attributes.recurrenceEnd } : {}), finiteOffset, finiteLimit, windowOffsetWeeks, windowWeeks });
    if (!expanded.ok) return fail(expanded.reason);
    series.push({ sourceItemRef, startDate, manifest: expanded.manifest });
    for (const occurrence of expanded.manifest.rows) {
      const placement = snapshot.state.occurrencePlacements?.[occurrence.occurrenceId];
      const completion = snapshot.state.occurrenceCompletions?.[occurrence.occurrenceId];
      if ([placement, completion].some(value => value && (value.sourceItemRef !== sourceItemRef || value.originalDate !== occurrence.originalDate))) return fail('foreign-occurrence');
      rows.push({ key: JSON.stringify([seed.savedCopyId, seed.flowId, seed.itemId, occurrence.occurrenceId]),
        ...(structured ? { structuredOwner: programStructuredOccurrenceOwner(structured), structuredSourceRule } : {}),
        savedCopyId: seed.savedCopyId, flowId: seed.flowId, itemId: seed.itemId, sourceItemRef,
        occurrenceId: occurrence.occurrenceId, seriesId: occurrence.seriesId, occurrenceIndex: occurrence.occurrenceIndex,
        title: seed.title, memo: seed.memo ?? '', time: seed.time ?? null, timeZone: seed.sourceAttributes?.timeZone ?? null, originalDate: occurrence.originalDate,
        executionDate: placement?.scheduleMode === 'unscheduled' ? null : placement?.date ?? occurrence.originalDate,
        executionScheduleMode: placement?.scheduleMode ?? 'inherit', completion: completion?.status ?? 'unrecorded', completedAt: completion?.completedAt ?? null,
        flowInactive: isPersonalWorkspacePocMemberInactive(snapshot.state, flow.ref), mapReviewHold: flow.presentation?.mapGroup?.executionState === 'review-hold' });
    }
  }
  const refs = new Set(seeds.keys()), visible = new Set(rows.map(row => row.occurrenceId));
  const outsideWindowExceptionIds = [...new Set([...Object.values(snapshot.state.occurrencePlacements ?? {}), ...Object.values(snapshot.state.occurrenceCompletions ?? {})]
    .filter(entry => refs.has(entry.sourceItemRef) && !visible.has(entry.occurrenceId)).map(entry => entry.occurrenceId))];
  const dates = new Map<string | null, string[]>();
  for (const row of rows) dates.set(row.executionDate, [...(dates.get(row.executionDate) ?? []), row.occurrenceId]);
  return { ok: true, flowRef: flow.ref, sourceSnapshotRaw: checked.raw, rows, series, outsideWindowExceptionIds,
    calendar: [...dates].map(([date, occurrenceIds]) => ({ date, occurrenceIds })),
    unsupportedCapabilities: ['per-occurrence-hold', 'per-occurrence-exclusion', 'persist-expanded-window'] };
}
