import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DEV_NOTICE_VERSION, markDevNoticeSeen, readDevNoticeSeen } from './dev-notice';

// W11 (decision 2, option C): once per device and account. The host keeps the acknowledgement in device storage
// (localStorage), so every tab of that device shares it; new wording (a raised version) shows the notice once more.
function device(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key); },
    setItem: (key, value) => { values.set(key, String(value)); },
  };
}

test('acknowledged once per device and account: every later read on that device, any tab, stays hidden', () => {
  const storage = device();
  assert.equal(readDevNoticeSeen(storage, 'owner-a'), false);
  assert.equal(markDevNoticeSeen(storage, 'owner-a'), true);
  // A reload or a new tab reads the same device storage.
  assert.equal(readDevNoticeSeen(storage, 'owner-a'), true);
  // Another account on the same device, or another device, sees it.
  assert.equal(readDevNoticeSeen(storage, 'owner-b'), false);
  assert.equal(readDevNoticeSeen(device(), 'owner-a'), false);
});

test('new wording (a raised version) shows the notice once more', () => {
  const storage = device();
  markDevNoticeSeen(storage, 'owner-a');
  assert.equal(readDevNoticeSeen(storage, 'owner-a', DEV_NOTICE_VERSION), true);
  assert.equal(readDevNoticeSeen(storage, 'owner-a', `${DEV_NOTICE_VERSION}-next`), false);
  markDevNoticeSeen(storage, 'owner-a', `${DEV_NOTICE_VERSION}-next`);
  assert.equal(readDevNoticeSeen(storage, 'owner-a', `${DEV_NOTICE_VERSION}-next`), true);
  // The old per-tab key never counts as acknowledged.
  storage.setItem('flow:poc:personal-workspace:v1:alpha-m3:dev-notice:owner-c', 'seen');
  assert.equal(readDevNoticeSeen(storage, 'owner-c'), false);
});

test('the stored key never holds the account ID; different accounts get different keys (W11 review P2)', () => {
  const storage = device(), ids = ['22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'];
  for (const id of ids) markDevNoticeSeen(storage, id);
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)!);
  assert.equal(keys.length, 2);
  for (const id of ids) {
    assert(keys.every(key => !key.includes(id)), 'no raw ID');
    // Nor any long piece of it.
    for (const part of id.split('-').filter(part => part.length >= 8)) assert(keys.every(key => !key.includes(part)), part);
  }
  assert(keys.every(key => /:[0-9a-f]{32}$/.test(key)), keys.join(' '));
  assert.equal(readDevNoticeSeen(storage, ids[0]), true);
  assert.equal(readDevNoticeSeen(storage, ids[1]), true);
});

test('keys that held the account ID are removed from device and tab storage; W11\'s acknowledgement moves (re-review P2)', () => {
  const id = '22222222-2222-4222-8222-222222222222', prefix = 'flow:poc:personal-workspace:v1:alpha-m3:dev-notice:';
  const raw = (storage: Storage) => Array.from({ length: storage.length }, (_, index) => storage.key(index)!).filter(key => key.includes(id));
  // W11's first build kept the acknowledgement on the device under the ID; N1 keeps it per tab.
  const deviceStore = device(), tabStore = device();
  deviceStore.setItem(`${prefix}2026-10-31:${id}`, 'seen'); deviceStore.setItem('flow:other', 'kept');
  tabStore.setItem(`${prefix}${id}`, 'seen');
  assert.equal(readDevNoticeSeen(deviceStore, id, DEV_NOTICE_VERSION, tabStore), true);
  assert.deepEqual([raw(deviceStore), raw(tabStore)], [[], []]);
  assert.equal(deviceStore.length, 2); assert.equal(deviceStore.getItem('flow:other'), 'kept');
  assert.equal(readDevNoticeSeen(deviceStore, id), true);
  // N1's per-tab acknowledgement does not carry over (the device-wide notice shows once), but its key goes too,
  // from whichever storage holds it.
  const fresh = device(), tab = device();
  fresh.setItem(`${prefix}${id}`, 'seen'); tab.setItem(`${prefix}${id}`, 'seen');
  assert.equal(readDevNoticeSeen(fresh, id, DEV_NOTICE_VERSION, tab), false);
  assert.deepEqual([raw(fresh), raw(tab), fresh.length, tab.length], [[], [], 0, 0]);
  // W11's first key under another version, or not 'seen', is removed and not moved.
  const other = device();
  other.setItem(`${prefix}2026-10-31:${id}`, 'seen');
  assert.equal(readDevNoticeSeen(other, id, `${DEV_NOTICE_VERSION}-next`), false);
  assert.deepEqual([raw(other), other.length], [[], 0]);
  // A storage that cannot write keeps the old key and shows the notice.
  const stuck = device(); stuck.setItem(`${prefix}2026-10-31:${id}`, 'seen');
  const readOnly = { getItem: stuck.getItem, removeItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('quota'); } };
  assert.equal(readDevNoticeSeen(readOnly, id), false);
  assert.equal(stuck.getItem(`${prefix}2026-10-31:${id}`), 'seen');
});

test('unusable storage keeps the notice showing', () => {
  const broken = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('quota'); } };
  assert.equal(readDevNoticeSeen(broken, 'owner-a'), false);
  assert.equal(markDevNoticeSeen(broken, 'owner-a'), false);
  assert.equal(readDevNoticeSeen(undefined, 'owner-a'), false);
  assert.equal(markDevNoticeSeen(undefined, 'owner-a'), false);
});

test('the host stores it in device storage, not tab storage', () => {
  const host = readFileSync(new URL('../../../components/flow/integrated-poc/AlphaWorkspace.tsx', import.meta.url), 'utf8');
  assert.match(host, /const devNoticeStorage = \(\) => \{ try \{ return syntheticRuntime\?\.documentStorage \?\? localStorage; \} catch \{ return undefined; \} \};/);
  // Reading also clears N1's per-tab key from tab storage.
  assert.match(host, /const devNoticeTabStorage = \(\) => \{ try \{ return syntheticRuntime\?\.tabStorage \?\? sessionStorage; \} catch \{ return undefined; \} \};/);
  assert.match(host, /readDevNoticeSeen\(devNoticeStorage\(\), session\.userId, DEV_NOTICE_VERSION, devNoticeTabStorage\(\)\)/);
});
