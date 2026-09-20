import { previewProgramCreatorSource } from './creator-workspace';
import { planCreatorSourceOrder, validCreatorSourceIdentity, type ProgramCreatorSourceIdentity, type CreatorSourceOrderPlan } from './creator-source-order';
import type { ProgramCreatorWorking } from './creator-workspace-contract';
import type { DateOrderSelection } from './date-block-order';

/** Uses the actual result builder, never a second date or recurrence interpreter.
 * A visible month is a navigation window, not the end of a source's schedule.
 * Calendar alignment ranks each Item by its first eligible row across the built
 * result, as D2 does; recurrence rows never become duplicate source text. */
export function planCreatorCalendarSourceOrder(working: ProgramCreatorWorking, identity: ProgramCreatorSourceIdentity,
  stepLine: number, selection: DateOrderSelection, today: string, now: string): CreatorSourceOrderPlan {
  if (!validCreatorSourceIdentity(identity, working.rawText)) return { status:'blocked',reason:'invalid-identity' };
  const preview = previewProgramCreatorSource(working,today,now);
  // Native documents require the original align_source_order operation, not a
  // raw block rewrite that would discard canonical edits on the next sync.
  if (preview.kind === 'native') return {status:'blocked',reason:'native-calendar-operation-required'};
  if (!preview.materialized.ok || !preview.result?.ok) return {status:'blocked',reason:'calendar-result-unavailable'};
  const rows = preview.result.projection.items.filter(item => item.effectiveDate && item.timelinePolicy !== 'excluded').slice()
    .sort((left,right) => left.effectiveDate!.localeCompare(right.effectiveDate!)
      || Number(Boolean(left.time?.trim()))-Number(Boolean(right.time?.trim()))
      || (left.time?.trim() ?? '').localeCompare(right.time?.trim() ?? '')
      || left.planOrder-right.planOrder);
  if (rows.some(row => !row.sourceLine)) return {status:'blocked',reason:'calendar-source-unavailable'};
  return planCreatorSourceOrder(identity,stepLine,selection,{sourceFingerprint:identity.sourceFingerprint,
    sourceLines:[...new Set(rows.map(row => row.sourceLine!))]});
}
