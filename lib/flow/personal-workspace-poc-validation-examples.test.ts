import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fingerprintPersonalWorkspacePocAuthoringSource,
  parsePersonalWorkspacePocAuthoring,
} from './personal-workspace-poc-authoring';
import { PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_CORPUS } from './personal-workspace-poc-lossless-authoring.fixtures';
import { analyzePersonalWorkspacePocLosslessAuthoring } from './personal-workspace-poc-lossless-authoring';
import {
  PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG,
  PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION,
  PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_GROUPS,
  filterPersonalWorkspacePocValidationExamples,
  normalizePersonalWorkspacePocValidationExampleSearch,
  planPersonalWorkspacePocValidationExampleApply,
  projectPersonalWorkspacePocValidationExampleSelection,
  type PersonalWorkspacePocValidationExampleGroupId,
} from './personal-workspace-poc-validation-examples';

const EXPECTED_CASE_IDS = [
  'basic-authoring-syntax',
  'content-moving-d30',
  'content-vehicle-inspection',
  'content-allblanc-7day',
  'content-kmooc-14',
  'content-librivox-38',
  'content-new-car-14',
  'content-official-safety-4',
  'content-jeju-memo-5',
  'change-relative-no-anchor',
  'change-relative-anchor-aug',
  'change-relative-anchor-sep',
  'change-relative-to-absolute',
  'change-mixed-dated-undated',
  'change-time-timezone-duration',
  'change-daily-repeat-until-date',
  'change-same-day-timed-agenda',
  'change-repeat-condition-weekly',
  'change-latest-grammar-showcase',
  'change-repeat-condition-monthly',
  'compat-legacy-aliases',
  'compat-title-h1-wins',
  'compat-resource-links',
  'error-unknown-property',
  'error-ambiguous-date',
  'error-invalid-relative-date',
  'error-url-only',
  'error-explanatory-prose',
  'compat-tab-table',
  'compat-csv-table',
  'compat-markdown-table',
] as const;

const EXPECTED_GROUP_BY_CASE_ID = Object.freeze({
  'basic-authoring-syntax': 'authoring-format',
  'content-moving-d30': 'real-content',
  'content-vehicle-inspection': 'real-content',
  'content-allblanc-7day': 'real-content',
  'content-kmooc-14': 'real-content',
  'content-librivox-38': 'real-content',
  'content-new-car-14': 'real-content',
  'content-official-safety-4': 'real-content',
  'content-jeju-memo-5': 'real-content',
  'change-relative-no-anchor': 'schedule-recurrence',
  'change-relative-anchor-aug': 'schedule-recurrence',
  'change-relative-anchor-sep': 'schedule-recurrence',
  'change-relative-to-absolute': 'schedule-recurrence',
  'change-mixed-dated-undated': 'schedule-recurrence',
  'change-time-timezone-duration': 'schedule-recurrence',
  'change-daily-repeat-until-date': 'schedule-recurrence',
  'change-same-day-timed-agenda': 'schedule-recurrence',
  'change-repeat-condition-weekly': 'schedule-recurrence',
  'change-latest-grammar-showcase': 'schedule-recurrence',
  'change-repeat-condition-monthly': 'schedule-recurrence',
  'compat-legacy-aliases': 'legacy-table',
  'compat-title-h1-wins': 'legacy-table',
  'compat-resource-links': 'legacy-table',
  'error-unknown-property': 'error-input',
  'error-ambiguous-date': 'error-input',
  'error-invalid-relative-date': 'error-input',
  'error-url-only': 'error-input',
  'error-explanatory-prose': 'error-input',
  'compat-tab-table': 'legacy-table',
  'compat-csv-table': 'legacy-table',
  'compat-markdown-table': 'legacy-table',
} as const satisfies Readonly<
  Record<(typeof EXPECTED_CASE_IDS)[number], PersonalWorkspacePocValidationExampleGroupId>
>);

test('publishes version 1 and the fixed five-group contract', () => {
  assert.equal(PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG_VERSION, 1);
  assert.deepEqual(PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_GROUPS, [
    { groupId: 'authoring-format', label: '작성 형식', expectedCount: 1 },
    { groupId: 'real-content', label: '실제 콘텐츠', expectedCount: 8 },
    { groupId: 'schedule-recurrence', label: '일정·반복', expectedCount: 11 },
    { groupId: 'legacy-table', label: '호환·표', expectedCount: 6 },
    { groupId: 'error-input', label: '오류·예외 입력', expectedCount: 5 },
  ]);
  assert.equal(Object.isFrozen(PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_GROUPS), true);
  assert.equal(
    PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_GROUPS.every(Object.isFrozen),
    true,
  );
});

