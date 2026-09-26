-- M5 DEV-only contract: wkmzcxpnojobxrgebapw. No production approval.
-- Small bounded development repository; not a permanent product storage policy.
create table flowme_private.alpha_social_identities_v1 (
  owner_id uuid primary key references auth.users(id),
  public_actor_id text not null unique default ('member-' || gen_random_uuid()::text),
  display_name text not null default 'FlowMe 참여자',
  check (public_actor_id ~ '^member-[0-9a-f-]{36}$'),
  check (length(display_name) between 1 and 80)
);
create table flowme_private.alpha_social_state_v1 (
  id boolean primary key default true check (id),
  revision bigint not null default 0 check (revision between 0 and 9007199254740991),
  repository jsonb not null default '{"flows":[],"versions":[],"posts":[],"replies":[],"reactions":[],"proposals":[]}'::jsonb
);
create table flowme_private.alpha_social_rate_v1 (
  owner_id uuid primary key references auth.users(id),
  window_started_at timestamptz not null,
  successful_commands integer not null check (successful_commands between 1 and 120)
);
alter table flowme_private.alpha_social_identities_v1 enable row level security;
alter table flowme_private.alpha_social_identities_v1 force row level security;
alter table flowme_private.alpha_social_state_v1 enable row level security;
alter table flowme_private.alpha_social_state_v1 force row level security;
alter table flowme_private.alpha_social_rate_v1 enable row level security;
alter table flowme_private.alpha_social_rate_v1 force row level security;
revoke all on table flowme_private.alpha_social_identities_v1, flowme_private.alpha_social_state_v1,
  flowme_private.alpha_social_rate_v1 from public, anon, authenticated;
insert into flowme_private.alpha_social_state_v1(id) values(true);

create function flowme_private.alpha_social_repository_shape_v1(value jsonb)
returns boolean language plpgsql immutable security invoker set search_path = ''
as $$
declare field_name text; entries jsonb; entry jsonb;
begin
  if not flowme_private.alpha_json_v1(value) or jsonb_typeof(value) is distinct from 'object'
    or not (value ?& array['flows','versions','posts','replies','reactions','proposals'])
    or (select count(*) from jsonb_object_keys(value)) <> 6 then return false; end if;
  foreach field_name in array array['flows','versions','posts','replies','reactions','proposals'] loop
    entries := value->field_name;
    if jsonb_typeof(entries) is distinct from 'array' or jsonb_array_length(entries) > 2000 then return false; end if;
    for entry in select * from jsonb_array_elements(entries) loop
      if jsonb_typeof(entry) is distinct from 'object' then return false; end if;
      if field_name <> 'reactions' and not coalesce(flowme_private.alpha_identifier_v1(entry->>'id'),false) then return false; end if;
    end loop;
    if field_name <> 'reactions' and (select count(distinct e->>'id') from jsonb_array_elements(entries) e) <> jsonb_array_length(entries)
      then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;
revoke all on function flowme_private.alpha_social_repository_shape_v1(jsonb) from public, anon, authenticated;
alter table flowme_private.alpha_social_state_v1 add constraint alpha_social_repository_shape_v1
  check (flowme_private.alpha_social_repository_shape_v1(repository) is true);

-- A read has no writes. Alias creation is an explicit, idempotent open action.
create function flowme_private.alpha_social_open_v1()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare actor uuid := auth.uid(); alias_value text;
begin
  if actor is null or not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  perform 1 from public.flowme_alpha_accounts where owner_id = actor for update;
  if not found then return '{"ok":false,"reason":"not-found"}'::jsonb; end if;
  -- Replaceable DEV bound matches the service context validator (not the local
  -- simulation actor limit). Existing identities can still reopen at the cap.
  perform 1 from flowme_private.alpha_social_state_v1 where id for update;
  if not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  if not exists(select 1 from flowme_private.alpha_social_identities_v1 where owner_id = actor)
    and (select count(*) from flowme_private.alpha_social_identities_v1) >= 512 then return '{"ok":false,"reason":"unavailable"}'::jsonb; end if;
  insert into flowme_private.alpha_social_identities_v1(owner_id) values(actor) on conflict(owner_id) do nothing;
  select public_actor_id into alias_value from flowme_private.alpha_social_identities_v1 where owner_id = actor;
  return jsonb_build_object('ok',true,'value',jsonb_build_object('ownActorId',alias_value));
