'use client';

import { createContext, type ReactNode } from 'react';
import type { ProgramStatus } from '@/lib/flow/integrated-poc/program-status';

/** F11 W-HEIGHT-01/02 (11/11): the one notice line under the editor's tool bar. Its words, at most one main action
 *  (다시 확인, 최신 내용 열기), [복구함 n] when this document has kept input, and [자세히] for the whole explanation (the
 *  host's recovery box content). `close` for a passing notice only. */
export type ProgramAlertLine = { tone: 'warn' | 'info'; text: string; action?: { label: string; run: () => void; disabled?: boolean } | null;
  recoveries?: number; openRecovery?: (opener: HTMLElement) => void; detail?: ReactNode | null; close?: (() => void) | null;
  /** W-VER-02 (11/11): a lower notice said under [자세히] whichever line wins (the editor's own save trouble too). */
  note?: ReactNode | null;
  /** W-VER-04 (11/11): the note holds a newer build; the line's words end '· 새 버전' (a dot when they do not fit). */
  newVersion?: boolean };

/** The host's save status for the open document's editor, so the editor can draw one status slot.
 *  The editor owns the status words and the one live announcement. `recovery` is the host's recovery
 *  box (its actions, such as 다시 확인) whenever one exists, shown whichever status wins; `recoveryBody` is
 *  that box's content alone, for the editor's one box when it has a recovery of its own (W2); `extras` are
 *  notices that always show (recovery panels, the last message). `alert` (F11): when the host gives one, the save
 *  state, this document's kept input and the last message are said there, in one line, instead of `recovery` and
 *  `extras`. No provider: no change. */
export type ProgramServerStatusView = ProgramStatus & { recovery: ReactNode | null; recoveryBody: ReactNode | null; extras: ReactNode | null;
  alert?: ProgramAlertLine | null };
export const ProgramServerStatusContext = createContext<ProgramServerStatusView | null>(null);
