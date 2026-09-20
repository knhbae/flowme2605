import {
  PERSONAL_WORKSPACE_POC_VERSION, toPersonalWorkspacePocFlowItemRef, toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocAuthoredFlow, type PersonalWorkspacePocAuthoringParsedItemSnapshot,
  type PersonalWorkspacePocFlow, type PersonalWorkspacePocFlowItem, type PersonalWorkspacePocOrigin,
  type PersonalWorkspacePocReadModel,
} from './personal-workspace-poc-contract';
import { fingerprintPersonalWorkspacePocAuthoringSource } from './personal-workspace-poc-authoring';
import { isPersonalWorkspacePocAuthoredSourceFlow, isPersonalWorkspacePocDate } from './personal-workspace-poc-state';
import { composePersonalWorkspacePocEffectiveSourceFlows } from './personal-workspace-poc-canonical-ownership';
import type { PersonalWorkspacePocSourceCandidateStore } from './personal-workspace-poc-source-candidates';
import type {
  PersonalWorkspacePocAuthoringItemContext, PersonalWorkspacePocResultSourceAttributes,
  PersonalWorkspacePocResultSourceContract, PersonalWorkspacePocSourceFlowResolution,
  PersonalWorkspacePocSourceReadIndex, PersonalWorkspacePocSourceReadIndexResult,
} from './personal-workspace-poc-source-attributes-contract';
export type { PersonalWorkspacePocSourceReadIndex } from './personal-workspace-poc-source-attributes-contract';

type PersonalWorkspacePocResultSourceResolution =
  | Readonly<{
    ok: true;
    source: PersonalWorkspacePocResultSourceContract;
    itemContextByRef: ReadonlyMap<string, PersonalWorkspacePocAuthoringItemContext>;
  }>
  | Readonly<{ ok: false; reason: 'invalid-authoring-lineage' }>;

// Moved from Result without replacing its identity, snapshot or attribute
// validation with a new time parser. Full persisted-source validation is below.
const PERSONAL_WORKSPACE_POC_RESULT_SUPPORTED_ORIGINS = new Set<PersonalWorkspacePocOrigin>([
  'source-backed-map',
  'personal-draft',
  'canonical-personal-copy',
  'legacy-saved-plan',
  'authoring-handoff',
]);


function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isSupportedOrigin(value: unknown): value is PersonalWorkspacePocOrigin {
  return typeof value === 'string'
    && PERSONAL_WORKSPACE_POC_RESULT_SUPPORTED_ORIGINS.has(value as PersonalWorkspacePocOrigin);
}


function hasValidFlowShape(flow: PersonalWorkspacePocFlow): boolean {
  return isRecord(flow)
    && isNonEmptyString(flow.ref)
    && isNonEmptyString(flow.savedCopyId)
    && isNonEmptyString(flow.flowId)
    && isNonEmptyString(flow.sourceSlug)
    && isNonEmptyString(flow.title)
    && isSupportedOrigin(flow.origin)
    && Array.isArray(flow.items);
}

function hasValidItemShape(item: PersonalWorkspacePocFlowItem): boolean {
  return isRecord(item)
    && isNonEmptyString(item.ref)
    && isNonEmptyString(item.savedCopyId)
    && isNonEmptyString(item.flowId)
    && isNonEmptyString(item.itemId)
    && isNonEmptyString(item.title)
    && Number.isSafeInteger(item.sourceOrder)
    && item.sourceOrder >= 0
    && isOptionalString(item.description)
    && (item.sectionTitle === undefined || isNonEmptyString(item.sectionTitle))
    && (item.sourceDate === undefined || isPersonalWorkspacePocDate(item.sourceDate))
    && (item.sourceTimingLabel === undefined || isNonEmptyString(item.sourceTimingLabel));
}


