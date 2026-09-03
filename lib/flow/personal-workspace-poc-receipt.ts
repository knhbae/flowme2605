export const PERSONAL_WORKSPACE_POC_RECEIPT_VERSION = 1 as const;

export const PERSONAL_WORKSPACE_POC_RECEIPT_STATUSES = [
  'saving',
  'success',
  'noop',
  'failure',
  'canceled',
  'undone',
] as const;

export type PersonalWorkspacePocReceiptStatus =
  typeof PERSONAL_WORKSPACE_POC_RECEIPT_STATUSES[number];

export const PERSONAL_WORKSPACE_POC_RECEIPT_RETURN_CONTEXTS = [
  'parent-plan',
  'flow-detail',
  'folder-list',
  'period-list',
  'result-view',
  'quick-list',
] as const;

export type PersonalWorkspacePocReceiptReturnContext =
  typeof PERSONAL_WORKSPACE_POC_RECEIPT_RETURN_CONTEXTS[number];

export type PersonalWorkspacePocReceiptChangeOwner =
  | 'authoring-source'
  | 'poc-personal-plan'
  | 'organization'
  | 'execution';

export type PersonalWorkspacePocReceiptValue = string | number | boolean | null;

export type PersonalWorkspacePocReceiptChange = Readonly<{
  owner: PersonalWorkspacePocReceiptChangeOwner;
  field: string;
  label: string;
  before: PersonalWorkspacePocReceiptValue;
  after: PersonalWorkspacePocReceiptValue;
}>;

export type PersonalWorkspacePocRetryJson =
  | string
  | number
  | boolean
  | null
  | readonly PersonalWorkspacePocRetryJson[]
  | Readonly<{ [key: string]: PersonalWorkspacePocRetryJson }>;

export type PersonalWorkspacePocRetryIntent = Readonly<{
  kind: string;
  parameters: Readonly<Record<string, PersonalWorkspacePocRetryJson>>;
}>;

type PersonalWorkspacePocReceiptBase = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_RECEIPT_VERSION;
  receiptId: string;
  intentId: string;
  operation: string;
  createdAt: string;
  scopeRef: string;
  affectedRefs: readonly string[];
  affectedCount: number;
  stateRevisionBefore: number;
  stateRevisionAfter: number;
  changes: readonly PersonalWorkspacePocReceiptChange[];
  targetWriteCount: number;
  supportWriteCount: number;
}>;

export type PersonalWorkspacePocReceipt =
  | (PersonalWorkspacePocReceiptBase & Readonly<{
      status: 'saving' | 'noop';
      rollback: 'not-needed';
    }>)
  | (PersonalWorkspacePocReceiptBase & Readonly<{
      status: 'canceled';
      rollback: 'not-needed';
      returnContext: PersonalWorkspacePocReceiptReturnContext;
    }>)
  | (PersonalWorkspacePocReceiptBase & Readonly<{
      status: 'success';
      rollback: 'not-needed';
      undoLabel: string;
    }>)
  | (PersonalWorkspacePocReceiptBase & Readonly<{
      status: 'failure';
      rollback: 'not-needed' | 'complete' | 'recovery-required';
      retryIntent: PersonalWorkspacePocRetryIntent;
      errorCode: string;
    }>)
  | (PersonalWorkspacePocReceiptBase & Readonly<{
      status: 'undone';
      rollback: 'not-needed';
      undoLabel: string;
      undoOfReceiptId: string;
    }>);

export type PersonalWorkspacePocReceiptInput = Readonly<{
  receiptId: string;
  intentId: string;
  operation: string;
  status: PersonalWorkspacePocReceiptStatus;
  createdAt: string;
  scopeRef: string;
  affectedRefs: readonly string[];
  affectedCount: number;
  stateRevisionBefore: number;
  stateRevisionAfter: number;
  changes: readonly PersonalWorkspacePocReceiptChange[];
  targetWriteCount: number;
  supportWriteCount: number;
  rollback: 'not-needed' | 'complete' | 'recovery-required';
  undoLabel?: string;
  retryIntent?: PersonalWorkspacePocRetryIntent;
  errorCode?: string;
  undoOfReceiptId?: string;
  returnContext?: PersonalWorkspacePocReceiptReturnContext;
}>;

export type PersonalWorkspacePocReceiptResult =
  | Readonly<{ ok: true; receipt: PersonalWorkspacePocReceipt }>
  | Readonly<{ ok: false; error: string }>;

