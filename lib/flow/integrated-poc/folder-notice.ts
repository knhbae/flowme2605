import { textEditorRows, textWorkspaceModel as M, type TextScopeBinding, type TextWorkspaceState } from './text-workspace';

/** W15 · D3 B notice words (folder picker v3 2-2, folder grammar 4th edition 3.2). Pure: the editor shows them. */

/** The final consonant of the last Hangul syllable (0 when none, or not Hangul). */
function final(name: string) {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 ? code % 28 : 0;
}
/** '(으)로': '으로' after a final consonant other than ㄹ. */
export const ro = (name: string) => (final(name) && final(name) !== 8 ? '으로' : '로');
/** '을/를' and '이/가'. */
export const eul = (name: string) => (final(name) ? '을' : '를');
export const iga = (name: string) => (final(name) ? '이' : '가');

const scopeOf = (state: TextWorkspaceState, docId: string, lineId: string) =>
  state.bindings.find((row): row is TextScopeBinding => row.kind === 'scope' && row.docId === docId && row.lineId === lineId)?.scopeId ?? null;

/** Documents that use a folder: by a folder line or by being stored in it. */
export function programFolderUsers(state: TextWorkspaceState, folderId: string): Set<string> {
  const users = new Set<string>(), docs = [...state.documents, ...state.flows];
  for (const row of state.bindings) if (row.kind === 'scope' && row.scopeId === folderId) users.add(row.docId);
  for (const doc of docs) if ((doc as { folderId?: string }).folderId === folderId) users.add(doc.id);
  // N7 review 6: a document whose task or item is classified into the folder (분류) uses it too.
  for (const scopes of [state.taskScopes, state.itemScopes]) for (const [id, scope] of Object.entries(scopes ?? {})) {
    const owner = scope === folderId ? docs.find(doc => doc.lines.some(line => line.id === id)) : undefined;
    if (owner) users.add(owner.id);
  }
  return users;
}

/** Is this folder line linked to a folder whose parent is not where the text puts it (detail a)? */
function linkedElsewhere(state: TextWorkspaceState, docId: string, lineId: string, folderId: string) {
  const rows = textEditorRows(state, docId), index = rows.findIndex(row => row.id === lineId);
  if (index < 0) return false;
  const above = rows.slice(0, index).reverse().find(row => row.kind === 'scope' && row.depth < rows[index].depth);
  const folder = state.folders.find(entry => entry.id === folderId);
  return !!folder && (folder.parentId ?? null) !== (above ? scopeOf(state, docId, above.id) : null);
}
/** A folder's name, with its parent's when the line is linked elsewhere ('회사 › 회의'). */
function placed(state: TextWorkspaceState, folderId: string, elsewhere: boolean): string {
  const folder = state.folders.find(entry => entry.id === folderId);
  const parent = folder && elsewhere && folder.parentId ? state.folders.find(entry => entry.id === folder.parentId) : undefined;
  return folder ? parent ? `${parent.title} › ${folder.title}` : folder.title : '';
}

export type ProgramFolderMoveNotice = { kind: 'renamed' | 'joined' | 'moved'; text: string; tone: 'info' | 'choose'; others: number };

/** The notice after a linked folder line was finished with Enter: its folder renamed, the line joined to an
 *  existing folder of the new name, or the line moved to a new one (other documents keep theirs). */
export function programFolderMoveNotice(before: TextWorkspaceState, after: TextWorkspaceState, docId: string, lineId: string, fromId: string): ProgramFolderMoveNotice {
  const toId = scopeOf(after, docId, lineId) ?? fromId, elsewhere = linkedElsewhere(before, docId, lineId, fromId);
  if (toId === fromId) {
    const name = after.folders.find(folder => folder.id === fromId)?.title ?? '';
    return { kind: 'renamed', text: `폴더 이름을 ‘${name}’${ro(name)} 바꿨습니다`, tone: 'info', others: 0 };
  }
  const name = placed(after, toId, elsewhere);
  if (before.folders.some(folder => folder.id === toId)) {
    const tasks = Object.entries(after.taskScopes).filter(([id, scope]) => scope === toId && before.taskScopes[id] === fromId).length;
    return { kind: 'joined', text: `이 줄을 같은 자리의 ‘${name}’${ro(name)} 옮겼습니다${tasks ? ` · 할 일 ${tasks}개 함께` : ''}`, tone: 'info', others: 0 };
  }
  const others = [...programFolderUsers(after, fromId)].filter(id => id !== docId).length, old = placed(after, fromId, elsewhere);
  return { kind: 'moved', text: `이 줄만 ‘${name}’${ro(name)} 옮겼습니다 · 다른 문서 ${others}곳은 ‘${old}’ 그대로`, tone: 'choose', others };
}

/** B1: every new folder is announced, whether Enter on a "- /name" line or a paste made it. A subfolder names its
 *  parent; a name already used elsewhere says how many (D4); several at once name the first. Null when none. */
