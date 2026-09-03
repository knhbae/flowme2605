'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import {
  PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES,
  fingerprintPersonalWorkspacePocAuthoringSource,
  materializePersonalWorkspacePocAuthoring,
  type PersonalWorkspacePocAuthoringTemplateId,
} from '@/lib/flow/personal-workspace-poc-authoring';
import {
  getPersonalWorkspacePocAuthoringMenuAction,
  PERSONAL_WORKSPACE_POC_AUTHORING_GUIDE_CATALOG,
  resolvePersonalWorkspacePocAuthoringGuideTarget,
  type PersonalWorkspacePocAuthoringGuideTarget,
  type PersonalWorkspacePocAuthoringMenuAction,
  type PersonalWorkspacePocAuthoringMenuActionId,
} from '@/lib/flow/personal-workspace-poc-authoring-guide';
import {
  PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG,
  getPersonalWorkspacePocAuthoringProperty,
  listPersonalWorkspacePocAuthoringNearMissTargets,
  locatePersonalWorkspacePocAuthoringPropertyValue,
  planPersonalWorkspacePocAuthoringNearMissRepair,
  planPersonalWorkspacePocAuthoringPropertyBatchEdit,
  planPersonalWorkspacePocAuthoringPropertyEdit,
  type PersonalWorkspacePocAuthoringNearMissTarget,
  type PersonalWorkspacePocAuthoringPropertyKey,
} from '@/lib/flow/personal-workspace-poc-authoring-properties';
import { composePersonalWorkspacePocReadModel } from '@/lib/flow/personal-workspace-poc-composition';
import type {
  PersonalWorkspacePocFlow,
  PersonalWorkspacePocReadModel,
  PersonalWorkspacePocState,
} from '@/lib/flow/personal-workspace-poc-contract';
import {
  buildPersonalWorkspacePocCopyDisambiguation,
  getPersonalWorkspacePocFlowDisplayTitle,
} from '@/lib/flow/personal-workspace-poc-copy-disambiguation';
import { resolvePersonalWorkspacePocEntry } from '@/lib/flow/personal-workspace-poc-entry';
import {
  buildPersonalWorkspacePocMapGroupCatalog,
  reducePersonalWorkspacePocMapSelection,
  type PersonalWorkspacePocIntegratedResultState,
} from '@/lib/flow/personal-workspace-poc-map-selection';
import {
  createPersonalWorkspacePocSourceEditorTicket,
  planPersonalWorkspacePocHelperTransaction,
  planPersonalWorkspacePocTemplateTransaction,
  projectPersonalWorkspacePocAuthoringSourceLines,
  type PersonalWorkspacePocSourceEditorTicket,
} from '@/lib/flow/personal-workspace-poc-source-editor';
import {
  buildPersonalWorkspacePocResultProjection,
  type PersonalWorkspacePocPrimaryResultView,
  type PersonalWorkspacePocResultNavigationState,
} from '@/lib/flow/personal-workspace-poc-result-projection';
import {
  analyzePersonalWorkspacePocLosslessAuthoring,
} from '@/lib/flow/personal-workspace-poc-lossless-authoring';
import {
  applyPersonalWorkspacePocTransition,
  validatePersonalWorkspacePocStateReferences,
} from '@/lib/flow/personal-workspace-poc-state';
import {
  PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,
  clearPersonalWorkspacePocAuthoringDraft,
  savePersonalWorkspacePocAuthoringDraft,
  type PersonalWorkspacePocAuthoringDraft,
} from '@/lib/flow/personal-workspace-poc-storage';
import { commitPersonalWorkspacePocStorage } from '@/lib/flow/personal-workspace-poc-storage-transaction';

import { PlatformNav } from '../PlatformNav';
import {
  PersonalWorkspacePocLiveEditor,
  type PersonalWorkspacePocLiveEditorHandle,
  type PersonalWorkspacePocLiveEditorLineGuide,
  type PersonalWorkspacePocLiveEditorSnapshot,
} from './PersonalWorkspacePocLiveEditor';
import { PersonalWorkspacePocResultPresenter } from './PersonalWorkspacePocResultPresenter';

type PersonalWorkspacePocAuthoringSurfaceProps = Readonly<{
  initialModel: PersonalWorkspacePocReadModel;
  initialState: PersonalWorkspacePocState;
  restored: boolean;
  initialAuthoringDraft?: PersonalWorkspacePocAuthoringDraft;
}>;

type AuthoringStatus = Readonly<{
  kind: 'ready' | 'saving' | 'success' | 'neutral' | 'failure' | 'canceled';
  message: string;
}>;

type AuthoringReceipt = Readonly<{
  flowRef: string;
  title: string;
  itemCount: number;
  dateRange?: string;
  artifactLabel: string;
  sourcePreserved: true;
}>;

type MobileStep = 'input' | 'result';

type AuthoringOverlay =
  | Readonly<{
      kind: 'helper';
      target: PersonalWorkspacePocAuthoringGuideTarget;
      ticket: PersonalWorkspacePocSourceEditorTicket;
      anchor: Readonly<{ top: number; bottom: number; right: number }>;
    }>
  | Readonly<{ kind: 'review' }>;

type VisualViewportMetrics = Readonly<{
  top: number;
  height: number;
  bottom: number;
}>;

type AuthoringPropertyEditor =
  | Readonly<{
      kind: 'single';
      surface: 'inline' | 'dependent';
      key: PersonalWorkspacePocAuthoringPropertyKey;
      itemSourceLine: number;
      value: string;
    }>
  | Readonly<{
      kind: 'time-zone';
      itemSourceLine: number;
      time: string;
      timezone: string;
    }>
  | Readonly<{
      kind: 'recurrence';
      itemSourceLine: number;
      repeat: string;
      repeatEnd: string;
    }>;

const AUTHORING_EDITOR_ID = 'personal-workspace-poc-source-v2';
const AUTHORING_DOCUMENT_ID = 'personal-workspace-poc-draft-v1';
const HELPER_MENU_ID = 'personal-workspace-authoring-helper-menu';
const TEMPLATE_PICKER_ID = 'personal-workspace-authoring-template-picker';
const TEMPLATE_EXAMPLE_PREVIEW_ID = 'personal-workspace-authoring-template-example-preview';
const DEFAULT_TEMPLATE_PREVIEW_ID: PersonalWorkspacePocAuthoringTemplateId = 'exercise-phased-4w-v1';
const PREVIEW_COMMITTED_AT = '2000-01-01T00:00:00.000Z';
const CONTROL_CLASS = 'min-h-12 rounded-md px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] disabled:cursor-not-allowed disabled:opacity-50';
const SECONDARY_CLASS = `${CONTROL_CLASS} border border-slate-300 bg-white text-slate-800 hover:border-teal-700`;
const PRIMARY_CLASS = `${CONTROL_CLASS} bg-[#0f766e] text-white hover:bg-[#115e59]`;

export type PersonalWorkspacePocAuthoringIdentity = Readonly<{
  handoffId: string;
  documentId: string;
  revisionId: string;
}>;

/** Stable source-derived IDs make an exact retry an idempotent handoff. */
export function buildPersonalWorkspacePocAuthoringIdentity(
  sourceFingerprint: string,
): PersonalWorkspacePocAuthoringIdentity {
  const token = sourceFingerprint.replace(/[^a-z0-9]+/giu, '-').replace(/^-|-$/gu, '');
  return {
    handoffId: `poc-authoring-handoff-${token}`,
    documentId: `poc-authoring-document-${token}`,
    revisionId: `poc-authoring-revision-${token}`,
  };
}

export type PersonalWorkspacePocTemplateInsertion = Readonly<{
  rawText: string;
  templateId?: PersonalWorkspacePocAuthoringTemplateId;
  changed: boolean;
}>;

/** Compatibility helper for exact scaffold tests; the UI uses guarded native transactions. */
export function getPersonalWorkspacePocTemplateInsertion(
  rawText: string,
  nextTemplateId: PersonalWorkspacePocAuthoringTemplateId,
): PersonalWorkspacePocTemplateInsertion {
  if (rawText.length > 0) return { rawText, changed: false };
  const template = PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.find(
    (entry) => entry.templateId === nextTemplateId,
  );
  return template
    ? { rawText: template.scaffold, templateId: template.templateId, changed: true }
    : { rawText, changed: false };
}

export function getPersonalWorkspacePocAuthoringOpenHref(flowRef: string): string {
  return `/my?personalWorkspacePoc=v1#flow=${encodeURIComponent(flowRef)}`;
}

function folderLabel(state: PersonalWorkspacePocState, folderId: string): string {
  const folder = state.folders.find((entry) => entry.folderId === folderId);
  if (!folder) return folderId;
  const parent = folder.parentFolderId
    ? state.folders.find((entry) => entry.folderId === folder.parentFolderId)
    : undefined;
  return parent ? `${parent.title} › ${folder.title}` : folder.title;
}

function statusClass(kind: AuthoringStatus['kind']): string {
  if (kind === 'failure') return 'border-rose-600 bg-rose-50 text-rose-900';
  if (kind === 'saving') return 'border-amber-500 bg-amber-50 text-amber-950';
  if (kind === 'success') return 'border-emerald-600 bg-emerald-50 text-emerald-950';
  if (kind === 'canceled') return 'border-slate-400 bg-slate-50 text-slate-800';
  return 'border-teal-300 bg-teal-50 text-teal-950';
}

function lossFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    'execution-time:display-only': '시간과 시간대는 항목 설명으로 보관',
    'place:flattened-to-description': '장소는 항목 설명으로 보관',
    'resource:flattened-to-description': '자료 링크는 항목 설명으로 보관',
    'recurrence:flattened-to-description': '반복 규칙은 항목 설명으로 보관',
    'completion-criteria:flattened-to-description': '완료 기준은 항목 설명으로 보관',
  };
  return labels[field] ?? '일부 세부 정보는 항목 설명으로 보관';
}

function preserveEditorSelection(event: ReactPointerEvent<HTMLButtonElement>): void {
  event.preventDefault();
}

function blockComposingPropertySubmit(event: ReactKeyboardEvent<HTMLInputElement>): void {
  if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault();
}

function sourceLineRole(kind: string): PersonalWorkspacePocLiveEditorLineGuide['role'] {
  if (kind === 'title') return 'title';
  if (kind === 'section') return 'section';
  if (kind === 'item') return 'task';
  if (kind === 'property') return 'property';
  return 'prose';
}

function issueLocationLabel(line: number): string {
  return line > 0 ? `원문 ${line}행` : '원문 전체';
}

function visibleFlowItems(flow: PersonalWorkspacePocFlow, view: 'text' | 'todo' | 'calendar') {
  if (view === 'calendar') return flow.items.filter((item) => Boolean(item.sourceDate));
  return flow.items;
}

