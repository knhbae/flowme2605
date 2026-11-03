import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createTextAuthoringDocument} from './native-creator-vendor/text-authoring/parser';
import {applyAuthoringOperation} from './native-creator-vendor/text-authoring/operations';
import {buildAuthoringArtifactProjection as pinned} from './native-creator-vendor/text-authoring/artifact-projection';
import {buildProgramAuthoringArtifactProjection as project} from './native-creator-projection';
import {createNativeCreatorDocumentOwner,readNativeCreatorDocument} from './native-creator-document';
import {programNativeExecutionItemFacts} from './creator-native-execution-facts';
import {buildCatalogContentV3Candidate,CATALOG_CONTENT_V3_CANDIDATE_SLUGS} from './catalog-content-source';

const NOW='2026-09-24T00:00:00.000Z';
const RAW='# 기준일 검사\n- [ ] 전날\n  - 상대 날짜: D-1\n- [ ] 당일\n  - 상대 날짜: D+0\n- [ ] 다음날\n  - 상대 날짜: D+1\n- [ ] 고정\n  - 날짜: 2026-10-01\n- [ ] 미정';
const document=(raw=RAW)=>createTextAuthoringDocument(raw,{documentId:'anchor-test',ownership:'creator',now:NOW});
function owner(raw=RAW){const doc=document(raw);const result=createNativeCreatorDocumentOwner({id:'anchor-owner',source:{storageKey:'flow:text-authoring:drafts:v1',draftId:'anchor-source',versionId:'1',revisionId:doc.revision.revisionId,documentJson:JSON.stringify(doc)}},NOW);assert(result.ok);return result.owner;}

