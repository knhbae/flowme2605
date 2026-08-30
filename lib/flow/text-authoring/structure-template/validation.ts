import {
  addStructureTemplateDays,
  firstStructureTemplateOccurrence,
  isValidStructureTemplateDate,
  isValidStructureTemplateTimezone,
  normalizeStructureTemplateWeekdays,
  structureTemplateOccurrenceDatesUntil,
} from "./date";
import { compileStructureTemplate } from "./compiler";
import {
  validateStructureDraftContract,
  validateStructureDraftSourceReadiness,
} from "./draft-validation";
import { serializeStructureTemplateSource } from "./source";
import type {
  GroupInstance,
  StructureDraft,
  StructureTemplateDefinition,
  StructureTemplateIssue,
} from "./types";

type DraftValueMap = Readonly<Record<string, unknown>>;

type CollectedGroup = Readonly<{
  instance: GroupInstance;
  parent?: GroupInstance;
}>;

const SHARED_RULE_MESSAGES: Readonly<Record<string, string>> = {
  DRAFT_DUPLICATE_INSTANCE_ID:
    "반복 행 식별자가 겹쳤습니다. 초안을 다시 불러와 주세요.",
  SOURCE_FINGERPRINT_MISMATCH:
    "원문이 바뀌었습니다. 최신 원문을 확인한 뒤 다시 시도해 주세요.",
};

function collectGroups(
  groups: readonly GroupInstance[],
  parent?: GroupInstance,
): CollectedGroup[] {
  return groups.flatMap((instance) => [
    { instance, parent },
    ...collectGroups(instance.children, instance),
  ]);
}

function groupsWithId(
  groups: readonly CollectedGroup[],
  groupId: string,
): GroupInstance[] {
  return groups
    .filter(({ instance }) => instance.groupId === groupId)
    .map(({ instance }) => instance)
    .sort((left, right) => left.order - right.order);
}

function childrenWithId(
  instance: GroupInstance,
  groupId: string,
): GroupInstance[] {
  return instance.children
    .filter((child) => child.groupId === groupId)
    .slice()
    .sort((left, right) => left.order - right.order);
}

function nonemptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function valuePresent(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null;
}

function positiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function integer(value: unknown): value is number {
  return Number.isSafeInteger(value);
}

