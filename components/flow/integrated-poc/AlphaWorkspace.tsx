'use client';
import {claimOwnedWritingAck,privateTextChangeIsolatedToDocument,noteWritingPhase} from '@/lib/flow/integrated-poc/writing-ack';
import { remoteTextSparesDocuments } from '@/lib/flow/integrated-poc/remote-text-baseline';

import {createWritingCompute,type WritingCompute} from '@/lib/flow/integrated-poc/writing-compute';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { restoreProgramDialogFocus } from '@/lib/flow/integrated-poc/dialog-return-focus';
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
import { createAlphaStructuralRecovery, resolveAlphaStructuralRecovery, type AlphaStructuralEditorPort, type AlphaStructuralRecoveryEntry, type AlphaStructuralRecoveryRecord } from '@/lib/flow/integrated-poc/alpha-structural-recovery';
import { type ProgramData, type ProgramParticipationDraft, type ProgramPublicationDraft, programId } from '@/lib/flow/integrated-poc/contract';
import type { ProgramProposalReviewDraft } from '@/lib/flow/integrated-poc/review-drafts';
import { programInputBoundaryCurrent, readProgramInputBoundary, programInputCanRelease, type ProgramEditorFlush } from '@/lib/flow/integrated-poc/document-action';
import { type ProgramDestination, type ProgramMutate, programErrorMessage, PROGRAM_BUSY_NOTICE, PROGRAM_QUEUED_NOTICE, PROGRAM_SOURCE_QUEUED_NOTICE } from '@/lib/flow/integrated-poc/ui-contract';
import { automaticReadToAwait, queueTap, sourceReturnWait, unqueueTap, type QueuedTaps } from '@/lib/flow/integrated-poc/automatic-read-wait';
import { AUTOMATIC_READ_INPUT_EVENTS, automaticReadSchedule } from '@/lib/flow/integrated-poc/automatic-read-idle';
import { pendingResultUnknown } from '@/lib/flow/integrated-poc/save-status';
import { programServerStatus } from '@/lib/flow/integrated-poc/program-status';
import { ProgramServerStatusContext, type ProgramServerStatusView } from './program-status-context';
import { createProgramDocument, importProgramPublicVersion } from '@/lib/flow/integrated-poc/private-space';
import { programLocalDate } from '@/lib/flow/integrated-poc/execution';
import { textWorkspaceModel as M, type TextWorkspaceState } from '@/lib/flow/integrated-poc/text-workspace';
import { ProgramSpace, useProgramMobileWritingChrome } from './ProgramSpace';
import { programSourceNavigationReady } from '@/lib/flow/integrated-poc/pending-source-navigation';
import { DEV_NOTICE_TEXT, markDevNoticeSeen, readDevNoticeSeen } from '@/lib/flow/integrated-poc/dev-notice';
import { ProgramLegacyWorkspace } from './ProgramLegacyWorkspace';
import { ProgramPrivateOutput } from './ProgramPrivateOutput';
import { ProgramCreatorWorkspace } from './ProgramCreatorWorkspace';
import { ProgramDiscovery, createProgramDiscoveryNavigationState, programDiscoveryHasUnstoredInput } from './ProgramDiscovery';
import { ProgramCommunity, type ProgramCommunityDraftSaveRecovery } from './ProgramCommunity';
import { ProgramPublisher } from './ProgramPublisher';
import { ProgramCopyInspector } from './ProgramCopyInspector';
import { emptyProgramCommunityPresentation, parseProgramLocation, programLocation } from '@/lib/flow/integrated-poc/navigation';
import { createAlphaSocialRecovery, type AlphaSocialRecoveryRecord, type AlphaSocialRecoveryEntry } from '@/lib/flow/integrated-poc/alpha-social-recovery';
import { type AlphaSocialIntent, isAlphaSocialIntent } from '@/lib/flow/integrated-poc/alpha-social/contract';
import { executeAlphaSocialIntent } from '@/lib/flow/integrated-poc/alpha-social/dispatch';
import { createAlphaCommunityMediaPort } from '@/lib/flow/integrated-poc/alpha-social/media-client';
import { createAlphaCreatorRecovery, type AlphaCreatorRecoveryEntry, type AlphaCreatorRecoveryRecord } from '@/lib/flow/integrated-poc/alpha-creator-recovery';
import { setProgramCreatorWorking } from '@/lib/flow/integrated-poc/creator-workspace';
import { canonicalJson, detached } from '@/lib/flow/integrated-poc/alpha-persistence/json';
import { confirmedAlphaPrivateTextSave } from '@/lib/flow/integrated-poc/alpha-private-save-ack';
import { createAlphaDocumentCollections } from '@/lib/flow/integrated-poc/alpha-document-collections';
import type { DocumentCollections } from '@/lib/flow/integrated-poc/document-collections';
import { AlphaConflictReview } from './AlphaConflictReview';
import { AlphaCatalogPanels } from './AlphaCatalogPanels';
import styles from './AlphaWorkspace.module.css';

