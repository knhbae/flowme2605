import type { FlowBundle } from '../types';
import { toPersonalWorkspacePocMapGroupRef, type PersonalWorkspacePocFlow } from '../personal-workspace-poc-contract';
import { buildPersonalWorkspacePocSourceReadIndex } from '../personal-workspace-poc-source-attributes';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord, buildSourceBackedMyFlowRows, sourceBackedMyFlowBundles,
  sourceBackedMyFlowMaps, type SourceBackedMyFlowMap, type SourceBackedFlowMapSavedSnapshot,
  type SourceBackedFlowMapPersistenceRecord } from '../source-backed-my-flow';
import { readProgramLegacyMapEvidence, validateProgramLegacyMapRevision } from './legacy-map-source';

/** Replaceable Program adapter bounds, not source or publication policy.
 * The later transaction owner can use the same request-ID boundary. */
export const PROGRAM_LEGACY_MAP_MEMBERSHIP_LIMITS = Object.freeze({
  version: 1 as const, maxEvidenceBytes: 10_000_000, maxRevisions: 81, maxGroups: 200, maxReviews: 80,
  maxIdentifierLength: 1200, maxRequestIdLength: 1100,
});

/** Program-only evidence reader. A package is local structured evidence, not a
 * creator publication or proof of a remote publisher's authority. No writer or
 * runtime integration is provided here. In particular, absence never archives
 * a personal document, deletes a record, or changes an execution policy. */
export type ProgramLegacyMapMembershipRevision = {
  kind: 'source-backed-map-membership';
  groupRef: string; ownerId: string;
  /** Keep the declared catalog list: the legacy factory omits missing bundles
   * from its saved snapshot. Missing material is not an intentional deletion. */
  catalogMap: SourceBackedMyFlowMap;
  snapshot: SourceBackedFlowMapSavedSnapshot;
  persistence: SourceBackedFlowMapPersistenceRecord;
  bundles: FlowBundle[];
};
export type ProgramLegacyMapMembershipSelection = {
  version: 1; baseSourceToken: string;
  revisions: Record<string, ProgramLegacyMapMembershipRevision>;
  /** The exact non-empty package that proved this original child's absence. */
  acceptedAbsences: Record<string, string>;
};
export type ProgramLegacyMapMembershipChange = { id: string; flowRef: string; kind: 'removed' | 'restored' };
const canonical = (value: unknown): string => JSON.stringify(value, (_key, entry) => entry && typeof entry === 'object' && !Array.isArray(entry)
  ? Object.fromEntries(Object.keys(entry).sort().map(key => [key, entry[key]])) : entry);
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const fail = (reason: string) => ({ ok: false as const, reason });
const forbidden = new Set(['__proto__', 'constructor', 'prototype']);
const id = (value: unknown): value is string => typeof value === 'string' && !!value.trim()
  && value.length <= PROGRAM_LEGACY_MAP_MEMBERSHIP_LIMITS.maxIdentifierLength && !forbidden.has(value);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const keys = (value: object, expected: string[]) => Object.keys(value).sort().join(',') === [...expected].sort().join(',');
const stamp = (value: string) => /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/u.test(value) && Number.isFinite(Date.parse(value));
const unique = (values: readonly string[]) => values.every(id) && new Set(values).size === values.length;
const sameSet = (a: readonly string[], b: readonly string[]) => unique(a) && unique(b) && canonical([...a].sort()) === canonical([...b].sort());

/** Reject accessors before reading values, lossy JSON, prototype keys, and
 * non-persistable evidence. This does not normalize caller-owned objects. */
function jsonTree(value: unknown, ancestors = new Set<object>()): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || ancestors.has(value) || Object.getOwnPropertySymbols(value).length) return false;
  if (!Array.isArray(value) && !record(value)) return false;
  ancestors.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const entries = Object.entries(descriptors).filter(([key]) => !Array.isArray(value) || key !== 'length');
  if (Array.isArray(value) && (entries.length !== value.length || entries.some(([key], index) => key !== String(index)))) return false;
  for (const [key, descriptor] of entries) if (forbidden.has(key) || !descriptor.enumerable || !('value' in descriptor)
    || !jsonTree(descriptor.value, ancestors)) return false;
  ancestors.delete(value); return true;
}
function persisted(value: unknown) {
  if (!jsonTree(value)) return false;
  const raw = JSON.stringify(value);
  return raw.length <= PROGRAM_LEGACY_MAP_MEMBERSHIP_LIMITS.maxEvidenceBytes
    && new TextEncoder().encode(raw).length <= PROGRAM_LEGACY_MAP_MEMBERSHIP_LIMITS.maxEvidenceBytes;
}

