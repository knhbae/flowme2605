-- DEV validation cost fix: retain every byte/depth/key check and existing ACL.
-- Native strict JSONPath avoids recursive CTE working-table materialization.
create or replace function flowme_private.alpha_json_v1(value jsonb)
returns boolean language sql immutable security invoker set search_path = ''
as $$
  select value is not null and octet_length(value::text) <= 30000000
    and jsonb_path_exists(value, 'strict $.**{121}') is false
    and jsonb_path_exists(value, 'strict $.**{0 to 120} ? (@.type() == "object") ? (exists(@."__proto__") || exists(@."prototype") || exists(@."constructor"))') is false;
$$;
