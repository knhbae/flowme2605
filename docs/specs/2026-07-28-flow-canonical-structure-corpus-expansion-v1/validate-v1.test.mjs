import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { validateArtifactContracts, validateCorpus, validateJsonSchema } from './validate-v1.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function loadCorpus() {
  return JSON.parse(fs.readFileSync(path.join(HERE, 'canonical-corpus-v1.json'), 'utf8'));
}

function loadSchema() {
  return JSON.parse(fs.readFileSync(path.join(HERE, 'canonical-corpus.schema.json'), 'utf8'));
}

function loadArtifactContracts() {
  return {
    corpus: loadCorpus(),
    lineage: JSON.parse(fs.readFileSync(path.join(HERE, 'input-lineage-v1.json'), 'utf8')),
    dtos: JSON.parse(fs.readFileSync(path.join(HERE, 'representative-backend-dto-v1.json'), 'utf8')),
    ledger: JSON.parse(fs.readFileSync(path.join(HERE, 'candidate-master-ledger-v1.json'), 'utf8')),
    saturation: JSON.parse(fs.readFileSync(path.join(HERE, 'structural-saturation-log-v1.json'), 'utf8')),
  };
}

function clone(value) {
  return structuredClone(value);
}

function failedIds(corpus) {
  return validateCorpus(corpus).filter((check) => !check.passed).map((check) => check.id);
}

function failedArtifactIds(artifacts) {
  return validateArtifactContracts(artifacts).filter((check) => !check.passed).map((check) => check.id);
}

test('generated corpus passes semantic validation', () => {
  const failed = failedIds(loadCorpus());
  assert.deepEqual(failed, []);
});

test('generated corpus passes its machine-readable JSON Schema', () => {
  const result = validateJsonSchema(loadCorpus(), loadSchema());
  assert.equal(result.valid, true, JSON.stringify(result.errors.slice(0, 10), null, 2));
});

test('JSON Schema rejects a missing required fixture field', () => {
  const corpus = clone(loadCorpus());
  delete corpus.fixtures[0].fixtureId;
  const result = validateJsonSchema(corpus, loadSchema());
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.keyword === 'required' &&
        error.instancePath === '$/fixtures/0' &&
        error.message.includes('fixtureId'),
    ),
    JSON.stringify(result.errors.slice(0, 10), null, 2),
  );
});

test('JSON Schema rejects an invalid controlled enum', () => {
  const corpus = clone(loadCorpus());
  corpus.fixtures[0].taxonomy.primaryArtifact = 'hybrid';
  const result = validateJsonSchema(corpus, loadSchema());
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.keyword === 'enum' &&
        error.instancePath === '$/fixtures/0/taxonomy/primaryArtifact',
    ),
    JSON.stringify(result.errors.slice(0, 10), null, 2),
  );
});

test('JSON Schema evaluator supports local refs, branches, patterns, and uniqueness', () => {
  const schema = {
    type: 'object',
    required: ['kind', 'entries'],
    additionalProperties: false,
    properties: {
      kind: { const: 'fixture' },
      entries: {
        type: 'array',
        minItems: 1,
        uniqueItems: true,
        items: { $ref: '#/$defs/entry' },
      },
    },
    $defs: {
      entry: {
        oneOf: [
          { type: 'integer', minimum: 1 },
          { type: 'string', pattern: '^item-[a-z]+$' },
        ],
      },
    },
  };
  assert.equal(validateJsonSchema({ kind: 'fixture', entries: [1, 'item-alpha'] }, schema).valid, true);
  const invalid = validateJsonSchema({ kind: 'fixture', entries: [0, 'bad', 'bad'], extra: true }, schema);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((error) => error.keyword === 'oneOf'));
  assert.ok(invalid.errors.some((error) => error.keyword === 'uniqueItems'));
  assert.ok(invalid.errors.some((error) => error.keyword === 'additionalProperties'));

  const anyOfSchema = {
    anyOf: [
      { const: 'source-owned' },
      { type: 'integer', minimum: 2 },
    ],
  };
  assert.equal(validateJsonSchema('source-owned', anyOfSchema).valid, true);
  assert.equal(validateJsonSchema(2, anyOfSchema).valid, true);
  assert.ok(validateJsonSchema(1, anyOfSchema).errors.some((error) => error.keyword === 'anyOf'));
});

