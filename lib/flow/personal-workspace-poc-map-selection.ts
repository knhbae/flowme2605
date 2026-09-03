import {
  toPersonalWorkspacePocFlowRef,
  toPersonalWorkspacePocMapGroupRef,
  type PersonalWorkspacePocFlow,
  type PersonalWorkspacePocReadModel,
} from './personal-workspace-poc-contract';

export type PersonalWorkspacePocMapChild = Readonly<{
  flowRef: string;
  title: string;
  order: number;
}>;

export type PersonalWorkspacePocIntegratedFlowGroup = Readonly<{
  kind: 'flow' | 'map';
  groupRef: string;
  title: string;
  children: readonly PersonalWorkspacePocMapChild[];
}>;

export type PersonalWorkspacePocMapGroupCatalog = Readonly<{
  readModelFingerprint: string;
  groups: readonly PersonalWorkspacePocIntegratedFlowGroup[];
}>;

export type PersonalWorkspacePocMapGroupingFailureReason =
  | 'duplicate-flow-identity'
  | 'malformed-flow-identity'
  | 'missing-map-presentation'
  | 'foreign-map-presentation'
  | 'malformed-map-presentation'
  | 'map-child-count-mismatch'
  | 'map-child-order-mismatch'
  | 'unsupported-map-state'
  | 'map-review-hold';

export type PersonalWorkspacePocMapGroupingResult =
  | Readonly<{ ok: true; catalog: PersonalWorkspacePocMapGroupCatalog }>
  | Readonly<{
      ok: false;
      reason: PersonalWorkspacePocMapGroupingFailureReason;
      blockedGroupRef?: string;
      reviewReasons?: readonly string[];
    }>;

export type PersonalWorkspacePocIntegratedResultState = Readonly<{
  selectedGroupRef?: string;
  selectedFlowRef?: string;
  resultView: 'text' | 'todo' | 'calendar';
  openItemRef?: string | null;
  focusReturn?: Readonly<{ kind: 'flow-result-heading'; flowRef: string }>;
}>;

export type SelectPersonalWorkspacePocIntegratedFlowChild = Readonly<{
  type: 'select-integrated-flow-child';
  groupRef: string;
  childFlowRef: string;
  expectedReadModelFingerprint: string;
}>;

export type PersonalWorkspacePocMapSelectionFailureReason =
  | 'stale-read-model'
  | 'unsupported-group'
  | 'foreign-child';

export type PersonalWorkspacePocMapSelectionResult =
  | Readonly<{
      ok: true;
      changed: true;
      state: PersonalWorkspacePocIntegratedResultState;
    }>
  | Readonly<{
      ok: true;
      changed: false;
      reason: 'same-child';
      state: PersonalWorkspacePocIntegratedResultState;
    }>
  | Readonly<{
      ok: false;
      changed: false;
      reason: PersonalWorkspacePocMapSelectionFailureReason;
      state: PersonalWorkspacePocIntegratedResultState;
    }>;

