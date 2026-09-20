import assert from 'node:assert/strict';
import test from 'node:test';
import {createTextAuthoringDocument} from '../../../lib/flow/integrated-poc/native-creator-vendor/text-authoring/parser';
import {applyAuthoringOperation} from '../../../lib/flow/integrated-poc/native-creator-vendor/text-authoring/operations';
import type {AuthoringWorkingTextItemPatch} from '../../../lib/flow/integrated-poc/native-creator-vendor/text-authoring/types';
import {nativeInspectorPatch,nativeInspectorUnsafeReason} from './creator-native-context-model';

const now='2026-09-13T10:00:00.000Z';
const make=(raw:string)=>createTextAuthoringDocument(raw,{documentId:'inspector-parity',ownership:'creator',now});
const cases:Array<{key:keyof AuthoringWorkingTextItemPatch;value:string;existing?:string}>= [
 {key:'detail',value:'예약 번호를 확인한다'}, {key:'completion',value:'예약 번호 기록'},
 {key:'date',value:'2026-09-23'}, {key:'relativeDate',value:'D+2'},
 {key:'time',value:'09:30',existing:'  - 날짜: 2026-09-23\n'},
 {key:'timezone',value:'Asia/Seoul',existing:'  - 날짜: 2026-09-23\n  - 시간: 09:30\n'},
 {key:'place',value:'회의실'}, {key:'duration',value:'30분',existing:'  - 날짜: 2026-09-23\n'},
 {key:'repeat',value:'매일',existing:'  - 날짜: 2026-09-23\n'},
 {key:'repeatEnd',value:'3회',existing:'  - 날짜: 2026-09-23\n  - 반복: 매일\n'},
 {key:'condition',value:'예약이 확정되면'},
];

for(const row of cases)test(`NIP add originally supported absent ${row.key}, preserve identity and native Undo`,()=>{
 const raw=`# 예약 준비\n기준일: 2026-09-20\n- [ ] 예약 확인\n${row.existing??''}- [ ] 다른 작업\n  - 설명: 그대로 보존`;
 const before=make(raw),item=before.parseResult.canonical.items[0],patch={...nativeInspectorPatch(before,item),[row.key]:row.value};
 // Prove original D2 capability first; a relaxed UI must not invent support.
 const after=applyAuthoringOperation(before,{type:'sync_item_to_working_text',itemId:item.itemId,patch},{actorLane:'creator',now});
 assert.notEqual(after,before,`original D2 does not support ${row.key}`);
 assert.equal(nativeInspectorUnsafeReason(before,item,patch),undefined);
 assert.equal(after.parseResult.canonical.items[0].itemId,item.itemId);
 assert(after.rawText.endsWith('- [ ] 다른 작업\n  - 설명: 그대로 보존'));
 const undone=applyAuthoringOperation(after,{type:'undo'},{actorLane:'creator',now});
 assert.equal(undone.rawText,raw);assert.deepEqual(undone.parseResult.canonical,before.parseResult.canonical);
});

test('NIP absent description/date/place addition preserves CRLF, source subchecks, unrelated blocks and exact Undo',()=>{
 const raw='# 준비\r\n- [ ] 예약 확인\r\n  - [x] 원문 확인 표시\r\n- [ ] 별도 작업\r\n  - 설명: 변경하지 않음\r\n';
 const before=make(raw),item=before.parseResult.canonical.items[0],patch={...nativeInspectorPatch(before,item),detail:'기록 확인',date:'2026-09-23',place:'회의실'};
 assert.equal(nativeInspectorUnsafeReason(before,item,patch),undefined);
 const after=applyAuthoringOperation(before,{type:'sync_item_to_working_text',itemId:item.itemId,patch},{actorLane:'creator',now});
 assert.notEqual(after,before);assert(!/(?<!\r)\n/u.test(after.rawText));
 assert(after.rawText.includes('  - [x] 원문 확인 표시\r\n'));assert(after.rawText.endsWith('- [ ] 별도 작업\r\n  - 설명: 변경하지 않음\r\n'));
 assert.equal(after.parseResult.canonical.items[0].itemId,item.itemId);
 const undone=applyAuthoringOperation(after,{type:'undo'},{actorLane:'creator',now});
 assert.equal(undone.rawText,raw);assert.deepEqual(undone.parseResult.mappings,before.parseResult.mappings);
});

test('NIP original evidence-link limitations are not widened by general property addition',()=>{
 const before=make('# 준비\n- [ ] 예약 확인'),item=before.parseResult.canonical.items[0],base=nativeInspectorPatch(before,item);
 for(const key of ['resource','source','guide','caution'] as const){
  const patch={...base,[key]:key==='source'||key==='resource'?'https://example.com/source':'별도 안내'};
  assert(nativeInspectorUnsafeReason(before,item,patch));
  assert.equal(applyAuthoringOperation(before,{type:'sync_item_to_working_text',itemId:item.itemId,patch},{actorLane:'creator',now}),before);
 }
});
