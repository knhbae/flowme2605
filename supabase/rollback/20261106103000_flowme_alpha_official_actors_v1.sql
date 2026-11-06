-- NOT RUN. Removes only the new official marker RPC/table, including any marker
-- rows an operator may add later. Existing identities, context and public rows stay.
-- Default RESTRICT behavior must stop rollback if unexpected dependants exist.
begin;
drop function public.flowme_alpha_official_actors_v1();
drop table flowme_private.alpha_official_identities_v1;
notify pgrst, 'reload schema';
commit;
