# 콘텐츠 포트폴리오 Round 2 UX/UI·전체 틀 적합성 검토

- 검토일: 2026-07-14
- 검토 대상: `2026-07-11-content-portfolio-expansion-round2-v1.json`의 신규 Content Bundle 10개
- 검토 범위: 현재 `/flows` → 공개 상세 → 저장 → `/my` → `/calendar` 동선, 기존 runtime 타입, Canonical Flow Data Model v1
- 제외 범위: 앱 코드 변경, seed 생성, 콘텐츠 원문 재수집

## 결론

**현재 UX shell은 새 콘텐츠를 수용할 수 있지만, Round 2 데이터를 지금 어댑터에 그대로 넣으면 안 된다.**

현재 공개 상세, 모바일 sticky 저장, My Flow의 오늘/Flow 분리, 캘린더 일정 노출은 대표 기존 콘텐츠에서 정상 동작했다. 390px 화면에서도 가로 넘침 없이 `Map → 저장 → My Flow → Calendar`와 날짜 없는 체크리스트의 `먼저 할 일` 노출을 확인했다. 따라서 화면 전체를 다시 설계할 문제는 아니다.

문제는 데이터와 라우팅이다. Round 2는 53 Step 안에 133 Item이 들어 있는데, 기존 curated adapter는 Step 하나를 runtime `FlowItem` 하나로 만든다. 그대로 적용하면 80개 Item의 독립 완료·일정 상태가 사라진다. 또한 단일 목표 콘텐츠까지 모두 Flow Map으로 감싸면 저장 전 선택이 불필요하게 한 단계 늘어난다.

권장 분류는 다음과 같다.

| 공개 상세 형태 | 수 | 대상 |
|---|---:|---|
| 단일 Flow `/f/[slug]` | 6 | K-MOOC, 30일 사진, 개인 사업자등록, 법인 통신판매업, 30일 콘텐츠 발행, 자동차 정기검사 |
| 선택형 Flow Map | 3 | 가족 생일/돌잔치, 고용24 일반/중장년, 여권 성인/미성년자 |
| 순서형 Flow Map | 1 | 3일 반찬 만들기 |

앱 반영 전 필수 작업은 **Round 2 → canonical 정규화 → 기존 runtime 호환 adapter** 한 경로를 만드는 것이다. Round 2 전용 임시 adapter를 추가하는 방식은 피한다.

## 우선순위별 발견사항

### P0. 기존 adapter가 Item 계층을 잃는다

