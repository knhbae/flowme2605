import type {
  PersonalWorkspacePocAuthoredFlow,
  PersonalWorkspacePocFlow,
  PersonalWorkspacePocPersonalPlanOverlay,
} from './personal-workspace-poc-contract';
import {
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
} from './personal-workspace-poc-contract';
import {
  isPersonalWorkspacePocSourceCandidateProjectedFlow,
  isPersonalWorkspacePocSourceCandidateStore,
  type PersonalWorkspacePocSourceCandidateProjectedFlow,
  type PersonalWorkspacePocSourceCandidateStore,
} from './personal-workspace-poc-source-candidates';

/**
 * A replaceable PoC adapter contract. It documents separation without
 * approving a production canonical schema or PublishedVersion owner.
 */
export const PERSONAL_WORKSPACE_POC_CANONICAL_OWNERSHIP_V1 = Object.freeze({
  version: 1 as const,
  adapterId: 'personal-workspace-poc-source-candidate-v1' as const,
  productionCanonicalApproved: false as const,
  canonicalPath: Object.freeze([
    'SourceRow',
    'Item',
    'Step',
    'Flow',
    'Bundle/Flow Map',
  ] as const),
  layers: Object.freeze({
    sourceSnapshot: Object.freeze({
      entity: 'SourceSnapshot' as const,
      readOwner: 'authoring-handoff-lineage',
      writeOwner: 'none',
      mutability: 'immutable' as const,
      derivation: 'exact-confirmed-source-bytes',
      pocImplemented: true,
    }),
    workingSource: Object.freeze({
      entity: 'WorkingSource' as const,
      readOwner: 'authoring-draft',
      writeOwner: 'authoring-draft',
      mutability: 'mutable' as const,
      derivation: 'user-edited-exact-working-copy',
      pocImplemented: true,
    }),
    canonical: Object.freeze({
      entity: 'canonical' as const,
      readOwner: 'poc-versioned-projection-adapter',
      writeOwner: 'none',
      mutability: 'derived' as const,
      derivation: 'SourceSnapshot-or-applied-source-version-to-stable-item-projection',
      pocImplemented: true,
    }),
    creatorDraft: Object.freeze({
      entity: 'CreatorDraft' as const,
      readOwner: 'creator-draft-library',
      writeOwner: 'creator-draft-library',
      mutability: 'mutable' as const,
      derivation: 'explicit-creator-save',
      pocImplemented: true,
    }),
    publishedVersion: Object.freeze({
      entity: 'PublishedVersion' as const,
      readOwner: 'none',
      writeOwner: 'none',
      mutability: 'unowned' as const,
      derivation: 'not-derived-in-this-poc',
      pocImplemented: false,
    }),
    personalOverlay: Object.freeze({
      entity: 'PersonalOverlay' as const,
      readOwner: 'personal-workspace-shadow',
      writeOwner: 'personal-workspace-shadow',
      mutability: 'mutable' as const,
      derivation: 'explicit-personal-edit-transition',
      pocImplemented: true,
    }),
    executionRun: Object.freeze({
      entity: 'ExecutionRun' as const,
      readOwner: 'personal-workspace-shadow',
      writeOwner: 'personal-workspace-shadow',
      mutability: 'mutable' as const,
      derivation: 'placement-completion-and-occurrence-transitions',
      pocImplemented: true,
    }),
    exportSnapshot: Object.freeze({
      entity: 'ExportSnapshot' as const,
      readOwner: 'none',
      writeOwner: 'none',
      mutability: 'unowned' as const,
      derivation: 'not-derived-in-this-poc',
      pocImplemented: false,
    }),
  }),
  sourceCandidateMayChange: Object.freeze([
    'source-revision',
    'source-projected-flow',
  ] as const),
  sourceCandidateMustPreserve: Object.freeze([
    'flow-ref',
    'mapped-item-ref',
    'personal-plan-overlay',
    'execution-placement',
    'completion',
    'occurrence',
    'folder-membership',
    'timeline-order',
  ] as const),
  unownedInThisPoc: Object.freeze([
    'production-canonical-adapter',
    'published-version',
    'export-snapshot',
    'provider-sync',
  ] as const),
});

export type PersonalWorkspacePocEffectiveSourceFlowResult = Readonly<
  | {
      ok: true;
      flow: PersonalWorkspacePocFlow;
      candidateId?: string;
    }
  | {
      ok: false;
      reason:
        | 'invalid-source-candidate-store'
        | 'unsupported-origin'
        | 'source-candidate-identity-mismatch';
    }
>;

export type PersonalWorkspacePocCanonicalProjectionMapping = Readonly<{
  version: 1;
  adapterId: typeof PERSONAL_WORKSPACE_POC_CANONICAL_OWNERSHIP_V1.adapterId;
  productionCanonicalApproved: false;
  flowRef: string;
  rows: readonly Readonly<{
    /** PoC key derived from source order; it is not a production SourceRow id. */
    sourceRowProjectionKey: string;
    itemRef: string;
    /** One derived execution step per current Item; not a persisted Step owner. */
    stepProjectionRef: string;
    flowRef: string;
    /** Bundle/Flow Map ownership is intentionally unresolved in this adapter. */
    bundleFlowMapRef: null;
  }>[];
}>;

