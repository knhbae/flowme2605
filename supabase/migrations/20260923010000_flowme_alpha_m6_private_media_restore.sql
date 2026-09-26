-- DEV-only. Private restored bytes share the account SQL transaction; no Storage mutation.
create table flowme_private.alpha_preserved_media_v1 (
 owner_id uuid not null references auth.users(id), media_id text not null,
 sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'), mime text not null check (mime='image/webp'),
 bytes integer not null check (bytes between 1 and 2000000), content bytea not null,
 restored_request_id text not null, primary key(owner_id,media_id),
 check(media_id ~ '^media-[0-9a-f-]{36}$'), check(octet_length(content)=bytes),
 check(encode(extensions.digest(content,'sha256'),'hex')=sha256)
);
alter table flowme_private.alpha_preserved_media_v1 enable row level security;
alter table flowme_private.alpha_preserved_media_v1 force row level security;
revoke all on flowme_private.alpha_preserved_media_v1 from public,anon,authenticated;

create function flowme_private.alpha_private_media_referenced_v1(space jsonb, media_id text)
returns boolean language sql immutable set search_path='' as $$
 select jsonb_path_exists(space,'$.participationDrafts[*].media[*] ? (@.id == $id && @.dataUrl == $url)',jsonb_build_object('id',media_id,'url','flowme-media:'||media_id));
$$;
revoke all on function flowme_private.alpha_private_media_referenced_v1(jsonb,text) from public,anon,authenticated;

create function flowme_private.flowme_alpha_preserved_media_read_v1(media_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); entry flowme_private.alpha_preserved_media_v1%rowtype; space jsonb;
begin
 if actor is null or not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'; end if;
 select account->'space' into space from public.flowme_alpha_accounts where owner_id=actor;
 if not coalesce(flowme_private.alpha_private_media_referenced_v1(space,media_id),false) then return '{"ok":false,"reason":"not-found"}'; end if;
 select * into entry from flowme_private.alpha_preserved_media_v1 p where p.owner_id=actor and p.media_id=flowme_alpha_preserved_media_read_v1.media_id;
 if not found then return '{"ok":false,"reason":"not-found"}'; end if;
 if not exists(select 1 from flowme_private.alpha_social_media_v1 m where m.id=entry.media_id and m.owner_id=actor and m.status in ('uploading','staged','published') and m.sha256=entry.sha256 and m.bytes=entry.bytes) then return '{"ok":false,"reason":"not-found"}'; end if;
 return jsonb_build_object('ok',true,'value',jsonb_build_object('id',entry.media_id,'mime',entry.mime,'sha256',entry.sha256,'bytes',entry.bytes,'base64',replace(encode(entry.content,'base64'),E'\n','')));
end; $$;
revoke all on function flowme_private.flowme_alpha_preserved_media_read_v1(text) from public,anon,authenticated;
grant execute on function flowme_private.flowme_alpha_preserved_media_read_v1(text) to authenticated;
create function public.flowme_alpha_preserved_media_read_v1(media_id text)
returns jsonb language sql security invoker set search_path='' as $$ select flowme_private.flowme_alpha_preserved_media_read_v1(media_id); $$;
revoke all on function public.flowme_alpha_preserved_media_read_v1(text) from public,anon,authenticated;
grant execute on function public.flowme_alpha_preserved_media_read_v1(text) to authenticated;

-- Read-only eligibility also runs during preview. It grants no upload capability.
create function flowme_private.flowme_alpha_preserved_media_check_v1(check_text text, proof text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); signing_key bytea; input jsonb; file jsonb; media flowme_private.alpha_social_media_v1%rowtype;
begin
 if actor is null or not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'; end if;
 select secret_key into signing_key from flowme_private.alpha_command_signing_keys_v1 where id;
 if check_text is null or octet_length(check_text)>30000000 or signing_key is null or proof is null or proof<>encode(extensions.hmac(convert_to(actor::text||E'\n'||check_text,'UTF8'),signing_key,'sha256'),'hex') then return '{"ok":false,"reason":"invalid"}'; end if;
 input:=check_text::jsonb;
 if input->>'schema' is distinct from 'flowme-alpha-private-media-check/1' or jsonb_typeof(input->'files') is distinct from 'array' or jsonb_array_length(input->'files')>512 then return '{"ok":false,"reason":"invalid"}'; end if;
 for file in select value from jsonb_array_elements(input->'files') loop
  select * into media from flowme_private.alpha_social_media_v1 where id=file->>'id';
  if not found or media.owner_id<>actor or media.status not in ('uploading','staged','published') or media.sha256 is distinct from file->>'sha256' or media.bytes::text is distinct from file->>'bytes' or file->>'mime' is distinct from 'image/webp' then return '{"ok":false,"reason":"missing-file"}'; end if;
 end loop;
 return '{"ok":true,"value":true}';
