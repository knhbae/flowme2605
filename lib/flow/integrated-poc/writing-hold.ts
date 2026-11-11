import type { TextWorkspaceState, textWorkspaceModel } from './text-workspace';

/** 저장 재설계 B (PRD 16절 B②, 11/10): "한 줄이 잘못돼도 다른 줄은 저장된다". A refused input is split, by lines, into the
 *  changed pieces between the last text the model took and the text shown. Each piece is offered to the model in order on
 *  top of the ones it took; a piece it refuses is held (its lines stay on screen, unsaved, marked) and the others are saved.
 *  The model's own rules decide every piece, so nothing is saved that it would refuse whole. */
type Model = typeof textWorkspaceModel;
export type ProgramHeldReason = 'indent' | 'parent' | 'date-indent' | 'mark' | 'progress' | 'depth' | 'folder' | 'records' | 'other';
export interface ProgramHeldLines {
  /** Indexes, in the shown text, of the lines held unsaved. */
  lines: number[];
  /** Why, per held line index (what the parser says of the shown text). */
  reasons: Record<number, ProgramHeldReason>;
  /** The model's own words for the refusal (a folder limit, a link it could not make): for a line the parser reads fine. */
  message?: string;
  /** The line the model named, when it named one. */
  line?: number;
  /** Checked tasks taken away (their progress records keep them): shown lines [from, to) and the text that was there. */
  restore?: { from: number; to: number; text: string };
}

/** 11/10 18:05 (실사용, 태블릿): lines taken away that carry progress records (a checked task). The model keeps them, so no
 *  record is dropped; this names the place (the line now there) and the text to put back. Null when none had records. */
export function programRecordedRemoval(model: Model, working: TextWorkspaceState, docId: string, raw: string): { line: number; from: number; to: number; text: string } | null {
  const doc = model.getDocument(working, docId); if (!doc) return null;
  const recorded = new Set(working.progressRecords.map(record => record.taskId)), shown = raw.split('\n');
  for (const piece of programLinePieces(doc.lines.map(line => line.text), shown)) {
    const gone = doc.lines.slice(piece.a[0], piece.a[1]), kept = new Set(shown.slice(piece.b[0], piece.b[1]));
    if (gone.some(line => recorded.has(line.id) && !kept.has(line.text)))
      return { line: Math.max(0, Math.min(piece.b[0], shown.length - 1)), from: piece.b[0], to: piece.b[1], text: gone.map(line => line.text).join('\n') };
  }
  return null;
}

/** The rows of the text the model took, placed on the text shown: a line the same in both keeps its row, a changed or
 *  held line has none (the editor draws it as typed). Never a row by its old index on another line (11/10 18:05: a
 *  folder row on a task line drew "/[ ]", a 25% row moved to the task two lines below). Spans are left out. */
export function programAlignRows<T extends object>(acceptedRaw: string, shownRaw: string, rows: readonly T[], keepSpans = false): (T | undefined)[] {
  const a = acceptedRaw.split('\n'), b = shownRaw.split('\n');
  if (acceptedRaw === shownRaw) return rows.slice();
  // typelag ② (11/11, with the row patch switch): spans are kept when only words inside lines changed (see below), so
  // a composition or a held line does not redraw every folder row without its span and back again.
  const spans = keepSpans && programSameOutline(a, b);
  const out: (T | undefined)[] = new Array(b.length).fill(undefined);
  let i = 0, j = 0;
  for (const piece of [...programLinePieces(a, b), { a: [a.length, a.length], b: [b.length, b.length] } as Piece]) {
    // Codex review P2-1 (11/11): the same outline holds index by index, so only a row kept at its own index keeps its span;
    // one the line pieces moved to another index (i ≠ j) has none (else a folder there would fold lines it does not hold).
    while (i < piece.a[0] && j < piece.b[0]) { const row = rows[i]; if (row) { const copy = { ...row } as T & { subtreeEndIndex?: number }; if (!spans || i !== j) delete copy.subtreeEndIndex; out[j] = copy; } i++; j++; }
    i = piece.a[1]; j = piece.b[1];
  }
  return out;
}
/** typelag ②: a row's span (text-model parseDocument: subtreeEndIndex) follows only the line count and each line's indent,
 *  blankness and code fence marks. Two texts with the same lines in those respects have the same spans. */
