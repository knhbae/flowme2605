import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..');
const outputRoot = path.resolve(
  repoRoot,
  process.env.FLOWME_P35_R2_REVIEW_EVIDENCE_DIR
    ?? path.join('output', 'playwright', 'p35-round2-review-rehearsal'),
);
const scenarioTitles = {
  S01: 'URL·메모 lookup 상태',
  S02: '공개 계획의 날짜·capability',
  S03: '공개 Plan·Item 편집 transaction',
  S04: '저장과 개인 영역 전환',
  S05: '저장 계획의 결과 이동',
  S06: '내 계획 0·1·5·20과 Today/Todo',
  S07: '항목 상세·메모·완료·되돌리기',
  S08: '저장 계획 편집·취소·오류·reload',
  S09: '형식별 fidelity',
  S10: 'Flow Map 선택·보류·충돌',
  S11: '도움·조건·주의 disclosure',
  S12: 'Back·reload·duplicate·retry·failure',
  S13: 'legacy·malformed·missing-base',
  S14: '1·8·24·50 Items와 긴 텍스트',
  S15: 'viewport와 reflow',
  S16: 'keyboard·ARIA·reduced motion',
  S17: 'phase flag rollback — Codex only',
  S18: 'TSV edge fixture',
  S19: 'timezone·DST·overdue·mixed',
  S20: 'routine Item·series·VEVENT',
  S21: 'transport·MIME·파일 전달',
  S22: 'performance evidence 분류',
  S23: 'reviewer free exploration',
};
const generatedNames = new Set([
  'master-manifest.json',
  'local-allowlist.md',
  'index.html',
  'gallery-verification.json',
]);

function git(...args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

function mimeFor(file) {
  const extension = path.extname(file).toLowerCase();
  return ({
    '.png': 'image/png',
    '.json': 'application/json; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.tsv': 'text/tab-separated-values; charset=utf-8',
    '.ics': 'text/calendar; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
  })[extension] ?? 'application/octet-stream';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    if (entry.isFile() && !generatedNames.has(entry.name)) files.push(absolute);
  }
  return files;
}

async function readGroupManifests() {
  const names = (await readdir(outputRoot)).filter((name) => /^group-manifest-s\d{2}-s\d{2}\.json$/u.test(name));
  const manifests = [];
  for (const name of names.sort()) {
    const raw = await readFile(path.join(outputRoot, name), 'utf8');
    manifests.push({ name, data: JSON.parse(raw), rawSha256: sha256(Buffer.from(raw)) });
  }
  return manifests;
}

function normalizeManifestFile(groupManifest, entry) {
  const relativePath = entry.relativePath ?? entry.path;
  if (typeof relativePath !== 'string' || !/^S\d{2}\//u.test(relativePath)) {
    throw new Error(
      `Invalid evidence path in ${groupManifest.name}: ${JSON.stringify(relativePath)}`,
    );
  }
  const normalizedPath = relativePath.replaceAll('\\', '/');
  const absolute = path.resolve(outputRoot, ...normalizedPath.split('/'));
  const relativeToRoot = path.relative(outputRoot, absolute);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error(`Evidence path escapes output root: ${normalizedPath}`);
  }
  const scenarioId = entry.scenarioId ?? normalizedPath.split('/')[0];
  if (!Object.hasOwn(scenarioTitles, scenarioId) || !normalizedPath.startsWith(`${scenarioId}/`)) {
    throw new Error(`Scenario/path mismatch in ${groupManifest.name}: ${normalizedPath}`);
  }
  const byteLength = entry.byteLength ?? entry.bytes;
  const expectedSha256 = String(entry.sha256 ?? '').toUpperCase();
  const mime = entry.mime ?? entry.mediaType ?? mimeFor(normalizedPath);
  if (!Number.isInteger(byteLength) || byteLength < 0 || !/^[0-9A-F]{64}$/u.test(expectedSha256)) {
    throw new Error(`Invalid bytes/hash in ${groupManifest.name}: ${normalizedPath}`);
  }
  return {
    scenarioId,
    relativePath: normalizedPath,
    absolute,
    byteLength,
    expectedSha256,
    mime,
    groupManifest: groupManifest.name,
  };
}

