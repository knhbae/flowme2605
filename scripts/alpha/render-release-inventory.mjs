import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import { gunzipSync } from 'node:zlib';

const textExtensions = /\.(?:cjs|css|html|js|json|md|mjs|sql|ts|tsx|txt|yml|yaml)$/i;
const secretPatterns = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['github-token', /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/],
  ['supabase-secret', /sb_secret_[A-Za-z0-9_-]{20,}/],
  ['postgres-password-url', /postgres(?:ql)?:\/\/[^\s/:]+:[^\s/@]+@/],
];
const privacyPatterns = [
  ['email-address', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i],
  ['absolute-local-path', /(?:[A-Z]:\\(?:Users|FlowMe-Backups|flowme2605)\\|\/Users\/)/i],
];

/** This is a review queue, never an ownership or staging allowlist. */
export function classifyRenderReleasePath(path) {
  if (path === 'lib/flow/integrated-poc/catalog-library-pack.v1.json') return 'exclude-private-catalog';
  if (path.startsWith('supabase/candidates/')) return 'exclude-candidate-sql';
  if (path === 'scripts/alpha/m72-delegated-trial-driver.ts') return 'exclude-private-driver';
  if (path.startsWith('supabase/migrations/')) return 'schema-review';
  if (path.startsWith('docs/')) return 'documentation-review';
  if (path.startsWith('app/alpha/') || path.startsWith('app/api/alpha/') || path.startsWith('app/auth/')) return 'runtime-review';
  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path)) return 'verification-review';
  if (path.startsWith('components/flow/integrated-poc/') || path.startsWith('lib/flow/integrated-poc/')) return 'runtime-review';
  if (path === 'package.json' || path === 'package-lock.json') return 'build-review';
  if (path === 'scripts/alpha/patch-auth-debug-probe.mjs') return 'build-review';
  if (path.startsWith('scripts/alpha/')) return 'tooling-review';
  if (path.startsWith('tests/e2e/') || path.startsWith('scripts/personal-workspace-poc/') || path.startsWith('.github/')) return 'verification-review';
  if (path === '.gitignore') return 'build-review';
  return 'unclassified';
}

function isPrivateCatalogPayload(bytes) {
  // Inspect the payload as well as its path so renaming/compression cannot turn
  // the private source into an ordinary runtime publication candidate.
  let payload = bytes;
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    try { payload = gunzipSync(bytes, { maxOutputLength: 3_000_000 }); } catch { /* Non-text still requires review below. */ }
  }
  const armorHeader = 'FLOWME-CATALOG-GZIP-BASE64-V1\n';
  if (payload.subarray(0, armorHeader.length).toString('utf8') === armorHeader) return true;
  if (payload.length <= 3_000_000) {
    try {
      const text = payload.toString('utf8').trimStart();
      if (!text.startsWith('{')) return false;
      const value = JSON.parse(text);
      if (value && typeof value.catalogVersion === 'string' && value.catalogVersion.startsWith('flowme-previous-poc-content-')
        && Array.isArray(value.bundles) && Array.isArray(value.maps) && value.policies && Array.isArray(value.variants))
        return true;
    } catch { /* Source files are not standalone JSON payloads. */ }
  }
  return false;
}

export function inspectReleaseBytes(path, bytes) {
  const findings = isPrivateCatalogPayload(bytes) ? ['private-catalog-payload'] : [];
  if (!(textExtensions.test(path) || path === '.gitignore') || bytes.includes(0)) {
    findings.push('non-text-review');
    return findings;
  }
  const source = bytes.toString('utf8');
  for (const [name, pattern] of [...secretPatterns, ...privacyPatterns]) {
    if (pattern.test(source)) findings.push(name);
  }
  return findings;
}

export function safeReleasePath(cwd, path) {
  const root = resolve(cwd);
  const absolute = resolve(root, path);
  const underRoot = relative(root, absolute);
  if (!underRoot || underRoot === '..' || underRoot.startsWith(`..${sep}`)) throw Error('Refuse path outside release workspace');
  if (!lstatSync(absolute).isFile()) throw Error('Refuse non-file or symlink in release inventory');
  return absolute;
}

function git(cwd, args) {
  return execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
}

/** CI checks the tracked tree, not only dirty files. This rejects the known
 * private source artifact and standalone raw/gzip/armored renamed copies.
 * It is not a general-purpose secret scanner or an ownership approval. */
export function trackedCatalogArtifacts(cwd) {
  const paths = [...new Set(git(cwd, ['ls-files', '--cached', '-z']).split('\0').filter(Boolean))].sort();
  const findings = [];
  for (const path of paths) {
    const known = classifyRenderReleasePath(path) === 'exclude-private-catalog';
    const signals = isPrivateCatalogPayload(readFileSync(safeReleasePath(cwd, path))) ? ['private-catalog-payload'] : [];
    if (known || signals.length) findings.push({ path, knownPrivatePath: known, signals });
  }
  return { checkedFiles: paths.length, findings };
}

