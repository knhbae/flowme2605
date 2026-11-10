import assert from 'node:assert/strict';
import test from 'node:test';
import { createAlphaUiRecovery, type AlphaUiDraft, type AlphaUiRecoveryPort } from './alpha-ui-recovery';
import {
  alphaUiRecoveryDocumentDrafts, captureAlphaUiRecoveryDocuments, clearConfirmedAlphaUiRecoveryDocuments,
  createAlphaUiRecoveryDocuments, groupAlphaUiRecoveryDocuments, keepAlphaUiRecoveryDocument,
  latestAlphaUiDocumentDrafts, loadAlphaUiRecoveryDocuments, parkAlphaUiRecoveryDocuments, parkedAlphaUiRecoveryDocuments, recoveryToastDraftsForHeldInput,
} from './alpha-ui-recovery-document';

const draft = (raw: string, documentId = 'document-a', title = '작성 문서'): AlphaUiDraft => ({ documentId, title, raw });
const temporary = (raw: string): AlphaUiDraft => ({ title: '임시 입력', raw });

test('B-held current RAW stays stored and counted while only its generic toast is quiet', () => {
  const held = draft('합성 보류 줄'), state = captureAlphaUiRecoveryDocuments(createAlphaUiRecoveryDocuments(), [held]);
  const stored = alphaUiRecoveryDocumentDrafts(state), before = structuredClone(state);
  assert.deepEqual(recoveryToastDraftsForHeldInput(stored, state, [held]), []);
  assert.deepEqual(stored, [held]); assert.equal(stored.length, 1);
  assert.deepEqual(alphaUiRecoveryDocumentDrafts(state), [held]); assert.deepEqual(state, before);
});

test('quiet B toast preserves identical loaded history, parked copies and another document failure', () => {
  const held = draft('합성 보류 줄'), prior = draft('합성 이전 원문', 'document-parked'), other = draft('합성 전송 실패 입력', 'document-b');
  const state = { loaded: [held], parked: [prior], active: [held, other] };
  const stored = alphaUiRecoveryDocumentDrafts(state), before = structuredClone(stored);
  assert.deepEqual(recoveryToastDraftsForHeldInput(stored, state, [held]), [held, prior, other]);
  assert.deepEqual(stored, before); assert.equal(alphaUiRecoveryDocumentDrafts(state).length, 4);
});

test('stale held snapshots and documentless inputs never silence a current recovery notice', () => {
  const current = draft('합성 새 입력'), temp = temporary('합성 임시 입력');
  const state = { loaded: [], parked: [], active: [current, temp] }, stored = alphaUiRecoveryDocumentDrafts(state);
  assert.deepEqual(recoveryToastDraftsForHeldInput(stored, state, [draft('합성 이전 입력'), temp]), stored);
  assert.deepEqual(recoveryToastDraftsForHeldInput(stored, state, []), stored);
});
class Storage {
  values = new Map<string, string>();
  removed: string[] = [];
  failWrite = false;
  failReadback = false;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.failWrite) throw Error('synthetic-quota');
    this.values.set(key, this.failReadback ? `${value} ` : value);
  }
  removeItem(key: string) { this.removed.push(key); this.values.delete(key); }
}
function stored(drafts: readonly AlphaUiDraft[]) {
  const storage = new Storage(), port = createAlphaUiRecovery(storage, { ownerId: 'synthetic-owner', slotId: 'synthetic-tab' });
  assert.equal(port.read().ok, true);
  assert.equal(port.save(drafts).ok, true);
  return { storage, port };
}
function read(port: AlphaUiRecoveryPort) {
  const result = port.read(); assert.equal(result.ok, true);
  return result.ok ? result.value?.drafts ?? [] : [];
}

test('only current-generation document versions collapse; every loaded version and duplicate remains', () => {
  const loaded = [draft('과거 1'), draft('과거 2'), draft('과거 1')];
  let state = createAlphaUiRecoveryDocuments(loaded);
  state = captureAlphaUiRecoveryDocuments(state, [draft('새 입력 1'), draft('다른 문서', 'document-b')]);
  state = parkAlphaUiRecoveryDocuments(state);
  state = captureAlphaUiRecoveryDocuments(state, [draft('새 입력 2')]);
  state = parkAlphaUiRecoveryDocuments(state);
  state = captureAlphaUiRecoveryDocuments(state, [draft('새 입력 3', 'document-a', '바뀐 제목')]);
  assert.deepEqual(alphaUiRecoveryDocumentDrafts(state), [...loaded, draft('다른 문서', 'document-b'), draft('새 입력 3', 'document-a', '바뀐 제목')]);
  assert.deepEqual(loaded, [draft('과거 1'), draft('과거 2'), draft('과거 1')]);
  assert.deepEqual(parkedAlphaUiRecoveryDocuments(state), [...loaded, draft('다른 문서', 'document-b')]);
});

