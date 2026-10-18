import { programClone, programId, type ProgramPrivateSpace } from './contract';
import { programSame } from './controller';
import { textWorkspaceModel as M, type TextBinding, type TextFolder, type TextLine, type TextTask, type TextWorkspaceState } from './text-workspace';
import { programDocumentContentLock, programReferenceExecutionAccess } from './reference-execution-guard';
import { programSeriesMetadata } from './recurrence-target';
import { programLegacyTaskQualityHold } from './legacy-map-review';
import { programLegacyPlanTaskExcluded } from './program-legacy-plan-target';

export interface ProgramFolderCopyPreview {
  docId: string; lineId: string; folderId: string; title: string; depth: number;
  lines: TextLine[]; bindings: TextBinding[]; folders: TextFolder[]; items: TextTask[];
  taskScopes: Record<string, string>; itemScopes: Record<string, string>;
}
export type ProgramFolderCopyResult =
  | { ok: true; workspace: TextWorkspaceState; documentId: string; folderId: string; lineIds: Record<string, string>; folderIds: Record<string, string> }
  | { ok: false; message: string };

/** Capture one explicit bound occurrence, never all documents using a catalog ID. */
export function readProgramFolderCopyPreview(state: TextWorkspaceState, docId: string, lineId: string): ProgramFolderCopyPreview | null {
  if (!M.validate(state) || !state.documents.some(doc => doc.id === docId)) return null;
  const doc = M.getDocument(state, docId), row = M.rowMeta(state, docId).find(row => row.id === lineId);
  if (!doc || row?.kind !== 'scope' || row.scopeKind !== 'folder' || !row.scopeId) return null;
  const selection = M.selectionForMove(state, docId, lineId);
  const folder = state.folders.find(folder => folder.id === row.scopeId);
  if (!selection || !folder) return null;
  const lines = doc.lines.slice(selection.startIndex, selection.endIndex), ids = new Set(lines.map(line => line.id));
  const bindings = state.bindings.filter(binding => binding.docId === docId && ids.has(binding.lineId));
  const folderIds = new Set(bindings.filter(binding => binding.kind === 'scope').map(binding => binding.kind === 'scope' ? binding.scopeId : ''));
  const items = M.parseDocument(doc, state).items.filter(item => ids.has(item.id));
  const pick = (source: Record<string, string>) => Object.fromEntries(Object.entries(source).filter(([id]) => ids.has(id)));
  return programClone({ docId, lineId, folderId: folder.id, title: folder.title, depth: row.depth, lines, bindings,
    folders: state.folders.filter(folder => folderIds.has(folder.id)), items,
    taskScopes: pick(state.taskScopes), itemScopes: pick(state.itemScopes) });
}
export function isProgramFolderCopyPreviewCurrent(state: TextWorkspaceState, preview: ProgramFolderCopyPreview): boolean {
  return programSame(readProgramFolderCopyPreview(state, preview.docId, preview.lineId), preview);
}

/** Existing source protections apply before allocating or applying a new copy. */
export function programFolderCopyAccessProblem(space: ProgramPrivateSpace, docId: string, lineIds: readonly string[]): string | null {
  if (programDocumentContentLock(space, docId) !== 'active') return '보관·휴지통·복구 문서는 여기서 사본을 만들 수 없습니다.';
  const ids = new Set(lineIds);
  if (M.rowMeta(space.text, docId).some(row => ids.has(row.id) && row.kind === 'fence')) return '코드 블록이 섞인 묶음은 아직 사본을 만들 수 없습니다.';
  if (space.text.flows.some(doc => doc.id === docId)) return 'Flow 문서는 이 폴더 사본 경로에서 복사하지 않습니다.';
  if (space.text.bindings.some(binding => binding.docId === docId && ids.has(binding.lineId) && (binding.kind === 'task' || !space.text.folders.some(folder => folder.id === binding.scopeId)))) return '참조나 Flow가 섞인 묶음은 아직 사본을 만들 수 없습니다.';
  if (programSeriesMetadata(space).some(row => row.documentId === docId && ids.has(row.lineId))) return '반복 항목이 섞인 묶음은 아직 사본을 만들 수 없습니다.';
  const external = new Set([...space.copies.flatMap(copy => Object.values(copy.itemLines)),
    ...space.savedBindings.flatMap(binding => Object.values(binding.itemLines))]);
  for (const id of ids) {
    const access = programReferenceExecutionAccess(space, id);
    if (external.has(id) || access.kind !== 'active' || access.reason || programLegacyTaskQualityHold(space, id) || programLegacyPlanTaskExcluded(space, id)) return '연결·보류·제외 항목이 섞인 묶음은 아직 사본을 만들 수 없습니다.';
  }
  return null;
}

