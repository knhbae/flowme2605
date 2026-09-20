import assert from 'node:assert/strict';
import test from 'node:test';
import { planProgramDateBlockOrder as plan } from './date-block-order';
import { createEmptyTextWorkspace, textWorkspaceModel as M } from './text-workspace';
import { applyProgramLinePermutation } from './line-permutation';

function fixture(raw: string) {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '작성 중' });
  const id = state.documents[0].id;
  state = M.editText(state, id, raw, { progressDate: '2026-09-12' });
  assert.equal(M.raw(state.documents[0]), raw);
  const scopeId = state.documents[0].lines.find(line => line.text === '## 준비')!.id;
  return { state, id, scopeId };
}
const late = '- [40%] 늦은 준비\n  - 날짜: 2026-09-23\n  - 메모: 개인 메모\n  - [ ] 하위 준비';
const early = '- [ ] 빠른 준비\n  - 날짜: 2026-09-20';

test('same explicit Step sorts full item bodies and preserves prefix, other Step, sidecars and inverse IDs', () => {
  const raw = `# 내 문서\n## 준비\n${late}\n${early}\n## 다른 구간\n- [ ] 날짜 미정`;
  const { state, id, scopeId } = fixture(raw), before = structuredClone(state);
  const result = plan(state, id, scopeId);
  assert.equal(result.status, 'ready'); if (result.status !== 'ready') return;
  assert.equal(result.afterRaw, `# 내 문서\n## 준비\n${early}\n${late}\n## 다른 구간\n- [ ] 날짜 미정`);
  const next = applyProgramLinePermutation(state, id, result.afterLineIds)!;
  assert.deepEqual(next.progressRecords, state.progressRecords);
  assert.deepEqual(applyProgramLinePermutation(next, id, result.beforeLineIds), state);
  assert.deepEqual(state, before);
});

test('same date sorts all-day then time and preserves stable ties', () => {
  const raw = '## 준비\n- [ ] 오후\n  - 날짜: 2026-09-20\n  - 시간: 15:00\n- [ ] 종일\n  - 날짜: 2026-09-20\n- [ ] 오전\n  - 날짜: 2026-09-20\n  - 시간: 09:00';
  const { state, id, scopeId } = fixture(raw), result = plan(state, id, scopeId);
  assert.equal(result.status, 'ready'); if (result.status !== 'ready') return;
  assert.deepEqual(result.afterItemIds, [result.beforeItemIds[1], result.beforeItemIds[2], result.beforeItemIds[0]]);
});

test('same-order preview is a no-op', () => {
  const { state, id, scopeId } = fixture(`## 준비\n${early}\n${late}`);
  assert.deepEqual(plan(state, id, scopeId), { status: 'noop' });
});

test('one-body selection follows its item with backward direction', () => {
  const raw = `## 준비\n${late}\n${early}`, { state, id, scopeId } = fixture(raw);
  const start = raw.indexOf('개인 메모'), selection = { start, end: start + 5, direction: 'backward' as const };
  const result = plan(state, id, scopeId, selection);
  assert.equal(result.status, 'ready'); if (result.status !== 'ready') return;
  assert.equal(result.afterRaw.slice(result.selectionAfter.start, result.selectionAfter.end), '개인 메모');
  assert.equal(result.selectionAfter.direction, 'backward');
  assert.equal(plan(state, id, scopeId, { start, end: raw.length, direction: 'forward' }).status, 'blocked');
});

test('undated, invalid, unowned prose and nested scope do not gain a sorting authority', () => {
  for (const body of [
    `${late}\n- [ ] 미정`,
    `${late}\n- [ ] 잘못된 날짜\n  - 날짜: 2026-02-30`,
    `${late}\n설명 소유 불명\n${early}`,
    `${late}\n### 중첩 구간\n${early}`,
    `${late}\n${early}\n  - 날짜: 2026-09-21`,
  ]) {
    const { state, id, scopeId } = fixture(`## 준비\n${body}`);
    assert.equal(plan(state, id, scopeId).status, 'blocked');
  }
});

test('date markers are not substituted for an explicit Step', () => {
  const { state, id } = fixture(`## 준비\n[2026-09-23]\n- [ ] 늦음\n[2026-09-20]\n- [ ] 빠름`);
  assert.equal(plan(state, id, state.documents[0].lines[1].id).status, 'blocked');
});

test('blank separator remains in its slot and the final newline stays exact', () => {
  const raw = `## 준비\n\n${late}\n\n${early}\n`, { state, id, scopeId } = fixture(raw);
  const result = plan(state, id, scopeId);
  assert.equal(result.status, 'ready'); if (result.status !== 'ready') return;
  assert.equal(result.afterRaw, `## 준비\n\n${early}\n\n${late}\n`);
});

test('same-date ties preserve duplicate property IDs with an explicit permutation', () => {
  const raw = `## 준비\n${late}\n${early}\n- [ ] 또 빠른 준비\n  - 날짜: 2026-09-20`;
  const { state, id, scopeId } = fixture(raw), result = plan(state, id, scopeId);
  assert.equal(result.status, 'ready'); if (result.status !== 'ready') return;
  assert.deepEqual(result.afterItemIds, [result.beforeItemIds[1], result.beforeItemIds[2], result.beforeItemIds[0]]);
  assert.deepEqual(applyProgramLinePermutation(applyProgramLinePermutation(state, id, result.afterLineIds)!, id, result.beforeLineIds), state);
});

test('duplicate body text cannot silently swap line identities', () => {
  const raw = '## 준비\n- [ ] 같은 제목\n  - 날짜: 2026-09-23\n- [ ] 같은 제목\n  - 날짜: 2026-09-20';
  const { state, id, scopeId } = fixture(raw);
  const result = plan(state, id, scopeId);
  assert.equal(result.status, 'ready'); if (result.status !== 'ready') return;
  assert.deepEqual(result.afterItemIds, result.beforeItemIds.slice().reverse());
});
