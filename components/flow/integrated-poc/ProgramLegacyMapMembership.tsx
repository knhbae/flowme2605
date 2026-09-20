'use client';

import React, { useEffect, useRef, useState } from 'react';
import { programClone, programId, type ProgramData } from '@/lib/flow/integrated-poc/contract';
import { programSame } from '@/lib/flow/integrated-poc/controller';
import type { ProgramEditorFlush } from '@/lib/flow/integrated-poc/document-action';
import { programLegacyMapMembershipReviewChanges } from '@/lib/flow/integrated-poc/legacy-map-membership-state';
import { readProgramLegacyMapMembership, applyProgramLegacyMapMembershipAction, previewProgramLegacyMapMembership, applyProgramLegacyMapMembershipPreview, type ProgramLegacyMapMembershipAction } from '@/lib/flow/integrated-poc/legacy-map-membership-transition';
import { programErrorMessage, type ProgramMutate } from '@/lib/flow/integrated-poc/ui-contract';
import styles from './ProgramLegacyMapMembership.module.css';

type Draft = { reviewId: string; choices: Record<string, 'mine' | 'incoming'>; expectedSpace: ProgramData['spaces'][string] };
type Preview = { data: ProgramData; stage: Extract<ProgramLegacyMapMembershipAction, { type: 'stage' }>; expectedSpace: ProgramData['spaces'][string] };
type Props = { data: ProgramData; groupRef: string; mutate: ProgramMutate; disabled?: boolean;
  onRegisterEditors?: (port: ProgramEditorFlush | null) => void; onPendingChange?: (pending: boolean) => void; canStart?: () => boolean };

export function programMapMembershipIssue(reason: string) {
  return ({ 'no-source-change': '비교할 하위 Flow 구성 변경이 없습니다.', 'missing-choice': '바뀐 Flow마다 유지할 연결을 선택해 주세요.',
    'source-conflict': '비교 이후 Map 구성이 바뀌었습니다. 선택은 유지했으니 취소한 뒤 다시 비교해 주세요.',
    'empty-map-not-supported': '하위 Flow가 모두 없는 원본은 아직 수용하지 않습니다. 개인 문서와 기록은 그대로 남습니다.',
    'new-child-acceptance-not-supported': '새 하위 Flow를 추가하는 연결은 아직 지원하지 않습니다. 현재 개인 계획은 변경하지 않았습니다.',
    'invalid-current-map': '현재 제공된 Map 자료를 확인하지 못했습니다. 개인 문서와 기록은 변경하지 않았습니다.' } as Record<string, string>)[reason] ?? programErrorMessage(reason);
}

/** Local radio choices are not persisted until one explicit atomic acceptance.
 * Reading, closing, Escape, and a failed save leave the stored state unchanged. */