const RECEIPT_INPUT_KEYS = new Set([
  'receiptId',
  'intentId',
  'operation',
  'status',
  'createdAt',
  'scopeRef',
  'affectedRefs',
  'affectedCount',
  'stateRevisionBefore',
  'stateRevisionAfter',
  'changes',
  'targetWriteCount',
  'supportWriteCount',
  'rollback',
  'undoLabel',
  'retryIntent',
  'errorCode',
  'undoOfReceiptId',
  'returnContext',
]);

const CHANGE_KEYS = ['owner', 'field', 'label', 'before', 'after'] as const;
const RETRY_INTENT_KEYS = ['kind', 'parameters'] as const;
const CHANGE_OWNERS = new Set<PersonalWorkspacePocReceiptChangeOwner>([
  'authoring-source',
  'poc-personal-plan',
  'organization',
  'execution',
]);
const STATUSES = new Set<PersonalWorkspacePocReceiptStatus>(
  PERSONAL_WORKSPACE_POC_RECEIPT_STATUSES,
);
const ROLLBACK_VALUES = new Set(['not-needed', 'complete', 'recovery-required']);
const RETURN_CONTEXTS = new Set<PersonalWorkspacePocReceiptReturnContext>(
  PERSONAL_WORKSPACE_POC_RECEIPT_RETURN_CONTEXTS,
);
const IDENTIFIER_LIMIT = 256;
const DISPLAY_STRING_LIMIT = 160;
const RETRY_STRING_LIMIT = 512;
const MAX_RETRY_DEPTH = 6;
const MAX_RETRY_COLLECTION_SIZE = 100;

class ReceiptValidationError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function fail(code: string): never {
  throw new ReceiptValidationError(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length
    && actual.every((key, index) => key === sortedExpected[index]);
}

function hasOnlyAllowedKeys(value: Record<string, unknown>, allowed: Set<string>): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
}

function isSensitiveRawTextKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z]/gu, '');
  return normalized === 'rawtext'
    || normalized === 'sourcerawtext'
    || normalized === 'rawsource';
}

function requireIdentifier(value: unknown, code: string): string {
  if (
    typeof value !== 'string'
    || !value.trim()
    || value !== value.trim()
    || value.length > IDENTIFIER_LIMIT
    || /[\r\n\u0000-\u001f\u007f]/u.test(value)
  ) fail(code);
  return value;
}

function requireOperation(value: unknown): string {
  const operation = requireIdentifier(value, 'invalid-operation');
  if (!/^[a-z][a-z0-9-]{0,63}$/u.test(operation)) fail('invalid-operation');
  return operation;
}

function requireErrorCode(value: unknown): string {
  const errorCode = requireIdentifier(value, 'invalid-error-code');
  if (!/^[a-z][a-z0-9_-]{0,127}$/u.test(errorCode)) fail('invalid-error-code');
  return errorCode;
}

function requireIsoDate(value: unknown): string {
  if (typeof value !== 'string') fail('invalid-created-at');
  const date = new Date(value);
  if (Number.isNaN(date.valueOf()) || date.toISOString() !== value) {
    fail('invalid-created-at');
  }
  return value;
}

function requireCount(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(code);
  return value as number;
}

function requireDisplayString(value: unknown, code: string): string {
  if (
    typeof value !== 'string'
    || !value.trim()
    || value !== value.trim()
    || value.length > DISPLAY_STRING_LIMIT
    || /[\r\n\u0000-\u001f\u007f]/u.test(value)
  ) fail(code);
  return value;
}

