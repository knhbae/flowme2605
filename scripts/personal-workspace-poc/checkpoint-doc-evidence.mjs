import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, relative, dirname, sep } from 'node:path';
import { createHash } from 'node:crypto';

// Explicitly approved publication packaging, not a documentation-check exception.
// Default is a dry run. --apply preserves byte-identical local originals first.
const root = process.cwd();
const manifestPath = 'docs/specs/2026-09-12-flowme-integrated-product-poc-program/git-local-evidence-manifest.json';
const backupRoot = 'output/git-preservation/original-docs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const gitPaths = args => execFileSync('git', [...args, '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const tracked = new Set(gitPaths(['ls-files']));
const changed = [...new Set(gitPaths(['ls-files', '--modified', '--others', '--exclude-standard']))];
const protectedPaths = new Set(['docs/DECISIONS.md', 'docs/STATUS.md', 'docs/ROADMAP.md', 'docs/PROJECT_CONTROL.md',
  'docs/specs/2026-09-12-flowme-integrated-product-poc-program/alpha-transition.md',
  'docs/specs/2026-09-12-flowme-integrated-product-poc-program/git-preservation-2026-09-20.md']);
const sourceAudit = /^docs\/content-audit\/2026-09-(?:04-flowme-dog-adoption-source-review-evidence|07-flow-source-freshness-refresh|20-)/;
const runtimeAssets = /^docs\/content-audit\/(?:2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets|2026-09-04-flowme-integrated-poc-p3h1-android-device-runner-ko-assets)\//;
const minimumScripts = new Set(['build-contextual-result-runtime.cjs', 'build-contextual-result-runtime.mjs', 'build-contextual-result-runtime.test.mjs',
  'program-verify.mjs', 'program-check.mjs', 'program-browser-record.mjs', 'program-browser-record.test.mjs',
  'serve-p3h1-android-device.mjs', 'serve-p3h1-android-device.test.mjs', 'verify-p3h1-android-evidence.ts', 'verify-p3h1-android-evidence.test.ts', 'checkpoint-doc-evidence.mjs']
  .map(name => `scripts/personal-workspace-poc/${name}`));