export function programFolderCreatedNotice(before: TextWorkspaceState, after: TextWorkspaceState): string | null {
  const known = new Set(before.folders.map(folder => folder.id)), made = after.folders.filter(folder => !known.has(folder.id));
  if (!made.length) return null;
  if (made.length > 1) return `새 폴더 ${made.length}개를 만들었습니다: ${made[0].title} 외 ${made.length - 1}`;
  const folder = made[0], parent = folder.parentId ? after.folders.find(entry => entry.id === folder.parentId) : undefined;
  const name = parent ? `${parent.title} › ${folder.title}` : folder.title;
  const same = after.folders.filter(entry => entry.id !== folder.id && entry.title === folder.title).length;
  return same ? `새 폴더 ‘${name}’ · 같은 이름이 다른 곳에 ${same}개` : `새 폴더 ‘${name}’${eul(folder.title)} 만들었습니다`;
}

/** S4 v14 phone (11/2): a new folder's line emptied and typed again links that folder again (none is made). It is
 *  announced as the new folder was, so the line's ⇤ (D11 B) has its notice too. Null when the line has no folder. */
export function programFolderRelinkedNotice(state: TextWorkspaceState, docId: string, lineId: string): string | null {
  const binding = state.bindings.find(row => row.kind === 'scope' && row.docId === docId && row.lineId === lineId);
  const folder = binding?.kind === 'scope' ? state.folders.find(entry => entry.id === binding.scopeId) : undefined;
  if (!folder) return null;
  const parent = folder.parentId ? state.folders.find(entry => entry.id === folder.parentId) : undefined;
  return `‘${parent ? `${parent.title} › ${folder.title}` : folder.title}’ 폴더에 다시 연결했습니다`;
}

/** After [모든 문서에 적용]: the folder renamed everywhere, with the number of documents that use it. */
export function programFolderRenamedEverywhere(state: TextWorkspaceState, folderId: string, oldName: string): string {
  const name = state.folders.find(folder => folder.id === folderId)?.title ?? '';
  return `‘${oldName}’${eul(oldName)} 모든 문서에서 ‘${name}’${ro(name)} 바꿨습니다 · ${programFolderUsers(state, folderId).size}곳`;
}

/** Every line linked to a folder, by document and line, with its text: what [모든 문서에 적용] left behind. */
export function programFolderLines(state: TextWorkspaceState, folderId: string): Record<string, string> {
  const lines: Record<string, string> = {};
  for (const row of state.bindings) {
    if (row.kind !== 'scope' || row.scopeId !== folderId) continue;
    const line = M.getDocument(state, row.docId)?.lines.find(entry => entry.id === row.lineId);
    if (line) lines[`${row.docId}/${row.lineId}`] = line.text;
  }
  return lines;
}

/** Its 되돌리기 (W15 review P1-2): the folder named back in every document, only while the folder and its lines are
 *  as the rename left them. A line typed over or newly linked since, another name, or the old name taken in the
 *  place refuses it with the reason; a later edit is never written over. */
export function programFolderRenameBack(state: TextWorkspaceState, folderId: string, oldTitle: string, title: string, lines: Record<string, string>):
  { ok: true; next: TextWorkspaceState } | { ok: false; reason: string } {
  const folder = state.folders.find(entry => entry.id === folderId);
  if (!folder || folder.title !== title) return { ok: false, reason: '폴더 이름이 그 사이에 바뀌어 되돌리지 않았습니다.' };
  if (state.folders.some(entry => entry.id !== folderId && (entry.parentId ?? null) === (folder.parentId ?? null) && entry.title === oldTitle))
    return { ok: false, reason: `같은 자리에 ‘${oldTitle}’${iga(oldTitle)} 생겨 되돌리지 않았습니다 · 폴더 화면에서 정리할 수 있습니다` };
  const now = programFolderLines(state, folderId), keys = Object.keys(lines);
  if (Object.keys(now).length !== keys.length || keys.some(key => now[key] !== lines[key]))
    return { ok: false, reason: '그 사이 다른 곳에서 이 폴더의 줄이 바뀌어 되돌리지 않았습니다 · 폴더 화면에서 이름을 바꿀 수 있습니다' };
  const next = M.renameScope(state, folderId, oldTitle);
  return next === state ? { ok: false, reason: '폴더 이름을 되돌리지 못했습니다.' } : { ok: true, next };
}

/** The words when a typed name went back: left without Enter (b), already off its folder (c), two folders of
 *  that name in the place, a folder another document uses (N7: known only after this input), or another refusal. */
export function programFolderKeptText(kept: string, typed: string, why: 'left' | 'off' | 'name-conflict' | 'shared' | 'refused', boxed = false): string {
  // N7: boxed, the typed name was also kept in the 복구함 (saved input), and the words say so.
  const back = boxed ? `‘${kept}’${ro(kept)} 두었습니다. 입력(‘${typed}’)은 복구함에 보관했습니다` : `‘${kept}’${ro(kept)} 두었습니다(입력: ‘${typed}’)`;
  if (why === 'left') return `폴더 이름은 Enter로 마칠 때만 바뀝니다 · ${back}`;
  if (why === 'off') return `이미 폴더 이름과 달랐던 줄은 옮기지 않습니다 · ${back}`;
  if (why === 'name-conflict') return `같은 자리에 ‘${typed}’${iga(typed)} 둘이라 옮기지 않았습니다 · 폴더 관리에서 정리할 수 있습니다${boxed ? ' · 입력은 복구함에 보관했습니다' : ''}`;
  if (why === 'shared') return `다른 곳에서도 쓰는 폴더라 이름을 바꾸지 않았습니다 · ${back}`;
  return `이 줄은 옮길 수 없습니다 · ${back}`;
}