test('pins all 31 unique examples to canonical order and group counts 1/8/11/6/5', () => {
  assert.equal(PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG.length, 31);
  assert.deepEqual(
    PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG.map((entry) => entry.caseId),
    EXPECTED_CASE_IDS,
  );
  assert.deepEqual(
    PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG.map((entry) => entry.caseId),
    PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_CORPUS.map((entry) => entry.caseId),
  );
  assert.equal(
    new Set(PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG.map(
      (entry) => entry.exampleId,
    )).size,
    31,
  );
  assert.deepEqual(
    PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_GROUPS.map((group) => (
      PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG.filter(
        (entry) => entry.groupId === group.groupId,
      ).length
    )),
    [1, 8, 11, 6, 5],
  );
  for (const entry of PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG) {
    assert.equal(entry.groupId, EXPECTED_GROUP_BY_CASE_ID[entry.caseId]);
    assert.equal(entry.exampleId, `validation-example:${entry.caseId}`);
  }
});

test('references every canonical raw source byte-exactly with all evidence metadata', () => {
  assert.equal(Object.isFrozen(PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG), true);
  PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG.forEach((entry, index) => {
    const corpusCase = PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_CORPUS[index];
    assert.equal(Object.isFrozen(entry), true, entry.caseId);
    assert.equal(entry.catalogIndex, index);
    assert.equal(entry.rawText, corpusCase.rawText, `${entry.caseId}: source string`);
    assert.deepEqual(
      Buffer.from(entry.rawText, 'utf8'),
      Buffer.from(corpusCase.rawText, 'utf8'),
      `${entry.caseId}: UTF-8 bytes`,
    );
    assert.equal(entry.sourceShape, corpusCase.sourceShape);
    assert.equal(entry.provenance, corpusCase.provenance);
    assert.equal(entry.upstreamBoundary, corpusCase.upstreamBoundary);
    assert.equal(entry.expectedOriginalItemCount, corpusCase.expectedOriginalItemCount);
    assert.equal(entry.expectedMode, corpusCase.expectedMode);
    assert.equal(entry.expectedPreservation, corpusCase.expectedPreservation);
    assert.ok(entry.label.length > 0);
    assert.equal('sourceOwner' in entry, false);
    assert.equal('templateId' in entry, false);
  });
});

test('normalizes search with NFKC, lower-case, and collapsed whitespace', () => {
  assert.equal(
    normalizePersonalWorkspacePocValidationExampleSearch('  ＡＬＬＢＬＡＮＣ\n\t ７일  '),
    'allblanc 7일',
  );
  assert.equal(
    normalizePersonalWorkspacePocValidationExampleSearch('  상 대\r\n날 짜  '),
    '상 대 날 짜',
  );
});

test('searches evidence text and composes the group filter without reordering', () => {
  const beforeOrder = PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG.map(
    (entry) => entry.exampleId,
  );
  assert.deepEqual(
    filterPersonalWorkspacePocValidationExamples({ query: '  ＡＬＬＢＬＡＮＣ   ７일 ' })
      .map((entry) => entry.caseId),
    ['content-allblanc-7day'],
  );
  assert.deepEqual(
    filterPersonalWorkspacePocValidationExamples({ query: '전입신고' })
      .map((entry) => entry.caseId),
    ['content-moving-d30'],
  );
  assert.deepEqual(
    filterPersonalWorkspacePocValidationExamples({ query: 'compat-csv-table' })
      .map((entry) => entry.caseId),
    ['compat-csv-table'],
  );
  assert.deepEqual(
    filterPersonalWorkspacePocValidationExamples({ groupId: 'error-input' })
      .map((entry) => entry.caseId),
    [
      'error-unknown-property',
      'error-ambiguous-date',
      'error-invalid-relative-date',
      'error-url-only',
      'error-explanatory-prose',
    ],
  );
  assert.deepEqual(
    filterPersonalWorkspacePocValidationExamples({
      groupId: 'schedule-recurrence',
      query: '매월',
    }).map((entry) => entry.caseId),
    ['change-repeat-condition-monthly'],
  );
  assert.deepEqual(
    filterPersonalWorkspacePocValidationExamples(
      PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG.slice(0, 3),
      { query: '자동차검사' },
    ).map((entry) => entry.caseId),
    ['content-vehicle-inspection'],
  );
  assert.deepEqual(
    filterPersonalWorkspacePocValidationExamples(
      PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG.slice(0, 3),
      { query: 'compat-csv-table' },
    ),
    [],
  );
  assert.deepEqual(
    filterPersonalWorkspacePocValidationExamples({
      groupId: 'not-a-group' as PersonalWorkspacePocValidationExampleGroupId,
    }),
    [],
  );
  assert.equal(Object.isFrozen(filterPersonalWorkspacePocValidationExamples()), true);
  assert.deepEqual(
    PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG.map((entry) => entry.exampleId),
    beforeOrder,
  );
});