export function programSameOutline(a: readonly string[], b: readonly string[]): boolean {
  const fence = /^ *(`{3,}|~{3,})/, lead = (line: string) => /^[ \t]*/.exec(line)![0];
  return a.length === b.length && a.every((line, k) => line === b[k] || (lead(line) === lead(b[k]) && !!line.trim() && !!b[k].trim()
    && !fence.test(line) && !fence.test(b[k])));
}
export interface ProgramPartialSave { state: TextWorkspaceState; raw: string; held: ProgramHeldLines }

type Piece = { a: [number, number]; b: [number, number] };

/** Line pieces that differ between a and b (an LCS of whole lines; a long document falls back to one piece). */
export function programLinePieces(a: string[], b: string[]): Piece[] {
  let prefix = 0; while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  let suffix = 0; while (suffix < a.length - prefix && suffix < b.length - prefix && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]) suffix++;
  const n = a.length - prefix - suffix, m = b.length - prefix - suffix;
  if (!n && !m) return [];
  if (n * m > 400_000) return [{ a: [prefix, a.length - suffix], b: [prefix, b.length - suffix] }];
  const grid = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) grid[i][j] = a[prefix + i] === b[prefix + j] ? grid[i + 1][j + 1] + 1 : Math.max(grid[i + 1][j], grid[i][j + 1]);
  const pieces: Piece[] = []; let i = 0, j = 0, open: Piece | null = null;
  const close = () => { if (open) { pieces.push(open); open = null; } };
  while (i < n || j < m) {
    if (i < n && j < m && a[prefix + i] === b[prefix + j]) { close(); i++; j++; continue; }
    open ??= { a: [prefix + i, prefix + i], b: [prefix + j, prefix + j] };
    if (j < m && (i >= n || grid[i][j + 1] >= grid[i + 1][j])) { j++; open.b[1] = prefix + j; } else { i++; open.a[1] = prefix + i; }
  }
  close();
  return pieces;
}

const REASON: Record<string, ProgramHeldReason> = { 'invalid-indent': 'indent', 'missing-parent': 'parent', 'nested-date': 'date-indent', 'invalid-progress-token': 'progress',
  'max-depth': 'depth', 'invalid-scope-line': 'folder', 'scope-cycle': 'folder' };

/** What the parser says of each line of raw read as this document (blocking issues only). */
export function programHeldReasons(model: Model, state: TextWorkspaceState, docId: string, raw: string): Record<number, ProgramHeldReason> {
  const doc = model.getDocument(state, docId); if (!doc) return {};
  const ids = new Map(doc.lines.map(line => [line.text, line.id]));
  const lines = raw.split('\n').map((text, index) => ({ id: ids.get(text) ?? `held-probe-${index}`, text }));
  const seen = new Set<string>(); for (const line of lines) { if (seen.has(line.id)) line.id = `held-probe-${lines.indexOf(line)}`; seen.add(line.id); }
  const reasons: Record<number, ProgramHeldReason> = {};
  for (const issue of model.parseDocument({ ...doc, lines }, state).issues) if (issue.blocking && issue.index >= 0) {
    const text = lines[issue.index]?.text ?? '';
    reasons[issue.index] = issue.code === 'invalid-progress-token' && /^ *-\s+\[[^\]]*$/.test(text) ? 'mark' : REASON[issue.code] ?? 'other';
  }
  return reasons;
}

/** A refused input with nothing else to save: its changed lines, held, when the parser reads one of them as broken
 *  (a line problem the person can fix there); null for refusals that are not about a line's shape. */
export function programHeldOnly(model: Model, working: TextWorkspaceState, docId: string, raw: string, named?: number): ProgramHeldLines | null {
  const doc = model.getDocument(working, docId); if (!doc) return null;
  const pieces = programLinePieces(model.raw(doc).split('\n'), raw.split('\n')), count = raw.split('\n').length;
  if (!pieces.length || pieces.length > 24) return null;
  const reasons = programHeldReasons(model, working, docId, raw), lines: number[] = [], heldReasons: Record<number, ProgramHeldReason> = {};
  for (const piece of pieces) {
    const range = piece.b[1] > piece.b[0] ? Array.from({ length: piece.b[1] - piece.b[0] }, (_, k) => piece.b[0] + k) : [Math.min(piece.b[0], count - 1)];
    for (const index of range) { lines.push(index); heldReasons[index] = reasons[index] ?? 'other'; }
  }
  // A line the model named (a folder it could not make or link) is a line problem too.
  if (named !== undefined && lines.includes(named) && heldReasons[named] === 'other') heldReasons[named] = 'folder';
  return lines.some(index => heldReasons[index] !== 'other') ? { lines, reasons: heldReasons } : null;
}

/** The pieces of raw the model takes, in order, on top of the document's text in working; null when it takes none
 *  (nothing to save beyond what it has) or there are too many pieces to try. */
export function programPartialSave(model: Model, working: TextWorkspaceState, docId: string, raw: string): ProgramPartialSave | null {
  const doc = model.getDocument(working, docId); if (!doc) return null;
  const a = model.raw(doc).split('\n'), b = raw.split('\n'), pieces = programLinePieces(a, b);
  if (pieces.length < 2 || pieces.length > 24) return null;
  let current = working, lines = a.slice(), shift = 0, took = 0;
  const held: number[] = [];
  for (const piece of pieces) {
    const next = lines.slice(0, piece.a[0] + shift).concat(b.slice(piece.b[0], piece.b[1]), lines.slice(piece.a[1] + shift));
    const text = next.join('\n'), edit = model.editTextResult(current, docId, text, { folderText: true });
    if (edit.reason === null && model.raw(model.getDocument(edit.state, docId)) === text && edit.state !== current) {
      current = edit.state; lines = next; shift += (piece.b[1] - piece.b[0]) - (piece.a[1] - piece.a[0]); took++;
    } else if (piece.b[1] > piece.b[0]) for (let index = piece.b[0]; index < piece.b[1]; index++) held.push(index);
    // Lines only taken away: the line now in their place is marked, so the held change has a place on screen.
    else held.push(Math.min(piece.b[0], b.length - 1));
  }
  if (!took || !held.length) return null;
  const reasons = programHeldReasons(model, working, docId, raw), heldReasons: Record<number, ProgramHeldReason> = {};
  for (const index of held) heldReasons[index] = reasons[index] ?? 'other';
  return { state: current, raw: lines.join('\n'), held: { lines: held, reasons: heldReasons } };
}
