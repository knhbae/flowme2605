import type { PersonalWorkspacePocFlowItem } from './personal-workspace-poc-contract';

/**
 * The memo inherited by a personal Plan is the existing personal layer, never
 * source instructions or the currently composed PoC override. Missing legacy
 * ownership therefore means no known personal memo. Preserve exact string
 * values (including an explicit empty memo); display trimming belongs elsewhere.
 */
export function getPersonalWorkspacePocInheritedMemo(
  item: PersonalWorkspacePocFlowItem,
): string | undefined {
  const baseline = item.fieldOwnership?.description.existingPersonal;
  return baseline?.owner === 'existing-personal' && typeof baseline.value === 'string'
    ? baseline.value
    : undefined;
}
