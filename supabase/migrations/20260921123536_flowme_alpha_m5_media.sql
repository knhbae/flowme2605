-- DEV-only wkmzcxpnojobxrgebapw. Replaceable M5 staging TTL=24h, 2MB,
-- 16M pixels, WebP output. Not a permanent attachment retention policy.
create table flowme_private.alpha_social_media_v1 (
  id text primary key check (id ~ '^media-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  owner_id uuid not null references auth.users(id),
  request_id text not null check (length(request_id) between 1 and 160),
  object_path text not null unique,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  bytes integer not null check (bytes between 1 and 2000000),
  width integer not null check (width between 1 and 16000000),
  height integer not null check (height between 1 and 16000000),
  alt text not null check (length(alt) between 1 and 500),
  synthetic boolean not null,
  status text not null check (status = any(array['uploading','staged','published','detached','cancelled'])),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  unique(owner_id,request_id),
  check (width::bigint * height::bigint <= 16000000),
  check (object_path = 'media/' || id || '.webp')
);
alter table flowme_private.alpha_social_media_v1 enable row level security;
alter table flowme_private.alpha_social_media_v1 force row level security;
revoke all on table flowme_private.alpha_social_media_v1 from public, anon, authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('flowme-alpha-social-media-v1','flowme-alpha-social-media-v1',false,2000000,array['image/webp']);

create function flowme_private.alpha_social_media_linked_v1(media_id text)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from flowme_private.alpha_social_state_v1 s,
  lateral jsonb_array_elements(s.repository->'posts') p,
  lateral jsonb_array_elements(p->'media') m
  where s.id and p->'deleted' = 'false'::jsonb and m->>'id' = media_id and m->>'dataUrl' = 'flowme-media:' || media_id); $$;
revoke all on function flowme_private.alpha_social_media_linked_v1(text) from public, anon, authenticated;

create function flowme_private.alpha_social_media_access_v1(path_value text, operation text)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare actor uuid := auth.uid(); media flowme_private.alpha_social_media_v1%rowtype;
begin
  if actor is null or not flowme_private.live_session_v1() then return false; end if;
  select * into media from flowme_private.alpha_social_media_v1 where object_path = path_value;
  if not found then return false; end if;
  if operation = 'insert' then return media.owner_id = actor and media.status = 'uploading' and media.expires_at > now(); end if;
  if operation = 'delete' then return media.owner_id = actor and media.status = 'cancelled'
    and not flowme_private.alpha_social_media_linked_v1(media.id); end if;
  if operation = 'cleanup-select' then return media.owner_id = actor and media.status = 'cancelled'
    and not flowme_private.alpha_social_media_linked_v1(media.id); end if;
  if operation = 'read' then return (media.owner_id = actor and media.status = any(array['uploading','staged']) and media.expires_at > now())
    or (media.status = 'published' and flowme_private.alpha_social_media_linked_v1(media.id)); end if;
  return false;
end;
$$;
revoke all on function flowme_private.alpha_social_media_access_v1(text,text) from public, anon, authenticated;
grant execute on function flowme_private.alpha_social_media_access_v1(text,text) to authenticated;
create policy flowme_alpha_social_media_insert_v1 on storage.objects for insert to authenticated
  with check (bucket_id = 'flowme-alpha-social-media-v1' and owner_id = (select auth.uid())::text
    and storage.allow_only_operation('object.upload') and flowme_private.alpha_social_media_access_v1(name,'insert'));
-- Bytes-only authenticated download. No listing/info/sign/copy endpoints: those
-- could disclose Storage owner metadata or mint a URL that outlives withdrawal.
create policy flowme_alpha_social_media_read_v1 on storage.objects for select to authenticated
  using (bucket_id = 'flowme-alpha-social-media-v1' and (
    storage.allow_only_operation('object.get_authenticated') and flowme_private.alpha_social_media_access_v1(name,'read')
    or storage.allow_only_operation('object.delete_many') and flowme_private.alpha_social_media_access_v1(name,'cleanup-select')));
