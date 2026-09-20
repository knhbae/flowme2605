'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ProgramData } from '@/lib/flow/integrated-poc/contract';
import { inspectProgramPrivateOutput, makeProgramPrivateOutput } from '@/lib/flow/integrated-poc/private-output';
import type { ProgramOutput, ProgramOutputFormat } from '@/lib/flow/integrated-poc/output';
import { programLocalDate, programShiftDate } from '@/lib/flow/integrated-poc/execution';
import { PRIVATE_OUTPUT_OCCURRENCES_V1, validPrivateOutputOccurrenceRange, type PrivateOutputOccurrenceRange } from '@/lib/flow/integrated-poc/private-output-occurrences';
import styles from './ProgramPrivateOutput.module.css';
import { programOutputReturnBase } from '@/lib/flow/integrated-poc/output-return';

export type ProgramPrivateOutputProps = { data: ProgramData; documentId: string; onClose: () => void };

export function ProgramPrivateOutput({ data, documentId, onClose }: ProgramPrivateOutputProps) {
  const dialog = useRef<HTMLDialogElement>(null), inFlight = useRef(false);
  const actor = useRef(data.activeActorId).current;
  const [occurrenceRange, setOccurrenceRange] = useState<PrivateOutputOccurrenceRange | undefined>();
  const [rangeDraft, setRangeDraft] = useState<PrivateOutputOccurrenceRange>(() => { const from = programLocalDate(); return { from, to: programShiftDate(from, 27), includeUndated: false }; });
  const [rangeError, setRangeError] = useState('');
  const [rangeDirty, setRangeDirty] = useState(false), rangeErrorId = useId();
  const [mode, setMode] = useState<'raw' | 'tasks'>('raw');
  const [includeReturn, setIncludeReturn] = useState(false), [returnPageUrl, setReturnPageUrl] = useState<string | undefined>();
  useEffect(() => { setReturnPageUrl(programOutputReturnBase(window.location.href) ?? undefined); }, []);
  const baseInspected = useMemo(() => inspectProgramPrivateOutput(data, { actorId: actor, documentId }), [data, actor, documentId]);
  const inspected = useMemo(() => mode === 'raw' || !occurrenceRange ? baseInspected
    : inspectProgramPrivateOutput(data, { actorId: actor, documentId, occurrenceRange }), [data, actor, documentId, occurrenceRange, mode, baseInspected]);
  const [format, setFormat] = useState<ProgramOutputFormat>('txt');
  const [selected, setSelected] = useState(() => inspected.ok ? inspected.rows.map(row => row.id) : []);
  const [review, setReview] = useState<{ fingerprint: string; output: Extract<ProgramOutput, { ok: true }> } | null>(null);
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const fingerprint = JSON.stringify({ source: inspected.ok ? inspected.fingerprint : null, actor: data.activeActorId, mode, format, selected, occurrenceRange, rangeDraft, includeReturn, returnPageUrl });
  const latest = useRef(fingerprint); latest.current = fingerprint;
  const stale = !!review && review.fingerprint !== fingerprint;
  useEffect(() => {
    const focus = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { if (focus?.isConnected) focus.focus(); };
  }, []);
  function preview() {
    if (mode === 'tasks' && rangeDirty) { setMessage('바꾼 회차 조회 기간을 적용하거나 취소해 주세요.'); return; }
    const output = makeProgramPrivateOutput(data, { actorId: actor, documentId, mode, selectedItemIds: selected, format, occurrenceRange, ...(mode === 'tasks' && includeReturn ? { returnPageUrl } : {}) }, new Date());
    if (!output.ok) {
      const messages: Record<string, string> = { 'no-items': '출력할 항목을 하나 이상 고르세요.', 'no-dated-items': '선택한 항목에 날짜가 없습니다. 텍스트나 CSV로 받을 수 있습니다.', 'empty-document': '문서에 내용이 없습니다.', forbidden: '인물이 바뀌었습니다. 현재 문서에서 다시 열어 주세요.', 'missing-document': '문서가 없거나 보관되었습니다.', 'invalid-occurrence-range': '회차 조회 기간을 확인해 주세요.', 'occurrence-source-unavailable': '회차 원본을 안전하게 읽지 못했습니다. 원문 확인 후 다시 열어 주세요.' };
      setReview(null); setMessage(messages[output.reason] ?? '출력할 내용을 확인해 주세요.'); return;
    }
    setReview({ fingerprint, output }); setMessage('');
  }
  async function transfer(kind: 'download' | 'copy') {
    if (inFlight.current || !review || review.fingerprint !== latest.current) return;
    inFlight.current = true; setBusy(true); setMessage('');
    try {
      if (kind === 'copy') await navigator.clipboard.writeText(review.output.payload);
      else {
        const url = URL.createObjectURL(new Blob([review.output.payload], { type: review.output.mime }));
        try { const link = document.createElement('a'); link.href = url; link.download = review.output.filename; document.body.append(link); link.click(); link.remove(); }
        finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
      }
      setMessage(kind === 'copy' ? '미리 본 내용을 복사했습니다.' : '파일 다운로드를 요청했습니다. 브라우저의 다운로드 목록에서 확인하세요.');
    } catch { setMessage('내보내지 못했습니다. 미리보기의 내용을 직접 복사하거나 다시 시도하세요.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="private-output-title" onCancel={event => { event.preventDefault(); if (!inFlight.current) onClose(); }}>
    <header className={styles.heading}><div><h2 id="private-output-title">내 문서 내보내기</h2><p>{baseInspected.ok ? baseInspected.title : '문서를 사용할 수 없습니다.'}</p></div><button type="button" disabled={busy} onClick={onClose}>닫기</button></header>
    {!baseInspected.ok ? <p role="alert">문서와 현재 인물을 확인한 뒤 다시 열어 주세요.</p> : <>
      <p>내가 수정한 내용입니다. 개인 날짜·진행·메모가 포함될 수 있으니 파일을 공유하기 전에 확인하세요.</p>
      <label className={styles.field}>출력 범위<select value={mode} disabled={busy} onChange={event => { setMode(event.target.value as typeof mode); setFormat('txt'); setReview(null); setMessage(''); }}><option value="raw">문서 원문 전체 · TXT</option><option value="tasks">실행 항목 선택 · TXT / CSV / ICS</option></select></label>
      {mode === 'raw' ? <p>독립 메모와 실행에서 제외한 행까지 문서 원문 그대로 담습니다. 연결 표시를 펼치거나 별도 진행 이력을 합치지 않습니다.</p> : !inspected.ok ? <section className={styles.section}>
        <p role="alert">회차 원본을 안전하게 읽지 못했습니다. 조회를 다시 시작하거나 문서 원문 TXT로 전환할 수 있습니다.</p>
        <button type="button" disabled={busy} onClick={() => { setOccurrenceRange(undefined); setSelected(ids => ids.filter(id => baseInspected.rows.some(row => row.id === id))); setRangeDirty(false); setRangeError(''); setReview(null); setMessage(''); }}>회차 조회 다시 시작</button>
      </section> : <section className={styles.section}>
        {inspected.hasRecurrences && <fieldset className={styles.range}><legend>반복 회차 조회</legend><p>실행 날짜 기준으로 조회합니다. 조회나 선택만으로 개인 일정은 바뀌지 않습니다.</p>
          <div className={styles.actions}><label className={styles.field}>조회 시작일<input type="date" disabled={busy} value={rangeDraft.from} aria-invalid={!!rangeError} aria-describedby={rangeError ? rangeErrorId : undefined} onChange={event => { setRangeDirty(true); setRangeDraft(value => ({ ...value, from: event.target.value })); }} /></label>
            <label className={styles.field}>조회 종료일<input type="date" disabled={busy} value={rangeDraft.to} aria-invalid={!!rangeError} aria-describedby={rangeError ? rangeErrorId : undefined} onChange={event => { setRangeDirty(true); setRangeDraft(value => ({ ...value, to: event.target.value })); }} /></label></div>
          <label><input type="checkbox" disabled={busy} checked={rangeDraft.includeUndated} onChange={event => { setRangeDirty(true); setRangeDraft(value => ({ ...value, includeUndated: event.target.checked })); }} /> 날짜 미정 회차도 포함</label>
          <div className={styles.actions}><button type="button" disabled={busy} onClick={() => {
            if (!validPrivateOutputOccurrenceRange(rangeDraft)) { setRangeError(`시작일부터 종료일까지 최대 ${PRIVATE_OUTPUT_OCCURRENCES_V1.maxRangeDays}일 범위로 선택해 주세요.`); return; }
            const next = inspectProgramPrivateOutput(data, { actorId: actor, documentId, occurrenceRange: rangeDraft });
            if (!next.ok) { setRangeError('회차 원본을 안전하게 읽지 못했습니다. 기존 선택은 유지했습니다.'); return; }
            setOccurrenceRange({ ...rangeDraft }); setSelected(ids => ids.filter(id => next.rows.some(row => row.id === id))); setReview(null); setRangeError(''); setRangeDirty(false);
          }}>조회 기간 적용</button>{rangeDirty && <button type="button" disabled={busy} onClick={() => { const from = programLocalDate(); setRangeDraft(occurrenceRange ? { ...occurrenceRange } : { from, to: programShiftDate(from, 27), includeUndated: false }); setRangeError(''); setRangeDirty(false); }}>조회 변경 취소</button>}</div>
          {occurrenceRange && <p>적용한 기간: {occurrenceRange.from} ~ {occurrenceRange.to} · {inspected.rows.filter(row => row.kind === 'occurrence').length}회차. 내보낼 회차는 아래에서 선택하세요.</p>}
          {rangeError && <p id={rangeErrorId} role="alert">{rangeError}</p>}
        </fieldset>}
        <div className={styles.actions}><h3>내보낼 실행 항목</h3><button type="button" disabled={busy} onClick={() => setSelected(selected.length ? [] : inspected.rows.map(row => row.id))}>{selected.length ? '선택 해제' : '모두 선택'}</button></div>
        {!inspected.rows.length && <p>출력할 실행 항목이 없습니다. 일반 메모는 문서 원문 TXT로 받을 수 있습니다.</p>}
        <ul className={styles.rows}>{inspected.rows.map(row => <li key={row.id}><label><input type="checkbox" disabled={busy} checked={selected.includes(row.id)} onChange={event => setSelected(previous => event.target.checked ? [...previous, row.id] : previous.filter(id => id !== row.id))} /><span>{row.title}<small>{row.date ?? '날짜 미정'} · 진행 {row.progress}%{row.time ? ` · ${row.time}` : ''}{row.timeZone ? ` · 원문 ${row.timeZone}` : ''}</small></span></label></li>)}</ul>
        <label className={styles.field}>파일 형식<select disabled={busy} value={format} onChange={event => setFormat(event.target.value as ProgramOutputFormat)}><option value="txt">텍스트 · 메모</option><option value="csv">CSV · 스프레드시트</option><option value="ics">ICS · 캘린더</option></select></label>
        {inspected.warnings.map(warning => <p key={warning}>{warning}</p>)}
        <label><input type="checkbox" disabled={busy || !returnPageUrl} checked={includeReturn} onChange={event => setIncludeReturn(event.target.checked)} /> 이 브라우저로 돌아오는 링크 포함</label>
        <p>{returnPageUrl ? '같은 로컬 PoC 주소·브라우저 프로필에서만 열립니다. 링크에는 개인 문서와 항목 식별자가 들어가며, 다른 기기나 계정에서 내용을 동기화하지 않습니다.' : '현재 주소에서는 안전한 복귀 링크를 만들 수 없습니다. 링크 없이 파일을 받을 수 있습니다.'}</p>
        {includeReturn && inspected.rows.some(row => selected.includes(row.id) && !row.returnTarget) && <p>원래 항목의 위치를 정확히 확인하지 못한 항목에는 복귀 링크를 넣지 않습니다. 해당 항목의 출력 내용은 유지합니다.</p>}
        {format === 'ics' && <p>실행 시간이 있는 항목은 해당 시각으로, 시간이 없으면 종일 일정으로 출력합니다. 날짜 미정 항목 {inspected.rows.filter(row => selected.includes(row.id) && !row.date).length}개는 ICS에서 제외합니다. 진행과 메모는 일정 설명에 담습니다.</p>}
      </section>}
      {review && <section className={styles.section}><h3>실제 파일 내용</h3><p>{new TextEncoder().encode(review.output.payload).byteLength.toLocaleString('ko-KR')}바이트{mode === 'tasks' ? ` · ${review.output.itemIds.length}개 항목` : ''}</p><textarea className={styles.preview} aria-label="실제 출력 내용" readOnly value={review.output.payload} rows={10} />{stale && <p role="alert">내용이나 선택이 바뀌었습니다. 미리보기를 다시 확인하세요.</p>}</section>}
      <div className={styles.actions}><button type="button" disabled={busy} onClick={preview}>출력 내용 미리보기</button>{review && !stale && <><button type="button" className={styles.primary} disabled={busy} onClick={() => void transfer('download')}>{review.output.filename.split('.').pop()?.toUpperCase()} 파일 받기</button><button type="button" disabled={busy} onClick={() => void transfer('copy')}>내용 복사</button></>}</div>
    </>}
    {message && <p role="status">{message}</p>}
  </dialog>;
}

export default ProgramPrivateOutput;
