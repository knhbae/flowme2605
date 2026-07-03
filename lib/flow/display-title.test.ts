import assert from 'node:assert/strict';
import test from 'node:test';
import { toContentDisplayTitle } from './display-title';

test('toContentDisplayTitle removes trailing Flow from content titles only', () => {
  assert.equal(toContentDisplayTitle('자동차검사 D-14 준비 Flow'), '자동차검사 D-14 준비');
  assert.equal(toContentDisplayTitle('이사 D-30 준비Flow'), '이사 D-30 준비');
  assert.equal(toContentDisplayTitle('전세계약 전 서류 체크 Flow'), '전세계약 전 서류 체크');
});

test('toContentDisplayTitle keeps service navigation and brand labels', () => {
  assert.equal(toContentDisplayTitle('FlowMe'), 'FlowMe');
  assert.equal(toContentDisplayTitle('내 Flow'), '내 Flow');
  assert.equal(toContentDisplayTitle('Flow 찾기'), 'Flow 찾기');
  assert.equal(toContentDisplayTitle('Flow'), 'Flow');
});
