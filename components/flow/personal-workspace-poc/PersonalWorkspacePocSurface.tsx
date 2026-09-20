'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

import { buildDateGroupedTodoListViewModel } from '@/lib/flow/date-grouped-todo-list';
import {
  beginAttempt,
  beginContextualUndo,
  createResultOwnerSession,
  dismissResult,
  interruptOwner,
  selectResult,
  settleAttempt,
  settleUndo,
  type ResultFacts,
  type ResultIntent,
  type ResultOutcome,
  type ResultOwnerState,
  type ResultTicket,
} from '@/lib/flow/personal-workspace-poc-contextual-result';
import { composePersonalWorkspacePocReadModel } from '@/lib/flow/personal-workspace-poc-composition';
import {
  buildPersonalWorkspacePocSourceReadIndex,
  readPersonalWorkspacePocTaskSourceContext,
} from '@/lib/flow/personal-workspace-poc-source-attributes';
import { getPersonalWorkspacePocItemDetails } from '@/lib/flow/personal-workspace-poc-item-details';
import { getPersonalWorkspacePocInheritedMemo } from '@/lib/flow/personal-workspace-poc-plan-memo-baseline';
import {
  PERSONAL_WORKSPACE_POC_DEFAULTS,
  PERSONAL_WORKSPACE_POC_STATE_KEY,
  toPersonalWorkspacePocQuickItemRef,
  type PersonalWorkspacePocAuthoredFlow,
  type PersonalWorkspacePocFlow,
  type PersonalWorkspacePocReadModel,
  type PersonalWorkspacePocState,
  type PersonalWorkspacePocTrashEntry,
  type PersonalWorkspacePocTransition,
} from '@/lib/flow/personal-workspace-poc-contract';
import {
  composePersonalWorkspacePocEffectiveSourceFlows,
  getPersonalWorkspacePocEffectiveSourceFlow,
} from '@/lib/flow/personal-workspace-poc-canonical-ownership';
import { loadPersonalWorkspacePocSourceCandidateStore, savePersonalWorkspacePocSourceCandidateStore } from '@/lib/flow/personal-workspace-poc-source-candidate-storage';
import {
  PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY,
  applyPersonalWorkspacePocSourceCandidate,
  clearPersonalWorkspacePocSourceCandidateChangeResolution,
  createPersonalWorkspacePocCurrentSourceFromAuthoredFlow,
  createPersonalWorkspacePocLocalFixtureEnvelope,
  createPersonalWorkspacePocSourceCandidateStore,
  deferPersonalWorkspacePocSourceCandidate,
  inspectPersonalWorkspacePocSourceCandidateCatalog,
  isPersonalWorkspacePocSourceCandidateStore,
  resolvePersonalWorkspacePocSourceCandidateChange,
  stagePersonalWorkspacePocSourceCandidate,
  undoPersonalWorkspacePocSourceCandidate,
  type PersonalWorkspacePocSourceCandidateEnvelope,
  type PersonalWorkspacePocSourceCandidateCurrentSource,
  type PersonalWorkspacePocSourceCandidateStore,
} from '@/lib/flow/personal-workspace-poc-source-candidates';
import {
  applyPersonalWorkspacePocTransition,
  createPersonalWorkspacePocState,
  getPersonalWorkspacePocEffectiveDate,
  getPersonalWorkspacePocFolderId,
  isPersonalWorkspacePocState,
  isPersonalWorkspacePocCompleted,
  isPersonalWorkspacePocDate,
  isPersonalWorkspacePocMemberInactive,
  validatePersonalWorkspacePocStateReferences,
} from '@/lib/flow/personal-workspace-poc-state';
import {
  buildPersonalWorkspacePocCopyDisambiguation,
  getPersonalWorkspacePocFlowDisplayTitle,
} from '@/lib/flow/personal-workspace-poc-copy-disambiguation';
import {
  resetPersonalWorkspacePocStorage,
  type PersonalWorkspacePocStorage,
} from '@/lib/flow/personal-workspace-poc-storage';
import {
  commitPersonalWorkspacePocStorage,
  preparePersonalWorkspacePocStorageCommit,
} from '@/lib/flow/personal-workspace-poc-storage-transaction';
import {
  createPersonalWorkspacePocPlanEditorHandlers,
  canonicalPersonalWorkspacePocPlanEditorBytes,
  fingerprintPersonalWorkspacePocPlanEditorBytes,
  isPersonalWorkspacePocPlanNoopPreparedCommit,
  openPersonalWorkspacePocPlanEditor,
  openPersonalWorkspacePocPlanItemEditor,
  validatePersonalWorkspacePocPlanDraft,
  validatePersonalWorkspacePocPlanItemDraft,
  type PersonalWorkspacePocPlanDraft,
  type PersonalWorkspacePocPlanItemDraft,
  type PersonalWorkspacePocPlanTrustedOpenGuard,
} from '@/lib/flow/personal-workspace-poc-plan-editor';
import {
  summarizePersonalWorkspacePocPlanDraftChanges,
} from '@/lib/flow/personal-workspace-poc-editor-receipt';
import {
  createPersonalWorkspacePocPlanDisplay,
  type PersonalWorkspacePocPlanDisplay,
  type PersonalWorkspacePocPlanDisplayInput,
} from '@/lib/flow/personal-workspace-poc-plan-display';
import { PersonalWorkspacePocPlanResultSurface } from './PersonalWorkspacePocPlanResultSurface';
import {
  createPersonalWorkspacePocEditorEvidenceStorage,
  createPersonalWorkspacePocEditorStorageEvidence,
  instrumentPersonalWorkspacePocEditorStorageCommit,
  isPersonalWorkspacePocEditorStateRawCurrent,
  resolvePersonalWorkspacePocEditorFailureEvidence,
  type PersonalWorkspacePocEditorStorageEvidence,
} from '@/lib/flow/personal-workspace-poc-editor-storage-evidence';
import {
  createPersonalWorkspacePocReceipt,
  transitionPersonalWorkspacePocReceipt,
  type PersonalWorkspacePocReceipt,
  type PersonalWorkspacePocReceiptChange,
  type PersonalWorkspacePocReceiptInput,
  type PersonalWorkspacePocReceiptReturnContext,
} from '@/lib/flow/personal-workspace-poc-receipt';
import {
  buildPersonalWorkspacePocResultProjection,
  selectPersonalWorkspacePocResultFlow,
  type PersonalWorkspacePocResultNavigationState,
} from '@/lib/flow/personal-workspace-poc-result-projection';
import type {
  FlowEditorCommitHandlers,
  FlowEditorFailure,
  FlowEditorValidation,
} from '@/lib/flow/flow-editor-transaction';
import { withFlowUserDataWriteLock } from '@/lib/flow/storage-write-lock';
import {
  buildPersonalWorkspacePocTaskGroups,
  buildPersonalWorkspacePocTasks,
  getPersonalWorkspacePocFolderPath,
  type PersonalWorkspacePocTask,
  type PersonalWorkspacePocTaskGroup,
  type PersonalWorkspacePocView,
} from '@/lib/flow/personal-workspace-poc-view-model';
import { materializePersonalWorkspacePocQuickConversion } from '@/lib/flow/personal-workspace-poc-quick-conversion';
import { resolvePlanExecutionWorkspaceComposition } from '@/lib/flow/responsive-execution-workspace';

import { FlowBottomSheet } from '../FlowExecutionPrimitives';
import { MyPlanExecutionSurface } from '../my-flow/MyPlanExecutionSurface';
import {
  captureFlowEditorReturnPoint,
  useFlowEditorController,
} from '../useFlowEditorController';
import {
  PersonalWorkspacePocItemEditorSurface,
  PersonalWorkspacePocPlanEditorSurface,
  type PersonalWorkspacePocEditorImpactChange,
  type PersonalWorkspacePocQuickItemRootDraft,
} from './PersonalWorkspacePocEditorSurface';
import { PersonalWorkspacePocReceiptSurface } from './PersonalWorkspacePocReceiptSurface';
import { PersonalWorkspacePocResultPresenter } from './PersonalWorkspacePocResultPresenter';
import { PersonalWorkspacePocProductShell } from './PersonalWorkspacePocProductShell';
import {
  PersonalWorkspacePocSourceUpdateReview,
  type PersonalWorkspacePocSourceUpdateChange,
  type PersonalWorkspacePocSourceUpdateResolution,
  type PersonalWorkspacePocSourceUpdateStatus,
} from './PersonalWorkspacePocSourceUpdateReview';

type PersonalWorkspacePocSurfaceProps = Readonly<{
  initialModel: PersonalWorkspacePocReadModel;
  initialState: PersonalWorkspacePocState;
  initialSourceCandidateStore: PersonalWorkspacePocSourceCandidateStore;
  initialSourceCandidateRaw: string | null;
  restored: boolean;
}>;

type WorkspaceSection = 'folder' | 'trash' | PersonalWorkspacePocView;

type TransactionStatus = {
  kind: 'ready' | 'saving' | 'success' | 'neutral' | 'failure' | 'canceled';
  message: string;
  receiptStatus?: PersonalWorkspacePocReceipt['status'];
};

type PersonalWorkspacePocEditorKind = 'plan' | 'quick-item';

type PersonalWorkspacePocEditorOwner = {
  kind: PersonalWorkspacePocEditorKind;
  phase: 'open' | 'closing';
};

type PersonalWorkspacePocEditorHistoryMarker = Readonly<{
  kind: PersonalWorkspacePocEditorKind;
  level: 'plan' | 'item';
  scopeRef: string;
}>;

type PersonalWorkspacePocEditorAttempt = Readonly<{
  intentId: string;
  operation: 'commit-personal-plan' | 'commit-quick-item-root';
  scopeRef: string;
  stateRevisionBefore: number;
  affectedRefs: readonly string[];
  changes: readonly PersonalWorkspacePocReceiptChange[];
  retryDescriptor: PersonalWorkspacePocEditorRetryDescriptor;
}>;

type PersonalWorkspacePocEditorRetryDescriptor = Readonly<{
  payload: Readonly<{
    kind: 'personal-plan-draft' | 'quick-item-root-draft';
    fingerprint: string;
  }>;
  guard: Readonly<{
    kind: 'trusted-plan-open' | 'quick-state-open';
    fingerprint: string;
    openedStateRevision: number;
  }>;
}>;

type PlanDisplayBinding = {
  attempt: PersonalWorkspacePocEditorAttempt;
  sourceFlow: PersonalWorkspacePocFlow;
  sourceRaw: string | null;
  sourceEpoch: number;
  screenKey: string;
  returnFocusSelector: string;
  transactionId: string;
  draftRevision: number;
  requestId?: string;
  evidence?: PersonalWorkspacePocEditorStorageEvidence;
  noopAccepted?: boolean;
  accepted: boolean;
};

type PlanResultOwner = {
  display: PersonalWorkspacePocPlanDisplay;
  binding: PlanDisplayBinding;
  exactRaw: string;
  consumed: boolean;
};

type PersonalWorkspacePocQuickEditorBaseline = Readonly<{
  draft: PersonalWorkspacePocQuickItemRootDraft;
  stateRevision: number;
  stateRaw: string | null;
}>;

type PersonalWorkspacePocQuickConversionAttempt = Readonly<{
  intentId: string;
  quickItemRef: string;
  flowTitle: string;
  stateRevisionBefore: number;
  affectedRefs: readonly string[];
  changes: readonly PersonalWorkspacePocReceiptChange[];
}>;

type TaskMoveTarget = {
  kind: 'task';
  task: PersonalWorkspacePocTask;
  group?: PersonalWorkspacePocTaskGroup;
};

type FlowMoveTarget = {
  kind: 'flow';
  flow: PersonalWorkspacePocFlow;
};

type MoveTarget = TaskMoveTarget | FlowMoveTarget;

type PersonalWorkspacePocTrashRow = Readonly<{
  entry: PersonalWorkspacePocTrashEntry;
  title: string;
  itemRefs: readonly string[];
}>;

export type MoveTriggerSource = 'task-title' | 'task-handle' | 'task-more' | 'flow-handle' | 'flow-card' | 'flow-detail' | 'item-detail';
type TransitionOutcome = 'changed' | 'unchanged' | 'failed';
// Rendering position only: never a task, timeline group, or stored Undo snapshot.
type WorkspaceResultOrigin = {
  section: WorkspaceSection;
  folderId?: string;
  flowRef?: string;
  itemDetailRef?: string;
  kind: 'flow' | 'task';
  ref: string;
  group?: PersonalWorkspacePocTaskGroup;
  groupIndex: number;
  rowIndex: number;
  returnSelector: string;
  keyboard: boolean;
  scrollTop: number;
};
export type PersonalWorkspacePocReorderPosition = 'before' | 'after';
export type PersonalWorkspacePocReorderControl = 'top' | 'previous' | 'next' | 'bottom';

export type PersonalWorkspacePocReorderResolution =
  | { kind: 'changed'; position: PersonalWorkspacePocReorderPosition; orderedRefKeys: string[]; message: string }
  | { kind: 'current'; message: string }
  | { kind: 'invalid'; message: string };

type PersonalWorkspacePocReorderPreview = Readonly<{
  targetRef: string;
  position: PersonalWorkspacePocReorderPosition;
  orderedRefKeys: string[];
  message: string;
}>;

type PersonalWorkspacePocMoveDropFeedback = Readonly<{
  kind: 'date' | 'folder';
  targetKey: string;
  outcome: 'valid' | 'current' | 'invalid';
}>;

type PersonalWorkspacePocActiveMoveSession = {
  mode: 'pointer' | 'native';
  target: MoveTarget;
  lastX: number;
  lastY: number;
  moved: boolean;
};

type PersonalWorkspacePocActiveMoveResolution =
  | { kind: 'reorder'; resolution: PersonalWorkspacePocReorderResolution }
  | { kind: 'date'; date?: string; changed: boolean; message: string }
  | { kind: 'folder'; folderId?: string; changed: boolean; message: string }
  | { kind: 'invalid'; message: string };

const TARGET_CLASS = 'min-h-12 rounded-md px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] disabled:cursor-not-allowed disabled:opacity-50';
const SECONDARY_CLASS = `${TARGET_CLASS} border border-[var(--flowme-border-strong)] bg-white text-[var(--flowme-action)]`;
const PRIMARY_CLASS = `${TARGET_CLASS} bg-[var(--flowme-action)] text-white`;
const PERSONAL_WORKSPACE_POC_BOTTOM_SHEET_SAFE_STYLE: CSSProperties = {
  left: 'calc(var(--personal-workspace-visual-viewport-left, 0px) + var(--personal-workspace-safe-left))',
  right: 'calc(var(--personal-workspace-visual-viewport-right, 0px) + var(--personal-workspace-safe-right))',
  bottom: 'calc(var(--personal-workspace-visual-viewport-bottom, 0px) + var(--personal-workspace-safe-bottom))',
  maxHeight: 'calc(min(86dvh, var(--personal-workspace-visual-viewport-height, 86dvh)) - var(--personal-workspace-safe-top) - var(--personal-workspace-safe-bottom))',
  paddingBottom: 'calc(1rem + var(--personal-workspace-safe-bottom))',
  scrollPaddingBottom: 'calc(1rem + var(--personal-workspace-safe-bottom))',
};

/** A deterministic local host fixture. It never fetches or rewrites an operating source. */
export function buildPersonalWorkspacePocSourceUpdateFixtureRaw(rawText: string): string {
  const lines = rawText.split('\n');
  const titleIndex = lines.findIndex((line) => /^#\s+\S/u.test(line));
  if (titleIndex >= 0) lines[titleIndex] = `${lines[titleIndex]} · 최신 안내`;
  const itemIndex = lines.findIndex((line) => /^- \[[ xX]\] \S/u.test(line));
  if (itemIndex >= 0) lines[itemIndex] = `${lines[itemIndex]} (확인 내용 갱신)`;
  const suffix = lines.at(-1) === '' ? '' : '\n';
  return `${lines.join('\n')}${suffix}- [ ] 새 원문 변경 확인하기`;
}

/** Explicit refresh only. Conflicting same-ID history is never silently chosen. */
export function mergePersonalWorkspacePocSourcePracticeMemory(
  durable: PersonalWorkspacePocSourceCandidateStore,
  working: PersonalWorkspacePocSourceCandidateStore,
  base: PersonalWorkspacePocSourceCandidateStore,
): PersonalWorkspacePocSourceCandidateStore | undefined {
  if (!isPersonalWorkspacePocSourceCandidateStore(durable)
    || !isPersonalWorkspacePocSourceCandidateStore(working)
    || !isPersonalWorkspacePocSourceCandidateStore(base)) return undefined;
  // Local deletion has no C2 transition/merge policy. Do not resurrect it from
  // the durable store or silently treat it as a supported deletion intent.
  if (Object.keys(base.envelopes).some(id => !Object.hasOwn(working.envelopes, id))
    || Object.keys(base.reviews).some(id => !Object.hasOwn(working.reviews, id))) return undefined;
  const envelopes = { ...durable.envelopes }, reviews = { ...durable.reviews };
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  for (const [id, value] of Object.entries(working.envelopes)) {
    if (same(value, base.envelopes[id])) continue;
    if (!same(envelopes[id], base.envelopes[id]) && !same(envelopes[id], value)) return undefined;
    envelopes[id] = value;
  }
  for (const [id, value] of Object.entries(working.reviews)) {
    if (same(value, base.reviews[id])) continue;
    if (!same(reviews[id], base.reviews[id]) && !same(reviews[id], value)) return undefined;
    reviews[id] = value;
  }
  const next = { ...durable, envelopes, reviews };
  return isPersonalWorkspacePocSourceCandidateStore(next) ? next : undefined;
}

type SourcePracticeOwner = {
  routeOwner: object;
  flowRef: string;
  candidateId: string;
  screenKey: string;
  href: string;
  sourceRaw: string | null;
  workspaceRaw: string | null;
  sourceEpoch: number;
  workspaceEpoch: number;
  current: PersonalWorkspacePocSourceCandidateCurrentSource;
  store: PersonalWorkspacePocSourceCandidateStore;
  stale: boolean;
};

function personalWorkspacePocSourceUpdateItemValue(
  item: PersonalWorkspacePocSourceCandidateEnvelope['mine']['projectedFlow']['items'][number]
    | undefined,
): string {
  if (!item) return '없음';
  return [
    item.title,
    item.description ? `설명: ${item.description}` : undefined,
    item.sourceDate ? `날짜: ${item.sourceDate}` : undefined,
    item.sectionTitle ? `단계: ${item.sectionTitle}` : undefined,
  ].filter(Boolean).join('\n');
}

export function buildPersonalWorkspacePocSourceUpdateChanges(
  envelope: PersonalWorkspacePocSourceCandidateEnvelope,
): readonly PersonalWorkspacePocSourceUpdateChange[] {
  return envelope.changes.map((change) => {
    if (change.scope === 'flow') {
      const flowValue = (value: typeof envelope.mine.projectedFlow) => [
        value.title,
        value.anchorDate ? `기준일: ${value.anchorDate}` : '기준일 없음',
      ].join('\n');
      return {
        changeId: change.changeId,
        kind: 'changed' as const,
        label: 'Flow 이름과 기준일',
        baseValue: flowValue(envelope.base.projectedFlow),
        workingValue: flowValue(envelope.mine.projectedFlow),
        incomingValue: flowValue(envelope.incoming.projectedFlow),
      };
    }
    const find = (
      flow: typeof envelope.mine.projectedFlow,
    ) => flow.items.find((item) => item.ref === change.itemRef);
    const base = find(envelope.base.projectedFlow);
    const mine = find(envelope.mine.projectedFlow);
    const incoming = find(envelope.incoming.projectedFlow);
    return {
      changeId: change.changeId,
      kind: change.kind === 'modified' ? 'changed' : change.kind,
      label: change.kind === 'added'
        ? `${incoming?.title ?? '새 항목'} · 새 할 일`
        : change.kind === 'removed'
          ? `${mine?.title ?? '기존 항목'} · 빠진 할 일`
          : `${incoming?.title ?? mine?.title ?? '할 일'} · 내용 변경`,
      baseValue: personalWorkspacePocSourceUpdateItemValue(base),
      workingValue: personalWorkspacePocSourceUpdateItemValue(mine),
      incomingValue: personalWorkspacePocSourceUpdateItemValue(incoming),
    };
  });
}

export function resolvePersonalWorkspacePocReorderPosition({
  currentOrderedRefKeys,
  draggedRef,
  targetRef,
  targetTitle,
  pointerY,
  targetTop,
  targetHeight,
}: Readonly<{
  currentOrderedRefKeys: readonly string[];
  draggedRef: string;
  targetRef: string;
  targetTitle: string;
  pointerY: number;
  targetTop: number;
  targetHeight: number;
}>): PersonalWorkspacePocReorderResolution {
  if (!currentOrderedRefKeys.includes(draggedRef) || !currentOrderedRefKeys.includes(targetRef)) {
    return { kind: 'invalid', message: '같은 목록 안의 항목에 놓아 주세요.' };
  }
  if (draggedRef === targetRef) {
    return { kind: 'current', message: '이미 같은 위치입니다.' };
  }

  const position: PersonalWorkspacePocReorderPosition = pointerY >= targetTop + (targetHeight / 2)
    ? 'after'
    : 'before';
  const orderedRefKeys = currentOrderedRefKeys.filter((ref) => ref !== draggedRef);
  const targetIndex = orderedRefKeys.indexOf(targetRef);
  orderedRefKeys.splice(targetIndex + (position === 'after' ? 1 : 0), 0, draggedRef);
  if (orderedRefKeys.every((ref, index) => ref === currentOrderedRefKeys[index])) {
    return { kind: 'current', message: '이미 같은 위치입니다.' };
  }
  return {
    kind: 'changed',
    position,
    orderedRefKeys,
    message: `${targetTitle} ${position === 'before' ? '앞' : '뒤'}에 놓기`,
  };
}

export function resolvePersonalWorkspacePocReorderControl({
  currentOrderedRefKeys,
  draggedRef,
  control,
  titleByRef = {},
}: Readonly<{
  currentOrderedRefKeys: readonly string[];
  draggedRef: string;
  control: PersonalWorkspacePocReorderControl;
  titleByRef?: Readonly<Record<string, string>>;
}>): PersonalWorkspacePocReorderResolution {
  const currentIndex = currentOrderedRefKeys.indexOf(draggedRef);
  if (currentIndex < 0 || currentOrderedRefKeys.length === 0) {
    return { kind: 'invalid', message: '같은 목록 안의 항목을 선택해 주세요.' };
  }

  const lastIndex = currentOrderedRefKeys.length - 1;
  const targetIndex = control === 'top'
    ? 0
    : control === 'bottom'
      ? lastIndex
      : currentIndex + (control === 'previous' ? -1 : 1);
  if (targetIndex < 0 || targetIndex > lastIndex || targetIndex === currentIndex) {
    return { kind: 'current', message: '이미 같은 위치입니다.' };
  }

  const targetRef = currentOrderedRefKeys[targetIndex];
  const position: PersonalWorkspacePocReorderPosition = control === 'next' || control === 'bottom'
    ? 'after'
    : 'before';
  return resolvePersonalWorkspacePocReorderPosition({
    currentOrderedRefKeys,
    draggedRef,
    targetRef,
    targetTitle: titleByRef[targetRef] ?? '선택한 항목',
    pointerY: position === 'before' ? 0 : 1,
    targetTop: 0,
    targetHeight: 1,
  });
}

export function getPersonalWorkspacePocAutoScrollDelta({
  pointerY,
  top,
  bottom,
  reducedMotion = false,
}: Readonly<{
  pointerY: number;
  top: number;
  bottom: number;
  reducedMotion?: boolean;
}>): number {
  const height = Math.max(0, bottom - top);
  if (height === 0) return 0;
  const edge = Math.min(72, Math.max(36, height / 3));
  const maximum = reducedMotion ? 8 : 18;
  if (pointerY < top + edge) {
    return -Math.min(maximum, Math.max(4, Math.round(((top + edge - pointerY) / edge) * maximum)));
  }
  if (pointerY > bottom - edge) {
    return Math.min(maximum, Math.max(4, Math.round(((pointerY - (bottom - edge)) / edge) * maximum)));
  }
  return 0;
}

export function getPersonalWorkspacePocMoveTriggerToken(
  ref: string,
  source: MoveTriggerSource,
): string {
  return `${encodeURIComponent(ref)}--${source}`;
}

export function getPersonalWorkspacePocMoveTriggerSelector(
  ref: string,
  source: MoveTriggerSource,
): string {
  return `[data-personal-workspace-move-trigger="${getPersonalWorkspacePocMoveTriggerToken(ref, source)}"]`;
}

function getPersonalWorkspacePocTaskOpenSelector(ref: string): string {
  return `[data-personal-workspace-task-open-trigger="${encodeURIComponent(ref)}"]`;
}

function getPersonalWorkspacePocFlowOpenSelector(ref: string): string {
  return `[data-personal-workspace-flow-open-trigger="${encodeURIComponent(ref)}"]`;
}

export function shouldClosePersonalWorkspacePocMovePanel(
  outcome: TransitionOutcome,
): boolean {
  return outcome === 'changed';
}

export function shouldUsePersonalWorkspacePocItemSheet(
  composition: ReturnType<typeof resolvePlanExecutionWorkspaceComposition>,
): boolean {
  return composition !== 'desktop_full';
}

function localIsoDate(date = new Date()): string {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function getPersonalWorkspacePocNextLocalDayDelay(now: Date): number {
  const nextLocalMidnight = new Date(now);
  nextLocalMidnight.setHours(24, 0, 0, 0);
  return Math.max(1, nextLocalMidnight.getTime() - now.getTime());
}

function addPlainDays(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return [
    String(date.getUTCFullYear()).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function originLabel(origin: PersonalWorkspacePocFlow['origin']): string {
  if (origin === 'authoring-handoff') return '내가 만든 Flow';
  return '저장한 Flow';
}

export function PersonalWorkspacePocTaskReadOnlyDetails({
  task,
}: Readonly<{ task: PersonalWorkspacePocTask }>) {
  if (!task.description && !task.completionCriterion && !task.memo && !task.sourceTimingLabel) return null;

  return (
    <>
      {task.description ? (
        <div className="min-w-0" data-testid="personal-workspace-item-description">
          <dt className="font-semibold text-[var(--flowme-text-secondary)]">원문 설명</dt>
          <dd className="min-w-0 whitespace-pre-line [overflow-wrap:anywhere]">{task.description}</dd>
        </div>
      ) : null}
      {task.completionCriterion ? (
        <div className="min-w-0" data-testid="personal-workspace-item-completion-criterion">
          <dt className="font-semibold text-[var(--flowme-text-secondary)]">완료 기준</dt>
          <dd className="min-w-0 whitespace-pre-line [overflow-wrap:anywhere]">{task.completionCriterion}</dd>
        </div>
      ) : null}
      {task.memo ? (
        <div className="min-w-0" data-testid="personal-workspace-item-personal-memo">
          <dt className="font-semibold text-[var(--flowme-text-secondary)]">내 메모</dt>
          <dd className="min-w-0 whitespace-pre-line [overflow-wrap:anywhere]">{task.memo}</dd>
        </div>
      ) : null}
      {task.sourceTimingLabel ? (
        <div data-testid="personal-workspace-item-source-timing">
          <dt className="font-semibold text-[var(--flowme-text-secondary)]">원문 일정</dt>
          <dd>{task.sourceTimingLabel}</dd>
        </div>
      ) : null}
    </>
  );
}

function useViewportWidth(): number {
  const [width, setWidth] = useState(1024);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return width;
}

function monthEmptyDates(today: string, occupied: ReadonlySet<string>): string[] {
  const [year, month] = today.split('-').map(Number);
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) => (
    `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`
  )).filter((date) => !occupied.has(date));
}

function monthDateLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][
    new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  ];
  return `${month}월 ${day}일 ${weekday}요일`;
}

function requirePersonalWorkspacePocReceipt(
  input: PersonalWorkspacePocReceiptInput,
): PersonalWorkspacePocReceipt {
  const result = createPersonalWorkspacePocReceipt(input);
  if (!result.ok) throw new Error(`invalid-personal-workspace-receipt:${result.error}`);
  return result.receipt;
}

function compactPersonalWorkspacePocReceiptValue(value: string): string {
  return value.length <= 160 && !/[\r\n\u0000-\u001f\u007f]/u.test(value)
    ? value
    : value.length > 0 ? `${value.length}자` : '없음';
}

function summarizePersonalWorkspacePocQuickDraftChanges(
  baseline: PersonalWorkspacePocQuickItemRootDraft,
  draft: PersonalWorkspacePocQuickItemRootDraft,
): Readonly<{
  affectedRefs: readonly string[];
  changes: readonly PersonalWorkspacePocReceiptChange[];
}> {
  const changes: PersonalWorkspacePocReceiptChange[] = [];
  const append = (
    owner: 'poc-personal-plan' | 'execution',
    field: string,
    label: string,
    before: string,
    after: string,
  ) => {
    if (before === after) return;
    changes.push({
      owner,
      field,
      label,
      before: compactPersonalWorkspacePocReceiptValue(before || '없음'),
      after: compactPersonalWorkspacePocReceiptValue(after || '없음'),
    });
  };
  append('poc-personal-plan', 'quick-item.title', '제목', baseline.title, draft.title);
  append('poc-personal-plan', 'quick-item.memo', '메모', baseline.memo, draft.memo);
  append(
    'execution',
    'quick-item.execution-date',
    '실행일',
    baseline.executionDate ?? '날짜 미정',
    draft.executionDate ?? '날짜 미정',
  );
  return {
    changes,
    affectedRefs: changes.length > 0 ? [draft.itemRef] : [],
  };
}

function validatePersonalWorkspacePocQuickDraft(
  draft: Readonly<PersonalWorkspacePocQuickItemRootDraft>,
): FlowEditorValidation {
  if (!draft.title.trim() || draft.title !== draft.title.trim() || draft.title.length > 80) {
    return {
      valid: false,
      firstErrorFocus: '[data-personal-quick-item-title]',
    };
  }
  if (draft.memo.length > 2000) {
    return {
      valid: false,
      firstErrorFocus: '[data-testid="personal-workspace-poc-quick-item-memo"]',
    };
  }
  if (draft.executionDate !== undefined && !isPersonalWorkspacePocDate(draft.executionDate)) {
    return {
      valid: false,
      firstErrorFocus: '[data-testid="personal-workspace-poc-quick-item-date"]',
    };
  }
  return { valid: true };
}

function personalWorkspacePocEditorFailure(
  code: string,
  message: string,
  kind: FlowEditorFailure['kind'] = 'validation',
): FlowEditorFailure {
  return {
    kind,
    code,
    message,
    firstErrorFocus: '[data-editor-error-summary]',
  };
}

export function parsePersonalWorkspacePocEditorVerifiedStateRaw(
  raw: string,
): PersonalWorkspacePocState | undefined {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isPersonalWorkspacePocState(parsed)) return undefined;
    return JSON.stringify(parsed) === raw ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function personalWorkspacePocStateRawFingerprint(raw: string | null): string {
  return fingerprintPersonalWorkspacePocPlanEditorBytes(
    canonicalPersonalWorkspacePocPlanEditorBytes(
      raw === null
        ? { kind: 'missing' }
        : {
            kind: 'present',
            fingerprint: fingerprintPersonalWorkspacePocPlanEditorBytes(raw),
          },
    ),
  );
}

function personalWorkspacePocPlanRetryDescriptor(
  draft: PersonalWorkspacePocPlanDraft,
  guard: PersonalWorkspacePocPlanTrustedOpenGuard,
): PersonalWorkspacePocEditorRetryDescriptor {
  return {
    payload: {
      kind: 'personal-plan-draft',
      fingerprint: fingerprintPersonalWorkspacePocPlanEditorBytes(
        canonicalPersonalWorkspacePocPlanEditorBytes(draft),
      ),
    },
    guard: {
      kind: 'trusted-plan-open',
      fingerprint: fingerprintPersonalWorkspacePocPlanEditorBytes(
        canonicalPersonalWorkspacePocPlanEditorBytes({
          guardId: guard.guardId,
          identityFingerprint: guard.identityFingerprint,
          openedStateRevision: guard.openedStateRevision,
          openedStateRawFingerprint: personalWorkspacePocStateRawFingerprint(guard.openedStateRaw),
          canonicalSourceFingerprint: guard.canonicalSourceFingerprint,
        }),
      ),
      openedStateRevision: guard.openedStateRevision,
    },
  };
}

function personalWorkspacePocQuickRetryDescriptor(
  draft: PersonalWorkspacePocQuickItemRootDraft,
  baseline: PersonalWorkspacePocQuickEditorBaseline,
): PersonalWorkspacePocEditorRetryDescriptor {
  return {
    payload: {
      kind: 'quick-item-root-draft',
      fingerprint: fingerprintPersonalWorkspacePocPlanEditorBytes(
        canonicalPersonalWorkspacePocPlanEditorBytes(draft),
      ),
    },
    guard: {
      kind: 'quick-state-open',
      fingerprint: fingerprintPersonalWorkspacePocPlanEditorBytes(
        canonicalPersonalWorkspacePocPlanEditorBytes({
          itemRef: baseline.draft.itemRef,
          openedStateRevision: baseline.stateRevision,
          openedStateRawFingerprint: personalWorkspacePocStateRawFingerprint(baseline.stateRaw),
        }),
      ),
      openedStateRevision: baseline.stateRevision,
    },
  };
}

function samePersonalWorkspacePocRetryDescriptor(
  left: PersonalWorkspacePocEditorRetryDescriptor,
  right: PersonalWorkspacePocEditorRetryDescriptor,
): boolean {
  return canonicalPersonalWorkspacePocPlanEditorBytes(left)
    === canonicalPersonalWorkspacePocPlanEditorBytes(right);
}

function editablePersonalWorkspacePocChanges(
  changes: readonly PersonalWorkspacePocReceiptChange[],
): readonly PersonalWorkspacePocEditorImpactChange[] {
  return changes.filter((change): change is PersonalWorkspacePocEditorImpactChange => (
    change.owner !== 'authoring-source'
  ));
}

