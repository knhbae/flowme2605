import {
  PROGRAM_LIMITS, programClone, programFailure, programId, programResult,
  type ProgramData, type ProgramItemPatch, type ProgramPublicItem, type ProgramSource,
  type ProgramTransition, type PublicSchedule, type ProgramPublicVersion,
} from './contract';
import {
  programDate, programIdentifier, programRecord, programString, safeProgramUrl,
  validateProgramData, validateProgramPublicItem, validateProgramPublicRepository, validateProgramSchedule, canPublishProgramSchedule, validateProgramProposalChecks,
} from './program-data';
import { programSame } from './controller';
import { validateProgramOrdinaryTiming } from './public-ordinary-time';

export type PublishProgramFlowInput = {
  actorId: string; requestId: string; flowId?: string; expectedVersionId?: string;
  title: string; summary: string; category: string; situations: string[];
  items: ProgramPublicItem[]; source: ProgramSource;
  derivedFrom?: { flowId: string; versionId: string } | null;
};
export type CreateProgramProposalInput = {
  actorId: string; requestId: string; flowId: string; baseVersionId: string;
  itemId: string; reason: string; patch: ProgramItemPatch;
};
export type ReviewProgramProposalInput = {
  actorId: string; proposalId: string; decision: 'hold' | 'reject' | 'accept';
  note?: string; expectedVersionId: string; expectedProposalToken?: string;
};
/** Full structural CAS token; key insertion order is not publication meaning. */
export function programProposalReviewToken(data: ProgramData, proposalId: string): string | null {
  const proposal = data.public.proposals.find(entry => entry.id === proposalId);
  const flow = proposal && data.public.flows.find(entry => entry.id === proposal.flowId);
  if (!proposal || !flow) return null;
  const ordered = (value: unknown): unknown => Array.isArray(value) ? value.map(ordered)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, part]) => [key, ordered(part)])) : value;
  return JSON.stringify(ordered({ proposal, flow: { id: flow.id, ownerId: flow.ownerId, currentVersionId: flow.currentVersionId, archived: flow.archived } }));
}
const actorExists = (data: ProgramData, id: string) => data.actors.some(actor => actor.id === id);
const stamp = (value: unknown) => typeof value === 'string'
  && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value));
const same = programSame;
function result(data: ProgramData, next: ProgramData, id: string): ProgramTransition<string> {
  return validateProgramData(next) ? programResult(data, next, id) : programFailure(data, 'invalid');
}
function replay(data: ProgramData, actorId: string, requestId: string, kind: string, fingerprint: string): ProgramTransition<string> | null {
  const receipt = data.receipts.find(row => row.actorId === actorId && row.id === requestId);
  if (!receipt) return null;
  return receipt.kind === kind && receipt.fingerprint === fingerprint
    ? { ok: true, data, changed: false, result: receipt.resultId }
    : programFailure(data, 'duplicate-request');
}

