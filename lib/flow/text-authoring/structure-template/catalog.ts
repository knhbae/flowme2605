import bundledCatalogSnapshot from "./snapshots/catalog-v1/flow-structure-template-catalog-v1.json";
import {
  STRUCTURE_TEMPLATE_DRAFT_SCHEMA_VERSION,
  type StructureTemplateCatalog,
  type StructureTemplateCatalogValidationIssue,
  type StructureTemplateCatalogValidationResult,
} from "./types";

type UnknownRecord = Record<string, unknown>;

const REQUIRED_DRAFT_KEYS = [
  "draftId",
  "templateId",
  "templateVersion",
  "sourceFingerprint",
  "values",
  "groups",
  "dismissedSlots",
  "materialized",
  "revision",
  "updatedAt",
] as const;

const REQUIRED_GROUP_INSTANCE_KEYS = [
  "instanceId",
  "groupId",
  "order",
  "values",
  "children",
] as const;

const SUPPORTED_FIELD_TYPES = new Set([
  "short_text",
  "long_text",
  "date",
  "time",
  "timezone",
  "positive_integer",
  "relative_day_offset",
  "weekday_set",
  "url",
  "enum",
  "check_rows",
]);

const SUPPORTED_COMPILER_BY_ARCHETYPE: ReadonlyMap<string, string> = new Map([
  ["recurring_routine", "compile_recurring_routine_v1"],
  ["date_preparation", "compile_date_preparation_v1"],
  ["itinerary_preparation", "compile_itinerary_preparation_v1"],
] as const);

const SUPPORTED_REQUIRED_AT = new Set([
  "flow_confirm",
  "group_materialization",
  "item_materialization",
  "never",
  "offset_schedule",
  "recurring_materialization",
  "scheduled_materialization",
  "when_absolute",
  "when_anchor_offset",
  "when_departure_offset",
  "when_end_mode_count",
  "when_end_mode_until",
  "when_group_has_items",
  "when_time_exists",
]);

const SUPPORTED_PRIMARY_ARTIFACTS = new Set([
  "calendar",
  "todo",
  "sheet",
  "memo",
]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addIssue(
  issues: StructureTemplateCatalogValidationIssue[],
  code: string,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function stringAt(
  record: UnknownRecord,
  key: string,
  path: string,
  issues: StructureTemplateCatalogValidationIssue[],
): string | undefined {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    addIssue(issues, "invalid_string", `${path}.${key}`, "Expected a non-empty string.");
    return undefined;
  }
  return value;
}

function booleanAt(
  record: UnknownRecord,
  key: string,
  path: string,
  issues: StructureTemplateCatalogValidationIssue[],
): boolean | undefined {
  const value = record[key];
  if (typeof value !== "boolean") {
    addIssue(issues, "invalid_boolean", `${path}.${key}`, "Expected a boolean.");
    return undefined;
  }
  return value;
}

function arrayAt(
  record: UnknownRecord,
  key: string,
  path: string,
  issues: StructureTemplateCatalogValidationIssue[],
): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    addIssue(issues, "invalid_array", `${path}.${key}`, "Expected an array.");
    return [];
  }
  return value;
}

function recordAt(
  record: UnknownRecord,
  key: string,
  path: string,
  issues: StructureTemplateCatalogValidationIssue[],
): UnknownRecord | undefined {
  const value = record[key];
  if (!isRecord(value)) {
    addIssue(issues, "invalid_object", `${path}.${key}`, "Expected an object.");
    return undefined;
  }
  return value;
}

function stringArray(
  value: unknown,
  path: string,
  issues: StructureTemplateCatalogValidationIssue[],
): string[] {
  if (!Array.isArray(value)) {
    addIssue(issues, "invalid_array", path, "Expected an array of strings.");
    return [];
  }
  const result: string[] = [];
  value.forEach((entry, index) => {
    if (typeof entry !== "string" || entry.trim() === "") {
      addIssue(
        issues,
        "invalid_string",
        `${path}[${index}]`,
        "Expected a non-empty string.",
      );
      return;
    }
    result.push(entry);
  });
  return result;
}

