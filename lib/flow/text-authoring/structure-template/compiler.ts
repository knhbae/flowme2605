import type {
  StructureDraft,
  StructureTemplateDefinition,
  StructureTemplateGroupInstance,
  StructureTemplateValue,
} from "./types";
import {
  addStructureTemplateDays,
  firstStructureTemplateOccurrence,
  normalizeStructureTemplateWeekdays,
  structureTemplateOccurrenceDatesUntil,
} from "./date";
import type {
  CompiledStructureTemplateFlow,
  CompiledStructureTemplateItem,
  CompiledStructureTemplateStep,
  StructureTemplateDerivedValue,
} from "./source";

type Values = Record<string, StructureTemplateValue>;

function ordered<T extends { order: number }>(values: readonly T[]): T[] {
  return [...values].sort((left, right) => left.order - right.order);
}

function text(values: Values, key: string): string | undefined {
  const value = values[key];
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value.trim();
}

function integer(values: Values, key: string): number | undefined {
  const value = values[key];
  return typeof value === "number" && Number.isSafeInteger(value)
    ? value
    : undefined;
}

function strings(values: Values, key: string): string[] {
  const value = values[key];
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => (
    typeof entry === "string" && Boolean(entry.trim())
  )).map((entry) => entry.trim());
}

function groups(
  draft: StructureDraft,
  groupId: string,
): StructureTemplateGroupInstance[] {
  return ordered(draft.groups.filter((group) => group.groupId === groupId));
}

function childGroups(
  parent: StructureTemplateGroupInstance,
  groupId: string,
): StructureTemplateGroupInstance[] {
  return ordered(parent.children.filter((group) => group.groupId === groupId));
}

function valueIsPresent(value: StructureTemplateValue | undefined): boolean {
  if (typeof value === "string") return Boolean(value.trim());
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  return Array.isArray(value) && value.some((entry) => (
    typeof entry === "string" ? Boolean(entry.trim()) : entry != null
  ));
}

function countValues(values: Values): number {
  return Object.values(values).filter(valueIsPresent).length;
}

function countGroupValues(group: StructureTemplateGroupInstance): number {
  return countValues(group.values)
    + group.children.reduce((sum, child) => sum + countGroupValues(child), 0);
}

export function countStructureDraftUserValues(draft: StructureDraft): number {
  return countValues(draft.values)
    + draft.groups.reduce((sum, group) => sum + countGroupValues(group), 0);
}

function recurringItem(
  instance: StructureTemplateGroupInstance,
  title: string,
  firstOccurrence: string,
  occurrenceCount: number,
  end: { mode: "until"; date: string } | { mode: "count"; count: number },
  slots: {
    weekdays: string;
    time: string;
    duration: string;
    detail: string;
  },
): CompiledStructureTemplateItem {
  return {
    instanceId: instance.instanceId,
    title,
    schedule: {
      mode: "recurring",
      date: firstOccurrence,
      recurrence: {
        weekdays: normalizeStructureTemplateWeekdays(
          strings(instance.values, slots.weekdays),
        ),
        end,
        occurrenceCount,
      },
    },
    ...(text(instance.values, slots.time)
      ? { time: text(instance.values, slots.time) }
      : {}),
    ...(integer(instance.values, slots.duration) !== undefined
      ? { durationMinutes: integer(instance.values, slots.duration) }
      : {}),
    ...(text(instance.values, slots.detail)
      ? { detail: text(instance.values, slots.detail) }
      : {}),
    subchecks: [],
  };
}

