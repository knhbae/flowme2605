import type { ProgramCopy, ProgramCopyField, ProgramPrivateSpace, ProgramPublicItem, ProgramPublicRepository } from './contract';
import { PROGRAM_COPY_SCHEDULE_RETENTION } from './contract';
import type { ProgramOccurrenceIdentity } from './recurrence-state-contract';
import type { ProgramRecurrenceInspection, ProgramRecurrenceRow, ProgramRecurrenceWindow } from './recurrence-bridge';
import { isValidAuthoringDate } from './native-creator-vendor/text-authoring/recurrence';
import { stableAuthoringJson } from './native-creator-vendor/text-authoring/identity';
import { textWorkspaceModel as M } from './text-workspace';
import { validateProgramCopyKindHandoffs } from './public-copy-kind-contract';
import { programCopyEffectiveChecks, validateProgramCopyCheckResolutions } from './public-copy-check-contract';
import { programPublicRecurrenceToAuthoring, programRecurringScheduleStart, projectProgramPublicRecurrence,
  validateProgramPublicRecurringSchedule, type ProgramPublicRecurringScheduleV1 } from './public-recurrence-contract';

/** A public copy is neither a creator workspace nor a legacy saved-plan origin. */
export type ProgramPublicCopyOccurrenceOwner = {
  kind: 'public-copy'; version: 1; copyId: string; flowId: string; itemId: string;
  scheduleVersionId: string; schedule: ProgramPublicRecurringScheduleV1;
};
export type ProgramPublicCopyRecurrenceItem = {
  item: ProgramPublicItem & { schedule: ProgramPublicRecurringScheduleV1 };
  scheduleVersionId: string; lineId: string; documentId: string; included: boolean; startDate: string | null;
};
export type ProgramPublicCopyRecurrenceSource = {
  copyId: string; flowId: string; flowRef: string; documentId: string;
  anchor: string | null; inactive: boolean; sourceRevisionToken: string;
  items: ProgramPublicCopyRecurrenceItem[];
};
const fields: ProgramCopyField[] = ['title', 'description', 'completionCriteria', 'sourceUrl', 'schedule', 'subchecks'];
const id = (v: unknown): v is string => typeof v === 'string' && !!v.trim() && v.length <= 1200 && !['__proto__', 'constructor', 'prototype'].includes(v);
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
  && [Object.prototype, null].includes(Object.getPrototypeOf(v)) && !Object.getOwnPropertySymbols(v).length
  && Object.entries(Object.getOwnPropertyDescriptors(v)).every(([key, d]) => !['__proto__', 'constructor', 'prototype'].includes(key) && d.enumerable && 'value' in d);
const exact = (v: Record<string, unknown>, names: string[]) => Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
const date = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v) && isValidAuthoringDate(v);
const uniqueIds = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 2000 && v.every(id) && new Set(v).size === v.length;
const fail = (reason: string) => ({ ok: false as const, reason });
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
/** History remains readable after an explicit plan Undo removes that owner. Existing
 * owners must still belong to this exact copy/item, never another private source. */
