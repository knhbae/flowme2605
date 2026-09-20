# FlowMe 통합 PoC 미충족 해소 v1 Spec

**Date:** 2026-09-02

**Status:** In Progress

**Owner:** FlowMe 통합 PoC 작업 세션

**Related evidence:**

- [통합 요구사항 추적 보고서](../../content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-ko.html)
- [추적·판정 방법](../../content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-method-ko.md)
- [검증 manifest](../../content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-assets/verification-manifest.json)

## 1. 목표

개인공간 v4.1, 개발 1, 개발 2의 세 결과물을 현재 통합 PoC에 빠짐없이
연결한다. 요구사항 추적 감사에서 확인한 부분 충족·미충족·결정 필요 항목을
제품 결정, 데이터·전환 설계, UX·디자인, 구현, 자동 검증, 실제 기기 검사,
관찰 사용자 검증으로 분리해 단계적으로 닫는다.

이 문서의 완료는 모든 항목을 무조건 구현했다는 뜻이 아니다. 확정 요구는 적절한
실행 증거와 함께 충족하고, 서로 충돌하는 요구는 owner 결정 뒤 구현 또는 의도적
변경으로 분류하며, 명시적 범위 밖 항목은 금지 경계가 유지됐음을 증명해야 한다.

## 2. 세 결과물과 판정 모수

| 코드 | 결과물 | 통합에서 맡는 역할 | 요구 수 | 감사 기준 gap | 현재 gap |
| --- | --- | --- | ---: | ---: | ---: |
| `V41` | 개인공간 v4.1 | 폴더·기간·QuickItem·이동·완료의 화면과 조작 문법 | 78 | 30 | 13 |
| `D1` | 개발 1 · `D1 baseline session` | 네 saved-plan origin, 공통 Plan·Item 편집, lifecycle·복구 owner | 26 | 22 | 21 |
| `D2` | 개발 2 · `D2 baseline session` | 일반 Text Authoring, 구조·결과·작성 틀, creator/personal 경계 | 64 | 46 | 45 |
| 합계 | 세 제품 결과물 | 동등한 1차 근거 | 168 | 98 | 79 |

통합 blueprint의 86개 행은 네 번째 제품 결과물이 아니다. 세 결과물 사이의
identity, 저장 owner, 화면 연결, 공통 시나리오를 검사하는 bridge contract다.
이 중 현재 gap은 22개다.

### 2.1 gap 구성

- Primary 98개: 부분 69, 미충족 26, 결정 필요 3
- 1차 safe batch 뒤 열린 Primary 91개: 부분 63, 미충족 25, 결정 필요 3
- 2차 safe slice 뒤 열린 Primary 88개: 부분 60, 미충족 25, 결정 필요 3
- 3차 A8 safe fidelity 뒤 열린 Primary 84개: 부분 57, 미충족 24, 결정 필요 3
- 4차 A9 safe slice 뒤 열린 Primary 81개: 부분 54, 미충족 24, 결정 필요 3
- A0 작업 결정 뒤 열린 Primary 79개: 부분 55, 미충족 24, 결정 필요 0
- 초기 98개 gap 우선순위: P0 70, P1 28, 실제 P2 open gap 0
- 현재 79개 gap은 단계별 package와 exit gate에서 관리한다. 우선순위 상세는
  traceability JSON을 정본으로 삼는다.
- Bridge 22개: 부분 19, 미충족 3, 결정 필요 0
- 복합 부모 77개, 하위 관찰 조건 386개
- 하위 관찰 조건: 충족 242, 부분 61, 미충족 68, 의도적 변경 4,
  결정 필요 6, 제외 5

현재 V41 판정은 충족 53, 부분 10, 미충족 3, 의도적 변경 6, 제외 6이다.
D1 열린 gap은 21개, D2 열린 gap은 45개, bridge gap은 22개다. 하위 관찰 조건의
수치 변화에는 과대 판정이었던 D2 ghost 항목 세 건을 보수적으로 재판정한 결과도
포함한다.

판정 모수는 아래 JSON을 정본으로 삼는다.

- `requirements-v41.json`
- `requirements-d1.json`
- `requirements-d2.json`
- `requirements-bp.json`
- `requirements-subchecks.json`

경로는 모두
`docs/content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-assets/`
아래다.

