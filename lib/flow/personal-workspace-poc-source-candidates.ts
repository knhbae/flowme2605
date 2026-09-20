import {
  PERSONAL_WORKSPACE_POC_STORAGE_PREFIX,
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocAuthoredFlow,
  type PersonalWorkspacePocFlow,
  type PersonalWorkspacePocFlowItem,
  type PersonalWorkspacePocFlowSection,
} from './personal-workspace-poc-contract';
import {
  fingerprintPersonalWorkspacePocAuthoringSource,
  getPersonalWorkspacePocAuthoringTemplate,
  materializePersonalWorkspacePocAuthoring,
} from './personal-workspace-poc-authoring';

export const PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_VERSION = 1 as const;
export const PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY =
  `${PERSONAL_WORKSPACE_POC_STORAGE_PREFIX}source-candidates`;

/**
 * This fingerprint is deterministic and browser-synchronous for the isolated
 * PoC. It detects accidental or local payload tampering, but is deliberately
 * not presented as a cryptographic or security signature.
 */
export const PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_FINGERPRINT_ALGORITHM =
  'poc-deterministic-v1' as const;

export type PersonalWorkspacePocSourceCandidateProjectedItem = Readonly<
  Omit<PersonalWorkspacePocFlowItem, 'fieldOwnership'>
>;

export type PersonalWorkspacePocSourceCandidateProjectedFlow = Readonly<
  Omit<
    PersonalWorkspacePocFlow,
    'origin' | 'fieldOwnership' | 'presentation' | 'items'
  > & {
    origin: 'authoring-handoff';
    items: readonly PersonalWorkspacePocSourceCandidateProjectedItem[];
  }
>;

export type PersonalWorkspacePocSourceCandidateCurrentSource = Readonly<{
  revisionId: string;
  sourceSnapshotId: string;
  sourceFingerprint: string;
  rawText: string;
  projectedFlow: PersonalWorkspacePocSourceCandidateProjectedFlow;
}>;

export type PersonalWorkspacePocSourceCandidateChange = Readonly<{
  changeId: string;
  scope: 'flow' | 'item';
  kind: 'modified' | 'added' | 'removed';
  itemRef?: string;
}>;

export type PersonalWorkspacePocSourceCandidateEnvelope = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_VERSION;
  candidateId: string;
  target: Readonly<{
    origin: 'authoring-handoff';
    flowRef: string;
    savedCopyId: string;
    flowId: string;
    handoffId: string;
  }>;
  base: PersonalWorkspacePocSourceCandidateCurrentSource;
  mine: PersonalWorkspacePocSourceCandidateCurrentSource;
  incoming: PersonalWorkspacePocSourceCandidateCurrentSource;
  changes: readonly PersonalWorkspacePocSourceCandidateChange[];
  provenance: Readonly<{
    kind: 'local-fixture';
    fixtureId: string;
  }>;
  createdAt: string;
  tamperFingerprint: string;
}>;

export type PersonalWorkspacePocSourceCandidateResolution =
  | 'keep-mine'
  | 'use-incoming';

export type PersonalWorkspacePocSourceCandidateReview = Readonly<{
  candidateId: string;
  status: 'pending' | 'deferred' | 'applied';
  expectedRevisionId: string;
  expectedSourceFingerprint: string;
  expectedProjectionFingerprint: string;
  resolutions: Readonly<Record<string, PersonalWorkspacePocSourceCandidateResolution>>;
  stagedAt: string;
  updatedAt: string;
}>;

export type PersonalWorkspacePocEffectiveSourceVersion = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_VERSION;
  candidateId: string;
  targetFlowRef: string;
  sourceRevision: PersonalWorkspacePocSourceCandidateCurrentSource;
  projectedFlow: PersonalWorkspacePocSourceCandidateProjectedFlow;
  /** Source-deleted Items retained so personal overlay/run references remain valid. */
  retainedItemRefs: readonly string[];
  resolutionFingerprint: string;
  appliedAt: string;
}>;

export type PersonalWorkspacePocSourceCandidateUndo = Readonly<{
  candidateId: string;
  flowRef: string;
  previousReview: PersonalWorkspacePocSourceCandidateReview;
  previousEffectiveVersion?: PersonalWorkspacePocEffectiveSourceVersion;
  createdAt: string;
}>;

export type PersonalWorkspacePocSourceCandidateStore = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_VERSION;
  revision: number;
  envelopes: Readonly<Record<string, PersonalWorkspacePocSourceCandidateEnvelope>>;
  reviews: Readonly<Record<string, PersonalWorkspacePocSourceCandidateReview>>;
  effectiveVersions: Readonly<Record<string, PersonalWorkspacePocEffectiveSourceVersion>>;
  undo?: PersonalWorkspacePocSourceCandidateUndo;
  updatedAt: string;
}>;

export type PersonalWorkspacePocSourceCandidateTransitionCode =
  | 'staged'
  | 'resumed'
  | 'already-staged'
  | 'resolved'
  | 'resolution-cleared'
  | 'deferred'
  | 'applied'
  | 'undone'
  | 'no-op'
  | 'not-found'
  | 'invalid-store'
  | 'invalid-envelope'
  | 'tampered-candidate'
  | 'unsupported-origin'
  | 'stale-source'
  | 'candidate-deferred'
  | 'already-applied'
  | 'unresolved'
  | 'invalid-change'
  | 'no-undo';

export type PersonalWorkspacePocSourceCandidateTransitionResult = Readonly<{
  changed: boolean;
  code: PersonalWorkspacePocSourceCandidateTransitionCode;
  store: PersonalWorkspacePocSourceCandidateStore;
  effectiveFlow?: PersonalWorkspacePocSourceCandidateProjectedFlow;
}>;

export type PersonalWorkspacePocSourceCandidateEnvelopeResult =
  | Readonly<{
      ok: true;
      envelope: PersonalWorkspacePocSourceCandidateEnvelope;
      current: PersonalWorkspacePocSourceCandidateCurrentSource;
    }>
  | Readonly<{
      ok: false;
      reason:
        | 'unsupported-origin'
        | 'invalid-current-source'
        | 'invalid-incoming-source'
        | 'no-source-change';
    }>;

type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | Readonly<{ [key: string]: JsonValue }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string'
    && !Number.isNaN(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (!isRecord(value)) return false;
  return Object.values(value).every((entry) => entry !== undefined && isJsonValue(entry));
}

