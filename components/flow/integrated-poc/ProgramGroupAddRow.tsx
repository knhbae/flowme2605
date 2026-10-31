'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createGroupAddEntry, type GroupAddAction } from '@/lib/flow/integrated-poc/group-add-entry';
import { createPressAwareClose } from '@/lib/flow/integrated-poc/press-aware-close';
import styles from './ProgramSpace.module.css';

/** The input line a day heading's "＋" opens at the top of that day. Saving goes through the
 * host's existing quick add; this line only collects a title and an optional time. */
export function ProgramGroupAddRow(props: { date: string; dayLabel: string; inputRef: React.MutableRefObject<HTMLInputElement | null>;
  onAdd: (title: string, time: string) => Promise<boolean>; onClose: () => void }) {
  const [entry] = useState(createGroupAddEntry);
  const [time, setTime] = useState<string | null>(null), [saving, setSaving] = useState(false);
  const mounted = useRef(true), formRef = useRef<HTMLFormElement>(null), focusCount = useRef(0);
  // A press elsewhere blurs the empty line before the press ends. Closing it then removes this row while the
  // pointer is down, the rows below can move under it, and the press's click lands elsewhere (a new row's 원문
  // lost its first press). A blur close waits for the press to end and for its click, then runs only if the
  // line was not focused again meanwhile (the same day's ＋ pressed again focuses it).
  const blurClose = useRef<ReturnType<typeof createPressAwareClose> | null>(null);
  useEffect(() => { const closer = createPressAwareClose(window); blurClose.current = closer; return closer.attach(); }, []);
  function closeAfterPress() {
    const at = focusCount.current;
    blurClose.current?.request(() => mounted.current && focusCount.current === at && !formRef.current?.contains(document.activeElement)
      && !props.inputRef.current?.value.trim(), props.onClose);
  }
  useEffect(() => {
    mounted.current = true;
    const field = props.inputRef.current;
    field?.focus({ preventScroll: true }); field?.scrollIntoView({ block: 'nearest' });
    return () => { mounted.current = false; };
  }, []);
  async function act(action: GroupAddAction, fromBlur = false) {
    if (action === 'close') { if (fromBlur) closeAfterPress(); else props.onClose(); return; }
    if (action !== 'add') return;
    const field = props.inputRef.current, form = field?.form, mark = entry.mark();
    setSaving(true);
    try {
      // Clear only what was submitted: a title or time written while the add was saving stays.
      if (field && await props.onAdd(field.value.trim(), time ?? '') && mounted.current && entry.unchangedSince(mark)) {
        field.value = ''; setTime(null);
        const active = document.activeElement;
        if (!active || active === document.body || form?.contains(active)) field.focus({ preventScroll: true });
      }
    } finally { entry.settled(); if (mounted.current) setSaving(false); }
  }
  const [month, day] = props.date.slice(5).split('-').map(Number);
  return <li className={styles.groupAdd}>
    <form ref={formRef} onFocus={() => { focusCount.current++; }} onSubmit={event => { event.preventDefault(); void act(entry.submit(props.inputRef.current?.value ?? '')); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) void act(entry.leave(props.inputRef.current?.value ?? ''), true); }}>
      <input ref={props.inputRef} name="title" aria-label={`${props.dayLabel}에 추가할 할 일`} placeholder="할 일" maxLength={500} autoComplete="off" enterKeyHint="done"
        onInput={event => { entry.edited(); entry.keySeen((event.nativeEvent as InputEvent).isComposing); }} onCompositionStart={() => entry.compositionStart()} onCompositionEnd={() => entry.compositionEnd()}
        onBlur={() => entry.compositionEnd()}
        onKeyDown={event => {
          // Leave a composing key to the IME; the Enter after it is the one that adds. A key that is not composing
          // also ends a composition whose end event never came (C5 re-review 2).
          if (event.nativeEvent.isComposing) return;
          if (event.keyCode !== 229) entry.keySeen(false);
          if (event.key === 'Enter') { event.preventDefault(); void act(entry.submit(event.currentTarget.value)); }
          else if (event.key === 'Escape') { event.preventDefault(); void act(entry.escape()); }
        }} />
      <span className={styles.dayChip} aria-hidden="true">{month}/{day}</span>
      {time === null
        ? <button type="button" className={styles.timeChip} onClick={() => { entry.edited(); setTime(''); }}>시간</button>
        : <input autoFocus type="time" step={60} className={styles.timeChip} aria-label="시간" value={time} onChange={event => { entry.edited(); setTime(event.target.value); }}
          onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); entry.edited(); setTime(null); props.inputRef.current?.focus(); } }} />}
      <button type="submit" disabled={saving}>추가</button>
    </form>
  </li>;
}
