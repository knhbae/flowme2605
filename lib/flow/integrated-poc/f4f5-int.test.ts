import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { ALPHA_LOGOUT_VIEW_PENDING_KEY, clearAlphaLogoutViewStorage, dropAlphaLogoutViewOwner, keepAlphaLogoutViewOwner, mergeAlphaLogoutViewOwner,
  readAlphaLogoutViewOwner } from './alpha-auth/logout-view-storage';

// F4·F5·P3c integration (11/9): what P3c left for the F4 files — the logout clears the folder-view map for every document
// of the account the writing host shows (a document made since the account snapshot too, and after a reload's retry),
// and [그날 보기] keeps its notice's [되돌리기] through the view change it makes; plus ‹ hidden beside the wide list.
class MemoryStorage {
  values = new Map<string, string>();
  failSet = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.failSet) throw Error('quota'); this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
const folderKey = 'flowme-writing-folder-view:v1';

test('the host\'s IDs join the snapshot\'s for the same owner only; another owner\'s are ignored', () => {
  const snapshot = { ownerId: 'synthetic-a', documentIds: ['a-1', 'a-2'] };
  assert.deepEqual(mergeAlphaLogoutViewOwner(snapshot, { ownerId: 'synthetic-a', documentIds: ['a-2', 'a-new', 'flow-a'] }),
    { ownerId: 'synthetic-a', documentIds: ['a-1', 'a-2', 'a-new', 'flow-a'] });
  assert.deepEqual(mergeAlphaLogoutViewOwner(snapshot, { ownerId: 'synthetic-b', documentIds: ['b-1'] }), snapshot);
  assert.deepEqual(mergeAlphaLogoutViewOwner(null, { ownerId: 'synthetic-a', documentIds: ['a-1', 'a-1'] }), { ownerId: 'synthetic-a', documentIds: ['a-1'] });
  assert.equal(mergeAlphaLogoutViewOwner(snapshot, null), snapshot);
});

test('a document made after the snapshot loses its folder-view entry too; unknown and other owners\' entries stay', () => {
  const storage = new MemoryStorage();
  storage.setItem(folderKey, JSON.stringify({ 'a-1': 'f', 'a-new': 'g', 'b-1': 'h', unknown: 'i' }));
  const owner = mergeAlphaLogoutViewOwner({ ownerId: 'synthetic-a', documentIds: ['a-1'] }, { ownerId: 'synthetic-a', documentIds: ['a-1', 'a-new'] });
  assert.equal(clearAlphaLogoutViewStorage(storage, owner), true);
  assert.deepEqual(JSON.parse(storage.getItem(folderKey)!), { 'b-1': 'h', unknown: 'i' });
});

test('a reload\'s retry clears what the first attempt would have: the kept owner and IDs, then they go', () => {
  const storage = new MemoryStorage();
  storage.setItem(folderKey, JSON.stringify({ 'a-1': 'f', 'a-new': 'g' }));
  keepAlphaLogoutViewOwner(storage, { ownerId: 'synthetic-a', documentIds: ['a-1', 'a-new'] });
  // After a reload: the retained session names the owner; only that owner's kept IDs are read.
  assert.equal(readAlphaLogoutViewOwner(storage, 'synthetic-b'), null);
  const kept = readAlphaLogoutViewOwner(storage, 'synthetic-a');
  assert.deepEqual(kept, { ownerId: 'synthetic-a', documentIds: ['a-1', 'a-new'] });
  assert.deepEqual(readAlphaLogoutViewOwner(storage), kept, 'no session: the kept owner');
  assert.equal(clearAlphaLogoutViewStorage(storage, kept), true);
  assert.equal(storage.getItem(folderKey), null, 'the map had only this account\'s entries');
  dropAlphaLogoutViewOwner(storage);
  assert.equal(storage.getItem(ALPHA_LOGOUT_VIEW_PENDING_KEY), null);
  // A storage that refuses writes keeps going with the in-memory owner (nothing thrown).
  storage.failSet = true;
  assert.doesNotThrow(() => keepAlphaLogoutViewOwner(storage, { ownerId: 'synthetic-a', documentIds: ['a-1'] }));
  storage.values.set(ALPHA_LOGOUT_VIEW_PENDING_KEY, '{not json');
  assert.equal(readAlphaLogoutViewOwner(storage, 'synthetic-a'), null);
});

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const C = '../../../components/flow/integrated-poc/';
const space = read(C + 'ProgramSpace.tsx'), auth = read(C + 'AlphaAuthPanel.tsx'), alpha = read(C + 'AlphaWorkspace.tsx'), screenCss = read(C + 'ProgramFolderScreen.module.css');

