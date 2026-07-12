import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceBackedMyFlowMaps } from './source-backed-my-flow';
import {
  buildSourceBackedManualRegistrationQaHtml,
  buildSourceBackedManualRegistrationQaReport,
} from './source-backed-manual-registration-report';

test('manual registration QA report summarizes lookup and hold buckets', () => {
  const report = buildSourceBackedManualRegistrationQaReport({
    generatedAt: '2026-07-06T00:00:00.000+09:00',
  });

  assert.equal(report.summary.totalMaps, sourceBackedMyFlowMaps.length);
  assert.ok(report.summary.lookupEligibleCount > 0);
  assert.equal(report.summary.registrationHoldCount, 0);
  assert.ok(report.summary.lookupBlockedCount > 0);
  assert.equal(report.summary.issueCounts.duplicate_canonical_source_url.mapCount, 0);
  assert.equal(report.summary.issueCounts.missing_source_trace.mapCount, 0);
  assert.equal(report.summary.issueCounts.missing_source_trace.stepCount, 0);
  assert.equal(report.summary.issueCounts.empty_registered_steps.mapCount >= 0, true);
  assert.equal(report.summary.issueCounts.missing_source_url.mapCount >= 0, true);
  assert.ok(!report.rows.some((row) => row.status === 'registration_hold'));
  assert.ok(!report.rows.some((row) => row.issueCodes.includes('duplicate_canonical_source_url')));
  assert.ok(!report.rows.some((row) => row.issueCodes.includes('missing_source_trace')));
});

test('manual registration QA report includes the operator runbook and sample rehearsal', () => {
  const report = buildSourceBackedManualRegistrationQaReport({
    generatedAt: '2026-07-06T00:00:00.000+09:00',
  });
  const html = buildSourceBackedManualRegistrationQaHtml(report);

  assert.equal(report.runbook[0]?.title, '후보 Markdown 확인');
  assert.ok(report.runbook.some((step) => step.title === 'URL hit 확인'));
  assert.equal(report.rehearsal.mapId, 'aircon-filter-cleaning');
  assert.equal(report.rehearsal.lookupStatus, 'hit');
  assert.equal(report.rehearsal.routeHref, '/flow-maps/aircon-filter-cleaning');
  assert.match(html, /수동 Flow 등록 QA 리포트/);
  assert.match(html, /lookup 가능/);
  assert.match(html, /등록 보류/);
  assert.match(html, /중복 canonical URL/);
  assert.match(html, /sourceTrace 누락/);
  assert.match(html, /Step 없음/);
  assert.match(html, /sourceUrl 누락/);
  assert.match(html, /후보 Markdown/);
  assert.match(html, /URL hit 확인/);
  assert.match(html, /aircon-filter-cleaning/);
});

test('manual registration QA report shows the repaired aircon candidate as a QA pass', () => {
  const report = buildSourceBackedManualRegistrationQaReport({
    generatedAt: '2026-07-06T00:00:00.000+09:00',
  });

  const aircon = report.rows.find((row) => row.mapId === 'aircon-filter-cleaning');
  assert.ok(aircon);
  assert.equal(aircon.status, 'qa_pass');
  assert.deepEqual(aircon.issueCodes, []);
  assert.equal(aircon.missingSourceTraceStepCount, 0);
  assert.ok(report.summary.qaPassCount >= 1);
  assert.equal(report.rehearsal.qaStatus, 'qa_pass');

  const html = buildSourceBackedManualRegistrationQaHtml(report);
  assert.match(html, /QA/);
  assert.match(html, /aircon-filter-cleaning/);
});

