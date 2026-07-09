# P18-05 URL-first 항목 편집 모델 Spec

작성일: 2026-07-09
범위: Claude Design P18-05 spec/spike
상태: 구현 전 기준 문서

## 목적

URL-first hit/custom-start는 이미 준비된 Flow를 찾고 내 Flow로 가져오는 흐름까지 안정화됐다. 다만 현재 사용자가 조정할 수 있는 범위는 시작일, 저장 이름, Step 포함/제외, export mode에 가깝다. 사용자가 "거의 맞는 Flow"를 자기 상황에 맞게 쓰려면 실행 항목의 날짜, 문구, 메모, 완료 기준, export 반영 여부까지 어떤 모델로 다룰지 먼저 정해야 한다.

이번 P18-05는 UI나 저장 스키마를 구현하지 않는다. 이후 구현이 My Flow, Calendar, export, source-backed 원본 구조를 흔들지 않도록 편집 단위와 반영 규칙을 고정하는 문서 작업이다.

## 확인한 현재 구조

확인한 주요 파일:

- `components/flow/AppClient.tsx`
- `lib/flow/url-first-lookup.ts`
- `lib/flow/url-first-supply-queue.ts`
- `lib/flow/source-backed-my-flow.ts`
- `lib/flow/storage.ts`
- `lib/flow/export.ts`
- `tests/e2e/url-first-user-surface.spec.ts`
- `tests/e2e/flow-mvp.spec.ts`

현재 URL-first hit/custom-start에서 사용자가 바꿀 수 있는 것:

- 시작일: `startDate`
- 저장 이름: `customTitle`
- Step 포함/제외: `includedStepIds`
- export mode: `calendar`, `markdown`, `checklist`

현재 저장 구조가 반영하는 개인화:

- `SavedFlowRecord.anchor`: 시작일
- `SourceBackedFlowMapPersonalCopy.originalTitle`: 원본 제목
- `SourceBackedFlowMapPersonalCopy.includedStepIdsByFlow`: 포함 Step
- `SourceBackedFlowMapPersonalCopy.excludedStepIdsByFlow`: 제외 Step
- `FlowItemState.skipped` + `note: excluded_on_start`: 제외 상태

현재 사용자가 바꿀 수 없는 것:

- 실행 항목별 날짜 이동
- 실행 항목별 제목 수정
- 실행 항목별 사용자 메모 수정
- 완료 기준 수정
- 항목별 Calendar export 포함 여부
- 항목별 sheet/memo/checklist export 포함 여부
- 원본 source/detail/memo/sourceTrace와 개인 수정본의 충돌 처리

현재 구조의 중요한 제약:

- source-backed 원본은 seed/publish package에서 온다.
- 개인화는 원본을 덮어쓰기보다 saved snapshot/persistence record 위에 얹힌다.
- My Flow와 Calendar는 같은 저장 상태와 anchor를 기준으로 실행 항목을 계산한다.
- export는 현재 선택된 저장본/진행 상태를 읽어 파일을 만든다.
- 사용자 화면에는 `Step`, `Item`, `source-backed`, `Markdown` 같은 내부어를 노출하지 않는 기준이 있다.

## 사용자 문제

URL-first hit의 핵심 가치는 "이미 준비된 실행 Flow를 찾아 바로 시작"이다. 하지만 실제 사용자는 준비된 Flow가 80% 맞을 때 다음 조정을 기대한다.

- 이 항목은 내 일정상 하루 미루고 싶다.
- 이 항목 제목을 내 상황에 맞게 바꾸고 싶다.
- 이 항목은 필요 없어서 이번 실행에서는 끄고 싶다.
- 캘린더에는 넣지 않지만 메모 문서에는 남기고 싶다.
- 완료 기준이나 내 메모를 덧붙이고 싶다.

현재의 Step 포함/제외만으로는 이 요구를 모두 담기 어렵다. 그렇다고 URL-first 저장 전 화면에서 모든 편집기를 열면 공유 저장, My Flow 실행, Calendar/export 기준이 흐려진다. 따라서 편집 모델은 저장 전 최소 조정과 저장 후 깊은 조정을 분리해야 한다.

