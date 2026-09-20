import {
  toPersonalWorkspacePocFlowItemRef, toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocFlow,
} from './personal-workspace-poc-contract';
import type {
  PersonalWorkspacePocReceiptChange, PersonalWorkspacePocReceiptInput,
  PersonalWorkspacePocReceiptReturnContext, PersonalWorkspacePocReceiptValue,
} from './personal-workspace-poc-receipt';

export const PERSONAL_WORKSPACE_POC_PLAN_DISPLAY_CONTRACT = 'flowme-personal-workspace-plan-display-v1' as const;
export const PERSONAL_WORKSPACE_POC_PLAN_DISPLAY_VERSION = 1 as const;
export const PERSONAL_WORKSPACE_POC_PLAN_DISPLAY_PAGE_SIZE = 10 as const;

type PlanOperation = 'commit-personal-plan' | 'apply-item-to-parent-personal-draft';
type PlanStatus = PersonalWorkspacePocReceiptInput['status'] | 'preview';
export type PersonalWorkspacePocPlanDisplayInput = Omit<PersonalWorkspacePocReceiptInput, 'operation' | 'status' | 'retryIntent'> & Readonly<{
  operation: PlanOperation;
  status: PlanStatus;
}>;

type DisplayBase = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_PLAN_DISPLAY_VERSION;
  contract: typeof PERSONAL_WORKSPACE_POC_PLAN_DISPLAY_CONTRACT;
  receiptId: string;
  intentId: string;
  operation: PlanOperation;
  createdAt: string;
  scopeRef: string;
  changes: readonly PersonalWorkspacePocReceiptChange[];
  affectedRefs: readonly string[];
  affectedCount: number;
  changedFieldCount: number;
  flowCount: number;
  itemCount: number;
  stateRevisionBefore: number;
  stateRevisionAfter: number;
  targetWriteCount: number;
  supportWriteCount: number;
}>;
export type PersonalWorkspacePocPlanDisplay = DisplayBase & (
  | Readonly<{ status: 'preview' | 'saving' | 'noop'; rollback: 'not-needed' }>
  | Readonly<{ status: 'success'; rollback: 'not-needed'; undoLabel: string }>
  | Readonly<{ status: 'undone'; rollback: 'not-needed'; undoLabel: string; undoOfReceiptId: string }>
  | Readonly<{ status: 'canceled'; rollback: 'not-needed'; returnContext: PersonalWorkspacePocReceiptReturnContext }>
  | Readonly<{ status: 'failure'; rollback: 'not-needed' | 'complete' | 'recovery-required'; errorCode: string }>
);
export type PersonalWorkspacePocPlanDisplayResult =
  | Readonly<{ ok: true; display: PersonalWorkspacePocPlanDisplay }>
  | Readonly<{ ok: false; error: string }>;
export type PersonalWorkspacePocPlanDisplayPage = Readonly<{
  pageIndex: number;
  pageSize: typeof PERSONAL_WORKSPACE_POC_PLAN_DISPLAY_PAGE_SIZE;
  pageCount: number;
  /** Zero-based half-open indices into the full changes array. */
  startIndex: number;
  endIndex: number;
  rows: readonly PersonalWorkspacePocReceiptChange[];
  changedFieldCount: number;
  affectedCount: number;
  flowCount: number;
  itemCount: number;
}>;

// Memory-only display provenance, not an editor token or save/Undo permission.
const issuedDisplays = new WeakSet<object>();
const INPUT_KEYS = new Set(['receiptId', 'intentId', 'operation', 'status', 'createdAt', 'scopeRef',
  'affectedRefs', 'affectedCount', 'stateRevisionBefore', 'stateRevisionAfter', 'changes',
  'targetWriteCount', 'supportWriteCount', 'rollback', 'undoLabel', 'undoOfReceiptId', 'returnContext', 'errorCode']);
const CHANGE_KEYS = ['owner', 'field', 'label', 'before', 'after'];
const EXTRA_KEYS = ['undoLabel', 'undoOfReceiptId', 'returnContext', 'errorCode'];
const REQUIRED_KEYS = [...INPUT_KEYS].filter(key => !EXTRA_KEYS.includes(key));
const RETURN_CONTEXTS = new Set(['parent-plan', 'flow-detail', 'folder-list', 'period-list', 'result-view', 'quick-list']);
const ORIGINS = new Set(['source-backed-map', 'personal-draft', 'canonical-personal-copy', 'legacy-saved-plan', 'authoring-handoff']);
const CONTROL = /[\r\n\u0000-\u001f\u007f]/u;

class DisplayError extends Error {}
function fail(error: string): never { throw new DisplayError(error); }

