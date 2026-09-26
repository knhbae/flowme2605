'use client';
import { decodeBackupFile } from '@/lib/flow/integrated-poc/alpha-preservation/file-codec';
import { BACKUP_DOWNLOAD_FORMAT, readBackupDownload } from '@/lib/flow/integrated-poc/alpha-preservation/backup-download';
import { preparePreservationWireRequest } from '@/lib/flow/integrated-poc/alpha-preservation/transport';
import React, { useEffect, useRef, useState } from 'react';
import type { AlphaAccount, AlphaReferenceContext } from '@/lib/flow/integrated-poc/alpha-persistence/contract';
import { detached, canonicalJson, parseAlphaJson } from '@/lib/flow/integrated-poc/alpha-persistence/json';
import { createProgramPrivateSpace } from '@/lib/flow/integrated-poc/program-data';
import { inspectLocalImportActors, prepareLocalImport } from '@/lib/flow/integrated-poc/alpha-preservation/import';
import { createLocalImportSource } from '@/lib/flow/integrated-poc/alpha-preservation/source';
import { PRESERVATION_PROTOCOL, SEALED_BACKUP_SCHEMA, type PreservationPreview } from '@/lib/flow/integrated-poc/alpha-preservation/contract';
import { isPreservationContentSummary, type PreservationContentSummary } from '@/lib/flow/integrated-poc/alpha-preservation/content-summary';
import { restoreProgramDialogFocus } from '@/lib/flow/integrated-poc/dialog-return-focus';
import styles from './AlphaPreservationPanel.module.css';
import { browserPreservationPendingStore, type PreservationPending } from '@/lib/flow/integrated-poc/alpha-preservation/pending-store';