function publicSchedule(value: unknown, preparing = false): PublicSchedule | null {
  if (!programRecord(value)) return null;
  if (value.kind === 'recurring') return (preparing ? validateProgramSchedule(value) : canPublishProgramSchedule(value)) ? programClone(value) as PublicSchedule : null;
  const projected = value.kind === 'undated' ? { kind: 'undated' as const }
    : value.kind === 'fixed' ? { kind: 'fixed' as const, date: value.date }
      : value.kind === 'relative' ? { kind: 'relative' as const, days: value.days } : null;
  if (projected && Object.hasOwn(value, 'timing')) {
    if (!validateProgramOrdinaryTiming(value.timing)) return null;
    Object.assign(projected, { timing: programClone(value.timing) });
  }
  return validateProgramSchedule(projected) ? projected as PublicSchedule : null;
}
function publicItem(value: unknown, preparing = false): ProgramPublicItem | null {
  if (!programRecord(value) || !Array.isArray(value.subchecks)) return null;
  const schedule = publicSchedule(value.schedule, preparing);
  if (!schedule || value.subchecks.some(row => !programRecord(row))) return null;
  const item = { id: value.id, title: value.title, description: value.description,
    completionCriteria: value.completionCriteria, sourceUrl: value.sourceUrl, schedule,
    subchecks: value.subchecks.map(row => ({ id: row.id, title: row.title })) };
  return validateProgramPublicItem(item) ? item : null;
}
function publicSource(value: unknown): ProgramSource | null {
  if (!programRecord(value) || !['repository-source', 'user-text', 'simulated-example'].includes(value.kind as string)
    || !programString(value.label, 500, true) || !(value.url === null || safeProgramUrl(value.url))
    || !(value.checkedAt === null || programDate(value.checkedAt))) return null;
  return { kind: value.kind as ProgramSource['kind'], label: value.label, url: value.url as string | null, checkedAt: value.checkedAt as string | null };
}
function publicPatch(value: unknown, preparing = false): ProgramItemPatch | null {
  if (!programRecord(value) || Object.keys(value).length === 0
    || Object.keys(value).some(key => !['title', 'description', 'completionCriteria', 'schedule', 'subchecks'].includes(key))) return null;
  const patch: ProgramItemPatch = {};
  for (const key of ['title', 'description', 'completionCriteria'] as const) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      if (!programString(value[key], key === 'title' ? 500 : PROGRAM_LIMITS.bodyChars, key === 'title')) return null;
      patch[key] = value[key];
    }
  }
  if (Object.prototype.hasOwnProperty.call(value, 'schedule')) {
    const schedule = publicSchedule(value.schedule, preparing);
    if (!schedule) return null;
    patch.schedule = schedule;
  }
  if (Object.prototype.hasOwnProperty.call(value, 'subchecks')) {
    if (!validateProgramProposalChecks(value.subchecks)) return null;
    patch.subchecks = value.subchecks.map(check => ({ id: check.id, title: check.title }));
  }
  return patch;
}

export function publishProgramFlow(data: ProgramData, input: PublishProgramFlowInput, now: string): ProgramTransition<string> {
  if (!actorExists(data, input.actorId)) return programFailure(data, 'forbidden');
  if (!programIdentifier(input.requestId) || !stamp(now) || !programString(input.title, 240, true)
    || !programString(input.summary) || !programString(input.category, 120, true)
    || !Array.isArray(input.situations) || input.situations.length > 30 || !input.situations.every(programIdentifier)
    || new Set(input.situations).size !== input.situations.length
    || !Array.isArray(input.items) || input.items.length === 0 || input.items.length > 1200) return programFailure(data, 'invalid');
  const items = input.items.map(item => publicItem(item)), source = publicSource(input.source);
  if (items.some(item => !item) || !source || new Set(items.map(item => item!.id)).size !== items.length) return programFailure(data, 'invalid');
  let derivedFrom: { flowId: string; versionId: string } | null = null;
  if (input.derivedFrom != null) {
    if (!programRecord(input.derivedFrom) || !programIdentifier(input.derivedFrom.flowId) || !programIdentifier(input.derivedFrom.versionId)) return programFailure(data, 'invalid');
    derivedFrom = { flowId: input.derivedFrom.flowId, versionId: input.derivedFrom.versionId };
  }
  const fields = { title: input.title, summary: input.summary, category: input.category, situations: [...input.situations], items: items as ProgramPublicItem[], source };
  const fingerprint = JSON.stringify({ flowId: input.flowId ?? null, expectedVersionId: input.expectedVersionId ?? null, ...fields, derivedFrom });
  const previous = replay(data, input.actorId, input.requestId, 'publication', fingerprint);
  if (previous) return previous;
  const flow = input.flowId ? data.public.flows.find(row => row.id === input.flowId) : undefined;
  const current = flow && data.public.versions.find(row => row.id === flow.currentVersionId);
  if (input.flowId && (!flow || flow.archived || !current)) return programFailure(data, 'missing');
  if (flow && flow.ownerId !== input.actorId) return programFailure(data, 'forbidden');
  if (flow && input.expectedVersionId !== flow.currentVersionId || !flow && input.expectedVersionId !== undefined) return programFailure(data, 'conflict');
  if (flow && input.derivedFrom !== undefined && !same(derivedFrom, flow.derivedFrom)) return programFailure(data, 'conflict');
  // A saved simulated fixture cannot become a factual source merely by renaming it.
  if (current?.source.kind === 'simulated-example' && source.kind !== 'simulated-example') return programFailure(data, 'conflict');
  if (!flow && derivedFrom && !data.public.versions.some(row => row.id === derivedFrom!.versionId && row.flowId === derivedFrom!.flowId)) return programFailure(data, 'missing');
  if (data.public.versions.length >= PROGRAM_LIMITS.entries || data.receipts.length >= PROGRAM_LIMITS.entries
    || !flow && data.public.flows.length >= PROGRAM_LIMITS.entries) return programFailure(data, 'limit');
  const next = programClone(data), flowId = flow?.id ?? programId('flow'), versionId = programId('version');
  next.public.versions.push({ id: versionId, flowId, number: (current?.number ?? 0) + 1, parentVersionId: current?.id ?? null,
    title: fields.title, summary: fields.summary, items: fields.items, source: fields.source, createdBy: input.actorId, createdAt: now });
  if (flow) {
    const target = next.public.flows.find(row => row.id === flowId)!;
    target.currentVersionId = versionId; target.category = fields.category; target.situations = fields.situations;
  } else next.public.flows.push({ id: flowId, ownerId: input.actorId, currentVersionId: versionId,
    category: fields.category, situations: fields.situations, derivedFrom, archived: false });
  next.receipts.push({ id: input.requestId, actorId: input.actorId, fingerprint, resultId: versionId, kind: 'publication' });
  return result(data, next, versionId);
}