test('projects a selection without elevating provenance or scheduling writes', () => {
  const example = PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG[1];
  const selection = projectPersonalWorkspacePocValidationExampleSelection({
    catalogVersion: 1,
    exampleId: example.exampleId,
  });
  assert.equal(selection.status, 'selected');
  if (selection.status !== 'selected') return;
  assert.equal(selection.example, example);
  assert.equal(selection.previewRawText, example.rawText);
  assert.equal(selection.sourceOwner, null);
  assert.equal(selection.templateId, null);
  assert.deepEqual(
    [
      selection.sourceMutationCount,
      selection.workspaceMutationCount,
      selection.operatingMutationCount,
    ],
    [0, 0, 0],
  );
});

test('selection fails closed for catalog mismatch and unknown ids', () => {
  const cases = [
    projectPersonalWorkspacePocValidationExampleSelection({
      catalogVersion: 2,
      exampleId: PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG[0].exampleId,
    }),
    projectPersonalWorkspacePocValidationExampleSelection({
      catalogVersion: 1,
      exampleId: 'validation-example:missing',
    }),
  ];
  assert.deepEqual(cases.map((entry) => entry.reason), [
    'version-mismatch',
    'unknown-example',
  ]);
  for (const entry of cases) {
    assert.equal(entry.status, 'unavailable');
    assert.equal(entry.example, null);
    assert.equal(entry.previewRawText, null);
    assert.deepEqual(
      [entry.sourceMutationCount, entry.workspaceMutationCount, entry.operatingMutationCount],
      [0, 0, 0],
    );
  }
});

test('retains parser item and issue meaning for every example', () => {
  const expectedIssueCodes = new Map<string, readonly string[]>([
    ['change-relative-no-anchor', [
      'relative-date-requires-anchor',
      'relative-date-requires-anchor',
    ]],
    ['error-ambiguous-date', ['invalid-date']],
    ['error-invalid-relative-date', ['invalid-relative-date']],
    ['compat-tab-table', ['table-unsupported']],
    ['compat-csv-table', ['table-unsupported']],
    ['compat-markdown-table', ['table-unsupported']],
  ]);

  for (const entry of PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG) {
    const parsed = parsePersonalWorkspacePocAuthoring(entry.rawText);
    const expectedItemCount = entry.expectedMode === 'safe-table'
      ? 0
      : entry.expectedOriginalItemCount;
    assert.equal(parsed.rawText, entry.rawText, `${entry.caseId}: parse raw bytes`);
    assert.equal(parsed.items.length, expectedItemCount, `${entry.caseId}: parsed items`);
    assert.deepEqual(
      parsed.blockingIssues.map((issue) => issue.code),
      expectedIssueCodes.get(entry.caseId) ?? [],
      `${entry.caseId}: issue meaning`,
    );
  }
});

test('retains lossless mode and source-row meaning without inferred actions', () => {
  for (const entry of PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG) {
    const analysis = analyzePersonalWorkspacePocLosslessAuthoring(entry.rawText);
    assert.equal(analysis.rawText, entry.rawText, entry.caseId);
    assert.equal(analysis.status, entry.expectedMode, entry.caseId);
    assert.equal(analysis.sourceMutationCount, 0, entry.caseId);
    assert.equal(analysis.sourcePreserved, true, entry.caseId);
    assert.deepEqual([
      analysis.projection.generatedItemCount,
      analysis.projection.generatedTodoCount,
      analysis.projection.generatedCalendarCount,
    ], [0, 0, 0], entry.caseId);
    assert.equal(
      analysis.projection.rows.length,
      entry.expectedMode === 'safe-table' ? entry.expectedOriginalItemCount : 0,
      entry.caseId,
    );
  }
});

