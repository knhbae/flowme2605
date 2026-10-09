'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { restoreProgramDialogFocus } from '@/lib/flow/integrated-poc/dialog-return-focus';
import type { AlphaAuthConfig } from '@/lib/flow/integrated-poc/alpha-auth/config';
import type { VerifiedAlphaSession } from '@/lib/flow/integrated-poc/alpha-auth/account-access';
import { createAlphaSyncController, type AlphaSyncSnapshot } from '@/lib/flow/integrated-poc/alpha-sync/controller';
import type { AlphaCommand } from '@/lib/flow/integrated-poc/alpha-persistence/contract';
import { createAlphaHttpRepository } from '@/lib/flow/integrated-poc/alpha-sync/http-repository';
import { createAlphaTabRecovery } from '@/lib/flow/integrated-poc/alpha-sync/recovery';
import { createAlphaUiRecovery, type AlphaUiDraft, type AlphaUiRecoveryRecord } from '@/lib/flow/integrated-poc/alpha-ui-recovery';
import { type ProgramData, type ProgramParticipationDraft, type ProgramPublicationDraft, programId } from '@/lib/flow/integrated-poc/contract';
import type { ProgramProposalReviewDraft } from '@/lib/flow/integrated-poc/review-drafts';
import { type ProgramEditorFlush } from '@/lib/flow/integrated-poc/document-action';
import { type ProgramDestination, type ProgramMutate, programErrorMessage, PROGRAM_BUSY_NOTICE } from '@/lib/flow/integrated-poc/ui-contract';
import { createProgramDocument, importProgramPublicVersion } from '@/lib/flow/integrated-poc/private-space';
import { programLocalDate } from '@/lib/flow/integrated-poc/execution';
import { textWorkspaceModel as M } from '@/lib/flow/integrated-poc/text-workspace';
import { ProgramSpace } from './ProgramSpace';
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
const labels: Record<AlphaSyncSnapshot['status'], string> = {
  'signed-out': '로그인이 필요합니다', ready: '서버와 연결됨', saving: '서버에 저장 중…', saved: '서버 저장 확인',
  'same-location': '변경 없음', cancelled: '취소했습니다', conflict: '다른 변경이 먼저 저장되었습니다',
  'session-expired': '로그인이 만료되었습니다', 'checking-result': '저장 결과 확인이 필요합니다', 'recovery-required': '저장 상태를 확인해 주세요',
};
function mergeRecoveryDrafts(parked: readonly AlphaUiDraft[], active: readonly AlphaUiDraft[]): AlphaUiDraft[] {
  const seen = new Set<string>();
  return [...parked, ...active].filter(draft => {
    const identity = JSON.stringify([draft.documentId ?? null, draft.title, draft.raw]);
    if (seen.has(identity)) return false;
    seen.add(identity); return true;
  }).map(draft => ({ ...draft }));
}

