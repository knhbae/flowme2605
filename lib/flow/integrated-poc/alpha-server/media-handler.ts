import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { readAlphaAuthConfig } from '../alpha-auth/config';
import { alphaRequestOrigin } from './request-origin';
import { canonicalJson, parseAlphaJson } from '../alpha-persistence/json';
import { programShape, programIdentifier } from '../program-data';
import type { ProgramMedia } from '../contract';
import { signAlphaCommand } from './command-proof';

export const ALPHA_MEDIA_POLICY = Object.freeze({ version: 1, bytes: 2_000_000, pixels: 16_000_000,
  requestBytes: 2_700_000, bucket: 'flowme-alpha-social-media-v1', stagedHours: 24 });
export const ALPHA_MEDIA_ID = /^media-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Authorization' };
type Reason = 'invalid' | 'unauthenticated' | 'not-found' | 'conflict' | 'idempotency-conflict' | 'rate-limited' | 'unavailable';
const failure = (reason: Reason, status = reason === 'unauthenticated' ? 401 : reason === 'not-found' ? 404 : reason === 'invalid' ? 400 : reason === 'rate-limited' ? 429 : reason === 'conflict' || reason === 'idempotency-conflict' ? 409 : 503) =>
  Response.json({ ok: false, reason }, { status, headers });
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

/** Decode and re-encode; no metadata-preservation method is called. */
export async function normalizeAlphaMedia(dataUrl: unknown) {
  if (typeof dataUrl !== 'string' || dataUrl.length > Math.ceil(ALPHA_MEDIA_POLICY.bytes * 4 / 3) + 100) throw Error('invalid');
  const match = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match || match[2].length % 4 !== 0) throw Error('invalid');
  const input = Buffer.from(match[2], 'base64');
  if (!input.length || input.length > ALPHA_MEDIA_POLICY.bytes || input.toString('base64') !== match[2]) throw Error('invalid');
  const options = { failOn: 'warning' as const, limitInputPixels: ALPHA_MEDIA_POLICY.pixels, animated: false };
  const metadata = await sharp(input, options).metadata();
  if (metadata.format !== match[1] || !metadata.width || !metadata.height || metadata.width * metadata.height > ALPHA_MEDIA_POLICY.pixels
    || (metadata.pages ?? 1) > 1) throw Error('invalid');
  const { data, info } = await sharp(input, options).rotate().webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
  if (!data.length || data.length > ALPHA_MEDIA_POLICY.bytes || info.width * info.height > ALPHA_MEDIA_POLICY.pixels) throw Error('invalid');
  return { data, sha256: digest(data), bytes: data.length, width: info.width, height: info.height };
}