function groupManifestFailures(groupManifest) {
  const { data } = groupManifest;
  const failures = [];
  for (const scenario of data.scenarioStatuses ?? []) {
    if ((scenario.errorCount ?? 0) > 0) {
      failures.push(`${scenario.scenario ?? 'unknown'} errorCount=${scenario.errorCount}`);
    }
    for (const variant of scenario.variants ?? []) {
      if (variant.status !== 'PASS') {
        failures.push(`${scenario.scenario ?? 'unknown'}/${variant.variant ?? 'unknown'}=${variant.status}`);
      }
    }
  }
  if ((data.counts?.failed ?? 0) > 0) failures.push(`counts.failed=${data.counts.failed}`);
  for (const result of data.results ?? []) {
    if (result.status !== 'CAPTURED') failures.push(`${result.scenarioId ?? 'unknown'}=${result.status}`);
  }
  for (const error of data.collectorErrors ?? []) {
    failures.push(`${error.stage ?? 'collector'}: ${error.error ?? JSON.stringify(error)}`);
  }
  return failures;
}

function groupIdentity(groupManifest) {
  const data = groupManifest.data;
  return {
    file: groupManifest.name,
    head: data.git?.head ?? data.product?.head ?? data.sourceSnapshot?.head ?? null,
    buildId: data.buildId ?? data.product?.buildId ?? data.sourceSnapshot?.buildId ?? null,
    dirty: data.git?.dirty ?? data.product?.gitDirty ?? data.sourceSnapshot?.dirty ?? null,
    baseUrl: data.baseUrl ?? data.product?.baseUrl ?? null,
  };
}

const groupManifests = await readGroupManifests();
if (groupManifests.length !== 3) {
  throw new Error(`Expected exactly three group manifests, found ${groupManifests.length}.`);
}
const allowlistedByPath = new Map();
const groupHealth = groupManifests.map((manifest) => {
  const failures = groupManifestFailures(manifest);
  return {
    file: manifest.name,
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    failureCount: failures.length,
    failures,
  };
});
const groupIdentities = groupManifests.map(groupIdentity);
for (const groupManifest of groupManifests) {
  if (!Array.isArray(groupManifest.data.files)) {
    throw new Error(`Missing files array in ${groupManifest.name}.`);
  }
  for (const entry of groupManifest.data.files) {
    const normalized = normalizeManifestFile(groupManifest, entry);
    if (allowlistedByPath.has(normalized.relativePath)) {
      throw new Error(`Duplicate evidence path across group manifests: ${normalized.relativePath}`);
    }
    allowlistedByPath.set(normalized.relativePath, normalized);
  }
}

const diskScenarioFiles = [];
for (const scenarioId of Object.keys(scenarioTitles)) {
  diskScenarioFiles.push(...await walk(path.join(outputRoot, scenarioId)));
}
const diskScenarioPaths = new Set(diskScenarioFiles.map((absolute) => (
  path.relative(outputRoot, absolute).split(path.sep).join('/')
)));
const unmanifestedScenarioFiles = [...diskScenarioPaths]
  .filter((relativePath) => !allowlistedByPath.has(relativePath))
  .sort();
const missingManifestFiles = [...allowlistedByPath.keys()]
  .filter((relativePath) => !diskScenarioPaths.has(relativePath))
  .sort();

const buildId = await readFile(path.join(repoRoot, '.next', 'BUILD_ID'), 'utf8')
  .then((value) => value.trim())
  .catch(() => 'NOT_AVAILABLE');
const headSha = git('rev-parse', 'HEAD');
const workingTreeStatus = git('status', '--porcelain=v1');
const workingTreeDirty = workingTreeStatus.length > 0;
const evidenceClass = workingTreeDirty
  ? 'LOCAL_REHEARSAL_NOT_FINAL'
  : 'CANDIDATE_BOUND_LOCAL_CAPTURE';

const scenarioRows = [];
const allFiles = [];
const integrityFailures = [];
for (const scenarioId of Object.keys(scenarioTitles)) {
  const inventory = [];
  const files = [...allowlistedByPath.values()]
    .filter((entry) => entry.scenarioId === scenarioId)
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  for (const expected of files) {
    const buffer = await readFile(expected.absolute).catch(() => null);
    if (!buffer) continue;
    const actualSha256 = sha256(buffer);
    if (buffer.length !== expected.byteLength || actualSha256 !== expected.expectedSha256) {
      integrityFailures.push({
        relativePath: expected.relativePath,
        expectedBytes: expected.byteLength,
        actualBytes: buffer.length,
        expectedSha256: expected.expectedSha256,
        actualSha256,
        groupManifest: expected.groupManifest,
      });
    }
    const row = {
      scenarioId,
      relativePath: expected.relativePath,
      byteLength: buffer.length,
      sha256: actualSha256,
      mime: expected.mime,
      transport: workingTreeDirty ? 'local_file_rehearsal' : 'candidate_bound_local_file',
      publicationSha: 'TBD',
      directUrl: 'TBD',
    };
    inventory.push(row);
    allFiles.push(row);
  }
  let status = inventory.length > 0
    ? workingTreeDirty ? 'LOCAL_REHEARSAL_CAPTURED' : 'CANDIDATE_BOUND_LOCAL_CAPTURED'
    : 'MISSING';
  if (scenarioId === 'S22') status = 'NOT_ASSESSED';
  if (scenarioId === 'S23') status = 'REVIEWER_CHOSEN_NOT_PRECAPTURED';
  scenarioRows.push({
    scenarioId,
    title: scenarioTitles[scenarioId],
    status,
    fileCount: inventory.length,
    files: inventory,
  });
}