function validateUniqueStrings(
  values: readonly string[],
  path: string,
  code: string,
  issues: StructureTemplateCatalogValidationIssue[],
): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      addIssue(issues, code, `${path}[${index}]`, `Duplicate value: ${value}`);
    }
    seen.add(value);
  });
}

function validateRule(
  value: unknown,
  path: string,
  seenCodes: Set<string>,
  issues: StructureTemplateCatalogValidationIssue[],
): void {
  if (!isRecord(value)) {
    addIssue(issues, "invalid_rule", path, "Expected a validation rule object.");
    return;
  }
  const code = stringAt(value, "code", path, issues);
  stringAt(value, "when", path, issues);
  stringAt(value, "rule", path, issues);
  stringAt(value, "message", path, issues);
  if (!code) return;
  if (!/^[A-Z][A-Z0-9_]*$/u.test(code)) {
    addIssue(issues, "invalid_rule_code", `${path}.code`, `Invalid rule code: ${code}`);
  }
  if (seenCodes.has(code)) {
    addIssue(issues, "duplicate_rule_code", `${path}.code`, `Duplicate rule code: ${code}`);
  }
  seenCodes.add(code);
}

function validateField(
  value: unknown,
  path: string,
  knownFieldTypes: Set<string>,
  knownBindings: Set<string>,
  seenSlotIds: Set<string>,
  issues: StructureTemplateCatalogValidationIssue[],
): void {
  if (!isRecord(value)) {
    addIssue(issues, "invalid_field", path, "Expected a field definition object.");
    return;
  }
  const slotId = stringAt(value, "slotId", path, issues);
  stringAt(value, "label", path, issues);
  const fieldType = stringAt(value, "type", path, issues);
  const requiredAt = stringAt(value, "requiredAt", path, issues);
  const binding = stringAt(value, "sourceBinding", path, issues);

  if (slotId) {
    if (seenSlotIds.has(slotId)) {
      addIssue(issues, "duplicate_slot_id", `${path}.slotId`, `Duplicate slot ID: ${slotId}`);
    }
    seenSlotIds.add(slotId);
  }
  if (fieldType && !knownFieldTypes.has(fieldType)) {
    addIssue(
      issues,
      "unknown_field_type",
      `${path}.type`,
      `Unknown field type: ${fieldType}`,
    );
  }
  if (requiredAt && !SUPPORTED_REQUIRED_AT.has(requiredAt)) {
    addIssue(
      issues,
      "unsupported_required_at",
      `${path}.requiredAt`,
      `Unsupported P0.2 requiredAt condition: ${requiredAt}`,
    );
  }
  if (binding && !knownBindings.has(binding)) {
    addIssue(
      issues,
      "unknown_source_binding",
      `${path}.sourceBinding`,
      `Unknown source binding: ${binding}`,
    );
  }
  if (fieldType === "enum") {
    const options = stringArray(value.options, `${path}.options`, issues);
    if (options.length === 0) {
      addIssue(issues, "empty_enum_options", `${path}.options`, "Enum fields need options.");
    }
    validateUniqueStrings(options, `${path}.options`, "duplicate_enum_option", issues);
  }
  if (value.unit !== undefined && (typeof value.unit !== "string" || value.unit === "")) {
    addIssue(issues, "invalid_unit", `${path}.unit`, "Expected a non-empty unit string.");
  }
}

type GroupDefinitionIndex = Map<string, UnknownRecord>;

