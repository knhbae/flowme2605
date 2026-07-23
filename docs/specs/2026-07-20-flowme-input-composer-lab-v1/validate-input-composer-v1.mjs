import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultDocumentPath = path.join(here, 'input-composer-scenarios-v1.json');
const defaultSchemaPath = path.join(here, 'input-composer-scenarios-v1.schema.json');
const defaultContractPath = path.join(here, 'input-composer-contract-v1.json');
const upstreamDir = path.resolve(here, '../2026-07-20-url-to-flow-output-quality-lab-v2');
const defaultRunPath = path.join(upstreamDir, 'runs/round-4/rules-adjudicated.json');
const defaultGoldPath = path.join(upstreamDir, 'gold-source-contract-v2.json');

export function validateInputComposer(document, options = {}) {
  const schema = options.schema ?? readJson(defaultSchemaPath);
  const contract = options.contract ?? readJson(defaultContractPath);
  const upstreamRun = options.upstreamRun ?? readJson(defaultRunPath);
  const gold = options.gold ?? readJson(defaultGoldPath);
  const errors = [];

  validateSchemaValue(document, schema, schema, '$', errors);
  if (!document || !Array.isArray(document.cases)) return errors;

  const upstreamById = new Map(upstreamRun.outputs.map((value) => [value.caseId, value]));
  const goldById = new Map(gold.cases.map((value) => [value.caseId, value]));
  const caseIds = new Set();
  const routes = new Set();

  for (const [index, scenario] of document.cases.entries()) {
    const casePath = `$.cases[${index}]`;
    if (caseIds.has(scenario.caseId)) add(errors, 'duplicate_case_id', `${casePath}.caseId`, scenario.caseId);
    caseIds.add(scenario.caseId);
    routes.add(scenario.inputRoute);
    validateInputPlan(scenario, casePath, errors);
    validateSourceFidelity(scenario, upstreamById.get(scenario.sourceCaseId), goldById.get(scenario.sourceCaseId), casePath, errors);
    validateIcs(scenario, casePath, errors);
    validateBlockedBoundary(scenario, casePath, errors);
  }

  if (routes.size !== 4) add(errors, 'route_coverage', '$.cases', `expected 4 routes, got ${routes.size}`);
  const metrics = recalculateMetrics(document.cases);
  for (const [key, value] of Object.entries(metrics)) {
    if (document.metrics?.[key] !== value) add(errors, 'metric_mismatch', `$.metrics.${key}`, `expected ${value}, got ${document.metrics?.[key]}`);
  }

  if (options.htmlText != null) validateVisibleHtml(options.htmlText, document, contract, errors);
  return errors;
}

export function validateVisibleHtml(html, document, contract, errors = []) {
  const visible = extractVisibleCopy(html);
  const lowered = visible.toLowerCase();
  for (const token of contract.visibleCopyPolicy.forbiddenRawTokens) {
    if (lowered.includes(token.toLowerCase())) add(errors, 'internal_enum_leak', '$html.visibleCopy', token);
  }
  const snake = visible.match(/\b[a-z]+_[a-z0-9_]+\b/g) ?? [];
  for (const token of [...new Set(snake)]) add(errors, 'internal_enum_leak', '$html.visibleCopy', token);
  for (const scenario of document.cases) {
    if (!html.includes(scenario.shortTitle)) add(errors, 'missing_case_in_html', '$html', scenario.shortTitle);
  }
  for (const label of ['한 줄 빠른 추가', '여러 줄 붙여넣기', 'URL로 만들기', '표·강의계획 가져오기']) {
    if (!html.includes(label)) add(errors, 'missing_input_route_in_html', '$html', label);
  }
  if (!visible.includes('자동·에이전트 점검') || !visible.includes('사용자 관찰은 아직')) {
    add(errors, 'claim_boundary_missing', '$html.visibleCopy', 'automatic QA must be separated from observed-user validation');
  }
  return errors;
}