## 3. Stage fit

현재 단계의 목적은 세 산출물을 운영 제품으로 즉시 이관하는 것이 아니라, 하나의
제품 흐름으로 합칠 때 생기는 기능·화면·소유권 gap을 격리 PoC 안에서 해소하고
운영 통합 전에 필요한 결정을 드러내는 것이다.

따라서 다음은 이 단계에 포함한다.

- 98개 primary gap과 24개 bridge gap의 단계형 해소
- 공통 read model, shadow state, transition, staged save, recovery 설계
- v4.1 이동·반응형·접근성 fidelity 개선
- D1 origin·편집·결과·복구 흐름 연결
- D2 한 editor·선택형 구조 검토·작성 틀·결과 흐름 연결
- 자동 테스트, 브라우저 시나리오, 실제 기기와 관찰 사용자 계획의 분리
- 각 변경 뒤 traceability 판정과 증거 등급 갱신

다음은 포함하지 않는다.

- 운영 schema·key migration, dual read, rollback rollout
- 기존 완료·메모·날짜·보관·export writer 호출
- 기본 `/my` 화면 변경
- 계정·cloud·AI·외부 동기화·공개 발행·correction marketplace
- 별도 승인 없는 commit, push, PR, Preview, Production 배포
- 자동 QA를 실제 기기 또는 관찰 사용자 검증으로 표현하는 일

## 4. 절대 경계

1. PoC 진입점은 exact query `/my?personalWorkspacePoc=v1`이다.
2. query가 정확하지 않거나 origin·payload가 지원되지 않으면 기존 `/my`로
   fail-closed한다.
3. 쓰기는 `flow:poc:personal-workspace:v1:*` namespace에서만 허용한다.
4. 기존 `flow:*` key와 운영 backend 데이터는 읽기·투영만 한다.
5. 기존 완료·메모·날짜·보관·export writer를 호출하지 않는다.
6. `localStorage.clear()`를 호출하지 않는다. 초기화는 정확한 PoC key 또는 prefix만
   대상으로 하며 실패 시 원래 bytes를 복구한다.
7. 기본 `/my`, 기존 route semantics, 운영 key/schema는 변경하지 않는다.
8. `<workspace>/flow-mvp`의 dirty·미추적 파일은 미소유다. 수정·삭제·정리·stage하지
   않는다.
9. 현재 격리 worktree의 기존 변경도 작성자를 확인하지 못한 경우 미소유로 취급하고,
   작업 패키지에 필요한 파일만 좁게 수정한다.
10. 별도 요청 전 commit·push·PR·Preview·Production을 진행하지 않는다.

## 5. 공통 제품·데이터 계약

- Canonical 흐름은 `SourceRow -> Item -> Step -> Flow -> Bundle/Flow Map`이다.
- `Item`은 독립적으로 이동·완료·기록되는 최소 단위다.
- Calendar, Todo, Sheet, TXT/Memo, Today는 같은 effective Item의 projection이다.
- saved-plan identity는 `savedCopyId + flowId + itemId`를 기본으로 하며 반복 회차를
  채택하는 단계에서만 `occurrenceId`를 별도 승인한다.
- Flow Item은 부모 Flow의 폴더를 상속한다.
- Item 날짜 이동은 개인 실행 위치만 바꾸며 원본 일정과 Flow 소속을 바꾸지 않는다.
- source-owned 설명·완료 기준·출처와 personal-owned title·memo·execution placement를
  화면과 저장에서 분리한다.
- drag, 길게 누르기, `…` 메뉴, 키보드는 같은 순수 transition을 호출한다.
- 같은 위치, 취소, Escape, pointer cancel, stale, 저장 오류는 mutation 0이다.
- PoC 임시 기본값은 versioned contract 또는 상수로 관리하며 운영 정책으로 승격하지
  않는다.

## 6. A0 PoC 작업 결정 — 완료

A0는 영구 제품 정책이나 운영 이관 승인이 아니라, 이번 exact-query 격리 PoC가 다음
구현 단계로 안전하게 진행하기 위한 작업 결정이다. 선택 이유, 거절안, 화면·데이터
owner, write 경계, 재검토 조건과 acceptance scenario의 정본은
[A0 결정 기록](./a0-decision-record.md)에 있다.

