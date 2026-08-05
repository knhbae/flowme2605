/**
 * Verify the two-commit P35 Round 2 blind-review publication after both commits exist.
 *
 * Required environment variables:
 *   FLOWME_P35_R2_BLIND_STAGE_DIR       local finalized blind stage
 *   FLOWME_P35_R2_BLIND_ASSET_SHA       full SHA of evidence asset commit A
 *   FLOWME_P35_R2_BLIND_INDEX_SHA       full SHA of review index commit B
 *
 * Optional environment variables:
 *   FLOWME_GITHUB_REPO                  owner/repository (default: knhbae/flowme2605)
 *   FLOWME_P35_R2_PUBLICATION_PATH_PREFIX
 *                                       path from repository root to the staged tree
 *   FLOWME_P35_R2_PUBLISHED_VERIFY_OUTPUT
 *                                       result JSON path; relative paths resolve from repo root
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptDir, '..', '..', '..');
const HTTP_CONCURRENCY = 6;
const HTTP_TIMEOUT_MS = 30_000;
const HTTP_ATTEMPTS = 3;
const OUTPUT_ENV = 'FLOWME_P35_R2_PUBLISHED_VERIFY_OUTPUT';
const INDEX_ENTRY_PATHS = Object.freeze([
  '.gitattributes',
  'README.md',
  'vercel.json',
  'release-metadata.json',
  'review/README-ko.md',
  'review/01-neutral-review-brief-ko.md',
  'review/02-codex-pass1-prompt-ko.md',
  'review/03-claude-pass1-prompt-ko.md',
  'review/04-neutral-scenario-matrix-ko.md',
  'review/05-evidence-contract-ko.md',
  'review/06-scorecard-ko.md',
  'review/07-blind-evidence-allowlist-template.md',
  'review/08-claude-static-evidence-allowlist.md',
]);
const ROLE_ALLOWLIST_PATHS = Object.freeze([
  'review/07-blind-evidence-allowlist-template.md',
  'review/08-claude-static-evidence-allowlist.md',
]);
const CLAUDE_APPROVED_ENTRY_PATHS = Object.freeze([
  'review/03-claude-pass1-prompt-ko.md',
  'review/01-neutral-review-brief-ko.md',
  'review/04-neutral-scenario-matrix-ko.md',
  'review/05-evidence-contract-ko.md',
  'review/06-scorecard-ko.md',
  'review/08-claude-static-evidence-allowlist.md',
]);
const REQUIRED_CANDIDATE_ROLES = Object.freeze([
  'product_clean_tree_proof',
  'seed_reset_contract',
  'group_manifest_index',
  'build_log',
  'build_metadata',
  'runtime_build_identity',
  'candidate_provenance',
]);
const EXTERNAL_INDEX_SHA_STATE = 'EXTERNAL_LAUNCH_ENVELOPE_REQUIRED_AFTER_INDEX_COMMIT';

// These exceptions are deliberately narrow. They prevent output blanks and the two
// scenario-specific non-measurement states from being mistaken for input blockers.
const PLACEHOLDER_ALLOWLIST = Object.freeze([
  {
    id: 'S22_NOT_ASSESSED_CELL',
    paths: ROLE_ALLOWLIST_PATHS,
    token: /^TBD(?:_[A-Z0-9_]+)?$/u,
    line: /^\|\s*S22\s*\|/u,
    reason: 'S22 may explicitly represent an unavailable performance measurement.',
  },
  {
    id: 'S23_REVIEWER_CHOICE_CELL',
    paths: ROLE_ALLOWLIST_PATHS,
    token: /^TBD(?:_[A-Z0-9_]+)?$/u,
    line: /^\|\s*S23\s*\|/u,
    reason: 'S23 is completed by the reviewer during free exploration.',
  },
  {
    id: 'SCORECARD_HEURISTIC_OUTPUT_TEMPLATE',
    paths: ['review/06-scorecard-ko.md'],
    token: /^TBD$/u,
    line: /^\|\s*Stated Job Fit — internal heuristic\s*\|/u,
    reason: 'This is an intentionally blank reviewer output row.',
  },
  {
    id: 'SCORECARD_FINDING_OUTPUT_TEMPLATE',
    paths: ['review/06-scorecard-ko.md'],
    token: /^TBD$/u,
    line: /^\|\s*`CX-001` 또는 `CD-001`\s*\|/u,
    reason: 'This is an intentionally blank reviewer finding row.',
  },
  {
    id: 'CODEX_PROMPT_GUARD_LITERAL',
    paths: ['review/02-codex-pass1-prompt-ko.md'],
    token: /^(?:TBD|NOT_RUNNABLE)$/u,
    line: /allowlist.*(?:NOT_RUNNABLE|TBD).*중단/u,
    reason: 'The prompt names states that must cause the reviewer to stop.',
  },
  {
    id: 'CLAUDE_PROMPT_GUARD_LITERAL',
    paths: ['review/03-claude-pass1-prompt-ko.md'],
    token: /^(?:TBD|NOT_RUNNABLE)$/u,
    line: /allowlist.*(?:TBD|NOT_RUNNABLE).*BLOCKED_BY_MISSING_EVIDENCE/u,
    reason: 'The prompt names states that must cause the reviewer to stop.',
  },
]);
const BLOCKING_PLACEHOLDER = /\b(?:DO_NOT_RUN|EVIDENCE_INCOMPLETE|NOT_RUNNABLE|STAGED_ASSETS_NOT_COMMITTED|INPUT_STRUCTURE_COMPLETE|LOCAL_REHEARSAL_NOT_FINAL|CLEAN_TREE_PROVENANCE_INVALID|BUILD_LOG_NOT_PROVIDED_FOR_LOCAL_REHEARSAL|TBD(?:_[A-Z0-9_]+)?)\b/gu;

const usage = `Usage:
  Set FLOWME_P35_R2_BLIND_STAGE_DIR, FLOWME_P35_R2_BLIND_ASSET_SHA, and
  FLOWME_P35_R2_BLIND_INDEX_SHA, then run:

    node scripts/content-audit/p35-round2-independent-evidence/verify-published-blind.mjs

Optional output env: ${OUTPUT_ENV}
Default output: <stage>/published-blind-verification.json
`;

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex').toLowerCase();
}

function normalizeRelativePath(value, label) {
  const normalized = String(value ?? '').trim().replaceAll('\\', '/');
  if (
    normalized.length === 0
    || normalized.startsWith('/')
    || /^[A-Za-z]:/u.test(normalized)
    || normalized.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    throw new Error(`${label} is not a safe repository-relative path: ${JSON.stringify(value)}`);
  }
  return normalized;
}

function normalizePrefix(value) {
  const raw = String(value ?? '').trim().replaceAll('\\', '/').replace(/^\/+|\/+$/gu, '');
  if (!raw) return '';
  return normalizeRelativePath(raw, 'FLOWME_P35_R2_PUBLICATION_PATH_PREFIX');
}

function resolveInside(root, relativePath) {
  const normalized = normalizeRelativePath(relativePath, 'publication path');
  const absolute = path.resolve(root, ...normalized.split('/'));
  const relative = path.relative(root, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path escapes blind stage: ${relativePath}`);
  }
  return { absolute, relativePath: normalized };
}

function encodedPath(relativePath) {
  return relativePath.split('/').map(encodeURIComponent).join('/');
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function parseConfiguration() {
  const stageValue = requiredEnvironment('FLOWME_P35_R2_BLIND_STAGE_DIR');
  const assetSha = requiredEnvironment('FLOWME_P35_R2_BLIND_ASSET_SHA').toLowerCase();
  const indexSha = requiredEnvironment('FLOWME_P35_R2_BLIND_INDEX_SHA').toLowerCase();
  const githubRepo = process.env.FLOWME_GITHUB_REPO?.trim() || 'knhbae/flowme2605';
  const publicationPathPrefix = normalizePrefix(
    process.env.FLOWME_P35_R2_PUBLICATION_PATH_PREFIX,
  );

  if (!/^[0-9a-f]{40}$/u.test(assetSha)) {
    throw new Error('FLOWME_P35_R2_BLIND_ASSET_SHA must be a full 40-character commit SHA.');
  }
  if (!/^[0-9a-f]{40}$/u.test(indexSha)) {
    throw new Error('FLOWME_P35_R2_BLIND_INDEX_SHA must be a full 40-character commit SHA.');
  }
  if (assetSha === indexSha) {
    throw new Error('Asset commit A and index commit B must be different commits.');
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(githubRepo)) {
    throw new Error('FLOWME_GITHUB_REPO must use owner/repository form.');
  }

  const stageRoot = path.resolve(repoRoot, stageValue);
  const outputValue = process.env[OUTPUT_ENV]?.trim();
  const outputPath = outputValue
    ? path.resolve(repoRoot, outputValue)
    : path.join(stageRoot, 'published-blind-verification.json');
  const prefixSuffix = publicationPathPrefix ? `/${encodedPath(publicationPathPrefix)}` : '';
  const rawCommitBase = (sha) => (
    `https://raw.githubusercontent.com/${githubRepo}/${sha}${prefixSuffix}`
  );
  const rawUrl = (sha, relativePath) => (
    `${rawCommitBase(sha)}/${encodedPath(normalizeRelativePath(relativePath, 'raw URL path'))}`
  );

  return {
    stageRoot,
    outputPath,
    assetSha,
    indexSha,
    githubRepo,
    publicationPathPrefix,
    assetRawBase: rawCommitBase(assetSha),
    indexRawBase: rawCommitBase(indexSha),
    rawUrl,
  };
}

async function readJson(filePath, label) {
  let source;
  try {
    source = await readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Cannot read ${label}: ${error.message}`, { cause: error });
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`Cannot parse ${label}: ${error.message}`, { cause: error });
  }
}

async function walkRegularFiles(root) {
  const files = [];
  const problems = [];

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile()) {
        files.push(absolute);
      } else {
        problems.push({
          path: path.relative(root, absolute).split(path.sep).join('/'),
          reason: 'non_regular_entry',
        });
      }
    }
  }

  await walk(root);
  return { files, problems };
}

async function mapLimit(items, limit, operation) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) return;
      results[currentIndex] = await operation(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(Math.max(1, limit), Math.max(1, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function comparable(value) {
  if (value === undefined) return null;
  if (typeof value === 'string' && value.length > 300) return `${value.slice(0, 297)}...`;
  return value;
}

function addCheck(checks, name, pass, expected, actual, detail) {
  checks.push({
    name,
    pass: Boolean(pass),
    expected: comparable(expected),
    actual: comparable(actual),
    ...(detail ? { detail } : {}),
  });
}

function inventoryDescriptor(entry, source, fallbackPathKey = 'relativePath') {
  const relativePath = entry?.[fallbackPathKey] ?? entry?.relativePath;
  return {
    source,
    relativePath: normalizeRelativePath(relativePath, `${source} path`),
    expectedBytes: entry?.byteLength ?? entry?.bytes ?? null,
    expectedSha256: entry?.sha256 ? String(entry.sha256).toLowerCase() : null,
  };
}

function buildDeclaredInventory(masterManifest, candidateManifest) {
  const entries = [];
  const failures = [];

  function add(entry) {
    let normalized;
    try {
      normalized = inventoryDescriptor(entry.value, entry.source, entry.pathKey);
    } catch (error) {
      failures.push({ source: entry.source, reason: error.message });
      return;
    }
    if (
      normalized.expectedBytes !== null
      && (!Number.isInteger(normalized.expectedBytes) || normalized.expectedBytes < 0)
    ) {
      failures.push({
        source: normalized.source,
        relativePath: normalized.relativePath,
        reason: 'invalid_declared_byte_length',
        actual: normalized.expectedBytes,
      });
    }
    if (
      normalized.expectedSha256 !== null
      && !/^[0-9a-f]{64}$/u.test(normalized.expectedSha256)
    ) {
      failures.push({
        source: normalized.source,
        relativePath: normalized.relativePath,
        reason: 'invalid_declared_sha256',
        actual: normalized.expectedSha256,
      });
    }
    entries.push(normalized);
  }

  for (const [scenarioIndex, scenario] of (masterManifest.scenarios ?? []).entries()) {
    for (const [fileIndex, file] of (scenario.files ?? []).entries()) {
      add({
        source: `master.scenarios[${scenarioIndex}].files[${fileIndex}]`,
        value: file,
      });
    }
  }
  for (const [index, artifact] of (masterManifest.candidateArtifacts ?? []).entries()) {
    add({ source: `master.candidateArtifacts[${index}]`, value: artifact });
  }
  for (const [index, manifest] of (masterManifest.groupManifests ?? []).entries()) {
    add({ source: `master.groupManifests[${index}]`, value: manifest, pathKey: 'file' });
  }
  for (const [index, artifact] of (candidateManifest.artifacts ?? []).entries()) {
    add({ source: `candidateManifest.artifacts[${index}]`, value: artifact });
  }
  for (const [index, manifest] of (candidateManifest.groupManifests ?? []).entries()) {
    add({ source: `candidateManifest.groupManifests[${index}]`, value: manifest });
  }

  const byPath = new Map();
  for (const entry of entries) {
    const previous = byPath.get(entry.relativePath);
    if (!previous) {
      byPath.set(entry.relativePath, entry);
      continue;
    }
    if (
      previous.expectedBytes !== null
      && entry.expectedBytes !== null
      && previous.expectedBytes !== entry.expectedBytes
    ) {
      failures.push({
        relativePath: entry.relativePath,
        reason: 'conflicting_declared_byte_lengths',
        declarations: [previous, entry],
      });
    }
    if (
      previous.expectedSha256 !== null
      && entry.expectedSha256 !== null
      && previous.expectedSha256 !== entry.expectedSha256
    ) {
      failures.push({
        relativePath: entry.relativePath,
        reason: 'conflicting_declared_sha256',
        declarations: [previous, entry],
      });
    }
    if (previous.expectedBytes === null && entry.expectedBytes !== null) {
      previous.expectedBytes = entry.expectedBytes;
    }
    if (previous.expectedSha256 === null && entry.expectedSha256 !== null) {
      previous.expectedSha256 = entry.expectedSha256;
    }
    previous.source = `${previous.source}; ${entry.source}`;
  }

  return { byPath, failures };
}

async function readLocalDescriptors(root, absoluteFiles) {
  return mapLimit(absoluteFiles, HTTP_CONCURRENCY, async (absolute) => {
    const buffer = await readFile(absolute);
    return {
      relativePath: path.relative(root, absolute).split(path.sep).join('/'),
      byteLength: buffer.length,
      sha256: sha256(buffer),
      buffer,
    };
  });
}

function verifyLocalInventory({
  masterManifest,
  candidateManifest,
  localDescriptors,
  walkProblems,
}) {
  const { byPath: declared, failures } = buildDeclaredInventory(
    masterManifest,
    candidateManifest,
  );
  failures.push(...walkProblems);
  const localByPath = new Map(localDescriptors.map((entry) => [entry.relativePath, entry]));
  const expectedStagePaths = new Set([
    'master-manifest.json',
    'gallery-verification.json',
    'candidate/candidate-manifest.json',
    ...declared.keys(),
  ]);

  for (const expectedPath of expectedStagePaths) {
    if (!localByPath.has(expectedPath)) {
      failures.push({ relativePath: expectedPath, reason: 'missing_from_local_stage' });
    }
  }
  for (const local of localDescriptors) {
    if (!expectedStagePaths.has(local.relativePath)) {
      failures.push({ relativePath: local.relativePath, reason: 'unexpected_unmanifested_stage_file' });
    }
  }
  for (const declaration of declared.values()) {
    const local = localByPath.get(declaration.relativePath);
    if (!local) continue;
    if (
      declaration.expectedBytes !== null
      && declaration.expectedBytes !== local.byteLength
    ) {
      failures.push({
        relativePath: declaration.relativePath,
        reason: 'local_byte_length_differs_from_manifest',
        expectedBytes: declaration.expectedBytes,
        actualBytes: local.byteLength,
        source: declaration.source,
      });
    }
    if (
      declaration.expectedSha256 !== null
      && declaration.expectedSha256 !== local.sha256
    ) {
      failures.push({
        relativePath: declaration.relativePath,
        reason: 'local_sha256_differs_from_manifest',
        expectedSha256: declaration.expectedSha256,
        actualSha256: local.sha256,
        source: declaration.source,
      });
    }
  }

  return {
    expectedStageFileCount: expectedStagePaths.size,
    localStageFileCount: localDescriptors.length,
    failures,
  };
}

function identityChecks({ releaseMetadata, masterManifest, candidateManifest, provenance, config }) {
  const checks = [];
  const candidateRoles = new Set((candidateManifest.artifacts ?? []).map((entry) => entry.role));
  const groupIdentities = masterManifest.groupIdentities ?? [];
  const expectedAssetRawBase = config.assetRawBase.replace(/\/$/u, '');
  const metadataAssetRawBase = String(releaseMetadata.assetRawBase ?? '').replace(/\/$/u, '');

  addCheck(checks, 'release type', releaseMetadata.release === 'PASS1_BLIND_ONLY', 'PASS1_BLIND_ONLY', releaseMetadata.release);
  addCheck(
    checks,
    'release state',
    releaseMetadata.state === 'INDEX_CONTENT_READY_EXTERNAL_LAUNCH_ENVELOPE_PENDING',
    'INDEX_CONTENT_READY_EXTERNAL_LAUNCH_ENVELOPE_PENDING',
    releaseMetadata.state,
  );
  addCheck(checks, 'asset commit A', releaseMetadata.blindEvidenceAssetSha === config.assetSha, config.assetSha, releaseMetadata.blindEvidenceAssetSha);
  addCheck(
    checks,
    'index commit B lifecycle value',
    releaseMetadata.blindReleaseIndexSha === config.indexSha
      || releaseMetadata.blindReleaseIndexSha === EXTERNAL_INDEX_SHA_STATE,
    `${config.indexSha} or ${EXTERNAL_INDEX_SHA_STATE}`,
    releaseMetadata.blindReleaseIndexSha,
    'The finalized tree cannot contain its own commit SHA; the external launch envelope supplies B.',
  );
  addCheck(checks, 'asset raw base', metadataAssetRawBase === expectedAssetRawBase, expectedAssetRawBase, metadataAssetRawBase);
  addCheck(
    checks,
    'candidate provenance URL',
    releaseMetadata.candidateProvenanceUrl === config.rawUrl(
      config.assetSha,
      'evidence/candidate/candidate-provenance.json',
    ),
    config.rawUrl(config.assetSha, 'evidence/candidate/candidate-provenance.json'),
    releaseMetadata.candidateProvenanceUrl,
  );
  addCheck(
    checks,
    'candidate manifest URL',
    releaseMetadata.candidateManifestUrl === config.rawUrl(
      config.assetSha,
      'evidence/candidate/candidate-manifest.json',
    ),
    config.rawUrl(config.assetSha, 'evidence/candidate/candidate-manifest.json'),
    releaseMetadata.candidateManifestUrl,
  );
  addCheck(checks, 'master clean tree', masterManifest.workingTreeDirty === false, false, masterManifest.workingTreeDirty);
  addCheck(checks, 'master evidence class', masterManifest.evidenceClass === 'CANDIDATE_BOUND_LOCAL_CAPTURE', 'CANDIDATE_BOUND_LOCAL_CAPTURE', masterManifest.evidenceClass);
  addCheck(checks, 'master scenario count', masterManifest.scenarios?.length === 23, 23, masterManifest.scenarios?.length);
  addCheck(checks, 'master summary scenario count', masterManifest.summary?.scenarioCount === 23, 23, masterManifest.summary?.scenarioCount);
  addCheck(checks, 'master missing scenarios', masterManifest.summary?.missingScenarioIds?.length === 0, 0, masterManifest.summary?.missingScenarioIds?.length);
  addCheck(checks, 'master candidate artifacts', Array.isArray(masterManifest.candidateArtifacts) && masterManifest.candidateArtifacts.length > 0, '> 0', masterManifest.candidateArtifacts?.length);
  addCheck(checks, 'master unmanifested files', masterManifest.manifestIntegrity?.unmanifestedScenarioFileCount === 0, 0, masterManifest.manifestIntegrity?.unmanifestedScenarioFileCount);
  addCheck(checks, 'master missing manifest files', masterManifest.manifestIntegrity?.missingManifestFileCount === 0, 0, masterManifest.manifestIntegrity?.missingManifestFileCount);
  addCheck(checks, 'master manifest hash failures', masterManifest.manifestIntegrity?.hashOrByteFailureCount === 0, 0, masterManifest.manifestIntegrity?.hashOrByteFailureCount);
  addCheck(checks, 'master group identity failures', masterManifest.groupIdentityFailures?.length === 0, 0, masterManifest.groupIdentityFailures?.length);
  addCheck(checks, 'master group health', Array.isArray(masterManifest.groupHealth) && masterManifest.groupHealth.length === 3 && masterManifest.groupHealth.every((group) => group.status === 'PASS'), '3 PASS groups', masterManifest.groupHealth);
  addCheck(checks, 'candidate provenance classification', provenance.classification === 'CANDIDATE_BOUND_CAPTURE', 'CANDIDATE_BOUND_CAPTURE', provenance.classification);
  addCheck(checks, 'candidate provenance eligible', provenance.candidateEligible === true, true, provenance.candidateEligible);
  addCheck(checks, 'candidate provenance clean', provenance.product?.clean === true && provenance.product?.dirty === false, 'clean=true, dirty=false', { clean: provenance.product?.clean, dirty: provenance.product?.dirty });
  addCheck(checks, 'candidate manifest eligible', candidateManifest.candidateEligible === true, true, candidateManifest.candidateEligible);
  addCheck(checks, 'candidate artifact roles', REQUIRED_CANDIDATE_ROLES.every((role) => candidateRoles.has(role)), REQUIRED_CANDIDATE_ROLES, [...candidateRoles]);
  addCheck(checks, 'build status', provenance.build?.status === 'PASS' && provenance.build?.sourceProvided === true && provenance.build?.exitCode === 0, 'PASS, sourceProvided=true, exitCode=0', { status: provenance.build?.status, sourceProvided: provenance.build?.sourceProvided, exitCode: provenance.build?.exitCode });
  addCheck(checks, 'product SHA: release/master', releaseMetadata.productCandidateSha === masterManifest.productCandidateSha, releaseMetadata.productCandidateSha, masterManifest.productCandidateSha);
  addCheck(checks, 'product SHA: release/provenance', releaseMetadata.productCandidateSha === provenance.product?.sha, releaseMetadata.productCandidateSha, provenance.product?.sha);
  addCheck(checks, 'product SHA: release/candidate manifest', releaseMetadata.productCandidateSha === candidateManifest.productCandidateSha, releaseMetadata.productCandidateSha, candidateManifest.productCandidateSha);
  addCheck(checks, 'build ID: release/master', releaseMetadata.buildId === masterManifest.buildId, releaseMetadata.buildId, masterManifest.buildId);
  addCheck(checks, 'build ID: release/provenance', releaseMetadata.buildId === provenance.runtime?.buildId, releaseMetadata.buildId, provenance.runtime?.buildId);
  addCheck(checks, 'build ID: release/candidate manifest', releaseMetadata.buildId === candidateManifest.buildId, releaseMetadata.buildId, candidateManifest.buildId);
  addCheck(checks, 'candidate epoch', candidateManifest.candidateEpoch === provenance.capture?.candidateEpoch, provenance.capture?.candidateEpoch, candidateManifest.candidateEpoch);
  addCheck(checks, 'group identity SHA/build', groupIdentities.length === 3 && groupIdentities.every((group) => group.head === releaseMetadata.productCandidateSha && group.buildId === releaseMetadata.buildId && group.dirty === false), '3 matching clean groups', groupIdentities);
  const captureStartMs = Date.parse(provenance.capture?.startedAtUtc ?? '');
  const captureCompletedMs = Date.parse(provenance.capture?.completedAtUtc ?? '');
  const provenanceCaptureGroups = provenance.capture?.groupManifests ?? [];
  const groupCaptureWindowsValid = provenanceCaptureGroups.length === 3
    && provenanceCaptureGroups.every((group) => {
    const startedAt = Date.parse(group.startedAt ?? '');
    const completedAt = Date.parse(group.completedAt ?? '');
    return Number.isFinite(startedAt) && Number.isFinite(completedAt) && startedAt <= completedAt;
    });
  addCheck(
    checks,
    'complete ordered capture window',
    Number.isFinite(captureStartMs)
      && Number.isFinite(captureCompletedMs)
      && captureStartMs <= captureCompletedMs
      && groupCaptureWindowsValid,
    '3 valid group windows and aggregate start <= completion',
    {
      startedAtUtc: provenance.capture?.startedAtUtc,
      completedAtUtc: provenance.capture?.completedAtUtc,
      groupCaptureWindowsValid,
    },
  );

  return checks;
}

function shouldRetryStatus(statusCode) {
  // raw.githubusercontent can briefly return 404 while a freshly pushed,
  // immutable commit propagates across edges.
  return statusCode === 404 || statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchBuffer(url, extraHeaders = {}) {
  let last = null;
  for (let attempt = 1; attempt <= HTTP_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: {
          Accept: 'application/octet-stream',
          'User-Agent': 'FlowMe-P35-Blind-Verifier/1.0',
          ...extraHeaders,
        },
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
      const buffer = Buffer.from(await response.arrayBuffer());
      last = {
        attempts: attempt,
        httpStatus: response.status,
        responseUrl: response.url,
        buffer,
        error: null,
      };
      if (response.status === 200 || !shouldRetryStatus(response.status)) return last;
    } catch (error) {
      last = {
        attempts: attempt,
        httpStatus: null,
        responseUrl: null,
        buffer: null,
        error: error.message,
      };
    }
    if (attempt < HTTP_ATTEMPTS) await wait(250 * (2 ** (attempt - 1)));
  }
  return last;
}

async function fetchGithubJson(url) {
  const token = process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim();
  const fetched = await fetchBuffer(url, {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });
  if (fetched.httpStatus !== 200 || !fetched.buffer) {
    return {
      value: null,
      report: {
        url,
        attempts: fetched.attempts,
        httpStatus: fetched.httpStatus,
        status: 'FAIL',
        reason: fetched.error ?? 'github_api_status_not_200',
      },
    };
  }
  try {
    return {
      value: JSON.parse(fetched.buffer.toString('utf8')),
      report: {
        url,
        attempts: fetched.attempts,
        httpStatus: fetched.httpStatus,
        status: 'PASS',
      },
    };
  } catch (error) {
    return {
      value: null,
      report: {
        url,
        attempts: fetched.attempts,
        httpStatus: fetched.httpStatus,
        status: 'FAIL',
        reason: `invalid_github_api_json: ${error.message}`,
      },
    };
  }
}

async function auditPublicationCommitStructure(config, localEvidence) {
  const apiBase = `https://api.github.com/repos/${config.githubRepo}`;
  const [assetCommitResult, indexCommitResult] = await Promise.all([
    fetchGithubJson(`${apiBase}/git/commits/${config.assetSha}`),
    fetchGithubJson(`${apiBase}/git/commits/${config.indexSha}`),
  ]);
  const apiReports = [assetCommitResult.report, indexCommitResult.report];
  const failures = [];
  const assetCommit = assetCommitResult.value;
  const indexCommit = indexCommitResult.value;

  if (!assetCommit) failures.push({ reason: 'asset_commit_api_unavailable' });
  if (!indexCommit) failures.push({ reason: 'index_commit_api_unavailable' });
  if (assetCommit && (assetCommit.parents ?? []).length !== 0) {
    failures.push({
      reason: 'asset_commit_A_must_be_an_orphan_root_commit',
      actualParents: (assetCommit.parents ?? []).map((entry) => (
        String(entry.sha ?? '').toLowerCase()
      )),
    });
  }
  if (indexCommit) {
    const parents = indexCommit.parents ?? [];
    if (parents.length !== 1 || String(parents[0]?.sha ?? '').toLowerCase() !== config.assetSha) {
      failures.push({
        reason: 'index_commit_B_must_have_asset_commit_A_as_its_only_parent',
        expected: [config.assetSha],
        actual: parents.map((entry) => String(entry.sha ?? '').toLowerCase()),
      });
    }
  }

  let assetTreeResult = { value: null, report: { status: 'NOT_RUN' } };
  let indexTreeResult = { value: null, report: { status: 'NOT_RUN' } };
  if (assetCommit?.tree?.sha && indexCommit?.tree?.sha) {
    [assetTreeResult, indexTreeResult] = await Promise.all([
      fetchGithubJson(`${apiBase}/git/trees/${assetCommit.tree.sha}?recursive=1`),
      fetchGithubJson(`${apiBase}/git/trees/${indexCommit.tree.sha}?recursive=1`),
    ]);
    apiReports.push(assetTreeResult.report, indexTreeResult.report);
  }

  const expectedIndexPaths = new Set([
    ...INDEX_ENTRY_PATHS,
    ...localEvidence.map((entry) => `evidence/${entry.relativePath}`),
  ]);
  const expectedAssetPaths = new Set(expectedIndexPaths);
  expectedAssetPaths.delete('release-metadata.json');
  expectedAssetPaths.delete('review/08-claude-static-evidence-allowlist.md');
  expectedAssetPaths.add('stage-record.json');

  function compareTree(label, treeValue, expectedPaths) {
    if (!treeValue) {
      failures.push({ reason: `${label}_tree_api_unavailable` });
      return { expectedCount: expectedPaths.size, actualCount: null, missing: [], unexpected: [] };
    }
    if (treeValue.truncated) failures.push({ reason: `${label}_tree_response_truncated` });
    const actualPaths = new Set(
      (treeValue.tree ?? [])
        .filter((entry) => entry.type === 'blob')
        .map((entry) => normalizeRelativePath(entry.path, `${label} tree path`)),
    );
    const missing = [...expectedPaths].filter((entry) => !actualPaths.has(entry)).sort();
    const unexpected = [...actualPaths].filter((entry) => !expectedPaths.has(entry)).sort();
    if (missing.length > 0) failures.push({ reason: `${label}_tree_missing_paths`, paths: missing });
    if (unexpected.length > 0) failures.push({ reason: `${label}_tree_unexpected_paths`, paths: unexpected });
    if ([...actualPaths].some((entry) => /\.zip$/iu.test(entry))) {
      failures.push({ reason: `${label}_tree_contains_zip` });
    }
    return {
      expectedCount: expectedPaths.size,
      actualCount: actualPaths.size,
      missing,
      unexpected,
    };
  }

  const assetTree = compareTree('asset_A', assetTreeResult.value, expectedAssetPaths);
  const indexTree = compareTree('index_B', indexTreeResult.value, expectedIndexPaths);
  return {
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    assetCommitSha: config.assetSha,
    indexCommitSha: config.indexSha,
    apiReports,
    assetTree,
    indexTree,
    failures,
  };
}

async function fetchAndCompare(task) {
  const fetched = await fetchBuffer(task.url);
  const actualBytes = fetched.buffer?.length ?? null;
  const actualSha256 = fetched.buffer ? sha256(fetched.buffer) : null;
  const failures = [];
  if (fetched.httpStatus !== 200) failures.push('http_status_not_200');
  if (fetched.error) failures.push('fetch_error');
  if (task.expectedBytes !== null && task.expectedBytes !== actualBytes) {
    failures.push('byte_length_mismatch');
  }
  if (task.expectedSha256 !== null && task.expectedSha256 !== actualSha256) {
    failures.push('sha256_mismatch');
  }
  return {
    report: {
      class: task.class,
      relativePath: task.relativePath,
      commitSha: task.commitSha,
      url: task.url,
      attempts: fetched.attempts,
      httpStatus: fetched.httpStatus,
      responseUrl: fetched.responseUrl,
      expectedBytes: task.expectedBytes,
      actualBytes,
      expectedSha256: task.expectedSha256,
      actualSha256,
      status: failures.length === 0 ? 'PASS' : 'FAIL',
      failures,
      ...(fetched.error ? { error: fetched.error } : {}),
    },
    buffer: fetched.httpStatus === 200 ? fetched.buffer : null,
  };
}

function placeholderException(relativePath, line, token) {
  return PLACEHOLDER_ALLOWLIST.find((rule) => (
    rule.paths.includes(relativePath)
    && rule.token.test(token)
    && rule.line.test(line)
  ));
}

function auditPlaceholders(publishedTextByPath) {
  const blockers = [];
  const allowed = [];

  for (const [relativePath, text] of publishedTextByPath) {
    const lines = text.split(/\r?\n/u);
    for (const [lineIndex, line] of lines.entries()) {
      for (const match of line.matchAll(BLOCKING_PLACEHOLDER)) {
        const token = match[0];
        const exception = placeholderException(relativePath, line, token);
        const occurrence = {
          relativePath,
          line: lineIndex + 1,
          token,
          excerpt: line.trim().slice(0, 500),
        };
        if (exception) {
          allowed.push({
            ...occurrence,
            ruleId: exception.id,
            reason: exception.reason,
          });
        } else {
          blockers.push(occurrence);
        }
      }
    }
  }

  return {
    rules: PLACEHOLDER_ALLOWLIST.map(({ id, paths, reason }) => ({ id, paths, reason })),
    allowed,
    blockers,
  };
}

function expectedAllowlistRows(masterManifest, candidateManifest, config) {
  const globals = new Set([
    'candidate/candidate-manifest.json',
    ...(candidateManifest.groupManifests ?? []).map((entry) => (
      normalizeRelativePath(entry.relativePath, 'candidate group manifest path')
    )),
    ...(candidateManifest.artifacts ?? []).map((entry) => (
      normalizeRelativePath(entry.relativePath, 'candidate artifact path')
    )),
  ]);
  const scenarioRows = (masterManifest.scenarios ?? []).flatMap((scenario) => (
    (scenario.files ?? []).map((file) => ({
      scenarioId: scenario.scenarioId,
      relativePath: normalizeRelativePath(file.relativePath, 'scenario evidence path'),
    }))
  ));
  const globalRows = [...globals].map((relativePath) => ({
    scenarioId: 'GLOBAL',
    relativePath,
  }));
  const claudeSafeGlobalRoles = new Set([
    'product_clean_tree_proof',
    'build_log',
    'build_metadata',
  ]);
  const claudeSafeGlobalPaths = new Set(
    (candidateManifest.artifacts ?? [])
      .filter((entry) => claudeSafeGlobalRoles.has(entry.role))
      .map((entry) => normalizeRelativePath(entry.relativePath, 'Claude-safe global path')),
  );
  const toExpected = ({ scenarioId, relativePath }, expectedScope) => ({
    scenarioId,
    relativePath,
    url: config.rawUrl(config.assetSha, `evidence/${relativePath}`),
    expectedScope,
  });
  const codexRows = [...globalRows, ...scenarioRows].map((row) => toExpected(
    row,
    row.scenarioId === 'S17'
      || (row.scenarioId === 'GLOBAL' && !claudeSafeGlobalPaths.has(row.relativePath))
      ? 'Codex only — Claude excluded'
      : 'Codex+Claude',
  ));
  const claudeRows = [
    ...globalRows.filter((row) => claudeSafeGlobalPaths.has(row.relativePath)),
    ...scenarioRows.filter((row) => row.scenarioId !== 'S17'),
  ].map((row) => toExpected(row, 'Codex+Claude'));
  return {
    codex: codexRows,
    claude: claudeRows,
  };
}

function parseAllowlistRows(text) {
  const rows = [];
  for (const [lineIndex, line] of text.split(/\r?\n/u).entries()) {
    const match = line.match(
      /^\|\s*(GLOBAL|S\d{2})\s*\|[^|]*\|\s*([^|]+?)\s*\|\s*\[direct\]\((https:\/\/raw\.githubusercontent\.com\/[^)\s]+)\)/u,
    );
    if (!match) continue;
    rows.push({
      scenarioId: match[1],
      scope: match[2].trim(),
      url: match[3],
      line: lineIndex + 1,
      source: line,
    });
  }
  return rows;
}

function auditRoleAllowlist(relativePath, text, expectedRows, expectedCount) {
  const rows = parseAllowlistRows(text);
  const failures = [];
  const expectedKeys = new Set(expectedRows.map((row) => `${row.scenarioId}\n${row.url}`));
  const expectedByKey = new Map(expectedRows.map((row) => [
    `${row.scenarioId}\n${row.url}`,
    row,
  ]));
  const actualKeys = new Set();
  for (const row of rows) {
    const key = `${row.scenarioId}\n${row.url}`;
    if (actualKeys.has(key)) failures.push({ reason: 'duplicate_direct_row', ...row });
    actualKeys.add(key);
    if (!expectedKeys.has(key)) failures.push({ reason: 'unexpected_or_wrong_commit_direct_row', ...row });
    const expected = expectedByKey.get(key);
    if (expected && row.scope !== expected.expectedScope) {
      failures.push({
        reason: 'reviewer_scope_mismatch',
        scenarioId: row.scenarioId,
        url: row.url,
        expected: expected.expectedScope,
        actual: row.scope,
      });
    }
  }
  for (const expected of expectedRows) {
    const key = `${expected.scenarioId}\n${expected.url}`;
    if (!actualKeys.has(key)) failures.push({ reason: 'missing_direct_row', ...expected });
  }
  if (rows.length !== expectedCount) {
    failures.push({
      reason: 'release_metadata_row_count_mismatch',
      expected: expectedCount,
      actual: rows.length,
    });
  }
  if (!text.includes('> current status: `INDEX_CONTENT_READY / B_SHA_IN_EXTERNAL_ENVELOPE_AFTER_COMMIT`')) {
    failures.push({ reason: 'index_content_ready_header_missing' });
  }
  const s22 = rows.find((row) => row.scenarioId === 'S22');
  const s23 = rows.find((row) => row.scenarioId === 'S23');
  if (!s22 || !/\|\s*`?NOT_ASSESSED_ALLOWED`?\s*\|\s*$/u.test(s22.source)) {
    failures.push({ reason: 'S22_nonblocking_status_missing' });
  }
  if (!s23 || !/\|\s*`?REVIEWER_ACTION_REQUIRED`?\s*\|\s*$/u.test(s23.source)) {
    failures.push({ reason: 'S23_reviewer_action_status_missing' });
  }
  if (
    relativePath === 'review/08-claude-static-evidence-allowlist.md'
    && rows.some((row) => row.scenarioId === 'S17')
  ) {
    failures.push({ reason: 'claude_allowlist_exposes_codex_only_S17' });
  }

  return {
    relativePath,
    expectedRowCount: expectedRows.length,
    metadataExpectedRowCount: expectedCount,
    actualRowCount: rows.length,
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    failures,
  };
}

function auditRawUrls(publishedTextByPath, expectedAssetRawBase) {
  const failures = [];
  let urlCount = 0;
  const acceptedBase = expectedAssetRawBase.replace(/\/$/u, '');
  const rawUrlPattern = /https:\/\/raw\.githubusercontent\.com\/[^\s)<>{}`"']+/gu;

  for (const [relativePath, text] of publishedTextByPath) {
    for (const match of text.matchAll(rawUrlPattern)) {
      urlCount += 1;
      const url = match[0].replace(/[.,;:]$/u, '');
      if (url !== acceptedBase && !url.startsWith(`${acceptedBase}/`)) {
        failures.push({ relativePath, url, reason: 'raw_url_not_pinned_to_asset_commit_A' });
      }
    }
  }
  if (urlCount === 0) failures.push({ reason: 'no_raw_asset_urls_found_in_index_docs' });
  return { urlCount, failures };
}

function auditClaudeApprovedInputs(publishedTextByPath, expectedRows) {
  const failures = [];
  const allowedRawUrls = new Set(expectedRows.map((row) => row.url));
  const rawUrlPattern = /https:\/\/raw\.githubusercontent\.com\/[^\s)<>{}`"']+/gu;
  const forbiddenPathPattern = /(?:candidate-provenance\.json|candidate-manifest\.json|seed-reset-contract\.json|group-manifest-s17-s23|\/S17\/)/giu;
  const forbiddenLocalTransportPattern = /(?:https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/[^\s"'<>)]*)?|file:\/\/\/?[^\s"'<>)]*|(?<![A-Za-z0-9])[A-Za-z]:[\\/]|\\\\[A-Za-z0-9._-]+[\\/])/giu;
  let rawUrlCount = 0;

  for (const relativePath of CLAUDE_APPROVED_ENTRY_PATHS) {
    const source = publishedTextByPath.get(relativePath);
    if (source === undefined) {
      failures.push({ relativePath, reason: 'claude_approved_entry_missing' });
      continue;
    }
    for (const match of source.matchAll(rawUrlPattern)) {
      rawUrlCount += 1;
      const url = match[0].replace(/[.,;:]$/u, '');
      if (!allowedRawUrls.has(url)) {
        failures.push({ relativePath, url, reason: 'claude_entry_exposes_non_allowlisted_raw_url' });
      }
    }
    for (const match of source.matchAll(forbiddenPathPattern)) {
      failures.push({
        relativePath,
        token: match[0],
        reason: 'claude_entry_exposes_role_restricted_path',
      });
    }
    for (const match of source.matchAll(forbiddenLocalTransportPattern)) {
      failures.push({
        relativePath,
        token: match[0],
        reason: 'claude_entry_exposes_local_transport_or_path',
      });
    }
  }

  const prompt = publishedTextByPath.get('review/03-claude-pass1-prompt-ko.md') ?? '';
  const relativeLinks = [...prompt.matchAll(/\]\((\.\/[^)]+)\)/gu)].map((match) => match[1]);
  const allowedPromptLinks = new Set([
    './01-neutral-review-brief-ko.md',
    './04-neutral-scenario-matrix-ko.md',
    './05-evidence-contract-ko.md',
    './06-scorecard-ko.md',
    './08-claude-static-evidence-allowlist.md',
  ]);
  for (const link of relativeLinks) {
    if (!allowedPromptLinks.has(link)) {
      failures.push({
        relativePath: 'review/03-claude-pass1-prompt-ko.md',
        link,
        reason: 'claude_prompt_links_outside_role_specific_entry_set',
      });
    }
  }

  return {
    approvedEntryPaths: CLAUDE_APPROVED_ENTRY_PATHS,
    expectedSafeRawUrlCount: allowedRawUrls.size,
    observedRawUrlCount: rawUrlCount,
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    failures,
  };
}

async function verify(config) {
  const stageStat = await stat(config.stageRoot);
  if (!stageStat.isDirectory()) throw new Error(`Blind stage is not a directory: ${config.stageRoot}`);

  const evidenceRoot = path.join(config.stageRoot, 'evidence');
  const releaseMetadata = await readJson(
    path.join(config.stageRoot, 'release-metadata.json'),
    'release-metadata.json',
  );
  const masterManifest = await readJson(
    path.join(evidenceRoot, 'master-manifest.json'),
    'evidence/master-manifest.json',
  );
  const candidateManifest = await readJson(
    path.join(evidenceRoot, 'candidate', 'candidate-manifest.json'),
    'evidence/candidate/candidate-manifest.json',
  );
  const provenance = await readJson(
    path.join(evidenceRoot, 'candidate', 'candidate-provenance.json'),
    'evidence/candidate/candidate-provenance.json',
  );

  const productCandidateRemote = await fetchAndCompare({
    class: 'product_P',
    relativePath: 'vercel.json',
    commitSha: masterManifest.productCandidateSha,
    url: `https://raw.githubusercontent.com/${config.githubRepo}/${masterManifest.productCandidateSha}/vercel.json`,
    expectedBytes: null,
    expectedSha256: null,
  });
  let productDeploymentGuard = {
    pass: false,
    reason: 'remote product candidate vercel.json missing or invalid',
  };
  if (productCandidateRemote.buffer) {
    try {
      const productVercel = JSON.parse(productCandidateRemote.buffer.toString('utf8'));
      const deploymentEnabled = productVercel?.git?.deploymentEnabled;
      productDeploymentGuard = deploymentEnabled?.[provenance.product?.ref] === false
        ? { pass: true, reason: `automatic Vercel deployment disabled for ${provenance.product.ref}` }
        : {
            pass: false,
            reason: `remote product candidate must disable Vercel deployment for ${provenance.product?.ref}`,
          };
    } catch (error) {
      productDeploymentGuard = {
        pass: false,
        reason: `invalid remote product candidate vercel.json: ${error.message}`,
      };
    }
  }

  const evidenceWalk = await walkRegularFiles(evidenceRoot);
  const localEvidence = await readLocalDescriptors(evidenceRoot, evidenceWalk.files);
  const publicationCommitStructure = await auditPublicationCommitStructure(config, localEvidence);
  const localInventory = verifyLocalInventory({
    masterManifest,
    candidateManifest,
    localDescriptors: localEvidence,
    walkProblems: evidenceWalk.problems,
  });
  const checks = identityChecks({
    releaseMetadata,
    masterManifest,
    candidateManifest,
    provenance,
    config,
  });

  const indexLocal = [];
  const indexLocalFailures = [];
  for (const relativePath of INDEX_ENTRY_PATHS) {
    try {
      const { absolute } = resolveInside(config.stageRoot, relativePath);
      const buffer = await readFile(absolute);
      indexLocal.push({
        relativePath,
        byteLength: buffer.length,
        sha256: sha256(buffer),
        buffer,
      });
    } catch (error) {
      indexLocalFailures.push({ relativePath, reason: error.message });
      indexLocal.push({ relativePath, byteLength: null, sha256: null, buffer: null });
    }
  }
  const assetRootGuardPaths = ['.gitattributes', 'vercel.json'];
  const indexLocalByPath = new Map(indexLocal.map((entry) => [entry.relativePath, entry]));
  const assetRootLocal = assetRootGuardPaths.map((relativePath) => {
    const entry = indexLocalByPath.get(relativePath);
    return entry ?? {
      relativePath,
      byteLength: null,
      sha256: null,
      buffer: null,
    };
  });

  const requestTasks = [
    ...localEvidence.map((entry) => ({
      class: 'asset_A',
      relativePath: `evidence/${entry.relativePath}`,
      commitSha: config.assetSha,
      url: config.rawUrl(config.assetSha, `evidence/${entry.relativePath}`),
      expectedBytes: entry.byteLength,
      expectedSha256: entry.sha256,
    })),
    ...assetRootLocal.map((entry) => ({
      class: 'asset_A_root_guard',
      relativePath: entry.relativePath,
      commitSha: config.assetSha,
      url: config.rawUrl(config.assetSha, entry.relativePath),
      expectedBytes: entry.byteLength,
      expectedSha256: entry.sha256,
    })),
    ...indexLocal.map((entry) => ({
      class: 'index_B',
      relativePath: entry.relativePath,
      commitSha: config.indexSha,
      url: config.rawUrl(config.indexSha, entry.relativePath),
      expectedBytes: entry.byteLength,
      expectedSha256: entry.sha256,
    })),
  ];
  const requestResults = await mapLimit(requestTasks, HTTP_CONCURRENCY, fetchAndCompare);
  const assetResults = requestResults.slice(0, localEvidence.length);
  const assetRootResults = requestResults.slice(
    localEvidence.length,
    localEvidence.length + assetRootLocal.length,
  );
  const indexResults = requestResults.slice(localEvidence.length + assetRootLocal.length);
  const assetChecks = assetResults.map((entry) => entry.report);
  const assetRootChecks = assetRootResults.map((entry) => entry.report);
  const indexChecks = indexResults.map((entry) => entry.report);

  const publishedTextByPath = new Map();
  const decodeFailures = [];
  for (const [index, entry] of indexResults.entries()) {
    if (!entry.buffer) continue;
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(entry.buffer);
      publishedTextByPath.set(INDEX_ENTRY_PATHS[index], text);
    } catch (error) {
      decodeFailures.push({
        relativePath: INDEX_ENTRY_PATHS[index],
        reason: `published entry is not valid UTF-8: ${error.message}`,
      });
    }
  }

  const placeholderAudit = auditPlaceholders(publishedTextByPath);
  let deploymentGuard = { pass: false, reason: 'published vercel.json missing or invalid' };
  try {
    const publishedVercel = JSON.parse(publishedTextByPath.get('vercel.json') ?? '');
    deploymentGuard = publishedVercel?.git?.deploymentEnabled === false
      ? { pass: true, reason: 'automatic Vercel Git deployments disabled for blind branch' }
      : { pass: false, reason: 'git.deploymentEnabled must be false in blind publication' };
  } catch (error) {
    deploymentGuard = { pass: false, reason: `invalid published vercel.json: ${error.message}` };
  }
  const bytePreservationGuard = (publishedTextByPath.get('.gitattributes') ?? '').trim() === '* -text'
    ? { pass: true, reason: 'Git text normalization disabled for blind evidence bytes' }
    : { pass: false, reason: 'published .gitattributes must contain exactly * -text' };
  const assetRootTextByPath = new Map();
  for (const [index, entry] of assetRootResults.entries()) {
    if (!entry.buffer) continue;
    try {
      assetRootTextByPath.set(
        assetRootGuardPaths[index],
        new TextDecoder('utf-8', { fatal: true }).decode(entry.buffer),
      );
    } catch {
      // The byte/hash check already records a failure; the semantic guard below
      // also fails when decoded text is unavailable.
    }
  }
  let assetDeploymentGuard = { pass: false, reason: 'asset A vercel.json missing or invalid' };
  try {
    const assetVercel = JSON.parse(assetRootTextByPath.get('vercel.json') ?? '');
    assetDeploymentGuard = assetVercel?.git?.deploymentEnabled === false
      ? { pass: true, reason: 'automatic Vercel Git deployment disabled in asset commit A' }
      : { pass: false, reason: 'asset commit A git.deploymentEnabled must be false' };
  } catch (error) {
    assetDeploymentGuard = { pass: false, reason: `invalid asset A vercel.json: ${error.message}` };
  }
  const assetBytePreservationGuard = (
    assetRootTextByPath.get('.gitattributes') ?? ''
  ).trim() === '* -text'
    ? { pass: true, reason: 'asset commit A disables Git text normalization' }
    : { pass: false, reason: 'asset commit A .gitattributes must contain exactly * -text' };
  const expectedRows = expectedAllowlistRows(masterManifest, candidateManifest, config);
  const codexAllowlistText = publishedTextByPath.get(ROLE_ALLOWLIST_PATHS[0]) ?? '';
  const claudeAllowlistText = publishedTextByPath.get(ROLE_ALLOWLIST_PATHS[1]) ?? '';
  const roleAllowlistChecks = [
    auditRoleAllowlist(
      ROLE_ALLOWLIST_PATHS[0],
      codexAllowlistText,
      expectedRows.codex,
      releaseMetadata.evidenceRowCount,
    ),
    auditRoleAllowlist(
      ROLE_ALLOWLIST_PATHS[1],
      claudeAllowlistText,
      expectedRows.claude,
      releaseMetadata.claudeEvidenceRowCount,
    ),
  ];
  const rawUrlAudit = auditRawUrls(publishedTextByPath, config.assetRawBase);
  const claudeApprovedInputAudit = auditClaudeApprovedInputs(
    publishedTextByPath,
    expectedRows.claude,
  );

  const identityFailureCount = checks.filter((check) => !check.pass).length;
  const assetFailureCount = assetChecks.filter((check) => check.status !== 'PASS').length;
  const assetRootFailureCount = assetRootChecks.filter((check) => check.status !== 'PASS').length;
  const indexFailureCount = indexChecks.filter((check) => check.status !== 'PASS').length;
  const roleAllowlistFailureCount = roleAllowlistChecks.reduce(
    (sum, check) => sum + check.failures.length,
    0,
  );
  const failureCount = identityFailureCount
    + localInventory.failures.length
    + (productCandidateRemote.report.status === 'PASS' ? 0 : 1)
    + (productDeploymentGuard.pass ? 0 : 1)
    + indexLocalFailures.length
    + assetFailureCount
    + assetRootFailureCount
    + indexFailureCount
    + decodeFailures.length
    + placeholderAudit.blockers.length
    + (deploymentGuard.pass ? 0 : 1)
    + (bytePreservationGuard.pass ? 0 : 1)
    + (assetDeploymentGuard.pass ? 0 : 1)
    + (assetBytePreservationGuard.pass ? 0 : 1)
    + roleAllowlistFailureCount
    + rawUrlAudit.failures.length
    + claudeApprovedInputAudit.failures.length
    + publicationCommitStructure.failures.length;

  return {
    schemaVersion: 1,
    verifier: 'P35_ROUND2_PUBLISHED_BLIND',
    generatedAt: new Date().toISOString(),
    verdict: failureCount === 0 ? 'PASS' : 'FAIL',
    inputs: {
      stageRoot: 'LOCAL_BLIND_STAGE_REDACTED',
      githubRepo: config.githubRepo,
      publicationPathPrefix: config.publicationPathPrefix,
      blindEvidenceAssetSha: config.assetSha,
      blindReleaseIndexSha: config.indexSha,
      assetRawBase: config.assetRawBase,
      indexRawBase: config.indexRawBase,
      outputPath: 'LOCAL_VERIFIER_OUTPUT_REDACTED',
      httpConcurrency: HTTP_CONCURRENCY,
      httpTimeoutMs: HTTP_TIMEOUT_MS,
      httpAttempts: HTTP_ATTEMPTS,
    },
    summary: {
      failureCount,
      identityCheckCount: checks.length,
      identityFailureCount,
      localEvidenceFileCount: localEvidence.length,
      localInventoryFailureCount: localInventory.failures.length,
      productCandidateRemoteFailureCount: productCandidateRemote.report.status === 'PASS' ? 0 : 1,
      productDeploymentGuardFailureCount: productDeploymentGuard.pass ? 0 : 1,
      assetFileCount: assetChecks.length,
      assetHttpOrIntegrityFailureCount: assetFailureCount,
      assetRootGuardFileCount: assetRootChecks.length,
      assetRootGuardHttpOrIntegrityFailureCount: assetRootFailureCount,
      indexEntryCount: indexChecks.length,
      indexLocalFailureCount: indexLocalFailures.length,
      indexHttpOrIntegrityFailureCount: indexFailureCount,
      decodeFailureCount: decodeFailures.length,
      blockingPlaceholderCount: placeholderAudit.blockers.length,
      deploymentGuardFailureCount: deploymentGuard.pass ? 0 : 1,
      bytePreservationGuardFailureCount: bytePreservationGuard.pass ? 0 : 1,
      assetDeploymentGuardFailureCount: assetDeploymentGuard.pass ? 0 : 1,
      assetBytePreservationGuardFailureCount: assetBytePreservationGuard.pass ? 0 : 1,
      allowedPlaceholderCount: placeholderAudit.allowed.length,
      roleAllowlistFailureCount,
      rawUrlCount: rawUrlAudit.urlCount,
      rawUrlFailureCount: rawUrlAudit.failures.length,
      claudeApprovedInputFailureCount: claudeApprovedInputAudit.failures.length,
      publicationCommitStructureFailureCount: publicationCommitStructure.failures.length,
    },
    identityChecks: checks,
    localInventory,
    productCandidateRemote: productCandidateRemote.report,
    productDeploymentGuard,
    assetChecks,
    assetRootChecks,
    indexChecks,
    indexLocalFailures,
    decodeFailures,
    placeholderAudit,
    deploymentGuard,
    bytePreservationGuard,
    assetDeploymentGuard,
    assetBytePreservationGuard,
    roleAllowlistChecks,
    rawUrlAudit,
    claudeApprovedInputAudit,
    publicationCommitStructure,
  };
}

async function writeResult(outputPath, result) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

async function main() {
  let config;
  try {
    config = parseConfiguration();
    const result = await verify(config);
    await writeResult(config.outputPath, result);
    process.stdout.write(`${JSON.stringify({
      verdict: result.verdict,
      outputPath: config.outputPath,
      summary: result.summary,
    }, null, 2)}\n`);
    if (result.verdict !== 'PASS') process.exitCode = 1;
  } catch (error) {
    const stageValue = process.env.FLOWME_P35_R2_BLIND_STAGE_DIR?.trim();
    const explicitOutput = process.env[OUTPUT_ENV]?.trim();
    const fallbackOutput = explicitOutput
      ? path.resolve(repoRoot, explicitOutput)
      : stageValue
        ? path.join(path.resolve(repoRoot, stageValue), 'published-blind-verification.json')
        : null;
    const failureResult = {
      schemaVersion: 1,
      verifier: 'P35_ROUND2_PUBLISHED_BLIND',
      generatedAt: new Date().toISOString(),
      verdict: 'FAIL',
      fatalError: {
        name: error.name,
        message: error.message,
      },
      ...(config ? {
        inputs: {
          stageRoot: 'LOCAL_BLIND_STAGE_REDACTED',
          githubRepo: config.githubRepo,
          publicationPathPrefix: config.publicationPathPrefix,
          blindEvidenceAssetSha: config.assetSha,
          blindReleaseIndexSha: config.indexSha,
          outputPath: 'LOCAL_VERIFIER_OUTPUT_REDACTED',
        },
      } : {}),
    };

    if (fallbackOutput) {
      try {
        await writeResult(fallbackOutput, failureResult);
      } catch (writeError) {
        process.stderr.write(`Failed to save verifier result: ${writeError.message}\n`);
      }
    }
    process.stderr.write(`${JSON.stringify(failureResult, null, 2)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  process.stdout.write(usage);
} else {
  await main();
}
