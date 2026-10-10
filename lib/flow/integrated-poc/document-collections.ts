/** Local candidate relation only. Never stored inside the v11 workspace or an Alpha command. */
export type DocumentCollection = { id: string; title: string; documentIds: string[] };
export type DocumentCollections = { version: 1; collections: DocumentCollection[] };
export const emptyDocumentCollections = (): DocumentCollections => ({ version: 1, collections: [] });
const identifier = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 1200;
export function isDocumentCollections(value: unknown): value is DocumentCollections {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as DocumentCollections;
  return Object.keys(state).sort().join(',') === 'collections,version' && state.version === 1
    && Array.isArray(state.collections) && state.collections.length <= 100
    && new Set(state.collections.map(row => row?.id)).size === state.collections.length
    && state.collections.every(row => row && Object.keys(row).sort().join(',') === 'documentIds,id,title'
      && identifier(row.id) && typeof row.title === 'string' && !!row.title.trim() && row.title.length <= 100
      && Array.isArray(row.documentIds) && row.documentIds.length <= 1000 && row.documentIds.every(identifier)
      && new Set(row.documentIds).size === row.documentIds.length);
}
export function addDocumentCollection(state: DocumentCollections, id: string, title: string): DocumentCollections {
  const next: DocumentCollections = { ...state, collections: [...state.collections, { id, title: title.trim(), documentIds: [] }] };
  return isDocumentCollections(next) ? next : state;
}
/** Idempotent whole-document relation; no body, task scope, Item or ProgramData parameter. */
export function setDocumentCollectionLink(state: DocumentCollections, collectionId: string, documentId: string, linked: boolean): DocumentCollections {
  if (!identifier(documentId) || !state.collections.some(row => row.id === collectionId)) return state;
  const next: DocumentCollections = { ...state, collections: state.collections.map(row => row.id !== collectionId ? row : {
    ...row, documentIds: linked ? [...new Set([...row.documentIds, documentId])] : row.documentIds.filter(id => id !== documentId),
  }) };
  return isDocumentCollections(next) ? next : state;
}
export function collectionDocumentIds(state: DocumentCollections, collectionIds: string[]): Set<string> {
  const selected = new Set(collectionIds);
  return new Set(state.collections.filter(row => selected.has(row.id)).flatMap(row => row.documentIds));
}
/** Call under the trial host's existing Web Lock. No writes for an equal relation. */
export function commitDocumentCollectionLinks(port: { read(): string | null; write(raw: string): void }, expected: string | null, next: DocumentCollections): { ok: true; changed: boolean; raw: string } | { ok: false } {
  if (!isDocumentCollections(next)) return { ok: false };
  try {
    if (port.read() !== expected) return { ok: false };
    const raw = JSON.stringify(next);
    if (raw === expected) return { ok: true, changed: false, raw };
    port.write(raw);
    return port.read() === raw ? { ok: true, changed: true, raw } : { ok: false };
  } catch { return { ok: false }; }
}
