import { toPersonalWorkspacePocMapGroupRef, type PersonalWorkspacePocFlow, type PersonalWorkspacePocReadModel, type PersonalWorkspacePocState } from '../personal-workspace-poc-contract';
import { composePersonalWorkspacePocReadModel } from '../personal-workspace-poc-composition';
import { isPersonalWorkspacePocState, validatePersonalWorkspacePocStateReferences } from '../personal-workspace-poc-state';
import { buildPersonalWorkspacePocSourceReadIndex, readPersonalWorkspacePocTaskSourceContext } from '../personal-workspace-poc-source-attributes';
import type { ProgramLegacyItemContext } from './legacy-source-context';
import { projectProgramLegacySource, validateProgramLegacySourceLifecycle, type ProgramLegacySourceLifecycleStore } from './legacy-source-lifecycle-contract';
import { isPersonalWorkspacePocSourceCandidateStore, type PersonalWorkspacePocSourceCandidateStore } from '../personal-workspace-poc-source-candidates';
import { parsePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { programLegacyStructuredMapSourceFlows, projectProgramLegacyMapReviews, validateProgramLegacyMapReviews, type ProgramLegacyMapReviewStore } from './legacy-map-review';
import { validateProgramLegacyPlanSelections, type ProgramLegacyPlanSelections } from './program-legacy-plan-contract';
import { programLegacyMapPlanGroupsMatchSources } from './program-legacy-map-plan-contract';
import { validateProgramLegacyMapMembershipStore, type ProgramLegacyMapMembershipStore } from './legacy-map-membership-state';

export type ProgramLegacySnapshotPayload = {
  model: PersonalWorkspacePocReadModel;
  state: PersonalWorkspacePocState;
  sourceCandidateStore?: PersonalWorkspacePocSourceCandidateStore;
  sourceLifecycle?: ProgramLegacySourceLifecycleStore;
  mapReview?: ProgramLegacyMapReviewStore;
  planSelections?: ProgramLegacyPlanSelections;
  mapMembership?: ProgramLegacyMapMembershipStore;
};
export type ProgramLegacySnapshotIssue = {
  code: 'invalid-source' | 'invalid-state' | 'invalid-source-candidates' | 'invalid-map-group' | 'snapshot-limit';
  ref: string | null;
};
export const PROGRAM_LEGACY_SNAPSHOT_LIMIT = 10_000_000;
const reserved = new Set(['__proto__', 'prototype', 'constructor']);
const identifier = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 1200 && !reserved.has(value);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

/** Reject accessors, cycles, sparse arrays and anything JSON would silently
 * coerce/drop before a legacy owner validator can touch caller properties. */
function jsonTree(value: unknown, ancestors = new Set<object>()): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || ancestors.has(value) || Object.getOwnPropertySymbols(value).length) return false;
  if (!Array.isArray(value) && !record(value)) return false;
  ancestors.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors).filter(key => !Array.isArray(value) || key !== 'length');
  if (Array.isArray(value) && (keys.length !== value.length || keys.some((key, index) => key !== String(index)))) return false;
  for (const key of keys) {
    const entry = descriptors[key];
    if (reserved.has(key) || !entry.enumerable || !('value' in entry) || !jsonTree(entry.value, ancestors)) return false;
  }
  ancestors.delete(value); return true;
}

