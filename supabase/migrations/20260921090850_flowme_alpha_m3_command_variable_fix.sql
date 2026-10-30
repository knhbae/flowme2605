-- Forward correction after initial M3 application to development only.
-- The initial function's command variable collided with the ledger column.
-- Qualify meaning through input_command; preserve the public RPC contract,
-- all grants, stored accounts, operations and HMAC verification unchanged.
create or replace function flowme_private.alpha_execute_v1(command_text text, proof text)
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
