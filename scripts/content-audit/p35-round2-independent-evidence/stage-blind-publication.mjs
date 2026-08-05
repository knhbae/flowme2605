import { createHash } from 'node:crypto';
import { copyFile, cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..');
const stamp = new Date().toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}Z$/u, 'Z');
const evidenceRoot = path.resolve(
  repoRoot,
  process.env.FLOWME_P35_R2_REVIEW_EVIDENCE_DIR
    ?? path.join('output', 'playwright', 'p35-round2-review-rehearsal'),
);
const stageRoot = path.resolve(
  repoRoot,
  process.env.FLOWME_P35_R2_BLIND_STAGE_DIR
    ?? path.join('output', 'p35-round2-publication', `blind-${stamp}`),
);
const blindSource = path.join(
  repoRoot,
  'docs',
  'content-audit',
  '2026-08-05-p35-round2-final-independent-review-handoff',
  'blind-release',
);

async function assertEmptyOrMissing(directory) {
  const existing = await readdir(directory).catch(() => []);
  if (existing.length > 0) {
    throw new Error(`Refusing to overwrite non-empty blind stage: ${directory}`);
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    if (entry.isFile()) files.push(absolute);
  }
  return files;
}

const masterManifestBuffer = await readFile(path.join(evidenceRoot, 'master-manifest.json'));
const masterManifest = JSON.parse(masterManifestBuffer.toString('utf8'));
const masterManifestSha256 = createHash('sha256')
  .update(masterManifestBuffer)
  .digest('hex')
  .toUpperCase();
if (masterManifest.productCandidateSha === 'TBD' || masterManifest.workingTreeDirty) {
  throw new Error('Blind publication requires a clean candidate-bound capture.');
}
if (masterManifest.summary?.scenarioCount !== 23) {
  throw new Error('Blind publication requires all S01-S23 manifest rows.');
}
if (
  masterManifest.manifestIntegrity?.unmanifestedScenarioFileCount !== 0
  || masterManifest.manifestIntegrity?.missingManifestFileCount !== 0
  || masterManifest.manifestIntegrity?.hashOrByteFailureCount !== 0
) {
  throw new Error('Blind publication requires an exact, hash-valid group-manifest allowlist.');
}
if (
  !Array.isArray(masterManifest.groupHealth)
  || masterManifest.groupHealth.some((group) => group.status !== 'PASS')
) {
  throw new Error('Blind publication requires every evidence collector group to pass.');
}
if (
  masterManifest.groupIdentityFailures?.length !== 0
  || !masterManifest.candidateProvenance?.candidateEligible
  || masterManifest.candidateProvenance?.product?.sha !== masterManifest.productCandidateSha
  || masterManifest.candidateProvenance?.runtime?.buildId !== masterManifest.buildId
) {
  throw new Error('Blind publication requires matching clean candidate provenance and group epochs.');
}
if (!Array.isArray(masterManifest.candidateArtifacts) || masterManifest.candidateArtifacts.length === 0) {
  throw new Error('Blind publication requires candidate chain-of-custody artifacts.');
}
const galleryVerification = JSON.parse(
  await readFile(path.join(evidenceRoot, 'gallery-verification.json'), 'utf8'),
);
if (
  galleryVerification.scenarioCount !== 23
  || galleryVerification.masterManifestByteLength !== masterManifestBuffer.length
  || galleryVerification.masterManifestSha256 !== masterManifestSha256
  || galleryVerification.hashFailureCount !== 0
  || galleryVerification.localLinkFailureCount !== 0
  || galleryVerification.horizontalOverflowCount !== 0
  || galleryVerification.brokenImageCount !== 0
  || galleryVerification.replacementCharacterCount !== 0
  || galleryVerification.consoleAndPageErrorCount !== 0
) {
  throw new Error('Blind publication requires a passing gallery/hash verification record.');
}

async function copyEvidenceFile(relativePath) {
  const source = path.resolve(evidenceRoot, ...relativePath.split('/'));
  const relativeToRoot = path.relative(evidenceRoot, source);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error(`Refusing evidence path outside root: ${relativePath}`);
  }
  const destination = path.join(stageRoot, 'evidence', ...relativePath.split('/'));
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

await assertEmptyOrMissing(stageRoot);
await mkdir(stageRoot, { recursive: true });
await cp(blindSource, path.join(stageRoot, 'review'), { recursive: true });
const evidencePaths = new Set([
  'master-manifest.json',
  'gallery-verification.json',
  ...masterManifest.groupManifests.map((manifest) => manifest.file),
  ...masterManifest.candidateArtifacts.map((artifact) => artifact.relativePath),
  ...masterManifest.scenarios.flatMap((scenario) => (
    scenario.files.map((file) => file.relativePath)
  )),
]);
for (const relativePath of [...evidencePaths].sort()) await copyEvidenceFile(relativePath);

