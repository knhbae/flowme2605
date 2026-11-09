'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { programId, type ProgramData } from '@/lib/flow/integrated-poc/contract';
import type { ProgramMutate, ProgramNavigate } from '@/lib/flow/integrated-poc/ui-contract';
import { classifyProgramUrl, makeProgramOutput, PROGRAM_ICS_ONCE, type ProgramOutput, type ProgramOutputFormat } from '@/lib/flow/integrated-poc/output';
import { programCatalogMetadata } from '@/lib/flow/integrated-poc/catalog';
import { isPublicCatalogFlowOnHold } from '@/lib/flow/public-source-review-policy';
import { PROGRAM_PUBLIC_RECURRENCE_WINDOW } from '@/lib/flow/integrated-poc/public-recurrence-contract';
import { PROGRAM_IMPORT_GENERIC_FAILURE, programFlowCardLines, programFlowCardThread, programImportCheckPasses, programImportFailure, programItemDateLabel, programLiveCopies, programLiveCopy, programShortDate,
  programSortFlowsByRecent, programSourceLine, programSummaryAnchor, programVersionScheduleShape, programVersionUsesAnchor } from '@/lib/flow/integrated-poc/program-discovery-display';
import { defaultProgramOutputRecurrenceWindow } from '@/lib/flow/integrated-poc/public-output-recurrence';
import { programPublicOutputBase, resolveProgramPublicOutputReturn } from '@/lib/flow/integrated-poc/public-output-return';
import type { ProgramDiscoveryDetailPresentation } from '@/lib/flow/integrated-poc/navigation';
import { readProgramDiscoveryPresentation, type ProgramDiscoveryNavigation, type ProgramDiscoveryPresentation, type ProgramNavigationCheckpoint } from '@/lib/flow/integrated-poc/navigation';
import { createTransientOutputDraft, previewTransientOutput, confirmTransientOutput, confirmedTransientOutput, type TransientOutputDraft, type TransientOutputRow } from '@/lib/flow/integrated-poc/transient-output';
import { ProgramShareLink } from './ProgramShareLink';
import { ProgramImportDocumentPicker } from './ProgramSpace';
import { programImportTargets } from '@/lib/flow/integrated-poc/program-import-links';
import { programImportAddsNothing, programImportFirstDate, programImportItemView, programImportRepeatChoice, programImportRepeatOf, programImportRepeatRule, programImportRepeats, programImportSentence } from '@/lib/flow/integrated-poc/public-repeat-import';
import { programRepeatFixed } from '@/lib/flow/integrated-poc/repeat-line';
import { programCalendarDate, programDateLabel } from '@/lib/flow/integrated-poc/date-label';
import { programImportPreview } from '@/lib/flow/integrated-poc/import-preview';
import { programCanonicalLink, programFlowsByLink, programLooksLikeLink } from '@/lib/flow/integrated-poc/link-lookup';
import { numberEul, numberIga } from '@/lib/flow/integrated-poc/number-particle';
import { programFlowProgress, programFlowProgressShort, programFlowProgressText } from '@/lib/flow/integrated-poc/flow-loop';
import { PROGRAM_OFFICIAL_LABEL, programFlowAttributionLabel } from '@/lib/flow/integrated-poc/alpha-official-actors';
import { useAlphaOfficialActors } from './AlphaOfficialActors';
import styles from './ProgramDiscovery.module.css';
import { ProgramIcon, programRepeatText } from './icons';
import { ProgramFlowThread } from './ProgramFlowThread';

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
  storageScope?: 'local' | 'account';
  selectedVersionId?: string; selectedItemId?: string; selectedOutputReturn?: string;
  /** FC2: the host imports, opens the copy document and reports the reason of a failure (D1). */
  onUseVersion: (versionId: string, selectedItemIds: string[], anchor: string | null, recurrenceStarts?: Record<string, string>, targetDocumentId?: string, repeat?: ProgramImportRepeatInput) => Promise<ProgramImportOutcome>;
  actorId?: string;
  pendingDocumentIds?: () => string[];
  onReturnToSpace?: () => void;
  copySourceReturn?: boolean;
  onStartText: (raw: string, title: string) => Promise<boolean>;
  onCreateFlow?: () => void;
  /** Flow pipeline S8, with no Flow made from a pasted link: keep it under today in my writing, or start a Flow from it. */
  onKeepLink?: (link: string) => Promise<boolean>;
  onCreateFromLink?: (link: string) => Promise<boolean>;
  /** Core3 P2: the Flow head's [이야기] (the host's sub-tabs are gone). */
  onOpenStories?: () => void;
  /** Core3 P2b: '기준일 바꾸기' beside 내 진행 opens my copy's settings (the existing 내 기준일 change with its preview). */
  onChangeCopyAnchor?: (copyId: string) => void;
  navigationState?: ProgramDiscoveryNavigationState;
  onNavigationStateChange?: (state: ProgramDiscoveryNavigationState) => void;
  onRegisterNavigation?: (navigation: ProgramDiscoveryNavigation | null) => void;
};
export type ProgramImportOutcome = { ok: true } | { ok: false; reason: string };
/** 공식 반복 Flow: the repeat lines' first dates and the months typed, as the sheet sends them. */
export type ProgramImportRepeatInput = { repeatStarts?: Record<string, string>; repeatMonths?: Record<string, number> };
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
  'invalid-version': '이 버전은 내보낼 수 없습니다. 원문과 항목을 다시 확인해 주세요.',
  'empty-source': '파일로 옮길 원문을 먼저 붙여넣어 주세요.', 'source-limit': '원문은 3만 자·1,200줄 안에서 나누어 넣어 주세요.',
  'invalid-source-url': '출처 주소에서 로그인 정보·비밀 값·로컬 주소를 제거해 주세요.',
  'confirmation-required': '수정한 결과를 확인한 뒤 출력 내용을 확정해 주세요.',
};
const errorText = (reason: string) => failureText[reason] ?? '내용이 달라졌습니다. 지금 버전과 고른 항목을 다시 확인해 주세요.';
/** Flow pipeline S1: the preview shows five days, then "날짜 n개 더". */
const PLACE_ROWS = 5;

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