function canonicalString(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.map(canonicalString).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => (
      `${JSON.stringify(key)}:${canonicalString(record[key])}`
    )).join(',')}}`;
  }
  return 'undefined';
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function buildFingerprint(model: PersonalWorkspacePocReadModel): string {
  return `personal-workspace-read-model:v1:${fnv1a(canonicalString({
    version: model.version,
    flows: model.flows.map((flow) => ({
      ref: flow.ref,
      savedCopyId: flow.savedCopyId,
      flowId: flow.flowId,
      title: flow.title,
      origin: flow.origin,
      mapGroup: flow.presentation?.mapGroup,
    })),
  }))}`;
}

function fail(
  reason: PersonalWorkspacePocMapGroupingFailureReason,
  options: { blockedGroupRef?: string; reviewReasons?: readonly string[] } = {},
): PersonalWorkspacePocMapGroupingResult {
  return {
    ok: false,
    reason,
    ...(options.blockedGroupRef ? { blockedGroupRef: options.blockedGroupRef } : {}),
    ...(options.reviewReasons ? { reviewReasons: options.reviewReasons } : {}),
  };
}

/**
 * Turns additive read-model hints into user-facing rows. It does not receive a
 * storage port, so grouping and flattening cannot persist source or selection.
 */
export function buildPersonalWorkspacePocMapGroupCatalog(
  model: PersonalWorkspacePocReadModel,
): PersonalWorkspacePocMapGroupingResult {
  const flowRefs = new Set<string>();
  const regularFlows: PersonalWorkspacePocFlow[] = [];
  const mapChildren = new Map<string, PersonalWorkspacePocFlow[]>();
  for (const flow of model.flows) {
    if (
      !flow.savedCopyId.trim()
      || !flow.flowId.trim()
      || !flow.title.trim()
      || flow.ref !== toPersonalWorkspacePocFlowRef(flow.savedCopyId, flow.flowId)
    ) return fail('malformed-flow-identity');
    if (flowRefs.has(flow.ref)) return fail('duplicate-flow-identity');
    flowRefs.add(flow.ref);
    const map = flow.presentation?.mapGroup;
    if (flow.origin === 'source-backed-map' && !map) return fail('missing-map-presentation');
    if (flow.origin !== 'source-backed-map' && map) return fail('foreign-map-presentation');
    if (!map) {
      regularFlows.push(flow);
      continue;
    }
    if (
      !map.groupRef.trim()
      || !map.ownerId.trim()
      || !map.title.trim()
      || map.groupRef !== toPersonalWorkspacePocMapGroupRef(map.ownerId)
      || !Number.isSafeInteger(map.childCount)
      || map.childCount < 1
      || !Number.isSafeInteger(map.childOrder)
      || map.childOrder < 0
      || map.childOrder >= map.childCount
      || !Array.isArray(map.reviewReasons)
      || map.reviewReasons.some((reason) => typeof reason !== 'string')
    ) return fail('malformed-map-presentation', { blockedGroupRef: map.groupRef });
    if (map.executionState !== 'executable' && map.executionState !== 'review-hold') {
      return fail('unsupported-map-state', { blockedGroupRef: map.groupRef });
    }
    if (map.executionState === 'review-hold') {
      return fail('map-review-hold', {
        blockedGroupRef: map.groupRef,
        reviewReasons: map.reviewReasons,
      });
    }
    const children = mapChildren.get(map.groupRef) ?? [];
    children.push(flow);
    mapChildren.set(map.groupRef, children);
  }

  const groups: PersonalWorkspacePocIntegratedFlowGroup[] = regularFlows.map((flow) => ({
    kind: 'flow',
    groupRef: flow.ref,
    title: flow.title,
    children: [{ flowRef: flow.ref, title: flow.title, order: 0 }],
  }));

  for (const [groupRef, flows] of mapChildren) {
    const baseline = flows[0].presentation?.mapGroup;
    if (!baseline) return fail('missing-map-presentation');
    if (flows.some((flow) => {
      const current = flow.presentation?.mapGroup;
      return !current
        || current.groupRef !== baseline.groupRef
        || current.ownerId !== baseline.ownerId
        || current.title !== baseline.title
        || current.childCount !== baseline.childCount
        || current.executionState !== baseline.executionState;
    })) return fail('malformed-map-presentation', { blockedGroupRef: groupRef });
    if (flows.length !== baseline.childCount) {
      return fail('map-child-count-mismatch', { blockedGroupRef: groupRef });
    }
    const children = flows
      .map((flow) => ({
        flowRef: flow.ref,
        title: flow.title,
        order: flow.presentation?.mapGroup?.childOrder ?? -1,
      }))
      .sort((left, right) => left.order - right.order || left.flowRef.localeCompare(right.flowRef));
    if (children.some((child, index) => child.order !== index)) {
      return fail('map-child-order-mismatch', { blockedGroupRef: groupRef });
    }
    if (children.length === 1) {
      const child = children[0];
      groups.push({
        kind: 'flow',
        groupRef: child.flowRef,
        title: child.title,
        children: [{ ...child, order: 0 }],
      });
    } else {
      groups.push({ kind: 'map', groupRef, title: baseline.title, children });
    }
  }

  groups.sort((left, right) => (
    left.title.localeCompare(right.title, 'ko') || left.groupRef.localeCompare(right.groupRef)
  ));
  return {
    ok: true,
    catalog: {
      readModelFingerprint: buildFingerprint(model),
      groups,
    },
  };
}

/** One reducer owns child change, Text reset, detail close, and focus return. */
export function reducePersonalWorkspacePocMapSelection(
  catalog: PersonalWorkspacePocMapGroupCatalog,
  state: PersonalWorkspacePocIntegratedResultState,
  transition: SelectPersonalWorkspacePocIntegratedFlowChild,
): PersonalWorkspacePocMapSelectionResult {
  if (transition.expectedReadModelFingerprint !== catalog.readModelFingerprint) {
    return { ok: false, changed: false, reason: 'stale-read-model', state };
  }
  const group = catalog.groups.find((candidate) => candidate.groupRef === transition.groupRef);
  if (!group || group.kind !== 'map') {
    return { ok: false, changed: false, reason: 'unsupported-group', state };
  }
  if (!group.children.some((child) => child.flowRef === transition.childFlowRef)) {
    return { ok: false, changed: false, reason: 'foreign-child', state };
  }
  if (
    state.selectedGroupRef === transition.groupRef
    && state.selectedFlowRef === transition.childFlowRef
  ) {
    return { ok: true, changed: false, reason: 'same-child', state };
  }
  return {
    ok: true,
    changed: true,
    state: {
      selectedGroupRef: transition.groupRef,
      selectedFlowRef: transition.childFlowRef,
      resultView: 'text',
      openItemRef: null,
      focusReturn: {
        kind: 'flow-result-heading',
        flowRef: transition.childFlowRef,
      },
    },
  };
}
