import {
  PROGRAM_LIMITS, PROGRAM_SCHEMA, type ProgramData, type ProgramEnvelope,
  type ProgramPrivateSpace, type ProgramPublicItem, type ProgramPublicRepository,
} from './contract';
import { createEmptyTextWorkspace, textWorkspaceModel } from './text-workspace';
import { validateProgramLegacySnapshotPayload } from './legacy-snapshot';
import { validateProgramCreatorDraftImports } from './creator-draft-provenance';
import { validateProgramCreatorWorkspace } from './creator-workspace-validation';
import { isProgramRecurrenceExecutionState } from './recurrence-state-validation';
import { validateProgramRecurrencePlans } from './program-recurrence-plan-state-validation';
import { isProgramExecutionTimelineOrders } from './recurrence-order-contract';
import { validateProgramPublicationRecurrenceDraft, validateProgramPublicRecurringSchedule } from './public-recurrence-contract';
import { readProgramPublicCopyRecurrenceSource } from './public-copy-recurrence';
import { validateProgramOrdinaryTiming, validateProgramOrdinaryTimingDraft } from './public-ordinary-time';

type Row = Record<string, unknown>;
const own = (row: object, key: string) => Object.prototype.hasOwnProperty.call(row, key);
export function programRecord(value: unknown): value is Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return (proto === Object.prototype || proto === null) && Object.entries(Object.getOwnPropertyDescriptors(value))
    .every(([key, descriptor]) => !['__proto__', 'prototype', 'constructor'].includes(key) && own(descriptor, 'value'));
}
export function programShape(value: unknown, keys: string[]): value is Row {
  return programRecord(value) && Object.keys(value).length === keys.length && keys.every(key => own(value, key));
}
export function programString(value: unknown, max: number = PROGRAM_LIMITS.bodyChars, nonempty = false): value is string {
  return typeof value === 'string' && value.length <= max && (!nonempty || value.trim().length > 0);
}
export const programIdentifier = (value: unknown): value is string => programString(value, 1200, true) && !['__proto__', 'prototype', 'constructor'].includes(value);
export function programDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(time.getTime()) && time.toISOString().slice(0, 10) === value;
}
export function safeProgramUrl(value: unknown): value is string {
  if (!programString(value, 3000, true)) return false;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      && !/(^|[?&])(token|access_token|api[_-]?key|password|secret|authorization)=/i.test(url.search);
  } catch { return false; }
}
const optional = (value: unknown, check: (value: unknown) => boolean) => value === null || check(value);
const strings = (value: unknown, max: number = PROGRAM_LIMITS.entries): value is string[] => Array.isArray(value) && value.length <= max && value.every(programIdentifier) && new Set(value).size === value.length;
const list = (value: unknown, check: (value: unknown) => boolean, max: number = PROGRAM_LIMITS.entries): value is unknown[] => Array.isArray(value) && value.length <= max && value.every(check);
const stamp = (value: unknown) => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value));
const unique = (value: unknown[]) => new Set(value.map(row => (row as Row).id)).size === value.length;
function publicationSeriesPointer(value: unknown): boolean {
  if (!programShape(value, ['version', 'key', 'revisionId', 'fingerprint']) || value.version !== 1 || !programString(value.key, 4000, true)
    || !programIdentifier(value.revisionId) || !programString(value.fingerprint, 100000, true)) return false;
  try {
    const key = JSON.parse(value.key), snapshot = JSON.parse(value.fingerprint);
    if (!Array.isArray(key) || key.length !== 3 || !['creator', 'native'].includes(key[0]) || !key.slice(1).every(programIdentifier)
      || !programShape(snapshot, ['key', 'revisionId', 'source']) || snapshot.key !== value.key || snapshot.revisionId !== value.revisionId) return false;
    const source = snapshot.source;
    return programShape(source, ['title', 'description', 'completionCriteria', 'rule', 'start', 'time', 'timeZone', 'executionCondition', 'place', 'durationMinutes', 'resourceLinks', 'sourceLinks', 'guides', 'cautions', 'additionalDescriptions', 'subchecks'])
      && programString(source.title, 500, true) && ['description', 'completionCriteria', 'executionCondition'].every(field => programString(source[field]))
      && validateProgramPublicRecurringSchedule({ kind: 'recurring', version: 1, rule: source.rule, start: source.start, time: source.time, timeZone: source.timeZone })
      && optional(source.place, value => programString(value)) && (source.durationMinutes === null || Number.isSafeInteger(source.durationMinutes) && (source.durationMinutes as number) > 0)
      && ['guides', 'cautions', 'additionalDescriptions'].every(field => list(source[field], part => programString(part), 500))
      && ['resourceLinks', 'sourceLinks'].every(field => list(source[field], part => programShape(part, ['label', 'url']) && programString(part.label, 500) && safeProgramUrl(part.url), 500))
      && list(source.subchecks, part => programShape(part, ['id', 'title']) && programIdentifier(part.id) && programString(part.title, 500), 500);
  } catch { return false; }
}
function legacySnapshotPayload(raw: string, workspaceId: unknown, revision: unknown): boolean {
  const payload: unknown = JSON.parse(raw);
  return validateProgramLegacySnapshotPayload(payload) && payload.state.workspaceId === workspaceId && payload.state.revision === revision;
}
function revisionIdentity(value: unknown, raw: unknown): boolean {
  if (value === null) return true;
  if (!programShape(value, ['lines', 'bindings', 'taskScopes', 'itemScopes'])
    || !list(value.lines, line => programShape(line, ['id', 'text']) && programIdentifier(line.id) && programString(line.text, 100000), 10000)
    || !unique(value.lines) || value.lines.map(line => (line as Row).text).join('\n') !== raw) return false;
  const ids = new Set(value.lines.map(line => (line as Row).id));
  if (!list(value.bindings, binding => programRecord(binding) && programIdentifier(binding.docId) && ids.has(binding.lineId)
    && (programShape(binding, ['kind', 'docId', 'lineId', 'scopeId']) && binding.kind === 'scope' && programIdentifier(binding.scopeId)
      || programShape(binding, ['kind', 'docId', 'lineId', 'taskId', 'dateMode']) && binding.kind === 'task' && programIdentifier(binding.taskId) && ['keep', 'apply'].includes(binding.dateMode as string)))) return false;
  return [value.taskScopes, value.itemScopes].every(scopes => programRecord(scopes) && Object.entries(scopes).every(([id, scopeId]) => ids.has(id) && programIdentifier(scopeId)));
}
export function validateProgramSchedule(value: unknown): boolean {
  if (!programRecord(value)) return false;
  if (value.kind === 'recurring') return validateProgramPublicRecurringSchedule(value);
  const timing = own(value, 'timing') ? ['timing'] : [];
  if (timing.length && !validateProgramOrdinaryTiming(value.timing)) return false;
  return programShape(value, ['kind', ...timing]) && value.kind === 'undated'
    || programShape(value, ['kind', 'date', ...timing]) && value.kind === 'fixed' && programDate(value.date)
    || programShape(value, ['kind', 'days', ...timing]) && value.kind === 'relative' && Number.isSafeInteger(value.days) && Math.abs(value.days as number) <= 36600;
}
/** PoC-only authoring-v1 rollout. All producers still use the strict schedule
 * validator; personal conflicts require explicit resolution, never conversion
 * to an ordinary task. This flag does not enable an operating/public service. */
