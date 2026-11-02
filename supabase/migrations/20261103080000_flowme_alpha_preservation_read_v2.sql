-- Preservation read v2 (2026-11-03). NOT APPLIED. Applying it is a DB change; it waits for the user's confirmation.
-- Design: D:/flowme-claude-scratch/inbox/storage-b-2-20261103-0703.md, backup plan 1.
--
-- Additive, next to alpha_preservation_read_v1, which stays as it is so N6 keeps working:
--   mode 'state'  -> {account, context, importArchives} with operations []. Preview, import and restore
--                    never use the journal, so a large journal no longer blocks them.
--   mode 'backup' -> every journal row of the owner. Bodies (command, inverse) only for the newest
--                    contiguous rows within 200 rows and 5,000,000 bytes; every older row is a head:
--                    command {schema:'flowme-alpha-command-head/1', kind, requestId, expectedRevision,
--                    commandStoredBytes, inverseStoredBytes} and inverse []. Heads read only receipt,
--                    request_id and pg_column_size, so old bodies are never detoasted.
-- Both modes keep v1's signature check, live-session checks, owner/shared locks
-- (alpha_social_read_internal_v1) and the 30,000,000-byte reply bound.
-- No table, column, row, index, policy or existing grant changes.
--
-- Written against the repository originals (3e5d3a3a: M5 social read, M6 preservation read) and the
-- live alpha_preservation_read_v1 definition read on 2026-11-03 (same body).
-- Grants follow the read probe v2 migration: revoked from public, anon, authenticated and service_role,
-- then granted back to authenticated alone.

create function flowme_private.alpha_preservation_read_v2(read_text text, proof text)
returns jsonb language plpgsql security definer set search_path = '' set plan_cache_mode = 'force_generic_plan'
as $$
declare actor uuid := auth.uid(); signing_key bytea; input_value jsonb; read_mode text; paired jsonb;
  paired_bytes bigint; archive_bytes bigint; operation_values jsonb := '[]'::jsonb; archive_values jsonb;
  body_ids text[] := '{}'; total_rows bigint; body_rows bigint := 0; from_revision bigint; to_revision bigint;
begin
  if actor is null or not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  if read_text is null or octet_length(read_text) > 2000 or proof is null or proof !~ '^[0-9a-f]{64}$'
    then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  begin input_value := read_text::jsonb; exception when others then return '{"ok":false,"reason":"invalid"}'::jsonb; end;
  if input_value is distinct from '{"schema":"flowme-alpha-preservation-read/2","mode":"state"}'::jsonb
    and input_value is distinct from '{"schema":"flowme-alpha-preservation-read/2","mode":"backup"}'::jsonb
    then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  read_mode := input_value->>'mode';
  select secret_key into signing_key from flowme_private.alpha_command_signing_keys_v1 where id;
  if signing_key is null then return '{"ok":false,"reason":"unavailable"}'::jsonb; end if;
  if proof <> encode(extensions.hmac(convert_to(actor::text || E'\n' || read_text,'UTF8'),signing_key,'sha256'),'hex')
    then return '{"ok":false,"reason":"invalid"}'::jsonb; end if;
  -- Helper locks account then shared and filters proposal visibility. All account
  -- writers use the same owner lock, preserving this journal/archive snapshot.
  paired := flowme_private.alpha_social_read_internal_v1(false);
  if paired->'ok' is distinct from 'true'::jsonb then return paired; end if;
  -- Bound archives before jsonb_agg allocates them, exactly as v1 does.
  paired_bytes := octet_length((paired->'value')::text)::bigint;
  select coalesce(sum(octet_length(to_jsonb(a)::text)::bigint + 2),0) into archive_bytes
    from flowme_private.alpha_preservation_archives_v1 a where a.owner_id = actor;
  if paired_bytes + 128 + archive_bytes > 30000000 then return '{"ok":false,"reason":"limit"}'::jsonb; end if;
  select count(*), max((o.receipt->>'revision')::bigint) into total_rows, to_revision
    from flowme_private.alpha_operations_v1 o where o.owner_id = actor;
  if read_mode = 'backup' then
    -- Only the 200 newest rows are detoasted to measure them. Running sums are
    -- monotonic, so the kept rows are always the newest contiguous window.
    with ranked as (
      select o.request_id, row_number() over (order by (o.receipt->>'revision')::bigint desc, o.request_id desc) as position
      from flowme_private.alpha_operations_v1 o where o.owner_id = actor
    ), sized as (
      select r.request_id, r.position, octet_length(to_jsonb(o)::text)::bigint + 2 as bytes
      from ranked r join flowme_private.alpha_operations_v1 o on o.owner_id = actor and o.request_id = r.request_id
      where r.position <= 200
    ), running as (
      select request_id, sum(bytes) over (order by position) as used from sized
    )
    select coalesce(array_agg(request_id),'{}') into body_ids from running where used <= 5000000;
    body_rows := cardinality(body_ids);
    select min((o.receipt->>'revision')::bigint) into from_revision
      from flowme_private.alpha_operations_v1 o where o.owner_id = actor and o.request_id = any(body_ids);
    select coalesce(jsonb_agg(case when o.request_id = any(body_ids)
        then jsonb_build_object('owner_id',o.owner_id,'request_id',o.request_id,'command',o.command,
          'receipt',o.receipt,'inverse',o.inverse,'undone',o.undone)
        else jsonb_build_object('owner_id',o.owner_id,'request_id',o.request_id,
          'command',jsonb_build_object('schema','flowme-alpha-command-head/1','kind',o.receipt->>'kind',
            'requestId',o.request_id,'expectedRevision',(o.receipt->>'revision')::bigint - 1,
            'commandStoredBytes',pg_column_size(o.command),'inverseStoredBytes',pg_column_size(o.inverse)),
          'receipt',o.receipt,'inverse','[]'::jsonb,'undone',o.undone) end
      order by (o.receipt->>'revision')::bigint,o.request_id),'[]'::jsonb)
      into operation_values from flowme_private.alpha_operations_v1 o where o.owner_id = actor;
    if paired_bytes + 128 + archive_bytes + octet_length(operation_values::text)::bigint > 30000000
      then return '{"ok":false,"reason":"limit"}'::jsonb; end if;
  end if;
  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at,a.source_sha256),'[]'::jsonb)
    into archive_values from flowme_private.alpha_preservation_archives_v1 a where a.owner_id = actor;
  if not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  return jsonb_build_object('ok',true,'value',(paired->'value') ||
    jsonb_build_object('operations',operation_values,'importArchives',archive_values,
      'history',jsonb_build_object('schema','flowme-alpha-preservation-history/1','mode',read_mode,
        'totalRows',total_rows,'bodyRows',body_rows,'fromRevision',from_revision,'toRevision',to_revision)));
end;
$$;
revoke all on function flowme_private.alpha_preservation_read_v2(text,text) from public, anon, authenticated, service_role;
grant execute on function flowme_private.alpha_preservation_read_v2(text,text) to authenticated;

create function public.flowme_alpha_preservation_read_v2(read_text text, proof text)
returns jsonb language sql security invoker set search_path = '' set statement_timeout = '20s'
as $$ select flowme_private.alpha_preservation_read_v2(read_text,proof); $$;
revoke all on function public.flowme_alpha_preservation_read_v2(text,text) from public, anon, authenticated, service_role;
grant execute on function public.flowme_alpha_preservation_read_v2(text,text) to authenticated;

notify pgrst, 'reload schema';