export function ProgramDiscovery({ data, navigate, selectedFlowId, selectedVersionId, selectedItemId, selectedOutputReturn, today, onUseVersion, onStartText, onCreateFlow, onKeepLink, onCreateFromLink, onOpenStories, onChangeCopyAnchor, navigationState, onNavigationStateChange, onRegisterNavigation, storageScope = 'local', actorId = data.activeActorId, pendingDocumentIds = () => [], onReturnToSpace, copySourceReturn = false }: ProgramDiscoveryProps) {
  const officialActors = useAlphaOfficialActors();
  const [local, setLocal] = useState(createProgramDiscoveryNavigationState);
  const state = navigationState ?? local; const stateRef = useRef(state); stateRef.current = state;
  const [message, setMessage] = useState(''); const [failed, setFailed] = useState(false); const [pending, setPending] = useState(false);
  const pendingRef = useRef(false); const uid = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [importDestination, setImportDestination] = useState<'new' | 'existing'>('new');
  const [targetDocumentId, setTargetDocumentId] = useState<string>();
  const [pickingDocument, setPickingDocument] = useState(false);
  const [importFailure, setImportFailure] = useState<{ text: string; continueCopy: boolean } | null>(null);
  // Flow pipeline S1: '어디에' is one line until [바꾸기] (open from the start for '다른 문서에 넣기').
  const [whereOpen, setWhereOpen] = useState(false);
  const anchorPicker = useRef<HTMLInputElement>(null);
  // 공식 반복 Flow: what is typed in the sheet's repeat rows (first dates, months), per sheet opened.
  const [repeatTyped, setRepeatTyped] = useState<{ starts: Record<string, string>; months: Record<string, string> }>({ starts: {}, months: {} });
  // Per-version view toggles; they are presentation only and never stored.
  const [summaryOpen, setSummaryOpen] = useState<string | null>(null);
  const [choosingVersion, setChoosingVersion] = useState<string | null>(null);
  const [openItems, setOpenItems] = useState<string[]>([]);
  const taskList = useRef<HTMLOListElement>(null); const [clippedItems, setClippedItems] = useState<string[]>([]);
  // '더 보기' shows only when the two-line summary really cuts text at this width.
  const summaryRef = useRef<HTMLParagraphElement>(null); const [summaryClipped, setSummaryClipped] = useState(false);
  const [outputVersion, setOutputVersion] = useState<string | null>(null);
  // FC1: the search filters only after a Hangul composition ends (as the R8b document sheet does).
  const [queryDraft, setQueryDraft] = useState(state.query); const composing = useRef(false);
  useEffect(() => { if (!composing.current) setQueryDraft(state.query); }, [state.query]);
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
    setMessage(''); setFailed(false); setImportFailure(null);
    if (!selectedFlowId && sheet.current?.open) sheet.current.close();
    if (!selectedFlowId && stateRef.current.lastFlowId) {
      const focus = document.getElementById(`program-discovery-${stateRef.current.lastFlowId}`);
      focus?.focus({ preventScroll: true }); window.scrollTo({ top: stateRef.current.scrollTop });
    }
  }, [selectedFlowId]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (stateRef.current.transient) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, []);
  const flows = data.public.flows.filter(flow => !flow.archived && !isPublicCatalogFlowOnHold(flow.id));
  const flow = selectedFlowId ? data.public.flows.find(row => row.id === selectedFlowId) : undefined;
  // Returning to a saved copy is navigation, not another import. Read only the
  // current actor's live documents; missing/trashed sources are not substitutes.
  const privateSpace = data.spaces[actorId];
  const storedCopy = flow && privateSpace?.copies.find(copy => copy.flowId === flow.id);
  const existingCopy = flow && programLiveCopy(privateSpace, flow.id);
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
    // A link to one item opens its method and criteria, as the old <details> did.
    const key = `${version.id}:${selectedItemId}`;
    setOpenItems(prior => prior.includes(key) ? prior : [...prior, key]);
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(`program-public-item-${encodeURIComponent(version.id)}-${encodeURIComponent(selectedItemId)}`);
      if (target) { target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'center', behavior: 'instant' }); }
    });
    return () => cancelAnimationFrame(frame);
  }, [version?.id, selectedItemId, selectedOutputReturn, outputBase]);
  // A detail opened from the list starts at the top, focus on its title (the old intro step did the same);
  // the list's own scroll position stays in the navigation state for the way back.
  useEffect(() => {
    if (!selectedFlowId || selectedItemId || selectedOutputReturn) return;
    window.scrollTo({ top: 0 });
    if (storageScope === 'account') heading.current?.focus({ preventScroll: true });
  }, [storageScope, selectedFlowId, version?.id, selectedItemId, selectedOutputReturn]);
  useEffect(() => {
    const element = summaryRef.current;
    if (!element) { setSummaryClipped(false); return; }
    const measure = () => setSummaryClipped(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [version?.id, summaryOpen]);
  const sourceMeta = version ? programCatalogMetadata(version.id) : undefined;
  const detail: ProgramDiscoveryDetailPresentation | undefined = version ? (selectedOutputReturn !== editedReturn.current ? returnedDetail : null) ?? state.details[version.id] ?? { selectedItemIds: version.items.map(item => item.id), anchor: '', format: 'txt' } : undefined;
  const patchDetail = (patch: Partial<NonNullable<typeof detail>>) => {
    if (!version || !detail || flow?.archived) return;
    editedReturn.current = selectedOutputReturn;
    update({ details: { ...stateRef.current.details, [version.id]: { ...detail, ...patch } } }); setMessage(''); setFailed(false); setImportFailure(null);
  };
  // FC2: '할 일 고르기' shows check boxes; a partial selection (also a restored one) keeps them shown.
  const choosing = !!version && !!detail && (choosingVersion === version.id || detail.selectedItemIds.length !== version.items.length);
  // FC12 re-review: a 44px row cuts a long title or date; those rows get ▸, which shows them in full.
  useEffect(() => {
    const list = taskList.current;
    if (!list) { setClippedItems(prior => prior.length ? [] : prior); return; }
    const measure = () => {
      const ids = [...new Set([...list.querySelectorAll<HTMLElement>('[data-task-clip]')].filter(element => element.scrollWidth > element.clientWidth + 1).map(element => element.dataset.taskClip!))];
      setClippedItems(prior => prior.length === ids.length && prior.every((id, index) => id === ids[index]) ? prior : ids);
    };
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(list);
    return () => observer?.disconnect();
  }, [version?.id, detail?.anchor, choosing]);
  const useItemIds = version && detail ? version.items.filter(item => detail.selectedItemIds.includes(item.id)).map(item => item.id) : [];
  const selectedSeries = version?.items.filter(item => item.schedule.kind === 'recurring' && useItemIds.includes(item.id)) ?? [];
  const recurrenceWindow = detail?.recurrenceWindow ?? defaultProgramOutputRecurrenceWindow();
  const recurrenceStarts = Object.fromEntries(Object.entries(detail?.recurrenceStarts ?? {}).filter(([id]) => selectedSeries.some(item => item.id === id)));
  const outputOptions = detail ? { selectedItemIds: useItemIds, anchor: detail.anchor || null, format: detail.format,
    ...(selectedSeries.length ? { recurrenceWindow, recurrenceStarts } : {}) } : null;
  const output = version && outputOptions && !flow?.archived ? makeProgramOutput(version, { ...outputOptions, ...(outputBase ? {returnContext:{baseUrl:outputBase}} : {}) }, new Date()) : undefined;
  const sourceOnHold = !!flow && isPublicCatalogFlowOnHold(flow.id);
  const canUseVersion = version && outputOptions && !flow?.archived && !sourceOnHold && useItemIds.length > 0
    ? programImportCheckPasses(useItemIds, itemIds => makeProgramOutput(version, { ...outputOptions, selectedItemIds: itemIds, recurrenceWindow: undefined, format: 'txt' }, new Date())) : false;
  // 공식 반복 Flow: the selected repeat items go in as repeat lines of mine (an existing copy's later import has none:
  // it carries its copy items only). Nothing to put in when every selected item is one I already repeat.
  const sheetRepeats = version && !(importDestination === 'existing' && storedCopy) ? programImportRepeats(privateSpace, version, useItemIds) : [];
  const repeatChoice = programImportRepeatChoice(sheetRepeats, repeatTyped, today);
  const nothingToImport = sheetRepeats.length > 0 && sheetRepeats.length === useItemIds.length && sheetRepeats.every(repeat => repeat.existing);
  // P3 (11/6): what goes into the chosen document. An existing copy brings its own items only, so a Flow of repeat
  // items alone brings none there: the button stays off and one line says why.
  const storedVersion = storedCopy ? data.public.versions.find(row => row.id === storedCopy.baseVersionId) : undefined;
  const targetItems = !version ? [] : storedCopy ? storedVersion?.items.filter(row => storedCopy.includedItemIds.includes(row.id)) ?? []
    : version.items.filter(item => useItemIds.includes(item.id) && !sheetRepeats.some(repeat => repeat.itemId === item.id && repeat.existing));
  const nothingForTarget = importDestination === 'existing' && !!targetDocumentId && !targetItems.length;
  const nothingReason = `넣을 할 일이 없습니다.${(storedCopy ? storedVersion?.items ?? [] : version?.items.filter(item => useItemIds.includes(item.id)) ?? []).some(item => programImportRepeatOf(item))
    ? ' 반복 할 일은 처음 가져올 때 내 반복 줄로 들어가 있습니다.' : ''}`;
  // P3c (11/6): '새 문서' once I have the copy goes into that copy. With every item already there (a mixed Flow's
  // one-time items in the copy, its repeat items lines of mine) the button stays off and one line says why.
  const nothingForNew = importDestination === 'new' && !!version && !nothingToImport
    && programImportAddsNothing(privateSpace, version, useItemIds, detail?.anchor || null, recurrenceStarts);
  const copyTitle = storedCopy && [...privateSpace.text.documents, ...privateSpace.text.flows].find(doc => doc.id === storedCopy.documentId)?.title;
  const nothingNewReason = `넣을 할 일이 없습니다. 할 일은 이미 ‘${copyTitle || version?.title}’ 문서에 있${sheetRepeats.length ? '고, 반복 할 일은 내 반복 줄에 있' : ''}습니다.`;
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
    try { const accepted = await work(); setFailed(!accepted); setMessage(accepted ? success : PROGRAM_IMPORT_GENERIC_FAILURE); }
    catch { setFailed(true); setMessage(PROGRAM_IMPORT_GENERIC_FAILURE); }
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
  const openSheet = (existing = false) => { if (pendingRef.current) return; setRepeatTyped({ starts: {}, months: {} }); setImportDestination(existing ? 'existing' : 'new'); setWhereOpen(existing); setTargetDocumentId(undefined); setImportFailure(null); setSheetOpen(true); if (!sheet.current?.open) sheet.current?.showModal(); if (existing) setPickingDocument(true); };
  const closeSheet = () => { if (pendingRef.current) return; setSheetOpen(false); sheet.current?.close(); };
  // FC2: one import per press. The host saves, opens the copy document and says so there; a failure keeps the
  // sheet, the anchor and the selection, and names its reason (D1).
  const runImport = async () => {
    if (pendingRef.current || !version || !detail || !canUseVersion || !repeatChoice || nothingToImport || nothingForTarget) return;
    if (nothingForNew) return;
    pendingRef.current = true; setPending(true); setImportFailure(null);
    const target = importDestination === 'existing' ? targetDocumentId : undefined;
    const importingVersion = target && storedCopy ? storedCopy.baseVersionId : version.id;
    const anchor = target && storedCopy ? storedCopy.anchor : detail.anchor || null;
    const importingItems = target && storedCopy ? storedCopy.includedItemIds : useItemIds;
    try {
      if (importDestination === 'existing' && (!target || privateSpace?.documentTrash?.[storedCopy?.documentId ?? '']
        || !programImportTargets(data, actorId, storedCopy?.documentId, pendingDocumentIds()).some(doc => doc.id === target && !doc.reason))) {
        setImportFailure({ text: '고른 문서에 저장 안 한 입력이 있거나 지금 넣을 수 없습니다. 저장하거나 취소한 뒤 다시 골라 주세요.', continueCopy: false }); return;
      }
      const outcome = await onUseVersion(importingVersion, importingItems, anchor, target && storedCopy ? undefined : Object.keys(recurrenceStarts).length ? recurrenceStarts : undefined, target,
        Object.keys(repeatChoice).length ? repeatChoice : undefined);
      if (outcome.ok) { setSheetOpen(false); sheet.current?.close(); }
      else setImportFailure(programImportFailure(outcome.reason, { onHold: sourceOnHold,
        copyConflict: !!storedCopy && (storedCopy.baseVersionId !== importingVersion || storedCopy.anchor !== anchor) }));
    } catch { setImportFailure(programImportFailure('unavailable', { onHold: false, copyConflict: false })); }
    finally { pendingRef.current = false; setPending(false); }
  };

  if (selectedOutputReturn && (!outputBase || !returnedDetail)) return <section className={styles.page}><h1>출력한 공개 항목을 확인할 수 없습니다</h1><p>이 기기의 같은 주소와 저장된 버전에서만 열 수 있습니다. 다른 항목을 선택하거나 저장하지 않았습니다.</p><button onClick={() => navigate({view:'discover'})}>Flow 목록으로 돌아가기</button></section>;
  if (selectedFlowId && (!flow || !version || !detail)) return <section className={styles.page}><h1>이 Flow를 찾을 수 없습니다</h1><p>{flow?.archived && !selectedVersionId ? '보관된 Flow는 버전이 지정된 기존 링크에서 읽을 수 있습니다.' : '연결한 Flow 또는 버전이 없습니다. 다른 버전으로 바꾸지 않았습니다.'}</p>{existingCopy && <button type="button" className={styles.primary} disabled={pending} onClick={() => navigate({ view: 'space', id: existingCopy.documentId })}>내 문서에서 이어보기</button>}<button type="button" onClick={() => navigate({ view: 'discover' })}>Flow 목록으로 돌아가기</button></section>;
  if (flow && version && detail) {
    const related = data.public.posts.filter(post => !post.deleted && post.flowId === flow.id);
    const derived = flow.derivedFrom ? data.public.versions.find(row => row.id === flow.derivedFrom?.versionId) : undefined;
    const children = flows.filter(row => row.derivedFrom?.flowId === flow.id);
    const copyVersion = existingCopy ? data.public.versions.find(row => row.id === existingCopy.baseVersionId) : undefined;
    const current = data.public.versions.find(row => row.id === flow.currentVersionId);
    const anchorUsed = programVersionUsesAnchor(version);
    const anchorNeeded = programVersionUsesAnchor(version, useItemIds);
    const undatedStarts = selectedSeries.filter(item => item.schedule.kind === 'recurring' && item.schedule.start.kind === 'undated');
    const outputOpen = outputVersion === version.id || !!selectedOutputReturn;
    const kindLabel = programFlowAttributionLabel(flow, version, officialActors, data);
    const importLabel = choosing ? `할 일 ${useItemIds.length}개 가져오기` : '가져오기';
    // Flow pipeline S1: where the sheet's choices put each item, by the import's own date functions (nothing saved).
    // A copy taken again into another document carries its own dates; the sheet lists its items there instead.
    const preview = !(importDestination === 'existing' && storedCopy) ? programImportPreview(version, useItemIds, detail.anchor || null, sheetRepeats, today, { ...(repeatChoice ?? {}), recurrenceStarts }) : null;
    // Core3 P2b: the 기준일's own name (the catalog's, or the one stage 2 wrote as the summary's first line), as the card says.
    const anchorName = sourceMeta?.anchorLabel ?? programSummaryAnchor(version.summary) ?? '기준일';
    const anchorMissing = version.items.filter(item => useItemIds.includes(item.id) && (item.schedule.kind === 'relative' || item.schedule.kind === 'recurring' && item.schedule.start.kind === 'relative')).length;
    const openAnchorPicker = () => { const input = anchorPicker.current; if (!input || pendingRef.current) return; try { input.showPicker(); } catch { input.focus(); } };
    const whereShown = whereOpen || importDestination === 'existing';
    const canChoose = !flow.archived && !existingCopy && !storedCopy && version.items.length > 1 && importDestination === 'new';
    // Head re-review 2 P2: PC keeps its earlier '더 보기' rule (over 90 characters or a line break) and, without it,
    // the plain closing-line look; phones show it only when the two lines really cut text.
    const longSummary = version.summary.length > 90 || version.summary.includes('\n');
    const toggleSummary = () => setSummaryOpen(summaryOpen === version.id ? null : version.id);
    // FC head review P2: phones list these under the tasks (mockup ②); PC keeps its earlier places.
    const chooseButton = (place: string) => !flow.archived && !existingCopy && !storedCopy && version.items.length > 1 && <button type="button" className={`${styles.linkButton} ${place}`} disabled={pending} aria-pressed={choosing}
      onClick={() => { if (choosing) { setChoosingVersion(null); patchDetail({ selectedItemIds: version.items.map(item => item.id) }); } else setChoosingVersion(version.id); }}>{choosing ? '모두 가져오기' : '할 일 고르기'}</button>;
    const extras = <>{sourceMeta && <details><summary>저장소에 보관된 원문</summary><pre className={styles.raw}>{sourceMeta.originalRawText}</pre></details>}
      {derived && <button type="button" className={styles.linkButton} onClick={() => navigate({ view: 'flow', id: derived.flowId, versionId: derived.id })}>원본: {derived.title} · 버전 {derived.number}</button>}
      {children.length > 0 && <details><summary>이 Flow에서 파생된 자료 {children.length}개</summary>{children.map(child => <button type="button" className={styles.linkButton} key={child.id} onClick={() => navigate({ view: 'flow', id: child.id })}>{data.public.versions.find(row => row.id === child.currentVersionId)?.title ?? child.id}</button>)}</details>}</>;
    // UX 2절 큰 단추: one action per state. An archived or held Flow never starts a new copy.
    const action = existingCopy ? <button type="button" className={styles.primary} data-testid="program-existing-copy-return" disabled={pending} onClick={() => navigate({ view: 'space', id: existingCopy.documentId })}>내 문서 열기</button>
      : flow.archived ? null
        : storedCopy ? <button type="button" className={styles.primary} disabled={pending} onClick={() => navigate({ view: 'space' })}>내 공간에서 확인</button>
          : <button type="button" className={styles.primary} data-testid="program-import-open" disabled={pending || !canUseVersion} onClick={() => openSheet()}>{importLabel}</button>;
    // 실행 고리 1안: a copy I can open says how far I got, read from my own space (no request).
    const progress = existingCopy && !flow.archived && !privateSpace.archivedDocumentIds.includes(existingCopy.documentId) ? programFlowProgress(data, actorId, flow.id, today) : null;
    const progressText = progress && programFlowProgressText(progress);
    // Core3 P2b (FIG 11): a copy I took says "내 진행 2/6 · 기준일 바꾸기" in one line instead of the longer note.
    const progressShort = progress && programFlowProgressShort(progress);
    const stateNote = flow.archived ? '공개가 철회된 Flow입니다. 가져간 사본은 그대로입니다.'
      : existingCopy ? privateSpace.archivedDocumentIds.includes(existingCopy.documentId) ? '보관한 내 문서를 읽기 전용으로 엽니다.' : progressText || '이미 가져온 내 문서를 엽니다. 날짜·진행 기록은 그대로입니다.'
        : storedCopy ? '이 Flow의 개인 사본이 있지만 지금 바로 열 수 없습니다. 내 공간에서 휴지통과 보관 상태를 확인해 주세요. 새 사본은 만들지 않습니다.'
          : sourceOnHold ? '출처를 다시 확인하는 중이라 지금은 새로 가져올 수 없습니다.' : null;
    return <section className={`${styles.page} ${styles.flowDetail}`} data-testid="program-flow-detail" data-has-action={action ? 'true' : undefined}>
      {selectedOutputReturn && returnedDetail && <p role="status">내보낸 버전의 같은 항목으로 돌아왔습니다. 출력 선택·기준일·반복 범위를 복원했으며 원래 일정과 개인 기록은 변경하지 않았습니다.</p>}
      <div className={styles.detailBar}><button className={styles.back} type="button" disabled={pending} onClick={() => copySourceReturn && onReturnToSpace ? onReturnToSpace() : navigate({ view: 'discover' })}>{copySourceReturn && onReturnToSpace ? '← 내 문서' : '← Flow 찾기'}</button>
        <details className={styles.moreMenu}><summary aria-label="Flow 더보기 메뉴"><ProgramIcon name="more" size={20} /></summary><div>
          {versions.length > 1 && <label className={styles.field}>이전 버전 보기<select value={version.id} disabled={pending} onChange={event => { update({ versionByFlow: { ...state.versionByFlow, [flow.id]: event.target.value } }); navigate({ view: 'flow', id: flow.id, versionId: event.target.value }); }}>{versions.map(row => <option key={row.id} value={row.id}>버전 {row.number}{row.id === flow.currentVersionId ? ' · 최신' : ''}</option>)}</select></label>}
          {!flow.archived && <button type="button" disabled={pending} onClick={() => setOutputVersion(outputOpen ? null : version.id)}>{outputOpen ? '내 도구로 받기 닫기' : '내 도구로 받기'}</button>}
          {/* FC5: a link to this version; an archived Flow's link stays closed (UX 13, C9). */}
          {!flow.archived && <ProgramShareLink flowId={flow.id} versionId={version.id} unverified={flow.id.startsWith('catalog-')} />}
        </div></details></div>
      {flow.archived && <p className={styles.notice} role="status">공개 목록에서 내려 보관된 Flow입니다. 연결된 버전은 읽을 수 있지만 새로 가져오거나 출력할 수 없습니다. 기존 개인 사본과 기록은 그대로 남아 있습니다.</p>}
      {version.id !== flow.currentVersionId && current && !flow.archived && <p className={styles.versionLine}>버전 {version.number}{numberEul(version.number)} 보고 있습니다 · <button type="button" className={styles.linkButton} disabled={pending} onClick={() => { update({ versionByFlow: { ...state.versionByFlow, [flow.id]: current.id } }); navigate({ view: 'flow', id: flow.id, versionId: current.id }); }}>최신 버전으로</button></p>}
      <div className={styles.detailLayout}><div className={styles.detailMain}>
        <header className={styles.detailHeader}><p className={styles.eyebrow}>{[flow.category, ...flow.situations].join(' · ')}</p>
          <h1 ref={heading} tabIndex={-1}>{version.title}</h1>
          <div className={styles.summaryBox}><p ref={summaryRef} id={`${uid}-summary`} className={`${styles.pre} ${styles.summaryText} ${summaryOpen === version.id ? '' : styles.summaryClamp}${longSummary ? '' : ` ${styles.summaryPlain}`}`}>{version.summary}</p>
            {(summaryClipped || summaryOpen === version.id) && <button type="button" className={`${styles.linkButton} ${styles.pcOnly}`} aria-expanded={summaryOpen === version.id} aria-controls={`${uid}-summary`} onClick={toggleSummary}>{summaryOpen === version.id ? '접기' : '더 보기'}</button>}
            {(summaryClipped || summaryOpen === version.id) && <button type="button" className={`${styles.linkButton} ${styles.summaryMore} ${styles.phoneOnly}`} data-open={summaryOpen === version.id ? 'true' : undefined} aria-expanded={summaryOpen === version.id} aria-controls={`${uid}-summary`} onClick={toggleSummary}>{summaryOpen === version.id ? '접기' : '더 보기'}</button>}</div>
        </header>
        <section className={styles.sourceBlock} aria-label="출처와 버전">
          <p className={styles.sourceLine}>{kindLabel === PROGRAM_OFFICIAL_LABEL && <span className={styles.cardBadge} data-badge="공식">공식</span>}{kindLabel && <>{kindLabel} · </>}{programSourceLine(version.source)}{version.source.url && <> · <a href={version.source.url} target="_blank" rel="noreferrer noopener">원문 열기 ↗</a></>}</p>
          {sourceMeta?.sourceNeedsReview && <p className={styles.notice}>이 자료는 출처 재검토가 필요합니다. 현재 조건을 원문에서 확인해 주세요.</p>}
          <div className={styles.pcOnly}>{extras}</div>
          {existingCopy && copyVersion && existingCopy.baseVersionId !== version.id && <p className={styles.versionLine}>내 사본은 버전 {copyVersion.number}입니다. 원본에 버전 {version.number}{numberIga(version.number)} 있습니다. <button type="button" className={styles.linkButton} disabled={pending} onClick={() => navigate({ view: 'space', id: existingCopy.documentId })}>변경 확인</button></p>}
        </section>
        {existingCopy && progressShort ? <p className={styles.copyLine} data-flow-progress data-copy-line><span>{progressShort}</span>
          {anchorUsed && onChangeCopyAnchor && <> · <button type="button" className={styles.linkButton} disabled={pending} onClick={() => onChangeCopyAnchor(existingCopy.id)}>기준일 바꾸기</button></>}</p>
          : stateNote && <p className={flow.archived || existingCopy ? styles.muted : styles.notice} data-flow-progress={progressText ? '' : undefined}>{stateNote}</p>}
        {/* Core3 P2b (FIG 11): no 기준일 field above the list; the list's head says the dates come with it, and the
            sheet's 언제 sets it (내 도구로 받기 keeps its own field below). */}
        <section aria-labelledby={`${uid}-items`}><div className={`${styles.row} ${styles.itemsHead}`}><h2 id={`${uid}-items`} className={styles.itemsLabel}>할 일 <span>{choosing ? `${useItemIds.length}/${version.items.length}` : version.items.length}</span><span className={styles.phoneOnly}>개</span>
          {anchorUsed && !flow.archived && !existingCopy && !detail.anchor && <span className={styles.itemsHint} data-anchor-hint> · {anchorName} 정하면 날짜가 나옵니다</span>}</h2>
          {chooseButton(styles.pcOnly)}</div>
          {selectedItemId && !version.items.some(item => item.id === selectedItemId) && <p className={styles.notice} role="status">이 버전에는 연결된 항목이 없습니다. 다른 항목으로 바꾸지 않고 지정된 버전을 표시합니다.</p>}
          <ol ref={taskList} className={styles.taskRows}>{version.items.map((item, index) => {
            const classifiedSource = item.sourceUrl ? classifyProgramUrl(item.sourceUrl, []) : null;
            const sourceUrl = classifiedSource && classifiedSource.kind !== 'invalid' ? item.sourceUrl!.trim() : null;
            const repeatView = programImportItemView(item), title = repeatView?.title ?? item.title;
            const dateLabel = repeatView?.label ?? programItemDateLabel(item, detail.anchor || null);
            const row = <><span className={styles.taskNumber}>{index + 1}</span><span className={styles.taskTitle} data-task-clip={item.id}>{title}</span><span className={styles.taskDate} data-task-clip={item.id}>{dateLabel}</span></>;
            // UX 2절 8: ▸ on the row opens the method, criteria and item source; the row itself stays one 44px line,
            // so a long title or date is cut there and read in full under ▸.
            const detailsKey = `${version.id}:${item.id}`, detailsId = `${uid}-item-${index}`, open = openItems.includes(detailsKey);
            const cut = clippedItems.includes(item.id);
            const hasMethod = !!(item.description || item.completionCriteria || item.subchecks.length > 0 || sourceUrl), hasDetails = cut || hasMethod;
            return <li key={item.id} id={`program-public-item-${encodeURIComponent(version.id)}-${encodeURIComponent(item.id)}`} tabIndex={-1} aria-current={selectedItemId === item.id ? 'location' : undefined}>
              <div className={styles.taskLine}>{choosing ? <label className={styles.taskRow}><input type="checkbox" disabled={pending} checked={detail.selectedItemIds.includes(item.id)} onChange={event => patchDetail({ selectedItemIds: event.target.checked ? [...detail.selectedItemIds, item.id] : detail.selectedItemIds.filter(id => id !== item.id) })} />{row}</label> : <div className={styles.taskRow}>{row}</div>}
                {hasDetails && <button type="button" className={styles.taskToggle} aria-expanded={open} aria-controls={detailsId} aria-label={`${title} ${hasMethod ? '방법과 완료 기준' : '전체 제목과 날짜'} ${open ? '접기' : '펼치기'}`}
                  onClick={() => setOpenItems(prior => open ? prior.filter(key => key !== detailsKey) : [...prior, detailsKey])}>{open ? '▾' : '▸'}</button>}</div>
              {hasDetails && open && <div id={detailsId} className={styles.itemDetails}>{cut && <p className={styles.taskFull}><strong>{title}</strong><br />{dateLabel}</p>}{item.description &&<p className={styles.pre}>{item.description}</p>}{sourceUrl && <p><a href={sourceUrl} target="_blank" rel="noreferrer noopener" aria-label={`${item.title} 원문 열기`}>항목 원문 열기 ↗</a></p>}{item.completionCriteria && <p><strong>완료 기준</strong><br />{item.completionCriteria}</p>}{item.subchecks.length > 0 && <ul>{item.subchecks.map(check => <li key={check.id}>{check.title}</li>)}</ul>}</div>}</li>;
          })}</ol>
          {chooseButton(`${styles.chooseButton} ${styles.phoneOnly}`)}
          <div className={styles.phoneOnly}>{extras}</div>
        </section>
        {outputOpen && !flow.archived && <section className={styles.outputSection} aria-labelledby={`${uid}-output`}><h2 id={`${uid}-output`}>내 도구로 받기</h2>
          <p className={styles.muted}>개인 사본을 만들지 않고 받을 수 있습니다.{choosing ? ' 고른 할 일만 받습니다.' : ''}</p>
          {anchorUsed && <><label className={`${styles.field} ${styles.anchorRow}`}><span>{anchorName}</span><input type="date" value={detail.anchor} disabled={pending} aria-describedby={`${uid}-anchor-hint`} onChange={event => patchDetail({ anchor: event.target.value })} /></label>
            {/* Phones: the rows already read "기준일 30일 전" and change at once, so only a version's own hint is shown. */}
            <p id={`${uid}-anchor-hint`} className={sourceMeta?.anchorHint ? styles.anchorHint : `${styles.anchorHint} ${styles.anchorGeneralHint}`}>{sourceMeta?.anchorHint || '넣으면 할 일 날짜가 바로 바뀝니다. 고정 날짜는 그대로입니다.'}</p></>}
          {undatedStarts.map(item => <label key={item.id} className={styles.field}>시작일 · {item.title}<input type="date" disabled={pending} value={detail.recurrenceStarts?.[item.id] ?? ''} onChange={event => { const starts = { ...detail.recurrenceStarts }; if (event.target.value) starts[item.id] = event.target.value; else delete starts[item.id]; patchDetail({ recurrenceStarts: starts }); }} /><small>출력과 새 개인 사본에 사용할 날짜입니다. 공개 원본은 바뀌지 않습니다.</small></label>)}
          {selectedSeries.length > 0 && <details className={styles.recurrenceOptions}><summary>반복 출력 범위</summary><fieldset disabled={pending} className={styles.transientFields}>
            {selectedSeries.some(item => item.schedule.kind === 'recurring' && item.schedule.rule.end) && <><label className={styles.field}>첫 회차<input type="number" min={1} max={PROGRAM_PUBLIC_RECURRENCE_WINDOW.maxOffset + 1} value={recurrenceWindow.offset + 1} onChange={event => patchDetail({ recurrenceWindow: { ...recurrenceWindow, offset: event.currentTarget.value === '' ? -1 : Number(event.currentTarget.value) - 1 } })} /></label><label className={styles.field}>회차 수<input type="number" min={1} max={PROGRAM_PUBLIC_RECURRENCE_WINDOW.maxLimit} value={recurrenceWindow.limit} onChange={event => patchDetail({ recurrenceWindow: { ...recurrenceWindow, limit: Number(event.currentTarget.value) } })} /></label></>}
            {selectedSeries.some(item => item.schedule.kind === 'recurring' && !item.schedule.rule.end) && <><label className={styles.field}>시작 후 건너뛸 주<input type="number" min={0} max={PROGRAM_PUBLIC_RECURRENCE_WINDOW.maxWeekOffset} value={recurrenceWindow.openEndedOffsetWeeks} onChange={event => patchDetail({ recurrenceWindow: { ...recurrenceWindow, openEndedOffsetWeeks: Number(event.currentTarget.value) } })} /></label><label className={styles.field}>받을 기간 · 주<input type="number" min={1} max={PROGRAM_PUBLIC_RECURRENCE_WINDOW.maxWeeks} value={recurrenceWindow.openEndedWeeks} onChange={event => patchDetail({ recurrenceWindow: { ...recurrenceWindow, openEndedWeeks: Number(event.currentTarget.value) } })} /></label></>}
          </fieldset></details>}
          <label className={styles.field}>파일 형식<select value={detail.format} disabled={pending} onChange={event => patchDetail({ format: event.target.value as ProgramOutputFormat })}><option value="txt">텍스트 · 메모</option><option value="csv">CSV · 스프레드시트</option><option value="ics">ICS · 캘린더</option></select></label>
          {detail.format === 'ics' && <p className={styles.muted} data-ics-once><strong>{PROGRAM_ICS_ONCE.head}</strong> {PROGRAM_ICS_ONCE.body}</p>}
          {output?.ok && output.series?.map(series => <p key={series.itemId} className={styles.muted}>{version.items.find(item => item.id === series.itemId)?.title}: {series.scope ?? '시작일 미정 · 반복 규칙은 텍스트·CSV에 보존'}{series.time ? ` · ${series.time} ${series.timeZone ?? '(시간대 미정)'}` : ' · 종일'}</p>)}
          {detail.format === 'ics' && selectedSeries.length > 0 && <p className={styles.muted}>선택한 범위만 반복 묶음으로 받습니다. 범위가 겹치는 파일을 모두 가져오면 캘린더에 회차가 중복될 수 있습니다.</p>}
          {output?.ok ? <><p className={styles.outputSize}>{output.itemIds.length}개 항목 · {new TextEncoder().encode(output.payload).byteLength.toLocaleString('ko-KR')}바이트</p>{detail.format === 'ics' && output.undatedItemIds.length > 0 && <p className={styles.notice}>날짜 없는 {output.undatedItemIds.length}개는 캘린더 파일에 들어가지 않습니다. 텍스트·CSV에는 포함됩니다.</p>}<div className={styles.actions}><button type="button" className={styles.primary} disabled={pending} onClick={() => void transfer('download')}>{detail.format.toUpperCase()} 파일 받기</button><button type="button" disabled={pending} onClick={() => void transfer('copy')}>내용 복사</button></div><details><summary>실제 출력 내용</summary><textarea className={styles.preview} aria-label="실제 출력 내용" value={output.payload} readOnly rows={10} /></details></> : <p className={styles.notice}>{errorText(output && !output.ok ? output.reason : 'invalid-version')}</p>}
          {detail.format === 'csv' && <p className={styles.muted}>수식으로 오인될 수 있는 값 앞에는 탭을 붙입니다.</p>}
          {status}
        </section>}
        <details className={styles.related}><summary>관련 이야기 · {related.length}개</summary><div className={styles.row}><h2>관련 경험과 질문</h2><button type="button" disabled={pending} onClick={() => navigate({ view: 'community' })}>이야기 보기</button></div>{related.length ? related.map(post => <button className={styles.relatedPost} type="button" key={post.id} disabled={pending} onClick={() => navigate({ view: 'community', id: post.id })}>{post.title}<small>{storageScope === 'account' ? '공개 글' : '로컬 PoC 글'} · {data.actors.find(actor => actor.id === post.authorId)?.name ?? (storageScope === 'account' ? '작성자' : '예시 참여자')}</small></button>) : <p className={styles.muted}>아직 연결된 글이 없습니다. 경험을 쓰지 않아도 이 Flow를 사용할 수 있습니다.</p>}</details>
      </div>
      {action && <aside className={styles.actionBox} aria-label="이 Flow 사용">
        <p className={styles.actionMeta}>할 일 {version.items.length}개 · {programVersionScheduleShape(version)}</p>
        {action}
        {existingCopy && !flow.archived && <button type="button" className={styles.linkButton} disabled={pending} onClick={() => openSheet(true)}>다른 문서에 넣기</button>}
      </aside>}</div>
      <dialog ref={sheet} className={styles.importSheet} aria-labelledby={`${uid}-sheet`} onCancel={event => { if (pendingRef.current) event.preventDefault(); else setSheetOpen(false); }} onClose={() => setSheetOpen(false)}>
        {sheetOpen && <div className={styles.sheetBody}>
          <div className={styles.row}><h2 id={`${uid}-sheet`} className={styles.sheetTitle}>가져오기</h2><button type="button" disabled={pending} onClick={closeSheet}>닫기</button></div>
          <p className={styles.sheetSummary}>{version.title} · 할 일 {useItemIds.length}개{canChoose && <button type="button" className={`${styles.linkButton} ${styles.sheetChoose}`} disabled={pending} onClick={() => { closeSheet(); setChoosingVersion(version.id); }}>고르기</button>}</p>
          {/* Flow pipeline S1 '언제': the 기준일 as one chip line that opens the phone's date picker (the input stays, unseen). */}
          {anchorNeeded && <section className={styles.sheetPart} aria-labelledby={`${uid}-when`} data-import-when><h3 id={`${uid}-when`} className={styles.sheetLabel}>언제</h3>
            <button type="button" className={styles.whenChip} disabled={pending} onClick={openAnchorPicker}
              aria-label={`${anchorName} ${detail.anchor ? `${programCalendarDate(detail.anchor, today)} · 바꾸기` : '정하기'}`}>
              <span>{anchorName}</span>{detail.anchor && <span className={styles.whenValue}>{programCalendarDate(detail.anchor, today)}</span>}<span className={styles.whenChange}>{detail.anchor ? '바꾸기' : '정하기'}</span></button>
            <label className={styles.visuallyHidden}>{anchorName}<input ref={anchorPicker} type="date" tabIndex={-1} value={detail.anchor} disabled={pending} onChange={event => patchDetail({ anchor: event.target.value })} /></label>
            {!detail.anchor && <p className={styles.sheetHint}>정하면 날짜가 나옵니다. 비워 두면 {anchorMissing}개는 ‘날짜 미정’으로 들어가고, 가져온 뒤 정할 수 있습니다.</p>}
          </section>}
          {/* S1 '이렇게 놓입니다': the dates the import writes (the same functions), today in blue, repeats and 미정 below. */}
          {preview && (preview.dated.length > 0 || preview.repeats.length > 0 || preview.undated.count > 0) && <section className={styles.sheetPart} aria-labelledby={`${uid}-place`}>
            <h3 id={`${uid}-place`} className={styles.sheetLabel}>이렇게 놓입니다</h3>
            <ul className={styles.placeList} data-import-preview>
              {preview.dated.slice(0, PLACE_ROWS).map(day => <li key={day.date} data-place-date={day.date} data-today={day.date === today || undefined}><b>{day.date === today ? `오늘 ${programCalendarDate(day.date, today, false)}` : programCalendarDate(day.date, today)}</b><span>{day.titles.join(' · ')}</span><em>{day.count}개</em></li>)}
              {preview.dated.length > PLACE_ROWS && <li className={styles.placeMore} data-place-more>날짜 {preview.dated.length - PLACE_ROWS}개 더</li>}
              {preview.repeats.map(row => <li key={row.itemId} data-place-repeat={row.first ?? ''}><b>{row.label}</b><span>↻ {row.title} · {row.first ? `${programDateLabel(row.first, today, false)}부터` : '시작일 미정'}</span><em>반복</em></li>)}
              {preview.undated.count > 0 && <li data-place-undated><b>날짜 미정</b><span>{preview.undated.titles.join(' · ')}</span><em>{preview.undated.count}개</em></li>}
            </ul>
            {!preview.dated.length && !preview.repeats.length && !anchorNeeded && <p className={styles.sheetHint}>달력에는 놓이지 않습니다. 오늘 › 날짜 미정에서 보입니다.</p>}
          </section>}
          {undatedStarts.map(item => <label key={item.id} className={styles.field}>반복 시작일(선택) · {item.title}<input type="date" disabled={pending} value={detail.recurrenceStarts?.[item.id] ?? ''} onChange={event => { const starts = { ...detail.recurrenceStarts }; if (event.target.value) starts[item.id] = event.target.value; else delete starts[item.id]; patchDetail({ recurrenceStarts: starts }); }} /><small>비우면 가져온 뒤 정할 수 있습니다.</small></label>)}
          {sheetRepeats.length > 0 && <section className={styles.repeatChoices} aria-labelledby={`${uid}-repeats`}><h3 id={`${uid}-repeats`}>반복 할 일 · 내 반복 줄로 들어갑니다</h3>
            {sheetRepeats.every(repeat => repeat.existing) && <p className={styles.repeatNone}>넣을 반복 할 일이 없습니다</p>}
            <ul>{sheetRepeats.map(repeat => {
              const typed = repeat.pick ? (repeatTyped.months[repeat.itemId] ?? '').trim() : '', months = /^\d{1,2}$/.test(typed) ? Number(typed) : null;
              const rule = programImportRepeatRule(repeat, months), first = rule ? programImportFirstDate(rule, today) : null, item = version.items.find(row => row.id === repeat.itemId);
              const setTyped = (key: 'starts' | 'months', value: string) => { setRepeatTyped(prior => ({ ...prior, [key]: { ...prior[key], [repeat.itemId]: value } })); setImportFailure(null); };
              return <li key={repeat.itemId} data-existing={repeat.existing ? 'true' : undefined}>
                <p className={styles.repeatTitle}>↻ {repeat.title}{repeat.marker && !repeat.existing ? ` ${repeat.marker}` : ''}</p>
                {repeat.existing ? <small>{repeat.existing.same ? `이미 있음 (‘${repeat.existing.documentTitle}’ 문서) · 넣지 않음` : `이미 있음 · 내 줄은 ${repeat.existing.marker} · 넣지 않음`}</small> : <>
                  {repeat.pick && <><label className={styles.repeatMonths}><input inputMode="numeric" pattern="[0-9]*" maxLength={2} autoComplete="off" value={repeatTyped.months[repeat.itemId] ?? ''} disabled={pending} aria-label={`${repeat.title} 반복 개월 수`} aria-invalid={!!typed && !rule} onChange={event => setTyped('months', event.target.value)} /><span>개월마다</span></label>
                    <small>{[item ? programImportSentence(item.description) : '', '비우면 반복 없이 할 일로 들어갑니다.'].filter(Boolean).join(' ')}</small>
                    {typed && !rule && <small className={styles.repeatProblem} role="alert">1~24 사이 숫자를 넣어 주세요.</small>}</>}
                  {rule && first && (programRepeatFixed(rule) ? <small>{programDateLabel(first, today)}부터</small>
                    : <label className={styles.repeatStart}><span>첫 날짜</span><input type="date" disabled={pending} value={repeatTyped.starts[repeat.itemId] ?? ''} onChange={event => setTyped('starts', event.target.value)} /><small>비우면 {programCalendarDate(first, today, false)}</small></label>)}</>}
              </li>;
            })}</ul></section>}
          {/* S1 '어디에': one line (new document, as before) until [바꾸기] shows the choice as it was. */}
          <section className={styles.sheetPart} aria-labelledby={`${uid}-where`} data-import-where={whereShown ? 'open' : 'line'}><h3 id={`${uid}-where`} className={styles.sheetLabel}>어디에</h3>
            {!whereShown ? <div className={styles.whereRow}><span>{storedCopy ? `‘${copyTitle || version.title}’ 문서` : `새 문서 ‘${version.title}’`}<small>오늘·달력·쓰기 위 띠에 보입니다</small></span>
              <button type="button" disabled={pending} onClick={() => setWhereOpen(true)}>바꾸기</button></div> : <>
            <fieldset className={styles.destinationChoices} disabled={pending}><legend className={styles.visuallyHidden}>넣을 곳</legend>
              <label className={styles.destinationChoice}><input type="radio" name={`${uid}-destination`} checked={importDestination === 'new'} onChange={() => setImportDestination('new')} /><span><strong>새 문서</strong><small>‘{version.title}’ 문서를 미분류에 만듭니다.</small></span></label>
              <label className={styles.destinationChoice}><input type="radio" name={`${uid}-destination`} checked={importDestination === 'existing'} disabled={!!privateSpace?.documentTrash?.[storedCopy?.documentId ?? '']} onChange={() => { setImportDestination('existing'); setPickingDocument(true); }} /><span><strong>기존 문서 끝에 넣기</strong><small>고른 문서 끝에 할 일을 연결합니다.</small></span></label></fieldset>
            {importDestination === 'existing' && <div className={styles.targetPreview}>
              <button type="button" disabled={pending} onClick={() => setPickingDocument(true)}>{targetDocumentId ? (programImportTargets(data, actorId, storedCopy?.documentId, []).find(doc => doc.id === targetDocumentId)?.title ?? '문서') + ' · 바꾸기' : '넣을 문서 고르기'}</button>
              <p>{storedCopy ? '이미 가져온 사본의 할 일을 연결합니다. 새 사본은 만들지 않습니다.' : '넣은 할 일은 미분류의 사본 문서와 연결됩니다. 어느 쪽에서 체크해도 같이 바뀝니다.'}{sheetRepeats.some(repeat => !repeat.existing) ? ' 반복 할 일은 연결 없이 내 줄로 들어갑니다.' : ''}</p>
              {storedCopy && privateSpace.archivedDocumentIds.includes(storedCopy.documentId) && <p>보관한 사본 문서는 다시 꺼내집니다.</p>}
              {targetDocumentId && (targetItems.length ? <><p>고른 문서 끝에 할 일 {targetItems.length}개가 들어갑니다.</p><ul>{targetItems.slice(0, 3).map(item => <li key={item.id}>{item.schedule.kind === 'recurring' ? '반복 참조: ' : programImportItemView(item) ? <ProgramIcon name="repeat" size={16} className="flowme-repeat-icon" /> : ''}{programImportItemView(item)?.title ?? item.title}</li>)}</ul>{targetItems.length > 3 && <p>… {targetItems.length - 3}개 더</p>}</>
                : <p className={styles.repeatNone} data-import-nothing>{nothingReason}</p>)}
            </div>}</>}
          </section>
          {privateSpace?.documentTrash?.[storedCopy?.documentId ?? ''] && <p>사본 문서가 휴지통에 있습니다. 복원한 뒤 넣을 수 있습니다.</p>}
          {nothingForNew && <p className={styles.repeatNone} data-import-nothing>{nothingNewReason}</p>}
          <button type="button" className={styles.primary} data-testid="program-import-run" disabled={pending || !canUseVersion || !repeatChoice || nothingToImport || nothingForTarget || nothingForNew || importDestination === 'existing' && !targetDocumentId} onClick={() => void runImport()}>{pending ? '가져오는 중…' : importDestination === 'existing' ? '고른 문서에 넣기' : '가져오기'}</button>
          {importFailure && <div className={styles.error} role="alert"><p>{importFailure.text}</p>{importFailure.continueCopy && (existingCopy ?? storedCopy) && <button type="button" onClick={() => { closeSheet(); navigate({ view: 'space', id: (existingCopy ?? storedCopy)!.documentId }); }}>내 문서에서 이어보기</button>}</div>}
        </div>}
      </dialog>
      {pickingDocument && <ProgramImportDocumentPicker data={data} actorId={actorId} copyDocumentId={storedCopy?.documentId} pendingDocumentIds={pendingDocumentIds} onChoose={id => { setTargetDocumentId(id); setPickingDocument(false); }} onClose={() => setPickingDocument(false)} />}
    </section>;
  }

  const copies = programLiveCopies(privateSpace);
  const categories = [...new Set(flows.map(row => row.category))];
  const situations = [...new Set(flows.filter(row => !state.category || row.category === state.category).flatMap(row => row.situations))];
  const needle = state.query.trim().toLocaleLowerCase('ko');
  // Flow pipeline S8: a link in the search box finds the Flows made from it (the same source link, on the Flow or an
  // item), from the public list already here; nothing is fetched. No match: keep the link in my writing, or start a Flow.
  const linkQuery = programLooksLikeLink(state.query) ? state.query.trim() : null;
  const linkCanonical = linkQuery ? programCanonicalLink(linkQuery) : null;
  const linkMatches = linkQuery ? programFlowsByLink(data, linkQuery) : [];
  const visible = linkQuery ? linkMatches.map(match => ({ flow: match.flow, version: match.version })) : programSortFlowsByRecent(flows.flatMap(row => {
    const current = data.public.versions.find(candidate => candidate.id === row.currentVersionId);
    return current && (!state.category || row.category === state.category) && (!state.situation || row.situations.includes(state.situation))
      && (!needle || [current.title, current.summary, row.category, ...row.situations, ...current.items.map(item => item.title)].join('\n').toLocaleLowerCase('ko').includes(needle))
      ? [{ flow: row, version: current }] : [];
  }));
  const urlShown = state.urlOpen || showPastedInput;
  return <section className={styles.page} data-testid="program-discovery">
    {onReturnToSpace && <button type="button" className={styles.back} onClick={onReturnToSpace}>← 내 문서</button>}
    {/* Core3 P2 (X7): one head line — "Flow", the [이야기] text button, ⋯ — instead of the 이야기 | Flow 찾기 sub-tabs. */}
    <header className={styles.listHeader} data-list-head={onOpenStories ? 'flow' : undefined}><h1>{onOpenStories ? 'Flow' : 'Flow 찾기'}</h1>
      {onOpenStories && <button type="button" className={styles.storiesLink} data-open-stories disabled={pending} onClick={onOpenStories}>이야기</button>}
      <details className={styles.moreMenu}><summary aria-label="Flow 찾기 더보기 메뉴"><ProgramIcon name="more" size={20} /></summary><div>
        <button type="button" disabled={pending} onClick={event => { (event.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open'); update({ urlOpen: true }); requestAnimationFrame(() => document.getElementById(`${uid}-url`)?.focus()); }}>주소로 찾기</button>
        {onCreateFlow && <button type="button" disabled={pending} onClick={onCreateFlow}>Flow 만들기</button>}
      </div></details></header>
    {urlShown && <section className={styles.urlEntry} aria-label="주소로 찾기"><div className={styles.row}><h2>주소로 찾기</h2><button type="button" disabled={pending} onClick={() => update({ urlOpen: false })}>닫기</button></div>
      <form noValidate onSubmit={event => { event.preventDefault(); update({ checkedUrl: state.url }); setMessage(''); }}><label className={styles.field}>원문 URL<input id={`${uid}-url`} type="url" value={state.url} disabled={pending} onChange={event => update({ url: event.target.value, checkedUrl: null })} placeholder="https://…" /></label><button type="submit" disabled={pending}>등록된 출처 확인</button></form>
      {urlResult?.kind === 'known-source' && <div className={styles.urlResult}><p>이 출처로 정리된 자료가 있습니다. 웹에서 새로 수집한 결과는 아닙니다.</p><button type="button" onClick={() => openFlow(urlResult.version.flowId)}>{urlResult.version.title} 열기</button></div>}
      {urlResult?.kind === 'invalid' && <p className={styles.error} role="alert">공개 HTTP(S) 주소를 확인해 주세요. 로그인 정보·비밀 값·로컬 주소는 받을 수 없습니다.</p>}
      {showPastedInput && <div className={styles.paste}><p>{urlResult && urlResult.kind !== 'known-source' ? <>{urlResult.kind === 'unsupported' ? '이 주소에서 내용을 가져오는 기능은 지원하지 않습니다.' : 'URL을 사용하지 않고 원문을 직접 넣을 수 있습니다.'} 필요한 원문을 붙여넣고 직접 확인해 주세요.</> : state.url.trim() ? '입력한 원문은 유지됩니다. 현재 주소에서 가져온 내용은 아닙니다.' : '주소 없이도 입력한 원문을 계속 편집할 수 있습니다.'}</p><label className={styles.field}>문서 제목<input value={state.pastedTitle} disabled={pending} maxLength={240} onChange={event => update({ pastedTitle: event.target.value })} /></label><label className={styles.field}>확인할 원문<textarea rows={8} value={state.pastedText} disabled={pending} maxLength={30000} onChange={event => update({ pastedText: event.target.value })} /></label><button type="button" className={styles.primary} disabled={pending || !state.pastedText.trim()} onClick={prepareTransient}>{state.transient ? '원문으로 출력 초안 다시 만들기' : '저장 없이 출력할 내용 확인'}</button>{state.transient && <small>다시 만들면 아래 출력 초안의 편집·선택·확정을 대체합니다.</small>}<details><summary>개인 문서로도 보관하기 · 선택</summary><button type="button" disabled={pending || !state.pastedText.trim()} onClick={() => void run(() => onStartText(state.pastedText, state.pastedTitle.trim() || '붙여넣은 원문'), '원문을 문서로 열었습니다.')}>원문 확인 후 문서로 열기</button></details><p className={styles.muted}>자동 Flow 변환이나 출처 검증을 뜻하지 않습니다.</p></div>}
      {state.transient && <TransientOutputEditor draft={state.transient} stale={state.transientSource?.text !== state.pastedText || state.transientSource?.title !== state.pastedTitle || state.transientSource?.url !== state.url} onChange={draft => update({ transient: draft })} onDiscard={() => update({ transient: null, transientSource: null })} />}{status}
    </section>}
    <div className={styles.listFilters}><label className={styles.searchField}><span className={styles.visuallyHidden}>공개 Flow 검색</span><input id="program-public-search" type="search" value={queryDraft} placeholder="제목·할 일·링크로 찾기"
        onCompositionStart={() => { composing.current = true; }}
        onCompositionEnd={event => { composing.current = false; setQueryDraft(event.currentTarget.value); update({ query: event.currentTarget.value }); }}
        onChange={event => { setQueryDraft(event.target.value); if (!composing.current && !(event.nativeEvent as InputEvent).isComposing) update({ query: event.target.value }); }} /></label>
      <div className={styles.filterRow}><label className={styles.filterSelect}><span className={styles.visuallyHidden}>분야</span><select id="program-public-category" value={state.category} onChange={event => update({ category: event.target.value, situation: '' })}><option value="">분야</option>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
        <label className={styles.filterSelect}><span className={styles.visuallyHidden}>상황</span><select id="program-public-situation" value={state.situation} onChange={event => update({ situation: event.target.value })}><option value="">상황</option>{situations.map(situation => <option key={situation}>{situation}</option>)}</select></label>
        <p className={styles.resultCount} role="status">{visible.length}개</p></div></div>
    {linkQuery && <section className={styles.linkLookup} aria-label="링크로 찾기" data-link-lookup={!linkCanonical ? 'invalid' : linkMatches.length ? 'found' : 'none'}>
      {!linkCanonical ? <p className={styles.error} role="alert">공개 HTTP(S) 주소를 확인해 주세요. 로그인 정보·비밀 값·로컬 주소는 받을 수 없습니다.</p>
        : linkMatches.length ? <h2>이 글로 만든 Flow {linkMatches.length}개</h2> : <>
          <h2>이 링크로 만든 공개 Flow가 아직 없습니다</h2>
          {(onKeepLink || onCreateFromLink) && <div className={styles.linkActions}>
            {onKeepLink && <button type="button" data-link-keep disabled={pending} onClick={() => void run(() => onKeepLink(linkCanonical), '링크를 두었습니다.')}>내 글에 링크로 두기</button>}
            {onCreateFromLink && <button type="button" className={styles.primary} data-link-create disabled={pending} onClick={() => void run(() => onCreateFromLink(linkCanonical), '새 글을 열었습니다.')}>이 링크로 Flow 만들기</button>}</div>}
          <p className={styles.muted}>링크로 두기는 쓰던 글의 오늘 아래에 한 줄을 남깁니다. 만들기는 출처가 채워진 새 글을 엽니다.</p></>}
      {status}
    </section>}
    <ul className={styles.flowCards}>{visible.map(({ flow: row, version: current }) => {
      // Core3 P2 (X6): three lines — title and its tag (공식 in blue, 내 문서에 있음 in grey), one summary line, and
      // "할 일 n · 일정 모양 · 분야". The source, first task and situations are on the detail.
      const meta = programCatalogMetadata(current.id);
      const lines = programFlowCardLines(row, current, { needsReview: !!meta?.sourceNeedsReview, inMyDocuments: copies.has(row.id),
        official: programFlowAttributionLabel(row, current, officialActors, data) === PROGRAM_OFFICIAL_LABEL, anchorLabel: meta?.anchorLabel ?? null });
      const match = linkQuery ? linkMatches.find(entry => entry.flow.id === row.id) : undefined;
      return <li key={row.id}><button type="button" id={`program-discovery-${row.id}`} className={styles.flowCard} data-card-lines="3" onClick={() => openFlow(row.id)}
        aria-label={[lines.title, lines.tag, lines.oneLine, lines.brief].filter(Boolean).join(', ')}>
        <span className={styles.cardTitleRow}><span className={styles.cardTitle}>{lines.title}</span>{lines.tag && <span className={styles.cardBadge} data-badge={lines.tag}>{lines.tag}</span>}</span>
        {lines.oneLine && <span className={styles.cardSummary}>{lines.oneLine}</span>}
        <span className={styles.cardMeta}><ProgramFlowThread {...programFlowCardThread(current)} width={64} />{programRepeatText(lines.brief)}</span>
        {match?.on === 'item' && <span className={styles.cardSource} data-link-on="item">항목 출처: {match.items.join(', ')}</span>}
      </button></li>;
    })}</ul>
    {!visible.length && !linkQuery && <div className={styles.empty}>{flows.length ? <><h2>맞는 자료가 없습니다</h2><p>검색어나 분야·상황을 바꿔 보세요.</p><button type="button" onClick={() => { setQueryDraft(''); update({ query: '', category: '', situation: '' }); }}>검색 조건 지우기</button></> : <h2>아직 공개된 Flow가 없어요</h2>}</div>}
    <p className={styles.muted}>{storageScope === 'account' ? <>공개된 Flow 목록입니다. 개인 사본·실행 기록·비공개 제작 초안은 포함되지 않습니다. <button type="button" className={styles.linkButton} onClick={() => navigate({ view: 'space' })}>내 문서 보기</button></> : <>공개 목록은 이 기기의 로컬 PoC입니다. 기존에 저장한 Flow는 <button type="button" className={styles.linkButton} onClick={() => navigate({ view: 'legacy' })}>기존 내 Flow</button>에서 찾을 수 있습니다.</>}</p>
    <nav className={styles.contextLinks} aria-label="Flow 보조 메뉴"><button type="button" className={styles.linkButton} disabled={pending} onClick={() => navigate({ view: 'community' })}>이야기 보기</button>{storageScope === 'account' && <button type="button" className={styles.linkButton} disabled={pending} onClick={() => navigate({ view: 'activity' })}>내 활동</button>}</nav>
  </section>;
}
