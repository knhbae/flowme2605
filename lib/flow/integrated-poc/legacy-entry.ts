import { createProgramData } from './program-data';
import { buildProgramCatalog } from './catalog';
import { hydrateProgramLegacy, inspectProgramLegacy } from './legacy-projection';
import type { PersonalWorkspacePocReadModel, PersonalWorkspacePocState } from '../personal-workspace-poc-contract';
import type { PersonalWorkspacePocSourceCandidateStore } from '../personal-workspace-poc-source-candidates';
import { inspectProgramLegacySnapshotPayload } from './legacy-snapshot';

export type ProgramLegacyInput = {
  baseModel: PersonalWorkspacePocReadModel;
  legacyState: PersonalWorkspacePocState;
  sourceCandidateStore?: PersonalWorkspacePocSourceCandidateStore;
  sourceLifecycle?: import('./legacy-source-lifecycle-contract').ProgramLegacySourceLifecycleStore;
  mapReview?: import('./legacy-map-review').ProgramLegacyMapReviewStore;
};
/** Read-only initial projection. The controller owns the first actual durable write. */
export function prepareProgramInitialData(input?: ProgramLegacyInput) {
  const data = createProgramData(), catalog = buildProgramCatalog('creator-minji');
  data.public.flows = catalog.flows; data.public.versions = catalog.versions;
  if (!input) return { data, legacyIssue: null, projected: false };
  const options = { sourceCandidateStore: input.sourceCandidateStore, ...(input.sourceLifecycle === undefined ? {} : { sourceLifecycle: input.sourceLifecycle }), ...(input.mapReview === undefined ? {} : { mapReview: input.mapReview }) };
  const inspected = inspectProgramLegacy(input.baseModel, input.legacyState, options);
  if (!inspected.ok) {
    const payload = { model: input.baseModel, state: input.legacyState, ...(input.sourceCandidateStore === undefined ? {} : { sourceCandidateStore: input.sourceCandidateStore }), ...(input.sourceLifecycle === undefined ? {} : { sourceLifecycle: input.sourceLifecycle }), ...(input.mapReview === undefined ? {} : { mapReview: input.mapReview }) };
    const checked = inspectProgramLegacySnapshotPayload(payload);
    if (!checked.ok) return { data, legacyIssue: checked.issues.map(issue => issue.code).join(', '), projected: false };
    const partial = hydrateProgramLegacy(data, input.baseModel, input.legacyState, { actorId: 'local-user', ...options, preserveUnsupported: true });
    if (partial.ok) return { data: partial.data, legacyIssue: inspected.issues.map(issue => issue.code).join(', '), projected: partial.changed };
    // Retain valid source even when its ordinary text representation is impossible.
    data.spaces['local-user'].legacySnapshot = { workspaceId: input.legacyState.workspaceId, revision: input.legacyState.revision, raw: checked.raw };
    return { data, legacyIssue: inspected.issues.map(issue => issue.code).join(', '), projected: false };
  }
  // Empty legacy workspaces do not need a permanent bridge marker.
  if (!inspected.flowCount && !inspected.quickItemCount) return { data, legacyIssue: null, projected: false };
  const result = hydrateProgramLegacy(data, input.baseModel, input.legacyState, { actorId: 'local-user', ...options });
  return result.ok ? { data: result.data, legacyIssue: null, projected: result.changed }
    : { data, legacyIssue: result.reason, projected: false };
}
