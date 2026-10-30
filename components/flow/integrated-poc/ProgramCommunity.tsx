'use client';

import React, { useEffect, useRef, useState } from 'react';
import { programClone, programId, type ProgramData, type ProgramParticipationDraft, type ProgramPost, type ProgramReply } from '../../../lib/flow/integrated-poc/contract';
import { deleteProgramPost, deleteProgramReply, listProgramActivity, programPostEditToken, programReplyEditToken, toggleProgramReaction } from '../../../lib/flow/integrated-poc/community';
import { programPostFlowDestination, programReplyDestination, readProgramPublishingActivity } from '../../../lib/flow/integrated-poc/publishing-activity';
import { programErrorMessage, type ProgramMutate, type ProgramNavigate } from '../../../lib/flow/integrated-poc/ui-contract';
import type { ProgramEditorFlush } from '../../../lib/flow/integrated-poc/document-action';
import { programSame } from '../../../lib/flow/integrated-poc/controller';
import { ProgramProposalReview } from './ProgramProposalReview';
import { ProgramCommunityImage } from './ProgramCommunityImage';
import type { ProgramCommunityMediaPort } from '../../../lib/flow/integrated-poc/community-media';
import styles from './ProgramCommunity.module.css';
import { emptyProgramCommunityPresentation, type ProgramCommunityPresentation } from '../../../lib/flow/integrated-poc/navigation';

export type ProgramCommunityProps = {
  data: ProgramData; mutate: ProgramMutate; navigate: ProgramNavigate;
  view: 'community' | 'activity'; selectedPostId?: string; selectedReplyId?: string; today: string;
  onRegisterEditors?: (editors: ProgramEditorFlush | null) => void;
  presentation?: ProgramCommunityPresentation;
  onPresentationChange?: (value: ProgramCommunityPresentation) => void;
  storageScope?: 'local' | 'account';
  mediaPort?: ProgramCommunityMediaPort;
};
const kinds = { question: '질문', experience: '경험', knowledge: '지식', reply: '답글' };
const utcNow = () => new Date().toISOString();
async function guardedMutation(mutate: ProgramMutate, ...args: Parameters<ProgramMutate>) {
  try { return await mutate(...args); } catch { return { ok: false as const, reason: 'storage-unavailable' }; }
}

import { newProgramParticipationDraft, saveProgramParticipationDraft, discardProgramParticipationDraft, submitProgramParticipation } from '../../../lib/flow/integrated-poc/participation-editor';
export { newProgramParticipationDraft, saveProgramParticipationDraft, discardProgramParticipationDraft, submitProgramParticipation } from '../../../lib/flow/integrated-poc/participation-editor';

function stamp(value: string) { return value.slice(0, 10); }
function author(data: ProgramData, id: string) { return data.actors.find(actor => actor.id === id)?.name ?? '알 수 없는 작성자'; }
function postTitle(data: ProgramData, id: string) { return data.public.posts.find(post => post.id === id)?.title ?? '연결된 글을 찾을 수 없어요'; }

