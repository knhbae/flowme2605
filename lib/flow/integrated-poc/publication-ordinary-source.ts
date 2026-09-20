import { programClone, type ProgramData, type ProgramPrivateSpace, type ProgramPublicationDraft, type ProgramPublicationDraftRow } from './contract';
import { programSame } from './controller';
import { textWorkspaceModel as M } from './text-workspace';
import { creatorAdoptedRows } from './creator-adoption';
import { validateProgramCreatorExecutionSources } from './creator-execution-source';
import { programNativeSelectedRows, programNativeSelectionHeld, validateProgramNativeExecutionSources } from './creator-native-execution-validation';
import { programNativeExecutionDocument, programNativeExecutionItemFacts } from './creator-native-execution-facts';
import { programNativeSourceItemId } from './creator-native-execution-identity';
import { programPublicationSourceDescription } from './publication-series-draft';
import { programOrdinaryTimingDraft, type ProgramOrdinaryTiming } from './public-ordinary-time';

export const PROGRAM_PUBLICATION_SOURCE_FIELDS = ['title', 'description', 'completionCriteria', 'sourceUrl', 'timing'] as const;
export type ProgramPublicationSourceField = typeof PROGRAM_PUBLICATION_SOURCE_FIELDS[number];
export type ProgramOrdinaryPublicationSource = {
  key: string; origin: 'creator' | 'native'; ownerId: string; revisionId: string; lineId: string;
  values: Pick<ProgramPublicationDraftRow, Exclude<ProgramPublicationSourceField, 'timing'>> & { timing: ProgramOrdinaryTiming };
};
type Result<T> = { ok: true } & T | { ok: false; reason: 'forbidden' | 'missing' | 'invalid' | 'conflict' };
const link = (url?: string, label?: string) => url ? [{ url, label: label ?? '' }] : [];
const lines = (value?: string) => value ? [value] : [];

/** Visibility hint only; never supplies content or authorizes a write. Full source validation runs on open/apply. */
export function hasProgramOrdinaryPublicationSource(space: ProgramPrivateSpace, documentId: string, lineId: string | null): boolean {
  if (!lineId || space.archivedDocumentIds.includes(documentId) || space.documentTrash?.[documentId]) return false;
  try {
    return Object.values(space.creatorWorkspace?.executionSources ?? {}).some(owner => owner.documentId === documentId
      && creatorAdoptedRows(owner).some(entry => entry.disposition === 'active' && entry.row.kind === 'ordinary' && entry.row.documentLineId === lineId))
      || Object.values(space.creatorWorkspace?.nativeExecutionSources ?? {}).some(owner => owner.documentId === documentId
        && programNativeSelectedRows(owner).some(entry => entry.disposition === 'active' && entry.row.kind === 'ordinary' && entry.row.lineId === lineId));
  } catch { return false; }
}