## 용어 기준

문서 안에서는 구현 논의를 위해 `Flow-level`, `Step-level`, `Item-level`을 쓴다. 사용자 화면에서는 이 용어를 그대로 쓰지 않는다.

사용자 화면 표현 기준:

- `Flow-level`: 이 준비 전체, 이 Flow, 저장 이름, 시작일
- `Step-level`: 할 일, 실행 항목, 오늘 할 일
- `Item-level`: 세부 체크, 준비물, 메모 안의 체크 항목

현재 코드에서 My Flow와 Calendar가 실제 실행 row로 다루는 단위는 대체로 source-backed Step에 가깝다. 따라서 P18 이후 첫 구현 단위는 사용자가 보는 "할 일 row" 단위, 즉 내부적으로는 Step-level overlay로 시작하는 것이 안전하다. 더 작은 checklist item 단위의 날짜/제목 수정은 별도 스키마가 필요하므로 후속 단계로 미룬다.

## 편집 단위

### 1. Flow-level

Flow-level은 저장된 준비 전체에 대한 설정이다.

허용 편집:

- 저장 이름 수정
- 시작일 또는 기준일 수정
- 기본 export mode 선택
- 전체 Flow 포함/보류

반영 규칙:

- My Flow 제목과 inventory row에 반영한다.
- Calendar의 Flow 그룹 라벨과 marker에 반영한다.
- export 파일의 제목과 요약에 반영한다.
- source-backed 원본 제목은 보존하고, 개인 표시명만 overlay한다.

### 2. Step-level

Step-level은 사용자가 My Flow/Calendar에서 보는 실행 row 단위다. P18 이후 첫 item edit 구현은 이 단위를 기준으로 한다.

허용 편집:

- on/off: 이번 실행에 포함할지 여부
- 날짜 이동: anchor 기준 offset 또는 고정 날짜 override
- 제목 alias: 사용자 표시 제목
- 사용자 메모: 개인용 보조 메모
- 완료 기준 보강: 사용자가 알아볼 수 있는 완료 조건
- export 반영 설정: 필요 시 format별 포함 여부

반영 규칙:

- My Flow today/next/past 계산은 Step-level schedule override를 우선한다.
- Calendar는 같은 override를 읽어 날짜 marker와 agenda row를 만든다.
- export는 같은 override와 제목 alias를 읽어 calendar/sheet/memo/checklist 결과물을 만든다.
- source detail, sourceUrl, sourceTrace, 원문 memo는 삭제하지 않고 상세 맥락으로 남긴다.

### 3. Item-level

Item-level은 Step 상세 안의 checklist subitem 또는 세부 행이다.

P18-05 판단:

- 지금은 full edit 구현 단위로 삼지 않는다.
- Step 내부 체크 항목의 완료 여부나 메모는 기존 detail/checklist 구조 안에서 유지한다.
- 날짜, 제목, export 포함 여부까지 item-level로 열려면 nested item id, migration, export mapping이 필요하다.

후속 조건:

- source-backed package가 안정적인 nested item id를 제공해야 한다.
- My Flow detail, Calendar event, export row가 nested item을 구분할 수 있어야 한다.
- item-level edit가 Step-level schedule과 충돌할 때 우선순위가 있어야 한다.

## 제안하는 개인 수정본 overlay 모델

이번에는 구현하지 않는다. 후속 구현 시 고려할 shape는 다음과 같다.

```ts
type PersonalCopyEditModelV1 = {
  source: 'url_first_custom_start';
  originalTitle?: string;
  includedStepIdsByFlow: Record<string, string[]>;
  excludedStepIdsByFlow: Record<string, string[]>;
  stepOverridesByFlow?: Record<string, Record<string, {
    title?: string;
    schedule?: {
      mode: 'anchor_offset' | 'fixed_date';
      dayOffset?: number;
      date?: string;
    };
    userMemo?: string;
    completionNote?: string;
    export?: {
      calendar?: boolean;
      checklist?: boolean;
      memo?: boolean;
      sheet?: boolean;
    };
  }>>;
};
```