export function compileRecurringRoutine(
  definition: StructureTemplateDefinition,
  draft: StructureDraft,
): CompiledStructureTemplateFlow {
  const flowTitle = text(draft.values, "flow_title") ?? "";
  const startDate = text(draft.values, "start_date") ?? "";
  const steps: CompiledStructureTemplateStep[] = [];
  const derivedValues: StructureTemplateDerivedValue[] = [];

  if (definition.templateId === "exercise-phased-4w-v1") {
    let elapsedDays = 0;
    const activePhases = groups(draft, "phases").filter((phase) => (
      childGroups(phase, "sessions").some((session) => (
        Boolean(text(session.values, "item_title"))
      ))
    ));
    activePhases.forEach((phase) => {
      const durationWeeks = integer(phase.values, "duration_weeks") ?? 0;
      const phaseStart = addStructureTemplateDays(startDate, elapsedDays);
      const phaseEnd = addStructureTemplateDays(
        phaseStart,
        durationWeeks * 7 - 1,
      );
      const items: CompiledStructureTemplateItem[] = [];
      childGroups(phase, "sessions").forEach((session) => {
        const title = text(session.values, "item_title");
        if (!title) return;
        const weekdays = strings(session.values, "weekdays");
        const dates = structureTemplateOccurrenceDatesUntil(
          phaseStart,
          weekdays,
          phaseEnd,
        );
        const firstOccurrence = dates[0];
        if (!firstOccurrence) return;
        items.push(recurringItem(
          session,
          title,
          firstOccurrence,
          dates.length,
          { mode: "until", date: phaseEnd },
          {
            weekdays: "weekdays",
            time: "time",
            duration: "duration_minutes",
            detail: "detail",
          },
        ));
        derivedValues.push({
          kind: "first_occurrence",
          sourceSlotKeys: [
            "start_date",
            ...activePhases
              .filter((candidate) => (
                phase.order === 0
                  ? candidate.order === phase.order
                  : candidate.order < phase.order
              ))
              .map((candidate) => `${candidate.instanceId}.duration_weeks`),
            `${session.instanceId}.weekdays`,
          ],
          value: firstOccurrence,
        });
      });
      const phaseTitle = text(phase.values, "phase_title");
      if (items.length > 0) {
        derivedValues.push({
          kind: "recurrence_end",
          sourceSlotKeys: [
            "start_date",
            ...activePhases
              .filter((candidate) => candidate.order <= phase.order)
              .map((candidate) => `${candidate.instanceId}.duration_weeks`),
          ],
          value: phaseEnd,
        });
      }
      if (items.length > 0) {
        steps.push({
          instanceId: phase.instanceId,
          ...(phaseTitle ? { title: phaseTitle } : {}),
          items,
        });
      }
      elapsedDays += durationWeeks * 7;
    });
  } else {
    const endMode = text(draft.values, "end_mode");
    const untilDate = text(draft.values, "until_date");
    const repeatCount = integer(draft.values, "repeat_count");
    groups(draft, "routine_groups").forEach((group) => {
      const items: CompiledStructureTemplateItem[] = [];
      childGroups(group, "sessions").forEach((session) => {
        const title = text(session.values, "item_title");
        if (!title) return;
        const weekdays = strings(session.values, "weekdays");
        const firstOccurrence = firstStructureTemplateOccurrence(
          startDate,
          weekdays,
        );
        if (!firstOccurrence) return;
        const end = endMode === "until" && untilDate
          ? { mode: "until" as const, date: untilDate }
          : { mode: "count" as const, count: repeatCount ?? 0 };
        const occurrenceCount = end.mode === "count"
          ? end.count
          : structureTemplateOccurrenceDatesUntil(
            firstOccurrence,
            weekdays,
            end.date,
          ).length;
        items.push(recurringItem(
          session,
          title,
          firstOccurrence,
          occurrenceCount,
          end,
          {
            weekdays: "weekdays",
            time: "time",
            duration: "duration_minutes",
            detail: "detail",
          },
        ));
        derivedValues.push({
          kind: "first_occurrence",
          sourceSlotKeys: ["start_date", `${session.instanceId}.weekdays`],
          value: firstOccurrence,
        });
      });
      const groupTitle = text(group.values, "group_title");
      if (items.length > 0) {
        steps.push({
          instanceId: group.instanceId,
          ...(groupTitle ? { title: groupTitle } : {}),
          items,
        });
      }
    });
  }

  return {
    templateId: definition.templateId,
    flowTitle,
    anchorDate: startDate,
    steps,
    derivedValues,
    userValueCount: countStructureDraftUserValues(draft),
    generatedCurriculumRows: 0,
    forbiddenGeneratedContentCount: 0,
  };
}