exception when invalid_text_representation then return '{"ok":false,"reason":"invalid"}';
end; $$;
revoke all on function flowme_private.flowme_alpha_preserved_media_check_v1(text,text) from public,anon,authenticated;
grant execute on function flowme_private.flowme_alpha_preserved_media_check_v1(text,text) to authenticated;
create function public.flowme_alpha_preserved_media_check_v1(check_text text, proof text)
returns jsonb language sql security invoker set search_path='' as $$ select flowme_private.flowme_alpha_preserved_media_check_v1(check_text,proof); $$;
revoke all on function public.flowme_alpha_preserved_media_check_v1(text,text) from public,anon,authenticated;
grant execute on function public.flowme_alpha_preserved_media_check_v1(text,text) to authenticated;

create function flowme_private.flowme_alpha_preservation_execute_v2(commit_text text, proof text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); signing_key bytea; input jsonb; cmd jsonb; file jsonb; before_account jsonb;
 public_revision bigint; checked jsonb; old_result jsonb; legacy_text text; check_text text; payload bytea; receipt jsonb;
 operation flowme_private.alpha_operations_v1%rowtype; changed_bytes boolean:=false;
begin
 if actor is null or not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'; end if;
 select secret_key into signing_key from flowme_private.alpha_command_signing_keys_v1 where id;
 if commit_text is null or octet_length(commit_text)>30000000 or signing_key is null or proof is null or proof<>encode(extensions.hmac(convert_to(actor::text||E'\n'||commit_text,'UTF8'),signing_key,'sha256'),'hex') then return '{"ok":false,"reason":"invalid"}'; end if;
 input:=commit_text::jsonb; cmd:=input->'command';
 if input->>'schema' is distinct from 'flowme-alpha-preservation-commit/2' or not(input ?& array['schema','command','space','archive','files']) or (select count(*) from jsonb_object_keys(input))<>5 or jsonb_typeof(input->'files') is distinct from 'array' or jsonb_array_length(input->'files')>512 then return '{"ok":false,"reason":"invalid"}'; end if;
 -- All validation and row locks precede the first write.
 select account into before_account from public.flowme_alpha_accounts where owner_id=actor for update;
 select revision into public_revision from flowme_private.alpha_social_state_v1 where id for share;
 if before_account is null then return '{"ok":false,"reason":"not-found"}'; end if;
 select * into operation from flowme_private.alpha_operations_v1 where owner_id=actor and request_id=cmd->>'requestId';
 if found then
  if operation.command=cmd then return jsonb_build_object('ok',true,'value',operation.receipt); end if;
  return '{"ok":false,"reason":"idempotency-conflict"}';
 end if;
 if jsonb_array_length(input->'files')>0 and cmd->>'mode' is distinct from 'restore' then return '{"ok":false,"reason":"invalid"}'; end if;
 if (select count(distinct f->>'id') from jsonb_array_elements(input->'files') f)<>jsonb_array_length(input->'files') then return '{"ok":false,"reason":"invalid"}'; end if;
 check_text:=jsonb_build_object('schema','flowme-alpha-private-media-check/1','files',input->'files')::text;
 checked:=public.flowme_alpha_preserved_media_check_v1(check_text,encode(extensions.hmac(convert_to(actor::text||E'\n'||check_text,'UTF8'),signing_key,'sha256'),'hex'));
 if checked->>'ok'<>'true' then return checked; end if;
 for file in select value from jsonb_array_elements(input->'files') loop
  if not coalesce(flowme_private.alpha_private_media_referenced_v1(input->'space',file->>'id'),false) or not(file ?& array['id','mime','bytes','sha256','base64']) or (select count(*) from jsonb_object_keys(file))<>5 then return '{"ok":false,"reason":"invalid"}'; end if;
  payload:=decode(file->>'base64','base64');
  if octet_length(payload)::text is distinct from file->>'bytes' or encode(extensions.digest(payload,'sha256'),'hex') is distinct from file->>'sha256' then return '{"ok":false,"reason":"invalid"}'; end if;
  if exists(select 1 from flowme_private.alpha_preserved_media_v1 p where p.owner_id=actor and p.media_id=file->>'id' and (p.sha256<>file->>'sha256' or p.content<>payload)) then return '{"ok":false,"reason":"invalid"}'; end if;
  changed_bytes:=changed_bytes or not exists(select 1 from flowme_private.alpha_preserved_media_v1 p where p.owner_id=actor and p.media_id=file->>'id');
 end loop;
 if (select coalesce(sum(p.bytes),0) from flowme_private.alpha_preserved_media_v1 p where p.owner_id=actor)
  +(select coalesce(sum((f->>'bytes')::bigint),0) from jsonb_array_elements(input->'files') f where not exists(select 1 from flowme_private.alpha_preserved_media_v1 p where p.owner_id=actor and p.media_id=f->>'id'))>30000000 then return '{"ok":false,"reason":"limit"}'; end if;
 legacy_text:=jsonb_set(input-'files','{schema}','"flowme-alpha-preservation-commit/1"')::text;
 old_result:=flowme_private.alpha_preservation_execute_v1(legacy_text,encode(extensions.hmac(convert_to(actor::text||E'\n'||legacy_text,'UTF8'),signing_key,'sha256'),'hex'));
 if old_result->>'ok'='true' then receipt:=old_result->'value';
 elsif old_result->>'reason'='no-change' and changed_bytes then
  -- v1 has already checked the complete command, CAS, session and source hash.
  if (before_account->>'revision')::bigint>=9007199254740991 then return '{"ok":false,"reason":"invalid"}'; end if;
  if not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'; end if;
  receipt:=jsonb_build_object('requestId',cmd->>'requestId','revision',(before_account->>'revision')::bigint+1,'changed',true,'kind','preservation','publicRevision',public_revision);
  update public.flowme_alpha_accounts set account=jsonb_set(account,'{revision}',receipt->'revision') where owner_id=actor;
  insert into flowme_private.alpha_operations_v1(owner_id,request_id,command,receipt,inverse,undone) values(actor,cmd->>'requestId',cmd,receipt,'[]',false);
 else return old_result; end if;
 for file in select value from jsonb_array_elements(input->'files') loop
  insert into flowme_private.alpha_preserved_media_v1(owner_id,media_id,sha256,mime,bytes,content,restored_request_id)
   values(actor,file->>'id',file->>'sha256',file->>'mime',(file->>'bytes')::integer,decode(file->>'base64','base64'),cmd->>'requestId') on conflict(owner_id,media_id) do nothing;
 end loop;
 return jsonb_build_object('ok',true,'value',receipt);
 -- Any SQL failure rolls back account, ledger and all bytes within this block.
