/** File transport only: decoding never verifies the server seal or owner.
 * Requires standard CompressionStream/DecompressionStream('gzip') and WebCrypto
 * (modern browsers and Node 24). No polyfill or silent lossy fallback. */
export const BACKUP_FILE_SCHEMA = 'flowme-alpha-backup-file/1';
export const BACKUP_FILE_LIMITS = Object.freeze({ fileBytes: 30_000_000, expandedBytes: 30_000_000 });
const encoder = new TextEncoder();
const fail = (): never => { throw Error('invalid-backup-file'); };
const hash = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))), n => n.toString(16).padStart(2, '0')).join('');
function toBase64(bytes: Uint8Array): string {
  let value = ''; for (let offset = 0; offset < bytes.length; offset += 8192) value += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(value);
}
async function transform(bytes: Uint8Array, mode: 'compress' | 'decompress', maximum: number): Promise<Uint8Array> {
  if (mode === 'compress' ? typeof CompressionStream === 'undefined' : typeof DecompressionStream === 'undefined') throw Error('backup-codec-unavailable');
  const stream = mode === 'compress' ? new CompressionStream('gzip') : new DecompressionStream('gzip');
  const reader = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(stream).getReader();
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const next = await reader.read(); if (next.done) break;
      length += next.value.byteLength;
      if (length > maximum) { await reader.cancel(); throw Error('backup-file-limit'); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const output = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  return output;
}
export async function encodeBackupFile(raw: string): Promise<string> {
  const bytes = encoder.encode(raw);
  if (!bytes.length || bytes.length > BACKUP_FILE_LIMITS.expandedBytes) throw Error('backup-file-limit');
  // Exact UTF-8 roundtrip; do not normalize, canonicalize or replace lone surrogates.
  if (new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes) !== raw) fail();
  const value = JSON.parse(raw); if (value?.schema !== 'flowme-alpha-sealed-account-backup/1') fail();
  const packed = await transform(bytes, 'compress', BACKUP_FILE_LIMITS.fileBytes);
  const file = JSON.stringify({ schema: BACKUP_FILE_SCHEMA, encoding: 'gzip-base64', bytes: bytes.length, sha256: await hash(bytes), data: toBase64(packed) });
  if (encoder.encode(file).length > BACKUP_FILE_LIMITS.fileBytes) throw Error('backup-file-limit');
  return file;
}
/** Returns exact original JSON; legacy JSON inputs are unchanged. Callers must
 * then use existing backup integrity/owner/seal validation and restore limits. */
export async function decodeBackupFile(file: string): Promise<string> {
  if (encoder.encode(file).length > BACKUP_FILE_LIMITS.fileBytes) throw Error('backup-file-limit');
  const value = JSON.parse(file);
  if (value?.schema !== BACKUP_FILE_SCHEMA) return file;
  if (Object.keys(value).sort().join(',') !== 'bytes,data,encoding,schema,sha256' || value.encoding !== 'gzip-base64'
    || !Number.isSafeInteger(value.bytes) || value.bytes <= 0 || value.bytes > BACKUP_FILE_LIMITS.expandedBytes
    || typeof value.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.sha256)
    || typeof value.data !== 'string' || value.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value.data)) fail();
  const packed = Uint8Array.from(atob(value.data), ch => ch.charCodeAt(0));
  if (toBase64(packed) !== value.data) fail();
  const bytes = await transform(packed, 'decompress', value.bytes);
  if (bytes.length !== value.bytes || await hash(bytes) !== value.sha256) fail();
  const raw = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  // No nested compressed wrappers or compressed arbitrary local import payloads.
  if (JSON.parse(raw)?.schema !== 'flowme-alpha-sealed-account-backup/1') fail();
  return raw;
}
