import assert from 'node:assert/strict';
import test from 'node:test';
import { ALPHA_SCHEMA } from '../alpha-persistence/contract';
import { PROGRAM_SCHEMA } from '../contract';
import { createProgramPrivateSpace } from '../program-data';
import { canonicalJson, detached, sha256 } from '../alpha-persistence/json';
import { SERVICE_DR_PROJECT, SERVICE_DR_TABLE_COLUMNS, SERVICE_DR_LEGACY_SCHEMA, createDisasterRecoveryBackup, disasterRecoverySchemaHash, validateDisasterRecoveryBackup, type ServiceDrInput, type ServiceDrRows } from './disaster-recovery';
const owner = '11111111-1111-4111-8111-111111111111', alias = `member-${owner}`;
const media = 'media-22222222-2222-4222-8222-222222222222', now = '2026-09-21T14:00:00.000Z';
const bytes = new Uint8Array([82, 73, 70, 70, 1, 2, 3]);
async function seed(photo = false): Promise<ServiceDrInput> {
  const tables = Object.fromEntries(Object.keys(SERVICE_DR_TABLE_COLUMNS).map(key => [key, []])) as unknown as ServiceDrRows;
  tables['public.flowme_alpha_accounts'] = [{ owner_id: owner, account: { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 }, space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] } }];
  tables['flowme_private.alpha_social_identities_v1'] = [{ owner_id: owner, public_actor_id: alias, display_name: 'QA' }];
  tables['flowme_private.alpha_social_state_v1'] = [{ id: true, revision: 0, repository: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } }];
  const objectPaths: string[] = [];
  if (photo) {
    const objectPath = `media/${media}.webp`; objectPaths.push(objectPath);
    tables['flowme_private.alpha_social_media_v1'] = [{ id: media, owner_id: owner, request_id: 'photo', object_path: objectPath, sha256: await sha256(bytes), bytes: bytes.length, width: 1, height: 1, alt: 'QA photo', synthetic: true, status: 'published', created_at: now, expires_at: '2026-09-22T14:00:00.000Z' }];
    (tables['flowme_private.alpha_social_state_v1'][0].repository as any).posts = [{ id: 'post', authorId: alias, kind: 'experience', title: '사진', body: '실제 파일 bytes 검증', topic: 'QA', flowId: null, versionId: null, itemId: null, evidencePostIds: [], media: [{ id: media, dataUrl: `flowme-media:${media}`, alt: 'QA photo', synthetic: true }], createdAt: now, updatedAt: now, deleted: false }];
  }
  return { projectRef: SERVICE_DR_PROJECT, createdAt: now, schemaHash: await disasterRecoverySchemaHash(), tables, objectPaths };
}
const resolver = async () => ({ mime: 'image/webp', bytes });

