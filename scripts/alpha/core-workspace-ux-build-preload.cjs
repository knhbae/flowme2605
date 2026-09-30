'use strict';

// One isolated build only. Activate in the new child process (and inherited
// Next workers), never in the existing server's environment.
const path = require('node:path');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const { AsyncLocalStorage } = require('node:async_hooks');

const ROOT = path.resolve(__dirname, '../..');
const DIST_DIR = '.next-core-workspace-ux-20260930';
const TSCONFIG = 'output/playwright/alpha-core-workspace-ux/build-tsconfig.json';
const ENABLE_KEY = 'FLOWME_CORE_WORKSPACE_UX_BUILD';
const ENABLE_VALUE = 'isolated-production-v1';
const PHASE = 'phase-production-build';
const samePath = (a, b) => typeof a === 'string' && typeof b === 'string' && path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
const fail = reason => { throw new Error(`core-workspace-ux-build:${reason}`); };

function createHooks(original) {
  const checking = new AsyncLocalStorage();
  const ownDist = value => value === DIST_DIR || samePath(value, path.join(ROOT, DIST_DIR));
  return {
    async loadConfig(phase, dir, options) {
      const config = await original.loadConfig(phase, dir, options);
      if (phase !== PHASE || !samePath(dir, ROOT)) return config;
      if (options?.rawConfig || options?.customConfig) fail('unexpected-config-mode');
      if (config.output === 'export' || config.distDir !== '.next') fail('unexpected-build-config');
      if (config.typescript?.ignoreBuildErrors || config.typescript?.tsconfigPath !== './tsconfig.next.json') fail('unexpected-typescript-config');
      return { ...config, distDir: DIST_DIR,
        typescript: { ...config.typescript, ignoreBuildErrors: false, tsconfigPath: TSCONFIG },
        experimental: { ...config.experimental, cpus: 1 },
      };
    },
    async verifyTypeScriptSetup(input) {
      if (!samePath(input.dir, ROOT) || !ownDist(input.distDir)) return original.verifyTypeScriptSetup(input);
      if (!samePath(path.resolve(input.dir, input.tsconfigPath), path.join(ROOT, TSCONFIG)) || input.typeCheckPreflight !== true) fail('typescript-scope-mismatch');
      if (!input.hasAppDir || input.hasPagesDir || input.disableStaticImages) fail('declaration-contract-changed');
      // The unmodified Next verifier still resolves dependencies, applies
      // defaults to our own config, and runs the real production type checker.
      return checking.run({ phase: PHASE, root: ROOT, distDir: DIST_DIR }, () => original.verifyTypeScriptSetup(input));
    },
    async writeAppTypeDeclarations(input) {
      if (!samePath(input.baseDir, ROOT) || !ownDist(input.distDir)) return original.writeAppTypeDeclarations(input);
      const scope = checking.getStore();
      if (scope?.phase !== PHASE || !samePath(scope.root, ROOT) || !input.hasAppDir || input.hasPagesDir || !input.imageImportsEnabled) fail('unscoped-declaration-write');
      // Only the exact root next-env.d.ts write is omitted. Our tsconfig loads
      // the same ambient Next/image types and the fresh isolated route types.
    },
  };
}

function assertOwnTypeConfig() {
  const projectRequire = createRequire(path.join(ROOT, 'package.json'));
  const ts = projectRequire('typescript');
  const filename = path.join(ROOT, TSCONFIG);
  const loaded = ts.readConfigFile(filename, ts.sys.readFile);
  if (loaded.error || loaded.config.extends !== '../../../tsconfig.next.json') fail('type-config-extends');
  const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, path.dirname(filename));
  if (parsed.errors.length || !parsed.options.strict || !parsed.options.noEmit) fail('type-config-options');
  if (!samePath(parsed.options.baseUrl, ROOT)) fail('alias-base-url');
  if (!parsed.options.types?.includes('next') || !parsed.options.types?.includes('next/image-types/global')) fail('ambient-types');
  for (const type of parsed.options.types) if (!ts.resolveTypeReferenceDirective(type, filename, parsed.options, ts.sys).resolvedTypeReferenceDirective) fail('ambient-type-resolution');
  if (parsed.fileNames.some(file => samePath(file, path.join(ROOT, 'next-env.d.ts')) || file.replaceAll('\\', '/').includes('/.next/types/'))) fail('old-build-types');
  for (const relative of ['app/alpha/page.tsx', 'components/flow/integrated-poc/ProgramSpace.tsx', 'lib/flow/integrated-poc/private-space.ts']) {
    if (!parsed.fileNames.some(file => samePath(file, path.join(ROOT, relative)))) fail('missing-production-types');
  }
  if (!loaded.config.include.includes(`../../../${DIST_DIR}/types/**/*.ts`)) fail('missing-new-route-types');
  return { productionTypeEntries: parsed.fileNames.length, strict: parsed.options.strict, realTypecheckRequired: true };
}