중요한 점:

- 기존 `SourceBackedFlowMapPersonalCopy`를 즉시 바꾸지 않는다.
- 후속 구현 전 migration 전략을 먼저 정한다.
- source-backed 원본은 immutable로 보고, 개인 수정은 overlay로만 둔다.
- raw source/detail/memo/sourceTrace 데이터는 삭제하거나 덮어쓰지 않는다.

## My Flow 반영 규칙

My Flow는 할 일 우선 실행 허브다. 개인 수정본이 생기면 다음 순서로 표시값을 결정한다.

1. Step override title
2. 개인 저장 Flow 제목 또는 source-backed saved title
3. source-backed 원본 Step title

날짜 계산 순서:

1. Step override schedule
2. saved record anchor + source day offset
3. source-backed 원본 schedule fallback

완료 상태:

- 완료 여부는 기존 progress/check state를 유지한다.
- Step off 상태는 `skipped`와 같은 실행 제외 상태로 다룬다.
- off된 Step은 오늘/다음 실행 큐와 Calendar에서 제외한다.
- 다시 on하면 기존 완료/메모 상태는 가능한 한 보존한다.

UX 기준:

- 저장 직후에는 "내 Flow에 저장됨"과 오늘/다음 할 일을 먼저 보여준다.
- 깊은 편집은 설정/상세에서 연다.
- 오늘 할 일의 1탭 완료 기준은 유지한다.
- "Step", "Item" 같은 내부 명칭은 사용자 화면에 쓰지 않는다.

## Calendar 반영 규칙

Calendar는 날짜 우선 실행 화면이다. 개인 수정본이 생기면 Calendar는 Flow 식별과 날짜 override를 함께 읽는다.

반영 규칙:

- Flow marker 색/라벨은 저장 Flow 단위로 유지한다.
- agenda group header는 Flow 식별과 날짜를 중심으로 둔다.
- Step override schedule이 있으면 해당 날짜로 이동한다.
- fixed date와 anchor offset이 동시에 있으면 fixed date가 우선이다.
- off된 Step은 Calendar marker와 agenda row에서 제외한다.
- 날짜 없는 Step은 Calendar가 아니라 My Flow 목록/상세에서 처리한다.

충돌 규칙:

- 같은 날짜에 여러 Flow가 있으면 P18-01의 Flow별 marker/group 기준을 유지한다.
- 같은 Flow 안에서 여러 Step이 같은 날짜면 group header 1회, row는 할 일 제목과 짧은 행동 중심으로 둔다.
- raw ISO 날짜는 사용자 주요 문구로 보이지 않게 한다.

## Export 반영 규칙

Export는 사용자가 자기 도구로 재사용하는 핵심 가치다. 개인 수정본은 export에 반드시 반영되어야 한다.

공통 규칙:

- export는 source-backed 원본이 아니라 현재 사용자의 saved copy overlay를 읽는다.
- 제목 alias, 날짜 override, user memo, completion note를 반영한다.
- 원본 sourceUrl/source detail은 필요한 맥락으로 유지한다.
- 파일 내부에도 `Step`, `Item`, `source-backed`, `handoff`, `Markdown` 같은 내부 제작어를 사용자-facing 텍스트로 노출하지 않는다.

Calendar export:

- included + calendar-enabled Step만 포함한다.
- override date를 우선한다.
- 날짜 없는 항목은 calendar export에서 제외하거나 "날짜 없는 할 일"로 별도 정책을 정한 뒤 반영한다.

Memo/checklist export:

- included Step을 포함한다.
- 제목 alias와 user memo를 반영한다.
- off된 Step은 기본 제외한다.
- 사용자가 "보류 항목도 포함"을 명시하는 후속 옵션이 생기기 전에는 실행 중인 항목 중심으로 둔다.

Sheet export:

- Flow 제목, Step 제목, 날짜, 상태, source context, user memo를 열로 유지한다.
- 개인 override와 원본 source context를 구분 가능한 열 또는 설명으로 둔다.

## URL-first UX 모델