function validRetainedChoices(value: unknown, copy: ProgramCopy, space: ProgramPrivateSpace, repository: ProgramPublicRepository): boolean {
  if (!record(value) || !exact(value, ['version', 'entries']) || value.version !== PROGRAM_COPY_SCHEDULE_RETENTION.version
    || !Array.isArray(value.entries) || !value.entries.length || value.entries.length > PROGRAM_COPY_SCHEDULE_RETENTION.entries) return false;
  return value.entries.every(entry => {
    if (!record(entry) || !exact(entry, ['id', 'itemId', 'fromVersionId', 'toVersionId', 'previousStart', 'personalPlanOwnerIds', 'at'])
      || ![entry.id, entry.fromVersionId, entry.toVersionId].every(id) || !id(entry.itemId) || !Object.hasOwn(copy.itemLines, entry.itemId)
      || entry.fromVersionId === entry.toVersionId || !record(entry.previousStart) || !exact(entry.previousStart, ['present', 'date'])
      || typeof entry.previousStart.present !== 'boolean' || entry.previousStart.date !== null && !date(entry.previousStart.date)
      || !entry.previousStart.present && entry.previousStart.date !== null || !uniqueIds(entry.personalPlanOwnerIds)
      || typeof entry.at !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(entry.at)
      || !Number.isFinite(Date.parse(entry.at)) || new Date(entry.at).toISOString() !== entry.at) return false;
    const schedules = [entry.fromVersionId, entry.toVersionId].map(versionId => {
      const versions = repository.versions.filter(version => version.id === versionId && version.flowId === copy.flowId);
      const items = versions.length === 1 ? versions[0].items.filter(item => item.id === entry.itemId) : [];
      return items.length === 1 ? items[0].schedule : null;
    });
    return schedules.every(validateProgramPublicRecurringSchedule)
      && (!entry.previousStart.present || schedules[0]?.kind === 'recurring' && schedules[0].start.kind === 'undated')
      && entry.personalPlanOwnerIds.every(ownerId => {
        const owner = space.recurrencePlans?.owners[ownerId];
        return !owner || owner.source.publicOwner?.copyId === copy.id && owner.source.publicOwner.flowId === copy.flowId && owner.source.itemId === entry.itemId;
      });
  }) && new Set(value.entries.map(entry => entry.id)).size === value.entries.length;
}
export function programPublicCopyItemStart(copy: ProgramCopy, item: ProgramPublicItem): string | null {
  if (item.schedule.kind !== 'recurring') return null;
  if (item.schedule.start.kind === 'undated') return copy.recurrence?.starts?.[item.id] ?? null;
  return programRecurringScheduleStart(item.schedule, copy.anchor);
}
export function programPublicCopyMetadataLineIds(space: ProgramPrivateSpace, copy: ProgramCopy): Set<string> {
  const lines = [...space.text.documents, ...space.text.flows].flatMap(doc => doc.lines);
  const retained = Object.values(copy.kindHandoffs?.items ?? {}).flatMap(pair => [pair.recurring.lineId,
    ...lines.filter(line => line.id.startsWith(`${pair.recurring.lineId}:`)).map(line => line.id), ...Object.values(pair.recurring.subcheckLines)]);
  return new Set([...retained, ...(copy.recurrence?.references ?? []).map(ref => ref.lineId), ...(copy.recurrence?.itemIds ?? []).flatMap(itemId => {
    const header = copy.itemLines[itemId];
    return [header, ...lines.filter(line => line.id.startsWith(`${header}:`)).map(line => line.id), ...Object.values(copy.subcheckLines[itemId] ?? {})];
  })].filter((id): id is string => typeof id === 'string'));
}
function validWindow(value: unknown): value is ProgramRecurrenceWindow {
  return record(value) && Object.keys(value).every(k => ['finiteOffset', 'finiteLimit', 'windowOffsetWeeks', 'windowWeeks'].includes(k))
    && [['finiteOffset', 0, 10000], ['finiteLimit', 1, 200], ['windowOffsetWeeks', 0, 512], ['windowWeeks', 1, 8]].every(([key, min, max]) => {
      const n = value[key as string]; return n === undefined || typeof n === 'number' && Number.isSafeInteger(n) && n >= Number(min) && n <= Number(max);
    });
}
function tokenMatches(token: string, owner: ProgramPublicCopyOccurrenceOwner): boolean {
  const v: unknown = JSON.parse(token);
  if (!record(v) || !exact(v, ['kind', 'copyId', 'flowId', 'schedules']) || v.kind !== 'public-copy-source/1'
    || v.copyId !== owner.copyId || v.flowId !== owner.flowId || !Array.isArray(v.schedules) || v.schedules.length > 2000
    || !v.schedules.every(s => record(s) && exact(s, ['itemId', 'versionId', 'schedule']) && id(s.itemId) && id(s.versionId) && validateProgramPublicRecurringSchedule(s.schedule))
    || new Set(v.schedules.map(s => s.itemId)).size !== v.schedules.length) return false;
  const pinned = v.schedules.find(s => s.itemId === owner.itemId);
  return !!pinned && pinned.versionId === owner.scheduleVersionId && stableAuthoringJson(pinned.schedule) === stableAuthoringJson(owner.schedule);
}