test('projection v2 is an exactly tracked derivative; pinned source hash is unchanged',()=>{
 const manifest=JSON.parse(readFileSync(new URL('./native-creator-projection.manifest.json',import.meta.url),'utf8'));
 const bytes=readFileSync(new URL(manifest.source,import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.sourceSha256);
 let expected=bytes.toString('utf8').replace(/\r\n/g,'\n').trimEnd();
 for(const delta of manifest.changes){assert(expected.includes(delta.from));expected=expected.replaceAll(delta.from,delta.to);}
 const actual=readFileSync(new URL(manifest.derived,import.meta.url),'utf8').replace(/\r\n/g,'\n').trimEnd();
 assert.equal(actual,manifest.header+expected);
});

test('no personal anchor keeps full pinned output, not just calendar rows',()=>{
 for(const raw of [RAW,RAW.replace('# 기준일 검사','# 기준일 검사\n- 기준일: 2026-09-30'),'# 반복\n- [ ] 일\n  - 날짜: 2026-09-20\n  - 반복: 매일\n  - 반복 종료: 3회','# 안내\n그대로 보존할 원문']){
  const doc=document(raw),before=JSON.stringify(doc);
  for(const options of [{},{primaryArtifact:'calendar' as const},{finiteOccurrenceLimit:2,openEndedOccurrenceWeeks:8}])assert.deepEqual(project(doc,options),pinned(doc,options));
  assert.equal(JSON.stringify(doc),before);
 }
});

test('explicit personal anchor wins over raw header; clear restores source behavior without a write',()=>{
 const initial=owner(RAW.replace('# 기준일 검사','# 기준일 검사\n- 기준일: 2026-09-30')),before=JSON.stringify(initial);
 const result=readNativeCreatorDocument(initial,{anchor:'2028-02-28'});assert(result.ok);
 assert.equal(result.projection.artifacts.calendar.rows.find(row=>row.title==='당일')?.date,'2028-02-28');
 assert.equal(result.projection.artifacts.calendar.rows.find(row=>row.title==='고정')?.date,'2026-10-01');
 const cleared=readNativeCreatorDocument(initial);assert(cleared.ok);
 assert.deepEqual(cleared.projection,pinned(initial.document));assert.deepEqual(result.document,initial.document);
 assert.equal(JSON.stringify(initial),before);
});

test('negative/zero/positive offsets match execution at month/year/leap boundaries across all views',()=>{
 const initial=owner(),before=JSON.stringify(initial);
 for(const anchor of ['2026-12-31','2027-03-01','2028-02-28','2028-02-29']){
  const result=readNativeCreatorDocument(initial,{anchor});assert(result.ok);const p=result.projection;
  for(const item of initial.document.parseResult.canonical.items){
   const expected=programNativeExecutionItemFacts(item,anchor).date;
   for(const kind of ['calendar','todo','sheet','memo'] as const){const row=p.artifacts[kind].rows.find(row=>row.itemId===item.itemId);if(row)assert.equal(row.date??null,expected,`${kind}:${item.title}`);}
   if(expected)assert.equal(p.artifacts.calendar.rows.find(row=>row.itemId===item.itemId)?.date,expected);
  }
  assert.equal(p.artifacts.calendar.count,4);assert.equal(p.counts.dated,4);assert.equal(p.sourceMutationCount,0);
  assert.equal(p.artifacts.calendar.losses.some(loss=>loss.reason==='relative_anchor_required'),false);
  assert(p.artifacts.calendar.losses.some(loss=>loss.reason==='undated_item'));
 }
 assert.equal(JSON.stringify(initial),before);
});

test('invalid anchors fail closed and do not fall back to a source header or mutate it',()=>{
 const initial=owner(RAW.replace('# 기준일 검사','# 기준일 검사\n- 기준일: 2026-09-30')),before=JSON.stringify(initial);
 for(const anchor of ['','2026-02-29','2028-02-30','not-a-date']){
  assert.deepEqual(readNativeCreatorDocument(initial,{anchor}),{ok:false,reason:'invalid-projection-options'});
  assert.throws(()=>project(initial.document,{anchor}),RangeError);
 }
 assert.equal(JSON.stringify(initial),before);
});

test('relative recurrence resolves only missing-start diagnostic; count and more pagination agree',()=>{
 const doc=document('# 반복\n- [ ] 반복 일\n  - 상대 날짜: D+1\n  - 반복: 매일\n  - 반복 종료: 3회'),before=JSON.stringify(doc);
 assert(doc.parseResult.issues.some(issue=>issue.messageKey==='authoring.recurrence_requires_start_date'));
 const p=project(doc,{anchor:'2028-02-28',finiteOccurrenceLimit:2});
 assert.deepEqual(p.artifacts.calendar.resolvedOccurrenceDates,['2028-02-29','2028-03-01']);
 assert.equal(p.artifacts.calendar.recurrenceSummaries[0].totalCount,3);
 assert.equal(p.artifacts.calendar.hasMoreOccurrences,true);
 assert.equal(p.artifacts.calendar.rows.some(row=>row.validations.some(issue=>issue.type==='invalid_recurrence')),false);
 const expanded=project(doc,{anchor:'2028-02-28',finiteOccurrenceLimit:3});
 assert.deepEqual(expanded.artifacts.calendar.resolvedOccurrenceDates,['2028-02-29','2028-03-01','2028-03-02']);
 assert.equal(expanded.artifacts.calendar.hasMoreOccurrences,false);
 assert.equal(JSON.stringify(doc),before);assert.deepEqual(project(doc),pinned(doc));
});

test('invalid recurrence/URL, exclusions and source-review gates are never approved by an anchor',()=>{
 for(const extra of ['\n  - 반복: 이해할 수 없는 규칙','\n  - 반복: 매일\n  - 반복 종료: 2020-01-01','\n  - 자료: javascript:alert(1)']){
  const doc=document('# 차단\n- [ ] 일\n  - 상대 날짜: D+1'+extra),before=JSON.stringify(doc);
  assert.equal(project(doc,{anchor:'2028-02-28'}).artifacts.calendar.rows.length,0);assert.equal(JSON.stringify(doc),before);
 }
 const held=createTextAuthoringDocument(RAW,{documentId:'held',ownership:'creator',now:NOW,reviewRequirements:[{kind:'safety',reasonKey:'medical'}]});
 const excluded=applyAuthoringOperation(held,{type:'exclude',itemId:held.parseResult.canonical.items[0].itemId},{now:NOW});
 const before=JSON.stringify(excluded),p=project(excluded,{anchor:'2028-02-28'});
 assert.equal(p.artifacts.calendar.rows.some(row=>row.title==='전날'),false);assert.equal(p.counts.excluded,1);
 assert.equal(JSON.stringify(excluded),before);assert.equal(excluded.lifecycleStatus,'needs_review');
});

test('inactive v3 candidates compute all 19 calendar dates without changing source or activating readers',()=>{
 let count=0;
 for(const slug of CATALOG_CONTENT_V3_CANDIDATE_SLUGS){const candidate=buildCatalogContentV3Candidate(slug);assert(candidate.ok);const before=JSON.stringify(candidate);
  const p=project(candidate.document,{anchor:'2028-02-25'});assert.equal(p.artifacts.calendar.rows.length,candidate.itemMapping.length);
  for(const item of candidate.document.parseResult.canonical.items)assert.equal(p.artifacts.calendar.rows.find(row=>row.itemId===item.itemId)?.date,programNativeExecutionItemFacts(item,'2028-02-25').date);
  count+=p.artifacts.calendar.rows.length;assert.equal(JSON.stringify(candidate),before);
 }
 assert.equal(count,19);
});