const messages: Record<string, string> = {
  'preservation-request-limit': '복원 요청이 30MB 한도를 넘어 전송하지 않았습니다. 원본 파일을 보관해 주세요.',
  'invalid-backup-file': '백업 파일을 확인하지 못해 전송하지 않았습니다. 원본 파일을 보관해 주세요.',
  'backup-codec-unavailable': '이 브라우저는 압축 백업을 지원하지 않습니다. 최신 Chrome·Edge·Safari·Firefox에서 다시 시도해 주세요.',
  'backup-file-limit': '압축 전후 백업 크기가 30MB 제한을 넘었습니다. 원본은 변경하지 않았습니다.',
  'revision-conflict': '다른 변경이 먼저 저장됐습니다. 최신 자료를 확인한 뒤 미리보기를 다시 열어 주세요.',
  'invalid-backup': '이 계정의 백업이 아니거나 백업이 손상됐습니다. 적용하지 않았습니다.',
  'missing-file': '필요한 사진을 서버에서 확인하지 못했습니다. 적용하지 않았습니다. 백업 파일을 보관해 주세요.',
  'unsupported-client': '이 버전에서는 보존 기능을 사용할 수 없습니다. 화면을 새로고침해 주세요.',
  unauthenticated: '로그인이 만료됐습니다. 다시 로그인한 뒤 확인해 주세요.',
  'no-change': '현재 자료와 같습니다. 변경하지 않았습니다.',
  limit: '자료 또는 계정의 보관 한도를 넘어 적용하지 않았습니다. 원본 파일을 보관하고 적용 범위를 다시 확인해 주세요.',
  'rate-limited': '현재 계정의 가져오기 한도에 도달해 적용하지 않았습니다. 원본 파일을 보관해 주세요.',
  unavailable: '서버 응답을 확인하지 못했습니다. 같은 요청의 결과를 확인해 주세요.',
  unresolved: '연결하거나 합칠 수 없는 자료가 있습니다. 적용하지 않았습니다.',
};
type Selection = { raw: string; actorId: string; mode: 'import' | 'restore' };
type Pending = PreservationPending;
const contentLabels: Record<keyof PreservationContentSummary, string> = {
  documents: '텍스트 문서', flowDocuments: '문서에서 만든 Flow', savedFlows: '보관한 실행 Flow',
  creatorDrafts: '제작 중인 Flow', creatorWorkingCopies: '편집 작업본',
  catalogFlows: '자료실 Flow', catalogItems: '자료실 Item', catalogSections: '자료실 단계',
  catalogMaps: '자료실 Map', catalogVariants: '자료실 별도 판본',
};
function hasContentSummary(preview: PreservationPreview): boolean {
  return isPreservationContentSummary(preview.content?.current) && isPreservationContentSummary(preview.content?.next);
}
/** Modal lifetime is bound to one verified owner. No automatic import or public replay. */
export function AlphaPreservationPanel({ account, references, email, accessToken, onClose, onSaved }: {
  account: AlphaAccount; references: AlphaReferenceContext; email: string; accessToken: string; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null), alive = useRef(true), selectionGeneration = useRef(0);
  const [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [raw, setRaw] = useState('');
  const [actors, setActors] = useState<{ id: string; name: string }[]>([]), [actorId, setActorId] = useState('');
  const [selection, setSelection] = useState<Selection | null>(null), [preview, setPreview] = useState<PreservationPreview | null>(null);
  const [confirmed, setConfirmed] = useState(false), [pending, setPending] = useState<Pending | null>(null);
  const [download, setDownload] = useState<{ url: string; name: string } | null>(null);
  const [recoveryReady, setRecoveryReady] = useState(false);
  async function loadPending() {
    setBusy(true);
    try {
      const saved = await browserPreservationPendingStore().load(account.ownerId);
      if (!alive.current) return;
      setPending(saved); setRecoveryReady(true);
      setStatus(saved ? '이전 적용 결과를 아직 확인하지 못했습니다. 같은 요청으로 확인해 주세요.' : '보관한 적용 요청을 확인했습니다.');
    } catch { if (alive.current) setStatus('보관한 적용 요청을 읽지 못했습니다. 브라우저 저장 공간을 확인한 뒤 다시 확인해 주세요. 원본 파일은 유지해 주세요.'); }
    finally { if (alive.current) setBusy(false); }
  }
  useEffect(() => {
    alive.current = true; const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null, element = dialog.current;
    element?.showModal();
    void loadPending();
    return () => { alive.current = false; element?.close(); restoreProgramDialogFocus(opener); };
  }, []);
  useEffect(() => () => { if (download) URL.revokeObjectURL(download.url); }, [download]);
  async function request(payload: unknown) {
    const wire = await preparePreservationWireRequest({ ...payload as object, client: PRESERVATION_PROTOCOL.client });
    if (!alive.current) throw Error('disposed');
    const response = await fetch('/api/alpha/preservation', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(wire), cache: 'no-store' });
    const value = await response.json();
    if (!alive.current) throw Error('disposed');
    if (!value.ok) throw Error(value.reason || 'unavailable');
    return value.value;
  }
  async function backup() {
    setBusy(true); setStatus('사진과 저장 기록을 포함해 백업을 만들고 있습니다.');
    try { const value = await request({ kind: 'backup', format: BACKUP_DOWNLOAD_FORMAT });
      const { file, createdAt } = await readBackupDownload(value, account.ownerId);
      if (!alive.current) return;
      const url = URL.createObjectURL(new Blob([file], { type: 'application/json' }));
      setDownload({ url, name: `flowme-account-${createdAt.slice(0, 10)}.json` }); setStatus('백업 파일이 준비됐습니다. 아래에서 내려받아 보관해 주세요.');
    } catch (error) { if (alive.current) setStatus(messages[(error as Error).message] ?? '백업을 만들지 못했습니다. 완전한 파일은 생성되지 않았습니다.'); }
    finally { if (alive.current) setBusy(false); }
  }
  async function selectRaw(sourceRaw: string, generation = ++selectionGeneration.current) {
    if (!alive.current || generation !== selectionGeneration.current) return;
    setRaw(sourceRaw); setPreview(null); setSelection(null); setConfirmed(false); setActors([]); setActorId('');
    try {
      sourceRaw = await decodeBackupFile(sourceRaw);
      if (!alive.current || generation !== selectionGeneration.current) return;
      setRaw(sourceRaw);
      const value = parseAlphaJson(sourceRaw);
      if (value && typeof value === 'object' && 'schema' in value && value.schema === SEALED_BACKUP_SCHEMA) {
        setSelection({ raw: sourceRaw, actorId: '', mode: 'restore' }); setStatus('계정 백업을 선택했습니다. 먼저 복원 범위를 확인해 주세요.'); return;
      }
      const inspected = await inspectLocalImportActors(sourceRaw);
      if (!alive.current || generation !== selectionGeneration.current) return;
      if (!inspected.ok) throw Error('invalid-source');
      setActors(inspected.actors); setActorId(inspected.actors.length === 1 ? inspected.actors[0].id : '');
      setStatus('가져올 원본 사용자를 선택해 주세요. 다른 사용자의 개인 자료는 전송하지 않습니다.');
    } catch (error) { if (alive.current && generation === selectionGeneration.current) setStatus(messages[(error as Error).message] ?? '지원하지 않거나 손상된 자료입니다. 원본은 변경하지 않았습니다.'); }
  }
  async function selectFile(file: File) {
    const generation = ++selectionGeneration.current;
    setRaw(''); setSelection(null); setPreview(null); setActors([]); setActorId(''); setConfirmed(false);
    if (file.size > PRESERVATION_PROTOCOL.bytes) { setStatus('파일이 30MB 제한을 넘었습니다. 원본은 변경하지 않았습니다.'); return; }
    try { await selectRaw(await file.text(), generation); }
    catch { if (alive.current && generation === selectionGeneration.current) setStatus('파일을 읽지 못했습니다. 원본은 변경하지 않았습니다.'); }
  }
  async function inspect() {
    setBusy(true); setPreview(null); setConfirmed(false);
    try {
      let selected = selection;
      if (actors.length) {
        const empty = detached(account); empty.space = createProgramPrivateSpace();
        const prepared = await prepareLocalImport(raw, actorId, empty, references);
        if (!prepared.ok) { setStatus(prepared.details.join(' ')); return; }
        selected = { raw: prepared.archive.sourceRaw, actorId: prepared.archive.actorId, mode: 'import' }; setSelection(selected);
      }
      if (!selected) return;
      const next = await request({ kind: 'preview', mode: selected.mode, sourceRaw: selected.raw, actorId: selected.actorId }) as PreservationPreview;
      if (next.ownerId !== account.ownerId) throw Error('invalid');
      setPreview(next); setStatus(!hasContentSummary(next) ? '자료 개수 비교를 받지 못했습니다. 화면을 새로고침한 뒤 미리보기를 다시 열어 주세요.'
        : next.same ? '이미 같은 자료가 있습니다. 변경하지 않습니다.' : next.canApply ? '아직 적용하지 않았습니다. 아래 범위를 확인해 주세요.' : next.details.join(' '));
    } catch (error) { setStatus(messages[(error as Error).message] ?? '미리보기를 확인하지 못했습니다. 변경하지 않았습니다.'); }
    finally { if (alive.current) setBusy(false); }
  }
  async function finish(value: unknown, requestId: string) {
    if (!value || typeof value !== 'object' || !('kind' in value) || value.kind !== 'preservation' || !('revision' in value)
      || !Number.isSafeInteger(value.revision) || !('changed' in value) || value.changed !== true
      || !('requestId' in value) || value.requestId !== requestId) throw Error('unavailable');
    await browserPreservationPendingStore().remove(account.ownerId, requestId);
    if (!alive.current) return;
    setPending(null); setPreview(null); setConfirmed(false);
    setStatus('서버 적용을 확인했습니다. 원본과 이전 서버 기록은 보존했습니다.'); await onSaved();
  }
  async function commit(retry?: Pending) {
    // An older server's partial counts cannot authorize a new destructive apply.
    // Existing uncertain requests must still resolve by their original identity.
    if (!retry && (!preview || !hasContentSummary(preview))) {
      setStatus('자료 개수 비교를 받지 못해 적용하지 않았습니다. 화면을 새로고침한 뒤 미리보기를 다시 열어 주세요.'); return;
    }
    const operation: Pending | null = retry ?? (selection && preview ? { ...selection, command: { schema: PRESERVATION_PROTOCOL.schema,
      kind: 'preservation', requestId: crypto.randomUUID(), expectedRevision: preview.expectedRevision, expectedPublicRevision: preview.expectedPublicRevision,
      mode: selection.mode, sourceSha256: preview.sourceSha256 } } : null);
    if (!operation) return;
    setBusy(true);
    try {
      // Save exact request before network. A lost reply/reload never creates another operation ID.
      try { await browserPreservationPendingStore().save(account.ownerId, operation); }
      catch (error) {
        if (!alive.current) return;
        if (error instanceof Error && error.message === 'pending-conflict') {
          setRecoveryReady(false); setStatus('다른 적용 요청이 보관되어 이번 요청은 보내지 않았습니다. 보관 요청을 다시 확인해 주세요.'); return;
        }
        setStatus(retry
          ? '브라우저에 재시도 요청을 보관하지 못해 이번 요청은 보내지 않았습니다. 이전 요청은 유지합니다. 브라우저 저장 공간을 확인한 뒤 적용 결과를 다시 확인해 주세요.'
          : '브라우저에 복구용 요청을 보관하지 못해 서버에 적용 요청을 보내지 않았습니다. 원본 파일을 보관하고 브라우저 저장 공간을 확인한 뒤 다시 시도해 주세요.');
        return;
      }
      if (!alive.current) return;
      setPending(operation);
      await finish(await request({ kind: 'commit', command: operation.command, sourceRaw: operation.raw, actorId: operation.actorId }), operation.command.requestId);
    } catch (error) {
      const reason = (error as Error).message;
      if (alive.current) {
        const preparationFailed = ['preservation-request-limit', 'backup-file-limit', 'invalid-backup-file', 'backup-codec-unavailable'].includes(reason);
        setStatus(preparationFailed && retry ? '복원 요청을 준비하지 못해 이번 요청은 보내지 않았습니다. 이전 요청은 유지합니다. 원본과 적용 결과를 다시 확인해 주세요.'
          : messages[reason] ?? '적용 결과를 확인하지 못했습니다. 같은 요청으로 다시 확인해 주세요.');
        if (preparationFailed && !retry || ['revision-conflict', 'invalid-backup', 'missing-file', 'unresolved', 'no-change', 'invalid', 'unsupported-client', 'limit', 'rate-limited'].includes(reason)) {
          try { await browserPreservationPendingStore().remove(account.ownerId, operation.command.requestId); }
          catch { setStatus(preparationFailed ? '이번 요청은 보내지 않았지만 브라우저의 보관 요청을 정리하지 못했습니다. 원본을 보관하고 저장 공간을 확인해 주세요.'
            : '서버가 적용하지 않았음을 확인했지만 브라우저의 보관 요청을 정리하지 못했습니다. 저장 공간을 확인한 뒤 같은 요청의 결과를 다시 확인해 주세요.'); return; }
          if (!alive.current) return;
          setPending(null); setPreview(null); setConfirmed(false);
        }
      }
    } finally { if (alive.current) setBusy(false); }
  }
  async function resolve() {
    if (!pending) return; setBusy(true);
    try { const receipt = await request({ kind: 'lookup', requestId: pending.command.requestId });
      if (receipt) await finish(receipt, pending.command.requestId); else await commit(pending);
    } catch (error) { if (alive.current) setStatus(messages[(error as Error).message] ?? '결과를 확인하지 못했습니다. 원본과 요청은 유지합니다.'); }
    finally { if (alive.current) setBusy(false); }
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="alpha-data-title" onCancel={event => { if (busy) event.preventDefault(); else onClose(); }}>
    <header><h2 id="alpha-data-title">자료 가져오기 · 백업</h2><button type="button" disabled={busy} onClick={onClose}>닫기</button></header>
    <p className={styles.owner}>적용할 계정: {email}</p>
    <section><h3>내 계정 백업</h3><p>현재 개인 자료·원문·기록과 연결된 사진을 파일로 보관합니다. 공개 자료를 되돌리는 서비스 전체 복원은 아닙니다.</p>
      <button type="button" disabled={busy || !recoveryReady || !!pending} onClick={() => void backup()}>사진 포함 백업 만들기</button>
      {download && <a href={download.url} download={download.name}>백업 파일 내려받기</a>}
      <small>암호화되지 않은 개인 자료입니다. 안전한 곳에 보관하세요. 이미 삭제된 과거 첨부는 복원 대상이 아닙니다.</small></section>
    <section><h3>자료 선택</h3><p>기존 통합 PoC 자료를 가져오거나 이 계정의 백업으로 복원합니다. 원본 파일·브라우저 저장값은 수정하지 않습니다.</p>
      <label>JSON 파일 선택<input type="file" accept="application/json,.json" disabled={busy || !recoveryReady || !!pending} onChange={event => { const file = event.target.files?.[0];
        if (file) void selectFile(file); }} /></label>
      <button type="button" disabled={busy || !recoveryReady || !!pending} onClick={() => { const local = createLocalImportSource(localStorage); if (local.ok) void selectRaw(local.raw); else setStatus(local.details.join(' ')); }}>이 브라우저의 이전 자료 읽기</button>
      {actors.length > 0 && <label>가져올 원본 사용자<select value={actorId} disabled={busy || !!pending} onChange={event => { setActorId(event.target.value); setPreview(null); setSelection(null); }}>
        <option value="">선택해 주세요</option>{actors.map(actor => <option key={actor.id} value={actor.id}>{actor.name}</option>)}</select></label>}
      <button type="button" disabled={busy || !!pending || !selection && !actorId} onClick={() => void inspect()}>적용 전 미리보기</button></section>
    {preview && <section aria-label="자료 적용 미리보기"><h3>{preview.mode === 'restore' ? '개인공간 복원' : '이전 자료 가져오기'}</h3>
      <p>현재 서버 판본 {preview.expectedRevision}</p>
      {hasContentSummary(preview) ? <table className={styles.summary}>
        <caption>주요 자료 개수 — 개수가 같아도 내용은 다를 수 있습니다.</caption>
        <thead><tr><th scope="col">자료</th><th scope="col">현재</th><th scope="col">{preview.mode === 'restore' ? '복원 후' : '가져온 후'}</th></tr></thead>
        <tbody>{(Object.keys(contentLabels) as (keyof PreservationContentSummary)[]).map(key => <tr key={key}>
          <th scope="row">{contentLabels[key]}</th><td>{preview.content!.current[key]}개</td><td>{preview.content!.next[key]}개</td>
        </tr>)}</tbody>
      </table> : <p role="alert">자료 개수 비교를 받지 못해 적용할 수 없습니다. 화면을 새로고침한 뒤 미리보기를 다시 열어 주세요.</p>}
      {preview.mode === 'restore' && <p>완료·날짜·폴더 등 개인 기록도 백업 시점으로 돌아갑니다.</p>}
      {preview.createdAt && <p>복원 시점: <time dateTime={preview.createdAt}>{new Date(preview.createdAt).toLocaleString('ko-KR')}</time></p>}
      {preview.warnings.filter(warning => !['already-applied', 'local-public-evidence-not-published'].includes(warning)).map(warning => <p key={warning}>{warning}</p>)}
      <p>공개 게시물은 새로 만들거나 덮어쓰지 않습니다. 충돌과 미매핑 자료는 자동 적용하지 않습니다.</p>
      {preview.canApply && hasContentSummary(preview) && <><label className={styles.confirm}><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />계정과 적용 범위를 확인했습니다{preview.mode === 'restore' ? '. 현재 자료를 별도로 백업했습니다' : ''}.</label>
        <button type="button" disabled={!confirmed || busy || !!pending} onClick={() => void commit()}>{preview.mode === 'restore' ? '이 백업으로 개인공간 복원' : '선택 자료 가져오기'}</button></>}
      <button type="button" disabled={busy || !!pending} onClick={() => { setPreview(null); setConfirmed(false); setStatus('취소했습니다. 변경하지 않았습니다.'); }}>취소</button></section>}
    {pending && <section><p>저장 결과가 아직 확인되지 않았습니다. 다른 자료를 적용하기 전에 결과를 확인해 주세요.</p><button disabled={busy} onClick={() => void resolve()}>적용 결과 확인 · 같은 요청 재시도</button></section>}
    {!recoveryReady && <button type="button" disabled={busy} onClick={() => void loadPending()}>보관 요청 다시 확인</button>}
    <p role="status" aria-live="polite" className={styles.status}>{status}</p>
  </dialog>;
}