const groupIdentityFailures = groupIdentities.flatMap((identity) => {
  const failures = [];
  if (identity.head !== headSha) failures.push(`${identity.file}: HEAD ${identity.head} != ${headSha}`);
  if (identity.buildId !== buildId) failures.push(`${identity.file}: BUILD_ID ${identity.buildId} != ${buildId}`);
  if (!workingTreeDirty && identity.dirty !== false) {
    failures.push(`${identity.file}: clean candidate capture recorded dirty=${identity.dirty}`);
  }
  return failures;
});

const candidateRoot = path.join(outputRoot, 'candidate');
const candidateArtifactFiles = await walk(candidateRoot);
const candidateArtifacts = [];
for (const absolute of candidateArtifactFiles.sort()) {
  const buffer = await readFile(absolute);
  candidateArtifacts.push({
    relativePath: path.relative(outputRoot, absolute).split(path.sep).join('/'),
    byteLength: buffer.length,
    sha256: sha256(buffer),
    mime: mimeFor(absolute),
  });
}
const candidateProvenance = await readFile(
  path.join(candidateRoot, 'candidate-provenance.json'),
  'utf8',
).then(JSON.parse).catch(() => null);
const candidateManifest = await readFile(
  path.join(candidateRoot, 'candidate-manifest.json'),
  'utf8',
).then(JSON.parse).catch(() => null);
const candidateProvenanceFailures = [];
if (!workingTreeDirty) {
  if (!candidateProvenance?.candidateEligible) {
    candidateProvenanceFailures.push('candidate provenance is missing or not eligible');
  }
  if (candidateProvenance?.product?.sha !== headSha) {
    candidateProvenanceFailures.push('candidate provenance product SHA does not match HEAD');
  }
  if (candidateProvenance?.runtime?.buildId !== buildId) {
    candidateProvenanceFailures.push('candidate provenance BUILD_ID does not match current build');
  }
  if (candidateManifest?.productCandidateSha !== headSha || candidateManifest?.buildId !== buildId) {
    candidateProvenanceFailures.push('candidate manifest identity does not match HEAD/BUILD_ID');
  }
}
const masterManifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  evidenceClass,
  reviewerRunnable: false,
  reasonNotRunnable: [
    ...(workingTreeDirty ? ['product candidate SHA and clean-tree proof are not frozen'] : []),
    ...(!workingTreeDirty && candidateProvenanceFailures.length > 0
      ? ['candidate provenance gate is incomplete or mismatched']
      : []),
    'publication SHA and direct URLs are not assigned',
    'this local output is not available to Claude Design',
  ],
  observedUsers: 0,
  performance: 'NOT_ASSESSED',
  actualBrowserZoom200: 'NOT_ASSESSED',
  productCandidateSha: workingTreeDirty ? 'TBD' : headSha,
  workingTreeDirty,
  workingTreeStatus,
  buildId,
  groupManifests: groupManifests.map((manifest) => ({
    file: manifest.name,
    sha256: manifest.rawSha256,
  })),
  groupHealth,
  groupIdentities,
  groupIdentityFailures,
  candidateProvenance,
  candidateManifest,
  candidateArtifacts,
  manifestIntegrity: {
    allowlistedFileCount: allowlistedByPath.size,
    unmanifestedScenarioFileCount: unmanifestedScenarioFiles.length,
    unmanifestedScenarioFiles,
    missingManifestFileCount: missingManifestFiles.length,
    missingManifestFiles,
    hashOrByteFailureCount: integrityFailures.length,
    hashOrByteFailures: integrityFailures,
  },
  scenarios: scenarioRows,
  summary: {
    scenarioCount: scenarioRows.length,
    capturedScenarioCount: scenarioRows.filter((row) => row.fileCount > 0).length,
    fileCount: allFiles.length,
    missingScenarioIds: scenarioRows.filter((row) => row.status === 'MISSING').map((row) => row.scenarioId),
  },
};
await writeFile(
  path.join(outputRoot, 'master-manifest.json'),
  `${JSON.stringify(masterManifest, null, 2)}\n`,
  'utf8',
);