export type PersonalWorkspacePocCanonicalProjectionMappingResult = Readonly<
  | { ok: true; mapping: PersonalWorkspacePocCanonicalProjectionMapping }
  | { ok: false; reason: 'unsupported-origin' | 'invalid-canonical-identity' }
>;

export type PersonalWorkspacePocEffectiveSourceFlowsResult = Readonly<
  | {
      ok: true;
      flows: readonly PersonalWorkspacePocFlow[];
    }
  | {
      ok: false;
      reason:
        | 'invalid-source-candidate-store'
        | 'duplicate-flow-identity'
        | 'missing-source-candidate-target'
        | 'unsupported-origin'
        | 'source-candidate-identity-mismatch';
    }
>;

export type PersonalWorkspacePocSourceVersionOverlayResult = Readonly<
  | { ok: true; overlay: PersonalWorkspacePocPersonalPlanOverlay }
  | {
      ok: false;
      reason: 'overlay-identity-mismatch' | 'foreign-overlay-item';
    }
>;

function identityMatches(
  base: PersonalWorkspacePocFlow,
  projected: PersonalWorkspacePocSourceCandidateProjectedFlow,
): boolean {
  if (base.ref !== projected.ref
    || base.savedCopyId !== projected.savedCopyId
    || base.flowId !== projected.flowId
    || projected.origin !== 'authoring-handoff') return false;
  const baseRefs = new Set(base.items.map((item) => item.ref));
  const projectedRefs = new Set<string>();
  for (const item of projected.items) {
    if (projectedRefs.has(item.ref)
      || item.savedCopyId !== base.savedCopyId
      || item.flowId !== base.flowId) return false;
    projectedRefs.add(item.ref);
  }
  // Existing references that remain after resolution must retain exact identity.
  return [...projectedRefs].every((ref) => (
    !baseRefs.has(ref)
      || base.items.some((item) => item.ref === ref && item.itemId
        === projected.items.find((candidate) => candidate.ref === ref)?.itemId)
  ));
}

function attachEffectiveAuthoringLineage(
  baseFlow: PersonalWorkspacePocAuthoredFlow,
  projected: PersonalWorkspacePocSourceCandidateProjectedFlow,
  effectiveVersion: PersonalWorkspacePocSourceCandidateStore['effectiveVersions'][string],
): PersonalWorkspacePocAuthoredFlow {
  const sourceRevision = effectiveVersion.sourceRevision;
  return {
    ...projected,
    authoring: {
      ...(baseFlow.authoring.source ? { source: baseFlow.authoring.source } : {}),
      handoffId: baseFlow.authoring.handoffId,
      documentId: baseFlow.authoring.documentId,
      revisionId: sourceRevision.revisionId,
      parseResultId: `poc-effective:${effectiveVersion.candidateId}`,
      sourceSnapshotId: sourceRevision.sourceSnapshotId,
      rawText: sourceRevision.rawText,
      sourceFingerprint: sourceRevision.sourceFingerprint,
      ...(baseFlow.authoring.templateId
        ? { templateId: baseFlow.authoring.templateId }
        : {}),
      committedAt: effectiveVersion.appliedAt,
    },
  };
}

export function buildPersonalWorkspacePocCanonicalProjectionMapping(
  flow: PersonalWorkspacePocFlow,
): PersonalWorkspacePocCanonicalProjectionMappingResult {
  if (flow.origin !== 'authoring-handoff') return { ok: false, reason: 'unsupported-origin' };
  if (flow.ref !== toPersonalWorkspacePocFlowRef(flow.savedCopyId, flow.flowId)) {
    return { ok: false, reason: 'invalid-canonical-identity' };
  }
  const itemRefs = new Set<string>();
  const sourceOrders = new Set<number>();
  for (const item of flow.items) {
    if (item.savedCopyId !== flow.savedCopyId
      || item.flowId !== flow.flowId
      || item.ref !== toPersonalWorkspacePocFlowItemRef(
        flow.savedCopyId,
        flow.flowId,
        item.itemId,
      )
      || itemRefs.has(item.ref)
      || !Number.isSafeInteger(item.sourceOrder)
      || item.sourceOrder < 0
      || sourceOrders.has(item.sourceOrder)) {
      return { ok: false, reason: 'invalid-canonical-identity' };
    }
    itemRefs.add(item.ref);
    sourceOrders.add(item.sourceOrder);
  }
  const rows = [...flow.items]
    .sort((left, right) => left.sourceOrder - right.sourceOrder)
    .map((item) => Object.freeze({
      sourceRowProjectionKey: `${flow.ref}:source-order:${item.sourceOrder}`,
      itemRef: item.ref,
      stepProjectionRef: `${item.ref}:poc-step-v1`,
      flowRef: flow.ref,
      bundleFlowMapRef: null,
    }));
  return {
    ok: true,
    mapping: Object.freeze({
      version: 1,
      adapterId: PERSONAL_WORKSPACE_POC_CANONICAL_OWNERSHIP_V1.adapterId,
      productionCanonicalApproved: false,
      flowRef: flow.ref,
      rows: Object.freeze(rows),
    }),
  };
}

