import { withFlowUserDataWriteLock } from './storage-write-lock';

export type FlowEditorContext = 'public-draft' | 'saved-overlay';

export type FlowEditorLevel = 'plan' | 'item';

export type FlowEditorStatus =
  | 'clean'
  | 'dirty-valid'
  | 'dirty-invalid'
  | 'submitting'
  | 'success'
  | 'recoverable-error'
  | 'recovery-required';

export type FlowEditorCloseEvent =
  | 'cancel'
  | 'x'
  | 'backdrop'
  | 'escape'
  | 'browser-back';

export type FlowEditorRestoreCause = FlowEditorCloseEvent | 'commit-success';

export type FlowEditorValidation =
  | Readonly<{ valid: true }>
  | Readonly<{
      valid: false;
      firstErrorFocus: string;
    }>;

export type FlowEditorReturnPoint = Readonly<{
  location: Readonly<{
    route: string;
    query: string;
    hash?: string;
    historyEntryKey?: string;
  }>;
  scroll: readonly Readonly<{
    targetKey: string;
    left: number;
    top: number;
  }>[];
  focus: Readonly<{
    targetKey: string;
    fallbackSelector?: string;
  }>;
}>;

export type FlowEditorFailure = Readonly<{
  kind: 'validation' | 'runtime' | 'storage';
  code: string;
  message: string;
  firstErrorFocus: string;
}>;

export type FlowEditorPendingClose = Readonly<{
  event: FlowEditorCloseEvent;
}>;

export type FlowEditorSubmission = Readonly<{
  requestId: string;
  revision: number;
  attempt: number;
}>;

export type FlowEditorTransaction<Draft, Level extends FlowEditorLevel> = Readonly<{
  id: string;
  context: FlowEditorContext;
  level: Level;
  baseline: Readonly<Draft>;
  draft: Readonly<Draft>;
  revision: number;
  status: FlowEditorStatus;
  validation: FlowEditorValidation;
  returnPoint: FlowEditorReturnPoint;
  pendingClose?: FlowEditorPendingClose;
  submission?: FlowEditorSubmission;
  failure?: FlowEditorFailure;
}>;

export type FlowEditorSession<PlanDraft, ItemDraft> = Readonly<{
  context: FlowEditorContext;
  plan: FlowEditorTransaction<PlanDraft, 'plan'> | null;
  item: FlowEditorTransaction<ItemDraft, 'item'> | null;
}>;

export type OpenFlowEditorPlanInput<PlanDraft> = Readonly<{
  /** Drafts are structured-cloneable plain data; Date/Map/class instances are not supported. */
  id: string;
  context: FlowEditorContext;
  draft: PlanDraft;
  returnPoint: FlowEditorReturnPoint;
}>;

export type OpenFlowEditorItemInput<ItemDraft> = Readonly<{
  /** Drafts are structured-cloneable plain data; Date/Map/class instances are not supported. */
  id: string;
  draft: ItemDraft;
  returnPoint: FlowEditorReturnPoint;
}>;

export type FlowEditorCommitRole =
  | 'apply-public-draft'
  | 'apply-item-to-parent-public-draft'
  | 'save-personal-overlay'
  | 'apply-item-to-parent-personal-draft';

type FlowEditorPlanCommitEffect<PlanDraft> = Readonly<{
  type: 'commit';
  role: 'apply-public-draft' | 'save-personal-overlay';
  context: FlowEditorContext;
  level: 'plan';
  transactionId: string;
  requestId: string;
  revision: number;
  draft: Readonly<PlanDraft>;
}>;

type FlowEditorItemCommitEffect<PlanDraft, ItemDraft> = Readonly<{
  type: 'commit';
  role:
    | 'apply-item-to-parent-public-draft'
    | 'apply-item-to-parent-personal-draft';
  context: FlowEditorContext;
  level: 'item';
  transactionId: string;
  parentTransactionId: string;
  requestId: string;
  revision: number;
  parentDraft: Readonly<PlanDraft>;
  draft: Readonly<ItemDraft>;
}>;

