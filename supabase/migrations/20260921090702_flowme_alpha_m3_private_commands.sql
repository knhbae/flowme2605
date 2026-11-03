-- M3 development-only. Apply only to project wkmzcxpnojobxrgebapw after review.
-- No production approval, legacy migration, public content, or account import.
-- Domain validation stays in the trusted Next server and reuses the full M1
-- validator. A server-only HMAC attests the exact command and authenticated owner.
-- SQL independently enforces authentication, field scope, CAS and atomicity.
create extension if not exists pgcrypto with schema extensions;

-- M2's live-session check also protects SELECT, INSERT and Storage. Explicit
-- expiry is necessary for SQL-role checks and defense beyond the API gateway.
create or replace function flowme_private.live_session_v1()
returns boolean language sql volatile security definer set search_path = ''
as $$
  select auth.uid() is not null
    and coalesce(auth.jwt()->>'is_anonymous', 'false') = 'false'
    and case when auth.jwt()->>'exp' ~ '^[0-9]{1,16}$'
      then (auth.jwt()->>'exp')::numeric > extract(epoch from clock_timestamp()) else false end
    and exists (
      select 1 from auth.sessions s join auth.users u on u.id = s.user_id
      where s.user_id = auth.uid()
        and s.id::text = auth.jwt()->>'session_id'
        and (s.not_after is null or s.not_after > clock_timestamp())
        and u.deleted_at is null
        and (u.banned_until is null or u.banned_until <= clock_timestamp())
        and not coalesce(u.is_anonymous, false)
    );
$$;
revoke all on function flowme_private.live_session_v1() from public, anon, authenticated;
grant execute on function flowme_private.live_session_v1() to authenticated;

-- Installed out of band by an administrator. Never place key bytes in a
-- migration, API result, browser bundle, log, backup artifact or public table.
-- Empty table intentionally leaves execute unavailable until provisioning.
create table flowme_private.alpha_command_signing_keys_v1 (
  id boolean primary key default true check (id),
  secret_key bytea not null check (octet_length(secret_key) = 32)
);
alter table flowme_private.alpha_command_signing_keys_v1 enable row level security;
alter table flowme_private.alpha_command_signing_keys_v1 force row level security;
revoke all on table flowme_private.alpha_command_signing_keys_v1 from public, anon, authenticated;

-- Temporary M3 ledger retention: no purge/compaction job in this migration.
-- Account revision is deliberately conservative across documents/devices.
create table flowme_private.alpha_operations_v1 (
  owner_id uuid not null references public.flowme_alpha_accounts(owner_id) on delete cascade,
  request_id text not null check (length(request_id) between 1 and 160),
  command jsonb not null,
  receipt jsonb not null,
  inverse jsonb not null,
  undone boolean not null default false,
  primary key (owner_id, request_id),
  check (jsonb_typeof(command) = 'object'),
  check (jsonb_typeof(receipt) = 'object' and receipt->>'requestId' = request_id
    and receipt->'changed' = 'true'::jsonb),
  check (jsonb_typeof(inverse) = 'array')
);
create unique index alpha_operations_owner_revision_v1 on flowme_private.alpha_operations_v1
  (owner_id, ((receipt->>'revision')::bigint));
alter table flowme_private.alpha_operations_v1 enable row level security;
alter table flowme_private.alpha_operations_v1 force row level security;
revoke all on table flowme_private.alpha_operations_v1 from public, anon, authenticated;

create function flowme_private.alpha_identifier_v1(value text, max_chars integer default 1200)
returns boolean language sql immutable security invoker set search_path = ''
as $$
  select value is not null and length(value) between 1 and max_chars
    and value ~ '[^[:space:]]' and value not in ('__proto__', 'prototype', 'constructor');
$$;
revoke all on function flowme_private.alpha_identifier_v1(text, integer) from public, anon, authenticated;
grant execute on function flowme_private.alpha_identifier_v1(text, integer) to authenticated;

-- JSONB has already rejected invalid JSON. Refuse excessive nesting and unsafe
-- object keys too; the server checks the original bytes before serialization.
create function flowme_private.alpha_json_v1(value jsonb)
returns boolean language sql immutable security invoker set search_path = ''
as $$
  with recursive nodes(value, depth, unsafe) as (
    select value, 0, false
    union all
    select child.value, parent.depth + 1, child.key in ('__proto__', 'prototype', 'constructor')
    from nodes parent cross join lateral (
      select key, value from jsonb_each(case when jsonb_typeof(parent.value) = 'object' then parent.value else '{}'::jsonb end)
      union all
      select null::text, value from jsonb_array_elements(case when jsonb_typeof(parent.value) = 'array' then parent.value else '[]'::jsonb end)
    ) child where parent.depth <= 120
  )
  select value is not null and octet_length(value::text) <= 30000000
    and not exists (select 1 from nodes where depth > 120 or unsafe);
