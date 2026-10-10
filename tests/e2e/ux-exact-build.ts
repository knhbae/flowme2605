import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export const UX_EXACT_QA_PATHS = [
  'tests/e2e/ux-comparison-gaps.browser.ts',
  'tests/e2e/ux-comparison-gaps.config.ts',
  'tests/e2e/ux-comparison-gaps.fixture.ts',
  'tests/e2e/ux-exact-build.ts',
  'tests/e2e/alpha-auth.fixture.ts',
  'tests/e2e/folder-content-entry.fixture.ts',
  'tests/e2e/cloudflare-release.fixture.ts',
  'tsconfig.json',
] as const;
export const UX_EXACT_REQUIRED_COMPILE_PATHS = [
  'package.json', 'package-lock.json', 'postcss.config.js',
  'app/globals.css', 'app/tailwind-v3-compat.css', 'scripts/tailwind-v3-compat.cjs',
  'components/flow/integrated-poc/AlphaWorkspace.tsx',
  'components/flow/integrated-poc/ProgramCommunity.tsx',
  'components/flow/integrated-poc/ProgramTextEditor.tsx',
  'lib/flow/integrated-poc/alpha-persistence/client.ts',
  'lib/flow/integrated-poc/alpha-sync/controller.ts',
] as const;

type FileDigest = { path: string; sha256: string };
export type UxExactBuild = {
  schema: 'flowme-ux-exact-build/1';
  providedRoot: string;
  qaRoot: string;
  qaHead: string;
  head: string;
  buildId: string;
  compileInputs: FileDigest[];
  qaInputs: FileDigest[];
  staticAssets: FileDigest[];
};
const rejected = (): never => { throw Error('ux-exact-build-rejected'); };
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

function safeRoot(value: unknown): string {
  if (typeof value !== 'string' || !path.isAbsolute(value) || /[\r\n\0]/.test(value)) return rejected();
  const root = path.resolve(value);
  if (root === path.parse(root).root || !lstatSync(root).isDirectory() || lstatSync(root).isSymbolicLink()) return rejected();
  if (path.relative(root, realpathSync(root)) !== '') return rejected();
  return root;
}
function safeFile(root: string, relative: string): string {
  if (!relative || path.isAbsolute(relative) || /[\\\r\n\0]/.test(relative)
    || relative.split('/').some(part => !part || part === '.' || part === '..')) return rejected();
  const file = path.resolve(root, relative);
  const under = path.relative(root, file);
  if (under.startsWith('..') || path.isAbsolute(under) || !lstatSync(file).isFile() || lstatSync(file).isSymbolicLink()) return rejected();
  if (path.relative(file, realpathSync(file)) !== '') return rejected();
  return file;
}
function digestFiles(root: string, names: readonly string[]): FileDigest[] {
  if (new Set(names).size !== names.length) return rejected();
  return [...names].sort().map(name => ({ path: name, sha256: sha(readFileSync(safeFile(root, name))) }));
}
/** Follow local imports, re-exports, import types and literal require/import
 * calls without executing any QA or application module. External packages are
 * pinned separately by the required package/lock compile inputs. */
export function uxExactQaDependencyPaths(rootValue: string, entries: readonly string[] = UX_EXACT_QA_PATHS): string[] {
  const root = safeRoot(rootValue), names = new Set<string>();
  const configFile = safeFile(root, 'tsconfig.json');
  const config = ts.readConfigFile(configFile, ts.sys.readFile);
  if (config.error) return rejected();
  const options = ts.parseJsonConfigFileContent(config.config, ts.sys, root).options;
  const visit = (name: string) => {
    if (names.has(name)) return;
    const file = safeFile(root, name); names.add(name);
    if (!/\.[cm]?[jt]sx?$/.test(name)) return;
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const imports = new Set<string>();
    const inspect = (node: ts.Node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) imports.add(node.moduleSpecifier.text);
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteralLike(node.argument.literal)) imports.add(node.argument.literal.text);
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
        && node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0])) imports.add(node.arguments[0].text);
      ts.forEachChild(node, inspect);
    };
    inspect(source);
    for (const specifier of imports) {
      const local = specifier.startsWith('.') || specifier.startsWith('@/');
      const resolved = ts.resolveModuleName(specifier, file, options, ts.sys).resolvedModule;
      if (!resolved) { if (local) return rejected(); else continue; }
      if (resolved.isExternalLibraryImport) { if (local) return rejected(); else continue; }
      const relative = path.relative(root, resolved.resolvedFileName).replace(/\\/g, '/');
      visit(relative);
    }
  };
  for (const entry of [...entries, ...UX_EXACT_QA_PATHS]) visit(entry);
  return [...names].sort();
}
function staticPaths(root: string): string[] {
  const visit = (directory: string): string[] => readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const relative = `${directory}/${entry.name}`;
    if (entry.isSymbolicLink()) return rejected();
    if (entry.isDirectory()) return visit(relative);
    if (!entry.isFile()) return rejected();
    return [relative];
  });
  return visit('.next/static').sort();
}
function currentHead(root: string): string {
  const value = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  return /^[a-f0-9]{40}$/.test(value) ? value : rejected();
}
function currentBuild(root: string): string {
  const value = readFileSync(safeFile(root, '.next/BUILD_ID'), 'utf8').trim();
  return /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : rejected();
}
function validRecords(value: unknown, lane: 'compile' | 'qa' | 'static'): value is FileDigest[] {
  if (!Array.isArray(value) || !value.length) return false;
  const names = new Set<string>();
  for (const item of value) {
    if (!item || typeof item.path !== 'string' || !/^[a-f0-9]{64}$/.test(item.sha256 ?? '') || names.has(item.path)) return false;
    const name = item.path as string;
    if (/^(?:\.git|\.tmp|output|node_modules)(?:\/|$)/.test(name)
      || /(?:^|\/)\.env(?:[./]|$)/.test(name)
      || name === 'lib/flow/integrated-poc/catalog-library-pack.v1.json') return false;
    if (lane === 'static' ? !name.startsWith('.next/static/') : name.startsWith('.next/')) return false;
    names.add(name);
  }
  const required = lane === 'compile' ? UX_EXACT_REQUIRED_COMPILE_PATHS : lane === 'qa' ? UX_EXACT_QA_PATHS : [];
  return required.every(name => names.has(name));
}

