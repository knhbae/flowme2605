import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  architectureCriteria,
  architectureRawScores,
  artifactSemantics,
  checklistTodoFixtures,
  eventFixtures,
  newFixtures,
  projectionNames,
  temporalIntentDefinitions,
} from './lab-data-v1.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const baselinePath = path.resolve(
  here,
  '../2026-07-28-flow-canonical-structure-corpus-expansion-v1/canonical-corpus-v1.json',
);
const reportPath = path.resolve(
  repoRoot,
  'docs/content-audit/2026-07-29-flow-projection-semantics-scheduling-event-review-ko.html',
);
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const generatedAt = '2026-07-29T12:00:00+09:00';

const sha256 = (value) =>
  `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;

const stableStringify = (value) => {
  const sortObject = (input) => {
    if (Array.isArray(input)) return input.map(sortObject);
    if (input && typeof input === 'object') {
      return Object.fromEntries(
        Object.keys(input)
          .sort()
          .map((key) => [key, sortObject(input[key])]),
      );
    }
    return input;
  };
  return JSON.stringify(sortObject(value));
};

const writeJson = (name, value) => {
  fs.writeFileSync(
    path.join(here, name),
    `${JSON.stringify(value, null, 2)}\n`,
    'utf8',
  );
};

const writeText = (name, value) => {
  fs.writeFileSync(path.join(here, name), `${value.trim()}\n`, 'utf8');
};

const dateOnly = (value) => value.slice(0, 10);

const addDays = (date, amount) => {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + amount);
  return result.toISOString().slice(0, 10);
};

const isoWeekday = (date) => {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
};

const hashFile = (filePath) =>
  sha256(fs.readFileSync(filePath));

const flatten = (value) => value.flatMap((entry) => entry);

function normalizeBaselineFixture(fixture) {
  const content = fixture.canonicalContent;
  const scheduleModes = [
    ...new Set(
      content.items.map((entry) => entry.schedule?.mode ?? 'none'),
    ),
  ];
  return {
    fixtureId: fixture.fixtureId,
    fixtureGroup: 'frozen_baseline_42',
    fixtureKind: 'canonical_flow_content',
    title: fixture.source.title,
    provider: fixture.source.provider,
    url: fixture.source.canonicalUrl ?? fixture.source.url,
    canonicalUrl: fixture.source.canonicalUrl ?? fixture.source.url,
    locale: fixture.source.locale,
    observedAt: fixture.source.observedAt,
    accessStatus: fixture.source.accessStatus,
    evidenceMethod: fixture.evidenceTier,
    sourceShape: fixture.taxonomy.sourceShape,
    executionPattern: fixture.taxonomy.primaryExecutionPattern,
    frozenPrimaryProjection: fixture.taxonomy.primaryArtifact,
    primaryProjection: null,
    userJob: fixture.userNeed,
    sourceRows: content.sourceRows,
    steps: content.steps,
    items: content.items.map((entry) => ({
      ...entry,
      sourceRowIds: flatten(
        (entry.sourceTrace ?? []).map((trace) => trace.sourceRowIds ?? []),
      ),
      temporalIntent:
        entry.schedule?.mode === 'absolute'
          ? fixture.taxonomy.sourceShape === 'date_window'
            ? 'due_deadline'
            : 'fixed_occurrence'
          : entry.schedule?.mode === 'anchor_offset'
            ? 'anchor_offset'
            : entry.schedule?.mode === 'date_window'
              ? 'availability_window'
              : 'no_schedule',
    })),
    fields: content.fields,
    memos: content.memos,
    flows: content.flows,
    eventModel: null,
    sourceSchedulePresent: scheduleModes.some((mode) => mode !== 'none'),
    pacingEligible:
      scheduleModes.every((mode) => mode === 'none') &&
      ['progress_tracking', 'resource_queue', 'phase_lifecycle'].includes(
        fixture.taxonomy.primaryExecutionPattern,
      ) &&
      content.items.length > 1,
    scheduleModes,
    sourceNotes: [],
  };
}

function classifyChecklistTodo(fixture) {
  if (!fixture.items.length) return 'neither';
  if (fixture.items.length === 1 && fixture.executionPattern === 'compare_decide') {
    return 'neither';
  }
  if (fixture.items.length === 1) return 'todo';
  if (
    fixture.executionPattern === 'resource_queue' ||
    fixture.fixtureKind === 'open_reorderable_resource_queue'
  ) {
    return 'todo';
  }
  if (
    fixture.sourceShape === 'lesson_rows' &&
    fixture.items.length > 1 &&
    fixture.executionPattern === 'progress_tracking'
  ) {
    return 'todo';
  }
  if (fixture.fixtureKind === 'parent_task_subtask_candidate') return 'todo';
  if (
    fixture.sourceShape === 'narrative_guidance' &&
    fixture.executionPattern === 'phase_lifecycle' &&
    fixture.steps.length > 1 &&
    fixture.steps.every(
      (step) =>
        fixture.items.filter((entry) => entry.stepId === step.stepId).length ===
        1,
    ) &&
    fixture.items.every(
      (entry) => (entry.dependsOnItemIds ?? []).length === 0,
    )
  ) {
    return 'todo';
  }
  return 'checklist';
}

function choosePrimaryProjection(fixture) {
  if (fixture.fixtureGroup === 'event_native') {
    return fixture.primaryProjection;
  }
  const label = classifyChecklistTodo(fixture);
  const scheduled = fixture.items.filter(
    (entry) => entry.schedule && entry.schedule.mode !== 'none',
  );
  const directOrAnchoredSchedule = scheduled.some(
    (entry) =>
      entry.schedule?.mode === 'anchor_offset' ||
      (entry.schedule?.mode === 'absolute' &&
        entry.temporalIntent !== 'due_deadline'),
  );

  if (
    directOrAnchoredSchedule &&
    ['date_preparation', 'repeating_routine'].includes(fixture.executionPattern)
  ) {
    return 'calendar';
  }
  if (
    fixture.sourceShape === 'lesson_rows' ||
    (fixture.sourceShape === 'table_rows' &&
      ['progress_tracking', 'compare_decide'].includes(
        fixture.executionPattern,
      ))
  ) {
    return 'sheet';
  }
  if (fixture.sourceShape === 'template_fields') return 'sheet';
  if (fixture.executionPattern === 'resource_queue') {
    return fixture.items.length >= 10 ? 'sheet' : 'todo';
  }
  if (fixture.executionPattern === 'compare_decide') {
    return fixture.items.length > 1 || (fixture.fields ?? []).length >= 3
      ? 'sheet'
      : 'memo';
  }
  if (fixture.sourceShape === 'date_window' && fixture.items.length === 1) {
    return 'todo';
  }
  if (label === 'todo') return 'todo';
  if (label === 'checklist') return 'checklist';
  return fixture.frozenPrimaryProjection ?? 'memo';
}

const baselineFixtures = baseline.fixtures.map(normalizeBaselineFixture);
for (const fixture of baselineFixtures) {
  fixture.checklistTodoLabel = classifyChecklistTodo(fixture);
  fixture.primaryProjection = choosePrimaryProjection(fixture);
}
for (const fixture of newFixtures) {
  fixture.checklistTodoLabel = classifyChecklistTodo(fixture);
}

const allFixtures = [...baselineFixtures, ...newFixtures];

const fixtureById = new Map(
  allFixtures.map((fixture) => [fixture.fixtureId, fixture]),
);

function getStepForItem(fixture, itemRecord) {
  return fixture.steps.find((step) => step.stepId === itemRecord.stepId) ?? {
    stepId: itemRecord.stepId ?? `${fixture.fixtureId}-ungrouped`,
    title: fixture.title,
    order: 0,
    itemIds: fixture.items.map((entry) => entry.itemId),
  };
}

function sourceRefIds(itemRecord) {
  return (
    itemRecord.sourceRowIds ??
    flatten(
      (itemRecord.sourceTrace ?? []).map((trace) => trace.sourceRowIds ?? []),
    )
  );
}

function makeChecklistProjection(fixture) {
  const groups = fixture.steps
    .map((step) => {
      const stepItems = fixture.items
        .filter((entry) => entry.stepId === step.stepId)
        .sort((a, b) => a.order - b.order);
      if (!stepItems.length) return null;
      return {
        groupId: `checklist-group-${step.stepId}`,
        canonicalStepId: step.stepId,
        title: step.title,
        bounded: true,
        orderLocked: fixture.checklistTodoLabel === 'checklist',
        orderedEntries: stepItems.map((entry) => ({
          entryId: `check-${entry.itemId}`,
          canonicalItemId: entry.itemId,
          marker: 'unchecked',
          title: entry.title,
          detail: entry.description ?? '',
          required: entry.optional !== true,
          sourceOrder: entry.order,
          sourceRowIds: sourceRefIds(entry),
        })),
      };
    })
    .filter(Boolean);
  return {
    projectionType: 'checklist',
    schemaVersion: 'flowme-checklist-projection-v1',
    groups,
  };
}

function dueFromSchedule(schedule) {
  if (!schedule) return null;
  if (schedule.mode === 'absolute') {
    return (
      schedule.at ??
      schedule.start ??
      schedule.date ??
      schedule.startDate ??
      null
    );
  }
  if (schedule.mode === 'date_window') {
    return schedule.end ?? schedule.endDate ?? null;
  }
  return null;
}

function makeTodoProjection(fixture) {
  const parentTaskSupported = true;
  const tasks = [];
  for (const step of fixture.steps) {
    const stepItems = fixture.items
      .filter((entry) => entry.stepId === step.stepId)
      .sort((a, b) => a.order - b.order);
    if (!stepItems.length) continue;
    const parentTaskId =
      parentTaskSupported && stepItems.length > 1
        ? `todo-parent-${step.stepId}`
        : null;
    if (parentTaskId) {
      tasks.push({
        taskId: parentTaskId,
        recordKind: 'parent_task',
        canonicalStepId: step.stepId,
        canonicalItemId: null,
        parentTaskId: null,
        title: step.title,
        due: null,
        queuePosition: tasks.length,
        canReorder: true,
        canDefer: true,
        completionOwnedBy: 'destination_when_supported',
        sourceRowIds: [],
      });
    }
    for (const entry of stepItems) {
      tasks.push({
        taskId: `todo-${entry.itemId}`,
        recordKind: parentTaskId ? 'subtask' : 'task',
        canonicalStepId: step.stepId,
        canonicalItemId: entry.itemId,
        parentTaskId,
        title: entry.title,
        due: dueFromSchedule(entry.schedule),
        queuePosition: tasks.length,
        canReorder: (entry.dependsOnItemIds ?? []).length === 0,
        canDefer: true,
        dependencyItemIds: entry.dependsOnItemIds ?? [],
        completionOwnedBy: 'destination_and_flowme_sync_contract',
        sourceRowIds: sourceRefIds(entry),
      });
    }
  }
  return {
    projectionType: 'todo',
    schemaVersion: 'flowme-todo-projection-v1',
    groupingStrategy: parentTaskSupported
      ? 'step_parent_item_subtask'
      : 'flat_items_with_step_prefix',
    tasks,
  };
}

function resolvedAbsoluteStart(schedule) {
  if (!schedule || schedule.mode !== 'absolute') return null;
  return (
    schedule.at ??
    schedule.start ??
    (schedule.date ? `${schedule.date}T00:00:00` : null)
  );
}

function makeCalendarProjection(fixture, overlay = null) {
  const events = [];
  for (const entry of fixture.items) {
    if (entry.temporalIntent === 'due_deadline') continue;
    let start = resolvedAbsoluteStart(entry.schedule);
    let scheduleOwner = 'source';
    let derivation = 'direct';
    if (entry.schedule?.mode === 'anchor_offset' && overlay?.anchorValues) {
      const field = (fixture.fields ?? []).find(
        (candidate) => candidate.fieldId === entry.schedule.anchorFieldId,
      );
      const anchorValue =
        overlay.anchorValues[entry.schedule.anchorFieldId] ??
        (field ? overlay.anchorValues[field.key] : null);
      if (anchorValue) {
        start = addDays(anchorValue, entry.schedule.dayOffset ?? 0);
        scheduleOwner = 'user_overlay';
        derivation = 'anchor_resolution';
      }
    }
    if (!start) continue;
    events.push({
      component: 'VEVENT',
      uid: `vevent-${entry.itemId}@flowme.local`,
      canonicalItemId: entry.itemId,
      canonicalStepId: entry.stepId,
      summary: entry.title,
      temporalIntent: entry.temporalIntent,
      start,
      end: entry.schedule.end ?? null,
      allDay: entry.schedule.allDay ?? false,
      timezone: entry.schedule.timezone ?? null,
      scheduleOwner,
      derivation,
      suggestionStatus: 'confirmed',
      childItemIds: [entry.itemId],
      individualCompletionOutsideCalendar: false,
      sourceRowIds: sourceRefIds(entry),
    });
  }

  if (fixture.eventModel && overlay?.selectedOccurrenceIds?.length) {
    for (const occurrenceId of overlay.selectedOccurrenceIds) {
      const occurrence = fixture.eventModel.occurrences?.find(
        (entry) => entry.occurrenceId === occurrenceId,
      );
      if (
        !occurrence ||
        occurrence.status === 'cancelled' ||
        (!occurrence.start && !occurrence.startDate)
      ) {
        continue;
      }
      events.push({
        component: 'VEVENT',
        uid: `vevent-${occurrence.occurrenceId}@flowme.local`,
        canonicalItemId: `user-attendance-${occurrence.occurrenceId}`,
        canonicalStepId: null,
        sourceOccurrenceId: occurrence.occurrenceId,
        summary: occurrence.title ?? fixture.title,
        temporalIntent: occurrence.temporalIntent,
        start: occurrence.start ?? occurrence.startDate,
        end: occurrence.end ?? occurrence.endDateExclusive ?? null,
        allDay: occurrence.allDay ?? false,
        timezone: occurrence.timezone ?? null,
        location: occurrence.locationName ?? null,
        onlineUrl: occurrence.onlineUrl ?? null,
        scheduleOwner: 'source',
        derivation: occurrence.derivation ?? 'direct',
        suggestionStatus: 'confirmed',
        childItemIds: [`user-attendance-${occurrence.occurrenceId}`],
        individualCompletionOutsideCalendar: false,
        sourceRowIds: fixture.sourceRows.map((entry) => entry.sourceRowId),
      });
    }
  }

  if (overlay?.pacingAssignments?.length) {
    for (const assignment of overlay.pacingAssignments) {
      events.push({
        component: 'VEVENT',
        uid: `vevent-pacing-${assignment.itemId}@flowme.local`,
        canonicalItemId: assignment.itemId,
        canonicalStepId:
          fixture.items.find((entry) => entry.itemId === assignment.itemId)
            ?.stepId ?? null,
        summary:
          fixture.items.find((entry) => entry.itemId === assignment.itemId)
            ?.title ?? assignment.itemId,
        temporalIntent: 'user_pacing_assignment',
        start: assignment.start,
        end: assignment.end ?? null,
        allDay: assignment.allDay,
        timezone: assignment.timezone,
        scheduleOwner: 'user_overlay',
        derivation: 'pacing_policy',
        suggestionStatus: 'confirmed',
        childItemIds: [assignment.itemId],
        individualCompletionOutsideCalendar: false,
        sourceRowIds: sourceRefIds(
          fixture.items.find((entry) => entry.itemId === assignment.itemId) ?? {},
        ),
      });
    }
  }

  const groupingPolicy = overlay?.calendarGroupingPolicy ?? 'per_item';
  const groupedEvents =
    groupingPolicy === 'session_or_step_bundle'
      ? bundleCalendarEvents(events, fixture)
      : groupingPolicy === 'none'
        ? []
        : events;
  return {
    projectionType: 'calendar',
    schemaVersion: 'flowme-calendar-projection-v2',
    container: 'VCALENDAR',
    groupingPolicy,
    events: groupedEvents,
    nestedVtodoCount: 0,
    completionOwner: 'FlowMe',
  };
}

function bundleCalendarEvents(events, fixture) {
  const buckets = new Map();
  for (const event of events) {
    const key = [
      event.start,
      event.end ?? '',
      event.location ?? '',
      event.canonicalStepId ?? event.canonicalItemId,
      event.scheduleOwner,
    ].join('|');
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(event);
  }
  return [...buckets.values()].map((bucket) => {
    if (bucket.length === 1) return bucket[0];
    const step = fixture.steps.find(
      (entry) => entry.stepId === bucket[0].canonicalStepId,
    );
    return {
      component: 'VEVENT',
      uid: `vevent-bundle-${step?.stepId ?? bucket[0].canonicalStepId}@flowme.local`,
      canonicalItemId: null,
      canonicalStepId: step?.stepId ?? bucket[0].canonicalStepId,
      summary: step?.title ?? fixture.title,
      temporalIntent: bucket[0].temporalIntent,
      start: bucket[0].start,
      end: bucket[0].end,
      allDay: bucket[0].allDay,
      timezone: bucket[0].timezone,
      location: bucket[0].location ?? null,
      scheduleOwner: bucket[0].scheduleOwner,
      derivation: bucket[0].derivation,
      suggestionStatus: 'confirmed',
      childItemIds: bucket.flatMap((entry) => entry.childItemIds),
      individualCompletionOutsideCalendar: true,
      sourceRowIds: [...new Set(bucket.flatMap((entry) => entry.sourceRowIds))],
    };
  });
}

function makeSheetProjection(fixture) {
  const itemRows = fixture.items.map((entry) => {
    const step = getStepForItem(fixture, entry);
    return {
      rowKind: 'item',
      canonicalItemId: entry.itemId,
      canonicalStepId: step.stepId,
      step: step.title,
      title: entry.title,
      intent: entry.intent,
      completionMode: entry.completion?.mode ?? null,
      temporalIntent: entry.temporalIntent,
      scheduleMode: entry.schedule?.mode ?? 'none',
      sourceRowIds: sourceRefIds(entry),
      status: 'not_started',
    };
  });
  const occurrenceRows = (fixture.eventModel?.occurrences ?? []).map(
    (occurrence) => ({
      rowKind: 'source_occurrence',
      occurrenceId: occurrence.occurrenceId,
      seriesId: fixture.eventModel.seriesId,
      editionId: fixture.eventModel.editionId,
      title: occurrence.title ?? fixture.title,
      temporalIntent: occurrence.temporalIntent,
      start: occurrence.start ?? occurrence.startDate ?? null,
      end: occurrence.end ?? occurrence.endDateExclusive ?? null,
      timezone: occurrence.timezone ?? null,
      location: occurrence.locationName ?? null,
      status: occurrence.status ?? 'scheduled',
      sourceRowIds: fixture.sourceRows.map((entry) => entry.sourceRowId),
    }),
  );
  const sourceRows =
    itemRows.length || occurrenceRows.length
      ? []
      : fixture.sourceRows.map((entry) => ({
          rowKind: 'source_row',
          sourceRowId: entry.sourceRowId,
          sourceKind: entry.kind ?? entry.rowType,
          title: entry.title,
          temporalIntent: entry.temporalIntent ?? null,
          status: entry.status ?? null,
        }));
  return {
    projectionType: 'sheet',
    schemaVersion: 'flowme-sheet-projection-v1',
    columns: [
      'rowKind',
      'canonicalItemId',
      'canonicalStepId',
      'occurrenceId',
      'title',
      'temporalIntent',
      'scheduleMode',
      'start',
      'end',
      'timezone',
      'location',
      'status',
      'sourceRowIds',
    ],
    rows: [...itemRows, ...occurrenceRows, ...sourceRows],
  };
}

function makeMemoProjection(fixture) {
  const sections = fixture.steps.length
    ? fixture.steps.map((step) => ({
        heading: step.title,
        canonicalStepId: step.stepId,
        body: fixture.items
          .filter((entry) => entry.stepId === step.stepId)
          .sort((a, b) => a.order - b.order)
          .map((entry) => `- ${entry.title}${entry.description ? ` — ${entry.description}` : ''}`)
          .join('\n'),
      }))
    : [
        {
          heading: fixture.title,
          canonicalStepId: null,
          body: fixture.sourceRows
            .map((entry) => `- ${entry.title}`)
            .join('\n'),
        },
      ];
  return {
    projectionType: 'memo',
    schemaVersion: 'flowme-memo-projection-v1',
    format: 'markdown',
    canonicalRawData: false,
    title: fixture.title,
    sections,
    sourceLink: fixture.canonicalUrl,
  };
}

function eventCalendarEligibility(fixture) {
  const eventModel = fixture.eventModel;
  const validOccurrences = (eventModel?.occurrences ?? []).filter(
    (entry) =>
      entry.status !== 'cancelled' && (entry.start || entry.startDate),
  );
  if (fixture.fixtureKind === 'cancelled_and_incomplete_replacement') {
    return {
      availability: 'unavailable',
      minimumUserInputs: [],
      reason: '대체 회차의 시간·장소가 원문에서 다시 확인되지 않았다.',
    };
  }
  if (validOccurrences.length === 1) {
    return {
      availability: 'available_now',
      minimumUserInputs: [],
      reason:
        'URL 변환 요청을 저장 의사로 보고, 한 개의 확정 회차를 preview로 생성할 수 있다.',
      defaultOverlay: {
        selectedOccurrenceIds: [validOccurrences[0].occurrenceId],
      },
    };
  }
  if (validOccurrences.length > 1) {
    return {
      availability: 'available_after_user_overlay',
      minimumUserInputs: ['selectedOccurrenceId 또는 saveAllOccurrences'],
      reason: '여러 회차 중 사용자의 선택이 필요하다.',
    };
  }
  if (eventModel?.recurrenceRule) {
    return {
      availability: 'available_after_user_overlay',
      minimumUserInputs: ['전체 시리즈 또는 개별 회차 선택'],
      reason: '원문 반복은 확정됐지만 개인 캘린더 저장 범위를 확인해야 한다.',
    };
  }
  if (
    eventModel?.availabilityWindows?.length ||
    eventModel?.requiredOverlayFields?.length
  ) {
    return {
      availability: 'available_after_user_overlay',
      minimumUserInputs:
        eventModel.requiredOverlayFields ?? ['selectedVisitDateTime'],
      reason: '원문은 가능 기간이며 실제 방문 시각은 개인 선택이다.',
    };
  }
  return {
    availability: 'unavailable',
    minimumUserInputs: [],
    reason: '정확한 회차 시각이나 장소가 아직 확보되지 않았다.',
  };
}

function baselineCalendarEligibility(fixture) {
  const absoluteItems = fixture.items.filter(
    (entry) =>
      entry.schedule?.mode === 'absolute' &&
      entry.temporalIntent !== 'due_deadline',
  );
  const relativeItems = fixture.items.filter((entry) =>
    ['anchor_offset', 'date_window'].includes(entry.schedule?.mode),
  );
  if (absoluteItems.length) {
    return {
      availability: 'available_now',
      minimumUserInputs: [],
      reason: '원문 기반 absolute 일정이 있다.',
    };
  }
  if (relativeItems.length) {
    const referencedAnchorIds = new Set(
      relativeItems
        .map((entry) => entry.schedule?.anchorFieldId)
        .filter(Boolean),
    );
    const anchorLabels = (fixture.fields ?? [])
      .filter((entry) => referencedAnchorIds.has(entry.fieldId))
      .map((entry) => entry.label);
    return {
      availability: 'available_after_user_overlay',
      minimumUserInputs: anchorLabels.length
        ? anchorLabels
        : ['기준일 또는 실제 날짜'],
      reason: '상대 일정 또는 날짜창을 실제 날짜로 해소해야 한다.',
    };
  }
  if (fixture.pacingEligible) {
    return {
      availability: 'available_after_user_overlay',
      minimumUserInputs: ['시작일', 'pacing 정책 확인'],
      reason: '원문 일정은 없지만 확인된 개인 pacing으로 일정화할 수 있다.',
    };
  }
  return {
    availability: 'unavailable',
    minimumUserInputs: [],
    reason: '원문 일정과 승인된 개인 일정화 정책이 없다.',
  };
}

function eventTodoProjection(fixture) {
  const tasks = [];
  for (const milestone of fixture.eventModel?.milestones ?? []) {
    if (!['ticket_open', 'due_deadline'].includes(milestone.temporalIntent)) {
      continue;
    }
    tasks.push({
      taskId: `todo-${milestone.milestoneId}`,
      recordKind: 'task',
      canonicalItemId: `user-action-${milestone.milestoneId}`,
      parentTaskId: null,
      title:
        milestone.action === 'result_check'
          ? `${fixture.title} 결과 확인하기`
          : `${fixture.title} 예매하기`,
      due: milestone.at,
      queuePosition: tasks.length,
      canReorder: true,
      canDefer: true,
      temporalIntent: milestone.temporalIntent,
      completionOwnedBy: 'FlowMe and destination when supported',
      sourceRowIds: fixture.sourceRows.map((entry) => entry.sourceRowId),
    });
  }
  for (const window of fixture.eventModel?.applicationWindows ?? []) {
    tasks.push({
      taskId: `todo-${window.windowId}`,
      recordKind: 'task',
      canonicalItemId: `user-action-${window.windowId}`,
      parentTaskId: null,
      title: `${fixture.title} ${window.windowId} 처리하기`,
      due: window.end ?? window.endDate ?? null,
      availableFrom: window.start ?? window.startDate ?? null,
      queuePosition: tasks.length,
      canReorder: true,
      canDefer: true,
      temporalIntent: 'application_window',
      completionOwnedBy: 'FlowMe and destination when supported',
      sourceRowIds: fixture.sourceRows.map((entry) => entry.sourceRowId),
    });
  }
  return {
    projectionType: 'todo',
    schemaVersion: 'flowme-todo-projection-v1',
    groupingStrategy: 'flat_items',
    tasks,
  };
}

function makeVtodoComponents(todoProjection) {
  return (todoProjection?.tasks ?? [])
    .filter((task) => task.canonicalItemId)
    .map((task) => ({
      component: 'VTODO',
      uid: `vtodo-${task.canonicalItemId}@flowme.local`,
      canonicalItemId: task.canonicalItemId,
      summary: task.title,
      due: task.due ?? null,
      relatedStepId: task.canonicalStepId ?? null,
      nestedComponents: [],
      sourceRowIds: task.sourceRowIds ?? [],
    }));
}

function projectionCell(fixture, projection) {
  const primary = fixture.primaryProjection;
  const isPrimary = primary === projection;
  let recommendation = isPrimary ? 'primary' : 'optional';
  let availability = 'available_now';
  let fidelity = 'bounded_loss';
  let minimumUserInputs = [];
  let destinationCapabilityNeeded = [];
  let prohibitionReason = null;
  let fallback = null;
  let output = null;
  let losses = [];

  if (projection === 'calendar') {
    const eligibility =
      fixture.fixtureGroup === 'event_native'
        ? eventCalendarEligibility(fixture)
        : baselineCalendarEligibility(fixture);
    availability = eligibility.availability;
    minimumUserInputs = eligibility.minimumUserInputs;
    destinationCapabilityNeeded = ['VEVENT'];
    if (!isPrimary) {
      recommendation =
        availability === 'unavailable'
          ? 'not_recommended'
          : fixture.pacingEligible || fixture.sourceSchedulePresent
            ? 'secondary'
            : 'optional';
    }
    fidelity =
      availability === 'unavailable'
        ? 'misleading_or_prohibited'
        : 'bounded_loss';
    output = makeCalendarProjection(fixture, eligibility.defaultOverlay);
    if (availability !== 'available_now') {
      output.events = [];
    }
    losses = [
      'Calendar does not own Item completion.',
      'Step/Flow hierarchy is retained only through embedded canonical IDs.',
    ];
    if (availability === 'unavailable') {
      prohibitionReason = eligibility.reason;
      fallback = fixture.items.length ? 'todo_or_checklist' : 'sheet_or_memo';
    } else if (availability === 'available_after_user_overlay') {
      fallback = fixture.items.length ? 'todo_or_checklist_until_confirmed' : 'sheet_or_memo_until_selected';
    }
  }

  if (projection === 'checklist') {
    const natural = fixture.checklistTodoLabel === 'checklist';
    if (!fixture.items.length) {
      availability = 'unavailable';
      recommendation = 'not_recommended';
      fidelity = 'misleading_or_prohibited';
      output = makeChecklistProjection(fixture);
      prohibitionReason =
        '행사 정보나 SourceOccurrence 자체는 완료 가능한 체크 항목이 아니다.';
      fallback = 'calendar_after_selection_or_sheet_or_memo';
    } else {
      availability = 'available_now';
      recommendation = isPrimary
        ? 'primary'
        : natural
          ? 'secondary'
          : 'optional';
      fidelity = natural ? 'lossless_or_low_loss' : 'bounded_loss';
      output = makeChecklistProjection(fixture);
      losses = natural
        ? ['Rich typed fields may be flattened into entry detail.']
        : [
            'Queue reordering/defer semantics are not represented as first-class fields.',
          ];
    }
    destinationCapabilityNeeded = ['ordered_groups', 'per_entry_completion'];
  }

  if (projection === 'todo') {
    const natural = fixture.checklistTodoLabel === 'todo';
    output =
      fixture.fixtureGroup === 'event_native'
        ? eventTodoProjection(fixture)
        : makeTodoProjection(fixture);
    if (!output.tasks.length) {
      availability =
        fixture.fixtureGroup === 'event_native' &&
        fixture.eventModel?.itemActivation &&
        fixture.eventModel.itemActivation !== 'none_until_replacement_details_confirmed'
          ? 'available_after_user_overlay'
          : 'unavailable';
      recommendation =
        availability === 'unavailable' ? 'not_recommended' : 'optional';
      fidelity =
        availability === 'unavailable'
          ? 'misleading_or_prohibited'
          : 'bounded_loss';
      minimumUserInputs =
        availability === 'available_after_user_overlay'
          ? ['action or attendance intent']
          : [];
      prohibitionReason =
        availability === 'unavailable'
          ? '독립적으로 완료할 source-backed action Item이 없다.'
          : null;
      fallback = 'sheet_or_memo';
    } else {
      availability = 'available_now';
      recommendation = isPrimary
        ? 'primary'
        : natural
          ? 'secondary'
          : 'optional';
      fidelity = natural ? 'lossless_or_low_loss' : 'bounded_loss';
      losses = natural
        ? ['Step layout depends on parent/subtask destination support.']
        : [
            'Closed-set omission sensitivity may be weakened in an open task queue.',
          ];
    }
    destinationCapabilityNeeded = [
      'task_completion',
      'due_date',
      'optional_parent_subtask',
    ];
    fallback = fallback ?? 'flat_todo_with_step_prefix';
  }

  if (projection === 'sheet') {
    output = makeSheetProjection(fixture);
    recommendation = isPrimary
      ? 'primary'
      : ['progress_tracking', 'compare_decide', 'resource_queue'].includes(
            fixture.executionPattern,
          ) || fixture.fixtureGroup === 'event_native'
        ? 'secondary'
        : 'optional';
    availability = 'available_now';
    fidelity = 'lossless_or_low_loss';
    destinationCapabilityNeeded = ['stable_columns', 'stable_ids'];
    losses = [
      'Native reminders and attendance notifications are not represented.',
      'Nested hierarchy is denormalized into ID columns.',
    ];
    fallback = 'csv_or_tsv';
  }

  if (projection === 'memo') {
    output = makeMemoProjection(fixture);
    recommendation = isPrimary ? 'primary' : 'optional';
    availability = 'available_now';
    fidelity = 'bounded_loss';
    destinationCapabilityNeeded = ['plain_text_or_markdown'];
    losses = [
      'Typed completion, schedule, and relation fields are human-readable text only.',
      'Memo is not canonical raw data and is not guaranteed to round-trip.',
    ];
    fallback = 'canonical_json_for_machine_roundtrip';
  }

  const recordCount =
    output?.events?.length ??
    output?.groups?.length ??
    output?.tasks?.length ??
    output?.rows?.length ??
    output?.sections?.length ??
    0;
  const generated =
    availability === 'available_now' &&
    fidelity !== 'misleading_or_prohibited' &&
    recordCount > 0;
  if (!generated && availability === 'available_now') {
    availability = 'unavailable';
    fidelity = 'misleading_or_prohibited';
    prohibitionReason =
      prohibitionReason ?? '생성 가능한 canonical record가 없다.';
  }

  return {
    cellId: `${fixture.fixtureId}--${projection}`,
    fixtureId: fixture.fixtureId,
    fixtureGroup: fixture.fixtureGroup,
    title: fixture.title,
    projection,
    canonicalPrimaryProjection: fixture.frozenPrimaryProjection ?? null,
    labPrimaryProjection: primary,
    checklistTodoLabel: fixture.checklistTodoLabel,
    recommendation,
    availability,
    fidelity,
    generated,
    recordCount: generated ? recordCount : 0,
    minimumUserInputs,
    destinationCapabilityNeeded,
    lossManifest: losses,
    prohibitionReason,
    fallback,
    output: generated ? output : null,
  };
}

const projectionCells = flatten(
  allFixtures.map((fixture) =>
    projectionNames.map((projection) => projectionCell(fixture, projection)),
  ),
);

const generatedOutputs = projectionCells.filter((cell) => cell.generated);

const projectionMatrix = {
  schemaVersion: 'flowme-projection-eligibility-matrix-v1',
  generatedAt,
  claimBoundary: {
    automatedQaIsObservedUserValidation: false,
    externalCalendarRoundTrip: 'NOT_RUN',
    vtodoClientRoundTrip: 'NOT_RUN',
  },
  controlledEnums: artifactSemantics.sharedAxes,
  counts: {
    baselineFixtures: baselineFixtures.length,
    newFixtures: newFixtures.length,
    totalFixtures: allFixtures.length,
    projectionsPerFixture: projectionNames.length,
    baselineCells: baselineFixtures.length * projectionNames.length,
    totalCells: projectionCells.length,
    generatedCells: generatedOutputs.length,
    eventNativeFixtures: eventFixtures.length,
    checklistTodoBoundaryFixtures: checklistTodoFixtures.length,
    newCanonicalUrls: new Set(newFixtures.map((entry) => entry.canonicalUrl))
      .size,
  },
  cells: projectionCells.map(({ output, ...cell }) => cell),
};

const allFormatResults = {
  schemaVersion: 'flowme-all-format-projection-results-v1',
  generatedAt,
  counts: projectionMatrix.counts,
  results: projectionCells,
};

function scheduleItems(fixture, policy, priorAssignments = []) {
  const targetItems = fixture.items.filter(
    (entry) =>
      entry.temporalIntent === 'no_schedule' ||
      !entry.schedule ||
      entry.schedule.mode === 'none',
  );
  const completedLocked = priorAssignments.filter(
    (entry) => entry.completionStatus === 'completed' && entry.lockedPast,
  );
  const lockedIds = new Set(completedLocked.map((entry) => entry.itemId));
  const remainingItems = targetItems.filter(
    (entry) => !lockedIds.has(entry.itemId),
  );
  const allowedWeekdays =
    policy.allowedWeekdays?.length ? policy.allowedWeekdays : [1, 2, 3, 4, 5, 6, 7];
  const restDates = new Set(policy.restDates ?? []);
  const usableDates = [];
  let cursor = policy.startDate;
  const targetEnd = policy.targetEndDate ?? addDays(policy.startDate, 365);
  let safety = 0;
  while (
    usableDates.length < Math.max(remainingItems.length * 2, 30) &&
    cursor <= targetEnd &&
    safety < 800
  ) {
    if (
      allowedWeekdays.includes(isoWeekday(cursor)) &&
      !restDates.has(cursor)
    ) {
      usableDates.push(cursor);
    }
    cursor = addDays(cursor, 1);
    safety += 1;
  }

  const assignments = [...completedLocked];
  if (policy.mode === 'items_per_day') {
    remainingItems.forEach((entry, index) => {
      const date = usableDates[Math.floor(index / policy.itemsPerDay)];
      assignments.push(makePacingAssignment(entry, date, policy));
    });
  } else if (policy.mode === 'items_per_week') {
    const weeks = new Map();
    for (const date of usableDates) {
      const monday = addDays(date, 1 - isoWeekday(date));
      if (!weeks.has(monday)) weeks.set(monday, []);
      weeks.get(monday).push(date);
    }
    const weekEntries = [...weeks.entries()];
    remainingItems.forEach((entry, index) => {
      const weekIndex = Math.floor(index / policy.itemsPerWeek);
      const positionInWeek = index % policy.itemsPerWeek;
      const weekDates = weekEntries[weekIndex]?.[1] ?? [];
      const date = weekDates[positionInWeek % Math.max(weekDates.length, 1)];
      assignments.push(makePacingAssignment(entry, date, policy));
    });
  } else if (policy.mode === 'target_end_date') {
    if (usableDates.length < remainingItems.length) {
      throw new Error(
        `${fixture.fixtureId}: target_end_date cannot place every Item on allowed dates`,
      );
    }
    const lastIndex = usableDates.length - 1;
    remainingItems.forEach((entry, index) => {
      const date =
        remainingItems.length === 1
          ? usableDates[0]
          : usableDates[
              Math.round((index * lastIndex) / (remainingItems.length - 1))
            ];
      assignments.push(makePacingAssignment(entry, date, policy));
    });
  } else if (policy.mode === 'manual') {
    const manualByItem = new Map(
      policy.manualDates.map((entry) => [entry.itemId, entry.date]),
    );
    for (const entry of remainingItems) {
      const date = manualByItem.get(entry.itemId);
      if (!date) {
        throw new Error(`${fixture.fixtureId}: missing manual date for ${entry.itemId}`);
      }
      assignments.push(makePacingAssignment(entry, date, policy));
    }
  } else {
    throw new Error(`Unsupported pacing mode ${policy.mode}`);
  }

  const sorted = assignments.sort((a, b) => {
    const timeOrder = a.start.localeCompare(b.start);
    if (timeOrder !== 0) return timeOrder;
    const itemA = fixture.items.find((entry) => entry.itemId === a.itemId);
    const itemB = fixture.items.find((entry) => entry.itemId === b.itemId);
    return (itemA?.order ?? 0) - (itemB?.order ?? 0);
  });
  return sorted;
}

function makePacingAssignment(itemRecord, date, policy) {
  if (!date) {
    throw new Error(`No usable pacing date for ${itemRecord.itemId}`);
  }
  const allDay = !policy.preferredTime;
  return {
    assignmentId: `pacing-${policy.policyId}-${itemRecord.itemId}`,
    itemId: itemRecord.itemId,
    start: allDay
      ? date
      : `${date}T${policy.preferredTime}:00${policy.utcOffset ?? '+09:00'}`,
    end: null,
    allDay,
    timezone: policy.timezone,
    scheduleOwner: 'user_overlay',
    derivation: 'pacing_policy',
    suggestionStatus: 'confirmed',
    completionStatus: 'not_started',
    lockedPast: false,
  };
}

function pacingExperiment(fixtureId, policy, options = {}) {
  const fixture = fixtureById.get(fixtureId);
  if (!fixture) throw new Error(`Unknown pacing fixture ${fixtureId}`);
  const firstRun = scheduleItems(fixture, policy, options.priorAssignments ?? []);
  const secondRun = scheduleItems(
    fixture,
    policy,
    options.priorAssignments ?? [],
  );
  const targetItemIds = fixture.items
    .filter(
      (entry) =>
        entry.temporalIntent === 'no_schedule' ||
        !entry.schedule ||
        entry.schedule.mode === 'none',
    )
    .map((entry) => entry.itemId);
  const assignedIds = firstRun.map((entry) => entry.itemId);
  const duplicates = assignedIds.filter(
    (entry, index) => assignedIds.indexOf(entry) !== index,
  );
  const missing = targetItemIds.filter((entry) => !assignedIds.includes(entry));
  const sourceOrder = new Map(
    fixture.items.map((entry, index) => [entry.itemId, index]),
  );
  const assignmentOrder = new Map(
    firstRun.map((entry, index) => [entry.itemId, index]),
  );
  const dependencyViolations = fixture.items.flatMap((entry) =>
    (entry.dependsOnItemIds ?? [])
      .filter(
        (dependencyId) =>
          assignmentOrder.has(entry.itemId) &&
          assignmentOrder.has(dependencyId) &&
          assignmentOrder.get(dependencyId) > assignmentOrder.get(entry.itemId),
      )
      .map((dependencyId) => ({
        itemId: entry.itemId,
        dependencyId,
      })),
  );
  const sequenceViolations = firstRun
    .map((entry) => sourceOrder.get(entry.itemId))
    .filter((order, index, values) => index && order < values[index - 1]);
  return {
    experimentId: `pacing-experiment-${fixtureId}`,
    fixtureId,
    title: fixture.title,
    targetItemCount: targetItemIds.length,
    policy,
    assignments: firstRun,
    checks: {
      duplicateItemIds: [...new Set(duplicates)],
      missingItemIds: missing,
      dependencyViolations,
      sourceOrderViolations: sequenceViolations.length,
      deterministic:
        stableStringify(firstRun) === stableStringify(secondRun),
      assignmentHash: sha256(stableStringify(firstRun)),
    },
  };
}

const pacingPolicies = [
  ['base-opentutorials-web1-progress', {
    policyId: 'web1-two-per-day',
    mode: 'items_per_day',
    startDate: '2026-08-03',
    itemsPerDay: 2,
    allowedWeekdays: [1, 2, 3, 4, 5],
    preferredTime: null,
    timezone: 'Asia/Seoul',
    restDates: ['2026-08-14'],
  }],
  ['oq-oq-c02-kmooc-full', {
    policyId: 'kmooc-three-per-week',
    mode: 'items_per_week',
    startDate: '2026-08-03',
    itemsPerWeek: 3,
    allowedWeekdays: [1, 3, 5],
    preferredTime: '20:00',
    timezone: 'Asia/Seoul',
    utcOffset: '+09:00',
    restDates: [],
  }],
  ['oq-oq-c03-librivox', {
    policyId: 'librivox-target-end',
    mode: 'target_end_date',
    startDate: '2026-08-03',
    targetEndDate: '2026-09-30',
    allowedWeekdays: [1, 2, 3, 4, 5, 6, 7],
    preferredTime: null,
    timezone: 'Asia/Seoul',
    restDates: [],
  }],
  ['base-andstudio-job-prep-videos', {
    policyId: 'and-one-per-day',
    mode: 'items_per_day',
    startDate: '2026-08-04',
    itemsPerDay: 1,
    allowedWeekdays: [2, 4, 6],
    preferredTime: '19:30',
    timezone: 'Asia/Seoul',
    utcOffset: '+09:00',
    restDates: [],
  }],
  ['new-mdn-core-scripting', {
    policyId: 'mdn-two-per-day',
    mode: 'items_per_day',
    startDate: '2026-08-03',
    itemsPerDay: 2,
    allowedWeekdays: [1, 2, 3, 4, 5],
    preferredTime: '21:00',
    timezone: 'Asia/Seoul',
    utcOffset: '+09:00',
    restDates: [],
  }],
  ['new-gutenberg-top-reading-queue', {
    policyId: 'gutenberg-two-per-week',
    mode: 'items_per_week',
    startDate: '2026-08-03',
    itemsPerWeek: 2,
    allowedWeekdays: [3, 7],
    preferredTime: null,
    timezone: 'Asia/Seoul',
    restDates: [],
  }],
  ['new-google-codelab-ai-agent', {
    policyId: 'codelab-target-end',
    mode: 'target_end_date',
    startDate: '2026-08-03',
    targetEndDate: '2026-08-16',
    allowedWeekdays: [1, 3, 5, 7],
    preferredTime: '20:30',
    timezone: 'Asia/Seoul',
    utcOffset: '+09:00',
    restDates: [],
  }],
  ['base-wtable-summer-banchan-five', {
    policyId: 'banchan-manual',
    mode: 'manual',
    startDate: '2026-08-03',
    allowedWeekdays: [1, 2, 3, 4, 5, 6, 7],
    preferredTime: null,
    timezone: 'Asia/Seoul',
    restDates: [],
    manualDates: fixtureById
      .get('base-wtable-summer-banchan-five')
      .items.map((entry, index) => ({
        itemId: entry.itemId,
        date: addDays('2026-08-03', index),
      })),
  }],
];

const pacingExperiments = pacingPolicies.map(([fixtureId, policy]) =>
  pacingExperiment(fixtureId, policy),
);

const firstWebAssignment = pacingExperiments[0].assignments[0];
const pacingRevisionEvidence = {
  scenarioId: 'web1-policy-revision-future-only',
  fixtureId: 'base-opentutorials-web1-progress',
  completedPastAssignment: {
    ...firstWebAssignment,
    completionStatus: 'completed',
    lockedPast: true,
  },
};
const revisedWebPolicy = {
  ...pacingPolicies[0][1],
  policyId: 'web1-three-per-day-revision',
  itemsPerDay: 3,
  startDate: addDays(dateOnly(firstWebAssignment.start), 1),
};
pacingRevisionEvidence.revisedAssignments = scheduleItems(
  fixtureById.get(pacingRevisionEvidence.fixtureId),
  revisedWebPolicy,
  [pacingRevisionEvidence.completedPastAssignment],
);
pacingRevisionEvidence.completedPastUnchanged =
  stableStringify(pacingRevisionEvidence.revisedAssignments[0]) ===
  stableStringify(pacingRevisionEvidence.completedPastAssignment);

const pacingContract = {
  schemaVersion: 'flowme-user-pacing-schedule-contract-v1',
  generatedAt,
  ownership: {
    entity: 'UserFlowCopy',
    scheduleOwner: 'user_overlay',
    derivation: 'pacing_policy',
    draftBeforeConfirmation: true,
    sourceScheduleOverwritten: false,
  },
  requestFields: {
    required: ['policyId', 'mode', 'startDate', 'timezone'],
    modes: {
      items_per_day: ['itemsPerDay'],
      items_per_week: ['itemsPerWeek'],
      target_end_date: ['targetEndDate'],
      manual: ['manualDates'],
    },
    optional: [
      'allowedWeekdays',
      'preferredTime',
      'restDates',
      'groupingPolicy',
    ],
  },
  invariants: [
    'Every target Item is assigned exactly once.',
    'Source order and explicit dependencies are preserved.',
    'Items are never split to fit a quota.',
    'Source schedules are never overwritten.',
    'Only future unfinished assignments are recalculated.',
    'Identical input produces identical output.',
    'Duration and effort are not inferred when absent.',
  ],
  experiments: pacingExperiments,
  revisionEvidence: pacingRevisionEvidence,
};

function scoreArchitecture(key) {
  const scores = architectureRawScores[key];
  const axisScores = architectureCriteria.map((criterion) => ({
    key: criterion.key,
    label: criterion.label,
    max: criterion.weight,
    score: scores[criterion.key],
  }));
  return {
    architectureId: key,
    axisScores,
    total: axisScores.reduce((sum, entry) => sum + entry.score, 0),
    max: architectureCriteria.reduce((sum, entry) => sum + entry.weight, 0),
  };
}

const architectureComparison = {
  schemaVersion: 'flowme-architecture-comparison-v1',
  generatedAt,
  evidenceCorpus: {
    baselineFixtures: baselineFixtures.length,
    newFixtures: newFixtures.length,
    eventNativeFixtures: eventFixtures.length,
    projectionCells: projectionCells.length,
  },
  criteria: architectureCriteria,
  alternatives: [
    {
      ...scoreArchitecture('current_sibling'),
      label: 'A. Current sibling projection',
      structure: 'Item → Calendar / Checklist / Todo / Sheet / Memo',
      verdict: 'modify',
      reason:
        'Canonical boundary is sound, but Todo semantics, event source facts, and destination grouping need first-class adapter contracts.',
    },
    {
      ...scoreArchitecture('progressive_wrapper'),
      label: 'B. Progressive wrapper hierarchy',
      structure: 'Action → Checklist → Todo → Calendar',
      verdict: 'reject_as_canonical',
      reason:
        'Checklist and Todo are not universal wrappers; due dates do not imply VEVENT, and event facts may exist before any action Item.',
    },
    {
      ...scoreArchitecture('item_plus_destination_grouping'),
      label: 'C. Item canonical + destination-specific grouping',
      structure:
        'Item + Step canonical → capability-aware checklist/task/event/row adapters',
      verdict: 'adopt',
      reason:
        'Preserves one stateful Item while allowing bounded checklists, reorderable task queues, session bundles, and event occurrence selection.',
    },
  ],
  finalAdjudication: {
    decision: 'adopt_item_canonical_with_destination_specific_grouping',
    userProposalDisposition:
      '수정 채택: Action이 최소 Item이라는 통찰과 묶음 adapter는 채택하되 Checklist→Todo→Calendar 고정 상하관계는 채택하지 않는다.',
  },
};

const checklistTodoContract = {
  schemaVersion: 'flowme-checklist-todo-decision-contract-v1',
  generatedAt,
  canonicalRelationship: 'sibling_projections',
  definitions: {
    checklist: {
      definition:
        '한 상황·세션·목표에서 누락 없이 끝내야 하는 유한한 Item 묶음',
      bounded: true,
      order: 'preserve_source_or_procedure_order',
      grouping: 'Step_group_required',
      reorder: 'normally_no',
      completion: 'per_Item_plus_group_progress',
      parentSubtask: 'not_required',
      fallback: 'numbered grouped checklist',
    },
    todo: {
      definition:
        '독립적으로 꺼내 실행하고 미루고 재정렬할 수 있는 다음 행동 또는 자료 queue',
      bounded: false,
      order: 'queue_order_user_editable_unless_dependency',
      grouping: 'optional_Step_parent',
      reorder: 'yes_when_no_dependency',
      completion: 'per_Item_task',
      parentSubtask: 'adapter_when_supported',
      fallback: 'flat tasks with Step prefix/tag',
    },
  },
  decisionOrder: [
    'Is there an independently stateful Item?',
    'Is the set finite and omission-sensitive in one context?',
    'Does source order or procedure dependency need preserving?',
    'Can each Item be deferred/reordered and remain meaningful?',
    'Choose one primary projection; record the sibling as secondary when useful.',
  ],
  tieBreakers: [
    {
      when: 'ordered finite procedure',
      choose: 'checklist',
      avoid: 'todo',
    },
    {
      when: 'multi-day lesson progress',
      choose: 'todo for execution queue; sheet for overview',
      secondary: 'checklist only for a bounded session',
    },
    {
      when: 'resource collection selected for later',
      choose: 'todo',
      avoid: 'checklist unless completeness is the user job',
    },
    {
      when: 'repeating maintenance session',
      choose: 'checklist inside each occurrence',
      secondary: 'calendar for the confirmed recurrence',
    },
  ],
  schemaDifference: {
    checklist:
      'groups[].orderedEntries[] with bounded, orderLocked, required, sourceOrder',
    todo:
      'tasks[] with parentTaskId, queuePosition, canReorder, canDefer, due, dependencyItemIds',
  },
};

const temporalIntentContract = {
  schemaVersion: 'flowme-temporal-intent-contract-v1',
  generatedAt,
  intents: temporalIntentDefinitions,
  dueVsEvent: {
    due:
      '완료 기한이다. 기본은 Todo/VTODO DUE이며 실행 시간을 의미하지 않는다.',
    event:
      '실제 참석·방문·수업·공연 또는 사용자가 정한 실행 시간이다. VEVENT로 표현한다.',
    prohibited:
      'DUE만 있는 Item을 자동으로 임의 time-block VEVENT로 만들지 않는다.',
  },
  provenance: {
    scheduleOwner: ['source', 'user_overlay'],
    derivation: ['direct', 'anchor_resolution', 'pacing_policy', 'manual'],
    suggestionStatus: ['none', 'draft', 'confirmed'],
  },
};

const eventOccurrenceContract = {
  schemaVersion: 'flowme-event-occurrence-contract-v1',
  generatedAt,
  selectedModel: 'C_source_occurrence_then_user_item',
  comparedModels: [
    {
      id: 'A_source_row_is_item',
      verdict: 'reject_as_default',
      risk:
        '관심도 표현하지 않은 행사 정보에 완료 상태를 부여하고 listing을 Todo로 오해한다.',
    },
    {
      id: 'B_occurrence_always_separate',
      verdict: 'modify',
      risk:
        'source fact는 잘 보존하지만 user attendance/booking Item 생성 시점이 불명확하다.',
    },
    {
      id: 'C_source_occurrence_then_user_item',
      verdict: 'adopt',
      reason:
        'Series/Edition/Occurrence를 source fact로 두고 사용자의 저장·예매·참석 선택 시 Item을 만든다.',
    },
  ],
  hierarchy: [
    'EventSeries',
    'EventEdition',
    'SourceOccurrence | AvailabilityWindow | Milestone',
    'User attendance/booking/result intent',
    'Item',
    'Projection',
  ],
  requiredFields: [
    'occurrenceId',
    'seriesId?',
    'editionId?',
    'title',
    'temporalIntent',
    'start/end or date window',
    'timezone',
    'timezoneEvidence',
    'allDay',
    'location',
    'onlineUrl',
    'status',
    'rescheduledFromId/rescheduledToId',
    'sourceRef',
    'observedAt',
    'freshnessStatus',
    'conflictStatus',
  ],
  recurrenceRules: {
    sourceFixedRecurrence: 'RRULE allowed when range, frequency, and exceptions are source-backed.',
    changingAnnualFestival:
      'Use Series + yearly Edition; false FREQ=YEARLY is prohibited.',
  },
};

const iCalendarMapping = {
  schemaVersion: 'flowme-icalendar-component-mapping-v2',
  generatedAt,
  container: {
    component: 'VCALENDAR',
    role: 'exchange container for sibling components',
  },
  components: {
    VEVENT: {
      canonicalGranularity: 'scheduled Item occurrence',
      useWhen: [
        'fixed attendance or visit',
        'all-day occurrence',
        'confirmed user time block',
        'confirmed user pacing when Calendar is chosen',
      ],
      neverWhen: ['due-only Item', 'undated Item', 'unselected availability window'],
      mayContain: ['VALARM'],
      mayNotContain: ['VTODO', 'Flow', 'Step', 'Map'],
    },
    VTODO: {
      canonicalGranularity: 'independently actionable Item',
      useWhen: ['task with optional DUE', 'application action', 'ticket action'],
      neverWhen: ['passive event listing', 'calendar attendance block'],
      mayContain: ['VALARM'],
      mayNotContain: ['VEVENT', 'Flow', 'Step', 'Map'],
      destinationSupport: 'not assumed',
      fallback: ['native Todo task', 'Checklist', 'Sheet', 'Memo'],
    },
    VALARM: {
      canonicalGranularity: 'explicit user reminder policy',
      useWhen: ['user explicitly requests a reminder'],
      default: 'omit',
    },
  },
  grouping: {
    policies: ['none', 'per_item', 'session_or_step_bundle'],
    sessionBundleRequirements: [
      'same date and time',
      'same place or execution context',
      'one user session',
      'all child Item IDs retained',
      'FlowMe owns individual completion',
      'external completion loss disclosed',
    ],
  },
  externalRoundTrip: {
    googleCalendar: 'NOT_RUN',
    outlookCalendar: 'NOT_RUN',
    appleCalendar: 'NOT_RUN',
    vtodoClients: 'NOT_RUN',
  },
};

const runtimeGapCrosswalk = {
  schemaVersion: 'flowme-runtime-gap-crosswalk-v2',
  generatedAt,
  scope: 'read_only_audit',
  measuredCounts: {
    runtimeExportDestinations: 4,
    runtimeTodoDestinations: 0,
    runtimeFlowItemTypeValues: 2,
    runtimeVtodoBuilders: 0,
    frozenCorpusChecklistTodoSharedArrays: 1,
  },
  gaps: [
    {
      contract: 'Todo is a sibling projection with task/queue semantics.',
      runtimeEvidence:
        'lib/flow/export-scope.ts:1-6 defines four destinations and excludes todo.',
      currentRuntime: 'calendar | checklist | sheet | memo',
      impact: 'Todo adapter is planning-only in this lab.',
      runtimeChanged: false,
    },
    {
      contract: 'Execution meaning and destination are separate.',
      runtimeEvidence:
        "lib/flow/types.ts:100-106 defines FlowItem.type = 'todo' | 'calendar'.",
      currentRuntime: 'type mixes meaning and destination.',
      impact: 'Future DTO migration needs an intent field plus projection request.',
      runtimeChanged: false,
    },
    {
      contract: 'Checklist and Todo have distinct output schemas.',
      runtimeEvidence:
        'docs/specs/2026-07-28-flow-canonical-structure-corpus-expansion-v1/build-corpus-v1.mjs:803,856-857 routes both checklist and todo through checklistEntries.',
      currentRuntime: 'No first-class Todo result schema.',
      impact: 'New lab outputs groups[].orderedEntries[] vs tasks[].',
      runtimeChanged: false,
    },
    {
      contract: 'Timed/location-aware events and VTODO are explicit.',
      runtimeEvidence:
        'lib/flow/export.ts:700-820 builds VEVENT entries; repository search finds no VTODO builder.',
      currentRuntime: 'No event status, series edition, or source occurrence contract.',
      impact: 'Backend planning contract added; runtime remains untouched.',
      runtimeChanged: false,
    },
    {
      contract: 'Memo is a human-readable projection, not canonical raw JSON.',
      runtimeEvidence: 'Memo exports are text artifacts.',
      currentRuntime: 'Compatible in spirit; terminology needed clarification.',
      impact: 'No runtime change.',
      runtimeChanged: false,
    },
  ],
};

const decisionRegisterDelta = {
  schemaVersion: 'flowme-planning-decision-register-delta-v1',
  generatedAt,
  status: 'planning_defaults_pending_product_approval',
  decisions: [
    {
      id: 'PDS-01',
      decision: 'Keep Item canonical; projections remain siblings.',
      recommendation: 'approve',
    },
    {
      id: 'PDS-02',
      decision:
        'Use destination-specific Step parent/Item subtask and Calendar bundle adapters.',
      recommendation: 'approve',
    },
    {
      id: 'PDS-03',
      decision:
        'Treat pacing as confirmed UserFlowCopy overlay; default preview is draft.',
      recommendation: 'approve',
    },
    {
      id: 'PDS-04',
      decision:
        'Due-only Items stay Todo/VTODO; never auto time-block them.',
      recommendation: 'approve',
    },
    {
      id: 'PDS-05',
      decision:
        'Store Series/Edition/Occurrence source facts separately; create user Items on intent.',
      recommendation: 'approve',
    },
    {
      id: 'PDS-06',
      decision:
        'Do not promise VTODO portability until destination round-trip tests exist.',
      recommendation: 'approve',
    },
  ],
};

function representativeDto(fixtureId, projectionRequests, overlay = {}) {
  const fixture = fixtureById.get(fixtureId);
  const baseResult = {};
  for (const request of projectionRequests) {
    if (request === 'calendar') {
      baseResult.calendar = makeCalendarProjection(fixture, overlay);
    } else if (request === 'checklist') {
      baseResult.checklist = makeChecklistProjection(fixture);
    } else if (request === 'todo') {
      baseResult.todo =
        fixture.fixtureGroup === 'event_native'
          ? eventTodoProjection(fixture)
          : makeTodoProjection(fixture);
    } else if (request === 'sheet') {
      baseResult.sheet = makeSheetProjection(fixture);
    } else if (request === 'memo') {
      baseResult.memo = makeMemoProjection(fixture);
    }
  }
  return {
    dtoId: `dto-${fixtureId}`,
    canonicalContent: {
      fixtureId,
      title: fixture.title,
      sourceRowIds: fixture.sourceRows.map((entry) => entry.sourceRowId),
      stepIds: fixture.steps.map((entry) => entry.stepId),
      itemIds: fixture.items.map((entry) => entry.itemId),
      eventModel: fixture.eventModel,
    },
    userFlowCopy: {
      overlayId: `overlay-${fixtureId}`,
      scheduleOwner: 'user_overlay',
      ...overlay,
    },
    executionRun: {
      runId: `run-${fixtureId}`,
      itemStateOwner: 'FlowMe',
      state: 'not_started',
    },
    projectionRequest: {
      destinations: projectionRequests,
      groupingPolicy: 'destination_default',
    },
    projectionEligibility: projectionRequests.map((projection) => {
      const cell = projectionCells.find(
        (entry) =>
          entry.fixtureId === fixtureId && entry.projection === projection,
      );
      return {
        projection,
        recommendation: cell.recommendation,
        availability: cell.availability,
        fidelity: cell.fidelity,
      };
    }),
    generatedSchedule: overlay.pacingAssignments ?? [],
    output: baseResult,
    lossManifest: projectionRequests.map((projection) => ({
      projection,
      losses:
        projectionCells.find(
          (entry) =>
            entry.fixtureId === fixtureId && entry.projection === projection,
        )?.lossManifest ?? [],
    })),
    iCalendarExportPlan: {
      container: 'VCALENDAR',
      siblingComponents: {
        vevent: baseResult.calendar?.events ?? [],
        vtodo: makeVtodoComponents(baseResult.todo),
      },
      componentCount:
        (baseResult.calendar?.events.length ?? 0) +
        makeVtodoComponents(baseResult.todo).length,
      nestedVeventVtodo: false,
      valarmDefault: 'omit_until_user_requests_reminder',
    },
    fallbackPlan: {
      vtodoUnsupported: 'native Todo; otherwise Checklist/Sheet/Memo',
      calendarUnavailable: 'Todo/Checklist/Sheet/Memo without invented date',
    },
  };
}

const web1Pacing = pacingExperiments.find(
  (entry) => entry.fixtureId === 'base-opentutorials-web1-progress',
);
const representativeDtos = {
  schemaVersion: 'flowme-representative-projection-backend-dto-v1',
  generatedAt,
  dtos: [
    representativeDto(
      'base-opentutorials-web1-progress',
      projectionNames,
      {
        pacingPolicyId: web1Pacing.policy.policyId,
        pacingAssignments: web1Pacing.assignments,
      },
    ),
    representativeDto('base-moving-d30', projectionNames, {
      anchorValues: { moveDate: '2026-09-01' },
    }),
    representativeDto('oq-oq-c02-kmooc-full', projectionNames, {
      pacingPolicyId: pacingExperiments.find(
        (entry) => entry.fixtureId === 'oq-oq-c02-kmooc-full',
      ).policy.policyId,
      pacingAssignments: pacingExperiments.find(
        (entry) => entry.fixtureId === 'oq-oq-c02-kmooc-full',
      ).assignments,
    }),
    representativeDto(
      'event-kr-ballet-ticket-show',
      projectionNames,
      {
        bookingIntent: true,
        selectedOccurrenceIds: ['ballet-2026-show-1'],
      },
    ),
    representativeDto(
      'event-kr-qnet-exam-lifecycle',
      projectionNames,
      {
        applicationIntent: true,
        examDateTime: null,
        examVenue: null,
      },
    ),
  ],
};

const calendarGroupingResults = {
  schemaVersion: 'flowme-calendar-grouping-results-v1',
  generatedAt,
  policyDefinitions: {
    none: 'Calendar projection을 생성하지 않는다.',
    per_item: '각 scheduled Item occurrence를 독립 VEVENT로 만든다.',
    session_or_step_bundle:
      '같은 date/time, place/context, Step session인 Item만 하나의 VEVENT로 묶고 child Item ID를 보존한다.',
  },
  experiments: [
    {
      experimentId: 'moving-anchor-grouping',
      fixtureId: 'base-moving-d30',
      anchorValues: { moveDate: '2026-09-01' },
      none: makeCalendarProjection(
        fixtureById.get('base-moving-d30'),
        {
          anchorValues: { moveDate: '2026-09-01' },
          calendarGroupingPolicy: 'none',
        },
      ),
      perItem: makeCalendarProjection(
        fixtureById.get('base-moving-d30'),
        {
          anchorValues: { moveDate: '2026-09-01' },
          calendarGroupingPolicy: 'per_item',
        },
      ),
      sessionBundle: makeCalendarProjection(
        fixtureById.get('base-moving-d30'),
        {
          anchorValues: { moveDate: '2026-09-01' },
          calendarGroupingPolicy: 'session_or_step_bundle',
        },
      ),
    },
    {
      experimentId: 'web1-pacing-grouping',
      fixtureId: 'base-opentutorials-web1-progress',
      none: makeCalendarProjection(
        fixtureById.get('base-opentutorials-web1-progress'),
        {
          pacingAssignments: web1Pacing.assignments,
          calendarGroupingPolicy: 'none',
        },
      ),
      perItem: makeCalendarProjection(
        fixtureById.get('base-opentutorials-web1-progress'),
        {
          pacingAssignments: web1Pacing.assignments,
          calendarGroupingPolicy: 'per_item',
        },
      ),
      sessionBundle: makeCalendarProjection(
        fixtureById.get('base-opentutorials-web1-progress'),
        {
          pacingAssignments: web1Pacing.assignments,
          calendarGroupingPolicy: 'session_or_step_bundle',
        },
      ),
    },
  ],
};

const lossManifest = {
  schemaVersion: 'flowme-projection-loss-manifest-v2',
  generatedAt,
  counts: {
    cellsWithLoss: projectionCells.filter(
      (entry) => entry.lossManifest.length,
    ).length,
    prohibitedCells: projectionCells.filter(
      (entry) => entry.fidelity === 'misleading_or_prohibited',
    ).length,
  },
  entries: projectionCells.map((entry) => ({
    cellId: entry.cellId,
    fixtureId: entry.fixtureId,
    projection: entry.projection,
    fidelity: entry.fidelity,
    losses: entry.lossManifest,
    prohibitionReason: entry.prohibitionReason,
    fallback: entry.fallback,
  })),
};

const eventCorpus = {
  schemaVersion: 'flowme-event-schedule-corpus-v1',
  generatedAt,
  claimBoundary: {
    sourceInspection: 'direct_public_page',
    observedAt: '2026-07-29',
    structureValidationFixture: true,
    observedUserValidation: false,
    externalCalendarRoundTrip: 'NOT_RUN',
  },
  counts: {
    totalNewFixtures: newFixtures.length,
    checklistTodoBoundary: checklistTodoFixtures.length,
    eventNative: eventFixtures.length,
    uniqueUrls: new Set(newFixtures.map((entry) => entry.canonicalUrl)).size,
  },
  fixtures: newFixtures,
};

const terminologyLayers = `# 용어 층 정리

