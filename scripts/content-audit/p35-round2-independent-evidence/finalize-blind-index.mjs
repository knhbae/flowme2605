import { createHash } from 'node:crypto';
import { readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..');
const stageRootValue = process.env.FLOWME_P35_R2_BLIND_STAGE_DIR;
const assetSha = process.env.FLOWME_P35_R2_BLIND_ASSET_SHA?.trim().toLowerCase();
const githubRepo = process.env.FLOWME_GITHUB_REPO?.trim() || 'knhbae/flowme2605';
if (!stageRootValue) throw new Error('FLOWME_P35_R2_BLIND_STAGE_DIR is required.');
if (!/^[0-9a-f]{40}$/u.test(assetSha ?? '')) {
  throw new Error('FLOWME_P35_R2_BLIND_ASSET_SHA must be a full 40-character commit SHA.');
}
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(githubRepo)) {
  throw new Error('FLOWME_GITHUB_REPO must use owner/repository form.');
}

const stageRoot = path.resolve(repoRoot, stageRootValue);
const evidenceRoot = path.join(stageRoot, 'evidence');
const candidateRoot = path.join(evidenceRoot, 'candidate');
const manifestPath = path.join(evidenceRoot, 'master-manifest.json');
const candidateManifestPath = path.join(candidateRoot, 'candidate-manifest.json');
const provenancePath = path.join(candidateRoot, 'candidate-provenance.json');
const contractPath = path.join(stageRoot, 'review', '05-evidence-contract-ko.md');
const allowlistPath = path.join(stageRoot, 'review', '07-blind-evidence-allowlist-template.md');
const claudeAllowlistPath = path.join(stageRoot, 'review', '08-claude-static-evidence-allowlist.md');
const claudePromptPath = path.join(stageRoot, 'review', '03-claude-pass1-prompt-ko.md');
const reviewReadmePath = path.join(stageRoot, 'review', 'README-ko.md');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const candidateManifest = JSON.parse(await readFile(candidateManifestPath, 'utf8'));
const provenance = JSON.parse(await readFile(provenancePath, 'utf8'));

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function mimeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return ({
    '.json': 'application/json; charset=utf-8',
    '.log': 'text/plain; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.png': 'image/png',
    '.html': 'text/html; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.tsv': 'text/tab-separated-values; charset=utf-8',
    '.ics': 'text/calendar; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
  })[extension] ?? 'application/octet-stream';
}

