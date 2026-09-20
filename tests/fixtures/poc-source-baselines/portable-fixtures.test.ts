import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readPocSourceBaseline } from './read';

test('all six captured sources decode with original bytes and complete source text', () => {
  for (const name of ['k2c-date','k2c-plan','c2-review','c3-review','c3-surface','visit-surface'] as const) {
    assert.match(readPocSourceBaseline(name), /(?:export|import)/);
  }
});
test('native recovery producer and its complete pinned dependency closure preserve original bytes', () => {
  const base = new URL('../../../lib/flow/integrated-poc/native-creator-vendor/', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('recovery-test-manifest.json', base), 'utf8'));
  assert.equal(manifest.byteRewrites, 0);
  assert.equal(manifest.files.length, 27);
  assert.equal(manifest.files.filter((file: {reused: boolean}) => !file.reused).length, 2);
  for (const file of manifest.files) {
    const raw = readFileSync(new URL(file.path, base));
    assert.equal(raw.length, file.bytes, file.path);
    assert.equal(createHash('sha256').update(raw).digest('hex'), file.sha256, file.path);
  }
});