async function checkWebpackAliases() {
  const assert = require('node:assert/strict');
  const projectRequire = createRequire(path.join(ROOT, 'package.json'));
  const loadJsConfig = projectRequire('next/dist/build/load-jsconfig').default;
  const { JsConfigPathsPlugin } = projectRequire('next/dist/build/webpack/plugins/jsconfig-paths-plugin');
  const original = await loadJsConfig(ROOT, { typescript: { tsconfigPath: './tsconfig.next.json' } });
  const isolated = await loadJsConfig(ROOT, { typescript: { tsconfigPath: TSCONFIG } });
  assert(samePath(isolated.resolvedBaseUrl.baseUrl, ROOT));
  assert.equal(isolated.resolvedBaseUrl.isImplicit, false);
  assert.deepEqual(isolated.jsConfig.compilerOptions.paths, original.jsConfig.compilerOptions.paths);
  const aliases = ['@/components/flow/integrated-poc/AlphaAuthPanel', '@/lib/flow/integrated-poc/alpha-auth/config',
    '@/lib/flow/integrated-poc/alpha-server/command-handler'];
  const resolveAlias = (config, name) => new Promise((resolve, reject) => {
    let callback;
    new JsConfigPathsPlugin(config.jsConfig.compilerOptions.paths, config.resolvedBaseUrl).apply({
      ensureHook: () => 'resolve',
      getHook: () => ({ tapAsync: (_name, fn) => { callback = fn; } }),
      doResolve: (_hook, request, _message, _context, done) => {
        const filename = ['.ts', '.tsx'].map(extension => request.request + extension).find(file => fs.existsSync(file));
        done(null, filename);
      },
    });
    callback({ request: name, path: path.join(ROOT, 'app') }, {}, (error, result) => error ? reject(error) : resolve(result));
  });
  for (const alias of aliases) {
    const before = await resolveAlias(original, alias), after = await resolveAlias(isolated, alias);
    assert(before && after && samePath(before, after), alias);
    assert(samePath(after, path.join(ROOT, alias.slice(2) + (alias.includes('/components/') ? '.tsx' : '.ts'))), alias);
  }
  return { nextWebpackAliasesVerified: aliases.length, resolvedBaseUrl: isolated.resolvedBaseUrl.baseUrl };
}

function install() {
  if (!samePath(process.cwd(), ROOT)) fail('cwd-mismatch');
  if (process.env.NODE_ENV !== 'production') fail('production-node-env-required');
  if (process.env.__NEXT_PRIVATE_STANDALONE_CONFIG) fail('standalone-config-not-supported');
  const projectRequire = createRequire(path.join(ROOT, 'package.json'));
  const packagePath = projectRequire.resolve('next/package.json'), nextRoot = path.dirname(packagePath);
  if (projectRequire(packagePath).version !== '15.5.25') fail('next-version-changed');
  assertOwnTypeConfig();
  function load(relative, field) {
    const filename = projectRequire.resolve(`next/${relative}`);
    if (!samePath(filename, path.join(nextRoot, `${relative}.js`))) fail('module-resolution-changed');
    const exports = projectRequire(filename), cached = require.cache[filename];
    if (!cached || cached.exports !== exports || typeof exports[field] !== 'function') fail('module-export-changed');
    return { cached, exports, field };
  }
  // Install declaration interception before loading the verifier, which imports it.
  const declaration = load('dist/lib/typescript/writeAppTypeDeclarations', 'writeAppTypeDeclarations');
  const config = load('dist/server/config', 'default');
  let verifier;
  const hooks = createHooks({ loadConfig: (...args) => config.exports.default(...args),
    writeAppTypeDeclarations: (...args) => declaration.exports.writeAppTypeDeclarations(...args),
    verifyTypeScriptSetup: (...args) => verifier.exports.verifyTypeScriptSetup(...args) });
  const replace = (entry, value) => { entry.cached.exports = { ...entry.exports, __esModule: true, [entry.field]: value }; };
  replace(declaration, hooks.writeAppTypeDeclarations);
  verifier = load('dist/lib/verify-typescript-setup', 'verifyTypeScriptSetup');
  replace(verifier, hooks.verifyTypeScriptSetup);
  replace(config, hooks.loadConfig);
}

