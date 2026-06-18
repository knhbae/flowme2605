import assert from 'node:assert/strict';
import { test } from 'node:test';
import { koreanFlowContentCandidates } from './korean-flow-content-candidates';
import {
  additionalSourceLeads,
  flowContentSelectionAudits,
  flowContentSelectionSummary,
  selectedFlowContentP0Ids,
} from './flow-content-selection-audit';

const creatorInteractionCandidateIds = [
  'computer-skills-practical-5day',
  'computer-skills-written-3day',
  'computer-skills-source-rounds',
  'washer-self-clean-decision',
  'japan-esim-setup-before-departure',
  'everland-family-trip-prep',
  'thankyou-bubu-arm-30day',
  'new-apartment-precheck',
];

test('flow content selection audit covers current candidates plus creator interaction candidates', () => {
  const currentCandidateIds = new Set(koreanFlowContentCandidates.map((candidate) => candidate.id));
  const duplicatedCreatorIds = creatorInteractionCandidateIds.filter((id) => currentCandidateIds.has(id)).length;
  const expectedIds = new Set([
    ...currentCandidateIds,
    ...creatorInteractionCandidateIds,
  ]);
  const actualIds = new Set(flowContentSelectionAudits.map((audit) => audit.id));

  assert.equal(expectedIds.size, koreanFlowContentCandidates.length + creatorInteractionCandidateIds.length - duplicatedCreatorIds);
  assert.equal(actualIds.size, expectedIds.size);
  assert.deepEqual(actualIds, expectedIds);
});

test('flow content selection audit records focused P0 shortlist and source leads', () => {
  assert.equal(flowContentSelectionSummary.totalEvaluated, flowContentSelectionAudits.length);
  assert.ok(flowContentSelectionSummary.p0Count >= 8);
  assert.ok(flowContentSelectionSummary.p0Count <= 12);
  assert.equal(selectedFlowContentP0Ids.length, flowContentSelectionSummary.p0Count);
  assert.ok(selectedFlowContentP0Ids.includes('computer-skills-source-rounds'));
  assert.ok(selectedFlowContentP0Ids.includes('japan-esim-setup-before-departure'));
  assert.ok(selectedFlowContentP0Ids.includes('used-car-buying-check'));
  assert.ok(selectedFlowContentP0Ids.includes('alt-phone-sk7-self-activation'));
  assert.ok(selectedFlowContentP0Ids.includes('infant-health-checkup-prep'));
  assert.ok(additionalSourceLeads.length >= 6);
  assert.ok(additionalSourceLeads.every((lead) => lead.sourceUrl.startsWith('https://')));
});

test('dorm selection audit is aligned to official-first external ecosystem decision', () => {
  const dorm = flowContentSelectionAudits.find((audit) => audit.id === 'college-dorm-move-in-checklist');

  assert.ok(dorm);
  assert.match(dorm.reason, /최신.*기숙사.*공지|공식.*입사.*공지|학기별.*PDF/);
  assert.match(dorm.reason, /제출서류|반입금지|D-Day|시설점검/);
  assert.match(dorm.ux12Action, /최신.*공지|학교별.*공지|공식.*공지/);
  assert.doesNotMatch([dorm.reason, dorm.ux12Action].join('\n'), /댓글.*비밀번호|무료.*배포|PDF 체크리스트 배포/);
});
