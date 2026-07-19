import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const specDir = path.join(
  root,
  'docs',
  'specs',
  '2026-07-14-url-to-flow-prompt-lab',
);
const requestedVersion = process.argv[2] ?? 'v0.1';
if (!/^v\d+\.\d+$/.test(requestedVersion)) {
  throw new Error('Version must look like v0.1 or v0.2.');
}
const promptVersion = `url-to-flow-prompt-${requestedVersion}`;
const outputDir = path.join(
  root,
  'docs',
  'content-audit',
  '2026-07-14-url-to-flow-prompt-lab',
  'packets',
  requestedVersion,
);

const prompt = fs.readFileSync(
  path.join(specDir, `prompt-${requestedVersion}.md`),
  'utf8',
);
const cases = JSON.parse(
  fs.readFileSync(path.join(specDir, 'cases-v1.json'), 'utf8'),
);
const marker = '{{CASE_INPUT_JSON}}';
if (!prompt.includes(marker)) {
  throw new Error(`Prompt is missing ${marker}.`);
}

fs.mkdirSync(outputDir, { recursive: true });

const manifest = {
  packetSetVersion: `flowme-url-to-flow-prompt-lab-packets-${requestedVersion}`,
  promptVersion,
  caseSetVersion: cases.caseSetVersion,
  proposalSchemaVersion: 'flowme-semantic-proposal-v1',
  generator: 'scripts/content-audit/build-url-to-flow-prompt-lab-packets.mjs',
  disclosure:
    'Each packet contains one source-only case. expected-v1.json and canonical answers are intentionally excluded.',
  packets: [],
};

for (const caseInput of cases.cases) {
  const fileName = `${caseInput.caseId}.md`;
  const rendered = prompt.replace(marker, JSON.stringify(caseInput, null, 2));
  fs.writeFileSync(path.join(outputDir, fileName), rendered, 'utf8');
  manifest.packets.push({
    caseId: caseInput.caseId,
    requestId: caseInput.requestId,
    file: fileName,
    sourceRowCount: caseInput.sourceRows.length,
    sourceAccess: caseInput.source.primary.accessStatus,
    riskLevel: caseInput.source.primary.riskLevel,
  });
}

fs.writeFileSync(
  path.join(outputDir, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

console.log(`Wrote ${manifest.packets.length} isolated prompt packets.`);
