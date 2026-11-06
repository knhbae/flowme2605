import type { ProgramData } from './contract';
import { programFlowAttributionLabel } from './alpha-official-actors';
import { programCatalogMetadata } from './catalog';
import { isPublicCatalogFlowOnHold } from '../public-source-review-policy';
import { programFlowCardLines, programSortFlowsByRecent, type ProgramFlowCardLines } from './program-discovery-display';

/**
 * 첫인상 (11/7, UX audit): an empty account's first screen also shows a few Flows FlowMe put together, each opening
 * its usual detail (where importing happens). Only for an account with no document at all; only Flows the official
 * list marks as FlowMe's (the same mark Flow 찾기 shows); none archived or on hold. When the official list could not
 * be read there is no mark, so no card: the screen stays as it was. Pure: nothing is stored or saved here.
 */
export const PROGRAM_FIRST_FLOWS_LIMIT = 3;
export type ProgramFirstFlow = { flowId: string; lines: ProgramFlowCardLines };
export function programFirstOfficialFlows(data: ProgramData, actorId: string, officialActors: readonly string[], limit = PROGRAM_FIRST_FLOWS_LIMIT): ProgramFirstFlow[] {
  const space = data.spaces[actorId];
  if (!space || space.text.documents.length || space.text.flows.length || !officialActors.length) return [];
  const rows = data.public.flows.flatMap(flow => {
    if (flow.archived || isPublicCatalogFlowOnHold(flow.id)) return [];
    const version = data.public.versions.find(row => row.id === flow.currentVersionId);
    return version && programFlowAttributionLabel(flow, version, officialActors, data) === 'FlowMe가 정리한 자료' ? [{ flow, version }] : [];
  });
  return programSortFlowsByRecent(rows).slice(0, limit).map(({ flow, version }) => ({ flowId: flow.id,
    lines: programFlowCardLines(flow, version, { needsReview: !!programCatalogMetadata(version.id)?.sourceNeedsReview, inMyDocuments: false }) }));
}
