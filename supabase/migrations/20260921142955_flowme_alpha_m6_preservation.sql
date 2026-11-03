-- DEV M6 preservation only. Replaceable limits: 30 MB source, 30 archives/owner.
-- No public repository mutation, historical journal replay, or automatic cleanup.
create table flowme_private.alpha_preservation_archives_v1 (
  owner_id uuid not null references auth.users(id),
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  source_raw text not null check (octet_length(source_raw) between 1 and 30000000),
  source_actor_id text not null check (flowme_private.alpha_identifier_v1(source_actor_id)),
  receipt jsonb not null check (jsonb_typeof(receipt) = 'object'),
  created_at timestamptz not null default now(),
  primary key (owner_id,source_sha256),
  check (encode(extensions.digest(convert_to(source_raw,'UTF8'),'sha256'),'hex') = source_sha256)
);
alter table flowme_private.alpha_preservation_archives_v1 enable row level security;
alter table flowme_private.alpha_preservation_archives_v1 force row level security;
revoke all on table flowme_private.alpha_preservation_archives_v1 from public, anon, authenticated;

create function flowme_private.alpha_preservation_read_v1(read_text text, proof text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare actor uuid := auth.uid(); signing_key bytea; input_value jsonb; paired jsonb;
  operation_values jsonb; archive_values jsonb; response_bytes bigint;
begin
  if actor is null or not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  if read_text is null or octet_length(read_text) > 2000 or proof is null or proof !~ '^[0-9a-f]{64}$'
    then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  begin input_value := read_text::jsonb; exception when others then return '{"ok":false,"reason":"invalid"}'::jsonb; end;
  if input_value is distinct from '{"schema":"flowme-alpha-preservation-read/1"}'::jsonb
    then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  select secret_key into signing_key from flowme_private.alpha_command_signing_keys_v1 where id;
  if signing_key is null then return '{"ok":false,"reason":"unavailable"}'::jsonb; end if;
  if proof <> encode(extensions.hmac(convert_to(actor::text || E'\n' || read_text,'UTF8'),signing_key,'sha256'),'hex')
    then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  -- Helper locks account then shared and filters proposal visibility. All account
  -- writers use the same owner lock, preserving this journal/archive snapshot.
  paired := flowme_private.alpha_social_read_internal_v1(false);
  if paired->'ok' is distinct from 'true'::jsonb then return paired; end if;
  -- Bound the complete reply before jsonb_agg allocates a potentially huge value.
  -- Per-row JSON plus separators and fixed envelope allowance is conservative;
  -- never omit archives or operations to manufacture a partial backup.
  select octet_length((paired->'value')::text)::bigint + 128
    + coalesce((select sum(octet_length(to_jsonb(o)::text)::bigint + 2)
        from flowme_private.alpha_operations_v1 o where o.owner_id = actor),0)
    + coalesce((select sum(octet_length(to_jsonb(a)::text)::bigint + 2)
        from flowme_private.alpha_preservation_archives_v1 a where a.owner_id = actor),0)
    into response_bytes;
  if response_bytes > 30000000 then return '{"ok":false,"reason":"limit"}'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object('owner_id',o.owner_id,'request_id',o.request_id,
    'command',o.command,'receipt',o.receipt,'inverse',o.inverse,'undone',o.undone)
    order by (o.receipt->>'revision')::bigint,o.request_id),'[]'::jsonb)
    into operation_values from flowme_private.alpha_operations_v1 o where o.owner_id = actor;
  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at,a.source_sha256),'[]'::jsonb)
    into archive_values from flowme_private.alpha_preservation_archives_v1 a where a.owner_id = actor;
  if not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  return jsonb_build_object('ok',true,'value',(paired->'value') ||
    jsonb_build_object('operations',operation_values,'importArchives',archive_values));
end;
$$;
revoke all on function flowme_private.alpha_preservation_read_v1(text,text) from public, anon, authenticated;
grant execute on function flowme_private.alpha_preservation_read_v1(text,text) to authenticated;
create function public.flowme_alpha_preservation_read_v1(read_text text, proof text)
returns jsonb language sql security invoker set search_path = ''
as $$ select flowme_private.alpha_preservation_read_v1(read_text,proof); $$;
revoke all on function public.flowme_alpha_preservation_read_v1(text,text) from public, anon, authenticated;
grant execute on function public.flowme_alpha_preservation_read_v1(text,text) to authenticated;