function validateInputPlan(scenario, casePath, errors) {
  const inputs = scenario.inputJourney.inputs;
  const required = inputs.filter((value) => value.requiredBeforeFirstPreview).length;
  if (required !== scenario.inputJourney.requiredPayloadCount) {
    add(errors, 'required_input_count_mismatch', `${casePath}.inputJourney.requiredPayloadCount`, `declared ${scenario.inputJourney.requiredPayloadCount}, calculated ${required}`);
  }
  if (scenario.lane === 'general' && required > 2) add(errors, 'required_input_budget', `${casePath}.inputJourney.inputs`, required);

  const allowedSourceSemanticKeys = new Set(['source_rows', 'source_title', 'source_scope', 'source_schedule', 'source_fields', 'recurrence_rule']);
  const disclosedIds = new Set(scenario.inputJourney.progressiveDisclosure.flatMap((value) => value.inputIds));
  const inputIds = new Set(inputs.map((value) => value.inputId));
  const paths = new Map();
  const prefixByLayer = { creator_draft: '/creatorDraft/', user_overlay: '/userOverlay/', run_state: '/runState/' };

  for (const [inputIndex, input] of inputs.entries()) {
    const inputPath = `${casePath}.inputJourney.inputs[${inputIndex}]`;
    if (!input.consumerRefs?.length || !input.purpose || !input.writePath) add(errors, 'unnecessary_input', inputPath, input.inputId);
    if (input.origin === 'source_derived' && input.editable) add(errors, 'source_input_editable', inputPath, input.inputId);
    if (allowedSourceSemanticKeys.has(input.semanticKey)) add(errors, 'source_value_reentry', `${inputPath}.semanticKey`, input.semanticKey);
    const expectedPrefix = prefixByLayer[input.ownershipLayer];
    if (!expectedPrefix || !input.writePath.startsWith(expectedPrefix)) add(errors, 'owner_write_boundary', `${inputPath}.writePath`, input.writePath);
    const previous = paths.get(input.writePath);
    if (previous && previous !== input.ownershipLayer) add(errors, 'creator_user_collision', `${inputPath}.writePath`, input.writePath);
    paths.set(input.writePath, input.ownershipLayer);
    if (input.visibleStage !== 'initial' && !disclosedIds.has(input.inputId)) add(errors, 'hidden_input_without_disclosure', inputPath, input.inputId);
    if (input.requiredBeforeFirstPreview && ['after_preview', 'after_boundary', 'after_choice', 'after_progress_choice', 'after_route_visit'].includes(input.visibleStage)) {
      add(errors, 'hidden_required_input', inputPath, input.inputId);
    }
  }

  for (const [disclosureIndex, disclosure] of scenario.inputJourney.progressiveDisclosure.entries()) {
    for (const inputId of disclosure.inputIds) {
      if (!inputIds.has(inputId)) add(errors, 'unknown_disclosure_input', `${casePath}.inputJourney.progressiveDisclosure[${disclosureIndex}]`, inputId);
    }
  }
}

function validateSourceFidelity(scenario, upstream, gold, casePath, errors) {
  if (!upstream || !gold) {
    add(errors, 'missing_upstream_case', casePath, scenario.sourceCaseId);
    return;
  }
  const normalizedItems = new Map(scenario.canonical.items.map((value) => [value.itemId, value]));
  const intentMap = { act: 'action', decide: 'decision', record: 'record', use_resource: 'consume' };
  for (const item of upstream.canonicalDraft.items) {
    const actual = normalizedItems.get(item.itemId);
    if (!actual) {
      add(errors, 'semantic_loss', `${casePath}.canonical.items`, item.itemId);
      continue;
    }
    if (actual.title !== item.title) add(errors, 'invented_action', `${casePath}.canonical.items.${item.itemId}.title`, actual.title);
    if (actual.intent !== intentMap[item.intent]) add(errors, 'semantic_loss', `${casePath}.canonical.items.${item.itemId}.intent`, actual.intent);
    if (actual.completion.doneWhen !== item.completion.doneWhen) add(errors, 'semantic_loss', `${casePath}.canonical.items.${item.itemId}.completion`, actual.completion.doneWhen);
    const actualRefs = actual.sourceRefs.map((value) => value.sourceRowId).sort();
    if (!sameArray(actualRefs, [...item.sourceRowIds].sort())) add(errors, 'semantic_loss', `${casePath}.canonical.items.${item.itemId}.sourceRefs`, actualRefs.join(','));
  }
  for (const actual of scenario.canonical.items) {
    if (!upstream.canonicalDraft.items.some((item) => item.itemId === actual.itemId)) add(errors, 'invented_action', `${casePath}.canonical.items`, actual.itemId);
  }
  if (!sameArray([...scenario.canonical.upstreamEntityIds].sort(), [...scenario.canonical.retainedEntityIds].sort())) {
    add(errors, 'semantic_loss', `${casePath}.canonical.retainedEntityIds`, 'entity ids differ');
  }
  const defaultArtifact = scenario.defaultArtifact;
  if (defaultArtifact) {
    const expected = [...gold.essentialProjectionFields[defaultArtifact]].sort();
    const retained = [...scenario.projections[defaultArtifact].essentialRetained].sort();
    if (!sameArray(expected, retained)) add(errors, 'projection_semantic_loss', `${casePath}.projections.${defaultArtifact}`, `${retained.join(',')} != ${expected.join(',')}`);
  }
  if (scenario.qa.meaningRetentionRate !== 1) add(errors, 'semantic_loss', `${casePath}.qa.meaningRetentionRate`, scenario.qa.meaningRetentionRate);
}

