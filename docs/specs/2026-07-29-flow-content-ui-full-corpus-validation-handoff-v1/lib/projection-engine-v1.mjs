import { byOrder, sha256, unique } from "./utils-v1.mjs";

export const PROJECTIONS = ["calendar", "checklist", "todo", "sheet", "memo"];

const LABELS = {
  calendar: "Calendar",
  checklist: "Checklist",
  todo: "Todo",
  sheet: "Sheet",
  memo: "Memo",
};

function sourceRowIdsForItem(content, item) {
  if (Array.isArray(item.sourceRowIds)) return item.sourceRowIds;
  const refs = new Map(
    (content.canonical?.sourceRefs ?? []).map((ref) => [ref.sourceRefId, ref]),
  );
  return unique(
    (item.sourceRefIds ?? []).flatMap(
      (sourceRefId) => refs.get(sourceRefId)?.sourceRowIds ?? [],
    ),
  );
}

function itemRecord(content, item) {
  return {
    itemId: item.itemId,
    stepId: item.stepId,
    title: item.title,
    detail: item.description ?? item.detail ?? "",
    completion: item.completion ?? { mode: "check", doneWhen: item.title },
    schedule: item.schedule ?? null,
    temporalIntent:
      item.temporalIntent ??
      (item.schedule
        ? item.schedule.mode === "absolute"
          ? "fixed_occurrence"
          : "anchor_offset"
        : "no_schedule"),
    location: item.location ?? null,
    fields: item.fields ?? [],
    sourceRowIds: sourceRowIdsForItem(content, item),
  };
}

function recommendationFor(content, projection) {
  if (content.primaryProjection === projection) return "primary";
  if ((content.secondaryProjections ?? []).includes(projection)) return "secondary";
  if (projection === "sheet" || projection === "memo") return "optional";
  return "not_recommended";
}

function makeCounts({
  itemCount = 0,
  destinationRecordCount = 0,
  groupCount = 0,
  childEntryCount = 0,
  componentCount = 0,
} = {}) {
  return {
    canonicalItemCount: itemCount,
    destinationRecordCount,
    groupCount,
    childEntryCount,
    componentCount,
  };
}

function calendarResolution(item) {
  if (!item.schedule) return "none";
  const mode = item.schedule.mode ?? item.schedule.type;
  if (["absolute", "fixed", "fixed_occurrence", "date_window"].includes(mode)) {
    return "source_resolved";
  }
  return "needs_overlay";
}

