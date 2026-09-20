import test from 'node:test';
import assert from 'node:assert/strict';
import {createProgramCreatorStructure,reduceProgramCreatorStructure,prepareProgramCreatorStructure} from './creator-structure-sidecar';
import {validateProgramCreatorStructureSidecar,validateProgramCreatorStructureSidecars} from './creator-structure-validation';
const now='2026-09-12T18:20:00.000Z';
function fixture(){const r=createProgramCreatorStructure({draftId:'creator',templateId:'travel-itinerary-prep-v1',rawText:'',now});if(!r.ok)assert.fail(r.reason);return r.value;}
test('incomplete form and temporary invalid IANA timezone/URL survive storage while materialize is blocked',()=>{
  const s=fixture();assert(validateProgramCreatorStructureSidecar(s));const r=reduceProgramCreatorStructure(s,{type:'set_value',scopeInstanceId:'root',slotId:'timezone',value:'Asia/'},now);assert(r.ok);assert(validateProgramCreatorStructureSidecar(r.value));assert.equal(prepareProgramCreatorStructure(r.value,{draftId:'creator',rawText:'',now}).ok,false);
  assert(validateProgramCreatorStructureSidecars({creator:r.value},['creator']));assert.equal(validateProgramCreatorStructureSidecars({other:r.value}),false);
});
test('unknown payload, foreign identity, duplicate groups/scopes, broken version and source associations fail closed',()=>{
  const s=fixture();for(const patch of [null,{...s,extra:{private:'hidden'}},{...s,catalogVersion:'next'},{...s,draft:{...s.draft,schemaVersion:'new'}},{...s,draft:{...s.draft,extra:true}},{...s,draft:{...s.draft,values:{unknown:'x'}}},{...s,draft:{...s.draft,values:{flow_title:{private:'x'}}}},{...s,draft:{...s.draft,groups:[...s.draft.groups,s.draft.groups[0]]}},{...s,draft:{...s.draft,dismissedSlots:[{scopeInstanceId:'foreign',slotId:'flow_title'}]}},{...s,materialization:{transactionId:'x',beforeSourceFingerprint:s.draft.sourceFingerprint,afterSourceFingerprint:'x'}},{...s,draft:{...s.draft,revision:NaN}}])assert.equal(validateProgramCreatorStructureSidecar(patch),false);
  assert.equal(validateProgramCreatorStructureSidecar(s,'foreign'),false);assert.equal(validateProgramCreatorStructureSidecars({creator:s},[]),false);
});