export function ProgramLegacyMapMembership({ data, groupRef, mutate, disabled, onRegisterEditors, onPendingChange, canStart }: Props) {
  const actorId = data.activeActorId, live = useRef({ data, disabled, canStart }); live.current = { data, disabled, canStart };
  const [preview, setPreviewState] = useState<Preview | null>(null), previewRef = useRef(preview); previewRef.current = preview;
  const setPreview = (next: Preview | null) => { previewRef.current = next; setPreviewState(next); };
  const [draft, setDraftState] = useState<Draft | null>(null), pending = useRef(draft); pending.current = draft;
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null), [confirmUndo, setConfirmUndo] = useState(false);
  const undoPending = useRef(confirmUndo); undoPending.current = confirmUndo;
  const [busy, setBusy] = useState(false), busyRef = useRef(false), locks = useRef(0), [locked, setLocked] = useState(false);
  const [message, setMessage] = useState(''), [failed, setFailed] = useState(false);
  const change = (next: Draft | null) => { pending.current = next; setDraftState(next); };
  useEffect(() => {
    const port: ProgramEditorFlush = {
      hasPendingInput: () => !!previewRef.current || !!pending.current || undoPending.current || busyRef.current,
      flushAll: async () => !previewRef.current && !pending.current && !undoPending.current && !busyRef.current,
      lockInput: () => { locks.current++; setLocked(true); let released = false; return () => { if (released) return; released = true; locks.current--; setLocked(locks.current > 0); }; },
      pendingDocumentIds: () => {
        const read = readProgramLegacyMapMembership(live.current.data, actorId, groupRef);
        return read.ok ? live.current.data.spaces[actorId].savedBindings.filter(binding => read.originalChildren.some(flow => flow.ref === binding.flowRef)).map(binding => binding.documentId) : [];
      },
      captureDrafts: () => pending.current ? [{ title: 'Map 하위 Flow 연결 선택', raw: JSON.stringify(pending.current.choices, null, 2) }] : [],
      blocksExternalSnapshot: () => !!previewRef.current || !!pending.current || undoPending.current || busyRef.current,
    };
    onRegisterEditors?.(port); return () => onRegisterEditors?.(null);
  }, [actorId, groupRef, onRegisterEditors]);
  const hasPending = !!preview || !!draft || confirmUndo || busy;
  useEffect(() => { onPendingChange?.(hasPending); return () => onPendingChange?.(false); }, [hasPending, onPendingChange]);
  const read = readProgramLegacyMapMembership(preview?.data ?? data, actorId, groupRef);
  if (!read.ok) return <p role="status">Map 구성을 읽지 못했습니다. 원본과 개인 기록은 변경하지 않았습니다.</p>;
  const owner = read.owner, reviews = owner?.reviews.filter(review => review.status !== 'applied') ?? [];
  const active = reviews.find(review => review.id === activeReviewId);
  const comparison = owner && active ? programLegacyMapMembershipReviewChanges(owner, read.originalChildren, active) : null;
  const stale = !!active && active.expectedSelection !== read.selectionToken || !!draft && !programSame(draft.expectedSpace, data.spaces[actorId]) || !!preview && !programSame(preview.expectedSpace, data.spaces[actorId]);
  const blocked = !!disabled || busy || locked;
  const close = () => { if (busyRef.current || locks.current) return; setPreview(null); change(null); setActiveReviewId(null); undoPending.current = false; setConfirmUndo(false); setMessage('검토를 닫았습니다. 저장한 구성은 바뀌지 않았습니다.'); setFailed(false); };
  const run = async (action: ProgramLegacyMapMembershipAction, expectedSpace = programClone(data.spaces[actorId])) => {
    if (busyRef.current || locks.current || live.current.disabled || live.current.canStart?.() === false) return;
    if (action.type === 'stage') {
      if (previewRef.current || pending.current) return;
      const result = previewProgramLegacyMapMembership(live.current.data, { actorId, ...action });
      if (!result.ok) { const reason = 'membershipReason' in result && typeof result.membershipReason === 'string' ? result.membershipReason : result.reason; setFailed(reason !== 'no-source-change'); setMessage(programMapMembershipIssue(reason)); return; }
      setPreview({ data: result.data, stage: action, expectedSpace: programClone(live.current.data.spaces[actorId]) });
      setActiveReviewId(action.requestId); setFailed(false); setMessage('현재 제공 자료와 비교했습니다. 적용하기 전에는 저장하지 않습니다.'); return;
    }
    busyRef.current = true; setBusy(true); setMessage('');
    try {
      let membershipReason: string | undefined;
      const result = await mutate('Map 하위 Flow 연결', current => {
        const local = previewRef.current;
        const transition = action.type === 'apply' && local ? applyProgramLegacyMapMembershipPreview(current, { actorId, expectedSpace: local.expectedSpace, stage: local.stage, choices: action.choices ?? {}, expectedPreview: local.data }) : applyProgramLegacyMapMembershipAction(current, { actorId, expectedSpace, action });
        if (!transition.ok && 'membershipReason' in transition && typeof transition.membershipReason === 'string') membershipReason = transition.membershipReason;
        return transition;
      });
      setFailed(!result.ok);
      if (!result.ok) { setFailed(membershipReason !== 'no-source-change'); setMessage(programMapMembershipIssue(membershipReason ?? result.reason)); return; }
      setPreview(null); change(null); setActiveReviewId(null); undoPending.current = false; setConfirmUndo(false); setMessage(action.type === 'undo' ? 'Map 연결 선택을 되돌렸습니다. 개인 문서와 기록은 남았습니다.' : '선택한 Map 연결을 적용했습니다. 개인 문서와 기록은 남았습니다.');
    } catch { setFailed(true); setMessage('저장하지 못했습니다. 선택은 유지했으니 다시 시도해 주세요.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <section className={styles.panel} aria-label="Map 하위 Flow 구성" aria-busy={busy} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close(); } }}>
    <details open={!!active || !!read.retainedChildren.length || confirmUndo}>
      <summary>Map 구성 변경 확인</summary>
      <p>하위 Flow 연결을 비교합니다. 원문·개인 날짜·메모·지난 기록은 삭제하지 않습니다.</p>
      {read.retainedChildren.length > 0 && <p role="status">Map 실행에서 제외하고 기록 보존: {read.retainedChildren.map(flow => flow.title).join(', ')}</p>}
      <div className={styles.actions}><button type="button" disabled={blocked || !!preview || !!draft || confirmUndo} onClick={() => void run({ type: 'stage', groupRef, requestId: programId('map-membership-review'), expectedSourceToken: read.sourceToken, now: new Date().toISOString() })}>현재 Map 구성 비교</button>
        {!!owner?.undo && <button type="button" disabled={blocked || !!draft || !!active || confirmUndo} onClick={() => { undoPending.current = true; setConfirmUndo(true); }}>마지막 구성 선택 되돌리기</button>}</div>
      {!active && reviews.length > 0 && <ul className={styles.reviews}>{reviews.map((review, index) => <li key={review.id}><button type="button" disabled={blocked || confirmUndo} onClick={() => { setActiveReviewId(review.id); setMessage(''); }}>보관한 구성 비교 {index + 1}{review.status === 'deferred' ? ' · 나중에 보기' : ''}</button></li>)}</ul>}
      {active && comparison?.ok && <>
        {comparison.changes.map(changeRow => {
          const flow = read.originalChildren.find(flow => flow.ref === changeRow.flowRef)!;
          const choices = draft?.reviewId === active.id ? draft.choices : active.choices;
          return <fieldset key={changeRow.id} disabled={blocked || stale}>
            <legend>{flow.title}</legend><p>{changeRow.kind === 'removed' ? '새 Map 원본에서 빠진 Flow입니다.' : '새 Map 원본에 다시 제공된 Flow입니다.'}</p>
            {(['mine', 'incoming'] as const).map(choice => <label key={choice}><input type="radio" name={`map-membership-${active.id}-${changeRow.id}`} checked={choices[changeRow.id] === choice}
              onChange={() => { if (busyRef.current || locks.current || live.current.disabled) return; change({ reviewId: active.id, expectedSpace: draft?.expectedSpace ?? programClone(data.spaces[actorId]), choices: { ...choices, [changeRow.id]: choice } }); setMessage(''); }} />
              {choice === 'mine' ? '현재 연결 유지' : changeRow.kind === 'removed' ? 'Map 실행에서 제외 · 개인 기록 보존' : 'Map 실행에 다시 연결'}</label>)}
          </fieldset>;
        })}
        {stale && <p role="alert">검토 중 개인 내용이 바뀌었습니다. 선택은 남아 있으며 취소 후 다시 비교할 수 있습니다.</p>}
        <div className={styles.actions}><button type="button" disabled={blocked || stale || !comparison.changes.length || comparison.changes.some(row => !(draft?.choices ?? active.choices)[row.id])}
          onClick={() => void run({ type: 'apply', groupRef, reviewId: active.id, choices: draft?.choices ?? active.choices, now: new Date().toISOString() }, draft?.expectedSpace ?? programClone(data.spaces[actorId]))}>선택한 구성 적용</button><button type="button" disabled={busy || locked} onClick={close}>취소</button></div>
        <details><summary>비교 자료 확인</summary><p>이 앱에 제공된 구조 자료를 비교합니다. 실시간 수집이나 외부 게시 결과가 아닙니다.</p><pre>{JSON.stringify(owner?.revisions[active.incomingRevisionId], null, 2)}</pre></details>
      </>}
      {active && comparison && !comparison.ok && <p role="alert">{programMapMembershipIssue(comparison.reason)}</p>}
      {confirmUndo && <div role="alert"><p>마지막 Map 연결 선택만 되돌릴까요? 이후의 개인 기록은 남습니다.</p><div className={styles.actions}><button type="button" disabled={blocked} onClick={() => void run({ type: 'undo', groupRef, now: new Date().toISOString() })}>구성 선택 되돌리기 확인</button><button type="button" disabled={busy || locked} onClick={close}>취소</button></div></div>}
      {busy && <p role="status">저장 중…</p>}{message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
    </details>
  </section>;
}
