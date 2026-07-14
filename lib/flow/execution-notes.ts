export type MyFlowExecutionNoteKind = 'private' | 'source_correction';

export type MyFlowExecutionNote = {
  itemId: string;
  itemTitle: string;
  kind: MyFlowExecutionNoteKind;
  note: string;
  updatedAt: string;
  itemDate?: string;
  sourceUrl?: string;
};

export type MyFlowExecutionNoteInput = Omit<MyFlowExecutionNote, 'updatedAt'> & {
  updatedAt?: string;
};

export const MY_FLOW_EXECUTION_NOTE_MAX_LENGTH = 1000;

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getExecutionNoteIdentity(note: Pick<MyFlowExecutionNote, 'kind' | 'itemId'>): string {
  return `${note.kind}::${note.itemId}`;
}

function normalizeExecutionNote(value: unknown): MyFlowExecutionNote | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Partial<MyFlowExecutionNote>;
  const itemId = clean(source.itemId).slice(0, 500);
  const itemTitle = clean(source.itemTitle).slice(0, 1000);
  const note = clean(source.note).slice(0, MY_FLOW_EXECUTION_NOTE_MAX_LENGTH);
  const updatedAt = clean(source.updatedAt);
  const kind = source.kind === 'private' || source.kind === 'source_correction'
    ? source.kind
    : undefined;
  if (!itemId || !itemTitle || !note || !updatedAt || !kind) return undefined;
  const itemDate = /^\d{4}-\d{2}-\d{2}$/u.test(clean(source.itemDate))
    ? clean(source.itemDate)
    : undefined;
  const sourceUrl = kind === 'source_correction' && /^https?:\/\//u.test(clean(source.sourceUrl))
    ? clean(source.sourceUrl).slice(0, 2000)
    : undefined;
  return {
    itemId,
    itemTitle,
    kind,
    note,
    updatedAt,
    ...(itemDate ? { itemDate } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
  };
}

export function normalizeMyFlowExecutionNotes(value: unknown): MyFlowExecutionNote[] {
  if (!Array.isArray(value)) return [];
  const notes = new Map<string, MyFlowExecutionNote>();
  value.forEach((entry) => {
    const normalized = normalizeExecutionNote(entry);
    if (!normalized) return;
    notes.set(getExecutionNoteIdentity(normalized), normalized);
  });
  return Array.from(notes.values());
}

export function upsertMyFlowExecutionNote(
  current: unknown,
  input: MyFlowExecutionNoteInput,
  now = new Date().toISOString(),
): MyFlowExecutionNote[] {
  const notes = normalizeMyFlowExecutionNotes(current);
  const itemId = clean(input.itemId).slice(0, 500);
  const kind = input.kind;
  if (!itemId || (kind !== 'private' && kind !== 'source_correction')) return notes;
  const identity = `${kind}::${itemId}`;
  const withoutCurrent = notes.filter((note) => getExecutionNoteIdentity(note) !== identity);
  if (!clean(input.note)) return withoutCurrent;
  const normalized = normalizeExecutionNote({
    ...input,
    updatedAt: clean(input.updatedAt) || now,
  });
  return normalized ? [...withoutCurrent, normalized] : notes;
}

export function getMyFlowExecutionNotesForItem(
  notes: unknown,
  itemId: string,
): Partial<Record<MyFlowExecutionNoteKind, MyFlowExecutionNote>> {
  const normalizedItemId = clean(itemId);
  return Object.fromEntries(
    normalizeMyFlowExecutionNotes(notes)
      .filter((note) => note.itemId === normalizedItemId)
      .map((note) => [note.kind, note]),
  );
}
