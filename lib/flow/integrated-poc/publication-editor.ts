import { programClone, programFailure, programId, programResult, type ProgramData, type ProgramPublicationDraft, type ProgramPublicationDraftRow, type ProgramPublicItem, type ProgramTransition } from './contract';
import { programDate, validateProgramData } from './program-data';
import { programSame } from './controller';
import type { ProgramEditorFlush } from './document-action';
import { archiveProgramPublicFlow, publishProgramFlow, type PublishProgramFlowInput } from './publication';
import { classifyProgramUrl } from './output';
import { textWorkspaceModel as M } from './text-workspace';
import { programRecurringDraftFromSchedule, programRecurringScheduleFromDraft, programRecurringScheduleLabel } from './public-recurrence-contract';
import { programPublicationSeriesSourcesCurrent, inspectProgramPublicationSeries, applyProgramPublicationSeriesReview } from './publication-series-draft';
import { programOrdinaryTimingDraft, programOrdinaryTimingFromDraft } from './public-ordinary-time';

const same = programSame;
export const publicationDraftAt = (data: ProgramData, actorId: string, documentId: string) => data.spaces[actorId]?.publicationDrafts.find(row => row.documentId === documentId) ?? null;
const draftTextFields = ['title', 'summary', 'category', 'situationsText', 'sourceLabel', 'sourceUrl'] as const;
const rowTextFields = ['title', 'description', 'completionCriteria', 'sourceUrl', 'scheduleValue'] as const;
const recurrenceTextFields = ['raw', 'end', 'startValue', 'time', 'timeZone'] as const;
export type ProgramPublicationNativeValue = { field: string; itemId?: string; value: string };
/** Restore only tagged strings after an explicit comparison choice. */
export function programPublicationNativeValue(draft: ProgramPublicationDraft, field: string, itemId?: string): string | undefined {
  if (!itemId) return draftTextFields.includes(field as typeof draftTextFields[number]) ? draft[field as typeof draftTextFields[number]] : undefined;
  const row = draft.rows.find(item => item.itemId === itemId); if (!row) return undefined;
  if (rowTextFields.includes(field as typeof rowTextFields[number])) return row[field as typeof rowTextFields[number]];
  if (field === 'timing:time' || field === 'timing:timeZone') return row.scheduleKind !== 'recurring' ? row.timing?.[field.slice(7) as 'time' | 'timeZone'] ?? '' : undefined;
  const key = field.startsWith('recurrence:') ? field.slice(11) as typeof recurrenceTextFields[number] : null;
  return key && recurrenceTextFields.includes(key) && row.recurrence ? row.recurrence[key] : undefined;
}
/** Read only tagged editable fields, including native IME text not committed by React yet. */
export function captureProgramPublicationInput(draft: ProgramPublicationDraft, values: ProgramPublicationNativeValue[]): ProgramPublicationDraft {
  const next = programClone(draft);
  for (const entry of values) {
    if (entry.itemId) {
      const row = next.rows.find(item => item.itemId === entry.itemId);
      if (row && rowTextFields.includes(entry.field as typeof rowTextFields[number])) row[entry.field as typeof rowTextFields[number]] = entry.value;
      if (row?.recurrence && entry.field.startsWith('recurrence:')) {
        const key = entry.field.slice('recurrence:'.length) as typeof recurrenceTextFields[number];
        if (recurrenceTextFields.includes(key)) row.recurrence[key] = entry.value;
      }
      if (row && row.scheduleKind !== 'recurring' && ['timing:time', 'timing:timeZone'].includes(entry.field)) {
        const key = entry.field.slice(7) as 'time' | 'timeZone';
        if (row.timing || entry.value) (row.timing ??= programOrdinaryTimingDraft())[key] = entry.value;
      }
    } else if (draftTextFields.includes(entry.field as typeof draftTextFields[number])) next[entry.field as typeof draftTextFields[number]] = entry.value;
  }
  return same(next, draft) ? draft : next;
}
export function programPublicationRecoveryText(draft: ProgramPublicationDraft): string {
  // Do not export the sourceDocumentFingerprint: it contains the private source document.
  return JSON.stringify({ title: draft.title, summary: draft.summary, category: draft.category, situationsText: draft.situationsText,
    sourceKind: draft.sourceKind, sourceLabel: draft.sourceLabel, sourceUrl: draft.sourceUrl, derivedFrom: draft.derivedFrom,
    rows: draft.rows.map(({ selected, title, description, completionCriteria, sourceUrl, scheduleKind, scheduleValue, recurrence, timing, subchecks }) =>
      ({ selected, title, description, completionCriteria, sourceUrl, scheduleKind, scheduleValue, ...(recurrence ? { recurrence } : {}), ...(timing ? { timing } : {}), subchecks })) }, null, 2);
}
export function createProgramPublicationEditorPort(input: {
  actorId: string; documentId: string; read: () => ProgramPublicationDraft | null; saved: () => ProgramPublicationDraft | null;
  composing: () => boolean; busy: () => boolean; save: () => Promise<boolean>; lock: () => () => void;
  handlesPrivateConflict?: boolean;
}): ProgramEditorFlush {
  const pending = () => input.composing() || input.busy() || !same(input.read(), input.saved());
  return {
    lockInput: input.lock,
    hasPendingInput: pending,
    pendingDocumentIds: () => pending() ? [input.documentId] : [],
    captureDrafts: () => { const draft = input.read(); return draft ? [{ title: '공개 초안 입력 · 비공개 보관', raw: programPublicationRecoveryText(draft) }] : []; },
    captureSocialDrafts: () => { const draft = input.read(); return draft ? [{ kind: 'publication', value: programClone(draft) }] : []; },
    flushAll: async () => { try { return !input.composing() && !input.busy() && await input.save() && !pending(); } catch { return false; } },
    blocksExternalSnapshot: (before, next) => pending() && (next.activeActorId !== input.actorId
      || documentFingerprint(next, input.actorId, input.documentId) === null
      || !input.handlesPrivateConflict && !same(publicationDraftAt(before, input.actorId, input.documentId), publicationDraftAt(next, input.actorId, input.documentId))),
  };
}
/** Explicit private-draft choice. Public-version comparison remains a separate action. */
export function resolveProgramPrivatePublicationDraft(data: ProgramData, actorId: string, mine: ProgramPublicationDraft,
  expected: ProgramPublicationDraft | null, choice: 'mine' | 'stored'): ProgramTransition<string> {
  if (data.activeActorId !== actorId || !data.spaces[actorId]) return programFailure(data, 'forbidden');
  if (documentFingerprint(data, actorId, mine.documentId) === null) return programFailure(data, 'missing');
  if (!same(publicationDraftAt(data, actorId, mine.documentId), expected)) return programFailure(data, 'conflict');
  if (choice === 'stored') return { ok: true, data, changed: false, result: mine.documentId };
  // Another tab may have published this document and removed its draft. Never turn
  // an old create request into a second public Flow when keeping local input.
  const linked = data.spaces[actorId].publications.filter(link => link.documentId === mine.documentId);
  if ((linked.some(link => link.flowId !== mine.flowId) && !(canRepublishProgramDocument(data, actorId, mine.documentId) && programPublicationRepublishSource(data, actorId, mine))) || expected && expected.flowId !== mine.flowId) return programFailure(data, 'conflict');
  return saveProgramPublicationDraft(data, actorId, mine, expected);
}
function fingerprint(value: unknown): string {
  const ordered = (part: unknown): unknown => Array.isArray(part) ? part.map(ordered)
    : part && typeof part === 'object' ? Object.fromEntries(Object.entries(part).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, ordered(entry)])) : part;
  return JSON.stringify(ordered(value));
}
export function sameFingerprint(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  try { return same(JSON.parse(a), JSON.parse(b)); } catch { return false; }
}
export const publicId = (rowId: string) => `publication-${rowId}`;
export function documentFingerprint(data: ProgramData, actorId: string, documentId: string): string | null {
  const space = data.spaces[actorId]; const document = space && M.getDocument(space.text, documentId);
  return document && !space.archivedDocumentIds.includes(documentId) ? fingerprint(document) : null;
}
function fromPublic(item: ProgramPublicItem, rowId: string | null, origin: ProgramPublicationDraftRow['origin']): ProgramPublicationDraftRow {
  return { rowId, origin, itemId: item.id, selected: true, title: item.title, description: item.description,
    completionCriteria: item.completionCriteria, sourceUrl: item.sourceUrl ?? '', scheduleKind: item.schedule.kind,
    scheduleValue: item.schedule.kind === 'fixed' ? item.schedule.date : item.schedule.kind === 'relative' ? String(item.schedule.days) : '',
    ...(item.schedule.kind === 'recurring' ? { recurrence: programRecurringDraftFromSchedule(item.schedule) } : {}),
    ...(item.schedule.kind !== 'recurring' && item.schedule.timing ? { timing: programOrdinaryTimingDraft(item.schedule.timing) } : {}),
    subchecks: item.subchecks.map(check => ({ id: check.id, title: check.title })) };
}

