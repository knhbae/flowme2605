'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PROGRAM_STATE_KEY, programClone, programFailure, programId, programResult, type ProgramData } from '@/lib/flow/integrated-poc/contract';
import { prepareProgramInitialData, type ProgramLegacyInput } from '@/lib/flow/integrated-poc/legacy-entry';
import { hydrateProgramLegacy } from '@/lib/flow/integrated-poc/legacy-projection';
import { createProgramController, type ProgramController, type ProgramControllerSnapshot } from '@/lib/flow/integrated-poc/controller';
import { createProgramDocument, importProgramPublicVersion } from '@/lib/flow/integrated-poc/private-space';
import { programLocalDate } from '@/lib/flow/integrated-poc/execution';
import { programInputBlocksSnapshot, type ProgramEditorFlush } from '@/lib/flow/integrated-poc/document-action';
import { parseProgramLocation, programLocation, programNavigationMatchesDocument, programCheckpointForNavigation, readProgramNavigationCheckpoint, type ProgramNavigationCheckpoint, type ProgramSpaceNavigation, type ProgramDiscoveryNavigation } from '@/lib/flow/integrated-poc/navigation';
import { programErrorMessage, type ProgramDestination, type ProgramMutate, type ProgramNavigate } from '@/lib/flow/integrated-poc/ui-contract';
import { nextProgramMutationFeedback, programMutationFeedbackAfterNavigation, type ProgramMutationFeedback } from '@/lib/flow/integrated-poc/mutation-feedback';
import type { PersonalWorkspacePocReadModel, PersonalWorkspacePocState } from '@/lib/flow/personal-workspace-poc-contract';
import { ProgramSpace } from './ProgramSpace';
import { ProgramDiscovery, createProgramDiscoveryNavigationState, captureProgramDiscoveryPresentation, restoreProgramDiscoveryPresentation, programDiscoveryHasUnstoredInput, type ProgramDiscoveryNavigationState } from './ProgramDiscovery';
import { ProgramCommunity } from './ProgramCommunity';
import { emptyProgramCommunityPresentation, readProgramCommunityPresentation, type ProgramCommunityPresentation } from '@/lib/flow/integrated-poc/navigation';
import { ProgramPublisher } from './ProgramPublisher';
import { ProgramCopyInspector } from './ProgramCopyInspector';
import { ProgramRevisionHistory } from './ProgramRevisionHistory';
import { ProgramCreatorDraftLibrary } from './ProgramCreatorDraftLibrary';
import {readLegacyCreatorRecoveries,LEGACY_CREATOR_RECOVERY_KEY} from '@/lib/flow/integrated-poc/legacy-creator-recovery-codec';
import {prepareLegacyCreatorRecoveryHandoff} from '@/lib/flow/integrated-poc/legacy-creator-recovery-handoff';
import {commitLegacyCreatorRecoveryHandoff} from '@/lib/flow/integrated-poc/legacy-creator-recovery-controller';
import { ProgramPrivateOutput } from './ProgramPrivateOutput';
import { ProgramLegacyWorkspace } from './ProgramLegacyWorkspace';
import { ProgramCreatorWorkspace } from './ProgramCreatorWorkspace';
import styles from './ProgramApp.module.css';
import { programCheckpointForWritingTarget } from '@/lib/flow/integrated-poc/writing-navigation';

export { parseProgramLocation, programLocation } from '@/lib/flow/integrated-poc/navigation';
export function initialProgramData(): ProgramData {
  return prepareProgramInitialData().data;
}

