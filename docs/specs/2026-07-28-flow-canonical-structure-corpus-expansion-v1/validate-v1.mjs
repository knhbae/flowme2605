import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPORT = path.resolve(HERE, '../../content-audit/2026-07-28-flow-canonical-structure-corpus-expansion-review-ko.html');

const REQUIRED_FILES = [
  'input-lineage-v1.json',
  'candidate-master-ledger-v1.json',
  'structural-coverage-contract-v1.json',
  'canonical-corpus-v1.json',
  'canonical-corpus.schema.json',
  'source-row-item-mapping-v1.json',
  'conversion-rules-v1.md',
  'conversion-decision-tree-v1.json',
  'schedule-and-occurrence-contract-v1.json',
  'projection-contract-v1.json',
  'runtime-crosswalk-v1.json',
  'structural-saturation-log-v1.json',
  'planning-decision-register-v1.json',
  'representative-backend-dto-v1.json',
  'planning-handoff-ko.md',
  'report-storyboard-v1.json',
];

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(HERE, name), 'utf8'));
}

function add(checks, id, passed, detail, fixtureId = null) {
  checks.push({ id, passed: Boolean(passed), detail, ...(fixtureId ? { fixtureId } : {}) });
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function objectKeys(value, out = []) {
  if (Array.isArray(value)) {
    for (const entry of value) objectKeys(entry, out);
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  for (const [key, child] of Object.entries(value)) {
    out.push(key);
    objectKeys(child, out);
  }
  return out;
}

function entityIndex(content) {
  return {
    flow: new Set(content.flows.map((entry) => entry.flowId)),
    step: new Set(content.steps.map((entry) => entry.stepId)),
    item: new Set(content.items.map((entry) => entry.itemId)),
    field: new Set(content.fields.map((entry) => entry.fieldId)),
    memo: new Set(content.memos.map((entry) => entry.memoId)),
  };
}

const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/;
const EXACT_ROW_RELATION_TYPES = new Set(['one_to_one', 'many_to_one', 'one_to_many', 'many_to_many', 'omitted']);
const PROJECTION_COLLECTION_KEY = {
  calendar: 'entries',
  checklist: 'entries',
  todo: 'entries',
  sheet: 'rows',
  memo: 'blocks',
};

function sha256Json(value) {
  return `sha256:${crypto.createHash('sha256').update(Buffer.from(JSON.stringify(value))).digest('hex')}`;
}

function projectionCollection(projectionEvaluation, artifact) {
  const projection = projectionEvaluation?.[artifact];
  const collectionKey = PROJECTION_COLLECTION_KEY[artifact];
  return {
    projection,
    collection: collectionKey && Array.isArray(projection?.[collectionKey]) ? projection[collectionKey] : [],
  };
}

function usableSelectedProjectionArtifacts(projectionEvaluation) {
  return Object.keys(PROJECTION_COLLECTION_KEY).filter((artifact) => {
    const { projection, collection } = projectionCollection(projectionEvaluation, artifact);
    return projection?.selected === true && collection.length > 0;
  });
}

function expectedRowRelationType(entry, rowAccounting) {
  const targets = [...new Set(entry.targets || [])];
  if (entry.targetType === 'omitted' || targets.length === 0) return 'omitted';
  const targetUseCount = new Map();
  for (const candidate of rowAccounting) {
    for (const target of new Set(candidate.targets || [])) {
      const key = `${candidate.targetType}:${target}`;
      targetUseCount.set(key, (targetUseCount.get(key) || 0) + 1);
    }
  }
  const sharedTarget = targets.some(
    (target) => (targetUseCount.get(`${entry.targetType}:${target}`) || 0) > 1,
  );
  if (targets.length > 1) return sharedTarget ? 'many_to_many' : 'one_to_many';
  return sharedTarget ? 'many_to_one' : 'one_to_one';
}

function expectedSnapshotContentHash(snapshot, sourceRows) {
  const rows = sourceRows
    .filter((row) => row.sourceId === snapshot.sourceId)
    .map((row, rowIndex) => ({
      rowType: row.rowType,
      title: row.title || row.label || '',
      detail: row.detail,
      locator: row.locator,
      order: Number.isFinite(row.order) ? row.order : rowIndex,
    }))
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title, 'ko'));
  return {
    rowCount: rows.length,
    contentHash: sha256Json({
      sourceId: snapshot.sourceId,
      finalUrl: snapshot.finalUrl,
      fetchedAt: snapshot.fetchedAt,
      rows,
    }),
  };
}

function schemaValueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  if (typeof value === 'number') return 'number';
  return typeof value;
}

function matchesSchemaType(value, expectedType) {
  switch (expectedType) {
    case 'null':
      return value === null;
    case 'array':
      return Array.isArray(value);
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'string':
    case 'boolean':
      return typeof value === expectedType;
    default:
      return false;
  }
}

function stableSchemaValue(value) {
  if (Array.isArray(value)) return value.map(stableSchemaValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableSchemaValue(value[key])]),
  );
}

function schemaValuesEqual(left, right) {
  return JSON.stringify(stableSchemaValue(left)) === JSON.stringify(stableSchemaValue(right));
}

function escapeInstancePathToken(token) {
  return String(token).replaceAll('~', '~0').replaceAll('/', '~1');
}

function resolveLocalSchemaRef(rootSchema, ref) {
  if (ref === '#') return rootSchema;
  if (!ref.startsWith('#/')) return null;
  let current = rootSchema;
  for (const rawToken of ref.slice(2).split('/')) {
    let decodedToken;
    try {
      decodedToken = decodeURIComponent(rawToken);
    } catch {
      return null;
    }
    const token = decodedToken.replaceAll('~1', '/').replaceAll('~0', '~');
    if (!current || typeof current !== 'object' || !(token in current)) return null;
    current = current[token];
  }
  return current;
}

/**
 * Validate JSON data against the dependency-free subset of JSON Schema used by
 * this corpus contract. The result is intentionally diagnostic rather than
 * throwing so the artifact validator can preserve every failure in one run.
 */