export type FlowEditorCommitEffect<PlanDraft, ItemDraft> =
  | FlowEditorPlanCommitEffect<PlanDraft>
  | FlowEditorItemCommitEffect<PlanDraft, ItemDraft>;

export type FlowEditorEffect<PlanDraft, ItemDraft> =
  | FlowEditorCommitEffect<PlanDraft, ItemDraft>
  | Readonly<{
      type: 'show-discard-confirmation';
      event: FlowEditorCloseEvent;
      transactionId: string;
      level: FlowEditorLevel;
      returnPoint: FlowEditorReturnPoint;
      actions: readonly ['continue-editing', 'discard-changes'];
      labels: readonly ['계속 수정', '변경 버리기'];
      rearmHistoryBoundary: boolean;
    }>
  | Readonly<{
      type: 'restore-return-point';
      cause: FlowEditorRestoreCause;
      transactionId: string;
      level: FlowEditorLevel;
      returnPoint: FlowEditorReturnPoint;
    }>
  | Readonly<{
      type: 'focus-target';
      reason: 'validation' | 'commit-error';
      transactionId: string;
      target: string;
    }>
  | Readonly<{
      type: 'rearm-history-boundary';
      event: 'browser-back';
      transactionId: string;
      returnPoint: FlowEditorReturnPoint;
    }>
  | Readonly<{
      type: 'announce-close-blocked';
      event: FlowEditorCloseEvent;
      transactionId: string;
      message: string;
      rearmHistoryBoundary: boolean;
    }>;

export type FlowEditorTransition<PlanDraft, ItemDraft> = Readonly<{
  state: FlowEditorSession<PlanDraft, ItemDraft>;
  effects: readonly FlowEditorEffect<PlanDraft, ItemDraft>[];
}>;

export type FlowEditorEvent<PlanDraft, ItemDraft> =
  | Readonly<{
      type: 'open-item';
      input: OpenFlowEditorItemInput<ItemDraft>;
    }>
  | Readonly<{
      type: 'replace-plan-draft';
      draft: PlanDraft;
      validation: FlowEditorValidation;
    }>
  | Readonly<{
      type: 'replace-item-draft';
      draft: ItemDraft;
      validation: FlowEditorValidation;
    }>
  | Readonly<{
      type: 'request-close';
      event: FlowEditorCloseEvent;
    }>
  | Readonly<{
      type: 'continue-editing';
    }>
  | Readonly<{
      type: 'discard-changes';
    }>
  | Readonly<{
      type: 'request-commit';
      requestId: string;
    }>
  | Readonly<{
      type: 'commit-succeeded';
      transactionId: string;
      requestId: string;
      revision: number;
      result:
        | Readonly<{ kind: 'plan' }>
        | Readonly<{
            kind: 'item';
            parentDraft: PlanDraft;
            parentValidation: FlowEditorValidation;
          }>;
    }>
  | Readonly<{
      type: 'commit-failed';
      transactionId: string;
      requestId: string;
      revision: number;
      failure: FlowEditorFailure;
    }>
  | Readonly<{
      type: 'commit-recovery-required';
      transactionId: string;
      requestId: string;
      revision: number;
      failure: FlowEditorFailure & Readonly<{
        kind: 'storage';
        code: 'rollback_incomplete';
      }>;
    }>
  | Readonly<{
      type: 'settle-success';
    }>;

export type PreparedFlowEditorPlanCommit = Readonly<{
  /** Applies one already-snapshotted Plan effect. It may be async. */
  commit: () => void | Promise<void>;
  /** Restores the exact pre-commit snapshot and verifies it after commit throws. */
  rollbackAndVerify: () => boolean | Promise<boolean>;
}>;

export type FlowEditorPlanCommitInput<PlanDraft> = Readonly<{
  transactionId: string;
  requestId: string;
  revision: number;
  draft: Readonly<PlanDraft>;
}>;

