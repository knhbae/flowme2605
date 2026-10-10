import type { AlphaAccount, AlphaReferenceContext } from '../alpha-persistence/contract';
import type { AlphaCreatorIntent } from './contract';
import type { ProgramCreatorWorkspaceState, ProgramCreatorWorking } from '../creator-workspace-contract';
import type { NativeCreatorDocumentOwner, NativeCreatorDocumentProvenance } from '../native-creator-document-contract';
import { creatorWorkingFromRecord, importedCreatorWorking } from '../creator-workspace';
import { PROGRAM_CREATOR_HISTORY_LIMIT } from '../creator-history-contract';
import { canonicalJson } from '../alpha-persistence/json';
import { isAccountForOwner } from '../alpha-auth/account-access';
import { preservesAlphaPrivateSources } from '../alpha-server/private-boundary';
import { importCatalogContentWorkspace } from '../catalog-content-import';
import type { AlphaCreatorCatalogSource } from './dispatch';

export const ALPHA_CREATOR_FIELDS = Object.freeze(['creatorWorkspace', 'text', 'archivedDocumentIds', 'retentionDocuments'] as const);
const same = (a: unknown, b: unknown) => canonicalJson(a ?? null) === canonicalJson(b ?? null);
const ownSame = (a: object, b: object, key: string) => Object.hasOwn(a, key) === Object.hasOwn(b, key)
  && (!Object.hasOwn(a, key) || same((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
const handoffTypes = new Set<AlphaCreatorIntent['type']>(['raw-handoff', 'native-handoff', 'native-lineage', 'raw-update']);

/** Working autosave may edit user input, but cannot replace a native document,
 * synthesize an imported source, or advance a saved/context/journal revision. */
export function allowedAlphaCreatorWorking(workspace: ProgramCreatorWorkspaceState | undefined, next: ProgramCreatorWorking | null): boolean {
  if (next === null) return true;
  const current = workspace?.working;
  const imported=workspace?Object.keys(workspace.importedWorkingCandidates?.candidates??{}).map(id=>importedCreatorWorking(workspace,id)).find(candidate=>candidate&&same(candidate,next)):null;
  const baseline = imported ?? (current?.draftId === next.draftId ? current : workspace ? creatorWorkingFromRecord(workspace, next.draftId) : null);
  if (!baseline) return next.baseRecordRevision === null && next.nativeDocument === undefined && next.nativeSelection === undefined && next.nativePendingRawText === undefined;
  if (next.baseRecordRevision !== baseline.baseRecordRevision || !ownSame(baseline, next, 'nativeDocument') || !ownSame(baseline, next, 'nativeSelection')) return false;
  return true;
}
function owners(workspace: ProgramCreatorWorkspaceState | undefined): NativeCreatorDocumentOwner[] {
  if (!workspace) return [];
  return [workspace.working?.nativeDocument, ...Object.values(workspace.importedWorkingCandidates?.candidates??{}).map(c=>c.working.nativeDocument), ...Object.values(workspace.structureDrafts ?? {}).map(c => c.nativeDocument),
    ...Object.values(workspace.savedHistory?.drafts ?? {}).flatMap(rows => rows.flatMap(r => r.kind === 'program' ? [r.context?.nativeDocument] : [])),
    ...Object.values(workspace.nativeExecutionSources ?? {}).flatMap(owner => owner.revisions.map(r => r.nativeDocument))].filter((v): v is NativeCreatorDocumentOwner => !!v);
}
function knownSources(workspace: ProgramCreatorWorkspaceState | undefined): NativeCreatorDocumentProvenance[] {
  return [...owners(workspace).flatMap(owner => [owner.source, ...owner.actions.flatMap(a => a.kind === 'restore' ? [a.source] : [])]),
    ...Object.values(workspace?.savedHistory?.drafts ?? {}).flatMap(rows => rows.flatMap(r => r.kind === 'text-authoring-v1' ? [r.origin] : []))];
}
/** Defense after semantic dispatch. Native source bytes and imported history are
 * read-only M6 provenance. Existing execution revisions never change in place. */
export function preservesAlphaCreatorBoundary(before: AlphaAccount, after: AlphaAccount, intent: AlphaCreatorIntent, references?: AlphaReferenceContext, catalog?: AlphaCreatorCatalogSource): boolean {
  try {
    if (!isAccountForOwner(before, before.ownerId, references) || !isAccountForOwner(after, before.ownerId, references)
      || !preservesAlphaPrivateSources(before, after, references)) return false;
    for (const field of ['schema', 'ownerId', 'revision', 'source', 'legacyUndo', 'legacyReceipts'] as const) if (!same(before[field], after[field])) return false;
    const allowed = intent.type === 'catalog-library-import' ? ['catalogLibrary'] : handoffTypes.has(intent.type) ? ALPHA_CREATOR_FIELDS as readonly string[] : ['creatorWorkspace'];
    for (const field of new Set([...Object.keys(before.space), ...Object.keys(after.space)])) if (!allowed.includes(field) && !ownSame(before.space, after.space, field)) return false;
    const a = before.space.creatorWorkspace, b = after.space.creatorWorkspace;
    if (intent.type === 'catalog-library-import') {
      if (!catalog) return false;
      const expected = catalog.library(intent.now);
      return expected.catalogVersion === intent.catalogVersion
        && same(after.space.catalogLibrary, before.space.catalogLibrary ?? expected);
    }
    if (intent.type === 'catalog-content-import') {
      if (!catalog) return false;
      const expected = importCatalogContentWorkspace(a, intent, catalog.library(intent.now));
      return expected.ok && same(expected.workspace, b);
    }
    if (!b) return !a;
    if (!same(a?.origins ?? {}, b.origins)) return false;
    if (!same(a?.importedWorkingCandidates,b.importedWorkingCandidates)) return false;
    const nativeHistory = (w: ProgramCreatorWorkspaceState | undefined) => Object.fromEntries(Object.entries(w?.savedHistory?.drafts ?? {})
      .flatMap(([id, rows]) => { const native = rows.filter(r => r.kind === 'text-authoring-v1'); return native.length ? [[id, native]] : []; }));
    if (!same(nativeHistory(a), nativeHistory(b))) return false;
    const maySave = intent.type === 'history-restore' || intent.type === 'library-action' && ['save', 'duplicate'].includes(intent.action.type);
    for (const [id, entries] of Object.entries(a?.savedHistory?.drafts ?? {})) {
      const nextEntries = b.savedHistory?.drafts[id] ?? [];
      for (const entry of entries) {
        const retained = nextEntries.find(row => row.id === entry.id);
        if (retained ? !same(entry, retained) : !maySave || entry.kind !== 'program' || nextEntries.filter(row => row.kind === 'program').length !== PROGRAM_CREATOR_HISTORY_LIMIT) return false;
      }
    }
    if (['native-operation', 'source-stage', 'source-transition', 'source-upgrade'].includes(intent.type)) {
      for (const field of new Set([...Object.keys(a ?? {}), ...Object.keys(b)])) if (!['working', 'sourceUpdateSessions'].includes(field)
        && !ownSame(a ?? {}, b, field)) return false;
    }
    if (handoffTypes.has(intent.type)) for (const field of new Set([...Object.keys(a ?? {}), ...Object.keys(b)])) if (!['handoffs', 'executionSources', 'nativeExecutionSources'].includes(field)
      && !ownSame(a ?? {}, b, field)) return false;
    const known = knownSources(a);
    if (owners(b).some(owner => !known.some(source => same(source, owner.source))
      || owner.actions.some(action => action.kind === 'restore' && !known.some(source => same(source, action.source))))) return false;
    for (const key of ['executionSources', 'nativeExecutionSources'] as const) {
      for (const [id, owner] of Object.entries(a?.[key] ?? {})) {
        const next = b[key]?.[id];
        if (!next || next.id !== owner.id || next.draftId !== owner.draftId || next.documentId !== owner.documentId
          || !same(next.revisions.slice(0, owner.revisions.length), owner.revisions)) return false;
      }
    }
    if (handoffTypes.has(intent.type) && (!same(before.space.text.progressRecords, after.space.text.progressRecords)
      || !same(before.space.recurrenceExecution, after.space.recurrenceExecution))) return false;
    if (intent.type === 'working') {
      if (!allowedAlphaCreatorWorking(a, intent.working) || !same(b.working, intent.working)) return false;
      if (a) { const { working: _a, ...restA } = a, { working: _b, ...restB } = b; if (!same(restA, restB)) return false; }
      else if (Object.keys(b.library.records).length || Object.keys(b.origins).length || Object.keys(b.handoffs).length
        || Object.keys(b).some(k => !['version', 'library', 'origins', 'handoffs', 'working'].includes(k))) return false;
    }
    return true;
  } catch { return false; }
}
