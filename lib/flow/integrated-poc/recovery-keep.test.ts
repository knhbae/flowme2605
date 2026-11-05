import assert from 'node:assert/strict';
import test from 'node:test';
import { createAlphaUiRecovery, type AlphaUiDraft } from './alpha-ui-recovery';
import {
  ALPHA_UI_RECOVERY_KEEP_PREFIX, alphaUiRecoveryLockName, createAlphaUiRecoveryKeep,
  keepAlphaUiRecovery, mergeAlphaUiRecoveryDrafts, validateAlphaUiRecoveryKeep,
} from './alpha-ui-recovery-keep';
import { canonicalJson } from './alpha-persistence/json';

const OWNER = 'synthetic-owner', TIME = Date.UTC(2026, 10, 6, 10);
const draft = (raw: string, documentId = 'document-a'): AlphaUiDraft => ({ documentId, title: '작성 문서', raw });
class Locks {
  active = 0;
  names: string[] = [];
  tail = Promise.resolve();
  request<T>(name: string, options: { mode: string }, callback: (lock: { name: string; mode: string }) => T | Promise<T>): Promise<T> {
    assert.equal(options.mode, 'exclusive');
    this.names.push(name);
    const pending = this.tail.then(async () => {
      assert.equal(this.active++, 0);
      try { return await callback({ name, mode: options.mode }); } finally { this.active--; }
    });
    this.tail = pending.then(() => undefined, () => undefined);
    return pending;
  }
}
class Storage {
  values = new Map<string, string>();
  writes = new Map<string, number>();
  removed: string[] = [];
  failWrite: (key: string) => boolean = () => false;
  afterRead: ((key: string, value: string | null) => void) | null = null;
  constructor(readonly locks?: Locks) {}
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) {
    const value = this.values.get(key) ?? null;
    this.afterRead?.(key, value);
    return value;
  }
  setItem(key: string, value: string) {
    if (this.failWrite(key)) throw Error('synthetic-quota');
    this.writes.set(key, (this.writes.get(key) ?? 0) + 1);
    this.values.set(key, value);
  }
  removeItem(key: string) {
    if (this.locks) assert.equal(this.locks.active, 1, 'all shared removes require the account lock');
    this.removed.push(key); this.values.delete(key);
  }
}
async function withLocks(work: (locks: Locks) => unknown | Promise<unknown>, enabled = true) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator'), locks = new Locks();
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: enabled ? { locks } : {} });
  try { await work(locks); await locks.tail; }
  finally {
    if (previous) Object.defineProperty(globalThis, 'navigator', previous);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
}
function client(shared: Storage, pageId: string, now: () => number = () => TIME, ownerId = OWNER) {
  const session = new Storage(), port = createAlphaUiRecovery(session, { ownerId, slotId: pageId });
  const keep = createAlphaUiRecoveryKeep(shared, ownerId, pageId, now)!;
  assert(keep);
  const ui = keepAlphaUiRecovery(port, keep, now);
  assert(ui.read().ok);
  return { session, port, keep, ui };
}
function next(shared: Storage, now = TIME + 1, owner = OWNER) {
  return createAlphaUiRecoveryKeep(shared, owner, 'next-page', () => now)!.left(() => false).drafts;
}
const has = (shared: Storage, raw: string) => next(shared).some(item => item.raw === raw);

test('close/reopen returns exactly one latest document RAW even before async compaction, with exact Unicode and LF', async () => {
  await withLocks(async locks => {
    const shared = new Storage(locks), a = client(shared, 'page-a');
    assert(a.ui.save([draft('입력 중')]).ok);
    assert(a.ui.save([draft('입력 중간\n')]).ok);
    const latest = '한글 조합 e\u0301\r\n\n마지막 줄  ';
    assert(a.ui.save([draft(latest)]).ok);
    a.ui.leave();
    assert.deepEqual(next(shared), [draft(latest)]);
    await a.keep.clean(a.port);
    assert.deepEqual(next(shared), [draft(latest)]);
    assert([...shared.writes.values()].every(count => count === 1));
    assert(locks.names.every(name => name === alphaUiRecoveryLockName(OWNER)));
  });
});

