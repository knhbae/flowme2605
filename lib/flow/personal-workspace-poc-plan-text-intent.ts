import type { PersonalWorkspacePocPlanTextDraft } from './personal-workspace-poc-plan-editor';

/**
 * Pure value normalization, not a guard, writer, or permission check. The
 * planner supplies its verified opened overlay; display code supplies only its
 * captured baseline. An unchanged existing intent survives baseline updates.
 */
export function resolvePersonalWorkspacePocPlanTextIntent(input: Readonly<{
  draft: PersonalWorkspacePocPlanTextDraft;
  inherited: string | undefined;
  capturedOverride: string | undefined;
}>): string | undefined {
  if (input.draft.mode === 'inherit') return undefined;
  if (input.capturedOverride !== undefined && input.draft.value === input.capturedOverride) {
    return input.capturedOverride;
  }
  return input.draft.value === input.inherited ? undefined : input.draft.value;
}
