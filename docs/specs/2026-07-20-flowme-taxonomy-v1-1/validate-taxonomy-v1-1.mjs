import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export class ContractValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ContractValidationError';
    this.errors = errors;
  }
}

function ensure(condition, message, errors) {
  if (!condition) errors.push(message);
}

function unique(values) {
  return new Set(values).size === values.length;
}

function jsonEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function schemaTypeMatches(value, type) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === type;
}

function resolveLocalRef(schema, ref) {
  if (!ref.startsWith('#/')) throw new Error(`Only local schema refs are supported: ${ref}`);
  return ref.slice(2).split('/').reduce((node, token) => node[token.replace(/~1/g, '/').replace(/~0/g, '~')], schema);
}

function collectSchemaErrors(value, rule, rootSchema, label, errors) {
  if (rule.$ref) return collectSchemaErrors(value, resolveLocalRef(rootSchema, rule.$ref), rootSchema, label, errors);
  if (rule.oneOf) {
    const attempts = rule.oneOf.map((candidate) => {
      const candidateErrors = [];
      collectSchemaErrors(value, candidate, rootSchema, label, candidateErrors);
      return candidateErrors;
    });
    const valid = attempts.filter((candidateErrors) => candidateErrors.length === 0).length;
    if (valid !== 1) {
      const details = attempts.map((candidateErrors, index) => `branch ${index + 1}: ${candidateErrors.slice(0, 3).join('; ')}`).join(' | ');
      errors.push(`${label}: expected exactly one matching schema branch; matched ${valid}. ${details}`);
    }
    return;
  }
  if ('const' in rule) ensure(jsonEqual(value, rule.const), `${label}: expected const ${JSON.stringify(rule.const)}`, errors);
  if (rule.enum) ensure(rule.enum.some((entry) => jsonEqual(entry, value)), `${label}: value is outside schema enum`, errors);
  if (rule.type) {
    const allowed = Array.isArray(rule.type) ? rule.type : [rule.type];
    const matched = allowed.some((type) => schemaTypeMatches(value, type));
    ensure(matched, `${label}: expected schema type ${allowed.join('|')}`, errors);
    if (!matched) return;
  }
  if (typeof value === 'string') {
    if (rule.minLength !== undefined) ensure(value.length >= rule.minLength, `${label}: below minLength`, errors);
    if (rule.maxLength !== undefined) ensure(value.length <= rule.maxLength, `${label}: above maxLength`, errors);
    if (rule.pattern) ensure(new RegExp(rule.pattern).test(value), `${label}: pattern mismatch`, errors);
    if (rule.format === 'uri') {
      try { new URL(value); } catch { errors.push(`${label}: invalid URI`); }
    }
    if (rule.format === 'date-time') ensure(!Number.isNaN(Date.parse(value)), `${label}: invalid date-time`, errors);
  }
  if (typeof value === 'number' && rule.minimum !== undefined) ensure(value >= rule.minimum, `${label}: below minimum`, errors);
  if (Array.isArray(value)) {
    if (rule.minItems !== undefined) ensure(value.length >= rule.minItems, `${label}: below minItems`, errors);
    if (rule.maxItems !== undefined) ensure(value.length <= rule.maxItems, `${label}: above maxItems`, errors);
    if (rule.uniqueItems) ensure(unique(value.map((entry) => JSON.stringify(entry))), `${label}: duplicate array items`, errors);
    if (rule.items) value.forEach((entry, index) => collectSchemaErrors(entry, rule.items, rootSchema, `${label}[${index}]`, errors));
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const required of rule.required || []) ensure(required in value, `${label}: missing required property ${required}`, errors);
    const properties = rule.properties || {};
    for (const [key, child] of Object.entries(value)) {
      if (properties[key]) collectSchemaErrors(child, properties[key], rootSchema, `${label}.${key}`, errors);
      else if (rule.additionalProperties === false) errors.push(`${label}: additional property ${key}`);
    }
  }
}

export function validateAgainstSchema(document, schema, label = 'document') {
  const errors = [];
  collectSchemaErrors(document, schema, schema, label, errors);
  if (errors.length) throw new ContractValidationError(`${label} JSON Schema failed`, errors);
  return true;
}

function checkEnum(value, allowed, label, errors, { nullable = false } = {}) {
  if (nullable && value === null) return;
  ensure(allowed.includes(value), `${label}: unsupported enum ${JSON.stringify(value)}`, errors);
}

function checkEnumArray(values, allowed, label, errors, maxItems = Infinity) {
  ensure(Array.isArray(values), `${label}: expected array`, errors);
  if (!Array.isArray(values)) return;
  ensure(unique(values), `${label}: duplicate values`, errors);
  ensure(values.length <= maxItems, `${label}: max ${maxItems} values`, errors);
  values.forEach((value, index) => checkEnum(value, allowed, `${label}[${index}]`, errors));
}