export function AlphaWorkspace({ config, session, email, onSignOut }: {
  config: AlphaAuthConfig; session: VerifiedAlphaSession; email: string; onSignOut: () => Promise<void>;
}) {
  const [snapshot, setSnapshot] = useState<AlphaSyncSnapshot | null>(null), [data, setData] = useState<ProgramData | null>(null);
  const [destination, setDestination] = useState<ProgramDestination>({ view: 'space' });
  const destinationRef = useRef(destination); destinationRef.current = destination;
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
  const preservationReturn = useRef<{ ownerId: string; controller: Controller | null; opener: HTMLElement | null } | null>(null);
  const modalRef = useRef(false); modalRef.current = !!publisher || !!inspector;
  const inspectorDialog = useRef<HTMLDialogElement | null>(null);
  const socialRecovery = useRef<ReturnType<typeof createAlphaSocialRecovery> | null>(null), parkedSocial = useRef<AlphaSocialRecoveryEntry[]>([]), activeSocial = useRef<AlphaSocialRecoveryEntry[]>([]);
  const publisherEditors = useRef<ProgramEditorFlush | null>(null), communityEditors = useRef<ProgramEditorFlush | null>(null), inspectorEditors = useRef<ProgramEditorFlush | null>(null);
  const mediaPort = useMemo(() => createAlphaCommunityMediaPort({ accessToken: () => session.accessToken }), [session.userId, session.accessToken]);
  const [output, setOutput] = useState<string | null>(null), [message, setMessage] = useState('');
  const [recoveries, setRecoveries] = useState<AlphaUiRecoveryRecord | null>(null), [storageError, setStorageError] = useState(false);
  const [external, setExternal] = useState(false), [presentation, setPresentation] = useState(0), [leave, setLeave] = useState(false);
  const controller = useRef<Controller | null>(null), uiRecovery = useRef<UiRecovery | null>(null);
  const editors = useRef<ProgramEditorFlush | null>(null), legacyEditors = useRef<ProgramEditorFlush | null>(null);
  const creatorEditors = useRef<ProgramEditorFlush | null>(null), creatorRecovery = useRef<ReturnType<typeof createAlphaCreatorRecovery> | null>(null);
  const parkedCreator = useRef<AlphaCreatorRecoveryEntry[]>([]), activeCreator = useRef<AlphaCreatorRecoveryEntry | null>(null);
  const currentData = useRef<ProgramData | null>(null), currentRevision = useRef<number | null>(null);
  const currentPublicRevision = useRef<number | null>(null);
  const previousSnapshot = useRef<AlphaSyncSnapshot | null>(null);
  // Presentation proof only: newer input gains no retry or baseline authority.
  const confirmedParticipation = useRef<{ ownerId: string; command: Extract<AlphaCommand, { kind: 'social' }>; revision: number; publicRevision: number | undefined; privateBytes: string } | null>(null);
  const currentOwnerRef = useRef(session.userId); currentOwnerRef.current = session.userId;
  const ownMutation = useRef(0), disposed = useRef(false), externalRef = useRef(false);
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
  function captureInput() {
    if (!captureCreator()) return false;
    const social = [publisherEditors.current, communityEditors.current, inspectorEditors.current].flatMap(port => port?.captureSocialDrafts?.() ?? []);
    activeSocial.current = social;
    if (social.length && socialRecovery.current) {
      const entries = [...parkedSocial.current, ...social].filter((entry, index, list) => list.findIndex(other => canonicalJson(other) === canonicalJson(entry)) === index);
      const saved = socialRecovery.current.save(entries);
      if (!saved.ok) { setStorageError(true); return false; }
      setSocialRecoveries(saved.value);
    }
    const drafts = [editors.current, legacyEditors.current].flatMap(port => port?.captureDrafts?.() ?? []);
    const discovery = discoveryStateRef.current;
    if (programDiscoveryHasUnstoredInput(discovery)) drafts.push({ title: discovery.pastedTitle || '탐색 중 보관 원문', raw: discovery.pastedText || JSON.stringify(discovery.transient ?? { url: discovery.url }, null, 2) });
    activeDrafts.current = drafts.map(draft => ({ ...draft }));
    if (!drafts.length || !uiRecovery.current) return true;
    const saved = uiRecovery.current.save(mergeRecoveryDrafts(parkedDrafts.current, activeDrafts.current));
    if (!saved.ok) { setStorageError(true); return false; }
    setRecoveries(saved.value); return true;
  }
  function present(next: AlphaSyncSnapshot) {
    if (disposed.current || currentOwnerRef.current !== session.userId) return;
    if (next.account && next.account.ownerId !== session.userId) return;
    if (!next.busy) setMessage(value => value === PROGRAM_BUSY_NOTICE ? '' : value);
    const prior = previousSnapshot.current;
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
    // A response lookup may confirm exactly the input still mounted in the
    // creator. Advance only its matching baseline before classifying it as
    // another device's change. The port rejects newer/auxiliary/composing input.
    let exactOwnDraft = false, acceptedSocialDraft = false;
    const pendingSave = prior?.pending;
    const privateSave = !externalRef.current && prior?.ownerId === session.userId
      ? confirmedAlphaPrivateTextSave(session.userId, currentData.current, currentRevision.current,
        currentPublicRevision.current, pendingSave, next) : null;
    const acceptedPrivateSave = !!privateSave && !!editors.current?.acceptConfirmedPrivateText?.(privateSave.before, privateSave.next);
    if (acceptedPrivateSave && privateSave && !hasInput()) {
      const confirmedText = privateSave.next;
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
    if (currentData.current && (currentRevision.current !== next.account.revision || currentPublicRevision.current !== (next.publicRevision ?? null))
      && ownMutation.current === 0 && (hasInput() || (modalRef.current && !(exactOwnDraft && acceptedSocialDraft)))) {
      captureInput(); externalRef.current = true; setExternal(true); return;
    }
    if (externalRef.current) return;
    currentData.current = next.envelope.data; currentRevision.current = next.account.revision;
    currentPublicRevision.current = next.publicRevision ?? null;
    setData(next.envelope.data);
  }
  useEffect(() => {
    disposed.current = false;
    confirmedParticipation.current = null;
    preservationRef.current = false; setPreservation(false);
    preservationOpener.current = null; preservationReturn.current = null;
    try {
      let slot = sessionStorage.getItem(SLOT_KEY);
      if (!slot) { slot = crypto.randomUUID(); sessionStorage.setItem(SLOT_KEY, slot); }
      // sessionStorage is isolated even when a browser duplicates a tab's slot ID.
      const recovery = createAlphaTabRecovery(sessionStorage, slot);
      const ui = createAlphaUiRecovery(sessionStorage, { ownerId: session.userId, slotId: slot });
      uiRecovery.current = ui;
      const creatorPort = createAlphaCreatorRecovery(sessionStorage, session.userId, slot);
      creatorRecovery.current = creatorPort; activeCreator.current = null;
      const socialPort = createAlphaSocialRecovery(sessionStorage, session.userId, slot); socialRecovery.current = socialPort;
      const socialLoaded = socialPort.read(); activeSocial.current = [];
      if (socialLoaded.ok) { parkedSocial.current = socialLoaded.value?.entries ?? []; setSocialRecoveries(socialLoaded.value); } else setStorageError(true);
      const creatorLoaded = creatorPort.read();
      if (creatorLoaded.ok) { parkedCreator.current = creatorLoaded.value?.entries ?? []; setCreatorRecoveries(creatorLoaded.value); }
      else setStorageError(true);
      parkedDrafts.current = []; activeDrafts.current = [];
      const loaded = ui.read();
      if (loaded.ok) { parkedDrafts.current = (loaded.value?.drafts ?? []).map(draft => ({ ...draft })); setRecoveries(loaded.value); }
      else setStorageError(true);
      const store = createAlphaSyncController({ recovery, onChange: present });
      controller.current = store;
    } catch { setStorageError(true); }
    return () => { captureInput(); disposed.current = true; preservationRef.current = false; preservationOpener.current = null; preservationReturn.current = null; controller.current?.dispose(); controller.current = null; };
  }, [session.userId]);
  useEffect(() => {
    const store = controller.current; if (!store) return;
    captureInput();
    store.bindSession(session.userId, createAlphaHttpRepository(config, session, fetch, { social: true }));
    if (store.snapshot().pending) void store.resolvePending(false); else void store.refresh();
  }, [config, session.userId, session.accessToken]);
  useEffect(() => {
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { /* Keep server documents usable. */ }
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
    void store.refresh();
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
    const beforeUnload = (event: BeforeUnloadEvent) => {
      captureInput();
      if (hasInput() || controller.current?.snapshot().pending) { event.preventDefault(); event.returnValue = ''; }
    };
    const visibility = () => { captureInput(); refresh(); };
    window.addEventListener('focus', refresh); window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', visibility); window.addEventListener('beforeunload', beforeUnload);
    const timer = window.setInterval(refresh, POLL_MS);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('beforeunload', beforeUnload); };
  }, []);
  const mutate: ProgramMutate = async (label, build, options) => {
    if (!controller.current || storageError) return { ok: false, reason: 'recovery-required' };
    if (externalRef.current) return { ok: false, reason: 'conflict' };
    if (!captureInput()) return { ok: false, reason: 'recovery-required' };
    ownMutation.current++;
    try {
      const outcome = await controller.current.mutate(label, build, options);
      if (!outcome.ok) {
        // A blocked click may resume after the original request settles.
        // Do not reintroduce its temporary wait notice after the final snapshot.
        if (outcome.reason !== 'busy') {
          const failed = controller.current?.snapshot();
          setMessage(failed?.pending ? programErrorMessage('checking-result') : failed?.retryableNativeHandoff
            ? '저장되지 않았습니다. 비교와 선택은 유지했습니다. 같은 선택으로 다시 적용해 주세요.'
            : failed?.retryableRejectedSocialDraft ? '글 입력은 남아 있습니다. 내용을 수정하거나 ‘나중에 이어 쓰기’를 눌러 다시 보관해 주세요.'
            : failed?.retryableRejectedDraft ? '저장되지 않았습니다. 입력을 수정한 뒤 다시 저장해 주세요.' : programErrorMessage(outcome.reason));
        }
        else if (controller.current?.snapshot().busy) setMessage(PROGRAM_BUSY_NOTICE);
      }
      else {
        setMessage('');
        // Drop only input that exactly matches confirmed server text. A newer keystroke stays protected.
        const saved = uiRecovery.current?.read(), confirmed = controller.current.snapshot().account;
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
  async function history(kind: 'undo' | 'redo') {
    if (storageError) { setMessage('입력 보관 상태를 확인하기 전에는 변경할 수 없습니다.'); return; }
    if (hasInput()) { setMessage('작성 중인 내용을 먼저 저장하거나 보관해 주세요.'); return; }
    const result = await controller.current?.[kind]();
    if (result && !result.ok) setMessage(programErrorMessage(result.reason));
  }
  async function openLatest() {
    if (!captureInput()) return;
    const store = controller.current; if (!store) return;
    if (store.snapshot().busy) { setMessage('서버 확인 중입니다. 확인이 끝나면 다시 열어 주세요. 입력은 보관했습니다.'); return; }
    if (store.snapshot().pending) { setMessage('먼저 저장 결과를 확인해 주세요.'); return; }
    parkedDrafts.current = mergeRecoveryDrafts(parkedDrafts.current, activeDrafts.current);
    if (activeCreator.current && !parkedCreator.current.some(e => canonicalJson(e) === canonicalJson(activeCreator.current))) parkedCreator.current.push(activeCreator.current);
    activeCreator.current = null;
    parkedSocial.current = [...parkedSocial.current, ...activeSocial.current].filter((entry, index, list) => list.findIndex(other => canonicalJson(other) === canonicalJson(entry)) === index);
    activeSocial.current = [];
    const refreshed = store.snapshot().draft ? await store.discardConflict() : await store.refresh();
    if (!refreshed) { setMessage('최신 내용을 확인하지 못했습니다. 입력은 보관했습니다. 다시 시도해 주세요.'); return; }
    const next = store.snapshot();
    if (!next.envelope || !next.account) return;
    externalRef.current = false; setExternal(false); currentData.current = next.envelope.data; currentRevision.current = next.account.revision;
    currentPublicRevision.current = next.publicRevision ?? null; setPublisher(null); setInspector(null);
    setData(next.envelope.data); setPresentation(value => value + 1); setMessage('내 입력을 보관하고 최신 내용을 열었습니다.');
  }
  async function restoreDraft(index: number) {
    const draft = recoveries?.drafts[index]; if (!draft) return;
    const result = await mutate('보관 원문 복구', current => createProgramDocument(current, {
      actorId: session.userId, requestId: programId('recover'), expectedSpace: current.spaces[session.userId],
      title: `${draft.title || '보관 원문'} 복구`.slice(0, 240), raw: draft.raw,
    }));
    if (result.ok) { setDestination({ view: 'space', id: result.result }); setMessage('보관 원문을 새 문서로 저장했습니다. 확인 후 보관본을 정리할 수 있습니다.'); }
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
    const visit = destinationRef.current;
    if (!captureInput()) return;
    const releases = allEditors().map(port => port?.lockInput());
    try { for (const port of allEditors()) if (port && !await port.flushAll()) return; }
    finally { releases.forEach(release => release?.()); }
    if (disposed.current || visit !== destinationRef.current) return;
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
  const participationMessage = !!localParticipationRecovery && [programErrorMessage('checking-result'), '저장 결과를 확인했습니다.',
    '글 입력은 남아 있습니다. 내용을 수정하거나 ‘나중에 이어 쓰기’를 눌러 다시 보관해 주세요.'].includes(message);
  const pending = !!snapshot?.pending;
  const unavailable = snapshot?.status === 'session-expired' || !data;
  const browse = ['discover', 'flow', 'community'].includes(destination.view);
  const workspaceTools = !unavailable && data && <div className={styles.workspaceUtilities}>
    <nav className={styles.tabs} aria-label="Flow · 다른 도구">
      <button type="button" aria-current={destination.view === 'activity' ? 'page' : undefined} onClick={() => void navigate({ view: 'activity' })}>내 활동</button>
      {data.spaces[session.userId].savedBindings.length > 0 && <button type="button" aria-current={destination.view === 'legacy' ? 'page' : undefined} onClick={() => void navigate({ view: 'legacy' })}>개인 Flow 상세</button>}
    </nav>
    <details className={styles.workspaceTools} hidden={destination.view !== 'space'}><summary>문서 정리 방식</summary><div className={styles.tabs} aria-label="문서 정리 방식">
      <button type="button" aria-pressed={collectionsMode} disabled={collectionsSwitching || collectionsSaving || pending || external || !!snapshot?.busy || !!snapshot?.draft || storageError}
        onClick={() => void switchCollectionsMode()}>{collectionsMode ? '기존 폴더로 보기' : '문서·모음 시험'}</button>
    </div></details>
  </div>;
  const modalRecovery = pending && snapshot?.status !== 'saving'
    ? <section className={styles.problem} aria-label="저장 결과 복구"><p>응답이 끊겨도 서버에 저장됐을 수 있습니다. 입력은 유지하고 같은 요청으로 확인합니다.</p><button type="button" disabled={snapshot?.busy} onClick={async () => { if (await controller.current?.resolvePending(true)) setMessage('저장 결과를 확인했습니다.'); }}>저장 결과 확인 · 같은 요청 재시도</button></section>
    : external || snapshot?.status === 'conflict' || snapshot?.draft && !pending && !snapshot.retryableRejectedDraft && !snapshot.retryableNativeHandoff && !snapshot.retryableRejectedSocialDraft ? <section className={styles.problem} aria-label="편집 중 변경 확인"><p>다른 변경이 먼저 저장되었습니다. 입력을 보관한 뒤 최신 내용을 확인해 주세요.</p><button disabled={snapshot?.busy} onClick={() => void openLatest()}>입력 보관 후 최신 내용 열기</button></section> : null;
  return <main className={styles.page} onInput={() => { queueMicrotask(captureInput); }} onCompositionEnd={() => { queueMicrotask(captureInput); }}>
    <header className={styles.header}><a className={styles.brand} href="/alpha" onClick={event => { event.preventDefault(); void navigate({ view: 'space' }); }}>FlowMe</a>
      {!unavailable && <nav className={styles.globalNavigation} aria-label="주요 메뉴">
        <button type="button" aria-current={['space', 'legacy'].includes(destination.view) ? 'page' : undefined} onClick={() => void navigate({ view: 'space' })}>내 작업</button>
        <button type="button" aria-current={['discover', 'flow', 'creator'].includes(destination.view) ? 'page' : undefined} onClick={() => void navigate({ view: 'discover' })}>Flow</button>
        <button type="button" aria-current={destination.view === 'community' ? 'page' : undefined} onClick={() => void navigate({ view: 'community' })}>이야기</button>
      </nav>}
      <h1 className={styles.destinationTitle}>{destination.view === 'creator' ? '제작 공간' : destination.view === 'activity' ? '내 활동' : destination.view === 'legacy' ? '개인 Flow 상세' : destination.view === 'community' ? '이야기' : browse ? 'Flow' : '내 작업'}</h1>
      <span className={styles.development}>개발계</span></header>
    <details className={styles.notice} aria-label="개발계 안내"><summary>공개한 내용은 로그인 사용자에게 보입니다. 중요한 자료의 유일본은 넣지 마세요.</summary>
      <p>개발용 통합 검증판 · 공개한 내용은 개발계의 다른 로그인 사용자에게 보입니다. 중요한 자료의 유일본은 아직 넣지 마세요.</p></details>
    <section className={styles.sync} aria-label="서버 저장 상태">
      {!localParticipationRecovery && <p role="status" aria-live="polite" data-save-state={snapshot?.status}>{pending && snapshot?.status !== 'saving' ? '저장 결과 확인이 필요합니다' : snapshot?.retryableRejectedDraft || snapshot?.retryableNativeHandoff || snapshot?.retryableRejectedSocialDraft ? '저장 거절 · 입력 보존됨' : snapshot ? labels[snapshot.status] : '개인공간을 여는 중…'}</p>}
      <button type="button" title="마지막으로 서버 저장에 성공한 변경을 되돌립니다" onClick={() => void history('undo')} disabled={!snapshot?.canUndo || external}>되돌리기</button>
      <details className={styles.management} aria-label="계정 및 자료 관리" onKeyDown={event => {
        if (event.key !== 'Escape' || event.nativeEvent.isComposing || !event.currentTarget.open) return;
        event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false;
        event.currentTarget.querySelector('summary')?.focus({ preventScroll: true });
      }} onBlur={event => {
        if (!preservationRef.current && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) event.currentTarget.open = false;
      }}><summary aria-current={['activity', 'legacy'].includes(destination.view) ? 'page' : undefined} aria-label={destination.view === 'activity' ? '보조 메뉴 · 현재 위치: 내 활동' : destination.view === 'legacy' ? '보조 메뉴 · 현재 위치: 개인 Flow 상세' : '보조 메뉴 · 내 활동, 계정·자료 관리'}><span className={styles.auxiliaryLabel}>{destination.view === 'activity' ? '내 활동' : destination.view === 'legacy' ? '개인 Flow 상세' : '더보기'}</span></summary><div className={styles.managementBody}>
        <h2>계정 · 자료 관리</h2>
        <div className={styles.account}><p>{email}</p>{snapshot?.account && <small>마지막 확인 판본 {snapshot.account.revision}</small>}</div>
        <div className={styles.managementActions}><button type="button" onClick={() => { captureInput(); if (hasInput() || pending) setLeave(true); else void onSignOut(); }}>로그아웃 · 계정 바꾸기</button>
        <button type="button" onClick={() => void controller.current?.refresh()} disabled={snapshot?.busy}>서버에서 다시 확인</button>
        <button type="button" onClick={() => void history('redo')} disabled={!snapshot?.canRedo || external}>다시 실행</button>
        <button type="button" disabled={unavailable || pending || external || !!snapshot?.busy || !!snapshot?.draft || storageError} onClick={event => {
          if (disposed.current || currentOwnerRef.current !== session.userId) return;
          const opener = event.currentTarget;
          preservationOpener.current = opener; preservationReturn.current = null;
          void (async () => { const openingController = controller.current; if (!captureInput()) return; for (const port of allEditors()) if (port && !await port.flushAll()) return; if (disposed.current || controller.current !== openingController || currentOwnerRef.current !== session.userId) return; preservationRef.current = true; setPreservation(true); })();
        }}>백업 · 복원 · 가져오기</button></div>{workspaceTools}</div></details>
    </section>
    {preservation && snapshot?.account && snapshot.references && <AlphaPreservationPanel key={session.userId} account={snapshot.account} references={snapshot.references}
      email={email} accessToken={session.accessToken} returnFocusTarget={preservationOpener.current} onClose={closePreservation} onSaved={async () => {
        ownMutation.current++; try { await controller.current?.refresh(); setPresentation(value => value + 1); } finally { ownMutation.current--; }
      }} />}
    {storageError && <p className={styles.problem} role="alert">브라우저의 입력 보관 상태를 확인하지 못했습니다. 쓰기를 멈췄습니다. 작성 중인 내용을 파일로 보관해 주세요.</p>}
    {pending && snapshot?.status !== 'saving' && !localParticipationRecovery && <section className={styles.problem} aria-label="저장 결과 복구"><p>응답이 끊겨도 서버에 저장됐을 수 있습니다. 같은 요청으로 확인합니다.</p>
      <button type="button" disabled={snapshot?.busy} onClick={async () => { if (await controller.current?.resolvePending(true)) setMessage('저장 결과를 확인했습니다.'); }}>저장 결과 확인 · 같은 요청 재시도</button></section>}
    {(snapshot?.retryableRejectedDraft || snapshot?.retryableNativeHandoff || snapshot?.retryableRejectedSocialDraft) && !external && !pending && !localParticipationRecovery && <section className={styles.problem} aria-label="거절된 저장과 입력 보호"><p>{snapshot?.retryableNativeHandoff
      ? '저장되지 않았습니다. 비교와 선택은 유지했습니다. 같은 선택으로 다시 적용해 주세요.'
      : snapshot?.retryableRejectedSocialDraft ? '글 입력은 남아 있습니다. 내용을 수정하거나 ‘나중에 이어 쓰기’를 눌러 다시 보관해 주세요.'
      : '저장되지 않았습니다. 입력은 남아 있습니다. 문서에서 내용을 수정한 뒤 ‘다시 저장’을 눌러 주세요.'}</p></section>}
    {(external || snapshot?.status === 'conflict' || snapshot?.draft && !pending && !snapshot.retryableRejectedDraft && !snapshot.retryableNativeHandoff && !snapshot.retryableRejectedSocialDraft) && !localParticipationRecovery && <section className={styles.problem} aria-label="다른 기기 변경과 입력 보호">
      <h2>내 입력과 서버의 변경을 확인해 주세요</h2><p>내 입력은 이 탭에 보관합니다. 최신 내용을 연 뒤 필요한 원문을 복구할 수 있습니다.</p>
      {snapshot?.busy && <p role="status">서버 확인 중… 입력은 그대로 보관합니다.</p>}
      <button type="button" disabled={snapshot?.busy} onClick={() => void openLatest()}>입력 보관 후 최신 내용 열기</button>
      {snapshot?.draft && <AlphaConflictReview draft={snapshot.draft} account={snapshot.account}
        onCopy={raw => navigator.clipboard.writeText(raw).then(() => setMessage('원문을 복사했습니다.'), () => setMessage('복사하지 못했습니다. 원문을 직접 선택해 주세요.'))} />}
    </section>}
    {recoveries && <details className={styles.recovery} open={unavailable || !localParticipationRecovery && (external || snapshot?.status === 'conflict')}>
      <summary>보관한 입력 {recoveries.drafts.length}개</summary>
      {recoveries.drafts.map((draft, index) => <section key={index}><h2>{draft.title}</h2><textarea aria-label={`보관한 입력 ${index + 1}`} value={draft.raw} readOnly rows={5} />
        <button type="button" onClick={() => void navigator.clipboard.writeText(draft.raw).then(() => setMessage('원문을 복사했습니다.'), () => setMessage('복사하지 못했습니다. 원문을 직접 선택해 주세요.'))}>원문 복사</button>
        <button type="button" disabled={unavailable || pending || external || !!snapshot?.draft} onClick={() => void restoreDraft(index)}>새 문서로 복구</button></section>)}
      <button type="button" onClick={clearDrafts}>보관 입력 버리기</button>
    </details>}
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
    {socialRecoveries && <details className={styles.recovery} open={unavailable || !localParticipationRecovery && (external || snapshot?.status === 'conflict')}>
      <summary>보관한 공개·참여 입력 {socialRecoveries.entries.length}개</summary>
      <p>선택한 항목·사진 연결·검토 문맥을 함께 보관했습니다. 복구해도 자동으로 게시하지 않습니다.</p>
      {socialRecoveries.entries.map((entry, index) => <section key={index}><h2>{entry.kind === 'publication' ? '공개 초안' : entry.kind === 'participation' ? '참여 초안' : '제안 검토 초안'}</h2>
        <textarea aria-label={`공개·참여 보관본 ${index + 1}`} readOnly rows={5} value={JSON.stringify(entry.value, null, 2)} />
        <button disabled={unavailable || pending || external || !!snapshot?.draft} onClick={() => void restoreSocial(index)}>비공개 초안으로 복구</button></section>)}
      <button onClick={() => { if (socialRecovery.current?.clear().ok) { parkedSocial.current = []; activeSocial.current = []; setSocialRecoveries(null); } else setStorageError(true); }}>보관 공개·참여 입력 버리기</button>
    </details>}
    {leave && <section className={styles.problem} aria-label="로그아웃 전 입력 확인"><p>저장하지 않은 입력을 이 탭에 보관한 뒤 로그아웃할 수 있습니다. 같은 계정으로 돌아와 복구하세요.</p>
      <button type="button" onClick={() => { if (captureInput()) void onSignOut(); }}>입력 보관 후 로그아웃</button><button type="button" onClick={() => setLeave(false)}>계속 작성</button></section>}
    {message && !participationMessage && <p className={styles.message} role="status">{message}</p>}
    {unavailable ? <section className={styles.empty}><p>{snapshot?.status === 'session-expired' ? '계정을 다시 확인한 뒤 개인공간을 열 수 있습니다.' : '서버에서 개인공간을 확인하고 있습니다.'}</p></section> : <>
      {['activity', 'creator'].includes(destination.view) && <nav className={styles.tabs} aria-label="내 활동 종류"><button aria-current={destination.view === 'activity' ? 'page' : undefined} onClick={() => void navigate({ view: 'activity' })}>활동·공개 관리</button><button aria-current={destination.view === 'creator' ? 'page' : undefined} onClick={openCreatorEntry}>Flow 만들기</button></nav>}
      <div hidden={destination.view !== 'space'}>
        {collectionsMode && <p className={styles.notice}>모음 연결은 이 브라우저에만 저장됩니다. 문서·할 일은 기존 서버에 저장되며, 기존 폴더는 바뀌지 않습니다.</p>}
        {collectionsMessage && <p className={styles.message} role="status">{collectionsMessage}</p>}
        <ProgramSpace key={`space:${session.userId}:${presentation}:${collectionsMode ? 'collections' : 'folders'}`} data={data} today={programLocalDate()} mutate={mutate}
        documentCollections={collectionsMode && collectionsState ? { state: collectionsState, onChange: changeCollections } : undefined}
        navigate={next => { void navigate(next); }} capabilities={capability}
        canContinueWholeDocument={() => {
          const authority = controller.current?.snapshot();
          return !disposed.current && !externalRef.current && !!authority && !authority.pending && !authority.busy && authority.status !== 'conflict';
        }}
        selectedDocumentId={destination.view === 'space' ? destination.id : undefined} onUndo={() => history('undo')} onRedo={() => history('redo')}
        onOutputDocument={setOutput} onPublishDocument={setPublisher} onInspectCopy={setInspector} onRegisterEditors={port => { editors.current = port; }} /></div>
      {seen.discovery && <div hidden={!['discover', 'flow'].includes(destination.view)}><ProgramDiscovery key={`discover:${session.userId}:${presentation}`} data={data} mutate={mutate} navigate={next => { void navigate(next); }} today={programLocalDate()} storageScope="account"
        selectedFlowId={discoverySelection} selectedVersionId={destination.view === 'flow' ? destination.versionId : undefined} selectedItemId={destination.view === 'flow' ? destination.itemId : undefined}
        selectedOutputReturn={destination.view === 'flow' ? destination.publicOutputReturn : undefined} onUseVersion={useVersion} onStartText={startText} onCreateFlow={openCreatorEntry} navigationState={discoveryState} onNavigationStateChange={setDiscoveryState} /></div>}
      {seen.community && <div hidden={!['community', 'activity'].includes(destination.view)}><ProgramCommunity key={`community:${session.userId}:${presentation}`} data={data} mutate={mutate} navigate={next => { void navigate(next); }} today={programLocalDate()}
        view={communityView} selectedPostId={communitySelection} selectedReplyId={destination.view === 'community' ? destination.replyId : undefined} presentation={communityState} onPresentationChange={setCommunityState}
        storageScope="account" mediaPort={mediaPort} draftSaveRecovery={localParticipationRecovery}
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
  </main>;
}
