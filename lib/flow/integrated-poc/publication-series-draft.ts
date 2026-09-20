import { programClone, programId, type ProgramData, type ProgramPublicationDraft, type ProgramPublicationDraftRow } from './contract';
import { programSame } from './controller';
import { textWorkspaceModel as M } from './text-workspace';
import { readProgramPublicationSeries, type ProgramPublicationSeriesCandidate } from './publication-series-source';
import { programRecurringDraftFromSchedule, validateProgramPublicRecurringSchedule } from './public-recurrence-contract';
import { programIdentifier } from './program-data';

/** Exact private source snapshot; personal execution and document text are not inputs. */
export const programPublicationSeriesFingerprint = (candidate: ProgramPublicationSeriesCandidate) => JSON.stringify({
  key: candidate.key, revisionId: candidate.revisionId, source: candidate.source,
});
/** Show subchecks from the explicitly reviewed source snapshot, not private completed children. */
export function programPublicationSeriesSubchecks(row: ProgramPublicationDraftRow): { id: string; title: string }[] {
  if (!row.seriesSource) return [];
  try {
    const source = JSON.parse(row.seriesSource.fingerprint).source;
    return Array.isArray(source.subchecks) && source.subchecks.every((child: { id?: unknown; title?: unknown }) => programIdentifier(child.id) && typeof child.title === 'string')
      ? source.subchecks.map((child: { id: string; title: string }) => ({ id: child.id, title: child.title })) : [];
  } catch { return []; }
}
export function programPublicationSourceDescription(source: Pick<ProgramPublicationSeriesCandidate['source'], 'description' | 'executionCondition' | 'place' | 'durationMinutes' | 'guides' | 'cautions' | 'additionalDescriptions' | 'resourceLinks' | 'sourceLinks'>): string {
  return [source.description, source.executionCondition && `실행 조건: ${source.executionCondition}`, source.place && `장소: ${source.place}`,
    source.durationMinutes !== null && `소요 시간: ${source.durationMinutes}분`, ...source.guides.map(text => `안내: ${text}`),
    ...source.cautions.map(text => `주의: ${text}`), ...source.additionalDescriptions,
    ...source.resourceLinks.map(link => `자료: ${link.label ? `${link.label} · ` : ''}${link.url}`),
    ...source.sourceLinks.map(link => `출처: ${link.label ? `${link.label} · ` : ''}${link.url}`)].filter(Boolean).join('\n');
}
export function programPublicationRowFromSeries(candidate: ProgramPublicationSeriesCandidate, itemId: string): ProgramPublicationDraftRow | null {
  const schedule = { kind: 'recurring' as const, version: 1 as const, rule: candidate.source.rule,
    start: candidate.source.start, time: candidate.source.time, timeZone: candidate.source.timeZone };
  if (!validateProgramPublicRecurringSchedule(schedule)) return null;
  return { rowId: candidate.documentLineId, origin: 'series', itemId, selected: false,
    title: candidate.source.title, description: programPublicationSourceDescription(candidate.source), completionCriteria: candidate.source.completionCriteria,
    sourceUrl: candidate.source.sourceLinks[0]?.url ?? '', scheduleKind: 'recurring', scheduleValue: '',
    recurrence: programRecurringDraftFromSchedule(schedule), seriesSource: { version: 1, key: candidate.key, revisionId: candidate.revisionId,
      fingerprint: programPublicationSeriesFingerprint(candidate) },
    // Selection remains explicit, just as for ordinary publication rows.
    subchecks: [] };
}
export type ProgramPublicationSeriesReview = {
  version: 1; actorId: string; documentId: string; expectedDraft: ProgramPublicationDraft;
  sources: ProgramPublicationSeriesCandidate[];
  candidates: { sourceKey: string; row: ProgramPublicationDraftRow; existingItemId: string | null; changed: boolean;
    removableRowIds: string[]; preservedRowIds: string[]; subchecks: { id: string; title: string }[] }[];
};
type ReviewResult = { ok: true; review: ProgramPublicationSeriesReview }
  | { ok: false; reason: 'forbidden' | 'missing' | 'invalid' | 'conflict' | 'source-review-required' };