function requireReceiptValue(value: unknown): PersonalWorkspacePocReceiptValue {
  if (value === null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (
    typeof value === 'string'
    && value.length <= DISPLAY_STRING_LIMIT
    && !/[\r\n\u0000-\u001f\u007f]/u.test(value)
  ) return value;
  fail('invalid-change-value');
}

function parseChanges(value: unknown): PersonalWorkspacePocReceiptChange[] {
  if (!Array.isArray(value) || value.length > MAX_RETRY_COLLECTION_SIZE) {
    fail('invalid-changes');
  }
  const changes = value.map((entry) => {
    if (!isRecord(entry) || !hasExactKeys(entry, CHANGE_KEYS)) fail('invalid-change');
    if (!CHANGE_OWNERS.has(entry.owner as PersonalWorkspacePocReceiptChangeOwner)) {
      fail('invalid-change-owner');
    }
    const field = requireIdentifier(entry.field, 'invalid-change-field');
    if (isSensitiveRawTextKey(field)) fail('raw-text-forbidden');
    return {
      owner: entry.owner as PersonalWorkspacePocReceiptChangeOwner,
      field,
      label: requireDisplayString(entry.label, 'invalid-change-label'),
      before: requireReceiptValue(entry.before),
      after: requireReceiptValue(entry.after),
    };
  });
  const identities = changes.map((change) => `${change.owner}:${change.field}`);
  if (new Set(identities).size !== identities.length) fail('duplicate-change-field');
  return changes;
}

function cloneRetryJson(
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
  pathKey?: string,
): PersonalWorkspacePocRetryJson {
  if (pathKey && isSensitiveRawTextKey(pathKey)) fail('raw-text-forbidden');
  if (depth > MAX_RETRY_DEPTH) fail('retry-intent-too-deep');
  if (value === null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    if (
      value.length > RETRY_STRING_LIMIT
      || /[\r\n\u0000-\u001f\u007f]/u.test(value)
    ) fail('invalid-retry-intent-string');
    return value;
  }
  if (typeof value !== 'object' || value === null) fail('retry-intent-not-serializable');
  if (seen.has(value)) fail('retry-intent-not-serializable');
  seen.add(value);

  if (Array.isArray(value)) {
    if (value.length > MAX_RETRY_COLLECTION_SIZE) fail('retry-intent-too-large');
    const cloned = value.map((entry) => cloneRetryJson(entry, seen, depth + 1));
    seen.delete(value);
    return cloned;
  }
  if (!isRecord(value)) fail('retry-intent-not-serializable');
  const keys = Object.keys(value);
  if (keys.length > MAX_RETRY_COLLECTION_SIZE) fail('retry-intent-too-large');
  const cloned: Record<string, PersonalWorkspacePocRetryJson> = {};
  for (const key of keys) {
    if (!key.trim() || isSensitiveRawTextKey(key)) fail('raw-text-forbidden');
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
      fail('unsafe-retry-intent-key');
    }
    cloned[key] = cloneRetryJson(value[key], seen, depth + 1, key);
  }
  seen.delete(value);
  return cloned;
}

function parseRetryIntent(value: unknown): PersonalWorkspacePocRetryIntent {
  if (!isRecord(value) || !hasExactKeys(value, RETRY_INTENT_KEYS)) {
    fail('invalid-retry-intent');
  }
  const kind = requireOperation(value.kind);
  if (!isRecord(value.parameters)) fail('invalid-retry-intent');
  const parameters = cloneRetryJson(
    value.parameters,
    new WeakSet<object>(),
    0,
  );
  if (!isRecord(parameters)) fail('invalid-retry-intent');
  return { kind, parameters } as PersonalWorkspacePocRetryIntent;
}

function deepFreeze<Value>(value: Value): Value {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach((entry) => deepFreeze(entry));
  }
  return value;
}

function sameValue(left: PersonalWorkspacePocReceiptValue, right: PersonalWorkspacePocReceiptValue) {
  return Object.is(left, right);
}