export const PROGRAM_PUBLIC_RECURRENCE_RELEASE_V1 = Object.freeze({ version: 1, enabled: true });
export function canPublishProgramSchedule(value: unknown): boolean {
  return validateProgramSchedule(value) && (PROGRAM_PUBLIC_RECURRENCE_RELEASE_V1.enabled || !programRecord(value) || value.kind !== 'recurring');
}
export function validateProgramPublicItem(value: unknown): value is ProgramPublicItem {
  return programShape(value, ['id', 'title', 'description', 'completionCriteria', 'sourceUrl', 'schedule', 'subchecks'])
    && programIdentifier(value.id) && programString(value.title, 500, true)
    && programString(value.description) && programString(value.completionCriteria)
    && optional(value.sourceUrl, safeProgramUrl) && validateProgramSchedule(value.schedule)
    && list(value.subchecks, row => programShape(row, ['id', 'title']) && programIdentifier(row.id) && programString(row.title, 500, true), 500)
    && unique(value.subchecks);
}
/** Optional Program v1 proposal field. Never accepts private check metadata. */
export function validateProgramProposalChecks(value: unknown): value is ProgramPublicItem['subchecks'] {
  return list(value, row => programShape(row, ['id', 'title']) && programIdentifier(row.id)
    && programString(row.title, 500, true) && !/[\r\n]/.test(row.title as string), 500) && unique(value);
}
export function validateProgramMedia(value: unknown): boolean {
  return programShape(value, ['id', 'dataUrl', 'alt', 'synthetic']) && programIdentifier(value.id)
    && programString(value.dataUrl, Math.ceil(PROGRAM_LIMITS.mediaBytes * 4 / 3) + 100, true)
    && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value.dataUrl)
    && programString(value.alt, 500, true) && typeof value.synthetic === 'boolean';
}
export function validateProgramPublicRepository(value: unknown, actorIds: string[]): value is ProgramPublicRepository {
  if (!programShape(value, ['flows', 'versions', 'posts', 'replies', 'reactions', 'proposals'])) return false;
  const actor = (id: unknown) => typeof id === 'string' && actorIds.includes(id);
  if (!list(value.flows, row => programShape(row, ['id', 'ownerId', 'currentVersionId', 'category', 'situations', 'derivedFrom', 'archived'])
    && programIdentifier(row.id) && actor(row.ownerId) && programIdentifier(row.currentVersionId)
    && programString(row.category, 120, true) && strings(row.situations, 30) && typeof row.archived === 'boolean'
    && optional(row.derivedFrom, parent => programShape(parent, ['flowId', 'versionId']) && programIdentifier(parent.flowId) && programIdentifier(parent.versionId))) || !unique(value.flows)) return false;
  if (!list(value.versions, row => programShape(row, ['id', 'flowId', 'number', 'parentVersionId', 'title', 'summary', 'items', 'source', 'createdBy', 'createdAt'])
    && programIdentifier(row.id) && programIdentifier(row.flowId) && Number.isSafeInteger(row.number) && (row.number as number) > 0
    && optional(row.parentVersionId, programIdentifier) && programString(row.title, 240, true) && programString(row.summary)
    && list(row.items, validateProgramPublicItem, 1200) && unique(row.items)
    && programShape(row.source, ['kind', 'label', 'url', 'checkedAt'])
    && ['repository-source', 'user-text', 'simulated-example'].includes(row.source.kind as string)
    && programString(row.source.label, 500, true) && optional(row.source.url, safeProgramUrl) && optional(row.source.checkedAt, programDate)
    && actor(row.createdBy) && stamp(row.createdAt)) || !unique(value.versions)) return false;
  const flows = value.flows as Row[], versions = value.versions as Row[];
  const version = (id: unknown) => versions.find(row => row.id === id);
  const flow = (id: unknown) => flows.find(row => row.id === id);
  for (const row of versions) {
    if (!flow(row.flowId)) return false;
    if (row.parentVersionId === null ? row.number !== 1 : !versions.some(parent => parent.id === row.parentVersionId && parent.flowId === row.flowId && (parent.number as number) + 1 === row.number)) return false;
    if (versions.filter(other => other.flowId === row.flowId && other.number === row.number).length !== 1) return false;
  }
  for (const row of flows) {
    if (version(row.currentVersionId)?.flowId !== row.id) return false;
    if (row.derivedFrom !== null) {
      const parent = row.derivedFrom as Row;
      if (parent.flowId === row.id || version(parent.versionId)?.flowId !== parent.flowId) return false;
      const seen = new Set([row.id]); let current: Row | undefined = flow(parent.flowId);
      while (current) { if (seen.has(current.id)) return false; seen.add(current.id); current = current.derivedFrom ? flow((current.derivedFrom as Row).flowId) : undefined; }
    }
  }
  const reference = (row: Row) => row.flowId === null ? row.versionId === null && row.itemId === null
    : !!flow(row.flowId) && version(row.versionId)?.flowId === row.flowId
      && (row.itemId === null || (version(row.versionId)?.items as Row[]).some(item => item.id === row.itemId));
  if (!list(value.posts, row => programShape(row, ['id', 'authorId', 'kind', 'title', 'body', 'topic', 'flowId', 'versionId', 'itemId', 'evidencePostIds', 'media', 'createdAt', 'updatedAt', 'deleted'])
    && programIdentifier(row.id) && actor(row.authorId) && ['experience', 'question', 'knowledge'].includes(row.kind as string)
    && typeof row.deleted === 'boolean' && programString(row.title, 240, !row.deleted) && programString(row.body, PROGRAM_LIMITS.bodyChars, !row.deleted)
    && programString(row.topic, 120) && reference(row) && strings(row.evidencePostIds, 50)
    && list(row.media, validateProgramMedia, 4) && unique(row.media) && stamp(row.createdAt) && stamp(row.updatedAt)) || !unique(value.posts)) return false;
  const posts = value.posts as Row[];
  if (posts.some(row => (row.evidencePostIds as string[]).some(id => id === row.id || !posts.some(post => post.id === id)))) return false;
  if (!list(value.replies, row => programShape(row, ['id', 'postId', 'parentReplyId', 'authorId', 'body', 'createdAt', 'updatedAt', 'deleted'])
    && programIdentifier(row.id) && posts.some(post => post.id === row.postId) && optional(row.parentReplyId, programIdentifier) && actor(row.authorId)
    && typeof row.deleted === 'boolean' && programString(row.body, PROGRAM_LIMITS.bodyChars, !row.deleted) && stamp(row.createdAt) && stamp(row.updatedAt)) || !unique(value.replies)) return false;
  const replies = value.replies as Row[];
  for (const row of replies) {
    const seen = new Set([row.id]); let parentId = row.parentReplyId;
    while (parentId !== null) {
      if (seen.has(parentId)) return false; seen.add(parentId);
      const parent = replies.find(reply => reply.id === parentId && reply.postId === row.postId);
      if (!parent) return false; parentId = parent.parentReplyId;
    }
  }
  if (!list(value.reactions, row => programShape(row, ['actorId', 'targetKind', 'targetId']) && actor(row.actorId)
    && (row.targetKind === 'post' ? posts : row.targetKind === 'reply' ? replies : []).some(target => target.id === row.targetId))
    || new Set(value.reactions.map(row => JSON.stringify(row))).size !== value.reactions.length) return false;
  if (!list(value.proposals, row => programShape(row, ['id', 'authorId', 'flowId', 'baseVersionId', 'itemId', 'reason', 'patch', 'status', 'reviewNote', 'reviewedBy', 'resultVersionId', 'createdAt', 'updatedAt'])
    && programIdentifier(row.id) && actor(row.authorId) && !!flow(row.flowId) && version(row.baseVersionId)?.flowId === row.flowId
    && (version(row.baseVersionId)?.items as Row[]).some(item => item.id === row.itemId)
    && programString(row.reason, 10000, true) && programRecord(row.patch) && Object.keys(row.patch).length > 0
    && Object.entries(row.patch).every(([key, part]) => key === 'schedule' ? validateProgramSchedule(part) : key === 'subchecks' ? validateProgramProposalChecks(part) : ['title', 'description', 'completionCriteria'].includes(key) && programString(part, key === 'title' ? 500 : PROGRAM_LIMITS.bodyChars, key === 'title'))
    && ['submitted', 'held', 'rejected', 'accepted'].includes(row.status as string) && programString(row.reviewNote, 10000)
    && optional(row.reviewedBy, actor) && (row.status === 'accepted' ? version(row.resultVersionId)?.flowId === row.flowId : row.resultVersionId === null)
    && stamp(row.createdAt) && stamp(row.updatedAt)) || !unique(value.proposals)) return false;
  return true;
}

