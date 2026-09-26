-- M7-2 DEV only: five frozen-source editing locators. No account/data writes.
-- Existing signed dispatcher, CAS, inverse/Undo and private field boundary remain.
create or replace function flowme_private.alpha_creator_commit_v1(value jsonb)
returns boolean language plpgsql immutable security invoker set search_path = ''
as $$
declare input_command jsonb; change jsonb; seen text[] := '{}'; field_name text;
begin
  if not flowme_private.alpha_json_v1(value) or jsonb_typeof(value) is distinct from 'object'
    or value->>'schema' is distinct from 'flowme-alpha-creator-commit/1'
    or not (value ?& array['schema','command','changes','resultId'])
    or (select count(*) from jsonb_object_keys(value)) <> 4 then return false; end if;
  input_command := value->'command';
  if jsonb_typeof(input_command) is distinct from 'object'
    or input_command->>'schema' is distinct from 'flowme-alpha-creator-command/1'
    or jsonb_typeof(input_command->'requestId') is distinct from 'string'
    or not flowme_private.alpha_identifier_v1(input_command->>'requestId',160)
    or jsonb_typeof(input_command->'expectedRevision') is distinct from 'number'
    or (input_command->>'expectedRevision')::numeric not between 0 and 9007199254740991
    or (input_command->>'expectedRevision')::numeric <> trunc((input_command->>'expectedRevision')::numeric)
    or (select count(*) from jsonb_object_keys(input_command)) <> 5
    or jsonb_typeof(value->'changes') is distinct from 'array'
    or jsonb_array_length(value->'changes') > 4
    or not (value->'resultId' = 'null'::jsonb or jsonb_typeof(value->'resultId') = 'string'
      and flowme_private.alpha_identifier_v1(value->>'resultId')) then return false; end if;
  if input_command->>'kind' = 'undo-creator' then
    return input_command ?& array['schema','requestId','expectedRevision','kind','operationId']
      and jsonb_typeof(input_command->'operationId') = 'string'
      and flowme_private.alpha_identifier_v1(input_command->>'operationId',160)
      and input_command->>'operationId' <> input_command->>'requestId'
      and value->'changes' = '[]'::jsonb and value->'resultId' = 'null'::jsonb;
  end if;
  if input_command->>'kind' is distinct from 'creator'
    or not (input_command ?& array['schema','requestId','expectedRevision','kind','intent'])
    or jsonb_typeof(input_command->'intent') is distinct from 'object'
    or jsonb_typeof(input_command#>'{intent,type}') is distinct from 'string'
    or jsonb_typeof(input_command#>'{intent,now}') is distinct from 'string'
    or input_command#>>'{intent,type}' <> all(array['working','library-action','native-operation','source-stage',
      'source-transition','source-upgrade','history-restore','raw-handoff','native-handoff','native-lineage','raw-update','catalog-content-import','catalog-library-import'])
    then return false; end if;
  if input_command#>>'{intent,type}' = 'catalog-content-import' then
    if not (input_command->'intent' ?& array['type','now','draftId','sourceSlug','sourceVersionId'])
      or (select count(*) from jsonb_object_keys(input_command->'intent')) <> 5
      or jsonb_typeof(input_command#>'{intent,draftId}') is distinct from 'string'
      or not flowme_private.alpha_identifier_v1(input_command#>>'{intent,draftId}')
      or jsonb_typeof(input_command#>'{intent,sourceVersionId}') is distinct from 'string'
      or not flowme_private.alpha_identifier_v1(input_command#>>'{intent,sourceVersionId}')
      or input_command#>>'{intent,sourceSlug}' <> all(array['moving-d30-basic','chiangmai-solo-trip-packing',
        'closet-organize-1day','kitchen-reset-organize','travel-packing-list','portfolio-4week','blog-youtube-start'])
      or jsonb_typeof(input_command#>'{intent,sourceSlug}') is distinct from 'string'
      or exists (select 1 from jsonb_array_elements(value->'changes') c where c->>'field' is distinct from 'creatorWorkspace')
      then return false; end if;
  end if;
  if input_command#>>'{intent,type}' = 'catalog-library-import' then
    if not (input_command->'intent' ?& array['type','now','catalogVersion'])
      or (select count(*) from jsonb_object_keys(input_command->'intent')) <> 3
      or jsonb_typeof(input_command#>'{intent,catalogVersion}') is distinct from 'string'
      or not flowme_private.alpha_identifier_v1(input_command#>>'{intent,catalogVersion}')
      or exists(select 1 from jsonb_array_elements(value->'changes') c where c->>'field' is distinct from 'catalogLibrary'
        or c->'present' is distinct from 'true'::jsonb
        or c#>>'{value,schema}' is distinct from 'flowme-private-catalog-library/1'
        or c#>>'{value,catalogVersion}' is distinct from input_command#>>'{intent,catalogVersion}')
      then return false; end if;
  elsif exists(select 1 from jsonb_array_elements(value->'changes') c where c->>'field' = 'catalogLibrary')
    then return false;
  end if;
  -- The signed server dispatcher validates the complete semantic intent and
  -- full M1 domain; SQL independently rejects fields outside this M4 boundary.
  for change in select * from jsonb_array_elements(value->'changes') loop
    if jsonb_typeof(change) is distinct from 'object' or jsonb_typeof(change->'field') is distinct from 'string'
      or jsonb_typeof(change->'present') is distinct from 'boolean' then return false; end if;
    field_name := change->>'field';
    if field_name <> all(array['creatorWorkspace','text','archivedDocumentIds','retentionDocuments','catalogLibrary'])
      or field_name = any(seen) then return false; end if;
    seen := array_append(seen,field_name);
    if change->'present' = 'true'::jsonb then
      if not (change ?& array['field','present','value']) or (select count(*) from jsonb_object_keys(change)) <> 3 then return false; end if;
    elsif (select count(*) from jsonb_object_keys(change)) <> 2
      or field_name = any(array['text','archivedDocumentIds']) then return false;
    end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;

revoke all on function flowme_private.alpha_creator_commit_v1(jsonb) from public, anon, authenticated;
