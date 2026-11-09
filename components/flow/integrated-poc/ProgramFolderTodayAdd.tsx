'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createGroupAddEntry, type GroupAddAction } from '@/lib/flow/integrated-poc/group-add-entry';
import { createPressAwareClose } from '@/lib/flow/integrated-poc/press-aware-close';
import { PROGRAM_FOLDER_TODAY_TITLE_MAX } from '@/lib/flow/integrated-poc/folder-today-add';
import styles from './ProgramFolderScreen.module.css';

/** F4-b (11/9, 목업 A5): the folder screen's '＋ 오늘 할 일', at the end of [할 일]'s 오늘 (or in its empty state), the shape
 *  of 쓰기's '오늘 쓰기' line. Pressed, it becomes one line field with the place it writes into under it; Enter or [적기]
 *  writes the line and keeps the field for the next one; an empty Enter, Esc or leaving an empty field closes it. A
 *  Korean composition's Enter never writes, and a second Enter while one saves is ignored (the day ＋'s rules). Saving
 *  belongs to the host, one save per line. */
export function ProgramFolderTodayAdd(props: { open: boolean; place: string; warn?: string | null; disabled?: boolean;
  onOpen: () => void; onAdd: (title: string) => Promise<boolean>; onClose: () => void }) {
  if (!props.open) return <button type="button" className={styles.todayAdd} data-folder-today-add disabled={props.disabled}
    onClick={props.onOpen}><span aria-hidden="true">＋</span>오늘 할 일</button>;
  return <TodayField {...props} />;
}

function TodayField(props: { place: string; warn?: string | null; onAdd: (title: string) => Promise<boolean>; onClose: () => void }) {
  const [entry] = useState(createGroupAddEntry), [saving, setSaving] = useState(false);
  const field = useRef<HTMLInputElement>(null), form = useRef<HTMLFormElement>(null), mounted = useRef(true), focusCount = useRef(0);
  // As the day ＋: a blur close waits for the press elsewhere to end (the rows below must not move under it).
  const blurClose = useRef<ReturnType<typeof createPressAwareClose> | null>(null);
  useEffect(() => { const closer = createPressAwareClose(window); blurClose.current = closer; return closer.attach(); }, []);
  useEffect(() => {
    mounted.current = true;
    field.current?.focus({ preventScroll: true }); field.current?.scrollIntoView({ block: 'nearest' });
    return () => { mounted.current = false; };
  }, []);
  function closeAfterPress() {
    const at = focusCount.current;
    blurClose.current?.request(() => mounted.current && focusCount.current === at && !form.current?.contains(document.activeElement)
      && !field.current?.value.trim(), props.onClose);
  }
  async function act(action: GroupAddAction, fromBlur = false) {
    if (action === 'close') { if (fromBlur) closeAfterPress(); else props.onClose(); return; }
    if (action !== 'add') return;
    const input = field.current, mark = entry.mark();
    setSaving(true);
    try {
      // Clear only what was written: words typed while it saved stay for the next line.
      if (input && await props.onAdd(input.value.trim()) && mounted.current && entry.unchangedSince(mark)) {
        input.value = '';
        const active = document.activeElement;
        if (!active || active === document.body || form.current?.contains(active)) input.focus({ preventScroll: true });
      }
    } finally { entry.settled(); if (mounted.current) setSaving(false); }
  }
  return <>
    <form ref={form} className={styles.todayField} data-folder-today-field onFocus={() => { focusCount.current++; }}
      onSubmit={event => { event.preventDefault(); void act(entry.submit(field.current?.value ?? '')); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) void act(entry.leave(field.current?.value ?? ''), true); }}>
      <span className={styles.todayBox} aria-hidden="true" />
      <input ref={field} name="title" aria-label="오늘 할 일" aria-describedby="program-folder-today-place" placeholder="오늘 할 일" maxLength={PROGRAM_FOLDER_TODAY_TITLE_MAX}
        autoComplete="off" enterKeyHint="done"
        onInput={event => { entry.edited(); entry.keySeen((event.nativeEvent as InputEvent).isComposing); }}
        onCompositionStart={() => entry.compositionStart()} onCompositionEnd={() => entry.compositionEnd()} onBlur={() => entry.compositionEnd()}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return;
          if (event.keyCode !== 229) entry.keySeen(false);
          if (event.key === 'Enter') { event.preventDefault(); void act(entry.submit(event.currentTarget.value)); }
          else if (event.key === 'Escape') { event.preventDefault(); void act(entry.escape()); }
        }} />
      <button type="submit" disabled={saving} aria-busy={saving || undefined}>적기</button>
    </form>
    <p id="program-folder-today-place" className={styles.todayPlace} data-folder-today-place data-warn={props.warn ? true : undefined}
      role={props.warn ? 'alert' : undefined}>{props.warn ?? props.place}</p>
  </>;
}