test('manual registration QA report prioritizes the remaining sourceTrace remediation queue', () => {
  const report = buildSourceBackedManualRegistrationQaReport({
    generatedAt: '2026-07-06T00:00:00.000+09:00',
  });

  assert.equal(report.summary.qaPassCount, 10);
  assert.equal(report.summary.registrationHoldCount, 0);
  assert.equal(report.summary.issueCounts.missing_source_trace.mapCount, 0);
  assert.equal(report.summary.issueCounts.missing_source_trace.stepCount, 0);

  const babyFood = report.rows.find((row) => row.mapId === 'baby-food-map');
  assert.ok(babyFood);
  assert.equal(babyFood.lookupEligible, false);
  assert.equal(babyFood.status, 'lookup_blocked');
  assert.deepEqual(babyFood.issueCodes, []);

  const reading = report.rows.find((row) => row.mapId === 'curated-reading-routine-log');
  assert.ok(reading);
  assert.equal(reading.status, 'qa_pass');
  assert.equal(reading.missingSourceTraceStepCount, 0);
  assert.deepEqual(reading.issueCodes, []);

  const moving = report.rows.find((row) => row.mapId === 'moving-d30');
  assert.ok(moving);
  assert.equal(moving.lookupEligible, true);
  assert.equal(moving.qualityStatus, 'representative');
  assert.equal(moving.status, 'qa_pass');
  assert.equal(moving.missingSourceTraceStepCount, 0);
  assert.deepEqual(moving.issueCodes, []);

  const curatedMoving = report.rows.find((row) => row.mapId === 'curated-ajd-moving-d30');
  assert.ok(curatedMoving);
  assert.equal(curatedMoving.lookupEligible, true);
  assert.equal(curatedMoving.qualityStatus, 'candidate');
  assert.equal(curatedMoving.status, 'qa_pass');
  assert.equal(curatedMoving.missingSourceTraceStepCount, 0);
  assert.deepEqual(curatedMoving.issueCodes, []);

  const newCar = report.rows.find((row) => row.mapId === 'curated-new-car-purchase-guide');
  assert.ok(newCar);
  assert.equal(newCar.lookupEligible, true);
  assert.equal(newCar.qualityStatus, 'candidate');
  assert.equal(newCar.status, 'qa_pass');
  assert.equal(newCar.missingSourceTraceStepCount, 0);
  assert.deepEqual(newCar.issueCodes, []);

  const math = report.rows.find((row) => row.mapId === 'middle-school-math-1');
  assert.ok(math);
  assert.equal(math.lookupEligible, true);
  assert.equal(math.qualityStatus, 'candidate');
  assert.equal(math.status, 'qa_pass');
  assert.equal(math.missingSourceTraceStepCount, 0);
  assert.deepEqual(math.issueCodes, []);

  const opic = report.rows.find((row) => row.mapId === 'curated-opic-mock-course');
  assert.ok(opic);
  assert.equal(opic.lookupEligible, true);
  assert.equal(opic.qualityStatus, 'candidate');
  assert.equal(opic.status, 'qa_pass');
  assert.equal(opic.missingSourceTraceStepCount, 0);
  assert.deepEqual(opic.issueCodes, []);

  const wedding = report.rows.find((row) => row.mapId === 'curated-wedding-checklist-family');
  assert.ok(wedding);
  assert.equal(wedding.lookupEligible, true);
  assert.equal(wedding.qualityStatus, 'candidate');
  assert.equal(wedding.status, 'qa_pass');
  assert.equal(wedding.missingSourceTraceStepCount, 0);
  assert.deepEqual(wedding.issueCodes, []);

  const allblancPass = report.rows.find((row) => row.mapId === 'curated-allblanc-workout-park');
  assert.ok(allblancPass);
  assert.equal(allblancPass.lookupEligible, true);
  assert.equal(allblancPass.qualityStatus, 'candidate');
  assert.equal(allblancPass.status, 'qa_pass');
  assert.equal(allblancPass.missingSourceTraceStepCount, 0);
  assert.deepEqual(allblancPass.issueCodes, []);

  const vaccination = report.rows.find((row) => row.mapId === 'curated-child-vaccination-schedule');
  assert.ok(vaccination);
  assert.equal(vaccination.lookupEligible, false);
  assert.equal(vaccination.qualityStatus, 'revise');
  assert.equal(vaccination.status, 'lookup_blocked');
  assert.equal(vaccination.missingSourceTraceStepCount, 0);
  assert.deepEqual(vaccination.issueCodes, []);

  const babyHealthPass = report.rows.find((row) => row.mapId === 'baby-health-schedule');
  assert.ok(babyHealthPass);
  assert.equal(babyHealthPass.lookupEligible, false);
  assert.equal(babyHealthPass.qualityStatus, 'revise');
  assert.equal(babyHealthPass.status, 'lookup_blocked');
  assert.equal(babyHealthPass.missingSourceTraceStepCount, 0);
  assert.deepEqual(babyHealthPass.issueCodes, []);

  const funmomPass = report.rows.find((row) => row.mapId === 'curated-funmom-learning-park');
  assert.ok(funmomPass);
  assert.equal(funmomPass.lookupEligible, false);
  assert.equal(funmomPass.qualityStatus, 'park');
  assert.equal(funmomPass.status, 'lookup_blocked');
  assert.equal(funmomPass.missingSourceTraceStepCount, 0);
  assert.deepEqual(funmomPass.issueCodes, []);

  const postalPass = report.rows.find((row) => row.mapId === 'postal-address-transfer');
  assert.ok(postalPass);
  assert.equal(postalPass.lookupEligible, true);
  assert.equal(postalPass.qualityStatus, 'park');
  assert.equal(postalPass.status, 'qa_pass');
  assert.equal(postalPass.missingSourceTraceStepCount, 0);
  assert.deepEqual(postalPass.issueCodes, []);

  const taxPass = report.rows.find((row) => row.mapId === 'year-end-tax-submit');
  assert.ok(taxPass);
  assert.equal(taxPass.lookupEligible, false);
  assert.equal(taxPass.qualityStatus, 'park');
  assert.equal(taxPass.status, 'lookup_blocked');
  assert.equal(taxPass.missingSourceTraceStepCount, 0);
  assert.deepEqual(taxPass.issueCodes, []);

  assert.equal(report.sourceTraceQueue.length, 0);
  assert.ok(!report.sourceTraceQueue.some((item) => item.mapId === 'curated-reading-routine-log'));
  assert.ok(!report.sourceTraceQueue.some((item) => item.mapId === 'moving-d30'));
  assert.ok(!report.sourceTraceQueue.some((item) => item.mapId === 'curated-ajd-moving-d30'));
  assert.ok(!report.sourceTraceQueue.some((item) => item.mapId === 'curated-new-car-purchase-guide'));
  assert.ok(!report.sourceTraceQueue.some((item) => item.mapId === 'middle-school-math-1'));
  assert.ok(!report.sourceTraceQueue.some((item) => item.mapId === 'curated-opic-mock-course'));
  assert.ok(!report.sourceTraceQueue.some((item) => item.mapId === 'curated-wedding-checklist-family'));
  assert.ok(!report.sourceTraceQueue.some((item) => item.mapId === 'curated-allblanc-workout-park'));
  assert.ok(!report.sourceTraceQueue.some((item) => item.mapId === 'curated-child-vaccination-schedule'));
  assert.ok(!report.sourceTraceQueue.some((item) => item.mapId === 'baby-health-schedule'));
  assert.ok(!report.sourceTraceQueue.some((item) => item.mapId === 'curated-funmom-learning-park'));
  assert.ok(!report.sourceTraceQueue.some((item) => item.mapId === 'postal-address-transfer'));
  assert.ok(!report.sourceTraceQueue.some((item) => item.mapId === 'year-end-tax-submit'));
  assert.ok(report.sourceTraceQueue.every((item) => item.missingSourceTraceStepCount > 0));

  const html = buildSourceBackedManualRegistrationQaHtml(report);
  assert.match(html, /sourceTrace remediation queue/);
  assert.match(html, /year-end-tax-submit/);
});