export function createProgramProposal(data: ProgramData, input: CreateProgramProposalInput, now: string): ProgramTransition<string> {
  if (!actorExists(data, input.actorId)) return programFailure(data, 'forbidden');
  // A submitted suggestion is not a published version. Strict recurring input
  // can be reviewed while publication/acceptance retain their release guard.
  const patch = publicPatch(input.patch, true);
  if (!patch || !programIdentifier(input.requestId) || !programString(input.reason, 10000, true) || !stamp(now)) return programFailure(data, 'invalid');
  const fields = { flowId: input.flowId, baseVersionId: input.baseVersionId, itemId: input.itemId, reason: input.reason, patch };
  const fingerprint = JSON.stringify(fields), previous = replay(data, input.actorId, input.requestId, 'proposal', fingerprint);
  if (previous) return previous;
  const flow = data.public.flows.find(row => row.id === input.flowId && !row.archived);
  const base = data.public.versions.find(row => row.id === input.baseVersionId && row.flowId === input.flowId);
  const item = base?.items.find(row => row.id === input.itemId);
  if (!flow || !item) return programFailure(data, 'missing');
  if (Object.entries(patch).every(([key, value]) => same(item[key as keyof ProgramItemPatch], value))) return programFailure(data, 'invalid');
  if (data.public.proposals.length >= PROGRAM_LIMITS.entries || data.receipts.length >= PROGRAM_LIMITS.entries) return programFailure(data, 'limit');
  const next = programClone(data), id = programId('proposal');
  next.public.proposals.push({ id, authorId: input.actorId, ...fields, status: 'submitted', reviewNote: '', reviewedBy: null,
    resultVersionId: null, createdAt: now, updatedAt: now });
  next.receipts.push({ id: input.requestId, actorId: input.actorId, fingerprint, resultId: id, kind: 'proposal' });
  return result(data, next, id);
}

export type ProgramProposalVersionCandidate = Pick<ProgramPublicVersion, 'flowId' | 'number' | 'parentVersionId' | 'title' | 'summary' | 'items' | 'source'>;
/** Read-only preparation for the same review writer. No version identity, actor,
 * timestamp, receipt or private data is created. A candidate is not publication
 * permission: reviewProgramProposal still checks the release gate before writing. */