export function createProgramPublicationDraft(data: ProgramData, documentId: string, now: string): ProgramPublicationDraft | null {
  const actorId = data.activeActorId; const space = data.spaces[actorId]; const fingerprint = documentFingerprint(data, actorId, documentId);
  if (!space || fingerprint === null) return null;
  const retained = space.publicationDrafts.find(row => row.documentId === documentId);
  if (retained) {
    const flow = data.public.flows.find(flow => flow.id === retained.flowId && flow.ownerId === actorId && flow.archived);
    return flow && canRepublishProgramDocument(data, actorId, documentId)
      ? createProgramRepublishDraft(data, documentId, flow.id, now, retained) : programClone(retained);
  }
  const linkedFlows = space.publications.flatMap(link => data.public.flows.filter(flow => flow.id === link.flowId && link.documentId === documentId && flow.ownerId === actorId));
  const linked = linkedFlows.find(flow => !flow.archived) ?? linkedFlows.at(-1);
  const current = linked && data.public.versions.find(version => version.id === linked.currentVersionId);
  if (linked?.archived) return createProgramRepublishDraft(data, documentId, linked.id, now);
  const rows: ProgramPublicationDraftRow[] = [];
  for (const row of M.rowMeta(space.text, documentId)) {
    if (row.kind !== 'task' && row.kind !== 'note') continue;
    if (row.kind === 'note' && !row.text.trim()) continue;
    const previous = current?.items.find(item => item.id === publicId(row.id));
    if (previous) rows.push(fromPublic(previous, row.id, row.kind));
    else rows.push({ rowId: row.id, origin: row.kind, itemId: publicId(row.id), selected: false,
      title: row.kind === 'task' ? row.title ?? '' : '', description: '', completionCriteria: '', sourceUrl: '',
      scheduleKind: 'undated', scheduleValue: '', subchecks: [] });
  }
  for (const item of current?.items ?? []) if (!rows.some(row => row.itemId === item.id)) rows.push(fromPublic(item, null, 'previous-public'));
  const draft: ProgramPublicationDraft = { id: programId('publication-draft'), documentId, requestId: programId('publication-request'),
    flowId: linked?.id ?? null, expectedVersionId: current?.id ?? null, sourceDocumentFingerprint: fingerprint,
    title: current?.title ?? '', summary: current?.summary ?? '', category: linked?.category ?? '경험과 지식', situationsText: linked?.situations.join(', ') ?? '',
    sourceKind: current?.source.kind === 'simulated-example' ? 'simulated-example' : 'user-text', sourceLabel: current?.source.label ?? '직접 작성한 내용',
    sourceUrl: current?.source.url ?? '', derivedFrom: linked?.derivedFrom ?? null, rows, updatedAt: now };
  const source = inspectProgramPublicationSeries(data, actorId, draft);
  if (!source.ok) return null;
  const grouped = applyProgramPublicationSeriesReview(data, actorId, draft, source.review, source.review.candidates.map(candidate => candidate.sourceKey), now);
  return grouped.ok ? grouped.draft : null;
}

