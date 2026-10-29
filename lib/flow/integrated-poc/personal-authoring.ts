import { textWorkspaceModel as M, type TextTask, type TextWorkspaceState } from './text-workspace';

export const PERSONAL_AUTHORING_LIMITS = Object.freeze({ defaultRounds: 4, maxRounds: 12, previewRounds: 3 });

export type PersonalTaskDate =
  | { kind: 'relative'; offsetDays: number }
  | { kind: 'fixed'; date: string }
  | { kind: 'undated' };
/** Configuration only. Native tasks own text, partial progress and dated records. */
export type PersonalTaskReference = { taskId: string; parentTaskId: string | null; date: PersonalTaskDate };
/** Copy-time policy: inherit preserves a missing date property; explicit check dates stay native execution exceptions on later anchor changes. */
export type PersonalSubcheckDate = PersonalTaskDate | { kind: 'inherit' };
export type PersonalSubcheckSnapshot = {
  id: string; parentId: string | null; title: string; memo: string;
  time: string | null; scopeId: string; date: PersonalSubcheckDate;
};
export type PersonalActionSnapshot = {
  id: string; parentId: string | null; kind: 'action'; taskId: string;
  title: string; memo: string; time: string | null; scopeId: string; subchecks: PersonalSubcheckSnapshot[];
};
export type PersonalFlowNode = PersonalActionSnapshot
  | { id: string; parentId: string | null; kind: 'step' | 'description'; text: string };
/** Immutable content/configuration snapshot. References share live native progress only for connection, not fresh execution. */
export type PersonalFlowVersion = { id: string; taskRefs: PersonalTaskReference[]; nodes: PersonalFlowNode[] };
export type PersonalFlowOwner = { flowId: string; currentVersionId: string; versions: PersonalFlowVersion[] };
export type PersonalRepeatEnd = { kind: 'count'; count: number } | { kind: 'until'; date: string };
/** Weekdays use UTC calendar days: Sunday=0, Monday=1, ..., Saturday=6. */
export type PersonalRepeatPattern = { kind: 'daily' } | { kind: 'weekdays'; weekdays: number[] };
export type PersonalRepeatRule = PersonalRepeatPattern & { startDate: string; end: PersonalRepeatEnd };
/** Omitted end is an input default of four; persisted rules must have an explicit end. */
export type PersonalRepeatInput = PersonalRepeatPattern & { startDate: string; end?: PersonalRepeatEnd };
export type PersonalRuleVersion = { id: string; rule: PersonalRepeatRule };
export type PersonalRepeatSource =
  | { kind: 'flow'; flowId: string; versionId: string }
  | { kind: 'task'; taskId: string; version: PersonalFlowVersion };
export type PersonalMaterializedRound = {
  id: string; index: number; anchorDate: string; ruleVersionId: string;
  executionDocumentId: string;
  /** Source canonical task ID -> fresh native execution task ID. No progress is duplicated here. */
  taskIds: Record<string, string>;
};
export type PersonalSeriesOwner = {
  id: string; source: PersonalRepeatSource; currentRuleVersionId: string;
  ruleVersions: PersonalRuleVersion[]; stopped: boolean; rounds: PersonalMaterializedRound[];
};
/** Independent start, not a synthetic one-round series. Content stays in the referenced frozen Flow version. */
export type PersonalStandaloneExecution = {
  id: string; flowId: string; versionId: string; anchorDate: string;
  executionDocumentId: string; taskIds: Record<string, string>;
};
/** Optional private-space extension: absence is handled by its caller, never auto-created here. */
export type PersonalAuthoringV1 = {
  version: 1; flows: PersonalFlowOwner[]; series: PersonalSeriesOwner[];
  /** Missing is exactly empty for the initial local shape; explicit undefined/null is invalid JSON/model input. */
  executions?: PersonalStandaloneExecution[];
};
export type PersonalAuthoringResult<T> = { ok: true; value: T } | { ok: false; reason:
  'invalid-date' | 'date-out-of-range' | 'invalid-version' | 'invalid-rule' | 'invalid-rounds' | 'round-limit' | 'empty-range'
  | 'invalid-execution' };
export type PersonalNativeTransition = { before: TextWorkspaceState; next: TextWorkspaceState };
export type PersonalExecutionAnchorPlan = {
  execution: PersonalStandaloneExecution;
  changes: { taskId: string; beforeDate: string | null; afterDate: string }[];
};
export type PersonalRoundAnchor = Pick<PersonalMaterializedRound, 'index' | 'anchorDate'>;
export type PersonalRoundOptions = {
  rule: PersonalRepeatInput;
  materialized?: readonly PersonalRoundAnchor[];
  targetKind?: 'flow' | 'task';
};
export type PersonalCalculatedRound = {
  index: number; anchorDate: string;
  items: { taskId: string; parentTaskId: string | null; date: string | null }[];
  /** Detached frozen-version content. The native writer remaps placement/subcheck IDs and initializes progress to zero. */
  nodes: PersonalFlowNode[];
};
export type PersonalRoundCalculation = { rule: PersonalRepeatRule; totalRounds: number; rounds: PersonalCalculatedRound[] };

