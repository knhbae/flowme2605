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
  const studyTables = getLogTables(bundle('computer-skills-d30-study'));
  assert.deepEqual(
    studyTables.map((table) => table.id),
    ['study-chapter-progress', 'study-mock-scores'],
  );
  assert.deepEqual(studyTables[0]?.rows.map((row) => row.label), [
    '필기 핵심 개념 정리',
    '스프레드시트 실기 함수·피벗',
    '데이터베이스 실기 쿼리·폼',
    '기출 오답 보완과 실전 점검',
  ]);
  assert.deepEqual(studyTables[0]?.rows[0]?.defaultValues, {
    scope: '컴퓨터 일반·스프레드시트 핵심 개념',
    status: '원본에서 가져온 진도',
    note: '시험일까지 먼저 배치하고 약한 단원만 조정',
  });

  assert.equal(getComparisonConfig(bundle('new-car-delivery-check')), undefined);

  assert.deepEqual(
    getMemoCardFields(bundle('new-car-delivery-check')).map((field) => field.id),
    ['new-car-delivery-place', 'new-car-photo-files', 'new-car-dealer-confirmation', 'new-car-handover-boundary'],
  );
  const [newCarMemo] = getMemoCardFields(bundle('new-car-delivery-check'));
  assert.equal(newCarMemo?.groupTitle, '사진·딜러 확인·서명 전 보류 기록');
  assert.match(newCarMemo?.groupDescription ?? '', /체크 완료보다 사진 파일명, 딜러 확인, 보류 조건/);

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

test('computer skills progress table keeps source rows separate from user-editable fields', () => {
  const [progressTable] = getLogTables(bundle('computer-skills-d30-study'));

  assert.equal(progressTable?.id, 'study-chapter-progress');
  assert.equal(progressTable?.sourceKind, 'source_derived');
  assert.deepEqual(progressTable?.readOnlyColumnIds, ['scope']);
  assert.deepEqual(progressTable?.userEditableColumnIds, ['targetDate', 'status', 'note']);
  assert.deepEqual(
    progressTable?.rows.map((row) => Object.keys(row.defaultValues ?? {}).sort()),
    [
      ['note', 'scope', 'status'],
      ['note', 'scope', 'status'],
      ['note', 'scope', 'status'],
      ['note', 'scope', 'status'],
    ],
  );
});

test('used-car route keeps the field workbench checklist-only', () => {
  assert.equal(getComparisonConfig(bundle('used-car-buying-check')), undefined);
  assert.deepEqual(getMemoCardFields(bundle('used-car-buying-check')), []);
});

test('workout programming routes expose source-rule decision rows', () => {
  const slugs = [
    'real-fitvely-video-bulk-up-method',
    'real-fitvely-video-workout-order',
    'real-fitvely-video-workout-split-science',
  ];

  for (const slug of slugs) {
    const config = getComparisonConfig(bundle(slug));

    assert.equal(config?.title, '운동 기준 결정표', slug);
    assert.deepEqual(
      config?.rows.map((row) => row.id),
      [
        'workout-source-rule-candidate',
        'workout-user-condition-fit',
        'workout-weekly-plan-application',
        'workout-revise-or-hold',
      ],
      slug,
    );
  }
});

test('vehicle inspection route removes memo fields from the primary workbench', () => {
  const fields = getMemoCardFields(bundle('vehicle-inspection-prep'));

  assert.deepEqual(fields, []);
});

test('MOFA travel prep route removes emergency memo fields from the primary workbench', () => {
  const fields = getMemoCardFields(bundle('real-mofa-overseas-travel-prep'));

  assert.deepEqual(fields, []);
});

test('FITVELY diet record route removes sheet-style log tables', () => {
  const tables = getLogTables(bundle('real-fitvely-diet-record-routine'));

  assert.deepEqual(tables, []);
});

test('FITVELY nutrition exact-video routes expose apply-before-after observation rows', () => {
  const slugs = [
    'real-fitvely-video-body-fat-6kg-method',
    'real-fitvely-video-carb-reason',
    'real-fitvely-video-three-week-check',
    'real-fitvely-video-post-workout-nutrition',
    'real-fitvely-video-carb-amount-shorts',
    'real-fitvely-video-after-work-nutrition',
    'real-fitvely-video-weight-class-method',
  ];

  for (const slug of slugs) {
    const tables = getLogTables(bundle(slug));

    assert.deepEqual(tables.map((table) => table.id), ['fitvely-nutrition-action-observation-log'], slug);
    assert.deepEqual(
      tables[0]?.columns.map((column) => column.id),
      ['date', 'targetAction', 'selectedRule', 'beforeCondition', 'afterReaction', 'keepOrStop'],
      slug,
    );
    assert.deepEqual(
      tables[0]?.rows.map((row) => row.id),
      ['fitvely-nutrition-before', 'fitvely-nutrition-after'],
      slug,
    );
  }
});

test('official document routes expose submitter requirement memo fields', () => {
  const familyFields = getMemoCardFields(bundle('family-certificate-issue'));
  const residentFields = getMemoCardFields(bundle('resident-register-copy-issue'));
  const passportFields = getMemoCardFields(bundle('passport-renewal-docs'));

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
  assert.deepEqual(passportFields, []);
});

test('moving route removes vendor comparison and proof memo from the primary workbench', () => {
  assert.equal(getComparisonConfig(bundle('moving-d30-basic')), undefined);
  assert.deepEqual(getMemoCardFields(bundle('moving-d30-basic')), []);
});

test('qnet route exposes application deadline and exam-day log tables', () => {
  const tables = getLogTables(bundle('qnet-exam-application-prep'));

  assert.deepEqual(tables.map((table) => table.title), ['접수·결제 마감 기록', '수험표·시험장 준비 기록']);
  assert.deepEqual(tables[0]?.rows.map((row) => row.label), ['원서접수 마감', '결제 완료', '환불·변경 마감']);
  assert.deepEqual(tables[1]?.rows.map((row) => row.label), ['수험표 출력', '시험장·입실 시간', '합격자 발표일']);
});