// JSON tuples preserve delimiter-containing identifiers without hashing away ownership.
export const programPublicCopyExecutionRef = (copyId: string): string => JSON.stringify(['public-copy/1', copyId]);
export const programPublicCopyItemRef = (copyId: string, flowId: string, itemId: string): string => JSON.stringify(['public-copy-item/1', copyId, flowId, itemId]);
export const programPublicCopySeriesKey = (owner: Pick<ProgramPublicCopyOccurrenceOwner, 'copyId' | 'flowId' | 'itemId' | 'schedule'>, startDate: string): string =>
  JSON.stringify(['public-copy-series/1', owner.copyId, owner.flowId, owner.itemId, startDate, stableAuthoringJson(owner.schedule.rule)]);
export const programPublicCopyOccurrenceKey = (identity: ProgramOccurrenceIdentity): string => {
  const owner = identity.publicOwner!;
  return JSON.stringify(['public-copy-occurrence/1', owner.copyId, owner.flowId, owner.itemId,
    identity.sourceRule.startDate, stableAuthoringJson(owner.schedule.rule), identity.occurrenceIndex, identity.originalDate]);
};

function publicItem(value: unknown): value is ProgramPublicItem {
  if (!record(value) || !exact(value, ['id', 'title', 'description', 'completionCriteria', 'sourceUrl', 'schedule', 'subchecks'])
    || !id(value.id) || typeof value.title !== 'string' || !value.title.trim() || value.title.length > 500
    || typeof value.description !== 'string' || value.description.length > 30000 || typeof value.completionCriteria !== 'string' || value.completionCriteria.length > 30000) return false;
  if (value.sourceUrl !== null) {
    if (typeof value.sourceUrl !== 'string' || value.sourceUrl.length > 3000) return false;
    const url = new URL(value.sourceUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || /(^|[?&])(token|access_token|api[_-]?key|password|secret|authorization)=/i.test(url.search)) return false;
  }
  if (!Array.isArray(value.subchecks) || value.subchecks.length > 500 || !value.subchecks.every(c => record(c) && exact(c, ['id', 'title']) && id(c.id)
    && typeof c.title === 'string' && !!c.title.trim() && c.title.length <= 500) || new Set(value.subchecks.map(c => c.id)).size !== value.subchecks.length) return false;
  const s = value.schedule;
  return validateProgramPublicRecurringSchedule(s) || record(s) && (exact(s, ['kind']) && s.kind === 'undated'
    || exact(s, ['kind', 'date']) && s.kind === 'fixed' && date(s.date)
    || exact(s, ['kind', 'days']) && s.kind === 'relative' && Number.isSafeInteger(s.days) && Math.abs(Number(s.days)) <= 36600);
}

/** Display the immutable schedule source, not a current title or a private start.
 * Current and retained sources use the same exact owner/token/version checks. */