export type FlowEditorCommitHandlers<PlanDraft, ItemDraft> = Readonly<{
  /** Preparation must be read-only; the returned operation owns atomic apply/rollback. */
  preparePublicDraft: (
    input: FlowEditorPlanCommitInput<PlanDraft>,
  ) => PreparedFlowEditorPlanCommit | Promise<PreparedFlowEditorPlanCommit>;
  applyItemToParentPublicDraft: (input: Readonly<{
    parentDraft: Readonly<PlanDraft>;
    itemDraft: Readonly<ItemDraft>;
  }>) =>
    | Readonly<{ draft: PlanDraft; validation: FlowEditorValidation }>
    | Promise<Readonly<{ draft: PlanDraft; validation: FlowEditorValidation }>>;
  /** Preparation must be read-only; the returned operation owns atomic apply/rollback. */
  preparePersonalOverlay: (
    input: FlowEditorPlanCommitInput<PlanDraft>,
  ) => PreparedFlowEditorPlanCommit | Promise<PreparedFlowEditorPlanCommit>;
  applyItemToParentPersonalDraft: (input: Readonly<{
    parentDraft: Readonly<PlanDraft>;
    itemDraft: Readonly<ItemDraft>;
  }>) =>
    | Readonly<{ draft: PlanDraft; validation: FlowEditorValidation }>
    | Promise<Readonly<{ draft: PlanDraft; validation: FlowEditorValidation }>>;
}>;

const DIRTY_GUARD_ACTIONS = ['continue-editing', 'discard-changes'] as const;
const DIRTY_GUARD_LABELS = ['계속 수정', '변경 버리기'] as const;
const FALLBACK_ERROR_FOCUS = '[data-editor-error-summary]';

function requireNonEmpty(value: string, label: string): string {
  if (!value.trim()) throw new TypeError(`${label} must not be empty`);
  return value;
}

function cloneValue<Value>(value: Value): Value {
  return structuredClone(value);
}

function cloneReturnPoint(returnPoint: FlowEditorReturnPoint): FlowEditorReturnPoint {
  requireNonEmpty(returnPoint.location.route, 'returnPoint.location.route');
  requireNonEmpty(returnPoint.focus.targetKey, 'returnPoint.focus.targetKey');
  for (const position of returnPoint.scroll) {
    requireNonEmpty(position.targetKey, 'returnPoint.scroll.targetKey');
    if (!Number.isFinite(position.left) || !Number.isFinite(position.top)) {
      throw new TypeError('returnPoint scroll coordinates must be finite');
    }
  }
  return cloneValue(returnPoint);
}