/** Original membership is the entire saved group, never a single child's
 * current projection or its personally selected subset. No owner is created. */
export function readProgramLegacyMapMembershipBase(originals: readonly PersonalWorkspacePocFlow[], groupRef: string) {
  try {
    if (!id(groupRef) || !persisted(originals) || !Array.isArray(originals)) return fail('invalid-original-map');
    const flows = originals.filter(flow => flow.presentation?.mapGroup?.groupRef === groupRef)
      .sort((a, b) => a.presentation!.mapGroup!.childOrder - b.presentation!.mapGroup!.childOrder);
    if (!flows.length) return fail('missing-original-map');
    const group = flows[0].presentation!.mapGroup!;
    if (!id(group.ownerId) || groupRef !== toPersonalWorkspacePocMapGroupRef(group.ownerId)
      || !Number.isSafeInteger(group.childCount) || group.childCount !== flows.length
      || !unique(flows.map(flow => flow.ref)) || !unique(flows.map(flow => flow.flowId)) || !unique(flows.map(flow => flow.sourceSlug))
      || !buildPersonalWorkspacePocSourceReadIndex({ baseModel: { version: 1, flows } }).ok
      || flows.some((flow, index) => {
        const own = flow.presentation!.mapGroup!;
        return flow.origin !== 'source-backed-map' || 'authoring' in flow || own.ownerId !== group.ownerId
          || own.childOrder !== index || own.childCount !== flows.length || own.title !== group.title
          || !['executable', 'review-hold'].includes(own.executionState) || own.executionState !== group.executionState
          || canonical(own.reviewReasons) !== canonical(group.reviewReasons)
          || flow.anchorDate !== flows[0].anchorDate;
      })) return fail('invalid-original-map');
    return { ok: true as const, groupRef, ownerId: group.ownerId, flows: clone(flows),
      sourceToken: canonical({ groupRef, ownerId: group.ownerId, flows }) };
  } catch { return fail('invalid-original-map'); }
}

/** Content address is an index only; readers still validate full evidence. */
export function programLegacyMapMembershipRevisionId(revision: ProgramLegacyMapMembershipRevision) {
  const raw = canonical(revision); let a = 2166136261, b = 0x9e3779b9;
  for (let i = 0; i < raw.length; i++) { a = Math.imul(a ^ raw.charCodeAt(i), 16777619); b = Math.imul(b ^ raw.charCodeAt(i), 2246822519); }
  return `map-membership:${encodeURIComponent(revision.ownerId)}:${(a >>> 0).toString(16)}:${(b >>> 0).toString(16)}:${raw.length}`;
}

/** Reconstruct every child through the existing memory read port. The supplied
 * package can outlive the static factory revision that originally produced it. */