function validateGroups(
  values: unknown[],
  path: string,
  knownFieldTypes: Set<string>,
  knownBindings: Set<string>,
  seenGroupIds: Set<string>,
  seenSlotIds: Set<string>,
  issues: StructureTemplateCatalogValidationIssue[],
): GroupDefinitionIndex {
  const definitions: GroupDefinitionIndex = new Map();
  values.forEach((value, index) => {
    const groupPath = `${path}[${index}]`;
    if (!isRecord(value)) {
      addIssue(issues, "invalid_group", groupPath, "Expected a group definition object.");
      return;
    }
    const groupId = stringAt(value, "groupId", groupPath, issues);
    stringAt(value, "label", groupPath, issues);
    booleanAt(value, "repeatable", groupPath, issues);
    const minAtConfirm = value.minAtConfirm;
    if (!Number.isSafeInteger(minAtConfirm) || Number(minAtConfirm) < 0) {
      addIssue(
        issues,
        "invalid_min_at_confirm",
        `${groupPath}.minAtConfirm`,
        "Expected a non-negative safe integer.",
      );
    }
    if (groupId) {
      if (seenGroupIds.has(groupId)) {
        addIssue(
          issues,
          "duplicate_group_id",
          `${groupPath}.groupId`,
          `Duplicate group ID: ${groupId}`,
        );
      }
      seenGroupIds.add(groupId);
      definitions.set(groupId, value);
    }
    const fields = arrayAt(value, "fields", groupPath, issues);
    fields.forEach((field, fieldIndex) =>
      validateField(
        field,
        `${groupPath}.fields[${fieldIndex}]`,
        knownFieldTypes,
        knownBindings,
        seenSlotIds,
        issues,
      ),
    );
    if (value.childGroups !== undefined) {
      const childGroups = arrayAt(value, "childGroups", groupPath, issues);
      const childDefinitions = validateGroups(
        childGroups,
        `${groupPath}.childGroups`,
        knownFieldTypes,
        knownBindings,
        seenGroupIds,
        seenSlotIds,
        issues,
      );
      childDefinitions.forEach((definition, childId) => definitions.set(childId, definition));
    }
  });
  return definitions;
}

function childGroupMap(group: UnknownRecord): Map<string, UnknownRecord> {
  const result = new Map<string, UnknownRecord>();
  if (!Array.isArray(group.childGroups)) return result;
  group.childGroups.forEach((child) => {
    if (isRecord(child) && typeof child.groupId === "string") {
      result.set(child.groupId, child);
    }
  });
  return result;
}

function validateSeedGroups(
  seeds: unknown[],
  definitions: Map<string, UnknownRecord>,
  path: string,
  issues: StructureTemplateCatalogValidationIssue[],
): void {
  const seen = new Set<string>();
  seeds.forEach((seed, index) => {
    const seedPath = `${path}[${index}]`;
    if (!isRecord(seed)) {
      addIssue(issues, "invalid_seed_group", seedPath, "Expected a seed group object.");
      return;
    }
    const groupId = stringAt(seed, "groupId", seedPath, issues);
    if (!groupId) return;
    if (seen.has(groupId)) {
      addIssue(
        issues,
        "duplicate_seed_group",
        `${seedPath}.groupId`,
        `Duplicate seed group: ${groupId}`,
      );
    }
    seen.add(groupId);
    const definition = definitions.get(groupId);
    if (!definition) {
      addIssue(
        issues,
        "unknown_seed_group",
        `${seedPath}.groupId`,
        `Unknown seed group: ${groupId}`,
      );
      return;
    }
    const childSeeds = seed.childSeeds === undefined
      ? []
      : Array.isArray(seed.childSeeds)
        ? seed.childSeeds
        : undefined;
    if (!childSeeds) {
      addIssue(issues, "invalid_array", `${seedPath}.childSeeds`, "Expected an array.");
      return;
    }
    validateSeedGroups(
      childSeeds,
      childGroupMap(definition),
      `${seedPath}.childSeeds`,
      issues,
    );
  });
}

function validateRequiredContractKeys(
  actual: readonly string[],
  expected: readonly string[],
  path: string,
  issues: StructureTemplateCatalogValidationIssue[],
): void {
  const values = new Set(actual);
  expected.forEach((key) => {
    if (!values.has(key)) {
      addIssue(issues, "missing_contract_key", path, `Missing required contract key: ${key}`);
    }
  });
}

