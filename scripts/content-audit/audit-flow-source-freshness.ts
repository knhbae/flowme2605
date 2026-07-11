import { mergeSourceBackedMyFlowBundles } from '../../lib/flow/source-backed-my-flow';
import { summarizeFlowSourceFreshness } from '../../lib/flow/source-freshness';
import { cloneSeedBundles } from '../../lib/flow/storage';

const summary = summarizeFlowSourceFreshness(
  mergeSourceBackedMyFlowBundles(cloneSeedBundles()),
  new Date(),
);

console.log(JSON.stringify(summary, null, 2));

if (
  summary.missingMetadataCount > 0 ||
  summary.reviewDueCount > 0 ||
  summary.staleCount > 0
) {
  process.exitCode = 1;
}
