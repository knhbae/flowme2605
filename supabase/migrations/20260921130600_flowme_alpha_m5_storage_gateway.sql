-- DEV M5 compatibility: hosted authenticated downloads first authorize through
-- object.get_authenticated_info. Its renderer excludes owner/owner_id. Keep
-- the same live-session/registry check and block list/sign/copy/HEAD operations.
-- No caller-provided user metadata is accepted, including direct Storage upload.
drop policy flowme_alpha_social_media_insert_v1 on storage.objects;
create policy flowme_alpha_social_media_insert_v1 on storage.objects for insert to authenticated
  with check (bucket_id = 'flowme-alpha-social-media-v1' and owner_id = (select auth.uid())::text
    and (user_metadata is null or user_metadata = '{}'::jsonb)
    and storage.allow_only_operation('object.upload') and flowme_private.alpha_social_media_access_v1(name,'insert'));
drop policy flowme_alpha_social_media_read_v1 on storage.objects;
create policy flowme_alpha_social_media_read_v1 on storage.objects for select to authenticated
  using (bucket_id = 'flowme-alpha-social-media-v1' and (
    (storage.allow_only_operation('object.get_authenticated') or storage.allow_only_operation('object.get_authenticated_info'))
      and flowme_private.alpha_social_media_access_v1(name,'read')
    or storage.allow_only_operation('object.delete_many') and flowme_private.alpha_social_media_access_v1(name,'cleanup-select')));
