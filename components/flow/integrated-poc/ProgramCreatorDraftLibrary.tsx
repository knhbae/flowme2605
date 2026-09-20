'use client';

import { useEffect, useRef, useState } from 'react';
import { programFailure, programId, type ProgramData, type ProgramPrivateSpace } from '@/lib/flow/integrated-poc/contract';
import { importProgramCreatorDraft, readProgramCreatorDraftLibrary } from '@/lib/flow/integrated-poc/creator-draft-bridge';
import { programErrorMessage, type ProgramMutate } from '@/lib/flow/integrated-poc/ui-contract';
import type { PersonalWorkspacePocCreatorDraftLibraryLoadResult } from '@/lib/flow/personal-workspace-poc-creator-draft-storage';
import styles from './ProgramRevisionHistory.module.css';
import libraryStyles from './ProgramCreatorDraftLibrary.module.css';
import { continueProgramCreatorDraft } from '@/lib/flow/integrated-poc/creator-workspace';
import { readNativeCreatorHistory, type NativeCreatorHistoryRead } from '@/lib/flow/integrated-poc/creator-history-codec';
import { importNativeCreatorSavedHistory } from '@/lib/flow/integrated-poc/creator-history';
import {ProgramLegacyCreatorRecovery,type ProgramLegacyCreatorRecoveryProps} from './ProgramLegacyCreatorRecovery';
import type {LegacyCreatorRecoveryHandoffRequest} from '@/lib/flow/integrated-poc/legacy-creator-recovery-handoff';

export type ProgramCreatorDraftLibraryProps = {
  data: ProgramData; mutate: ProgramMutate; onClose: () => void; onOpenDocument: (id: string) => void; onOpenCreatorDraft?: (id: string) => void;
  recovery?:Omit<ProgramLegacyCreatorRecoveryProps<LegacyCreatorRecoveryHandoffRequest>,'actorId'|'onOpenCreatorDraft'|'onPendingChange'>;
};

