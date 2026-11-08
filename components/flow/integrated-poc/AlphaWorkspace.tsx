'use client';
import {claimOwnedWritingAck,privateTextChangeIsolatedToDocument,noteWritingPhase} from '@/lib/flow/integrated-poc/writing-ack';
import { remoteTextSparesDocuments } from '@/lib/flow/integrated-poc/remote-text-baseline';

import {createWritingCompute,type WritingCompute} from '@/lib/flow/integrated-poc/writing-compute';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { restoreProgramDialogFocus, restoreProgramWritingReturn, watchProgramReturnIntent, type ProgramWritingReturn } from '@/lib/flow/integrated-poc/dialog-return-focus';
import { programFailure } from '@/lib/flow/integrated-poc/contract';
import type { AlphaAuthConfig } from '@/lib/flow/integrated-poc/alpha-auth/config';
import type { VerifiedAlphaSession } from '@/lib/flow/integrated-poc/alpha-auth/account-access';
import { createAlphaSyncController, type AlphaSyncSnapshot } from '@/lib/flow/integrated-poc/alpha-sync/controller';
import type { AlphaCommand } from '@/lib/flow/integrated-poc/alpha-persistence/contract';
import { createAlphaHttpRepository } from '@/lib/flow/integrated-poc/alpha-sync/http-repository';
import {createAlphaLegacyWritingRepository,matchesAlphaLegacyWritingTransport,type AlphaLegacyWritingTransport} from '@/lib/flow/integrated-poc/alpha-sync/legacy-writing-transport';
import { isSyntheticAlphaWorkspaceInput, type SyntheticAlphaWorkspaceRuntime } from '@/lib/flow/integrated-poc/alpha-sync/workspace-runtime';
import { newProgramReviewDraft, programReviewOriginReason, type ProgramReviewEntry, type ProgramReviewOrigin, type ProgramReviewSpacePort } from '@/lib/flow/integrated-poc/review-return';
import { createAlphaTabRecovery } from '@/lib/flow/integrated-poc/alpha-sync/recovery';
import { createAlphaUiRecovery, type AlphaUiDraft, type AlphaUiRecoveryRecord } from '@/lib/flow/integrated-poc/alpha-ui-recovery';
import { createAlphaUiRecoveryKeep, keepAlphaUiRecovery, type AlphaUiRecoveryKeep } from '@/lib/flow/integrated-poc/alpha-ui-recovery-keep';
import { createAlphaStructuralRecovery, resolveAlphaStructuralRecovery, type AlphaStructuralEditorPort, type AlphaStructuralRecoveryEntry, type AlphaStructuralRecoveryRecord } from '@/lib/flow/integrated-poc/alpha-structural-recovery';
import { type ProgramData, type ProgramParticipationDraft, type ProgramPublicationDraft, programId } from '@/lib/flow/integrated-poc/contract';
import type { ProgramProposalReviewDraft } from '@/lib/flow/integrated-poc/review-drafts';
import { programInputBoundaryCurrent, readProgramInputBoundary, programInputCanRelease, type ProgramEditorFlush } from '@/lib/flow/integrated-poc/document-action';
import { waitProgramMoveFlush, type ProgramMoveWaitOutcome } from '@/lib/flow/integrated-poc/move-save-wait';
import { type ProgramDestination, type ProgramMutate, programErrorMessage, PROGRAM_BUSY_NOTICE, PROGRAM_QUEUED_NOTICE, PROGRAM_SOURCE_QUEUED_NOTICE } from '@/lib/flow/integrated-poc/ui-contract';
import { automaticReadToAwait, queueTap, sourceReturnWait, unqueueTap, type QueuedTaps } from '@/lib/flow/integrated-poc/automatic-read-wait';
import { AUTOMATIC_READ_INPUT_EVENTS, automaticReadSchedule } from '@/lib/flow/integrated-poc/automatic-read-idle';
import { pendingResultUnknown } from '@/lib/flow/integrated-poc/save-status';
import { programServerStatus } from '@/lib/flow/integrated-poc/program-status';
import { ProgramServerStatusContext, type ProgramServerStatusView } from './program-status-context';
import { addProgramLinkMemo, createProgramDocument, importProgramPublicVersion } from '@/lib/flow/integrated-poc/private-space';
import { programCanonicalLink, programLinkHome, programLinkMemoRaw } from '@/lib/flow/integrated-poc/link-lookup';
import { programFencedRecoveryRaw } from '@/lib/flow/integrated-poc/recovery-restore';
import { captureProgramImportLinks, cancelProgramImportLinks, programImportTargets, programImportReceiptOwnsLinks, type ProgramImportLinks } from '@/lib/flow/integrated-poc/program-import-links';
import { programExecutionTasks, programLocalDate } from '@/lib/flow/integrated-poc/execution';
import { programImportSpan } from '@/lib/flow/integrated-poc/import-preview';
import { PROGRAM_TRIED_ASK, PROGRAM_TRIED_EMPTY, programFlowsJustFinished, programPendingFinish, programTriedAdd, programTriedDone, programTriedDraft, programTriedShow, type ProgramTriedQueue } from '@/lib/flow/integrated-poc/flow-loop';
import { textWorkspaceModel as M, type TextWorkspaceState } from '@/lib/flow/integrated-poc/text-workspace';
import { ProgramSpace, useProgramMobileWritingChrome, type ProgramMainTab } from './ProgramSpace';
import { programSourceNavigationReady } from '@/lib/flow/integrated-poc/pending-source-navigation';
import { DEV_NOTICE_TEXT, DEV_NOTICE_VERSION, markDevNoticeSeen, readDevNoticeSeen } from '@/lib/flow/integrated-poc/dev-notice';
import { ProgramLegacyWorkspace } from './ProgramLegacyWorkspace';
import { ProgramPrivateOutput } from './ProgramPrivateOutput';
import { ProgramCreatorWorkspace } from './ProgramCreatorWorkspace';
import { ProgramDiscovery, createProgramDiscoveryNavigationState, programDiscoveryHasUnstoredInput, type ProgramImportOutcome, type ProgramImportRepeatInput } from './ProgramDiscovery';
import { programImportArrivalNotice, programImportCancelNotice, programImportRepeatNotice, programImportTargetNotice } from '@/lib/flow/integrated-poc/program-discovery-display';
import { programImportRepeats } from '@/lib/flow/integrated-poc/public-repeat-import';
import { PROGRAM_BROWSE_VIEWS, programBrowseHistoryAllowed, programEmptyHistoryOrigin, programHistoryAfterChange, programHistoryAfterStep } from '@/lib/flow/integrated-poc/program-history-origin';
import { ProgramCommunity, type ProgramCommunityDraftSaveRecovery } from './ProgramCommunity';
import { ProgramPublisher } from './ProgramPublisher';
import { ProgramCopyInspector } from './ProgramCopyInspector';
import { emptyProgramCommunityPresentation, parseProgramLocation, programLocation } from '@/lib/flow/integrated-poc/navigation';
import { alphaSocialSettledEntry, createAlphaSocialRecovery, type AlphaSocialRecoveryRecord, type AlphaSocialRecoveryEntry } from '@/lib/flow/integrated-poc/alpha-social-recovery';
import { type AlphaSocialIntent, isAlphaSocialIntent } from '@/lib/flow/integrated-poc/alpha-social/contract';
import { executeAlphaSocialIntent } from '@/lib/flow/integrated-poc/alpha-social/dispatch';
import { createAlphaCommunityMediaPort } from '@/lib/flow/integrated-poc/alpha-social/media-client';
import { createAlphaCreatorRecovery, type AlphaCreatorRecoveryEntry, type AlphaCreatorRecoveryRecord } from '@/lib/flow/integrated-poc/alpha-creator-recovery';
import { setProgramCreatorWorking } from '@/lib/flow/integrated-poc/creator-workspace';
import { canonicalJson, detached } from '@/lib/flow/integrated-poc/alpha-persistence/json';
import { announcedRecoveryEntries, newRecoveryTags, programRecoveryToastText, readRecoverySeen, recoveryDraftIdentity, recoveryEntryTag, recoveryLineDocumentId, writeRecoverySeen } from '@/lib/flow/integrated-poc/saved-input-notice';
import { confirmedAlphaPrivateTextSave } from '@/lib/flow/integrated-poc/alpha-private-save-ack';
import { createAlphaDocumentCollections } from '@/lib/flow/integrated-poc/alpha-document-collections';
import type { DocumentCollections } from '@/lib/flow/integrated-poc/document-collections';
import { AlphaConflictReview } from './AlphaConflictReview';
import { AlphaCatalogPanels } from './AlphaCatalogPanels';
import { AlphaPrivacyNotice } from './AlphaPrivacyNotice';
import { readPrivacyContact } from '@/lib/flow/integrated-poc/privacy-notice';
import styles from './AlphaWorkspace.module.css';

const SLOT_KEY = 'flow:poc:personal-workspace:v1:alpha-m3:tab';
const POLL_MS = 20_000;
const AlphaPreservationPanel = dynamic(() => import('./AlphaPreservationPanel').then(module => module.AlphaPreservationPanel), { ssr: false });
const capability = { discovery: true, publication: true, copyInspection: true, revisionHistory: false, creatorNavigation: true, taskClassification: true };
type Controller = ReturnType<typeof createAlphaSyncController>;
type UiRecovery = ReturnType<typeof createAlphaUiRecovery>;
/** What became of a move (navigate()). */
type ProgramMoveResult = 'moved' | 'refused' | 'not-saved' | 'late' | 'stayed' | 'superseded' | 'dropped';
/** Save wait P3: a move waiting on its save, the place it goes once saved, and its result for a press that took it over. */
type ProgramMoveFlight = { target: { next: ProgramDestination; chooseCreatorEntry: boolean }; done: Promise<ProgramMoveResult> };
// Presentation identity only. Never copy private draft text into announcement state.
function reviewAnnouncementState(snapshot: AlphaSyncSnapshot | null | undefined) {
  return JSON.stringify([snapshot?.ownerId, snapshot?.status, snapshot?.busy, snapshot?.pending?.requestId,
    snapshot?.draft?.requestId, snapshot?.lastReceipt?.requestId, snapshot?.account?.revision, snapshot?.publicRevision]);
}
const labels: Record<AlphaSyncSnapshot['status'], string> = {
  'signed-out': '로그인이 필요합니다', ready: '저장됨', saving: '저장 중…', saved: '저장됨',
  'same-location': '변경 없음', cancelled: '취소했습니다', conflict: '다른 곳에서 먼저 저장했습니다',
  'session-expired': '로그인이 만료되었습니다', 'checking-result': '저장 여부 확인 못 함', 'recovery-required': '저장 상태를 확인해 주세요',
};
function mergeRecoveryDrafts(parked: readonly AlphaUiDraft[], active: readonly AlphaUiDraft[]): AlphaUiDraft[] {
  const all = [...parked, ...active], identity = (draft: AlphaUiDraft) => JSON.stringify([draft.documentId ?? null, draft.title, draft.raw]);
  const last = new Map(all.map((draft, index) => [identity(draft), index]));
  return all.filter((draft, index) => last.get(identity(draft)) === index).map(draft => ({ ...draft }));
}

/** Receipt proof belongs to confirmedAlphaPrivateTextSave. This only limits its
 * local input exemption to one source document, including source subchecks. */

function mergeStructuralRecoveryEntries(parked: readonly AlphaStructuralRecoveryEntry[], active: readonly AlphaStructuralRecoveryEntry[]) {
  const entries = new Map<string, AlphaStructuralRecoveryEntry>();
  for (const entry of [...parked, ...active]) entries.set(canonicalJson(entry), detached(entry));
  return [...entries.values()];
}

