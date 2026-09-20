import {
  getPersonalWorkspacePocFlowFieldOwnership,
  getPersonalWorkspacePocFlowItemFieldOwnership,
  type PersonalWorkspacePocFieldOwner, type PersonalWorkspacePocFieldProvenance,
  type PersonalWorkspacePocOwnedFieldValue, type PersonalWorkspacePocReadModel,
  type PersonalWorkspacePocState, type PersonalWorkspacePocFlow, type PersonalWorkspacePocScheduleInput,
} from './personal-workspace-poc-contract';
import { composePersonalWorkspacePocEffectiveSourceFlows } from './personal-workspace-poc-canonical-ownership';
import { composePersonalWorkspacePocReadModel } from './personal-workspace-poc-composition';
import { resolvePersonalWorkspacePocEntry, type PersonalWorkspacePocEntryResolution } from './personal-workspace-poc-entry';
import { buildPersonalWorkspacePocSourceReadIndex, resolvePersonalWorkspacePocSourceFlow,
  readPersonalWorkspacePocTaskSourceContext, type PersonalWorkspacePocSourceReadIndex,
} from './personal-workspace-poc-source-attributes';
import { parsePersonalWorkspacePocSourceCandidateStore } from './personal-workspace-poc-source-candidate-storage';
import { buildPersonalWorkspacePocResultProjection, type PersonalWorkspacePocResultProjectionV3 } from './personal-workspace-poc-result-projection';
import { isPersonalWorkspacePocState, validatePersonalWorkspacePocStateReferences } from './personal-workspace-poc-state';

export const PERSONAL_WORKSPACE_POC_ENTRY_READ_CONTRACT = 'flowme-personal-workspace-entry-read-v1' as const;
declare const entryReadBrand: unique symbol;
/** Captured read-only data, never a current-source, navigation, save or Undo authority. */
export type PersonalWorkspacePocEntryReadPacket = Readonly<{
  version: 1;
  contract: typeof PERSONAL_WORKSPACE_POC_ENTRY_READ_CONTRACT;
  [entryReadBrand]: true;
}>;
export type PersonalWorkspacePocEntryReadInput = Readonly<{
  baseModel: PersonalWorkspacePocReadModel;
  state: PersonalWorkspacePocState;
  /** Caller reads the exact existing source key. This function has no I/O port. */
  sourceRead: Readonly<{ ok: true; raw: string | null }> | Readonly<{ ok: false; reason: string }>;
}>;
export type PersonalWorkspacePocEntryReadFailure = Readonly<{ ok: false; reason: string }>;
export type PersonalWorkspacePocEntryReadField<T> =
  | Readonly<{ availability: 'present'; value: T; owner: PersonalWorkspacePocFieldOwner; provenance: PersonalWorkspacePocFieldProvenance }>
  | Readonly<{ availability: 'unavailable' }>;
export type PersonalWorkspacePocEntryReadLink = Readonly<{
  raw: string;
  status: 'safe' | 'unsafe';
  /** Exact retained URL, not the canonical lookup string. Absent means no anchor. */
  href?: string;
}>;
export type PersonalWorkspacePocEntryReadCard = Readonly<{
  flowRef: string;
  sourceTitle?: string;
  sourceLinks: readonly PersonalWorkspacePocEntryReadLink[];
}>;
export type PersonalWorkspacePocEntrySourceItem = Readonly<{
  itemRef: string;
  savedCopyId: string;
  flowId: string;
  itemId: string;
  title: PersonalWorkspacePocEntryReadField<string>;
  description: PersonalWorkspacePocEntryReadField<string>;
  date: PersonalWorkspacePocEntryReadField<string>;
  order: PersonalWorkspacePocEntryReadField<number>;
  sourceSchedule?: PersonalWorkspacePocScheduleInput;
  sectionId?: string;
  /** A typed source time only. D-offset labels are never parsed as clock times. */
  time?: string;
  completionCriterion?: string;
  sourceChecked?: boolean;
  sourceLabel?: string;
  sourceLink?: PersonalWorkspacePocEntryReadLink;
}>;
export type PersonalWorkspacePocEntrySourceView = Readonly<{
  owner: 'source';
  flowRef: string;
  title: PersonalWorkspacePocEntryReadField<string>;
  completeness: 'partial';
  wholeText: Readonly<{ availability: 'unavailable'; reason: 'saved-plan-has-no-full-source' }>;
  /** Source order only when every item has a distinct, source-owned order. */
  orderAvailability: 'source-order' | 'unavailable';
  items: readonly PersonalWorkspacePocEntrySourceItem[];
  sections: readonly Readonly<{
    sectionId: string;
    title: PersonalWorkspacePocEntryReadField<string>;
    order: PersonalWorkspacePocEntryReadField<number>;
  }>[];
}>;
export type PersonalWorkspacePocEntryPreview = Readonly<{
  flowRef: string;
  defaultOwner: 'personal-copy';
  personalResult: PersonalWorkspacePocResultProjectionV3;
  sourceView: PersonalWorkspacePocEntrySourceView;
  personalDetails: readonly Readonly<{
    itemRef: string;
    memo: PersonalWorkspacePocEntryReadField<string>;
  }>[];
}>;