-- No UPDATE policy: a stored object can never be overwritten or upserted.
create policy flowme_alpha_social_media_delete_v1 on storage.objects for delete to authenticated
  using (bucket_id = 'flowme-alpha-social-media-v1' and owner_id = (select auth.uid())::text
    and storage.allow_only_operation('object.delete_many') and flowme_private.alpha_social_media_access_v1(name,'delete'));

create function flowme_private.alpha_social_media_stage_v1(stage_text text, proof text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare actor uuid := auth.uid(); input_value jsonb; signing_key bytea; expected_proof text;
  media flowme_private.alpha_social_media_v1%rowtype;
begin
  if actor is null or not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  if stage_text is null or octet_length(stage_text) > 4000 or proof is null or proof !~ '^[0-9a-f]{64}$'
    then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  begin input_value := stage_text::jsonb; exception when others then return '{"ok":false,"reason":"invalid"}'::jsonb; end;
  if jsonb_typeof(input_value) is distinct from 'object' or input_value->>'schema' is distinct from 'flowme-alpha-media-stage/1'
    or not (input_value ?& array['schema','action','id','requestId','sha256','bytes','width','height','alt','synthetic'])
    or (select count(*) from jsonb_object_keys(input_value)) <> 10
    or not coalesce(input_value->>'action' = any(array['reserve','ready']),false)
    or not coalesce(input_value->>'id' ~ '^media-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',false)
    or jsonb_typeof(input_value->'requestId') is distinct from 'string' or not flowme_private.alpha_identifier_v1(input_value->>'requestId',160)
    or not coalesce(input_value->>'sha256' ~ '^[0-9a-f]{64}$',false)
    or jsonb_typeof(input_value->'alt') is distinct from 'string' or length(input_value->>'alt') not between 1 and 500
    or btrim(input_value->>'alt') = '' or jsonb_typeof(input_value->'synthetic') is distinct from 'boolean'
    or jsonb_typeof(input_value->'bytes') is distinct from 'number' or (input_value->>'bytes')::numeric <> trunc((input_value->>'bytes')::numeric)
    or (input_value->>'bytes')::numeric not between 1 and 2000000
    or jsonb_typeof(input_value->'width') is distinct from 'number' or (input_value->>'width')::numeric <> trunc((input_value->>'width')::numeric)
    or jsonb_typeof(input_value->'height') is distinct from 'number' or (input_value->>'height')::numeric <> trunc((input_value->>'height')::numeric)
    or (input_value->>'width')::numeric not between 1 and 16000000 or (input_value->>'height')::numeric not between 1 and 16000000
    or (input_value->>'width')::numeric * (input_value->>'height')::numeric > 16000000 then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  select secret_key into signing_key from flowme_private.alpha_command_signing_keys_v1 where id;
  if signing_key is null then return '{"ok":false,"reason":"unavailable"}'::jsonb; end if;
  expected_proof := encode(extensions.hmac(convert_to(actor::text || E'\n' || stage_text,'UTF8'),signing_key,'sha256'),'hex');
  if proof <> expected_proof then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  perform 1 from public.flowme_alpha_accounts where owner_id = actor for update;
  if not found then return '{"ok":false,"reason":"not-found"}'::jsonb; end if;
  if not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  select * into media from flowme_private.alpha_social_media_v1 where owner_id = actor and request_id = input_value->>'requestId' for update;
  if found then
    if media.sha256 <> input_value->>'sha256' or media.bytes <> (input_value->>'bytes')::integer
      or media.width <> (input_value->>'width')::integer or media.height <> (input_value->>'height')::integer
      or media.alt <> input_value->>'alt' or media.synthetic <> (input_value->>'synthetic')::boolean
      then return '{"ok":false,"reason":"idempotency-conflict"}'::jsonb; end if;
    if media.status = any(array['detached','cancelled']) or media.status <> 'published' and media.expires_at <= now()
      then return '{"ok":false,"reason":"not-found"}'::jsonb; end if;
  elsif input_value->>'action' = 'reserve' then
    -- Per-owner staging cap is checked under the owner account lock.
    if (select count(*) from flowme_private.alpha_social_media_v1 where owner_id = actor
      and status = any(array['uploading','staged']) and expires_at > now()) >= 32 then return '{"ok":false,"reason":"rate-limited"}'::jsonb; end if;
    insert into flowme_private.alpha_social_media_v1(id,owner_id,request_id,object_path,sha256,bytes,width,height,alt,synthetic,status)
      values(input_value->>'id',actor,input_value->>'requestId','media/' || (input_value->>'id') || '.webp',input_value->>'sha256',
        (input_value->>'bytes')::integer,(input_value->>'width')::integer,(input_value->>'height')::integer,
        input_value->>'alt',(input_value->>'synthetic')::boolean,'uploading') returning * into media;
  else return '{"ok":false,"reason":"not-found"}'::jsonb; end if;
  if input_value->>'action' = 'ready' and media.status = 'uploading' then
    -- The Node signer verified byte hash after immutable Storage upload/readback.
    if not exists(select 1 from storage.objects o where o.bucket_id = 'flowme-alpha-social-media-v1' and o.name = media.object_path
      and o.owner_id = actor::text and o.metadata->>'mimetype' = 'image/webp'
      and (o.metadata->>'size')::bigint = media.bytes) then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
    update flowme_private.alpha_social_media_v1 set status = 'staged' where id = media.id returning * into media;
  end if;
  return jsonb_build_object('ok',true,'value',jsonb_build_object('id',media.id,'path',media.object_path,'status',media.status,
    'sha256',media.sha256,'bytes',media.bytes,'media',jsonb_build_object('id',media.id,'dataUrl','flowme-media:' || media.id,'alt',media.alt,'synthetic',media.synthetic)));
exception when others then return '{"ok":false,"reason":"unavailable"}'::jsonb;
end;
$$;
revoke all on function flowme_private.alpha_social_media_stage_v1(text,text) from public, anon, authenticated;
grant execute on function flowme_private.alpha_social_media_stage_v1(text,text) to authenticated;
create function public.flowme_alpha_social_media_stage_v1(stage_text text, proof text)
returns jsonb language sql security invoker set search_path = ''
as $$ select flowme_private.alpha_social_media_stage_v1(stage_text,proof); $$;
revoke all on function public.flowme_alpha_social_media_stage_v1(text,text) from public, anon, authenticated;
grant execute on function public.flowme_alpha_social_media_stage_v1(text,text) to authenticated;

create function flowme_private.alpha_social_media_read_v1(media_id text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare media flowme_private.alpha_social_media_v1%rowtype;
begin
  if auth.uid() is null or not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  select * into media from flowme_private.alpha_social_media_v1 where id = media_id;
  if not found or not flowme_private.alpha_social_media_access_v1(media.object_path,'read')
    then return '{"ok":false,"reason":"not-found"}'::jsonb; end if;
  return jsonb_build_object('ok',true,'value',jsonb_build_object('id',media.id,'path',media.object_path,'sha256',media.sha256,'bytes',media.bytes));
end;
$$;
revoke all on function flowme_private.alpha_social_media_read_v1(text) from public, anon, authenticated;
grant execute on function flowme_private.alpha_social_media_read_v1(text) to authenticated;
create function public.flowme_alpha_social_media_read_v1(media_id text)
returns jsonb language sql security invoker set search_path = ''
as $$ select flowme_private.alpha_social_media_read_v1(media_id); $$;
revoke all on function public.flowme_alpha_social_media_read_v1(text) from public, anon, authenticated;
grant execute on function public.flowme_alpha_social_media_read_v1(text) to authenticated;

create function flowme_private.alpha_social_media_cancel_v1(media_id text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare actor uuid := auth.uid(); media flowme_private.alpha_social_media_v1%rowtype;
begin
  if actor is null or not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  perform 1 from public.flowme_alpha_accounts where owner_id = actor for update;
  if not found then return '{"ok":false,"reason":"not-found"}'::jsonb; end if;
  perform 1 from flowme_private.alpha_social_state_v1 where id for share;
  if not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  select * into media from flowme_private.alpha_social_media_v1 where id = media_id and owner_id = actor for update;
  if not found then return '{"ok":false,"reason":"not-found"}'::jsonb; end if;
  if flowme_private.alpha_social_media_linked_v1(media.id) then return '{"ok":false,"reason":"conflict"}'::jsonb; end if;
  if media.status <> 'cancelled' then update flowme_private.alpha_social_media_v1 set status = 'cancelled' where id = media.id; end if;
  return jsonb_build_object('ok',true,'value',jsonb_build_object('id',media.id,'path',media.object_path));
end;
$$;
revoke all on function flowme_private.alpha_social_media_cancel_v1(text) from public, anon, authenticated;
grant execute on function flowme_private.alpha_social_media_cancel_v1(text) to authenticated;
create function public.flowme_alpha_social_media_cancel_v1(media_id text)
returns jsonb language sql security invoker set search_path = ''
as $$ select flowme_private.alpha_social_media_cancel_v1(media_id); $$;
revoke all on function public.flowme_alpha_social_media_cancel_v1(text) from public, anon, authenticated;
grant execute on function public.flowme_alpha_social_media_cancel_v1(text) to authenticated;

-- Called inside social execute AFTER all no-op/rate/shape checks and BEFORE writes.
-- Returns false before mutation, or raises on an unexpected mutation failure so
-- the caller's exception block rolls back all participating rows.
create function flowme_private.alpha_social_media_commit_v1(before_repository jsonb, after_repository jsonb, alias_value text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare post_value jsonb; media_value jsonb; media flowme_private.alpha_social_media_v1%rowtype; post_owner uuid;
begin
  if auth.uid() is null or not flowme_private.live_session_v1() then return false; end if;
  for post_value in select * from jsonb_array_elements(after_repository->'posts') loop
    if post_value->'deleted' = 'true'::jsonb then
      if post_value->'media' is distinct from '[]'::jsonb then return false; end if;
      continue;
    end if;
    if jsonb_typeof(post_value->'media') is distinct from 'array' or jsonb_array_length(post_value->'media') > 4 then return false; end if;
    select owner_id into post_owner from flowme_private.alpha_social_identities_v1 where public_actor_id = post_value->>'authorId';
    if post_owner is null then return false; end if;
    for media_value in select * from jsonb_array_elements(post_value->'media') loop
      if jsonb_typeof(media_value) is distinct from 'object' or (select count(*) from jsonb_object_keys(media_value)) <> 4
        or not (media_value ?& array['id','dataUrl','alt','synthetic'])
        or jsonb_typeof(media_value->'alt') is distinct from 'string' or length(media_value->>'alt') not between 1 and 500
        or btrim(media_value->>'alt') = ''
        or media_value->>'dataUrl' is distinct from 'flowme-media:' || (media_value->>'id') then return false; end if;
      select * into media from flowme_private.alpha_social_media_v1 where id = media_value->>'id' for update;
      if not found or media.owner_id <> post_owner
        or to_jsonb(media.synthetic) is distinct from media_value->'synthetic'
        or not (media.status = 'published' or media.status = 'staged' and media.expires_at > now()) then return false; end if;
    end loop;
  end loop;
  update flowme_private.alpha_social_media_v1 m set status = 'published'
    where m.status = 'staged' and exists(select 1 from jsonb_array_elements(after_repository->'posts') p,
      lateral jsonb_array_elements(p->'media') image where p->'deleted' = 'false'::jsonb and image->>'id' = m.id);
  update flowme_private.alpha_social_media_v1 m set status = 'detached'
    where m.status = 'published' and not exists(select 1 from jsonb_array_elements(after_repository->'posts') p,
      lateral jsonb_array_elements(p->'media') image where p->'deleted' = 'false'::jsonb and image->>'id' = m.id);
  return true;
end;
$$;
revoke all on function flowme_private.alpha_social_media_commit_v1(jsonb,jsonb,text) from public, anon, authenticated;
