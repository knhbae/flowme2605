import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SPEC_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SPEC_DIR, '..', '..', '..');
const GENERATED_AT = '2026-07-28T00:00:00.000Z';

const INPUTS = [
  {
    key: 'qualifiedV2',
    path: 'docs/content-audit/2026-07-27-creator-portfolio-qualified-v2.json',
    role: 'sole_normal_corpus_source',
    expectedSha256: 'aa85b1da3b4403694895cc0647e462daefaec47930a7f43611a489c29db5a16f',
  },
  {
    key: 'v1DiscoverySnapshot',
    path: 'docs/specs/2026-07-27-flow-item-map-architecture-creator-portfolio-category-fit-lab-v1/creator-discovery-corpus-snapshot-v1.json',
    role: 'v1_source_lineage_baseline',
    expectedSha256: '0bcbd59a7b1412ee33cc5df715418a8a2a92e3ca67d10044ed5b8663af091e6a',
  },
  {
    key: 'v1Gold',
    path: 'docs/specs/2026-07-27-flow-item-map-architecture-creator-portfolio-category-fit-lab-v1/gold-semantic-contract-v1.json',
    role: 'v1_corpus_and_semantic_baseline',
    expectedSha256: '6028bb76847af627911890eb1a5f678f066166649fa45bd0aac8b4e0293d5b49',
  },
  {
    key: 'v1CategoryFit',
    path: 'docs/specs/2026-07-27-flow-item-map-architecture-creator-portfolio-category-fit-lab-v1/category-fit-matrix-v1.json',
    role: 'v1_taxonomy_and_projection_baseline',
    expectedSha256: 'f50ba0fa68f03d7b3c82a6c7a8b67cd7edd0c1f1c11afe382af58d3b20794270',
  },
  {
    key: 'v1Scorecard',
    path: 'docs/specs/2026-07-27-flow-item-map-architecture-creator-portfolio-category-fit-lab-v1/architecture-scorecard-v1.json',
    role: 'frozen_v1_architecture_score',
    expectedSha256: 'a78be1a3484a491af69a363a6e03ebe075d1fc3d08aabc4d38502cc3e89c8ced',
  },
  {
    key: 'v1ProjectionLoss',
    path: 'docs/specs/2026-07-27-flow-item-map-architecture-creator-portfolio-category-fit-lab-v1/projection-loss-manifest-v1.json',
    role: 'frozen_v1_projection_loss',
    expectedSha256: '350ac17253ec1108022c16e351e0342a1ba08c594cddc5fc2e49d00dd1505069',
  },
  {
    key: 'v1RoundTrip',
    path: 'docs/specs/2026-07-27-flow-item-map-architecture-creator-portfolio-category-fit-lab-v1/round-trip-results-v1.json',
    role: 'frozen_v1_round_trip',
    expectedSha256: '9d6a3d522c3a06a8ae1bea740b08b87ab60e3583fb4cded231498b8b88146dd6',
  },
  {
    key: 'v1Adjudication',
    path: 'docs/specs/2026-07-27-flow-item-map-architecture-creator-portfolio-category-fit-lab-v1/final-adjudication-v1.json',
    role: 'frozen_v1_decision',
    expectedSha256: 'e51f8051c91f5b0a53576ab61c887eceaec1f2b7f9524ce1ec04aacd90f15ae7',
  },
  {
    key: 'v1Validation',
    path: 'docs/specs/2026-07-27-flow-item-map-architecture-creator-portfolio-category-fit-lab-v1/validation-results-v1.json',
    role: 'frozen_v1_validator_result',
    expectedSha256: 'b211293467c4af4a8c43ed874e5d393f5318e7197aabe5117531b4d7fab37a76',
  },
  {
    key: 'verticalBenchmark',
    path: 'docs/content-audit/2026-07-28-vertical-execution-service-benchmark-v1.json',
    role: 'planning_only_vertical_opportunity_source',
    expectedSha256: 'c8e5f1e75316d2324dcd592907ce0cd224600b1f26500394e04f25f9e6a61f22',
  },
  {
    key: 'taxonomyV11',
    path: 'docs/specs/2026-07-20-flowme-taxonomy-v1-1/taxonomy-v1.1.json',
    role: 'canonical_enum_source',
    expectedSha256: '5b910bab49d8c96cd160a52fb790af1585c4b2015d8e3fdd05df544ac8fb5d3c',
  },
];

const EXPECTED_SELECTIONS = [
  'home-ajd',
  'family-babyfood016',
  'study-mansour',
  'study-opentutorials',
  'money-getcha',
  'health-allblanc',
  'meals-wtable',
  'work-andstudio',
];

const BOUNDARY_IDS = ['travel-triple', 'hobby-fitpet'];