end;
$$;
revoke all on function flowme_private.alpha_social_open_v1() from public, anon, authenticated;
grant execute on function flowme_private.alpha_social_open_v1() to authenticated;
create function public.flowme_alpha_social_open_v1()
returns jsonb language sql security invoker set search_path = ''
as $$ select flowme_private.alpha_social_open_v1(); $$;
revoke all on function public.flowme_alpha_social_open_v1() from public, anon, authenticated;
grant execute on function public.flowme_alpha_social_open_v1() to authenticated;

-- Internal helper is not directly callable. Paired reads lock account then shared
-- repository, the same order as the writer; never expose a mismatched reference.
create function flowme_private.alpha_social_read_internal_v1(include_all_proposals boolean)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare actor uuid := auth.uid(); alias_value text; account_value jsonb; state_value jsonb;
  public_revision bigint; actor_values jsonb;
begin
  if actor is null or not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  select account into account_value from public.flowme_alpha_accounts where owner_id = actor for share;
  if account_value is null then return '{"ok":false,"reason":"not-found"}'::jsonb; end if;
  select repository,revision into state_value,public_revision from flowme_private.alpha_social_state_v1 where id for share;
  if not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  select public_actor_id into alias_value from flowme_private.alpha_social_identities_v1 where owner_id = actor;
  if alias_value is null then return '{"ok":false,"reason":"not-found"}'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',public_actor_id,'name',display_name) order by public_actor_id),'[]'::jsonb)
    into actor_values from flowme_private.alpha_social_identities_v1;
  if not include_all_proposals then
    state_value := jsonb_set(state_value,'{proposals}',coalesce((select jsonb_agg(p.value order by p.ordinality)
      from jsonb_array_elements(state_value->'proposals') with ordinality p(value,ordinality)
      where p.value->>'authorId' = alias_value or exists(select 1 from jsonb_array_elements(state_value->'flows') f
        where f->>'id' = p.value->>'flowId' and f->>'ownerId' = alias_value)),'[]'::jsonb));
  end if;
  return jsonb_build_object('ok',true,'value',jsonb_build_object('account',account_value,'context',jsonb_build_object(
    'schema','flowme-alpha-social-context/1','revision',public_revision,'ownActorId',alias_value,'actors',actor_values,'public',state_value)));
end;
$$;
revoke all on function flowme_private.alpha_social_read_internal_v1(boolean) from public, anon, authenticated;
create function flowme_private.alpha_social_read_v1()
returns jsonb language sql security definer set search_path = ''
as $$ select flowme_private.alpha_social_read_internal_v1(false); $$;
revoke all on function flowme_private.alpha_social_read_v1() from public, anon, authenticated;
grant execute on function flowme_private.alpha_social_read_v1() to authenticated;
create function public.flowme_alpha_social_read_v1()
returns jsonb language sql security invoker set search_path = ''
as $$ select flowme_private.alpha_social_read_v1(); $$;
revoke all on function public.flowme_alpha_social_read_v1() from public, anon, authenticated;
grant execute on function public.flowme_alpha_social_read_v1() to authenticated;

