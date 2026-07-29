import { sha256 } from "./utils-v1.mjs";

const DAY_MS = 86_400_000;

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("INVALID_START_DATE");
  return date;
}

function weekday(date) {
  return date.getUTCDay();
}

function nextAllowedDate(date, allowedWeekdays, restDates) {
  let cursor = new Date(date);
  for (let guard = 0; guard < 3660; guard += 1) {
    const key = isoDate(cursor);
    if (allowedWeekdays.includes(weekday(cursor)) && !restDates.has(key)) {
      return cursor;
    }
    cursor = new Date(cursor.getTime() + DAY_MS);
  }
  throw new Error("NO_ALLOWED_DATE");
}

export function validatePacingPolicy(policy) {
  const errors = [];
  if (!policy || typeof policy !== "object") return ["POLICY_REQUIRED"];
  if (!policy.startDate) errors.push("START_DATE_REQUIRED");
  const mode = policy.mode ?? "items_per_day";
  if (!["items_per_day", "items_per_week", "target_end"].includes(mode)) {
    errors.push("INVALID_MODE");
  }
  if (mode === "items_per_day" && !(Number(policy.itemsPerDay) > 0)) {
    errors.push("ITEMS_PER_DAY_MUST_BE_POSITIVE");
  }
  if (mode === "items_per_week" && !(Number(policy.itemsPerWeek) > 0)) {
    errors.push("ITEMS_PER_WEEK_MUST_BE_POSITIVE");
  }
  if (mode === "target_end" && !policy.targetEndDate) {
    errors.push("TARGET_END_DATE_REQUIRED");
  }
  const allowed = policy.allowedWeekdays ?? [1, 2, 3, 4, 5];
  if (!allowed.length || allowed.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    errors.push("INVALID_ALLOWED_WEEKDAYS");
  }
  try {
    if (policy.startDate) parseDate(policy.startDate);
    if (policy.targetEndDate) parseDate(policy.targetEndDate);
  } catch (error) {
    errors.push(error.message);
  }
  if (
    policy.startDate &&
    policy.targetEndDate &&
    policy.targetEndDate < policy.startDate
  ) {
    errors.push("TARGET_END_BEFORE_START");
  }
  return [...new Set(errors)];
}

export function scheduleItems(
  items,
  policy,
  {
    suggestionStatus = "draft",
    completedItemIds = [],
    heldItemIds = [],
    lockedPastAssignments = [],
  } = {},
) {
  const errors = validatePacingPolicy(policy);
  if (errors.length) {
    return {
      ok: false,
      errors,
      assignments: [],
      inputHash: sha256({ items: items.map((item) => item.itemId), policy }),
      resultHash: null,
    };
  }

  const completed = new Set(completedItemIds);
  const held = new Set(heldItemIds);
  const lockedIds = new Set(lockedPastAssignments.map((entry) => entry.itemId));
  const targets = items.filter(
    (item) =>
      !item.schedule &&
      !completed.has(item.itemId) &&
      !held.has(item.itemId) &&
      !lockedIds.has(item.itemId),
  );
  const allowed = policy.allowedWeekdays ?? [1, 2, 3, 4, 5];
  const restDates = new Set(policy.restDates ?? []);
  const mode = policy.mode ?? "items_per_day";
  let dailyRate = Number(policy.itemsPerDay ?? 1);

  if (mode === "items_per_week") {
    dailyRate = Math.max(1, Math.ceil(Number(policy.itemsPerWeek) / allowed.length));
  }
  if (mode === "target_end") {
    const start = parseDate(policy.startDate);
    const end = parseDate(policy.targetEndDate);
    let availableDays = 0;
    for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + DAY_MS)) {
      if (allowed.includes(weekday(cursor)) && !restDates.has(isoDate(cursor))) {
        availableDays += 1;
      }
    }
    if (!availableDays) {
      return {
        ok: false,
        errors: ["NO_AVAILABLE_DATE_BEFORE_TARGET_END"],
        assignments: [],
        inputHash: sha256({ items: items.map((item) => item.itemId), policy }),
        resultHash: null,
      };
    }
    dailyRate = Math.max(1, Math.ceil(targets.length / availableDays));
  }

  let cursor = nextAllowedDate(parseDate(policy.startDate), allowed, restDates);
  let usedOnDate = 0;
  let usedThisWeek = 0;
  const weeklyCap = mode === "items_per_week" ? Number(policy.itemsPerWeek) : Infinity;
  const assignments = [];

  for (const item of targets) {
    if (usedOnDate >= dailyRate || usedThisWeek >= weeklyCap) {
      const beforeWeekday = weekday(cursor);
      cursor = nextAllowedDate(
        new Date(cursor.getTime() + DAY_MS),
        allowed,
        restDates,
      );
      usedOnDate = 0;
      if (weekday(cursor) <= beforeWeekday) usedThisWeek = 0;
    }
    if (mode === "target_end" && isoDate(cursor) > policy.targetEndDate) {
      return {
        ok: false,
        errors: ["TARGET_END_CAPACITY_EXCEEDED"],
        assignments: [],
        inputHash: sha256({ items: items.map((item) => item.itemId), policy }),
        resultHash: null,
      };
    }
    assignments.push({
      assignmentId: `${item.itemId}-${isoDate(cursor)}`,
      itemId: item.itemId,
      date: isoDate(cursor),
      preferredTime: policy.preferredTime ?? null,
      allDay: policy.allDay ?? true,
      outputMode: policy.outputMode ?? "todo_due",
      bundleMode: policy.bundleMode ?? "per_item",
      scheduleOwner: "user_overlay",
      derivation: "pacing_policy",
      suggestionStatus,
    });
    usedOnDate += 1;
    usedThisWeek += 1;
  }

  const combined = [...lockedPastAssignments, ...assignments];
  const inputHash = sha256({
    itemIds: items.map((item) => item.itemId),
    policy,
    completedItemIds: [...completed],
    heldItemIds: [...held],
    lockedPastAssignments,
  });
  return {
    ok: true,
    errors: [],
    policy: { ...policy },
    suggestionStatus,
    targetItemIds: targets.map((item) => item.itemId),
    excludedItemIds: items
      .filter((item) => !targets.includes(item) && !lockedIds.has(item.itemId))
      .map((item) => item.itemId),
    lockedPastAssignments,
    assignments: combined,
    inputHash,
    resultHash: sha256(combined),
  };
}