export function ProgramCreatorDraftLibrary({ data, mutate, onClose, onOpenDocument, onOpenCreatorDraft,recovery }: ProgramCreatorDraftLibraryProps) {
  const actorId = data.activeActorId, space = data.spaces[actorId];
  const [loaded, setLoaded] = useState<PersonalWorkspacePocCreatorDraftLibraryLoadResult | null>(null);
  const [query, setQuery] = useState(''), [archived, setArchived] = useState(false), [selected, setSelected] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const pending = useRef(false), dialog = useRef<HTMLDialogElement>(null), expectedSpace = useRef<ProgramPrivateSpace | null>(null);
  const request = useRef<{ id: string; submittedAt: string | null } | null>(null);
  const [native,setNative]=useState<NativeCreatorHistoryRead|null>(null),[nativeId,setNativeId]=useState(''),[nativeVersion,setNativeVersion]=useState('');
  const nativeRequest=useRef<{id:string;expectedSpace:ProgramPrivateSpace;now:string|null}|null>(null);
  const nativeRecord=native?.kind==='ready'?native.records.find(r=>r.draftId===nativeId):undefined;
  function readNative(){try{setNative(readNativeCreatorHistory(window.localStorage));}catch{setNative({kind:'unavailable',raw:null});}setNativeId('');setNativeVersion('');nativeRequest.current=null;}
  async function importNative(){
    const request=nativeRequest.current;
    if(pending.current||!request||native?.kind!=='ready'||!nativeRecord||!onOpenCreatorDraft||actorId!=='local-user')return;
    pending.current=true;setBusy(true);setError('');
    try{
      const now=request.now??=new Date().toISOString();
      const result=await mutate('기존 제작기 저장 이력 가져오기',current=>{
        const latest=readNativeCreatorHistory(window.localStorage);
        if(latest.kind!=='ready')return programFailure(current,'conflict');
        return importNativeCreatorSavedHistory(current,{actorId,requestId:request.id,draftId:nativeRecord.draftId,expectedSpace:request.expectedSpace,expectedRaw:native.raw},latest.raw,now);
      });
      if(result.ok)onOpenCreatorDraft(result.result);
      else setError(result.reason==='conflict'?'기존 저장소나 현재 입력이 바뀌었습니다. 입력을 저장한 뒤 목록을 다시 읽고 선택해 주세요.':programErrorMessage(result.reason));
    }catch{setError('기존 저장 이력을 읽거나 가져오지 못했습니다. 선택과 원본은 유지했습니다.');}
    finally{pending.current=false;setBusy(false);}
  }
  const record = loaded?.kind === 'ready' ? loaded.library.records[selected] : undefined;
  const imported = space.creatorDraftImports?.find(entry => entry.creatorDraftId === selected);
  function refresh() {
    setLoaded(readProgramCreatorDraftLibrary(window.localStorage)); setSelected(''); expectedSpace.current = null; request.current = null; setError('');
  }
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.current?.open) dialog.current?.showModal();
    refresh();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  const rows = loaded?.kind === 'ready' ? Object.values(loaded.library.records).filter(row => (row.status === 'archived') === archived
    && `${row.title}\n${row.rawText}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : [];
  async function importSelected() {
    if (pending.current || actorId !== 'local-user' || loaded?.kind !== 'ready' || !record || !expectedSpace.current || !request.current) return;
    const now = request.current.submittedAt ??= new Date().toISOString();
    const input = { actorId, requestId: request.current.id, creatorDraftId: record.draftId,
      expectedLibraryRevision: loaded.library.revision, expectedRecordRevision: record.recordRevision,
      expectedSourceFingerprint: record.sourceFingerprint, expectedSpace: expectedSpace.current };
    const expectedRaw = loaded.raw;
    pending.current = true; setBusy(true); setError('');
    try {
      const result = await mutate('기존 제작 초안 가져오기', current => {
        const latest = readProgramCreatorDraftLibrary(window.localStorage);
        if (latest.kind !== 'ready' || latest.raw !== expectedRaw) return programFailure(current, 'conflict');
        return importProgramCreatorDraft(current, latest.library, input, now);
      });
      if (result.ok) onOpenDocument(result.result);
      else setError(result.reason === 'conflict' ? '초안이나 개인 문서가 바뀌었습니다. 목록을 다시 읽고 확인해 주세요.'
        : result.reason === 'unresolved' ? '이 본문을 개인 문서로 안전하게 옮기지 못했습니다. 기존 초안은 그대로 남아 있습니다.' : programErrorMessage(result.reason));
    } catch { setError('가져오지 못했습니다. 기존 초안과 입력 내용은 바꾸지 않았습니다.'); }
    finally { pending.current = false; setBusy(false); }
  }
  async function continueSelected() {
    if (pending.current || actorId !== 'local-user' || loaded?.kind !== 'ready' || !record || !onOpenCreatorDraft) return;
    const expectedRaw = loaded.raw, requestId = programId('request'), now = new Date().toISOString();
    pending.current = true; setBusy(true); setError('');
    try {
      const result = await mutate('기존 초안에서 제작 계속하기', current => {
        const latest = readProgramCreatorDraftLibrary(window.localStorage);
        if (latest.kind !== 'ready' || latest.raw !== expectedRaw) return programFailure(current, 'conflict');
        return continueProgramCreatorDraft(current, latest.library, { actorId, requestId, creatorDraftId: record.draftId,
          expectedLibraryRevision: loaded.library.revision, expectedRecordRevision: record.recordRevision }, now);
      });
      if (result.ok) onOpenCreatorDraft(result.result);
      else setError(result.reason === 'conflict' ? '다른 제작 입력이나 원본 변경이 있습니다. 제작 중 입력을 먼저 저장하거나 확인해 주세요.' : programErrorMessage(result.reason));
    } catch { setError('제작 원문을 열지 못했습니다. 기존 보관함은 바꾸지 않았습니다.'); }
    finally { pending.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} className={`${styles.dialog} ${libraryStyles.library}`} aria-labelledby="program-creator-library-heading" onCancel={event => { event.preventDefault(); if (!pending.current) onClose(); }}>
    <header className={styles.heading}><h2 id="program-creator-library-heading">기존 제작 초안</h2><button disabled={busy} onClick={onClose} aria-label="제작 초안 닫기">닫기</button></header>
    <p>기존 보관함을 바꾸지 않고 선택한 초안을 개인 문서로 가져옵니다. 가져온 뒤의 편집은 두 곳에 자동으로 반영되지 않습니다.</p>
    {recovery&&onOpenCreatorDraft&&<ProgramLegacyCreatorRecovery {...recovery} actorId={actorId} onOpenCreatorDraft={onOpenCreatorDraft} onPendingChange={value=>{pending.current=value;setBusy(value);}}/>}
    {onOpenCreatorDraft&&actorId==='local-user'&&<details className={styles.section}><summary>개발2 제작기의 저장 이력</summary><p>아래 버튼으로 이 기기에 실제 남아 있는 제작 원문과 저장본을 읽습니다. 임시 작업은 위의 별도 읽기 경로를 사용합니다. 구조 템플릿 sidecar는 가져오지 않습니다.</p>
      <button disabled={busy} onClick={readNative}>개발2 저장 이력 읽기</button>
      {native&&native.kind!=='ready'&&<p>{native.kind==='empty'?'이 기기에 기존 제작기 저장 이력이 없습니다.':'기존 저장 이력을 안전하게 읽지 못했습니다. 원본은 바꾸지 않았습니다.'}</p>}
      {native?.kind==='ready'&&<><label>기존 제작 초안<select value={nativeId} disabled={busy} onChange={event=>{setNativeId(event.target.value);setNativeVersion('');nativeRequest.current={id:programId('history-import'),expectedSpace:space,now:null};}}><option value="">초안 선택</option>{native.records.map(r=><option key={r.draftId} value={r.draftId}>{r.title} · {r.history.length}개 저장본</option>)}</select></label>
        {!native.records.length&&<p>가져올 제작자 초안이 없습니다. 개인·제안 문서는 이 목록에 넣지 않습니다.</p>}
        {nativeRecord&&<><details open><summary>현재 저장 원문 · {nativeRecord.currentRevisionId}</summary><pre className={styles.raw}>{nativeRecord.currentRaw||'(원문 없음)'}</pre></details>
          <label>실제로 남아 있는 이전 저장본<select value={nativeVersion} disabled={busy} onChange={event=>setNativeVersion(event.target.value)}><option value="">비교할 저장본 선택</option>{nativeRecord.history.map(r=><option key={r.id} value={r.id}>{r.kind==='text-authoring-v1'?r.origin.versionId:r.id} · {r.savedAt}</option>)}</select></label>
          {nativeRecord.history.filter(r=>r.id===nativeVersion).map(r=><section key={r.id} aria-label="기존 제작기 저장본 비교"><pre className={styles.raw}>{r.rawText||'(원문 없음)'}</pre>{r.kind==='text-authoring-v1'&&<details><summary>원래 저장본의 전체 구조 자료</summary><pre className={styles.raw}>{r.origin.documentJson}</pre></details>}</section>)}
          <p>현재 원문과 실제 저장 이력을 별도 Program 제작 초안으로 가져옵니다. 이후 이력에서 원문 복구를 명시합니다. 기존 구조 자료는 읽기 보존하며 실행·공개를 자동 생성하지 않습니다.</p>
          <button disabled={busy||!nativeRecord.currentRaw.trim()} onClick={()=>void importNative()}>현재 원문과 저장 이력을 제작 초안으로 가져오기</button></>}
      </>}
    </details>}
    {actorId !== 'local-user' ? <p role="alert">이 기기의 제작 초안은 ‘나’의 개인공간에서 가져올 수 있습니다.</p> : <>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!loaded && <p role="status">초안을 불러오는 중…</p>}
      {loaded?.kind === 'corrupt' && <p className={styles.error} role="alert">기존 초안을 읽을 수 없습니다. 저장 내용은 변경하지 않았습니다.</p>}
      {loaded?.kind === 'empty' && <p>이 기기에 저장한 제작 초안이 없습니다.</p>}
      <button disabled={busy} onClick={refresh}>목록 다시 읽기</button>
      {loaded?.kind === 'ready' && <section className={styles.section}>
        <label>제작 초안 찾기<input type="search" value={query} disabled={busy} onChange={event => setQuery(event.target.value)} /></label>
        <button disabled={busy} aria-pressed={archived} onClick={() => setArchived(value => !value)}>{archived ? '사용 중인 초안 보기' : '보관한 초안 보기'}</button>
        {!rows.length && <p>{query ? '검색 결과가 없습니다.' : '이 목록에 초안이 없습니다.'}</p>}
        <div className={styles.actions}>{rows.map(row => <button key={row.draftId} disabled={busy} aria-pressed={selected === row.draftId} onClick={() => { setSelected(row.draftId); expectedSpace.current = space; request.current = { id: programId('creator-import'), submittedAt: null }; setError(''); }}>{row.title}</button>)}</div>
      </section>}
      {record && <section className={styles.section} aria-label="가져올 초안 확인"><h3>{record.title}</h3><small>{record.status === 'archived' ? '보관한 초안' : '사용 중인 초안'} · 마지막 저장 {new Date(record.updatedAt).toLocaleString('ko-KR')}</small>
        <pre className={styles.raw}>{record.rawText || '(빈 초안)'}</pre>
        {onOpenCreatorDraft && <div><p>Program 제작 초안으로 이어 쓰고 결과를 확인할 수 있습니다. 기존 보관함에는 다시 쓰지 않습니다.</p><button disabled={busy} onClick={() => void continueSelected()}>이 초안에서 제작 계속하기</button></div>}
        {loaded?.kind === 'ready' && loaded.library.undo?.snapshot.records[record.draftId] && <details><summary>보관함에 남은 직전 상태 확인</summary><p>보관함이 실제로 보존한 직전 상태 한 개입니다. 항목별 실행 기록을 뜻하지 않습니다.</p><pre className={styles.raw}>{loaded.library.undo.snapshot.records[record.draftId].rawText || '(빈 초안)'}</pre></details>}
        {imported ? <><p>이미 가져온 초안입니다. 개인 문서의 편집 내용은 덮어쓰지 않습니다.</p><button disabled={busy} onClick={() => onOpenDocument(imported.documentId)}>가져온 문서 열기</button></> : <div className={styles.actions}><button disabled={busy} onClick={() => { setSelected(''); expectedSpace.current = null; request.current = null; }}>취소</button><button className={styles.primary} disabled={busy} onClick={() => void importSelected()}>{busy ? '가져오는 중…' : '확인한 초안을 개인 문서로 가져오기'}</button></div>}
      </section>}
    </>}
  </dialog>;
}
