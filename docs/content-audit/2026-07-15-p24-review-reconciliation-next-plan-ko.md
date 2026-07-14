# FlowMe P24 검토 통합 및 다음 실행 계획

작성일: 2026-07-15
성격: 제품 수정 전 계획 정합화
현재 제품 게이트: P24 실제 사용자 관찰, 0 / 15 세션

## 1. 결론

Codex production 검토, Claude Code clean regression, Claude Design heuristic 평가, 현재 저장소 백로그는 같은 결론을 가리킨다.

1. clean production에서 날짜, 반복 회차, draft 분할, hydration, 완료 취소, export 범위의 Blocking 결함은 재현되지 않았다.
2. Claude Design A-G 상호작용은 구현돼 있다.
3. 남은 핵심 위험은 기능 부재보다 발견성, 예측성, 인지 부하다.
4. 실제 사용자 관찰은 아직 0 / 15이므로 P24 완료나 대규모 재설계를 선언할 근거가 없다.
5. 다음 순서는 사전 검증 가능한 시각·접근성 항목을 좁게 확인한 뒤, 2인 파일럿, 15세션 관찰, P24-00C 의사결정, 관찰 기반 수정으로 고정한다.

## 2. 검토 자료별 현재 판정

| 자료 | 증거 종류 | 현재 판정 | 계획에 반영할 내용 |
| --- | --- | --- | --- |
| Codex independent production review | current command, current production browser | 핵심 product blocker 재현 0, P24 production E2E 14 / 14, route overflow·console error 0 | 정확성 기준선 유지, 실제 사용자 질문만 남김 |
| Claude Code clean regression | clean origin/main command/browser | dirty 환경의 기존 Blocking 주장 재현 0, A-G 구조 확인 | dirty 결과를 현재 제품 결함으로 승격하지 않음 |
| Claude Design P24 제품·UX 평가 | heuristic, static evidence | 관찰 시작 가능, 검증 미완료 | F1-F12를 사전 검증 또는 관찰 항목으로 분리 |
| 저장소 정본 STATUS / backlog control board | planning truth | P24 observed-user gate만 활성, 0 / 15 | 새 기능 백로그를 활성화하지 않음 |

자동화와 시뮬레이션은 실제 사용자 관찰로 계산하지 않는다.

## 3. 이미 닫혔거나 정정된 항목

| 항목 | 상태 | 근거와 처리 |
| --- | --- | --- |
| build 실패와 Vercel SSO | 현재 정정 | clean lockfile build와 공개 alias 익명 200 확인 |
| KST 날짜, 날짜 override, 재사용 날짜 유지 | 현재 정상 | production 및 targeted E2E에서 통과 |
| 반복 첫 회차만 보임 | 현재 정상 | occurrence, Calendar, ICS 회귀 통과 |
| memo draft 일부 항목 누락 | 현재 정상 | 분할 항목 표시와 whole export 통과 |
| 빈 miss 저장 | 현재 차단 | 필수 입력 회귀 통과 |
| /flows hard navigation, 저장 후 /my hydration | 현재 정상 | clean production에서 통과 |
| 전체 E2E 날짜 고정 fixture 2건 | 제품 결함 아님, 로컬 수정 완료 | 커밋 1aba5da가 고정 날짜를 상대 fixture로 교체. origin/main 반영 여부만 release housekeeping으로 추적 |

## 4. 다음 실행 레인

### Stage 0. P24-00V1 시각·접근성 preflight

목적: Claude Design이 관찰 없이 진행 가능하다고 한 항목을 실제 인터랙션 상태에서 먼저 재현한다. 확인되지 않은 heuristic을 바로 제품 수정으로 바꾸지 않는다.