export function saveProgramPublicationDraft(data: ProgramData, actorId: string, draft: ProgramPublicationDraft, expected: ProgramPublicationDraft | null): ProgramTransition<string> {
  if (data.activeActorId !== actorId || !data.spaces[actorId]) return programFailure(data, 'forbidden');
  if (documentFingerprint(data, actorId, draft.documentId) === null) return programFailure(data, 'missing');
  if (data.public.flows.some(flow => flow.id === draft.flowId && flow.archived)
    && !canRepublishProgramDocument(data, actorId, draft.documentId)) return programFailure(data, 'conflict');
  const existing = data.spaces[actorId].publicationDrafts.find(row => row.documentId === draft.documentId) ?? null;
  if (!same(existing, expected)) return programFailure(data, 'conflict');
  if (same(existing, draft)) return { ok: true, data, changed: false, result: draft.id };
  const next = programClone(data); next.spaces[actorId].publicationDrafts = [...next.spaces[actorId].publicationDrafts.filter(row => row.documentId !== draft.documentId), programClone(draft)];
  return validateProgramData(next) ? programResult(data, next, draft.id) : programFailure(data, 'invalid');
}

/** The private draft keeps the old pointer so 763/N2 can still read it on rollback. */
export function canRepublishProgramDocument(data: ProgramData, actorId: string, documentId: string): boolean {
  const space = data.spaces[actorId];
  if (data.activeActorId !== actorId || !space || documentFingerprint(data, actorId, documentId) === null) return false;
  const links = space.publications.filter(link => link.documentId === documentId);
  return links.length > 0 && links.every(link => data.public.flows.some(flow => flow.id === link.flowId && flow.ownerId === actorId && flow.archived));
}
export function programPublicationRepublishSource(data: ProgramData, actorId: string, draft: ProgramPublicationDraft) {
  const flow = data.public.flows.find(row => row.id === draft.flowId && row.ownerId === actorId && row.archived);
  const version = flow && data.public.versions.find(row => row.id === flow.currentVersionId && row.flowId === flow.id);
  if (data.activeActorId !== actorId || !flow || !version || draft.expectedVersionId !== version.id
    || !data.spaces[actorId]?.publications.some(link => link.documentId === draft.documentId && link.flowId === flow.id)
    || !same(draft.derivedFrom, flow.derivedFrom) || draft.sourceKind !== (version.source.kind === 'simulated-example' ? 'simulated-example' : 'user-text')) return null;
  return { flow, version };
}
/** Keep retained input intact; otherwise seed exactly the last public item order. */
export function createProgramRepublishDraft(data: ProgramData, documentId: string, flowId: string, now: string, input?: ProgramPublicationDraft): ProgramPublicationDraft | null {
  const actorId = data.activeActorId, space = data.spaces[actorId];
  if (!canRepublishProgramDocument(data, actorId, documentId)) return null;
  const flow = data.public.flows.find(row => row.id === flowId && row.ownerId === actorId && row.archived);
  const version = flow && data.public.versions.find(row => row.id === flow.currentVersionId && row.flowId === flow.id);
  if (!flow || !version || !space.publications.some(link => link.documentId === documentId && link.flowId === flowId)) return null;
  const retained = input ?? publicationDraftAt(data, actorId, documentId);
  if (retained && (retained.documentId !== documentId || retained.flowId !== flowId)) return null;
  const meta = M.rowMeta(space.text, documentId);
  const draft: ProgramPublicationDraft = retained ? programClone(retained) : {
    id: programId('publication-draft'), documentId, requestId: programId('publication-request'), flowId, expectedVersionId: version.id,
    sourceDocumentFingerprint: documentFingerprint(data, actorId, documentId)!, title: version.title, summary: version.summary,
    category: flow.category, situationsText: flow.situations.join(', '), sourceKind: version.source.kind === 'simulated-example' ? 'simulated-example' : 'user-text',
    sourceLabel: version.source.label, sourceUrl: version.source.url ?? '', derivedFrom: programClone(flow.derivedFrom), updatedAt: now,
    rows: version.items.map(item => { const row = meta.find(row => publicId(row.id) === item.id && (row.kind === 'task' || row.kind === 'note'));
      return fromPublic(item, row?.id ?? null, row?.kind === 'note' ? 'note' : row?.kind === 'task' ? 'task' : 'previous-public'); }),
  };
  // These are original provenance and transaction metadata, never editable input.
  draft.flowId = flowId; draft.expectedVersionId = version.id; draft.derivedFrom = programClone(flow.derivedFrom);
  draft.sourceKind = version.source.kind === 'simulated-example' ? 'simulated-example' : 'user-text';
  if (data.receipts.some(receipt => receipt.actorId === actorId && receipt.id === draft.requestId && receipt.kind === 'publication')) draft.requestId = programId('publication-request');
  return draft;
}
export function programPublicationInput(draft: ProgramPublicationDraft, actorId: string, options: { newFlow?: boolean } = {}): PublishProgramFlowInput | null {
  if (!draft.title.trim() || !draft.category.trim() || !draft.sourceLabel.trim()) return null;
  if (draft.sourceUrl.trim() && classifyProgramUrl(draft.sourceUrl.trim(), []).kind === 'invalid') return null;
  const items: ProgramPublicItem[] = [];
  for (const row of draft.rows.filter(row => row.selected)) {
    if (!['undated', 'fixed', 'relative', 'recurring'].includes(row.scheduleKind)) return null;
    if (!row.title.trim() || row.sourceUrl.trim() && classifyProgramUrl(row.sourceUrl.trim(), []).kind === 'invalid') return null;
    if (row.scheduleKind === 'fixed' && !programDate(row.scheduleValue) || row.scheduleKind === 'relative' && !/^[+-]?\d+$/.test(row.scheduleValue)) return null;
    const days = Number(row.scheduleValue); if (row.scheduleKind === 'relative' && (!Number.isSafeInteger(days) || Math.abs(days) > 36600)) return null;
    const recurring = row.scheduleKind === 'recurring' && row.recurrence ? programRecurringScheduleFromDraft(row.recurrence) : null;
    if (row.scheduleKind === 'recurring' && !recurring) return null;
    const timing = row.scheduleKind !== 'recurring' && row.timing ? programOrdinaryTimingFromDraft(row.timing) : undefined;
    if (timing === null) return null;
    const ordinaryTiming = timing && (timing.time || timing.timeZone) ? { timing } : {};
    items.push({ id: row.itemId, title: row.title.trim(), description: row.description, completionCriteria: row.completionCriteria,
      sourceUrl: row.sourceUrl.trim() || null, schedule: row.scheduleKind === 'fixed' ? { kind: 'fixed', date: row.scheduleValue, ...ordinaryTiming }
        : row.scheduleKind === 'relative' ? { kind: 'relative', days, ...ordinaryTiming } : recurring ?? { kind: 'undated', ...ordinaryTiming },
      subchecks: row.subchecks.map(check => ({ id: check.id, title: check.title })) });
  }
  if (!items.length) return null;
  return { actorId, requestId: draft.requestId, ...(draft.flowId && !options.newFlow ? { flowId: draft.flowId, expectedVersionId: draft.expectedVersionId ?? undefined } : {}),
    title: draft.title.trim(), summary: draft.summary, category: draft.category.trim(), situations: [...new Set(draft.situationsText.split(',').map(value => value.trim()).filter(Boolean))],
    source: { kind: draft.sourceKind, label: draft.sourceLabel.trim(), url: draft.sourceUrl.trim() || null, checkedAt: null },
    derivedFrom: draft.derivedFrom ? { flowId: draft.derivedFrom.flowId, versionId: draft.derivedFrom.versionId } : null, items };
}

