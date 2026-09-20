import test from 'node:test';
import assert from 'node:assert/strict';
import { planCreatorCalendarSourceOrder as plan } from './creator-calendar-source-order';
import { creatorSourceIdentity, planCreatorSourceOrder } from './creator-source-order';
import { previewProgramCreatorSource } from './creator-workspace';

const selection={start:0,end:0,direction:'none' as const},today='2026-09-12',now='2026-09-12T18:00:00.000Z';
const head='# 준비\n- 기준일: 2026-09-20\n## 계획\n';
const relative='- [ ] 상대 준비\n  - 상대 날짜: D-2\n  - 새 속성: 유지\n  - [x] 하위 확인';
const series='- [ ] 반복 걷기\n  - 날짜: 2026-09-14\n  - 반복: 매주 월\n  - 반복 종료: 2026-10-05';
const undated='- [ ] 날짜 미정\n  - 메모: 그대로';
const late='- [ ] 늦은 일정\n  - 날짜: 2026-09-25';
const raw=head+[late,undated,relative,series].join('\n\n');
const working=(rawText:string)=>({draftId:'calendar-order',title:'준비',rawText,baseRecordRevision:null});
const identity=(rawText:string)=>creatorSourceIdentity(rawText,rawText.replace(/\r\n?/gu,'\n').split('\n').map((text,i)=>({id:`original-${i}`,text})));
const order=(value=raw)=>plan(working(value),identity(value),3,selection,today,now);

test('Calendar alignment ranks relative and repeating Items by their actual first result, without copying occurrences',()=>{
  const result=order();assert.equal(result.status,'ready',JSON.stringify(result));if(result.status!=='ready')return;
  assert.deepEqual(result.afterTitles,['반복 걷기','상대 준비','늦은 일정','날짜 미정']);
  assert.equal(result.after.rawText,head+[series,relative,late,undated].join('\n\n'));
  const preview=previewProgramCreatorSource(working(raw),today,now);assert(preview.result?.ok);
  assert.equal(preview.result.projection.items.filter(i=>i.title==='반복 걷기').length,4);
  assert.equal(result.after.rawText.split('- [ ] 반복 걷기').length-1,1);
  assert.deepEqual(new Set(result.after.lines.map(l=>l.id)),new Set(result.before.lines.map(l=>l.id)));
  assert.equal(order(result.after.rawText).status,'noop');
});
test('Calendar block permutation preserves CRLF, owned unknown properties, subchecks and exact selection identity',()=>{
  const value=raw.replaceAll('\n','\r\n'),before=identity(value),start=value.indexOf('새 속성');
  const result=plan(working(value),before,3,{start,end:start+4,direction:'backward'},today,now);
  assert.equal(result.status,'ready');if(result.status!=='ready')return;
  assert.equal(result.after.rawText,head.concat([series,relative,late,undated].join('\n\n')).replaceAll('\n','\r\n'));
  assert.equal(result.after.rawText.slice(result.selectionAfter.start,result.selectionAfter.end),'새 속성');
  assert.equal(result.after.lines.find(l=>l.text.includes('새 속성'))?.id,before.lines.find(l=>l.text.includes('새 속성'))?.id);
});
test('Calendar ordering keeps unranked Items stable at the end while fixed-date ordering still preserves their slots',()=>{
  const value=head+[late,undated,'- [ ] 두 번째 미정','- [ ] 빠른 일정\n  - 날짜: 2026-09-13'].join('\n');
  const aligned=order(value);assert.equal(aligned.status,'ready');if(aligned.status==='ready')assert.deepEqual(aligned.afterTitles,['빠른 일정','늦은 일정','날짜 미정','두 번째 미정']);
  const fixed=planCreatorSourceOrder(identity(value),3,selection);assert.equal(fixed.status,'ready');if(fixed.status==='ready')assert.deepEqual(fixed.afterTitles,['빠른 일정','날짜 미정','두 번째 미정','늦은 일정']);
});
test('Calendar same-date rows sort all-day before time and preserve source order for equal first schedules',()=>{
  const value=head+'- [ ] 오후\n  - 날짜: 2026-09-20\n  - 시간: 15:00\n- [ ] 미정\n- [ ] 같은 시각 A\n  - 날짜: 2026-09-20\n  - 시간: 09:00\n- [ ] 종일\n  - 날짜: 2026-09-20\n- [ ] 같은 시각 B\n  - 날짜: 2026-09-20\n  - 시간: 09:00';
  const result=order(value);assert.equal(result.status,'ready');if(result.status==='ready')assert.deepEqual(result.afterTitles,['종일','같은 시각 A','같은 시각 B','오후','미정']);
});
test('Calendar alignment never moves blocks across an explicit Step and never sorts only the visible month',()=>{
  const value=raw+'\n## 다른 계획\n- [ ] 다른 구간\n  - 날짜: 2026-01-01';
  const result=order(value);assert.equal(result.status,'ready');if(result.status!=='ready')return;
  assert(result.after.rawText.endsWith('## 다른 계획\n- [ ] 다른 구간\n  - 날짜: 2026-01-01'));
  const future=head+'- [ ] 내년\n  - 날짜: 2027-03-01\n'+relative;
  const p=order(future);assert.equal(p.status,'ready');if(p.status==='ready')assert.deepEqual(p.afterTitles,['상대 준비','내년']);
});
test('unresolved anchor, invalid recurrence and stale source fail without mutating working or identity',()=>{
  for(const value of [raw.replace('- 기준일: 2026-09-20\n',''),raw.replace('매주 월','잘못된 반복')]) {
    const w=working(value),id=identity(value),before=JSON.stringify([w,id]);
    const step=value.split('\n').findIndex(line=>line==='## 계획')+1;
    assert.deepEqual(plan(w,id,step,selection,today,now),{status:'blocked',reason:'calendar-result-unavailable'});assert.equal(JSON.stringify([w,id]),before);
  }
  assert.equal(plan(working(raw+'x'),identity(raw),3,selection,today,now).status,'blocked');
});
test('Calendar ranks reject foreign source lines, duplicate ranks and stale fingerprints',()=>{
  const id=identity(raw);
  for(const ranks of [{sourceFingerprint:'stale',sourceLines:[]},{sourceFingerprint:id.sourceFingerprint,sourceLines:[1]},
    {sourceFingerprint:id.sourceFingerprint,sourceLines:[4,4]}])assert.equal(planCreatorSourceOrder(id,3,selection,ranks).status,'blocked');
});