/** New local artifact with explicit IDs; source records are kept, copy records start empty. */
export function copyProgramFolderOccurrence(state: TextWorkspaceState, preview: ProgramFolderCopyPreview, name: string): ProgramFolderCopyResult {
  const fail = (message: string): ProgramFolderCopyResult => ({ ok: false, message });
  if (!isProgramFolderCopyPreviewCurrent(state, preview)) return fail('선택한 폴더 내용이 바뀌었습니다. 닫고 다시 선택해 주세요.');
  const title = name.trim();
  if (!title || title.length > 100 || /[\r\n]/.test(title)) return fail('사본 이름을 100자 이내로 입력해 주세요.');
  const folderText = /^ *- \//.test(preview.lines.find(line => line.id === preview.lineId)?.text ?? '');
  if (folderText && /<!--\s*flowme-folder/.test(title)) return fail('사본 이름에 폴더 연결 정보를 넣을 수 없습니다. 이름만 입력해 주세요.');
  if (state.folders.some(folder => folder.parentId === null && folder.title === title)) return fail('최상위에 같은 이름의 폴더가 있습니다. 다른 사본 이름을 입력해 주세요.');
  if (M.rowMeta(state, preview.docId).some(row => row.kind === 'fence' && preview.lines.some(line => line.id === row.id))) return fail('코드 블록이 섞인 묶음은 아직 사본을 만들 수 없습니다.');
  if (preview.bindings.some(binding => binding.kind === 'task' || !preview.folders.some(folder => binding.kind === 'scope' && folder.id === binding.scopeId))) return fail('참조나 Flow가 섞인 묶음은 아직 사본을 만들 수 없습니다.');
  if (preview.folders.some(folder => folder.id !== preview.folderId && (!folder.parentId || !preview.folders.some(parent => parent.id === folder.parentId)))) return fail('현재 묶음 밖의 폴더 계층이 연결돼 있어 사본을 만들지 않았습니다.');
  const selectedFolderIds = new Set(preview.folders.map(folder => folder.id));
  if (preview.items.some(item => !selectedFolderIds.has(preview.itemScopes[item.id]) ||
    (item.isCanonical && !selectedFolderIds.has(preview.taskScopes[item.id])))) return fail('항목의 소속이 선택한 묶음 밖에 있어 사본을 만들지 않았습니다.');
  let next = M.addDocument(state, { title });
  if (next === state) return fail('새 문서를 만들 수 없습니다. 문서 수와 이름을 확인해 주세요.');
  const documentId = next.documents.at(-1)!.id;
  const prepared = M.createFolderAt(next, documentId, 0, title);
  if (prepared === next) return fail('이 이름으로 새 폴더를 만들 수 없습니다. 이름과 TXT 표시를 확인해 주세요.');
  next = programClone(prepared);
  const root = next.bindings.find(binding => binding.docId === documentId && binding.kind === 'scope');
  if (!root || root.kind !== 'scope') return fail('사본 폴더를 준비하지 못했습니다.');
  const folderIds: Record<string, string> = { [preview.folderId]: root.scopeId };
  for (const folder of preview.folders) if (folder.id !== preview.folderId) folderIds[folder.id] = programId('folder');
  for (const folder of preview.folders) if (folder.id !== preview.folderId) next.folders.push({
    id: folderIds[folder.id], title: folder.title, parentId: folderIds[folder.parentId!],
  });
  const newDoc = M.getDocument(next, documentId)!;
  const rootLine = newDoc.lines[0];
  const lineIds: Record<string, string> = { [preview.lineId]: rootLine.id };
  for (const line of preview.lines) if (line.id !== preview.lineId) lineIds[line.id] = programId('line');
  const indent = preview.depth * 2;
  newDoc.lines = preview.lines.map(line => ({ id: lineIds[line.id], text: line.id === preview.lineId ? '- ' + (folderText ? '/' : '') + title : line.text.slice(indent) }));
  newDoc.folderId = root.scopeId; newDoc.folder = title;
  for (const binding of preview.bindings) if (binding.lineId !== preview.lineId && binding.kind === 'scope') next.bindings.push({
    kind: 'scope', docId: documentId, lineId: lineIds[binding.lineId], scopeId: folderIds[binding.scopeId],
  });
  for (const item of preview.items) {
    const id = lineIds[item.id], owner = folderIds[preview.itemScopes[item.id]];
    next.itemScopes[id] = owner;
    if (item.isCanonical) next.taskScopes[id] = folderIds[preview.taskScopes[item.id]];
  }
  // No history assignment: all original dated records remain unchanged.
  if (!M.validate(next)) return fail('선택한 구조를 새 문서에 안전하게 복사하지 못했습니다.');
  for (const item of preview.items.filter(item => item.isCanonical)) {
    const id = lineIds[item.id], copied = M.tasks(next).find(task => task.id === id);
    if (!copied) return fail('복사한 항목의 소속을 확인하지 못했습니다.');
    if (copied.date !== item.date) next = M.updateTask(next, id, { date: item.date });
  }
  const copiedItems = M.parseDocument(M.getDocument(next, documentId)!, next).items;
  if (!M.validate(next) || preview.items.some(item => {
    const copied = copiedItems.find(copy => copy.id === lineIds[item.id]);
    return !copied || copied.title !== item.title || copied.date !== item.date || copied.note !== item.note || copied.time !== item.time ||
      copied.isCanonical !== item.isCanonical || copied.inputPercent !== item.inputPercent || copied.done !== item.done;
  })) return fail('날짜·메모·현재값을 모두 보존할 수 없어 사본을 만들지 않았습니다.');
  if (!programSame(state.progressRecords, next.progressRecords)) return fail('기록 보존을 확인하지 못해 사본을 만들지 않았습니다.');
  const originalDocIds = new Set([...state.documents, ...state.flows].map(doc => doc.id));
  const originalFolderIds = new Set(state.folders.map(folder => folder.id));
  const originalOwners = (owners: Record<string, string>, before: Record<string, string>) =>
    Object.fromEntries(Object.entries(owners).filter(([id]) => Object.prototype.hasOwnProperty.call(before, id)));
  if (!programSame(state, { ...next,
    documents: next.documents.filter(doc => originalDocIds.has(doc.id)),
    folders: next.folders.filter(folder => originalFolderIds.has(folder.id)),
    bindings: next.bindings.filter(binding => originalDocIds.has(binding.docId)),
    taskScopes: originalOwners(next.taskScopes, state.taskScopes), itemScopes: originalOwners(next.itemScopes, state.itemScopes),
  })) return fail('기존 문서와 소속을 모두 보존할 수 없어 사본을 만들지 않았습니다.');
  return { ok: true, workspace: next, documentId, folderId: root.scopeId, lineIds, folderIds };
}