export function ProgramApp({ savedCount, baseModel, legacyState, sourceCandidateStore }: { legacy: React.ReactNode; savedCount: number } & ProgramLegacyInput) {
  const controller = useRef<ProgramController | null>(null), current = useRef<ProgramControllerSnapshot | null>(null);
  const [snapshot, setSnapshot] = useState<ProgramControllerSnapshot | null>(null), [fatal, setFatal] = useState(false);
  const [destination, setDestination] = useState<ProgramDestination>({ view: 'space' }), destinationRef = useRef(destination); destinationRef.current = destination;
  const [{ status, failed }, setFeedback] = useState<ProgramMutationFeedback>({ status: '', failed: false }), [pending, setPending] = useState(0);
  const setStatus = useCallback((status: string) => setFeedback(previous => ({ failed: previous.failed, status })), []);
  const setFailed = useCallback((failed: boolean) => setFeedback(previous => ({ ...previous, failed })), []);
  const [discoveryStates, setDiscoveryStates] = useState<Record<string, ProgramDiscoveryNavigationState>>({});
  const discoveryStatesRef = useRef(discoveryStates);
  const discoveryInputRevision = useRef(0);
  const [communityStates, setCommunityStates] = useState<Record<string, ProgramCommunityPresentation>>({});
  const communityStatesRef = useRef(communityStates);
  const communityInputRevision = useRef(0);
  const emptyDiscoveryState = useMemo(createProgramDiscoveryNavigationState, [snapshot?.envelope.data.activeActorId]);
  const [publisher, setPublisher] = useState<string | null>(null), [inspector, setInspector] = useState<string | null>(null);
  const [revisionDocument, setRevisionDocument] = useState<string | null>(null);
  const [creatorLibraryOpen, setCreatorLibraryOpen] = useState(false);
  const [outputDocument, setOutputDocument] = useState<string | null>(null);
  const publicationRequest = useRef<string | null>(null);
  const editors = useRef<ProgramEditorFlush | null>(null), changingContext = useRef(false);
  const legacyEditors = useRef<ProgramEditorFlush | null>(null);
  const communityEditors = useRef<ProgramEditorFlush | null>(null), creatorEditors = useRef<ProgramEditorFlush | null>(null);
  const publisherEditors = useRef<ProgramEditorFlush | null>(null);
  const inspectorEditors = useRef<ProgramEditorFlush | null>(null);
  const deferredSnapshot = useRef<ProgramControllerSnapshot | null>(null), acceptingExternal = useRef(false);
  const [externalNotice, setExternalNotice] = useState(''), [confirmExternal, setConfirmExternal] = useState(false);
  const [presentationPending, setPresentationPending] = useState(false);
  const [presentationEpoch, setPresentationEpoch] = useState(0), [legacySeen, setLegacySeen] = useState(false);
  const [creatorSeen, setCreatorSeen] = useState(false), [creatorSelection, setCreatorSelection] = useState<string | undefined>();
  const settings = useRef<HTMLDetailsElement>(null);
  const [seen, setSeen] = useState({ space: true, discovery: false, community: false });
  const [discoverySelection, setDiscoverySelection] = useState<string | undefined>();
  const [communitySelection, setCommunitySelection] = useState<string | undefined>();
  const [communityView, setCommunityView] = useState<'community' | 'activity'>('community');
  const [legacyIssue, setLegacyIssue] = useState<string | null>(null);
  const inspectorDialog = useRef<HTMLDialogElement>(null);
  const positions = useRef(new Map<string, ProgramNavigationCheckpoint>());
  const spaceNavigation = useRef<ProgramSpaceNavigation | null>(null), restoringNavigation = useRef(false);
  // A queued click/scroll capture may run before React's restoration effect.
  // Keep an explicit navigation checkpoint authoritative through that gap.
  const pendingNavigation = useRef<{ actorId: string; location: string; checkpoint: ProgramNavigationCheckpoint | null } | null>(null);
  const discoveryNavigation = useRef<ProgramDiscoveryNavigation | null>(null);
  const main = useRef<HTMLElement>(null);
  const today = programLocalDate();
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (Object.values(discoveryStatesRef.current).some(programDiscoveryHasUnstoredInput)) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, []);
  useEffect(() => {
    if (['discover', 'flow'].includes(destination.view)) setDiscoverySelection(destination.view === 'flow' ? destination.id : undefined);
    if (['community', 'activity'].includes(destination.view)) { setCommunitySelection(destination.view === 'community' ? destination.id : undefined); setCommunityView(destination.view === 'activity' ? 'activity' : 'community'); }
  }, [destination]);
  useEffect(() => { if (inspector) inspectorDialog.current?.showModal(); }, [inspector]);
  const editorPorts = () => [editors.current, legacyEditors.current, communityEditors.current, creatorEditors.current, publisherEditors.current, inspectorEditors.current];
  const changed = useCallback((next: ProgramControllerSnapshot, context?: { external: boolean }) => {
    // A later local receipt must not accidentally present an earlier deferred
    // external deletion either. Protect every destructive presentation change.
    if (!acceptingExternal.current && current.current && programInputBlocksSnapshot(current.current.envelope.data, next.envelope.data, [editors.current, legacyEditors.current, communityEditors.current, creatorEditors.current, publisherEditors.current, inspectorEditors.current], context?.external === true || deferredSnapshot.current !== null)) {
      deferredSnapshot.current = next;
      setExternalNotice('다른 탭에서 인물이나 문서 상태가 바뀌었습니다. 작성 중인 입력을 보호하기 위해 이 화면은 유지했습니다.');
      return;
    }
    deferredSnapshot.current = null; setExternalNotice(''); setConfirmExternal(false);
    current.current = next; setSnapshot(next);
  }, []);
  function lockEditors() {
    const releases = editorPorts().map(port => port?.lockInput());
    return () => releases.reverse().forEach(release => release?.());
  }
  function recoveryInputBlocked(){
    return changingContext.current||deferredSnapshot.current!==null||presentationPending||editorPorts().some(port=>port?.hasPendingInput?.());
  }
  async function flushEditors() {
    for (const port of editorPorts()) if (port && !await port.flushAll()) return false;
    return !editorPorts().some(port => port?.hasPendingInput?.());
  }
  function downloadPendingInput() {
    const drafts = editorPorts().flatMap(port => port?.captureDrafts?.() ?? []);
    if (!drafts.length) { setStatus('보관할 작성 중 입력이 없습니다.'); return; }
    try {
      const payload = drafts.map(draft => `# ${draft.title}\n\n${draft.raw}`).join('\n\n-----\n\n');
      const url = URL.createObjectURL(new Blob([payload], { type: 'text/plain;charset=utf-8' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'FlowMe-작성중-입력.txt'; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setStatus('작성 중인 입력의 TXT 파일 받기를 요청했습니다. 입력은 화면에도 유지됩니다.');
    } catch { setFailed(true); setStatus('파일 받기를 시작하지 못했습니다. 본문에서 입력을 복사해 보관해 주세요.'); }
  }
  async function acceptExternalDiscard() {
    const store = controller.current; if (!store || changingContext.current) return;
    changingContext.current = true; acceptingExternal.current = true;
    const release = lockEditors();
    try {
      const result = await store.refresh();
      if (!result.ok) { setFatal(true); window.location.replace('/my'); return; }
      if (result.presentationPending) { setStatus('저장됨 · 화면 갱신 필요'); return; }
      changed(store.snapshot()); setPresentationEpoch(epoch => epoch + 1);
      setPublisher(null); setInspector(null); setRevisionDocument(null); setCreatorLibraryOpen(false); setOutputDocument(null);
      setFailed(false); setStatus('작성 중 입력을 버리고 최신 저장 상태를 열었습니다.');
    } finally { release(); acceptingExternal.current = false; changingContext.current = false; }
  }
  async function retryPresentation() {
    const store = controller.current; if (!store || changingContext.current) return;
    changingContext.current = true;
    try {
      const result = await store.refresh();
      if (!result.ok) { setFailed(true); setStatus(programErrorMessage(result.reason)); return; }
      setPresentationPending(result.presentationPending === true);
      if (!result.presentationPending) { setFailed(false); setStatus(deferredSnapshot.current ? '저장된 내용을 확인했습니다. 작성 중인 입력을 보호하기 위해 화면은 유지했습니다.' : '저장된 화면을 다시 확인했습니다.'); }
    } finally { changingContext.current = false; }
  }
  const rememberNavigation = useCallback(() => {
    const actorId = current.current?.envelope.data.activeActorId;
    if (!actorId || restoringNavigation.current || pendingNavigation.current || spaceNavigation.current?.actorId !== actorId) return;
    const location = programLocation(destinationRef.current);
    if (window.location.hash && window.location.hash !== location) return;
    const spacePresentation = spaceNavigation.current.capture();
    if (!programNavigationMatchesDocument(location, spacePresentation.space?.selected)) return;
    const discoveryState = discoveryStatesRef.current[actorId];
    const discoveryPresentation = discoveryNavigation.current?.actorId === actorId
      ? discoveryNavigation.current.capture()
      : discoveryState ? { discovery: captureProgramDiscoveryPresentation(discoveryState) ?? undefined } : {};
    const checkpoint: ProgramNavigationCheckpoint = { schema: 'flowme-navigation/1', actorId, location,
      scroll: window.scrollY, focus: document.activeElement instanceof HTMLElement ? document.activeElement.id || null : null,
      ...spacePresentation,
      ...discoveryPresentation,
      community: communityStatesRef.current[actorId] ?? emptyProgramCommunityPresentation() };
    positions.current.set(`${actorId}:${location}`, checkpoint);
    try { window.history.replaceState({ ...window.history.state, flowmeProgram: checkpoint }, '', window.location.href); } catch { /* Presentation recovery cannot block content saving. */ }
  }, []);
  const changeDiscoveryPresentation = useCallback((actorId: string, state: ProgramDiscoveryNavigationState) => {
    if (current.current?.envelope.data.activeActorId !== actorId) return;
    const presentation = captureProgramDiscoveryPresentation(state);
    if (!presentation) return;
    discoveryInputRevision.current += 1;
    // Raw URL, pasted text and output drafts remain in memory, never in history.
    discoveryStatesRef.current = { ...discoveryStatesRef.current, [actorId]: state };
    setDiscoveryStates(discoveryStatesRef.current);
    if (restoringNavigation.current || pendingNavigation.current) {
      const location = programLocation(destinationRef.current);
      const pending = pendingNavigation.current;
      const checkpoint = readProgramNavigationCheckpoint(pending?.actorId === actorId && pending.location === location
        ? pending.checkpoint : window.history.state?.flowmeProgram, actorId, location);
      if (checkpoint && window.location.hash === location) {
        const next = { ...checkpoint, discovery: presentation };
        if (pending?.actorId === actorId && pending.location === location) pending.checkpoint = next;
        positions.current.set(`${actorId}:${location}`, next);
        try { window.history.replaceState({ ...window.history.state, flowmeProgram: next }, '', window.location.href); } catch { /* Presentation only. */ }
      }
    } else rememberNavigation();
  }, [rememberNavigation]);
  const changeCommunityPresentation = useCallback((actorId: string, value: ProgramCommunityPresentation) => {
    const presentation = readProgramCommunityPresentation(value);
    if (!presentation || current.current?.envelope.data.activeActorId !== actorId) return;
    communityInputRevision.current += 1;
    communityStatesRef.current = { ...communityStatesRef.current, [actorId]: presentation };
    setCommunityStates(communityStatesRef.current);
    // Input/select changes must reach this history entry before a same-turn reload.
    // Waiting for a later click/keyup or pagehide loses native select/fill changes.
    if (restoringNavigation.current || pendingNavigation.current) {
      const location = programLocation(destinationRef.current);
      const pending = pendingNavigation.current;
      const checkpoint = readProgramNavigationCheckpoint(pending?.actorId === actorId && pending.location === location
        ? pending.checkpoint : window.history.state?.flowmeProgram, actorId, location);
      if (checkpoint && window.location.hash === location) {
        const next = { ...checkpoint, community: presentation };
        // Keep the in-flight navigation identity so its own finish releases it,
        // while preserving a newer input that arrived before the effect began.
        if (pending?.actorId === actorId && pending.location === location) pending.checkpoint = next;
        positions.current.set(`${actorId}:${location}`, next);
        try { window.history.replaceState({ ...window.history.state, flowmeProgram: next }, '', window.location.href); } catch { /* Presentation only. */ }
      }
    } else rememberNavigation();
  }, [rememberNavigation]);
  const allowOutputReturnNavigation = useCallback((next: ProgramDestination) => {
    const previous = destinationRef.current;
    if (previous.view === 'space' && previous.executionKey && programLocation(previous) !== programLocation(next)
      && editors.current?.hasPendingInput?.()) {
      setFailed(false); setStatus('작성 중인 입력을 적용하거나 취소한 뒤 이동해 주세요. 입력은 이 화면에 남아 있습니다.');
      return false;
    }
    return true;
  }, [setFailed, setStatus]);
  const scopeFeedbackToDestination = useCallback((next: ProgramDestination) => {
    const data = current.current?.envelope.data;
    if (!data) return;
    const copyId = next.view === 'space' && next.id ? data.spaces[data.activeActorId]?.copies.find(copy => copy.documentId === next.id)?.id : undefined;
    setFeedback(previous => programMutationFeedbackAfterNavigation(previous, data.activeActorId, programLocation(next), [next.id, next.replyId, next.versionId, copyId]));
  }, []);
  useEffect(() => {
    const hash = parseProgramLocation(window.location.hash); setDestination(hash);
    setSeen({ space: true, discovery: ['discover', 'flow'].includes(hash.view), community: ['community', 'activity'].includes(hash.view) });
    const prepared = prepareProgramInitialData({ baseModel, legacyState, sourceCandidateStore });
    if (prepared.legacyIssue?.split(', ').some(code => code.startsWith('invalid'))) { setFatal(true); window.location.replace('/my'); return; }
    setLegacyIssue(prepared.legacyIssue);
    const store = createProgramController({ storage: window.localStorage, initialData: prepared.data,
      exclusive: work => { if (!navigator.locks?.request) return Promise.reject(new Error('safe-storage-unavailable')); return navigator.locks.request(`${PROGRAM_STATE_KEY}:lock`, work); },
      onChange: (next, context) => { changed(next, context); setPresentationPending(false); },
      onPresentationError: () => setPresentationPending(true) });
    if (!store.ok) { setFatal(true); window.location.replace('/my'); return; }
    controller.current = store; changed(store.snapshot());
    const route = () => {
      const next = parseProgramLocation(window.location.hash);
      if (!allowOutputReturnNavigation(next)) {
        const actorId = current.current?.envelope.data.activeActorId, location = programLocation(destinationRef.current);
        const checkpoint = actorId ? positions.current.get(`${actorId}:${location}`) : null;
        window.history.replaceState(checkpoint ? { flowmeProgram: checkpoint } : null, '', location);
        return;
      }
      pendingNavigation.current = null;
      scopeFeedbackToDestination(next);
      destinationRef.current = next; setDestination(next);
      setSeen(previous => ({ space: true, discovery: previous.discovery || ['discover', 'flow'].includes(next.view), community: previous.community || ['community', 'activity'].includes(next.view) }));
    };
    const external = (event: StorageEvent) => { if (event.key === PROGRAM_STATE_KEY) void store.refresh().then(result => {
      if (!result.ok) {
        if ([editors.current, legacyEditors.current, communityEditors.current, creatorEditors.current, publisherEditors.current, inspectorEditors.current].some(port => port?.hasPendingInput?.())) { setExternalNotice('다른 탭의 저장 상태를 안전하게 읽지 못했습니다. 작성 중인 입력은 그대로 유지했습니다.'); setFailed(true); }
        else { setFatal(true); window.location.replace('/my'); }
      } else if (result.presentationPending) { setStatus('저장됨 · 화면 갱신 필요'); setFailed(false); }
      else if (!deferredSnapshot.current) { setStatus('다른 탭의 저장 내용을 불러왔습니다.'); setFailed(false); }
    }); };
    window.addEventListener('hashchange', route); window.addEventListener('popstate', route); window.addEventListener('storage', external);
    return () => { window.removeEventListener('hashchange', route); window.removeEventListener('popstate', route); window.removeEventListener('storage', external); controller.current = null; };
  }, [changed, baseModel, legacyState, sourceCandidateStore, allowOutputReturnNavigation, scopeFeedbackToDestination]);
  useEffect(() => { if (destination.view === 'legacy') setLegacySeen(true); }, [destination.view]);
  useEffect(() => { if (destination.view === 'creator') { setCreatorSeen(true); setCreatorSelection(destination.id); } }, [destination]);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => { if (settings.current?.open && !settings.current.contains(event.target as Node)) settings.current.open = false; };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && settings.current?.open) { settings.current.open = false; settings.current.querySelector('summary')?.focus(); } };
    window.addEventListener('pointerdown', closeOutside); window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('pointerdown', closeOutside); window.removeEventListener('keydown', escape); };
  }, []);
  useEffect(() => {
    let frame = 0;
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    const schedule = () => { if (frame) cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { frame = 0; rememberNavigation(); }); };
    const events = ['scroll', 'focusin', 'select', 'keyup', 'click', 'blur'];
    events.forEach(event => window.addEventListener(event, schedule, true));
    window.addEventListener('pagehide', rememberNavigation);
    return () => { if (frame) cancelAnimationFrame(frame); events.forEach(event => window.removeEventListener(event, schedule, true)); window.removeEventListener('pagehide', rememberNavigation); window.history.scrollRestoration = previousScrollRestoration; };
  }, [rememberNavigation]);
  useEffect(() => {
    const actorId = snapshot?.envelope.data.activeActorId; if (!actorId) return;
    const location = programLocation(destination);
    const pendingAtStart = pendingNavigation.current;
    const checkpoint = readProgramNavigationCheckpoint(pendingAtStart?.actorId === actorId && pendingAtStart.location === location
      ? pendingAtStart.checkpoint : window.history.state?.flowmeProgram, actorId, location);
    const communityRevisionAtStart = communityInputRevision.current;
    const discoveryRevisionAtStart = discoveryInputRevision.current;
    restoringNavigation.current = true;
    let second = 0, finish = 0;
    const first = requestAnimationFrame(() => {
      if (checkpoint) {
        if (communityInputRevision.current === communityRevisionAtStart) {
          const community = checkpoint.community ?? emptyProgramCommunityPresentation();
          communityStatesRef.current = { ...communityStatesRef.current, [actorId]: community };
          setCommunityStates(communityStatesRef.current);
        }
        spaceNavigation.current?.restore(checkpoint);
        if (discoveryInputRevision.current === discoveryRevisionAtStart) {
          if (discoveryNavigation.current?.actorId === actorId) discoveryNavigation.current.restore(checkpoint);
          else {
            // Space reload does not mount discovery. Preserve its validated presentation
            // before rememberNavigation replaces history; transient raw never enters it.
            const restored = restoreProgramDiscoveryPresentation(discoveryStatesRef.current[actorId] ?? createProgramDiscoveryNavigationState(), checkpoint, actorId);
            if (restored) {
              discoveryStatesRef.current = { ...discoveryStatesRef.current, [actorId]: restored };
              setDiscoveryStates(discoveryStatesRef.current);
            }
          }
        }
      }
      second = requestAnimationFrame(() => {
        // An explicit public item/reply is focused by its own surface. A stale
        // checkpoint (often program-main from the previous view) must not steal it.
        const explicitTarget = destination.view === 'flow' && destination.versionId && destination.itemId
          ? document.getElementById(`program-public-item-${encodeURIComponent(destination.versionId)}-${encodeURIComponent(destination.itemId)}`)
          : destination.view === 'community' && destination.replyId ? document.getElementById(`reply-${destination.replyId}`) : null;
        if (checkpoint?.focus && !explicitTarget) document.getElementById(checkpoint.focus)?.focus({ preventScroll: true });
        else if (!destination.replyId && !destination.itemId) main.current?.focus({ preventScroll: true });
        if (!destination.replyId && !destination.itemId) window.scrollTo({ top: checkpoint?.scroll ?? 0, behavior: 'instant' });
        finish = requestAnimationFrame(() => {
          if (pendingNavigation.current === pendingAtStart) pendingNavigation.current = null;
          restoringNavigation.current = false; rememberNavigation();
        });
      });
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); cancelAnimationFrame(finish); restoringNavigation.current = false; };
  }, [destination, snapshot?.envelope.data.activeActorId, rememberNavigation]);
  const navigate: ProgramNavigate = useCallback((next, options) => {
    // This route owns a conditional editor: unlike the retained main surfaces,
    // leaving it would unmount an explicit, unapplied occurrence-date draft.
    if (!allowOutputReturnNavigation(next)) return;
    if (settings.current) settings.current.open = false;
    rememberNavigation();
    const actorId = current.current?.envelope.data.activeActorId;
    let checkpoint = actorId ? programCheckpointForNavigation(positions.current.get(`${actorId}:${programLocation(next)}`),
      positions.current.get(`${actorId}:${programLocation(destinationRef.current)}`), actorId, next) : null;
    if (options?.writingLineId) {
      const data = current.current?.envelope.data;
      checkpoint = data ? programCheckpointForWritingTarget(data, next, options.writingLineId, checkpoint) : null;
      if (!checkpoint) return;
    }
    if (actorId) pendingNavigation.current = { actorId, location: programLocation(next), checkpoint };
    if (options?.replace) window.history.replaceState(checkpoint ? { flowmeProgram: checkpoint } : null, '', programLocation(next));
    else if (programLocation(next) !== window.location.hash) window.history.pushState(checkpoint ? { flowmeProgram: checkpoint } : null, '', programLocation(next));
    else if (next.view === 'space' && next.id) window.history.replaceState(checkpoint ? { flowmeProgram: checkpoint } : null, '', programLocation(next));
    scopeFeedbackToDestination(next);
    destinationRef.current = next;
    setDestination(next); setSeen(previous => ({ space: true, discovery: previous.discovery || ['discover', 'flow'].includes(next.view), community: previous.community || ['community', 'activity'].includes(next.view) }));
  }, [rememberNavigation, allowOutputReturnNavigation, scopeFeedbackToDestination]);
  // A retained creator may finish after navigation. Only the exact route visit
  // that initiated the selection may commit its URL (even away-and-back is stale).
  function captureCreatorRoute() {
    const visit = destinationRef.current, actor = current.current?.envelope.data.activeActorId;
    return (id: string | undefined, replace: boolean) => {
      if (visit.view !== 'creator' || destinationRef.current !== visit || current.current?.envelope.data.activeActorId !== actor) return false;
      navigate({ view: 'creator', ...(id ? { id } : {}) }, { replace });
      return true;
    };
  }
  const mutate: ProgramMutate = useCallback(async (label, build, options) => {
    const store = controller.current, actorId = current.current?.envelope.data.activeActorId;
    if (!store || !actorId) return { ok: false, reason: 'storage-unavailable' };
    if (deferredSnapshot.current) return { ok: false, reason: 'conflict' };
    const location = programLocation(destinationRef.current);
    setPending(value => value + 1);
    try {
      const result = await store.mutate(label, build, { actorId, ...options });
      setFeedback(previous => nextProgramMutationFeedback(previous, label, result, options?.history === false, { actorId, location }));
      scopeFeedbackToDestination(destinationRef.current);
      return result;
    } finally { setPending(value => Math.max(0, value - 1)); }
  }, [scopeFeedbackToDestination]);
  async function history(action: 'undo' | 'redo') {
    const store = controller.current, actorId = current.current?.envelope.data.activeActorId; if (!store || !actorId) return;
    if (changingContext.current) return;
    changingContext.current = true; setPending(value => value + 1);
    const releaseInput = lockEditors();
    try {
      if (!await flushEditors()) { setFailed(true); setStatus('저장되지 않은 입력이 남아 있어 되돌리지 않았습니다. 편집 화면에서 다시 저장해 주세요.'); return; }
      if (current.current?.envelope.data.activeActorId !== actorId) { setFailed(true); setStatus(programErrorMessage('conflict')); return; }
      const result = await store[action](actorId); setFailed(!result.ok); setStatus(result.ok ? result.presentationPending ? '저장됨 · 화면 갱신 필요' : result.changed ? action === 'undo' ? '이전 개인 상태로 되돌렸습니다.' : '변경을 다시 실행했습니다.' : '더 이상 되돌릴 변경이 없습니다.' : programErrorMessage(result.reason));
    } finally { releaseInput?.(); changingContext.current = false; setPending(value => Math.max(0, value - 1)); }
  }
  async function switchActor(nextId: string) {
    if (changingContext.current) return;
    changingContext.current = true;
    rememberNavigation();
    const releaseInput = lockEditors();
    const previousActor = current.current?.envelope.data.activeActorId;
    const requestedReturn = destinationRef.current;
    try {
      if (!await flushEditors()) { setFailed(true); setStatus('저장되지 않은 입력이 남아 있어 인물을 바꾸지 않았습니다. 편집 화면에서 다시 저장해 주세요.'); return; }
      const result = await mutate('예시 인물 전환', currentData => {
        if (currentData.activeActorId !== previousActor) return programFailure(currentData, 'conflict');
        if (!currentData.actors.some(actor => actor.id === nextId)) return programFailure(currentData, 'forbidden');
        return programResult(currentData, { ...programClone(currentData), activeActorId: nextId }, nextId);
      }, { history: false });
      if (result.ok) {
        setPublisher(null); setInspector(null); setRevisionDocument(null); setCreatorLibraryOpen(false); setOutputDocument(null);
        navigate(requestedReturn.view === 'space' && requestedReturn.returnActorId === nextId && requestedReturn.executionKey ? requestedReturn : { view: 'space' });
      }
    } finally { releaseInput?.(); changingContext.current = false; }
  }
  async function startText(raw: string, title: string): Promise<boolean> {
    const actorId = current.current?.envelope.data.activeActorId; if (!actorId) return false;
    const result = await mutate('원문 문서 만들기', data => createProgramDocument(data, { actorId, requestId: programId('request'), expectedSpace: data.spaces[actorId], title, raw }));
    if (result.ok) navigate({ view: 'space', id: result.result }); return result.ok;
  }
  async function useVersion(versionId: string, itemIds: string[], anchor: string | null, recurrenceStarts?: Record<string, string>): Promise<boolean> {
    const actorId = current.current?.envelope.data.activeActorId; if (!actorId) return false;
    const requestId = programId('request');
    const result = await mutate('개인 Flow 가져오기', data => importProgramPublicVersion(data, { actorId, requestId, expectedSpace: data.spaces[actorId], versionId, itemIds, anchor,
      ...(recurrenceStarts && Object.keys(recurrenceStarts).length ? { recurrenceStarts } : {}) }));
    if (result.ok) { const copy = current.current?.envelope.data.spaces[actorId].copies.find(row => row.id === result.result); if (copy) navigate({ view: 'space', id: copy.documentId }); }
    return result.ok;
  }
  useEffect(() => {
    if (destination.view !== 'space' || destination.action !== 'publish' || !destination.id || !snapshot) return;
    const location = programLocation(destination), actorId = snapshot.envelope.data.activeActorId, documentId = destination.id;
    if (publicationRequest.current === `${actorId}:${location}`) return;
    publicationRequest.current = `${actorId}:${location}`;
    const releaseInput = lockEditors();
    void (async () => {
      try {
        if (!await flushEditors()) { setFailed(true); setStatus('입력을 저장하지 못해 공개 편집을 열지 않았습니다. 입력은 그대로 남아 있습니다.'); return; }
        if (current.current?.envelope.data.activeActorId !== actorId || programLocation(destinationRef.current) !== location) return;
        const space = current.current.envelope.data.spaces[actorId];
        if (!space.text.documents.concat(space.text.flows).some(doc => doc.id === documentId) || space.archivedDocumentIds.includes(documentId)) { setFailed(true); setStatus('원래 문서가 없거나 보관되어 있습니다. 문서를 먼저 복원해 주세요.'); return; }
        setPublisher(documentId);
      } finally {
        releaseInput?.();
        if (programLocation(destinationRef.current) === location) {
          const next: ProgramDestination = { view: 'space', id: documentId };
          window.history.replaceState(null, '', programLocation(next)); destinationRef.current = next; setDestination(next);
        }
        publicationRequest.current = null;
      }
    })();
  }, [destination, snapshot?.envelope.data.activeActorId]);
  if (!snapshot) return <main className={styles.loading} aria-busy="true">{fatal ? '기존 내 계획으로 돌아갑니다.' : '작업 공간을 불러오는 중입니다.'}</main>;
  const data = snapshot.envelope.data, browse = ['discover', 'flow', 'community'].includes(destination.view);
  const outputReturn = destination.view === 'space' && destination.returnActorId && destination.executionKey ? destination : undefined;
  const outputActorMismatch = !!outputReturn && outputReturn.returnActorId !== data.activeActorId;
  // A deferred editor callback from a previous actor must not write as the new actor.
  const scopedMutate: ProgramMutate = (label, build, options) => mutate(label, fresh => fresh.activeActorId === data.activeActorId ? build(fresh) : programFailure(fresh, 'conflict'), options);
  // showModal makes page siblings inert. Keep the existing recovery decision
  // inside the inspector while it owns the active modal, never in both places.
  const externalRecovery = externalNotice ? <section className={styles.inputRecovery} aria-label="다른 탭 변경과 입력 보호"><p role="alert">{externalNotice}</p>
    <p>현재 입력은 아직 이 편집 화면에만 있습니다. 본문을 복사하거나 파일로 보관한 뒤 최신 상태를 열 수 있습니다.</p>
    <div><button onClick={downloadPendingInput}>작성 중 입력 TXT 받기</button><button onClick={() => setConfirmExternal(true)}>입력 버리고 최신 상태 보기</button></div>
    {confirmExternal && <div><p>아직 저장하지 못한 입력을 버릴까요? 이미 저장된 다른 탭의 내용은 변경하지 않습니다.</p><button onClick={() => void acceptExternalDiscard()}>버리고 불러오기</button><button onClick={() => setConfirmExternal(false)}>입력 유지</button></div>}
  </section> : null;
  return <div className={styles.app} data-testid="integrated-program-app">
    <a className={styles.skip} href="#program-main" onClick={event => { event.preventDefault(); main.current?.focus(); }}>본문으로</a>
    <header className={styles.header}><a className={styles.brand} href="#flowme/space" onClick={event => { event.preventDefault(); navigate({ view: 'space' }); }}>FlowMe</a>
      <nav aria-label="주요 메뉴"><button aria-current={destination.view === 'space' ? 'page' : undefined} onClick={() => navigate({ view: 'space' })}>내 공간</button><button aria-current={browse ? 'page' : undefined} onClick={() => navigate({ view: data.public.posts.length ? 'community' : 'discover' })}>둘러보기</button><button aria-current={['activity', 'creator'].includes(destination.view) ? 'page' : undefined} onClick={() => navigate({ view: 'activity' })}>내 활동</button></nav>
      <div className={styles.headerTools}><button onClick={() => void history('undo')} disabled={pending > 0 || !snapshot.envelope.undo[data.activeActorId]?.length}>되돌리기</button><details ref={settings}><summary>PoC 설정</summary><div className={styles.settings}><p>이 기기에만 저장하는 PoC입니다. 인물 전환은 로컬 시뮬레이션이며 실제 계정 인증이 아닙니다.</p><label>예시 인물<select disabled={pending > 0} value={data.activeActorId} onChange={event => void switchActor(event.target.value)}>{data.actors.map(actor => <option value={actor.id} key={actor.id}>{actor.name}</option>)}</select></label>{data.activeActorId === 'local-user' && <button onClick={() => { if (settings.current) settings.current.open = false; setCreatorLibraryOpen(true); }}>기존 제작 초안 가져오기</button>}<button onClick={() => navigate({ view: 'legacy' })}>기존 제작·실행 도구 ({savedCount})</button></div></details></div>
    </header>
    <div className={styles.localNotice}>통합 PoC · 이 기기에 저장</div>
    <p className={failed ? styles.failure : styles.status} role={failed ? 'alert' : 'status'} aria-live="polite">{pending ? '저장 중…' : status}</p>
    {!inspector && !publisher && externalRecovery}
    {presentationPending && <section className={styles.legacyNotice} role="alert" aria-label="저장 후 화면 복구">
      <p>저장된 내용은 보존됐지만 화면 갱신을 완료하지 못했습니다. 작성 중인 입력은 유지하며, 화면을 다시 확인하기 전에는 새 변경을 저장하지 않습니다.</p>
      <button onClick={() => void retryPresentation()}>저장된 화면 다시 확인</button>
      <button onClick={downloadPendingInput}>작성 중 입력 파일로 보관</button>
    </section>}
    {browse && <nav className={styles.browseNav} aria-label="둘러보기 종류"><button aria-current={destination.view === 'community' ? 'page' : undefined} onClick={() => navigate({ view: 'community' })}>경험·질문·지식</button><button aria-current={['discover', 'flow'].includes(destination.view) ? 'page' : undefined} onClick={() => navigate({ view: 'discover' })}>Flow 찾기</button></nav>}
    {['activity', 'creator'].includes(destination.view) && <nav className={styles.browseNav} aria-label="내 활동 종류"><button aria-current={destination.view === 'activity' ? 'page' : undefined} onClick={() => navigate({ view: 'activity' })}>활동·공개 관리</button><button aria-current={destination.view === 'creator' ? 'page' : undefined} onClick={() => navigate({ view: 'creator' })}>제작 초안</button></nav>}
    <main id="program-main" ref={main} tabIndex={-1} className={styles.main}>
      {!outputActorMismatch && destination.view === 'space' && data.activeActorId === 'local-user' && (legacyIssue || (savedCount > 0 && !data.spaces['local-user'].legacySnapshot)) && <aside className={styles.legacyNotice}>
        <p>{legacyIssue ? '기존 계획에 아직 새 문서와 연결하지 못한 반복·묶음 또는 판본이 있습니다. 기존 도구의 내용을 유지합니다.' : '이 기기의 기존 계획을 새 개인 문서에서도 사용할 수 있습니다.'}</p>
        {!legacyIssue && <button onClick={() => void mutate('기존 계획 연결', fresh => hydrateProgramLegacy(fresh, baseModel, legacyState, { actorId: 'local-user', sourceCandidateStore }))}>기존 계획 연결</button>}
        <button onClick={() => navigate({ view: 'legacy' })}>기존 계획 확인</button>
      </aside>}
      <div hidden={destination.view !== 'space'}>{outputActorMismatch ? <section className={styles.legacyNotice} role="status" aria-label="출력 링크의 인물 확인">
        <p>이 링크를 만든 인물과 현재 선택한 인물이 다릅니다. 개인 내용은 열지 않았습니다. 같은 브라우저에서 원래 인물을 직접 선택해 주세요.</p>
        <button onClick={() => navigate({ view: 'space' })}>현재 내 공간으로</button>
      </section> : <ProgramSpace key={`${data.activeActorId}:${presentationEpoch}`} data={data} mutate={scopedMutate} navigate={navigate} today={today} selectedDocumentId={destination.view === 'space' ? destination.id : undefined} outputReturn={outputReturn} onUndo={() => history('undo')} onRedo={() => history('redo')} onPublishDocument={setPublisher} onInspectCopy={setInspector} onRevisionHistory={setRevisionDocument} onOutputDocument={setOutputDocument} onRegisterEditors={registered => { editors.current = registered; }} onRegisterNavigation={registered => { spaceNavigation.current = registered; }} />}</div>
      {seen.discovery && <div hidden={!['discover', 'flow'].includes(destination.view)}><ProgramDiscovery key={`${data.activeActorId}:${presentationEpoch}`} data={data} mutate={scopedMutate} navigate={navigate} today={today} selectedFlowId={discoverySelection} selectedVersionId={destination.view === 'flow' ? destination.versionId : undefined} selectedItemId={destination.view === 'flow' ? destination.itemId : undefined} selectedOutputReturn={destination.view === 'flow' ? destination.publicOutputReturn : undefined} onStartText={startText} onUseVersion={useVersion} navigationState={discoveryStates[data.activeActorId] ?? emptyDiscoveryState} onNavigationStateChange={state => changeDiscoveryPresentation(data.activeActorId, state)} onRegisterNavigation={registered => { discoveryNavigation.current = registered; }} /></div>}
      {seen.community && <div hidden={!['community', 'activity'].includes(destination.view)}><ProgramCommunity key={`${data.activeActorId}:${presentationEpoch}`} data={data} mutate={scopedMutate} navigate={navigate} today={today} view={communityView} selectedPostId={communitySelection} selectedReplyId={destination.view === 'community' ? destination.replyId : undefined} presentation={communityStates[data.activeActorId] ?? emptyProgramCommunityPresentation()} onPresentationChange={value => changeCommunityPresentation(data.activeActorId, value)} onRegisterEditors={registered => { communityEditors.current = registered; }} /></div>}
      {(legacySeen || destination.view === 'legacy') && <div hidden={destination.view !== 'legacy'}><ProgramLegacyWorkspace key={`${data.activeActorId}:${presentationEpoch}`} data={data} mutate={scopedMutate} navigate={navigate} onUndo={() => history('undo')} today={today} selectedFlowId={destination.view === 'legacy' ? destination.id : undefined} onRegisterEditors={registered => { legacyEditors.current = registered; }} /></div>}
      {(creatorSeen || destination.view === 'creator') && <div hidden={destination.view !== 'creator'}><ProgramCreatorWorkspace key={`${data.activeActorId}:${presentationEpoch}`} data={data} mutate={scopedMutate} navigate={navigate} today={today} active={destination.view === 'creator'} selectedDraftId={destination.view === 'creator' ? destination.id : creatorSelection} captureRoute={captureCreatorRoute} onRegisterEditors={registered => { creatorEditors.current = registered; }} /></div>}
    </main>
    {publisher && <ProgramPublisher key={`${data.activeActorId}:${publisher}`} data={data} mutate={scopedMutate} navigate={navigate} today={today} documentId={publisher} externalRecovery={externalRecovery} onClose={() => setPublisher(null)} onRegisterEditors={registered => { publisherEditors.current = registered; }} />}
    {revisionDocument && <ProgramRevisionHistory key={`${data.activeActorId}:${revisionDocument}`} data={data} mutate={scopedMutate} today={today} documentId={revisionDocument} onClose={() => setRevisionDocument(null)} />}
    {creatorLibraryOpen && <ProgramCreatorDraftLibrary key={data.activeActorId} data={data} mutate={scopedMutate} onClose={() => setCreatorLibraryOpen(false)} onOpenDocument={id => { setCreatorLibraryOpen(false); navigate({ view: 'space', id }); }} onOpenCreatorDraft={id => { setCreatorLibraryOpen(false); navigate({ view: 'creator', id }); }}
      recovery={{inputBlocked:recoveryInputBlocked(),read:()=>{try{return readLegacyCreatorRecoveries(window.localStorage);}catch{return{kind:'unavailable',raw:null};}},
        prepare:(loaded,candidate)=>{const currentData=current.current?.envelope.data;if(!currentData||recoveryInputBlocked())return{ok:false,reason:'pending-input'};
          return prepareLegacyCreatorRecoveryHandoff(currentData,{actorId:data.activeActorId,requestId:programId('recovery-request'),targetDraftId:programId('creator'),selection:{draftId:candidate.draftId,recoveryId:candidate.recoveryId},now:new Date().toISOString()},loaded.raw);},
        handoff:request=>commitLegacyCreatorRecoveryHandoff(request,{current:()=>current.current?.envelope.data??null,blocked:recoveryInputBlocked,lockInput:lockEditors,mutate:scopedMutate,readSource:()=>window.localStorage.getItem(LEGACY_CREATOR_RECOVERY_KEY)}),
        onContinueCurrent:()=>{const id=current.current?.envelope.data.spaces[data.activeActorId]?.creatorWorkspace?.working?.draftId;setCreatorLibraryOpen(false);navigate({view:'creator',...(id?{id}:{})});}}}/>} 
    {outputDocument && <ProgramPrivateOutput key={`${data.activeActorId}:${outputDocument}`} data={data} documentId={outputDocument} onClose={() => setOutputDocument(null)} />}
    {inspector && <dialog className={styles.inspectorDialog} ref={inspectorDialog} onCancel={event => { event.preventDefault(); if (!inspectorEditors.current?.hasPendingInput?.()) setInspector(null); }}>{externalRecovery}<ProgramCopyInspector key={`${data.activeActorId}:${inspector}`} data={data} mutate={scopedMutate} navigate={next => { setInspector(null); navigate(next); }} today={today} copyId={inspector} onClose={() => setInspector(null)} onRegisterEditors={registered => { inspectorEditors.current = registered; }} /></dialog>}
  </div>;
}
