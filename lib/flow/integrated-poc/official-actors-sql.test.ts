// SQL source checks only: no DB connection, SQL parser, account/alias rows or seeds.
// Negative variants mutate SQL text; they do not use real or synthetic account IDs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const basename = '20261106103000_flowme_alpha_official_actors_v1.sql';
const migration = readFileSync(new URL(`../../../supabase/migrations/${basename}`, import.meta.url), 'utf8');
const rollback = readFileSync(new URL(`../../../supabase/rollback/${basename}`, import.meta.url), 'utf8');
const withoutComments = (source: string) => source.replace(/--[^\r\n]*/g, '');
const sql = withoutComments(migration);
const rollbackSql = withoutComments(rollback);
const functionBody = sql.match(/as\s+\$official_actors\$([\s\S]*?)\$official_actors\$/i)?.[1] ?? '';
const roles = (source: string, object: 'table' | 'function') => {
  const target = object === 'table'
    ? 'flowme_private\\.alpha_official_identities_v1'
    : 'public\\.flowme_alpha_official_actors_v1\\(\\)';
  const match = source.match(new RegExp(`revoke\\s+all\\s+on\\s+${object}\\s+${target}\\s+from\\s+([^;]+);`, 'i'));
  return (match?.[1] ?? '').split(',').map(role => role.trim().toLowerCase()).sort();
};
const grants = (source: string) => [...source.matchAll(/grant\s+([^;]+);/gi)].map(match => match[1].replace(/\s+/g, ' ').trim().toLowerCase());
const rpcGrant = 'execute on function public.flowme_alpha_official_actors_v1() to authenticated';