create function flowme_private.alpha_preservation_execute_v1(commit_text text, proof text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare actor uuid := auth.uid(); signing_key bytea; input_value jsonb; input_command jsonb;
  archive_value jsonb; before_account jsonb; next_account jsonb; receipt_value jsonb;
  account_revision bigint; public_revision bigint; field_name text;
  operation flowme_private.alpha_operations_v1%rowtype;
begin
  if actor is null or not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  if commit_text is null or octet_length(commit_text) > 30000000 or proof is null or proof !~ '^[0-9a-f]{64}$'
    then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  select secret_key into signing_key from flowme_private.alpha_command_signing_keys_v1 where id;
  if signing_key is null then return '{"ok":false,"reason":"unavailable"}'::jsonb; end if;
  if proof <> encode(extensions.hmac(convert_to(actor::text || E'\n' || commit_text,'UTF8'),signing_key,'sha256'),'hex')
    then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  begin input_value := commit_text::jsonb; exception when others then return '{"ok":false,"reason":"invalid"}'::jsonb; end;
  if jsonb_typeof(input_value) is distinct from 'object'
    or not (input_value ?& array['schema','command','space','archive'])
    or (select count(*) from jsonb_object_keys(input_value)) <> 4
    or input_value->>'schema' is distinct from 'flowme-alpha-preservation-commit/1'
    or jsonb_typeof(input_value->'space') is distinct from 'object'
    then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  input_command := input_value->'command'; archive_value := input_value->'archive';
  if jsonb_typeof(input_command) is distinct from 'object'
    or not (input_command ?& array['schema','kind','requestId','expectedRevision','expectedPublicRevision','mode','sourceSha256'])
    or (select count(*) from jsonb_object_keys(input_command)) <> 7
    or input_command->>'schema' is distinct from 'flowme-alpha-preservation-command/1'
    or input_command->>'kind' is distinct from 'preservation'
    or jsonb_typeof(input_command->'requestId') is distinct from 'string'
    or not coalesce(flowme_private.alpha_identifier_v1(input_command->>'requestId',160),false)
    or not coalesce(input_command->>'mode' = any(array['import','restore']),false)
    or jsonb_typeof(input_command->'sourceSha256') is distinct from 'string'
    or not coalesce(input_command->>'sourceSha256' ~ '^[0-9a-f]{64}$',false)
    then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  foreach field_name in array array['expectedRevision','expectedPublicRevision'] loop
    if jsonb_typeof(input_command->field_name) is distinct from 'number'
      or (input_command->>field_name)::numeric not between 0 and 9007199254740991
      or (input_command->>field_name)::numeric <> trunc((input_command->>field_name)::numeric)
      then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  end loop;
  if input_command->>'mode' = 'import' then
    if jsonb_typeof(archive_value) is distinct from 'object'
      or not (archive_value ?& array['sourceRaw','actorId'])
      or (select count(*) from jsonb_object_keys(archive_value)) <> 2
      or jsonb_typeof(archive_value->'sourceRaw') is distinct from 'string'
      or octet_length(archive_value->>'sourceRaw') not between 1 and 30000000
      or jsonb_typeof(archive_value->'actorId') is distinct from 'string'
      or not coalesce(flowme_private.alpha_identifier_v1(archive_value->>'actorId'),false)
      or encode(extensions.digest(convert_to(archive_value->>'sourceRaw','UTF8'),'sha256'),'hex') is distinct from input_command->>'sourceSha256'
      then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  elsif archive_value is distinct from 'null'::jsonb then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  select account into before_account from public.flowme_alpha_accounts where owner_id = actor for update;
  if before_account is null then return '{"ok":false,"reason":"not-found"}'::jsonb; end if;
  select revision into public_revision from flowme_private.alpha_social_state_v1 where id for share;
  if public_revision is null then return '{"ok":false,"reason":"unavailable"}'::jsonb; end if;
  if not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  -- Receipt replay comes before CAS; it never replays historical account writes.
  select * into operation from flowme_private.alpha_operations_v1
    where owner_id = actor and request_id = input_command->>'requestId';
  if found then
    if operation.command = input_command then return jsonb_build_object('ok',true,'value',operation.receipt); end if;
    return '{"ok":false,"reason":"idempotency-conflict"}'::jsonb;
  end if;
  if input_command->>'mode' = 'import' then
    select receipt into receipt_value from flowme_private.alpha_preservation_archives_v1
      where owner_id = actor and source_sha256 = input_command->>'sourceSha256';
    if found then return jsonb_build_object('ok',true,'value',receipt_value); end if;
  end if;
  account_revision := (before_account->>'revision')::bigint;
  if (input_command->>'expectedRevision')::bigint <> account_revision
    or (input_command->>'expectedPublicRevision')::bigint <> public_revision
    then return '{"ok":false,"reason":"revision-conflict"}'::jsonb; end if;
  if before_account->'space' = input_value->'space' then return '{"ok":false,"reason":"no-change"}'::jsonb; end if;
  if account_revision >= 9007199254740991 then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  next_account := jsonb_set(jsonb_set(before_account,'{space}',input_value->'space'),'{revision}',to_jsonb(account_revision+1));
  if not coalesce(flowme_private.alpha_account_shape_v1(next_account,actor),false)
    then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  if input_command->>'mode' = 'import' and (select count(*) from flowme_private.alpha_preservation_archives_v1 where owner_id = actor) >= 30
    then return '{"ok":false,"reason":"rate-limited"}'::jsonb; end if;
  if not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  receipt_value := jsonb_build_object('requestId',input_command->>'requestId','revision',account_revision+1,
    'changed',true,'kind','preservation','publicRevision',public_revision);
  update public.flowme_alpha_accounts set account = next_account where owner_id = actor;
  insert into flowme_private.alpha_operations_v1(owner_id,request_id,command,receipt,inverse,undone)
    values(actor,input_command->>'requestId',input_command,receipt_value,'[]'::jsonb,false);
  if input_command->>'mode' = 'import' then
    insert into flowme_private.alpha_preservation_archives_v1(owner_id,source_sha256,source_raw,source_actor_id,receipt)
      values(actor,input_command->>'sourceSha256',archive_value->>'sourceRaw',archive_value->>'actorId',receipt_value);
  end if;
  return jsonb_build_object('ok',true,'value',receipt_value);
end;
$$;
revoke all on function flowme_private.alpha_preservation_execute_v1(text,text) from public, anon, authenticated;
grant execute on function flowme_private.alpha_preservation_execute_v1(text,text) to authenticated;
create function public.flowme_alpha_preservation_execute_v1(commit_text text, proof text)
returns jsonb language sql security invoker set search_path = ''
as $$ select flowme_private.alpha_preservation_execute_v1(commit_text,proof); $$;
revoke all on function public.flowme_alpha_preservation_execute_v1(text,text) from public, anon, authenticated;
grant execute on function public.flowme_alpha_preservation_execute_v1(text,text) to authenticated;