export function ProgramCommunity(props: ProgramCommunityProps) {
  return <CommunityBody key={props.data.activeActorId} {...props} />;
}
function CommunityBody({ data, mutate, navigate, view, selectedPostId, selectedReplyId, onRegisterEditors, presentation, onPresentationChange, storageScope = 'local', mediaPort }: ProgramCommunityProps) {
  const actorId = data.activeActorId;
  const [localPresentation, setLocalPresentation] = useState(emptyProgramCommunityPresentation);
  const currentPresentation = presentation ?? localPresentation, { query, kind } = currentPresentation;
  const changePresentation = (patch: Partial<ProgramCommunityPresentation>) => { const next = { ...currentPresentation, ...patch }; setLocalPresentation(next); onPresentationChange?.(next); };
  const setQuery = (query: string) => changePresentation({ query: query.slice(0, 3000) });
  const setKind = (kind: string) => changePresentation({ kind: kind as ProgramCommunityPresentation['kind'] });
  const [draft, setDraft] = useState<ProgramParticipationDraft | null>(null), [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saveState, setSaveState] = useState('');
  const [readingMedia, setReadingMedia] = useState(false);
  const [locked, setLocked] = useState(false), [draftConflict, setDraftConflict] = useState(false);
  const draftEntryDisabled = busy || readingMedia || locked;
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'post' | 'reply'; id: string } | null>(null);
  const [discarding, setDiscarding] = useState(false), [conflict, setConflict] = useState(false);
  const draftRef = useRef(draft), bodyRef = useRef<HTMLTextAreaElement>(null), composeRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLInputElement>(null), savedDraftRef = useRef<ProgramParticipationDraft | null>(null);
  const composing = useRef(false), lockCount = useRef(0), mediaPending = useRef(false);
  const mediaUpload = useRef<AbortController | null>(null);
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const saveFlights = useRef(0);
  const reviewPorts = useRef(new Map<string, ProgramEditorFlush>());
  const currentDraft = () => draftRef.current ? { ...draftRef.current,
    title: titleRef.current?.value ?? draftRef.current.title, body: bodyRef.current?.value ?? draftRef.current.body,
    media: draftRef.current.media.map(media => {
      const input = [...(composeRef.current?.querySelectorAll<HTMLInputElement>('input[data-participation-media]') ?? [])].find(node => node.dataset.participationMedia === media.id);
      return input ? { ...media, alt: input.value } : media;
    }) } : null;
  const draftPending = () => composing.current || mediaPending.current || !!draftRef.current && !programSame(currentDraft(), savedDraftRef.current);
  const hasPendingInput = () => draftPending() || [...reviewPorts.current.values()].some(port => port.hasPendingInput?.());
  async function flushCurrentDraft() {
    if (composing.current || mediaPending.current) return false;
    let waiting: Promise<boolean>;
    do { waiting = queue.current; await waiting; } while (waiting !== queue.current);
    const value = currentDraft();
    if (value && draftPending() && !await save(value)) return false;
    return !draftPending();
  }
  async function parkDraft() {
    if (lockCount.current || busy || composing.current || mediaPending.current) return;
    lockCount.current++; setLocked(true);
    try { if (await flushCurrentDraft()) { draftRef.current = null; savedDraftRef.current = null; setDraft(null); } }
    finally { lockCount.current--; setLocked(lockCount.current > 0); }
  }
  useEffect(() => {
    const port: ProgramEditorFlush = {
      hasPendingInput,
      captureDrafts: () => { const value = currentDraft(); return [...(value ? [{ title: value.title || kinds[value.kind], raw: JSON.stringify(value, null, 2) }] : []), ...[...reviewPorts.current.values()].flatMap(port => port.captureDrafts?.() ?? [])]; },
      captureSocialDrafts: () => { const value = currentDraft(); return [...(value ? [{ kind: 'participation' as const, value: programClone(value) }] : []), ...[...reviewPorts.current.values()].flatMap(port => port.captureSocialDrafts?.() ?? [])]; },
      acceptConfirmedSocialDrafts: next => {
        if (next.activeActorId !== actorId || composing.current || mediaPending.current || saveFlights.current || lockCount.current) return false;
        let accepted = false;
        const value = currentDraft(), stored = value && next.spaces[actorId]?.participationDrafts.find(entry => entry.id === value.id);
        if (value && stored && programSame(value, stored) && !programSame(savedDraftRef.current, stored)) {
          savedDraftRef.current = programClone(stored); setDraftConflict(false); setError('');
          setSaveState(storageScope === 'account' ? '계정에 초안 저장됨' : '이 기기에 저장됨'); accepted = true;
        }
        for (const child of reviewPorts.current.values()) if (child.acceptConfirmedSocialDrafts?.(next)) accepted = true;
        return accepted;
      },
      lockInput: () => { lockCount.current++; setLocked(true); const releases = [...reviewPorts.current.values()].map(port => port.lockInput()); let released = false; return () => { if (released) return; released = true; releases.reverse().forEach(release => release()); lockCount.current--; setLocked(lockCount.current > 0); }; },
      flushAll: async () => { if (!await flushCurrentDraft()) return false; for (const port of reviewPorts.current.values()) if (!await port.flushAll()) return false; return !hasPendingInput(); },
      blocksExternalSnapshot: (before, next) => [...reviewPorts.current.values()].some(port => port.hasPendingInput?.() && port.blocksExternalSnapshot?.(before, next)),
    };
    onRegisterEditors?.(port); return () => onRegisterEditors?.(null);
  }, [onRegisterEditors]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (hasPendingInput()) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, []);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; mediaUpload.current?.abort(); }; }, []);
  useEffect(() => {
    if (!draft) return;
    bodyRef.current?.focus(); bodyRef.current?.setSelectionRange(draft.cursor.start, draft.cursor.end);
    composeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [draft?.id]);
  const post = data.public.posts.find(entry => entry.id === selectedPostId);
  const selectedReply = selectedReplyId ? data.public.replies.find(reply => reply.id === selectedReplyId && reply.postId === selectedPostId) : undefined;
  useEffect(() => {
    if (view !== 'community' || !selectedReply) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(`reply-${selectedReply.id}`);
      target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [view, selectedPostId, selectedReply?.id]);
  const drafts = data.spaces[actorId]?.participationDrafts ?? [];
  const latestDraft = drafts.find(entry => entry.id === draft?.id) ?? null;
  const activity = listProgramActivity(data, actorId);
  const publishingActivity = readProgramPublishingActivity(data, actorId);
  const posts = data.public.posts.filter(entry => !entry.deleted && (kind === 'all' || kind === entry.kind)
    && `${entry.title} ${entry.body} ${entry.topic}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function save(next: ProgramParticipationDraft) {
    setSaveState('저장 중…');
    saveFlights.current++;
    queue.current = queue.current.catch(() => false).then(async () => {
      try {
        const expected = savedDraftRef.current;
        const outcome = await mutate('작성 중인 글 저장', current => saveProgramParticipationDraft(current, actorId, next, { expected }), { groupId: next.id, history: false, alphaSocial: { type: 'participation-save', draft: next, expected } });
        if (outcome.ok) savedDraftRef.current = programClone(next);
        if (mounted.current) { setSaveState(outcome.ok ? storageScope === 'account' ? '계정에 초안 저장됨' : '이 기기에 저장됨' : '저장하지 못했어요'); if (!outcome.ok) { setError(programErrorMessage(outcome.reason)); setDraftConflict(outcome.reason === 'conflict'); } else { setDraftConflict(false); setError(''); } }
        return outcome.ok;
      } catch { if (mounted.current) { setSaveState('저장하지 못했어요'); setError('입력은 그대로입니다. 저장을 다시 시도해 주세요.'); } return false; }
      finally { saveFlights.current--; }
    });
    return queue.current;
  }
  function change(patch: Partial<ProgramParticipationDraft>, contentChanged = true) {
    const current = draftRef.current; if (!current || lockCount.current > 0 && !composing.current) return;
    const next = { ...current, ...patch, requestId: contentChanged ? programId('request') : current.requestId };
    draftRef.current = next; setDraft(next); setPreview(false); if (!composing.current) void save(next);
  }
  async function openDraft(next: ProgramParticipationDraft) {
    if (busy || readingMedia || lockCount.current > 0 || composing.current) return;
    lockCount.current++; setLocked(true);
    try {
      if (!await flushCurrentDraft()) return;
      savedDraftRef.current = programClone(data.spaces[actorId].participationDrafts.find(entry => entry.id === next.id) ?? null);
      draftRef.current = programClone(next); setDraft(draftRef.current); setPreview(false); setError(''); setConflict(false); setDraftConflict(false); setDiscarding(false);
      void save(draftRef.current);
    } finally { lockCount.current--; setLocked(lockCount.current > 0); }
  }
  async function go(destination: Parameters<ProgramNavigate>[0]) {
    if (await queue.current) navigate(destination);
  }
  const openPost = (id: string) => void go({ view: 'community', id });
  const openReply = (postId: string, replyId: string) => {
    const destination = programReplyDestination(data, postId, replyId);
    if (destination) void go(destination); else setError('연결된 답글을 찾을 수 없어요.');
  };
  function startPostEdit(target: ProgramPost) {
    const next = newProgramParticipationDraft(target.kind);
    Object.assign(next, { title: target.title, body: target.body, topic: target.topic, postId: target.id, editTargetId: target.id,
      flowId: target.flowId, versionId: target.versionId, itemId: target.itemId, media: programClone(target.media),
      evidencePostIds: [...target.evidencePostIds], expectedUpdatedAt: target.updatedAt, expectedContent: programPostEditToken(target) });
    void openDraft(next);
  }
  function startReply(target: ProgramPost, parent?: ProgramReply, edit?: ProgramReply) {
    const next = newProgramParticipationDraft('reply');
    Object.assign(next, { postId: target.id, parentReplyId: edit?.parentReplyId ?? parent?.id ?? null,
      body: edit?.body ?? '', editTargetId: edit?.id ?? null, expectedUpdatedAt: edit?.updatedAt ?? null,
      expectedContent: edit ? programReplyEditToken(edit) : null });
    void openDraft(next);
  }
  async function submit() {
    const snapshot = draftRef.current; if (!snapshot || busy || lockCount.current > 0 || composing.current) return;
    lockCount.current++; setLocked(true); setBusy(true); setError('');
    try {
      if (!await queue.current) { setError('초안을 먼저 저장해 주세요. 입력은 그대로 남아 있습니다.'); return; }
      const outcome = await guardedMutation(mutate, snapshot.editTargetId ? '글 수정' : '글 공개', current => submitProgramParticipation(current, actorId, snapshot, utcNow(), { expected: snapshot }), { alphaSocial: { type: 'participation-submit', draft: snapshot, expected: snapshot } });
      if (outcome.ok && outcome.presentationPending) { setError(programErrorMessage('presentation-pending')); return; }
      if (outcome.ok) { draftRef.current = null; savedDraftRef.current = null; setDraft(null); setPreview(false); setSaveState(''); navigate({ view: 'community', id: snapshot.kind === 'reply' ? snapshot.postId! : outcome.result, ...(snapshot.kind === 'reply' ? { replyId: outcome.result } : {}) }); }
      else { setError(programErrorMessage(outcome.reason)); setConflict(outcome.reason === 'conflict'); }
    } finally { lockCount.current--; setLocked(lockCount.current > 0); setBusy(false); }
  }
  async function perform(label: string, build: Parameters<ProgramMutate>[1], options: Parameters<ProgramMutate>[2]) {
    if (busy || lockCount.current > 0 || composing.current) return; setBusy(true); setError('');
    const outcome = await guardedMutation(mutate, label, build, options); if (!outcome.ok) setError(programErrorMessage(outcome.reason));
    setBusy(false); return outcome;
  }
  async function remove() {
    if (!confirmDelete) return;
    const target = confirmDelete;
    const outcome = await perform('글 삭제', current => target.kind === 'post' ? deleteProgramPost(current, actorId, target.id, utcNow()) : deleteProgramReply(current, actorId, target.id, utcNow()), { alphaSocial: target.kind === 'post' ? { type: 'post-delete', postId: target.id } : { type: 'reply-delete', replyId: target.id } });
    if (outcome?.ok) setConfirmDelete(null);
  }
  async function discard() {
    const target = draftRef.current; if (!target) return; await queue.current;
    const expected = savedDraftRef.current;
    const outcome = await perform('작성 중인 글 버리기', current => discardProgramParticipationDraft(current, actorId, target.id, { expected }), { alphaSocial: { type: 'participation-discard', draftId: target.id, expected } });
    if (outcome?.ok) { draftRef.current = null; savedDraftRef.current = null; setDraft(null); setDiscarding(false); }
  }
  async function attach(files: FileList | null) {
    const snapshot = draftRef.current; if (!files || !snapshot || lockCount.current > 0 || mediaPending.current) return;
    if (snapshot.media.length + files.length > 4) { setError('사진은 4장까지 추가할 수 있어요.'); return; }
    if (storageScope === 'account' && !mediaPort) { setError('사진 저장 연결을 확인하지 못했습니다. 글 입력은 유지했습니다.'); return; }
    const abort = new AbortController(); mediaUpload.current = abort;
    const staged: string[] = [];
    const discardStaged = async (id: string) => {
      // Only this unfinished selection owns these IDs. Persisted draft/post photos are never deleted here.
      try { await mediaPort?.discard?.(id, new AbortController().signal); } catch { /* Private staging expiry remains the fallback. */ }
    };
    mediaPending.current = true; setReadingMedia(true);
    try {
      const selected = await Promise.all(Array.from(files).map(file => new Promise<ProgramParticipationDraft['media'][number]>((resolve, reject) => {
        if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 2_000_000) { reject(new Error('PNG, JPEG, WebP, GIF 파일을 한 장에 2 MB 이하로 선택해 주세요.')); return; }
        const reader = new FileReader();
        const cancel = () => { reader.abort(); reject(new Error('사진 추가를 취소했습니다.')); };
        abort.signal.addEventListener('abort', cancel, { once: true });
        reader.onloadend = () => abort.signal.removeEventListener('abort', cancel);
        reader.onerror = () => reject(new Error('사진을 읽지 못했어요. 다시 선택해 주세요.'));
        reader.onload = () => resolve({ id: programId('image'), dataUrl: String(reader.result), alt: file.name.slice(0, 500) || '첨부한 사진', synthetic: false });
        reader.readAsDataURL(file);
      })));
      const ready = storageScope === 'account' ? await Promise.all(selected.map(async media => {
        const stored = await mediaPort!.stage({ requestId: programId('media-request'), dataUrl: media.dataUrl, alt: media.alt, synthetic: media.synthetic }, abort.signal);
        if (abort.signal.aborted || !mounted.current || draftRef.current?.id !== snapshot.id) { await discardStaged(stored.id); throw new Error('사진 추가를 취소했습니다.'); }
        staged.push(stored.id); return stored;
      })) : selected;
      if (mounted.current && !abort.signal.aborted && draftRef.current?.id === snapshot.id) change({ media: [...draftRef.current.media, ...ready] });
      else await Promise.all(staged.map(discardStaged));
    } catch (reason) {
      const cancelled = abort.signal.aborted; abort.abort(); await Promise.all(staged.map(discardStaged));
      if (mounted.current && !cancelled) setError(reason instanceof Error ? reason.message : '사진을 읽지 못했어요.');
    }
    finally { if (mediaUpload.current === abort) { mediaUpload.current = null; mediaPending.current = false; if (mounted.current) setReadingMedia(false); } }
  }
  function cancelMediaUpload() {
    mediaUpload.current?.abort(); mediaUpload.current = null; mediaPending.current = false; setReadingMedia(false);
    setError('사진 추가를 취소했습니다. 글과 기존 사진은 유지했습니다. 서버에서 이미 받은 미연결 사진은 임시 보관 후 만료됩니다.');
  }
  const reactions = (targetKind: 'post' | 'reply', targetId: string) => {
    const relevant = data.public.reactions.filter(entry => entry.targetKind === targetKind && entry.targetId === targetId);
    return <button type="button" aria-pressed={relevant.some(entry => entry.actorId === actorId)} disabled={busy}
      onClick={() => void perform('도움됐어요 반응', current => toggleProgramReaction(current, actorId, targetKind, targetId), { alphaSocial: { type: 'reaction-set', targetKind, targetId, desired: !relevant.some(entry => entry.actorId === actorId) } })}>도움됐어요{relevant.length ? ` ${relevant.length}` : ''}</button>;
  };
  function postRows(rows: ProgramPost[]) { return rows.length ? <ul className={styles.list}>{rows.map(entry => <li key={entry.id}>
    <button type="button" className={styles.rowLink} onClick={() => openPost(entry.id)}><span className={styles.meta}>{kinds[entry.kind]}{entry.topic ? ` · ${entry.topic}` : ''}</span><strong>{entry.title}</strong>
      <span className={styles.snippet}>{entry.body.slice(0, 150)}</span><span className={styles.meta}>{author(data, entry.authorId)} · {stamp(entry.updatedAt)}</span></button>
  </li>)}</ul> : <p className={styles.empty}>아직 글이 없어요.</p>; }
  function replyRows(rows: ProgramReply[]) { return rows.length ? <ul className={styles.list}>{rows.map(reply => <li key={reply.id}>
    <button className={styles.rowLink} type="button" onClick={() => openReply(reply.postId, reply.id)}><strong>{postTitle(data, reply.postId)}</strong>
      <span className={styles.snippet}>{reply.deleted ? '삭제된 답글' : reply.body.slice(0, 160)}</span><span className={styles.meta}>{author(data, reply.authorId)} · {stamp(reply.updatedAt)}</span></button>
  </li>)}</ul> : <p className={styles.empty}>아직 답글이 없어요.</p>; }

  return <section className={styles.community} aria-label={view === 'activity' ? '내 활동' : '이야기'}>
    <header className={styles.header}><h1>{view === 'activity' ? '내 활동' : '이야기'}</h1><button className={styles.primary} type="button" disabled={draftEntryDisabled} onClick={() => void openDraft(newProgramParticipationDraft())}>글 쓰기</button></header>
    {error && <div role="alert" className={styles.error}>{error}{draft && <button type="button" onClick={() => save(draft)}>초안 저장 다시 시도</button>}</div>}
    {drafts.length > 0 && <details className={styles.drafts}><summary>작성 중인 글 {drafts.length}</summary>{drafts.map(entry => <button key={entry.id} type="button" disabled={draftEntryDisabled} onClick={() => void openDraft(entry)}>{entry.title || entry.body.slice(0, 40) || `새 ${kinds[entry.kind]}`} · 이어 쓰기</button>)}</details>}
    {draft && <section className={styles.composer} ref={composeRef} aria-label="글 작성"
      onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; const value = currentDraft(); if (value) { draftRef.current = value; setDraft(value); void save(value); } }}
      onBeforeInput={event => { if (lockCount.current > 0 && !composing.current) event.preventDefault(); }}>
      <header><h2>{draft.editTargetId ? `${kinds[draft.kind]} 수정` : `${kinds[draft.kind]} 쓰기`}</h2><span role="status" className={styles.meta}>{saveState}</span></header>
      {draftConflict && <div className={styles.notice} role="alert"><h3>다른 탭의 초안과 비교</h3>
        {latestDraft ? <><p><strong>{latestDraft.title || kinds[latestDraft.kind]}</strong> · {kinds[latestDraft.kind]}</p><p className={styles.body}>{latestDraft.body}</p>
          <details><summary>최신 사진·연결·근거 확인</summary><p>주제: {latestDraft.topic || '없음'}</p>
            <p>관련 Flow: {data.public.versions.find(version => version.id === latestDraft.versionId)?.title || '연결하지 않음'}</p>
            <p>관련 항목: {data.public.versions.find(version => version.id === latestDraft.versionId)?.items.find(item => item.id === latestDraft.itemId)?.title || '연결하지 않음'}</p>
            {latestDraft.postId && <p>답글 대상: {postTitle(data, latestDraft.postId)}</p>}
            <ul>{latestDraft.evidencePostIds.map(id => <li key={id}>{postTitle(data, id)}</li>)}</ul>
            {latestDraft.media.map(media => <figure className={styles.attachment} key={media.id}><ProgramCommunityImage media={media} mediaPort={mediaPort} /><figcaption>{media.alt}</figcaption></figure>)}
          </details></> : <p>다른 탭에서 초안이 삭제되었습니다.</p>}
        <p>아래의 내 입력은 유지했습니다. 최신 초안을 확인한 뒤 선택해 주세요.</p>
        <button type="button" disabled={busy || locked} onClick={() => { savedDraftRef.current = programClone(latestDraft); const value = currentDraft(); if (value) void save(value); }}>확인한 최신 초안 대신 내 입력 저장</button>
      </div>}
      {draft.kind === 'reply' && <p className={styles.context}>{postTitle(data, draft.postId!)}{draft.parentReplyId && ` · ${author(data, data.public.replies.find(entry => entry.id === draft.parentReplyId)?.authorId ?? '')}에게 답글`}</p>}
      {!preview ? <>
        {draft.kind !== 'reply' && <><div className={styles.actions}>{!draft.editTargetId && <label>글 종류<select value={draft.kind} onChange={event => change({ kind: event.target.value as ProgramPost['kind'] })}><option value="question">질문</option><option value="experience">경험</option><option value="knowledge">지식</option></select></label>}</div>
          <label>제목<input ref={titleRef} readOnly={locked && !composing.current} maxLength={240} value={draft.title} onChange={event => change({ title: event.target.value })} /></label></>}
        <label>내용<textarea ref={bodyRef} readOnly={locked && !composing.current} rows={7} maxLength={30000} value={draft.body} onChange={event => change({ body: event.target.value, cursor: { start: event.target.selectionStart, end: event.target.selectionEnd } })}
          onSelect={event => { const target = event.currentTarget; if (draftRef.current && (draftRef.current.cursor.start !== target.selectionStart || draftRef.current.cursor.end !== target.selectionEnd)) change({ cursor: { start: target.selectionStart, end: target.selectionEnd } }, false); }} /></label>
        {draft.kind !== 'reply' && <>
          <label className={styles.fileButton}>{readingMedia ? storageScope === 'account' ? '사진 보관 중…' : '사진 읽는 중…' : '사진 추가'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple disabled={readingMedia} onChange={event => { void attach(event.target.files); event.currentTarget.value = ''; }} /></label>
          {readingMedia && <button type="button" onClick={cancelMediaUpload}>사진 추가 취소</button>}
          {draft.media.map((media, index) => <div className={styles.attachment} key={media.id}>
            {/* Inline local imagery or an authenticated opaque media reference. */}
            <ProgramCommunityImage media={media} mediaPort={mediaPort} />
            <label>사진 설명<input data-participation-media={media.id} value={media.alt} maxLength={500} onChange={event => change({ media: draft.media.map(entry => entry.id === media.id ? { ...entry, alt: event.target.value } : entry) })} /></label>
            <div className={styles.actions}><button type="button" disabled={index === 0} onClick={() => { const mediaOrder = [...draft.media]; [mediaOrder[index - 1], mediaOrder[index]] = [mediaOrder[index], mediaOrder[index - 1]]; change({ media: mediaOrder }); }}>앞으로</button>
              <button type="button" onClick={() => change({ media: draft.media.filter(entry => entry.id !== media.id) })}>사진 제외</button></div>
          </div>)}
          <details><summary>주제와 연결 (선택)</summary><label>주제<input value={draft.topic} maxLength={120} onChange={event => change({ topic: event.target.value })} /></label>
            {!draft.editTargetId && <><label>관련 Flow<select value={draft.flowId ?? ''} onChange={event => { const flow = data.public.flows.find(entry => entry.id === event.target.value); change({ flowId: flow?.id ?? null, versionId: flow?.currentVersionId ?? null, itemId: null }); }}><option value="">연결하지 않음</option>{data.public.flows.filter(entry => !entry.archived).map(flow => <option key={flow.id} value={flow.id}>{data.public.versions.find(version => version.id === flow.currentVersionId)?.title}</option>)}</select></label>
              {draft.flowId && <><label>판본<select value={draft.versionId ?? ''} onChange={event => change({ versionId: event.target.value, itemId: null })}>{data.public.versions.filter(version => version.flowId === draft.flowId).map(version => <option key={version.id} value={version.id}>{version.number}판 · {stamp(version.createdAt)}</option>)}</select></label>
                <label>항목<select value={draft.itemId ?? ''} onChange={event => change({ itemId: event.target.value || null })}><option value="">Flow 전체</option>{data.public.versions.find(version => version.id === draft.versionId)?.items.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></>}
            </>}
            {(draft.kind === 'knowledge' || draft.evidencePostIds.length > 0) && <fieldset><legend>근거 글</legend>{data.public.posts.filter(entry => entry.id !== draft.editTargetId && (!entry.deleted || draft.evidencePostIds.includes(entry.id))).map(entry => <label className={styles.check} key={entry.id}><input type="checkbox" checked={draft.evidencePostIds.includes(entry.id)} onChange={event => change({ evidencePostIds: event.target.checked ? [...draft.evidencePostIds, entry.id] : draft.evidencePostIds.filter(id => id !== entry.id) })} />{entry.deleted ? '삭제된 근거 글 · 연결 제거 가능' : entry.title}</label>)}</fieldset>}
          </details>
        </>}
        <div className={styles.actions}><button type="button" disabled={readingMedia || busy || locked} onClick={() => void parkDraft()}>나중에 이어 쓰기</button><button type="button" disabled={readingMedia || busy || locked} onClick={() => setDiscarding(true)}>초안 버리기</button>
          <button className={styles.primary} type="button" disabled={!draft.body.trim() || draft.kind !== 'reply' && !draft.title.trim() || busy || readingMedia || draft.media.some(media => !media.alt.trim())} onClick={() => setPreview(true)}>공개 내용 확인</button></div>
      </> : <div className={styles.preview}>
        {draft.kind !== 'reply' && <h3>{draft.title}</h3>}<p className={styles.body}>{draft.body}</p>
        {draft.media.map(media => <figure key={media.id}><ProgramCommunityImage media={media} mediaPort={mediaPort} /><figcaption>{media.alt}</figcaption></figure>)}
        {draft.flowId && <p className={styles.meta}>연결: {data.public.versions.find(version => version.id === draft.versionId)?.title} · {data.public.versions.find(version => version.id === draft.versionId)?.number}판</p>}
        {draft.evidencePostIds.length > 0 && <ul>{draft.evidencePostIds.map(id => <li key={id}>{postTitle(data, id)}</li>)}</ul>}
        <p className={styles.notice}>{storageScope === 'account' ? '확인한 내용만 개발계의 다른 사용자에게 공개합니다. 작성 중인 다른 초안은 공개하지 않습니다.' : '이 내용만 이 기기의 공개 목록에 반영됩니다. 실제 서비스에는 게시되지 않습니다.'}</p>
        <div className={styles.actions}><button type="button" disabled={busy} onClick={() => setPreview(false)}>다시 수정</button><button className={styles.primary} type="button" disabled={busy} onClick={() => void submit()}>{busy ? '저장 중…' : draft.editTargetId ? '수정 내용 반영' : '공개하기'}</button></div>
      </div>}
      {conflict && <div className={styles.notice}><h3>최신 내용과 비교</h3>
        {draft.kind !== 'reply' && <><strong>{data.public.posts.find(entry => entry.id === draft.editTargetId)?.title}</strong><p className={styles.meta}>주제: {data.public.posts.find(entry => entry.id === draft.editTargetId)?.topic || '없음'}</p></>}
        <p className={styles.body}>{draft.kind === 'reply' ? data.public.replies.find(entry => entry.id === draft.editTargetId)?.body : data.public.posts.find(entry => entry.id === draft.editTargetId)?.body}</p>
        {draft.kind !== 'reply' && <details><summary>최신 사진과 근거 확인</summary>{data.public.posts.find(entry => entry.id === draft.editTargetId)?.media.map(media => <figure key={media.id}><ProgramCommunityImage media={media} mediaPort={mediaPort} /><figcaption>{media.alt}</figcaption></figure>)}
          <ul>{data.public.posts.find(entry => entry.id === draft.editTargetId)?.evidencePostIds.map(id => <li key={id}>{postTitle(data, id)}</li>)}</ul></details>}
        <button type="button" onClick={() => { const target = draft.kind === 'reply' ? data.public.replies.find(entry => entry.id === draft.editTargetId) : data.public.posts.find(entry => entry.id === draft.editTargetId);
          if (!target) return; change({ expectedUpdatedAt: target.updatedAt, expectedContent: draft.kind === 'reply' ? programReplyEditToken(target as ProgramReply) : programPostEditToken(target as ProgramPost) }); setConflict(false); }}>최신 내용을 확인했고 내 초안으로 다시 수정</button></div>}
      {discarding && <div className={styles.notice} role="alert"><p>이 초안을 버릴까요? 공개된 글은 바뀌지 않습니다.</p><div className={styles.actions}><button type="button" onClick={() => setDiscarding(false)}>계속 쓰기</button><button type="button" disabled={busy} onClick={() => void discard()}>초안 버리기</button></div></div>}
    </section>}

    {confirmDelete && <div className={styles.notice} role="alert"><p>본문과 사진을 삭제할까요? 답글 연결은 남습니다.</p><div className={styles.actions}><button type="button" onClick={() => setConfirmDelete(null)}>취소</button><button type="button" disabled={busy} onClick={() => void remove()}>삭제</button></div></div>}
    {selectedPostId ? post ? <article className={styles.detail}>
      <button type="button" onClick={() => void go({ view: 'community' })}>글 목록</button><p className={styles.meta}>{kinds[post.kind]}{post.topic ? ` · ${post.topic}` : ''} · {author(data, post.authorId)} · {stamp(post.updatedAt)}</p>
      <h2>{post.title}</h2>{post.deleted ? <p>작성자가 삭제한 글입니다. 기존 답글은 아래에서 볼 수 있어요.</p> : <><p className={styles.body}>{post.body}</p>
        {post.media.map(media => <figure key={media.id}><ProgramCommunityImage media={media} mediaPort={mediaPort} /><figcaption>{media.alt}{media.synthetic ? ' · 합성 이미지' : ''}</figcaption></figure>)}
        <div className={styles.actions}>{reactions('post', post.id)}<button type="button" disabled={draftEntryDisabled} onClick={() => startReply(post)}>답글 쓰기</button>
          {post.authorId === actorId && <details className={styles.menu}><summary>글 관리</summary><button type="button" disabled={draftEntryDisabled} onClick={() => startPostEdit(post)}>수정</button><button type="button" onClick={() => setConfirmDelete({ kind: 'post', id: post.id })}>삭제</button></details>}</div></>}
      {post.flowId && <div className={styles.context}><button type="button" onClick={() => { const destination = programPostFlowDestination(data, post); if (destination) void go(destination); else setError('글에 연결된 판본·항목을 찾을 수 없어요.'); }}>{data.public.versions.find(version => version.id === post.versionId)?.title ?? '관련 Flow'} 열기</button><span>{data.public.versions.find(version => version.id === post.versionId)?.number}판{post.itemId ? ` · ${data.public.versions.find(version => version.id === post.versionId)?.items.find(item => item.id === post.itemId)?.title ?? '이전 항목'}` : ''}{data.public.flows.find(flow => flow.id === post.flowId)?.archived ? ' · 보관된 Flow' : ''}</span></div>}
      {post.evidencePostIds.length > 0 && <aside className={styles.evidence}><h3>근거 글</h3>{post.evidencePostIds.map(id => { const evidence = data.public.posts.find(entry => entry.id === id); return evidence && !evidence.deleted ? <button key={id} type="button" onClick={() => openPost(id)}>{evidence.title}</button> : <p key={id}>삭제된 근거 글{post.authorId === actorId && <button type="button" disabled={draftEntryDisabled} onClick={() => startPostEdit(post)}>근거 연결 수정</button>}</p>; })}</aside>}
      <section aria-label="답글"><h3>답글</h3>{selectedReplyId && !selectedReply && <p role="status">요청한 답글을 찾을 수 없어요. 이 글의 답글 목록을 표시합니다.</p>}{data.public.replies.filter(reply => reply.postId === post.id).length === 0 && <p className={styles.empty}>아직 답글이 없어요.</p>}
        {data.public.replies.filter(reply => reply.postId === post.id).map(reply => <article className={styles.reply} id={`reply-${reply.id}`} key={reply.id} tabIndex={-1} aria-current={selectedReplyId === reply.id ? 'location' : undefined}>
          <p className={styles.meta}>{author(data, reply.authorId)} · {stamp(reply.updatedAt)}</p>
          {reply.parentReplyId && <button type="button" className={styles.parent} onClick={() => openReply(post.id, reply.parentReplyId!)}>{data.public.replies.find(parent => parent.id === reply.parentReplyId)?.deleted ? '삭제된 답글' : `${author(data, data.public.replies.find(parent => parent.id === reply.parentReplyId)?.authorId ?? '')}의 답글`}에 대한 답변</button>}
          <p className={styles.body}>{reply.deleted ? '삭제된 답글입니다.' : reply.body}</p>
          <div className={styles.actions}>{!reply.deleted && !post.deleted && <>{reactions('reply', reply.id)}<button type="button" disabled={draftEntryDisabled} onClick={() => startReply(post, reply)}>답글</button></>}
            {!reply.deleted && reply.authorId === actorId && <details className={styles.menu}><summary>답글 관리</summary>{!post.deleted && <button type="button" disabled={draftEntryDisabled} onClick={() => startReply(post, undefined, reply)}>수정</button>}<button type="button" onClick={() => setConfirmDelete({ kind: 'reply', id: reply.id })}>삭제</button></details>}</div>
        </article>)}
      </section>
    </article> : <div className={styles.empty}><p>연결된 글을 찾을 수 없어요.</p><button type="button" onClick={() => void go({ view: 'community' })}>현재 글 목록 보기</button></div>
      : null}
      <div hidden={view !== 'activity' || !!selectedPostId} className={styles.activity}>
        <section><h2>내 공개 Flow</h2>{publishingActivity.flows.length ? <ul className={styles.list}>{publishingActivity.flows.map(flow => <li key={flow.id}>
          <button className={styles.rowLink} type="button" onClick={() => void go({ view: 'flow', id: flow.id, versionId: flow.versionId })}><strong>{flow.title}</strong><span>{flow.number}판 · {flow.archived ? '공개 철회·보관' : '공개 중'}</span></button>
          {flow.documents.length ? flow.documents.map(doc => <div className={styles.actions} key={doc.id}><button type="button" onClick={() => void go({ view: 'space', id: doc.id })}>개인 원문 · {doc.title}{doc.archived ? ' (보관됨)' : ''}</button>{!doc.archived && doc.canEditPublication && <button type="button" onClick={() => void go({ view: 'space', id: doc.id, action: 'publish' })}>{flow.archived ? '공개 보관 상태 확인' : '공개 내용 편집'}</button>}{!doc.canEditPublication && <small>이 문서의 공개 편집은 다른 초안에 연결되어 있습니다.</small>}</div>) : <p className={styles.meta}>연결된 개인 문서가 없습니다. 공개 판본은 읽을 수 있습니다.</p>}
        </li>)}</ul> : <p className={styles.empty}>공개한 Flow가 없어요.</p>}</section>
        <section><h2>작성 중인 공개 초안</h2>{publishingActivity.drafts.length ? <ul className={styles.list}>{publishingActivity.drafts.map(entry => <li key={entry.id}><strong>{entry.title || entry.document?.title || '제목 없는 공개 초안'}</strong><p className={styles.meta}>{stamp(entry.updatedAt)}{entry.flowArchived ? ' · 공개 철회된 Flow의 초안' : ''}</p>
          {entry.document ? <button type="button" onClick={() => void go({ view: 'space', id: entry.document!.id, ...(!entry.document!.archived ? { action: 'publish' as const } : {}) })}>{entry.document.archived ? '보관한 원문 열기 · 복원 후 이어 쓰기' : '공개 초안 이어 쓰기'}</button> : <p>원래 문서를 찾을 수 없어 편집을 열 수 없습니다.</p>}
        </li>)}</ul> : <p className={styles.empty}>작성 중인 공개 초안이 없어요.</p>}</section>
        <section><h2>내게 온 답글</h2>{replyRows(activity.receivedReplies)}</section>
        <section><h2>내 Flow에 온 제안</h2>{activity.incomingProposals.length ? activity.incomingProposals.map(proposal => <ProgramProposalReview key={proposal.id} proposal={proposal} data={data} mutate={mutate} navigate={navigate}
          onRegisterEditors={port => { if (port) reviewPorts.current.set(proposal.id, port); else reviewPorts.current.delete(proposal.id); }} />) : <p className={styles.empty}>아직 제안이 없어요.</p>}</section>
        <section><h2>보낸 제안과 결과</h2>{activity.proposals.filter(proposal => !activity.incomingProposals.some(incoming => incoming.id === proposal.id)).map(proposal => <ProgramProposalReview key={proposal.id} proposal={proposal} data={data} mutate={mutate} navigate={navigate}
          onRegisterEditors={port => { if (port) reviewPorts.current.set(proposal.id, port); else reviewPorts.current.delete(proposal.id); }} />)}
          {!activity.proposals.length && <p className={styles.empty}>보낸 제안이 없어요.</p>}
          {activity.proposals.some(proposal => activity.incomingProposals.some(incoming => incoming.id === proposal.id)) && <p className={styles.meta}>내 Flow에 보낸 제안은 위에서 검토할 수 있어요.</p>}</section>
        <section><h2>내가 쓴 글</h2>{postRows(activity.posts)}</section><section><h2>내가 쓴 답글</h2>{replyRows(activity.replies)}</section>
        <details><summary>도움됐어요를 누른 글과 답글</summary>{activity.reactions.map(reaction => { const id = reaction.targetKind === 'post' ? reaction.targetId : data.public.replies.find(reply => reply.id === reaction.targetId)?.postId; return id ? <button key={`${reaction.targetKind}:${reaction.targetId}`} type="button" onClick={() => reaction.targetKind === 'reply' ? openReply(id, reaction.targetId) : openPost(id)}>{postTitle(data, id)}</button> : null; })}</details>
      </div>
      {!selectedPostId && view !== 'activity' && <><div className={styles.filters}><label>이야기 검색<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label><label>종류<select value={kind} onChange={event => setKind(event.target.value)}><option value="all">모든 글</option><option value="question">질문</option><option value="experience">경험</option><option value="knowledge">지식</option></select></label></div>
        {posts.length ? postRows(posts) : <p className={styles.empty}>{query || kind !== 'all' ? '조건에 맞는 글이 없어요.' : '첫 질문이나 경험을 남겨 보세요.'}</p>}</>}
  </section>;
}