- Canonical 기준에서 Item은 독립적으로 완료·일정·내보내기되는 최소 실행 단위다. [agent.md](../../agent.md#L161), [canonical-flow-contract.ts](../specs/2026-07-11-canonical-flow-data-model/canonical-flow-contract.ts#L244)
- Round 2 handoff는 `Step → FlowSection`, `Item → FlowItem` 매핑을 명시한다. [handoff](./2026-07-11-content-portfolio-expansion-round2-handoff-ko.md#L28)
- 하지만 현재 curated adapter는 `flow.steps.map(...)`으로 Item을 만든다. [curated-source-app-seed.ts](../../lib/flow/curated-source-app-seed.ts#L396), [curated-source-app-seed.ts](../../lib/flow/curated-source-app-seed.ts#L479)
- Round 2 전체는 `53 Step / 133 Item`이다. 현재 방식이면 최대 53개 실행 항목만 남고, 사진·콘텐츠의 30일 일정과 고용24의 세부 체크가 특히 크게 손실된다.

**조치:** Round 2의 Step은 `FlowSection`, 각 Item은 `FlowItem`으로 정규화한다. Item별 `schedule`, `completion`, `sourceRefIds`를 먼저 canonical에 맞춘 뒤 runtime으로 투영한다.

### P1. Map과 단일 Flow가 구분되지 않았다

- 현재 공개 Map은 `save_all`과 `choose_child` 두 모드만 지원한다. [source-backed-my-flow.ts](../../lib/flow/source-backed-my-flow.ts#L102)
- 공개 Map 화면은 child Flow마다 CTA를 만들며, 일반 Map에서는 모두 `바로 시작`으로 연결한다. [SourceBackedFlowMapPage.tsx](../../components/flow/SourceBackedFlowMapPage.tsx#L223)
- Flow 하나뿐인 콘텐츠 6개는 Map을 거칠 이유가 없다. 사용자는 `/f/[slug]`에서 결과와 첫 할 일을 보고 바로 저장하는 편이 낫다.
- 가족·고용24·여권은 여러 버전을 한꺼번에 저장하면 불필요한 할 일이 생기므로 `choose_child`가 맞다.
- 반찬의 둘째·셋째 날 Flow는 첫째 날 장보기·조리에 의존한다. 현재처럼 child마다 `바로 시작`을 주면 중간부터 저장할 수 있다.

**조치:** 반찬 Map에는 `sequence/dependent` 성격을 표현하는 작은 metadata가 필요하다. Map 전체 저장은 유지하고 child CTA는 `내용 보기`로 바꾸며, 둘째·셋째 날 단독 저장은 막는다.

### P1. 화면의 “할 일 수”가 실제 Item 수와 다르다

- `/flows`의 크기 문구는 `counts.steps`를 `할 일`로 표시한다. [AppClient.tsx](../../components/flow/AppClient.tsx#L599)
- 공개 Map도 `counts.steps`와 `flow.steps.length`를 `할 일`로 표시하고 Step 배열을 바로 펼친다. [SourceBackedFlowMapPage.tsx](../../components/flow/SourceBackedFlowMapPage.tsx#L174), [SourceBackedFlowMapPage.tsx](../../components/flow/SourceBackedFlowMapPage.tsx#L260)
- 사진과 콘텐츠 발행은 각각 `5 Step / 30 Item`인데 현재 방식이면 “할 일 5개”로 보인다. 고용24도 `4 Step / 19 Item`이다.

**조치:** 사용자 화면에서 `Step = 단계·주차·시기`, `Item = 할 일`로 고정한다. Map 미리보기는 Step 아래 Item을 묶어 보여주고, 카드의 할 일 수는 Item count를 사용한다.

### P1. 현재 탐색 필터가 새 생활 영역을 담지 못한다

- 현재 빠른 필터는 전체, 이사/계약, 공부, 아이/건강, 구매/생활, 루틴으로 고정돼 있다. [AppClient.tsx](../../components/flow/AppClient.tsx#L570)
- 새 번들의 식사·장보기, 일·커리어, 취미·사진, 가족 행사는 자연스러운 진입점이 없다.
- 10개를 추가하면 catalog가 기존 7개에서 약 17개로 늘어나므로 검색어 일치만으로는 스캔 비용이 커진다.

**조치:** canonical `lifeArea`를 탐색 metadata로 사용한다. 화면에는 4~6개의 상황 중심 빠른 필터만 두되, 검색과 상세 필터에서는 생활 영역을 안정적으로 적용한다. `가족 행사`를 `아이/건강`에 억지로 넣지 않는다.

### P1. setup field와 현재 저장 UI의 계약이 다르다

- 현재 Map 저장 UI는 setup input 한 개만 받고, 존재하면 필수 날짜로 간주하며 input type도 date로 고정한다. [SourceBackedFlowMapSaveButton.tsx](../../components/flow/SourceBackedFlowMapSaveButton.tsx#L18), [SourceBackedFlowMapSaveButton.tsx](../../components/flow/SourceBackedFlowMapSaveButton.tsx#L37), [SourceBackedFlowMapSaveButton.tsx](../../components/flow/SourceBackedFlowMapSaveButton.tsx#L81)
- Round 2는 대부분 `제목 + 날짜`를 setup field로 둔다. 제목은 현재 저장 UI에서 받을 수 없다.
- 개인 사업자 `개업 예정일`, 여권 `신청 예정일`은 실제 Item 일정에 연결되지 않아 입력해도 결과가 바뀌지 않는다.
- 일부 appTarget의 `event_date`, `date`는 현재 legacy `AnchorType`과 맞지 않는다. [types.ts](../../lib/flow/types.ts#L5)

**조치:** 저장 전에는 실제 일정 생성에 필요한 anchor만 받는다. 개인 제목은 저장 후 My Flow에서 수정하는 overlay로 둔다. 결과를 바꾸지 않는 개인 사업자·여권 날짜 입력은 제거하고, 필요하면 저장 후 해당 Item에 날짜를 붙이게 한다.

### P2. 일부 콘텐츠는 작은 수정 후 승격해야 한다

- **반찬:** source row에는 실제 메뉴명이 있지만 생성 Item detail은 `둘째 날 국 / 반찬`처럼 일반화됐다. 실제 메뉴명을 detail에 보존해야 한다. [Round 2 JSON](./2026-07-11-content-portfolio-expansion-round2-v1.json#L4063), [Round 2 JSON](./2026-07-11-content-portfolio-expansion-round2-v1.json#L4318)
- **자동차 검사:** `재검사 기간 안에 다시 검사받기`가 모든 사용자에게 활성 Item으로 생긴다. 부적합일 때만 필요한 조건부 행동이므로 지금 모델에서는 정기검사 Item의 detail/memo에 둔다. [Round 2 JSON](./2026-07-11-content-portfolio-expansion-round2-v1.json#L7727)
- **고용24:** `서비스 승인`, `컨설턴트 배정`, `취업`, `사후관리`는 기관 상태와 사용자 행동이 섞여 있다. 체크 완료 기준을 붙이거나 `승인 결과 확인하기`처럼 사용자가 체크할 수 있는 문장으로 정리한다.
- **가족 행사:** `3~4주 전 준비 마치기`보다 `날짜·장소·초대 범위 정하기`처럼 묶음 안의 실제 행동을 제목으로 올리는 편이 첫 행동을 이해하기 쉽다. Item 수를 늘릴 필요는 없다.
- **30일 콘텐츠:** Day 13의 타인 소개·인용 주의는 Flow memo에만 두면 Calendar export에서 떨어질 수 있다. 해당 Item detail에 붙인다. [Round 2 JSON](./2026-07-11-content-portfolio-expansion-round2-v1.json#L6545)
- **30일 사진·콘텐츠:** 원문 prompt 30개를 그대로 제공하는 만큼 `rightsStatus` 확인 전에는 internal canary로 제한한다.

## 번들별 UX 적합성 판정

| 번들 | 권장 공개 형태 | 저장하면 생기는 것 | 판정 | 앱 반영 전 조치 |
|---|---|---|---|---|
| K-MOOC 제자백가 15주 | 단일 Flow | 시작일 기준 15주 학습 일정 15개 | adapter 후 가능 | Item 단위 weekly schedule 보존 |
| 가족 생일 행사 준비 | 선택형 Map | 생일 또는 돌잔치 한 버전의 준비 일정 | 보완 후 가능 | `choose_child`, 행동 중심 제목, event anchor 호환 |
| 30일 사진 찍기 | 단일 Flow | 시작일부터 하루 한 장, 30개 일정 | 보완 후 가능 | 30 Item 보존, rights review, Map wrapper 제거 |
| 3일 반찬 만들기 | 순서형 Map | 장보기 1회와 3일 조리 일정 | 보류 | 실제 메뉴명 보존, 중간 Flow 단독 저장 방지 |
| 고용24 취업지원 시작 | 선택형 Map | 일반 또는 중장년 지원 체크리스트 | 보완 후 가능 | `choose_child`, 기관 상태 Item 완료 기준 정리 |
| 개인 사업자등록 준비 | 단일 Flow | 준비서류와 신청 체크 5개 | 보완 후 가능 | dead date 제거, destination을 checklist로 통일 |
| 법인 통신판매업 신고 | 단일 Flow | 법인 신고 준비·신청 체크 10개 | 보완 후 가능 | checklist 통일, 최신성·법인 범위 QA |
| 여권 재발급 준비 | 선택형 Map | 성인 또는 미성년자 체크리스트 | 보완 후 가능 | `choose_child`, dead date/invalid anchor 제거 |
| 30일 콘텐츠 발행 | 단일 Flow | 시작일부터 30개 발행 주제 일정 | 보완 후 가능 | Item caution 이동, rights review, Map wrapper 제거 |
| 자동차 정기검사 일정 | 단일 Flow | 공식 검사 가능 기간 안의 핵심 일정 1개 | 보류 | 조건부 재검사를 memo/detail로 이동 |

## 현재 사용자 여정에 맞춘 권장 형태

### 1. `/flows`: 무엇이 생기는지 먼저 표시

- 카드 제목 아래에 `시작일을 넣으면 15주 일정 15개` 또는 `바로 저장되는 체크리스트 5개`를 표시한다.
- `Map`이라는 내부 구조어보다 `둘 중 하나 선택`, `3일 전체 일정`처럼 사용자의 결정을 설명한다.
- 첫 할 일은 Item 기준으로 한 개만 보여준다.

### 2. 공개 상세: 선택과 실행을 분리

- 단일 Flow: `/f/[slug]`에서 anchor 입력과 저장을 바로 제공한다.
- 선택형 Map: child 두 개의 차이, 첫 할 일, 할 일 수를 비교한 뒤 하나만 저장한다.
- 순서형 Map: 전체 순서를 먼저 보여주고 한 묶음으로 저장한다. child는 탐색용이지 독립 시작점이 아니다.

### 3. `/my`: 날짜 있음과 날짜 없음을 모두 자연스럽게 이어가기

- 날짜 기반 Flow는 오늘 할 일과 다음 일정을 보여준다.
- checklist Flow는 날짜가 없어도 `먼저 할 일 · 날짜 없음`으로 시작 가능하게 유지한다.
- 개인 제목, 메모, 필요한 Item 날짜는 저장 후 수정한다. 저장 전 입력을 무겁게 만들지 않는다.

### 4. `/calendar`와 export: Item이 투영 단위

- 30일 콘텐츠는 Step 5개가 아니라 Item 30개가 일정 30개로 나가야 한다.
- Step은 Calendar 그룹명이나 상세 맥락으로만 사용한다.
- Item detail의 source link와 해당 Item에 필요한 주의 문구를 함께 보존한다.

## 권장 canary 순서

1. **K-MOOC 단일 Flow:** 주 단위 Item 일정과 Calendar 투영을 검증한다.
2. **고용24 일반 Flow:** 날짜 없는 checklist의 저장·완료·내보내기를 검증한다.
3. **가족 행사 선택형 Map:** child 한 개만 선택·저장하는 동선을 검증한다.
4. **30일 사진:** 30개 daily Item 밀도와 모바일 Today/Calendar 성능을 검증한다. 권리 확인 전 internal만 사용한다.
5. **3일 반찬:** 실제 메뉴명과 sequence 저장 정책을 고친 뒤 검증한다.

현재 P23 실행 lifecycle 검토가 진행 중이므로 10개를 한꺼번에 넣기보다 위 세 가지 서로 다른 모양을 먼저 통과시키는 편이 안전하다.

## 구현 세션의 완료 조건

- Round 2의 133 Item이 독립 runtime Item으로 보존된다.
- 화면의 `할 일 수`가 Item 수와 일치하고 Step은 단계 문맥으로 표시된다.
- 단일 Flow 6개는 불필요한 Map 상세를 거치지 않는다.
- 선택형 Map 3개는 child 하나만 저장한다.
- 반찬은 둘째·셋째 날만 단독 저장할 수 없다.
- setup input은 결과 일정에 실제로 영향을 주는 날짜만 저장 전에 요구한다.
- 기존 390px sticky save, My Flow Today/Flow, Calendar 동작에 회귀가 없다.
- review score, sourceRowIds, rights 검토 상태는 사용자 화면에 노출하지 않는다.
