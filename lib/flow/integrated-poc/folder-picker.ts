import { textWorkspaceModel as M, type TextFolder, type TextWorkspaceState } from './text-workspace';
import { linkProgramFolder, programFolderLinkProblem } from './folder-link-slot';
import { heldTargetVerdict, writingBarTarget, type WritingBarTarget } from './writing-bar';

const LEADS = [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'];
const VOWELS = [...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'];
const TAILS = [...'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'];
const PARTS: Record<string, string> = {
  ㄲ: 'ㄱㄱ', ㄸ: 'ㄷㄷ', ㅃ: 'ㅂㅂ', ㅆ: 'ㅅㅅ', ㅉ: 'ㅈㅈ',
  ㄳ: 'ㄱㅅ', ㄵ: 'ㄴㅈ', ㄶ: 'ㄴㅎ', ㄺ: 'ㄹㄱ', ㄻ: 'ㄹㅁ', ㄼ: 'ㄹㅂ', ㄽ: 'ㄹㅅ', ㄾ: 'ㄹㅌ', ㄿ: 'ㄹㅍ', ㅀ: 'ㄹㅎ', ㅄ: 'ㅂㅅ',
  ㅐ: 'ㅏㅣ', ㅒ: 'ㅑㅣ', ㅔ: 'ㅓㅣ', ㅖ: 'ㅕㅣ', ㅘ: 'ㅗㅏ', ㅙ: 'ㅗㅏㅣ', ㅚ: 'ㅗㅣ', ㅝ: 'ㅜㅓ', ㅞ: 'ㅜㅓㅣ', ㅟ: 'ㅜㅣ', ㅢ: 'ㅡㅣ',
};

/** Matching only. The exact folder title/ID, never this key, is sent to the model. */
export function folderPickerMatchKey(value: string): string {
  return [...value.replace(/[ㆍᆢ]/g, '').normalize('NFKD')].map(char => {
    const code = char.codePointAt(0)!;
    const part = code >= 0x1100 && code <= 0x1112 ? LEADS[code - 0x1100]
      : code >= 0x1161 && code <= 0x1175 ? VOWELS[code - 0x1161]
      : code >= 0x11a8 && code <= 0x11c2 ? TAILS[code - 0x11a8] : char;
    return PARTS[part] ?? part.toLocaleLowerCase();
  }).join('');
}

export const folderPickerName = (value: string) => value.trim().replace(/[.,?!。！？]+$/u, '').trim();
export type FolderPickerLine = { index: number; start: number; end: number; text: string; indent: string; query: string };

/** RAW-only read: no model validation, record lookup, ID allocation or writes. */
export function readFolderPickerLine(raw: string, caret: number, end = caret): FolderPickerLine | null {
  if (caret !== end || caret < 0 || caret > raw.length) return null;
  const start = raw.lastIndexOf('\n', caret - 1) + 1, next = raw.indexOf('\n', caret), lineEnd = next < 0 ? raw.length : next;
  if (caret !== lineEnd) return null;
  const text = raw.slice(start, lineEnd), match = /^([ \t]*)- \/([^/\r\n]*)$/.exec(text);
  if (!match) return null;
  let fence: { mark: string; length: number } | null = null;
  for (const line of raw.slice(0, start).split('\n')) {
    const mark = /^ *(\x60{3,}|~{3,})(.*)$/.exec(line);
    if (!mark) continue;
    if (fence) { if (mark[1][0] === fence.mark && mark[1].length >= fence.length && !mark[2].trim()) fence = null; }
    else fence = { mark: mark[1][0], length: mark[1].length };
  }
  return fence ? null : { index: raw.slice(0, start).split('\n').length - 1, start, end: lineEnd, text, indent: match[1], query: folderPickerName(match[2]) };
}
/** Selection admission uses the current native surface and immutable document,
 * including a reopened plain slash line with no typing-history ref. */
export function readFolderPickerCommand(state: TextWorkspaceState, docId: string, lineId: string, raw: string, caret: number, end: number) {
  const doc = M.getDocument(state, docId), line = readFolderPickerLine(raw, caret, end);
  return doc && M.raw(doc) === raw && line && doc.lines[line.index]?.id === lineId ? line : null;
}

export type FolderPickerCompositionOwner = { controller: object; surface: object; documentId: string; lineId: string; raw: string; caret: number };
/** Native composition is published to the model only at compositionend. Permit
 * that gap solely within the original slash line, never across a new owner. */
export function readFolderPickerCompositionLine(owner: FolderPickerCompositionOwner | null, now: {
  controller: object; surface: object; documentId: string; lineId: string | null; committedRaw: string; raw: string;
  caret: number; end: number; composing: boolean; active: boolean; focused: boolean; editable: boolean; connected: boolean;
}): FolderPickerLine | null {
  if (!owner || !now.composing || !now.active || !now.focused || !now.editable || !now.connected
    || owner.controller !== now.controller || owner.surface !== now.surface || owner.documentId !== now.documentId
    || owner.lineId !== now.lineId || owner.raw !== now.committedRaw) return null;
  const before = readFolderPickerLine(owner.raw, owner.caret), line = readFolderPickerLine(now.raw, now.caret, now.end);
  return before && line && before.index === line.index && before.indent === line.indent
    && owner.raw.slice(0, before.start) === now.raw.slice(0, line.start)
    && owner.raw.slice(before.end) === now.raw.slice(line.end) ? line : null;
}

export type FolderPickerCandidate = { id: string; title: string; parentId: string | null; parentLabel: string; path: string; matchKey: string };
export function createFolderPickerIndex(folders: readonly TextFolder[]) {
  const byId = new Map(folders.map(folder => [folder.id, folder]));
  const titles = (id: string | null) => {
    const path: string[] = [], seen = new Set<string>();
    while (id && !seen.has(id)) { seen.add(id); const folder = byId.get(id); if (!folder) break; path.unshift(folder.title); id = folder.parentId; }
    return path;
  };
  const compact = (parts: string[]) => parts.length > 2 ? ['…', ...parts.slice(-2)].join(' › ') : parts.join(' › ');
  return folders.map(folder => ({ id: folder.id, title: folder.title, parentId: folder.parentId,
    parentLabel: compact(titles(folder.parentId)) || '최상위', path: compact(titles(folder.id)), matchKey: folderPickerMatchKey(folder.title) }));
}

export type FolderPickerDefault = { kind: 'folder'; folder: FolderPickerCandidate } | { kind: 'create'; title: string } | { kind: 'ambiguous'; title: string };
export function folderPickerNavigation(previous: readonly FolderPickerCandidate[], navigation: number, next: readonly FolderPickerCandidate[], sameLineText: boolean) {
  const id = sameLineText && navigation >= 0 ? previous[navigation]?.id : null;
  return id ? next.findIndex(folder => folder.id === id) : -1;
}
export function readFolderPickerChoices(index: readonly FolderPickerCandidate[], query: string, parentId: string | null,
  options: { composing?: boolean; previous?: readonly FolderPickerCandidate[]; recentIds?: readonly string[] } = {}) {
  const name = folderPickerName(query), key = folderPickerMatchKey(name), same = (folder: FolderPickerCandidate) => folder.parentId === parentId;
  const exact = name ? index.filter(folder => same(folder) && folder.title === name) : [];
  const enter: FolderPickerDefault | null = !name || name.length > 100 ? null : exact.length === 1 ? { kind: 'folder', folder: exact[0] }
    : exact.length > 1 ? { kind: 'ambiguous', title: name } : { kind: 'create', title: name };
  const recent = new Map((options.recentIds ?? []).map((id, at) => [id, at]));
  let candidates = index.filter(folder => (!key ? same(folder) : folder.matchKey.startsWith(key)))
    .map((folder, order) => ({ folder, order })).sort((a, b) => Number(!same(a.folder)) - Number(!same(b.folder))
      || (!key ? (recent.get(a.folder.id) ?? Infinity) - (recent.get(b.folder.id) ?? Infinity) : 0) || a.order - b.order).map(row => row.folder);
  if (!candidates.length && options.composing && options.previous?.length) {
    const existing = new Map(index.map(folder => [folder.id, folder]));
    candidates = options.previous.flatMap(folder => existing.has(folder.id) ? [existing.get(folder.id)!] : []);
  }
  return { enter, candidates };
}

export type FolderPickerKey = { key: string; isComposing?: boolean; keyCode?: number; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean;
  shiftKey?: boolean; defaultPrevented?: boolean; cancelable?: boolean };
export function folderPickerKey(event: FolderPickerKey, navigation: number, count: number, composing: boolean, imeConsumed = false):
  { kind: 'pass' | 'reset' | 'dismiss' } | { kind: 'highlight'; index: number } | { kind: 'select'; index: number } {
  if (composing || event.isComposing || event.keyCode === 229 || imeConsumed || event.defaultPrevented || event.cancelable === false
    || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return { kind: 'pass' };
  if (event.key === 'Escape') return { kind: 'dismiss' };
  if (event.key === 'ArrowDown' && count) return { kind: 'highlight', index: Math.min(count - 1, navigation + 1) };
  if (event.key === 'ArrowUp' && navigation >= 0) return { kind: 'highlight', index: navigation - 1 };
  if (event.key === 'Enter' && !event.shiftKey && navigation >= 0 && navigation < count) return { kind: 'select', index: navigation };
  if (event.key === 'Tab' || event.key.length === 1 || ['Backspace', 'Delete'].includes(event.key)) return { kind: 'reset' };
  return { kind: 'pass' };
}

export const folderPickerSignature = (documentId: string, lineId: string, text: string) => JSON.stringify([documentId, lineId, text]);
export function createFolderPickerDismissal() {
  const hidden = new Map<string, string>();
  return {
    hide(documentId: string, lineId: string, text: string) { hidden.set(JSON.stringify([documentId, lineId]), text); },
    hidden(documentId: string, lineId: string, text: string) {
      const key = JSON.stringify([documentId, lineId]), previous = hidden.get(key);
      if (previous === text) return true;
      if (previous !== undefined) hidden.delete(key);
      return false;
    },
  };
}
export type FolderPickerChoice = FolderPickerDefault | { kind: 'outdent' };
export type FolderPickerIntent = { controller: object; documentId: string; lineId: string; target: WritingBarTarget; choice: FolderPickerChoice };

/** S3's surface/line/settled-prefix lease; a repeated press never adds a second operation. */
export function createFolderPickerHold() {
  let pending: FolderPickerIntent | null = null, serial = 0;
  return {
    press(intent: FolderPickerIntent) { if (pending) return false; pending = intent; serial++; return true; },
    pending: () => pending,
    serial: () => serial,
    cancel() { pending = null; serial++; },
    input(inputType: string, composing: boolean, compositionTail = false) {
      if (!pending || composing || ['insertCompositionText', 'insertFromComposition', 'deleteByComposition', 'deleteCompositionText'].includes(inputType)
        || compositionTail && inputType === 'insertText') return false;
      pending = null; serial++; return true;
    },
    release(now: { controller: object | null; documentId: string; lineId: string | null; composing: boolean; saving: boolean; active: boolean;
      surface: object | null; value: string; caret: number; selectionEnd: number; editable: boolean; connected: boolean; focusHere: boolean }): FolderPickerIntent | null {
      if (!pending) return null;
      if (!now.active || now.controller !== pending.controller || now.documentId !== pending.documentId || now.lineId !== pending.lineId) { pending = null; return null; }
      if (now.composing || now.saving) return null;
      const verdict = heldTargetVerdict(pending.target, now);
      if (verdict === 'wait') return null;
      const intent = verdict === 'run' ? pending : null; pending = null; return intent;
    },
  };
}

export { writingBarTarget as folderPickerTarget };

/** Explicit ID selection only. The existing placement/reference checks run before
 * replacing a slash line; ownership moves only for this occurrence's descendants. */
export function planFolderPickerLink(state: TextWorkspaceState, docId: string, lineId: string, scopeId: string) {
  const row = M.rowMeta(state, docId).find(item => item.id === lineId);
  const problem = programFolderLinkProblem(state, docId, lineId, scopeId, { replaceSlot: true });
  if (!row || problem) return { state, problem: problem?.message ?? '이 줄에는 폴더를 연결할 수 없습니다.', moved: false };
  const binding = state.bindings.find(item => item.docId === docId && item.lineId === lineId && item.kind === 'scope');
  const moving = binding?.kind === 'scope' && binding.scopeId !== scopeId;
  const changesPlace = !binding || moving;
  const doc = M.getDocument(state, docId)!;
  const descendants = doc.lines.slice(row.index + 1, row.subtreeEndIndex);
  if (changesPlace && descendants.some(line => state.bindings.some(item => item.docId === docId && item.lineId === line.id && item.kind === 'scope'))) {
    return { state, problem: '하위 폴더가 연결된 줄은 여기서 옮길 수 없습니다. 하위 폴더를 먼저 옮겨 주세요.', moved: false };
  }
  let next = linkProgramFolder(state, docId, lineId, { scopeId }, { replaceSlot: true });
  if (next === state) return { state, problem: null, moved: false };
  if (changesPlace) {
    const taskScopes = { ...next.taskScopes }, itemScopes = { ...next.itemScopes };
    for (const line of descendants) {
      if (Object.hasOwn(taskScopes, line.id)) taskScopes[line.id] = scopeId;
      if (Object.hasOwn(itemScopes, line.id)) itemScopes[line.id] = scopeId;
    }
    next = { ...next, taskScopes, itemScopes };
  }
  return M.validate(next) ? { state: next, problem: null, moved: !!moving }
    : { state, problem: '이 위치에는 폴더를 연결할 수 없습니다. 현재 내용은 유지했습니다.', moved: false };
}
