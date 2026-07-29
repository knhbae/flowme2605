import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SPEC_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SPEC_DIR, '..', '..', '..');

export const REQUIRED_ARTIFACTS = [
  'input-lineage-v2.json',
  'baseline-delta-v2.json',
  'qualified-corpus-fixture-v2.json',
  'architecture-scorecard-v2.json',
  'projection-matrix-v2.json',
  'projection-loss-manifest-v2.json',
  'round-trip-results-v2.json',
  'rights-and-readiness-matrix-v2.json',
  'vertical-opportunity-appendix-v1.json',
  'final-adjudication-v2.json',
];

const SCHEMA_FILE = 'qualified-revalidation-artifacts-v2.schema.json';
const QUALIFIED_SOURCE =
  'docs/content-audit/2026-07-27-creator-portfolio-qualified-v2.json';
const TAXONOMY_SOURCE =
  'docs/specs/2026-07-20-flowme-taxonomy-v1-1/taxonomy-v1.1.json';
const VERTICAL_SOURCE =
  'docs/content-audit/2026-07-28-vertical-execution-service-benchmark-v1.json';

const EXPECTED_COUNTS = Object.freeze({
  bundles: 8,
  flows: 21,
  steps: 49,
  items: 160,
  sourceRows: 210,
  scheduledItems: 112,
  undatedItems: 48,
});

const EXPECTED_NORMAL_CREATORS = Object.freeze([
  'home-ajd',
  'family-babyfood016',
  'study-mansour',
  'study-opentutorials',
  'money-getcha',
  'health-allblanc',
  'meals-wtable',
  'work-andstudio',
]);

const EXPECTED_BOUNDARY_CREATORS = Object.freeze([
  'travel-triple',
  'hobby-fitpet',
]);

const EXPECTED_PUBLIC_COUNTS = Object.freeze({
  Go: 1,
  Modify: 6,
  Hold: 1,
});

const EXPECTED_LEGACY_CATEGORY_MAPPING = Object.freeze({
  '집·살림': 'home_living',
  '가족·육아': 'family_parenting',
  '공부·독서': 'study_reading',
  '돈·행정·구매': 'money_admin_purchase',
  '건강·운동': 'health_fitness',
  '식사·장보기': 'meals_grocery',
  '일·커리어': 'work_career',
});

const EXPECTED_PROJECTION_COUNTS = Object.freeze({
  VEVENT: 112,
  VTODO: 48,
});