function ensureInside(root, relativePath) {
  const normalized = String(relativePath).replaceAll('\\', '/');
  const absolute = path.resolve(root, ...normalized.split('/'));
  const relative = path.relative(root, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Artifact path escapes evidence root: ${relativePath}`);
  }
  return { absolute, normalized };
}

function encodedPath(relativePath) {
  return relativePath.split('/').map(encodeURIComponent).join('/');
}

const rawBase = (
  process.env.FLOWME_P35_R2_ASSET_RAW_BASE_URL?.trim()
  || `https://raw.githubusercontent.com/${githubRepo}/${assetSha}`
).replace(/\/$/u, '');
function evidenceUrl(relativePath) {
  return `${rawBase}/evidence/${encodedPath(relativePath)}`;
}

function escapeCell(value) {
  return String(value ?? '')
    .replaceAll('|', '\\|')
    .replace(/\r?\n/gu, '<br>');
}

function code(value) {
  return `\`${escapeCell(value)}\``;
}

function formatKst(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'CAPTURE_TIMESTAMP_MISSING';
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
  return `${parts.replace(' ', 'T')}+09:00`;
}

async function verifyInventoryEntry(entry) {
  const { absolute, normalized } = ensureInside(evidenceRoot, entry.relativePath);
  const buffer = await readFile(absolute);
  const actual = {
    relativePath: normalized,
    byteLength: buffer.length,
    sha256: sha256(buffer),
    mime: entry.mime ?? mimeFor(normalized),
    role: entry.role ?? 'candidate_artifact',
  };
  if (actual.byteLength !== entry.byteLength || actual.sha256 !== String(entry.sha256).toLowerCase()) {
    throw new Error(`Candidate artifact integrity mismatch: ${normalized}`);
  }
  return actual;
}

if (
  manifest.productCandidateSha === 'TBD'
  || manifest.workingTreeDirty
  || provenance.classification !== 'CANDIDATE_BOUND_CAPTURE'
  || provenance.candidateEligible !== true
  || provenance.product?.clean !== true
  || candidateManifest.candidateEligible !== true
) {
  throw new Error('Final blind index requires a clean candidate-bound manifest and provenance.');
}
if (
  manifest.productCandidateSha !== provenance.product.sha
  || manifest.productCandidateSha !== candidateManifest.productCandidateSha
  || manifest.buildId !== provenance.runtime.buildId
  || manifest.buildId !== candidateManifest.buildId
) {
  throw new Error('Product SHA or BUILD_ID differs across master manifest and provenance.');
}
if (
  provenance.build?.status !== 'PASS'
  || provenance.build?.sourceProvided !== true
  || provenance.build?.exitCode !== 0
  || !provenance.build?.command
) {
  throw new Error('Final blind index requires copied build log, exact command, and exit code 0.');
}
if (!Array.isArray(candidateManifest.artifacts) || candidateManifest.artifacts.length < 6) {
  throw new Error('Candidate manifest is missing the required provenance artifact inventory.');
}

const candidateArtifacts = [];
for (const entry of candidateManifest.artifacts) {
  candidateArtifacts.push(await verifyInventoryEntry(entry));
}
for (const entry of candidateManifest.groupManifests ?? []) {
  await verifyInventoryEntry({ ...entry, role: 'group_manifest' });
}

const cleanProof = candidateArtifacts.find((entry) => entry.role === 'product_clean_tree_proof');
const seedContract = candidateArtifacts.find((entry) => entry.role === 'seed_reset_contract');
const buildLog = candidateArtifacts.find((entry) => entry.role === 'build_log');
const buildMetadata = candidateArtifacts.find((entry) => entry.role === 'build_metadata');
const runtimeBuildIdentity = candidateArtifacts.find((entry) => entry.role === 'runtime_build_identity');
const provenanceArtifact = candidateArtifacts.find((entry) => entry.role === 'candidate_provenance');
for (const [label, entry] of Object.entries({
  cleanProof,
  seedContract,
  buildLog,
  buildMetadata,
  runtimeBuildIdentity,
  provenanceArtifact,
})) {
  if (!entry) throw new Error(`Candidate manifest is missing ${label}.`);
}
const cleanProofText = await readFile(
  ensureInside(evidenceRoot, cleanProof.relativePath).absolute,
  'utf8',
);
const nonBranchStatusLines = cleanProofText.split(/\r?\n/u)
  .filter(Boolean)
  .filter((line) => !line.startsWith('## '));
if (nonBranchStatusLines.length > 0) {
  throw new Error(`Clean-tree proof contains changes: ${nonBranchStatusLines.join('; ')}`);
}
if (sha256(Buffer.from(cleanProofText, 'utf8')) !== provenance.product.statusShortBranchSha256) {
  throw new Error('Clean-tree proof hash differs from candidate provenance.');
}

const scenarioEvidenceRows = manifest.scenarios.flatMap((scenario) =>
  scenario.files.map((file) => ({ scenario, file })),
);
const globalEntries = [];
async function addGlobal(relativePath, role) {
  const { absolute, normalized } = ensureInside(evidenceRoot, relativePath);
  const buffer = await readFile(absolute);
  globalEntries.push({
    scenarioId: 'GLOBAL',
    stateId: role,
    relativePath: normalized,
    byteLength: buffer.length,
    sha256: sha256(buffer),
    mime: mimeFor(normalized),
  });
}
// The local master manifest intentionally records pre-publication transport
// state (`reviewerRunnable: false`). Keep it in the staged evidence for the
// publication verifier, but do not expose it as a reviewer input.
for (const entry of candidateManifest.groupManifests ?? []) {
  await addGlobal(entry.relativePath, path.basename(entry.relativePath, '.json'));
}
await addGlobal('candidate/candidate-manifest.json', 'candidate-manifest');
for (const entry of candidateArtifacts) {
  await addGlobal(entry.relativePath, entry.role);
}

const evidenceRows = [
  ...globalEntries,
  ...scenarioEvidenceRows.map(({ scenario, file }) => ({
    scenarioId: scenario.scenarioId,
    // Keep the scenario-relative path as the evidence ID. The numeric filename
    // prefix preserves storyboard order and the full path prevents ambiguous
    // basenames across scenarios.
    stateId: file.relativePath,
    relativePath: file.relativePath,
    byteLength: file.byteLength,
    sha256: String(file.sha256).toLowerCase(),
    mime: file.mime,
  })),
];
const claudeSafeGlobalStateIds = new Set([
  'product_clean_tree_proof',
  'build_log',
  'build_metadata',
]);
function reviewerScope(entry) {
  if (entry.scenarioId === 'S17') return 'Codex only — Claude excluded';
  if (entry.scenarioId === 'GLOBAL' && !claudeSafeGlobalStateIds.has(entry.stateId)) {
    return 'Codex only — Claude excluded';
  }
  return 'Codex+Claude';
}

function reviewerRowStatus(entry) {
  if (entry.scenarioId === 'S17') return 'CODEX_ONLY_READY';
  if (entry.scenarioId === 'S22') return 'NOT_ASSESSED_ALLOWED';
  if (entry.scenarioId === 'S23') return 'REVIEWER_ACTION_REQUIRED';
  return 'READY';
}

function renderRows(entries) {
  return entries.map((entry) => {
    const url = evidenceUrl(entry.relativePath);
    return `| ${entry.scenarioId} | \`${escapeCell(entry.stateId)}\` | ${reviewerScope(entry)} | [direct](${url}) | \`${assetSha}\` | ${entry.byteLength} | \`${entry.sha256}\` | ${entry.mime} | commit-pinned HTTPS raw | \`${manifest.productCandidateSha}\` | \`${manifest.buildId}\` | \`${reviewerRowStatus(entry)}\` |`;
  });
}

const indexShaState = 'EXTERNAL_LAUNCH_ENVELOPE_REQUIRED_AFTER_INDEX_COMMIT';
const sessionIdsState = 'FREEZE_TIME_SESSION_IDS_RECORDED_AT_REVIEW_START';
function renderAllowlist({ title, entries, scopeNote }) {
  return `# ${title}

> release: \`PASS1_BLIND_ONLY\`
>
> current status: \`INDEX_CONTENT_READY / B_SHA_IN_EXTERNAL_ENVELOPE_AFTER_COMMIT\`
>
> product candidate SHA: \`${manifest.productCandidateSha}\`
>
> build ID: \`${manifest.buildId}\`
>
> blind evidence asset SHA: \`${assetSha}\`
>
> blind release index SHA: \`${indexShaState}\`

각 direct URL은 blind-only asset commit A에 고정돼 있다. 이 allowlist를 담는 index commit B의 SHA는 자기 파일 안에 포함할 수 없다. 따라서 \`${indexShaState}\`는 미결 placeholder가 아니라, B commit 직후 coordinator가 외부 launch envelope에 실제 SHA를 기록해야 한다는 lifecycle state다. reviewer session ID는 검토 시작과 동시에 freeze record에 기록하며 사전 evidence 입력이 아니다.

${scopeNote}

상태 해석: \`NOT_ASSESSED_ALLOWED\`는 S22의 의도적 비평가 항목이고, \`REVIEWER_ACTION_REQUIRED\`는 S23에서 reviewer가 직접 자유 탐색을 수행해야 한다는 뜻이다. 두 상태를 일반 \`READY\`로 오인하지 않는다.

| scenario | state ID | reviewer scope | direct URL | asset SHA | bytes | raw SHA-256 | MIME | transport | product SHA | build ID | status |
|---|---|---|---|---|---:|---|---|---|---|---|---|
${renderRows(entries).join('\n')}
`;
}
const allowlist = renderAllowlist({
  title: 'Blind evidence allowlist — Codex runtime and shared static evidence',
  entries: evidenceRows,
  scopeNote: 'S17은 Codex 전용 runtime rollback evidence다. Claude Design은 S17 URL을 열거나 점수에 포함하지 않는다.',
});
await writeFile(allowlistPath, allowlist, 'utf8');
const claudeEvidenceRows = evidenceRows.filter((entry) => (
  entry.scenarioId !== 'S17'
  && (
    entry.scenarioId !== 'GLOBAL'
    || claudeSafeGlobalStateIds.has(entry.stateId)
  )
));
const claudeAllowlist = renderAllowlist({
  title: 'Claude Design blind static evidence allowlist — S17 excluded',
  entries: claudeEvidenceRows,
  scopeNote: '이 allowlist에는 S17 파일과 URL이 물리적으로 없다. Claude Design은 이 파일만 사용하고 Codex allowlist를 열지 않는다.',
});
await writeFile(claudeAllowlistPath, claudeAllowlist, 'utf8');

const captureStartMs = Date.parse(provenance.capture.startedAtUtc ?? '');
const captureCompletedMs = Date.parse(provenance.capture.completedAtUtc ?? '');
if (
  !Number.isFinite(captureStartMs)
  || !Number.isFinite(captureCompletedMs)
  || captureStartMs > captureCompletedMs
  || (provenance.capture.groupManifests ?? []).length !== 3
  || provenance.capture.groupManifests.some((group) => {
    const startedAt = Date.parse(group.startedAt ?? '');
    const completedAt = Date.parse(group.completedAt ?? '');
    return !Number.isFinite(startedAt) || !Number.isFinite(completedAt) || startedAt > completedAt;
  })
) {
  throw new Error('Candidate capture window is incomplete, invalid, or reversed.');
}
const branchProof = cleanProofText.trim().replace(/\r?\n/gu, ' · ');
const captureWindow = `${formatKst(provenance.capture.startedAtUtc)} → ${formatKst(provenance.capture.completedAtUtc)}`;
const browserOs = [
  ...(provenance.environment.browsers ?? []),
  ...(provenance.environment.operatingSystems ?? []),
  `${provenance.environment.osType} ${provenance.environment.osRelease} ${provenance.environment.architecture}`,
  `Node ${provenance.environment.node}`,
].filter(Boolean).join(' · ');
const timezoneLocale = `timezone ${(provenance.environment.timezones ?? []).join(', ')} · locale ${(provenance.environment.locales ?? []).join(', ')}`;
const requiredGlobalRows = [
  ['product_candidate_sha', '검토 대상 제품 commit SHA', code(manifest.productCandidateSha)],
  ['product_candidate_ref', 'branch/tag 설명용 값; SHA를 대신하지 않음', code(`${provenance.product.ref}${provenance.product.upstreamRef ? ` → ${provenance.product.upstreamRef}@${provenance.product.upstreamSha}` : ' · no upstream'}`)],
  ['product_clean_tree_proof', 'candidate checkout의 git status --short --branch 원문', `[direct proof](${evidenceUrl(cleanProof.relativePath)}) · ${code(branchProof)}`],
  ['product_clean_tree_proof_sha256', '위 원문 파일 SHA-256', code(cleanProof.sha256)],
  ['build_id', 'candidate에서 생성된 runtime build identity', code(manifest.buildId)],
  ['build_command', '정확한 명령과 exit code', `${code(provenance.build.command)} · exit ${code(provenance.build.exitCode)}`],
  ['build_log_sha256', '전체 build log SHA-256', `[direct build log](${evidenceUrl(buildLog.relativePath)}) · ${code(buildLog.sha256)}`],
  ['runtime_build_identity', 'served /flows HTML이 같은 BUILD_ID를 포함하는지 확인', `${code(provenance.runtime.buildIdentityProbe?.status)} · HTTP ${code(provenance.runtime.buildIdentityProbe?.httpStatus)} · contains ${code(provenance.runtime.buildIdentityProbe?.containsBuildId)} · ${code(runtimeBuildIdentity.sha256)}`],
  ['blind_evidence_publication_sha', 'capture·raw artifact를 먼저 게시한 blind-only asset commit A SHA', code(assetSha)],
  ['blind_release_index_sha', 'allowlist와 prompt를 게시할 blind-only index commit B SHA', code(indexShaState)],
  ['blind_publication_transport', 'role별 allowlist의 file-level direct URL만 사용', `${code(assetSha)} · verified via role-specific allowlist`],
  ['runtime_url', 'Codex 전용 URL; Claude 입력이 아님', code('CODEX_ONLY_NOT_DISCLOSED')],
  ['seed_reset_command', 'fixture 초기화 명령과 결과', `${code(provenance.seedReset.command)} · ${code(provenance.seedReset.result)} · ${code(seedContract.sha256)}`],
  ['seed_manifest_sha256', 'seed/fixture manifest SHA-256', code(seedContract.sha256)],
  ['captured_at_kst', 'capture 시작/종료 시각', code(captureWindow)],
  ['browser_os_versions', 'browser, OS, locale', code(browserOs)],
  ['timezone_locale', 'timezone, locale, DST fixture 기준', code(timezoneLocale)],
  ['review_session_ids', 'fresh Codex/Claude session IDs', code(sessionIdsState)],
  ['observed_users', '항상 실제 수치', code(0)],
];
const requiredGlobalSection = `## REQUIRED_GLOBAL

모든 scenario가 공유하는 chain of custody다. 아래 값은 asset commit A와 candidate provenance에서 확정했다. reviewer 공통 문서에는 role 격리를 위해 full provenance·candidate manifest·seed contract URL을 싣지 않는다. Codex는 07 allowlist에서만 원본을 확인하고 Claude Design은 08 allowlist의 safe global만 사용한다.

| 필드 | 요구 사항 | 현재 값 |
|---|---|---|
${requiredGlobalRows.map(([field, requirement, value]) => `| \`${field}\` | ${requirement} | ${value} |`).join('\n')}

