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
import { composePersonalWorkspacePocReadModel } from '@/lib/flow/personal-workspace-poc-composition';
import {
  PERSONAL_WORKSPACE_POC_DEFAULTS,
  PERSONAL_WORKSPACE_POC_STATE_KEY,
  toPersonalWorkspacePocQuickItemRef,
  type PersonalWorkspacePocFlow,
  type PersonalWorkspacePocReadModel,
  type PersonalWorkspacePocState,
  type PersonalWorkspacePocTrashEntry,
  type PersonalWorkspacePocTransition,
} from '@/lib/flow/personal-workspace-poc-contract';
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
import { resolvePlanExecutionWorkspaceComposition } from '@/lib/flow/responsive-execution-workspace';

import { PlatformNav } from '../PlatformNav';
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

type PersonalWorkspacePocSurfaceProps = Readonly<{
  initialModel: PersonalWorkspacePocReadModel;
  initialState: PersonalWorkspacePocState;
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

type PersonalWorkspacePocQuickEditorBaseline = Readonly<{
  draft: PersonalWorkspacePocQuickItemRootDraft;
  stateRevision: number;
  stateRaw: string | null;
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
  left: 'var(--personal-workspace-safe-left)',
  right: 'var(--personal-workspace-safe-right)',
  bottom: 'var(--personal-workspace-safe-bottom)',
  maxHeight: 'calc(86dvh - var(--personal-workspace-safe-top) - var(--personal-workspace-safe-bottom))',
  paddingBottom: 'calc(1rem + var(--personal-workspace-safe-bottom))',
  scrollPaddingBottom: 'calc(1rem + var(--personal-workspace-safe-bottom))',
};

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
  const description = task.description ?? task.memo;
  if (!description && !task.sourceTimingLabel) return null;

  return (
    <>
      {description ? (
        <div data-testid="personal-workspace-item-description">
          <dt className="font-semibold text-[var(--flowme-text-secondary)]">상세</dt>
          <dd className="whitespace-pre-line break-words">{description}</dd>
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
  restored,
}: PersonalWorkspacePocSurfaceProps) {
  const [state, setState] = useState(initialState);
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
  const [showEmptyMonthDates, setShowEmptyMonthDates] = useState(false);
  const [reorderPreview, setReorderPreview] = useState<PersonalWorkspacePocReorderPreview>();
  const [moveDropFeedback, setMoveDropFeedback] = useState<PersonalWorkspacePocMoveDropFeedback>();
  const [status, setStatus] = useState<TransactionStatus>({
    kind: restored ? 'success' : 'ready',
    message: restored ? '마지막으로 저장한 개인공간을 복원했어요.' : '개인공간이 준비됐어요.',
  });
  const [receipt, setReceipt] = useState<PersonalWorkspacePocReceipt>();
  const pending = useRef(false);
  const idCounter = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const receiptSequence = useRef(0);
  const planGuard = useRef<PersonalWorkspacePocPlanTrustedOpenGuard | undefined>(undefined);
  const planSourceFlow = useRef<PersonalWorkspacePocFlow | undefined>(undefined);
  const planAttempt = useRef<PersonalWorkspacePocEditorAttempt | undefined>(undefined);
  const planStorageEvidence = useRef<PersonalWorkspacePocEditorStorageEvidence | undefined>(undefined);
  const quickEditorBaseline = useRef<PersonalWorkspacePocQuickEditorBaseline | undefined>(undefined);
  const quickEditorAttempt = useRef<PersonalWorkspacePocEditorAttempt | undefined>(undefined);
  const quickStorageEvidence = useRef<PersonalWorkspacePocEditorStorageEvidence | undefined>(undefined);
  const planReturnContext = useRef<PersonalWorkspacePocReceiptReturnContext>('period-list');
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
  const activeMoveSession = useRef<PersonalWorkspacePocActiveMoveSession | undefined>(undefined);
  const autoScrollFrame = useRef<number | undefined>(undefined);
  const autoScrollSpeed = useRef(0);
  const autoScrollTarget = useRef<HTMLElement | null>(null);
  const initialHashHandled = useRef(false);

  const nextReceiptId = (intentId: string, statusName: string) => {
    receiptSequence.current += 1;
    return `${intentId}:${statusName}:${receiptSequence.current}`;
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
    setReceipt(requirePersonalWorkspacePocReceipt({
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
    }));
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
      showSavingReceipt(attempt);
      const evidence = createPersonalWorkspacePocEditorStorageEvidence();
      planStorageEvidence.current = evidence;
      const operation = await requirePlanEditorHandlers(
        createPersonalWorkspacePocEditorEvidenceStorage(window.localStorage, evidence),
      ).preparePersonalOverlay(input);
      return instrumentPersonalWorkspacePocEditorStorageCommit(operation, evidence, {
        readTargetRaw: () => window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY),
        parseTargetRaw: (raw) => {
          const parsed = parsePersonalWorkspacePocEditorVerifiedStateRaw(raw);
          return parsed?.revision === attempt.stateRevisionBefore + 1 ? parsed : undefined;
        },
      });
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
    () => composePersonalWorkspacePocReadModel(initialModel, state),
    [initialModel, state],
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
  const resultBaseModel = useMemo<PersonalWorkspacePocReadModel>(() => ({
    version: initialModel.version,
    flows: [...initialModel.flows, ...(state.authoredFlows ?? [])],
  }), [initialModel, state.authoredFlows]);

  const tasks = useMemo(
    () => buildPersonalWorkspacePocTasks(model, state),
    [model, state],
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
    initialModel.flows.find((flow) => flow.ref === flowRef)
      ?? stateRef.current.authoredFlows?.find((flow) => flow.ref === flowRef)
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
    stateRef.current = nextState;
    setState(nextState);
    setReceipt(requirePersonalWorkspacePocReceipt({
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
    }));
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
        && Boolean(attempt?.changes.length);
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
        setReceipt(requirePersonalWorkspacePocReceipt({
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
        }));
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
        planGuard.current = undefined;
        planSourceFlow.current = undefined;
        planAttempt.current = undefined;
        planStorageEvidence.current = undefined;
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
        planEditor.requestClose('browser-back');
        return;
      }
      if (quickEditor.active) quickEditor.requestClose('browser-back');
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
    planAttempt.current = {
      intentId: `plan-intent:${planGuard.current?.guardId ?? sourceFlow.ref}:${Date.now()}`,
      operation: 'commit-personal-plan',
      scopeRef: sourceFlow.ref,
      stateRevisionBefore: stateRef.current.revision,
      affectedRefs: summary.affectedRefs,
      changes: summary.changes,
      retryDescriptor: personalWorkspacePocPlanRetryDescriptor(draft, guard),
    };
    planStorageEvidence.current = undefined;
    if (summary.changes.length === 0) {
      const attempt = planAttempt.current;
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

  const commitTransition = useCallback(async (
    transition: PersonalWorkspacePocTransition,
    storageEvidence?: PersonalWorkspacePocEditorStorageEvidence,
  ): Promise<TransitionOutcome> => {
    if (editorOwner.current || planEditor.active || quickEditor.active) {
      setStatus({
        kind: 'neutral',
        message: '열려 있는 편집을 먼저 저장하거나 닫아 주세요.',
      });
      return 'unchanged';
    }
    if (pending.current) return 'unchanged';
    const expectedState = stateRef.current;
    let expectedStateRaw: string | null;
    try {
      expectedStateRaw = window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY);
    } catch {
      setStatus({ kind: 'failure', message: '저장 상태를 읽지 못해 변경하지 않았습니다.' });
      return 'failed';
    }
    if (!isPersonalWorkspacePocEditorStateRawCurrent(expectedState, expectedStateRaw)) {
      setStatus({
        kind: 'failure',
        message: '다른 화면에서 저장 상태가 바뀌었습니다. 새로고침한 뒤 다시 시도해 주세요.',
      });
      return 'failed';
    }
    const result = applyPersonalWorkspacePocTransition(expectedState, transition);
    if (!result.changed) {
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
      setStatus({
        kind: 'failure',
        message: '변경 결과를 안전하게 저장할 수 없어 원래 상태를 유지합니다.',
      });
      return 'failed';
    }

    pending.current = true;
    setStatus({ kind: 'saving', message: '변경 내용을 저장 중…' });
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    const locked = await withFlowUserDataWriteLock(() => {
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
    if (!locked.ok) {
      setStatus({
        kind: 'failure',
        message: '다른 저장이 진행 중이라 변경하지 않았어요. 잠시 후 다시 시도해 주세요.',
      });
      return 'failed';
    }
    if (locked.value.kind === 'stale') {
      setStatus({
        kind: 'failure',
        message: '저장 직전에 다른 변경을 발견해 원래 상태를 유지했습니다. 새로고침해 주세요.',
      });
      return 'failed';
    }
    if (locked.value.kind === 'save-failed') {
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
      setStatus({
        kind: 'failure',
        message: '저장 뒤 상태를 확인하지 못했습니다. 새로고침해 실제 상태를 확인해 주세요.',
      });
      return 'failed';
    }
    if (confirmedStateRaw !== JSON.stringify(result.state)) {
      setStatus({
        kind: 'failure',
        message: '저장 직후 다른 변경을 발견했습니다. 새로고침해 최신 상태를 확인해 주세요.',
      });
      return 'failed';
    }
    stateRef.current = result.state;
    setState(result.state);
    setReceipt(undefined);
    setStatus({ kind: 'success', message: result.message });
    return 'changed';
  }, [initialModel, planEditor.active, quickEditor.active]);

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
    stateRef.current = emptyState;
    flowReturnFocusSelector.current = undefined;
    postMoveFocusSelector.current = undefined;
    planGuard.current = undefined;
    planSourceFlow.current = undefined;
    planAttempt.current = undefined;
    planStorageEvidence.current = undefined;
    quickEditorBaseline.current = undefined;
    quickEditorAttempt.current = undefined;
    quickStorageEvidence.current = undefined;
    resetMoveInteraction();
    setState(emptyState);
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
    setShowEmptyMonthDates(false);
    setReceipt(undefined);
    setResetConfirmOpen(false);
    setStatus({ kind: 'success', message: '이 기기에 저장한 개인공간 기록을 초기화했어요.' });
  };

  const cancelMove = useCallback((message = '이동을 취소했어요.') => {
    resetMoveInteraction();
    postMoveFocusSelector.current = moveReturnFocusSelector;
    setMoveTarget(undefined);
    setStatus({ kind: 'canceled', message });
  }, [moveReturnFocusSelector, resetMoveInteraction]);

  useEffect(() => {
    if (!moveTarget) return;
    const onWindowBlur = () => {
      if (!pending.current) cancelMove('창을 벗어나 이동을 취소했어요.');
    };
    const onWindowResize = () => {
      if (!pending.current) cancelMove('화면 크기가 바뀌어 이동을 취소했어요.');
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
    window.addEventListener('keydown', onEscape);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('resize', onWindowResize);
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
    stopAutoScroll();
    setReorderPreview(undefined);
    setMoveDropFeedback(undefined);
    setMoveDateDraft(task.date ?? today);
    setMoveReturnFocusSelector(returnFocusSelector);
    setStatus({ kind: 'ready', message: '이동할 위치를 선택해 주세요.' });
    setMoveTarget({ kind: 'task', task, ...(group ? { group } : {}) });
  };

  const openFlowMove = (
    flow: PersonalWorkspacePocFlow,
    source: Extract<MoveTriggerSource, 'flow-handle' | 'flow-card' | 'flow-detail'>,
  ) => {
    stopAutoScroll();
    setReorderPreview(undefined);
    setMoveDropFeedback(undefined);
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
    return commitTransition({
      type: 'reorder',
      context: group.context,
      contextKey: group.contextKey,
      currentOrderedRefKeys: current,
      orderedRefKeys: resolution.orderedRefKeys,
      now: new Date().toISOString(),
    });
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
          ? '!border-[var(--flowme-action)] !bg-[var(--flowme-action-soft)] !text-[var(--flowme-action)] ring-2 ring-[var(--flowme-action)]'
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
          top: 'calc(max(0.5rem, var(--personal-workspace-safe-top)) + 4.5rem)',
          bottom: 'max(0.5rem, var(--personal-workspace-safe-bottom))',
          left: 'max(0px, var(--personal-workspace-safe-left))',
          width: 'min(18.75rem, max(8rem, calc(100vw - 10.5rem - var(--personal-workspace-safe-left) - var(--personal-workspace-safe-right))))',
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
            <p className="text-xs font-semibold text-[var(--flowme-action)]">이동할 곳</p>
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
      onReorder={(direction) => group ? void moveByControl(
        task,
        group,
        direction === -1 ? 'previous' : 'next',
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

      {folderFlows.length > 0 ? (
        <section aria-labelledby="folder-flow-heading">
          <h3 id="folder-flow-heading" className="text-sm font-semibold text-[var(--flowme-text)]">Flow</h3>
          <div className="mt-2 grid gap-2">
            {folderFlows.map((flow) => {
              const completed = flow.items.filter((item) => isPersonalWorkspacePocCompleted(state, item.ref)).length;
              const flowMoveActive = moveTarget?.kind === 'flow' && moveTarget.flow.ref === flow.ref;
              const displayTitle = flowDisplayTitle(flow);
              return (
                <article
                  key={flow.ref}
                  data-testid="personal-workspace-flow-card"
                  data-personal-workspace-flow-ref={flow.ref}
                  data-origin={flow.origin}
                  data-personal-workspace-move-source={flowMoveActive ? 'true' : undefined}
                  className={`min-w-0 rounded-md border border-[var(--flowme-border)] bg-white p-4 ${
                    flowMoveActive ? 'bg-[var(--flowme-surface-subtle)]' : ''
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
              );
            })}
          </div>
        </section>
      ) : null}

      {folderQuickItems.length > 0 ? (
        <section aria-labelledby="folder-quick-heading">
          <h3 id="folder-quick-heading" className="text-sm font-semibold text-[var(--flowme-text)]">빠른 할 일</h3>
          <div className="mt-2 divide-y divide-[var(--flowme-border)] border-y border-[var(--flowme-border)]">
            {folderQuickItems.map((task) => renderTaskRow(task))}
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
      {groups.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--flowme-border-strong)] px-4 py-8 text-center text-sm text-[var(--flowme-text-secondary)]">이 기간에 표시할 할 일이 없습니다.</div>
      ) : groups.map((group) => (
        <section key={`${group.context}:${group.contextKey}`} data-testid="personal-workspace-task-group" data-context={group.context} className="min-w-0">
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
          <div className="divide-y divide-[var(--flowme-border)]">{group.tasks.map((task) => renderTaskRow(task, group))}</div>
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
      return (
        <PersonalWorkspacePocItemEditorSurface
          adapter="plan-item"
          draft={activePlanEditor.draft}
          transaction={transaction}
          actions={commonActions}
          source={{
            ownerLabel: originLabel(sourceFlow.origin),
            title: sourceItem.title,
            ...(sourceItem.description ? { description: sourceItem.description } : {}),
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

  const renderFlowDetail = (flow: PersonalWorkspacePocFlow) => {
    const displayTitle = flowDisplayTitle(flow);
    const authoring = state.authoredFlows?.find((candidate) => candidate.ref === flow.ref)?.authoring;
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
        className="rounded-md bg-[var(--flowme-surface-subtle)] p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
      >
        {!inSheet ? (
          <>
            <p className="text-xs font-semibold text-[var(--flowme-text-tertiary)]">{activeTask.flowTitle}</p>
            <h4 id="personal-workspace-flow-item-detail-title" className="mt-1 text-lg font-semibold text-[var(--flowme-text)]">{activeTask.title}</h4>
          </>
        ) : <span id="personal-workspace-flow-item-detail-title" className="sr-only">{activeTask.title} 상세</span>}
        <dl className="mt-3 grid gap-2 text-sm">
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
      </div>
    ) : null;

    return (
      <div data-testid="personal-workspace-flow-detail" data-product-plan-item-grammar="v1" data-product-origin={flow.origin} className="min-w-0">
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
            renderManagementMenu: () => (
              <button
                type="button"
                data-personal-workspace-move-trigger={getPersonalWorkspacePocMoveTriggerToken(flow.ref, 'flow-detail')}
                className={SECONDARY_CLASS}
                onClick={() => openFlowMove(flow, 'flow-detail')}
              >폴더 이동</button>
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
        {authoring ? (
          <details data-testid="personal-workspace-authored-source" className="mt-4 rounded-md border border-[var(--flowme-border)] bg-white p-4">
            <summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">작성 원문 보기</summary>
            <p className="mt-2 text-xs text-[var(--flowme-text-secondary)]">저장할 때 확인한 원문을 그대로 보관하고 있습니다.</p>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[var(--flowme-surface-subtle)] p-3 text-sm leading-6 text-[var(--flowme-text)]">{authoring.rawText}</pre>
            <a href="/flows/new?personalWorkspacePoc=v1" className={`${SECONDARY_CLASS} mt-3 inline-flex items-center`}>새 Flow 만들기</a>
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
    receipt && status.receiptStatus === receipt.status,
  );
  const editorOwnsFailureAlert = Boolean(
    receipt?.status === 'failure'
      && (planEditor.active?.failure || quickEditor.active?.failure),
  );

  return (
    <main
      id="personal-workspace-poc-main"
      data-flow-editor-scroll-key="personal-workspace-main"
      data-testid="personal-workspace-poc-shell"
      data-poc-storage-prefix="flow:poc:personal-workspace:v1:"
      className="mx-auto min-h-dvh max-w-[1240px] overflow-x-clip bg-white px-4 pb-[var(--flowme-mobile-tab-clearance)] pt-3 sm:px-5 sm:py-6 lg:pb-8"
      style={{
        '--personal-workspace-safe-top': 'env(safe-area-inset-top, 0px)',
        '--personal-workspace-safe-right': 'env(safe-area-inset-right, 0px)',
        '--personal-workspace-safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        '--personal-workspace-safe-left': 'env(safe-area-inset-left, 0px)',
        paddingTop: 'max(.75rem, var(--personal-workspace-safe-top))',
        paddingRight: 'max(1rem, var(--personal-workspace-safe-right))',
        paddingBottom: 'max(var(--flowme-mobile-tab-clearance), calc(var(--personal-workspace-safe-bottom) + 1rem))',
        paddingLeft: 'max(1rem, var(--personal-workspace-safe-left))',
        '--flowme-action': '#087f73',
        '--flowme-action-hover': '#066a61',
        '--flowme-action-strong': '#066a61',
        '--flowme-action-soft': '#e5f2ef',
        '--flowme-action-border': '#b8dcd6',
        '--flowme-focus': '#1268b1',
        '--flowme-text': '#1c2931',
        '--flowme-text-secondary': '#52636c',
        '--flowme-text-tertiary': '#64757d',
        '--flowme-border': '#dce3e6',
        '--flowme-border-strong': '#aab9bf',
        '--flowme-surface-subtle': '#f5f7f8',
      } as CSSProperties}
    >
      <style>{`
        [data-testid="personal-workspace-poc-shell"] {
          padding-top: max(.75rem, var(--personal-workspace-safe-top));
          padding-right: max(1rem, var(--personal-workspace-safe-right));
          padding-bottom: max(var(--flowme-mobile-tab-clearance), calc(var(--personal-workspace-safe-bottom) + 1rem));
          padding-left: max(1rem, var(--personal-workspace-safe-left));
          scroll-padding-top: calc(var(--personal-workspace-safe-top) + 4rem);
          scroll-padding-bottom: calc(var(--personal-workspace-safe-bottom) + 4rem);
        }
        @media (min-width: 640px) {
          [data-testid="personal-workspace-poc-shell"] {
            padding-right: max(1.25rem, var(--personal-workspace-safe-right));
            padding-left: max(1.25rem, var(--personal-workspace-safe-left));
          }
        }
        @media (min-width: 1024px) {
          [data-testid="personal-workspace-poc-shell"] {
            padding-bottom: max(2rem, var(--personal-workspace-safe-bottom));
          }
        }
        @media (max-width: 900px) {
          [data-testid="personal-workspace-poc-shell"] input:not([type="checkbox"]):not([type="radio"]),
          [data-testid="personal-workspace-poc-shell"] textarea,
          [data-testid="personal-workspace-poc-shell"] select {
            font-size: 16px !important;
          }
        }
        @media (orientation: landscape) and (max-height: 500px) and (max-width: 1023px) {
          [data-testid="personal-workspace-poc-shell"] {
            padding-top: max(.25rem, var(--personal-workspace-safe-top)) !important;
          }
          [data-testid="personal-workspace-poc-shell"] [data-testid="platform-nav"] {
            margin-bottom: .25rem !important;
            padding-bottom: .25rem !important;
          }
          [data-testid="personal-workspace-poc-shell"] > header {
            margin-top: .25rem !important;
            align-items: center;
            padding-bottom: .25rem !important;
          }
          [data-testid="personal-workspace-poc-shell"] > header h1 { display: none; }
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
      <a
        href="#personal-workspace-view-heading"
        className="sr-only z-[100] rounded-md bg-white px-4 py-3 font-semibold text-[var(--flowme-action)] shadow-lg focus:not-sr-only focus:fixed focus:left-[max(1rem,var(--personal-workspace-safe-left))] focus:top-[max(1rem,var(--personal-workspace-safe-top))]"
        onClick={() => focusAfterRender('#personal-workspace-view-heading')}
      >개인공간 본문으로 건너뛰기</a>
      <p id="personal-workspace-move-handle-instructions" className="sr-only">
        항목 오른쪽 재정렬 통로의 전용 손잡이를 짧게 누르거나 350밀리초 동안 길게 누르면 이동할 곳을 엽니다. 날짜와 폴더는 화면 왼쪽의 이동 패널에서 선택하고, 같은 목록의 순서는 오른쪽 전용 손잡이에서 위쪽 또는 아래쪽 화살표 키로 바꿉니다. 길게 누르기 시작 전에 손가락이 8픽셀 이상 움직이거나, 이동 중 목록 밖에 놓거나, 포인터 동작이 취소되거나, Escape 키를 누르거나 이동 창을 닫으면 변경 없이 취소됩니다.
      </p>
      <p id="personal-workspace-flow-move-handle-instructions" className="sr-only">
        Flow 이동 손잡이를 짧게 누르거나 350밀리초 동안 길게 누르면 이동할 곳을 엽니다. 화면 왼쪽 이동 패널에서 정리 폴더를 선택할 수 있습니다. Flow 전체의 폴더만 바뀌며 원본 일정과 안의 할 일 실행 위치는 그대로 유지됩니다. 길게 누르기 시작 전에 손가락이 8픽셀 이상 움직이거나, 이동 중 대상 밖에 놓거나, 포인터 동작이 취소되거나, Escape 키를 누르거나 이동 창을 닫으면 변경 없이 취소됩니다.
      </p>
      <PlatformNav includeMobileTabs={false} />
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
              if (receipt?.status === 'success' && state.revision === receipt.stateRevisionAfter) {
                void undoReceiptChange();
                return;
              }
              void commitTransition({ type: 'undo', now: new Date().toISOString() });
            }}
          >되돌리기</button>
          <details className="relative">
            <summary data-testid="personal-workspace-poc-manage" className={`${SECONDARY_CLASS} flex cursor-pointer items-center`}>설정</summary>
            <div className="absolute right-0 z-30 mt-2 w-64 rounded-md border border-[var(--flowme-border)] bg-white p-3 shadow-lg">
              <p className="text-xs leading-5 text-[var(--flowme-text-secondary)]">이 화면에서 만든 내용은 이 기기에만 저장됩니다.</p>
              <button
                type="button"
                data-testid="personal-workspace-undo-mobile"
                disabled={!state.undo || pending.current || Boolean(planEditor.active) || Boolean(quickEditor.active)}
                className={`${SECONDARY_CLASS} mt-3 w-full disabled:cursor-not-allowed disabled:opacity-40 sm:hidden`}
                onClick={() => {
                  if (receipt?.status === 'success' && state.revision === receipt.stateRevisionAfter) {
                    void undoReceiptChange();
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
        data-testid="personal-workspace-transaction-status"
        role={receiptOwnsTransactionStatus ? undefined : status.kind === 'failure' ? 'alert' : 'status'}
        aria-live={receiptOwnsTransactionStatus ? 'off' : status.kind === 'failure' ? 'assertive' : 'polite'}
        aria-hidden={receiptOwnsTransactionStatus ? true : undefined}
        data-status={status.kind}
        className={status.kind === 'ready' || receiptOwnsTransactionStatus ? 'sr-only' : `my-3 border-l-2 px-3 py-2 text-sm font-semibold ${
          status.kind === 'failure'
            ? 'border-rose-600 bg-rose-50 text-rose-800'
            : status.kind === 'saving'
              ? 'border-amber-500 bg-amber-50 text-amber-900'
              : status.kind === 'success'
                ? 'border-[var(--flowme-positive)] bg-emerald-50 text-emerald-900'
                : 'border-slate-300 bg-slate-50 text-slate-700'
        }`}
      >{status.message}</div>

      {receipt ? (
        <PersonalWorkspacePocReceiptSurface
          receipt={receipt}
          announce={!editorOwnsFailureAlert}
          onRetry={receipt.status === 'failure' && receipt.rollback !== 'recovery-required'
            ? receipt.operation === 'commit-quick-item-root'
              ? retryQuickEditorCommit
              : retryPlanEditorCommit
            : undefined}
          onUndo={receipt.status === 'success'
            && Boolean(state.undo)
            && state.revision === receipt.stateRevisionAfter
            ? () => void undoReceiptChange()
            : undefined}
        />
      ) : null}

      <nav aria-label="개인공간 보기" className="mb-4 flex max-w-full gap-2 overflow-x-auto pb-1 lg:hidden">
        {([
          ['folder', '폴더'], ['today', '오늘'], ['week', '주간'], ['month', '월간'], ['undated', '날짜 미정'], ['trash', `휴지통 ${trashRows.length}`],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" aria-current={section === id ? 'page' : undefined} className={`${SECONDARY_CLASS} shrink-0 ${section === id ? '!border-[var(--flowme-action)] !bg-[var(--flowme-action-soft)]' : ''}`} onClick={() => selectSection(id)}>{label}</button>
        ))}
      </nav>
      {section === 'folder' ? (
        <nav aria-label="모바일 폴더" className="mb-4 flex max-w-full gap-2 overflow-x-auto pb-1 lg:hidden">
          <button type="button" aria-current={!activeFolderId ? 'page' : undefined} className={`${SECONDARY_CLASS} shrink-0 ${!activeFolderId ? '!border-[var(--flowme-action)] !bg-[var(--flowme-action-soft)]' : ''}`} onClick={() => selectSection('folder')}>미분류</button>
          {sortedFolders.map((folder) => (
            <button key={folder.folderId} type="button" aria-current={activeFolderId === folder.folderId ? 'page' : undefined} className={`${SECONDARY_CLASS} shrink-0 ${activeFolderId === folder.folderId ? '!border-[var(--flowme-action)] !bg-[var(--flowme-action-soft)]' : ''}`} onClick={() => selectSection('folder', folder.folderId)}>{getPersonalWorkspacePocFolderPath(state, folder.folderId)}</button>
          ))}
        </nav>
      ) : null}

      <div className="grid min-w-0 gap-5 lg:grid-cols-[240px_minmax(0,920px)]">
        <aside className="hidden min-w-0 rounded-md bg-[#f5f7f8] p-3 lg:block" aria-label="개인공간 탐색">
          <div className="grid gap-1">
            {([
              ['today', '오늘'], ['week', '주간'], ['month', '월간'], ['undated', '날짜 미정'], ['trash', `휴지통 ${trashRows.length}`],
            ] as const).map(([id, label]) => <button key={id} type="button" aria-current={section === id ? 'page' : undefined} className={`min-h-12 rounded-md px-3 text-left text-sm font-semibold ${section === id ? 'bg-[var(--flowme-action-soft)] text-[var(--flowme-action)]' : 'text-[var(--flowme-text)] hover:bg-white'}`} onClick={() => selectSection(id)}>{label}</button>)}
          </div>
          <div className="mt-4 border-t border-[var(--flowme-border)] pt-3">
            <p className="px-3 text-xs font-semibold text-[var(--flowme-text-tertiary)]">폴더</p>
            <button type="button" aria-current={section === 'folder' && !activeFolderId ? 'page' : undefined} className={`mt-1 min-h-12 w-full rounded-md px-3 text-left text-sm font-semibold ${section === 'folder' && !activeFolderId ? 'bg-[var(--flowme-action-soft)] text-[var(--flowme-action)]' : ''}`} onClick={() => selectSection('folder')}>미분류</button>
            {rootFolders.map((folder) => (
              <div key={folder.folderId}>
                <button type="button" aria-current={section === 'folder' && activeFolderId === folder.folderId ? 'page' : undefined} className={`min-h-12 w-full rounded-md px-3 text-left text-sm font-semibold ${section === 'folder' && activeFolderId === folder.folderId ? 'bg-[var(--flowme-action-soft)] text-[var(--flowme-action)]' : ''}`} onClick={() => selectSection('folder', folder.folderId)}>{folder.title}</button>
                {sortedFolders.filter((child) => child.parentFolderId === folder.folderId).map((child) => <button key={child.folderId} type="button" aria-current={section === 'folder' && activeFolderId === child.folderId ? 'page' : undefined} className={`min-h-12 w-full rounded-md pl-7 pr-3 text-left text-sm ${section === 'folder' && activeFolderId === child.folderId ? 'bg-[var(--flowme-action-soft)] font-semibold text-[var(--flowme-action)]' : ''}`} onClick={() => selectSection('folder', child.folderId)}>↳ {child.title}</button>)}
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
    </main>
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
  onReorder: (direction: -1 | 1) => void;
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
  onReorder?: (direction: -1 | 1) => void;
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
    document.addEventListener('visibilitychange', cancelPendingPressWhenHidden);
    return () => {
      window.removeEventListener('blur', cancelPendingPress);
      window.removeEventListener('resize', cancelPendingPress);
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
    } else if (event.key === 'ArrowUp' && onReorder) {
      event.preventDefault();
      onReorder(-1);
    } else if (event.key === 'ArrowDown' && onReorder) {
      event.preventDefault();
      onReorder(1);
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
      aria-describedby={describedBy}
      aria-controls="personal-workspace-move-panel"
      aria-expanded={expanded}
      className={`flex min-h-12 min-w-12 touch-none select-none items-center justify-center rounded-md text-xl [-webkit-touch-callout:none] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] ${
        expanded ? 'bg-[var(--flowme-action-soft)] text-[var(--flowme-action)]' : 'text-slate-600'
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
          className={`pointer-events-none absolute inset-x-0 z-20 h-[3px] bg-[var(--flowme-action)] ${
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
        ariaLabel={`${task.title} 이동 옵션. Enter로 열고, 위아래 화살표로 순서를 바꿉니다.`}
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
