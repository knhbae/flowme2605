import type { ProgramDestination } from './ui-contract';
import { isProgramExecutionTargetKey } from './recurrence-order-contract';
import { isProgramOutputRecurrencePresentation } from './public-output-recurrence';
import { readProgramPublicOutputReturn } from './public-output-return';

const views = new Set(['space', 'discover', 'community', 'activity', 'flow', 'legacy', 'creator']);
const safeId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 500 && !/[\u0000-\u001f\u007f]/.test(value);
const fields = { version: 'versionId', item: 'itemId', reply: 'replyId', action: 'action', actor: 'returnActorId', execution: 'executionKey', output: 'publicOutputReturn' } as const;
/** State is inside the fragment, never the exact-query PoC entry gate. */
export function parseProgramLocation(hash: string): ProgramDestination {
  const fallback: ProgramDestination = { view: 'space' };
  if (typeof hash !== 'string' || hash.length > 35000) return fallback;
  const match = /^#flowme\/(space|discover|community|activity|flow|legacy|creator)(?:\/([^/#?]+))?(?:\?([^#]+))?$/.exec(hash);
  if (!match) return fallback;
  try {
    const value: ProgramDestination = { view: match[1] as ProgramDestination['view'] };
    if (match[2]) { value.id = decodeURIComponent(match[2]); if (!safeId(value.id)) return fallback; }
    const params = new URLSearchParams(match[3]);
    for (const [key, raw] of params) {
      if (!Object.hasOwn(fields, key) || params.getAll(key).length !== 1 || !(key === 'output' ? readProgramPublicOutputReturn(raw) : key === 'execution' ? isProgramExecutionTargetKey(raw) : safeId(raw))) return fallback;
      if (key === 'output') { if (value.view !== 'flow' || !value.id) return fallback; value.publicOutputReturn = raw; }
      if (key === 'actor' || key === 'execution') { if (value.view !== 'space' || !value.id) return fallback; value[fields[key]] = raw; }
      if (key === 'action') { if (value.view !== 'space' || !value.id || raw !== 'publish') return fallback; value.action = raw; }
      if (key === 'reply') { if (value.view !== 'community' || !value.id) return fallback; value.replyId = raw; }
      if (key === 'version' || key === 'item') { if (value.view !== 'flow' || !value.id) return fallback; value[fields[key]] = raw; }
    }
    if (value.itemId && !value.versionId) return fallback;
    if (value.publicOutputReturn) { const target = readProgramPublicOutputReturn(value.publicOutputReturn)!; if (target.flowId !== value.id || target.versionId !== value.versionId || target.itemId !== value.itemId) return fallback; }
    if (!!value.returnActorId !== !!value.executionKey || value.executionKey && value.action) return fallback;
    return value;
  } catch { return fallback; }
}
export function programLocation(value: ProgramDestination): string {
  if (!views.has(value.view) || value.id !== undefined && !safeId(value.id)) return '#flowme/space';
  if (value.publicOutputReturn !== undefined) { const target = readProgramPublicOutputReturn(value.publicOutputReturn); if (!target || value.view !== 'flow' || target.flowId !== value.id || target.versionId !== value.versionId || target.itemId !== value.itemId) return '#flowme/space'; }
  if (value.returnActorId !== undefined || value.executionKey !== undefined) {
    if (value.view !== 'space' || !value.id || value.action || !safeId(value.returnActorId) || !isProgramExecutionTargetKey(value.executionKey)) return '#flowme/space';
  }
  const base = `#flowme/${value.view}${value.id ? `/${encodeURIComponent(value.id)}` : ''}`;
  const params = new URLSearchParams();
  if (value.view === 'flow' && value.id) {
    if (safeId(value.versionId)) params.set('version', value.versionId);
    if (value.versionId && safeId(value.itemId)) params.set('item', value.itemId);
    if (value.publicOutputReturn) params.set('output', value.publicOutputReturn);
  }
  if (value.view === 'community' && value.id && safeId(value.replyId)) params.set('reply', value.replyId);
  if (value.view === 'space' && value.id && value.action === 'publish') params.set('action', value.action);
  if (value.returnActorId && value.executionKey) { params.set('actor', value.returnActorId); params.set('execution', value.executionKey); }
  return `${base}${params.size ? `?${params}` : ''}`;
}

