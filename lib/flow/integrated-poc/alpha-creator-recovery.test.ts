import test from 'node:test';
import assert from 'node:assert/strict';
import { createAlphaCreatorRecovery, ALPHA_CREATOR_RECOVERY_PREFIX, type AlphaCreatorRecoveryEntry } from './alpha-creator-recovery';
const entry = (): AlphaCreatorRecoveryEntry => ({ working: { draftId: 'creator-a', title: '제작 중', rawText: '## 한글\r\n- [ ] 작업\r\n', baseRecordRevision: null }, auxiliaries: [{ title: '구조 비교 선택', raw: '{"선택":"보존"}' }], baseRevision: 4 });
function setup() {
  const values = new Map<string,string>(), writes: string[] = [];
  const storage = { getItem: (key:string) => values.get(key) ?? null, setItem: (key:string,value:string) => { assert(key.startsWith(ALPHA_CREATOR_RECOVERY_PREFIX)); writes.push(key); values.set(key,value); }, removeItem: (key:string) => { assert(key.startsWith(ALPHA_CREATOR_RECOVERY_PREFIX)); writes.push(key); values.delete(key); } };
  return { values, writes, storage };
}
test('M4 creator recovery preserves full working and auxiliary bytes across reload, isolated by account and tab', () => {
  const f=setup(), port=createAlphaCreatorRecovery(f.storage,'account-a','tab-a');
  assert(port.read().ok); assert(port.save([entry()]).ok);
  const reload=createAlphaCreatorRecovery(f.storage,'account-a','tab-a').read();
  assert(reload.ok); assert.deepEqual(reload.value?.entries,[entry()]);
  assert.deepEqual(createAlphaCreatorRecovery(f.storage,'account-b','tab-a').read(),{ok:true,value:null});
  assert.deepEqual(createAlphaCreatorRecovery(f.storage,'account-a','tab-b').read(),{ok:true,value:null});
});
test('M4 corrupt recovery stays intact and refuses write/clear', () => {
  const f=setup(), port=createAlphaCreatorRecovery(f.storage,'account-a','tab-a'); f.values.set(port.key,'broken');
  assert(!port.read().ok); assert(!port.save([entry()]).ok); assert(!port.clear().ok);
  assert.equal(f.values.get(port.key),'broken'); assert.equal(f.writes.length,0);
});
test('M4 recovery read-before-write, no-op capture and stale cleanup never erase newer input', () => {
  const f=setup(), port=createAlphaCreatorRecovery(f.storage,'account-a','tab-a'); assert(!port.save([entry()]).ok);
  port.read(); const first=port.save([entry()]); assert(first.ok&&first.value);
  const next=entry(); next.working.rawText+='새 입력'; port.save([next]); const count=f.writes.length;
  assert(!port.clear(first.value).ok); assert(port.save([]).ok); assert.equal(f.writes.length,count);
  assert(port.clear().ok); assert.equal(f.values.size,0);
});
test('M4 recovery externally replaced data and malformed working fail closed', () => {
  const f=setup(), port=createAlphaCreatorRecovery(f.storage,'account-a','tab-a'); port.read();
  const bad=entry(); (bad.working as unknown as Record<string,unknown>).forged=true;
  assert(!port.save([bad]).ok); f.values.set(port.key,'external'); assert(!port.save([entry()]).ok); assert.equal(f.values.get(port.key),'external');
});
