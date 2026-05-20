import assert from 'node:assert/strict';
import test from 'node:test';
import {
  expansionCreatorLabs,
  getContentLabSummary,
  pilotCreatorLabs,
  scoreCandidate,
} from './content-lab';
import { seedBundles } from './seed-flows';

test('pilot content lab maps 3 creators to 12 existing working flows', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.equal(pilotCreatorLabs.length, 3);
  assert.equal(summary.pilotCreatorCount, 3);
  assert.equal(summary.pilotFlowCount, 12);
  assert.equal(summary.missingPilotFlowSlugs.length, 0);
  assert.ok(pilotCreatorLabs.every((creator) => creator.creatorUrl.startsWith('https://')));
  assert.ok(pilotCreatorLabs.every((creator) => creator.sources.length === 4));
  assert.ok(
    pilotCreatorLabs.every((creator) =>
      creator.sources.every((source) => source.sourceUrl.startsWith('https://')),
    ),
  );
});

test('scale content lab covers 10 creators and 200 flow candidates', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.equal(expansionCreatorLabs.length, 10);
  assert.equal(summary.expansionCreatorCount, 10);
  assert.equal(summary.expansionCandidateCount, 200);
  assert.deepEqual(summary.structureCoverage.sort(), ['checklist', 'phase', 'routine', 'timeline']);
  assert.ok(summary.categoryCoverage.includes('가전관리'));
  assert.ok(summary.categoryCoverage.includes('자동차'));
  assert.ok(summary.categoryCoverage.includes('자격증/시험'));
  assert.ok(summary.categoryCoverage.includes('다이어트'));
  assert.ok(expansionCreatorLabs.every((creator) => creator.creatorUrl.startsWith('https://')));
  assert.ok(
    expansionCreatorLabs.every((creator) =>
      creator.candidates.every((candidate) => candidate.sourceUrl.startsWith('https://')),
    ),
  );
});

test('candidate scoring rewards executable and externally portable content', () => {
  const candidate = expansionCreatorLabs[0].candidates[0];
  const score = scoreCandidate(candidate);

  assert.ok(score >= 80);
  assert.ok(candidate.externalTargets.includes('calendar'));
  assert.ok(candidate.externalTargets.includes('todo'));
  assert.ok(candidate.externalTargets.includes('notion'));
});

test('converted pilot lab exposes 10 real-source flows for B validation', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.equal(summary.convertedPilotFlowCount, 10);
  assert.deepEqual(summary.convertedPilotCategories.sort(), [
    '가전관리',
    '다이어트/기록',
    '운동/루틴',
    '자동차/검사',
    '자격증/시험',
  ].sort());
  assert.equal(summary.missingConvertedPilotSlugs.length, 0);
});