| Gate | 이번 PoC 선택 | 후속 또는 보류 | 관련 요구 |
| --- | --- | --- | --- |
| A0-1 D2 저장 lane | 일반 텍스트는 명시적 확인 뒤 Personal Flow로 handoff | CreatorDraft·공개는 별도 lane으로 보류 | `D2-005,057`, `BP-027,032` |
| A0-2 D1 운영 owner | 기존 데이터는 no-write projection, 변경은 shadow staged command | 운영 이관 때 기존 D1 공통 editor·lifecycle owner 재사용 | `D1-010`, `BP-002,006,038,049,056,080` |
| A0-3 통합 shell | production PlatformNav·cobalt를 global owner로 유지하고 v4.1 teal은 workspace 내부 accent로 제한 | 기본 `/my` shell 변경 금지 | `V41-001,029,036,053`, `D1-013,014`, `D2-007,043` |
| A0-4 Authoring 상호작용 | 한 text editor, 선택형 구조 검토, 작성 틀 1회 삽입, global ghost | 강제 단계형 editor와 별도 template form은 채택하지 않음 | `D2-022,029~039,044,053~056`, `BP-033,053,074` |
| A0-5 advanced scope | 미지원 recurrence·public S3·table/source update는 보존하거나 fail-closed | 별도 승인과 loss-safe adapter 전까지 제외 | `D2-016,024~026`, `BP-019,075`, `V41-075,077` |
| A0-6 standalone 역할 | React가 제품 구현 정본, standalone은 core 사용자 조작 parity를 갖춘 offline fixture | live origin·운영 integration 증거는 React만 담당 | `V41-004,005,007,010` 및 standalone 관련 하위 판정 |

A0 관련 primary의 `결정 필요`는 0건이 됐다. 이 중 실제 기능이 아직 없는 항목은
`충족`으로 올리지 않고 `부분`, `의도적 변경`, `제외`로 나눴다. 따라서 A0 완료는
남은 구현 gap을 숨기지 않으며 운영 writer·migration·배포 권한도 열지 않는다.

## 7. A0와 무관하게 바로 진행 가능한 safe lane

다음 항목은 운영 정책이나 writer를 새로 정하지 않고 PoC 안에서 완결되므로 A0와
병행할 수 있다.

- 전용 터치 손잡이의 350ms 시작, 8px 취소, 후속 합성 click 억제
- pointer cancel·Escape·빠른 스크롤·window 변화 뒤 mutation 0
- 왼쪽 날짜·폴더 목적지와 오른쪽 원 목록 reorder corridor, 3px before/after 삽입선
- 36~72px edge zone과 RAF 기반 auto-scroll, 매 frame target 재판정
- 이동 손잡이의 스크린리더 지침과 비드래그 키보드 경로
- 맨 위·위·아래·맨 아래를 같은 `reorder` transition으로 처리하는 비드래그 이동
- 월간 점유 날짜와 펼친 28개 빈 날짜의 날짜별 QuickItem 진입
- 짧은 가로 화면의 panel·dialog 내부 scroll과 reload 뒤 compact Undo 노출
- 상하좌우 safe area와 강제 inset 브라우저 검사
- 통합 state model의 고정 seed 5,000회 연속 조작 시뮬레이션

### 7.1 현재 safe batch 상태

1차 batch의 다섯 묶음과 2차 safe-area·scroll slice에 이어 3차 A8에서 오른쪽 원 목록
corridor, 3px before/after 삽입선, 하나의 live owner, active pointer 중 trusted
mouse-wheel 취소, 844×300 reduced-motion 환경의 화면 밖 날짜 auto-scroll·drop·Undo를
닫았다. 내부 순서 대상은 click·키보드 대안으로 남고 drag는 오른쪽 원 목록 corridor만
사용한다. standalone은 같은 목록 순서 corridor와 edge-scroll을 검증했지만 중앙 dialog의
왼쪽 destination parity와 화면 밖 날짜 시나리오는 닫지 않았다.

