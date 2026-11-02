// Local synthetic PostgreSQL check for preservation read v2. Never points at Supabase:
// it refuses any host but 127.0.0.1, uses one synthetic owner, a synthetic key and
// local trust auth. The real preservation handler talks to a small PostgREST stand-in
// that runs each RPC through psql as `authenticated` with the request claims set.
//
//   FLOWME_PG_BIN=<pgsql/bin> FLOWME_PG_PORT=3122 FLOWME_PG_DB=<db> FLOWME_PG_WORK=<scratch dir>
//   FLOWME_PG_ROWS=1933 FLOWME_PG_BIG_REVISION=1900 FLOWME_PG_DR=0|1 FLOWME_PG_EDGE=0|1  tsx scripts/alpha/preservation-read-v2-pg.test.ts
// The database must already have the repository migrations applied (00000000000000 stubs first).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createAlphaPreservationHandler } from '../../lib/flow/integrated-poc/alpha-server/preservation-handler';
import { signAlphaCommand } from '../../lib/flow/integrated-poc/alpha-server/command-proof';
import { canonicalJson, sha256 } from '../../lib/flow/integrated-poc/alpha-persistence/json';
import { createProgramPrivateSpace } from '../../lib/flow/integrated-poc/program-data';
import { createAlphaSyntheticFixtures } from '../../lib/flow/integrated-poc/alpha-persistence/synthetic-fixtures';
import { prepareLocalImport } from '../../lib/flow/integrated-poc/alpha-preservation/import';
import { alphaSocialReferences, type AlphaSocialContext } from '../../lib/flow/integrated-poc/alpha-social/projection';
import { validateAlphaAccount } from '../../lib/flow/integrated-poc/alpha-persistence/program-adapter';
import { PRESERVATION_PROTOCOL, SEALED_BACKUP_SCHEMA, type PreservationCommand } from '../../lib/flow/integrated-poc/alpha-preservation/contract';
import { BACKUP_DOWNLOAD_FORMAT } from '../../lib/flow/integrated-poc/alpha-preservation/backup-download';
import { decodeBackupFile } from '../../lib/flow/integrated-poc/alpha-preservation/file-codec';
import { OPERATION_HEAD_SCHEMA } from '../../lib/flow/integrated-poc/alpha-preservation/backup';
import { createDisasterRecoveryBackup, disasterRecoverySchemaHash, SERVICE_DR_PROJECT, SERVICE_DR_TABLE_COLUMNS, validateDisasterRecoveryBackup } from '../../lib/flow/integrated-poc/alpha-preservation/disaster-recovery';
import model from '../../lib/flow/integrated-poc/vendor/text-model.cjs';

const bin = process.env.FLOWME_PG_BIN!, port = process.env.FLOWME_PG_PORT!, db = process.env.FLOWME_PG_DB!, work = process.env.FLOWME_PG_WORK!;
const rows = Number(process.env.FLOWME_PG_ROWS ?? 1933), big = Number(process.env.FLOWME_PG_BIG_REVISION ?? 0), withDr = process.env.FLOWME_PG_DR === '1';
assert(bin && /^31[2][0-9]$/.test(port ?? '') && db && work, 'set FLOWME_PG_BIN, FLOWME_PG_PORT (3120-3129), FLOWME_PG_DB, FLOWME_PG_WORK');
mkdirSync(work, { recursive: true });
const owner = '11111111-1111-4111-8111-111111111111', session = '33333333-3333-4333-8333-333333333333';
const alias = 'member-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', key = '11'.repeat(32); // synthetic only, matches the /2 golden seal
const claims = { sub: owner, session_id: session, exp: 4102444800, is_anonymous: false, role: 'authenticated' };
const env = { FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: 'development', FLOWME_ALPHA_PROJECT_REF: 'wkmzcxpnojobxrgebapw',
  FLOWME_ALPHA_SUPABASE_URL: 'https://wkmzcxpnojobxrgebapw.supabase.co', FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_publishable_fixture',
  FLOWME_ALPHA_REDIRECT_URL: 'http://localhost:3104/auth/callback', FLOWME_ALPHA_M3_SIGNING_KEY: key };
const log: Record<string, unknown>[] = [];
let sequence = 0;

