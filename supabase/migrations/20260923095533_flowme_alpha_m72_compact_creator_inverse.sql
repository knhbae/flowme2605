-- Additive local M7-2 inverse codec. No historical rows or forward validators change.
create function flowme_private.alpha_object_inverse_diff_v1(current_value jsonb, target_value jsonb, path text[] default '{}')
returns jsonb language plpgsql immutable security invoker set search_path = ''
as $$
declare result jsonb := '[]'::jsonb; part jsonb; key_name text; i integer; a integer; b integer; prefix_count integer; suffix_count integer; vals jsonb;
begin
  if current_value is not distinct from target_value then return result; end if;
  if cardinality(path) > 120 then return null; end if;
  if jsonb_typeof(current_value) = 'object' and jsonb_typeof(target_value) = 'object' then
    for key_name in select k from (select jsonb_object_keys(current_value) k union select jsonb_object_keys(target_value) k) keys order by k collate "C" loop
      if key_name = any(array['__proto__','prototype','constructor']) then return null; end if;
      if not (target_value ? key_name) then part := jsonb_build_array(jsonb_build_object('op','remove','path',path || key_name));
      elsif not (current_value ? key_name) then part := jsonb_build_array(jsonb_build_object('op','set','path',path || key_name,'value',target_value->key_name));
      else part := flowme_private.alpha_object_inverse_diff_v1(current_value->key_name,target_value->key_name,path || key_name);
      end if;
      if part is null then return null; end if;
      result := result || part;
      if jsonb_array_length(result) > 4096 then return null; end if;
    end loop;
  elsif jsonb_typeof(current_value) = 'array' and jsonb_typeof(target_value) = 'array' then
    a := jsonb_array_length(current_value); b := jsonb_array_length(target_value);
    if a = b then
      if a > 0 then for i in 0..a-1 loop
        part := flowme_private.alpha_object_inverse_diff_v1(current_value->i,target_value->i,path || i::text);
        if part is null then return null; end if;
        result := result || part;
        if jsonb_array_length(result) > 4096 then return null; end if;
      end loop; end if;
    else
      prefix_count := 0; suffix_count := 0;
      while prefix_count < least(a,b) and current_value->prefix_count = target_value->prefix_count loop prefix_count := prefix_count+1; end loop;
      while suffix_count < least(a,b)-prefix_count and current_value->(a-1-suffix_count) = target_value->(b-1-suffix_count) loop suffix_count := suffix_count+1; end loop;
      select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into vals
        from jsonb_array_elements(target_value) with ordinality e(value,ord) where ord > prefix_count and ord <= b-suffix_count;
      result := jsonb_build_array(jsonb_build_object('op','splice','path',path,'expectedLength',a,'index',prefix_count,'remove',a-prefix_count-suffix_count,'values',vals));
    end if;
  else result := jsonb_build_array(jsonb_build_object('op','set','path',path,'value',target_value));
  end if;
  return result;
end;
$$;

create function flowme_private.alpha_object_inverse_apply_v1(current_value jsonb, patch jsonb)
returns jsonb language plpgsql immutable security invoker set search_path = ''
as $$
declare result jsonb := current_value; change jsonb; seen jsonb := '[]'::jsonb; previous jsonb; p text[]; q text[];
  parent jsonb; existing jsonb; replacement jsonb; segment text; final_key text; op text;
  i integer; idx integer; n integer; at_index integer; removed integer; expected integer; exists_leaf boolean;
