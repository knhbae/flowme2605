import {
  isValidStructureTemplateDate,
  isValidStructureTemplateTimezone,
  STRUCTURE_TEMPLATE_WEEKDAYS,
} from "./date";
import type {
  GroupInstance,
  StructureDraft,
  StructureTemplateDefinition,
  StructureTemplateFieldDefinition,
  StructureTemplateGroupDefinition,
  StructureTemplateReadinessProblem,
  StructureTemplateReadinessProblemKind,
  StructureTemplateValue,
} from "./types";

/**
 * A malformed sidecar/data-contract problem, separate from catalog validation
 * issues. It has a kind rather than a rule code and never becomes source.
 */
export type StructureDraftContractProblem = StructureTemplateReadinessProblem;

export class StructureDraftContractError extends Error {
  readonly problems: readonly StructureDraftContractProblem[];

  constructor(problems: readonly StructureDraftContractProblem[]) {
    super(`StructureDraft contract validation failed with ${problems.length} problem(s).`);
    this.name = "StructureDraftContractError";
    this.problems = problems;
  }
}

function problem(
  kind: StructureTemplateReadinessProblemKind,
  scopeInstanceId: string,
  message: string,
  slotId?: string,
): StructureDraftContractProblem {
  return {
    kind,
    scopeInstanceId,
    ...(slotId ? { slotId } : {}),
    message,
  };
}

function valuePresent(value: StructureTemplateValue | undefined): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some(valuePresent);
  return value !== undefined && value !== null
    && Object.values(value).some(valuePresent);
}

function valuesHaveContent(
  values: Readonly<Record<string, StructureTemplateValue>>,
): boolean {
  return Object.values(values).some(valuePresent);
}

function groupHasContent(instance: GroupInstance): boolean {
  return valuesHaveContent(instance.values)
    || instance.children.some(groupHasContent);
}

function collectGroups(groups: readonly GroupInstance[]): GroupInstance[] {
  return groups.flatMap((group) => [group, ...collectGroups(group.children)]);
}

function anyActiveGroup(
  draft: StructureDraft,
  groupIds: readonly string[],
): boolean {
  const ids = new Set(groupIds);
  return collectGroups(draft.groups).some((group) => (
    ids.has(group.groupId) && groupHasContent(group)
  ));
}

function anyGroupValue(
  draft: StructureDraft,
  slotIds: readonly string[],
  expected?: string,
): boolean {
  const slots = new Set(slotIds);
  return collectGroups(draft.groups).some((group) => (
    Object.entries(group.values).some(([slotId, value]) => (
      slots.has(slotId)
      && (expected === undefined ? valuePresent(value) : value === expected)
    ))
  ));
}

function groupsById(
  draft: StructureDraft,
  groupId: string,
): GroupInstance[] {
  return collectGroups(draft.groups)
    .filter((group) => group.groupId === groupId)
    .sort((left, right) => left.order - right.order);
}

function hasTextValue(group: GroupInstance, slotId: string): boolean {
  const value = group.values[slotId];
  return typeof value === "string" && value.trim().length > 0;
}

function hasActiveChild(
  group: GroupInstance,
  childGroupId: string,
  titleSlotId: string,
): boolean {
  return group.children.some((child) => (
    child.groupId === childGroupId && hasTextValue(child, titleSlotId)
  ));
}

function unrepresentedValueProblem(
  scopeInstanceId: string,
  slotId: string,
): StructureDraftContractProblem {
  return problem(
    "unrepresented_user_value",
    scopeInstanceId,
    "이 값은 현재 하위 항목 없이 원문에 안전하게 보존할 수 없습니다.",
    slotId,
  );
}

/**
 * Finds user-entered generation controls that would otherwise disappear from
 * the source because their target Item does not exist yet.
 */