export function createProgramPrivateSpace(): ProgramPrivateSpace {
  return { text: createEmptyTextWorkspace(), archivedDocumentIds: [], copies: [], savedBindings: [], draftRevisions: [], participationDrafts: [], publicationDrafts: [], publications: [], position: { documentId: null, lineId: null, start: 0, end: 0, scrollTop: 0 }, timelineOrders: {}, legacySnapshot: null, legacyQuickItemLines: {}, legacyTimelinePolicies: {}, retentionDocuments: {}, creatorDraftImports: [] };
}
export function createProgramData(): ProgramData {
  const actors = [{ id: 'local-user', name: '나', simulated: true as const }, { id: 'creator-minji', name: '민지 · 예시', simulated: true as const }, { id: 'participant-jihun', name: '지훈 · 예시', simulated: true as const }];
  return { actors, activeActorId: actors[0].id, spaces: Object.fromEntries(actors.map(actor => [actor.id, createProgramPrivateSpace()])), public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] }, receipts: [] };
}
export function createProgramEnvelope(data = createProgramData()): ProgramEnvelope {
  return { schema: PROGRAM_SCHEMA, revision: 0, data, undo: Object.fromEntries(data.actors.map(actor => [actor.id, []])) };
}
function privateSpace(value: unknown, data: ProgramData, actorId: string): value is ProgramPrivateSpace {
  const required = ['text', 'archivedDocumentIds', 'copies', 'savedBindings', 'draftRevisions', 'participationDrafts', 'publicationDrafts', 'publications', 'position', 'timelineOrders', 'legacySnapshot', 'legacyQuickItemLines', 'legacyTimelinePolicies'];
  const extensions = ['retentionDocuments', 'creatorDraftImports', 'creatorWorkspace', 'proposalReviewDrafts', 'recurrenceExecution', 'recurrencePlans', 'executionTimelineOrders', 'documentTrash'];
  if (!programRecord(value) || !required.every(key => own(value, key))
    || Object.keys(value).some(key => !required.includes(key) && !extensions.includes(key)) || !textWorkspaceModel.validate(value.text)) return false;
  const text = value.text, docs = [...text.documents, ...text.flows];
  const doc = (id: unknown) => docs.find(row => row.id === id);
  const version = (id: unknown) => data.public.versions.find(row => row.id === id);
  const retention = value.retentionDocuments ?? {};
  if (!programRecord(retention) || new Set(Object.values(retention)).size !== Object.keys(retention).length
    || Object.entries(retention).some(([sourceId, retainedId]) => !doc(sourceId) || sourceId === retainedId || own(retention, String(retainedId))
      || !text.documents.some(document => document.id === retainedId) || !Array.isArray(value.archivedDocumentIds) || !value.archivedDocumentIds.includes(retainedId))) return false;
  const ownsLine = (documentId: unknown, lineId: unknown) => doc(documentId)?.lines.some(line => line.id === lineId)
    || doc(retention[String(documentId)])?.lines.some(line => line.id === lineId);
  if (!optional(value.legacySnapshot, entry => programShape(entry, ['workspaceId', 'revision', 'raw']) && programIdentifier(entry.workspaceId)
    && Number.isSafeInteger(entry.revision) && (entry.revision as number) >= 0 && programString(entry.raw, 10_000_000, true)
    && legacySnapshotPayload(entry.raw as string, entry.workspaceId, entry.revision))) return false;
  if (!programRecord(value.legacyQuickItemLines) || Object.entries(value.legacyQuickItemLines).some(([ref, lineId]) => !programIdentifier(ref) || !docs.some(document => document.lines.some(line => line.id === lineId)))) return false;
  if (!programRecord(value.legacyTimelinePolicies) || Object.entries(value.legacyTimelinePolicies).some(([lineId, policy]) => !docs.some(document => document.lines.some(line => line.id === lineId)) || !['auto', 'included', 'excluded'].includes(policy as string))) return false;
  if (!programRecord(value.timelineOrders) || Object.entries(value.timelineOrders).some(([date, ids]) => date !== 'undated' && !programDate(date) || !strings(ids)
    || ids.some(id => !docs.some(document => document.lines.some(line => line.id === id))))) return false;
  if (!strings(value.archivedDocumentIds) || value.archivedDocumentIds.some(id => !doc(id))) return false;
  if (own(value, 'documentTrash') && (!programRecord(value.documentTrash) || Object.entries(value.documentTrash).some(([id, entry]) =>
    !doc(id) || !(value.archivedDocumentIds as string[]).includes(id) || Object.values(retention).includes(id)
    || !programShape(entry, ['trashedAt', 'wasArchived']) || !stamp(entry.trashedAt) || typeof entry.wasArchived !== 'boolean'))) return false;
  if (!list(value.copies, row => programRecord(row) && programShape(row, ['id', 'flowId', 'baseVersionId', 'documentId', 'itemLines', 'subcheckLines', 'inheritedDates', 'includedItemIds', 'anchor', 'itemOverrides', 'appliedFields', ...(own(row, 'recurrence') ? ['recurrence'] : []), ...(own(row, 'kindHandoffs') ? ['kindHandoffs'] : []), ...(own(row, 'checkResolutions') ? ['checkResolutions'] : [])])
    && programIdentifier(row.id) && version(row.baseVersionId)?.flowId === row.flowId && !!text.flows.find(entry => entry.id === row.documentId)
    && programRecord(row.itemLines) && Object.entries(row.itemLines).every(([itemId, lineId]) => programIdentifier(itemId) && ownsLine(row.documentId, lineId))
    && programRecord(row.subcheckLines) && Object.entries(row.subcheckLines).every(([itemId, checks]) => own(row.itemLines as Row, itemId) && programRecord(checks)
      && Object.entries(checks).every(([checkId, lineId]) => programIdentifier(checkId) && ownsLine(row.documentId, lineId)))
    && programRecord(row.inheritedDates) && Object.entries(row.inheritedDates).every(([id, date]) => own(row.itemLines as Row, id) && optional(date, programDate))
    && strings(row.includedItemIds) && row.includedItemIds.every(id => own(row.itemLines as Row, id)) && optional(row.anchor, programDate)
    && programRecord(row.itemOverrides) && Object.entries(row.itemOverrides).every(([id, patch]) => own(row.itemLines as Row, id) && programRecord(patch)
      && Object.entries(patch).every(([key, part]) => key === 'title' ? programString(part, 500, true) : key === 'date' ? optional(part, programDate) : key === 'included' && typeof part === 'boolean'))
    && programRecord(row.appliedFields) && Object.entries(row.appliedFields).every(([id, fields]) => own(row.itemLines as Row, id) && programRecord(fields)
      && Object.entries(fields).every(([field, versionId]) => ['title', 'description', 'completionCriteria', 'sourceUrl', 'schedule', 'subchecks'].includes(field)
        && version(versionId)?.flowId === row.flowId && version(versionId)?.items.some(item => item.id === id)))) || !unique(value.copies)) return false;
  for (const copy of value.copies as ProgramPrivateSpace['copies']) {
    const recurring = Object.hasOwn(copy, 'recurrence') || Object.hasOwn(copy, 'kindHandoffs') || Object.hasOwn(copy, 'checkResolutions') || Object.keys(copy.itemLines).some(itemId =>
      version(copy.appliedFields[itemId]?.schedule ?? copy.baseVersionId)?.items.find(item => item.id === itemId)?.schedule.kind === 'recurring');
    if (recurring && !readProgramPublicCopyRecurrenceSource(value as ProgramPrivateSpace, data.public, copy.id).ok) return false;
  }
  if (!list(value.savedBindings, row => programShape(row, ['savedCopyId', 'flowId', 'flowRef', 'documentId', 'itemLines', 'sourceRevision'])
    && ['savedCopyId', 'flowId', 'flowRef', 'sourceRevision'].every(key => programIdentifier(row[key])) && !!doc(row.documentId)
    && programRecord(row.itemLines) && Object.entries(row.itemLines).every(([ref, id]) => programIdentifier(ref) && ownsLine(row.documentId, id)))) return false;
  if (!list(value.draftRevisions, row => (programShape(row, ['id', 'documentId', 'title', 'raw', 'createdAt']) || programShape(row, ['id', 'documentId', 'title', 'raw', 'createdAt', 'identity']))
    && programIdentifier(row.id) && !!doc(row.documentId) && programString(row.title, 240, true) && programString(row.raw, 100000) && stamp(row.createdAt)
    && (!own(row, 'identity') || revisionIdentity(row.identity, row.raw)), 1000) || !unique(value.draftRevisions)) return false;
  if (own(value, 'creatorDraftImports') && !validateProgramCreatorDraftImports(value.creatorDraftImports, { text, draftRevisions: value.draftRevisions as ProgramPrivateSpace['draftRevisions'] })) return false;
  if (own(value, 'creatorWorkspace') && !validateProgramCreatorWorkspace(value.creatorWorkspace, { text })) return false;
  if(Object.values((value.creatorWorkspace as ProgramPrivateSpace['creatorWorkspace'])?.sourceUpdateSessions??{}).some(entry=>entry.session.actorId!==actorId))return false;
  if (own(value, 'recurrenceExecution') && !isProgramRecurrenceExecutionState(value.recurrenceExecution)) return false;
  if (own(value, 'recurrencePlans') && (!validateProgramRecurrencePlans(value.recurrencePlans)
    || Object.values(value.recurrencePlans.owners).some(owner => owner.actorId !== actorId))) return false;
  if (own(value, 'executionTimelineOrders') && !isProgramExecutionTimelineOrders(value.executionTimelineOrders)) return false;
  if (own(value, 'proposalReviewDrafts') && (!programRecord(value.proposalReviewDrafts)
    || Object.entries(value.proposalReviewDrafts).some(([id, draft]) => !data.public.proposals.some(proposal => proposal.id === id)
      || !programShape(draft, ['note', 'expectedProposalToken']) || !programString(draft.note, 10000)
      || !programString(draft.expectedProposalToken, 120000, true)))) return false;
  if (!list(value.participationDrafts, row => programShape(row, ['id', 'kind', 'title', 'body', 'topic', 'postId', 'flowId', 'versionId', 'itemId', 'media', 'parentReplyId', 'editTargetId', 'expectedUpdatedAt', 'expectedContent', 'requestId', 'evidencePostIds', 'cursor'])
    && programIdentifier(row.id) && ['experience', 'question', 'knowledge', 'reply'].includes(row.kind as string)
    && programString(row.title, 240) && programString(row.body) && programString(row.topic, 120)
    && ['postId', 'flowId', 'versionId', 'itemId', 'parentReplyId', 'editTargetId'].every(key => optional(row[key], programIdentifier))
    && optional(row.expectedUpdatedAt, stamp) && optional(row.expectedContent, content => programString(content, 12_000_000))
    && programIdentifier(row.requestId) && strings(row.evidencePostIds, 50)
    && programShape(row.cursor, ['start', 'end']) && Number.isSafeInteger(row.cursor.start) && Number.isSafeInteger(row.cursor.end)
    && (row.cursor.start as number) >= 0 && (row.cursor.end as number) >= (row.cursor.start as number)
    && list(row.media, validateProgramMedia, 4)) || !unique(value.participationDrafts)) return false;
  if (!list(value.publicationDrafts, row => programShape(row, ['id', 'documentId', 'requestId', 'flowId', 'expectedVersionId', 'sourceDocumentFingerprint', 'title', 'summary', 'category', 'situationsText', 'sourceKind', 'sourceLabel', 'sourceUrl', 'derivedFrom', 'rows', 'updatedAt'])
    && programIdentifier(row.id) && !!doc(row.documentId) && programIdentifier(row.requestId) && optional(row.flowId, programIdentifier) && optional(row.expectedVersionId, programIdentifier)
    && programString(row.sourceDocumentFingerprint, 1_000_000) && programString(row.title, 240) && programString(row.summary)
    && programString(row.category, 120) && programString(row.situationsText, 3000) && ['user-text', 'simulated-example'].includes(row.sourceKind as string)
    && programString(row.sourceLabel, 500) && programString(row.sourceUrl, 3000) && stamp(row.updatedAt)
    && optional(row.derivedFrom, origin => programShape(origin, ['flowId', 'versionId']) && programIdentifier(origin.flowId) && programIdentifier(origin.versionId))
    && list(row.rows, item => programRecord(item) && programShape(item, ['rowId', 'origin', 'itemId', 'selected', 'title', 'description', 'completionCriteria', 'sourceUrl', 'scheduleKind', 'scheduleValue', 'subchecks',
      ...(own(item, 'recurrence') ? ['recurrence'] : []), ...(own(item, 'timing') ? ['timing'] : []), ...(own(item, 'seriesSource') ? ['seriesSource'] : [])])
      && optional(item.rowId, programIdentifier) && ['task', 'note', 'previous-public', 'series'].includes(item.origin as string) && programIdentifier(item.itemId)
      && typeof item.selected === 'boolean' && programString(item.title, 500) && programString(item.description) && programString(item.completionCriteria)
      && programString(item.sourceUrl, 3000) && ['undated', 'fixed', 'relative', 'recurring'].includes(item.scheduleKind as string) && programString(item.scheduleValue, 100)
      && (item.scheduleKind !== 'recurring' || own(item, 'recurrence'))
      && (!own(item, 'recurrence') || validateProgramPublicationRecurrenceDraft(item.recurrence))
      && (!own(item, 'timing') || validateProgramOrdinaryTimingDraft(item.timing))
      && (item.origin !== 'series' || own(item, 'seriesSource'))
      && (!own(item, 'seriesSource') || publicationSeriesPointer(item.seriesSource))
      && list(item.subchecks, check => programShape(check, ['id', 'title']) && programIdentifier(check.id) && programString(check.title, 500), 500), 1200)) || !unique(value.publicationDrafts)) return false;
  if (!list(value.publications, row => programRecord(row) && programShape(row, ['flowId', 'documentId', 'creatorDraftId', ...(own(row, 'seriesBindings') ? ['seriesBindings'] : [])]) && data.public.flows.some(flow => flow.id === row.flowId)
    && optional(row.documentId, id => !!doc(id)) && optional(row.creatorDraftId, programIdentifier)
    && (!own(row, 'seriesBindings') || programShape(row.seriesBindings, ['version', 'items']) && row.seriesBindings.version === 1
      && list(row.seriesBindings.items, entry => programShape(entry, ['key', 'itemId']) && programString(entry.key, 4000, true) && programIdentifier(entry.itemId)
        && data.public.versions.some(version => version.flowId === row.flowId && version.items.some(item => item.id === entry.itemId)), 1200)
      && new Set(row.seriesBindings.items.map(entry => (entry as Row).key)).size === row.seriesBindings.items.length
      && new Set(row.seriesBindings.items.map(entry => (entry as Row).itemId)).size === row.seriesBindings.items.length))) return false;
  const position = value.position;
  return programShape(position, ['documentId', 'lineId', 'start', 'end', 'scrollTop']) && optional(position.documentId, id => !!doc(id))
    && optional(position.lineId, id => !!doc(position.documentId)?.lines.some(line => line.id === id))
    && ['start', 'end', 'scrollTop'].every(key => typeof position[key] === 'number' && Number.isFinite(position[key]) && (position[key] as number) >= 0)
    && Number.isSafeInteger(position.start) && Number.isSafeInteger(position.end) && (position.end as number) >= (position.start as number);
}
export function validateProgramData(value: unknown): value is ProgramData {
  try {
    if (!programShape(value, ['actors', 'activeActorId', 'spaces', 'public', 'receipts'])) return false;
    if (!list(value.actors, row => programShape(row, ['id', 'name', 'simulated']) && programIdentifier(row.id) && programString(row.name, 80, true) && row.simulated === true, PROGRAM_LIMITS.actors)
      || !value.actors.length || !unique(value.actors)) return false;
    const actorIds = (value.actors as Row[]).map(row => row.id as string);
    if (!actorIds.includes(value.activeActorId as string) || !programShape(value.spaces, actorIds) || !validateProgramPublicRepository(value.public, actorIds)) return false;
    const data = value as unknown as ProgramData;
    if (!Object.entries(value.spaces).every(([actorId,space]) => privateSpace(space, data, actorId))) return false;
    if (!list(value.receipts, row => programShape(row, ['id', 'actorId', 'fingerprint', 'resultId', 'kind']) && programIdentifier(row.id) && actorIds.includes(row.actorId as string)
      && programString(row.fingerprint, 12_000_000, true) && programIdentifier(row.resultId) && programString(row.kind, 80, true))) return false;
    return new Set((value.receipts as Row[]).map(row => JSON.stringify([row.actorId, row.id]))).size === value.receipts.length;
  } catch { return false; }
}
export function validateProgramEnvelope(value: unknown): value is ProgramEnvelope {
  try {
    if (!programShape(value, ['schema', 'revision', 'data', 'undo']) || value.schema !== PROGRAM_SCHEMA
      || !Number.isSafeInteger(value.revision) || (value.revision as number) < 0 || !validateProgramData(value.data)) return false;
    if (!programShape(value.undo, value.data.actors.map(actor => actor.id))) return false;
    const data = value.data;
    return Object.entries(value.undo).every(([actorId,history]) => list(history, entry => programShape(entry, ['label', 'groupId', 'workspace'])
      && programString(entry.label, 240, true) && optional(entry.groupId, programIdentifier) && privateSpace(entry.workspace, data, actorId), PROGRAM_LIMITS.history));
  } catch { return false; }
}
