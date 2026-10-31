import type { ProgramData, ProgramPrivateSpace } from './contract';
import { programFailure, programId } from './contract';
import { textWorkspaceModel as M } from './text-workspace';
import { programTextTransition } from './program-text-transition';
import { programDocumentContentLock } from './reference-execution-guard';
import { unlinkProgramCopySeries } from './private-space';
import type { ProgramMutate } from './ui-contract';
import type { AlphaReceipt } from './alpha-persistence/contract';
export type ProgramImportLinks = { actorId: string; copyId: string; documentId: string;
  ordinary: { lineId: string; taskId: string; raw: string }[]; recurring: { lineId: string; itemId: string; raw: string }[] };
/** A newer social read can contain another request's replacement links; never claim their IDs. */
export function programImportReceiptOwnsLinks(receipt: AlphaReceipt | null | undefined, accountRevision: number | undefined, copyId: string) {
  return receipt?.kind === 'social' && receipt.changed && receipt.resultId === copyId && receipt.revision === accountRevision;
}
export function programImportTargets(data: ProgramData, actorId: string, copyDocumentId: string | undefined, pending: readonly string[]) {
  const space = data.spaces[actorId]; if (!space) return [];
  return [...space.text.documents, ...space.text.flows]
    .filter(doc => doc.id !== copyDocumentId && !space.documentTrash?.[doc.id] && !space.archivedDocumentIds.includes(doc.id))
    .map(doc => ({ ...doc, reason: pending.includes(doc.id) ? '입력 중 · 저장한 뒤 고를 수 있습니다'
      : programDocumentContentLock(space, doc.id) !== 'active' ? '읽기 전용 문서' : null }));
}
/** Remember only the links this successful request added, never an entire private snapshot. */
export function captureProgramImportLinks(actorId: string, copyId: string, documentId: string, before: ProgramPrivateSpace, after: ProgramPrivateSpace): ProgramImportLinks {
  const copy = after.copies.find(row => row.id === copyId), doc = M.getDocument(after.text, documentId);
  const old = new Set(before.text.bindings.filter(row => row.kind === 'task' && row.docId === documentId).map(row => row.lineId));
  const oldRefs = new Set(before.copies.find(row => row.id === copyId)?.recurrence?.references?.filter(row => row.documentId === documentId).map(row => row.lineId) ?? []);
  return { actorId, copyId, documentId,
    ordinary: after.text.bindings.flatMap(row => row.kind === 'task' && row.docId === documentId && !old.has(row.lineId)
      && copy && Object.values(copy.itemLines).includes(row.taskId) ? [{ lineId: row.lineId, taskId: row.taskId, raw: doc?.lines.find(line => line.id === row.lineId)?.text ?? '' }] : []),
    recurring: (copy?.recurrence?.references ?? []).filter(row => row.documentId === documentId && !oldRefs.has(row.lineId))
      .map(row => ({ lineId: row.lineId, itemId: row.itemId, raw: doc?.lines.find(line => line.id === row.lineId)?.text ?? '' })) };
}
export function remainingProgramImportLinks(data: ProgramData, batch: ProgramImportLinks) {
  const space = data.spaces[batch.actorId], doc = space && M.getDocument(space.text, batch.documentId), copy = space?.copies.find(row => row.id === batch.copyId);
  return { ordinary: batch.ordinary.filter(row => doc?.lines.some(line => line.id === row.lineId)
      && space?.text.bindings.some(binding => binding.kind === 'task' && binding.docId === batch.documentId && binding.lineId === row.lineId && binding.taskId === row.taskId)),
    recurring: batch.recurring.filter(row => doc?.lines.some(line => line.id === row.lineId)
      && copy?.recurrence?.references?.some(ref => ref.documentId === batch.documentId && ref.lineId === row.lineId && ref.itemId === row.itemId)) };
}
export function unlinkProgramImportLines(data: ProgramData, batch: ProgramImportLinks) {
  const space = data.spaces[batch.actorId];
  if (data.activeActorId !== batch.actorId || !space || programDocumentContentLock(space, batch.documentId) !== 'active') return programFailure<string>(data, 'conflict');
  // A canonical title/check change also changes the linked display text. Identity is the exact
  // document/line/task binding, not its old display bytes; unlink keeps the canonical task/history.
  const rows = remainingProgramImportLinks(data, batch).ordinary;
  let text = space.text;
  for (const row of rows) text = M.unlink(text, batch.documentId, row.lineId);
  return programTextTransition(data, { actorId: batch.actorId, documentId: batch.documentId, expected: space.text, next: text });
}
export function programImportSeriesUndoReady(data: ProgramData, batch: ProgramImportLinks, lineId: string) {
  const expected = batch.recurring.find(row => row.lineId === lineId), space = data.spaces[batch.actorId];
  return data.activeActorId === batch.actorId && !!expected && !!space && programDocumentContentLock(space, batch.documentId) === 'active'
    && remainingProgramImportLinks(data, batch).recurring.some(row => row.lineId === lineId)
    && M.getDocument(space.text, batch.documentId)?.lines.find(row => row.id === lineId)?.text === expected.raw;
}
/** Existing forward commands only. A partial or unknown result retains the same remaining intent. */
export async function cancelProgramImportLinks(input: { batch: ProgramImportLinks; read: () => ProgramData | null; mutate: ProgramMutate;
  pending: () => string[]; isCurrent: () => boolean }) {
  const { batch } = input, total = batch.ordinary.length + batch.recurring.length;
  const remaining = () => { const data = input.read(); if (!data) return total; const rows = remainingProgramImportLinks(data, batch); return rows.ordinary.length + rows.recurring.length; };
  const result = (reason?: string) => ({ total, remaining: remaining(), ...(reason ? { reason } : {}) });
  const ready = () => input.isCurrent() && input.read()?.activeActorId === batch.actorId && !input.pending().includes(batch.documentId);
  if (!ready()) return result('pending-input');
  let live = input.read()!;
  if (remainingProgramImportLinks(live, batch).ordinary.length) {
    const saved = await input.mutate('이번 가져오기 연결 취소', fresh => ready() ? unlinkProgramImportLines(fresh, batch) : programFailure<string>(fresh, 'conflict'), { awaitAutomaticRead: true });
    if (!saved.ok || saved.presentationPending) return result(saved.ok ? 'presentation-pending' : saved.reason);
  }
  for (const row of batch.recurring) {
    if (!ready()) return result('pending-input');
    live = input.read()!;
    if (!remainingProgramImportLinks(live, batch).recurring.some(ref => ref.lineId === row.lineId)) continue;
    const saved = await input.mutate('이번 가져오기 반복 연결 취소', fresh => ready() && programImportSeriesUndoReady(fresh, batch, row.lineId)
      ? unlinkProgramCopySeries(fresh, { actorId: batch.actorId, expectedSpace: fresh.spaces[batch.actorId], requestId: programId('request'), copyId: batch.copyId, documentId: batch.documentId, lineId: row.lineId })
      : programFailure<string>(fresh, 'conflict'), { alphaSocial: { type: 'copy-series-unlink', copyId: batch.copyId, documentId: batch.documentId, lineId: row.lineId }, awaitAutomaticRead: true });
    if (!saved.ok || saved.presentationPending) return result(saved.ok ? 'presentation-pending' : saved.reason);
  }
  return result();
}
