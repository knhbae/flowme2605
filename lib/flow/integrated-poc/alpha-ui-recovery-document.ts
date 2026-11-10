import { canonicalJson } from './alpha-persistence/json';
import type { AlphaUiDraft, AlphaUiRecoveryPort, AlphaUiRecoveryRecord } from './alpha-ui-recovery';

/** Loaded history is kept separately: only input captured in this page's lifetime
 * may replace an earlier current-generation version of the same document. */
export type AlphaUiRecoveryDocuments = {
  loaded: AlphaUiDraft[];
  parked: AlphaUiDraft[];
  active: AlphaUiDraft[];
};
const copy = (drafts: readonly AlphaUiDraft[]) => drafts.map(draft => ({ ...draft }));

/** No document ID means no shared slot. Two temporary inputs, even identical
 * ones, remain separate entries in their editor's capture snapshot. */
export function latestAlphaUiDocumentDrafts(drafts: readonly AlphaUiDraft[]): AlphaUiDraft[] {
  const last = new Map<string, number>();
  drafts.forEach((draft, index) => { if (draft.documentId !== undefined) last.set(draft.documentId, index); });
  return drafts.filter((draft, index) => draft.documentId === undefined || last.get(draft.documentId) === index).map(draft => ({ ...draft }));
}

export function createAlphaUiRecoveryDocuments(loaded: readonly AlphaUiDraft[] = []): AlphaUiRecoveryDocuments {
  return { loaded: copy(loaded), parked: [], active: [] };
}

export function alphaUiRecoveryDocumentDrafts(state: AlphaUiRecoveryDocuments): AlphaUiDraft[] {
  return [...copy(state.loaded), ...latestAlphaUiDocumentDrafts([...state.parked, ...state.active])];
}

export function parkedAlphaUiRecoveryDocuments(state: AlphaUiRecoveryDocuments): AlphaUiDraft[] {
  return [...copy(state.loaded), ...copy(state.parked)];
}

/** Only the generic toast is quiet for a live B-held document copy. Loaded and
 * parked history keep their multiplicity; storage, badges and explicit A errors
 * do not pass through this filter. No classification is persisted. */
export function recoveryToastDraftsForHeldInput(announced: readonly AlphaUiDraft[], state: AlphaUiRecoveryDocuments,
  held: readonly AlphaUiDraft[]): AlphaUiDraft[] {
  const identity = (draft: AlphaUiDraft) => JSON.stringify([draft.documentId ?? null, draft.title, draft.raw]);
  const pair = (draft: AlphaUiDraft) => JSON.stringify([draft.documentId, draft.raw]);
  const protectedCounts = new Map<string, number>();
  for (const draft of [...state.loaded, ...state.parked]) {
    const key = identity(draft); protectedCounts.set(key, (protectedCounts.get(key) ?? 0) + 1);
  }
  const live = new Set(state.active.map(identity)), quiet = new Set(held.filter(draft => draft.documentId !== undefined).map(pair));
  return announced.filter(draft => {
    const key = identity(draft), protectedCount = protectedCounts.get(key) ?? 0;
    if (protectedCount) { protectedCounts.set(key, protectedCount - 1); return true; }
    return draft.documentId === undefined || !live.has(key) || !quiet.has(pair(draft));
  });
}

export function captureAlphaUiRecoveryDocuments(state: AlphaUiRecoveryDocuments, drafts: readonly AlphaUiDraft[]): AlphaUiRecoveryDocuments {
  if (!drafts.length) return state;
  const active = latestAlphaUiDocumentDrafts(drafts), live = new Set(active.flatMap(draft => draft.documentId === undefined ? [] : [draft.documentId]));
  // Editors report their complete live snapshot. A document no longer in that
  // snapshot stays parked until confirmed; editor replacement parks temporary
  // inputs explicitly before their capture port goes away.
  const parked = latestAlphaUiDocumentDrafts([...state.parked,
    ...state.active.filter(draft => draft.documentId !== undefined && !live.has(draft.documentId))])
    .filter(draft => draft.documentId === undefined || !live.has(draft.documentId));
  return { loaded: state.loaded, parked, active };
}

export function parkAlphaUiRecoveryDocuments(state: AlphaUiRecoveryDocuments): AlphaUiRecoveryDocuments {
  return { loaded: state.loaded, parked: latestAlphaUiDocumentDrafts([...state.parked, ...state.active]), active: [] };
}

export function keepAlphaUiRecoveryDocument(state: AlphaUiRecoveryDocuments, draft: AlphaUiDraft): AlphaUiRecoveryDocuments {
  return { loaded: state.loaded, parked: latestAlphaUiDocumentDrafts([...state.parked, draft]),
    active: state.active.filter(entry => draft.documentId === undefined || entry.documentId !== draft.documentId) };
}

export function loadAlphaUiRecoveryDocuments(state: AlphaUiRecoveryDocuments, drafts: readonly AlphaUiDraft[]): AlphaUiRecoveryDocuments {
  return { ...state, loaded: [...copy(drafts), ...copy(state.loaded)] };
}

/** Called only with an already verified server save. Read/compare/write keep the
 * existing storage CAS intact. The caller adopts the returned refs only after
 * the write succeeds, so a failed local write never drops its previous input. */
export function clearConfirmedAlphaUiRecoveryDocuments(port: AlphaUiRecoveryPort, state: AlphaUiRecoveryDocuments,
  confirmedRaw: (documentId: string) => string | undefined):
  { ok: true; state: AlphaUiRecoveryDocuments; record: AlphaUiRecoveryRecord | null } | { ok: false } {
  const saved = port.read();
  if (!saved.ok) return { ok: false };
  if (!saved.value) return { ok: true, state, record: null };
  const pair = (draft: AlphaUiDraft) => JSON.stringify([draft.documentId, draft.raw]);
  const confirmed = new Set(saved.value.drafts.filter(draft => draft.documentId !== undefined
    && confirmedRaw(draft.documentId) === draft.raw).map(pair));
  if (!confirmed.size) return { ok: true, state, record: saved.value };
  const retain = (drafts: readonly AlphaUiDraft[]) => drafts.filter(draft => !confirmed.has(pair(draft)));
  const remaining = retain(saved.value.drafts), current = port.read();
  if (!current.ok || canonicalJson(current.value) !== canonicalJson(saved.value)) return { ok: false };
  const persisted = remaining.length ? port.save(remaining) : port.clear(saved.value);
  if (!persisted.ok) return { ok: false };
  return { ok: true,
    state: { loaded: retain(state.loaded), parked: retain(state.parked), active: retain(state.active) },
    record: remaining.length ? { ...saved.value, drafts: remaining } : null };
}

export type AlphaUiRecoveryDocumentGroup = {
  key: string;
  title: string;
  entries: { draft: AlphaUiDraft; index: number }[];
};

/** Indices still address the original stored record, including every loaded
 * version. Temporary inputs are individual groups, never one null-ID group. */
export function groupAlphaUiRecoveryDocuments(drafts: readonly AlphaUiDraft[]): AlphaUiRecoveryDocumentGroup[] {
  const groups = new Map<string, AlphaUiRecoveryDocumentGroup>();
  drafts.forEach((draft, index) => {
    const key = draft.documentId === undefined ? `input:${index}` : `document:${draft.documentId}`;
    const group = groups.get(key) ?? { key, title: draft.title || '제목 없는 문서', entries: [] };
    group.title = draft.title || group.title;
    group.entries.push({ draft, index }); groups.set(key, group);
  });
  return [...groups.values()];
}