test('a full verified snapshot keeps protected parked versions and distinct document/no-slot RAW', async () => {
  await withLocks(async locks => {
    const shared = new Storage(locks), a = client(shared, 'page-a');
    const parked = draft('거절되어 보관한 원문'), active = draft('현재 입력');
    assert(a.ui.save([parked, active]).ok);
    const newest = draft('현재 최신 입력');
    assert(a.ui.save([parked, newest]).ok);
    a.ui.leave(); await a.keep.clean(a.port);
    assert.deepEqual(next(shared), [parked, newest]);
    const other = draft('다른 문서 원문', 'document-b'), noSlot = { title: '별도 입력', raw: '문서 ID 없는 고유 원문' };
    assert(a.ui.save([other, noSlot]).ok);
    a.ui.leave(); await a.keep.clean(a.port);
    const recovered = next(shared);
    for (const item of [parked, newest, other, noSlot]) assert(recovered.some(value => canonicalJson(item) === canonicalJson(value)));
  });
});

test('F1 stale tidy snapshot cannot expire or evict another page newest generation', async () => {
  await withLocks(async locks => {
    let time = TIME - 8 * 86_400_000;
    const shared = new Storage(locks), a = client(shared, 'page-a', () => time), b = client(shared, 'page-b');
    assert(a.ui.save([draft('이전 세대')]).ok); a.ui.leave(); await locks.tail;
    const found = b.keep.left(() => false);
    assert(b.ui.save(found.drafts).ok); await locks.tail;
    let release!: () => void, entered!: () => void;
    const ready = new Promise<void>(resolve => { entered = resolve; });
    const held = locks.request(alphaUiRecoveryLockName(OWNER), { mode: 'exclusive' }, async () => {
      entered(); await new Promise<void>(resolve => { release = resolve; });
    });
    await ready;
    const taking = found.take(b.port);
    time = TIME;
    assert(a.ui.save([draft('갱신된 최신 세대')]).ok); a.ui.leave();
    release(); await held;
    assert.equal(await taking, false, 'take must reread the newer source union inside the lock');
    await locks.tail;
    assert(has(shared, '갱신된 최신 세대'));
    assert.equal(shared.values.has(a.keep.key), true);
  });
});

test('F1 post-compare refresh writes a different immutable key; compare/remove cannot delete it', async () => {
  await withLocks(async locks => {
    const shared = new Storage(locks), a = client(shared, 'page-a'), b = client(shared, 'page-b');
    assert(a.ui.save([draft('읽은 세대')]).ok); a.ui.leave(); await locks.tail;
    const sourceKey = a.keep.key, found = b.keep.left(() => false);
    assert(b.ui.save(found.drafts).ok); await locks.tail;
    let refreshed = false;
    shared.afterRead = key => {
      if (key !== sourceKey) return;
      shared.afterRead = null; refreshed = true;
      assert(a.ui.save([draft('비교 직후 최신 RAW')]).ok); a.ui.leave();
    };
    await found.take(b.port); await locks.tail;
    assert(refreshed);
    assert.notEqual(a.keep.key, sourceKey);
    assert(has(shared, '비교 직후 최신 RAW'));
    assert.equal(shared.values.has(a.keep.key), true);
    assert([...shared.writes.values()].every(count => count === 1));
  });
});

test('old mutable v1 and old immutable v2 copies are readable but never overwritten or removed', async () => {
  await withLocks(async locks => {
    const shared = new Storage(locks), b = client(shared, 'page-b');
    const key1 = `flow:poc:personal-workspace:v1:alpha-ui-recovery-keep:v1:${OWNER}:legacy-page`;
    const key2 = `flow:poc:personal-workspace:v1:alpha-ui-recovery-keep:v2:${OWNER}:legacy-two:instance.1`;
    const record = { schema: 'flowme-alpha-ui-recovery-keep/1', ownerId: OWNER, pageId: 'legacy-page', at: TIME - 9 * 86_400_000, left: true, drafts: [draft('호환 이전 원문')] };
    shared.setItem(key1, canonicalJson(record));
    shared.setItem(key2, canonicalJson({ ...record, schema: 'flowme-alpha-ui-recovery-keep/2', pageId: 'legacy-two', instance: 'instance', seq: 1 }));
    const found = b.keep.left(() => false); assert.equal(found.drafts.length, 1);
    assert(b.ui.save(found.drafts).ok); await locks.tail;
    shared.afterRead = key => {
      if (key !== key1) return;
      shared.afterRead = null;
      shared.setItem(key1, canonicalJson({ ...record, at: TIME, drafts: [draft('호환 비교 뒤 최신')] }));
    };
    await found.take(b.port); await locks.tail;
    assert(shared.values.has(key1)); assert(shared.values.has(key2));
    assert(has(shared, '호환 비교 뒤 최신'));
    assert(!shared.removed.includes(key1)); assert(!shared.removed.includes(key2));
  });
});