/** A preview only. It neither replaces an existing draft nor opens any storage port. */
export function inspectProgramPublicationSeries(data: ProgramData, actorId: string, draft: ProgramPublicationDraft): ReviewResult {
  const space = data.spaces[actorId];
  if (data.activeActorId !== actorId || !space) return { ok: false, reason: 'forbidden' };
  const source = readProgramPublicationSeries(space, draft.documentId);
  if (!source.ok) return { ok: false, reason: source.reason === 'source-review-required' ? source.reason
    : source.reason === 'missing-document' || source.reason === 'inactive-document' ? 'missing' : 'invalid' };
  const bindings = space.publications.find(link => link.flowId === draft.flowId && link.documentId === draft.documentId)?.seriesBindings?.items ?? [];
  const meta = M.rowMeta(space.text, draft.documentId);
  const candidates: ProgramPublicationSeriesReview['candidates'] = [];
  for (const candidate of source.candidates) {
    const existing = draft.rows.find(row => row.seriesSource?.key === candidate.key);
    const binding = bindings.find(entry => entry.key === candidate.key);
    const linked = binding && draft.rows.find(row => row.itemId === binding.itemId);
    const prior = existing ?? linked;
    const row = programPublicationRowFromSeries(candidate, prior?.itemId ?? binding?.itemId ?? programId('publication-series'));
    if (!row) return { ok: false, reason: 'invalid' };
    const removableRowIds: string[] = [], preservedRowIds: string[] = [];
    for (const old of draft.rows.filter(entry => entry.rowId && candidate.metadataLineIds.includes(entry.rowId) && entry !== prior)) {
      const original = meta.find(entry => entry.id === old.rowId);
      const untouched = !old.selected && !old.seriesSource && !old.recurrence && old.itemId === `publication-${old.rowId}`
        && (old.origin === 'note' && old.title === '' || old.origin === 'task' && old.title === (original?.title ?? ''))
        && !old.description && !old.completionCriteria && !old.sourceUrl && old.scheduleKind === 'undated' && old.scheduleValue === '' && !old.subchecks.length;
      (untouched ? removableRowIds : preservedRowIds).push(old.itemId);
    }
    candidates.push({ sourceKey: candidate.key, row, existingItemId: prior?.itemId ?? null,
      changed: !existing || existing.seriesSource?.fingerprint !== row.seriesSource!.fingerprint,
      removableRowIds, preservedRowIds,
      subchecks: candidate.source.subchecks.map(child => ({ id: `publication-${child.id}`, title: child.title })) });
  }
  return { ok: true, review: { version: 1, actorId, documentId: draft.documentId, expectedDraft: programClone(draft),
    sources: programClone(source.candidates), candidates } };
}
/** Explicitly group selected sources. User-edited metadata and all unselected sources are preserved. */
export function applyProgramPublicationSeriesReview(data: ProgramData, actorId: string, draft: ProgramPublicationDraft,
  review: ProgramPublicationSeriesReview, keys: string[], now: string): { ok: true; draft: ProgramPublicationDraft; changed: boolean }
    | { ok: false; reason: 'forbidden' | 'missing' | 'invalid' | 'conflict' | 'source-review-required' } {
  if (actorId !== review.actorId || draft.documentId !== review.documentId) return { ok: false, reason: 'forbidden' };
  if (!programSame(draft, review.expectedDraft)) return { ok: false, reason: 'conflict' };
  const fresh = inspectProgramPublicationSeries(data, actorId, draft); if (!fresh.ok) return fresh;
  if (!programSame(fresh.review.sources, review.sources)) return { ok: false, reason: 'conflict' };
  if (new Set(keys).size !== keys.length || keys.some(key => !review.candidates.some(candidate => candidate.sourceKey === key))) return { ok: false, reason: 'invalid' };
  const next = programClone(draft);
  for (const key of keys) {
    const candidate = review.candidates.find(entry => entry.sourceKey === key)!;
    // Recompute source fields; do not trust mutated preview row contents or deletion lists.
    const current = fresh.review.candidates.find(entry => entry.sourceKey === key)!;
    if (!programSame(current.removableRowIds, candidate.removableRowIds) || !programSame(current.preservedRowIds, candidate.preservedRowIds)
      || !programSame(current.row.seriesSource, candidate.row.seriesSource) || current.existingItemId !== candidate.existingItemId
      || candidate.existingItemId !== null && candidate.row.itemId !== candidate.existingItemId) return { ok: false, reason: 'conflict' };
    if (!programIdentifier(candidate.row.itemId)) return { ok: false, reason: 'invalid' };
    const source = fresh.review.sources.find(entry => entry.key === key)!;
    const row = programPublicationRowFromSeries(source, candidate.row.itemId); if (!row) return { ok: false, reason: 'invalid' };
    const own = next.rows.find(entry => entry.itemId === candidate.existingItemId);
    if (own) {
      // Source acknowledgement must not replace a selected/customized public schedule or title.
      own.seriesSource = row.seriesSource; own.rowId = row.rowId; own.origin = 'series';
    } else next.rows.push(row);
    next.rows = next.rows.filter(entry => !current.removableRowIds.includes(entry.itemId));
  }
  if (new Set(next.rows.map(row => row.itemId)).size !== next.rows.length) return { ok: false, reason: 'invalid' };
  const changed = !programSame(next, draft); if (changed) next.updatedAt = now;
  return { ok: true, draft: changed ? next : draft, changed };
}
/** Typed source changes can occur with unchanged private text. Publication requires another explicit review. */
export function programPublicationSeriesSourcesCurrent(data: ProgramData, actorId: string, draft: ProgramPublicationDraft): boolean {
  const bound = draft.rows.filter(row => row.selected && row.seriesSource);
  if (!bound.length) return true;
  const space = data.spaces[actorId]; if (!space || actorId !== data.activeActorId) return false;
  const read = readProgramPublicationSeries(space, draft.documentId); if (!read.ok) return false;
  return bound.every(row => read.candidates.some(candidate => candidate.key === row.seriesSource!.key
    && candidate.revisionId === row.seriesSource!.revisionId && programPublicationSeriesFingerprint(candidate) === row.seriesSource!.fingerprint));
}
