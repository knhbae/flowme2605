import type { ProgramEditorDraft } from './document-action';

/** Text typed into a memo / child-task panel that has not been confirmed into the body yet. */
export type ProgramChildDraft = { kind: 'memo' | 'task'; parentTitle: string; text: string };

/** Read the editor's in-memory panel drafts, keyed `${parentId}:${kind}`. Confirmed children
 * are deleted from that record by the editor, so they are never read here twice. */
export function readChildDrafts(drafts: Readonly<Record<string, string>>, tasks: readonly { id: string; title: string }[]): ProgramChildDraft[] {
  return Object.entries(drafts).flatMap(([key, text]) => {
    const split = key.lastIndexOf(':'), kind = key.slice(split + 1);
    if (split < 0 || !text.trim() || (kind !== 'memo' && kind !== 'task')) return [];
    const parentId = key.slice(0, split);
    return [{ kind, parentTitle: tasks.find(task => task.id === parentId)?.title ?? '지워진 항목', text }];
  });
}

/** UI-recovery entries for panel drafts. No documentId: they are not a document body,
 * and recovery always copies or opens them as a new document. */
export function childDraftRecoveryEntries(drafts: readonly ProgramChildDraft[]): ProgramEditorDraft[] {
  return drafts.map(draft => ({ title: `‘${draft.parentTitle}’ 아래 ${draft.kind === 'memo' ? '메모' : '하위 할 일'} 초안`, raw: draft.text }));
}