const allowlistRows = allFiles.map((file) => (
  `| ${file.scenarioId} | \`${file.relativePath}\` | ${file.byteLength} | \`${file.sha256}\` | ${file.mime} | \`TBD\` | \`TBD\` | \`${evidenceClass}\` |`
));
const allowlist = `# Local evidence allowlist — rehearsal only

> reviewer status: \`NOT_RUNNABLE\`
>
> product candidate SHA: \`${workingTreeDirty ? 'TBD' : headSha}\`
>
> build ID: \`${buildId}\`
>
> publication SHA/direct URL: \`TBD\`

이 파일은 hash/bytes 수집 로직을 검증하기 위한 로컬 rehearsal이다. final blind allowlist로 전달하지 않는다.

| scenario | relative path | bytes | SHA-256 | MIME | publication SHA | direct URL | status |
|---|---|---:|---|---|---|---|---|
${allowlistRows.join('\n')}
`;
await writeFile(path.join(outputRoot, 'local-allowlist.md'), allowlist, 'utf8');

const scenarioSections = scenarioRows.map((scenario) => {
  const images = scenario.files.filter((file) => file.mime === 'image/png');
  const resources = scenario.files.filter((file) => file.mime !== 'image/png');
  return `<section id="${scenario.scenarioId}">
    <header><span>${scenario.scenarioId}</span><h2>${escapeHtml(scenario.title)}</h2><code>${scenario.status}</code></header>
    <div class="images">${images.map((file) => `<figure><a href="${escapeHtml(file.relativePath)}"><img src="${escapeHtml(file.relativePath)}" alt="${scenario.scenarioId} ${escapeHtml(path.basename(file.relativePath))}"></a><figcaption>${escapeHtml(path.basename(file.relativePath))}</figcaption></figure>`).join('')}</div>
    <ul>${resources.map((file) => `<li><a href="${escapeHtml(file.relativePath)}">${escapeHtml(file.relativePath)}</a> <small>${file.mime} · ${file.byteLength} bytes · ${file.sha256.slice(0, 12)}…</small></li>`).join('')}</ul>
  </section>`;
}).join('\n');
const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>P35 Round 2 review evidence rehearsal</title>
<style>
:root{color-scheme:light;--ink:#20231f;--muted:#646b63;--line:#d9ddd7;--bg:#f6f4ef;--surface:#fff;--warn:#8a4b10}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.5}main{max-width:1280px;margin:auto;padding:32px 24px 72px}.notice{padding:16px 18px;border:1px solid #e8bf93;background:#fff7ed;color:#683607}nav{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0}nav a{padding:6px 9px;border:1px solid var(--line);background:var(--surface);color:inherit;text-decoration:none}section{margin:28px 0;padding:20px;border:1px solid var(--line);background:var(--surface)}section header{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}section header span{font-weight:800}h1,h2{margin:0}h2{font-size:20px}code,small{color:var(--muted)}.images{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:16px}figure{margin:0}img{display:block;max-width:100%;max-height:760px;margin:auto;border:1px solid var(--line)}figcaption{margin-top:6px;font-size:12px;overflow-wrap:anywhere}li{overflow-wrap:anywhere}@media(max-width:720px){main{padding:18px 12px 48px}.images{grid-template-columns:1fr}section{padding:14px}}
</style></head><body><main>
<h1>P35 Round 2 독립 검토 evidence rehearsal</h1>
<p class="notice"><strong>검토 시작 금지:</strong> 이 파일은 ${workingTreeDirty ? 'dirty working tree rehearsal' : 'clean candidate local capture'}이다. publication SHA와 direct URL이 없으며 실제 사용자 관찰은 0명이다.</p>
<p>BUILD_ID <code>${escapeHtml(buildId)}</code> · performance <code>NOT_ASSESSED</code> · actual browser 200% zoom <code>NOT_ASSESSED</code></p>
<nav>${Object.keys(scenarioTitles).map((id) => `<a href="#${id}">${id}</a>`).join('')}</nav>
${scenarioSections}
</main></body></html>`;
await writeFile(path.join(outputRoot, 'index.html'), html, 'utf8');

console.log(JSON.stringify({ outputRoot, ...masterManifest.summary }, null, 2));
if (
  masterManifest.summary.missingScenarioIds.length > 0
  || unmanifestedScenarioFiles.length > 0
  || missingManifestFiles.length > 0
  || integrityFailures.length > 0
  || groupHealth.some((group) => group.status !== 'PASS')
  || groupIdentityFailures.length > 0
  || (!workingTreeDirty && candidateProvenanceFailures.length > 0)
) process.exitCode = 1;