type Captured = Readonly<{
  sourceModel: PersonalWorkspacePocReadModel;
  searchModel: PersonalWorkspacePocReadModel;
  sourceIndex: PersonalWorkspacePocSourceReadIndex;
  state: PersonalWorkspacePocState;
}>;
const packets = new WeakMap<object, Captured>();
class ReadError extends Error {}
function fail(reason: string): never { throw new ReadError(reason); }
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Data-only clone, preserving optional undefined and exact strings without invoking getters/toJSON. */
function cloneData<T>(value: T, ancestors = new WeakSet<object>()): T {
  if (value === undefined || value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'object' || value === null) fail('non-data-input');
  if (ancestors.has(value)) fail('cyclic-input');
  const array = Array.isArray(value), prototype = Object.getPrototypeOf(value);
  if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) fail('non-plain-input');
  if (Object.getOwnPropertySymbols(value).length) fail('symbol-input');
  ancestors.add(value);
  const output: unknown[] | Record<string, unknown> = array ? [] : {};
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (array && key === 'length') continue;
    if (!('value' in descriptor) || !descriptor.enumerable) fail('accessor-input');
    if (['__proto__', 'constructor', 'prototype', 'toJSON'].includes(key)) fail('unsafe-input-key');
    if (array && (!/^(0|[1-9]\d*)$/u.test(key) || Number(key) >= (value as unknown[]).length)) fail('invalid-array-input');
    Object.defineProperty(output, key, { value: cloneData(descriptor.value, ancestors), enumerable: true, configurable: true, writable: true });
  }
  if (array && Object.keys(descriptors).length !== (value as unknown[]).length + 1) fail('sparse-input');
  ancestors.delete(value);
  return output as T;
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function resultFailure(error: unknown): PersonalWorkspacePocEntryReadFailure {
  return { ok: false, reason: error instanceof ReadError ? error.message : 'invalid-read-input' };
}
function exactKeys(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  if (!isRecord(value) || Object.keys(value).some(key => !keys.includes(key))) fail('invalid-read-input');
}
function readCaptured(packet: PersonalWorkspacePocEntryReadPacket): Captured | undefined {
  return packet && typeof packet === 'object' ? packets.get(packet) : undefined;
}
function retainedLink(raw: string): PersonalWorkspacePocEntryReadLink {
  try {
    const url = new URL(raw);
    if (url.protocol === 'http:' || url.protocol === 'https:') return { raw, href: raw, status: 'safe' };
  } catch { /* No anchor; retaining the original text is not URL repair. */ }
  return { raw, status: 'unsafe' };
}
function card(flow: PersonalWorkspacePocFlow): PersonalWorkspacePocEntryReadCard {
  const discovery = flow.presentation?.discovery;
  return {
    flowRef: flow.ref,
    ...(discovery?.sourceTitle !== undefined ? { sourceTitle: discovery.sourceTitle } : {}),
    sourceLinks: (discovery?.sourceUrls ?? []).map(retainedLink),
  };
}

