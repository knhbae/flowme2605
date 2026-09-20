import type { ProgramPrivateSpace } from './contract';
import { textWorkspaceModel as M } from './text-workspace';
import { creatorAdoptedRows } from './creator-adoption';
import { validateProgramCreatorExecutionSources } from './creator-execution-source';
import { programNativeSelectedRows, programNativeSelectionHeld, validateProgramNativeExecutionSources } from './creator-native-execution-validation';
import { programNativeExecutionDocument, programNativeExecutionItemFacts } from './creator-native-execution-facts';
import { programNativeSourceItemId } from './creator-native-execution-identity';
import { parseAuthoringRecurrenceRule } from './native-creator-vendor/text-authoring/recurrence';
import { programPublicRecurrenceFromAuthoring, type ProgramPublicRecurrenceV1, type ProgramPublicationStart } from './public-recurrence-contract';

/** Private read handle, never an object accepted by a public writer. */
export type ProgramPublicationSeriesCandidate = {
  key: string; origin: 'creator' | 'native'; ownerId: string; rowId: string; revisionId: string;
  documentLineId: string; metadataLineIds: string[];
  source: {
    title: string; description: string; completionCriteria: string; rule: ProgramPublicRecurrenceV1;
    start: ProgramPublicationStart; time: string | null; timeZone: string | null; executionCondition: string;
    place: string | null; durationMinutes: number | null;
    resourceLinks: { label: string; url: string }[]; sourceLinks: { label: string; url: string }[];
    guides: string[]; cautions: string[]; additionalDescriptions: string[];
    subchecks: { id: string; title: string }[];
  };
};
export const programPublicationSeriesKey = (origin: ProgramPublicationSeriesCandidate['origin'], ownerId: string, rowId: string) => JSON.stringify([origin, ownerId, rowId]);
export type ProgramPublicationSeriesRead = { ok: true; candidates: ProgramPublicationSeriesCandidate[]; metadataLineIds: string[] }
  | { ok: false; reason: 'missing-document' | 'inactive-document' | 'invalid-source' | 'source-review-required' | 'ambiguous-source' };
const sourceStart = (fixed?: string, relative?: string): ProgramPublicationStart | null => {
  if (relative) {
    const match = /^D([+-]\d+)$/i.exec(relative.trim());
    if (!match || !Number.isSafeInteger(Number(match[1]))) return null;
    return { kind: 'relative', days: Number(match[1]) };
  }
  return fixed ? { kind: 'fixed', date: fixed } : { kind: 'undated' };
};
const lines = (value?: string) => value ? [value] : [];
const link = (url?: string, label?: string) => url ? [{ url, label: label ?? '' }] : [];

/** Read genuine selected source revisions, not private text/progress or expanded occurrences.
 * Complete owner validation precedes all reads. Retained/ignored rows are not current public candidates.
 * The returned exact metadata IDs let the UI suppress only source projection duplicates. */
