import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const modelPath = path.join(
  repoRoot,
  'docs/specs/2026-07-12-url-to-flow-backend-readiness/cost-model-v1.json',
);
const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const expectedScenarioIds = ['pilot', 'launch', 'scale'];

assert(model.schemaVersion === 'flowme-url-to-flow-cost-model-v1', 'Unexpected cost schemaVersion');
assert(model.currency === 'KRW', 'Cost model currency must be KRW');
assert(
  model.formula.fullyLoadedCostPerRequestKrw === 'monthlyCostKrw / max(1, monthlyRequests)',
  'Fully loaded request cost formula is missing or changed',
);
assert(
  model.latencyMetric.scenarioValueStatus.includes('planning assumption'),
  'p95 scenario values must be labeled as assumptions',
);
assert(
  JSON.stringify(model.scenarios.map((scenario) => scenario.id)) === JSON.stringify(expectedScenarioIds),
  'Expected pilot, launch, and scale scenarios',
);

const calculate = (scenario) => {
  const input = { ...model.editableInputs, ...scenario };
  const llmCost =
    ((input.inputTokens / 1_000_000) * input.inputUsdPerMillion +
      (input.outputTokens / 1_000_000) * input.outputUsdPerMillion) *
    input.usdKrw;
  const missCost =
    input.fetchExtractCostKrw +
    input.llmCallRate * llmCost +
    input.validateStoreCostKrw +
    input.retryRate * input.retryAttemptCostKrw;
  const reviewCost =
    input.humanReviewRate * input.reviewMinutes * (input.reviewerHourlyKrw / 60);
  const variableCostPerIntake =
    input.lookupCostKrw + (1 - input.cacheHitRate) * missCost + reviewCost;
  const monthlyCost =
    input.monthlyRequests * variableCostPerIntake + input.fixedMonthlyCostKrw;
  return {
    id: scenario.id,
    monthlyCostKrw: monthlyCost,
    variableCostPerIntakeKrw: variableCostPerIntake,
    fullyLoadedCostPerRequestKrw: monthlyCost / Math.max(1, input.monthlyRequests),
    costPerSavedFlowKrw:
      monthlyCost / Math.max(1, input.monthlyRequests * input.saveRate),
    costPerFirstCompletedItemKrw:
      monthlyCost /
      Math.max(1, input.monthlyRequests * input.saveRate * input.firstCompletionRate),
    llmCalls: input.monthlyRequests * (1 - input.cacheHitRate) * input.llmCallRate,
    p95LatencySeconds: input.p95LatencySeconds,
  };
};

const results = model.scenarios.map(calculate);
const expectedRoundedMonthly = {
  pilot: 76896,
  launch: 287281,
  scale: 1452392,
};
for (const result of results) {
  assert(
    Math.round(result.monthlyCostKrw) === expectedRoundedMonthly[result.id],
    `${result.id}: monthly cost drifted to ${result.monthlyCostKrw}`,
  );
  for (const [key, value] of Object.entries(result)) {
    if (key === 'id') continue;
    assert(Number.isFinite(value) && value >= 0, `${result.id}: invalid ${key}`);
  }
}

const thresholdValues = Object.values(model.ownerDecisionThresholds);
assert(thresholdValues.every((value) => value === null), 'Planning package expects unresolved owner thresholds');
assert(
  model.goNoGoRule.includes('NO-GO') && model.goNoGoRule.includes('null'),
  'Null owner thresholds must keep the real provider at NO-GO',
);

console.log(
  `PASS ${path.basename(modelPath)}: ${results
    .map(
      (result) =>
        `${result.id} monthly=${Math.round(result.monthlyCostKrw)} ` +
        `fullyLoaded/request=${result.fullyLoadedCostPerRequestKrw.toFixed(1)} ` +
        `savedFlow=${result.costPerSavedFlowKrw.toFixed(1)} ` +
        `firstCompletion=${result.costPerFirstCompletedItemKrw.toFixed(1)} ` +
        `p95-assumption=${result.p95LatencySeconds}s`,
    )
    .join('; ')}; owner thresholds unresolved => real provider NO-GO.`,
);
