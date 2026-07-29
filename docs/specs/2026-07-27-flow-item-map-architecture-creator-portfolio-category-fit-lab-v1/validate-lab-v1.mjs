import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SPEC_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SPEC_DIR, '..', '..', '..');
const errors = [];
const checks = [];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(SPEC_DIR, relativePath), 'utf8'));
}

function check(name, condition, detail = null) {
  checks.push({ name, passed: Boolean(condition), detail });
  if (!condition) errors.push(`${name}${detail ? `: ${detail}` : ''}`);
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

function flattenSourceBundle(example) {
  const flows = example.userContentBundle.map.flows;
  const steps = flows.flatMap((flow) => flow.steps);
  const items = steps.flatMap((step) => step.items);
  return { flows, steps, items };
}

function flattenCanonical(record) {
  return record.flows.flatMap((flow) =>
    flow.steps.flatMap((step) => step.items),
  );
}

function unfoldIcs(text) {
  return text.replace(/\r?\n[ \t]/g, '');
}

function validateIcs(relativePath) {
  const text = fs.readFileSync(path.join(SPEC_DIR, relativePath), 'utf8');
  const lines = unfoldIcs(text).split(/\r?\n/).filter(Boolean);
  const stack = [];
  let component = null;
  let vevents = 0;
  let vtodos = 0;
  let schedulelessVevents = 0;
  let nested = 0;
  for (const line of lines) {
    if (line.startsWith('BEGIN:')) {
      const kind = line.slice(6);
      if (component && kind !== 'VALARM') nested += 1;
      stack.push(kind);
      if (kind !== 'VCALENDAR') component = { kind, hasDtstart: false, hasUid: false };
      continue;
    }
    if (line.startsWith('END:')) {
      const kind = line.slice(4);
      const opened = stack.pop();
      check(`${relativePath}:matched_${kind}`, opened === kind, `${opened} != ${kind}`);
      if (kind === 'VEVENT' && component) {
        vevents += 1;
        if (!component.hasDtstart) schedulelessVevents += 1;
      }
      if (kind === 'VTODO') vtodos += 1;
      if (kind !== 'VCALENDAR') component = null;
      continue;
    }
    if (component && line.startsWith('DTSTART')) component.hasDtstart = true;
    if (component && line.startsWith('UID:')) component.hasUid = true;
  }
  check(`${relativePath}:balanced`, stack.length === 0, stack.join(','));
  check(`${relativePath}:no_nested_components`, nested === 0, String(nested));
  check(`${relativePath}:no_scheduleless_vevent`, schedulelessVevents === 0, String(schedulelessVevents));
  return { vevents, vtodos, schedulelessVevents, nested };
}

export function validateLab() {
  const source = JSON.parse(
    fs.readFileSync(
      path.join(
        REPO_ROOT,
        'docs',
        'content-audit',
        '2026-07-23-creator-flow-portfolio-data-v1.json',
      ),
      'utf8',
    ),
  );
  const snapshot = readJson('creator-discovery-corpus-snapshot-v1.json');
  const expansion = readJson('creator-expansion-selection-v1.json');
  const boundaries = readJson('creator-boundary-controls-v1.json');
  const regression = readJson('regression-corpus-v1.json');
  const gold = readJson('gold-semantic-contract-v1.json');
  const normalization = readJson('creator-representative-normalization-v1.json');
  const currentRun = readJson('runs/current-canonical/results-v1.json');
  const literalRun = readJson('runs/literal-ics-first/results-v1.json');
  const sharedRun = readJson('runs/item-shared-context/results-v1.json');
  const loss = readJson('projection-loss-manifest-v1.json');
  const roundTrip = readJson('round-trip-results-v1.json');
  const categoryFit = readJson('category-fit-matrix-v1.json');
  const scorecard = readJson('architecture-scorecard-v1.json');
  const final = readJson('final-adjudication-v1.json');

  check('primary_corpus_count', source.representativeFlowExamples.length === 9);
  check('snapshot_primary_count', snapshot.primaryCorpus.length === 9);
  check(
    'snapshot_exact_primary_examples',
    equal(
      snapshot.primaryCorpus.map((record) => record.representativeFlowExample),
      source.representativeFlowExamples,
    ),
  );

  const sourceTotals = source.representativeFlowExamples.reduce(
    (acc, example) => {
      const flat = flattenSourceBundle(example);
      acc.flows += flat.flows.length;
      acc.steps += flat.steps.length;
      acc.items += flat.items.length;
      acc.sourceRows += example.sourceRows.length;
      return acc;
    },
    { flows: 0, steps: 0, items: 0, sourceRows: 0 },
  );
  check('source_flow_count', sourceTotals.flows === 22, JSON.stringify(sourceTotals));
  check('source_step_count', sourceTotals.steps === 57, JSON.stringify(sourceTotals));
  check('source_item_count', sourceTotals.items === 148, JSON.stringify(sourceTotals));
  check('source_row_count', sourceTotals.sourceRows === 198, JSON.stringify(sourceTotals));
  check('normalization_totals', equal(normalization.totals, sourceTotals));

  check('expansion_max_nine', expansion.cases.length <= 9);
  check('expansion_count_matches', expansion.count === expansion.cases.length);
  check('boundary_at_least_six', boundaries.cases.length >= 6);
  check('boundary_count_matches', boundaries.count === boundaries.cases.length);
  check(
    'boundary_generates_no_items',
    boundaries.cases.every(
      (record) =>
        Array.isArray(record.allowedOutput?.generatedItems) &&
        record.allowedOutput.generatedItems.length === 0,
    ),
  );
  check('regression_four_to_six', regression.cases.length >= 4 && regression.cases.length <= 6);
  check('gold_primary_nine', gold.primaryCases.length === 9);
  check('gold_frozen', gold.architectureInputsFrozenBeforeComparison === true);

  check('current_run_nine', currentRun.records.length === 9);
  check('literal_run_nine', literalRun.records.length === 9);
  check('shared_run_nine', sharedRun.records.length === 9);

  for (const example of source.representativeFlowExamples) {
    const bundleId = example.userContentBundle.bundleId;
    const sourceFlat = flattenSourceBundle(example);
    const sourceRows = new Map(example.sourceRows.map((row) => [row.sourceRowId, row]));
    check(
      `${bundleId}:source_refs_resolve`,
      sourceFlat.items.every((item) =>
        item.sourceRowIds.every((sourceRowId) => sourceRows.has(sourceRowId)),
      ),
    );
    check(
      `${bundleId}:source_trace_resolves`,
      sourceFlat.items.every((item) =>
        item.sourceTrace.every((trace) => {
          const row = sourceRows.get(trace.sourceRowId);
          return row && row.sourceUrl === trace.sourceUrl;
        }),
      ),
    );

    const current = currentRun.records.find((record) => record.bundleId === bundleId);
    const shared = sharedRun.records.find((record) => record.bundleId === bundleId);
    const literal = literalRun.records.find((record) => record.bundleId === bundleId);
    check(`${bundleId}:current_exists`, Boolean(current));
    check(`${bundleId}:shared_exists`, Boolean(shared));
    check(`${bundleId}:literal_exists`, Boolean(literal));
    if (!current || !shared || !literal) continue;

    const currentItems = flattenCanonical(current);
    const sharedItems = flattenCanonical(shared);
    check(`${bundleId}:current_item_count`, currentItems.length === sourceFlat.items.length);
    check(`${bundleId}:shared_item_count`, sharedItems.length === sourceFlat.items.length);
    check(`${bundleId}:current_source_rows_exact`, equal(current.sourceRows, example.sourceRows));
    check(`${bundleId}:shared_source_rows_exact`, equal(shared.sourceRows, example.sourceRows));
    check(`${bundleId}:setup_fields_not_expanded`, equal(current.setupFields, example.userContentBundle.setupFields));
    check(`${bundleId}:primary_artifact_not_hybrid`, current.taxonomy.primaryArtifact !== 'hybrid');
    check(
      `${bundleId}:same_item_ids_across_json_architectures`,
      currentItems.map((item) => item.id).join('|') ===
        sharedItems.map((item) => item.id).join('|'),
    );

    const sourceItemById = new Map(sourceFlat.items.map((item) => [item.itemId, item]));
    check(
      `${bundleId}:no_invented_item_schedule`,
      currentItems.every((item) =>
        equal(item.schedule, sourceItemById.get(item.id)?.schedule ?? null),
      ),
    );
    check(
      `${bundleId}:no_invented_item_title`,
      currentItems.every(
        (item) => item.title === sourceItemById.get(item.id)?.itemTitle,
      ),
    );
    check(
      `${bundleId}:source_refs_preserved`,
      currentItems.every((item) => {
        const sourceItem = sourceItemById.get(item.id);
        return (
          item.sourceRefs.map((ref) => ref.sourceRowId).join('|') ===
          sourceItem.sourceRowIds.join('|')
        );
      }),
    );

    const literalItemComponents = literal.calendar.components.filter(
      (component) => component.xFlowmeKind === 'ITEM',
    );
    check(
      `${bundleId}:literal_item_component_count`,
      literalItemComponents.length === sourceFlat.items.length,
    );
    check(
      `${bundleId}:literal_flat_components`,
      literal.calendar.components.every(
        (component) => !Object.hasOwn(component, 'components'),
      ),
    );

    for (const variant of ['literal', 'canonical-compact', 'canonical-granular']) {
      validateIcs(`fixtures/ics/${variant}/${bundleId}.ics`);
    }
  }

  check('loss_record_count', loss.records.length === 9 * 3 * 5);
  check(
    'loss_values_controlled',
    loss.records.every((record) =>
      record.paths.every((entry) => loss.controlledValues.includes(entry.disposition)),
    ),
  );
  check(
    'canonical_roundtrips_pass',
    roundTrip.records.every(
      (record) =>
        record.currentCanonical.semanticEquality &&
        record.itemSharedContext.semanticEquality,
    ),
  );
  check(
    'literal_roundtrips_have_no_parser_error',
    roundTrip.records.every((record) => record.literalIcs.syntaxErrors.length === 0),
  );
  check(
    'literal_unique_source_rows_recovered',
    roundTrip.records.every(
      (record) =>
        record.literalIcs.uniqueSourceRowsRecoveredByLabParser ===
        record.literalIcs.uniqueSourceRowsExpected,
    ),
  );
  check('category_fit_nine', categoryFit.records.length === 9);
  check(
    'all_life_areas_covered',
    new Set(categoryFit.records.map((record) => record.lifeArea)).size === 9,
  );
  check(
    'score_weights_sum_100',
    Object.values(scorecard.weights).reduce((sum, value) => sum + value, 0) === 100,
  );
  check(
    'score_totals_match_dimensions',
    scorecard.records.every(
      (record) =>
        Object.values(record.dimensions).reduce((sum, value) => sum + value, 0) ===
        record.total,
    ),
  );
  check('shared_context_adoption_not_overclaimed', scorecard.adoptionGate.sharedContextAdoptionPassed === false);
  check('final_keeps_current_canonical', final.canonicalDecision === 'keep_current_canonical_v1');
  check('runtime_unchanged_claim', final.runtimeState === 'not_changed');
  check('publication_not_claimed', final.publicationState === 'not_published');
  check('observed_user_not_claimed', final.verifiedMetrics.observedUserValidation === 'not_run');
  check('external_client_not_claimed', final.verifiedMetrics.externalClientRoundTrip === 'not_run');

  for (const schemaFile of [
    'current-canonical-v1.schema.json',
    'literal-ics-graph-v1.schema.json',
    'item-shared-context-v1.schema.json',
  ]) {
    const schema = readJson(schemaFile);
    check(`${schemaFile}:is_json_schema`, schema.$schema?.includes('json-schema'));
    check(`${schemaFile}:has_id`, typeof schema.$id === 'string');
  }

  return {
    passed: errors.length === 0,
    checkCount: checks.length,
    passedCount: checks.filter((record) => record.passed).length,
    failedCount: errors.length,
    errors,
    checks,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateLab();
  fs.writeFileSync(
    path.join(SPEC_DIR, 'validation-results-v1.json'),
    `${JSON.stringify(result, null, 2)}\n`,
    'utf8',
  );
  console.log(
    JSON.stringify(
      {
        passed: result.passed,
        checks: result.checkCount,
        failed: result.failedCount,
        output: path.join(SPEC_DIR, 'validation-results-v1.json'),
      },
      null,
      2,
    ),
  );
  if (!result.passed) process.exitCode = 1;
}
