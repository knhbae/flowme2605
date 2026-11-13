'use client';

import React from 'react';
import type { ProgramDueSoonTask } from '@/lib/flow/integrated-poc/due-soon';
import styles from './ProgramDueSoon.module.css';

export function ProgramDueSoon(props: { rows: readonly ProgramDueSoonTask[]; waiting: string | null;
  onOpen(task: ProgramDueSoonTask['task'], owner: HTMLButtonElement): void }) {
  if (!props.rows.length) return null;
  return <section className={styles.group} aria-labelledby="program-due-soon-title" data-due-soon>
    <h2 id="program-due-soon-title">마감 다가오는 일 <small>{props.rows.length}개</small></h2>
    <ul>{props.rows.map(({ task, deadline }) => <li key={JSON.stringify([task.docId, task.id])} data-due-task={task.id}>
      <button type="button" aria-label={`${task.title} · ${deadline.label} · ${task.docTitle} 원문 열기`}
        aria-busy={props.waiting === task.id || undefined} onClick={event => props.onOpen(task, event.currentTarget)}>
        <span>{task.title}</span><small><span data-due-state={deadline.state}>{deadline.label}</span> · {task.docTitle}{props.waiting === task.id ? ' · 원문 여는 중…' : ''}</small>
      </button>
    </li>)}</ul>
  </section>;
}
