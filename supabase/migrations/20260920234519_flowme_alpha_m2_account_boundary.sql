-- M2 development-only boundary. CLI-generated file aligned to hosted migration version.
-- Application and deployment tooling must verify
-- project wkmzcxpnojobxrgebapw before applying. No production migration approval.
-- No legacy tables, data, auth users, or public content are modified here.
create schema if not exists flowme_private;
revoke all on schema flowme_private from public, anon, authenticated;
grant usage on schema flowme_private to authenticated;

-- The only definer is a non-exposed boolean authorization lookup. Never returns
-- session/user rows or accepts a target identity. Session removal revokes access
-- even while the caller still holds a cryptographically valid access token.
create function flowme_private.live_session_v1()
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null
    and coalesce(auth.jwt()->>'is_anonymous', 'false') = 'false'
    and exists (
      select 1 from auth.sessions s join auth.users u on u.id = s.user_id
      where s.user_id = auth.uid()
        and s.id::text = auth.jwt()->>'session_id'
        and (s.not_after is null or s.not_after > now())
        and u.deleted_at is null
        and (u.banned_until is null or u.banned_until <= now())
        and not coalesce(u.is_anonymous, false)
    );
$$;
revoke all on function flowme_private.live_session_v1() from public, anon, authenticated;
grant execute on function flowme_private.live_session_v1() to authenticated;

-- Versioned empty M1 contract. No caller-supplied content can enter through M2.
create function flowme_private.empty_account_v1(owner_id uuid)
returns jsonb language sql immutable strict security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'schema', 'flowme-alpha-account/1', 'ownerId', owner_id::text, 'revision', 0,
    'source', jsonb_build_object('schema', 'flowme-integrated-product-poc/1', 'actorId', owner_id::text, 'revision', 0),
    'space', $space${"text":{"version":11,"documents":[],"flows":[],"folders":[{"id":"folder-unfiled","title":"미분류","parentId":null}],"bindings":[],"taskScopes":{},"itemScopes":{},"progressRecords":[]},"archivedDocumentIds":[],"copies":[],"savedBindings":[],"draftRevisions":[],"participationDrafts":[],"publicationDrafts":[],"publications":[],"position":{"documentId":null,"lineId":null,"start":0,"end":0,"scrollTop":0},"timelineOrders":{},"legacySnapshot":null,"legacyQuickItemLines":{},"legacyTimelinePolicies":{},"retentionDocuments":{},"creatorDraftImports":[]}$space$::jsonb,
    'legacyUndo', '[]'::jsonb, 'legacyReceipts', '[]'::jsonb
  );
$$;
revoke all on function flowme_private.empty_account_v1(uuid) from public, anon, authenticated;
grant execute on function flowme_private.empty_account_v1(uuid) to authenticated;

create table public.flowme_alpha_accounts (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  account jsonb not null,
  constraint flowme_alpha_m2_empty_only check (account = flowme_private.empty_account_v1(owner_id))
);
alter table public.flowme_alpha_accounts enable row level security;
alter table public.flowme_alpha_accounts force row level security;
revoke all on table public.flowme_alpha_accounts from public, anon, authenticated;
grant select, insert on table public.flowme_alpha_accounts to authenticated;
create policy flowme_alpha_account_select on public.flowme_alpha_accounts for select to authenticated
  using (owner_id = (select auth.uid()) and (select flowme_private.live_session_v1()));
create policy flowme_alpha_account_insert on public.flowme_alpha_accounts for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select flowme_private.live_session_v1())
    and account = flowme_private.empty_account_v1((select auth.uid())));

create function public.flowme_alpha_open_account_v1()
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare account_value jsonb;
begin
  if not flowme_private.live_session_v1() then
    raise exception 'active non-anonymous session required' using errcode = '42501';
  end if;
  insert into public.flowme_alpha_accounts(owner_id, account)
    values (auth.uid(), flowme_private.empty_account_v1(auth.uid()))
    on conflict (owner_id) do nothing;
  select account into account_value from public.flowme_alpha_accounts where owner_id = auth.uid();
  if account_value is null then
    raise exception 'account unavailable' using errcode = '42501';
  end if;
  return account_value;
end;
$$;
revoke all on function public.flowme_alpha_open_account_v1() from public, anon, authenticated;
grant execute on function public.flowme_alpha_open_account_v1() to authenticated;

-- Temporary M2 validation bucket: private, 1 MiB, no executable HTML/SVG.
-- Storage API owns object bytes; never insert/delete storage.objects directly.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('flowme-alpha-private', 'flowme-alpha-private', false, 1048576,
  array['text/plain', 'image/png', 'image/jpeg']);

create policy flowme_alpha_file_select on storage.objects for select to authenticated
  using (bucket_id = 'flowme-alpha-private' and owner_id = (select auth.uid())::text
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select flowme_private.live_session_v1()));
create policy flowme_alpha_file_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'flowme-alpha-private' and owner_id = (select auth.uid())::text
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select flowme_private.live_session_v1()));
create policy flowme_alpha_file_update on storage.objects for update to authenticated
  using (bucket_id = 'flowme-alpha-private' and owner_id = (select auth.uid())::text
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select flowme_private.live_session_v1()))
  with check (bucket_id = 'flowme-alpha-private' and owner_id = (select auth.uid())::text
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select flowme_private.live_session_v1()));
create policy flowme_alpha_file_delete on storage.objects for delete to authenticated
  using (bucket_id = 'flowme-alpha-private' and owner_id = (select auth.uid())::text
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select flowme_private.live_session_v1()));