$$;
revoke all on function flowme_private.alpha_json_v1(jsonb) from public, anon, authenticated;
grant execute on function flowme_private.alpha_json_v1(jsonb) to authenticated;

create function flowme_private.alpha_command_v1(value jsonb)
returns boolean language plpgsql immutable security invoker set search_path = ''
as $$
declare change jsonb; seen text[] := '{}'; field_name text;
begin
  if not flowme_private.alpha_json_v1(value) or jsonb_typeof(value) <> 'object'
    or value->>'schema' is distinct from 'flowme-alpha-command/1'
    or jsonb_typeof(value->'requestId') is distinct from 'string'
    or not flowme_private.alpha_identifier_v1(value->>'requestId', 160)
    or jsonb_typeof(value->'expectedRevision') is distinct from 'number'
    or (value->>'expectedRevision')::numeric not between 0 and 9007199254740991
    or (value->>'expectedRevision')::numeric <> trunc((value->>'expectedRevision')::numeric) then return false; end if;
  if value->>'kind' = 'undo-private' then
    return value ?& array['schema','requestId','expectedRevision','kind','operationId']
      and (select count(*) from jsonb_object_keys(value)) = 5
      and jsonb_typeof(value->'operationId') = 'string'
      and flowme_private.alpha_identifier_v1(value->>'operationId', 1200)
      and value->>'operationId' <> value->>'requestId';
  end if;
  if value->>'kind' is distinct from 'change-private'
    or not (value ?& array['schema','requestId','expectedRevision','kind','changes'])
    or (select count(*) from jsonb_object_keys(value)) <> 5
    or jsonb_typeof(value->'changes') is distinct from 'array'
    or jsonb_array_length(value->'changes') > 13 then return false; end if;
  for change in select * from jsonb_array_elements(value->'changes') loop
    if jsonb_typeof(change) <> 'object' or jsonb_typeof(change->'field') is distinct from 'string'
      or jsonb_typeof(change->'present') is distinct from 'boolean' then return false; end if;
    field_name := change->>'field';
    if field_name <> all(array['text','archivedDocumentIds','documentTrash','position','timelineOrders',
      'executionTimelineOrders','legacySnapshot','legacyQuickItemLines','legacyTimelinePolicies',
      'retentionDocuments','recurrenceExecution','recurrencePlans','savedBindings'])
      or field_name = any(seen) then return false; end if;
    seen := array_append(seen, field_name);
    if change->'present' = 'true'::jsonb then
      if not (change ?& array['field','present','value']) or (select count(*) from jsonb_object_keys(change)) <> 3 then return false; end if;
    elsif (select count(*) from jsonb_object_keys(change)) <> 2
      or field_name = any(array['text','archivedDocumentIds','position','timelineOrders','legacySnapshot',
        'legacyQuickItemLines','legacyTimelinePolicies','savedBindings']) then return false;
    end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;
revoke all on function flowme_private.alpha_command_v1(jsonb) from public, anon, authenticated;