/** One transaction publishes only the allowlisted public fields, adds its private
 * document link and removes the submitted private draft. */
export function publishProgramDocument(data: ProgramData, actorId: string, draft: ProgramPublicationDraft, now: string): ProgramTransition<string> {
  if (data.activeActorId !== actorId || !data.spaces[actorId]) return programFailure(data, 'forbidden');
  if (!sameFingerprint(documentFingerprint(data, actorId, draft.documentId), draft.sourceDocumentFingerprint)) return programFailure(data, 'conflict');
  if (!programPublicationSeriesSourcesCurrent(data, actorId, draft)) return programFailure(data, 'conflict');
  const archivedTarget = data.public.flows.some(flow => flow.id === draft.flowId && flow.ownerId === actorId && flow.archived);
  if (archivedTarget && !programPublicationRepublishSource(data, actorId, draft)) return programFailure(data, 'conflict');
  const input = programPublicationInput(draft, actorId, { newFlow: archivedTarget }); if (!input) return programFailure(data, 'invalid');
  const stored = data.spaces[actorId].publicationDrafts.find(row => row.id === draft.id);
  const replay = data.receipts.find(row => row.actorId === actorId && row.id === draft.requestId && row.kind === 'publication');
  if (!replay && !same(stored, draft)) return programFailure(data, 'conflict');
  // Check the latest transaction state, not only the UI or draft preparation.
  // A second tab must not create another active Flow for this document.
  if (!replay && (archivedTarget && !canRepublishProgramDocument(data, actorId, draft.documentId)
    || !draft.flowId && data.spaces[actorId].publications.some(link => link.documentId === draft.documentId))) return programFailure(data, 'conflict');
  const published = publishProgramFlow(data, input, now); if (!published.ok) return published;
  const version = published.data.public.versions.find(row => row.id === published.result); if (!version) return programFailure(data, 'missing');
  const next = programClone(published.data); const space = next.spaces[actorId];
  if (!space.publications.some(link => link.flowId === version.flowId && link.documentId === draft.documentId)) {
    // A no-draft republication keeps the last public fields, not a fabricated
    // acknowledgement of today's source. Carry its private item correspondence
    // only for items actually published under this new link. Never rewrite the
    // withdrawn link, or reseed an existing link during a request replay.
    const source = archivedTarget ? space.publications.find(link => link.flowId === draft.flowId && link.documentId === draft.documentId) : undefined;
    const publishedIds = new Set(version.items.map(item => item.id));
    const inherited = source?.seriesBindings?.items.filter(entry => publishedIds.has(entry.itemId)) ?? [];
    space.publications.push({ flowId: version.flowId, documentId: draft.documentId,
      creatorDraftId: space.creatorDraftImports?.find(entry => entry.documentId === draft.documentId)?.creatorDraftId ?? null,
      ...(inherited.length ? { seriesBindings: { version: 1 as const, items: programClone(inherited) } } : {}) });
  }
  const link = space.publications.find(link => link.flowId === version.flowId && link.documentId === draft.documentId)!;
  const bindings = new Map((link.seriesBindings?.items ?? []).map(entry => [entry.key, entry.itemId]));
  for (const row of draft.rows.filter(row => row.selected && row.seriesSource)) bindings.set(row.seriesSource!.key, row.itemId);
  if (bindings.size) link.seriesBindings = { version: 1, items: [...bindings].map(([key, itemId]) => ({ key, itemId })) };
  space.publicationDrafts = space.publicationDrafts.filter(row => row.id !== draft.id);
  return validateProgramData(next) ? programResult(data, next, version.id) : programFailure(data, 'invalid');
}