/** Exact immutable adopted source only. Private row text, dates and progress are never content inputs. */
export function readProgramOrdinaryPublicationSources(space: ProgramPrivateSpace, documentId: string): Result<{ sources: ProgramOrdinaryPublicationSource[] }> {
  try {
    const doc = M.getDocument(space.text, documentId);
    if (!doc || space.archivedDocumentIds.includes(documentId) || space.documentTrash?.[documentId]) return { ok: false, reason: 'missing' };
    const workspace = space.creatorWorkspace, raw = workspace?.executionSources, native = workspace?.nativeExecutionSources;
    if (raw && !validateProgramCreatorExecutionSources(raw, space, workspace!.library.records)
      || native && !validateProgramNativeExecutionSources(native, space, workspace!.library.records)) return { ok: false, reason: 'invalid' };
    const sources: ProgramOrdinaryPublicationSource[] = [];
    for (const owner of Object.values(raw ?? {}).filter(owner => owner.documentId === documentId)) {
      for (const { row, revision } of creatorAdoptedRows(owner).filter(entry => entry.disposition === 'active' && entry.row.kind === 'ordinary')) {
        const item = revision.flow.authoring.parsedItems?.find(item => item.sourceLine === row.sourceLine);
        if (!item || item.recurrence) return { ok: false, reason: 'invalid' };
        sources.push({ key: JSON.stringify(['creator', owner.id, row.rowId]), origin: 'creator', ownerId: owner.id, revisionId: revision.id, lineId: row.documentLineId,
          values: { title: item.title, completionCriteria: item.completionCriteria ?? '', sourceUrl: item.sourceUrl ?? '', timing: { version: 1, time: item.time ?? null, timeZone: item.timeZone ?? null },
            description: programPublicationSourceDescription({ description: item.description ?? '', executionCondition: item.executionCondition ?? '', place: item.place ?? null,
              durationMinutes: item.durationMinutes ?? null, guides: lines(item.guide), cautions: lines(item.caution), additionalDescriptions: [...(item.additionalDescriptions ?? [])],
              resourceLinks: link(item.resourceUrl, item.resourceLabel), sourceLinks: link(item.sourceUrl, item.sourceLabel) }) } });
      }
    }
    for (const owner of Object.values(native ?? {}).filter(owner => owner.documentId === documentId)) {
      for (const entry of programNativeSelectedRows(owner).filter(entry => entry.disposition === 'active' && entry.row.kind === 'ordinary')) {
        if (programNativeSelectionHeld(owner, entry.selection)) return { ok: false, reason: 'conflict' };
        const item = programNativeExecutionDocument(entry.revision.nativeDocument).parseResult.canonical.items.find(item => item.itemId === programNativeSourceItemId(entry.row));
        if (!item?.included || item.role !== 'item') return { ok: false, reason: 'invalid' };
        const facts = programNativeExecutionItemFacts(item);
        sources.push({ key: JSON.stringify(['native', owner.id, entry.row.itemId]), origin: 'native', ownerId: owner.id, revisionId: entry.revision.id, lineId: entry.row.lineId,
          values: { title: item.title, completionCriteria: item.completion?.doneWhen ?? '', sourceUrl: item.sources[0]?.url ?? '', timing: { version: 1, time: facts.time, timeZone: facts.timeZone },
            description: programPublicationSourceDescription({ description: item.detail ?? '', executionCondition: '',
              place: [...item.properties].reverse().find(p => p.key === 'place')?.value ?? null, durationMinutes: item.schedule?.durationMinutes ?? null,
              guides: [...item.guides], cautions: [...item.cautions], resourceLinks: item.resources.map(({ label, url }) => ({ label, url })), sourceLinks: item.sources.map(({ label, url }) => ({ label, url })),
              additionalDescriptions: item.properties.filter(p => !['date', 'relative_date', 'time', 'timezone', 'place', 'duration', 'repeat', 'repeat_end', 'recurrence_end', 'resource', 'source'].includes(p.key)).map(p => `${p.label}: ${p.value}`) }) } });
      }
    }
    const claimed = new Set<string>(), keys = new Set<string>();
    for (const source of sources) {
      if (!doc.lines.some(line => line.id === source.lineId) || claimed.has(source.lineId) || keys.has(source.key)) return { ok: false, reason: 'invalid' };
      claimed.add(source.lineId); keys.add(source.key);
    }
    return { ok: true, sources: programClone(sources) };
  } catch { return { ok: false, reason: 'invalid' }; }
}

export type ProgramPublicationSourceReview = { version: 1; actorId: string; documentId: string; draftId: string; row: ProgramPublicationDraftRow; source: ProgramOrdinaryPublicationSource };
export function inspectProgramPublicationSource(data: ProgramData, actorId: string, draft: ProgramPublicationDraft, itemId: string): Result<{ review: ProgramPublicationSourceReview }> {
  if (data.activeActorId !== actorId || !data.spaces[actorId]) return { ok: false, reason: 'forbidden' };
  const row = draft.rows.find(row => row.itemId === itemId);
  if (!row || row.origin !== 'task' || row.seriesSource) return { ok: false, reason: 'missing' };
  const read = readProgramOrdinaryPublicationSources(data.spaces[actorId], draft.documentId);
  if (!read.ok) return read;
  const sources = read.sources.filter(source => source.lineId === row.rowId);
  if (sources.length !== 1) return { ok: false, reason: sources.length ? 'invalid' : 'missing' };
  return { ok: true, review: programClone({ version: 1, actorId, documentId: draft.documentId, draftId: draft.id, row, source: sources[0] }) };
}

/** Transient comparison contract. No new persisted field, migration or source writer. */
export function applyProgramPublicationSource(data: ProgramData, actorId: string, draft: ProgramPublicationDraft, review: ProgramPublicationSourceReview, fields: readonly ProgramPublicationSourceField[], now: string): Result<{ draft: ProgramPublicationDraft; changed: boolean }> {
  try {
    if (review.version !== 1 || review.actorId !== actorId || review.documentId !== draft.documentId || review.draftId !== draft.id
      || new Set(fields).size !== fields.length || fields.some(field => !PROGRAM_PUBLICATION_SOURCE_FIELDS.includes(field))) return { ok: false, reason: 'invalid' };
    const current = inspectProgramPublicationSource(data, actorId, draft, review.row.itemId);
    if (!current.ok) return current;
    if (!programSame(current.review, review)) return { ok: false, reason: 'conflict' };
    const next = programClone(draft), row = next.rows.find(row => row.itemId === review.row.itemId)!;
    for (const field of fields) {
      if (field === 'timing') {
        const timing = review.source.values.timing;
        if (timing.time || timing.timeZone) row.timing = programOrdinaryTimingDraft(timing); else delete row.timing;
      } else row[field] = review.source.values[field];
    }
    const changed = !programSame(next, draft);
    if (changed) next.updatedAt = now;
    return { ok: true, draft: changed ? next : draft, changed };
  } catch { return { ok: false, reason: 'invalid' }; }
}