const SLOT_KEY = 'flow:poc:personal-workspace:v1:alpha-m3:tab';
const POLL_MS = 20_000;
const AlphaPreservationPanel = dynamic(() => import('./AlphaPreservationPanel').then(module => module.AlphaPreservationPanel), { ssr: false });
const capability = { discovery: true, publication: true, copyInspection: true, revisionHistory: false, creatorNavigation: true, taskClassification: true };
type Controller = ReturnType<typeof createAlphaSyncController>;
type UiRecovery = ReturnType<typeof createAlphaUiRecovery>;
// Presentation identity only. Never copy private draft text into announcement state.
function reviewAnnouncementState(snapshot: AlphaSyncSnapshot | null | undefined) {
  return JSON.stringify([snapshot?.ownerId, snapshot?.status, snapshot?.busy, snapshot?.pending?.requestId,
    snapshot?.draft?.requestId, snapshot?.lastReceipt?.requestId, snapshot?.account?.revision, snapshot?.publicRevision]);
}
const labels: Record<AlphaSyncSnapshot['status'], string> = {
  'signed-out': '로그인이 필요합니다', ready: '저장됨', saving: '저장 중…', saved: '저장됨',
  'same-location': '변경 없음', cancelled: '취소했습니다', conflict: '다른 변경이 먼저 저장되었습니다',
  'session-expired': '로그인이 만료되었습니다', 'checking-result': '저장 여부 확인 못 함', 'recovery-required': '저장 상태를 확인해 주세요',
};
function mergeRecoveryDrafts(parked: readonly AlphaUiDraft[], active: readonly AlphaUiDraft[]): AlphaUiDraft[] {
  const seen = new Set<string>();
  return [...parked, ...active].filter(draft => {
    const identity = JSON.stringify([draft.documentId ?? null, draft.title, draft.raw]);
    if (seen.has(identity)) return false;
    seen.add(identity); return true;
  }).map(draft => ({ ...draft }));
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
};
export function AlphaWorkspace({ config, session, email, onSignOut, pmWriting, nativeAuthoringEnabled }: AlphaWorkspaceProps) {
  // Do not forward unknown JS props into the test-only injection seam.
  return <AlphaWorkspaceBody key={session.userId} config={config} session={session} email={email} onSignOut={onSignOut} pmWriting={pmWriting==='v11-pm/1'?'v11-pm/1':undefined} nativeAuthoringEnabled={nativeAuthoringEnabled} />;
}
/** Opt-in native legacy writer. The default entry and synthetic PM seam remain separate. */
export function AlphaWorkspaceLegacyWriting(props:AlphaWorkspaceProps&{transport:AlphaLegacyWritingTransport}){
 if(!matchesAlphaLegacyWritingTransport(props.transport,props.config,props.session))return <p role="alert">기존 작성 연결을 확인하지 못했습니다. 입력을 다른 계정에 옮기지 않았습니다.</p>;
 return <AlphaWorkspaceBody key={props.session.userId} config={props.config} session={props.session} email={props.email} onSignOut={props.onSignOut} legacyTransport={props.transport}/>;
}
/** Isolated fixture entry only. Existing production entry never accepts injection. */
export function AlphaWorkspaceSyntheticFixture(props: AlphaWorkspaceProps & { runtime: SyntheticAlphaWorkspaceRuntime }) {
  if (!isSyntheticAlphaWorkspaceInput(props.runtime, props.config, props.session)) return <p role="alert">합성 Alpha 실행 설정을 확인해 주세요.</p>;
  return <AlphaWorkspaceBody key={props.session.userId} {...props} syntheticRuntime={props.runtime} />;
}
function AlphaWorkspaceBody({ config, session, email, onSignOut, syntheticRuntime,legacyTransport,pmWriting,nativeAuthoringEnabled }: AlphaWorkspaceProps & { syntheticRuntime?: SyntheticAlphaWorkspaceRuntime;legacyTransport?:AlphaLegacyWritingTransport }) {
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
  const preservationRef = useRef(false);
  const preservationOpener = useRef<HTMLElement | null>(null);
  // R8a: the "…" menu and its 복구함, and the total the user last closed the saved-input notice at.
  const managementMenu = useRef<HTMLDetailsElement | null>(null), recoveryBox = useRef<HTMLDetailsElement | null>(null);
  const [savedNoticeClosedAt, setSavedNoticeClosedAt] = useState<number | null>(null);
  const preservationReturn = useRef<{ ownerId: string; controller: Controller | null; opener: HTMLElement | null } | null>(null);
  const modalRef = useRef(false); modalRef.current = !!publisher || !!inspector;
  const inspectorDialog = useRef<HTMLDialogElement | null>(null);
  const socialRecovery = useRef<ReturnType<typeof createAlphaSocialRecovery> | null>(null), parkedSocial = useRef<AlphaSocialRecoveryEntry[]>([]), activeSocial = useRef<AlphaSocialRecoveryEntry[]>([]);
  const publisherEditors = useRef<ProgramEditorFlush | null>(null), communityEditors = useRef<ProgramEditorFlush | null>(null), inspectorEditors = useRef<ProgramEditorFlush | null>(null);
  const mediaPort = useMemo(() => createAlphaCommunityMediaPort({ accessToken: () => session.accessToken, fetch: request }), [session.userId, session.accessToken, request]);
  const [output, setOutput] = useState<string | null>(null), [message, setMessage] = useState('');
  const [reviewAnnouncement, setReviewAnnouncement] = useState<{ isCurrent: () => boolean } | null>(null);
  const reviewAnnouncementGeneration = useRef(0);
  const [recoveries, setRecoveries] = useState<AlphaUiRecoveryRecord | null>(null), [storageError, setStorageError] = useState(false);
  const [structuralRecoveries, setStructuralRecoveries] = useState<AlphaStructuralRecoveryRecord | null>(null);
  // R8a: all saved input, counted for the 복구함 badge and the notice. When some goes away, lower the
  // closed-at mark so the next newly saved input shows the notice again.
  const savedTotal = (recoveries?.drafts.length ?? 0) + (structuralRecoveries?.entries.length ?? 0)
    + (creatorRecoveries?.entries.length ?? 0) + (socialRecoveries?.entries.length ?? 0);
  useEffect(() => { setSavedNoticeClosedAt(at => at !== null && savedTotal < at ? savedTotal : at); }, [savedTotal]);
  const structuralRecovery = useRef<ReturnType<typeof createAlphaStructuralRecovery> | null>(null);
  const parkedStructural = useRef<AlphaStructuralRecoveryEntry[]>([]), activeStructural = useRef<AlphaStructuralRecoveryEntry[]>([]);
  const [external, setExternal] = useState(false), [presentation, setPresentation] = useState(0), [leave, setLeave] = useState(false);
  // The publication notice shows once per tab and account; storage that cannot be used keeps it showing.
  const [devNoticeSeen, setDevNoticeSeen] = useState(false);
  const devNoticeStorage = () => { try { return syntheticRuntime?.tabStorage ?? sessionStorage; } catch { return undefined; } };
  useEffect(() => { setDevNoticeSeen(readDevNoticeSeen(devNoticeStorage(), session.userId)); }, [session.userId]);
  const openLatestLock = useRef<(() => void) | null>(null);
  // Release the old owner only after the replacement presentation commits, or on unmount.
  useEffect(() => {
    const release = openLatestLock.current; openLatestLock.current = null; release?.();
    return () => { const cleanup = openLatestLock.current; openLatestLock.current = null; cleanup?.(); };
  }, [presentation, sessionEpoch]);
  const controller = useRef<Controller | null>(null), uiRecovery = useRef<UiRecovery | null>(null);
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
    const structuralSaved = captureStructuralInput();
    if (!captureCreator()) return false;
    const social = [publisherEditors.current, communityEditors.current, inspectorEditors.current].flatMap(port => port?.captureSocialDrafts?.() ?? []);
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
      uiRecovery.current = ui;
      const structural = createAlphaStructuralRecovery(tabStorage, { ownerId: session.userId, slotId: slot });
      structuralRecovery.current = structural; activeStructural.current = [];
      const structuralLoaded = structural.read();
      if (structuralLoaded.ok) { parkedStructural.current = structuralLoaded.value?.entries ?? []; setStructuralRecoveries(structuralLoaded.value); }
      else setStorageError(true);
      const creatorPort = createAlphaCreatorRecovery(tabStorage, session.userId, slot);
      creatorRecovery.current = creatorPort; activeCreator.current = null;
      const socialPort = createAlphaSocialRecovery(tabStorage, session.userId, slot); socialRecovery.current = socialPort;
      const socialLoaded = socialPort.read(); activeSocial.current = [];
      if (socialLoaded.ok) { parkedSocial.current = socialLoaded.value?.entries ?? []; setSocialRecoveries(socialLoaded.value); } else setStorageError(true);
      const creatorLoaded = creatorPort.read();
      if (creatorLoaded.ok) { parkedCreator.current = creatorLoaded.value?.entries ?? []; setCreatorRecoveries(creatorLoaded.value); }
      else setStorageError(true);
      parkedDrafts.current = []; activeDrafts.current = [];
      const loaded = ui.read();
      if (loaded.ok) { parkedDrafts.current = (loaded.value?.drafts ?? []).map(draft => ({ ...draft })); setRecoveries(loaded.value); }
      else setStorageError(true);
      const store = createAlphaSyncController({ recovery, onChange: present,writingCompute:compute });
      controller.current = store;
    } catch { setStorageError(true); }
    return () => { captureInput(); disposed.current = true; preservationRef.current = false; preservationOpener.current = null; preservationReturn.current = null; controller.current?.dispose(); controller.current = null;writingCompute.current?.dispose();writingCompute.current=null; };
  }, [session.userId]);
  useEffect(() => {
    const store = controller.current; if (!store) return;
    captureInput();
    store.bindSession(session.userId, legacyTransport?createAlphaLegacyWritingRepository(config,session,legacyTransport):createAlphaHttpRepository(config, session, request, { social: true }));
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
      promise: store.refresh().catch(() => false) };
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
    const input = { capture: true, passive: true };
    window.addEventListener('focus', reads.returned); window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', visibility); window.addEventListener('beforeunload', beforeUnload);
    for (const type of AUTOMATIC_READ_INPUT_EVENTS) window.addEventListener(type, reads.input, input);
    const timer = window.setInterval(reads.interval, POLL_MS);
    return () => { clearInterval(timer); window.removeEventListener('focus', reads.returned); window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('beforeunload', beforeUnload);
      for (const type of AUTOMATIC_READ_INPUT_EVENTS) window.removeEventListener(type, reads.input, input); };
  }, []);
  const performMutation: ProgramMutate = async (label, build, options) => {
    const store = controller.current, owner = currentOwnerRef.current, epoch = sessionEpochRef.current;
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
        if (socialSaved?.ok && socialSaved.value && confirmed && socialSaved.value.entries.every(entry => {
          const value = entry.value as ProgramPublicationDraft & ProgramParticipationDraft & { proposalId: string; draft: ProgramProposalReviewDraft };
          const stored = entry.kind === 'publication' ? confirmed.space.publicationDrafts.find(row => row.id === value.id)
            : entry.kind === 'participation' ? confirmed.space.participationDrafts.find(row => row.id === value.id)
              : confirmed.space.proposalReviewDrafts?.[value.proposalId];
          return stored && canonicalJson(stored) === canonicalJson(entry.kind === 'review' ? value.draft : value);
        })) {
          if (socialRecovery.current?.clear(socialSaved.value).ok) { parkedSocial.current = []; activeSocial.current = []; setSocialRecoveries(null); }
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
  async function resolvePendingResult() {
    const pending = controller.current?.snapshot().pending, context = reviewContext.current;
    const review = pending?.kind === 'social' && pending.intent.type === 'participation-submit'
      && pending.intent.draft.id === context?.draftId;
    const currentVisit = review ? captureReviewVisit() : null;
    if (!await controller.current?.resolvePending(true)) return;
    if (review && (!currentVisit?.() || reviewContext.current !== context || context?.postId)) return;
    setMessage('저장 결과를 확인했습니다.');
  }
  useEffect(() => { clearReviewContext(); }, [sessionEpoch]);
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
  async function history(kind: 'undo' | 'redo') {
    if(currentData.current?.spaces[session.userId]?.personalAuthoring){setMessage('개인 Flow 판본·실행 기록을 보존하기 위해 전체 변경 되돌리기는 보류합니다. 본문 입력 취소는 편집기에서 사용할 수 있습니다.');return;}
    if (storageError) { setMessage('입력 보관 상태를 확인하기 전에는 변경할 수 없습니다.'); return; }
    if (hasInput()) { setMessage('작성 중인 내용을 먼저 저장하거나 보관해 주세요.'); return; }
    const result = await controller.current?.[kind]();
    if (result && !result.ok) setMessage(programErrorMessage(result.reason));
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
      parkedDrafts.current = mergeRecoveryDrafts(parkedDrafts.current, activeDrafts.current);
      parkedStructural.current = mergeStructuralRecoveryEntries(parkedStructural.current, activeStructural.current);
      if (activeCreator.current && !parkedCreator.current.some(e => canonicalJson(e) === canonicalJson(activeCreator.current))) parkedCreator.current.push(activeCreator.current);
      activeCreator.current = null;
      parkedSocial.current = [...parkedSocial.current, ...activeSocial.current].filter((entry, index, list) => list.findIndex(other => canonicalJson(other) === canonicalJson(entry)) === index);
      activeSocial.current = [];
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
    const result = await mutate('보관 원문 복구', current => createProgramDocument(current, {
      actorId: session.userId, requestId: programId('recover'), expectedSpace: current.spaces[session.userId],
      title: `${draft.title || '보관 원문'} 복구`.slice(0, 240), raw: draft.raw,
    }));
    if (result.ok) { setDestination({ view: 'space', id: result.result }); setMessage('보관 원문을 새 문서로 저장했습니다. 확인 후 보관본을 정리할 수 있습니다.'); }
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
      setDestination({ view: 'space', id: result.result }); setPresentation(value => value + 1); setMessage('보관한 문서·폴더와 행을 복구했습니다.');
    }
  }
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
    if (result.ok) { setCreatorSeen(true); setCreatorSelection(working.draftId); setDestination({ view: 'creator', id: working.draftId }); setPresentation(n => n + 1);
      setMessage(entry.auxiliaries.length ? '제작 작업본을 복구했습니다. 별도로 보관한 비교·구조 입력은 아래 원문을 확인해 다시 적용해 주세요.' : '제작 작업본을 복구했습니다. 저장 판본과 개인 실행은 그대로입니다.'); }
    else setMessage('현재 제작 구조와 안전하게 합칠 수 없습니다. 보관 원문과 구조 자료는 유지했습니다. 현재 저장본을 확인해 주세요.');
  }
  function openCreatorEntry() {
    if (creatorEntryChoices) return;
    void navigate({ view: 'creator', id: creatorSelection }, true);
  }
  async function navigate(next: ProgramDestination, chooseCreatorEntry = false) {
    if (externalRef.current || controller.current?.snapshot().pending) { setMessage('먼저 저장 결과와 보관 입력을 확인해 주세요.'); return; }
    const visit = destinationRef.current, epoch = sessionEpochRef.current, store = controller.current;
    if (!captureInput()) return;
    const releases = allEditors().map(port => port?.lockInput());
    try { for (const port of allEditors()) if (port && !await port.flushAll()) return; }
    finally { releases.forEach(release => release?.()); }
    if (disposed.current || visit !== destinationRef.current || epoch !== sessionEpochRef.current || store !== controller.current
      || currentOwnerRef.current !== session.userId) return;
    if (chooseCreatorEntry) { creatorEntryReturn.current = visit; setCatalogDetailOpen(false); }
    setCreatorEntryChoices(next.view === 'creator' && chooseCreatorEntry);
    if (next.view === 'creator') { setCreatorSeen(true); setCreatorSelection(next.id); }
    if (['flow', 'discover'].includes(next.view)) setDiscoverySelection(next.view === 'flow' ? next.id : undefined);
    if (next.view === 'community' || next.view === 'activity') { setCommunityView(next.view); setCommunitySelection(next.id); }
    setSeen(prior => ({ discovery: prior.discovery || ['flow', 'discover'].includes(next.view), community: prior.community || ['community', 'activity'].includes(next.view) }));
    if (next.view === 'space' && next.action === 'publish' && next.id) { setPublisher(next.id); next = { view: 'space', id: next.id }; }
    if (window.location.hash !== programLocation(next)) window.history.pushState(null, '', programLocation(next));
    destinationRef.current = next; setDestination(next); setOutput(null);
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
  async function useVersion(versionId: string, itemIds: string[], anchor: string | null, recurrenceStarts?: Record<string, string>) {
    const result = await mutate('개인 Flow 가져오기', fresh => importProgramPublicVersion(fresh, { actorId: session.userId,
      requestId: programId('request'), expectedSpace: fresh.spaces[session.userId], versionId, itemIds, anchor, ...(recurrenceStarts ? { recurrenceStarts } : {}) }),
    { alphaSocial: { type: 'copy-import', versionId, itemIds, anchor, ...(recurrenceStarts ? { recurrenceStarts } : {}) } });
    if (result.ok) {
      const copy = currentData.current?.spaces[session.userId].copies.find(row => row.id === result.result);
      if (copy) await navigate({ view: 'space', id: copy.documentId });
    }
    return result.ok;
  }
  async function startText(raw: string, title: string) {
    const result = await mutate('원문 문서 만들기', fresh => createProgramDocument(fresh, { actorId: session.userId, requestId: programId('request'), expectedSpace: fresh.spaces[session.userId], title, raw }));
    if (result.ok) { setDiscoveryState(createProgramDiscoveryNavigationState()); await navigate({ view: 'space', id: result.result }); }
    return result.ok;
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
    : external || snapshot?.status === 'conflict' || snapshot?.draft && !pending && !snapshot.retryableRejectedDraft && !snapshot.retryableNativeHandoff && !snapshot.retryableRejectedSocialDraft ? <section className={styles.problem} aria-label="편집 중 변경 확인"><p>다른 변경이 먼저 저장되었습니다. 입력을 보관한 뒤 최신 내용을 확인해 주세요.</p><button disabled={snapshot?.busy} onClick={() => void openLatest()}>입력 보관 후 최신 내용 열기</button></section> : null;
  // Presentation only: storage, pending authority and recovery actions stay
  // unchanged. In personal space their disclosure does not resize the document.
  const needsInputProtection = storageError || !localParticipationRecovery && (pendingUnknown
    || (snapshot?.retryableRejectedDraft || snapshot?.retryableNativeHandoff || snapshot?.retryableRejectedSocialDraft) && !external && !pending
    || external || snapshot?.status === 'conflict'
    || snapshot?.draft && !pending && !snapshot.retryableRejectedDraft && !snapshot.retryableNativeHandoff && !snapshot.retryableRejectedSocialDraft);
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
      <h2>내 입력과 서버의 변경을 확인해 주세요</h2><p>내 입력은 이 탭에 보관합니다. 최신 내용을 연 뒤 필요한 원문을 복구할 수 있습니다.</p>
      {snapshot?.busy && <p role={announce ? 'status' : undefined}>서버 확인 중… 입력은 그대로 보관합니다.</p>}
      <button type="button" disabled={snapshot?.busy} onClick={() => void openLatest()}>입력 보관 후 최신 내용 열기</button>
      {snapshot?.draft && <AlphaConflictReview draft={snapshot.draft} account={snapshot.account}
        onCopy={raw => navigator.clipboard.writeText(raw).then(() => setMessage('원문을 복사했습니다.'), () => setMessage('복사하지 못했습니다. 원문을 직접 선택해 주세요.'))} />}
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
  // A new saved input, or saved input on opening the app, gets one line until the user closes it.
  const savedNoticeShown = savedTotal > 0 && (savedNoticeClosedAt === null || savedTotal > savedNoticeClosedAt);
  function openRecoveryBox() {
    if (managementMenu.current) managementMenu.current.open = true;
    if (recoveryBox.current) recoveryBox.current.open = true;
    requestAnimationFrame(() => recoveryBox.current?.querySelector<HTMLElement>(':scope > summary')?.focus());
  }
  const usesNoteChrome = destination.view === 'space' && !unavailable;
  // Once acknowledged, keep an element: ProgramSpace reads a truthy noteHeader as the note layout.
  const publicNotice = devNoticeSeen ? <span hidden data-dev-notice="acknowledged" /> : <div className={styles.devNotice}>
    <details className={styles.notice} aria-label="개발계 안내"><summary>공개한 내용은 로그인 사용자에게 보입니다. 중요한 자료의 유일본은 넣지 마세요.</summary>
      <p>{DEV_NOTICE_TEXT}</p></details>
    <button type="button" onClick={() => { if (markDevNoticeSeen(devNoticeStorage(), session.userId)) setDevNoticeSeen(true); }}>확인</button></div>;
  const serverUndo = <button type="button" title="마지막으로 서버 저장에 성공한 변경을 되돌립니다" onClick={() => void history('undo')} disabled={!snapshot?.canUndo || external}>되돌리기</button>;
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
  // The status and its recovery box, and the notices that always show (today, 분류, no document).
  const serverStatusMain = <>
        {!localParticipationRecovery && <p role={reviewOwnsAnnouncement ? undefined : 'status'} aria-live={reviewOwnsAnnouncement ? 'off' : 'polite'} data-save-state={snapshot?.status}>{pendingUnknown ? '저장 여부 확인 못 함' : pending ? '저장 중…' : snapshot?.retryableRejectedDraft || snapshot?.retryableNativeHandoff || snapshot?.retryableRejectedSocialDraft ? '저장 거절 · 입력 보존됨' : snapshot ? labels[snapshot.status] : '개인공간을 여는 중…'}</p>}
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
  const serverStatusView: ProgramServerStatusView | null = usesNoteChrome ? {
    ...programServerStatus({ snapshot, storageError, external, participationRecovery: !!localParticipationRecovery }),
    recovery: destination.view === 'space' && needsInputProtection ? <div className={styles.statusSlot}>{inputRecoveryBox(false)}</div> : null,
    extras: destination.view === 'space' && message && !participationMessage
      ? <div className={styles.statusRow}>{serverStatusExtras}</div> : null,
  } : null;
  return <main ref={chromeRoot} className={styles.page} data-alpha-frame="b" data-writing-keyboard={writingWithKeyboard ? 'true' : undefined} data-synthetic-runtime={syntheticRuntime ? 'fixture-only' : undefined} data-note-layout={usesNoteChrome} onInput={() => { queueMicrotask(captureInput); }} onCompositionEnd={() => { queueMicrotask(captureInput); }}>
    <header className={styles.header}><a className={styles.brand} href="/alpha" onClick={event => { event.preventDefault(); void navigate({ view: 'space' }); }}>FlowMe</a>
      {!unavailable && <nav className={styles.globalNavigation} aria-label="주요 메뉴">
        <button type="button" aria-current={['space', 'legacy'].includes(destination.view) ? 'page' : undefined} onClick={() => void navigate({ view: 'space' })}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="m3 10 9-7 9 7v11H3z"/></svg><span>내 공간</span></button>
        <button type="button" aria-current={['discover', 'flow', 'community'].includes(destination.view) ? 'page' : undefined} onClick={() => void navigate({ view: 'community' })}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 3h16v18H4zm3 4h10v2H7zm0 5h10v2H7zm0 5h6v2H7z"/></svg><span>둘러보기</span></button>
        <button type="button" aria-current={['activity','creator'].includes(destination.view) ? 'page' : undefined} onClick={() => void navigate({ view: 'activity' })}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" opacity=".25" d="M2 7h20v15H2Z"/><path fill="currentColor" d="M2 3h8l3 4h9v4H2Z"/></svg><span>내 활동</span></button>
      </nav>}
      <h1 className={styles.destinationTitle}>{destination.view === 'creator' ? '제작 공간' : destination.view === 'activity' ? '내 활동' : destination.view === 'legacy' ? '개인 Flow 상세' : destination.view === 'community' ? '이야기' : browse ? 'Flow' : '내 작업'}</h1>
      <details className={styles.development}><summary>{syntheticRuntime ? '합성 검증' : '개발계'}</summary><p>{DEV_NOTICE_TEXT}</p></details></header>
    {browse && <nav className={styles.browseNavigation} aria-label="둘러보기 종류"><button aria-current={destination.view === 'community' ? 'page' : undefined} onClick={() => void navigate({view:'community'})}>경험·질문·지식</button><button aria-current={['discover','flow'].includes(destination.view) ? 'page' : undefined} onClick={() => void navigate({view:'discover'})}>Flow 찾기</button></nav>}
    <div className={styles.workPane} data-testid="alpha-work-pane">
    {!usesNoteChrome && publicNotice}
    <section className={styles.sync} aria-label="서버 저장 상태">
      {!usesNoteChrome && serverStatus}
      <details ref={managementMenu} className={styles.management} aria-label="계정 및 자료 관리" onKeyDown={event => {
        if (event.key !== 'Escape' || event.nativeEvent.isComposing || !event.currentTarget.open) return;
        event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false;
        event.currentTarget.querySelector('summary')?.focus({ preventScroll: true });
      }} onBlur={event => {
        if (!preservationRef.current && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) event.currentTarget.open = false;
      }}><summary aria-current={['activity', 'legacy'].includes(destination.view) ? 'page' : undefined} aria-label={`${destination.view === 'activity' ? '보조 메뉴 · 현재 위치: 내 활동' : destination.view === 'legacy' ? '보조 메뉴 · 현재 위치: 개인 Flow 상세' : '보조 메뉴 · 내 활동, 계정·자료 관리'}${savedTotal ? ` · 보관한 입력 ${savedTotal}개` : ''}`}><span className={styles.auxiliaryLabel}>{destination.view === 'activity' ? '내 활동' : destination.view === 'legacy' ? '개인 Flow 상세' : '더보기'}</span>{savedTotal > 0 && <span className={styles.menuBadge} aria-hidden="true">{savedTotal}</span>}</summary><div className={styles.managementBody}>
        <h2>더보기</h2>
        <section className={styles.menuGroup} aria-label="편집"><h3>편집</h3>
          <div className={styles.managementActions}>{usesNoteChrome && serverUndo}<button type="button" onClick={() => void history('redo')} disabled={!snapshot?.canRedo || external}>다시 실행</button></div>
        </section>
        {!unavailable && data && <section className={styles.menuGroup} aria-label="내 활동"><h3>내 활동</h3>
          <div className={styles.managementActions}><button type="button" aria-current={destination.view === 'activity' ? 'page' : undefined} onClick={() => void navigate({ view: 'activity' })}>내 활동</button>
            {data.spaces[session.userId].savedBindings.length > 0 && <button type="button" aria-current={destination.view === 'legacy' ? 'page' : undefined} onClick={() => void navigate({ view: 'legacy' })}>개인 Flow 상세</button>}</div>
        </section>}
        <section className={styles.menuGroup} aria-label="자료"><h3>자료</h3>
          <details ref={recoveryBox} className={styles.recoveryBox} open={!!savedTotal && (unavailable || external || snapshot?.status === 'conflict')}>
            <summary>복구함{savedTotal ? ` (${savedTotal})` : ''}</summary>
            {savedTotal ? <>{savedInputPanel}{structuralRecoveryPanel}{creatorRecoveryPanel}{socialRecoveryPanel}</> : <p>보관한 입력이 없습니다.</p>}
          </details>
          <div className={styles.managementActions}>
          <button type="button" disabled={unavailable || pending || external || !!snapshot?.busy || !!snapshot?.draft || storageError} onClick={event => {
          if (disposed.current || currentOwnerRef.current !== session.userId) return;
          const opener = event.currentTarget;
          preservationOpener.current = opener; preservationReturn.current = null;
          void (async () => { const openingController = controller.current; if (!captureInput()) return; for (const port of allEditors()) if (port && !await port.flushAll()) return; if (disposed.current || controller.current !== openingController || currentOwnerRef.current !== session.userId) return; preservationRef.current = true; setPreservation(true); })();
        }}>백업 · 복원 · 가져오기</button></div>
        </section>
        <section className={styles.menuGroup} aria-label="계정"><h3>계정</h3>
          <div className={styles.account}><p>{email}</p></div>
          <div className={styles.managementActions}><button type="button" onClick={() => { captureInput(); if (hasInput() || pending) setLeave(true); else void signOut(); }}>로그아웃 · 계정 바꾸기</button></div>
        </section>
        <section className={styles.menuGroup} aria-label="문제 해결"><h3>문제 해결</h3>
          <div className={styles.managementActions}><button type="button" onClick={() => void controller.current?.refresh()} disabled={snapshot?.busy}>서버에서 다시 확인</button></div>
          {snapshot?.account && <small className={styles.account}>서버 기록 번호 {snapshot.account.revision}</small>}
        </section>
        {!unavailable && data && destination.view === 'space' && <section className={styles.menuGroup} aria-label="실험"><h3>실험</h3>
          <div className={styles.managementActions}><button type="button" aria-pressed={collectionsMode} disabled={collectionsSwitching || collectionsSaving || pending || external || !!snapshot?.busy || !!snapshot?.draft || storageError}
            onClick={() => void switchCollectionsMode()}>{collectionsMode ? '기존 폴더로 보기' : '문서·모음 시험'}</button></div>
        </section>}
        <section className={styles.menuGroup} aria-label="개발계 안내"><h3>개발계 안내</h3>
          <details className={styles.menuNote}><summary>개발계 안내</summary><p>{DEV_NOTICE_TEXT}</p></details>
        </section>
        </div></details>
    </section>
    {savedNoticeShown && <p className={styles.savedNotice} role="status"><span>보관한 입력 {savedTotal}개</span>
      <button type="button" onClick={openRecoveryBox}>복구함 열기</button>
      <button type="button" aria-label="보관한 입력 안내 닫기" onClick={() => setSavedNoticeClosedAt(savedTotal)}>닫기</button></p>}
    {preservation && snapshot?.account && snapshot.references && <AlphaPreservationPanel key={session.userId} account={snapshot.account} references={snapshot.references}
      email={email} accessToken={session.accessToken} returnFocusTarget={preservationOpener.current} onClose={closePreservation} onSaved={async () => {
        ownMutation.current++; try { await controller.current?.refresh(); setPresentation(value => value + 1); } finally { ownMutation.current--; }
      }} />}
    {destination.view !== 'space' && inputProtectionFor(true)}
    {leave && <section className={styles.problem} aria-label="로그아웃 전 입력 확인"><p>저장하지 않은 입력을 이 탭에 보관한 뒤 로그아웃할 수 있습니다. 같은 계정으로 돌아와 복구하세요.</p>
      <button type="button" onClick={() => { if (captureInput() && canReleaseInput()) void signOut(); }}>입력 보관 후 로그아웃</button><button type="button" onClick={() => setLeave(false)}>계속 작성</button></section>}
    {destination.view !== 'space' && message && !participationMessage && <p className={styles.message} role="status">{message}</p>}
    {unavailable ? <section className={styles.empty}><p>{snapshot?.status === 'session-expired' ? '계정을 다시 확인한 뒤 개인공간을 열 수 있습니다.' : '서버에서 개인공간을 확인하고 있습니다.'}</p></section> : <>
      {['activity', 'creator'].includes(destination.view) && <nav className={styles.tabs} aria-label="내 활동 종류"><button aria-current={destination.view === 'activity' ? 'page' : undefined} onClick={() => void navigate({ view: 'activity' })}>활동·공개 관리</button><button aria-current={destination.view === 'creator' ? 'page' : undefined} onClick={openCreatorEntry}>Flow 만들기</button></nav>}
      <div hidden={destination.view !== 'space'}>
        {collectionsMode && <p className={styles.notice}>모음 연결은 이 브라우저에만 저장됩니다. 문서·할 일은 기존 서버에 저장되며, 기존 폴더는 바뀌지 않습니다.</p>}
        {collectionsMessage && <p className={styles.message} role="status">{collectionsMessage}</p>}
        <ProgramServerStatusContext.Provider value={serverStatusView}>
        <ProgramSpace key={`space:${session.userId}:${presentation}:${collectionsMode ? 'collections' : 'folders'}`} data={data} today={programLocalDate()} mutate={mutate}
        nativeAuthoringEnabled={nativeAuthoringEnabled} writingCompute={writingCompute.current??undefined} writingContext={() => ({ownerId:session.userId,baseRevision:currentRevision.current??0})}
        pmTextHost={syntheticRuntime||pmWriting==='v11-pm/1' ? { ownerId: session.userId, epoch: sessionEpoch, snapshot: () => sessionEpochRef.current === sessionEpoch && !disposed.current && currentOwnerRef.current === session.userId ? controller.current?.snapshot() ?? null : null } : undefined}
        noteHeader={usesNoteChrome ? publicNotice : undefined} noteStatus={usesNoteChrome ? serverStatus : undefined}
        documentCollections={collectionsMode && collectionsState ? { state: collectionsState, onChange: changeCollections } : undefined}
        navigate={next => { void navigate(next); }} capabilities={capability}
        sourceReturnEpoch={sessionEpoch} awaitSourceReturnReady={awaitSourceReturnReady}
        sourceReturnWaits={() => !!sourceReturnWaiting()} onSourceReturnQueued={showSourceReturnQueued}
        canContinueWholeDocument={() => {
          const authority = controller.current?.snapshot();
          return !disposed.current && !externalRef.current && !!authority && !authority.pending && !authority.busy && authority.status !== 'conflict';
        }}
        selectedDocumentId={destination.view === 'space' ? destination.id : undefined} onUndo={() => history('undo')} onRedo={() => history('redo')}
        onOutputDocument={setOutput} onPublishDocument={setPublisher} onInspectCopy={setInspector} onRegisterEditors={port => { editors.current = port; }}
        onStartReview={startReview} onRegisterReviewSpace={port => { reviewSpace.current = port; }} /></ProgramServerStatusContext.Provider></div>
      {seen.discovery && <div hidden={!['discover', 'flow'].includes(destination.view)}><ProgramDiscovery key={`discover:${session.userId}:${presentation}`} data={data} mutate={mutate} navigate={next => { void navigate(next); }} today={programLocalDate()} storageScope="account"
        selectedFlowId={discoverySelection} selectedVersionId={destination.view === 'flow' ? destination.versionId : undefined} selectedItemId={destination.view === 'flow' ? destination.itemId : undefined}
        selectedOutputReturn={destination.view === 'flow' ? destination.publicOutputReturn : undefined} onUseVersion={useVersion} onStartText={startText} onCreateFlow={openCreatorEntry} navigationState={discoveryState} onNavigationStateChange={setDiscoveryState} /></div>}
      {seen.community && <div hidden={!['community', 'activity'].includes(destination.view)}><ProgramCommunity key={`community:${session.userId}:${presentation}`} data={data} mutate={mutate} navigate={next => { void navigate(next); }} today={programLocalDate()}
        view={communityView} selectedPostId={communitySelection} selectedReplyId={destination.view === 'community' ? destination.replyId : undefined} presentation={communityState} onPresentationChange={setCommunityState}
        storageScope="account" mediaPort={mediaPort} draftSaveRecovery={localParticipationRecovery}
        reviewEntry={reviewEntry} captureReviewVisit={captureReviewVisit}
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
  </main>;
}
