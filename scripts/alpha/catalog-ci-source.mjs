import { createHash } from 'node:crypto';
import { appendFileSync, lstatSync, mkdtempSync, realpathSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// A fingerprint is public; the source itself is supplied only after environment review.
export const CATALOG_CI_SOURCE = Object.freeze({
  count: 6, partBytes: 44_000, bytes: 263_439, terminator: '\n',
  sha256: '6b3f02a35149c52e889f92ad7f42c2ba97298755788c272d5e01d35837ee3659',
});
export const CATALOG_CI_KEYS = Object.freeze(Array.from({ length: CATALOG_CI_SOURCE.count }, (_, i) => `FLOWME_CATALOG_PART_${i + 1}`));
const prefix = 'flowme-catalog-ci-';

export function assembleCatalogParts(env, contract = CATALOG_CI_SOURCE) {
  // gh secret set trims trailing CR/LF on stdin. The versioned wire contract
  // omits the armor's final LF and restores it before the exact byte hash.
  const wireBytes = contract.bytes - Buffer.byteLength(contract.terminator);
  const parts = Array.from({ length: contract.count }, (_, i) => env[`FLOWME_CATALOG_PART_${i + 1}`]);
  if (parts.some((part, i) => typeof part !== 'string' || Buffer.byteLength(part) !==
    (i === contract.count - 1 ? wireBytes - contract.partBytes * i : contract.partBytes))) throw Error('catalog-ci-invalid-parts');
  const bytes = Buffer.from(parts.join('') + contract.terminator, 'utf8');
  if (bytes.length !== contract.bytes || createHash('sha256').update(bytes).digest('hex') !== contract.sha256)
    throw Error('catalog-ci-source-mismatch');
  return bytes;
}

export function materializeCatalog(env, contract = CATALOG_CI_SOURCE) {
  const bytes = assembleCatalogParts(env, contract); // No files on missing/mismatched input.
  if (!env.RUNNER_TEMP || !env.GITHUB_ENV || /[\r\n]/.test(env.RUNNER_TEMP + env.GITHUB_ENV)) throw Error('catalog-ci-invalid-runner');
  const root = realpathSync(env.RUNNER_TEMP);
  if (!lstatSync(root).isDirectory() || !lstatSync(env.GITHUB_ENV).isFile() || lstatSync(env.GITHUB_ENV).isSymbolicLink())
    throw Error('catalog-ci-invalid-runner');
  const directory = mkdtempSync(join(root, prefix));
  const file = join(directory, 'catalog.txt');
  try {
    writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
    appendFileSync(env.GITHUB_ENV, `FLOWME_ALPHA_CATALOG_PACK_FILE=${file}\n`, { encoding: 'utf8' });
  } catch {
    // Only the file and directory created above, never the source or runner root.
    try { unlinkSync(file); } catch { /* File might not exist yet. */ }
    try { rmdirSync(directory); } catch { /* Leave an unexpected nonempty directory intact. */ }
    throw Error('catalog-ci-materialization-failed');
  }
  return file;
}

export function cleanupCatalog(env) {
  if (!env.FLOWME_ALPHA_CATALOG_PACK_FILE) return false;
  if (!env.RUNNER_TEMP) throw Error('catalog-ci-invalid-cleanup');
  const root = realpathSync(env.RUNNER_TEMP), file = resolve(env.FLOWME_ALPHA_CATALOG_PACK_FILE), directory = dirname(file);
  if (basename(file) !== 'catalog.txt' || dirname(directory) !== root ||
    !/^flowme-catalog-ci-[A-Za-z0-9]{6}$/.test(basename(directory)) ||
    lstatSync(directory).isSymbolicLink() || realpathSync(directory) !== directory ||
    lstatSync(file).isSymbolicLink() || !lstatSync(file).isFile()) throw Error('catalog-ci-invalid-cleanup');
  unlinkSync(file);
  rmdirSync(directory); // No recursive removal, preserves any unexpected files.
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const action = process.argv[2];
    if (action === 'prepare') materializeCatalog(process.env);
    else if (action === 'cleanup') cleanupCatalog(process.env);
    else throw Error('catalog-ci-invalid-action');
    console.log(JSON.stringify({ action, ok: true }));
  } catch {
    // Never print error objects: they may contain a payload, path or environment value.
    console.error('Private catalog source preparation/cleanup failed. Review the fixed source contract and runner configuration.');
    process.exitCode = 1;
  }
}