function securityFindings(source: string): string[] {
  const code = withoutComments(source), findings: string[] = [];
  if (JSON.stringify(roles(code, 'table')) !== JSON.stringify(['anon', 'authenticated', 'public', 'service_role'])) findings.push('table-revoke');
  if (JSON.stringify(roles(code, 'function')) !== JSON.stringify(['anon', 'authenticated', 'public', 'service_role'])) findings.push('function-revoke');
  if (JSON.stringify(grants(code)) !== JSON.stringify([rpcGrant])) findings.push('execute-grant');
  if (!/set\s+search_path\s*=\s*''/i.test(code)) findings.push('search-path');
  if (!/references\s+flowme_private\.alpha_social_identities_v1\s*\(owner_id\)\s+on\s+delete\s+restrict/i.test(code)) findings.push('restrict-fk');
  if (!/if\s+auth\.uid\(\)\s+is\s+null\s+then\s+return\s+pg_catalog\.jsonb_build_object\('ok',\s*false,\s*'reason',\s*'unauthenticated'\);/i.test(code)) findings.push('auth-null');
  if (/jsonb_build_object\([^;]*'owner_id'/i.test(code)) findings.push('owner-projection');
  return findings;
}

test('SQL source: adds only the two-column marker with a restrictive identity FK', () => {
  assert.match(sql, /create\s+table\s+flowme_private\.alpha_official_identities_v1\s*\(/i);
  assert.match(sql, /owner_id\s+pg_catalog\.uuid\s+primary\s+key/i);
  assert.match(sql, /references\s+flowme_private\.alpha_social_identities_v1\(owner_id\)\s+on\s+delete\s+restrict/i);
  assert.match(sql, /created_at\s+pg_catalog\.timestamptz\s+not\s+null\s+default\s+pg_catalog\.now\(\)/i);
  assert.equal([...sql.matchAll(/create\s+table\s+/gi)].length, 1);
  assert.doesNotMatch(sql, /alter\s+table\s+flowme_private\.alpha_social_identities_v1|\b(?:insert|update|delete|merge|truncate)\s+(?:into|from|flowme_private|public)/i);
});

test('SQL source: RLS has no policies and table access is revoked from clients and service_role', () => {
  assert.match(sql, /alter\s+table\s+flowme_private\.alpha_official_identities_v1\s+enable\s+row\s+level\s+security/i);
  assert.doesNotMatch(sql, /create\s+policy|grant\s+[^;]+\s+on\s+(?:table\s+)?flowme_private\.alpha_official_identities_v1/i);
  assert.deepEqual(roles(sql, 'table'), ['anon', 'authenticated', 'public', 'service_role']);
});

test('SQL source: authenticated alone receives explicit RPC execution', () => {
  assert.deepEqual(roles(sql, 'function'), ['anon', 'authenticated', 'public', 'service_role']);
  assert.deepEqual(grants(sql), [rpcGrant]);
});

test('SQL source: the zero-argument RPC is stable with a fixed empty definer search_path', () => {
  assert.match(sql, /create\s+function\s+public\.flowme_alpha_official_actors_v1\(\)\s+returns\s+pg_catalog\.jsonb\s+language\s+plpgsql\s+stable\s+security\s+definer\s+set\s+search_path\s*=\s*''/i);
  assert.equal([...sql.matchAll(/create\s+function/gi)].length, 1);
  assert.doesNotMatch(sql, /create\s+or\s+replace|create\s+table\s+if\s+not\s+exists/i);
});

test('SQL source: a NULL auth identity fails closed before the marker query', () => {
  assert.match(functionBody, /if\s+auth\.uid\(\)\s+is\s+null\s+then\s+return\s+pg_catalog\.jsonb_build_object\('ok',\s*false,\s*'reason',\s*'unauthenticated'\);\s+end\s+if;/i);
  assert.ok(functionBody.indexOf('if auth.uid() is null') < functionBody.indexOf('from flowme_private.alpha_official_identities_v1'));
});

test('SQL source: successful JSON projects stored public aliases and no owner UUID', () => {
  assert.match(functionBody, /pg_catalog\.jsonb_agg\(identity_row\.public_actor_id\s+order\s+by\s+identity_row\.public_actor_id\s+collate\s+pg_catalog\."C"\)/);
  assert.match(functionBody, /join\s+flowme_private\.alpha_social_identities_v1\s+as\s+identity_row\s+on\s+identity_row\.owner_id\s*=\s*official\.owner_id/i);
  assert.match(functionBody, /'\[\]'::pg_catalog\.jsonb/);
  assert.match(functionBody, /return\s+pg_catalog\.jsonb_build_object\('ok',\s*true,\s*'value',\s*actor_aliases\);/i);
  assert.doesNotMatch(functionBody, /jsonb_build_object\([^;]*'owner_id'|jsonb_agg\([^)]*\bowner_id\b|to_json|display_name|\|\|/i);
});

test('SQL source: RPC body performs reads with no session helper or context dependency', () => {
  assert.doesNotMatch(functionBody, /\b(?:insert|update|delete|merge|truncate|execute|perform|call|create|alter|drop|set_config)\b/i);
  const calls = new Set([...functionBody.matchAll(/\b([a-z_]+\.[a-z_]+)\s*\(/gi)].map(match => match[1]));
  assert.deepEqual([...calls].sort(), ['auth.uid', 'pg_catalog.jsonb_agg', 'pg_catalog.jsonb_build_object']);
  assert.doesNotMatch(functionBody, /social_read|read_full|live_session|preservation|disaster_recovery/i);
});

test('SQL source: creation and privilege changes are atomic and object-scoped', () => {
  assert.match(sql, /^\s*begin;/i);
  assert.match(sql, /commit;\s*$/i);
  assert.ok(sql.indexOf('revoke all on function') > sql.indexOf('$official_actors$;'));
  assert.ok(sql.indexOf('grant execute on function') > sql.indexOf('revoke all on function'));
  assert.doesNotMatch(sql, /alter\s+default\s+privileges|on\s+all\s+(?:tables|functions)|create\s+(?:schema|trigger|policy|role)/i);
});

test('SQL source: rollback drops only the RPC then its marker table without CASCADE', () => {
  const drops = [...rollbackSql.matchAll(/drop\s+(function|table)\s+([^;]+);/gi)].map(match => `${match[1].toLowerCase()} ${match[2]}`);
  assert.deepEqual(drops, ['function public.flowme_alpha_official_actors_v1()', 'table flowme_private.alpha_official_identities_v1']);
  assert.doesNotMatch(rollbackSql, /\bcascade\b|\b(?:insert|update|delete|alter)\b|alpha_social_identities_v1/i);
  assert.match(rollbackSql, /^\s*begin;/i);
  assert.match(rollbackSql, /commit;\s*$/i);
});

test('SQL source guards reject grant, path, FK, auth and UUID projection regressions', () => {
  assert.deepEqual(securityFindings(migration), []);
  const negativeVariants = [
    migration.replace('from public, anon, authenticated, service_role;', 'from public, anon, authenticated;'),
    migration.replace('to authenticated;', 'to service_role;'),
    migration.replace("set search_path = ''", 'set search_path = public'),
    migration.replace('on delete restrict', 'on delete cascade'),
    migration.replace('if auth.uid() is null then', 'if false then'),
    migration.replace("'value', actor_aliases", "'value', actor_aliases, 'owner_id', auth.uid()"),
  ];
  for (const candidate of negativeVariants) {
    assert.notEqual(candidate, migration);
    assert.ok(securityFindings(candidate).length > 0);
  }
});