function checkPrimarySecondary(primary, secondary, label, errors) {
  ensure(!secondary.includes(primary), `${label}: primary value repeated in secondary`, errors);
}

function getEnums(taxonomy) {
  return taxonomy.enums;
}

export function validateTaxonomyAssignment(value, taxonomy, label = 'taxonomy', { partial = false } = {}) {
  const errors = [];
  const enums = getEnums(taxonomy);
  checkEnum(value.primaryLifeArea, enums.lifeAreas, `${label}.primaryLifeArea`, errors);
  checkEnumArray(value.secondaryLifeAreas, enums.lifeAreas, `${label}.secondaryLifeAreas`, errors, 2);
  checkPrimarySecondary(value.primaryLifeArea, value.secondaryLifeAreas || [], `${label}.lifeArea`, errors);
  ensure(Array.isArray(value.topicTags) && unique(value.topicTags) && value.topicTags.every((tag) => typeof tag === 'string' && tag.length > 0), `${label}.topicTags: non-empty unique strings required`, errors);
  checkEnum(value.sourceShape, enums.sourceShapes, `${label}.sourceShape`, errors, { nullable: partial });
  checkEnumArray(value.secondarySourceShapes, enums.sourceShapes, `${label}.secondarySourceShapes`, errors, 2);
  if (value.sourceShape !== null) checkPrimarySecondary(value.sourceShape, value.secondarySourceShapes || [], `${label}.sourceShape`, errors);
  checkEnum(value.primaryExecutionPattern, enums.executionPatterns, `${label}.primaryExecutionPattern`, errors, { nullable: partial });
  checkEnumArray(value.secondaryExecutionPatterns, enums.executionPatterns, `${label}.secondaryExecutionPatterns`, errors, 2);
  if (value.primaryExecutionPattern !== null) checkPrimarySecondary(value.primaryExecutionPattern, value.secondaryExecutionPatterns || [], `${label}.executionPattern`, errors);
  checkEnum(value.primaryArtifact, enums.artifacts, `${label}.primaryArtifact`, errors, { nullable: partial });
  ensure(value.primaryArtifact !== 'hybrid', `${label}.primaryArtifact: hybrid is legacy-only`, errors);
  checkEnumArray(value.secondaryArtifacts, enums.artifacts, `${label}.secondaryArtifacts`, errors, 4);
  if (value.primaryArtifact !== null) checkPrimarySecondary(value.primaryArtifact, value.secondaryArtifacts || [], `${label}.artifact`, errors);
  const legacyKeys = ['category', 'structure_type', 'primary_destination', 'planningPattern', 'primary_destination', 'internal_check'];
  legacyKeys.forEach((key) => ensure(!(key in value), `${label}: legacy key leaked into canonical assignment: ${key}`, errors));
  if (partial) {
    checkEnum(value.classificationStatus, ['confirmed', 'provisional', 'blocked_missing_source'], `${label}.classificationStatus`, errors);
    if (value.classificationStatus === 'confirmed') ensure(value.sourceShape !== null && value.primaryExecutionPattern !== null && value.primaryArtifact !== null, `${label}: confirmed assignment cannot contain null core axes`, errors);
    if (value.classificationStatus === 'blocked_missing_source') ensure(value.sourceShape === null, `${label}: blocked_missing_source must keep sourceShape null`, errors);
  }
  if (errors.length) throw new ContractValidationError(`${label} failed`, errors);
  return true;
}

function validateAccess(value, taxonomy, label, errors) {
  const enums = getEnums(taxonomy);
  checkEnum(value.providerType, enums.providerTypes, `${label}.providerType`, errors);
  checkEnumArray(value.platformRoles, enums.platformRoles, `${label}.platformRoles`, errors);
  ensure(value.platformRoles.length > 0, `${label}.platformRoles: at least one role required`, errors);
  checkEnum(value.discoveryAccess, enums.discoveryAccess, `${label}.discoveryAccess`, errors);
  checkEnum(value.rowAccess, enums.rowAccess, `${label}.rowAccess`, errors);
  checkEnumArray(value.acquisitionMethods, enums.acquisitionMethods, `${label}.acquisitionMethods`, errors);
  checkEnum(value.sourceFormat?.category, enums.sourceFormatCategories, `${label}.sourceFormat.category`, errors);
  ensure(value.sourceFormat && typeof value.sourceFormat.detail === 'object' && !Array.isArray(value.sourceFormat.detail), `${label}.sourceFormat.detail: object required`, errors);
}