URL-first hit 저장 전 화면의 역할은 "처음부터 편집기를 여는 것"이 아니라 "바로 시작할지, 조금만 조정할지 고르는 것"이다.

권장 UX 단계:

1. 그대로 시작
   - 시작일
   - 내 Flow에 저장
   - 필요하면 문서/캘린더로 가져가기

2. 조금 고쳐 시작
   - 저장 이름
   - 시작일
   - 포함할 할 일 선택
   - export mode

3. 저장 후 더 고치기
   - My Flow 상세 또는 설정에서 날짜/제목/메모/완료 기준 편집
   - Calendar에서는 날짜 이동 결과를 확인
   - Studio/creator surface는 보조 표면으로 유지

저장 전 화면에서 바로 열지 않을 것:

- 전체 spreadsheet형 편집기
- item-level 세부 checklist 편집
- source trace/production handoff
- AI draft 상세 편집

이유:

- URL-first hit의 첫 가치는 빠른 저장과 실행이다.
- 과한 편집기는 public `/f` 저장 CTA와 My Flow 실행 허브 기준을 흐린다.
- 깊은 편집은 저장 후 실제 내 실행 공간에서 하는 편이 My Flow/Calendar/export 반영을 확인하기 쉽다.

## 데이터/스키마 영향 분석

현재 구조로 흡수 가능한 것:

- 저장 이름
- 시작일
- Step include/exclude
- off 상태를 `FlowItemState.skipped`로 표현

새 모델이 필요한 것:

- Step title alias
- Step-specific schedule override
- user memo
- completion note
- format별 export inclusion
- source update와 개인 override 충돌 처리

현재 스키마를 바로 바꾸지 않는 이유:

- `SourceBackedFlowMapPersonalCopy`는 include/exclude 중심으로 작다.
- `FlowItemState`는 현재 `skipped`, `note`만 갖는다.
- Calendar/My Flow/export가 같은 override를 읽도록 하려면 단일 overlay source가 먼저 필요하다.
- migration 없이 필드를 흩어 넣으면 source-backed update projection에서 개인 수정이 유실될 수 있다.

후속 구현 전 필요한 결정:

- override를 `personalCopy` 안에 둘지, 별도 storage key로 둘지
- source update 시 matching 기준은 step id인지 title similarity인지
- 제거된 원본 Step에 사용자 memo가 있으면 orphaned edit로 보존할지
- export inclusion을 Step-level에서만 열지, format별로도 열지

## Source-backed 원본과 개인 수정본 경계

유지해야 할 원칙:

- 원본 source-backed package는 canonical reference다.
- 개인 수정본은 원본 위 overlay다.
- 개인 수정으로 원본 sourceUrl/sourceTrace/detail/memo를 삭제하지 않는다.
- 사용자에게는 원본과 개인 수정의 기술 구조를 노출하지 않는다.

업데이트 정책:

- 원본 Flow가 업데이트되면 Step id가 같은 항목에는 개인 override를 재적용한다.
- Step id가 사라졌고 개인 memo/title/date override가 있으면 자동 삭제하지 않는다.
- 충돌이 있으면 "확인 필요" 상태로 보존하고, 사용자가 유지/삭제를 결정하게 한다.
- 원본의 위험/출처/상세 정보는 최신 원본을 우선하되, 개인 메모와 섞어 덮어쓰지 않는다.

## P18-08 AI draft gate

P18-08 miss AI draft는 아직 구현하지 않는다. AI가 초안을 만들어도 사용자가 고칠 수 없다면 FlowMe의 실행 도구 방향과 맞지 않는다.

P18-08을 열기 위한 최소 조건:

- draft 할 일을 사용자가 수정할 수 있다.
- 날짜, 제목, 메모, 완료 기준을 수정할 수 있다.
- 수정본이 My Flow, Calendar, export에 동일하게 반영된다.
- AI 생성 내용과 source-backed 원본, 사용자 수정본의 경계가 구분된다.
- draft output에도 user-surface guardrail이 적용된다.
- 사용자가 원하면 draft를 버리고 기존 "요청 정리본 복사" 경로로 돌아갈 수 있다.
- AI draft가 canonical/source-backed Flow처럼 보이지 않는다.