## 한 장 요약

\`\`\`text
원문 사실              FlowMe 원본                  목적지 표현
SourceRow / Occurrence → Item → Step → Flow → Map → Projection → Export
                                                    ├ Calendar → ICS / VEVENT
                                                    ├ Todo     → VTODO / native task
                                                    ├ Checklist→ Markdown / native list
                                                    ├ Sheet    → CSV / TSV / XLSX
                                                    └ Memo     → TXT / Markdown
\`\`\`

## 1. Canonical entity

FlowMe가 상태와 provenance를 잃지 않기 위해 저장하는 원본 엔티티다.
SourceRow, Item, Step, Flow, Bundle/Map, UserFlowCopy, ExecutionRun,
SourceOccurrence가 여기에 속한다.

## 2. Artifact

사용자가 실제로 받거나 저장하는 결과물의 제품 단위다. 같은 canonical
내용에서 Calendar artifact와 Sheet artifact를 각각 만들 수 있다.

## 3. Projection

canonical 데이터를 목적에 맞게 선택·묶기·평탄화한 표현이다. Projection은
원본이 아니며, 손실과 필요한 사용자 입력을 함께 기록한다.

## 4. Export format

projection을 외부로 전달하는 파일·텍스트 형식이다.

- Calendar: ICS
- Checklist: Markdown / plain text / native checklist payload
- Todo: native task payload 또는 지원 시 ICS의 VTODO
- Sheet: CSV / TSV / XLSX
- Memo: TXT / Markdown
- canonical raw: JSON/DTO

## 5. Destination capability

외부 서비스가 실제로 지원하는 기능이다. parent task/subtask, VTODO,
알림, 위치, recurrence, custom columns 지원 여부가 서로 다르다. 지원을
추정하지 않고 adapter가 capability를 선언해야 한다.

## 6. iCalendar component

- \`.ics\`: 교환 파일
- \`VCALENDAR\`: 여러 component를 담는 컨테이너
- \`VEVENT\`: 일정·참석·시간 블록
- \`VTODO\`: 독립 할 일과 선택적 DUE
- \`VALARM\`: 사용자가 요청한 알림

VEVENT와 VTODO는 VCALENDAR 안의 형제다. 서로를 중첩하지 않는다.
Flow·Step·Map을 iCalendar component로 만들지 않는다.

## 7. 세 가지 schedule

- source schedule: 원문에 실제로 적힌 날짜·시각·반복
- user schedule overlay: 사용자가 고른 시작일·방문 회차·하루 N개
- system-derived schedule: anchor 또는 확인된 pacing으로 계산한 결과

각 record에는 owner, derivation, suggestionStatus가 함께 있어야 한다.
`;