function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Readonly<Record<string, JsonValue>>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`;
}

function deterministicTextFingerprint(value: string): string {
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    left ^= code;
    left = Math.imul(left, 0x01000193);
    right ^= code + index;
    right = Math.imul(right, 0x85ebca6b);
    right ^= right >>> 13;
  }
  const hex = (part: number) => (part >>> 0).toString(16).padStart(8, '0');
  return `${PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_FINGERPRINT_ALGORITHM}:${value.length}:${hex(left)}${hex(right)}`;
}

export function fingerprintPersonalWorkspacePocSourceCandidateValue(value: unknown): string {
  if (!isJsonValue(value)) throw new TypeError('non-json-source-candidate-value');
  return deterministicTextFingerprint(canonicalJson(value));
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function projectItem(
  item: PersonalWorkspacePocFlowItem,
): PersonalWorkspacePocSourceCandidateProjectedItem {
  return {
    ref: item.ref,
    savedCopyId: item.savedCopyId,
    flowId: item.flowId,
    itemId: item.itemId,
    title: item.title,
    ...(item.description !== undefined ? { description: item.description } : {}),
    ...(item.sectionId !== undefined ? { sectionId: item.sectionId } : {}),
    ...(item.sectionTitle !== undefined ? { sectionTitle: item.sectionTitle } : {}),
    sourceOrder: item.sourceOrder,
    ...(item.sourceDate !== undefined ? { sourceDate: item.sourceDate } : {}),
    ...(item.sourceTimingLabel !== undefined
      ? { sourceTimingLabel: item.sourceTimingLabel }
      : {}),
  };
}

function projectFlow(flow: PersonalWorkspacePocFlow): PersonalWorkspacePocSourceCandidateProjectedFlow {
  return {
    ref: flow.ref,
    savedCopyId: flow.savedCopyId,
    flowId: flow.flowId,
    sourceSlug: flow.sourceSlug,
    title: flow.title,
    origin: 'authoring-handoff',
    ...(flow.anchorDate !== undefined ? { anchorDate: flow.anchorDate } : {}),
    ...(flow.sections !== undefined
      ? { sections: flow.sections.map((section) => ({ ...section })) }
      : {}),
    items: flow.items.map(projectItem),
  };
}

function isSection(value: unknown): value is PersonalWorkspacePocFlowSection {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'sectionId',
      'title',
      'sourceOrder',
      'titleOwner',
      'editCapability',
    ])
    && isNonEmptyString(value.sectionId)
    && isNonEmptyString(value.title)
    && Number.isSafeInteger(value.sourceOrder)
    && Number(value.sourceOrder) >= 0
    && (value.titleOwner === 'source'
      || value.titleOwner === 'authoring'
      || value.titleOwner === 'existing-personal')
    && (value.editCapability === 'read-only' || value.editCapability === 'poc-shadow');
}

function isProjectedItem(
  value: unknown,
  flow: Readonly<{ savedCopyId: string; flowId: string }>,
): value is PersonalWorkspacePocSourceCandidateProjectedItem {
  if (!isRecord(value)
    || !hasOnlyKeys(value, [
      'ref',
      'savedCopyId',
      'flowId',
      'itemId',
      'title',
      'description',
      'sectionId',
      'sectionTitle',
      'sourceOrder',
      'sourceDate',
      'sourceTimingLabel',
    ])
    || value.savedCopyId !== flow.savedCopyId
    || value.flowId !== flow.flowId
    || !isNonEmptyString(value.itemId)
    || value.ref !== toPersonalWorkspacePocFlowItemRef(
      flow.savedCopyId,
      flow.flowId,
      value.itemId,
    )
    || !isNonEmptyString(value.title)
    || !Number.isSafeInteger(value.sourceOrder)
    || Number(value.sourceOrder) < 0) return false;
  return (value.description === undefined || typeof value.description === 'string')
    && (value.sectionId === undefined || isNonEmptyString(value.sectionId))
    && (value.sectionTitle === undefined || isNonEmptyString(value.sectionTitle))
    && (value.sourceDate === undefined || /^\d{4}-\d{2}-\d{2}$/u.test(String(value.sourceDate)))
    && (value.sourceTimingLabel === undefined || isNonEmptyString(value.sourceTimingLabel));
}

export function isPersonalWorkspacePocSourceCandidateProjectedFlow(
  value: unknown,
): value is PersonalWorkspacePocSourceCandidateProjectedFlow {
  if (!isRecord(value)
    || !hasOnlyKeys(value, [
      'ref',
      'savedCopyId',
      'flowId',
      'sourceSlug',
      'title',
      'origin',
      'anchorDate',
      'sections',
      'items',
    ])
    || value.origin !== 'authoring-handoff'
    || !isNonEmptyString(value.ref)
    || !isNonEmptyString(value.savedCopyId)
    || !isNonEmptyString(value.flowId)
    || !isNonEmptyString(value.sourceSlug)
    || !isNonEmptyString(value.title)
    || value.ref !== toPersonalWorkspacePocFlowRef(value.savedCopyId, value.flowId)
    || (value.anchorDate !== undefined
      && !/^\d{4}-\d{2}-\d{2}$/u.test(String(value.anchorDate)))
    || !Array.isArray(value.items)
    || (value.sections !== undefined && !Array.isArray(value.sections))) return false;
  const sections = value.sections ?? [];
  if (!sections.every(isSection)) return false;
  const sectionIds = new Set(sections.map((section) => section.sectionId));
  const sectionOrders = new Set(sections.map((section) => section.sourceOrder));
  if (sectionIds.size !== sections.length || sectionOrders.size !== sections.length) return false;
  const flowIdentity = {
    savedCopyId: value.savedCopyId,
    flowId: value.flowId,
  };
  const refs = new Set<string>();
  const orders = new Set<number>();
  for (const item of value.items) {
    if (!isProjectedItem(item, flowIdentity)
      || refs.has(item.ref)
      || orders.has(item.sourceOrder)) return false;
    if (item.sectionId !== undefined && !sectionIds.has(item.sectionId)) return false;
    if (item.sectionId !== undefined
      && item.sectionTitle !== sections.find((section) => (
        section.sectionId === item.sectionId
      ))?.title) return false;
    refs.add(item.ref);
    orders.add(item.sourceOrder);
  }
  return true;
}

function isCurrentSource(value: unknown): value is PersonalWorkspacePocSourceCandidateCurrentSource {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'revisionId',
      'sourceSnapshotId',
      'sourceFingerprint',
      'rawText',
      'projectedFlow',
    ])
    && isNonEmptyString(value.revisionId)
    && isNonEmptyString(value.sourceSnapshotId)
    && typeof value.rawText === 'string'
    && value.sourceFingerprint === fingerprintPersonalWorkspacePocAuthoringSource(value.rawText)
    && isPersonalWorkspacePocSourceCandidateProjectedFlow(value.projectedFlow);
}

function sourceMatchesTarget(
  source: PersonalWorkspacePocSourceCandidateCurrentSource,
  target: PersonalWorkspacePocSourceCandidateEnvelope['target'],
): boolean {
  return source.projectedFlow.ref === target.flowRef
    && source.projectedFlow.savedCopyId === target.savedCopyId
    && source.projectedFlow.flowId === target.flowId
    && source.projectedFlow.origin === target.origin;
}

function sourceProjectionFingerprint(
  source: PersonalWorkspacePocSourceCandidateCurrentSource,
): string {
  return fingerprintPersonalWorkspacePocSourceCandidateValue({
    revisionId: source.revisionId,
    sourceSnapshotId: source.sourceSnapshotId,
    sourceFingerprint: source.sourceFingerprint,
    rawText: source.rawText,
    projectedFlow: source.projectedFlow,
  });
}

function flowMetadata(flow: PersonalWorkspacePocSourceCandidateProjectedFlow): JsonValue {
  return {
    title: flow.title,
    anchorDate: flow.anchorDate ?? null,
    sections: (flow.sections ?? []) as unknown as JsonValue,
  };
}

function buildChanges(
  candidateId: string,
  mine: PersonalWorkspacePocSourceCandidateProjectedFlow,
  incoming: PersonalWorkspacePocSourceCandidateProjectedFlow,
): readonly PersonalWorkspacePocSourceCandidateChange[] {
  const changes: PersonalWorkspacePocSourceCandidateChange[] = [];
  if (canonicalJson(flowMetadata(mine)) !== canonicalJson(flowMetadata(incoming))) {
    changes.push({
      changeId: `change-${deterministicTextFingerprint(`${candidateId}:flow`).slice(-16)}`,
      scope: 'flow',
      kind: 'modified',
    });
  }
  const mineByRef = new Map(mine.items.map((item) => [item.ref, item]));
  const incomingByRef = new Map(incoming.items.map((item) => [item.ref, item]));
  const refs = [...new Set([...mineByRef.keys(), ...incomingByRef.keys()])].sort();
  for (const itemRef of refs) {
    const mineItem = mineByRef.get(itemRef);
    const incomingItem = incomingByRef.get(itemRef);
    let kind: PersonalWorkspacePocSourceCandidateChange['kind'] | undefined;
    if (!mineItem) kind = 'added';
    else if (!incomingItem) kind = 'removed';
    else if (canonicalJson(mineItem as unknown as JsonValue)
      !== canonicalJson(incomingItem as unknown as JsonValue)) kind = 'modified';
    if (kind) {
      changes.push({
        changeId: `change-${deterministicTextFingerprint(`${candidateId}:item:${kind}:${itemRef}`).slice(-16)}`,
        scope: 'item',
        kind,
        itemRef,
      });
    }
  }
  return changes;
}

function envelopePayload(
  envelope: Omit<PersonalWorkspacePocSourceCandidateEnvelope, 'tamperFingerprint'>,
): JsonValue {
  return envelope as unknown as JsonValue;
}

function fingerprintEnvelope(
  envelope: Omit<PersonalWorkspacePocSourceCandidateEnvelope, 'tamperFingerprint'>,
): string {
  return fingerprintPersonalWorkspacePocSourceCandidateValue(envelopePayload(envelope));
}

function looksLikeEnvelope(value: unknown): boolean {
  return isRecord(value)
    && value.version === PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_VERSION
    && isNonEmptyString(value.candidateId)
    && isNonEmptyString(value.tamperFingerprint);
}

export function isPersonalWorkspacePocSourceCandidateEnvelope(
  value: unknown,
): value is PersonalWorkspacePocSourceCandidateEnvelope {
  if (!isRecord(value)
    || !hasOnlyKeys(value, [
      'version',
      'candidateId',
      'target',
      'base',
      'mine',
      'incoming',
      'changes',
      'provenance',
      'createdAt',
      'tamperFingerprint',
    ])
    || value.version !== PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_VERSION
    || !isNonEmptyString(value.candidateId)
    || !isRecord(value.target)
    || !hasOnlyKeys(value.target, [
      'origin',
      'flowRef',
      'savedCopyId',
      'flowId',
      'handoffId',
    ])
    || value.target.origin !== 'authoring-handoff'
    || !isNonEmptyString(value.target.flowRef)
    || !isNonEmptyString(value.target.savedCopyId)
    || !isNonEmptyString(value.target.flowId)
    || !isNonEmptyString(value.target.handoffId)
    || !isCurrentSource(value.base)
    || !isCurrentSource(value.mine)
    || !isCurrentSource(value.incoming)
    || !sourceMatchesTarget(value.base, value.target as PersonalWorkspacePocSourceCandidateEnvelope['target'])
    || !sourceMatchesTarget(value.mine, value.target as PersonalWorkspacePocSourceCandidateEnvelope['target'])
    || !sourceMatchesTarget(value.incoming, value.target as PersonalWorkspacePocSourceCandidateEnvelope['target'])
    || !Array.isArray(value.changes)
    || value.changes.length === 0
    || !isRecord(value.provenance)
    || !hasOnlyKeys(value.provenance, ['kind', 'fixtureId'])
    || value.provenance.kind !== 'local-fixture'
    || !isNonEmptyString(value.provenance.fixtureId)
    || !isIsoTimestamp(value.createdAt)
    || !isNonEmptyString(value.tamperFingerprint)) return false;

  const envelope = value as unknown as PersonalWorkspacePocSourceCandidateEnvelope;
  const expectedChanges = buildChanges(
    envelope.candidateId,
    envelope.mine.projectedFlow,
    envelope.incoming.projectedFlow,
  );
  if (canonicalJson(envelope.changes as JsonValue)
    !== canonicalJson(expectedChanges as JsonValue)) return false;
  const payload = {
    version: envelope.version,
    candidateId: envelope.candidateId,
    target: envelope.target,
    base: envelope.base,
    mine: envelope.mine,
    incoming: envelope.incoming,
    changes: envelope.changes,
    provenance: envelope.provenance,
    createdAt: envelope.createdAt,
  } satisfies Omit<PersonalWorkspacePocSourceCandidateEnvelope, 'tamperFingerprint'>;
  return envelope.tamperFingerprint === fingerprintEnvelope(payload);
}

function currentSourceMatches(
  actual: PersonalWorkspacePocSourceCandidateCurrentSource,
  expected: PersonalWorkspacePocSourceCandidateCurrentSource,
): boolean {
  return isCurrentSource(actual)
    && actual.revisionId === expected.revisionId
    && actual.sourceSnapshotId === expected.sourceSnapshotId
    && actual.sourceFingerprint === expected.sourceFingerprint
    && actual.rawText === expected.rawText
    && sourceProjectionFingerprint(actual) === sourceProjectionFingerprint(expected);
}

function uniqueCandidateItemId(seed: string, usedIds: Set<string>): string {
  const base = `candidate-item-${deterministicTextFingerprint(seed).slice(-12)}`;
  let candidate = base;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function normalizeIncomingFlowIdentity(
  current: PersonalWorkspacePocSourceCandidateProjectedFlow,
  incoming: PersonalWorkspacePocFlow,
  candidateSeed: string,
): PersonalWorkspacePocSourceCandidateProjectedFlow {
  const currentSections = [...(current.sections ?? [])];
  const sectionIds = new Set(currentSections.map((section) => section.sectionId));
  const usedCurrentSectionIds = new Set<string>();
  const incomingSectionIdMap = new Map<string, string>();
  const sections = (incoming.sections ?? []).map((section) => {
    const match = currentSections.find((candidate) => (
      !usedCurrentSectionIds.has(candidate.sectionId)
      && (candidate.title === section.title || candidate.sourceOrder === section.sourceOrder)
    ));
    const sectionId = match?.sectionId
      ?? `candidate-section-${deterministicTextFingerprint(
        `${candidateSeed}:${section.sourceOrder}:${section.title}`,
      ).slice(-12)}`;
    let uniqueSectionId = sectionId;
    let suffix = 2;
    while (!match && sectionIds.has(uniqueSectionId)) {
      uniqueSectionId = `${sectionId}-${suffix}`;
      suffix += 1;
    }
    sectionIds.add(uniqueSectionId);
    if (match) usedCurrentSectionIds.add(match.sectionId);
    incomingSectionIdMap.set(section.sectionId, uniqueSectionId);
    return {
      ...section,
      sectionId: uniqueSectionId,
    };
  });

  const usedCurrentRefs = new Set<string>();
  const usedItemIds = new Set(current.items.map((item) => item.itemId));
  const items = incoming.items.map((item) => {
    const exactTitleMatch = current.items.find((candidate) => (
      !usedCurrentRefs.has(candidate.ref)
      && candidate.title === item.title
    ));
    const orderMatch = current.items.find((candidate) => (
      !usedCurrentRefs.has(candidate.ref)
      && candidate.sourceOrder === item.sourceOrder
    ));
    const match = exactTitleMatch ?? orderMatch;
    const itemId = match?.itemId ?? uniqueCandidateItemId(
      `${candidateSeed}:${item.sourceOrder}:${item.title}`,
      usedItemIds,
    );
    const ref = match?.ref ?? toPersonalWorkspacePocFlowItemRef(
      current.savedCopyId,
      current.flowId,
      itemId,
    );
    if (match) usedCurrentRefs.add(match.ref);
    const sectionId = item.sectionId
      ? incomingSectionIdMap.get(item.sectionId)
      : undefined;
    const section = sectionId
      ? sections.find((candidate) => candidate.sectionId === sectionId)
      : undefined;
    return {
      ...projectItem(item),
      ref,
      savedCopyId: current.savedCopyId,
      flowId: current.flowId,
      itemId,
      ...(section
        ? { sectionId: section.sectionId, sectionTitle: section.title }
        : { sectionId: undefined, sectionTitle: undefined }),
    };
  }).map((item) => {
    const next = { ...item } as Record<string, unknown>;
    if (next.sectionId === undefined) delete next.sectionId;
    if (next.sectionTitle === undefined) delete next.sectionTitle;
    return next as PersonalWorkspacePocSourceCandidateProjectedItem;
  });

  return {
    ref: current.ref,
    savedCopyId: current.savedCopyId,
    flowId: current.flowId,
    sourceSlug: current.sourceSlug,
    title: incoming.title,
    origin: 'authoring-handoff',
    ...(incoming.anchorDate !== undefined ? { anchorDate: incoming.anchorDate } : {}),
    ...(sections.length > 0 ? { sections } : {}),
    items,
  };
}

export function createPersonalWorkspacePocCurrentSourceFromAuthoredFlow(
  flow: PersonalWorkspacePocAuthoredFlow,
): PersonalWorkspacePocSourceCandidateCurrentSource | null {
  if (flow.origin !== 'authoring-handoff'
    || typeof flow.authoring.rawText !== 'string'
    || flow.authoring.sourceFingerprint
      !== fingerprintPersonalWorkspacePocAuthoringSource(flow.authoring.rawText)) return null;
  const current: PersonalWorkspacePocSourceCandidateCurrentSource = {
    revisionId: flow.authoring.revisionId,
    sourceSnapshotId: flow.authoring.sourceSnapshotId,
    sourceFingerprint: flow.authoring.sourceFingerprint,
    rawText: flow.authoring.rawText,
    projectedFlow: projectFlow(flow),
  };
  return isCurrentSource(current) ? deepFreeze(current) : null;
}

function defaultIncomingRawText(rawText: string): string {
  const separator = rawText.endsWith('\n') ? '' : '\n';
  return `${rawText}${separator}- [ ] 새 원문에서 추가된 항목`;
}

export function createPersonalWorkspacePocLocalFixtureEnvelope(
  flow: PersonalWorkspacePocAuthoredFlow,
  options: Readonly<{
    current?: PersonalWorkspacePocSourceCandidateCurrentSource;
    incomingRawText?: string;
    incomingRevisionId?: string;
    candidateId?: string;
    fixtureId?: string;
    createdAt?: string;
  }> = {},
): PersonalWorkspacePocSourceCandidateEnvelopeResult {
  if (flow.origin !== 'authoring-handoff') return { ok: false, reason: 'unsupported-origin' };
  const base = createPersonalWorkspacePocCurrentSourceFromAuthoredFlow(flow);
  if (!base) return { ok: false, reason: 'invalid-current-source' };
  const mine = options.current ? cloneJson(options.current) : cloneJson(base);
  if (!isCurrentSource(mine)
    || mine.projectedFlow.ref !== base.projectedFlow.ref
    || mine.projectedFlow.savedCopyId !== base.projectedFlow.savedCopyId
    || mine.projectedFlow.flowId !== base.projectedFlow.flowId
    || mine.projectedFlow.origin !== 'authoring-handoff') {
    return { ok: false, reason: 'invalid-current-source' };
  }
  const incomingRawText = options.incomingRawText ?? defaultIncomingRawText(mine.rawText);
  const incomingRevisionId = options.incomingRevisionId
    ?? `source-update-${deterministicTextFingerprint(incomingRawText).slice(-12)}`;
  const createdAt = options.createdAt ?? '2026-09-04T00:00:00.000Z';
  if (!isIsoTimestamp(createdAt)) return { ok: false, reason: 'invalid-incoming-source' };
  const knownTemplate = flow.authoring.templateId
    ? getPersonalWorkspacePocAuthoringTemplate(flow.authoring.templateId)
    : null;
  const materialized = materializePersonalWorkspacePocAuthoring({
    handoffId: flow.authoring.handoffId,
    documentId: flow.authoring.documentId,
    revisionId: incomingRevisionId,
    rawText: incomingRawText,
    committedAt: createdAt,
    ...(knownTemplate ? { templateId: knownTemplate.templateId } : {}),
  });
  if (!materialized.ok) return { ok: false, reason: 'invalid-incoming-source' };
  const candidateSeed = [
    mine.projectedFlow.ref,
    mine.sourceFingerprint,
    materialized.sourceFingerprint,
    incomingRevisionId,
  ].join('\u001f');
  const candidateId = options.candidateId
    ?? `source-candidate-${deterministicTextFingerprint(candidateSeed).slice(-16)}`;
  if (!isNonEmptyString(candidateId)) return { ok: false, reason: 'invalid-incoming-source' };
  const incomingFlow = normalizeIncomingFlowIdentity(
    mine.projectedFlow,
    materialized.flow,
    candidateId,
  );
  const incoming: PersonalWorkspacePocSourceCandidateCurrentSource = {
    revisionId: incomingRevisionId,
    sourceSnapshotId: materialized.lineage.sourceSnapshotId,
    sourceFingerprint: materialized.sourceFingerprint,
    rawText: incomingRawText,
    projectedFlow: incomingFlow,
  };
  if (!isCurrentSource(incoming)) return { ok: false, reason: 'invalid-incoming-source' };
  const changes = buildChanges(candidateId, mine.projectedFlow, incoming.projectedFlow);
  if (changes.length === 0) return { ok: false, reason: 'no-source-change' };
  const payload = {
    version: PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_VERSION,
    candidateId,
    target: {
      origin: 'authoring-handoff' as const,
      flowRef: flow.ref,
      savedCopyId: flow.savedCopyId,
      flowId: flow.flowId,
      handoffId: flow.authoring.handoffId,
    },
    base: cloneJson(base),
    mine,
    incoming,
    changes,
    provenance: {
      kind: 'local-fixture' as const,
      fixtureId: options.fixtureId ?? candidateId,
    },
    createdAt,
  } satisfies Omit<PersonalWorkspacePocSourceCandidateEnvelope, 'tamperFingerprint'>;
  const envelope: PersonalWorkspacePocSourceCandidateEnvelope = {
    ...payload,
    tamperFingerprint: fingerprintEnvelope(payload),
  };
  if (!isPersonalWorkspacePocSourceCandidateEnvelope(envelope)) {
    return { ok: false, reason: 'invalid-incoming-source' };
  }
  return {
    ok: true,
    envelope: deepFreeze(envelope),
    current: deepFreeze(mine),
  };
}

function isReview(
  value: unknown,
  envelope: PersonalWorkspacePocSourceCandidateEnvelope,
): value is PersonalWorkspacePocSourceCandidateReview {
  if (!isRecord(value)
    || !hasOnlyKeys(value, [
      'candidateId',
      'status',
      'expectedRevisionId',
      'expectedSourceFingerprint',
      'expectedProjectionFingerprint',
      'resolutions',
      'stagedAt',
      'updatedAt',
    ])
    || value.candidateId !== envelope.candidateId
    || (value.status !== 'pending' && value.status !== 'deferred' && value.status !== 'applied')
    || value.expectedRevisionId !== envelope.mine.revisionId
    || value.expectedSourceFingerprint !== envelope.mine.sourceFingerprint
    || value.expectedProjectionFingerprint !== sourceProjectionFingerprint(envelope.mine)
    || !isRecord(value.resolutions)
    || !isIsoTimestamp(value.stagedAt)
    || !isIsoTimestamp(value.updatedAt)) return false;
  const changeIds = new Set(envelope.changes.map((change) => change.changeId));
  return Object.entries(value.resolutions).every(([changeId, resolution]) => (
    changeIds.has(changeId)
      && (resolution === 'keep-mine' || resolution === 'use-incoming')
  ));
}

function resolveFlow(
  envelope: PersonalWorkspacePocSourceCandidateEnvelope,
  resolutions: Readonly<Record<string, PersonalWorkspacePocSourceCandidateResolution>>,
): PersonalWorkspacePocSourceCandidateProjectedFlow | null {
  if (envelope.changes.some((change) => resolutions[change.changeId] === undefined)) {
    return null;
  }
  const mine = envelope.mine.projectedFlow;
  const incoming = envelope.incoming.projectedFlow;
  const flowChange = envelope.changes.find((change) => change.scope === 'flow');
  const useIncomingFlow = flowChange
    ? resolutions[flowChange.changeId] === 'use-incoming'
    : false;
  const itemsByRef = new Map(mine.items.map((item) => [item.ref, cloneJson(item)]));
  const incomingByRef = new Map(incoming.items.map((item) => [item.ref, item]));
  for (const change of envelope.changes.filter((entry) => entry.scope === 'item')) {
    if (!change.itemRef) return null;
    const resolution = resolutions[change.changeId];
    if (resolution === 'keep-mine') continue;
    if (change.kind === 'removed') {
      // Source removal never drops an Item identity that may own personal
      // overlay or execution state. The effective-version metadata records
      // that this is now a retained personal Item.
      continue;
    } else {
      const incomingItem = incomingByRef.get(change.itemRef);
      if (!incomingItem) return null;
      itemsByRef.set(change.itemRef, cloneJson(incomingItem));
    }
  }
  const items = [...itemsByRef.values()]
    .sort((left, right) => (
      left.sourceOrder - right.sourceOrder || left.ref.localeCompare(right.ref)
    ))
    .map((item, sourceOrder) => ({ ...item, sourceOrder }));
  const chosenSections = useIncomingFlow
    ? [...(incoming.sections ?? [])]
    : [...(mine.sections ?? [])];
  const sectionIds = new Set(chosenSections.map((section) => section.sectionId));
  // Keep every previous section identity available for a personal section
  // alias, including an empty section removed by the incoming source.
  for (const previousSection of mine.sections ?? []) {
    if (sectionIds.has(previousSection.sectionId)) continue;
    chosenSections.push(cloneJson(previousSection));
    sectionIds.add(previousSection.sectionId);
  }
  for (const item of items) {
    if (!item.sectionId || sectionIds.has(item.sectionId)) continue;
    const needed = (mine.sections ?? []).find((section) => section.sectionId === item.sectionId)
      ?? (incoming.sections ?? []).find((section) => section.sectionId === item.sectionId);
    if (needed) {
      chosenSections.push(cloneJson(needed));
      sectionIds.add(needed.sectionId);
    }
  }
  chosenSections.sort((left, right) => (
    left.sourceOrder - right.sourceOrder || left.sectionId.localeCompare(right.sectionId)
  ));
  const normalizedSections = chosenSections.map((section, sourceOrder) => ({
    ...section,
    sourceOrder,
  }));
  const normalizedItems = items.map((item) => {
    if (!item.sectionId) return item;
    const section = normalizedSections.find((candidate) => (
      candidate.sectionId === item.sectionId
    ));
    return section ? { ...item, sectionTitle: section.title } : item;
  });
  const flow: PersonalWorkspacePocSourceCandidateProjectedFlow = {
    ref: mine.ref,
    savedCopyId: mine.savedCopyId,
    flowId: mine.flowId,
    sourceSlug: mine.sourceSlug,
    title: useIncomingFlow ? incoming.title : mine.title,
    origin: 'authoring-handoff',
    ...((useIncomingFlow ? incoming.anchorDate : mine.anchorDate) !== undefined
      ? { anchorDate: useIncomingFlow ? incoming.anchorDate : mine.anchorDate }
      : {}),
    ...(normalizedSections.length > 0 ? { sections: normalizedSections } : {}),
    items: normalizedItems,
  };
  return isPersonalWorkspacePocSourceCandidateProjectedFlow(flow) ? flow : null;
}

function isEffectiveVersion(
  value: unknown,
  envelopes: Readonly<Record<string, PersonalWorkspacePocSourceCandidateEnvelope>>,
): value is PersonalWorkspacePocEffectiveSourceVersion {
  if (!isRecord(value)
    || !hasOnlyKeys(value, [
      'version',
      'candidateId',
      'targetFlowRef',
      'sourceRevision',
      'projectedFlow',
      'retainedItemRefs',
      'resolutionFingerprint',
      'appliedAt',
    ])
    || value.version !== PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_VERSION
    || !isNonEmptyString(value.candidateId)
    || !isNonEmptyString(value.targetFlowRef)
    || !isCurrentSource(value.sourceRevision)
    || !isPersonalWorkspacePocSourceCandidateProjectedFlow(value.projectedFlow)
    || !Array.isArray(value.retainedItemRefs)
    || !value.retainedItemRefs.every(isNonEmptyString)
    || new Set(value.retainedItemRefs).size !== value.retainedItemRefs.length
    || !isNonEmptyString(value.resolutionFingerprint)
    || !isIsoTimestamp(value.appliedAt)) return false;
  const envelope = envelopes[value.candidateId];
  const expectedRetainedRefs = envelope?.changes
    .filter((change) => change.kind === 'removed')
    .map((change) => change.itemRef)
    .filter((itemRef): itemRef is string => Boolean(itemRef));
  return Boolean(envelope
    && envelope.target.flowRef === value.targetFlowRef
    && value.projectedFlow.ref === value.targetFlowRef
    && canonicalJson(value.sourceRevision as unknown as JsonValue)
      === canonicalJson(envelope.incoming as unknown as JsonValue)
    && value.retainedItemRefs.every((itemRef) => expectedRetainedRefs?.includes(itemRef)));
}

function isUndo(
  value: unknown,
  envelopes: Readonly<Record<string, PersonalWorkspacePocSourceCandidateEnvelope>>,
  reviews: Readonly<Record<string, PersonalWorkspacePocSourceCandidateReview>>,
): value is PersonalWorkspacePocSourceCandidateUndo {
  if (!isRecord(value)
    || !hasOnlyKeys(value, [
      'candidateId',
      'flowRef',
      'previousReview',
      'previousEffectiveVersion',
      'createdAt',
    ])
    || !isNonEmptyString(value.candidateId)
    || !isNonEmptyString(value.flowRef)
    || !isIsoTimestamp(value.createdAt)) return false;
  const envelope = envelopes[value.candidateId];
  return Boolean(envelope
    && value.flowRef === envelope.target.flowRef
    && isReview(value.previousReview, envelope)
    && (value.previousEffectiveVersion === undefined
      || (isEffectiveVersion(value.previousEffectiveVersion, envelopes)
        && reviews[value.previousEffectiveVersion.candidateId]?.status === 'applied'
        && value.previousEffectiveVersion.resolutionFingerprint
          === fingerprintPersonalWorkspacePocSourceCandidateValue({
            candidateId: value.previousEffectiveVersion.candidateId,
            resolutions: reviews[value.previousEffectiveVersion.candidateId].resolutions,
            projectedFlow: value.previousEffectiveVersion.projectedFlow,
            retainedItemRefs: value.previousEffectiveVersion.retainedItemRefs,
            appliedAt: value.previousEffectiveVersion.appliedAt,
          }))));
}

export function isPersonalWorkspacePocSourceCandidateStore(
  value: unknown,
): value is PersonalWorkspacePocSourceCandidateStore {
  if (!isRecord(value)
    || !hasOnlyKeys(value, [
      'version',
      'revision',
      'envelopes',
      'reviews',
      'effectiveVersions',
      'undo',
      'updatedAt',
    ])
    || value.version !== PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_VERSION
    || !Number.isSafeInteger(value.revision)
    || Number(value.revision) < 0
    || !isRecord(value.envelopes)
    || !isRecord(value.reviews)
    || !isRecord(value.effectiveVersions)
    || !isIsoTimestamp(value.updatedAt)) return false;
  const envelopes = value.envelopes as Record<string, PersonalWorkspacePocSourceCandidateEnvelope>;
  for (const [candidateId, envelope] of Object.entries(envelopes)) {
    if (candidateId !== envelope.candidateId
      || !isPersonalWorkspacePocSourceCandidateEnvelope(envelope)) return false;
  }
  const reviews = value.reviews as Record<string, PersonalWorkspacePocSourceCandidateReview>;
  for (const [candidateId, review] of Object.entries(reviews)) {
    const envelope = envelopes[candidateId];
    if (!envelope || !isReview(review, envelope)) return false;
  }
  const effectiveVersions = value.effectiveVersions as Record<
    string,
    PersonalWorkspacePocEffectiveSourceVersion
  >;
  for (const [flowRef, effectiveVersion] of Object.entries(effectiveVersions)) {
    if (flowRef !== effectiveVersion.targetFlowRef
      || !isEffectiveVersion(effectiveVersion, envelopes)) return false;
    const review = reviews[effectiveVersion.candidateId];
    if (!review || review.status !== 'applied') return false;
    const envelope = envelopes[effectiveVersion.candidateId];
    const expectedRetainedItemRefs = envelope.changes
      .filter((change) => (
        change.kind === 'removed'
        && review.resolutions[change.changeId] === 'use-incoming'
      ))
      .flatMap((change) => change.itemRef ? [change.itemRef] : []);
    const resolved = resolveFlow(envelopes[effectiveVersion.candidateId], review.resolutions);
    if (!resolved
      || canonicalJson(effectiveVersion.retainedItemRefs as unknown as JsonValue)
        !== canonicalJson(expectedRetainedItemRefs as unknown as JsonValue)
      || canonicalJson(resolved as unknown as JsonValue)
        !== canonicalJson(effectiveVersion.projectedFlow as unknown as JsonValue)
      || effectiveVersion.resolutionFingerprint
        !== fingerprintPersonalWorkspacePocSourceCandidateValue({
          candidateId: effectiveVersion.candidateId,
          resolutions: review.resolutions,
          projectedFlow: effectiveVersion.projectedFlow,
          retainedItemRefs: effectiveVersion.retainedItemRefs,
          appliedAt: effectiveVersion.appliedAt,
        })) return false;
  }
  return value.undo === undefined || isUndo(value.undo, envelopes, reviews);
}

export function validatePersonalWorkspacePocSourceCandidateStore(
  value: unknown,
): Readonly<
  | { ok: true; store: PersonalWorkspacePocSourceCandidateStore }
  | { ok: false; reason: 'invalid-source-candidate-store' }
> {
  return isPersonalWorkspacePocSourceCandidateStore(value)
    ? { ok: true, store: value }
    : { ok: false, reason: 'invalid-source-candidate-store' };
}

export type PersonalWorkspacePocSourceCandidateCatalogResult = Readonly<
  | {
      ok: true;
      /** Display facts only: neither a prepare ticket nor fresh storage authority. */
      scope: 'source-practice-read';
      target: PersonalWorkspacePocSourceCandidateEnvelope['target'];
      candidates: readonly Readonly<{
        candidateId: string;
        status: 'unreviewed' | PersonalWorkspacePocSourceCandidateReview['status'];
        provenance: PersonalWorkspacePocSourceCandidateEnvelope['provenance'];
        changeCount: number;
        resolvedCount: number;
        unresolvedCount: number;
        /** Unapplied comparison compatibility only; applied history stays applied. */
        stale: boolean;
        isEffective: boolean;
        /** Exact recorded Undo/effective owner only, not permission to execute Undo. */
        canUndo: boolean;
      }>[];
      appliedVersion: Readonly<{
        candidateId: string;
        revisionId: string;
        sourceSnapshotId: string;
        appliedAt: string;
      }> | null;
      /** Callers must still check live bytes, observation epoch and writer guards. */
      undo: Readonly<{ available: false } | { available: true; candidateId: string }>;
    }
  | {
      ok: false;
      scope: 'source-practice-read';
      reason: 'invalid-input' | 'invalid-target' | 'invalid-current-source'
        | 'invalid-source-candidate-store' | 'effective-owner-mismatch';
    }
>;

// The existing validators intentionally keep their old ABI. This new unknown-
// input boundary snapshots only enumerable data descriptors before calling them;
// it never invokes a getter, toJSON or a caller-provided iterator. Native plain
// Object/Array values from another realm and null-prototype records are accepted.
function sourceCatalogDataSnapshot(value: unknown, ancestors = new Set<object>()): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object' || ancestors.has(value)) throw new TypeError('invalid-catalog-data');
  const nativePrototype = (prototype: object | null, name: 'Object' | 'Array'): boolean => {
    if (!prototype) return false;
    const constructor = Object.getOwnPropertyDescriptor(prototype, 'constructor');
    return Boolean(constructor && Object.prototype.hasOwnProperty.call(constructor, 'value')
      && typeof constructor.value === 'function'
      && Function.prototype.toString.call(constructor.value) === `function ${name}() { [native code] }`
      && Object.getOwnPropertyDescriptor(constructor.value, 'prototype')?.value === prototype);
  };
  const prototype = Object.getPrototypeOf(value);
  const array = Array.isArray(value);
  if (array) {
    const objectPrototype = prototype && Object.getPrototypeOf(prototype);
    if (!nativePrototype(prototype, 'Array') || !nativePrototype(objectPrototype, 'Object')
      || Object.getPrototypeOf(objectPrototype) !== null) throw new TypeError('invalid-catalog-data');
  } else if (prototype !== null && (!nativePrototype(prototype, 'Object')
    || Object.getPrototypeOf(prototype) !== null)) throw new TypeError('invalid-catalog-data');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== 'string')) throw new TypeError('invalid-catalog-data');
  ancestors.add(value);
  try {
    if (array) {
      const length = descriptors.length;
      if (!length || !Object.prototype.hasOwnProperty.call(length, 'value')
        || !Number.isSafeInteger(length.value) || length.value < 0
        || keys.length !== length.value + 1) throw new TypeError('invalid-catalog-data');
      const snapshot: JsonValue[] = [];
      for (let index = 0; index < length.value; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !descriptor.enumerable
          || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) throw new TypeError('invalid-catalog-data');
        snapshot.push(sourceCatalogDataSnapshot(descriptor.value, ancestors));
      }
      return snapshot;
    }
    const snapshot: Record<string, JsonValue> = Object.create(null);
    for (const key of keys as string[]) {
      const descriptor = descriptors[key];
      if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        throw new TypeError('invalid-catalog-data');
      }
      snapshot[key] = sourceCatalogDataSnapshot(descriptor.value, ancestors);
    }
    return snapshot;
  } finally {
    ancestors.delete(value);
  }
}

/**
 * C2 PoC read contract: input is exactly { target, current, store }. target is the
 * existing authored 5-field envelope tuple; current is source-only, before any
 * personal overlay. Snapshot + existing strict validators do not prove a live
 * storage read, ABA freshness or handoff authority. No generator, transition,
 * clock, IO, automatic selection, migration or store revision is produced here.
 */
export function inspectPersonalWorkspacePocSourceCandidateCatalog(
  input: unknown,
): PersonalWorkspacePocSourceCandidateCatalogResult {
  const failed = (reason: Extract<PersonalWorkspacePocSourceCandidateCatalogResult, { ok: false }>['reason']) => (
    Object.freeze({ ok: false as const, scope: 'source-practice-read' as const, reason })
  );
  try {
    const data = sourceCatalogDataSnapshot(input);
    if (!isRecord(data) || Object.keys(data).length !== 3
      || !hasOnlyKeys(data, ['target', 'current', 'store'])) return failed('invalid-input');
    const target = data.target;
    if (!isRecord(target) || Object.keys(target).length !== 5
      || !hasOnlyKeys(target, ['origin', 'flowRef', 'savedCopyId', 'flowId', 'handoffId'])
      || target.origin !== 'authoring-handoff'
      || !isNonEmptyString(target.flowRef) || !isNonEmptyString(target.savedCopyId)
      || !isNonEmptyString(target.flowId) || !isNonEmptyString(target.handoffId)
      || target.flowRef !== toPersonalWorkspacePocFlowRef(target.savedCopyId, target.flowId)) {
      return failed('invalid-target');
    }
    const ownedTarget = target as PersonalWorkspacePocSourceCandidateEnvelope['target'];
    const current = data.current;
    if (!isCurrentSource(current) || !sourceMatchesTarget(current, ownedTarget)) return failed('invalid-current-source');
    const validated = validatePersonalWorkspacePocSourceCandidateStore(data.store);
    if (!validated.ok) return failed('invalid-source-candidate-store');
    const store = validated.store;
    const owns = (candidate: PersonalWorkspacePocSourceCandidateEnvelope) => (
      candidate.target.origin === ownedTarget.origin
      && candidate.target.flowRef === ownedTarget.flowRef
      && candidate.target.savedCopyId === ownedTarget.savedCopyId
      && candidate.target.flowId === ownedTarget.flowId
      && candidate.target.handoffId === ownedTarget.handoffId
    );
    const effective = store.effectiveVersions[ownedTarget.flowRef];
    if (effective && !owns(store.envelopes[effective.candidateId])) return failed('effective-owner-mismatch');
    const undoId = effective && store.undo?.flowRef === ownedTarget.flowRef
      && store.undo.candidateId === effective.candidateId ? effective.candidateId : undefined;
    const candidates = Object.values(store.envelopes).filter(owns).map((candidate) => {
      const review = store.reviews[candidate.candidateId];
      const resolvedCount = review ? Object.keys(review.resolutions).length : 0;
      return {
        candidateId: candidate.candidateId,
        status: review?.status ?? 'unreviewed' as const,
        provenance: { ...candidate.provenance },
        changeCount: candidate.changes.length,
        resolvedCount,
        unresolvedCount: candidate.changes.length - resolvedCount,
        stale: review?.status !== 'applied' && !currentSourceMatches(current, candidate.mine),
        isEffective: effective?.candidateId === candidate.candidateId,
        canUndo: undoId === candidate.candidateId,
      };
    });
    return deepFreeze({
      ok: true,
      scope: 'source-practice-read',
      target: { ...ownedTarget },
      candidates,
      appliedVersion: effective ? {
        candidateId: effective.candidateId,
        revisionId: effective.sourceRevision.revisionId,
        sourceSnapshotId: effective.sourceRevision.sourceSnapshotId,
        appliedAt: effective.appliedAt,
      } : null,
      undo: undoId ? { available: true, candidateId: undoId } : { available: false },
    });
  } catch {
    return failed('invalid-input');
  }
}

export function createPersonalWorkspacePocSourceCandidateStore(
  now = '2026-09-04T00:00:00.000Z',
): PersonalWorkspacePocSourceCandidateStore {
  if (!isIsoTimestamp(now)) throw new TypeError('invalid-source-candidate-store-timestamp');
  return deepFreeze({
    version: PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_VERSION,
    revision: 0,
    envelopes: {},
    reviews: {},
    effectiveVersions: {},
    updatedAt: now,
  });
}

function unchanged(
  store: PersonalWorkspacePocSourceCandidateStore,
  code: PersonalWorkspacePocSourceCandidateTransitionCode,
): PersonalWorkspacePocSourceCandidateTransitionResult {
  return { changed: false, code, store };
}

function nextStore(
  store: PersonalWorkspacePocSourceCandidateStore,
  patch: Partial<PersonalWorkspacePocSourceCandidateStore>,
  now: string,
): PersonalWorkspacePocSourceCandidateStore {
  return deepFreeze(cloneJson({
    ...store,
    ...patch,
    version: PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_VERSION,
    revision: store.revision + 1,
    updatedAt: now,
  }));
}

export function stagePersonalWorkspacePocSourceCandidate(
  store: PersonalWorkspacePocSourceCandidateStore,
  envelope: PersonalWorkspacePocSourceCandidateEnvelope,
  current: PersonalWorkspacePocSourceCandidateCurrentSource,
  now = envelope.createdAt,
): PersonalWorkspacePocSourceCandidateTransitionResult {
  if (!isPersonalWorkspacePocSourceCandidateStore(store)) return unchanged(store, 'invalid-store');
  if (!isPersonalWorkspacePocSourceCandidateEnvelope(envelope)) {
    return unchanged(store, looksLikeEnvelope(envelope) ? 'tampered-candidate' : 'invalid-envelope');
  }
  if (!isIsoTimestamp(now)) return unchanged(store, 'invalid-envelope');
  if (envelope.target.origin !== 'authoring-handoff') return unchanged(store, 'unsupported-origin');
  if (!currentSourceMatches(current, envelope.mine)) return unchanged(store, 'stale-source');
  const existingEnvelope = store.envelopes[envelope.candidateId];
  if (existingEnvelope
    && existingEnvelope.tamperFingerprint !== envelope.tamperFingerprint) {
    return unchanged(store, 'tampered-candidate');
  }
  const existingReview = store.reviews[envelope.candidateId];
  if (existingReview?.status === 'applied') return unchanged(store, 'already-applied');
  if (existingReview?.status === 'pending') return unchanged(store, 'already-staged');
  const review: PersonalWorkspacePocSourceCandidateReview = existingReview
    ? { ...existingReview, status: 'pending', updatedAt: now }
    : {
        candidateId: envelope.candidateId,
        status: 'pending',
        expectedRevisionId: envelope.mine.revisionId,
        expectedSourceFingerprint: envelope.mine.sourceFingerprint,
        expectedProjectionFingerprint: sourceProjectionFingerprint(envelope.mine),
        resolutions: {},
        stagedAt: now,
        updatedAt: now,
      };
  const next = nextStore(store, {
    envelopes: existingEnvelope
      ? store.envelopes
      : { ...store.envelopes, [envelope.candidateId]: cloneJson(envelope) },
    reviews: { ...store.reviews, [envelope.candidateId]: review },
  }, now);
  return {
    changed: true,
    code: existingReview ? 'resumed' : 'staged',
    store: next,
  };
}

export function resolvePersonalWorkspacePocSourceCandidateChange(
  store: PersonalWorkspacePocSourceCandidateStore,
  input: Readonly<{
    candidateId: string;
    changeId: string;
    resolution: PersonalWorkspacePocSourceCandidateResolution;
    now: string;
  }>,
): PersonalWorkspacePocSourceCandidateTransitionResult {
  if (!isPersonalWorkspacePocSourceCandidateStore(store)) return unchanged(store, 'invalid-store');
  const envelope = store.envelopes[input.candidateId];
  const review = store.reviews[input.candidateId];
  if (!envelope || !review) return unchanged(store, 'not-found');
  if (review.status === 'deferred') return unchanged(store, 'candidate-deferred');
  if (review.status === 'applied') return unchanged(store, 'already-applied');
  if (!isIsoTimestamp(input.now)
    || (input.resolution !== 'keep-mine' && input.resolution !== 'use-incoming')
    || !envelope.changes.some((change) => change.changeId === input.changeId)) {
    return unchanged(store, 'invalid-change');
  }
  if (review.resolutions[input.changeId] === input.resolution) {
    return unchanged(store, 'no-op');
  }
  const next = nextStore(store, {
    reviews: {
      ...store.reviews,
      [input.candidateId]: {
        ...review,
        resolutions: {
          ...review.resolutions,
          [input.changeId]: input.resolution,
        },
        updatedAt: input.now,
      },
    },
  }, input.now);
  return { changed: true, code: 'resolved', store: next };
}

/** Restores one compare row to the unresolved "later" state without deferring the review. */
export function clearPersonalWorkspacePocSourceCandidateChangeResolution(
  store: PersonalWorkspacePocSourceCandidateStore,
  input: Readonly<{
    candidateId: string;
    changeId: string;
    now: string;
  }>,
): PersonalWorkspacePocSourceCandidateTransitionResult {
  if (!isPersonalWorkspacePocSourceCandidateStore(store)) return unchanged(store, 'invalid-store');
  const envelope = store.envelopes[input.candidateId];
  const review = store.reviews[input.candidateId];
  if (!envelope || !review) return unchanged(store, 'not-found');
  if (review.status === 'deferred') return unchanged(store, 'candidate-deferred');
  if (review.status === 'applied') return unchanged(store, 'already-applied');
  if (!isIsoTimestamp(input.now)
    || !envelope.changes.some((change) => change.changeId === input.changeId)) {
    return unchanged(store, 'invalid-change');
  }
  if (review.resolutions[input.changeId] === undefined) return unchanged(store, 'no-op');
  const resolutions = { ...review.resolutions };
  delete resolutions[input.changeId];
  const next = nextStore(store, {
    reviews: {
      ...store.reviews,
      [input.candidateId]: {
        ...review,
        resolutions,
        updatedAt: input.now,
      },
    },
  }, input.now);
  return { changed: true, code: 'resolution-cleared', store: next };
}

export function deferPersonalWorkspacePocSourceCandidate(
  store: PersonalWorkspacePocSourceCandidateStore,
  input: Readonly<{ candidateId: string; now: string }>,
): PersonalWorkspacePocSourceCandidateTransitionResult {
  if (!isPersonalWorkspacePocSourceCandidateStore(store)) return unchanged(store, 'invalid-store');
  const review = store.reviews[input.candidateId];
  if (!review) return unchanged(store, 'not-found');
  if (!isIsoTimestamp(input.now)) return unchanged(store, 'invalid-change');
  if (review.status === 'applied') return unchanged(store, 'already-applied');
  if (review.status === 'deferred') return unchanged(store, 'no-op');
  const next = nextStore(store, {
    reviews: {
      ...store.reviews,
      [input.candidateId]: { ...review, status: 'deferred', updatedAt: input.now },
    },
  }, input.now);
  return { changed: true, code: 'deferred', store: next };
}

export function applyPersonalWorkspacePocSourceCandidate(
  store: PersonalWorkspacePocSourceCandidateStore,
  input: Readonly<{
    candidateId: string;
    current: PersonalWorkspacePocSourceCandidateCurrentSource;
    now: string;
  }>,
): PersonalWorkspacePocSourceCandidateTransitionResult {
  const rawEnvelope = isRecord(store)
    && isRecord(store.envelopes)
    ? store.envelopes[input.candidateId]
    : undefined;
  if (rawEnvelope && !isPersonalWorkspacePocSourceCandidateEnvelope(rawEnvelope)) {
    return unchanged(store, 'tampered-candidate');
  }
  if (!isPersonalWorkspacePocSourceCandidateStore(store)) return unchanged(store, 'invalid-store');
  const envelope = store.envelopes[input.candidateId];
  const review = store.reviews[input.candidateId];
  if (!envelope || !review) return unchanged(store, 'not-found');
  if (!isIsoTimestamp(input.now)) return unchanged(store, 'invalid-change');
  if (review.status === 'deferred') return unchanged(store, 'candidate-deferred');
  if (review.status === 'applied') return unchanged(store, 'already-applied');
  if (!currentSourceMatches(input.current, envelope.mine)
    || review.expectedRevisionId !== input.current.revisionId
    || review.expectedSourceFingerprint !== input.current.sourceFingerprint
    || review.expectedProjectionFingerprint !== sourceProjectionFingerprint(input.current)) {
    return unchanged(store, 'stale-source');
  }
  if (envelope.changes.some((change) => review.resolutions[change.changeId] === undefined)) {
    return unchanged(store, 'unresolved');
  }
  const projectedFlow = resolveFlow(envelope, review.resolutions);
  if (!projectedFlow) return unchanged(store, 'invalid-change');
  const appliedReview: PersonalWorkspacePocSourceCandidateReview = {
    ...review,
    status: 'applied',
    updatedAt: input.now,
  };
  const effectiveVersion: PersonalWorkspacePocEffectiveSourceVersion = {
    version: PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_VERSION,
    candidateId: envelope.candidateId,
    targetFlowRef: envelope.target.flowRef,
    sourceRevision: cloneJson(envelope.incoming),
    projectedFlow: cloneJson(projectedFlow),
    retainedItemRefs: envelope.changes
      .filter((change) => (
        change.kind === 'removed'
        && review.resolutions[change.changeId] === 'use-incoming'
      ))
      .flatMap((change) => change.itemRef ? [change.itemRef] : []),
    resolutionFingerprint: fingerprintPersonalWorkspacePocSourceCandidateValue({
      candidateId: envelope.candidateId,
      resolutions: appliedReview.resolutions,
      projectedFlow,
      retainedItemRefs: envelope.changes
        .filter((change) => (
          change.kind === 'removed'
          && review.resolutions[change.changeId] === 'use-incoming'
        ))
        .flatMap((change) => change.itemRef ? [change.itemRef] : []),
      appliedAt: input.now,
    }),
    appliedAt: input.now,
  };
  const previousEffectiveVersion = store.effectiveVersions[envelope.target.flowRef];
  const undo: PersonalWorkspacePocSourceCandidateUndo = {
    candidateId: envelope.candidateId,
    flowRef: envelope.target.flowRef,
    previousReview: cloneJson(review),
    ...(previousEffectiveVersion
      ? { previousEffectiveVersion: cloneJson(previousEffectiveVersion) }
      : {}),
    createdAt: input.now,
  };
  const next = nextStore(store, {
    reviews: { ...store.reviews, [input.candidateId]: appliedReview },
    effectiveVersions: {
      ...store.effectiveVersions,
      [envelope.target.flowRef]: effectiveVersion,
    },
    undo,
  }, input.now);
  return { changed: true, code: 'applied', store: next, effectiveFlow: projectedFlow };
}

export function undoPersonalWorkspacePocSourceCandidate(
  store: PersonalWorkspacePocSourceCandidateStore,
  now: string,
): PersonalWorkspacePocSourceCandidateTransitionResult {
  if (!isPersonalWorkspacePocSourceCandidateStore(store)) return unchanged(store, 'invalid-store');
  if (!store.undo) return unchanged(store, 'no-undo');
  if (!isIsoTimestamp(now)) return unchanged(store, 'invalid-change');
  const effectiveVersions = { ...store.effectiveVersions };
  if (store.undo.previousEffectiveVersion) {
    effectiveVersions[store.undo.flowRef] = cloneJson(store.undo.previousEffectiveVersion);
  } else {
    delete effectiveVersions[store.undo.flowRef];
  }
  const next = nextStore(store, {
    reviews: {
      ...store.reviews,
      [store.undo.candidateId]: cloneJson(store.undo.previousReview),
    },
    effectiveVersions,
    undo: undefined,
  }, now);
  return {
    changed: true,
    code: 'undone',
    store: next,
    effectiveFlow: store.undo.previousEffectiveVersion?.projectedFlow
      ?? store.envelopes[store.undo.candidateId]?.mine.projectedFlow,
  };
}
