import { createProgramRecallIndex } from './task-recall';
import type { ProgramPrivateSpace } from './contract';

/** A local read-only worker. It has no network, persistence, mutation commands or access to editor input. */
const scope = self as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage: (value: unknown) => void };
scope.onmessage = event => {
  const { generation, ownerId, today, space } = event.data ?? {};
  if (!Number.isSafeInteger(generation) || typeof ownerId !== 'string' || typeof today !== 'string' || !space) return;
  try { scope.postMessage({ generation, ownerId, rows: createProgramRecallIndex(space as ProgramPrivateSpace, today) }); }
  catch { scope.postMessage({ generation, ownerId, rows: [] }); }
};
