import assert from 'node:assert/strict';
import test from 'node:test';
import { toContentDisplayTitle, toUserFacingMapTitle, toUserFacingSourceTitle } from './display-title';

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

test('toUserFacingMapTitle hides internal map wording in saved content labels', () => {
  assert.equal(toUserFacingMapTitle('원룸 이사 D-30 일정 지도'), '원룸 이사 D-30 일정');
  assert.equal(toUserFacingMapTitle('영유아 검진·접종 일정 지도'), '영유아 검진·접종 일정');
  assert.equal(toUserFacingMapTitle('중1 수학 목차 진도표'), '중1 수학 목차 진도표');
});

test('toUserFacingSourceTitle removes slug-like source prefixes without changing source data', () => {
  assert.equal(toUserFacingSourceTitle('Mathbang 중1 수학 목차'), '중1 수학 목차');
  assert.equal(toUserFacingSourceTitle('Mathbang 중1 목차'), '중1 목차');
  assert.equal(toUserFacingSourceTitle('AJD 이사 준비 체크리스트'), '이사 준비 체크리스트');
  assert.equal(toUserFacingSourceTitle('AJD 이사할 때 체크리스트 상세 정리'), '이사할 때 체크리스트 상세 정리');
});
