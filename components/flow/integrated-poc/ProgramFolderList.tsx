'use client';

import React, { useMemo, useRef, useState } from 'react';
import { programFolderListRows, programFolderParents, PROGRAM_FOLDER_SEARCH_OVER, PROGRAM_UNFILED_FOLDER, type ProgramFolderTreeRow } from '@/lib/flow/integrated-poc/folder-screen';
import styles from './ProgramFolderScreen.module.css';

export const ProgramFolderIcon = ({ dashed = false, muted = false }: { dashed?: boolean; muted?: boolean }) =>
  <svg className={styles.folderIcon} data-muted={muted || undefined} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" strokeDasharray={dashed ? '3 2.5' : undefined} /></svg>;

/** F4-a A1·A6: the 폴더 tab's first screen (and, on a wide screen, the column beside an open folder). '모든 할 일' on top,
 *  the tree with each folder's open tasks (a parent counts its subfolders'), 미분류 last, then ＋ 새 폴더. Over twelve
 *  folders: a find field (it filters once a composition ends) and parents folded but the last opened folder's. */
export function ProgramFolderList(props: {
  tree: { all: number; rows: ProgramFolderTreeRow[] };
  /** The folder shown beside the list ('' = 모든 할 일), or null on the list alone. */
  current: string | null;
  /** The folder opened last, whose parents stay unfolded in a long list. */
  lastOpened: string;
  disabled?: boolean;
  onOpen(folderId: string): void;
  onCreate(title: string): Promise<boolean>;
}) {
  const { rows, all } = props.tree;
  const many = rows.filter(row => row.id !== PROGRAM_UNFILED_FOLDER).length > PROGRAM_FOLDER_SEARCH_OVER;
  const [draft, setDraft] = useState(''), [query, setQuery] = useState(''), composing = useRef(false);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(programFolderParents(rows, props.lastOpened)));
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [creating, setCreating] = useState(false), [busy, setBusy] = useState(false), title = useRef<HTMLInputElement>(null);
  const shown = useMemo(() => programFolderListRows(rows, { query: many ? query : '', open, expanded, many }), [rows, many, query, open, expanded]);
  const toggle = (id: string) => setOpen(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = title.current?.value.trim() ?? '';
    if (!value || busy) return;
    setBusy(true);
    try { if (await props.onCreate(value)) { setCreating(false); } } finally { setBusy(false); }
  }
  return <nav className={styles.list} aria-label="폴더 목록" data-folder-list>
    {many && <label className={styles.find}><span className={styles.srOnly}>폴더 찾기</span><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></svg>
      <input type="search" placeholder="폴더 찾기" value={draft} data-folder-find
        onCompositionStart={() => { composing.current = true; }}
        onCompositionEnd={event => { composing.current = false; setQuery(event.currentTarget.value); }}
        onChange={event => { setDraft(event.target.value); if (!composing.current && !(event.nativeEvent as InputEvent).isComposing) setQuery(event.target.value); }} /></label>}
    <ul>
      <li className={styles.folderRow}><button type="button" className={styles.folderOpen} data-folder-row="" aria-current={props.current === '' ? 'true' : undefined}
        aria-label={`모든 할 일 · 열린 할 일 ${all}개`} disabled={props.disabled} onClick={() => props.onOpen('')}>
        <ProgramFolderIcon dashed /><span className={styles.folderName} data-all>모든 할 일</span><span className={styles.count}>열린 {all}</span><span className={styles.chevron} aria-hidden="true">›</span></button></li>
      {shown.map(entry => entry.kind === 'more'
        ? <li key={`more:${entry.parentId}`} className={styles.folderRow} style={{ '--folder-depth': entry.depth } as React.CSSProperties}>
          <button type="button" className={styles.moreRow} onClick={() => setExpanded(current => new Set([...current, entry.parentId]))}>하위 {entry.count}개 더 ›</button></li>
        : (({ row, folded }) => <li key={row.id} className={styles.folderRow} data-zero={!row.open || undefined} style={{ '--folder-depth': row.depth } as React.CSSProperties}>
          {many && folded !== null && <button type="button" className={styles.foldToggle} aria-expanded={!folded} aria-label={`${row.title} 하위 ${folded ? '펼치기' : '접기'}`}
            onClick={() => toggle(row.id)}><span aria-hidden="true">{folded ? '▸' : '▾'}</span></button>}
          <button type="button" className={styles.folderOpen} data-folder-row={row.id} aria-current={props.current === row.id ? 'true' : undefined} disabled={props.disabled}
            aria-label={`${row.title} · 열린 할 일 ${row.open}개${folded ? ` · 하위 ${row.children}개` : ''}`} onClick={() => props.onOpen(row.id)}>
            <ProgramFolderIcon muted={!row.open || row.id === PROGRAM_UNFILED_FOLDER} /><span className={styles.folderName} data-unfiled={row.id === PROGRAM_UNFILED_FOLDER || undefined}>{row.title}</span>
            {folded && <small className={styles.subCount}>하위 {row.children}</small>}
            <span className={styles.count}>{row.open || '—'}</span><span className={styles.chevron} aria-hidden="true">›</span></button></li>)(entry))}
      {many && query && !shown.length && <li className={styles.findEmpty}>‘{query}’ 폴더가 없습니다.</li>}
      <li className={styles.folderRow}>{creating
        ? <form className={styles.createForm} onSubmit={create}><label><span className={styles.srOnly}>새 폴더 이름</span><input ref={title} name="title" required maxLength={100} autoFocus placeholder="새 폴더 이름" disabled={busy} /></label>
          <button type="submit" disabled={busy || props.disabled}>{busy ? '만드는 중…' : '만들기'}</button><button type="button" disabled={busy} onClick={() => setCreating(false)}>취소</button></form>
        : <button type="button" className={styles.addRow} data-folder-create disabled={props.disabled} onClick={() => setCreating(true)}>＋ 새 폴더</button>}</li>
    </ul>
  </nav>;
}
