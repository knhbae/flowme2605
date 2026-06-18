import assert from 'node:assert/strict';
import { test } from 'node:test';
import { koreanFlowContentCandidates } from './korean-flow-content-candidates';
import {
  antiRepetitionCandidateIds,
  creatorSourceBreadthCandidateIds,
  latestDiversificationCandidateIds,
  representativeCoverageGroups,
} from './flow-content-coverage-axes';

test('representative coverage axes keep content discovery broad instead of repetitive', () => {
  assert.deepEqual(
    representativeCoverageGroups.map((group) => group.label),
    ['반복 관리', '생활 전환', '제작자 자료', '디지털 절차', '짧은 프로젝트', '시트/재고', '서류/행정'],
  );

  for (const group of representativeCoverageGroups) {
    assert.equal(group.candidateIds.length, 3, `${group.label} should keep one primary and two comparison candidates`);
    assert.ok(group.artifact, `${group.label} should declare the artifact shape being tested`);
    assert.ok(group.question.endsWith('가'), `${group.label} should state a validation question`);
  }
});

test('coverage axes and anti-repetition candidates point to existing source candidates', () => {
  const candidateIds = new Set(koreanFlowContentCandidates.map((candidate) => candidate.id));
  const referencedIds = new Set([
    ...Array.from(antiRepetitionCandidateIds),
    ...Array.from(latestDiversificationCandidateIds),
    ...Array.from(creatorSourceBreadthCandidateIds),
    ...representativeCoverageGroups.flatMap((group) => group.candidateIds),
  ]);

  for (const id of referencedIds) {
    assert.ok(candidateIds.has(id), `${id} should exist in korean Flow content candidates`);
  }

  assert.equal(antiRepetitionCandidateIds.size, 8);
  for (const id of antiRepetitionCandidateIds) {
    assert.ok(
      representativeCoverageGroups.some((group) => group.candidateIds.includes(id)),
      `${id} should support at least one representative coverage axis`,
    );
  }
});

test('creator-source breadth candidates keep the next search batch distinct', () => {
  const candidatesById = new Map(koreanFlowContentCandidates.map((candidate) => [candidate.id, candidate]));
  assert.equal(creatorSourceBreadthCandidateIds.size, 5);

  for (const id of creatorSourceBreadthCandidateIds) {
    assert.ok(candidatesById.has(id), `${id} should exist in korean Flow content candidates`);
    assert.ok(!antiRepetitionCandidateIds.has(id), `${id} should not be merged into the older anti-repetition batch`);
    assert.ok(!latestDiversificationCandidateIds.has(id), `${id} should not be merged into the official/seasonal diversification batch`);
  }

  assert.deepEqual(
    Array.from(creatorSourceBreadthCandidateIds).map((id) => candidatesById.get(id)?.category),
    ['음악/악보연습', '반려묘/입양준비', '주거/계약전점검', '디지털필기/템플릿', '베이킹/도안자료'],
  );
});

test('latest diversification candidates are visible as a separate review batch', () => {
  const candidatesById = new Map(koreanFlowContentCandidates.map((candidate) => [candidate.id, candidate]));
  assert.equal(latestDiversificationCandidateIds.size, 5);

  for (const id of latestDiversificationCandidateIds) {
    assert.ok(candidatesById.has(id), `${id} should exist in korean Flow content candidates`);
    assert.ok(!antiRepetitionCandidateIds.has(id), `${id} should not be merged into the older anti-repetition batch`);
  }

  assert.deepEqual(
    Array.from(latestDiversificationCandidateIds).map((id) => candidatesById.get(id)?.category),
    ['계절음식/집안행사', '여행/공식행정', '차량/공식검사', '캠핑/여가준비', '정리/방문수거'],
  );
});
