import model from './vendor/text-model.cjs';

export interface TextLine { id: string; text: string }
export interface TextFolder { id: string; title: string; parentId: string | null }
export interface TextDocument { id: string; title: string; folder: string; folderId: string; lines: TextLine[] }
export interface TextFlowDocument extends TextDocument { private: true; sourceVersion: string }
export interface TextScopeBinding { kind: 'scope'; docId: string; lineId: string; scopeId: string }
export interface TextTaskBinding { kind: 'task'; docId: string; lineId: string; taskId: string; dateMode: 'keep' | 'apply' }
export type TextBinding = TextScopeBinding | TextTaskBinding;
export interface TextProgressRecord { taskId: string; date: string; percent: number }
export interface TextWorkspaceState {
  version: 11;
  documents: TextDocument[];
  folders: TextFolder[];
  flows: TextFlowDocument[];
  bindings: TextBinding[];
  taskScopes: Record<string, string>;
  itemScopes: Record<string, string>;
  progressRecords: TextProgressRecord[];
}
export interface TextScope { id: string; title: string; kind: 'folder' | 'flow'; parentId: string | null; sourceVersion?: string }
export interface TextTask {
  id: string; docId: string; docTitle: string; folder: string; folderId: string;
  title: string; done: boolean; date: string | null; groupDate: string | null;
  sourceIndex: number; depth: number; note: string; time: string | null;
  subchecks: TextTask[]; isCanonical: boolean; parentItemId: string | null;
  parentTaskId: string | null; explicitDate: boolean;
  scopeId: string; scopeKind: 'folder' | 'flow'; scopeTitle: string;
  inputPercent?: number; inputToken?: string;
}
export type TextRowKind = 'note' | 'blank' | 'fence' | 'date' | 'scope' | 'task' | 'subcheck' | 'property' | 'heading';
export interface TextRow {
  id: string; text: string; index: number; kind: TextRowKind; depth: number;
  guideLevels: number[]; parentLineId: string | null; subtreeEndIndex: number;
  ancestorScopeId: string | null; ancestorScopeKind: 'folder' | 'flow' | null;
  ancestorScopeIds?: string[]; ancestorItemIds?: string[]; parentKind?: TextRowKind | null;
  groupDate: string | null; dateLineId: string | null; date?: string | null;
  title?: string; done?: boolean; taskId?: string; parentTaskId?: string | null;
  progressTargetId?: string; progressTitle?: string; progressDate?: string | null;
  progressPercent?: number; progressToken?: string; isCanonical?: boolean;
  isReference?: boolean; scopeId?: string; scopeKind?: 'folder' | 'flow'; scopeTitle?: string;
  scopeMismatch?: boolean; structuralKind?: 'task' | 'subcheck';
  note?: string; time?: string | null; task?: TextTask; binding?: TextBinding;
  dateMode?: 'keep' | 'apply'; valid?: boolean;
}
export interface TextIssue { code: string; index: number; lineId: string | null; blocking: boolean }
export interface TextAnalysis { rows: TextRow[]; tasks: TextTask[]; items: TextTask[]; issues: TextIssue[] }
export interface TextContext {
  scopeId: string | null; scopeKind: 'folder' | 'flow' | null; ancestorScopeIds: string[];
  date: string | null; dateLineId: string | null; parentLineId: string | null;
  valid: boolean; parentKind?: TextRowKind | null; depth?: number;
}
export interface TextInsertion {
  kind: 'task' | 'subcheck' | 'note'; label: string; relation: string; syntax: string;
  index: number; depth: number; offset: number; text: string; caretOffset: number; parentLineId: string | null;
}
export interface TextMoveSelection {
  lineId: string; startIndex: number; endIndex: number; depth: number; label: string;
  descendantCount: number; lineIds: string[]; kind: 'task' | 'subcheck' | 'scope' | 'reference';
}
export interface TextMoveTarget {
  beforeLineId: string | null; label: string; index: number; depth: number;
  parentLineId: string | null; targetKey: string;
}
export interface TextProgress { date: string; percent: number }
export interface TextEditorRowMeta {
  id: string; kind: TextRowKind | 'reference'; isCanonical: boolean; depth: number;
  guideLevels: number[]; subtreeEndIndex: number; label: string;
  progressTargetId?: string; progressPercent?: number; progressDate?: string | null;
  progressTracked?: boolean; scopeKind?: 'folder' | 'flow'; subtitle?: string;
  scopeMismatch?: string; dateMismatch?: string;
}
export interface TextWorkspaceModel {
  MAX_DEPTH: number;
  validate(state: unknown): state is TextWorkspaceState;
  raw(doc: TextDocument | null | undefined): string;
  getDocument(state: TextWorkspaceState, id: string): TextDocument | null;
  parseDocument(doc: TextDocument, state?: TextWorkspaceState, skipSourceDates?: boolean): TextAnalysis;
  tasks(state: TextWorkspaceState, options?: { from?: string; to?: string; folder?: string; undatedOnly?: boolean }): TextTask[];
  scopes(state: TextWorkspaceState): TextScope[];
  scopeTasks(state: TextWorkspaceState, scopeId: string): TextTask[];
  rowMeta(state: TextWorkspaceState, docId: string): TextRow[];
  contextAt(state: TextWorkspaceState, docId: string, index: number): TextContext;
  insertionContext(state: TextWorkspaceState, docId: string, index: number, depth?: number): TextContext;
  insertionOptions(state: TextWorkspaceState, docId: string, lineId: string): TextInsertion[];
  editText(state: TextWorkspaceState, docId: string, text: string, options?: { progressDate?: string }): TextWorkspaceState;
  addDocument(state: TextWorkspaceState, input: { title: string; folder?: string; folderId?: string }): TextWorkspaceState;
  addTask(state: TextWorkspaceState, input: { docId: string; title: string; date?: string | null; scopeId?: string }): TextWorkspaceState;
  updateTask(state: TextWorkspaceState, taskId: string, patch: { title?: string; done?: boolean; date?: string | null; note?: string; time?: string }): TextWorkspaceState;
  removeTask(state: TextWorkspaceState, taskId: string): TextWorkspaceState;
  updateSubcheck(state: TextWorkspaceState, docId: string, lineId: string, done: boolean): TextWorkspaceState;
  restoreTaskDate(state: TextWorkspaceState, taskId: string): TextWorkspaceState;
  attachScope(state: TextWorkspaceState, docId: string, index: number, scopeId: string): TextWorkspaceState;
  createFolderAt(state: TextWorkspaceState, docId: string, index: number, title: string): TextWorkspaceState;
  renameScope(state: TextWorkspaceState, scopeId: string, title: string): TextWorkspaceState;
  linkTask(state: TextWorkspaceState, docId: string, index: number, taskId: string, options?: { dateMode?: 'keep' | 'apply'; date?: string | null }): TextWorkspaceState;
  importFlowTasks(state: TextWorkspaceState, docId: string, scopeLineId: string): TextWorkspaceState;
  unlink(state: TextWorkspaceState, docId: string, lineId: string): TextWorkspaceState;
  selectionForMove(state: TextWorkspaceState, docId: string, lineId: string): TextMoveSelection | null;
  moveTargets(state: TextWorkspaceState, docId: string, lineId: string): TextMoveTarget[];
  moveSubtree(state: TextWorkspaceState, docId: string, lineId: string, beforeLineId: string | null, depth?: number): TextWorkspaceState;
  recordProgress(state: TextWorkspaceState, taskId: string, date: string, percent: number): TextWorkspaceState;
  progressHistory(state: TextWorkspaceState, taskId: string): TextProgress[];
  latestProgress(state: TextWorkspaceState, taskId: string): TextProgress | null;
  parseProgressToken(token: string): { ok: boolean; percent: number | null; kind: 'percent' | 'integer' | 'ratio' | null };
}