export type ProgramNavigationCheckpoint = { schema: 'flowme-navigation/1'; actorId: string; location: string;
  scroll: number; focus: string | null; space?: { period: string; date: string; folderId: string; query: string; selected: string; showArchived: boolean; recurrence?: ProgramRecurrencePresentation };
  writing?: Record<string, { start: number; end: number; scrollTop: number }>;
  discovery?: ProgramDiscoveryPresentation; community?: ProgramCommunityPresentation };
export type ProgramCommunityPresentation = { version: 1; query: string; kind: 'all' | 'question' | 'experience' | 'knowledge' };
export const emptyProgramCommunityPresentation = (): ProgramCommunityPresentation => ({ version: 1, query: '', kind: 'all' });
export function readProgramCommunityPresentation(value: unknown): ProgramCommunityPresentation | null {
  if (!plain(value) || !exact(value, ['version', 'query', 'kind']) || value.version !== 1
    || typeof value.query !== 'string' || value.query.length > 3000 || !['all','question','experience','knowledge'].includes(value.kind as string)) return null;
  return { version: 1, query: value.query, kind: value.kind as ProgramCommunityPresentation['kind'] };
}
export type ProgramRecurrenceDocumentPresentation = { page: number; includeHeld: boolean; includeExcluded: boolean };
export type ProgramRecurrencePresentation = { pages: { today: number; all: number }; includeHeld: boolean; includeExcluded: boolean;
  documents: Record<string, ProgramRecurrenceDocumentPresentation> };
export const emptyProgramRecurrencePresentation = (): ProgramRecurrencePresentation => ({ pages: { today: 0, all: 0 }, includeHeld: false, includeExcluded: false, documents: {} });
/** Local presentation only. URL input, source text and output drafts are intentionally absent. */
export type ProgramDiscoveryDetailPresentation = { selectedItemIds: string[]; anchor: string; format: 'txt' | 'csv' | 'ics';
  recurrenceWindow?: import('./public-output-recurrence').ProgramOutputRecurrenceWindow; recurrenceStarts?: Record<string, string> };
