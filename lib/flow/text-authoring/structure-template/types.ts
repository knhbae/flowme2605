export const STRUCTURE_TEMPLATE_DRAFT_SCHEMA_VERSION = "p0.2" as const;

export type StructureTemplateDraftSchemaVersion =
  typeof STRUCTURE_TEMPLATE_DRAFT_SCHEMA_VERSION;

export type StructureTemplateFieldType =
  | "short_text"
  | "long_text"
  | "date"
  | "time"
  | "timezone"
  | "positive_integer"
  | "relative_day_offset"
  | "weekday_set"
  | "url"
  | "enum"
  | "check_rows";

export type StructureTemplateArchetypeId =
  | "recurring_routine"
  | "date_preparation"
  | "itinerary_preparation";

export type StructureTemplateIssueSeverity = "error" | "warning";

export type StructureTemplateIssue = Readonly<{
  code: string;
  severity: StructureTemplateIssueSeverity;
  scopeInstanceId: "root" | string;
  slotId?: string;
  message: string;
}>;

/**
 * A local draft/readiness problem, not a catalog validation issue. Catalog
 * validation codes remain limited to the pinned shared/template rule set.
 */
export type StructureTemplateReadinessProblemKind =
  | "schema_mismatch"
  | "template_mismatch"
  | "duplicate_instance_id"
  | "unknown_group"
  | "invalid_group_order"
  | "unknown_slot"
  | "invalid_field_value"
  | "missing_required_value"
  | "unrepresented_user_value"
  | "no_user_value"
  | "no_materialized_source";

export type StructureTemplateReadinessProblem = Readonly<{
  kind: StructureTemplateReadinessProblemKind;
  scopeInstanceId: "root" | string;
  slotId?: string;
  message: string;
}>;

export type StructureTemplateValue =
  | string
  | number
  | boolean
  | null
  | readonly StructureTemplateValue[]
  | Readonly<{ [key: string]: StructureTemplateValue }>;

export type StructureTemplateValueMap = Readonly<
  Record<string, StructureTemplateValue>
>;

export type StructureTemplateDismissedSlot = Readonly<{
  scopeInstanceId: "root" | string;
  slotId: string;
}>;

export type GroupInstance = Readonly<{
  instanceId: string;
  groupId: string;
  order: number;
  values: StructureTemplateValueMap;
  children: readonly GroupInstance[];
}>;

export type StructureTemplateGroupInstance = GroupInstance;

export type StructureDraftMaterialization = Readonly<{
  transactionId: string;
  at: string;
  sourceRevisionId: string;
  insertedRange: Readonly<{ start: number; end: number }>;
}>;

export type StructureDraft = Readonly<{
  schemaVersion: StructureTemplateDraftSchemaVersion;
  draftId: string;
  templateId: string;
  templateVersion: string;
  sourceFingerprint: string;
  sourceRevisionId?: string;
  values: StructureTemplateValueMap;
  groups: readonly GroupInstance[];
  dismissedSlots: readonly StructureTemplateDismissedSlot[];
  materialized: false | StructureDraftMaterialization;
  revision: number;
  updatedAt: string;
}>;

export type StructureTemplateValidationRule = Readonly<{
  code: string;
  when: string;
  rule: string;
  message: string;
}>;

export type StructureTemplateFieldDefinition = Readonly<{
  slotId: string;
  label: string;
  type: StructureTemplateFieldType;
  requiredAt: string;
  sourceBinding: string;
  unit?: string;
  options?: readonly string[];
}>;

export type StructureTemplateGroupDefinition = Readonly<{
  groupId: string;
  label: string;
  repeatable: boolean;
  minAtConfirm: number;
  fields: readonly StructureTemplateFieldDefinition[];
  childGroups?: readonly StructureTemplateGroupDefinition[];
}>;

export type StructureTemplateSeedGroup = Readonly<{
  groupId: string;
  childSeeds?: readonly StructureTemplateSeedGroup[];
}>;

export type StructureTemplateInstanceDefaults = Readonly<{
  values: StructureTemplateValueMap;
  seedGroups: readonly StructureTemplateSeedGroup[];
  instantiateWithStableIds: boolean;
}>;

export type StructureTemplateProjectionPolicy = Readonly<{
  fixtureExpectedPrimary: "calendar" | "todo" | "sheet" | "memo";
  primaryRule: string;
  offeredArtifacts: readonly string[];
  optionalWhenEligible: readonly string[];
  notOffered: readonly string[];
}>;

export type StructureTemplateDefinition = Readonly<{
  templateId: string;
  version: string;
  status: string;
  categoryId: string;
  categoryLabel: string;
  lifeArea: string;
  planningPatterns: readonly string[];
  label: string;
  archetypeId: StructureTemplateArchetypeId;
  windowStrategy?: string;
  projectionPolicy: StructureTemplateProjectionPolicy;
  userNeed: string;
  instanceDefaults: StructureTemplateInstanceDefaults;
  setupFields: readonly StructureTemplateFieldDefinition[];
  groups: readonly StructureTemplateGroupDefinition[];
  validationRules: readonly StructureTemplateValidationRule[];
  materialization: Readonly<Record<string, unknown>>;
  previewFixture: Readonly<Record<string, unknown>>;
  researchEvidence: readonly unknown[];
  p0Exclusions: readonly string[];
}>;

export type StructureTemplateArchetype = Readonly<{
  archetypeId: StructureTemplateArchetypeId;
  label: string;
  compilerId: string;
  windowStrategies?: readonly string[];
  sourceShape: string;
  canonicalRules: readonly string[];
}>;