function sourceAttributesFor(
  parsed: PersonalWorkspacePocAuthoringParsedItemSnapshot,
): PersonalWorkspacePocResultSourceAttributes {
  return {
    ...(parsed.description !== undefined ? { description: parsed.description } : {}),
    ...(parsed.additionalDescriptions !== undefined
      ? { additionalDescriptions: parsed.additionalDescriptions }
      : {}),
    ...(parsed.relativeDate !== undefined ? { relativeDate: parsed.relativeDate } : {}),
    ...(parsed.date !== undefined ? { date: parsed.date } : {}),
    ...(parsed.resolvedDate !== undefined ? { resolvedDate: parsed.resolvedDate } : {}),
    ...(parsed.time !== undefined ? { time: parsed.time } : {}),
    ...(parsed.timeZone !== undefined ? { timeZone: parsed.timeZone } : {}),
    ...(parsed.place !== undefined ? { place: parsed.place } : {}),
    ...(parsed.durationMinutes !== undefined ? { durationMinutes: parsed.durationMinutes } : {}),
    ...(parsed.resourceUrl !== undefined ? { resourceUrl: parsed.resourceUrl } : {}),
    ...(parsed.resourceLabel !== undefined ? { resourceLabel: parsed.resourceLabel } : {}),
    ...(parsed.sourceUrl !== undefined ? { sourceUrl: parsed.sourceUrl } : {}),
    ...(parsed.sourceLabel !== undefined ? { sourceLabel: parsed.sourceLabel } : {}),
    ...(parsed.recurrence !== undefined ? { recurrence: parsed.recurrence } : {}),
    ...(parsed.recurrenceEnd !== undefined ? { recurrenceEnd: parsed.recurrenceEnd } : {}),
    ...(parsed.completionCriteria !== undefined
      ? { completionCriteria: parsed.completionCriteria }
      : {}),
    ...(parsed.executionCondition !== undefined
      ? { executionCondition: parsed.executionCondition }
      : {}),
    ...(parsed.guide !== undefined ? { guide: parsed.guide } : {}),
    ...(parsed.caution !== undefined ? { caution: parsed.caution } : {}),
    ...(parsed.subchecks !== undefined ? { subchecks: parsed.subchecks } : {}),
    ...(parsed.sourceChecked !== undefined ? { sourceChecked: parsed.sourceChecked } : {}),
  };
}

function hasValidParsedItemSnapshot(
  value: unknown,
): value is PersonalWorkspacePocAuthoringParsedItemSnapshot {
  if (!isRecord(value)
    || !Number.isSafeInteger(value.sourceLine)
    || Number(value.sourceLine) < 1
    || !Number.isSafeInteger(value.sourceOrder)
    || Number(value.sourceOrder) < 0
    || !isNonEmptyString(value.title)
    || (value.sectionTitle !== undefined && !isNonEmptyString(value.sectionTitle))) return false;
  const stringsValid = [
    'description',
    'relativeDate',
    'date',
    'resolvedDate',
    'time',
    'timeZone',
    'place',
    'resourceUrl',
    'recurrence',
    'recurrenceEnd',
    'completionCriteria',
    'resourceLabel',
    'sourceUrl',
    'sourceLabel',
    'executionCondition',
    'guide',
    'caution',
  ].every((key) => isOptionalString(value[key]));
  if (!stringsValid
    || (value.sourceChecked !== undefined && typeof value.sourceChecked !== 'boolean')
    || (value.durationMinutes !== undefined
      && (!Number.isSafeInteger(value.durationMinutes) || Number(value.durationMinutes) < 1))
    || (value.additionalDescriptions !== undefined
      && (!Array.isArray(value.additionalDescriptions)
        || !value.additionalDescriptions.every((entry) => typeof entry === 'string')))
    || (value.subchecks !== undefined
      && (!Array.isArray(value.subchecks)
        || !value.subchecks.every((entry) => isRecord(entry)
          && isNonEmptyString(entry.subcheckId)
          && isNonEmptyString(entry.title)
          && typeof entry.sourceChecked === 'boolean')))) return false;
  return true;
}