function compilePreparationItem(
  instance: StructureTemplateGroupInstance,
  slots: {
    title: string;
    mode: string;
    offset: string;
    absolute: string;
    checks: string;
    detail?: string;
    reference?: string;
  },
  anchorDate: string | undefined,
  derivedValues: StructureTemplateDerivedValue[],
  anchorSlot: string,
): CompiledStructureTemplateItem | undefined {
  const title = text(instance.values, slots.title);
  if (!title) return undefined;
  const mode = text(instance.values, slots.mode);
  const offset = integer(instance.values, slots.offset);
  const absoluteDate = text(instance.values, slots.absolute);
  let schedule: CompiledStructureTemplateItem["schedule"];
  if (mode === "anchor_offset" || mode === "departure_offset") {
    const resolvedDate = addStructureTemplateDays(anchorDate ?? "", offset ?? 0);
    schedule = { mode: "relative", dayOffset: offset ?? 0, resolvedDate };
    derivedValues.push({
      kind: "resolved_anchor_date",
      sourceSlotKeys: [anchorSlot, `${instance.instanceId}.${slots.offset}`],
      value: resolvedDate,
    });
  } else if (mode === "absolute") {
    schedule = { mode: "absolute", date: absoluteDate ?? "" };
  } else {
    schedule = { mode: "unscheduled" };
  }
  return {
    instanceId: instance.instanceId,
    title,
    schedule,
    ...(slots.detail && text(instance.values, slots.detail)
      ? { detail: text(instance.values, slots.detail) }
      : {}),
    ...(slots.reference && text(instance.values, slots.reference)
      ? { referenceUrl: text(instance.values, slots.reference) }
      : {}),
    subchecks: strings(instance.values, slots.checks),
  };
}

function compileExamPreparation(
  definition: StructureTemplateDefinition,
  draft: StructureDraft,
): CompiledStructureTemplateFlow {
  const studyStart = text(draft.values, "study_start_date") ?? "";
  const studyEnd = text(draft.values, "study_end_date") ?? "";
  const derivedValues: StructureTemplateDerivedValue[] = [];
  const items: CompiledStructureTemplateItem[] = [];
  groups(draft, "study_blocks").forEach((block) => {
    const title = text(block.values, "study_item_title");
    if (!title) return;
    const weekdays = strings(block.values, "study_weekdays");
    const firstOccurrence = firstStructureTemplateOccurrence(
      studyStart,
      weekdays,
    );
    if (!firstOccurrence) return;
    const occurrenceCount = structureTemplateOccurrenceDatesUntil(
      firstOccurrence,
      weekdays,
      studyEnd,
    ).length;
    const item = recurringItem(
      block,
      title,
      firstOccurrence,
      occurrenceCount,
      { mode: "until", date: studyEnd },
      {
        weekdays: "study_weekdays",
        time: "study_time",
        duration: "study_duration_minutes",
        detail: "study_scope",
      },
    );
    items.push({
      ...item,
      ...(text(block.values, "study_done_when")
        ? { doneWhen: text(block.values, "study_done_when") }
        : {}),
    });
    derivedValues.push(
      {
        kind: "first_occurrence",
        sourceSlotKeys: [
          "study_start_date",
          `${block.instanceId}.study_weekdays`,
        ],
        value: firstOccurrence,
      },
      {
        kind: "recurrence_count",
        sourceSlotKeys: [
          "study_start_date",
          "study_end_date",
          `${block.instanceId}.study_weekdays`,
        ],
        value: occurrenceCount,
      },
    );
  });
  groups(draft, "milestones").forEach((milestone) => {
    const title = text(milestone.values, "milestone_title");
    if (!title) return;
    items.push({
      instanceId: milestone.instanceId,
      title,
      schedule: {
        mode: "absolute",
        date: text(milestone.values, "milestone_date") ?? "",
      },
      ...(text(milestone.values, "milestone_detail")
        ? { detail: text(milestone.values, "milestone_detail") }
        : {}),
      subchecks: [],
    });
  });
  return {
    templateId: definition.templateId,
    flowTitle: text(draft.values, "flow_title") ?? "",
    anchorDate: text(draft.values, "exam_date"),
    steps: [{ instanceId: "root", items }],
    derivedValues,
    userValueCount: countStructureDraftUserValues(draft),
    generatedCurriculumRows: 0,
    forbiddenGeneratedContentCount: 0,
  };
}

