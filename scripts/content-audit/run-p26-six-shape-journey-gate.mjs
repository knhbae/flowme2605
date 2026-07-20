import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const packageRoot = path.join(
  repoRoot,
  'docs',
  'content-audit',
  '2026-07-20-p26-19-six-shape-journey-gate',
);
const captureRoot = path.join(packageRoot, '.capture');
const screenshotsRoot = path.join(packageRoot, 'screenshots');
const downloadsRoot = path.join(packageRoot, 'downloads');

const journeys = [
  {
    id: '01-anchor-inverse-timeline',
    label: 'Anchor inverse timeline',
    tests: [
      'mobile keeps the complete saved Flow visible',
      'wide selected Flow uses the same whole-Flow outline contract',
    ],
    captures: [{ env: 'FLOWME_P25_WHOLE_FLOW_EVIDENCE_DIR', folder: 'main' }],
  },
  {
    id: '02-undated-checklist',
    label: 'Undated checklist',
    tests: ['undated public Flow supports atomic one and many scheduling'],
    captures: [{ env: 'FLOWME_P26_14_EVIDENCE_DIR', folder: 'main' }],
  },
  {
    id: '03-recurring-routine',
    label: 'Recurring routine',
    tests: ['monthly maintenance routine keeps preview'],
    captures: [{ env: 'FLOWME_P26_03_EVIDENCE_DIR', folder: 'main' }],
  },
  {
    id: '04-mixed-sequence-date',
    label: 'Mixed sequence and date',
    tests: ['whole Flow batch mode moves'],
    captures: [{ env: 'FLOWME_P25_BATCH_ADJUSTMENT_EVIDENCE_DIR', folder: 'main' }],
  },
  {
    id: '05-record-memo',
    label: 'Record and memo',
    tests: ['memo intake preserves source fragments'],
    captures: [{ env: 'FLOWME_P26_04_EVIDENCE_DIR', folder: 'main' }],
  },
  {
    id: '06-personal-draft',
    label: 'Personal URL miss draft',
    tests: ['personal draft recurrence expands into Calendar occurrences'],
    captures: [
      { env: 'FLOWME_P23_02C2B_EVIDENCE_DIR', folder: 'occurrence' },
      { env: 'FLOWME_P23_02C2C_EVIDENCE_DIR', folder: 'ics' },
      { env: 'FLOWME_P23_03_EVIDENCE_DIR', folder: 'execution' },
      { env: 'FLOWME_P26_12_EVIDENCE_DIR', folder: 'completion' },
    ],
  },
];

const testFiles = [
  'tests/e2e/p25-whole-flow-workspace.spec.ts',
  'tests/e2e/p26-undated-batch-scheduling.spec.ts',
  'tests/e2e/flow-mvp.spec.ts',
  'tests/e2e/p24-execution-trust.spec.ts',
  'tests/e2e/p26-memo-segmentation.spec.ts',
  'tests/e2e/url-first-user-surface.spec.ts',
];

function listFiles(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(root, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

function copyEvidence(journey) {
  const copied = { screenshots: [], downloads: [] };
  for (const capture of journey.captures) {
    const root = path.join(captureRoot, journey.id, capture.folder);
    for (const file of listFiles(root)) {
      const parts = file.split(path.sep);
      const screenshotIndex = parts.lastIndexOf('screenshots');
      const downloadIndex = parts.lastIndexOf('downloads');
      const kind = screenshotIndex >= 0 ? 'screenshots' : downloadIndex >= 0 ? 'downloads' : null;
      if (!kind) continue;
      const destinationRoot = kind === 'screenshots' ? screenshotsRoot : downloadsRoot;
      const prefix = journey.captures.length > 1 ? `${capture.folder}-` : '';
      const destination = path.join(destinationRoot, journey.id, `${prefix}${path.basename(file)}`);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(file, destination);
      copied[kind].push(path.relative(packageRoot, destination).replaceAll(path.sep, '/'));
    }
  }
  copied.screenshots.sort();
  copied.downloads.sort();
  return copied;
}

function quoteCmd(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

fs.rmSync(captureRoot, { recursive: true, force: true });
fs.rmSync(screenshotsRoot, { recursive: true, force: true });
fs.rmSync(downloadsRoot, { recursive: true, force: true });
fs.mkdirSync(captureRoot, { recursive: true });

const env = { ...process.env };
for (const journey of journeys) {
  for (const capture of journey.captures) {
    const destination = path.join(captureRoot, journey.id, capture.folder);
    fs.mkdirSync(destination, { recursive: true });
    env[capture.env] = destination;
  }
}

const grep = journeys.flatMap((journey) => journey.tests).join('|');
const args = [
  'test',
  ...testFiles,
  '--grep',
  grep,
  '--workers=1',
  '--reporter=line',
];
const startedAt = new Date().toISOString();
const playwrightCli = path.join(repoRoot, 'node_modules', '@playwright', 'test', 'cli.js');
const result = spawnSync(process.execPath, [playwrightCli, ...args], {
  cwd: repoRoot,
  env,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
const finishedAt = new Date().toISOString();

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

const copiedByJourney = Object.fromEntries(
  journeys.map((journey) => [journey.id, copyEvidence(journey)]),
);
const combinedOutput = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
const passedMatch = combinedOutput.match(/(\d+) passed/u);
const failedMatch = combinedOutput.match(/(\d+) failed/u);
const skippedMatch = combinedOutput.match(/(\d+) skipped/u);
const head = spawnSync('git', ['rev-parse', 'HEAD'], {
  cwd: repoRoot,
  encoding: 'utf8',
}).stdout?.trim() ?? '';

fs.mkdirSync(packageRoot, { recursive: true });
fs.writeFileSync(
  path.join(packageRoot, 'journey-command-results.json'),
  `${JSON.stringify({
    generatedAt: finishedAt,
    startedAt,
    finishedAt,
    head,
    command: `npx playwright test ${testFiles.join(' ')} --grep ${quoteCmd(grep)} --workers=1 --reporter=line`,
    exitCode: result.status ?? 1,
    passed: Number(passedMatch?.[1] ?? 0),
    failed: Number(failedMatch?.[1] ?? (result.status === 0 ? 0 : 1)),
    skipped: Number(skippedMatch?.[1] ?? 0),
    observedUserSessionCount: 0,
    evidenceKinds: ['current_command', 'current_browser'],
    journeys: journeys.map((journey) => ({
      id: journey.id,
      label: journey.label,
      tests: journey.tests,
      ...copiedByJourney[journey.id],
    })),
  }, null, 2)}\n`,
  'utf8',
);

fs.rmSync(captureRoot, { recursive: true, force: true });
process.exitCode = result.status ?? 1;