type TopField = 'title' | 'summary' | 'category' | 'situationsText' | 'sourceKind' | 'sourceLabel' | 'sourceUrl';
type RowField = 'title' | 'description' | 'completionCriteria' | 'sourceUrl' | 'schedule' | 'subchecks';
export type PublicationConflictField = { key: string; label: string; draftText: string; latestText: string; kind: 'top' | 'row' | 'presence' | 'order'; field?: TopField | RowField; itemId?: string };
export type PublicationComparison = {
  flowId: string; latestVersionId: string; latestNumber: number; draftFingerprint: string; publicFingerprint: string;
  sourceFingerprint: string; latest: ProgramPublicationDraft; fields: PublicationConflictField[];
};
export type PublicationConflictChoices = Record<string, 'draft' | 'latest'>;
const topFields: [TopField, string][] = [['title', '공개 제목'], ['summary', '소개·본문'], ['category', '분야'], ['situationsText', '적용 상황'], ['sourceKind', '출처 유형'], ['sourceLabel', '출처 설명'], ['sourceUrl', '원문 URL']];
const rowFields: [RowField, string][] = [['title', '제목'], ['description', '설명'], ['completionCriteria', '완료 기준'], ['sourceUrl', '항목 출처'], ['schedule', '일정'], ['subchecks', '하위 확인']];
function rowValue(row: ProgramPublicationDraftRow, field: RowField): unknown {
  return field === 'schedule' ? { kind: row.scheduleKind, value: row.scheduleValue, ...(row.scheduleKind === 'recurring' ? { recurrence: row.recurrence } : row.timing ? { timing: row.timing } : {}) } : row[field];
}
function fieldText(value: unknown): string {
  if (value === '' || value === null || value === undefined) return '(없음)';
  if (Array.isArray(value)) return value.map(item => typeof item === 'string' ? item : item.title).join('\n') || '(없음)';
  if (typeof value === 'object' && value && 'kind' in value) {
    const schedule = value as { kind: string; value: string; recurrence?: ProgramPublicationDraftRow['recurrence']; timing?: ProgramPublicationDraftRow['timing'] };
    if (schedule.kind === 'recurring') { const parsed = schedule.recurrence && programRecurringScheduleFromDraft(schedule.recurrence); return parsed ? programRecurringScheduleLabel(parsed) : '반복 입력 확인 필요'; }
    return [schedule.kind === 'undated' ? '날짜 미정' : schedule.kind === 'fixed' ? `고정 날짜 ${schedule.value}` : `기준일 ${schedule.value}일`, schedule.timing?.time, schedule.timing?.timeZone].filter(Boolean).join(' · ');
  }
  return String(value);
}
export function fullRowText(row: ProgramPublicationDraftRow | undefined): string { return row ? rowFields.map(([field, label]) => `${label}: ${fieldText(rowValue(row, field))}`).join('\n') : '현재 초안에서 항목이 없어졌습니다. 다시 확인해 주세요.'; }