function mapIssues(flows: readonly PersonalWorkspacePocFlow[]): ProgramLegacySnapshotIssue[] {
  const groups = new Map<string, PersonalWorkspacePocFlow[]>(), issues: ProgramLegacySnapshotIssue[] = [];
  for (const flow of flows) {
    const group = flow.presentation?.mapGroup;
    if (!group) continue;
    if (!record(group) || !identifier(group.ownerId) || group.groupRef !== toPersonalWorkspacePocMapGroupRef(group.ownerId)
      || typeof group.title !== 'string' || !group.title.trim() || /[\r\n]/u.test(group.title)
      || !Number.isSafeInteger(group.childOrder) || group.childOrder < 0
      || !Number.isSafeInteger(group.childCount) || group.childCount < 1 || group.childOrder >= group.childCount
      || !['executable', 'review-hold'].includes(group.executionState)
      || !Array.isArray(group.reviewReasons) || group.reviewReasons.some(reason => typeof reason !== 'string')) {
      issues.push({ code: 'invalid-map-group', ref: flow.ref }); continue;
    }
    groups.set(group.groupRef, [...(groups.get(group.groupRef) ?? []), flow]);
  }
  for (const [ref, children] of groups) {
    const first = children[0].presentation!.mapGroup!;
    if (children.length !== first.childCount || new Set(children.map(flow => flow.presentation!.mapGroup!.childOrder)).size !== children.length
      || children.some(flow => {
        const group = flow.presentation!.mapGroup!;
        return group.ownerId !== first.ownerId || group.title !== first.title || group.childCount !== first.childCount
          || group.executionState !== first.executionState || JSON.stringify(group.reviewReasons) !== JSON.stringify(first.reviewReasons);
      })) issues.push({ code: 'invalid-map-group', ref });
  }
  return issues;
}

/** Structural/private-source validity only. Recurrence and review-held Maps
 * may be valid snapshots even when the new execution UI cannot project them.
 * No ProgramData dependency: safe for program-data's predicate import. */
