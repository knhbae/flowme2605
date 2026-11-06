import {
  ALPHA_UI_RECOVERY_LIMITS, ALPHA_UI_RECOVERY_PREFIX,
  type AlphaUiDraft, type AlphaUiRecoveryPort,
} from './alpha-ui-recovery';
import { programIdentifier, programShape } from './program-data';
import { canonicalJson, parseAlphaJson } from './alpha-persistence/json';
import { recoveryDraftIdentity } from './saved-input-notice';

export const ALPHA_UI_RECOVERY_KEEP_SCHEMA = 'flowme-alpha-ui-recovery-keep/3' as const;
export const ALPHA_UI_RECOVERY_KEEP_PREFIX = 'flow:poc:personal-workspace:v1:alpha-ui-recovery-keep:v3:';
export const ALPHA_UI_RECOVERY_KEEP_LIMITS = Object.freeze({ quietMinutes: 30, refreshSeconds: 60 });
type Supersession = { documentId: string; throughSeq: number };
export type AlphaUiRecoveryKeepRecord = {
  schema: typeof ALPHA_UI_RECOVERY_KEEP_SCHEMA;
  ownerId: string; pageId: string; instance: string; seq: number;
  at: number; left: boolean; drafts: AlphaUiDraft[];
  /** A verified full session snapshot replaced this page's earlier versions of these document slots.
   * Parked versions in that snapshot remain in drafts. Absent document slots are never inferred discarded. */
  supersedes: Supersession[];
  /** Explicitly cleared drafts without a document slot. Keep this proof while earlier rows may remain. */
  released: AlphaUiDraft[];
};
export type AlphaUiRecoveryKeepStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
export type AlphaUiRecoveryKeepProof = { session: AlphaUiRecoveryPort; released?: readonly AlphaUiDraft[] };
export type AlphaUiRecoveryHandoff = { drafts: AlphaUiDraft[]; take(session: AlphaUiRecoveryPort): Promise<boolean> };
/** P3c logout: this account's input kept on this device outside the tab, and the rows that hold it. */
export type AlphaUiRecoveryDevice = { drafts: AlphaUiDraft[]; rows: { key: string; raw: string }[] };
export interface AlphaUiRecoveryKeep {
  readonly key: string;
  /** Append an immutable generation. No deletion, overwrite, expiry or truncation occurs here. */
  put(drafts: readonly AlphaUiDraft[], left?: boolean, proof?: AlphaUiRecoveryKeepProof): boolean;
  /** take confirms receiver coverage, leaving every source key intact, including v3. */
  left(saved: (draft: AlphaUiDraft) => boolean): AlphaUiRecoveryHandoff;
  /** Own compaction also runs under the account lock and rechecks both stores. */
  clean(session: AlphaUiRecoveryPort): Promise<boolean>;
  /** P3c logout: this page's rows and the rows of pages that have left (their newest row says so), with their drafts.
   * Any other page may still be open, a quiet or background one too (the take after 30 quiet minutes is unchanged):
   * its rows are another tab's and are not listed. */
  device(): AlphaUiRecoveryDevice;
  /** P3c '지우고 로그아웃', the person's own choice: in the account lock, removes this page's rows and the rows of a page
   * that still has left with every row as listed, and this keep writes nothing after. A page that may be open, one
   * that came back or wrote after the listing, and unreadable rows stay. Without the lock nothing is removed. True
   * when no listed row is left. */
  erase(listed: AlphaUiRecoveryDevice['rows']): Promise<boolean>;
}

