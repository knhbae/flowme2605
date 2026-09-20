/**
 * Ephemeral UI ownership for the last contextual workspace result.
 * No storage, DOM, clock, migration, or independent Undo snapshot.
 * Adapter-provided facts never replace the existing writer's authority checks.
 */
export const CONTEXTUAL_RESULT_VERSION = 1 as const;

export type ResultLane = 'workspace' | 'creator-drafts' | 'source-update' | null;
export type ResultOperation = 'move-date' | 'move-folder' | 'move-order' | 'complete' | 'reopen';
export type ResultContext = Readonly<{
  kind: 'date' | 'folder' | 'flow' | 'undated' | 'overdue';
  key: string;
}>;
export type ResultChange = Readonly<{ label: string; before: string | null; after: string | null }>;
export type ResultIntent = Readonly<{
  operation: ResultOperation;
  refs: readonly string[];
  summary: string;
  changes?: readonly ResultChange[];
  context?: ResultContext;
  returnPointKey?: string;
}>;
export type ResultFacts = Readonly<{
  lane: ResultLane;
  exactTargetRaw: string | null;
  hasUndo: boolean;
  authorityReady: boolean;
  pending: boolean;
  editorOwner: boolean;
  recoveryOwner: boolean;
  receiptOwnerId: string | null;
}>;
export type ResultOutcome =
  | Readonly<{ kind: 'success'; exactTargetRaw: string; hasUndo: boolean; authorityReady: true }>
  | Readonly<{ kind: 'failed' | 'noop' | 'canceled' | 'recovery-required' }>;
export type ResultPresentation = 'hidden' | 'saving' | 'success' | 'failure' | 'neutral' | 'canceled' | 'blocked' | 'undoing' | 'undone';
export type ResultTicket = Readonly<{
  version: 1;
  sessionId: string;
  epoch: number;
  ordinal: number;
  attemptId: string;
  kind: 'change' | 'undo';
  lane: 'workspace';
  ownerId: string | null;
}>;
export type ContextualResult = Readonly<{
  ownerId: string;
  attemptId: string;
  lane: 'workspace';
  status: 'success' | 'undone';
  operation: ResultOperation;
  refs: readonly string[];
  summary: string;
  changes: readonly ResultChange[];
  context?: ResultContext;
  returnPointKey?: string;
  undoAvailable: boolean;
}>;
export type ResultOwnerState = Readonly<{
  version: 1;
  sessionId: string;
  epoch: number;
  sequence: number;
  activeAttempt: ResultTicket | null;
  lastSuccess: ContextualResult | null;
  presentation: ResultPresentation;
}>;
export type ResultSelection = Readonly<{
  result: ContextualResult | null;
  canUndo: boolean;
  announcementOwner: 'recovery' | 'editor' | 'pending' | 'receipt' | 'result' | null;
  reason: string;
}>;
export type ResultBegin =
  | Readonly<{ ok: true; state: ResultOwnerState; ticket: ResultTicket }>
  | Readonly<{ ok: false; state: ResultOwnerState; reason: string }>;
export type ResultSettlement = Readonly<{ accepted: boolean; state: ResultOwnerState; reason?: string }>;

const PRIVATE = Symbol('contextual-result-private');
type PrivateData = Readonly<{ instance: object; raw?: string | null; intent?: ResultIntent }>;
type PrivatelyOwned = { [PRIVATE]?: PrivateData };
const operations: readonly string[] = ['move-date', 'move-folder', 'move-order', 'complete', 'reopen'];
const contextKinds: readonly string[] = ['date', 'folder', 'flow', 'undated', 'overdue'];