function validateIcs(scenario, casePath, errors) {
  const scheduled = scenario.canonical.items.filter((item) => item.schedule?.exampleResolvedDate);
  const ics = scenario.projections.ics;
  if (scheduled.length === 0) {
    if (ics.eventCount !== 0 || ics.actionVisible || ics.preview !== null) add(errors, 'unscheduled_ics', `${casePath}.projections.ics`, `events=${ics.eventCount}`);
  } else {
    if (ics.eventCount !== scheduled.length || !ics.actionVisible || !ics.preview) add(errors, 'scheduled_ics_mismatch', `${casePath}.projections.ics`, `events=${ics.eventCount}, scheduled=${scheduled.length}`);
    const events = ics.preview?.events ?? [];
    if (events.length !== scheduled.length) add(errors, 'scheduled_ics_mismatch', `${casePath}.projections.ics.preview.events`, events.length);
  }
}

function validateBlockedBoundary(scenario, casePath, errors) {
  if (scenario.firstPreviewKind !== 'boundary') return;
  for (const target of ['calendar', 'checklist', 'todo', 'sheet', 'memo']) {
    if (scenario.projections[target].preview !== null) add(errors, 'blocked_fake_artifact', `${casePath}.projections.${target}.preview`, target);
  }
  if (scenario.projections.ics.preview !== null || scenario.projections.ics.actionVisible) add(errors, 'blocked_fake_artifact', `${casePath}.projections.ics`, 'ics');
}

function recalculateMetrics(cases) {
  const general = cases.filter((value) => value.lane === 'general');
  const sum = (selector) => cases.reduce((total, value) => total + selector(value), 0);
  return {
    caseCount: cases.length,
    generalCaseCount: general.length,
    boundaryCaseCount: cases.length - general.length,
    routeCoverage: new Set(cases.map((value) => value.inputRoute)).size,
    generalRequiredPayloadMax: Math.max(...general.map((value) => value.inputJourney.inputs.filter((input) => input.requiredBeforeFirstPreview).length)),
    unnecessaryInputCount: sum((value) => value.inputJourney.inputs.filter((input) => !input.consumerRefs?.length || !input.writePath || !input.purpose).length),
    sourceValueReentryCount: sum((value) => value.inputJourney.sourceValueReentryCount),
    meaningRetentionRate: sum((value) => value.qa.meaningRetentionRate) / cases.length,
    unscheduledIcsViolationCount: sum((value) => value.qa.unscheduledIcsViolationCount),
    inventedActionCount: sum((value) => value.qa.inventedActionCount),
    creatorUserPathCollisionCount: sum((value) => value.qa.creatorUserPathCollisionCount),
    blockedFakeArtifactCount: sum((value) => value.qa.fakeArtifactWhileBlockedCount),
    internalVisibleTokenLeakCount: 0,
    observedUserValidationCompleted: false
  };
}