function readJsonAbsolute(absolutePath) {
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function readRepoJson(relativePath) {
  return readJsonAbsolute(path.join(REPO_ROOT, ...relativePath.split('/')));
}

function readArtifact(filename, overrides) {
  if (Object.hasOwn(overrides, filename)) return structuredClone(overrides[filename]);
  return readJsonAbsolute(path.join(SPEC_DIR, filename));
}

function sha256Bytes(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
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

function equal(left, right) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function flattenBundle(bundle) {
  const flows = bundle.map.flows;
  const steps = flows.flatMap((flow) => flow.steps);
  const items = steps.flatMap((step) => step.items);
  return { flows, steps, items };
}

function summarizeFixture(fixture) {
  const flows = fixture.bundles.flatMap((record) => record.bundle.map.flows);
  const steps = flows.flatMap((flow) => flow.steps);
  const items = steps.flatMap((step) => step.items);
  const sourceRows = fixture.bundles.flatMap((record) => record.sourceRows);
  const scheduledItems = items.filter((item) => item.schedule !== null);
  return {
    bundles: fixture.bundles.length,
    flows: flows.length,
    steps: steps.length,
    items: items.length,
    sourceRows: sourceRows.length,
    scheduledItems: scheduledItems.length,
    undatedItems: items.length - scheduledItems.length,
    itemRecords: items,
    sourceRowRecords: sourceRows,
  };
}

function resolveLocalRef(rootSchema, ref) {
  if (!ref.startsWith('#/')) throw new Error(`Only local schema refs are supported: ${ref}`);
  return ref
    .slice(2)
    .split('/')
    .reduce(
      (value, token) =>
        value[token.replaceAll('~1', '/').replaceAll('~0', '~')],
      rootSchema,
    );
}

function typeMatches(value, type) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === type;
}

function validateSchemaNode(value, schema, rootSchema, instancePath, errors) {
  if (schema === true) return;
  if (schema === false) {
    errors.push(`${instancePath}: schema is false`);
    return;
  }
  if (schema.$ref) {
    validateSchemaNode(
      value,
      resolveLocalRef(rootSchema, schema.$ref),
      rootSchema,
      instancePath,
      errors,
    );
    return;
  }
  if (schema.allOf) {
    for (const entry of schema.allOf) {
      validateSchemaNode(value, entry, rootSchema, instancePath, errors);
    }
  }
  if (schema.anyOf) {
    const passes = schema.anyOf.some((entry) => {
      const branchErrors = [];
      validateSchemaNode(value, entry, rootSchema, instancePath, branchErrors);
      return branchErrors.length === 0;
    });
    if (!passes) errors.push(`${instancePath}: no anyOf branch matched`);
    return;
  }
  if (schema.oneOf) {
    const passCount = schema.oneOf.filter((entry) => {
      const branchErrors = [];
      validateSchemaNode(value, entry, rootSchema, instancePath, branchErrors);
      return branchErrors.length === 0;
    }).length;
    if (passCount !== 1) errors.push(`${instancePath}: expected one oneOf match, got ${passCount}`);
    return;
  }

  if (schema.const !== undefined && !equal(value, schema.const)) {
    errors.push(`${instancePath}: expected const ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum && !schema.enum.some((entry) => equal(entry, value))) {
    errors.push(`${instancePath}: value is outside enum`);
  }

  if (schema.type) {
    const allowedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!allowedTypes.some((type) => typeMatches(value, type))) {
      errors.push(
        `${instancePath}: expected type ${allowedTypes.join('|')}, got ${
          value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
        }`,
      );
      return;
    }
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${instancePath}: shorter than minLength ${schema.minLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${instancePath}: does not match ${schema.pattern}`);
    }
    if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) {
      errors.push(`${instancePath}: invalid date-time`);
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${instancePath}: below minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${instancePath}: above maximum ${schema.maximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${instancePath}: fewer than ${schema.minItems} items`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${instancePath}: more than ${schema.maxItems} items`);
    }
    if (
      schema.uniqueItems &&
      new Set(value.map((entry) => JSON.stringify(stable(entry)))).size !== value.length
    ) {
      errors.push(`${instancePath}: items are not unique`);
    }
    if (schema.items) {
      value.forEach((entry, index) =>
        validateSchemaNode(
          entry,
          schema.items,
          rootSchema,
          `${instancePath}/${index}`,
          errors,
        ),
      );
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required || []) {
      if (!Object.hasOwn(value, key)) errors.push(`${instancePath}: missing ${key}`);
    }
    for (const [key, propertySchema] of Object.entries(schema.properties || {})) {
      if (Object.hasOwn(value, key)) {
        validateSchemaNode(
          value[key],
          propertySchema,
          rootSchema,
          `${instancePath}/${key}`,
          errors,
        );
      }
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties || {}));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) errors.push(`${instancePath}: unexpected property ${key}`);
      }
    }
  }
}

export function validateArtifactSchema(artifact, filename, schema) {
  const definitionName = schema['x-fileSchemas']?.[filename];
  if (!definitionName || !schema.$defs?.[definitionName]) {
    return [`${filename}: no schema definition mapping`];
  }
  const errors = [];
  validateSchemaNode(
    artifact,
    schema.$defs[definitionName],
    schema,
    filename,
    errors,
  );
  return errors;
}

function normalizeProjectionKind(record) {
  return (
    record.calendarComponent ||
    record.icsComponent ||
    record.projections?.calendar?.component ||
    record.projections?.vtodo?.component ||
    record.projection?.icsComponent ||
    record.projection?.component ||
    record.primaryIcsComponent ||
    null
  );
}

function projectionIsFallback(record) {
  return Boolean(
    record.vtodoFallback ||
      (record.projections?.vtodo?.eligible === true &&
        record.projections?.vtodo?.defaultEnabled === false &&
        Array.isArray(record.projections?.vtodo?.fallback) &&
        record.projections.vtodo.fallback.length > 0) ||
      record.fallback?.kind === 'VTODO' ||
      record.fallbackPolicy ||
      record.destinationFallback ||
      record.projection?.fallback,
  );
}

function inspectIcsText(text) {
  const lines = text
    .replace(/\r?\n[ \t]/g, '')
    .split(/\r?\n/)
    .filter(Boolean);
  const stack = [];
  let schedulelessVevents = 0;
  let illegalNesting = 0;
  const veventStartFlags = [];

  for (const line of lines) {
    if (line.startsWith('BEGIN:')) {
      const kind = line.slice(6);
      const parent = stack.at(-1);
      const allowed =
        !parent ||
        (parent === 'VCALENDAR' &&
          ['VEVENT', 'VTODO', 'VJOURNAL', 'VFREEBUSY', 'VTIMEZONE'].includes(kind)) ||
        (['VEVENT', 'VTODO'].includes(parent) && kind === 'VALARM') ||
        (parent === 'VTIMEZONE' && ['STANDARD', 'DAYLIGHT'].includes(kind));
      if (!allowed) illegalNesting += 1;
      stack.push(kind);
      if (kind === 'VEVENT') veventStartFlags.push(false);
      continue;
    }
    if (line.startsWith('DTSTART') && stack.at(-1) === 'VEVENT') {
      veventStartFlags[veventStartFlags.length - 1] = true;
    }
    if (line.startsWith('END:')) {
      const kind = line.slice(4);
      if (kind === 'VEVENT' && veventStartFlags.pop() === false) {
        schedulelessVevents += 1;
      }
      if (stack.pop() !== kind) illegalNesting += 1;
    }
  }
  if (stack.length) illegalNesting += stack.length;
  return { schedulelessVevents, illegalNesting };
}

