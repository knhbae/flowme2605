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
});