export function PersonalWorkspacePocAuthoringSurface({
  initialModel,
  initialState,
  restored,
  initialAuthoringDraft,
}: PersonalWorkspacePocAuthoringSurfaceProps) {
  const initialTemplateId = PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.find(
    (entry) => entry.templateId === initialAuthoringDraft?.templateId,
  )?.templateId;
  const [state, setState] = useState(initialState);
  const [entryInput, setEntryInput] = useState('');
  const [rawText, setRawText] = useState(initialAuthoringDraft?.rawText ?? '');
  const [authoringStarted, setAuthoringStarted] = useState(Boolean(initialAuthoringDraft?.rawText));
  const [templateId, setTemplateId] = useState<PersonalWorkspacePocAuthoringTemplateId | undefined>(initialTemplateId);
  const [folderId, setFolderId] = useState('');
  const [lossAccepted, setLossAccepted] = useState(false);
  const [mobileStep, setMobileStep] = useState<MobileStep>('input');
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templatePreviewId, setTemplatePreviewId] = useState<PersonalWorkspacePocAuthoringTemplateId>(
    initialTemplateId ?? DEFAULT_TEMPLATE_PREVIEW_ID,
  );
  const [templateTicket, setTemplateTicket] = useState<PersonalWorkspacePocSourceEditorTicket>();
  const [overlay, setOverlay] = useState<AuthoringOverlay>();
  const [editorSnapshot, setEditorSnapshot] = useState<PersonalWorkspacePocLiveEditorSnapshot>();
  const [sourceFocusRequestId, setSourceFocusRequestId] = useState(0);
  const [editorIntersectsViewport, setEditorIntersectsViewport] = useState(true);
  const [integratedResult, setIntegratedResult] = useState<PersonalWorkspacePocIntegratedResultState>({
    resultView: 'text',
    openItemRef: null,
  });
  const [authoringResultNavigation, setAuthoringResultNavigation] = useState<PersonalWorkspacePocResultNavigationState>({
    resultView: 'text',
  });
  const [propertyEditor, setPropertyEditor] = useState<AuthoringPropertyEditor>();
  const [receipt, setReceipt] = useState<AuthoringReceipt>();
  const [visualViewport, setVisualViewport] = useState<VisualViewportMetrics>({
    top: 0,
    height: 0,
    bottom: 0,
  });
  const [status, setStatus] = useState<AuthoringStatus>({
    kind: initialAuthoringDraft?.rawText ? 'success' : 'ready',
    message: initialAuthoringDraft?.rawText
      ? '이 기기에 보관한 작성 중 원문을 복원했어요.'
      : restored
        ? '개인공간 상태를 복원했어요. 기존 Flow를 찾거나 새 원문을 시작하세요.'
        : '기존 Flow를 찾거나 메모·링크로 새 Flow를 시작하세요.',
  });

  const pending = useRef(false);
  const sourceRef = useRef<PersonalWorkspacePocLiveEditorHandle>(null);
  const pendingSourceFocus = useRef<Readonly<{ start: number; end: number }> | undefined>(undefined);
  const overlayOpenerRef = useRef<HTMLElement | null>(null);
  const overlayDialogRef = useRef<HTMLElement>(null);
  const overlayHeadingRef = useRef<HTMLHeadingElement>(null);
  const templateToggleRef = useRef<HTMLButtonElement>(null);
  const templatePickerRef = useRef<HTMLDivElement>(null);
  const authoringInputSectionRef = useRef<HTMLElement>(null);
  const stepFocusReady = useRef(false);
  const transactionSequence = useRef(0);
  const consumedTransactionIds = useRef<string[]>([]);
  const pendingTemplateId = useRef<PersonalWorkspacePocAuthoringTemplateId | undefined>(undefined);
  const templateIdRef = useRef(initialTemplateId);

  const composedModelResult = useMemo(
    () => composePersonalWorkspacePocReadModel(initialModel, state),
    [initialModel, state],
  );
  const effectiveModel = composedModelResult.ok ? composedModelResult.model : initialModel;
  const entryResult = useMemo(
    () => resolvePersonalWorkspacePocEntry(entryInput, effectiveModel),
    [effectiveModel, entryInput],
  );
  const mapCatalogResult = useMemo(
    () => buildPersonalWorkspacePocMapGroupCatalog(effectiveModel),
    [effectiveModel],
  );
  const inactiveFlowRefs = useMemo(() => new Set([
    ...(state.trashEntries ?? [])
      .filter((entry) => entry.member === 'saved_flow')
      .map((entry) => entry.memberRef),
    ...(state.deletedMembers ?? [])
      .filter((entry) => entry.member === 'saved_flow')
      .map((entry) => entry.memberRef),
  ]), [state.deletedMembers, state.trashEntries]);
  const entryCopyDisplays = useMemo(
    () => buildPersonalWorkspacePocCopyDisambiguation(effectiveModel.flows, { inactiveFlowRefs }),
    [effectiveModel.flows, inactiveFlowRefs],
  );
  const entryFlowByRef = useMemo(
    () => new Map(effectiveModel.flows.map((flow) => [flow.ref, flow])),
    [effectiveModel.flows],
  );
  const sourceFingerprint = useMemo(
    () => fingerprintPersonalWorkspacePocAuthoringSource(rawText),
    [rawText],
  );
  const identity = useMemo(
    () => buildPersonalWorkspacePocAuthoringIdentity(sourceFingerprint),
    [sourceFingerprint],
  );
  const preview = useMemo(
    () => materializePersonalWorkspacePocAuthoring({
      ...identity,
      rawText,
      committedAt: PREVIEW_COMMITTED_AT,
      ...(templateId ? { templateId } : {}),
    }),
    [identity, rawText, templateId],
  );
  const losslessAnalysis = useMemo(
    () => analyzePersonalWorkspacePocLosslessAuthoring(rawText),
    [rawText],
  );
  const authoringResultProjection = useMemo(() => {
    if (!preview.ok) return undefined;
    const localToday = /^\d{4}-\d{2}-\d{2}$/u.test(state.updatedAt.slice(0, 10))
      ? state.updatedAt.slice(0, 10)
      : '2026-09-03';
    const result = buildPersonalWorkspacePocResultProjection({
      model: { version: initialModel.version, flows: [preview.flow] },
      state,
      flowRef: preview.flow.ref,
      localToday,
      ...(authoringResultNavigation.baseDate ? { baseDate: authoringResultNavigation.baseDate } : {}),
      ...(authoringResultNavigation.selectedDate ? { selectedDate: authoringResultNavigation.selectedDate } : {}),
    });
    return result.ok ? result.projection : undefined;
  }, [authoringResultNavigation.baseDate, authoringResultNavigation.selectedDate, initialModel.version, preview, state]);
  const nearMissTargets = useMemo(
    () => listPersonalWorkspacePocAuthoringNearMissTargets(rawText),
    [rawText],
  );
  const issues = preview.parseResult.blockingIssues;
  const parsedItems = preview.parseResult.items;
  const lossFields = preview.handoff.lossFields;
  const sourceConfirmed = preview.ok
    && rawText.length > 0
    && parsedItems.length > 0
    && issues.length === 0;
  const sortedFolders = useMemo(
    () => [...state.folders].sort((left, right) => (
      left.orderKey - right.orderKey || left.title.localeCompare(right.title, 'ko')
    )),
    [state.folders],
  );
  const entryResolution = entryResult.ok ? entryResult.resolution : undefined;
  const entryMatchRefs = new Set(
    entryResolution && 'matches' in entryResolution
      ? entryResolution.matches.map((match) => match.flowRef)
      : [],
  );
  const visibleEntryGroups = mapCatalogResult.ok && entryMatchRefs.size > 0
    ? mapCatalogResult.catalog.groups.filter((group) => (
        group.children.some((child) => entryMatchRefs.has(child.flowRef))
      ))
    : [];
  const selectedFlow = effectiveModel.flows.find(
    (flow) => flow.ref === integratedResult.selectedFlowRef,
  );
  const entryFlowDisplayTitle = (flowRef: string, fallbackTitle: string): string => {
    const flow = entryFlowByRef.get(flowRef);
    return flow
      ? getPersonalWorkspacePocFlowDisplayTitle(flow, entryCopyDisplays)
      : fallbackTitle;
  };
  const showMobileStageNav = !receipt && (authoringStarted || Boolean(selectedFlow));
  const selectedGroup = mapCatalogResult.ok
    ? mapCatalogResult.catalog.groups.find(
        (group) => group.groupRef === integratedResult.selectedGroupRef,
      )
    : undefined;
  const templatePreview = PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.find(
    (entry) => entry.templateId === templatePreviewId,
  ) ?? PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES[0];
  const resultCtaSticky = !templatePickerOpen && !editorIntersectsViewport;

  const sourceProjection = useMemo(() => projectPersonalWorkspacePocAuthoringSourceLines({
    rawText,
    sourceFingerprint,
    view: 'flow',
    selectionStart: editorSnapshot?.selectionStart ?? 0,
    selectionEnd: editorSnapshot?.selectionEnd ?? 0,
    ghostEnabled: true,
    fidelityManifest: preview.parseResult.fidelityManifest,
  }), [editorSnapshot?.selectionEnd, editorSnapshot?.selectionStart, preview.parseResult.fidelityManifest, rawText, sourceFingerprint]);
  const sourceLineByNumber = useMemo(
    () => new Map(preview.parseResult.fidelityManifest.sourceLines.map((line) => [line.line, line])),
    [preview.parseResult.fidelityManifest.sourceLines],
  );
  const liveEditorLineGuides = useMemo<readonly PersonalWorkspacePocLiveEditorLineGuide[]>(
    () => sourceProjection.lines.map((line) => {
      const sourceLine = sourceLineByNumber.get(line.line);
      const issue = issues.find((entry) => entry.line === line.line);
      const kind: PersonalWorkspacePocLiveEditorLineGuide['kind'] = line.reason === 'unsupported'
        ? 'unsupported'
        : line.reason === 'protected'
          ? 'protected'
          : line.reason === 'incomplete'
            ? 'incomplete'
            : 'safe';
      return {
        line: line.line,
        kind,
        role: sourceLineRole(sourceLine?.kind ?? 'prose'),
        hierarchyDepth: line.hierarchyDepth,
        showHierarchyGuide: line.showHierarchyGuide,
        ...(line.presentationText ? { presentationText: line.presentationText } : {}),
        ...(issue ? { reviewMessage: issue.message } : {}),
        ...(line.ghost ? {
          ghost: {
            valueStart: line.ghost.valueLocator.valueStartOffset - line.source.startOffset,
            valueEnd: line.ghost.valueLocator.valueEndOffset - line.source.startOffset,
            expectedValue: '' as const,
            text: line.ghost.text,
          },
        } : {}),
      };
    }),
    [issues, sourceLineByNumber, sourceProjection.lines],
  );
  const availableHelperTarget = useMemo(() => {
    if (!editorSnapshot
      || editorSnapshot.composing
      || editorSnapshot.rawText !== rawText
      || editorSnapshot.sourceFingerprint !== sourceFingerprint) {
      return undefined;
    }
    return resolvePersonalWorkspacePocAuthoringGuideTarget({
      rawText: editorSnapshot.rawText,
      sourceFingerprint: editorSnapshot.sourceFingerprint,
      selectionStart: editorSnapshot.selectionStart,
      selectionEnd: editorSnapshot.selectionEnd,
      fidelityManifest: preview.parseResult.fidelityManifest,
    }) ?? undefined;
  }, [editorSnapshot, preview.parseResult.fidelityManifest, rawText, sourceFingerprint]);
  const helperOpen = overlay?.kind === 'helper';
  const reviewOpen = overlay?.kind === 'review';
  const helperTarget = overlay?.kind === 'helper' ? overlay.target : undefined;
  const helperTicket = overlay?.kind === 'helper' ? overlay.ticket : undefined;
  const helperActions = helperTarget
    ? helperTarget.allowedActionIds
        .map((actionId) => getPersonalWorkspacePocAuthoringMenuAction(actionId))
        .filter((action): action is PersonalWorkspacePocAuthoringMenuAction => Boolean(action))
    : [];

  const closeOverlay = useCallback((message?: string) => {
    const opener = overlayOpenerRef.current;
    setOverlay(undefined);
    setPropertyEditor(undefined);
    if (message) setStatus({ kind: 'canceled', message });
    window.requestAnimationFrame(() => {
      if (opener?.isConnected) {
        opener.focus({ preventScroll: true });
        return;
      }
      sourceRef.current?.focusRange(
        editorSnapshot?.selectionStart ?? 0,
        editorSnapshot?.selectionEnd ?? editorSnapshot?.selectionStart ?? 0,
        editorSnapshot?.selectionDirection ?? 'none',
      );
    });
  }, [editorSnapshot]);

  const openReview = useCallback((opener?: HTMLElement | null) => {
    overlayOpenerRef.current = opener ?? (
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    );
    setTemplatePickerOpen(false);
    setTemplateTicket(undefined);
    setOverlay({ kind: 'review' });
  }, []);

  useEffect(() => {
    templateIdRef.current = templateId;
  }, [templateId]);

  useEffect(() => {
    if (!entryResult.ok || !mapCatalogResult.ok || !composedModelResult.ok) {
      window.location.replace('/my');
    }
  }, [composedModelResult.ok, entryResult.ok, mapCatalogResult.ok]);

  useEffect(() => {
    const requestedFocus = pendingSourceFocus.current;
    if (requestedFocus && mobileStep === 'input') {
      pendingSourceFocus.current = undefined;
      const frame = window.requestAnimationFrame(() => {
        sourceRef.current?.focusRange(requestedFocus.start, requestedFocus.end);
      });
      return () => window.cancelAnimationFrame(frame);
    }
    if (!stepFocusReady.current) {
      stepFocusReady.current = true;
      return;
    }
    if (window.matchMedia('(min-width: 1024px)').matches) return;
    const headingId = mobileStep === 'input'
      ? 'personal-workspace-authoring-write-heading'
      : 'personal-workspace-authoring-result-heading';
    window.requestAnimationFrame(() => {
      const heading = document.getElementById(headingId);
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: 'start' });
    });
  }, [mobileStep, sourceFocusRequestId]);

  useEffect(() => {
    if (!receipt) return;
    const frame = window.requestAnimationFrame(() => {
      const heading = document.getElementById('personal-workspace-authoring-receipt-title');
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [receipt]);

  useEffect(() => {
    if (!authoringStarted || mobileStep !== 'input') {
      setEditorIntersectsViewport(true);
      return;
    }
    const editorFrame = authoringInputSectionRef.current?.querySelector<HTMLElement>(
      '[data-testid="personal-workspace-live-editor-frame"]',
    );
    if (!editorFrame || typeof window.IntersectionObserver !== 'function') {
      setEditorIntersectsViewport(true);
      return;
    }
    const observer = new window.IntersectionObserver(([entry]) => {
      setEditorIntersectsViewport(Boolean(entry?.isIntersecting));
    }, { threshold: 0 });
    observer.observe(editorFrame);
    return () => observer.disconnect();
  }, [authoringStarted, mobileStep]);

  useLayoutEffect(() => {
    if (!overlay && !(propertyEditor && (
      propertyEditor.kind !== 'single' || propertyEditor.surface === 'dependent'
    ))) return;
    overlayHeadingRef.current?.focus({ preventScroll: true });
  }, [overlay, propertyEditor]);

  useEffect(() => {
    if (!overlay && !(propertyEditor && (
      propertyEditor.kind !== 'single' || propertyEditor.surface === 'dependent'
    ))) return;
    const viewport = window.visualViewport;
    const update = () => {
      if (!viewport) {
        setVisualViewport({ top: 0, height: window.innerHeight, bottom: 0 });
        return;
      }
      setVisualViewport({
        top: viewport.offsetTop,
        height: viewport.height,
        bottom: Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop),
      });
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
    };
  }, [overlay, propertyEditor]);

  useEffect(() => {
    if (!overlay && !templatePickerOpen && !propertyEditor) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || pending.current) return;
      event.preventDefault();
      if (overlay) {
        closeOverlay('메뉴만 닫았어요. 원문과 저장 상태는 그대로입니다.');
        return;
      }
      if (propertyEditor) {
        setPropertyEditor(undefined);
        setStatus({ kind: 'canceled', message: '값을 바꾸지 않았어요. 원문은 그대로입니다.' });
        return;
      }
      if (templatePickerOpen) {
        setTemplatePickerOpen(false);
        setTemplateTicket(undefined);
        setStatus({ kind: 'canceled', message: '작성 틀을 고르지 않았어요. 원문은 그대로입니다.' });
        window.requestAnimationFrame(() => templateToggleRef.current?.focus({ preventScroll: true }));
      }
    };
    const onOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (overlay) {
        if (overlayDialogRef.current?.contains(target) || overlayOpenerRef.current?.contains(target)) return;
        setOverlay(undefined);
        setStatus({ kind: 'canceled', message: '메뉴만 닫았어요. 원문과 저장 상태는 그대로입니다.' });
        return;
      }
      if (templatePickerOpen
        && !templatePickerRef.current?.contains(target)
        && !templateToggleRef.current?.contains(target)) {
        setTemplatePickerOpen(false);
        setTemplateTicket(undefined);
        setStatus({ kind: 'canceled', message: '작성 틀을 고르지 않았어요. 원문은 그대로입니다.' });
      }
    };
    window.addEventListener('keydown', onEscape);
    document.addEventListener('pointerdown', onOutsidePointer, true);
    return () => {
      window.removeEventListener('keydown', onEscape);
      document.removeEventListener('pointerdown', onOutsidePointer, true);
    };
  }, [closeOverlay, overlay, propertyEditor, templatePickerOpen]);

  const persistAuthoringDraft = (
    value: string,
    nextTemplateId?: PersonalWorkspacePocAuthoringTemplateId,
  ) => {
    const saved = value.length === 0
      ? clearPersonalWorkspacePocAuthoringDraft(window.localStorage)
      : savePersonalWorkspacePocAuthoringDraft(window.localStorage, {
          version: 1,
          rawText: value,
          ...(nextTemplateId ? { templateId: nextTemplateId } : {}),
        });
    return saved.ok;
  };

  const onNativeSourceInput = (snapshot: PersonalWorkspacePocLiveEditorSnapshot) => {
    const nextTemplateId = pendingTemplateId.current ?? templateIdRef.current;
    setRawText(snapshot.rawText);
    setEditorSnapshot(snapshot);
    if (pendingTemplateId.current) {
      templateIdRef.current = pendingTemplateId.current;
      setTemplateId(pendingTemplateId.current);
      pendingTemplateId.current = undefined;
    }
    if (snapshot.rawText.length > 0) setTemplatePickerOpen(false);
    setLossAccepted(false);
    setReceipt(undefined);
    const persisted = persistAuthoringDraft(snapshot.rawText, nextTemplateId);
    setStatus(persisted
      ? { kind: 'ready', message: '작성 중인 원문을 이 기기에 보관했어요.' }
      : { kind: 'failure', message: '작성 중 초안을 보관하지 못했어요. 현재 입력은 화면에 그대로 유지합니다.' });
  };

  const nextTransactionId = (kind: 'template' | 'helper') => {
    transactionSequence.current += 1;
    return `poc-authoring:${kind}:${transactionSequence.current}`;
  };

  const beginAuthoring = (exactText: string) => {
    if (pending.current) return;
    // Every entry starts a new source document. Do not carry template
    // attribution, lossy-handoff consent, or transient editor UI from the
    // document that was previously open.
    pendingTemplateId.current = undefined;
    templateIdRef.current = undefined;
    pendingSourceFocus.current = undefined;
    overlayOpenerRef.current = null;
    consumedTransactionIds.current = [];
    setRawText(exactText);
    setAuthoringStarted(true);
    setTemplateId(undefined);
    setFolderId('');
    setLossAccepted(false);
    setMobileStep('input');
    setTemplatePickerOpen(false);
    setTemplatePreviewId(DEFAULT_TEMPLATE_PREVIEW_ID);
    setTemplateTicket(undefined);
    setOverlay(undefined);
    setPropertyEditor(undefined);
    setEditorSnapshot(undefined);
    setEditorIntersectsViewport(true);
    setIntegratedResult({ resultView: 'text', openItemRef: null });
    setAuthoringResultNavigation({ resultView: 'text' });
    setReceipt(undefined);
    if (exactText.length > 0) {
      const persisted = persistAuthoringDraft(exactText);
      setStatus(persisted
        ? { kind: 'success', message: '입력한 글을 한 글자도 바꾸지 않고 원문으로 가져왔어요.' }
        : { kind: 'failure', message: '원문은 화면에 유지했지만 작성 중인 내용을 보관하지 못했어요.' });
    } else {
      setStatus({ kind: 'ready', message: '빈 원문에서 직접 쓰거나 작성 틀을 한 번 넣을 수 있어요.' });
    }
  };

  const startBlankWithTemplate = () => {
    beginAuthoring('');
    setTemplatePreviewId(DEFAULT_TEMPLATE_PREVIEW_ID);
    window.requestAnimationFrame(() => {
      const snapshot = sourceRef.current?.readSnapshot();
      if (!snapshot) return;
      setTemplateTicket(createPersonalWorkspacePocSourceEditorTicket({
        transactionId: nextTransactionId('template'),
        kind: 'template',
        snapshot,
        requireEmptySource: true,
      }));
      setTemplatePickerOpen(true);
    });
  };

  const toggleTemplatePicker = () => {
    if (templatePickerOpen) {
      setTemplatePickerOpen(false);
      setTemplateTicket(undefined);
      setStatus({ kind: 'canceled', message: '작성 틀을 고르지 않았어요. 원문은 그대로입니다.' });
      return;
    }
    const snapshot = sourceRef.current?.readSnapshot();
    if (!snapshot || snapshot.composing || snapshot.rawText.length > 0) {
      setStatus({ kind: 'canceled', message: '작성 틀은 비어 있는 같은 편집기에서만 넣을 수 있어요.' });
      return;
    }
    setTemplateTicket(createPersonalWorkspacePocSourceEditorTicket({
      transactionId: nextTransactionId('template'),
      kind: 'template',
      snapshot,
      requireEmptySource: true,
    }));
    setTemplatePreviewId(DEFAULT_TEMPLATE_PREVIEW_ID);
    setTemplatePickerOpen(true);
  };

  const applyTemplate = async (nextTemplateId: PersonalWorkspacePocAuthoringTemplateId) => {
    if (pending.current || !templateTicket) return;
    const snapshot = sourceRef.current?.readSnapshot();
    if (!snapshot) return;
    const planned = planPersonalWorkspacePocTemplateTransaction({
      ticket: templateTicket,
      current: snapshot,
      templateId: nextTemplateId,
      consumedTransactionIds: consumedTransactionIds.current,
    });
    if (!planned.ok) {
      setStatus({ kind: 'canceled', message: '편집기 상태가 달라져 작성 틀을 넣지 않았어요.' });
      return;
    }
    pendingTemplateId.current = nextTemplateId;
    const applied = await sourceRef.current?.applyNativeReplacement({
      expected: snapshot,
      replacement: planned.plan.replacement.insertedText,
      range: {
        start: planned.plan.replacement.replaceStart,
        end: planned.plan.replacement.replaceEnd,
      },
    });
    if (!applied?.ok) {
      pendingTemplateId.current = undefined;
      const sourceChanged = Boolean(
        applied?.snapshot && applied.snapshot.rawText !== snapshot.rawText,
      );
      if (sourceChanged && applied?.snapshot) {
        // Never overwrite a browser-owned native history entry on failure.
        // Keep any changed DOM bytes and synchronize the PoC draft once so a
        // reload cannot silently restore an older source.
        onNativeSourceInput(applied.snapshot);
        setTemplatePickerOpen(false);
        setTemplateTicket(undefined);
      }
      setStatus({
        kind: 'failure',
        message: sourceChanged
          ? '작성 틀 편집이 완전히 끝나지 않아 현재 원문만 보관했어요.'
          : '브라우저 편집 이력을 보존할 수 없어 작성 틀을 넣지 않았어요.',
      });
      return;
    }
    consumedTransactionIds.current.push(templateTicket.transactionId);
    setEditorIntersectsViewport(true);
    setTemplatePickerOpen(false);
    setTemplateTicket(undefined);
    window.requestAnimationFrame(() => {
      if (window.matchMedia('(max-width: 1023px)').matches) {
        authoringInputSectionRef.current?.scrollIntoView({ block: 'start', inline: 'nearest' });
      }
      sourceRef.current?.focusRange(
        planned.plan.replacement.nextSelectionStart,
        planned.plan.replacement.nextSelectionEnd,
      );
    });
    const template = PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.find(
      (entry) => entry.templateId === nextTemplateId,
    );
    setStatus({
      kind: 'success',
      message: `${template?.label ?? '작성'} 틀을 한 번 넣었어요. Ctrl+Z 한 번으로 되돌릴 수 있습니다.`,
    });
  };

  const openHelper = useCallback((opener: HTMLButtonElement) => {
    if (helperOpen) {
      closeOverlay('내용을 추가하지 않았어요. 원문은 그대로입니다.');
      return;
    }
    const snapshot = sourceRef.current?.readSnapshot();
    if (!snapshot) return;
    const target = resolvePersonalWorkspacePocAuthoringGuideTarget({
      rawText: snapshot.rawText,
      sourceFingerprint: snapshot.sourceFingerprint,
      selectionStart: snapshot.selectionStart,
      selectionEnd: snapshot.selectionEnd,
      fidelityManifest: preview.parseResult.fidelityManifest,
    });
    if (!target || snapshot.composing) {
      setStatus({ kind: 'neutral', message: '빈 줄이나 현재 할 일에 커서를 두면 내용을 추가할 수 있어요.' });
      return;
    }
    const rect = opener.getBoundingClientRect();
    overlayOpenerRef.current = opener;
    setTemplatePickerOpen(false);
    setTemplateTicket(undefined);
    setPropertyEditor(undefined);
    setOverlay({
      kind: 'helper',
      target,
      ticket: createPersonalWorkspacePocSourceEditorTicket({
        transactionId: nextTransactionId('helper'),
        kind: 'helper',
        snapshot,
        requireEmptySource: false,
      }),
      anchor: {
        top: rect.top,
        bottom: rect.bottom,
        right: Math.max(0, window.innerWidth - rect.right),
      },
    });
  }, [closeOverlay, helperOpen, preview.parseResult.fidelityManifest]);

  const applyHelper = async (actionId: PersonalWorkspacePocAuthoringMenuActionId) => {
    if (!helperTicket || !helperTarget) return;
    const snapshot = sourceRef.current?.readSnapshot();
    if (!snapshot) return;
    const planned = planPersonalWorkspacePocHelperTransaction({
      ticket: helperTicket,
      current: snapshot,
      target: helperTarget,
      actionId,
      consumedTransactionIds: consumedTransactionIds.current,
    });
    if (!planned.ok) {
      setStatus({ kind: 'canceled', message: '편집 위치가 달라져 내용을 추가하지 않았어요.' });
      return;
    }
    const applied = await sourceRef.current?.applyNativeReplacement({
      expected: snapshot,
      replacement: planned.plan.replacement.insertedText,
      range: {
        start: planned.plan.replacement.replaceStart,
        end: planned.plan.replacement.replaceEnd,
      },
    });
    if (!applied?.ok) {
      const sourceChanged = Boolean(
        applied?.snapshot && applied.snapshot.rawText !== snapshot.rawText,
      );
      if (sourceChanged && applied?.snapshot) {
        onNativeSourceInput(applied.snapshot);
        setOverlay(undefined);
        overlayOpenerRef.current = null;
      }
      setStatus({
        kind: 'failure',
        message: sourceChanged
          ? '내용 추가가 완전히 끝나지 않아 현재 원문만 보관했어요.'
          : '브라우저 편집 이력을 보존할 수 없어 내용을 추가하지 않았어요.',
      });
      return;
    }
    consumedTransactionIds.current.push(helperTicket.transactionId);
    setOverlay(undefined);
    overlayOpenerRef.current = null;
    sourceRef.current?.focusRange(
      planned.plan.replacement.nextSelectionStart,
      planned.plan.replacement.nextSelectionEnd,
    );
    setStatus({ kind: 'success', message: '선택한 구조를 원문에 한 번 넣었어요. Ctrl+Z로 되돌릴 수 있습니다.' });
  };

  const helperItemSourceLine = helperTarget?.kind === 'root-item'
    ? helperTarget.ownerItemLine ?? helperTarget.line
    : undefined;

  const propertyLocation = (
    key: PersonalWorkspacePocAuthoringPropertyKey,
    itemSourceLine: number,
    propertySourceLine?: number,
  ) => locatePersonalWorkspacePocAuthoringPropertyValue({
    rawText,
    expectedSourceFingerprint: sourceFingerprint,
    itemSourceLine,
    key,
    ...(propertySourceLine ? { propertySourceLine } : {}),
  });

  const focusPropertyValue = (
    key: PersonalWorkspacePocAuthoringPropertyKey,
    itemSourceLine: number,
    propertySourceLine?: number,
  ) => {
    if (editorSnapshot?.composing) {
      setStatus({ kind: 'neutral', message: '한글 입력을 마친 뒤 값을 다시 선택해 주세요. 원문은 그대로입니다.' });
      return;
    }
    const located = propertyLocation(key, itemSourceLine, propertySourceLine);
    if (located.status !== 'located') {
      setStatus({ kind: 'neutral', message: '이 항목에는 아직 해당 값이 없어요. 추가를 눌러 입력하세요.' });
      return;
    }
    setOverlay(undefined);
    setPropertyEditor(undefined);
    overlayOpenerRef.current = null;
    setMobileStep('input');
    pendingSourceFocus.current = located.selection;
    setSourceFocusRequestId((requestId) => requestId + 1);
    setStatus({ kind: 'success', message: '원문의 실제 값만 선택했어요. 바로 입력해 바꿀 수 있습니다.' });
  };

  const openPropertyEditor = (
    key: PersonalWorkspacePocAuthoringPropertyKey,
    itemSourceLine: number,
  ) => {
    const entry = getPersonalWorkspacePocAuthoringProperty(key);
    if (!entry || entry.writeSupport !== 'editable') {
      setStatus({ kind: 'neutral', message: '현재 PoC에서 안전하게 바꿀 수 없는 항목 정보예요.' });
      return;
    }
    const located = propertyLocation(key, itemSourceLine);
    if (key === 'timezone') {
      const time = propertyLocation('time', itemSourceLine);
      setPropertyEditor({
        kind: 'time-zone', itemSourceLine,
        time: time.status === 'located' ? time.rawValue : '',
        timezone: located.status === 'located' ? located.rawValue : 'Asia/Seoul',
      });
    } else if (key === 'repeat' || key === 'repeatEnd') {
      const repeat = propertyLocation('repeat', itemSourceLine);
      const repeatEnd = propertyLocation('repeatEnd', itemSourceLine);
      setPropertyEditor({
        kind: 'recurrence', itemSourceLine,
        repeat: repeat.status === 'located' ? repeat.rawValue : '',
        repeatEnd: repeatEnd.status === 'located' ? repeatEnd.rawValue : '',
      });
    } else {
      setPropertyEditor({
        kind: 'single', surface: entry.editor === 'dependent' ? 'dependent' : 'inline', key, itemSourceLine,
        value: located.status === 'located' ? located.rawValue : '',
      });
    }
    setOverlay(undefined);
    overlayOpenerRef.current = null;
    setMobileStep('input');
  };

  const applyPropertyEditor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!propertyEditor || pending.current) return;
    const snapshot = sourceRef.current?.readSnapshot();
    if (!snapshot) return;
    const beforeSelection = { start: snapshot.selectionStart, end: snapshot.selectionEnd };
    const planned = propertyEditor.kind === 'time-zone'
      ? planPersonalWorkspacePocAuthoringPropertyBatchEdit({
          intent: 'apply', rawText: snapshot.rawText,
          expectedSourceFingerprint: snapshot.sourceFingerprint,
          itemSourceLine: propertyEditor.itemSourceLine,
          updates: [
            { key: 'time', value: propertyEditor.time },
            { key: 'timezone', value: propertyEditor.timezone },
          ],
          beforeSelection,
        })
      : propertyEditor.kind === 'recurrence' && propertyEditor.repeatEnd.trim()
        ? planPersonalWorkspacePocAuthoringPropertyBatchEdit({
            intent: 'apply', rawText: snapshot.rawText,
            expectedSourceFingerprint: snapshot.sourceFingerprint,
            itemSourceLine: propertyEditor.itemSourceLine,
            updates: [
              { key: 'repeat', value: propertyEditor.repeat },
              { key: 'repeatEnd', value: propertyEditor.repeatEnd },
            ],
            beforeSelection,
          })
        : planPersonalWorkspacePocAuthoringPropertyEdit({
            intent: 'apply', rawText: snapshot.rawText,
            expectedSourceFingerprint: snapshot.sourceFingerprint,
            itemSourceLine: propertyEditor.itemSourceLine,
            key: propertyEditor.kind === 'recurrence' ? 'repeat' : propertyEditor.key,
            value: propertyEditor.kind === 'recurrence' ? propertyEditor.repeat : propertyEditor.value,
            beforeSelection,
          });
    if (planned.status === 'no-op') {
      setStatus({ kind: 'neutral', message: '이미 같은 값이에요. 원문은 바뀌지 않았습니다.' });
      return;
    }
    if (planned.status !== 'applied') {
      const messages: Record<string, string> = {
        'missing-dependency': '먼저 시간 또는 반복 값을 입력해야 합니다.',
        'conflicting-schedule': '고정 날짜와 상대 날짜 중 하나만 사용할 수 있습니다.',
        'invalid-value': '입력 형식을 확인해 주세요.',
        'duplicate-property': '같은 정보가 두 번 있어 자동으로 바꾸지 않았습니다.',
      };
      setStatus({
        kind: planned.status === 'cancelled' ? 'canceled' : 'failure',
        message: planned.status === 'blocked'
          ? messages[planned.reason] ?? '원문 상태가 달라 값을 바꾸지 않았습니다.'
          : '값을 바꾸지 않았습니다.',
      });
      return;
    }
    const change = planned.transaction.changes[0];
    pending.current = true;
    const applied = await sourceRef.current?.applyNativeReplacement({
      expected: snapshot,
      replacement: change.insert,
      range: { start: change.from, end: change.to },
    });
    pending.current = false;
    if (!applied?.ok) {
      if (applied?.snapshot && applied.snapshot.rawText !== snapshot.rawText) {
        onNativeSourceInput(applied.snapshot);
      }
      setStatus({ kind: 'failure', message: '브라우저 편집 이력을 보존할 수 없어 현재 원문만 유지했습니다.' });
      return;
    }
    setOverlay(undefined);
    setPropertyEditor(undefined);
    overlayOpenerRef.current = null;
    sourceRef.current?.focusRange(planned.selection.start, planned.selection.end);
    setStatus({ kind: 'success', message: '항목 정보를 원문에 한 번 반영했어요. Ctrl+Z 한 번으로 되돌릴 수 있습니다.' });
  };

  const repairNearMiss = async (target: PersonalWorkspacePocAuthoringNearMissTarget) => {
    // The review lives on the mobile Result stage. A native browser edit must
    // run after the one shared textarea is visible again, otherwise execCommand
    // correctly refuses to create an undo history entry.
    setOverlay(undefined);
    overlayOpenerRef.current = null;
    if (mobileStep !== 'input') {
      setMobileStep('input');
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
    }
    const snapshot = sourceRef.current?.readSnapshot();
    if (!snapshot || pending.current) return;
    const planned = planPersonalWorkspacePocAuthoringNearMissRepair({
      intent: 'apply',
      rawText: snapshot.rawText,
      expectedSourceFingerprint: snapshot.sourceFingerprint,
      targetId: target.targetId,
      beforeSelection: { start: snapshot.selectionStart, end: snapshot.selectionEnd },
    });
    if (planned.status !== 'repaired') {
      setStatus({ kind: 'canceled', message: '원문 위치가 달라 문법을 바꾸지 않았습니다.' });
      return;
    }
    const change = planned.transaction.changes[0];
    const applied = await sourceRef.current?.applyNativeReplacement({
      expected: snapshot,
      replacement: change.insert,
      range: { start: change.from, end: change.to },
    });
    if (!applied?.ok) {
      if (applied?.snapshot && applied.snapshot.rawText !== snapshot.rawText) {
        onNativeSourceInput(applied.snapshot);
      }
      setStatus({ kind: 'failure', message: '문법 복구를 완료하지 못해 현재 원문만 유지했습니다.' });
      return;
    }
    sourceRef.current?.focusRange(planned.selection.start, planned.selection.end);
    setStatus({ kind: 'success', message: '선택한 줄만 할 일 형식으로 고쳤어요. Ctrl+Z 한 번으로 되돌릴 수 있습니다.' });
  };

  const chooseEntryGroup = (groupRef: string) => {
    if (!mapCatalogResult.ok) return;
    const group = mapCatalogResult.catalog.groups.find((candidate) => candidate.groupRef === groupRef);
    const child = group?.children.find((candidate) => entryMatchRefs.has(candidate.flowRef))
      ?? group?.children[0];
    if (!group || !child) return;
    setIntegratedResult({
      selectedGroupRef: group.groupRef,
      selectedFlowRef: child.flowRef,
      resultView: 'text',
      openItemRef: null,
      focusReturn: { kind: 'flow-result-heading', flowRef: child.flowRef },
    });
    setMobileStep('result');
    setStatus({ kind: 'success', message: '기존 Flow 미리보기를 열었어요.' });
  };

  const chooseMapChild = (flowRef: string) => {
    if (!mapCatalogResult.ok || !selectedGroup || selectedGroup.kind !== 'map') return;
    const reduced = reducePersonalWorkspacePocMapSelection(
      mapCatalogResult.catalog,
      integratedResult,
      {
        type: 'select-integrated-flow-child',
        groupRef: selectedGroup.groupRef,
        childFlowRef: flowRef,
        expectedReadModelFingerprint: mapCatalogResult.catalog.readModelFingerprint,
      },
    );
    if (!reduced.ok || !reduced.changed) {
      setStatus({ kind: 'neutral', message: reduced.ok ? '이미 보고 있는 Flow예요.' : '선택 상태가 달라져 바꾸지 않았어요.' });
      return;
    }
    setIntegratedResult(reduced.state);
    setStatus({ kind: 'success', message: '선택한 Flow의 원문 보기로 돌아왔어요.' });
    window.requestAnimationFrame(() => {
      document.getElementById('personal-workspace-entry-result-heading')?.focus();
    });
  };

  const focusIssue = (line: number) => {
    const sourceLine = line > 0
      ? preview.parseResult.fidelityManifest.sourceLines.find((entry) => entry.line === line)
      : undefined;
    if (line > 0 && !sourceLine) {
      setStatus({ kind: 'failure', message: '원문 위치가 달라졌어요. 최신 항목 검토를 다시 열어 주세요.' });
      return;
    }
    pendingSourceFocus.current = sourceLine
      ? {
          start: sourceLine.locator.startOffset,
          end: sourceLine.locator.startOffset + sourceLine.rawLine.length,
        }
      : { start: 0, end: 0 };
    setOverlay(undefined);
    overlayOpenerRef.current = null;
    setMobileStep('input');
    setSourceFocusRequestId((requestId) => requestId + 1);
  };

  const commitHandoff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    if (!sourceConfirmed) {
      setMobileStep('input');
      openReview();
      setStatus({ kind: 'failure', message: '저장할 수 없는 원문 행이 있어요. 항목 검토에서 위치를 확인해 주세요.' });
      return;
    }

    const existingFlow = state.authoredFlows?.find(
      (flow) => flow.authoring.handoffId === identity.handoffId,
    );
    const now = existingFlow?.authoring.committedAt ?? new Date().toISOString();
    const materialization = materializePersonalWorkspacePocAuthoring({
      ...identity,
      rawText,
      committedAt: now,
      ...(templateId ? { templateId } : {}),
    });
    if (!materialization.ok) {
      setMobileStep('input');
      openReview();
      setStatus({ kind: 'failure', message: '저장할 수 없는 입력이 있어 원문을 그대로 유지했습니다.' });
      return;
    }
    if (materialization.handoff.lossFields.length > 0 && !lossAccepted) {
      setMobileStep('result');
      setStatus({ kind: 'neutral', message: '정보 변환 범위를 확인해 주세요.' });
      return;
    }

    let undoAuthoringDraftRawValue: string | null;
    try {
      undoAuthoringDraftRawValue = window.localStorage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY);
    } catch {
      setStatus({ kind: 'failure', message: '작성 중 초안의 복구 상태를 읽지 못해 저장하지 않았어요.' });
      return;
    }

    const result = applyPersonalWorkspacePocTransition(state, {
      type: 'commit-authoring-handoff',
      flow: materialization.flow,
      ...(folderId ? { folderId } : {}),
      sourceConfirmed: true,
      confirmedSourceFingerprint: sourceFingerprint,
      blockingIssues: [...materialization.handoff.blockingIssues],
      lossFields: [...materialization.handoff.lossFields],
      lossAccepted,
      existingFlowRefs: initialModel.flows.map((flow) => flow.ref),
      undoAuthoringDraftRawValue,
      now,
    });
    if (!result.changed) {
      if (result.error) {
        setStatus({ kind: 'failure', message: result.message });
        return;
      }
      const dates = materialization.flow.items
        .flatMap((item) => item.sourceDate ? [item.sourceDate] : [])
        .sort((left, right) => left.localeCompare(right));
      setReceipt({
        flowRef: materialization.flow.ref,
        title: materialization.flow.title,
        itemCount: materialization.flow.items.length,
        ...(dates.length > 0 ? { dateRange: dates[0] === dates.at(-1) ? dates[0] : `${dates[0]} ~ ${dates.at(-1)}` } : {}),
        artifactLabel: '할 일 · 날짜 보기',
        sourcePreserved: true,
      });
      setStatus({ kind: 'neutral', message: result.message });
      return;
    }

    const composition = composePersonalWorkspacePocReadModel(initialModel, result.state);
    const semanticPreflight = composition.ok
      ? validatePersonalWorkspacePocStateReferences(result.state, composition.model)
      : composition;
    if (!semanticPreflight.ok) {
      setStatus({ kind: 'failure', message: '저장 전 안전 확인을 통과하지 못해 원문과 기존 상태를 유지했습니다.' });
      return;
    }

    pending.current = true;
    setStatus({ kind: 'saving', message: '내 Flow에 저장 중…' });
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    const saved = commitPersonalWorkspacePocStorage({
      storage: window.localStorage,
      state: result.state,
      transactionId: `${identity.handoffId}:commit:${result.state.revision}`,
      removeAuthoringDraft: true,
    });
    pending.current = false;
    if (!saved.ok) {
      setStatus({ kind: 'failure', message: '저장하지 못했어요. 원문과 기존 개인공간 상태는 그대로입니다.' });
      return;
    }

    setState(result.state);
    const dates = materialization.flow.items
      .flatMap((item) => item.sourceDate ? [item.sourceDate] : [])
      .sort((left, right) => left.localeCompare(right));
    setReceipt({
      flowRef: materialization.flow.ref,
      title: materialization.flow.title,
      itemCount: materialization.flow.items.length,
      ...(dates.length > 0 ? { dateRange: dates[0] === dates.at(-1) ? dates[0] : `${dates[0]} ~ ${dates.at(-1)}` } : {}),
      artifactLabel: '할 일 · 날짜 보기',
      sourcePreserved: true,
    });
    setMobileStep('result');
    setStatus({ kind: 'success', message: result.message });
  };

  const renderEntryInput = () => (
    <section aria-labelledby="personal-workspace-authoring-write-heading" className={`${mobileStep === 'input' ? 'block' : 'hidden'} min-w-0 lg:block`}>
      <p className="text-xs font-bold tracking-[0.12em] text-teal-800">한 곳에서 시작</p>
      <h2 id="personal-workspace-authoring-write-heading" tabIndex={-1} className="mt-1 scroll-mt-24 text-xl font-semibold tracking-[-0.02em] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700">
        무엇을 준비하고 있나요?
      </h2>
      <p className="mt-2 break-keep text-sm leading-6 text-slate-600">
        기존 Flow 이름, http(s) 링크, 또는 직접 적은 메모를 한 입력창에 넣으세요.
      </p>
      <label htmlFor="personal-workspace-entry-input" className="sr-only">Flow 찾기 또는 새 원문 시작</label>
      <textarea
        id="personal-workspace-entry-input"
        data-testid="personal-workspace-entry-input"
        value={entryInput}
        rows={5}
        spellCheck="false"
        className="mt-5 min-h-36 w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-base leading-6 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
        placeholder="예: 이사 준비, https://…, 이번 주말 캠핑 준비"
        onChange={(event) => {
          setEntryInput(event.target.value);
          setIntegratedResult({ resultView: 'text', openItemRef: null });
          setMobileStep('input');
        }}
      />

      <div data-testid="personal-workspace-entry-resolution" className="mt-4 border-y border-slate-200 py-3">
        {!entryResolution || entryResolution.kind === 'empty' ? (
          <p className="text-sm leading-6 text-slate-600">입력하면 이 기기에 저장된 Flow를 먼저 찾습니다. 아무 내용도 자동으로 저장하지 않습니다.</p>
        ) : null}
        {entryResolution?.kind === 'invalid-url' ? (
          <p className="border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">링크 형식을 확인해 주세요. 고치거나, 현재 글을 원문으로 계속 쓸 수 있어요.</p>
        ) : null}
        {entryResolution?.kind === 'url' && entryResolution.lookupStatus === 'miss' ? (
          <p className="border-l-2 border-slate-400 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-800">이 기기의 기존 Flow에서는 같은 링크를 찾지 못했어요. 외부 조회 없이 원문으로 계속할 수 있습니다.</p>
        ) : null}
        {entryResolution?.kind === 'memo' ? (
          <p className="text-sm leading-6 text-slate-700">일치하는 기존 Flow가 없어요. 입력한 글을 그대로 새 원문으로 가져갈 수 있습니다.</p>
        ) : null}

        {visibleEntryGroups.length > 0 ? (
          <ul data-testid="personal-workspace-entry-results" className="grid gap-2">
            {visibleEntryGroups.map((group) => (
              <li key={group.groupRef}>
                 <button
                  type="button"
                  data-testid="personal-workspace-entry-result"
                  className="flex min-h-14 w-full items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-left hover:border-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                  onClick={() => chooseEntryGroup(group.groupRef)}
                >
                    <span className="min-w-0">
                      <strong className="block break-words text-sm text-slate-950">
                        {group.kind === 'flow'
                          ? entryFlowDisplayTitle(group.children[0]?.flowRef ?? group.groupRef, group.title)
                          : group.title}
                      </strong>
                      {group.kind === 'map' ? <span className="mt-0.5 block text-xs text-slate-500">{group.children.length}개의 연결된 Flow</span> : null}
                  </span>
                  <span aria-hidden="true" className="text-teal-700">›</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {entryResolution && entryResolution.kind !== 'empty' ? (
        <button
          type="button"
          data-testid="personal-workspace-entry-start-authoring"
          data-product-primary={!selectedFlow ? 'new-flow-start' : undefined}
          className={`${selectedFlow ? SECONDARY_CLASS : PRIMARY_CLASS} mt-4 w-full`}
          onClick={() => beginAuthoring(entryResolution.rawInput)}
        >
          이 내용으로 새 Flow 작성
        </button>
      ) : (
        <button
          type="button"
          data-testid="personal-workspace-entry-start-template"
          className={`${SECONDARY_CLASS} mt-4 w-full`}
          onClick={startBlankWithTemplate}
        >
          빈 원문에 작성 틀 넣기
        </button>
      )}
    </section>
  );

  const renderPropertyEditorForm = (surface: 'inline' | 'dependent') => {
    if (!propertyEditor) return null;
    const isSingle = propertyEditor.kind === 'single';
    if (isSingle && propertyEditor.surface !== surface) return null;
    if (!isSingle && surface !== 'dependent') return null;
    const entry = isSingle ? getPersonalWorkspacePocAuthoringProperty(propertyEditor.key) : null;
    const singleInputType = entry?.editor === 'native-date'
      ? 'date'
      : entry?.editor === 'native-time'
        ? 'time'
        : entry?.valueKind === 'url'
          ? 'text'
          : 'text';
    return (
      <form
        data-testid="personal-workspace-authoring-property-editor"
        data-property-surface={surface}
        data-item-source-line={propertyEditor.itemSourceLine}
        className={surface === 'inline'
          ? 'mt-3 border-l-2 border-teal-600 bg-teal-50 px-3 py-3'
          : 'mt-4 rounded-lg border border-teal-300 bg-teal-50 p-3'}
        onSubmit={applyPropertyEditor}
      >
        {propertyEditor.kind === 'single' && entry ? (
          <label className="grid gap-2 text-sm font-semibold text-slate-900">
            {entry.label}
            <input
              data-testid="personal-workspace-authoring-property-input"
              type={singleInputType}
              value={propertyEditor.value}
              placeholder={entry.key === 'duration'
                ? '예: 30분'
                : entry.key === 'subcheck'
                  ? '예: 신분증 챙기기'
                  : entry.valueKind === 'url'
                    ? 'https://… 또는 [이름](https://…)'
                    : undefined}
              className="min-h-12 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-base outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
              onKeyDown={blockComposingPropertySubmit}
              onChange={(event) => setPropertyEditor((current) => current?.kind === 'single'
                ? { ...current, value: event.target.value }
                : current)}
            />
          </label>
        ) : propertyEditor.kind === 'time-zone' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-900">시간
              <input data-testid="personal-workspace-authoring-property-time" type="time" value={propertyEditor.time} className="min-h-12 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-base" onKeyDown={blockComposingPropertySubmit} onChange={(event) => setPropertyEditor((current) => current?.kind === 'time-zone' ? { ...current, time: event.target.value } : current)} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-900">시간대
              <input data-testid="personal-workspace-authoring-property-timezone" type="text" value={propertyEditor.timezone} placeholder="Asia/Seoul" className="min-h-12 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-base" onKeyDown={blockComposingPropertySubmit} onChange={(event) => setPropertyEditor((current) => current?.kind === 'time-zone' ? { ...current, timezone: event.target.value } : current)} />
            </label>
          </div>
        ) : propertyEditor.kind === 'recurrence' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-900">반복
              <input data-testid="personal-workspace-authoring-property-repeat" type="text" value={propertyEditor.repeat} placeholder="예: 매주 월, 수, 금" className="min-h-12 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-base" onKeyDown={blockComposingPropertySubmit} onChange={(event) => setPropertyEditor((current) => current?.kind === 'recurrence' ? { ...current, repeat: event.target.value } : current)} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-900">반복 종료 <span className="font-normal text-slate-500">선택</span>
              <input data-testid="personal-workspace-authoring-property-repeat-end" type="text" value={propertyEditor.repeatEnd} placeholder="2026-10-31 또는 10회" className="min-h-12 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-base" onKeyDown={blockComposingPropertySubmit} onChange={(event) => setPropertyEditor((current) => current?.kind === 'recurrence' ? { ...current, repeatEnd: event.target.value } : current)} />
            </label>
          </div>
        ) : null}
        <p className="mt-2 text-xs leading-5 text-slate-600">적용할 때만 이 항목의 원문을 한 번 바꾸며, Ctrl+Z 한 번으로 되돌릴 수 있습니다.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" data-testid="personal-workspace-authoring-property-cancel" className={SECONDARY_CLASS} onClick={() => { setPropertyEditor(undefined); setStatus({ kind: 'canceled', message: '값을 바꾸지 않았어요. 원문은 그대로입니다.' }); }}>취소</button>
          <button type="submit" data-testid="personal-workspace-authoring-property-apply" className={PRIMARY_CLASS}>적용</button>
        </div>
      </form>
    );
  };

  const renderAuthoringInput = () => (
    <section
      ref={authoringInputSectionRef}
      data-testid="personal-workspace-authoring-input-section"
      data-source-empty={rawText.length === 0 ? 'true' : 'false'}
      aria-labelledby="personal-workspace-authoring-write-heading"
      className={`${mobileStep === 'input' ? 'block' : 'hidden'} min-w-0 scroll-mt-20 lg:block lg:scroll-mt-0`}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold tracking-[0.12em] text-teal-800">원문</p>
          <h2 id="personal-workspace-authoring-write-heading" tabIndex={-1} className="mt-1 scroll-mt-24 text-xl font-semibold tracking-[-0.02em] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700">메모하듯 작성하세요</h2>
        </div>
        <button type="button" className="min-h-11 rounded-md px-3 text-xs font-semibold text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700" onClick={() => setAuthoringStarted(false)}>기존 Flow 찾기</button>
      </div>
      <p data-testid="personal-workspace-authoring-input-guidance" className="mt-2 break-keep text-sm leading-6 text-slate-600">원문은 그대로 남고, 명시한 <code>- [ ]</code> 행만 실행 항목이 됩니다.</p>

      <div data-testid="personal-workspace-authoring-template-control" className="mt-4 border-y border-slate-200 py-2">
        <button
          ref={templateToggleRef}
          type="button"
          data-testid="personal-workspace-authoring-template-picker-toggle"
          aria-expanded={templatePickerOpen}
          aria-controls={TEMPLATE_PICKER_ID}
          className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          onPointerDown={preserveEditorSelection}
          onClick={toggleTemplatePicker}
        >
          <span><span aria-hidden="true" className="mr-2 text-teal-700">＋</span>작성 틀</span>
          <span className="text-xs font-medium text-slate-500">빈 원문에서만</span>
        </button>
        {templatePickerOpen ? (
          <div ref={templatePickerRef} id={TEMPLATE_PICKER_ID} data-testid="personal-workspace-authoring-template-picker" className="grid gap-3 border-t border-slate-200 pt-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.map((template) => (
                <button
                  key={template.templateId}
                  type="button"
                  data-testid={`personal-workspace-authoring-template-${template.templateId}`}
                  data-preview-active={templatePreviewId === template.templateId ? 'true' : 'false'}
                  aria-controls={TEMPLATE_EXAMPLE_PREVIEW_ID}
                  className={`min-h-14 rounded-md border px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${templatePreviewId === template.templateId ? 'border-teal-700 bg-teal-50/60' : 'border-slate-200 hover:border-teal-700'}`}
                  onPointerMove={() => setTemplatePreviewId(template.templateId)}
                  onFocus={() => setTemplatePreviewId(template.templateId)}
                  onPointerDown={preserveEditorSelection}
                  onClick={() => applyTemplate(template.templateId)}
                >
                  <strong className="block text-sm">{template.label}</strong>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">{template.description}</span>
                  <span className="mt-1 block text-xs font-semibold text-teal-800">예: {template.exampleLabel}</span>
                </button>
              ))}
            </div>
            {templatePreview ? (
              <aside
                id={TEMPLATE_EXAMPLE_PREVIEW_ID}
                data-testid="personal-workspace-authoring-template-example-preview"
                className="min-w-0 rounded-md border border-teal-200 bg-teal-50/50 px-3 py-3"
              >
                <p aria-live="polite" className="text-xs font-semibold text-teal-900">입력 예시 · {templatePreview.exampleLabel}</p>
                <pre
                  data-testid="personal-workspace-authoring-template-example-source"
                  className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded bg-white px-3 py-2 font-mono text-xs leading-5 text-slate-700"
                >{templatePreview.exampleSource}</pre>
                <p className="mt-2 text-xs leading-5 text-slate-600">예시는 원문에 들어가지 않습니다. 틀을 넣으면 빈칸 가이드로만 보입니다.</p>
              </aside>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <PersonalWorkspacePocLiveEditor
          ref={sourceRef}
          editorId={AUTHORING_EDITOR_ID}
          documentId={AUTHORING_DOCUMENT_ID}
          initialValue={rawText}
          lineGuides={liveEditorLineGuides}
          disabled={pending.current}
          showReviewControl={false}
          onNativeInput={onNativeSourceInput}
          onSelectionChange={setEditorSnapshot}
          contextAction={availableHelperTarget ? {
            sourceLine: availableHelperTarget.line,
            owner: availableHelperTarget.kind,
            expanded: helperOpen,
            controlsId: HELPER_MENU_ID,
            onOpen: openHelper,
          } : undefined}
          inlinePanel={renderPropertyEditorForm('inline')}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs leading-5 text-slate-500">
        <span>입력 {rawText.length.toLocaleString('ko-KR')}자 · 실행 항목 {parsedItems.length}개</span>
        <span>가이드는 원문·복사·저장에 포함되지 않습니다.</span>
      </div>
      <button
        type="button"
        data-testid="personal-workspace-authoring-result-cta"
        data-product-primary="authoring-preview"
        data-sticky={resultCtaSticky ? 'true' : 'false'}
        className={`${PRIMARY_CLASS} ${resultCtaSticky ? 'sticky bottom-[max(.75rem,var(--personal-workspace-authoring-safe-bottom))] shadow-lg' : 'static shadow-none'} mt-4 w-full lg:hidden`}
        onClick={() => setMobileStep('result')}
      >
        결과 보기 · {parsedItems.length}개
      </button>
    </section>
  );

  const renderExistingResult = () => {
    if (!selectedFlow) {
      return (
        <div className="border-y border-slate-200 py-8 text-center text-sm leading-6 text-slate-500">왼쪽에서 기존 Flow를 고르면 여기에 미리보기가 나타납니다.</div>
      );
    }
    const items = visibleFlowItems(selectedFlow, integratedResult.resultView);
    return (
      <>
        {selectedGroup?.kind === 'map' ? (
          <label className="mb-4 grid gap-2 text-sm font-semibold text-slate-950">
            어떤 Flow를 볼까요?
            <select
              data-testid="personal-workspace-entry-map-child"
              value={selectedFlow.ref}
              className="min-h-12 rounded-md border border-slate-300 bg-white px-3 text-base outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
              onChange={(event) => chooseMapChild(event.target.value)}
            >
              {selectedGroup.children.map((child) => (
                <option key={child.flowRef} value={child.flowRef}>
                  {entryFlowDisplayTitle(child.flowRef, child.title)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <h3 id="personal-workspace-entry-result-heading" tabIndex={-1} className="break-words text-xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-teal-700">{entryFlowDisplayTitle(selectedFlow.ref, selectedFlow.title)}</h3>
        <div className="mt-3 flex gap-1 border-b border-slate-200" role="group" aria-label="결과 표현">
          {(['text', 'todo', 'calendar'] as const).map((view) => (
            <button
              key={view}
              type="button"
              data-testid={`personal-workspace-entry-view-${view}`}
              aria-pressed={integratedResult.resultView === view}
              className={`min-h-11 border-b-2 px-3 text-sm font-semibold ${integratedResult.resultView === view ? 'border-teal-700 text-teal-900' : 'border-transparent text-slate-500'}`}
              onClick={() => setIntegratedResult((current) => ({ ...current, resultView: view, openItemRef: null }))}
            >{view === 'text' ? 'Text' : view === 'todo' ? '할 일' : '날짜'}</button>
          ))}
        </div>
        <ol data-testid="personal-workspace-entry-flow-items" className="divide-y divide-slate-200">
          {items.map((item) => (
            <li key={item.ref} className="py-3">
              <button
                type="button"
                className="flex min-h-12 w-full items-start gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                onClick={() => setIntegratedResult((current) => ({ ...current, openItemRef: item.ref }))}
              >
                {integratedResult.resultView === 'todo' ? <span aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-slate-300" /> : null}
                <span className="min-w-0 flex-1">
                  <strong className="block break-words text-sm text-slate-950">{item.title}</strong>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{[item.sectionTitle, item.sourceDate].filter(Boolean).join(' · ') || '날짜 미정'}</span>
                </span>
              </button>
              {integratedResult.openItemRef === item.ref ? (
                <div data-testid="personal-workspace-entry-item-detail" className="mt-2 border-l-2 border-teal-600 bg-teal-50 px-3 py-2 text-sm leading-6 text-slate-700">{item.description || '원본 Flow의 실행 항목입니다. 개인 변경은 아직 기록하지 않았어요.'}</div>
              ) : null}
            </li>
          ))}
        </ol>
        {items.length === 0 ? <p className="py-5 text-sm text-slate-500">이 표현에서 보일 항목이 없습니다.</p> : null}
        <a data-testid="personal-workspace-entry-open-flow" data-product-primary="existing-flow-open" href={getPersonalWorkspacePocAuthoringOpenHref(selectedFlow.ref)} className={`${PRIMARY_CLASS} mt-4 inline-flex w-full items-center justify-center`}>개인공간에서 보기</a>
      </>
    );
  };

  const renderPropertyCatalogEntry = (
    entry: (typeof PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG)[number],
  ) => {
    if (!helperItemSourceLine) return null;
    const location = entry.sourceKind === 'property'
      ? propertyLocation(entry.key, helperItemSourceLine)
      : undefined;
    const present = location?.status === 'located';
    const editable = entry.writeSupport === 'editable';
    return (
      <li
        key={entry.key}
        data-testid={`personal-workspace-authoring-property-${entry.key}`}
        data-property-support={entry.writeSupport}
        data-property-editor={entry.editor}
        className="rounded-md border border-slate-200 bg-white px-3 py-2"
      >
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <strong className="block text-sm text-slate-900">{entry.label}</strong>
            <span className="mt-0.5 block text-xs leading-5 text-slate-500">
              {present ? '현재 값 있음' : editable ? '아직 입력하지 않음' : entry.blockedReason === 'requires-lossless-parser' ? '원문 손실 없는 parser가 필요함' : '현재 PoC에서 읽기 전용'}
              {entry.handoffSupport === 'preserved-blocking' && editable ? ' · 저장 전 정보 보존 확인 필요' : ''}
            </span>
          </div>
          <div className="flex shrink-0 gap-1">
            {present ? (
              <button
                type="button"
                data-testid={`personal-workspace-authoring-property-focus-${entry.key}`}
                className="min-h-11 rounded-md border border-slate-300 px-2 text-xs font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                onPointerDown={preserveEditorSelection}
                onClick={() => focusPropertyValue(entry.key, helperItemSourceLine)}
              >
                값 선택
              </button>
            ) : null}
            {editable ? (
              <button
                type="button"
                data-testid={`personal-workspace-authoring-property-edit-${entry.key}`}
                className="min-h-11 rounded-md border border-teal-700 px-2 text-xs font-semibold text-teal-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                onPointerDown={preserveEditorSelection}
                onClick={() => openPropertyEditor(entry.key, helperItemSourceLine)}
              >
                {present ? '바꾸기' : '추가'}
              </button>
            ) : (
              <span className="inline-flex min-h-11 items-center rounded-md bg-slate-100 px-2 text-xs font-semibold text-slate-500">보존만</span>
            )}
          </div>
        </div>
      </li>
    );
  };

  const renderAuthoringReceipt = () => receipt ? (
    <section
      data-testid="personal-workspace-authoring-receipt"
      data-product-receipt-only="true"
      role="status"
      aria-live="polite"
      aria-labelledby="personal-workspace-authoring-receipt-title"
      className="mx-auto max-w-xl border-y border-emerald-200 py-6 lg:mt-8"
    >
      <p className="text-sm font-semibold text-emerald-800">저장했어요</p>
      <h2 id="personal-workspace-authoring-receipt-title" tabIndex={-1} className="mt-1 break-words text-2xl font-semibold tracking-[-0.02em] text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-teal-700">{receipt.title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{receipt.itemCount}개 할 일을 개인공간에 저장했습니다. 폴더와 실행 날짜는 개인공간에서 바꿀 수 있어요.</p>
      <dl className="mt-4 grid gap-3 border-y border-slate-200 py-4 text-sm sm:grid-cols-2">
        <div><dt className="text-xs font-semibold text-slate-500">날짜</dt><dd className="mt-1 font-semibold text-slate-900">{receipt.dateRange ?? '날짜 미정'}</dd></div>
        <div><dt className="text-xs font-semibold text-slate-500">원문</dt><dd className="mt-1 font-semibold text-slate-900">입력한 그대로 보관</dd></div>
      </dl>
      <a
        data-testid="personal-workspace-authoring-open"
        data-product-primary="authoring-open-workspace"
        href={getPersonalWorkspacePocAuthoringOpenHref(receipt.flowRef)}
        className={`${PRIMARY_CLASS} mt-5 inline-flex w-full items-center justify-center`}
      >개인공간에서 열기</a>
    </section>
  ) : null;

  const renderLosslessSourceAdapter = () => {
    if (rawText.length === 0) return null;
    const copyRaw = async () => {
      try {
        await navigator.clipboard.writeText(losslessAnalysis.rawText);
        setStatus({ kind: 'neutral', message: '원문을 그대로 복사했어요. 저장 데이터는 바뀌지 않았어요.' });
      } catch {
        setStatus({ kind: 'failure', message: '원문을 복사하지 못했어요. 편집 영역에서 직접 복사해 주세요.' });
      }
    };
    if (losslessAnalysis.status === 'safe-table') {
      return (
        <section
          data-testid="personal-workspace-authoring-lossless-table"
          data-lossless-authoring-version={losslessAnalysis.version}
          data-source-mutation-count={losslessAnalysis.sourceMutationCount}
          data-generated-item-count={losslessAnalysis.projection.generatedItemCount}
          data-generated-todo-count={losslessAnalysis.projection.generatedTodoCount}
          data-generated-calendar-count={losslessAnalysis.projection.generatedCalendarCount}
          className="mb-4 rounded-lg border border-slate-200 bg-white p-3"
          aria-labelledby="personal-workspace-authoring-lossless-table-heading"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-teal-800">원문 표 · 무손실 보기</p>
              <h3 id="personal-workspace-authoring-lossless-table-heading" className="mt-1 text-sm font-semibold text-slate-950">행과 셀을 원문 위치 그대로 읽었습니다</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">표 행은 자료로만 보여 줍니다. 실행 항목이나 일정으로 임의 변환하지 않습니다.</p>
            </div>
            <button type="button" className={SECONDARY_CLASS} onClick={() => void copyRaw()}>원문 복사</button>
          </div>
          <div className="mt-3 max-w-full overflow-x-auto rounded-md border border-slate-200" tabIndex={0} aria-label="원문 표, 가로로 스크롤 가능">
            <table className="min-w-full border-collapse text-left text-xs leading-5">
              <thead className="bg-slate-100 text-slate-700"><tr>{losslessAnalysis.projection.headers.map((header, index) => <th key={`${header}:${index}`} scope="col" className="whitespace-nowrap border-b border-slate-300 px-3 py-2 font-semibold">{header}</th>)}</tr></thead>
              <tbody>{losslessAnalysis.projection.rows.map((row) => <tr key={row.projectionRowId} data-source-row-id={row.sourceRowId} className="border-b border-slate-200 last:border-b-0">{row.cells.map((cell) => <td key={`${row.projectionRowId}:${cell.columnIndex}`} className="max-w-80 whitespace-pre-wrap break-words px-3 py-2 align-top [overflow-wrap:anywhere]">{cell.value || '—'}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">{losslessAnalysis.projection.rows.length}개 SourceRow · 표 행은 자료로만 유지됩니다.</p>
        </section>
      );
    }
    if (losslessAnalysis.status === 'raw-fallback' || parsedItems.length === 0) {
      return (
        <section
          data-testid="personal-workspace-authoring-lossless-raw"
          data-lossless-status={losslessAnalysis.status}
          data-source-mutation-count={losslessAnalysis.sourceMutationCount}
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3"
        >
          <p className="text-sm font-semibold text-amber-950">이 내용은 구조를 추측하지 않고 원문으로 유지합니다.</p>
          <p className="mt-1 text-xs leading-5 text-amber-900">{losslessAnalysis.budget.physicalLines.toLocaleString('ko-KR')}줄 · {losslessAnalysis.budget.utf8Bytes.toLocaleString('ko-KR')}바이트 · 원문은 그대로 유지됩니다.</p>
          <button type="button" className={`${SECONDARY_CLASS} mt-3`} onClick={() => void copyRaw()}>원문 그대로 복사</button>
        </section>
      );
    }
    return null;
  };

  const renderAuthoringResult = () => (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.12em] text-teal-800">미리보기</p>
          <h2 id="personal-workspace-authoring-result-heading" tabIndex={-1} className="mt-1 scroll-mt-24 text-xl font-semibold tracking-[-0.02em] outline-none focus-visible:ring-2 focus-visible:ring-teal-700">저장할 내용</h2>
        </div>
        <button type="button" data-testid="personal-workspace-authoring-review-open" aria-expanded={reviewOpen} aria-controls="personal-workspace-authoring-review" aria-haspopup="dialog" className={`${SECONDARY_CLASS} shrink-0`} onClick={(event) => openReview(event.currentTarget)}>
          항목 검토 {issues.length > 0 ? issues.length : parsedItems.length}
        </button>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">왼쪽 원문을 바꾸면 결과가 바로 갱신됩니다. 저장 뒤 개인 계획에서 바꾼 제목·메모·날짜는 원문에 역으로 쓰지 않습니다.</p>

      <div data-testid="personal-workspace-authoring-artifact-result" className="mt-4 min-w-0 border-y border-slate-200 py-4">
        {renderLosslessSourceAdapter()}
        {authoringResultProjection ? (
          <PersonalWorkspacePocResultPresenter
            projection={authoringResultProjection}
            navigation={{
              ...authoringResultNavigation,
              selectedFlowRef: authoringResultProjection.flowRef,
              baseDate: authoringResultProjection.baseDate,
              selectedDate: authoringResultProjection.selectedDate,
            }}
            onResultViewChange={(resultView) => setAuthoringResultNavigation((current) => ({
              ...current,
              resultView,
              openItemRef: null,
            }))}
            onCalendarBaseDateChange={(baseDate) => setAuthoringResultNavigation((current) => ({
              ...current,
              baseDate,
              selectedDate: baseDate,
            }))}
            onCalendarSelectedDateChange={(selectedDate) => setAuthoringResultNavigation((current) => ({
              ...current,
              selectedDate,
            }))}
            onOpenItem={(intent) => {
              const item = authoringResultProjection.items.find(
                (candidate) =>
                  candidate.sourceItemRef === intent.itemRef || candidate.ref === intent.itemRef,
              );
              if (item?.sourceLine) focusIssue(item.sourceLine);
            }}
            headingId="personal-workspace-authoring-result-view-heading"
          />
        ) : (
          <div data-testid="personal-workspace-authoring-result-slots-pending" className="min-w-0">
            <div role="tablist" aria-label="결과 보기" className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 sm:grid-cols-4">
              {([
                ['text', 'TXT'],
                ['todo', '할 일'],
                ['calendar', '캘린더'],
                ['sheet', '표'],
              ] as const satisfies readonly (readonly [PersonalWorkspacePocPrimaryResultView, string])[]).map(([view, label]) => (
                <button key={view} type="button" role="tab" disabled aria-selected={authoringResultNavigation.resultView === view} className="min-h-12 rounded-md px-2 text-sm font-semibold text-slate-500 disabled:cursor-not-allowed disabled:opacity-70">{label}</button>
              ))}
            </div>
            <p className="py-8 text-center text-sm leading-6 text-slate-500">제목과 할 일을 올바른 형식으로 입력하면 네 결과가 함께 활성화됩니다.</p>
          </div>
        )}
      </div>

      {issues.length > 0 ? (
        <button type="button" data-testid="personal-workspace-authoring-issues" aria-expanded={reviewOpen} aria-controls="personal-workspace-authoring-review" aria-haspopup="dialog" className="mt-4 min-h-12 w-full border-l-2 border-rose-600 bg-rose-50 px-3 py-3 text-left text-sm font-semibold text-rose-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-700" onClick={(event) => openReview(event.currentTarget)}>
          저장 전 원문에서 고칠 내용 {issues.length}개
        </button>
      ) : null}

      <form className="mt-5 grid gap-4" onSubmit={commitHandoff}>
        <label className="grid gap-2 text-sm font-semibold">저장할 폴더
          <select data-testid="personal-workspace-authoring-folder" value={folderId} className="min-h-12 rounded-md border border-slate-300 bg-white px-3 text-base outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20" onChange={(event) => setFolderId(event.target.value)}>
            <option value="">미분류</option>
            {sortedFolders.map((folder) => <option key={folder.folderId} value={folder.folderId}>{folderLabel(state, folder.folderId)}</option>)}
          </select>
        </label>
        {lossFields.length > 0 ? (
          <><div className="rounded-md bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600"><strong className="block text-slate-900">저장 전에 확인할 내용</strong>{lossFields.map(lossFieldLabel).join(' · ')}</div><label className="flex min-h-12 cursor-pointer items-start gap-3 text-sm leading-6"><input type="checkbox" data-testid="personal-workspace-authoring-loss-confirm" checked={lossAccepted} className="mt-1 h-5 w-5 accent-teal-700" onChange={(event) => setLossAccepted(event.target.checked)} /><span>이 내용을 확인했어요.</span></label></>
        ) : null}
        <button type="submit" data-testid="personal-workspace-authoring-save" data-product-primary="authoring-save" className={`${PRIMARY_CLASS} sticky bottom-[max(.75rem,var(--personal-workspace-authoring-safe-bottom))] w-full shadow-lg lg:static lg:shadow-none`} disabled={pending.current}>{pending.current ? '저장 중…' : '내 Flow에 저장'}</button>
      </form>
    </>
  );

  const surfaceStyle = {
    '--personal-workspace-authoring-safe-top': 'env(safe-area-inset-top, 0px)',
    '--personal-workspace-authoring-safe-right': 'env(safe-area-inset-right, 0px)',
    '--personal-workspace-authoring-safe-bottom': 'env(safe-area-inset-bottom, 0px)',
    '--personal-workspace-authoring-safe-left': 'env(safe-area-inset-left, 0px)',
  } as CSSProperties;
  const overlayStyle = {
    '--poc-visual-viewport-top': `${visualViewport.top}px`,
    '--poc-visual-viewport-height': visualViewport.height > 0 ? `${visualViewport.height}px` : '100dvh',
    '--poc-visual-viewport-bottom': `${visualViewport.bottom}px`,
    ...(overlay?.kind === 'helper' ? {
      '--poc-helper-anchor-top': `${overlay.anchor.top}px`,
      '--poc-helper-anchor-bottom': `${overlay.anchor.bottom}px`,
      '--poc-helper-anchor-right': `${overlay.anchor.right}px`,
    } : {}),
  } as CSSProperties;

  return (
    <main data-testid="personal-workspace-authoring-shell" data-poc-storage-prefix="flow:poc:personal-workspace:v1:" className="min-h-dvh overflow-x-clip bg-white text-slate-950" style={surfaceStyle}>
      <style>{`
        [data-testid="personal-workspace-authoring-content"] {
          padding-top: max(.75rem, var(--personal-workspace-authoring-safe-top));
          padding-right: max(1rem, var(--personal-workspace-authoring-safe-right));
          padding-bottom: max(2.5rem, calc(var(--personal-workspace-authoring-safe-bottom) + 1rem));
          padding-left: max(1rem, var(--personal-workspace-authoring-safe-left));
        }
        [data-authoring-overlay] {
          bottom: calc(var(--poc-visual-viewport-bottom, 0px) + max(.5rem, var(--personal-workspace-authoring-safe-bottom)));
          max-height: min(28rem, calc(var(--poc-visual-viewport-height, 100dvh) - 1rem));
          overscroll-behavior: contain;
        }
        @media (max-width: 767px) { [data-testid="personal-workspace-authoring-shell"] textarea, [data-testid="personal-workspace-authoring-shell"] input, [data-testid="personal-workspace-authoring-shell"] select { font-size: 16px; } }
        @media (min-width: 900px) {
          [data-testid="personal-workspace-authoring-helper-menu"] {
            inset-inline: auto;
            right: max(.75rem, var(--poc-helper-anchor-right, .75rem));
            top: clamp(calc(var(--poc-visual-viewport-top, 0px) + .5rem), calc(var(--poc-helper-anchor-bottom, 0px) + .5rem), calc(var(--poc-visual-viewport-top, 0px) + var(--poc-visual-viewport-height, 100dvh) - 5rem));
            bottom: auto;
            width: 22rem;
          }
          [data-testid="personal-workspace-authoring-review"] {
            inset-inline: auto .75rem;
            top: calc(var(--poc-visual-viewport-top, 0px) + .5rem);
            bottom: calc(var(--poc-visual-viewport-bottom, 0px) + .5rem);
            width: min(28rem, calc(100vw - 1.5rem));
            max-height: none;
          }
        }
        @media (min-width: 1024px) { [data-testid="personal-workspace-authoring-columns"] { height: calc(100dvh - 12.5rem); min-height: 0; } [data-testid="personal-workspace-authoring-column"] { overflow-y: auto; overscroll-behavior: contain; } }
        @media (max-width: 1023px) and (max-height: 480px) and (orientation: landscape) {
          [data-testid="personal-workspace-authoring-shell"] { height: 100dvh; min-height: 0; overflow: hidden; }
          [data-testid="personal-workspace-authoring-content"] { display: flex; height: 100dvh; min-height: 0; flex-direction: column; padding-top: max(.25rem, var(--personal-workspace-authoring-safe-top)); padding-bottom: max(.5rem, var(--personal-workspace-authoring-safe-bottom)); }
          [data-testid="personal-workspace-authoring-shell"] [data-testid="platform-nav"] { margin-bottom: .25rem; padding-bottom: 0; }
          [data-testid="personal-workspace-authoring-local-header"] { display: none; }
          [data-testid="personal-workspace-authoring-scope-label"], [data-testid="personal-workspace-authoring-status-ready"] { display: none; }
          [data-testid="personal-workspace-authoring-status"] { margin-block: .25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-block: .25rem; }
          [data-testid="personal-workspace-authoring-mobile-stage-nav"] { margin-bottom: .375rem; }
          [data-testid="personal-workspace-authoring-mobile-stage-nav"] button, [data-testid="personal-workspace-live-editor-toolbar"] button { min-height: 2.75rem; }
          [data-testid="personal-workspace-authoring-columns"] { min-height: 0; flex: 1; overflow: hidden; }
          [data-testid="personal-workspace-authoring-column"] { height: 100%; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding-bottom: max(3.5rem, calc(var(--personal-workspace-authoring-safe-bottom) + 1rem)); }
          [data-testid="personal-workspace-authoring-input-section"] { scroll-margin-top: 0; }
          [data-testid="personal-workspace-authoring-input-section"] > div:first-child { align-items: center; }
          [data-testid="personal-workspace-authoring-input-guidance"] { margin-top: 0; }
          [data-testid="personal-workspace-authoring-input-section"][data-source-empty="false"] [data-testid="personal-workspace-authoring-template-control"] { display: none; }
          [data-testid="personal-workspace-authoring-input-section"] > div.mt-4 { margin-top: .25rem; }
          [data-testid="personal-workspace-live-editor-frame"], [data-testid="personal-workspace-live-editor-textarea"] { min-height: 10rem; }
        }
      `}</style>
      <div data-testid="personal-workspace-authoring-content" className="mx-auto max-w-[1240px] pb-10">
        <PlatformNav includeMobileTabs={false} />
        <header data-testid="personal-workspace-authoring-local-header" className="mt-3 flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="min-w-0"><h1 className="break-keep text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">새 Flow 만들기</h1></div>
          <a href="/my?personalWorkspacePoc=v1" className={`${SECONDARY_CLASS} inline-flex shrink-0 items-center`}><span aria-hidden="true" className="mr-1">←</span><span className="hidden sm:inline">개인공간</span><span className="sm:hidden">돌아가기</span></a>
        </header>

        {status.kind !== 'ready' ? <div data-testid="personal-workspace-authoring-status" data-status={status.kind} role={receipt ? undefined : status.kind === 'failure' ? 'alert' : 'status'} aria-live={receipt ? 'off' : status.kind === 'failure' ? 'assertive' : 'polite'} aria-hidden={receipt ? true : undefined} className={receipt ? 'sr-only' : `my-3 border-l-2 px-3 py-2 text-sm font-semibold ${statusClass(status.kind)}`}>{status.message}</div> : <p data-testid="personal-workspace-authoring-status-ready" className="sr-only">작성 중인 원문은 이 기기에 임시 보관됩니다.</p>}

        {showMobileStageNav ? <nav data-testid="personal-workspace-authoring-mobile-stage-nav" aria-label="작성 화면" className="mb-4 grid grid-cols-2 border-b border-slate-200 lg:hidden">
          <button type="button" data-testid="personal-workspace-authoring-tab-input" aria-current={mobileStep === 'input' ? 'page' : undefined} className={`min-h-12 border-b-2 px-2 text-sm font-semibold ${mobileStep === 'input' ? 'border-teal-700 text-teal-900' : 'border-transparent text-slate-500'}`} onClick={() => setMobileStep('input')}>입력</button>
          <button type="button" data-testid="personal-workspace-authoring-tab-result" aria-current={mobileStep === 'result' ? 'page' : undefined} className={`min-h-12 border-b-2 px-2 text-sm font-semibold ${mobileStep === 'result' ? 'border-teal-700 text-teal-900' : 'border-transparent text-slate-500'}`} onClick={() => setMobileStep('result')}>결과</button>
        </nav> : null}

        {receipt ? (
          <div id="personal-workspace-authoring-write-heading-anchor" data-testid="personal-workspace-authoring-columns" className="min-w-0">
            <div data-testid="personal-workspace-authoring-column" className="min-w-0">
              {renderAuthoringReceipt()}
            </div>
          </div>
        ) : (
          <div id="personal-workspace-authoring-write-heading-anchor" data-testid="personal-workspace-authoring-columns" className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)] lg:gap-10">
            <div data-testid="personal-workspace-authoring-column" className={`${mobileStep === 'input' ? 'block' : 'hidden'} min-w-0 lg:block lg:pr-2`}>{authoringStarted ? renderAuthoringInput() : renderEntryInput()}</div>
            <section data-testid="personal-workspace-authoring-column" aria-labelledby="personal-workspace-authoring-result-heading" className={`${mobileStep === 'result' ? 'block' : 'hidden'} min-w-0 lg:block lg:border-l lg:border-slate-200 lg:pl-8`}>
              {authoringStarted ? renderAuthoringResult() : <><p className="text-xs font-bold tracking-[0.12em] text-teal-800">결과</p><h2 id="personal-workspace-authoring-result-heading" tabIndex={-1} className="mt-1 text-xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-teal-700">기존 Flow 미리보기</h2><div className="mt-4">{renderExistingResult()}</div></>}
            </section>
          </div>
        )}
      </div>

      {overlay?.kind === 'helper' ? (
        <aside
          id={HELPER_MENU_ID}
          ref={overlayDialogRef}
          data-testid="personal-workspace-authoring-helper-menu"
          data-authoring-overlay="helper"
          role="dialog"
          aria-labelledby="personal-workspace-authoring-helper-heading"
          className="fixed inset-x-2 z-50 overflow-y-auto rounded-xl border border-slate-300 bg-white p-4 shadow-2xl"
          style={overlayStyle}
        >
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-teal-800">{overlay.target.kind === 'root-item' ? '현재 할 일 안에' : '현재 위치에'}</p><h2 ref={overlayHeadingRef} id="personal-workspace-authoring-helper-heading" tabIndex={-1} className="mt-1 text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-teal-700">무엇을 추가할까요?</h2></div><button type="button" className={`${SECONDARY_CLASS} shrink-0`} onClick={() => closeOverlay('내용을 추가하지 않았어요. 원문은 그대로입니다.')}>닫기</button></div>
          {PERSONAL_WORKSPACE_POC_AUTHORING_GUIDE_CATALOG.menuGroups.map((group) => {
            const actions = helperActions.filter((action) => action.groupId === group.groupId);
            if (overlay.target.kind === 'root-item' && group.groupId === 'item-information') return null;
            if (actions.length === 0) return null;
            return <section key={group.groupId} className="mt-4"><h3 className="text-xs font-semibold text-slate-500">{group.label}</h3><div className="mt-1 grid gap-1">{actions.map((action) => <button key={action.actionId} type="button" data-testid={`personal-workspace-authoring-helper-${action.actionId}`} disabled={action.availability !== 'enabled'} className="min-h-12 rounded-md border border-slate-200 px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 disabled:bg-slate-50 disabled:text-slate-400" onPointerDown={preserveEditorSelection} onClick={() => applyHelper(action.actionId)}><span className="font-mono text-xs text-teal-800" aria-hidden="true">{action.syntax}</span><strong className="ml-3 text-sm">{action.label}</strong>{action.blockedReason ? <span className="mt-1 block text-xs leading-5">{action.blockedReason}</span> : null}</button>)}</div></section>;
          })}
          {helperItemSourceLine ? (
            <section data-testid="personal-workspace-authoring-property-catalog" className="mt-4" aria-labelledby="personal-workspace-authoring-property-catalog-heading">
              <h3 id="personal-workspace-authoring-property-catalog-heading" className="text-xs font-semibold text-slate-500">항목 정보</h3>
              {([
                ['schedule', '일정'],
                ['execution', '실행'],
                ['content', '내용'],
                ['provenance', '더 보기'],
              ] as const).map(([group, label]) => (
                <section key={group} data-testid={`personal-workspace-authoring-property-group-${group}`} className="mt-3">
                  <h4 className="text-sm font-semibold text-slate-800">{label}</h4>
                  <ul className="mt-1 grid gap-1">
                    {PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG.filter((entry) => entry.group === group).map(renderPropertyCatalogEntry)}
                  </ul>
                </section>
              ))}
              {parsedItems.find((item) => item.sourceLine === helperItemSourceLine)?.subchecks?.length ? (
                <section data-testid="personal-workspace-authoring-subcheck-instances" className="mt-3">
                  <h4 className="text-sm font-semibold text-slate-800">현재 하위 체크</h4>
                  <ul className="mt-1 grid gap-1">
                    {parsedItems.find((item) => item.sourceLine === helperItemSourceLine)?.subchecks?.map((subcheck) => (
                      <li key={subcheck.subcheckId} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                        <span className="min-w-0 truncate text-sm">{subcheck.title}</span>
                        <button type="button" data-testid={`personal-workspace-authoring-subcheck-focus-${subcheck.sourceLine}`} className="min-h-11 shrink-0 rounded-md border border-slate-300 px-2 text-xs font-semibold" onPointerDown={preserveEditorSelection} onClick={() => focusPropertyValue('subcheck', helperItemSourceLine, subcheck.sourceLine)}>값 선택</button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </section>
          ) : null}
        </aside>
      ) : overlay?.kind === 'review' ? (
        <aside id="personal-workspace-authoring-review" ref={overlayDialogRef} data-testid="personal-workspace-authoring-review" data-authoring-overlay="review" role="dialog" aria-labelledby="personal-workspace-authoring-review-heading" className="fixed inset-x-2 z-50 overflow-y-auto rounded-xl border border-slate-300 bg-white p-4 shadow-2xl" style={overlayStyle}>
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-teal-800">선택형 검토</p><h2 ref={overlayHeadingRef} id="personal-workspace-authoring-review-heading" tabIndex={-1} className="mt-1 text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-teal-700">원문과 실행 항목</h2></div><button type="button" className={`${SECONDARY_CLASS} shrink-0`} onClick={() => closeOverlay()}>닫기</button></div>
          {nearMissTargets.length > 0 ? (
            <section data-testid="personal-workspace-authoring-near-miss-recovery" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3" aria-labelledby="personal-workspace-authoring-near-miss-heading">
              <h3 id="personal-workspace-authoring-near-miss-heading" className="text-sm font-semibold text-amber-950">할 일과 거의 같은 줄 {nearMissTargets.length}개</h3>
              <p className="mt-1 text-xs leading-5 text-amber-900">자동으로 바꾸지 않습니다. 고칠 줄을 직접 선택하세요.</p>
              <ul className="mt-2 grid gap-2">
                {nearMissTargets.map((target) => (
                  <li key={target.targetId} className="rounded-md bg-white p-2">
                    <strong className="block text-sm text-slate-900">원문 {target.sourceLine}행 · {target.title}</strong>
                    <button type="button" data-testid={`personal-workspace-authoring-near-miss-repair-${target.sourceLine}`} className={`${SECONDARY_CLASS} mt-2 w-full`} onClick={() => repairNearMiss(target)}>할 일 형식으로 고치기</button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {issues.length > 0 ? <ul className="mt-4 grid gap-2">{issues.map((issue, index) => <li key={`${issue.code}-${issue.line}-${index}`}><button type="button" className="min-h-12 w-full border-l-2 border-rose-600 bg-rose-50 px-3 py-2 text-left text-sm leading-6 text-rose-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-700" onClick={() => focusIssue(issue.line)}><strong className="block">{issueLocationLabel(issue.line)}</strong>{issue.message}</button></li>)}</ul> : <ol data-testid="personal-workspace-authoring-preview" className="mt-4 divide-y divide-slate-200">{parsedItems.map((item) => <li key={`${item.sourceLine}-${item.sourceOrder}`} className="py-3"><strong className="block text-sm">{item.title}</strong><span className="mt-1 block text-xs text-slate-500">원문 {item.sourceLine}행 · {[item.sectionTitle, item.resolvedDate].filter(Boolean).join(' · ') || '날짜 미정'}</span></li>)}</ol>}
        </aside>
      ) : null}
      {propertyEditor && (propertyEditor.kind !== 'single' || propertyEditor.surface === 'dependent') ? (
        <aside
          data-testid="personal-workspace-authoring-dependent-property-surface"
          data-authoring-overlay="dependent-property"
          role="dialog"
          aria-labelledby="personal-workspace-authoring-dependent-property-heading"
          className="fixed inset-x-2 z-50 max-h-[min(28rem,calc(100dvh-1rem))] overflow-y-auto rounded-xl border border-slate-300 bg-white p-4 shadow-2xl md:left-auto md:right-3 md:w-[24rem]"
          style={overlayStyle}
        >
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-semibold text-teal-800">원문 {propertyEditor.itemSourceLine}행</p><h2 ref={overlayHeadingRef} id="personal-workspace-authoring-dependent-property-heading" tabIndex={-1} className="mt-1 text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-teal-700">함께 설정할 값</h2></div>
            <button type="button" className={`${SECONDARY_CLASS} shrink-0`} onClick={() => { setPropertyEditor(undefined); setStatus({ kind: 'canceled', message: '값을 바꾸지 않았어요. 원문은 그대로입니다.' }); }}>닫기</button>
          </div>
          {renderPropertyEditorForm('dependent')}
        </aside>
      ) : null}
    </main>
  );
}