test('rejects fewer than 40 fixtures', () => {
  const corpus = clone(loadCorpus());
  corpus.fixtures = corpus.fixtures.slice(0, 39);
  assert.ok(failedIds(corpus).includes('fixture-minimum'));
});

test('rejects duplicate canonical URL', () => {
  const corpus = clone(loadCorpus());
  corpus.fixtures[1].source.canonicalUrl = corpus.fixtures[0].source.canonicalUrl;
  assert.ok(failedIds(corpus).includes('unique-canonical-urls'));
});

test('rejects hybrid primary artifact', () => {
  const corpus = clone(loadCorpus());
  corpus.fixtures[0].taxonomy.primaryArtifact = 'hybrid';
  assert.ok(failedIds(corpus).some((id) => id.startsWith('no-hybrid:')));
});

test('rejects unresolved SourceRow reference', () => {
  const corpus = clone(loadCorpus());
  corpus.fixtures[0].canonicalContent.sourceRefs[0].sourceRowIds = ['missing-row'];
  assert.ok(failedIds(corpus).some((id) => id.startsWith('source-ref-integrity:')));
});

test('rejects undated VEVENT', () => {
  const corpus = clone(loadCorpus());
  const fixture = corpus.fixtures.find((entry) => entry.canonicalContent.items.some((item) => !item.schedule));
  const item = fixture.canonicalContent.items.find((entry) => !entry.schedule);
  fixture.projectionEvaluation.calendar.entries.push({ component: 'VEVENT', itemId: item.itemId });
  assert.ok(failedIds(corpus).some((id) => id.startsWith('undated-vevent-zero:')));
});

test('rejects nested VTODO', () => {
  const corpus = clone(loadCorpus());
  const fixture = corpus.fixtures.find((entry) => entry.projectionEvaluation.calendar.entries.length);
  fixture.projectionEvaluation.calendar.entries[0].children = [{ component: 'VTODO' }];
  assert.ok(failedIds(corpus).some((id) => id.startsWith('component-nesting-zero:')));
});

test('rejects invalid record completion Field reference', () => {
  const corpus = clone(loadCorpus());
  const fixture = corpus.fixtures.find((entry) => entry.canonicalContent.items.some((item) => item.completion.mode === 'record'));
  const item = fixture.canonicalContent.items.find((entry) => entry.completion.mode === 'record');
  item.completion.recordFieldIds = ['missing-field'];
  assert.ok(failedIds(corpus).some((id) => id.startsWith('completion-integrity:')));
});

test('rejects invalid recurrence interval', () => {
  const corpus = clone(loadCorpus());
  const fixture = corpus.fixtures.find((entry) => entry.canonicalContent.items.some((item) => item.schedule?.recurrence));
  const item = fixture.canonicalContent.items.find((entry) => entry.schedule?.recurrence);
  item.schedule.recurrence.interval = 0;
  assert.ok(failedIds(corpus).some((id) => id.startsWith('schedule-integrity:')));
});

test('rejects source-owned Field being asked again', () => {
  const corpus = clone(loadCorpus());
  const fixture = corpus.fixtures.find((entry) => entry.canonicalContent.fields.some((field) => field.valueSource === 'source'));
  const field = fixture.canonicalContent.fields.find((entry) => entry.valueSource === 'source');
  fixture.inputs.required.push({ key: field.key, label: field.label, type: field.valueType });
  assert.ok(failedIds(corpus).some((id) => id.startsWith('no-source-reask:')));
});

test('rejects uncontrolled secondary taxonomy value', () => {
  const corpus = clone(loadCorpus());
  corpus.fixtures[0].taxonomy.secondaryExecutionPatterns.push('free_text_pattern');
  assert.ok(failedIds(corpus).some((id) => id.startsWith('taxonomy:')));
});

test('rejects legacy runtime key in canonical area', () => {
  const corpus = clone(loadCorpus());
  corpus.fixtures[0].canonicalContent.category = 'legacy';
  assert.ok(failedIds(corpus).some((id) => id.startsWith('canonical-no-legacy-keys:')));
});

test('rejects unresolved Item dependency', () => {
  const corpus = clone(loadCorpus());
  corpus.fixtures[0].canonicalContent.items[0].dependsOnItemIds = ['missing-item'];
  assert.ok(failedIds(corpus).some((id) => id.startsWith('item-related-refs:')));
});

