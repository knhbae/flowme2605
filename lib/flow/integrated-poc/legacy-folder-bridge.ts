import { programFailure, type ProgramData, type ProgramPrivateSpace } from './contract';
import { validateProgramData } from './program-data';
import { setProgramDocumentFolder } from './private-space';
import { programLegacyIdentity } from './legacy-projection';
import { textWorkspaceModel as M } from './text-workspace';

/** Presentation IDs are canonical Program IDs, never shallow shadow folder IDs. */
export function programLegacyFolders(space: ProgramPrivateSpace) {
  const folders = space.text.folders.map(folder => {
    const names = [folder.title], seen = new Set([folder.id]); let parent = folder.parentId;
    while (parent && !seen.has(parent)) {
      seen.add(parent); const row = space.text.folders.find(entry => entry.id === parent);
      if (!row) break; names.unshift(row.title); parent = row.parentId;
    }
    return { ...folder, path: names.join(' / '), depth: names.length - 1 };
  });
  const byFlow = Object.fromEntries(space.savedBindings.flatMap(binding => {
    const doc = M.getDocument(space.text, binding.documentId);
    return doc ? [[binding.flowRef, { documentId: doc.id, folderId: doc.folderId, title: doc.title,
      path: folders.find(folder => folder.id === doc.folderId)?.path ?? '연결할 수 없는 폴더', archived: space.archivedDocumentIds.includes(doc.id) }]] : [];
  }));
  const tasks = new Map(M.tasks(space.text).map(task => [task.id, task]));
  const byItem = Object.fromEntries([...space.savedBindings.flatMap(binding => Object.entries(binding.itemLines)), ...Object.entries(space.legacyQuickItemLines)].flatMap(([ref, id]) => {
    const task = tasks.get(id); return task ? [[ref, { folderId: task.folderId, scopeId: task.scopeId,
      path: folders.find(folder => folder.id === task.folderId)?.path ?? task.folder }]] : [];
  }));
  return { folders, byFlow, byItem };
}
export type ProgramLegacyFolders = ReturnType<typeof programLegacyFolders>;

/** Folder-only updates use the exact same target/transition as ProgramSpace.
 * No legacy snapshot, source model, candidate or legacy folder tree is rewritten. */
export function setProgramLegacyFlowFolder(data: ProgramData, input: {
  actorId: string; expectedToken: string; flowRef: string; folderId: string; requestId: string;
}) {
  if (!validateProgramData(data)) return programFailure(data, 'invalid');
  if (data.activeActorId !== input.actorId || !data.spaces[input.actorId]) return programFailure(data, 'forbidden');
  const space = data.spaces[input.actorId];
  if (JSON.stringify(space) !== input.expectedToken) return programFailure(data, 'conflict');
  const binding = space.savedBindings.find(row => row.flowRef === input.flowRef);
  if (!binding || space.archivedDocumentIds.includes(binding.documentId)) return programFailure(data, 'missing');
  return setProgramDocumentFolder(data, { actorId: input.actorId, expectedSpace: space, requestId: input.requestId,
    documentId: binding.documentId, folderId: input.folderId });
}
export function programFolderIdFromLegacy(space: ProgramPrivateSpace, legacyId: string | undefined): string | null {
  if (!legacyId) return 'folder-unfiled';
  if (!space.legacySnapshot) return null;
  const id = programLegacyIdentity('folder', space.legacySnapshot.workspaceId, legacyId);
  return space.text.folders.some(folder => folder.id === id) ? id : null;
}