\`${indexShaState}\`와 \`${sessionIdsState}\`는 evidence 미제공이나 미결 placeholder를 뜻하지 않는다. index commit B SHA는 commit 직후 외부 launch envelope에 기록한다. reviewer session ID는 사전 입력이 아니라 실제 fresh session 시작과 동시에 생성해 각 freeze record와 coordinator envelope에 기록한다. 두 lifecycle 값을 조작할 수 없으면 전달 또는 검토를 중단한다.

\`product_candidate_sha\`, \`build_id\`, \`blind_evidence_publication_sha\`, \`blind_release_index_sha\`는 서로 다른 identity다. product source, runtime build, asset commit A, index commit B를 각각 검증한다.
`;
const originalContract = await readFile(contractPath, 'utf8');
const requiredStart = originalContract.indexOf('## REQUIRED_GLOBAL');
const perScenarioStart = originalContract.indexOf('\n## REQUIRED_PER_SCENARIO', requiredStart);
if (requiredStart < 0 || perScenarioStart < 0) {
  throw new Error('Evidence contract does not contain REQUIRED_GLOBAL and REQUIRED_PER_SCENARIO sections.');
}
const finalizedContract = `${originalContract.slice(0, requiredStart)}${requiredGlobalSection}${originalContract.slice(perScenarioStart)}`;
const finalizedGlobal = finalizedContract.slice(
  finalizedContract.indexOf('## REQUIRED_GLOBAL'),
  finalizedContract.indexOf('\n## REQUIRED_PER_SCENARIO'),
);
if (/\bTBD\b/u.test(finalizedGlobal)) {
  throw new Error('Finalized REQUIRED_GLOBAL still contains a TBD placeholder.');
}
await writeFile(contractPath, finalizedContract, 'utf8');

