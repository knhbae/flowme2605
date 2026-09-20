import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

/** Captured source bytes only; never a browser profile or user storage dump. */
export function readPocSourceBaseline(name: 'k2c-date' | 'k2c-plan' | 'c2-review' | 'c3-review' | 'c3-surface' | 'visit-surface'): string {
  const fixture = JSON.parse(readFileSync(new URL(`./${name}.json`, import.meta.url), 'utf8'));
  if (fixture.version !== 1 || fixture.encoding !== 'gzip-base64') throw Error('unsupported-source-fixture');
  const raw = gunzipSync(Buffer.from(fixture.payload, 'base64'));
  if (raw.length !== fixture.bytes || createHash('sha256').update(raw).digest('hex') !== fixture.sha256) throw Error('corrupt-source-fixture');
  return raw.toString('utf8');
}
