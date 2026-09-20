'use client';

import React, {
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
import Link from 'next/link';
import type { PersonalWorkspacePocEntryNavigationBinding, PersonalWorkspacePocEntryNavigationPresentation } from '@/lib/flow/personal-workspace-poc-entry-navigation';
import { capturePersonalWorkspacePocEntryNavigation, isPersonalWorkspacePocEntryNavigationBindingCurrent,
  readPersonalWorkspacePocEntryNavigationBinding, observePersonalWorkspacePocEntryNavigation } from '@/lib/flow/personal-workspace-poc-entry-navigation-browser';
import { createPersonalWorkspacePocEntryAuthoringBridge, type PersonalWorkspacePocEntryOwnWriteTicket } from '@/lib/flow/personal-workspace-poc-entry-authoring-bridge';
import { createPersonalWorkspacePocEntryAuthoringTransition, type PersonalWorkspacePocEntryAuthoringTicket,
  type PersonalWorkspacePocEntryAuthoringTransition } from '@/lib/flow/personal-workspace-poc-entry-authoring-transition';

import {
  PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES,
  fingerprintPersonalWorkspacePocAuthoringSource,
  materializePersonalWorkspacePocAuthoring,
  type PersonalWorkspacePocAuthoringTemplate,
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
  derivePersonalWorkspacePocCreatorDraftSourceLabel,
  transitionPersonalWorkspacePocCreatorDraftLibrary,
  type PersonalWorkspacePocCreatorDraftLibrary as PersonalWorkspacePocCreatorDraftLibraryState,
} from '@/lib/flow/personal-workspace-poc-creator-drafts';
import { savePersonalWorkspacePocCreatorDraftLibrary } from '@/lib/flow/personal-workspace-poc-creator-draft-storage';
import { commitPersonalWorkspacePocCreatorDraftStorage } from '@/lib/flow/personal-workspace-poc-creator-draft-storage-transaction';
import {
  buildPersonalWorkspacePocCopyDisambiguation,
  getPersonalWorkspacePocFlowDisplayTitle,
} from '@/lib/flow/personal-workspace-poc-copy-disambiguation';
import { buildPersonalWorkspacePocEntryReadPacket, resolvePersonalWorkspacePocEntryRead } from '@/lib/flow/personal-workspace-poc-entry-read';
import { parsePersonalWorkspacePocSourceCandidateStore } from '@/lib/flow/personal-workspace-poc-source-candidate-storage';
import { PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY } from '@/lib/flow/personal-workspace-poc-source-candidates';
import { PERSONAL_WORKSPACE_POC_STATE_KEY } from '@/lib/flow/personal-workspace-poc-contract';
import {
  buildPersonalWorkspacePocMapGroupCatalog,
  reducePersonalWorkspacePocMapSelection,
  type PersonalWorkspacePocIntegratedResultState,
} from '@/lib/flow/personal-workspace-poc-map-selection';
import {
  createPersonalWorkspacePocSourceEditorTicket,
  planPersonalWorkspacePocHelperTransaction,
  planPersonalWorkspacePocSourceEditorTransaction,
  planPersonalWorkspacePocTemplateTransaction,
  type PersonalWorkspacePocSourceEditorTicket,
} from '@/lib/flow/personal-workspace-poc-source-editor';
import { buildPersonalWorkspacePocEditorLineGuides } from '@/lib/flow/personal-workspace-poc-editor-guidance';
import {
  createAuthoringChooser,
  getAuthoringChooserGroup,
  reduceAuthoringChooser,
  selectAuthoringChooser,
  type AuthoringChooserGroupKey,
  type AuthoringChooserGroup,
  type AuthoringChooserState,
} from '@/lib/flow/personal-workspace-poc-authoring-chooser';
import {
  PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG,
  PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION,
  planPersonalWorkspacePocValidationExampleApply,
  type PersonalWorkspacePocValidationExample,
} from '@/lib/flow/personal-workspace-poc-validation-examples';
import {
  PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CATALOG_VERSION,
  PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CONTRACT_VERSION,
  findPersonalWorkspacePocStructureTemplatePreview,
  planPersonalWorkspacePocStructureTemplatePreviewApply,
} from '@/lib/flow/personal-workspace-poc-structure-template';
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
  loadPersonalWorkspacePocAuthoringDraft,
  clearPersonalWorkspacePocAuthoringDraft,
  restorePersonalWorkspacePocAuthoringDraftBytes,
  savePersonalWorkspacePocAuthoringDraft,
  type PersonalWorkspacePocAuthoringDraft,
} from '@/lib/flow/personal-workspace-poc-storage';
import { commitPersonalWorkspacePocStorage } from '@/lib/flow/personal-workspace-poc-storage-transaction';

import {
  PersonalWorkspacePocLiveEditor,
  type PersonalWorkspacePocLiveEditorHandle,
  type PersonalWorkspacePocLiveEditorSnapshot,
} from './PersonalWorkspacePocLiveEditor';
import { PersonalWorkspacePocResultPresenter } from './PersonalWorkspacePocResultPresenter';
import { PersonalWorkspacePocEntryPreview } from './PersonalWorkspacePocEntryPreview';
import {
  PersonalWorkspacePocCreatorDraftLibrary,
  type PersonalWorkspacePocCreatorDraftLibraryItem,
} from './PersonalWorkspacePocCreatorDraftLibrary';
import { PersonalWorkspacePocValidationExampleExplorer } from './PersonalWorkspacePocValidationExampleExplorer';
import { PersonalWorkspacePocProductShell } from './PersonalWorkspacePocProductShell';

type PersonalWorkspacePocAuthoringSurfaceProps = Readonly<{
  initialModel: PersonalWorkspacePocReadModel;
  initialState: PersonalWorkspacePocState;
  restored: boolean;
  initialAuthoringDraft?: PersonalWorkspacePocAuthoringDraft;
  initialCreatorDraftLibrary: PersonalWorkspacePocCreatorDraftLibraryState;
  initialCreatorDraftLibraryRaw: string | null;
  initialSourceRaw?: string | null;
  initialEntryStateRaw?: string | null;
  initialEntryBinding?: PersonalWorkspacePocEntryNavigationBinding;
  initialEntryEpoch?: number;
  initialEntryReturn?: PersonalWorkspacePocEntryNavigationPresentation;
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

type MobileStep = 'input' | 'result' | 'library';

type AuthoringOverlay =
  | Readonly<{
      kind: 'helper';
      target: PersonalWorkspacePocAuthoringGuideTarget;
      ticket: PersonalWorkspacePocSourceEditorTicket;
      draftSerialized: string | null;
      itemTitle?: string;
      anchor: Readonly<{ top: number; bottom: number; right: number }>;
    }>
  | Readonly<{ kind: 'review' }>
  | Readonly<{
      kind: 'draft-switch';
      mode: 'open' | 'new';
      draftId?: string;
    }>;

export type PersonalWorkspacePocAuthoringPropertyOwner = Readonly<{
  snapshot: PersonalWorkspacePocLiveEditorSnapshot;
  itemTitle: string;
  draftSerialized: string | null;
}>;

/** Selection and scrolling do not change the source owner. A new source revision
 * does, including edit -> Undo (ABA) and a new document with the same bytes. */
export function isPersonalWorkspacePocAuthoringPropertyOwnerCurrent(
  owner: PersonalWorkspacePocAuthoringPropertyOwner,
  current: PersonalWorkspacePocLiveEditorSnapshot | null | undefined,
): boolean {
  const expected = owner.snapshot;
  return Boolean(current
    && expected.editorId === current.editorId
    && expected.documentId === current.documentId
    && expected.rawText === current.rawText
    && expected.sourceFingerprint === current.sourceFingerprint
    && expected.dispatchCount === current.dispatchCount);
}

type AuthoringPropertyEditor = Readonly<{
  owner: PersonalWorkspacePocAuthoringPropertyOwner;
}> & (
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
    }>);

type SourceHelperFeedback = Readonly<{
  kind: 'ready' | 'saving' | 'failed' | 'recovery-required';
  message?: string;
}>;

type HelperOverlay = Extract<AuthoringOverlay, Readonly<{ kind: 'helper' }>>;
type AuthoringChooserDraft = Readonly<{ editor: AuthoringPropertyEditor; feedback: SourceHelperFeedback }>;
type AuthoringChooser = AuthoringChooserState<HelperOverlay, AuthoringChooserDraft>;
type AuthoringChooserNavigation =
  | Readonly<{ type: 'show-groups' | 'back' }>
  | Readonly<{ type: 'choose-group'; group: AuthoringChooserGroupKey }>
  | Readonly<{ type: 'close'; reason: 'cancel' | 'tab' | 'outside' | 'external' }>;

type AuthoringPropertyEditorReturn = Readonly<{
  opener: HTMLButtonElement;
  overlay?: Extract<AuthoringOverlay, Readonly<{ kind: 'helper' }>>;
  propertyKey: PersonalWorkspacePocAuthoringPropertyKey;
}>;

const AUTHORING_EDITOR_ID = 'personal-workspace-poc-source-v2';
const AUTHORING_DOCUMENT_ID = 'personal-workspace-poc-draft-v1';
const HELPER_MENU_ID = 'personal-workspace-authoring-helper-menu';
const TEMPLATE_PICKER_ID = 'personal-workspace-authoring-template-picker';
const TEMPLATE_EXAMPLE_PREVIEW_ID = 'personal-workspace-authoring-template-example-preview';
const DEFAULT_TEMPLATE_PREVIEW_ID: PersonalWorkspacePocAuthoringTemplateId = 'exercise-phased-4w-v1';
const ENTRY_AUTHORING_HISTORY = '__flowmePocEntryAuthoringConfirmV1';
const PREVIEW_COMMITTED_AT = '2000-01-01T00:00:00.000Z';
const CONTROL_CLASS = 'min-h-12 rounded-md px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] disabled:cursor-not-allowed disabled:opacity-50';
const SECONDARY_CLASS = `${CONTROL_CLASS} border border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] text-[var(--flowme-text)] hover:border-[var(--flowme-action)]`;
const PRIMARY_CLASS = `${CONTROL_CLASS} bg-[var(--flowme-action)] text-white hover:bg-[var(--flowme-action-hover)]`;

/** Native buttons, not an incomplete ARIA menu: Tab keeps document order. */
export function PersonalWorkspacePocAuthoringChooserGroups({ groups, disabled, onChoose }: Readonly<{
  groups: readonly AuthoringChooserGroup[];
  disabled: boolean;
  onChoose: (group: AuthoringChooserGroupKey) => void;
}>) {
  return <div data-testid="personal-workspace-authoring-chooser-groups" className="mt-3 grid grid-cols-2 gap-2">{groups.map((group) => <button key={group.key} type="button" data-testid={`personal-workspace-authoring-chooser-group-${group.key}`} className={`${SECONDARY_CLASS} text-left`} disabled={disabled} onClick={() => onChoose(group.key)}>{group.label}</button>)}</div>;
}

export function PersonalWorkspacePocAuthoringTemplatePreview({ template, structure, disabled, onApplyScaffold, onApplyExample }: Readonly<{
  template: PersonalWorkspacePocAuthoringTemplate;
  structure: ReturnType<typeof findPersonalWorkspacePocStructureTemplatePreview>;
  disabled: boolean;
  onApplyScaffold: () => void;
  onApplyExample: () => void;
}>) {
  return (
    <aside
      id={TEMPLATE_EXAMPLE_PREVIEW_ID}
      data-testid="personal-workspace-authoring-template-example-preview"
      data-structure-contract={structure?.contractVersion ?? 'unavailable'}
      data-structure-catalog={structure?.catalogVersion ?? 'unavailable'}
      className="min-w-0 border-t border-slate-200 pt-3"
    >
      <p aria-live="polite" className="text-sm font-semibold text-slate-900">{template.label} · 빈 틀</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">아래 틀을 넣은 뒤 빈칸을 직접 채울 수 있어요.</p>
      <pre
        data-testid="personal-workspace-authoring-template-scaffold-source"
        className="mt-2 max-h-44 min-w-0 overflow-auto whitespace-pre-wrap rounded bg-slate-50 px-3 py-2 font-mono text-xs leading-5 text-slate-700 [overflow-wrap:anywhere]"
      >{template.scaffold}</pre>
      <button type="button" data-testid="personal-workspace-authoring-template-apply" disabled={disabled} className={`${PRIMARY_CLASS} mt-3 w-full`} onPointerDown={preserveEditorSelection} onClick={onApplyScaffold}>빈 틀 넣기</button>
      {!structure ? (
        <p role="alert" className="mt-3 text-xs font-semibold leading-5 text-rose-800">예시 정보를 확인하지 못했어요. 빈 틀은 사용할 수 있습니다.</p>
      ) : (
        <>
          <details data-testid="personal-workspace-authoring-template-completed-example" className="mt-3 border-t border-slate-200">
            <summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700">완성 예시 보기</summary>
            <p className="text-sm font-semibold text-slate-900">{template.exampleLabel}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">이 예시로 시작하면 아래 내용이 원문에 들어가요. 내 상황에 맞게 고쳐 쓸 수 있습니다.</p>
            <pre data-testid="personal-workspace-authoring-template-example-source" className="mt-2 max-h-44 min-w-0 overflow-auto whitespace-pre-wrap rounded bg-slate-50 px-3 py-2 font-mono text-xs leading-5 text-slate-700 [overflow-wrap:anywhere]">{structure.expectedRawText}</pre>
            <button type="button" data-testid="personal-workspace-authoring-structure-materialize" disabled={disabled} className={`${SECONDARY_CLASS} mt-3 w-full`} onPointerDown={preserveEditorSelection} onClick={onApplyExample}>이 예시로 시작</button>
          </details>
          <details data-testid="personal-workspace-authoring-template-technical-details" className="mt-3 border-t border-slate-200">
            <summary className="min-h-12 cursor-pointer py-3 text-xs font-medium text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700">검증 정보</summary>
            <p className="text-xs leading-5 text-slate-600">StructureDraft {structure.contractVersion} 컴파일 예시 · 카탈로그 {structure.catalogVersion} · 틀 {structure.templateVersion} · Item {structure.expectedItemCount}개</p>
          </details>
        </>
      )}
    </aside>
  );
}

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
  return 'border-slate-300 bg-slate-50 text-slate-800';
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
  if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) {
    event.preventDefault();
  }
}