function owned<T extends object>(value: T, data: PrivateData): Readonly<T> {
  Object.defineProperty(value, PRIVATE, { value: Object.freeze(data), enumerable: false });
  return Object.freeze(value);
}
function privateData(value: unknown): PrivateData | undefined {
  return value !== null && typeof value === 'object' ? (value as PrivatelyOwned)[PRIVATE] : undefined;
}
function validState(state: ResultOwnerState): boolean {
  return Boolean(privateData(state) && state.version === 1);
}
function nextState(state: ResultOwnerState, patch: Partial<ResultOwnerState>): ResultOwnerState {
  return owned({ ...state, ...patch }, privateData(state)!);
}
function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function validFacts(facts: ResultFacts): boolean {
  return Boolean(facts && ['workspace', 'creator-drafts', 'source-update', null].includes(facts.lane)
    && (facts.exactTargetRaw === null || typeof facts.exactTargetRaw === 'string')
    && ['hasUndo', 'authorityReady', 'pending', 'editorOwner', 'recoveryOwner']
      .every(key => typeof facts[key as keyof ResultFacts] === 'boolean')
    && (facts.receiptOwnerId === null || text(facts.receiptOwnerId)));
}
function copyIntent(intent: ResultIntent): ResultIntent | null {
  if (!intent || !operations.includes(intent.operation) || !text(intent.summary)
    || !Array.isArray(intent.refs) || !intent.refs.length || !intent.refs.every(text)
    || new Set(intent.refs).size !== intent.refs.length
    || (intent.returnPointKey !== undefined && !text(intent.returnPointKey))) return null;
  if (intent.context && (!contextKinds.includes(intent.context.kind) || !text(intent.context.key))) return null;
  if (intent.changes !== undefined && (!Array.isArray(intent.changes)
    || !intent.changes.every(change => change && text(change.label)
      && (change.before === null || typeof change.before === 'string')
      && (change.after === null || typeof change.after === 'string')))) return null;
  return Object.freeze({
    operation: intent.operation,
    refs: Object.freeze([...intent.refs]),
    summary: intent.summary,
    changes: Object.freeze((intent.changes ?? []).map(change => Object.freeze({ label: change.label, before: change.before, after: change.after }))),
    ...(intent.context ? { context: Object.freeze({ kind: intent.context.kind, key: intent.context.key }) } : {}),
    ...(intent.returnPointKey ? { returnPointKey: intent.returnPointKey } : {}),
  });
}
function makeTicket(state: ResultOwnerState, kind: ResultTicket['kind'], raw: string | null, intent: ResultIntent, ownerId: string | null): ResultTicket {
  const epoch = state.epoch + 1;
  const ordinal = state.sequence + 1;
  return owned({
    version: 1 as const, sessionId: state.sessionId, epoch, ordinal,
    attemptId: state.sessionId + ':' + epoch + ':' + ordinal + ':' + kind,
    kind, lane: 'workspace' as const, ownerId,
  }, { instance: privateData(state)!.instance, raw, intent });
}
function currentTicket(state: ResultOwnerState, ticket: ResultTicket, kind: ResultTicket['kind']): boolean {
  return validState(state) && state.activeAttempt === ticket && ticket.kind === kind
    && privateData(ticket)?.instance === privateData(state)?.instance
    && ticket.epoch === state.epoch && ticket.ordinal === state.sequence;
}
function invalidBegin(state: ResultOwnerState, reason: string): ResultBegin {
  return Object.freeze({ ok: false as const, state, reason });
}
function settlement(state: ResultOwnerState, accepted: boolean, reason?: string): ResultSettlement {
  return Object.freeze({ accepted, state, ...(reason ? { reason } : {}) });
}
function successResult(state: ResultOwnerState, ticket: ResultTicket, outcome: Extract<ResultOutcome, { kind: 'success' }>, undone: boolean): ContextualResult {
  const intent = privateData(ticket)!.intent!;
  const changes = undone
    ? (intent.changes ?? []).map(change => Object.freeze({ ...change, before: change.after, after: change.before }))
    : intent.changes ?? [];
  return owned({
    ownerId: ticket.attemptId, attemptId: ticket.attemptId, lane: 'workspace' as const,
    status: undone ? 'undone' as const : 'success' as const,
    operation: intent.operation, refs: intent.refs,
    summary: undone ? '되돌렸어요.' : intent.summary,
    changes: Object.freeze([...changes]),
    ...(intent.context ? { context: intent.context } : {}),
    ...(intent.returnPointKey ? { returnPointKey: intent.returnPointKey } : {}),
    undoAvailable: !undone && outcome.hasUndo,
  }, { instance: privateData(state)!.instance, raw: outcome.exactTargetRaw });
}
function settle(state: ResultOwnerState, ticket: ResultTicket, outcome: ResultOutcome, kind: ResultTicket['kind']): ResultSettlement {
  if (!currentTicket(state, ticket, kind)) return settlement(state, false, 'stale-attempt');
  if (!outcome || !['success', 'failed', 'noop', 'canceled', 'recovery-required'].includes(outcome.kind)) {
    return settlement(state, false, 'invalid-outcome');
  }
  if (outcome.kind === 'success') {
    if (outcome.authorityReady !== true || typeof outcome.exactTargetRaw !== 'string'
      || typeof outcome.hasUndo !== 'boolean' || outcome.exactTargetRaw === privateData(ticket)?.raw) {
      return settlement(nextState(state, { activeAttempt: null, presentation: 'failure' }), false, 'unverified-success');
    }
    const result = successResult(state, ticket, outcome, kind === 'undo');
    return settlement(nextState(state, { activeAttempt: null, lastSuccess: result, presentation: kind === 'undo' ? 'undone' : 'success' }), true);
  }
  const presentation: ResultPresentation = outcome.kind === 'failed' ? 'failure'
    : outcome.kind === 'noop' ? 'neutral' : outcome.kind === 'canceled' ? 'canceled' : 'blocked';
  return settlement(nextState(state, { activeAttempt: null, presentation }), true);
}