/** Inspects own descriptors first: accessors/toJSON are never invoked. */
function assertPlainData(value: unknown, ancestors = new WeakSet<object>(), allowUndefined = false): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (value === undefined && allowUndefined) return;
  if (typeof value !== 'object' || value === null) fail('non-data-value');
  if (ancestors.has(value)) fail('cyclic-data');
  const prototype = Object.getPrototypeOf(value);
  const array = Array.isArray(value);
  if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) fail('non-plain-data');
  ancestors.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.getOwnPropertySymbols(value).length) fail('symbol-key');
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (array && key === 'length') continue;
    if (!('value' in descriptor) || !descriptor.enumerable) fail('accessor-or-hidden-data');
    if (key === '__proto__' || key === 'constructor' || key === 'prototype' || key === 'toJSON') fail('unsafe-data-key');
    if (array && (!/^(0|[1-9]\d*)$/u.test(key) || Number(key) >= (value as unknown[]).length)) fail('invalid-array-key');
    assertPlainData(descriptor.value, ancestors, allowUndefined);
  }
  if (array && Object.keys(descriptors).length !== (value as unknown[]).length + 1) fail('sparse-array');
  ancestors.delete(value);
}

function record(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code);
  return value as Record<string, unknown>;
}
function requireOwn(value: Record<string, unknown>, keys: readonly string[], code: string) {
  if (keys.some(key => !Object.hasOwn(value, key))) fail(code);
}
function text(value: unknown, code: string, limit = 256): string {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.length > limit || CONTROL.test(value)) fail(code);
  return value;
}
function count(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(code);
  return value as number;
}
function scalar(value: unknown): PersonalWorkspacePocReceiptValue {
  if (value === null || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value;
  if (typeof value === 'string' && value.length <= 160 && !CONTROL.test(value)) return value;
  fail('invalid-change-value');
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
}

function sourceOwnerMap(source: PersonalWorkspacePocFlow) {
  // The display checks identity/field ownership, not authoring fidelity,
  // current source freshness, or the source model's eligibility to save.
  assertPlainData(source, new WeakSet(), true);
  const flow = record(source, 'invalid-source-flow');
  requireOwn(flow, ['savedCopyId', 'flowId', 'ref', 'origin', 'items'], 'missing-source-field');
  const copyId = text(flow.savedCopyId, 'invalid-source-copy');
  const flowId = text(flow.flowId, 'invalid-source-id');
  const flowRef = text(flow.ref, 'invalid-source-ref');
  if (flowRef !== toPersonalWorkspacePocFlowRef(copyId, flowId)) fail('source-flow-identity-mismatch');
  if (!ORIGINS.has(flow.origin as string) || !Array.isArray(flow.items) || flow.items.length === 0) fail('invalid-source-flow');
  const fields = new Map<string, string>([['flow.title', flowRef], ['flow.item-order', flowRef]]);
  const itemRefs = new Set<string>(), itemIds = new Set<string>(), sourceOrders = new Set<number>();
  for (const candidate of flow.items) {
    const item = record(candidate, 'invalid-source-item');
    requireOwn(item, ['itemId', 'ref', 'sourceOrder', 'savedCopyId', 'flowId'], 'missing-source-item-field');
    const id = text(item.itemId, 'invalid-source-item-id');
    const ref = text(item.ref, 'invalid-source-item-ref');
    const order = count(item.sourceOrder, 'invalid-source-order');
    if (item.savedCopyId !== copyId || item.flowId !== flowId || ref !== toPersonalWorkspacePocFlowItemRef(copyId, flowId, id)) fail('source-item-identity-mismatch');
    if (itemIds.has(id) || itemRefs.has(ref) || sourceOrders.has(order)) fail('duplicate-source-item');
    itemIds.add(id); itemRefs.add(ref); sourceOrders.add(order);
    for (const key of ['title', 'memo', 'schedule']) fields.set(`item.${id}.${key}`, ref);
  }
  if (Object.hasOwn(flow, 'sections') && flow.sections !== undefined) {
    if (!Array.isArray(flow.sections)) fail('invalid-source-sections');
    const ids = new Set<string>(), orders = new Set<number>();
    for (const candidate of flow.sections) {
      const section = record(candidate, 'invalid-source-section');
      requireOwn(section, ['sectionId', 'sourceOrder', 'editCapability'], 'missing-source-section-field');
      const id = text(section.sectionId, 'invalid-source-section-id');
      const order = count(section.sourceOrder, 'invalid-source-section-order');
      if (ids.has(id) || orders.has(order)) fail('duplicate-source-section');
      if (section.editCapability !== 'read-only' && section.editCapability !== 'poc-shadow') fail('invalid-source-section-capability');
      ids.add(id); orders.add(order);
      if (section.editCapability === 'poc-shadow') fields.set(`section.${id}.title`, flowRef);
    }
  }
  return { flowRef, fields, itemRefs };
}

function build(input: PersonalWorkspacePocPlanDisplayInput, source: PersonalWorkspacePocFlow): PersonalWorkspacePocPlanDisplay {
  assertPlainData(input);
  const value = record(input, 'invalid-plan-display');
  if (Object.keys(value).some(key => !INPUT_KEYS.has(key))) fail('unexpected-plan-display-field');
  requireOwn(value, REQUIRED_KEYS, 'missing-plan-display-field');
  const owners = sourceOwnerMap(source);
  const receiptId = text(value.receiptId, 'invalid-receipt-id');
  const intentId = text(value.intentId, 'invalid-intent-id');
  const operation = value.operation;
  if (operation !== 'commit-personal-plan' && operation !== 'apply-item-to-parent-personal-draft') fail('invalid-operation');
  const scopeRef = text(value.scopeRef, 'invalid-scope-ref');
  const child = operation === 'apply-item-to-parent-personal-draft';
  if (child ? !owners.itemRefs.has(scopeRef) : scopeRef !== owners.flowRef) fail('foreign-scope');
  if (typeof value.createdAt !== 'string') fail('invalid-created-at');
  const date = new Date(value.createdAt);
  if (Number.isNaN(date.valueOf()) || date.toISOString() !== value.createdAt) fail('invalid-created-at');
  if (!Array.isArray(value.affectedRefs) || !Array.isArray(value.changes)) fail('invalid-collections');
  if (value.changes.length > owners.fields.size || value.affectedRefs.length > owners.itemRefs.size + 1) fail('collection-exceeds-source');
  const affectedRefs = value.affectedRefs.map(ref => text(ref, 'invalid-affected-ref'));
  if (new Set(affectedRefs).size !== affectedRefs.length) fail('duplicate-affected-ref');
  const affectedCount = count(value.affectedCount, 'invalid-affected-count');
  if (affectedCount !== affectedRefs.length) fail('affected-count-mismatch');
  const directOwners = new Set<string>(), seenFields = new Set<string>();
  const changes: PersonalWorkspacePocReceiptChange[] = value.changes.map(candidate => {
    const change = record(candidate, 'invalid-change');
    if (Object.keys(change).length !== CHANGE_KEYS.length || CHANGE_KEYS.some(key => !Object.hasOwn(change, key))) fail('invalid-change-keys');
    if (change.owner !== 'poc-personal-plan') fail('invalid-change-owner');
    const field = text(change.field, 'invalid-change-field');
    const ownerRef = owners.fields.get(field);
    if (!ownerRef || (child && ownerRef !== scopeRef)) fail('foreign-change-field');
    if (seenFields.has(field)) fail('duplicate-change-field');
    seenFields.add(field); directOwners.add(ownerRef);
    return { owner: 'poc-personal-plan', field, label: text(change.label, 'invalid-change-label', 160), before: scalar(change.before), after: scalar(change.after) };
  });
  if (directOwners.size !== affectedRefs.length || affectedRefs.some(ref => !directOwners.has(ref))) fail('affected-owner-mismatch');
  const stateRevisionBefore = count(value.stateRevisionBefore, 'invalid-state-revision-before');
  const stateRevisionAfter = count(value.stateRevisionAfter, 'invalid-state-revision-after');
  const targetWriteCount = count(value.targetWriteCount, 'invalid-target-write-count');
  const supportWriteCount = count(value.supportWriteCount, 'invalid-support-write-count');
  const common: DisplayBase = {
    version: PERSONAL_WORKSPACE_POC_PLAN_DISPLAY_VERSION, contract: PERSONAL_WORKSPACE_POC_PLAN_DISPLAY_CONTRACT,
    receiptId, intentId, operation, createdAt: value.createdAt, scopeRef, changes, affectedRefs, affectedCount,
    changedFieldCount: changes.length, flowCount: directOwners.has(owners.flowRef) ? 1 : 0,
    itemCount: [...directOwners].filter(ref => owners.itemRefs.has(ref)).length,
    stateRevisionBefore, stateRevisionAfter, targetWriteCount, supportWriteCount,
  };
  const unchanged = stateRevisionAfter === stateRevisionBefore;
  const changedOnce = stateRevisionAfter === stateRevisionBefore + 1;
  const meaningful = changes.some(change => !Object.is(change.before, change.after));
  const extra = (...allowed: string[]) => {
    if (EXTRA_KEYS.some(key => Object.hasOwn(value, key) && !allowed.includes(key))) fail('invalid-status-field');
  };
  const noWrite = () => { if (!unchanged || targetWriteCount !== 0 || supportWriteCount !== 0 || value.rollback !== 'not-needed') fail('invalid-no-write-state'); };
  switch (value.status) {
    case 'preview':
    case 'saving':
      extra(); noWrite();
      if (child && value.status === 'saving') fail('invalid-child-storage-status');
      return { ...common, status: value.status, rollback: 'not-needed' };
    case 'noop':
      extra(); noWrite();
      if (changes.length || affectedCount) fail('invalid-noop-changes');
      return { ...common, status: 'noop', rollback: 'not-needed' };
    case 'canceled':
      extra('returnContext'); noWrite();
      requireOwn(value, ['returnContext'], 'missing-return-context');
      if (affectedCount > 0 && !meaningful) fail('invalid-canceled-draft');
      if (!RETURN_CONTEXTS.has(value.returnContext as string) || (child && value.returnContext !== 'parent-plan')) fail('invalid-return-context');
      return { ...common, status: 'canceled', rollback: 'not-needed', returnContext: value.returnContext as PersonalWorkspacePocReceiptReturnContext };
    case 'success':
    case 'undone': {
      extra('undoLabel', ...(value.status === 'undone' ? ['undoOfReceiptId'] : []));
      if (child) fail('invalid-child-storage-status');
      if (!changedOnce || targetWriteCount !== 1 || !affectedCount || !meaningful || value.rollback !== 'not-needed') fail('invalid-success-write-state');
      requireOwn(value, ['undoLabel'], 'missing-undo-label');
      const undoLabel = text(value.undoLabel, 'invalid-undo-label', 160);
      if (value.status === 'success') return { ...common, status: 'success', rollback: 'not-needed', undoLabel };
      requireOwn(value, ['undoOfReceiptId'], 'missing-undo-receipt-id');
      const undoOfReceiptId = text(value.undoOfReceiptId, 'invalid-undo-receipt-id');
      if (undoOfReceiptId === receiptId) fail('self-undo-receipt');
      return { ...common, status: 'undone', rollback: 'not-needed', undoLabel, undoOfReceiptId };
    }
    case 'failure': {
      extra('errorCode');
      if (!unchanged || targetWriteCount !== 0) fail('invalid-failure-write-state');
      const rollback = value.rollback;
      if (rollback !== 'not-needed' && rollback !== 'complete' && rollback !== 'recovery-required') fail('invalid-rollback');
      if ((rollback === 'not-needed' && supportWriteCount !== 0) || (rollback === 'recovery-required' && supportWriteCount === 0)) fail('invalid-failure-rollback');
      if (child && (rollback !== 'not-needed' || supportWriteCount !== 0)) fail('invalid-child-storage-status');
      requireOwn(value, ['errorCode'], 'missing-error-code');
      const errorCode = text(value.errorCode, 'invalid-error-code', 128);
      if (!/^[a-z][a-z0-9_-]{0,127}$/u.test(errorCode)) fail('invalid-error-code');
      return { ...common, status: 'failure', rollback, errorCode };
    }
    default: fail('invalid-status');
  }
}

/** Pure full-data display validation. Success never grants save, retry or Undo authority. */
export function createPersonalWorkspacePocPlanDisplay(
  input: PersonalWorkspacePocPlanDisplayInput,
  sourceFlow: PersonalWorkspacePocFlow,
): PersonalWorkspacePocPlanDisplayResult {
  try {
    const display = freeze(build(input, sourceFlow));
    issuedDisplays.add(display);
    return { ok: true, display };
  } catch (error) {
    return { ok: false, error: error instanceof DisplayError ? error.message : 'invalid-plan-display' };
  }
}

export function selectPersonalWorkspacePocPlanDisplayPage(
  display: PersonalWorkspacePocPlanDisplay,
  pageIndex: number,
): Readonly<{ ok: true; page: PersonalWorkspacePocPlanDisplayPage }> | Readonly<{ ok: false; error: string }> {
  if (!display || typeof display !== 'object' || !issuedDisplays.has(display)) return { ok: false, error: 'display-not-issued' };
  if (!Number.isSafeInteger(pageIndex) || pageIndex < 0) return { ok: false, error: 'invalid-page-index' };
  const pageCount = Math.max(1, Math.ceil(display.changedFieldCount / PERSONAL_WORKSPACE_POC_PLAN_DISPLAY_PAGE_SIZE));
  const selected = Math.min(pageIndex, pageCount - 1);
  const startIndex = selected * PERSONAL_WORKSPACE_POC_PLAN_DISPLAY_PAGE_SIZE;
  const endIndex = Math.min(startIndex + PERSONAL_WORKSPACE_POC_PLAN_DISPLAY_PAGE_SIZE, display.changedFieldCount);
  return { ok: true, page: freeze({ pageIndex: selected, pageSize: PERSONAL_WORKSPACE_POC_PLAN_DISPLAY_PAGE_SIZE,
    pageCount, startIndex, endIndex, rows: display.changes.slice(startIndex, endIndex),
    changedFieldCount: display.changedFieldCount, affectedCount: display.affectedCount,
    flowCount: display.flowCount, itemCount: display.itemCount }) };
}
