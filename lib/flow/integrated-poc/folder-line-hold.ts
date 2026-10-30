import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

/** Lines a finished "- /name" turned into folder lines without changing their text. While typed they
 * were kept as text (B0), so a replay of the same raw must declare them again to reach `next`. */
export function finishedFolderDeclarations(before: TextWorkspaceState, next: TextWorkspaceState, documentId: string): number[] {
  const source = M.getDocument(before, documentId), submitted = M.getDocument(next, documentId);
  if (!source || !submitted) return [];
  const texts = new Map(source.lines.map(line => [line.id, line.text]));
  return submitted.lines.flatMap((line, index) => /^ *- \//.test(line.text) && texts.get(line.id) === line.text
    && !before.bindings.some(binding => binding.docId === documentId && binding.lineId === line.id)
    && next.bindings.some(binding => binding.kind === 'scope' && binding.docId === documentId && binding.lineId === line.id) ? [index] : []);
}
