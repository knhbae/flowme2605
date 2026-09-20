import { execFileSync } from 'node:child_process';
import { readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Explicit checkpoint scope. Never add ignored output, profiles, raw captures,
// or the unrelated 7/27 architecture files. Default is read-only inventory.
const git = args => execFileSync('git', ['-c', 'core.quotepath=false', ...args], { encoding: 'utf8' });
const dirty = [...new Set([...git(['ls-files', '--modified', '--others', '--exclude-standard', '-z']).split('\0'),
  ...git(['diff', '--cached', '--name-only', '-z']).split('\0')].filter(Boolean))].sort();
const exact = new Set([
  '.github/workflows/ci.yml', '.gitattributes', 'package.json', 'package-lock.json', 'vercel.json',
  'components/flow/DateGroupedTodoList.tsx', 'components/flow/my-flow/MyPlanExecutionSurface.tsx',
  'docs/DECISIONS.md', 'docs/STATUS.md', 'docs/ROADMAP.md', 'docs/PROJECT_CONTROL.md',
  'lib/flow/content-lab.test.ts', 'lib/flow/seed-flows.ts', 'lib/flow/seed-flows.test.ts',
  'lib/flow/source-fit.ts', 'lib/flow/source-fit.test.ts', 'lib/flow/source-freshness.test.ts',
  'tests/fixtures/personal-workspace-k3b-imported-memo.ts',
  'tests/e2e/integrated-product-poc-portable.spec.ts', 'tests/e2e/integrated-product-poc-portable.config.ts',
  'docs/content-audit/2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html',
  'docs/content-audit/2026-09-04-flowme-integrated-poc-p3h1-android-device-runner-ko.html',
]);
const scripts = new Set([
  'build-contextual-result-runtime.cjs', 'build-contextual-result-runtime.mjs', 'build-contextual-result-runtime.test.mjs',
  'program-verify.mjs', 'program-check.mjs', 'program-browser-record.mjs', 'program-browser-record.test.mjs',
  'serve-p3h1-android-device.mjs', 'serve-p3h1-android-device.test.mjs',
  'verify-p3h1-android-evidence.ts', 'verify-p3h1-android-evidence.test.ts',
  'checkpoint-doc-evidence.mjs', 'checkpoint-scope.mjs',
].map(name => `scripts/personal-workspace-poc/${name}`));
const auditFiles = new Set([
  'docs/content-audit/2026-09-04-flowme-dog-adoption-source-review-evidence/audit.md',
  'docs/content-audit/2026-09-07-flow-source-freshness-refresh/audit.md',
  'docs/content-audit/2026-09-07-flow-source-freshness-refresh/review-ledger.json',
  'docs/content-audit/2026-09-20-flow-source-freshness-preservation/README.md',
]);
function owned(path) {
  if (exact.has(path) || scripts.has(path) || auditFiles.has(path)) return true;
  if (/^(?:components|lib)\/flow\/integrated-poc\//.test(path)) return true;
  if (path.startsWith('components/flow/personal-workspace-poc/') || path.startsWith('lib/flow/personal-workspace-poc')) return true;
  if (path.startsWith('tests/fixtures/poc-source-baselines/')) return true;
  if (path.startsWith('docs/specs/') && !path.startsWith('docs/specs/2026-07-27-') && /\.(?:md|json)$/.test(path) && !path.includes('/artifacts/')) return true;
  return /^docs\/content-audit\/(?:2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets|2026-09-04-flowme-integrated-poc-p3h1-android-device-runner-ko-assets)\//.test(path) && /\.(?:js|cjs|mjs|html|css|json)$/.test(path);
}
const selected = dirty.filter(owned);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const secretPatterns = [ /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /gh[pousr]_[A-Za-z0-9]{30,}/, /github_pat_[A-Za-z0-9_]{40,}/, /sb_secret_[A-Za-z0-9_-]{20,}/, /postgres(?:ql)?:\/\/[^\s/:]+:[^\s/@]+@/ ];
const findings = [];
const files = selected.map(path => {
  const bytes = readFileSync(path), text = bytes.toString('utf8');
  if (!path.endsWith('checkpoint-scope.mjs')) for (let i = 0; i < secretPatterns.length; i++) if (secretPatterns[i].test(text)) findings.push({ path, pattern: i });
  return { path, bytes: statSync(path).size, sha256: hash(bytes) };
});
const result = { version: 1, base: git(['rev-parse', 'HEAD']).trim(), selectedCount: files.length, bytes: files.reduce((n, f) => n + f.bytes, 0), pathListSha256: hash(selected.join('\n') + '\n'), secretPatternFindings: findings, excludedCount: dirty.length - files.length, files };
if (process.argv.includes('--record')) {
  mkdirSync('output/git-preservation', { recursive: true });
  writeFileSync('output/git-preservation/checkpoint-scope.json', JSON.stringify(result, null, 2) + '\n');
}
if (process.argv.includes('--stage')) {
  if (findings.length) throw Error('Review secret-pattern findings before staging');
  if (git(['diff', '--cached', '--name-only']).trim()) throw Error('Refuse to mix an existing index with a new scope');
  for (let i = 0; i < selected.length; i += 40) git(['add', '--', ...selected.slice(i, i + 40)]);
}
console.log(JSON.stringify({ ...result, files: undefined, largest: [...files].sort((a, b) => b.bytes - a.bytes).slice(0, 10) }, null, 2));