export function alphaUiRecoveryLockName(ownerId: string): string {
  if (!programIdentifier(ownerId)) throw Error('alpha-ui-invalid-identity');
  return `flowme:alpha-ui-recovery:v3:${encodeURIComponent(ownerId)}`;
}
const prefixFor = (version: number, ownerId: string) => `flow:poc:personal-workspace:v1:alpha-ui-recovery-keep:v${version}:${encodeURIComponent(ownerId)}:`;
const generationKey = (ownerId: string, pageId: string, instance: string, seq: number) => `${prefixFor(3, ownerId)}${encodeURIComponent(pageId)}:${instance}.${seq}`;
const identity = recoveryDraftIdentity;
const copy = (drafts: readonly AlphaUiDraft[]) => drafts.map(draft => ({ ...draft }));
function validDrafts(value: unknown, empty = true): value is AlphaUiDraft[] {
  return Array.isArray(value) && (empty || value.length > 0) && value.length <= ALPHA_UI_RECOVERY_LIMITS.drafts
    && value.every(draft => programShape(draft, ['title', 'raw', ...(Object.hasOwn(draft ?? {}, 'documentId') ? ['documentId'] : [])])
      && typeof draft.title === 'string' && draft.title.length <= ALPHA_UI_RECOVERY_LIMITS.titleChars
      && typeof draft.raw === 'string' && draft.raw.length <= ALPHA_UI_RECOVERY_LIMITS.rawChars
      && (!Object.hasOwn(draft, 'documentId') || programIdentifier(draft.documentId)));
}
const validInstance = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-z-]{1,64}$/i.test(value);
const validTime = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export function validateAlphaUiRecoveryKeep(value: unknown, ownerId: string): value is AlphaUiRecoveryKeepRecord {
  try {
    canonicalJson(value);
    if (!programShape(value, ['schema', 'ownerId', 'pageId', 'instance', 'seq', 'at', 'left', 'drafts', 'supersedes', 'released'])
      || value.schema !== ALPHA_UI_RECOVERY_KEEP_SCHEMA || value.ownerId !== ownerId || !programIdentifier(value.pageId)
      || !validInstance(value.instance) || !validTime(value.seq) || value.seq < 1 || !validTime(value.at)
      || typeof value.left !== 'boolean' || !validDrafts(value.drafts) || !validDrafts(value.released)
      || value.released.some(draft => draft.documentId !== undefined) || !Array.isArray(value.supersedes)) return false;
    const ids = new Set<string>(), seq = value.seq;
    return value.supersedes.every(entry => programShape(entry, ['documentId', 'throughSeq']) && programIdentifier(entry.documentId)
      && validTime(entry.throughSeq) && entry.throughSeq < seq && !ids.has(entry.documentId) && !!ids.add(entry.documentId));
  } catch { return false; }
}

type LegacyRecord = { schema: string; ownerId: string; pageId: string; at: number; left: boolean; drafts: AlphaUiDraft[]; instance?: string; seq?: number };
/** Old writers do not use the v3 lock. Their mutable v1 and immutable v2 keys are import-only, never deletion authority. */
function legacy(value: unknown, ownerId: string, version: number): value is LegacyRecord {
  try {
    if (!programShape(value, ['schema', 'ownerId', 'pageId', 'at', 'left', 'drafts', ...(version === 2 ? ['instance', 'seq'] : [])])
      || value.schema !== `flowme-alpha-ui-recovery-keep/${version}` || value.ownerId !== ownerId || !programIdentifier(value.pageId)
      || !validTime(value.at) || typeof value.left !== 'boolean' || !validDrafts(value.drafts, false) || value.drafts.length > 20
      || value.drafts.reduce((total, draft) => total + draft.title.length + draft.raw.length, 0) > 300_000) return false;
    return version === 1 || validInstance(value.instance) && validTime(value.seq) && value.seq > 0;
  } catch { return false; }
}

/** Sync publication never removes keys. Foreign keys remain read-only even under the account lock: handoff must not
 * rely on another client's Storage view having caught up. Only own-prefix compaction may remove, under the exclusive
 * account lock after both stores are checked. Age makes a page eligible to import, never eligible to lose unique RAW. */
