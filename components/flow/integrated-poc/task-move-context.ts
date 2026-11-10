'use client';
import { createContext } from 'react';
import type { TaskMoveAvailability } from './ProgramTaskMoveSheet';
import type { TextWorkspaceState } from '@/lib/flow/integrated-poc/text-workspace';
export type TaskScheduleUndo = { text: TextWorkspaceState; undo: () => Promise<boolean> };

/** Only movement asks this host-owned capability for current save authority. */
export const ProgramTaskMoveContext = createContext<{ read: () => Omit<TaskMoveAvailability,'confirm'>; confirm: () => void;
  /** Captures only the next acknowledged private date write, then one exact host undo. */
  beginScheduleUndo?: () => (() => TaskScheduleUndo | null) | null } | null>(null);