export function getPersonalWorkspacePocEffectiveSourceFlow(
  baseFlow: PersonalWorkspacePocFlow,
  store: PersonalWorkspacePocSourceCandidateStore,
): PersonalWorkspacePocEffectiveSourceFlowResult {
  if (!isPersonalWorkspacePocSourceCandidateStore(store)) {
    return { ok: false, reason: 'invalid-source-candidate-store' };
  }
  const effectiveVersion = store.effectiveVersions[baseFlow.ref];
  if (!effectiveVersion) return { ok: true, flow: baseFlow };
  if (baseFlow.origin !== 'authoring-handoff') {
    return { ok: false, reason: 'unsupported-origin' };
  }
  const projected = effectiveVersion.projectedFlow;
  if (!isPersonalWorkspacePocSourceCandidateProjectedFlow(projected)
    || !identityMatches(baseFlow, projected)) {
    return { ok: false, reason: 'source-candidate-identity-mismatch' };
  }
  return {
    ok: true,
    flow: attachEffectiveAuthoringLineage(
      baseFlow as PersonalWorkspacePocAuthoredFlow,
      projected,
      effectiveVersion,
    ),
    candidateId: effectiveVersion.candidateId,
  };
}

/**
 * Apply this adapter after read-only origins and authored flows are combined,
 * and before the existing personal-plan overlay composer. The adapter has no
 * access to, and cannot mutate, folders, placements, completion or occurrences.
 */
export function composePersonalWorkspacePocEffectiveSourceFlows(
  flows: readonly PersonalWorkspacePocFlow[],
  store: PersonalWorkspacePocSourceCandidateStore,
): PersonalWorkspacePocEffectiveSourceFlowsResult {
  if (!isPersonalWorkspacePocSourceCandidateStore(store)) {
    return { ok: false, reason: 'invalid-source-candidate-store' };
  }
  const byRef = new Map<string, PersonalWorkspacePocFlow>();
  for (const flow of flows) {
    if (byRef.has(flow.ref)) return { ok: false, reason: 'duplicate-flow-identity' };
    byRef.set(flow.ref, flow);
  }
  for (const flowRef of Object.keys(store.effectiveVersions)) {
    if (!byRef.has(flowRef)) return { ok: false, reason: 'missing-source-candidate-target' };
  }
  const projected: PersonalWorkspacePocFlow[] = [];
  for (const flow of flows) {
    const result = getPersonalWorkspacePocEffectiveSourceFlow(flow, store);
    if (!result.ok) return result;
    projected.push(result.flow);
  }
  return { ok: true, flows: projected };
}

/**
 * Keeps an existing personal order authoritative and appends only newly
 * arrived source Items. It returns a projection and never mutates the stored
 * personal overlay.
 */
export function reconcilePersonalWorkspacePocPersonalPlanOverlayForSourceVersion(
  flow: PersonalWorkspacePocFlow,
  overlay: PersonalWorkspacePocPersonalPlanOverlay,
): PersonalWorkspacePocSourceVersionOverlayResult {
  if (overlay.flowRef !== flow.ref
    || overlay.savedCopyId !== flow.savedCopyId
    || overlay.flowId !== flow.flowId) {
    return { ok: false, reason: 'overlay-identity-mismatch' };
  }
  const flowRefs = new Set(flow.items.map((item) => item.ref));
  if (Object.keys(overlay.items).some((itemRef) => !flowRefs.has(itemRef))) {
    return { ok: false, reason: 'foreign-overlay-item' };
  }
  if (!overlay.orderedItemRefs) return { ok: true, overlay };
  if (new Set(overlay.orderedItemRefs).size !== overlay.orderedItemRefs.length
    || overlay.orderedItemRefs.some((itemRef) => !flowRefs.has(itemRef))) {
    return { ok: false, reason: 'foreign-overlay-item' };
  }
  const orderedSet = new Set(overlay.orderedItemRefs);
  const appendedRefs = flow.items
    .filter((item) => !orderedSet.has(item.ref))
    .sort((left, right) => left.sourceOrder - right.sourceOrder)
    .map((item) => item.ref);
  if (appendedRefs.length === 0
    && overlay.orderedItemRefs.length === flow.items.length) {
    return { ok: true, overlay };
  }
  return {
    ok: true,
    overlay: {
      ...overlay,
      orderedItemRefs: [...overlay.orderedItemRefs, ...appendedRefs],
    },
  };
}