function parseReceiptInput(value: unknown, expectsVersion = false): PersonalWorkspacePocReceipt {
  if (!isRecord(value)) fail('invalid-receipt');
  const allowed = new Set(RECEIPT_INPUT_KEYS);
  if (expectsVersion) allowed.add('version');
  if (!hasOnlyAllowedKeys(value, allowed)) fail('unexpected-receipt-field');
  if (expectsVersion && value.version !== PERSONAL_WORKSPACE_POC_RECEIPT_VERSION) {
    fail('unsupported-receipt-version');
  }

  const status = value.status;
  if (typeof status !== 'string' || !STATUSES.has(status as PersonalWorkspacePocReceiptStatus)) {
    fail('invalid-status');
  }
  const rollback = value.rollback;
  if (typeof rollback !== 'string' || !ROLLBACK_VALUES.has(rollback)) fail('invalid-rollback');

  const receiptId = requireIdentifier(value.receiptId, 'invalid-receipt-id');
  const intentId = requireIdentifier(value.intentId, 'invalid-intent-id');
  const operation = requireOperation(value.operation);
  const createdAt = requireIsoDate(value.createdAt);
  const scopeRef = requireIdentifier(value.scopeRef, 'invalid-scope-ref');
  if (
    !Array.isArray(value.affectedRefs)
    || value.affectedRefs.length > MAX_RETRY_COLLECTION_SIZE
  ) fail('invalid-affected-refs');
  const affectedRefs = value.affectedRefs.map((entry) => (
    requireIdentifier(entry, 'invalid-affected-ref')
  ));
  if (new Set(affectedRefs).size !== affectedRefs.length) fail('duplicate-affected-ref');
  const affectedCount = requireCount(value.affectedCount, 'invalid-affected-count');
  if (affectedCount !== affectedRefs.length) fail('affected-count-mismatch');
  const stateRevisionBefore = requireCount(
    value.stateRevisionBefore,
    'invalid-state-revision-before',
  );
  const stateRevisionAfter = requireCount(
    value.stateRevisionAfter,
    'invalid-state-revision-after',
  );
  const changes = parseChanges(value.changes);
  const targetWriteCount = requireCount(value.targetWriteCount, 'invalid-target-write-count');
  const supportWriteCount = requireCount(value.supportWriteCount, 'invalid-support-write-count');

  const common = {
    version: PERSONAL_WORKSPACE_POC_RECEIPT_VERSION,
    receiptId,
    intentId,
    operation,
    createdAt,
    scopeRef,
    affectedRefs,
    affectedCount,
    stateRevisionBefore,
    stateRevisionAfter,
    changes,
    targetWriteCount,
    supportWriteCount,
  } as const;

  const unchangedRevision = stateRevisionAfter === stateRevisionBefore;
  const changedOnce = stateRevisionAfter === stateRevisionBefore + 1;
  switch (status as PersonalWorkspacePocReceiptStatus) {
    case 'saving':
      if (!unchangedRevision || targetWriteCount !== 0 || supportWriteCount !== 0) {
        fail('invalid-saving-write-state');
      }
      if (rollback !== 'not-needed') fail('invalid-saving-rollback');
      rejectStatusExtras(value);
      return deepFreeze({ ...common, status: 'saving', rollback: 'not-needed' });

    case 'success': {
      if (!changedOnce || targetWriteCount === 0 || affectedCount === 0) {
        fail('invalid-success-write-state');
      }
      if (changes.length === 0 || changes.every((change) => sameValue(change.before, change.after))) {
        fail('invalid-success-changes');
      }
      if (rollback !== 'not-needed') fail('invalid-success-rollback');
      rejectStatusExtras(value, ['undoLabel']);
      const undoLabel = requireDisplayString(value.undoLabel, 'invalid-undo-label');
      return deepFreeze({ ...common, status: 'success', rollback: 'not-needed', undoLabel });
    }

    case 'noop':
      if (!unchangedRevision || targetWriteCount !== 0 || supportWriteCount !== 0) {
        fail('invalid-noop-write-state');
      }
      if (changes.some((change) => !sameValue(change.before, change.after))) {
        fail('invalid-noop-changes');
      }
      if (rollback !== 'not-needed') fail('invalid-noop-rollback');
      rejectStatusExtras(value);
      return deepFreeze({ ...common, status: 'noop', rollback: 'not-needed' });

    case 'failure': {
      if (!unchangedRevision || targetWriteCount !== 0) fail('invalid-failure-write-state');
      if (rollback === 'not-needed' && supportWriteCount !== 0) {
        fail('failure-rollback-required');
      }
      if (rollback === 'recovery-required' && supportWriteCount === 0) {
        fail('recovery-support-write-required');
      }
      rejectStatusExtras(value, ['retryIntent', 'errorCode']);
      const retryIntent = parseRetryIntent(value.retryIntent);
      if (retryIntent.kind !== operation) fail('retry-intent-operation-mismatch');
      const errorCode = requireErrorCode(value.errorCode);
      return deepFreeze({
        ...common,
        status: 'failure',
        rollback: rollback as 'not-needed' | 'complete' | 'recovery-required',
        retryIntent,
        errorCode,
      });
    }

    case 'canceled':
      if (
        !unchangedRevision
        || targetWriteCount !== 0
        || supportWriteCount !== 0
      ) fail('invalid-canceled-write-state');
      if (
        (affectedCount === 0 && changes.length !== 0)
        || (affectedCount > 0 && (
          changes.length === 0
          || changes.every((change) => sameValue(change.before, change.after))
        ))
      ) fail('invalid-canceled-draft');
      if (rollback !== 'not-needed') fail('invalid-canceled-rollback');
      rejectStatusExtras(value, ['returnContext']);
      if (
        typeof value.returnContext !== 'string'
        || !RETURN_CONTEXTS.has(value.returnContext as PersonalWorkspacePocReceiptReturnContext)
      ) fail('invalid-return-context');
      return deepFreeze({
        ...common,
        status: 'canceled',
        rollback: 'not-needed',
        returnContext: value.returnContext as PersonalWorkspacePocReceiptReturnContext,
      });

    case 'undone': {
      if (!changedOnce || targetWriteCount === 0 || affectedCount === 0) {
        fail('invalid-undone-write-state');
      }
      if (changes.length === 0 || changes.every((change) => sameValue(change.before, change.after))) {
        fail('invalid-undone-changes');
      }
      if (rollback !== 'not-needed') fail('invalid-undone-rollback');
      rejectStatusExtras(value, ['undoLabel', 'undoOfReceiptId']);
      const undoLabel = requireDisplayString(value.undoLabel, 'invalid-undo-label');
      const undoOfReceiptId = requireIdentifier(value.undoOfReceiptId, 'invalid-undo-receipt-id');
      return deepFreeze({
        ...common,
        status: 'undone',
        rollback: 'not-needed',
        undoLabel,
        undoOfReceiptId,
      });
    }
  }
}

