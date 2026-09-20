import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { browserOwnership } from './owner-manifest';

const { groups, files, committedCount } = browserOwnership();
assert.equal(groups['historical-surface'].length, 7);
assert.equal(groups['historical-artifact'].length, 12);
assert.equal(groups['historical-standalone'].length, 2);
assert(groups.program.includes('integrated-product-poc-portable.spec.ts'));
for (const file of ['next.config.ts', 'app/my/page.tsx', 'app/flows/new/page.tsx']) {
  assert(!/historical-app|LegacySurfaceAdapter|historical-test-harness/.test(readFileSync(file, 'utf8')), `${file}: historical harness leaked into product`);
}
console.log(JSON.stringify({ specs: files.length, committedSpecs: committedCount, owners: Object.fromEntries(Object.entries(groups).map(([owner, names]) => [owner, names.length])) }, null, 2));