export function inspectProgramLegacySnapshotPayload(value: unknown) {
  const fail = (code: ProgramLegacySnapshotIssue['code'], ref: string | null = null) => ({ ok: false as const, issues: [{ code, ref }] });
  try {
    if (!jsonTree(value) || !record(value)) return fail('invalid-source');
    if (!Object.hasOwn(value, 'model') || !Object.hasOwn(value, 'state')
      || Object.keys(value).some(key => !['model', 'state', 'sourceCandidateStore', 'sourceLifecycle', 'mapReview', 'planSelections', 'mapMembership'].includes(key))) return fail('invalid-source');
    const payload = value as ProgramLegacySnapshotPayload;
    const raw = JSON.stringify(payload);
    if (raw.length > PROGRAM_LEGACY_SNAPSHOT_LIMIT || new TextEncoder().encode(raw).length > PROGRAM_LEGACY_SNAPSHOT_LIMIT) return fail('snapshot-limit');
    if (!isPersonalWorkspacePocState(payload.state)) return fail('invalid-state');
    if (payload.mapReview !== undefined && !validateProgramLegacyMapReviews(payload.mapReview)) return fail('invalid-source');
    if (payload.planSelections !== undefined && !validateProgramLegacyPlanSelections(payload.planSelections)) return fail('invalid-source');
    const store = payload.sourceCandidateStore;
    if (store !== undefined && !isPersonalWorkspacePocSourceCandidateStore(store)) return fail('invalid-source-candidates');
    const source = buildPersonalWorkspacePocSourceReadIndex({ baseModel: payload.model, authoredFlows: payload.state.authoredFlows,
      ...(store === undefined ? {} : { sourceCandidateStore: store }) });
    if (!source.ok) return fail('invalid-source');
    if (!validateProgramLegacyMapMembershipStore(payload.mapMembership, payload.model.flows)) return fail('invalid-source-candidates');
    const sourceContextByFlow = new Map<string, Map<string, ProgramLegacyItemContext>>();
    const sourceComposed = composePersonalWorkspacePocReadModel(payload.model,
      payload.sourceLifecycle ? { ...payload.state, personalPlanOverlays: {} } : payload.state, store);
    if (!sourceComposed.ok) return fail('invalid-state');
    let composed = sourceComposed;
    for (const flow of sourceComposed.model.flows) {
      const context = readPersonalWorkspacePocTaskSourceContext(source.index, flow);
      if (!context.ok) return fail('invalid-source', flow.ref);
      sourceContextByFlow.set(flow.ref, new Map(context.itemContextByRef));
    }
    if (payload.sourceLifecycle !== undefined) {
      const originals = [...payload.model.flows, ...(payload.state.authoredFlows ?? [])];
      if (!validateProgramLegacySourceLifecycle(payload.sourceLifecycle, originals, sourceComposed.model.flows)) return fail('invalid-source-candidates');
      const flows = sourceComposed.model.flows.map(flow => {
        const owner = payload.sourceLifecycle!.owners[flow.ref];
        if (!owner) return flow;
        // The old local-fixture owner cannot be silently superseded by a new
        // typed owner: raw-only migrated revisions require an explicit mapping.
        if (store?.effectiveVersions[flow.ref] && !owner.mapping && !owner.partialMapping) throw new Error('legacy-source-mapping-required');
        const projected = projectProgramLegacySource(owner)!;
        sourceContextByFlow.set(flow.ref, projected.contexts);
        return projected.flow;
      });
      const personal = composePersonalWorkspacePocReadModel({ version: 1, flows }, { ...payload.state, authoredFlows: [] });
      if (!personal.ok) return fail('invalid-state');
      composed = personal;
    }
    // Old reference validation appends original authoredFlows after the read
    // model, so its flow map cannot see a Program-added source item. The exact
    // effective owner overlays were already checked by the old composition
    // function above (identity, every item ref, order and section capability).
    // Keep all remaining state/reference checks, excluding only those overlays
    // whose references are owned by the validated Program source projection.
    const referenceState = payload.sourceLifecycle ? { ...payload.state, personalPlanOverlays: Object.fromEntries(
      Object.entries(payload.state.personalPlanOverlays ?? {}).filter(([ref]) => !payload.sourceLifecycle!.owners[ref])) } : payload.state;
    if (!validatePersonalWorkspacePocStateReferences(referenceState, composed.model).ok) return fail('invalid-state');
    const issues = mapIssues(composed.model.flows);
    if (issues.length) return { ok: false as const, issues };
    // The existing store validator owns resolution identity and fingerprints.
    // Its exact accepted/previous source text must also remain parseable.
    for (const version of Object.values(store?.effectiveVersions ?? {})) {
      const texts = [version.sourceRevision.rawText, store!.envelopes[version.candidateId].mine.rawText];
      if (texts.some(text => parsePersonalWorkspacePocAuthoring(text).blockingIssues.length)) return fail('invalid-source-candidates', version.targetFlowRef);
    }
    // Review tokens use immutable source, never current personal title/memo/date.
    const mapSource = composePersonalWorkspacePocReadModel(payload.model, { ...payload.state, personalPlanOverlays: {} }, store);
    if (!mapSource.ok) return fail('invalid-source');
    // Effective structured provenance changes invalidate an older personal Map
    // review. Original operating snapshots and quality policy remain untouched.
    const mapSourceFlows = programLegacyStructuredMapSourceFlows(mapSource.model.flows, payload.sourceLifecycle);
    if (!programLegacyMapPlanGroupsMatchSources(payload.planSelections?.groups,mapSourceFlows)) return fail('invalid-source');
    const reviewedSource = projectProgramLegacyMapReviews(mapSourceFlows, payload.mapReview, payload.sourceLifecycle);
    const groups = new Map(reviewedSource.map(flow => [flow.ref, flow.presentation?.mapGroup]));
    const model = { ...composed.model, flows: composed.model.flows.map(flow => flow.presentation?.mapGroup && groups.get(flow.ref)
      ? { ...flow, presentation: { ...flow.presentation, mapGroup: { ...flow.presentation.mapGroup,
        executionState: groups.get(flow.ref)!.executionState, reviewReasons: groups.get(flow.ref)!.reviewReasons } } } : flow) };
    return { ok: true as const, payload, raw, model, mapSourceFlows, sourceIndex: source.index, sourceContextByFlow };
  } catch { return fail('invalid-source'); }
}

export function validateProgramLegacySnapshotPayload(value: unknown): value is ProgramLegacySnapshotPayload {
  return inspectProgramLegacySnapshotPayload(value).ok;
}
