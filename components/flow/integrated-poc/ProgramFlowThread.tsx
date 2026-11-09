import React from 'react';
import styles from './ProgramFlowThread.module.css';
import { programThreadLayout } from '@/lib/flow/integrated-poc/flow-thread';

/** F6-B2 (11/9, 방향 B): the Flow 실 — dots on one line, spaced by the days between a Flow's items; the filled dots are
 *  done, the ringed one is next. Teal (flow) only, as the Flow's name and count beside it. Decorative: the words beside it
 *  (the name, n/m) carry the meaning. */
export function ProgramFlowThread({ points, done, width = 48, maxWidth, tone }: { points: readonly number[]; done: number; width?: number; maxWidth?: number; tone?: 'on-navy' }) {
  if (!points.length) return null;
  const layout = programThreadLayout(points, width, maxWidth);
  const reach = done >= points.length ? layout.width : layout.xs[Math.max(0, done)];
  return <span className={styles.thread} style={{ width: layout.width }} data-flow-thread data-tone={tone} aria-hidden="true">
    <i className={styles.line} /><i className={styles.fill} style={{ width: reach }} />
    {layout.xs.map((x, index) => <b key={index} data-dot={index < done ? 'done' : index === done ? 'next' : 'todo'} style={{ left: x }} />)}
  </span>;
}
