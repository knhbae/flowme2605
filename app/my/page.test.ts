import assert from 'node:assert/strict';
import test from 'node:test';

import { generateMetadata } from './page';

test('/my metadata uses plan language by default and preserves the exact Q3 rollback title', async () => {
  const q3 = await generateMetadata({ searchParams: Promise.resolve({}) });
  const rollback = await generateMetadata({
    searchParams: Promise.resolve({ q3Copy: 'off' }),
  });

  assert.equal(q3.title, '내 계획');
  assert.equal(rollback.title, 'My Flow');
  assert.deepEqual(q3.robots, rollback.robots);
});
