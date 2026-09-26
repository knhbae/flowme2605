-- DEV JSON validation cost fix; byte/depth/key acceptance and existing ACL unchanged.
-- Preserve JSONB byte/depth/key semantics while excluding scalar leaves from
-- the recursive working table (large source strings need not be materialized).
create or replace function flowme_private.alpha_json_v1(value jsonb)
returns boolean language sql immutable security invoker set search_path = ''
as $$
  with recursive containers(value, depth) as (
    select value, 0
    union all
    select child.value, parent.depth + 1
    from containers parent cross join lateral (
      select value from jsonb_each(case when jsonb_typeof(parent.value) = 'object' then parent.value else '{}'::jsonb end)
      union all
      select value from jsonb_array_elements(case when jsonb_typeof(parent.value) = 'array' then parent.value else '[]'::jsonb end)
    ) child
    where parent.depth < 120 and jsonb_typeof(child.value) in ('object', 'array')
  )
  select value is not null and octet_length(value::text) <= 30000000
    and not exists (
      select 1 from containers
      where jsonb_typeof(value) = 'object' and value ?| array['__proto__', 'prototype', 'constructor']
        or depth = 120 and (jsonb_typeof(value) = 'object' and value <> '{}'::jsonb
          or jsonb_typeof(value) = 'array' and value <> '[]'::jsonb)
    );
$$;