export function createAlphaUiRecoveryKeep(storage: AlphaUiRecoveryKeepStorage | undefined, ownerId: string, pageId: string,
  now: () => number = Date.now): AlphaUiRecoveryKeep | null {
  if (!storage || !programIdentifier(ownerId) || !programIdentifier(pageId)) return null;
  try { void storage.length; } catch { return null; }
  const instance = (globalThis.crypto?.randomUUID?.() ?? `${now().toString(36)}-${Math.random().toString(36).slice(2)}`).replace(/[^0-9a-z-]/gi, '');
  const ownPrefix = generationKey(ownerId, pageId, instance, 0).slice(0, -1);
  let seq = 0, current: string | null = null, closed = false;
  type Row = { key: string; raw: string; value: AlphaUiRecoveryKeepRecord | LegacyRecord; version: number };
  function rows(): Row[] {
    const keys: string[] = [];
    for (let index = 0; index < storage!.length; index++) {
      const key = storage!.key(index);
      if (key && [1, 2, 3].some(version => key.startsWith(prefixFor(version, ownerId)))) keys.push(key);
    }
    return keys.flatMap(key => {
      const raw = storage!.getItem(key);
      try {
        if (raw === null) return [];
        const value = parseAlphaJson(raw);
        if (canonicalJson(value) !== raw) return [];
        if (validateAlphaUiRecoveryKeep(value, ownerId) && key === generationKey(ownerId, value.pageId, value.instance, value.seq)) return [{ key, raw, value, version: 3 }];
        for (const version of [1, 2]) if (legacy(value, ownerId, version)) {
          const expected = `${prefixFor(version, ownerId)}${encodeURIComponent(value.pageId)}${version === 2 ? `:${value.instance}.${value.seq}` : ''}`;
          if (key === expected) return [{ key, raw, value, version }];
        }
      } catch { /* Corrupt, unknown-schema and foreign-account rows are preserved byte-for-byte. */ }
      return [];
    }).sort((a, b) => a.value.at - b.value.at || (a.value.seq ?? 0) - (b.value.seq ?? 0) || a.key.localeCompare(b.key));
  }
  const mine = (all: Row[]) => all.filter(row => row.version === 3 && row.key.startsWith(ownPrefix));
  const modern = (row: Row) => row.value as AlphaUiRecoveryKeepRecord;
  function sessionDrafts(port: AlphaUiRecoveryPort): AlphaUiDraft[] | null {
    if (!port.key.startsWith(`${ALPHA_UI_RECOVERY_PREFIX}${encodeURIComponent(ownerId)}:`)) return null;
    const loaded = port.read();
    if (!loaded.ok || loaded.value && loaded.value.ownerId !== ownerId) return null;
    return loaded.value?.drafts ?? [];
  }
  function intervals(all: Row[]) {
    const result = new Map<string, number>();
    for (const row of all) if (row.version === 3) for (const entry of modern(row).supersedes)
      result.set(entry.documentId, Math.max(result.get(entry.documentId) ?? -1, entry.throughSeq));
    return result;
  }
  function effective(all: Row[]): AlphaUiDraft[] {
    const superseded = intervals(all), released = new Map<string, number>();
    for (const row of all) if (row.version === 3) for (const draft of modern(row).released)
      released.set(identity(draft), Math.max(released.get(identity(draft)) ?? -1, modern(row).seq - 1));
    return all.flatMap(row => row.value.drafts.filter(draft => row.version !== 3
      || (modern(row).seq > (draft.documentId ? superseded.get(draft.documentId) ?? -1 : -1)
        && modern(row).seq > (released.get(identity(draft)) ?? -1))));
  }
  function groups(all: Row[]) {
    const result = new Map<string, Row[]>();
    for (const row of all) {
      if (row.key.startsWith(ownPrefix)) continue;
      const group = JSON.stringify([row.version, row.value.pageId, row.value.instance ?? null]);
      result.set(group, [...result.get(group) ?? [], row]);
    }
    return [...result.values()].map(list => {
      list.sort((a, b) => a.version === 1 ? a.value.at - b.value.at : (a.value.seq ?? 0) - (b.value.seq ?? 0));
      return { list, newest: list.at(-1)!, drafts: effective(list) };
    }).filter(group => group.newest.value.left || group.newest.value.at < now() - ALPHA_UI_RECOVERY_KEEP_LIMITS.quietMinutes * 60_000);
  }
  async function locked(work: () => boolean): Promise<boolean> {
    try {
      const locks = globalThis.navigator?.locks;
      if (!locks || typeof locks.request !== 'function') return false;
      return await locks.request(alphaUiRecoveryLockName(ownerId), { mode: 'exclusive' }, lock => lock ? work() : false);
    } catch { return false; }
  }
  function remove(row: Row) {
    // Callers hold the account lock. The prefix guard also forbids future callers from removing foreign v3 rows.
    if (row.version !== 3 || !row.key.startsWith(ownPrefix) || storage!.getItem(row.key) !== row.raw) return false;
    storage!.removeItem(row.key);
    return storage!.getItem(row.key) === null;
  }
  return {
    get key() { return current ?? generationKey(ownerId, pageId, instance, seq + 1); },
    put(drafts, left = false, proof) {
      try {
        if (closed) return false;
        canonicalJson(drafts);
        if (proof?.released) canonicalJson(proof.released);
        if (!validDrafts(drafts)) return false;
        const all = mine(rows()), supersedes = intervals(all), released = copy(proof?.released ?? []).filter(draft => draft.documentId === undefined);
        if (proof) {
          const stored = sessionDrafts(proof.session);
          if (stored === null || canonicalJson(stored) !== canonicalJson(drafts) || !validDrafts(proof.released ?? [])
            || !!proof.released?.length && drafts.length > 0) return false;
        }
        // Consume sequence numbers even on failed writes/readback: a possibly published key is never reused.
        const next = ++seq;
        if (proof) for (const draft of [...drafts, ...proof.released ?? []]) if (draft.documentId) supersedes.set(draft.documentId, next - 1);
        const record: AlphaUiRecoveryKeepRecord = { schema: ALPHA_UI_RECOVERY_KEEP_SCHEMA, ownerId, pageId, instance, seq: next,
          at: now(), left, drafts: copy(drafts), supersedes: [...supersedes].map(([documentId, throughSeq]) => ({ documentId, throughSeq })), released };
        if (!validateAlphaUiRecoveryKeep(record, ownerId)) return false;
        const key = generationKey(ownerId, pageId, instance, next), raw = canonicalJson(record);
        if (storage.getItem(key) !== null) return false;
        storage.setItem(key, raw);
        if (storage.getItem(key) !== raw) return false;
        current = key;
        return true;
      } catch { return false; }
    },
    left(saved) {
      try {
        const found = groups(rows()), selected = new Set(found.flatMap(group => group.list.map(row => row.key)));
        const drafts = mergeAlphaUiRecoveryDrafts([], found.flatMap(group => group.drafts.filter(draft => !saved(draft))));
        return { drafts, take(session) {
          return locked(() => {
            const stored = sessionDrafts(session);
            if (stored === null) return false;
            const all = rows(), own = new Set(effective(mine(all)).map(identity)), inSession = new Set(stored.map(identity));
            let complete = true;
            // Confirm the copy inside the lock, but leave every foreign source untouched. A later lock holder may
            // still see an earlier Storage view, so mutual take must never depend on foreign removal propagation.
            for (const group of groups(all).filter(group => group.list.some(row => selected.has(row.key)))) {
              if (!group.drafts.every(draft => saved(draft) || own.has(identity(draft)) && inSession.has(identity(draft)))) complete = false;
            }
            return complete;
          });
        } };
      } catch { return { drafts: [], take: async () => false }; }
    },
    clean(session) {
      return locked(() => {
        const stored = sessionDrafts(session);
        if (stored === null) return false;
        const own = mine(rows()).sort((a, b) => modern(a).seq - modern(b).seq), newest = own.at(-1);
        if (!newest || newest.key !== current || canonicalJson(newest.value.drafts) !== canonicalJson(stored)) return false;
        const supersedes = intervals([newest]), exact = new Set(stored.map(identity));
        const released = own.filter(row => modern(row).released.length);
        let complete = true;
        for (const row of own) {
          if (row === newest || modern(row).released.length) continue;
          const covered = row.value.drafts.every(draft => exact.has(identity(draft))
            || !!draft.documentId && (supersedes.get(draft.documentId) ?? -1) >= modern(row).seq
            || released.some(proof => modern(proof).seq > modern(row).seq && modern(proof).released.some(item => identity(item) === identity(draft))));
          // The surviving newest row must carry every supersession proof of a removed row.
          if (covered && modern(row).supersedes.every(entry => (supersedes.get(entry.documentId) ?? -1) >= entry.throughSeq) && !remove(row)) complete = false;
        }
        return complete;
      });
    },
    device() {
      try {
        const all = rows(), own = mine(all), gone = groups(all).filter(group => group.newest.value.left);
        return { drafts: mergeAlphaUiRecoveryDrafts([], [...effective(own), ...gone.flatMap(group => group.drafts)]),
          rows: [...own, ...gone.flatMap(group => group.list)].map(({ key, raw }) => ({ key, raw })) };
      } catch { return { drafts: [], rows: [] }; }
    },
    erase(listed) {
      // The one removal of another page's rows outside compaction: the person chose to erase what they were shown.
      // The lock orders it with every other page's put, compaction and take; it rereads before removing, and a page
      // goes only while it has left and has written nothing since (one that came back may be open: it stays).
      return locked(() => {
        closed = true;
        const all = rows(), shown = new Map(listed.map(row => [row.key, row.raw]));
        const gone = new Set(groups(all).filter(group => group.newest.value.left && group.list.every(row => shown.get(row.key) === row.raw))
          .flatMap(group => group.list.map(row => row.key)));
        let complete = true;
        for (const row of all) {
          const own = row.version === 3 && row.key.startsWith(ownPrefix);
          if (!own && !shown.has(row.key)) continue;
          if (!own && !gone.has(row.key)) { complete = false; continue; }
          if (storage!.getItem(row.key) !== row.raw) { complete = false; continue; }
          storage!.removeItem(row.key);
          if (storage!.getItem(row.key) !== null) complete = false;
        }
        for (const [key, raw] of shown) if (storage!.getItem(key) === raw) complete = false;
        return complete;
      });
    },
  };
}

