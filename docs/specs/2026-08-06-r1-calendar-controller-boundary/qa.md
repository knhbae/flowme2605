# R1 QA 계약과 증거

## 환경

| 항목 | 값 |
| --- | --- |
| 작업 경로 | `D:\flowme2605\flow-r0-refactor` |
| 브랜치 | `codex/r0-behavior-preserving-architecture-refactor-20260806` |
| 기준 HEAD | `6612c4a344a8dbd24d087d50883d480b5be45397` |
| 발행·배포 | 범위 밖; 실행하지 않음 |
| 사용자 관찰 | 범위 밖; 자동 QA와 구분 |

## R1-00 변경 전 기준선

| 검사 | 결과 |
| --- | --- |
| `calendar-flow-scope`, `calendar-keyboard-navigation`, Calendar view-model 단위 테스트 | PASS — 20/20 |
| AppClient lock 계약 | PASS — 59/59 |
| Calendar/My Flow 관련 7개 E2E 파일 | PASS — 35/35 |

선별 E2E 기준선은 Calendar 렌즈, 모바일 선택일 시트, Flow 필터·날짜 이동,
실행 CRUD, My Flow 안전 분리, 경험 재구성, 표면 간 상태 초기화를 포함한다.

## 단계별 필수 검증

### R1-01 순수 전환

- 모든 공개 전환의 입력·다음 상태·효과 요청 단위 테스트
- 월 경계, 유효/무효 날짜, 빈 일정, stale Flow 선택 정규화
- 액션별 reset profile 차이
- `demo` 보존 Calendar→My Flow href
- React, DOM, `window`, localStorage, `AppClient` 역참조 없음

### R1-02 상태와 효과 연결

- 초기 demo/저장값 복원과 현재 effect 순서
- `flow:calendar:selected-flows:v1` 키와 JSON raw value 동등성
- picker 종료·stale 선택·`all` 범위 전환
- 초기 선택 날짜와 후속 선택 날짜 포커스
- My Flow 미저장 변경 확인과 액션별 공유 상태 초기화
- 각 작은 연결 후 lock, 관련 단위, build, 선별 E2E

### R1-03 상호작용 연결

- 이전·다음 월, 월 선택, 오늘, 첫 일정
- 단일 범위와 여러 Flow 선택
- 날짜 클릭과 키보드 날짜 이동
- 이벤트 클릭, 루틴·일정·Flow 더보기
- 모바일 선택일 시트 열기·닫기와 focus/scroll 반환
- Calendar→My Flow 정확한 query, `demo` 보존, 브라우저 Back 왕복
- My Flow 저장 완료 후 선택 날짜·표시 월 동기화

## 최종 게이트

| 검사 | 완료 기준 |
| --- | --- |
| 문서 | `npm.cmd run docs:check` 통과 |
| 구조 잠금 | AppClient lock 전체 통과 |
| 단위·계약 | 전체 `npm.cmd test` 통과 |
| 빌드 | 프로덕션 build 통과 |
| 브라우저 | 관련 선별 E2E와 전체 E2E 통과 |
| 화면 | 390, 1024, 1440에서 overflow·console·page·HTTP 오류 없음 |
| 의존성 | 순수 모듈의 React/DOM/browser 의존과 새 모듈의 AppClient import 없음 |
| 변경 범위 | `git diff --check` 및 독립 scoped diff 감사 통과 |

## 동등성 판정

자동 검증 통과만으로 동작 보존을 단정하지 않는다. 다음 항목이 함께
확인되어야 R1 완료로 판정한다.

- UI·문구·DOM 계약에 의도한 차이가 없음
- route/query/Back/focus/scroll에 의도한 차이가 없음
- localStorage key/value와 저장 데이터에 의도한 차이가 없음
- 결과물과 완료 기록 규칙에 의도한 차이가 없음
- Calendar가 My Flow 데이터의 두 번째 소유자가 되지 않음

## 실패와 롤백

단계별 회귀가 발견되면 해당 controller 연결만 기존 `AppClient` 상태와
callback으로 되돌린다. 저장 형식은 바꾸지 않으므로 데이터 역마이그레이션은
필요하지 않아야 한다. 원인을 특성화 테스트로 고정하기 전 다음 단계로
진행하지 않는다.

## 증거 원칙

- 이 문서에는 실제 실행한 결과만 PASS로 기록한다.
- 로컬 구현, Git 발행, 배포, 프로덕션 smoke, 사용자 관찰을 별도 상태로
  보고한다.
- 내부 자동화와 시뮬레이션은 사용자 관찰 검증으로 세지 않는다.

## R1 최종 로컬 결과

| 검사 | 결과 |
| --- | --- |
| 문서·로컬 링크 | PASS — 16개 필수 문서, 4,469개 로컬 링크 |
| 순수 Calendar controller 계약 | PASS — 12/12 |
| 선행 단위 묶음 | PASS — 138/138 |
| AppClient lock 계약 | PASS — 59/59 |
| 전체 단위·계약 | PASS — pretest 138/138, 본 테스트 615/615 |
| 프로덕션 build | PASS |
| Calendar/My Flow 선별 E2E | PASS — 37/37 |
| 전체 Playwright | PASS — 535/535 |
| 대표 화면 | PASS — 390×844, 1024×768, 1440×1000에서 문서·body 가로 넘침 0 |
| 브라우저 오류 | PASS — console error/warning 0, 확인한 요청 200 |
| 독립 scoped diff 감사 | PASS — P1/P2/P3 0; 발견한 날짜 없는 routine-overflow 차이를 수정 후 재감사 |
| Git 발행·배포·프로덕션 smoke | NOT_RUN — R1 범위 밖 |
| 사용자 관찰 | NOT_RUN — R1 범위 밖이며 자동 QA에 포함하지 않음 |

전체 E2E의 첫 두 시도는 테스트 실패가 아니라 실행 래퍼 제한으로 중단되어
결과에서 제외했다. 최종 수치는 제한을 충분히 늘려 완주한 한 번의 실행만
기록한다. 전체 E2E가 갱신한 기존 증거 스크린샷은 검증 부산물이므로 기준
커밋 내용으로 복원했고 R1 변경에 포함하지 않았다.