export function readProgramPublicCopySourceFacts(owner: ProgramPublicCopyOccurrenceOwner, token: string, repository: ProgramPublicRepository): unknown {
  try {
    if (!record(owner) || !exact(owner, ['kind', 'version', 'copyId', 'flowId', 'itemId', 'scheduleVersionId', 'schedule'])
      || owner.kind !== 'public-copy' || owner.version !== 1 || ![owner.copyId, owner.flowId, owner.itemId, owner.scheduleVersionId].every(id)
      || !validateProgramPublicRecurringSchedule(owner.schedule) || typeof token !== 'string' || token.length > 1000000 || !tokenMatches(token, owner)
      || !record(repository) || !Array.isArray(repository.versions) || !Array.isArray(repository.flows)
      || !repository.versions.every(record) || !repository.flows.every(record)
      || repository.flows.filter(flow => flow.id === owner.flowId).length !== 1) return { unavailable: true };
    const versions = repository.versions.filter(version => version.id === owner.scheduleVersionId);
    if (versions.length !== 1) return { unavailable: true };
    const version = versions[0];
    if (version.flowId !== owner.flowId || typeof version.title !== 'string' || !version.title.trim()
      || !Number.isSafeInteger(version.number) || version.number < 1 || !Array.isArray(version.items) || !version.items.every(publicItem)) return { unavailable: true };
    const items = version.items.filter(item => item.id === owner.itemId);
    if (items.length !== 1 || stableAuthoringJson(items[0].schedule) !== stableAuthoringJson(owner.schedule)) return { unavailable: true };
    const schedule = owner.schedule, rule = programPublicRecurrenceToAuthoring(schedule.rule)!;
    return { flowTitle: version.title, item: clone(items[0]), publicVersion: { id: version.id, number: version.number },
      context: { attributes: { date: schedule.start.kind === 'fixed' ? schedule.start.date
        : schedule.start.kind === 'relative' ? `기준일 ${schedule.start.days >= 0 ? '+' : ''}${schedule.start.days}일` : '시작 미정',
        time: schedule.time, timeZone: schedule.timeZone, recurrence: rule.raw, recurrenceEnd: rule.end?.raw ?? null } } };
  } catch { return { unavailable: true }; }
}

/** Reads per-field accepted immutable versions, never repository.currentVersionId.
 * The caller validates the entire envelope at its storage boundary. No writer is added. */