function rejectStatusExtras(
  value: Record<string, unknown>,
  allowedExtras: readonly string[] = [],
) {
  const extras = ['undoLabel', 'retryIntent', 'errorCode', 'undoOfReceiptId', 'returnContext'];
  for (const key of extras) {
    if (value[key] !== undefined && !allowedExtras.includes(key)) {
      fail('invalid-status-field');
    }
  }
  for (const key of allowedExtras) {
    if (value[key] === undefined) fail('missing-status-field');
  }
}

export function createPersonalWorkspacePocReceipt(
  input: PersonalWorkspacePocReceiptInput | unknown,
): PersonalWorkspacePocReceiptResult {
  try {
    return { ok: true, receipt: parseReceiptInput(input) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof ReceiptValidationError ? error.code : 'invalid-receipt',
    };
  }
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Validates one visible-state transition without producing ids or timestamps.
 * Every next receipt id and time therefore remains deterministic caller input.
 */
export function transitionPersonalWorkspacePocReceipt(
  currentValue: PersonalWorkspacePocReceipt | unknown,
  nextInput: PersonalWorkspacePocReceiptInput | unknown,
): PersonalWorkspacePocReceiptResult {
  let current: PersonalWorkspacePocReceipt;
  try {
    current = parseReceiptInput(currentValue, true);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof ReceiptValidationError ? error.code : 'invalid-current-receipt',
    };
  }
  const nextResult = createPersonalWorkspacePocReceipt(nextInput);
  if (!nextResult.ok) return nextResult;
  const next = nextResult.receipt;

  if (next.receiptId === current.receiptId) {
    return { ok: false, error: 'receipt-id-must-advance' };
  }
  if (new Date(next.createdAt).valueOf() < new Date(current.createdAt).valueOf()) {
    return { ok: false, error: 'receipt-time-must-not-decrease' };
  }
  if (
    next.intentId !== current.intentId
    || next.operation !== current.operation
    || next.scopeRef !== current.scopeRef
  ) return { ok: false, error: 'receipt-intent-mismatch' };

  if (current.status === 'failure' && current.rollback === 'recovery-required') {
    return { ok: false, error: 'receipt-recovery-must-complete' };
  }

  const allowed = (
    (current.status === 'saving'
      && ['success', 'noop', 'failure', 'canceled'].includes(next.status))
    || (current.status === 'failure' && ['saving', 'canceled'].includes(next.status))
    || (current.status === 'success' && next.status === 'undone')
  );
  if (!allowed) return { ok: false, error: 'invalid-receipt-transition' };

  if (next.status === 'canceled') return nextResult;

  if (current.status === 'success' && next.status === 'undone') {
    const invertedChanges = current.changes.map((change) => ({
      ...change,
      before: change.after,
      after: change.before,
    }));
    if (
      next.undoOfReceiptId !== current.receiptId
      || next.stateRevisionBefore !== current.stateRevisionAfter
      || !sameJson(next.affectedRefs, current.affectedRefs)
      || !sameJson(next.changes, invertedChanges)
    ) return { ok: false, error: 'invalid-undo-receipt' };
    return nextResult;
  }

  if (
    next.stateRevisionBefore !== current.stateRevisionBefore
    || !sameJson(next.affectedRefs, current.affectedRefs)
    || !sameJson(next.changes, current.changes)
  ) return { ok: false, error: 'receipt-attempt-mismatch' };

  return nextResult;
}
