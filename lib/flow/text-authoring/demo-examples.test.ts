import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TEXT_AUTHORING_EXAMPLES,
  VALIDATED_TEXT_AUTHORING_EXAMPLES,
} from '../../../components/flow/text-authoring/examples';

import { TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS } from './grammar-simulation-cases';

test('the demo dropdown contains every validated grammar scenario exactly once', () => {
  assert.equal(VALIDATED_TEXT_AUTHORING_EXAMPLES.length, 27);
  assert.deepEqual(
    Object.fromEntries(
      ['existing_content', 'condition_change', 'compatibility', 'error_boundary']
        .map((group) => [
          group,
          VALIDATED_TEXT_AUTHORING_EXAMPLES.filter(
            (example) => example.group === group,
          ).length,
        ]),
    ),
    {
      existing_content: 8,
      condition_change: 8,
      compatibility: 6,
      error_boundary: 5,
    },
  );

  const scenarioIds = VALIDATED_TEXT_AUTHORING_EXAMPLES.map(
    (example) => example.scenarioId,
  );
  assert.equal(new Set(scenarioIds).size, scenarioIds.length);
  assert.deepEqual(
    [...scenarioIds].sort(),
    TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS.map(
      (scenario) => scenario.id,
    ).sort(),
  );
});

test('generated demo inputs stay identical to the passing simulation fixtures', () => {
  const examplesByScenario = new Map(
    VALIDATED_TEXT_AUTHORING_EXAMPLES.map((example) => [
      example.scenarioId,
      example,
    ]),
  );

  for (const scenario of TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS) {
    const example = examplesByScenario.get(scenario.id);
    assert.ok(example, `missing demo example ${scenario.id}`);
    const sourceTitle = scenario.options?.sourceTitle;
    const sourceUrl =
      scenario.options?.sourceUrl ?? scenario.sourceReference;
    const source =
      sourceUrl ??
      sourceTitle ??
      (scenario.group === 'existing_content'
        ? '기존 FLOW 콘텐츠'
        : '문법 검증 예시');

    assert.equal(example.rawText, scenario.rawText, `${scenario.id}: rawText`);
    assert.equal(
      example.previewAnchor,
      scenario.anchor,
      `${scenario.id}: anchor`,
    );
    assert.equal(example.group, scenario.group, `${scenario.id}: group`);
    assert.equal(
      example.title,
      scenario.options?.title ??
        scenario.expected.title ??
        scenario.title,
      `${scenario.id}: title`,
    );
    assert.equal(example.source, source, `${scenario.id}: source`);
    assert.equal(
      example.ownership,
      scenario.options?.ownership ?? 'personal',
      `${scenario.id}: ownership`,
    );
  }
});

test('non-compatibility demo fixtures teach only canonical v2 Item syntax', () => {
  for (const example of VALIDATED_TEXT_AUTHORING_EXAMPLES) {
    if (example.group === 'compatibility') continue;
    for (const line of example.rawText.split(/\r?\n/u)) {
      assert.doesNotMatch(
        line,
        /^\s{2}(?!-\s)[^:：]{1,32}[:：]/u,
        `${example.scenarioId}: v1 property`,
      );
      if (!/^-\s+/u.test(line)) continue;
      assert.match(
        line,
        /^(?:-\s+\[[ xX]\]\s+|-\s+기준일:)/u,
        `${example.scenarioId}: noncanonical root bullet`,
      );
    }
  }

  const jeju = VALIDATED_TEXT_AUTHORING_EXAMPLES.find(
    (example) => example.scenarioId === 'content-jeju-memo-5',
  );
  assert.ok(jeju);
  assert.match(jeju.rawText, /^# 제주 여행 준비$/mu);
  assert.equal(jeju.rawText.match(/^- \[ \] /gmu)?.length ?? 0, 5);
});

test('quick examples reuse the validated content instead of maintaining copies', () => {
  const expectedScenarios = new Map([
    ['jeju', 'content-jeju-memo-5'],
    ['moving', 'content-moving-d30'],
    ['course', 'content-kmooc-14'],
    ['allblanc', 'content-allblanc-7day'],
  ]);
  const validatedByScenario = new Map(
    VALIDATED_TEXT_AUTHORING_EXAMPLES.map((example) => [
      example.scenarioId,
      example,
    ]),
  );

  for (const [quickId, scenarioId] of expectedScenarios) {
    const quick = TEXT_AUTHORING_EXAMPLES.find(
      (example) => example.id === quickId,
    );
    const validated = validatedByScenario.get(scenarioId);
    assert.ok(quick, `missing quick example ${quickId}`);
    assert.ok(validated, `missing validated example ${scenarioId}`);
    assert.equal(quick.scenarioId, scenarioId);
    assert.equal(quick.rawText, validated.rawText);
    assert.equal(quick.previewAnchor, validated.previewAnchor);
    assert.equal(quick.title, validated.title);
    assert.equal(quick.source, validated.source);
  }
});