export function inspectProgramLegacyMapMembershipRevision(value: unknown, originals: readonly PersonalWorkspacePocFlow[]) {
  return inspectMembershipRevision(value, originals);
}
function inspectMembershipRevision(value: unknown, originals: readonly PersonalWorkspacePocFlow[], verifiedBase?: Extract<ReturnType<typeof readProgramLegacyMapMembershipBase>, { ok: true }>) {
  try {
    if (!persisted(value) || !record(value) || !keys(value, ['kind', 'groupRef', 'ownerId', 'catalogMap', 'snapshot', 'persistence', 'bundles'])
      || value.kind !== 'source-backed-map-membership' || !id(value.groupRef) || !id(value.ownerId)) return fail('invalid-membership-evidence');
    const revision = value as ProgramLegacyMapMembershipRevision;
    const base = verifiedBase ?? readProgramLegacyMapMembershipBase(originals, revision.groupRef);
    if (!base.ok || base.ownerId !== revision.ownerId) return fail('foreign-map-owner');
    const { catalogMap: map, snapshot, persistence, bundles } = revision;
    if (!map || !snapshot || !persistence || !Array.isArray(map.flowSlugs) || !Array.isArray(snapshot.flowSlugs)
      || !Array.isArray(persistence.childFlows) || !Array.isArray(bundles)) return fail('invalid-membership-evidence');
    if (!map.flowSlugs.length || !snapshot.flowSlugs.length) return fail('empty-map-not-supported');
    if (map.id !== base.ownerId || snapshot.mapId !== base.ownerId || persistence.map.id !== base.ownerId
      || snapshot.personalCopy !== undefined || persistence.personalCopy !== undefined
      || snapshot.title !== map.title || snapshot.version !== map.version
      || canonical(persistence.map) !== canonical({ id: map.id, title: map.title, userLabel: map.userLabel, version: map.version,
        updatedAt: map.updatedAt, updatePolicy: map.updatePolicy, sourceTitle: map.sourceTitle, sourceUrl: map.sourceUrl })
      || snapshot.savedAt !== persistence.saved.savedAt || !stamp(snapshot.savedAt)
      || (snapshot.anchor ?? undefined) !== base.flows[0].anchorDate
      || !sameSet(map.flowSlugs, snapshot.flowSlugs) || canonical(map.flowSlugs) !== canonical(snapshot.flowSlugs)
      || !sameSet(map.flowSlugs, persistence.childFlows.map(child => child.slug))
      || !sameSet(map.flowSlugs, bundles.map(bundle => bundle.flow.slug))
      || !unique(bundles.map(bundle => bundle.flow.id))
      || !sameSet(Object.keys(snapshot.stepCountsByFlow), map.flowSlugs)
      || canonical(snapshot.riskLevelsByFlow) !== canonical(Object.fromEntries(bundles.map(bundle => [bundle.flow.slug, bundle.flow.risk_level])))
      || canonical(snapshot.sourceCheckedAtByFlow) !== canonical(Object.fromEntries(bundles.map(bundle => [bundle.flow.slug, bundle.flow.source_checked_at])))) return fail('map-package-mismatch');
    for (const bundle of bundles) {
      const child = persistence.childFlows.find(row => row.slug === bundle.flow.slug)!;
      const original = base.flows.find(flow => flow.sourceSlug === child.slug || flow.flowId === child.flowId);
      if (child.flowId !== bundle.flow.id || original && (original.flowId !== child.flowId || original.sourceSlug !== child.slug)
        || !Array.isArray(bundle.items) || !Array.isArray(bundle.sections) || !Array.isArray(child.steps) || !Array.isArray(child.stepIds)
        || !sameSet(bundle.items.map(item => item.id), child.stepIds) || !sameSet(child.stepIds, child.steps.map(step => step.stepId))
        || child.stepCount !== child.steps.length || snapshot.stepCountsByFlow[child.slug] !== child.stepCount
        || bundle.items.some(item => item.flow_id !== child.flowId || item.section_id !== undefined && !bundle.sections.some(section => section.id === item.section_id))
        || !unique(bundle.sections.map(section => section.id)) || bundle.sections.some(section => section.flow_id !== child.flowId)
        || bundle.itemDetails !== undefined && (!Array.isArray(bundle.itemDetails) || !unique(bundle.itemDetails.map(detail => detail.item_id))
          || bundle.itemDetails.some(detail => !child.stepIds.includes(detail.item_id)))) return fail('invalid-child-item-tuple');
      // These packages come from the source factory, not a personal persistence
      // overlay. A Step must be reproducible from the supplied source Item.
      const steps = buildSourceBackedMyFlowRows(bundle).map(row => ({ stepId: row.stepId, title: row.title,
        destination: row.destination, calendar: row.calendar, textFallback: row.textFallback,
        ...(row.sourceUrl ? { sourceUrl: row.sourceUrl } : {}), ...(row.sourceType ? { sourceType: row.sourceType } : {}),
        ...(row.riskLevel ? { riskLevel: row.riskLevel } : {}) }));
      if (canonical(child.steps) !== canonical(steps) || child.title !== bundle.flow.title
        || child.sourceTitle !== bundle.flow.source_title || child.sourceUrl !== bundle.flow.source_url
        || child.sourceCheckedAt !== bundle.flow.source_checked_at || child.structureType !== bundle.flow.structure_type
        || child.anchorType !== bundle.flow.anchor_type) return fail('child-source-evidence-mismatch');
    }
    const read = readProgramLegacyMapEvidence({ snapshot, persistence, bundles });
    if (!read.ok || read.model.flows.length !== map.flowSlugs.length) return fail('invalid-map-projection');
    const group = readProgramLegacyMapMembershipBase(read.model.flows, revision.groupRef);
    if (!group.ok || group.flows.some(flow => {
      const original = base.flows.find(row => row.flowId === flow.flowId || row.sourceSlug === flow.sourceSlug);
      return original && (original.ref !== flow.ref || original.savedCopyId !== flow.savedCopyId)
        || !validateProgramLegacyMapRevision({ kind: 'source-backed-map', snapshot, persistence, bundles, flow }, original ?? flow);
    })) return fail('invalid-map-projection');
    return { ok: true as const, revision: clone(revision), revisionId: programLegacyMapMembershipRevisionId(revision),
      original: base, flows: group.flows };
  } catch { return fail('invalid-membership-evidence'); }
}

