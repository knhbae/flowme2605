-- DEV account validation cost fix. No body, checks, ACL or global settings change.
-- Large JSON parameters must not be repeatedly folded into custom plans.
-- This setting is scoped to the validator call and restored when it returns.
alter function flowme_private.alpha_account_shape_v1(jsonb, uuid)
  set plan_cache_mode = 'force_generic_plan';
