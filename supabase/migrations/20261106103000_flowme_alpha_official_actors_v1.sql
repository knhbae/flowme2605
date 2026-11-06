-- Official mark S-b A. NOT APPLIED; no account identifiers or seed rows.
-- The migration role owns the table and definer function. Client roles cannot
-- read/write the marker table; authenticated callers receive public aliases only.
-- R6 must review this new owner relation and RESTRICT FK before account deletion.
begin;

create table flowme_private.alpha_official_identities_v1 (
  owner_id pg_catalog.uuid primary key
    references flowme_private.alpha_social_identities_v1(owner_id) on delete restrict,
  created_at pg_catalog.timestamptz not null default pg_catalog.now()
);

alter table flowme_private.alpha_official_identities_v1 enable row level security;
-- Also remove a possible service_role grant inherited from default privileges.
revoke all on table flowme_private.alpha_official_identities_v1
  from public, anon, authenticated, service_role;

create function public.flowme_alpha_official_actors_v1()
returns pg_catalog.jsonb
language plpgsql stable security definer
set search_path = ''
as $official_actors$
declare
  actor_aliases pg_catalog.jsonb;
begin
  if auth.uid() is null then
    return pg_catalog.jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  select coalesce(
    pg_catalog.jsonb_agg(identity_row.public_actor_id order by identity_row.public_actor_id collate pg_catalog."C"),
    '[]'::pg_catalog.jsonb
  ) into actor_aliases
  from flowme_private.alpha_official_identities_v1 as official
  join flowme_private.alpha_social_identities_v1 as identity_row on identity_row.owner_id = official.owner_id;

  return pg_catalog.jsonb_build_object('ok', true, 'value', actor_aliases);
end;
$official_actors$;

-- Close default PUBLIC/direct grants in the same transaction as CREATE.
revoke all on function public.flowme_alpha_official_actors_v1()
  from public, anon, authenticated, service_role;
grant execute on function public.flowme_alpha_official_actors_v1() to authenticated;

notify pgrst, 'reload schema';
commit;
