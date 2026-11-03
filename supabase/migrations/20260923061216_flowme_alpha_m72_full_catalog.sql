-- M7-2 DEV only: private, immutable full source library. No row writes or new grants.
-- Server reconstitutes the fixed pack from a locator, validates full bytes and signs
-- owner + command + changes; existing CAS/ledger/Undo transaction remains intact.
create or replace function flowme_private.alpha_account_shape_v1(account jsonb, owner_id uuid)
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
      'executionTimelineOrders','documentTrash','catalogLibrary']))
    and (not (space ? 'catalogLibrary') or (
      jsonb_typeof(space->'catalogLibrary') = 'object'
      and space#>>'{catalogLibrary,schema}' = 'flowme-private-catalog-library/1'
      and jsonb_typeof(space#>'{catalogLibrary,bundles}') = 'array'
      and jsonb_array_length(space#>'{catalogLibrary,bundles}') = 177
      and jsonb_typeof(space#>'{catalogLibrary,maps}') = 'array'
      and jsonb_array_length(space#>'{catalogLibrary,maps}') = 26))
    and jsonb_typeof(space->'text') = 'object' and space#>'{text,version}' = '11'::jsonb
    and jsonb_typeof(space->'position') = 'object'
    and jsonb_typeof(space->'archivedDocumentIds') = 'array'
    and jsonb_typeof(space->'savedBindings') = 'array';
exception when others then return false;
end;
$$;

create or replace function flowme_private.alpha_creator_commit_v1(value jsonb)
returns boolean language plpgsql immutable security invoker set search_path = ''
as $$
declare input_command jsonb; change jsonb; seen text[] := '{}'; field_name text;
begin
  if not flowme_private.alpha_json_v1(value) or jsonb_typeof(value) is distinct from 'object'
    or value->>'schema' is distinct from 'flowme-alpha-creator-commit/1'
    or not (value ?& array['schema','command','changes','resultId'])
    or (select count(*) from jsonb_object_keys(value)) <> 4 then return false; end if;
  input_command := value->'command';
  if jsonb_typeof(input_command) is distinct from 'object'
    or input_command->>'schema' is distinct from 'flowme-alpha-creator-command/1'
    or jsonb_typeof(input_command->'requestId') is distinct from 'string'
    or not flowme_private.alpha_identifier_v1(input_command->>'requestId',160)
    or jsonb_typeof(input_command->'expectedRevision') is distinct from 'number'
    or (input_command->>'expectedRevision')::numeric not between 0 and 9007199254740991
    or (input_command->>'expectedRevision')::numeric <> trunc((input_command->>'expectedRevision')::numeric)
    or (select count(*) from jsonb_object_keys(input_command)) <> 5
    or jsonb_typeof(value->'changes') is distinct from 'array'
    or jsonb_array_length(value->'changes') > 4
    or not (value->'resultId' = 'null'::jsonb or jsonb_typeof(value->'resultId') = 'string'
      and flowme_private.alpha_identifier_v1(value->>'resultId')) then return false; end if;
  if input_command->>'kind' = 'undo-creator' then
    return input_command ?& array['schema','requestId','expectedRevision','kind','operationId']
      and jsonb_typeof(input_command->'operationId') = 'string'
      and flowme_private.alpha_identifier_v1(input_command->>'operationId',160)
      and input_command->>'operationId' <> input_command->>'requestId'
      and value->'changes' = '[]'::jsonb and value->'resultId' = 'null'::jsonb;
  end if;
  if input_command->>'kind' is distinct from 'creator'
    or not (input_command ?& array['schema','requestId','expectedRevision','kind','intent'])
    or jsonb_typeof(input_command->'intent') is distinct from 'object'
    or jsonb_typeof(input_command#>'{intent,type}') is distinct from 'string'
    or jsonb_typeof(input_command#>'{intent,now}') is distinct from 'string'
    or input_command#>>'{intent,type}' <> all(array['working','library-action','native-operation','source-stage',
      'source-transition','source-upgrade','history-restore','raw-handoff','native-handoff','native-lineage','raw-update','catalog-content-import','catalog-library-import'])
    then return false; end if;
  if input_command#>>'{intent,type}' = 'catalog-content-import' then
    if not (input_command->'intent' ?& array['type','now','draftId','sourceSlug','sourceVersionId'])
      or (select count(*) from jsonb_object_keys(input_command->'intent')) <> 5
      or jsonb_typeof(input_command#>'{intent,draftId}') is distinct from 'string'
      or not flowme_private.alpha_identifier_v1(input_command#>>'{intent,draftId}')
      or jsonb_typeof(input_command#>'{intent,sourceVersionId}') is distinct from 'string'
      or not flowme_private.alpha_identifier_v1(input_command#>>'{intent,sourceVersionId}')
      or input_command#>>'{intent,sourceSlug}' <> all(array['moving-d30-basic','chiangmai-solo-trip-packing'])
      or jsonb_typeof(input_command#>'{intent,sourceSlug}') is distinct from 'string'
      or exists (select 1 from jsonb_array_elements(value->'changes') c where c->>'field' is distinct from 'creatorWorkspace')
      then return false; end if;
  end if;
  if input_command#>>'{intent,type}' = 'catalog-library-import' then
    if not (input_command->'intent' ?& array['type','now','catalogVersion'])
      or (select count(*) from jsonb_object_keys(input_command->'intent')) <> 3
      or jsonb_typeof(input_command#>'{intent,catalogVersion}') is distinct from 'string'
      or not flowme_private.alpha_identifier_v1(input_command#>>'{intent,catalogVersion}')
      or exists(select 1 from jsonb_array_elements(value->'changes') c where c->>'field' is distinct from 'catalogLibrary'
        or c->'present' is distinct from 'true'::jsonb
        or c#>>'{value,schema}' is distinct from 'flowme-private-catalog-library/1'
        or c#>>'{value,catalogVersion}' is distinct from input_command#>>'{intent,catalogVersion}')
      then return false; end if;
  elsif exists(select 1 from jsonb_array_elements(value->'changes') c where c->>'field' = 'catalogLibrary')
    then return false;
  end if;
  -- The signed server dispatcher validates the complete semantic intent and
  -- full M1 domain; SQL independently rejects fields outside this M4 boundary.
  for change in select * from jsonb_array_elements(value->'changes') loop
    if jsonb_typeof(change) is distinct from 'object' or jsonb_typeof(change->'field') is distinct from 'string'
      or jsonb_typeof(change->'present') is distinct from 'boolean' then return false; end if;
    field_name := change->>'field';
    if field_name <> all(array['creatorWorkspace','text','archivedDocumentIds','retentionDocuments','catalogLibrary'])
      or field_name = any(seen) then return false; end if;
    seen := array_append(seen,field_name);
    if change->'present' = 'true'::jsonb then
      if not (change ?& array['field','present','value']) or (select count(*) from jsonb_object_keys(change)) <> 3 then return false; end if;
    elsif (select count(*) from jsonb_object_keys(change)) <> 2
      or field_name = any(array['text','archivedDocumentIds']) then return false;
    end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;

create or replace function flowme_private.alpha_creator_execute_v1(commit_text text, proof text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid(); input_commit jsonb; input_command jsonb; signing_key bytea; expected_proof text;
  before_account jsonb; next_account jsonb; before_space jsonb; next_space jsonb;
  operation flowme_private.alpha_operations_v1%rowtype;
  original flowme_private.alpha_operations_v1%rowtype;
  change jsonb; changes jsonb; inverse jsonb := '[]'::jsonb; field_name text;
  receipt_value jsonb; revision bigint;
begin
  if actor is null or not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  if commit_text is null or octet_length(commit_text) > 30000000
    or proof is null or proof !~ '^[0-9a-f]{64}$' then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  begin input_commit := commit_text::jsonb;
  exception when others then return '{"ok":false,"reason":"invalid"}'::jsonb; end;
  if not flowme_private.alpha_creator_commit_v1(input_commit) then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  input_command := input_commit->'command';
  select secret_key into signing_key from flowme_private.alpha_command_signing_keys_v1 where id;
  if signing_key is null then return '{"ok":false,"reason":"unavailable"}'::jsonb; end if;
  expected_proof := encode(extensions.hmac(convert_to(actor::text || E'\n' || commit_text,'UTF8'),signing_key,'sha256'),'hex');
  if proof <> expected_proof then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;

  select account into before_account from public.flowme_alpha_accounts where owner_id = actor for update;
  if before_account is null then return '{"ok":false,"reason":"not-found"}'::jsonb; end if;
  -- Recheck after waiting for another device/transaction to release the lock.
  if not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  select * into operation from flowme_private.alpha_operations_v1
    where owner_id = actor and request_id = input_command->>'requestId';
  if found then
    -- Generated IDs/patch/result are not idempotency input. Original intent is.
    if operation.command = input_command then return jsonb_build_object('ok',true,'value',operation.receipt); end if;
    return '{"ok":false,"reason":"idempotency-conflict"}'::jsonb;
  end if;
  revision := (before_account->>'revision')::bigint;
  if (input_command->>'expectedRevision')::numeric <> revision then return '{"ok":false,"reason":"revision-conflict"}'::jsonb; end if;
  if input_command->>'kind' = 'undo-creator' then
    select * into original from flowme_private.alpha_operations_v1
      where owner_id = actor and request_id = input_command->>'operationId';
    if not found or original.undone or original.receipt->>'kind' <> all(array['creator','undo-creator'])
      or original.receipt->'changed' <> 'true'::jsonb
      or (original.receipt->>'revision')::bigint <> revision then return '{"ok":false,"reason":"undo-conflict"}'::jsonb; end if;
    changes := original.inverse;
  else
    changes := input_commit->'changes';
    if jsonb_array_length(changes) > 0 and not flowme_private.alpha_identifier_v1(input_commit->>'resultId')
      then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  end if;
  before_space := before_account->'space'; next_space := before_space;
  for change in select * from jsonb_array_elements(changes) loop
    field_name := change->>'field';
    -- Defense for inverse rows: never widen a ledger's original field boundary.
    if field_name <> all(array['creatorWorkspace','text','archivedDocumentIds','retentionDocuments','catalogLibrary'])
      then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
    if change->'present' = 'true'::jsonb then next_space := jsonb_set(next_space,array[field_name],change->'value',true);
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
  next_account := jsonb_set(jsonb_set(before_account,'{space}',next_space),'{revision}',to_jsonb(revision+1));
  if not coalesce(flowme_private.alpha_account_shape_v1(next_account,actor),false) then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  receipt_value := jsonb_build_object('requestId',input_command->>'requestId','revision',revision+1,'changed',true,'kind',input_command->>'kind');
  if input_command->>'kind' = 'creator' then receipt_value := receipt_value || jsonb_build_object('resultId',input_commit->>'resultId'); end if;
  update public.flowme_alpha_accounts set account = next_account where owner_id = actor;
  insert into flowme_private.alpha_operations_v1(owner_id,request_id,command,receipt,inverse)
    values(actor,input_command->>'requestId',input_command,receipt_value,inverse);
  if input_command->>'kind' = 'undo-creator' then
    update flowme_private.alpha_operations_v1 set undone = true where owner_id = actor and request_id = input_command->>'operationId';
  end if;
  return jsonb_build_object('ok',true,'value',receipt_value);
exception when others then
  -- The entire function block rolls back before returning an unavailable result.
  return '{"ok":false,"reason":"unavailable"}'::jsonb;
end;
$$;

revoke all on function flowme_private.alpha_creator_commit_v1(jsonb) from public, anon, authenticated;
-- Existing account CHECK and creator RPC permissions are unchanged by CREATE OR REPLACE.