test('mutual dedup: two successful puts never remove another page, including eight-page/size pressure', async () => {
  await withLocks(async locks => {
    const shared = new Storage(locks);
    for (let index = 0; index < 9; index++) {
      const seed = client(shared, `seed-${index}`);
      assert(seed.ui.save([draft(`${index}:` + '보존'.repeat(40_000), `document-${index}`)]).ok); seed.ui.leave();
    }
    const a = client(shared, 'page-a'), b = client(shared, 'page-b'), same = draft('동시에 중복 저장한 RAW');
    assert(a.ui.save([same]).ok); assert(b.ui.save([same]).ok);
    a.ui.leave(); b.ui.leave(); await locks.tail;
    assert(has(shared, same.raw));
    assert(next(shared).length >= 10);
    assert([...shared.writes.values()].every(count => count === 1));
  });
});

test('mutual take: same-RAW saves within 60s cannot delete both durable current copies', async () => {
  await withLocks(async locks => {
    const shared = new Storage(locks), a = client(shared, 'page-a'), b = client(shared, 'page-b'), same = draft('상호 인계 RAW');
    assert(a.ui.save([same]).ok); assert(b.ui.save([same]).ok); a.ui.leave(); b.ui.leave(); await locks.tail;
    const fromB = a.keep.left(() => false), fromA = b.keep.left(() => false);
    const before = shared.writes.size;
    assert(a.ui.save([same]).ok); assert(b.ui.save([same]).ok);
    assert.equal(shared.writes.size, before, 'replay the old same-RAW throttle precondition');
    const results = await Promise.all([fromB.take(a.port), fromA.take(b.port)]);
    assert(results.some(Boolean));
    assert(has(shared, same.raw));
    assert.deepEqual(next(shared), [same]);
  });
});

test('take waits for the account lock and rechecks eligibility and receiver proof after acquisition', async () => {
  await withLocks(async locks => {
    const shared = new Storage(locks), a = client(shared, 'page-a'), b = client(shared, 'page-b');
    assert(a.ui.save([draft('열린 페이지 원문')]).ok); a.ui.leave(); await locks.tail;
    const found = b.keep.left(() => false); assert(b.ui.save(found.drafts).ok); await locks.tail;
    let release!: () => void, entered!: () => void;
    const ready = new Promise<void>(resolve => { entered = resolve; });
    const hold = locks.request(alphaUiRecoveryLockName(OWNER), { mode: 'exclusive' }, async () => {
      entered(); await new Promise<void>(resolve => { release = resolve; });
    });
    await ready;
    const taking = found.take(b.port);
    a.ui.back();
    release(); await hold; await taking; await locks.tail;
    assert(shared.values.has(a.keep.key), 'a returned source is ineligible when take acquires its lock');
  });
});

test('F2 quota fallback preserves the source, and the unchanged next save retries the shared mirror', async () => {
  await withLocks(async locks => {
    const shared = new Storage(locks), a = client(shared, 'page-a'), b = client(shared, 'page-b');
    const raw = 'quota 실패 후에도 남을 원문';
    assert(a.ui.save([draft(raw)]).ok); a.ui.leave(); await locks.tail;
    const found = b.keep.left(() => false);
    shared.failWrite = key => key.includes(':page-b:');
    assert(b.ui.save(found.drafts).ok, 'the existing session-only fallback still succeeds');
    assert.equal(await found.take(b.port), false);
    b.ui.leave(); assert(has(shared, raw)); assert(shared.values.has(a.keep.key));
    shared.failWrite = () => false;
    assert(b.ui.save(found.drafts).ok);
    assert.equal(await found.take(b.port), true);
    b.ui.leave(); await locks.tail;
    assert.deepEqual(next(shared), [draft(raw)]);
  });
});