test('capture is a detached proposal: a failed write leaves the original refs and bytes intact', () => {
  const state = captureAlphaUiRecoveryDocuments(createAlphaUiRecoveryDocuments([draft('로드 원문')]), [draft('기존 입력')]);
  const before = structuredClone(state), { port, storage } = stored(alphaUiRecoveryDocumentDrafts(state));
  const raw = storage.getItem(port.key);
  const next = captureAlphaUiRecoveryDocuments(state, [draft('최신 입력')]);
  storage.failWrite = true;
  assert.equal(port.save(alphaUiRecoveryDocumentDrafts(next)).ok, false);
  assert.deepEqual(state, before);
  assert.equal(storage.getItem(port.key), raw);
  assert.deepEqual(storage.removed, []);
});

test('empty captures do not infer that a previously protected input was discarded', () => {
  const state = captureAlphaUiRecoveryDocuments(createAlphaUiRecoveryDocuments(), [draft('확인 전 입력')]);
  assert.equal(captureAlphaUiRecoveryDocuments(state, []), state);
  assert.deepEqual(alphaUiRecoveryDocumentDrafts(state), [draft('확인 전 입력')]);
});

test('a document that leaves the live snapshot stays parked while another document is edited', () => {
  const previous = captureAlphaUiRecoveryDocuments(createAlphaUiRecoveryDocuments(), [draft('첫 문서')]);
  const next = captureAlphaUiRecoveryDocuments(previous, [draft('둘째 문서', 'document-b')]);
  assert.deepEqual(alphaUiRecoveryDocumentDrafts(next), [draft('첫 문서'), draft('둘째 문서', 'document-b')]);
  assert.deepEqual(parkedAlphaUiRecoveryDocuments(next), [draft('첫 문서')]);
});

test('temporary inputs never share a null document slot, including identical inputs', () => {
  const inputs = [temporary('메모 1'), temporary('메모 2'), temporary('같은 원문'), temporary('같은 원문')];
  assert.deepEqual(latestAlphaUiDocumentDrafts(inputs), inputs);
  const state = parkAlphaUiRecoveryDocuments(captureAlphaUiRecoveryDocuments(createAlphaUiRecoveryDocuments(), inputs));
  assert.deepEqual(alphaUiRecoveryDocumentDrafts(state), inputs);
  const groups = groupAlphaUiRecoveryDocuments(inputs);
  assert.equal(groups.length, 4);
  assert.deepEqual(groups.map(group => group.entries.map(entry => entry.index)), [[0], [1], [2], [3]]);
});

test('refused temporary inputs are parked individually without replacing loaded history', () => {
  let state = createAlphaUiRecoveryDocuments([temporary('과거 보관')]);
  state = keepAlphaUiRecoveryDocument(state, temporary('같은 원문'));
  state = keepAlphaUiRecoveryDocument(state, temporary('같은 원문'));
  assert.deepEqual(alphaUiRecoveryDocumentDrafts(state), [temporary('과거 보관'), temporary('같은 원문'), temporary('같은 원문')]);
});

test('handed-off drafts become preserved history rather than another current-generation slot', () => {
  const old = draft('예전 원문'), handed = [old, draft('다른 예전 원문')];
  let state = captureAlphaUiRecoveryDocuments(createAlphaUiRecoveryDocuments([old]), [draft('새 원문')]);
  state = loadAlphaUiRecoveryDocuments(state, handed);
  state = captureAlphaUiRecoveryDocuments(state, [draft('더 새 원문')]);
  assert.deepEqual(alphaUiRecoveryDocumentDrafts(state), [...handed, old, draft('더 새 원문')]);
});

test('document groups expose every original record index, including loaded older versions', () => {
  const inputs = [draft('과거'), draft('다른 문서', 'document-b'), temporary('임시'), draft('최신', 'document-a', '새 제목'), draft('과거')];
  const groups = groupAlphaUiRecoveryDocuments(inputs);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].title, '작성 문서');
  assert.deepEqual(groups[0].entries.map(entry => entry.index), [0, 3, 4]);
  assert.deepEqual(groups.flatMap(group => group.entries).sort((a, b) => a.index - b.index).map(entry => entry.draft), inputs);
});

test('confirmation removes only exact document/raw pairs and keeps other versions and temporary inputs', () => {
  const loaded = [draft('과거'), draft('확정'), draft('다른 확정', 'document-b'), draft('확정', 'missing-document'), temporary('확정')];
  const state = captureAlphaUiRecoveryDocuments(createAlphaUiRecoveryDocuments(loaded), [draft('더 최신 입력')]);
  const { port, storage } = stored(alphaUiRecoveryDocumentDrafts(state));
  const confirmed = new Map([['document-a', '확정'], ['document-b', '다른 확정']]);
  const result = clearConfirmedAlphaUiRecoveryDocuments(port, state, id => confirmed.get(id));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const remaining = [loaded[0], loaded[3], loaded[4], draft('더 최신 입력')];
  assert.deepEqual(read(port), remaining);
  assert.deepEqual(result.record?.drafts, remaining);
  assert.deepEqual(alphaUiRecoveryDocumentDrafts(result.state), remaining);
  assert.deepEqual(result.state.active, [draft('더 최신 입력')]);
  assert.deepEqual(storage.removed, []);
  assert.equal(state.loaded.length, 5, 'the old refs are not mutated in place');
});

