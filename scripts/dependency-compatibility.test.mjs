import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const rootRequire = createRequire(import.meta.url);
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

// Exercise the actual CommonJS consumers, not a root-level expansion package
// that npm may hoist differently. Audit alone cannot prove this API contract.
for (const [parent, major] of [['glob', '3'], ['readdir-glob', '5']]) {
  test(`${parent}'s minimatch ${major} keeps its callable brace-expansion API`, () => {
    const parentRequire = createRequire(rootRequire.resolve(parent));
    const matcherRequire = createRequire(parentRequire.resolve('minimatch'));
    const matcher = parentRequire('minimatch');
    const matcherVersion = matcherRequire('./package.json').version;
    const expansionVersion = matcherRequire('brace-expansion/package.json').version;

    assert.equal(matcherVersion.split('.')[0], major);
    assert.equal(expansionVersion, packageJson.overrides[`minimatch@${major}`]['brace-expansion']);
    assert.equal(typeof matcherRequire('brace-expansion'), 'function');
    assert.deepEqual(matcher.braceExpand('file-{a,b}.txt'), ['file-a.txt', 'file-b.txt']);
    assert.deepEqual(matcher.braceExpand('dir/{one,two}/{1..3}.txt'), [
      'dir/one/1.txt', 'dir/one/2.txt', 'dir/one/3.txt',
      'dir/two/1.txt', 'dir/two/2.txt', 'dir/two/3.txt',
    ]);
  });
}
