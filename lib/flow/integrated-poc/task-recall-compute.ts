import type { ProgramPrivateSpace } from './contract';
import type { ProgramRecallCandidate } from './task-recall';

export type ProgramRecallSource = { ownerId: string; space: ProgramPrivateSpace; today: string };
type WorkerPort = Pick<Worker, 'postMessage' | 'terminate' | 'addEventListener'>;
/** One saved snapshot, no query text or per-key posts. Late replies cannot cross owners or saved generations. */
export function createProgramRecallComputer(factory: () => WorkerPort = () => new Worker(new URL('./task-recall.worker.ts', import.meta.url), { type: 'module' })) {
  let worker: WorkerPort | null = null, generation = 0, closed = false;
  const waiting = new Map<number, { ownerId: string; resolve: (rows: readonly ProgramRecallCandidate[]) => void }>();
  function clear() { for (const pending of waiting.values()) pending.resolve([]); waiting.clear(); }
  return {
    run(source: ProgramRecallSource): Promise<readonly ProgramRecallCandidate[]> {
      if (closed) return Promise.resolve([]);
      clear(); const serial = ++generation;
      return new Promise(resolve => {
        try {
          if (!worker) {
            const own = factory(); worker = own;
            own.addEventListener('message', (event: MessageEvent) => {
              if (closed || worker !== own) return;
              const result = event.data, pending = waiting.get(result?.generation);
              if (!pending || result.generation !== generation || result.ownerId !== pending.ownerId) return;
              waiting.delete(result.generation);
              resolveRows(pending.resolve, result.rows);
            });
            const failed = () => { if (worker === own) { own.terminate(); worker = null; clear(); } };
            own.addEventListener('error', failed); own.addEventListener('messageerror', failed);
          }
          waiting.set(serial, { ownerId: source.ownerId, resolve });
          // Only the subset the index reads is cloned, not drafts/publications/recovery payloads.
          const { text, archivedDocumentIds, documentTrash, copies, savedBindings, personalAuthoring, recurrenceExecution, creatorWorkspace, creatorDraftImports, legacySnapshot } = source.space;
          worker.postMessage({ generation: serial, ownerId: source.ownerId, today: source.today,
            space: { text, archivedDocumentIds, documentTrash, copies, savedBindings, personalAuthoring, recurrenceExecution, creatorWorkspace, creatorDraftImports, legacySnapshot } });
        } catch { waiting.delete(serial); resolve([]); }
      });
    },
    cancel() { generation++; clear(); },
    dispose() { closed = true; generation++; clear(); worker?.terminate(); worker = null; },
  };
}
function resolveRows(resolve: (rows: readonly ProgramRecallCandidate[]) => void, rows: unknown) {
  if (!Array.isArray(rows) || rows.length > 50000 || rows.some(row => !row || typeof row.lineId !== 'string' || typeof row.documentId !== 'string'
    || typeof row.title !== 'string' || typeof row.proof !== 'string' || typeof row.key !== 'string' || typeof row.match !== 'string'
    || typeof row.folder !== 'string' || typeof row.done !== 'boolean' || !Number.isInteger(row.percent) || row.percent < 0 || row.percent > 100)) { resolve([]); return; }
  resolve(rows.map(row => Object.freeze(row)));
}