test('legacy v1 seven-table packages remain exact while v2 preserves private bytea',async()=>{
  const legacy=await seed();delete legacy.tables['flowme_private.alpha_preserved_media_v1'];legacy.schemaHash=await disasterRecoverySchemaHash(SERVICE_DR_LEGACY_SCHEMA);
  const old=await createDisasterRecoveryBackup(legacy,resolver);assert.equal(old.schema,SERVICE_DR_LEGACY_SCHEMA);assert((await validateDisasterRecoveryBackup(canonicalJson(old))).ok);
  const input=await seed(true);input.objectPaths=[];(input.tables['flowme_private.alpha_social_state_v1'][0].repository as any).posts=[];
  input.tables['flowme_private.alpha_social_media_v1'][0].status='staged';
  (input.tables['public.flowme_alpha_accounts'][0].account as any).revision=1;
  input.tables['flowme_private.alpha_operations_v1']=[{owner_id:owner,request_id:'restore-photo',command:{schema:'flowme-alpha-preservation-command/1',kind:'preservation',requestId:'restore-photo',expectedRevision:0},receipt:{requestId:'restore-photo',revision:1,changed:true},inverse:[],undone:false}];
  input.tables['flowme_private.alpha_preserved_media_v1']=[{owner_id:owner,media_id:media,mime:'image/webp',sha256:await sha256(bytes),bytes:bytes.length,content:`\\x${Buffer.from(bytes).toString('hex')}`,restored_request_id:'restore-photo'}];
  const backup=await createDisasterRecoveryBackup(input,resolver);assert.equal(backup.schema,'flowme-alpha-service-dr/2');assert.equal(backup.files.length,0);assert((await validateDisasterRecoveryBackup(canonicalJson(backup))).ok);
  input.tables['flowme_private.alpha_preserved_media_v1'][0].content='\\x00';await assert.rejects(createDisasterRecoveryBackup(input,resolver));
});
test('DR roundtrip preserves current domain graph and exact actual file bytes', async () => {
  const input = await seed(true), before = canonicalJson(input), backup = await createDisasterRecoveryBackup(input, resolver);
  assert.equal(canonicalJson(input), before); assert.equal(backup.files.length, 1); assert.equal(backup.files[0].sha256, await sha256(bytes));
  assert.deepEqual(await validateDisasterRecoveryBackup(canonicalJson(backup)), { ok: true, value: backup });
  assert.equal(backup.manifest.rowCounts['public.flowme_alpha_accounts'], 1); assert.equal(backup.coverage.authentication, 'owner-identifiers-only-no-credentials');
});
test('cancelled registry tombstones need no historical file and do not resurrect public content', async () => {
  const input = await seed(true); input.objectPaths = []; input.tables['flowme_private.alpha_social_media_v1'][0].status = 'cancelled';
  (input.tables['flowme_private.alpha_social_state_v1'][0].repository as any).posts = [];
  const backup = await createDisasterRecoveryBackup(input, async () => { throw Error('no bytes'); }); assert.deepEqual(backup.files, []);
});
test('complete journal including cleanup records retains receipts and inverse evidence', async () => {
  const input = await seed(); (input.tables['public.flowme_alpha_accounts'][0].account as any).revision = 1;
  input.tables['flowme_private.alpha_operations_v1'] = [{ owner_id: owner, request_id: 'clean', command: { schema: 'flowme-alpha-test-cleanup/1', kind: 'social', requestId: 'clean', expectedRevision: 0, productUndoAllowed: false }, receipt: { requestId: 'clean', changed: true, revision: 1, kind: 'social' }, inverse: [], undone: true }];
  const backup = await createDisasterRecoveryBackup(input, resolver); assert.deepEqual(backup.tables['flowme_private.alpha_operations_v1'], input.tables['flowme_private.alpha_operations_v1']);
  input.tables['flowme_private.alpha_operations_v1'] = []; await assert.rejects(createDisasterRecoveryBackup(input, resolver), /journal-completeness/);
});
test('nested journal credentials and unlinked published media are rejected', async () => {
  const input = await seed(); (input.tables['public.flowme_alpha_accounts'][0].account as any).revision = 1;
  input.tables['flowme_private.alpha_operations_v1'] = [{ owner_id: owner, request_id: 'clean', command: { schema: 'flowme-alpha-test-cleanup/1', kind: 'social', requestId: 'clean', expectedRevision: 0, access_token: 'not-for-backup' }, receipt: { requestId: 'clean', changed: true, revision: 1, kind: 'social' }, inverse: [], undone: true }];
  await assert.rejects(createDisasterRecoveryBackup(input, resolver), /credential-field/);
  const photo = await seed(true); (photo.tables['flowme_private.alpha_social_state_v1'][0].repository as any).posts = [];
  await assert.rejects(createDisasterRecoveryBackup(photo, resolver), /published-media-link/);
});
test('preserves archive source bytes and verifies their own digest', async () => {
  const input = await seed(), raw = '  source\r\n원문';
  input.tables['flowme_private.alpha_preservation_archives_v1'] = [{ owner_id: owner, source_sha256: await sha256(new TextEncoder().encode(raw)), source_raw: raw, source_actor_id: 'local', receipt: {}, created_at: now }];
  const backup = await createDisasterRecoveryBackup(input, resolver); assert.equal(backup.tables['flowme_private.alpha_preservation_archives_v1'][0].source_raw, raw);
  input.tables['flowme_private.alpha_preservation_archives_v1'][0].source_raw = raw.trim(); await assert.rejects(createDisasterRecoveryBackup(input, resolver));
});
for (const kind of ['project', 'schema', 'table', 'column', 'owner', 'alias', 'objectPath', 'missingFile', 'byteMismatch', 'duplicateRow'] as const) test(`rejects DR ${kind}`, async () => {
  const input: any = await seed(true);
  if (kind === 'project') input.projectRef = 'ldellkztijrijbpwthjl';
  if (kind === 'schema') input.schemaHash = '0'.repeat(64);
  if (kind === 'table') input.tables['auth.users'] = [];
  if (kind === 'column') input.tables['public.flowme_alpha_accounts'][0].password = 'secret';
  if (kind === 'owner') input.tables['flowme_private.alpha_social_media_v1'][0].owner_id = 'foreign';
  if (kind === 'alias') input.tables['flowme_private.alpha_social_identities_v1'][0].public_actor_id = 'member-invalid';
  if (kind === 'objectPath') input.objectPaths = ['../../private'];
  if (kind === 'missingFile') input.objectPaths = [];
  if (kind === 'byteMismatch') input.tables['flowme_private.alpha_social_media_v1'][0].sha256 = '0'.repeat(64);
  if (kind === 'duplicateRow') input.tables['public.flowme_alpha_accounts'].push(detached(input.tables['public.flowme_alpha_accounts'][0]));
  await assert.rejects(createDisasterRecoveryBackup(input, resolver));
});
test('old compatible optional fields roundtrip, unknown newer contract fails closed', async () => {
  const input = await seed(), account = input.tables['public.flowme_alpha_accounts'][0].account as any;
  delete account.space.recurrenceExecution; delete account.space.documentTrash;
  const backup = await createDisasterRecoveryBackup(input, resolver); assert((await validateDisasterRecoveryBackup(canonicalJson(backup))).ok);
  assert(!(await validateDisasterRecoveryBackup(canonicalJson({ ...backup, schema: 'flowme-alpha-service-dr/99' }))).ok);
  account.space.futureUnknownField = true; await assert.rejects(createDisasterRecoveryBackup(input, resolver));
});
test('missing/extraneous/duplicate/corrupt binary and manifest fail before restore', async () => {
  const backup = await createDisasterRecoveryBackup(await seed(true), resolver);
  for (const kind of ['missing', 'extra', 'duplicate', 'corrupt', 'manifest']) {
    const value = detached(backup);
    if (kind === 'missing') value.files = [];
    if (kind === 'extra') value.files.push({ ...value.files[0], path: 'extra.webp' });
    if (kind === 'duplicate') value.files.push(value.files[0]);
    if (kind === 'corrupt') value.files[0].base64 = 'AAAA';
    if (kind === 'manifest') value.manifest.payloadSha256 = '0'.repeat(64);
    assert(!(await validateDisasterRecoveryBackup(canonicalJson(value))).ok);
  }
});