| 항목 | 먼저 확인할 것 | 수정 조건 | 닫힘 조건 |
| --- | --- | --- | --- |
| F12 아이콘 accessible name | 연필, 이동, 삭제, export, Calendar control의 visible/accessible name과 keyboard | 이름 누락 또는 행동 맥락 누락이 재현될 때 | 390px/1024px 대표 상태에서 누락 0 |
| F1 mobile sticky 저장 바 | public Flow에서 sticky bar와 안내·주의·하단 nav의 bounding box | 실제 viewport overlap이 1건 이상일 때 | 대표 6개 public route overlap 0 |
| F10 preview checkbox | 저장 전 preview가 완료 control처럼 tab/label/시각 상태로 읽히는지 | 완료 semantics 또는 활성 실행 control처럼 보일 때 | preview 의미, 저장 후 completion 전환, CTA 위계 유지 |
| F11 accent 역할 | Home, Flow 찾기, 저장, 실행의 primary accent 역할 | 동일 역할이 서로 다른 색으로 오해될 때만 token 정리 | 색보다 행동 위계가 먼저 읽히고 contrast 통과 |

완료 조건:
- 각 항목을 reproduced, not_reproduced, observation_needed로 분류한다.
- 재현된 시각·접근성 결함만 최소 수정한다.
- IA, 정보 구조, 기능 범위는 바꾸지 않는다.
- 날짜 독립 E2E 수정의 merge/publish 경로를 확인한다.

### Stage 1. P24-00B1 두 명의 첫 세션

P1은 기준일 역산형 이사 Flow, P2는 날짜 없는 차량 점검 Flow를 사용한다. 진행자는 버튼 위치나 기능명을 먼저 설명하지 않는다.

| 참여자 | 시작 경로 | 반드시 관찰할 행동 | 연결 finding |
| --- | --- | --- | --- |
| P1 | Home 또는 Flow 찾기에서 이사 Flow | 저장 판단, 편집入口 첫 선택, 이사일 이동 결과 예측, 완료 취소, 전체 export 개수 예측 | F1, F2, F5, F6, F7, F12 |
| P2 | public 차량 점검 Flow | preview와 완료 구분, 저장, Calendar 날짜 없음 tray 발견, 날짜 지정, 완료 취소, 선택 export 개수 예측 | F1, F4, F5, F7, F10 |

기록 항목:
- 첫 탭과 잘못 누른 control
- 완료 시간과 뒤로 가기 횟수
- 힌트 단계 0-3
- 행동 전 결과 예측과 행동 후 실제 결과
- 신뢰 오류 여부
- 참가자의 표현을 그대로 적은 한 문장

즉시 중단 조건:
- 날짜가 잘못 이동함
- 항목 또는 메모가 사라짐
- export 범위와 실제 파일 내용이 다름
- 저장·재사용 후 실행 기록이 잘못 섞임

완료 조건: 사용 가능한 P1-S1, P2-S1 기록 2개. 선호 의견만으로 UI를 바꾸지 않는다.

### Stage 2. P24-00B2 첫 사용 5명 완성

나머지 세 persona를 추가한다.

1. 반복 루틴형: 운동 또는 청소, 현재 회차와 다음 회차, 완료·재개
2. 개인 draft형: URL miss 또는 메모, 구조 편집, 날짜·시간·반복, export
3. public 재사용형: preview, 저장, 단계 메모, 회고, 다시 쓰기

P1과 P2에서 발견된 Blocking만 먼저 고친다. 발견성 문제는 스크립트를 바꾸지 않고 같은 과업으로 비교한다.

완료 조건: 서로 다른 5명의 S1 기록 5개, F1-F12 관찰 coverage 표, 동일 실패가 반복되는 지점의 근거.

### Stage 3. P24-00B3 반환 세션으로 15 / 15 완성

각 참가자가 동일한 개인 상태로 두 번 돌아온다.

- S2: 일정 변경, 완료·완료 취소, 항목 메모, 전체·선택 export
- S3: 회고 확인, 재사용, 기준일 변경, 개인 수정 보존, 필요 시 원문 수정 메모

완료 조건: 5명 x 3회 = 15개 유효 세션, 새 기기처럼 시작한 첫 사용과 기억을 가진 반환 사용을 분리 기록.

### Stage 4. 외부 환경 증거

사용자 관찰과 병행한다.

