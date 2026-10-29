'use client';

import { createContext, type ReactNode } from 'react';
import type { ProgramStatus } from '@/lib/flow/integrated-poc/program-status';

/** The host's save status for the open document's editor, so the editor can draw one status slot.
 *  The editor owns the status words and the one live announcement. `recovery` is the host's recovery
 *  box (its actions, such as 다시 확인) whenever one exists, shown whichever status wins; `extras` are
 *  notices that always show (recovery panels, the last message). No provider: no change. */
export type ProgramServerStatusView = ProgramStatus & { recovery: ReactNode | null; extras: ReactNode | null };
export const ProgramServerStatusContext = createContext<ProgramServerStatusView | null>(null);
