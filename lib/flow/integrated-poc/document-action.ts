import type { ProgramData, ProgramPublicationDraft, ProgramParticipationDraft } from './contract';
import type { ProgramCreatorWorking } from './creator-workspace-contract';
import type { ProgramProposalReviewDraft } from './review-drafts';

/** Flush the actual editor draft before opening an action based on committed text. */
export async function prepareProgramDocumentAction(input: {
  dirty: () => boolean;
  save?: () => Promise<boolean>;
  stillSelected: () => boolean;
}): Promise<'ready' | 'save-failed' | 'cancelled'> {
  if (!input.stillSelected()) return 'cancelled';
  if (input.dirty()) {
    try { if (!input.save || !await input.save()) return 'save-failed'; }
    catch { return 'save-failed'; }
  }
  if (!input.stillSelected()) return 'cancelled';
  return input.dirty() ? 'save-failed' : 'ready';
}

export type ProgramEditorDraft = { title: string; raw: string; documentId?: string };
export type ProgramEditorSocialDraft =
  | { kind: 'publication'; value: ProgramPublicationDraft }
  | { kind: 'participation'; value: ProgramParticipationDraft }
  | { kind: 'review'; value: { proposalId: string; draft: ProgramProposalReviewDraft } };
export type ProgramEditorFlush = {
  flushAll: () => Promise<boolean>; lockInput: () => () => void;
  hasPendingInput?: () => boolean;
  pendingDocumentIds?: () => string[];
  captureDrafts?: () => ProgramEditorDraft[];
  /** Explicit private social drafts; never restore these as personal raw documents. */
  captureSocialDrafts?: () => ProgramEditorSocialDraft[];
  /** Advance only an exact confirmed private draft after a lost response; never replace input. */
  acceptConfirmedSocialDrafts?: (data: ProgramData) => boolean;
  /** Full creator context, separate from text-only personal-document recovery. */
  captureCreatorWorking?: () => ProgramCreatorWorking | null;
  /** Acknowledge an exact full working match after a lost response, never replace local input. */
  acceptConfirmedCreatorWorking?: (working: ProgramCreatorWorking | null) => boolean;
  /** Non-document editors can protect their own persisted draft on external changes. */
  blocksExternalSnapshot?: (before: ProgramData, next: ProgramData) => boolean;
};
/** External storage may change ownership or remove a mounted editor. Never let
 * that unmount an unsaved draft, including native composition still in the DOM. */
export function programInputBlocksSnapshot(before: ProgramData, next: ProgramData, editors: readonly (ProgramEditorFlush | null)[], external = false): boolean {
  const pending = editors.filter(editor => editor?.hasPendingInput?.());
  if (!pending.length) return false;
  if (before.activeActorId !== next.activeActorId) return true;
  if (external && pending.some(editor => editor?.blocksExternalSnapshot?.(before, next))) return true;
  const space = next.spaces[before.activeActorId];
  if (!space) return true;
  const available = new Set([...space.text.documents, ...space.text.flows].filter(doc => !space.archivedDocumentIds.includes(doc.id)).map(doc => doc.id));
  return pending.some(editor => editor?.pendingDocumentIds?.().some(id => !available.has(id)));
}
/** Lock synchronously before awaiting a save or Web Lock. Saving remains allowed. */
export async function withProgramEditorLock<T>(editors: ProgramEditorFlush | null, action: () => Promise<T>): Promise<T> {
  const release = editors?.lockInput();
  try { return await action(); } finally { release?.(); }
}
/** Includes mounted editors hidden behind another document or period view. */
export async function flushProgramEditorCollection(
  editors: () => { dirty: () => boolean; save?: () => Promise<boolean> }[],
): Promise<boolean> {
  for (const editor of editors()) {
    if (await prepareProgramDocumentAction({ ...editor, stillSelected: () => true }) !== 'ready') return false;
  }
  return editors().every(editor => !editor.dirty());
}