function validateRights(value, taxonomy, label, errors) {
  const enums = getEnums(taxonomy);
  checkEnum(value.basis, enums.rightsBasis, `${label}.basis`, errors);
  checkEnumArray(value.allowedUse, enums.allowedUse, `${label}.allowedUse`, errors);
  checkEnum(value.territoryScope, enums.territoryScope, `${label}.territoryScope`, errors);
  ensure(Array.isArray(value.territories) && unique(value.territories), `${label}.territories: unique array required`, errors);
  checkEnum(value.reviewStatus, enums.rightsReviewStatus, `${label}.reviewStatus`, errors);
  ensure(typeof value.personalTransformAllowed === 'boolean', `${label}.personalTransformAllowed: boolean required`, errors);
  ensure(typeof value.publicReleaseAllowed === 'boolean', `${label}.publicReleaseAllowed: boolean required`, errors);
  ensure(typeof value.rationale === 'string' && value.rationale.length > 0, `${label}.rationale: required`, errors);
  if (['blocked', 'unknown', 'link_only_assumption'].includes(value.basis)) ensure(value.reviewStatus !== 'approved', `${label}: ${value.basis} cannot have approved review`, errors);
  if (value.territoryScope === 'global') ensure(value.territories.length === 1 && value.territories[0] === 'GLOBAL', `${label}: global territory requires exactly GLOBAL`, errors);
  if (value.territoryScope === 'named') ensure(value.territories.length > 0 && !value.territories.includes('GLOBAL'), `${label}: named territory requires named ISO territories`, errors);
  if (value.territoryScope === 'unknown') ensure(value.territories.length === 0, `${label}: unknown territory must not invent territories`, errors);
  if (value.personalTransformAllowed) ensure(value.allowedUse.includes('personal_transform') && value.reviewStatus === 'approved', `${label}: personal transform requires approved personal_transform use`, errors);
  if (value.publicReleaseAllowed) {
    ensure(value.personalTransformAllowed, `${label}: public release requires personal transform allowed`, errors);
    ensure(value.reviewStatus === 'approved', `${label}: public release requires approved rights review`, errors);
    ensure(value.allowedUse.includes('public_derived') || value.allowedUse.includes('public_republish'), `${label}: public release requires a public allowedUse`, errors);
  }
}

function validatePublicationGate(rights, review, label, errors) {
  if (!rights.publicReleaseAllowed) return;
  ensure(review.sourceRowStatus === 'complete', `${label}: public release requires complete SourceRows`, errors);
  ensure(['current', 'not_required'].includes(review.freshnessReview), `${label}: public release requires cleared freshness review`, errors);
  ensure(['applicable', 'not_required'].includes(review.localeReview), `${label}: public release requires cleared locale review`, errors);
  ensure(['passed_with_boundary', 'not_required'].includes(review.safetyReview), `${label}: public release requires cleared safety review`, errors);
  ensure(['passed', 'not_required'].includes(review.privacyReview), `${label}: public release requires cleared privacy review`, errors);
  ensure(review.rightsReview === 'approved', `${label}: public release requires approved review rights`, errors);
  ensure(['public_candidate', 'published'].includes(review.promotionState), `${label}: public release requires public promotion clearance`, errors);
  ensure(review.blockers.length === 0, `${label}: public release cannot retain blockers`, errors);
}

function validateReview(value, taxonomy, label, errors) {
  const enums = getEnums(taxonomy);
  checkEnum(value.sourceRowStatus, enums.sourceRowStatus, `${label}.sourceRowStatus`, errors);
  checkEnum(value.conversionReadiness, enums.conversionReadiness, `${label}.conversionReadiness`, errors);
  checkEnum(value.freshnessReview, enums.freshnessReview, `${label}.freshnessReview`, errors);
  checkEnum(value.localeReview, enums.localeReview, `${label}.localeReview`, errors);
  checkEnum(value.safetyReview, enums.safetyReview, `${label}.safetyReview`, errors);
  checkEnum(value.privacyReview, enums.privacyReview, `${label}.privacyReview`, errors);
  checkEnum(value.rightsReview, enums.rightsReviewStatus, `${label}.rightsReview`, errors);
  checkEnum(value.promotionState, enums.promotionState, `${label}.promotionState`, errors);
  checkEnumArray(value.blockers, enums.blockers, `${label}.blockers`, errors);
  checkEnum(value.portfolioRole, enums.portfolioRole, `${label}.portfolioRole`, errors);
  checkEnum(value.editorialAction, enums.editorialAction, `${label}.editorialAction`, errors);
  ensure(typeof value.backendStorable === 'boolean', `${label}.backendStorable: boolean required`, errors);
  if (value.sourceRowStatus === 'missing') {
    ensure(value.conversionReadiness === 'source_import_required' || value.conversionReadiness === 'hold', `${label}: missing rows cannot be conversion-ready`, errors);
    ensure(value.blockers.includes('source_import_required') || value.blockers.includes('source_unavailable'), `${label}: missing rows require a source blocker`, errors);
  }
  if (value.sourceRowStatus === 'metadata_only') ensure(value.conversionReadiness !== 'ready_for_internal_canary', `${label}: metadata-only rows cannot enter internal canary`, errors);
  if (value.conversionReadiness === 'source_import_required') ensure(value.blockers.includes('source_import_required') || value.blockers.includes('source_incomplete'), `${label}: source_import_required needs a source blocker`, errors);
}