async function boundedBytes(stream: ReadableStream<Uint8Array> | null, limit: number): Promise<Buffer> {
  if (!stream) throw Error('invalid');
  const reader = stream.getReader(), chunks: Uint8Array[] = []; let length = 0;
  try { for (;;) { const { done, value } = await reader.read(); if (done) break;
    length += value.length; if (length > limit) { await reader.cancel(); throw Error('invalid'); } chunks.push(value);
  } } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
type MediaLocation = { id: string; path: string; sha256: string; bytes: number };
function location(value: unknown): value is MediaLocation {
  if (!value || typeof value !== 'object') return false;
  const row = value as MediaLocation;
  return ALPHA_MEDIA_ID.test(row.id) && row.path === `media/${row.id}.webp` && /^[0-9a-f]{64}$/.test(row.sha256)
    && Number.isSafeInteger(row.bytes) && row.bytes > 0 && row.bytes <= ALPHA_MEDIA_POLICY.bytes;
}
function descriptor(value: unknown, id: string): value is ProgramMedia {
  return programShape(value, ['id','dataUrl','alt','synthetic']) && value.id === id && value.dataUrl === `flowme-media:${id}`
    && typeof value.alt === 'string' && value.alt.trim().length > 0 && value.alt.length <= 500 && typeof value.synthetic === 'boolean';
}
type StageLocation = MediaLocation & { status: 'uploading' | 'staged' | 'published'; media: ProgramMedia };
function stageLocation(value: unknown): value is StageLocation {
  if (!location(value) || !programShape(value, ['id','path','status','sha256','bytes','media'])) return false;
  const row = value as StageLocation;
  return descriptor(row.media,row.id) && ['uploading','staged','published'].includes(row.status);
}
function upstreamReason(value: unknown): Reason | null {
  return programShape(value, ['ok','reason']) && value.ok === false
    && ['invalid','unauthenticated','not-found','conflict','idempotency-conflict','rate-limited','unavailable'].includes(String(value.reason))
    ? value.reason as Reason : null;
}

export function createAlphaMediaHandler(env: Record<string, string | undefined>, fetcher: typeof fetch = fetch, options: { allowPreserved?: boolean } = {}) {
  const config = readAlphaAuthConfig(env), key = env.FLOWME_ALPHA_M3_SIGNING_KEY;
  return async (request: Request): Promise<Response> => {
    if (!config || !key || !/^[a-f0-9]{64}$/.test(key)) return failure('unavailable');
    const url = new URL(request.url);
    if (!['GET','POST','DELETE'].includes(request.method) || !alphaRequestOrigin(config, request)
      || url.hash) return failure('invalid');
    const authorization = request.headers.get('authorization');
    if (!authorization || !/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(authorization)) return failure('unauthenticated');
    const authHeaders = { apikey: config.publishableKey, Authorization: authorization };
    const call = (path: string, init: RequestInit = {}) => fetcher(`${config.url}${path}`, { ...init,
      headers: { ...authHeaders, ...init.headers }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20_000) });
    const rpc = async (name: string, payload: unknown) => {
      const response = await call(`/rest/v1/rpc/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw Error(response.status === 401 || response.status === 403 ? 'unauthenticated' : 'unavailable');
      const value: unknown = await response.json(), reason = upstreamReason(value);
      if (reason) throw Error(reason);
      if (!programShape(value, ['ok','value']) || value.ok !== true) throw Error('unavailable');
      return value.value;
    };
    const objectPath = (path: string, authenticated = false) => `/storage/v1/object/${authenticated ? 'authenticated/' : ''}${ALPHA_MEDIA_POLICY.bucket}/${path}`;
    const readObject = async (entry: MediaLocation) => {
      const response = await call(objectPath(entry.path, true));
      if (!response.ok) throw Error(response.status === 401 || response.status === 403 ? 'unauthenticated'
        : response.status >= 500 || response.status === 429 ? 'unavailable' : 'not-found');
      const bytes = await boundedBytes(response.body, ALPHA_MEDIA_POLICY.bytes);
      if (bytes.length !== entry.bytes || digest(bytes) !== entry.sha256) throw Error('corrupt-object');
      return bytes;
    };
    try {
      const userResponse = await call('/auth/v1/user');
      if (!userResponse.ok) return failure(userResponse.status === 401 || userResponse.status === 403 ? 'unauthenticated' : 'unavailable');
      const user: unknown = await userResponse.json();
      if (!user || typeof user !== 'object' || !('id' in user) || typeof user.id !== 'string' || !/^[0-9a-f-]{36}$/.test(user.id)
        || 'is_anonymous' in user && user.is_anonymous) return failure('unauthenticated');
      if (request.method !== 'POST') {
        const id = url.searchParams.get('id');
        if (url.searchParams.size !== 1 || url.searchParams.getAll('id').length !== 1 || !id || !ALPHA_MEDIA_ID.test(id)) return failure('invalid');
        if (request.method === 'GET') {
          const preserved = async () => {
            const entry = await rpc('flowme_alpha_preserved_media_read_v1', { media_id: id });
            if (!programShape(entry, ['id','mime','sha256','bytes','base64']) || entry.id !== id || entry.mime !== 'image/webp'
              || typeof entry.base64 !== 'string' || entry.base64.length > Math.ceil(ALPHA_MEDIA_POLICY.bytes / 3) * 4
              || typeof entry.sha256 !== 'string') throw Error('invalid');
            const bytes = Buffer.from(entry.base64, 'base64');
            if (!bytes.length || bytes.length !== entry.bytes || bytes.toString('base64') !== entry.base64 || digest(bytes) !== entry.sha256) throw Error('invalid');
            const fresh = await rpc('flowme_alpha_preserved_media_read_v1', { media_id: id });
            if (canonicalJson(fresh) !== canonicalJson(entry)) throw Error('not-found');
            return new Response(new Uint8Array(bytes), { headers: { ...headers, 'Content-Type': 'image/webp', 'Content-Length': String(bytes.length) } });
          };
          try {
          const value = await rpc('flowme_alpha_social_media_read_v1', { media_id: id });
          if (!location(value) || value.id !== id) return failure('invalid');
          const bytes = await readObject(value);
          // Recheck after fetching bytes: a delete/revoke during download is not returned.
          const fresh = await rpc('flowme_alpha_social_media_read_v1', { media_id: id });
          if (!location(fresh) || canonicalJson(value) !== canonicalJson(fresh)) return failure('not-found');
          return new Response(new Uint8Array(bytes), { headers: { ...headers, 'Content-Type': 'image/webp', 'Content-Length': String(bytes.length) } });
          } catch (error) {
            if (!(error instanceof Error) || !['not-found','corrupt-object'].includes(error.message)) throw error;
            if (options.allowPreserved === false) throw Error(error.message === 'corrupt-object' ? 'invalid' : error.message);
            try { return await preserved(); } catch (fallback) {
              if (error.message === 'corrupt-object' && fallback instanceof Error && fallback.message === 'not-found') throw Error('invalid');
              throw fallback;
            }
          }
        }
        const value = await rpc('flowme_alpha_social_media_cancel_v1', { media_id: id });
        if (!programShape(value, ['id','path']) || value.id !== id || value.path !== `media/${id}.webp`) return failure('invalid');
        const removed = await call(`/storage/v1/object/${ALPHA_MEDIA_POLICY.bucket}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [value.path] }) });
        if (!removed.ok) return failure('unavailable');
        return Response.json({ ok: true, value: { id } }, { headers });
      }
      if (url.search || !request.headers.get('content-type')?.startsWith('application/json')) return failure('invalid');
      const input: unknown = parseAlphaJson((await boundedBytes(request.body, ALPHA_MEDIA_POLICY.requestBytes)).toString('utf8'));
      if (!programShape(input, ['kind','requestId','dataUrl','alt','synthetic']) || input.kind !== 'stage'
        || !programIdentifier(input.requestId) || input.requestId.length > 160 || typeof input.alt !== 'string'
        || !input.alt.trim() || input.alt.length > 500 || typeof input.synthetic !== 'boolean') return failure('invalid');
      let normalized: Awaited<ReturnType<typeof normalizeAlphaMedia>>;
      try { normalized = await normalizeAlphaMedia(input.dataUrl); } catch { return failure('invalid'); }
      let payload = { schema: 'flowme-alpha-media-stage/1', action: 'reserve', id: `media-${randomUUID()}`, requestId: input.requestId,
        sha256: normalized.sha256, bytes: normalized.bytes, width: normalized.width, height: normalized.height, alt: input.alt, synthetic: input.synthetic };
      const stage = async () => { const stageText = canonicalJson(payload); return rpc('flowme_alpha_social_media_stage_v1', { stage_text: stageText, proof: signAlphaCommand(user.id as string, stageText, key) }); };
      const reserved = await stage();
      if (!stageLocation(reserved)
        || reserved.sha256 !== normalized.sha256 || reserved.bytes !== normalized.bytes
        || reserved.media.alt !== input.alt || reserved.media.synthetic !== input.synthetic) return failure('invalid');
      if (reserved.status === 'uploading') {
        const uploaded = await call(objectPath(reserved.path), { method: 'POST', headers: { 'Content-Type': 'image/webp', 'x-upsert': 'false' }, body: new Uint8Array(normalized.data) });
        // A lost upload response/retry may find its exact immutable object already there.
        // Always verify bytes before allowing ready; no silent overwrite is possible.
        if (!uploaded.ok && uploaded.status !== 400 && uploaded.status !== 409) return failure('unavailable');
      }
      await readObject(reserved);
      payload = { ...payload, id: reserved.id, action: 'ready' };
      const ready = await stage();
      if (!stageLocation(ready) || ready.id !== reserved.id || ready.status === 'uploading'
        || ready.sha256 !== normalized.sha256 || ready.bytes !== normalized.bytes
        || canonicalJson(ready.media) !== canonicalJson(reserved.media)) return failure('invalid');
      return Response.json({ ok: true, value: ready.media }, { headers });
    } catch (error) {
      const reason = error instanceof Error ? error.message : '';
      return failure((['invalid','unauthenticated','not-found','conflict','idempotency-conflict','rate-limited'].includes(reason) ? reason : 'unavailable') as Reason);
    }
  };
}
