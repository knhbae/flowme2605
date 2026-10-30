import test from 'node:test';
import assert from 'node:assert/strict';
import { ALPHA_UI_RECOVERY_LIMITS, ALPHA_UI_RECOVERY_PREFIX, ALPHA_UI_RECOVERY_SCHEMA,
  alphaUiRecoveryKey, createAlphaUiRecovery, validateAlphaUiRecovery, type AlphaUiDraft, type AlphaUiRecoveryRecord } from './alpha-ui-recovery';
import { canonicalJson } from './alpha-persistence/json';

const identity = { ownerId: 'owner-a', slotId: 'tab-a' };
const drafts: AlphaUiDraft[] = [
  { documentId: '문서-a', title: '  한글 😀 e\u0301  ', raw: '# 제목\r\n- [ ] 첫 줄 😀\r\n\t둘째 줄\n마지막\r\n' },
  { documentId: 'doc-b', title: '지운 본문', raw: '' },
  { title: '반복 변경 입력', raw: '{"date":"2026-09-21","memo":"[1.0]"}' },
];
const record = (changes: Partial<AlphaUiRecoveryRecord> = {}): AlphaUiRecoveryRecord => ({ schema: ALPHA_UI_RECOVERY_SCHEMA, ...identity, drafts: structuredClone(drafts), ...changes });
function storage() {
  const values = new Map<string, string>([['flow:operating', 'untouched'], ['unrelated', 'also untouched']]);
  const reads: string[] = [], writes: string[] = [], removes: string[] = [];
  let getError = false, setError = false, removeError = false, badWrite = false, ignoredRemove = false;
  return { values, reads, writes, removes,
    get getError() { return getError; }, set getError(v: boolean) { getError = v; },
    set setError(v: boolean) { setError = v; }, set removeError(v: boolean) { removeError = v; },
    set badWrite(v: boolean) { badWrite = v; }, set ignoredRemove(v: boolean) { ignoredRemove = v; },
    getItem(key: string) { reads.push(key); if (getError) throw Error('denied'); return values.get(key) ?? null; },
    setItem(key: string, value: string) { if (setError) throw Error('quota'); writes.push(key); values.set(key, badWrite ? 'corrupt readback' : value); },
    removeItem(key: string) { if (removeError) throw Error('denied'); removes.push(key); if (!ignoredRemove) values.delete(key); },
  };
}

test('owner and tab slots address only distinct PoC keys, including encoded separators', () => {
  const disk = storage();
  const identities = [identity, { ownerId: 'owner-a', slotId: 'tab-b' }, { ownerId: 'owner-b', slotId: 'tab-a' },
    { ownerId: 'owner:a', slotId: 'tab' }, { ownerId: 'owner', slotId: 'a:tab' }];
  const ports = identities.map(id => createAlphaUiRecovery(disk, id));
  assert.equal(new Set(ports.map(port => port.key)).size, identities.length);
  ports.forEach((port, i) => { assert.deepEqual(port.read(), { ok: true, value: null }); assert.equal(port.save([{ title: String(i), raw: String(i) }]).ok, true); });
  ports.forEach((port, i) => { const found = port.read(); assert(found.ok && found.value); assert.equal(found.value.ownerId, identities[i].ownerId); assert.equal(found.value.drafts[0].raw, String(i)); });
  assert([...disk.reads, ...disk.writes].every(key => key.startsWith(ALPHA_UI_RECOVERY_PREFIX)));
  assert.deepEqual([...disk.values].filter(([key]) => !key.startsWith(ALPHA_UI_RECOVERY_PREFIX)), [['flow:operating', 'untouched'], ['unrelated', 'also untouched']]);
});

test('lossless raw, CRLF, Unicode, optional document IDs and multiple drafts survive a new port', () => {
  const disk = storage(), port = createAlphaUiRecovery(disk, identity);
  assert(port.read().ok); const saved = port.save(drafts); assert(saved.ok && saved.value && saved.changed);
  assert.deepEqual(saved.value, record());
  const reopened = createAlphaUiRecovery(disk, identity).read(); assert(reopened.ok); assert.deepEqual(reopened.value, record());
  saved.value.drafts[0].raw = 'caller mutation';
  assert.deepEqual(port.read(), { ok: true, value: record() });
});