function psql(sql: string): string {
  const file = join(work, `q-${++sequence}.sql`), out = join(work, `q-${sequence}.out`);
  writeFileSync(file, sql);
  const run = spawnSync(join(bin, 'psql.exe'), ['-h', '127.0.0.1', '-p', port, '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-q', '-At', '-f', file, '-o', out],
    { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (run.status !== 0) throw Error(`psql ${sequence}: ${run.stderr.slice(0, 400)}`);
  return readFileSync(out, 'utf8').trim();
}
const literal = (value: string) => `'${value.replace(/'/g, "''")}'`;
const timeouts = new Map<string, string>();
function rpc(name: string, args: Record<string, unknown>, actor = claims): { status: number; body: string; ms: number } {
  if (!timeouts.has(name)) {
    const found = psql(`select coalesce((select coalesce((select substr(c,19) from unnest(p.proconfig) c where c like 'statement_timeout=%'),'8s')
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=${literal(name)}),'missing');`);
    timeouts.set(name, found);
  }
  const timeout = timeouts.get(name)!;
  if (timeout === 'missing') return { status: 404, body: JSON.stringify({ code: 'PGRST202', message: 'Could not find the function' }), ms: 0 };
  // Arguments travel through files read by the superuser into transaction-local settings; only the RPC prints.
  const sets = Object.entries(args).map(([argument, value]) => {
    const file = join(work, `arg-${sequence + 1}-${argument}.txt`); writeFileSync(file, String(value));
    return `perform set_config('bridge.${argument}', pg_read_file(${literal(file.replace(/\\/g, '/'))}), true);`;
  });
  const call = Object.keys(args).map(argument => `${argument} => current_setting('bridge.${argument}')`).join(', ');
  // PostgREST hoists a function's statement_timeout to the transaction; others keep the role default (8s).
  const started = performance.now();
  const body = psql(`begin;\ndo $bridge$ begin perform set_config('request.jwt.claims', ${literal(JSON.stringify(actor))}, true);\n${sets.join('\n')}\nend $bridge$;
set local statement_timeout = ${literal(timeout)};\nset local role authenticated;\nselect public.${name}(${call});\ncommit;\n`);
  return { status: 200, body, ms: Math.round(performance.now() - started) };
}
const bridge: typeof fetch = async (input, init) => {
  const path = new URL(String(input)).pathname;
  if (path === '/auth/v1/user') return Response.json({ id: owner, is_anonymous: false });
  const match = /^\/rest\/v1\/rpc\/([a-z0-9_]+)$/.exec(path);
  if (!match) return new Response(null, { status: 404 });
  const result = rpc(match[1], JSON.parse(String(init?.body ?? '{}')));
  log.push({ rpc: match[1], status: result.status, ms: result.ms, bytes: Buffer.byteLength(result.body) });
  return new Response(result.body, { status: result.status, headers: { 'Content-Type': 'application/json' } });
};
const handler = createAlphaPreservationHandler(env, bridge);
async function send(step: string, payload: Record<string, unknown>) {
  const started = performance.now(), from = log.length;
  const response = await handler(new Request('http://localhost:3104/api/alpha/preservation', { method: 'POST',
    headers: { Origin: 'http://localhost:3104', Authorization: 'Bearer synthetic-local-token-not-a-secret', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client: PRESERVATION_PROTOCOL.client, ...payload }) }));
  const text = await response.text();
  const row = { step, status: response.status, bytes: Buffer.byteLength(text), ms: Math.round(performance.now() - started), rpcs: log.slice(from) };
  console.log(JSON.stringify(row)); results.push(row);
  return JSON.parse(text);
}
const results: unknown[] = [];

async function main() {
// Seed: one owner, a ~100 KB account, and a journal of `rows` change-private rows (~61 KB each, one optional 5.9 MB row).
let text: any = { version: 11, folders: [{ id: 'f-root', title: '합성', parentId: null }], documents: [], flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] };
for (let n = 0; n < 12; n++) {
  text = model.addDocument(text, { title: `합성 문서 ${n}`, folderId: 'f-root' });
  const id = text.documents.at(-1).id;
  text = model.editTextResult(text, id, Array.from({ length: 60 }, (_, i) => i % 3 ? `합성 메모 ${n}-${i} 오늘 정리한 내용을 길게 적어 둔다` : `- [ ] 합성 할 일 ${n}-${i}`).join('\n'), { folderText: true }).state;
}
const context: AlphaSocialContext = { schema: 'flowme-alpha-social-context/1', revision: 0, ownActorId: alias, actors: [{ id: alias, name: 'FlowMe 참여자' }],
  public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } };
const account = { schema: 'flowme-alpha-account/1', ownerId: owner, revision: rows, source: { schema: 'flowme-integrated-product-poc/1', actorId: owner, revision: 0 },
  space: { ...createProgramPrivateSpace(), text }, legacyUndo: [], legacyReceipts: [] };
assert(validateAlphaAccount(account as any, alphaSocialReferences(context, owner)), 'synthetic account must be valid');
const accountFile = join(work, 'account.json').replace(/\\/g, '/'); writeFileSync(accountFile, JSON.stringify(account));
const body = (seed: string, pieces: number) => `(select string_agg(md5(${seed}||'-'||j)||' 합성 문장 '||j, ' ') from generate_series(1,${pieces}) j)`;
// One transaction: a failed seed leaves the fresh database empty.
psql(`begin;
insert into auth.users(id) values('${owner}');
insert into auth.sessions(id,user_id) values('${session}','${owner}');
insert into flowme_private.alpha_command_signing_keys_v1(id,secret_key) values(true,decode('${key}','hex'));
insert into flowme_private.alpha_social_identities_v1(owner_id,public_actor_id,display_name) values('${owner}','${alias}','FlowMe 참여자');
insert into public.flowme_alpha_accounts(owner_id,account) values('${owner}',pg_read_file(${literal(accountFile)})::jsonb);
insert into flowme_private.alpha_operations_v1(owner_id,request_id,command,receipt,inverse,undone)
select '${owner}','syn-'||i,
  jsonb_build_object('schema','flowme-alpha-command/1','requestId','syn-'||i,'expectedRevision',i-1,'kind','change-private',
    'changes',jsonb_build_array(jsonb_build_object('field','text','present',true,'value',${body("i::text", 620)}))),
  jsonb_build_object('requestId','syn-'||i,'revision',i,'changed',true,'kind','change-private'),
  jsonb_build_array(jsonb_build_object('field','text','present',true,'value',${body("(i+7)::text", 620)})),false
from generate_series(1,${rows}) i;
${big ? `update flowme_private.alpha_operations_v1 set command=jsonb_set(command,'{changes,0,value}',to_jsonb(${body("'big'", 118_000)})) where request_id='syn-${big}';` : ''}
commit;`);
const size = JSON.parse(psql(`select jsonb_build_object('rows',count(*),'uncompressed',sum(octet_length(to_jsonb(o)::text)),'stored',sum(pg_column_size(o.command)+pg_column_size(o.inverse)))
  from flowme_private.alpha_operations_v1 o where owner_id='${owner}';`));
console.log(JSON.stringify({ seed: size, accountBytes: Buffer.byteLength(JSON.stringify(account)) }));

// 1. Before: the v1 read refuses this owner outright.
const v1Text = canonicalJson({ schema: 'flowme-alpha-preservation-read/1' });
const v1 = rpc('flowme_alpha_preservation_read_v1', { read_text: v1Text, proof: signAlphaCommand(owner, v1Text, key) });
console.log(JSON.stringify({ step: 'v1-read', ms: v1.ms, reply: v1.body.slice(0, 80) }));
if (size.uncompressed > 30_000_000) assert.equal(v1.body, '{"ok": false, "reason": "limit"}');

// 2. Backup before any change (legacy sealed JSON and the checked file format).
const before = await send('backup', { kind: 'backup' });
assert(before.ok, JSON.stringify(before).slice(0, 300));
const backup = before.value.backup;
assert.equal(backup.schema, 'flowme-alpha-account-backup/3'); assert.equal(backup.history.totalRows, rows);
assert(backup.operations.filter((row: any) => row.command.schema === OPERATION_HEAD_SCHEMA).length === rows - backup.history.bodyRows);
const sealedRaw = canonicalJson(before.value);
assert(Buffer.byteLength(sealedRaw) <= 30_000_000);
const file = await send('backup-file', { kind: 'backup', format: BACKUP_DOWNLOAD_FORMAT });
assert(file.ok); const fileRaw = await decodeBackupFile(file.value.file); assert(Buffer.byteLength(fileRaw) <= 30_000_000);
console.log(JSON.stringify({ backup: { sealedBytes: Buffer.byteLength(sealedRaw), fileBytes: Buffer.byteLength(file.value.file), history: backup.history } }));