export function validateStructureTemplateCatalog(
  value: unknown,
): StructureTemplateCatalogValidationResult {
  const issues: StructureTemplateCatalogValidationIssue[] = [];
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{ code: "invalid_catalog", path: "$", message: "Expected a catalog object." }],
    };
  }

  stringAt(value, "catalogVersion", "$", issues);
  const templateContractVersion = stringAt(value, "templateContractVersion", "$", issues);
  stringAt(value, "status", "$", issues);

  const sourceSafety = recordAt(value, "sourceSafety", "$", issues);
  if (sourceSafety) {
    if (sourceSafety.selectionMutatesRawText !== false) {
      addIssue(
        issues,
        "unsafe_selection_contract",
        "$.sourceSafety.selectionMutatesRawText",
        "Template selection must not mutate raw text.",
      );
    }
    if (sourceSafety.draftInputMutatesRawText !== false) {
      addIssue(
        issues,
        "unsafe_input_contract",
        "$.sourceSafety.draftInputMutatesRawText",
        "Draft input must not mutate raw text.",
      );
    }
    if (sourceSafety.materializationMode !== "single_transaction") {
      addIssue(
        issues,
        "invalid_materialization_mode",
        "$.sourceSafety.materializationMode",
        "Materialization must be one transaction.",
      );
    }
    if (sourceSafety.sourceFingerprintMismatch !== "fail_closed") {
      addIssue(
        issues,
        "unsafe_fingerprint_contract",
        "$.sourceSafety.sourceFingerprintMismatch",
        "Fingerprint mismatch must fail closed.",
      );
    }
    if (sourceSafety.researchEvidenceBecomesContentSource !== false) {
      addIssue(
        issues,
        "unsafe_research_source_contract",
        "$.sourceSafety.researchEvidenceBecomesContentSource",
        "Research evidence must not become source content.",
      );
    }
  }

  const draftContract = recordAt(value, "structureDraftContract", "$", issues);
  const seenRuleCodes = new Set<string>();
  if (draftContract) {
    const schemaVersion = stringAt(draftContract, "schemaVersion", "$.structureDraftContract", issues);
    if (
      schemaVersion !== undefined &&
      schemaVersion !== STRUCTURE_TEMPLATE_DRAFT_SCHEMA_VERSION
    ) {
      addIssue(
        issues,
        "unsupported_contract_version",
        "$.structureDraftContract.schemaVersion",
        `Expected ${STRUCTURE_TEMPLATE_DRAFT_SCHEMA_VERSION}.`,
      );
    }
    if (templateContractVersion && schemaVersion !== templateContractVersion) {
      addIssue(
        issues,
        "contract_version_mismatch",
        "$.templateContractVersion",
        "Catalog and StructureDraft contract versions must match.",
      );
    }
    const required = stringArray(
      draftContract.required,
      "$.structureDraftContract.required",
      issues,
    );
    const groupRequired = stringArray(
      draftContract.groupInstanceRequired,
      "$.structureDraftContract.groupInstanceRequired",
      issues,
    );
    validateUniqueStrings(required, "$.structureDraftContract.required", "duplicate_contract_key", issues);
    validateUniqueStrings(
      groupRequired,
      "$.structureDraftContract.groupInstanceRequired",
      "duplicate_contract_key",
      issues,
    );
    validateRequiredContractKeys(
      required,
      REQUIRED_DRAFT_KEYS,
      "$.structureDraftContract.required",
      issues,
    );
    validateRequiredContractKeys(
      groupRequired,
      REQUIRED_GROUP_INSTANCE_KEYS,
      "$.structureDraftContract.groupInstanceRequired",
      issues,
    );
    arrayAt(draftContract, "sharedValidationRules", "$.structureDraftContract", issues).forEach(
      (rule, index) =>
        validateRule(
          rule,
          `$.structureDraftContract.sharedValidationRules[${index}]`,
          seenRuleCodes,
          issues,
        ),
    );
  }

  const ruleCodeContract = recordAt(value, "validationRuleCodeContract", "$", issues);
  if (ruleCodeContract) {
    if (ruleCodeContract.defaultSeverity !== "error") {
      addIssue(
        issues,
        "invalid_default_severity",
        "$.validationRuleCodeContract.defaultSeverity",
        "The P0.2 default severity must be error.",
      );
    }
    if (ruleCodeContract.duplicateCodesAllowed !== false) {
      addIssue(
        issues,
        "unsafe_duplicate_rule_contract",
        "$.validationRuleCodeContract.duplicateCodesAllowed",
        "Duplicate rule codes must be forbidden.",
      );
    }
  }

  const sourceContract = recordAt(value, "sourceMaterializationContract", "$", issues);
  const bindingKeys = new Set<string>();
  if (sourceContract) {
    stringAt(sourceContract, "grammarVersion", "$.sourceMaterializationContract", issues);
    if (sourceContract.generationBindingsWriteSource !== false) {
      addIssue(
        issues,
        "unsafe_generation_binding_contract",
        "$.sourceMaterializationContract.generationBindingsWriteSource",
        "Generation-only bindings must not write source.",
      );
    }
    if (sourceContract.materializationMode !== "single_transaction") {
      addIssue(
        issues,
        "invalid_materialization_mode",
        "$.sourceMaterializationContract.materializationMode",
        "Materialization must be one transaction.",
      );
    }
    const bindings = recordAt(
      sourceContract,
      "bindings",
      "$.sourceMaterializationContract",
      issues,
    );
    if (bindings) {
      Object.entries(bindings).forEach(([binding, pattern]) => {
        bindingKeys.add(binding);
        if (typeof pattern !== "string" || pattern.trim() === "") {
          addIssue(
            issues,
            "invalid_binding_pattern",
            `$.sourceMaterializationContract.bindings.${binding}`,
            "Expected a non-empty binding pattern.",
          );
        }
      });
    }
    stringArray(
      sourceContract.controlBindings,
      "$.sourceMaterializationContract.controlBindings",
      issues,
    ).forEach((binding) => bindingKeys.add(binding));
  }

  const fieldTypes = stringArray(value.fieldTypes, "$.fieldTypes", issues);
  validateUniqueStrings(fieldTypes, "$.fieldTypes", "duplicate_field_type", issues);
  fieldTypes.forEach((fieldType, index) => {
    if (!SUPPORTED_FIELD_TYPES.has(fieldType)) {
      addIssue(
        issues,
        "unsupported_field_type",
        `$.fieldTypes[${index}]`,
        `Unsupported P0.2 field type: ${fieldType}`,
      );
    }
  });
  SUPPORTED_FIELD_TYPES.forEach((fieldType) => {
    if (!fieldTypes.includes(fieldType)) {
      addIssue(
        issues,
        "missing_field_type",
        "$.fieldTypes",
        `Missing P0.2 field type: ${fieldType}`,
      );
    }
  });
  const knownFieldTypes = new Set(fieldTypes);

  const archetypeIds = new Set<string>();
  const compilerIds = new Set<string>();
  const archetypes = arrayAt(value, "archetypes", "$", issues);
  archetypes.forEach((archetype, index) => {
    const path = `$.archetypes[${index}]`;
    if (!isRecord(archetype)) {
      addIssue(issues, "invalid_archetype", path, "Expected an archetype object.");
      return;
    }
    const archetypeId = stringAt(archetype, "archetypeId", path, issues);
    const compilerId = stringAt(archetype, "compilerId", path, issues);
    stringAt(archetype, "label", path, issues);
    stringAt(archetype, "sourceShape", path, issues);
    if (archetype.windowStrategies !== undefined) {
      stringArray(archetype.windowStrategies, `${path}.windowStrategies`, issues);
    }
    stringArray(archetype.canonicalRules, `${path}.canonicalRules`, issues);
    if (archetypeId) {
      if (archetypeIds.has(archetypeId)) {
        addIssue(
          issues,
          "duplicate_archetype_id",
          `${path}.archetypeId`,
          `Duplicate archetype ID: ${archetypeId}`,
        );
      }
      if (!SUPPORTED_COMPILER_BY_ARCHETYPE.has(archetypeId)) {
        addIssue(
          issues,
          "unsupported_archetype_id",
          `${path}.archetypeId`,
          `Unsupported P0.2 archetype ID: ${archetypeId}`,
        );
      }
      archetypeIds.add(archetypeId);
    }
    if (compilerId) {
      if (compilerIds.has(compilerId)) {
        addIssue(
          issues,
          "duplicate_compiler_id",
          `${path}.compilerId`,
          `Duplicate compiler ID: ${compilerId}`,
        );
      }
      compilerIds.add(compilerId);
      const supportedCompiler = archetypeId
        ? SUPPORTED_COMPILER_BY_ARCHETYPE.get(archetypeId)
        : undefined;
      if (supportedCompiler && compilerId !== supportedCompiler) {
        addIssue(
          issues,
          "unsupported_compiler_id",
          `${path}.compilerId`,
          `Expected ${supportedCompiler} for ${archetypeId}.`,
        );
      }
    }
  });

  const templateIds = new Set<string>();
  const templates = arrayAt(value, "templates", "$", issues);
  templates.forEach((template, index) => {
    const path = `$.templates[${index}]`;
    if (!isRecord(template)) {
      addIssue(issues, "invalid_template", path, "Expected a template object.");
      return;
    }
    const templateId = stringAt(template, "templateId", path, issues);
    const version = stringAt(template, "version", path, issues);
    const archetypeId = stringAt(template, "archetypeId", path, issues);
    stringAt(template, "status", path, issues);
    stringAt(template, "categoryId", path, issues);
    stringAt(template, "categoryLabel", path, issues);
    stringAt(template, "lifeArea", path, issues);
    stringAt(template, "label", path, issues);
    stringAt(template, "userNeed", path, issues);
    stringArray(template.planningPatterns, `${path}.planningPatterns`, issues);
    if (template.windowStrategy !== undefined) {
      if (typeof template.windowStrategy !== "string" || template.windowStrategy === "") {
        addIssue(
          issues,
          "invalid_window_strategy",
          `${path}.windowStrategy`,
          "Expected a non-empty window strategy.",
        );
      }
    }
    if (templateId) {
      if (templateIds.has(templateId)) {
        addIssue(
          issues,
          "duplicate_template_id",
          `${path}.templateId`,
          `Duplicate template ID: ${templateId}`,
        );
      }
      templateIds.add(templateId);
    }
    if (version && !/^\d+\.\d+\.\d+$/u.test(version)) {
      addIssue(issues, "invalid_template_version", `${path}.version`, `Invalid version: ${version}`);
    }
    if (archetypeId && !archetypeIds.has(archetypeId)) {
      addIssue(
        issues,
        "unknown_archetype_id",
        `${path}.archetypeId`,
        `Unknown archetype ID: ${archetypeId}`,
      );
    }

    const seenSlotIds = new Set<string>();
    arrayAt(template, "setupFields", path, issues).forEach((field, fieldIndex) =>
      validateField(
        field,
        `${path}.setupFields[${fieldIndex}]`,
        knownFieldTypes,
        bindingKeys,
        seenSlotIds,
        issues,
      ),
    );

    const rootGroups = arrayAt(template, "groups", path, issues);
    const rootDefinitions = new Map<string, UnknownRecord>();
    rootGroups.forEach((group) => {
      if (isRecord(group) && typeof group.groupId === "string") {
        rootDefinitions.set(group.groupId, group);
      }
    });
    validateGroups(
      rootGroups,
      `${path}.groups`,
      knownFieldTypes,
      bindingKeys,
      new Set<string>(),
      seenSlotIds,
      issues,
    );

    const defaults = recordAt(template, "instanceDefaults", path, issues);
    if (defaults) {
      recordAt(defaults, "values", `${path}.instanceDefaults`, issues);
      const instantiateWithStableIds = booleanAt(
        defaults,
        "instantiateWithStableIds",
        `${path}.instanceDefaults`,
        issues,
      );
      if (instantiateWithStableIds === false) {
        addIssue(
          issues,
          "unstable_instance_ids",
          `${path}.instanceDefaults.instantiateWithStableIds`,
          "P0.2 group instances must use stable IDs.",
        );
      }
      const seedGroups = arrayAt(defaults, "seedGroups", `${path}.instanceDefaults`, issues);
      validateSeedGroups(seedGroups, rootDefinitions, `${path}.instanceDefaults.seedGroups`, issues);
    }

    arrayAt(template, "validationRules", path, issues).forEach((rule, ruleIndex) =>
      validateRule(rule, `${path}.validationRules[${ruleIndex}]`, seenRuleCodes, issues),
    );
    const projectionPolicy = recordAt(template, "projectionPolicy", path, issues);
    if (projectionPolicy) {
      const primary = stringAt(
        projectionPolicy,
        "fixtureExpectedPrimary",
        `${path}.projectionPolicy`,
        issues,
      );
      if (primary && !SUPPORTED_PRIMARY_ARTIFACTS.has(primary)) {
        addIssue(
          issues,
          "unsupported_primary_artifact",
          `${path}.projectionPolicy.fixtureExpectedPrimary`,
          `Unsupported primary artifact: ${primary}`,
        );
      }
      stringAt(projectionPolicy, "primaryRule", `${path}.projectionPolicy`, issues);
      stringArray(
        projectionPolicy.offeredArtifacts,
        `${path}.projectionPolicy.offeredArtifacts`,
        issues,
      );
      stringArray(
        projectionPolicy.optionalWhenEligible,
        `${path}.projectionPolicy.optionalWhenEligible`,
        issues,
      );
      stringArray(
        projectionPolicy.notOffered,
        `${path}.projectionPolicy.notOffered`,
        issues,
      );
    }
    recordAt(template, "materialization", path, issues);
    recordAt(template, "previewFixture", path, issues);
    arrayAt(template, "researchEvidence", path, issues);
    stringArray(template.p0Exclusions, `${path}.p0Exclusions`, issues);
  });

  if (issues.length > 0) return { valid: false, issues };
  return { valid: true, catalog: value as StructureTemplateCatalog, issues: [] };
}

