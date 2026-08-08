# FlowMe R1 Calendar Controller Boundary

**작성일:** 2026-08-06

**상태:** Draft PR #168 발행 완료; 병합·프로덕션 배포 미실행

**선행 작업:** [R0 동작 보존 아키텍처 리팩토링](../2026-08-06-r0-behavior-preserving-architecture-refactor/spec.md)

**기준 커밋:** `6612c4a344a8dbd24d087d50883d480b5be45397`

**작업 브랜치:** `codex/r0-behavior-preserving-architecture-refactor-20260806`

## 목표

현재 화면, 데이터, 라우트 및 결과물을 바꾸지 않고
`components/flow/AppClient.tsx`에 남아 있는 Calendar 전용 상태와 전환을
타입이 명확한 Calendar controller 경계로 옮긴다.

Calendar는 계속 My Flow 저장·실행 데이터를 읽어 보여 주는 파생 렌즈다.
별도 계획 저장소나 실행 데이터 소유자가 되지 않는다.

## R1이 이동하는 책임

- 표시 월과 선택 날짜
- Calendar 범위와 선택된 Flow 식별자
- 모바일 선택일 시트 열림 상태
- 루틴·일정 더보기 날짜 상태
- 월·날짜·범위·Flow 선택에 따른 순수 전환 계획
- Calendar 내부 포커스 대상과 스크롤 요청
- Calendar에서 My Flow 항목을 여는 정확한 경로 계산
- 선택 Flow 선호값을 읽고 쓰는 Calendar 전용 브라우저 어댑터

순수 전환 모듈은 React, DOM, `window`, localStorage에 의존하지 않는다.
React hook은 상태와 브라우저 효과를 연결하되 저장 키와 직렬화 형식을
바꾸지 않는다.

## 이동하지 않는 책임

| 책임 | 계속 소유하는 곳 |
| --- | --- |
| 저장된 Flow, 개인 오버레이, 실행·완료 기록 | 기존 My Flow 및 저장 계층 |
| 활성 행, 상세·편집 초안, 메모, 미저장 변경 확인 | 기존 My Flow runtime |
| FullCalendar JSX, DOM 보정, ARIA와 기존 테스트 ID | 기존 Calendar surface와 `AppClient` |
| 저장 잠금, 실패 복구, 데이터 마이그레이션 | 기존 저장 계층 |
| 결과 생성, 가져가기, receipt 저장 | 기존 결과 전달 계층 |

Controller는 My Flow 상태를 직접 소유하지 않는다. 필요한 경우 다음의
좁은 포트를 호출한다.

- 미저장 변경 존재 여부 확인
- 폐기 확인 요청
- 액션별 공유 상태 초기화 프로필 적용

## 반드시 보존할 계약

- 현재 UI 구조, 사용자 문구, 접근성 이름과 테스트 ID
- 라우트, 쿼리, 브라우저 Back, 스크롤 및 포커스 복원
- Calendar에서 My Flow로 이동할 때의 정확한 경로와 `demo` 쿼리 보존
- 기존 `window.location.assign` 이동 방식
- localStorage 키 `flow:calendar:selected-flows:v1`과 JSON 바이트 형식
- 잘못되거나 오래된 선택 Flow를 정규화하는 현재 순서
- Flow 범위 선택 시 `all` 범위로 맞추는 현재 규칙
- 월 이동, 범위 변경, 날짜 클릭, 키보드 이동, 이벤트 클릭, 더보기,
  오늘, 첫 일정, 외부 저장 완료 동기화 각각의 서로 다른 초기화 범위
- Calendar 계산·표시와 My Flow 저장·실행 데이터의 단일 소유권
- 기존 기능 플래그, 롤백 동작과 결과물 생성 규칙

액션별 초기화는 의도적으로 비대칭이다. R1에서 편의를 위해 하나의
공통 초기화로 합쳐 현재 동작을 넓히거나 줄이지 않는다.

## 제외 범위

- UI/UX 재설계와 문구·Flow 용어 변경
- My Flow controller 분리
- `storage.ts` 또는 `source-backed-my-flow.ts` 분리
- 저장 키·JSON·데이터 모델·마이그레이션 변경
- 결과 가져가기·완료 기록 경계 변경
- Text-to-Flow 통합 또는 신규 기능
- 레거시 코드 삭제와 광범위한 중복 정리
- Git 발행, Vercel 배포 및 프로덕션 변경은 R1 구현 범위 밖이었다. Git 발행만
  이후 별도 승인으로 Draft PR #168에서 실행했다.
- 사용자 관찰 검증

## 완료 조건

- Calendar 전용 상태와 전환의 단일 소유자가 controller로 명확해진다.
- 순수 전환 모듈은 UI와 브라우저 API 없이 단위 테스트할 수 있다.
- `AppClient`는 타입이 있는 controller API만 호출하고 새 모듈은
  `AppClient.tsx`를 역으로 import하지 않는다.
- My Flow 공유 상태는 좁은 포트와 액션별 프로필을 통해서만 변경된다.
- 라우트·Back·포커스·스크롤·범위 저장 계약이 기존과 동일하다.
- 단계별 테스트, 전체 테스트, 프로덕션 빌드와 브라우저 회귀가 통과한다.
- 각 단계는 저장 데이터 마이그레이션 없이 독립적으로 되돌릴 수 있다.
- R1 종료 시 다음 리팩토링의 필요성과 위험을 다시 평가하며 자동으로
  다음 대규모 분리를 시작하지 않는다.
