import { canonicalJson } from './alpha-persistence/json';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

const FOLDER_LINE = /^ *- \/(?!.*<!--\s*flowme-folder)/;

/** Where a caret goes when line `index` of `raw` is replaced by `line` (a folder line's name put back):
 * before the line it stays, after it moves by the length change, and inside the name (past "- /") it goes
 * to the new line's end, so an Enter that finished the line opens the next line. */
/** Whether an indent over lines `startLine`..`endLine` of the document would move a linked folder line. */
export function indentTouchesLinkedFolder(state: TextWorkspaceState, documentId: string, startLine: number, endLine: number): boolean {
  const lines = M.getDocument(state, documentId)?.lines ?? [];
  return lines.slice(Math.max(0, startLine), endLine + 1).some(line => state.bindings.some(binding => binding.kind === 'scope'
    && binding.docId === documentId && binding.lineId === line.id && state.folders.some(folder => folder.id === binding.scopeId)));
}

/** N5 phone (D11 보강): whether a text edit replacing `start`..`end` of the document's RAW with `insert` would change a
 *  linked folder line's indentation or join it to the line above (⌫ at its start or in its spaces, Delete at the end
 *  of the line above, spaces or letters typed before its "- /"). Editing its name after "- /", an Enter at its very
 *  start and deleting the whole line are not that. */
export function textEditTouchesLinkedFolderIndent(state: TextWorkspaceState, documentId: string, start: number, end: number, insert: string): boolean {
  const lines = M.getDocument(state, documentId)?.lines ?? [];
  let offset = 0;
  return lines.some((line, index) => {
    const at = offset; offset += line.text.length + 1;
    if (!state.bindings.some(binding => binding.kind === 'scope' && binding.docId === documentId && binding.lineId === line.id
      && state.folders.some(folder => folder.id === binding.scopeId))) return false;
    const spaces = /^ */.exec(line.text)![0].length;
    if (end > start) return start <= at && end >= at + line.text.length ? false : start < at + spaces && end > at - (index ? 1 : 0);
    return start >= at && start <= at + spaces && !(start === at && insert.endsWith('\n'));
  });
}

export function restoredLineOffset(raw: string, index: number, line: string, offset: number): number {
  const lines = raw.split('\n'), old = lines[index] ?? '', start = lines.slice(0, index).join('\n').length + (index ? 1 : 0);
  if (offset < start) return offset;
  if (offset > start + old.length) return offset + line.length - old.length;
  const name = old.indexOf('- /') + 3, column = offset - start;
  return start + (name > 2 && column < name ? column : line.length);
}
const bound = (state: TextWorkspaceState, documentId: string, lineId: string, scope = false) =>
  state.bindings.some(binding => binding.docId === documentId && binding.lineId === lineId && (!scope || binding.kind === 'scope'));

/** Lines a finished "- /name" turned into folder lines without changing their text. While typed they
 * were kept as text (B0), so a replay of the same raw must declare them again to reach `next`. */
export function finishedFolderDeclarations(before: TextWorkspaceState, next: TextWorkspaceState, documentId: string): number[] {
  const source = M.getDocument(before, documentId), submitted = M.getDocument(next, documentId);
  if (!source || !submitted) return [];
  const texts = new Map(source.lines.map(line => [line.id, line.text]));
  return submitted.lines.flatMap((line, index) => /^ *- \//.test(line.text) && texts.get(line.id) === line.text
    && !bound(before, documentId, line.id) && bound(next, documentId, line.id, true) ? [index] : []);
}

/** New or edited "- /name" lines still being typed: unlinked text in `next`, which a replay must hold. */
export function heldFolderLines(before: TextWorkspaceState, next: TextWorkspaceState, documentId: string): number[] {
  const source = M.getDocument(before, documentId), submitted = M.getDocument(next, documentId);
  if (!submitted) return [];
  const texts = new Map((source?.lines ?? []).map(line => [line.id, line.text]));
  return submitted.lines.flatMap((line, index) => FOLDER_LINE.test(line.text) && texts.get(line.id) !== line.text
    && !bound(next, documentId, line.id) ? [index] : []);
}

/** The editTextResult options that replay a B0 edit of `documentId` from `before` to `next`. */
export const folderReplay = (before: TextWorkspaceState, next: TextWorkspaceState, documentId: string) =>
  ({ folderDeclare: finishedFolderDeclarations(before, next, documentId), folderHold: heldFolderLines(before, next, documentId) });

/** True when `next` differs from `before` only by finishing held "- /name" lines of `documentId` with the
 * same raw: the model's own declaration, its new folders paired by order, every other value unchanged. */
export function folderDeclarationOnly(before: TextWorkspaceState, next: TextWorkspaceState, documentId: string): boolean {
  try {
    const declared = finishedFolderDeclarations(before, next, documentId), source = M.getDocument(before, documentId);
    if (!declared.length || !source) return false;
    const replay = M.editTextResult(before, documentId, M.raw(source), { folderText: true, folderDeclare: declared });
    if (replay.reason !== null) return false;
    const known = new Set(before.folders.map(folder => folder.id));
    const made = replay.state.folders.filter(folder => !known.has(folder.id)).map(folder => folder.id);
    const kept = next.folders.filter(folder => !known.has(folder.id)).map(folder => folder.id);
    if (made.length !== kept.length) return false;
    const id = new Map(made.map((value, index) => [value, kept[index]]));
    const aligned: TextWorkspaceState = { ...replay.state,
      folders: replay.state.folders.map(folder => ({ ...folder, id: id.get(folder.id) ?? folder.id,
        parentId: folder.parentId === null ? null : id.get(folder.parentId) ?? folder.parentId })),
      bindings: replay.state.bindings.map(binding => binding.kind === 'scope' ? { ...binding, scopeId: id.get(binding.scopeId) ?? binding.scopeId } : binding) };
    return canonicalJson(aligned) === canonicalJson(next);
  } catch { return false; }
}