const releaseMetadata = {
  schemaVersion: 2,
  release: 'PASS1_BLIND_ONLY',
  state: 'INDEX_CONTENT_READY_EXTERNAL_LAUNCH_ENVELOPE_PENDING',
  productCandidateSha: manifest.productCandidateSha,
  productCandidateRef: provenance.product.ref,
  buildId: manifest.buildId,
  buildCommand: provenance.build.command,
  buildExitCode: provenance.build.exitCode,
  buildLogSha256: buildLog.sha256,
  blindEvidenceAssetSha: assetSha,
  blindReleaseIndexSha: indexShaState,
  reviewSessionIds: sessionIdsState,
  assetRawBase: rawBase,
  candidateProvenanceUrl: evidenceUrl(provenanceArtifact.relativePath),
  candidateManifestUrl: evidenceUrl('candidate/candidate-manifest.json'),
  evidenceRowCount: evidenceRows.length,
  claudeEvidenceRowCount: claudeEvidenceRows.length,
  globalEvidenceRowCount: globalEntries.length,
  observedUsers: 0,
  performance: 'NOT_ASSESSED',
  actualBrowserZoom200: 'NOT_ASSESSED',
  launchGate: {
    indexCommit: 'Create index commit B, then record its full SHA in the external launch envelope.',
    sessions: 'Session IDs are freeze-time values created and recorded when each fresh review session starts; they are not pre-start evidence inputs.',
    interpretation: 'These are explicit lifecycle states, not missing evidence placeholders.',
  },
};
await writeFile(
  path.join(stageRoot, 'release-metadata.json'),
  `${JSON.stringify(releaseMetadata, null, 2)}\n`,
  'utf8',
);
await writeFile(
  path.join(stageRoot, 'README.md'),
  `# P35 Round 2 Pass 1 blind publication\n\n` +
    `- state: \`INDEX_CONTENT_READY_EXTERNAL_LAUNCH_ENVELOPE_PENDING\`\n` +
    `- product candidate: \`${manifest.productCandidateSha}\`\n` +
    `- build ID: \`${manifest.buildId}\`\n` +
    `- evidence asset SHA: \`${assetSha}\`\n` +
    `- index SHA: \`${indexShaState}\`\n` +
    `- review session IDs: \`${sessionIdsState}\`\n` +
    `- observed users: \`0\`\n\n` +
    `위 두 state는 누락값이 아니다. index commit B SHA는 외부 launch envelope에, fresh reviewer session ID는 각 검토 시작·freeze 시점에 기록한다.\n\n` +
    `coordinator는 [review/README-ko.md](./review/README-ko.md)를 역할별 전달 전 점검에만 사용한다. reviewer에게는 자기 전용 prompt와 allowlist의 commit-pinned B URL만 전달한다.\n`,
  'utf8',
);

