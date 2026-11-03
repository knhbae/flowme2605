-- DEV preservation read planning only; no body, limits, grants or role changes.
-- Reuse plans for large paired JSON parameters; caller setting is restored.
alter function flowme_private.alpha_preservation_read_v1(text,text)
  set plan_cache_mode = 'force_generic_plan';
