import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ALPHA_CREATOR_REQUEST_BUDGET as budget } from './request-budget';

test('creator timeout is bounded and aligned from database through browser, not global', () => {
  assert.deepEqual(budget, { databaseMs: 30_000, upstreamMs: 35_000, browserMs: 60_000 });
  const sql = readFileSync(new URL('../../../../supabase/migrations/20260923215123_flowme_alpha_m72_creator_transaction_budget.sql', import.meta.url), 'utf8');
  assert.match(sql, /alter function public\.flowme_alpha_creator_execute_v1\(text,text\)\s+set statement_timeout = '30s'/);
  assert.doesNotMatch(sql, /\b(?:alter role|alter database|grant|revoke|update|insert|delete|create or replace)\b/i);
  const handler = readFileSync(new URL('../alpha-server/creator-command-handler.ts', import.meta.url), 'utf8');
  const client = readFileSync(new URL('../alpha-sync/http-repository.ts', import.meta.url), 'utf8');
  assert.match(handler, /path === '\/rest\/v1\/rpc\/flowme_alpha_creator_execute_v1' \? ALPHA_CREATOR_REQUEST_BUDGET.upstreamMs : 15_000/);
  assert.match(client, /endpoint === '\/api\/alpha\/creator' \? ALPHA_CREATOR_REQUEST_BUDGET.browserMs : 15000/);
});
