import {
  getPersonalWorkspacePocFlowItemFieldOwnership,
  type PersonalWorkspacePocAuthoredFlow,
  type PersonalWorkspacePocFlow,
  type PersonalWorkspacePocFlowItem,
} from './personal-workspace-poc-contract';

export type PersonalWorkspacePocItemDetails = Readonly<{
  description?: string;
  completionCriterion?: string;
  memo?: string;
}>;

/** Read projection only: personal memo never substitutes for source instructions. */
export function getPersonalWorkspacePocItemDetails(
  flow: PersonalWorkspacePocFlow,
  item: PersonalWorkspacePocFlowItem,
): PersonalWorkspacePocItemDetails {
  const ownership = getPersonalWorkspacePocFlowItemFieldOwnership(item, flow.origin, flow);
  const description = ownership.description.source.value;
  const effective = ownership.description.effective;
  const memo = effective.owner === 'existing-personal' || effective.owner === 'poc-personal'
    ? effective.value
    : undefined;
  let completionCriterion = flow.origin === 'authoring-handoff'
    ? undefined
    : item.completionCriterion;

  if (flow.origin === 'authoring-handoff') {
    const lineage = (flow as PersonalWorkspacePocAuthoredFlow).authoring;
    const matches = Object.values(lineage?.sourceLineItemIdentityMap ?? {}).filter((identity) => (
      identity.itemRef === item.ref
      && identity.itemId === item.itemId
      && identity.flowId === item.flowId
      && identity.savedCopyId === item.savedCopyId
      && identity.flowId === flow.flowId
      && identity.savedCopyId === flow.savedCopyId
    ));
    if (matches.length === 1) {
      const parsed = lineage?.parsedItems?.filter((candidate) => (
        candidate.sourceLine === matches[0].sourceLine
      ));
      if (parsed?.length === 1) completionCriterion = parsed[0].completionCriteria;
    }
  }

  return {
    ...(typeof description === 'string' && description.trim() ? { description } : {}),
    ...(typeof completionCriterion === 'string' && completionCriterion.trim()
      ? { completionCriterion }
      : {}),
    ...(typeof memo === 'string' && memo.trim() ? { memo } : {}),
  };
}