const WEB1_TAXONOMY = {
  lifeArea: 'study_reading',
  mapType: 'ordered',
  sourceShape: 'lesson_rows',
  executionPattern: 'progress_tracking',
  primaryArtifact: 'sheet',
  secondaryArtifacts: ['checklist'],
  naturalCalendarPolicy: 'none',
  mappingStatus: 'v2_adjudicated_from_qualified_source_rows',
  mappingReason:
    'WEB1의 26개 토픽은 원문 lesson row이며 날짜가 없는 진도 관리가 사용자 job이므로 sheet가 주 결과물이다.',
};

const VERTICAL_NORMALIZATION = {
  'opp-home-routine': {
    dateIntent: 'source_defined_recurrence_or_order',
    defaultDestination: 'checklist',
    canonicalExecutionPatternCandidate: 'repeating_routine',
  },
  'opp-age-play': {
    dateIntent: 'optional_start_anchor',
    defaultDestination: 'checklist',
    canonicalExecutionPatternCandidate: 'repeating_routine',
  },
  'opp-learning-series': {
    dateIntent: 'undated_progress_with_optional_target_or_weekdays',
    defaultDestination: 'sheet',
    canonicalExecutionPatternCandidate: 'progress_tracking',
  },
  'opp-training-program': {
    dateIntent: 'start_or_target_date_anchor',
    defaultDestination: 'calendar',
    canonicalExecutionPatternCandidate: 'progress_tracking',
  },
  'opp-event-dday': {
    dateIntent: 'relative_to_target_date',
    defaultDestination: 'calendar',
    canonicalExecutionPatternCandidate: 'date_preparation',
  },
  'opp-meal-plan': {
    dateIntent: 'optional_start_anchor',
    defaultDestination: 'calendar',
    canonicalExecutionPatternCandidate: 'date_preparation',
  },
  'opp-career-application': {
    dateIntent: 'optional_follow_up_or_interview_date',
    defaultDestination: 'checklist',
    canonicalExecutionPatternCandidate: 'ordered_procedure',
  },
  'opp-care-routine': {
    dateIntent: 'source_defined_recurrence_or_sequence',
    defaultDestination: 'calendar',
    canonicalExecutionPatternCandidate: 'repeating_routine',
  },
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bufferOrText) {
  return crypto.createHash('sha256').update(bufferOrText).digest('hex');
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stable(value[key])]),
  );
}

function semanticHash(value) {
  return sha256(JSON.stringify(stable(value)));
}

