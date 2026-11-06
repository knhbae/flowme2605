import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProgramData, ProgramPublicItem, ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { importProgramPublicVersion } from './private-space';
import { programImportAddsNothing, programImportRepeatChoice, programImportRepeats } from './public-repeat-import';
import { alphaSocialSettledEntry } from './alpha-social-recovery';
import { createAlphaUiRecovery, type AlphaUiDraft } from './alpha-ui-recovery';
import { ALPHA_UI_RECOVERY_KEEP_LIMITS, createAlphaUiRecoveryKeep, keepAlphaUiRecovery } from './alpha-ui-recovery-keep';
import { canonicalJson } from './alpha-persistence/json';

// P3c (11/6): ① a mixed Flow taken again as '새 문서' with nothing to add; ② the publish draft copy left in 복구함;
// B the 복구함 input kept on this device outside the tab, at logout.
const B = 'local-user', A = 'creator-minji', NOW = '2026-11-06T00:00:00.000Z', TODAY = '2026-11-06';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: B, requestId: `p3c-${++request}`, expectedSpace: data.spaces[B] });
const item = (id: string, title: string): ProgramPublicItem => ({ id, title, description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] });
function catalog(): ProgramData {
  const data = createProgramData();
  data.public.flows.push({ id: 'car', ownerId: A, currentVersionId: 'car-v1', category: '생활', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push({ id: 'car-v1', flowId: 'car', number: 1, parentVersionId: null, title: '차 관리 반복 일정', summary: '합성',
    items: [item('inspection', '자동차 정기검사 받기'), item('insurance', '자동차 보험 만기 확인하기'), item('tire', '타이어 공기압 확인하기 @1개월마다'), item('oil', '엔진오일 교환하기 @?개월마다')],
    source: { kind: 'user-text', label: '합성', url: null, checkedAt: null }, createdBy: A, createdAt: NOW });
  assert(validateProgramData(data));
  return data;
}
const version = (data: ProgramData) => data.public.versions.find(row => row.id === 'car-v1')!;
function sheet(data: ProgramData, itemIds = version(data).items.map(row => row.id), anchor: string | null = null) {
  return { versionId: 'car-v1', itemIds, anchor, ...programImportRepeatChoice(programImportRepeats(data.spaces[B], version(data), itemIds), { starts: {}, months: {} }, TODAY)! };
}
const take = (data: ProgramData, itemIds?: string[], anchor: string | null = null) => importProgramPublicVersion(data, { ...base(data), ...sheet(data, itemIds, anchor) });
const ALL = ['inspection', 'insurance', 'tire', 'oil'];

test('① a mixed Flow taken again as 새 문서 adds nothing exactly when the import would change nothing', () => {
  const first = ok(take(catalog())).data;
  assert.equal(programImportAddsNothing(first.spaces[B], version(first), ALL, null), true, 'one-time items in the copy, repeat items lines of mine');
  const again = ok(take(first));
  assert.equal(again.changed, false, 'the import agrees: nothing changed');
  // Each case where the import still changes or refuses something keeps the button on.
  const partial = ok(take(catalog(), ['inspection', 'tire'])).data;
  assert.equal(programImportAddsNothing(partial.spaces[B], version(partial), ALL, null), false, 'an item not in the copy yet');
  assert.notEqual(ok(take(partial)).changed, false);
  assert.equal(programImportAddsNothing(first.spaces[B], version(first), ALL, '2026-12-01'), false, 'another 기준일: the import says so');
  assert.equal(take(first, ALL, '2026-12-01').ok, false);
  const copy = first.spaces[B].copies[0];
  const archived = { ...first, spaces: { ...first.spaces, [B]: { ...first.spaces[B], archivedDocumentIds: [copy.documentId] } } };
  assert.equal(programImportAddsNothing(archived.spaces[B], version(archived), ALL, null), false, 'an archived copy comes back out');
  assert.equal(programImportAddsNothing(catalog().spaces[B], version(catalog()), ALL, null), false, 'no copy: a new document');
  const repeatsOnly = ok(take(catalog(), ['tire', 'oil'])).data;
  assert.equal(programImportAddsNothing(repeatsOnly.spaces[B], version(repeatsOnly), ['tire', 'oil'], null), true);
  // The sheet turns the button off and says why, as for a chosen document (P3 ②).
  const discovery = readFileSync(join(process.cwd(), 'components/flow/integrated-poc/ProgramDiscovery.tsx'), 'utf8');
  assert(discovery.includes("const nothingForNew = importDestination === 'new' && !!version && !nothingToImport"));
  assert(discovery.includes('nothingForTarget || nothingForNew ||'), 'the button is off');
  assert(discovery.includes('if (nothingForNew) return;'), 'and the press does nothing');
  assert(discovery.includes('{nothingForNew && <p className={styles.repeatNone} data-import-nothing>{nothingNewReason}</p>}'));
});

test('② a confirmed publish or post settles only the exact draft it took, once the server has no draft of it', () => {
  const draft = { id: 'publication-1', documentId: 'doc-1', title: '공개 제목' } as never;
  const post = { id: 'participation-1', kind: 'post', title: '해 봤어요', body: '' } as never;
  const space = (publications: unknown[] = [], participations: unknown[] = []) => ({ publicationDrafts: publications, participationDrafts: participations }) as never;
  assert.equal(alphaSocialSettledEntry({ type: 'publication-submit', draft }, space()), canonicalJson({ kind: 'publication', value: draft }));
  assert.equal(alphaSocialSettledEntry({ type: 'participation-submit', draft: post, expected: post }, space()), canonicalJson({ kind: 'participation', value: post }));
  assert.equal(alphaSocialSettledEntry({ type: 'publication-submit', draft }, space([{ id: 'publication-1' }])), null, 'the server still has the draft');
  assert.equal(alphaSocialSettledEntry({ type: 'publication-save', draft, expected: null }, space()), null, 'a save settles nothing here');
  assert.equal(alphaSocialSettledEntry(undefined, space()), null);
  const shell = readFileSync(join(process.cwd(), 'components/flow/integrated-poc/AlphaWorkspace.tsx'), 'utf8');
  assert.match(shell, /\.filter\(entry => !socialSettled\(entry\)\);\r?\n\s*activeSocial\.current = social;/, 'a settled draft is not kept again');
  assert(shell.includes("const settled = !outcome.presentationPending && confirmed ? alphaSocialSettledEntry(intent, confirmed.space) : null;"));
});

class Locks {
  active = 0;
  tail = Promise.resolve();
  request<T>(_name: string, options: { mode: string }, callback: (lock: { name: string; mode: string }) => T | Promise<T>): Promise<T> {
    assert.equal(options.mode, 'exclusive');
    const pending = this.tail.then(async () => { assert.equal(this.active++, 0); try { return await callback({ name: _name, mode: options.mode }); } finally { this.active--; } });
    this.tail = pending.then(() => undefined, () => undefined);
    return pending;
  }
}
class Storage {
  values = new Map<string, string>();
  constructor(readonly locks?: Locks) {}
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { if (this.locks) assert.equal(this.locks.active, 1, 'removal only in the account lock'); this.values.delete(key); }
}
async function withLocks(work: (locks: Locks) => unknown | Promise<unknown>, enabled = true) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator'), locks = new Locks();
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: enabled ? { locks } : {} });
  try { await work(locks); await locks.tail; }
  finally { if (previous) Object.defineProperty(globalThis, 'navigator', previous); else Reflect.deleteProperty(globalThis, 'navigator'); }
}
const TIME = Date.UTC(2026, 10, 6, 10), OWNER = 'synthetic-owner', OTHER = 'synthetic-other';
const draft = (raw: string, documentId = 'document-a'): AlphaUiDraft => ({ documentId, title: '작성 문서', raw });
function page(shared: Storage, pageId: string, ownerId = OWNER, now: () => number = () => TIME) {
  const session = new Storage(), port = createAlphaUiRecovery(session, { ownerId, slotId: pageId });
  const keep = createAlphaUiRecoveryKeep(shared, ownerId, pageId, now)!, ui = keepAlphaUiRecovery(port, keep, now);
  assert(ui.read().ok);
  return { session, port, keep, ui };
}
const keysOf = (shared: Storage, ownerId: string) => [...shared.values.keys()].filter(key => key.includes(`:${encodeURIComponent(ownerId)}:`));
const nextPage = (shared: Storage, now = TIME + 1) => createAlphaUiRecoveryKeep(shared, OWNER, `next-${++request}`, () => now)!.left(() => false).drafts;