const command = (hash: string, requestId: string, mode: 'import' | 'restore', revision: number): PreservationCommand =>
  ({ schema: PRESERVATION_PROTOCOL.schema, kind: 'preservation', requestId, mode, sourceSha256: hash, expectedRevision: revision, expectedPublicRevision: 0 });
const currentSpace = () => canonicalJson(JSON.parse(psql(`select account->'space' from public.flowme_alpha_accounts where owner_id='${owner}';`)));

// 3. A frozen /2 backup made by N6 still previews and restores through the real SQL writer (the space becomes empty).
const golden = readFileSync(join(process.cwd(), 'lib/flow/integrated-poc/alpha-preservation/fixtures/account-backup-v2-golden.json'), 'utf8').trim();
const goldenHash = await sha256(new TextEncoder().encode(golden));
const goldenPreview = await send('v2-restore-preview', { kind: 'preview', mode: 'restore', sourceRaw: golden, actorId: owner });
assert(goldenPreview.ok && goldenPreview.value.canApply, JSON.stringify(goldenPreview).slice(0, 300));
const goldenRestore = await send('v2-restore-commit', { kind: 'commit', command: command(goldenHash, 'pg-restore-v2', 'restore', rows), sourceRaw: golden, actorId: owner });
assert(goldenRestore.ok && goldenRestore.value.revision === rows + 1, JSON.stringify(goldenRestore).slice(0, 300));
assert.equal(currentSpace(), canonicalJson(JSON.parse(golden).backup.account.space));

// 4. Import preview + commit into the now empty space (state reads only).
const fixture = createAlphaSyntheticFixtures()[0];
const emptied = { ...account, revision: rows + 1, space: JSON.parse(golden).backup.account.space };
const prepared = await prepareLocalImport(canonicalJson(fixture.envelope), fixture.actorId, emptied as any, alphaSocialReferences(context, owner));
assert(prepared.ok, JSON.stringify(prepared).slice(0, 300));
const importSource = { sourceRaw: prepared.archive.sourceRaw, actorId: prepared.archive.actorId };
const preview = await send('import-preview', { kind: 'preview', mode: 'import', ...importSource }); assert(preview.ok && preview.value.canApply, JSON.stringify(preview).slice(0, 300));
const imported = await send('import-commit', { kind: 'commit', command: command(prepared.sourceSha256, 'pg-import-1', 'import', rows + 1), ...importSource });
assert(imported.ok && imported.value.revision === rows + 2, JSON.stringify(imported).slice(0, 300));

// 5. Restore the first /3 backup (preview + commit): the synthetic documents come back.
const hash = await sha256(new TextEncoder().encode(sealedRaw));
const restorePreview = await send('restore-preview', { kind: 'preview', mode: 'restore', sourceRaw: sealedRaw, actorId: owner });
assert(restorePreview.ok && restorePreview.value.canApply, JSON.stringify(restorePreview).slice(0, 300));
const restored = await send('restore-commit', { kind: 'commit', command: command(hash, 'pg-restore-1', 'restore', rows + 2), sourceRaw: sealedRaw, actorId: owner });
assert(restored.ok && restored.value.revision === rows + 3, JSON.stringify(restored).slice(0, 300));
assert.equal(currentSpace(), canonicalJson(account.space));

// 6. Backup after the writes: the newest rows (preservation) carry bodies, the journal is complete.
const after = await send('backup-after', { kind: 'backup' });
assert(after.ok && after.value.backup.history.totalRows === rows + 3 && after.value.backup.history.toRevision === rows + 3, JSON.stringify(after).slice(0, 300));
assert.equal(after.value.backup.operations.at(-1).command.kind, 'preservation');