export type ProgramDiscoveryPresentation = {
  query: string; category: string; situation: string; lastFlowId: string | null; scrollTop: number;
  versionByFlow: Record<string, string>;
  details: Record<string, ProgramDiscoveryDetailPresentation>;
};
export type ProgramDiscoveryNavigation = {
  actorId: string;
  capture: () => Pick<ProgramNavigationCheckpoint, 'discovery'>;
  restore: (checkpoint: ProgramNavigationCheckpoint) => void;
};
export type ProgramSpaceNavigation = {
  actorId: string;
  capture: () => Pick<ProgramNavigationCheckpoint, 'space' | 'writing'>;
  restore: (checkpoint: ProgramNavigationCheckpoint) => void;
};
/** An explicit document route wins over a stale presentation from the previous document. */
export function programNavigationMatchesDocument(location: string, selected: string | undefined): boolean {
  const destination = parseProgramLocation(location);
  return destination.view !== 'space' || !destination.id || selected === destination.id;
}
const plain = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const bounded = (value: unknown, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
const exact = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
function anchorDate(value: unknown): value is string {
  if (value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
/** Query windows and filters only: never accept occurrence execution or draft text. */
export function readProgramRecurrencePresentation(value: unknown): ProgramRecurrencePresentation | null {
  try {
    const page = (part: unknown) => Number.isInteger(part) && bounded(part, 128);
    if (!plain(value) || !exact(value, ['pages', 'includeHeld', 'includeExcluded', 'documents'])
      || !plain(value.pages) || !exact(value.pages, ['today', 'all']) || !page(value.pages.today) || !page(value.pages.all)
      || typeof value.includeHeld !== 'boolean' || typeof value.includeExcluded !== 'boolean'
      || !plain(value.documents) || Object.keys(value.documents).length > 2000) return null;
    const documents = Object.fromEntries(Object.entries(value.documents).map(([id, document]) => {
      if (!safeId(id) || !plain(document) || !exact(document, ['page', 'includeHeld', 'includeExcluded']) || !page(document.page)
        || typeof document.includeHeld !== 'boolean' || typeof document.includeExcluded !== 'boolean') throw Error('invalid');
      return [id, { page: document.page as number, includeHeld: document.includeHeld, includeExcluded: document.includeExcluded }];
    }));
    return { pages: { today: value.pages.today as number, all: value.pages.all as number }, includeHeld: value.includeHeld, includeExcluded: value.includeExcluded, documents };
  } catch { return null; }
}
/** Fail closed on extra/raw fields and invalid selections, then return detached whitelisted objects. */
export function readProgramDiscoveryPresentation(value: unknown): ProgramDiscoveryPresentation | null {
  try {
    if (!plain(value) || !exact(value, ['query', 'category', 'situation', 'lastFlowId', 'scrollTop', 'versionByFlow', 'details'])
      || ![value.query, value.category, value.situation].every(part => typeof part === 'string' && part.length <= 3000)
      || value.lastFlowId !== null && !safeId(value.lastFlowId) || !bounded(value.scrollTop, 100000000)
      || !plain(value.versionByFlow) || Object.keys(value.versionByFlow).length > 2000
      || !Object.entries(value.versionByFlow).every(([id, version]) => safeId(id) && safeId(version))
      || !plain(value.details) || Object.keys(value.details).length > 2000) return null;
    const details: ProgramDiscoveryPresentation['details'] = Object.fromEntries(Object.entries(value.details).map(([id, detail]) => {
      if (!safeId(id) || !plain(detail) || !exact(detail, ['selectedItemIds', 'anchor', 'format',
        ...(Object.hasOwn(detail, 'recurrenceWindow') ? ['recurrenceWindow'] : []), ...(Object.hasOwn(detail, 'recurrenceStarts') ? ['recurrenceStarts'] : [])])
        || !Array.isArray(detail.selectedItemIds) || detail.selectedItemIds.length > 1200
        || !detail.selectedItemIds.every(safeId) || new Set(detail.selectedItemIds).size !== detail.selectedItemIds.length
        || !anchorDate(detail.anchor) || !['txt', 'csv', 'ics'].includes(detail.format as string)) throw new Error('invalid-presentation');
      if (detail.recurrenceWindow !== undefined && !isProgramOutputRecurrencePresentation(detail.recurrenceWindow)) throw new Error('invalid-recurrence-window');
      if (detail.recurrenceStarts !== undefined && (!plain(detail.recurrenceStarts) || Object.keys(detail.recurrenceStarts).length > 1200
        || Object.getOwnPropertySymbols(detail.recurrenceStarts).length > 0
        || !Object.entries(detail.recurrenceStarts).every(([key, date]) => safeId(key) && date !== '' && anchorDate(date)))) throw new Error('invalid-recurrence-start');
      return [id, { selectedItemIds: [...detail.selectedItemIds], anchor: detail.anchor, format: detail.format as 'txt' | 'csv' | 'ics',
        ...(detail.recurrenceWindow ? { recurrenceWindow: { ...detail.recurrenceWindow } } : {}),
        ...(detail.recurrenceStarts ? { recurrenceStarts: Object.fromEntries(Object.entries(detail.recurrenceStarts).map(([key, date]) => [key, date as string])) } : {}) }];
    }));
    return { query: value.query as string, category: value.category as string, situation: value.situation as string,
      lastFlowId: value.lastFlowId as string | null, scrollTop: value.scrollTop as number,
      versionByFlow: Object.fromEntries(Object.entries(value.versionByFlow)) as Record<string, string>, details };
  } catch { return null; }
}
/** Browser history owns presentation only, not business data or an extra source of truth. */
export function readProgramNavigationCheckpoint(value: unknown, actorId: string, location: string): ProgramNavigationCheckpoint | null {
  try {
    if (!plain(value) || value.schema !== 'flowme-navigation/1' || value.actorId !== actorId || value.location !== location
      || !bounded(value.scroll, 100000000) || value.focus !== null && !safeId(value.focus)
      || Object.keys(value).some(key => !['schema', 'actorId', 'location', 'scroll', 'focus', 'space', 'writing', 'discovery', 'community'].includes(key))) return null;
    if (value.space !== undefined) {
      const s = value.space;
      if (!plain(s) || !exact(s, ['period', 'date', 'folderId', 'query', 'selected', 'showArchived', ...(s.recurrence === undefined ? [] : ['recurrence'])]) || !['documents', 'today', 'week', 'month', 'all', 'undated'].includes(s.period as string)
        || typeof s.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.date)
        || typeof s.folderId !== 'string' || s.folderId.length > 500 || typeof s.selected !== 'string' || s.selected.length > 500
        || typeof s.query !== 'string' || s.query.length > 3000 || typeof s.showArchived !== 'boolean') return null;
      if (!programNavigationMatchesDocument(location, s.selected)) return null;
      if (s.recurrence !== undefined && !readProgramRecurrencePresentation(s.recurrence)) return null;
    }
    if (value.writing !== undefined) {
      if (!plain(value.writing) || Object.keys(value.writing).length > 2000) return null;
      for (const [id, position] of Object.entries(value.writing)) if (!safeId(id) || !plain(position) || !exact(position, ['start', 'end', 'scrollTop']) || !bounded(position.start, 30000000)
        || !bounded(position.end, 30000000) || !bounded(position.scrollTop, 100000000)) return null;
    }
    const discovery = value.discovery === undefined ? undefined : readProgramDiscoveryPresentation(value.discovery);
    if (discovery === null) return null;
    const community = value.community === undefined ? undefined : readProgramCommunityPresentation(value.community);
    if (community === null) return null;
    return { schema: 'flowme-navigation/1', actorId, location, scroll: value.scroll as number, focus: value.focus as string | null,
      ...(value.space === undefined ? {} : { space: { ...value.space, ...((value.space as Record<string, unknown>).recurrence === undefined ? {} : { recurrence: readProgramRecurrencePresentation((value.space as Record<string, unknown>).recurrence)! }) } as NonNullable<ProgramNavigationCheckpoint['space']> }),
      ...(value.writing === undefined ? {} : { writing: Object.fromEntries(Object.entries(value.writing as Record<string, Record<string, number>>).map(([id, position]) => [id, { ...position }])) as NonNullable<ProgramNavigationCheckpoint['writing']> }),
      ...(discovery === undefined ? {} : { discovery }), ...(community === undefined ? {} : { community }) };
  } catch { return null; }
}

/** An explicit open action opens the document. Back/reload still use the original period checkpoint. */
export function programCheckpointForOpen(value: unknown, actorId: string, destination: ProgramDestination): ProgramNavigationCheckpoint | null {
  const checkpoint = readProgramNavigationCheckpoint(value, actorId, programLocation(destination));
  if (!checkpoint || destination.view !== 'space' || !destination.id || !checkpoint.space) return checkpoint;
  return { ...checkpoint, space: { ...checkpoint.space, period: 'documents', selected: destination.id } };
}

/** Explicit app navigation is not browser Back. Restore the destination's viewport
 * without replaying its old snapshot of another surface's newer choices. */
export function programCheckpointForNavigation(value: unknown, liveValue: unknown, actorId: string, destination: ProgramDestination): ProgramNavigationCheckpoint | null {
  const location = programLocation(destination);
  const target = readProgramNavigationCheckpoint(value, actorId, location);
  const liveLocation = plain(liveValue) && typeof liveValue.location === 'string' ? liveValue.location : '';
  const live = liveLocation && programLocation(parseProgramLocation(liveLocation)) === liveLocation
    ? readProgramNavigationCheckpoint(liveValue, actorId, liveLocation) : null;
  if (!live) return programCheckpointForOpen(target, actorId, destination);
  const space = destination.view === 'space' ? target?.space ?? live.space : live.space ?? target?.space;
  const writing = target?.writing || live.writing ? { ...target?.writing, ...live.writing } : undefined;
  const checkpoint: ProgramNavigationCheckpoint = {
    ...(target ?? { schema: 'flowme-navigation/1', actorId, location, scroll: 0, focus: null }),
    ...(space ? { space: destination.view === 'space' && destination.id
      ? { ...space, period: 'documents', selected: destination.id } : space } : {}),
    ...(writing ? { writing } : {}),
    ...(live.discovery ? { discovery: live.discovery } : {}),
    ...(live.community ? { community: live.community } : {}),
  };
  return readProgramNavigationCheckpoint(checkpoint, actorId, location);
}
