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
  for (const label of ['보관 입력', '보관한 복사 작업', '보관 제작 입력', '보관 공개·참여 입력']) assert(host.includes(`discardRecovery({ label: '${label}'`), label);
  assert(!/\.clear\(\)(\.ok)?;? *if \(cleared\?\.ok\) \{ parkedCreator|if \(socialRecovery\.current\?\.clear\(\)\.ok\)/.test(host), 'no discard without its undo');
  assert(host.includes('restoreProgramRecovery(notice.port, notice.entriesOf, notice.kept)'));
  assert(host.includes("'저장되지 않음 · 입력은 복구함에 있습니다'"));
  assert(!host.includes("setMessage('보관 입력을 지웠습니다. 서버 자료는 그대로입니다.')"), 'one notice, not two');
});
