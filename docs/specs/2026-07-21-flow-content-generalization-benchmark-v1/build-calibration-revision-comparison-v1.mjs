import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const gold = JSON.parse(fs.readFileSync(path.join(here, 'gold-source-contract-v1.json'), 'utf8'));
const goldById = new Map(gold.cases.map((entry) => [entry.caseId, entry.gold]));
const roles = {
  rules: ['calibration-baseline/rules-v1.json', 'runs/rules/calibration-v1.json'],
  low_cost: ['calibration-baseline/low-cost-v1.json', 'runs/low-cost/calibration-v1.json'],
  high_capability: ['calibration-baseline/high-capability-v1.json', 'runs/high-capability/calibration-v1.json'],
};

const ratio = (count, total) => Number((count / total).toFixed(6));
function score(file) {
  const runs = JSON.parse(fs.readFileSync(path.join(here, file), 'utf8')).runs;
  const positives = runs.filter((run) => goldById.get(run.caseId).admissionLabel === 'positive');
  const boundaries = runs.filter((run) => goldById.get(run.caseId).admissionLabel === 'boundary');
  const exact = (list, test) => ratio(list.filter(test).length, list.length);
  return {
    caseCount: runs.length,
    positiveCount: positives.length,
    boundaryCount: boundaries.length,
    flowPossibilityAccuracy: exact(runs, (run) => run.feasibility.flowPossible === goldById.get(run.caseId).flowPossible),
    boundaryRecall: exact(boundaries, (run) => run.feasibility.flowPossible === false && ['source_import_required', 'hold', 'blocked'].includes(run.feasibility.state)),
    positivePrimaryArtifactAccuracy: exact(positives, (run) => run.classification.primaryArtifact === goldById.get(run.caseId).naturalArtifact),
    stateAccuracy: exact(runs, (run) => run.feasibility.state === goldById.get(run.caseId).state),
    requiredInputBudgetPass: exact(positives, (run) => run.minimumInputs.filter((input) => input.owner === 'user' && input.requiredBeforeFirstPreview).length <= 2),
    inventedActionClaims: runs.reduce((sum, run) => sum + run.selfReview.potentialInventions.length, 0),
    unscheduledIcsViolations: runs.reduce((sum, run) => sum + run.selfReview.unscheduledIcsViolationCount, 0),
    sourceValueReentryCount: runs.reduce((sum, run) => sum + run.selfReview.sourceValueReentryCount, 0),
    itemCount: runs.reduce((sum, run) => sum + run.canonical.items.length, 0),
  };
}

const comparisons = Object.entries(roles).map(([role, [beforeFile, afterFile]]) => {
  const before = score(beforeFile);
  const after = score(afterFile);
  return {
    role,
    beforeFile,
    afterFile,
    before,
    after,
    primaryArtifactAccuracyDelta: Number((after.positivePrimaryArtifactAccuracy - before.positivePrimaryArtifactAccuracy).toFixed(6)),
  };
});

const output = {
  schemaVersion: 'flow-content-calibration-revision-comparison-v1',
  generatedAt: new Date().toISOString(),
  evidenceBoundary: 'Internal agent and rules QA; not observed-user validation. Invention claims are diagnostic until final adjudication.',
  baselineRulesHash: 'a17c13f858ff7e3c635235f5e681578b7e72e4604923dda21b5eb794e180c56d',
  revisedRulesHash: 'dbc4770bfd028024ec31cfb888e4e77831af5bc0632a00309fec3b20c63ed3be',
  revisionClass: 'Retained-state and user-anchor decision order; no URL, provider, topic, or case-specific exceptions.',
  comparisons,
  goDecision: comparisons.every((entry) => entry.after.flowPossibilityAccuracy >= 0.85 && entry.after.positivePrimaryArtifactAccuracy >= 0.85 && entry.after.boundaryRecall === 1),
};

fs.writeFileSync(path.join(here, 'calibration-revision-comparison-v1.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`wrote calibration comparison; go=${output.goDecision}`);