test('identical draft bytes and empty captures are write-free and preserve the last recovery', () => {
  const disk = storage(), port = createAlphaUiRecovery(disk, identity); assert(port.read().ok);
  assert.deepEqual(port.save([]), { ok: true, changed: false, value: null }); assert.equal(disk.writes.length, 0);
  assert(port.save(drafts).ok); const bytes = disk.values.get(port.key);
  for (const next of [structuredClone(drafts), []]) {
    const result = port.save(next); assert(result.ok); assert.equal(result.changed, false); assert.deepEqual(result.value, record());
  }
  assert.equal(disk.values.get(port.key), bytes); assert.equal(disk.writes.length, 1); assert.equal(disk.removes.length, 0);
});

test('read is required before writes or discard, and invalid identities never touch storage', () => {
  const disk = storage(), port = createAlphaUiRecovery(disk, identity);
  assert.deepEqual(port.save(drafts), { ok: false, reason: 'not-read' }); assert.deepEqual(port.clear(), { ok: false, reason: 'not-read' });
  for (const bad of ['', '__proto__', 'constructor', ' ', 'x'.repeat(1201)]) {
    assert.throws(() => createAlphaUiRecovery(disk, { ...identity, ownerId: bad }));
    assert.throws(() => createAlphaUiRecovery(disk, { ...identity, slotId: bad }));
  }
  assert.equal(disk.reads.length + disk.writes.length + disk.removes.length, 0);
});

test('owner or slot mismatch, malformed JSON, duplicate keys and unknown fields fail closed without repair', () => {
  const malformed = ['{', 'null', '[]', canonicalJson(record({ ownerId: 'owner-b' })), canonicalJson(record({ slotId: 'tab-b' })),
    canonicalJson({ ...record(), extra: true }), canonicalJson({ ...record(), schema: 'future/2' }), canonicalJson({ ...record(), drafts: [] }),
    canonicalJson({ ...record(), drafts: [{ title: 'x', raw: 12 }] }), canonicalJson({ ...record(), drafts: [{ title: 'x', raw: '', documentId: '' }] }),
    `{"ownerId":"wrong",${canonicalJson(record()).slice(1)}`];
  for (const bytes of malformed) {
    const disk = storage(), key = alphaUiRecoveryKey(identity.ownerId, identity.slotId); disk.values.set(key, bytes);
    const port = createAlphaUiRecovery(disk, identity);
    assert.deepEqual(port.read(), { ok: false, reason: 'corrupt' });
    assert.equal(port.save(drafts).ok, false); assert.equal(port.clear().ok, false);
    assert.equal(disk.values.get(key), bytes); assert.equal(disk.writes.length + disk.removes.length, 0);
    disk.values.set(key, canonicalJson(record())); assert.equal(port.read().ok, false, 'external repair does not silently reauthorize a blocked port');
  }
});

test('strict draft limits reject malformed or excessive input before any write and preserve the existing record', () => {
  const disk = storage(), port = createAlphaUiRecovery(disk, identity); assert(port.read().ok); assert(port.save(drafts).ok);
  const bytes = disk.values.get(port.key);
  const invalid: unknown[] = [null, {}, [undefined], new Array(1), [{ title: 'x', raw: 'x', extra: true }],
    [{ title: 'x', raw: 'x', documentId: undefined }], [{ title: 'x', raw: 'x'.repeat(ALPHA_UI_RECOVERY_LIMITS.rawChars + 1) }],
    [{ title: 'x'.repeat(ALPHA_UI_RECOVERY_LIMITS.titleChars + 1), raw: '' }],
    Array.from({ length: ALPHA_UI_RECOVERY_LIMITS.drafts + 1 }, () => ({ title: '', raw: '' }))];
  for (const value of invalid) assert.deepEqual(port.save(value as AlphaUiDraft[]), { ok: false, reason: 'invalid' });
  let getterCalls = 0;
  const getter = { title: 'x', get raw() { getterCalls++; return 'must not invoke'; } };
  assert.equal(port.save([getter]).ok, false); assert.equal(getterCalls, 0);
  assert.equal(disk.values.get(port.key), bytes); assert.equal(disk.writes.length, 1);
  assert(validateAlphaUiRecovery(record({ drafts: [{ title: '', raw: 'x'.repeat(100_000) }] }), identity.ownerId, identity.slotId));
});