function validateAudience(value, taxonomy, label, errors) {
  const enums = getEnums(taxonomy);
  checkEnumArray(value.roles, enums.audienceRoles, `${label}.roles`, errors);
  ensure(value.roles.length > 0, `${label}.roles: at least one required`, errors);
  checkEnumArray(value.ageBands, enums.ageBands, `${label}.ageBands`, errors);
  checkEnum(value.skillLevel, enums.skillLevels, `${label}.skillLevel`, errors);
  checkEnum(value.applicability, enums.applicability, `${label}.applicability`, errors);
  checkEnum(value.accountOrEntitlement, enums.accountOrEntitlement, `${label}.accountOrEntitlement`, errors);
  checkEnum(value.collaborationContext, enums.collaborationContext, `${label}.collaborationContext`, errors);
  checkEnumArray(value.userNeedSignals, enums.userNeedSignals, `${label}.userNeedSignals`, errors);
  checkEnumArray(value.frictionSignals, enums.frictionSignals, `${label}.frictionSignals`, errors);
  ensure(typeof value.contentLocale === 'string' && value.contentLocale.length > 0, `${label}.contentLocale: required`, errors);
  ensure(Array.isArray(value.applicableLocales), `${label}.applicableLocales: array required`, errors);
  ensure(Array.isArray(value.prerequisites), `${label}.prerequisites: array required`, errors);
}