const decisionSummary = `# Flow Projection Lab v1 — 5분 결정 요약

## 결론

현재 \`SourceRow → Item → Step → Flow → Map\` 구조는 유지한다. 다만
Checklist·Todo·Calendar를 고정 상하관계로 만들지 않고, 같은 Item을
목적지 능력에 맞게 다르게 묶는 adapter 계약을 추가하는 것이 최선이다.

## Todo와 Checklist 차이

- **Checklist**: 한 상황에서 빠뜨리지 않고 끝내는 유한 묶음. Step과
  원문 순서를 보존한다. 예: 이사 당일, 여권 서류, 설치 절차.
- **Todo**: 각각 독립적으로 꺼내고 미루고 재정렬하는 행동·자료 queue.
  예: 볼 영상, 읽을 자료, 서로 독립적인 심부름.

Checklist는 \`groups[].orderedEntries[]\`, Todo는
\`tasks[] + parentTaskId/queuePosition/canDefer/due\`로 실제 출력 schema가
다르다.

## 다섯 projection 한 줄 정의

- **Calendar**: 실제 실행·참석 시점을 시간축에 둔다.
- **Checklist**: 한 상황의 누락 없는 완료를 돕는다.
- **Todo**: 독립 작업을 다음 행동 queue로 관리한다.
- **Sheet**: 항목·회차·상태를 행과 열로 비교·추적한다.
- **Memo**: 사람이 읽고 복사하기 쉬운 문서다. canonical raw JSON이 아니다.

## 모든 포맷으로 변환할 수 있나?

canonical JSON에는 모두 보존할 수 있다. Sheet와 Memo도 대부분 만들 수
있다. 그러나 Calendar·Checklist·Todo는 의미가 맞아야 한다.

- 일정 없는 Item → source 기반 Calendar 금지
- 행사 정보뿐이고 행동 의사가 없음 → Todo 금지
- 독립 queue를 Checklist로 만들 수는 있지만 재정렬·연기 의미가 약해짐
- 유한 점검을 Todo로 만들 수는 있지만 “빠뜨리면 안 됨”이 약해짐

따라서 추천도, 생성 가능 상태, 손실 등급을 따로 보여준다.

## 날짜 없는 콘텐츠 일정화

\`시작일 + 하루 N개\`, \`시작일 + 주 N개\`, \`목표 종료일\`,
\`허용 요일\`, \`쉬는 날\`, \`선호 시간\`을 사용자가 확인하면
UserFlowCopy에 pacing policy를 저장한다. 시스템은 원문 순서·dependency를
지키며 각 Item을 정확히 한 번 배치한다. 정책 변경 시 미래 미완료만 다시
계산한다.

이 일정은 source fact가 아니라
\`scheduleOwner=user_overlay / derivation=pacing_policy\`다.

## Due date와 Calendar 일정

- Due: 그때까지 끝내야 한다 → Todo 또는 VTODO DUE
- Event/time block: 그때 실제 참석·방문·실행한다 → VEVENT

마감만 있는 Todo를 임의 시간 블록 VEVENT로 만들지 않는다.

VEVENT의 기본 단위는 **scheduled Item occurrence**, VTODO의 기본 단위는
**독립 실행 가능한 Item**이다. 둘은 VCALENDAR 안의 형제이며 서로
중첩하지 않는다. 같은 시각·장소·Step session인 Item만 Calendar에서
묶을 수 있고, 이때도 모든 child Item ID와 “외부 Calendar는 개별 완료를
잃는다”는 손실을 보존한다.

## 축제·공연·시험

\`Series → Edition → SourceOccurrence/Window/Milestone\`을 먼저 저장한다.
사용자가 회차 저장·예매·참석을 선택하면 Item을 만든다.

- 여러 회차 공연: 회차별 Occurrence
- 전시 기간: availability window, 방문 시각 선택 후 VEVENT
- 티켓 오픈: 예매 Todo/VTODO, 선택적 알림
- 시험 시행 기간: 개인 시험 VEVENT가 아님; 배정 시각·장소가 필요
- 매년 날짜가 바뀌는 축제: 연도별 Edition, 거짓 yearly RRULE 금지
- 취소·변경: 기존 Occurrence를 지우지 않고 status와 관계를 보존

## 기획 승인 기본값

1. Item canonical + destination-specific grouping
2. Checklist와 Todo는 sibling projection
3. pacing preview는 draft, 사용자 확인 후에만 실제 일정 생성
4. due-only Item은 자동 VEVENT 금지
5. event source fact와 user attendance Item 분리
6. VTODO portability는 실제 client 왕복 검증 전까지 보장하지 않음

## 검증 경계

이 결과는 corpus·schema·자동 QA와 독립 agent 판정이다. 실제 사용자
검증과 Google/Outlook/Apple Calendar·VTODO 왕복은 모두 \`NOT_RUN\`이다.
`;

