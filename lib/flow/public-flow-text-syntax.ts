import type { FlowExperienceProjection } from './flow-experience-projection';
import { toUserFacingSourceTitle } from './display-title';
import { timingLabel } from './parser';
import type { PublicItemPersonalization } from './public-item-personalization';
import type { FlowBundle } from './types';
import { stripUserFacingInternalLines } from './user-surface-guardrails';

export type PublicFlowTextScheduleMode =
  | 'source_relative'
  | 'fixed_override'
  | 'explicit_undated'
  | 'unscheduled';

export type PublicFlowTextSyntaxRow = {
  id: string;
  sourceItemId: string;
  title: string;
  timing?: string;
  scheduleMode: PublicFlowTextScheduleMode;
  fixedDate?: string;
  durationDays?: number;
  description?: string;
  personalDetail?: string;
  why?: string;
  how?: string;
  done?: string;
  caution?: string;
  resources: Array<{ label: string; url: string; type: string }>;
};

export type PublicFlowTextSyntaxGroup = {
  section: string;
  repeatRule?: string;
  rows: PublicFlowTextSyntaxRow[];
};

export type PublicFlowTextSyntaxModel = {
  title: string;
  warnings: string[];
  groups: PublicFlowTextSyntaxGroup[];
};

function isPlainDate(value?: string | null): value is string {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return (
    date.getFullYear() === Number(match[1])
    && date.getMonth() === Number(match[2]) - 1
    && date.getDate() === Number(match[3])
  );
}

function nonBlank(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function publicSyntaxDetail(value?: string): string | undefined {
  return nonBlank(stripUserFacingInternalLines(value));
}

/**
 * Builds the approved public Text view outside the effective snapshot contract.
 *
 * The projection remains the owner of effective order, inclusion, title, and
 * personal detail. Source timing and authoring detail are read from the bundle
 * so an illustrative anchor can never be mistaken for a new D-offset. An
 * explicit fixed date or date removal is represented as preview metadata rather
 * than as parser syntax that FLOW does not support.
 */
export function buildPublicFlowTextSyntaxModel(options: {
  bundle: FlowBundle;
  projection: FlowExperienceProjection;
  itemPersonalizations?: Readonly<Record<string, PublicItemPersonalization>>;
}): PublicFlowTextSyntaxModel {
  const sourceTimingById = new Map<string, { dayOffset?: number; durationDays?: number }>([
    ...options.bundle.items.map((item) => [item.id, {
      ...(item.day_offset !== undefined ? { dayOffset: item.day_offset } : {}),
      ...(item.duration_days !== undefined ? { durationDays: item.duration_days } : {}),
    }] as const),
    ...(options.bundle.mealSlots ?? []).map((slot) => [slot.id, {
      dayOffset: slot.day_offset,
      durationDays: slot.duration_days,
    }] as const),
  ]);
  const detailById = new Map(
    (options.bundle.itemDetails ?? []).map((detail) => [detail.item_id, detail]),
  );
  const personalizations = options.itemPersonalizations ?? {};

  const groups = options.projection.outlineRows.reduce<PublicFlowTextSyntaxGroup[]>((result, row) => {
    const sourceTiming = sourceTimingById.get(row.sourceItemId) ?? sourceTimingById.get(row.id);
    const detail = detailById.get(row.sourceItemId) ?? detailById.get(row.id);
    const personalization = personalizations[row.sourceItemId] ?? personalizations[row.id];
    const hasDateOverride = Boolean(personalization)
      && Object.prototype.hasOwnProperty.call(personalization, 'date');
    const fixedDate = hasDateOverride && isPlainDate(personalization?.date)
      ? personalization.date
      : undefined;
    const scheduleMode: PublicFlowTextScheduleMode = hasDateOverride
      ? fixedDate
        ? 'fixed_override'
        : 'explicit_undated'
      : sourceTiming?.dayOffset !== undefined
        ? 'source_relative'
        : 'unscheduled';
    const timing = scheduleMode === 'source_relative'
      ? timingLabel(sourceTiming?.dayOffset, sourceTiming?.durationDays)
      : '';
    const description = publicSyntaxDetail(row.description);
    const why = publicSyntaxDetail(detail?.why);
    const how = publicSyntaxDetail(detail?.how);
    const done = publicSyntaxDetail(row.completionCriterion);
    const caution = publicSyntaxDetail(row.caution);
    const syntaxRow: PublicFlowTextSyntaxRow = {
      id: row.id,
      sourceItemId: row.sourceItemId,
      title: row.title,
      scheduleMode,
      resources: row.resources.map((resource) => ({
        ...resource,
        label: toUserFacingSourceTitle(resource.label),
      })),
      ...(timing ? { timing } : {}),
      ...(fixedDate ? { fixedDate } : {}),
      ...(scheduleMode === 'fixed_override' && sourceTiming?.durationDays !== undefined
        ? { durationDays: sourceTiming.durationDays }
        : {}),
      ...(description ? { description } : {}),
      ...(nonBlank(row.memo) ? { personalDetail: nonBlank(row.memo) } : {}),
      ...(why ? { why } : {}),
      ...(how ? { how } : {}),
      ...(done ? { done } : {}),
      ...(caution ? { caution } : {}),
    };
    const section = nonBlank(row.section) ?? '기본';
    const repeatRule = nonBlank(row.schedule.repeatRule);
    const current = result.at(-1);

    if (current && current.section === section && current.repeatRule === repeatRule) {
      current.rows.push(syntaxRow);
    } else {
      result.push({
        section,
        ...(repeatRule ? { repeatRule } : {}),
        rows: [syntaxRow],
      });
    }
    return result;
  }, []);

  return {
    title: options.projection.title,
    warnings: Array.from(new Set([
      options.bundle.flow.warning,
      ...(options.bundle.warnings ?? []),
    ].flatMap((warning) => {
      const normalized = publicSyntaxDetail(warning);
      return normalized ? [normalized] : [];
    }))),
    groups,
  };
}
