# 공개 콘텐츠 최신성 감사

작성일: 2026-07-11

## 판정

초기 단순 집계에서는 published 617개 중 449개가 `source_checked_at` 누락처럼 보였다. 이 중 440개는 실제 원문 Flow가 아니라 의도적으로 `preview_only`에 둔 채널 확장 샘플이다. 따라서 전체를 오래된 사용자 콘텐츠로 보는 것은 오탐이다.

실행 노출 모델을 결합한 최초 정상 사용자 route는 161개이며, 이 가운데 확인일이 없던 8개를 재확인했다. 후속 live reachability·semantic freshness 감사에서 삭제되거나 source row를 검증할 수 없는 6개를 preview로 내려 현재 정상 사용자 route는 155개다. 원문 확인일과 출처 정밀도 누락은 0개다.

## 재확인한 8개

| Flow | 원문 | 정밀도 | 판단 |
| --- | --- | --- | --- |
| 이사 D-30 준비 | [아정당 이사 체크리스트](https://www.ajd.co.kr/contents/basic-tip/detail/%EC%9D%B4%EC%82%AC_%EC%A4%80%EB%B9%84_%EC%B2%B4%ED%81%AC%EB%A6%AC%EC%8A%A4%ED%8A%B8_%EC%99%84%EB%B2%BD%EC%A0%95%EB%A6%AC!_%EC%97%91%EC%85%80_Xls_PDF_%EB%85%B8%EC%85%98_notion_%EC%B2%A8%EB%B6%80-23363) | exact | D-30~당일 표와 현재 Flow 범위가 직접 대응한다. |
| 하루 20분 전신 홈트 | [Thankyou BUBU 채널](https://www.youtube.com/@ThankyouBUBU) | broad | 채널은 살아 있지만 특정 20분 세션 한 편과 1:1 대응하지 않아 broad를 유지한다. |
| 해외여행 출국 준비 | [외교부 여권 사용 안내](https://passport.go.kr/home/kor/contents.do?menuPos=48) | broad | 공식 페이지는 살아 있지만 Flow의 비자·짐·공항 범위 전체를 한 URL이 덮지 않는다. |
| 직장인 영어공부 30일 | [30일 독학 루틴](https://www.new1eng.com/blog/adult-english-30day-self-study) | exact | 30일 주차별 실행 구조가 현재 Flow와 대응한다. |
| 중고차 구매 현장 점검 | [자동차365 중고차 구매가이드](https://www.car365.go.kr/ccpt/schdcar/trde/prchsGuide.do?_menuId=M630401000&moblYn=Y) | exact | 공식 조회·성능상태점검기록부·보험 이력·등록 원부 확인 순서를 현재 Flow에 연결했다. |
| 월 1회 자동차 관리 | [차량 관리 체크리스트](https://gnsl0879.tistory.com/717) | exact | 타이어·소모품·블랙박스 점검 범위가 현재 Flow와 대응한다. |
| 결혼 준비 D-300 | [오프린트미 2026 결혼 준비 체크리스트](https://www.ohprint.me/blog/wedding-checklist) | exact | 브라우저에서 D-300 체크리스트 본문을 재확인했다. 검색/지역별 응답 차이 때문에 실제 Chrome 화면도 함께 확인했다. |
| 초보 러너 5km 4주 | [RunDay](https://www.runday.co.kr/) | broad | 서비스는 살아 있지만 홈페이지가 4주 5km 프로그램의 직접 근거는 아니므로 broad를 유지한다. |

## 공개 profile 기본 노출

`/u/flow-curation-team`에는 전체 75개가 있다.

- 실제 원문: 7개
- 대표 Flow: 1개
- 검토 중: 60개
- 샘플: 6개
- 기타 비대표: 1개

기존 기본 `모두 보기`는 검토 중/샘플이 확인된 콘텐츠와 같은 밀도로 섞였다. 공개 profile 기본 필터를 `확인된 콘텐츠`로 바꾸고 실제 원문 또는 대표 Flow 8개만 먼저 보여준다. `모두 보기`, `샘플`, `초안`은 삭제하지 않는다. 개인 스튜디오는 초안 보조 선반이므로 기본값을 바꾸지 않는다.

## 회귀 기준

- canonical seed의 published normal user route는 `source_url`, `source_checked_at`, `source_precision`을 모두 가져야 한다.
- `source_url`은 유효한 HTTPS 주소, `source_checked_at`은 실제 달력 날짜 또는 유효한 ISO timestamp이자 서울 기준 미래가 아닌 시점이어야 한다.
- 90일을 넘긴 `review_due`부터 표준 unit suite와 수동 freshness audit를 실패시킨다.
- `catalog_preview`와 `hidden`은 정상 사용자 freshness gate와 분리한다.
- 공개 creator profile 기본값에는 `needs_review`와 preview sample이 없어야 한다.
- 공개 creator profile은 390px/1024px에서 user-surface guardrail과 horizontal overflow 0을 유지한다.

## 남은 리스크

- 정상 사용자 후보 155개 중 80개는 여전히 `needs_review`다. 확인일이 있다는 사실은 source-fit 승인을 뜻하지 않는다.
- broad source 6개는 정확 원문 교체 후보로 남는다.
- 외부 원문은 배포 후에도 바뀔 수 있다. 네트워크 의존 build test 대신 주기적 비동기 source audit가 필요하다.
- 자동 QA는 실제 사용자가 콘텐츠를 신뢰하고 실행했는지 증명하지 않는다. P22 관찰 0/15 상태는 그대로다.