export function readProgramPublicCopyRecurrenceSource(space: ProgramPrivateSpace, repository: ProgramPublicRepository, copyId: string):
  { ok: true; source: ProgramPublicCopyRecurrenceSource } | { ok: false; reason: string } {
  try {
    if (!id(copyId) || !record(space) || !Array.isArray(space.copies) || !record(repository) || !Array.isArray(repository.versions) || !Array.isArray(repository.flows)) return fail('invalid-public-copy');
    if (!space.copies.every(record) || !repository.versions.every(record) || !repository.flows.every(record)) return fail('invalid-public-copy');
    const copies = space.copies.filter(c => c.id === copyId);
    if (copies.length !== 1) return fail(copies.length ? 'ambiguous-public-copy' : 'missing-public-copy');
    const copy = copies[0];
    const required = ['id', 'flowId', 'baseVersionId', 'documentId', 'itemLines', 'subcheckLines', 'inheritedDates', 'includedItemIds', 'anchor', 'itemOverrides', 'appliedFields'];
    if (!exact(copy, [...required, ...(Object.hasOwn(copy, 'recurrence') ? ['recurrence'] : []), ...(Object.hasOwn(copy, 'kindHandoffs') ? ['kindHandoffs'] : []), ...(Object.hasOwn(copy, 'checkResolutions') ? ['checkResolutions'] : [])])
      || ![copy.id, copy.flowId, copy.baseVersionId, copy.documentId].every(id) || !record(copy.itemLines)
      || Object.keys(copy.itemLines).length > 2000 || !Object.entries(copy.itemLines).every(([itemId, lineId]) => id(itemId) && id(lineId))
      || new Set(Object.values(copy.itemLines)).size !== Object.keys(copy.itemLines).length
      || !uniqueIds(copy.includedItemIds) || copy.includedItemIds.some(itemId => !Object.hasOwn(copy.itemLines, itemId))
      || copy.anchor !== null && !date(copy.anchor) || !record(copy.appliedFields) || !record(copy.itemOverrides)) return fail('invalid-public-copy');
    if (Object.entries(copy.appliedFields).some(([itemId, applied]) => !Object.hasOwn(copy.itemLines, itemId) || !record(applied)
      || Object.entries(applied).some(([field, versionId]) => !fields.includes(field as ProgramCopyField) || !id(versionId)))) return fail('invalid-public-copy');
    if (Object.entries(copy.itemOverrides).some(([itemId, patch]) => !Object.hasOwn(copy.itemLines, itemId) || !record(patch)
      || Object.entries(patch).some(([field, v]) => field === 'title' ? typeof v !== 'string' || !v.trim() || v.length > 500
        : field === 'date' ? v !== null && !date(v) : field !== 'included' || typeof v !== 'boolean'))) return fail('invalid-public-copy');
    const flows = repository.flows.filter(f => f.id === copy.flowId);
    const base = repository.versions.filter(v => v.id === copy.baseVersionId && v.flowId === copy.flowId);
    if (flows.length !== 1 || base.length !== 1) return fail('missing-public-version');
    const docs = [...space.text.documents, ...space.text.flows];
    if (docs.filter(d => d.id === copy.documentId).length !== 1) return fail('missing-public-copy-document');
    if (!validateProgramCopyKindHandoffs(copy as ProgramCopy, space, repository)) return fail('invalid-public-kind-handoff');
    if (!validateProgramCopyCheckResolutions(copy as ProgramCopy, space, repository)) return fail('invalid-public-check-resolution');
    const items: ProgramPublicCopyRecurrenceItem[] = [];
    for (const [itemId, lineId] of Object.entries(copy.itemLines)) {
      const accepted = {} as ProgramPublicItem; accepted.id = itemId;
      for (const field of fields) {
        const versionId = copy.appliedFields[itemId]?.[field] ?? copy.baseVersionId;
        const versions = repository.versions.filter(v => v.id === versionId);
        if (versions.length !== 1 || versions[0].flowId !== copy.flowId || !Array.isArray(versions[0].items) || !versions[0].items.every(publicItem)) return fail('invalid-public-version');
        const sourceItems = versions[0].items.filter(i => i.id === itemId);
        if (sourceItems.length !== 1) return fail('missing-public-item');
        Object.assign(accepted, { [field]: clone(sourceItems[0][field]) });
      }
      if (accepted.schedule.kind !== 'recurring') continue;
      accepted.subchecks = programCopyEffectiveChecks(copy as ProgramCopy, space, accepted);
      if (Object.hasOwn(copy.itemOverrides[itemId] ?? {}, 'date')) return fail('public-recurrence-personal-plan-required');
      const positions = docs.flatMap(doc => doc.lines.filter(l => l.id === lineId).map(() => doc.id));
      if (positions.length !== 1 || space.copies.filter(c => record(c.itemLines) && Object.values(c.itemLines).includes(lineId)).length !== 1) return fail('ambiguous-public-copy-line');
      items.push({ item: accepted as ProgramPublicCopyRecurrenceItem['item'], scheduleVersionId: copy.appliedFields[itemId]?.schedule ?? copy.baseVersionId,
        lineId, documentId: positions[0], included: copy.includedItemIds.includes(itemId) && copy.itemOverrides[itemId]?.included !== false,
        startDate: programPublicCopyItemStart(copy as ProgramCopy, accepted) });
    }
    // No read-time index repair or duplicate rule snapshot in the private copy.
    const expected = items.map(i => i.item.id).sort();
    if (expected.length || copy.recurrence !== undefined) {
      if (!record(copy.recurrence) || !exact(copy.recurrence, ['version', 'itemIds', ...(Object.hasOwn(copy.recurrence, 'starts') ? ['starts'] : []), ...(Object.hasOwn(copy.recurrence, 'references') ? ['references'] : []), ...(Object.hasOwn(copy.recurrence, 'retainedChoices') ? ['retainedChoices'] : [])]) || copy.recurrence.version !== 1 || !uniqueIds(copy.recurrence.itemIds)
        || stableAuthoringJson([...copy.recurrence.itemIds].sort()) !== stableAuthoringJson(expected)) return fail('invalid-public-recurrence-index');
      if (Object.hasOwn(copy.recurrence, 'retainedChoices') && !validRetainedChoices(copy.recurrence.retainedChoices, copy as ProgramCopy, space, repository)) return fail('invalid-public-recurrence-retention');
      if (copy.recurrence.starts !== undefined && (!record(copy.recurrence.starts) || Object.entries(copy.recurrence.starts).some(([itemId, start]) =>
        !items.some(entry => entry.item.id === itemId && entry.item.schedule.start.kind === 'undated') || start !== null && !date(start)))) return fail('invalid-public-recurrence-start');
      const references = copy.recurrence.references ?? [];
      if (!Array.isArray(references) || references.length > 2000 || !references.every(ref => record(ref) && exact(ref, ['itemId', 'documentId', 'lineId'])
        && [ref.itemId, ref.documentId, ref.lineId].every(id) && (expected.includes(ref.itemId) || !!copy.kindHandoffs?.items[ref.itemId])
        && !Object.values(copy.itemLines).includes(ref.lineId) && (() => {
          const positions = docs.flatMap(doc => doc.lines.filter(line => line.id === ref.lineId).map(() => doc.id));
          return positions.length === 1 && positions[0] === ref.documentId;
        })()
        && space.copies.filter(other => other.recurrence?.references?.some(entry => entry.lineId === ref.lineId)).length === 1
        && !space.text.bindings.some(binding => binding.lineId === ref.lineId))
        || new Set(references.map(ref => JSON.stringify([ref.itemId, ref.documentId]))).size !== references.length
        || new Set(references.map(ref => ref.lineId)).size !== references.length) return fail('invalid-public-recurrence-reference');
      const metadataIds = programPublicCopyMetadataLineIds(space, copy as ProgramCopy);
      if (docs.some(doc => doc.lines.some(line => metadataIds.has(line.id)) && M.parseDocument(doc, space.text).items.some(item => metadataIds.has(item.id)))
        || space.text.bindings.some(binding => metadataIds.has(binding.lineId) || binding.kind === 'task' && metadataIds.has(binding.taskId))
        || space.text.progressRecords.some(entry => metadataIds.has(entry.taskId))) return fail('public-recurrence-metadata-is-not-task');
    }
    const token = stableAuthoringJson({ kind: 'public-copy-source/1', copyId, flowId: copy.flowId,
      schedules: items.map(i => ({ itemId: i.item.id, versionId: i.scheduleVersionId, schedule: i.item.schedule })).sort((a, b) => a.itemId.localeCompare(b.itemId)) });
    if (token.length > 1000000) return fail('source-limit');
    return { ok: true, source: { copyId, flowId: copy.flowId, flowRef: programPublicCopyExecutionRef(copyId), documentId: copy.documentId,
      anchor: copy.anchor, inactive: space.archivedDocumentIds.includes(copy.documentId) || !!space.documentTrash?.[copy.documentId], sourceRevisionToken: token, items } };
  } catch { return fail('invalid-public-copy'); }
}