export function validateJsonSchema(instance, schema, { maxErrors = 500 } = {}) {
  const errors = [];
  const rootSchema = schema;

  function pushError(instancePath, schemaPath, keyword, message, actual) {
    if (errors.length >= maxErrors) return;
    errors.push({
      instancePath,
      schemaPath,
      keyword,
      message,
      ...(actual === undefined ? {} : { actual }),
    });
  }

  function branchErrors(value, branchSchema, instancePath, schemaPath, activeRefs) {
    const start = errors.length;
    walk(value, branchSchema, instancePath, schemaPath, new Set(activeRefs));
    const collected = errors.splice(start);
    return collected;
  }

  function walk(value, currentSchema, instancePath, schemaPath, activeRefs) {
    if (errors.length >= maxErrors) return;
    if (currentSchema === true) return;
    if (currentSchema === false) {
      pushError(instancePath, schemaPath, 'falseSchema', 'value is rejected by the schema');
      return;
    }
    if (!currentSchema || typeof currentSchema !== 'object' || Array.isArray(currentSchema)) {
      pushError(instancePath, schemaPath, 'schema', 'schema node must be an object or boolean');
      return;
    }

    if (currentSchema.$ref !== undefined) {
      const ref = currentSchema.$ref;
      if (typeof ref !== 'string') {
        pushError(instancePath, `${schemaPath}/$ref`, '$ref', '$ref must be a string', ref);
      } else {
        const resolved = resolveLocalSchemaRef(rootSchema, ref);
        if (resolved === null) {
          pushError(instancePath, `${schemaPath}/$ref`, '$ref', `unresolved or unsupported reference: ${ref}`);
        } else {
          const activeKey = `${ref}\u0000${instancePath}`;
          if (!activeRefs.has(activeKey)) {
            const nextActiveRefs = new Set(activeRefs);
            nextActiveRefs.add(activeKey);
            walk(value, resolved, instancePath, ref, nextActiveRefs);
          }
        }
      }
    }

    if (Array.isArray(currentSchema.allOf)) {
      currentSchema.allOf.forEach((branch, index) => {
        walk(value, branch, instancePath, `${schemaPath}/allOf/${index}`, new Set(activeRefs));
      });
    }

    if (Array.isArray(currentSchema.anyOf)) {
      const results = currentSchema.anyOf.map((branch, index) =>
        branchErrors(value, branch, instancePath, `${schemaPath}/anyOf/${index}`, activeRefs),
      );
      if (!results.some((branch) => branch.length === 0)) {
        pushError(
          instancePath,
          `${schemaPath}/anyOf`,
          'anyOf',
          `value must match at least one branch; branch error counts: ${results.map((branch) => branch.length).join(', ')}`,
        );
      }
    }

    if (Array.isArray(currentSchema.oneOf)) {
      const results = currentSchema.oneOf.map((branch, index) =>
        branchErrors(value, branch, instancePath, `${schemaPath}/oneOf/${index}`, activeRefs),
      );
      const matched = results.filter((branch) => branch.length === 0).length;
      if (matched !== 1) {
        pushError(
          instancePath,
          `${schemaPath}/oneOf`,
          'oneOf',
          `value must match exactly one branch; matched ${matched}`,
          matched,
        );
      }
    }

    if (currentSchema.not !== undefined) {
      const rejected = branchErrors(value, currentSchema.not, instancePath, `${schemaPath}/not`, activeRefs);
      if (rejected.length === 0) {
        pushError(instancePath, `${schemaPath}/not`, 'not', 'value must not match the nested schema');
      }
    }

    if (currentSchema.const !== undefined && !schemaValuesEqual(value, currentSchema.const)) {
      pushError(instancePath, `${schemaPath}/const`, 'const', 'value must equal the schema constant', value);
    }
    if (
      Array.isArray(currentSchema.enum) &&
      !currentSchema.enum.some((candidate) => schemaValuesEqual(value, candidate))
    ) {
      pushError(
        instancePath,
        `${schemaPath}/enum`,
        'enum',
        `value must be one of ${currentSchema.enum.map((candidate) => JSON.stringify(candidate)).join(', ')}`,
        value,
      );
    }

    if (currentSchema.type !== undefined) {
      const expectedTypes = Array.isArray(currentSchema.type) ? currentSchema.type : [currentSchema.type];
      if (!expectedTypes.some((expectedType) => matchesSchemaType(value, expectedType))) {
        pushError(
          instancePath,
          `${schemaPath}/type`,
          'type',
          `expected ${expectedTypes.join(' or ')}, received ${schemaValueType(value)}`,
          schemaValueType(value),
        );
        return;
      }
    }

    if (typeof value === 'string') {
      if (Number.isInteger(currentSchema.minLength) && value.length < currentSchema.minLength) {
        pushError(
          instancePath,
          `${schemaPath}/minLength`,
          'minLength',
          `string length ${value.length} is less than ${currentSchema.minLength}`,
          value.length,
        );
      }
      if (Number.isInteger(currentSchema.maxLength) && value.length > currentSchema.maxLength) {
        pushError(
          instancePath,
          `${schemaPath}/maxLength`,
          'maxLength',
          `string length ${value.length} exceeds ${currentSchema.maxLength}`,
          value.length,
        );
      }
      if (typeof currentSchema.pattern === 'string') {
        let expression;
        try {
          expression = new RegExp(currentSchema.pattern, 'u');
        } catch (error) {
          pushError(
            instancePath,
            `${schemaPath}/pattern`,
            'pattern',
            `invalid schema pattern: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
        if (expression && !expression.test(value)) {
          pushError(
            instancePath,
            `${schemaPath}/pattern`,
            'pattern',
            `string must match /${currentSchema.pattern}/`,
            value,
          );
        }
      }
    }

    if (typeof value === 'number') {
      if (typeof currentSchema.minimum === 'number' && value < currentSchema.minimum) {
        pushError(
          instancePath,
          `${schemaPath}/minimum`,
          'minimum',
          `number ${value} is less than ${currentSchema.minimum}`,
          value,
        );
      }
      if (typeof currentSchema.maximum === 'number' && value > currentSchema.maximum) {
        pushError(
          instancePath,
          `${schemaPath}/maximum`,
          'maximum',
          `number ${value} exceeds ${currentSchema.maximum}`,
          value,
        );
      }
    }

    if (Array.isArray(value)) {
      if (Number.isInteger(currentSchema.minItems) && value.length < currentSchema.minItems) {
        pushError(
          instancePath,
          `${schemaPath}/minItems`,
          'minItems',
          `array length ${value.length} is less than ${currentSchema.minItems}`,
          value.length,
        );
      }
      if (Number.isInteger(currentSchema.maxItems) && value.length > currentSchema.maxItems) {
        pushError(
          instancePath,
          `${schemaPath}/maxItems`,
          'maxItems',
          `array length ${value.length} exceeds ${currentSchema.maxItems}`,
          value.length,
        );
      }
      if (currentSchema.uniqueItems === true) {
        const seen = new Set();
        value.forEach((entry, index) => {
          const key = JSON.stringify(stableSchemaValue(entry));
          if (seen.has(key)) {
            pushError(
              `${instancePath}/${index}`,
              `${schemaPath}/uniqueItems`,
              'uniqueItems',
              'array item duplicates an earlier item',
              entry,
            );
          }
          seen.add(key);
        });
      }
      if (Array.isArray(currentSchema.items)) {
        currentSchema.items.forEach((itemSchema, index) => {
          if (index < value.length) {
            walk(value[index], itemSchema, `${instancePath}/${index}`, `${schemaPath}/items/${index}`, new Set(activeRefs));
          }
        });
      } else if (currentSchema.items !== undefined) {
        value.forEach((entry, index) => {
          walk(entry, currentSchema.items, `${instancePath}/${index}`, `${schemaPath}/items`, new Set(activeRefs));
        });
      }
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const properties =
        currentSchema.properties && typeof currentSchema.properties === 'object' && !Array.isArray(currentSchema.properties)
          ? currentSchema.properties
          : {};
      if (Array.isArray(currentSchema.required)) {
        for (const key of currentSchema.required) {
          if (!Object.prototype.hasOwnProperty.call(value, key)) {
            pushError(
              instancePath,
              `${schemaPath}/required`,
              'required',
              `missing required property: ${key}`,
              key,
            );
          }
        }
      }
      for (const [key, propertySchema] of Object.entries(properties)) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
        walk(
          value[key],
          propertySchema,
          `${instancePath}/${escapeInstancePathToken(key)}`,
          `${schemaPath}/properties/${escapeInstancePathToken(key)}`,
          new Set(activeRefs),
        );
      }
      const additionalKeys = Object.keys(value).filter((key) => !Object.prototype.hasOwnProperty.call(properties, key));
      if (currentSchema.additionalProperties === false) {
        for (const key of additionalKeys) {
          pushError(
            `${instancePath}/${escapeInstancePathToken(key)}`,
            `${schemaPath}/additionalProperties`,
            'additionalProperties',
            `unexpected property: ${key}`,
            key,
          );
        }
      } else if (
        currentSchema.additionalProperties &&
        typeof currentSchema.additionalProperties === 'object'
      ) {
        for (const key of additionalKeys) {
          walk(
            value[key],
            currentSchema.additionalProperties,
            `${instancePath}/${escapeInstancePathToken(key)}`,
            `${schemaPath}/additionalProperties`,
            new Set(activeRefs),
          );
        }
      }
    }
  }

  walk(instance, schema, '$', '#', new Set());
  return { valid: errors.length === 0, errors };
}

export function validateCorpus(corpus, options = {}) {
  const checks = [];
  const controlled = corpus.controlledEnums;
  add(checks, 'schema-version', corpus.schemaVersion === 'flowme-canonical-structure-corpus-v1', corpus.schemaVersion);
  add(checks, 'fixture-minimum', corpus.fixtures.length >= 40, `${corpus.fixtures.length} complete fixtures`);
  add(checks, 'boundary-maximum', corpus.boundaryControls.length <= 5, `${corpus.boundaryControls.length} boundary controls`);
  add(
    checks,
    'baseline-eight',
    corpus.fixtures.filter((fixture) => fixture.batch === 'qualified_v2_baseline').length === 8,
    `${corpus.fixtures.filter((fixture) => fixture.batch === 'qualified_v2_baseline').length} baseline fixtures`,
  );
  add(
    checks,
    'unique-fixture-ids',
    duplicateValues(corpus.fixtures.map((fixture) => fixture.fixtureId)).length === 0,
    duplicateValues(corpus.fixtures.map((fixture) => fixture.fixtureId)).join(', ') || 'unique',
  );
  add(
    checks,
    'unique-canonical-urls',
    duplicateValues(corpus.fixtures.map((fixture) => fixture.source.canonicalUrl)).length === 0,
    duplicateValues(corpus.fixtures.map((fixture) => fixture.source.canonicalUrl)).join(', ') || 'unique',
  );
  add(
    checks,
    'global-source-row-ids',
    duplicateValues(
      corpus.fixtures.flatMap((fixture) => fixture.canonicalContent.sourceRows.map((row) => row.sourceRowId)),
    ).length === 0,
    'SourceRow IDs are unique across fixtures',
  );
  add(
    checks,
    'global-item-ids',
    duplicateValues(
      corpus.fixtures.flatMap((fixture) => fixture.canonicalContent.items.map((item) => item.itemId)),
    ).length === 0,
    'Item IDs are unique across fixtures',
  );

  for (const fixture of corpus.fixtures) {
    const content = fixture.canonicalContent;
    const ids = entityIndex(content);
    const sourceRowIds = new Set(content.sourceRows.map((row) => row.sourceRowId));
    const sourceRefIds = new Set(content.sourceRefs.map((ref) => ref.sourceRefId));
    const globalIds = [
      ...ids.flow,
      ...ids.step,
      ...ids.item,
      ...ids.field,
      ...ids.memo,
      ...sourceRowIds,
      ...sourceRefIds,
    ];
    add(
      checks,
      `ids-unique:${fixture.fixtureId}`,
      duplicateValues(globalIds).length === 0,
      duplicateValues(globalIds).join(', ') || 'all entity IDs unique',
      fixture.fixtureId,
    );
    add(
      checks,
      `taxonomy:${fixture.fixtureId}`,
      controlled.lifeAreas.includes(fixture.taxonomy.primaryLifeArea) &&
        fixture.taxonomy.secondaryLifeAreas.every((value) => controlled.lifeAreas.includes(value)) &&
        controlled.sourceShapes.includes(fixture.taxonomy.sourceShape) &&
        fixture.taxonomy.secondarySourceShapes.every((value) => controlled.sourceShapes.includes(value)) &&
        controlled.executionPatterns.includes(fixture.taxonomy.primaryExecutionPattern) &&
        fixture.taxonomy.secondaryExecutionPatterns.every((value) => controlled.executionPatterns.includes(value)) &&
        controlled.artifacts.includes(fixture.taxonomy.primaryArtifact) &&
        fixture.taxonomy.secondaryArtifacts.every((value) => controlled.artifacts.includes(value)),
      `${fixture.taxonomy.primaryLifeArea} / ${fixture.taxonomy.sourceShape} / ${fixture.taxonomy.primaryExecutionPattern} / ${fixture.taxonomy.primaryArtifact}`,
      fixture.fixtureId,
    );
    add(
      checks,
      `canonical-no-legacy-keys:${fixture.fixtureId}`,
      !objectKeys({ taxonomy: fixture.taxonomy, canonicalContent: fixture.canonicalContent }).some((key) =>
        ['category', 'structure_type', 'primary_destination'].includes(key),
      ),
      'legacy runtime keys do not enter the canonical area',
      fixture.fixtureId,
    );
    add(
      checks,
      `no-hybrid:${fixture.fixtureId}`,
      fixture.taxonomy.primaryArtifact !== 'hybrid' && !fixture.taxonomy.secondaryArtifacts.includes('hybrid'),
      `${fixture.taxonomy.primaryArtifact} + ${fixture.taxonomy.secondaryArtifacts.join(', ')}`,
      fixture.fixtureId,
    );
    add(
      checks,
      `primary-secondary-disjoint:${fixture.fixtureId}`,
      !fixture.taxonomy.secondaryLifeAreas.includes(fixture.taxonomy.primaryLifeArea) &&
        !fixture.taxonomy.secondarySourceShapes.includes(fixture.taxonomy.sourceShape) &&
        !fixture.taxonomy.secondaryExecutionPatterns.includes(fixture.taxonomy.primaryExecutionPattern) &&
        !fixture.taxonomy.secondaryArtifacts.includes(fixture.taxonomy.primaryArtifact),
      'primary values do not repeat in secondary arrays',
      fixture.fixtureId,
    );
    add(
      checks,
      `bundle-flow-refs:${fixture.fixtureId}`,
      content.bundle.flowIds.every((id) => ids.flow.has(id)) &&
        content.flows.every((flow) => flow.bundleId === content.bundle.bundleId),
      `${content.bundle.flowIds.length} bundle flow refs`,
      fixture.fixtureId,
    );
    add(
      checks,
      `flow-step-refs:${fixture.fixtureId}`,
      content.flows.every((flow) => flow.stepIds.every((id) => ids.step.has(id))) &&
        content.steps.every((step) => ids.flow.has(step.flowId)),
      `${content.steps.length} steps`,
      fixture.fixtureId,
    );
    add(
      checks,
      `step-item-refs:${fixture.fixtureId}`,
      content.steps.every((step) => step.itemIds.every((id) => ids.item.has(id))) &&
        content.items.every((item) => ids.step.has(item.stepId)),
      `${content.items.length} items`,
      fixture.fixtureId,
    );
    add(
      checks,
      `source-ref-integrity:${fixture.fixtureId}`,
      content.sourceRefs.every(
        (ref) =>
          ids[ref.entityType]?.has(ref.entityId) &&
          ref.sourceRowIds.length > 0 &&
          ref.sourceRowIds.every((id) => sourceRowIds.has(id)),
      ),
      `${content.sourceRefs.length} source refs`,
      fixture.fixtureId,
    );
    const sourceIds = new Set(content.sources.map((source) => source.sourceId));
    const snapshotsById = new Map(content.sourceSnapshots.map((snapshot) => [snapshot.snapshotId, snapshot]));
    const primarySnapshot = snapshotsById.get(fixture.source.snapshotId);
    add(
      checks,
      `snapshot-content-integrity:${fixture.fixtureId}`,
      duplicateValues(content.sourceSnapshots.map((snapshot) => snapshot.snapshotId)).length === 0 &&
        duplicateValues(content.sourceSnapshots.map((snapshot) => snapshot.sourceId)).length === 0 &&
        content.sourceSnapshots.length === content.sources.length &&
        content.sources.every((candidate) =>
          content.sourceSnapshots.some((snapshot) => snapshot.sourceId === candidate.sourceId),
        ) &&
        content.sourceSnapshots.every((snapshot) => {
          const expected = expectedSnapshotContentHash(snapshot, content.sourceRows);
          return (
            sourceIds.has(snapshot.sourceId) &&
            SHA256_PATTERN.test(snapshot.contentHash) &&
            snapshot.hashBasis === 'canonical_url_observed_at_and_captured_source_rows' &&
            snapshot.capturedSourceRowCount === expected.rowCount &&
            snapshot.contentHash === expected.contentHash
          );
        }) &&
        content.sourceRows.every((row) => {
          const rowSnapshot = snapshotsById.get(row.snapshotId);
          return Boolean(rowSnapshot) && rowSnapshot.sourceId === row.sourceId;
        }) &&
        Boolean(primarySnapshot) &&
        fixture.source.sourceId === primarySnapshot.sourceId &&
        fixture.source.snapshotContentHash === primarySnapshot.contentHash &&
        fixture.source.canonicalUrl === primarySnapshot.finalUrl,
      `${content.sourceSnapshots.length} snapshots recomputed from captured SourceRows`,
      fixture.fixtureId,
    );
    add(
      checks,
      `item-provenance:${fixture.fixtureId}`,
      content.items.every(
        (item) =>
          item.sourceRefIds.length > 0 &&
          item.sourceRefIds.every((id) => sourceRefIds.has(id)) &&
          Array.isArray(item.sourceTrace) &&
          item.sourceTrace.length > 0 &&
          item.sourceTrace.every(
            (trace) =>
              sourceRefIds.has(trace.sourceRefId) &&
              trace.sourceRowIds.length > 0 &&
              trace.sourceRowIds.every((id) => sourceRowIds.has(id)),
          ),
      ),
      `${content.items.length} source-backed items`,
      fixture.fixtureId,
    );
    const provenanceClaims = fixture.conversionAudit.itemProvenanceClaims;
    add(
      checks,
      `property-provenance:${fixture.fixtureId}`,
      provenanceClaims.length === content.items.length &&
        duplicateValues(provenanceClaims.map((claim) => claim.itemId)).length === 0 &&
        provenanceClaims.every((claim) => {
          const item = content.items.find((candidate) => candidate.itemId === claim.itemId);
          if (!item) return false;
          const requiredRows = [
            ...claim.actionRefIds,
            ...claim.detailRefIds,
            ...claim.completionRefIds,
            ...(item.schedule ? claim.scheduleRefIds : []),
            ...(item.schedule?.recurrence ? claim.recurrenceRefIds : []),
          ];
          return (
            claim.actionRefIds.length > 0 &&
            claim.completionRefIds.length > 0 &&
            (!item.schedule || claim.scheduleRefIds.length > 0) &&
            (!item.schedule?.recurrence || claim.recurrenceRefIds.length > 0) &&
            requiredRows.every((id) => sourceRowIds.has(id))
          );
        }),
      `${provenanceClaims.length}/${content.items.length} property provenance claims`,
      fixture.fixtureId,
    );
    add(
      checks,
      `item-related-refs:${fixture.fixtureId}`,
      content.items.every(
        (item) =>
          item.fieldIds.every((id) => ids.field.has(id)) &&
          item.memoIds.every((id) => ids.memo.has(id)) &&
          item.cautionMemoIds.every((id) => ids.memo.has(id)) &&
          item.conditionMemoIds.every((id) => ids.memo.has(id)) &&
          item.dependsOnItemIds.every((id) => id !== item.itemId && ids.item.has(id)),
      ),
      'Field, Memo, condition, and dependency references resolve',
      fixture.fixtureId,
    );
    add(
      checks,
      `dependency-provenance:${fixture.fixtureId}`,
      content.items.every(
        (item) =>
          item.dependsOnItemIds.length === 0 ||
          (Array.isArray(item.dependencySourceRefIds) &&
            item.dependencySourceRefIds.length > 0 &&
            item.dependencySourceRefIds.every(
              (id) => sourceRefIds.has(id) && item.sourceRefIds.includes(id),
            )),
      ),
      `${content.items.filter((item) => item.dependsOnItemIds.length > 0).length} dependent Items have source-backed dependency provenance`,
      fixture.fixtureId,
    );
    add(
      checks,
      `field-memo-integrity:${fixture.fixtureId}`,
      content.fields.every(
        (field) =>
          ids[field.owner.type]?.has(field.owner.id) &&
          (field.valueSource !== 'source' ||
            (field.sourceRefIds?.length > 0 && field.sourceRefIds.every((id) => sourceRefIds.has(id)))),
      ) &&
        content.memos.every(
          (memo) =>
            ids[memo.scope.type]?.has(memo.scope.id) &&
            memo.sourceRefIds?.length > 0 &&
            memo.sourceRefIds.every((id) => sourceRefIds.has(id)),
        ),
      `${content.fields.length} Fields / ${content.memos.length} Memos`,
      fixture.fixtureId,
    );
    const accounting = fixture.conversionAudit.rowAccounting;
    add(
      checks,
      `row-accounting:${fixture.fixtureId}`,
      accounting.length === sourceRowIds.size &&
        duplicateValues(accounting.map((entry) => entry.sourceRowId)).length === 0 &&
        accounting.every((entry) => sourceRowIds.has(entry.sourceRowId) && entry.reason),
      `${accounting.length}/${sourceRowIds.size} rows accounted`,
      fixture.fixtureId,
    );
    add(
      checks,
      `row-relation-exact:${fixture.fixtureId}`,
      accounting.every(
        (entry) =>
          EXACT_ROW_RELATION_TYPES.has(entry.relationType) &&
          duplicateValues(entry.targets).length === 0 &&
          entry.relationType === expectedRowRelationType(entry, accounting),
      ),
      `${accounting.length} relation types agree with fixture-local reverse target counts`,
      fixture.fixtureId,
    );
    const targetByType = {
      item: ids.item,
      field: ids.field,
      memo: ids.memo,
      flow_context: ids.flow,
      step_context: ids.step,
      omitted: new Set(),
    };
    add(
      checks,
      `accounting-targets:${fixture.fixtureId}`,
      accounting.every((entry) =>
        entry.targetType === 'omitted'
          ? entry.targets.length === 0
          : entry.targets.length > 0 && entry.targets.every((id) => targetByType[entry.targetType]?.has(id)),
      ),
      'all accounting targets resolve',
      fixture.fixtureId,
    );
    add(
      checks,
      `completion-integrity:${fixture.fixtureId}`,
      content.items.every((item) => {
        if (!controlled.intents.includes(item.intent) || !controlled.completionModes.includes(item.completion.mode)) return false;
        if (item.completion.mode === 'record') {
          return (
            item.completion.recordFieldIds.length > 0 &&
            item.completion.recordFieldIds.every((id) => ids.field.has(id))
          );
        }
        if (item.completion.mode === 'decision') {
          return (
            item.completion.options.length >= 2 &&
            duplicateValues(item.completion.options.map((option) => option.value)).length === 0
          );
        }
        return Boolean(item.completion.doneWhen);
      }),
      `${content.items.length} valid completion specs`,
      fixture.fixtureId,
    );
    add(
      checks,
      `schedule-integrity:${fixture.fixtureId}`,
      content.items.every((item) => {
        if (!item.schedule) return true;
        if (!controlled.scheduleModes.includes(item.schedule.mode)) return false;
        if (item.schedule.recurrence && (!Number.isInteger(item.schedule.recurrence.interval) || item.schedule.recurrence.interval <= 0)) return false;
        if (item.schedule.mode === 'anchor_offset') {
          return ids.field.has(item.schedule.anchorFieldId);
        }
        return true;
      }),
      `${content.items.filter((item) => item.schedule).length} scheduled items`,
      fixture.fixtureId,
    );
    const calendarEntries = fixture.projectionEvaluation.calendar.entries;
    add(
      checks,
      `undated-vevent-zero:${fixture.fixtureId}`,
      calendarEntries.every((entry) => {
        const childIds = entry.childItemIds?.length ? entry.childItemIds : [entry.itemId];
        return (
          entry.component === 'VEVENT' &&
          childIds.every((id) => Boolean(content.items.find((candidate) => candidate.itemId === id)?.schedule))
        );
      }),
      `${calendarEntries.length} VEVENT templates, all scheduled`,
      fixture.fixtureId,
    );
    add(
      checks,
      `calendar-child-ids:${fixture.fixtureId}`,
      calendarEntries.every(
        (entry) =>
          Array.isArray(entry.childItemIds) &&
          entry.childItemIds.length > 0 &&
          entry.childItemIds.every((id) => ids.item.has(id)),
      ),
      'all grouped projection child Item IDs resolve',
      fixture.fixtureId,
    );
    add(
      checks,
      `component-nesting-zero:${fixture.fixtureId}`,
      calendarEntries.every((entry) => !entry.components && !entry.children?.some((child) => child.component === 'VTODO')),
      'no VEVENT/VTODO nesting',
      fixture.fixtureId,
    );
    add(
      checks,
      `projection-selection-consistency:${fixture.fixtureId}`,
      fixture.projectionEvaluation.calendar.eventCount === calendarEntries.length &&
        Object.keys(PROJECTION_COLLECTION_KEY).every((artifact) => {
          const { projection, collection } = projectionCollection(fixture.projectionEvaluation, artifact);
          return projection?.selected === true || collection.length === 0;
        }),
      `calendar eventCount ${fixture.projectionEvaluation.calendar.eventCount}/${calendarEntries.length}; unselected projections stay empty`,
      fixture.fixtureId,
    );
    const usableProjectionArtifacts = usableSelectedProjectionArtifacts(fixture.projectionEvaluation);
    const primaryProjection = projectionCollection(
      fixture.projectionEvaluation,
      fixture.taxonomy.primaryArtifact,
    );
    add(
      checks,
      `usable-selected-projection:${fixture.fixtureId}`,
      usableProjectionArtifacts.length > 0,
      usableProjectionArtifacts.length > 0
        ? usableProjectionArtifacts.join(', ')
        : 'no selected projection has an entry, row, or block',
      fixture.fixtureId,
    );
    add(
      checks,
      `primary-artifact-projection:${fixture.fixtureId}`,
      primaryProjection.projection?.selected === true && primaryProjection.collection.length > 0,
      `${fixture.taxonomy.primaryArtifact}: ${primaryProjection.collection.length} projected records`,
      fixture.fixtureId,
    );
    add(
      checks,
      `zero-item-structural-artifact:${fixture.fixtureId}`,
      content.items.length > 0 ||
        ((content.fields.length > 0 || content.memos.length > 0) && usableProjectionArtifacts.length > 0),
      content.items.length > 0
        ? `${content.items.length} canonical Items`
        : `${content.fields.length} Fields / ${content.memos.length} Memos / ${usableProjectionArtifacts.length} usable projections`,
      fixture.fixtureId,
    );
    add(
      checks,
      `calendar-primary-ready:${fixture.fixtureId}`,
      fixture.taxonomy.primaryArtifact !== 'calendar' ||
        (content.items.some((item) => Boolean(item.schedule)) &&
          fixture.projectionEvaluation.calendar?.selected === true &&
          calendarEntries.length > 0),
      fixture.taxonomy.primaryArtifact === 'calendar'
        ? `${content.items.filter((item) => item.schedule).length} scheduled Items / ${calendarEntries.length} VEVENT entries`
        : 'not a Calendar-primary fixture',
      fixture.fixtureId,
    );
    const sourceOwnedKeys = new Set(
      content.fields.filter((field) => field.valueSource === 'source').flatMap((field) => [field.key, field.label]),
    );
    add(
      checks,
      `no-source-reask:${fixture.fixtureId}`,
      [...fixture.inputs.required, ...fixture.inputs.optional, ...(fixture.inputs.duringExecution || [])].every(
        (input) => !sourceOwnedKeys.has(input.key) && !sourceOwnedKeys.has(input.label),
      ) &&
        ['sourceTitle', 'sourceUrl', 'sourceRows'].every((key) => fixture.inputs.neverAskAgain.includes(key)),
      `${fixture.inputs.required.length} required inputs`,
      fixture.fixtureId,
    );
    add(
      checks,
      `review-boundary:${fixture.fixtureId}`,
      fixture.researchReview.publicReadiness === 'not_assessed' &&
        fixture.researchReview.researchUseStatus === 'research_only',
      `${fixture.researchReview.researchUseStatus}/${fixture.researchReview.publicReadiness}`,
      fixture.fixtureId,
    );
  }

  add(
    checks,
    'boundary-omission-integrity',
    corpus.boundaryControls.every(
      (boundary) =>
        boundary.sourceRowsCaptured === (boundary.sourceRows || []).length &&
        (boundary.sourceRowsCaptured === 0 ||
          ((boundary.rowAccounting || []).length === boundary.sourceRowsCaptured &&
            boundary.rowAccounting.every(
              (entry) =>
                entry.targetType === 'omitted' &&
                entry.targets.length === 0 &&
                Boolean(entry.reason) &&
                boundary.sourceRows.some((row) => row.sourceRowId === entry.sourceRowId),
            ))),
    ),
    `${corpus.boundaryControls.length} boundary controls preserve omission reasons`,
  );

  if (options.coverage) {
    add(
      checks,
      'coverage-all-required',
      options.coverage.allRequiredCoveragePassed,
      JSON.stringify(options.coverage.requiredCoverage),
    );
  }
  return checks;
}

export function validateArtifactContracts({ corpus, lineage, dtos, ledger, saturation }) {
  const checks = [];
  const fixtureIds = new Set(corpus.fixtures.map((fixture) => fixture.fixtureId));
  const fixtureById = new Map(corpus.fixtures.map((fixture) => [fixture.fixtureId, fixture]));
  const baselineFixtureIds = corpus.fixtures
    .filter((fixture) => fixture.batch === 'qualified_v2_baseline')
    .map((fixture) => fixture.fixtureId);
  const preservation = lineage.baselinePreservation || [];
  const preservationFixtureIds = preservation.map((entry) => entry.fixtureId);
  add(
    checks,
    'lineage-baseline-preservation',
    preservation.length === 8 &&
      lineage.baselinePreservationSummary?.fixtureCount === 8 &&
      lineage.baselinePreservationSummary?.allSemanticChecksPassed === true &&
      duplicateValues(preservationFixtureIds).length === 0 &&
      baselineFixtureIds.length === 8 &&
      baselineFixtureIds.every((fixtureId) => preservationFixtureIds.includes(fixtureId)) &&
      preservation.every(
        (entry) =>
          entry.allSemanticChecksPassed === true &&
          entry.checks &&
          Object.values(entry.checks).every(Boolean) &&
          SHA256_PATTERN.test(entry.originalRecordSha256) &&
          SHA256_PATTERN.test(entry.original?.sourceRowsSha256) &&
          SHA256_PATTERN.test(entry.original?.itemsSha256) &&
          entry.original.sourceRowsSha256 === entry.generated?.sourceRowsSha256 &&
          entry.original.itemsSha256 === entry.generated?.itemsSha256,
      ),
    `${preservation.length}/8 baseline preservation manifests; semantic summary=${lineage.baselinePreservationSummary?.allSemanticChecksPassed}`,
  );

  const dtoRecords = dtos.dtos || [];
  const requiredEnvelopeKeys = [
    'decision',
    'sourceEvidence',
    'canonicalContent',
    'conversionAudit',
    'inputContract',
    'projectionPlan',
    'structureReview',
  ];
  add(
    checks,
    'dto-unique-envelope',
    dtoRecords.length >= 15 &&
      duplicateValues(dtoRecords.map((dto) => dto.fixtureId)).length === 0 &&
      duplicateValues(dtoRecords.map((dto) => dto.archetype)).length === 0 &&
      dtoRecords.every(
        (dto) =>
          fixtureIds.has(dto.fixtureId) &&
          requiredEnvelopeKeys.every(
            (key) =>
              Object.prototype.hasOwnProperty.call(dto, key) &&
              dto[key] !== null &&
              typeof dto[key] === 'object',
          ),
      ),
    `${dtoRecords.length} DTOs / ${new Set(dtoRecords.map((dto) => dto.fixtureId)).size} unique / envelope ${requiredEnvelopeKeys.join(', ')}`,
  );
  add(
    checks,
    'dto-fixture-correspondence',
    dtoRecords.every((dto) => {
      const fixture = fixtureById.get(dto.fixtureId);
      if (!fixture) return false;
      const canonicalKeys = ['schemaVersion', 'contentId', 'version', 'contentHash', 'bundle', 'flows', 'steps', 'items', 'fields', 'memos'];
      return (
        schemaValuesEqual(dto.taxonomy, fixture.taxonomy) &&
        schemaValuesEqual(dto.sourceEvidence?.source, fixture.source) &&
        schemaValuesEqual(dto.sourceEvidence?.sources, fixture.canonicalContent.sources) &&
        schemaValuesEqual(dto.sourceEvidence?.sourceSnapshots, fixture.canonicalContent.sourceSnapshots) &&
        schemaValuesEqual(dto.sourceEvidence?.sourceRows, fixture.canonicalContent.sourceRows) &&
        schemaValuesEqual(dto.sourceEvidence?.sourceRefs, fixture.canonicalContent.sourceRefs) &&
        canonicalKeys.every((key) =>
          schemaValuesEqual(dto.canonicalContent?.[key], fixture.canonicalContent[key]),
        ) &&
        schemaValuesEqual(dto.conversionAudit, fixture.conversionAudit) &&
        schemaValuesEqual(dto.inputContract, fixture.inputs) &&
        schemaValuesEqual(dto.projectionPlan, fixture.projectionEvaluation) &&
        schemaValuesEqual(dto.structureReview, fixture.researchReview)
      );
    }),
    `${dtoRecords.length} DTO envelopes correspond to their canonical fixture subsets`,
  );
  const dtoExecutionPatterns = new Set(
    dtoRecords.map((dto) => dto.taxonomy?.primaryExecutionPattern).filter(Boolean),
  );
  add(
    checks,
    'dto-execution-pattern-coverage',
    corpus.controlledEnums.executionPatterns.every((pattern) => dtoExecutionPatterns.has(pattern)),
    `${dtoExecutionPatterns.size}/${corpus.controlledEnums.executionPatterns.length} execution patterns`,
  );

  const convertedLedgerRecords = ledger.records.filter((record) => record.corpusStatus === 'converted');
  add(
    checks,
    'ledger-converted-hashes',
    convertedLedgerRecords.length === corpus.fixtures.length &&
      convertedLedgerRecords.every((record) => {
        const fixture = fixtureById.get(record.fixtureId);
        if (!fixture) return false;
        const expectedSnapshotHashes = fixture.canonicalContent.sourceSnapshots
          .map((snapshot) => snapshot.contentHash)
          .sort();
        const ledgerSnapshotHashes = [...(record.sourceSnapshotHashes || [])].sort();
        return (
          Array.isArray(record.sourceArtifactHashes) &&
          record.sourceArtifactHashes.length > 0 &&
          record.sourceArtifactHashes.every((hash) => SHA256_PATTERN.test(hash)) &&
          ledgerSnapshotHashes.length === expectedSnapshotHashes.length &&
          ledgerSnapshotHashes.every((hash, index) => hash === expectedSnapshotHashes[index]) &&
          SHA256_PATTERN.test(record.sourceRowsSha256) &&
          record.sourceRowsSha256 === sha256Json(fixture.canonicalContent.sourceRows)
        );
      }),
    `${convertedLedgerRecords.length}/${corpus.fixtures.length} converted records retain artifact, snapshot, and SourceRow hashes`,
  );
  const rejectedDuplicates = corpus.fixtureSelection?.rejectedDuplicates || [];
  const duplicateLedgerRecords = ledger.records.filter((record) => record.corpusStatus === 'duplicate');
  add(
    checks,
    'ledger-duplicate-mapping',
    ledger.controlledCorpusStatuses?.includes('duplicate') &&
      ledger.controlledCorpusStatuses?.includes('structurally_redundant') &&
      duplicateLedgerRecords.length === rejectedDuplicates.length &&
      rejectedDuplicates.every((rejected) =>
        duplicateLedgerRecords.some(
          (record) =>
            record.candidateIds?.includes(rejected.fixtureId) &&
            record.canonicalUrl === rejected.canonicalUrl &&
            record.exclusionReason === rejected.reason,
        ),
      ) &&
      rejectedDuplicates.every(
        (rejected) =>
          ledger.records.filter(
            (record) =>
              record.canonicalUrl === rejected.canonicalUrl &&
              record.corpusStatus === 'converted',
          ).length === 1,
      ) &&
      ledger.counts?.duplicate === duplicateLedgerRecords.length &&
      ledger.counts?.structurallyRedundant ===
        ledger.records.filter((record) => record.corpusStatus === 'structurally_redundant').length,
    `${duplicateLedgerRecords.length}/${rejectedDuplicates.length} rejected duplicates mapped to explicit ledger exclusions`,
  );

  const saturationEntries = saturation.entries || [];
  const expectedBatchSizes = [8, 10, 10, 10, 4];
  const expectedCumulative = [8, 18, 28, 38, 42];
  const saturatedFixtureIds = saturationEntries.flatMap((entry) => entry.fixtureIds || []);
  add(
    checks,
    'saturation-batch-contract',
    saturationEntries.length === expectedBatchSizes.length &&
      saturationEntries.every(
        (entry, index) =>
          entry.fixtureCount === expectedBatchSizes[index] &&
          entry.fixtureIds?.length === expectedBatchSizes[index] &&
          entry.cumulativeFixtureCount === expectedCumulative[index],
      ) &&
      duplicateValues(saturatedFixtureIds).length === 0 &&
      saturatedFixtureIds.length === corpus.fixtures.length &&
      saturatedFixtureIds.every((fixtureId, index) => fixtureId === corpus.fixtures[index]?.fixtureId),
    `${saturationEntries.map((entry) => entry.fixtureCount).join('/')} batches; ${saturatedFixtureIds.length}/${corpus.fixtures.length} fixtures`,
  );
  const expectedLast20 = corpus.fixtures.slice(-20).map((fixture) => fixture.fixtureId);
  const recordedLast20 = saturation.last20FixtureStability?.fixtureIds || [];
  add(
    checks,
    'saturation-last20-stable',
    saturation.last20FixtureStability?.fixtureCount === 20 &&
      saturation.last20FixtureStability?.stable === true &&
      saturation.last20FixtureStability?.newMandatoryCanonicalFields?.length === 0 &&
      saturation.last20FixtureStability?.newCommonRules?.length === 0 &&
      recordedLast20.length === expectedLast20.length &&
      recordedLast20.every((fixtureId, index) => fixtureId === expectedLast20[index]),
    `${recordedLast20.length}/20 fixtures; stable=${saturation.last20FixtureStability?.stable}`,
  );
  return checks;
}

export function validateArtifacts({ writeResult = false } = {}) {
  const checks = [];
  for (const name of REQUIRED_FILES) {
    add(checks, `file:${name}`, fs.existsSync(path.join(HERE, name)), fs.existsSync(path.join(HERE, name)) ? 'present' : 'missing');
  }
  const corpus = readJson('canonical-corpus-v1.json');
  const coverage = readJson('structural-coverage-contract-v1.json');
  checks.push(...validateCorpus(corpus, { coverage }));

  const schema = readJson('canonical-corpus.schema.json');
  add(checks, 'schema-id', schema.$schema === 'https://json-schema.org/draft/2020-12/schema', schema.$schema);
  add(checks, 'schema-min-items', schema.properties.fixtures.minItems === 40, `${schema.properties.fixtures.minItems}`);
  const schemaValidation = validateJsonSchema(corpus, schema);
  add(
    checks,
    'schema-corpus-validation',
    schemaValidation.valid,
    schemaValidation.valid
      ? 'canonical-corpus-v1.json conforms to canonical-corpus.schema.json'
      : schemaValidation.errors
          .slice(0, 12)
          .map((error) => `${error.instancePath} ${error.keyword}: ${error.message}`)
          .join(' | '),
  );

  const mapping = readJson('source-row-item-mapping-v1.json');
  add(
    checks,
    'mapping-count',
    mapping.records.length === corpus.counts.sourceRows,
    `${mapping.records.length}/${corpus.counts.sourceRows}`,
  );
  const dtos = readJson('representative-backend-dto-v1.json');
  add(checks, 'dto-count', dtos.dtos.length >= 15, `${dtos.dtos.length} DTOs`);
  const story = readJson('report-storyboard-v1.json');
  add(checks, 'story-count', story.representatives.length === 12, `${story.representatives.length} representative cases`);
  const fixtureIds = new Set(corpus.fixtures.map((fixture) => fixture.fixtureId));
  add(
    checks,
    'story-refs',
    story.representatives.every((entry) => fixtureIds.has(entry.fixtureId)),
    'all storyboard fixtures resolve',
  );
  const ledger = readJson('candidate-master-ledger-v1.json');
  add(
    checks,
    'ledger-complete-count',
    ledger.records.filter((entry) => entry.corpusRole === 'complete_fixture').length >= corpus.fixtures.length,
    `${ledger.records.filter((entry) => entry.corpusRole === 'complete_fixture').length}/${corpus.fixtures.length}`,
  );
  const lineage = readJson('input-lineage-v1.json');
  add(checks, 'lineage-frozen', lineage.frozenBeforeBuild && lineage.inputs.length >= 10, `${lineage.inputs.length} frozen inputs`);
  add(checks, 'runtime-unchanged-claim', lineage.ownership.runtimeFilesChanged === false, 'runtime files unchanged');
  const saturation = readJson('structural-saturation-log-v1.json');
  checks.push(...validateArtifactContracts({ corpus, lineage, dtos, ledger, saturation }));

  if (fs.existsSync(REPORT)) {
    const html = fs.readFileSync(REPORT, 'utf8');
    const screenCount = (html.match(/<section\b[^>]*class="[^"]*\bdeck-screen\b[^"]*"/g) || []).length;
    const explorerCardCount = (html.match(/<button\b[^>]*\bdata-fixture-card\b/g) || []).length;
    add(checks, 'html-screen-count', screenCount >= 30 && screenCount <= 40, `${screenCount} main screens`);
    add(
      checks,
      'html-explorer-count',
      explorerCardCount === corpus.fixtures.length,
      `${explorerCardCount}/${corpus.fixtures.length} explorer cards`,
    );
    add(checks, 'html-no-empty-src', !/\bsrc=(?:""|'')/.test(html), 'no empty src');
    add(checks, 'html-size', Buffer.byteLength(html) < 2_000_000, `${Buffer.byteLength(html)} bytes`);
  } else {
    add(checks, 'html-report', false, 'report missing');
  }

  const failed = checks.filter((check) => !check.passed);
  const result = {
    schemaVersion: 'flowme-canonical-structure-validation-results-v1',
    generatedAt: new Date().toISOString(),
    status: failed.length ? 'failed' : 'passed',
    summary: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
    claimBoundary:
      '이 결과는 schema·참조·provenance·정적 보고서 무결성 검사다. 실제 사용자 검증이나 외부 Calendar 왕복 검증이 아니다.',
    externalCalendarRoundTrip: 'NOT_RUN',
    observedUserValidation: 'NOT_RUN',
    checks,
  };
  if (writeResult) {
    fs.writeFileSync(path.join(HERE, 'validation-results-v1.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  }
  return result;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const result = validateArtifacts({ writeResult: true });
  process.stdout.write(`${JSON.stringify(result.summary)}\n`);
  if (result.status !== 'passed') {
    for (const failure of result.checks.filter((check) => !check.passed)) {
      process.stderr.write(`FAIL ${failure.id}: ${failure.detail}\n`);
    }
    process.exitCode = 1;
  }
}
