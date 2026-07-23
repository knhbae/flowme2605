import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ContractValidationError,
  loadDocuments,
  validateAll,
  validateAgainstSchema,
  validateBackendDtoCollection,
  validateComparison,
  validateReclassification,
  validateTaxonomyAssignment,
  validateTaxonomyCatalog,
} from './validate-taxonomy-v1-1.mjs';

const clone = (value) => structuredClone(value);

test('all Taxonomy v1.1 documents pass the contract validator', () => {
  const result = validateAll();
  assert.equal(result.checks.length, 6);
  assert.equal(result.checks.every((entry) => entry.status === 'PASS'), true);
  assert.deepEqual(result.counts, {
    reclassifiedRecords: 84,
    backendDtos: 10,
    sourceRows: 58,
    items: 43,
    comparisonCases: 20,
  });
});

test('schema enums stay synchronized with the taxonomy catalog', () => {
  const documents = loadDocuments();
  const schema = clone(documents.schema);
  schema.$defs.artifact.enum.push('hybrid');
  assert.throws(() => validateTaxonomyCatalog(documents.taxonomy, schema), ContractValidationError);
});

test('new primaryArtifact=hybrid is rejected', () => {
  const documents = loadDocuments();
  const assignment = clone(documents.dtos.dtos[0].taxonomy);
  assignment.primaryArtifact = 'hybrid';
  assert.throws(() => validateTaxonomyAssignment(assignment, documents.taxonomy), /failed/);
});

test('primary and secondary duplication is rejected', () => {
  const documents = loadDocuments();
  const assignment = clone(documents.dtos.dtos[0].taxonomy);
  assignment.secondaryArtifacts.push(assignment.primaryArtifact);
  assert.throws(() => validateTaxonomyAssignment(assignment, documents.taxonomy), /failed/);
});

test('an Item cannot reference a missing SourceRow', () => {
  const documents = loadDocuments();
  const dtos = clone(documents.dtos);
  dtos.dtos[0].sourceReferences[0].sourceRowIds = ['missing-row'];
  assert.throws(() => validateBackendDtoCollection(dtos, documents.taxonomy), /failed/);
});

test('unknown canonical properties are rejected by the JSON Schema', () => {
  const documents = loadDocuments();
  const dtos = clone(documents.dtos);
  dtos.dtos[0].taxonomy.category = 'travel';
  assert.throws(() => validateAgainstSchema(dtos, documents.schema, 'dtos'), /JSON Schema failed/);
});

test('public release cannot bypass approved public rights', () => {
  const documents = loadDocuments();
  const dtos = clone(documents.dtos);
  dtos.dtos[0].rights.publicReleaseAllowed = true;
  assert.throws(() => validateBackendDtoCollection(dtos, documents.taxonomy), /failed/);
});

test('public release cannot bypass freshness locale safety privacy and promotion gates', () => {
  const documents = loadDocuments();
  const dtos = clone(documents.dtos);
  const dto = dtos.dtos.find((entry) => entry.rights.basis === 'open_license');
  dto.rights.allowedUse.push('public_derived');
  dto.rights.publicReleaseAllowed = true;
  dto.review.rightsReview = 'approved';
  dto.review.freshnessReview = 'stale';
  dto.review.localeReview = 'applicable';
  dto.review.safetyReview = 'not_required';
  dto.review.privacyReview = 'not_required';
  dto.review.promotionState = 'published';
  dto.review.blockers = [];
  assert.throws(() => validateBackendDtoCollection(dtos, documents.taxonomy), /failed/);
});

test('blocked rights basis cannot be marked approved', () => {
  const documents = loadDocuments();
  const dtos = clone(documents.dtos);
  dtos.dtos[0].rights.basis = 'blocked';
  dtos.dtos[0].rights.reviewStatus = 'approved';
  dtos.dtos[0].review.rightsReview = 'approved';
  assert.throws(() => validateBackendDtoCollection(dtos, documents.taxonomy), /failed/);
});

test('source_import_required cannot contain fabricated Items', () => {
  const documents = loadDocuments();
  const dtos = clone(documents.dtos);
  const blocked = dtos.dtos.find((entry) => entry.scenario === 'source_import_required');
  blocked.items.push(clone(dtos.dtos[0].items[0]));
  assert.throws(() => validateBackendDtoCollection(dtos, documents.taxonomy), /failed/);
});

test('complete SourceRows must be referenced or explicitly omitted', () => {
  const documents = loadDocuments();
  const dtos = clone(documents.dtos);
  const dto = dtos.dtos.find((entry) => entry.review.sourceRowStatus === 'complete' && entry.sourceRows.length > 1);
  const lostRowId = dto.sourceReferences[0].sourceRowIds[0];
  dto.sourceReferences.forEach((reference) => { reference.sourceRowIds = reference.sourceRowIds.filter((rowId) => rowId !== lostRowId); });
  dto.sourceReferences = dto.sourceReferences.filter((reference) => reference.sourceRowIds.length > 0);
  dto.items.forEach((entry) => { entry.sourceRefIds = entry.sourceRefIds.filter((refId) => dto.sourceReferences.some((reference) => reference.sourceRefId === refId)); });
  assert.throws(() => validateBackendDtoCollection(dtos, documents.taxonomy), /failed/);
});

test('an Item must appear in exactly one declared Step', () => {
  const documents = loadDocuments();
  const dtos = clone(documents.dtos);
  const dto = dtos.dtos.find((entry) => entry.steps.length > 1);
  dto.steps[1].itemIds.push(dto.steps[0].itemIds[0]);
  assert.throws(() => validateBackendDtoCollection(dtos, documents.taxonomy), /failed/);
});

test('legacy fields cannot enter a v1.1 canonical assignment', () => {
  const documents = loadDocuments();
  const reclassification = clone(documents.reclassification);
  reclassification.records[0].v11.category = 'travel';
  assert.throws(() => validateReclassification(reclassification, documents.taxonomy), /failed/);
});

test('missing rows require a source blocker and non-ready state', () => {
  const documents = loadDocuments();
  const reclassification = clone(documents.reclassification);
  const record = reclassification.records.find((entry) => entry.review.sourceRowStatus === 'missing');
  record.review.blockers = record.review.blockers.filter((value) => value !== 'source_import_required' && value !== 'source_unavailable');
  record.review.conversionReadiness = 'ready_for_internal_canary';
  assert.throws(() => validateReclassification(reclassification, documents.taxonomy), /failed/);
});

test('classification agreement below 85 percent is rejected', () => {
  const documents = loadDocuments();
  const comparison = clone(documents.comparison);
  comparison.finalMetrics.coreAxes.sourceShape = 84.9;
  assert.throws(() => validateComparison(comparison), /failed/);
});
