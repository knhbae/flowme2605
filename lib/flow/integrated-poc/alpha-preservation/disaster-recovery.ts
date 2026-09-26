import type { AlphaAccount } from '../alpha-persistence/contract';
import { canonicalJson, detached, hashJson, parseAlphaJson, sha256 } from '../alpha-persistence/json';
import { validateAlphaAccount } from '../alpha-persistence/program-adapter';
import { alphaSocialReferences, emptyAlphaReferences, isAlphaSocialContext, type AlphaSocialContext } from '../alpha-social/projection';
import { programShape } from '../program-data';

/** Administrator-only rehearsal package. Never accepted by account restore APIs. */
export const SERVICE_DR_SCHEMA = 'flowme-alpha-service-dr/2' as const;
export const SERVICE_DR_LEGACY_SCHEMA = 'flowme-alpha-service-dr/1' as const;
export const SERVICE_DR_PROJECT = 'wkmzcxpnojobxrgebapw' as const;
export const SERVICE_DR_LEGACY_TABLE_COLUMNS = Object.freeze({
  'public.flowme_alpha_accounts': ['owner_id', 'account'],
  'flowme_private.alpha_operations_v1': ['owner_id', 'request_id', 'command', 'receipt', 'inverse', 'undone'],
  'flowme_private.alpha_social_identities_v1': ['owner_id', 'public_actor_id', 'display_name'],
  'flowme_private.alpha_social_state_v1': ['id', 'revision', 'repository'],
  'flowme_private.alpha_social_rate_v1': ['owner_id', 'window_started_at', 'successful_commands'],
  'flowme_private.alpha_social_media_v1': ['id', 'owner_id', 'request_id', 'object_path', 'sha256', 'bytes', 'width', 'height', 'alt', 'synthetic', 'status', 'created_at', 'expires_at'],
  'flowme_private.alpha_preservation_archives_v1': ['owner_id', 'source_sha256', 'source_raw', 'source_actor_id', 'receipt', 'created_at'],
} as const);
export const SERVICE_DR_TABLE_COLUMNS = Object.freeze({ ...SERVICE_DR_LEGACY_TABLE_COLUMNS,
  'flowme_private.alpha_preserved_media_v1': ['owner_id','media_id','sha256','mime','bytes','content','restored_request_id'],
} as const);
export type ServiceDrTable = keyof typeof SERVICE_DR_TABLE_COLUMNS;
export type ServiceDrRows = Record<keyof typeof SERVICE_DR_LEGACY_TABLE_COLUMNS, Record<string, unknown>[]> & Partial<Record<'flowme_private.alpha_preserved_media_v1',Record<string,unknown>[]>>;
export type ServiceDrInput = { projectRef: typeof SERVICE_DR_PROJECT; createdAt: string; schemaHash: string; tables: ServiceDrRows; objectPaths: string[] };
export type ServiceDrFile = { path: string; mime: 'image/webp'; base64: string; bytes: number; sha256: string };
export type ServiceDrBackup = ServiceDrInput & { schema: typeof SERVICE_DR_SCHEMA | typeof SERVICE_DR_LEGACY_SCHEMA; owners: string[]; files: ServiceDrFile[];
  coverage: { environment: 'same-dev-isolated-namespace-rehearsal'; authentication: 'owner-identifiers-only-no-credentials'; files: 'existing-object-bytes'; historicalMissingAttachments: 'not-resurrected' };
  manifest: { payloadSha256: string; tableHashes: Record<ServiceDrTable, string>; rowCounts: Record<ServiceDrTable, number> } };
