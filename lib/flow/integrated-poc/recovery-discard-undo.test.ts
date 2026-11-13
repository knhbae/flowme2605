import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { discardProgramRecovery, restoreProgramRecovery } from './recovery-discard-undo';
import { createAlphaUiRecovery, type AlphaUiRecoveryRecord } from './alpha-ui-recovery';

// UX review 11/12 P1-a (복구함): a discard of kept input can be taken back, byte for byte; P1-b: the words say where the
// input is.
function memory() {
  const map = new Map<string, string>();
  return { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); }, removeItem: (key: string) => { map.delete(key); },
    dump: () => Object.fromEntries(map) };
}
const drafts = (value: AlphaUiRecoveryRecord) => value.drafts;

test('the kept-input store: 버리기 then 되돌리기 gives the same record back, byte for byte', () => {
  const tab = memory(), ui = createAlphaUiRecovery(tab, { ownerId: 'owner-1', slotId: 'slot-1' });
  assert(ui.read().ok);
  const saved = ui.save([{ documentId: 'doc-1', title: '장보기 글', raw: '[2026-11-12]\n- [ ] 우유\n- [ ] 달걀' }, { title: '제목 없는 글', raw: '한 줄 메모\n\n둘째 단락' }]);
  assert(saved.ok && saved.changed);
  const bytes = tab.dump(), record = ui.read();
  const discarded = discardProgramRecovery(ui, drafts, () => ui.clear().ok);
  assert(discarded.ok); assert.equal(discarded.kept.length, 2);
  assert.deepEqual(tab.dump(), {}, 'gone from the storage');
  assert.equal(restoreProgramRecovery(ui, drafts, discarded.kept), 'restored');
  assert.deepEqual(tab.dump(), bytes, 'every byte back');
  assert.deepEqual(ui.read(), record);
  // The store goes on working after it (no conflict with its own bookkeeping).
  assert(ui.save([...drafts(record.ok ? record.value! : ({} as never)), { title: '셋째', raw: '세 번째' }]).ok);
});

test('kept again since: refused, the new input stays; a store that cannot be read discards nothing', () => {
  const tab = memory(), ui = createAlphaUiRecovery(tab, { ownerId: 'owner-1', slotId: 'slot-1' });
  ui.read(); ui.save([{ title: '처음', raw: '처음 입력' }]);
  const discarded = discardProgramRecovery(ui, drafts, () => ui.clear().ok);
  assert(discarded.ok);
  assert(ui.save([{ title: '그 뒤', raw: '그 뒤 입력' }]).ok);
  const after = tab.dump();
  assert.equal(restoreProgramRecovery(ui, drafts, discarded.kept), 'changed');
  assert.deepEqual(tab.dump(), after, 'the later input is not overwritten');
  const broken = { read: () => ({ ok: false as const }), save: () => ({ ok: true as const }), clear: () => { throw Error('never'); } };
  assert.deepEqual(discardProgramRecovery(broken, (value: never) => value, () => broken.clear()), { ok: false, reason: 'read' });
});

test('the 복구함: every discard goes through the undo notice; the words say where the input is', () => {
  const host = readFileSync(new URL('../../../components/flow/integrated-poc/AlphaWorkspace.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  for (const label of ['복구함 입력', '복구함의 복사 작업', '복구함의 제작 입력', '복구함의 공개·참여 입력']) assert(host.includes(`discardRecovery({ label: '${label}'`), label);
  assert(!/\.clear\(\)(\.ok)?;? *if \(cleared\?\.ok\) \{ parkedCreator|if \(socialRecovery\.current\?\.clear\(\)\.ok\)/.test(host), 'no discard without its undo');
  assert(host.includes('restoreProgramRecovery(notice.port, notice.entriesOf, notice.kept)'));
  assert(host.includes("'저장되지 않음 · 입력은 복구함에 있습니다'"));
  assert(!host.includes("setMessage('복구함 입력을 지웠습니다. 서버 자료는 그대로입니다.')"), 'one notice, not two');
});

test("총괄 11/12: a refused save's discarded input goes from the device too; in the sheet the notice is the sheet's own row", () => {
  const host = readFileSync(new URL('../../../components/flow/integrated-poc/AlphaWorkspace.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  // The tab's refused command (read again into the 복구함 on a reload or in a new tab) is dropped as '최신 내용 열기' drops
  // it: input kept in the 복구함 first, the saved text opened; then the 복구함's input is discarded (its 되돌리기 as before).
  assert(host.includes("if (live?.draft?.kind === 'change-private' && !live.pending) {\n      void openLatest(() => { setMessage(''); discardDrafts('저장된 내용을 열었습니다'); })"));
  // Run once the editors were handed over, in the session that asked; the effect's cleanup (run before the next run) never
  // clears it (the 18:xx QA: it did, and the discard never ran).
  assert(host.includes('const after = afterLatest.current; afterLatest.current = null;\n    if (after && after.epoch === sessionEpochRef.current) after.run();'), 'after the editors were handed over');
  assert(host.includes('return () => { const cleanup = openLatestLock.current; openLatestLock.current = null; cleanup?.(); };'), 'the cleanup leaves it');
  assert(host.includes('setData(next.envelope.data); openLatestLock.current = release; afterLatest.current = after ? { run: after, epoch } : null; setPresentation(value => value + 1); transferred = true;'));
  assert(host.includes("discardRecovery({ label: '복구함 입력', verb: '버렸습니다', note, port: uiRecovery.current"));
  // QA 11/12 (390): never the screen's fixed toast over the sheet's [닫기].
  assert(host.includes('{recoveryOpen && discardNoticeContent(true)}') && host.includes('{!recoveryOpen && discardNoticeContent(false)}'));
  const css = readFileSync(new URL('../../../components/flow/integrated-poc/AlphaWorkspace.module.css', import.meta.url), 'utf8');
  assert(css.includes('.recoveryToast.recoveryToastInSheet { position: static;'));
});