const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://flowme.local/schema/projection-lab-artifacts-v1.schema.json',
  title: 'FlowMe Projection Lab Artifacts v1',
  type: 'object',
  $defs: {
    recommendation: {
      enum: ['primary', 'secondary', 'optional', 'not_recommended'],
    },
    availability: {
      enum: [
        'available_now',
        'available_after_user_overlay',
        'unavailable',
      ],
    },
    fidelity: {
      enum: [
        'lossless_or_low_loss',
        'bounded_loss',
        'misleading_or_prohibited',
      ],
    },
    projectionCell: {
      type: 'object',
      required: [
        'cellId',
        'fixtureId',
        'projection',
        'recommendation',
        'availability',
        'fidelity',
        'generated',
        'recordCount',
        'minimumUserInputs',
        'destinationCapabilityNeeded',
        'lossManifest',
        'prohibitionReason',
        'fallback',
      ],
      properties: {
        cellId: { type: 'string' },
        fixtureId: { type: 'string' },
        projection: { enum: projectionNames },
        recommendation: { $ref: '#/$defs/recommendation' },
        availability: { $ref: '#/$defs/availability' },
        fidelity: { $ref: '#/$defs/fidelity' },
        generated: { type: 'boolean' },
        recordCount: { type: 'integer', minimum: 0 },
        minimumUserInputs: { type: 'array', items: { type: 'string' } },
        destinationCapabilityNeeded: {
          type: 'array',
          items: { type: 'string' },
        },
        lossManifest: { type: 'array', items: { type: 'string' } },
        prohibitionReason: { type: ['string', 'null'] },
        fallback: { type: ['string', 'null'] },
      },
      additionalProperties: true,
    },
    checklistProjection: {
      type: 'object',
      required: ['projectionType', 'schemaVersion', 'groups'],
      properties: {
        projectionType: { const: 'checklist' },
        schemaVersion: { const: 'flowme-checklist-projection-v1' },
        groups: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'groupId',
              'canonicalStepId',
              'bounded',
              'orderLocked',
              'orderedEntries',
            ],
            properties: {
              groupId: { type: 'string' },
              canonicalStepId: { type: 'string' },
              bounded: { const: true },
              orderLocked: { type: 'boolean' },
              orderedEntries: {
                type: 'array',
                items: {
                  type: 'object',
                  required: [
                    'entryId',
                    'canonicalItemId',
                    'title',
                    'sourceOrder',
                    'sourceRowIds',
                  ],
                },
              },
            },
          },
        },
      },
    },
    todoProjection: {
      type: 'object',
      required: [
        'projectionType',
        'schemaVersion',
        'groupingStrategy',
        'tasks',
      ],
      properties: {
        projectionType: { const: 'todo' },
        schemaVersion: { const: 'flowme-todo-projection-v1' },
        groupingStrategy: { type: 'string' },
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'taskId',
              'recordKind',
              'title',
              'queuePosition',
              'canReorder',
              'canDefer',
            ],
          },
        },
      },
    },
    calendarProjection: {
      type: 'object',
      required: [
        'projectionType',
        'schemaVersion',
        'container',
        'groupingPolicy',
        'events',
      ],
      properties: {
        projectionType: { const: 'calendar' },
        schemaVersion: { const: 'flowme-calendar-projection-v2' },
        container: { const: 'VCALENDAR' },
        groupingPolicy: {
          enum: ['none', 'per_item', 'session_or_step_bundle'],
        },
        events: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'component',
              'uid',
              'temporalIntent',
              'start',
              'scheduleOwner',
              'derivation',
              'suggestionStatus',
              'childItemIds',
              'sourceRowIds',
            ],
            properties: {
              component: { const: 'VEVENT' },
              scheduleOwner: { enum: ['source', 'user_overlay'] },
              derivation: {
                enum: [
                  'direct',
                  'anchor_resolution',
                  'pacing_policy',
                  'manual',
                  'expand_daily_hours_within_source_date_range',
                ],
              },
            },
          },
        },
      },
    },
    sourceOccurrence: {
      type: 'object',
      required: [
        'occurrenceId',
        'temporalIntent',
        'timezoneEvidence',
        'status',
      ],
      properties: {
        occurrenceId: { type: 'string' },
        seriesId: { type: ['string', 'null'] },
        editionId: { type: ['string', 'null'] },
        temporalIntent: {
          enum: [
            'fixed_occurrence',
            'all_day_occurrence',
            'availability_window',
          ],
        },
        timezoneEvidence: {
          enum: [
            'explicit',
            'explicit_context',
            'source_label_EDT',
            'inferred_from_venue',
            'inferred_from_venue_context',
            'unknown',
          ],
        },
        status: {
          enum: [
            'scheduled',
            'tentative',
            'cancelled',
            'postponed',
            'rescheduled',
            'ended',
          ],
        },
      },
    },
    pacingAssignment: {
      type: 'object',
      required: [
        'assignmentId',
        'itemId',
        'start',
        'allDay',
        'timezone',
        'scheduleOwner',
        'derivation',
        'suggestionStatus',
      ],
      properties: {
        scheduleOwner: { const: 'user_overlay' },
        derivation: { const: 'pacing_policy' },
        suggestionStatus: { const: 'confirmed' },
      },
    },
  },
};