test('a stale confirmation cannot remove a newer raw of the same document', () => {
  let state = captureAlphaUiRecoveryDocuments(createAlphaUiRecoveryDocuments(), [draft('요청 원문 A')]);
  state = captureAlphaUiRecoveryDocuments(state, [draft('새 입력 B')]);
  const { port, storage } = stored(alphaUiRecoveryDocumentDrafts(state)), raw = storage.getItem(port.key);
  const result = clearConfirmedAlphaUiRecoveryDocuments(port, state, () => '요청 원문 A');
  assert.equal(result.ok, true);
  assert.equal(storage.getItem(port.key), raw);
  assert.deepEqual(read(port), [draft('새 입력 B')]);
  assert.deepEqual(storage.removed, []);
});

test('matching is byte-exact for whitespace, Unicode and empty raw; missing IDs never match empty raw', () => {
  const inputs = [draft(''), draft('한글\r\n끝 '), draft('한글\n끝 ', 'document-b'), draft('', 'missing'), temporary('')];
  const state = createAlphaUiRecoveryDocuments(inputs), { port } = stored(inputs);
  const confirmed = new Map([['document-a', ''], ['document-b', '한글\r\n끝 ']]);
  const result = clearConfirmedAlphaUiRecoveryDocuments(port, state, id => confirmed.get(id));
  assert.equal(result.ok, true);
  assert.deepEqual(read(port), inputs.slice(1));
});

test('the expected record is cleared only when every stored entry has an exact confirmed match', () => {
  const inputs = [draft('확정 A'), draft('확정 B', 'document-b')], state = createAlphaUiRecoveryDocuments(inputs);
  const { port, storage } = stored(inputs), confirmed = new Map(inputs.map(entry => [entry.documentId!, entry.raw]));
  const result = clearConfirmedAlphaUiRecoveryDocuments(port, state, id => confirmed.get(id));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.record, null);
  assert.deepEqual(alphaUiRecoveryDocumentDrafts(result.state), []);
  assert.deepEqual(storage.removed, [port.key]);
});

test('failed partial cleanup preserves prior refs and stored originals', () => {
  const inputs = [draft('확정 A'), draft('아직 미확정', 'document-b')], state = createAlphaUiRecoveryDocuments(inputs);
  const original = structuredClone(state), { port, storage } = stored(inputs), raw = storage.getItem(port.key);
  storage.failWrite = true;
  assert.deepEqual(clearConfirmedAlphaUiRecoveryDocuments(port, state, id => id === 'document-a' ? '확정 A' : undefined), { ok: false });
  assert.deepEqual(state, original);
  assert.equal(storage.getItem(port.key), raw);
  assert.deepEqual(storage.removed, []);
});

test('failed readback also preserves the previous refs and never proceeds to delete', () => {
  const inputs = [draft('확정 A'), draft('미확정 B', 'document-b')], state = createAlphaUiRecoveryDocuments(inputs);
  const original = structuredClone(state), { port, storage } = stored(inputs);
  storage.failReadback = true;
  assert.deepEqual(clearConfirmedAlphaUiRecoveryDocuments(port, state, id => id === 'document-a' ? '확정 A' : undefined), { ok: false });
  assert.deepEqual(state, original);
  assert.deepEqual(storage.removed, []);
});

test('external replacement remains fail-closed and is never overwritten by cleanup', () => {
  const inputs = [draft('확정 A'), draft('미확정 B', 'document-b')], state = createAlphaUiRecoveryDocuments(inputs);
  const { port, storage } = stored(inputs);
  const foreign = 'synthetic-external-record'; storage.values.set(port.key, foreign);
  assert.deepEqual(clearConfirmedAlphaUiRecoveryDocuments(port, state, () => '확정 A'), { ok: false });
  assert.equal(storage.getItem(port.key), foreign);
  assert.deepEqual(alphaUiRecoveryDocumentDrafts(state), inputs);
  assert.deepEqual(storage.removed, []);
});

test('same-port capture after the first read refuses stale partial cleanup', () => {
  const inputs = [draft('확정 A'), draft('미확정 B', 'document-b')], state = createAlphaUiRecoveryDocuments(inputs);
  const { port, storage } = stored(inputs), newer = [draft('새 입력 C')];
  let reads = 0;
  const raced: AlphaUiRecoveryPort = { ...port, read() {
    if (++reads === 2) assert.equal(port.save(newer).ok, true);
    return port.read();
  } };
  assert.deepEqual(clearConfirmedAlphaUiRecoveryDocuments(raced, state, () => '확정 A'), { ok: false });
  assert.deepEqual(read(port), newer);
  assert.deepEqual(alphaUiRecoveryDocumentDrafts(state), inputs);
  assert.deepEqual(storage.removed, []);
});