function readSourceContractAndAttributes(
  flow: PersonalWorkspacePocFlow,
  sourceItemByRef: ReadonlyMap<string, PersonalWorkspacePocFlowItem>,
): PersonalWorkspacePocResultSourceResolution {
  const base = {
    origin: flow.origin,
    flowRef: flow.ref,
    savedCopyId: flow.savedCopyId,
    flowId: flow.flowId,
    sourceSlug: flow.sourceSlug,
    sourcePreserved: true as const,
    sourceMutationCount: 0 as const,
  };
  if (flow.origin !== 'authoring-handoff') {
    return {
      ok: true,
      source: { ...base, owner: 'saved-plan-read-model' },
      itemContextByRef: new Map(),
    };
  }

  const authored = flow as PersonalWorkspacePocAuthoredFlow;
  const lineage = authored.authoring as unknown;
  if (!isRecord(lineage)
    || !isNonEmptyString(lineage.handoffId)
    || !isNonEmptyString(lineage.documentId)
    || !isNonEmptyString(lineage.revisionId)
    || !isNonEmptyString(lineage.parseResultId)
    || !isNonEmptyString(lineage.sourceSnapshotId)
    || typeof lineage.rawText !== 'string'
    || !isNonEmptyString(lineage.sourceFingerprint)
    || fingerprintPersonalWorkspacePocAuthoringSource(lineage.rawText)
      !== lineage.sourceFingerprint) {
    return { ok: false, reason: 'invalid-authoring-lineage' };
  }

  const identityMap = lineage.sourceLineItemIdentityMap;
  const parsedItems = lineage.parsedItems;
  if ((identityMap === undefined) !== (parsedItems === undefined)) {
    return { ok: false, reason: 'invalid-authoring-lineage' };
  }

  const itemContextByRef = new Map<string, PersonalWorkspacePocAuthoringItemContext>();
  if (identityMap !== undefined && parsedItems !== undefined) {
    if (!isRecord(identityMap)
      || !Array.isArray(parsedItems)
      || !parsedItems.every(hasValidParsedItemSnapshot)) {
      return { ok: false, reason: 'invalid-authoring-lineage' };
    }
    const parsedByLine = new Map(
      parsedItems.map((parsed) => [String(parsed.sourceLine), parsed]),
    );
    if (parsedByLine.size !== parsedItems.length) {
      return { ok: false, reason: 'invalid-authoring-lineage' };
    }
    for (const [line, unknownIdentity] of Object.entries(identityMap)) {
      if (!isRecord(unknownIdentity)
        || String(unknownIdentity.sourceLine) !== line
        || !Number.isSafeInteger(unknownIdentity.sourceLine)
        || Number(unknownIdentity.sourceLine) < 1
        || !isNonEmptyString(unknownIdentity.itemRef)
        || unknownIdentity.savedCopyId !== flow.savedCopyId
        || unknownIdentity.flowId !== flow.flowId
        || !isNonEmptyString(unknownIdentity.itemId)
        || unknownIdentity.itemRef !== toPersonalWorkspacePocFlowItemRef(
          flow.savedCopyId,
          flow.flowId,
          unknownIdentity.itemId,
        )
        || !sourceItemByRef.has(unknownIdentity.itemRef)
        || itemContextByRef.has(unknownIdentity.itemRef)) {
        return { ok: false, reason: 'invalid-authoring-lineage' };
      }
      const parsed = parsedByLine.get(line);
      if (!parsed) return { ok: false, reason: 'invalid-authoring-lineage' };
      const sourceItem = sourceItemByRef.get(unknownIdentity.itemRef);
      if (!sourceItem
        || sourceItem.itemId !== unknownIdentity.itemId
        || sourceItem.sourceOrder !== parsed.sourceOrder) {
        return { ok: false, reason: 'invalid-authoring-lineage' };
      }
      itemContextByRef.set(unknownIdentity.itemRef, {
        sourceLine: parsed.sourceLine,
        attributes: sourceAttributesFor(parsed),
      });
    }
    if (itemContextByRef.size !== sourceItemByRef.size
      || parsedByLine.size !== sourceItemByRef.size) {
      return { ok: false, reason: 'invalid-authoring-lineage' };
    }
  }

  return {
    ok: true,
    source: {
      ...base,
      owner: 'authoring-working-source',
      authoring: {
        handoffId: lineage.handoffId,
        documentId: lineage.documentId,
        revisionId: lineage.revisionId,
        parseResultId: lineage.parseResultId,
        sourceSnapshotId: lineage.sourceSnapshotId,
        sourceFingerprint: lineage.sourceFingerprint,
        rawText: lineage.rawText,
        itemMapping: identityMap === undefined ? 'legacy-unavailable' : 'complete',
      },
    },
    itemContextByRef,
  };
}


type GoodResolution = Extract<PersonalWorkspacePocSourceFlowResolution, { ok: true }>;
type IndexedFlow = Readonly<{ flow: PersonalWorkspacePocFlow; bytes: string; resolution: GoodResolution }>;
const readIndexes = new WeakMap<PersonalWorkspacePocSourceReadIndex, ReadonlyMap<string, IndexedFlow>>();