export function sourceImportSpecs(source) {
  return ts.preProcessFile(source, true, true).importedFiles.map(file => file.fileName);
}

function alphaEntryPaths(cwd) {
  const entries = ['app/alpha/page.tsx', 'app/auth/callback/page.tsx'];
  function visitApiDirectory(absolute) {
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const next = join(absolute, entry.name);
      if (entry.isDirectory()) visitApiDirectory(next);
      else if (entry.isFile() && /^route\.tsx?$/.test(entry.name)) entries.push(relative(cwd, next).replaceAll('\\', '/'));
    }
  }
  visitApiDirectory(resolve(cwd, 'app/api/alpha'));
  return entries.sort();
}

/** Minimum import closure for /alpha and its APIs, not a full Next build manifest. */
export function alphaRuntimeClosure(cwd) {
  const root = resolve(cwd);
  const config = ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile);
  if (config.error) throw Error('Cannot read TypeScript configuration');
  const options = ts.parseJsonConfigFileContent(config.config, ts.sys, root).options;
  const entries = alphaEntryPaths(root);
  const seen = new Set();
  const unresolved = [];
  const suffixes = ['', '.ts', '.tsx', '.js', '.cjs', '.mjs', '.json', '.css', '/index.ts', '/index.tsx'];
  function localModule(from, spec) {
    if (!(spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('@/'))) return null;
    const base = spec.startsWith('@/') ? resolve(root, spec.slice(2)) : resolve(dirname(from), spec);
    for (const suffix of suffixes) {
      const candidate = `${base}${suffix}`;
      if (existsSync(candidate) && lstatSync(candidate).isFile()) return candidate;
    }
    const resolved = ts.resolveModuleName(spec, from, options, ts.sys).resolvedModule?.resolvedFileName;
    if (resolved && !resolved.includes(`${sep}node_modules${sep}`)) return resolved;
    return undefined;
  }
  function visit(absolute) {
    const path = relative(root, absolute).replaceAll('\\', '/');
    if (seen.has(path)) return;
    safeReleasePath(root, path);
    seen.add(path);
    if (!/\.[cm]?[jt]sx?$/.test(path)) return;
    const source = readFileSync(absolute, 'utf8');
    for (const spec of sourceImportSpecs(source)) {
      const dependency = localModule(absolute, spec);
      if (dependency === undefined) unresolved.push({ from: path, spec });
      else if (dependency) visit(dependency);
    }
  }
  for (const path of entries) visit(resolve(root, path));
  const dirty = new Set(git(root, ['ls-files', '--modified', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean));
  const dirtyPaths = [...seen].filter(path => dirty.has(path)).sort();
  return {
    entries,
    totalFiles: seen.size,
    dirtyPaths,
    dirtyPathListSha256: createHash('sha256').update(dirtyPaths.join('\n') + '\n').digest('hex'),
    unresolved,
  };
}

export function renderReleaseInventory(cwd) {
  const dirty = new Set(git(cwd, ['ls-files', '--modified', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean));
  const staged = git(cwd, ['diff', '--cached', '--name-only', '-z']).split('\0').filter(Boolean);
  for (const path of staged) dirty.add(path);
  const paths = [...dirty].sort();
  const files = paths.map(path => {
    const absolute = safeReleasePath(cwd, path);
    const bytes = readFileSync(absolute);
    return {
      path,
      category: classifyRenderReleasePath(path),
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      findings: inspectReleaseBytes(path, bytes),
    };
  });
  const categories = Object.fromEntries([...new Set(files.map(file => file.category))].sort().map(category =>
    [category, files.filter(file => file.category === category).length]));
  return {
    version: 1,
    base: git(cwd, ['rev-parse', 'HEAD']).trim(),
    count: files.length,
    stagedCount: staged.length,
    pathListSha256: createHash('sha256').update(paths.join('\n') + '\n').digest('hex'),
    categories,
    findings: files.filter(file => file.findings.length).map(({ path, findings }) => ({ path, findings })),
    files,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const includePaths = process.argv.includes('--paths');
  if (process.argv.includes('--tracked-catalog')) {
    const result = trackedCatalogArtifacts(process.cwd());
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (!result.checkedFiles || result.findings.length) process.exitCode = 1;
  } else if (process.argv.includes('--closure')) {
    const closure = alphaRuntimeClosure(process.cwd());
    const { dirtyPaths, ...summary } = closure;
    process.stdout.write(JSON.stringify(includePaths ? closure : { ...summary, dirtyCount: dirtyPaths.length }, null, 2) + '\n');
  } else {
    const inventory = renderReleaseInventory(process.cwd());
    const { files, ...summary } = inventory;
    process.stdout.write(JSON.stringify(includePaths ? inventory : summary, null, 2) + '\n');
  }
}