export function createResultOwnerSession(sessionId: string): ResultOwnerState {
  if (!text(sessionId)) throw new TypeError('contextual-result-session-id-required');
  return owned({
    version: 1 as const, sessionId, epoch: 0, sequence: 0,
    activeAttempt: null, lastSuccess: null, presentation: 'hidden' as const,
  }, { instance: Object.freeze({}) });
}

/** A new explicit workspace action may supersede an earlier creator/source lane or receipt. */
export function beginAttempt(state: ResultOwnerState, intent: ResultIntent, facts: ResultFacts): ResultBegin {
  if (!validState(state)) return invalidBegin(state, 'invalid-session');
  if (!validFacts(facts)) return invalidBegin(state, 'invalid-facts');
  if (state.activeAttempt || facts.pending || facts.editorOwner || facts.recoveryOwner || !facts.authorityReady) {
    return invalidBegin(state, 'owner-locked');
  }
  const copied = copyIntent(intent);
  if (!copied) return invalidBegin(state, 'invalid-intent');
  const ticket = makeTicket(state, 'change', facts.exactTargetRaw, copied, null);
  return Object.freeze({ ok: true as const, ticket, state: nextState(state, {
    activeAttempt: ticket, epoch: ticket.epoch, sequence: ticket.ordinal, presentation: 'saving',
  }) });
}

export function settleAttempt(state: ResultOwnerState, ticket: ResultTicket, outcome: ResultOutcome): ResultSettlement {
  return settle(state, ticket, outcome, 'change');
}

/** Suppression changes UI ownership only; the existing writer's snapshot is untouched. */
export function interruptOwner(state: ResultOwnerState, _reason: string): ResultOwnerState {
  if (!validState(state)) return state;
  return nextState(state, { epoch: state.epoch + 1, activeAttempt: null, presentation: 'hidden' });
}

/** Public projection deliberately has no private raw/instance metadata. */
export function selectResult(state: ResultOwnerState, facts: ResultFacts): ResultSelection {
  const empty = (reason: string, announcementOwner: ResultSelection['announcementOwner'] = null): ResultSelection =>
    Object.freeze({ result: null, canUndo: false, announcementOwner, reason });
  if (!validState(state) || !validFacts(facts)) return empty('invalid-authority');
  if (facts.recoveryOwner || !facts.authorityReady) return empty('recovery-owner', 'recovery');
  if (facts.editorOwner) return empty('editor-owner', 'editor');
  if (facts.pending || state.activeAttempt) return empty('pending-owner', 'pending');
  if (facts.receiptOwnerId) return empty('receipt-owner', 'receipt');
  if (!['success', 'undone'].includes(state.presentation) || !state.lastSuccess) return empty('no-visible-result');
  const result = state.lastSuccess;
  const data = privateData(result);
  if (!data || data.instance !== privateData(state)!.instance || data.raw !== facts.exactTargetRaw || facts.lane !== 'workspace') return empty('stale-result');
  // Never hand the internal authority-bearing object to a renderer/exporter.
  const view: ContextualResult = Object.freeze({
    ownerId: result.ownerId, attemptId: result.attemptId, lane: result.lane, status: result.status,
    operation: result.operation, refs: result.refs, summary: result.summary, changes: result.changes,
    ...(result.context ? { context: result.context } : {}),
    ...(result.returnPointKey ? { returnPointKey: result.returnPointKey } : {}),
    undoAvailable: result.undoAvailable,
  });
  return Object.freeze({ result: view, canUndo: result.status === 'success' && result.undoAvailable && facts.hasUndo,
    announcementOwner: 'result' as const, reason: 'current-result' });
}

export function beginContextualUndo(state: ResultOwnerState, ownerId: string, facts: ResultFacts): ResultBegin {
  const selected = selectResult(state, facts);
  if (!selected.canUndo || !selected.result || selected.result.ownerId !== ownerId) return invalidBegin(state, 'stale-undo-owner');
  const result = selected.result;
  const intent = copyIntent({ operation: result.operation, refs: result.refs, summary: result.summary,
    changes: result.changes, context: result.context, returnPointKey: result.returnPointKey })!;
  const ticket = makeTicket(state, 'undo', facts.exactTargetRaw, intent, ownerId);
  return Object.freeze({ ok: true as const, ticket, state: nextState(state, {
    activeAttempt: ticket, epoch: ticket.epoch, sequence: ticket.ordinal, presentation: 'undoing',
  }) });
}

export function settleUndo(state: ResultOwnerState, ticket: ResultTicket, outcome: ResultOutcome): ResultSettlement {
  return settle(state, ticket, outcome, 'undo');
}

export function dismissResult(state: ResultOwnerState, ownerId: string): ResultOwnerState {
  if (!validState(state) || state.activeAttempt || state.lastSuccess?.ownerId !== ownerId) return state;
  return nextState(state, { presentation: 'hidden' });
}

