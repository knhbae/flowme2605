import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { buildCatalogLibrarySnapshot } from './catalog-library-source';
import { validateCatalogLibrarySnapshot } from './catalog-library';

test('Render trial requires a runtime source and accepts only a sealed compressed secret file', () => {
  const oldPath = process.env.FLOWME_ALPHA_CATALOG_PACK_FILE;
  const oldHosting = process.env.FLOWME_ALPHA_HOSTING;
  // Use the same sealed runtime source as the server. Missing source must fail
  // this suite, never silently skip it or replace its original-content checks.
  const { schema: _schema, importedAt: _time, ...payload } = buildCatalogLibrarySnapshot('2026-09-23T00:00:00.000Z');
  const raw = Buffer.from(JSON.stringify(payload));
  const directory = mkdtempSync(join(tmpdir(), 'flowme-catalog-source-'));
  try {
    process.env.FLOWME_ALPHA_HOSTING = 'render-trial-v1';
    delete process.env.FLOWME_ALPHA_CATALOG_PACK_FILE;
    assert.throws(() => buildCatalogLibrarySnapshot('2026-09-23T00:00:00.000Z'), /secret-file-required/);

    const compressed = gzipSync(raw, { level: 9 });
    const armor = `FLOWME-CATALOG-GZIP-BASE64-V1\n${compressed.toString('base64')}\n`;
    assert(Buffer.byteLength(armor) < 1_000_000);
    const good = join(directory, 'catalog.txt');
    writeFileSync(good, armor);
    process.env.FLOWME_ALPHA_CATALOG_PACK_FILE = good;
    assert(validateCatalogLibrarySnapshot(buildCatalogLibrarySnapshot('2026-09-23T00:00:00.000Z')));

    const malformed = join(directory, 'malformed.txt');
    writeFileSync(malformed, 'FLOWME-CATALOG-GZIP-BASE64-V1\nnot base64\n');
    process.env.FLOWME_ALPHA_CATALOG_PACK_FILE = malformed;
    assert.throws(() => buildCatalogLibrarySnapshot('2026-09-23T00:00:00.000Z'), /invalid-armor/);

    const changed = JSON.parse(raw.toString('utf8'));
    changed.bundles[0].flow.title += ' tampered';
    const bad = join(directory, 'tampered.txt');
    writeFileSync(bad, `FLOWME-CATALOG-GZIP-BASE64-V1\n${gzipSync(JSON.stringify(changed), { level: 9 }).toString('base64')}\n`);
    process.env.FLOWME_ALPHA_CATALOG_PACK_FILE = bad;
    assert.throws(() => buildCatalogLibrarySnapshot('2026-09-23T00:00:00.000Z'), /invalid-source/);

    process.env.FLOWME_ALPHA_CATALOG_PACK_FILE = join(directory, 'missing.json.gz');
    assert.throws(() => buildCatalogLibrarySnapshot('2026-09-23T00:00:00.000Z'));
  } finally {
    if (oldPath === undefined) delete process.env.FLOWME_ALPHA_CATALOG_PACK_FILE;
    else process.env.FLOWME_ALPHA_CATALOG_PACK_FILE = oldPath;
    if (oldHosting === undefined) delete process.env.FLOWME_ALPHA_HOSTING;
    else process.env.FLOWME_ALPHA_HOSTING = oldHosting;
    rmSync(directory, { recursive: true, force: true });
  }
});
