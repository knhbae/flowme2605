import type { FlowBundle } from '../types';
import type { PersonalWorkspacePocFlow } from '../personal-workspace-poc-contract';
import { buildPersonalWorkspacePocReadModel } from '../personal-workspace-poc-read-model';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord, sourceBackedMyFlowBundles,
  type SourceBackedFlowMapSavedSnapshot, type SourceBackedFlowMapPersistenceRecord } from '../source-backed-my-flow';

/** Genuine structured evidence, not an authoring document or a public Program
 * publication. The saved projection and catalog package remain distinguishable. */
export type ProgramLegacyMapSourceRevision =
  | { kind: 'saved-map-projection'; flow: PersonalWorkspacePocFlow }
  | { kind: 'source-backed-map'; flow: PersonalWorkspacePocFlow; snapshot: SourceBackedFlowMapSavedSnapshot;
      persistence: SourceBackedFlowMapPersistenceRecord; bundles: FlowBundle[] };
export type ProgramLegacyStructuredSource = { version: 1; requestId: string; confirmedAt: string; sourceToken: string; revisions: Record<string, ProgramLegacyMapSourceRevision> };
const canonical = (value: unknown): string => JSON.stringify(value, (_key, entry) => entry && typeof entry === 'object' && !Array.isArray(entry)
  ? Object.fromEntries(Object.keys(entry).sort().map(key => [key, entry[key]])) : entry);
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

/** The key identifies the entire immutable structured snapshot, not a made-up
 * creator version. Include exact evidence rather than a title/order hash. */
export function programLegacyMapRevisionId(revision: ProgramLegacyMapSourceRevision): string {
  const value = canonical(revision);
  // Content addressing is an index, never the identity validation: every read
  // checks the complete immutable evidence and exact Flow/Step tuples below.
  let a = 2166136261, b = 0x9e3779b9;
  for (let i = 0; i < value.length; i++) { a = Math.imul(a ^ value.charCodeAt(i), 16777619); b = Math.imul(b ^ value.charCodeAt(i), 2246822519); }
  return `map-snapshot:${encodeURIComponent(revision.flow.presentation!.mapGroup!.ownerId)}:${(a >>> 0).toString(16)}:${(b >>> 0).toString(16)}:${value.length}`;
}

/** The sole memory-only reader edge for both single-child and whole-Map
 * evidence. It receives supplied bytes, never a browser storage port. */
export function readProgramLegacyMapEvidence(revision: Pick<Extract<ProgramLegacyMapSourceRevision, { kind: 'source-backed-map' }>, 'snapshot' | 'persistence' | 'bundles'>) {
  const mapId = revision.snapshot.mapId;
  const entries = { [`flow:map:saved:${mapId}`]: JSON.stringify(revision.snapshot), [`flow:map:persistence:${mapId}`]: JSON.stringify(revision.persistence) };
  return buildPersonalWorkspacePocReadModel({ length: 2, key: index => Object.keys(entries)[index] ?? null, getItem: key => entries[key as keyof typeof entries] ?? null }, revision.bundles);
}

export function validateProgramLegacyMapRevision(revision: ProgramLegacyMapSourceRevision, original: PersonalWorkspacePocFlow): boolean {
  try {
    if (!revision || !['saved-map-projection', 'source-backed-map'].includes(revision.kind) || !revision.flow || 'authoring' in revision.flow
      || !original.presentation?.mapGroup || original.origin !== 'source-backed-map' || revision.flow.ref !== original.ref
      || revision.flow.savedCopyId !== original.savedCopyId || revision.flow.flowId !== original.flowId || revision.flow.sourceSlug !== original.sourceSlug
      || revision.flow.presentation?.mapGroup?.ownerId !== original.presentation.mapGroup.ownerId) return false;
    if (revision.kind === 'saved-map-projection') return Object.keys(revision).length === 2 && canonical(revision.flow) === canonical(original);
    if (Object.keys(revision).sort().join(',') !== 'bundles,flow,kind,persistence,snapshot' || !Array.isArray(revision.bundles)
      || revision.snapshot.mapId !== original.presentation.mapGroup.ownerId || revision.persistence.map.id !== revision.snapshot.mapId
      || revision.snapshot.personalCopy || revision.persistence.personalCopy) return false;
    const read = readProgramLegacyMapEvidence(revision);
    if (!read.ok) return false;
    const found = read.model.flows.find(flow => flow.ref === original.ref);
    if (!found || canonical(found) !== canonical(revision.flow)) return false;
    const child = revision.persistence.childFlows.find(flow => flow.flowId === original.flowId && flow.slug === original.sourceSlug);
    // This is the actual existing Step -> projected Item identity contract.
    return !!child && child.steps.length === found.items.length && new Set(child.stepIds).size === child.steps.length
      && found.items.every(item => child.steps.some(step => step.stepId === item.itemId));
  } catch { return false; }
}

/** Read only local, actual source-backed factory data. No HTTP, browser storage,
 * synthetic TXT, guessed match, or operating writer is involved. */
export function readProgramLegacyCurrentMapSource(original: PersonalWorkspacePocFlow, now: string) {
  const mapId = original.presentation?.mapGroup?.ownerId;
  if (!mapId || original.origin !== 'source-backed-map') return null;
  const snapshot = buildSourceBackedFlowMapSavedSnapshot(mapId, { savedAt: now, ...(original.anchorDate ? { anchor: original.anchorDate } : {}) });
  const persistence = buildSourceBackedFlowMapPersistenceRecord(mapId, { savedAt: now, ...(original.anchorDate ? { anchor: original.anchorDate } : {}) });
  if (!snapshot || !persistence) return null;
  const bundles = sourceBackedMyFlowBundles.filter(bundle => snapshot.flowSlugs.includes(bundle.flow.slug));
  const evidence = clone({ kind: 'source-backed-map' as const, snapshot, persistence, bundles, flow: original });
  const read = readProgramLegacyMapEvidence(evidence);
  if (!read.ok) return null;
  const flow = read.model.flows.find(flow => flow.ref === original.ref);
  if (!flow) return null;
  evidence.flow = flow;
  return validateProgramLegacyMapRevision(evidence, original) ? evidence : null;
}

export function programLegacyMapEvidenceText(revision: ProgramLegacyMapSourceRevision): string {
  return JSON.stringify(revision, null, 2);
}