test('B 남기고: what stays on this device is listed with its count, and the next sign-in takes it back once', async () => {
  await withLocks(async locks => {
    const shared = new Storage(locks), me = page(shared, 'page-me');
    assert(me.ui.save([draft('저장 안 한 원문')]).ok); await locks.tail;
    const device = me.keep.device();
    assert.deepEqual(device.drafts, [draft('저장 안 한 원문')]);
    assert(device.rows.length >= 1);
    me.ui.leave(); await locks.tail;
    assert.deepEqual(nextPage(shared), [draft('저장 안 한 원문')], '다시 로그인하면 회수 1');
  });
});

test('B 지우고: in the lock, this page\'s rows and the listed rows of tabs that left go; another account and a live tab stay', async () => {
  await withLocks(async locks => {
    const time = TIME, shared = new Storage(locks);
    const closed = page(shared, 'page-closed', OWNER, () => time - 31 * 60_000);
    assert(closed.ui.save([draft('닫은 탭의 원문', 'document-c')]).ok); closed.ui.leave();
    const live = page(shared, 'page-live', OWNER, () => time);
    assert(live.ui.save([draft('열린 다른 탭의 원문', 'document-l')]).ok);
    const other = page(shared, 'page-other', OTHER);
    assert(other.ui.save([draft('다른 계정 원문')]).ok); other.ui.leave();
    const me = page(shared, 'page-me', OWNER, () => time);
    assert(me.ui.save([draft('내 탭 원문')]).ok);
    await locks.tail;
    const otherBytes = canonicalJson(Object.fromEntries(keysOf(shared, OTHER).map(key => [key, shared.values.get(key)])));
    const device = me.keep.device();
    assert.deepEqual(device.drafts.map(row => row.raw).sort(), ['내 탭 원문', '닫은 탭의 원문'].sort(), 'a live tab\'s input is not listed');
    assert(await me.ui.erase(device.rows));
    const left = keysOf(shared, OWNER);
    assert(left.length > 0 && left.every(key => key.includes('page-live')), 'only the live tab\'s rows stay (read only)');
    assert.equal(canonicalJson(Object.fromEntries(keysOf(shared, OTHER).map(key => [key, shared.values.get(key)]))), otherBytes, 'another account: bytes as they were');
    assert.equal(me.session.values.size, 0, 'this tab\'s copy is gone too');
    // Nothing is written after: a save, a leave or a return writes no row of this page.
    assert(me.ui.save([draft('지운 뒤 입력')]).ok); me.ui.leave(); me.ui.back(); await locks.tail;
    assert(keysOf(shared, OWNER).every(key => key.includes('page-live')));
    assert(!nextPage(shared).some(row => ['내 탭 원문', '닫은 탭의 원문'].includes(row.raw)), 'nothing erased comes back');
    assert.deepEqual(nextPage(shared, time + ALPHA_UI_RECOVERY_KEEP_LIMITS.quietMinutes * 60_000 + 1).map(row => row.raw), ['열린 다른 탭의 원문'],
      'the live tab\'s input is still its own, taken once that tab goes quiet');
  });
});