create function flowme_private.alpha_social_server_read_v1(read_text text, proof text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare actor uuid := auth.uid(); signing_key bytea; value jsonb; expected_proof text;
begin
  if actor is null or not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  if read_text is null or octet_length(read_text) > 2000 or proof is null or proof !~ '^[0-9a-f]{64}$'
    then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  begin value := read_text::jsonb; exception when others then return '{"ok":false,"reason":"invalid"}'::jsonb; end;
  if value is distinct from '{"schema":"flowme-alpha-social-server-read/1"}'::jsonb
    then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  select secret_key into signing_key from flowme_private.alpha_command_signing_keys_v1 where id;
  if signing_key is null then return '{"ok":false,"reason":"unavailable"}'::jsonb; end if;
  expected_proof := encode(extensions.hmac(convert_to(actor::text || E'\n' || read_text,'UTF8'),signing_key,'sha256'),'hex');
  if proof <> expected_proof then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  return flowme_private.alpha_social_read_internal_v1(true);
end;
$$;
revoke all on function flowme_private.alpha_social_server_read_v1(text,text) from public, anon, authenticated;
grant execute on function flowme_private.alpha_social_server_read_v1(text,text) to authenticated;
create function public.flowme_alpha_social_server_read_v1(read_text text, proof text)
returns jsonb language sql security invoker set search_path = ''
as $$ select flowme_private.alpha_social_server_read_v1(read_text,proof); $$;
revoke all on function public.flowme_alpha_social_server_read_v1(text,text) from public, anon, authenticated;
grant execute on function public.flowme_alpha_social_server_read_v1(text,text) to authenticated;

-- Independent SQL ownership/append-only protection in addition to the signed
-- Node domain validator. Existing entities are never removed by aggregate write.
create function flowme_private.alpha_social_preserves_v1(before_value jsonb, after_value jsonb, alias_value text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare field_name text; old_entry jsonb; new_entry jsonb; owner_alias text; author_field text;
begin
  if not flowme_private.alpha_social_repository_shape_v1(after_value) then return false; end if;
  foreach field_name in array array['flows','versions','posts','replies','proposals'] loop
    for old_entry in select * from jsonb_array_elements(before_value->field_name) loop
      select e into new_entry from jsonb_array_elements(after_value->field_name) e where e->>'id' = old_entry->>'id';
      if new_entry is null then return false; end if;
      if field_name = 'versions' then
        if new_entry <> old_entry then return false; end if;
      elsif field_name = 'flows' then
        if new_entry->'ownerId' is distinct from old_entry->'ownerId' or new_entry->'derivedFrom' is distinct from old_entry->'derivedFrom'
          or new_entry <> old_entry and old_entry->>'ownerId' <> alias_value
          or old_entry->'archived' = 'true'::jsonb and new_entry <> old_entry then return false; end if;
      elsif field_name = 'proposals' then
        if new_entry <> old_entry then
          select f->>'ownerId' into owner_alias from jsonb_array_elements(before_value->'flows') f where f->>'id' = old_entry->>'flowId';
          if owner_alias is distinct from alias_value
            or (new_entry - array['status','reviewNote','reviewedBy','resultVersionId','updatedAt'])
              <> (old_entry - array['status','reviewNote','reviewedBy','resultVersionId','updatedAt'])
            or new_entry->>'reviewedBy' is distinct from alias_value
            or old_entry->>'status' = any(array['accepted','rejected']) then return false; end if;
        end if;
      else
        if new_entry->'authorId' is distinct from old_entry->'authorId'
          or new_entry->'createdAt' is distinct from old_entry->'createdAt'
          or new_entry <> old_entry and old_entry->>'authorId' <> alias_value
          or old_entry->'deleted' = 'true'::jsonb and new_entry <> old_entry then return false; end if;
        if field_name = 'posts' and (new_entry - array['title','body','topic','media','evidencePostIds','updatedAt','deleted'])
          <> (old_entry - array['title','body','topic','media','evidencePostIds','updatedAt','deleted']) then return false; end if;
        if field_name = 'replies' and (new_entry - array['body','updatedAt','deleted'])
          <> (old_entry - array['body','updatedAt','deleted']) then return false; end if;
      end if;
    end loop;
    for new_entry in select * from jsonb_array_elements(after_value->field_name) n
      where not exists(select 1 from jsonb_array_elements(before_value->field_name) o where o->>'id' = n->>'id') loop
      author_field := case field_name when 'flows' then 'ownerId' when 'versions' then 'createdBy' else 'authorId' end;
      if new_entry->>author_field is distinct from alias_value then return false; end if;
      if field_name = 'versions' then
        select f->>'ownerId' into owner_alias from jsonb_array_elements(after_value->'flows') f where f->>'id' = new_entry->>'flowId';
        if owner_alias is distinct from alias_value then return false; end if;
      elsif field_name = 'proposals' and (new_entry->>'status' is distinct from 'submitted'
        or new_entry->'reviewedBy' is distinct from 'null'::jsonb or new_entry->'resultVersionId' is distinct from 'null'::jsonb
        or new_entry->>'reviewNote' is distinct from '') then return false;
      end if;
      if field_name = 'flows' and new_entry->'archived' is distinct from 'false'::jsonb
        or field_name = any(array['posts','replies']) and new_entry->'deleted' is distinct from 'false'::jsonb then return false; end if;
    end loop;
  end loop;
  -- Tombstones retain identity/reference only, never removed public body/media.
  if exists(select 1 from jsonb_array_elements(after_value->'posts') p where p->'deleted' = 'true'::jsonb
    and (p->>'title' is distinct from '삭제된 글' or p->>'body' is distinct from '' or p->>'topic' is distinct from ''
      or p->'media' is distinct from '[]'::jsonb or p->'evidencePostIds' is distinct from '[]'::jsonb))
    or exists(select 1 from jsonb_array_elements(after_value->'replies') r where r->'deleted' = 'true'::jsonb and r->>'body' is distinct from '')
    then return false; end if;
  -- Each changed reaction must belong to this actor. Deleting one's post/reply
  -- may additionally remove reactions on that now-deleted target.
  for new_entry in select * from jsonb_array_elements(after_value->'reactions') n
    where not exists(select 1 from jsonb_array_elements(before_value->'reactions') o where o = n) loop
    if new_entry->>'actorId' is distinct from alias_value then return false; end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(after_value->'proposals') p where p->'reviewedBy' <> 'null'::jsonb
    and not exists(select 1 from flowme_private.alpha_social_identities_v1 i where i.public_actor_id = p->>'reviewedBy')) then return false; end if;
  for old_entry in select * from jsonb_array_elements(before_value->'reactions') o
    where not exists(select 1 from jsonb_array_elements(after_value->'reactions') n where n = o) loop
    if old_entry->>'actorId' is distinct from alias_value and not exists(
      select 1 from jsonb_array_elements(after_value->(case old_entry->>'targetKind' when 'post' then 'posts' else 'replies' end)) target
      where target->>'id' = old_entry->>'targetId' and target->>'authorId' = alias_value and target->'deleted' = 'true'::jsonb)
      then return false; end if;
  end loop;
  -- No raw auth IDs or unknown aliases may be injected as public attribution.
  foreach field_name in array array['flows','versions','posts','replies','proposals','reactions'] loop
    author_field := case field_name when 'flows' then 'ownerId' when 'versions' then 'createdBy' when 'reactions' then 'actorId' else 'authorId' end;
    if exists(select 1 from jsonb_array_elements(after_value->field_name) e where not exists(
      select 1 from flowme_private.alpha_social_identities_v1 identity_row where identity_row.public_actor_id = e->>author_field)) then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;
revoke all on function flowme_private.alpha_social_preserves_v1(jsonb,jsonb,text) from public, anon, authenticated;

create function flowme_private.alpha_social_commit_v1(value jsonb)
returns boolean language plpgsql immutable security invoker set search_path = ''
as $$
declare input_command jsonb; change jsonb; seen text[] := '{}'; field_name text; revision_key text;
begin
  if not flowme_private.alpha_json_v1(value) or jsonb_typeof(value) is distinct from 'object'
    or value->>'schema' is distinct from 'flowme-alpha-social-commit/1'
    or not (value ?& array['schema','command','changes','publicRepository','resultId'])
    or (select count(*) from jsonb_object_keys(value)) <> 5 then return false; end if;
  input_command := value->'command';
  if jsonb_typeof(input_command) is distinct from 'object'
    or input_command->>'schema' is distinct from 'flowme-alpha-social-command/1'
    or not coalesce(input_command->>'kind' = any(array['social','undo-social']),false)
    or not (input_command ?& array['schema','kind','requestId','expectedRevision','expectedPublicRevision'])
    or jsonb_typeof(input_command->'requestId') is distinct from 'string'
    or not flowme_private.alpha_identifier_v1(input_command->>'requestId',160)
    or jsonb_typeof(value->'changes') is distinct from 'array'
    or jsonb_array_length(value->'changes') > 11
    or not (value->'publicRepository' = 'null'::jsonb or flowme_private.alpha_social_repository_shape_v1(value->'publicRepository'))
    or not (value->'resultId' = 'null'::jsonb or jsonb_typeof(value->'resultId') = 'string'
      and flowme_private.alpha_identifier_v1(value->>'resultId')) then return false; end if;
  foreach revision_key in array array['expectedRevision','expectedPublicRevision'] loop
    if jsonb_typeof(input_command->revision_key) is distinct from 'number'
      or (input_command->>revision_key)::numeric not between 0 and 9007199254740991
      or (input_command->>revision_key)::numeric <> trunc((input_command->>revision_key)::numeric) then return false; end if;
  end loop;
  if input_command->>'kind' = 'undo-social' then
    return (select count(*) from jsonb_object_keys(input_command)) = 6
      and input_command ? 'operationId'
      and jsonb_typeof(input_command->'operationId') = 'string'
      and flowme_private.alpha_identifier_v1(input_command->>'operationId',160)
      and input_command->>'operationId' <> input_command->>'requestId'
      and value->'changes' = '[]'::jsonb and value->'publicRepository' = 'null'::jsonb and value->'resultId' = 'null'::jsonb;
  end if;
  if (select count(*) from jsonb_object_keys(input_command)) <> 6 or jsonb_typeof(input_command->'intent') is distinct from 'object'
    then return false; end if;
  for change in select * from jsonb_array_elements(value->'changes') loop
    if jsonb_typeof(change) is distinct from 'object' or jsonb_typeof(change->'field') is distinct from 'string'
      or jsonb_typeof(change->'present') is distinct from 'boolean' then return false; end if;
    field_name := change->>'field';
    if field_name <> all(array['text','copies','archivedDocumentIds','position','retentionDocuments','recurrenceExecution',
      'recurrencePlans','publicationDrafts','publications','participationDrafts','proposalReviewDrafts'])
      or field_name = any(seen) then return false; end if;
    seen := array_append(seen,field_name);
    if change->'present' = 'true'::jsonb then
      if not (change ?& array['field','present','value']) or (select count(*) from jsonb_object_keys(change)) <> 3 then return false; end if;
    elsif (select count(*) from jsonb_object_keys(change)) <> 2
      or field_name = any(array['text','copies','archivedDocumentIds','position','publicationDrafts','publications','participationDrafts']) then return false;
    end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;
revoke all on function flowme_private.alpha_social_commit_v1(jsonb) from public, anon, authenticated;

create function flowme_private.alpha_social_execute_v1(commit_text text, proof text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare actor uuid := auth.uid(); alias_value text; input_commit jsonb; input_command jsonb; signing_key bytea; expected_proof text;
  before_account jsonb; next_account jsonb; before_space jsonb; next_space jsonb; before_public jsonb; next_public jsonb;
  operation flowme_private.alpha_operations_v1%rowtype; original flowme_private.alpha_operations_v1%rowtype;
  change jsonb; changes jsonb; inverse jsonb := '[]'::jsonb; field_name text;
  receipt_value jsonb; account_revision bigint; public_revision bigint; public_changed boolean;
  rate_window timestamptz; rate_count integer; now_value timestamptz := clock_timestamp();
begin
  if actor is null or not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  if commit_text is null or octet_length(commit_text) > 30000000 or proof is null or proof !~ '^[0-9a-f]{64}$'
    then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  begin input_commit := commit_text::jsonb; exception when others then return '{"ok":false,"reason":"invalid"}'::jsonb; end;
  if not coalesce(flowme_private.alpha_social_commit_v1(input_commit),false) then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  input_command := input_commit->'command';
  select secret_key into signing_key from flowme_private.alpha_command_signing_keys_v1 where id;
  if signing_key is null then return '{"ok":false,"reason":"unavailable"}'::jsonb; end if;
  expected_proof := encode(extensions.hmac(convert_to(actor::text || E'\n' || commit_text,'UTF8'),signing_key,'sha256'),'hex');
  if proof <> expected_proof then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  select account into before_account from public.flowme_alpha_accounts where owner_id = actor for update;
  if before_account is null then return '{"ok":false,"reason":"not-found"}'::jsonb; end if;
  select repository,revision into before_public,public_revision from flowme_private.alpha_social_state_v1 where id for update;
  if not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  select public_actor_id into alias_value from flowme_private.alpha_social_identities_v1 where owner_id = actor;
  if alias_value is null then return '{"ok":false,"reason":"not-found"}'::jsonb; end if;
  select * into operation from flowme_private.alpha_operations_v1
    where owner_id = actor and request_id = input_command->>'requestId';
  if found then
    if operation.command = input_command then return jsonb_build_object('ok',true,'value',operation.receipt); end if;
    return '{"ok":false,"reason":"idempotency-conflict"}'::jsonb;
  end if;
  account_revision := (before_account->>'revision')::bigint;
  if (input_command->>'expectedRevision')::numeric <> account_revision
    or (input_command->>'expectedPublicRevision')::numeric <> public_revision then return '{"ok":false,"reason":"revision-conflict"}'::jsonb; end if;
  if input_command->>'kind' = 'undo-social' then
    select * into original from flowme_private.alpha_operations_v1 where owner_id = actor and request_id = input_command->>'operationId';
    if not found or original.undone or original.receipt->>'kind' <> all(array['social','undo-social'])
      or original.receipt->'changed' <> 'true'::jsonb or (original.receipt->>'revision')::bigint <> account_revision
      or (original.receipt->>'publicRevision')::bigint > public_revision then return '{"ok":false,"reason":"undo-conflict"}'::jsonb; end if;
    changes := original.inverse;
  else changes := input_commit->'changes'; end if;
  if input_commit->'publicRepository' = 'null'::jsonb then next_public := before_public;
  else next_public := input_commit->'publicRepository'; end if;
  if not flowme_private.alpha_social_preserves_v1(before_public,next_public,alias_value) then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  before_space := before_account->'space'; next_space := before_space;
  for change in select * from jsonb_array_elements(changes) loop
    field_name := change->>'field';
    if field_name <> all(array['text','copies','archivedDocumentIds','position','retentionDocuments','recurrenceExecution',
      'recurrencePlans','publicationDrafts','publications','participationDrafts','proposalReviewDrafts'])
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
  public_changed := next_public <> before_public;
  if next_space = before_space and not public_changed then return '{"ok":false,"reason":"no-change"}'::jsonb; end if;
  if (input_command->>'kind' = 'social' and not coalesce(flowme_private.alpha_identifier_v1(input_commit->>'resultId'),false))
    or account_revision >= 9007199254740991 or public_changed and public_revision >= 9007199254740991
    then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  next_account := jsonb_set(jsonb_set(before_account,'{space}',next_space),'{revision}',to_jsonb(account_revision+1));
  if not coalesce(flowme_private.alpha_account_shape_v1(next_account,actor),false) then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  -- Replaceable DEV cap, measured by server clock. Account lock serializes it.
  now_value := clock_timestamp();
  select window_started_at,successful_commands into rate_window,rate_count from flowme_private.alpha_social_rate_v1 where owner_id = actor;
  if rate_window is not null and rate_window > now_value - interval '1 minute' and rate_count >= 120
    then return '{"ok":false,"reason":"rate-limited"}'::jsonb; end if;
  if rate_window is null or rate_window <= now_value - interval '1 minute' then rate_window := now_value; rate_count := 0; end if;
  receipt_value := jsonb_build_object('requestId',input_command->>'requestId','revision',account_revision+1,'changed',true,
    'kind',input_command->>'kind','publicRevision',public_revision + case when public_changed then 1 else 0 end);
  if input_command->>'kind' = 'social' then receipt_value := receipt_value || jsonb_build_object('resultId',input_commit->>'resultId'); end if;
  if public_changed and not flowme_private.alpha_social_media_commit_v1(before_public,next_public,alias_value)
    then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  update public.flowme_alpha_accounts set account = next_account where owner_id = actor;
  if public_changed then update flowme_private.alpha_social_state_v1 set repository = next_public,revision = public_revision+1 where id; end if;
  insert into flowme_private.alpha_operations_v1(owner_id,request_id,command,receipt,inverse,undone)
    values(actor,input_command->>'requestId',input_command,receipt_value,inverse,public_changed);
  if input_command->>'kind' = 'undo-social' then
    update flowme_private.alpha_operations_v1 set undone = true where owner_id = actor and request_id = input_command->>'operationId';
  end if;
  insert into flowme_private.alpha_social_rate_v1(owner_id,window_started_at,successful_commands)
    values(actor,rate_window,rate_count+1) on conflict(owner_id) do update
      set window_started_at = excluded.window_started_at, successful_commands = excluded.successful_commands;
  return jsonb_build_object('ok',true,'value',receipt_value);
exception when others then
  -- Entire function block rolls back account, public, rate and ledger together.
  return '{"ok":false,"reason":"unavailable"}'::jsonb;
end;
$$;
revoke all on function flowme_private.alpha_social_execute_v1(text,text) from public, anon, authenticated;
grant execute on function flowme_private.alpha_social_execute_v1(text,text) to authenticated;
create function public.flowme_alpha_social_execute_v1(commit_text text, proof text)
returns jsonb language sql security invoker set search_path = ''
as $$ select flowme_private.alpha_social_execute_v1(commit_text,proof); $$;
revoke all on function public.flowme_alpha_social_execute_v1(text,text) from public, anon, authenticated;
grant execute on function public.flowme_alpha_social_execute_v1(text,text) to authenticated;