function collectIcsStrings(value, output = []) {
  if (typeof value === 'string') {
    if (value.includes('BEGIN:VCALENDAR')) output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectIcsStrings(entry, output));
    return output;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((entry) => collectIcsStrings(entry, output));
  }
  return output;
}

export function validateV2({ overrides = {}, writeResult = false } = {}) {
  const checks = [];
  const errors = [];
  const artifacts = {};

  function check(name, condition, detail = null) {
    const passed = Boolean(condition);
    checks.push({ name, passed, detail });
    if (!passed) errors.push(`${name}${detail ? `: ${detail}` : ''}`);
  }

  for (const filename of REQUIRED_ARTIFACTS) {
    try {
      artifacts[filename] = readArtifact(filename, overrides);
      check(`artifact:${filename}:exists_and_parses`, true);
    } catch (error) {
      check(`artifact:${filename}:exists_and_parses`, false, error.message);
    }
  }

  let schema = null;
  try {
    schema = readArtifact(SCHEMA_FILE, overrides);
    check(`artifact:${SCHEMA_FILE}:exists_and_parses`, true);
  } catch (error) {
    check(`artifact:${SCHEMA_FILE}:exists_and_parses`, false, error.message);
  }

  if (schema) {
    for (const filename of REQUIRED_ARTIFACTS) {
      if (!artifacts[filename]) continue;
      const schemaErrors = validateArtifactSchema(artifacts[filename], filename, schema);
      check(
        `schema:${filename}`,
        schemaErrors.length === 0,
        schemaErrors.slice(0, 8).join(' | '),
      );
    }
  }

  const qualified = readRepoJson(QUALIFIED_SOURCE);
  const taxonomy = readRepoJson(TAXONOMY_SOURCE);
  const verticalSource = readRepoJson(VERTICAL_SOURCE);
  const lineage = artifacts['input-lineage-v2.json'];
  const baseline = artifacts['baseline-delta-v2.json'];
  const fixture = artifacts['qualified-corpus-fixture-v2.json'];
  const rights = artifacts['rights-and-readiness-matrix-v2.json'];
  const vertical = artifacts['vertical-opportunity-appendix-v1.json'];
  const scorecard = artifacts['architecture-scorecard-v2.json'];
  const projectionMatrix = artifacts['projection-matrix-v2.json'];
  const lossManifest = artifacts['projection-loss-manifest-v2.json'];
  const roundTrip = artifacts['round-trip-results-v2.json'];
  const final = artifacts['final-adjudication-v2.json'];

  if (lineage) {
    check(
      'lineage:normal_creator_ids',
      equal(lineage.normalCorpusSelection.creatorIds, EXPECTED_NORMAL_CREATORS),
    );
    check(
      'lineage:boundary_creator_ids',
      equal(lineage.historicalBoundarySelection.creatorIds, EXPECTED_BOUNDARY_CREATORS),
    );
    check(
      'lineage:qualified_selection_exact',
      equal(
        lineage.normalCorpusSelection.creatorIds,
        qualified.logicHandoffSelections.map((record) => record.creatorId),
      ),
    );
    for (const source of lineage.sourceArtifacts || []) {
      const absolutePath = path.join(REPO_ROOT, ...source.path.split('/'));
      const exists = fs.existsSync(absolutePath);
      check(`lineage:${source.key}:exists`, exists, source.path);
      if (!exists) continue;
      const bytes = fs.readFileSync(absolutePath);
      check(`lineage:${source.key}:bytes`, bytes.length === source.bytes);
      check(`lineage:${source.key}:sha256`, sha256Bytes(bytes) === source.sha256);
    }
  }

  let fixtureSummary = null;
  if (fixture) {
    fixtureSummary = summarizeFixture(fixture);
    for (const [key, expected] of Object.entries(EXPECTED_COUNTS)) {
      check(`fixture:stored_count:${key}`, fixture.counts[key] === expected);
      check(`fixture:recomputed_count:${key}`, fixtureSummary[key] === expected);
    }
    check(
      'fixture:normal_creator_ids',
      equal(
        fixture.bundles.map((record) => record.creatorId),
        EXPECTED_NORMAL_CREATORS,
      ),
    );
    check(
      'fixture:bundle_ids_match_lineage',
      !lineage ||
        equal(
          fixture.bundles.map((record) => record.bundleId),
          lineage.normalCorpusSelection.bundleIds,
        ),
    );
    check(
      'fixture:boundary_not_in_normal_corpus',
      fixture.bundles.every(
        (record) => !EXPECTED_BOUNDARY_CREATORS.includes(record.creatorId),
      ),
    );

    const itemIds = fixtureSummary.itemRecords.map((item) => item.itemId);
    const sourceRowIds = fixtureSummary.sourceRowRecords.map(
      (row) => row.sourceRowId,
    );
    check('fixture:item_ids_unique', new Set(itemIds).size === itemIds.length);
    check(
      'fixture:source_row_ids_unique',
      new Set(sourceRowIds).size === sourceRowIds.length,
    );

    for (const record of fixture.bundles) {
      const flattened = flattenBundle(record.bundle);
      const rowById = new Map(
        record.sourceRows.map((row) => [row.sourceRowId, row]),
      );
      check(
        `fixture:${record.bundleId}:stored_metrics`,
        equal(record.metrics, {
          flows: flattened.flows.length,
          steps: flattened.steps.length,
          items: flattened.items.length,
          sourceRows: record.sourceRows.length,
          scheduledItems: flattened.items.filter((item) => item.schedule !== null)
            .length,
          undatedItems: flattened.items.filter((item) => item.schedule === null)
            .length,
          sourceRowReferences: flattened.items.reduce(
            (sum, item) => sum + item.sourceRowIds.length,
            0,
          ),
        }),
      );
      check(
        `fixture:${record.bundleId}:item_source_refs`,
        flattened.items.every(
          (item) =>
            Array.isArray(item.sourceRowIds) &&
            item.sourceRowIds.length > 0 &&
            item.sourceRowIds.every((sourceRowId) => rowById.has(sourceRowId)),
        ),
      );
      check(
        `fixture:${record.bundleId}:source_trace`,
        flattened.items.every(
          (item) =>
            Array.isArray(item.sourceTrace) &&
            item.sourceTrace.every((trace) => {
              const row = rowById.get(trace.sourceRowId);
              return row && row.sourceUrl === trace.sourceUrl;
            }),
        ),
      );
      check(
        `fixture:${record.bundleId}:taxonomy_life_area`,
        taxonomy.enums.lifeAreas.includes(record.taxonomy.lifeArea),
      );
      check(
        `fixture:${record.bundleId}:taxonomy_source_shape`,
        taxonomy.enums.sourceShapes.includes(record.taxonomy.sourceShape),
      );
      check(
        `fixture:${record.bundleId}:taxonomy_execution_pattern`,
        taxonomy.enums.executionPatterns.includes(
          record.taxonomy.executionPattern,
        ),
      );
      check(
        `fixture:${record.bundleId}:taxonomy_artifacts`,
        taxonomy.enums.artifacts.includes(record.taxonomy.primaryArtifact) &&
          record.taxonomy.primaryArtifact !== 'hybrid' &&
          record.taxonomy.secondaryArtifacts.every((artifact) =>
            taxonomy.enums.artifacts.includes(artifact),
          ) &&
          !record.taxonomy.secondaryArtifacts.includes(
            record.taxonomy.primaryArtifact,
          ),
      );
      check(
        `fixture:${record.bundleId}:category_mapping`,
        EXPECTED_LEGACY_CATEGORY_MAPPING[record.bundle.category] ===
          record.taxonomy.lifeArea,
      );
    }

    const publicCounts = countBy(
      fixture.bundles.map((record) => record.readiness.publicReadiness),
    );
    check('fixture:public_readiness_counts', equal(publicCounts, EXPECTED_PUBLIC_COUNTS));
    const web1 = fixture.bundles.find(
      (record) => record.creatorId === 'study-opentutorials',
    );
    check(
      'fixture:web1_public_go',
      web1?.readiness.publicReadiness === 'Go' &&
        web1?.readiness.rightsStatus === 'public_conversion_allowed' &&
        web1?.taxonomy.primaryArtifact === 'sheet' &&
        web1?.taxonomy.naturalCalendarPolicy === 'none',
    );
  }

  if (baseline) {
    check('baseline:current_counts', equal(baseline.currentCorpus.counts, EXPECTED_COUNTS));
    check(
      'baseline:external_client_not_run',
      baseline.currentCorpus.externalCalendarClientRoundTrip === 'not_run',
    );
    check(
      'baseline:v1_scores_not_reused',
      equal(baseline.currentCorpus.architectureScores, {
        current_canonical_v1: 95,
        literal_ics_first: 46,
        item_first_shared_context: 89,
      }) &&
        !equal(
          baseline.currentCorpus.architectureScores,
          baseline.baseline.architectureScores,
        ) &&
        equal(baseline.architectureScoreDelta, {
          current_canonical_v1: -1,
          literal_ics_first: -5,
          item_first_shared_context: -6,
        }),
    );
    check(
      'baseline:triple_fitpet_removed',
      equal(
        baseline.corpusReplacement.removedFromNormalCorpus.map(
          (record) => record.creatorId,
        ),
        EXPECTED_BOUNDARY_CREATORS,
      ),
    );
    check(
      'baseline:web1_added',
      equal(
        baseline.corpusReplacement.addedToNormalCorpus.map(
          (record) => record.creatorId,
        ),
        ['study-opentutorials'],
      ),
    );
  }

  if (rights) {
    const normal = rights.records.filter(
      (record) => record.includedInNormalCorpusTotals,
    );
    const boundaries = rights.records.filter(
      (record) => !record.includedInNormalCorpusTotals,
    );
    check('rights:normal_count', normal.length === 8);
    check('rights:boundary_count', boundaries.length === 2);
    check(
      'rights:axes_are_separate',
      rights.records.every(
        (record) =>
          Object.hasOwn(record, 'architectureFit') &&
          Object.hasOwn(record, 'logicReadiness') &&
          Object.hasOwn(record, 'publicReadiness') &&
          Object.hasOwn(record, 'rightsStatus') &&
          Object.hasOwn(record, 'personalConversionAvailability') &&
          Object.hasOwn(record, 'sourceCompleteness') &&
          Object.hasOwn(record, 'localeReview') &&
          Object.hasOwn(record, 'safetyReview') &&
          Object.hasOwn(record, 'privacyReview') &&
          Object.hasOwn(record, 'promotionState'),
      ),
    );
    check(
      'rights:normal_ids',
      equal(
        normal.map((record) => record.creatorId),
        EXPECTED_NORMAL_CREATORS,
      ),
    );
    check(
      'rights:normal_architecture_fit_finalized',
      normal.every(
        (record) =>
          record.architectureFit === 'Go' &&
          typeof record.architectureFitReason === 'string' &&
          record.architectureFitReason.length > 0,
      ),
    );
    check(
      'rights:boundary_ids',
      equal(
        boundaries.map((record) => record.creatorId),
        EXPECTED_BOUNDARY_CREATORS,
      ),
    );
    const web1 = normal.find((record) => record.creatorId === 'study-opentutorials');
    check(
      'rights:web1_public_go',
      web1?.logicReadiness === 'Go' &&
        web1?.publicReadiness === 'Go' &&
        web1?.rightsStatus === 'public_conversion_allowed',
    );
    const triple = boundaries.find((record) => record.creatorId === 'travel-triple');
    check(
      'rights:triple_boundary',
      triple?.corpusRole === 'historical_boundary' &&
        triple?.logicReadiness === 'Modify' &&
        triple?.publicReadiness === 'Modify' &&
        triple?.rightsStatus === 'permission_required',
    );
    const fitpet = boundaries.find((record) => record.creatorId === 'hobby-fitpet');
    check(
      'rights:fitpet_boundary',
      fitpet?.corpusRole === 'historical_boundary' &&
        fitpet?.logicReadiness === 'Hold' &&
        fitpet?.publicReadiness === 'Hold' &&
        fitpet?.rightsStatus === 'permission_required' &&
        fitpet?.safetyReview === 'required_before_any_promotion',
    );
    check(
      'rights:normal_public_counts',
      equal(
        countBy(normal.map((record) => record.publicReadiness)),
        EXPECTED_PUBLIC_COUNTS,
      ),
    );
  }

  if (vertical) {
    check('vertical:opportunity_count', vertical.opportunities.length === 8);
    check(
      'vertical:zero_corpus_contribution',
      ['bundles', 'flows', 'steps', 'items', 'sourceRows'].every(
        (key) => vertical.contributionToQualifiedCorpus[key] === 0,
      ),
    );
    check(
      'vertical:all_excluded',
      vertical.opportunities.every(
        (record) =>
          record.contributesToQualifiedCorpusCounts === false &&
          record.corpusRole === 'future_content_discovery_only',
      ),
    );
    check(
      'vertical:source_opportunities_exact',
      equal(
        vertical.opportunities.map((record) => record.opportunityId),
        verticalSource.contentDiscoveryOpportunities.map((record) => record.id),
      ),
    );
    check(
      'vertical:taxonomy_aliases',
      vertical.categoryMappingContract.study_learning === 'study_reading' &&
        vertical.categoryMappingContract.travel_outings_events ===
          'travel_outings',
    );
    check(
      'vertical:taxonomy_values_controlled',
      vertical.opportunities.every(
        (record) =>
          taxonomy.enums.lifeAreas.includes(
            record.canonicalCategoryMapping.canonicalLifeArea,
          ) &&
          taxonomy.enums.artifacts.includes(record.defaultDestination) &&
          taxonomy.enums.executionPatterns.includes(
            record.executionPatternBoundary.canonicalExecutionPatternCandidate,
          ),
      ),
    );
    if (fixture) {
      const corpusText = JSON.stringify(
        fixture.bundles.map((record) => ({
          creatorId: record.creatorId,
          bundleId: record.bundleId,
        })),
      );
      check(
        'vertical:opportunity_ids_absent_from_corpus',
        vertical.opportunities.every(
          (record) => !corpusText.includes(record.opportunityId),
        ),
      );
    }
  }

  if (projectionMatrix) {
    const records = projectionMatrix.records || projectionMatrix.items || [];
    const bundleResults = projectionMatrix.bundleResults || [];
    check('projection:record_count', records.length === EXPECTED_COUNTS.items);
    check(
      'projection:bundle_results',
      bundleResults.length === EXPECTED_COUNTS.bundles &&
        equal(
          bundleResults.map((record) => record.bundleId),
          fixture?.bundles.map((record) => record.bundleId),
        ) &&
        bundleResults.every(
          (record) =>
            record.architectureFit === 'Go' &&
            typeof record.reason === 'string' &&
            record.reason.length > 0,
        ),
    );
    if (rights) {
      const normalRightsByBundle = new Map(
        rights.records
          .filter((record) => record.includedInNormalCorpusTotals)
          .map((record) => [record.bundleId, record]),
      );
      check(
        'projection:bundle_results_match_rights',
        bundleResults.every((record) => {
          const right = normalRightsByBundle.get(record.bundleId);
          return (
            right?.architectureFit === record.architectureFit &&
            right?.architectureFitReason === record.reason
          );
        }),
      );
    }
    check(
      'projection:summary_counts',
      projectionMatrix.projectionSummary?.calendarEligibleItems ===
          EXPECTED_COUNTS.scheduledItems &&
        projectionMatrix.projectionSummary?.calendarIneligibleUndatedItems ===
          EXPECTED_COUNTS.undatedItems &&
        projectionMatrix.projectionSummary?.perItemVeventCount ===
          EXPECTED_PROJECTION_COUNTS.VEVENT &&
        projectionMatrix.projectionSummary?.vtodoEligibleUndatedItems ===
          EXPECTED_PROJECTION_COUNTS.VTODO &&
        projectionMatrix.projectionSummary?.vtodoDefaultEnabledItems === 0 &&
        projectionMatrix.projectionSummary?.vtodoFallbackItems ===
          EXPECTED_PROJECTION_COUNTS.VTODO &&
        projectionMatrix.projectionSummary?.schedulelessVevents === 0,
    );
    const kindCounts = countBy(records.map(normalizeProjectionKind));
    check(
      'projection:vevent_count',
      kindCounts.VEVENT === EXPECTED_PROJECTION_COUNTS.VEVENT,
      JSON.stringify(kindCounts),
    );
    check(
      'projection:vtodo_count',
      kindCounts.VTODO === EXPECTED_PROJECTION_COUNTS.VTODO,
      JSON.stringify(kindCounts),
    );
    const schedulelessVevents = records.filter(
      (record) =>
        normalizeProjectionKind(record) === 'VEVENT' &&
        (record.schedule === null ||
          record.schedulePresent === false ||
          record.hasSchedule === false),
    );
    check(
      'projection:no_scheduleless_vevent',
      schedulelessVevents.length === 0,
      String(schedulelessVevents.length),
    );
    const undated = records.filter(
      (record) =>
        record.schedule === null ||
        record.schedulePresent === false ||
        record.hasSchedule === false,
    );
    check('projection:undated_count', undated.length === EXPECTED_COUNTS.undatedItems);
    check(
      'projection:undated_non_calendar',
      undated.every(
        (record) =>
          normalizeProjectionKind(record) === 'VTODO' &&
          projectionIsFallback(record) &&
          record.projections?.calendar?.eligible === false &&
          record.projections?.calendar?.component === null &&
          record.projections?.vtodo?.eligible === true &&
          record.projections?.vtodo?.component === 'VTODO' &&
          record.projections?.vtodo?.defaultEnabled === false &&
          record.projections?.vtodo?.clientSupport === 'not_proven',
      ),
    );
    const scheduled = records.filter((record) => record.schedule !== null);
    check(
      'projection:scheduled_calendar_only',
      scheduled.length === EXPECTED_COUNTS.scheduledItems &&
        scheduled.every(
          (record) =>
            normalizeProjectionKind(record) === 'VEVENT' &&
            record.projections?.calendar?.eligible === true &&
            record.projections?.calendar?.component === 'VEVENT' &&
            record.projections?.vtodo?.eligible === false,
        ),
    );
    check(
      'projection:record_item_ids_unique',
      new Set(records.map((record) => record.itemId)).size === records.length,
    );
    if (fixtureSummary) {
      const fixtureItemById = new Map(
        fixtureSummary.itemRecords.map((item) => [item.itemId, item]),
      );
      const fixtureSourceRowIds = new Set(
        fixtureSummary.sourceRowRecords.map((row) => row.sourceRowId),
      );
      check(
        'projection:every_record_resolves_to_item',
        records.every((record) => fixtureItemById.has(record.itemId)),
      );
      check(
        'projection:source_refs_resolve',
        records.every(
          (record) =>
            Array.isArray(record.sourceRowIds) &&
            record.sourceRowIds.length > 0 &&
            record.sourceRowIds.every((id) => fixtureSourceRowIds.has(id)) &&
            equal(
              record.sourceRowIds,
              fixtureItemById.get(record.itemId)?.sourceRowIds,
            ),
        ),
      );
    }
    const icsInspections = collectIcsStrings(projectionMatrix).map(inspectIcsText);
    check(
      'projection:no_illegal_nested_components',
      icsInspections.every((result) => result.illegalNesting === 0),
      JSON.stringify(icsInspections.filter((result) => result.illegalNesting)),
    );
    check(
      'projection:no_scheduleless_vevent_in_ics',
      icsInspections.every((result) => result.schedulelessVevents === 0),
    );
  }

  if (scorecard) {
    const architectures = scorecard.architectures || scorecard.records || [];
    check('scorecard:three_architectures', architectures.length === 3);
    check(
      'scorecard:architecture_ids',
      equal(
        architectures.map((record) => record.id),
        [
          'current_canonical_v1',
          'literal_ics_first',
          'item_first_shared_context',
        ],
      ),
    );
    check(
      'scorecard:weights_total_100',
      Object.values(scorecard.weights || {}).reduce(
        (sum, value) => sum + value,
        0,
      ) === 100,
    );
    check(
      'scorecard:scores_recomputed',
      architectures.every(
        (record) =>
          typeof (record.score ?? record.total) === 'number' &&
          (record.score ?? record.total) ===
            (record.dimensions || []).reduce(
              (sum, value) => sum + (value?.score || 0),
              0,
            ) &&
          (record.dimensions || []).every(
            (dimension) =>
              scorecard.weights?.[dimension.id] === dimension.max &&
              dimension.score === Math.round(dimension.max * dimension.factor),
          ),
      ),
    );
    check(
      'scorecard:architectures_and_records_same',
      Array.isArray(scorecard.records) &&
        scorecard.records.length === architectures.length &&
        architectures.every((architecture) => {
          const presentation = scorecard.records.find(
            (record) => record.architecture === architecture.id,
          );
          return (
            presentation?.label === architecture.label &&
            presentation?.verdict === architecture.verdict &&
            presentation?.total === architecture.score &&
            architecture.dimensions.every((dimension) =>
              equal(presentation.dimensions?.[dimension.id], {
                score: dimension.score,
                max: dimension.max,
                factor: dimension.factor,
              }),
            ) &&
            equal(presentation.hardGates, architecture.hardGates)
          );
        }),
    );
    check(
      'scorecard:corpus_counts',
      Object.entries(EXPECTED_COUNTS).every(
        ([key, value]) => scorecard.corpusTotals?.[key] === value,
      ),
    );
    check(
      'scorecard:ics_constraints',
      scorecard.roundTripSummary?.schedulelessVevents === 0 &&
        scorecard.roundTripSummary?.nestedVeventOrVtodo === 0 &&
        scorecard.roundTripSummary?.vevents === EXPECTED_PROJECTION_COUNTS.VEVENT &&
        scorecard.roundTripSummary?.vtodos === EXPECTED_PROJECTION_COUNTS.VTODO,
    );
    check(
      'scorecard:external_and_user_validation_not_run',
      scorecard.roundTripSummary?.externalClientRoundTrip === 'NOT_RUN' &&
        scorecard.roundTripSummary?.observedUserValidation === 'NOT_RUN',
    );
  }

  if (lossManifest) {
    check(
      'loss:records_present',
      Array.isArray(lossManifest.records) && lossManifest.records.length > 0,
    );
    check(
      'loss:controlled_dispositions',
      lossManifest.controlledDispositions &&
        lossManifest.records.every((record) =>
          (record.paths || record.losses || []).every(
            (entry) =>
              Object.hasOwn(
                lossManifest.controlledDispositions,
                entry.disposition || entry.status,
              ) &&
              entry.points ===
                lossManifest.controlledDispositions[
                  entry.disposition || entry.status
                ],
          ),
        ),
    );
    check(
      'loss:retention_ratios_recomputed',
      lossManifest.records.every((record) => {
        const paths = record.paths || [];
        const expected =
          paths.reduce((sum, entry) => sum + entry.points, 0) / paths.length;
        return Math.abs(record.retentionRatio - expected) < 1e-12;
      }),
    );
  }

  if (roundTrip) {
    check(
      'round_trip:records_cover_bundles',
      Array.isArray(roundTrip.records) &&
        roundTrip.records.length === EXPECTED_COUNTS.bundles,
    );
    check(
      'round_trip:normal_bundle_ids',
      equal(
        roundTrip.records?.map((record) => record.bundleId),
        fixture?.bundles.map((record) => record.bundleId),
      ),
    );
    check(
      'round_trip:no_scheduleless_or_nested_components',
      roundTrip.summary?.schedulelessVevents === 0 &&
        roundTrip.summary?.nestedVeventOrVtodo === 0 &&
        roundTrip.records?.every(
          (record) =>
            record.literalIcsFirst?.schedulelessVevents === 0 &&
            record.literalIcsFirst?.nestedVeventOrVtodo === 0 &&
            Array.isArray(record.literalIcsFirst?.parserErrors) &&
            record.literalIcsFirst.parserErrors.length === 0,
        ),
    );
    check(
      'round_trip:projection_counts',
      roundTrip.summary?.vevents === EXPECTED_PROJECTION_COUNTS.VEVENT &&
        roundTrip.summary?.vtodos === EXPECTED_PROJECTION_COUNTS.VTODO,
    );
    check(
      'round_trip:vtodo_and_external_unproven',
      roundTrip.summary?.externalClientRoundTrip === 'NOT_RUN' &&
        roundTrip.summary?.observedUserValidation === 'NOT_RUN' &&
        roundTrip.records?.every(
          (record) =>
            record.literalIcsFirst?.externalClientRoundTrip === 'NOT_RUN' &&
            record.literalIcsFirst?.vtodoSupport === 'NOT_PROVEN',
        ),
    );
    check(
      'round_trip:source_refs_recovered',
      roundTrip.summary?.sourceRowReferencesRecoveredByLabParser === 250 &&
        roundTrip.summary?.uniqueSourceRowsRecoveredByLabParser ===
          EXPECTED_COUNTS.sourceRows,
    );
  }

  if (final) {
    const metrics = final.verifiedMetrics || final.metrics || {};
    check(
      'final:external_client_not_run',
      metrics.externalClientRoundTrip === 'not_run' ||
        metrics.externalCalendarClientRoundTrip === 'not_run' ||
        final.externalClientRoundTrip === 'not_run',
    );
    check(
      'final:observed_user_not_run',
      metrics.observedUserValidation === 'not_run' ||
        final.observedUserValidation === 'not_run',
    );
    check(
      'final:counts',
      equal(metrics.corpusCounts || final.corpusCounts, EXPECTED_COUNTS),
    );
    check(
      'final:ics_constraints',
      metrics.schedulelessVevents === 0 &&
        metrics.nestedVeventOrVtodo === 0 &&
        metrics.perItemVevents === EXPECTED_PROJECTION_COUNTS.VEVENT,
    );
    check(
      'final:no_invention_or_reasked_source_values',
      metrics.inventedActions === 0 &&
        metrics.inventedSourceDates === 0 &&
        metrics.sourceValuesReasked === 0,
    );
    check(
      'final:decision_and_boundaries',
      final.decision ===
        'keep_current_canonical_v1_add_projection_time_grouping' &&
        final.verdict === 'Go' &&
        final.verificationStatus?.externalGoogleOutlookAppleRoundTrip ===
          'NOT_RUN' &&
        final.verificationStatus?.observedUserValidation === 'NOT_RUN' &&
        final.verificationStatus?.runtimeChanged === false &&
        final.verificationStatus?.databaseChanged === false &&
        final.verificationStatus?.productionApiChanged === false,
    );
  }

  const result = {
    schemaVersion: 'flowme-qualified-corpus-validation-results-v2',
    generatedAt: new Date().toISOString(),
    passed: errors.length === 0,
    checkCount: checks.length,
    passedCount: checks.filter((record) => record.passed).length,
    failedCount: errors.length,
    expectedCounts: EXPECTED_COUNTS,
    errors,
    checks,
  };

  if (writeResult) {
    fs.writeFileSync(
      path.join(SPEC_DIR, 'validation-results-v2.json'),
      `${JSON.stringify(result, null, 2)}\n`,
      'utf8',
    );
  }
  return result;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = validateV2({ writeResult: true });
  console.log(
    JSON.stringify(
      {
        passed: result.passed,
        checks: result.checkCount,
        failed: result.failedCount,
        output: path.join(SPEC_DIR, 'validation-results-v2.json'),
      },
      null,
      2,
    ),
  );
  if (!result.passed) process.exitCode = 1;
}