/** Pure source transitions. Persistence and undo belong to the program transaction owner. */
export const textWorkspaceModel: TextWorkspaceModel = model;

/** Display current dated progress, never a stale numeric token from the source text. */
export function textEditorRows(state: TextWorkspaceState, docId: string): TextEditorRowMeta[] {
  return model.rowMeta(state, docId).map(row => {
    const targetId = row.progressTargetId;
    const progress = targetId ? model.latestProgress(state, targetId) : null;
    const kind = row.isReference ? 'reference' : row.kind;
    const meta: TextEditorRowMeta = {
      id: row.id, kind, isCanonical: !!row.isCanonical, depth: row.depth,
      guideLevels: row.guideLevels, subtreeEndIndex: row.subtreeEndIndex,
      label: row.scopeTitle || row.title || row.task?.title || row.text,
    };
    if (targetId) Object.assign(meta, {
      progressTargetId: targetId, progressPercent: progress?.percent ?? (row.done ? 100 : 0),
      progressDate: progress?.date ?? null, progressTracked: !!progress,
    });
    if (row.kind === 'scope') Object.assign(meta, { scopeKind: row.scopeKind, subtitle: row.scopeKind === 'flow' ? '개인 사본' : '폴더' });
    if (row.scopeMismatch) meta.scopeMismatch = model.scopes(state).find(scope => scope.id === row.scopeId)?.title ?? '';
    if (targetId && row.date !== row.groupDate) meta.dateMismatch = row.date?.slice(5).replace('-', '.') ?? '미정';
    return meta;
  });
}

/** Never reads historical UX storage or inserts demonstration documents. */
export function createEmptyTextWorkspace(): TextWorkspaceState {
  return {
    version: 11, documents: [], flows: [],
    folders: [{ id: 'folder-unfiled', title: '미분류', parentId: null }],
    bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [],
  };
}