export function readProgramPublicationSeries(space: ProgramPrivateSpace, documentId: string): ProgramPublicationSeriesRead {
  try {
    const document = M.getDocument(space.text, documentId);
    if (!document) return { ok: false, reason: 'missing-document' };
    if (space.archivedDocumentIds.includes(documentId)) return { ok: false, reason: 'inactive-document' };
    const workspace = space.creatorWorkspace, sources = workspace?.executionSources, native = workspace?.nativeExecutionSources;
    if (sources && !validateProgramCreatorExecutionSources(sources, space, workspace!.library.records)
      || native && !validateProgramNativeExecutionSources(native, space, workspace!.library.records)) return { ok: false, reason: 'invalid-source' };
    const candidates: ProgramPublicationSeriesCandidate[] = [], documentIds = new Set(document.lines.map(line => line.id));
    for (const owner of Object.values(sources ?? {}).filter(owner => owner.documentId === documentId)) {
      for (const { row, revision } of creatorAdoptedRows(owner).filter(entry => entry.disposition === 'active' && entry.row.kind === 'series')) {
        const parsed = revision.flow.authoring.parsedItems?.find(item => item.sourceLine === row.sourceLine);
        if (!parsed?.recurrence) return { ok: false, reason: 'invalid-source' };
        const read = parseAuthoringRecurrenceRule({ raw: parsed.recurrence, repeatEnd: parsed.recurrenceEnd });
        const rule = read.ok && programPublicRecurrenceFromAuthoring(read.rule), start = sourceStart(parsed.date, parsed.relativeDate);
        if (!rule || !start) return { ok: false, reason: 'invalid-source' };
        const begin = revision.protectedLineIds.indexOf(row.documentLineId);
        const next = revision.rows.filter(item => item.kind === 'series' && item.sourceLine > row.sourceLine).sort((a, b) => a.sourceLine - b.sourceLine)[0];
        const end = next ? revision.protectedLineIds.indexOf(next.documentLineId) : undefined;
        if (begin < 0 || end !== undefined && end <= begin) return { ok: false, reason: 'invalid-source' };
        candidates.push({ key: programPublicationSeriesKey('creator', owner.id, row.rowId), origin: 'creator', ownerId: owner.id, rowId: row.rowId, revisionId: revision.id,
          documentLineId: row.documentLineId, metadataLineIds: revision.protectedLineIds.slice(begin, end),
          source: { title: parsed.title, description: parsed.description ?? '', completionCriteria: parsed.completionCriteria ?? '', rule, start,
            time: parsed.time ?? null, timeZone: parsed.timeZone ?? null, executionCondition: parsed.executionCondition ?? '',
            place: parsed.place ?? null, durationMinutes: parsed.durationMinutes ?? null,
            resourceLinks: link(parsed.resourceUrl, parsed.resourceLabel), sourceLinks: link(parsed.sourceUrl, parsed.sourceLabel),
            guides: lines(parsed.guide), cautions: lines(parsed.caution), additionalDescriptions: [...(parsed.additionalDescriptions ?? [])],
            subchecks: (parsed.subchecks ?? []).map(child => ({ id: child.subcheckId, title: child.title })) } });
      }
    }
    for (const owner of Object.values(native ?? {}).filter(owner => owner.documentId === documentId)) {
      for (const entry of programNativeSelectedRows(owner).filter(entry => entry.disposition === 'active' && entry.row.kind === 'series')) {
        if (programNativeSelectionHeld(owner, entry.selection)) return { ok: false, reason: 'source-review-required' };
        // Deliberately no entry.revision.anchor: that is the personal execution start choice.
        const sourceDocument = programNativeExecutionDocument(entry.revision.nativeDocument);
        const item = sourceDocument.parseResult.canonical.items.find(item => item.itemId === programNativeSourceItemId(entry.row));
        if (!item?.included) return { ok: false, reason: 'invalid-source' };
        const facts = programNativeExecutionItemFacts(item), rule = facts.rule && programPublicRecurrenceFromAuthoring(facts.rule);
        if (!rule) return { ok: false, reason: 'invalid-source' };
        const start: ProgramPublicationStart = item.schedule?.kind === 'absolute' ? { kind: 'fixed', date: item.schedule.date }
          : item.schedule?.kind === 'relative' ? { kind: 'relative', days: item.schedule.dayOffset } : { kind: 'undated' };
        candidates.push({ key: programPublicationSeriesKey('native', owner.id, entry.row.itemId), origin: 'native', ownerId: owner.id, rowId: entry.row.itemId,
          revisionId: entry.revision.id, documentLineId: entry.row.lineId, metadataLineIds: entry.row.lines.map(line => line.id),
          source: { title: item.title, description: item.detail ?? '', completionCriteria: item.completion?.doneWhen ?? '', rule, start,
            time: facts.time, timeZone: facts.timeZone, executionCondition: facts.rule?.executionCondition ?? '',
            place: [...item.properties].reverse().find(property => property.key === 'place')?.value ?? null, durationMinutes: item.schedule?.durationMinutes ?? null,
            resourceLinks: item.resources.map(({ label, url }) => ({ label, url })), sourceLinks: item.sources.map(({ label, url }) => ({ label, url })),
            guides: [...item.guides], cautions: [...item.cautions],
            additionalDescriptions: item.properties.filter(p => !['date', 'relative_date', 'time', 'timezone', 'place', 'duration', 'repeat', 'repeat_end', 'recurrence_end', 'condition', 'execution_condition', 'resource', 'source'].includes(p.key)).map(p => `${p.label}: ${p.value}`),
            subchecks: (item.subchecks ?? []).map(child => ({ id: child.subcheckId, title: child.title })) } });
      }
    }
    const keys = new Set<string>(), claimed = new Set<string>();
    for (const candidate of candidates) {
      if (keys.has(candidate.key) || !candidate.metadataLineIds.includes(candidate.documentLineId)) return { ok: false, reason: 'ambiguous-source' };
      keys.add(candidate.key);
      for (const id of candidate.metadataLineIds) {
        if (!documentIds.has(id)) return { ok: false, reason: 'invalid-source' };
        if (claimed.has(id)) return { ok: false, reason: 'ambiguous-source' };
        claimed.add(id);
      }
    }
    // Detached values only: changing a candidate cannot mutate source revisions or private state.
    return { ok: true, candidates, metadataLineIds: document.lines.filter(line => claimed.has(line.id)).map(line => line.id) };
  } catch { return { ok: false, reason: 'invalid-source' }; }
}