export class StructureTemplateCatalogValidationError extends Error {
  readonly issues: readonly StructureTemplateCatalogValidationIssue[];

  constructor(issues: readonly StructureTemplateCatalogValidationIssue[]) {
    super(
      `Structure template catalog validation failed with ${issues.length} issue(s): ` +
        issues.map((issue) => `${issue.path} ${issue.code}`).join(", "),
    );
    this.name = "StructureTemplateCatalogValidationError";
    this.issues = issues;
  }
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.values(value as UnknownRecord).forEach((entry) => deepFreeze(entry));
  return Object.freeze(value);
}

export function loadStructureTemplateCatalog(value: unknown): StructureTemplateCatalog {
  const result = validateStructureTemplateCatalog(value);
  if (!result.valid) throw new StructureTemplateCatalogValidationError(result.issues);
  return deepFreeze(result.catalog);
}

let bundledCatalog: StructureTemplateCatalog | undefined;

export function loadBundledStructureTemplateCatalog(): StructureTemplateCatalog {
  bundledCatalog ??= loadStructureTemplateCatalog(bundledCatalogSnapshot);
  return bundledCatalog;
}

export const getBundledStructureTemplateCatalog =
  loadBundledStructureTemplateCatalog;

export function findStructureTemplateDefinition(
  catalog: StructureTemplateCatalog,
  templateId: string,
  version?: string,
) {
  return catalog.templates.find(
    (template) =>
      template.templateId === templateId &&
      (version === undefined || template.version === version),
  );
}
