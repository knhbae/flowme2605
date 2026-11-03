import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { CATALOG_LIBRARY_SCHEMA, CATALOG_LIBRARY_VERSION, validateCatalogLibrarySnapshot,
  type CatalogLibrarySnapshot } from './catalog-library';

const SOURCE_LIMIT = 3_000_000;
const ARMORED_GZIP = 'FLOWME-CATALOG-GZIP-BASE64-V1\n';
let cached: { path: string; payload: Omit<CatalogLibrarySnapshot, 'schema' | 'importedAt'> } | null = null;

/** Render receives a compressed secret file at runtime. Local tests use the
 * untracked source pack. Neither path is imported into the build graph. */
function sourcePath(): string {
  const configured = process.env.FLOWME_ALPHA_CATALOG_PACK_FILE;
  if (configured) return configured;
  if (process.env.FLOWME_ALPHA_HOSTING === 'render-trial-v1') throw Error('catalog-library-secret-file-required');
  return join(process.cwd(), 'lib', 'flow', 'integrated-poc', 'catalog-library-pack.v1.json');
}

function sourcePayload(path: string): Omit<CatalogLibrarySnapshot, 'schema' | 'importedAt'> {
  if (cached?.path === path) return cached.payload;
  const bytes = readFileSync(path);
  if (bytes.length > SOURCE_LIMIT) throw Error('catalog-library-source-too-large');
  const asText = bytes.toString('utf8');
  let encoded = bytes;
  if (asText.startsWith(ARMORED_GZIP)) {
    const base64 = asText.slice(ARMORED_GZIP.length).trimEnd();
    if (!base64 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))
      throw Error('catalog-library-invalid-armor');
    encoded = Buffer.from(base64, 'base64');
    if (encoded.toString('base64') !== base64 || encoded[0] !== 0x1f || encoded[1] !== 0x8b)
      throw Error('catalog-library-invalid-armor');
  }
  const raw = encoded[0] === 0x1f && encoded[1] === 0x8b
    ? gunzipSync(encoded, { maxOutputLength: SOURCE_LIMIT }) : encoded;
  if (raw.length > SOURCE_LIMIT) throw Error('catalog-library-source-too-large');
  const payload: unknown = JSON.parse(raw.toString('utf8'));
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw Error('catalog-library-invalid-source');
  const candidate = { schema: CATALOG_LIBRARY_SCHEMA, importedAt: '2026-09-23T00:00:00.000Z', ...payload };
  if (!validateCatalogLibrarySnapshot(candidate)) throw Error('catalog-library-invalid-source');
  const { schema: _schema, importedAt: _time, ...validated } = candidate;
  cached = { path, payload: validated };
  return validated;
}

/** Server/maintenance-only source bytes. Never import this module from a client
 * component or from a shared validator/transition. */
export function buildCatalogLibrarySnapshot(now: string): CatalogLibrarySnapshot {
  if (!Number.isFinite(Date.parse(now)) || new Date(now).toISOString() !== now) throw Error('catalog-library-invalid-import-time');
  const payload = sourcePayload(sourcePath());
  if (payload.catalogVersion !== CATALOG_LIBRARY_VERSION) throw Error('catalog-library-version-mismatch');
  return { schema: CATALOG_LIBRARY_SCHEMA, importedAt: now,
    ...JSON.parse(JSON.stringify(payload)) } as CatalogLibrarySnapshot;
}
