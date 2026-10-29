'use client';

import { createContext, type ReactNode } from 'react';
import type { ProgramStatus } from '@/lib/flow/integrated-poc/program-status';

/** The host's save status for the open document's editor, so the editor can draw one status slot.
 *  `main` is the host's own status node (its recovery box included) for when the host's status wins;
 *  `extras` are notices that always show (recovery panels, the last message). No provider: no change. */
export type ProgramServerStatusView = ProgramStatus & { main: ReactNode; extras: ReactNode | null };
export const ProgramServerStatusContext = createContext<ProgramServerStatusView | null>(null);