type AlphaWorkspaceProps = {
  config: AlphaAuthConfig; session: VerifiedAlphaSession; email: string; onSignOut: () => Promise<void>; pmWriting?:'v11-pm/1';nativeAuthoringEnabled?:boolean;
  /** Egress probe for the automatic reads (server v2 read functions). Off unless the deployment opts in. */
  readProbe?: boolean;
  /** R7: the contact address in 저장과 공개 안내, from the server's FLOWME_ALPHA_PRIVACY_CONTACT. */
  privacyContact?: string;
};
export function AlphaWorkspace({ config, session, email, onSignOut, pmWriting, nativeAuthoringEnabled, readProbe, privacyContact }: AlphaWorkspaceProps) {
  // Do not forward unknown JS props into the test-only injection seam.
  return <AlphaWorkspaceBody key={session.userId} config={config} session={session} email={email} onSignOut={onSignOut} pmWriting={pmWriting==='v11-pm/1'?'v11-pm/1':undefined} nativeAuthoringEnabled={nativeAuthoringEnabled} readProbe={readProbe === true} privacyContact={privacyContact} />;
}
/** Opt-in native legacy writer. The default entry and synthetic PM seam remain separate. */
export function AlphaWorkspaceLegacyWriting(props:AlphaWorkspaceProps&{transport:AlphaLegacyWritingTransport}){
 if(!matchesAlphaLegacyWritingTransport(props.transport,props.config,props.session))return <p role="alert">기존 작성 연결을 확인하지 못했습니다. 입력을 다른 계정에 옮기지 않았습니다.</p>;
 return <AlphaWorkspaceBody key={props.session.userId} config={props.config} session={props.session} email={props.email} onSignOut={props.onSignOut} legacyTransport={props.transport} privacyContact={props.privacyContact}/>;
}
/** Isolated fixture entry only. Existing production entry never accepts injection. */
export function AlphaWorkspaceSyntheticFixture(props: AlphaWorkspaceProps & { runtime: SyntheticAlphaWorkspaceRuntime }) {
  if (!isSyntheticAlphaWorkspaceInput(props.runtime, props.config, props.session)) return <p role="alert">합성 Alpha 실행 설정을 확인해 주세요.</p>;
  return <AlphaWorkspaceBody key={props.session.userId} {...props} syntheticRuntime={props.runtime} />;
}
function AlphaWorkspaceBody({ config, session, email, onSignOut, syntheticRuntime,legacyTransport,pmWriting,nativeAuthoringEnabled,readProbe,privacyContact }: AlphaWorkspaceProps & { syntheticRuntime?: SyntheticAlphaWorkspaceRuntime;legacyTransport?:AlphaLegacyWritingTransport }) {
  const request = legacyTransport?.request ?? syntheticRuntime?.request ?? fetch;
  const sessionEpoch = useMemo(() => ({}), [session.userId, session.accessToken]);
  const sessionEpochRef = useRef(sessionEpoch); sessionEpochRef.current = sessionEpoch;
  const [snapshot, setSnapshot] = useState<AlphaSyncSnapshot | null>(null), [data, setData] = useState<ProgramData | null>(null);
  const chromeRoot = useRef<HTMLElement>(null);
  const writingWithKeyboard = useProgramMobileWritingChrome(chromeRoot, !!snapshot && !!data);
  const [destination, setDestination] = useState<ProgramDestination>({ view: 'space' });
  const destinationRef = useRef(destination); destinationRef.current = destination;
  const reviewSpace = useRef<ProgramReviewSpacePort | null>(null);
  const reviewContext = useRef<{ origin: ProgramReviewOrigin; port: ProgramReviewSpacePort; editor: ProgramEditorFlush | null; draftId: string; postId?: string; epoch: object } | null>(null);
  const [reviewEntry, setReviewEntry] = useState<ProgramReviewEntry | null>(null);
  const reviewResultReceiver = useRef<((submitted: ProgramParticipationDraft, postId: string) => boolean) | null>(null);
  const [, refreshReviewContext] = useState(0);
  const reviewBusy = useRef(false), reviewInteraction = useRef(0);
  const reviewRestore = useRef<{ destination: ProgramDestination; run: () => Promise<void> } | null>(null);
  const [creatorSeen, setCreatorSeen] = useState(false), [creatorSelection, setCreatorSelection] = useState<string | undefined>();
  const [creatorEntryChoices, setCreatorEntryChoices] = useState(false);
  const creatorEntryReturn = useRef<ProgramDestination | null>(null);
  const [catalogDetailOpen, setCatalogDetailOpen] = useState(false);
  const [creatorRecoveries, setCreatorRecoveries] = useState<AlphaCreatorRecoveryRecord | null>(null);
  const [socialRecoveries, setSocialRecoveries] = useState<AlphaSocialRecoveryRecord | null>(null);
  const [seen, setSeen] = useState({ discovery: false, community: false });
  const [discoveryState, setDiscoveryState] = useState(createProgramDiscoveryNavigationState);
  const discoveryStateRef = useRef(discoveryState); discoveryStateRef.current = discoveryState;
  const [communityState, setCommunityState] = useState(emptyProgramCommunityPresentation);
  const [communityView, setCommunityView] = useState<'community' | 'activity'>('community');
  const [discoverySelection, setDiscoverySelection] = useState<string | undefined>(), [communitySelection, setCommunitySelection] = useState<string | undefined>();
  const [publisher, setPublisher] = useState<string | null>(null), [inspector, setInspector] = useState<string | null>(null);
  const [preservation, setPreservation] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const preservationRef = useRef(false);
  const preservationOpener = useRef<HTMLElement | null>(null);
  // UX B3 (11/7): the "…" menu is left only for an account that cannot open (no tabs then); 복구함 is a sheet that
  // opens anywhere (recoveryDialog), and focus goes back to what opened it.
  const managementMenu = useRef<HTMLDetailsElement | null>(null), recoveryDialog = useRef<HTMLDialogElement | null>(null);
  const recoveryOpener = useRef<HTMLElement | null>(null), [recoveryOpen, setRecoveryOpen] = useState(false);
  // The document the space shows ('' for none), for the line of its own 복구함 entries.
  const [shownDocumentId, setShownDocumentId] = useState('');
  // R8b: the bottom tabs 쓰기·오늘·분류 drive the space through its main-tab port; Flow and 나 move by navigate().
  const mainTabs = useRef<{ choose(tab: ProgramMainTab): Promise<boolean>; openArchive(): Promise<boolean> } | null>(null);
  const [mainTab, setMainTab] = useState<ProgramMainTab>('documents');
  // Core3 P1 (X5, 11/8): a new 복구함 entry is said once by a bottom toast (10 s, or 닫기); the 나 badge keeps counting.
  const [recoveryToast, setRecoveryToast] = useState<{ count: number; at: number } | null>(null);
  const recoverySeen = useRef<{ owner: string; tags: Set<string> } | null>(null), recoveryToastHeld = useRef(false), meTab = useRef<HTMLButtonElement>(null);
  // The last mutation failed; captured input counts as saved input until one succeeds.
  const [saveFailed, setSaveFailed] = useState(false);
  // A document editor refused input locally (no mutation ran) or failed to save it; counts until it clears.
  const [editorInputFailed, setEditorInputFailed] = useState(false);
  const preservationReturn = useRef<{ ownerId: string; controller: Controller | null; opener: HTMLElement | null } | null>(null);
  const modalRef = useRef(false); modalRef.current = !!publisher || !!inspector;
  const inspectorDialog = useRef<HTMLDialogElement | null>(null);
  const socialRecovery = useRef<ReturnType<typeof createAlphaSocialRecovery> | null>(null), parkedSocial = useRef<AlphaSocialRecoveryEntry[]>([]), activeSocial = useRef<AlphaSocialRecoveryEntry[]>([]);
  // P3c (11/6): drafts a confirmed publish or post took (alphaSocialSettledEntry); their copies are not kept again.
  const settledSocial = useRef(new Set<string>());
  const erasing = useRef(false), erasedOut = useRef(false), [leaveBusy, setLeaveBusy] = useState(false), [leaveFailed, setLeaveFailed] = useState(false);
  const leaveKeep = useRef<HTMLButtonElement | null>(null);
  const socialSettled = (entry: AlphaSocialRecoveryEntry) => { try { return settledSocial.current.has(canonicalJson(entry)); } catch { return false; } };
  const publisherEditors = useRef<ProgramEditorFlush | null>(null), communityEditors = useRef<ProgramEditorFlush | null>(null), inspectorEditors = useRef<ProgramEditorFlush | null>(null);
  const mediaPort = useMemo(() => createAlphaCommunityMediaPort({ accessToken: () => session.accessToken, fetch: request }), [session.userId, session.accessToken, request]);
  const [output, setOutput] = useState<string | null>(null), [message, setMessage] = useState('');
  // Save wait (11/7): what a move waiting on its save shows (navigate()). moveSeq marks the latest move; moveStay ends its wait.
  const [moveWait, setMoveWait] = useState<{ seq: number; phase: 'saving' | 'late' | 'late-saved' | 'not-saved' } | null>(null);
  const moveSeq = useRef(0), moveStay = useRef<(() => void) | null>(null), moveOpener = useRef<HTMLElement | null>(null);
  // Save wait P3: the move waiting now, with the place it goes once saved (the last one pressed meanwhile).
  const moveFlight = useRef<ProgramMoveFlight | null>(null);
  /** 머무르기 or 닫기: the notice goes and focus goes back to what started the move (a tab, usually). */
  function closeMoveNotice(stay: boolean) {
    if (stay) moveStay.current?.(); else setMoveWait(null);
    const opener = moveOpener.current;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  }
  const [flowReturn, setFlowReturn] = useState<{ actorId: string; documentId?: string; kind: 'copy' | 'browse'; returnFocus?: HTMLElement; writing?: ProgramWritingReturn } | null>(null);
  const [importUndo, setImportUndo] = useState<{ batch: ProgramImportLinks; text: string; done?: boolean } | null>(null);
  const [importUndoBusy, setImportUndoBusy] = useState(false), importUndoLock = useRef(false);
  // UX B1 (11/6): a new document's arrival notice stays on that document only, with [되돌리기] while the import is
  // still the last server change (`revision`); null when this account's undo is held (the notice says the trash way).
  const [importArrival, setImportArrival] = useState<{ actorId: string; documentId: string; text: string; revision: number | null;
    /** Flow pipeline S2: [달력에서 보기] opens the month of the first dated item (none without a dated one). */
    calendar: { first: string; title: string; count: number } | null } | null>(null);
  const [importArrivalBusy, setImportArrivalBusy] = useState(false);
  useEffect(() => {
    setImportUndo(previous => previous && (previous.batch.actorId !== session.userId || destination.view !== 'space' || destination.id !== previous.batch.documentId) ? null : previous);
    setImportArrival(previous => previous && (previous.actorId !== session.userId || destination.view !== 'space' || destination.id !== previous.documentId) ? null : previous);
  }, [destination, session.userId]);
  useEffect(() => { setFlowReturn(null); setImportUndo(null); setImportArrival(null); importUndoLock.current = false; setImportUndoBusy(false); }, [sessionEpoch]);
  // 실행 고리 1안: the save of mine that finishes someone's Flow asks once whether to leave ‘해 봤어요’. Nothing records
  // the answer; a Flow asked about in this tab is not asked again, and leaving the space lets the question go.
  // QA F1: one question at a time; others wait their turn, and only one put on screen counts as asked.
  const [tried, setTried] = useState<{ epoch: object; queue: ProgramTriedQueue } | null>(null);
  const finishWatch = useRef<ProgramData | null>(null);
  // QA F2: a save whose reply was lost, with what was shown when it started, until that request is confirmed.
  const pendingFinish = useRef<{ epoch: object; requestId: string; before: ProgramData } | null>(null);
  useEffect(() => { setTried(null); finishWatch.current = null; pendingFinish.current = null; }, [sessionEpoch]);
  useEffect(() => {
    const visible = destination.view === 'space';
    setTried(current => current && { ...current, queue: visible ? programTriedShow(current.queue) : programTriedDone(current.queue, false) });
  }, [destination]);
  const [reviewAnnouncement, setReviewAnnouncement] = useState<{ isCurrent: () => boolean } | null>(null);
  const reviewAnnouncementGeneration = useRef(0);
  const [recoveries, setRecoveries] = useState<AlphaUiRecoveryRecord | null>(null), [storageError, setStorageError] = useState(false);
  const [structuralRecoveries, setStructuralRecoveries] = useState<AlphaStructuralRecoveryRecord | null>(null);
  const structuralRecovery = useRef<ReturnType<typeof createAlphaStructuralRecovery> | null>(null);
  const parkedStructural = useRef<AlphaStructuralRecoveryEntry[]>([]), activeStructural = useRef<AlphaStructuralRecoveryEntry[]>([]);
  const [external, setExternal] = useState(false), [presentation, setPresentation] = useState(0), [leave, setLeave] = useState(false);
  // The publication notice shows once per tab and account; storage that cannot be used keeps it showing.
  const [devNoticeSeen, setDevNoticeSeen] = useState(false);
  // FC head review P1: which screen made each end of the server history (lib/flow/integrated-poc/program-history-origin.ts).
  const historyOrigin = useRef(programEmptyHistoryOrigin());
  const [historyHint, setHistoryHint] = useState<'undo' | 'redo' | null>(null);
  // W11: device storage, so the acknowledgement holds for every tab of this device and account.
  const devNoticeStorage = () => { try { return syntheticRuntime?.documentStorage ?? localStorage; } catch { return undefined; } };
  const devNoticeTabStorage = () => { try { return syntheticRuntime?.tabStorage ?? sessionStorage; } catch { return undefined; } };
  useEffect(() => { setDevNoticeSeen(readDevNoticeSeen(devNoticeStorage(), session.userId, DEV_NOTICE_VERSION, devNoticeTabStorage())); }, [session.userId]);
  const openLatestLock = useRef<(() => void) | null>(null);
  // Release the old owner only after the replacement presentation commits, or on unmount.
  useEffect(() => {
    const release = openLatestLock.current; openLatestLock.current = null; release?.();
    return () => { const cleanup = openLatestLock.current; openLatestLock.current = null; cleanup?.(); };
  }, [presentation, sessionEpoch]);
  const controller = useRef<Controller | null>(null), uiRecovery = useRef<UiRecovery | null>(null);
  const uiKeep = useRef<{ port: ReturnType<typeof keepAlphaUiRecovery>; keep: AlphaUiRecoveryKeep } | null>(null), keepTaken = useRef(false);
  const writingCompute = useRef<WritingCompute|null>(null);
  const automaticRead = useRef<{ store: Controller; ownerId: string; epoch: object; promise: Promise<boolean>; eligible: boolean } | null>(null);
  const editors = useRef<(ProgramEditorFlush & AlphaStructuralEditorPort) | null>(null), legacyEditors = useRef<ProgramEditorFlush | null>(null);
  const creatorEditors = useRef<ProgramEditorFlush | null>(null), creatorRecovery = useRef<ReturnType<typeof createAlphaCreatorRecovery> | null>(null);
  const parkedCreator = useRef<AlphaCreatorRecoveryEntry[]>([]), activeCreator = useRef<AlphaCreatorRecoveryEntry | null>(null);
  const currentData = useRef<ProgramData | null>(null), currentRevision = useRef<number | null>(null);
  const currentPublicRevision = useRef<number | null>(null);
  const previousSnapshot = useRef<AlphaSyncSnapshot | null>(null);
  // Presentation proof only: newer input gains no retry or baseline authority.
  const confirmedParticipation = useRef<{ ownerId: string; command: Extract<AlphaCommand, { kind: 'social' }>; revision: number; publicRevision: number | undefined; privateBytes: string } | null>(null);
  const currentOwnerRef = useRef(session.userId); currentOwnerRef.current = session.userId;
  const ownMutation = useRef(0), disposed = useRef(false), externalRef = useRef(false);
  const sourceReturnOperation = useRef<{ store: Controller; owner: string; epoch: object;
    promise: ReturnType<ProgramMutate>; settled: boolean } | null>(null);
  // Taps now waiting for the automatic read; the shared notice clears only when
  // the last of them stops waiting, so one cannot erase another's notice. Counted
  // per session: an old session's tap can no longer run, so it neither holds nor
  // clears the new session's notice.
  const queuedTaps = useRef<QueuedTaps>({ epoch: sessionEpoch, count: 0 });
  const [collectionsMode, setCollectionsMode] = useState(false);
  const [collectionsState, setCollectionsState] = useState<DocumentCollections | null>(null);
  const [collectionsMessage, setCollectionsMessage] = useState('');
  const [collectionsSwitching, setCollectionsSwitching] = useState(false);
  const [collectionsSaving, setCollectionsSaving] = useState(false);
  const collectionsSwitchingRef = useRef(false);
  const collectionsPort = useRef<ReturnType<typeof createAlphaDocumentCollections> | null>(null);
  const storageErrorRef = useRef(storageError); storageErrorRef.current = storageError;
  // Park only explicit context handoffs/reloads, not every intermediate keystroke.
  const parkedDrafts = useRef<AlphaUiDraft[]>([]), activeDrafts = useRef<AlphaUiDraft[]>([]);
  const allEditors = () => [editors.current, legacyEditors.current, creatorEditors.current, publisherEditors.current, communityEditors.current, inspectorEditors.current];
  const hasInput = () => allEditors().some(port => port?.hasPendingInput?.()) || programDiscoveryHasUnstoredInput(discoveryStateRef.current);
  function captureCreator() {
    const port = creatorEditors.current, working = port?.captureCreatorWorking?.();
    if (!working || !creatorRecovery.current || !port?.hasPendingInput?.()) return true;
    // First capture is raw text; the optional structure capture is already inside working.
    const auxiliaries = (port.captureDrafts?.() ?? []).slice(1).filter(d => !d.title.endsWith(' · 작성 틀 입력'));
    activeCreator.current = { working: detached(working), auxiliaries, baseRevision: currentRevision.current ?? 0 };
    const entries = [...parkedCreator.current.filter(e => canonicalJson(e) !== canonicalJson(activeCreator.current)), activeCreator.current];
    const saved = creatorRecovery.current.save(entries);
    if (!saved.ok) { setStorageError(true); return false; }
    setCreatorRecoveries(saved.value); return true;
  }
  function captureStructuralInput() {
    const port = structuralRecovery.current;
    if (!port) return true;
    try {
      const drafts = editors.current?.captureStructuralDrafts?.() ?? [];
      const active = drafts.map(draft => ({ ...detached(draft), baseRevision: currentRevision.current ?? 0 }));
      const entries = mergeStructuralRecoveryEntries(parkedStructural.current, active);
      if (!entries.length) { activeStructural.current = active; return true; }
      const saved = port.save(entries);
      if (!saved.ok) { setStorageError(true); return false; }
      activeStructural.current = active;
      setStructuralRecoveries(saved.value); return true;
    } catch { setStorageError(true); return false; }
  }
  function clearConfirmedStructuralInput(text: TextWorkspaceState) {
    try {
      const port = structuralRecovery.current, saved = port?.read();
      if (!port || !saved?.ok || !saved.value || saved.value.ownerId !== session.userId
        || (editors.current?.captureStructuralDrafts?.() ?? []).some(draft => canonicalJson(draft.next) !== canonicalJson(text))) return;
      const confirmed = new Set(saved.value.entries.filter(entry => canonicalJson(entry.next) === canonicalJson(text)).map(entry => canonicalJson(entry)));
      if (!confirmed.size) return;
      const remaining = saved.value.entries.filter(entry => !confirmed.has(canonicalJson(entry)));
      // A synchronous capture may have advanced this same port since read().
      // Recheck its whole expected record before the port's storage CAS/write.
      const current = port.read();
      if (!current.ok || canonicalJson(current.value) !== canonicalJson(saved.value)) return;
      const persisted = remaining.length ? port.save(remaining) : port.clear(saved.value);
      if (!persisted.ok) return;
      const retain = (entries: readonly AlphaStructuralRecoveryEntry[]) => entries.filter(entry => !confirmed.has(canonicalJson(entry)));
      parkedStructural.current = retain(parkedStructural.current);
      activeStructural.current = retain(activeStructural.current);
      setStructuralRecoveries(record => {
        if (!record || record.ownerId !== saved.value!.ownerId || record.slotId !== saved.value!.slotId) return record;
        const entries = retain(record.entries);
        return entries.length ? { ...record, entries } : null;
      });
    } catch { setStorageError(true); }
  }
  function canReleaseInput() {
    const ready = programInputCanRelease([editors.current, legacyEditors.current]);
    if (!ready) setMessage('작성 중인 입력을 먼저 저장해 주세요. RAW 보관만으로 현재 편집 상태의 인계를 확인할 수 없습니다.');
    return ready;
  }
  function captureInput() {
    // P3c: once '지우고 로그아웃' starts, nothing is kept again (and nothing else runs) until it is done or refused.
    if (erasing.current) return false;
    const structuralSaved = captureStructuralInput();
    if (!captureCreator()) return false;
    const social = [publisherEditors.current, communityEditors.current, inspectorEditors.current].flatMap(port => port?.captureSocialDrafts?.() ?? [])
      .filter(entry => !socialSettled(entry));
    activeSocial.current = social;
    if (social.length && socialRecovery.current) {
      const entries = [...parkedSocial.current, ...social].filter((entry, index, list) => list.findIndex(other => canonicalJson(other) === canonicalJson(entry)) === index);
      const saved = socialRecovery.current.save(entries);
      if (!saved.ok) { setStorageError(true); return false; }
      setSocialRecoveries(saved.value);
    }
    const drafts = [editors.current, legacyEditors.current].flatMap(port => [...(port?.captureDrafts?.() ?? []), ...(port?.captureRecoveryDrafts?.() ?? [])]);
    const discovery = discoveryStateRef.current;
    if (programDiscoveryHasUnstoredInput(discovery)) drafts.push({ title: discovery.pastedTitle || '탐색 중 보관 원문', raw: discovery.pastedText || JSON.stringify(discovery.transient ?? { url: discovery.url }, null, 2) });
    activeDrafts.current = drafts.map(draft => ({ ...draft }));
    if (!drafts.length || !uiRecovery.current) return structuralSaved;
    const saved = uiRecovery.current.save(mergeRecoveryDrafts(parkedDrafts.current, activeDrafts.current));
    if (!saved.ok) { setStorageError(true); return false; }
    setRecoveries(saved.value); return structuralSaved;
  }
  /** Input captured from editors that are about to go away is left behind: it stays in the tab's
   * recovery and is announced until a save matches it or the user clears it. */
  /** N7 review: input an editor refused and put back (a folder name another document uses) is left behind at once, as
   * an editor's that went away: stored and announced, until the user clears it (no document save matches it).
   * False when it could not be stored (storage says so); the editor then leaves the input as typed. */
  function keepRefusedInput(draft: AlphaUiDraft) {
    if (!uiRecovery.current) return false;
    const parked = mergeRecoveryDrafts(parkedDrafts.current, [draft]);
    const saved = uiRecovery.current.save(mergeRecoveryDrafts(parked, activeDrafts.current));
    if (!saved.ok) { setStorageError(true); return false; }
    parkedDrafts.current = parked; setRecoveries(saved.value); return true;
  }
  function parkEditorInput() {
    parkedDrafts.current = mergeRecoveryDrafts(parkedDrafts.current, activeDrafts.current);
    parkedStructural.current = mergeStructuralRecoveryEntries(parkedStructural.current, activeStructural.current);
    if (activeCreator.current && !parkedCreator.current.some(e => canonicalJson(e) === canonicalJson(activeCreator.current))) parkedCreator.current.push(activeCreator.current);
    activeCreator.current = null;
    parkedSocial.current = [...parkedSocial.current, ...activeSocial.current].filter((entry, index, list) => list.findIndex(other => canonicalJson(other) === canonicalJson(entry)) === index);
    activeSocial.current = [];
  }
  /** Editors keyed by `presentation` restart from server text. Their input, including input an editor
   * refused, must not live only as long as that editor: capture and park it before the swap. When the
   * last capture fails or cannot hold the input whole, the editors stay and this returns false. */
  function replaceEditors() {
    if (!captureInput() || !canReleaseInput()) return false;
    parkEditorInput(); setPresentation(value => value + 1); return true;
  }
  /** The server step is done; only the local hand-off failed, and the storage notice says why. */
  const keptEditorsNotice = (done: string) => `${done} 지금 입력을 이 탭에 안전하게 보관하지 못해 화면은 그대로 두었습니다. 입력한 원문을 먼저 받아 두세요.`;
  function connectConfirmedReview(prior: AlphaSyncSnapshot | null, next: AlphaSyncSnapshot) {
    const pending = prior?.pending, receipt = next.lastReceipt, context = reviewContext.current;
    const submitted = pending?.kind === 'social' && pending.intent.type === 'participation-submit' ? pending.intent.draft : null;
    // The controller already owns lookup/commit. This only reconnects its exact public-submit receipt.
    if (disposed.current || externalRef.current || ownMutation.current !== 0 || next.busy
      || currentOwnerRef.current !== session.userId || prior?.ownerId !== session.userId || next.ownerId !== session.userId
      || next.account?.ownerId !== session.userId || next.envelope?.data.activeActorId !== session.userId
      || !context || context.epoch !== sessionEpochRef.current || context.origin.actorId !== session.userId
      || !submitted || submitted.editTargetId || !pending
      || submitted.id !== context.draftId || !['saved', 'same-location'].includes(next.status) || next.pending || next.draft
      || receipt?.kind !== 'social' || receipt.requestId !== pending.requestId || !receipt.resultId
      || receipt.revision !== pending.expectedRevision + (receipt.changed ? 1 : 0) || next.account.revision < receipt.revision
      || receipt.publicRevision !== undefined && (next.publicRevision ?? -1) < receipt.publicRevision
      || next.account.space.participationDrafts.some(draft => draft.id === submitted.id)
      || !next.envelope.data.public.posts.some(post => post.id === receipt.resultId && post.authorId === session.userId && !post.deleted)) return false;
    if (!reviewResultReceiver.current?.(submitted, receipt.resultId)) return false;
    context.postId = receipt.resultId; refreshReviewContext(value => value + 1);
    return true;
  }
  function present(next: AlphaSyncSnapshot) {
    const started=performance.now();try{
    if (disposed.current || currentOwnerRef.current !== session.userId) return;
    if (next.account && next.account.ownerId !== session.userId) return;
    if (!next.busy) setMessage(value => value === PROGRAM_BUSY_NOTICE ? '' : value);
    const prior = previousSnapshot.current;
    if (reviewAnnouncementState(prior) !== reviewAnnouncementState(next)) reviewAnnouncementGeneration.current++;
    previousSnapshot.current = next;
    setSnapshot(next);
    if (!next.account || !next.envelope) {
      if (next.status === 'session-expired' || next.status === 'signed-out') {
        captureInput(); currentData.current = null; setData(null); setOutput(null);
      }
      return;
    }
    // A read while our request is unresolved may already include that write.
    // Keep the displayed preimage until its receipt proves ownership; do not
    // turn a poll into either an acknowledgment or a permanent false conflict.
    if (next.pending && currentData.current) return;
    connectConfirmedReview(prior, next);
    // A response lookup may confirm exactly the input still mounted in the
    // creator. Advance only its matching baseline before classifying it as
    // another device's change. The port rejects newer/auxiliary/composing input.
    let exactOwnDraft = false, acceptedSocialDraft = false;
    const pendingSave = prior?.pending;
    const privateTextPort = editors.current;
    const pendingPrivateDocument = () => {
      try {
        const displayed=currentData.current,confirmed=next.envelope?.data;
        if(!privateTextPort||privateTextPort!==editors.current||!displayed||!confirmed
          ||!privateTextPort.hasPendingInput||privateTextPort.hasPendingInput()!==true
          ||!privateTextPort.pendingDocumentIds||!privateTextPort.captureDrafts||!privateTextPort.blocksExternalSnapshot
          ||privateTextPort.blocksExternalSnapshot(displayed,confirmed)!==false
          ||programDiscoveryHasUnstoredInput(discoveryStateRef.current)
          ||allEditors().some(port=>port&&port!==privateTextPort&&(!port.hasPendingInput||port.hasPendingInput()!==false)))return null;
        const pending=privateTextPort.pendingDocumentIds(),drafts=privateTextPort.captureDrafts();
        return pending.length===1&&drafts.length===1&&drafts[0].documentId===pending[0]&&typeof drafts[0].raw==='string'?pending[0]:null;
      }catch{return null;}
    };
    const ownAck=next.ownWritingAck;
    const claimedOwnAck=ownAck&&!externalRef.current&&prior?.ownerId===session.userId&&next.status==='saved'
      &&!next.busy&&!next.pending&&!next.draft&&currentData.current
      &&pendingPrivateDocument()===ownAck.identity.docId
      &&claimOwnedWritingAck(ownAck,session.userId,currentData.current,next.envelope.data,pendingSave,next.lastReceipt)?ownAck:undefined;
    const privateSave=claimedOwnAck?{before:claimedOwnAck.input.expected,next:claimedOwnAck.input.next}
      :!externalRef.current&&prior?.ownerId===session.userId
        ?confirmedAlphaPrivateTextSave(session.userId,currentData.current,currentRevision.current,currentPublicRevision.current,pendingSave,next):null;
    const isolatedPrivateInput=()=>{
      const id=pendingPrivateDocument();if(!privateSave||!id)return false;
      if(claimedOwnAck)return id===claimedOwnAck.identity.docId;
      const before=privateSave.before,after=privateSave.next;
      return !!M.getDocument(before,id)&&!!M.getDocument(after,id)
        &&before.documents.some(doc=>doc.id===id)===after.documents.some(doc=>doc.id===id)
        &&privateTextChangeIsolatedToDocument(before,after,id);
    };
    // OR receipt acceptance alone cannot exempt another pending editor.
    const isolatedBefore = isolatedPrivateInput();
    const acceptedPrivateSave = !!privateSave && !!privateTextPort?.acceptConfirmedPrivateText?.(privateSave.before, privateSave.next, claimedOwnAck);
    const acceptedPrivateInput = isolatedBefore && acceptedPrivateSave && isolatedPrivateInput();
    if (acceptedPrivateSave && privateSave && !hasInput()) {
      const confirmedText = privateSave.next;
      clearConfirmedStructuralInput(confirmedText);
      const saved = uiRecovery.current?.read();
      if (saved?.ok && saved.value && saved.value.drafts.every(draft => draft.documentId
        && !!M.getDocument(confirmedText, draft.documentId)
        && M.raw(M.getDocument(confirmedText, draft.documentId)) === draft.raw)) {
        if (uiRecovery.current?.clear(saved.value).ok) { parkedDrafts.current = []; activeDrafts.current = []; setRecoveries(null); }
      }
    }
    // An open modal normally freezes external revisions. Exempt only our exact
    // lost private-draft save: one owned revision, unchanged public state, and
    // the complete private result recomputed from the still-displayed baseline.
    if (currentData.current && pendingSave?.kind === 'social'
      && ['publication-save', 'participation-save', 'review-save'].includes(pendingSave.intent.type)
      && pendingSave.expectedRevision === currentRevision.current
      && next.account.revision === pendingSave.expectedRevision + 1
      && pendingSave.expectedPublicRevision === currentPublicRevision.current
      && next.publicRevision === currentPublicRevision.current
      && canonicalJson(currentData.current.public) === canonicalJson(next.envelope.data.public)) {
      const expected = executeAlphaSocialIntent(currentData.current, session.userId, pendingSave.intent, pendingSave.requestId);
      exactOwnDraft = expected.ok && expected.changed
        && canonicalJson(expected.data.spaces[session.userId]) === canonicalJson(next.account.space);
      if (!externalRef.current && prior?.ownerId === session.userId && exactOwnDraft && pendingSave.intent.type === 'participation-save'
        && !next.pending && next.lastReceipt?.requestId === pendingSave.requestId
        && next.lastReceipt.kind === 'social' && next.lastReceipt.changed && next.lastReceipt.revision === next.account.revision) {
        confirmedParticipation.current = { ownerId: session.userId, command: detached(pendingSave), revision: next.account.revision,
          publicRevision: next.publicRevision, privateBytes: canonicalJson(next.account.space) };
      }
    }
    if (!next.pending && !next.draft && ['ready', 'saved', 'same-location'].includes(next.status)) {
      creatorEditors.current?.acceptConfirmedCreatorWorking?.(next.account.space.creatorWorkspace?.working ?? null);
      allEditors().forEach(port => { if (port?.acceptConfirmedSocialDrafts?.(next.envelope!.data)) acceptedSocialDraft = true; });
    }
    // Another device's save that leaves every typed document untouched becomes the new baseline.
    // The typed input and its selection stay, and its save merges per document against it.
    // Input outside the private text editor, or a change to a typed document, stays protected.
    const remoteSparesInput = () => {
      try {
        const port = editors.current, displayed = currentData.current, confirmed = next.envelope?.data;
        if (!port || !displayed || !confirmed || next.draft || !['ready', 'saved', 'same-location', 'cancelled'].includes(next.status)
          || port.hasPendingInput?.() !== true || !port.pendingDocumentIds || !port.blocksExternalSnapshot
          || port.blocksExternalSnapshot(displayed, confirmed) !== false || programDiscoveryHasUnstoredInput(discoveryStateRef.current)
          || allEditors().some(other => other && other !== port && (!other.hasPendingInput || other.hasPendingInput() !== false))) return false;
        return remoteTextSparesDocuments(displayed, confirmed, session.userId, port.pendingDocumentIds());
      } catch { return false; }
    };
    if (currentData.current && (currentRevision.current !== next.account.revision || currentPublicRevision.current !== (next.publicRevision ?? null))
      && ownMutation.current === 0 && ((hasInput() && !acceptedPrivateInput && !remoteSparesInput()) || (modalRef.current && !(exactOwnDraft && acceptedSocialDraft)))) {
      captureInput(); externalRef.current = true; setExternal(true); return;
    }
    if (externalRef.current) return;
    currentData.current = next.envelope.data; currentRevision.current = next.account.revision;
    currentPublicRevision.current = next.publicRevision ?? null;
    setData(next.envelope.data);
    }finally{noteWritingPhase('ack-host-reconcile',started,next.ownWritingAck?.identity);}
  }
  useEffect(() => {
    disposed.current = false;
    confirmedParticipation.current = null;
    preservationRef.current = false; setPreservation(false);
    preservationOpener.current = null; preservationReturn.current = null;
    try {
      const compute=createWritingCompute();writingCompute.current=compute;
      const tabStorage = syntheticRuntime?.tabStorage ?? sessionStorage;
      let slot = tabStorage.getItem(SLOT_KEY);
      if (!slot) { slot = crypto.randomUUID(); tabStorage.setItem(SLOT_KEY, slot); }
      // sessionStorage is isolated even when a browser duplicates a tab's slot ID.
      const recovery = createAlphaTabRecovery(tabStorage, slot,compute);
      const ui = createAlphaUiRecovery(tabStorage, { ownerId: session.userId, slotId: slot });
      let keepStorage: Storage | undefined;
      try { keepStorage = syntheticRuntime?.documentStorage ?? localStorage; } catch { /* Session recovery remains available. */ }
      const keep = createAlphaUiRecoveryKeep(keepStorage, session.userId, crypto.randomUUID());
      const kept = keep ? keepAlphaUiRecovery(ui, keep) : null;
      uiRecovery.current = kept ?? ui; uiKeep.current = keep && kept ? { port: kept, keep } : null; keepTaken.current = false;
      const structural = createAlphaStructuralRecovery(tabStorage, { ownerId: session.userId, slotId: slot });
      structuralRecovery.current = structural; activeStructural.current = [];
      const structuralLoaded = structural.read();
      if (structuralLoaded.ok) { parkedStructural.current = structuralLoaded.value?.entries ?? []; setStructuralRecoveries(structuralLoaded.value); }
      else setStorageError(true);
      const creatorPort = createAlphaCreatorRecovery(tabStorage, session.userId, slot);
      creatorRecovery.current = creatorPort; activeCreator.current = null;
      const socialPort = createAlphaSocialRecovery(tabStorage, session.userId, slot); socialRecovery.current = socialPort;
      const socialLoaded = socialPort.read(); activeSocial.current = []; settledSocial.current = new Set();
      if (socialLoaded.ok) { parkedSocial.current = socialLoaded.value?.entries ?? []; setSocialRecoveries(socialLoaded.value); } else setStorageError(true);
      const creatorLoaded = creatorPort.read();
      if (creatorLoaded.ok) { parkedCreator.current = creatorLoaded.value?.entries ?? []; setCreatorRecoveries(creatorLoaded.value); }
      else setStorageError(true);
      parkedDrafts.current = []; activeDrafts.current = [];
      const loaded = (kept ?? ui).read();
      if (loaded.ok) { parkedDrafts.current = (loaded.value?.drafts ?? []).map(draft => ({ ...draft })); setRecoveries(loaded.value); }
      else setStorageError(true);
      const store = createAlphaSyncController({ recovery, onChange: present,writingCompute:compute });
      controller.current = store;
    } catch { setStorageError(true); }
    return () => { captureInput(); if (!erasing.current) uiKeep.current?.port.leave(); disposed.current = true; preservationRef.current = false; preservationOpener.current = null; preservationReturn.current = null; controller.current?.dispose(); controller.current = null;writingCompute.current?.dispose();writingCompute.current=null; };
  }, [session.userId]);
  useEffect(() => {
    const store = controller.current; if (!store) return;
    captureInput();
    store.bindSession(session.userId, legacyTransport?createAlphaLegacyWritingRepository(config,session,legacyTransport):createAlphaHttpRepository(config, session, request, { social: true, readProbe: readProbe === true && !syntheticRuntime }));
    if (store.snapshot().pending) void store.resolvePending(false); else startAutomaticRead(store);
  }, [config, session.userId, session.accessToken, request]);
  useEffect(() => {
    let storage: Storage | null = null;
    try { storage = syntheticRuntime?.documentStorage ?? window.localStorage; } catch { /* Keep server documents usable. */ }
    const locks = navigator.locks;
    const port = createAlphaDocumentCollections(session.userId, storage,
      locks ? (name, work) => locks.request(name, { mode: 'exclusive' }, work) : null,
      () => {
        const live = controller.current?.snapshot(), current = currentData.current;
        const owner = live?.account?.ownerId;
        return {
          ownerId: currentOwnerRef.current,
          documentIds: owner === session.userId && current?.activeActorId === session.userId
            ? [...current.spaces[session.userId].text.documents, ...current.spaces[session.userId].text.flows].map(doc => doc.id) : [],
          busy: !!live?.busy,
          pending: !!live?.pending,
          blocked: storageErrorRef.current || externalRef.current || preservationRef.current || !!live?.draft
            || !live || !['ready', 'saved', 'same-location', 'cancelled'].includes(live.status),
          sessionValid: !disposed.current && live?.ownerId === session.userId && owner === session.userId
            && !!live.envelope && current?.activeActorId === session.userId,
        };
      });
    collectionsPort.current = port;
    setCollectionsState(port.snapshot().value);
    setCollectionsMode(false); setCollectionsMessage('');
    collectionsSwitchingRef.current = false; setCollectionsSwitching(false);
    return () => { port.dispose(); if (collectionsPort.current === port) collectionsPort.current = null; };
  }, [session.userId]);
  async function switchCollectionsMode() {
    const store = controller.current, port = collectionsPort.current;
    const owner = session.userId, visit = destinationRef.current;
    if (collectionsSwitchingRef.current || !store || !port || disposed.current || currentOwnerRef.current !== owner) return;
    const canSwitch = () => {
      const live = store.snapshot();
      return live.ownerId === owner && live.account?.ownerId === owner && !!live.envelope
        && !live.busy && !live.pending && !live.draft && !externalRef.current && !storageErrorRef.current
        && !preservationRef.current && ['ready', 'saved', 'same-location', 'cancelled'].includes(live.status)
        && !port.snapshot().busy && (collectionsMode || port.snapshot().writable);
    };
    if (!canSwitch()) {
      setCollectionsMessage('모음 시험 화면을 열 수 없습니다. 서버 확인과 브라우저 저장 상태를 확인해 주세요. 기존 문서는 그대로입니다.'); return;
    }
    if (!captureInput()) return;
    const mounted = allEditors(), releases = mounted.map(editor => editor?.lockInput());
    collectionsSwitchingRef.current = true; setCollectionsSwitching(true);
    try {
      for (const editor of mounted) if (editor && !await editor.flushAll()) return;
      if (disposed.current || currentOwnerRef.current !== owner || controller.current !== store
        || collectionsPort.current !== port || destinationRef.current !== visit || hasInput() || !canSwitch()) return;
      setCollectionsState(port.snapshot().value);
      setCollectionsMode(value => !value); setCollectionsMessage('');
    } finally {
      releases.forEach(release => release?.());
      if (!disposed.current && currentOwnerRef.current === owner && collectionsPort.current === port) {
        collectionsSwitchingRef.current = false; setCollectionsSwitching(false);
      }
    }
  }
  async function changeCollections(next: DocumentCollections) {
    const port = collectionsPort.current, owner = session.userId;
    if (!port || disposed.current || currentOwnerRef.current !== owner || !collectionsMode) return false;
    setCollectionsSaving(true);
    let result;
    try {
      result = await port.change(current => {
        if (canonicalJson(current) !== canonicalJson(collectionsState)) throw Error('alpha-collections-stale-view');
        return next;
      });
    } finally {
      if (!disposed.current && currentOwnerRef.current === owner && collectionsPort.current === port) setCollectionsSaving(false);
    }
    if (disposed.current || currentOwnerRef.current !== owner || collectionsPort.current !== port) return false;
    if (!result.ok) {
      setCollectionsMessage('모음 연결을 저장하지 못했습니다. 문서는 변경하지 않았습니다. 작성 중인 내용을 저장한 뒤 화면을 새로 열어 주세요.'); return false;
    }
    setCollectionsState(port.snapshot().value);
    setCollectionsMessage(result.changed ? '모음 연결을 이 브라우저에 저장했습니다.' : '모음 연결은 그대로입니다.');
    return true;
  }
  function refreshAutomatically() {
    const store = controller.current;
    // Preservation reads have their own fresh snapshot. Avoid unrelated polling
    // while that dialog is open; never interrupt an already running request.
    if (disposed.current || preservationRef.current || document.visibilityState === 'hidden' || !store || store.snapshot().busy) return;
    startAutomaticRead(store);
  }
  // Every read the host starts on its own is registered, including the first one after a
  // session binds: a text save or an opted-in tap typed during it waits it out instead of
  // being refused as busy, which used to fail the first words written on a fresh page.
  function startAutomaticRead(store: Controller) {
    const before = store.snapshot();
    const read = { store, ownerId: currentOwnerRef.current, epoch: sessionEpochRef.current,
      eligible: !!before.account && !!before.envelope && before.ownerId === currentOwnerRef.current
        && before.account.ownerId === currentOwnerRef.current && !before.pending && !before.draft
        && ['ready', 'saved', 'same-location', 'cancelled'].includes(before.status),
      // Probe first: an unchanged server snapshot costs two tokens instead of the whole account (egress).
      promise: store.refreshIfChanged().catch(() => false) };
    automaticRead.current = read;
    void read.promise.then(() => { if (automaticRead.current === read) automaticRead.current = null; });
  }
  function closePreservation() {
    if (!preservationRef.current || disposed.current || currentOwnerRef.current !== session.userId) return;
    preservationReturn.current = { ownerId: session.userId, controller: controller.current, opener: preservationOpener.current };
    preservationRef.current = false; setPreservation(false);
    // Hidden/busy callers catch up through the next normal event or interval.
    refreshAutomatically();
  }
  useEffect(() => {
    if (preservation && (!snapshot?.account || !snapshot.references)) {
      // Expiry/failure can remove the panel without invoking its close action.
      // Release only the polling hold; do not restore hidden account data.
      preservationReturn.current = null;
      preservationRef.current = false; setPreservation(false);
    }
  }, [preservation, snapshot?.account, snapshot?.references]);
  useEffect(() => {
    // Defer return until the close/catch-up commit has re-enabled its opener.
    const returning = preservationReturn.current, store = controller.current;
    if (!returning) return;
    if (preservation || preservationRef.current || disposed.current || document.visibilityState === 'hidden'
      || currentOwnerRef.current !== returning.ownerId || snapshot?.ownerId !== returning.ownerId
      || !store || store !== returning.controller || !snapshot?.account || !snapshot.references
      || snapshot.pending || store.snapshot().pending || !returning.opener) {
      preservationReturn.current = null; return;
    }
    if (snapshot.busy || store.snapshot().busy) return;
    preservationReturn.current = null;
    // A user-selected target wins over this deferred return request.
    if (document.activeElement !== document.body && document.activeElement !== returning.opener) return;
    restoreProgramDialogFocus(returning.opener);
  }, [preservation, snapshot?.busy, snapshot?.pending, snapshot?.ownerId, snapshot?.account, snapshot?.references, session.userId]);
  useEffect(() => {
    const refresh = refreshAutomatically;
    // A screen left without input stops the interval read after ten minutes (egress).
    const reads = automaticReadSchedule(Date.now, refresh);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      captureInput();
      if (hasInput() || controller.current?.snapshot().pending) { event.preventDefault(); event.returnValue = ''; }
    };
    const visibility = () => { captureInput(); if (document.visibilityState === 'visible') reads.returned(); else refresh(); };
    const pageHide = () => { captureInput(); if (!erasing.current) uiKeep.current?.port.leave(); };
    const pageShow = (event: PageTransitionEvent) => { if (event.persisted) uiKeep.current?.port.back(); };
    const input = { capture: true, passive: true };
    window.addEventListener('focus', reads.returned); window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', visibility); window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('pagehide', pageHide); window.addEventListener('pageshow', pageShow);
    for (const type of AUTOMATIC_READ_INPUT_EVENTS) window.addEventListener(type, reads.input, input);
    const timer = window.setInterval(reads.interval, POLL_MS);
    return () => { clearInterval(timer); window.removeEventListener('focus', reads.returned); window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('pagehide', pageHide); window.removeEventListener('pageshow', pageShow);
      for (const type of AUTOMATIC_READ_INPUT_EVENTS) window.removeEventListener(type, reads.input, input); };
  }, []);
  const performMutation: ProgramMutate = async (label, build, options) => {
    const store = controller.current, owner = currentOwnerRef.current, epoch = sessionEpochRef.current;
    const startedInBrowse = PROGRAM_BROWSE_VIEWS.includes(destinationRef.current.view);
    if (!store || storageErrorRef.current) return { ok: false, reason: 'recovery-required' };
    if (externalRef.current) return { ok: false, reason: 'conflict' };
    if (!captureInput()) return { ok: false, reason: 'recovery-required' };
    // Only wait for our exact automatic read, before any mutation is built or
    // dispatched. A write/UNKNOWN lookup never grants this waiting authority.
    const read = automaticReadToAwait(automaticRead.current, { store, ownerId: owner, epoch, busy: store.snapshot().busy }, options);
    if (read) {
      // A waiting tap runs by itself; telling the user to press it again would
      // let that second press reopen the task this one is about to complete.
      const tap = !!options?.awaitAutomaticRead;
      const queued = tap ? queueTap(queuedTaps, epoch) : null;
      if (queued) setMessage(value => !value || value === PROGRAM_BUSY_NOTICE ? PROGRAM_QUEUED_NOTICE : value);
      const refreshed = await read.promise;
      if (queued && unqueueTap(queuedTaps, queued)) setMessage(value => value === PROGRAM_QUEUED_NOTICE ? '' : value);
      if (disposed.current || controller.current !== store || currentOwnerRef.current !== owner
        || sessionEpochRef.current !== epoch) return { ok: false, reason: 'session-expired' };
      if (externalRef.current) return { ok: false, reason: 'conflict' };
      if (storageErrorRef.current || preservationRef.current) return { ok: false, reason: 'recovery-required' };
      const live = store.snapshot();
      if (!refreshed || live.ownerId !== owner || live.account?.ownerId !== owner || !live.envelope
        || live.busy || live.pending || live.draft || !['ready', 'saved', 'same-location', 'cancelled'].includes(live.status)) {
        // Another waiting tap took the writer first. This one did not run, so say so.
        if (tap && live.busy && !live.pending && !live.draft) setMessage(value => !value ? PROGRAM_BUSY_NOTICE : value);
        return { ok: false, reason: live.status === 'session-expired' ? 'session-expired'
          : live.pending || live.draft ? 'unresolved' : live.busy ? 'busy' : 'recovery-required' };
      }
      // Newer keystrokes stay in the existing draft drain. Capture them too;
      // retain the original builder and its workspace/merge checks unchanged.
      if (!captureInput()) return { ok: false, reason: 'recovery-required' };
    }
    const intent = typeof options?.alphaSocial === 'object' ? options.alphaSocial : undefined;
    // The matching composer owns this attempt's message; account recovery controls remain here.
    const reviewOwnsMessage = intent?.type === 'participation-submit' && intent.draft.id === reviewContext.current?.draftId;
    if (reviewOwnsMessage && captureReviewVisit()()) setMessage('');
    const shownBefore = currentData.current, pendingBefore = store.snapshot().pending?.requestId;
    ownMutation.current++;
    try {
      const guardedOptions=options?.alphaWriting?{...options,alphaWriting:{...options.alphaWriting,canSubmit:()=>
        !disposed.current&&controller.current===store&&currentOwnerRef.current===owner&&sessionEpochRef.current===epoch
        &&!externalRef.current&&!storageErrorRef.current&&!preservationRef.current}}:options;
      const outcome = await store.mutate(label, build, guardedOptions);
      // A completed operation does not grant a stale host presentation authority.
      if (disposed.current || controller.current !== store || currentOwnerRef.current !== owner
        || sessionEpochRef.current !== epoch) return outcome;
      if (!outcome.ok) {
        if (outcome.reason !== 'busy') setSaveFailed(true);
        // QA F2: this request's reply was lost; its confirmation later may still be the last check.
        const unresolved = store.snapshot().pending;
        if (unresolved && unresolved.requestId !== pendingBefore && shownBefore?.spaces[owner]?.copies.length) pendingFinish.current = { epoch, requestId: unresolved.requestId, before: shownBefore };
        // A blocked click may resume after the original request settles.
        // Do not reintroduce its temporary wait notice after the final snapshot.
        if (outcome.reason !== 'busy' && !reviewOwnsMessage) {
          const failed = controller.current?.snapshot();
          setMessage(failed?.pending ? programErrorMessage('checking-result') : failed?.retryableNativeHandoff
            ? '저장되지 않았습니다. 비교와 선택은 유지했습니다. 같은 선택으로 다시 적용해 주세요.'
            : failed?.retryableRejectedSocialDraft ? '글 입력은 남아 있습니다. 내용을 수정하거나 ‘나중에 이어 쓰기’를 눌러 다시 보관해 주세요.'
            : failed?.retryableRejectedDraft ? '저장되지 않았습니다. 입력을 수정한 뒤 다시 저장해 주세요.' : programErrorMessage(outcome.reason));
        }
        else if (outcome.reason === 'busy' && !reviewOwnsMessage && controller.current?.snapshot().busy) setMessage(PROGRAM_BUSY_NOTICE);
      }
      else {
        setSaveFailed(false);
        if (outcome.changed !== false && shownBefore?.spaces[owner]?.copies.length) { finishWatch.current = shownBefore; askIfFlowFinished(); }
        if (outcome.changed !== false) historyOrigin.current = programHistoryAfterChange(historyOrigin.current, store.snapshot().account?.revision, startedInBrowse);
        if (!reviewOwnsMessage) setMessage('');
        // Drop only input that exactly matches confirmed server text. A newer keystroke stays protected.
        const saved = uiRecovery.current?.read(), confirmed = store.snapshot().account;
        if (confirmed) clearConfirmedStructuralInput(confirmed.space.text);
        const creatorSaved = creatorRecovery.current?.read();
        if (creatorSaved?.ok && creatorSaved.value && confirmed && creatorSaved.value.entries.every(entry => !entry.auxiliaries.length
          && canonicalJson(entry.working) === canonicalJson(confirmed.space.creatorWorkspace?.working ?? null))) {
          if (creatorRecovery.current?.clear(creatorSaved.value).ok) { parkedCreator.current = []; activeCreator.current = null; setCreatorRecoveries(null); }
        }
        if (saved?.ok && saved.value && confirmed && saved.value.drafts.every(draft => draft.documentId
          && !!M.getDocument(confirmed.space.text, draft.documentId)
          && M.raw(M.getDocument(confirmed.space.text, draft.documentId)) === draft.raw)) {
          const cleared = uiRecovery.current?.clear(saved.value);
          if (cleared?.ok) { parkedDrafts.current = []; activeDrafts.current = []; setRecoveries(null); }
        }
        const socialSaved = socialRecovery.current?.read();
        // P3c (11/6): a confirmed publish or post settles the copy kept of exactly the draft it took; the rest stays.
        const settled = !outcome.presentationPending && confirmed ? alphaSocialSettledEntry(intent, confirmed.space) : null;
        if (settled) settledSocial.current.add(settled);
        const unsettled = socialSaved?.ok && socialSaved.value ? socialSaved.value.entries.filter(entry => !socialSettled(entry)) : [];
        if (socialSaved?.ok && socialSaved.value && confirmed && unsettled.every(entry => {
          const value = entry.value as ProgramPublicationDraft & ProgramParticipationDraft & { proposalId: string; draft: ProgramProposalReviewDraft };
          const stored = entry.kind === 'publication' ? confirmed.space.publicationDrafts.find(row => row.id === value.id)
            : entry.kind === 'participation' ? confirmed.space.participationDrafts.find(row => row.id === value.id)
              : confirmed.space.proposalReviewDrafts?.[value.proposalId];
          return stored && canonicalJson(stored) === canonicalJson(entry.kind === 'review' ? value.draft : value);
        })) {
          if (socialRecovery.current?.clear(socialSaved.value).ok) { parkedSocial.current = []; activeSocial.current = []; setSocialRecoveries(null); }
        } else if (socialSaved?.ok && socialSaved.value && unsettled.length < socialSaved.value.entries.length) {
          const kept = socialRecovery.current?.save(unsettled);
          if (kept?.ok) {
            parkedSocial.current = parkedSocial.current.filter(entry => !socialSettled(entry));
            activeSocial.current = activeSocial.current.filter(entry => !socialSettled(entry)); setSocialRecoveries(kept.value);
          }
        }
      }
      return outcome;
    } finally { ownMutation.current--; }
  };
  const mutate: ProgramMutate = (label, build, options) => {
    const store = controller.current, owner = currentOwnerRef.current, epoch = sessionEpochRef.current;
    const wasBusy = !!store?.snapshot().busy;
    // A tap that will wait out our automatic read is a real operation too: a
    // source return pressed after it waits for it, not for the read alone.
    const waitsForRead = !!store && !!options?.awaitAutomaticRead
      && !!automaticReadToAwait(automaticRead.current, { store, ownerId: owner, epoch, busy: wasBusy }, options);
    const promise = performMutation(label, build, options);
    // A rejected concurrent click must never replace the real operation.
    const earlier = sourceReturnOperation.current;
    // A later waiting tap must not hide an earlier unsettled one, which takes the
    // writer first; a source return should wait for the save that really runs.
    const keepEarlier = waitsForRead && !!earlier && !earlier.settled && earlier.store === store && earlier.epoch === epoch;
    if (store && (!wasBusy || waitsForRead) && !keepEarlier && store.snapshot().busy) {
      const operation = { store, owner, epoch, promise, settled: false };
      sourceReturnOperation.current = operation;
      const settle = () => { operation.settled = true; };
      void promise.then(settle, settle);
    }
    return promise;
  };
  // What a source return would wait for right now; null when it can check at once.
  function sourceReturnWaiting() {
    const store = controller.current;
    return store ? sourceReturnWait(sourceReturnOperation.current, automaticRead.current,
      { store, ownerId: currentOwnerRef.current, epoch: sessionEpochRef.current, busy: store.snapshot().busy }) : null;
  }
  function showSourceReturnQueued(queued: boolean) {
    setMessage(value => queued ? (!value || value === PROGRAM_BUSY_NOTICE ? PROGRAM_SOURCE_QUEUED_NOTICE : value)
      : value === PROGRAM_SOURCE_QUEUED_NOTICE ? '' : value);
  }
  function awaitSourceReturnReady(): Promise<boolean> {
    const store = controller.current, owner = currentOwnerRef.current, epoch = sessionEpochRef.current;
    const visit = destinationRef.current, captured = sourceReturnOperation.current;
    // Wait for the unsettled operation the user started, else our own automatic
    // read. Waiting on neither while busy is what ended the return silently.
    const waiting = sourceReturnWaiting();
    return programSourceNavigationReady(waiting,
      () => !disposed.current && controller.current === store && currentOwnerRef.current === owner
        && sessionEpochRef.current === epoch && destinationRef.current === visit
        && sourceReturnOperation.current === captured,
      () => {
        const live = store?.snapshot();
        return !!live && ownMutation.current === 0 && live.ownerId === owner && live.account?.ownerId === owner
          && !live.busy && !live.pending && !live.draft && ['ready', 'saved', 'same-location', 'cancelled'].includes(live.status)
          && !externalRef.current && !storageErrorRef.current && !preservationRef.current && !modalRef.current && !hasInput();
      });
  }
  function reviewReady(epoch: object): boolean {
    const live = controller.current?.snapshot();
    return epoch === sessionEpochRef.current && !disposed.current && currentOwnerRef.current === session.userId
      && !externalRef.current && !storageErrorRef.current && !preservationRef.current && !modalRef.current
      && !!live && live.ownerId === session.userId && live.account?.ownerId === session.userId
      && live.envelope?.data.activeActorId === session.userId && currentData.current?.activeActorId === session.userId
      && !live.busy && !live.pending && !live.draft && ['ready','saved','same-location','cancelled'].includes(live.status);
  }
  function clearReviewContext() {
    reviewContext.current = null; reviewRestore.current = null; setReviewEntry(null); refreshReviewContext(value => value + 1);
  }
  // C6a: while the space shown is picking rows (고르기), the host's own writes wait (다시 확인, 되돌리기·다시 실행).
  const programSelecting = useRef(false);
  const selectingRefuses = () => { if (!programSelecting.current || destinationRef.current.view !== 'space') return false; setMessage('여러 개 고르는 중에는 할 수 없습니다. 고르기를 끝낸 뒤 다시 눌러 주세요.'); return true; };
  async function resolvePendingResult() {
    if (selectingRefuses()) return;
    const pending = controller.current?.snapshot().pending, context = reviewContext.current;
    const review = pending?.kind === 'social' && pending.intent.type === 'participation-submit'
      && pending.intent.draft.id === context?.draftId;
    const currentVisit = review ? captureReviewVisit() : null;
    if (!await controller.current?.resolvePending(true)) return;
    if (review && (!currentVisit?.() || reviewContext.current !== context || context?.postId)) return;
    setMessage('저장 결과를 확인했습니다.');
  }
  useEffect(() => { clearReviewContext(); }, [sessionEpoch]);
  useEffect(() => { historyOrigin.current = programEmptyHistoryOrigin(); }, [sessionEpoch]);
  useEffect(() => { setHistoryHint(null); }, [destination]);
  useEffect(() => {
    if (queuedTaps.current.epoch === sessionEpoch) return;
    queuedTaps.current = { epoch: sessionEpoch, count: 0 };
    setMessage(value => value === PROGRAM_QUEUED_NOTICE || value === PROGRAM_SOURCE_QUEUED_NOTICE ? '' : value);
  }, [sessionEpoch]);
  useEffect(() => {
    const interacted = () => { reviewInteraction.current++; };
    window.addEventListener('pointerdown', interacted, true); window.addEventListener('keydown', interacted, true);
    return () => { window.removeEventListener('pointerdown', interacted, true); window.removeEventListener('keydown', interacted, true); };
  }, []);
  useEffect(() => {
    const restoring = reviewRestore.current;
    if (!restoring || restoring.destination !== destination) return;
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (!cancelled) void restoring.run().finally(() => { if (reviewRestore.current === restoring) reviewRestore.current = null; });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [destination, sessionEpoch]);
  function captureReviewVisit() {
    const visit = destinationRef.current, epoch = sessionEpochRef.current;
    return () => !disposed.current && epoch === sessionEpochRef.current && visit.view === 'community'
      && destinationRef.current === visit && !externalRef.current && currentData.current?.activeActorId === session.userId;
  }
  async function startReview(documentId: string) {
    const epoch = sessionEpochRef.current, visit = destinationRef.current;
    const port = reviewSpace.current, editor = editors.current;
    if (reviewBusy.current || !reviewReady(epoch) || visit.view !== 'space' || !port) return;
    reviewBusy.current = true;
    const valid = () => reviewReady(epoch) && destinationRef.current === visit && reviewSpace.current === port && editors.current === editor;
    try {
      const sourceSaved = !editor || await editor.flushAll();
      if (!valid()) return;
      if (!sourceSaved) { setMessage('저장되지 않은 문서 입력을 먼저 확인해 주세요. 입력은 그대로 남아 있습니다.'); return; }
      const community = communityEditors.current;
      const communitySaved = !community || await community.flushAll();
      if (!valid() || community !== communityEditors.current) return;
      if (!communitySaved) { setMessage('작성 중인 글을 저장한 뒤 후기를 열어 주세요. 입력은 그대로 남아 있습니다.'); return; }
      const origin = port.capture(documentId);
      if (!origin || programReviewOriginReason(currentData.current!, origin)) { setMessage('현재 문서와 입력 상태를 확인한 뒤 후기를 다시 열어 주세요.'); return; }
      const existing = reviewContext.current;
      const stored = existing?.epoch === epoch && !existing.postId
        ? currentData.current!.spaces[session.userId]?.participationDrafts.find(draft => draft.id === existing.draftId) : undefined;
      if (stored && (existing!.origin.documentId !== documentId || programReviewOriginReason(currentData.current!, existing!.origin))) {
        setMessage('앞서 연결한 후기 초안이 남아 있습니다. 해당 초안을 먼저 이어 써 주세요.'); return;
      }
      const draft = stored ?? newProgramReviewDraft();
      const context = stored ? existing! : { origin, port, editor, draftId:draft.id, epoch };
      reviewContext.current = context;
      const next: ProgramDestination = { view:'community' };
      const isCurrent = () => reviewReady(epoch) && destinationRef.current === next && reviewContext.current === context
        && reviewSpace.current === port && editors.current === editor;
      setReviewEntry({ draft, isCurrent, onOpened: opened => {
        if (!opened && epoch === sessionEpochRef.current && reviewContext.current === context) setMessage('후기를 열지 못했습니다. 입력과 저장 결과를 확인해 주세요.');
      } });
      await navigate(next);
      if (destinationRef.current !== next && reviewContext.current === context) setReviewEntry(null);
    } finally { reviewBusy.current = false; }
  }
  /** Compares what was shown when my save started with the confirmed result; until that result is shown, waits for it. */
  function askIfFlowFinished() {
    const before = finishWatch.current, after = currentData.current;
    if (!before || !after || after === before) return;
    finishWatch.current = null;
    const finished = programFlowsJustFinished(before, after, session.userId, programLocalDate());
    if (!finished.length) return;
    const epoch = sessionEpochRef.current, visible = destinationRef.current.view === 'space';
    setTried(current => ({ epoch, queue: programTriedAdd(current?.epoch === epoch ? current.queue : PROGRAM_TRIED_EMPTY, finished, visible) }));
  }
  useEffect(() => {
    const waiting = pendingFinish.current, live = controller.current?.snapshot();
    if (waiting && (waiting.epoch !== sessionEpochRef.current || !live)) pendingFinish.current = null;
    else if (waiting && live) {
      const state = programPendingFinish(waiting.requestId, live);
      if (state !== 'wait') pendingFinish.current = null;
      if (state === 'ask') finishWatch.current = waiting.before;
    }
    askIfFlowFinished();
  }, [data, snapshot]);
  /** [남기기]: the review composer, its Flow and my copy's version chosen and the title written (programTriedDraft);
   *  saving the input first, as 후기 쓰기 does. Nothing is public until its preview's 공개하기. */
  async function startTriedReview() {
    const epoch = sessionEpochRef.current, visit = destinationRef.current, editor = editors.current;
    const asked = tried?.epoch === epoch ? tried.queue.shown : null;
    if (!asked || reviewBusy.current) return;
    if (!reviewReady(epoch)) { setMessage('저장이 끝난 뒤 다시 눌러 주세요. 입력은 그대로 있습니다.'); return; }
    reviewBusy.current = true;
    try {
      const sourceSaved = !editor || await editor.flushAll();
      if (!reviewReady(epoch) || destinationRef.current !== visit || editors.current !== editor) return;
      if (!sourceSaved) { setMessage('저장되지 않은 문서 입력을 먼저 확인해 주세요. 입력은 그대로 남아 있습니다.'); return; }
      const community = communityEditors.current;
      const communitySaved = !community || await community.flushAll();
      if (!reviewReady(epoch) || community !== communityEditors.current) return;
      if (!communitySaved) { setMessage('작성 중인 글을 저장한 뒤 후기를 열어 주세요. 입력은 그대로 남아 있습니다.'); return; }
      setTried(current => current && { ...current, queue: programTriedDone(current.queue, false) });
      const next: ProgramDestination = { view: 'community' };
      setReviewEntry({ draft: programTriedDraft(asked), tried: true, isCurrent: () => reviewReady(epoch) && destinationRef.current === next,
        onOpened: opened => { if (!opened && epoch === sessionEpochRef.current) setMessage('후기를 열지 못했습니다. 입력과 저장 결과를 확인해 주세요.'); } });
      await navigate(next);
    } finally { reviewBusy.current = false; }
  }
  async function returnFromReview() {
    const context = reviewContext.current, visit = destinationRef.current, interaction = reviewInteraction.current;
    const focusOwner = document.activeElement;
    if (!context?.postId || reviewBusy.current) return;
    const valid = () => reviewReady(context.epoch) && reviewContext.current === context && reviewSpace.current === context.port
      && editors.current === context.editor && reviewInteraction.current === interaction
      && !programReviewOriginReason(currentData.current!, context.origin);
    if (!valid()) { setMessage('원래 문서나 입력 상태가 달라 정확히 돌아갈 수 없습니다. 현재 글과 문서는 유지됩니다.'); return; }
    reviewBusy.current = true;
    try {
      const community = communityEditors.current;
      const saved = !community || await community.flushAll();
      if (destinationRef.current !== visit || !valid() || community !== communityEditors.current) return;
      if (!saved) { setMessage('작성 중인 글을 먼저 저장해 주세요. 입력은 그대로 남아 있습니다.'); return; }
      const next: ProgramDestination = { view:'space', id:context.origin.documentId };
      const restoring = { destination:next, run: async () => {
        const restored = await context.port.restore(context.origin, () => valid() && destinationRef.current === next, focusOwner);
        if (!restored && destinationRef.current === next && context.epoch === sessionEpochRef.current) setMessage('문서 상태가 달라 이전 입력 위치를 적용하지 않았습니다. 현재 위치를 확인해 주세요.');
      } };
      reviewRestore.current = restoring;
      await navigate(next);
      if (destinationRef.current !== next && reviewRestore.current === restoring) reviewRestore.current = null;
    } finally { reviewBusy.current = false; }
  }
  async function signOut() { clearReviewContext(); await onSignOut(); }
  /** P3c (11/6): this account's 복구함 input left on this device at logout: this tab's four kinds and the copies kept
   * outside the tab (this page's and those of tabs that left), each counted once; with the outside rows behind it. */
  function deviceInput() {
    const outside = uiKeep.current?.keep.device() ?? { drafts: [], rows: [], elsewhere: 0 };
    const ui = uiRecovery.current?.read(), structural = structuralRecovery.current?.read();
    const creator = creatorRecovery.current?.read(), social = socialRecovery.current?.read();
    const count = mergeRecoveryDrafts(outside.drafts, ui?.ok ? ui.value?.drafts ?? [] : []).length
      + (structural?.ok ? structural.value?.entries.length ?? 0 : 0) + (creator?.ok ? creator.value?.entries.length ?? 0 : 0)
      + (social?.ok ? social.value?.entries.length ?? 0 : 0);
    return { count, rows: outside.rows, elsewhere: outside.elsewhere };
  }
  /** P3c '지우고 로그아웃': the copies outside the tab go first, in the account lock (another account's and another open
   * tab's stay), then this tab's four. Nothing is kept again from the start; when a part is refused, the person stays
   * signed in, is told so, and the tab keeps input again. */
  async function eraseAndSignOut() {
    if (leaveBusy || erasing.current || disposed.current || controller.current?.snapshot().pending) return;
    const listed = deviceInput().rows;
    erasing.current = true; setLeaveBusy(true); setLeaveFailed(false);
    let erased = false;
    try {
      const kept = uiKeep.current;
      erased = (kept ? await kept.port.erase(listed) : uiRecovery.current?.clear().ok ?? true)
        && (structuralRecovery.current?.clear().ok ?? true) && (creatorRecovery.current?.clear().ok ?? true)
        && (socialRecovery.current?.clear().ok ?? true);
    } catch { erased = false; }
    if (disposed.current) return;
    if (!erased) { erasing.current = false; setLeaveBusy(false); setLeaveFailed(true); captureInput(); return; }
    parkedDrafts.current = []; activeDrafts.current = []; parkedStructural.current = []; activeStructural.current = [];
    parkedCreator.current = []; activeCreator.current = null; parkedSocial.current = []; activeSocial.current = [];
    setRecoveries(null); setStructuralRecoveries(null); setCreatorRecoveries(null); setSocialRecoveries(null);
    await signOut();
    // P3 (11/6): the logout takes this workspace down before or after signOut returns, and its unmount would keep the
    // editors' input (just erased) again. So nothing is kept until then, or until the person acts here again (a logout
    // that did not start leaves them here, with the input still in the editors).
    if (!disposed.current) { erasedOut.current = true; setLeaveBusy(false); }
  }
  useEffect(() => {
    const resume = (event: Event) => { if (event.isTrusted && erasedOut.current) { erasedOut.current = false; erasing.current = false; } };
    // A key alone is not acting here (F5·Ctrl+R reloads with it): typing is an input, a key on a button is its click.
    const types = ['pointerdown', 'click', 'input', 'paste', 'drop', 'compositionstart'];
    for (const type of types) document.addEventListener(type, resume, true);
    return () => { for (const type of types) document.removeEventListener(type, resume, true); };
  }, []);
  useEffect(() => { if (leave) leaveKeep.current?.focus({ preventScroll: false }); }, [leave]);
  async function history(kind: 'undo' | 'redo') {
    if (selectingRefuses()) return;
    if(currentData.current?.spaces[session.userId]?.personalAuthoring){setMessage('내 Flow의 버전·실행 기록을 지키려고 전체 변경 되돌리기는 보류합니다. 본문 입력 취소는 편집기에서 사용할 수 있습니다.');return;}
    if (storageError) { setMessage('입력 보관 상태를 확인하기 전에는 변경할 수 없습니다.'); return; }
    if (hasInput()) { setMessage('작성 중인 내용을 먼저 저장하거나 보관해 주세요.'); return; }
    // 둘러보기 takes back only a change made there; anything else is the writing screens' to undo.
    if (PROGRAM_BROWSE_VIEWS.includes(destinationRef.current.view)
      && !programBrowseHistoryAllowed(historyOrigin.current, kind, controller.current?.snapshot().account?.revision)) { setHistoryHint(kind); return; }
    setHistoryHint(null);
    const before = controller.current?.snapshot().account?.revision;
    const result = await controller.current?.[kind]();
    if (result && !result.ok) setMessage(programErrorMessage(result.reason));
    else if (result?.ok) historyOrigin.current = programHistoryAfterStep(historyOrigin.current, kind, before, controller.current?.snapshot().account?.revision);
  }
  async function openLatest() {
    const store = controller.current, owner = currentOwnerRef.current, epoch = sessionEpochRef.current, visit = destinationRef.current;
    if (!store || disposed.current || openLatestLock.current || owner !== session.userId) return;
    if (store.snapshot().busy) { setMessage('서버 확인 중입니다. 확인이 끝나면 다시 열어 주세요. 입력은 보관했습니다.'); return; }
    if (store.snapshot().pending) { setMessage('먼저 저장 결과를 확인해 주세요.'); return; }
    const mounted = allEditors(), releases: (() => void)[] = [];
    let released = false, transferred = false;
    const release = () => { if (released) return; released = true; releases.forEach(unlock => { try { unlock(); } catch { /* Continue releasing the other owners. */ } }); };
    const sameOwner = () => !disposed.current && controller.current === store && currentOwnerRef.current === owner
      && sessionEpochRef.current === epoch && destinationRef.current === visit && owner === session.userId;
    try {
      for (const port of mounted) if (port) releases.push(port.lockInput());
      if (!captureInput() || !canReleaseInput() || !sameOwner()) return;
      const input = readProgramInputBoundary(mounted), discovery = canonicalJson(discoveryStateRef.current);
      if (!input) { setMessage('입력 상태를 확인하지 못했습니다. 현재 편집기를 유지합니다.'); return; }
      const before = store.snapshot();
      if (before.busy || before.pending) return;
      parkEditorInput();
      const refreshed = before.draft ? await store.discardConflict() : await store.refresh();
      if (!sameOwner()) return;
      // Composition may defer the lock. Re-capture and compare every current owner,
      // including clean input that changed and returned to its original text.
      if (!captureInput() || !canReleaseInput() || !programInputBoundaryCurrent(input, allEditors())
        || discovery !== canonicalJson(discoveryStateRef.current)) {
        setMessage('확인하는 동안 입력 상태가 바뀌었습니다. 현재 입력과 편집기를 유지합니다.'); return;
      }
      if (!refreshed) { setMessage('최신 내용을 확인하지 못했습니다. 입력은 보관했습니다. 다시 시도해 주세요.'); return; }
      const next = store.snapshot();
      if (!sameOwner() || !next.envelope || !next.account || next.busy || next.pending || next.draft
        || next.ownerId !== owner || next.account.ownerId !== owner || next.account.source.actorId !== owner
        || next.envelope.data.activeActorId !== owner || !['ready','saved','same-location','cancelled'].includes(next.status)) return;
      externalRef.current = false; setExternal(false); currentData.current = next.envelope.data; currentRevision.current = next.account.revision;
      currentPublicRevision.current = next.publicRevision ?? null; setPublisher(null); setInspector(null);
      setData(next.envelope.data); openLatestLock.current = release; setPresentation(value => value + 1); transferred = true;
      setMessage('내 입력을 보관하고 최신 내용을 열었습니다.');
    } finally { if (!transferred) release(); }
  }
  async function restoreDraft(index: number) {
    const draft = recoveries?.drafts[index]; if (!draft) return;
    const restore = (current: ProgramData, raw: string) => createProgramDocument(current, {
      actorId: session.userId, requestId: programId('recover'), expectedSpace: current.spaces[session.userId],
      title: `${draft.title || '보관 원문'} 복구`.slice(0, 240), raw,
    });
    // P3 (11/7): input the grammar cannot store as it is (an unfinished '- [') goes in whole between fence lines,
    // every character as it was; nothing is fixed.
    let fenced = false;
    const result = await mutate('보관 원문 복구', current => {
      const plain = restore(current, draft.raw);
      fenced = !plain.ok && plain.reason === 'unresolved';
      return fenced ? restore(current, programFencedRecoveryRaw(draft.raw)) : plain;
    });
    if (result.ok) { setDestination({ view: 'space', id: result.result }); setMessage(fenced
      ? '보관 원문을 새 문서로 저장했습니다. 그대로 저장할 수 없는 줄(덜 쓴 체크 칸 등)이 있어 원문 전체를 ``` 줄 사이에 글자 그대로 넣었습니다. 확인 후 보관본을 정리할 수 있습니다.'
      : '보관 원문을 새 문서로 저장했습니다. 확인 후 보관본을 정리할 수 있습니다.'); }
  }
  async function restoreStructuralDraft(index: number) {
    const entry = structuralRecoveries?.entries[index], record = structuralRecoveries;
    const store = controller.current, epoch = sessionEpochRef.current;
    const ready = () => {
      const live = store?.snapshot();
      return !!entry && !!record && record.ownerId === session.userId && !!live?.account && !!live.envelope
        && store === controller.current && epoch === sessionEpochRef.current && !disposed.current
        && currentOwnerRef.current === session.userId && live.ownerId === session.userId && live.account.ownerId === session.userId
        && live.account.source.actorId === session.userId
        && live.envelope.data.activeActorId === session.userId && !storageErrorRef.current && !externalRef.current
        && !preservationRef.current && !modalRef.current && !hasInput() && !live.busy && !live.pending && !live.draft
        && ['ready', 'saved', 'same-location'].includes(live.status);
    };
    if (!entry || !ready()) { setMessage('먼저 저장 결과와 작성 중인 입력을 확인해 주세요. 복사 작업은 보관 중입니다.'); return; }
    const live = store!.snapshot(), text = live.account!.space.text;
    const resolved = resolveAlphaStructuralRecovery(text, entry);
    if (resolved.status === 'already-present') { clearConfirmedStructuralInput(text); setMessage('이미 저장된 복사 작업입니다.'); return; }
    if (resolved.status !== 'ready' || live.account!.revision !== entry.baseRevision) {
      setMessage('저장본이 달라 복사 작업을 합치지 않았습니다. 보관한 입력을 먼저 확인해 주세요.'); return;
    }
    const result = await mutate('보관한 복사 작업 복구', current => {
      if (!ready() || store!.snapshot().account?.revision !== entry.baseRevision || current.activeActorId !== session.userId || !current.spaces[session.userId]) {
        return { ok: false, data: current, reason: 'conflict' };
      }
      const checked = resolveAlphaStructuralRecovery(current.spaces[session.userId].text, entry);
      if (checked.status !== 'ready') return { ok: false, data: current, reason: 'conflict' };
      const next = detached(current); next.spaces[session.userId].text = checked.workspace;
      return { ok: true, data: next, changed: true, result: entry.documentId };
    });
    if (result.ok && store === controller.current && epoch === sessionEpochRef.current && currentOwnerRef.current === session.userId && !disposed.current) {
      if (!replaceEditors()) { setMessage(keptEditorsNotice('보관한 문서·폴더와 행은 서버에 복구했습니다.')); return; }
      setDestination({ view: 'space', id: result.result }); setMessage('보관한 문서·폴더와 행을 복구했습니다.');
    }
  }
  useEffect(() => {
    const kept = uiKeep.current, ui = uiRecovery.current;
    const text = data?.activeActorId === session.userId ? data.spaces[session.userId]?.text : undefined;
    if (!kept || !ui || !text || keepTaken.current) return;
    keepTaken.current = true;
    const found = kept.keep.left(draft => !!draft.documentId && !!M.getDocument(text, draft.documentId)
      && M.raw(M.getDocument(text, draft.documentId)) === draft.raw);
    if (found.drafts.length) {
      const parked = mergeRecoveryDrafts(found.drafts, parkedDrafts.current);
      const saved = ui.save(mergeRecoveryDrafts(parked, activeDrafts.current));
      if (!saved.ok) { keepTaken.current = false; setStorageError(true); return; }
      parkedDrafts.current = parked; setRecoveries(saved.value);
    }
    // take rereads this session and the durable receiver inside the account lock.
    // Missing locks or failed shared storage retain the source for the next page.
    void found.take(ui);
  }, [data, session.userId]);
  function clearStructuralDrafts() {
    if (structuralRecovery.current?.clear().ok) { parkedStructural.current = []; activeStructural.current = []; setStructuralRecoveries(null); }
    else setStorageError(true);
  }
  function clearDrafts() {
    const cleared = uiRecovery.current?.clear();
    if (cleared?.ok) { parkedDrafts.current = []; activeDrafts.current = []; setRecoveries(null); setMessage('보관 입력을 지웠습니다. 서버 자료는 그대로입니다.'); }
    else setStorageError(true);
  }
  async function restoreCreator(index: number) {
    const entry = creatorRecoveries?.entries[index]; if (!entry) return;
    const now = new Date().toISOString(), working = detached(entry.working);
    const result = await mutate('제작 작업본 복구', current => setProgramCreatorWorking(current, {
      actorId: session.userId, expectedWorking: current.spaces[session.userId].creatorWorkspace?.working ?? null, working,
    }, now), { history: false, alphaCreator: { type: 'working', now, working } });
    if (result.ok && !replaceEditors()) setMessage(keptEditorsNotice('제작 작업본은 서버에 복구했습니다.'));
    else if (result.ok) { setCreatorSeen(true); setCreatorSelection(working.draftId); setDestination({ view: 'creator', id: working.draftId });
      setMessage(entry.auxiliaries.length ? '제작 작업본을 복구했습니다. 별도로 보관한 비교·구조 입력은 아래 원문을 확인해 다시 적용해 주세요.' : '제작 작업본을 복구했습니다. 저장한 버전과 개인 실행은 그대로입니다.'); }
    else setMessage('현재 제작 구조와 안전하게 합칠 수 없습니다. 보관 원문과 구조 자료는 유지했습니다. 현재 저장본을 확인해 주세요.');
  }
  function openCreatorEntry() {
    if (creatorEntryChoices) return;
    void navigate({ view: 'creator', id: creatorSelection }, true);
  }
  /** What became of a move: 'moved'; not moved because a save or held input refused it ('refused' before saving,
   *  'not-saved', 'late'); or because the person stayed, a newer move took over, or the session changed meanwhile. */
  async function navigate(next: ProgramDestination, chooseCreatorEntry = false): Promise<'moved' | 'refused' | 'not-saved' | 'late' | 'stayed' | 'superseded' | 'dropped'> {
    // Save wait P3 (11/7): a press while a move already waits on a save that went out takes that move over. The save
    // is not cut short and nothing is skipped: once it ends the move goes to the last place pressed, whose caller then
    // hears how it went; the caller taken over hears 'superseded'.
    const flight = moveFlight.current;
    if (flight && (externalRef.current || controller.current?.snapshot().pending)) {
      const mine = { next, chooseCreatorEntry };
      flight.target = mine;
      const result = await flight.done;
      return flight.target === mine ? result : 'superseded';
    }
    if (externalRef.current) { setMessage('먼저 저장 결과와 보관 입력을 확인해 주세요.'); return 'refused'; }
    // Save wait P3: a save already on its way (an autosave, say) no longer refuses the press: the move first waits for
    // its answer, under the same notice, 머무르기 and limit, then saves the editors and moves. An answer that is not a
    // save (a conflict, a lost answer) does not move. Held outside input still refuses.
    const afterPending = !!controller.current?.snapshot().pending;
    const visit = destinationRef.current, epoch = sessionEpochRef.current, store = controller.current;
    if (!captureInput()) return 'refused';
    const own = { next, chooseCreatorEntry };
    let settle: (result: ProgramMoveResult) => void = () => {};
    const current: ProgramMoveFlight = { target: own, done: new Promise<ProgramMoveResult>(resolve => { settle = resolve; }) };
    moveFlight.current = current;
    let result: ProgramMoveResult = 'dropped';
    try { result = await moveAfterSave(current, visit, epoch, store, afterPending); }
    finally { if (moveFlight.current === current) moveFlight.current = null; settle(result); }
    return current.target === own ? result : 'superseded';
  }
  /** Save wait P3: until the save on its way has its answer; false when that answer is not a save (or none comes). */
  async function pendingSettled(store: typeof controller.current) {
    const failed = (status: string | undefined) => ['conflict', 'recovery-required', 'session-expired', 'checking-result'].includes(status ?? '');
    for (let waited = 0; store && store === controller.current && store.snapshot().pending && !failed(store.snapshot().status) && waited < 60_000; waited += 100)
      await new Promise(resolve => setTimeout(resolve, 100));
    return !!store && store === controller.current && !store.snapshot().pending && !failed(store.snapshot().status);
  }
  async function moveAfterSave(flight: ProgramMoveFlight, visit: ProgramDestination, epoch: typeof sessionEpochRef.current, store: typeof controller.current, afterPending = false): Promise<ProgramMoveResult> {
    // Save wait (11/7): the move still saves every editor first and never skips it. Past 0.8 s it says so and offers 머무르기;
    // past 10 s, or when the save cannot finish, it does not move and says the input is on this device (복구함). A wait
    // that ends without moving lets the save go on. A newer move takes over: the older one stops waiting and does not move.
    moveStay.current?.();
    const seq = ++moveSeq.current;
    let stay = () => {};
    const stayed = new Promise<void>(resolve => { stay = resolve; });
    moveStay.current = stay;
    moveOpener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    const releases = allEditors().map(port => port?.lockInput());
    let outcome: ProgramMoveWaitOutcome;
    try {
      outcome = await waitProgramMoveFlush({
        flush: async () => {
          if (afterPending && !await pendingSettled(store)) return false;
          for (const port of allEditors()) if (port && !await port.flushAll()) return false; return true;
        },
        onWaiting: () => { if (moveSeq.current === seq) setMoveWait({ seq, phase: 'saving' }); },
        stayed,
        onLateSettled: saved => setMoveWait(shown => shown?.seq === seq && shown.phase === 'late' ? { seq, phase: saved ? 'late-saved' : 'not-saved' } : shown),
      });
    } finally {
      releases.forEach(release => release?.());
      if (moveStay.current === stay) moveStay.current = null;
    }
    if (moveSeq.current !== seq) return 'superseded';
    if (outcome !== 'saved') { setMoveWait(outcome === 'stayed' ? null : { seq, phase: outcome }); return outcome; }
    setMoveWait(null);
    if (disposed.current || visit !== destinationRef.current || epoch !== sessionEpochRef.current || store !== controller.current
      || currentOwnerRef.current !== session.userId) return 'dropped';
    // The last place pressed while this move waited (save wait P3), or its own.
    let { next } = flight.target;
    const { chooseCreatorEntry } = flight.target;
    if (chooseCreatorEntry) { creatorEntryReturn.current = visit; setCatalogDetailOpen(false); }
    setCreatorEntryChoices(next.view === 'creator' && chooseCreatorEntry);
    if (next.view === 'creator') { setCreatorSeen(true); setCreatorSelection(next.id); }
    if (['flow', 'discover'].includes(next.view)) setDiscoverySelection(next.view === 'flow' ? next.id : undefined);
    if (next.view === 'community' || next.view === 'activity') { setCommunityView(next.view); setCommunitySelection(next.id); }
    setSeen(prior => ({ discovery: prior.discovery || ['flow', 'discover'].includes(next.view), community: prior.community || ['community', 'activity'].includes(next.view) }));
    if (next.view === 'space' && next.action === 'publish' && next.id) { setPublisher(next.id); next = { view: 'space', id: next.id }; }
    if (window.location.hash !== programLocation(next)) window.history.pushState(null, '', programLocation(next));
    destinationRef.current = next; setDestination(next); setOutput(null);
    if (!['flow', 'discover'].includes(next.view)) setFlowReturn(null);
    return 'moved';
  }
  useEffect(() => {
    const initial = parseProgramLocation(window.location.hash);
    destinationRef.current = initial; setDestination(initial);
    if (initial.view === 'creator') { setCreatorSeen(true); setCreatorSelection(initial.id); }
    if (['flow', 'discover'].includes(initial.view)) setDiscoverySelection(initial.view === 'flow' ? initial.id : undefined);
    if (initial.view === 'community' || initial.view === 'activity') { setCommunityView(initial.view); setCommunitySelection(initial.id); }
    setSeen({ discovery: ['flow', 'discover'].includes(initial.view), community: ['community', 'activity'].includes(initial.view) });
    const route = () => {
      if (hasInput() || controller.current?.snapshot().pending || externalRef.current) {
        captureInput(); window.history.replaceState(null, '', programLocation(destinationRef.current));
        setMessage('작성 중인 입력을 보관했습니다. 화면 안의 이동 버튼으로 저장 후 이동해 주세요.'); return;
      }
      void navigate(parseProgramLocation(window.location.hash));
    };
    window.addEventListener('popstate', route); window.addEventListener('hashchange', route);
    return () => { window.removeEventListener('popstate', route); window.removeEventListener('hashchange', route); };
  }, []);
  useEffect(() => {
    const dialog = inspectorDialog.current;
    if (!inspector || !dialog) return;
    const opener = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    return () => { if (dialog.open) dialog.close(); restoreProgramDialogFocus(opener); };
  }, [inspector]);
  function pendingImportDocuments() {
    const port = editors.current, ids = port?.pendingDocumentIds?.() ?? [];
    const space = currentData.current?.spaces[session.userId];
    return port?.hasPendingInput?.() && !ids.length && space ? [...space.text.documents, ...space.text.flows].map(doc => doc.id) : ids;
  }
  async function openFlowsFromDocument(documentId?: string, flowId?: string, returnFocus?: HTMLElement, writing?: ProgramWritingReturn) {
    const epoch = sessionEpochRef.current;
    await navigate(flowId ? { view: 'flow', id: flowId } : { view: 'discover' });
    if (epoch === sessionEpochRef.current && currentOwnerRef.current === session.userId
      && ['flow', 'discover'].includes(destinationRef.current.view))
      setFlowReturn({ actorId: session.userId, documentId, kind: flowId ? 'copy' : 'browse', returnFocus,
        ...(writing && documentId && writing.documentId === documentId ? { writing } : {}) });
  }
  async function returnFromFlows() {
    const returning = flowReturn, epoch = sessionEpochRef.current, opener = document.activeElement;
    if (!returning || returning.actorId !== currentOwnerRef.current) return;
    // FC7 review: from this press on, the person's own scroll, touch or key keeps their place.
    const intent = returning.writing ? watchProgramReturnIntent(window) : undefined;
    await navigate({ view: 'space', id: returning.documentId });
    const current = () => epoch === sessionEpochRef.current && returning.actorId === currentOwnerRef.current
      && destinationRef.current.view === 'space' && destinationRef.current.id === returning.documentId;
    if (!current()) { intent?.stop(); return; }
    setFlowReturn(null);
    requestAnimationFrame(() => {
      const writing = returning.writing;
      if (current() && (document.activeElement === opener || document.activeElement === document.body)
        && restoreProgramDialogFocus(returning.returnFocus ?? null) && writing)
        // FC7: caret and scroll come back too, while account, document and its text are the ones left.
        restoreProgramWritingReturn(writing, intent, () => current() && !!currentData.current
          && !programReviewOriginReason(currentData.current, { actorId: returning.actorId, documentId: writing.documentId, raw: writing.raw }));
      else intent?.stop();
    });
  }
  /** UX B1: the arrival notice's 되돌리기 is 나 › 문제 해결's 되돌리기 (the same server undo), offered while the import is the
   *  last server change. Once it is taken back the notice goes. */
  async function undoImportArrival() {
    const arrival = importArrival;
    if (!arrival || importArrivalBusy || controller.current?.snapshot().account?.revision !== arrival.revision) return;
    setImportArrivalBusy(true);
    try { await history('undo'); }
    finally { if (!disposed.current) setImportArrivalBusy(false); }
    if (!disposed.current && controller.current?.snapshot().account?.revision !== arrival.revision) setImportArrival(previous => previous === arrival ? null : previous);
  }
  async function cancelImportLinks() {
    if (!importUndo || importUndoLock.current) return;
    const batch = importUndo.batch, epoch = sessionEpochRef.current;
    importUndoLock.current = true; setImportUndoBusy(true);
    const isCurrent = () => !disposed.current && epoch === sessionEpochRef.current && currentOwnerRef.current === batch.actorId
      && destinationRef.current.view === 'space' && destinationRef.current.id === batch.documentId;
    try {
      const outcome = await cancelProgramImportLinks({ batch, read: () => currentData.current, mutate, pending: pendingImportDocuments, isCurrent });
      if (isCurrent()) setImportUndo(previous => previous?.batch === batch ? { batch, done: outcome.remaining === 0,
        text: programImportCancelNotice(outcome) } : previous);
    } finally { if (epoch === sessionEpochRef.current) { importUndoLock.current = false; setImportUndoBusy(false); } }
  }
  async function useVersion(versionId: string, itemIds: string[], anchor: string | null, recurrenceStarts?: Record<string, string>, targetDocumentId?: string, repeat?: ProgramImportRepeatInput): Promise<ProgramImportOutcome> {
    const owner = session.userId, epoch = sessionEpochRef.current, before = currentData.current?.spaces[owner];
    // 공식 반복 Flow: the repeat items I already have a line for are not written; the notice says so.
    const importing = currentData.current?.public.versions.find(row => row.id === versionId);
    const existingRepeats = importing ? programImportRepeats(before, importing, itemIds).filter(row => row.existing).length : 0;
    if (!before || targetDocumentId && !programImportTargets(currentData.current!, owner, before.copies.find(copy => copy.flowId === currentData.current!.public.versions.find(row => row.id === versionId)?.flowId)?.documentId, pendingImportDocuments()).some(doc => doc.id === targetDocumentId && !doc.reason))
      return { ok: false, reason: 'unresolved' };
    const result = await mutate('개인 Flow 가져오기', fresh => epoch !== sessionEpochRef.current || owner !== currentOwnerRef.current
      || targetDocumentId && !programImportTargets(fresh, owner, before.copies.find(copy => copy.flowId === fresh.public.versions.find(row => row.id === versionId)?.flowId)?.documentId, pendingImportDocuments()).some(doc => doc.id === targetDocumentId && !doc.reason)
      ? programFailure(fresh, 'conflict') : importProgramPublicVersion(fresh, { actorId: owner,
      requestId: programId('request'), expectedSpace: fresh.spaces[session.userId], versionId, itemIds, anchor, ...(targetDocumentId ? { targetDocumentId } : {}), ...(recurrenceStarts ? { recurrenceStarts } : {}), ...(repeat?.repeatStarts ? { repeatStarts: repeat.repeatStarts } : {}), ...(repeat?.repeatMonths ? { repeatMonths: repeat.repeatMonths } : {}) }),
    { alphaSocial: { type: 'copy-import', versionId, itemIds, anchor, ...(targetDocumentId ? { targetDocumentId } : {}), ...(recurrenceStarts ? { recurrenceStarts } : {}), ...(repeat?.repeatStarts ? { repeatStarts: repeat.repeatStarts } : {}), ...(repeat?.repeatMonths ? { repeatMonths: repeat.repeatMonths } : {}) } });
    if (!result.ok) return { ok: false, reason: result.reason };
    if (result.presentationPending || epoch !== sessionEpochRef.current || owner !== currentOwnerRef.current) return { ok: false, reason: 'presentation-pending' };
    const confirmed = controller.current?.snapshot();
    const live = confirmed?.envelope?.data, copy = live?.spaces[session.userId].copies.find(row => row.id === result.result);
    const version = live?.public.versions.find(row => row.id === versionId);
    if (copy) {
      await navigate({ view: 'space', id: targetDocumentId ?? copy.documentId });
      if (epoch !== sessionEpochRef.current || owner !== currentOwnerRef.current) return { ok: false, reason: 'presentation-pending' };
      // FC2: the success notice belongs to the writing screen it arrives on; Flow 찾기 is hidden by then.
      const arrived = destinationRef.current;
      if (targetDocumentId && arrived.view === 'space' && arrived.id === targetDocumentId) {
        if (!programImportReceiptOwnsLinks(confirmed?.lastReceipt, confirmed?.account?.revision, copy.id)) {
          setImportUndo(null);
          setMessage(result.changed === false ? '이미 연결한 할 일입니다. 새로 넣은 것은 없습니다.'
            : '문서에 넣었습니다. 더 최신 상태를 함께 받아 이번 연결을 구분하지 못했습니다. 연결과 입력은 그대로 두었습니다.');
          return { ok: true };
        }
        const batch = captureProgramImportLinks(owner, copy.id, targetDocumentId, before, live!.spaces[owner]);
        const count = batch.ordinary.length + batch.recurring.length, written = batch.repeat?.length ?? 0;
        setImportUndo({ batch, done: !count && !written, text: programImportTargetNotice(count, written, existingRepeats) });
      } else if (version && arrived.view === 'space' && arrived.id === copy.documentId) {
        // A new document: its repeat lines go with the document itself (휴지통 or 되돌리기, as the notice says).
        const written = captureProgramImportLinks(owner, copy.id, copy.documentId, before, live!.spaces[owner]).repeat?.length ?? 0;
        const undoHeld = !!live?.spaces[session.userId]?.personalAuthoring;
        // Flow pipeline S2: the span says where the document's tasks landed (read off the saved copy, as the lists do).
        const placed = programExecutionTasks(live!.spaces[owner]).filter(task => task.docId === copy.documentId), span = programImportSpan(placed);
        setImportArrival({ actorId: owner, documentId: copy.documentId, text: programImportArrivalNotice(version.title, undoHeld, programImportRepeatNotice(written, existingRepeats), { ...span, today: programLocalDate() }),
          revision: undoHeld ? null : confirmed?.account?.revision ?? null, calendar: span.first ? { first: span.first, title: version.title, count: placed.length } : null });
      }
    }
    return { ok: true };
  }
  async function startText(raw: string, title: string) {
    const result = await mutate('원문 문서 만들기', fresh => createProgramDocument(fresh, { actorId: session.userId, requestId: programId('request'), expectedSpace: fresh.spaces[session.userId], title, raw }));
    if (result.ok) { setDiscoveryState(createProgramDiscoveryNavigationState()); await navigate({ view: 'space', id: result.result }); }
    return result.ok;
  }
  /** Flow pipeline S8 [내 글에 링크로 두기]: under today in the writing document I was last in (where its caret was kept),
   *  when that is a writing document of mine open to writing with no input waiting; otherwise in a new one. */
  async function keepLink(link: string) {
    const owner = session.userId, epoch = sessionEpochRef.current, space = currentData.current?.spaces[owner], canonical = programCanonicalLink(link), today = programLocalDate();
    if (!space || !canonical) return false;
    const home = programLinkHome(space, pendingImportDocuments());
    const result = home
      ? await mutate('링크 메모 두기', fresh => addProgramLinkMemo(fresh, { actorId: owner, requestId: programId('request'), expectedSpace: fresh.spaces[owner], documentId: home, link: canonical, today }))
      : await mutate('링크 메모 새 글', fresh => createProgramDocument(fresh, { actorId: owner, requestId: programId('request'), expectedSpace: fresh.spaces[owner], title: '링크 메모', raw: programLinkMemoRaw('', today, canonical) ?? '' }));
    if (!result.ok || epoch !== sessionEpochRef.current || owner !== currentOwnerRef.current) return false;
    const documentId = home ?? result.result;
    setDiscoveryState(createProgramDiscoveryNavigationState()); await navigate({ view: 'space', id: documentId });
    if (destinationRef.current.view === 'space' && destinationRef.current.id === documentId)
      setImportArrival({ actorId: owner, documentId, text: home ? '오늘 아래에 링크를 한 줄 두었습니다.' : '쓰던 글을 찾지 못해 새 글에 링크를 두었습니다.', revision: null, calendar: null });
    return true;
  }
  /** S8 [이 링크로 Flow 만들기]: a new document with the link as its source line; 선택해서 공개 then brings it as the source link. */
  async function createFromLink(link: string) {
    const owner = session.userId, canonical = programCanonicalLink(link);
    if (!canonical || !await startText(`- 출처: ${canonical}`, '링크로 만드는 Flow')) return false;
    const arrived = destinationRef.current;
    if (arrived.view === 'space' && arrived.id && owner === currentOwnerRef.current)
      setImportArrival({ actorId: owner, documentId: arrived.id, text: '출처 링크를 넣은 새 글입니다. 해 본 일을 할 일로 적은 뒤 글 메뉴의 ‘선택해서 공개’를 누르면 출처 칸이 채워져 있습니다.', revision: null, calendar: null });
    return true;
  }
  async function restoreSocial(index: number) {
    const entry = socialRecoveries?.entries[index], current = currentData.current;
    if (!entry || !current) return;
    const space = current.spaces[session.userId]; let intent: AlphaSocialIntent;
    if (entry.kind === 'publication') { const draft = entry.value as ProgramPublicationDraft;
      intent = { type: 'publication-save', draft, expected: space.publicationDrafts.find(row => row.documentId === draft.documentId) ?? null };
    } else if (entry.kind === 'participation') { const draft = entry.value as ProgramParticipationDraft;
      intent = { type: 'participation-save', draft, expected: space.participationDrafts.find(row => row.id === draft.id) ?? null };
    } else { const value = entry.value as { proposalId: string; draft: ProgramProposalReviewDraft };
      intent = { type: 'review-save', ...value, expected: space.proposalReviewDrafts?.[value.proposalId] ?? null };
    }
    if (!isAlphaSocialIntent(intent)) { setMessage('보관한 초안 형식을 확인하지 못했습니다. 아래 보관본은 그대로 유지합니다.'); return; }
    const result = await mutate('공개·참여 초안 복구', fresh => executeAlphaSocialIntent(fresh, session.userId, intent, programId('recover')), { alphaSocial: intent, history: false });
    if (result.ok) { setMessage('비공개 초안을 복구했습니다. 아직 게시하지 않았습니다.');
      if (intent.type === 'publication-save') setPublisher(intent.draft.documentId); else await navigate({ view: 'activity' }); }
  }
  function captureCreatorRoute() {
    const visit = destinationRef.current;
    return (id: string | undefined) => {
      if (disposed.current || destinationRef.current !== visit || visit.view !== 'creator') return false;
      const next: ProgramDestination = { view: 'creator', ...(id ? { id } : {}) };
      destinationRef.current = next; setDestination(next); setCreatorSelection(id); return true;
    };
  }
  function readParticipationRecovery(failedDraft: ProgramParticipationDraft, expected: ProgramParticipationDraft | null): ProgramCommunityDraftSaveRecovery | undefined {
    const authority = controller.current?.snapshot();
    if (disposed.current || storageError || !authority || authority.ownerId !== session.userId
      || authority.account?.ownerId !== session.userId || authority.envelope?.data.activeActorId !== session.userId) return;
    const command = authority.pending ?? authority.draft;
    try {
      if (command?.kind === 'social' && command.intent.type === 'participation-save'
        && canonicalJson(command.intent.draft) === canonicalJson(failedDraft)
        && canonicalJson(command.intent.expected) === canonicalJson(expected)) {
        if (authority.pending && authority.status !== 'saving' && !externalRef.current) return {
          state: 'unknown', message: '이전 요청이 저장됐는지 확인해야 합니다. 지금 입력은 그대로 둡니다.',
          action: { label: '이전 요청 저장 결과 확인', disabled: authority.busy, onClick: () => {
            const live = controller.current?.snapshot();
            if (readParticipationRecovery(failedDraft, expected)?.state !== 'unknown'
              || disposed.current || storageError || externalRef.current || live?.ownerId !== session.userId || live.busy
              || canonicalJson(live.pending) !== canonicalJson(command)) return;
            void controller.current?.resolvePending(true);
          } },
        };
        if (authority.retryableRejectedSocialDraft && !authority.pending && !authority.busy && !externalRef.current) return {
          state: 'rejected', message: '초안을 저장하지 못했습니다. 입력은 남아 있습니다.',
        };
      }
      const proof = confirmedParticipation.current;
      const port = communityEditors.current, captured = port?.captureSocialDrafts?.() ?? [];
      const onlyNewParticipationInput = !!proof && proof.command.intent.type === 'participation-save'
        && port?.hasPendingInput?.() === true && captured.length === 1 && captured[0].kind === 'participation'
        && (captured[0].value as ProgramParticipationDraft).id === proof.command.intent.draft.id
        && canonicalJson(captured[0].value) !== canonicalJson(proof.command.intent.draft)
        && !allEditors().some(editor => editor && editor !== port && editor.hasPendingInput?.())
        && !programDiscoveryHasUnstoredInput(discoveryStateRef.current);
      if (proof?.ownerId === session.userId && proof.command.intent.type === 'participation-save'
        && onlyNewParticipationInput && !authority.pending && !authority.draft && externalRef.current
        && authority.account?.revision === proof.revision
        && authority.publicRevision === proof.publicRevision && canonicalJson(authority.account.space) === proof.privateBytes
        && authority.lastReceipt?.requestId === proof.command.requestId
        && authority.lastReceipt.kind === 'social' && authority.lastReceipt.changed && authority.lastReceipt.revision === proof.revision
        && canonicalJson(proof.command.intent.draft) === canonicalJson(failedDraft)
        && canonicalJson(proof.command.intent.expected) === canonicalJson(expected)) return {
          state: 'confirmed-unsaved', message: '이전 요청은 저장됐습니다. 그 뒤에 쓴 입력은 아직 저장되지 않았습니다.',
          action: { label: '추가 입력 보관 후 저장본 열기', disabled: authority.busy, onClick: () => {
            const live = controller.current?.snapshot();
            if (readParticipationRecovery(failedDraft, expected)?.state !== 'confirmed-unsaved'
              || disposed.current || storageError || live?.ownerId !== session.userId || live.busy || live.pending || live.draft
              || live.account?.revision !== proof.revision || live.lastReceipt?.requestId !== proof.command.requestId
              || live.publicRevision !== proof.publicRevision || canonicalJson(live.account.space) !== proof.privateBytes) return;
            void openLatest();
          } },
        };
    } catch { /* Invalid/cyclic input cannot borrow presentation proof. */ }
  }
  function activeParticipationRecovery(): (ProgramCommunityDraftSaveRecovery & { draftId: string }) | undefined {
    if (!seen.community || publisher || inspector || !['community', 'activity'].includes(destination.view)) return;
    const authority = controller.current?.snapshot(), proof = confirmedParticipation.current;
    const command = authority?.pending ?? authority?.draft ?? proof?.command;
    if (command?.kind !== 'social' || command.intent.type !== 'participation-save') return;
    const intent = command.intent;
    const active = communityEditors.current?.captureSocialDrafts?.().find(entry => entry.kind === 'participation'
      && (entry.value as ProgramParticipationDraft).id === intent.draft.id);
    if (!active) return;
    const recovery = readParticipationRecovery(intent.draft, intent.expected);
    return recovery ? { ...recovery, draftId: intent.draft.id } : undefined;
  }
  const localParticipationRecovery = activeParticipationRecovery();
  const reviewOwnsAnnouncement = !!reviewAnnouncement?.isCurrent();
  const participationMessage = !!localParticipationRecovery && [programErrorMessage('checking-result'), '저장 결과를 확인했습니다.',
    '글 입력은 남아 있습니다. 내용을 수정하거나 ‘나중에 이어 쓰기’를 눌러 다시 보관해 주세요.'].includes(message);
  const pending = !!snapshot?.pending;
  const pendingUnknown = pendingResultUnknown(snapshot);
  const unavailable = snapshot?.status === 'session-expired' || !data || data.activeActorId !== session.userId || snapshot?.ownerId !== session.userId;
  const browse = ['discover', 'flow', 'community'].includes(destination.view);
  const modalRecovery = pendingUnknown
    ? <section className={styles.problem} aria-label="저장 결과 복구"><p>응답이 끊겨도 서버에 저장됐을 수 있습니다. 입력은 유지하고 같은 요청으로 확인합니다.</p><button type="button" disabled={snapshot?.busy} onClick={() => void resolvePendingResult()}>{snapshot?.busy ? '확인 중…' : '다시 확인'}</button></section>
    : external || snapshot?.status === 'conflict' || snapshot?.draft && !pending && !snapshot.retryableRejectedDraft && !snapshot.retryableNativeHandoff && !snapshot.retryableRejectedSocialDraft ? <section className={styles.problem} aria-label="편집 중 변경 확인"><p>다른 곳에서 먼저 저장했습니다. 지금 쓴 내용은 이 기기에 남겨 두었습니다. 최신 내용을 확인해 주세요.</p><button disabled={snapshot?.busy} onClick={() => void openLatest()}>최신 내용 열기</button></section> : null;
  // Presentation only: storage, pending authority and recovery actions stay
  // unchanged. In personal space their disclosure does not resize the document.
  const needsInputProtection = storageError || !localParticipationRecovery && (pendingUnknown
    || (snapshot?.retryableRejectedDraft || snapshot?.retryableNativeHandoff || snapshot?.retryableRejectedSocialDraft) && !external && !pending
    || external || snapshot?.status === 'conflict'
    || snapshot?.draft && !pending && !snapshot.retryableRejectedDraft && !snapshot.retryableNativeHandoff && !snapshot.retryableRejectedSocialDraft);
  // R8a: saved input. The 복구함 always lists and counts everything stored (storedTotal). The notice and
  // badges count only input that needs attention (savedTotal): every input is still captured to the tab,
  // but the capture of input the editors are saving normally counts only once it is at risk: protection,
  // a local refusal, a failed or unknown save, an ended session or broken storage. Otherwise ordinary
  // typing showed a saved input from the first key until the save. When some goes away, lower the
  // closed-at mark so the next newly saved input shows the notice again.
  const inputAtRisk = needsInputProtection || unavailable || saveFailed || editorInputFailed
    || ['signed-out', 'recovery-required', 'checking-result'].includes(snapshot?.status ?? '');
  const storedTotal = (recoveries?.drafts.length ?? 0) + (structuralRecoveries?.entries.length ?? 0)
    + (creatorRecoveries?.entries.length ?? 0) + (socialRecoveries?.entries.length ?? 0);
  const announcedDrafts = announcedRecoveryEntries(recoveries?.drafts, parkedDrafts.current, activeDrafts.current, inputAtRisk, recoveryDraftIdentity);
  const announcedStructural = announcedRecoveryEntries(structuralRecoveries?.entries, parkedStructural.current, activeStructural.current, inputAtRisk);
  const announcedCreator = announcedRecoveryEntries(creatorRecoveries?.entries, parkedCreator.current, activeCreator.current ? [activeCreator.current] : [], inputAtRisk);
  const announcedSocial = announcedRecoveryEntries(socialRecoveries?.entries, parkedSocial.current, activeSocial.current, inputAtRisk);
  const savedTotal = announcedDrafts.length + announcedStructural.length + announcedCreator.length + announcedSocial.length;
  // Each entry by a tag of its kind and identity: the toast says the ones not said yet on this device, once.
  const recoveryTags = (atRisk: boolean) => [
    ...(atRisk ? recoveries?.drafts ?? [] : announcedDrafts).map(entry => recoveryEntryTag('draft', recoveryDraftIdentity(entry))),
    ...(atRisk ? structuralRecoveries?.entries ?? [] : announcedStructural).map(entry => recoveryEntryTag('structural', canonicalJson(entry))),
    ...(atRisk ? creatorRecoveries?.entries ?? [] : announcedCreator).map(entry => recoveryEntryTag('creator', canonicalJson(entry))),
    ...(atRisk ? socialRecoveries?.entries ?? [] : announcedSocial).map(entry => recoveryEntryTag('social', canonicalJson(entry)))];
  const announcedTags = savedTotal ? recoveryTags(false) : [], announcedSignature = announcedTags.join('|');
  useEffect(() => {
    if (!announcedTags.length) return;
    const owner = session.userId;
    if (recoverySeen.current?.owner !== owner) recoverySeen.current = { owner, tags: readRecoverySeen(devNoticeStorage() ?? null, owner) };
    const fresh = newRecoveryTags(announcedTags, recoverySeen.current.tags);
    if (!fresh.length) return;
    for (const tag of fresh) recoverySeen.current.tags.add(tag);
    writeRecoverySeen(devNoticeStorage() ?? null, owner, recoverySeen.current.tags, recoveryTags(true));
    setRecoveryToast({ count: fresh.length, at: Date.now() });
    // The tags stand for the entries; their joined text is the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcedSignature, session.userId]);
  useEffect(() => {
    if (!recoveryToast) return;
    const shown = recoveryToast, timer = setTimeout(() => { if (!recoveryToastHeld.current) setRecoveryToast(current => current === shown ? null : current); }, 10_000);
    return () => clearTimeout(timer);
  }, [recoveryToast]);
  useEffect(() => { setRecoveryToast(null); recoveryToastHeld.current = false; }, [session.userId]);
  // `announce` is off where the note editor's one status slot already announces this state.
  const inputProtectionFor = (announce: boolean) => <>
    {storageError && <p className={styles.problem} role={announce ? 'alert' : undefined}>브라우저의 입력 보관 상태를 확인하지 못했습니다. 쓰기를 멈췄습니다. 작성 중인 내용을 파일로 보관해 주세요.</p>}
    {pendingUnknown && !localParticipationRecovery && <section className={styles.problem} aria-label="저장 결과 복구"><p>응답이 끊겨도 서버에 저장됐을 수 있습니다. 같은 요청으로 확인합니다.</p>
      <button type="button" disabled={snapshot?.busy} onClick={() => void resolvePendingResult()}>{snapshot?.busy ? '확인 중…' : '다시 확인'}</button></section>}
    {(snapshot?.retryableRejectedDraft || snapshot?.retryableNativeHandoff || snapshot?.retryableRejectedSocialDraft) && !external && !pending && !localParticipationRecovery && <section className={styles.problem} aria-label="거절된 저장과 입력 보호"><p>{snapshot?.retryableNativeHandoff
      ? '저장되지 않았습니다. 비교와 선택은 유지했습니다. 같은 선택으로 다시 적용해 주세요.'
      : snapshot?.retryableRejectedSocialDraft ? '글 입력은 남아 있습니다. 내용을 수정하거나 ‘나중에 이어 쓰기’를 눌러 다시 보관해 주세요.'
      : '저장되지 않았습니다. 입력은 남아 있습니다. 문서에서 내용을 수정한 뒤 ‘다시 저장’을 눌러 주세요.'}</p></section>}
    {(external || snapshot?.status === 'conflict' || snapshot?.draft && !pending && !snapshot.retryableRejectedDraft && !snapshot.retryableNativeHandoff && !snapshot.retryableRejectedSocialDraft) && !localParticipationRecovery && <section className={styles.problem} aria-label="다른 기기 변경과 입력 보호">
      <h2>다른 곳에서 먼저 바뀐 내용이 있습니다</h2><p>지금 쓴 내용은 이 기기에 남겨 두었습니다. 최신 내용을 연 뒤 필요하면 다시 붙여 넣으세요.</p>
      {snapshot?.busy && <p role={announce ? 'status' : undefined}>서버 확인 중… 입력은 그대로 보관합니다.</p>}
      <button type="button" disabled={snapshot?.busy} onClick={() => void openLatest()}>최신 내용 열기</button>
      {snapshot?.draft && <AlphaConflictReview draft={snapshot.draft} account={snapshot.account} publicRepository={snapshot.references?.public ?? data?.public}
        onCopy={raw => navigator.clipboard.writeText(raw).then(() => setMessage('내용을 복사했습니다.'), () => setMessage('복사하지 못했습니다. 내용을 직접 선택해 주세요.'))} />}
    </section>}
  </>;
  const structuralRecoveryPanel = structuralRecoveries && <details className={styles.recovery}>
    <summary>보관한 복사 작업 {structuralRecoveries.entries.length}개</summary>
    <div>
      {structuralRecoveries.entries.map((entry, index) => <section key={`${entry.documentId}:${entry.baseRevision}:${index}`}>
        <h2>{entry.next.documents.filter(doc => ![...entry.before.documents, ...entry.before.flows].some(prior => prior.id === doc.id)).map(doc => doc.title || '제목 없는 문서').join(', ')}</h2><p>복사한 새 문서와 폴더·행을 함께 보관했습니다.</p>
        <button type="button" disabled={unavailable || pending || external || !!snapshot?.draft || hasInput()} onClick={() => void restoreStructuralDraft(index)}>복사 작업 복구</button></section>)}
      <button type="button" onClick={clearStructuralDrafts}>보관한 복사 작업 지우기</button>
    </div>
  </details>;
  const savedInputPanel = recoveries && <details className={styles.recovery} open={unavailable || !localParticipationRecovery && (external || snapshot?.status === 'conflict')} onKeyDown={event => {
    if (event.key !== 'Escape' || event.nativeEvent.isComposing || !event.currentTarget.open) return;
    event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false;
    event.currentTarget.querySelector('summary')?.focus({ preventScroll: true });
  }}>
    <summary>보관한 입력 {recoveries.drafts.length}개</summary>
    <div>
      {recoveries.drafts.map((draft, index) => <section key={index}><h2>{draft.title}</h2><textarea aria-label={`보관한 입력 ${index + 1}`} value={draft.raw} readOnly rows={5} />
        <button type="button" onClick={() => void navigator.clipboard.writeText(draft.raw).then(() => setMessage('원문을 복사했습니다.'), () => setMessage('복사하지 못했습니다. 원문을 직접 선택해 주세요.'))}>원문 복사</button>
        <button type="button" disabled={unavailable || pending || external || !!snapshot?.draft} onClick={() => void restoreDraft(index)}>새 문서로 복구</button></section>)}
      <button type="button" onClick={clearDrafts}>보관 입력 버리기</button>
    </div>
  </details>;
  // R8a 복구함: the four kinds of saved input in one place, each with its own buttons as before.
  // Saving and restoring are unchanged; only where they show moved.
  const creatorRecoveryPanel = <>
    {creatorRecoveries && <details className={styles.recovery} open={unavailable || external || snapshot?.status === 'conflict'}>
      <summary>보관한 제작 입력 {creatorRecoveries.entries.length}개</summary>
      {creatorRecoveries.entries.map((entry, index) => <section key={index}><h2>{entry.working.title || '제작 중 원문'}</h2>
        <textarea aria-label={`보관한 제작 원문 ${index + 1}`} readOnly rows={5} value={entry.working.nativePendingRawText ?? entry.working.rawText} />
        <button disabled={unavailable || pending || external || !!snapshot?.draft} onClick={() => void restoreCreator(index)}>제작 작업본으로 복구</button>
        <details><summary>제작 구조·비교 입력 보관본</summary><p>개인 문서로 만들지 않습니다. 비교 선택은 최신 제작본과 다시 확인해 적용하세요.</p>
          <textarea aria-label={`제작 문맥 보관본 ${index + 1}`} readOnly value={JSON.stringify(entry, null, 2)} rows={6} /></details>
      </section>)}
      <button onClick={() => { const cleared = creatorRecovery.current?.clear(); if (cleared?.ok) { parkedCreator.current = []; activeCreator.current = null; setCreatorRecoveries(null); } else setStorageError(true); }}>보관 제작 입력 버리기</button>
    </details>}
  </>;
  const socialRecoveryPanel = <>
    {socialRecoveries && <details className={styles.recovery} open={unavailable || !localParticipationRecovery && (external || snapshot?.status === 'conflict')}>
      <summary>보관한 공개·참여 입력 {socialRecoveries.entries.length}개</summary>
      <p>선택한 항목·사진 연결·검토 문맥을 함께 보관했습니다. 복구해도 자동으로 게시하지 않습니다.</p>
      {socialRecoveries.entries.map((entry, index) => <section key={index}><h2>{entry.kind === 'publication' ? '공개 초안' : entry.kind === 'participation' ? '참여 초안' : '제안 검토 초안'}</h2>
        <textarea aria-label={`공개·참여 보관본 ${index + 1}`} readOnly rows={5} value={JSON.stringify(entry.value, null, 2)} />
        <button disabled={unavailable || pending || external || !!snapshot?.draft} onClick={() => void restoreSocial(index)}>비공개 초안으로 복구</button></section>)}
      <button onClick={() => { if (socialRecovery.current?.clear().ok) { parkedSocial.current = []; activeSocial.current = []; setSocialRecoveries(null); } else setStorageError(true); }}>보관 공개·참여 입력 버리기</button>
    </details>}
  </>;
  async function chooseMainTab(tab: ProgramMainTab) {
    // Save wait P3: while another move waits, this tab takes it over (it comes back to the space first).
    if (destination.view !== 'space' || moveFlight.current) await navigate({ view: 'space' });
    await mainTabs.current?.choose(tab);
  }
  // UX B3 (11/7): the Flow and 나 tabs move by navigate() alone, which keeps input, locks the editors, saves them all and
  // checks the session before it moves (nothing of that is done again here). Pressed again on its own screen, Flow goes
  // to the 찾기 list and 나 to the top. A refused move (a save or held input pending) changes no tab; 나 then opens the
  // 복구함 sheet too, where the held input is. Core3 P2 (11/8): the Flow tab's first screen is always 찾기; 이야기 is the
  // second screen, opened by its button on the 찾기 head.
  async function chooseFlowTab() {
    const here = ['discover', 'flow', 'community'].includes(destinationRef.current.view);
    await navigate({ view: 'discover' });
    if (here) window.scrollTo({ top: 0 });
  }
  async function chooseMeTab(opener: HTMLElement) {
    const here = destinationRef.current.view === 'activity';
    // QA P2 (11/7): refused inside navigate() too (a save it could not finish, as in a late tab's conflict, or one past
    // its limit), 나 opens the 복구함. Not when the person stayed or another move took over.
    const moved = await navigate({ view: 'activity' });
    if (moved === 'refused' || moved === 'not-saved' || moved === 'late') openRecoveryBox(opener); else if (moved === 'moved' && here) window.scrollTo({ top: 0 });
  }
  /** N9: from an empty 복구함 to the archived documents people often look for there. The sheet closes first. */
  async function openArchiveFromMenu() {
    setRecoveryOpen(false);
    if (destination.view !== 'space') await navigate({ view: 'space' });
    await mainTabs.current?.openArchive();
  }
  /** UX B3: 복구함 opens over any screen, while saving or in a conflict too. It is not a move: input is kept
   *  (captureInput), nothing is locked or saved, and closing it returns focus to what opened it. */
  function openRecoveryBox(opener?: HTMLElement | null) {
    captureInput();
    recoveryOpener.current = opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setRecoveryOpen(true);
  }
  useEffect(() => {
    const sheet = recoveryDialog.current;
    if (!sheet) return;
    if (recoveryOpen && !sheet.open) sheet.showModal();
    else if (!recoveryOpen && sheet.open) {
      sheet.close();
      const opener = recoveryOpener.current;
      recoveryOpener.current = null;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    }
  }, [recoveryOpen]);
  // N9: the documents the 쓰기 list's 보관함 shows (not in 휴지통, not a retained revision).
  const archiveSpace = data?.spaces[session.userId], archivedCount = archiveSpace ? archiveSpace.archivedDocumentIds.filter(id => !archiveSpace.documentTrash?.[id]
    && !Object.values(archiveSpace.retentionDocuments ?? {}).includes(id) && archiveSpace.text.documents.some(doc => doc.id === id)).length : 0;
  const usesNoteChrome = destination.view === 'space' && !unavailable;
  // R7: once the server names the contact address, every place that shows the development notice ends with 자세히,
  // and 나 › 계정 has 저장과 공개 안내. Without the address none of them shows.
  const privacyAddress = readPrivacyContact(privacyContact);
  const privacyMore = privacyAddress && <> <button type="button" className={styles.privacyMore} aria-label="저장과 공개 안내 자세히" onClick={() => setPrivacyOpen(true)}>자세히</button></>;
  // Once acknowledged, keep an element: ProgramSpace reads a truthy noteHeader as the note layout.
  const publicNotice = devNoticeSeen ? <span hidden data-dev-notice="acknowledged" /> : <div className={styles.devNotice}>
    <details className={styles.notice} aria-label="저장과 공개 안내"><summary>공개한 Flow와 글만 다른 사용자에게 보입니다.</summary>
      <p>{DEV_NOTICE_TEXT}{privacyMore}</p></details>
    <button type="button" onClick={() => { if (markDevNoticeSeen(devNoticeStorage(), session.userId)) setDevNoticeSeen(true); }}>확인</button></div>;
  // Core3 P1 (X5): no 복구함 band over the screens. The bottom toast says a new entry once; the open document's own
  // entries get one small line under its title (W11's slot, before the development notice).
  // P1 fix (11/8): the document the space shows, also when the app opened on the last one (no id in the address).
  const openDocumentId = recoveryLineDocumentId(destination, shownDocumentId);
  const documentRecoveries = openDocumentId ? announcedDrafts.filter(entry => entry.documentId === openDocumentId).length
    + announcedStructural.filter(entry => entry.documentId === openDocumentId).length : 0;
  const documentRecovery = documentRecoveries > 0 && <p className={styles.documentRecovery} data-document-recovery>
    <button type="button" onClick={event => openRecoveryBox(event.currentTarget)}>이 문서에 복구할 입력 {documentRecoveries}개 ›</button></p>;
  const recoveryToastContent = recoveryToast && <div className={styles.recoveryToast} role="status" data-recovery-toast
    onPointerEnter={() => { recoveryToastHeld.current = true; }} onPointerLeave={() => { recoveryToastHeld.current = false; setRecoveryToast(current => current && { ...current, at: Date.now() }); }}
    onFocus={() => { recoveryToastHeld.current = true; }} onBlur={event => { if (event.currentTarget.contains(event.relatedTarget as Node | null)) return; recoveryToastHeld.current = false; setRecoveryToast(current => current && { ...current, at: Date.now() }); }}>
    <p>{programRecoveryToastText(recoveryToast.count)}</p>
    <div><button type="button" onClick={() => setRecoveryToast(null)}>닫기</button>
      <button type="button" onClick={() => { recoveryToastHeld.current = false; setRecoveryToast(null);
        // The toast goes as the sheet opens: closing the sheet brings the focus to 나 (where the badge is), not to nothing.
        openRecoveryBox(meTab.current); }}>복구함 열기</button></div>
  </div>;
  // W11: on the 쓰기 tab the notices around the title share one line, by priority: this document's saved input, then
  // the development notice, then the new-document notice (ProgramSpace keeps that one for screen readers only).
  const writingTab = usesNoteChrome && mainTab === 'documents';
  const noteNotice = writingTab ? documentRecovery || publicNotice : publicNotice;
  const noteNoticeShown = writingTab && (!!documentRecovery || !devNoticeSeen);
  const browseHistory = (kind: 'undo' | 'redo') => !browse || programBrowseHistoryAllowed(historyOrigin.current, kind, snapshot?.account?.revision);
  const serverUndo = <button type="button" title="마지막으로 서버 저장에 성공한 변경을 되돌립니다" onClick={() => void history('undo')} disabled={!snapshot?.canUndo || external} aria-disabled={browseHistory('undo') ? undefined : true}>되돌리기</button>;
  // The recovery box with its actions. `announce` is off inside the note editor, whose one status
  // slot does the announcing; elsewhere (today, 분류, no document) it keeps its own alert.
  const inputRecoveryLabel = storageError ? '입력 보관 실패 · 확인' : pendingUnknown ? '저장 여부 확인 못 함'
    : snapshot?.retryableRejectedDraft || snapshot?.retryableNativeHandoff || snapshot?.retryableRejectedSocialDraft ? '저장되지 않음 · 확인' : '입력 보호 · 확인';
  const inputRecoveryBox = (announce: boolean) => destination.view === 'space' && needsInputProtection && <details name="program-input-feedback" className={styles.inputRecovery} onKeyDown={event => {
          if (event.key !== 'Escape' || event.nativeEvent.isComposing || !event.currentTarget.open) return;
          event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false;
          event.currentTarget.querySelector('summary')?.focus({ preventScroll: true });
        }}><summary>{announce ? <span role="alert">{inputRecoveryLabel}</span> : <span>{inputRecoveryLabel}</span>}</summary>
          <div className={styles.inputRecoveryBody}>{inputProtectionFor(announce)}</div>
        </details>;
  const serverSlot = programServerStatus({ snapshot, storageError, external, participationRecovery: !!localParticipationRecovery });
  // N9 (U46): a new account with no writing and no save yet has nothing 저장됨 could mean, so the line waits for the
  // first document. A wait or a warning still shows.
  const freshSpace = data?.spaces[session.userId], quietFresh = usesNoteChrome && serverSlot.level === 8 && snapshot?.account?.revision === 0
    && !!freshSpace && !freshSpace.text.documents.length && !freshSpace.text.flows.length;
  // The status and its recovery box, and the notices that always show (today, 분류, no document).
  const serverStatusMain = <>
        {!localParticipationRecovery && !quietFresh && <p role={reviewOwnsAnnouncement ? undefined : 'status'} aria-live={reviewOwnsAnnouncement ? 'off' : 'polite'} data-save-state={snapshot?.status}
          data-quiet={!pendingUnknown && !pending && !snapshot?.retryableRejectedDraft && !snapshot?.retryableNativeHandoff && !snapshot?.retryableRejectedSocialDraft && ['ready', 'saved', 'same-location'].includes(snapshot?.status ?? '') || undefined}>{pendingUnknown ? '저장 여부 확인 못 함' : pending ? '저장 중…' : snapshot?.retryableRejectedDraft || snapshot?.retryableNativeHandoff || snapshot?.retryableRejectedSocialDraft ? '저장 거절 · 입력 보존됨' : snapshot ? labels[snapshot.status] : '개인공간을 여는 중…'}</p>}
        {inputRecoveryBox(true)}
      </>;
  const serverStatusExtras = <>
        {destination.view === 'space' && message && !participationMessage && <details name="program-input-feedback" className={styles.feedbackMessage}
          onKeyDown={event => { if (event.key !== 'Escape' || event.nativeEvent.isComposing || !event.currentTarget.open) return; event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus({ preventScroll: true }); }}>
          <summary title={message}><span role="status">안내 · {message}</span></summary>
          <div className={styles.inputRecoveryBody}><p className={styles.feedbackMessageText}>{message}</p></div>
        </details>}
      </>;
  const serverStatus = <div className={styles.statusRow}>
        {serverStatusMain}{serverStatusExtras}
        {!usesNoteChrome && serverUndo}
      </div>;
  // UX FC-DETAIL-HEAD 1 (R6): 둘러보기 draws its status row only for a warning or a wait (levels 1–5). Saved and
  // saving stay off, so the list does not jump; 되돌리기 is on 나 › 문제 해결 (UX B3).
  const browseStatusShown = serverSlot.level <= 5;
  // UX B7 (11/6): 내 활동 starts with its title too: its status row also warns only (되돌리기 is on 나 › 문제 해결).
  const quietStatus = browse || destination.view === 'activity';
  const activityTabs = <nav className={styles.tabs} aria-label="내 활동 종류"><button aria-current={destination.view === 'activity' ? 'page' : undefined} onClick={() => void navigate({ view: 'activity' })}>활동·공개 관리</button><button aria-current={destination.view === 'creator' ? 'page' : undefined} onClick={openCreatorEntry}>Flow 만들기</button></nav>;
  // UX B3 (11/7): the 더보기 items, each drawn in one place at a time: on 나 when the account opens, in the menu when
  // it cannot (unavailable). Their actions are the ones the menu had, unchanged.
  const redoButton = <button type="button" onClick={() => void history('redo')} disabled={!snapshot?.canRedo || external} aria-disabled={browseHistory('redo') ? undefined : true}>다시 실행</button>;
  const recoveryButton = <button type="button" onClick={event => openRecoveryBox(event.currentTarget)}>복구함{storedTotal ? ` (${storedTotal})` : ''}</button>;
  const backupButton = <button type="button" disabled={unavailable || pending || external || !!snapshot?.busy || !!snapshot?.draft || storageError} onClick={event => {
    if (disposed.current || currentOwnerRef.current !== session.userId) return;
    const opener = event.currentTarget;
    preservationOpener.current = opener; preservationReturn.current = null;
    void (async () => { const openingController = controller.current; if (!captureInput()) return; for (const port of allEditors()) if (port && !await port.flushAll()) return; if (disposed.current || controller.current !== openingController || currentOwnerRef.current !== session.userId) return; preservationRef.current = true; setPreservation(true); })();
  }}>백업 · 복원 · 가져오기</button>;
  // UX B1 (11/6): the sign-in screen no longer links the old local PoC; its way stays here, after signing in.
  const oldLocalLink = <a className={styles.menuLink} href="/my?personalWorkspacePoc=v1">이 기기에만 저장한 예전 자료</a>;
  const signOutButton = <button type="button" disabled={leaveBusy} onClick={() => { captureInput(); if (hasInput() || pending || deviceInput().count) { setLeaveFailed(false); setLeave(true); } else void signOut(); }}>로그아웃 · 계정 바꾸기</button>;
  const refreshButton = <button type="button" onClick={() => void controller.current?.refresh()} disabled={snapshot?.busy}>서버에서 다시 확인</button>;
  const recordNumber = snapshot?.account && <details className={styles.menuNote}><summary>기록 정보</summary><small className={styles.account}>서버 기록 번호 {snapshot.account.revision}</small></details>;
  // 나's head (on top of 내 활동): the account, 개인 Flow 상세 when there is one, then 활동·공개 관리 / Flow 만들기.
  const meHead = <div className={styles.meHead}><p className={styles.meEmail}>{email}</p>
    {data && data.spaces[session.userId].savedBindings.length > 0 && <div className={styles.managementActions}><button type="button" aria-current={destination.view === 'legacy' ? 'page' : undefined} onClick={() => void navigate({ view: 'legacy' })}>개인 Flow 상세 ›</button></div>}
    {activityTabs}</div>;
  // 나 under 내 활동: 자료, 계정, then 문제 해결 and 실험 folded.
  const meSections = <div className={styles.meSections}>
    <section className={styles.menuGroup} aria-label="자료"><h3>자료</h3>
      <div className={styles.managementActions}>{recoveryButton}{backupButton}{oldLocalLink}</div>
    </section>
    <section className={styles.menuGroup} aria-label="계정"><h3>계정</h3>
      <div className={styles.managementActions}>{privacyAddress && <button type="button" onClick={() => setPrivacyOpen(true)}>저장과 공개 안내</button>}{signOutButton}</div>
      {!privacyAddress && <details className={styles.menuNote}><summary>저장과 공개 안내</summary><p>{DEV_NOTICE_TEXT}</p></details>}
    </section>
    <details className={`${styles.menuGroup} ${styles.meFold}`} aria-label="문제 해결"><summary>문제 해결</summary>
      <div className={styles.managementActions}>{refreshButton}<button type="button" title="마지막으로 서버 저장에 성공한 변경을 되돌립니다" onClick={() => void history('undo')} disabled={!snapshot?.canUndo || external} aria-disabled={browseHistory('undo') ? undefined : true}>마지막 변경 되돌리기</button>{redoButton}</div>
      {historyHint && <p className={styles.menuHint} role="status">{historyHint === 'undo' ? '쓰기 화면에서 되돌릴 수 있어요.' : '쓰기 화면에서 다시 실행할 수 있어요.'}</p>}
      {recordNumber}
    </details>
    {/* 문서·모음 시험 re-keys the 쓰기 space and says what it did there (its notice, a refusal), so it opens on 쓰기. */}
    {data && <details className={`${styles.menuGroup} ${styles.meFold}`} aria-label="실험"><summary>실험</summary>
      <div className={styles.managementActions}><button type="button" aria-pressed={collectionsMode} disabled={collectionsSwitching || collectionsSaving || pending || external || !!snapshot?.busy || !!snapshot?.draft || storageError}
        onClick={() => void (async () => { if (destinationRef.current.view !== 'space') await navigate({ view: 'space' }); if (destinationRef.current.view === 'space') await switchCollectionsMode(); })()}>{collectionsMode ? '기존 폴더로 보기' : '문서·모음 시험'}</button></div>
      <p className={styles.menuHint}>쓰기 화면에서 열립니다.</p>
    </details>}
  </div>;
  const serverStatusView: ProgramServerStatusView | null = usesNoteChrome ? {
    ...serverSlot,
    recovery: destination.view === 'space' && needsInputProtection ? <div className={styles.statusSlot}>{inputRecoveryBox(false)}</div> : null,
    recoveryBody: destination.view === 'space' && needsInputProtection ? <div className={styles.inputRecoveryGroup}>{inputProtectionFor(false)}</div> : null,
    extras: destination.view === 'space' && message && !participationMessage
      ? <div className={styles.statusRow}>{serverStatusExtras}</div> : null,
  } : null;
  return <main ref={chromeRoot} className={styles.page} data-alpha-frame="b" data-writing-keyboard={writingWithKeyboard ? 'true' : undefined} data-synthetic-runtime={syntheticRuntime ? 'fixture-only' : undefined} data-note-layout={usesNoteChrome} data-browse-layout={browse ? destination.view === 'flow' ? 'detail' : 'list' : undefined} onInput={() => { queueMicrotask(captureInput); }} onCompositionEnd={() => { queueMicrotask(captureInput); }}>
    <header className={styles.header}><a className={styles.brand} href="/alpha" onClick={event => { event.preventDefault(); void navigate({ view: 'space' }); }}>FlowMe</a>
      {!unavailable && <nav className={styles.globalNavigation} aria-label="주요 메뉴">
        {([['documents', '쓰기', 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4'], ['today', '오늘', 'M4 4h16v16H4zm4 8 3 3 5-6'], ['all', '분류', 'M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z']] as const).map(([tab, label, path]) =>
          <button type="button" key={tab} data-main-tab={tab} aria-current={destination.view === 'space' && mainTab === tab ? 'page' : undefined} onClick={() => void chooseMainTab(tab)}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" d={path}/></svg><span>{label}</span></button>)}
        {/* UX B3 (11/7): Flow and 나 are screens like the three before them (no pointerdown hold): a press moves by
            navigate(), which ends a composition through blur and keeps its result as 쓰기 → 오늘 does. */}
        <button type="button" data-main-tab="flow" aria-current={browse ? 'page' : undefined} onClick={() => void chooseFlowTab()}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm3.5 5.5-2 5-5 2 2-5z"/></svg><span>Flow</span></button>
        <button type="button" ref={meTab} data-main-tab="me" aria-current={['activity', 'legacy', 'creator'].includes(destination.view) ? 'page' : undefined}
          aria-label={`나${savedTotal ? ` · 확인이 필요한 입력 ${savedTotal}개` : ''}`} onClick={event => void chooseMeTab(event.currentTarget)}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8a7 7 0 0 1 14 0"/></svg><span>나</span>
          {savedTotal > 0 && <span className={styles.navBadge} aria-hidden="true">{savedTotal}</span>}</button>
      </nav>}
      <h1 className={styles.destinationTitle}>{destination.view === 'creator' ? '제작 공간' : destination.view === 'activity' ? '나' : destination.view === 'legacy' ? '개인 Flow 상세' : destination.view === 'community' ? '이야기' : browse ? 'Flow' : '내 작업'}</h1></header>
    {/* Core3 P2 (X7): no 이야기 | Flow 찾기 sub-tabs. 찾기 draws its own head ("Flow", [이야기], ⋯); 이야기 gets a way back. */}
    {destination.view === 'community' && <nav className={styles.browseNavigation} aria-label="이야기 위치"><button type="button" data-stories-back aria-label="Flow 찾기로 돌아가기" onClick={() => void navigate({ view: 'discover' })}>‹ Flow</button></nav>}
    <div className={styles.workPane} data-testid="alpha-work-pane">
    {!usesNoteChrome && publicNotice}
    <section className={styles.sync} aria-label="서버 저장 상태">
      {!usesNoteChrome && (!quietStatus || browseStatusShown) && serverStatus}
      {/* UX B3 (11/7): with the tabs (an account that opens) its items live on 나 and in the 복구함 sheet. Without them
          (unavailable: the account cannot open) this menu stays, as it was, for 복구함, 로그아웃 and 서버에서 다시 확인. */}
      {unavailable && <details ref={managementMenu} className={styles.management} aria-label="계정 및 자료 관리" onKeyDown={event => {
        if (event.key !== 'Escape' || event.nativeEvent.isComposing || !event.currentTarget.open) return;
        event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false;
        event.currentTarget.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true });
      }} onBlur={event => {
        if (!preservationRef.current && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) event.currentTarget.open = false;
      }}><summary aria-label={`보조 메뉴 · 계정·자료 관리${savedTotal ? ` · 확인이 필요한 입력 ${savedTotal}개` : ''}`}><span className={styles.auxiliaryLabel}>더보기</span>{savedTotal > 0 && <span className={styles.menuBadge} aria-hidden="true">{savedTotal}</span>}</summary><div className={styles.managementBody}>
        <h2>더보기</h2>
        <section className={styles.menuGroup} aria-label="편집"><h3>편집</h3>
          <div className={styles.managementActions}>{serverUndo}{redoButton}</div>
        </section>
        <section className={styles.menuGroup} aria-label="자료"><h3>자료</h3>
          <div className={styles.managementActions}>{recoveryButton}{backupButton}{oldLocalLink}</div>
        </section>
        <section className={styles.menuGroup} aria-label="계정"><h3>계정</h3>
          <div className={styles.account}><p>{email}</p></div>
          <div className={styles.managementActions}>{signOutButton}{privacyAddress && <button type="button" onClick={() => setPrivacyOpen(true)}>저장과 공개 안내</button>}</div>
        </section>
        <section className={styles.menuGroup} aria-label="문제 해결"><h3>문제 해결</h3>
          <div className={styles.managementActions}>{refreshButton}</div>
          {recordNumber}
        </section>
        <section className={styles.menuGroup} aria-label="저장과 공개 안내"><h3>저장과 공개 안내</h3>
          <p className={styles.menuNoteText}>{DEV_NOTICE_TEXT}{privacyMore}</p>
        </section>
        </div></details>}
    </section>
    {preservation && snapshot?.account && snapshot.references && <AlphaPreservationPanel key={session.userId} account={snapshot.account} references={snapshot.references}
      email={email} accessToken={session.accessToken} returnFocusTarget={preservationOpener.current} onClose={closePreservation} onSaved={async () => {
        ownMutation.current++; try { await controller.current?.refresh(); if (!replaceEditors()) setMessage(keptEditorsNotice('서버 자료는 반영했습니다.')); } finally { ownMutation.current--; }
      }} />}
    {destination.view !== 'space' && inputProtectionFor(true)}
    {leave && (() => {
      // P3c (11/6): what stays on this device is said with its count; 남기고 comes first and takes the focus.
      const left = leaveBusy ? null : deviceInput(), count = left?.count ?? 0, elsewhere = Math.min(left?.elsewhere ?? 0, count);
      return <section className={styles.problem} aria-label="로그아웃 전 입력 확인" data-logout-left={count} data-logout-elsewhere={elsewhere}>
        <p>{count ? `저장 안 된 입력 ${count}개가 이 기기의 복구함에 남아 있습니다. 남기면 같은 계정으로 다시 로그인할 때 복구함에서 찾을 수 있습니다. 지우면 되돌릴 수 없고, 서버에 저장한 자료는 그대로입니다.${elsewhere ? ` 이 가운데 ${elsewhere}개는 다른 탭에도 있어서 지워도 그 탭에는 남고, 다음 로그인 때 복구함에 다시 보일 수 있습니다.` : ''}`
          : leaveBusy ? '이 기기의 보관본을 지우는 중입니다.' : '저장하지 않은 입력을 이 탭에 보관한 뒤 로그아웃할 수 있습니다. 같은 계정으로 돌아와 복구하세요.'}</p>
        {leaveFailed && <p role="alert">이 기기의 보관본을 다 지우지 못했습니다. 남은 것은 다음 로그인 때 복구함에 보입니다. 다시 지우거나 남기고 로그아웃할 수 있습니다.</p>}
        <button type="button" ref={leaveKeep} disabled={leaveBusy} onClick={() => { if (captureInput() && canReleaseInput()) void signOut(); }}>{count ? '남기고 로그아웃' : '입력 보관 후 로그아웃'}</button>
        {count > 0 && !pending && <button type="button" disabled={leaveBusy} onClick={() => void eraseAndSignOut()}>지우고 로그아웃</button>}
        <button type="button" disabled={leaveBusy} onClick={() => setLeave(false)}>계속 작성</button></section>;
    })()}
    {privacyOpen && privacyAddress && <AlphaPrivacyNotice contact={privacyAddress} onClose={() => setPrivacyOpen(false)} returnFocus={() => document.querySelector<HTMLElement>('[data-main-tab="me"]')} />}
    {/* UX B3 (11/7): 복구함 as a sheet over any screen (a modal dialog: Escape closes it, focus goes back to its opener).
        Its content is the 복구함's as it was, drawn here only. */}
    <dialog ref={recoveryDialog} className={styles.recoverySheet} aria-labelledby="alpha-recovery-heading" onCancel={event => { event.preventDefault(); setRecoveryOpen(false); }}>
      <div className={styles.recoverySheetHead}><h2 id="alpha-recovery-heading">복구함{storedTotal ? ` (${storedTotal})` : ''}</h2><button type="button" onClick={() => setRecoveryOpen(false)}>닫기</button></div>
      <div className={styles.recoverySheetBody}>{storedTotal ? <>{savedInputPanel}{structuralRecoveryPanel}{creatorRecoveryPanel}{socialRecoveryPanel}</> : <><p>보관한 입력이 없습니다.</p>
        {archivedCount > 0 && <button type="button" onClick={() => void openArchiveFromMenu()}>보관한 문서 {archivedCount}개 → 보관함에서 보기</button>}</>}</div>
    </dialog>
    {moveWait && <section className={styles.moveNotice} aria-label="이동 전 저장" data-move-wait={moveWait.phase}>
      <p role="status">{moveWait.phase === 'saving' ? '저장 중… 저장을 마치면 이동합니다.'
        : moveWait.phase === 'late' ? '저장이 늦어지고 있어요. 이동하지 않았습니다. 내용은 이 기기에 남아 있고, 저장은 계속합니다.'
        : moveWait.phase === 'late-saved' ? '늦어지던 저장을 마쳤습니다. 이제 이동할 수 있습니다.'
        : '저장하지 못한 입력이 있어 이동하지 않았습니다. 내용은 이 기기에 남아 있습니다. 편집기의 안내를 확인해 주세요.'}</p>
      <div>{moveWait.phase === 'saving' ? <button type="button" onClick={() => closeMoveNotice(true)}>머무르기</button> : <>
        <button type="button" onClick={event => openRecoveryBox(event.currentTarget)}>복구함 열기</button>
        <button type="button" onClick={() => closeMoveNotice(false)}>닫기</button></>}</div>
    </section>}
    {destination.view !== 'space' && message && !participationMessage && <p className={styles.message} role="status">{message}</p>}
    {unavailable ? <section className={styles.empty}><p>{snapshot?.status === 'session-expired' ? '계정을 다시 확인한 뒤 개인공간을 열 수 있습니다.' : '서버에서 개인공간을 확인하고 있습니다.'}</p></section> : <>
      {destination.view === 'creator' && activityTabs}
      <div hidden={destination.view !== 'space'}>
        {collectionsMode && <p className={styles.notice}>모음 연결은 이 브라우저에만 저장됩니다. 문서·할 일은 기존 서버에 저장되며, 기존 폴더는 바뀌지 않습니다.</p>}
        {collectionsMessage && <p className={styles.message} role="status">{collectionsMessage}</p>}
        <ProgramServerStatusContext.Provider value={serverStatusView}>
        <ProgramSpace key={`space:${session.userId}:${presentation}:${collectionsMode ? 'collections' : 'folders'}`} data={data} today={programLocalDate()} mutate={mutate}
        hostMainTabs onRegisterMainTabs={port => { mainTabs.current = port; }} onMainTabChange={setMainTab} onOpenDocumentChange={setShownDocumentId}
        nativeAuthoringEnabled={nativeAuthoringEnabled} writingCompute={writingCompute.current??undefined} writingContext={() => ({ownerId:session.userId,baseRevision:currentRevision.current??0})}
        pmTextHost={syntheticRuntime||pmWriting==='v11-pm/1' ? { ownerId: session.userId, epoch: sessionEpoch, snapshot: () => sessionEpochRef.current === sessionEpoch && !disposed.current && currentOwnerRef.current === session.userId ? controller.current?.snapshot() ?? null : null } : undefined}
        noteHeader={usesNoteChrome ? noteNotice : undefined} noteNoticeShown={noteNoticeShown} noteStatus={usesNoteChrome ? serverStatus : undefined}
        documentCollections={collectionsMode && collectionsState ? { state: collectionsState, onChange: changeCollections } : undefined}
        navigate={next => { void navigate(next); }} capabilities={capability}
        sourceReturnEpoch={sessionEpoch} awaitSourceReturnReady={awaitSourceReturnReady}
        sourceReturnWaits={() => !!sourceReturnWaiting()} onSourceReturnQueued={showSourceReturnQueued} onSelectingChange={value => { programSelecting.current = value; }} hostBusy={() => !!controller.current?.snapshot().busy}
        canContinueWholeDocument={() => {
          const authority = controller.current?.snapshot();
          return !disposed.current && !externalRef.current && !!authority && !authority.pending && !authority.busy && authority.status !== 'conflict';
        }}
        selectedDocumentId={destination.view === 'space' ? destination.id : undefined} onUndo={() => history('undo')} onRedo={() => history('redo')}
        onOutputDocument={setOutput} onPublishDocument={setPublisher} onInspectCopy={setInspector} onRegisterEditors={port => { editors.current = port; }} onInputFailureChange={setEditorInputFailed} onKeepRefusedInput={keepRefusedInput}
        onOpenCopySource={(flowId, id, focus) => { void openFlowsFromDocument(id, flowId, focus); }} onBrowseFlows={(id, focus, writing) => { void openFlowsFromDocument(id, undefined, focus, writing); }}
        importNotice={importUndo ? { actorId: importUndo.batch.actorId, documentId: importUndo.batch.documentId, lineId: [...importUndo.batch.ordinary, ...importUndo.batch.recurring, ...(importUndo.batch.repeat ?? [])][0]?.lineId, text: importUndo.text, busy: importUndoBusy, onCancel: importUndo.done ? undefined : () => { void cancelImportLinks(); } }
          : importArrival ? { actorId: importArrival.actorId, documentId: importArrival.documentId, text: importArrival.text, busy: importArrivalBusy, actionLabel: '되돌리기', busyLabel: '되돌리는 중…',
            ...(importArrival.calendar ? { calendar: importArrival.calendar } : {}),
            onCancel: importArrival.revision !== null && snapshot?.account?.revision === importArrival.revision && !!snapshot?.canUndo && !external ? () => { void undoImportArrival(); } : undefined } : undefined}
        onStartReview={startReview} onRegisterReviewSpace={port => { reviewSpace.current = port; }} /></ProgramServerStatusContext.Provider>
        {/* Over the top of the space, apart from the check notices and the tabs below; pressing it leaves the caret where it is. */}
        {tried?.epoch === sessionEpoch && tried.queue.shown && <div key={tried.queue.shown.flowId} className={styles.triedPrompt} role="status" data-tried-prompt={tried.queue.shown.flowId}>
          <p>{PROGRAM_TRIED_ASK}</p>
          <div><button type="button" onPointerDown={event => event.preventDefault()} onClick={() => void startTriedReview()}>남기기</button>
            <button type="button" onPointerDown={event => event.preventDefault()} onClick={() => setTried(current => current && { ...current, queue: programTriedDone(current.queue, true) })}>괜찮아요</button></div>
        </div>}</div>
      {seen.discovery && <div hidden={!['discover', 'flow'].includes(destination.view)}><ProgramDiscovery key={`discover:${session.userId}:${presentation}`} data={data} mutate={mutate} navigate={next => { void navigate(next); }} today={programLocalDate()} storageScope="account"
        selectedFlowId={discoverySelection} selectedVersionId={destination.view === 'flow' ? destination.versionId : undefined} selectedItemId={destination.view === 'flow' ? destination.itemId : undefined}
        selectedOutputReturn={destination.view === 'flow' ? destination.publicOutputReturn : undefined} actorId={session.userId} pendingDocumentIds={pendingImportDocuments} copySourceReturn={flowReturn?.kind === 'copy'} onReturnToSpace={flowReturn?.actorId === session.userId ? () => { void returnFromFlows(); } : undefined} onUseVersion={useVersion} onStartText={startText} onCreateFlow={openCreatorEntry} onKeepLink={keepLink} onCreateFromLink={createFromLink} onOpenStories={() => void navigate({ view: 'community' })} navigationState={discoveryState} onNavigationStateChange={setDiscoveryState} /></div>}
      {seen.community && <div hidden={!['community', 'activity'].includes(destination.view)}><ProgramCommunity key={`community:${session.userId}:${presentation}`} data={data} mutate={mutate} navigate={next => { void navigate(next); }} today={programLocalDate()}
        view={communityView} selectedPostId={communitySelection} selectedReplyId={destination.view === 'community' ? destination.replyId : undefined} presentation={communityState} onPresentationChange={setCommunityState}
        storageScope="account" mediaPort={mediaPort} draftSaveRecovery={localParticipationRecovery}
        reviewEntry={reviewEntry} captureReviewVisit={captureReviewVisit} activityTabs={meHead}
        onRegisterReviewResult={receive => { reviewResultReceiver.current = receive; }}
        reviewAnnouncement={{
          captureState: () => {
            const generation = reviewAnnouncementGeneration.current;
            return () => generation === reviewAnnouncementGeneration.current;
          },
          onChange: isCurrent => setReviewAnnouncement({ isCurrent }),
        }}
        onReviewPublished={(draftId,postId) => {
          const context=reviewContext.current;
          if (context?.draftId===draftId && reviewReady(context.epoch) && currentData.current?.public.posts.some(post=>post.id===postId&&!post.deleted)) {
            context.postId=postId; refreshReviewContext(value=>value+1);
          }
        }}
        reviewReturnPostId={reviewContext.current?.epoch===sessionEpoch ? reviewContext.current?.postId : undefined} onReturnReview={returnFromReview}
        resolveDraftSaveRecovery={(failedDraft, expected) => readParticipationRecovery(failedDraft, expected)}
        resolveDraftSaveError={(next, expected, reason) => {
          const authority = controller.current?.snapshot();
          if (reason !== 'recovery-required' || disposed.current || storageError || externalRef.current
            || !authority?.retryableRejectedSocialDraft || authority.pending || authority.busy || authority.ownerId !== session.userId) return;
          const command = authority.draft;
          if (command?.kind !== 'social' || command.intent.type !== 'participation-save') return;
          try {
            // Notice only: the live client still owns retry permission and CAS.
            // Match this failed save, not merely another draft with the same id.
            if (canonicalJson(command.intent.draft) !== canonicalJson(next)
              || canonicalJson(command.intent.expected) !== canonicalJson(expected)) return;
          } catch { return; }
          return '초안을 저장하지 못했습니다. 입력은 남아 있습니다.';
        }}
        onRegisterEditors={port => { communityEditors.current = port; }} /></div>}
      {destination.view === 'activity' && meSections}
      {destination.view === 'legacy' && <ProgramLegacyWorkspace key={`legacy:${session.userId}:${presentation}`} data={data} today={programLocalDate()} mutate={mutate}
        navigate={next => { void navigate(next); }} capabilities={{ sourceReview: false }}
        selectedFlowId={destination.id} onUndo={() => history('undo')} onRegisterEditors={port => { legacyEditors.current = port; }} />}
      {output && <ProgramPrivateOutput data={data} documentId={output} onClose={() => setOutput(null)} />}
      {(creatorSeen || destination.view === 'creator') && <div hidden={destination.view !== 'creator'}>
        <div hidden={creatorEntryChoices}><AlphaCatalogPanels key={`catalog-panels:${session.userId}`} data={data} accessToken={session.accessToken} mutate={mutate} navigate={next => { void navigate(next); }} onDetailChange={setCatalogDetailOpen} detailOpen={catalogDetailOpen} disabled={unavailable || pending || external || !!snapshot?.busy || !!snapshot?.draft || storageError} /></div>
        <div hidden={catalogDetailOpen} aria-label="별도 제작 초안 작업 공간">
        <ProgramCreatorWorkspace key={`creator:${session.userId}:${presentation}`}
        data={data} mutate={mutate} navigate={next => { void navigate(next); }} today={programLocalDate()} storageScope="account"
        active={destination.view === 'creator' && !catalogDetailOpen} selectedDraftId={destination.view === 'creator' ? destination.id : creatorSelection}
        entryChoiceRequested={creatorEntryChoices} onEntryChoiceResolved={() => setCreatorEntryChoices(false)}
        onEntryChoiceCancelled={() => void navigate(creatorEntryReturn.current ?? { view: 'space' })}
        captureRoute={captureCreatorRoute} onRegisterEditors={port => { creatorEditors.current = port; }} /></div></div>}
      {publisher && <ProgramPublisher key={`publish:${session.userId}:${publisher}`} data={data} mutate={mutate} navigate={next => { void navigate(next); }} today={programLocalDate()} documentId={publisher}
        storageScope="account" readCurrentData={() => currentData.current} externalRecovery={modalRecovery} onClose={() => setPublisher(null)} onRegisterEditors={port => { publisherEditors.current = port; }} />}
      {inspector && <dialog className={styles.inspector} ref={inspectorDialog} onCancel={event => { event.preventDefault(); if (!inspectorEditors.current?.hasPendingInput?.()) setInspector(null); }}>
        {modalRecovery}<ProgramCopyInspector key={`copy:${session.userId}:${inspector}`} data={data} mutate={mutate} navigate={next => { setInspector(null); void navigate(next); }} today={programLocalDate()} copyId={inspector}
          onClose={() => setInspector(null)} onRegisterEditors={port => { inspectorEditors.current = port; }} /></dialog>}
    </>}
    </div>
    {recoveryToastContent}
  </main>;
}
