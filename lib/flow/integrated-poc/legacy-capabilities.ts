import { inspectProgramLegacySnapshotPayload, type ProgramLegacySnapshotPayload } from './legacy-snapshot';
import { readPersonalWorkspacePocTaskSourceContext } from '../personal-workspace-poc-source-attributes';
import { getPersonalWorkspacePocFlowItemFieldOwnership } from '../personal-workspace-poc-contract';
import { parsePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { parsePersonalWorkspacePocRecurrence, buildPersonalWorkspacePocOccurrenceSeriesId } from '../personal-workspace-poc-occurrence';
import { programLegacyArchivedSourceItem } from './legacy-source-lifecycle-contract';
import { programStructuredRecurrence } from './legacy-source-context';

export type ProgramLegacyItemCapability = 'ordinary' | 'series' | 'held' | 'unsupported';
export interface ProgramLegacyCapabilityItem { flowRef: string; savedCopyId: string; flowId: string; itemId: string; itemRef: string; seriesId: string | null; capability: ProgramLegacyItemCapability; reason: string | null }
/** Partition only after validating the WHOLE source and state; no filtered model is sent to old validators. */
export function partitionProgramLegacyCapabilities(payload: ProgramLegacySnapshotPayload) {
  const checked = inspectProgramLegacySnapshotPayload(payload);
  if (!checked.ok) return checked;
  const items: ProgramLegacyCapabilityItem[] = [];
  for (const flow of checked.model.flows) {
    const typed = checked.sourceContextByFlow.get(flow.ref);
    const context = typed ? { ok: true as const, itemContextByRef: typed } : readPersonalWorkspacePocTaskSourceContext(checked.sourceIndex, flow);
    if (!context.ok) return { ok: false as const, issues: [{ code: 'invalid-source' as const, ref: flow.ref }] };
    const effective = payload.sourceCandidateStore?.effectiveVersions[flow.ref];
    const missingRepeatMapping = !!effective && [effective.sourceRevision.rawText, payload.sourceCandidateStore!.envelopes[effective.candidateId].mine.rawText]
      .some(raw => parsePersonalWorkspacePocAuthoring(raw).items.some(item => item.recurrence))
      && context.itemContextByRef.size !== flow.items.length;
    for (const item of flow.items) {
      const archived = programLegacyArchivedSourceItem(payload.sourceLifecycle?.owners[flow.ref], item.ref);
      const attrs = context.itemContextByRef.get(item.ref)?.attributes;
      const structured = programStructuredRecurrence(context.itemContextByRef.get(item.ref));
      const held = flow.presentation?.mapGroup?.executionState === 'review-hold';
      const itemMappingMissing = missingRepeatMapping && !context.itemContextByRef.has(item.ref);
      const unsupported = itemMappingMissing || /[\r\n]/u.test(item.title) || !item.title.trim()
        || !structured && getPersonalWorkspacePocFlowItemFieldOwnership(item, flow.origin, flow).dateDerivation.strategy === 'unsupported-source-schedule';
      const occurrenceOwned = [...Object.values(payload.state.occurrencePlacements ?? {}), ...Object.values(payload.state.occurrenceCompletions ?? {})].some(entry => entry.sourceItemRef === item.ref);
      const rule = attrs?.recurrence ? parsePersonalWorkspacePocRecurrence({ recurrence: attrs.recurrence, ...(attrs.recurrenceEnd ? { recurrenceEnd: attrs.recurrenceEnd } : {}) }) : null;
      items.push({ flowRef: flow.ref, savedCopyId: item.savedCopyId, flowId: item.flowId, itemId: item.itemId, itemRef: item.ref,
        seriesId: structured?.series.seriesId ?? (rule?.ok ? buildPersonalWorkspacePocOccurrenceSeriesId(item.ref, rule.rule) : null),
        capability: held || archived ? 'held' : unsupported ? 'unsupported' : attrs?.recurrence || occurrenceOwned ? 'series' : 'ordinary',
        reason: held ? 'map-review-required' : archived ? 'source-item-execution-archived' : itemMappingMissing ? 'source-item-mapping-required' : unsupported ? 'unsupported-item' : attrs?.recurrence || occurrenceOwned ? 'recurrence-window-required' : null });
    }
  }
  return { ok: true as const, items, snapshotRaw: checked.raw };
}