export function validateStructureDraftSourceReadiness(
  definition: StructureTemplateDefinition,
  draft: StructureDraft,
): StructureDraftContractProblem[] {
  const problems: StructureDraftContractProblem[] = [];

  if (definition.templateId === "exercise-phased-4w-v1") {
    groupsById(draft, "phases").forEach((phase) => {
      if (hasActiveChild(phase, "sessions", "item_title")) return;
      ["phase_title", "duration_weeks"].forEach((slotId) => {
        if (valuePresent(phase.values[slotId])) {
          problems.push(unrepresentedValueProblem(phase.instanceId, slotId));
        }
      });
    });
  }

  if (definition.templateId === "exercise-weekly-repeat-v1") {
    const routineGroups = groupsById(draft, "routine_groups");
    const hasSession = routineGroups.some((group) => (
      hasActiveChild(group, "sessions", "item_title")
    ));
    routineGroups.forEach((group) => {
      if (
        !hasActiveChild(group, "sessions", "item_title")
        && valuePresent(group.values.group_title)
      ) {
        problems.push(unrepresentedValueProblem(
          group.instanceId,
          "group_title",
        ));
      }
    });
    if (!hasSession) {
      ["end_mode", "until_date", "repeat_count"].forEach((slotId) => {
        if (valuePresent(draft.values[slotId])) {
          problems.push(unrepresentedValueProblem("root", slotId));
        }
      });
    }
  }

  if (definition.templateId === "travel-itinerary-prep-v1") {
    const timedItemExists = groupsById(draft, "schedule_items").some(
      (item) => (
        hasTextValue(item, "itinerary_item_title")
        && hasTextValue(item, "itinerary_time")
      ),
    );
    if (valuePresent(draft.values.timezone) && !timedItemExists) {
      problems.push(unrepresentedValueProblem("root", "timezone"));
    }
    groupsById(draft, "itinerary_days").forEach((day) => {
      if (
        !hasActiveChild(day, "schedule_items", "itinerary_item_title")
        && valuePresent(day.values.itinerary_date)
      ) {
        problems.push(unrepresentedValueProblem(
          day.instanceId,
          "itinerary_date",
        ));
      }
    });
  }

  if (definition.templateId === "exam-dday-study-v1") {
    const hasStudyBlock = groupsById(draft, "study_blocks").some((block) => (
      hasTextValue(block, "study_item_title")
    ));
    if (!hasStudyBlock) {
      ["study_start_date", "study_end_date"].forEach((slotId) => {
        if (valuePresent(draft.values[slotId])) {
          problems.push(unrepresentedValueProblem("root", slotId));
        }
      });
    }
  }

  return problems;
}

function rootScheduleIsActive(
  definition: StructureTemplateDefinition,
  draft: StructureDraft,
): boolean {
  if (
    definition.templateId === "exercise-phased-4w-v1"
    || definition.templateId === "exercise-weekly-repeat-v1"
  ) {
    return anyActiveGroup(draft, ["sessions"]);
  }
  if (definition.templateId === "travel-itinerary-prep-v1") {
    return anyActiveGroup(draft, ["schedule_items"])
      || anyGroupValue(
        draft,
        ["prep_schedule_mode"],
        "departure_offset",
      );
  }
  if (definition.templateId === "exam-dday-study-v1") {
    return anyActiveGroup(draft, ["study_blocks", "milestones"]);
  }
  return anyGroupValue(draft, ["schedule_mode"], "anchor_offset");
}

function requiredForMaterialization(
  definition: StructureTemplateDefinition,
  draft: StructureDraft,
  field: StructureTemplateFieldDefinition,
  values: Readonly<Record<string, StructureTemplateValue>>,
  group?: GroupInstance,
): boolean {
  switch (field.requiredAt) {
    case "never":
    case "flow_confirm":
      return false;
    case "group_materialization":
    case "item_materialization":
      return group ? groupHasContent(group) : valuesHaveContent(values);
    case "scheduled_materialization":
      return group ? groupHasContent(group) : rootScheduleIsActive(definition, draft);
    case "recurring_materialization":
      return group
        ? groupHasContent(group)
        : anyActiveGroup(draft, ["study_blocks"]);
    case "offset_schedule":
      return anyGroupValue(draft, ["schedule_mode"], "anchor_offset");
    case "when_time_exists":
      return group
        ? Object.entries(group.values).some(([slotId, value]) => (
          slotId.includes("time") && !slotId.includes("timezone")
            && valuePresent(value)
        ))
        : anyGroupValue(
          draft,
          ["itinerary_time", "time", "study_time"],
        );
    case "when_end_mode_until":
      return draft.values.end_mode === "until";
    case "when_end_mode_count":
      return draft.values.end_mode === "count";
    case "when_anchor_offset":
      return values.schedule_mode === "anchor_offset";
    case "when_departure_offset":
      return values.prep_schedule_mode === "departure_offset";
    case "when_absolute":
      return values.schedule_mode === "absolute"
        || values.prep_schedule_mode === "absolute";
    case "when_group_has_items":
      return Boolean(group?.children.some(groupHasContent));
    default:
      return false;
  }
}

function validateRequiredValues(
  definition: StructureTemplateDefinition,
  draft: StructureDraft,
  values: Readonly<Record<string, StructureTemplateValue>>,
  fields: readonly StructureTemplateFieldDefinition[],
  scopeInstanceId: string,
  group?: GroupInstance,
): StructureDraftContractProblem[] {
  return fields.flatMap((field) => (
    requiredForMaterialization(definition, draft, field, values, group)
      && !valuePresent(values[field.slotId])
      ? [problem(
          "missing_required_value",
          scopeInstanceId,
          `${field.label} is required before source materialization.`,
          field.slotId,
        )]
      : []
  ));
}

function hasLineBreak(value: string): boolean {
  return /[\r\n]/u.test(value);
}

function validHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function valueMatchesField(
  value: StructureTemplateValue,
  field: StructureTemplateFieldDefinition,
): boolean {
  if (value === null || value === "") return true;
  switch (field.type) {
    case "short_text":
      return typeof value === "string" && !hasLineBreak(value);
    case "long_text":
      return typeof value === "string";
    case "date":
      return isValidStructureTemplateDate(value);
    case "time":
      return typeof value === "string"
        && /^([01]\d|2[0-3]):[0-5]\d$/u.test(value);
    case "timezone":
      return typeof value === "string" && isValidStructureTemplateTimezone(value);
    case "positive_integer":
      return typeof value === "number"
        && Number.isSafeInteger(value)
        && value > 0;
    case "relative_day_offset":
      return typeof value === "number" && Number.isSafeInteger(value);
    case "weekday_set":
      return Array.isArray(value)
        && value.every((entry) => (
          typeof entry === "string"
          && STRUCTURE_TEMPLATE_WEEKDAYS.includes(
            entry as (typeof STRUCTURE_TEMPLATE_WEEKDAYS)[number],
          )
        ));
    case "url":
      return typeof value === "string" && validHttpUrl(value);
    case "enum":
      return typeof value === "string" && Boolean(field.options?.includes(value));
    case "check_rows":
      return Array.isArray(value)
        && value.every((entry) => (
          typeof entry === "string" && !hasLineBreak(entry)
        ));
  }
}

function validateValues(
  values: Readonly<Record<string, StructureTemplateValue>>,
  fields: readonly StructureTemplateFieldDefinition[],
  scopeInstanceId: string,
): StructureDraftContractProblem[] {
  const problems: StructureDraftContractProblem[] = [];
  const definitions = new Map(fields.map((field) => [field.slotId, field]));
  Object.entries(values).forEach(([slotId, value]) => {
    const field = definitions.get(slotId);
    if (!field) {
      problems.push(problem(
        "unknown_slot",
        scopeInstanceId,
        `Unknown slot ${slotId}.`,
        slotId,
      ));
      return;
    }
    if (!valueMatchesField(value, field)) {
      problems.push(problem(
        "invalid_field_value",
        scopeInstanceId,
        `Value does not match ${field.type}.`,
        slotId,
      ));
    }
  });
  return problems;
}

function validateGroupLevel(
  instances: readonly GroupInstance[],
  definitions: readonly StructureTemplateGroupDefinition[],
  seenInstanceIds: Set<string>,
  templateDefinition: StructureTemplateDefinition,
  draft: StructureDraft,
): StructureDraftContractProblem[] {
  const problems: StructureDraftContractProblem[] = [];
  const definitionById = new Map(
    definitions.map((definition) => [definition.groupId, definition]),
  );
  const orders = [...instances].map((instance) => instance.order).sort((a, b) => a - b);
  if (orders.some((order, index) => order !== index)) {
    problems.push(problem(
      "invalid_group_order",
      instances[0]?.instanceId ?? "root",
      "Sibling group order must be unique and contiguous from zero.",
    ));
  }
  instances.forEach((instance) => {
    if (seenInstanceIds.has(instance.instanceId)) {
      problems.push(problem(
        "duplicate_instance_id",
        instance.instanceId,
        `Duplicate instance ID ${instance.instanceId}.`,
      ));
    }
    seenInstanceIds.add(instance.instanceId);
    const definition = definitionById.get(instance.groupId);
    if (!definition) {
      problems.push(problem(
        "unknown_group",
        instance.instanceId,
        `Group ${instance.groupId} is not valid at this level.`,
      ));
      return;
    }
    problems.push(...validateValues(
      instance.values,
      definition.fields,
      instance.instanceId,
    ));
    problems.push(...validateRequiredValues(
      templateDefinition,
      draft,
      instance.values,
      definition.fields,
      instance.instanceId,
      instance,
    ));
    problems.push(...validateGroupLevel(
      instance.children,
      definition.childGroups ?? [],
      seenInstanceIds,
      templateDefinition,
      draft,
    ));
  });
  return problems;
}

export function validateStructureDraftContract(
  definition: StructureTemplateDefinition,
  draft: StructureDraft,
): StructureDraftContractProblem[] {
  const problems: StructureDraftContractProblem[] = [];
  if (draft.schemaVersion !== "p0.2") {
    problems.push(problem(
      "schema_mismatch",
      "root",
      `Unsupported StructureDraft schema ${draft.schemaVersion}.`,
    ));
  }
  if (
    draft.templateId !== definition.templateId
    || draft.templateVersion !== definition.version
  ) {
    problems.push(problem(
      "template_mismatch",
      "root",
      "The draft template identity does not match its pinned definition.",
    ));
  }
  problems.push(...validateValues(draft.values, definition.setupFields, "root"));
  problems.push(...validateRequiredValues(
    definition,
    draft,
    draft.values,
    definition.setupFields,
    "root",
  ));
  problems.push(...validateGroupLevel(
    draft.groups,
    definition.groups,
    new Set(),
    definition,
    draft,
  ));
  return problems;
}

export function assertStructureDraftContract(
  definition: StructureTemplateDefinition,
  draft: StructureDraft,
): void {
  const problems = validateStructureDraftContract(definition, draft);
  if (problems.length > 0) throw new StructureDraftContractError(problems);
}