const fail = (reason: Extract<PersonalAuthoringResult<never>, { ok: false }>['reason']) => ({ ok: false as const, reason });
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
  && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const keys = (v: Record<string, unknown>, expected: string) => Object.keys(v).sort().join(',') === expected.split(',').sort().join(',');
const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 160
  && v.trim() === v && !/[\u0000-\u001f\u007f]/.test(v) && !['__proto__', 'constructor', 'prototype'].includes(v);
/** Reject lossy/non-JSON inputs without invoking getters or pulling transport/schema code into this pure module. */
function json(value: unknown): boolean {
  const seen = new Set<object>();
  function visit(v: unknown, depth: number): boolean {
    if (depth > 120) return false;
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return true;
    if (typeof v === 'number') return Number.isFinite(v) && !Object.is(v, -0);
    if (typeof v !== 'object' || seen.has(v) || !Array.isArray(v) && !object(v) || Object.getOwnPropertySymbols(v).length) return false;
    seen.add(v);
    try {
      const descriptors = Object.getOwnPropertyDescriptors(v), names = Object.keys(descriptors).filter(k => !Array.isArray(v) || k !== 'length');
      if (Array.isArray(v) && (names.length !== v.length || names.some((k, i) => k !== String(i)))) return false;
      return names.every(k => !['__proto__', 'constructor', 'prototype'].includes(k) && descriptors[k].enumerable
        && 'value' in descriptors[k] && visit(descriptors[k].value, depth + 1));
    } finally { seen.delete(v); }
  }
  try { return visit(value, 0); } catch { return false; }
}
const dayMs = 86_400_000;
function dateMs(v: unknown): number | null {
  if (typeof v !== 'string' || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const n = Date.parse(`${v}T00:00:00.000Z`);
  return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === v ? n : null;
}
const validDate = (v: unknown): v is string => dateMs(v) !== null;
const text = (v: unknown): v is string => typeof v === 'string' && v.length <= 100_000 && !v.includes('\r');
const title = (v: unknown): v is string => text(v) && !!v.trim() && !v.includes('\n');
const time = (v: unknown): v is string | null => v === null || typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
function shiftedDate(value: string, offset: number): string | null {
  const base = dateMs(value);
  if (base === null || !Number.isSafeInteger(offset) || Math.abs(offset) > 3_652_058) return null;
  const n = base + offset * dayMs;
  if (n < -62_135_596_800_000 || n > 253_402_214_400_000) return null; // 0001-01-01 .. 9999-12-31
  return new Date(n).toISOString().slice(0, 10);
}
function taskDate(v: unknown): v is PersonalTaskDate {
  return object(v) && (v.kind === 'undated' && keys(v, 'kind')
    || v.kind === 'fixed' && keys(v, 'kind,date') && validDate(v.date)
    || v.kind === 'relative' && keys(v, 'kind,offsetDays') && Number.isSafeInteger(v.offsetDays)
      && Math.abs(v.offsetDays as number) <= 3_652_058 && !Object.is(v.offsetDays, -0));
}

/** Calendar arithmetic only; never reads time zones, the current clock, records or progress. */
export function resolvePersonalTaskDate(date: PersonalTaskDate, anchorDate: string): PersonalAuthoringResult<string | null> {
  if (!json(date) || !taskDate(date) || !validDate(anchorDate)) return fail('invalid-date');
  if (date.kind === 'undated') return { ok: true, value: null };
  if (date.kind === 'fixed') return { ok: true, value: date.date };
  const value = shiftedDate(anchorDate, date.offsetDays);
  return value === null ? fail('date-out-of-range') : { ok: true, value };
}

function snapshotNodes(value: unknown, refs: Map<string, PersonalTaskReference>): value is PersonalFlowNode[] {
  if (!Array.isArray(value) || !value.length) return false;
  const identities = new Set<string>(), actions: string[] = [], stack: PersonalFlowNode[] = [];
  for (const node of value) {
    if (!object(node) || !id(node.id) || identities.has(node.id) || node.parentId !== null && !id(node.parentId)) return false;
    identities.add(node.id);
    if (node.parentId === null) stack.length = 0;
    else {
      const at = stack.findIndex(n => n.id === node.parentId);
      if (at < 0) return false;
      stack.length = at + 1;
    }
    if (node.kind === 'action') {
      if (!keys(node, 'id,parentId,kind,taskId,title,memo,time,scopeId,subchecks') || !id(node.taskId)
        || !refs.has(node.taskId) || !title(node.title) || !text(node.memo) || !time(node.time)
        || !id(node.scopeId) || !Array.isArray(node.subchecks)) return false;
      const parent = [...stack].reverse().find(n => n.kind === 'action') as PersonalActionSnapshot | undefined;
      if (refs.get(node.taskId)!.parentTaskId !== (parent?.taskId ?? null)) return false;
      const checkStack: string[] = [];
      for (const check of node.subchecks) {
        if (!object(check) || !keys(check, 'id,parentId,title,memo,time,scopeId,date') || !id(check.id) || identities.has(check.id)
          || check.parentId !== null && !id(check.parentId) || !title(check.title) || !text(check.memo)
          || !time(check.time) || !id(check.scopeId)
          || !(taskDate(check.date) || object(check.date) && keys(check.date, 'kind') && check.date.kind === 'inherit')) return false;
        identities.add(check.id);
        if (check.parentId === null) checkStack.length = 0;
        else { const at = checkStack.indexOf(check.parentId); if (at < 0) return false; checkStack.length = at + 1; }
        checkStack.push(check.id);
      }
      actions.push(node.taskId);
    } else if (!['step', 'description'].includes(node.kind as string) || !keys(node, 'id,parentId,kind,text')
      || !text(node.text) || node.kind === 'step' && !node.text.trim()) return false;
    stack.push(node as PersonalFlowNode);
  }
  const order = [...refs.keys()];
  return actions.length === refs.size && actions.every((taskId, index) => taskId === order[index]);
}
function versionShape(v: unknown): v is PersonalFlowVersion {
  if (!object(v) || !keys(v, 'id,taskRefs,nodes') || !id(v.id) || !Array.isArray(v.taskRefs) || !v.taskRefs.length) return false;
  const refs = new Map<string, PersonalTaskReference>();
  for (const ref of v.taskRefs) {
    if (!object(ref) || !keys(ref, 'taskId,parentTaskId,date') || !id(ref.taskId)
      || ref.parentTaskId !== null && !id(ref.parentTaskId) || !taskDate(ref.date) || refs.has(ref.taskId)) return false;
    refs.set(ref.taskId, ref as PersonalTaskReference);
  }
  // Parents precede descendants, and each subtree is contiguous. This also rejects cycles.
  const stack: string[] = [];
  for (const ref of refs.values()) {
    if (ref.parentTaskId === null) stack.length = 0;
    else {
      const at = stack.indexOf(ref.parentTaskId);
      if (at < 0) return false;
      stack.length = at + 1;
    }
    stack.push(ref.taskId);
  }
  return snapshotNodes(v.nodes, refs);
}
function normalizedRule(v: unknown, defaults: boolean): PersonalRepeatRule | null {
  if (!object(v) || !validDate(v.startDate) || !['daily', 'weekdays'].includes(v.kind as string)) return null;
  const hasEnd = Object.hasOwn(v, 'end');
  if (!keys(v, `kind,startDate${v.kind === 'weekdays' ? ',weekdays' : ''}${hasEnd ? ',end' : ''}`) || !hasEnd && !defaults) return null;
  if (v.kind === 'weekdays' && (!Array.isArray(v.weekdays) || !v.weekdays.length || v.weekdays.length > 7
    || v.weekdays.some(d => !Number.isInteger(d) || d < 0 || d > 6) || new Set(v.weekdays).size !== v.weekdays.length)) return null;
  const end = hasEnd ? v.end : { kind: 'count', count: PERSONAL_AUTHORING_LIMITS.defaultRounds };
  if (!object(end) || !(end.kind === 'count' && keys(end, 'kind,count') && Number.isInteger(end.count)
    && (end.count as number) >= 1 && (end.count as number) <= PERSONAL_AUTHORING_LIMITS.maxRounds
    || end.kind === 'until' && keys(end, 'kind,date') && validDate(end.date) && end.date >= v.startDate)) return null;
  return { kind: v.kind, startDate: v.startDate, ...(v.kind === 'weekdays' ? { weekdays: [...v.weekdays as number[]] } : {}),
    end: { ...end } } as PersonalRepeatRule;
}
function ruleDates(rule: PersonalRepeatRule): PersonalAuthoringResult<string[]> {
  const dates: string[] = [];
  let date: string | null = rule.startDate;
  while (date && (rule.end.kind === 'count' ? dates.length < rule.end.count : date <= rule.end.date)) {
    if (rule.kind === 'daily' || rule.weekdays.includes(new Date(dateMs(date)!).getUTCDay())) dates.push(date);
    if (dates.length > PERSONAL_AUTHORING_LIMITS.maxRounds) return fail('round-limit');
    date = shiftedDate(date, 1);
  }
  if (!dates.length) return fail('empty-range');
  if (rule.end.kind === 'count' && dates.length !== rule.end.count) return fail('date-out-of-range');
  return { ok: true, value: dates };
}
function validAnchors(rounds: readonly PersonalRoundAnchor[]): boolean {
  if (!Array.isArray(rounds) || rounds.length > PERSONAL_AUTHORING_LIMITS.maxRounds) return false;
  return rounds.every((r, i) => object(r) && Number.isInteger(r.index) && r.index === i + 1 && validDate(r.anchorDate)
    && (i === 0 || r.anchorDate > rounds[i - 1].anchorDate));
}
function projectedItems(version: PersonalFlowVersion, anchor: string, index: number, kind: 'flow' | 'task'):
  PersonalAuthoringResult<PersonalCalculatedRound['items']> {
  const items: PersonalCalculatedRound['items'] = [], excluded = new Set<string>();
  for (const ref of version.taskRefs) {
    // Exclude a first-round-only parent's subtree as well; never emit orphan children.
    if (kind === 'flow' && index > 1 && (ref.date.kind === 'fixed' || ref.parentTaskId !== null && excluded.has(ref.parentTaskId))) {
      excluded.add(ref.taskId); continue;
    }
    const date = kind === 'task' ? { ok: true as const, value: anchor } : resolvePersonalTaskDate(ref.date, anchor);
    if (!date.ok) return date;
    items.push({ taskId: ref.taskId, parentTaskId: ref.parentTaskId, date: date.value });
  }
  return { ok: true, value: items };
}

/** Only pending rounds are returned. Materialized rounds are retained, deduplicated by anchor across rule versions. */
export function calculatePersonalRounds(version: PersonalFlowVersion, options: PersonalRoundOptions): PersonalAuthoringResult<PersonalRoundCalculation> {
  if (!json(version) || !versionShape(version)) return fail('invalid-version');
  if (!json(options) || !object(options) || Object.keys(options).some(k => !['rule', 'materialized', 'targetKind'].includes(k))) return fail('invalid-rule');
  const kind = options.targetKind ?? 'flow';
  if (!['flow', 'task'].includes(kind) || kind === 'task' && version.taskRefs.length !== 1) return fail('invalid-version');
  const rule = normalizedRule(options.rule, true);
  if (!rule) return fail('invalid-rule');
  const previous = options.materialized ?? [];
  if (!validAnchors(previous)) return fail('invalid-rounds');
  const dates = ruleDates(rule);
  if (!dates.ok) return dates;
  const existing = new Set(previous.map(r => r.anchorDate));
  const pending = dates.value.filter(date => !existing.has(date));
  if (previous.length + pending.length > PERSONAL_AUTHORING_LIMITS.maxRounds) return fail('round-limit');
  if (previous.length && pending.some(date => date <= previous[previous.length - 1].anchorDate)) return fail('invalid-rounds');
  const rounds: PersonalCalculatedRound[] = [];
  for (const [i, anchorDate] of pending.entries()) {
    const index = previous.length + i + 1, items = projectedItems(version, anchorDate, index, kind);
    if (!items.ok) return items;
    if (!items.value.length) return fail('empty-range');
    const selected = new Set(items.value.map(item => item.taskId)), excluded = new Set<string>();
    const nodes: PersonalFlowNode[] = [];
    for (const node of version.nodes) {
      if (node.parentId !== null && excluded.has(node.parentId) || node.kind === 'action' && !selected.has(node.taskId)) {
        excluded.add(node.id); continue;
      }
      if (node.kind === 'action') for (const check of node.subchecks) {
        if (check.date.kind !== 'inherit') {
          const date = resolvePersonalTaskDate(check.date, anchorDate);
          if (!date.ok) return date;
        }
      }
      nodes.push(JSON.parse(JSON.stringify(node)) as PersonalFlowNode);
    }
    rounds.push({ index, anchorDate, items: items.value, nodes });
  }
  return { ok: true, value: { rule, totalRounds: previous.length + rounds.length, rounds } };
}

/** A bounded virtual projection; no ID issuer, native writer or persistence port exists in this module. */
export function previewPersonalRounds(version: PersonalFlowVersion, options: PersonalRoundOptions): PersonalAuthoringResult<PersonalRoundCalculation> {
  const result = calculatePersonalRounds(version, options);
  return result.ok ? { ok: true, value: { ...result.value, rounds: result.value.rounds.slice(0, PERSONAL_AUTHORING_LIMITS.previewRounds) } } : result;
}

/** A document's own live repeats: rules on its tasks in document order, then the rule on the document's own Flow.
 * Another document's Flow never counts, even when it is the first Flow the owner has. */
export function documentRepeatSeries(owner: PersonalAuthoringV1 | undefined, documentId: string, taskIds: readonly string[]): PersonalSeriesOwner[] {
  const live = (owner?.series ?? []).filter(s => !s.stopped);
  return [
    ...taskIds.flatMap(id => live.filter(s => s.source.kind === 'task' && s.source.taskId === id)),
    ...live.filter(s => s.source.kind === 'flow' && s.source.flowId === documentId),
  ];
}

/** Whether a document already carries personal authoring of its own: it is a Flow, a Flow start, or has a live repeat. */
export function documentHasPersonalAuthoring(owner: PersonalAuthoringV1 | undefined, documentId: string, taskIds: readonly string[]): boolean {
  return !!owner && (owner.flows.some(f => f.flowId === documentId)
    || (owner.executions ?? []).some(e => e.executionDocumentId === documentId)
    || documentRepeatSeries(owner, documentId, taskIds).length > 0);
}

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
/** Short reading of a saved rule for the reopened summary, e.g. "토요일 · 2회". */
export function describePersonalRepeatRule(rule: PersonalRepeatRule): string {
  const days = rule.kind === 'daily' ? '매일' : `${[...rule.weekdays].sort((a, b) => a - b).map(day => WEEKDAY_NAMES[day]).join('·')}요일`;
  return `${days} · ${rule.end.kind === 'count' ? `${rule.end.count}회` : `${rule.end.date}까지`}`;
}

function nativeParent(task: TextTask, native: TextWorkspaceState): string | null {
  if (task.parentTaskId === null) return null;
  const binding = native.bindings.find(b => b.kind === 'task' && b.docId === task.docId && b.lineId === task.parentTaskId);
  return binding?.kind === 'task' ? binding.taskId : task.parentTaskId;
}
/** Full admission check at semantic save boundaries, never intended for each keystroke. */
export function validatePersonalAuthoring(value: unknown, native: TextWorkspaceState): value is PersonalAuthoringV1 {
  try {
    if (!json(value) || !object(value) || !keys(value, `version,flows,series${Object.hasOwn(value, 'executions') ? ',executions' : ''}`) || value.version !== 1
      || !Array.isArray(value.flows) || !Array.isArray(value.series)
      || Object.hasOwn(value, 'executions') && !Array.isArray(value.executions) || !M.validate(native)) return false;
    const tasks = new Map(M.tasks(native).map(t => [t.id, t])), scopes = new Set(M.scopes(native).map(s => s.id));
    const flows = new Map<string, PersonalFlowOwner>(), versions = new Set<string>();
    const admitsVersion = (v: unknown): v is PersonalFlowVersion => versionShape(v) && v.taskRefs.every(ref => tasks.has(ref.taskId))
      && v.nodes.every(n => n.kind !== 'action' || scopes.has(n.scopeId) && n.subchecks.every(c => scopes.has(c.scopeId)));
    for (const flow of value.flows) {
      if (!object(flow) || !keys(flow, 'flowId,currentVersionId,versions') || !id(flow.flowId) || flows.has(flow.flowId)
        || !id(flow.currentVersionId) || !Array.isArray(flow.versions) || !flow.versions.length) return false;
      const doc = native.flows.find(d => d.id === flow.flowId);
      if (!doc || doc.sourceVersion !== flow.currentVersionId) return false;
      for (const version of flow.versions) {
        if (!admitsVersion(version) || versions.has(version.id)) return false;
        versions.add(version.id);
      }
      const current = (flow.versions as PersonalFlowVersion[]).find(v => v.id === flow.currentVersionId);
      if (!current) return false;
      const selected = new Set(current.taskRefs.map(ref => ref.taskId));
      for (const ref of current.taskRefs) {
        const parent = nativeParent(tasks.get(ref.taskId)!, native);
        if (ref.parentTaskId !== (parent !== null && selected.has(parent) ? parent : null)) return false;
      }
      flows.set(flow.flowId, flow as PersonalFlowOwner);
    }
    const seriesIds = new Set<string>(), ruleIds = new Set<string>(), roundIds = new Set<string>(), executionDocs = new Set<string>(), executionTasks = new Set<string>();
    const activeFlows = new Set<string>(), activeTasks = new Set<string>(), activeFlowTasks = new Set<string>();
    for (const series of value.series) {
      if (!object(series) || !keys(series, 'id,source,currentRuleVersionId,ruleVersions,stopped,rounds') || !id(series.id)
        || seriesIds.has(series.id) || !id(series.currentRuleVersionId) || !Array.isArray(series.ruleVersions)
        || !series.ruleVersions.length || typeof series.stopped !== 'boolean' || !Array.isArray(series.rounds)
        || !validAnchors(series.rounds)) return false;
      seriesIds.add(series.id);
      const source = series.source;
      if (!object(source)) return false;
      let version: PersonalFlowVersion | undefined;
      if (source.kind === 'flow' && keys(source, 'kind,flowId,versionId') && id(source.flowId) && id(source.versionId)) {
        version = flows.get(source.flowId)?.versions.find(v => v.id === source.versionId);
        if (!series.stopped) {
          if (activeFlows.has(source.flowId)) return false;
          activeFlows.add(source.flowId);
        }
      } else if (source.kind === 'task' && keys(source, 'kind,taskId,version') && id(source.taskId) && admitsVersion(source.version)
        && source.version.taskRefs.length === 1 && source.version.taskRefs[0].taskId === source.taskId) {
        version = source.version;
        if (versions.has(version.id)) return false;
        versions.add(version.id);
        if (!series.stopped) {
          if (activeTasks.has(source.taskId) || [...tasks.values()].some(t => nativeParent(t, native) === source.taskId)) return false;
          activeTasks.add(source.taskId);
        }
      } else return false;
      if (!version) return false;
      if (!series.stopped && source.kind === 'flow') for (const ref of version.taskRefs) activeFlowTasks.add(ref.taskId);
      const rules = new Map<string, PersonalRepeatRule>();
      for (const revision of series.ruleVersions) {
        if (!object(revision) || !keys(revision, 'id,rule') || !id(revision.id) || ruleIds.has(revision.id)) return false;
        const rule = normalizedRule(revision.rule, false);
        if (!rule || !ruleDates(rule).ok) return false;
        rules.set(revision.id, rule); ruleIds.add(revision.id);
      }
      const currentRule = rules.get(series.currentRuleVersionId);
      if (!currentRule) return false;
      for (const round of series.rounds) {
        if (!object(round) || !keys(round, 'id,index,anchorDate,ruleVersionId,executionDocumentId,taskIds')
          || !id(round.id) || roundIds.has(round.id) || !id(round.ruleVersionId) || !id(round.executionDocumentId)
          || executionDocs.has(round.executionDocumentId) || !object(round.taskIds)) return false;
        const rule = rules.get(round.ruleVersionId), doc = M.getDocument(native, round.executionDocumentId);
        if (!rule || !doc || !ruleDates(rule).ok) return false;
        const scheduled = ruleDates(rule);
        if (!scheduled.ok || !scheduled.value.includes(round.anchorDate as string)) return false;
        const items = projectedItems(version, round.anchorDate as string, round.index as number, source.kind as 'flow' | 'task');
        if (!items.ok || !items.value.length || Object.keys(round.taskIds).length !== items.value.length) return false;
        const mapping = round.taskIds;
        for (const item of items.value) {
          const targetId = mapping[item.taskId];
          if (!id(targetId) || executionTasks.has(targetId) || version.taskRefs.some(ref => ref.taskId === targetId)) return false;
          const task = tasks.get(targetId), parent = item.parentTaskId === null ? null : mapping[item.parentTaskId];
          if (!task || task.docId !== doc.id || nativeParent(task, native) !== parent
            || version.taskRefs.some(ref => tasks.get(ref.taskId)!.docId === doc.id)) return false;
          executionTasks.add(targetId);
        }
        roundIds.add(round.id); executionDocs.add(doc.id);
      }
      if (!series.stopped && !calculatePersonalRounds(version, { rule: currentRule, materialized: series.rounds, targetKind: source.kind as 'flow' | 'task' }).ok) return false;
    }
    for (const execution of (value.executions ?? []) as unknown[]) {
      if (!object(execution) || !keys(execution, 'id,flowId,versionId,anchorDate,executionDocumentId,taskIds')
        || !id(execution.id) || roundIds.has(execution.id) || !id(execution.flowId) || !id(execution.versionId)
        || !validDate(execution.anchorDate) || !id(execution.executionDocumentId) || executionDocs.has(execution.executionDocumentId)
        || !object(execution.taskIds)) return false;
      const version = flows.get(execution.flowId)?.versions.find(v => v.id === execution.versionId);
      const doc = M.getDocument(native, execution.executionDocumentId), mapping = execution.taskIds;
      if (!version || !doc || doc.id === execution.flowId || Object.keys(mapping).length !== version.taskRefs.length) return false;
      for (const ref of version.taskRefs) {
        const targetId = mapping[ref.taskId];
        if (!id(targetId) || executionTasks.has(targetId) || version.taskRefs.some(r => r.taskId === targetId)) return false;
        const task = tasks.get(targetId), parent = ref.parentTaskId === null ? null : mapping[ref.parentTaskId];
        if (!task || task.docId !== doc.id || nativeParent(task, native) !== parent
          || version.taskRefs.some(r => tasks.get(r.taskId)!.docId === doc.id)) return false;
        executionTasks.add(targetId);
      }
      if ([...tasks.values()].filter(t => t.docId === doc.id).length !== version.taskRefs.length
        || native.bindings.some(b => b.docId === doc.id && b.kind === 'task')) return false;
      roundIds.add(execution.id); executionDocs.add(doc.id);
    }
    return ![...activeTasks].some(taskId => activeFlowTasks.has(taskId));
  } catch { return false; }
}

/** Computes a semantic date patch only. It neither allocates IDs nor edits native rows. */
export function planPersonalExecutionAnchorChange(owner: PersonalAuthoringV1, executionId: string, anchorDate: string,
  native: TextWorkspaceState): PersonalAuthoringResult<PersonalExecutionAnchorPlan> {
  if (!validDate(anchorDate)) return fail('invalid-date');
  if (!validatePersonalAuthoring(owner, native)) return fail('invalid-execution');
  const execution = owner.executions?.find(e => e.id === executionId);
  const version = execution && owner.flows.find(f => f.flowId === execution.flowId)?.versions.find(v => v.id === execution.versionId);
  if (!execution || !version) return fail('invalid-execution');
  const doc = M.getDocument(native, execution.executionDocumentId)!, analysis = M.parseDocument(doc, native);
  const tasks = new Map(M.tasks(native).map(t => [t.id, t])), items = new Map(analysis.items.map(t => [t.id, t]));
  const recorded = new Set(native.progressRecords.map(r => r.taskId));
  const started = (taskId: string) => recorded.has(taskId) || (M.currentProgress(native, taskId) ?? 100) > 0;
  const changes: PersonalExecutionAnchorPlan['changes'] = [];
  for (const ref of version.taskRefs) {
    if (ref.date.kind !== 'relative') continue;
    const taskId = execution.taskIds[ref.taskId], task = tasks.get(taskId)!;
    const previousDate = resolvePersonalTaskDate(ref.date, execution.anchorDate);
    if (!previousDate.ok) return previousDate;
    // Preserve started/history-backed items and explicit per-execution date exceptions.
    if (started(taskId) || task.date !== previousDate.value) continue;
    const inheritedStarted = analysis.items.some(item => {
      if (item.isCanonical || !started(item.id)) return false;
      let cursor = item;
      while (!cursor.isCanonical) {
        if (cursor.explicitDate || !cursor.parentItemId) return false;
        const parent = items.get(cursor.parentItemId); if (!parent) return false; cursor = parent;
      }
      return cursor.id === taskId;
    });
    if (inheritedStarted) continue;
    const date = resolvePersonalTaskDate(ref.date, anchorDate);
    if (!date.ok) return date;
    if (date.value !== task.date) changes.push({ taskId, beforeDate: task.date, afterDate: date.value! });
  }
  return { ok: true, value: { execution: { ...execution, anchorDate, taskIds: { ...execution.taskIds } }, changes } };
}

function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((part, i) => sameJson(part, b[i]));
  if (!object(a) || !object(b) || Array.isArray(b)) return false;
  const names = Object.keys(a);
  return names.length === Object.keys(b).length && names.every(k => Object.hasOwn(b, k) && sameJson(a[k], b[k]));
}
const allDocuments = (native: TextWorkspaceState) => [...native.documents, ...native.flows];
const nativeIds = (native: TextWorkspaceState) => new Set([
  ...native.folders.map(f => f.id), ...allDocuments(native).flatMap(d => [d.id, ...d.lines.map(l => l.id)]),
]);
function preservesNewExecutions(added: PersonalStandaloneExecution[], owner: PersonalAuthoringV1, context: PersonalNativeTransition): boolean {
  const { before, next } = context, oldIds = nativeIds(before), docIds = new Set(added.map(e => e.executionDocumentId));
  const tasks = new Map(M.tasks(next).map(t => [t.id, t])), addedLines = new Set<string>();
  for (const execution of added) {
    const doc = M.getDocument(next, execution.executionDocumentId)!;
    if (oldIds.has(doc.id) || doc.lines.some(l => oldIds.has(l.id))) return false;
    for (const line of doc.lines) addedLines.add(line.id);
    const version = owner.flows.find(f => f.flowId === execution.flowId)!.versions.find(v => v.id === execution.versionId)!;
    const analysis = M.parseDocument(doc, next);
    if (analysis.items.some(item => M.currentProgress(next, item.id) !== 0)) return false;
    for (const ref of version.taskRefs) {
      const task = tasks.get(execution.taskIds[ref.taskId])!, node = version.nodes.find(n => n.kind === 'action' && n.taskId === ref.taskId) as PersonalActionSnapshot;
      const date = resolvePersonalTaskDate(ref.date, execution.anchorDate);
      if (!date.ok || task.date !== date.value || task.title !== node.title || task.note !== node.memo
        || task.time !== node.time || task.scopeId !== node.scopeId) return false;
      const checks = analysis.items.filter(item => !item.isCanonical && item.parentTaskId === task.id);
      if (checks.length !== node.subchecks.length) return false;
      const checkIds = new Map(node.subchecks.map((check, i) => [check.id, checks[i].id]));
      for (const [i, frozen] of node.subchecks.entries()) {
        const actual = checks[i], parent = frozen.parentId === null ? task.id : checkIds.get(frozen.parentId);
        if (actual.title !== frozen.title || actual.note !== frozen.memo || actual.time !== frozen.time
          || next.itemScopes[actual.id] !== frozen.scopeId || actual.parentItemId !== parent) return false;
        if (frozen.date.kind === 'inherit') { if (actual.explicitDate) return false; }
        else {
          const date = resolvePersonalTaskDate(frozen.date, execution.anchorDate);
          if (!date.ok || !actual.explicitDate || actual.date !== date.value) return false;
        }
      }
    }
  }
  // New documents/rows/ownership entries/bindings may be appended; all existing native data must be exact.
  const withoutNew = { ...next, documents: next.documents.filter(d => !docIds.has(d.id)), flows: next.flows.filter(d => !docIds.has(d.id)),
    taskScopes: Object.fromEntries(Object.entries(next.taskScopes).filter(([key]) => !addedLines.has(key))),
    itemScopes: Object.fromEntries(Object.entries(next.itemScopes).filter(([key]) => !addedLines.has(key))),
    bindings: next.bindings.filter(b => !docIds.has(b.docId)) };
  return sameJson(before, withoutNew);
}
function preservesAnchorNative(beforeOwner: PersonalAuthoringV1, changed: PersonalStandaloneExecution[], context: PersonalNativeTransition): boolean {
  const { before, next } = context, nextTasks = new Map(M.tasks(next).map(t => [t.id, t]));
  const beforeStrip = new Set<string>(), nextStrip = new Set<string>(), oldIds = nativeIds(before);
  const lastDateProperty = (native: TextWorkspaceState, taskId: string) => {
    const task = M.tasks(native).find(t => t.id === taskId)!;
    return M.parseDocument(M.getDocument(native, task.docId)!, native).rows
      .filter(row => row.kind === 'property' && row.taskId === taskId && /^ *-\s+날짜:/.test(row.text)).at(-1)?.id;
  };
  for (const execution of changed) {
    const plan = planPersonalExecutionAnchorChange(beforeOwner, execution.id, execution.anchorDate, before);
    if (!plan.ok || !sameJson(plan.value.execution, execution)) return false;
    for (const change of plan.value.changes) {
      if (nextTasks.get(change.taskId)?.date !== change.afterDate) return false;
      const prior = lastDateProperty(before, change.taskId), following = lastDateProperty(next, change.taskId);
      if (!following || (prior ? prior !== following : oldIds.has(following))) return false;
      if (prior) beforeStrip.add(prior);
      nextStrip.add(following);
    }
  }
  const stripped = (native: TextWorkspaceState, ids: Set<string>) => ({ ...native,
    documents: native.documents.map(d => ({ ...d, lines: d.lines.filter(l => !ids.has(l.id)) })),
    flows: native.flows.map(d => ({ ...d, lines: d.lines.filter(l => !ids.has(l.id)) })),
  });
  return sameJson(stripped(before, beforeStrip), stripped(next, nextStrip));
}
/** Run alongside admission on the server's current preimage. A shape-valid snapshot may still erase or rewrite history. */
export function preservesPersonalAuthoringHistory(before: PersonalAuthoringV1 | undefined, next: PersonalAuthoringV1 | undefined,
  native?: PersonalNativeTransition): boolean {
  try {
    if (before === undefined && next === undefined) return true;
    if (next === undefined || before !== undefined && !json(before) || !json(next)) return false;
    for (const flow of before?.flows ?? []) {
      const retained = next.flows.find(f => f.flowId === flow.flowId);
      if (!retained || flow.versions.some(v => !sameJson(v, retained.versions.find(n => n.id === v.id)))) return false;
    }
    for (const series of before?.series ?? []) {
      const retained = next.series.find(s => s.id === series.id);
      if (!retained || !sameJson(series.source, retained.source)
        || series.ruleVersions.some(v => !sameJson(v, retained.ruleVersions.find(n => n.id === v.id)))
        || series.rounds.some(r => !sameJson(r, retained.rounds.find(n => n.id === r.id)))) return false;
    }
    const changed: PersonalStandaloneExecution[] = [], oldExecutions = before?.executions ?? [];
    for (const execution of oldExecutions) {
      const retained = next.executions?.find(e => e.id === execution.id);
      if (!retained || !sameJson({ ...execution, anchorDate: retained.anchorDate }, retained)) return false;
      if (retained.anchorDate !== execution.anchorDate) changed.push(retained);
    }
    const added = (next.executions ?? []).filter(e => !oldExecutions.some(old => old.id === e.id));
    if (added.length || changed.length) {
      if (!native || added.length && changed.length || !M.validate(native.before) || !validatePersonalAuthoring(next, native.next)
        || before !== undefined && !validatePersonalAuthoring(before, native.before)) return false;
      if (added.length && !preservesNewExecutions(added, next, native)) return false;
      if (changed.length && (!before || !preservesAnchorNative(before, changed, native))) return false;
    }
    return true;
  } catch { return false; }
}