/** One synchronous read scope, never a caller-supplied "validated" token.
 * Every invocation validates the original group and ALL revision packages.
 * The index stays private; detached projections are returned to the consumer,
 * and captured methods fail closed after the synchronous consumer returns.
 */
export function withProgramLegacyMapMembershipEvidence<T>(originals: readonly PersonalWorkspacePocFlow[], groupRef: string,
  revisions: unknown, consume: (read: {
    ownerId: string; baseSourceToken: string;
    validateAbsences: (value: unknown) => value is Record<string, string>;
    compare: (revisionId: string, acceptedAbsences: Record<string, string>) => ReturnType<typeof compareMembershipRead> | { ok: false; reason: string };
  }) => T) {
  let active = false;
  try {
    const base = readProgramLegacyMapMembershipBase(originals, groupRef);
    if (!base.ok) return base;
    if (!persisted(revisions) || !record(revisions) || Object.keys(revisions).length > PROGRAM_LEGACY_MAP_MEMBERSHIP_LIMITS.maxRevisions) return fail('invalid-membership-selection');
    const reads = new Map<string, Extract<ReturnType<typeof inspectMembershipRevision>, { ok: true }>>();
    for (const [revisionId, revision] of Object.entries(revisions)) {
      const read = inspectMembershipRevision(revision, originals, base);
      if (!read.ok || read.revision.groupRef !== groupRef || read.revisionId !== revisionId) return fail('invalid-membership-selection');
      reads.set(revisionId, read);
    }
    // Do not retain caller-owned mutable packages in the proof or its size check.
    const detachedRevisions = Object.fromEntries([...reads].map(([revisionId, read]) => [revisionId, read.revision]));
    const selection = <A,>(acceptedAbsences: A) => ({ version: 1 as const, baseSourceToken: base.sourceToken, revisions: detachedRevisions, acceptedAbsences });
    active = true;
    const validateAbsences = (value: unknown): value is Record<string, string> => active && record(value)
      && persisted(selection(value)) && Object.keys(value).length < base.flows.length
      && Object.entries(value).every(([ref, revisionId]) => id(ref) && id(revisionId) && base.flows.some(flow => flow.ref === ref)
        && reads.has(revisionId) && !reads.get(revisionId)!.flows.some(flow => flow.ref === ref));
    return { ok: true as const, value: consume({ ownerId: base.ownerId, baseSourceToken: base.sourceToken, validateAbsences,
      compare: (revisionId, acceptedAbsences) => {
        if (!active || !validateAbsences(acceptedAbsences)) return fail('invalid-membership-selection');
        const read = reads.get(revisionId);
        return read ? compareMembershipRead(read, selection(acceptedAbsences)) : fail('invalid-membership-evidence');
      } }) };
  } catch { return fail('invalid-membership-selection'); }
  finally { active = false; }
}

/** The only producer in this module: current local catalog factory read.
 * Missing Map, missing bundle, and empty Map are failures, never deletions. */
export function readProgramLegacyCurrentMapMembership(originals: readonly PersonalWorkspacePocFlow[], groupRef: string, now: string) {
  try {
    const base = readProgramLegacyMapMembershipBase(originals, groupRef);
    if (!base.ok) return base;
    if (!stamp(now)) return fail('invalid-time');
    const maps = sourceBackedMyFlowMaps.filter(map => map.id === base.ownerId);
    if (maps.length !== 1) return fail('missing-or-ambiguous-current-map');
    const snapshot = buildSourceBackedFlowMapSavedSnapshot(base.ownerId, { savedAt: now, ...(base.flows[0].anchorDate ? { anchor: base.flows[0].anchorDate } : {}) });
    const persistence = buildSourceBackedFlowMapPersistenceRecord(base.ownerId, { savedAt: now, ...(base.flows[0].anchorDate ? { anchor: base.flows[0].anchorDate } : {}) });
    if (!snapshot || !persistence) return fail('missing-current-map');
    const revision: ProgramLegacyMapMembershipRevision = clone({ kind: 'source-backed-map-membership', groupRef, ownerId: base.ownerId,
      catalogMap: maps[0], snapshot, persistence, bundles: sourceBackedMyFlowBundles.filter(bundle => maps[0].flowSlugs.includes(bundle.flow.slug)) });
    return inspectProgramLegacyMapMembershipRevision(revision, originals);
  } catch { return fail('invalid-current-map'); }
}

