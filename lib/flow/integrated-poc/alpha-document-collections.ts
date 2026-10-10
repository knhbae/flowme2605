import { commitDocumentCollectionLinks, emptyDocumentCollections, isDocumentCollections, type DocumentCollections } from './document-collections';

export type AlphaDocumentCollectionsStorage = {
  getItem(key: string): string | null;
  setItem(key: string, raw: string): void;
};
/** The host supplies navigator.locks.request(name, { mode: 'exclusive' }, work). */
export type AlphaDocumentCollectionsExclusive = <T>(name: string, work: () => T | Promise<T>) => Promise<T>;
/** Obtain these from the current session/controller, not a captured account. */
export type AlphaDocumentCollectionsAuthority = {
  ownerId: string | null;
  documentIds: readonly string[];
  busy: boolean;
  pending: boolean;
  blocked: boolean;
  sessionValid: boolean;
};
export type AlphaDocumentCollectionsError = 'disposed' | 'session' | 'authority-unavailable' | 'busy' | 'pending' | 'conflict'
  | 'invalid' | 'foreign-document' | 'unavailable-document' | 'invalid-storage' | 'local-storage-unavailable'
  | 'locks-unavailable' | 'readback-failed';
export type AlphaDocumentCollectionsResult = { ok: true; changed: boolean } | { ok: false; reason: AlphaDocumentCollectionsError };
export type AlphaDocumentCollectionsSnapshot = {
  readonly ownerId: string;
  readonly key: string;
  readonly value: DocumentCollections | null;
  readonly busy: boolean;
  readonly writable: boolean;
  readonly reason: AlphaDocumentCollectionsError | null;
};

export function alphaDocumentCollectionsKey(ownerId: string): string {
  if (typeof ownerId !== 'string' || !ownerId.trim() || ownerId.length > 1200
    || ['__proto__', 'prototype', 'constructor'].includes(ownerId)) throw Error('alpha-collections-invalid-owner');
  return `flowme:alpha:document-collections:v1:${encodeURIComponent(ownerId)}`;
}
const copy = (value: DocumentCollections): DocumentCollections => JSON.parse(JSON.stringify(value)) as DocumentCollections;
const fail = (reason: AlphaDocumentCollectionsError): AlphaDocumentCollectionsResult => ({ ok: false, reason });

/** Optional account-owned browser relation. Never bootstraps data, repairs bytes,
 * removes storage, migrates folders, or sends a server command. A new adapter is
 * required after disposal/account replacement or an unconfirmed storage write.
 */