function freezeCopy<T>(value: T): T {
  const copy = JSON.parse(JSON.stringify(value)) as T;
  function freeze(entry: unknown): void {
    if (entry && typeof entry === 'object') {
      Object.values(entry).forEach(freeze);
      Object.freeze(entry);
    }
  }
  freeze(copy);
  return copy;
}

function copyResolution(value: GoodResolution): GoodResolution {
  return {
    ok: true,
    source: value.source,
    sourceItemByRef: new Map(value.sourceItemByRef),
    itemContextByRef: new Map(value.itemContextByRef),
  };
}

/** The single owner of source Flow/Item shape and identity validation. */
function resolveSourceShape(flow: PersonalWorkspacePocFlow): PersonalWorkspacePocSourceFlowResolution {
  if (!hasValidFlowShape(flow)) {
    return { ok: false, reason: isRecord(flow) && isSupportedOrigin(flow.origin) ? 'invalid-model-shape' : 'unsupported-origin' };
  }
  if (flow.ref !== toPersonalWorkspacePocFlowRef(flow.savedCopyId, flow.flowId)) {
    return { ok: false, reason: 'malformed-flow-identity' };
  }
  const sourceItemByRef = new Map<string, PersonalWorkspacePocFlowItem>();
  for (const item of flow.items) {
    if (!hasValidItemShape(item)) return { ok: false, reason: 'invalid-model-shape' };
    if (sourceItemByRef.has(item.ref)) return { ok: false, reason: 'duplicate-item-identity' };
    if (item.ref !== toPersonalWorkspacePocFlowItemRef(item.savedCopyId, item.flowId, item.itemId)
      || item.savedCopyId !== flow.savedCopyId
      || item.flowId !== flow.flowId) return { ok: false, reason: 'malformed-item-identity' };
    sourceItemByRef.set(item.ref, item);
  }
  const resolution = readSourceContractAndAttributes(flow, sourceItemByRef);
  return resolution.ok ? {
    ok: true,
    source: freezeCopy(resolution.source),
    sourceItemByRef,
    itemContextByRef: new Map([...resolution.itemContextByRef].map(([ref, context]) => [ref, freezeCopy(context)])),
  } : resolution;
}

function resolveDirectSource(flow: PersonalWorkspacePocFlow): PersonalWorkspacePocSourceFlowResolution {
  const resolution = resolveSourceShape(flow);
  if (!resolution.ok) return resolution;
  // Use the existing raw re-materialization/fidelity validator, not just the
  // Result snapshot's string shape. Actual effective updates take the private
  // verified base+store construction path below instead of a trust flag.
  if (flow.origin === 'authoring-handoff' && !isPersonalWorkspacePocAuthoredSourceFlow(flow)) {
    return { ok: false, reason: 'invalid-authoring-lineage' };
  }
  return resolution;
}

/** Exact pre-personal source resolver used by Result; never writes or expands results. */
export function resolvePersonalWorkspacePocSourceFlow(
  flow: PersonalWorkspacePocFlow,
  sourceIndex?: PersonalWorkspacePocSourceReadIndex,
): PersonalWorkspacePocSourceFlowResolution {
  if (sourceIndex !== undefined) {
    const entry = readIndexes.get(sourceIndex)?.get(flow.ref);
    if (!entry || JSON.stringify(flow) !== entry.bytes) return { ok: false, reason: 'invalid-source-index' };
    return copyResolution(entry.resolution);
  }
  const resolution = resolveDirectSource(flow);
  if (!resolution.ok) return resolution;
  // Do not freeze or hand out references into caller-owned source values.
  return resolveSourceShape(freezeCopy(flow));
}

/**
 * Constructs a write-free, non-serializable source context from actual decoded
 * inputs. Source updates must come through the existing validated composer.
 * The opaque public handle contains no rawText, attributes or mutable Maps.
 */
