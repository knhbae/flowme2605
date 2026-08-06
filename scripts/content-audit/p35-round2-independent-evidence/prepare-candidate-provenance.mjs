import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..');
const outputRoot = path.resolve(
  repoRoot,
  process.env.FLOWME_P35_R2_REVIEW_EVIDENCE_DIR
    ?? path.join('output', 'playwright', 'p35-round2-review-rehearsal'),
);
const candidateRoot = path.join(outputRoot, 'candidate');
const baseUrl = (process.env.FLOWME_EVIDENCE_BASE_URL ?? 'http://127.0.0.1:3114')
  .replace(/\/$/u, '');
const buildLogInput = process.env.FLOWME_P35_R2_BUILD_LOG?.trim() || null;
const buildCommand = process.env.FLOWME_P35_R2_BUILD_COMMAND?.trim() || null;
const buildExitRaw = process.env.FLOWME_P35_R2_BUILD_EXIT_CODE?.trim() || null;
const captureCommand = process.env.FLOWME_P35_R2_CAPTURE_COMMAND?.trim()
  || 'node scripts/content-audit/p35-round2-independent-evidence/capture-all.mjs';

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function mimeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return ({
    '.json': 'application/json; charset=utf-8',
    '.log': 'text/plain; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
  })[extension] ?? 'application/octet-stream';
}

function relativeToOutput(filePath) {
  return path.relative(outputRoot, filePath).split(path.sep).join('/');
}

