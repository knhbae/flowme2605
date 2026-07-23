import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const gold = JSON.parse(fs.readFileSync(path.join(here, 'gold-source-contract-v1.json'), 'utf8'));
const goldById = new Map(gold.cases.map((entry) => [entry.caseId, entry.gold]));
const files = {
  rules: path.join(here, 'runs/rules/calibration-v1.json'),
  low_cost: path.join(here, 'runs/low-cost/calibration-v1.json'),
  high_capability: path.join(here, 'runs/high-capability/calibration-v1.json'),
};

const percent = (value) => `${(value * 100).toFixed(1)}%`;
for (const [role, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    console.log(`${role}: pending`);
    continue;
  }
  const runs = JSON.parse(fs.readFileSync(file, 'utf8')).runs;
  const scored = runs.map((run) => {
    const expected = goldById.get(run.caseId);
    const gateKeys = ['access', 'rights', 'freshness', 'locale', 'safety', 'privacy', 'publicExportAllowed', 'personalPreviewAllowed'];
    return {
      caseId: run.caseId,
      flow: run.feasibility.flowPossible === expected.flowPossible,
      state: run.feasibility.state === expected.state,
      artifact: run.classification.primaryArtifact === expected.naturalArtifact,
      boundary: expected.admissionLabel !== 'boundary' || run.feasibility.flowPossible === false,
      gates: gateKeys.every((key) => run.gates[key] === expected.gates[key]),
      actual: `${run.feasibility.state}/${run.classification.primaryArtifact}`,
      expected: `${expected.state}/${expected.naturalArtifact}`,
    };
  });
  const rate = (key) => scored.filter((entry) => entry[key]).length / scored.length;
  const boundary = scored.filter((entry) => goldById.get(entry.caseId).admissionLabel === 'boundary');
  console.log(`\n${role}: flow ${percent(rate('flow'))}, artifact ${percent(rate('artifact'))}, state ${percent(rate('state'))}, gate exact ${percent(rate('gates'))}, boundary recall ${percent(boundary.filter((entry) => entry.boundary).length / boundary.length)}`);
  for (const entry of scored.filter((value) => !value.flow || !value.artifact || !value.state || !value.gates)) {
    console.log(`  ${entry.caseId} actual=${entry.actual} expected=${entry.expected} gates=${entry.gates ? 'match' : 'diff'}`);
  }
}
