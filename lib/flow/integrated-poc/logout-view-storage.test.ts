import assert from 'node:assert/strict';
import test from 'node:test';
import { clearAlphaLogoutViewStorage } from './alpha-auth/logout-view-storage';
import { programOpening } from './carryover-opening';

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
const owner = { ownerId: 'synthetic-a', documentIds: ['a-document'] };
const folderKey = 'flowme-writing-folder-view:v1';
const viewKeys = [
  'flow:poc:personal-workspace:v1:month-view', 'flow:alpha:carryover-open:v1', 'flow:alpha:opened:v1',
  'flowme-flow-today-band-open:v1', 'flowme-flow-today-band-folded',
  'flow:alpha:writing-whole:v1:synthetic-a', 'flow:alpha:writing-done:v1:synthetic-a',
];

test('logout resets the next same-tab login view, keeping input, collections and another owner exactly as stored', () => {
  const storage = new MemoryStorage();
  for (const key of viewKeys) storage.setItem(key, key.endsWith('month-view') ? 'grid' : '1');
  storage.setItem('flow:alpha:opened:v1', '{"last":"2026-10-01"}');
  storage.setItem(folderKey, JSON.stringify({ 'a-document': 'a-folder', 'b-document': 'b-folder', 'unverified-document': 'unknown-folder' }));
  const preserved = [
    ['flow:alpha:writing-whole:v1:synthetic-b', '{"b-document":true}'],
    ['flow:alpha:writing-done:v1:synthetic-b', '{"b-document":true}'],
    ['flow:poc:personal-workspace:v1:alpha-ui-recovery-keep:v3:synthetic-a:tab-a', 'unsaved synthetic input'],
    ['flow:poc:personal-workspace:v1:alpha-ui-recovery-keep:v3:synthetic-b:tab-b', 'other synthetic input'],
    ['flowme:alpha:document-collections:v1:synthetic-a', '{"synthetic":"collection"}'],
    ['flowme-recovery-seen:v1:synthetic-a', '["synthetic-tag"]'],
    ['unrelated-setting', 'keep'],
  ];
  for (const [key, value] of preserved) storage.setItem(key, value);
  assert.equal(clearAlphaLogoutViewStorage(storage, owner), true);
  assert(viewKeys.every(key => storage.getItem(key) === null));
  assert.deepEqual(JSON.parse(storage.getItem(folderKey)!), { 'b-document': 'b-folder', 'unverified-document': 'unknown-folder' });
  for (const [key, value] of preserved) assert.equal(storage.getItem(key), value);
  assert.deepEqual(programOpening(storage, '2026-11-09'), { first: false, since: null }, 'next owner does not inherit the previous return date');
  assert.equal(storage.getItem('flowme-flow-today-band-open:v1'), null, 'the band opens folded next login');
});

test('cleanup failure can be retried for the captured owner and never removes a newer folder-map value', () => {
  const storage = new MemoryStorage();
  storage.setItem(viewKeys[0], 'grid');
  const remove = storage.removeItem.bind(storage);
  storage.removeItem = key => { if (key === viewKeys[0]) throw Error('refused'); remove(key); };
  assert.equal(clearAlphaLogoutViewStorage(storage, owner), false);
  assert.equal(storage.getItem(viewKeys[0]), 'grid');
  storage.removeItem = remove;
  assert.equal(clearAlphaLogoutViewStorage(storage, owner), true);
  storage.setItem(folderKey, '{"a-document":"a-folder"}');
  let reads = 0;
  const get = storage.getItem.bind(storage);
  storage.getItem = key => {
    if (key === folderKey && ++reads === 2) storage.setItem(folderKey, '{"a-document":"new-folder","b-document":"b-folder"}');
    return get(key);
  };
  assert.equal(clearAlphaLogoutViewStorage(storage, owner), false);
  assert.equal(get(folderKey), '{"a-document":"new-folder","b-document":"b-folder"}');
});

test('without proven document ownership, the legacy folder map is preserved; only a fully emptied known map goes', () => {
  const storage = new MemoryStorage();
  for (const raw of ['broken-json', 'null', '[]', '{"unknown-document":"folder"}']) {
    storage.setItem(folderKey, raw);
    assert.equal(clearAlphaLogoutViewStorage(storage, owner), true);
    assert.equal(storage.getItem(folderKey), raw);
  }
  storage.setItem(folderKey, '{"a-document":"a-folder"}');
  assert.equal(clearAlphaLogoutViewStorage(storage, null), true);
  assert.equal(storage.getItem(folderKey), '{"a-document":"a-folder"}');
  assert.equal(clearAlphaLogoutViewStorage(storage, owner), true);
  assert.equal(storage.getItem(folderKey), null);
});