export function compareProgramPublication(data: ProgramData, actorId: string, draft: ProgramPublicationDraft): PublicationComparison | null {
  const flow = data.public.flows.find(row => row.id === draft.flowId && row.ownerId === actorId && !row.archived);
  const version = flow && data.public.versions.find(row => row.id === flow.currentVersionId);
  const sourceFingerprint = documentFingerprint(data, actorId, draft.documentId);
  if (data.activeActorId !== actorId || !flow || !version || sourceFingerprint === null) return null;
  const latest: ProgramPublicationDraft = { ...programClone(draft), title: version.title, summary: version.summary, category: flow.category, situationsText: flow.situations.join(', '),
    sourceKind: version.source.kind === 'simulated-example' ? 'simulated-example' : 'user-text', sourceLabel: version.source.label, sourceUrl: version.source.url ?? '',
    rows: version.items.map(item => { const old = draft.rows.find(row => row.itemId === item.id); return { ...fromPublic(item, old?.rowId ?? null, old?.origin ?? 'previous-public'), ...(old?.seriesSource ? { seriesSource: programClone(old.seriesSource) } : {}) }; }) };
  const fields: PublicationConflictField[] = [];
  for (const [field, label] of topFields) if (!same(draft[field], latest[field])) {
    const display = (value: string) => field === 'sourceKind' ? value === 'simulated-example' ? '합성 예시' : '개인 작성' : fieldText(value);
    fields.push({ key: `top:${field}`, kind: 'top', field, label, draftText: display(draft[field]), latestText: display(latest[field]) });
  }
  for (const itemId of new Set([...draft.rows.map(row => row.itemId), ...latest.rows.map(row => row.itemId)])) {
    const own = draft.rows.find(row => row.itemId === itemId), incoming = latest.rows.find(row => row.itemId === itemId);
    if (!own?.selected && !incoming) continue;
    const title = own?.title || incoming?.title || '제목 없는 항목';
    if (!!own?.selected !== !!incoming) fields.push({ key: `presence:${itemId}`, kind: 'presence', itemId, label: `${title} · 포함/제외`,
      draftText: own?.selected ? `공개에 포함\n${fullRowText(own)}` : '공개에서 제외', latestText: incoming ? `공개에 포함\n${fullRowText(incoming)}` : '최신 판본에서 삭제됨' });
    if (own && incoming) for (const [field, label] of rowFields) if (!same(rowValue(own, field), rowValue(incoming, field))) fields.push({ key: `row:${itemId}:${field}`, kind: 'row', itemId, field, label: `${title} · ${label}`, draftText: fieldText(rowValue(own, field)), latestText: fieldText(rowValue(incoming, field)) });
  }
  const ownOrder = draft.rows.filter(row => row.selected).map(row => row.itemId), latestOrder = latest.rows.map(row => row.itemId);
  if (!same(ownOrder, latestOrder)) fields.push({ key: 'order', kind: 'order', label: '항목 순서', draftText: draft.rows.filter(row => row.selected).map(row => row.title).join('\n') || '(없음)', latestText: latest.rows.map(row => row.title).join('\n') || '(없음)' });
  return { flowId: flow.id, latestVersionId: version.id, latestNumber: version.number, draftFingerprint: fingerprint(draft), publicFingerprint: fingerprint({ flow, version }), sourceFingerprint, latest, fields };
}

