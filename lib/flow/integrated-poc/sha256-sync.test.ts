import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sha256Sync } from './sha256-sync';

test('synchronous digest agrees with Node SHA-256 across boundaries and UTF-8', () => {
  for (const source of ['', 'abc', 'FlowMe 원본 검증 🔐', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(1000), '원문'.repeat(500_000)]) {
    assert.equal(sha256Sync(source), createHash('sha256').update(source).digest('hex'));
  }
});
