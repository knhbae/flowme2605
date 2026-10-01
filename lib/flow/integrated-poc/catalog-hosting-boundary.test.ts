import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCatalogLibrarySnapshot } from './catalog-library-source';

test('hosted catalog fails before reading any local source when no explicit file is configured', () => {
  const keys = ['FLOWME_ALPHA_HOSTING', 'FLOWME_ALPHA_CATALOG_PACK_FILE'] as const;
  const saved = keys.map(key => process.env[key]);
  try {
    delete process.env.FLOWME_ALPHA_CATALOG_PACK_FILE;
    for (const mode of ['render-trial-v1', 'cloudflare-laptop-v1']) {
      process.env.FLOWME_ALPHA_HOSTING = mode;
      assert.throws(() => buildCatalogLibrarySnapshot('2026-10-01T00:00:00.000Z'),
        /^Error: catalog-library-secret-file-required$/);
    }
  } finally {
    keys.forEach((key, index) => {
      if (saved[index] === undefined) delete process.env[key]; else process.env[key] = saved[index];
    });
  }
});
