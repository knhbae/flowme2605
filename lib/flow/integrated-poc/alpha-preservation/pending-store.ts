import { isPreservationCommand, PRESERVATION_PROTOCOL, type PreservationCommand } from './contract';
import { programShape } from '../program-data';

export type PreservationPending = { raw: string; actorId: string; mode: 'import' | 'restore'; command: PreservationCommand };
export const PRESERVATION_PENDING_DATABASE = 'flow:poc:personal-workspace:v1:alpha-m6:pending';
export const PRESERVATION_PENDING_STORE = 'owner-requests-v1';
export const preservationPendingLegacyKey = (owner: string) => `${PRESERVATION_PENDING_DATABASE}:${owner}`;
export interface PendingPort {
  transact(owner: string, update?: (current: unknown) => PreservationPending | null): Promise<unknown>;
}
const validOwner = (owner: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(owner);
export function validPreservationPending(value: unknown): value is PreservationPending {
  return programShape(value, ['raw', 'actorId', 'mode', 'command']) && typeof value.raw === 'string'
    && new TextEncoder().encode(value.raw).length <= PRESERVATION_PROTOCOL.bytes && typeof value.actorId === 'string'
    && isPreservationCommand(value.command) && value.mode === value.command.mode;
}
const same = (a: PreservationPending, b: PreservationPending) => a.raw === b.raw && a.actorId === b.actorId
  && a.mode === b.mode && JSON.stringify(a.command) === JSON.stringify(b.command);

/** Transaction completion, not request success, is the durable-before-network boundary. */
export function indexedPendingPort(factory: IDBFactory): PendingPort {
  return { async transact(owner, update) {
    if (!validOwner(owner)) throw Error('invalid-pending-owner');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = factory.open(PRESERVATION_PENDING_DATABASE, 1); let abandoned = false;
      opening.onupgradeneeded = () => { opening.result.createObjectStore(PRESERVATION_PENDING_STORE); };
      opening.onerror = () => reject(opening.error ?? Error('pending-open-failed'));
      opening.onblocked = () => { abandoned = true; reject(Error('pending-blocked')); };
      opening.onsuccess = () => { if (abandoned) opening.result.close(); else resolve(opening.result); };
    });
    try { return await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(PRESERVATION_PENDING_STORE, update ? 'readwrite' : 'readonly');
      const store = tx.objectStore(PRESERVATION_PENDING_STORE); let result: unknown; let failure: unknown;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure ?? tx.error ?? Error('pending-aborted'));
      tx.onerror = () => { /* onabort rejects the transaction. */ };
      const read = store.get(owner);
      read.onsuccess = () => {
        try {
          const current = read.result ?? null;
          result = update ? update(current) : current;
          if (update) { if (result === null) store.delete(owner); else store.put(result, owner); }
        } catch (error) { failure = error; tx.abort(); }
      };
    }); } finally { db.close(); }
  } };
}

export function createPreservationPendingStore(port: PendingPort, legacy: Pick<Storage, 'getItem' | 'removeItem'>) {
  const check = (owner: string) => { if (!validOwner(owner)) throw Error('invalid-pending-owner'); };
  const decode = (value: unknown): PreservationPending | null => {
    if (value === null) return null;
    if (!validPreservationPending(value)) throw Error('invalid-pending');
    return value;
  };
  const old = (owner: string) => {
    const raw = legacy.getItem(preservationPendingLegacyKey(owner));
    return { raw, pending: raw === null ? null : decode(JSON.parse(raw)) };
  };
  return {
    async load(owner: string) {
      check(owner); const previous = old(owner);
      const value = decode(await port.transact(owner, current => {
        const saved = decode(current);
        if (saved && previous.pending && !same(saved, previous.pending)) throw Error('pending-conflict');
        return saved ?? previous.pending;
      }));
      // Legacy removal follows a committed, matching IDB copy only.
      if (previous.pending && value && same(value, previous.pending)
        && legacy.getItem(preservationPendingLegacyKey(owner)) === previous.raw) legacy.removeItem(preservationPendingLegacyKey(owner));
      return value;
    },
    async save(owner: string, pending: PreservationPending) {
      check(owner); if (!validPreservationPending(pending)) throw Error('invalid-pending');
      await port.transact(owner, current => {
        const saved = decode(current);
        if (saved && !same(saved, pending)) throw Error('pending-conflict');
        return pending;
      });
    },
    async remove(owner: string, requestId: string) {
      check(owner);
      await port.transact(owner, current => {
        const saved = decode(current);
        return saved?.command.requestId === requestId ? null : saved;
      });
      const previous = old(owner);
      if (previous.pending?.command.requestId === requestId
        && legacy.getItem(preservationPendingLegacyKey(owner)) === previous.raw) legacy.removeItem(preservationPendingLegacyKey(owner));
    },
  };
}
export function browserPreservationPendingStore() {
  return createPreservationPendingStore(indexedPendingPort(indexedDB), sessionStorage);
}