export function validateTaxonomyCatalog(taxonomy, schema) {
  const errors = [];
  ensure(taxonomy.documentType === 'flowme_taxonomy_catalog', 'taxonomy.documentType', errors);
  ensure(taxonomy.schemaVersion === 'flowme-taxonomy-v1.1', 'taxonomy.schemaVersion', errors);
  ensure(schema.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema must declare Draft 2020-12', errors);
  ensure(Array.isArray(schema.oneOf) && schema.oneOf.length === 5, 'schema must cover five v1.1 document types', errors);
  const schemaEnumMap = {
    lifeAreas: 'lifeArea',
    sourceShapes: 'sourceShape',
    executionPatterns: 'executionPattern',
    artifacts: 'artifact',
    providerTypes: 'providerType',
    platformRoles: 'platformRole',
    discoveryAccess: 'discoveryAccess',
    rowAccess: 'rowAccess',
    acquisitionMethods: 'acquisitionMethod',
    sourceFormatCategories: 'sourceFormatCategory',
    rightsBasis: 'rightsBasis',
    allowedUse: 'allowedUse',
    rightsReviewStatus: 'rightsReviewStatus',
    sourceRowStatus: 'sourceRowStatus',
    conversionReadiness: 'conversionReadiness',
    freshnessReview: 'freshnessReview',
    localeReview: 'localeReview',
    safetyReview: 'safetyReview',
    privacyReview: 'privacyReview',
    promotionState: 'promotionState',
    blockers: 'blocker',
    portfolioRole: 'portfolioRole',
    editorialAction: 'editorialAction',
  };
  for (const [catalogName, schemaName] of Object.entries(schemaEnumMap)) {
    ensure(JSON.stringify(taxonomy.enums[catalogName]) === JSON.stringify(schema.$defs[schemaName].enum), `schema enum drift: ${catalogName}`, errors);
    ensure(unique(taxonomy.enums[catalogName]), `taxonomy enum has duplicates: ${catalogName}`, errors);
  }
  ensure(!taxonomy.enums.artifacts.includes('hybrid'), 'hybrid cannot be a canonical artifact', errors);
  const ruleKeys = ['definition', 'chooseWhen', 'excludeWhen', 'confusedWith', 'tieBreaker', 'goodExample', 'badExample'];
  for (const [axis, values] of Object.entries({ lifeAreas: taxonomy.enums.lifeAreas, sourceShapes: taxonomy.enums.sourceShapes, executionPatterns: taxonomy.enums.executionPatterns, artifacts: taxonomy.enums.artifacts })) {
    const ruleGroup = taxonomy.valueRules[axis];
    for (const value of values) {
      ensure(ruleGroup && ruleGroup[value], `missing value rule: ${axis}.${value}`, errors);
      if (!ruleGroup?.[value]) continue;
      ruleKeys.forEach((key) => ensure(key in ruleGroup[value], `missing rule field: ${axis}.${value}.${key}`, errors));
      ensure('primarySecondaryRule' in ruleGroup[value] || 'secondaryRule' in ruleGroup[value], `missing primary/secondary rule: ${axis}.${value}`, errors);
    }
  }
  const coreGroups = new Set(['lifeAreas', 'sourceShapes', 'executionPatterns', 'artifacts']);
  for (const [group, values] of Object.entries(taxonomy.enums)) {
    if (coreGroups.has(group)) continue;
    const rule = taxonomy.operationalEnumRules?.[group];
    ensure(Boolean(rule), `missing operational enum rule group: ${group}`, errors);
    if (!rule) continue;
    [...ruleKeys, 'primarySecondaryRule', 'valueDefinitions'].forEach((key) => ensure(key in rule, `missing operational rule field: ${group}.${key}`, errors));
    for (const value of values) ensure(typeof rule.valueDefinitions?.[value] === 'string' && rule.valueDefinitions[value].length > 0, `missing enum definition: ${group}.${value}`, errors);
  }
  ensure(Object.keys(taxonomy.adjudicationRules || {}).length >= 9, 'adjudicationRules must cover the first-round disagreement classes', errors);
  ensure(taxonomy.ambiguousCaseRules.length >= 8, 'required ambiguous cases missing', errors);
  if (errors.length) throw new ContractValidationError('taxonomy catalog failed', errors);
  return true;
}

export function validateReclassification(document, taxonomy) {
  const errors = [];
  ensure(document.documentType === 'flowme_taxonomy_reclassification', 'reclassification.documentType', errors);
  ensure(document.schemaVersion === taxonomy.schemaVersion, 'reclassification.schemaVersion', errors);
  ensure(Array.isArray(document.records) && document.records.length === 84, 'reclassification must contain 84 records', errors);
  const expected = { p0_portfolio: 24, source_expansion: 36, deep_set: 12, runtime_seed: 12 };
  for (const [dataset, count] of Object.entries(expected)) ensure(document.records.filter((record) => record.dataset === dataset).length === count, `${dataset}: expected ${count} records`, errors);
  const ids = document.records.map((record) => record.recordId);
  ensure(unique(ids), 'reclassification.recordId must be unique', errors);
  for (const record of document.records) {
    try { validateTaxonomyAssignment(record.v11, taxonomy, `${record.recordId}.v11`, { partial: true }); } catch (error) { errors.push(...error.errors); }
    validateAudience(record.audienceAndApplicability, taxonomy, `${record.recordId}.audienceAndApplicability`, errors);
    validateAccess(record.access, taxonomy, `${record.recordId}.access`, errors);
    validateRights(record.rights, taxonomy, `${record.recordId}.rights`, errors);
    validateReview(record.review, taxonomy, `${record.recordId}.review`, errors);
    ensure(record.backendStorable === record.review.backendStorable, `${record.recordId}: backendStorable mismatch`, errors);
    ensure(record.personalTransformAllowed === record.rights.personalTransformAllowed, `${record.recordId}: personal transform mismatch`, errors);
    ensure(record.publicReleaseAllowed === record.rights.publicReleaseAllowed, `${record.recordId}: public release mismatch`, errors);
    ensure(record.review.rightsReview === record.rights.reviewStatus, `${record.recordId}: rights review mismatch`, errors);
    validatePublicationGate(record.rights, record.review, record.recordId, errors);
    ensure(typeof record.changeReason === 'string' && record.changeReason.length > 0, `${record.recordId}: changeReason required`, errors);
    ensure(typeof record.tieBreaker === 'string' && record.tieBreaker.length > 0, `${record.recordId}: tieBreaker required`, errors);
    ensure(typeof record.ambiguousCandidates === 'object', `${record.recordId}: ambiguousCandidates required`, errors);
    if (record.v11.sourceShape === null) ensure(['missing', 'metadata_only', 'partial'].includes(record.review.sourceRowStatus), `${record.recordId}: null sourceShape requires incomplete source rows`, errors);
  }
  ensure(document.records.every((record) => record.v11.primaryArtifact !== 'hybrid'), 'new reclassification contains hybrid', errors);
  ensure(document.summary.newHybridCount === 0, 'summary.newHybridCount must be 0', errors);
  ensure(document.summary.totalRecords === 84, 'summary total mismatch', errors);
  if (errors.length) throw new ContractValidationError('reclassification failed', errors);
  return true;
}

export function validateBackendDtoCollection(document, taxonomy) {
  const errors = [];
  ensure(document.documentType === 'flowme_backend_dto_collection', 'DTO documentType', errors);
  ensure(document.schemaVersion === taxonomy.schemaVersion, 'DTO schemaVersion', errors);
  ensure(Array.isArray(document.dtos) && document.dtos.length === 10, 'exactly 10 DTOs required', errors);
  const requiredScenarios = ['날짜 역산', '순서형 절차', '반복 루틴', '표·진도', '자료 큐', '비교·결정', '단계형 프로젝트', '공식 날짜창', '권리 제한 콘텐츠', 'source_import_required'];
  ensure(requiredScenarios.every((scenario) => document.dtos.some((dto) => dto.scenario === scenario)), 'required DTO scenario missing', errors);
  ensure(unique(document.dtos.map((dto) => dto.dtoId)), 'DTO IDs must be unique', errors);
  for (const dto of document.dtos) {
    try { validateTaxonomyAssignment(dto.taxonomy, taxonomy, `${dto.dtoId}.taxonomy`, { partial: true }); } catch (error) { errors.push(...error.errors); }
    validateAudience(dto.audienceAndApplicability, taxonomy, `${dto.dtoId}.audienceAndApplicability`, errors);
    validateAccess(dto.access, taxonomy, `${dto.dtoId}.access`, errors);
    validateRights(dto.rights, taxonomy, `${dto.dtoId}.rights`, errors);
    validateReview(dto.review, taxonomy, `${dto.dtoId}.review`, errors);
    ensure(dto.review.rightsReview === dto.rights.reviewStatus, `${dto.dtoId}: rights review mismatch`, errors);
    validatePublicationGate(dto.rights, dto.review, dto.dtoId, errors);
    const rowIds = dto.sourceRows.map((row) => row.sourceRowId);
    const itemIds = dto.items.map((entry) => entry.itemId);
    const stepIds = dto.steps.map((entry) => entry.stepId);
    const sourceRefIds = dto.sourceReferences.map((entry) => entry.sourceRefId);
    const omittedRowIds = dto.omittedRows.map((entry) => entry.sourceRowId);
    ensure(unique(rowIds), `${dto.dtoId}: SourceRow IDs must be unique`, errors);
    ensure(unique(itemIds), `${dto.dtoId}: Item IDs must be unique`, errors);
    ensure(unique(stepIds), `${dto.dtoId}: Step IDs must be unique`, errors);
    ensure(unique(sourceRefIds), `${dto.dtoId}: SourceReference IDs must be unique`, errors);
    ensure(unique(omittedRowIds), `${dto.dtoId}: omitted SourceRow IDs must be unique`, errors);
    ensure(dto.flow.flowId && unique(dto.flow.stepIds), `${dto.dtoId}: Flow identity and unique Step refs required`, errors);
    ensure(dto.flow.stepIds.length === stepIds.length && dto.flow.stepIds.every((id) => stepIds.includes(id)), `${dto.dtoId}: Flow/Step membership mismatch`, errors);
    ensure(unique(dto.steps.map((entry) => entry.order)), `${dto.dtoId}: Step order must be unique`, errors);
    dto.sourceRows.forEach((row) => {
      ensure(row.sourceId === dto.source.sourceId, `${dto.dtoId}: SourceRow ${row.sourceRowId} sourceId mismatch`, errors);
      ensure(row.snapshotId === dto.source.snapshot.snapshotId, `${dto.dtoId}: SourceRow ${row.sourceRowId} snapshot mismatch`, errors);
      checkEnum(row.rowType, ['date', 'offset', 'check', 'table_row', 'procedure', 'resource', 'reference'], `${dto.dtoId}.${row.sourceRowId}.rowType`, errors);
    });
    dto.sourceReferences.forEach((reference) => {
      reference.sourceRowIds.forEach((rowId) => ensure(rowIds.includes(rowId), `${dto.dtoId}: SourceReference ${reference.sourceRefId} references missing SourceRow ${rowId}`, errors));
      if (reference.entityType === 'item') ensure(itemIds.includes(reference.entityId), `${dto.dtoId}: SourceReference ${reference.sourceRefId} references missing Item`, errors);
    });
    dto.omittedRows.forEach((entry) => ensure(rowIds.includes(entry.sourceRowId), `${dto.dtoId}: omitted row ${entry.sourceRowId} does not exist`, errors));
    dto.items.forEach((entry) => {
      ensure(stepIds.includes(entry.stepId), `${dto.dtoId}: Item ${entry.itemId} references missing Step`, errors);
      ensure(Array.isArray(entry.sourceRefIds) && entry.sourceRefIds.length > 0, `${dto.dtoId}: Item ${entry.itemId} requires SourceReference refs`, errors);
      entry.sourceRefIds.forEach((refId) => ensure(sourceRefIds.includes(refId), `${dto.dtoId}: Item ${entry.itemId} references missing SourceReference ${refId}`, errors));
      checkEnum(entry.intent, taxonomy.enums.itemIntents, `${dto.dtoId}.${entry.itemId}.intent`, errors);
      if (entry.schedule) checkEnum(entry.schedule.mode, taxonomy.enums.scheduleModes, `${dto.dtoId}.${entry.itemId}.schedule.mode`, errors);
      checkEnum(entry.completion.mode, taxonomy.enums.completionModes, `${dto.dtoId}.${entry.itemId}.completion.mode`, errors);
    });
    dto.steps.forEach((entry) => {
      ensure(entry.flowId === dto.flow.flowId, `${dto.dtoId}: Step ${entry.stepId} flowId mismatch`, errors);
      ensure(unique(entry.itemIds), `${dto.dtoId}: Step ${entry.stepId} repeats an Item`, errors);
      ensure(unique(entry.itemIds.map((id) => dto.items.find((itemValue) => itemValue.itemId === id)?.order)), `${dto.dtoId}: Item order must be unique within Step ${entry.stepId}`, errors);
      entry.itemIds.forEach((itemId) => ensure(itemIds.includes(itemId), `${dto.dtoId}: Step references missing Item ${itemId}`, errors));
    });
    dto.items.forEach((entry) => {
      const memberships = dto.steps.filter((stepValue) => stepValue.itemIds.includes(entry.itemId));
      ensure(memberships.length === 1, `${dto.dtoId}: Item ${entry.itemId} must appear in exactly one Step`, errors);
      ensure(memberships[0]?.stepId === entry.stepId, `${dto.dtoId}: Item ${entry.itemId} Step membership disagrees with stepId`, errors);
    });
    if (dto.review.sourceRowStatus === 'complete') rowIds.forEach((rowId) => ensure(dto.sourceReferences.some((entry) => entry.sourceRowIds.includes(rowId)) || omittedRowIds.includes(rowId), `${dto.dtoId}: complete SourceRow ${rowId} is neither mapped nor omitted`, errors));
    if (dto.taxonomy.primaryArtifact === 'calendar') ensure(dto.items.some((entry) => entry.schedule), `${dto.dtoId}: calendar primary needs a source/user schedule`, errors);
    if (dto.taxonomy.secondaryArtifacts.includes('calendar')) ensure(dto.items.some((entry) => entry.schedule), `${dto.dtoId}: calendar secondary needs a source/user schedule`, errors);
    const projectionKeys = Object.keys(dto.projectionPreview).sort();
    ensure(JSON.stringify(projectionKeys) === JSON.stringify(['calendar', 'checklist', 'memo', 'sheet', 'todo']), `${dto.dtoId}: all five projections required`, errors);
    if (!['hold', 'source_import_required'].includes(dto.review.conversionReadiness)) ensure(dto.projectionPreview[dto.taxonomy.primaryArtifact].availability === 'primary', `${dto.dtoId}: primary artifact projection mismatch`, errors);
    if (dto.review.conversionReadiness === 'source_import_required') {
      ensure(dto.items.length === 0, `${dto.dtoId}: source_import_required cannot fabricate Items`, errors);
      ensure(dto.review.blockers.includes('source_import_required') || dto.review.blockers.includes('source_incomplete'), `${dto.dtoId}: source import blocker required`, errors);
    }
    const canonicalString = JSON.stringify({ taxonomy: dto.taxonomy, sourceRows: dto.sourceRows, sourceReferences: dto.sourceReferences, items: dto.items });
    ['"category"', 'structure_type', 'primary_destination', '"hybrid"'].forEach((needle) => ensure(!canonicalString.includes(needle), `${dto.dtoId}: legacy value/key leaked: ${needle}`, errors));
  }
  if (errors.length) throw new ContractValidationError('backend DTO collection failed', errors);
  return true;
}

export function validateLegacyMapping(document) {
  const errors = [];
  ensure(document.documentType === 'flowme_legacy_mapping', 'legacy mapping documentType', errors);
  ensure(document.schemaVersion === 'flowme-taxonomy-v1.1', 'legacy mapping schemaVersion', errors);
  ensure(document.inventory.bundleCount === 153, 'legacy bundleCount must be 153', errors);
  ensure(document.inventory.itemCount === 847, 'legacy itemCount must be 847', errors);
  ensure(Object.values(document.inventory.structureTypes).reduce((sum, value) => sum + value, 0) === 153, 'legacy structure counts must reconcile', errors);
  ensure(Object.values(document.inventory.primaryDestinations).reduce((sum, value) => sum + value, 0) === 153, 'legacy destination counts must reconcile', errors);
  ensure(document.metrics.category.automaticBundleCandidates + document.metrics.category.proposalOnlyBundles + document.metrics.category.humanReviewBundles === 153, 'category mapping counts must reconcile', errors);
  ensure(document.metrics.executionPattern.automaticBundleCandidates + document.metrics.executionPattern.proposalOnlyBundles + document.metrics.executionPattern.humanReviewBundles === 153, 'execution mapping counts must reconcile', errors);
  ensure(document.metrics.primaryArtifact.automaticBundleCandidates + document.metrics.primaryArtifact.proposalOnlyBundles + document.metrics.primaryArtifact.humanReviewBundles === 153, 'artifact mapping counts must reconcile', errors);
  ensure(document.mappings.primary_destination.rules.hybrid.canonicalPrimaryArtifact === null, 'legacy hybrid must require primary re-decision', errors);
  ensure(document.mappings.primary_destination.rules.internal_check.decision === 'proposal_only', 'internal_check delivery surface must remain a proposal', errors);
  ensure(document.metrics.allThreeLegacyAxes.automaticBundleCandidates === 0, 'no full three-axis mapping is automatic without user-outcome evidence', errors);
  ensure(document.mappings['item.type'].directAutomaticCount === 0, 'raw Item type must have zero direct mappings', errors);
  if (errors.length) throw new ContractValidationError('legacy mapping failed', errors);
  return true;
}

export function validateComparison(document) {
  const errors = [];
  ensure(document.documentType === 'flowme_classification_comparison', 'comparison documentType', errors);
  ensure(document.schemaVersion === 'flowme-taxonomy-v1.1', 'comparison schemaVersion', errors);
  ensure(Array.isArray(document.rounds) && document.rounds.length >= 2 && document.rounds.length <= 3, 'comparison requires 2-3 rounds', errors);
  ensure(Array.isArray(document.cases) && document.cases.length === 20, 'comparison requires 20 frozen cases', errors);
  ['lifeArea', 'sourceShape', 'executionPattern', 'primaryArtifact'].forEach((axis) => ensure(document.finalMetrics.coreAxes[axis] >= 85, `final ${axis} agreement below 85%`, errors));
  ensure(typeof document.finalMetrics.exactMatch === 'number', 'final exactMatch required', errors);
  ensure(document.cases.every((entry) => entry.finalDecision && entry.disagreementCause && entry.finalRule), 'each comparison case needs cause, decision and final rule', errors);
  ensure(/not observed-user validation/i.test(document.validationBoundary), 'comparison must disclaim user validation', errors);
  if (errors.length) throw new ContractValidationError('classification comparison failed', errors);
  return true;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function loadDocuments(baseDir = here) {
  return {
    taxonomy: readJson(path.join(baseDir, 'taxonomy-v1.1.json')),
    schema: readJson(path.join(baseDir, 'taxonomy-v1.1.schema.json')),
    reclassification: readJson(path.join(baseDir, 'reclassified-content-v1.json')),
    mapping: readJson(path.join(baseDir, 'legacy-mapping-v1.json')),
    dtos: readJson(path.join(baseDir, 'representative-backend-dto-v1.json')),
    comparison: readJson(path.join(baseDir, 'classification-comparison-v1.json')),
  };
}

export function validateAll(documents = loadDocuments()) {
  const checks = [];
  const run = (name, fn) => {
    fn();
    checks.push({ name, status: 'PASS' });
  };
  run('five representative JSON documents ↔ Draft 2020-12 schema subset', () => {
    for (const [name, document] of Object.entries({
      taxonomy: documents.taxonomy,
      reclassification: documents.reclassification,
      mapping: documents.mapping,
      dtos: documents.dtos,
      comparison: documents.comparison,
    })) validateAgainstSchema(document, documents.schema, name);
  });
  run('taxonomy catalog ↔ JSON Schema enum parity', () => validateTaxonomyCatalog(documents.taxonomy, documents.schema));
  run('84-record reclassification', () => validateReclassification(documents.reclassification, documents.taxonomy));
  run('153-bundle legacy mapping reconciliation', () => validateLegacyMapping(documents.mapping));
  run('10 backend DTOs and SourceRow/Item integrity', () => validateBackendDtoCollection(documents.dtos, documents.taxonomy));
  run('two-round independent classification comparison', () => validateComparison(documents.comparison));
  return {
    schemaVersion: documents.taxonomy.schemaVersion,
    checks,
    counts: {
      reclassifiedRecords: documents.reclassification.records.length,
      backendDtos: documents.dtos.dtos.length,
      sourceRows: documents.dtos.dtos.reduce((sum, dto) => sum + dto.sourceRows.length, 0),
      items: documents.dtos.dtos.reduce((sum, dto) => sum + dto.items.length, 0),
      comparisonCases: documents.comparison.cases.length,
    },
  };
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  try {
    console.log(JSON.stringify(validateAll(), null, 2));
  } catch (error) {
    console.error(error.message);
    for (const detail of error.errors || []) console.error(`- ${detail}`);
    process.exitCode = 1;
  }
}
