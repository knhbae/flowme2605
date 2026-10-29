import {createAlphaTypedWritingController} from './typed-writing-controller';
import {ALPHA_MEMO_BODY_PROFILE} from '../alpha-persistence/memo-cohort';
import {ALPHA_REA_NEW_ITEMS_PROFILE} from '../alpha-persistence/rea-text-edit';

type ControllerInput=Parameters<typeof createAlphaTypedWritingController>[0];
export const ALPHA_LOCAL_WRITING_SUPPORT=Object.freeze({
  profile:'rea-body-title/1',
  heading:'본문·제목 편집 · 모의 저장',
  description:'메모와 본문, 할 일·일정의 제목만 모의 저장할 수 있습니다.',
  limitation:'진행·날짜·새 항목·구조 변경은 이 경로로 저장되지 않습니다. 저장하지 못한 입력은 현재 화면에 보존됩니다.',
  scope:'합성 계정의 로컬 확인용입니다. 실제 Alpha 저장은 연결되지 않았습니다.',
});
export const ALPHA_LOCAL_PROGRESS_WRITING_SUPPORT=Object.freeze({
  profile:'rea-body-progress/1',
  heading:'본문·제목·명시 진행 입력 · 모의 저장',
  description:'메모와 본문, 할 일·일정 제목 및 진행 폼에서 명시한 날짜별 진행값을 모의 저장할 수 있습니다.',
  limitation:'일정 날짜·새 항목·구조 편집은 저장하지 않습니다. 진행 Undo는 기존 날짜를 정확히 복원할 수 있거나 미저장 명령을 상쇄할 때만 저장합니다. 저장된 새 날짜 삭제와 재시작 제출 증거 복원은 미지원이며 입력을 보존합니다.',
  scope:ALPHA_LOCAL_WRITING_SUPPORT.scope,
});
export const ALPHA_LOCAL_MEMO_WRITING_SUPPORT=Object.freeze({
 profile:ALPHA_MEMO_BODY_PROFILE,heading:'기존 메모 계정 · 모의 편집·저장',
 description:'계정 전체를 확인한 메모 원문만 편집합니다. 기존 행 ID와 문서·폴더 순서를 보존합니다.',
 limitation:'진행·날짜·새 항목·구조·순서·position 변경은 미지원입니다. 보관 문서는 편집하지 않습니다. 재시작 후 미확인 요청 복구는 아직 연결되지 않았습니다.',
 scope:ALPHA_LOCAL_WRITING_SUPPORT.scope,
});
export const ALPHA_LOCAL_NEW_ITEMS_WRITING_SUPPORT=Object.freeze({
 profile:'rea-body-progress/1',heading:'본문·명시 항목 추가 · 모의 저장',
 description:'본문·제목과 추가한 문단·할 일·일정, 새 일정의 날짜와 날짜별 진행값을 모의 저장합니다.',
 limitation:'새 항목은 선택한 메모 문단 뒤에 추가합니다. Enter는 같은 항목 안에서 줄을 바꿉니다.',
 scope:ALPHA_LOCAL_WRITING_SUPPORT.scope,
});

/** Explicit local selector. The existing controller owns all read generations,
 * the immutable identity/document and the single PM input owner. Explicit additions
 * require an opt-in new-items profile. No automatic creation,
 * v11 conversion, default transport, or additional authoritative draft. */
export function createAlphaLocalWritingSelector(input:ControllerInput&{scope:'local-alpha-writing/1';supportMode?:'authenticated-app'}){
  if(input.scope!=='local-alpha-writing/1'||typeof input.request!=='function')throw Error('LOCAL_INJECTED_TRANSPORT_REQUIRED');
  const progressEnabled=input.textProfile==='rea-body-progress/1';
  const newItemsEnabled=progressEnabled&&input.newItemsProfile===ALPHA_REA_NEW_ITEMS_PROFILE,reentryEnabled=!!input.reentry;
  const controller=createAlphaTypedWritingController(input);
  return{
    async open(){
      const result=await controller.open();
      if(!result.ok)return result;
      if(result.kind==='v11-readonly')return{ok:true as const,kind:'v11-readonly' as const,editable:false as const};
      const host=controller.currentHost();
      if(!host)return{ok:false as const,reason:'NO_TYPED_INPUT_OWNER'};
      const support=newItemsEnabled?{...ALPHA_LOCAL_NEW_ITEMS_WRITING_SUPPORT,...(reentryEnabled?{limitation:ALPHA_LOCAL_NEW_ITEMS_WRITING_SUPPORT.limitation+' 재진입은 원요청 조회와 주입 체크포인트만 사용합니다. 옛 Undo 이력과 증거 없는 진행 저장 권한은 복원하지 않습니다.'}:{})}:input.textProfile===ALPHA_MEMO_BODY_PROFILE?ALPHA_LOCAL_MEMO_WRITING_SUPPORT:progressEnabled?ALPHA_LOCAL_PROGRESS_WRITING_SUPPORT:ALPHA_LOCAL_WRITING_SUPPORT;
      const serverTransport=input.supportMode==='authenticated-app';
      const presentedSupport=serverTransport?{...support,heading:support.heading.replaceAll('모의 ',''),description:support.description.replaceAll('모의 ',''),scope:'서버 응답으로 저장을 확인합니다. 미확인 입력의 브라우저 영속 보관은 연결되지 않았습니다.'}:support;
      return{ok:true as const,kind:'typed' as const,editable:true as const,host,support:presentedSupport,capabilities:{progress:progressEnabled,newItems:newItemsEnabled,reentry:reentryEnabled,serverTransport}};
    },
    currentHost:controller.currentHost,
    snapshot:controller.snapshot,
    close:controller.close,
    // Explicit injected harness retirement only. UI close still uses close()
    // and must preserve its unsaved-input refusal; no navigation shortcut.
    retireReentryBinding:controller.retireReentryBinding,
  };
}
export type AlphaLocalWritingSelector=ReturnType<typeof createAlphaLocalWritingSelector>;
