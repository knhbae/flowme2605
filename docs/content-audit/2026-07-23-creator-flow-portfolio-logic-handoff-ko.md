# 제작자 Flow 포트폴리오 로직 세션 Handoff

Date: 2026-07-23

## 목적

이 문서는 콘텐츠 발굴 세션에서 검증한 제작자 27명과 카테고리별 대표 Flow 예시 9개를 다음 **로직/정규화 세션**으로 넘긴다. 이 세션에서는 앱 코드, 앱 seed, canonical 로직을 변경하지 않았다.

## 먼저 읽을 파일

1. `docs/content-audit/2026-07-23-creator-flow-portfolio-data-v1.json`
2. `docs/content-audit/2026-07-23-creator-flow-portfolio-review-ko.html`
3. `docs/content-audit/2026-07-23-creator-flow-portfolio-assets/opened-creator-url-ledger-v1.json`
4. `docs/specs/2026-07-11-canonical-flow-data-model/spec.md`
5. `docs/flow-rules/source-to-flow-conversion-gate.md`

## 조사 결과

- 발견 제작자: 63명
- 실제 열린 프로필: 61개
- 심층 검토: 27명
- 실제 열린 대표 원문: 110개
- 수요·대화 근거가 잡힌 원문: 99개
- 대표 Flow 예시: 9개
- 예시 전체: Flow 22 / Step 57 / Item 148

## 카테고리 판정

| 카테고리 | 점수 상위 | 3명 판정 | 대표 정규화 예시 |
| --- | --- | --- | --- |
| 집·살림 | 아정당 (93) | 아정당:Go, 오늘의집 고수 콘텐츠:Modify, 정리왕:Modify | 아정당 |
| 가족·육아 | 뿐이토핑이유식 (95) | 뿐이토핑이유식:Go, 베이비빌리:Go, 펀맘:Modify | 뿐이토핑이유식 |
| 공부·독서 | 오픽만수르 (94) | 오픽만수르:Go, 생활코딩:Go, 노마드 코더:Go | 오픽만수르 |
| 돈·행정·구매 | 김짠부 재테크 (93) | 김짠부 재테크:Go, 겟차:Modify, 박곰희TV:Modify | 겟차 |
| 건강·운동 | Allblanc TV (96) | Allblanc TV:Go, 빅씨스 Bigsis:Go, Thankyou BUBU:Go | Allblanc TV |
| 여행·외출 | 트리플 (81) | 트리플:Modify, KKday Korea:Hold, 여행에미치다:Single | 트리플 |
| 식사·장보기 | 우리의식탁 (99) | 우리의식탁:Go, 만개의레시피:Modify, 매일맛나:Modify | 우리의식탁 |
| 일·커리어 | AND Studio (94) | AND Studio:Go, 면접왕 이형:Modify, 배민외식업광장:Hold | AND Studio |
| 취미·반려 | 강형욱의 보듬TV (84) | 강형욱의 보듬TV:Modify, 미야옹철의 냥냥펀치:Modify, 핏펫:Single | 핏펫 |

## JSON 읽는 법

- `creatorPortfolioRecords`: 내부 검토 데이터다. 점수, 판정, 사업 가설, 권리·안전 메모가 들어 있다.
- `representativeFlowExamples[].userContentBundle`: 사용자에게 보일 수 있는 실제 Flow 데이터다.
- `representativeFlowExamples[].sourceRows`: 각 Item의 원문 근거다.
- `candidateDiscoveryLedger`: 1차 후보 63명 원장이다. 앱 데이터로 쓰지 않는다.
- `screenshotEvidence`: 원문 캡처와 URL 대응이다.

## 다음 로직 세션의 작업

1. 9개 `userContentBundle`을 Canonical Flow Data Model에 dry-run 정규화한다.
2. `ordered_life_event_map`, `source_curation`, `unordered_collection`, `single_sensitive_schedule`을 같은 순서형 Map으로 합치지 않는다.
3. 기존 재사용 번들 5개와 신규 예시 4개의 필드 차이를 비교한다.
4. 모든 Item에서 `sourceRowIds`와 `sourceTrace`를 보존한다.
5. setup field는 0~2개를 기본으로 하고 source가 요구하지 않는 날짜·반복·완료 기준을 만들지 않는다.
6. creator, provider/platform, source owner를 분리할 최소 attribution 계약을 제안한다.
7. 공개 가능, 내부 canary, source import 필요, 민감도 보류 상태를 하나의 `status`로 뭉개지 않는다.
8. 정규화 결과와 손실·충돌만 새 검토 산출물로 만든다. 앱 반영은 별도 승인 후 진행한다.

## 특히 결정할 로직

### 1. Map 종류

- ordered: D-day, 회차, Day 챌린지, 커리큘럼
- source curation: 원문이 고른 메뉴·자료 묶음, 일정 순서 아님
- unordered collection: AND 영상 3편처럼 서로 독립적인 child Flow
- sensitive schedule: 수의사·공식 확인이 필요한 참고 일정

### 2. Attribution

- `creatorId`: 실제 글·영상 제작자
- `providerId`: 오늘의집·만개의레시피 같은 유통 플랫폼
- `sourceUrl`: 사용자가 실행 중 돌아갈 원문
- platform 전체를 한 creator로 합치지 않는다.

### 3. 사용자 입력

- 날짜 없는 저장은 입력 0개
- D-day Flow는 기준일 1개
- 생후 주차 Flow는 생년월일 1개를 선택 입력
- 영상·레시피 큐는 반복 요일을 저장 후 선택 입력

### 4. Item 경계

- Item은 독립적으로 체크할 최소 행동
- 수량, 비용, 재료, 링크, 팁, 상태, 특이사항은 memo/detail
- 운동 통증·중단, 예방접종 이상반응은 별도 Item/Field로 만들지 않고 필요하면 개인 memo
- 설명형 영상의 세부 단계는 자막·워크북 source row 없이 발명하지 않는다.

## 로직 세션에서 하지 말 것

- 앱 코드나 seed에 바로 넣지 않는다.
- 점수가 높다는 이유로 공개 콘텐츠로 승인하지 않는다.
- 유료 PDF·영상 자막·레시피 전문을 복제하지 않는다.
- 서로 다른 제작자의 오늘의집·만개의레시피 글을 한 creator Map으로 합치지 않는다.
- 여행·재무·건강·반려 의료 정보를 최신 공식 확인 없이 일정화하지 않는다.

## 완료 조건

- 9개 예시 모두 canonical dry-run 결과가 있어야 한다.
- ordered Map과 collection Map의 필드 차이가 설명되어야 한다.
- creator/provider/source attribution 손실이 없어야 한다.
- 모든 Item의 source trace가 유지되어야 한다.
- 정규화 중 새 행동·날짜·반복·완료 기준이 생기지 않아야 한다.
- 앱 구현 전 사용자가 Go / Modify / Hold를 다시 결정할 수 있는 비교표를 제공한다.