export function inspectProgramPublicCopyRecurrence(source: ProgramPublicCopyRecurrenceSource, window: ProgramRecurrenceWindow = {}): ProgramRecurrenceInspection {
  if (!validWindow(window)) return fail('invalid-window');
  const rows: ProgramRecurrenceRow[] = [], series: Extract<ProgramRecurrenceInspection, { ok: true }>['series'] = [];
  const pendingStarts: NonNullable<Extract<ProgramRecurrenceInspection, { ok: true }>['pendingStarts']> = [];
  for (const entry of source.items) {
    const schedule = entry.item.schedule, start = entry.startDate, rule = programPublicRecurrenceToAuthoring(schedule.rule);
    if (!rule) return fail('invalid-public-recurrence-rule');
    if (!start) {
      if (entry.included && !source.inactive) pendingStarts.push({ itemId: entry.item.id, itemRef: programPublicCopyItemRef(source.copyId, source.flowId, entry.item.id),
        title: entry.item.title, documentId: entry.documentId, lineId: entry.lineId,
        reason: schedule.start.kind === 'relative' ? 'anchor-required' : 'start-required' });
      continue;
    }
    const projected = projectProgramPublicRecurrence({ itemId: entry.item.id, startDate: start, rule: schedule.rule,
      offset: window.finiteOffset, limit: window.finiteLimit, openEndedOffsetWeeks: window.windowOffsetWeeks, openEndedWeeks: window.windowWeeks });
    if (!projected.ok) return projected;
    const publicOwner: ProgramPublicCopyOccurrenceOwner = { kind: 'public-copy', version: 1, copyId: source.copyId, flowId: source.flowId,
      itemId: entry.item.id, scheduleVersionId: entry.scheduleVersionId, schedule: clone(schedule) };
    const ref = programPublicCopyItemRef(source.copyId, source.flowId, entry.item.id), seriesId = programPublicCopySeriesKey(publicOwner, start);
    const occurrences = projected.projection.occurrences.map(o => ({ rowId: o.occurrenceId, occurrenceId: o.occurrenceId, seriesId, sourceItemRef: ref, originalDate: o.date, occurrenceIndex: o.occurrenceIndex }));
    const { sourceRowIds: _rows, executionCondition: _condition, ...sharedRule } = rule;
    series.push({ sourceItemRef: ref, startDate: start, manifest: { version: 1, sourceItemRef: ref, seriesId, rule: { version: 1, ...sharedRule },
      mode: rule.end ? 'finite' : 'open-ended', rows: occurrences, rowIds: occurrences.map(o => o.rowId), occurrenceIds: occurrences.map(o => o.occurrenceId), originalDates: occurrences.map(o => o.originalDate),
      hasMore: projected.projection.hasMore, ...(projected.projection.totalCount !== undefined ? { totalCount: projected.projection.totalCount } : {}),
      ...(projected.projection.window ? { window: { ...projected.projection.window, offsetWeeks: window.windowOffsetWeeks ?? 0, weeks: window.windowWeeks ?? 4 } } : {}) } });
    rows.push(...occurrences.map(o => ({ ...o, publicOwner, publicExcluded: !entry.included, key: o.occurrenceId, itemId: entry.item.id,
      title: entry.item.title, memo: entry.item.description, time: schedule.time, timeZone: schedule.timeZone, executionDate: o.originalDate,
      executionScheduleMode: 'inherit' as const, completion: 'unrecorded' as const, completedAt: null, flowInactive: source.inactive, mapReviewHold: false })));
  }
  return { ok: true, flowRef: source.flowRef, sourceSnapshotRaw: source.sourceRevisionToken, rows, series, pendingStarts, outsideWindowExceptionIds: [],
    calendar: [...new Set(rows.map(r => r.executionDate))].map(d => ({ date: d, occurrenceIds: rows.filter(r => r.executionDate === d).map(r => r.occurrenceId) })),
    unsupportedCapabilities: ['per-occurrence-hold', 'per-occurrence-exclusion', 'persist-expanded-window'] };
}