const eligibleDoc = path => path.endsWith('.md') && (path.startsWith('docs/specs/') && !path.startsWith('docs/specs/2026-07-27-') || sourceAudit.test(path));
const slash = path => path.split(sep).join('/');
function classify(source, href) {
  let target = href.startsWith('<') ? href.slice(1, href.indexOf('>')) : href.split(/\s+/)[0];
  target = target.split('#')[0];
  if (!target || /^(https?:|mailto:|tel:)/i.test(target)) return null;
  try { target = decodeURIComponent(target); } catch { /* retain exact recorded target */ }
  const resolved = slash(relative(root, resolve(dirname(resolve(root, source)), target)));
  if (resolved.startsWith('../') || /^[A-Za-z]:/.test(resolved)) return { reason: 'outside-checkpoint-worktree', resolved };
  if (resolved.startsWith('output/') || resolved.startsWith('test-results')) return { reason: 'local-original-evidence', resolved };
  if (resolved.startsWith('docs/specs/') && resolved.includes('/artifacts/')) return { reason: 'local-original-evidence', resolved };
  if (resolved.startsWith('docs/specs/') && !tracked.has(resolved) && /\.(?:[cm]?js|tsx?)$/.test(resolved)) return { reason: 'historical-local-script', resolved };
  if (resolved.startsWith('docs/content-audit/') && !runtimeAssets.test(resolved) && !sourceAudit.test(resolved)
    && (/\.(?:html|png|jpe?g|webp|zip)$/i.test(resolved) || !tracked.has(resolved))) return { reason: 'historical-report-or-unreviewed-capture', resolved };
  if (resolved.startsWith('scripts/personal-workspace-poc/') && !minimumScripts.has(resolved)) return { reason: 'historical-local-script', resolved };
  if (resolved.startsWith('tests/e2e/') && !tracked.has(resolved) && !resolved.includes('integrated-product-poc-portable')) return { reason: 'historical-local-e2e', resolved };
  if (!tracked.has(resolved) && !existsSync(resolve(root, resolved))) return { reason: 'unavailable-local-reference', resolved };
  return null;
}
const prior = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { documents: [] };
const priorByPath = new Map(prior.documents.map(doc => [doc.source, doc]));
const plans = [];
for (const source of changed.filter(path => eligibleDoc(path) || protectedPaths.has(path)).sort()) {
  const previous = priorByPath.get(source), current = readFileSync(source);
  if (previous && hash(current) !== previous.publishedSha256) throw Error(`Concurrent document change; review before regeneration: ${source}`);
  const before = previous ? readFileSync(previous.backup) : current, text = before.toString('utf8'), replacements = [];
  const afterText = text.replace(/!?\[([^\]]*?)\]\(([^)]+)\)/g, (original, label, href, offset) => {
    const boundary = classify(source, href);
    if (!boundary) return original;
    const replacement = `${label} (로컬 전용 근거: \`${href.replaceAll('`', '&#96;')}\`)`;
    replacements.push({ offset, original, replacement, href, ...boundary });
    return replacement;
  });
  if (!replacements.length) continue;
  plans.push({ source, sourceSha256: hash(before), publishedSha256: hash(Buffer.from(afterText)), backup: `${backupRoot}/${source}`,
    protected: protectedPaths.has(source), replacements, before, afterText });
}
if (process.argv.includes('--verify')) {
  for (const doc of prior.documents) {
    const original = readFileSync(doc.backup), published = readFileSync(doc.source);
    if (hash(original) !== doc.sourceSha256 || hash(published) !== doc.publishedSha256) throw Error(`Byte contract changed: ${doc.source}`);
    let rebuilt = original.toString('utf8');
    for (const change of [...doc.replacements].reverse()) {
      if (rebuilt.slice(change.offset, change.offset + change.original.length) !== change.original) throw Error(`Original offset mismatch: ${doc.source}`);
      rebuilt = rebuilt.slice(0, change.offset) + change.replacement + rebuilt.slice(change.offset + change.original.length);
    }
    if (rebuilt !== published.toString('utf8')) throw Error(`Non-link content changed: ${doc.source}`);
  }
  console.log(JSON.stringify({ verifiedDocuments: prior.documents.length, verifiedLinks: prior.documents.reduce((n, d) => n + d.replacements.length, 0), originalBytesPreserved: true, onlyDeclaredLinkReplacements: true }));
} else if (process.argv.includes('--apply')) {
  const applied = [];
  for (const plan of plans.filter(p => !p.protected)) {
    if (existsSync(plan.backup)) {
      if (hash(readFileSync(plan.backup)) !== plan.sourceSha256) throw Error(`Existing backup differs; refusing overwrite: ${plan.source}`);
    } else { mkdirSync(dirname(plan.backup), { recursive: true }); copyFileSync(plan.source, plan.backup); }
    writeFileSync(plan.source, plan.afterText);
    const { before, afterText, protected: isProtected, ...record } = plan;
    applied.push(record);
  }
  const merged = new Map(prior.documents.map(doc => [doc.source, doc]));
  for (const doc of applied) merged.set(doc.source, doc);
  const documents = [...merged.values()].sort((a, b) => a.source.localeCompare(b.source));
  writeFileSync(manifestPath, JSON.stringify({ version: 1, purpose: 'Approved code and summary publication; historical original evidence remains local. No historical verdict or numeric result is changed.', backupRoot, documents }, null, 2) + '\n');
  console.log(JSON.stringify({ appliedDocuments: applied.length, appliedLinks: applied.reduce((n, p) => n + p.replacements.length, 0), protectedRequests: plans.filter(p => p.protected).map(({ source, replacements }) => ({ source, replacements })) }, null, 2));
} else console.log(JSON.stringify({ candidates: plans.length, links: plans.reduce((n, p) => n + p.replacements.length, 0), documents: plans.map(({ source, protected: isProtected, replacements }) => ({ source, protected: isProtected, links: replacements.length, reasons: [...new Set(replacements.map(r => r.reason))] })) }, null, 2));
