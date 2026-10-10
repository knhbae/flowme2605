-- DEV creator transaction only. The final account CHECK exceeded 20s for the
-- original 14-row OPIC handoff even after equivalent JSON validation tuning.
-- Retain all checks, proof, CAS, history and grants; never remove a timeout.
alter function public.flowme_alpha_creator_execute_v1(text,text)
  set statement_timeout = '30s';
notify pgrst, 'reload schema';