1. 실제 Calendar 앱에 동일 ICS를 두 번 가져와 중복과 UID 동작 기록
2. 다른 브라우저 또는 기기에서 backup/restore를 수행하고 개인 수정·완료·메모 보존 기록

이 두 항목은 자동화가 대신 완료할 수 없다.

### Stage 5. P24-00C keep / change / defer / blocking

| 분류 | 판단 규칙 |
| --- | --- |
| Blocking | 데이터 손실, 잘못된 날짜, 잘못된 export membership, 재사용 기록 오염이 1회라도 재현됨 |
| High | 5명 중 2명 이상이 같은 핵심 과업을 힌트 없이 못 끝내거나 결과를 반복해서 잘못 예측함 |
| Medium | 과업은 끝냈지만 2명 이상이 같은 지점에서 되돌아가거나 잘못된 control을 먼저 선택함 |
| Keep | 5명 중 4명 이상이 힌트 없이 끝내고 신뢰 오류가 없음 |
| Defer | 단일 선호, 재현되지 않는 불편, 현재 가치 사슬과 직접 연결되지 않는 확장 요구 |

P24-00C 전에는 F2-F9의 병합, 재배치, 대규모 재설계를 시작하지 않는다.

### Stage 6. P24-00C2 관찰 기반 구현

우선순위는 미리 고정하지 않는다. 관찰 결과에 따라 아래 후보 중 반복 근거가 있는 것만 연다.

- public 저장 판단과 근거의 배치
- 편집入口와 열기의 역할 구분
- Today 실행 1행과 다음 예정의 멘탈모델
- Calendar 날짜 없음 tray 발견성
- export 범위와 결과 개수 예측
- 기준일·개별 날짜 이동 범위 예측
- 완료 취소·복구·재사용 발견성
- 반복 회차 구분
- 개인 메모와 원문 수정 메모 구분

각 구현은 하나의 관찰 패턴, 하나의 좁은 slice, 하나의 회귀 패키지로 분리한다.

### Stage 7. P24-00C3 마감 감사

- 관찰 기반 Blocking/High 수정 회귀
- 모바일 390px과 wide 1024px
- production build와 전체 E2E
- public alias 재배포
- 실제 사용자 근거와 자동화 근거 분리
- P25 또는 source v2 착수 여부 결정

## 5. 지금 열지 않을 항목

- arbitrary URL production fetch와 실제 AI provider
- source-backed add/delete/reorder UI
- source v2 merge UI
- 계정, DB, cloud sync
- Calendar, Notion, Todo OAuth
- Studio 5번째 탭 승격
- drag-and-drop 단독 조작
- 장식 중심의 대규모 visual redesign

dependency moderate 4건은 보안 severity가 올라가거나 upstream release가 준비될 때 별도 maintenance slice로 다룬다. 강제 downgrade나 audit fix --force는 사용하지 않는다.

## 6. 보존할 제품 원칙

1. Home과 Flow 찾기의 첫 행동은 URL 또는 메모 입력 하나로 명확하게 유지한다.
2. Today는 지금 실행할 한 행과 다음 예고를 구분한다.
3. 저장과 export는 Item이 아니라 Flow 범위를 먼저 설명한다.
4. My Flow, Calendar, export는 같은 개인 수정본과 실행 상태를 읽는다.
5. public Flow의 제작자, 원문, 주의, 지난 실행 기록을 삭제하지 않는다.
6. 설명을 늘리기보다 label, 위치, control 상태, preview로 해결한다.

## 7. 바로 다음 목표

AI가 바로 실행할 다음 slice는 P24-00V1 시각·접근성 preflight다. 사용자가 병행할 다음 행동은 P1-S1과 P2-S1 실제 관찰이다. 두 작업은 서로를 기다리지 않는다.

P24-00V1이 결함을 재현하지 못하면 코드 수정 없이 evidence만 닫는다. P1-S1/P2-S1에서 신뢰 오류가 나오면 관찰을 중단하고 해당 오류만 Blocking fix로 분리한다.