let claudePrompt = (await readFile(claudePromptPath, 'utf8')).replace(/\r\n?/gu, '\n');
claudePrompt = claudePrompt.replaceAll(
  './07-blind-evidence-allowlist-template.md',
  './08-claude-static-evidence-allowlist.md',
);
const claudeHeading = '# Claude Design Pass 1 — blind static IA/visual/copy review\n';
if (!claudePrompt.startsWith(claudeHeading)) {
  throw new Error('Claude prompt heading changed; refusing an ambiguous allowlist rewrite.');
}
claudePrompt = claudePrompt.replace(
  claudeHeading,
  `${claudeHeading}\n> Claude 입력 allowlist: [S17이 제외된 static allowlist](./08-claude-static-evidence-allowlist.md)\n>\n> S17 URL은 Claude package에 제공하지 않으며 열거나 점수에 포함하지 않습니다.\n`,
);
await writeFile(claudePromptPath, claudePrompt, 'utf8');

const reviewReadme = `# Pass 1 blind release — coordinator index

> 상태: \`INDEX_CONTENT_READY / EXTERNAL_LAUNCH_ENVELOPE_PENDING\`
>
> 검토 성격: \`INDEPENDENT BLIND REVIEW INPUT\`
>
> 관찰 사용자: \`0명\`

이 디렉터리는 clean product candidate와 asset commit A에 결속된 Pass 1 입력을 coordinator가 점검하는 index다. evidence URL·bytes·SHA-256과 REQUIRED_GLOBAL은 완성됐다. 이 README 자체는 reviewer 시작 자료가 아니다. coordinator는 index commit B를 만든 뒤 그 SHA를 외부 launch envelope에 기록하고 reviewer별 prompt와 allowlist만 전달한다.

## 세션 격리와 lifecycle 기록

- Codex와 Claude Design은 각각 새 세션에서 시작한다.
- index commit B SHA는 자기 파일 안이 아니라 외부 launch envelope에 기록한다.
- reviewer session ID는 사전 evidence 입력이 아니다. fresh session 시작과 동시에 생성해 reviewer freeze와 coordinator envelope에 기록한다.
- 기존 대화·메모리·다른 reviewer 결과가 노출되면 \`BLIND_CONTAMINATED\`로 중단한다.

## reviewer별 입력

1. 공통: [중립 brief](./01-neutral-review-brief-ko.md), [scenario matrix](./04-neutral-scenario-matrix-ko.md), [evidence contract](./05-evidence-contract-ko.md), [scorecard](./06-scorecard-ko.md)
2. Codex: [Codex prompt](./02-codex-pass1-prompt-ko.md), [Codex·shared allowlist](./07-blind-evidence-allowlist-template.md)
3. Claude Design: [Claude prompt](./03-claude-pass1-prompt-ko.md), [S17 제외 static allowlist](./08-claude-static-evidence-allowlist.md)

S17은 \`CODEX_ONLY_READY\`이며 Claude allowlist에는 URL 자체가 없다. S22의 \`NOT_ASSESSED_ALLOWED\`는 performance budget/trace가 없는 의도적 예외다. S23의 \`REVIEWER_ACTION_REQUIRED\`는 정적 PASS가 아니라 reviewer가 직접 자유 탐색을 수행해야 하는 action state다.

## 시작 gate

- product candidate SHA·clean proof·BUILD_ID·build log·seed/reset manifest가 서로 일치한다.
- asset commit A의 direct URL이 열리고 allowlist hash와 일치한다.
- index commit B SHA가 외부 launch envelope에 기록됐다.
- reviewer는 자기 전용 prompt와 allowlist만 받는다.

## 산출물

- Codex finding: \`CX-001\`부터 연속 번호
- Claude Design finding: \`CD-001\`부터 연속 번호
- scenario 결과: \`PASS | REVISE | BLOCKED | NOT_RUN\`
- 성능은 별도 측정 입력이 없으므로 \`NOT_ASSESSED\`

제품 코드, fixture, test, 문서 또는 배포 상태를 수정하지 않는다.
`;
await writeFile(reviewReadmePath, reviewReadme, 'utf8');

