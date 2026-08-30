import {
  formatStructureTemplateDayOffset,
  formatStructureTemplateWeekdays,
} from "./date";
import type {
  CompiledStructureTemplateFlow,
  CompiledStructureTemplateItem,
} from "./types";

export type {
  CompiledStructureTemplateFlow,
  CompiledStructureTemplateItem,
  CompiledStructureTemplateRecurrence,
  CompiledStructureTemplateSchedule,
  CompiledStructureTemplateStep,
  StructureTemplateDerivedValue,
} from "./types";

function singleLine(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed || /[\r\n]/u.test(trimmed)) {
    throw new Error(`${label} must be a non-empty single-line value.`);
  }
  return trimmed;
}

function appendDetail(lines: string[], detail: string | undefined): void {
  if (!detail) return;
  detail.split(/\r\n?|\n/u).forEach((line) => {
    if (line.trim()) lines.push(`  - 설명: ${line.trim()}`);
  });
}

function serializeItem(item: CompiledStructureTemplateItem): string[] {
  const lines = [`- [ ] ${singleLine(item.title, "Item title")}`];
  if (item.schedule?.mode === "absolute" || item.schedule?.mode === "recurring") {
    lines.push(`  - 날짜: ${item.schedule.date}`);
  } else if (item.schedule?.mode === "relative") {
    lines.push(
      `  - 상대 날짜: ${formatStructureTemplateDayOffset(item.schedule.dayOffset)}`,
    );
  }
  if (item.time) lines.push(`  - 시간: ${singleLine(item.time, "Time")}`);
  if (item.timezone) {
    lines.push(`  - 시간대: ${singleLine(item.timezone, "Timezone")}`);
  }
  if (item.durationMinutes !== undefined) {
    lines.push(`  - 소요 시간: ${item.durationMinutes}분`);
  }
  if (item.schedule?.mode === "recurring") {
    lines.push(
      `  - 반복: ${formatStructureTemplateWeekdays(
        item.schedule.recurrence.weekdays,
      )}`,
    );
    const end = item.schedule.recurrence.end;
    lines.push(
      end.mode === "until"
        ? `  - 반복 종료: ${end.date}`
        : `  - 반복 종료: ${end.count}회`,
    );
  }
  if (item.place) lines.push(`  - 장소: ${singleLine(item.place, "Place")}`);
  appendDetail(lines, item.detail);
  if (item.doneWhen) {
    lines.push(`  - 완료 기준: ${singleLine(item.doneWhen, "Done when")}`);
  }
  if (item.referenceUrl) {
    lines.push(`  - 자료: ${singleLine(item.referenceUrl, "Reference URL")}`);
  }
  item.subchecks.forEach((subcheck) => {
    if (subcheck.trim()) {
      lines.push(`  - [ ] ${singleLine(subcheck, "Subcheck")}`);
    }
  });
  return lines;
}

/**
 * Serializes only compiled user values and deterministic schedule values.
 * It emits LF bytes and intentionally omits a trailing line ending.
 */
export function serializeStructureTemplateSource(
  flow: CompiledStructureTemplateFlow,
): string {
  const header: string[] = [];
  if (flow.flowTitle.trim()) {
    header.push(`# ${singleLine(flow.flowTitle, "Flow title")}`);
  }
  if (flow.anchorDate) header.push(`- 기준일: ${flow.anchorDate}`);
  const sections: string[][] = [];
  flow.steps.forEach((step) => {
    if (step.title) {
      sections.push([
        `## ${singleLine(step.title, "Step title")}`,
        ...step.items.flatMap(serializeItem),
      ]);
      return;
    }
    if (step.items.length === 0) return;
    step.items.forEach((item) => sections.push(serializeItem(item)));
  });
  const blocks = [
    ...(header.length > 0 ? [header] : []),
    ...sections,
  ];
  return blocks.map((lines) => lines.join("\n")).join("\n\n");
}