function extractVisibleCopy(html) {
  const userFacingAttributes = [...html.matchAll(/\b(?:aria-label|title|placeholder|alt)=(?:"([^"]*)"|'([^']*)')/gi)].map((match) => match[1] ?? match[2] ?? '').join(' ');
  const withoutData = html
    .replace(/<script\b[^>]*type=(?:"application\/json"|'application\/json')[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(`${withoutData} ${userFacingAttributes}`).replace(/\s+/g, ' ').trim();
}

function decodeEntities(value) {
  return value.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&nbsp;', ' ');
}

function validateSchemaValue(value, schema, rootSchema, currentPath, errors) {
  if (!schema || Object.keys(schema).length === 0) return;
  if (schema.$ref) {
    const target = resolveRef(rootSchema, schema.$ref);
    validateSchemaValue(value, target, rootSchema, currentPath, errors);
    return;
  }
  if (schema.anyOf) {
    const matches = schema.anyOf.some((candidate) => {
      const local = [];
      validateSchemaValue(value, candidate, rootSchema, currentPath, local);
      return local.length === 0;
    });
    if (!matches) add(errors, 'schema_any_of', currentPath, typeof value);
    return;
  }
  if (Object.hasOwn(schema, 'const') && !deepEqual(value, schema.const)) add(errors, 'schema_const', currentPath, `expected ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some((candidate) => deepEqual(candidate, value))) add(errors, 'schema_enum', currentPath, JSON.stringify(value));
  if (schema.type && !matchesType(value, schema.type)) {
    add(errors, 'schema_type', currentPath, `expected ${JSON.stringify(schema.type)}, got ${typeOf(value)}`);
    return;
  }
  if (typeof value === 'string') {
    if (schema.minLength != null && value.length < schema.minLength) add(errors, 'schema_min_length', currentPath, value.length);
    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) add(errors, 'schema_pattern', currentPath, value);
  }
  if (typeof value === 'number') {
    if (schema.minimum != null && value < schema.minimum) add(errors, 'schema_minimum', currentPath, value);
    if (schema.maximum != null && value > schema.maximum) add(errors, 'schema_maximum', currentPath, value);
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) add(errors, 'schema_min_items', currentPath, value.length);
    if (schema.maxItems != null && value.length > schema.maxItems) add(errors, 'schema_max_items', currentPath, value.length);
    if (schema.items) value.forEach((item, index) => validateSchemaValue(item, schema.items, rootSchema, `${currentPath}[${index}]`, errors));
  }
  if (typeOf(value) === 'object') {
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) add(errors, 'schema_required', `${currentPath}.${key}`, 'missing');
    }
    const properties = schema.properties ?? {};
    for (const [key, child] of Object.entries(value)) {
      if (properties[key]) validateSchemaValue(child, properties[key], rootSchema, `${currentPath}.${key}`, errors);
      else if (schema.additionalProperties === false) add(errors, 'schema_additional_property', `${currentPath}.${key}`, key);
    }
  }
}

function resolveRef(root, ref) {
  if (!ref.startsWith('#/')) throw new Error(`Only local refs are supported: ${ref}`);
  return ref.slice(2).split('/').reduce((value, part) => value[part.replaceAll('~1', '/').replaceAll('~0', '~')], root);
}

function matchesType(value, type) {
  const types = Array.isArray(type) ? type : [type];
  return types.some((candidate) => candidate === typeOf(value) || (candidate === 'integer' && Number.isInteger(value)) || (candidate === 'number' && typeof value === 'number'));
}

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value === 'object' ? 'object' : typeof value;
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function add(errors, code, errorPath, message) {
  errors.push({ code, path: errorPath, message: String(message) });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function cliArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const documentPath = path.resolve(cliArg('--json') ?? defaultDocumentPath);
  const htmlPath = cliArg('--html');
  const document = readJson(documentPath);
  const errors = validateInputComposer(document, { htmlText: htmlPath ? fs.readFileSync(path.resolve(htmlPath), 'utf8') : undefined });
  if (errors.length) {
    console.error(`FAIL ${errors.length} validation error(s)`);
    for (const error of errors.slice(0, 40)) console.error(`${error.code}\t${error.path}\t${error.message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS schema + invariants: ${document.cases.length} cases`);
    console.log(`PASS required payload max: ${document.metrics.generalRequiredPayloadMax}`);
    console.log(`PASS meaning retention: ${document.metrics.meaningRetentionRate * 100}%`);
    console.log(`PASS unscheduled ICS: ${document.metrics.unscheduledIcsViolationCount} violation(s)`);
    console.log(`PASS invented action: ${document.metrics.inventedActionCount}`);
    if (htmlPath) console.log('PASS visible copy: internal tokens hidden');
  }
}
