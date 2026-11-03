-- DEV creator save/Undo only. PostgREST hoists this bounded function setting.
-- A 5.7 MB OPIC save hit the existing authenticated 8s timeout; no role/global
-- limit, function body, validation, signature, ACL or account row is changed.
alter function public.flowme_alpha_creator_execute_v1(text,text)
  set statement_timeout = '20s';
notify pgrst, 'reload schema';
