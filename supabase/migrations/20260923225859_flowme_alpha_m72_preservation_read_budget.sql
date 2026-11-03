-- DEV signed preservation reads may include the complete bounded 30 MB snapshot.
-- 20s DB read budget remains below the existing 30s BFF upstream deadline.
-- No writer, authentication timeout, byte limit, function body or grant changes.
alter function public.flowme_alpha_preservation_read_v1(text,text)
  set statement_timeout = '20s';
