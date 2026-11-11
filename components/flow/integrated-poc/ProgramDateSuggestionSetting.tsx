'use client';

import { useEffect, useState } from 'react';
import { TASK_DATE_SUGGESTION_EVENT, TASK_DATE_SUGGESTION_KEY, taskDateSuggestionsEnabled } from '@/lib/flow/integrated-poc/task-date-suggestion';
import styles from './ProgramDateSuggestionSetting.module.css';

export function ProgramDateSuggestionSetting() {
  const [enabled, setEnabled] = useState(true), [failed, setFailed] = useState(false);
  useEffect(() => { setEnabled(taskDateSuggestionsEnabled()); }, []);
  return <><label className={styles.setting}><input type="checkbox" checked={enabled} onChange={event => {
    const next = event.currentTarget.checked;
    try {
      localStorage.setItem(TASK_DATE_SUGGESTION_KEY, next ? 'on' : 'off');
      setEnabled(next); setFailed(false); window.dispatchEvent(new Event(TASK_DATE_SUGGESTION_EVENT));
    } catch { setFailed(true); }
  }} /> 날짜 말 제안</label>{failed && <p role="status">설정을 저장하지 못했습니다. 다시 눌러 주세요.</p>}</>;
}