function assertValidation(validation: FlowEditorValidation): void {
  if (!validation.valid) requireNonEmpty(validation.firstErrorFocus, 'validation.firstErrorFocus');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function areFlowEditorDraftsEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((entry, index) => areFlowEditorDraftsEqual(entry, right[index]));
  }
  if (!isPlainObject(left) || !isPlainObject(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every(
    (key, index) => key === rightKeys[index] && areFlowEditorDraftsEqual(left[key], right[key]),
  );
}

function statusForDraft<Draft>(
  baseline: Readonly<Draft>,
  draft: Readonly<Draft>,
  validation: FlowEditorValidation,
): FlowEditorStatus {
  if (areFlowEditorDraftsEqual(baseline, draft)) return 'clean';
  return validation.valid ? 'dirty-valid' : 'dirty-invalid';
}

function createTransaction<Draft, Level extends FlowEditorLevel>(input: Readonly<{
  id: string;
  context: FlowEditorContext;
  level: Level;
  draft: Draft;
  returnPoint: FlowEditorReturnPoint;
}>): FlowEditorTransaction<Draft, Level> {
  requireNonEmpty(input.id, 'transaction id');
  const baseline = cloneValue(input.draft);
  return {
    id: input.id,
    context: input.context,
    level: input.level,
    baseline,
    draft: cloneValue(baseline),
    revision: 0,
    status: 'clean',
    validation: { valid: true },
    returnPoint: cloneReturnPoint(input.returnPoint),
  };
}

export function createFlowEditorSession<PlanDraft, ItemDraft = never>(
  input: OpenFlowEditorPlanInput<PlanDraft>,
): FlowEditorSession<PlanDraft, ItemDraft> {
  return {
    context: input.context,
    plan: createTransaction({
      id: input.id,
      context: input.context,
      level: 'plan',
      draft: input.draft,
      returnPoint: input.returnPoint,
    }),
    item: null,
  };
}

export function getActiveFlowEditorTransaction<PlanDraft, ItemDraft>(
  state: FlowEditorSession<PlanDraft, ItemDraft>,
):
  | FlowEditorTransaction<PlanDraft, 'plan'>
  | FlowEditorTransaction<ItemDraft, 'item'>
  | null {
  return state.item ?? state.plan;
}

export function getFlowEditorCommitRole(
  context: FlowEditorContext,
  level: FlowEditorLevel,
): FlowEditorCommitRole {
  if (context === 'public-draft') {
    return level === 'plan'
      ? 'apply-public-draft'
      : 'apply-item-to-parent-public-draft';
  }
  return level === 'plan'
    ? 'save-personal-overlay'
    : 'apply-item-to-parent-personal-draft';
}

function unchanged<PlanDraft, ItemDraft>(
  state: FlowEditorSession<PlanDraft, ItemDraft>,
): FlowEditorTransition<PlanDraft, ItemDraft> {
  return { state, effects: [] };
}

function clearTransactionTransient<Transaction extends Readonly<{
  pendingClose?: FlowEditorPendingClose;
  submission?: FlowEditorSubmission;
  failure?: FlowEditorFailure;
}>>(
  transaction: Transaction,
): Omit<Transaction, 'pendingClose' | 'submission' | 'failure'> {
  const {
    pendingClose: _pendingClose,
    submission: _submission,
    failure: _failure,
    ...stable
  } = transaction;
  return stable;
}

function replaceActiveTransaction<PlanDraft, ItemDraft>(
  state: FlowEditorSession<PlanDraft, ItemDraft>,
  transaction:
    | FlowEditorTransaction<PlanDraft, 'plan'>
    | FlowEditorTransaction<ItemDraft, 'item'>,
): FlowEditorSession<PlanDraft, ItemDraft> {
  if (transaction.level === 'item') {
    return {
      ...state,
      item: transaction as FlowEditorTransaction<ItemDraft, 'item'>,
    };
  }
  return {
    ...state,
    plan: transaction as FlowEditorTransaction<PlanDraft, 'plan'>,
  };
}

function closeActiveTransaction<PlanDraft, ItemDraft>(
  state: FlowEditorSession<PlanDraft, ItemDraft>,
  cause: FlowEditorRestoreCause,
): FlowEditorTransition<PlanDraft, ItemDraft> {
  const active = getActiveFlowEditorTransaction(state);
  if (!active) return unchanged(state);
  return {
    state: state.item
      ? { ...state, item: null }
      : { ...state, plan: null, item: null },
    effects: [{
      type: 'restore-return-point',
      cause,
      transactionId: active.id,
      level: active.level,
      returnPoint: cloneReturnPoint(active.returnPoint),
    }],
  };
}

function replaceDraft<Draft, Level extends FlowEditorLevel>(
  transaction: FlowEditorTransaction<Draft, Level>,
  draft: Draft,
  validation: FlowEditorValidation,
): FlowEditorTransaction<Draft, Level> {
  assertValidation(validation);
  const nextDraft = cloneValue(draft);
  const stable = clearTransactionTransient(transaction);
  return {
    ...stable,
    draft: nextDraft,
    revision: transaction.revision + 1,
    status: statusForDraft(transaction.baseline, nextDraft, validation),
    validation: cloneValue(validation),
  };
}

function buildCommitEffect<PlanDraft, ItemDraft>(
  state: FlowEditorSession<PlanDraft, ItemDraft>,
  active:
    | FlowEditorTransaction<PlanDraft, 'plan'>
    | FlowEditorTransaction<ItemDraft, 'item'>,
  requestId: string,
): FlowEditorCommitEffect<PlanDraft, ItemDraft> {
  const role = getFlowEditorCommitRole(state.context, active.level);
  if (active.level === 'plan') {
    return {
      type: 'commit',
      role: role as FlowEditorPlanCommitEffect<PlanDraft>['role'],
      context: state.context,
      level: 'plan',
      transactionId: active.id,
      requestId,
      revision: active.revision,
      draft: cloneValue(active.draft),
    };
  }
  if (!state.plan) throw new Error('Item editor transaction requires a parent Plan transaction.');
  return {
    type: 'commit',
    role: role as FlowEditorItemCommitEffect<PlanDraft, ItemDraft>['role'],
    context: state.context,
    level: 'item',
    transactionId: active.id,
    parentTransactionId: state.plan.id,
    requestId,
    revision: active.revision,
    parentDraft: cloneValue(state.plan.draft),
    draft: cloneValue(active.draft),
  };
}

export function reduceFlowEditorSession<PlanDraft, ItemDraft>(
  state: FlowEditorSession<PlanDraft, ItemDraft>,
  event: FlowEditorEvent<PlanDraft, ItemDraft>,
): FlowEditorTransition<PlanDraft, ItemDraft> {
  const active = getActiveFlowEditorTransaction(state);

  switch (event.type) {
    case 'open-item': {
      if (
        !state.plan ||
        state.item ||
        state.plan.pendingClose ||
        state.plan.status === 'submitting' ||
        state.plan.status === 'success' ||
        state.plan.status === 'recovery-required'
      ) return unchanged(state);
      if (event.input.id === state.plan.id) return unchanged(state);
      return {
        state: {
          ...state,
          item: createTransaction({
            id: event.input.id,
            context: state.context,
            level: 'item',
            draft: event.input.draft,
            returnPoint: event.input.returnPoint,
          }),
        },
        effects: [],
      };
    }

    case 'replace-plan-draft': {
      if (!state.plan || state.item || state.plan.pendingClose) return unchanged(state);
      if (
        state.plan.status === 'submitting' ||
        state.plan.status === 'success' ||
        state.plan.status === 'recovery-required'
      ) return unchanged(state);
      return {
        state: {
          ...state,
          plan: replaceDraft(state.plan, event.draft, event.validation),
        },
        effects: [],
      };
    }

    case 'replace-item-draft': {
      if (!state.item || state.item.pendingClose) return unchanged(state);
      if (
        state.item.status === 'submitting' ||
        state.item.status === 'success' ||
        state.item.status === 'recovery-required'
      ) return unchanged(state);
      return {
        state: {
          ...state,
          item: replaceDraft(state.item, event.draft, event.validation),
        },
        effects: [],
      };
    }

    case 'request-close': {
      if (!active || active.pendingClose) return unchanged(state);
      if (active.status === 'submitting' || active.status === 'recovery-required') {
        const effects: FlowEditorEffect<PlanDraft, ItemDraft>[] = [];
        if (event.event === 'browser-back') {
          effects.push({
            type: 'rearm-history-boundary',
            event: 'browser-back',
            transactionId: active.id,
            returnPoint: cloneReturnPoint(active.returnPoint),
          });
        }
        effects.push({
          type: 'announce-close-blocked',
          event: event.event,
          transactionId: active.id,
          message: active.status === 'recovery-required'
            ? '저장 상태를 확인해야 합니다. 이 화면을 닫지 말고 복구 안내를 따라 주세요.'
            : '변경을 저장하는 중입니다.',
          rearmHistoryBoundary: event.event === 'browser-back',
        });
        return { state, effects };
      }
      if (
        active.status === 'dirty-valid' ||
        active.status === 'dirty-invalid' ||
        active.status === 'recoverable-error'
      ) {
        const nextActive = {
          ...active,
          pendingClose: { event: event.event },
        } as typeof active;
        const effects: FlowEditorEffect<PlanDraft, ItemDraft>[] = [];
        if (event.event === 'browser-back') {
          effects.push({
            type: 'rearm-history-boundary',
            event: 'browser-back',
            transactionId: active.id,
            returnPoint: cloneReturnPoint(active.returnPoint),
          });
        }
        effects.push({
          type: 'show-discard-confirmation',
          event: event.event,
          transactionId: active.id,
          level: active.level,
          returnPoint: cloneReturnPoint(active.returnPoint),
          actions: DIRTY_GUARD_ACTIONS,
          labels: DIRTY_GUARD_LABELS,
          rearmHistoryBoundary: event.event === 'browser-back',
        });
        return {
          state: replaceActiveTransaction(state, nextActive),
          effects,
        };
      }
      return closeActiveTransaction(state, event.event);
    }

    case 'continue-editing': {
      if (!active?.pendingClose) return unchanged(state);
      const { pendingClose: _pendingClose, ...nextActive } = active;
      return {
        state: replaceActiveTransaction(state, nextActive as typeof active),
        effects: [],
      };
    }

    case 'discard-changes': {
      if (!active?.pendingClose) return unchanged(state);
      return closeActiveTransaction(state, active.pendingClose.event);
    }

    case 'request-commit': {
      if (!active || active.pendingClose) return unchanged(state);
      if (
        active.status === 'submitting' ||
        active.status === 'success' ||
        active.status === 'recovery-required'
      ) return unchanged(state);
      if (active.status === 'dirty-invalid') {
        if (active.validation.valid) return unchanged(state);
        return {
          state,
          effects: [{
            type: 'focus-target',
            reason: 'validation',
            transactionId: active.id,
            target: active.validation.firstErrorFocus,
          }],
        };
      }
      requireNonEmpty(event.requestId, 'requestId');
      if (active.status === 'clean') {
        const stable = clearTransactionTransient(active);
        return {
          state: replaceActiveTransaction(state, {
            ...stable,
            status: 'success',
          } as typeof active),
          effects: [],
        };
      }
      const previousAttempt = active.submission?.attempt ?? 0;
      const submission: FlowEditorSubmission = {
        requestId: event.requestId,
        revision: active.revision,
        attempt: previousAttempt + 1,
      };
      const stable = clearTransactionTransient(active);
      const submitting = {
        ...stable,
        status: 'submitting',
        submission,
      } as typeof active;
      return {
        state: replaceActiveTransaction(state, submitting),
        effects: [buildCommitEffect(state, active, event.requestId)],
      };
    }

    case 'commit-succeeded': {
      if (
        !active ||
        active.status !== 'submitting' ||
        active.id !== event.transactionId ||
        active.submission?.requestId !== event.requestId ||
        active.submission.revision !== event.revision
      ) return unchanged(state);
      if (active.level === 'plan') {
        if (event.result.kind !== 'plan') return unchanged(state);
        const stable = clearTransactionTransient(active);
        return {
          state: replaceActiveTransaction(state, {
            ...stable,
            status: 'success',
          }),
          effects: [],
        };
      }
      if (event.result.kind !== 'item' || !state.plan || !state.item) return unchanged(state);
      assertValidation(event.result.parentValidation);
      const nextParentDraft = cloneValue(event.result.parentDraft);
      const parentStable = clearTransactionTransient(state.plan);
      const childStable = clearTransactionTransient(state.item);
      return {
        state: {
          ...state,
          plan: {
            ...parentStable,
            draft: nextParentDraft,
            revision: state.plan.revision + 1,
            status: statusForDraft(
              state.plan.baseline,
              nextParentDraft,
              event.result.parentValidation,
            ),
            validation: cloneValue(event.result.parentValidation),
          },
          item: {
            ...childStable,
            status: 'success',
          },
        },
        effects: [],
      };
    }

    case 'commit-failed': {
      if (
        !active ||
        active.status !== 'submitting' ||
        active.id !== event.transactionId ||
        active.submission?.requestId !== event.requestId ||
        active.submission.revision !== event.revision
      ) return unchanged(state);
      requireNonEmpty(event.failure.firstErrorFocus, 'failure.firstErrorFocus');
      const {
        pendingClose: _pendingClose,
        failure: _failure,
        ...stable
      } = active;
      const recoveryRequired =
        event.failure.kind === 'storage' && event.failure.code === 'rollback_incomplete';
      return {
        state: replaceActiveTransaction(state, {
          ...stable,
          status: recoveryRequired ? 'recovery-required' : 'recoverable-error',
          failure: cloneValue(event.failure),
        } as typeof active),
        effects: [{
          type: 'focus-target',
          reason: 'commit-error',
          transactionId: active.id,
          target: event.failure.firstErrorFocus,
        }],
      };
    }

    case 'commit-recovery-required': {
      if (
        !active ||
        active.status !== 'submitting' ||
        active.id !== event.transactionId ||
        active.submission?.requestId !== event.requestId ||
        active.submission.revision !== event.revision
      ) return unchanged(state);
      requireNonEmpty(event.failure.firstErrorFocus, 'failure.firstErrorFocus');
      const {
        pendingClose: _pendingClose,
        failure: _failure,
        ...stable
      } = active;
      return {
        state: replaceActiveTransaction(state, {
          ...stable,
          status: 'recovery-required',
          failure: cloneValue(event.failure),
        } as typeof active),
        effects: [{
          type: 'focus-target',
          reason: 'commit-error',
          transactionId: active.id,
          target: event.failure.firstErrorFocus,
        }],
      };
    }

    case 'settle-success': {
      if (active?.status !== 'success') return unchanged(state);
      return closeActiveTransaction(state, 'commit-success');
    }
  }
}

function normalizeCommitFailure(error: unknown): FlowEditorFailure {
  if (error && typeof error === 'object') {
    const candidate = error as Partial<FlowEditorFailure>;
    const kind = candidate.kind === 'validation' || candidate.kind === 'storage'
      ? candidate.kind
      : 'runtime';
    return {
      kind,
      code: typeof candidate.code === 'string' && candidate.code.trim()
        ? candidate.code
        : `${kind}_error`,
      message: typeof candidate.message === 'string' && candidate.message.trim()
        ? candidate.message
        : '변경을 반영하지 못했습니다. 입력 내용은 그대로 유지됩니다.',
      firstErrorFocus:
        typeof candidate.firstErrorFocus === 'string' && candidate.firstErrorFocus.trim()
          ? candidate.firstErrorFocus
          : FALLBACK_ERROR_FOCUS,
    };
  }
  return {
    kind: 'runtime',
    code: 'runtime_error',
    message: error instanceof Error && error.message.trim()
      ? error.message
      : '변경을 반영하지 못했습니다. 입력 내용은 그대로 유지됩니다.',
    firstErrorFocus: FALLBACK_ERROR_FOCUS,
  };
}

function commitFailureEvent<PlanDraft, ItemDraft>(
  effect: FlowEditorCommitEffect<PlanDraft, ItemDraft>,
  error: unknown,
): Extract<
  FlowEditorEvent<PlanDraft, ItemDraft>,
  { type: 'commit-failed' }
> {
  return {
    type: 'commit-failed',
    transactionId: effect.transactionId,
    requestId: effect.requestId,
    revision: effect.revision,
    failure: normalizeCommitFailure(error),
  };
}

function commitRecoveryRequiredEvent<PlanDraft, ItemDraft>(
  effect: FlowEditorCommitEffect<PlanDraft, ItemDraft>,
): Extract<
  FlowEditorEvent<PlanDraft, ItemDraft>,
  { type: 'commit-recovery-required' }
> {
  return {
    type: 'commit-recovery-required',
    transactionId: effect.transactionId,
    requestId: effect.requestId,
    revision: effect.revision,
    failure: {
      kind: 'storage',
      code: 'rollback_incomplete',
      message: '저장 전 상태를 완전히 복구하지 못했습니다.',
      firstErrorFocus: FALLBACK_ERROR_FOCUS,
    },
  };
}

async function executePreparedPlanCommit<PlanDraft, ItemDraft>(input: Readonly<{
  effect: FlowEditorPlanCommitEffect<PlanDraft>;
  requiresStorageLock: boolean;
  prepare: (
    input: FlowEditorPlanCommitInput<PlanDraft>,
  ) => PreparedFlowEditorPlanCommit | Promise<PreparedFlowEditorPlanCommit>;
}>): Promise<Extract<
  FlowEditorEvent<PlanDraft, ItemDraft>,
  { type: 'commit-succeeded' | 'commit-failed' | 'commit-recovery-required' }
>> {
  const execute = async () => {
    let operation: PreparedFlowEditorPlanCommit;
    try {
      operation = await input.prepare({
        transactionId: input.effect.transactionId,
        requestId: input.effect.requestId,
        revision: input.effect.revision,
        draft: cloneValue(input.effect.draft),
      });
    } catch (error) {
      // Preparation is contractually read-only, so no rollback is needed.
      return commitFailureEvent<PlanDraft, ItemDraft>(input.effect, error);
    }

    try {
      await operation.commit();
    } catch (error) {
      try {
        const restored = await operation.rollbackAndVerify();
        if (!restored) {
          return commitRecoveryRequiredEvent<PlanDraft, ItemDraft>(input.effect);
        }
      } catch {
        return commitRecoveryRequiredEvent<PlanDraft, ItemDraft>(input.effect);
      }
      return commitFailureEvent<PlanDraft, ItemDraft>(input.effect, error);
    }

    return {
      type: 'commit-succeeded' as const,
      transactionId: input.effect.transactionId,
      requestId: input.effect.requestId,
      revision: input.effect.revision,
      result: { kind: 'plan' as const },
    };
  };

  if (!input.requiresStorageLock) return execute();

  const locked = await withFlowUserDataWriteLock(execute);

  if (!locked.ok) {
    return commitFailureEvent<PlanDraft, ItemDraft>(
      input.effect,
      locked.error ?? new Error(`Flow user-data write lock ${locked.reason}`),
    );
  }
  return locked.value;
}

export async function executeFlowEditorCommit<PlanDraft, ItemDraft>(
  effect: FlowEditorCommitEffect<PlanDraft, ItemDraft>,
  handlers: FlowEditorCommitHandlers<PlanDraft, ItemDraft>,
): Promise<Extract<
  FlowEditorEvent<PlanDraft, ItemDraft>,
  { type: 'commit-succeeded' | 'commit-failed' | 'commit-recovery-required' }
>> {
  try {
    switch (effect.role) {
      case 'apply-public-draft':
        return executePreparedPlanCommit<PlanDraft, ItemDraft>({
          effect,
          requiresStorageLock: false,
          prepare: handlers.preparePublicDraft,
        });
      case 'save-personal-overlay':
        return executePreparedPlanCommit<PlanDraft, ItemDraft>({
          effect,
          requiresStorageLock: true,
          prepare: handlers.preparePersonalOverlay,
        });
      case 'apply-item-to-parent-public-draft': {
        const result = await handlers.applyItemToParentPublicDraft({
          parentDraft: cloneValue(effect.parentDraft),
          itemDraft: cloneValue(effect.draft),
        });
        assertValidation(result.validation);
        return {
          type: 'commit-succeeded',
          transactionId: effect.transactionId,
          requestId: effect.requestId,
          revision: effect.revision,
          result: {
            kind: 'item',
            parentDraft: cloneValue(result.draft),
            parentValidation: cloneValue(result.validation),
          },
        };
      }
      case 'apply-item-to-parent-personal-draft': {
        const result = await handlers.applyItemToParentPersonalDraft({
          parentDraft: cloneValue(effect.parentDraft),
          itemDraft: cloneValue(effect.draft),
        });
        assertValidation(result.validation);
        return {
          type: 'commit-succeeded',
          transactionId: effect.transactionId,
          requestId: effect.requestId,
          revision: effect.revision,
          result: {
            kind: 'item',
            parentDraft: cloneValue(result.draft),
            parentValidation: cloneValue(result.validation),
          },
        };
      }
    }
  } catch (error) {
    return commitFailureEvent(effect, error);
  }
}

export function selectFlowEditorAdapter<Adapter>(input: Readonly<{
  enabled: boolean;
  shared: Adapter;
  legacy: Adapter;
}>): Adapter {
  return input.enabled ? input.shared : input.legacy;
}