async function checkContracts() {
  const assert = require('node:assert/strict');
  const protectedFiles = ['next.config.ts', 'next-env.d.ts', 'tsconfig.next.json', '.next/BUILD_ID'];
  const before = protectedFiles.map(file => fs.readFileSync(path.join(ROOT, file)));
  let writes = 0, checks = 0;
  const redirects = async () => [{ source: '/favicon.ico', destination: '/icon.svg', permanent: false }];
  const config = { distDir: '.next', typescript: { tsconfigPath: './tsconfig.next.json', ignoreBuildErrors: false }, experimental: { workerThreads: false }, redirects };
  let hooks;
  hooks = createHooks({ loadConfig: async () => config, writeAppTypeDeclarations: async () => { writes++; },
    verifyTypeScriptSetup: async input => { checks++; if (samePath(input.dir, ROOT) && input.distDir === DIST_DIR) await hooks.writeAppTypeDeclarations({ baseDir: ROOT, distDir: DIST_DIR, hasAppDir: true, hasPagesDir: false, imageImportsEnabled: true }); return { version: 'real-verifier-stub-result' }; } });
  const isolated = await hooks.loadConfig(PHASE, ROOT);
  assert.equal(isolated.distDir, DIST_DIR); assert.equal(isolated.redirects, redirects); assert.equal(config.distDir, '.next');
  assert.equal(isolated.typescript.ignoreBuildErrors, false); assert.equal(isolated.experimental.cpus, 1);
  assert.equal(await hooks.loadConfig('phase-development-server', ROOT), config);
  assert.equal(await hooks.loadConfig(PHASE, path.join(ROOT, 'other')), config);
  const input = { dir: ROOT, distDir: DIST_DIR, tsconfigPath: TSCONFIG, typeCheckPreflight: true, hasAppDir: true, hasPagesDir: false, disableStaticImages: false };
  assert.equal((await hooks.verifyTypeScriptSetup(input)).version, 'real-verifier-stub-result'); assert.equal(checks, 1); assert.equal(writes, 0);
  await assert.rejects(hooks.verifyTypeScriptSetup({ ...input, typeCheckPreflight: false }), /typescript-scope/);
  await assert.rejects(hooks.verifyTypeScriptSetup({ ...input, tsconfigPath: './tsconfig.next.json' }), /typescript-scope/);
  await assert.rejects(hooks.writeAppTypeDeclarations({ baseDir: ROOT, distDir: DIST_DIR }), /unscoped-declaration/);
  await hooks.writeAppTypeDeclarations({ baseDir: path.join(ROOT, 'other'), distDir: DIST_DIR }); assert.equal(writes, 1);
  await hooks.verifyTypeScriptSetup({ ...input, dir: path.join(ROOT, 'other') }); assert.equal(checks, 2);
  const types = assertOwnTypeConfig();
  const aliases = await checkWebpackAliases();
  protectedFiles.forEach((file, index) => assert.deepEqual(fs.readFileSync(path.join(ROOT, file)), before[index], file));
  console.log(JSON.stringify({ contractChecks: 'passed', ...types, ...aliases, protectedFilesUnchanged: true, productionBuildExecuted: false }));
}

module.exports = { ROOT, DIST_DIR, TSCONFIG, ENABLE_KEY, ENABLE_VALUE, createHooks, assertOwnTypeConfig };
if (process.env[ENABLE_KEY] === ENABLE_VALUE) install();
if (require.main === module && process.argv[2] === '--check-contract') checkContracts().catch(error => { console.error(error); process.exitCode = 1; });