test('B 지우고 removes nothing without the lock, and leaves a row that came after the listing', async () => {
  await withLocks(async () => {
    const shared = new Storage(), me = page(shared, 'page-me');
    assert(me.ui.save([draft('내 탭 원문')]).ok);
    const before = canonicalJson([...shared.values]);
    assert.equal(await me.ui.erase(me.keep.device().rows), false);
    assert.equal(canonicalJson([...shared.values]), before, 'no lock: no removal');
    assert.equal(me.session.values.size, 1, 'and this tab keeps its copy');
  }, false);
  await withLocks(async locks => {
    const shared = new Storage(locks), me = page(shared, 'page-me');
    assert(me.ui.save([draft('내 탭 원문')]).ok); await locks.tail;
    const listed = me.keep.device().rows;
    const late = page(shared, 'page-late', OWNER, () => TIME - 31 * 60_000);
    assert(late.ui.save([draft('목록 뒤에 생긴 원문', 'document-z')]).ok); late.ui.leave(); await locks.tail;
    assert(await me.ui.erase(listed));
    assert.deepEqual(nextPage(shared).map(row => row.raw), ['목록 뒤에 생긴 원문'], 'not shown, not erased');
  });
});

test('B the logout button warns only with input on this device; 남기고 comes first; 지우고 waits for a pending save', () => {
  const shell = readFileSync(join(process.cwd(), 'components/flow/integrated-poc/AlphaWorkspace.tsx'), 'utf8');
  assert(shell.includes('if (hasInput() || pending || deviceInput().count) { setLeaveFailed(false); setLeave(true); } else void signOut();'), '0: straight out');
  assert(shell.includes('저장 안 된 입력 ${count}개가 이 기기의 복구함에 남아 있습니다.'));
  assert(shell.indexOf("'남기고 로그아웃'") < shell.indexOf('>지우고 로그아웃</button>'), '남기고 first');
  assert(shell.includes('{count > 0 && !pending && <button type="button" disabled={leaveBusy} onClick={() => void eraseAndSignOut()}>지우고 로그아웃</button>}'));
  assert(shell.includes('useEffect(() => { if (leave) leaveKeep.current?.focus('), 'focus on 남기고');
  assert(shell.includes('if (erasing.current) return false;'), 'nothing is kept again once erasing starts');
  assert(shell.includes('captureInput(); if (!erasing.current) uiKeep.current?.port.leave();'));
});