P18-08 전까지 유지할 경로:

- miss/candidate는 요청 정리본 복사를 유지한다.
- 내부 production handoff와 사용자용 복사 산출물은 계속 분리한다.
- AI draft는 `/flow-lab` 같은 internal-console/prototype tier에서 먼저 검증한다.

## 하지 말아야 할 것

- URL-first hit 화면에 full editor를 즉시 붙이지 않는다.
- 저장/실행/export 스키마를 P18-05에서 바꾸지 않는다.
- source-backed 원본 row를 개인 수정본으로 덮어쓰지 않는다.
- `Step`, `Item`, `source-backed`, `Markdown`, `handoff`, `Canonical URL` 같은 내부어를 사용자 화면에 다시 노출하지 않는다.
- public `/f` 저장 전 화면을 개별 item editor로 만들지 않는다.
- `/u/my-flow-studio`를 5번째 탭으로 승격하지 않는다.
- P18-01~P18-04/P18-06의 Calendar/My Flow/public `/f` 기준선을 되돌리지 않는다.

## 구현 단계 제안

### Phase 0: 현재 P18-05 spec 고정

- 이 문서를 기준으로 편집 모델을 합의한다.
- UI/schema 변경은 하지 않는다.
- P18-08 AI draft는 gate만 문서화한다.

### Phase 1: 저장 후 My Flow Step-level 편집

- My Flow 상세/설정에서 실행 row의 제목 alias, 날짜 override, user memo를 수정한다.
- Calendar와 export가 같은 overlay를 읽게 한다.
- first task repetition, today one-frame, agenda group 기준을 유지한다.

### Phase 2: URL-first custom-start의 가벼운 확장

- 저장 전에는 "포함할 할 일"과 "시작일" 중심을 유지한다.
- 필요하면 "저장 후 날짜와 문구를 조정할 수 있어요" 수준의 상태 문구를 둔다.
- 직접 날짜/문구 편집은 Phase 1이 안정화된 뒤 노출한다.

### Phase 3: item-level 또는 nested checklist 편집

- source-backed nested item id가 안정화된 뒤 검토한다.
- Calendar event와 export row가 nested item을 어떻게 다룰지 별도 spec을 둔다.

### Phase 4: P18-08 AI draft

- draft item edit, guardrail, source/AI/user 경계가 준비된 뒤 연다.
- 처음에는 internal/prototype tier에서 검증한다.

## 다음 구현 /goal 후보

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
P18-05 spec을 기준으로 URL-first 개인 수정본 Phase 1을 구현한다. 새 intake 기능을 만들지 않고, 저장 후 My Flow 상세/설정에서 source-backed 실행 row의 제목 alias, 날짜 override, 사용자 메모를 수정할 수 있게 하고, 같은 overlay가 Calendar agenda와 export 결과에 반영되게 한다. source-backed 원본은 변경하지 않고 개인 수정본 overlay로만 저장한다.

검증:
- My Flow에서 수정한 제목/날짜/메모가 Calendar에 반영되는지 확인
- export calendar/sheet/memo/checklist가 수정본을 읽는지 확인
- sourceUrl/sourceTrace/detail/memo 원본이 유지되는지 확인
- P18-01~P18-04/P18-06 기준선 유지
- npm.cmd run docs:check
- npm.cmd test
- npm.cmd run build
- git diff --check
- 커밋 및 푸시
```

## 완료 판단

P18-05는 다음 조건을 만족하면 닫힌다.

- URL-first hit/custom-start의 현재 조정 범위가 문서화됐다.
- Flow-level, Step-level, Item-level 편집 경계가 정의됐다.
- My Flow, Calendar, export가 같은 수정 모델을 읽어야 한다는 기준이 명확해졌다.
- source-backed 원본과 개인 수정본의 경계가 정리됐다.
- P18-08 AI draft의 선행 gate가 문서화됐다.
- 앱 UI와 저장/실행/export 스키마는 변경하지 않았다.