test('unavailable reads and quota failures retain bytes and block subsequent writes and discard', () => {
  for (const phase of ['read', 'save'] as const) {
    const disk = storage(), port = createAlphaUiRecovery(disk, identity); disk.values.set(port.key, canonicalJson(record()));
    if (phase === 'read') { disk.getError = true; assert.deepEqual(port.read(), { ok: false, reason: 'storage-unavailable' }); }
    else { assert(port.read().ok); disk.setError = true; assert.deepEqual(port.save([{ title: 'new', raw: 'new' }]), { ok: false, reason: 'storage-unavailable' }); }
    disk.getError = false; disk.setError = false;
    assert.equal(port.save(drafts).ok, false); assert.equal(port.clear().ok, false);
    assert.equal(disk.values.get(port.key), canonicalJson(record())); assert.equal(disk.writes.length + disk.removes.length, 0);
  }
});

test('external replacement or removal blocks save, read and clear without changing the observed disk state', () => {
  for (const replacement of [null, canonicalJson(record({ drafts: [{ title: 'external', raw: 'new input' }] }))]) {
    for (const action of ['read', 'save', 'clear'] as const) {
      const disk = storage(), port = createAlphaUiRecovery(disk, identity); disk.values.set(port.key, canonicalJson(record())); assert(port.read().ok);
      if (replacement === null) disk.values.delete(port.key); else disk.values.set(port.key, replacement);
      assert.deepEqual(action === 'save' ? port.save(drafts) : port[action](), { ok: false, reason: 'conflict' });
      assert.equal(disk.values.get(port.key) ?? null, replacement); assert.equal(disk.writes.length + disk.removes.length, 0);
    }
  }
});

test('a failed write readback never reports recovery success or attempts a repair', () => {
  const disk = storage(), port = createAlphaUiRecovery(disk, identity); assert(port.read().ok); disk.badWrite = true;
  assert.deepEqual(port.save(drafts), { ok: false, reason: 'readback-failed' });
  assert.equal(port.save(drafts).ok, false); assert.equal(port.clear().ok, false);
  assert.equal(disk.values.get(port.key), 'corrupt readback'); assert.equal(disk.writes.length, 1); assert.equal(disk.removes.length, 0);
});

test('explicit clear removes only the confirmed exact owner/tab key and verifies removal', () => {
  const disk = storage(), port = createAlphaUiRecovery(disk, identity), other = createAlphaUiRecovery(disk, { ...identity, slotId: 'other-tab' });
  assert(port.read().ok); assert(other.read().ok); assert(port.save(drafts).ok); assert(other.save(drafts).ok);
  assert.deepEqual(port.clear(), { ok: true, changed: true }); assert.deepEqual(port.read(), { ok: true, value: null });
  assert.deepEqual(port.clear(), { ok: true, changed: false }); assert.deepEqual(disk.removes, [port.key]);
  assert.equal(disk.values.get(other.key), canonicalJson({ ...record(), slotId: 'other-tab' }));
  assert.equal(disk.values.get('flow:operating'), 'untouched'); assert.equal(disk.values.get('unrelated'), 'also untouched');
});

test('discard storage failure and failed removal readback preserve bytes and remain failed', () => {
  for (const fault of ['throw', 'ignored'] as const) {
    const disk = storage(), port = createAlphaUiRecovery(disk, identity); assert(port.read().ok); assert(port.save(drafts).ok);
    disk.removeError = fault === 'throw'; disk.ignoredRemove = fault === 'ignored';
    assert.deepEqual(port.clear(), { ok: false, reason: fault === 'throw' ? 'storage-unavailable' : 'readback-failed' });
    disk.removeError = false; disk.ignoredRemove = false; assert.equal(port.clear().ok, false);
    assert.equal(disk.values.get(port.key), canonicalJson(record()));
  }
});

test('late server confirmation cannot clear a newer capture or a different account record', () => {
  const disk = storage(), port = createAlphaUiRecovery(disk, identity); assert(port.read().ok);
  const first = port.save(drafts); assert(first.ok && first.value);
  const latest = port.save([{ documentId: 'same-doc', title: '계속 작성', raw: 'new unsent input' }]); assert(latest.ok && latest.value);
  assert.deepEqual(port.clear(first.value), { ok: false, reason: 'conflict' });
  assert.deepEqual(port.clear({ ...latest.value, ownerId: 'owner-b' }), { ok: false, reason: 'invalid' });
  assert.deepEqual(port.clear({ ...latest.value, slotId: 'other-tab' }), { ok: false, reason: 'invalid' });
  assert.equal(disk.removes.length, 0); assert.equal(disk.values.get(port.key), canonicalJson(latest.value));
  assert.deepEqual(port.clear(latest.value), { ok: true, changed: true }); assert.deepEqual(disk.removes, [port.key]);
});