test('F3 reload merge keeps all 21 unique drafts past historical count/size limits, with latest last', async () => {
  await withLocks(async locks => {
    const shared = new Storage(locks), old = client(shared, 'old-page'), recent = client(shared, 'recent-page'), receiver = client(shared, 'receiver');
    const older = Array.from({ length: 20 }, (_, index) => draft(`${index}:` + '옛'.repeat(17_000), `old-doc-${index}`));
    const newest = draft('가장 최신 미저장 RAW', 'latest-doc');
    assert(old.ui.save(older).ok); old.ui.leave(); assert(recent.ui.save([newest]).ok); recent.ui.leave(); await locks.tail;
    // A duplicated/reloaded tab already has the newest draft in sessionStorage.
    assert(receiver.ui.save([newest]).ok);
    const found = receiver.keep.left(() => false);
    const merged = mergeAlphaUiRecoveryDrafts(found.drafts, [newest]);
    assert.equal(merged.length, 21); assert.deepEqual(merged.at(-1), newest);
    assert(receiver.ui.save(merged).ok); assert.equal(await found.take(receiver.port), true);
    receiver.ui.leave(); await locks.tail;
    assert.equal(next(shared).length, 21); assert(has(shared, newest.raw));
    assert(next(shared).reduce((sum, item) => sum + item.raw.length, 0) > 300_000);
  });
});

test('unique older RAW survives expiry and own later different-document cleanup', async () => {
  await withLocks(async locks => {
    let time = TIME - 10 * 86_400_000;
    const shared = new Storage(locks), a = client(shared, 'page-a', () => time);
    const unique = draft('과거 고유 원문', 'old-unique');
    assert(a.ui.save([unique]).ok); a.ui.leave(); await locks.tail;
    time = TIME;
    assert(a.ui.save([draft('최신 별도 문서', 'new-unique')]).ok); a.ui.leave(); await a.keep.clean(a.port);
    assert(has(shared, unique.raw)); assert(has(shared, '최신 별도 문서'));
  });
});

test('failed shared readback never reuses a possibly published generation key', async () => {
  await withLocks(async locks => {
    const shared = new Storage(locks), a = client(shared, 'page-a');
    assert(a.ui.save([draft('기존 보관 입력')]).ok); await locks.tail;
    const earlier = new Set(shared.values.keys());
    let failedKey: string | null = null;
    shared.afterRead = key => {
      if (earlier.has(key) || !shared.values.has(key)) return;
      shared.afterRead = null; failedKey = key;
      throw Error('synthetic-post-write-readback-denial');
    };
    assert(a.ui.save([draft('readback 재시도 입력')]).ok);
    assert(failedKey);
    assert(a.ui.save([draft('readback 재시도 입력')]).ok);
    assert.notEqual(a.keep.key, failedKey);
    a.ui.leave(); await locks.tail;
    assert([...shared.writes.values()].every(count => count === 1));
    assert.deepEqual(next(shared), [draft('readback 재시도 입력')]);
  });
});

test('superseded active versions do not reappear after foreign take removes the source proof rows', async () => {
  await withLocks(async locks => {
    const shared = new Storage(locks), a = client(shared, 'page-a'), b = client(shared, 'page-b');
    const parked = draft('별도로 보관한 원문'), latest = draft('인계할 최신 원문');
    assert(a.ui.save([draft('미완성 중간 입력')]).ok);
    assert(a.ui.save([parked, latest]).ok); a.ui.leave(); await locks.tail;
    const found = b.keep.left(() => false);
    assert.deepEqual(found.drafts, [parked, latest]);
    assert(b.ui.save(found.drafts).ok);
    assert.equal(await found.take(b.port), true);
    assert(!shared.values.has(a.keep.key));
    b.ui.leave(); await locks.tail;
    assert.deepEqual(next(shared), [parked, latest]);
  });
});