/** Another accepted item's revision cannot invalidate this item's execution history. */
export function programPublicCopyOccurrenceSourceCurrent(identity: ProgramOccurrenceIdentity, source: ProgramPublicCopyRecurrenceSource): boolean {
  const owner = identity.publicOwner, current = source.items.find(i => i.item.id === owner?.itemId);
  return !!owner && !!current && owner.copyId === source.copyId && owner.flowId === source.flowId
    && owner.scheduleVersionId === current.scheduleVersionId && stableAuthoringJson(owner.schedule) === stableAuthoringJson(current.item.schedule)
    && identity.sourceRule.startDate === current.startDate;
}
export function sameProgramPublicCopyOccurrence(a: ProgramOccurrenceIdentity, b: ProgramOccurrenceIdentity): boolean {
  const { sourceRevisionToken: _a, ...left } = a, { sourceRevisionToken: _b, ...right } = b;
  return !!a.publicOwner && !!b.publicOwner && stableAuthoringJson(left) === stableAuthoringJson(right);
}

/** Locate an actual pinned source occurrence, not a private plan date or guessed ordinal. */
export function programPublicCopyOccurrenceIdentityAt(source: ProgramOccurrenceIdentity, targetDate: string): ProgramOccurrenceIdentity | null {
  if (!validateProgramPublicCopyOccurrenceIdentity(source) || !date(targetDate) || targetDate < source.sourceRule.startDate) return null;
  const owner = source.publicOwner!, week = Math.floor((Date.parse(targetDate) - Date.parse(source.sourceRule.startDate)) / 604800000);
  if (!owner.schedule.rule.end && week > 519) return null;
  const openWeek = owner.schedule.rule.end ? 0 : week;
  for (let offset = 0; offset <= 10000; offset += 200) {
    const read = projectProgramPublicRecurrence({ itemId: owner.itemId, startDate: source.sourceRule.startDate, rule: owner.schedule.rule,
      offset, limit: 200, openEndedOffsetWeeks: Math.min(512, openWeek), openEndedWeeks: Math.max(1, openWeek - Math.min(512, openWeek) + 1) });
    if (!read.ok) return null;
    const row = read.projection.occurrences.find(row => row.date === targetDate);
    if (row) return { ...clone(source), occurrenceId: row.occurrenceId, occurrenceIndex: row.occurrenceIndex, originalDate: row.date };
    if (!owner.schedule.rule.end || !read.projection.hasMore || (read.projection.occurrences.at(-1)?.date ?? '9999') > targetDate) return null;
  }
  return null;
}

