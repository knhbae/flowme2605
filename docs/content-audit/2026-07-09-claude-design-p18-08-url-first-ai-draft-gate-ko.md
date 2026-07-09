# P18-08 URL-first miss AI Draft Gate

작성일: 2026-07-09
범위: Claude Design P18-08
상태: 실제 AI 연동 전 제품/UX/data gate

## 목적

URL-first hit는 이미 준비된 Flow를 찾아 시작하는 가치가 명확하다. 반면 miss는 아직 `요청 정리본 복사`와 로컬 후보 저장에 머물러 실행 가치가 약하다. 사용자는 miss에서도 원문 URL과 메모를 바탕으로 초안을 만들고, 그 초안을 자기 상황에 맞게 손본 뒤 My Flow, Calendar, export로 이어지는 흐름을 기대한다.

이번 P18-08은 실제 AI API를 붙이지 않는다. 대신 P18-05 개인 수정본 overlay와 P18-07 기준일/항목 날짜 모델 위에서, AI draft를 열기 전에 필요한 사용자 흐름과 evidence gate를 고정한다.

## 현재 상태

현재 URL-first miss 흐름:

- `/flows`에서 알려지지 않은 URL을 입력하면 miss 상태가 나온다.
- 사용자는 요청 제목과 요청 메모를 저장할 수 있다.
- 같은 URL은 로컬 candidate로 다시 보인다.
- candidate 상세에서 원 URL, 내가 쓴 제목/메모, 마지막 확인, 사용자용 복사 산출물을 확인할 수 있다.
- 내부 production handoff 함수는 별도로 유지된다.

현재 닫힌 기준선:

- 사용자 화면과 복사 산출물에 `Step`, `Item`, `sourceTrace`, `handoff`, `Canonical URL`, `Markdown` 같은 내부/기술어가 나오지 않는다.
- P18-05로 저장 후 항목 제목 alias, 날짜 override, 사용자 메모 overlay 모델이 마련됐다.
- P18-07로 Flow 전체 기준일과 항목별 날짜 override의 차이를 사용자 copy/evidence로 구분한다.
- My Flow, Calendar, export는 같은 개인 수정본 overlay를 읽어야 한다.

## 사용자 문제

miss 상태가 단순히 "요청을 남겼다"로 끝나면 사용자는 다음 가치를 알기 어렵다. 기대하는 흐름은 다음에 가깝다.

1. 원문 URL과 내가 원하는 결과를 남긴다.
2. FlowMe가 초안으로 만들 수 있는 준비 상태가 된다.
3. 초안이 준비되면 사용자가 제목, 날짜, 메모, 포함 여부를 손본다.
4. 손본 초안이 My Flow, Calendar, export에 같은 기준으로 반영된다.

다만 지금 실제 AI 생성이 없으므로, 화면 copy는 "지금 바로 만들어준다"가 아니라 "초안 요청을 보관하고 이후 초안 흐름으로 이어질 기준을 남긴다"로 말해야 한다.

## Draft Gate 결정

P18-08의 제품 결정:

- miss 화면은 `초안 준비 요청`으로 프레이밍한다.
- CTA는 `초안 요청 저장`으로 둔다.
- 설명은 "URL과 메모를 저장해 초안으로 만들 때 쓸 기준을 남긴다"까지 말한다.
- 실제 AI가 즉시 실행된다는 문구는 쓰지 않는다.
- 사용자 복사 산출물은 `초안 요청 정리본`으로 바꾼다.
- 내부 production handoff 함수는 유지하지만 사용자 버튼이 복사하지 않는다.

## Draft Item 최소 구조

AI draft가 실제로 열리려면 최소한 아래 구조를 만들 수 있어야 한다.

```ts
type DraftFlowItem = {
  id: string;
  title: string;
  date?: string;
  dateAnchorOffset?: number;
  userMemo?: string;
  sourceContext?: string;
  enabled: boolean;
  exportTargets: {
    calendar: boolean;
    checklist: boolean;
    memo: boolean;
    sheet: boolean;
  };
};
```

이 구조는 지금 구현하지 않는다. 후속 구현에서 source-backed 원본, AI draft, 사용자 수정본의 경계를 분리하기 위한 기준으로 둔다.

## 사용자가 손봐야 하는 항목

초안이 열린 뒤 사용자가 최소로 손볼 수 있어야 하는 것:

- 제목: 실행 row 표시명
- 날짜: 기준일 기반 상대 날짜 또는 항목별 고정 날짜
- 사용자 메모: 내 상황에 맞춘 보조 메모
- on/off: 이번 실행에 포함할지 여부

이번 P18-08에서는 UI를 열지 않고, 이 네 가지가 draft gate의 필수 조건임을 문서와 evidence에 남긴다.

## 기준일/항목 날짜 모델 반영

P18-07 기준을 따른다.

- Flow 전체 기준일 변경: 이사일, 학습 시작일처럼 전체 상대 일정을 다시 계산한다.
- 항목별 날짜 변경: 특정 할 일 하나만 개인 날짜로 조정한다.
- 항목별 날짜 override가 있으면 Flow 전체 기준일 변경보다 우선한다.
- raw ISO는 사용자 주요 문구로 보이지 않는다.

AI draft도 같은 규칙을 따라야 한다. draft item이 Calendar로 들어갈 때는 사용자용 날짜 label과 export payload가 같은 날짜를 가리켜야 한다.