-- Shape guard is defense in depth, not a replacement for validateAlphaAccount.
-- The only mutations accepted below carry the trusted validator's exact proof.
create function flowme_private.alpha_account_shape_v1(account jsonb, owner_id uuid)
returns boolean language plpgsql immutable security invoker set search_path = ''
as $$
declare space jsonb := account->'space';
begin
  return flowme_private.alpha_json_v1(account)
    and jsonb_typeof(account) = 'object'
    and (select count(*) from jsonb_object_keys(account)) = 7
    and account ?& array['schema','ownerId','revision','source','space','legacyUndo','legacyReceipts']
    and account->>'schema' = 'flowme-alpha-account/1' and account->>'ownerId' = owner_id::text
    and jsonb_typeof(account->'revision') = 'number'
    and (account->>'revision')::numeric between 0 and 9007199254740991
    and (account->>'revision')::numeric = trunc((account->>'revision')::numeric)
    and jsonb_typeof(account->'source') = 'object'
    and account->'source' ?& array['schema','actorId','revision']
    and (select count(*) from jsonb_object_keys(account->'source')) = 3
    and account#>>'{source,schema}' = 'flowme-integrated-product-poc/1'
    and flowme_private.alpha_identifier_v1(account#>>'{source,actorId}')
    and jsonb_typeof(account#>'{source,revision}') = 'number'
    and (account#>>'{source,revision}')::numeric between 0 and 9007199254740991
    and (account#>>'{source,revision}')::numeric = trunc((account#>>'{source,revision}')::numeric)
    and jsonb_typeof(account->'legacyUndo') = 'array' and jsonb_typeof(account->'legacyReceipts') = 'array'
    and jsonb_typeof(space) = 'object'
    and space ?& array['text','archivedDocumentIds','copies','savedBindings','draftRevisions','participationDrafts',
      'publicationDrafts','publications','position','timelineOrders','legacySnapshot','legacyQuickItemLines','legacyTimelinePolicies']
    and not exists(select 1 from jsonb_object_keys(space) key where key <> all(array['text','archivedDocumentIds',
      'copies','savedBindings','draftRevisions','participationDrafts','publicationDrafts','publications','position',
      'timelineOrders','legacySnapshot','legacyQuickItemLines','legacyTimelinePolicies','retentionDocuments',
      'creatorDraftImports','creatorWorkspace','proposalReviewDrafts','recurrenceExecution','recurrencePlans',
      'executionTimelineOrders','documentTrash']))
    and jsonb_typeof(space->'text') = 'object' and space#>'{text,version}' = '11'::jsonb
    and jsonb_typeof(space->'position') = 'object'
    and jsonb_typeof(space->'archivedDocumentIds') = 'array'
    and jsonb_typeof(space->'savedBindings') = 'array';
exception when others then return false;
end;
$$;
revoke all on function flowme_private.alpha_account_shape_v1(jsonb, uuid) from public, anon, authenticated;
-- INSERT evaluates the account CHECK as the caller. These pure validators have
-- no table reads or side effects; authenticated gets only the needed helpers.
grant execute on function flowme_private.alpha_account_shape_v1(jsonb, uuid) to authenticated;

alter table public.flowme_alpha_accounts drop constraint flowme_alpha_m2_empty_only;
alter table public.flowme_alpha_accounts add constraint flowme_alpha_m3_account_shape
  check (flowme_private.alpha_account_shape_v1(account, owner_id) is true);
-- M2's INSERT policy still permits only the exact empty factory value. No caller
-- can insert imported data, update an account, or modify the operation ledger.
revoke update, delete on table public.flowme_alpha_accounts from public, anon, authenticated;

-- This private definer is intentional write authority, not a generic RLS escape.
-- It accepts no identity/SQL/table name, authenticates itself, verifies a trusted
-- server proof, and can write only the current owner's allowlisted field patch.
create function flowme_private.alpha_execute_v1(command_text text, proof text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid(); input_command jsonb; signing_key bytea; expected_proof text;
  before_account jsonb; next_account jsonb; next_space jsonb; before_space jsonb;
  operation flowme_private.alpha_operations_v1%rowtype;
  original flowme_private.alpha_operations_v1%rowtype;
  change jsonb; changes jsonb; inverse jsonb := '[]'::jsonb; field_name text;
  receipt jsonb; revision bigint;
begin
  if actor is null or not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  if command_text is null or octet_length(command_text) > 30000000
    or proof is null or proof !~ '^[0-9a-f]{64}$' then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  begin input_command := command_text::jsonb;
  exception when others then return '{"ok":false,"reason":"invalid"}'::jsonb; end;
  if not flowme_private.alpha_command_v1(input_command) then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  select secret_key into signing_key from flowme_private.alpha_command_signing_keys_v1 where id;
  if signing_key is null then return '{"ok":false,"reason":"unavailable"}'::jsonb; end if;
  expected_proof := encode(extensions.hmac(convert_to(actor::text || E'\n' || command_text, 'UTF8'), signing_key, 'sha256'), 'hex');
  if proof <> expected_proof then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;

  select account into before_account from public.flowme_alpha_accounts where owner_id = actor for update;
  if before_account is null then return '{"ok":false,"reason":"not-found"}'::jsonb; end if;
  -- A lock wait may outlive logout/revocation/token expiry.
  if not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  select * into operation from flowme_private.alpha_operations_v1
    where owner_id = actor and request_id = input_command->>'requestId';
  if found then
    if operation.command = input_command then return jsonb_build_object('ok', true, 'value', operation.receipt); end if;
    return '{"ok":false,"reason":"idempotency-conflict"}'::jsonb;
  end if;
  revision := (before_account->>'revision')::bigint;
  if (input_command->>'expectedRevision')::numeric <> revision then return '{"ok":false,"reason":"revision-conflict"}'::jsonb; end if;
  if input_command->>'kind' = 'undo-private' then
    select * into original from flowme_private.alpha_operations_v1
      where owner_id = actor and request_id = input_command->>'operationId';
    if not found or original.undone or original.receipt->>'kind' <> 'change-private'
      or original.receipt->'changed' <> 'true'::jsonb
      or (original.receipt->>'revision')::bigint <> revision then return '{"ok":false,"reason":"undo-conflict"}'::jsonb; end if;
    changes := original.inverse;
  else changes := input_command->'changes'; end if;
  before_space := before_account->'space'; next_space := before_space;
  for change in select * from jsonb_array_elements(changes) loop
    field_name := change->>'field';
    if change->'present' = 'true'::jsonb then next_space := jsonb_set(next_space, array[field_name], change->'value', true);
    else next_space := next_space - field_name; end if;
    if (before_space ? field_name) is distinct from (next_space ? field_name)
      or before_space->field_name is distinct from next_space->field_name then
      inverse := inverse || jsonb_build_array(case when before_space ? field_name
        then jsonb_build_object('field',field_name,'present',true,'value',before_space->field_name)
        else jsonb_build_object('field',field_name,'present',false) end);
    end if;
  end loop;
  if next_space = before_space then return '{"ok":false,"reason":"no-change"}'::jsonb; end if;
  if revision >= 9007199254740991 then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  next_account := jsonb_set(jsonb_set(before_account, '{space}', next_space), '{revision}', to_jsonb(revision + 1));
  if not coalesce(flowme_private.alpha_account_shape_v1(next_account, actor), false) then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  receipt := jsonb_build_object('requestId',input_command->>'requestId','revision',revision + 1,'changed',true,'kind',input_command->>'kind');
  update public.flowme_alpha_accounts set account = next_account where owner_id = actor;
  insert into flowme_private.alpha_operations_v1(owner_id, request_id, command, receipt, inverse)
    values(actor, input_command->>'requestId', input_command, receipt, inverse);
  if input_command->>'kind' = 'undo-private' then
    update flowme_private.alpha_operations_v1 set undone = true where owner_id = actor and request_id = input_command->>'operationId';
  end if;
  return jsonb_build_object('ok', true, 'value', receipt);
exception when others then
  -- PL/pgSQL rolls back this whole block before entering the handler: never a
  -- half-written account/receipt or an undone original without compensation.
  return '{"ok":false,"reason":"unavailable"}'::jsonb;
end;
$$;
revoke all on function flowme_private.alpha_execute_v1(text, text) from public, anon, authenticated;
grant execute on function flowme_private.alpha_execute_v1(text, text) to authenticated;

create function flowme_private.alpha_lookup_v1(request_id text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare actor uuid := auth.uid(); receipt_value jsonb;
begin
  if actor is null or not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  if not flowme_private.alpha_identifier_v1(request_id, 160) then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  select operation.receipt into receipt_value from flowme_private.alpha_operations_v1 operation
    where operation.owner_id = actor and operation.request_id = alpha_lookup_v1.request_id;
  return jsonb_build_object('ok', true, 'value', receipt_value);
end;
$$;
revoke all on function flowme_private.alpha_lookup_v1(text) from public, anon, authenticated;
grant execute on function flowme_private.alpha_lookup_v1(text) to authenticated;

create function public.flowme_alpha_execute_v1(command_text text, proof text)
returns jsonb language sql security invoker set search_path = ''
as $$ select flowme_private.alpha_execute_v1(command_text, proof); $$;
revoke all on function public.flowme_alpha_execute_v1(text, text) from public, anon, authenticated;
grant execute on function public.flowme_alpha_execute_v1(text, text) to authenticated;

create function public.flowme_alpha_lookup_v1(request_id text)
returns jsonb language sql security invoker set search_path = ''
as $$ select flowme_private.alpha_lookup_v1(request_id); $$;
revoke all on function public.flowme_alpha_lookup_v1(text) from public, anon, authenticated;
grant execute on function public.flowme_alpha_lookup_v1(text) to authenticated;