function countBy(values) {
  return Object.fromEntries(
    [...new Set(values)].sort().map((value) => [
      value,
      values.filter((candidate) => candidate === value).length,
    ]),
  );
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function flattenBundle(bundle) {
  const flows = bundle.map.flows;
  const steps = flows.flatMap((flow) =>
    flow.steps.map((step) => ({ ...step, flowId: flow.flowId })),
  );
  const items = steps.flatMap((step) =>
    step.items.map((item) => ({
      ...item,
      flowId: step.flowId,
      stepId: step.stepId,
    })),
  );
  const scheduled = items.filter((item) => item.schedule !== null);
  return { flows, steps, items, scheduled };
}

function personalConversionAvailability(rightsStatus) {
  if (rightsStatus === 'public_conversion_allowed') {
    return {
      status: 'allowed',
      scope: 'public_and_personal_with_attribution',
    };
  }
  if (rightsStatus === 'private_conversion_only') {
    return {
      status: 'allowed',
      scope: 'private_execution_only_no_catalog_or_shared_flow',
    };
  }
  if (rightsStatus === 'link_metadata_only') {
    return {
      status: 'allowed_with_limits',
      scope: 'title_url_public_order_and_private_overlay_only',
    };
  }
  if (rightsStatus === 'permission_required') {
    return {
      status: 'not_confirmed',
      scope: 'internal_revalidation_allowed_public_redistribution_requires_permission',
    };
  }
  return { status: 'not_confirmed', scope: 'rights_review_required' };
}

function reviewSnapshot(qualification) {
  return {
    sourceCompleteness: qualification.sourceRowsReady
      ? 'row_set_ready_for_logic_revalidation'
      : 'source_rows_not_ready',
    localeReview: 'not_separately_recorded_in_qualified_v2',
    safetyReview: qualification.sensitiveBoundaryRequired
      ? 'required_for_projection_and_publication'
      : 'not_flagged_by_qualified_v2',
    privacyReview:
      qualification.rightsStatus === 'private_conversion_only'
        ? 'private_source_boundary_present'
        : 'not_separately_recorded_in_qualified_v2',
  };
}

function promotionState(publicReadiness, corpusRole) {
  if (corpusRole === 'boundary') return 'boundary_appendix_only';
  if (publicReadiness === 'Go') return 'public_candidate_with_recorded_attribution';
  if (publicReadiness === 'Modify') return 'requires_rights_or_scope_modification';
  return 'public_hold';
}

function categoryMapping(category) {
  const mappings = {
    study_learning: {
      canonicalLifeArea: 'study_reading',
      mappingType: 'explicit_alias_normalization',
    },
    travel_outings_events: {
      canonicalLifeArea: 'travel_outings',
      mappingType: 'explicit_alias_normalization',
    },
  };
  return (
    mappings[category] || {
      canonicalLifeArea: category,
      mappingType: 'already_canonical',
    }
  );
}

async function writeJson(filename, value) {
  await fs.writeFile(
    path.join(SPEC_DIR, filename),
    `${JSON.stringify(value, null, 2)}\n`,
    'utf8',
  );
}

const sourceData = {};
const sourceArtifacts = [];

for (const input of INPUTS) {
  const absolutePath = path.join(REPO_ROOT, input.path);
  const bytes = await fs.readFile(absolutePath);
  const actualSha256 = sha256(bytes);
  assert(
    actualSha256 === input.expectedSha256,
    `Source drift for ${input.path}: expected ${input.expectedSha256}, got ${actualSha256}`,
  );
  sourceData[input.key] = JSON.parse(bytes.toString('utf8'));
  sourceArtifacts.push({
    key: input.key,
    path: input.path,
    role: input.role,
    bytes: bytes.length,
    sha256: actualSha256,
  });
}

const qualified = sourceData.qualifiedV2;
const v1Gold = sourceData.v1Gold;
const v1CategoryFit = sourceData.v1CategoryFit;
const v1Scorecard = sourceData.v1Scorecard;
const v1Validation = sourceData.v1Validation;
const vertical = sourceData.verticalBenchmark;
const taxonomy = sourceData.taxonomyV11;

assert(
  JSON.stringify(qualified.logicHandoffSelections.map((record) => record.creatorId)) ===
    JSON.stringify(EXPECTED_SELECTIONS),
  'Qualified v2 logic handoff selection or order drifted.',
);
assert(qualified.logicHandoffSelections.length === 8, 'Expected 8 logic handoff bundles.');
assert(vertical.contentDiscoveryOpportunities.length === 8, 'Expected 8 vertical opportunities.');

const qualifiedExamples = new Map(
  qualified.representativeFlowExamples.map((example) => [
    example.creatorId,
    example,
  ]),
);
const qualificationById = new Map(
  qualified.qualificationRecords.map((record) => [
    record.portfolioSubjectId,
    record,
  ]),
);
const rightsById = new Map(
  qualified.rightsRecords.map((record) => [record.portfolioSubjectId, record]),
);
const v1FitByBundle = new Map(
  v1CategoryFit.records.map((record) => [record.bundleId, record]),
);

const corpusBundles = qualified.logicHandoffSelections.map((selection) => {
  const example = qualifiedExamples.get(selection.creatorId);
  const qualification = qualificationById.get(selection.creatorId);
  const rights = rightsById.get(selection.creatorId);
  assert(example, `Missing representative example for ${selection.creatorId}`);
  assert(qualification, `Missing qualification for ${selection.creatorId}`);
  assert(rights, `Missing rights record for ${selection.creatorId}`);

  const bundle = clone(example.userContentBundle);
  const sourceRows = clone(example.sourceRows);
  const { flows, steps, items, scheduled } = flattenBundle(bundle);
  const sourceRowIds = new Set(sourceRows.map((row) => row.sourceRowId));
  const unresolvedRefs = items.flatMap((item) =>
    item.sourceRowIds.filter((sourceRowId) => !sourceRowIds.has(sourceRowId)),
  );
  const unreferencedRows = sourceRows
    .filter(
      (row) =>
        !items.some((item) => item.sourceRowIds.includes(row.sourceRowId)),
    )
    .map((row) => row.sourceRowId);
  assert(unresolvedRefs.length === 0, `${bundle.bundleId} has unresolved SourceRow refs.`);
  assert(unreferencedRows.length === 0, `${bundle.bundleId} has unreferenced SourceRows.`);

  const oldFit = v1FitByBundle.get(bundle.bundleId);
  const taxonomyMapping =
    selection.creatorId === 'study-opentutorials'
      ? WEB1_TAXONOMY
      : {
          lifeArea: oldFit.lifeArea,
          mapType: oldFit.mapType,
          sourceShape: oldFit.sourceShape,
          executionPattern: oldFit.executionPattern,
          primaryArtifact: oldFit.primaryArtifact,
          secondaryArtifacts: oldFit.secondaryArtifacts,
          naturalCalendarPolicy: oldFit.naturalCalendarPolicy,
          mappingStatus: 'carried_from_frozen_v1_category_fit',
          mappingReason:
            '동일 Bundle의 v1 taxonomy 판정을 유지하고 최신 Qualified v2 Item과 SourceRow에 다시 대조한다.',
        };

  assert(
    taxonomy.enums.lifeAreas.includes(taxonomyMapping.lifeArea),
    `${bundle.bundleId} has invalid lifeArea.`,
  );
  assert(
    taxonomy.enums.sourceShapes.includes(taxonomyMapping.sourceShape),
    `${bundle.bundleId} has invalid sourceShape.`,
  );
  assert(
    taxonomy.enums.executionPatterns.includes(taxonomyMapping.executionPattern),
    `${bundle.bundleId} has invalid executionPattern.`,
  );
  assert(
    taxonomy.enums.artifacts.includes(taxonomyMapping.primaryArtifact),
    `${bundle.bundleId} has invalid primaryArtifact.`,
  );
  assert(
    taxonomyMapping.secondaryArtifacts.every((artifact) =>
      taxonomy.enums.artifacts.includes(artifact),
    ),
    `${bundle.bundleId} has invalid secondaryArtifact.`,
  );

  assert(selection.flowCount === flows.length, `${bundle.bundleId} flow count drift.`);
  assert(selection.stepCount === steps.length, `${bundle.bundleId} step count drift.`);
  assert(selection.itemCount === items.length, `${bundle.bundleId} item count drift.`);
  assert(
    selection.sourceRowCount === sourceRows.length,
    `${bundle.bundleId} SourceRow count drift.`,
  );

  return {
    creatorId: selection.creatorId,
    creatorName: selection.creatorName,
    bundleId: selection.bundleId,
    title: selection.bundleTitle,
    taxonomy: taxonomyMapping,
    userJob: selection.oneUserJob,
    naturalArtifactAsRecorded: selection.naturalArtifact,
    dateRuleAsRecorded: selection.dateRule,
    readiness: {
      architectureFit: 'pending_v2_revalidation',
      logicReadiness: selection.logicReadiness,
      publicReadiness: selection.publicReadiness,
      rightsStatus: selection.rightsStatus,
      personalConversionAvailability: personalConversionAvailability(
        selection.rightsStatus,
      ),
      promotionState: promotionState(selection.publicReadiness, 'normal'),
      reviews: reviewSnapshot(qualification),
    },
    metrics: {
      flows: flows.length,
      steps: steps.length,
      items: items.length,
      sourceRows: sourceRows.length,
      scheduledItems: scheduled.length,
      undatedItems: items.length - scheduled.length,
      sourceRowReferences: items.reduce(
        (sum, item) => sum + item.sourceRowIds.length,
        0,
      ),
    },
    integrity: {
      everyItemSourceRefResolves: unresolvedRefs.length === 0,
      everySourceRowIsReferenced: unreferencedRows.length === 0,
      sourceRowsSha256: semanticHash(sourceRows),
      itemsSha256: semanticHash(items),
      sourceTraceSha256: semanticHash(
        items.map((item) => ({
          itemId: item.itemId,
          sourceRowIds: item.sourceRowIds,
          sourceTrace: item.sourceTrace,
        })),
      ),
    },
    bundle,
    sourceRows,
  };
});

const allFlows = corpusBundles.flatMap((record) => record.bundle.map.flows);
const allSteps = allFlows.flatMap((flow) => flow.steps);
const allItems = allSteps.flatMap((step) => step.items);
const allSourceRows = corpusBundles.flatMap((record) => record.sourceRows);
const scheduledItems = allItems.filter((item) => item.schedule !== null);
const undatedItems = allItems.filter((item) => item.schedule === null);

const corpusCounts = {
  bundles: corpusBundles.length,
  flows: allFlows.length,
  steps: allSteps.length,
  items: allItems.length,
  sourceRows: allSourceRows.length,
  scheduledItems: scheduledItems.length,
  undatedItems: undatedItems.length,
};

assert(corpusCounts.bundles === 8, 'Expected 8 Bundles.');
assert(corpusCounts.flows === 21, 'Expected 21 Flows.');
assert(corpusCounts.steps === 49, 'Expected 49 Steps.');
assert(corpusCounts.items === 160, 'Expected 160 Items.');
assert(corpusCounts.sourceRows === 210, 'Expected 210 SourceRows.');
assert(corpusCounts.scheduledItems === 112, 'Expected 112 scheduled Items.');
assert(corpusCounts.undatedItems === 48, 'Expected 48 undated Items.');
assert(new Set(allItems.map((item) => item.itemId)).size === 160, 'Item IDs must be unique.');
assert(
  new Set(allSourceRows.map((row) => row.sourceRowId)).size === 210,
  'SourceRow IDs must be unique.',
);

const publicCounts = countBy(
  corpusBundles.map((record) => record.readiness.publicReadiness),
);
assert(publicCounts.Go === 1, 'Expected Public Go 1.');
assert(publicCounts.Modify === 6, 'Expected Public Modify 6.');
assert(publicCounts.Hold === 1, 'Expected Public Hold 1.');
assert(
  corpusBundles.find((record) => record.readiness.publicReadiness === 'Go')
    ?.creatorId === 'study-opentutorials',
  'WEB1 must be the only Public Go.',
);

const inputLineage = {
  schemaVersion: 'flowme-qualified-corpus-input-lineage-v2',
  generatedAt: GENERATED_AT,
  freezeMode: 'exact_file_bytes_sha256',
  purpose:
    'Freeze the exact Qualified v2, v1 baseline, Vertical benchmark, and Taxonomy v1.1 inputs used by the architecture revalidation.',
  sourceArtifacts,
  normalCorpusSelection: {
    policy:
      'Use only Qualified v2 logicHandoffSelections as the normal revalidation corpus.',
    creatorIds: EXPECTED_SELECTIONS,
    bundleIds: corpusBundles.map((record) => record.bundleId),
  },
  historicalBoundarySelection: {
    policy:
      'Keep Triple and Fitpet as historical boundary evidence; exclude them from all normal corpus totals.',
    creatorIds: BOUNDARY_IDS,
  },
  generatedArtifacts: [
    'input-lineage-v2.json',
    'baseline-delta-v2.json',
    'qualified-corpus-fixture-v2.json',
    'rights-and-readiness-matrix-v2.json',
    'vertical-opportunity-appendix-v1.json',
  ],
  evidenceBoundary: [
    'The hashes freeze local source artifacts; they do not certify source rights or external-client interoperability.',
    'The v1 score, projection loss, round-trip, and validator results remain historical evidence and are not v2 results.',
    'The Vertical benchmark contributes planning opportunities only and contributes zero Item or SourceRow records.',
  ],
};

const oldCounts = {
  bundles: v1Gold.counts.primary,
  flows: v1Gold.counts.primaryFlows,
  steps: v1Gold.counts.primarySteps,
  items: v1Gold.counts.primaryItems,
  sourceRows: v1Gold.counts.primarySourceRows,
  scheduledItems: v1Scorecard.corpusTotals.scheduled,
  undatedItems:
    v1Scorecard.corpusTotals.items - v1Scorecard.corpusTotals.scheduled,
};

const baselineDelta = {
  schemaVersion: 'flowme-qualified-corpus-baseline-delta-v2',
  generatedAt: GENERATED_AT,
  baseline: {
    corpusLabel: '2026-07-23 architecture lab v1 primary corpus',
    counts: oldCounts,
    architectureScores: Object.fromEntries(
      v1Scorecard.records.map((record) => [record.architecture, record.total]),
    ),
    validator: {
      passed: v1Validation.passed,
      checkCount: v1Validation.checkCount,
      passedCount: v1Validation.passedCount,
      failedCount: v1Validation.failedCount,
    },
    decision: sourceData.v1Adjudication.decision,
    externalCalendarClientRoundTrip:
      v1Scorecard.roundTripSummary.externalClientRoundTrip,
    frozenArtifactKeys: [
      'v1DiscoverySnapshot',
      'v1Gold',
      'v1CategoryFit',
      'v1Scorecard',
      'v1ProjectionLoss',
      'v1RoundTrip',
      'v1Adjudication',
      'v1Validation',
    ],
  },
  currentCorpus: {
    corpusLabel: '2026-07-27 Qualified v2 logic handoff corpus',
    counts: corpusCounts,
    publicReadinessCounts: publicCounts,
    representedLifeAreas: [
      ...new Set(corpusBundles.map((record) => record.taxonomy.lifeArea)),
    ].sort(),
    architectureScores: 'pending_recalculation',
    validator: 'pending_v2_validation',
    externalCalendarClientRoundTrip: 'not_run',
  },
  countDelta: Object.fromEntries(
    Object.keys(corpusCounts).map((key) => [
      key,
      corpusCounts[key] - oldCounts[key],
    ]),
  ),
  corpusReplacement: {
    removedFromNormalCorpus: [
      {
        creatorId: 'travel-triple',
        bundleId: 'bundle-triple-cappadocia-departure',
        title: '카파도키아 출국 전 체크',
        priorContribution: {
          flows: 1,
          steps: 3,
          items: 8,
          sourceRows: 8,
          scheduledItems: 0,
          undatedItems: 8,
        },
        currentRole: 'historical_boundary',
        logicReadiness: 'Modify',
        publicReadiness: 'Modify',
      },
      {
        creatorId: 'hobby-fitpet',
        bundleId: 'bundle-fitpet-puppy-vaccination',
        title: '강아지 생후 6~16주 예방접종 일정',
        priorContribution: {
          flows: 1,
          steps: 6,
          items: 6,
          sourceRows: 6,
          scheduledItems: 6,
          undatedItems: 0,
        },
        currentRole: 'historical_boundary',
        logicReadiness: 'Hold',
        publicReadiness: 'Hold',
      },
    ],
    addedToNormalCorpus: [
      {
        creatorId: 'study-opentutorials',
        bundleId: 'bundle-opentutorials-web1-progress',
        title: '생활코딩 WEB1 진도표',
        contribution: {
          flows: 1,
          steps: 1,
          items: 26,
          sourceRows: 26,
          scheduledItems: 0,
          undatedItems: 26,
        },
        currentRole: 'qualified_logic_handoff',
        logicReadiness: 'Go',
        publicReadiness: 'Go',
      },
    ],
    decompositionChecks: {
      flows: '22 - 1 - 1 + 1 = 21',
      steps: '57 - 3 - 6 + 1 = 49',
      items: '148 - 8 - 6 + 26 = 160',
      sourceRows: '198 - 8 - 6 + 26 = 210',
      scheduledItems: '118 - 0 - 6 + 0 = 112',
      undatedItems: '30 - 8 - 0 + 26 = 48',
    },
  },
  interpretationRules: [
    'Do not copy the v1 96/51/95 scores into v2.',
    'Do not present the v1 752 validator checks as v2 checks.',
    'Do not include Triple or Fitpet in v2 normal corpus totals.',
    'Do not treat logic Go as public Go.',
  ],
};

const qualifiedCorpusFixture = {
  schemaVersion: 'flowme-qualified-corpus-fixture-v2',
  generatedAt: GENERATED_AT,
  corpusStatus: 'inputs_frozen_architecture_revalidation_pending',
  canonicalHierarchy: ['SourceRow', 'Item', 'Step', 'Flow', 'Bundle/Flow Map'],
  projectionPrinciple:
    'Calendar/ICS, Checklist, Todo, Sheet, and Memo are Item projections, not canonical source records.',
  sourceArtifact: INPUTS.find((input) => input.key === 'qualifiedV2').path,
  sourceSha256: INPUTS.find((input) => input.key === 'qualifiedV2').expectedSha256,
  taxonomySource: INPUTS.find((input) => input.key === 'taxonomyV11').path,
  counts: corpusCounts,
  publicReadinessCounts: publicCounts,
  corpusIntegrity: {
    bundleIdsUnique:
      new Set(corpusBundles.map((record) => record.bundleId)).size === 8,
    flowIdsUnique: new Set(allFlows.map((flow) => flow.flowId)).size === 21,
    stepIdsUnique: new Set(allSteps.map((step) => step.stepId)).size === 49,
    itemIdsUnique: new Set(allItems.map((item) => item.itemId)).size === 160,
    sourceRowIdsUnique:
      new Set(allSourceRows.map((row) => row.sourceRowId)).size === 210,
    everyItemSourceRefResolves: corpusBundles.every(
      (record) => record.integrity.everyItemSourceRefResolves,
    ),
    everySourceRowIsReferenced: corpusBundles.every(
      (record) => record.integrity.everySourceRowIsReferenced,
    ),
    corpusItemsSha256: semanticHash(
      corpusBundles.flatMap((record) =>
        flattenBundle(record.bundle).items.map((item) => ({
          bundleId: record.bundleId,
          ...item,
        })),
      ),
    ),
    corpusSourceRowsSha256: semanticHash(allSourceRows),
  },
  evidenceBoundary: [
    'Bundle and SourceRow values are copied from Qualified v2 without source-row invention.',
    'Taxonomy for seven carried Bundles is copied from the frozen v1 category-fit matrix; WEB1 is adjudicated against Taxonomy v1.1.',
    'Architecture fit remains pending until the three architectures are rerun on this fixture.',
    'Public readiness and personal conversion availability remain separate.',
  ],
  bundles: corpusBundles,
};

const matrixRecords = [
  ...corpusBundles.map((record) => {
    const qualification = qualificationById.get(record.creatorId);
    const rights = rightsById.get(record.creatorId);
    return {
      creatorId: record.creatorId,
      creatorName: record.creatorName,
      bundleId: record.bundleId,
      title: record.title,
      corpusRole: 'normal_qualified',
      includedInNormalCorpusTotals: true,
      architectureFit: 'pending_v2_revalidation',
      logicReadiness: record.readiness.logicReadiness,
      publicReadiness: record.readiness.publicReadiness,
      rightsStatus: record.readiness.rightsStatus,
      personalConversionAvailability:
        record.readiness.personalConversionAvailability,
      sourceCompleteness: record.readiness.reviews.sourceCompleteness,
      localeReview: record.readiness.reviews.localeReview,
      safetyReview: record.readiness.reviews.safetyReview,
      privacyReview: record.readiness.reviews.privacyReview,
      promotionState: record.readiness.promotionState,
      sourceRowCount: record.metrics.sourceRows,
      qualificationReason: qualification.logicReason,
      publicReason: qualification.publicReason,
      rightsEvidence: {
        evidenceClass: rights.evidenceClass,
        evidenceUrl: rights.evidenceUrl,
        evidenceLocator: rights.evidenceLocator,
        reason: rights.reason,
        publicUseBoundary: rights.publicUseBoundary,
        attributionRequired: rights.attributionRequired,
        observedAt: rights.observedAt,
      },
    };
  }),
  ...BOUNDARY_IDS.map((creatorId) => {
    const qualification = qualificationById.get(creatorId);
    const rights = rightsById.get(creatorId);
    const boundary = qualified.boundaryCases.find(
      (record) => record.creatorId === creatorId,
    );
    const oldCase = v1Gold.primaryCases.find(
      (record) => record.creatorId === creatorId,
    );
    const oldFit = v1CategoryFit.records.find(
      (record) => record.creatorId === creatorId,
    );
    assert(
      qualification && rights && oldCase && oldFit,
      `Missing historical boundary source for ${creatorId}`,
    );
    const boundaryEvidence = boundary || {
      creatorName: qualification.displayName,
      reason: qualification.logicReason,
      promotionCondition: qualification.publicReason,
    };
    return {
      creatorId,
      creatorName: boundaryEvidence.creatorName,
      bundleId: oldFit.bundleId,
      title: oldFit.title,
      corpusRole: 'historical_boundary',
      includedInNormalCorpusTotals: false,
      architectureFit: 'not_rerun_in_normal_corpus',
      logicReadiness: qualification.logicReadiness,
      publicReadiness: qualification.publicReadiness,
      rightsStatus: qualification.rightsStatus,
      personalConversionAvailability: personalConversionAvailability(
        qualification.rightsStatus,
      ),
      sourceCompleteness: qualification.sourceRowsReady
        ? 'historical_rows_exist_but_not_admitted_to_normal_corpus'
        : 'source_rows_not_ready',
      localeReview: 'not_separately_recorded_in_qualified_v2',
      safetyReview: qualification.sensitiveBoundaryRequired
        ? 'required_before_any_promotion'
        : 'not_flagged_by_qualified_v2',
      privacyReview: 'not_separately_recorded_in_qualified_v2',
      promotionState: promotionState(
        qualification.publicReadiness,
        'boundary',
      ),
      sourceRowCount: oldCase.semanticContract.sourceRowCount,
      qualificationReason: qualification.logicReason,
      publicReason: qualification.publicReason,
      boundaryReason: boundaryEvidence.reason,
      promotionCondition: boundaryEvidence.promotionCondition,
      rightsEvidence: {
        evidenceClass: rights.evidenceClass,
        evidenceUrl: rights.evidenceUrl,
        evidenceLocator: rights.evidenceLocator,
        reason: rights.reason,
        publicUseBoundary: rights.publicUseBoundary,
        attributionRequired: rights.attributionRequired,
        observedAt: rights.observedAt,
      },
    };
  }),
];

const rightsAndReadinessMatrix = {
  schemaVersion: 'flowme-rights-and-readiness-matrix-v2',
  generatedAt: GENERATED_AT,
  axisContract: {
    architectureFit: 'Outcome of the v2 architecture run; currently pending.',
    logicReadiness: 'Whether the frozen source rows can drive conversion logic.',
    publicReadiness: 'Whether a result is ready for public catalog use.',
    rightsStatus: 'Rights basis or restriction recorded by Qualified v2.',
    personalConversionAvailability:
      'Separate personal/internal conversion boundary; never inferred as public redistribution permission.',
    sourceCompleteness: 'Whether rows exist for logic revalidation.',
    reviewAxes:
      'Locale, safety, and privacy remain independent and unknown when Qualified v2 did not record them.',
  },
  normalCorpusSummary: {
    records: 8,
    architectureFit: { pending_v2_revalidation: 8 },
    logicReadiness: countBy(
      matrixRecords
        .filter((record) => record.includedInNormalCorpusTotals)
        .map((record) => record.logicReadiness),
    ),
    publicReadiness: publicCounts,
    rightsStatus: countBy(
      matrixRecords
        .filter((record) => record.includedInNormalCorpusTotals)
        .map((record) => record.rightsStatus),
    ),
  },
  historicalBoundarySummary: {
    records: 2,
    excludedFromNormalCorpusTotals: 2,
    creatorIds: BOUNDARY_IDS,
  },
  records: matrixRecords,
};

const verticalOpportunities = vertical.contentDiscoveryOpportunities.map(
  (opportunity) => {
    const compression = vertical.finalCompression.find(
      (record) => record.contentDiscoveryOpportunity === opportunity.id,
    );
    const normalization = VERTICAL_NORMALIZATION[opportunity.id];
    assert(compression, `Missing final compression for ${opportunity.id}`);
    assert(normalization, `Missing normalization rule for ${opportunity.id}`);

    const mapping = categoryMapping(opportunity.category);
    const inspiredServices = vertical.verifiedServices.filter((service) =>
      opportunity.inspiredBy.includes(service.id),
    );
    assert(
      taxonomy.enums.lifeAreas.includes(mapping.canonicalLifeArea),
      `Invalid canonical category mapping for ${opportunity.id}`,
    );
    assert(
      taxonomy.enums.artifacts.includes(normalization.defaultDestination),
      `Invalid destination for ${opportunity.id}`,
    );
    assert(
      taxonomy.enums.executionPatterns.includes(
        normalization.canonicalExecutionPatternCandidate,
      ),
      `Invalid execution pattern candidate for ${opportunity.id}`,
    );

    return {
      opportunityId: opportunity.id,
      rank: opportunity.rank,
      title: opportunity.title,
      opportunityStatus:
        opportunity.decision === 'go' ? 'Go' : 'Partner',
      corpusRole: 'future_content_discovery_only',
      contributesToQualifiedCorpusCounts: false,
      sourceCategoryAsRecorded: opportunity.category,
      canonicalCategoryMapping: mapping,
      userMoment: compression.userMoment,
      naturalArtifact: opportunity.naturalArtifact,
      minimumAnchor: compression.minimumAnchor,
      expectedContentInputs: opportunity.expectedInputs,
      requiredSourceRows: opportunity.requiredSourceRows,
      dateIntent: normalization.dateIntent,
      defaultDestination: normalization.defaultDestination,
      executionPatternBoundary: {
        benchmarkServicePatternIds: [
          ...new Set(inspiredServices.map((service) => service.executionPattern)),
        ],
        canonicalExecutionPatternCandidate:
          normalization.canonicalExecutionPatternCandidate,
        mappingStatus:
          'candidate_only_reclassify_after_actual_creator_source_rows_are_acquired',
      },
      doNotBuildBoundary: compression.doNotBuildBoundary,
      publicUseBoundary: opportunity.publicUseBoundary,
      sourceShapeAsDiscoveryBrief: opportunity.sourceShape,
      evidenceSource: {
        representativeServiceId: compression.serviceId,
        inspiredByServiceIds: opportunity.inspiredBy,
      },
    };
  },
);

const verticalOpportunityAppendix = {
  schemaVersion: 'flowme-vertical-opportunity-appendix-v1',
  generatedAt: GENERATED_AT,
  sourceArtifact: INPUTS.find(
    (input) => input.key === 'verticalBenchmark',
  ).path,
  sourceSha256: INPUTS.find(
    (input) => input.key === 'verticalBenchmark',
  ).expectedSha256,
  sourceSummary: {
    discovered: vertical.summary.discoveredCount,
    publiclyVerified: vertical.summary.verifiedCount,
    deepDive: vertical.summary.deepDiveCount,
    opportunities: vertical.summary.opportunityCount,
  },
  contributionToQualifiedCorpus: {
    bundles: 0,
    flows: 0,
    steps: 0,
    items: 0,
    sourceRows: 0,
    reason:
      'The eight records are discovery directions, not creator content with acquired SourceRows.',
  },
  categoryMappingContract: {
    study_learning: 'study_reading',
    travel_outings_events: 'travel_outings',
    allOtherValues: 'already canonical Taxonomy v1.1 lifeArea values',
  },
  executionPatternContract:
    'Vertical service executionPattern values remain benchmark metadata. Canonical candidates are planning hypotheses until actual creator SourceRows are acquired.',
  opportunities: verticalOpportunities,
};

await Promise.all([
  writeJson('input-lineage-v2.json', inputLineage),
  writeJson('baseline-delta-v2.json', baselineDelta),
  writeJson('qualified-corpus-fixture-v2.json', qualifiedCorpusFixture),
  writeJson('rights-and-readiness-matrix-v2.json', rightsAndReadinessMatrix),
  writeJson('vertical-opportunity-appendix-v1.json', verticalOpportunityAppendix),
]);

console.log(
  JSON.stringify(
    {
      generated: [
        'input-lineage-v2.json',
        'baseline-delta-v2.json',
        'qualified-corpus-fixture-v2.json',
        'rights-and-readiness-matrix-v2.json',
        'vertical-opportunity-appendix-v1.json',
      ],
      counts: corpusCounts,
      publicReadinessCounts: publicCounts,
      sourceArtifactHashesVerified: sourceArtifacts.length,
      integrity: qualifiedCorpusFixture.corpusIntegrity,
    },
    null,
    2,
  ),
);
