import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const rootRequire = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

// Resolve from the installed consumers: a root-only check can miss nested copies.
for (const [parent, major] of [['glob', '3'], ['readdir-glob', '5']]) {
  test(`${parent}'s minimatch ${major} keeps callable brace expansion`, () => {
    const parentRequire = createRequire(rootRequire.resolve(parent));
    const matcherRequire = createRequire(parentRequire.resolve('minimatch'));
    const matcher = parentRequire('minimatch');

    assert.equal(typeof matcherRequire('brace-expansion'), 'function');
    assert.equal(matcherRequire('./package.json').version.split('.')[0], major);
    assert.equal(
      matcherRequire('brace-expansion/package.json').version,
      packageJson.overrides[`minimatch@${major}`]['brace-expansion'],
    );
    assert.deepEqual(matcher.braceExpand('file-{a,b}.txt'), ['file-a.txt', 'file-b.txt']);
    assert.deepEqual(matcher.braceExpand('dir/{one,two}/{1..3}.txt'), [
      'dir/one/1.txt', 'dir/one/2.txt', 'dir/one/3.txt',
      'dir/two/1.txt', 'dir/two/2.txt', 'dir/two/3.txt',
    ]);
  });
}

test('glob finds both package manifests through a brace pattern', () => {
  assert.deepEqual(
    rootRequire('glob').sync('package{,-lock}.json', { cwd: root }).sort(),
    ['package-lock.json', 'package.json'],
  );
});

test('readdir-glob finds both package manifests through a brace pattern', async () => {
  const matches = [];
  await new Promise((resolve, reject) => {
    // Skip every directory so this probe does not walk node_modules or user files.
    rootRequire('readdir-glob')(root, { pattern: 'package{,-lock}.json', skip: '*', nodir: true })
      .on('match', (match) => matches.push(match.relative))
      .on('error', reject)
      .on('end', resolve);
  });
  assert.deepEqual(matches.sort(), ['package-lock.json', 'package.json']);
});