/** Retained records validate from their pinned schedule, without the latest repository.
 * A write still needs current copy/actor/CAS validation in the shared transition. */
export function validateProgramPublicCopyOccurrenceIdentity(value: ProgramOccurrenceIdentity): boolean {
  try {
    const owner = value.publicOwner;
    if (!record(owner) || !exact(owner, ['kind', 'version', 'copyId', 'flowId', 'itemId', 'scheduleVersionId', 'schedule']) || owner.kind !== 'public-copy' || owner.version !== 1
      || ![owner.copyId, owner.flowId, owner.itemId, owner.scheduleVersionId].every(id) || !validateProgramPublicRecurringSchedule(owner.schedule)
      || value.nativeOwner || value.creatorOwner || value.structuredOwner || Object.hasOwn(value, 'savedCopyId') || Object.hasOwn(value, 'flowId')
      || value.sourceWorkspaceId !== owner.copyId || value.sourceFlowRef !== programPublicCopyExecutionRef(owner.copyId)
      || value.sourceItemRef !== programPublicCopyItemRef(owner.copyId, owner.flowId, owner.itemId) || value.itemId !== owner.itemId
      || typeof value.sourceRevisionToken !== 'string' || !value.sourceRevisionToken || value.sourceRevisionToken.length > 1000000
      || !record(value.sourceRule) || !exact(value.sourceRule, ['startDate', 'recurrence', 'recurrenceEnd']) || !date(value.sourceRule.startDate)
      || !date(value.originalDate) || !Number.isSafeInteger(value.occurrenceIndex) || value.occurrenceIndex < 1 || value.occurrenceIndex > 10200) return false;
    const rule = programPublicRecurrenceToAuthoring(owner.schedule.rule);
    if (!rule || value.sourceRule.recurrence !== rule.raw || value.sourceRule.recurrenceEnd !== (rule.end?.raw ?? null)
      || value.seriesId !== programPublicCopySeriesKey(owner, value.sourceRule.startDate)
      || owner.schedule.start.kind === 'fixed' && owner.schedule.start.date !== value.sourceRule.startDate
      || !tokenMatches(value.sourceRevisionToken, owner)) return false;
    const week = Math.floor((Date.parse(value.originalDate) - Date.parse(value.sourceRule.startDate)) / 604800000);
    if (week < 0 || !rule.end && week > 519) return false;
    const projectedWeek = rule.end ? 0 : week, offsetWeeks = Math.min(512, projectedWeek);
    const projected = projectProgramPublicRecurrence({ itemId: owner.itemId, startDate: value.sourceRule.startDate, rule: owner.schedule.rule,
      offset: Math.min(10000, value.occurrenceIndex - 1), limit: Math.max(1, value.occurrenceIndex - 10000),
      openEndedOffsetWeeks: offsetWeeks, openEndedWeeks: Math.max(1, projectedWeek - offsetWeeks + 1) });
    return projected.ok && projected.projection.occurrences.some(o => o.occurrenceId === value.occurrenceId && o.occurrenceIndex === value.occurrenceIndex && o.date === value.originalDate);
  } catch { return false; }
}