/** Optional for old snapshots; validating undefined neither creates an owner
 * nor writes a migration. Receipts cannot cite arbitrary revision strings. */
export function validateProgramLegacyMapMembershipSelection(value: unknown, originals: readonly PersonalWorkspacePocFlow[], groupRef: string): value is ProgramLegacyMapMembershipSelection | undefined {
  if (value === undefined) return true;
  try {
    const base = readProgramLegacyMapMembershipBase(originals, groupRef);
    if (!base.ok || !persisted(value) || !record(value) || !keys(value, ['version', 'baseSourceToken', 'revisions', 'acceptedAbsences'])
      || value.version !== 1 || value.baseSourceToken !== base.sourceToken || !record(value.revisions) || !record(value.acceptedAbsences)
      || Object.keys(value.revisions).length > PROGRAM_LEGACY_MAP_MEMBERSHIP_LIMITS.maxRevisions
      || Object.keys(value.acceptedAbsences).length >= base.flows.length) return false;
    const reads = new Map<string, Extract<ReturnType<typeof inspectProgramLegacyMapMembershipRevision>, { ok: true }>>();
    for (const [revisionId, revision] of Object.entries(value.revisions)) {
      const read = inspectProgramLegacyMapMembershipRevision(revision, originals);
      if (!read.ok || read.revision.groupRef !== groupRef || read.revisionId !== revisionId) return false;
      reads.set(revisionId, read);
    }
    return Object.entries(value.acceptedAbsences).every(([ref, revisionId]) => id(ref) && id(revisionId)
      && base.flows.some(flow => flow.ref === ref) && reads.has(revisionId) && !reads.get(revisionId)!.flows.some(flow => flow.ref === ref));
  } catch { return false; }
}

/** Only original-child membership is compared. Content edits and incoming new
 * children require their own acceptance contract. Personal source models stay
 * intact; consumers can use effectiveChildren for the common Map plan scope. */
export function compareProgramLegacyMapMembership(originals: readonly PersonalWorkspacePocFlow[], revision: ProgramLegacyMapMembershipRevision, selection?: ProgramLegacyMapMembershipSelection) {
  const read = inspectProgramLegacyMapMembershipRevision(revision, originals);
  if (!read.ok) return read;
  if (!validateProgramLegacyMapMembershipSelection(selection, originals, revision.groupRef)) return fail('invalid-membership-selection');
  return compareMembershipRead(read, selection);
}
function compareMembershipRead(read: Extract<ReturnType<typeof inspectMembershipRevision>, { ok: true }>, selection?: ProgramLegacyMapMembershipSelection) {
  if (read.flows.some(flow => !read.original.flows.some(original => original.ref === flow.ref))) return fail('new-child-acceptance-not-supported');
  const accepted = selection?.acceptedAbsences ?? {}, offered = new Set(read.flows.map(flow => flow.ref));
  const changes = read.original.flows.flatMap<ProgramLegacyMapMembershipChange>(flow => {
    const retained = Object.hasOwn(accepted, flow.ref);
    return !offered.has(flow.ref) && !retained ? [{ id: `child:${flow.ref}`, flowRef: flow.ref, kind: 'removed' as const }]
      : offered.has(flow.ref) && retained ? [{ id: `child:${flow.ref}`, flowRef: flow.ref, kind: 'restored' as const }] : [];
  });
  return clone({ ok: true as const, revisionId: read.revisionId, originalChildren: read.original.flows, offeredChildren: read.flows,
    effectiveChildren: read.original.flows.filter(flow => !Object.hasOwn(accepted, flow.ref)),
    retainedChildren: read.original.flows.filter(flow => Object.hasOwn(accepted, flow.ref)), changes,
    expectedSelection: canonical(selection ?? null) });
}