function makeCalendarRecords(content, items) {
  const steps = new Map(
    (content.canonical?.steps ?? []).map((step) => [step.stepId, step]),
  );
  const scheduled = items.filter((item) => item.schedule);
  const groupingPolicy = content.calendarGroupingPolicy ?? "per_item";

  if (groupingPolicy !== "step_bundle") {
    return scheduled.map((item, index) => ({
      recordId: `${content.contentId}-vevent-${index + 1}`,
      component: "VEVENT",
      title: item.title,
      detail: item.detail,
      schedule: item.schedule,
      childItemIds: [item.itemId],
      completionOwner: "canonical_item",
      sourceRowIds: item.sourceRowIds,
      sourceOwner: "source",
      derivation:
        calendarResolution(item) === "source_resolved"
          ? "direct"
          : "anchor_resolution",
    }));
  }

  const groups = new Map();
  for (const item of scheduled) {
    const key = item.stepId ?? item.itemId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  return [...groups.entries()].map(([stepId, groupItems], index) => {
    const step = steps.get(stepId);
    return {
      recordId: `${content.contentId}-vevent-bundle-${index + 1}`,
      component: "VEVENT",
      title: step?.title ?? groupItems[0].title,
      detail: groupItems.map((item) => `• ${item.title}`).join("\n"),
      schedule: groupItems[0].schedule,
      childItemIds: groupItems.map((item) => item.itemId),
      completionOwner: "canonical_child_items",
      sourceRowIds: unique(groupItems.flatMap((item) => item.sourceRowIds)),
      sourceOwner: "source",
      derivation:
        calendarResolution(groupItems[0]) === "source_resolved"
          ? "direct"
          : "anchor_resolution",
    };
  });
}

function calendarCell(content, items) {
  const recommendation = recommendationFor(content, "calendar");
  if (content.contentMode === "event_source_before_user_intent") {
    const occurrences = content.eventSource?.occurrences ?? [];
    const windows = content.eventSource?.windows ?? [];
    const preview = {
      kind: "event_intent_preview",
      sourceFactCount: occurrences.length + windows.length,
      records: occurrences.map((occurrence) => ({
        recordId: `${content.contentId}-${occurrence.occurrenceId}`,
        component: "VEVENT",
        title: content.title,
        schedule: {
          start: occurrence.start,
          end: occurrence.end ?? null,
          allDay: occurrence.allDay ?? false,
          timezone: occurrence.timezone ?? "Asia/Seoul",
        },
        childItemIds: [],
        occurrenceId: occurrence.occurrenceId,
        status: occurrence.status ?? "scheduled",
        sourceRowIds: occurrence.sourceRowIds ?? [],
        suggestionStatus: "draft",
      })),
    };
    return {
      projection: "calendar",
      label: LABELS.calendar,
      recommendation,
      availability: occurrences.length || windows.length
        ? "available_after_user_overlay"
        : "unavailable",
      fidelity: "lossless_or_low_loss",
      generationState: occurrences.length || windows.length
        ? "preview_requires_overlay"
        : "prohibited",
      minimumUserInputs: occurrences.length ? ["attendanceIntent", "selectedOccurrence"] : [],
      destinationCapabilitiesNeeded: ["VEVENT"],
      counts: makeCounts({
        destinationRecordCount: occurrences.length,
        componentCount: occurrences.length,
      }),
      output: null,
      preview,
      preservedPaths: [
        "eventSource.series",
        "eventSource.edition",
        "eventSource.occurrences",
      ],
      omittedPaths: ["user attendance status before selection"],
      lossManifest: [],
      prohibitionReason:
        occurrences.length || windows.length
          ? null
          : "일정 SourceRow가 없어 Calendar를 만들 수 없습니다.",
      fallback: "Sheet에서 회차를 비교하고 선택한 뒤 Calendar로 보냅니다.",
    };
  }

  const scheduled = items.filter((item) => item.schedule);
  const resolved = scheduled.filter(
    (item) => calendarResolution(item) === "source_resolved",
  );
  const records = makeCalendarRecords(content, scheduled);
  const needsAnchor = scheduled.length > resolved.length;
  const pacingEligible = Boolean(content.pacingEligible && !scheduled.length && items.length);

  if (!scheduled.length && !pacingEligible) {
    return {
      projection: "calendar",
      label: LABELS.calendar,
      recommendation: "not_recommended",
      availability: "unavailable",
      fidelity: "misleading_or_prohibited",
      generationState: "prohibited",
      minimumUserInputs: [],
      destinationCapabilitiesNeeded: ["VEVENT"],
      counts: makeCounts({ itemCount: items.length }),
      output: null,
      preview: null,
      preservedPaths: [],
      omittedPaths: [],
      lossManifest: [],
      prohibitionReason: "원문 일정과 확인된 개인 일정이 없어 VEVENT를 만들지 않습니다.",
      fallback: "Checklist, Todo, Sheet 또는 Memo를 사용합니다.",
    };
  }

  const loss = records.some((record) => record.childItemIds.length > 1)
    ? [
        {
          path: "items[].completion",
          severity: "bounded",
          reason:
            "하나의 Calendar bundle은 외부 도구에서 child Item별 완료 상태를 직접 보존하지 못할 수 있습니다.",
        },
      ]
    : [];
  const generated = scheduled.length > 0 && !needsAnchor;
  return {
    projection: "calendar",
    label: LABELS.calendar,
    recommendation,
    availability: generated ? "available_now" : "available_after_user_overlay",
    fidelity: loss.length ? "bounded_loss" : "lossless_or_low_loss",
    generationState: generated ? "generated" : "preview_requires_overlay",
    minimumUserInputs: pacingEligible
      ? ["startDate", "pacingPolicy"]
      : needsAnchor
        ? content.minimumInputs
            .filter((input) => input.purposes?.includes("schedule") || input.type === "date")
            .map((input) => input.key)
        : [],
    destinationCapabilitiesNeeded: ["VEVENT"],
    counts: makeCounts({
      itemCount: items.length,
      destinationRecordCount: records.length,
      groupCount: records.filter((record) => record.childItemIds.length > 1).length,
      childEntryCount: records.reduce(
        (sum, record) => sum + record.childItemIds.length,
        0,
      ),
      componentCount: records.length,
    }),
    output: generated ? { kind: "calendar", records } : null,
    preview: generated
      ? null
      : {
          kind: pacingEligible ? "pacing_preview_entry" : "anchor_preview",
          records,
          suggestionStatus: "draft",
        },
    preservedPaths: ["items[].title", "items[].schedule", "items[].sourceRowIds"],
    omittedPaths: loss.length ? ["items[].completion in external Calendar"] : [],
    lossManifest: loss,
    prohibitionReason: null,
    fallback: "날짜를 확정하지 않으면 Todo 또는 Checklist로 유지합니다.",
  };
}

function checklistCell(content, items) {
  if (!items.length) {
    return {
      projection: "checklist",
      label: LABELS.checklist,
      recommendation: "not_recommended",
      availability: "unavailable",
      fidelity: "misleading_or_prohibited",
      generationState: "prohibited",
      minimumUserInputs: [],
      destinationCapabilitiesNeeded: ["check_state"],
      counts: makeCounts(),
      output: null,
      preview: null,
      preservedPaths: [],
      omittedPaths: [],
      lossManifest: [],
      prohibitionReason: "사용자 intent Item이 아직 없어 체크 목록을 만들지 않습니다.",
      fallback: "회차/자료는 Sheet에서 먼저 살펴봅니다.",
    };
  }
  const steps = [...(content.canonical?.steps ?? [])].sort(byOrder);
  const itemMap = new Map(items.map((item) => [item.itemId, item]));
  const groups = steps.map((step) => ({
    groupId: step.stepId,
    title: step.title,
    ordered: true,
    bounded: true,
    entries: (step.itemIds ?? [])
      .map((id) => itemMap.get(id))
      .filter(Boolean),
  }));
  const groupedIds = new Set(groups.flatMap((group) => group.entries.map((item) => item.itemId)));
  const ungrouped = items.filter((item) => !groupedIds.has(item.itemId));
  if (ungrouped.length) {
    groups.push({
      groupId: `${content.contentId}-ungrouped`,
      title: "기타 항목",
      ordered: true,
      bounded: true,
      entries: ungrouped,
    });
  }
  return {
    projection: "checklist",
    label: LABELS.checklist,
    recommendation: recommendationFor(content, "checklist"),
    availability: "available_now",
    fidelity: "lossless_or_low_loss",
    generationState: "generated",
    minimumUserInputs: [],
    destinationCapabilitiesNeeded: ["check_state", "group_heading"],
    counts: makeCounts({
      itemCount: items.length,
      destinationRecordCount: groups.length,
      groupCount: groups.length,
      childEntryCount: items.length,
    }),
    output: {
      kind: "checklist",
      closedSet: true,
      preservesSourceOrder: true,
      groups,
    },
    preview: null,
    preservedPaths: [
      "steps[].title",
      "steps[].order",
      "items[].title",
      "items[].completion",
      "items[].sourceRowIds",
    ],
    omittedPaths: [],
    lossManifest: [],
    prohibitionReason: null,
    fallback: "그룹을 지원하지 않는 대상에는 제목 prefix를 붙인 flat Checklist를 만듭니다.",
  };
}

function todoCell(content, items, capabilities) {
  if (!items.length) {
    return {
      projection: "todo",
      label: LABELS.todo,
      recommendation: "not_recommended",
      availability: "unavailable",
      fidelity: "misleading_or_prohibited",
      generationState: "prohibited",
      minimumUserInputs: [],
      destinationCapabilitiesNeeded: ["task"],
      counts: makeCounts(),
      output: null,
      preview: null,
      preservedPaths: [],
      omittedPaths: [],
      lossManifest: [],
      prohibitionReason: "독립 실행 Item이 아직 없어 Todo를 만들지 않습니다.",
      fallback: "Source occurrence를 Sheet에서 선택합니다.",
    };
  }
  const steps = [...(content.canonical?.steps ?? [])].sort(byOrder);
  const itemMap = new Map(items.map((item) => [item.itemId, item]));
  const parentTaskSupported = Boolean(capabilities.parentTask && capabilities.subtask);
  const parents = parentTaskSupported
    ? steps.map((step) => ({
        taskId: `${step.stepId}-parent`,
        title: step.title,
        role: "parent",
        childTaskIds: (step.itemIds ?? []).map((id) => `${id}-task`),
      }))
    : [];
  const tasks = items.map((item) => ({
    taskId: `${item.itemId}-task`,
    role: parentTaskSupported ? "subtask" : "task",
    parentTaskId: parentTaskSupported ? `${item.stepId}-parent` : null,
    title: item.title,
    detail: item.detail,
    completion: item.completion,
    due: item.schedule?.due ?? null,
    sourceRowIds: item.sourceRowIds,
    canonicalItemId: item.itemId,
  }));
  const flatFallback = items.map((item) => {
    const step = steps.find((candidate) => candidate.stepId === item.stepId);
    return {
      taskId: `${item.itemId}-flat`,
      title: step ? `[${step.title}] ${item.title}` : item.title,
      canonicalItemId: item.itemId,
      sourceRowIds: item.sourceRowIds,
    };
  });
  return {
    projection: "todo",
    label: LABELS.todo,
    recommendation: recommendationFor(content, "todo"),
    availability: "available_now",
    fidelity: "lossless_or_low_loss",
    generationState: "generated",
    minimumUserInputs: [],
    destinationCapabilitiesNeeded: ["task"],
    counts: makeCounts({
      itemCount: items.length,
      destinationRecordCount: parents.length + tasks.length,
      groupCount: parents.length,
      childEntryCount: tasks.length,
    }),
    output: {
      kind: "todo",
      queueSemantics: "independent_reorderable_deferrable",
      destinationCapabilities: capabilities,
      parentTaskSupported,
      parents,
      tasks,
      flatFallback,
    },
    preview: null,
    preservedPaths: [
      "items[].title",
      "items[].detail",
      "items[].completion",
      "items[].sourceRowIds",
    ],
    omittedPaths: [],
    lossManifest: [],
    prohibitionReason: null,
    fallback: parentTaskSupported
      ? "parent/subtask가 없는 대상에는 Step 제목 prefix가 있는 flat task를 사용합니다."
      : "현재 flat task fallback을 사용합니다.",
  };
}

function sheetCell(content, items) {
  const occurrenceRows =
    content.contentMode === "event_source_before_user_intent"
      ? (content.eventSource?.occurrences ?? []).map((occurrence) => ({
          recordType: "occurrence",
          id: occurrence.occurrenceId,
          parentId: content.eventSource?.edition?.editionId ?? "",
          title: content.title,
          detail: occurrence.label ?? "",
          status: occurrence.status ?? "scheduled",
          start: occurrence.start ?? "",
          end: occurrence.end ?? "",
          sourceRowIds: occurrence.sourceRowIds ?? [],
        }))
      : [];
  const rows = items.map((item) => ({
    recordType: "item",
    id: item.itemId,
    parentId: item.stepId,
    title: item.title,
    detail: item.detail,
    status: "not_started",
    start: item.schedule?.start ?? "",
    end: item.schedule?.end ?? "",
    sourceRowIds: item.sourceRowIds,
  }));
  const combinedRows = [...rows, ...occurrenceRows];
  return {
    projection: "sheet",
    label: LABELS.sheet,
    recommendation: recommendationFor(content, "sheet"),
    availability: "available_now",
    fidelity: "lossless_or_low_loss",
    generationState: "generated",
    minimumUserInputs: [],
    destinationCapabilitiesNeeded: ["typed_rows", "stable_columns"],
    counts: makeCounts({
      itemCount: items.length,
      destinationRecordCount: combinedRows.length,
      childEntryCount: combinedRows.length,
    }),
    output: {
      kind: "sheet",
      columns: [
        "recordType",
        "id",
        "parentId",
        "title",
        "detail",
        "status",
        "start",
        "end",
        "sourceRowIds",
      ],
      stableIdColumns: ["recordType", "id", "parentId"],
      rows: combinedRows,
    },
    preview: null,
    preservedPaths: [
      "items[].itemId",
      "items[].stepId",
      "items[].title",
      "items[].detail",
      "items[].sourceRowIds",
      "eventSource.occurrences",
    ],
    omittedPaths: ["nested canonical relationships beyond explicit ID columns"],
    lossManifest: [
      {
        path: "canonical nested relationships",
        severity: "bounded",
        reason: "행/열 표현은 관계를 ID 열로 평탄화합니다.",
      },
    ],
    prohibitionReason: null,
    fallback: "CSV/TSV/XLSX destination capability에 맞춰 같은 열 계약을 사용합니다.",
  };
}

function memoCell(content, items) {
  const steps = [...(content.canonical?.steps ?? [])].sort(byOrder);
  const itemMap = new Map(items.map((item) => [item.itemId, item]));
  const sections = steps.map((step) => ({
    heading: step.title,
    lines: (step.itemIds ?? [])
      .map((itemId) => itemMap.get(itemId))
      .filter(Boolean)
      .map((item) => `- [ ] ${item.title}${item.detail ? ` — ${item.detail}` : ""}`),
  }));
  if (!sections.length && content.contentMode === "event_source_before_user_intent") {
    sections.push({
      heading: "행사 일정",
      lines: (content.eventSource?.occurrences ?? []).map(
        (occurrence) =>
          `- ${occurrence.start ?? "날짜 미정"} · ${occurrence.label ?? content.title}`,
      ),
    });
  }
  const markdown = [
    `# ${content.title}`,
    "",
    content.saveReason,
    "",
    ...sections.flatMap((section) => [
      `## ${section.heading}`,
      "",
      ...section.lines,
      "",
    ]),
    `원문: ${content.source.canonicalUrl}`,
  ].join("\n");
  return {
    projection: "memo",
    label: LABELS.memo,
    recommendation: recommendationFor(content, "memo"),
    availability: "available_now",
    fidelity: "bounded_loss",
    generationState: "generated",
    minimumUserInputs: [],
    destinationCapabilitiesNeeded: ["text_or_markdown"],
    counts: makeCounts({
      itemCount: items.length,
      destinationRecordCount: sections.length,
      groupCount: sections.length,
      childEntryCount: sections.reduce((sum, section) => sum + section.lines.length, 0),
    }),
    output: {
      kind: "memo",
      canonicalRawData: false,
      mediaType: "text/markdown",
      sections,
      markdown,
    },
    preview: null,
    preservedPaths: ["title", "saveReason", "steps[].title", "items[].title"],
    omittedPaths: ["typed state", "full canonical graph", "machine round-trip fidelity"],
    lossManifest: [
      {
        path: "canonical typed state and graph",
        severity: "bounded",
        reason: "Memo는 사람이 읽는 문서이며 canonical JSON이 아닙니다.",
      },
    ],
    prohibitionReason: null,
    fallback: "TXT 대상에는 Markdown 기호를 단순화합니다.",
  };
}

export function generateProjectionCells(
  content,
  {
    destinationCapabilities = {
      parentTask: true,
      subtask: true,
      due: true,
      reminder: false,
      vtodo: false,
    },
  } = {},
) {
  const items = (content.canonical?.items ?? []).map((item) =>
    itemRecord(content, item),
  );
  const cells = [
    calendarCell(content, items),
    checklistCell(content, items),
    todoCell(content, items, destinationCapabilities),
    sheetCell(content, items),
    memoCell(content, items),
  ];
  return cells.map((cell) => ({
    ...cell,
    cellId: `${content.contentId}-${cell.projection}`,
    contentId: content.contentId,
    engineVersion: "flow-content-ui-projection-engine-v1",
    inputHash: sha256({
      contentId: content.contentId,
      contentHash: content.lineage?.canonicalContentHash,
      projection: cell.projection,
      destinationCapabilities,
    }),
  }));
}