export function compileDatePreparation(
  definition: StructureTemplateDefinition,
  draft: StructureDraft,
): CompiledStructureTemplateFlow {
  if (definition.templateId === "exam-dday-study-v1") {
    return compileExamPreparation(definition, draft);
  }
  const anchorDate = text(draft.values, "anchor_date");
  const derivedValues: StructureTemplateDerivedValue[] = [];
  const steps: CompiledStructureTemplateStep[] = [];
  groups(draft, "windows").forEach((window) => {
    const items = childGroups(window, "tasks")
      .map((task) => compilePreparationItem(
        task,
        {
          title: "item_title",
          mode: "schedule_mode",
          offset: "day_offset",
          absolute: "absolute_date",
          checks: "checks",
          detail: "note",
          ...(definition.templateId === "wedding-dday-v1"
            ? { reference: "reference_url" }
            : {}),
        },
        anchorDate,
        derivedValues,
        "anchor_date",
      ))
      .filter((item): item is CompiledStructureTemplateItem => Boolean(item));
    const stepTitle = text(window.values, "step_title");
    if (items.length > 0 || stepTitle) {
      steps.push({
        instanceId: window.instanceId,
        ...(stepTitle ? { title: stepTitle } : {}),
        items,
      });
    }
  });
  return {
    templateId: definition.templateId,
    flowTitle: text(draft.values, "flow_title") ?? "",
    ...(anchorDate ? { anchorDate } : {}),
    steps,
    derivedValues,
    userValueCount: countStructureDraftUserValues(draft),
    generatedCurriculumRows: 0,
    forbiddenGeneratedContentCount: 0,
  };
}

export function compileItineraryPreparation(
  definition: StructureTemplateDefinition,
  draft: StructureDraft,
): CompiledStructureTemplateFlow {
  const departureDate = text(draft.values, "departure_date");
  const timezone = text(draft.values, "timezone");
  const derivedValues: StructureTemplateDerivedValue[] = [];
  const steps: CompiledStructureTemplateStep[] = [];
  groups(draft, "preparation").forEach((preparation) => {
    const items = childGroups(preparation, "tasks")
      .map((task) => compilePreparationItem(
        task,
        {
          title: "prep_item_title",
          mode: "prep_schedule_mode",
          offset: "prep_day_offset",
          absolute: "prep_absolute_date",
          checks: "prep_checks",
        },
        departureDate,
        derivedValues,
        "departure_date",
      ))
      .filter((item): item is CompiledStructureTemplateItem => Boolean(item));
    const stepTitle = text(preparation.values, "preparation_step_title");
    if (items.length > 0 || stepTitle) {
      steps.push({
        instanceId: preparation.instanceId,
        ...(stepTitle ? { title: stepTitle } : {}),
        items,
      });
    }
  });
  groups(draft, "itinerary_days").forEach((day) => {
    const date = text(day.values, "itinerary_date") ?? "";
    const items = childGroups(day, "schedule_items").flatMap((scheduleItem) => {
      const title = text(scheduleItem.values, "itinerary_item_title");
      if (!title) return [];
      const time = text(scheduleItem.values, "itinerary_time");
      return [{
        instanceId: scheduleItem.instanceId,
        title,
        schedule: { mode: "absolute" as const, date },
        ...(time ? { time } : {}),
        ...(time && timezone ? { timezone } : {}),
        ...(integer(scheduleItem.values, "itinerary_duration_minutes") !== undefined
          ? {
              durationMinutes: integer(
                scheduleItem.values,
                "itinerary_duration_minutes",
              ),
            }
          : {}),
        ...(text(scheduleItem.values, "itinerary_place")
          ? { place: text(scheduleItem.values, "itinerary_place") }
          : {}),
        ...(text(scheduleItem.values, "itinerary_detail")
          ? { detail: text(scheduleItem.values, "itinerary_detail") }
          : {}),
        subchecks: [],
      }];
    });
    const stepTitle = text(day.values, "itinerary_step_title");
    if (items.length > 0 || stepTitle) {
      steps.push({
        instanceId: day.instanceId,
        ...(stepTitle ? { title: stepTitle } : {}),
        items,
      });
    }
  });
  return {
    templateId: definition.templateId,
    flowTitle: text(draft.values, "flow_title") ?? "",
    ...(departureDate ? { anchorDate: departureDate } : {}),
    steps,
    derivedValues,
    userValueCount: countStructureDraftUserValues(draft),
    generatedCurriculumRows: 0,
    forbiddenGeneratedContentCount: 0,
  };
}

export function compileStructureTemplate(
  definition: StructureTemplateDefinition,
  draft: StructureDraft,
): CompiledStructureTemplateFlow {
  if (definition.archetypeId === "recurring_routine") {
    return compileRecurringRoutine(definition, draft);
  }
  if (definition.archetypeId === "itinerary_preparation") {
    return compileItineraryPreparation(definition, draft);
  }
  return compileDatePreparation(definition, draft);
}