/** Resolutions update only the actor's persisted draft, never the public version. */
export function resolveProgramPublicationComparison(data: ProgramData, actorId: string, draft: ProgramPublicationDraft, comparison: PublicationComparison, choices: PublicationConflictChoices, now: string): ProgramTransition<string> {
  if (data.activeActorId !== actorId) return programFailure(data, 'forbidden');
  const fresh = compareProgramPublication(data, actorId, draft);
  if (!fresh || !same(fresh, comparison)) return programFailure(data, 'conflict');
  if (comparison.fields.some(field => choices[field.key] !== 'draft' && choices[field.key] !== 'latest') || Object.keys(choices).some(key => !comparison.fields.some(field => field.key === key))) return programFailure(data, 'unresolved');
  const next = programClone(draft);
  for (const field of comparison.fields) {
    if (choices[field.key] !== 'latest') continue;
    if (field.kind === 'top') { const key = field.field as TopField; Object.assign(next, { [key]: comparison.latest[key] }); }
    if (field.kind === 'presence') {
      const incoming = comparison.latest.rows.find(row => row.itemId === field.itemId), own = next.rows.find(row => row.itemId === field.itemId);
      if (own) own.selected = !!incoming; else if (incoming) next.rows.push(programClone(incoming));
    }
    if (field.kind === 'row') {
      const incoming = comparison.latest.rows.find(row => row.itemId === field.itemId), own = next.rows.find(row => row.itemId === field.itemId); if (!incoming || !own) return programFailure(data, 'invalid');
      if (field.field === 'schedule') { own.scheduleKind = incoming.scheduleKind; own.scheduleValue = incoming.scheduleValue;
        if (incoming.recurrence) own.recurrence = programClone(incoming.recurrence); else delete own.recurrence;
        if (incoming.timing) own.timing = programClone(incoming.timing); else delete own.timing; }
      else { const key = field.field as Exclude<RowField, 'schedule'>; Object.assign(own, { [key]: programClone(incoming[key]) }); }
    }
  }
  if (choices.order === 'latest') { const order = comparison.latest.rows.map(row => row.itemId); next.rows.sort((a, b) => { const index = (id: string) => { const found = order.indexOf(id); return found < 0 ? order.length : found; }; return index(a.itemId) - index(b.itemId); }); }
  next.expectedVersionId = comparison.latestVersionId; next.updatedAt = now;
  return saveProgramPublicationDraft(data, actorId, next, draft);
}

export function archiveProgramPublication(data: ProgramData, actorId: string, documentId: string, flowId: string, expectedVersionId: string): ProgramTransition<string> {
  if (data.activeActorId !== actorId || !data.spaces[actorId]?.publications.some(link => link.flowId === flowId && link.documentId === documentId)) return programFailure(data, 'forbidden');
  const flow = data.public.flows.find(row => row.id === flowId); if (!flow) return programFailure(data, 'missing');
  if (flow.ownerId !== actorId) return programFailure(data, 'forbidden');
  if (!flow.archived && flow.currentVersionId !== expectedVersionId) return programFailure(data, 'conflict');
  return archiveProgramPublicFlow(data, actorId, flowId);
}