test('rejects a dependency without source-backed dependency provenance', () => {
  const corpus = clone(loadCorpus());
  const fixture = corpus.fixtures.find((entry) =>
    entry.canonicalContent.items.some((item) => item.dependsOnItemIds.length > 0),
  );
  const item = fixture.canonicalContent.items.find((entry) => entry.dependsOnItemIds.length > 0);
  item.dependencySourceRefIds = [];
  assert.ok(failedIds(corpus).some((id) => id.startsWith('dependency-provenance:')));
});

test('rejects a zero-Item fixture without a Field or Memo structural artifact', () => {
  const corpus = clone(loadCorpus());
  const fixture = corpus.fixtures.find((entry) => entry.canonicalContent.items.length === 0);
  assert.ok(fixture, 'the corpus must retain a field-only zero-Item fixture');
  fixture.canonicalContent.fields = [];
  fixture.canonicalContent.memos = [];
  assert.ok(failedIds(corpus).some((id) => id.startsWith('zero-item-structural-artifact:')));
});

test('rejects an empty primary projection even when a secondary projection remains usable', () => {
  const corpus = clone(loadCorpus());
  const fixture = corpus.fixtures.find(
    (entry) =>
      entry.taxonomy.primaryArtifact === 'sheet' &&
      entry.projectionEvaluation.sheet.rows.length > 0 &&
      entry.projectionEvaluation.checklist.selected &&
      entry.projectionEvaluation.checklist.entries.length > 0,
  );
  fixture.projectionEvaluation.sheet.rows = [];
  const failed = failedIds(corpus);
  assert.ok(failed.some((id) => id.startsWith('primary-artifact-projection:')));
  assert.ok(!failed.some((id) => id.startsWith(`usable-selected-projection:${fixture.fixtureId}`)));
});

test('rejects a fixture with no usable selected projection', () => {
  const corpus = clone(loadCorpus());
  const fixture = corpus.fixtures[0];
  for (const [artifact, collectionKey] of [
    ['calendar', 'entries'],
    ['checklist', 'entries'],
    ['todo', 'entries'],
    ['sheet', 'rows'],
    ['memo', 'blocks'],
  ]) {
    fixture.projectionEvaluation[artifact][collectionKey] = [];
  }
  assert.ok(failedIds(corpus).some((id) => id.startsWith('usable-selected-projection:')));
});

test('rejects a stale Calendar eventCount or populated unselected projection', () => {
  const corpus = clone(loadCorpus());
  const fixture = corpus.fixtures.find((entry) => entry.projectionEvaluation.calendar.selected);
  fixture.projectionEvaluation.calendar.eventCount += 1;
  assert.ok(failedIds(corpus).some((id) => id.startsWith('projection-selection-consistency:')));
});

test('rejects a Calendar-primary fixture without scheduled Items and VEVENT entries', () => {
  const corpus = clone(loadCorpus());
  const fixture = corpus.fixtures.find((entry) => entry.taxonomy.primaryArtifact === 'calendar');
  for (const item of fixture.canonicalContent.items) delete item.schedule;
  fixture.projectionEvaluation.calendar.entries = [];
  fixture.projectionEvaluation.calendar.eventCount = 0;
  assert.ok(failedIds(corpus).some((id) => id.startsWith('calendar-primary-ready:')));
});

test('rejects a snapshot hash that no longer matches captured SourceRows', () => {
  const corpus = clone(loadCorpus());
  corpus.fixtures[0].canonicalContent.sourceSnapshots[0].contentHash =
    'sha256:0000000000000000000000000000000000000000000000000000000000000000';
  assert.ok(failedIds(corpus).some((id) => id.startsWith('snapshot-content-integrity:')));
});

test('rejects an ambiguous SourceRow relation type', () => {
  const corpus = clone(loadCorpus());
  corpus.fixtures[0].conversionAudit.rowAccounting[0].relationType = 'one_to_one_or_many_to_one';
  assert.ok(failedIds(corpus).some((id) => id.startsWith('row-relation-exact:')));
});

test('rejects a controlled SourceRow relation type that disagrees with reverse target counts', () => {
  const corpus = clone(loadCorpus());
  const accounting = corpus.fixtures[0].conversionAudit.rowAccounting;
  const sharedTargetEntry = accounting.find((entry) => entry.relationType === 'many_to_one');
  assert.ok(sharedTargetEntry, 'fixture must contain a many-to-one mapping');
  sharedTargetEntry.relationType = 'one_to_one';
  assert.ok(failedIds(corpus).some((id) => id.startsWith('row-relation-exact:')));
});