4차 A9 safe slice에서는 React와 standalone의 이동 창에 맨 위·위·아래·맨 아래를
복원하고 모두 기존 `reorder` transition으로 수렴시켰다. 월간은 점유 날짜와 펼친 빈
날짜를 세로 section으로 만들고 각 날짜에서 QuickItem을 그 날짜로 생성한다. 2026-09
fixture의 빈 날짜는 정확히 28개다. pointer cancel은 ghost·강조·상태·RAF를 모두
정리하고 write 0으로 끝난다. 844×390에서는 이동 dialog/panel이 화면 안에서 독립
scroll되며, 세로·짧은 가로 화면 모두 reload 뒤 마지막 성공 상태와 한 칸 Undo를
노출한다.

A9 targeted fresh 결과는 통합 모델·component 76/76, standalone 모델 30/30,
React+standalone 기능 브라우저 27/27이다. standalone 844×390 월간·QuickItem·내부
scroll 시나리오는 3회 반복해 3/3을 통과했다. 전체 회귀·build·문서 검사의 최종 수치는
갱신된 `verification-manifest.json`을 정본으로 삼는다.

완료 표시는 운영 통합, 실제 Android/iOS, 관찰 사용자 검증 완료를 뜻하지 않는다.

## 8. Gap closure 패키지

| 패키지 | 유형 | 우선순위 | Primary 요구 | Bridge 요구 | 완료 결과 |
| --- | --- | --- | --- | --- | --- |
| `A0` | 제품 결정 | P0 gate | `V41-001`; `D1-010,013`; `D2-005` | `BP-002,006,019,056,075` | owner·화면·write 경계와 구현/보류 판정 확정 |
| `A1` | Canonical·원문 보존 | P0 | `D1-005,006,017,025`; `D2-002,004,011,012,013,016,018` | `BP-032,033` | source/personal/execution 계층과 loss-safe adapter |
| `A2` | 통합 진입·origin·Map | P0/P1 | `D1-009,016,019,024` | 없음 | 한 입력, 네 origin, Map 평탄화·child 선택 |
| `A3` | 공통 편집·staged save | P0 | `D1-001,002,003,004,012,018`; `D2-021,035,036,039,040` | `BP-038,080` | 공통 Item editor와 Plan 단위 원자 적용 |
| `A4` | 상태·오류·Undo receipt | P0 | `D1-011`; `D2-058` | `BP-059,060,062,063` | 저장 상태와 구체 값, 원상 복구·재시도 |
| `A5` | Text·Todo·Calendar 결과 | P0 | `D1-021,022,023`; `D2-003,017,019,020` | `BP-007,035,049,069,079` | 같은 Item ref의 전체 projection parity |
| `A6` | 한 editor·선택형 구조 | P0 | `D2-022,029,030,031,032,033,034,037,038,043,044,055` | `BP-074` | 입력→결과 기본, 선택형 구조 검토, contextual helper |
| `A7` | 작성 틀·ghost transaction | P0/P1 | `D2-046,050,052,053,054,056` | 없음 | 1회 삽입·caret·native Undo/Redo·ghost 무영향 |
| `A8` | v4.1 이동 fidelity | P0/P1 | `V41-004,005,006,007,008,009,010,018,019,020,037,043,051,058,065,066,067,068` | 없음 | handle·corridor·삽입선·auto-scroll·공통 transition |
| `A9` | shell·반응형·접근성 | P0/P1 | `V41-028,033,034,036,049,053,070`; `D1-014,015`; `D2-007,042,061` | 없음 | token 적용, safe area, breakpoints, 200%, 핵심 행동 가림 0 |
| `A10` | 고급 fidelity adapter | P1 | `D2-023,024,025,026,041` | `BP-017,027,053` | fixture·near-miss·Quick conversion·table/source update |
| `A11` | CreatorDraft 관리 | 조건부 P0 | `D2-057` | 없음 | 선택한 authoring lane의 저장·검색·복제·보관·재진입 |
| `A12` | 증거 폐쇄 | P0/P1 | `V41-047,062,063,064`; `D2-063` | `BP-081,083` | fresh 자동 QA, 실기, 관찰 사용자를 분리해 완료 |

이 분류는 primary gap 98개와 bridge gap 24개를 각각 한 번씩 포함한다. 한 요구가
여러 패키지의 dependency가 될 수 있지만, 진행률과 최종 owner는 위 표의 대표
패키지에서 관리한다.

## 9. FlowMe gates

