import assert from 'node:assert/strict';
import test from 'node:test';
import { childDraftRecoveryEntries, readChildDrafts } from './child-draft-recovery';

const tasks = [{ id: 'parent', title: '주말 장보기' }, { id: 'a:b', title: '콜론 있는 부모' }];

test('unconfirmed panel text becomes a recovery entry titled by its parent, without a document ID', () => {
  const drafts = readChildDrafts({ 'parent:task': '우유 사기', 'parent:memo': '마트 두 곳 비교' }, tasks);
  assert.deepEqual(drafts, [
    { kind: 'task', parentTitle: '주말 장보기', text: '우유 사기' },
    { kind: 'memo', parentTitle: '주말 장보기', text: '마트 두 곳 비교' },
  ]);
  assert.deepEqual(childDraftRecoveryEntries(drafts), [
    { title: '‘주말 장보기’ 아래 하위 할 일 초안', raw: '우유 사기' },
    { title: '‘주말 장보기’ 아래 메모 초안', raw: '마트 두 곳 비교' },
  ]);
  assert(childDraftRecoveryEntries(drafts).every(entry => !('documentId' in entry)));
});

test('a confirmed child leaves the record and is not captured again', () => {
  const record: Record<string, string> = { 'parent:task': '우유 사기' };
  assert.equal(readChildDrafts(record, tasks).length, 1);
  delete record['parent:task'];
  assert.deepEqual(readChildDrafts(record, tasks), []);
});

test('blank panels, unknown kinds, and removed parents are handled without losing text', () => {
  assert.deepEqual(readChildDrafts({ 'parent:task': '   ', 'parent:other': '무시', broken: '키 없음' }, tasks), []);
  assert.deepEqual(readChildDrafts({ 'gone:task': '남은 글' }, tasks), [{ kind: 'task', parentTitle: '지워진 항목', text: '남은 글' }]);
  assert.deepEqual(readChildDrafts({ 'a:b:memo': '부모 ID에 콜론' }, tasks), [{ kind: 'memo', parentTitle: '콜론 있는 부모', text: '부모 ID에 콜론' }]);
});