function weekdayValues(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function validHttpUrl(value: unknown): boolean {
  if (!nonemptyString(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function ruleMessage(
  definition: StructureTemplateDefinition,
  code: string,
): string {
  return definition.validationRules.find((rule) => rule.code === code)?.message
    ?? SHARED_RULE_MESSAGES[code]
    ?? code;
}

function issue(
  definition: StructureTemplateDefinition,
  code: string,
  scopeInstanceId: string,
  slotId?: string,
): StructureTemplateIssue {
  return {
    code,
    severity: "error",
    scopeInstanceId,
    ...(slotId ? { slotId } : {}),
    message: ruleMessage(definition, code),
  };
}

function validateDuplicateInstanceIds(
  definition: StructureTemplateDefinition,
  groups: readonly CollectedGroup[],
): StructureTemplateIssue[] {
  const seen = new Set<string>();
  for (const { instance } of groups) {
    if (seen.has(instance.instanceId)) {
      return [issue(definition, "DRAFT_DUPLICATE_INSTANCE_ID", "root")];
    }
    seen.add(instance.instanceId);
  }
  return [];
}

function validatePhasedExercise(
  definition: StructureTemplateDefinition,
  draft: StructureDraft,
  groups: readonly CollectedGroup[],
): StructureTemplateIssue[] {
  const issues: StructureTemplateIssue[] = [];
  const phases = groupsWithId(groups, "phases").filter((phase) => (
    childrenWithId(phase, "sessions").some(
      (session) => nonemptyString(session.values.item_title),
    )
  ));
  const durations = phases.map((phase) => phase.values.duration_weeks);
  const durationTotal = durations.every(positiveInteger)
    ? durations.reduce<number>((total, value) => total + Number(value), 0)
    : Number.NaN;
  if (durationTotal !== 4) {
    const scope = phases.at(-1)?.instanceId ?? "root";
    issues.push(issue(definition, "EX4W_DURATION_SUM", scope, "duration_weeks"));
  }

  let phaseStart = isValidStructureTemplateDate(draft.values.start_date)
    ? draft.values.start_date
    : undefined;
  phases.forEach((phase) => {
    const duration = phase.values.duration_weeks;
    const phaseEnd = phaseStart && positiveInteger(duration)
      ? addStructureTemplateDays(phaseStart, duration * 7 - 1)
      : undefined;
    childrenWithId(phase, "sessions").forEach((session) => {
      if (!nonemptyString(session.values.item_title)) return;
      const weekdays = weekdayValues(session.values.weekdays);
      const firstOccurrence = phaseStart
        ? firstStructureTemplateOccurrence(phaseStart, weekdays)
        : undefined;
      if (
        phaseStart
        && phaseEnd
        && (!firstOccurrence || firstOccurrence > phaseEnd)
      ) {
        issues.push(issue(
          definition,
          "EX4W_OCCURRENCE_IN_PHASE",
          session.instanceId,
          "weekdays",
        ));
      }
      if (
        nonemptyString(session.values.time)
        && !positiveInteger(session.values.duration_minutes)
      ) {
        issues.push(issue(
          definition,
          "EX4W_TIME_DURATION_PAIR",
          session.instanceId,
          "duration_minutes",
        ));
      }
    });
    if (phaseEnd) phaseStart = addStructureTemplateDays(phaseEnd, 1);
  });
  return issues;
}

function weeklyEndIsExclusive(values: DraftValueMap): boolean {
  const mode = values.end_mode;
  const hasUntil = isValidStructureTemplateDate(values.until_date);
  const hasCount = positiveInteger(values.repeat_count);
  if (mode === "until") return hasUntil && !hasCount;
  if (mode === "count") return hasCount && !hasUntil;
  return false;
}

function validateWeeklyExercise(
  definition: StructureTemplateDefinition,
  draft: StructureDraft,
  groups: readonly CollectedGroup[],
): StructureTemplateIssue[] {
  const issues: StructureTemplateIssue[] = [];
  if (!weeklyEndIsExclusive(draft.values)) {
    issues.push(issue(definition, "EXW_END_EXCLUSIVE", "root", "end_mode"));
    return issues;
  }
  if (
    draft.values.end_mode === "until"
    && isValidStructureTemplateDate(draft.values.start_date)
    && isValidStructureTemplateDate(draft.values.until_date)
  ) {
    const sessions = groupsWithId(groups, "sessions")
      .filter((session) => nonemptyString(session.values.item_title));
    const hasInvalidFirstOccurrence = sessions.some((session) => {
      const first = firstStructureTemplateOccurrence(
        draft.values.start_date as string,
        weekdayValues(session.values.weekdays),
      );
      return !first || first > (draft.values.until_date as string);
    });
    if (hasInvalidFirstOccurrence) {
      issues.push(issue(definition, "EXW_FIRST_OCCURRENCE", "root", "until_date"));
    }
  }
  return issues;
}

function validateDatePreparationTasks(
  definition: StructureTemplateDefinition,
  draft: StructureDraft,
  groups: readonly CollectedGroup[],
  prefix: "MOVE" | "WED",
): StructureTemplateIssue[] {
  const issues: StructureTemplateIssue[] = [];
  const tasks = groupsWithId(groups, "tasks")
    .filter((task) => nonemptyString(task.values.item_title));
  const offsetTasks = tasks.filter(
    (task) => task.values.schedule_mode === "anchor_offset",
  );
  if (
    offsetTasks.length > 0
    && !isValidStructureTemplateDate(draft.values.anchor_date)
  ) {
    issues.push(issue(
      definition,
      `${prefix}_OFFSET_ANCHOR`,
      "root",
      "anchor_date",
    ));
  }

  tasks.forEach((task) => {
    const mode = task.values.schedule_mode;
    const hasOffset = integer(task.values.day_offset);
    const hasAbsolute = isValidStructureTemplateDate(task.values.absolute_date);
    let slotId: string | undefined;
    if (mode === "anchor_offset") {
      if (!hasOffset) slotId = "day_offset";
      else if (hasAbsolute || nonemptyString(task.values.absolute_date)) {
        slotId = "absolute_date";
      }
    } else if (mode === "absolute") {
      if (!hasAbsolute) slotId = "absolute_date";
      else if (hasOffset) slotId = "day_offset";
    } else if (mode === "unscheduled") {
      if (hasOffset) slotId = "day_offset";
      else if (hasAbsolute || nonemptyString(task.values.absolute_date)) {
        slotId = "absolute_date";
      }
    } else {
      slotId = "schedule_mode";
    }
    if (slotId) {
      issues.push(issue(
        definition,
        `${prefix}_SCHEDULE_MODE`,
        task.instanceId,
        slotId,
      ));
    }

    if (
      prefix === "WED"
      && valuePresent(task.values.reference_url)
      && !validHttpUrl(task.values.reference_url)
    ) {
      issues.push(issue(
        definition,
        "WED_REFERENCE_URL",
        task.instanceId,
        "reference_url",
      ));
    }
  });
  return issues;
}

function validateTravelPreparation(
  definition: StructureTemplateDefinition,
  draft: StructureDraft,
  groups: readonly CollectedGroup[],
): StructureTemplateIssue[] {
  const issues: StructureTemplateIssue[] = [];
  const preparationTasks = groupsWithId(groups, "tasks")
    .filter((task) => nonemptyString(task.values.prep_item_title));
  const offsetTasks = preparationTasks.filter(
    (task) => task.values.prep_schedule_mode === "departure_offset",
  );
  if (
    offsetTasks.length > 0
    && !isValidStructureTemplateDate(draft.values.departure_date)
  ) {
    issues.push(issue(
      definition,
      "TRAVEL_PREP_OFFSET_ANCHOR",
      "root",
      "departure_date",
    ));
  }

  preparationTasks.forEach((task) => {
    const mode = task.values.prep_schedule_mode;
    const hasOffset = integer(task.values.prep_day_offset);
    const hasAbsolute = isValidStructureTemplateDate(
      task.values.prep_absolute_date,
    );
    if (mode === "departure_offset") {
      const slotId = !hasOffset
        ? "prep_day_offset"
        : hasAbsolute || nonemptyString(task.values.prep_absolute_date)
          ? "prep_absolute_date"
          : undefined;
      if (slotId) {
        issues.push(issue(
          definition,
          "TRAVEL_PREP_OFFSET_ANCHOR",
          task.instanceId,
          slotId,
        ));
      }
    } else if (mode === "absolute") {
      const slotId = !hasAbsolute
        ? "prep_absolute_date"
        : hasOffset
          ? "prep_day_offset"
          : undefined;
      if (slotId) {
        issues.push(issue(
          definition,
          "TRAVEL_PREP_ABSOLUTE_DATE",
          task.instanceId,
          slotId,
        ));
      }
    } else if (mode === "unscheduled") {
      const slotId = hasOffset
        ? "prep_day_offset"
        : hasAbsolute || nonemptyString(task.values.prep_absolute_date)
          ? "prep_absolute_date"
          : undefined;
      if (slotId) {
        issues.push(issue(
          definition,
          "TRAVEL_PREP_UNSCHEDULED_CONFLICT",
          task.instanceId,
          slotId,
        ));
      }
    }
  });

  const itineraryDays = groupsWithId(groups, "itinerary_days").filter((day) => (
    childrenWithId(day, "schedule_items").some(
      (item) => nonemptyString(item.values.itinerary_item_title),
    )
  ));
  itineraryDays.forEach((day) => {
    if (
      isValidStructureTemplateDate(draft.values.departure_date)
      && (!isValidStructureTemplateDate(day.values.itinerary_date)
        || day.values.itinerary_date < draft.values.departure_date)
    ) {
      issues.push(issue(
        definition,
        "TRAVEL_DAY_AFTER_DEPARTURE",
        day.instanceId,
        "itinerary_date",
      ));
    }
  });

  const hasTimedItinerary = groupsWithId(groups, "schedule_items").some(
    (item) => (
      nonemptyString(item.values.itinerary_item_title)
      && nonemptyString(item.values.itinerary_time)
    ),
  );
  if (
    hasTimedItinerary
    && (
      !nonemptyString(draft.values.timezone)
      || !isValidStructureTemplateTimezone(draft.values.timezone)
    )
  ) {
    issues.push(issue(
      definition,
      "TRAVEL_TIMEZONE",
      "root",
      "timezone",
    ));
  }
  return issues;
}

function validateExamPreparation(
  definition: StructureTemplateDefinition,
  draft: StructureDraft,
  groups: readonly CollectedGroup[],
): StructureTemplateIssue[] {
  const issues: StructureTemplateIssue[] = [];
  const examDate = draft.values.exam_date;
  const startDate = draft.values.study_start_date;
  const endDate = draft.values.study_end_date;
  const validDateOrder = (
    isValidStructureTemplateDate(startDate)
    && isValidStructureTemplateDate(endDate)
    && isValidStructureTemplateDate(examDate)
    && startDate <= endDate
    && endDate <= examDate
  );
  if (!validDateOrder) {
    issues.push(issue(
      definition,
      "EXAM_DATE_ORDER",
      "root",
      "study_end_date",
    ));
    return issues;
  }

  groupsWithId(groups, "study_blocks")
    .filter((block) => nonemptyString(block.values.study_item_title))
    .forEach((block) => {
      const occurrences = structureTemplateOccurrenceDatesUntil(
        startDate,
        weekdayValues(block.values.study_weekdays),
        endDate,
      );
      if (occurrences.length === 0) {
        issues.push(issue(
          definition,
          "EXAM_OCCURRENCE_WINDOW",
          block.instanceId,
          "study_weekdays",
        ));
      }
    });
  return issues;
}

export type ValidateStructureDraftInput = Readonly<{
  definition: StructureTemplateDefinition;
  draft: StructureDraft;
  currentSourceFingerprint: string;
}>;

export function validateStructureDraft({
  definition,
  draft,
  currentSourceFingerprint,
}: ValidateStructureDraftInput): StructureTemplateIssue[] {
  const groups = collectGroups(draft.groups);
  const issues = validateDuplicateInstanceIds(definition, groups);

  if (definition.templateId === "exercise-phased-4w-v1") {
    issues.push(...validatePhasedExercise(definition, draft, groups));
  } else if (definition.templateId === "exercise-weekly-repeat-v1") {
    issues.push(...validateWeeklyExercise(definition, draft, groups));
  } else if (definition.templateId === "moving-dday-v1") {
    issues.push(...validateDatePreparationTasks(
      definition,
      draft,
      groups,
      "MOVE",
    ));
  } else if (definition.templateId === "wedding-dday-v1") {
    issues.push(...validateDatePreparationTasks(
      definition,
      draft,
      groups,
      "WED",
    ));
  } else if (definition.templateId === "travel-itinerary-prep-v1") {
    issues.push(...validateTravelPreparation(definition, draft, groups));
  } else if (definition.templateId === "exam-dday-study-v1") {
    issues.push(...validateExamPreparation(definition, draft, groups));
  }

  if (draft.sourceFingerprint !== currentSourceFingerprint) {
    issues.push(issue(
      definition,
      "SOURCE_FINGERPRINT_MISMATCH",
      "root",
      "sourceFingerprint",
    ));
  }
  return issues;
}

export function hasBlockingStructureTemplateIssues(
  issues: readonly StructureTemplateIssue[],
): boolean {
  return issues.some((entry) => entry.severity === "error");
}

export function canMaterializeStructureDraft(
  input: ValidateStructureDraftInput,
): boolean {
  if (hasBlockingStructureTemplateIssues(validateStructureDraft(input))) {
    return false;
  }
  if (
    validateStructureDraftContract(input.definition, input.draft).length > 0
    || validateStructureDraftSourceReadiness(
      input.definition,
      input.draft,
    ).length > 0
  ) {
    return false;
  }
  const compiled = compileStructureTemplate(input.definition, input.draft);
  return compiled.userValueCount > 0
    && serializeStructureTemplateSource(compiled).length > 0;
}
