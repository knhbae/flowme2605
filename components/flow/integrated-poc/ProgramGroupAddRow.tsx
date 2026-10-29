'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createGroupAddEntry, type GroupAddAction } from '@/lib/flow/integrated-poc/group-add-entry';
import styles from './ProgramSpace.module.css';

/** The input line a day heading's "＋" opens at the top of that day. Saving goes through the
 * host's existing quick add; this line only collects a title and an optional time. */
export function ProgramGroupAddRow(props: { date: string; dayLabel: string; inputRef: React.MutableRefObject<HTMLInputElement | null>;
  onAdd: (title: string, time: string) => Promise<boolean>; onClose: () => void }) {
  const [entry] = useState(createGroupAddEntry);
  const [time, setTime] = useState<string | null>(null), [saving, setSaving] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const field = props.inputRef.current;
    field?.focus({ preventScroll: true }); field?.scrollIntoView({ block: 'nearest' });
    return () => { mounted.current = false; };
  }, []);
  async function act(action: GroupAddAction) {
    if (action === 'close') { props.onClose(); return; }
    if (action !== 'add') return;
    const field = props.inputRef.current;
    setSaving(true);
    try {
      if (field && await props.onAdd(field.value.trim(), time ?? '') && mounted.current) { field.value = ''; setTime(null); field.focus({ preventScroll: true }); }
    } finally { entry.settled(); if (mounted.current) setSaving(false); }
  }
  const [month, day] = props.date.slice(5).split('-').map(Number);
  return <li className={styles.groupAdd}>
    <form onSubmit={event => { event.preventDefault(); void act(entry.submit(props.inputRef.current?.value ?? '')); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) void act(entry.leave(props.inputRef.current?.value ?? '')); }}>
      <input ref={props.inputRef} name="title" aria-label={`${props.dayLabel}에 추가할 할 일`} placeholder="할 일" maxLength={500} autoComplete="off" enterKeyHint="done"
        onCompositionStart={() => entry.compositionStart()} onCompositionEnd={() => entry.compositionEnd()}
        onKeyDown={event => {
          // Leave a composing key to the IME; the Enter after it is the one that adds.
          if (event.nativeEvent.isComposing) return;
          if (event.key === 'Enter') { event.preventDefault(); void act(entry.submit(event.currentTarget.value)); }
          else if (event.key === 'Escape') { event.preventDefault(); void act(entry.escape()); }
        }} />
      <span className={styles.dayChip} aria-hidden="true">{month}/{day}</span>
      {time === null
        ? <button type="button" className={styles.timeChip} onClick={() => setTime('')}>시간</button>
        : <input autoFocus type="time" step={60} className={styles.timeChip} aria-label="시간" value={time} onChange={event => setTime(event.target.value)}
          onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); setTime(null); props.inputRef.current?.focus(); } }} />}
      <button type="submit" disabled={saving}>추가</button>
    </form>
  </li>;
}