test('the writing host hands the logout every document and Flow of this account shown now; the panel keeps and drops them', () => {
  assert(alpha.includes('return { ownerId: session.userId, documentIds: text ? [...text.documents, ...text.flows].map(doc => doc.id) : [] }; };'));
  assert(alpha.includes('async function signOut() { clearReviewContext(); await onSignOut(signOutView()); }'));
  assert(auth.includes('if (ownerId && hostView?.ownerId === ownerId) logoutViewOwner.current = mergeAlphaLogoutViewOwner(logoutViewOwner.current, hostView);'));
  assert(auth.includes('keepAlphaLogoutViewOwner(localStorage, logoutViewOwner.current);'));
  assert(auth.includes('readAlphaLogoutViewOwner(localStorage, stored.data.session.user.id) ?? { ownerId: stored.data.session.user.id, documentIds: [] }'));
  // Dropped only once the logout completed (with the closed marker), so a failed cleanup retries with them.
  assert(auth.includes('localStorage.removeItem(recoveryKey); localStorage.removeItem(logoutKey); dropAlphaLogoutViewOwner(localStorage);'));
  assert(auth.indexOf('clearAlphaLogoutViewStorage(localStorage, logoutViewOwner.current)') < auth.indexOf('dropAlphaLogoutViewOwner(localStorage);'));
});

test('[그날 보기] keeps its notice (its 되돌리기) through the view change it makes; any other view change drops it', () => {
  assert(space.includes('useEffect(() => { setDatesNotice(current => current && current.undo === datesNoticeKept.current ? current : null); }, [actorId, period, date, folderId, query]);'));
  const show = space.slice(space.indexOf('  async function showMovedDay('), space.indexOf('  /** A day heading\'s [모두]/[풀기]'));
  assert(show.includes('const kept = datesNotice?.undo ?? null; datesNoticeKept.current = kept;'));
  assert(show.includes('if (datesNoticeKept.current === kept) datesNoticeKept.current = null;'));
  assert(show.indexOf('setDate(target)') < show.lastIndexOf('release();'));
});

test('1280: beside the list the folder head has no ‹', () => {
  assert(screenCss.includes('@media (min-width: 1000px) {\n  :global([data-folder-layout]) .head .back { display: none; }'));
});

const regionCss = read(C + 'ProgramFolderRegionEditor.module.css');
test('UX FIX (11/9): no ring box around a [글] line (its RAW line as 쓰기); one ring on the find field; the head stays with the keyboard', () => {
  // 쓰기 draws the caret's line RAW too (compared in the browser); in a one-line region the textarea's ring was a box.
  assert(regionCss.includes('.regionHost.regionHost :global(.tle-textarea:focus-visible) { box-shadow: none; outline: 0 !important; }'));
  // The global focus outline is !important; the field's own goes, the box around it keeps a 2px ring.
  assert(screenCss.includes('.list .find.find input:focus-visible { outline: 0 !important; }'));
  assert(screenCss.includes('.list .find:focus-within { border-color: var(--flowme-b-primary); box-shadow: 0 0 0 1px var(--flowme-b-primary); }'));
  // The page scrolls to the line written (regions grow, unlike 쓰기's editor): the head sticks to the top.
  assert(screenCss.includes(':global([data-writing-keyboard="true"]) .head { position: sticky; top: 0; z-index: 20; margin-left: 0; background: var(--flowme-b-surface); }'));
});

test('폴더 관리 waits out the host\'s automatic read (a pick right after another save was dropped), and says a refusal', () => {
  const manage = space.slice(space.indexOf('  async function manageRun('), space.indexOf('  function cancelHold()'));
  assert(manage.includes('const result = await run(label, build, true, undefined, undefined, true);'));
  assert(manage.includes("if (!result.ok && result.reason === 'busy') setMessage(programErrorMessage('busy'));"));
  for (const label of ['폴더 이름 변경', '폴더 이동', '폴더 삭제']) assert(space.includes(`manageRun('${label}'`), label);
});