export function PersonalWorkspacePocSurface({
  initialModel,
  initialState,
  initialSourceCandidateStore,
  initialSourceCandidateRaw,
  restored,
}: PersonalWorkspacePocSurfaceProps) {
  const [state, setState] = useState(initialState);
  const [sourceCandidateStore, setSourceCandidateStore] = useState(
    initialSourceCandidateStore,
  );
  const [sourceCandidateRaw, setSourceCandidateRaw] = useState<string | null>(
    initialSourceCandidateRaw,
  );
  const [sourceUpdateOpen, setSourceUpdateOpen] = useState(false);
  const [sourceUpdateSelectedChangeId, setSourceUpdateSelectedChangeId] = useState<string>();
  const [sourceUpdateStatus, setSourceUpdateStatus] = useState<PersonalWorkspacePocSourceUpdateStatus>('pending');
  const [sourceUpdateError, setSourceUpdateError] = useState<string>();
  const [sourcePracticeSelections, setSourcePracticeSelections] = useState<Readonly<Record<string, string>>>({});
  const sourcePracticeOwner = useRef<SourcePracticeOwner | undefined>(undefined);
  const sourcePracticePending = useRef<object | undefined>(undefined);
  const sourcePracticeWorkspaceEpoch = useRef(0);
  const sourcePracticeObservedState = useRef(JSON.stringify(initialState));
  const sourcePracticeRecovery = useRef(false);
  const sourcePracticeFlowRef = useRef<string | undefined>(undefined);
  const sourcePracticeBaseStore = useRef(initialSourceCandidateStore);
  const sourcePracticeStaleCandidates = useRef(new Set<string>());
  const [sourceUpdateLaterChangeIds, setSourceUpdateLaterChangeIds] = useState<
    Readonly<Record<string, true>>
  >({});
  const [section, setSection] = useState<WorkspaceSection>('folder');
  const [activeFolderId, setActiveFolderId] = useState<string | undefined>();
  const [selectedFlowRef, setSelectedFlowRef] = useState<string>();
  const [activeItemRef, setActiveItemRef] = useState<string>();
  const [resultNavigation, setResultNavigation] = useState<PersonalWorkspacePocResultNavigationState>({
    resultView: 'text',
  });
  const [moveTarget, setMoveTarget] = useState<MoveTarget>();
  const [moveReturnFocusSelector, setMoveReturnFocusSelector] = useState<string>();
  const [quickFormOpen, setQuickFormOpen] = useState(false);
  const [folderFormOpen, setFolderFormOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [trashQuery, setTrashQuery] = useState('');
  const [trashDeleteTarget, setTrashDeleteTarget] = useState<PersonalWorkspacePocTrashRow>();
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDate, setQuickDate] = useState(localIsoDate());
  const [quickFolderId, setQuickFolderId] = useState('');
  const [folderTitle, setFolderTitle] = useState('');
  const [folderParentId, setFolderParentId] = useState('');
  const [moveDateDraft, setMoveDateDraft] = useState(localIsoDate());
  const [quickConversionOpen, setQuickConversionOpen] = useState(false);
  const [quickConversionTitle, setQuickConversionTitle] = useState('');
  const [showEmptyMonthDates, setShowEmptyMonthDates] = useState(false);
  const [reorderPreview, setReorderPreview] = useState<PersonalWorkspacePocReorderPreview>();
  const [moveDropFeedback, setMoveDropFeedback] = useState<PersonalWorkspacePocMoveDropFeedback>();
  const [status, setStatus] = useState<TransactionStatus>({
    kind: restored ? 'success' : 'ready',
    message: restored ? '마지막으로 저장한 개인공간을 복원했어요.' : '개인공간이 준비됐어요.',
  });
  const [receipt, setReceipt] = useState<PersonalWorkspacePocReceipt>();
  const [planDisplay, setPlanDisplay] = useState<PersonalWorkspacePocPlanDisplay>();
  const planDisplayRef = useRef<PersonalWorkspacePocPlanDisplay | undefined>(undefined);
  const planDisplayReturnPoint = useRef<Pick<PlanDisplayBinding, 'screenKey' | 'returnFocusSelector'> | undefined>(undefined);
  const planDisplayBinding = useRef<PlanDisplayBinding | undefined>(undefined);
  const planResultOwner = useRef<PlanResultOwner | undefined>(undefined);
  const planSourceEpoch = useRef(0);
  const planObservedSource = useRef(sourceCandidateRaw);
  const planScreenKey = JSON.stringify([section, activeFolderId, selectedFlowRef, activeItemRef, resultNavigation.resultView]);
  const planScreenRef = useRef(planScreenKey);
  planScreenRef.current = planScreenKey;
  const planPreviousScreen = useRef(planScreenKey);
  const planOverlayRef = useRef(false);
  planOverlayRef.current = sourceUpdateOpen || Boolean(moveTarget) || quickConversionOpen || resetConfirmOpen || Boolean(trashDeleteTarget);
  const discardPlanDisplay = useCallback(() => {
    planResultOwner.current = undefined;
    planDisplayRef.current = undefined;
    setPlanDisplay(undefined);
  }, []);
  const pending = useRef(false);
  // A queued write belongs to this mounted route, not a later visit with the
  // same storage bytes. Never let a departed screen acquire writer authority.
  const workspaceWriteOwner = useRef<object | undefined>(undefined);
  useEffect(() => {
    const owner = {};
    workspaceWriteOwner.current = owner;
    return () => {
      if (workspaceWriteOwner.current === owner) workspaceWriteOwner.current = undefined;
    };
  }, []);
  const [contextualOwner, setContextualOwner] = useState(() => createResultOwnerSession('react-workspace'));
  const contextualOwnerRef = useRef(contextualOwner);
  const resultOrigin = useRef<WorkspaceResultOrigin | undefined>(undefined);
  const moveOrigin = useRef<WorkspaceResultOrigin | undefined>(undefined);
  const lastInputWasKeyboard = useRef(false);
  const contextualReceiptRef = useRef(receipt);
  contextualReceiptRef.current = receipt;
  const captureResultOrigin = useRef<(ref: string, group?: PersonalWorkspacePocTaskGroup) => WorkspaceResultOrigin | undefined>(() => undefined);
  const contextualIntent = useRef<(transition: PersonalWorkspacePocTransition, next: PersonalWorkspacePocState) => ResultIntent | undefined>(() => undefined);
  const setResultOwner = useCallback((next: ResultOwnerState) => {
    // Preserve the pure model's private identity and synchronously exclude double Undo.
    contextualOwnerRef.current = next;
    setContextualOwner(next);
  }, []);
  const interruptResult = useCallback((reason: string) => {
    setResultOwner(interruptOwner(contextualOwnerRef.current, reason));
  }, [setResultOwner]);
  const idCounter = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const sourceCandidateStoreRef = useRef(sourceCandidateStore);
  sourceCandidateStoreRef.current = sourceCandidateStore;
  const sourceCandidateRawRef = useRef(sourceCandidateRaw);
  sourceCandidateRawRef.current = sourceCandidateRaw;
  const receiptSequence = useRef(0);
  const planGuard = useRef<PersonalWorkspacePocPlanTrustedOpenGuard | undefined>(undefined);
  const planSourceFlow = useRef<PersonalWorkspacePocFlow | undefined>(undefined);
  const planAttempt = useRef<PersonalWorkspacePocEditorAttempt | undefined>(undefined);
  const planStorageEvidence = useRef<PersonalWorkspacePocEditorStorageEvidence | undefined>(undefined);
  const quickEditorBaseline = useRef<PersonalWorkspacePocQuickEditorBaseline | undefined>(undefined);
  const quickEditorAttempt = useRef<PersonalWorkspacePocEditorAttempt | undefined>(undefined);
  const quickStorageEvidence = useRef<PersonalWorkspacePocEditorStorageEvidence | undefined>(undefined);
  const quickConversionAttempt = useRef<PersonalWorkspacePocQuickConversionAttempt | undefined>(undefined);
  const planReturnContext = useRef<PersonalWorkspacePocReceiptReturnContext>('period-list');
  const planReturnFocusSelector = useRef('#personal-workspace-poc-main');
  const quickReturnContext = useRef<PersonalWorkspacePocReceiptReturnContext>('quick-list');
  const editorOwner = useRef<PersonalWorkspacePocEditorOwner | undefined>(undefined);
  const editorHistoryPopstateConsume = useRef(false);
  const planEditorClosed = useRef<(
    level: 'plan' | 'item',
    cause: 'cancel' | 'x' | 'backdrop' | 'escape' | 'browser-back' | 'commit-success',
  ) => void>(() => undefined);
  const quickEditorClosed = useRef<(
    level: 'plan' | 'item',
    cause: 'cancel' | 'x' | 'backdrop' | 'escape' | 'browser-back' | 'commit-success',
  ) => void>(() => undefined);
  const planEditorCommitSucceeded = useRef<(level: 'plan' | 'item') => void>(() => undefined);
  const quickEditorCommitSucceeded = useRef<(level: 'plan' | 'item') => void>(() => undefined);
  const planEditorRearm = useRef<() => void>(() => undefined);
  const quickEditorRearm = useRef<() => void>(() => undefined);
  const flowReturnFocusSelector = useRef<string | undefined>(undefined);
  const postMoveFocusSelector = useRef<string | undefined>(undefined);
  const dragDropHandled = useRef(false);
  const transactionStatusRef = useRef<HTMLDivElement | null>(null);
  const [nativeStatusBox, setNativeStatusBox] = useState<CSSProperties | undefined>(undefined);
  const activeMoveSession = useRef<PersonalWorkspacePocActiveMoveSession | undefined>(undefined);
  const autoScrollFrame = useRef<number | undefined>(undefined);
  const autoScrollSpeed = useRef(0);
  const autoScrollTarget = useRef<HTMLElement | null>(null);
  const initialHashHandled = useRef(false);

  const nextReceiptId = (intentId: string, statusName: string) => {
    receiptSequence.current += 1;
    return `${intentId}:${statusName}:${receiptSequence.current}`;
  };

  // Display validation is deliberately outside the writer's exception channel.
  // Its failure cannot roll back a verified save or interrupt editor cleanup.
  const publishPlanDisplay = (
    input: PersonalWorkspacePocPlanDisplayInput,
    source = planSourceFlow.current,
  ): PersonalWorkspacePocPlanDisplay | undefined => {
    try {
      const made = source && createPersonalWorkspacePocPlanDisplay(input, source);
      if (!made || !made.ok) { discardPlanDisplay(); return undefined; }
      setReceipt(undefined);
      contextualReceiptRef.current = undefined;
      planDisplayRef.current = made.display;
      planDisplayReturnPoint.current = { screenKey: planScreenRef.current, returnFocusSelector: planReturnFocusSelector.current };
      setPlanDisplay(made.display);
      return made.display;
    } catch { discardPlanDisplay(); return undefined; }
  };

  const planBindingIsCurrent = (binding: PlanDisplayBinding): boolean => {
    try {
      return binding.sourceEpoch === planSourceEpoch.current
        && binding.sourceRaw === window.localStorage.getItem(PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY)
        && binding.screenKey === planScreenRef.current;
    } catch { return false; }
  };

  const publishEditorAttemptDisplay = (input: PersonalWorkspacePocReceiptInput) => {
    if (input.operation === 'commit-personal-plan') {
      const { retryIntent: _privateRetry, ...displayInput } = input;
      return publishPlanDisplay(displayInput as PersonalWorkspacePocPlanDisplayInput);
    }
    discardPlanDisplay();
    setReceipt(requirePersonalWorkspacePocReceipt(input));
    return undefined;
  };

  const requirePlanEditorHandlers = (
    storage: PersonalWorkspacePocStorage = window.localStorage,
  ) => {
    if (!planGuard.current) {
      throw personalWorkspacePocEditorFailure(
        'missing-plan-open-guard',
        '편집 대상을 다시 열어 주세요.',
        'runtime',
      );
    }
    return createPersonalWorkspacePocPlanEditorHandlers({
      storage,
      guard: planGuard.current,
      readCurrentState: () => stateRef.current,
      readCurrentBaseModel: () => initialModel,
      now: () => new Date().toISOString(),
    });
  };

  const showSavingReceipt = (attempt: PersonalWorkspacePocEditorAttempt) => {
    publishEditorAttemptDisplay({
      receiptId: nextReceiptId(attempt.intentId, 'saving'),
      intentId: attempt.intentId,
      operation: attempt.operation,
      status: 'saving',
      createdAt: new Date().toISOString(),
      scopeRef: attempt.scopeRef,
      affectedRefs: attempt.affectedRefs,
      affectedCount: attempt.affectedRefs.length,
      stateRevisionBefore: attempt.stateRevisionBefore,
      stateRevisionAfter: attempt.stateRevisionBefore,
      changes: attempt.changes,
      targetWriteCount: 0,
      supportWriteCount: 0,
      rollback: 'not-needed',
    });
    setStatus({ kind: 'saving', message: '변경 내용을 저장 중…', receiptStatus: 'saving' });
  };

  const planHandlers: FlowEditorCommitHandlers<
    PersonalWorkspacePocPlanDraft,
    PersonalWorkspacePocPlanItemDraft
  > = {
    preparePublicDraft: (input) => requirePlanEditorHandlers().preparePublicDraft(input),
    applyItemToParentPublicDraft: (input) => (
      requirePlanEditorHandlers().applyItemToParentPublicDraft(input)
    ),
    applyItemToParentPersonalDraft: (input) => (
      requirePlanEditorHandlers().applyItemToParentPersonalDraft(input)
    ),
    preparePersonalOverlay: async (input) => {
      const attempt = planAttempt.current;
      if (!attempt) {
        throw personalWorkspacePocEditorFailure(
          'missing-plan-commit-intent',
          '저장 요청을 다시 시작해 주세요.',
          'runtime',
        );
      }
      const binding = planDisplayBinding.current;
      if (!binding || binding.attempt !== attempt || binding.transactionId !== input.transactionId
        || binding.draftRevision !== input.revision || !planBindingIsCurrent(binding)) {
        throw personalWorkspacePocEditorFailure('stale-plan-display-owner', '편집 기준이 바뀌었습니다. 입력을 확인한 뒤 계획을 다시 열어 주세요.', 'runtime');
      }
      showSavingReceipt(attempt);
      const evidence = createPersonalWorkspacePocEditorStorageEvidence();
      planStorageEvidence.current = evidence;
      binding.requestId = input.requestId;
      binding.evidence = evidence;
      const operation = await requirePlanEditorHandlers(
        createPersonalWorkspacePocEditorEvidenceStorage(window.localStorage, evidence),
      ).preparePersonalOverlay(input);
      const genuineNoop = isPersonalWorkspacePocPlanNoopPreparedCommit(operation);
      const openedRaw = planGuard.current?.openedStateRaw;
      const measured = instrumentPersonalWorkspacePocEditorStorageCommit(operation, evidence, {
        readTargetRaw: () => window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY),
        parseTargetRaw: (raw) => {
          const parsed = parsePersonalWorkspacePocEditorVerifiedStateRaw(raw);
          return parsed?.revision === attempt.stateRevisionBefore + 1 ? parsed : undefined;
        },
      });
      return {
        commit: async () => {
          if (planDisplayBinding.current !== binding || binding.attempt !== planAttempt.current
            || binding.requestId !== input.requestId || !planBindingIsCurrent(binding)) {
            throw personalWorkspacePocEditorFailure('stale-plan-commit-owner', '저장 전에 편집 기준이 바뀌어 변경하지 않았습니다.', 'runtime');
          }
          if (genuineNoop) {
            const unchanged = () => planDisplayBinding.current === binding
              && binding.attempt === planAttempt.current
              && binding.requestId === input.requestId
              && stateRef.current.revision === attempt.stateRevisionBefore
              && window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY) === openedRaw
              && planBindingIsCurrent(binding);
            if (!unchanged()) throw personalWorkspacePocEditorFailure('stale-plan-noop', '변경 없음 판정 뒤 기준이 달라졌습니다. 다시 확인해 주세요.', 'runtime');
            evidence.commitStarted = true;
            await operation.commit();
            if (!unchanged() || evidence.successfulTargetMutationCount !== 0 || evidence.successfulSupportMutationCount !== 0) {
              throw personalWorkspacePocEditorFailure('unverified-plan-noop', '변경 없음 결과를 확인하지 못했습니다.', 'runtime');
            }
            binding.noopAccepted = true;
            return;
          }
          return measured.commit();
        },
        rollbackAndVerify: () => measured.rollbackAndVerify(),
      };
    },
  };

  const quickHandlers: FlowEditorCommitHandlers<
    PersonalWorkspacePocQuickItemRootDraft,
    never
  > = {
    preparePublicDraft: () => {
      throw personalWorkspacePocEditorFailure(
        'quick-public-role-forbidden',
        '빠른 할 일은 공개 초안으로 저장하지 않습니다.',
        'runtime',
      );
    },
    applyItemToParentPublicDraft: () => {
      throw personalWorkspacePocEditorFailure(
        'quick-child-role-forbidden',
        '빠른 할 일에는 부모 Flow 편집 단계가 없습니다.',
        'runtime',
      );
    },
    applyItemToParentPersonalDraft: () => {
      throw personalWorkspacePocEditorFailure(
        'quick-child-role-forbidden',
        '빠른 할 일에는 부모 Flow 편집 단계가 없습니다.',
        'runtime',
      );
    },
    preparePersonalOverlay: ({ transactionId, requestId, revision, draft }) => {
      const baseline = quickEditorBaseline.current;
      if (!baseline || baseline.draft.itemRef !== draft.itemRef) {
        throw personalWorkspacePocEditorFailure(
          'missing-quick-open-guard',
          '빠른 할 일을 다시 열어 주세요.',
          'runtime',
        );
      }
      const validation = validatePersonalWorkspacePocQuickDraft(draft);
      if (!validation.valid) {
        throw personalWorkspacePocEditorFailure(
          'invalid-quick-draft',
          '빠른 할 일의 제목과 실행일을 확인해 주세요.',
        );
      }
      let currentStateRaw: string | null;
      try {
        currentStateRaw = window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY);
      } catch {
        throw personalWorkspacePocEditorFailure(
          'quick-state-read-failed',
          '저장 상태를 읽지 못해 빠른 할 일을 저장하지 않았습니다.',
          'storage',
        );
      }
      if (
        stateRef.current.revision !== baseline.stateRevision
        || !isPersonalWorkspacePocEditorStateRawCurrent(stateRef.current, baseline.stateRaw)
        || currentStateRaw !== baseline.stateRaw
      ) {
        throw personalWorkspacePocEditorFailure(
          'stale-quick-state',
          '다른 변경이 먼저 저장되어 빠른 할 일을 저장하지 않았습니다. 다시 열어 확인해 주세요.',
          'storage',
        );
      }
      const quickItem = stateRef.current.quickItems.find(
        (item) => toPersonalWorkspacePocQuickItemRef(item.quickItemId) === draft.itemRef,
      );
      if (!quickItem) {
        throw personalWorkspacePocEditorFailure(
          'missing-quick-item',
          '수정할 빠른 할 일을 찾을 수 없습니다.',
        );
      }
      const transitioned = applyPersonalWorkspacePocTransition(stateRef.current, {
        type: 'update-quick-item',
        quickItemId: quickItem.quickItemId,
        expectedRevision: baseline.stateRevision,
        title: draft.title,
        memo: draft.memo,
        ...(draft.executionDate ? { date: draft.executionDate } : {}),
        now: new Date().toISOString(),
      });
      if (transitioned.error) {
        throw personalWorkspacePocEditorFailure(
          `quick-transition-${transitioned.error}`,
          transitioned.message,
        );
      }
      const attempt = quickEditorAttempt.current;
      if (!attempt) {
        throw personalWorkspacePocEditorFailure(
          'missing-quick-commit-intent',
          '저장 요청을 다시 시작해 주세요.',
          'runtime',
        );
      }
      showSavingReceipt(attempt);
      if (!transitioned.changed) {
        return { commit: () => undefined, rollbackAndVerify: () => true };
      }
      const composed = composePersonalWorkspacePocReadModel(initialModel, transitioned.state);
      const references = composed.ok
        ? validatePersonalWorkspacePocStateReferences(transitioned.state, composed.model)
        : composed;
      if (!references.ok) {
        throw personalWorkspacePocEditorFailure(
          'quick-post-transition-reference-failed',
          '변경한 항목을 확인할 수 없어 저장하지 않았습니다.',
        );
      }
      const evidence = createPersonalWorkspacePocEditorStorageEvidence();
      quickStorageEvidence.current = evidence;
      const operation = preparePersonalWorkspacePocStorageCommit({
        storage: createPersonalWorkspacePocEditorEvidenceStorage(
          window.localStorage,
          evidence,
        ),
        state: transitioned.state,
        transactionId: `quick-item:${transactionId}:${requestId}:${revision}`,
      });
      return instrumentPersonalWorkspacePocEditorStorageCommit(operation, evidence, {
        readTargetRaw: () => window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY),
        parseTargetRaw: (raw) => {
          const parsed = parsePersonalWorkspacePocEditorVerifiedStateRaw(raw);
          return parsed?.revision === attempt.stateRevisionBefore + 1 ? parsed : undefined;
        },
      });
    },
  };

  const planEditor = useFlowEditorController<
    PersonalWorkspacePocPlanDraft,
    PersonalWorkspacePocPlanItemDraft
  >({
    handlers: planHandlers,
    onTransactionClosed: (level, cause) => planEditorClosed.current(level, cause),
    onRearmHistoryBoundary: () => planEditorRearm.current(),
    onCloseBlocked: (message) => setStatus({ kind: 'failure', message }),
    onCommitSucceeded: (level) => planEditorCommitSucceeded.current(level),
  });
  const quickEditor = useFlowEditorController<PersonalWorkspacePocQuickItemRootDraft, never>({
    handlers: quickHandlers,
    onTransactionClosed: (level, cause) => quickEditorClosed.current(level, cause),
    onRearmHistoryBoundary: () => quickEditorRearm.current(),
    onCloseBlocked: (message) => setStatus({ kind: 'failure', message }),
    onCommitSucceeded: (level) => quickEditorCommitSucceeded.current(level),
  });

  const [today, setToday] = useState(() => localIsoDate());
  useEffect(() => {
    let midnightTimer: number | undefined;
    const scheduleMidnightRefresh = () => {
      if (midnightTimer !== undefined) window.clearTimeout(midnightTimer);
      midnightTimer = window.setTimeout(() => {
        setToday(localIsoDate());
        scheduleMidnightRefresh();
      }, getPersonalWorkspacePocNextLocalDayDelay(new Date()) + 25);
    };
    const refreshLocalDay = () => {
      setToday((current) => {
        const next = localIsoDate();
        return current === next ? current : next;
      });
      scheduleMidnightRefresh();
    };
    const refreshVisibleLocalDay = () => {
      if (!document.hidden) refreshLocalDay();
    };

    scheduleMidnightRefresh();
    window.addEventListener('focus', refreshLocalDay);
    document.addEventListener('visibilitychange', refreshVisibleLocalDay);
    return () => {
      if (midnightTimer !== undefined) window.clearTimeout(midnightTimer);
      window.removeEventListener('focus', refreshLocalDay);
      document.removeEventListener('visibilitychange', refreshVisibleLocalDay);
    };
  }, []);
  const viewportWidth = useViewportWidth();
  const composedModel = useMemo(
    () => composePersonalWorkspacePocReadModel(
      initialModel,
      state,
      sourceCandidateStore,
    ),
    [initialModel, sourceCandidateStore, state],
  );
  const fullModel = composedModel.ok ? composedModel.model : initialModel;
  const model = useMemo<PersonalWorkspacePocReadModel>(() => ({
    version: fullModel.version,
    flows: fullModel.flows.filter(
      (flow) => !isPersonalWorkspacePocMemberInactive(state, flow.ref),
    ),
  }), [fullModel, state]);
  const flowCopyDisplays = useMemo(
    () => buildPersonalWorkspacePocCopyDisambiguation(model.flows),
    [model.flows],
  );
  const flowDisplayTitle = (flow: PersonalWorkspacePocFlow) => (
    getPersonalWorkspacePocFlowDisplayTitle(flow, flowCopyDisplays)
  );
  const resultBaseModel = useMemo<PersonalWorkspacePocReadModel>(() => {
    const sourceFlows = composePersonalWorkspacePocEffectiveSourceFlows(
      [...initialModel.flows, ...(state.authoredFlows ?? [])],
      sourceCandidateStore,
    );
    return {
      version: initialModel.version,
      flows: sourceFlows.ok
        ? sourceFlows.flows
        : [...initialModel.flows, ...(state.authoredFlows ?? [])],
    };
  }, [initialModel, sourceCandidateStore, state.authoredFlows]);

  const sourceRead = useMemo(() => buildPersonalWorkspacePocSourceReadIndex({
    baseModel: initialModel,
    authoredFlows: state.authoredFlows ?? [],
    sourceCandidateStore,
  }), [initialModel, sourceCandidateStore, state.authoredFlows]);
  const sourceReadValid = useMemo(() => sourceRead.ok && composedModel.ok
    && composedModel.model.flows.every((flow) => (
      readPersonalWorkspacePocTaskSourceContext(sourceRead.index, flow).ok
    )), [composedModel, sourceRead]);
  useEffect(() => {
    if (!sourceReadValid) window.location.replace('/my');
  }, [sourceReadValid]);

  const tasks = useMemo(
    () => sourceReadValid && sourceRead.ok
      ? buildPersonalWorkspacePocTasks(model, state, sourceRead.index)
      : [],
    [model, sourceRead, sourceReadValid, state],
  );
  const groups = useMemo(
    () => section === 'folder' || section === 'trash'
      ? []
      : buildPersonalWorkspacePocTaskGroups(tasks, state, section, today),
    [section, state, tasks, today],
  );
  const emptyMonthDates = useMemo(() => (
    section === 'month'
      ? monthEmptyDates(
        today,
        new Set(groups.filter((group) => group.context === 'date').map((group) => group.contextKey)),
      )
      : []
  ), [groups, section, today]);
  const taskByRef = useMemo(() => new Map(tasks.map((task) => [task.ref, task])), [tasks]);
  const selectedFlow = model.flows.find((flow) => flow.ref === selectedFlowRef);
  const trashRows = useMemo<PersonalWorkspacePocTrashRow[]>(() => (
    [...(state.trashEntries ?? [])]
      .sort((left, right) => right.trashedAt.localeCompare(left.trashedAt))
      .flatMap((entry) => {
        if (entry.member === 'saved_flow') {
          const flow = fullModel.flows.find((candidate) => candidate.ref === entry.memberRef);
          return flow ? [{ entry, title: flow.title, itemRefs: flow.items.map((item) => item.ref) }] : [];
        }
        const quick = state.quickItems.find(
          (item) => toPersonalWorkspacePocQuickItemRef(item.quickItemId) === entry.memberRef,
        );
        return quick ? [{ entry, title: quick.title, itemRefs: [] }] : [];
      })
  ), [fullModel.flows, state.quickItems, state.trashEntries]);
  const visibleTrashRows = useMemo(() => {
    const query = trashQuery.trim().toLocaleLowerCase('ko');
    return query
      ? trashRows.filter((row) => row.title.toLocaleLowerCase('ko').includes(query))
      : trashRows;
  }, [trashQuery, trashRows]);

  const findSourceFlow = (flowRef: string): PersonalWorkspacePocFlow | undefined => (
    (() => {
      const base = initialModel.flows.find((flow) => flow.ref === flowRef)
        ?? stateRef.current.authoredFlows?.find((flow) => flow.ref === flowRef);
      if (!base) return undefined;
      const effective = getPersonalWorkspacePocEffectiveSourceFlow(
        base,
        sourceCandidateStoreRef.current,
      );
      return effective.ok ? effective.flow : undefined;
    })()
  );

  const pushEditorHistory = useCallback((
    kind: PersonalWorkspacePocEditorKind,
    level: 'plan' | 'item',
    scopeRef: string,
  ) => {
    const current = window.history.state;
    const base = current && typeof current === 'object'
      ? current as Record<string, unknown>
      : {};
    window.history.pushState({
      ...base,
      personalWorkspacePocEditor: {
        kind,
        level,
        scopeRef,
      } satisfies PersonalWorkspacePocEditorHistoryMarker,
    }, '', window.location.href);
  }, []);

  const closeEditorHistory = useCallback((
    expected: PersonalWorkspacePocEditorHistoryMarker,
    action: () => void,
  ) => {
    const marker = window.history.state?.personalWorkspacePocEditor as
      | Partial<PersonalWorkspacePocEditorHistoryMarker>
      | undefined;
    if (
      marker?.kind === expected.kind
      && marker.level === expected.level
      && marker.scopeRef === expected.scopeRef
    ) {
      // Logical cleanup must not depend on a later popstate listener. The
      // separate consume flag prevents that navigation from closing a parent
      // Plan, but it is deliberately not an editor/write lock so an already
      // published success receipt can be undone immediately.
      editorHistoryPopstateConsume.current = true;
      action();
      window.history.back();
      window.setTimeout(() => {
        editorHistoryPopstateConsume.current = false;
      }, 1_000);
      return;
    }
    action();
  }, []);

  const finalizeSuccessfulEditorAttempt = (
    attempt: PersonalWorkspacePocEditorAttempt | undefined,
  ) => {
    if (!attempt) return;
    const storageEvidence = attempt.operation === 'commit-quick-item-root'
      ? quickStorageEvidence.current
      : planStorageEvidence.current;
    if (
      !storageEvidence
      || storageEvidence.successfulTargetMutationCount !== 1
      || typeof storageEvidence.verifiedTargetRaw !== 'string'
      || !storageEvidence.verifiedTargetState
    ) {
      setStatus({
        kind: 'failure',
        message: '저장 결과를 확인하지 못했어요. 새로고침해 상태를 확인해 주세요.',
      });
      return;
    }
    const nextState = storageEvidence.verifiedTargetState;
    if (nextState.revision !== attempt.stateRevisionBefore + 1) {
      setStatus({
        kind: 'failure',
        message: '저장 순서가 달라 화면을 갱신하지 않았어요. 새로고침해 상태를 확인해 주세요.',
      });
      return;
    }
    const binding = planDisplayBinding.current;
    if (attempt.operation === 'commit-personal-plan') {
      try {
        if (window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY) !== storageEvidence.verifiedTargetRaw) {
          discardPlanDisplay();
          setStatus({ kind: 'failure', message: '저장 뒤 다른 변경을 발견했습니다. 새로고침해 최신 상태를 확인해 주세요.' });
          return;
        }
      } catch {
        discardPlanDisplay();
        setStatus({ kind: 'failure', message: '저장 뒤 상태를 읽지 못했습니다. 새로고침해 실제 상태를 확인해 주세요.' });
        return;
      }
    }
    stateRef.current = nextState;
    setState(nextState);
    if (attempt.operation === 'commit-personal-plan' && (!binding || binding.attempt !== attempt
      || binding.accepted || binding.evidence !== storageEvidence || !binding.requestId
      || !planBindingIsCurrent(binding))) {
      discardPlanDisplay();
      setStatus({ kind: 'success', message: '저장은 완료했지만 편집 기준이 바뀌어 변경 결과를 표시하지 않았어요.' });
      return;
    }
    if (attempt.operation === 'commit-personal-plan' && binding) binding.accepted = true;
    const resultDisplay = publishEditorAttemptDisplay({
      receiptId: nextReceiptId(attempt.intentId, 'success'),
      intentId: attempt.intentId,
      operation: attempt.operation,
      status: 'success',
      createdAt: new Date().toISOString(),
      scopeRef: attempt.scopeRef,
      affectedRefs: attempt.affectedRefs,
      affectedCount: attempt.affectedRefs.length,
      stateRevisionBefore: attempt.stateRevisionBefore,
      stateRevisionAfter: nextState.revision,
      changes: attempt.changes,
      targetWriteCount: storageEvidence.successfulTargetMutationCount,
      supportWriteCount: storageEvidence.successfulSupportMutationCount,
      rollback: 'not-needed',
      undoLabel: '이 변경 되돌리기',
    });
    if (attempt.operation === 'commit-personal-plan') {
      if (!resultDisplay || !binding) {
        setStatus({ kind: 'success', message: '저장은 완료했지만 변경 목록을 표시하지 못했어요.' });
        return;
      }
      planResultOwner.current = { display: resultDisplay, binding, exactRaw: storageEvidence.verifiedTargetRaw, consumed: false };
    }
    setStatus({ kind: 'success', message: '내 계획 변경을 저장했어요.', receiptStatus: 'success' });
  };

  planEditorCommitSucceeded.current = (level) => {
    if (level === 'item') {
      setStatus({
        kind: 'success',
        message: '할 일 변경을 Flow 계획에 반영했어요. 계획을 저장하기 전까지는 최종 적용되지 않습니다.',
      });
    }
  };
  quickEditorCommitSucceeded.current = () => undefined;

  planEditorRearm.current = () => {
    const active = planEditor.active;
    const scopeRef = planGuard.current?.flowRef;
    if (active && scopeRef) pushEditorHistory('plan', active.level, scopeRef);
  };
  quickEditorRearm.current = () => {
    const active = quickEditor.active;
    const scopeRef = quickEditorBaseline.current?.draft.itemRef;
    if (active && scopeRef) pushEditorHistory('quick-item', active.level, scopeRef);
  };

  planEditorClosed.current = (level, cause) => {
    const scopeRef = planGuard.current?.flowRef;
    const closingActive = planEditor.active;
    const sourceFlow = planSourceFlow.current;
    let discardedRefs: readonly string[] = [];
    let discardedChanges: readonly PersonalWorkspacePocReceiptChange[] = [];
    let canceledScopeRef = scopeRef;
    if (cause !== 'commit-success' && closingActive && sourceFlow) {
      if (closingActive.level === 'plan') {
        const summary = summarizePersonalWorkspacePocPlanDraftChanges({
          sourceFlow,
          baseline: closingActive.baseline,
          draft: closingActive.draft,
        });
        discardedRefs = summary.affectedRefs;
        discardedChanges = summary.changes;
      } else {
        const parentDraft = planEditor.session?.plan?.draft;
        const sourceItem = sourceFlow.items.find(
          (item) => item.ref === closingActive.draft.identity.itemRef,
        );
        if (parentDraft && sourceItem) {
          const baselineParent: PersonalWorkspacePocPlanDraft = {
            ...parentDraft,
            items: { ...parentDraft.items, [sourceItem.ref]: closingActive.baseline },
          };
          const draftParent: PersonalWorkspacePocPlanDraft = {
            ...parentDraft,
            items: { ...parentDraft.items, [sourceItem.ref]: closingActive.draft },
          };
          const summary = summarizePersonalWorkspacePocPlanDraftChanges({
            sourceFlow,
            baseline: baselineParent,
            draft: draftParent,
          });
          discardedRefs = summary.affectedRefs;
          discardedChanges = summary.changes;
          canceledScopeRef = sourceItem.ref;
        }
      }
    }
    if (level === 'plan' && editorOwner.current?.kind === 'plan') {
      editorOwner.current.phase = 'closing';
    }
    if (!scopeRef) {
      if (level === 'plan' && editorOwner.current?.kind === 'plan') editorOwner.current = undefined;
      return;
    }
    closeEditorHistory({ kind: 'plan', level, scopeRef }, () => {
      const attempt = planAttempt.current;
      const shouldFinalize = cause === 'commit-success'
        && level === 'plan'
        && Boolean(attempt?.changes.length)
        && !planDisplayBinding.current?.noopAccepted;
      if (level === 'item') {
        setResultNavigation((current) => {
          const { openItemRef: _openItemRef, ...rest } = current;
          return rest;
        });
      }
      if (cause !== 'commit-success') {
        const intentId = level === 'item'
          ? `item-cancel:${closingActive?.id ?? canceledScopeRef ?? scopeRef}`
          : planAttempt.current?.intentId
            ?? `plan-cancel:${planGuard.current?.guardId ?? canceledScopeRef}`;
        publishPlanDisplay({
          receiptId: nextReceiptId(intentId, 'canceled'),
          intentId,
          operation: level === 'item'
            ? 'apply-item-to-parent-personal-draft'
            : 'commit-personal-plan',
          status: 'canceled',
          createdAt: new Date().toISOString(),
          scopeRef: canceledScopeRef ?? scopeRef,
          affectedRefs: discardedRefs,
          affectedCount: discardedRefs.length,
          stateRevisionBefore: stateRef.current.revision,
          stateRevisionAfter: stateRef.current.revision,
          changes: discardedChanges,
          targetWriteCount: 0,
          supportWriteCount: 0,
          rollback: 'not-needed',
          returnContext: level === 'item' ? 'parent-plan' : planReturnContext.current,
        }, sourceFlow);
        setStatus({
          kind: 'canceled',
          message: level === 'item'
            ? '할 일 변경을 버리고 Flow 계획으로 돌아왔어요.'
            : 'Flow 계획 편집을 닫았어요. 바뀐 내용은 없습니다.',
          receiptStatus: 'canceled',
        });
      }
      if (level === 'plan') {
        if (editorOwner.current?.kind === 'plan') editorOwner.current = undefined;
        if (shouldFinalize) finalizeSuccessfulEditorAttempt(attempt);
        else if (cause === 'commit-success' && attempt
          && (attempt.changes.length === 0 || planDisplayBinding.current?.noopAccepted)) {
          publishPlanDisplay({
            receiptId: nextReceiptId(attempt.intentId, 'noop'), intentId: attempt.intentId,
            operation: 'commit-personal-plan', status: 'noop', createdAt: new Date().toISOString(),
            scopeRef: attempt.scopeRef, affectedRefs: [], affectedCount: 0, changes: [],
            stateRevisionBefore: attempt.stateRevisionBefore, stateRevisionAfter: attempt.stateRevisionBefore,
            targetWriteCount: 0, supportWriteCount: 0, rollback: 'not-needed',
          }, sourceFlow);
          setStatus({ kind: 'neutral', message: '같은 내용이라 저장하지 않았습니다.', receiptStatus: 'noop' });
        }
        planGuard.current = undefined;
        planSourceFlow.current = undefined;
        planAttempt.current = undefined;
        planStorageEvidence.current = undefined;
        planDisplayBinding.current = undefined;
      }
    });
  };

  quickEditorClosed.current = (level, cause) => {
    const scopeRef = quickEditorBaseline.current?.draft.itemRef;
    const closingActive = quickEditor.active;
    const discarded = cause !== 'commit-success'
      && closingActive?.level === 'plan'
      && quickEditorBaseline.current
      ? summarizePersonalWorkspacePocQuickDraftChanges(
        quickEditorBaseline.current.draft,
        closingActive.draft,
      )
      : { affectedRefs: [], changes: [] };
    if (editorOwner.current?.kind === 'quick-item') editorOwner.current.phase = 'closing';
    if (!scopeRef) {
      if (editorOwner.current?.kind === 'quick-item') editorOwner.current = undefined;
      return;
    }
    closeEditorHistory({ kind: 'quick-item', level, scopeRef }, () => {
      const attempt = quickEditorAttempt.current;
      const shouldFinalize = cause === 'commit-success' && Boolean(attempt?.changes.length);
      if (cause !== 'commit-success') {
        const intentId = quickEditorAttempt.current?.intentId
          ?? `quick-cancel:${scopeRef}`;
        setReceipt(requirePersonalWorkspacePocReceipt({
          receiptId: nextReceiptId(intentId, 'canceled'),
          intentId,
          operation: 'commit-quick-item-root',
          status: 'canceled',
          createdAt: new Date().toISOString(),
          scopeRef,
          affectedRefs: discarded.affectedRefs,
          affectedCount: discarded.affectedRefs.length,
          stateRevisionBefore: stateRef.current.revision,
          stateRevisionAfter: stateRef.current.revision,
          changes: discarded.changes,
          targetWriteCount: 0,
          supportWriteCount: 0,
          rollback: 'not-needed',
          returnContext: quickReturnContext.current,
        }));
        setStatus({
          kind: 'canceled',
          message: '빠른 할 일 편집을 닫았어요. 바뀐 내용은 없습니다.',
          receiptStatus: 'canceled',
        });
      }
      if (editorOwner.current?.kind === 'quick-item') editorOwner.current = undefined;
      if (shouldFinalize) finalizeSuccessfulEditorAttempt(attempt);
      quickEditorBaseline.current = undefined;
      quickEditorAttempt.current = undefined;
      quickStorageEvidence.current = undefined;
    });
  };

  useEffect(() => {
    const handleEditorPopState = () => {
      if (editorHistoryPopstateConsume.current) {
        editorHistoryPopstateConsume.current = false;
        return;
      }
      if (planEditor.active) {
        if (planEditor.active.pendingClose) { planEditorRearm.current(); return; }
        planEditor.requestClose('browser-back');
        return;
      }
      if (quickEditor.active) {
        if (quickEditor.active.pendingClose) { quickEditorRearm.current(); return; }
        quickEditor.requestClose('browser-back');
      }
    };
    window.addEventListener('popstate', handleEditorPopState);
    return () => window.removeEventListener('popstate', handleEditorPopState);
  }, [planEditor.active, planEditor.requestClose, quickEditor.active, quickEditor.requestClose]);

  useEffect(() => {
    const active = planEditor.active;
    const attempt = planAttempt.current;
    if (!active?.failure || !attempt) return;
    const recoveryRequired = active.status === 'recovery-required';
    const storageFailure = resolvePersonalWorkspacePocEditorFailureEvidence(
      planStorageEvidence.current,
      recoveryRequired,
    );
    publishPlanDisplay({
      receiptId: nextReceiptId(attempt.intentId, 'failure'),
      intentId: attempt.intentId,
      operation: 'commit-personal-plan',
      status: 'failure',
      createdAt: new Date().toISOString(),
      scopeRef: attempt.scopeRef,
      affectedRefs: attempt.affectedRefs,
      affectedCount: attempt.affectedRefs.length,
      stateRevisionBefore: attempt.stateRevisionBefore,
      stateRevisionAfter: attempt.stateRevisionBefore,
      changes: attempt.changes,
      targetWriteCount: 0,
      supportWriteCount: storageFailure.supportWriteCount,
      rollback: storageFailure.rollback,
      errorCode: active.failure.code.replace(/[^a-z0-9_-]/giu, '-').toLowerCase(),
    });
    setStatus({ kind: 'failure', message: active.failure.message, receiptStatus: 'failure' });
  }, [planEditor.active?.failure, planEditor.active?.status]);

  useEffect(() => {
    const active = quickEditor.active;
    const attempt = quickEditorAttempt.current;
    if (!active?.failure || !attempt) return;
    const recoveryRequired = active.status === 'recovery-required';
    const storageFailure = resolvePersonalWorkspacePocEditorFailureEvidence(
      quickStorageEvidence.current,
      recoveryRequired,
    );
    setReceipt(requirePersonalWorkspacePocReceipt({
      receiptId: nextReceiptId(attempt.intentId, 'failure'),
      intentId: attempt.intentId,
      operation: attempt.operation,
      status: 'failure',
      createdAt: new Date().toISOString(),
      scopeRef: attempt.scopeRef,
      affectedRefs: attempt.affectedRefs,
      affectedCount: attempt.affectedRefs.length,
      stateRevisionBefore: attempt.stateRevisionBefore,
      stateRevisionAfter: attempt.stateRevisionBefore,
      changes: attempt.changes,
      targetWriteCount: 0,
      supportWriteCount: storageFailure.supportWriteCount,
      rollback: storageFailure.rollback,
      retryIntent: {
        kind: attempt.operation,
        parameters: {
          scopeRef: attempt.scopeRef,
          intentId: attempt.intentId,
          payload: attempt.retryDescriptor.payload,
          guard: attempt.retryDescriptor.guard,
        },
      },
      errorCode: active.failure.code.replace(/[^a-z0-9_-]/giu, '-').toLowerCase(),
    }));
    setStatus({ kind: 'failure', message: active.failure.message, receiptStatus: 'failure' });
  }, [quickEditor.active?.failure, quickEditor.active?.status]);

  useEffect(() => {
    if (initialHashHandled.current) return;
    initialHashHandled.current = true;
    const encodedRef = window.location.hash.startsWith('#flow=')
      ? window.location.hash.slice('#flow='.length)
      : '';
    if (!encodedRef) return;
    try {
      const ref = decodeURIComponent(encodedRef);
      if (model.flows.some((flow) => flow.ref === ref)) setSelectedFlowRef(ref);
    } catch {
      // A malformed hash does not affect the exact-query gate or stored state.
    }
  }, [model]);

  const beginPlanEditor = (
    flowRef: string,
    returnFocusSelector: string,
  ): PersonalWorkspacePocPlanDraft | undefined => {
    if (
      editorOwner.current
      || pending.current
      || planEditor.active
      || quickEditor.active
    ) {
      setStatus({ kind: 'neutral', message: '열려 있는 편집을 먼저 저장하거나 닫아 주세요.' });
      return undefined;
    }
    const sourceFlow = findSourceFlow(flowRef);
    if (!sourceFlow) {
      setStatus({ kind: 'failure', message: '편집할 원본 Flow를 찾을 수 없습니다.' });
      return undefined;
    }
    let stateRaw: string | null;
    try {
      stateRaw = window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY);
    } catch {
      setStatus({ kind: 'failure', message: '현재 저장 상태를 읽지 못해 편집을 열지 않았습니다.' });
      return undefined;
    }
    const opened = openPersonalWorkspacePocPlanEditor({
      baseModel: initialModel,
      state: stateRef.current,
      stateRaw,
      flowRef,
    });
    if (!opened.ok) {
      setStatus({ kind: 'failure', message: opened.failure.message });
      return undefined;
    }
    if (canonicalPersonalWorkspacePocPlanEditorBytes(sourceFlow) !== opened.guard.canonicalSourceBytes) {
      setStatus({ kind: 'failure', message: '표시 중인 원문과 편집 기준이 다릅니다. 원문 변경을 확인한 뒤 다시 열어 주세요.' });
      return undefined;
    }
    discardPlanDisplay();
    planGuard.current = opened.guard;
    planSourceFlow.current = sourceFlow;
    planAttempt.current = undefined;
    planStorageEvidence.current = undefined;
    planReturnContext.current = returnFocusSelector.includes('result')
      ? 'result-view'
      : selectedFlowRef
        ? 'flow-detail'
        : section === 'folder'
          ? 'folder-list'
          : 'period-list';
    planReturnFocusSelector.current = returnFocusSelector;
    editorOwner.current = { kind: 'plan', phase: 'open' };
    planEditor.openPlan({
      id: `personal-workspace-plan:${flowRef}:${Date.now()}`,
      context: 'saved-overlay',
      draft: opened.draft,
      returnPoint: captureFlowEditorReturnPoint({
        targetKey: `personal-workspace-plan-opener:${flowRef}`,
        fallbackSelector: returnFocusSelector,
        scrollTargets: [{
          targetKey: 'personal-workspace-main',
          selector: '#personal-workspace-poc-main',
        }],
      }),
    });
    pushEditorHistory('plan', 'plan', flowRef);
    setStatus({ kind: 'ready', message: '원본은 그대로 유지됩니다. 내 계획에서 바꿀 내용을 입력해 주세요.' });
    return opened.draft;
  };

  const beginPlanItemEditor = (
    itemRef: string,
    returnFocusSelector: string,
    parentDraft: PersonalWorkspacePocPlanDraft | undefined = planEditor.session?.plan?.draft,
  ): boolean => {
    if (!parentDraft) {
      setStatus({ kind: 'failure', message: '먼저 Flow 계획을 열어 주세요.' });
      return false;
    }
    const opened = openPersonalWorkspacePocPlanItemEditor({ parentDraft, itemRef });
    if (!opened.ok) {
      setStatus({ kind: 'failure', message: opened.failure.message });
      return false;
    }
    planEditor.openItem({
      id: `personal-workspace-item:${itemRef}:${Date.now()}`,
      draft: opened.draft,
      returnPoint: captureFlowEditorReturnPoint({
        targetKey: `personal-workspace-plan-item-opener:${itemRef}`,
        fallbackSelector: returnFocusSelector,
        captureActiveElement: false,
        scrollTargets: [{
          targetKey: 'personal-workspace-poc-plan-items',
          selector: '[data-testid="personal-workspace-plan-item-list"]',
        }],
      }),
    });
    pushEditorHistory('plan', 'item', parentDraft.flowRef);
    setStatus({ kind: 'ready', message: '할 일 변경은 Flow 계획에 먼저 반영됩니다. 계획을 저장해야 최종 적용됩니다.' });
    return true;
  };

  const beginWorkspacePlanItemEditor = (
    flowRef: string,
    itemRef: string,
    returnFocusSelector: string,
  ) => {
    const parentDraft = beginPlanEditor(flowRef, returnFocusSelector);
    if (!parentDraft) return;
    const index = parentDraft.orderedItemRefs.indexOf(itemRef);
    const fallback = index >= 0
      ? `#personal-workspace-poc-plan-item-${index}`
      : '[data-testid="personal-workspace-plan-item-list"]';
    window.requestAnimationFrame(() => {
      if (editorOwner.current?.kind !== 'plan' || editorOwner.current.phase !== 'open') return;
      beginPlanItemEditor(itemRef, fallback, parentDraft);
    });
  };

  const beginQuickItemEditor = (
    itemRef: string,
    returnFocusSelector: string,
  ) => {
    if (
      editorOwner.current
      || pending.current
      || planEditor.active
      || quickEditor.active
    ) {
      setStatus({ kind: 'neutral', message: '열려 있는 편집을 먼저 저장하거나 닫아 주세요.' });
      return;
    }
    const quickItem = stateRef.current.quickItems.find(
      (item) => toPersonalWorkspacePocQuickItemRef(item.quickItemId) === itemRef,
    );
    if (!quickItem) {
      setStatus({ kind: 'failure', message: '수정할 빠른 할 일을 찾을 수 없습니다.' });
      return;
    }
    let stateRaw: string | null;
    try {
      stateRaw = window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY);
    } catch {
      setStatus({ kind: 'failure', message: '현재 저장 상태를 읽지 못해 편집을 열지 않았습니다.' });
      return;
    }
    if (!isPersonalWorkspacePocEditorStateRawCurrent(stateRef.current, stateRaw)) {
      setStatus({
        kind: 'failure',
        message: '다른 화면에서 저장 상태가 바뀌었습니다. 새로고침한 뒤 다시 편집해 주세요.',
      });
      return;
    }
    const placement = stateRef.current.placements[itemRef];
    const draft: PersonalWorkspacePocQuickItemRootDraft = {
      itemRef,
      title: quickItem.title,
      memo: quickItem.memo,
      ...(placement?.scheduleMode === 'fixed_date' && placement.date
        ? { executionDate: placement.date }
        : {}),
    };
    quickEditorBaseline.current = {
      draft: structuredClone(draft),
      stateRevision: stateRef.current.revision,
      stateRaw,
    };
    quickEditorAttempt.current = undefined;
    quickStorageEvidence.current = undefined;
    quickReturnContext.current = section === 'folder' ? 'quick-list' : 'period-list';
    editorOwner.current = { kind: 'quick-item', phase: 'open' };
    quickEditor.openPlan({
      id: `personal-workspace-quick-item:${itemRef}:${Date.now()}`,
      context: 'saved-overlay',
      draft,
      returnPoint: captureFlowEditorReturnPoint({
        targetKey: `personal-workspace-quick-opener:${itemRef}`,
        fallbackSelector: returnFocusSelector,
      }),
    });
    pushEditorHistory('quick-item', 'plan', itemRef);
    setStatus({ kind: 'ready', message: '빠른 할 일의 내용과 실행일을 수정할 수 있습니다.' });
  };

  const requestPlanCommit = (draft: PersonalWorkspacePocPlanDraft) => {
    const active = planEditor.active;
    const sourceFlow = planSourceFlow.current;
    const guard = planGuard.current;
    if (!active || active.level !== 'plan' || !sourceFlow || !guard) return;
    if (
      active.status === 'submitting'
      || active.status === 'recoverable-error'
      || active.status === 'recovery-required'
    ) return;
    const summary = summarizePersonalWorkspacePocPlanDraftChanges({
      sourceFlow,
      baseline: active.baseline,
      draft,
    });
    let currentSourceRaw: string | null;
    try { currentSourceRaw = window.localStorage.getItem(PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY); }
    catch { setStatus({ kind: 'failure', message: '원문 저장 상태를 읽지 못해 저장하지 않았습니다.' }); return; }
    if (currentSourceRaw !== sourceCandidateRawRef.current) {
      setStatus({ kind: 'failure', message: '다른 화면에서 원문 상태가 바뀌었습니다. 새로고침해 확인해 주세요.' });
      return;
    }
    planAttempt.current = {
      intentId: `plan-intent:${planGuard.current?.guardId ?? sourceFlow.ref}:${Date.now()}`,
      operation: 'commit-personal-plan',
      scopeRef: sourceFlow.ref,
      stateRevisionBefore: stateRef.current.revision,
      affectedRefs: Object.freeze([...summary.affectedRefs]),
      changes: Object.freeze(summary.changes.map(change => Object.freeze({ ...change }))),
      retryDescriptor: personalWorkspacePocPlanRetryDescriptor(draft, guard),
    };
    planDisplayBinding.current = {
      attempt: planAttempt.current, sourceFlow, sourceRaw: currentSourceRaw,
      sourceEpoch: planSourceEpoch.current, screenKey: planScreenRef.current,
      returnFocusSelector: planReturnFocusSelector.current,
      transactionId: active.id, draftRevision: active.revision, accepted: false,
    };
    planStorageEvidence.current = undefined;
    planEditor.requestCommit();
  };

  const requestQuickItemCommit = (draft: PersonalWorkspacePocQuickItemRootDraft) => {
    const active = quickEditor.active;
    const baseline = quickEditorBaseline.current;
    if (!active || !baseline) return;
    if (
      active.status === 'submitting'
      || active.status === 'recoverable-error'
      || active.status === 'recovery-required'
    ) return;
    const summary = summarizePersonalWorkspacePocQuickDraftChanges(baseline.draft, draft);
    quickEditorAttempt.current = {
      intentId: `quick-intent:${draft.itemRef}:${Date.now()}`,
      operation: 'commit-quick-item-root',
      scopeRef: draft.itemRef,
      stateRevisionBefore: stateRef.current.revision,
      affectedRefs: summary.affectedRefs,
      changes: summary.changes,
      retryDescriptor: personalWorkspacePocQuickRetryDescriptor(draft, baseline),
    };
    quickStorageEvidence.current = undefined;
    if (summary.changes.length === 0) {
      const attempt = quickEditorAttempt.current;
      setReceipt(requirePersonalWorkspacePocReceipt({
        receiptId: nextReceiptId(attempt.intentId, 'noop'),
        intentId: attempt.intentId,
        operation: attempt.operation,
        status: 'noop',
        createdAt: new Date().toISOString(),
        scopeRef: attempt.scopeRef,
        affectedRefs: [],
        affectedCount: 0,
        stateRevisionBefore: attempt.stateRevisionBefore,
        stateRevisionAfter: attempt.stateRevisionBefore,
        changes: [],
        targetWriteCount: 0,
        supportWriteCount: 0,
        rollback: 'not-needed',
      }));
      setStatus({
        kind: 'neutral',
        message: '같은 내용이라 저장하지 않았습니다.',
        receiptStatus: 'noop',
      });
    }
    quickEditor.requestCommit();
  };

  const retryPlanEditorCommit = () => {
    const active = planEditor.active;
    const attempt = planAttempt.current;
    const guard = planGuard.current;
    if (
      !active
      || active.level !== 'plan'
      || active.status !== 'recoverable-error'
      || !attempt
      || !guard
    ) return;
    const currentDescriptor = personalWorkspacePocPlanRetryDescriptor(active.draft, guard);
    if (!samePersonalWorkspacePocRetryDescriptor(currentDescriptor, attempt.retryDescriptor)) {
      setStatus({ kind: 'neutral', message: '편집 내용이 바뀌었습니다. 저장을 눌러 새 변경으로 시도해 주세요.' });
      return;
    }
    planStorageEvidence.current = undefined;
    planEditor.requestCommit();
  };

  const retryQuickEditorCommit = () => {
    const active = quickEditor.active;
    const attempt = quickEditorAttempt.current;
    const baseline = quickEditorBaseline.current;
    if (
      !active
      || active.level !== 'plan'
      || active.status !== 'recoverable-error'
      || !attempt
      || !baseline
    ) return;
    const currentDescriptor = personalWorkspacePocQuickRetryDescriptor(active.draft, baseline);
    if (!samePersonalWorkspacePocRetryDescriptor(currentDescriptor, attempt.retryDescriptor)) {
      setStatus({ kind: 'neutral', message: '편집 내용이 바뀌었습니다. 저장을 눌러 새 변경으로 시도해 주세요.' });
      return;
    }
    quickStorageEvidence.current = undefined;
    quickEditor.requestCommit();
  };

  const contextualRecovery = useRef(false);
  const resultFacts = useCallback((raw: string | null): ResultFacts => ({
    lane: 'workspace',
    exactTargetRaw: raw,
    hasUndo: Boolean(stateRef.current.undo),
    authorityReady: isPersonalWorkspacePocEditorStateRawCurrent(stateRef.current, raw),
    pending: pending.current,
    editorOwner: Boolean(editorOwner.current),
    recoveryOwner: contextualRecovery.current,
    receiptOwnerId: planDisplayRef.current?.receiptId ?? contextualReceiptRef.current?.receiptId ?? null,
  }), []);

  useEffect(() => {
    const observe = (event: StorageEvent) => {
      if (event.key === null || event.key === PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY) {
        planSourceEpoch.current += 1;
        discardPlanDisplay();
      } else if (event.key === PERSONAL_WORKSPACE_POC_STATE_KEY) discardPlanDisplay();
    };
    const inspect = () => {
      const owner = planResultOwner.current;
      if (!owner) return;
      try {
        if (!planBindingIsCurrent(owner.binding)
          || window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY) !== owner.exactRaw) discardPlanDisplay();
      } catch { discardPlanDisplay(); }
    };
    window.addEventListener('storage', observe);
    window.addEventListener('focus', inspect);
    return () => { window.removeEventListener('storage', observe); window.removeEventListener('focus', inspect); };
  }, [discardPlanDisplay]);

  useEffect(() => {
    if (planObservedSource.current !== sourceCandidateRaw) {
      planObservedSource.current = sourceCandidateRaw;
      planSourceEpoch.current += 1;
      discardPlanDisplay();
    }
    if (planPreviousScreen.current !== planScreenKey) {
      planPreviousScreen.current = planScreenKey;
      discardPlanDisplay();
    }
    const owner = planResultOwner.current;
    if (owner && (owner.binding.screenKey !== planScreenKey || planOverlayRef.current
      || owner.binding.sourceRaw !== sourceCandidateRaw)) discardPlanDisplay();
  }, [planScreenKey, sourceCandidateRaw, sourceUpdateOpen, moveTarget, quickConversionOpen, resetConfirmOpen, trashDeleteTarget, discardPlanDisplay]);

  useEffect(() => {
    const pointer = () => { lastInputWasKeyboard.current = false; };
    const keyboard = () => { lastInputWasKeyboard.current = true; };
    const checkRaw = (event?: StorageEvent) => {
      if (event && event.key !== null && event.key !== PERSONAL_WORKSPACE_POC_STATE_KEY) return;
      const owner = contextualOwnerRef.current;
      if (!owner.lastSuccess && !owner.activeAttempt) return;
      if (event && event.newValue !== JSON.stringify(stateRef.current)) {
        // An observed A→B event remains invalidating even if B→A has already followed it.
        interruptResult('observed-storage-event-drift');
        return;
      }
      try {
        const raw = window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY);
        if (!isPersonalWorkspacePocEditorStateRawCurrent(stateRef.current, raw)) {
          interruptResult('observed-storage-drift');
        }
      } catch { interruptResult('storage-unreadable'); }
    };
    document.addEventListener('pointerdown', pointer, true);
    document.addEventListener('keydown', keyboard, true);
    window.addEventListener('storage', checkRaw);
    const focus = () => checkRaw();
    window.addEventListener('focus', focus);
    return () => {
      document.removeEventListener('pointerdown', pointer, true);
      document.removeEventListener('keydown', keyboard, true);
      window.removeEventListener('storage', checkRaw);
      window.removeEventListener('focus', focus);
    };
  }, [interruptResult]);

  useEffect(() => {
    interruptResult('screen-or-source-owner-changed');
  }, [section, activeFolderId, selectedFlowRef, activeItemRef, sourceUpdateOpen, sourceCandidateRaw, interruptResult]);

  useEffect(() => {
    if (planEditor.active || quickEditor.active || receipt || planDisplay) interruptResult('editor-or-receipt-owner');
    if (quickEditor.active || receipt) discardPlanDisplay();
  }, [Boolean(planEditor.active), Boolean(quickEditor.active), receipt, planDisplay, interruptResult, discardPlanDisplay]);

  const commitTransition = useCallback(async (
    transition: PersonalWorkspacePocTransition,
    storageEvidence?: PersonalWorkspacePocEditorStorageEvidence,
    undoTicket?: ResultTicket,
    planPresentation?: Readonly<{ isCurrent: () => boolean }>,
  ): Promise<TransitionOutcome> => {
    const operationOwner = workspaceWriteOwner.current;
    const operationHref = window.location.href;
    const operationIsCurrent = () => operationOwner !== undefined
      && workspaceWriteOwner.current === operationOwner && window.location.href === operationHref;
    if (!operationIsCurrent()) return 'unchanged';
    let ticket = undoTicket;
    const finishResult = (outcome: ResultOutcome) => {
      if (!ticket) return;
      const settled = ticket.kind === 'undo'
        ? settleUndo(contextualOwnerRef.current, ticket, outcome)
        : settleAttempt(contextualOwnerRef.current, ticket, outcome);
      setResultOwner(settled.state);
    };
    if (editorOwner.current || planEditor.active || quickEditor.active) {
      interruptResult('editor-owner');
      setStatus({
        kind: 'neutral',
        message: '열려 있는 편집을 먼저 저장하거나 닫아 주세요.',
      });
      return 'unchanged';
    }
    if (pending.current) return 'unchanged';
    if (planPresentation && !planPresentation.isCurrent()) return 'unchanged';
    if (!planPresentation) discardPlanDisplay();
    const expectedState = stateRef.current;
    let expectedStateRaw: string | null;
    try {
      expectedStateRaw = window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY);
    } catch {
      interruptResult('storage-unreadable');
      setStatus({ kind: 'failure', message: '저장 상태를 읽지 못해 변경하지 않았습니다.' });
      return 'failed';
    }
    if (!isPersonalWorkspacePocEditorStateRawCurrent(expectedState, expectedStateRaw)) {
      interruptResult('observed-storage-drift');
      setStatus({
        kind: 'failure',
        message: '다른 화면에서 저장 상태가 바뀌었습니다. 새로고침한 뒤 다시 시도해 주세요.',
      });
      return 'failed';
    }
    const result = applyPersonalWorkspacePocTransition(expectedState, transition);
    if (!undoTicket && !planPresentation) {
      const intent = contextualIntent.current(transition, result.state);
      if (intent) {
        const started = beginAttempt(contextualOwnerRef.current, intent, resultFacts(expectedStateRaw));
        if (started.ok) {
          ticket = started.ticket;
          setResultOwner(started.state);
        } else {
          interruptResult('unavailable-result-owner');
        }
      } else interruptResult('different-workspace-action');
    }
    if (!result.changed) {
      finishResult({ kind: transition.type === 'cancel' ? 'canceled' : 'noop' });
      setStatus({
        kind: transition.type === 'cancel' ? 'canceled' : 'neutral',
        message: result.message,
      });
      return 'unchanged';
    }

    const nextComposition = composePersonalWorkspacePocReadModel(initialModel, result.state);
    const semanticPreflight = nextComposition.ok
      ? validatePersonalWorkspacePocStateReferences(result.state, nextComposition.model)
      : nextComposition;
    if (!semanticPreflight.ok) {
      finishResult({ kind: 'failed' });
      setStatus({
        kind: 'failure',
        message: '변경 결과를 안전하게 저장할 수 없어 원래 상태를 유지합니다.',
      });
      return 'failed';
    }

    pending.current = true;
    setStatus({ kind: 'saving', message: '변경 내용을 저장 중…' });
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    if (!operationIsCurrent()) { pending.current = false; return 'unchanged'; }
    const locked = await withFlowUserDataWriteLock(() => {
      if (!operationIsCurrent()) return { kind: 'owner-ended' as const };
      if (planPresentation && !planPresentation.isCurrent()) return { kind: 'stale' as const };
      const currentStateRaw = window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY);
      if (currentStateRaw !== expectedStateRaw) return { kind: 'stale' as const };
      const saved = commitPersonalWorkspacePocStorage({
        storage: storageEvidence
          ? createPersonalWorkspacePocEditorEvidenceStorage(window.localStorage, storageEvidence)
          : window.localStorage,
        state: result.state,
        transactionId: `workspace:${transition.type}:${result.state.revision}`,
        ...(result.storageCompanion
          ? { authoringDraftRawValue: result.storageCompanion.rawValue }
          : {}),
      });
      return saved.ok
        ? { kind: 'saved' as const }
        : { kind: 'save-failed' as const, rollback: saved.rollback };
    });
    pending.current = false;
    // Do not publish status, receipt, focus, or old state into a later route.
    // This does not undo a synchronous write already committed by its owner.
    if (!operationIsCurrent() || locked.ok && locked.value.kind === 'owner-ended') return 'unchanged';
    if (!locked.ok) {
      finishResult({ kind: 'failed' });
      setStatus({
        kind: 'failure',
        message: '다른 저장이 진행 중이라 변경하지 않았어요. 잠시 후 다시 시도해 주세요.',
      });
      return 'failed';
    }
    if (locked.value.kind === 'stale') {
      interruptResult('observed-storage-drift');
      setStatus({
        kind: 'failure',
        message: '저장 직전에 다른 변경을 발견해 원래 상태를 유지했습니다. 새로고침해 주세요.',
      });
      return 'failed';
    }
    if (locked.value.kind === 'save-failed') {
      contextualRecovery.current = locked.value.rollback === 'recovery-required';
      finishResult({ kind: contextualRecovery.current ? 'recovery-required' : 'failed' });
      setStatus({
        kind: 'failure',
        message: locked.value.rollback === 'recovery-required'
          ? '저장을 확인하지 못했어요. 새로고침해 복구를 완료해 주세요.'
          : '저장하지 못했어요. 원래 상태를 유지합니다.',
      });
      return 'failed';
    }
    let confirmedStateRaw: string | null;
    try {
      confirmedStateRaw = window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY);
    } catch {
      contextualRecovery.current = true;
      finishResult({ kind: 'recovery-required' });
      setStatus({
        kind: 'failure',
        message: '저장 뒤 상태를 확인하지 못했습니다. 새로고침해 실제 상태를 확인해 주세요.',
      });
      return 'failed';
    }
    if (confirmedStateRaw !== JSON.stringify(result.state)) {
      interruptResult('observed-storage-drift');
      setStatus({
        kind: 'failure',
        message: '저장 직후 다른 변경을 발견했습니다. 새로고침해 최신 상태를 확인해 주세요.',
      });
      return 'failed';
    }
    stateRef.current = result.state;
    setState(result.state);
    finishResult({ kind: 'success', exactTargetRaw: confirmedStateRaw, hasUndo: Boolean(result.state.undo), authorityReady: true });
    if (!planPresentation && (!ticket || contextualOwnerRef.current.epoch === ticket.epoch)) {
      setReceipt(undefined);
      contextualReceiptRef.current = undefined;
      setStatus({ kind: 'success', message: result.message });
    }
    return 'changed';
  }, [initialModel, planEditor.active, quickEditor.active, interruptResult, resultFacts, setResultOwner, discardPlanDisplay]);

  const restorePlanResultFocus = (binding: Pick<PlanDisplayBinding, 'screenKey' | 'returnFocusSelector'> | undefined) => {
    if (!binding) return;
    window.requestAnimationFrame(() => {
      if (editorOwner.current || planOverlayRef.current || binding.screenKey !== planScreenRef.current) return;
      const opener = document.querySelector<HTMLElement>(binding.returnFocusSelector);
      const target = opener?.getClientRects().length ? opener : document.getElementById('personal-workspace-poc-main');
      if (target) {
        if (!target.matches('button,a[href],input,select,textarea,[tabindex]')) target.tabIndex = -1;
        target.focus({ preventScroll: true });
        const rect = target.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) target.scrollIntoView({ block: 'nearest' });
      }
    });
  };

  const dismissPlanResult = () => {
    const binding = planResultOwner.current?.binding ?? planDisplayReturnPoint.current;
    discardPlanDisplay();
    restorePlanResultFocus(binding);
  };

  const undoPlanDisplay = async () => {
    const owner = planResultOwner.current;
    if (!owner || owner.display.status !== 'success' || owner.consumed || pending.current) return;
    const isCurrent = () => {
      try {
        return planResultOwner.current === owner && planDisplayRef.current === owner.display
          && planBindingIsCurrent(owner.binding) && !editorOwner.current && !planOverlayRef.current
          && !contextualRecovery.current && stateRef.current.revision === owner.display.stateRevisionAfter
          && Boolean(stateRef.current.undo)
          && window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY) === owner.exactRaw;
      } catch { return false; }
    };
    if (!isCurrent()) { discardPlanDisplay(); return; }
    owner.consumed = true;
    const evidence = createPersonalWorkspacePocEditorStorageEvidence();
    const outcome = await commitTransition({ type: 'undo', now: new Date().toISOString() }, evidence, undefined, { isCurrent });
    if (outcome !== 'changed') { discardPlanDisplay(); return; }
    // The same private owner must survive through the lock and the final read.
    // A stale result is not restored even if another tab later restores its bytes.
    if (planResultOwner.current !== owner || !planBindingIsCurrent(owner.binding) || planOverlayRef.current) {
      discardPlanDisplay();
      setStatus({ kind: 'success', message: '되돌리기는 저장했지만 화면 기준이 바뀌어 변경 목록을 표시하지 않았어요.' });
      return;
    }
    const shown = publishPlanDisplay({
      receiptId: nextReceiptId(owner.display.intentId, 'undone'), intentId: owner.display.intentId,
      operation: 'commit-personal-plan', status: 'undone', createdAt: new Date().toISOString(),
      scopeRef: owner.display.scopeRef, affectedRefs: owner.display.affectedRefs, affectedCount: owner.display.affectedCount,
      changes: owner.display.changes.map(change => ({ ...change, before: change.after, after: change.before })),
      stateRevisionBefore: owner.display.stateRevisionAfter, stateRevisionAfter: stateRef.current.revision,
      targetWriteCount: evidence.successfulTargetMutationCount, supportWriteCount: evidence.successfulSupportMutationCount,
      rollback: 'not-needed', undoLabel: '이 변경 되돌리기', undoOfReceiptId: owner.display.receiptId,
    }, owner.binding.sourceFlow);
    planResultOwner.current = shown ? { ...owner, display: shown, exactRaw: JSON.stringify(stateRef.current), consumed: true } : undefined;
    setStatus({ kind: 'success', message: shown ? '이 개인 계획 변경을 되돌렸어요.' : '되돌리기는 완료했지만 변경 목록을 표시하지 못했어요.', ...(shown ? { receiptStatus: 'undone' as const } : {}) });
    restorePlanResultFocus(owner.binding);
  };

  const undoContextualResult = async (ownerId: string) => {
    let raw: string | null;
    try { raw = window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY); }
    catch {
      interruptResult('storage-unreadable');
      setStatus({ kind: 'failure', message: '저장 상태를 읽지 못해 되돌리지 않았어요.' });
      return;
    }
    if (!isPersonalWorkspacePocEditorStateRawCurrent(stateRef.current, raw)) {
      interruptResult('observed-storage-drift');
      setStatus({ kind: 'failure', message: '다른 변경을 발견해 되돌리지 않았어요. 새로고침해 주세요.' });
      return;
    }
    const started = beginContextualUndo(contextualOwnerRef.current, ownerId, resultFacts(raw));
    if (!started.ok) return;
    setResultOwner(started.state);
    const origin = resultOrigin.current;
    const restoreKeyboardFocus = lastInputWasKeyboard.current;
    const outcome = await commitTransition({ type: 'undo', now: new Date().toISOString() }, undefined, started.ticket);
    if (outcome === 'changed' && origin) {
      window.requestAnimationFrame(() => {
        if (contextualOwnerRef.current.lastSuccess?.status !== 'undone' || resultOrigin.current !== origin) return;
        window.scrollTo({ top: origin.scrollTop, behavior: 'instant' });
        const opener = document.querySelector<HTMLElement>(origin.returnSelector);
        if (restoreKeyboardFocus && opener?.getClientRects().length) opener.focus({ preventScroll: true });
      });
    }
  };

  const commitQuickItemConversion = async (
    quickItemRef: string,
    requestedFlowTitle: string,
    priorAttempt?: PersonalWorkspacePocQuickConversionAttempt,
  ) => {
    const expectedState = stateRef.current;
    const quickItem = expectedState.quickItems.find(
      (item) => toPersonalWorkspacePocQuickItemRef(item.quickItemId) === quickItemRef,
    );
    if (!quickItem) {
      setStatus({ kind: 'failure', message: '정리할 빠른 할 일을 찾을 수 없어요.' });
      return;
    }
    const existingReceipt = (expectedState.quickConversionReceipts ?? []).find(
      (candidate) => candidate.sourceQuickItemRef === quickItemRef,
    );
    if (existingReceipt) {
      setMoveTarget(undefined);
      setQuickConversionOpen(false);
      setQuickConversionTitle('');
      setSection('folder');
      setActiveItemRef(undefined);
      setSelectedFlowRef(existingReceipt.flowRef);
      setStatus({ kind: 'neutral', message: '이미 정리한 Flow를 열었어요.' });
      return;
    }

    const flowTitle = requestedFlowTitle.trim();
    const preview = materializePersonalWorkspacePocQuickConversion({
      quickItem,
      quickItemRef,
      flowTitle,
      stateRevision: expectedState.revision,
      committedAt: new Date().toISOString(),
    });
    if (!preview.ok) {
      setStatus({ kind: 'neutral', message: '새 Flow 이름을 한 줄로 입력해 주세요.' });
      return;
    }
    const folderId = getPersonalWorkspacePocFolderId(expectedState, quickItemRef);
    const folderLabel = compactPersonalWorkspacePocReceiptValue(
      getPersonalWorkspacePocFolderPath(expectedState, folderId),
    );
    const date = getPersonalWorkspacePocEffectiveDate(expectedState, quickItemRef);
    const changes: readonly PersonalWorkspacePocReceiptChange[] = [
      {
        owner: 'poc-personal-plan',
        field: 'new-flow',
        label: '새 Flow',
        before: null,
        after: compactPersonalWorkspacePocReceiptValue(flowTitle),
      },
      {
        owner: 'poc-personal-plan',
        field: 'new-item',
        label: '첫 할 일',
        before: null,
        after: compactPersonalWorkspacePocReceiptValue(quickItem.title),
      },
      {
        owner: 'organization',
        field: 'copied-folder',
        label: '복사한 폴더',
        before: null,
        after: folderLabel,
      },
      {
        owner: 'execution',
        field: 'copied-date',
        label: '복사한 실행일',
        before: null,
        after: date ?? '날짜 미정',
      },
      {
        owner: 'poc-personal-plan',
        field: 'copied-item-memo',
        label: '개인 메모 복사',
        before: false,
        after: quickItem.memo !== '',
      },
    ];
    const affectedRefs = [quickItemRef, preview.flow.ref, preview.itemRef] as const;
    const attempt: PersonalWorkspacePocQuickConversionAttempt = priorAttempt ?? {
      intentId: `quick-conversion-intent:${encodeURIComponent(quickItem.quickItemId)}:${Date.now()}`,
      quickItemRef,
      flowTitle,
      stateRevisionBefore: expectedState.revision,
      affectedRefs,
      changes,
    };
    if (priorAttempt && (
      priorAttempt.quickItemRef !== quickItemRef
      || priorAttempt.flowTitle !== flowTitle
      || priorAttempt.stateRevisionBefore !== expectedState.revision
      || JSON.stringify(priorAttempt.affectedRefs) !== JSON.stringify(affectedRefs)
      || JSON.stringify(priorAttempt.changes) !== JSON.stringify(changes)
    )) {
      setStatus({
        kind: 'neutral',
        message: '빠른 할 일의 내용이 바뀌었어요. 다시 열어 새 Flow를 확인해 주세요.',
      });
      return;
    }
    quickConversionAttempt.current = attempt;
    const storageEvidence = createPersonalWorkspacePocEditorStorageEvidence();
    const outcome = await commitTransition({
      type: 'convert-quick-item-to-flow',
      quickItemRef,
      expectedRevision: expectedState.revision,
      flowTitle,
      existingFlowRefs: model.flows.map((flow) => flow.ref),
      now: preview.flow.authoring.committedAt,
    }, storageEvidence);

    if (outcome === 'changed') {
      const verifiedState = stateRef.current;
      const conversion = (verifiedState.quickConversionReceipts ?? []).find(
        (candidate) => candidate.conversionId === preview.conversionId,
      );
      if (!conversion
        || storageEvidence.successfulTargetMutationCount !== 1
        || verifiedState.revision !== attempt.stateRevisionBefore + 1) {
        setStatus({
          kind: 'failure',
          message: '정리한 Flow를 확인하지 못했어요. 새로고침해 상태를 확인해 주세요.',
        });
        return;
      }
      setReceipt(requirePersonalWorkspacePocReceipt({
        receiptId: nextReceiptId(attempt.intentId, 'success'),
        intentId: attempt.intentId,
        operation: 'convert-quick-item-to-flow',
        status: 'success',
        createdAt: new Date().toISOString(),
        scopeRef: quickItemRef,
        affectedRefs: attempt.affectedRefs,
        affectedCount: attempt.affectedRefs.length,
        stateRevisionBefore: attempt.stateRevisionBefore,
        stateRevisionAfter: verifiedState.revision,
        changes: attempt.changes,
        targetWriteCount: storageEvidence.successfulTargetMutationCount,
        supportWriteCount: storageEvidence.successfulSupportMutationCount,
        rollback: 'not-needed',
        undoLabel: 'Flow 정리 되돌리기',
      }));
      quickConversionAttempt.current = undefined;
      setMoveTarget(undefined);
      setQuickConversionOpen(false);
      setQuickConversionTitle('');
      setSection('folder');
      setActiveItemRef(undefined);
      setSelectedFlowRef(conversion.flowRef);
      setStatus({
        kind: 'success',
        message: '빠른 할 일은 그대로 두고 새 Flow를 열었어요.',
        receiptStatus: 'success',
      });
      return;
    }

    if (outcome === 'failed') {
      const failureEvidence = resolvePersonalWorkspacePocEditorFailureEvidence(
        storageEvidence,
        storageEvidence.rollback === 'recovery-required',
      );
      setReceipt(requirePersonalWorkspacePocReceipt({
        receiptId: nextReceiptId(attempt.intentId, 'failure'),
        intentId: attempt.intentId,
        operation: 'convert-quick-item-to-flow',
        status: 'failure',
        createdAt: new Date().toISOString(),
        scopeRef: quickItemRef,
        affectedRefs: attempt.affectedRefs,
        affectedCount: attempt.affectedRefs.length,
        stateRevisionBefore: attempt.stateRevisionBefore,
        stateRevisionAfter: attempt.stateRevisionBefore,
        changes: attempt.changes,
        targetWriteCount: 0,
        supportWriteCount: failureEvidence.supportWriteCount,
        rollback: failureEvidence.rollback,
        retryIntent: {
          kind: 'convert-quick-item-to-flow',
          parameters: { quickItemRef, flowTitle, expectedRevision: attempt.stateRevisionBefore },
        },
        errorCode: 'quick-conversion-storage-failed',
      }));
      setStatus({
        kind: 'failure',
        message: 'Flow로 정리하지 못해 빠른 할 일과 이전 상태를 유지했어요.',
        receiptStatus: 'failure',
      });
    }
  };

  const retryQuickItemConversion = () => {
    const attempt = quickConversionAttempt.current;
    if (!attempt) {
      setStatus({ kind: 'neutral', message: '다시 시도할 Flow 정리 요청이 없어요.' });
      return;
    }
    if (stateRef.current.revision !== attempt.stateRevisionBefore) {
      setStatus({
        kind: 'neutral',
        message: '그 뒤 다른 변경이 저장됐어요. 빠른 할 일을 다시 열어 확인해 주세요.',
      });
      return;
    }
    void commitQuickItemConversion(attempt.quickItemRef, attempt.flowTitle, attempt);
  };

  const undoReceiptChange = async () => {
    if (!receipt || receipt.status !== 'success' || planEditor.active || quickEditor.active) return;
    if (!stateRef.current.undo || stateRef.current.revision !== receipt.stateRevisionAfter) {
      setStatus({ kind: 'neutral', message: '더 최근 변경이 있어 이 변경은 되돌릴 수 없습니다.' });
      return;
    }
    const undoStorageEvidence = createPersonalWorkspacePocEditorStorageEvidence();
    const outcome = await commitTransition(
      { type: 'undo', now: new Date().toISOString() },
      undoStorageEvidence,
    );
    if (outcome !== 'changed') return;
    if (undoStorageEvidence.successfulTargetMutationCount !== 1) {
      setStatus({
        kind: 'failure',
        message: '되돌린 내용을 확인하지 못했어요. 새로고침해 상태를 확인해 주세요.',
      });
      return;
    }
    if (receipt.operation === 'convert-quick-item-to-flow') {
      const convertedFlowRef = receipt.affectedRefs.find((ref) => ref.startsWith('saved-flow:'));
      if (convertedFlowRef && selectedFlowRef === convertedFlowRef) {
        setSelectedFlowRef(undefined);
        setActiveItemRef(undefined);
        setSection('folder');
      }
    }
    const next = transitionPersonalWorkspacePocReceipt(receipt, {
      receiptId: nextReceiptId(receipt.intentId, 'undone'),
      intentId: receipt.intentId,
      operation: receipt.operation,
      status: 'undone',
      createdAt: new Date().toISOString(),
      scopeRef: receipt.scopeRef,
      affectedRefs: receipt.affectedRefs,
      affectedCount: receipt.affectedCount,
      stateRevisionBefore: receipt.stateRevisionAfter,
      stateRevisionAfter: receipt.stateRevisionAfter + 1,
      changes: receipt.changes.map((change) => ({
        ...change,
        before: change.after,
        after: change.before,
      })),
      targetWriteCount: undoStorageEvidence.successfulTargetMutationCount,
      supportWriteCount: undoStorageEvidence.successfulSupportMutationCount,
      rollback: 'not-needed',
      undoLabel: '되돌림 완료',
      undoOfReceiptId: receipt.receiptId,
    });
    if (next.ok) {
      setReceipt(next.receipt);
      setStatus({
        kind: 'success',
        message: '편집 저장 전 값으로 되돌렸어요.',
        receiptStatus: 'undone',
      });
    }
  };

  const focusAfterRender = useCallback((selector?: string, fallbackSelector = '#personal-workspace-view-heading') => {
    window.requestAnimationFrame(() => {
      const requested = selector ? document.querySelector<HTMLElement>(selector) : null;
      const fallback = document.querySelector<HTMLElement>(fallbackSelector);
      const target = requested?.getClientRects().length ? requested : fallback;
      if (!target) return;
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollFrame.current !== undefined) {
      window.cancelAnimationFrame(autoScrollFrame.current);
      autoScrollFrame.current = undefined;
    }
    autoScrollSpeed.current = 0;
    autoScrollTarget.current = null;
  }, []);

  const resetMoveInteraction = useCallback(() => {
    stopAutoScroll();
    activeMoveSession.current = undefined;
    setNativeStatusBox(undefined);
    setReorderPreview(undefined);
    setMoveDropFeedback(undefined);
  }, [stopAutoScroll]);

  const resetWorkspace = async () => {
    if (
      pending.current
      || editorOwner.current
      || planEditor.active
      || quickEditor.active
    ) {
      setStatus({
        kind: 'neutral',
        message: '진행 중인 저장이나 편집을 먼저 마쳐 주세요.',
      });
      return;
    }

    pending.current = true;
    setStatus({ kind: 'saving', message: '이 기기의 개인공간 기록을 지우는 중…' });
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    const locked = await withFlowUserDataWriteLock(
      () => resetPersonalWorkspacePocStorage(window.localStorage),
    );
    pending.current = false;
    if (!locked.ok) {
      setStatus({
        kind: 'failure',
        message: '다른 저장이 진행 중이라 초기화하지 않았어요. 잠시 후 다시 시도해 주세요.',
      });
      return;
    }
    const reset = locked.value;
    if (!reset.ok) {
      setStatus({
        kind: 'failure',
        message: reset.rollbackOk
          ? '개인공간을 초기화하지 못해 이전 내용을 복구했어요. 현재 화면은 그대로입니다.'
          : '개인공간을 초기화하지 못했고 일부 작성 중 내용도 복구하지 못했어요. 가져온 원본 Flow는 그대로입니다.',
      });
      return;
    }

    const emptyState = createPersonalWorkspacePocState();
    const emptySourceCandidateStore = createPersonalWorkspacePocSourceCandidateStore();
    stateRef.current = emptyState;
    sourceCandidateStoreRef.current = emptySourceCandidateStore;
    sourceCandidateRawRef.current = null;
    flowReturnFocusSelector.current = undefined;
    postMoveFocusSelector.current = undefined;
    planGuard.current = undefined;
    planSourceFlow.current = undefined;
    planAttempt.current = undefined;
    planStorageEvidence.current = undefined;
    quickEditorBaseline.current = undefined;
    quickEditorAttempt.current = undefined;
    quickStorageEvidence.current = undefined;
    quickConversionAttempt.current = undefined;
    resetMoveInteraction();
    setState(emptyState);
    setSourceCandidateStore(emptySourceCandidateStore);
    setSourceCandidateRaw(null);
    setSourceUpdateOpen(false);
    setSourceUpdateSelectedChangeId(undefined);
    setSourceUpdateLaterChangeIds({});
    setSourceUpdateStatus('pending');
    setSourceUpdateError(undefined);
    setSection('folder');
    setActiveFolderId(undefined);
    setSelectedFlowRef(undefined);
    setActiveItemRef(undefined);
    setResultNavigation({ resultView: 'text' });
    setMoveTarget(undefined);
    setMoveReturnFocusSelector(undefined);
    setQuickFormOpen(false);
    setFolderFormOpen(false);
    setQuickTitle('');
    setQuickDate(today);
    setQuickFolderId('');
    setFolderTitle('');
    setFolderParentId('');
    setMoveDateDraft(today);
    setQuickConversionOpen(false);
    setQuickConversionTitle('');
    setShowEmptyMonthDates(false);
    setReceipt(undefined);
    setResetConfirmOpen(false);
    setStatus({ kind: 'success', message: '이 기기에 저장한 개인공간 기록을 초기화했어요.' });
  };

  const cancelMove = useCallback((message = '이동을 취소했어요.') => {
    resetMoveInteraction();
    postMoveFocusSelector.current = moveReturnFocusSelector;
    setMoveTarget(undefined);
    setQuickConversionOpen(false);
    setQuickConversionTitle('');
    setStatus({ kind: 'canceled', message });
  }, [moveReturnFocusSelector, resetMoveInteraction]);

  useEffect(() => {
    if (!moveTarget) return;
    const viewport = window.visualViewport;
    const onWindowBlur = () => {
      if (!pending.current) cancelMove('창을 벗어나 이동을 취소했어요.');
    };
    const onWindowResize = () => {
      if (!pending.current) cancelMove('화면 크기가 바뀌어 이동을 취소했어요.');
    };
    const onVisualViewportResize = () => {
      if (!pending.current && activeMoveSession.current) {
        cancelMove('화면의 보이는 영역이 바뀌어 이동을 취소했어요.');
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden && !pending.current) cancelMove('이동을 취소했어요.');
    };
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || pending.current) return;
      event.preventDefault();
      cancelMove('이동을 취소했어요.');
    };
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('resize', onWindowResize);
    viewport?.addEventListener('resize', onVisualViewportResize);
    window.addEventListener('keydown', onEscape);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('resize', onWindowResize);
      viewport?.removeEventListener('resize', onVisualViewportResize);
      window.removeEventListener('keydown', onEscape);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [cancelMove, moveTarget]);

  useEffect(() => () => {
    if (autoScrollFrame.current !== undefined) window.cancelAnimationFrame(autoScrollFrame.current);
  }, []);

  useEffect(() => {
    const cancelActiveSessionForScroll = () => {
      if (!activeMoveSession.current?.moved || autoScrollSpeed.current !== 0) return;
      cancelMove('빠른 스크롤로 이동을 취소했어요.');
    };
    const cancelActiveSessionForWheel = () => {
      if (!activeMoveSession.current) return;
      cancelMove('빠른 스크롤로 이동을 취소했어요.');
    };
    window.addEventListener('scroll', cancelActiveSessionForScroll, { passive: true });
    window.addEventListener('wheel', cancelActiveSessionForWheel, { passive: true });
    return () => {
      window.removeEventListener('scroll', cancelActiveSessionForScroll);
      window.removeEventListener('wheel', cancelActiveSessionForWheel);
    };
  }, [cancelMove]);

  useEffect(() => {
    if (!moveTarget) return;
    if (activeMoveSession.current?.mode === 'pointer') return;
    focusAfterRender(
      moveTarget.kind === 'task'
        ? '[data-testid="personal-workspace-date-target-0"]'
        : '[data-testid="personal-workspace-folder-target-unfiled"]',
      '[data-testid="personal-workspace-move-close"]',
    );
  }, [focusAfterRender, moveTarget]);

  useEffect(() => {
    if (moveTarget || !postMoveFocusSelector.current) return;
    const selector = postMoveFocusSelector.current;
    postMoveFocusSelector.current = undefined;
    if (['success', 'undone'].includes(contextualOwnerRef.current.presentation) && resultOrigin.current) {
      window.requestAnimationFrame(() => {
        const requested = document.querySelector<HTMLElement>(selector);
        const anchor = document.querySelector<HTMLElement>('#personal-workspace-contextual-result');
        const origin = resultOrigin.current;
        if (!anchor || !origin) return;
        if (origin.keyboard) {
          (requested?.getClientRects().length ? requested : anchor).focus({ preventScroll: true });
        }
        anchor.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
      return;
    }
    focusAfterRender(
      selector,
      selectedFlowRef ? '#personal-workspace-flow-detail-heading' : '#personal-workspace-view-heading',
    );
  }, [focusAfterRender, moveTarget, selectedFlowRef, state]);

  useEffect(() => {
    if (!selectedFlowRef) return;
    focusAfterRender('#personal-workspace-flow-detail-heading');
  }, [focusAfterRender, selectedFlowRef]);

  useEffect(() => {
    if (selectedFlowRef || !flowReturnFocusSelector.current) return;
    const selector = flowReturnFocusSelector.current;
    flowReturnFocusSelector.current = undefined;
    focusAfterRender(selector);
  }, [focusAfterRender, selectedFlowRef]);

  useEffect(() => {
    if (!activeItemRef || viewportWidth < 1280) return;
    focusAfterRender('#poc-flow-item-detail', '#personal-workspace-flow-detail-heading');
  }, [activeItemRef, focusAfterRender, viewportWidth]);

  const openTaskMove = (
    task: PersonalWorkspacePocTask,
    group?: PersonalWorkspacePocTaskGroup,
    returnFocusSelector = getPersonalWorkspacePocMoveTriggerSelector(task.ref, 'task-more'),
  ) => {
    moveOrigin.current = captureResultOrigin.current(task.ref, group);
    interruptResult('new-move-preview');
    stopAutoScroll();
    setReorderPreview(undefined);
    setMoveDropFeedback(undefined);
    setMoveDateDraft(task.date ?? today);
    setQuickConversionOpen(false);
    setQuickConversionTitle(task.kind === 'quick_item' ? task.title : '');
    setMoveReturnFocusSelector(returnFocusSelector);
    setStatus({ kind: 'ready', message: '이동할 위치를 선택해 주세요.' });
    setMoveTarget({ kind: 'task', task, ...(group ? { group } : {}) });
  };

  // Native DnD is canceled by Chromium if collapsing this preceding status
  // shifts its source during dragstart. Preserve only that already visible box.
  const preserveNativeStatusBox = () => {
    const element = transactionStatusRef.current;
    if (!element || element.getAttribute('aria-hidden') === 'true' || element.dataset.status === 'ready') return;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) return;
    const computed = window.getComputedStyle(element);
    setNativeStatusBox({
      position: 'static', display: 'block', boxSizing: 'border-box',
      width: rect.width, height: rect.height, minHeight: rect.height, maxHeight: rect.height,
      marginTop: computed.marginTop, marginBottom: computed.marginBottom,
      marginLeft: computed.marginLeft, marginRight: computed.marginRight,
      padding: 0, border: 0, clip: 'auto', clipPath: 'none', overflow: 'hidden',
      visibility: 'hidden', pointerEvents: 'none',
    });
  };

  const openFlowMove = (
    flow: PersonalWorkspacePocFlow,
    source: Extract<MoveTriggerSource, 'flow-handle' | 'flow-card' | 'flow-detail'>,
  ) => {
    moveOrigin.current = captureResultOrigin.current(flow.ref);
    interruptResult('new-move-preview');
    stopAutoScroll();
    setReorderPreview(undefined);
    setMoveDropFeedback(undefined);
    setQuickConversionOpen(false);
    setQuickConversionTitle('');
    setMoveReturnFocusSelector(getPersonalWorkspacePocMoveTriggerSelector(flow.ref, source));
    setStatus({ kind: 'ready', message: '이동할 폴더를 선택해 주세요.' });
    setMoveTarget({ kind: 'flow', flow });
  };

  const closeQuickForm = useCallback((message = '빠른 할 일 추가를 취소했어요.') => {
    setQuickFormOpen(false);
    setQuickTitle('');
    setQuickDate(today);
    setQuickFolderId('');
    setStatus({ kind: 'canceled', message });
  }, [today]);

  const toggleQuickForm = () => {
    if (quickFormOpen) {
      closeQuickForm();
      return;
    }
    setFolderFormOpen(false);
    setQuickFormOpen(true);
    setStatus({ kind: 'ready', message: '빠른 할 일을 입력해 주세요.' });
  };

  const toggleFolderForm = () => {
    if (folderFormOpen) {
      setFolderFormOpen(false);
      setFolderTitle('');
      setFolderParentId('');
      setStatus({ kind: 'canceled', message: '새 폴더 만들기를 취소했어요.' });
      return;
    }
    setQuickFormOpen(false);
    setFolderFormOpen(true);
    setStatus({ kind: 'ready', message: '새 폴더의 이름을 입력해 주세요.' });
  };

  const openQuickFormForDate = (date: string, label: string) => {
    setFolderFormOpen(false);
    setQuickDate(date);
    setQuickFormOpen(true);
    setStatus({ kind: 'ready', message: `${label}에 추가할 빠른 할 일을 입력해 주세요.` });
    focusAfterRender('[name="quick-title"]');
  };

  useEffect(() => {
    if (!quickFormOpen || moveTarget || resetConfirmOpen) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeQuickForm();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [closeQuickForm, moveTarget, quickFormOpen, resetConfirmOpen]);

  const submitQuickItem = async (event: FormEvent) => {
    event.preventDefault();
    idCounter.current += 1;
    const quickItemId = `quick-${Date.now().toString(36)}-${idCounter.current}`;
    const outcome = await commitTransition({
      type: 'create-quick-item',
      quickItemId,
      title: quickTitle,
      ...(quickDate ? { date: quickDate } : {}),
      ...(quickFolderId ? { folderId: quickFolderId } : {}),
      now: new Date().toISOString(),
    });
    if (outcome === 'changed') {
      setQuickTitle('');
      setQuickDate(today);
      setQuickFolderId('');
      setQuickFormOpen(false);
      focusAfterRender(getPersonalWorkspacePocTaskOpenSelector(
        toPersonalWorkspacePocQuickItemRef(quickItemId),
      ));
    }
  };

  const submitFolder = async (event: FormEvent) => {
    event.preventDefault();
    idCounter.current += 1;
    const outcome = await commitTransition({
      type: 'create-folder',
      folderId: `folder-${Date.now().toString(36)}-${idCounter.current}`,
      title: folderTitle,
      ...(folderParentId ? { parentFolderId: folderParentId } : {}),
      now: new Date().toISOString(),
    });
    if (outcome === 'changed') {
      setFolderTitle('');
      setFolderParentId('');
      setFolderFormOpen(false);
    }
  };

  const selectSection = (next: WorkspaceSection, folderId?: string) => {
    flowReturnFocusSelector.current = undefined;
    setSection(next);
    setActiveFolderId(folderId);
    setSelectedFlowRef(undefined);
    setActiveItemRef(undefined);
    setQuickFormOpen(false);
    setFolderFormOpen(false);
  };

  const openFlowDetail = (flowRef: string, returnSelector: string, itemRef?: string) => {
    const flow = model.flows.find((candidate) => candidate.ref === flowRef);
    if (!flow) {
      setStatus({ kind: 'failure', message: '열 Flow를 찾을 수 없습니다.' });
      return;
    }
    const selected = selectPersonalWorkspacePocResultFlow(resultNavigation, flow, today);
    if (!selected.ok) {
      setStatus({ kind: 'failure', message: 'Flow 결과의 기준일을 확인할 수 없습니다.' });
      return;
    }
    if (selected.changed) setResultNavigation(selected.state);
    flowReturnFocusSelector.current = returnSelector;
    setSelectedFlowRef(flowRef);
    setActiveItemRef(itemRef);
  };

  const closeFlowDetail = () => {
    setSelectedFlowRef(undefined);
    setActiveItemRef(undefined);
  };

  const flowFolder = (flow: PersonalWorkspacePocFlow) => getPersonalWorkspacePocFolderId(state, flow.ref);
  const folderFlows = model.flows.filter((flow) => flowFolder(flow) === activeFolderId);
  const folderQuickItems = tasks.filter(
    (task) => task.kind === 'quick_item' && task.folderId === activeFolderId,
  );
  const sortedFolders = [...state.folders].sort((left, right) => left.orderKey - right.orderKey);
  const rootFolders = sortedFolders.filter((folder) => !folder.parentFolderId);

  captureResultOrigin.current = (ref, group) => {
    const flow = model.flows.find((candidate) => candidate.ref === ref);
    const currentGroup = group ?? groups.find((candidate) => candidate.tasks.some((task) => task.ref === ref));
    const active = document.activeElement;
    const itemDetailRef = active?.closest('[data-testid="personal-workspace-flow-item-detail"]')
      ? activeItemRef : undefined;
    const rows = selectedFlowRef
      ? tasks.filter((task) => task.flowRef === selectedFlowRef).map((task) => task.ref)
      : currentGroup ? currentGroup.tasks.map((task) => task.ref)
        : flow ? folderFlows.map((candidate) => candidate.ref) : folderQuickItems.map((task) => task.ref);
    return {
      section, folderId: activeFolderId, flowRef: selectedFlowRef, itemDetailRef,
      kind: flow ? 'flow' : 'task', ref, group: currentGroup,
      groupIndex: Math.max(0, groups.indexOf(currentGroup!)),
      rowIndex: Math.max(0, rows.indexOf(ref)),
      returnSelector: selectedFlowRef
        ? `[data-todo-detail-link="${ref}"]`
        : flow ? getPersonalWorkspacePocFlowOpenSelector(ref) : getPersonalWorkspacePocTaskOpenSelector(ref),
      keyboard: lastInputWasKeyboard.current,
      scrollTop: window.scrollY,
    };
  };

  contextualIntent.current = (transition, next) => {
    const supported = ['move-date', 'move-folder', 'reorder', 'reset-order', 'complete'];
    if (!supported.includes(transition.type)) return undefined;
    const orderGroup = transition.type === 'reorder' || transition.type === 'reset-order'
      ? groups.find((group) => group.context === transition.context && group.contextKey === transition.contextKey)
      : undefined;
    const refs = transition.type === 'move-date' || transition.type === 'complete' ? [transition.itemRef]
      : transition.type === 'move-folder' ? [transition.memberRef]
        : orderGroup?.tasks.map((task) => task.ref) ?? [];
    const ref = moveTarget?.kind === 'task' && refs.includes(moveTarget.task.ref)
      ? moveTarget.task.ref : refs[0];
    if (!ref) return undefined;
    const sourceTask = taskByRef.get(ref);
    const sourceFlow = model.flows.find((flow) => flow.ref === ref);
    const title = sourceTask?.title ?? (sourceFlow ? flowDisplayTitle(sourceFlow) : '이 목록');
    const origin = moveOrigin.current?.ref === ref && Boolean(moveTarget)
      ? moveOrigin.current : captureResultOrigin.current(ref, orderGroup);
    if (!origin) return undefined;
    resultOrigin.current = origin;
    const context: ResultIntent['context'] = origin.flowRef ? { kind: 'flow', key: origin.flowRef }
      : origin.group ? { kind: origin.group.context, key: origin.group.contextKey }
        : { kind: 'folder', key: origin.folderId ?? 'unfiled' };
    const afterTask = sourceReadValid && sourceRead.ok
      ? buildPersonalWorkspacePocTasks(model, next, sourceRead.index).find((task) => task.ref === ref)
      : undefined;
    if (transition.type === 'move-date') {
      return { operation: 'move-date', refs, summary: `${title} · 실행 날짜를 바꿨어요.`,
        changes: [{ label: '실행 날짜', before: sourceTask?.date ?? '날짜 미정', after: afterTask?.date ?? '날짜 미정' }], context };
    }
    if (transition.type === 'move-folder') {
      const before = getPersonalWorkspacePocFolderPath(state, getPersonalWorkspacePocFolderId(state, ref));
      const after = getPersonalWorkspacePocFolderPath(next, getPersonalWorkspacePocFolderId(next, ref));
      return { operation: 'move-folder', refs, summary: `${title} · 정리 폴더를 바꿨어요.`, changes: [{ label: '폴더', before, after }], context };
    }
    if (transition.type === 'complete') {
      return { operation: transition.completed ? 'complete' : 'reopen', refs,
        summary: `${title} · ${transition.completed ? '완료했어요.' : '다시 열었어요.'}`,
        changes: [{ label: '개인 실행', before: sourceTask?.completed ? '완료' : '진행 중', after: afterTask?.completed ? '완료' : '진행 중' }], context };
    }
    return { operation: 'move-order', refs, summary: transition.type === 'reset-order'
      ? `${orderGroup?.label ?? '이 목록'} · 시간순으로 돌렸어요.` : `${title} · 이 목록의 순서를 바꿨어요.`, context };
  };

  const contextualSelection = selectResult(contextualOwner, resultFacts(JSON.stringify(state)));
  const visibleContextualResult = contextualSelection.result;
  const visibleOrigin = visibleContextualResult ? resultOrigin.current : undefined;
  useEffect(() => {
    if (!visibleContextualResult || visibleContextualResult.status !== 'success' || moveTarget) return;
    const ownerId = visibleContextualResult.ownerId;
    const frame = window.requestAnimationFrame(() => {
      if (contextualOwnerRef.current.lastSuccess?.ownerId !== ownerId
        || contextualOwnerRef.current.presentation !== 'success') return;
      // In-flow feedback respects the existing mobile navigation clearance; no focus theft.
      document.querySelector<HTMLElement>('#personal-workspace-contextual-result')
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [visibleContextualResult?.ownerId, visibleContextualResult?.status, Boolean(moveTarget)]);
  const resultIsInFolder = Boolean(visibleOrigin && !visibleOrigin.flowRef && section === 'folder'
    && visibleOrigin.section === section && visibleOrigin.folderId === activeFolderId);
  const timelineDisplayGroups = [...groups];
  if (visibleOrigin?.group && !visibleOrigin.flowRef && visibleOrigin.section === section
    && !timelineDisplayGroups.some((group) => group.context === visibleOrigin.group?.context && group.contextKey === visibleOrigin.group.contextKey)) {
    timelineDisplayGroups.splice(Math.min(visibleOrigin.groupIndex, groups.length), 0, {
      ...visibleOrigin.group, tasks: [], manualOrder: false,
    });
  }
  const renderContextualResult = () => visibleContextualResult ? (
    <div id="personal-workspace-contextual-result" data-testid="personal-workspace-contextual-result"
      data-result-owner={visibleContextualResult.ownerId} data-result-operation={visibleContextualResult.operation}
      data-result-status={visibleContextualResult.status} data-result-ref={visibleOrigin?.ref}
      tabIndex={-1} className="my-2 min-w-0 rounded-md border border-[var(--flowme-workspace-accent)] bg-[var(--flowme-workspace-accent-soft)] p-3 [overflow-wrap:anywhere] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">
      <div role="status" aria-live="polite" aria-atomic="true" data-testid="personal-workspace-contextual-announcement">
        <p className="text-sm font-semibold text-[var(--flowme-text)]">{visibleContextualResult.summary}</p>
        {visibleContextualResult.changes.map((change) => <p key={change.label} className="mt-1 text-sm text-[var(--flowme-text-secondary)]">{change.label}: {change.before} → {change.after}</p>)}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {contextualSelection.canUndo ? <button type="button" data-testid="personal-workspace-contextual-undo" className={SECONDARY_CLASS}
          onClick={() => void undoContextualResult(visibleContextualResult.ownerId)}>되돌리기</button> : null}
        <button type="button" data-testid="personal-workspace-contextual-close" aria-label="변경 결과 닫기" className={SECONDARY_CLASS}
          onClick={() => {
            const origin = resultOrigin.current;
            const next = dismissResult(contextualOwnerRef.current, visibleContextualResult.ownerId);
            setResultOwner(next);
            setStatus({ kind: 'ready', message: '변경 결과를 닫았어요.' });
            if (lastInputWasKeyboard.current && origin) {
              window.requestAnimationFrame(() => {
                if (contextualOwnerRef.current.epoch !== next.epoch || resultOrigin.current !== origin) return;
                const opener = document.querySelector<HTMLElement>(origin.returnSelector);
                const fallback = document.querySelector<HTMLElement>(origin.flowRef
                  ? '#personal-workspace-flow-detail-heading' : '#personal-workspace-view-heading');
                const target = opener?.getClientRects().length ? opener : fallback;
                target?.focus({ preventScroll: true });
                target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
              });
            }
          }}>닫기</button>
      </div>
    </div>
  ) : null;

  const renderResultInRows = (rows: readonly PersonalWorkspacePocTask[], group?: PersonalWorkspacePocTaskGroup) => {
    const owns = Boolean(visibleOrigin && !visibleOrigin.flowRef && visibleOrigin.section === section
      && (group ? visibleOrigin.group?.context === group.context && visibleOrigin.group.contextKey === group.contextKey
        : resultIsInFolder && visibleOrigin.kind === 'task'));
    const nodes = rows.map((task) => renderTaskRow(task, group));
    if (owns) {
      const offset = rows.some((task) => task.ref === visibleOrigin?.ref) ? 1 : 0;
      nodes.splice(Math.min((visibleOrigin?.rowIndex ?? 0) + offset, rows.length), 0,
        <React.Fragment key="contextual-result">{renderContextualResult()}</React.Fragment>);
    }
    return nodes;
  };

  const sectionTitle = section === 'folder'
    ? getPersonalWorkspacePocFolderPath(state, activeFolderId)
    : section === 'trash'
      ? '휴지통'
    : section === 'today'
      ? '오늘'
      : section === 'week'
        ? '이번 주'
        : section === 'month'
          ? '이번 달'
          : '날짜 미정';

  const moveByControl = async (
    task: PersonalWorkspacePocTask,
    group: PersonalWorkspacePocTaskGroup,
    control: PersonalWorkspacePocReorderControl,
  ): Promise<TransitionOutcome> => {
    const current = group.tasks.map((item) => item.ref);
    const resolution = resolvePersonalWorkspacePocReorderControl({
      currentOrderedRefKeys: current,
      draggedRef: task.ref,
      control,
      titleByRef: Object.fromEntries(group.tasks.map((candidate) => [candidate.ref, candidate.title])),
    });
    if (resolution.kind !== 'changed') {
      setStatus({
        kind: resolution.kind === 'current' ? 'neutral' : 'failure',
        message: resolution.message,
      });
      return 'unchanged';
    }
    const outcome = await commitTransition({
      type: 'reorder',
      context: group.context,
      contextKey: group.contextKey,
      currentOrderedRefKeys: current,
      orderedRefKeys: resolution.orderedRefKeys,
      now: new Date().toISOString(),
    });
    if (outcome === 'changed' && !moveTarget) {
      focusAfterRender(getPersonalWorkspacePocMoveTriggerSelector(task.ref, 'task-handle'));
    }
    return outcome;
  };

  const beginActiveMoveSession = (
    mode: PersonalWorkspacePocActiveMoveSession['mode'],
    target: MoveTarget,
    clientX: number,
    clientY: number,
  ) => {
    stopAutoScroll();
    setReorderPreview(undefined);
    activeMoveSession.current = {
      mode,
      target,
      lastX: clientX,
      lastY: clientY,
      moved: false,
    };
  };

  const resolveActiveReorderAtPoint = (
    clientX: number,
    clientY: number,
  ): PersonalWorkspacePocReorderResolution => {
    const session = activeMoveSession.current;
    if (!session || session.target.kind !== 'task' || !session.target.group) {
      return { kind: 'invalid', message: '같은 목록 안의 항목에 놓아 주세요.' };
    }
    const { task, group } = session.target;
    session.lastX = clientX;
    session.lastY = clientY;
    const target = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>(
      '[data-personal-workspace-reorder-target="true"]',
    );
    if (
      !target
      || target.dataset.personalWorkspaceContext !== group.context
      || target.dataset.personalWorkspaceContextKey !== group.contextKey
    ) {
      setReorderPreview(undefined);
      const result = { kind: 'invalid', message: '오른쪽의 같은 목록 안에서 순서를 정해 주세요.' } as const;
      setStatus((current) => current.kind === 'ready' && current.message === result.message
        ? current
        : { kind: 'ready', message: result.message });
      return result;
    }

    const targetRef = target.dataset.itemRef ?? '';
    const targetTask = group.tasks.find((candidate) => candidate.ref === targetRef);
    const bounds = target.getBoundingClientRect();
    const result = resolvePersonalWorkspacePocReorderPosition({
      currentOrderedRefKeys: group.tasks.map((candidate) => candidate.ref),
      draggedRef: task.ref,
      targetRef,
      targetTitle: targetTask?.title ?? '선택한 항목',
      pointerY: clientY,
      targetTop: bounds.top,
      targetHeight: bounds.height,
    });
    if (result.kind === 'changed') {
      setReorderPreview((current) => (
        current?.targetRef === targetRef
        && current.position === result.position
        && current.message === result.message
          ? current
          : {
            targetRef,
            position: result.position,
            orderedRefKeys: result.orderedRefKeys,
            message: result.message,
          }
      ));
      setStatus((current) => current.kind === 'ready' && current.message === result.message
        ? current
        : { kind: 'ready', message: result.message });
    } else {
      setReorderPreview(undefined);
      setStatus({ kind: result.kind === 'current' ? 'neutral' : 'ready', message: result.message });
    }
    return result;
  };

  const previewMoveDropTarget = (
    kind: PersonalWorkspacePocMoveDropFeedback['kind'],
    targetKey: string,
    changed: boolean,
    label: string,
  ) => {
    const outcome = changed ? 'valid' as const : 'current' as const;
    setMoveDropFeedback({ kind, targetKey, outcome });
    const message = changed ? `${label}로 이동하기` : '이미 같은 위치입니다.';
    setStatus({ kind: changed ? 'ready' : 'neutral', message });
    return { changed, message };
  };

  const resolveActiveMoveAtPoint = (
    clientX: number,
    clientY: number,
  ): PersonalWorkspacePocActiveMoveResolution => {
    const session = activeMoveSession.current;
    if (!session) return { kind: 'invalid', message: '대상 밖에 놓아 이동을 취소했어요.' };
    const activeTarget = session.target;
    session.lastX = clientX;
    session.lastY = clientY;

    const point = document.elementFromPoint(clientX, clientY);
    const dateTarget = point?.closest<HTMLElement>('[data-personal-workspace-drop-kind]');
    const dropKind = dateTarget?.dataset.personalWorkspaceDropKind;
    if (dateTarget && (dropKind === 'date' || dropKind === 'undated')) {
      setReorderPreview(undefined);
      if (activeTarget.kind !== 'task') {
        const result = {
          kind: 'invalid',
          message: 'Flow 전체의 일정은 옮기지 않습니다. 안의 할 일을 골라 주세요.',
        } as const;
        setMoveDropFeedback({ kind: 'date', targetKey: 'invalid', outcome: 'invalid' });
        setStatus({ kind: 'neutral', message: result.message });
        return result;
      }
      const date = dropKind === 'date' ? dateTarget.dataset.personalWorkspaceDropDate : undefined;
      if (dropKind === 'date' && !date) {
        const result = { kind: 'invalid', message: '유효한 실행 날짜를 선택해 주세요.' } as const;
        setMoveDropFeedback({ kind: 'date', targetKey: 'invalid', outcome: 'invalid' });
        setStatus((current) => current.kind === 'ready' && current.message === result.message
          ? current
          : { kind: 'ready', message: result.message });
        return result;
      }
      const changed = date !== activeTarget.task.date;
      const label = dateTarget.dataset.personalWorkspaceDropLabel ?? '선택한 날짜';
      const { message } = previewMoveDropTarget(
        'date',
        date ?? 'undated',
        changed,
        label,
      );
      return { kind: 'date', ...(date ? { date } : {}), changed, message };
    }
    if (dateTarget && dropKind === 'folder') {
      setReorderPreview(undefined);
      if (activeTarget.kind === 'task' && activeTarget.task.kind !== 'quick_item') {
        const result = {
          kind: 'invalid',
          message: 'Flow Item의 폴더는 부모 Flow와 함께 이동합니다.',
        } as const;
        setStatus({ kind: 'neutral', message: result.message });
        return result;
      }
      const folderId = dateTarget.dataset.personalWorkspaceDropFolderId;
      const currentFolderId = activeTarget.kind === 'flow'
        ? flowFolder(activeTarget.flow)
        : activeTarget.task.folderId;
      const changed = folderId !== currentFolderId;
      const label = dateTarget.dataset.personalWorkspaceDropLabel ?? '선택한 폴더';
      const { message } = previewMoveDropTarget(
        'folder',
        folderId ?? 'unfiled',
        changed,
        label,
      );
      return { kind: 'folder', ...(folderId ? { folderId } : {}), changed, message };
    }

    const resolution = resolveActiveReorderAtPoint(clientX, clientY);
    if (resolution.kind === 'invalid') {
      setMoveDropFeedback({ kind: 'date', targetKey: 'invalid', outcome: 'invalid' });
    } else {
      setMoveDropFeedback(undefined);
    }
    return { kind: 'reorder', resolution };
  };

  const runAutoScroll = () => {
    autoScrollFrame.current = undefined;
    const session = activeMoveSession.current;
    const speed = autoScrollSpeed.current;
    if (!session || speed === 0) return;
    const target = autoScrollTarget.current;
    const before = target ? target.scrollTop : window.scrollY;
    if (target) target.scrollBy({ top: speed, behavior: 'auto' });
    else window.scrollBy({ top: speed, behavior: 'auto' });
    const after = target ? target.scrollTop : window.scrollY;
    if (after === before) {
      autoScrollSpeed.current = 0;
      autoScrollTarget.current = null;
      return;
    }
    // Scrolling changes the element under a stationary pointer. Resolve every
    // frame for both the window and the independently scrolling move panel.
    resolveActiveMoveAtPoint(session.lastX, session.lastY);
    autoScrollFrame.current = window.requestAnimationFrame(runAutoScroll);
  };

  const updateEdgeAutoScroll = (pointerY: number, target: HTMLElement | null = null) => {
    const bounds = target?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const speed = getPersonalWorkspacePocAutoScrollDelta({
      pointerY,
      top: bounds.top,
      bottom: bounds.bottom,
      reducedMotion,
    });
    autoScrollTarget.current = target;
    autoScrollSpeed.current = speed;
    if (speed === 0) {
      if (autoScrollFrame.current !== undefined) {
        window.cancelAnimationFrame(autoScrollFrame.current);
        autoScrollFrame.current = undefined;
      }
      return;
    }
    if (autoScrollFrame.current === undefined) {
      autoScrollFrame.current = window.requestAnimationFrame(runAutoScroll);
    }
  };

  const updateActiveMove = (clientX: number, clientY: number) => {
    const session = activeMoveSession.current;
    if (!session) return;
    session.moved = true;
    session.lastX = clientX;
    session.lastY = clientY;
    resolveActiveMoveAtPoint(clientX, clientY);
    const point = document.elementFromPoint(clientX, clientY);
    const panel = point?.closest<HTMLElement>('[data-testid="personal-workspace-move-panel"]') ?? null;
    const explicitDropTarget = point?.closest<HTMLElement>(
      '[data-personal-workspace-drop-kind]',
    );
    if (explicitDropTarget) stopAutoScroll();
    else updateEdgeAutoScroll(clientY, panel);
  };

  const finishActiveMove = async (
    clientX: number,
    clientY: number,
    moved: boolean,
  ) => {
    const session = activeMoveSession.current;
    if (!session) {
      if (moved) cancelMove('대상 밖에 놓아 이동을 취소했어요.');
      return;
    }
    const activeTarget = session.target;
    const result = moved
      ? resolveActiveMoveAtPoint(clientX, clientY)
      : undefined;
    stopAutoScroll();
    activeMoveSession.current = undefined;
    setNativeStatusBox(undefined);
    setReorderPreview(undefined);
    if (!moved) {
      setStatus({ kind: 'ready', message: '이동할 위치를 선택해 주세요.' });
      return;
    }
    if (!result || result.kind === 'invalid') {
      cancelMove(result?.message ?? '대상 밖에 놓아 이동을 취소했어요.');
      return;
    }
    if (result.kind === 'date') {
      if (!result.changed || activeTarget.kind !== 'task') {
        setStatus({ kind: 'neutral', message: result.message });
        return;
      }
      const outcome = await commitTransition({
        type: 'move-date',
        itemRef: activeTarget.task.ref,
        ...(result.date ? { date: result.date } : {}),
        now: new Date().toISOString(),
      });
      if (shouldClosePersonalWorkspacePocMovePanel(outcome)) {
        postMoveFocusSelector.current = getPersonalWorkspacePocMoveTriggerSelector(
          activeTarget.task.ref,
          'task-handle',
        );
        setMoveTarget(undefined);
      }
      return;
    }
    if (result.kind === 'folder') {
      if (!result.changed
        || (activeTarget.kind === 'task' && activeTarget.task.kind !== 'quick_item')) {
        setStatus({ kind: 'neutral', message: result.message });
        return;
      }
      const outcome = await commitTransition({
        type: 'move-folder',
        member: activeTarget.kind === 'flow' ? 'saved_flow' : 'quick_item',
        memberRef: activeTarget.kind === 'flow' ? activeTarget.flow.ref : activeTarget.task.ref,
        ...(result.folderId ? { folderId: result.folderId } : {}),
        now: new Date().toISOString(),
      });
      if (shouldClosePersonalWorkspacePocMovePanel(outcome)) {
        postMoveFocusSelector.current = getPersonalWorkspacePocMoveTriggerSelector(
          activeTarget.kind === 'flow' ? activeTarget.flow.ref : activeTarget.task.ref,
          activeTarget.kind === 'flow' ? 'flow-handle' : 'task-handle',
        );
        setMoveTarget(undefined);
      }
      return;
    }
    if (result.resolution.kind === 'current') {
      setStatus({ kind: 'neutral', message: result.resolution.message });
      return;
    }
    if (result.resolution.kind === 'invalid'
      || activeTarget.kind !== 'task'
      || !activeTarget.group) {
      cancelMove(result.resolution.message);
      return;
    }
    const { task, group } = activeTarget;
    const outcome = await commitTransition({
      type: 'reorder',
      context: group.context,
      contextKey: group.contextKey,
      currentOrderedRefKeys: group.tasks.map((candidate) => candidate.ref),
      orderedRefKeys: result.resolution.orderedRefKeys,
      now: new Date().toISOString(),
    });
    if (shouldClosePersonalWorkspacePocMovePanel(outcome)) {
      postMoveFocusSelector.current = getPersonalWorkspacePocMoveTriggerSelector(
        task.ref,
        'task-handle',
      );
      setMoveTarget(undefined);
    }
  };

  const renderMovePanel = (): ReactNode => {
    if (!moveTarget) return null;
    const targetTask = moveTarget.kind === 'task' ? taskByRef.get(moveTarget.task.ref) ?? moveTarget.task : undefined;
    const group = moveTarget.kind === 'task' ? moveTarget.group : undefined;
    const title = moveTarget.kind === 'flow'
      ? flowDisplayTitle(moveTarget.flow)
      : targetTask?.title ?? '';
    const currentFolderId = moveTarget.kind === 'flow'
      ? flowFolder(moveTarget.flow)
      : targetTask?.kind === 'quick_item'
        ? targetTask.folderId
        : targetTask?.flowRef
          ? getPersonalWorkspacePocFolderId(state, targetTask.flowRef)
          : undefined;
    const existingQuickConversion = targetTask?.kind === 'quick_item'
      ? (state.quickConversionReceipts ?? []).find(
          (receiptEntry) => receiptEntry.sourceQuickItemRef === targetTask.ref,
        )
      : undefined;

    const moveFolder = async (folderId?: string) => {
      let outcome: TransitionOutcome = 'unchanged';
      if (moveTarget.kind === 'flow') {
        outcome = await commitTransition({
          type: 'move-folder', member: 'saved_flow', memberRef: moveTarget.flow.ref,
          ...(folderId ? { folderId } : {}), now: new Date().toISOString(),
        });
      } else if (targetTask?.kind === 'quick_item') {
        outcome = await commitTransition({
          type: 'move-folder', member: 'quick_item', memberRef: targetTask.ref,
          ...(folderId ? { folderId } : {}), now: new Date().toISOString(),
        });
      }
      if (shouldClosePersonalWorkspacePocMovePanel(outcome)) {
        postMoveFocusSelector.current = moveReturnFocusSelector;
        setMoveTarget(undefined);
      }
    };

    const moveDate = async (date?: string) => {
      if (!targetTask) return;
      if (targetTask.date === date) {
        setStatus({ kind: 'neutral', message: '이미 같은 위치입니다.' });
        return;
      }
      const outcome = await commitTransition({
        type: 'move-date', itemRef: targetTask.ref,
        ...(date ? { date } : {}),
        now: new Date().toISOString(),
      });
      if (shouldClosePersonalWorkspacePocMovePanel(outcome)) {
        postMoveFocusSelector.current = moveReturnFocusSelector;
        setMoveTarget(undefined);
      }
    };

    const restoreExecutionDate = async () => {
      if (!targetTask || targetTask.kind !== 'flow_item') return;
      const outcome = await commitTransition({
        type: 'restore-execution-date',
        itemRef: targetTask.ref,
        now: new Date().toISOString(),
      });
      if (shouldClosePersonalWorkspacePocMovePanel(outcome)) {
        postMoveFocusSelector.current = moveReturnFocusSelector;
        setMoveTarget(undefined);
      }
    };

    const moveToTrash = async () => {
      const member = moveTarget.kind === 'flow'
        ? 'saved_flow' as const
        : targetTask?.kind === 'quick_item'
          ? 'quick_item' as const
          : undefined;
      const memberRef = moveTarget.kind === 'flow' ? moveTarget.flow.ref : targetTask?.ref;
      if (!member || !memberRef) return;
      const outcome = await commitTransition({
        type: 'move-to-trash',
        member,
        memberRef,
        now: new Date().toISOString(),
      });
      if (outcome === 'changed') {
        postMoveFocusSelector.current = '#personal-workspace-view-heading';
        if (member === 'saved_flow') {
          setSelectedFlowRef(undefined);
          setActiveItemRef(undefined);
        }
        setMoveTarget(undefined);
      }
    };

    const mutationPending = status.kind === 'saving';
    const dropTargetOutcome = (
      kind: PersonalWorkspacePocMoveDropFeedback['kind'],
      targetKey: string,
      current: boolean,
    ): 'idle' | PersonalWorkspacePocMoveDropFeedback['outcome'] => {
      if (moveDropFeedback?.kind === kind && moveDropFeedback.targetKey === targetKey) {
        return moveDropFeedback.outcome;
      }
      return current ? 'current' : 'idle';
    };
    const dropTargetClass = (
      kind: PersonalWorkspacePocMoveDropFeedback['kind'],
      targetKey: string,
      current: boolean,
    ) => {
      const outcome = dropTargetOutcome(kind, targetKey, current);
      return `${SECONDARY_CLASS} ${
        outcome === 'valid'
          ? '!border-[var(--flowme-workspace-accent)] !bg-[var(--flowme-workspace-accent-soft)] !text-[var(--flowme-workspace-accent-strong)] ring-2 ring-[var(--flowme-workspace-accent)]'
          : outcome === 'current'
            ? '!border-slate-400 !bg-slate-50 !text-slate-700'
            : outcome === 'invalid'
              ? '!border-rose-600 !bg-rose-50 !text-rose-800'
              : ''
      }`;
    };

    return (
      <aside
        id="personal-workspace-move-panel"
        role="dialog"
        aria-labelledby="personal-workspace-move-title"
        aria-describedby="personal-workspace-move-description"
        data-testid="personal-workspace-move-panel"
        data-personal-workspace-move-dialog="true"
        data-personal-workspace-drop-outcome={moveDropFeedback?.outcome ?? (reorderPreview ? 'valid' : 'idle')}
        data-personal-workspace-auto-scroll-region="move-panel"
        className={`fixed z-[90] overflow-x-hidden overflow-y-auto rounded-r-lg border bg-white px-4 py-4 shadow-2xl sm:px-5 ${
          moveDropFeedback?.outcome === 'invalid'
            ? 'border-rose-600 ring-2 ring-rose-200'
            : 'border-[var(--flowme-border-strong)]'
        }`}
        style={{
          top: 'calc(var(--personal-workspace-visual-viewport-top, 0px) + max(0.5rem, var(--personal-workspace-safe-top)) + 4.5rem)',
          bottom: 'calc(var(--personal-workspace-visual-viewport-bottom, 0px) + max(0.5rem, var(--personal-workspace-safe-bottom)))',
          left: 'calc(var(--personal-workspace-visual-viewport-left, 0px) + max(0px, var(--personal-workspace-safe-left)))',
          width: 'min(18.75rem, max(8rem, calc(var(--personal-workspace-visual-viewport-width, 100vw) - 10.5rem - var(--personal-workspace-safe-left) - var(--personal-workspace-safe-right))))',
        }}
        onDragOver={(event) => {
          event.preventDefault();
          const session = activeMoveSession.current;
          if (!session) return;
          session.lastX = event.clientX;
          session.lastY = event.clientY;
          updateEdgeAutoScroll(event.clientY, event.currentTarget);
          resolveActiveMoveAtPoint(event.clientX, event.clientY);
        }}
      >
        <div className="sticky top-0 z-20 -mx-4 -mt-4 bg-white px-4 pb-3 pt-4 sm:-mx-5 sm:px-5">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--flowme-border)] pb-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--flowme-workspace-accent-strong)]">이동할 곳</p>
            <h2 id="personal-workspace-move-title" className="mt-1 break-words text-lg font-semibold text-[var(--flowme-text)]">{title}</h2>
          </div>
          <button
            type="button"
            data-testid="personal-workspace-move-close"
            aria-label="이동 창 닫기"
            disabled={mutationPending}
            className={`${SECONDARY_CLASS} shrink-0`}
            onClick={() => cancelMove()}
          >닫기</button>
        </div>
        <p id="personal-workspace-move-description" className="sr-only">
          {moveTarget.kind === 'flow'
            ? 'Flow 전체를 정리할 폴더를 바꿀 수 있습니다. 원본 일정과 안의 할 일 실행 위치는 유지됩니다.'
            : '실행 날짜, 폴더, 같은 목록 안의 순서를 바꿀 수 있습니다.'}
        </p>
        <div
          data-testid="personal-workspace-move-status"
          aria-live="off"
          data-status={status.kind}
          className={`mt-3 border-l-2 px-3 py-2 text-sm font-semibold ${
            status.kind === 'failure'
              ? 'border-rose-600 bg-rose-50 text-rose-800'
              : status.kind === 'saving'
                ? 'border-amber-500 bg-amber-50 text-amber-900'
                : status.kind === 'success'
                  ? 'border-[var(--flowme-positive)] bg-emerald-50 text-emerald-900'
                  : 'border-slate-300 bg-slate-50 text-slate-700'
          }`}
        >{status.message}</div>
        </div>

        <div className="grid min-w-0 gap-5 py-4">
          <div className="grid min-w-0 content-start gap-5">
            {targetTask ? (
              <section aria-labelledby="move-date-heading" className="min-w-0">
                <h3 id="move-date-heading" className="text-sm font-semibold text-[var(--flowme-text)]">실행 날짜</h3>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[today, addPlainDays(today, 1), addPlainDays(today, 7)].map((date, index) => (
                    <button
                      key={date}
                      type="button"
                      data-testid={`personal-workspace-date-target-${index}`}
                      data-personal-workspace-drop-kind="date"
                      data-personal-workspace-drop-date={date}
                      data-personal-workspace-drop-label={index === 0 ? '오늘' : index === 1 ? '내일' : '일주일 뒤'}
                      data-personal-workspace-drop-state={dropTargetOutcome('date', date, targetTask.date === date)}
                      className={dropTargetClass('date', date, targetTask.date === date)}
                      disabled={mutationPending}
                      aria-current={targetTask.date === date ? 'date' : undefined}
                      onDragEnter={() => previewMoveDropTarget(
                        'date',
                        date,
                        targetTask.date !== date,
                        index === 0 ? '오늘' : index === 1 ? '내일' : '일주일 뒤',
                      )}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        dragDropHandled.current = true;
                        void moveDate(date);
                      }}
                      onClick={() => void moveDate(date)}
                    >
                      {index === 0 ? '오늘' : index === 1 ? '내일' : '일주일 뒤'}
                    </button>
                  ))}
                  <button
                    type="button"
                    data-testid="personal-workspace-date-target-undated"
                    data-personal-workspace-drop-kind="undated"
                    data-personal-workspace-drop-label="날짜 미정"
                    data-personal-workspace-drop-state={dropTargetOutcome('date', 'undated', targetTask.date === undefined)}
                    className={dropTargetClass('date', 'undated', targetTask.date === undefined)}
                    disabled={mutationPending}
                    onDragEnter={() => previewMoveDropTarget(
                      'date',
                      'undated',
                      targetTask.date !== undefined,
                      '날짜 미정',
                    )}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      dragDropHandled.current = true;
                      void moveDate(undefined);
                    }}
                    onClick={() => void moveDate(undefined)}
                  >날짜 미정</button>
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    aria-label="직접 실행 날짜"
                    type="date"
                    value={moveDateDraft}
                    disabled={mutationPending}
                    className="min-h-12 min-w-0 flex-1 rounded-md border border-[var(--flowme-border-strong)] px-3 text-base"
                    onChange={(event) => setMoveDateDraft(event.target.value)}
                  />
                  <button type="button" className={PRIMARY_CLASS} disabled={mutationPending} onClick={() => void moveDate(moveDateDraft)}>날짜 적용</button>
                </div>
                {targetTask.kind === 'flow_item' ? (
                  <button
                    type="button"
                    data-testid="personal-workspace-date-restore"
                    className={`${SECONDARY_CLASS} mt-2 w-full`}
                    disabled={mutationPending}
                    onClick={() => void restoreExecutionDate()}
                  >원래 계획 날짜 따르기</button>
                ) : null}
                <button
                  type="button"
                  className={`${SECONDARY_CLASS} mt-2 w-full`}
                  disabled={mutationPending}
                  onClick={async () => {
                    const outcome = await commitTransition({
                      type: 'set-timeline-policy', itemRef: targetTask.ref,
                      policy: targetTask.timelinePolicy === 'excluded' ? 'auto' : 'excluded',
                      now: new Date().toISOString(),
                    });
                    if (shouldClosePersonalWorkspacePocMovePanel(outcome)) {
                      postMoveFocusSelector.current = moveReturnFocusSelector;
                      setMoveTarget(undefined);
                    }
                  }}
                >
                  {targetTask.timelinePolicy === 'excluded' ? '기간 목록에 다시 표시' : '기간 목록에서 숨기기'}
                </button>
              </section>
            ) : null}

            <section aria-labelledby="move-folder-heading" className="min-w-0">
              <h3 id="move-folder-heading" className="text-sm font-semibold text-[var(--flowme-text)]">정리 폴더</h3>
              {targetTask?.kind === 'flow_item' ? (
                <p className="mt-2 rounded-md bg-[var(--flowme-surface-subtle)] px-3 py-3 text-sm text-[var(--flowme-text-secondary)]">
                  Flow Item의 폴더는 부모 Flow와 함께 이동합니다. 현재 {getPersonalWorkspacePocFolderPath(state, currentFolderId)}입니다.
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    data-testid="personal-workspace-folder-target-unfiled"
                    data-personal-workspace-drop-kind="folder"
                    data-personal-workspace-drop-label="미분류"
                    aria-current={!currentFolderId ? 'true' : undefined}
                    data-personal-workspace-drop-state={dropTargetOutcome('folder', 'unfiled', !currentFolderId)}
                    className={dropTargetClass('folder', 'unfiled', !currentFolderId)}
                    disabled={mutationPending}
                    onDragEnter={() => previewMoveDropTarget(
                      'folder',
                      'unfiled',
                      Boolean(currentFolderId),
                      '미분류',
                    )}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      dragDropHandled.current = true;
                      void moveFolder(undefined);
                    }}
                    onClick={() => void moveFolder(undefined)}
                  >미분류</button>
                  {sortedFolders.map((folder) => (
                    <button
                      key={folder.folderId}
                      type="button"
                      data-testid={`personal-workspace-folder-target-${folder.folderId}`}
                      data-personal-workspace-drop-kind="folder"
                      data-personal-workspace-drop-folder-id={folder.folderId}
                      data-personal-workspace-drop-label={getPersonalWorkspacePocFolderPath(state, folder.folderId)}
                      aria-current={currentFolderId === folder.folderId ? 'true' : undefined}
                      data-personal-workspace-drop-state={dropTargetOutcome('folder', folder.folderId, currentFolderId === folder.folderId)}
                      className={dropTargetClass('folder', folder.folderId, currentFolderId === folder.folderId)}
                      disabled={mutationPending}
                      onDragEnter={() => previewMoveDropTarget(
                        'folder',
                        folder.folderId,
                        currentFolderId !== folder.folderId,
                        getPersonalWorkspacePocFolderPath(state, folder.folderId),
                      )}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        dragDropHandled.current = true;
                        void moveFolder(folder.folderId);
                      }}
                      onClick={() => void moveFolder(folder.folderId)}
                    >{getPersonalWorkspacePocFolderPath(state, folder.folderId)}</button>
                  ))}
                </div>
              )}
            </section>
          </div>

          {targetTask && group && group.tasks.length > 1 ? (
            <section aria-labelledby="move-order-heading" className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 id="move-order-heading" className="text-sm font-semibold text-[var(--flowme-text)]">이 목록의 순서</h3>
                {state.timelineOrders.some((entry) => (
                  entry.context === group.context && entry.contextKey === group.contextKey
                )) ? (
                  <button
                    type="button"
                    className={SECONDARY_CLASS}
                    disabled={mutationPending}
                    onClick={async () => {
                      const outcome = await commitTransition({
                        type: 'reset-order', context: group.context, contextKey: group.contextKey,
                        now: new Date().toISOString(),
                      });
                      if (shouldClosePersonalWorkspacePocMovePanel(outcome)) {
                        postMoveFocusSelector.current = moveReturnFocusSelector;
                        setMoveTarget(undefined);
                      }
                    }}
                  >시간순으로 되돌리기</button>
                ) : null}
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-4">
                {([
                  ['top', '맨 위'],
                  ['previous', '위로'],
                  ['next', '아래로'],
                  ['bottom', '맨 아래'],
                ] as const).map(([control, label]) => {
                  const currentIndex = group.tasks.findIndex((task) => task.ref === targetTask.ref);
                  const atTop = currentIndex <= 0;
                  const atBottom = currentIndex < 0 || currentIndex === group.tasks.length - 1;
                  const boundaryDisabled = control === 'top' || control === 'previous' ? atTop : atBottom;
                  return (
                    <button
                      key={control}
                      type="button"
                      data-testid={`personal-workspace-order-${control}`}
                      className={`${SECONDARY_CLASS} min-w-0 overflow-hidden`}
                      disabled={mutationPending || boundaryDisabled}
                      onClick={async () => {
                        const outcome = await moveByControl(targetTask, group, control);
                        if (shouldClosePersonalWorkspacePocMovePanel(outcome)) {
                          postMoveFocusSelector.current = moveReturnFocusSelector;
                          setMoveTarget(undefined);
                        }
                      }}
                    >{label}</button>
                  );
                })}
              </div>
              <div className="mt-3 grid gap-2">
                {group.tasks.map((task) => (
                  <button
                    key={task.ref}
                    type="button"
                    data-testid="personal-workspace-order-target"
                    data-personal-workspace-drop-state={task.ref === targetTask.ref
                      ? 'current'
                      : reorderPreview?.targetRef === task.ref
                        ? 'valid'
                        : 'idle'}
                    aria-label={task.ref === targetTask.ref
                      ? `${targetTask.title} 현재 위치`
                      : `${targetTask.title}을 ${task.title} 앞에 놓기`}
                    disabled={mutationPending}
                    className={`flex min-h-12 w-full min-w-0 items-center justify-between gap-3 overflow-hidden rounded-md border px-3 py-2 text-left text-sm font-semibold ${
                      task.ref === targetTask.ref
                        ? 'border-slate-400 bg-slate-50 text-slate-700'
                        : 'border-[var(--flowme-border)] bg-white text-[var(--flowme-text)]'
                    }`}
                    onClick={async () => {
                      if (task.ref === targetTask.ref) {
                        setStatus({ kind: 'neutral', message: '이미 같은 위치입니다.' });
                        return;
                      }
                      const current = group.tasks.map((item) => item.ref);
                      const next = current.filter((ref) => ref !== targetTask.ref);
                      next.splice(next.indexOf(task.ref), 0, targetTask.ref);
                      const outcome = await commitTransition({
                        type: 'reorder', context: group.context, contextKey: group.contextKey,
                        currentOrderedRefKeys: current, orderedRefKeys: next, now: new Date().toISOString(),
                      });
                      if (shouldClosePersonalWorkspacePocMovePanel(outcome)) {
                        postMoveFocusSelector.current = moveReturnFocusSelector;
                        setMoveTarget(undefined);
                      }
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">{task.title}</span><span aria-hidden="true" className="shrink-0 text-lg">↕</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          {targetTask?.kind === 'quick_item' ? (
            <section
              aria-labelledby="quick-conversion-heading"
              className="border-t border-[var(--flowme-border)] pt-4"
              data-testid="personal-workspace-quick-conversion"
            >
              <h3 id="quick-conversion-heading" className="text-sm font-semibold text-[var(--flowme-text)]">
                Flow로 정리
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--flowme-text-secondary)]">
                빠른 할 일은 그대로 두고, 같은 폴더와 실행일을 가진 새 Flow와 첫 할 일을 만듭니다.
              </p>
              {existingQuickConversion ? (
                <button
                  type="button"
                  data-testid="personal-workspace-quick-conversion-open-existing"
                  className={`${SECONDARY_CLASS} mt-3 w-full`}
                  disabled={mutationPending}
                  onClick={() => void commitQuickItemConversion(targetTask.ref, existingQuickConversion.flowTitle)}
                >정리한 Flow 열기</button>
              ) : quickConversionOpen ? (
                <form
                  className="mt-3 grid gap-3 rounded-md bg-[var(--flowme-surface-subtle)] p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void commitQuickItemConversion(targetTask.ref, quickConversionTitle);
                  }}
                >
                  <label className="grid gap-1 text-sm font-semibold text-[var(--flowme-text-secondary)]">
                    새 Flow 이름
                    <input
                      type="text"
                      data-testid="personal-workspace-quick-conversion-title"
                      value={quickConversionTitle}
                      disabled={mutationPending}
                      autoComplete="off"
                      maxLength={120}
                      className="min-h-12 min-w-0 rounded-md border border-[var(--flowme-border-strong)] bg-white px-3 text-base text-[var(--flowme-text)]"
                      onChange={(event) => setQuickConversionTitle(event.target.value)}
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="submit"
                      data-testid="personal-workspace-quick-conversion-commit"
                      className={PRIMARY_CLASS}
                      disabled={mutationPending || !quickConversionTitle.trim()}
                    >새 Flow 만들기</button>
                    <button
                      type="button"
                      data-testid="personal-workspace-quick-conversion-cancel"
                      className={SECONDARY_CLASS}
                      disabled={mutationPending}
                      onClick={() => {
                        setQuickConversionOpen(false);
                        setQuickConversionTitle(targetTask.title);
                        setStatus({ kind: 'canceled', message: 'Flow로 정리하기를 취소했어요. 바뀐 내용은 없습니다.' });
                      }}
                    >취소</button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  data-testid="personal-workspace-quick-conversion-open"
                  className={`${SECONDARY_CLASS} mt-3 w-full`}
                  disabled={mutationPending}
                  onClick={() => {
                    setQuickConversionTitle(targetTask.title);
                    setQuickConversionOpen(true);
                    setStatus({ kind: 'ready', message: '새 Flow 이름을 확인해 주세요.' });
                  }}
                >Flow로 정리</button>
              )}
            </section>
          ) : null}
          {moveTarget.kind === 'flow' || targetTask?.kind === 'quick_item' ? (
            <section className="border-t border-[var(--flowme-border)] pt-4">
              <button
                type="button"
                data-testid="personal-workspace-move-to-trash"
                className="min-h-12 w-full rounded-md border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={mutationPending}
                onClick={() => void moveToTrash()}
              >휴지통으로 이동</button>
            </section>
          ) : null}
        </div>
      </aside>
    );
  };

  const renderTaskRow = (
    task: PersonalWorkspacePocTask,
    group?: PersonalWorkspacePocTaskGroup,
  ) => {
    const corridorActive = Boolean(
      group
      && moveTarget?.kind === 'task'
      && moveTarget.task.ref === task.ref
      && moveTarget.group?.context === group.context
      && moveTarget.group.contextKey === group.contextKey,
    );
    return (
      <WorkspaceTaskRow
      key={task.ref}
      task={task}
      group={group}
      corridorActive={Boolean(group && moveTarget?.kind === 'task' && moveTarget.group?.context === group.context && moveTarget.group.contextKey === group.contextKey)}
      sourceActive={corridorActive}
      reorderPreviewPosition={reorderPreview?.targetRef === task.ref ? reorderPreview.position : undefined}
      folderPath={getPersonalWorkspacePocFolderPath(state, task.folderId)}
      onComplete={() => void commitTransition({
        type: 'complete', itemRef: task.ref, completed: !task.completed, now: new Date().toISOString(),
      })}
      onOpen={() => {
        if (task.flowRef) {
          openFlowDetail(task.flowRef, getPersonalWorkspacePocTaskOpenSelector(task.ref), task.ref);
        } else {
          beginQuickItemEditor(
            task.ref,
            getPersonalWorkspacePocTaskOpenSelector(task.ref),
          );
        }
      }}
      onOpenMove={(source) => openTaskMove(
        task,
        group,
        getPersonalWorkspacePocMoveTriggerSelector(task.ref, source),
      )}
      onActivatePointerMove={({ clientX, clientY }) => {
        openTaskMove(
          task,
          group,
          getPersonalWorkspacePocMoveTriggerSelector(task.ref, 'task-handle'),
        );
        beginActiveMoveSession(
          'pointer',
          { kind: 'task', task, ...(group ? { group } : {}) },
          clientX,
          clientY,
        );
      }}
      onPointerSessionMove={({ clientX, clientY }) => updateActiveMove(clientX, clientY)}
      onPointerSessionEnd={({ clientX, clientY, moved }) => {
        void finishActiveMove(clientX, clientY, moved);
      }}
      onCancel={(message) => cancelMove(message)}
      onReorder={(control) => group ? void moveByControl(
        task,
        group,
        control,
      ) : undefined}
      onCorridorDragOver={(event) => {
        event.preventDefault();
        updateActiveMove(event.clientX, event.clientY);
      }}
      onCorridorDrop={(event) => {
        event.preventDefault();
        dragDropHandled.current = true;
        void finishActiveMove(event.clientX, event.clientY, true);
      }}
      onDragStart={(event) => {
        preserveNativeStatusBox();
        dragDropHandled.current = false;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/personal-workspace-ref', task.ref);
        openTaskMove(
          task,
          group,
          getPersonalWorkspacePocMoveTriggerSelector(task.ref, 'task-handle'),
        );
        beginActiveMoveSession(
          'native',
          { kind: 'task', task, ...(group ? { group } : {}) },
          event.clientX,
          event.clientY,
        );
      }}
      onDragEnd={() => {
        if (!dragDropHandled.current) {
          cancelMove('대상 밖에 놓아 이동을 취소했어요.');
        } else {
          resetMoveInteraction();
        }
        dragDropHandled.current = false;
      }}
      />
    );
  };

  const renderFolderSurface = () => (
    <div data-testid="personal-workspace-folder-surface" className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--flowme-border)] pb-3">
        <div>
          <p className="text-xs font-semibold text-[var(--flowme-text-tertiary)]">폴더</p>
          <h2 id="personal-workspace-view-heading" tabIndex={-1} className="text-2xl font-semibold text-[var(--flowme-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">{sectionTitle}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {!quickFormOpen && !folderFormOpen && activeFolderId ? (
            <button
              type="button"
              className={SECONDARY_CLASS}
              onClick={async () => {
                const folderId = activeFolderId;
                const result = await commitTransition({ type: 'delete-folder', folderId, now: new Date().toISOString() });
                if (result === 'changed') selectSection('folder');
              }}
            >폴더 삭제</button>
          ) : null}
          {!quickFormOpen && !folderFormOpen ? (
            <>
              <button type="button" aria-expanded={false} aria-controls="personal-workspace-folder-form" className={SECONDARY_CLASS} onClick={toggleFolderForm}>새 폴더</button>
              <button type="button" data-testid="personal-workspace-quick-toggle" data-product-primary="quick-item-open" aria-expanded={false} aria-controls="personal-workspace-quick-form" className={PRIMARY_CLASS} onClick={toggleQuickForm}>빠른 할 일</button>
            </>
          ) : null}
        </div>
      </div>

      {folderFormOpen ? (
        <form id="personal-workspace-folder-form" data-testid="personal-workspace-folder-form" className="grid gap-3 rounded-md bg-[var(--flowme-surface-subtle)] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={(event) => void submitFolder(event)}>
          <label className="grid gap-1 text-sm font-semibold text-[var(--flowme-text)]">
            폴더 이름
            <input required name="folder-title" autoComplete="off" value={folderTitle} className="min-h-12 rounded-md border border-[var(--flowme-border-strong)] bg-white px-3 font-normal" onChange={(event) => setFolderTitle(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[var(--flowme-text)]">
            상위 폴더
            <select name="folder-parent" value={folderParentId} className="min-h-12 rounded-md border border-[var(--flowme-border-strong)] bg-white px-3 font-normal" onChange={(event) => setFolderParentId(event.target.value)}>
              <option value="">없음</option>
              {rootFolders.map((folder) => <option key={folder.folderId} value={folder.folderId}>{folder.title}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2 self-end sm:grid-cols-1">
            <button type="button" className={SECONDARY_CLASS} onClick={toggleFolderForm}>취소</button>
            <button type="submit" data-product-primary="folder-create" className={PRIMARY_CLASS}>만들기</button>
          </div>
        </form>
      ) : null}

      {quickFormOpen ? (
        <form id="personal-workspace-quick-form" data-testid="personal-workspace-quick-form" className="grid gap-3 rounded-md border border-[var(--flowme-border)] p-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={(event) => void submitQuickItem(event)}>
          <label className="grid gap-1 text-sm font-semibold text-[var(--flowme-text)]">
            할 일
            <input autoFocus required name="quick-title" autoComplete="off" value={quickTitle} className="min-h-12 rounded-md border border-[var(--flowme-border-strong)] px-3 font-normal" onChange={(event) => setQuickTitle(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[var(--flowme-text)]">
            실행 날짜
            <input type="date" name="quick-date" value={quickDate} className="min-h-12 rounded-md border border-[var(--flowme-border-strong)] px-3 font-normal" onChange={(event) => setQuickDate(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[var(--flowme-text)]">
            폴더
            <select name="quick-folder" value={quickFolderId} className="min-h-12 rounded-md border border-[var(--flowme-border-strong)] bg-white px-3 font-normal" onChange={(event) => setQuickFolderId(event.target.value)}>
              <option value="">미분류</option>
              {sortedFolders.map((folder) => <option key={folder.folderId} value={folder.folderId}>{getPersonalWorkspacePocFolderPath(state, folder.folderId)}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2 self-end sm:grid-cols-1">
            <button type="button" className={SECONDARY_CLASS} onClick={() => closeQuickForm()}>취소</button>
            <button type="submit" data-product-primary="quick-item-create" className={PRIMARY_CLASS}>추가</button>
          </div>
        </form>
      ) : null}

      {folderFlows.length === 0 && folderQuickItems.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--flowme-border-strong)] px-4 py-8 text-center text-sm text-[var(--flowme-text-secondary)]">
          이 폴더에는 아직 Flow나 빠른 할 일이 없습니다.
        </div>
      ) : null}

      {folderFlows.length > 0 || (resultIsInFolder && visibleOrigin?.kind === 'flow') ? (
        <section aria-labelledby="folder-flow-heading">
          <h3 id="folder-flow-heading" className="text-sm font-semibold text-[var(--flowme-text)]">Flow</h3>
          <div className="mt-2 divide-y divide-[var(--flowme-workspace-line)] border-y border-[var(--flowme-workspace-line)]">
            {folderFlows.map((flow, flowIndex) => {
              const completed = flow.items.filter((item) => isPersonalWorkspacePocCompleted(state, item.ref)).length;
              const flowMoveActive = moveTarget?.kind === 'flow' && moveTarget.flow.ref === flow.ref;
              const displayTitle = flowDisplayTitle(flow);
              return (
                <React.Fragment key={flow.ref}>
                {resultIsInFolder && visibleOrigin?.kind === 'flow' && !folderFlows.some((candidate) => candidate.ref === visibleOrigin.ref)
                  && flowIndex === Math.min(visibleOrigin.rowIndex, folderFlows.length - 1) ? renderContextualResult() : null}
                <article
                  data-testid="personal-workspace-flow-card"
                  data-personal-workspace-flow-ref={flow.ref}
                  data-origin={flow.origin}
                  data-product-row-style="flat"
                  data-personal-workspace-move-source={flowMoveActive ? 'true' : undefined}
                  className={`min-w-0 py-2 ${
                    flowMoveActive ? 'bg-[var(--flowme-workspace-accent-soft)]' : ''
                  }`}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_48px_48px] items-start gap-1">
                    <button
                      type="button"
                      data-personal-workspace-flow-open-trigger={encodeURIComponent(flow.ref)}
                      className={`min-h-12 min-w-0 flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] ${
                        flowMoveActive ? 'text-right' : 'text-left'
                      }`}
                      onClick={() => openFlowDetail(flow.ref, getPersonalWorkspacePocFlowOpenSelector(flow.ref))}
                    >
                      <span className="block text-xs font-semibold text-[var(--flowme-text-tertiary)]">{originLabel(flow.origin)}</span>
                      <span className="mt-1 block break-words text-base font-semibold text-[var(--flowme-text)]">{displayTitle}</span>
                      <span className="mt-1 block text-xs text-[var(--flowme-text-secondary)]">{completed}/{flow.items.length} 완료</span>
                    </button>
                    <WorkspaceMoveHandle
                      testId="personal-workspace-flow-move-handle"
                      triggerToken={getPersonalWorkspacePocMoveTriggerToken(flow.ref, 'flow-handle')}
                      ariaLabel={`${displayTitle} 폴더 이동 옵션. Enter로 이동할 곳을 엽니다.`}
                      describedBy="personal-workspace-flow-move-handle-instructions"
                      expanded={flowMoveActive}
                      onOpen={() => openFlowMove(flow, 'flow-handle')}
                      onActivatePointerMove={({ clientX, clientY }) => {
                        openFlowMove(flow, 'flow-handle');
                        beginActiveMoveSession(
                          'pointer',
                          { kind: 'flow', flow },
                          clientX,
                          clientY,
                        );
                      }}
                      onPointerSessionMove={({ clientX, clientY }) => updateActiveMove(clientX, clientY)}
                      onPointerSessionEnd={({ clientX, clientY, moved }) => {
                        void finishActiveMove(clientX, clientY, moved);
                      }}
                      onCancel={(message) => cancelMove(message)}
                      onDragStart={(event) => {
                        preserveNativeStatusBox();
                        dragDropHandled.current = false;
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/personal-workspace-ref', flow.ref);
                        openFlowMove(flow, 'flow-handle');
                        beginActiveMoveSession(
                          'native',
                          { kind: 'flow', flow },
                          event.clientX,
                          event.clientY,
                        );
                      }}
                      onDragEnd={() => {
                        if (!dragDropHandled.current) {
                          cancelMove('대상 밖에 놓아 이동을 취소했어요.');
                        } else {
                          resetMoveInteraction();
                        }
                        dragDropHandled.current = false;
                      }}
                    />
                    <button
                      type="button"
                      aria-label={`${displayTitle} 이동 옵션`}
                      data-personal-workspace-move-trigger={getPersonalWorkspacePocMoveTriggerToken(flow.ref, 'flow-card')}
                      className="min-h-12 min-w-12 rounded-md text-lg font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
                      onClick={() => openFlowMove(flow, 'flow-card')}
                    >…</button>
                  </div>
                </article>
                {resultIsInFolder && visibleOrigin?.kind === 'flow' && flow.ref === visibleOrigin.ref ? renderContextualResult() : null}
                </React.Fragment>
              );
            })}
            {folderFlows.length === 0 && resultIsInFolder && visibleOrigin?.kind === 'flow' ? renderContextualResult() : null}
          </div>
        </section>
      ) : null}

      {folderQuickItems.length > 0 || (resultIsInFolder && visibleOrigin?.kind === 'task') ? (
        <section aria-labelledby="folder-quick-heading">
          <h3 id="folder-quick-heading" className="text-sm font-semibold text-[var(--flowme-text)]">빠른 할 일</h3>
          <div className="mt-2 divide-y divide-[var(--flowme-border)] border-y border-[var(--flowme-border)]">
            {renderResultInRows(folderQuickItems)}
          </div>
        </section>
      ) : null}
    </div>
  );

  const renderTrashSurface = () => (
    <div data-testid="personal-workspace-trash-surface" className="grid gap-5">
      <div className="border-b border-[var(--flowme-border)] pb-3">
        <p className="text-xs font-semibold text-[var(--flowme-text-tertiary)]">이 기기의 개인공간</p>
        <h2 id="personal-workspace-view-heading" tabIndex={-1} className="text-2xl font-semibold text-[var(--flowme-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">휴지통</h2>
        <p className="mt-1 text-sm text-[var(--flowme-text-secondary)]">가져온 원본은 바꾸지 않고 이 개인공간에서만 숨깁니다.</p>
      </div>
      <label className="grid gap-1 text-sm font-semibold text-[var(--flowme-text)]">
        휴지통 검색
        <input
          type="search"
          data-testid="personal-workspace-trash-search"
          value={trashQuery}
          className="min-h-12 rounded-md border border-[var(--flowme-border-strong)] bg-white px-3 font-normal"
          placeholder="Flow 또는 빠른 할 일 이름"
          onChange={(event) => setTrashQuery(event.target.value)}
        />
      </label>
      <p data-testid="personal-workspace-trash-visible-count" className="text-sm text-[var(--flowme-text-secondary)]">
        {visibleTrashRows.length}개 표시 · 전체 {trashRows.length}개
      </p>
      {visibleTrashRows.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--flowme-border-strong)] px-4 py-8 text-center text-sm text-[var(--flowme-text-secondary)]">
          {trashRows.length === 0 ? '휴지통이 비어 있습니다.' : '검색 결과가 없습니다.'}
        </div>
      ) : (
        <div className="divide-y divide-[var(--flowme-border)] border-y border-[var(--flowme-border)]">
          {visibleTrashRows.map((row) => (
            <article key={row.entry.memberRef} data-testid="personal-workspace-trash-row" data-member-ref={row.entry.memberRef} className="grid min-w-0 gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--flowme-text-tertiary)]">{row.entry.member === 'saved_flow' ? 'Flow' : '빠른 할 일'}</p>
                <h3 className="mt-1 break-words text-sm font-semibold text-[var(--flowme-text)]">{row.title}</h3>
                <p className="mt-1 text-xs text-[var(--flowme-text-secondary)]">{row.entry.trashedAt.slice(0, 10)}에 이동</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="personal-workspace-trash-restore"
                  className={PRIMARY_CLASS}
                  onClick={() => void commitTransition({
                    type: 'restore-from-trash',
                    member: row.entry.member,
                    memberRef: row.entry.memberRef,
                    now: new Date().toISOString(),
                  })}
                >복원</button>
                <button
                  type="button"
                  data-testid="personal-workspace-trash-delete"
                  className="min-h-12 rounded-md border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-700"
                  onClick={() => setTrashDeleteTarget(row)}
                >이 기기에서 영구 삭제</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );

  const renderTimelineSurface = () => (
    <div data-testid={`personal-workspace-${section}-surface`} className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--flowme-border)] pb-3">
        <div>
          <p className="text-xs font-semibold text-[var(--flowme-text-tertiary)]">개인 실행 위치</p>
          <h2 id="personal-workspace-view-heading" tabIndex={-1} className="text-2xl font-semibold text-[var(--flowme-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">{sectionTitle}</h2>
        </div>
        {section !== 'month' && !quickFormOpen && !folderFormOpen ? (
          <button type="button" data-testid="personal-workspace-quick-toggle" data-product-primary="quick-item-open" aria-expanded={false} aria-controls="personal-workspace-quick-form" className={PRIMARY_CLASS} onClick={toggleQuickForm}>빠른 할 일</button>
        ) : null}
      </div>
      {quickFormOpen ? (
        <form id="personal-workspace-quick-form" data-testid="personal-workspace-quick-form" className="grid gap-3 rounded-md border border-[var(--flowme-border)] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={(event) => void submitQuickItem(event)}>
          <label className="grid gap-1 text-sm font-semibold">할 일<input autoFocus required name="quick-title" autoComplete="off" value={quickTitle} className="min-h-12 rounded-md border border-[var(--flowme-border-strong)] px-3 font-normal" onChange={(event) => setQuickTitle(event.target.value)} /></label>
          <label className="grid gap-1 text-sm font-semibold">실행 날짜<input type="date" name="quick-date" value={quickDate} className="min-h-12 rounded-md border border-[var(--flowme-border-strong)] px-3 font-normal" onChange={(event) => setQuickDate(event.target.value)} /></label>
          <div className="grid grid-cols-2 gap-2 self-end sm:grid-cols-1">
            <button type="button" className={SECONDARY_CLASS} onClick={() => closeQuickForm()}>취소</button>
            <button type="submit" data-product-primary="quick-item-create" className={PRIMARY_CLASS}>추가</button>
          </div>
        </form>
      ) : null}
      {timelineDisplayGroups.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--flowme-border-strong)] px-4 py-8 text-center text-sm text-[var(--flowme-text-secondary)]">이 기간에 표시할 할 일이 없습니다.</div>
      ) : timelineDisplayGroups.map((group) => (
        <section key={`${group.context}:${group.contextKey}`} data-testid="personal-workspace-task-group" data-context={group.context} data-context-key={group.contextKey}
          data-result-placeholder={group.tasks.length === 0 ? 'true' : undefined} className="min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--flowme-border-strong)] pb-2">
            <div>
              <h3 className="text-base font-semibold text-[var(--flowme-text)]">{group.label}</h3>
              <p className="text-xs text-[var(--flowme-text-secondary)]">{group.tasks.length}개{group.manualOrder ? ' · 직접 정렬' : ' · 시간순'}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              {group.manualOrder ? <button type="button" className={SECONDARY_CLASS} onClick={() => void commitTransition({ type: 'reset-order', context: group.context, contextKey: group.contextKey, now: new Date().toISOString() })}>시간순</button> : null}
              {group.context === 'date' ? (
                <button
                  type="button"
                  data-testid="personal-workspace-date-quick-add"
                  data-date={group.contextKey}
                  aria-label={`${group.label}에 빠른 할 일 추가`}
                  className="flex min-h-12 min-w-12 items-center justify-center rounded-md text-xl font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
                  onClick={() => openQuickFormForDate(group.contextKey, group.label)}
                >+</button>
              ) : null}
            </div>
          </div>
          <div className="divide-y divide-[var(--flowme-border)]">{renderResultInRows(group.tasks, group)}</div>
        </section>
      ))}
      {section === 'month' && emptyMonthDates.length > 0 ? (
        <section className="border-t border-[var(--flowme-border)] pt-3">
          <button
            type="button"
            data-testid="personal-workspace-empty-month-dates-toggle"
            className={`${SECONDARY_CLASS} w-full text-center`}
            aria-expanded={showEmptyMonthDates}
            aria-controls="personal-workspace-empty-month-dates"
            onClick={() => setShowEmptyMonthDates((visible) => !visible)}
          >{showEmptyMonthDates ? '빈 날짜 접기' : `할 일 없는 날짜 ${emptyMonthDates.length}일 보기`}</button>
          {showEmptyMonthDates ? (
            <div id="personal-workspace-empty-month-dates" className="mt-3 grid" data-testid="personal-workspace-empty-month-dates">
              {emptyMonthDates.map((date) => {
                const label = monthDateLabel(date);
                return (
                  <section
                    key={date}
                    data-testid="personal-workspace-empty-month-date"
                    data-date={date}
                    className="flex min-h-14 items-center justify-between gap-3 border-b border-[var(--flowme-border)]"
                  >
                    <h3 className="text-sm font-semibold text-[var(--flowme-text)]">{label}</h3>
                    <button
                      type="button"
                      data-testid="personal-workspace-date-quick-add"
                      data-date={date}
                      aria-label={`${label}에 빠른 할 일 추가`}
                      className="flex min-h-12 min-w-12 items-center justify-center rounded-md text-xl font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
                      onClick={() => openQuickFormForDate(date, label)}
                    >+</button>
                  </section>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );

  const sourceLabelFor = (flow: PersonalWorkspacePocFlow) => (
    flow.presentation?.discovery?.sourceTitle
      ?? (flow.sourceSlug && flow.sourceSlug !== 'unknown' ? flow.sourceSlug : undefined)
  );

  const sourceUrlFor = (flow: PersonalWorkspacePocFlow) => (
    flow.presentation?.discovery?.sourceUrls[0]
  );

  const renderActiveEditor = (): ReactNode => {
    const activePlanEditor = planEditor.active;
    const sourceFlow = planSourceFlow.current;
    if (activePlanEditor && sourceFlow) {
      const displayPreview = (summary: Readonly<{ affectedRefs: readonly string[]; changes: readonly PersonalWorkspacePocReceiptChange[] }>, scopeRef = sourceFlow.ref) => {
        const made = createPersonalWorkspacePocPlanDisplay({
          receiptId: `plan-preview:${activePlanEditor.id}`, intentId: `plan-preview:${activePlanEditor.id}`,
          operation: activePlanEditor.level === 'item' ? 'apply-item-to-parent-personal-draft' : 'commit-personal-plan',
          status: 'preview', createdAt: new Date().toISOString(), scopeRef,
          changes: summary.changes, affectedRefs: summary.affectedRefs, affectedCount: summary.affectedRefs.length,
          stateRevisionBefore: stateRef.current.revision, stateRevisionAfter: stateRef.current.revision,
          targetWriteCount: 0, supportWriteCount: 0, rollback: 'not-needed',
        }, sourceFlow);
        return made.ok ? made.display : undefined;
      };
      const commonActions = {
        onRequestClose: planEditor.requestClose,
        onContinueEditing: planEditor.continueEditing,
        onDiscardChanges: planEditor.discardChanges,
        onRetry: activePlanEditor.level === 'plan'
          ? retryPlanEditorCommit
          : planEditor.requestCommit,
      };
      const transaction = {
        status: activePlanEditor.status,
        ...(activePlanEditor.failure ? { failure: activePlanEditor.failure } : {}),
        pendingClose: Boolean(activePlanEditor.pendingClose),
      };
      if (activePlanEditor.level === 'plan') {
        const summary = summarizePersonalWorkspacePocPlanDraftChanges({
          sourceFlow,
          baseline: activePlanEditor.baseline,
          draft: activePlanEditor.draft,
        });
        const sourceItems = new Map(sourceFlow.items.map((item) => [item.ref, item]));
        return (
          <PersonalWorkspacePocPlanEditorSurface
            draft={activePlanEditor.draft}
            transaction={transaction}
            actions={commonActions}
            source={{
              ownerLabel: originLabel(sourceFlow.origin),
              title: sourceFlow.title,
              ...(sourceFlow.anchorDate
                ? { originalScheduleLabel: `기준일 ${sourceFlow.anchorDate}` }
                : {}),
              ...(sourceLabelFor(sourceFlow) ? { sourceLabel: sourceLabelFor(sourceFlow) } : {}),
              ...(sourceUrlFor(sourceFlow) ? { sourceUrl: sourceUrlFor(sourceFlow) } : {}),
            }}
            sections={(sourceFlow.sections ?? [])
              .filter((section) => section.editCapability === 'poc-shadow')
              .map((section) => ({
                sectionId: section.sectionId,
                sourceTitle: section.title,
              }))}
            items={activePlanEditor.draft.orderedItemRefs.flatMap((itemRef) => {
              const sourceItem = sourceItems.get(itemRef);
              const draftItem = activePlanEditor.draft.items[itemRef];
              if (!sourceItem || !draftItem) return [];
              const effectiveTitle = draftItem.title.mode === 'override'
                ? draftItem.title.value
                : sourceItem.title;
              const planDateLabel = draftItem.schedule.mode === 'fixed_date'
                ? draftItem.schedule.date
                : draftItem.schedule.mode === 'unscheduled'
                  ? '날짜 미정'
                  : sourceItem.sourceTimingLabel ?? sourceItem.sourceDate ?? '날짜 미정';
              const sourceSection = sourceItem.sectionId
                ? sourceFlow.sections?.find((section) => section.sectionId === sourceItem.sectionId)
                : undefined;
              const sectionDraft = sourceItem.sectionId
                ? activePlanEditor.draft.sectionTitles?.[sourceItem.sectionId]
                : undefined;
              const sectionTitle = sectionDraft?.mode === 'override'
                ? sectionDraft.value
                : sourceSection?.title ?? sourceItem.sectionTitle;
              return [{
                itemRef,
                sourceTitle: sourceItem.title,
                effectiveTitle,
                planDateLabel,
                ...(sectionTitle ? { sectionTitle } : {}),
              }];
            })}
            impact={{
              targetLabel: '내 Flow의 계획',
              affectedCount: summary.affectedRefs.length,
              includedCount: activePlanEditor.draft.orderedItemRefs.length,
              excludedCount: 0,
              planDisplay: displayPreview(summary),
              changes: editablePersonalWorkspacePocChanges(summary.changes),
              warning: '개인 소유 구간과 Flow·할 일의 제목·메모·계획 날짜·순서만 바꿉니다. 작성 원문과 원본 데이터는 그대로입니다.',
            }}
            onDraftChange={(draft) => planEditor.replacePlanDraft(
              draft,
              validatePersonalWorkspacePocPlanDraft(draft),
            )}
            onOpenItem={(intent) => {
              beginPlanItemEditor(
                intent.itemRef,
                intent.returnFocusSelector,
                activePlanEditor.draft,
              );
            }}
            onCommitIntent={(intent) => requestPlanCommit(intent.draft)}
          />
        );
      }

      const parentDraft = planEditor.session?.plan?.draft;
      const sourceItem = sourceFlow.items.find(
        (item) => item.ref === activePlanEditor.draft.identity.itemRef,
      );
      if (!parentDraft || !sourceItem) return null;
      const baselineParent: PersonalWorkspacePocPlanDraft = {
        ...parentDraft,
        items: {
          ...parentDraft.items,
          [sourceItem.ref]: activePlanEditor.baseline,
        },
      };
      const draftParent: PersonalWorkspacePocPlanDraft = {
        ...parentDraft,
        items: {
          ...parentDraft.items,
          [sourceItem.ref]: activePlanEditor.draft,
        },
      };
      const summary = summarizePersonalWorkspacePocPlanDraftChanges({
        sourceFlow,
        baseline: baselineParent,
        draft: draftParent,
      });
      const task = taskByRef.get(sourceItem.ref);
      const contextRows = tasks.filter((candidate) => candidate.date === task?.date);
      const contextIndex = contextRows.findIndex((candidate) => candidate.ref === task?.ref);
      const parentTitle = parentDraft.title.mode === 'override'
        ? parentDraft.title.value
        : sourceFlow.title;
      const sourceDetails = getPersonalWorkspacePocItemDetails(sourceFlow, sourceItem);
      return (
        <PersonalWorkspacePocItemEditorSurface
          adapter="plan-item"
          draft={activePlanEditor.draft}
          transaction={transaction}
          actions={commonActions}
          source={{
            ownerLabel: originLabel(sourceFlow.origin),
            title: sourceItem.title,
            inheritedPersonalMemo: getPersonalWorkspacePocInheritedMemo(sourceItem),
            ...(sourceDetails.description ? { description: sourceDetails.description } : {}),
            ...(sourceDetails.completionCriterion ? { completionCriterion: sourceDetails.completionCriterion } : {}),
            originalScheduleLabel: sourceItem.sourceTimingLabel
              ?? sourceItem.sourceDate
              ?? '날짜 미정',
            ...(sourceLabelFor(sourceFlow) ? { sourceLabel: sourceLabelFor(sourceFlow) } : {}),
            ...(sourceUrlFor(sourceFlow) ? { sourceUrl: sourceUrlFor(sourceFlow) } : {}),
          }}
          execution={{
            periodLabel: task?.date ?? '날짜 미정',
            dateLabel: task?.date ?? '날짜 미정',
            orderLabel: contextIndex >= 0 ? `${contextIndex + 1}/${contextRows.length}` : undefined,
            completionLabel: task?.completed ? '완료' : '진행 중',
          }}
          impact={{
            targetLabel: '저장 전 Flow 계획',
            affectedCount: summary.affectedRefs.length,
            planDisplay: displayPreview(summary, sourceItem.ref),
            changes: editablePersonalWorkspacePocChanges(summary.changes),
          }}
          parentFlowRef={parentDraft.flowRef}
          parentTitle={parentTitle}
          onDraftChange={(draft) => planEditor.replaceItemDraft(
            draft,
            validatePersonalWorkspacePocPlanItemDraft(draft),
          )}
          onApplyToParentDraft={() => planEditor.requestCommit()}
        />
      );
    }

    const activeQuickEditor = quickEditor.active;
    const baseline = quickEditorBaseline.current;
    if (!activeQuickEditor || activeQuickEditor.level !== 'plan' || !baseline) return null;
    const summary = summarizePersonalWorkspacePocQuickDraftChanges(
      baseline.draft,
      activeQuickEditor.draft,
    );
    const task = taskByRef.get(activeQuickEditor.draft.itemRef);
    const quickDraftDateMatchesPersisted = activeQuickEditor.draft.executionDate === task?.date;
    const contextRows = quickDraftDateMatchesPersisted
      ? tasks.filter((candidate) => candidate.date === task?.date)
      : [];
    const contextIndex = contextRows.findIndex((candidate) => candidate.ref === task?.ref);
    return (
      <PersonalWorkspacePocItemEditorSurface
        adapter="quick-item-root"
        draft={activeQuickEditor.draft}
        transaction={{
          status: activeQuickEditor.status,
          ...(activeQuickEditor.failure ? { failure: activeQuickEditor.failure } : {}),
          pendingClose: Boolean(activeQuickEditor.pendingClose),
        }}
        actions={{
          onRequestClose: quickEditor.requestClose,
          onContinueEditing: quickEditor.continueEditing,
          onDiscardChanges: quickEditor.discardChanges,
          onRetry: retryQuickEditorCommit,
        }}
        execution={{
          periodLabel: activeQuickEditor.draft.executionDate ?? '날짜 미정',
          dateLabel: activeQuickEditor.draft.executionDate ?? '날짜 미정',
          orderLabel: quickDraftDateMatchesPersisted && contextIndex >= 0
            ? `${contextIndex + 1}/${contextRows.length}`
            : undefined,
          completionLabel: task?.completed ? '완료' : '진행 중',
        }}
        impact={{
          targetLabel: '빠른 할 일',
          affectedCount: summary.affectedRefs.length,
          changes: editablePersonalWorkspacePocChanges(summary.changes),
        }}
        onDraftChange={(draft) => quickEditor.replacePlanDraft(
          draft,
          validatePersonalWorkspacePocQuickDraft(draft),
        )}
        onCommitIntent={(intent) => requestQuickItemCommit(intent.draft)}
      />
    );
  };

  const quickConversionByFlowRef = useMemo(
    () => new Map(
      (state.quickConversionReceipts ?? []).map((conversion) => [conversion.flowRef, conversion]),
    ),
    [state.quickConversionReceipts],
  );
  const inspectSourcePractice = useCallback((store: PersonalWorkspacePocSourceCandidateStore, flowRef: string | undefined) => {
    const base = stateRef.current.authoredFlows?.find(flow => flow.ref === flowRef);
    if (!base || stateRef.current.quickConversionReceipts?.some(entry => entry.flowRef === base.ref)
      || isPersonalWorkspacePocMemberInactive(stateRef.current, base.ref)) return undefined;
    const effective = getPersonalWorkspacePocEffectiveSourceFlow(base, store);
    if (!effective.ok || effective.flow.origin !== 'authoring-handoff') return undefined;
    const current = createPersonalWorkspacePocCurrentSourceFromAuthoredFlow(effective.flow as PersonalWorkspacePocAuthoredFlow);
    if (!current) return undefined;
    const target = { origin: 'authoring-handoff' as const, flowRef: base.ref, savedCopyId: base.savedCopyId,
      flowId: base.flowId, handoffId: base.authoring.handoffId };
    const catalog = inspectPersonalWorkspacePocSourceCandidateCatalog({ target, current, store });
    return catalog.ok ? { base, current, target, catalog } : undefined;
  }, []);
  // Read-only: no incoming generator, stage, merge, clock or storage access here.
  const sourcePracticeRead = useMemo(() => inspectSourcePractice(sourceCandidateStore, selectedFlowRef),
    [inspectSourcePractice, selectedFlowRef, sourceCandidateStore, state]);
  const selectedSourceCandidateId = selectedFlowRef ? sourcePracticeSelections[selectedFlowRef] : undefined;
  const sourceUpdateEnvelope = selectedSourceCandidateId
    && sourcePracticeRead?.catalog.candidates.some(row => row.candidateId === selectedSourceCandidateId)
    ? sourceCandidateStore.envelopes[selectedSourceCandidateId] : undefined;
  const sourceUpdateReview = sourceUpdateEnvelope
    ? sourceCandidateStore.reviews[sourceUpdateEnvelope.candidateId]
    : undefined;
  sourcePracticeFlowRef.current = selectedFlowRef;
  useEffect(() => {
    const raw = JSON.stringify(state);
    if (sourcePracticeObservedState.current === raw) return;
    sourcePracticeObservedState.current = raw;
    sourcePracticeWorkspaceEpoch.current += 1;
    Object.keys(sourceCandidateStoreRef.current.envelopes).forEach(id => sourcePracticeStaleCandidates.current.add(id));
    const owner = sourcePracticeOwner.current;
    if (owner) {
      owner.stale = true;
      setSourceUpdateStatus('stale');
      setSourceUpdateError('비교 뒤 개인공간이 달라졌어요. 현재 원문으로 다시 비교해 주세요.');
    }
  }, [state]);
  useEffect(() => {
    const owner = sourcePracticeOwner.current;
    if (owner && owner.screenKey === planScreenKey) return;
    sourcePracticeOwner.current = undefined;
    setSourceUpdateOpen(false);
    setSourceUpdateSelectedChangeId(undefined);
    setSourceUpdateStatus('pending');
    setSourceUpdateError(undefined);
  }, [planScreenKey]);
  useEffect(() => {
    const observe = (event: StorageEvent) => {
      if (event.storageArea && event.storageArea !== window.localStorage) return;
      if (event.key !== null && event.key !== PERSONAL_WORKSPACE_POC_STATE_KEY
        && event.key !== PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY) return;
      sourcePracticeWorkspaceEpoch.current += 1;
      Object.keys(sourceCandidateStoreRef.current.envelopes).forEach(id => sourcePracticeStaleCandidates.current.add(id));
      const owner = sourcePracticeOwner.current;
      if (owner) { owner.stale = true; sourcePracticeStaleCandidates.current.add(owner.candidateId); }
      if (owner) {
        setSourceUpdateStatus('stale');
        setSourceUpdateError('비교 뒤 저장 상태가 달라졌어요. 기존 선택을 확인한 뒤 현재 원문으로 다시 비교해 주세요.');
      }
    };
    window.addEventListener('storage', observe);
    return () => window.removeEventListener('storage', observe);
  }, []);
  const sourceUpdateChanges = useMemo(
    () => sourceUpdateEnvelope
      ? buildPersonalWorkspacePocSourceUpdateChanges(sourceUpdateEnvelope)
      : [],
    [sourceUpdateEnvelope],
  );
  const sourceUpdateResolutions = useMemo<Readonly<Record<
    string,
    PersonalWorkspacePocSourceUpdateResolution | undefined
  >>>(() => Object.fromEntries(sourceUpdateChanges.map((change) => {
    if (sourceUpdateLaterChangeIds[(sourceUpdateEnvelope?.candidateId ?? '') + ':' + change.changeId]) return [change.changeId, 'later'];
    const resolution = sourceUpdateReview?.resolutions[change.changeId];
    return [
      change.changeId,
      resolution === 'keep-mine'
        ? 'keep-working'
        : resolution === 'use-incoming'
          ? 'use-incoming'
          : undefined,
    ];
  })), [sourceUpdateChanges, sourceUpdateEnvelope?.candidateId, sourceUpdateLaterChangeIds, sourceUpdateReview?.resolutions]);
  const effectiveSourceUpdateStatus: PersonalWorkspacePocSourceUpdateStatus =
    sourceUpdateStatus === 'failed' || sourceUpdateStatus === 'stale' || sourceUpdateStatus === 'undoing'
      ? sourceUpdateStatus : sourceUpdateReview?.status === 'applied' ? 'applied' : sourceUpdateStatus;

  const sourcePracticeAllowed = () => Boolean(workspaceWriteOwner.current) && !pending.current
    && !editorOwner.current && !contextualRecovery.current && !sourcePracticeRecovery.current
    && !planDisplayRef.current && !contextualReceiptRef.current;

  const rejectSourcePractice = (message: string, owner?: SourcePracticeOwner) => {
    if (owner && (sourcePracticeOwner.current !== owner || workspaceWriteOwner.current !== owner.routeOwner)) return false;
    if (owner) { owner.stale = true; sourcePracticeStaleCandidates.current.add(owner.candidateId); }
    setSourceUpdateStatus(owner ? 'stale' : 'failed');
    setSourceUpdateError(message);
    setStatus({ kind: 'failure', message });
    return false;
  };

  const sourcePracticeOwnerCurrent = (owner: SourcePracticeOwner, expectedSourceRaw = owner.sourceRaw) => {
    try {
      const current = inspectSourcePractice(owner.store, owner.flowRef);
      const valid = sourcePracticeOwner.current === owner && !owner.stale
        && workspaceWriteOwner.current === owner.routeOwner && window.location.href === owner.href
        && sourcePracticeFlowRef.current === owner.flowRef && planScreenRef.current === owner.screenKey
        && planSourceEpoch.current === owner.sourceEpoch
        && sourcePracticeWorkspaceEpoch.current === owner.workspaceEpoch
        && !editorOwner.current && !contextualRecovery.current && !sourcePracticeRecovery.current
        && window.localStorage.getItem(PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY) === expectedSourceRaw
        && window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY) === owner.workspaceRaw
        && isPersonalWorkspacePocEditorStateRawCurrent(stateRef.current, owner.workspaceRaw)
        && current && JSON.stringify(current.current) === JSON.stringify(owner.current);
      if (!valid) { owner.stale = true; sourcePracticeStaleCandidates.current.add(owner.candidateId); }
      return Boolean(valid);
    } catch { owner.stale = true; sourcePracticeStaleCandidates.current.add(owner.candidateId); return false; }
  };

  const captureSourcePractice = (refresh = false) => {
    if (!sourcePracticeAllowed()) { rejectSourcePractice('열린 편집이나 결과를 먼저 닫아 주세요. 저장 상태 확인이 필요하면 새로고침해 주세요.'); return undefined; }
    const routeOwner = workspaceWriteOwner.current!, sourceEpoch = planSourceEpoch.current;
    const workspaceEpoch = sourcePracticeWorkspaceEpoch.current;
    try {
      const workspaceRaw = window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY);
      if (!isPersonalWorkspacePocEditorStateRawCurrent(stateRef.current, workspaceRaw)) {
        rejectSourcePractice('개인공간 저장 상태가 달라졌어요. 현재 내용을 다시 연 뒤 비교해 주세요.'); return undefined;
      }
      const loaded = loadPersonalWorkspacePocSourceCandidateStore(window.localStorage);
      if (loaded.kind === 'corrupt') { rejectSourcePractice('원문 저장 영역을 읽지 못했어요. 기존 내용과 선택을 유지합니다.'); return undefined; }
      const durable = loaded.kind === 'ready' ? loaded.store : createPersonalWorkspacePocSourceCandidateStore();
      if (!refresh && loaded.raw !== sourceCandidateRawRef.current) {
        rejectSourcePractice('원문 저장 상태가 달라졌어요. 기존 비교에서 현재 원문으로 다시 비교해 주세요.'); return undefined;
      }
      const working = loaded.raw === sourceCandidateRawRef.current ? sourceCandidateStoreRef.current
        : mergePersonalWorkspacePocSourcePracticeMemory(durable, sourceCandidateStoreRef.current, sourcePracticeBaseStore.current);
      if (!working) { rejectSourcePractice('같은 비교 기록의 결정이 달라 자동으로 합치지 않았어요. 기존 선택을 확인해 주세요.'); return undefined; }
      const read = inspectSourcePractice(working, sourcePracticeFlowRef.current);
      const durableRead = inspectSourcePractice(durable, sourcePracticeFlowRef.current);
      if (!read || !durableRead || JSON.stringify(read.current) !== JSON.stringify(durableRead.current)) {
        rejectSourcePractice('이 Flow의 원문을 안전하게 확인할 수 없어 연습을 시작하지 않았어요.'); return undefined;
      }
      const composed = composePersonalWorkspacePocReadModel(initialModel, stateRef.current, working);
      if (!composed.ok || !validatePersonalWorkspacePocStateReferences(stateRef.current, composed.model).ok
        || sourceEpoch !== planSourceEpoch.current || workspaceEpoch !== sourcePracticeWorkspaceEpoch.current
        || routeOwner !== workspaceWriteOwner.current
        || window.localStorage.getItem(PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY) !== loaded.raw
        || window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY) !== workspaceRaw) {
        rejectSourcePractice('현재 개인 기록과 맞지 않아 비교를 바꾸지 않았어요.'); return undefined;
      }
      return { read, working, durable, sourceRaw: loaded.raw, workspaceRaw, sourceEpoch, workspaceEpoch, routeOwner };
    } catch { rejectSourcePractice('저장 상태를 확인하지 못했어요. 기존 내용과 선택을 유지합니다.'); return undefined; }
  };

  const adoptSourcePractice = (
    capture: NonNullable<ReturnType<typeof captureSourcePractice>>,
    store: PersonalWorkspacePocSourceCandidateStore,
    candidateId: string,
    refreshed: boolean,
  ) => {
    const candidate = store.envelopes[candidateId], review = store.reviews[candidateId];
    if (!candidate || candidate.target.flowRef !== capture.read.target.flowRef) return false;
    sourcePracticeBaseStore.current = capture.durable;
    if (planObservedSource.current !== capture.sourceRaw) {
      planObservedSource.current = capture.sourceRaw; planSourceEpoch.current += 1;
    }
    sourceCandidateRawRef.current = capture.sourceRaw;
    sourceCandidateStoreRef.current = store;
    setSourceCandidateRaw(capture.sourceRaw); setSourceCandidateStore(store);
    if (refreshed) sourcePracticeStaleCandidates.current.delete(candidateId);
    const stale = sourcePracticeStaleCandidates.current.has(candidateId)
      || capture.read.catalog.candidates.find(row => row.candidateId === candidateId)?.stale === true;
    sourcePracticeOwner.current = {
      routeOwner: capture.routeOwner, flowRef: capture.read.target.flowRef, candidateId,
      screenKey: planScreenRef.current, href: window.location.href, sourceRaw: capture.sourceRaw,
      workspaceRaw: capture.workspaceRaw, sourceEpoch: planSourceEpoch.current,
      workspaceEpoch: capture.workspaceEpoch, current: capture.read.current, store, stale,
    };
    setSourcePracticeSelections(previous => ({ ...previous, [capture.read.target.flowRef]: candidateId }));
    const first = candidate.changes.find(change => !review?.resolutions[change.changeId]) ?? candidate.changes[0];
    setSourceUpdateSelectedChangeId(first?.changeId);
    setSourceUpdateStatus(stale ? 'stale' : review?.status === 'applied' ? 'applied' : 'pending');
    setSourceUpdateError(stale ? '기존 비교와 선택은 그대로입니다. 현재 원문으로 다시 비교해 주세요.' : undefined);
    setSourceUpdateOpen(review?.status !== 'applied');
    return true;
  };

  // Only explicit start/refresh calls the existing local generator.
  const startSourcePractice = (refresh = false) => {
    const selected = sourcePracticeFlowRef.current && sourcePracticeSelections[sourcePracticeFlowRef.current];
    if (!refresh && selected && sourcePracticeStaleCandidates.current.has(selected)) {
      return rejectSourcePractice('기존 비교에서 현재 원문으로 다시 비교를 선택해 주세요.');
    }
    const capture = captureSourcePractice(refresh); if (!capture) return false;
    const made = createPersonalWorkspacePocLocalFixtureEnvelope(capture.read.base, {
      current: capture.read.current,
      incomingRawText: buildPersonalWorkspacePocSourceUpdateFixtureRaw(capture.read.current.rawText),
      incomingRevisionId: capture.read.current.revisionId + ':local-update-v1',
      fixtureId: 'personal-workspace-p3d-local-update-v1',
      createdAt: '2026-09-04T00:00:00.000Z',
    });
    if (!made.ok) return rejectSourcePractice('현재 원문으로 연습용 비교를 만들지 못했어요. 기존 비교를 유지합니다.');
    const existing = capture.working.envelopes[made.envelope.candidateId];
    if (existing && JSON.stringify(existing) !== JSON.stringify(made.envelope)) {
      return rejectSourcePractice('같은 비교 기록과 내용이 달라 기존 결정을 덮지 않았어요.');
    }
    const staged = stagePersonalWorkspacePocSourceCandidate(capture.working, made.envelope, capture.read.current, new Date().toISOString());
    if (!['staged', 'resumed', 'already-staged', 'already-applied'].includes(staged.code)) {
      return rejectSourcePractice('현재 원문과 기존 비교를 안전하게 연결하지 못했어요.');
    }
    return adoptSourcePractice(capture, staged.store, made.envelope.candidateId, refresh);
  };

  const openSourceUpdateReview = (candidateId = sourceUpdateEnvelope?.candidateId) => {
    if (!candidateId || !sourcePracticeAllowed()) return;
    const capture = captureSourcePractice();
    const candidate = sourceCandidateStoreRef.current.envelopes[candidateId];
    if (!capture || sourcePracticeStaleCandidates.current.has(candidateId)) {
      if (candidate?.target.flowRef !== sourcePracticeFlowRef.current) return;
      sourcePracticeOwner.current = undefined;
      setSourcePracticeSelections(previous => ({ ...previous, [candidate.target.flowRef]: candidateId }));
      setSourceUpdateStatus('stale'); setSourceUpdateOpen(true);
      return;
    }
    const row = capture.read.catalog.candidates.find(entry => entry.candidateId === candidateId);
    if (!row || !candidate) return;
    if (row.stale || row.status === 'applied') {
      if (adoptSourcePractice(capture, capture.working, candidateId, false)) setSourceUpdateOpen(true);
      return;
    }
    const resumed = stagePersonalWorkspacePocSourceCandidate(capture.working, candidate, capture.read.current, new Date().toISOString());
    if (!['staged', 'resumed', 'already-staged', 'already-applied'].includes(resumed.code)) return;
    adoptSourcePractice(capture, resumed.store, candidateId, false);
  };

  const deferSourceUpdateReview = () => {
    if (pending.current) return;
    const owner = sourcePracticeOwner.current;
    if (owner && !owner.stale && sourcePracticeOwnerCurrent(owner)) {
      const deferred = deferPersonalWorkspacePocSourceCandidate(owner.store, { candidateId: owner.candidateId, now: new Date().toISOString() });
      if (deferred.changed) {
        owner.store = deferred.store;
        sourceCandidateStoreRef.current = deferred.store; setSourceCandidateStore(deferred.store);
      }
    }
    sourcePracticeOwner.current = undefined; setSourceUpdateOpen(false);
    setStatus({ kind: 'neutral', message: '적용 전 선택은 이 실행 중에만 유지됩니다.' });
  };

  const resolveSourceUpdateChange = (changeId: string, resolution: PersonalWorkspacePocSourceUpdateResolution) => {
    const owner = sourcePracticeOwner.current;
    if (pending.current || !owner) return;
    if (!sourcePracticeOwnerCurrent(owner)) { rejectSourcePractice('저장 상태가 달라 선택을 바꾸지 않았어요.', owner); return; }
    const input = { candidateId: owner.candidateId, changeId, now: new Date().toISOString() };
    const transitioned = resolution === 'later'
      ? clearPersonalWorkspacePocSourceCandidateChangeResolution(owner.store, input)
      : resolvePersonalWorkspacePocSourceCandidateChange(owner.store, { ...input, resolution: resolution === 'keep-working' ? 'keep-mine' : 'use-incoming' });
    if (transitioned.changed || transitioned.code === 'no-op') {
      owner.store = transitioned.store;
      sourceCandidateStoreRef.current = transitioned.store; setSourceCandidateStore(transitioned.store);
      setSourceUpdateLaterChangeIds(previous => {
        const next = { ...previous }; const key = owner.candidateId + ':' + changeId;
        if (resolution === 'later') next[key] = true; else delete next[key]; return next;
      });
      setSourceUpdateStatus('pending'); setSourceUpdateError(undefined);
    }
  };

  // The selected DTO never authorizes I/O. Revalidate the captured private owner
  // inside the shared user-data lock, including after the queued frame.
  const runSourcePracticeWrite = async (owner: SourcePracticeOwner, operation: 'apply' | 'undo') => {
    if (pending.current || !sourcePracticeOwnerCurrent(owner)) return;
    const request = {};
    sourcePracticePending.current = request; pending.current = true;
    setSourceUpdateStatus(operation === 'apply' ? 'applying' : 'undoing');
    setSourceUpdateError(undefined);
    await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));
    const locked = await withFlowUserDataWriteLock(() => {
      if (sourcePracticePending.current !== request || !sourcePracticeOwnerCurrent(owner)) return { kind: 'stale' as const };
      const transitioned = operation === 'apply'
        ? applyPersonalWorkspacePocSourceCandidate(owner.store, {
          candidateId: owner.candidateId, current: owner.current, now: new Date().toISOString(),
        })
        : undoPersonalWorkspacePocSourceCandidate(owner.store, new Date().toISOString());
      if (!transitioned.changed) return { kind: 'transition' as const, code: transitioned.code };
      const composed = composePersonalWorkspacePocReadModel(initialModel, stateRef.current, transitioned.store);
      if (!composed.ok || !validatePersonalWorkspacePocStateReferences(stateRef.current, composed.model).ok) {
        return { kind: 'invalid' as const };
      }
      if (sourcePracticePending.current !== request || !sourcePracticeOwnerCurrent(owner)) return { kind: 'stale' as const };
      const saved = savePersonalWorkspacePocSourceCandidateStore({
        storage: window.localStorage, expectedRawValue: owner.sourceRaw, store: transitioned.store,
      });
      return { kind: 'saved' as const, saved, store: transitioned.store };
    });
    if (sourcePracticePending.current !== request) return;
    sourcePracticePending.current = undefined; pending.current = false;
    // A completed write is never rolled back merely because its presentation
    // owner ended. Do not deliver success or a new Undo to another screen.
    const sameOwner = sourcePracticeOwner.current === owner
      && workspaceWriteOwner.current === owner.routeOwner
      && window.location.href === owner.href && planScreenRef.current === owner.screenKey;
    if (!sameOwner) return;
    if (!locked.ok) {
      setSourceUpdateStatus('failed');
      setSourceUpdateError('저장 잠금을 확인하지 못해 적용하지 않았어요. 기존 선택을 유지합니다.');
      return;
    }
    const outcome = locked.value;
    if (outcome.kind === 'stale') {
      rejectSourcePractice('비교 뒤 저장 상태가 달라 적용하지 않았어요. 현재 원문으로 다시 비교해 주세요.', owner);
      return;
    }
    if (outcome.kind !== 'saved') {
      setSourceUpdateStatus('failed');
      setSourceUpdateError(outcome.kind === 'transition' && outcome.code === 'unresolved'
        ? '아직 결정하지 않은 곳이 있어 적용하지 않았어요.'
        : '현재 개인 기록과 맞지 않아 원문을 바꾸지 않았어요.');
      return;
    }
    if (!outcome.saved.ok) {
      if (outcome.saved.rollback === 'recovery-required') {
        sourcePracticeRecovery.current = true;
        owner.stale = true; sourcePracticeStaleCandidates.current.add(owner.candidateId);
      }
      setSourceUpdateStatus('failed');
      setSourceUpdateError(outcome.saved.rollback === 'recovery-required'
        ? '원문 저장 상태를 확정하지 못했어요. 기존 선택을 확인하고 새로고침해 주세요. 추가 적용과 되돌리기는 잠겼습니다.'
        : outcome.saved.rollback === 'complete'
          ? '저장하지 못해 이 적용의 변경을 복구했어요. 기존 선택으로 다시 시도할 수 있습니다.'
          : '저장하지 못했어요. 적용 전 저장값과 기존 선택을 유지합니다.');
      return;
    }
    if (!sourcePracticeOwnerCurrent(owner, outcome.saved.serialized)) {
      sourcePracticeRecovery.current = true;
      setSourceUpdateStatus('stale');
      setSourceUpdateError('원문은 저장됐지만 이후 상태가 달라 결과를 연결하지 않았어요. 새로고침해 현재 내용을 확인해 주세요.');
      return;
    }
    sourceCandidateRawRef.current = outcome.saved.serialized;
    sourceCandidateStoreRef.current = outcome.store;
    sourcePracticeBaseStore.current = outcome.store;
    if (planObservedSource.current !== outcome.saved.serialized) {
      planObservedSource.current = outcome.saved.serialized; planSourceEpoch.current += 1;
    }
    sourcePracticeOwner.current = undefined;
    setSourceCandidateRaw(outcome.saved.serialized); setSourceCandidateStore(outcome.store);
    setSourceUpdateStatus(operation === 'apply' ? 'applied' : 'pending');
    setSourceUpdateOpen(false); setSourceUpdateError(undefined);
    setStatus({ kind: 'success', message: operation === 'apply'
      ? '로컬 연습의 원문 변경을 적용했어요. 개인 날짜와 완료 기록은 그대로예요.'
      : '마지막 로컬 원문 적용을 되돌렸어요.' });
  };

  const applySourceUpdate = async () => {
    const owner = sourcePracticeOwner.current;
    if (!owner || owner.candidateId !== sourceUpdateEnvelope?.candidateId) return;
    await runSourcePracticeWrite(owner, 'apply');
  };

  const undoSourceUpdate = async (candidateId: string | undefined) => {
    if (!candidateId || !sourcePracticeAllowed()) return;
    if (sourcePracticeStaleCandidates.current.has(candidateId)) {
      rejectSourcePractice('비교 뒤 저장 상태가 달라 원문 적용을 되돌리지 않았어요. 새로고침해 현재 기록을 확인해 주세요.');
      return;
    }
    const capture = captureSourcePractice(); if (!capture) return;
    const undo = capture.read.catalog.undo;
    if (!undo.available || undo.candidateId !== candidateId
      || capture.working.undo?.candidateId !== candidateId
      || capture.working.undo.flowRef !== capture.read.target.flowRef) return;
    const owner: SourcePracticeOwner = {
      routeOwner: capture.routeOwner, flowRef: capture.read.target.flowRef, candidateId,
      screenKey: planScreenRef.current, href: window.location.href,
      sourceRaw: capture.sourceRaw, workspaceRaw: capture.workspaceRaw,
      sourceEpoch: capture.sourceEpoch, workspaceEpoch: capture.workspaceEpoch,
      current: capture.read.current, store: capture.working, stale: false,
    };
    sourcePracticeOwner.current = owner;
    await runSourcePracticeWrite(owner, 'undo');
  };

  const renderFlowDetail = (flow: PersonalWorkspacePocFlow) => {
    const displayTitle = flowDisplayTitle(flow);
    const authoring = state.authoredFlows?.find((candidate) => candidate.ref === flow.ref)?.authoring;
    const quickConversion = quickConversionByFlowRef.get(flow.ref);
    const effectiveSourceVersion = sourceCandidateStore.effectiveVersions[flow.ref];
    const authoredRawText = effectiveSourceVersion?.sourceRevision.rawText
      ?? authoring?.rawText;
    const flowTasks = flow.items.flatMap((item) => {
      const task = taskByRef.get(item.ref);
      return task ? [task] : [];
    });
    const todos = buildDateGroupedTodoListViewModel({
      anchorDate: flow.anchorDate,
      items: flowTasks.map((task, index) => ({
        id: task.ref,
        title: task.title,
        date: task.date,
        completed: task.completed,
        sourceOrder: index,
        meta: [task.date ? '개인 실행일' : '날짜 미정', getPersonalWorkspacePocFolderPath(state, task.folderId)],
        data: task,
      })),
    });
    const activeTask = activeItemRef ? taskByRef.get(activeItemRef) : undefined;
    const composition = resolvePlanExecutionWorkspaceComposition(viewportWidth);
    const itemUsesSheet = shouldUsePersonalWorkspacePocItemSheet(composition);
    const completedCount = flowTasks.filter((task) => task.completed).length;
    const result = buildPersonalWorkspacePocResultProjection({
      model: resultBaseModel,
      sourceIndex: sourceRead.ok ? sourceRead.index : undefined,
      purpose: 'personal-execution',
      state,
      flowRef: flow.ref,
      localToday: today,
      ...(resultNavigation.baseDate ? { baseDate: resultNavigation.baseDate } : {}),
      ...(resultNavigation.selectedDate ? { selectedDate: resultNavigation.selectedDate } : {}),
    });
    const renderDetail = (inSheet = false) => activeTask ? (
      <div
        id="poc-flow-item-detail"
        data-testid="personal-workspace-flow-item-detail"
        tabIndex={-1}
        aria-labelledby="personal-workspace-flow-item-detail-title"
        className="min-w-0 rounded-md bg-[var(--flowme-surface-subtle)] p-4 [overflow-wrap:anywhere] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
      >
        {!inSheet ? (
          <>
            <p className="text-xs font-semibold text-[var(--flowme-text-tertiary)]">{activeTask.flowTitle}</p>
            <h4 id="personal-workspace-flow-item-detail-title" className="mt-1 text-lg font-semibold text-[var(--flowme-text)]">{activeTask.title}</h4>
          </>
        ) : <span id="personal-workspace-flow-item-detail-title" className="sr-only">{activeTask.title} 상세</span>}
        <dl className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 text-sm">
          <div><dt className="font-semibold text-[var(--flowme-text-secondary)]">실행 위치</dt><dd>{activeTask.date ?? '날짜 미정'}</dd></div>
          <div><dt className="font-semibold text-[var(--flowme-text-secondary)]">폴더</dt><dd>{getPersonalWorkspacePocFolderPath(state, activeTask.folderId)} · Flow에서 상속</dd></div>
          <PersonalWorkspacePocTaskReadOnlyDetails task={activeTask} />
        </dl>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            data-testid="personal-workspace-flow-item-edit"
            className={PRIMARY_CLASS}
            onClick={() => {
              if (itemUsesSheet) setActiveItemRef(undefined);
              beginWorkspacePlanItemEditor(
                flow.ref,
                activeTask.ref,
                `[data-todo-detail-link="${activeTask.ref}"]`,
              );
            }}
          >계획 편집</button>
          <button
            type="button"
            data-personal-workspace-move-trigger={getPersonalWorkspacePocMoveTriggerToken(activeTask.ref, 'item-detail')}
            className={SECONDARY_CLASS}
            onClick={() => {
              if (itemUsesSheet) setActiveItemRef(undefined);
              openTaskMove(
                activeTask,
                undefined,
                itemUsesSheet
                  ? `[data-todo-detail-link="${activeTask.ref}"]`
                  : getPersonalWorkspacePocMoveTriggerSelector(activeTask.ref, 'item-detail'),
              );
            }}
          >이동</button>
          <button type="button" className={SECONDARY_CLASS} onClick={() => void commitTransition({ type: 'complete', itemRef: activeTask.ref, completed: !activeTask.completed, now: new Date().toISOString() })}>{activeTask.completed ? '다시 열기' : '완료'}</button>
        </div>
        {visibleOrigin?.flowRef === flow.ref && visibleOrigin.itemDetailRef === activeTask.ref ? renderContextualResult() : null}
      </div>
    ) : null;

    return (
      <div data-testid="personal-workspace-flow-detail" data-product-plan-item-grammar="v1" data-product-origin={flow.origin} className="min-w-0">
        {sourcePracticeRead && sourcePracticeRead.catalog.candidates.length > 0 ? (
          <section data-testid="personal-workspace-source-practice-records" className="mb-4 rounded-md border border-[var(--flowme-border)] p-3">
            <h2 className="text-sm font-semibold">보관된 로컬 비교</h2>
            <p className="mt-1 text-xs leading-5">운영 원문을 가져오지 않는 연습 기록입니다. 비교할 기록을 직접 선택해 주세요.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {sourcePracticeRead.catalog.candidates.map((row, index) => (
                <button type="button" key={row.candidateId}
                  data-testid="personal-workspace-source-practice-record" data-candidate-id={row.candidateId}
                  disabled={pending.current || Boolean(planEditor.active) || Boolean(quickEditor.active)}
                  className={SECONDARY_CLASS} onClick={() => openSourceUpdateReview(row.candidateId)}>
                  비교 {index + 1} · {row.status === 'applied' ? '적용됨' : row.status === 'deferred' ? '보류' : '검토 중'} · 결정 {row.resolvedCount}/{row.changeCount}
                </button>
              ))}
              {sourcePracticeRead.catalog.undo.available ? (
                <button type="button" data-testid="personal-workspace-source-practice-undo"
                  data-candidate-id={sourcePracticeRead.catalog.undo.candidateId}
                  disabled={pending.current || sourcePracticeRecovery.current || Boolean(planEditor.active) || Boolean(quickEditor.active)}
                  className={SECONDARY_CLASS}
                  onClick={() => { const undo = sourcePracticeRead.catalog.undo; if (undo.available) void undoSourceUpdate(undo.candidateId); }}>
                  마지막 원문 적용 되돌리기
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
        {sourceUpdateEnvelope
          && sourceUpdateEnvelope.target.flowRef === flow.ref ? (
            <div className="mb-4" data-source-update-owner="poc-source-candidate-store">
              <PersonalWorkspacePocSourceUpdateReview
                practice={{ recordEntryOnly: true, locked: sourcePracticeRecovery.current, canUndo: false, returnFocusSelector: '#personal-workspace-flow-detail-heading' }}
                announceBanner={!planEditor.active && !quickEditor.active && !planDisplay && !receipt}
                candidate={{
                  changeCount: sourceUpdateEnvelope.changes.length,
                  userCorrectionCount: Object.keys(
                    state.personalPlanOverlays?.[flow.ref]?.items ?? {},
                  ).length,
                  sourceLabel: 'PoC 로컬 검증 후보',
                  detectedAtLabel: '운영 원문과 동기화하지 않음',
                }}
                changes={sourceUpdateChanges}
                resolutions={sourceUpdateResolutions}
                selectedChangeId={sourceUpdateSelectedChangeId}
                status={effectiveSourceUpdateStatus}
                open={sourceUpdateOpen}
                errorMessage={sourceUpdateError}
                onOpen={() => openSourceUpdateReview()}
                onDefer={() => deferSourceUpdateReview()}
                onSelectChange={setSourceUpdateSelectedChangeId}
                onResolve={resolveSourceUpdateChange}
                onApply={() => void applySourceUpdate()}
                onRetry={() => void applySourceUpdate()}
                onRefreshCandidate={() => { startSourcePractice(true); }}
                onUndo={() => void undoSourceUpdate(sourceUpdateEnvelope.candidateId)}
              />
            </div>
          ) : null}
        <MyPlanExecutionSurface<PersonalWorkspacePocTask>
          model={{
            flowSlug: flow.ref,
            flowTitle: displayTitle,
            progressLabel: `${completedCount}/${flowTasks.length} 완료 · ${getPersonalWorkspacePocFolderPath(state, flowFolder(flow))}`,
            composition,
            todos,
            nextItemId: flowTasks.find((task) => !task.completed)?.ref,
            transferOpen: false,
            transferItemCount: flowTasks.length,
            activeItemOpen: !itemUsesSheet && Boolean(activeTask),
            editAvailable: true,
            transferAvailable: false,
            headingLevel: 2,
            headingId: 'personal-workspace-flow-detail-heading',
            headingTabIndex: -1,
          }}
          actions={{
            getItemHref: (todo) => `#poc-item-${encodeURIComponent(todo.id)}`,
            onOpenItem: (todo) => setActiveItemRef(todo.id),
            onToggleItem: (todo) => {
              const task = todo.data;
              if (task) void commitTransition({ type: 'complete', itemRef: task.ref, completed: !task.completed, now: new Date().toISOString() });
            },
            onBackToLibrary: closeFlowDetail,
            onEditPlan: () => {
              beginPlanEditor(flow.ref, '[data-testid="my-plan-edit"]');
            },
            onToggleTransfer: () => undefined,
            onCloseTransfer: () => undefined,
          }}
          renderers={{
            renderAfterItem: (itemId) => visibleOrigin?.flowRef === flow.ref && visibleOrigin.ref === itemId
              && (!visibleOrigin.itemDetailRef || !activeTask) ? renderContextualResult() : null,
            renderManagementMenu: () => (
              <div className="min-w-0">
              <button
                type="button"
                data-personal-workspace-move-trigger={getPersonalWorkspacePocMoveTriggerToken(flow.ref, 'flow-detail')}
                className={SECONDARY_CLASS}
                onClick={() => openFlowMove(flow, 'flow-detail')}
              >폴더 이동</button>
              {visibleOrigin?.flowRef === flow.ref && visibleOrigin.kind === 'flow' ? renderContextualResult() : null}
              </div>
            ),
            renderTransferPanel: () => null,
            renderItemDetail: renderDetail,
          }}
        />
        {result.ok ? (
          <details data-testid="personal-workspace-alternate-results" className="mt-6 border-t border-[var(--flowme-border)] pt-3">
            <summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">다른 방식으로 보기</summary>
            <div className="pt-2">
              <PersonalWorkspacePocResultPresenter
              projection={result.projection}
              navigation={resultNavigation}
              headingId="personal-workspace-flow-result-heading"
              onResultViewChange={(resultView) => setResultNavigation((current) => ({
                ...current,
                resultView,
                openItemRef: null,
              }))}
              onCalendarBaseDateChange={(baseDate) => setResultNavigation((current) => ({
                ...current,
                baseDate,
                selectedDate: baseDate,
                openItemRef: null,
              }))}
              onCalendarSelectedDateChange={(selectedDate) => setResultNavigation((current) => ({
                ...current,
                selectedDate,
                openItemRef: null,
              }))}
              onMoveOccurrenceDate={(item, date) => {
                if (!item.occurrenceId || !item.sourceItemRef || !item.originalOccurrenceDate) return;
                void commitTransition({
                  type: 'move-occurrence-date',
                  occurrenceId: item.occurrenceId,
                  sourceItemRef: item.sourceItemRef,
                  originalDate: item.originalOccurrenceDate,
                  ...(date ? { date } : {}),
                  now: new Date().toISOString(),
                });
              }}
              onRestoreOccurrenceDate={(item) => {
                if (!item.occurrenceId || !item.sourceItemRef || !item.originalOccurrenceDate) return;
                void commitTransition({
                  type: 'restore-occurrence-date',
                  occurrenceId: item.occurrenceId,
                  sourceItemRef: item.sourceItemRef,
                  originalDate: item.originalOccurrenceDate,
                  now: new Date().toISOString(),
                });
              }}
              onToggleOccurrence={(item) => {
                if (!item.occurrenceId || !item.sourceItemRef || !item.originalOccurrenceDate) return;
                void commitTransition({
                  type: 'complete-occurrence',
                  occurrenceId: item.occurrenceId,
                  sourceItemRef: item.sourceItemRef,
                  originalDate: item.originalOccurrenceDate,
                  completed: !item.completed,
                  now: new Date().toISOString(),
                });
              }}
              onOpenItem={(intent) => {
                setResultNavigation((current) => ({
                  ...current,
                  resultView: intent.resultView,
                  ...(intent.selectedDate ? { selectedDate: intent.selectedDate } : {}),
                  openItemRef: intent.itemRef,
                }));
                beginWorkspacePlanItemEditor(
                  intent.flowRef,
                  intent.itemRef,
                  intent.returnFocusSelector,
                );
              }}
              />
            </div>
          </details>
        ) : (
          <p
            data-testid="personal-workspace-result-failure"
            role="alert"
            className="mt-6 border-l-2 border-rose-600 bg-rose-50 px-3 py-2 text-sm text-rose-900"
          >
            이 Flow의 다른 보기를 열 수 없어요. 할 일 목록은 그대로 사용할 수 있습니다.
          </p>
        )}
        {authoring && authoredRawText !== undefined ? (
          <details data-testid="personal-workspace-authored-source" className="mt-4 rounded-md border border-[var(--flowme-border)] bg-white p-4">
            <summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">
              {quickConversion ? '빠른 할 일 전환 기록 보기' : '작성 원문 보기'}
            </summary>
            <p className="mt-2 text-xs text-[var(--flowme-text-secondary)]">
              {quickConversion
                ? '전환할 때의 제목을 보관합니다. 원래 빠른 할 일은 그대로 남고, 이후 두 항목은 서로 독립적으로 바꿀 수 있습니다.'
                : effectiveSourceVersion
                  ? '비교 후 적용한 새 원문입니다. 개인 날짜와 완료 기록은 이 원문과 별도로 보관합니다.'
                  : '저장할 때 확인한 원문을 그대로 보관하고 있습니다.'}
            </p>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[var(--flowme-surface-subtle)] p-3 text-sm leading-6 text-[var(--flowme-text)]">{authoredRawText}</pre>
            {!quickConversion ? (
              <a href="/flows/new?personalWorkspacePoc=v1" className={`${SECONDARY_CLASS} mt-3 inline-flex items-center`}>새 Flow 만들기</a>
            ) : null}
          </details>
        ) : null}
        {itemUsesSheet && activeTask ? (
          <FlowBottomSheet
            testId="personal-workspace-item-sheet"
            headingId="personal-workspace-item-sheet-title"
            eyebrow={displayTitle}
            title={activeTask.title}
            closeLabel="목록으로"
            closeTestId="personal-workspace-item-sheet-close"
            initialFocusSelector="#poc-flow-item-detail"
            returnFocusSelector={`[data-todo-detail-link="${activeTask.ref}"]`}
            dialogProps={{ style: PERSONAL_WORKSPACE_POC_BOTTOM_SHEET_SAFE_STYLE }}
            onClose={() => setActiveItemRef(undefined)}
          >
            <div className="mt-4">{renderDetail(true)}</div>
          </FlowBottomSheet>
        ) : null}
      </div>
    );
  };

  const receiptOwnsTransactionStatus = Boolean(
    (receipt && status.receiptStatus === receipt.status) || (planDisplay && status.receiptStatus === planDisplay.status),
  );
  const contextualOwnsTransactionStatus = Boolean(visibleContextualResult && status.kind === 'success');
  const resultOwnsTransactionStatus = receiptOwnsTransactionStatus || contextualOwnsTransactionStatus;
  const editorOwnsFailureAlert = Boolean(
    (receipt?.status === 'failure' || planDisplay?.status === 'failure')
      && (planEditor.active?.failure || quickEditor.active?.failure),
  );

  // A failed source join is not an empty successful workspace. No controls or
  // partial task model are exposed while returning through the existing gate.
  if (!sourceReadValid) {
    return <main data-testid="personal-workspace-source-read-fail-closed" aria-busy="true" className="p-6">
      <p>원문을 안전하게 확인할 수 없어 기존 내 계획으로 돌아갑니다.</p>
    </main>;
  }

  return (
    <PersonalWorkspacePocProductShell
      mainId="personal-workspace-poc-main"
      mainTestId="personal-workspace-poc-shell"
      storagePrefix="flow:poc:personal-workspace:v1:"
      flowEditorScrollKey="personal-workspace-main"
      variant="workspace"
      href="#personal-workspace-view-heading"
      skipLabel="개인공간 본문으로 건너뛰기"
      onSkip={() => focusAfterRender('#personal-workspace-view-heading')}
    >
      <style>{`
        [data-testid="personal-workspace-poc-shell"] {
          --personal-workspace-safe-top: env(safe-area-inset-top, 0px);
          --personal-workspace-safe-right: env(safe-area-inset-right, 0px);
          --personal-workspace-safe-bottom: env(safe-area-inset-bottom, 0px);
          --personal-workspace-safe-left: env(safe-area-inset-left, 0px);
          padding-right: max(1rem, var(--personal-workspace-safe-right));
          padding-left: max(1rem, var(--personal-workspace-safe-left));
        }
        @media (max-width: 900px) {
          [data-testid="personal-workspace-poc-shell"] input:not([type="checkbox"]):not([type="radio"]),
          [data-testid="personal-workspace-poc-shell"] textarea,
          [data-testid="personal-workspace-poc-shell"] select {
            font-size: 16px !important;
          }
        }
        [data-testid="personal-workspace-contextual-result"] {
          scroll-margin-top: calc(var(--personal-workspace-visual-viewport-top, 0px) + 1rem);
          scroll-margin-bottom: calc(var(--personal-workspace-visual-viewport-bottom, 0px) + 1rem);
        }
        @media (max-width: 639px) {
          [data-testid="personal-workspace-contextual-result"] {
            scroll-margin-bottom: calc(var(--flowme-mobile-tab-clearance) + var(--personal-workspace-visual-viewport-bottom, 0px));
          }
        }
        @media (orientation: landscape) and (max-height: 500px) and (max-width: 1023px) {
          [data-testid="personal-workspace-poc-shell"] {
            padding-top: max(.25rem, var(--personal-workspace-safe-top)) !important;
          }
          [data-testid="personal-workspace-poc-shell"] > header {
            margin-top: .25rem !important;
            align-items: center;
            padding-bottom: .25rem !important;
          }
          [data-testid="personal-workspace-poc-shell"] > header h1 {
            font-size: 1rem;
            line-height: 1.5rem;
          }
          [data-testid="personal-workspace-transaction-status"] {
            margin: .25rem 0 !important;
            overflow: hidden;
            padding: .25rem .75rem !important;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          [data-testid="personal-workspace-poc-shell"] nav[aria-label="개인공간 보기"] {
            margin-bottom: .25rem !important;
            scrollbar-width: thin;
          }
          [data-testid="personal-workspace-poc-shell"] [data-testid$="-surface"] { gap: .5rem !important; }
          [data-testid="personal-workspace-poc-shell"] [data-testid$="-surface"] > div:first-child {
            padding-bottom: .25rem !important;
          }
          [data-testid="personal-workspace-poc-shell"] #personal-workspace-view-heading { font-size: 1.25rem; }
          [data-testid="personal-workspace-task-group"] > div:first-child { padding-bottom: .25rem !important; }
        }
      `}</style>
      <p id="personal-workspace-move-handle-instructions" className="sr-only">
        항목 오른쪽 재정렬 통로의 전용 손잡이를 짧게 누르거나 350밀리초 동안 길게 누르면 이동할 곳을 엽니다. 날짜와 폴더는 화면 왼쪽의 이동 패널에서 선택하고, 같은 목록의 순서는 오른쪽 전용 손잡이에서 위쪽 또는 아래쪽 화살표 키로 바꿉니다. 길게 누르기 시작 전에 손가락이 8픽셀 이상 움직이거나, 이동 중 목록 밖에 놓거나, 포인터 동작이 취소되거나, Escape 키를 누르거나 이동 창을 닫으면 변경 없이 취소됩니다.
      </p>
      <p id="personal-workspace-flow-move-handle-instructions" className="sr-only">
        Flow 이동 손잡이를 짧게 누르거나 350밀리초 동안 길게 누르면 이동할 곳을 엽니다. 화면 왼쪽 이동 패널에서 정리 폴더를 선택할 수 있습니다. Flow 전체의 폴더만 바뀌며 원본 일정과 안의 할 일 실행 위치는 그대로 유지됩니다. 길게 누르기 시작 전에 손가락이 8픽셀 이상 움직이거나, 이동 중 대상 밖에 놓거나, 포인터 동작이 취소되거나, Escape 키를 누르거나 이동 창을 닫으면 변경 없이 취소됩니다.
      </p>
      <header className="mt-3 flex flex-nowrap items-center justify-between gap-2 border-b border-[var(--flowme-border)] pb-4 sm:items-end sm:gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-[-0.02em] text-[var(--flowme-text)] sm:text-3xl">개인공간</h1>
        </div>
        <div className="flex shrink-0 gap-1 sm:flex-wrap sm:gap-2">
          <a data-testid="personal-workspace-create-flow" href="/flows/new?personalWorkspacePoc=v1" className={`${SECONDARY_CLASS} inline-flex items-center`}><span className="sm:hidden">새 Flow</span><span className="hidden sm:inline">새 Flow 만들기</span></a>
          <button
            type="button"
            data-testid="personal-workspace-undo"
            disabled={!state.undo || pending.current || Boolean(planEditor.active) || Boolean(quickEditor.active)}
            className={`${SECONDARY_CLASS} hidden disabled:cursor-not-allowed disabled:opacity-40 sm:inline-flex`}
            onClick={() => {
              if (planResultOwner.current?.display.status === 'success') { void undoPlanDisplay(); return; }
              if (receipt?.status === 'success' && state.revision === receipt.stateRevisionAfter) {
                void undoReceiptChange();
                return;
              }
              if (contextualSelection.canUndo && visibleContextualResult) {
                void undoContextualResult(visibleContextualResult.ownerId);
                return;
              }
              void commitTransition({ type: 'undo', now: new Date().toISOString() });
            }}
          >되돌리기</button>
          <details className="relative">
            <summary data-testid="personal-workspace-poc-manage" className={`${SECONDARY_CLASS} flex cursor-pointer items-center`}>설정</summary>
            <div className="absolute right-0 z-30 mt-2 w-64 rounded-md border border-[var(--flowme-border)] bg-white p-3 shadow-lg">
              <p className="text-xs leading-5 text-[var(--flowme-text-secondary)]">이 화면에서 만든 내용은 이 기기에만 저장됩니다.</p>
              <details data-testid="personal-workspace-source-practice-guide" className="mt-3 border-t border-[var(--flowme-border)] pt-2">
                <summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold">사용 안내</summary>
                <p className="text-xs leading-5">현재 원문과 로컬 예시를 비교하는 연습입니다. 서버 원문을 가져오거나 자동으로 갱신하지 않습니다. 적용 전 선택은 이 실행 중에만 유지됩니다.</p>
                {!sourcePracticeRead ? <p className="mt-2 text-xs leading-5">작성해 저장한 Flow를 먼저 열어 주세요. 빠른 할 일에서 만든 Flow는 이 연습 대상이 아닙니다.</p> : null}
                {sourceUpdateError ? <p className="mt-2 text-xs leading-5">{sourceUpdateError}</p> : null}
                <button type="button" data-testid="personal-workspace-source-practice-start"
                  disabled={!sourcePracticeRead || pending.current || sourcePracticeRecovery.current || Boolean(planEditor.active) || Boolean(quickEditor.active)}
                  className={`${SECONDARY_CLASS} mt-2 w-full`}
                  onClick={event => {
                    if (!startSourcePractice()) return;
                    const guide = event.currentTarget.closest('details');
                    const settings = guide?.parentElement?.closest('details');
                    if (guide) guide.open = false;
                    if (settings) settings.open = false;
                  }}>로컬 비교 연습 시작</button>
              </details>
              <button
                type="button"
                data-testid="personal-workspace-undo-mobile"
                disabled={!state.undo || pending.current || Boolean(planEditor.active) || Boolean(quickEditor.active)}
                className={`${SECONDARY_CLASS} mt-3 w-full disabled:cursor-not-allowed disabled:opacity-40 sm:hidden`}
                onClick={() => {
                  if (planResultOwner.current?.display.status === 'success') { void undoPlanDisplay(); return; }
                  if (receipt?.status === 'success' && state.revision === receipt.stateRevisionAfter) {
                    void undoReceiptChange();
                    return;
                  }
                  if (contextualSelection.canUndo && visibleContextualResult) {
                    void undoContextualResult(visibleContextualResult.ownerId);
                    return;
                  }
                  void commitTransition({ type: 'undo', now: new Date().toISOString() });
                }}
              >되돌리기</button>
              <button
                type="button"
                data-testid="personal-workspace-reset-open"
                className={`${SECONDARY_CLASS} mt-3 w-full`}
                onClick={() => {
                  setResetConfirmOpen(true);
                  setStatus({ kind: 'ready', message: '초기화할 내용을 확인해 주세요.' });
                }}
              >이 기기 기록 초기화</button>
            </div>
          </details>
        </div>
      </header>

      <div
        ref={transactionStatusRef}
        data-testid="personal-workspace-transaction-status"
        data-native-status-box={nativeStatusBox ? 'preserved' : undefined}
        inert={nativeStatusBox ? true : undefined}
        style={nativeStatusBox}
        role={nativeStatusBox || resultOwnsTransactionStatus ? undefined : status.kind === 'failure' ? 'alert' : 'status'}
        aria-live={nativeStatusBox || resultOwnsTransactionStatus ? 'off' : status.kind === 'failure' ? 'assertive' : 'polite'}
        aria-hidden={nativeStatusBox || resultOwnsTransactionStatus ? true : undefined}
        data-status={status.kind}
        className={status.kind === 'ready' || resultOwnsTransactionStatus ? 'sr-only' : `my-3 border-l-2 px-3 py-2 text-sm font-semibold ${
          status.kind === 'failure'
            ? 'border-rose-600 bg-rose-50 text-rose-800'
            : status.kind === 'saving'
              ? 'border-amber-500 bg-amber-50 text-amber-900'
              : status.kind === 'success'
                ? 'border-[var(--flowme-positive)] bg-emerald-50 text-emerald-900'
                : 'border-slate-300 bg-slate-50 text-slate-700'
        }`}
      >{status.message}</div>

      {planDisplay && !planEditor.active && !quickEditor.active && !planOverlayRef.current ? (
        <PersonalWorkspacePocPlanResultSurface
          key={planDisplay.receiptId}
          display={planDisplay}
          announce={!editorOwnsFailureAlert}
          onUndo={planDisplay.status === 'success' && Boolean(state.undo) && !pending.current
            && state.revision === planDisplay.stateRevisionAfter ? () => void undoPlanDisplay() : undefined}
          onDismiss={dismissPlanResult}
        />
      ) : null}
      {receipt ? (
        <PersonalWorkspacePocReceiptSurface
          receipt={receipt}
          announce={!editorOwnsFailureAlert}
          onRetry={receipt.status === 'failure' && receipt.rollback !== 'recovery-required'
            ? receipt.operation === 'commit-quick-item-root'
              ? retryQuickEditorCommit
              : receipt.operation === 'convert-quick-item-to-flow'
                ? retryQuickItemConversion
                : retryPlanEditorCommit
            : undefined}
          onUndo={receipt.status === 'success'
            && Boolean(state.undo)
            && state.revision === receipt.stateRevisionAfter
            ? () => void undoReceiptChange()
            : undefined}
        />
      ) : null}

      <nav aria-label="개인공간 보기" className="mb-4 flex max-w-full overflow-x-auto border-b border-[var(--flowme-workspace-line)] min-[1280px]:hidden">
        {([
          ['folder', '폴더'], ['today', '오늘'], ['week', '주간'], ['month', '월간'], ['undated', '날짜 미정'], ['trash', `휴지통 ${trashRows.length}`],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" aria-label={`개인공간 모바일 보기: ${label}`} aria-current={section === id ? 'page' : undefined} className={`min-h-12 shrink-0 border-b-2 px-3 text-sm font-semibold ${section === id ? 'border-[var(--flowme-workspace-accent)] text-[var(--flowme-workspace-accent-strong)]' : 'border-transparent text-[var(--flowme-text-secondary)]'}`} onClick={() => selectSection(id)}>{label}</button>
        ))}
      </nav>
      {section === 'folder' ? (
        <nav aria-label="모바일 폴더" className="mb-4 flex max-w-full overflow-x-auto border-b border-[var(--flowme-workspace-line)] min-[1280px]:hidden">
          <button type="button" aria-label="폴더 탐색: 미분류" aria-current={!activeFolderId ? 'page' : undefined} className={`min-h-12 shrink-0 border-b-2 px-3 text-sm font-semibold ${!activeFolderId ? 'border-[var(--flowme-workspace-accent)] text-[var(--flowme-workspace-accent-strong)]' : 'border-transparent text-[var(--flowme-text-secondary)]'}`} onClick={() => selectSection('folder')}>미분류</button>
          {sortedFolders.map((folder) => (
            <button key={folder.folderId} type="button" aria-label={`폴더 탐색: ${getPersonalWorkspacePocFolderPath(state, folder.folderId)}`} aria-current={activeFolderId === folder.folderId ? 'page' : undefined} className={`min-h-12 shrink-0 border-b-2 px-3 text-sm font-semibold ${activeFolderId === folder.folderId ? 'border-[var(--flowme-workspace-accent)] text-[var(--flowme-workspace-accent-strong)]' : 'border-transparent text-[var(--flowme-text-secondary)]'}`} onClick={() => selectSection('folder', folder.folderId)}>{getPersonalWorkspacePocFolderPath(state, folder.folderId)}</button>
          ))}
        </nav>
      ) : null}

      <div data-testid="personal-workspace-shell-layout" className="grid min-w-0 gap-5 lg:grid-cols-[240px_minmax(0,920px)] min-[1280px]:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden min-w-0 bg-[var(--flowme-workspace-rail)] p-3 min-[1280px]:block" aria-label="개인공간 탐색">
          <div className="grid gap-1">
            {([
              ['today', '오늘'], ['week', '주간'], ['month', '월간'], ['undated', '날짜 미정'], ['trash', `휴지통 ${trashRows.length}`],
            ] as const).map(([id, label]) => <button key={id} type="button" aria-current={section === id ? 'page' : undefined} className={`min-h-12 rounded-md px-3 text-left text-sm font-semibold ${section === id ? 'bg-[var(--flowme-workspace-accent-soft)] text-[var(--flowme-workspace-accent-strong)]' : 'text-[var(--flowme-text)] hover:bg-white'}`} onClick={() => selectSection(id)}>{label}</button>)}
          </div>
          <div className="mt-4 border-t border-[var(--flowme-border)] pt-3">
            <p className="px-3 text-xs font-semibold text-[var(--flowme-text-tertiary)]">폴더</p>
            <button type="button" aria-current={section === 'folder' && !activeFolderId ? 'page' : undefined} className={`mt-1 min-h-12 w-full rounded-md px-3 text-left text-sm font-semibold ${section === 'folder' && !activeFolderId ? 'bg-[var(--flowme-workspace-accent-soft)] text-[var(--flowme-workspace-accent-strong)]' : ''}`} onClick={() => selectSection('folder')}>미분류</button>
            {rootFolders.map((folder) => (
              <div key={folder.folderId}>
                <button type="button" aria-current={section === 'folder' && activeFolderId === folder.folderId ? 'page' : undefined} className={`min-h-12 w-full rounded-md px-3 text-left text-sm font-semibold ${section === 'folder' && activeFolderId === folder.folderId ? 'bg-[var(--flowme-workspace-accent-soft)] text-[var(--flowme-workspace-accent-strong)]' : ''}`} onClick={() => selectSection('folder', folder.folderId)}>{folder.title}</button>
                {sortedFolders.filter((child) => child.parentFolderId === folder.folderId).map((child) => <button key={child.folderId} type="button" aria-current={section === 'folder' && activeFolderId === child.folderId ? 'page' : undefined} className={`min-h-12 w-full rounded-md pl-7 pr-3 text-left text-sm ${section === 'folder' && activeFolderId === child.folderId ? 'bg-[var(--flowme-workspace-accent-soft)] font-semibold text-[var(--flowme-workspace-accent-strong)]' : ''}`} onClick={() => selectSection('folder', child.folderId)}>↳ {child.title}</button>)}
              </div>
            ))}
          </div>
        </aside>

        <section className="min-w-0" aria-label={sectionTitle}>
          {selectedFlow
            ? renderFlowDetail(selectedFlow)
            : section === 'folder'
              ? renderFolderSurface()
              : section === 'trash'
                ? renderTrashSurface()
                : renderTimelineSurface()}
        </section>
      </div>

      {renderMovePanel()}
      {trashDeleteTarget ? (
        <FlowBottomSheet
          testId="personal-workspace-trash-delete-confirm"
          headingId="personal-workspace-trash-delete-confirm-title"
          eyebrow="휴지통"
          title={`“${trashDeleteTarget.title}”을 이 기기에서 영구 삭제할까요?`}
          closeLabel="닫기"
          closeTestId="personal-workspace-trash-delete-confirm-close"
          initialFocusSelector="[data-testid='personal-workspace-trash-delete-cancel']"
          returnFocusSelector="[data-testid='personal-workspace-trash-delete']"
          dialogProps={{ style: PERSONAL_WORKSPACE_POC_BOTTOM_SHEET_SAFE_STYLE }}
          onClose={() => {
            if (pending.current) return;
            setTrashDeleteTarget(undefined);
            setStatus({ kind: 'canceled', message: '영구 삭제를 취소했어요.' });
          }}
        >
          <p className="mt-4 text-sm leading-6 text-[var(--flowme-text-secondary)]">
            복원할 수 없습니다. {trashDeleteTarget.entry.member === 'saved_flow'
              ? '가져온 원본과 운영 데이터는 삭제하지 않으며, 이 개인공간의 변경과 실행 기록만 지웁니다.'
              : '빠른 할 일의 내용과 실행 기록을 PoC 전용 저장소에서 지웁니다.'}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="personal-workspace-trash-delete-cancel"
              disabled={pending.current}
              className={`${SECONDARY_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
              onClick={() => {
                if (pending.current) return;
                setTrashDeleteTarget(undefined);
                setStatus({ kind: 'canceled', message: '영구 삭제를 취소했어요.' });
              }}
            >취소</button>
            <button
              type="button"
              data-testid="personal-workspace-trash-delete-confirm-action"
              disabled={pending.current}
              className="min-h-12 rounded-md bg-rose-700 px-3 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={async () => {
                const target = trashDeleteTarget;
                const outcome = await commitTransition({
                  type: 'permanently-delete-from-trash',
                  member: target.entry.member,
                  memberRef: target.entry.memberRef,
                  ...(target.entry.member === 'saved_flow'
                    ? { itemRefs: [...target.itemRefs] }
                    : {}),
                  now: new Date().toISOString(),
                });
                if (outcome === 'changed') setTrashDeleteTarget(undefined);
              }}
            >이 기기에서 영구 삭제</button>
          </div>
        </FlowBottomSheet>
      ) : null}
      {resetConfirmOpen ? (
        <FlowBottomSheet
          testId="personal-workspace-reset-confirm"
          headingId="personal-workspace-reset-confirm-title"
          eyebrow="개인공간 설정"
          title="이 기기의 개인공간을 초기화할까요?"
          closeLabel="닫기"
          closeTestId="personal-workspace-reset-confirm-close"
          initialFocusSelector="[data-testid='personal-workspace-reset-cancel']"
          returnFocusSelector="[data-testid='personal-workspace-poc-manage']"
          dialogProps={{ style: PERSONAL_WORKSPACE_POC_BOTTOM_SHEET_SAFE_STYLE }}
          onClose={() => {
            if (pending.current) return;
            setResetConfirmOpen(false);
            setStatus({ kind: 'canceled', message: '개인공간 초기화를 취소했어요.' });
          }}
        >
          <p className="mt-4 text-sm leading-6 text-[var(--flowme-text-secondary)]">
            이 화면에서 만든 폴더, Flow, 작성 중 원문, 빠른 할 일, 실행 위치와 완료 기록을 이 기기에서 지웁니다. 가져온 원본 Flow는 지우지 않습니다.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="personal-workspace-reset-cancel"
              disabled={pending.current}
              className={`${SECONDARY_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
              onClick={() => {
                if (pending.current) return;
                setResetConfirmOpen(false);
                setStatus({ kind: 'canceled', message: '개인공간 초기화를 취소했어요.' });
              }}
            >취소</button>
            <button
              type="button"
              data-testid="personal-workspace-reset-confirm-action"
              disabled={pending.current}
              className="min-h-12 rounded-md bg-rose-700 px-3 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                void resetWorkspace();
              }}
            >이 기기 기록 지우기</button>
          </div>
        </FlowBottomSheet>
      ) : null}
      {renderActiveEditor()}
    </PersonalWorkspacePocProductShell>
  );
}

type WorkspaceTaskRowProps = Readonly<{
  task: PersonalWorkspacePocTask;
  group?: PersonalWorkspacePocTaskGroup;
  corridorActive: boolean;
  sourceActive: boolean;
  reorderPreviewPosition?: PersonalWorkspacePocReorderPosition;
  folderPath: string;
  onComplete: () => void;
  onOpen: () => void;
  onOpenMove: (source: Extract<MoveTriggerSource, 'task-handle' | 'task-more'>) => void;
  onActivatePointerMove: (point: Readonly<{ clientX: number; clientY: number }>) => void;
  onPointerSessionMove: (point: Readonly<{ clientX: number; clientY: number }>) => void;
  onPointerSessionEnd: (result: Readonly<{ clientX: number; clientY: number; moved: boolean }>) => void;
  onCancel: (message: string) => void;
  onReorder: (control: PersonalWorkspacePocReorderControl) => void;
  onCorridorDragOver: (event: DragEvent<HTMLElement>) => void;
  onCorridorDrop: (event: DragEvent<HTMLElement>) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
}>;

type WorkspaceMoveHandlePointerSession = {
  pointerId: number;
  phase: 'armed' | 'active';
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  moved: boolean;
  handle: HTMLButtonElement;
};

type WorkspaceMoveHandleProps = Readonly<{
  testId: 'personal-workspace-move-handle' | 'personal-workspace-flow-move-handle';
  triggerToken: string;
  ariaLabel: string;
  describedBy: string;
  expanded: boolean;
  onOpen: () => void;
  onActivatePointerMove: (point: Readonly<{ clientX: number; clientY: number }>) => void;
  onPointerSessionMove: (point: Readonly<{ clientX: number; clientY: number }>) => void;
  onPointerSessionEnd: (result: Readonly<{ clientX: number; clientY: number; moved: boolean }>) => void;
  onCancel: (message: string) => void;
  onReorder?: (control: PersonalWorkspacePocReorderControl) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
}>;

function WorkspaceMoveHandle({
  testId,
  triggerToken,
  ariaLabel,
  describedBy,
  expanded,
  onOpen,
  onActivatePointerMove,
  onPointerSessionMove,
  onPointerSessionEnd,
  onCancel,
  onReorder,
  onDragStart,
  onDragEnd,
}: WorkspaceMoveHandleProps) {
  const pressTimer = useRef<number | undefined>(undefined);
  const pointerSession = useRef<WorkspaceMoveHandlePointerSession | undefined>(undefined);
  const suppressClickUntil = useRef(0);
  const nativeDragStarted = useRef(false);

  const clearPressTimer = () => {
    if (pressTimer.current !== undefined) window.clearTimeout(pressTimer.current);
    pressTimer.current = undefined;
  };

  const clearPointerSession = () => {
    clearPressTimer();
    const session = pointerSession.current;
    if (session?.handle.hasPointerCapture?.(session.pointerId)) {
      try {
        session.handle.releasePointerCapture(session.pointerId);
      } catch {
        // The browser may have already released capture during cancellation.
      }
    }
    pointerSession.current = undefined;
  };

  const suppressSyntheticClick = () => {
    suppressClickUntil.current = Date.now() + 700;
  };

  useEffect(() => {
    const viewport = window.visualViewport;
    const cancelPendingPress = () => {
      if (!pointerSession.current && pressTimer.current === undefined) return;
      suppressSyntheticClick();
      clearPointerSession();
    };
    const cancelPendingPressWhenHidden = () => {
      if (document.hidden) cancelPendingPress();
    };
    window.addEventListener('blur', cancelPendingPress);
    window.addEventListener('resize', cancelPendingPress);
    viewport?.addEventListener('resize', cancelPendingPress);
    document.addEventListener('visibilitychange', cancelPendingPressWhenHidden);
    return () => {
      window.removeEventListener('blur', cancelPendingPress);
      window.removeEventListener('resize', cancelPendingPress);
      viewport?.removeEventListener('resize', cancelPendingPress);
      document.removeEventListener('visibilitychange', cancelPendingPressWhenHidden);
      clearPointerSession();
    };
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    if (pointerSession.current && pointerSession.current.pointerId !== event.pointerId) {
      suppressSyntheticClick();
      clearPointerSession();
      return;
    }
    clearPointerSession();
    pointerSession.current = {
      pointerId: event.pointerId,
      phase: 'armed',
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
      handle: event.currentTarget,
    };
    pressTimer.current = window.setTimeout(() => {
      const session = pointerSession.current;
      if (!session || session.phase !== 'armed') return;
      clearPressTimer();
      session.phase = 'active';
      suppressSyntheticClick();
      try {
        session.handle.setPointerCapture?.(session.pointerId);
      } catch {
        // Synthetic browser scenarios cannot always establish capture; keep the
        // same state machine so the non-drag menu path remains testable.
      }
      onActivatePointerMove({ clientX: session.lastX, clientY: session.lastY });
    }, 350);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = pointerSession.current;
    if (!session || event.pointerId !== session.pointerId) return;
    session.lastX = event.clientX;
    session.lastY = event.clientY;
    const distance = Math.hypot(
      event.clientX - session.startX,
      event.clientY - session.startY,
    );
    if (session.phase === 'armed' && distance >= 8) {
      suppressSyntheticClick();
      clearPointerSession();
      return;
    }
    if (session.phase !== 'active') return;
    event.preventDefault();
    if (distance < 8) return;
    session.moved = true;
    onPointerSessionMove({ clientX: event.clientX, clientY: event.clientY });
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = pointerSession.current;
    if (!session || event.pointerId !== session.pointerId) return;
    suppressSyntheticClick();
    const result = {
      clientX: event.clientX,
      clientY: event.clientY,
      moved: session.moved,
    };
    const phase = session.phase;
    clearPointerSession();
    if (phase === 'armed') onOpen();
    else onPointerSessionEnd(result);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    } else if (onReorder && (
      event.key === 'ArrowUp'
      || event.key === 'ArrowDown'
      || event.key === 'Home'
      || event.key === 'End'
    )) {
      event.preventDefault();
      onReorder(
        event.key === 'ArrowUp'
          ? 'previous'
          : event.key === 'ArrowDown'
            ? 'next'
            : event.key === 'Home'
              ? 'top'
              : 'bottom',
      );
    } else if (event.key === 'Escape') {
      event.preventDefault();
      clearPointerSession();
      onCancel('이동을 취소했어요.');
    }
  };

  return (
    <button
      type="button"
      draggable
      data-testid={testId}
      data-personal-workspace-move-trigger={triggerToken}
      aria-label={ariaLabel}
      aria-keyshortcuts={onReorder
        ? 'Enter Space ArrowUp ArrowDown Home End Escape'
        : 'Enter Space Escape'}
      aria-describedby={describedBy}
      aria-controls="personal-workspace-move-panel"
      aria-expanded={expanded}
      className={`flex min-h-12 min-w-12 touch-none select-none items-center justify-center rounded-md text-xl [-webkit-touch-callout:none] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] ${
        expanded ? 'bg-[var(--flowme-workspace-accent-soft)] text-[var(--flowme-workspace-accent-strong)]' : 'text-slate-600'
      }`}
      onClick={() => {
        if (Date.now() <= suppressClickUntil.current) {
          suppressClickUntil.current = 0;
          return;
        }
        suppressClickUntil.current = 0;
        onOpen();
      }}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        suppressSyntheticClick();
        clearPointerSession();
        if (!nativeDragStarted.current) onCancel('포인터 이동을 취소했어요.');
      }}
      onLostPointerCapture={() => {
        if (!pointerSession.current) return;
        suppressSyntheticClick();
        clearPointerSession();
        if (!nativeDragStarted.current) onCancel('포인터 연결이 끊겨 이동을 취소했어요.');
      }}
      onContextMenu={(event) => {
        if (!pointerSession.current && !expanded) return;
        event.preventDefault();
      }}
      onPointerLeave={() => {
        if (pointerSession.current?.phase !== 'armed') return;
        suppressSyntheticClick();
        clearPointerSession();
      }}
      onDragStart={(event) => {
        nativeDragStarted.current = true;
        clearPointerSession();
        onDragStart(event);
      }}
      onDragEnd={() => {
        nativeDragStarted.current = false;
        clearPointerSession();
        onDragEnd();
      }}
    ><span aria-hidden="true">⠿</span></button>
  );
}

function WorkspaceTaskRow({
  task,
  group,
  corridorActive,
  sourceActive,
  reorderPreviewPosition,
  folderPath,
  onComplete,
  onOpen,
  onOpenMove,
  onActivatePointerMove,
  onPointerSessionMove,
  onPointerSessionEnd,
  onCancel,
  onReorder,
  onCorridorDragOver,
  onCorridorDrop,
  onDragStart,
  onDragEnd,
}: WorkspaceTaskRowProps) {
  return (
    <article
      data-testid="personal-workspace-task-row"
      data-item-ref={task.ref}
      data-task-kind={task.kind}
      data-personal-workspace-reorder-target={corridorActive ? 'true' : undefined}
      data-personal-workspace-context={group?.context}
      data-personal-workspace-context-key={group?.contextKey}
      data-personal-workspace-reorder-position={reorderPreviewPosition}
      data-personal-workspace-move-source={sourceActive ? 'true' : undefined}
      className={`relative grid min-w-0 grid-cols-[48px_minmax(0,1fr)_48px_48px] items-center gap-1 py-2 ${
        corridorActive ? 'bg-[var(--flowme-surface-subtle)]' : ''
      } ${sourceActive ? 'opacity-60' : ''}`}
      onDragOver={corridorActive ? onCorridorDragOver : undefined}
      onDrop={corridorActive ? onCorridorDrop : undefined}
    >
      {reorderPreviewPosition ? (
        <span
          data-testid="personal-workspace-reorder-insertion-line"
          data-position={reorderPreviewPosition}
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 z-20 h-[3px] bg-[var(--flowme-workspace-accent)] ${
            reorderPreviewPosition === 'before' ? 'top-[-2px]' : 'bottom-[-2px]'
          }`}
        />
      ) : null}
      <button type="button" data-testid="personal-workspace-complete" aria-pressed={task.completed} aria-label={`${task.title} ${task.completed ? '다시 열기' : '완료'}`} className="flex min-h-12 min-w-12 items-center justify-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]" onClick={onComplete}>
        <span aria-hidden="true" className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${task.completed ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-400'}`}>{task.completed ? '✓' : ''}</span>
      </button>
      <button
        type="button"
        data-personal-workspace-task-open-trigger={encodeURIComponent(task.ref)}
        data-personal-workspace-move-trigger={getPersonalWorkspacePocMoveTriggerToken(task.ref, 'task-title')}
        className={`min-h-12 min-w-0 rounded-md px-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] ${
          corridorActive ? 'text-right' : 'text-left'
        }`}
        onClick={onOpen}
      >
        <span className={`block break-words text-sm font-semibold ${task.completed ? 'text-slate-500 line-through' : 'text-[var(--flowme-text)]'}`}>{task.title}</span>
        <span className={`${corridorActive ? 'hidden' : 'mt-0.5 block'} truncate text-xs text-[var(--flowme-text-secondary)]`}>{task.flowTitle ?? '빠른 할 일'} · {folderPath}{task.time ? ` · ${task.time}` : ''}</span>
      </button>
      <WorkspaceMoveHandle
        testId="personal-workspace-move-handle"
        triggerToken={getPersonalWorkspacePocMoveTriggerToken(task.ref, 'task-handle')}
        ariaLabel={`${task.title} 이동 옵션. Enter로 열고, 위아래 화살표 또는 Home과 End로 순서를 바꿉니다.`}
        describedBy="personal-workspace-move-handle-instructions"
        expanded={sourceActive}
        onOpen={() => onOpenMove('task-handle')}
        onActivatePointerMove={onActivatePointerMove}
        onPointerSessionMove={onPointerSessionMove}
        onPointerSessionEnd={onPointerSessionEnd}
        onCancel={onCancel}
        {...(group ? { onReorder } : {})}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
      <button
        type="button"
        aria-label={`${task.title} 더보기`}
        data-personal-workspace-move-trigger={getPersonalWorkspacePocMoveTriggerToken(task.ref, 'task-more')}
        className="min-h-12 min-w-12 rounded-md text-lg font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
        onClick={() => onOpenMove('task-more')}
      >…</button>
    </article>
  );
}