| Gate | Decision |
| --- | --- |
| First user action | 기존 Flow를 찾거나 일반 텍스트를 입력해 한 통합 여정을 시작한다. |
| Completion signal | 저장·이동·완료·Undo 뒤 같은 Item이 상세와 기간 projection에서 일치하고 reload 뒤 복원된다. |
| Artifact destination | Text, Todo, Calendar, Sheet/TXT 또는 PoC 내부 실행 상태이며 선택한 authoring lane을 명시한다. |
| Source/risk boundary | 원문·출처·완료 기준은 read-only source layer, 개인 title·memo·placement·completion은 PoC shadow layer다. |
| Natural artifact | 사용자가 작성한 일반 텍스트, 저장된 Flow, QuickItem, 날짜·폴더·순서·완료 상태다. |
| Service structure impact | exact-query PoC route와 전용 component/model/store만 변경한다. 운영 통합 결정 전 `SERVICE_STRUCTURE.md`나 운영 writer를 바꾸지 않는다. |
| Tooling lane | 모델·store 단위 테스트, React component test, Playwright, production build, docs check, 실제 기기, 관찰 사용자 순이다. |
| Verification | 98+24 coverage, mutation audit, 다섯 필수 viewport, Android/iOS 실기, 사용자 과업을 각각 별도로 판정한다. |

## 10. 전체 acceptance criteria

- 세 결과물 168개 요구와 blueprint 86개 bridge 행의 denominator가 유지된다.
- gap 98개와 bridge gap 24개가 A0~A12 중 하나에서 추적된다.
- 각 패키지는 기획, UX/디자인, 개발 설계, 구현, 검증, exit gate를 모두 통과한다.
- 제품 결정이 필요한 항목은 A0 승인 전 구현되지 않는다.
- safe lane 구현은 운영 제품 정책 또는 schema 승인으로 표현하지 않는다.
- 네 saved-plan origin이 중복 없이 같은 read model과 공통 상세로 열린다.
- authoring 원문과 source-owned 값은 손실 없이 유지되고, 미지원 fidelity는 silent drop
  대신 차단·수정·명시적 보류로 처리된다.
- drag, 길게 누르기, 메뉴, 키보드가 같은 transition 결과를 만든다.
- 같은 위치·취소·Escape·pointer cancel·stale·실패의 state와 storage mutation은 0이다.
- 성공 state는 reload 뒤 복원되고 손상 payload는 기존 `/my`로 fail-closed한다.
- 허용 prefix 밖 `setItem`, `removeItem`, `clear` 호출이 0이다.
- 격리 fixture와 browser context의 운영 sentinel key/value가 전후 byte-identical이다.
- `npm test`, production build, 관련 Playwright, 문서 검사를 fresh 실행해 실제 개수를
  기록한다.
- 390×844, 375×812, 844×390, 1024×768, 1440×900에서 가로 넘침, console error,
  page error, 핵심 행동 가림이 0이다.
- Android Chrome, iOS Safari, 보조기술, 관찰 사용자는 자동 QA와 별도 상태·수치로
  보고한다.
- commit, push, PR, Preview, Production 상태를 각각 분리해 보고한다.

## 11. 의도적 변경·제외 장부

다음 22개는 자동 구현 백로그로 바꾸지 않는다. 결정 이유와 재검토 조건, 금지
경계를 유지한다.

- V41: `029,035,040,069,071,072,073,074,075,076,077,078`
- D2: `008,027,028,060,062,064`
- BP: `008,036,054,057`

dark mode, sync, public, 외부 도구, 반복 runtime, 배포, 계정·cloud·AI는 별도 승인
전까지 제외한다. exact-query route와 PoC persistence는 정적 v4.1에서 의도적으로
확장한 항목이지만 운영 이관 승인은 아니다.

## 12. 증거 해석

- E1: 문서·코드·정적 화면
- E2: 순수 모델·컴포넌트 테스트
- E3: 실제 브라우저 자동화·캡처
- E4: E1~E3와 회귀·build를 같은 worktree에서 fresh 확인
- E5-D: 실제 Android Chrome·iOS Safari
- E5-U: 관찰 사용자 과업

E3·E4는 E5-D나 E5-U를 대신하지 않는다. 사용자 실제 browser profile이나 운영
backend를 직접 열지 않은 storage 검사는 격리 fixture와 browser context의 증거로만
보고한다.