function formatOutputPreview(dto, projection) {
  const output = dto.output[projection];
  if (!output) return '생성 결과 없음';
  const records =
    output.events ??
    output.groups ??
    output.tasks ??
    output.rows ??
    output.sections ??
    [];
  if (!records.length) return '사용자 입력 후 생성';
  const preview = records.slice(0, 3).map((record) => {
    if (record.summary) return record.summary;
    if (record.title) return record.title;
    if (record.heading) return record.heading;
    if (record.orderedEntries) {
      return `${record.title}: ${record.orderedEntries
        .slice(0, 2)
        .map((entry) => entry.title)
        .join(', ')}`;
    }
    return record.taskId ?? record.occurrenceId ?? record.rowKind;
  });
  return `${records.length}개 record · ${preview.join(' / ')}`;
}

function renderFiveFormatCase(dto, eyebrow, question, explanation) {
  const semantics = artifactSemantics.projections;
  return `
    <section class="slide case-slide" id="${dto.dtoId}">
      <div class="eyebrow">${eyebrow}</div>
      <h2>${question}</h2>
      <p class="lead">${explanation}</p>
      <div class="source-chain">
        <span>SourceRow ${dto.canonicalContent.sourceRowIds.length}</span>
        <b>→</b><span>Item ${dto.canonicalContent.itemIds.length}</span>
        <b>→</b><span>같은 canonical</span>
        <b>→</b><span>5개 projection</span>
      </div>
      <div class="format-grid">
        ${projectionNames
          .map((projection) => {
            const eligibility = dto.projectionEligibility.find(
              (entry) => entry.projection === projection,
            );
            const loss = dto.lossManifest.find(
              (entry) => entry.projection === projection,
            );
            return `<article class="format-card format-${projection}">
              <div class="format-head"><span>${projection.toUpperCase()}</span><em>${eligibility.recommendation}</em></div>
              <p class="one-line">${semantics[projection].oneLine}</p>
              <div class="record-preview">${formatOutputPreview(dto, projection)}</div>
              <dl>
                <div><dt>현재 가능</dt><dd>${eligibility.availability}</dd></div>
                <div><dt>손실</dt><dd>${eligibility.fidelity}</dd></div>
              </dl>
              <p class="loss">${loss.losses[0] ?? '명시 손실 없음'}</p>
            </article>`;
          })
          .join('')}
      </div>
    </section>`;
}

