import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createProgramPrivateSpace } from '../../lib/flow/integrated-poc/program-data';
import { validateAlphaAccount } from '../../lib/flow/integrated-poc/alpha-persistence/program-adapter';

const sql = readFileSync(new URL('../../supabase/migrations/20260920234519_flowme_alpha_m2_account_boundary.sql', import.meta.url), 'utf8');
test('M2 SQL empty space exactly matches current M1 canonical factory', () => {
  const embedded = sql.match(/\$space\$([\s\S]*?)\$space\$/)?.[1];
  assert.ok(embedded);
  assert.deepEqual(JSON.parse(embedded), createProgramPrivateSpace());
  const ownerId = '11111111-1111-4111-8111-111111111111';
  const account = { schema: 'flowme-alpha-account/1', ownerId, revision: 0,
    source: { schema: 'flowme-integrated-product-poc/1', actorId: ownerId, revision: 0 },
    space: JSON.parse(embedded), legacyUndo: [], legacyReceipts: [] };
  assert.equal(validateAlphaAccount(account, { actorIds: [ownerId], public: {
    flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [],
  } }, ownerId), true);
});
test('M2 schema fixes invoker account API and only grants SELECT/INSERT', () => {
  assert.match(sql, /public\.flowme_alpha_open_account_v1\(\)\s*returns jsonb language plpgsql security invoker set search_path = ''/);
  assert.match(sql, /grant select, insert on table public\.flowme_alpha_accounts to authenticated/);
  assert.doesNotMatch(sql, /grant\s+(?:all|update|delete).*on table public\.flowme_alpha_accounts/i);
  assert.match(sql, /force row level security/);
  assert.match(sql, /constraint flowme_alpha_m2_empty_only check \(account = flowme_private\.empty_account_v1\(owner_id\)\)/);
  assert.match(sql, /revoke all on function public\.flowme_alpha_open_account_v1\(\) from public, anon, authenticated/);
});
test('M2 definer is private identity-bound and checks actual session/user state', () => {
  assert.equal((sql.match(/security definer/g) ?? []).length, 1);
  assert.match(sql, /flowme_private\.live_session_v1\(\)[\s\S]*security definer set search_path = ''/);
  for (const check of ['s.user_id = auth.uid()', "s.id::text = auth.jwt()->>'session_id'", 'u.deleted_at is null', 'u.banned_until <= now()', 'u.is_anonymous', 's.not_after > now()']) assert.ok(sql.includes(check));
  assert.doesNotMatch(sql, /user_metadata|raw_user_meta_data/);
});
test('M2 storage has four owner/prefix/session policies and private size/MIME cap', () => {
  assert.match(sql, /'flowme-alpha-private', 'flowme-alpha-private', false, 1048576/);
  assert.match(sql, /array\['text\/plain', 'image\/png', 'image\/jpeg'\]/);
  for (const operation of ['select', 'insert', 'update', 'delete']) assert.ok(sql.includes(`flowme_alpha_file_${operation} on storage.objects for ${operation} to authenticated`));
  assert.equal((sql.match(/owner_id = \(select auth.uid\(\)\)::text/g) ?? []).length, 5);
  assert.equal((sql.match(/\(storage.foldername\(name\)\)\[1\] = \(select auth.uid\(\)\)::text/g) ?? []).length, 5);
});
