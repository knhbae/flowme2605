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

test('real-source official reshape batch exposes route-specific workbench records', () => {
  assert.deepEqual(
    getLogTables(bundle('real-qnet-application-examday-check')).map((table) => table.id),
    ['qnet-application-deadlines', 'qnet-exam-day-records'],
  );

  assert.deepEqual(
    getComparisonConfig(bundle('real-safe-driving-license-renewal'))?.rows.map((row) => row.id),
    ['driver-license-renewal-type', 'driver-license-health-check', 'driver-license-materials-fee', 'driver-license-apply-pickup'],
  );

  assert.deepEqual(
    getMemoCardFields(bundle('real-gov24-resident-register-copy')).map((field) => field.id),
    ['resident-submitter-requirement', 'resident-document-kind', 'resident-display-items', 'resident-disclosure-scope', 'resident-file-location'],
  );

  assert.deepEqual(
    getMemoCardFields(bundle('real-childcare-vaccination-visit-prep')).map((field) => field.id),
    ['childcare-visit-purpose', 'childcare-recent-symptoms', 'childcare-questions', 'childcare-post-visit-observation', 'childcare-next-visit'],
  );

  assert.deepEqual(
    getMemoCardFields(bundle('real-kdca-travel-health-check')).map((field) => field.id),
    ['kdca-destination', 'kdca-official-check-date', 'kdca-vaccine-consultation', 'kdca-medicine-kit', 'kdca-recheck-date'],
  );

  assert.deepEqual(
    getComparisonConfig(bundle('real-childcare-support-application-check'))?.rows.map((row) => row.id),
    ['childcare-support-age-condition', 'childcare-support-monthly-hours', 'childcare-support-center-slot', 'childcare-support-first-visit-docs'],
  );
});

test('source replacement and risk review routes expose review-specific artifact records', () => {
  assert.deepEqual(
    getLogTables(bundle('computer-skills-d30-study')).map((table) => table.id),
    ['study-chapter-progress', 'study-mock-scores'],
  );

  assert.deepEqual(
    getComparisonConfig(bundle('new-car-delivery-check'))?.rows.map((row) => row.id),
    ['new-car-exterior-interior', 'new-car-electronics-options', 'new-car-documents', 'new-car-defect-dealer-confirmation'],
  );

  assert.deepEqual(
    getMemoCardFields(bundle('new-car-delivery-check')).map((field) => field.id),
    ['new-car-delivery-place', 'new-car-photo-files', 'new-car-dealer-confirmation', 'new-car-handover-boundary'],
  );

  assert.deepEqual(
    getMemoCardFields(bundle('year-end-tax-docs')).map((field) => field.id),
    ['tax-company-deadline', 'tax-final-data-date', 'tax-extra-documents', 'tax-deduction-caution', 'tax-submission-status'],
  );

  assert.deepEqual(
    getMemoCardFields(bundle('business-registration-basic')).map((field) => field.id),
    ['business-type-question', 'business-place-document', 'business-license-permit', 'business-tax-office-question', 'business-submission-proof'],
  );

  assert.deepEqual(
    getMemoCardFields(bundle('happy-birth-service-check')).map((field) => field.id),
    ['happy-birth-child-date', 'happy-birth-household-area', 'happy-birth-guardian-account', 'happy-birth-official-question', 'happy-birth-submission-proof'],
  );

  assert.deepEqual(
    getMemoCardFields(bundle('industrial-accident-claim-docs')).map((field) => field.id),
    ['industrial-claim-type', 'industrial-receipt-files', 'industrial-amount-record', 'industrial-official-question', 'industrial-supplement-request'],
  );

  assert.deepEqual(
    getMemoCardFields(bundle('national-health-checkup-d7')).map((field) => field.id),
    ['health-check-date-place', 'health-check-medicine-question', 'health-check-fasting-confirmation', 'health-check-endoscopy-transport', 'health-check-result-method'],
  );

  assert.deepEqual(
    getMemoCardFields(bundle('vaccination-certificate-issue')).map((field) => field.id),
    ['vaccination-certificate-target', 'vaccination-certificate-language', 'vaccination-certificate-submit-requirement', 'vaccination-certificate-missing-record', 'vaccination-certificate-file-location'],
  );

  assert.deepEqual(
    getMemoCardFields(bundle('job-change-risk-check')).map((field) => field.id),
    ['job-change-company-question', 'job-change-public-insurance-check', 'job-change-retirement-pay-note', 'job-change-gap-budget', 'job-change-decision-boundary'],
  );
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
