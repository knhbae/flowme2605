import { programClone, programFailure, type ProgramData, type ProgramItemPatch, type ProgramPublicItem } from './contract';
import { programSame } from './controller';
import { createProgramProposal, type CreateProgramProposalInput } from './publication';

/** The displayed immutable item, not the currently selected/latest item, owns a pending proposal. */
export type ProgramCopyProposalContext = {
  actorId: string; copyId: string; flowId: string; baseVersionId: string; item: ProgramPublicItem;
};
export function programCopyProposalContextMatches(data: ProgramData, context: ProgramCopyProposalContext): boolean {
  const copies = data.spaces[context.actorId]?.copies.filter(copy => copy.id === context.copyId) ?? [];
  const versions = data.public.versions.filter(version => version.id === context.baseVersionId && version.flowId === context.flowId);
  const items = versions.length === 1 ? versions[0].items.filter(item => item.id === context.item.id) : [];
  return data.activeActorId === context.actorId && copies.length === 1 && copies[0].flowId === context.flowId
    && data.public.flows.filter(flow => flow.id === context.flowId && !flow.archived).length === 1
    && items.length === 1 && programSame(items[0], context.item);
}
/** Explicit restoration choices from this item's immutable history only.
 * Titles and list positions never establish lineage; a new row keeps a new ID. */
export function programCopyProposalPreviousChecks(data: ProgramData, context: ProgramCopyProposalContext) {
  if (!programCopyProposalContextMatches(data, context)) return [];
  const base = data.public.versions.find(version => version.id === context.baseVersionId)!;
  const found = new Map<string, { id: string; title: string; versionNumber: number }>();
  for (const version of data.public.versions.filter(version => version.flowId === context.flowId && version.number <= base.number)
    .sort((a, b) => b.number - a.number)) {
    for (const check of version.items.find(item => item.id === context.item.id)?.subchecks ?? []) {
      if (!found.has(check.id)) found.set(check.id, { id: check.id, title: check.title, versionNumber: version.number });
    }
  }
  return [...found.values()];
}
export function submitProgramCopyProposal(data: ProgramData, input: {
  context: ProgramCopyProposalContext; requestId: string; reason: string; patch: ProgramItemPatch;
}, now: string) {
  if (!programCopyProposalContextMatches(data, input.context)) return programFailure(data, 'conflict');
  const { actorId, flowId, baseVersionId, item } = input.context;
  const proposal: CreateProgramProposalInput = { actorId, flowId, baseVersionId, itemId: item.id,
    requestId: input.requestId, reason: input.reason, patch: programClone(input.patch) };
  return createProgramProposal(data, proposal, now);
}