test('all cancel and guard boundaries produce zero mutations', () => {
  const example = PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG[0];
  const emptyFingerprint = fingerprintPersonalWorkspacePocAuthoringSource('');
  const guardedInputs = [
    {
      name: 'cancel',
      input: {
        catalogVersion: 1,
        exampleId: example.exampleId,
        rawText: '',
        expectedSourceFingerprint: emptyFingerprint,
        confirmed: false,
      },
      reason: 'cancelled',
    },
    {
      name: 'composing',
      input: {
        catalogVersion: 1,
        exampleId: example.exampleId,
        rawText: '',
        expectedSourceFingerprint: emptyFingerprint,
        confirmed: true,
        composing: true,
      },
      reason: 'composing',
    },
    {
      name: 'version mismatch',
      input: {
        catalogVersion: 2,
        exampleId: example.exampleId,
        rawText: '',
        expectedSourceFingerprint: emptyFingerprint,
        confirmed: true,
      },
      reason: 'version-mismatch',
    },
    {
      name: 'unknown example',
      input: {
        catalogVersion: 1,
        exampleId: 'validation-example:missing',
        rawText: '',
        expectedSourceFingerprint: emptyFingerprint,
        confirmed: true,
      },
      reason: 'unknown-example',
    },
    {
      name: 'stale fingerprint',
      input: {
        catalogVersion: 1,
        exampleId: example.exampleId,
        rawText: '',
        expectedSourceFingerprint: 'raw-v1:stale',
        confirmed: true,
      },
      reason: 'stale-source',
    },
    {
      name: 'nonempty',
      input: {
        catalogVersion: 1,
        exampleId: example.exampleId,
        rawText: '사용자가 쓴 원문',
        expectedSourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(
          '사용자가 쓴 원문',
        ),
        confirmed: true,
      },
      reason: 'nonempty-source',
    },
    {
      name: 'whitespace is source bytes, not blank',
      input: {
        catalogVersion: 1,
        exampleId: example.exampleId,
        rawText: ' \n\t',
        expectedSourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(' \n\t'),
        confirmed: true,
      },
      reason: 'nonempty-source',
    },
    {
      name: 'same source',
      input: {
        catalogVersion: 1,
        exampleId: example.exampleId,
        rawText: example.rawText,
        expectedSourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(
          example.rawText,
        ),
        confirmed: true,
      },
      reason: 'same-source',
    },
  ] as const;

  for (const guarded of guardedInputs) {
    const frozenInput = Object.freeze(guarded.input);
    const before = { ...frozenInput };
    const plan = planPersonalWorkspacePocValidationExampleApply(frozenInput);
    assert.equal(plan.reason, guarded.reason, guarded.name);
    assert.equal(plan.nextRawText, guarded.input.rawText, guarded.name);
    assert.equal(plan.replacement, null, guarded.name);
    assert.deepEqual(
      [plan.sourceMutationCount, plan.workspaceMutationCount, plan.operatingMutationCount],
      [0, 0, 0],
      guarded.name,
    );
    assert.deepEqual(frozenInput, before, guarded.name);
    assert.equal(Object.isFrozen(plan), true, guarded.name);
  }
});

test('explicit confirmed apply replaces only an exactly empty source with exact bytes once', () => {
  const example = PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_CATALOG.find(
    (entry) => entry.caseId === 'compat-markdown-table',
  );
  assert.ok(example);
  const plan = planPersonalWorkspacePocValidationExampleApply(Object.freeze({
    catalogVersion: 1,
    exampleId: example.exampleId,
    rawText: '',
    expectedSourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(''),
    confirmed: true,
  }));
  assert.equal(plan.status, 'applied');
  assert.equal(plan.reason, 'applied');
  assert.equal(plan.nextRawText, example.rawText);
  assert.deepEqual(Buffer.from(plan.nextRawText), Buffer.from(example.rawText));
  assert.deepEqual(
    [plan.sourceMutationCount, plan.workspaceMutationCount, plan.operatingMutationCount],
    [1, 0, 0],
  );
  assert.ok(plan.replacement);
  assert.equal(plan.replacement.beforeRawText, '');
  assert.equal(plan.replacement.afterRawText, example.rawText);
  assert.equal(
    plan.replacement.afterSourceFingerprint,
    fingerprintPersonalWorkspacePocAuthoringSource(example.rawText),
  );
  assert.equal(plan.sourceOwner, null);
  assert.equal(plan.templateId, null);
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(Object.isFrozen(plan.replacement), true);
});