/** Read-only metadata capture. The caller supplies its fresh, complete compile
 * input list; this does not discover release ownership, publish, copy or serve. */
export function captureUxExactBuild(providedRoot: string, compilePaths: readonly string[], qaPaths: readonly string[] = UX_EXACT_QA_PATHS, qaRoot: string = providedRoot): UxExactBuild {
  try {
    const root = safeRoot(providedRoot);
    const runner = safeRoot(qaRoot);
    const result: UxExactBuild = { schema: 'flowme-ux-exact-build/1', providedRoot: root, qaRoot: runner, qaHead: currentHead(runner),
      head: currentHead(root), buildId: currentBuild(root), compileInputs: digestFiles(root, compilePaths),
      qaInputs: digestFiles(root, uxExactQaDependencyPaths(root, qaPaths)), staticAssets: digestFiles(root, staticPaths(root)) };
    assertUxExactBuild(result, runner);
    return result;
  } catch { return rejected(); }
}

export function assertUxExactBuild(value: unknown, actualQaRoot: string = process.cwd()): asserts value is UxExactBuild {
  try {
    const data = value as UxExactBuild;
    if (!data || data.schema !== 'flowme-ux-exact-build/1' || !/^[a-f0-9]{40}$/.test(data.head ?? '')
      || !/^[A-Za-z0-9_-]{1,128}$/.test(data.buildId ?? '') || !validRecords(data.compileInputs, 'compile')
      || !validRecords(data.qaInputs, 'qa') || !validRecords(data.staticAssets, 'static')) return rejected();
    const root = safeRoot(data.providedRoot), runner = safeRoot(actualQaRoot);
    if (runner !== safeRoot(data.qaRoot) || data.qaHead !== data.head || currentHead(runner) !== data.qaHead
      || currentHead(root) !== data.head || currentBuild(root) !== data.buildId) return rejected();
    for (const records of [data.compileInputs, data.staticAssets]) {
      for (const file of records) if (sha(readFileSync(safeFile(root, file.path))) !== file.sha256) return rejected();
    }
    const qaNames = data.qaInputs.map(file => file.path), expectedQa = uxExactQaDependencyPaths(root, qaNames);
    if (JSON.stringify([...qaNames].sort()) !== JSON.stringify(expectedQa)
      || JSON.stringify(expectedQa) !== JSON.stringify(uxExactQaDependencyPaths(runner, qaNames))) return rejected();
    for (const file of data.qaInputs) for (const qaFileRoot of [root, runner]) {
      if (sha(readFileSync(safeFile(qaFileRoot, file.path))) !== file.sha256) return rejected();
    }
    const expected = data.staticAssets.map(file => file.path).sort();
    if (JSON.stringify(expected) !== JSON.stringify(staticPaths(root))) return rejected();
  } catch { return rejected(); }
}

/** Both local and remote QA need an explicit frozen manifest. No historical
 * root, implicit current build, Auth settings or network fallback is inferred. */
export function loadUxExactBuild(env: Record<string, string | undefined>, actualQaRoot: string = process.cwd()): UxExactBuild {
  try {
    const filename = env.FLOWME_UX_COMPARISON_EXACT_BUILD_FILE;
    if (!filename || !path.isAbsolute(filename) || /[\r\n\0]/.test(filename)
      || !lstatSync(filename).isFile() || lstatSync(filename).isSymbolicLink()) return rejected();
    const result: unknown = JSON.parse(readFileSync(filename, 'utf8'));
    assertUxExactBuild(result, actualQaRoot);
    return result;
  } catch { return rejected(); }
}

export function assertUxObservedAssets(build: UxExactBuild, assets: readonly FileDigest[], actualQaRoot: string = process.cwd()): void {
  assertUxExactBuild(build, actualQaRoot);
  if (!Array.isArray(assets) || !assets.length) return rejected();
  const expected = new Map(build.staticAssets.map(file => [file.path.replace(/^\.next\//, '/_next/'), file.sha256]));
  const seen = new Set<string>();
  for (const asset of assets) {
    if (!asset || typeof asset.path !== 'string' || seen.has(asset.path) || expected.get(asset.path) !== asset.sha256) return rejected();
    seen.add(asset.path);
  }
}