function buildReport() {
  const [web1, moving, kmooc, ballet, exam] = representativeDtos.dtos;
  const architectureRows = architectureComparison.alternatives
    .map(
      (entry) => `<tr>
        <td><strong>${entry.label}</strong><small>${entry.structure}</small></td>
        <td class="score">${entry.total}/${entry.max}</td>
        <td><span class="badge ${entry.verdict.includes('adopt') ? 'go' : entry.verdict.includes('reject') ? 'stop' : 'modify'}">${entry.verdict}</span></td>
        <td>${entry.reason}</td>
      </tr>`,
    )
    .join('');
  const eventCards = eventFixtures
    .map(
      (fixture) => `<article class="source-card" data-kind="${fixture.fixtureKind}" data-projection="${fixture.primaryProjection}">
        <span>${fixture.fixtureKind.replaceAll('_', ' ')}</span>
        <h4>${fixture.title}</h4>
        <p>${fixture.userJob}</p>
        <small>${fixture.provider} · ${fixture.sourceRows.length} SourceRow · ${fixture.eventModel?.occurrences?.length ?? 0} Occurrence</small>
      </article>`,
    )
    .join('');
  const matrixRows = projectionCells
    .map(
      (cell) => `<tr data-fixture-group="${cell.fixtureGroup}" data-projection="${cell.projection}" data-availability="${cell.availability}" data-recommendation="${cell.recommendation}">
        <td>${cell.title}<small>${cell.fixtureId}</small></td>
        <td>${cell.projection}</td>
        <td>${cell.recommendation}</td>
        <td>${cell.availability}</td>
        <td>${cell.fidelity}</td>
        <td>${cell.generated ? cell.recordCount : '—'}</td>
        <td>${cell.minimumUserInputs.join(', ') || '0'}</td>
      </tr>`,
    )
    .join('');
  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <title>Flow Projection Semantics·Scheduling·Event Corpus Lab v1</title>
  <style>
    :root{--ink:#15211b;--muted:#607068;--paper:#f4f6ef;--card:#fffdf7;--line:#dce3d8;--green:#1b6b4b;--mint:#daf4e6;--blue:#245da8;--blue-soft:#e8f0ff;--amber:#a56800;--amber-soft:#fff0c8;--red:#9b3d34;--red-soft:#ffe8e4;--shadow:0 18px 48px rgba(25,54,39,.09)}
    *{box-sizing:border-box} html{scroll-behavior:smooth} body{margin:0;background:linear-gradient(180deg,#eef3e8 0,#f8f4ec 100%);color:var(--ink);font-family:Pretendard,"Noto Sans KR",system-ui,sans-serif;line-height:1.55}
    a{color:inherit}.deck{max-width:1440px;margin:0 auto;padding:24px}.slide{min-height:calc(100vh - 48px);margin:0 0 24px;padding:clamp(34px,5vw,76px);border:1px solid rgba(27,107,75,.12);border-radius:32px;background:rgba(255,253,247,.94);box-shadow:var(--shadow);display:flex;flex-direction:column;justify-content:center;overflow:hidden}
    .cover{background:radial-gradient(circle at 86% 12%,#c8f1db 0,transparent 34%),linear-gradient(135deg,#fffdf7,#edf6ee)}.eyebrow{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--green);font-weight:800;margin-bottom:12px}.kicker{display:inline-flex;gap:8px;flex-wrap:wrap;margin:16px 0 28px}.kicker span,.pill{padding:8px 12px;border-radius:999px;background:var(--mint);color:var(--green);font-size:13px;font-weight:700}
    h1{font-size:clamp(42px,6vw,78px);line-height:1.02;letter-spacing:-.055em;margin:0;max-width:1240px}h2{font-size:clamp(32px,4.2vw,62px);line-height:1.08;letter-spacing:-.045em;margin:0 0 18px;max-width:1100px}h3{font-size:clamp(22px,2.3vw,34px);margin:0 0 12px;letter-spacing:-.025em}h4{font-size:18px;margin:8px 0}p{margin:0}.lead{max-width:950px;font-size:clamp(17px,1.7vw,25px);color:var(--muted);margin-bottom:32px}.hero-example{margin-top:42px;display:grid;grid-template-columns:1.1fr .9fr;gap:24px}.hero-flow,.hero-answer{border-radius:24px;padding:28px;background:#fff;border:1px solid var(--line)}.hero-flow ol{margin:18px 0 0;padding-left:24px}.hero-answer strong{display:block;font-size:32px;color:var(--green);margin-bottom:12px}.source-chain{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:4px 0 30px}.source-chain span{padding:13px 16px;border:1px solid var(--line);background:#fff;border-radius:14px;font-weight:700}.source-chain b{color:var(--green)}
    .format-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}.format-card{min-height:270px;border:1px solid var(--line);border-radius:20px;padding:18px;background:#fff;display:flex;flex-direction:column}.format-head{display:flex;justify-content:space-between;align-items:center;gap:8px}.format-head span{font-weight:900;letter-spacing:.04em}.format-head em{font-style:normal;font-size:11px;border-radius:999px;padding:4px 7px;background:#f0f3ef}.one-line{font-size:14px;color:var(--muted);min-height:44px;margin:12px 0}.record-preview{font-size:13px;background:#f7f8f5;border-radius:12px;padding:12px;min-height:70px}.format-card dl{margin:14px 0 8px;font-size:12px}.format-card dl div{display:flex;justify-content:space-between;gap:8px;padding:3px 0}.format-card dt{color:var(--muted)}.format-card dd{margin:0;text-align:right;font-weight:700}.loss{font-size:11px;color:var(--red);margin-top:auto}.format-calendar{border-top:5px solid #d55448}.format-checklist{border-top:5px solid #d89a18}.format-todo{border-top:5px solid #3a78c2}.format-sheet{border-top:5px solid #2d8d5a}.format-memo{border-top:5px solid #7d6fa8}
    .definition-grid,.event-grid,.two-col,.metric-grid{display:grid;gap:18px}.definition-grid{grid-template-columns:repeat(5,minmax(0,1fr))}.definition-card,.source-card,.panel{border:1px solid var(--line);border-radius:22px;background:#fff;padding:24px}.definition-card strong{font-size:22px;display:block;margin-bottom:8px}.definition-card p{color:var(--muted)}.definition-card ul{padding-left:18px;font-size:13px}.two-col{grid-template-columns:1fr 1fr}.panel h3{color:var(--green)}.compare-stack{display:grid;gap:14px}.compare-row{display:grid;grid-template-columns:180px 1fr 1fr;gap:12px;align-items:stretch}.compare-row>*{padding:16px;border-radius:16px;border:1px solid var(--line);background:#fff}.compare-row strong{background:#f0f5ef}.yes{background:var(--mint)!important}.no{background:var(--red-soft)!important}.warn{background:var(--amber-soft)!important}
    .timeline{display:flex;align-items:stretch;gap:10px;flex-wrap:wrap}.timeline article{flex:1;min-width:150px;border-radius:18px;background:#fff;border:1px solid var(--line);padding:18px}.timeline b{display:block;color:var(--green);font-size:13px;margin-bottom:8px}.timeline i{font-style:normal;color:var(--muted);font-size:13px}.event-grid{grid-template-columns:repeat(3,minmax(0,1fr));max-height:62vh;overflow:auto;padding-right:8px}.source-card span{font-size:11px;color:var(--green);font-weight:800;text-transform:uppercase}.source-card p{color:var(--muted);font-size:14px}.source-card small{display:block;margin-top:14px;color:#7a887f}.architecture-table,.matrix-table{width:100%;border-collapse:collapse;background:#fff;border-radius:18px;overflow:hidden}.architecture-table th,.architecture-table td,.matrix-table th,.matrix-table td{border-bottom:1px solid var(--line);padding:14px;text-align:left;vertical-align:top}.architecture-table th,.matrix-table th{background:#f1f5ef;color:var(--muted);font-size:12px;position:sticky;top:0}.architecture-table small,.matrix-table small{display:block;color:var(--muted);margin-top:5px}.score{font-size:22px;font-weight:900}.badge{display:inline-block;padding:5px 9px;border-radius:999px;font-size:11px;font-weight:900}.badge.go{background:var(--mint);color:var(--green)}.badge.modify{background:var(--amber-soft);color:var(--amber)}.badge.stop{background:var(--red-soft);color:var(--red)}
    .filterbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}.filterbar select,.filterbar input{border:1px solid var(--line);background:#fff;padding:11px 13px;border-radius:12px;font:inherit;min-width:150px}.table-wrap{max-height:58vh;overflow:auto;border:1px solid var(--line);border-radius:18px}.matrix-table{font-size:13px}.metric-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.metric{padding:24px;border-radius:20px;background:#fff;border:1px solid var(--line)}.metric strong{display:block;font-size:38px;color:var(--green)}.metric span{color:var(--muted)}.footnote{font-size:12px;color:var(--muted);margin-top:18px}.callout{padding:22px;border-radius:20px;background:var(--blue-soft);color:#173f73;margin-top:20px}.mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
    @media(max-width:1050px){.format-grid,.definition-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.event-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero-example,.two-col{grid-template-columns:1fr}.compare-row{grid-template-columns:1fr}.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:600px){.deck{padding:8px}.slide{min-height:auto;margin-bottom:10px;padding:28px 18px;border-radius:22px}.format-grid,.definition-grid,.event-grid,.metric-grid{grid-template-columns:1fr}.event-grid{max-height:none}.format-card{min-height:auto}.hero-example{margin-top:24px}.source-chain{gap:7px}.source-chain span{padding:9px 10px;font-size:12px}.architecture-table{min-width:850px}.matrix-table{min-width:900px}.table-wrap{max-height:65vh}.slide:has(.architecture-table){overflow-x:auto}h1{font-size:44px}.cover .lead{font-size:17px}.timeline article{min-width:100%}}
  </style>
</head>
<body>
<main class="deck">
  <section class="slide cover">
    <div class="eyebrow">Flow Projection Lab v1 · 2026-07-29</div>
    <h1>같은 Flow를 다섯 방식으로 쓰되,<br>같은 뜻이라고 속이지 않는다.</h1>
    <p class="lead">42개 기존 콘텐츠와 21개 신규 원문을 이용해 Calendar·Checklist·Todo·Sheet·Memo의 생성 조건, 손실, 개인 일정화, 행사 회차 구조를 다시 검증했습니다.</p>
    <div class="kicker"><span>42 × 5 baseline</span><span>21 new fixtures</span><span>15 event-native</span><span>외부 왕복 NOT_RUN</span></div>
    <div class="hero-example">
      <article class="hero-flow">
        <div class="eyebrow">첫 실제 사례 · WEB1 26강</div>
        <h3>원문에는 날짜가 없다</h3>
        <ol><li>26개 강의 Item은 그대로 보존</li><li>기본은 Sheet 진도 + Todo queue</li><li>“8월 3일부터 평일 하루 2개” 확인</li><li>user overlay에서 13일 일정 생성</li></ol>
      </article>
      <article class="hero-answer">
        <strong>0 → 26 VEVENT</strong>
        <p>source 기반 VEVENT는 0개. 사용자가 pacing을 확인한 뒤에만 26개 개인 일정이 생깁니다. 그 날짜는 원문 사실이 아닙니다.</p>
      </article>
    </div>
  </section>
  ${renderFiveFormatCase(web1, '사례 1 · 날짜 없는 학습', 'WEB1 26강은 왜 Sheet·Todo이고, 언제 Calendar가 되나?', 'Item은 바뀌지 않습니다. 기본 실행 queue와 진도표를 먼저 만들고, 확인된 하루 2개 정책만 개인 Calendar로 투영합니다.')}
  ${renderFiveFormatCase(moving, '사례 2 · 한 세션과 날짜 묶음', '이사 당일 Item을 Checklist·Todo·Calendar로 내보내면 무엇이 달라지나?', 'Checklist는 “빠뜨리지 않기”, Todo는 parent/subtask 실행, Calendar bundle은 같은 세션의 시간축 표현입니다. Calendar가 개별 완료를 소유하지 않는다는 손실을 표시합니다.')}
  ${renderFiveFormatCase(ballet, '사례 3 · 티켓 오픈 + 다회차 공연', '예매 행동과 공연 참석은 같은 날짜 데이터가 아니다', '티켓 오픈은 due 중심 Todo/VTODO, 선택한 공연 회차는 VEVENT입니다. Series·Edition·Occurrence를 먼저 보존한 뒤 사용자의 선택이 Item을 만듭니다.')}
  <section class="slide">
    <div class="eyebrow">질문 1</div>
    <h2>Todo와 Checklist는 무엇이 다른가?</h2>
    <div class="two-col">
      <article class="panel"><h3>Checklist</h3><p>한 상황에서 빠뜨리면 안 되는 유한 묶음</p><div class="callout mono">groups[] → orderedEntries[]<br>bounded=true · orderLocked=true</div><p class="footnote">이사 당일 · 여권 서류 · 설치 절차 · 여행 짐</p></article>
      <article class="panel"><h3>Todo</h3><p>독립적으로 꺼내고 미루고 재정렬하는 다음 행동·자료 queue</p><div class="callout mono">tasks[]<br>parentTaskId · queuePosition · canDefer · due</div><p class="footnote">볼 영상 · 읽을 자료 · 독립 심부름 · 결과 확인</p></article>
    </div>
    <div class="callout"><strong>상하관계가 아닙니다.</strong> 같은 Item을 서로 다른 실행 문법으로 보여주는 sibling projection이며, 목적지의 parent/subtask 지원은 adapter 문제입니다.</div>
  </section>
  <section class="slide">
    <div class="eyebrow">질문 2</div>
    <h2>다섯 포맷은 무엇을 보존하고 잃는가?</h2>
    <div class="definition-grid">
      ${projectionNames.map((name) => `<article class="definition-card"><strong>${name}</strong><p>${artifactSemantics.projections[name].oneLine}</p><ul><li>단위: ${artifactSemantics.projections[name].recordUnit}</li><li>보존: ${artifactSemantics.projections[name].preserves[0]}</li><li>손실: ${artifactSemantics.projections[name].loses[0]}</li></ul></article>`).join('')}
    </div>
    <p class="footnote">JSON/DTO는 canonical raw다. Memo TXT/Markdown은 사람이 읽는 projection이며 같은 것이 아니다.</p>
  </section>
  <section class="slide">
    <div class="eyebrow">질문 3</div>
    <h2>“생성 가능”과 “자연스럽다”는 왜 다른가?</h2>
    <div class="compare-stack">
      <div class="compare-row"><strong>추천도</strong><div class="yes">primary / secondary / optional</div><div class="no">not_recommended</div></div>
      <div class="compare-row"><strong>현재 가능</strong><div class="yes">available_now</div><div class="warn">overlay 후 가능 / unavailable</div></div>
      <div class="compare-row"><strong>정보 보존</strong><div class="yes">lossless_or_low_loss</div><div class="warn">bounded_loss / prohibited</div></div>
    </div>
    <div class="callout">Sheet와 Memo는 거의 항상 만들 수 있습니다. 하지만 일정 없는 콘텐츠를 Calendar로, 수동 관심 목록을 Todo로 만들면 record는 생겨도 의미가 틀립니다.</div>
  </section>
  ${renderFiveFormatCase(kmooc, '사례 4 · 14주 진도', 'K-MOOC는 매주 한 번 체크가 아니라 “펼쳐진 진도”가 핵심이다', 'Sheet가 전체 진도 개요를 보존하고 Todo가 다음 강의를 꺼냅니다. Calendar는 사용자가 주 3개 pacing을 확인한 뒤에만 개인 일정으로 생성됩니다.')}
  ${renderFiveFormatCase(exam, '사례 5 · 시험 생애주기', '접수 기간·시험 기간·발표일을 전부 VEVENT로 만들면 왜 틀리나?', '접수는 기간 안에 완료할 Todo, 시험 기간은 배정 가능 window, 발표는 결과 확인 Todo입니다. 개인 시험 VEVENT는 수험표의 실제 일시·장소가 있어야 합니다.')}
  <section class="slide">
    <div class="eyebrow">질문 4</div>
    <h2>날짜 없는 Item은 어디서 하루 N개가 되나?</h2>
    <div class="timeline">
      <article><b>1 · canonical</b><strong>26 Item, 날짜 없음</strong><i>원문 순서와 provenance 유지</i></article>
      <article><b>2 · draft</b><strong>평일 하루 2개 제안</strong><i>아직 일정 record 아님</i></article>
      <article><b>3 · confirm</b><strong>UserFlowCopy policy</strong><i>시작일·요일·휴일·시간</i></article>
      <article><b>4 · derive</b><strong>26 assignment</strong><i>중복 0 · 누락 0 · deterministic</i></article>
      <article><b>5 · project</b><strong>dated Todo 또는 VEVENT</strong><i>scheduleOwner=user_overlay</i></article>
    </div>
    <div class="callout">정책 변경 시 완료된 과거 occurrence는 그대로 두고 미래 미완료만 재계산합니다. 원문에 duration이 없으면 작업량을 사실처럼 추정하지 않습니다.</div>
  </section>
  <section class="slide">
    <div class="eyebrow">질문 5</div>
    <h2>Due와 Calendar time은 같은 날짜가 아니다</h2>
    <div class="compare-stack">
      <div class="compare-row"><strong>9월 21일까지 접수</strong><div class="yes">Todo / VTODO DUE</div><div class="no">임의 10:00 VEVENT 금지</div></div>
      <div class="compare-row"><strong>9월 25일 14:00 시험</strong><div class="yes">VEVENT</div><div class="no">단순 due task만으로 축소 금지</div></div>
      <div class="compare-row"><strong>8월 1~2일 접수 가능</strong><div class="yes">application window + Todo</div><div class="warn">개인 실행시각은 사용자 선택</div></div>
      <div class="compare-row"><strong>6월 15일 14:00 티켓 오픈</strong><div class="yes">dated Todo / VTODO</div><div class="warn">사용자가 원하면 Calendar reminder</div></div>
    </div>
  </section>
  <section class="slide">
    <div class="eyebrow">행사 corpus</div>
    <h2>단일 일정이 아니라 15개의 시간 구조를 넣었다</h2>
    <p class="lead">단일 공연, 여러 회차, 여러 날 축제, 전시 운영창, 티켓 오픈, 시험 생애주기, 일정 변경, 온라인 URL, 실제 주간 반복, annual edition, 취소·재일정, 관심 목록, 예외 운영창, 프로그램 충돌을 직접 확인했습니다.</p>
    <div class="event-grid">${eventCards}</div>
  </section>
  <section class="slide">
    <div class="eyebrow">행사 모델</div>
    <h2>행사 정보 자체는 아직 “할 일”이 아닐 수 있다</h2>
    <div class="timeline">
      <article><b>Source</b><strong>EventSeries</strong><i>반복되는 정체성</i></article>
      <article><b>Edition</b><strong>2026 edition</strong><i>해마다 달라지는 공식 범위</i></article>
      <article><b>Fact</b><strong>Occurrence / Window</strong><i>회차·운영창·milestone</i></article>
      <article><b>User</b><strong>관심·예매·참석 선택</strong><i>개인 intent</i></article>
      <article><b>FlowMe</b><strong>Item → Projection</strong><i>VEVENT / VTODO / Sheet</i></article>
    </div>
    <div class="callout">매년 새 날짜가 발표되는 축제에는 YEARLY RRULE을 만들지 않습니다. Series 아래 2026 Edition을 저장하고 다음 해는 새 원문으로 갱신합니다.</div>
  </section>
  <section class="slide">
    <div class="eyebrow">아키텍처 판정</div>
    <h2>Action → Checklist → Todo → Calendar 제안은 “수정 채택”</h2>
    <p class="lead">가장 작은 독립 상태 단위를 Item으로 잡고 목적지에서 묶는 통찰은 맞습니다. 다만 Checklist·Todo·Calendar는 서로를 감싸는 보편 계층이 아닙니다.</p>
    <div class="table-wrap"><table class="architecture-table"><thead><tr><th>구조</th><th>재계산 점수</th><th>판정</th><th>이유</th></tr></thead><tbody>${architectureRows}</tbody></table></div>
  </section>
  <section class="slide">
    <div class="eyebrow">전체 315칸</div>
    <h2>어떤 원문이 어떤 포맷으로 실제 생성되는가?</h2>
    <div class="filterbar">
      <input id="matrix-search" placeholder="콘텐츠 검색">
      <select id="matrix-projection"><option value="">모든 projection</option>${projectionNames.map((name) => `<option>${name}</option>`).join('')}</select>
      <select id="matrix-availability"><option value="">모든 가능 상태</option><option>available_now</option><option>available_after_user_overlay</option><option>unavailable</option></select>
      <select id="matrix-group"><option value="">기존+신규</option><option value="frozen_baseline_42">기존 42</option><option value="checklist_todo_boundary">Checklist/Todo 신규</option><option value="event_native">행사 신규</option></select>
    </div>
    <div class="table-wrap"><table class="matrix-table"><thead><tr><th>콘텐츠</th><th>포맷</th><th>추천</th><th>가능</th><th>손실</th><th>record</th><th>최소 입력</th></tr></thead><tbody id="matrix-body">${matrixRows}</tbody></table></div>
  </section>
  <section class="slide">
    <div class="eyebrow">결론과 검증 경계</div>
    <h2>기획으로 넘길 기본값은 여섯 가지다</h2>
    <div class="metric-grid">
      <article class="metric"><strong>${baselineFixtures.length}</strong><span>기존 canonical fixture</span></article>
      <article class="metric"><strong>${newFixtures.length}</strong><span>신규 실제 fixture</span></article>
      <article class="metric"><strong>${projectionCells.length}</strong><span>projection 비교 cell</span></article>
      <article class="metric"><strong>${pacingExperiments.length}</strong><span>pacing deterministic 실험</span></article>
    </div>
    <div class="two-col" style="margin-top:18px">
      <article class="panel"><h3>승인 권고</h3><ol><li>Item canonical 유지</li><li>Checklist/Todo sibling</li><li>목적지별 grouping adapter</li><li>pacing은 user overlay</li><li>due 자동 VEVENT 금지</li><li>Series/Edition/Occurrence 분리</li></ol></article>
      <article class="panel"><h3>아직 검증하지 않음</h3><ul><li>실제 사용자 이해·저장 의사</li><li>Google/Outlook/Apple 왕복</li><li>VTODO 지원·RELATED-TO 보존</li><li>운영 crawler의 freshness 처리</li></ul><div class="callout"><strong>모두 NOT_RUN</strong><br>자동 QA 통과를 사용자 검증으로 표현하지 않습니다.</div></article>
    </div>
  </section>
</main>
<script>
  const search = document.getElementById('matrix-search');
  const projection = document.getElementById('matrix-projection');
  const availability = document.getElementById('matrix-availability');
  const group = document.getElementById('matrix-group');
  const rows = [...document.querySelectorAll('#matrix-body tr')];
  function applyFilters(){
    const query = search.value.trim().toLowerCase();
    rows.forEach((row)=>{
      const show = (!query || row.textContent.toLowerCase().includes(query))
        && (!projection.value || row.dataset.projection === projection.value)
        && (!availability.value || row.dataset.availability === availability.value)
        && (!group.value || row.dataset.fixtureGroup === group.value);
      row.hidden = !show;
    });
  }
  [search,projection,availability,group].forEach((control)=>control.addEventListener('input',applyFilters));
</script>
</body>
</html>`;
  fs.writeFileSync(reportPath, html, 'utf8');
}

const lineage = {
  schemaVersion: 'flowme-projection-lab-input-lineage-v1',
  generatedAt,
  baseline: {
    path: path.relative(repoRoot, baselinePath).replaceAll('\\', '/'),
    hash: hashFile(baselinePath),
    counts: baseline.counts,
    frozen: true,
  },
  newSources: newFixtures.map((fixture) => ({
    fixtureId: fixture.fixtureId,
    canonicalUrl: fixture.canonicalUrl,
    observedAt: fixture.observedAt,
    evidenceMethod: fixture.evidenceMethod,
  })),
  runtimeFilesReadOnly: [
    'lib/flow/types.ts',
    'lib/flow/export.ts',
    'lib/flow/artifact-plan.ts',
    'lib/flow/export-scope.ts',
  ],
};

writeJson('input-lineage-v1.json', lineage);
writeJson('artifact-semantics-v2.json', artifactSemantics);
writeJson('checklist-todo-decision-contract-v1.json', checklistTodoContract);
writeJson('projection-eligibility-matrix-v1.json', projectionMatrix);
writeJson('architecture-comparison-v1.json', architectureComparison);
writeJson('user-pacing-schedule-contract-v1.json', pacingContract);
writeJson('temporal-intent-contract-v1.json', temporalIntentContract);
writeJson('event-occurrence-contract-v1.json', eventOccurrenceContract);
writeJson('event-schedule-corpus-v1.json', eventCorpus);
writeJson('all-format-projection-results-v1.json', allFormatResults);
writeJson('projection-loss-manifest-v2.json', lossManifest);
writeJson('icalendar-component-mapping-v2.json', iCalendarMapping);
writeJson('runtime-gap-crosswalk-v2.json', runtimeGapCrosswalk);
writeJson(
  'planning-decision-register-delta-v1.json',
  decisionRegisterDelta,
);
writeJson(
  'representative-projection-backend-dto-v1.json',
  representativeDtos,
);
writeJson('calendar-grouping-results-v1.json', calendarGroupingResults);
writeJson('projection-lab-artifacts-v1.schema.json', schema);
writeText('terminology-layers-v1.md', terminologyLayers);
writeText('decision-summary-ko.md', decisionSummary);
buildReport();

console.log(
  JSON.stringify(
    {
      baselineFixtures: baselineFixtures.length,
      newFixtures: newFixtures.length,
      eventNativeFixtures: eventFixtures.length,
      totalProjectionCells: projectionCells.length,
      baselineProjectionCells: baselineFixtures.length * projectionNames.length,
      pacingExperiments: pacingExperiments.length,
      reportPath: path.relative(repoRoot, reportPath).replaceAll('\\', '/'),
    },
    null,
    2,
  ),
);
