-- Egress probe v2 (2026-10-30). NOT APPLIED. Applying it is a DB change and needs the user's approval.
-- Design: inbox/supabase-egress-20261030-0944/server-design.md, recommendation phase 1.
--
-- Read-only additions next to social_read_v1, which stays as it is:
--   flowme_alpha_read_full_v2()  -> the same {account, context} as social_read_v1 plus two tokens
--   flowme_alpha_read_probe_v2() -> the two tokens only
-- Both come from flowme_private.alpha_read_frame_internal_v2(): one SELECT, so the snapshot, the
-- tokens and (for the full read) the payload are the same instant. No DML, no alias/account creation,
-- no social_open; the caller is auth.uid() with live_session_v1() checked before and after the read.
-- Tokens are change detectors only (string equality on the client), never a revision, CAS or proof.
--
-- Written against the repository originals M2/M3/M5 (3e5d3a3a:supabase/migrations). Whether the live
-- definitions still match them is unverified; see the check list in the report before applying.
--
-- Grants: every function is revoked from public, anon, authenticated and service_role (Supabase's default
-- privileges give service_role direct EXECUTE on new public functions); only the two private entry points
-- and the two public wrappers are granted back, to authenticated alone.

create function flowme_private.alpha_read_frame_internal_v2()
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  frame jsonb;
begin
  if actor is null or not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  with base as materialized (
    select a.owner_id is not null as has_account, a.account,
           s.id is not null as has_public, s.revision as public_revision, s.repository,
           me.public_actor_id as own_actor_id, av.actors
      from (values (true)) seed(dummy)
      left join public.flowme_alpha_accounts a on a.owner_id = actor
      left join flowme_private.alpha_social_state_v1 s on s.id = true
      left join flowme_private.alpha_social_identities_v1 me on me.owner_id = actor
      cross join lateral (
        select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('id', i.public_actor_id, 'name', i.display_name)
                 order by i.public_actor_id), '[]'::jsonb) as actors
          from flowme_private.alpha_social_identities_v1 i) av
  ), authorized as materialized (
    -- The same proposal filter as alpha_social_read_internal_v1(false) (M5:101-105).
    select b.*, pg_catalog.jsonb_build_object(
             'schema', 'flowme-alpha-social-context/1', 'revision', b.public_revision, 'ownActorId', b.own_actor_id,
             'actors', b.actors,
             'public', pg_catalog.jsonb_set(b.repository, '{proposals}', coalesce((
               select pg_catalog.jsonb_agg(p.value order by p.ordinality)
                 from pg_catalog.jsonb_array_elements(b.repository->'proposals') with ordinality p(value, ordinality)
                where p.value->>'authorId' = b.own_actor_id
                   or exists (select 1 from pg_catalog.jsonb_array_elements(b.repository->'flows') f
                               where f->>'id' = p.value->>'flowId' and f->>'ownerId' = b.own_actor_id)), '[]'::jsonb))
           ) as authorized_context
      from base b
  )
  select case
           when not v.has_account then '{"ok":false,"reason":"not-found"}'::jsonb
           when not v.has_public then '{"ok":false,"reason":"unavailable"}'::jsonb
           when v.own_actor_id is null then '{"ok":false,"reason":"initialization-required"}'::jsonb
           else pg_catalog.jsonb_build_object('ok', true, 'value', pg_catalog.jsonb_build_object(
             'schema', 'flowme-alpha-read-frame/2',
             'tokens', pg_catalog.jsonb_build_object(
               'privateToken', 'account-sha256-v2:'
                 || pg_catalog.encode(extensions.digest(pg_catalog.convert_to(v.account::text, 'UTF8'), 'sha256'), 'hex'),
               'publicToken', 'authorized-context-sha256-v2:'
                 || pg_catalog.encode(extensions.digest(pg_catalog.convert_to(v.authorized_context::text, 'UTF8'), 'sha256'), 'hex')),
             'snapshot', pg_catalog.jsonb_build_object('account', v.account, 'context', v.authorized_context)))
         end
    into frame
    from authorized v;
  -- A lock-free read may outlive logout/revocation/token expiry.
  if not flowme_private.live_session_v1() then return '{"ok":false,"reason":"unauthenticated"}'::jsonb; end if;
  return frame;
exception
  when insufficient_privilege then return '{"ok":false,"reason":"forbidden"}'::jsonb;
  when others then return '{"ok":false,"reason":"unavailable"}'::jsonb;
end;
$$;
revoke all on function flowme_private.alpha_read_frame_internal_v2() from public, anon, authenticated, service_role;

-- Tokens only: account and context never leave the database on this path.
create function flowme_private.alpha_read_probe_v2()
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare frame jsonb := flowme_private.alpha_read_frame_internal_v2();
begin
  if frame->'ok' is distinct from 'true'::jsonb then return frame; end if;
  return pg_catalog.jsonb_build_object('ok', true, 'value',
    pg_catalog.jsonb_build_object('schema', 'flowme-alpha-read-probe/2', 'tokens', frame->'value'->'tokens'));
end;
$$;
revoke all on function flowme_private.alpha_read_probe_v2() from public, anon, authenticated, service_role;
grant execute on function flowme_private.alpha_read_probe_v2() to authenticated;

create function flowme_private.alpha_read_full_v2()
returns jsonb language sql volatile security definer set search_path = ''
as $$ select flowme_private.alpha_read_frame_internal_v2(); $$;
revoke all on function flowme_private.alpha_read_full_v2() from public, anon, authenticated, service_role;
grant execute on function flowme_private.alpha_read_full_v2() to authenticated;

create function public.flowme_alpha_read_probe_v2()
returns jsonb language sql volatile security invoker set search_path = ''
as $$ select flowme_private.alpha_read_probe_v2(); $$;
revoke all on function public.flowme_alpha_read_probe_v2() from public, anon, authenticated, service_role;
grant execute on function public.flowme_alpha_read_probe_v2() to authenticated;

create function public.flowme_alpha_read_full_v2()
returns jsonb language sql volatile security invoker set search_path = ''
as $$ select flowme_private.alpha_read_full_v2(); $$;
revoke all on function public.flowme_alpha_read_full_v2() from public, anon, authenticated, service_role;
grant execute on function public.flowme_alpha_read_full_v2() to authenticated;