function issueLocationLabel(line: number): string {
  return line > 0 ? `원문 ${line}행` : '원문 전체';
}
function entryLocalDate(): string {
  const date = new Date();
  return [String(date.getFullYear()), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function PersonalWorkspacePocAuthoringSurface({
  initialModel,
  initialState,
  restored,
  initialAuthoringDraft,
  initialCreatorDraftLibrary,
  initialCreatorDraftLibraryRaw,
  initialSourceRaw = null,
  initialEntryStateRaw,
  initialEntryBinding,
  initialEntryEpoch,
  initialEntryReturn,
}: PersonalWorkspacePocAuthoringSurfaceProps) {
  const initialTemplateId = PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.find(
    (entry) => entry.templateId === initialAuthoringDraft?.templateId,
  )?.templateId;
  const [state, setState] = useState(initialState);
  const [creatorDraftLibrary, setCreatorDraftLibrary] = useState(initialCreatorDraftLibrary);
  const [creatorDraftLibraryRaw, setCreatorDraftLibraryRaw] = useState<string | null>(
    initialCreatorDraftLibraryRaw,
  );
  const [currentCreatorDraftId, setCurrentCreatorDraftId] = useState(
    initialAuthoringDraft?.creatorBinding?.draftId,
  );
  const [editorDocumentEpoch, setEditorDocumentEpoch] = useState(0);
  const [entryInput, setEntryInput] = useState(initialEntryReturn?.entryInput ?? '');
  const [entryPreview, setEntryPreview] = useState<PersonalWorkspacePocEntryNavigationPresentation['preview']>(
    initialEntryReturn?.preview ?? { owner: 'personal-copy', resultView: 'text' },
  );
  const entryListScroll = useRef(initialEntryReturn?.listReturn ?? { documentY: 0, inputY: 0 });
  const entryFocusHandled = useRef(false);
  const entryReturnApplied = useRef(false);
  const [entryBinding, setEntryBinding] = useState(initialEntryBinding);
  const [entryEpoch, setEntryEpoch] = useState(initialEntryEpoch);
  const [entryToday, setEntryToday] = useState(entryLocalDate);
  const [entryStale, setEntryStale] = useState(false);
  const entryInvalidated = useRef(false);
  const [rawText, setRawText] = useState(initialAuthoringDraft?.rawText ?? '');
  const [authoringStarted, setAuthoringStarted] = useState(!initialEntryReturn && Boolean(
    initialAuthoringDraft?.rawText || initialAuthoringDraft?.creatorBinding,
  ));
  const authoringWasStarted = useRef(authoringStarted);
  if (authoringStarted) authoringWasStarted.current = true;
  const [templateId, setTemplateId] = useState<PersonalWorkspacePocAuthoringTemplateId | undefined>(initialTemplateId);
  const [folderId, setFolderId] = useState('');
  const [lossAccepted, setLossAccepted] = useState(false);
  const [mobileStep, setMobileStep] = useState<MobileStep>(initialEntryReturn?.panel === 'preview' ? 'result' : 'input');
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [validationExamplesOpen, setValidationExamplesOpen] = useState(false);
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
    ...(initialEntryReturn?.groupRef ? { selectedGroupRef: initialEntryReturn.groupRef, selectedFlowRef: initialEntryReturn.flowRef } : {}),
  });
  const [authoringResultNavigation, setAuthoringResultNavigation] = useState<PersonalWorkspacePocResultNavigationState>({
    resultView: 'text',
  });
  const [propertyEditor, setPropertyEditor] = useState<AuthoringPropertyEditor>();
  const [chooser, setChooserState] = useState<AuthoringChooser>();
  const chooserRef = useRef<AuthoringChooser | undefined>(undefined);
  const setChooser = useCallback((next: AuthoringChooser | undefined) => {
    chooserRef.current = next;
    setChooserState(next);
  }, []);
  const [propertyOwnerSelecting, setPropertyOwnerSelecting] = useState(false);
  const [sourceHelperFeedback, setSourceHelperFeedback] = useState<SourceHelperFeedback>({ kind: 'ready' });
  const [receipt, setReceipt] = useState<AuthoringReceipt>();
  const [status, setStatus] = useState<AuthoringStatus>({
    kind: initialEntryReturn || initialAuthoringDraft?.rawText || initialAuthoringDraft?.creatorBinding ? 'success' : 'ready',
    message: initialEntryReturn ? '선택한 미리보기로 돌아왔어요.' : initialAuthoringDraft?.creatorBinding
      ? `“${initialCreatorDraftLibrary.records[initialAuthoringDraft.creatorBinding.draftId]?.title ?? '제작자 초안'}”에서 저장하지 않은 변경을 복구했어요.`
      : initialAuthoringDraft?.rawText
        ? '이 기기에 보관한 작성 중 원문을 복원했어요.'
      : restored
        ? '개인공간 상태를 복원했어요. 기존 Flow를 찾거나 새 원문을 시작하세요.'
        : '기존 Flow를 찾거나 메모·링크로 새 Flow를 시작하세요.',
  });

  const pending = useRef(false);
  const lastDraftPersistenceOk = useRef(true);
  const sourceHelperPersistence = useRef<Readonly<{
    documentId: string;
    nextRawText: string;
  }> | null>(null);
  const sourceHelperRecoveryRequired = useRef(false);
  const propertyInputComposing = useRef(false);
  const sourceRef = useRef<PersonalWorkspacePocLiveEditorHandle>(null);
  const pendingSourceFocus = useRef<Readonly<{ start: number; end: number }> | undefined>(undefined);
  const overlayOpenerRef = useRef<HTMLElement | null>(null);
  const propertyEditorOpenerRef = useRef<AuthoringPropertyEditorReturn | null>(null);
  const overlayDialogRef = useRef<HTMLElement>(null);
  const overlayHeadingRef = useRef<HTMLHeadingElement>(null);
  const templateToggleRef = useRef<HTMLButtonElement>(null);
  const validationExamplesToggleRef = useRef<HTMLButtonElement>(null);
  const templatePickerRef = useRef<HTMLDivElement>(null);
  const authoringInputSectionRef = useRef<HTMLElement>(null);
  const stepFocusReady = useRef(false);
  const transactionSequence = useRef(0);
  const consumedTransactionIds = useRef<string[]>([]);
  const pendingTemplateId = useRef<PersonalWorkspacePocAuthoringTemplateId | undefined>(undefined);
  const templateIdRef = useRef(initialTemplateId);

  const [entryAuthoringBridge] = useState(() => createPersonalWorkspacePocEntryAuthoringBridge(initialEntryBinding));
  const entryDocumentId = useRef('');
  entryDocumentId.current = `${AUTHORING_DOCUMENT_ID}:${currentCreatorDraftId ?? 'personal'}:${editorDocumentEpoch}`;
  const entryTransition = useRef<PersonalWorkspacePocEntryAuthoringTransition | undefined>(undefined);
  const entryAttempt = useRef<Readonly<{ ticket: PersonalWorkspacePocEntryAuthoringTicket; ownTicket: PersonalWorkspacePocEntryOwnWriteTicket; raw: string }> | undefined>(undefined);
  const [entryAuthoringPanel, setEntryAuthoringPanel] = useState<Readonly<{ kind: 'confirm' | 'saving' | 'failed' | 'stale' | 'recovery-required'; raw: string }> | undefined>();
  const entryComposing = useRef(false);
  const [entryCompositionActive, setEntryCompositionActive] = useState(false);
  const entryCommitFrame = useRef<number | undefined>(undefined);
  const entryMounted = useRef(true);
  const entryConfirmHistory = useRef<string | undefined>(undefined);
  const entryHistoryConsuming = useRef(false);
  const [entryHistoryPending, setEntryHistoryPending] = useState(false);
  const entryHistoryRestore = useRef<(() => void) | undefined>(undefined);
  const entryReturnSnapshot = useRef<PersonalWorkspacePocLiveEditorSnapshot | null>(null);
  const entryReturnDocumentY = useRef(0);
  const entryReturnStatus = useRef<AuthoringStatus | undefined>(undefined);

  const entryWriteFailure = useCallback(() => {
    setStatus({ kind: 'failure', message: entryAuthoringBridge.isLocked()
      ? '저장된 내용이 바뀌었거나 복구를 확인하지 못해 추가 쓰기를 멈췄어요. 화면의 원문은 복사할 수 있습니다.'
      : '저장 상태를 읽지 못해 작업하지 않았어요. 현재 원문은 화면에 그대로 있습니다.' });
  }, [entryAuthoringBridge]);
  const currentOwnedEntry = useCallback(() => {
    const current = readPersonalWorkspacePocEntryNavigationBinding();
    return entryAuthoringBridge.inspect(current);
  }, [entryAuthoringBridge]);
  const beginOwnedEntryWrite = () => {
    if (entryAttempt.current || entryHistoryConsuming.current || sourceHelperRecoveryRequired.current) return undefined;
    const ticket = entryAuthoringBridge.begin(readPersonalWorkspacePocEntryNavigationBinding());
    if (!ticket) entryWriteFailure();
    return ticket;
  };
  const canApplyOwnedNativeSource = () => {
    if (entryAttempt.current || entryHistoryConsuming.current || sourceHelperRecoveryRequired.current) return false;
    if (currentOwnedEntry()) return true;
    entryWriteFailure(); return false;
  };
  const finishOwnedEntryWrite = (ticket: PersonalWorkspacePocEntryOwnWriteTicket,
    updates: Partial<Pick<PersonalWorkspacePocEntryNavigationBinding, 'draftRaw' | 'libraryRaw' | 'stateRaw'>>) => {
    const ok = entryAuthoringBridge.finish(ticket, readPersonalWorkspacePocEntryNavigationBinding(), updates);
    if (!ok) entryWriteFailure();
    return ok;
  };
  const abandonFailedEntryWrite = (ticket: PersonalWorkspacePocEntryOwnWriteTicket) => {
    entryAuthoringBridge.abandon(ticket);
    // A verified rollback retains the old ownership. Foreign bytes latch; an
    // unavailable read is not silently adopted as a new baseline.
    if (!currentOwnedEntry()) entryWriteFailure();
  };
  const commitOwnedCreatorDraftStorage = (input: Parameters<typeof commitPersonalWorkspacePocCreatorDraftStorage>[0]): ReturnType<typeof commitPersonalWorkspacePocCreatorDraftStorage> => {
    const ticket = beginOwnedEntryWrite();
    if (!ticket) return { ok: false, error: 'entry-write-blocked', rollback: 'not-needed' };
    const saved = commitPersonalWorkspacePocCreatorDraftStorage(input);
    if (!saved.ok) { abandonFailedEntryWrite(ticket); return saved; }
    return finishOwnedEntryWrite(ticket, { draftRaw: saved.serializedAuthoringDraft, libraryRaw: saved.serializedLibrary })
      ? saved : { ok: false, error: 'entry-write-owner-changed', rollback: 'recovery-required' };
  };
  const commitOwnedHandoffStorage = (input: Parameters<typeof commitPersonalWorkspacePocStorage>[0]): ReturnType<typeof commitPersonalWorkspacePocStorage> => {
    const ticket = beginOwnedEntryWrite();
    if (!ticket) return { ok: false, error: 'entry-write-blocked', rollback: 'recovery-required' };
    const saved = commitPersonalWorkspacePocStorage(input);
    if (!saved.ok) { abandonFailedEntryWrite(ticket); return saved; }
    return finishOwnedEntryWrite(ticket, { draftRaw: null, stateRaw: saved.serializedState })
      ? saved : { ok: false, error: 'entry-write-owner-changed', rollback: 'recovery-required' };
  };
  useEffect(() => {
    entryMounted.current = true;
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea && event.storageArea !== window.localStorage) return;
      if (event.key !== null && !event.key.startsWith('flow:') && !event.key.startsWith('flow_builder_mvp_')) return;
      entryAuthoringBridge.invalidate();
      entryInvalidated.current = true;
      setEntryStale(true);
      entryWriteFailure();
    };
    const check = () => {
      // A synchronous/owned writer verifies its own post-read packet. A focus
      // event must not mistake the in-flight candidate for a foreign document.
      if (!pending.current && !entryAttempt.current && !currentOwnedEntry()) entryWriteFailure();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      entryMounted.current = false;
      if (entryCommitFrame.current !== undefined) window.cancelAnimationFrame(entryCommitFrame.current);
      const attempt = entryAttempt.current;
      if (attempt) { entryTransition.current?.cancel(attempt.ticket); entryAuthoringBridge.abandon(attempt.ownTicket); entryAttempt.current = undefined; }
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [entryAuthoringBridge, currentOwnedEntry, entryWriteFailure]);

  const sourceRead = useMemo(() => initialSourceRaw === null ? undefined : parsePersonalWorkspacePocSourceCandidateStore(initialSourceRaw), [initialSourceRaw]);
  const composedModelResult = useMemo(() => sourceRead && !sourceRead.ok ? sourceRead
    : composePersonalWorkspacePocReadModel(initialModel, state, sourceRead?.ok ? sourceRead.store : undefined), [initialModel, state, sourceRead]);
  const effectiveModel = composedModelResult.ok ? composedModelResult.model : initialModel;
  const entryPacket = useMemo(() => entryStale ? { ok: false as const, reason: 'entry-read-stale' }
    : buildPersonalWorkspacePocEntryReadPacket({ baseModel: initialModel, state, sourceRead: { ok: true, raw: initialSourceRaw } }),
  [entryStale, initialModel, state, initialSourceRaw]);
  const entryResult = useMemo(
    () => entryPacket.ok ? resolvePersonalWorkspacePocEntryRead(entryPacket.packet, entryInput) : entryPacket,
    [entryPacket, entryInput],
  );
  const entryIsCurrent = useCallback(() => {
    if (entryInvalidated.current) return false;
    setEntryToday(entryLocalDate());
    if (entryBinding && entryEpoch !== undefined) {
      if (isPersonalWorkspacePocEntryNavigationBindingCurrent(entryBinding, entryEpoch)) return true;
      entryInvalidated.current = true; setEntryStale(true); return false;
    }
    // Boot supplies both exact bytes. Isolated SSR consumers have no browser binding.
    if (initialEntryStateRaw === undefined) return true;
    try {
      if (window.localStorage.getItem(PERSONAL_WORKSPACE_POC_STATE_KEY) === initialEntryStateRaw
        && window.localStorage.getItem(PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY) === initialSourceRaw) return true;
    } catch { /* A failed read is not empty storage. */ }
    entryInvalidated.current = true;
    setEntryStale(true);
    return false;
  }, [initialEntryStateRaw, initialSourceRaw, entryBinding, entryEpoch]);
  useEffect(() => {
    if (!initialEntryReturn || entryReturnApplied.current) return;
    const frame = window.requestAnimationFrame(() => {
      if (entryReturnApplied.current) return;
      entryReturnApplied.current = true;
      if (!entryIsCurrent()) return;
      const columns = document.querySelectorAll<HTMLElement>('[data-testid="personal-workspace-authoring-column"]');
      const target = initialEntryReturn.focus === 'workspace-link'
        ? document.querySelector<HTMLElement>('[data-testid="personal-workspace-entry-open-flow"]')
        : document.getElementById(initialEntryReturn.focus === 'input' ? 'personal-workspace-entry-input' : 'personal-workspace-entry-result-heading');
      target?.focus({ preventScroll: true });
      if (columns[0]) columns[0].scrollTop = initialEntryReturn.scroll.inputY;
      if (columns[1]) columns[1].scrollTop = initialEntryReturn.scroll.resultY;
      window.scrollTo({ top: initialEntryReturn.scroll.documentY, behavior: 'instant' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialEntryReturn, entryIsCurrent]);
  useEffect(() => {
    if (authoringStarted) return;
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea && event.storageArea !== window.localStorage) return;
      if (event.key === null || event.key === PERSONAL_WORKSPACE_POC_STATE_KEY || event.key === PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY) {
        entryInvalidated.current = true; setEntryStale(true);
      }
    };
    const check = () => { entryIsCurrent(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
  }, [authoringStarted, entryIsCurrent]);
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
      purpose: 'authoring-preview',
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
  const currentCreatorDraft = currentCreatorDraftId
    ? creatorDraftLibrary.records[currentCreatorDraftId]
    : undefined;
  const currentCreatorDraftDirty = currentCreatorDraft
    ? currentCreatorDraft.rawText !== rawText || currentCreatorDraft.templateId !== templateId
    : rawText.trim().length > 0;
  const creatorDraftItems = useMemo<readonly PersonalWorkspacePocCreatorDraftLibraryItem[]>(
    () => Object.values(creatorDraftLibrary.records).map((draft) => {
      const draftPreview = materializePersonalWorkspacePocAuthoring({
        ...buildPersonalWorkspacePocAuthoringIdentity(draft.sourceFingerprint),
        rawText: draft.rawText,
        committedAt: draft.updatedAt,
        ...(draft.templateId ? { templateId: draft.templateId } : {}),
      });
      return {
        draftId: draft.draftId,
        title: draft.title,
        sourceLabel: derivePersonalWorkspacePocCreatorDraftSourceLabel(draft.rawText),
        itemCount: draftPreview.parseResult.items.length,
        unresolvedIssueCount: draftPreview.parseResult.blockingIssues.length,
        status: draft.status,
        revision: draft.recordRevision,
        updatedAt: draft.updatedAt,
      };
    }),
    [creatorDraftLibrary.records],
  );
  const entryFlowDisplayTitle = (flowRef: string, fallbackTitle: string): string => {
    const flow = entryFlowByRef.get(flowRef);
    return flow
      ? getPersonalWorkspacePocFlowDisplayTitle(flow, entryCopyDisplays)
      : fallbackTitle;
  };
  const showMobileStageNav = !receipt && mobileStep !== 'library' && (
    authoringStarted
    || Boolean(selectedFlow)
    || creatorDraftItems.length > 0
  );
  const selectedGroup = mapCatalogResult.ok
    ? mapCatalogResult.catalog.groups.find(
        (group) => group.groupRef === integratedResult.selectedGroupRef,
      )
    : undefined;
  const templatePreview = PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.find(
    (entry) => entry.templateId === templatePreviewId,
  ) ?? PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES[0];
  const structureTemplatePreview = findPersonalWorkspacePocStructureTemplatePreview(
    templatePreviewId,
    {
      catalogVersion: PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CATALOG_VERSION,
      contractVersion: PERSONAL_WORKSPACE_POC_STRUCTURE_TEMPLATE_PREVIEW_CONTRACT_VERSION,
    },
  );
  // Keep the next-stage action in document flow while a helper owns the local
  // decision. On short screens a sticky CTA otherwise covers retry/cancel.
  const resultCtaSticky = !propertyEditor && !templatePickerOpen && !editorIntersectsViewport;

  const liveEditorLineGuides = useMemo(() => buildPersonalWorkspacePocEditorLineGuides({
    rawText,
    sourceFingerprint,
    view: 'flow',
    selectionStart: editorSnapshot?.selectionStart ?? 0,
    selectionEnd: editorSnapshot?.selectionEnd ?? 0,
    ghostEnabled: true,
    fidelityManifest: preview.parseResult.fidelityManifest,
    issues,
  }), [editorSnapshot?.selectionEnd, editorSnapshot?.selectionStart, issues, preview.parseResult.fidelityManifest, rawText, sourceFingerprint]);
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
  const chooserView = chooser ? selectAuthoringChooser(chooser) : undefined;
  const dependentPropertyOpen = Boolean(propertyEditor && !propertyOwnerSelecting && (
    propertyEditor.kind !== 'single' || propertyEditor.surface === 'dependent'
  ));
  const inlinePropertyEditorActive = Boolean(
    propertyEditor && !dependentPropertyOpen && mobileStep === 'input' && authoringStarted && !receipt,
  );
  const reviewOpen = overlay?.kind === 'review';
  const helperTarget = overlay?.kind === 'helper' ? overlay.target : undefined;
  const helperTicket = overlay?.kind === 'helper' ? overlay.ticket : undefined;
  const helperIsStale = Boolean(chooser && !isPersonalWorkspacePocAuthoringPropertyOwnerCurrent({
    snapshot: chooser.owner.ticket.expected, itemTitle: chooser.owner.itemTitle ?? '', draftSerialized: chooser.owner.draftSerialized,
  }, editorSnapshot));
  const helperActions = helperTarget
    ? helperTarget.allowedActionIds
        .map((actionId) => getPersonalWorkspacePocAuthoringMenuAction(actionId))
        .filter((action): action is PersonalWorkspacePocAuthoringMenuAction => Boolean(action))
    : [];

  const closeOverlay = useCallback((message?: string) => {
    if (pending.current || sourceHelperRecoveryRequired.current) return;
    const opener = overlayOpenerRef.current;
    const focusAtClose = document.activeElement;
    const editorAtClose = sourceRef.current;
    const selectionAtClose = editorAtClose?.readSnapshot();
    setOverlay(undefined);
    setChooser(undefined);
    setPropertyEditor(undefined);
    propertyInputComposing.current = false;
    setPropertyOwnerSelecting(false);
    setSourceHelperFeedback({ kind: 'ready' });
    propertyEditorOpenerRef.current = null;
    if (message) setStatus({ kind: 'canceled', message });
    window.requestAnimationFrame(() => {
      // Closing is deferred until the drawer disappears. A newer focus, selection, or edit owns the next frame.
      if (sourceRef.current !== editorAtClose
        || (document.activeElement !== focusAtClose && document.activeElement !== document.body)) return;
      const latest = editorAtClose?.readSnapshot();
      if (selectionAtClose && (!latest || latest.editorId !== selectionAtClose.editorId
        || latest.documentId !== selectionAtClose.documentId || latest.dispatchCount !== selectionAtClose.dispatchCount
        || latest.rawText !== selectionAtClose.rawText || latest.selectionStart !== selectionAtClose.selectionStart
        || latest.selectionEnd !== selectionAtClose.selectionEnd || latest.selectionDirection !== selectionAtClose.selectionDirection)) return;
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
  }, [editorSnapshot, setChooser]);

  const navigateChooser = useCallback((command: AuthoringChooserNavigation) => {
    let current = chooserRef.current;
    if (!current || current.stage === 'closed') return false;
    const navigationLocked = pending.current || sourceHelperRecoveryRequired.current;
    if (navigationLocked) return true;
    if (command.type === 'back' && current.stage === 'value' && propertyEditor) {
      current = reduceAuthoringChooser(current, {
        session: current.session, owner: current.owner, type: 'remember-value',
        key: current.property, draft: { editor: propertyEditor, feedback: sourceHelperFeedback },
      }, { navigationLocked }).state;
    }
    const next = reduceAuthoringChooser(current, {
      ...command, session: current.session, owner: current.owner,
    }, { navigationLocked });
    if (!next.changed) return true;
    setChooser(next.state);
    if (next.state.stage === 'closed') {
      if (next.focus === 'opener') closeOverlay('내용을 추가하지 않았어요. 원문은 그대로입니다.');
      else {
        setOverlay(undefined);
        setPropertyEditor(undefined);
        setPropertyOwnerSelecting(false);
        propertyInputComposing.current = false;
        propertyEditorOpenerRef.current = null;
        setSourceHelperFeedback({ kind: 'ready' });
        setChooser(undefined);
      }
      return true;
    }
    setPropertyEditor(undefined);
    setPropertyOwnerSelecting(false);
    propertyInputComposing.current = false;
    setOverlay(next.state.owner);
    const selector = next.focus === 'property' && next.focusKey
      ? `[data-testid="personal-workspace-authoring-property-edit-${next.focusKey}"]`
      : next.focus === 'group' && next.focusKey
        ? `[data-testid="personal-workspace-authoring-chooser-group-${next.focusKey}"]`
        : next.state.stage === 'groups'
          ? '[data-testid="personal-workspace-authoring-chooser-group-schedule"]'
          : next.state.stage === 'properties'
            ? '[data-testid="personal-workspace-authoring-property-catalog"] button'
            : '[data-testid="personal-workspace-authoring-chooser-information"]';
    window.requestAnimationFrame(() => {
      if (chooserRef.current?.session !== next.state.session || chooserRef.current.stage !== next.state.stage) return;
      const candidate = document.querySelector<HTMLElement>(selector);
      const target = candidate && !candidate.matches(':disabled') ? candidate : overlayHeadingRef.current;
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: 'nearest' });
    });
    return true;
  }, [closeOverlay, propertyEditor, setChooser, sourceHelperFeedback]);

  const closePropertyEditor = useCallback(() => {
    if (pending.current || sourceHelperRecoveryRequired.current) return;
    if (chooserRef.current?.stage === 'value' && navigateChooser({ type: 'back' })) return;
    const returnTarget = propertyEditorOpenerRef.current;
    propertyEditorOpenerRef.current = null;
    setPropertyEditor(undefined);
    propertyInputComposing.current = false;
    setPropertyOwnerSelecting(false);
    setSourceHelperFeedback({ kind: 'ready' });
    const snapshot = sourceRef.current?.readSnapshot();
    const returnOverlay = returnTarget?.overlay;
    if (returnOverlay && isPersonalWorkspacePocAuthoringPropertyOwnerCurrent({
      snapshot: returnOverlay.ticket.expected, itemTitle: '', draftSerialized: returnOverlay.draftSerialized,
    }, snapshot)) setOverlay(returnOverlay);
    else setOverlay(undefined);
    setStatus({ kind: 'canceled', message: '값을 바꾸지 않았어요. 원문은 그대로입니다.' });
    window.requestAnimationFrame(() => {
      const opener = returnTarget?.opener.isConnected
        ? returnTarget.opener
        : returnTarget
          ? document.querySelector<HTMLButtonElement>(
              `[data-testid="personal-workspace-authoring-property-edit-${returnTarget.propertyKey}"]`,
            )
          : null;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      else {
        const current = sourceRef.current?.readSnapshot();
        if (current) sourceRef.current?.focusRange(current.selectionStart, current.selectionEnd);
      }
    });
  }, [navigateChooser]);

  const openReview = useCallback((opener?: HTMLElement | null) => {
    if (pending.current || sourceHelperRecoveryRequired.current) return;
    overlayOpenerRef.current = opener ?? (
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    );
    setTemplatePickerOpen(false);
    setTemplateTicket(undefined);
    setChooser(undefined);
    setOverlay({ kind: 'review' });
  }, [setChooser]);

  useEffect(() => { setChooser(undefined); }, [currentCreatorDraftId, editorDocumentEpoch, setChooser]);

  useEffect(() => {
    templateIdRef.current = templateId;
  }, [templateId]);

  useEffect(() => {
    if ((!entryResult.ok && !entryStale) || !mapCatalogResult.ok || !composedModelResult.ok) {
      window.location.replace('/my');
    }
  }, [composedModelResult.ok, entryResult.ok, entryStale, mapCatalogResult.ok]);

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
    if (entryFocusHandled.current) { entryFocusHandled.current = false; return; }
    if (window.matchMedia('(min-width: 1024px)').matches) return;
    const headingId = mobileStep === 'input'
      ? 'personal-workspace-authoring-write-heading'
      : mobileStep === 'result'
        ? 'personal-workspace-authoring-result-heading'
        : 'creator-draft-library-heading';
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
    let active = true;
    const observer = new window.IntersectionObserver(() => {
      // An observer batch may describe the template picker's earlier layout.
      // Never let that delayed position float a CTA over the current editor.
      if (!active || !editorFrame.isConnected
        || authoringInputSectionRef.current?.querySelector(
          '[data-testid="personal-workspace-live-editor-frame"]',
        ) !== editorFrame) return;
      const rect = editorFrame.getBoundingClientRect();
      setEditorIntersectsViewport(rect.width <= 0 || rect.height <= 0 || (
        rect.bottom >= 0 && rect.top <= window.innerHeight
        && rect.right >= 0 && rect.left <= window.innerWidth
      ));
    }, { threshold: 0 });
    observer.observe(editorFrame);
    return () => { active = false; observer.disconnect(); };
  }, [authoringStarted, mobileStep, editorDocumentEpoch, currentCreatorDraftId]);

  useLayoutEffect(() => {
    if (!authoringStarted || (!overlay && !dependentPropertyOpen)) return;
    overlayHeadingRef.current?.focus({ preventScroll: true });
  }, [authoringStarted, overlay, dependentPropertyOpen]);

  useEffect(() => {
    if (!authoringStarted) return;
    if (!overlay && !templatePickerOpen && !propertyEditor) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && overlay?.kind === 'helper') {
        // Do not trap Tab or pull focus back to an opener after native navigation.
        const session = chooserRef.current?.session;
        window.requestAnimationFrame(() => {
          if (session !== chooserRef.current?.session || overlayDialogRef.current?.contains(document.activeElement)) return;
          navigateChooser({ type: 'close', reason: 'tab' });
        });
        return;
      }
      if (event.key !== 'Escape' || pending.current || event.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      if (navigateChooser({ type: 'back' })) return;
      if (overlay) {
        closeOverlay('메뉴만 닫았어요. 원문과 저장 상태는 그대로입니다.');
        return;
      }
      if (propertyEditor) {
        closePropertyEditor();
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
      if (pending.current || sourceHelperRecoveryRequired.current) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      // The lookup action temporarily hides this owner; it does not dismiss it.
      if (target instanceof Element && target.closest('[data-testid="personal-workspace-authoring-find-existing"]')) return;
      if (overlay) {
        if (overlayDialogRef.current?.contains(target) || overlayOpenerRef.current?.contains(target)) return;
        if (overlay.kind === 'helper' && navigateChooser({ type: 'close', reason: 'outside' })) return;
        setOverlay(undefined);
        setStatus({ kind: 'canceled', message: '메뉴만 닫았어요. 원문과 저장 상태는 그대로입니다.' });
        return;
      }
      if (templatePickerOpen
        && !templatePickerRef.current?.contains(target)
        && !templateToggleRef.current?.contains(target)
        && !validationExamplesToggleRef.current?.contains(target)) {
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
  }, [authoringStarted, closeOverlay, closePropertyEditor, navigateChooser, overlay, propertyEditor, templatePickerOpen]);

  const persistAuthoringDraft = (
    value: string,
    nextTemplateId?: PersonalWorkspacePocAuthoringTemplateId,
    creatorDraftId: string | null | undefined = currentCreatorDraftId,
  ) => {
    const ownTicket = beginOwnedEntryWrite();
    if (!ownTicket) return false;
    const saved = value.length === 0 && !creatorDraftId
      ? clearPersonalWorkspacePocAuthoringDraft(window.localStorage)
      : savePersonalWorkspacePocAuthoringDraft(window.localStorage, {
          version: 1,
          rawText: value,
          ...(nextTemplateId ? { templateId: nextTemplateId } : {}),
          ...(creatorDraftId ? {
            creatorBinding: { owner: 'creator', draftId: creatorDraftId },
          } : {}),
        });
    if (!saved.ok) { abandonFailedEntryWrite(ownTicket); return false; }
    return finishOwnedEntryWrite(ownTicket, { draftRaw: 'serialized' in saved && typeof saved.serialized === 'string' ? saved.serialized : null });
  };

  const onNativeSourceInput = (snapshot: PersonalWorkspacePocLiveEditorSnapshot) => {
    if (sourceHelperRecoveryRequired.current) return;
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
    // A helper has already written and verified its exact candidate. The native
    // callback synchronizes the visible source only, never a second draft write.
    if (sourceHelperPersistence.current) return;
    const persisted = persistAuthoringDraft(snapshot.rawText, nextTemplateId);
    lastDraftPersistenceOk.current = persisted;
    if (!persisted && entryAuthoringBridge.isLocked()) { entryWriteFailure(); return; }
    setStatus(propertyEditor && !isPersonalWorkspacePocAuthoringPropertyOwnerCurrent(propertyEditor.owner, snapshot)
      ? { kind: 'failure', message: '원문이 바뀌어 적용할 항목을 다시 확인해야 해요.' }
      : persisted
      ? { kind: 'ready', message: '작성 중인 원문을 이 기기에 보관했어요.' }
      : { kind: 'failure', message: '작성 중 초안을 보관하지 못했어요. 현재 입력은 화면에 그대로 유지합니다.' });
  };

  const failSourceHelper = (message: string, recoveryRequired = false) => {
    sourceHelperRecoveryRequired.current = recoveryRequired;
    pending.current = recoveryRequired;
    setSourceHelperFeedback({ kind: recoveryRequired ? 'recovery-required' : 'failed', message });
    setStatus({ kind: 'failure', message });
    window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(recoveryRequired
        ? '[data-testid="personal-workspace-authoring-property-recovery"], [data-testid="personal-workspace-authoring-helper-feedback"]'
        : '[data-testid="personal-workspace-authoring-property-editor"] input');
      target?.focus({ preventScroll: true });
    });
  };

  const applyPersistedSourceHelper = async (input: Readonly<{
    snapshot: PersonalWorkspacePocLiveEditorSnapshot;
    expectedDraftSerialized: string | null;
    nextRawText: string;
    replacement: string;
    range: Readonly<{ start: number; end: number }>;
  }>): Promise<boolean> => {
    if (pending.current || sourceHelperRecoveryRequired.current) return false;
    const { snapshot } = input;
    if (snapshot.composing) {
      setStatus({ kind: 'neutral', message: '한글 입력을 마친 뒤 다시 적용해 주세요. 원문은 그대로입니다.' });
      return false;
    }
    const ownTicket = beginOwnedEntryWrite();
    if (!ownTicket) {
      failSourceHelper(entryAuthoringBridge.isLocked()
        ? '저장된 내용이 바뀌어 추가 적용을 멈췄어요. 원문과 입력한 값은 화면에 남아 있습니다.'
        : '초안 보관 상태를 읽지 못해 적용하지 않았어요. 입력한 값은 남아 있어요.', entryAuthoringBridge.isLocked());
      return false;
    }
    pending.current = true;
    setSourceHelperFeedback({ kind: 'saving', message: '원문에 반영할 내용을 보관 중이에요.' });
    setStatus({ kind: 'saving', message: '원문에 반영할 내용을 보관 중이에요.' });
    const saved = savePersonalWorkspacePocAuthoringDraft(window.localStorage, {
      version: 1,
      rawText: input.nextRawText,
      ...(templateIdRef.current ? { templateId: templateIdRef.current } : {}),
      ...(currentCreatorDraftId ? {
        creatorBinding: { owner: 'creator' as const, draftId: currentCreatorDraftId },
      } : {}),
    }, input.expectedDraftSerialized);
    if (!saved.ok) {
      abandonFailedEntryWrite(ownTicket);
      failSourceHelper(saved.rollback === 'recovery-required'
        ? '복구 상태를 확인하지 못했어요. 추가 편집을 멈췄습니다. 화면의 원문과 입력한 값은 그대로 남아 있어요.'
        : saved.error === 'stale-authoring-draft'
          ? '다른 곳에서 보관한 초안이 바뀌어 적용하지 않았어요. 원문과 입력한 값은 그대로입니다.'
          : '보관하지 못해 원문은 바꾸지 않았어요. 입력한 값은 남아 있어요.',
      saved.rollback === 'recovery-required');
      return false;
    }
    sourceHelperPersistence.current = {
      documentId: snapshot.documentId,
      nextRawText: input.nextRawText,
    };
    let applied: Awaited<ReturnType<PersonalWorkspacePocLiveEditorHandle['applyNativeReplacement']>> | undefined;
    try {
      applied = await sourceRef.current?.applyNativeReplacement({
        expected: snapshot,
        replacement: input.replacement,
        range: input.range,
      });
    } catch { /* A browser failure is a failed helper, not a successful save. */ }
    sourceHelperPersistence.current = null;
    if (!applied?.ok) {
      const restored = restorePersonalWorkspacePocAuthoringDraftBytes(window.localStorage, {
        expectedSerialized: saved.serialized,
        previous: saved.previous,
      });
      const after = sourceRef.current?.readSnapshot();
      abandonFailedEntryWrite(ownTicket);
      const sourceUnchanged = Boolean(after
        && isPersonalWorkspacePocAuthoringPropertyOwnerCurrent({
          snapshot, itemTitle: '', draftSerialized: saved.previous,
        }, after));
      if (after && !sourceUnchanged) {
        // Never assign textarea.value or remount away the browser's real history.
        // Partial native edits need recovery, even if durable bytes rolled back.
        setRawText(after.rawText);
        setEditorSnapshot(after);
      }
      failSourceHelper(!restored.ok || !sourceUnchanged
        ? '복구 상태를 확인하지 못했어요. 브라우저 원문과 보관 상태가 달라 추가 편집을 멈췄습니다.'
        : '브라우저가 원문 반영을 마치지 못해 보관도 되돌렸어요. 입력한 값은 남아 있어요.',
      !restored.ok || !sourceUnchanged);
      return false;
    }
    let draftMatches = false;
    try {
      draftMatches = window.localStorage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY) === saved.serialized;
    } catch { /* Unknown durable state must not be announced as success. */ }
    if (!draftMatches) {
      entryAuthoringBridge.abandon(ownTicket);
      entryAuthoringBridge.invalidate();
      failSourceHelper('복구 상태를 확인하지 못했어요. 보관 상태가 다시 바뀌어 추가 편집을 멈췄습니다.', true);
      return false;
    }
    if (!finishOwnedEntryWrite(ownTicket, { draftRaw: saved.serialized })) {
      failSourceHelper('저장된 내용이 다시 바뀌어 추가 편집을 멈췄어요. 원문과 입력은 화면에 남아 있습니다.', true);
      return false;
    }
    lastDraftPersistenceOk.current = true;
    pending.current = false;
    setSourceHelperFeedback({ kind: 'ready' });
    return true;
  };

  const restoreSourceAfterDraftPersistenceFailure = (
    snapshot: PersonalWorkspacePocLiveEditorSnapshot,
    previousTemplateId?: PersonalWorkspacePocAuthoringTemplateId,
  ) => {
    // A source helper is committed only when its matching PoC draft bytes are
    // durable. Remounting the native editor from the before-snapshot removes a
    // failed helper transaction from both the visible source and Undo stack;
    // the failed storage call has already left the previous bytes untouched.
    pendingTemplateId.current = undefined;
    templateIdRef.current = previousTemplateId;
    pendingSourceFocus.current = {
      start: snapshot.selectionStart,
      end: snapshot.selectionEnd,
    };
    setRawText(snapshot.rawText);
    setTemplateId(previousTemplateId);
    setEditorSnapshot(undefined);
    setLossAccepted(false);
    setReceipt(undefined);
    setEditorDocumentEpoch((epoch) => epoch + 1);
    setSourceFocusRequestId((requestId) => requestId + 1);
  };

  const nextTransactionId = (kind: 'template' | 'helper' | 'creator' | 'example' | 'structure') => {
    transactionSequence.current += 1;
    return `poc-authoring:${kind}:${transactionSequence.current}`;
  };

  const adoptAuthoringDocument = (exactText: string) => {
    // Every entry starts a new source document. Do not carry template
    // attribution, lossy-handoff consent, or transient editor UI from the
    // document that was previously open.
    pendingTemplateId.current = undefined;
    templateIdRef.current = undefined;
    pendingSourceFocus.current = undefined;
    overlayOpenerRef.current = null;
    consumedTransactionIds.current = [];
    setRawText(exactText);
    setCurrentCreatorDraftId(undefined);
    setEditorDocumentEpoch((epoch) => epoch + 1);
    setAuthoringStarted(true);
    setTemplateId(undefined);
    setFolderId('');
    setLossAccepted(false);
    setMobileStep('input');
    setTemplatePickerOpen(false);
    setValidationExamplesOpen(false);
    setTemplatePreviewId(DEFAULT_TEMPLATE_PREVIEW_ID);
    setTemplateTicket(undefined);
    setOverlay(undefined);
    setChooser(undefined);
    setPropertyEditor(undefined);
    setPropertyOwnerSelecting(false);
    setSourceHelperFeedback({ kind: 'ready' });
    setEditorSnapshot(undefined);
    setEditorIntersectsViewport(true);
    setIntegratedResult({ resultView: 'text', openItemRef: null });
    setAuthoringResultNavigation({ resultView: 'text' });
    setReceipt(undefined);
  };

  const beginAuthoring = (exactText: string) => {
    if (pending.current || entryAttempt.current || entryHistoryConsuming.current) return;
    if (!currentOwnedEntry()) { entryWriteFailure(); return; }
    adoptAuthoringDocument(exactText);
    if (exactText.length > 0) {
      const persisted = persistAuthoringDraft(exactText, undefined, null);
      setStatus(persisted
        ? { kind: 'success', message: '입력한 글을 한 글자도 바꾸지 않고 원문으로 가져왔어요.' }
        : { kind: 'failure', message: '원문은 화면에 유지했지만 작성 중인 내용을 보관하지 못했어요.' });
    } else {
      const persisted = persistAuthoringDraft('', undefined, null);
      setStatus(persisted
        ? { kind: 'ready', message: '빈 원문에서 직접 쓰거나 작성 틀·검증 예시로 시작할 수 있어요.' }
        : { kind: 'failure', message: '새 원문은 열었지만 이전 작성 중 복구 정보를 지우지 못했어요.' });
    }
  };

  const focusEntryPrimary = useCallback(() => {
    const button = document.querySelector<HTMLElement>('[data-testid="personal-workspace-entry-start-authoring"]');
    button?.focus({ preventScroll: true });
    button?.scrollIntoView({ block: 'nearest' });
  }, []);
  const consumeEntryConfirmation = useCallback((restore: () => void) => {
    const id = entryConfirmHistory.current;
    entryConfirmHistory.current = undefined;
    if (id && window.history.state?.[ENTRY_AUTHORING_HISTORY] === id) {
      entryHistoryConsuming.current = true;
      setEntryHistoryPending(true);
      entryHistoryRestore.current = restore;
      window.history.back();
    } else window.requestAnimationFrame(restore);
  }, []);
  const closeEntryAuthoring = useCallback((fromHistory = false) => {
    const attempt = entryAttempt.current;
    if (attempt) {
      entryTransition.current?.cancel(attempt.ticket);
      entryAuthoringBridge.abandon(attempt.ownTicket);
      entryAttempt.current = undefined;
    }
    if (entryCommitFrame.current !== undefined) window.cancelAnimationFrame(entryCommitFrame.current);
    entryCommitFrame.current = undefined;
    pending.current = sourceHelperRecoveryRequired.current;
    setEntryAuthoringPanel(undefined);
    if (entryAuthoringBridge.isLocked()) entryWriteFailure();
    else setStatus({ kind: 'canceled', message: '새 작성을 취소했어요. 기존 원문과 검색 내용은 그대로입니다.' });
    if (fromHistory) { entryConfirmHistory.current = undefined; window.requestAnimationFrame(focusEntryPrimary); }
    else consumeEntryConfirmation(focusEntryPrimary);
  }, [entryAuthoringBridge, consumeEntryConfirmation, entryWriteFailure, focusEntryPrimary]);
  useEffect(() => {
    const onPop = () => {
      if (entryHistoryConsuming.current) {
        entryHistoryConsuming.current = false;
        setEntryHistoryPending(false);
        const restore = entryHistoryRestore.current; entryHistoryRestore.current = undefined;
        window.requestAnimationFrame(() => { if (entryMounted.current) restore?.(); });
        return;
      }
      if (entryConfirmHistory.current && window.history.state?.[ENTRY_AUTHORING_HISTORY] !== entryConfirmHistory.current) closeEntryAuthoring(true);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (!entryAuthoringPanel || event.key !== 'Escape' || event.isComposing || event.keyCode === 229 || entryHistoryConsuming.current) return;
      event.preventDefault(); event.stopPropagation(); closeEntryAuthoring();
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onEscape, true);
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('keydown', onEscape, true); };
  }, [closeEntryAuthoring, entryAuthoringPanel]);

  const commitEntryAuthoring = () => {
    const attempt = entryAttempt.current;
    if (!attempt || pending.current || entryHistoryConsuming.current || entryComposing.current) return;
    pending.current = true;
    setEntryAuthoringPanel({ kind: 'saving', raw: attempt.raw });
    setStatus({ kind: 'saving', message: '새 작성 원문을 이 기기에 보관 중이에요.' });
    entryCommitFrame.current = window.requestAnimationFrame(() => {
      entryCommitFrame.current = undefined;
      if (!entryMounted.current || entryAttempt.current !== attempt || entryHistoryConsuming.current) return;
      const saved = entryTransition.current!.commit(attempt.ticket);
      if (!entryMounted.current || entryAttempt.current !== attempt) return;
      entryAttempt.current = undefined;
      pending.current = false;
      if (saved.status === 'success') {
        if (!finishOwnedEntryWrite(attempt.ownTicket, { draftRaw: saved.serialized })) {
          setEntryAuthoringPanel({ kind: 'recovery-required', raw: attempt.raw });
          return;
        }
        lastDraftPersistenceOk.current = true;
        setEntryAuthoringPanel(undefined);
        const nextDocumentId = `${AUTHORING_DOCUMENT_ID}:personal:${editorDocumentEpoch + 1}`;
        adoptAuthoringDocument(saved.draft.rawText);
        setStatus({ kind: 'success', message: '입력한 글을 한 글자도 바꾸지 않고 원문으로 가져왔어요.' });
        const focus = () => {
          const current = sourceRef.current?.readSnapshot();
          if (!entryMounted.current || pending.current || entryAttempt.current
            || current?.documentId !== nextDocumentId
            || current.rawText !== saved.draft.rawText || current.dispatchCount !== 0
            || current.selectionStart !== 0 || current.selectionEnd !== 0
            || current.composing || entryAuthoringBridge.isLocked()) return;
          sourceRef.current?.focusRange(0, 0);
        };
        consumeEntryConfirmation(focus);
        return;
      }
      entryAuthoringBridge.abandon(attempt.ownTicket);
      const kind = saved.status === 'stale' || saved.status === 'recovery-required' ? saved.status : 'failed';
      if (kind !== 'failed') entryAuthoringBridge.invalidate();
      setEntryAuthoringPanel({ kind, raw: attempt.raw });
      if (entryAuthoringBridge.isLocked()) entryWriteFailure();
      else setStatus({ kind: 'failure', message: '새 원문을 보관하지 못했어요. 기존 원문과 입력한 글은 그대로 남아 있습니다.' });
    });
  };
  const prepareEntryAuthoring = () => {
    if (pending.current || entryAttempt.current || entryHistoryConsuming.current || entryComposing.current || sourceHelperRecoveryRequired.current) return;
    // Read the live control, not a submitted lookup or an earlier render's text.
    const input = document.getElementById('personal-workspace-entry-input');
    const exactText = input instanceof HTMLTextAreaElement ? input.value : entryInput;
    if (!exactText.trim()) return;
    if (authoringWasStarted.current && !lastDraftPersistenceOk.current && !entryAuthoringBridge.isLocked()) {
      setEntryAuthoringPanel({ kind: 'failed', raw: exactText });
      setStatus({ kind: 'failure', message: '기존 원문을 보관하지 못한 상태예요. 작성으로 돌아가 먼저 확인해 주세요.' });
      return;
    }
    const current = readPersonalWorkspacePocEntryNavigationBinding();
    const own = entryAuthoringBridge.inspect(current);
    const packet = entryAuthoringBridge.scope(current, entryDocumentId.current);
    if (!own || !packet) {
      setEntryAuthoringPanel({ kind: entryAuthoringBridge.isLocked() ? 'stale' : 'failed', raw: exactText });
      entryWriteFailure(); return;
    }
    if (!entryTransition.current) entryTransition.current = createPersonalWorkspacePocEntryAuthoringTransition({
      storage: window.localStorage,
      read: () => entryAuthoringBridge.scope(readPersonalWorkspacePocEntryNavigationBinding(), entryDocumentId.current),
    });
    const prepared = entryTransition.current.prepare({ rawText: exactText, expectedOwnedDraftRaw: own.draftRaw,
      expectedScopeBinding: packet.scopeBinding, expectedDocumentId: packet.documentId });
    if (prepared.status !== 'ready') {
      const kind = prepared.status === 'stale' || prepared.status === 'recovery-required' ? prepared.status : 'failed';
      if (kind !== 'failed') entryAuthoringBridge.invalidate();
      setEntryAuthoringPanel({ kind, raw: exactText }); entryWriteFailure(); return;
    }
    const ownTicket = entryAuthoringBridge.begin(current);
    if (!ownTicket) { entryTransition.current.cancel(prepared.ticket); entryWriteFailure(); return; }
    entryAttempt.current = { ticket: prepared.ticket, ownTicket, raw: exactText };
    if (!prepared.replacesDraft) { commitEntryAuthoring(); return; }
    if (!entryConfirmHistory.current || window.history.state?.[ENTRY_AUTHORING_HISTORY] !== entryConfirmHistory.current) {
      const id = window.crypto.randomUUID();
      try { window.history.pushState({ ...window.history.state, [ENTRY_AUTHORING_HISTORY]: id }, '', window.location.href); entryConfirmHistory.current = id; }
      catch { closeEntryAuthoring(); setStatus({ kind: 'failure', message: '교체 확인을 열지 못해 새 작성을 시작하지 않았어요.' }); return; }
    }
    setEntryAuthoringPanel({ kind: 'confirm', raw: exactText });
    setStatus({ kind: 'neutral', message: '현재 작성 중인 원문을 새 입력으로 바꿀까요? 취소하면 기존 원문은 그대로 남습니다.' });
    const focusedAttempt = entryAttempt.current;
    window.requestAnimationFrame(() => {
      if (!entryMounted.current || entryAttempt.current !== focusedAttempt) return;
      document.querySelector<HTMLElement>('[data-testid="personal-workspace-entry-authoring-confirm"] h3')?.focus({ preventScroll: true });
    });
  };
  const resumeEntryAuthoring = () => {
    if (entryAttempt.current || pending.current || entryHistoryConsuming.current) return;
    if (!currentOwnedEntry()) entryWriteFailure();
    else if (entryReturnStatus.current) setStatus(entryReturnStatus.current);
    setEntryAuthoringPanel(undefined);
    setAuthoringStarted(true); setMobileStep('input');
    window.requestAnimationFrame(() => {
      const point = entryReturnSnapshot.current;
      const current = sourceRef.current?.readSnapshot();
      if (point && current?.documentId === point.documentId) sourceRef.current?.focusRange(point.selectionStart, point.selectionEnd, point.selectionDirection);
      else document.querySelector<HTMLElement>('[data-testid="personal-workspace-authoring-find-existing"]')?.focus({ preventScroll: true });
      window.scrollTo({ top: entryReturnDocumentY.current, behavior: 'instant' });
    });
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
    if (pending.current || sourceHelperRecoveryRequired.current) return;
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
    setChooser(undefined);
    setOverlay(undefined);
    setPropertyEditor(undefined);
    setTemplatePickerOpen(true);
  };

  const applyTemplate = async (nextTemplateId: PersonalWorkspacePocAuthoringTemplateId) => {
    if (!canApplyOwnedNativeSource()) return;
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
    const previousTemplateId = templateIdRef.current;
    pendingTemplateId.current = nextTemplateId;
    lastDraftPersistenceOk.current = true;
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
    setEditorIntersectsViewport(true);
    setTemplatePickerOpen(false);
    setTemplateTicket(undefined);
    if (!lastDraftPersistenceOk.current) {
      restoreSourceAfterDraftPersistenceFailure(snapshot, previousTemplateId);
      setStatus({
        kind: 'failure',
        message: '작성 틀을 보관하지 못해 적용 전 원문으로 돌아왔어요. 다시 시도해 주세요.',
      });
      return;
    }
    consumedTransactionIds.current.push(templateTicket.transactionId);
    // The successful result includes its first editing position. Do not expose
    // a saved scaffold whose caret still points to the end of the insertion.
    sourceRef.current?.focusRange(
      planned.plan.replacement.nextSelectionStart,
      planned.plan.replacement.nextSelectionEnd,
    );
    window.requestAnimationFrame(() => {
      const current = sourceRef.current?.readSnapshot();
      if (!entryMounted.current || entryAuthoringBridge.isLocked()
        || current?.documentId !== applied.snapshot.documentId
        || current.rawText !== applied.snapshot.rawText
        || current.dispatchCount !== applied.snapshot.dispatchCount || current.composing
        || current.selectionStart !== planned.plan.replacement.nextSelectionStart
        || current.selectionEnd !== planned.plan.replacement.nextSelectionEnd) return;
      if (window.matchMedia('(max-width: 1023px)').matches) {
        authoringInputSectionRef.current?.scrollIntoView({ block: 'start', inline: 'nearest' });
      }
    });
    const template = PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.find(
      (entry) => entry.templateId === nextTemplateId,
    );
    setStatus({
      kind: 'success',
      message: `${template?.label ?? '작성'} 틀을 한 번 넣었어요. Ctrl+Z 한 번으로 되돌릴 수 있습니다.`,
    });
  };

  const applyStructureTemplatePreview = async () => {
    if (!canApplyOwnedNativeSource()) return;
    if (pending.current || !structureTemplatePreview) return;
    const snapshot = sourceRef.current?.readSnapshot();
    if (!snapshot) {
      setStatus({ kind: 'failure', message: '편집기 상태를 읽지 못해 구조화 원문을 만들지 않았어요.' });
      return;
    }
    const materialization = planPersonalWorkspacePocStructureTemplatePreviewApply({
      templateId: structureTemplatePreview.templateId,
      catalogVersion: structureTemplatePreview.catalogVersion,
      contractVersion: structureTemplatePreview.contractVersion,
      rawText: snapshot.rawText,
      expectedSourceFingerprint: snapshot.sourceFingerprint,
      confirmed: true,
      composing: snapshot.composing,
    });
    if (materialization.status !== 'applied' || !materialization.replacement) {
      setStatus({
        kind: materialization.reason === 'compiler-error' || materialization.reason === 'bytes-mismatch'
          ? 'failure'
          : 'canceled',
        message: materialization.reason === 'nonempty-source'
          ? '구조화 입력값으로 글을 만드는 기능은 정확히 비어 있는 원문에서만 실행할 수 있어요.'
          : '버전·편집기·컴파일 결과를 모두 확인할 수 없어 구조화 원문을 만들지 않았어요.',
      });
      return;
    }
    const ticket = createPersonalWorkspacePocSourceEditorTicket({
      transactionId: nextTransactionId('structure'),
      kind: 'structure-materialization',
      snapshot,
      requireEmptySource: true,
    });
    const transaction = planPersonalWorkspacePocSourceEditorTransaction({
      ticket,
      current: snapshot,
      consumedTransactionIds: consumedTransactionIds.current,
      replacement: {
        replaceStart: 0,
        replaceEnd: 0,
        insertedText: materialization.nextRawText,
        nextSelectionStart: 0,
        nextSelectionEnd: 0,
        nextSelectionDirection: 'none',
      },
    });
    if (!transaction.ok) {
      setStatus({ kind: 'canceled', message: '편집기 상태가 달라져 구조화 원문을 만들지 않았어요.' });
      return;
    }

    const previousTemplateId = templateIdRef.current;
    pendingTemplateId.current = undefined;
    templateIdRef.current = undefined;
    setTemplateId(undefined);
    lastDraftPersistenceOk.current = true;
    const applied = await sourceRef.current?.applyNativeReplacement({
      expected: snapshot,
      replacement: transaction.plan.replacement.insertedText,
      range: { start: 0, end: 0 },
    });
    if (!applied?.ok) {
      const sourceChanged = Boolean(
        applied?.snapshot && applied.snapshot.rawText !== snapshot.rawText,
      );
      if (sourceChanged && applied?.snapshot) {
        onNativeSourceInput(applied.snapshot);
        setTemplatePickerOpen(false);
        setTemplateTicket(undefined);
      } else {
        templateIdRef.current = previousTemplateId;
        setTemplateId(previousTemplateId);
      }
      setStatus({
        kind: 'failure',
        message: sourceChanged
          ? '구조화 편집이 완전히 끝나지 않아 현재 원문만 보관했어요.'
          : '브라우저 편집 이력을 보존할 수 없어 글을 만들지 않았어요.',
      });
      return;
    }
    setTemplatePickerOpen(false);
    setTemplateTicket(undefined);
    setEditorIntersectsViewport(true);
    if (!lastDraftPersistenceOk.current) {
      restoreSourceAfterDraftPersistenceFailure(snapshot, previousTemplateId);
      setStatus({
        kind: 'failure',
        message: '구조화 원문을 보관하지 못해 적용 전 원문으로 돌아왔어요. 다시 시도해 주세요.',
      });
      return;
    }
    consumedTransactionIds.current.push(ticket.transactionId);
    window.requestAnimationFrame(() => sourceRef.current?.focusRange(0, 0));
    setStatus({
      kind: 'success',
      message: `“${structureTemplatePreview.label}” 검증 입력값을 ${structureTemplatePreview.contractVersion} 컴파일러로 한 번 글로 만들었어요. Ctrl+Z 한 번으로 되돌릴 수 있습니다.`,
    });
  };

  const openValidationExamples = () => {
    if (pending.current || sourceHelperRecoveryRequired.current) return;
    setTemplatePickerOpen(false);
    setTemplateTicket(undefined);
    setOverlay(undefined);
    setChooser(undefined);
    setPropertyEditor(undefined);
    setValidationExamplesOpen(true);
    setStatus({
      kind: 'neutral',
      message: '검증 예시를 살펴보는 중입니다. 고르기만 해서는 원문이 바뀌지 않습니다.',
    });
  };

  const closeValidationExamples = () => {
    setValidationExamplesOpen(false);
    setStatus({
      kind: 'canceled',
      message: '검증 예시만 닫았어요. 원문과 저장 상태는 그대로입니다.',
    });
  };

  const applyValidationExample = async (
    example: PersonalWorkspacePocValidationExample,
  ) => {
    if (!canApplyOwnedNativeSource()) return;
    if (pending.current) return;
    const snapshot = sourceRef.current?.readSnapshot();
    if (!snapshot) {
      setStatus({ kind: 'failure', message: '편집기 상태를 읽지 못해 예시를 넣지 않았어요.' });
      return;
    }
    const examplePlan = planPersonalWorkspacePocValidationExampleApply({
      catalogVersion: PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION,
      exampleId: example.exampleId,
      rawText: snapshot.rawText,
      expectedSourceFingerprint: snapshot.sourceFingerprint,
      confirmed: true,
      composing: snapshot.composing,
    });
    if (examplePlan.status !== 'applied' || !examplePlan.replacement) {
      setStatus({
        kind: 'canceled',
        message: examplePlan.reason === 'nonempty-source'
          ? '예시는 정확히 비어 있는 원문에만 넣을 수 있어요. 현재 원문은 그대로입니다.'
          : '편집기 상태가 달라져 예시를 넣지 않았어요.',
      });
      return;
    }
    const ticket = createPersonalWorkspacePocSourceEditorTicket({
      transactionId: nextTransactionId('example'),
      kind: 'validation-example',
      snapshot,
      requireEmptySource: true,
    });
    const transaction = planPersonalWorkspacePocSourceEditorTransaction({
      ticket,
      current: snapshot,
      consumedTransactionIds: consumedTransactionIds.current,
      replacement: {
        replaceStart: 0,
        replaceEnd: snapshot.rawText.length,
        insertedText: examplePlan.nextRawText,
        nextSelectionStart: 0,
        nextSelectionEnd: 0,
        nextSelectionDirection: 'none',
      },
    });
    if (!transaction.ok) {
      setStatus({ kind: 'canceled', message: '편집기 상태가 달라져 예시를 넣지 않았어요.' });
      return;
    }

    const previousTemplateId = templateIdRef.current;
    pendingTemplateId.current = undefined;
    templateIdRef.current = undefined;
    setTemplateId(undefined);
    lastDraftPersistenceOk.current = true;
    const applied = await sourceRef.current?.applyNativeReplacement({
      expected: snapshot,
      replacement: transaction.plan.replacement.insertedText,
      range: {
        start: transaction.plan.replacement.replaceStart,
        end: transaction.plan.replacement.replaceEnd,
      },
    });
    if (!applied?.ok) {
      const sourceChanged = Boolean(
        applied?.snapshot && applied.snapshot.rawText !== snapshot.rawText,
      );
      if (sourceChanged && applied?.snapshot) {
        onNativeSourceInput(applied.snapshot);
        setValidationExamplesOpen(false);
      } else {
        templateIdRef.current = previousTemplateId;
        setTemplateId(previousTemplateId);
      }
      setStatus({
        kind: 'failure',
        message: sourceChanged
          ? '예시 편집이 완전히 끝나지 않아 현재 원문만 보관했어요.'
          : '브라우저 편집 이력을 보존할 수 없어 예시를 넣지 않았어요.',
      });
      return;
    }
    setValidationExamplesOpen(false);
    setEditorIntersectsViewport(true);
    if (!lastDraftPersistenceOk.current) {
      restoreSourceAfterDraftPersistenceFailure(snapshot, previousTemplateId);
      setStatus({
        kind: 'failure',
        message: '예시 원문을 보관하지 못해 적용 전 원문으로 돌아왔어요. 다시 시도해 주세요.',
      });
      return;
    }
    consumedTransactionIds.current.push(ticket.transactionId);
    window.requestAnimationFrame(() => {
      sourceRef.current?.focusRange(0, 0);
    });
    setStatus({
      kind: 'success',
      message: `“${example.label}” 예시 원문을 한 번 넣었어요. Ctrl+Z 한 번으로 되돌릴 수 있습니다.`,
    });
  };

  const openHelper = useCallback((opener: HTMLButtonElement) => {
    if (pending.current || sourceHelperRecoveryRequired.current) return;
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
    let draftSerialized: string | null;
    try {
      draftSerialized = window.localStorage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY);
    } catch {
      setStatus({ kind: 'failure', message: '초안 보관 상태를 확인하지 못해 도움을 열지 않았어요. 원문은 그대로입니다.' });
      return;
    }
    const rect = opener.getBoundingClientRect();
    overlayOpenerRef.current = opener;
    setTemplatePickerOpen(false);
    setTemplateTicket(undefined);
    setPropertyEditor(undefined);
    setPropertyOwnerSelecting(false);
    setSourceHelperFeedback({ kind: 'ready' });
    const helper: HelperOverlay = {
      kind: 'helper',
      target,
      draftSerialized,
      itemTitle: parsedItems.find((item) => item.sourceLine === (target.ownerItemLine ?? target.line))?.title,
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
    };
    setOverlay(helper);
    setChooser(createAuthoringChooser<HelperOverlay, AuthoringChooserDraft>({ owner: helper, entry: 'structure' }));
  }, [closeOverlay, helperOpen, parsedItems, preview.parseResult.fidelityManifest, setChooser]);

  const applyHelper = async (actionId: PersonalWorkspacePocAuthoringMenuActionId) => {
    if (pending.current || !helperTicket || !helperTarget || overlay?.kind !== 'helper') return;
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
    const applied = await applyPersistedSourceHelper({
      snapshot,
      expectedDraftSerialized: overlay.draftSerialized,
      nextRawText: planned.plan.nextSnapshot.rawText,
      replacement: planned.plan.replacement.insertedText,
      range: {
        start: planned.plan.replacement.replaceStart,
        end: planned.plan.replacement.replaceEnd,
      },
    });
    if (!applied) return;
    consumedTransactionIds.current.push(helperTicket.transactionId);
    setOverlay(undefined);
    setChooser(undefined);
    overlayOpenerRef.current = null;
    window.requestAnimationFrame(() => sourceRef.current?.focusRange(
      planned.plan.replacement.nextSelectionStart,
      planned.plan.replacement.nextSelectionEnd,
    ));
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
    const opened = chooserRef.current?.owner;
    if (opened && !isPersonalWorkspacePocAuthoringPropertyOwnerCurrent({
      snapshot: opened.ticket.expected, draftSerialized: opened.draftSerialized, itemTitle: opened.itemTitle ?? '',
    }, sourceRef.current?.readSnapshot())) {
      setStatus({ kind: 'failure', message: '원문이 바뀌어 값을 다시 확인해야 해요. 원문은 그대로입니다.' });
      return;
    }
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
    setChooser(undefined);
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
    opener: HTMLButtonElement,
  ) => {
    if (pending.current || sourceHelperRecoveryRequired.current) return;
    const currentChooser = chooserRef.current;
    const remembered = currentChooser?.stage === 'properties' ? currentChooser.drafts[key] : undefined;
    if (currentChooser?.stage === 'properties' && remembered) {
      const next = reduceAuthoringChooser(currentChooser, {
        session: currentChooser.session, owner: currentChooser.owner, type: 'choose-property', key,
      });
      if (!next.changed) return;
      setChooser(next.state);
      setPropertyEditor(remembered.editor);
      setSourceHelperFeedback(remembered.feedback);
      setPropertyOwnerSelecting(false);
      propertyInputComposing.current = false;
      propertyEditorOpenerRef.current = { opener, overlay: currentChooser.owner, propertyKey: key };
      const currentSnapshot = sourceRef.current?.readSnapshot();
      if (currentSnapshot) setEditorSnapshot(currentSnapshot);
      setOverlay(undefined);
      setMobileStep('input');
      window.requestAnimationFrame(() => document.querySelector<HTMLInputElement>(
        '[data-testid="personal-workspace-authoring-property-editor"] input',
      )?.focus({ preventScroll: true }));
      return;
    }
    const snapshot = sourceRef.current?.readSnapshot();
    if (!snapshot || snapshot.composing || snapshot.rawText !== rawText) return;
    if (overlay?.kind === 'helper'
      && !isPersonalWorkspacePocAuthoringPropertyOwnerCurrent({
        snapshot: overlay.ticket.expected, itemTitle: '', draftSerialized: overlay.draftSerialized,
      }, snapshot)) {
      setStatus({ kind: 'failure', message: '원문이 바뀌어 메뉴의 항목을 다시 확인해야 해요. 원문은 그대로입니다.' });
      return;
    }
    const item = parsedItems.find((candidate) => candidate.sourceLine === itemSourceLine);
    if (!item) return;
    let draftSerialized: string | null;
    if (currentChooser) draftSerialized = currentChooser.owner.draftSerialized;
    else try {
      draftSerialized = window.localStorage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY);
    } catch {
      setStatus({ kind: 'failure', message: '초안 보관 상태를 확인하지 못해 항목 편집을 열지 않았어요.' });
      return;
    }
    const owner: PersonalWorkspacePocAuthoringPropertyOwner = {
      snapshot: currentChooser?.owner.ticket.expected ?? snapshot,
      itemTitle: currentChooser?.owner.itemTitle ?? item.title, draftSerialized,
    };
    propertyInputComposing.current = false;
    const entry = getPersonalWorkspacePocAuthoringProperty(key);
    if (!entry || entry.writeSupport !== 'editable') {
      setStatus({ kind: 'neutral', message: '현재 PoC에서 안전하게 바꿀 수 없는 항목 정보예요.' });
      return;
    }
    propertyEditorOpenerRef.current = {
      opener,
      ...(overlay?.kind === 'helper' ? { overlay } : {}),
      propertyKey: key,
    };
    setEditorSnapshot(snapshot);
    setPropertyOwnerSelecting(false);
    setSourceHelperFeedback({ kind: 'ready' });
    const located = propertyLocation(key, itemSourceLine);
    let nextEditor: AuthoringPropertyEditor;
    if (key === 'timezone') {
      const time = propertyLocation('time', itemSourceLine);
      nextEditor = {
        kind: 'time-zone', itemSourceLine, owner,
        time: time.status === 'located' ? time.rawValue : '',
        timezone: located.status === 'located' ? located.rawValue : 'Asia/Seoul',
      };
    } else if (key === 'repeat' || key === 'repeatEnd') {
      const repeat = propertyLocation('repeat', itemSourceLine);
      const repeatEnd = propertyLocation('repeatEnd', itemSourceLine);
      nextEditor = {
        kind: 'recurrence', itemSourceLine, owner,
        repeat: repeat.status === 'located' ? repeat.rawValue : '',
        repeatEnd: repeatEnd.status === 'located' ? repeatEnd.rawValue : '',
      };
    } else {
      nextEditor = {
        kind: 'single', surface: entry.editor === 'dependent' ? 'dependent' : 'inline', key, itemSourceLine, owner,
        value: located.status === 'located' ? located.rawValue : '',
      };
    }
    if (currentChooser) {
      const next = reduceAuthoringChooser(currentChooser, {
        session: currentChooser.session, owner: currentChooser.owner, type: 'choose-property', key,
        initialDraft: { editor: nextEditor, feedback: { kind: 'ready' } },
      });
      if (!next.changed) return;
      setChooser(next.state);
    }
    setPropertyEditor(nextEditor);
    setOverlay(undefined);
    setMobileStep('input');
    window.requestAnimationFrame(() => document.querySelector<HTMLInputElement>(
      '[data-testid="personal-workspace-authoring-property-editor"] input',
    )?.focus({ preventScroll: true }));
  };

  const beginPropertyOwnerSelection = () => {
    if (pending.current || !propertyEditor) return;
    setPropertyOwnerSelecting(true);
    setSourceHelperFeedback({ kind: 'ready' });
    window.requestAnimationFrame(() => {
      const snapshot = sourceRef.current?.readSnapshot();
      if (snapshot) sourceRef.current?.focusRange(snapshot.selectionStart, snapshot.selectionEnd);
    });
  };

  const confirmPropertyOwnerSelection = () => {
    if (pending.current || !propertyEditor || !propertyOwnerSelecting) return;
    const snapshot = sourceRef.current?.readSnapshot();
    if (!snapshot || snapshot.composing || snapshot.rawText !== rawText) return;
    if (snapshot.documentId !== propertyEditor.owner.snapshot.documentId
      || snapshot.editorId !== propertyEditor.owner.snapshot.editorId) {
      setStatus({ kind: 'failure', message: '다른 문서로 바뀌어 입력값을 옮기지 않았어요. 이 도움을 닫고 다시 열어 주세요.' });
      return;
    }
    const target = resolvePersonalWorkspacePocAuthoringGuideTarget({
      rawText: snapshot.rawText,
      sourceFingerprint: snapshot.sourceFingerprint,
      selectionStart: snapshot.selectionStart,
      selectionEnd: snapshot.selectionEnd,
      fidelityManifest: preview.parseResult.fidelityManifest,
    });
    const itemSourceLine = target?.kind === 'root-item' ? target.ownerItemLine ?? target.line : undefined;
    const item = parsedItems.find((candidate) => candidate.sourceLine === itemSourceLine);
    if (!item || itemSourceLine === undefined) return;
    let draftSerialized: string | null;
    try {
      draftSerialized = window.localStorage.getItem(PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY);
    } catch {
      failSourceHelper('초안 보관 상태를 확인하지 못해 항목을 다시 선택하지 않았어요. 입력한 값은 남아 있어요.');
      return;
    }
    const owner = { snapshot, itemTitle: item.title, draftSerialized };
    setPropertyEditor((current) => current ? { ...current, itemSourceLine, owner } : current);
    const previousChooser = chooserRef.current;
    if (previousChooser?.stage === 'value' && target) {
      const helper: HelperOverlay = {
        ...previousChooser.owner, target, draftSerialized, itemTitle: item.title,
        ticket: createPersonalWorkspacePocSourceEditorTicket({
          transactionId: nextTransactionId('helper'), kind: 'helper', snapshot, requireEmptySource: false,
        }),
      };
      let next = createAuthoringChooser<HelperOverlay, AuthoringChooserDraft>({ owner: helper, entry: previousChooser.entry });
      if (next.stage === 'structure') next = reduceAuthoringChooser(next, {
        session: next.session, owner: next.owner, type: 'show-groups',
      }).state;
      next = reduceAuthoringChooser(next, {
        session: next.session, owner: next.owner, type: 'choose-group', group: previousChooser.group,
      }).state;
      next = reduceAuthoringChooser(next, {
        session: next.session, owner: next.owner, type: 'choose-property', key: previousChooser.property,
        initialDraft: { editor: { ...propertyEditor, itemSourceLine, owner }, feedback: { kind: 'ready' } },
      }).state;
      setChooser(next);
      const returnTarget = propertyEditorOpenerRef.current;
      if (returnTarget) propertyEditorOpenerRef.current = { ...returnTarget, overlay: helper };
    }
    setPropertyOwnerSelecting(false);
    setSourceHelperFeedback({ kind: 'ready' });
    setStatus({ kind: 'neutral', message: `“${item.title}”을 선택했어요. 값을 확인한 뒤 적용해 주세요.` });
    window.requestAnimationFrame(() => document.querySelector<HTMLInputElement>(
      '[data-testid="personal-workspace-authoring-property-editor"] input',
    )?.focus({ preventScroll: true }));
  };

  const applyPropertyEditor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!propertyEditor || propertyOwnerSelecting || propertyInputComposing.current || pending.current) return;
    const snapshot = sourceRef.current?.readSnapshot();
    if (!snapshot) return;
    if (!isPersonalWorkspacePocAuthoringPropertyOwnerCurrent(propertyEditor.owner, snapshot)) {
      setEditorSnapshot(snapshot);
      setStatus({ kind: 'failure', message: '원문이 바뀌어 적용할 항목을 다시 확인해야 해요.' });
      return;
    }
    if (snapshot.composing) return;
    const beforeSelection = { start: snapshot.selectionStart, end: snapshot.selectionEnd };
    const planned = propertyEditor.kind === 'time-zone'
      ? planPersonalWorkspacePocAuthoringPropertyBatchEdit({
          intent: 'apply', rawText: snapshot.rawText,
          expectedSourceFingerprint: propertyEditor.owner.snapshot.sourceFingerprint,
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
            expectedSourceFingerprint: propertyEditor.owner.snapshot.sourceFingerprint,
            itemSourceLine: propertyEditor.itemSourceLine,
            updates: [
              { key: 'repeat', value: propertyEditor.repeat },
              { key: 'repeatEnd', value: propertyEditor.repeatEnd },
            ],
            beforeSelection,
          })
        : planPersonalWorkspacePocAuthoringPropertyEdit({
            intent: 'apply', rawText: snapshot.rawText,
            expectedSourceFingerprint: propertyEditor.owner.snapshot.sourceFingerprint,
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
    const applied = await applyPersistedSourceHelper({
      snapshot,
      expectedDraftSerialized: propertyEditor.owner.draftSerialized,
      nextRawText: planned.nextRawText,
      replacement: change.insert,
      range: { start: change.from, end: change.to },
    });
    if (!applied) return;
    setOverlay(undefined);
    setPropertyEditor(undefined);
    setChooser(undefined);
    propertyInputComposing.current = false;
    propertyEditorOpenerRef.current = null;
    overlayOpenerRef.current = null;
    window.requestAnimationFrame(() => sourceRef.current?.focusRange(planned.selection.start, planned.selection.end));
    setStatus({ kind: 'success', message: '항목 정보를 원문에 반영하고 이 기기에 보관했어요. Ctrl+Z 한 번으로 되돌릴 수 있습니다.' });
  };

  const repairNearMiss = async (target: PersonalWorkspacePocAuthoringNearMissTarget) => {
    if (!canApplyOwnedNativeSource()) return;
    // The review lives on the mobile Result stage. A native browser edit must
    // run after the one shared textarea is visible again, otherwise execCommand
    // correctly refuses to create an undo history entry.
    setOverlay(undefined);
    setChooser(undefined);
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
    if (!entryIsCurrent() || !entryPacket.ok || !mapCatalogResult.ok) return;
    entryReturnApplied.current = true;
    const group = mapCatalogResult.catalog.groups.find((candidate) => candidate.groupRef === groupRef);
    const child = group?.children.find((candidate) => entryMatchRefs.has(candidate.flowRef))
      ?? group?.children[0];
    if (!group || !child) return;
    const inputColumn = document.querySelector<HTMLElement>('[data-testid="personal-workspace-authoring-column"]');
    entryListScroll.current = { documentY: window.scrollY, inputY: inputColumn?.scrollTop ?? 0 };
    if (mobileStep !== 'result') entryFocusHandled.current = true;
    if (integratedResult.selectedGroupRef === group.groupRef && integratedResult.selectedFlowRef) {
      setMobileStep('result');
      window.requestAnimationFrame(() => { if (entryIsCurrent()) document.getElementById('personal-workspace-entry-result-heading')?.focus(); });
      return;
    }
    setEntryPreview({ owner: 'personal-copy', resultView: 'text' });
    setIntegratedResult({
      selectedGroupRef: group.groupRef,
      selectedFlowRef: child.flowRef,
      resultView: 'text',
      openItemRef: null,
      focusReturn: { kind: 'flow-result-heading', flowRef: child.flowRef },
    });
    setMobileStep('result');
    setStatus({ kind: 'success', message: '기존 Flow 미리보기를 열었어요.' });
    window.requestAnimationFrame(() => document.getElementById('personal-workspace-entry-result-heading')?.focus());
  };

  const chooseMapChild = (flowRef: string) => {
    if (!entryIsCurrent() || !entryPacket.ok || !mapCatalogResult.ok || !selectedGroup || selectedGroup.kind !== 'map') return;
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
    setEntryPreview({ owner: 'personal-copy', resultView: 'text' });
    setStatus({ kind: 'success', message: '선택한 Flow의 내 사본 미리보기를 열었어요.' });
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
    setChooser(undefined);
    overlayOpenerRef.current = null;
    setMobileStep('input');
    setSourceFocusRequestId((requestId) => requestId + 1);
  };

  const creatorMutationTime = (library = creatorDraftLibrary): string => {
    const now = new Date().toISOString();
    return now < library.updatedAt ? library.updatedAt : now;
  };

  const createCreatorDraftId = (): string => {
    transactionSequence.current += 1;
    const random = typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `${Date.now().toString(36)}-${transactionSequence.current.toString(36)}`;
    return `creator-draft-${random}`;
  };

  const failCreatorPersistence = (
    message: string,
    rollback: 'not-needed' | 'complete' | 'recovery-required',
  ) => {
    pending.current = false;
    if (entryAuthoringBridge.isLocked()) { entryWriteFailure(); return; }
    setStatus({ kind: 'failure', message });
    if (rollback === 'recovery-required') {
      window.requestAnimationFrame(() => window.location.replace('/my'));
    }
  };

  const saveCreatorDraft = async (): Promise<Readonly<{
    draftId: string;
    library: PersonalWorkspacePocCreatorDraftLibraryState;
    libraryRaw: string;
  }> | undefined> => {
    if (pending.current) return undefined;
    if (!rawText.trim()) {
      setStatus({ kind: 'failure', message: '원문을 한 글자 이상 작성한 뒤 제작 초안으로 저장하세요.' });
      return undefined;
    }
    const current = currentCreatorDraftId
      ? creatorDraftLibrary.records[currentCreatorDraftId]
      : undefined;
    const draftId = current?.draftId ?? createCreatorDraftId();
    const transition = transitionPersonalWorkspacePocCreatorDraftLibrary(
      creatorDraftLibrary,
      {
        type: 'save',
        expectedLibraryRevision: creatorDraftLibrary.revision,
        ...(current ? {
          expectedRecordRevision: current.recordRevision,
          title: current.title,
        } : {}),
        draftId,
        rawText,
        sourceFingerprint,
        ...(templateId ? { templateId } : {}),
        now: creatorMutationTime(),
      },
    );
    if (!transition.changed) {
      setStatus(transition.code === 'no-op'
        ? { kind: 'neutral', message: '바뀐 내용이 없어 새 revision을 만들지 않았어요.' }
        : { kind: 'failure', message: '제작 초안 상태가 달라 저장하지 않았어요. 목록에서 최신 초안을 다시 여세요.' });
      return undefined;
    }

    let expectedAuthoringDraftRawValue: string | null;
    try {
      expectedAuthoringDraftRawValue = window.localStorage.getItem(
        PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,
      );
    } catch {
      setStatus({ kind: 'failure', message: '작성 중 복구 상태를 읽지 못해 제작 초안을 저장하지 않았어요.' });
      return undefined;
    }
    const authoringDraft: PersonalWorkspacePocAuthoringDraft = {
      version: 1,
      rawText,
      ...(templateId ? { templateId } : {}),
      creatorBinding: { owner: 'creator', draftId },
    };
    pending.current = true;
    setStatus({ kind: 'saving', message: '제작 초안을 이 기기에 저장 중…' });
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    const saved = commitOwnedCreatorDraftStorage({
      storage: window.localStorage,
      transactionId: nextTransactionId('creator'),
      expectedLibraryRawValue: creatorDraftLibraryRaw,
      library: transition.library,
      expectedAuthoringDraftRawValue,
      authoringDraft,
    });
    if (!saved.ok) {
      failCreatorPersistence(
        '저장하지 못했어요. 작성 중 내용과 마지막 저장본은 그대로입니다.',
        saved.rollback,
      );
      return undefined;
    }
    pending.current = false;
    setCreatorDraftLibrary(transition.library);
    setCreatorDraftLibraryRaw(saved.serializedLibrary);
    setCurrentCreatorDraftId(draftId);
    setStatus({
      kind: 'success',
      message: `“${transition.library.records[draftId]?.title ?? '제작자 초안'}” r${transition.library.records[draftId]?.recordRevision ?? 1}을 이 기기에 저장했어요.`,
    });
    return {
      draftId,
      library: transition.library,
      libraryRaw: saved.serializedLibrary,
    };
  };

  const openCreatorDraft = async (
    draftId: string,
    library = creatorDraftLibrary,
    libraryRaw = creatorDraftLibraryRaw,
  ) => {
    if (pending.current || sourceHelperRecoveryRequired.current) return;
    const record = library.records[draftId];
    if (!record || record.status !== 'active') {
      setStatus({ kind: 'failure', message: '이 초안을 안전하게 열 수 없어요. 목록을 다시 확인하세요.' });
      return;
    }
    let expectedAuthoringDraftRawValue: string | null;
    try {
      expectedAuthoringDraftRawValue = window.localStorage.getItem(
        PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,
      );
    } catch {
      setStatus({ kind: 'failure', message: '작성 중 복구 상태를 읽지 못해 초안을 열지 않았어요.' });
      return;
    }
    const authoringDraft: PersonalWorkspacePocAuthoringDraft = {
      version: 1,
      rawText: record.rawText,
      ...(record.templateId ? { templateId: record.templateId } : {}),
      creatorBinding: { owner: 'creator', draftId },
    };
    pending.current = true;
    setStatus({ kind: 'saving', message: `“${record.title}” 초안을 여는 중…` });
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    const saved = commitOwnedCreatorDraftStorage({
      storage: window.localStorage,
      transactionId: nextTransactionId('creator'),
      expectedLibraryRawValue: libraryRaw,
      library,
      expectedAuthoringDraftRawValue,
      authoringDraft,
    });
    if (!saved.ok) {
      failCreatorPersistence(
        '초안을 열지 못했어요. 현재 작성 내용과 저장된 초안은 그대로입니다.',
        saved.rollback,
      );
      return;
    }
    pending.current = false;
    pendingTemplateId.current = undefined;
    templateIdRef.current = record.templateId;
    pendingSourceFocus.current = undefined;
    setRawText(record.rawText);
    setTemplateId(record.templateId);
    setCurrentCreatorDraftId(draftId);
    setAuthoringStarted(true);
    setMobileStep('input');
    setLossAccepted(false);
    setReceipt(undefined);
    setPropertyEditor(undefined);
    propertyEditorOpenerRef.current = null;
    propertyInputComposing.current = false;
    setPropertyOwnerSelecting(false);
    setSourceHelperFeedback({ kind: 'ready' });
    setEditorSnapshot(undefined);
    setEditorDocumentEpoch((epoch) => epoch + 1);
    setStatus({ kind: 'success', message: `내 초안에서 열었어요 · ${record.title}` });
  };

  const requestCreatorDraftOpen = (draftId: string) => {
    if (draftId === currentCreatorDraftId) {
      setMobileStep('input');
      setStatus({ kind: 'neutral', message: '이미 열어 둔 제작자 초안입니다.' });
      return;
    }
    if (currentCreatorDraftDirty) {
      overlayOpenerRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      setOverlay({ kind: 'draft-switch', mode: 'open', draftId });
      return;
    }
    void openCreatorDraft(draftId);
  };

  const requestNewCreatorDraft = () => {
    if (currentCreatorDraftDirty) {
      overlayOpenerRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      setOverlay({ kind: 'draft-switch', mode: 'new' });
      return;
    }
    beginAuthoring('');
  };

  const persistLibraryOnly = (
    nextLibrary: PersonalWorkspacePocCreatorDraftLibraryState,
    successMessage: string,
  ): boolean => {
    if (pending.current) return false;
    const ownTicket = beginOwnedEntryWrite();
    if (!ownTicket) return false;
    pending.current = true;
    setStatus({ kind: 'saving', message: '초안 목록을 저장 중…' });
    const saved = savePersonalWorkspacePocCreatorDraftLibrary({
      storage: window.localStorage,
      expectedRawValue: creatorDraftLibraryRaw,
      library: nextLibrary,
    });
    pending.current = false;
    if (!saved.ok) {
      abandonFailedEntryWrite(ownTicket);
      failCreatorPersistence(
        '초안 목록을 저장하지 못했어요. 마지막 저장본은 그대로입니다.',
        saved.rollback,
      );
      return false;
    }
    if (!finishOwnedEntryWrite(ownTicket, { libraryRaw: saved.serialized })) return false;
    setCreatorDraftLibrary(nextLibrary);
    setCreatorDraftLibraryRaw(saved.serialized);
    setStatus({ kind: 'success', message: successMessage });
    return true;
  };

  const renameCreatorDraft = (draftId: string, title: string) => {
    const record = creatorDraftLibrary.records[draftId];
    if (!record) return;
    const transition = transitionPersonalWorkspacePocCreatorDraftLibrary(
      creatorDraftLibrary,
      {
        type: 'rename',
        expectedLibraryRevision: creatorDraftLibrary.revision,
        expectedRecordRevision: record.recordRevision,
        draftId,
        title,
        now: creatorMutationTime(),
      },
    );
    if (!transition.changed) {
      setStatus({ kind: 'neutral', message: '목록 이름을 바꾸지 않았어요.' });
      return;
    }
    persistLibraryOnly(transition.library, `목록 이름을 “${title}”로 바꿨어요. 원문은 그대로입니다.`);
  };

  const duplicateCreatorDraft = (draftId: string): string | void => {
    const record = creatorDraftLibrary.records[draftId];
    if (!record) return;
    const newDraftId = createCreatorDraftId();
    const transition = transitionPersonalWorkspacePocCreatorDraftLibrary(
      creatorDraftLibrary,
      {
        type: 'duplicate',
        expectedLibraryRevision: creatorDraftLibrary.revision,
        expectedSourceRecordRevision: record.recordRevision,
        sourceDraftId: draftId,
        newDraftId,
        now: creatorMutationTime(),
      },
    );
    if (!transition.changed) {
      setStatus({ kind: 'failure', message: '초안 상태가 달라 복제하지 않았어요.' });
      return;
    }
    return persistLibraryOnly(
      transition.library,
      `“${transition.library.records[newDraftId]?.title ?? '복사본'}”을 새 초안으로 만들었어요.`,
    ) ? newDraftId : undefined;
  };

  const archiveCreatorDraft = (draftId: string) => {
    const record = creatorDraftLibrary.records[draftId];
    if (!record) return;
    if (draftId === currentCreatorDraftId && currentCreatorDraftDirty) {
      setMobileStep('result');
      setStatus({ kind: 'neutral', message: '현재 변경을 초안에 저장한 뒤 보관하세요. 아직 아무 내용도 옮기지 않았습니다.' });
      return;
    }
    const transition = transitionPersonalWorkspacePocCreatorDraftLibrary(
      creatorDraftLibrary,
      {
        type: 'archive',
        expectedLibraryRevision: creatorDraftLibrary.revision,
        expectedRecordRevision: record.recordRevision,
        draftId,
        now: creatorMutationTime(),
      },
    );
    if (!transition.changed) {
      setStatus({ kind: 'neutral', message: '이미 보관한 초안입니다.' });
      return;
    }
    if (draftId !== currentCreatorDraftId) {
      persistLibraryOnly(transition.library, `“${record.title}”을 보관함으로 옮겼어요.`);
      return;
    }
    let expectedAuthoringDraftRawValue: string | null;
    try {
      expectedAuthoringDraftRawValue = window.localStorage.getItem(
        PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,
      );
    } catch {
      setStatus({ kind: 'failure', message: '현재 초안 binding을 읽지 못해 보관하지 않았어요.' });
      return;
    }
    const saved = commitOwnedCreatorDraftStorage({
      storage: window.localStorage,
      transactionId: nextTransactionId('creator'),
      expectedLibraryRawValue: creatorDraftLibraryRaw,
      library: transition.library,
      expectedAuthoringDraftRawValue,
      authoringDraft: {
        version: 1,
        rawText,
        ...(templateId ? { templateId } : {}),
      },
    });
    if (!saved.ok) {
      failCreatorPersistence('초안을 보관하지 못했어요. 현재 내용은 그대로입니다.', saved.rollback);
      return;
    }
    setCreatorDraftLibrary(transition.library);
    setCreatorDraftLibraryRaw(saved.serializedLibrary);
    setCurrentCreatorDraftId(undefined);
    setStatus({ kind: 'success', message: `“${record.title}”을 보관함으로 옮겼어요. 현재 원문은 개인 작성으로 유지합니다.` });
  };

  const restoreCreatorDraft = (draftId: string) => {
    const record = creatorDraftLibrary.records[draftId];
    if (!record) return;
    const transition = transitionPersonalWorkspacePocCreatorDraftLibrary(
      creatorDraftLibrary,
      {
        type: 'restore',
        expectedLibraryRevision: creatorDraftLibrary.revision,
        expectedRecordRevision: record.recordRevision,
        draftId,
        now: creatorMutationTime(),
      },
    );
    if (!transition.changed) {
      setStatus({ kind: 'neutral', message: '이미 작성 중 목록에 있는 초안입니다.' });
      return;
    }
    persistLibraryOnly(transition.library, `“${record.title}”을 작성 중 목록으로 복원했어요.`);
  };

  const undoCreatorDraftMutation = () => {
    const transition = transitionPersonalWorkspacePocCreatorDraftLibrary(
      creatorDraftLibrary,
      {
        type: 'undo',
        expectedLibraryRevision: creatorDraftLibrary.revision,
        now: creatorMutationTime(),
      },
    );
    if (!transition.changed) {
      setStatus({ kind: 'neutral', message: '되돌릴 초안 변경이 없어요.' });
      return;
    }
    const currentWillStayActive = currentCreatorDraftId
      ? transition.library.records[currentCreatorDraftId]?.status === 'active'
      : true;
    if (currentWillStayActive) {
      persistLibraryOnly(transition.library, '마지막 초안 변경을 되돌렸어요.');
      return;
    }
    let expectedAuthoringDraftRawValue: string | null;
    try {
      expectedAuthoringDraftRawValue = window.localStorage.getItem(
        PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY,
      );
    } catch {
      setStatus({ kind: 'failure', message: '현재 초안 binding을 읽지 못해 되돌리지 않았어요.' });
      return;
    }
    const saved = commitOwnedCreatorDraftStorage({
      storage: window.localStorage,
      transactionId: nextTransactionId('creator'),
      expectedLibraryRawValue: creatorDraftLibraryRaw,
      library: transition.library,
      expectedAuthoringDraftRawValue,
      authoringDraft: {
        version: 1,
        rawText,
        ...(templateId ? { templateId } : {}),
      },
    });
    if (!saved.ok) {
      failCreatorPersistence('초안 변경을 되돌리지 못했어요. 현재 내용은 그대로입니다.', saved.rollback);
      return;
    }
    setCreatorDraftLibrary(transition.library);
    setCreatorDraftLibraryRaw(saved.serializedLibrary);
    setCurrentCreatorDraftId(undefined);
    setStatus({ kind: 'success', message: '마지막 초안 변경을 되돌렸어요.' });
  };

  const confirmDraftSwitch = async (saveFirst: boolean) => {
    const request = overlay?.kind === 'draft-switch' ? overlay : undefined;
    if (!request) return;
    setOverlay(undefined);
    overlayOpenerRef.current = null;
    if (saveFirst) {
      const saved = await saveCreatorDraft();
      if (!saved) return;
      if (request.mode === 'open' && request.draftId) {
        await openCreatorDraft(request.draftId, saved.library, saved.libraryRaw);
      } else {
        beginAuthoring('');
      }
      return;
    }
    if (request.mode === 'open' && request.draftId) {
      await openCreatorDraft(request.draftId);
    } else {
      beginAuthoring('');
    }
  };

  const commitHandoff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    if (entryAttempt.current || entryHistoryConsuming.current || !currentOwnedEntry()) { entryWriteFailure(); return; }
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
    const saved = commitOwnedHandoffStorage({
      storage: window.localStorage,
      state: result.state,
      transactionId: `${identity.handoffId}:commit:${result.state.revision}`,
      removeAuthoringDraft: true,
    });
    pending.current = false;
    if (!saved.ok) {
      if (entryAuthoringBridge.isLocked() || saved.error === 'entry-write-blocked') { entryWriteFailure(); return; }
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

  const canLeaveAuthoringDocument = () => {
    if (entryAttempt.current || entryHistoryConsuming.current || !currentOwnedEntry()) { entryWriteFailure(); return false; }
    if (receipt) return true;
    const draft = loadPersonalWorkspacePocAuthoringDraft(window.localStorage);
    if (!pending.current && !sourceHelperRecoveryRequired.current && lastDraftPersistenceOk.current
      && draft.kind !== 'corrupt' && rawText === (draft.kind === 'ready' ? draft.draft.rawText : '')) return true;
    setStatus({ kind: 'failure', message: '저장하지 못한 원문이 있어 이동하지 않았어요. 작성으로 돌아가 원문을 먼저 확인해 주세요.' });
    return false;
  };

  const renderEntryInput = () => (
    <section aria-labelledby="personal-workspace-authoring-write-heading" className={`${mobileStep === 'input' ? 'block' : 'hidden'} min-w-0 lg:block`}>
      <div hidden={Boolean(entryAuthoringPanel)} inert={Boolean(entryAuthoringPanel)}>
      <p className="text-xs font-bold tracking-[0.12em] text-teal-800">한 곳에서 시작</p>
      {authoringWasStarted.current || initialAuthoringDraft ? <button type="button" data-testid="personal-workspace-entry-resume-authoring" className={`${SECONDARY_CLASS} mb-3`}
        onClick={resumeEntryAuthoring}>작성으로 돌아가기</button> : null}
      <h2 id="personal-workspace-authoring-write-heading" tabIndex={-1} className="mt-1 scroll-mt-24 text-xl font-semibold tracking-[-0.02em] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">
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
        onCompositionStart={() => { entryComposing.current = true; setEntryCompositionActive(true); }}
        onCompositionEnd={() => { entryComposing.current = false; setEntryCompositionActive(false); }}
        className="mt-5 min-h-36 w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-base leading-6 outline-none placeholder:text-slate-500 focus:border-[var(--flowme-focus)] focus:ring-2 focus:ring-[var(--flowme-focus)]"
        placeholder="예: 이사 준비, https://…, 이번 주말 캠핑 준비"
        onChange={(event) => {
          entryReturnApplied.current = true;
          setEntryInput(event.target.value);
          setIntegratedResult({ resultView: 'text', openItemRef: null });
          setEntryPreview({ owner: 'personal-copy', resultView: 'text' });
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
                  data-entry-group-ref={group.groupRef}
                  className="flex min-h-14 w-full items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-left hover:border-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
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
                <div className="px-3 pb-2 text-xs leading-5 text-slate-600">
                  {group.children.map(child => {
                    const source = entryResult.ok ? entryResult.cards.find(card => card.flowRef === child.flowRef) : undefined;
                    return <div key={child.flowRef} className="min-w-0 break-words [overflow-wrap:anywhere]">
                      {group.kind === 'map' ? <span>{child.title} · </span> : null}
                      <span>{source?.sourceTitle ?? '출처명 정보 없음'}</span>
                      {source?.sourceLinks.length ? source.sourceLinks.map((link, index) => link.status === 'safe'
                        ? <a key={index} href={link.href} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex min-h-11 items-center text-teal-800 underline">원문 열기{source.sourceLinks.length > 1 ? ` ${index + 1}` : ''}</a>
                        : <span key={index}> · 원문 링크를 열 수 없어요.</span>) : <span> · 원문 링크 없음</span>}
                    </div>;
                  })}
                </div>
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
          disabled={entryCompositionActive || pending.current || entryHistoryConsuming.current || entryAuthoringBridge.isLocked()}
          onClick={prepareEntryAuthoring}
        >
          {entryResolution.kind === 'invalid-url' || (entryResolution.kind === 'url' && entryResolution.lookupStatus === 'miss') ? '텍스트로 계속' : '이 내용으로 새 Flow 작성'}
        </button>
      ) : (
        <button
          type="button"
          data-testid="personal-workspace-entry-start-template"
          className={`${SECONDARY_CLASS} mt-4 w-full`}
          onClick={startBlankWithTemplate}
        >
          빈 원문 시작 · 작성 틀과 예시 보기
        </button>
      )}
      </div>
      {entryAuthoringPanel ? (
        <section data-testid={entryAuthoringPanel.kind === 'confirm' || entryAuthoringPanel.kind === 'saving'
          ? 'personal-workspace-entry-authoring-confirm' : 'personal-workspace-entry-authoring-feedback'}
          data-state={entryAuthoringPanel.kind} aria-labelledby="personal-workspace-entry-authoring-heading"
          className="min-w-0 border-l-2 border-teal-600 bg-teal-50 p-3">
          <h3 id="personal-workspace-entry-authoring-heading" tabIndex={-1} className="text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">
            {entryAuthoringPanel.kind === 'confirm' ? '새 입력으로 바꿀까요?' : entryAuthoringPanel.kind === 'saving' ? '새 원문 보관 중' : '새 작성을 마치지 못했어요'}
          </h3>
          <label className="mt-3 grid min-w-0 gap-2 text-sm font-semibold">새로 작성할 원문
            <textarea readOnly value={entryAuthoringPanel.raw} rows={4} className="min-h-28 w-full resize-y rounded-md border border-slate-300 bg-white p-3 text-base font-normal leading-6" />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className={SECONDARY_CLASS} onClick={() => closeEntryAuthoring()}>취소</button>
            {entryAuthoringPanel.kind === 'confirm' || entryAuthoringPanel.kind === 'saving'
              ? <button type="button" className={PRIMARY_CLASS} disabled={entryAuthoringPanel.kind === 'saving'} onClick={commitEntryAuthoring}>새 작성으로 바꾸기</button>
              : entryAuthoringPanel.kind === 'failed' && !entryAuthoringBridge.isLocked()
                ? <button type="button" className={PRIMARY_CLASS} onClick={prepareEntryAuthoring}>다시 시도</button> : null}
          </div>
        </section>
      ) : null}
    </section>
  );

  const renderPropertyEditorForm = (surface: 'inline' | 'dependent') => {
    if (!propertyEditor) return null;
    const isSingle = propertyEditor.kind === 'single';
    if (propertyOwnerSelecting ? surface !== 'inline' : (
      isSingle ? propertyEditor.surface !== surface : surface !== 'dependent'
    )) return null;
    const stale = !isPersonalWorkspacePocAuthoringPropertyOwnerCurrent(propertyEditor.owner, editorSnapshot);
    const sameDocument = editorSnapshot?.documentId === propertyEditor.owner.snapshot.documentId
      && editorSnapshot?.editorId === propertyEditor.owner.snapshot.editorId;
    const candidateLine = availableHelperTarget?.kind === 'root-item'
      ? availableHelperTarget.ownerItemLine ?? availableHelperTarget.line
      : undefined;
    const candidateItem = parsedItems.find((item) => item.sourceLine === candidateLine);
    const recoveryRequired = sourceHelperFeedback.kind === 'recovery-required';
    const formBusy = sourceHelperFeedback.kind === 'saving' || recoveryRequired;
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
        data-owner-state={recoveryRequired ? 'recovery-required' : propertyOwnerSelecting ? 'selecting' : stale ? 'stale' : 'current'}
        aria-busy={sourceHelperFeedback.kind === 'saving'}
        aria-labelledby="personal-workspace-authoring-property-owner"
        className={surface === 'inline'
          ? 'mt-3 border-l-2 border-teal-600 bg-teal-50 px-3 py-3'
          : 'mt-4 rounded-lg border border-teal-300 bg-teal-50 p-3'}
        onSubmit={applyPropertyEditor}
        onCompositionStartCapture={() => { propertyInputComposing.current = true; }}
        onCompositionEndCapture={() => { propertyInputComposing.current = false; }}
        onKeyDownCapture={(event) => {
          if (event.key === 'Enter' && (propertyInputComposing.current
            || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <p id="personal-workspace-authoring-property-owner" data-testid="personal-workspace-authoring-property-owner" className="mb-2 break-words text-sm font-semibold text-teal-950">
          {propertyEditor.owner.itemTitle} · 항목 정보
        </p>
        {stale && !propertyOwnerSelecting && !recoveryRequired ? (
          <div className="mb-3 grid gap-2">
            <p data-testid="personal-workspace-authoring-property-stale" className="text-sm leading-6 text-amber-950">원문이 바뀌어 적용할 항목을 다시 확인해야 해요. 입력한 값은 남아 있어요.</p>
            <button type="button" data-testid="personal-workspace-authoring-property-reselect" className={SECONDARY_CLASS} disabled={formBusy || !sameDocument} onClick={beginPropertyOwnerSelection}>항목 다시 선택</button>
          </div>
        ) : null}
        {propertyOwnerSelecting ? (
          <div className="mb-3 grid gap-2">
            <p className="text-sm leading-6">원문에서 항목에 커서를 놓고 아래 제목을 확인해 주세요.</p>
            <p data-testid="personal-workspace-authoring-property-reselect-owner" className="break-words text-sm font-semibold">{candidateItem ? `선택할 항목: ${candidateItem.title}` : '아직 항목을 선택하지 않았어요.'}</p>
            <button type="button" data-testid="personal-workspace-authoring-property-reselect-confirm" className={SECONDARY_CLASS} disabled={!candidateItem || !sameDocument || formBusy || editorSnapshot?.composing} onClick={confirmPropertyOwnerSelection}>이 항목 선택</button>
          </div>
        ) : null}
        {sourceHelperFeedback.message ? (
          <p data-testid={recoveryRequired ? 'personal-workspace-authoring-property-recovery' : 'personal-workspace-authoring-property-feedback'} tabIndex={recoveryRequired ? -1 : undefined} className="mb-3 text-sm leading-6 text-amber-950">{sourceHelperFeedback.message}</p>
        ) : null}
        <fieldset disabled={formBusy || propertyOwnerSelecting} className="min-w-0">
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
              className="min-h-12 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-base outline-none focus:border-[var(--flowme-focus)] focus:ring-2 focus:ring-[var(--flowme-focus)]"
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
        </fieldset>
        <p className="mt-2 text-xs leading-5 text-slate-600">적용할 때만 이 항목의 원문을 한 번 바꾸며, Ctrl+Z 한 번으로 되돌릴 수 있습니다.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" data-testid="personal-workspace-authoring-property-cancel" className={SECONDARY_CLASS} disabled={formBusy} onClick={closePropertyEditor}>취소</button>
          {sourceHelperFeedback.kind === 'failed' && !stale && !propertyOwnerSelecting ? (
            <button type="submit" data-testid="personal-workspace-authoring-property-retry" className={PRIMARY_CLASS}>다시 시도</button>
          ) : (
            <button type="submit" data-testid="personal-workspace-authoring-property-apply" className={PRIMARY_CLASS} disabled={formBusy || stale || propertyOwnerSelecting}>{sourceHelperFeedback.kind === 'saving' ? '반영 중…' : '적용'}</button>
          )}
        </div>
      </form>
    );
  };

  const authoringSourceReadOnly = entryAuthoringBridge.isLocked() || sourceHelperRecoveryRequired.current;
  const renderValidationExampleControl = () => (
    <div data-testid="personal-workspace-authoring-validation-example-control" className="border-b border-slate-200 py-2">
      <button
        ref={validationExamplesToggleRef}
        type="button"
        data-testid="personal-workspace-authoring-validation-examples-open"
        aria-haspopup="dialog"
        aria-expanded={validationExamplesOpen}
        className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
        onClick={openValidationExamples}
      >
        <span><span aria-hidden="true" className="mr-2 text-teal-700">◎</span>검증 예시 찾아보기</span>
        <span className="text-xs font-medium text-slate-500">31개 · 읽기 전용</span>
      </button>
    </div>
  );
  const renderTemplateControl = () => (
      <div data-testid="personal-workspace-authoring-template-control" className="mt-4 border-y border-slate-200 py-2">
        <button
          ref={templateToggleRef}
          type="button"
          data-testid="personal-workspace-authoring-template-picker-toggle"
          aria-expanded={templatePickerOpen}
          aria-controls={TEMPLATE_PICKER_ID}
          className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
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
                  className={`min-h-14 rounded-md border px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] ${templatePreviewId === template.templateId ? 'border-teal-700 bg-teal-50/60' : 'border-slate-200 hover:border-teal-700'}`}
                  onPointerMove={() => setTemplatePreviewId(template.templateId)}
                  onFocus={() => setTemplatePreviewId(template.templateId)}
                  onPointerDown={preserveEditorSelection}
                  onClick={() => setTemplatePreviewId(template.templateId)}
                >
                  <strong className="block text-sm">{template.label}</strong>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">{template.description}</span>
                  <span className="mt-1 block text-xs font-semibold text-teal-800">예: {template.exampleLabel}</span>
                </button>
              ))}
            </div>
            {templatePreview ? (
              <PersonalWorkspacePocAuthoringTemplatePreview
                key={templatePreview.templateId}
                template={templatePreview}
                structure={structureTemplatePreview}
                disabled={pending.current || sourceHelperRecoveryRequired.current}
                onApplyScaffold={() => void applyTemplate(templatePreview.templateId)}
                onApplyExample={() => void applyStructureTemplatePreview()}
              />
            ) : null}
          </div>
        ) : null}
      </div>
  );
  const renderAuthoringInput = () => (
    <section
      ref={authoringInputSectionRef}
      data-testid="personal-workspace-authoring-input-section"
      data-source-empty={rawText.length === 0 ? 'true' : 'false'}
      aria-labelledby={authoringStarted ? 'personal-workspace-authoring-write-heading' : 'personal-workspace-authoring-write-heading-retained'}
      className={`${mobileStep === 'input' ? 'block' : 'hidden'} min-w-0 scroll-mt-20 lg:block lg:scroll-mt-0`}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold tracking-[0.12em] text-teal-800">원문</p>
          <h2 id={authoringStarted ? 'personal-workspace-authoring-write-heading' : 'personal-workspace-authoring-write-heading-retained'} tabIndex={-1} className="mt-1 scroll-mt-24 text-xl font-semibold tracking-[-0.02em] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">메모하듯 작성하세요</h2>
        </div>
        <button type="button" data-testid="personal-workspace-authoring-find-existing" className="min-h-11 rounded-md px-3 text-xs font-semibold text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]" onClick={() => {
          if (pending.current || entryAttempt.current || entryHistoryConsuming.current || sourceHelperRecoveryRequired.current) return;
          if (!lastDraftPersistenceOk.current) {
            setStatus({ kind: 'failure', message: '원문 저장을 확인하지 못해 검색을 열지 않았어요. 현재 원문은 그대로 남아 있습니다.' }); return;
          }
          const current = readPersonalWorkspacePocEntryNavigationBinding();
          if (!entryAuthoringBridge.inspect(current) || !current) { entryWriteFailure(); return; }
          entryReturnSnapshot.current = sourceRef.current?.readSnapshot() ?? null;
          entryReturnDocumentY.current = window.scrollY;
          entryReturnStatus.current = status;
          setEntryBinding(current); setEntryEpoch(observePersonalWorkspacePocEntryNavigation());
          entryInvalidated.current = false; setEntryStale(false);
          setEntryAuthoringPanel(undefined); setAuthoringStarted(false);
          setStatus({ kind: 'neutral', message: '기존 원문은 그대로 두고 저장된 Flow를 찾습니다.' });
        }}>기존 Flow 찾기</button>
      </div>
      <p data-testid="personal-workspace-authoring-input-guidance" className="mt-2 break-keep text-sm leading-6 text-slate-600">원문은 그대로 남고, 명시한 <code>- [ ]</code> 행만 실행 항목이 됩니다.</p>
      {rawText.length === 0 ? renderTemplateControl() : null}
      {rawText.length === 0 ? renderValidationExampleControl() : null}

      <div className="mt-4">
        <PersonalWorkspacePocLiveEditor
          key={`${currentCreatorDraftId ?? 'personal'}:${editorDocumentEpoch}`}
          ref={sourceRef}
          editorId={AUTHORING_EDITOR_ID}
          documentId={`${AUTHORING_DOCUMENT_ID}:${currentCreatorDraftId ?? 'personal'}:${editorDocumentEpoch}`}
          initialValue={rawText}
          lineGuides={liveEditorLineGuides}
          disabled={pending.current && !authoringSourceReadOnly}
          readOnly={authoringSourceReadOnly}
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
      {rawText.length > 0 ? renderTemplateControl() : null}
      {rawText.length > 0 ? renderValidationExampleControl() : null}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs leading-5 text-slate-500">
        <span>입력 {rawText.length.toLocaleString('ko-KR')}자 · 실행 항목 {parsedItems.length}개</span>
        <span>가이드는 원문·복사·저장에 포함되지 않습니다.</span>
      </div>
      <button
        type="button"
        data-testid="personal-workspace-authoring-result-cta"
        data-product-primary="authoring-preview"
        data-sticky={resultCtaSticky ? 'true' : 'false'}
        className={`${PRIMARY_CLASS} ${resultCtaSticky ? 'sticky bottom-[calc(max(.75rem,var(--personal-workspace-authoring-safe-bottom))+var(--personal-workspace-visual-viewport-bottom,0px))] shadow-lg' : 'static shadow-none'} mt-4 w-full lg:hidden`}
        data-keyboard-safe-action="true"
        onClick={() => setMobileStep('result')}
      >
        결과 보기 · {parsedItems.length}개
      </button>
    </section>
  );

  const renderExistingResult = () => {
    if (!entryPacket.ok) return <p data-testid="personal-workspace-entry-unavailable" role="alert" className="py-4 text-sm text-red-800">사본이나 원문 상태를 다시 확인해야 합니다. 새로고침 후 다시 선택해 주세요.</p>;
    if (!selectedFlow) {
      return (
        <div className="border-y border-slate-200 py-8 text-center text-sm leading-6 text-slate-500">왼쪽에서 기존 Flow를 고르면 여기에 미리보기가 나타납니다.</div>
      );
    }
    return (
      <>
        <button type="button" data-testid="personal-workspace-entry-back-list" className={`${SECONDARY_CLASS} mb-3`}
          onClick={() => {
            if (!entryIsCurrent()) return;
            if (mobileStep !== 'input') entryFocusHandled.current = true;
            setMobileStep('input');
            window.requestAnimationFrame(() => {
              if (!entryIsCurrent()) return;
              const button = [...document.querySelectorAll<HTMLElement>('[data-entry-group-ref]')]
                .find(value => value.dataset.entryGroupRef === integratedResult.selectedGroupRef);
              button?.focus({ preventScroll: true });
              const column = document.querySelector<HTMLElement>('[data-testid="personal-workspace-authoring-column"]');
              if (column) column.scrollTop = entryListScroll.current.inputY;
              window.scrollTo({ top: entryListScroll.current.documentY, behavior: 'instant' });
            });
          }}>목록으로</button>
        {selectedGroup?.kind === 'map' ? (
          <label className="mb-4 grid gap-2 text-sm font-semibold text-slate-950">
            어떤 Flow를 볼까요?
            <select
              data-testid="personal-workspace-entry-map-child"
              value={selectedFlow.ref}
              className="min-h-12 rounded-md border border-slate-300 bg-white px-3 text-base outline-none focus:border-[var(--flowme-focus)] focus:ring-2 focus:ring-[var(--flowme-focus)]"
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
        <h3 id="personal-workspace-entry-result-heading" tabIndex={-1} className="break-words text-xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">{entryFlowDisplayTitle(selectedFlow.ref, selectedFlow.title)}</h3>
        <PersonalWorkspacePocEntryPreview key={selectedFlow.ref} packet={entryPacket.packet} flowRef={selectedFlow.ref}
          localToday={entryToday} beforeReadAction={entryIsCurrent} presentation={entryPreview} onPresentationChange={next => { entryReturnApplied.current = true; setEntryPreview(next); }} />
        <Link prefetch={false} data-testid="personal-workspace-entry-open-flow" data-product-primary="existing-flow-open" href={getPersonalWorkspacePocAuthoringOpenHref(selectedFlow.ref)}
          onClick={event => {
            if (!entryIsCurrent()) { event.preventDefault(); return; }
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
            if (!canLeaveAuthoringDocument()) { event.preventDefault(); return; }
            const columns = document.querySelectorAll<HTMLElement>('[data-testid="personal-workspace-authoring-column"]');
            if (!entryBinding || entryEpoch === undefined || !capturePersonalWorkspacePocEntryNavigation(entryBinding, entryEpoch, {
              entryInput, groupRef: integratedResult.selectedGroupRef!, flowRef: selectedFlow.ref,
              panel: mobileStep === 'input' ? 'list' : 'preview', preview: entryPreview,
              scroll: { documentY: window.scrollY, inputY: columns[0]?.scrollTop ?? 0, resultY: columns[1]?.scrollTop ?? 0 }, focus: 'workspace-link',
              listReturn: entryListScroll.current,
            })) { event.preventDefault(); setStatus({ kind: 'failure', message: '돌아올 위치를 보관하지 못해 이동하지 않았어요. 현재 화면에서 다시 시도해 주세요.' }); }
          }}
          className={`${PRIMARY_CLASS} mt-4 inline-flex w-full items-center justify-center`}>개인공간에서 보기</Link>
      </>
    );
  };

  const renderPropertyCatalogEntry = (
    entry: (typeof PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG)[number],
  ) => {
    if (!helperItemSourceLine) return null;
    const location = !helperIsStale && entry.sourceKind === 'property'
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
              {helperIsStale ? '원문 변경 · 대상 확인 필요' : present ? '현재 값 있음' : editable ? '아직 입력하지 않음' : entry.blockedReason === 'requires-lossless-parser' ? '원문 손실 없는 parser가 필요함' : '현재 PoC에서 읽기 전용'}
              {entry.handoffSupport === 'preserved-blocking' && editable ? ' · 저장 전 정보 보존 확인 필요' : ''}
            </span>
          </div>
          <div className="flex shrink-0 gap-1">
            {present ? (
              <button
                type="button"
                data-testid={`personal-workspace-authoring-property-focus-${entry.key}`}
                className="min-h-11 rounded-md border border-slate-300 px-2 text-xs font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
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
                disabled={pending.current || (helperIsStale && !chooser?.drafts[entry.key])}
                className="min-h-11 rounded-md border border-teal-700 px-2 text-xs font-semibold text-teal-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
                onPointerDown={preserveEditorSelection}
                onClick={(event) => openPropertyEditor(entry.key, helperItemSourceLine, event.currentTarget)}
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
      <h2 id="personal-workspace-authoring-receipt-title" tabIndex={-1} className="mt-1 break-words text-2xl font-semibold tracking-[-0.02em] text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">{receipt.title}</h2>
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
          <h2 id="personal-workspace-authoring-result-heading" tabIndex={-1} className="mt-1 scroll-mt-24 text-xl font-semibold tracking-[-0.02em] outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">저장할 내용</h2>
        </div>
        <button type="button" data-testid="personal-workspace-authoring-review-open" aria-label={`원문과 실행 항목 검토, ${issues.length > 0 ? issues.length : parsedItems.length}개`} aria-expanded={reviewOpen} aria-controls="personal-workspace-authoring-review" aria-haspopup="dialog" className={`${SECONDARY_CLASS} shrink-0`} onClick={(event) => openReview(event.currentTarget)}>
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

      {currentCreatorDraft ? (
        <section data-testid="creator-draft-save-controls" className="mt-5 border-y border-teal-200 bg-teal-50/50 px-3 py-4">
          <p className="text-xs font-bold tracking-[0.1em] text-teal-800">제작자 초안 · 이 기기에만 저장</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">개인 폴더·완료·날짜와 공개 화면은 바뀌지 않습니다.</p>
          <button
            type="button"
            data-testid="creator-draft-save"
            data-product-primary="creator-draft-save"
            className={`${PRIMARY_CLASS} mt-3 w-full`}
            disabled={pending.current}
            onClick={() => void saveCreatorDraft()}
          >
            {pending.current ? '저장 중…' : '초안 변경 저장'}
          </button>
        </section>
      ) : (
        <form className="mt-5 grid gap-4" onSubmit={commitHandoff}>
          <label className="grid gap-2 text-sm font-semibold">저장할 폴더
            <select data-testid="personal-workspace-authoring-folder" value={folderId} className="min-h-12 rounded-md border border-slate-300 bg-white px-3 text-base outline-none focus:border-[var(--flowme-focus)] focus:ring-2 focus:ring-[var(--flowme-focus)]" onChange={(event) => setFolderId(event.target.value)}>
              <option value="">미분류</option>
              {sortedFolders.map((folder) => <option key={folder.folderId} value={folder.folderId}>{folderLabel(state, folder.folderId)}</option>)}
            </select>
          </label>
          {lossFields.length > 0 ? (
            <><div className="rounded-md bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-600"><strong className="block text-slate-900">저장 전에 확인할 내용</strong>{lossFields.map(lossFieldLabel).join(' · ')}</div><label className="flex min-h-12 cursor-pointer items-start gap-3 text-sm leading-6"><input type="checkbox" data-testid="personal-workspace-authoring-loss-confirm" checked={lossAccepted} className="mt-1 h-5 w-5 accent-teal-700" onChange={(event) => setLossAccepted(event.target.checked)} /><span>이 내용을 확인했어요.</span></label></>
          ) : null}
          <button type="submit" data-testid="personal-workspace-authoring-save" data-product-primary="authoring-save" data-keyboard-safe-action="true" className={`${PRIMARY_CLASS} sticky bottom-[calc(var(--flowme-mobile-workbar-bottom)+var(--personal-workspace-visual-viewport-bottom,0px))] w-full shadow-lg sm:bottom-[calc(max(.75rem,var(--personal-workspace-authoring-safe-bottom))+var(--personal-workspace-visual-viewport-bottom,0px))] lg:static lg:shadow-none`} disabled={pending.current}>{pending.current ? '저장 중…' : '내 Flow에 저장'}</button>
          <div className="border-t border-slate-200 pt-4">
            <button type="button" data-testid="creator-draft-save" className={`${SECONDARY_CLASS} w-full`} disabled={pending.current || !rawText.trim()} onClick={() => void saveCreatorDraft()}>제작 초안으로 저장</button>
            <p className="mt-2 text-center text-xs leading-5 text-slate-500">개인공간이나 공개 화면에는 아직 추가되지 않습니다.</p>
          </div>
        </form>
      )}
    </>
  );

  const overlayStyle = {
    '--poc-visual-viewport-top': 'var(--personal-workspace-visual-viewport-top, 0px)',
    '--poc-visual-viewport-height': 'var(--personal-workspace-visual-viewport-height, 100dvh)',
    '--poc-visual-viewport-bottom': 'var(--personal-workspace-visual-viewport-bottom, 0px)',
    ...(overlay?.kind === 'helper' ? {
      '--poc-helper-anchor-top': `${overlay.anchor.top}px`,
      '--poc-helper-anchor-bottom': `${overlay.anchor.bottom}px`,
      '--poc-helper-anchor-right': `${overlay.anchor.right}px`,
    } : {}),
  } as CSSProperties;

  return (
    <PersonalWorkspacePocProductShell
      mainTestId="personal-workspace-authoring-shell"
      mainClassName={inlinePropertyEditorActive ? 'personal-workspace-authoring-inline-property-active' : undefined}
      storagePrefix="flow:poc:personal-workspace:v1:"
      variant="authoring"
      href="#personal-workspace-authoring-content"
      skipLabel="새 Flow 작성 본문으로 건너뛰기"
    >
      <style>{`
        [data-testid="personal-workspace-authoring-content"] {
          padding-top: max(.75rem, var(--personal-workspace-authoring-safe-top));
          padding-right: max(1rem, var(--personal-workspace-authoring-safe-right));
          padding-bottom: max(var(--flowme-mobile-tab-clearance), calc(var(--personal-workspace-authoring-safe-bottom) + var(--personal-workspace-visual-viewport-bottom, 0px) + 5rem));
          padding-left: max(1rem, var(--personal-workspace-authoring-safe-left));
          scroll-padding-bottom: calc(var(--personal-workspace-authoring-safe-bottom) + var(--personal-workspace-visual-viewport-bottom, 0px) + 5rem);
        }
        [data-authoring-overlay] {
          bottom: calc(var(--poc-visual-viewport-bottom, 0px) + max(.5rem, var(--personal-workspace-authoring-safe-bottom)));
          max-height: min(28rem, calc(var(--poc-visual-viewport-height, 100dvh) - 1rem));
          overscroll-behavior: contain;
        }
        @media (max-width: 767px) { [data-testid="personal-workspace-authoring-shell"] textarea, [data-testid="personal-workspace-authoring-shell"] input, [data-testid="personal-workspace-authoring-shell"] select { font-size: 16px; } }
        @media (min-width: 640px) { [data-testid="personal-workspace-authoring-content"] { padding-bottom: max(2.5rem, calc(var(--personal-workspace-authoring-safe-bottom) + var(--personal-workspace-visual-viewport-bottom, 0px) + 5rem)); } }
        @media (min-width: 900px) {
          [data-testid="personal-workspace-authoring-helper-menu"] {
            inset-inline: auto;
            right: max(.75rem, var(--poc-helper-anchor-right, .75rem));
            --poc-helper-resolved-top: clamp(calc(var(--poc-visual-viewport-top, 0px) + .5rem), calc(var(--poc-helper-anchor-bottom, 0px) + .5rem), calc(var(--poc-visual-viewport-top, 0px) + var(--poc-visual-viewport-height, 100dvh) - 5rem));
            top: var(--poc-helper-resolved-top);
            bottom: auto;
            width: 22rem;
            max-height: min(28rem, calc(var(--poc-visual-viewport-top, 0px) + var(--poc-visual-viewport-height, 100dvh) - var(--poc-helper-resolved-top) - max(.5rem, var(--personal-workspace-authoring-safe-bottom))));
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
          [data-testid="personal-workspace-authoring-local-header"] { margin-top: .25rem; align-items: center; padding-bottom: .25rem; }
          [data-testid="personal-workspace-authoring-local-header"] h1 { font-size: 1rem; line-height: 1.5rem; }
          [data-testid="personal-workspace-authoring-scope-label"], [data-testid="personal-workspace-authoring-status-ready"] { display: none; }
          [data-testid="personal-workspace-authoring-status"] { margin-block: .25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-block: .25rem; }
          [data-testid="personal-workspace-authoring-mobile-stage-nav"] { margin-bottom: .375rem; }
          [data-testid="personal-workspace-authoring-mobile-stage-nav"] button, [data-testid="personal-workspace-live-editor-toolbar"] button { min-height: 2.75rem; }
          [data-testid="personal-workspace-authoring-columns"] { min-height: 0; flex: 1; overflow: hidden; }
          [data-testid="personal-workspace-authoring-column"] { height: 100%; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding-bottom: max(3.5rem, calc(var(--personal-workspace-authoring-safe-bottom) + var(--personal-workspace-visual-viewport-bottom, 0px) + 5rem)); scroll-padding-bottom: calc(var(--personal-workspace-authoring-safe-bottom) + var(--personal-workspace-visual-viewport-bottom, 0px) + 5rem); }
          [data-testid="personal-workspace-authoring-input-section"] { scroll-margin-top: 0; }
          [data-testid="personal-workspace-authoring-input-section"] > div:first-child { align-items: center; }
          [data-testid="personal-workspace-authoring-input-guidance"] { margin-top: 0; }
          [data-testid="personal-workspace-authoring-input-section"][data-source-empty="false"] { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: .75rem; align-items: center; }
          [data-testid="personal-workspace-authoring-input-section"][data-source-empty="false"] > div:first-child,
          [data-testid="personal-workspace-authoring-input-section"][data-source-empty="false"] > div.mt-4,
          [data-testid="personal-workspace-authoring-input-section"][data-source-empty="false"] > div.mt-2,
          [data-testid="personal-workspace-authoring-input-section"][data-source-empty="false"] > button { grid-column: 1 / -1; }
          [data-testid="personal-workspace-authoring-input-section"][data-source-empty="false"] [data-testid="personal-workspace-authoring-template-control"] { display: none; }
          [data-testid="personal-workspace-authoring-input-section"][data-source-empty="false"] [data-testid="personal-workspace-authoring-input-guidance"] { grid-column: 1; font-size: .75rem; line-height: 1.25rem; }
          [data-testid="personal-workspace-authoring-input-section"][data-source-empty="false"] [data-testid="personal-workspace-authoring-validation-example-control"] { grid-column: 2; border-bottom: 0; padding-block: 0; }
          [data-testid="personal-workspace-authoring-input-section"][data-source-empty="false"] [data-testid="personal-workspace-authoring-validation-examples-open"] { min-height: 2.75rem; width: auto; }
          [data-testid="personal-workspace-authoring-input-section"] > div.mt-4 { margin-top: .25rem; }
          [data-testid="personal-workspace-authoring-input-section"][data-source-empty="false"] > div.mt-4 { margin-top: 0; }
          [data-testid="personal-workspace-live-editor-frame"], [data-testid="personal-workspace-live-editor-textarea"] { min-height: 10rem; }
          /* The inline form needs its owner, error and actions in one scroll
             flow. Keep the global shell unchanged and release only this
             active authoring pane from the short-screen nested scroller. */
          [data-testid="personal-workspace-authoring-shell"].personal-workspace-authoring-inline-property-active { height: auto; min-height: 0; overflow: visible; }
          .personal-workspace-authoring-inline-property-active [data-testid="personal-workspace-authoring-content"] { display: block; height: auto; }
          .personal-workspace-authoring-inline-property-active [data-testid="personal-workspace-authoring-columns"] { height: auto; flex: none; overflow: visible; }
          .personal-workspace-authoring-inline-property-active [data-testid="personal-workspace-authoring-column"] { height: auto; overflow: visible; }
        }
      `}</style>
      <div id="personal-workspace-authoring-content" tabIndex={-1} data-testid="personal-workspace-authoring-content" className="mx-auto max-w-[1240px] pb-10 focus:outline-none">
        <header data-testid="personal-workspace-authoring-local-header" className="mt-3 flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="min-w-0">
            <h1 className="break-keep text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">새 Flow 만들기</h1>
            {currentCreatorDraft ? <p className="mt-1 truncate text-xs font-semibold text-teal-800">제작자 초안 · {currentCreatorDraft.title}</p> : null}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <button type="button" data-testid="creator-draft-library-open" disabled={Boolean(entryAuthoringPanel) || entryHistoryPending} className={SECONDARY_CLASS} onClick={() => setMobileStep((step) => step === 'library' ? 'input' : 'library')}>
              <span data-testid="personal-workspace-authoring-tab-library">{mobileStep === 'library' ? '작성으로' : `내 초안 ${creatorDraftItems.filter((draft) => draft.status === 'active').length}`}</span>
            </button>
            <a data-testid="personal-workspace-authoring-exit" href="/my?personalWorkspacePoc=v1" onClick={event => {
              if (!(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) && !canLeaveAuthoringDocument()) event.preventDefault();
            }} className={`${SECONDARY_CLASS} inline-flex shrink-0 items-center`}><span aria-hidden="true" className="mr-1">←</span><span className="hidden sm:inline">개인공간</span><span className="sm:hidden">돌아가기</span></a>
          </div>
        </header>

        {status.kind !== 'ready' ? <div data-testid="personal-workspace-authoring-status" data-status={status.kind} role={receipt ? undefined : status.kind === 'failure' ? 'alert' : 'status'} aria-live={receipt ? 'off' : status.kind === 'failure' ? 'assertive' : 'polite'} aria-hidden={receipt ? true : undefined} className={receipt ? 'sr-only' : `my-3 border-l-2 px-3 py-2 text-sm font-semibold ${statusClass(status.kind)}`}>{status.message}</div> : <p data-testid="personal-workspace-authoring-status-ready" className="sr-only">작성 중인 원문은 이 기기에 임시 보관됩니다.</p>}
        {sourceHelperFeedback.kind === 'recovery-required' ? (
          <a data-testid="personal-workspace-authoring-recovery-exit" href="/my" className={`${SECONDARY_CLASS} mb-3 inline-flex items-center`}>기존 화면으로 돌아가기</a>
        ) : null}

        {showMobileStageNav ? <nav data-testid="personal-workspace-authoring-mobile-stage-nav" aria-label="작성 단계" inert={Boolean(entryAuthoringPanel) || entryHistoryPending} className="mb-4 grid grid-cols-2 border-b border-[var(--flowme-workspace-line)] lg:hidden">
          <button type="button" data-testid="personal-workspace-authoring-tab-input" aria-current={mobileStep === 'input' ? 'step' : undefined} className={`min-h-12 border-b-2 px-2 text-sm font-semibold ${mobileStep === 'input' ? 'border-[var(--flowme-workspace-accent)] text-[var(--flowme-workspace-accent-strong)]' : 'border-transparent text-[var(--flowme-text-secondary)]'}`} onClick={() => setMobileStep('input')}>입력</button>
          <button type="button" data-testid="personal-workspace-authoring-tab-result" aria-current={mobileStep === 'result' ? 'step' : undefined} className={`min-h-12 border-b-2 px-2 text-sm font-semibold ${mobileStep === 'result' ? 'border-[var(--flowme-workspace-accent)] text-[var(--flowme-workspace-accent-strong)]' : 'border-transparent text-[var(--flowme-text-secondary)]'}`} onClick={() => setMobileStep('result')}>결과</button>
        </nav> : null}

        {mobileStep === 'library' ? (
          <div data-testid="personal-workspace-authoring-library-column" className="mx-auto min-w-0 max-w-3xl">
            <PersonalWorkspacePocCreatorDraftLibrary
              drafts={creatorDraftItems}
              currentDraftId={currentCreatorDraftId}
              busy={pending.current}
              undoLabel={creatorDraftLibrary.undo?.label}
              onOpen={requestCreatorDraftOpen}
              onRename={renameCreatorDraft}
              onDuplicate={duplicateCreatorDraft}
              onArchive={archiveCreatorDraft}
              onRestore={restoreCreatorDraft}
              onUndo={undoCreatorDraftMutation}
              onNewDraft={requestNewCreatorDraft}
            />
          </div>
        ) : receipt ? (
          <div id="personal-workspace-authoring-write-heading-anchor" data-testid="personal-workspace-authoring-columns" className="min-w-0">
            <div data-testid="personal-workspace-authoring-column" className="min-w-0">
              {renderAuthoringReceipt()}
            </div>
          </div>
        ) : (
          <div id="personal-workspace-authoring-write-heading-anchor" data-testid="personal-workspace-authoring-columns" className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)] lg:gap-10">
            <div data-testid="personal-workspace-authoring-column" className={`${mobileStep === 'input' ? 'block' : 'hidden'} min-w-0 lg:block lg:pr-2`}>
              {authoringWasStarted.current ? <div hidden={!authoringStarted} inert={!authoringStarted}>{renderAuthoringInput()}</div> : null}
              {!authoringStarted ? renderEntryInput() : null}
            </div>
            <section data-testid="personal-workspace-authoring-column" aria-labelledby="personal-workspace-authoring-result-heading" inert={Boolean(entryAuthoringPanel)} aria-hidden={entryAuthoringPanel ? true : undefined} style={entryAuthoringPanel ? { visibility: 'hidden' } : undefined} className={`${mobileStep === 'result' ? 'block' : 'hidden'} min-w-0 lg:block lg:border-l lg:border-slate-200 lg:pl-8`}>
              {authoringStarted ? renderAuthoringResult() : <><p className="text-xs font-bold tracking-[0.12em] text-teal-800">결과</p><h2 id="personal-workspace-authoring-result-heading" tabIndex={-1} className="mt-1 text-xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">기존 Flow 미리보기</h2><div className="mt-4">{renderExistingResult()}</div></>}
            </section>
          </div>
        )}
      </div>

      <div data-testid="personal-workspace-authoring-owned-overlays" hidden={!authoringStarted} inert={!authoringStarted}>
      <PersonalWorkspacePocValidationExampleExplorer
        open={validationExamplesOpen}
        sourceEmpty={rawText.length === 0}
        entries={PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG}
        onApply={(example) => void applyValidationExample(example)}
        onClose={closeValidationExamples}
      />

      {overlay?.kind === 'helper' ? (
        <aside
          id={HELPER_MENU_ID}
          ref={overlayDialogRef}
          data-testid="personal-workspace-authoring-helper-menu"
          data-chooser-stage={chooserView?.stage ?? 'structure'}
          data-authoring-overlay="helper"
          role="dialog"
          aria-labelledby="personal-workspace-authoring-helper-heading"
          className="fixed inset-x-2 z-50 overflow-y-auto rounded-xl border border-slate-300 bg-white p-4 shadow-2xl"
          style={overlayStyle}
        >
          <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-teal-800">{overlay.target.kind === 'root-item' ? '현재 할 일 안에' : '현재 위치에'}</p><h2 ref={overlayHeadingRef} id="personal-workspace-authoring-helper-heading" tabIndex={-1} className="mt-1 break-words text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">{chooserView?.stage === 'structure' ? '무엇을 추가할까요?' : overlay.itemTitle ?? '항목 정보'}</h2></div><button type="button" aria-label="원문 작성 도움 닫기" className={`${SECONDARY_CLASS} shrink-0`} disabled={pending.current} onClick={() => closeOverlay('내용을 추가하지 않았어요. 원문은 그대로입니다.')}>닫기</button></div>
          {chooserView?.stage !== 'structure' ? <button type="button" data-testid="personal-workspace-authoring-chooser-back" className={`${SECONDARY_CLASS} mt-3`} disabled={pending.current} onClick={() => navigateChooser({ type: 'back' })}>뒤로</button> : null}
          {helperIsStale ? <p data-testid="personal-workspace-authoring-chooser-stale" className="mt-3 text-sm leading-6 text-amber-950">원문이 바뀌었어요. 입력하던 값은 다시 열어 항목을 재선택할 수 있습니다. 새 정보를 넣으려면 도움을 닫고 항목을 다시 선택해 주세요.</p> : null}
          {sourceHelperFeedback.message ? <p data-testid="personal-workspace-authoring-helper-feedback" tabIndex={sourceHelperFeedback.kind === 'recovery-required' ? -1 : undefined} className="mt-3 text-sm leading-6 text-amber-950">{sourceHelperFeedback.message}</p> : null}
          {chooserView?.stage === 'structure' ? PERSONAL_WORKSPACE_POC_AUTHORING_GUIDE_CATALOG.menuGroups.map((group) => {
            const actions = helperActions.filter((action) => action.groupId === group.groupId);
            if (overlay.target.kind === 'root-item' && group.groupId === 'item-information') return null;
            if (actions.length === 0) return null;
            return <section key={group.groupId} className="mt-4"><h3 className="text-xs font-semibold text-slate-500">{group.label}</h3><div className="mt-1 grid gap-1">{actions.map((action) => <button key={action.actionId} type="button" data-testid={`personal-workspace-authoring-helper-${action.actionId}`} disabled={pending.current || action.availability !== 'enabled'} className="min-h-12 rounded-md border border-slate-200 px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] disabled:bg-slate-50 disabled:text-slate-400" onPointerDown={preserveEditorSelection} onClick={() => applyHelper(action.actionId)}><span aria-hidden="true" className="font-mono text-xs text-teal-800">{action.syntax}</span><strong className="ml-3 text-sm">{action.label}</strong>{action.blockedReason ? <span className="mt-1 block text-xs leading-5">{action.blockedReason}</span> : null}</button>)}</div></section>;
          }) : null}
          {chooserView?.stage === 'structure' && helperItemSourceLine ? <button type="button" data-testid="personal-workspace-authoring-chooser-information" className={`${SECONDARY_CLASS} mt-3 w-full text-left`} disabled={pending.current} onClick={() => navigateChooser({ type: 'show-groups' })}><span className="block">항목 정보</span><span className="mt-1 block text-xs font-normal">날짜 · 시간 · 장소 · 반복 · 자료 · 완료 기준</span></button> : null}
          {chooserView?.stage === 'groups' ? <PersonalWorkspacePocAuthoringChooserGroups groups={chooserView.groups} disabled={pending.current || sourceHelperRecoveryRequired.current} onChoose={(group) => navigateChooser({ type: 'choose-group', group })} /> : null}
          {helperItemSourceLine && chooserView?.stage === 'properties' ? (
            <section data-testid="personal-workspace-authoring-property-catalog" className="mt-4" aria-labelledby="personal-workspace-authoring-property-catalog-heading">
              <h3 id="personal-workspace-authoring-property-catalog-heading" className="text-sm font-semibold text-slate-800">{chooserView.group ? getAuthoringChooserGroup(chooserView.group)?.label : '항목 정보'}</h3>
                <section data-testid={`personal-workspace-authoring-property-group-${chooserView.group}`} className="mt-3">
                  <ul className="mt-1 grid gap-1">
                    {chooserView.propertyKeys.map((key) => getPersonalWorkspacePocAuthoringProperty(key)).filter((entry): entry is (typeof PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG)[number] => Boolean(entry)).map(renderPropertyCatalogEntry)}
                  </ul>
                </section>
              {!helperIsStale && chooserView.group === 'execution' && parsedItems.find((item) => item.sourceLine === helperItemSourceLine)?.subchecks?.length ? (
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
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-teal-800">선택형 검토</p><h2 ref={overlayHeadingRef} id="personal-workspace-authoring-review-heading" tabIndex={-1} className="mt-1 text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">원문과 실행 항목</h2></div><button type="button" aria-label="원문과 실행 항목 검토 닫기" className={`${SECONDARY_CLASS} shrink-0`} onClick={() => closeOverlay()}>닫기</button></div>
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
      ) : overlay?.kind === 'draft-switch' ? (
        <aside
          ref={overlayDialogRef}
          data-testid="creator-draft-switch-confirmation"
          data-authoring-overlay="draft-switch"
          role="dialog"
          aria-modal="true"
          aria-labelledby="creator-draft-switch-heading"
          className="fixed inset-x-2 z-50 overflow-y-auto rounded-xl border border-slate-300 bg-white p-4 shadow-2xl md:left-1/2 md:right-auto md:w-[28rem] md:-translate-x-1/2"
          style={overlayStyle}
        >
          <p className="text-xs font-semibold text-teal-800">저장하지 않은 변경</p>
          <h2 ref={overlayHeadingRef} id="creator-draft-switch-heading" tabIndex={-1} className="mt-1 text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">
            현재 내용을 어떻게 할까요?
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {overlay.mode === 'open'
              ? `“${overlay.draftId ? creatorDraftLibrary.records[overlay.draftId]?.title ?? '선택한 초안' : '선택한 초안'}”을 열기 전에 현재 원문을 처리하세요.`
              : '새 원문을 시작하기 전에 현재 원문을 처리하세요.'}
          </p>
          <div className="mt-4 grid gap-2">
            <button type="button" data-testid="creator-draft-switch-save" className={PRIMARY_CLASS} disabled={pending.current || !rawText.trim()} onClick={() => void confirmDraftSwitch(true)}>현재 내용을 초안으로 저장 후 계속</button>
            <button type="button" data-testid="creator-draft-switch-discard" className={SECONDARY_CLASS} disabled={pending.current} onClick={() => void confirmDraftSwitch(false)}>변경 버리고 계속</button>
            <button type="button" data-testid="creator-draft-switch-cancel" className={SECONDARY_CLASS} disabled={pending.current} onClick={() => closeOverlay('초안을 바꾸지 않았어요. 현재 원문은 그대로입니다.')}>취소</button>
          </div>
        </aside>
      ) : null}
      {propertyEditor && dependentPropertyOpen ? (
        <aside
          data-testid="personal-workspace-authoring-dependent-property-surface"
          data-authoring-overlay="dependent-property"
          role="dialog"
          aria-labelledby="personal-workspace-authoring-dependent-property-heading"
          className="fixed inset-x-2 z-50 max-h-[min(28rem,calc(100dvh-1rem))] overflow-y-auto rounded-xl border border-slate-300 bg-white p-4 shadow-2xl md:left-auto md:right-3 md:w-[24rem]"
          style={overlayStyle}
        >
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-semibold text-teal-800">원문 {propertyEditor.itemSourceLine}행</p><h2 ref={overlayHeadingRef} id="personal-workspace-authoring-dependent-property-heading" tabIndex={-1} className="mt-1 text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]">함께 설정할 값</h2></div>
            <button type="button" aria-label="항목 정보 편집 닫기" className={`${SECONDARY_CLASS} shrink-0`} onClick={closePropertyEditor}>닫기</button>
          </div>
          {renderPropertyEditorForm('dependent')}
        </aside>
      ) : null}
      </div>
    </PersonalWorkspacePocProductShell>
  );
}
