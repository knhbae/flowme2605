// Local migration rehearsal only. Auth/Storage are dependency stubs, not a
// Supabase service test. No network, credentials, user files, or remote DDL.
import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createInverseRuntime } from './m72-inverse-pg-runtime.mjs';

const root = resolve(import.meta.dirname, '../..');
const migration = '20260923190436_flowme_alpha_m72_catalog_wave3.sql';
const previous = '20260923081212_flowme_alpha_m72_catalog_wave2.sql';
const previousSlugs = ['moving-d30-basic', 'chiangmai-solo-trip-packing',
  'closet-organize-1day', 'kitchen-reset-organize', 'travel-packing-list', 'portfolio-4week', 'blog-youtube-start',
  'samsung-aircon-seasonal-check', 'samsung-washer-filter-cleaning', 'computer-skills-d30-study', 'home-cafe-daily'];
const additions = ['curated-opic-single-mock-review', 'curated-opic-course-row-import'];
const packPath = resolve(root, 'lib/flow/integrated-poc/catalog-library-pack.v1.json');
const sha = value => createHash('sha256').update(value).digest('hex');
const readSql = name => readFile(resolve(root, 'supabase/migrations', name), 'utf8');
const envelope = slug => ({ schema: 'flowme-alpha-creator-commit/1', command: {
  schema: 'flowme-alpha-creator-command/1', kind: 'creator', requestId: 'wave3-local', expectedRevision: 0,
  intent: { type: 'catalog-content-import', now: '2026-09-24T04:00:00.000Z', draftId: 'wave3-copy',
    sourceSlug: slug, sourceVersionId: 'synthetic-locator-only' } }, changes: [], resultId: null });
const metadataSql = `select n.nspname as schema,p.proname as name,
  pg_get_function_identity_arguments(p.oid) as arguments,md5(replace(p.prosrc,chr(13),'')) as body_md5,
  p.prosecdef as security_definer,p.provolatile as volatility,p.proconfig as config,p.proacl::text as acl,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='flowme_private' or n.nspname='public' and p.proname like 'flowme_%'
  order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)`;
let db, pack, sql, beforeMeta, afterMeta, oldSql, oldHashes, policyBefore, policyAfter;
const evidence = { kind: 'local-WASM-PostgreSQL-contract-preparation', migration, checks: [],
  remoteDatabaseCalls: 0, realAccounts: 0, credentialsRead: 0, runtimeActivation: false,
  limitations: ['Auth/Storage are dependency stubs', 'No live API, actual catalog import, or backup/restore claim',
    'This SQL-only rehearsal does not exercise or certify runtime reader activation'] };
const check = (name, fn) => test(name, async () => { await fn(); evidence.checks.push({ name, pass: true }); });
const validate = async value => (await db.query('select flowme_private.alpha_creator_commit_v1($1::jsonb) as value', [JSON.stringify(value)])).rows[0].value;

before(async () => {
  globalThis.fetch = async () => { throw Error('network-forbidden'); };
  const rawPack = await readFile(packPath); pack = JSON.parse(rawPack);
  evidence.packSha256 = sha(rawPack);
  const names = (await readdir(resolve(root, 'supabase/migrations'))).filter(n => n.endsWith('.sql')).sort();
  assert(names.includes(migration));
  oldHashes = Object.fromEntries(await Promise.all(names.filter(n => n < migration).map(async n => [n, sha(await readSql(n))])));
  sql = await readSql(migration); oldSql = await readSql(previous);
  db = await createInverseRuntime();
  for (const name of names.filter(n => n < migration)) await db.exec(await readSql(name));
  beforeMeta = (await db.query(metadataSql)).rows;
  policyBefore = (await db.query('select * from pg_policies order by schemaname,tablename,policyname')).rows;
  for (const slug of previousSlugs) assert.equal(await validate(envelope(slug)), true, slug);
  for (const slug of additions) assert.equal(await validate(envelope(slug)), false, slug);
  await db.exec(sql);
  afterMeta = (await db.query(metadataSql)).rows;
  policyAfter = (await db.query('select * from pg_policies order by schemaname,tablename,policyname')).rows;
  evidence.before = beforeMeta; evidence.after = afterMeta; evidence.migrationSha256 = sha(sql);
});

check('migration body adds exactly two locators; no data, writer or permission expansion', () => {
  const body = value => value.slice(value.indexOf('create or replace function'), value.indexOf('$$;') + 3).replaceAll('\r', '');
  const pattern = /array\['moving-d30-basic','chiangmai-solo-trip-packing'[^\]]*\]/;
  const match = body(sql).match(pattern); assert(match);
  assert.deepEqual([...match[0].matchAll(/'([^']+)'/g)].map(m => m[1]), [...previousSlugs, ...additions]);
  assert.equal(body(sql).replace(pattern, 'LOCATORS'), body(oldSql).replace(pattern, 'LOCATORS'));
  assert.doesNotMatch(sql, /\b(insert into|update public|delete from|create table|grant execute|security definer)\b/i);
  assert.match(sql, /revoke all on function flowme_private\.alpha_creator_commit_v1\(jsonb\) from public, anon, authenticated/);
});

check('all 177 frozen sources plus unknown have the exact 13-source SQL allowlist', async () => {
  assert.equal(pack.bundles.length, 177);
  let allowed = 0;
  for (const slug of [...pack.bundles.map(b => b.flow.slug), 'unknown-source']) {
    const want = [...previousSlugs, ...additions].includes(slug);
    assert.equal(await validate(envelope(slug)), want, slug); if (want) allowed++;
  }
  assert.equal(allowed, 13); evidence.locatorCases = 178;
});

