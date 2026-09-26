import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { listProgramSourcePaths, isProgramTypecheckEntry } from './program-source-files.mjs';

test('typecheck excludes historical output on mixed Windows and POSIX paths', () => {
  for (const root of ['D:\\FlowMe\\repo', 'D:/FlowMe/repo', '/workspace/repo']) {
    const prefix = root.replaceAll('\\', '/');
    for (const tail of ['lib/flow/integrated-poc/model.ts', 'components/flow/integrated-poc/View.test.tsx']) {
      assert(isProgramTypecheckEntry(root, `${prefix}/${tail}`));
      assert(isProgramTypecheckEntry(root.replaceAll('/', '\\'), `${prefix}/${tail}`.replaceAll('/', '\\')));
      assert(!isProgramTypecheckEntry(root, `${prefix}/output/alpha-m6/historical/${tail}`));
      assert(!isProgramTypecheckEntry(root, `${prefix}-other/${tail}`));
    }
    assert(!isProgramTypecheckEntry(root, `${prefix}/lib/flow/integrated-poc/style.css`));
    assert(!isProgramTypecheckEntry(root, `${prefix}/lib/flow/other.ts`));
  }
});

const seams = [
  'components/flow/personal-workspace-poc/PersonalWorkspacePocRoute.tsx',
  'components/flow/personal-workspace-poc/PersonalWorkspacePocResultPresenter.tsx',
];
function fixture(run) {
  const root = mkdtempSync(path.join(tmpdir(), 'flow-program-sources-'));
  const add = name => {
    const target = path.join(root, name);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, '// fixture\n');
  };
  try {
    mkdirSync(path.join(root, 'lib/flow/integrated-poc'), { recursive: true });
    mkdirSync(path.join(root, 'components/flow/integrated-poc'), { recursive: true });
    run({ root, add });
  } finally {
    assert.equal(path.dirname(root), path.resolve(tmpdir()));
    assert(path.basename(root).startsWith('flow-program-sources-'));
    rmSync(root, { recursive: true });
  }
}

test('source inventory is sorted, recursive and includes both route seams', () => fixture(({ root, add }) => {
  const sources = ['lib/flow/integrated-poc/z.test.ts', 'lib/flow/integrated-poc/nested/한 글.ts',
    'components/flow/integrated-poc/A.tsx'];
  sources.forEach(add);
  add('lib/flow/unrelated.ts');
  assert.deepEqual(listProgramSourcePaths(root), [...seams, ...sources].sort());
}));
test('new and hidden scoped files cannot silently disappear from the inventory', () => fixture(({ root, add }) => {
  assert.deepEqual(listProgramSourcePaths(root), [...seams].sort());
  add('lib/flow/integrated-poc/.contract.json');
  assert.deepEqual(listProgramSourcePaths(root), [...seams, 'lib/flow/integrated-poc/.contract.json'].sort());
}));
test('a missing source root fails closed instead of collecting no tests', () => fixture(({ root }) => {
  assert.throws(() => listProgramSourcePaths(path.join(root, 'missing')), { code: 'ENOENT' });
}));
test('alpha service includes its routes and migrations and refuses missing service roots', () => fixture(({ root, add }) => {
  add('components/flow/integrated-poc/AlphaWorkspace.tsx');
  assert.throws(() => listProgramSourcePaths(root), { code: 'ENOENT' });
  const scoped = ['app/alpha/page.tsx','app/auth/callback/page.tsx','app/api/alpha/social/route.ts','supabase/migrations/alpha.sql'];
  scoped.forEach(add);
  assert(scoped.every(file => listProgramSourcePaths(root).includes(file)));
}));
test('inventory runs with an empty PATH and no rg or shell dependency', () => fixture(({ root, add }) => {
  add('lib/flow/integrated-poc/contract.test.ts');
  const moduleUrl = new URL('./program-source-files.mjs', import.meta.url).href;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e',
    `import { listProgramSourcePaths } from ${JSON.stringify(moduleUrl)}; console.log(JSON.stringify(listProgramSourcePaths(${JSON.stringify(root)})));`],
  { env: { ...process.env, PATH: '' }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [...seams, 'lib/flow/integrated-poc/contract.test.ts'].sort());
}));
