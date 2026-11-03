// Local WASM PostgreSQL engine fixture. No network, credentials or real accounts.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash, createHmac } from 'node:crypto';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const runtimeDirectory = resolve(root, 'output/alpha-m72-inverse-runtime');
const runtimeRequire = createRequire(resolve(runtimeDirectory, 'package.json'));

// These minimal relations/functions satisfy migration dependencies only. They do
// not emulate the Supabase Auth API, JWT verification, Storage API or gateway.
export const bootstrapSql = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema extensions;
create extension pgcrypto with schema extensions;
create table auth.users(id uuid primary key, deleted_at timestamptz,
  banned_until timestamptz, is_anonymous boolean not null default false);
create table auth.sessions(id uuid primary key, user_id uuid not null references auth.users(id), not_after timestamptz);
create function auth.jwt() returns jsonb language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)
$$;
create function auth.uid() returns uuid language sql stable as $$
 select nullif(auth.jwt()->>'sub','')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
create schema storage;
create table storage.buckets(id text primary key, name text, public boolean,
 file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),
 bucket_id text references storage.buckets(id), name text, owner_id text, user_metadata jsonb);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
 select (string_to_array(name,'/'))[1:greatest(array_length(string_to_array(name,'/'),1)-1,0)]
$$;
create function storage.allow_only_operation(operation text) returns boolean language sql stable as $$
 select coalesce(current_setting('storage.operation',true)=operation,false)
$$;
grant usage on schema storage to authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated, service_role;
`;

export async function createInverseRuntime() {
  const { PGlite } = runtimeRequire('@electric-sql/pglite');
  const { pgcrypto } = runtimeRequire('@electric-sql/pglite/contrib/pgcrypto');
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(bootstrapSql);
  return db;
}

// Each caller is isolated inside one transaction. PGlite has a single exclusive
// connection: this helper must not be presented as concurrent-server coverage.
export async function asFixtureActor(db, claims, callback) {
  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(claims)]);
    await tx.exec('set local role authenticated');
    return callback(tx);
  });
}

async function probe() {
  const manifestPaths = ['package.json', 'package-lock.json'];
  const hashes = async () => Object.fromEntries(await Promise.all(manifestPaths.map(async (p) =>
    [p, createHash('sha256').update(await readFile(resolve(root, p))).digest('hex')])));
  const before = await hashes();
  const db = await createInverseRuntime();
  const checks = [];
  const pass = (name, value) => { assert.ok(value, name); checks.push({ name, passed: true }); };
  try {
    const version = (await db.query('select version() as version, current_user as user')).rows[0];
    const crypto = (await db.query("select encode(extensions.digest('abc','sha256'),'hex') as digest, encode(extensions.hmac('abc','synthetic-only','sha256'),'hex') as hmac")).rows[0];
    pass('pgcrypto digest equals Node', crypto.digest === createHash('sha256').update('abc').digest('hex'));
    pass('pgcrypto hmac equals Node', crypto.hmac === createHmac('sha256','synthetic-only').update('abc').digest('hex'));
    await db.exec(`create function public.fixture_jsonb() returns jsonb language plpgsql as $$
      declare value jsonb := '{"nested":{"value":1}}'; begin
      return jsonb_set(value,'{nested,value}','2'); end; $$;`);
    pass('PL/pgSQL and jsonb_set', (await db.query('select public.fixture_jsonb() as value')).rows[0].value.nested.value === 2);
    await db.exec(`create table public.fixture_owner(owner_id uuid primary key);
      insert into public.fixture_owner values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
      alter table public.fixture_owner enable row level security;
      alter table public.fixture_owner force row level security;
      grant select on public.fixture_owner to authenticated;
      create policy fixture_owner_select on public.fixture_owner for select to authenticated using(owner_id=auth.uid());`);
    const rows = await asFixtureActor(db, { sub: '00000000-0000-4000-8000-000000000001' }, async (tx) => (await tx.query('select * from public.fixture_owner')).rows);
    pass('SET LOCAL ROLE and owner RLS', rows.length === 1 && rows[0].owner_id.endsWith('0001'));
    pass('JWT setting reset after transaction', (await db.query('select auth.uid() as id')).rows[0].id === null);
    const noClaims = await asFixtureActor(db, {}, async (tx) => (await tx.query('select * from public.fixture_owner')).rows);
    pass('missing claims exposes zero rows', noClaims.length === 0);
    let denied;
    try { await db.transaction(async(tx) => { await tx.exec('set local role anon'); await tx.query('select * from public.fixture_owner'); }); }
    catch(error) { denied = error.code; }
    pass('anon denied with exact SQLSTATE 42501', denied === '42501');
    const after = await hashes();
    pass('root dependency manifests unchanged', JSON.stringify(before) === JSON.stringify(after));
    const result = { kind: 'WASM PostgreSQL engine test, not Supabase server validation', version,
      packageVersion: '0.5.8', checks, manifestHashes: after,
      realAccounts: 0, remoteDatabaseCalls: 0, limitations: ['Auth and Storage are dependency stubs only', 'No JWT signature verification', 'No multi-connection concurrency or real server performance claim'] };
    await writeFile(resolve(runtimeDirectory, 'probe-result.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally { await db.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await probe();
}