// 6b. Optional SQL edges: the 200-row cap, a newest row larger than the budget, refused inputs and roles.
let edge: unknown = 'not-run';
if (process.env.FLOWME_PG_EDGE === '1') {
  const seedOwner = (id: string, sid: string, member: string, count: number, bigNewest: boolean) => {
    const own = { ...account, ownerId: id, revision: count, source: { ...account.source, actorId: id } };
    const ownFile = join(work, `account-${id.slice(0, 4)}.json`).replace(/\\/g, '/'); writeFileSync(ownFile, JSON.stringify(own));
    psql(`begin;
insert into auth.users(id) values('${id}'); insert into auth.sessions(id,user_id) values('${sid}','${id}');
insert into flowme_private.alpha_social_identities_v1(owner_id,public_actor_id,display_name) values('${id}','${member}','FlowMe 참여자');
insert into public.flowme_alpha_accounts(owner_id,account) values('${id}',pg_read_file(${literal(ownFile)})::jsonb);
insert into flowme_private.alpha_operations_v1(owner_id,request_id,command,receipt,inverse,undone)
select '${id}','edge-'||i,jsonb_build_object('schema','flowme-alpha-command/1','requestId','edge-'||i,'expectedRevision',i-1,'kind','change-private','changes','[]'::jsonb),
  jsonb_build_object('requestId','edge-'||i,'revision',i,'changed',true,'kind','change-private'),'[]'::jsonb,false from generate_series(1,${count}) i;
${bigNewest ? `update flowme_private.alpha_operations_v1 set command=jsonb_set(command,'{changes}',jsonb_build_array(to_jsonb(${body("'edge'", 110_000)}))) where owner_id='${id}' and request_id='edge-${count}';` : ''}
commit;`);
  };
  const owner2 = '44444444-4444-4444-8444-444444444444', owner3 = '55555555-5555-4555-8555-555555555555';
  seedOwner(owner2, '66666666-6666-4666-8666-666666666666', 'member-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 250, false);
  seedOwner(owner3, '77777777-7777-4777-8777-777777777777', 'member-cccccccc-cccc-4ccc-8ccc-cccccccccccc', 3, true);
  const as = (id: string, sid: string) => ({ ...claims, sub: id, session_id: sid });
  const read = (mode: string, who: typeof claims, id: string, text = canonicalJson({ schema: 'flowme-alpha-preservation-read/2', mode }), proofKey = key) =>
    JSON.parse(rpc('flowme_alpha_preservation_read_v2', { read_text: text, proof: signAlphaCommand(id, text, proofKey) }, who).body);
  const two = as(owner2, '66666666-6666-4666-8666-666666666666'), three = as(owner3, '77777777-7777-4777-8777-777777777777');
  const capped = read('backup', two, owner2);
  assert(capped.ok); assert.equal(capped.value.history.bodyRows, 200); assert.equal(capped.value.history.fromRevision, 51); assert.equal(capped.value.operations.length, 250);
  assert(capped.value.operations.every((row: any) => row.owner_id === owner2));
  assert(capped.value.operations.slice(0, 50).every((row: any) => row.command.schema === OPERATION_HEAD_SCHEMA && row.command.expectedRevision === row.receipt.revision - 1 && row.command.commandStoredBytes > 0));
  const allHeads = read('backup', three, owner3);
  assert(allHeads.ok); assert.equal(allHeads.value.history.bodyRows, 0); assert.equal(allHeads.value.history.fromRevision, null);
  assert(allHeads.value.operations.every((row: any) => row.command.schema === OPERATION_HEAD_SCHEMA));
  const state = read('state', two, owner2);
  assert(state.ok); assert.deepEqual(state.value.operations, []); assert.equal(state.value.history.totalRows, 250); assert.equal(state.value.history.toRevision, 250);
  assert.deepEqual(read('all', two, owner2), { ok: false, reason: 'invalid' });
  assert.deepEqual(read('backup', two, owner2, canonicalJson({ schema: 'flowme-alpha-preservation-read/2', mode: 'backup', extra: 1 })), { ok: false, reason: 'invalid' });
  assert.deepEqual(read('backup', two, owner2, undefined, '22'.repeat(32)), { ok: false, reason: 'invalid' });
  assert.deepEqual(read('backup', { ...two, session_id: '88888888-8888-4888-8888-888888888888' }, owner2), { ok: false, reason: 'unauthenticated' });
  const denied = (role: string) => {
    const text = canonicalJson({ schema: 'flowme-alpha-preservation-read/2', mode: 'state' });
    try { psql(`begin;\nset local role ${role};\nselect public.flowme_alpha_preservation_read_v2('${text}','${'0'.repeat(64)}');\ncommit;`); return 'allowed'; }
    catch (error) { return /permission denied/.test(String(error)) ? 'denied' : String(error).slice(0, 120); }
  };
  assert.equal(denied('anon'), 'denied'); assert.equal(denied('service_role'), 'denied');
  edge = { capped: capped.value.history, allHeads: allHeads.value.history, state: state.value.history, refused: 'mode, extra key, wrong proof, dead session', roles: 'anon and service_role denied' };
  console.log(JSON.stringify({ edge }));
  // Exact byte edges, each on its own synthetic owner. Reply text from psql equals reply::text.
  const owner4 = '99999999-9999-4999-8999-999999999999', session4 = 'aaaaaaaa-0000-4000-8000-000000000004';
  const owner5 = 'bbbbbbbb-0000-4000-8000-000000000005', session5 = 'aaaaaaaa-0000-4000-8000-000000000005';
  seedOwner(owner4, session4, 'member-dddddddd-dddd-4ddd-8ddd-dddddddddddd', 0, false);
  seedOwner(owner5, session5, 'member-eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 1, false);
  const four = as(owner4, session4), five = as(owner5, session5);
  const archive = (n: number) => psql(`delete from flowme_private.alpha_preservation_archives_v1 where owner_id='${owner4}';
insert into flowme_private.alpha_preservation_archives_v1(owner_id,source_sha256,source_raw,source_actor_id,receipt)
select '${owner4}',encode(extensions.digest(convert_to(repeat('x',${n}),'UTF8'),'sha256'),'hex'),repeat('x',${n}),'synthetic-actor','{"requestId":"edge-archive"}'::jsonb;`);
  const stateText = canonicalJson({ schema: 'flowme-alpha-preservation-read/2', mode: 'state' });
  const stateReply = () => rpc('flowme_alpha_preservation_read_v2', { read_text: stateText, proof: signAlphaCommand(owner4, stateText, key) }, four).body;
  archive(1); const base = Buffer.byteLength(stateReply());
  archive(30_000_000 - base + 1); const atLimit = stateReply();
  assert.equal(Buffer.byteLength(atLimit), 30_000_000); assert(atLimit.startsWith('{"ok": true'));
  archive(30_000_000 - base + 2); const overLimit = stateReply();
  assert.equal(overLimit, '{"ok": false, "reason": "limit"}');
  psql(`delete from flowme_private.alpha_preservation_archives_v1 where owner_id='${owner4}';`);
  const rowBytes = () => Number(psql(`select octet_length(to_jsonb(o)::text) from flowme_private.alpha_operations_v1 o where owner_id='${owner5}';`));
  const pad = (k: number) => psql(`update flowme_private.alpha_operations_v1 set command=jsonb_set(command,'{changes}',jsonb_build_array(to_jsonb(repeat('y',${k})))) where owner_id='${owner5}';`);
  pad(0); const empty = rowBytes();
  pad(4_999_998 - empty);
  assert.equal(rowBytes() + 2, 5_000_000); assert.equal(read('backup', five, owner5).value.history.bodyRows, 1);
  pad(4_999_998 - empty + 1);
  assert.equal(rowBytes() + 2, 5_000_001); assert.equal(read('backup', five, owner5).value.history.bodyRows, 0);
  pad(0);
  edge = { ...(edge as object), replyAt30000000: 'ok', replyAt30000001: 'limit', budgetAt5000000: 'body', budgetAt5000001: 'head' };
  console.log(JSON.stringify({ boundaries: edge }));
}

// 7. Optional: the service DR package over the same tables (only when it fits the 30 MB JSON tools).
let dr: unknown = 'not-run';
if (withDr) {
  const tables: Record<string, unknown[]> = {};
  for (const [table, columns] of Object.entries(SERVICE_DR_TABLE_COLUMNS))
    tables[table] = JSON.parse(psql(`select coalesce(jsonb_agg(jsonb_build_object(${columns.map(c => `'${c}',t.${c}`).join(',')})),'[]') from ${table} t;`));
  const input = { projectRef: SERVICE_DR_PROJECT, createdAt: new Date().toISOString(), schemaHash: await disasterRecoverySchemaHash(), tables: tables as any, objectPaths: [] };
  const package_ = await createDisasterRecoveryBackup(input, async () => { throw Error('no objects'); });
  const checked = await validateDisasterRecoveryBackup(canonicalJson(package_));
  assert(checked.ok); dr = { ok: true, rowCounts: package_.manifest.rowCounts };
}
const report = { db, rows, big, seed: size, steps: results, edge, dr, signingKey: 'synthetic', host: '127.0.0.1', port };
writeFileSync(join(work, `result-${db}.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ done: true, dr }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