const coverage: ServiceDrBackup['coverage'] = { environment: 'same-dev-isolated-namespace-rehearsal', authentication: 'owner-identifiers-only-no-credentials', files: 'existing-object-bytes', historicalMissingAttachments: 'not-resurrected' };
export const serviceDrTableKeys = (schema: ServiceDrBackup['schema']) => Object.keys(schema === SERVICE_DR_LEGACY_SCHEMA ? SERVICE_DR_LEGACY_TABLE_COLUMNS : SERVICE_DR_TABLE_COLUMNS) as ServiceDrTable[];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const mediaPattern = /^media-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const hashPattern = /^[a-f0-9]{64}$/;
function need(value: unknown, reason: string): asserts value { if (!value) throw Error(`invalid-service-dr:${reason}`); }
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
const timestamp = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v)) && /^\d{4}-\d{2}-\d{2}T/.test(v);
const integer = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number => Number.isSafeInteger(v) && (v as number) >= min && (v as number) <= max;
export const disasterRecoverySchemaHash = (schema: ServiceDrBackup['schema'] = SERVICE_DR_SCHEMA) => hashJson(schema === SERVICE_DR_LEGACY_SCHEMA ? SERVICE_DR_LEGACY_TABLE_COLUMNS : SERVICE_DR_TABLE_COLUMNS);
export function serviceDrRowKey(table: ServiceDrTable, row: Record<string, unknown>): string {
  if (table === 'flowme_private.alpha_operations_v1') return canonicalJson([row.owner_id, row.request_id]);
  if (table === 'flowme_private.alpha_preservation_archives_v1') return canonicalJson([row.owner_id, row.source_sha256]);
  if (table === 'flowme_private.alpha_preserved_media_v1') return canonicalJson([row.owner_id,row.media_id]);
  if (table === 'flowme_private.alpha_social_state_v1') return 'true';
  if (table === 'flowme_private.alpha_social_media_v1') return String(row.id);
  return String(row.owner_id);
}
function encode(bytes: Uint8Array) { let text = ''; for (let n = 0; n < bytes.length; n += 8192) text += String.fromCharCode(...bytes.subarray(n, n + 8192)); return btoa(text); }
function decode(text: string): Uint8Array {
  need(typeof text === 'string' && text.length <= 2_666_668 && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text), 'base64');
  const bytes = Uint8Array.from(atob(text), c => c.charCodeAt(0)); need(bytes.length > 0 && bytes.length <= 2_000_000 && encode(bytes) === text, 'bytes'); return bytes;
}
async function validateRows(input: ServiceDrInput, schema: ServiceDrBackup['schema']): Promise<string[]> {
  const keys=serviceDrTableKeys(schema);
  function rejectCredentials(part: unknown): void {
    if (!part || typeof part !== 'object') return;
    for (const [key, child] of Object.entries(part)) {
      need(!['access_token', 'refresh_token', 'secret_key', 'password', 'authorization', 'service_role'].includes(key.toLowerCase()), 'credential-field');
      rejectCredentials(child);
    }
  }
  rejectCredentials(input);
  need(input.projectRef === SERVICE_DR_PROJECT, 'project');
  need(timestamp(input.createdAt) && new Date(input.createdAt).toISOString() === input.createdAt, 'timestamp');
  need(input.schemaHash === await disasterRecoverySchemaHash(schema), 'schema-contract');
  need(programShape(input.tables, keys), 'table-allowlist');
  for (const table of keys) {
    const rows = input.tables[table]; need(Array.isArray(rows) && rows.length <= 100_000, 'rows');
    const seen = new Set<string>();
    for (const row of rows) {
      need(programShape(row, [...SERVICE_DR_TABLE_COLUMNS[table]]), 'column-allowlist');
      const key = serviceDrRowKey(table, row); need(!seen.has(key), 'duplicate-row'); seen.add(key);
    }
  }
  const accounts = input.tables['public.flowme_alpha_accounts'], identities = input.tables['flowme_private.alpha_social_identities_v1'];
  const owners = accounts.map(row => row.owner_id as string).sort();
  need(owners.length > 0 && owners.length <= 512 && owners.every(owner => typeof owner === 'string' && uuid.test(owner)), 'owners');
  const byOwner = new Map(accounts.map(row => [row.owner_id, row.account as AlphaAccount]));
  const aliases = new Set<string>();
  for (const row of identities) {
    need(owners.includes(row.owner_id as string) && typeof row.public_actor_id === 'string' && /^member-[0-9a-f-]{36}$/.test(row.public_actor_id) && !aliases.has(row.public_actor_id), 'identity');
    need(typeof row.display_name === 'string' && row.display_name.trim().length > 0 && row.display_name.length <= 80, 'display-name'); aliases.add(row.public_actor_id);
  }
  const states = input.tables['flowme_private.alpha_social_state_v1']; need(states.length === 1 && states[0].id === true && integer(states[0].revision), 'shared-state');
  const state = states[0];
  if (!identities.length) need(Object.values(state.repository as object).every(rows => Array.isArray(rows) && rows.length === 0), 'missing-identities');
  for (const row of accounts) {
    const identity = identities.find(entry => entry.owner_id === row.owner_id), account = row.account as AlphaAccount;
    let refs = emptyAlphaReferences(row.owner_id as string);
    if (identity) {
      const context = { schema: 'flowme-alpha-social-context/1', revision: state.revision, ownActorId: identity.public_actor_id,
        actors: identities.map(entry => ({ id: entry.public_actor_id, name: entry.display_name })), public: state.repository };
      need(isAlphaSocialContext(context, { server: true }), 'public-graph'); refs = alphaSocialReferences(context as AlphaSocialContext, row.owner_id as string);
    }
    need(account?.source.actorId === row.owner_id && validateAlphaAccount(account, refs, row.owner_id as string), 'account-graph');
  }
  const operations = input.tables['flowme_private.alpha_operations_v1'];
  for (const owner of owners) {
    const ordered = operations.filter(row => row.owner_id === owner).sort((a, b) => Number((a.receipt as any).revision) - Number((b.receipt as any).revision));
    need(ordered.length === byOwner.get(owner)!.revision, 'journal-completeness');
    ordered.forEach((row, index) => {
      const command = row.command as any, receipt = row.receipt as any;
      need(typeof row.request_id === 'string' && row.request_id.length > 0 && row.request_id.length <= 160 && typeof row.undone === 'boolean' && Array.isArray(row.inverse), 'journal-row');
      need(command && typeof command === 'object' && !Array.isArray(command) && typeof command.schema === 'string' && /^flowme-alpha-[a-z0-9-]+\/\d+$/.test(command.schema), 'journal-command');
      need(command.requestId === row.request_id && command.expectedRevision === index && receipt?.requestId === row.request_id && receipt.changed === true && receipt.revision === index + 1, 'journal-continuity');
    });
  }
  for (const row of operations) need(owners.includes(row.owner_id as string), 'journal-owner');
  for (const row of input.tables['flowme_private.alpha_social_rate_v1']) need(owners.includes(row.owner_id as string) && timestamp(row.window_started_at) && integer(row.successful_commands, 1, 120), 'rate');
  for (const row of input.tables['flowme_private.alpha_preservation_archives_v1']) {
    need(owners.includes(row.owner_id as string) && typeof row.source_raw === 'string' && row.source_raw.length > 0 && row.source_sha256 === await sha256(new TextEncoder().encode(row.source_raw)), 'archive-source');
    need(typeof row.source_actor_id === 'string' && row.source_actor_id.trim().length > 0 && timestamp(row.created_at) && !!row.receipt && typeof row.receipt === 'object' && !Array.isArray(row.receipt), 'archive');
  }
  need(Array.isArray(input.objectPaths) && input.objectPaths.length <= 512 && new Set(input.objectPaths).size === input.objectPaths.length, 'object-paths');
  const media = input.tables['flowme_private.alpha_social_media_v1']; const requestKeys = new Set<string>();
  const preserved=input.tables['flowme_private.alpha_preserved_media_v1']??[];
  for(const row of preserved) {
    need(typeof row.media_id==='string'&&mediaPattern.test(row.media_id)&&owners.includes(row.owner_id as string),'preserved-owner');
    need(typeof row.content==='string'&&/^\\x(?:[a-f0-9]{2})+$/.test(row.content)&&row.content.length<=4_000_002,'preserved-content');
    const bytes=Uint8Array.from(row.content.slice(2).match(/../g)!,n=>parseInt(n,16));
    need(row.mime==='image/webp'&&row.bytes===bytes.length&&row.sha256===await sha256(bytes),'preserved-integrity');
    need(media.some(m=>m.id===row.media_id&&m.owner_id===row.owner_id&&m.sha256===row.sha256&&m.bytes===row.bytes),'preserved-registry');
    need(operations.some(op=>op.owner_id===row.owner_id&&op.request_id===row.restored_request_id&&(op.command as any).kind==='preservation'),'preserved-operation');
  }
  for (const row of media) {
    need(typeof row.id === 'string' && mediaPattern.test(row.id) && row.object_path === `media/${row.id}.webp` && owners.includes(row.owner_id as string), 'media-owner-path');
    need(typeof row.request_id === 'string' && row.request_id.length > 0 && row.request_id.length <= 160 && typeof row.sha256 === 'string' && hashPattern.test(row.sha256), 'media-identity');
    const requestKey = canonicalJson([row.owner_id, row.request_id]); need(!requestKeys.has(requestKey), 'media-request'); requestKeys.add(requestKey);
    need(integer(row.bytes, 1, 2_000_000) && integer(row.width, 1, 16_000_000) && integer(row.height, 1, 16_000_000) && row.width * row.height <= 16_000_000, 'media-size');
    need(typeof row.alt === 'string' && row.alt.trim().length > 0 && row.alt.length <= 500 && typeof row.synthetic === 'boolean' && timestamp(row.created_at) && timestamp(row.expires_at), 'media-details');
    need(['uploading', 'staged', 'published', 'detached', 'cancelled'].includes(row.status as string), 'media-status');
    if (row.status === 'staged' || row.status === 'published') need(input.objectPaths.includes(row.object_path) || row.status==='staged'&&preserved.some(p=>p.owner_id===row.owner_id&&p.media_id===row.id), 'missing-current-file');
  }
  for (const path of input.objectPaths) need(typeof path === 'string' && media.some(row => row.object_path === path), 'unregistered-object');
  const posts = (state.repository as any).posts as any[];
  for (const post of posts) for (const photo of post.media) {
    need(typeof photo.dataUrl === 'string' && photo.dataUrl === `flowme-media:${photo.id}`, 'public-media-descriptor');
    const row = media.find(entry => entry.id === photo.id), author = identities.find(entry => entry.public_actor_id === post.authorId);
    need(row && author && row.owner_id === author.owner_id && row.status === 'published' && row.synthetic === photo.synthetic && input.objectPaths.includes(row.object_path as string), 'public-media-relation');
  }
  for (const row of media) if (row.status === 'published') need(posts.some(post => !post.deleted && post.media.some((photo: any) => photo.id === row.id)), 'published-media-link');
  function privateMedia(part: unknown, owner: string): void {
    if (!part || typeof part !== 'object') return;
    if (Object.hasOwn(part, 'dataUrl')) {
      const photo = part as { id: unknown; dataUrl: unknown };
      if (typeof photo.dataUrl === 'string' && photo.dataUrl.startsWith('flowme-media:')) {
        const row = media.find(entry => entry.id === photo.id);
        need(row && row.owner_id === owner && photo.dataUrl === `flowme-media:${row.id}` && ['staged', 'published'].includes(row.status as string) && (input.objectPaths.includes(row.object_path as string)||preserved.some(p=>p.owner_id===owner&&p.media_id===row.id)), 'private-media-relation');
      }
    }
    for (const child of Object.values(part)) privateMedia(child, owner);
  }
  for (const row of accounts) privateMedia(row.account, row.owner_id as string);
  return owners;
}
export async function createDisasterRecoveryBackup(input: ServiceDrInput, resolveFile: (path: string) => Promise<{ mime: string; bytes: Uint8Array }>): Promise<ServiceDrBackup> {
  const schema=input.schemaHash===await disasterRecoverySchemaHash(SERVICE_DR_LEGACY_SCHEMA)?SERVICE_DR_LEGACY_SCHEMA:SERVICE_DR_SCHEMA;
  const keys=serviceDrTableKeys(schema);
  const copy = detached(input); need(programShape(copy, ['projectRef', 'createdAt', 'schemaHash', 'tables', 'objectPaths']), 'input');
  const owners = await validateRows(copy,schema);
  for (const table of keys) copy.tables[table]!.sort((a, b) => { const left = serviceDrRowKey(table, a), right = serviceDrRowKey(table, b); return left < right ? -1 : left > right ? 1 : 0; });
  copy.objectPaths.sort(); const files: ServiceDrFile[] = [];
  for (const path of copy.objectPaths) {
    const file = await resolveFile(path), row = copy.tables['flowme_private.alpha_social_media_v1'].find(entry => entry.object_path === path)!;
    need(file?.mime === 'image/webp' && file.bytes instanceof Uint8Array && file.bytes.length === row.bytes && await sha256(file.bytes) === row.sha256, 'file-integrity');
    files.push({ path, mime: 'image/webp', base64: encode(file.bytes), bytes: file.bytes.length, sha256: row.sha256 as string });
  }
  const tableHashes = {} as Record<ServiceDrTable, string>, rowCounts = {} as Record<ServiceDrTable, number>;
  for (const table of keys) { tableHashes[table] = await hashJson(copy.tables[table]); rowCounts[table] = copy.tables[table]!.length; }
  const payload = { schema, ...copy, owners, coverage, files };
  const backup = { ...payload, manifest: { payloadSha256: await hashJson(payload), tableHashes, rowCounts } }; canonicalJson(backup); return backup;
}
export async function validateDisasterRecoveryBackup(raw: string): Promise<{ ok: true; value: ServiceDrBackup } | { ok: false; reason: 'invalid-service-dr' }> {
  try {
    const unknownValue = parseAlphaJson(raw); need(programShape(unknownValue, ['schema', 'projectRef', 'createdAt', 'schemaHash', 'tables', 'objectPaths', 'owners', 'coverage', 'files', 'manifest']), 'package');
    const value = unknownValue as ServiceDrBackup; need([SERVICE_DR_SCHEMA,SERVICE_DR_LEGACY_SCHEMA].includes(value.schema) && Array.isArray(value.files), 'schema');
    const files = new Map<string, ServiceDrFile>();
    for (const file of value.files) { need(programShape(file, ['path', 'mime', 'base64', 'bytes', 'sha256']) && !files.has(file.path), 'file'); files.set(file.path, file); }
    const expected = await createDisasterRecoveryBackup({ projectRef: value.projectRef, createdAt: value.createdAt, schemaHash: value.schemaHash, tables: value.tables, objectPaths: value.objectPaths }, async path => {
      const file = files.get(path); need(file, 'missing-file'); return { mime: file.mime, bytes: decode(file.base64) };
    });
    need(same(expected, value), 'manifest'); return { ok: true, value: expected };
  } catch { return { ok: false, reason: 'invalid-service-dr' }; }
}