begin
  if jsonb_typeof(current_value) is distinct from 'object' or not coalesce(flowme_private.alpha_json_v1(current_value),false)
    or not coalesce(flowme_private.alpha_json_v1(patch),false) or jsonb_typeof(patch) is distinct from 'object'
    or (select count(*) from jsonb_object_keys(patch)) <> 3
    or patch->>'field' is distinct from 'creatorWorkspace' or patch->>'schema' is distinct from 'flowme-alpha-object-inverse/1'
    or jsonb_typeof(patch->'changes') is distinct from 'array' then raise exception 'invalid compact inverse'; end if;
  if jsonb_array_length(patch->'changes') not between 1 and 4096 then raise exception 'invalid compact inverse'; end if;
  for change in select value from jsonb_array_elements(patch->'changes') loop
    if jsonb_typeof(change) is distinct from 'object' or jsonb_typeof(change->'path') is distinct from 'array'
      or jsonb_typeof(change->'op') is distinct from 'string' then raise exception 'invalid compact inverse'; end if;
    if jsonb_array_length(change->'path') not between 1 and 120
      or exists(select 1 from jsonb_array_elements(change->'path') s where jsonb_typeof(s) is distinct from 'string'
        or s#>>'{}' = any(array['__proto__','prototype','constructor'])) then raise exception 'invalid compact inverse'; end if;
    select array_agg(value order by ord) into p from jsonb_array_elements_text(change->'path') with ordinality e(value,ord);
    for previous in select value from jsonb_array_elements(seen) loop
      select array_agg(value order by ord) into q from jsonb_array_elements_text(previous) with ordinality e(value,ord);
      if p[1:least(cardinality(p),cardinality(q))] = q[1:least(cardinality(p),cardinality(q))] then raise exception 'overlapping compact inverse'; end if;
    end loop;
    seen := seen || jsonb_build_array(to_jsonb(p));
    op := change->>'op';
    if op = 'set' then
      if not (change ?& array['op','path','value']) or (select count(*) from jsonb_object_keys(change)) <> 3 then raise exception 'invalid compact inverse'; end if;
    elsif op = 'remove' then
      if (select count(*) from jsonb_object_keys(change)) <> 2 then raise exception 'invalid compact inverse'; end if;
    elsif op = 'splice' then
      if not (change ?& array['op','path','expectedLength','index','remove','values']) or (select count(*) from jsonb_object_keys(change)) <> 6
        or jsonb_typeof(change->'values') is distinct from 'array' then raise exception 'invalid compact inverse'; end if;
      foreach segment in array array['expectedLength','index','remove'] loop
        if jsonb_typeof(change->segment) is distinct from 'number' or (change->>segment)::numeric not between 0 and 2147483647
          or (change->>segment)::numeric <> trunc((change->>segment)::numeric) then raise exception 'invalid compact inverse'; end if;
      end loop;
    else raise exception 'invalid compact inverse'; end if;
    parent := result;
    for i in 1..cardinality(p) loop
      segment := p[i];
      if jsonb_typeof(parent) = 'object' then
        exists_leaf := parent ? segment;
      elsif jsonb_typeof(parent) = 'array' then
        if segment !~ '^(0|[1-9][0-9]*)$' or length(segment) > 10 or segment::numeric > 2147483647 then raise exception 'invalid array index'; end if;
        idx := segment::integer; exists_leaf := idx < jsonb_array_length(parent);
      else raise exception 'missing inverse parent'; end if;
      if i < cardinality(p) then
        if not exists_leaf then raise exception 'missing inverse parent'; end if;
        parent := case when jsonb_typeof(parent) = 'array' then parent->idx else parent->segment end;
      end if;
    end loop;
    final_key := p[cardinality(p)];
    existing := case when jsonb_typeof(parent) = 'array' then parent->idx else parent->final_key end;
    if op = 'remove' then
      if jsonb_typeof(parent) <> 'object' or not exists_leaf then raise exception 'invalid remove'; end if;
      result := result #- p;
    elsif op = 'set' then
      if jsonb_typeof(parent) = 'array' and not exists_leaf then raise exception 'invalid array index'; end if;
      if exists_leaf and existing = change->'value' then raise exception 'no-op inverse'; end if;
      result := jsonb_set(result,p,change->'value',true);
    else
      if not exists_leaf or jsonb_typeof(existing) is distinct from 'array' then raise exception 'invalid splice'; end if;
      n := jsonb_array_length(existing); expected := (change->>'expectedLength')::integer;
      at_index := (change->>'index')::integer; removed := (change->>'remove')::integer;
      if expected <> n or at_index > n or removed > n-at_index then raise exception 'invalid splice'; end if;
      select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into replacement from jsonb_array_elements(existing) with ordinality e(value,ord) where ord <= at_index;
      replacement := replacement || (change->'values');
      select replacement || coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into replacement from jsonb_array_elements(existing) with ordinality e(value,ord) where ord > at_index+removed;
      if replacement = existing then raise exception 'no-op inverse'; end if;
      result := jsonb_set(result,p,replacement,false);
    end if;
  end loop;
  if not coalesce(flowme_private.alpha_json_v1(result),false) then raise exception 'invalid inverse result'; end if;
  return result;
end;
$$;

create function flowme_private.alpha_creator_inverse_v1(before_space jsonb, after_space jsonb, field_name text)
returns jsonb language plpgsql immutable security invoker set search_path = ''
as $$
declare legacy jsonb; patch jsonb; changes jsonb;
begin
  legacy := case when before_space ? field_name then jsonb_build_object('field',field_name,'present',true,'value',before_space->field_name)
    else jsonb_build_object('field',field_name,'present',false) end;
  if field_name is distinct from 'creatorWorkspace' or jsonb_typeof(before_space->field_name) is distinct from 'object'
    or jsonb_typeof(after_space->field_name) is distinct from 'object' then return legacy; end if;
  changes := flowme_private.alpha_object_inverse_diff_v1(after_space->field_name,before_space->field_name);
  if changes is null or jsonb_array_length(changes) = 0 then return legacy; end if;
  patch := jsonb_build_object('field',field_name,'schema','flowme-alpha-object-inverse/1','changes',changes);
  if not coalesce(flowme_private.alpha_json_v1(patch),false) or octet_length(patch::text) >= octet_length(legacy::text) then return legacy; end if;
  if flowme_private.alpha_object_inverse_apply_v1(after_space->field_name,patch) is distinct from before_space->field_name then raise exception 'inverse roundtrip failed'; end if;
  return patch;
end;
$$;

revoke all on function flowme_private.alpha_object_inverse_diff_v1(jsonb,jsonb,text[]) from public,anon,authenticated;
revoke all on function flowme_private.alpha_object_inverse_apply_v1(jsonb,jsonb) from public,anon,authenticated;
revoke all on function flowme_private.alpha_creator_inverse_v1(jsonb,jsonb,text) from public,anon,authenticated;

-- Same forward validator, signature, owner/session locks, receipt replay and CAS.
create or replace function flowme_private.alpha_creator_execute_v1(commit_text text, proof text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid(); input_commit jsonb; input_command jsonb; signing_key bytea; expected_proof text;
  before_account jsonb; next_account jsonb; before_space jsonb; next_space jsonb;
  operation flowme_private.alpha_operations_v1%rowtype;
  original flowme_private.alpha_operations_v1%rowtype;
  change jsonb; changes jsonb; inverse jsonb := '[]'::jsonb; field_name text;
  receipt_value jsonb; revision bigint; seen_fields text[] := '{}';
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
    if jsonb_typeof(change) is distinct from 'object' or jsonb_typeof(change->'field') is distinct from 'string' then raise exception 'invalid inverse row'; end if;
    field_name := change->>'field';
    if field_name <> all(array['creatorWorkspace','text','archivedDocumentIds','retentionDocuments','catalogLibrary'])
      or field_name = any(seen_fields) then raise exception 'invalid inverse field'; end if;
    seen_fields := array_append(seen_fields,field_name);
    if change ? 'schema' then
      -- Compact rows originate only in this locked ledger, never caller changes.
      if input_command->>'kind' is distinct from 'undo-creator' or field_name <> 'creatorWorkspace' then raise exception 'invalid compact inverse origin'; end if;
      next_space := jsonb_set(next_space,array[field_name],
        flowme_private.alpha_object_inverse_apply_v1(next_space->field_name,change),false);
    else
      if jsonb_typeof(change->'present') is distinct from 'boolean' then raise exception 'invalid legacy inverse'; end if;
      if change->'present' = 'true'::jsonb then
        if not (change ?& array['field','present','value']) or (select count(*) from jsonb_object_keys(change)) <> 3 then raise exception 'invalid legacy inverse'; end if;
        next_space := jsonb_set(next_space,array[field_name],change->'value',true);
      else
        if (select count(*) from jsonb_object_keys(change)) <> 2 then raise exception 'invalid legacy inverse'; end if;
        next_space := next_space - field_name;
      end if;
    end if;
    if (before_space ? field_name) is distinct from (next_space ? field_name)
      or before_space->field_name is distinct from next_space->field_name then
      inverse := inverse || jsonb_build_array(flowme_private.alpha_creator_inverse_v1(before_space,next_space,field_name));
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
-- Existing writer grants remain unchanged by CREATE OR REPLACE.