export type StructureTemplateSourceSafetyContract = Readonly<{
  selectionMutatesRawText: false;
  draftInputMutatesRawText: false;
  materializationMode: "single_transaction";
  sourceFingerprintMismatch: "fail_closed";
  researchEvidenceBecomesContentSource: false;
  [key: string]: unknown;
}>;

export type StructureDraftContract = Readonly<{
  schemaVersion: StructureTemplateDraftSchemaVersion;
  required: readonly string[];
  groupInstanceRequired: readonly string[];
  sharedValidationRules: readonly StructureTemplateValidationRule[];
  issueContract: Readonly<Record<string, unknown>>;
  userValueCountPolicy: Readonly<Record<string, unknown>>;
  [key: string]: unknown;
}>;

export type StructureTemplateSourceMaterializationContract = Readonly<{
  grammarVersion: string;
  bindings: Readonly<Record<string, string>>;
  generationBindingsWriteSource: false;
  controlBindings: readonly string[];
  materializationMode: "single_transaction";
  [key: string]: unknown;
}>;

export type StructureTemplateValidationRuleCodeContract = Readonly<{
  defaultSeverity: "error";
  duplicateCodesAllowed: false;
  [key: string]: unknown;
}>;

export type StructureTemplateCatalog = Readonly<{
  catalogVersion: string;
  templateContractVersion: StructureTemplateDraftSchemaVersion;
  status: string;
  sourceSafety: StructureTemplateSourceSafetyContract;
  structureDraftContract: StructureDraftContract;
  validationRuleCodeContract: StructureTemplateValidationRuleCodeContract;
  sourceMaterializationContract: StructureTemplateSourceMaterializationContract;
  fieldTypes: readonly StructureTemplateFieldType[];
  archetypes: readonly StructureTemplateArchetype[];
  templates: readonly StructureTemplateDefinition[];
  [key: string]: unknown;
}>;

export type StructureTemplateCatalogValidationIssue = Readonly<{
  code: string;
  path: string;
  message: string;
}>;

export type StructureTemplateCatalogValidationResult =
  | Readonly<{
      valid: true;
      catalog: StructureTemplateCatalog;
      issues: readonly [];
    }>
  | Readonly<{
      valid: false;
      issues: readonly StructureTemplateCatalogValidationIssue[];
    }>;

export type StructureTemplateDerivedValue = Readonly<{
  kind:
    | "first_occurrence"
    | "recurrence_end"
    | "recurrence_count"
    | "resolved_anchor_date";
  sourceSlotKeys: readonly string[];
  value: string | number;
}>;

export type StructureTemplateWeekday =
  | "MO"
  | "TU"
  | "WE"
  | "TH"
  | "FR"
  | "SA"
  | "SU";

export type CompiledStructureTemplateRecurrence = Readonly<{
  weekdays: readonly StructureTemplateWeekday[];
  end:
    | Readonly<{ mode: "until"; date: string }>
    | Readonly<{ mode: "count"; count: number }>;
  occurrenceCount: number;
}>;

export type CompiledStructureTemplateSchedule =
  | Readonly<{ mode: "unscheduled" }>
  | Readonly<{ mode: "absolute"; date: string }>
  | Readonly<{
      mode: "relative";
      dayOffset: number;
      resolvedDate: string;
    }>
  | Readonly<{
      mode: "recurring";
      date: string;
      recurrence: CompiledStructureTemplateRecurrence;
    }>;

export type CompiledStructureTemplateItem = Readonly<{
  instanceId: string;
  title: string;
  schedule?: CompiledStructureTemplateSchedule;
  time?: string;
  timezone?: string;
  durationMinutes?: number;
  place?: string;
  detail?: string;
  doneWhen?: string;
  referenceUrl?: string;
  subchecks: readonly string[];
}>;

export type CompiledStructureTemplateStep = Readonly<{
  instanceId: string;
  /** Missing title means root Items; the existing parser owns its default Step. */
  title?: string;
  items: readonly CompiledStructureTemplateItem[];
}>;

export type CompiledStructureTemplateFlow = Readonly<{
  templateId: string;
  flowTitle: string;
  anchorDate?: string;
  steps: readonly CompiledStructureTemplateStep[];
  derivedValues: readonly StructureTemplateDerivedValue[];
  userValueCount: number;
  generatedCurriculumRows: number;
  forbiddenGeneratedContentCount: number;
}>;

export type SourceMaterializationPlan = Readonly<{
  templateId: string;
  templateVersion: string;
  expectedSourceFingerprint: string;
  nextRawText: string;
  insertedText: string;
  insertedRange: Readonly<{ start: number; end: number }>;
  userValueCount: number;
  itemCount: number;
  /** The editor must apply this plan through one source callback. */
  sourceCallbackCount: 1;
  /** One editor undo restores the entire pre-materialization source. */
  undoCountToRestoreInitial: 1;
  warnings: readonly StructureTemplateIssue[];
  derivedValues: readonly StructureTemplateDerivedValue[];
}>;

export type SourceMaterializationPlanResult =
  | Readonly<{ ok: true; plan: SourceMaterializationPlan }>
  | Readonly<{
      ok: false;
      issues: readonly StructureTemplateIssue[];
    }>;

export type StructureTemplateMaterializationResult =
  | Readonly<{
      status: "ready";
      compiled: CompiledStructureTemplateFlow;
      plan: SourceMaterializationPlan;
    }>
  | Readonly<{
      status: "blocked";
      issues: readonly StructureTemplateIssue[];
    }>
  | Readonly<{
      status: "not_ready";
      problems: readonly StructureTemplateReadinessProblem[];
    }>;

export type StructureTemplateMaterializationCommand = Readonly<{
  transactionId: string;
  expectedSourceFingerprint: string;
  nextRawText: string;
  insertedRange: Readonly<{ start: number; end: number }>;
  beforeDraftRevision: number;
}>;