test('a blocked session port authorizes neither own cleanup nor foreign take', async () => {
  await withLocks(async locks => {
    const shared = new Storage(locks), a = client(shared, 'page-a'), b = client(shared, 'page-b');
    assert(a.ui.save([draft('막힌 세션 원문')]).ok); a.ui.leave();
    assert(b.ui.save([draft('다른 페이지 원문')]).ok); b.ui.leave(); await locks.tail;
    a.session.values.set(a.port.key, 'externally-replaced');
    assert.equal(a.port.read().ok, false);
    const before = new Map(shared.values), removed = shared.removed.length;
    assert.equal(await a.keep.clean(a.port), false);
    assert.equal(await a.keep.left(() => false).take(a.port), false);
    assert.equal(shared.removed.length, removed);
    assert.deepEqual(shared.values, before);
  });
});

test('missing or rejected locks allow duplicates and perform no shared deletion', async () => {
  for (const rejected of [false, true]) await withLocks(async locks => {
    if (rejected) Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request() { return Promise.reject(Error('synthetic-lock-denied')); } } } });
    const shared = new Storage(locks), a = client(shared, 'page-a'), b = client(shared, 'page-b');
    assert(a.ui.save([draft('중복 허용 원문')]).ok); a.ui.leave();
    const original = new Map(shared.values), found = b.keep.left(() => false);
    assert(b.ui.save(found.drafts).ok);
    assert.equal(await found.take(b.port), false); assert.equal(await b.keep.clean(b.port), false);
    for (const [key, value] of original) assert.equal(shared.values.get(key), value);
    assert.equal(shared.removed.length, 0);
  }, false);
});

test('session failure prevents mirror, stale clear cannot release a newer draft, and explicit clear is durable', async () => {
  await withLocks(async locks => {
    const shared = new Storage(locks), a = client(shared, 'page-a');
    assert(a.ui.save([draft('저장 전')]).ok);
    const before = a.port.read(); assert(before.ok && before.value);
    assert(a.ui.save([draft('최신 보관 입력')]).ok);
    assert.equal(a.ui.clear(before.value).ok, false);
    a.ui.leave(); await locks.tail;
    assert(has(shared, '최신 보관 입력'));
    const sharedCount = shared.writes.size;
    a.session.failWrite = () => true;
    assert.equal(a.ui.save([draft('session 실패 입력')]).ok, false);
    assert.equal(shared.writes.size, sharedCount);
    const b = client(shared, 'page-b');
    assert(b.ui.save([{ title: '독립 입력', raw: '명시 지움' }]).ok);
    assert(b.ui.clear().ok); b.ui.leave(); await locks.tail;
    assert(!has(shared, '명시 지움'));
    assert(has(shared, '최신 보관 입력'));
  });
});

test('corrupt, unknown-schema, mismatched-key and other-account records remain unchanged', async () => {
  await withLocks(async locks => {
    const shared = new Storage(locks), a = client(shared, 'page-a'), other = client(shared, 'other-page', () => TIME, 'another-owner');
    assert(other.ui.save([draft('다른 계정 원문')]).ok); other.ui.leave(); await locks.tail;
    shared.setItem(`${ALPHA_UI_RECOVERY_KEEP_PREFIX}${OWNER}:bad`, '{broken');
    shared.setItem(`${ALPHA_UI_RECOVERY_KEEP_PREFIX}${OWNER}:future`, canonicalJson({ schema: 'flowme-alpha-ui-recovery-keep/99', raw: 'future' }));
    assert(a.ui.save([draft('정상 원문')]).ok); a.ui.leave(); await locks.tail;
    const value = JSON.parse(shared.values.get(a.keep.key)!);
    assert(validateAlphaUiRecoveryKeep(value, OWNER));
    shared.setItem(`${ALPHA_UI_RECOVERY_KEEP_PREFIX}${OWNER}:wrong-key`, canonicalJson(value));
    const preserved = new Map([...shared.values].filter(([key]) => key !== a.keep.key));
    const b = client(shared, 'page-b'), found = b.keep.left(() => false);
    assert(!found.drafts.some(item => item.raw === '다른 계정 원문'));
    assert(b.ui.save(found.drafts).ok); await found.take(b.port); await locks.tail;
    for (const [key, bytes] of preserved) assert.equal(shared.values.get(key), bytes);
  });
});
