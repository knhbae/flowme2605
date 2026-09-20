'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { programId, type ProgramData } from '@/lib/flow/integrated-poc/contract';
import type { ProgramMutate, ProgramNavigate } from '@/lib/flow/integrated-poc/ui-contract';
import { classifyProgramUrl, makeProgramOutput, type ProgramOutput, type ProgramOutputFormat } from '@/lib/flow/integrated-poc/output';
import { programCatalogMetadata } from '@/lib/flow/integrated-poc/catalog';
import { programRecurringScheduleLabel, PROGRAM_PUBLIC_RECURRENCE_WINDOW } from '@/lib/flow/integrated-poc/public-recurrence-contract';
import { programOrdinaryTimingLabel } from '@/lib/flow/integrated-poc/public-ordinary-time';
import { defaultProgramOutputRecurrenceWindow } from '@/lib/flow/integrated-poc/public-output-recurrence';
import { programPublicOutputBase, resolveProgramPublicOutputReturn } from '@/lib/flow/integrated-poc/public-output-return';
import type { ProgramDiscoveryDetailPresentation } from '@/lib/flow/integrated-poc/navigation';
import { readProgramDiscoveryPresentation, type ProgramDiscoveryNavigation, type ProgramDiscoveryPresentation, type ProgramNavigationCheckpoint } from '@/lib/flow/integrated-poc/navigation';
import { createTransientOutputDraft, previewTransientOutput, confirmTransientOutput, confirmedTransientOutput, type TransientOutputDraft, type TransientOutputRow } from '@/lib/flow/integrated-poc/transient-output';
import styles from './ProgramDiscovery.module.css';

export type ProgramDiscoveryDraftState = {
  url: string; urlOpen: boolean; checkedUrl: string | null; pastedText: string; pastedTitle: string;
  transient: TransientOutputDraft | null;
  transientSource: { text: string; title: string; url: string } | null;
};
/** In-memory compatibility state; only captureProgramDiscoveryPresentation may enter history. */
export type ProgramDiscoveryNavigationState = ProgramDiscoveryPresentation & ProgramDiscoveryDraftState;
export function createProgramDiscoveryNavigationState(): ProgramDiscoveryNavigationState {
  return { query: '', category: '', situation: '', url: '', urlOpen: false, checkedUrl: null, pastedText: '', pastedTitle: '', lastFlowId: null, scrollTop: 0, versionByFlow: {}, details: {}, transient: null, transientSource: null };
}
/** In-memory work is not written to history or storage; closing needs a warning
 * even while a different actor or view is selected. */
export function programDiscoveryHasUnstoredInput(state: ProgramDiscoveryNavigationState): boolean {
  return !!(state.url.trim() || state.pastedText || state.pastedTitle.trim() || state.transient);
}
export function captureProgramDiscoveryPresentation(state: ProgramDiscoveryNavigationState): ProgramDiscoveryPresentation | null {
  return readProgramDiscoveryPresentation({ query: state.query, category: state.category, situation: state.situation,
    lastFlowId: state.lastFlowId, scrollTop: state.scrollTop, versionByFlow: state.versionByFlow, details: state.details });
}
export function restoreProgramDiscoveryPresentation(state: ProgramDiscoveryNavigationState, checkpoint: ProgramNavigationCheckpoint, actorId: string): ProgramDiscoveryNavigationState | null {
  if (checkpoint.actorId !== actorId) return null;
  const presentation = readProgramDiscoveryPresentation(checkpoint.discovery);
  // An old history entry must not erase or resurrect the current in-memory raw draft.
  return presentation ? { ...state, ...presentation } : null;
}
export type ProgramDiscoveryProps = {
  data: ProgramData; mutate: ProgramMutate; navigate: ProgramNavigate; selectedFlowId?: string; today: string;
  selectedVersionId?: string; selectedItemId?: string; selectedOutputReturn?: string;
  onUseVersion: (versionId: string, selectedItemIds: string[], anchor: string | null, recurrenceStarts?: Record<string, string>) => Promise<boolean>;
  onStartText: (raw: string, title: string) => Promise<boolean>;
  navigationState?: ProgramDiscoveryNavigationState;
  onNavigationStateChange?: (state: ProgramDiscoveryNavigationState) => void;
  onRegisterNavigation?: (navigation: ProgramDiscoveryNavigation | null) => void;
};
export type ProgramOutputPort = { copyText: (text: string) => Promise<void>; download: (file: { filename: string; mime: string; payload: string }) => Promise<void> };
export async function transferProgramOutput(output: ProgramOutput, mode: 'copy' | 'download', port: ProgramOutputPort): Promise<
  { ok: true; bytes: number; count: number; undatedCount: number; action: 'copied' | 'download-requested' } | { ok: false; reason: string }