function gitRaw(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args.join(' ')} failed: ${(result.stderr || '').trim()}`);
  }
  return result.status === 0 ? result.stdout : null;
}

function gitTrimmed(args, options) {
  return gitRaw(args, options)?.trim() || null;
}

function kstNow() {
  const shifted = new Date(Date.now() + (9 * 60 * 60 * 1000));
  return shifted.toISOString().replace(/Z$/u, '+09:00');
}

function parseTime(value) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function descriptor(filePath, role) {
  const buffer = await readFile(filePath);
  return {
    role,
    relativePath: relativeToOutput(filePath),
    byteLength: buffer.length,
    sha256: sha256(buffer),
    mime: mimeFor(filePath),
  };
}

function normalizeGroupIdentity(name, data) {
  const head = data.git?.head
    ?? data.product?.head
    ?? data.sourceSnapshot?.head
    ?? data.headSha
    ?? data.productCandidateSha
    ?? null;
  const dirty = data.git?.dirty
    ?? data.product?.gitDirty
    ?? data.sourceSnapshot?.dirty
    ?? data.workingTreeDirty
    ?? null;
  const buildId = data.buildId
    ?? data.product?.buildId
    ?? data.sourceSnapshot?.buildId
    ?? null;
  const manifestBaseUrl = data.baseUrl
    ?? data.product?.baseUrl
    ?? data.serverProbe?.url?.replace(/\/flows\/?$/u, '')
    ?? null;
  const startedAt = data.capturedAt
    ?? data.startedAtKst
    ?? data.generatedAt
    ?? null;
  const completedAt = data.capturedAt
    ?? data.completedAtKst
    ?? data.generatedAt
    ?? null;
  const browser = data.browser
    ? `${data.browser.engine ?? 'Chromium'} ${data.browser.version ?? ''}`.trim()
    : data.runtime?.browser ?? null;
  return {
    manifest: name,
    head,
    dirty,
    buildId,
    baseUrl: manifestBaseUrl,
    startedAt,
    completedAt,
    browser,
    os: data.runtime?.os ?? null,
    locale: data.browser?.locale ?? data.runtime?.locale ?? null,
    timezone: data.browser?.timezoneId ?? data.runtime?.timezone ?? null,
  };
}

await mkdir(candidateRoot, { recursive: true });

const statusRaw = gitRaw(['status', '--short', '--branch']);
const statusLines = statusRaw.split(/\r?\n/u).filter(Boolean);
const dirtyLines = statusLines.filter((line) => !line.startsWith('## '));
const workingTreeDirty = dirtyLines.length > 0;
const head = gitTrimmed(['rev-parse', 'HEAD']);
const tree = gitTrimmed(['rev-parse', 'HEAD^{tree}']);
const ref = gitTrimmed(['symbolic-ref', '--short', 'HEAD'], { allowFailure: true })
  ?? `DETACHED@${head}`;
const upstreamRef = gitTrimmed(
  ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'],
  { allowFailure: true },
);
const upstreamSha = upstreamRef
  ? gitTrimmed(['rev-parse', '@{upstream}'], { allowFailure: true })
  : null;
const buildId = await readFile(path.join(repoRoot, '.next', 'BUILD_ID'), 'utf8')
  .then((value) => value.trim())
  .catch(() => null);

const statusPath = path.join(candidateRoot, 'git-status-short-branch.txt');
await writeFile(statusPath, statusRaw, 'utf8');

const groupManifestNames = (await readdir(outputRoot).catch(() => []))
  .filter((name) => /^group-manifest-s\d{2}-s\d{2}\.json$/u.test(name))
  .sort();
const groupManifests = [];
for (const name of groupManifestNames) {
  const absolute = path.join(outputRoot, name);
  const raw = await readFile(absolute);
  const data = JSON.parse(raw.toString('utf8'));
  groupManifests.push({
    ...normalizeGroupIdentity(name, data),
    relativePath: relativeToOutput(absolute),
    byteLength: raw.length,
    sha256: sha256(raw),
  });
}

const collectorScripts = [
  'capture-s01-s08.mjs',
  'capture-s09-s16.mjs',
  'capture-s17-s23.mjs',
];
const collectorDescriptors = [];
for (const name of collectorScripts) {
  const absolute = path.join(scriptDir, name);
  const buffer = await readFile(absolute);
  collectorDescriptors.push({
    name,
    repoRelativePath: path.relative(repoRoot, absolute).split(path.sep).join('/'),
    byteLength: buffer.length,
    sha256: sha256(buffer),
  });
}

const captureTimes = groupManifests.flatMap((manifest) => [
  parseTime(manifest.startedAt),
  parseTime(manifest.completedAt),
]).filter((value) => value !== null);
const captureStartedAt = captureTimes.length > 0
  ? new Date(Math.min(...captureTimes)).toISOString()
  : null;
const captureCompletedAt = captureTimes.length > 0
  ? new Date(Math.max(...captureTimes)).toISOString()
  : null;
const captureTimestampFailures = [];
for (const manifest of groupManifests) {
  const startedAt = parseTime(manifest.startedAt);
  const completedAt = parseTime(manifest.completedAt);
  if (startedAt === null || completedAt === null) {
    captureTimestampFailures.push(`${manifest.manifest}: missing or invalid capture timestamp`);
  } else if (startedAt > completedAt) {
    captureTimestampFailures.push(`${manifest.manifest}: capture start is after completion`);
  }
}

const seedContractPath = path.join(candidateRoot, 'seed-reset-contract.json');
const seedResetContract = {
  schemaVersion: 1,
  contract: 'P35_ROUND2_INDEPENDENT_EVIDENCE_SEED_RESET',
  captureCommand,
  result: groupManifests.length === 3
    ? 'THREE_GROUP_MANIFESTS_CAPTURED'
    : 'GROUP_MANIFEST_COUNT_MISMATCH',
  groupManifestCount: groupManifests.length,
  baseUrl,
  isolation: {
    browser: 'Each scenario/variant collector owns an isolated Playwright BrowserContext.',
    storage: 'Collectors explicitly clear or seed localStorage/sessionStorage at their declared start state.',
    network: 'Runtime is the candidate BUILD_ID served at FLOWME_EVIDENCE_BASE_URL.',
    mutationBoundary: 'Evidence-only failure injections are labeled in state JSON and never mutate product source.',
  },
  collectors: collectorDescriptors,
  groupManifests: groupManifests.map(({ manifest, sha256: hash, byteLength }) => ({
    manifest,
    sha256: hash,
    byteLength,
  })),
};
await writeJson(seedContractPath, seedResetContract);

const groupIndexPath = path.join(candidateRoot, 'group-manifest-index.json');
await writeJson(groupIndexPath, {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  expectedGroups: ['S01-S08', 'S09-S16', 'S17-S23'],
  manifests: groupManifests,
  captureStartedAt,
  captureCompletedAt,
});

const buildLogPath = path.join(candidateRoot, 'build.log');
let buildLogSourceProvided = false;
let buildLogSourcePath = null;
if (buildLogInput) {
  buildLogSourcePath = path.resolve(repoRoot, buildLogInput);
  await stat(buildLogSourcePath);
  await copyFile(buildLogSourcePath, buildLogPath);
  buildLogSourceProvided = true;
} else {
  await writeFile(
    buildLogPath,
    'BUILD_LOG_NOT_PROVIDED_FOR_LOCAL_REHEARSAL\n',
    'utf8',
  );
}
const buildExitCode = buildExitRaw !== null && /^-?\d+$/u.test(buildExitRaw)
  ? Number.parseInt(buildExitRaw, 10)
  : null;
const buildLogBuffer = await readFile(buildLogPath);
let buildLogEncoding = {
  declared: 'utf-8',
  valid: false,
  containsNul: false,
  containsReplacementCharacter: false,
  error: null,
};
try {
  const decodedBuildLog = new TextDecoder('utf-8', { fatal: true }).decode(buildLogBuffer);
  buildLogEncoding = {
    declared: 'utf-8',
    valid: !decodedBuildLog.includes('\u0000') && !decodedBuildLog.includes('\uFFFD'),
    containsNul: decodedBuildLog.includes('\u0000'),
    containsReplacementCharacter: decodedBuildLog.includes('\uFFFD'),
    error: null,
  };
} catch (error) {
  buildLogEncoding.error = error.message;
}
let buildStatus = 'PASS';
if (!buildLogSourceProvided) buildStatus = 'MISSING_ALLOWED_DIRTY_REHEARSAL';
else if (!buildLogEncoding.valid) buildStatus = 'INVALID_UTF8_BUILD_LOG';
else if (!buildCommand || buildExitCode === null) {
  buildStatus = 'INCOMPLETE_METADATA_ALLOWED_DIRTY_REHEARSAL';
} else if (buildExitCode !== 0) buildStatus = 'FAILED_BUILD';

const buildMetadataPath = path.join(candidateRoot, 'build-metadata.json');
const buildMetadata = {
  schemaVersion: 1,
  status: buildStatus,
  sourceProvided: buildLogSourceProvided,
  sourceFileName: buildLogSourcePath ? path.basename(buildLogSourcePath) : null,
  copiedRelativePath: relativeToOutput(buildLogPath),
  command: buildCommand,
  exitCode: buildExitCode,
  byteLength: buildLogBuffer.length,
  sha256: sha256(buildLogBuffer),
  encoding: buildLogEncoding,
  buildId,
};
await writeJson(buildMetadataPath, buildMetadata);

const runtimeIdentityPath = path.join(candidateRoot, 'runtime-build-identity.json');
const runtimeIdentityUrl = buildId
  ? `${baseUrl}/flows`
  : null;
let runtimeIdentityProbe = {
  schemaVersion: 1,
  status: 'BUILD_ID_NOT_AVAILABLE',
  url: runtimeIdentityUrl,
  httpStatus: null,
  byteLength: null,
  sha256: null,
  containsBuildId: false,
  error: null,
};
if (runtimeIdentityUrl) {
  try {
    const response = await fetch(runtimeIdentityUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    const containsBuildId = buffer.toString('utf8').includes(buildId);
    runtimeIdentityProbe = {
      schemaVersion: 1,
      status: response.status === 200 && buffer.length > 0 && containsBuildId ? 'PASS' : 'FAIL',
      url: runtimeIdentityUrl,
      httpStatus: response.status,
      byteLength: buffer.length,
      sha256: sha256(buffer),
      containsBuildId,
      error: null,
    };
  } catch (error) {
    runtimeIdentityProbe = {
      ...runtimeIdentityProbe,
      status: 'FAIL',
      error: error.message,
    };
  }
}
await writeJson(runtimeIdentityPath, runtimeIdentityProbe);

const identityMismatches = [];
if (groupManifests.length !== 3) {
  identityMismatches.push(`expected 3 group manifests, found ${groupManifests.length}`);
}
for (const group of groupManifests) {
  if (group.head !== head) identityMismatches.push(`${group.manifest}: HEAD ${group.head} != ${head}`);
  if (group.buildId !== buildId) {
    identityMismatches.push(`${group.manifest}: BUILD_ID ${group.buildId} != ${buildId}`);
  }
  if (group.baseUrl?.replace(/\/$/u, '') !== baseUrl) {
    identityMismatches.push(`${group.manifest}: base URL ${group.baseUrl} != ${baseUrl}`);
  }
  if (!workingTreeDirty && group.dirty !== false) {
    identityMismatches.push(`${group.manifest}: group did not record a clean tree`);
  }
}

const cleanCandidateFailures = [];
if (!workingTreeDirty) {
  if (!buildId) cleanCandidateFailures.push('BUILD_ID is missing');
  cleanCandidateFailures.push(...captureTimestampFailures);
  if (runtimeIdentityProbe.status !== 'PASS') {
    cleanCandidateFailures.push(
      `runtime server does not prove BUILD_ID ${buildId}: HTTP ${runtimeIdentityProbe.httpStatus ?? 'none'}, containsBuildId=${runtimeIdentityProbe.containsBuildId}`,
    );
  }
  if (!upstreamRef || !upstreamSha) {
    cleanCandidateFailures.push('an upstream ref and SHA are required for a fetchable candidate');
  } else if (upstreamSha !== head) {
    cleanCandidateFailures.push(`upstream ${upstreamRef}@${upstreamSha} does not match HEAD ${head}`);
  }
  if (!buildLogSourceProvided) cleanCandidateFailures.push('FLOWME_P35_R2_BUILD_LOG is required');
  if (buildLogSourceProvided && !buildLogEncoding.valid) {
    cleanCandidateFailures.push(
      `build log must be valid UTF-8 without NUL or replacement characters: ${buildLogEncoding.error ?? JSON.stringify(buildLogEncoding)}`,
    );
  }
  if (!buildCommand) cleanCandidateFailures.push('FLOWME_P35_R2_BUILD_COMMAND is required');
  if (buildExitCode === null) {
    cleanCandidateFailures.push('FLOWME_P35_R2_BUILD_EXIT_CODE is required');
  } else if (buildExitCode !== 0) {
    cleanCandidateFailures.push(`build exit code must be 0, received ${buildExitCode}`);
  }
  cleanCandidateFailures.push(...identityMismatches);
}

const browsers = [...new Set(groupManifests.map((manifest) => manifest.browser).filter(Boolean))];
const locales = [...new Set(groupManifests.map((manifest) => manifest.locale).filter(Boolean))];
const timezones = [...new Set(groupManifests.map((manifest) => manifest.timezone).filter(Boolean))];
const operatingSystems = [...new Set(groupManifests.map((manifest) => manifest.os).filter(Boolean))];
const candidateEpochInput = `${head}\n${buildId ?? 'NO_BUILD_ID'}\n${captureStartedAt ?? 'NO_CAPTURE_START'}\n${captureCompletedAt ?? 'NO_CAPTURE_END'}\n`;
const candidateEpoch = `p35-r2-${sha256(Buffer.from(candidateEpochInput)).slice(0, 16)}`;
const provenancePath = path.join(candidateRoot, 'candidate-provenance.json');
const provenance = {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  generatedAtKst: kstNow(),
  classification: workingTreeDirty
    ? 'LOCAL_REHEARSAL_NOT_FINAL'
    : cleanCandidateFailures.length === 0
      ? 'CANDIDATE_BOUND_CAPTURE'
      : 'CLEAN_TREE_PROVENANCE_INVALID',
  candidateEligible: !workingTreeDirty && cleanCandidateFailures.length === 0,
  product: {
    sha: head,
    tree,
    ref,
    upstreamRef,
    upstreamSha,
    clean: !workingTreeDirty,
    dirty: workingTreeDirty,
    statusShortBranchRelativePath: relativeToOutput(statusPath),
    statusShortBranchSha256: sha256(Buffer.from(statusRaw, 'utf8')),
    statusShortBranchByteLength: Buffer.byteLength(statusRaw, 'utf8'),
  },
  runtime: {
    buildId,
    baseUrl,
    buildIdentityProbe: runtimeIdentityProbe,
  },
  capture: {
    candidateEpoch,
    command: captureCommand,
    startedAtUtc: captureStartedAt,
    completedAtUtc: captureCompletedAt,
    groupManifestIndexRelativePath: relativeToOutput(groupIndexPath),
    groupManifests,
  },
  seedReset: {
    contractRelativePath: relativeToOutput(seedContractPath),
    contractSha256: sha256(await readFile(seedContractPath)),
    command: captureCommand,
    result: seedResetContract.result,
  },
  build: buildMetadata,
  environment: {
    platform: process.platform,
    osType: os.type(),
    osRelease: os.release(),
    osVersion: os.version(),
    architecture: os.arch(),
    node: process.version,
    browsers,
    operatingSystems,
    locales: locales.length > 0 ? locales : ['ko-KR'],
    timezones: timezones.length > 0 ? timezones : ['Asia/Seoul'],
  },
  identityMismatches,
  cleanCandidateFailures,
  observedUsers: 0,
};
await writeJson(provenancePath, provenance);

const artifactInputs = [
  [statusPath, 'product_clean_tree_proof'],
  [seedContractPath, 'seed_reset_contract'],
  [groupIndexPath, 'group_manifest_index'],
  [buildLogPath, 'build_log'],
  [buildMetadataPath, 'build_metadata'],
  [runtimeIdentityPath, 'runtime_build_identity'],
  [provenancePath, 'candidate_provenance'],
];
const artifacts = [];
for (const [filePath, role] of artifactInputs) artifacts.push(await descriptor(filePath, role));
const candidateManifestPath = path.join(candidateRoot, 'candidate-manifest.json');
const candidateManifest = {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  classification: provenance.classification,
  candidateEligible: provenance.candidateEligible,
  productCandidateSha: head,
  buildId,
  baseUrl,
  candidateEpoch,
  artifacts,
  groupManifests: groupManifests.map(({ manifest, relativePath, byteLength, sha256: hash }) => ({
    manifest,
    relativePath,
    byteLength,
    sha256: hash,
  })),
  selfInventory: 'EXCLUDED_TO_AVOID_RECURSIVE_SELF_HASH',
};
await writeJson(candidateManifestPath, candidateManifest);

const result = {
  candidateRoot,
  classification: provenance.classification,
  candidateEligible: provenance.candidateEligible,
  workingTreeDirty,
  productCandidateSha: head,
  productCandidateRef: ref,
  upstreamRef,
  buildId,
  buildStatus,
  groupManifestCount: groupManifests.length,
  identityMismatchCount: identityMismatches.length,
  cleanCandidateFailureCount: cleanCandidateFailures.length,
  candidateManifest: candidateManifestPath,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

if (!workingTreeDirty && cleanCandidateFailures.length > 0) {
  throw new Error(`Clean candidate provenance gate failed: ${cleanCandidateFailures.join('; ')}`);
}
