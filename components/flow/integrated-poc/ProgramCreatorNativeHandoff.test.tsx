import test from 'node:test';import assert from 'node:assert/strict';import './test-css-modules';
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {ProgramCreatorNativeHandoff,programNativeHandoffChoices,programNativeHandoffHasSelection} from './ProgramCreatorNativeHandoff';
import type {ProgramNativeHandoffPreview} from '../../../lib/flow/integrated-poc/creator-native-execution-adapter';
const preview:ProgramNativeHandoffPreview={id:'preview',draftId:'draft',documentId:null,sourceVersionId:'actual-v1',contextRevision:3,sourceRaw:'원문',rows:[
 {itemId:'actual-item',title:'준비',previous:'',personal:'',incoming:'- [ ] 준비',sourceRowIds:['actual-source-row'],kind:'added',previousKind:null,incomingKind:'ordinary',sourceDate:null,sourceTime:null,timeZone:null,fieldUpdatesAllowed:false,mode:'new'},
 {itemId:'excluded-item',title:'제외 항목',previous:'',personal:'',incoming:'',sourceRowIds:['excluded-source-row'],kind:'removed',previousKind:null,incomingKind:null,sourceDate:null,sourceTime:null,timeZone:null,fieldUpdatesAllowed:false,mode:'retain'},
]};
test('NHU01 first handoff defaults to actual included content; existing personal content defaults to all keep',()=>{
 const choices=programNativeHandoffChoices(preview);assert.equal(choices['actual-item'].source,'incoming');assert.equal(choices['excluded-item'].source,'keep');assert(programNativeHandoffHasSelection(choices));
 const existing=programNativeHandoffChoices({...preview,documentId:'same-document'});assert(!programNativeHandoffHasSelection(existing));existing['actual-item'].date='incoming';assert(programNativeHandoffHasSelection(existing));
});
test('NHU02 independent field controls and exact three comparison values render without revealing raw source dumps',()=>{
 const next={...preview,documentId:'personal-doc',rows:[{...preview.rows[0],kind:'changed' as const,previous:'이전 원문',personal:'내 메모와 20%',incoming:'새 원문',sourceDate:'2026-09-20',sourceTime:'10:30',fieldUpdatesAllowed:true,mode:'update' as const}]};
 const html=renderToStaticMarkup(<ProgramCreatorNativeHandoff preview={next} choices={programNativeHandoffChoices(next)} busy={false} onChange={()=>{}} onApply={()=>{}} onCancel={()=>{}} onRefresh={()=>{}}/>);
 for(const value of ['이전 원문','내 메모와 20%','새 원문','개인 실행 날짜','개인 시간','하위 체크','2026-09-20','10:30'])assert(html.includes(value),value);
 assert.equal((html.match(/<select/g)??[]).length,4);assert(html.includes('disabled=""'));assert(!html.includes('actual-source-row'));
});
test('NHU03 Escape cancels through the same callback, never during composition or save',()=>{
 let cancelled=0;const props={preview,choices:programNativeHandoffChoices(preview),busy:false,onChange:()=>{},onApply:()=>{},onCancel:()=>cancelled++,onRefresh:()=>{}};
 const event=(composing=false)=>({key:'Escape',nativeEvent:{isComposing:composing},preventDefault(){},stopPropagation(){}} as any);
 ProgramCreatorNativeHandoff(props).props.onKeyDown(event());assert.equal(cancelled,1);
 ProgramCreatorNativeHandoff(props).props.onKeyDown(event(true));ProgramCreatorNativeHandoff({...props,busy:true}).props.onKeyDown(event());assert.equal(cancelled,1);
});
test('NHU04 replacing a kind or returning from archive never offers misleading per-field preservation',()=>{
 for(const previousKind of ['ordinary','series']){
  const next:ProgramNativeHandoffPreview={...preview,documentId:'personal-doc',rows:[{...preview.rows[0],kind:'changed',previous:'이전 원문',personal:'내 메모와 20%',incoming:'반복 원문',previousKind,incomingKind:'series',fieldUpdatesAllowed:false,mode:'replace'}]};
  const html=renderToStaticMarkup(<ProgramCreatorNativeHandoff preview={next} choices={programNativeHandoffChoices(next)} busy={false} onChange={()=>{}} onApply={()=>{}} onCancel={()=>{}} onRefresh={()=>{}}/>);
  assert.equal((html.match(/<select/g)??[]).length,1);assert(!html.includes('현재 내 값 유지'));assert(html.includes('새 실행을 만듭니다'));assert(html.includes('이전 기록을 남기고 새 실행으로 가져오기'));
 }
});