export function createAlphaDocumentCollections(ownerId: string, storage: AlphaDocumentCollectionsStorage | null,
  exclusive: AlphaDocumentCollectionsExclusive | null, authority: () => AlphaDocumentCollectionsAuthority | null) {
  const key = alphaDocumentCollectionsKey(ownerId);
  let observed: string | null = null, value: DocumentCollections | null = null;
  let blocked: AlphaDocumentCollectionsError | null = null, disposed = false, revoked = false, busy = false;
  if (!storage) blocked = 'local-storage-unavailable';
  else {
    try {
      observed = storage.getItem(key);
      if (observed === null) value = emptyDocumentCollections();
      else {
        const parsed: unknown = JSON.parse(observed);
        // The existing commit emits exact JSON.stringify bytes. Reject duplicate
        // keys or other ambiguous bytes rather than normalizing them on load.
        if (!isDocumentCollections(parsed) || JSON.stringify(parsed) !== observed) blocked = 'invalid-storage';
        else value = parsed;
      }
    } catch { blocked = observed === null ? 'local-storage-unavailable' : 'invalid-storage'; }
  }
  if (!blocked && !exclusive) blocked = 'locks-unavailable';

  function currentAuthority(): { ok: true; value: AlphaDocumentCollectionsAuthority } | { ok: false; reason: AlphaDocumentCollectionsError } {
    if (disposed) return { ok: false, reason: 'disposed' };
    if (revoked) return { ok: false, reason: 'session' };
    try {
      const current = authority();
      if (!current) return { ok: false, reason: 'authority-unavailable' };
      if (current.ownerId !== ownerId) { revoked = true; return { ok: false, reason: 'session' }; }
      if (current.sessionValid !== true) return { ok: false, reason: 'session' };
      if (current.busy !== false) return { ok: false, reason: 'busy' };
      if (current.pending !== false) return { ok: false, reason: 'pending' };
      if (current.blocked !== false) return { ok: false, reason: 'conflict' };
      if (!Array.isArray(current.documentIds) || !current.documentIds.every(id => typeof id === 'string' && !!id.trim())) {
        return { ok: false, reason: 'authority-unavailable' };
      }
      return { ok: true, value: { ...current, documentIds: [...current.documentIds] } };
    } catch { return { ok: false, reason: 'authority-unavailable' }; }
  }
  function validateLinks(next: DocumentCollections, current: AlphaDocumentCollectionsAuthority): AlphaDocumentCollectionsError | null {
    const owned = new Set(current.documentIds);
    for (const row of next.collections) {
      const prior = value!.collections.find(entry => entry.id === row.id);
      if (row.documentIds.some(id => !prior?.documentIds.includes(id) && !owned.has(id))) return 'foreign-document';
    }
    for (const prior of value!.collections) {
      const row = next.collections.find(entry => entry.id === prior.id);
      if (prior.documentIds.some(id => !owned.has(id) && !row?.documentIds.includes(id))) return 'unavailable-document';
    }
    return null;
  }
  const block = (reason: AlphaDocumentCollectionsError) => { blocked = reason; return fail(reason); };
  return {
    snapshot(): AlphaDocumentCollectionsSnapshot {
      const current = currentAuthority();
      const reason = current.ok ? busy ? 'busy' : blocked : current.reason;
      const hidden = reason === 'session' || reason === 'disposed' || reason === 'authority-unavailable';
      return { ownerId, key, value: hidden || !value ? null : copy(value), busy, writable: reason === null, reason };
    },
    async change(build: (current: DocumentCollections) => DocumentCollections): Promise<AlphaDocumentCollectionsResult> {
      const initial = currentAuthority();
      if (!initial.ok) return fail(initial.reason);
      if (busy) return fail('busy');
      if (blocked) return fail(blocked);
      if (!storage || !value) return fail('local-storage-unavailable');
      if (!exclusive) return fail('locks-unavailable');
      busy = true;
      let entered = false;
      try {
        return await exclusive(`${key}:write`, () => {
          // An invalid/misbehaving port cannot run the same change twice.
          if (entered) return fail('invalid');
          entered = true;
          const locked = currentAuthority();
          if (!locked.ok) return fail(locked.reason);
          let next: DocumentCollections;
          try {
            const proposed: unknown = build(copy(value!));
            if (!isDocumentCollections(proposed)) return fail('invalid');
            next = copy(proposed);
            if (!isDocumentCollections(next)) return fail('invalid');
          } catch { return fail('invalid'); }
          const checked = currentAuthority();
          if (!checked.ok) return fail(checked.reason);
          const relationError = validateLinks(next, checked.value);
          if (relationError) return fail(relationError);
          let portError: AlphaDocumentCollectionsError | null = null, reads = 0;
          const read = () => {
            try { reads++; return storage.getItem(key); }
            catch { portError = 'local-storage-unavailable'; throw Error('alpha-collections-local-read'); }
          };
          const write = (raw: string) => {
            // Recheck after the transform and the CAS read, immediately before
            // the only write. A stale callback has no storage authority.
            const current = currentAuthority();
            if (!current.ok) { portError = current.reason; throw Error('alpha-collections-stale-authority'); }
            const error = validateLinks(next, current.value);
            if (error) { portError = error; throw Error('alpha-collections-stale-document'); }
            try { storage.setItem(key, raw); }
            catch { portError = 'local-storage-unavailable'; throw Error('alpha-collections-local-write'); }
          };
          // Null is the only empty baseline. An unchanged empty relation (or
          // unchanged loaded relation) checks CAS without creating storage.
          if (JSON.stringify(next) === JSON.stringify(value)) {
            try {
              if (read() !== observed) return block('conflict');
              const current = currentAuthority();
              return current.ok ? { ok: true, changed: false } : fail(current.reason);
            }
            catch { return block('local-storage-unavailable'); }
          }
          const result = commitDocumentCollectionLinks({ read, write }, observed, next);
          if (!result.ok) {
            const reason = portError ?? (reads > 1 ? 'readback-failed' : 'conflict');
            return ['local-storage-unavailable', 'readback-failed', 'conflict'].includes(reason) ? block(reason) : fail(reason);
          }
          observed = result.raw; value = next;
          return { ok: true, changed: result.changed };
        });
      } catch { return block('locks-unavailable'); }
      finally { busy = false; }
    },
    dispose() { disposed = true; },
  };
}