const finalAllowlist = await readFile(allowlistPath, 'utf8');
const finalClaudeAllowlist = await readFile(claudeAllowlistPath, 'utf8');
const finalReviewReadme = await readFile(reviewReadmePath, 'utf8');
if (/\bTBD\b/u.test(finalAllowlist) || /\bTBD\b/u.test(finalClaudeAllowlist)) {
  throw new Error('Final blind allowlist still contains a TBD placeholder.');
}
if (/DO_NOT_RUN|EVIDENCE_INCOMPLETE|\bTBD\b/u.test(finalReviewReadme)) {
  throw new Error('Final review README still contains a pre-publication stop state.');
}
if (
  finalClaudeAllowlist.includes('| S17 |')
  || finalClaudeAllowlist.includes('/S17/')
  || finalClaudeAllowlist.includes('group-manifest-s17-s23')
  || claudePrompt.includes('./07-blind-evidence-allowlist-template.md')
) {
  throw new Error('Claude static input still exposes the Codex-only S17 allowlist.');
}
if (
  finalizedContract.includes('candidate-provenance.json')
  || finalizedContract.includes('candidate-manifest.json')
  || finalizedContract.includes('seed-reset-contract.json')
  || finalizedContract.includes('group-manifest-s17-s23')
) {
  throw new Error('Common evidence contract exposes a role-restricted global artifact.');
}
await rm(path.join(stageRoot, 'stage-record.json'), { force: true });
await stat(contractPath);
process.stdout.write(`${JSON.stringify(releaseMetadata, null, 2)}\n`);
