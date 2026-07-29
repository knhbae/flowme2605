import { sha256 } from "./utils-v1.mjs";

export function activateEventIntent(
  content,
  { intent, selectedOccurrenceId, reminder = null } = {},
) {
  if (content.contentMode !== "event_source_before_user_intent") {
    return { ok: false, errors: ["NOT_EVENT_SOURCE"], item: null, projectionPlan: null };
  }
  if (!["save", "book", "attend", "result_check"].includes(intent)) {
    return { ok: false, errors: ["VALID_INTENT_REQUIRED"], item: null, projectionPlan: null };
  }
  const occurrence = (content.eventSource?.occurrences ?? []).find(
    (entry) => entry.occurrenceId === selectedOccurrenceId,
  );
  if (!occurrence) {
    return { ok: false, errors: ["OCCURRENCE_REQUIRED"], item: null, projectionPlan: null };
  }
  if (occurrence.status === "cancelled") {
    return { ok: false, errors: ["CANCELLED_OCCURRENCE"], item: null, projectionPlan: null };
  }
  if (content.eventSource?.itemActivation === "none_until_replacement_details_confirmed") {
    return {
      ok: false,
      errors: ["SOURCE_REFRESH_REQUIRED"],
      item: null,
      projectionPlan: null,
    };
  }
  const resolvedStart =
    occurrence.start ??
    (occurrence.allDay && occurrence.startDate ? occurrence.startDate : null);
  if (!resolvedStart || !(occurrence.sourceRowIds ?? []).length) {
    return {
      ok: false,
      errors: [
        !resolvedStart ? "RESOLVED_START_REQUIRED" : null,
        !(occurrence.sourceRowIds ?? []).length ? "SOURCE_ROW_REQUIRED" : null,
      ].filter(Boolean),
      item: null,
      projectionPlan: null,
    };
  }
  const itemId = `${content.contentId}-${intent}-${occurrence.occurrenceId}`;
  const item = {
    itemId,
    stepId: `${content.contentId}-event-intent`,
    title:
      intent === "attend"
        ? `${content.title} 참석하기`
        : intent === "book"
          ? `${content.title} 예약하기`
          : intent === "result_check"
            ? `${content.title} 결과 확인하기`
            : `${content.title} 저장하기`,
    description: occurrence.label ?? "",
    intent: intent === "save" ? "record" : "act",
    order: 0,
    completion: {
      mode: "check",
      doneWhen:
        intent === "attend"
          ? "선택한 회차 참석 상태를 남겼다."
          : "선택한 의도를 실행하고 상태를 남겼다.",
    },
    schedule: {
      mode: "absolute",
      start: resolvedStart,
      end: occurrence.end ?? null,
      timezone: occurrence.timezone ?? "Asia/Seoul",
      allDay: occurrence.allDay ?? false,
    },
    sourceRowIds: occurrence.sourceRowIds ?? [],
    occurrenceId: occurrence.occurrenceId,
    scheduleOwner: "source",
    derivation: "direct",
  };
  const projectionPlan = {
    primary: intent === "attend" || intent === "save" ? "calendar" : "todo",
    vevent:
      intent === "attend" || intent === "save"
        ? {
            component: "VEVENT",
            uid: `${itemId}@flowme.local`,
            title: item.title,
            schedule: item.schedule,
            sourceRowIds: item.sourceRowIds,
            reminder,
          }
        : null,
    vtodo:
      intent === "book" || intent === "result_check"
        ? {
            component: "VTODO",
            uid: `${itemId}@flowme.local`,
            title: item.title,
            due: resolvedStart,
            sourceRowIds: item.sourceRowIds,
          }
        : null,
    nestedComponentCount: 0,
  };
  return {
    ok: true,
    errors: [],
    item,
    projectionPlan,
    resultHash: sha256({ item, projectionPlan }),
  };
}