exception when others then return '{"ok":false,"reason":"unavailable"}';
end; $$;
revoke all on function flowme_private.flowme_alpha_preservation_execute_v2(text,text) from public,anon,authenticated;
grant execute on function flowme_private.flowme_alpha_preservation_execute_v2(text,text) to authenticated;
create function public.flowme_alpha_preservation_execute_v2(commit_text text, proof text)
returns jsonb language sql security invoker set search_path='' as $$ select flowme_private.flowme_alpha_preservation_execute_v2(commit_text,proof); $$;
revoke all on function public.flowme_alpha_preservation_execute_v2(text,text) from public,anon,authenticated;
grant execute on function public.flowme_alpha_preservation_execute_v2(text,text) to authenticated;

-- Older compatible apps and Undo also cross this database boundary. Private
-- recovered bytes never become a newly public attachment; re-upload a new ID.
create function flowme_private.alpha_preserved_media_public_guard_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare post jsonb; photo jsonb;
begin
 for post in select value from jsonb_array_elements(new.repository->'posts') loop
  if post->'deleted'='true'::jsonb then continue; end if;
  for photo in select value from jsonb_array_elements(post->'media') loop
   if exists(select 1 from flowme_private.alpha_preserved_media_v1 p where p.media_id=photo->>'id')
    and not exists(select 1 from jsonb_array_elements(old.repository->'posts') prior,
     lateral jsonb_array_elements(prior->'media') image where prior->>'id'=post->>'id' and prior->'deleted'='false'::jsonb and image->>'id'=photo->>'id')
    then raise exception 'private restored photo requires re-upload'; end if;
  end loop;
 end loop;
 return new;
end; $$;
revoke all on function flowme_private.alpha_preserved_media_public_guard_v1() from public,anon,authenticated;
create trigger alpha_preserved_media_public_guard_v1 before update of repository on flowme_private.alpha_social_state_v1
 for each row execute function flowme_private.alpha_preserved_media_public_guard_v1();