/** All checks finish before a packet is issued; a failed source read is never absence. */
export function buildPersonalWorkspacePocEntryReadPacket(input: PersonalWorkspacePocEntryReadInput):
  | Readonly<{ ok: true; packet: PersonalWorkspacePocEntryReadPacket }>
  | PersonalWorkspacePocEntryReadFailure {
  try {
    const data = cloneData(input);
    exactKeys(data, ['baseModel', 'state', 'sourceRead']);
    exactKeys(data.sourceRead, ['ok', 'raw', 'reason']);
    const read = data.sourceRead;
    if (read.ok === false) {
      if (Object.hasOwn(read, 'raw') || typeof read.reason !== 'string') fail('invalid-source-read');
      fail('source-read-failed');
    }
    if (read.ok !== true || Object.hasOwn(read, 'reason') || !Object.hasOwn(read, 'raw')
      || (read.raw !== null && typeof read.raw !== 'string')) fail('invalid-source-read');
    if (!isPersonalWorkspacePocState(data.state)) fail('invalid-state-shape');
    const parsed = read.raw === null ? undefined : parsePersonalWorkspacePocSourceCandidateStore(read.raw as string);
    if (parsed && !parsed.ok) fail(parsed.reason);
    const store = parsed?.ok ? parsed.store : undefined;
    const sourceRead = buildPersonalWorkspacePocSourceReadIndex({
      baseModel: data.baseModel, authoredFlows: data.state.authoredFlows ?? [],
      ...(store ? { sourceCandidateStore: store } : {}),
    });
    if (!sourceRead.ok) fail(sourceRead.reason);
    const originals = [...data.baseModel.flows, ...(data.state.authoredFlows ?? [])];
    const effective = store ? composePersonalWorkspacePocEffectiveSourceFlows(originals, store) : { ok: true as const, flows: originals };
    if (!effective.ok) fail(effective.reason);
    const composed = composePersonalWorkspacePocReadModel(data.baseModel, data.state, store);
    if (!composed.ok) fail(composed.reason);
    const references = validatePersonalWorkspacePocStateReferences(data.state, composed.model);
    if (!references.ok) fail(references.reason);
    for (const flow of composed.model.flows) {
      if (!readPersonalWorkspacePocTaskSourceContext(sourceRead.index, flow).ok) fail('invalid-source-index');
    }
    // Reuse the existing resolver's full validation, including persisted URL and map gates.
    const entry = resolvePersonalWorkspacePocEntry('', composed.model);
    if (!entry.ok) fail(entry.reason);
    const packet = Object.freeze({ version: 1, contract: PERSONAL_WORKSPACE_POC_ENTRY_READ_CONTRACT }) as PersonalWorkspacePocEntryReadPacket;
    packets.set(packet, {
      state: freeze(data.state), sourceIndex: sourceRead.index,
      sourceModel: freeze({ version: data.baseModel.version, flows: effective.flows }),
      searchModel: freeze(composed.model),
    });
    return { ok: true, packet };
  } catch (error) { return resultFailure(error); }
}

export function resolvePersonalWorkspacePocEntryRead(packet: PersonalWorkspacePocEntryReadPacket, rawInput: string):
  | Readonly<{ ok: true; resolution: PersonalWorkspacePocEntryResolution; cards: readonly PersonalWorkspacePocEntryReadCard[] }>
  | PersonalWorkspacePocEntryReadFailure {
  const captured = readCaptured(packet);
  if (!captured) return { ok: false, reason: 'invalid-entry-read-packet' };
  if (typeof rawInput !== 'string') return { ok: false, reason: 'invalid-entry-input' };
  const result = resolvePersonalWorkspacePocEntry(rawInput, captured.searchModel);
  if (!result.ok) return { ok: false, reason: result.reason };
  const byRef = new Map(captured.sourceModel.flows.map(flow => [flow.ref, flow]));
  return freeze({ ok: true, resolution: result.resolution, cards: result.resolution.matches.map(match => card(byRef.get(match.flowRef)!)) });
}

function readOwned<T>(field: PersonalWorkspacePocOwnedFieldValue<T>, kind: 'string' | 'number', owners: readonly PersonalWorkspacePocFieldOwner[]): PersonalWorkspacePocEntryReadField<T> {
  if (!isRecord(field) || typeof field.owner !== 'string' || typeof field.provenance !== 'string') fail('invalid-field-owner');
  if (!owners.includes(field.owner) || !Object.hasOwn(field, 'value') || field.value === undefined) return { availability: 'unavailable' };
  if (typeof field.value !== kind || (kind === 'number' && (!Number.isSafeInteger(field.value) || (field.value as number) < 0))) fail('invalid-owned-value');
  return { availability: 'present', value: field.value as T, owner: field.owner, provenance: field.provenance };
}
function sourceField<T>(field: PersonalWorkspacePocOwnedFieldValue<T>, kind: 'string' | 'number') {
  return readOwned(field, kind, ['source', 'authoring']);
}