export function buildPersonalWorkspacePocSourceReadIndex(input: Readonly<{
  baseModel: PersonalWorkspacePocReadModel;
  authoredFlows?: readonly PersonalWorkspacePocAuthoredFlow[];
  sourceCandidateStore?: PersonalWorkspacePocSourceCandidateStore;
}>): PersonalWorkspacePocSourceReadIndexResult {
  if (!isRecord(input.baseModel) || !Array.isArray(input.baseModel.flows)
    || (input.authoredFlows !== undefined && !Array.isArray(input.authoredFlows))) {
    return { ok: false, reason: 'invalid-model-shape' };
  }
  if (input.baseModel.version !== PERSONAL_WORKSPACE_POC_VERSION) return { ok: false, reason: 'invalid-model-version' };
  const originals = [...input.baseModel.flows, ...(input.authoredFlows ?? [])];
  const flowRefs = new Set<string>();
  const itemRefs = new Set<string>();
  for (const flow of originals) {
    const resolution = resolveDirectSource(flow);
    if (!resolution.ok) return resolution;
    if (flowRefs.has(flow.ref)) return { ok: false, reason: 'duplicate-flow-identity' };
    flowRefs.add(flow.ref);
    for (const ref of resolution.sourceItemByRef.keys()) {
      if (itemRefs.has(ref)) return { ok: false, reason: 'duplicate-item-identity' };
      itemRefs.add(ref);
    }
  }
  const effective = input.sourceCandidateStore === undefined
    ? { ok: true as const, flows: originals }
    : composePersonalWorkspacePocEffectiveSourceFlows(originals, input.sourceCandidateStore);
  if (!effective.ok) return effective;
  const entries = new Map<string, IndexedFlow>();
  const effectiveItemRefs = new Set<string>();
  for (const flow of effective.flows) {
    // A typed snapshot may never bypass the full persisted-source validator.
    // Current accepted updates intentionally have no typed snapshot/map.
    const typed = flow.origin === 'authoring-handoff'
      && ((flow as PersonalWorkspacePocAuthoredFlow).authoring.parsedItems !== undefined
        || (flow as PersonalWorkspacePocAuthoredFlow).authoring.sourceLineItemIdentityMap !== undefined);
    const result = typed ? resolveDirectSource(flow) : resolveSourceShape(flow);
    if (!result.ok) return result;
    const snapshot = freezeCopy(flow);
    const resolution = resolveSourceShape(snapshot);
    if (!resolution.ok) return resolution;
    for (const ref of resolution.sourceItemByRef.keys()) {
      if (effectiveItemRefs.has(ref)) return { ok: false, reason: 'duplicate-item-identity' };
      effectiveItemRefs.add(ref);
    }
    entries.set(flow.ref, { flow: snapshot, bytes: JSON.stringify(flow), resolution });
  }
  const index = Object.freeze({ version: 1 as const }) as PersonalWorkspacePocSourceReadIndex;
  readIndexes.set(index, entries);
  return { ok: true, index };
}

/** Personal title/order/date may differ; source lineage and exact membership may not. */
export function readPersonalWorkspacePocTaskSourceContext(
  sourceIndex: PersonalWorkspacePocSourceReadIndex,
  composedFlow: PersonalWorkspacePocFlow,
):
  | Readonly<{ ok: true; itemContextByRef: ReadonlyMap<string, PersonalWorkspacePocAuthoringItemContext> }>
  | Readonly<{ ok: false; reason: 'invalid-source-index' }> {
  const invalid = { ok: false as const, reason: 'invalid-source-index' as const };
  const entry = readIndexes.get(sourceIndex)?.get(composedFlow.ref);
  if (!entry || !hasValidFlowShape(composedFlow)
    || composedFlow.savedCopyId !== entry.flow.savedCopyId
    || composedFlow.flowId !== entry.flow.flowId
    || composedFlow.origin !== entry.flow.origin
    || composedFlow.sourceSlug !== entry.flow.sourceSlug
    || composedFlow.items.length !== entry.flow.items.length) return invalid;
  if (composedFlow.origin === 'authoring-handoff'
    && JSON.stringify((composedFlow as PersonalWorkspacePocAuthoredFlow).authoring)
      !== JSON.stringify((entry.flow as PersonalWorkspacePocAuthoredFlow).authoring)) return invalid;
  const refs = new Set<string>();
  for (const item of composedFlow.items) {
    const source = entry.resolution.sourceItemByRef.get(item.ref);
    if (!hasValidItemShape(item) || !source || refs.has(item.ref)
      || item.savedCopyId !== source.savedCopyId || item.flowId !== source.flowId || item.itemId !== source.itemId) return invalid;
    refs.add(item.ref);
  }
  return { ok: true, itemContextByRef: new Map(entry.resolution.itemContextByRef) };
}
