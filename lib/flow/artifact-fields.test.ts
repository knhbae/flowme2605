import assert from 'node:assert/strict';
import test from 'node:test';
import { getComparisonConfig, getLogTables, getMemoCardFields } from './artifact-fields';
import { seedBundles } from './seed-flows';

function bundle(slug: string) {
  const found = seedBundles.find((entry) => entry.flow.slug === slug);
  assert.ok(found, `missing seed bundle: ${slug}`);
  return found;
}

test('driver license route exposes condition comparison rows for renewal choices', () => {
  const config = getComparisonConfig(bundle('driver-license-renewal-check'));

  assert.ok(config);
  assert.equal(config.title, '면허 갱신/적성검사 조건표');
  assert.deepEqual(config.rows.map((row) => row.title), [
    '면허/갱신 유형',
    '건강검진 자료 활용 가능 여부',
    '사진·신분증·수수료 준비',
    '온라인 신청 또는 방문 수령 경로',
  ]);
});

test('official document routes expose submitter requirement memo fields', () => {
  const familyFields = getMemoCardFields(bundle('family-certificate-issue'));
  const residentFields = getMemoCardFields(bundle('resident-register-copy-issue'));

  assert.deepEqual(familyFields.map((field) => field.label), [
    '제출처 요구사항',
    '증명서 종류',
    '일반/상세/특정 범위',
    '주민등록번호 공개 범위',
    '파일/출력 위치',
  ]);
  assert.deepEqual(residentFields.map((field) => field.label), [
    '제출처 요구사항',
    '등본/초본 선택',
    '주소 변동·세대원·병역 표시',
    '주민등록번호 공개 범위',
    '발급일·파일 위치',
  ]);
});

test('qnet route exposes application deadline and exam-day log tables', () => {
  const tables = getLogTables(bundle('qnet-exam-application-prep'));

  assert.deepEqual(tables.map((table) => table.title), ['접수·결제 마감 기록', '수험표·시험장 준비 기록']);
  assert.deepEqual(tables[0]?.rows.map((row) => row.label), ['원서접수 마감', '결제 완료', '환불·변경 마감']);
  assert.deepEqual(tables[1]?.rows.map((row) => row.label), ['수험표 출력', '시험장·입실 시간', '합격자 발표일']);
});
