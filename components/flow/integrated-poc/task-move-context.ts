'use client';
import { createContext } from 'react';
import type { TaskMoveAvailability } from './ProgramTaskMoveSheet';

/** Only movement asks this host-owned capability for current save authority. */
export const ProgramTaskMoveContext = createContext<{ read: () => Omit<TaskMoveAvailability,'confirm'>; confirm: () => void } | null>(null);