## My Flow 반영 규칙

AI draft가 실제 저장 단계로 들어오면 My Flow는 다음 우선순위를 따른다.

1. 사용자 수정 overlay 제목
2. draft item 제목
3. 원문/source-backed 제목

날짜 계산은 다음 우선순위를 따른다.

1. 항목별 date override
2. Flow 전체 기준일 + draft offset
3. 날짜 없음 fallback

오늘 영역은 P18-02 기준을 유지한다.

- 오늘 프레이밍은 1개
- 남은 개수 소스는 1개
- 오늘 할 일은 inline 완료 가능
- 상세 열기는 보조 행동

## Calendar 반영 규칙

Calendar는 날짜 우선 실행 화면이다.

- draft item의 날짜가 있으면 Calendar marker와 agenda row에 반영한다.
- Flow별 색/마커/라벨은 P18-01 기준을 따른다.
- 같은 날짜에 여러 Flow가 있으면 Flow별 group으로 분리한다.
- 공통 날짜/기준 메타는 group header 1회만 보인다.
- row에는 할 일 제목, 짧은 행동, 필요한 최소 맥락만 보인다.

## Export 반영 규칙

AI draft가 실제 저장된 뒤 export는 같은 개인 수정본 overlay를 읽어야 한다.

- calendar export: 항목 제목 alias와 날짜 override를 반영한다.
- checklist/sheet export: 제목 alias, on/off, 완료 상태를 반영한다.
- memo export: 사용자 메모와 source context를 분리해 보존한다.
- 사용자-facing export에는 내부어가 나오지 않는다.

## Source / AI / User 경계

후속 AI draft 구현은 세 경계를 분리해야 한다.

- Source: 원문 URL, 원문에서 온 문장, 출처 맥락
- AI: 초안 생성 결과, 불확실하거나 검토가 필요한 구조
- User: 제목 alias, 날짜 override, 사용자 메모, on/off

금지:

- AI draft를 source-backed 원본처럼 표시하지 않는다.
- 사용자 수정본으로 원본 source/detail/memo/sourceTrace를 덮어쓰지 않는다.
- 사용자 화면에 `source-backed`, `Step`, `Item`, `handoff`, `Canonical URL`, `P0`, `대기열`, `파이프라인`, `Markdown`을 노출하지 않는다.

## P18-08 UI Copy Gate

이번 단계에서 적용한 사용자-facing 기준:

- miss section title: `초안 준비 요청`
- miss CTA: `초안 요청 저장`
- miss help: `지금 바로 Flow를 만들지는 않습니다`
- candidate list title: `내 초안 요청`
- user copy output title: `초안 요청 정리본`
- user copy output final line: `초안이 준비되면 제목, 날짜, 메모를 손본 뒤 내 Flow와 캘린더로 이어갈 수 있어요.`

이 copy는 다음을 피한다.

- 실제 AI가 지금 실행되는 듯한 표현
- 제작/운영 handoff 표현
- 내부 상태 enum/roadmap 표현

## Evidence Gate

route-evidence summary는 아래 marker를 기록해야 한다.

- `urlFirstMissDraftGateVisible`
- `urlFirstMissDraftCtaLabel`
- `urlFirstMissDraftImpliesLiveAi`
- `urlFirstMissDraftLiveAiHitCount`
- `urlFirstMissCandidateCopyInternalHitCount`

목표값:

- `urlFirstMissDraftGateVisible: true`
- `urlFirstMissDraftCtaLabel: "초안 요청 저장"`
- `urlFirstMissDraftImpliesLiveAi: false`
- `urlFirstMissDraftLiveAiHitCount: 0`
- `urlFirstMissCandidateCopyInternalHitCount: 0`

기존 URL-first marker도 유지한다.

- visible Markdown hit 0
- candidate user-copy internal hit 0
- candidate card legacy status hit 0
- normal route guardrail hit 0

## 실제 AI 연동 전 필요한 다음 구현 slice

1. Draft preview data model
   - AI 결과를 저장 전에 임시 preview로 들고 있을 구조
   - source/AI/user provenance 구분

2. Draft editor surface
   - 제목, 날짜, 메모, on/off 최소 수정
   - Flow 전체 기준일과 항목 날짜 override 구분

3. Save-to-My-Flow bridge
   - draft를 source-backed personal overlay와 같은 실행 모델로 저장
   - My Flow/Calendar/export가 같은 overlay를 읽음

4. Trust and review copy
   - AI 초안은 검토가 필요한 초안임을 명시
   - 원문 근거가 약한 행은 사용자가 확인할 수 있게 표시

## 하지 말아야 할 것

- 이번 단계에서 실제 AI API를 호출하지 않는다.
- miss에서 "지금 바로 생성"처럼 오해되는 CTA를 만들지 않는다.
- URL-first 저장 전 full editor를 열지 않는다.
- 저장/실행/export 스키마를 바꾸지 않는다.
- source-backed 원본을 AI draft 또는 사용자 수정본으로 덮어쓰지 않는다.

## 다음 /goal 후보

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
P18-08 gate를 바탕으로 URL-first miss draft preview model을 설계한다. 실제 AI API 호출은 하지 않고, mock/fixture draft item을 source/AI/user provenance로 분리해 저장 전 preview와 저장 후 personal overlay 연결 규칙을 검증한다.
```