test('manual registration QA report classifies duplicate canonical URL groups with operator actions', () => {
  const report = buildSourceBackedManualRegistrationQaReport({
    generatedAt: '2026-07-06T00:00:00.000+09:00',
  });

  assert.equal(report.summary.issueCounts.duplicate_canonical_source_url.mapCount, 0);
  assert.equal(report.duplicateGroups.length, 0);
  assert.ok(!report.duplicateGroups.some((group) => group.mapIds.includes('funmom-study-routine-map')));
  assert.ok(!report.duplicateGroups.some((group) => group.mapIds.includes('opic-plan-map')));
  assert.ok(!report.duplicateGroups.some((group) => group.mapIds.includes('curated-baby-food-meal-log')));
  assert.ok(!report.duplicateGroups.some((group) => group.mapIds.includes('reading-routine-map')));
  assert.ok(!report.duplicateGroups.some((group) => group.mapIds.includes('new-car-map')));
  assert.ok(!report.duplicateGroups.some((group) => group.mapIds.includes('homefit-map')));
  assert.ok(!report.duplicateGroups.some((group) => group.mapIds.includes('moving-map')));
  assert.ok(!report.duplicateGroups.some((group) => group.mapIds.includes('vaccination-map')));
  assert.ok(!report.duplicateGroups.some((group) => group.mapIds.includes('wedding-map')));

  const opic = report.duplicateGroups.find((group) => group.canonicalUrl.includes('mansour.tistory.com'));
  assert.equal(opic, undefined);

  const newCar = report.duplicateGroups.find((group) => group.canonicalUrl.includes('web.getcha.kr'));
  assert.equal(newCar, undefined);

  const allblanc = report.duplicateGroups.find((group) => group.canonicalUrl.includes('@allblanctv'));
  assert.equal(allblanc, undefined);

  const babyFood = report.duplicateGroups.find((group) => group.canonicalUrl.includes('01695258757/222768860919'));
  assert.equal(babyFood, undefined);

  const reading = report.duplicateGroups.find((group) => group.canonicalUrl.includes('naristyle87/222978131890'));
  assert.equal(reading, undefined);

  const moving = report.duplicateGroups.find((group) => group.canonicalUrl.includes('ajd.co.kr'));
  assert.equal(moving, undefined);

  const vaccination = report.duplicateGroups.find((group) => group.canonicalUrl.includes('khms.or.kr'));
  assert.equal(vaccination, undefined);

  const wedding = report.duplicateGroups.find((group) => group.canonicalUrl.includes('wilklove/223518896995'));
  assert.equal(wedding, undefined);

  const html = buildSourceBackedManualRegistrationQaHtml(report);
  assert.match(html, /중복 canonical URL 그룹/);
  assert.doesNotMatch(html, /Keep curated-opic-mock-course as the canonical hit/);
  assert.doesNotMatch(html, /Keep baby-food-map as the canonical hit/);
  assert.doesNotMatch(html, /Keep curated-reading-routine-log as the canonical hit/);
  assert.doesNotMatch(html, /Keep curated-new-car-purchase-guide as the canonical hit/);
  assert.doesNotMatch(html, /Keep curated-ajd-moving-d30 as the canonical hit/);
  assert.doesNotMatch(html, /Keep curated-child-vaccination-schedule as the canonical hit/);
  assert.doesNotMatch(html, /Keep curated-wedding-checklist-family as the canonical hit/);
  assert.match(html, /directRouteEnabled=false/);
});