check('new locators retain owner, source-payload and malformed-command rejection', async () => {
  const mutations = [
    value => { value.command.intent.ownerId = 'other'; },
    value => { value.command.intent.contentJson = '{}'; },
    value => { value.command.intent.documentJson = '{}'; },
    value => { delete value.command.intent.sourceSlug; },
    value => { value.command.intent.sourceSlug = null; },
    value => { value.command.intent.sourceSlug = []; },
    value => { value.command.intent.sourceVersionId = ''; },
    value => { value.command.intent.sourceVersionId = 1; },
    value => { value.command.intent.draftId = null; },
    value => { value.command.expectedRevision = -1; },
    value => { value.command.expectedRevision = 1.5; },
    value => { value.command.expectedRevision = '0'; },
    value => { value.command.requestId = ''; },
    value => { value.command.schema = 'unknown'; },
    value => { value.command.kind = 'other'; },
    value => { value.resultId = {}; },
    value => { value.extra = true; },
  ];
  for (const slug of additions) for (const mutate of mutations) {
    const value = envelope(slug); mutate(value);
    assert.equal(await validate(value), false, JSON.stringify(value));
  }
  evidence.malformedCases = mutations.length * additions.length;
});

check('content import cannot write personal/public fields or duplicate creator fields', async () => {
  for (const slug of additions) {
    for (const field of ['text', 'archivedDocumentIds', 'retentionDocuments', 'catalogLibrary', 'published', 'ownerId']) {
      const value = envelope(slug); value.changes = [{ field, present: true, value: {} }];
      assert.equal(await validate(value), false, `${slug}:${field}`);
    }
    const value = envelope(slug), change = { field: 'creatorWorkspace', present: true, value: {} };
    value.changes = [change]; assert.equal(await validate(value), true);
    value.changes = [change, change]; assert.equal(await validate(value), false);
    // SQL validates the signed envelope/field boundary. Full domain/source
    // reconstruction remains the trusted dispatcher responsibility, not this {}.
  }
});

check('existing Undo and non-catalog creator command envelopes remain accepted', async () => {
  const undo = { schema: 'flowme-alpha-creator-commit/1', command: { schema: 'flowme-alpha-creator-command/1',
    kind: 'undo-creator', requestId: 'undo-new', expectedRevision: 1, operationId: 'old-operation' }, changes: [], resultId: null };
  assert.equal(await validate(undo), true);
  undo.command.operationId = 'undo-new'; assert.equal(await validate(undo), false);
  const working = envelope(previousSlugs[0]); working.command.intent = { type: 'working', working: null, now: '2026-09-24T04:00:00.000Z' };
  assert.equal(await validate(working), true);
});

check('only private validator body changes; every existing function grant and policy stays identical', () => {
  assert.equal(afterMeta.length, beforeMeta.length);
  const changed = [];
  for (let i = 0; i < beforeMeta.length; i++) {
    const { body_md5: oldBody, ...old } = beforeMeta[i], { body_md5: newBody, ...next } = afterMeta[i];
    assert.deepEqual(next, old); if (oldBody !== newBody) changed.push(`${next.schema}.${next.name}`);
  }
  assert.deepEqual(changed, ['flowme_private.alpha_creator_commit_v1']);
  assert.deepEqual(policyAfter, policyBefore);
  const validator = afterMeta.find(row => row.name === 'alpha_creator_commit_v1');
  assert.equal(validator.security_definer, false); assert.equal(validator.volatility, 'i');
  assert.deepEqual(validator.config, ['search_path=""']);
  assert.equal(validator.anon_execute, false); assert.equal(validator.authenticated_execute, false);
});

check('anon and authenticated direct calls are denied in the database engine', async () => {
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(db.transaction(async tx => {
      await tx.exec(`set local role ${role}`);
      await tx.query('select flowme_private.alpha_creator_commit_v1($1::jsonb)', [JSON.stringify(envelope(additions[0]))]);
    }), error => error.code === '42501');
  }
});

check('repeat application is idempotent; account and operation tables are untouched', async () => {
  const counts = async () => (await db.query(`select
    (select count(*)::int from public.flowme_alpha_accounts) as accounts,
    (select count(*)::int from flowme_private.alpha_operations_v1) as operations`)).rows[0];
  const beforeCounts = await counts(); assert.deepEqual(beforeCounts, { accounts: 0, operations: 0 });
  await db.exec(sql); assert.deepEqual((await db.query(metadataSql)).rows, afterMeta);
  assert.deepEqual(await counts(), beforeCounts);
});

check('original pack and every prior migration file are byte-identical', async () => {
  assert.equal(sha(await readFile(packPath)), evidence.packSha256);
  for (const [name, digest] of Object.entries(oldHashes)) assert.equal(sha(await readSql(name)), digest, name);
});

after(async () => {
  if (db) await db.close();
  evidence.completedChecks = evidence.checks.length;
  const path = resolve(root, 'output/alpha-m72-wave3-store', new Date().toISOString().replaceAll(':', '-'), 'local-pg.json');
  await mkdir(resolve(path, '..'), { recursive: true });
  await writeFile(path, JSON.stringify(evidence, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ evidence: path, completedChecks: evidence.completedChecks }));
});
