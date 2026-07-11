import type { FlowBundle } from './types';
import { stripUserFacingInternalLines } from './user-surface-guardrails';

export type YearStampedSensitiveClaim = {
  slug: string;
  title: string;
  riskLevel: string;
  text: string;
};

const YEAR_STAMP_PATTERN = /20\d{2}(?:년|학년도|년도)/u;

function pushText(target: string[], value?: string) {
  const visible = stripUserFacingInternalLines(value);
  if (visible) target.push(visible);
}

export function collectUserFacingClaimText(bundle: FlowBundle): string[] {
  const values: string[] = [];
  pushText(values, bundle.flow.title);
  pushText(values, bundle.flow.description);
  pushText(values, bundle.flow.warning);
  pushText(values, bundle.flow.setup_anchor_label);
  pushText(values, bundle.flow.setup_anchor_hint);
  bundle.flow.stop_conditions?.forEach((value) => pushText(values, value));
  bundle.flow.principles?.forEach((value) => pushText(values, value));
  if (bundle.flow.hold_section) {
    pushText(values, bundle.flow.hold_section.title);
    bundle.flow.hold_section.reasons.forEach((value) => pushText(values, value));
    pushText(values, bundle.flow.hold_section.consequence);
    pushText(values, bundle.flow.hold_section.memo_template);
  }

  for (const section of bundle.sections) {
    pushText(values, section.title);
    pushText(values, section.description);
  }
  for (const item of bundle.items) {
    pushText(values, item.title);
    pushText(values, item.description);
    pushText(values, item.date_window?.label);
  }
  for (const detail of bundle.itemDetails ?? []) {
    pushText(values, detail.why);
    pushText(values, detail.how);
    pushText(values, detail.completion_criteria);
    pushText(values, detail.caution);
  }
  for (const warning of bundle.warnings ?? []) pushText(values, warning);
  for (const recipe of bundle.recipes ?? []) {
    pushText(values, recipe.title);
    pushText(values, recipe.description);
    pushText(values, recipe.texture_note);
    pushText(values, recipe.ratio_note);
    pushText(values, recipe.yield_note);
    pushText(values, recipe.storage_note);
    pushText(values, recipe.tool_note);
    pushText(values, recipe.caution_note);
    recipe.ingredients.forEach((ingredient) => {
      pushText(values, ingredient.name);
      pushText(values, ingredient.note);
    });
    recipe.steps.forEach((step) => pushText(values, step.text));
  }

  return [...new Set(values)];
}

export function findYearStampedSensitiveClaims(
  bundles: FlowBundle[],
): YearStampedSensitiveClaim[] {
  return bundles.flatMap((bundle) => {
    const riskLevel = bundle.flow.risk_level ?? 'low';
    if (riskLevel === 'low') return [];
    return collectUserFacingClaimText(bundle)
      .filter((text) => YEAR_STAMP_PATTERN.test(text))
      .map((text) => ({
        slug: bundle.flow.slug,
        title: bundle.flow.title,
        riskLevel,
        text,
      }));
  });
}
