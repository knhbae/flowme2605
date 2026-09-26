'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import type { ProgramData, ProgramProposal } from '../../../lib/flow/integrated-poc/contract';
import { programSame } from '../../../lib/flow/integrated-poc/controller';
import type { ProgramEditorFlush } from '../../../lib/flow/integrated-poc/document-action';
import { programProposalReviewToken } from '../../../lib/flow/integrated-poc/publication';
import { compareProgramProposal, programProposalAcceptanceBlock, programProposalComparisonValue, type ProgramProposalComparisonRow } from '../../../lib/flow/integrated-poc/proposal-comparison';
import { discardProgramProposalReviewDraft, readProgramProposalReviewDraft, saveProgramProposalReviewDraft, submitProgramProposalReviewDraft, type ProgramProposalReviewDraft } from '../../../lib/flow/integrated-poc/review-drafts';
import { programErrorMessage, type ProgramMutate, type ProgramNavigate } from '../../../lib/flow/integrated-poc/ui-contract';
import styles from './ProgramCommunity.module.css';

export type ProgramProposalReviewProps = { proposal: ProgramProposal; data: ProgramData; mutate: ProgramMutate; navigate: ProgramNavigate; onRegisterEditors?: (port: ProgramEditorFlush | null) => void };
const statuses = { submitted: '검토 대기', held: '보류', rejected: '반영하지 않음', accepted: '새 판본에 반영됨' };
const fieldLabels = { title: '항목 이름', description: '설명', completionCriteria: '완료 기준', schedule: '일정', subchecks: '하위 체크' };
const comparisonLabels = { unavailable: '연결 확인 필요', conflict: '최신 값이 바뀜 · 채택 충돌', unchanged: '최신 값과 같음', proposed: '기준 값 유지 중 · 변경 제안', 'keep-latest': '제안 없음 · 최신 값 유지' };
export function ProgramProposalReview(props: ProgramProposalReviewProps) {
  return <ReviewBody key={`${props.data.activeActorId}:${props.proposal.id}`} {...props} />;
}
function ReviewBody(props: ProgramProposalReviewProps) {
  const { data, proposal, navigate, onRegisterEditors } = props, actorId = data.activeActorId;
  const acceptanceReasonId = useId();
  const live = useRef(props); live.current = props;
  const saved = useRef(readProgramProposalReviewDraft(data, actorId, proposal.id));
  const draft = useRef<ProgramProposalReviewDraft>(saved.current ?? { note: proposal.reviewNote, expectedProposalToken: programProposalReviewToken(data, proposal.id) ?? '' });
  const input = useRef<HTMLTextAreaElement>(null), composing = useRef(false), locks = useRef(0), busyRef = useRef(false), touched = useRef(false);
  const queue = useRef(Promise.resolve(true));
  const saveFlights = useRef(0);
  const [note, setNote] = useState(draft.current.note), [error, setError] = useState(''), [busy, setBusy] = useState(false), [locked, setLocked] = useState(false), [, render] = useState(0);
  const current = () => ({ ...draft.current, note: input.current?.value ?? draft.current.note });
  const pending = () => composing.current || busyRef.current || (touched.current && !programSame(current(), saved.current));
  const readonly = () => { if (input.current && !composing.current) input.current.readOnly = locks.current > 0 || busyRef.current; };
  const mutate: ProgramMutate = async (...args) => { try { return await live.current.mutate(...args); } catch { return { ok: false, reason: 'storage-unavailable' }; } };
  const persist = (snapshot: ProgramProposalReviewDraft = current()) => {
    saveFlights.current++;
    queue.current = queue.current.then(async () => {
      try {
        if (composing.current) return false;
        const expected = saved.current;
        if (programSame(snapshot, expected)) return true;
        const outcome = await mutate('검토 의견 초안 저장', latest => saveProgramProposalReviewDraft(latest, { actorId, proposalId: proposal.id, draft: snapshot, expected }), { history: false, alphaSocial: { type: 'review-save', proposalId: proposal.id, draft: snapshot, expected } });
        if (!outcome.ok) { setError(programErrorMessage(outcome.reason)); return false; }
        saved.current = snapshot;
        if (programSame(current(), snapshot)) touched.current = false;
        render(value => value + 1); return true;
      } finally { saveFlights.current--; }
    });
    return queue.current;
  };
  const flush = async () => {
    if (composing.current || busyRef.current) return false;
    if (!await queue.current) { /* A later explicit flush may retry the preserved draft. */ }
    return !pending() || await persist();
  };
  const flushRef = useRef(flush); flushRef.current = flush;
  useEffect(() => {
    onRegisterEditors?.({ flushAll: () => flushRef.current(), hasPendingInput: pending,
      acceptConfirmedSocialDrafts: next => {
        if (next.activeActorId !== actorId || composing.current || busyRef.current || locks.current || saveFlights.current) return false;
        const value = current(), stored = readProgramProposalReviewDraft(next, actorId, proposal.id);
        if (!stored || !programSame(value, stored) || programSame(saved.current, stored)) return false;
        saved.current = { ...stored }; touched.current = false; setError(''); render(value => value + 1); return true;
      },
      captureDrafts: () => pending() || saved.current ? [{ title: '개선 제안 검토 의견', raw: current().note }] : [],
      captureSocialDrafts: () => pending() || saved.current ? [{ kind: 'review', value: { proposalId: proposal.id, draft: { ...current() } } }] : [],
      lockInput: () => { locks.current++; setLocked(true); readonly(); let released = false; return () => {
        if (released) return; released = true; locks.current--; setLocked(locks.current > 0); readonly();
      }; },
      blocksExternalSnapshot: (before, next) => pending() && (before.activeActorId !== next.activeActorId ||
        !programSame(readProgramProposalReviewDraft(before, actorId, proposal.id), readProgramProposalReviewDraft(next, actorId, proposal.id))) });
    return () => onRegisterEditors?.(null);
  }, [onRegisterEditors]); // Ports read refs, never a stale rendered note.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (pending()) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, []);
  const comparison = compareProgramProposal(data, proposal);
  const { flow, base, latest, original } = comparison, owner = flow?.ownerId === actorId;
  const token = programProposalReviewToken(data, proposal.id), sourceConflict = draft.current.expectedProposalToken !== token;
  useEffect(() => {
    if (!draft.current.expectedProposalToken && !pending() && token) {
      draft.current = { ...draft.current, expectedProposalToken: token }; render(value => value + 1);
    }
  }, [token, busy]);
  const externalDraft = readProgramProposalReviewDraft(data, actorId, proposal.id);
  const privateConflict = !programSame(saved.current, externalDraft);
  const canReview = owner && !flow?.archived && ['submitted', 'held'].includes(proposal.status);
  const acceptanceBlock = programProposalAcceptanceBlock(comparison), acceptanceBlocked = acceptanceBlock !== null;
  const review = async (decision: 'hold' | 'reject' | 'accept') => {
    if (!canReview || !flow || busyRef.current || locks.current || composing.current || sourceConflict || privateConflict || (decision === 'accept' && acceptanceBlocked)) return;
    busyRef.current = true; setBusy(true); readonly(); setError('');
    const snapshot = current(), expectedVersionId = flow.currentVersionId;
    try {
      if (!await persist(snapshot)) return;
      const outcome = await mutate('개선 제안 검토', latest => submitProgramProposalReviewDraft(latest,
        { actorId, proposalId: proposal.id, decision, expectedVersionId, draft: snapshot }, new Date().toISOString()), { alphaSocial: { type: 'review-submit', proposalId: proposal.id, decision, expectedVersionId, draft: snapshot } });
      if (!outcome.ok) setError(programErrorMessage(outcome.reason));
      else { saved.current = null; touched.current = false; draft.current = { ...snapshot, expectedProposalToken: '' }; render(value => value + 1); }
    } finally { busyRef.current = false; setBusy(false); readonly(); }
  };
  const reconfirm = async () => {
    if (busyRef.current || locks.current || composing.current || !token) return;
    busyRef.current = true; setBusy(true); readonly();
    // This explicit action is the only place an old proposal token / private CAS baseline is replaced.
    try {
      await queue.current;
      saved.current = externalDraft; draft.current = { ...current(), expectedProposalToken: token }; touched.current = true;
      render(value => value + 1); await persist();
    } finally { busyRef.current = false; setBusy(false); readonly(); }
  };
  const discard = async () => {
    if (busyRef.current || locks.current || composing.current || privateConflict) return;
    busyRef.current = true; setBusy(true); readonly();
    try {
      await queue.current;
      const expected = saved.current;
      const outcome = await mutate('검토 의견 초안 지우기', latest => discardProgramProposalReviewDraft(latest, { actorId, proposalId: proposal.id, expected }), { history: false, alphaSocial: { type: 'review-discard', proposalId: proposal.id, expected } });
      if (!outcome.ok) setError(programErrorMessage(outcome.reason));
      else { saved.current = null; touched.current = false; draft.current = { note: proposal.reviewNote, expectedProposalToken: token ?? '' }; setNote(draft.current.note); }
    } finally { busyRef.current = false; setBusy(false); readonly(); }
  };
  const keepRaw = () => { const url = URL.createObjectURL(new Blob([current().note], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = '검토-의견.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const comparisonRow = (row: ProgramProposalComparisonRow) => <div key={row.field} className={styles.proposalCompareField}>
    <dt>{fieldLabels[row.field]} <span className={row.state === 'conflict' && proposal.status !== 'accepted' ? styles.proposalCompareConflict : styles.meta}>{proposal.status === 'accepted' && row.proposed ? '채택한 변경' : comparisonLabels[row.state]}</span></dt>
    <dd className={styles.proposalCompareValues}>
      <div><span className={styles.meta}>기준 · {base ? `${base.number}판` : '연결 확인 필요'}</span><p>{programProposalComparisonValue(row.base)}</p></div>
      <div><span className={styles.meta}>최신 · {latest ? `${latest.number}판` : '연결 확인 필요'}</span><p>{programProposalComparisonValue(row.latest)}</p></div>
      <div><span className={styles.meta}>제안</span><p>{row.proposed ? programProposalComparisonValue(row.proposal) : '변경하지 않음'}</p></div>
    </dd>
  </div>;
  return <details className={styles.proposal}>
    <summary>{original?.title ?? '연결된 항목'} <span>{statuses[proposal.status]}</span></summary>
    <p className={styles.meta}>{data.actors.find(actor => actor.id === proposal.authorId)?.name} · {base ? `${base.number}판에 대한 제안` : '기준 판본 연결 확인 필요'}</p>
    <p className={styles.body}>{proposal.reason}</p>
    {comparison.issue && <p id={acceptanceReasonId} className={styles.error} role="alert">{comparison.issue === 'latest-item-removed'
      ? proposal.status === 'accepted' ? '최신 판본에는 이 항목이 없습니다. 제안이 반영된 판본과 당시 항목은 아래에서 열 수 있습니다.'
        : '최신 판본에는 이 항목이 없습니다. 기준 판본과 제안은 보존되어 있지만 이 제안을 그대로 채택할 수 없습니다.'
      : 'Flow·판본·항목 연결을 확인할 수 없습니다. 다른 항목을 대신 연결하거나 비교하지 않았습니다.'}</p>}
    <dl className={styles.proposalComparison}>{comparison.rows.filter(row => row.proposed).map(comparisonRow)}</dl>
    {comparison.rows.some(row => !row.proposed) && <details className={styles.proposalUnchanged}><summary>제안하지 않은 항목 내용 확인</summary>
      <dl className={styles.proposalComparison}>{comparison.rows.filter(row => !row.proposed).map(comparisonRow)}</dl></details>}
    {proposal.reviewNote && <p>작성자 의견: {proposal.reviewNote}</p>}
    <div className={styles.actions}><button type="button" disabled={!base || !original} onClick={() => navigate({ view: 'flow', id: proposal.flowId, versionId: proposal.baseVersionId, itemId: proposal.itemId })}>제안한 판본·항목 열기</button>
      {latest && <button type="button" onClick={() => navigate({ view: 'flow', id: proposal.flowId, versionId: latest.id, ...(comparison.current ? { itemId: proposal.itemId } : {}) })}>최신 {latest.number}판 열기</button>}</div>
    {proposal.resultVersionId && <button type="button" onClick={() => navigate({ view: 'flow', id: proposal.flowId, versionId: proposal.resultVersionId!, itemId: proposal.itemId })}>반영된 판본 열기</button>}
    {owner && <div className={styles.review}>
      <label>검토 의견 (선택)<textarea ref={input} maxLength={10000} value={note} readOnly={(busy || locked) && !composing.current}
        onCompositionStart={() => { composing.current = true; }} onCompositionEnd={event => { composing.current = false; draft.current = { ...draft.current, note: event.currentTarget.value }; touched.current = true; setNote(event.currentTarget.value); readonly(); }}
        onChange={event => { draft.current = { ...draft.current, note: event.currentTarget.value }; touched.current = true; setNote(event.currentTarget.value); }}
        onBlur={() => { if (!composing.current && !busyRef.current && touched.current) void persist(); }} /></label>
      {(sourceConflict || privateConflict) && <div role="alert"><p>제안 또는 다른 곳에 저장된 의견이 바뀌었습니다. 입력한 의견은 그대로 보관했습니다. 위의 현재 제안과 아래 의견을 확인해 주세요.</p>
        <p>내 의견: {note || '(비어 있음)'}</p>{privateConflict && <p>다른 곳에 저장된 의견: {externalDraft?.note ?? '(초안 없음)'}</p>}
        <button type="button" disabled={busy || locked} onClick={() => void reconfirm()}>변경 내용을 확인했고 내 의견으로 계속 검토</button></div>}
      <div className={styles.actions}><button type="button" disabled={busy || locked} onClick={() => void flush()}>의견 초안 저장</button>
        <button type="button" onClick={keepRaw}>입력한 의견 TXT 보관</button><button type="button" disabled={busy || locked || privateConflict} onClick={() => void discard()}>의견 초안 지우기</button></div>
      {canReview && <>{!comparison.issue && <p id={acceptanceBlocked ? acceptanceReasonId : undefined} className={styles.meta}>{acceptanceBlock === 'recurrence-rollout'
        ? '이 판본에 반복 일정이 있습니다. 반복 공개 연결을 마치기 전에는 새 판본을 만들 수 없습니다. 보류하거나 반영하지 않을 수 있습니다.'
        : acceptanceBlocked ? '최신 내용과 충돌해 그대로 채택할 수 없습니다. 보류하거나 반영하지 않을 수 있습니다.'
        : '채택하면 변경을 반영한 새 판본이 이 기기의 공개 목록에 생깁니다.'}</p>}
        <div className={styles.actions}>{(['hold', 'reject', 'accept'] as const).map(decision => <button key={decision} type="button"
          disabled={busy || locked || sourceConflict || privateConflict || (decision === 'accept' && acceptanceBlocked)}
          aria-describedby={decision === 'accept' && acceptanceBlocked ? acceptanceReasonId : undefined}
          onClick={() => void review(decision)}>{({ hold: '보류', reject: '반영하지 않기', accept: '채택하고 새 판본 공개' })[decision]}</button>)}</div></>}
    </div>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </details>;
}