export function readPersonalWorkspacePocEntryPreview(packet: PersonalWorkspacePocEntryReadPacket, input: Readonly<{
  flowRef: string; localToday: string; baseDate?: string; selectedDate?: string;
}>): Readonly<{ ok: true; preview: PersonalWorkspacePocEntryPreview }> | PersonalWorkspacePocEntryReadFailure {
  try {
    const captured = readCaptured(packet);
    if (!captured) fail('invalid-entry-read-packet');
    const options = cloneData(input);
    exactKeys(options, ['flowRef', 'localToday', 'baseDate', 'selectedDate']);
    const flow = captured.sourceModel.flows.find(candidate => candidate.ref === options.flowRef);
    if (!flow) fail('flow-not-found');
    // Search eligibility remains unchanged; authored handoff reading stays in its existing workspace lane.
    if (flow.origin === 'authoring-handoff' || flow.presentation?.mapGroup?.executionState === 'review-hold') fail('entry-flow-not-eligible');
    const source = resolvePersonalWorkspacePocSourceFlow(flow, captured.sourceIndex);
    if (!source.ok) fail(source.reason);
    const projected = buildPersonalWorkspacePocResultProjection({
      model: captured.sourceModel, state: captured.state, sourceIndex: captured.sourceIndex,
      purpose: 'personal-execution', ...options,
    });
    if (!projected.ok) fail(projected.reason);
    const personalFlow = captured.searchModel.flows.find(candidate => candidate.ref === flow.ref)!;
    const items = flow.items.map((item): PersonalWorkspacePocEntrySourceItem => {
      const owned = getPersonalWorkspacePocFlowItemFieldOwnership(item, flow.origin, flow);
      const attributes = source.itemContextByRef.get(item.ref)?.attributes;
      return {
        itemRef: item.ref, savedCopyId: item.savedCopyId, flowId: item.flowId, itemId: item.itemId,
        title: sourceField(owned.title.source, 'string'), description: sourceField(owned.description.source, 'string'),
        date: sourceField(owned.date.source, 'string'), order: sourceField(owned.order.source, 'number'),
        ...(['source', 'authoring'].includes(owned.dateDerivation.sourceSchedule.owner)
          ? { sourceSchedule: cloneData(owned.dateDerivation.sourceSchedule) } : {}),
        ...(item.sectionId !== undefined ? { sectionId: item.sectionId } : {}),
        ...(attributes?.time !== undefined ? { time: attributes.time } : {}),
        ...((attributes?.completionCriteria ?? item.completionCriterion) !== undefined
          ? { completionCriterion: attributes?.completionCriteria ?? item.completionCriterion } : {}),
        ...(attributes?.sourceChecked !== undefined ? { sourceChecked: attributes.sourceChecked } : {}),
        ...(attributes?.sourceLabel !== undefined ? { sourceLabel: attributes.sourceLabel } : {}),
        ...(attributes?.sourceUrl !== undefined ? { sourceLink: retainedLink(attributes.sourceUrl) } : {}),
      };
    });
    const knownOrder = items.every(item => item.order.availability === 'present')
      && new Set(items.map(item => item.order.availability === 'present' ? item.order.value : undefined)).size === items.length;
    if (knownOrder) items.sort((a, b) => (a.order.availability === 'present' ? a.order.value : 0) - (b.order.availability === 'present' ? b.order.value : 0));
    const sourceView: PersonalWorkspacePocEntrySourceView = {
      owner: 'source', flowRef: flow.ref, title: sourceField(getPersonalWorkspacePocFlowFieldOwnership(flow).title.source, 'string'),
      completeness: 'partial', wholeText: { availability: 'unavailable', reason: 'saved-plan-has-no-full-source' },
      orderAvailability: knownOrder ? 'source-order' : 'unavailable', items,
      sections: (flow.sections ?? []).map(section => ({
        sectionId: section.sectionId,
        title: sourceField({ value: section.title, owner: section.titleOwner, provenance: 'legacy-v1-fallback' }, 'string'),
        order: sourceField({ value: section.sourceOrder, owner: section.titleOwner, provenance: 'legacy-v1-fallback' }, 'number'),
      })),
    };
    const personalDetails = personalFlow.items.map(item => ({
      itemRef: item.ref,
      memo: readOwned(getPersonalWorkspacePocFlowItemFieldOwnership(item, flow.origin, personalFlow).description.effective,
        'string', ['existing-personal', 'poc-personal']),
    }));
    return freeze({ ok: true, preview: { flowRef: flow.ref, defaultOwner: 'personal-copy',
      personalResult: cloneData(projected.projection), sourceView, personalDetails } });
  } catch (error) { return resultFailure(error); }
}