/** Stable last-occurrence order keeps a newly captured draft at the end without altering any RAW bytes. */
export function mergeAlphaUiRecoveryDrafts(parked: readonly AlphaUiDraft[], active: readonly AlphaUiDraft[]): AlphaUiDraft[] {
  const all = [...parked, ...active], last = new Map(all.map((draft, index) => [identity(draft), index]));
  return all.filter((draft, index) => last.get(identity(draft)) === index).map(draft => ({ ...draft }));
}

/** Session save stays synchronous and authoritative for its existing fallback. Shared failures are retried on the
 * next save; take() independently proves shared coverage, so session-only success never deletes a source. */
export function keepAlphaUiRecovery(port: AlphaUiRecoveryPort, keep: AlphaUiRecoveryKeep, now: () => number = Date.now):
  AlphaUiRecoveryPort & { leave(): void; back(): void; erase(listed: AlphaUiRecoveryDevice['rows']): Promise<boolean> } {
  let last: AlphaUiDraft[] = [], wrote = -Infinity;
  function write(drafts: AlphaUiDraft[], left = false, released?: readonly AlphaUiDraft[]) {
    const ok = keep.put(drafts, left, { session: port, released });
    wrote = ok ? now() : -Infinity;
    if (ok) void keep.clean(port);
  }
  return {
    key: port.key,
    read() { const result = port.read(); if (result.ok) last = copy(result.value?.drafts ?? []); return result; },
    save(drafts) {
      const result = port.save(drafts);
      if (result.ok) {
        const next = copy(result.value?.drafts ?? []);
        if (canonicalJson(next) !== canonicalJson(last) || now() - wrote >= ALPHA_UI_RECOVERY_KEEP_LIMITS.refreshSeconds * 1000) write(next);
        last = next;
      }
      return result;
    },
    clear(expected) {
      const before = port.read(), result = port.clear(expected);
      if (result.ok) { last = []; write([], false, before.ok ? before.value?.drafts : undefined); }
      return result;
    },
    leave() { write(last, true); },
    back() { write(last, false); },
    /** P3c '지우고 로그아웃': the rows outside the tab first (in the lock), then this tab's copy, with no new row. */
    async erase(listed) {
      if (!await keep.erase(listed)) return false;
      last = [];
      return port.clear().ok;
    },
  };
}
