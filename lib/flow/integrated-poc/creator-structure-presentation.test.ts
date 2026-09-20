import test from 'node:test';
import assert from 'node:assert/strict';
import { programCreatorStructureCalculations, programCreatorStructureExample, programCreatorStructureFieldVisibility, programCreatorStructureFieldLabels } from './creator-structure-presentation';
import type { StructureTemplateGroupDefinition } from '../personal-workspace-poc-structure-template/types';
import { programCreatorStructureTemplates, prepareProgramCreatorStructure } from './creator-structure-sidecar';
import { listPersonalWorkspacePocStructureTemplatePreviews } from '../personal-workspace-poc-structure-template/preview-adapter';

for (const definition of programCreatorStructureTemplates()) {
  test(`display-only example and planner calculation provenance: ${definition.templateId}`, () => {
    const before = JSON.stringify(definition), example = programCreatorStructureExample(definition);
    assert(example); assert.deepEqual(example.fields.map(row => [row.label,row.value]), definition.previewFixture.fieldExamples);
    assert.equal(example.source, (definition.previewFixture.sourcePreview as string[]).join('\n'));
    const fixture = listPersonalWorkspacePocStructureTemplatePreviews().find(entry => entry.templateId === definition.templateId)!;
    const draft = fixture.inputDraft, original = JSON.stringify(draft);
    const prepared = prepareProgramCreatorStructure({catalogVersion:fixture.catalogVersion,draft}, {draftId:draft.draftId,rawText:'',now:'2026-09-13T12:00:00Z'});
    assert(prepared.ok);
    const rows = programCreatorStructureCalculations(definition,draft,prepared.value.plan.derivedValues);
    assert.equal(rows.length,prepared.value.plan.derivedValues.length);
    assert(rows.length>0);
    rows.forEach((row,index)=>{
      const derived=prepared.value.plan.derivedValues[index];
      assert.equal(row.value,`${derived.value}${derived.kind==='recurrence_count'?'회':''}`);
      assert.equal(row.sources.length,derived.sourceSlotKeys.length);
      assert(row.sources.every(source=>!source.includes('확인할 수 없습니다')&&!source.includes('미입력')));
    });
    assert.equal(prepared.value.command.nextRawText,fixture.expectedRawText);
    assert.equal(JSON.stringify(draft),original);assert.equal(JSON.stringify(definition),before);
  });
}

test('malformed or non-synthetic examples are omitted without changing the catalog',()=>{
  const definition=programCreatorStructureTemplates()[0];
  for(const previewFixture of [{}, {...definition.previewFixture,previewOnly:false}, {...definition.previewFixture,synthetic:false},
    {...definition.previewFixture,fieldExamples:[['label',{}]]}, {...definition.previewFixture,sourcePreview:[null]}, {...definition.previewFixture,title:42}]) {
    const changed={...definition,previewFixture};const before=JSON.stringify(changed);
    assert.equal(programCreatorStructureExample(changed),null);assert.equal(JSON.stringify(changed),before);
  }
});

test('same field in repeated groups resolves exact instance and never substitutes a different value',()=>{
  const definition=programCreatorStructureTemplates().find(t=>t.templateId==='exercise-phased-4w-v1')!;
  const original=listPersonalWorkspacePocStructureTemplatePreviews().find(t=>t.templateId===definition.templateId)!.inputDraft;
  const draft=structuredClone(original),first=draft.groups[0],second=draft.groups[1];
  const rows=programCreatorStructureCalculations(definition,draft,[
    {kind:'recurrence_end',sourceSlotKeys:[`${first.instanceId}.duration_weeks`],value:'2026-09-14'},
    {kind:'recurrence_end',sourceSlotKeys:[`${second.instanceId}.duration_weeks`],value:'2026-09-28'},
    {kind:'first_occurrence',sourceSlotKeys:['missing-instance.weekdays'],value:'2026-09-15'},
  ]);
  assert.match(rows[0].sources[0],/단계 1/);assert.match(rows[1].sources[0],/단계 2/);
  assert.notEqual(rows[0].sources[0],rows[1].sources[0]);
  assert.equal(rows[2].sources[0],'계산에 사용한 입력을 확인할 수 없습니다.');
  assert(!JSON.stringify(rows).includes('missing-instance'));
});

test('every catalog conditional field follows its original mode without clearing values or hiding errors',()=>{
  const controllers:Record<string,[string,string]>={when_end_mode_until:['end_mode','until'],when_end_mode_count:['end_mode','count'],when_anchor_offset:['schedule_mode','anchor_offset'],when_departure_offset:['prep_schedule_mode','departure_offset'],when_absolute:['schedule_mode','absolute']};
  let checked=0;
  for(const definition of programCreatorStructureTemplates()){
    const draft=listPersonalWorkspacePocStructureTemplatePreviews().find(t=>t.templateId===definition.templateId)!.inputDraft;
    const groupFields=(groups:readonly StructureTemplateGroupDefinition[]):StructureTemplateGroupDefinition['fields'][number][]=>groups.flatMap(g=>[...g.fields,...groupFields(g.childGroups??[])]);
    for(const field of [...definition.setupFields,...groupFields(definition.groups)]){
      const controller=controllers[field.requiredAt];if(!controller)continue;checked++;
      const blank={...draft,values:{}};
      assert.deepEqual(programCreatorStructureFieldVisibility(field,blank,{}),{visible:false,retained:false});
      assert.deepEqual(programCreatorStructureFieldVisibility(field,blank,{},true),{visible:true,retained:false});
      for(const value of [0,-14,'2026-12-21']){
        const values={[field.slotId]:value},before=JSON.stringify(values);
        assert.deepEqual(programCreatorStructureFieldVisibility(field,blank,values),{visible:true,retained:true});assert.equal(JSON.stringify(values),before);
      }
      const values={[controller[0]]:controller[1]};
      assert.deepEqual(programCreatorStructureFieldVisibility(field,{...draft,values},values),{visible:true,retained:false});
      if(field.requiredAt==='when_absolute')assert.equal(programCreatorStructureFieldVisibility(field,blank,{prep_schedule_mode:'absolute'}).visible,true);
    }
  }
  assert.equal(checked,8);
});

test('unknown condition stays visible and error labels retain repeated group scope',()=>{
  const entry=listPersonalWorkspacePocStructureTemplatePreviews().find(t=>t.templateId==='exercise-phased-4w-v1')!,definition=programCreatorStructureTemplates().find(t=>t.templateId===entry.templateId)!;
  assert.equal(programCreatorStructureFieldVisibility({...definition.setupFields[0],requiredAt:'future_condition'},entry.inputDraft,{}).visible,true);
  const labels=programCreatorStructureFieldLabels(definition,entry.inputDraft),[one,two]=entry.inputDraft.groups;
  assert.match(labels.get(`${one.children[0].instanceId}.weekdays`)!,/단계 1/);
  assert.match(labels.get(`${two.children[0].instanceId}.weekdays`)!,/단계 2/);
  assert.notEqual(labels.get(`${one.children[0].instanceId}.weekdays`),labels.get(`${two.children[0].instanceId}.weekdays`));
  assert.equal(labels.get('missing.weekdays'),undefined);
});
