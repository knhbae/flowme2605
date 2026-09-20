# P3-J 작업 체크리스트

## 기획·UX·설계

- [x] v4.1, 개발1, 개발2를 모두 원본·요구·결정·현재 구현과 매칭했다.
- [x] D1-023은 기준일/결과 형식 분리, D1-024는 Map child 선택임을 바로잡았다.
- [x] parent D1 26/26과 완료 기준 하위 조건·실제 전달 누락의 충돌을 기록했다.
- [x] `FlowBundle.itemDetails[].completion_criteria`와 authored parsed snapshot의 보유 값을 확인했다.
- [x] 기존 read model부터 Item 상세 prop까지 누락 경로를 확인했다.
- [x] `원문 설명 / 완료 기준 / 내 메모` 구분과 공통 복귀 문법을 정했다.
- [x] 저장 schema를 늘리지 않는 read helper와 exact identity join을 설계했다.

## 구현

- [x] saved source detail과 authored snapshot의 완료 기준을 정확한 Item에 연결했다. meal slot 경로도 별도 검사했다.
- [x] React 실행 상세와 Item editor에서 원문/기준/개인 메모를 구분했다.
- [x] 기준 없는 source·다른 copy·invalid mapping에서 추정 또는 누출을 막았다.
- [x] standalone 모델·상세를 동일하게 바꾸고 조작형 HTML 두 개를 재생성했다.

## 검증·보고

- [x] source→read model→view→상세의 긍정·부정 테스트 58/58을 통과했다.
- [x] 개인 편집·완료·Undo·reload 뒤 source description·criteria·rawText 불변을 확인했다.
- [x] Today/Flow/result의 같은 ref 상세와 돌아가기·선택 유지 경로를 조작했다.
- [x] D1-023/024 회귀를 재확인했으며 새 갭 해결로 세지 않았다.
- [x] 잘못된 query/origin/payload fail-closed와 허용 prefix 밖 setItem/removeItem/clear 0을 확인했다.
- [x] 운영 `flow:*` fixture key/value byte 불변을 확인했다.
- [x] `npm test` 15개 그룹 합계 2,210/2,210과 production build 18/18을 기록했다.
- [x] 390×844, 375×812, 844×390, 1024×768, 1440×900에서 React와 standalone을 조작했다.
- [x] 핵심 행동 가림·가로 넘침·console/page error를 화면별 기록했다. 내부 긴 원문 잘림을 추가 수정하고 재검증했다.
- [x] before/after, 요구 추적표와 한국어 HTML 검증 리포트를 갱신했다.
- [x] 두 보고서의 390/1440 렌더 4/4를 통과했다. 추적표에서 발견한 원본 명세 링크 2개를 실경로로 고친 뒤 재검사했다.
- [x] 문서 검사 16개 필수 문서·4,696개 로컬 링크와 scoped diffcheck를 통과했다. 실제 검사·미실행 검사·발행 상태를 분리했다.

## 이번 목표에서 실행하지 않는 항목

실제 Android/iOS·보조기술·관찰 사용자 검사는 기존 `NOT_RUN`을 유지한다. commit·push·PR·Preview·Production은 별도 지시 전 미진행이다. 이 목록은 미완료 구현 체크리스트나 현재 목표의 차단 조건이 아니다.