export function prepareProgramProposalVersion(data: ProgramData, proposalId: string):
  { ok: true; candidate: ProgramProposalVersionCandidate } | { ok: false; reason: 'invalid' | 'missing' | 'conflict' } {
  // Private documents/Undo are neither candidate input nor a second validator
  // workload. The controller owns them; validate the public reference graph here.
  if (!validateProgramPublicRepository(data.public, data.actors.map(actor => actor.id))) return { ok: false, reason: 'invalid' };
  const proposal = data.public.proposals.find(row => row.id === proposalId);
  const flow = proposal && data.public.flows.find(row => row.id === proposal.flowId && !row.archived);
  if (!proposal || !flow) return { ok: false, reason: 'missing' };
  if (!['submitted', 'held'].includes(proposal.status)) return { ok: false, reason: 'conflict' };
  const current = data.public.versions.find(row => row.id === flow.currentVersionId && row.flowId === flow.id)!;
  const baseItem = data.public.versions.find(row => row.id === proposal.baseVersionId && row.flowId === flow.id)?.items.find(row => row.id === proposal.itemId);
  const currentItem = current.items.find(row => row.id === proposal.itemId);
  if (!baseItem || !currentItem || Object.keys(proposal.patch).some(key => !same(baseItem[key as keyof ProgramItemPatch], currentItem[key as keyof ProgramItemPatch]))) return { ok: false, reason: 'conflict' };
  const patch = publicPatch(proposal.patch, true), source = publicSource(current.source);
  const items = current.items.map(item => publicItem(item, true));
  if (!patch || !source || items.some(item => !item)) return { ok: false, reason: 'invalid' };
  const ready = items as ProgramPublicItem[];
  Object.assign(ready.find(row => row.id === proposal.itemId)!, patch);
  if (!ready.every(validateProgramPublicItem)) return { ok: false, reason: 'invalid' };
  return { ok: true, candidate: { flowId: flow.id, number: current.number + 1, parentVersionId: current.id,
    title: current.title, summary: current.summary, items: ready, source } };
}

export function reviewProgramProposal(data: ProgramData, input: ReviewProgramProposalInput, now: string): ProgramTransition<string> {
  if (!actorExists(data, input.actorId)) return programFailure(data, 'forbidden');
  if (!['hold', 'reject', 'accept'].includes(input.decision) || !programString(input.note ?? '', 10000) || !stamp(now)) return programFailure(data, 'invalid');
  const proposal = data.public.proposals.find(row => row.id === input.proposalId);
  const flow = proposal && data.public.flows.find(row => row.id === proposal.flowId);
  if (!proposal || !flow) return programFailure(data, 'missing');
  if (flow.ownerId !== input.actorId) return programFailure(data, 'forbidden');
  if (input.expectedProposalToken !== undefined && input.expectedProposalToken !== programProposalReviewToken(data, proposal.id)) return programFailure(data, 'conflict');
  if (proposal.status === 'accepted') return input.decision === 'accept'
    ? { ok: true, data, changed: false, result: proposal.resultVersionId! } : programFailure(data, 'conflict');
  if (proposal.status === 'rejected') return input.decision === 'reject'
    ? { ok: true, data, changed: false, result: proposal.id } : programFailure(data, 'conflict');
  if (flow.archived) return programFailure(data, 'missing');
  if (flow.currentVersionId !== input.expectedVersionId) return programFailure(data, 'conflict');
  const note = input.note ?? '';
  if (input.decision === 'hold' && proposal.status === 'held' && proposal.reviewNote === note) return { ok: true, data, changed: false, result: proposal.id };
  const next = programClone(data), target = next.public.proposals.find(row => row.id === proposal.id)!;
  let resultId = proposal.id;
  if (input.decision === 'accept') {
    const prepared = prepareProgramProposalVersion(data, proposal.id);
    if (!prepared.ok) return programFailure(data, prepared.reason);
    if (data.public.versions.length >= PROGRAM_LIMITS.entries) return programFailure(data, 'limit');
    if (prepared.candidate.items.some(item => !canPublishProgramSchedule(item.schedule))) return programFailure(data, 'unresolved');
    const versionId = programId('version');
    next.public.versions.push({ id: versionId, ...prepared.candidate, createdBy: input.actorId, createdAt: now });
    next.public.flows.find(row => row.id === flow.id)!.currentVersionId = versionId;
    target.status = 'accepted'; target.resultVersionId = versionId; resultId = versionId;
  } else target.status = input.decision === 'hold' ? 'held' : 'rejected';
  target.reviewNote = note; target.reviewedBy = input.actorId; target.updatedAt = now;
  return result(data, next, resultId);
}

export function archiveProgramPublicFlow(data: ProgramData, actorId: string, flowId: string): ProgramTransition<string> {
  if (!actorExists(data, actorId)) return programFailure(data, 'forbidden');
  const flow = data.public.flows.find(row => row.id === flowId);
  if (!flow) return programFailure(data, 'missing');
  if (flow.ownerId !== actorId) return programFailure(data, 'forbidden');
  if (flow.archived) return { ok: true, data, changed: false, result: flowId };
  const next = programClone(data);
  next.public.flows.find(row => row.id === flowId)!.archived = true;
  return result(data, next, flowId);
}
export const deleteProgramPublicFlow = archiveProgramPublicFlow;