test('rejects missing property-level provenance', () => {
  const corpus = clone(loadCorpus());
  corpus.fixtures[0].conversionAudit.itemProvenanceClaims[0].completionRefIds = [];
  assert.ok(failedIds(corpus).some((id) => id.startsWith('property-provenance:')));
});

test('rejects boundary count over five', () => {
  const corpus = clone(loadCorpus());
  while (corpus.boundaryControls.length < 6) corpus.boundaryControls.push({ boundaryId: `extra-${corpus.boundaryControls.length}` });
  assert.ok(failedIds(corpus).includes('boundary-maximum'));
});

test('artifact contracts reject a failed baseline semantic preservation record', () => {
  const artifacts = clone(loadArtifactContracts());
  artifacts.lineage.baselinePreservation[0].checks.itemSemantics = false;
  assert.ok(failedArtifactIds(artifacts).includes('lineage-baseline-preservation'));
});

test('artifact contracts reject duplicate DTO fixtures or a missing response envelope key', () => {
  const artifacts = clone(loadArtifactContracts());
  artifacts.dtos.dtos[1].fixtureId = artifacts.dtos.dtos[0].fixtureId;
  delete artifacts.dtos.dtos[0].structureReview;
  assert.ok(failedArtifactIds(artifacts).includes('dto-unique-envelope'));
});

test('artifact contracts require all seven execution patterns in representative DTOs', () => {
  const artifacts = clone(loadArtifactContracts());
  artifacts.dtos.dtos = artifacts.dtos.dtos.filter(
    (dto) => dto.taxonomy.primaryExecutionPattern !== 'phase_lifecycle',
  );
  assert.ok(failedArtifactIds(artifacts).includes('dto-execution-pattern-coverage'));
});

test('artifact contracts reject a DTO that drifts from its canonical fixture subset', () => {
  const artifacts = clone(loadArtifactContracts());
  artifacts.dtos.dtos[0].canonicalContent.items[0].title = 'stale DTO title';
  assert.ok(failedArtifactIds(artifacts).includes('dto-fixture-correspondence'));
});

test('artifact contracts reject a converted ledger record without source hashes', () => {
  const artifacts = clone(loadArtifactContracts());
  const converted = artifacts.ledger.records.find((record) => record.corpusStatus === 'converted');
  converted.sourceSnapshotHashes = [];
  converted.sourceRowsSha256 = null;
  assert.ok(failedArtifactIds(artifacts).includes('ledger-converted-hashes'));
});

test('artifact contracts require every rejected duplicate in the explicit ledger exclusion set', () => {
  const artifacts = clone(loadArtifactContracts());
  artifacts.ledger.records = artifacts.ledger.records.filter((record) => record.corpusStatus !== 'duplicate');
  assert.ok(failedArtifactIds(artifacts).includes('ledger-duplicate-mapping'));
});

test('artifact contracts require exactly one retained converted counterpart for every duplicate URL', () => {
  const artifacts = clone(loadArtifactContracts());
  const rejected = artifacts.corpus.fixtureSelection.rejectedDuplicates[0];
  const retained = artifacts.ledger.records.find(
    (record) => record.corpusStatus === 'converted' && record.canonicalUrl === rejected.canonicalUrl,
  );
  retained.canonicalUrl = `${retained.canonicalUrl}#drift`;
  assert.ok(failedArtifactIds(artifacts).includes('ledger-duplicate-mapping'));
});

test('artifact contracts reject changed saturation batch sizes', () => {
  const artifacts = clone(loadArtifactContracts());
  artifacts.saturation.entries[1].fixtureCount = 9;
  assert.ok(failedArtifactIds(artifacts).includes('saturation-batch-contract'));
});

test('artifact contracts reject an unstable or mismatched last-20 claim', () => {
  const artifacts = clone(loadArtifactContracts());
  artifacts.saturation.last20FixtureStability.stable = false;
  artifacts.saturation.last20FixtureStability.fixtureIds[0] = 'not-a-real-fixture';
  assert.ok(failedArtifactIds(artifacts).includes('saturation-last20-stable'));
});
