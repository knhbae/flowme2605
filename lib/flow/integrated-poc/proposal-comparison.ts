import type { ProgramData, ProgramItemPatch, ProgramProposal, ProgramPublicItem, ProgramPublicVersion, PublicSchedule } from './contract';
import { programSame } from './controller';
import { canPublishProgramSchedule } from './program-data';
import { programRecurringScheduleLabel } from './public-recurrence-contract';

const fields = ['title', 'description', 'completionCriteria', 'schedule', 'subchecks'] as const;
export type ProgramProposalField = typeof fields[number];
export type ProgramProposalComparisonRow = {
  field: ProgramProposalField; proposed: boolean;
  base: ProgramItemPatch[ProgramProposalField]; latest: ProgramItemPatch[ProgramProposalField]; proposal: ProgramItemPatch[ProgramProposalField];
  state: 'unavailable' | 'conflict' | 'unchanged' | 'proposed' | 'keep-latest';
};
const one = <T>(values: T[]) => values.length === 1 ? values[0] : undefined;
// Match the writer's structural comparison, including every typed recurrence
// field. Object property insertion order is not a publication change.
const equal = programSame;
type ProgramComparisonValue = string | PublicSchedule | ProgramPublicItem['subchecks'] | undefined;

/** Presentation only. Never infers identity, merges a patch, or changes the acceptance policy. */
export function compareProgramProposal(data: ProgramData, proposal: ProgramProposal) {
  const flow = one(data.public.flows.filter(value => value.id === proposal.flowId));
  const version = (id: string | undefined): ProgramPublicVersion | undefined => {
    const found = one(data.public.versions.filter(value => value.id === id));
    return found?.flowId === proposal.flowId ? found : undefined;
  };
  const base = version(proposal.baseVersionId), latest = version(flow?.currentVersionId);
  const original = base && one(base.items.filter(item => item.id === proposal.itemId));
  const current = latest && one(latest.items.filter(item => item.id === proposal.itemId));
  const issue: 'invalid-link' | 'latest-item-removed' | null = !flow || !base || !latest || !original ? 'invalid-link'
    : !current ? latest.items.some(item => item.id === proposal.itemId) ? 'invalid-link' : 'latest-item-removed' : null;
  const rows: ProgramProposalComparisonRow[] = fields.map(field => {
    const proposed = Object.prototype.hasOwnProperty.call(proposal.patch, field);
    const oldValue = original?.[field], currentValue = current?.[field], nextValue = proposal.patch[field];
    return { field, proposed, base: oldValue, latest: currentValue, proposal: nextValue,
      state: issue ? 'unavailable' : !proposed ? 'keep-latest' : !equal(oldValue, currentValue) ? 'conflict'
        : equal(nextValue, currentValue) ? 'unchanged' : 'proposed' };
  });
  return { flow, base, latest, original, current, issue, rows };
}

/** Keep a known writer restriction visible before the user tries to accept.
 * A metadata-only proposal can also carry an unchanged recurring sibling into
 * the new version. Inspect the complete latest version, not just the patch. */
export function programProposalAcceptanceBlock(comparison: ReturnType<typeof compareProgramProposal>):
  'invalid-link' | 'latest-item-removed' | 'conflict' | 'recurrence-rollout' | null {
  if (comparison.issue) return comparison.issue;
  if (comparison.rows.some(row => row.state === 'conflict')) return 'conflict';
  if (comparison.latest!.items.some(item => !canPublishProgramSchedule(item.schedule))
    || comparison.rows.some(row => row.field === 'schedule' && row.proposed && !canPublishProgramSchedule(row.proposal))) return 'recurrence-rollout';
  return null;
}

export function programProposalComparisonValue(value: ProgramComparisonValue) {
  if (value === undefined) return '연결된 항목 없음';
  if (typeof value === 'string') return value || '(비어 있음)';
  if (Array.isArray(value)) return value.length ? value.map((check, index) => `${index + 1}. ${check.title}`).join('\n') : '하위 체크 없음';
  if (value.kind === 'recurring') return programRecurringScheduleLabel(value);
  return [value.kind === 'fixed' ? `고정일 ${value.date}` : value.kind === 'relative' ? `기준일 ${value.days >= 0 ? '+' : ''}${value.days}일` : '날짜 미정', value.timing?.time, value.timing?.timeZone].filter(Boolean).join(' · ');
}