const forbidden = [
  'informed-release',
  '01-latest-feedback-verbatim-sealed-ko.md',
  '04-feedback-root-question-map-ko.md',
  '06-prior-claude-archive-manifest-ko.md',
  'Claude 디자인 1차 검토_260801_1203.zip',
  '사용자 피드백',
  'F-05',
  '019fac25-34bc-7ea1-9533-376776fac3c0',
  'D:\\flowme2605',
  'C:\\Users\\HUBERT',
];
for (const sensitiveRoot of [repoRoot, path.dirname(repoRoot), os.homedir()]) {
  forbidden.push(sensitiveRoot.replaceAll('/', '\\'));
  forbidden.push(sensitiveRoot.replaceAll('\\', '/'));
}

function absolutePathTokens(source) {
  return [
    ...(source.match(/(?<![A-Za-z0-9])[A-Za-z]:[\\/][^\s"'<>|,;)\]}]+/gu) ?? []),
    ...(source.match(/\\\\[A-Za-z0-9._-]+[\\/][^\s"'<>|,;)\]}]+/gu) ?? []),
    ...(source.match(/(?<!:)\/\/[A-Za-z0-9._-]+\/[^\s"'<>|,;)\]}]+/gu) ?? []),
    ...(source.match(/\bfile:\/\/\/?[^\s"'<>|,;)\]}]+/giu) ?? []),
  ];
}

function isAllowedSyntheticPath(relative, token) {
  if (!relative.startsWith('evidence/S18/')) return false;
  const normalized = token.replaceAll('/', '\\').replace(/\\{2,}/gu, '\\');
  return normalized.toLowerCase() === 'c:\\temp\\flow';
}

const contamination = [];
for (const file of await walk(stageRoot)) {
  const relative = path.relative(stageRoot, file).split(path.sep).join('/');
  for (const term of forbidden) {
    if (relative.toLowerCase().includes(term.toLowerCase())) {
      contamination.push({ relative, term, location: 'path' });
    }
  }
  if (/\.zip$/iu.test(file)) {
    contamination.push({ relative, term: 'unexpected ZIP', location: 'path' });
    continue;
  }
  if (/\.(?:png|ico|woff2?)$/iu.test(file)) continue;
  const source = await readFile(file, 'utf8');
  for (const term of forbidden) {
    if (source.toLowerCase().includes(term.toLowerCase())) {
      contamination.push({ relative, term, location: 'content' });
    }
  }
  for (const token of absolutePathTokens(source)) {
    if (!isAllowedSyntheticPath(relative, token)) {
      contamination.push({ relative, term: token, location: 'absolute_path' });
    }
  }
}
if (contamination.length > 0) {
  throw new Error(`Blind contamination detected: ${JSON.stringify(contamination)}`);
}

const stageFiles = await walk(stageRoot);
const stageRecord = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  release: 'PASS1_BLIND_ONLY',
  state: 'STAGED_ASSETS_NOT_COMMITTED',
  productCandidateSha: masterManifest.productCandidateSha,
  buildId: masterManifest.buildId,
  observedUsers: 0,
  performance: 'NOT_ASSESSED',
  actualBrowserZoom200: 'NOT_ASSESSED',
  fileCountBeforeRecord: stageFiles.length,
  stagedEvidencePathCount: evidencePaths.size,
  contaminationCount: contamination.length,
  nextStep:
    'Commit this blind-only tree as asset commit A, then run finalize-blind-index.mjs with A SHA.',
};
await writeFile(
  path.join(stageRoot, 'stage-record.json'),
  `${JSON.stringify(stageRecord, null, 2)}\n`,
  'utf8',
);
await writeFile(
  path.join(stageRoot, 'README.md'),
  `# P35 Round 2 Pass 1 blind publication\n\n` +
    `- state: \`STAGED_ASSETS_NOT_COMMITTED\`\n` +
    `- product candidate: \`${masterManifest.productCandidateSha}\`\n` +
    `- build ID: \`${masterManifest.buildId}\`\n` +
    `- observed users: \`0\`\n\n` +
    `아직 reviewer에게 전달하지 않는다. asset commit SHA를 만든 뒤 index를 확정해야 한다.\n`,
  'utf8',
);
await writeFile(
  path.join(stageRoot, 'vercel.json'),
  `${JSON.stringify({ git: { deploymentEnabled: false } }, null, 2)}\n`,
  'utf8',
);
await writeFile(
  path.join(stageRoot, '.gitattributes'),
  '* -text\n',
  'utf8',
);

console.log(JSON.stringify(stageRecord, null, 2));