> {
  if (!output.ok) return { ok: false, reason: output.reason };
  try {
    if (mode === 'copy') await port.copyText(output.payload);
    else await port.download({ filename: output.filename, mime: output.mime, payload: output.payload });
    return { ok: true, bytes: new TextEncoder().encode(output.payload).byteLength, count: output.itemIds.length,
      undatedCount: output.undatedItemIds.length, action: mode === 'copy' ? 'copied' : 'download-requested' };
  } catch { return { ok: false, reason: mode === 'copy' ? 'copy-failed' : 'download-failed' }; }
}
const browserOutputPort: ProgramOutputPort = {
  copyText: text => navigator.clipboard.writeText(text),
  download: async file => {
    const blob = new Blob([file.payload], { type: file.mime }); const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = file.filename;
    try { document.body.appendChild(link); link.click(); } finally { link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
  },
};
const failureText: Record<string, string> = {
  'missing-recurrence-window': '캘린더로 받을 반복 범위를 정해 주세요.',
  'invalid-recurrence-window': '반복 출력 범위를 확인해 주세요. 입력값을 자동으로 줄이지 않았습니다.',
  'missing-recurrence-start': '선택한 반복 항목의 시작일을 정하면 캘린더로 받을 수 있습니다.',
  'invalid-recurrence-start': '반복 항목의 시작일을 확인해 주세요. 원래 고정 날짜는 바꾸지 않습니다.',
  'empty-recurrence-window': '이 범위에는 반복 회차가 없습니다. 첫 회차나 조회 주를 바꿔 주세요.',
  'unsupported-schedule': '지원하지 않는 일정입니다. 날짜 미정으로 바꾸지 않았습니다.',
  'no-items': '출력할 항목을 하나 이상 선택해 주세요.', 'no-dated-items': '선택한 항목에 날짜가 없습니다. 텍스트나 CSV로 받을 수 있습니다.',
  'missing-anchor': '기준일을 넣으면 상대 일정의 날짜를 확인할 수 있습니다.', 'invalid-date': '실제 달력에 있는 날짜를 넣어 주세요.',
  'copy-failed': '복사하지 못했습니다. 아래 결과를 직접 선택해 복사하거나 파일로 받아 주세요.',
  'download-failed': '파일 받기를 시작하지 못했습니다. 다시 시도하거나 결과를 복사해 주세요.',
  'invalid-version': '이 판본을 안전하게 출력할 수 없습니다. 원문과 항목을 다시 확인해 주세요.',
  'empty-source': '파일로 옮길 원문을 먼저 붙여넣어 주세요.', 'source-limit': '원문은 3만 자·1,200줄 안에서 나누어 넣어 주세요.',
  'invalid-source-url': '출처 주소에서 로그인 정보·비밀 값·로컬 주소를 제거해 주세요.',
  'confirmation-required': '수정한 결과를 확인한 뒤 출력 내용을 확정해 주세요.',
};
const errorText = (reason: string) => failureText[reason] ?? '내용이 달라졌습니다. 현재 판본과 선택 항목을 다시 확인해 주세요.';
const excerpt = (value: string) => value.split('\n').find(Boolean) ?? '';

export function TransientOutputEditor({ draft, stale, onChange, onDiscard }: { draft: TransientOutputDraft; stale: boolean; onChange: (draft: TransientOutputDraft) => void; onDiscard: () => void }) {
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [discarding, setDiscarding] = useState(false);
  const flight = useRef(false);
  const edit = (patch: Partial<TransientOutputDraft>) => { onChange({ ...draft, ...patch, confirmed: null }); setMessage(''); };
  const editRow = (id: string, patch: Partial<TransientOutputRow>) => edit({ rows: draft.rows.map(row => row.id === id ? { ...row, ...patch } : row) });
  const confirmed = confirmedTransientOutput(draft);
  const preview = confirmed.ok ? confirmed : previewTransientOutput(draft, new Date());
  const transfer = async (mode: 'copy' | 'download') => {
    if (flight.current || stale) return;
    const output = confirmedTransientOutput(draft); if (!output.ok) { setMessage(errorText(output.reason)); return; }
    flight.current = true; setBusy(true);
    const result = await transferProgramOutput(output, mode, browserOutputPort);
    setMessage(result.ok ? `${result.action === 'copied' ? '내용을 복사했습니다.' : '브라우저에 파일 받기를 요청했습니다.'} ${result.bytes.toLocaleString('ko-KR')}바이트 · 개인 문서와 공개 목록은 만들지 않았습니다.` : errorText(result.reason));
    flight.current = false; setBusy(false);
  };
  return <section className={styles.transient} aria-label="저장하지 않는 출력 초안">
    <h2>내 도구로 옮길 내용</h2><p className={styles.notice}>이 초안은 화면을 오갈 때 유지되지만, 새로고침하거나 창을 닫으면 사라집니다. 필요한 결과는 파일이나 복사로 보관해 주세요.</p>
    {stale && <p className={styles.error} role="alert">위의 원문·제목·URL이 달라졌습니다. 원문으로 출력 초안을 다시 만든 뒤 확인해 주세요. 이전 결과는 받을 수 없습니다.</p>}
    <details><summary>원문과 처리 범위 확인</summary>{draft.warnings.map(warning => <p key={warning}>{warning}</p>)}<pre className={styles.raw}>{draft.raw}</pre></details>
    <fieldset disabled={busy} className={styles.transientFields}>
      <label className={styles.field}>출력 제목<input maxLength={240} value={draft.title} onChange={event => edit({ title: event.target.value })} /></label>
      <details><summary>출처 표시 수정</summary><label className={styles.field}>출처 설명<input maxLength={500} value={draft.sourceLabel} onChange={event => edit({ sourceLabel: event.target.value })} /></label><label className={styles.field}>출처 URL · 선택<input type="url" maxLength={3000} value={draft.sourceUrl} onChange={event => edit({ sourceUrl: event.target.value })} /></label></details>
      <ol className={styles.transientRows}>{draft.rows.map(row => <li key={row.id}>
        <label className={styles.itemChoice}><input type="checkbox" checked={row.selected} onChange={event => editRow(row.id, { selected: event.target.checked })} /><span><strong>{row.title || '제목을 입력해 주세요'}</strong><small>{row.kind === 'memo' ? '메모 · 행동을 자동으로 만들지 않았습니다' : '원문에 명시된 할 일'}</small></span></label>
        <details><summary>내용·날짜 수정</summary><label className={styles.field}>항목 제목<input value={row.title} maxLength={500} onChange={event => editRow(row.id, { title: event.target.value })} /></label><label className={styles.field}>설명·원문 내용<textarea rows={4} value={row.description} maxLength={30000} onChange={event => editRow(row.id, { description: event.target.value })} /></label>
          <div className={styles.transientDates}><label className={styles.field}>일정<select value={row.scheduleKind} onChange={event => editRow(row.id, { scheduleKind: event.target.value as TransientOutputRow['scheduleKind'], scheduleValue: '' })}><option value="undated">날짜 미정</option><option value="fixed">고정 날짜</option><option value="relative">기준일과의 간격</option></select></label>{row.scheduleKind !== 'undated' && <label className={styles.field}>{row.scheduleKind === 'fixed' ? '고정 날짜' : '기준일 전 -일 / 후 +일'}<input type={row.scheduleKind === 'fixed' ? 'date' : 'text'} inputMode={row.scheduleKind === 'relative' ? 'numeric' : undefined} value={row.scheduleValue} maxLength={100} onChange={event => editRow(row.id, { scheduleValue: event.target.value })} /></label>}</div>
          <label className={styles.field}>완료 기준 · 선택<input value={row.completionCriteria} maxLength={30000} onChange={event => editRow(row.id, { completionCriteria: event.target.value })} /></label>
          <label className={styles.field}>항목 출처 URL · 선택<input type="url" value={row.sourceUrl ?? ''} maxLength={3000} onChange={event => editRow(row.id, { sourceUrl: event.target.value || null })} /></label>
          {row.subchecks.length > 0 && <label className={styles.field}>하위 확인 · 한 줄에 하나<textarea value={row.subchecks.map(check => check.title).join('\n')} onChange={event => editRow(row.id, { subchecks: event.target.value.split('\n').filter(Boolean).map((title, index) => ({ id: row.subchecks[index]?.id ?? `${row.id}-check-${index}`, title })) })} /></label>}
          <details><summary>이 항목에 사용한 원문</summary><pre className={styles.raw}>{row.sourceText}</pre></details>
        </details>
      </li>)}</ol>
      <div className={styles.transientDates}>{draft.rows.some(row => row.selected && row.scheduleKind === 'relative') && <label className={styles.field}>기준일<input type="date" value={draft.anchor} onChange={event => edit({ anchor: event.target.value })} /><small>고정 날짜에는 적용하지 않습니다.</small></label>}<label className={styles.field}>파일 형식<select value={draft.format} onChange={event => edit({ format: event.target.value as ProgramOutputFormat })}><option value="txt">텍스트 · 메모</option><option value="csv">CSV · 스프레드시트</option><option value="ics">ICS · 캘린더</option></select></label></div>
    </fieldset>
    {preview.ok ? <><p className={styles.outputSize}>{preview.itemIds.length}개 항목 · {new TextEncoder().encode(preview.payload).byteLength.toLocaleString('ko-KR')}바이트</p>{draft.format === 'ics' && preview.undatedItemIds.length > 0 && <p className={styles.notice}>캘린더에서 제외되는 날짜 미정 항목: {draft.rows.filter(row => preview.undatedItemIds.includes(row.id)).map(row => row.title).join(', ')}. 텍스트·CSV에는 포함됩니다.</p>}<label className={styles.field}>실제 출력 미리보기<textarea className={styles.preview} readOnly rows={8} value={preview.payload} /></label></> : <p className={styles.error} role="alert">{errorText(preview.reason)}</p>}
    {draft.format === 'csv' && <p className={styles.muted}>수식으로 오인될 수 있는 값 앞에는 탭을 붙입니다.</p>}
    <div className={styles.actions}>{!confirmed.ok || stale ? <button className={styles.primary} type="button" disabled={busy || stale || !preview.ok} onClick={() => { const result = confirmTransientOutput(draft, new Date()); if (result.ok) { onChange(result.draft); setMessage('출력 내용을 확정했습니다. 개인 문서에는 저장하지 않았습니다.'); } else setMessage(errorText(result.reason)); }}>이 출력 내용 확정</button> : <><button className={styles.primary} type="button" disabled={busy} onClick={() => void transfer('download')}>{draft.format.toUpperCase()} 파일 받기</button><button type="button" disabled={busy} onClick={() => void transfer('copy')}>내용 복사</button></>}<button type="button" disabled={busy} onClick={() => setDiscarding(true)}>출력 초안 닫기</button></div>
    {message && <p role="status">{message}</p>}{discarding && <div className={styles.notice}><p>출력 초안의 편집과 확정을 지울까요? 위에 붙여넣은 원문은 유지됩니다.</p><button type="button" onClick={onDiscard}>출력 초안 지우고 닫기</button><button type="button" onClick={() => setDiscarding(false)}>계속 편집</button></div>}
  </section>;
}

export function ProgramDiscovery({ data, navigate, selectedFlowId, selectedVersionId, selectedItemId, selectedOutputReturn, today, onUseVersion, onStartText, navigationState, onNavigationStateChange, onRegisterNavigation }: ProgramDiscoveryProps) {
  const [local, setLocal] = useState(createProgramDiscoveryNavigationState);
  const state = navigationState ?? local; const stateRef = useRef(state); stateRef.current = state;
  const [message, setMessage] = useState(''); const [failed, setFailed] = useState(false); const [pending, setPending] = useState(false);
  const pendingRef = useRef(false); const uid = useId();
  const editedReturn = useRef<string | undefined>(undefined);
  const lastReturn = useRef(selectedOutputReturn);
  if (lastReturn.current !== selectedOutputReturn) { lastReturn.current = selectedOutputReturn; editedReturn.current = undefined; }
  const [outputBase, setOutputBase] = useState<string | null>(null);
  useEffect(() => { setOutputBase(programPublicOutputBase(window.location.href)); }, []);
  const update = (patch: Partial<ProgramDiscoveryNavigationState>) => {
    const next = { ...stateRef.current, ...patch }; stateRef.current = next; setLocal(next); onNavigationStateChange?.(next);
  };
  const updateRef = useRef(update); updateRef.current = update;
  useEffect(() => {
    const actorId = data.activeActorId;
    onRegisterNavigation?.({ actorId, capture: () => { const discovery = captureProgramDiscoveryPresentation(stateRef.current); return discovery ? { discovery } : {}; },
      restore: checkpoint => { const next = restoreProgramDiscoveryPresentation(stateRef.current, checkpoint, actorId); if (next) updateRef.current(next); } });
    return () => onRegisterNavigation?.(null);
  }, [data.activeActorId, onRegisterNavigation]);
  useEffect(() => {
    setMessage(''); setFailed(false);
    if (!selectedFlowId && stateRef.current.lastFlowId) {
      const focus = document.getElementById(`program-discovery-${stateRef.current.lastFlowId}`);
      focus?.focus({ preventScroll: true }); window.scrollTo({ top: stateRef.current.scrollTop });
    }
  }, [selectedFlowId]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (stateRef.current.transient) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, []);
  const flows = data.public.flows.filter(flow => !flow.archived);
  const flow = selectedFlowId ? data.public.flows.find(row => row.id === selectedFlowId) : undefined;
  const versions = flow ? data.public.versions.filter(row => row.flowId === flow.id).sort((a, b) => b.number - a.number) : [];
  const version = versions.find(row => row.id === (flow ? selectedVersionId ?? (flow.archived ? undefined : state.versionByFlow[flow.id] ?? flow.currentVersionId) : ''));
  const returnedDetail = selectedOutputReturn && outputBase ? resolveProgramPublicOutputReturn(selectedOutputReturn, outputBase, version, selectedItemId) : null;
  useEffect(() => {
    if (!selectedOutputReturn || !returnedDetail || !version) return;
    updateRef.current({details:{...stateRef.current.details,[version.id]:returnedDetail}});
    // The immutable token owns initial/reload selection; later explicit edits stay local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOutputReturn, outputBase, version?.id]);
  useEffect(() => {
    if (!selectedItemId || !version || selectedOutputReturn && !returnedDetail) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(`program-public-item-${encodeURIComponent(version.id)}-${encodeURIComponent(selectedItemId)}`);
      if (target) { target.querySelector('details')?.setAttribute('open', ''); target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'center', behavior: 'instant' }); }
    });
    return () => cancelAnimationFrame(frame);
  }, [version?.id, selectedItemId, selectedOutputReturn, outputBase]);
  const sourceMeta = version ? programCatalogMetadata(version.id) : undefined;
  const detail: ProgramDiscoveryDetailPresentation | undefined = version ? (selectedOutputReturn !== editedReturn.current ? returnedDetail : null) ?? state.details[version.id] ?? { selectedItemIds: version.items.map(item => item.id), anchor: '', format: 'txt' } : undefined;
  const patchDetail = (patch: Partial<NonNullable<typeof detail>>) => {
    if (!version || !detail || flow?.archived) return;
    editedReturn.current = selectedOutputReturn;
    update({ details: { ...stateRef.current.details, [version.id]: { ...detail, ...patch } } }); setMessage(''); setFailed(false);
  };
  const selectedSeries = version?.items.filter(item => item.schedule.kind === 'recurring' && detail?.selectedItemIds.includes(item.id)) ?? [];
  const recurrenceWindow = detail?.recurrenceWindow ?? defaultProgramOutputRecurrenceWindow();
  const recurrenceStarts = Object.fromEntries(Object.entries(detail?.recurrenceStarts ?? {}).filter(([id]) => selectedSeries.some(item => item.id === id)));
  const outputOptions = detail ? { selectedItemIds: detail.selectedItemIds, anchor: detail.anchor || null, format: detail.format,
    ...(selectedSeries.length ? { recurrenceWindow, recurrenceStarts } : {}) } : null;
  const output = version && outputOptions && !flow?.archived ? makeProgramOutput(version, { ...outputOptions, ...(outputBase ? {returnContext:{baseUrl:outputBase}} : {}) }, new Date()) : undefined;
  const canUseVersion = version && outputOptions && !flow?.archived ? makeProgramOutput(version, { ...outputOptions, recurrenceWindow: undefined, format: 'txt' }, new Date()).ok : false;
  const knownSources = flows.flatMap(row => {
    const current = data.public.versions.find(candidate => candidate.id === row.currentVersionId);
    return current?.source.url ? [{ url: current.source.url, version: current }] : [];
  });
  const urlResult = state.checkedUrl === state.url ? classifyProgramUrl(state.url, knownSources) : undefined;
  const showPastedInput = !!(urlResult && urlResult.kind !== 'known-source' || state.pastedText || state.pastedTitle || state.transient);
  const openFlow = (id: string) => { update({ lastFlowId: id, scrollTop: window.scrollY }); navigate({ view: 'flow', id }); };
  const run = async (work: () => Promise<boolean>, success: string) => {
    if (pendingRef.current) return;
    pendingRef.current = true; setPending(true); setMessage(''); setFailed(false);
    try { const accepted = await work(); setFailed(!accepted); setMessage(accepted ? success : '저장하지 못했습니다. 입력과 선택은 유지됩니다. 다시 시도해 주세요.'); }
    catch { setFailed(true); setMessage('저장하지 못했습니다. 입력과 선택은 유지됩니다. 다시 시도해 주세요.'); }
    finally { pendingRef.current = false; setPending(false); }
  };
  const transfer = async (mode: 'copy' | 'download') => {
    if (!output || pendingRef.current || flow?.archived) return;
    pendingRef.current = true; setPending(true);
    const receipt = await transferProgramOutput(output, mode, browserOutputPort);
    setFailed(!receipt.ok);
    setMessage(receipt.ok ? `${receipt.action === 'copied' ? '내용을 복사했습니다.' : '브라우저에 파일 받기를 요청했습니다.'} ${receipt.count}개 항목 · ${receipt.bytes.toLocaleString('ko-KR')}바이트${detail?.format === 'ics' && receipt.undatedCount ? ` · 날짜 없는 ${receipt.undatedCount}개 제외` : ''}` : errorText(receipt.reason));
    pendingRef.current = false; setPending(false);
  };
  const status = message ? <p className={failed ? styles.error : styles.status} role={failed ? 'alert' : 'status'}>{message}</p> : null;
  const prepareTransient = () => {
    const result = createTransientOutputDraft(state.pastedText, { id: programId('transient'), title: state.pastedTitle, sourceUrl: state.url }, new Date().toISOString());
    if (!result.ok) { setFailed(true); setMessage(errorText(result.reason)); return; }
    update({ transient: result.draft, transientSource: { text: state.pastedText, title: state.pastedTitle, url: state.url } }); setFailed(false); setMessage('');
  };

  if (selectedOutputReturn && (!outputBase || !returnedDetail)) return <section className={styles.page}><h1>출력한 공개 항목을 확인할 수 없습니다</h1><p>이 기기의 같은 주소와 저장된 판본에서만 열 수 있습니다. 다른 항목을 선택하거나 저장하지 않았습니다.</p><button onClick={() => navigate({view:'discover'})}>둘러보기로 돌아가기</button></section>;
  if (selectedFlowId && (!flow || !version || !detail)) return <section className={styles.page}><h1>이 Flow를 찾을 수 없습니다</h1><p>{flow?.archived && !selectedVersionId ? '보관된 Flow는 판본이 지정된 기존 링크에서 읽을 수 있습니다.' : '연결한 Flow 또는 판본이 없습니다. 다른 판본으로 바꾸지 않았습니다.'}</p><button type="button" onClick={() => navigate({ view: 'discover' })}>둘러보기로 돌아가기</button></section>;
  if (flow && version && detail) {
    const related = data.public.posts.filter(post => !post.deleted && post.flowId === flow.id);
    const derived = flow.derivedFrom ? data.public.versions.find(row => row.id === flow.derivedFrom?.versionId) : undefined;
    const children = flows.filter(row => row.derivedFrom?.flowId === flow.id);
    return <section className={styles.page} data-testid="program-flow-detail">
      {selectedOutputReturn && returnedDetail && <p role="status">출력한 공개 판본의 같은 항목으로 돌아왔습니다. 출력 선택·기준일·반복 범위를 복원했으며 원래 일정과 개인 기록은 변경하지 않았습니다.</p>}
      <button className={styles.back} type="button" onClick={() => navigate({ view: 'discover' })}>← 둘러보기</button>
      {flow.archived && <p className={styles.notice} role="status">공개 목록에서 내려 보관된 Flow입니다. 연결된 판본은 읽을 수 있지만 새로 가져오거나 출력할 수 없습니다. 기존 개인 사본과 기록은 그대로 남아 있습니다.</p>}
      <header className={styles.detailHeader}><p className={styles.eyebrow}>{flow.category} · {version.source.kind === 'simulated-example' ? '합성 예시' : version.source.kind === 'repository-source' ? '기존 출처 자료' : '사용자가 정리한 자료'}</p>
        <h1>{version.title}</h1><p>{excerpt(version.summary)}</p>
        <div className={styles.tags}>{flow.situations.map(tag => <span key={tag}>{tag}</span>)}</div>
      </header>
        <section className={styles.source} aria-label="출처와 판본"><div className={styles.row}><strong>{version.source.label}</strong>
          {version.source.url && <a href={version.source.url} target="_blank" rel="noreferrer noopener">원문 열기 ↗</a>}</div>
          <p className={styles.muted}>출처 확인 기록: {version.source.checkedAt ?? '없음'} · 지금 원문을 다시 확인한 결과는 아닙니다.</p>
          {sourceMeta?.sourceNeedsReview && <p className={styles.notice}>이 자료는 출처 재검토가 필요합니다. 현재 조건을 원문에서 확인해 주세요.</p>}
          <label className={styles.field}>읽는 판본<select value={version.id} disabled={pending} onChange={event => { update({ versionByFlow: { ...state.versionByFlow, [flow.id]: event.target.value } }); navigate({ view: 'flow', id: flow.id, versionId: event.target.value }); }}>{versions.map(row => <option key={row.id} value={row.id}>판본 {row.number}{row.id === flow.currentVersionId ? ' · 최신 등록본' : ' · 이전 등록본'}</option>)}</select></label>
          <details><summary>적용 범위와 주의사항</summary><p className={styles.pre}>{version.summary}</p><p className={styles.muted}>선택한 등록 판본은 개인 설정으로 바뀌지 않습니다. 작성자 검토와 발행은 로컬 PoC 안에서 이루어집니다.</p></details>
          {sourceMeta && <details><summary>저장소에 보관된 원문</summary><pre className={styles.raw}>{sourceMeta.originalRawText}</pre></details>}
          {derived && <button type="button" className={styles.linkButton} onClick={() => navigate({ view: 'flow', id: derived.flowId, versionId: derived.id })}>원본: {derived.title} · 판본 {derived.number}</button>}
          {children.length > 0 && <details><summary>이 Flow에서 파생된 자료 {children.length}개</summary>{children.map(child => <button type="button" className={styles.linkButton} key={child.id} onClick={() => navigate({ view: 'flow', id: child.id })}>{data.public.versions.find(row => row.id === child.currentVersionId)?.title ?? child.id}</button>)}</details>}
        </section>
      <div className={styles.detailGrid}><div>
        <section aria-labelledby={`${uid}-items`}><div className={styles.row}><h2 id={`${uid}-items`}>{flow.archived ? '보관된 항목' : '가져갈 항목'} <span>{flow.archived ? version.items.length : `${detail.selectedItemIds.length}/${version.items.length}`}</span></h2>{!flow.archived && <button type="button" disabled={pending} onClick={() => patchDetail({ selectedItemIds: detail.selectedItemIds.length === version.items.length ? [] : version.items.map(item => item.id) })}>{detail.selectedItemIds.length === version.items.length ? '선택 해제' : '전체 선택'}</button>}</div>
          {selectedItemId && !version.items.some(item => item.id === selectedItemId) && <p className={styles.notice} role="status">이 판본에서 연결된 항목을 찾을 수 없습니다. 다른 항목으로 바꾸지 않고 지정된 판본을 표시합니다.</p>}
          <ol className={styles.items}>{version.items.map(item => <li key={item.id} id={`program-public-item-${encodeURIComponent(version.id)}-${encodeURIComponent(item.id)}`} tabIndex={-1} aria-current={selectedItemId === item.id ? 'location' : undefined}><label className={styles.itemChoice}>{!flow.archived && <input type="checkbox" disabled={pending} checked={detail.selectedItemIds.includes(item.id)} onChange={event => patchDetail({ selectedItemIds: event.target.checked ? [...detail.selectedItemIds, item.id] : detail.selectedItemIds.filter(id => id !== item.id) })} />}<span><strong>{item.title}</strong><small>{item.schedule.kind === 'recurring' ? programRecurringScheduleLabel(item.schedule) : [item.schedule.kind === 'relative' ? `기준일 ${item.schedule.days === 0 ? '당일' : `${item.schedule.days > 0 ? '+' : ''}${item.schedule.days}일`}` : item.schedule.kind === 'fixed' ? item.schedule.date : '날짜 미정', programOrdinaryTimingLabel(item.schedule.timing)].filter(Boolean).join(' · ')}</small></span></label>
            {(item.description || item.completionCriteria || item.subchecks.length > 0) && <details className={styles.itemDetails}><summary>방법과 완료 기준</summary>{item.description && <p className={styles.pre}>{item.description}</p>}{item.completionCriteria && <p><strong>완료 기준</strong><br />{item.completionCriteria}</p>}{item.subchecks.length > 0 && <ul>{item.subchecks.map(check => <li key={check.id}>{check.title}</li>)}</ul>}</details>}</li>)}</ol>
        </section>
        <section className={styles.related}><div className={styles.row}><h2>관련 경험과 질문</h2><button type="button" onClick={() => navigate({ view: 'community' })}>커뮤니티 보기</button></div>{related.length ? related.map(post => <button className={styles.relatedPost} type="button" key={post.id} onClick={() => navigate({ view: 'community', id: post.id })}>{post.title}<small>로컬 PoC 글 · {data.actors.find(actor => actor.id === post.authorId)?.name ?? '예시 참여자'}</small></button>) : <p className={styles.muted}>아직 연결된 글이 없습니다. 경험을 쓰지 않아도 이 Flow를 사용할 수 있습니다.</p>}</section>
      </div><aside className={styles.output} aria-labelledby={`${uid}-output`}>
        <h2 id={`${uid}-output`}>{flow.archived ? '읽기 전용 판본' : '내 도구에서 사용'}</h2>
        {flow.archived ? <p className={styles.muted}>공개 철회 상태는 유지됩니다. 기존 개인 문서는 내 공간에서 계속 사용할 수 있습니다.</p> : <>
        {version.items.some(item => item.schedule.kind === 'relative' || item.schedule.kind === 'recurring' && item.schedule.start.kind === 'relative') && <label className={styles.field}>{sourceMeta?.anchorLabel ?? '기준일'}<input type="date" value={detail.anchor} disabled={pending} onChange={event => patchDetail({ anchor: event.target.value })} /><small>{sourceMeta?.anchorHint || '상대 일정에만 적용됩니다. 원문에 고정된 날짜는 유지됩니다.'}</small></label>}
        {selectedSeries.filter(item => item.schedule.kind === 'recurring' && item.schedule.start.kind === 'undated').map(item => <label key={item.id} className={styles.field}>시작일 · {item.title}<input type="date" disabled={pending} value={detail.recurrenceStarts?.[item.id] ?? ''} onChange={event => { const starts = { ...detail.recurrenceStarts }; if (event.target.value) starts[item.id] = event.target.value; else delete starts[item.id]; patchDetail({ recurrenceStarts: starts }); }} /><small>출력과 새 개인 사본에 사용할 날짜입니다. 공개 원본은 바뀌지 않습니다.</small></label>)}
        {selectedSeries.length > 0 && <details className={styles.recurrenceOptions}><summary>반복 출력 범위</summary><fieldset disabled={pending} className={styles.transientFields}>
          {selectedSeries.some(item => item.schedule.kind === 'recurring' && item.schedule.rule.end) && <><label className={styles.field}>첫 회차<input type="number" min={1} max={PROGRAM_PUBLIC_RECURRENCE_WINDOW.maxOffset + 1} value={recurrenceWindow.offset + 1} onChange={event => patchDetail({ recurrenceWindow: { ...recurrenceWindow, offset: event.currentTarget.value === '' ? -1 : Number(event.currentTarget.value) - 1 } })} /></label><label className={styles.field}>회차 수<input type="number" min={1} max={PROGRAM_PUBLIC_RECURRENCE_WINDOW.maxLimit} value={recurrenceWindow.limit} onChange={event => patchDetail({ recurrenceWindow: { ...recurrenceWindow, limit: Number(event.currentTarget.value) } })} /></label></>}
          {selectedSeries.some(item => item.schedule.kind === 'recurring' && !item.schedule.rule.end) && <><label className={styles.field}>시작 후 건너뛸 주<input type="number" min={0} max={PROGRAM_PUBLIC_RECURRENCE_WINDOW.maxWeekOffset} value={recurrenceWindow.openEndedOffsetWeeks} onChange={event => patchDetail({ recurrenceWindow: { ...recurrenceWindow, openEndedOffsetWeeks: Number(event.currentTarget.value) } })} /></label><label className={styles.field}>받을 기간 · 주<input type="number" min={1} max={PROGRAM_PUBLIC_RECURRENCE_WINDOW.maxWeeks} value={recurrenceWindow.openEndedWeeks} onChange={event => patchDetail({ recurrenceWindow: { ...recurrenceWindow, openEndedWeeks: Number(event.currentTarget.value) } })} /></label></>}
        </fieldset></details>}
        <label className={styles.field}>파일 형식<select value={detail.format} disabled={pending} onChange={event => patchDetail({ format: event.target.value as ProgramOutputFormat })}><option value="txt">텍스트 · 메모</option><option value="csv">CSV · 스프레드시트</option><option value="ics">ICS · 캘린더</option></select></label>
        <p className={styles.muted}>개인 사본을 만들지 않고 받을 수 있습니다.</p>
        {output?.ok && output.series?.map(series => <p key={series.itemId} className={styles.muted}>{version.items.find(item => item.id === series.itemId)?.title}: {series.scope ?? '시작일 미정 · 반복 규칙은 텍스트·CSV에 보존'}{series.time ? ` · ${series.time} ${series.timeZone ?? '(시간대 미정)'}` : ' · 종일'}</p>)}
        {detail.format === 'ics' && selectedSeries.length > 0 && <p className={styles.muted}>선택한 범위만 반복 묶음으로 받습니다. 범위가 겹치는 파일을 모두 가져오면 캘린더에 회차가 중복될 수 있습니다.</p>}
        {output?.ok ? <><p className={styles.outputSize}>{output.itemIds.length}개 항목 · {new TextEncoder().encode(output.payload).byteLength.toLocaleString('ko-KR')}바이트</p>{detail.format === 'ics' && output.undatedItemIds.length > 0 && <p className={styles.notice}>날짜 없는 {output.undatedItemIds.length}개는 캘린더 파일에 들어가지 않습니다. 텍스트·CSV에는 포함됩니다.</p>}<div className={styles.actions}><button type="button" className={styles.primary} disabled={pending} onClick={() => void transfer('download')}>{detail.format.toUpperCase()} 파일 받기</button><button type="button" disabled={pending} onClick={() => void transfer('copy')}>내용 복사</button></div><details><summary>실제 출력 내용</summary><textarea className={styles.preview} aria-label="실제 출력 내용" value={output.payload} readOnly rows={10} /></details></> : <p className={styles.notice}>{errorText(output && !output.ok ? output.reason : 'invalid-version')}</p>}
        {detail.format === 'csv' && <p className={styles.muted}>수식으로 오인될 수 있는 값 앞에는 탭을 붙입니다.</p>}
        {status}<hr /><button type="button" className={styles.useCopy} disabled={pending || !canUseVersion} onClick={() => void run(() => onUseVersion(version.id, version.items.filter(item => detail.selectedItemIds.includes(item.id)).map(item => item.id), detail.anchor || null, Object.keys(recurrenceStarts).length ? recurrenceStarts : undefined), '내 문서에 개인 사본을 연결했습니다.')}>내 문서에 가져오기</button><p className={styles.muted}>원본 판본을 보존한 개인 사본으로 시작합니다.</p></>}
      </aside></div>
    </section>;
  }

  const categories = [...new Set(flows.map(row => row.category))];
  const situations = [...new Set(flows.filter(row => !state.category || row.category === state.category).flatMap(row => row.situations))];
  const needle = state.query.trim().toLocaleLowerCase('ko');
  const visible = flows.filter(row => {
    const current = data.public.versions.find(candidate => candidate.id === row.currentVersionId);
    return current && (!state.category || row.category === state.category) && (!state.situation || row.situations.includes(state.situation))
      && (!needle || [current.title, current.summary, row.category, ...row.situations, ...current.items.map(item => item.title)].join('\n').toLocaleLowerCase('ko').includes(needle));
  });
  return <section className={styles.page} data-testid="program-discovery">
    <header className={styles.header}><p className={styles.eyebrow}>경험에서 시작하기</p><h1>둘러보기</h1><p>내 상황에 필요한 부분을 골라 메모·캘린더·문서로 가져가세요.</p></header>
    <div className={styles.filters}><label className={styles.search}>공개 Flow 검색<input id="program-public-search" type="search" value={state.query} onChange={event => update({ query: event.target.value })} placeholder="이사 준비, 혼자 여행…" /></label>
      <label className={styles.field}>분야<select id="program-public-category" value={state.category} onChange={event => update({ category: event.target.value, situation: '' })}><option value="">모든 분야</option>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
      <label className={styles.field}>상황<select id="program-public-situation" value={state.situation} onChange={event => update({ situation: event.target.value })}><option value="">모든 상황</option>{situations.map(situation => <option key={situation}>{situation}</option>)}</select></label></div>
    <details className={styles.urlEntry} open={state.urlOpen} onToggle={event => { const open = event.currentTarget.open; if (open !== stateRef.current.urlOpen) update({ urlOpen: open }); }}><summary>공개 URL에서 시작</summary><form noValidate onSubmit={event => { event.preventDefault(); update({ checkedUrl: state.url }); setMessage(''); }}><label className={styles.field}>원문 URL<input type="url" value={state.url} disabled={pending} onChange={event => update({ url: event.target.value, checkedUrl: null })} placeholder="https://…" /></label><button type="submit" disabled={pending}>등록된 출처 확인</button></form>
      {urlResult?.kind === 'known-source' && <div className={styles.urlResult}><p>이 출처로 정리된 자료가 있습니다. 웹에서 새로 수집한 결과는 아닙니다.</p><button type="button" onClick={() => openFlow(urlResult.version.flowId)}>{urlResult.version.title} 열기</button></div>}
      {urlResult?.kind === 'invalid' && <p className={styles.error} role="alert">공개 HTTP(S) 주소를 확인해 주세요. 로그인 정보·비밀 값·로컬 주소는 받을 수 없습니다.</p>}
      {showPastedInput && <div className={styles.paste}><p>{urlResult && urlResult.kind !== 'known-source' ? <>{urlResult.kind === 'unsupported' ? '이 주소에서 내용을 가져오는 기능은 지원하지 않습니다.' : 'URL을 사용하지 않고 원문을 직접 넣을 수 있습니다.'} 필요한 원문을 붙여넣고 직접 확인해 주세요.</> : state.url.trim() ? '입력한 원문은 유지됩니다. 현재 주소에서 가져온 내용은 아닙니다.' : '주소 없이도 입력한 원문을 계속 편집할 수 있습니다.'}</p><label className={styles.field}>문서 제목<input value={state.pastedTitle} disabled={pending} maxLength={240} onChange={event => update({ pastedTitle: event.target.value })} /></label><label className={styles.field}>확인할 원문<textarea rows={8} value={state.pastedText} disabled={pending} maxLength={30000} onChange={event => update({ pastedText: event.target.value })} /></label><button type="button" className={styles.primary} disabled={pending || !state.pastedText.trim()} onClick={prepareTransient}>{state.transient ? '원문으로 출력 초안 다시 만들기' : '저장 없이 출력할 내용 확인'}</button>{state.transient && <small>다시 만들면 아래 출력 초안의 편집·선택·확정을 대체합니다.</small>}<details><summary>개인 문서로도 보관하기 · 선택</summary><button type="button" disabled={pending || !state.pastedText.trim()} onClick={() => void run(() => onStartText(state.pastedText, state.pastedTitle.trim() || '붙여넣은 원문'), '원문을 문서로 열었습니다.')}>원문 확인 후 문서로 열기</button></details><p className={styles.muted}>자동 Flow 변환이나 출처 검증을 뜻하지 않습니다.</p></div>}
      {state.transient && <TransientOutputEditor draft={state.transient} stale={state.transientSource?.text !== state.pastedText || state.transientSource?.title !== state.pastedTitle || state.transientSource?.url !== state.url} onChange={draft => update({ transient: draft })} onDiscard={() => update({ transient: null, transientSource: null })} />}{status}
    </details>
    <p className={styles.resultCount} role="status">{visible.length}개 자료</p>
    <div className={styles.catalog}>{visible.map(row => {
      const current = data.public.versions.find(candidate => candidate.id === row.currentVersionId)!; const meta = programCatalogMetadata(current.id);
      return <article className={styles.card} key={row.id}><p className={styles.eyebrow}>{row.category}{current.source.kind === 'simulated-example' ? ' · 합성 예시' : ''}</p><h2><button id={`program-discovery-${row.id}`} type="button" onClick={() => openFlow(row.id)}>{current.title}</button></h2><p>{excerpt(current.summary)}</p><div className={styles.tags}>{row.situations.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div><footer><span>{current.items.length}개 항목 · 판본 {current.number}</span>{meta?.sourceNeedsReview && <span className={styles.review}>출처 재검토 필요</span>}</footer></article>;
    })}</div>
    {!visible.length && <div className={styles.empty}><h2>맞는 자료가 없습니다</h2><p>검색어나 분야·상황을 바꿔 보세요.</p><button type="button" onClick={() => update({ query: '', category: '', situation: '' })}>검색 조건 지우기</button></div>}
    <p className={styles.muted}>공개 목록은 이 기기의 로컬 PoC입니다. 기존에 저장한 Flow는 <button type="button" className={styles.linkButton} onClick={() => navigate({ view: 'legacy' })}>기존 내 Flow</button>에서 찾을 수 있습니다.</p>
  </section>;
}
