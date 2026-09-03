# FlowMe 통합 PoC 격차 해소 v1 검증 보고

**기준 시각:** 2026-09-02 14:46 KST

**상태:** 단계형 실행 설계·4차 A9 safe slice·A0 PoC 작업 결정 완료 / 미게시

## 1. 이번 단계 결과

- 개인공간 v4.1, 개발 1, 개발 2의 168개 요구를 유지한 채 초기 primary gap
  98개를 A0~A12 패키지로 배치했다.
- 제품 결정을 우회하지 않는 safe batch와 A0 판정 정리를 통해 열린 primary gap을
  79개로 줄였다.
  A8의 `V41-019,020,043,067`에 이어 A9에서 `V41-028,065,070`을 새로 `충족`으로
  올렸다.
- React와 standalone에 전용 350ms handle, 실제 거리 8px 취소, 합성 click 1회 억제,
  pointer·scroll·invalid-drop cleanup을 보강했다.
- React workspace와 authoring에 네 방향 safe-area seam, skip link, 16px mobile form
  seam, 스크린리더용 이동 지침을 추가했다.
- React move/item/reset surface와 standalone dialog/toast의 강제 inset 외곽 경계,
  trusted touch scroll 뒤 mouse drag 연속성을 추가 검증했다.
- 오른쪽 원 목록 corridor, 3px before/after 삽입선, 하나의 live owner, active pointer 중
  trusted mouse-wheel 취소와 첫 click 억제를 검증했다.
- 844×300 reduced-motion에서 처음 화면 밖에 있던 날짜 target까지 panel을 연속
  auto-scroll하고 날짜 이동·Undo하는 React 시나리오를 검증했다.
- React와 standalone의 맨 위·위·아래·맨 아래를 같은 `reorder` transition으로
  연결하고 경계 no-op의 write 0을 검증했다.
- 월간 점유 날짜와 펼친 28개 빈 날짜를 세로 section으로 만들고 각 날짜의 48px
  QuickItem 진입에서 해당 날짜가 정확히 저장되는지 검증했다.
- pointer cancel 뒤 ghost·강조·상태·RAF가 모두 정리되고, 844×390에서는 move
  dialog/panel이 내부 scroll되며 reload 뒤 compact Undo가 남는지 검증했다.
- 현재 통합 state model을 대상으로 고정 seed 5,000-step 연속 조작을 실행한다.
- 단계 0~6의 기획→UX/디자인→개발 설계→구현→검증→Exit gate를 문서와 조작형
  HTML 보고서로 만들었다.

## 2. 자동 검증

| 구분 | 명령/범위 | 결과 |
| --- | --- | ---: |
| 통합 PoC 모델·gate·storage·component | `npm.cmd run test:personal-workspace-poc` | 76/76 PASS |
| standalone 모델·저장·단일 파일 build | `node --test .../standalone.test.cjs` | 30/30 PASS |
| A9 React+standalone 기능 브라우저 | 두 기능 suite | 27/27 PASS |
| A9 844×390 standalone 반복 | 월간 28개·날짜별 Quick·내부 scroll | 3/3 PASS |
| A9 844×300 React 반복 | reduced-motion·화면 밖 DATE drop·Undo | 10/10 PASS |
| 전체 npm 회귀 | `npm.cmd test` | 1,561/1,561 PASS |
| production build | `npm.cmd run build` | 18/18 static page generation PASS |
| 통합 관련 Playwright 7개 suite | 기능·authoring·standalone·보고서 | 37/37 PASS |
| A8 핵심 반복 | corridor·date·offscreen date·active-scroll 4건 × 2회 | 8/8 PASS |
| A8 관련 반복 | 별도 agent의 관련 6건 × 2회 | 12/12 PASS |
| 단계형 HTML 보고서 targeted E2E | 필터·링크·5 viewport·write 0 | 2/2 PASS |
| A0 결정 패킷 targeted E2E | 6개 결정·3종 필터·5 viewport·write 0 | 2/2 PASS |
| 문서 검사 | `npm.cmd run docs:check` | 최종 verification manifest 참조 |
| diff whitespace 검사 | `git diff --check` | 오류 0 |
| 의존성 보안 감사 | `npm.cmd run security:audit` | FAIL · 기존 의존성 2건 (`browserslist` high 1, `postcss-selector-parser` low 1) |

고정 seed 5,000-step은 76개 통합 PoC 테스트 중 하나이며 사용자 수로 세지 않는다.
A8 자동 pointer와 Chromium wheel은 브라우저 자동화 증거이며 실제 touch·실제 기기
검사로 세지 않는다.
보안 감사 실패는 기능·회귀 테스트 실패로 합치지 않았다. 이 단계에서는 범위를 넓혀
`npm audit fix`를 실행하지 않았으며, 의존성 갱신은 별도 검토가 필요하다.

### 2.1 A0 결정 패킷 화면 비교

기존 단계 계획 보고서의 white/gray/teal 시각 문법을 재사용해 별도 스타일 체계를
만들지 않았다. fresh Chromium screenshot을 직접 비교한 결과는 다음과 같다.

- 390×844: hero 제목·세 CTA·상태 pill이 겹치지 않고 2열 metric으로 전환된다.
- 375×812: 390px 규칙을 유지하며 가로 넘침과 잘린 터치 대상이 없다.
- 844×390: sticky header를 일반 흐름으로 바꿔 짧은 세로 공간을 확보한다.
- 1024×768: 결정 행과 설명이 같은 읽기 순서로 유지되고 표는 table 상태를 유지한다.
- 1440×900: 여정·metric·결정 필터의 위계가 기존 단계 계획 보고서와 일치한다.

자동 측정상 가로 넘침, console error, page error, 가려진 주 행동은 각 viewport 0건이다.
이는 브라우저 자동화와 screenshot 검토이며 실제 기기·관찰 사용자 증거가 아니다.

## 3. 필수 시나리오

| # | 시나리오 | 결과 | 증거 범위 |
| ---: | --- | --- | --- |
| 1 | 네 origin의 Flow가 중복 없이 미분류에 보이고 상세로 열린다 | PASS | read-model unit + React E2E |
| 2 | QuickItem 생성→날짜·폴더 이동→Undo | PASS | state unit + React/standalone E2E |
| 3 | Flow 폴더 이동과 Item 하나의 개인 실행 날짜 이동 | PASS | source date·Flow 소속 불변 assertion |
| 4 | Today 완료→상세·기간 확인→다시 열기 | PASS | 같은 shadow state projection E2E |
| 5 | drag·길게 누르기·메뉴·키보드 결과 동등 | PASS | 공통 transition과 결과 signature 비교 |
| 6 | 같은 위치·취소·Escape·pointer cancel·저장 오류 mutation 0 | PASS | raw state bytes·storage call audit |
| 7 | reload 복구와 손상 payload fail-closed | PASS | React/standalone state·draft E2E |
| 8 | 시나리오 전후 operating `flow:*` bytes 동일 | PASS | 격리 sentinel snapshot 비교 |

이번 safe batch는 추가로 다음 연속 동작을 검사한다.

- 6×6px 대각 이동은 `Math.hypot`이 8px을 넘으므로 길게 누르기를 취소한다.
- 취소 직후 synthetic click은 메뉴를 열지 않고, 다음 실제 click은 정상 동작한다.
- 길게 누른 상태에서 Escape 뒤 pointerup·click이 메뉴를 다시 열지 않는다.
- pointer cancel·scroll·invalid drop 뒤 `.dragging`과 `.drop-target`이 남지 않는다.
- 취소 전후 PoC exact key bytes와 운영 sentinel이 같다.
- trusted touch로 행 본문 scrollY가 증가해도 dialog·저장은 0건이고, 이어진 mouse
  reorder는 같은 fixture에서 성공한다.
- 오른쪽 원 목록 corridor에서 midpoint 전후에 따라 3px 선과 live 위치 문구가 바뀌고,
  current·outside는 write 0, 유효 drop은 1회 write, Undo는 1회 write다.
- active synthetic pointer 중 `isTrusted=true` mouse wheel로 실제 scrollY가 증가하면
  이동은 취소되고 첫 합성 click만 억제되며 다음 click은 정상 동작한다. 저장은 0건이다.
- 844×300 reduced-motion에서 처음 화면 밖인 날짜 target까지 panel scrollTop이 실제로
  증가하고 frame delta가 1~8px이며, 날짜 drop과 Undo가 각각 1회 저장된다.
- 맨 위·위·아래·맨 아래는 같은 reorder resolver와 transition을 사용하며, 이미 경계에
  있는 방향은 disabled/no-write다.
- 월간 점유 날짜와 펼친 28개 빈 날짜 모두 날짜별 QuickItem을 만들 수 있고 취소·오류는
  write 0이다.
- pointer cancel 뒤 ghost·강조·상태·RAF가 0이고 저장 bytes는 그대로다.
- 844×390에서 move dialog/panel은 viewport를 넘기지 않고 내부 scroll로 모든 조작에
  도달하며, portrait와 short landscape에서 reload 뒤 마지막 성공 상태와 Undo가 보인다.
- React shell의 활성 live owner는 정확히 하나다.
- 강제 24/18/30/22px inset에서 move panel, item/reset sheet, dialog, toast가 경계
  안에 남는다.

## 4. 브라우저 화면 평가

| viewport | React workspace/authoring | standalone | 단계·추적·검증 보고서 | 남은 확인 |
| --- | --- | --- | --- | --- |
| 390×844 | overflow·console·page error·가림 0, skip-link·sheet 동작 | core 조작·handle·fallback PASS | 필터·주행동 PASS | 실제 Android keyboard·gesture |
| 375×812 | 같은 기준 PASS | 같은 기준 PASS | 같은 기준 PASS | 200% 확대 |
| 844×390 | compact view, panel 내부 scroll, 월간 날짜별 Quick·Undo PASS | 정확히 28개 빈 날짜·날짜별 Quick·dialog 내부 scroll PASS | short-landscape layout PASS | 실제 기기 회전·키보드 |
| 1024×768 | list+execution과 item sheet/inspector 경계 PASS | core 조작 PASS | table→mobile-card 전환 없음, overflow 0 | A0 shell 결정 뒤 재평가 |
| 1440×900 | wide inspector와 move panel corridor 폭 PASS | core 조작 PASS | wide layout·필터 PASS | v4.1 flat list와 production shell 정합성 |

자동 브라우저 검사에서 가로 넘침, console error, page error, 가려진 primary action은
0건이었다. screenshot은 자동 브라우저 관찰 자료이며 실제 기기 검사가 아니다.

## 5. 운영 데이터 불변 증거

- 허용 namespace: `flow:poc:personal-workspace:v1:*`
- 허용 prefix 밖 `setItem`: 0
- 허용 prefix 밖 `removeItem`: 0
- `localStorage.clear()`: 0
- 격리 operating sentinel 변경 byte: 0
- reset 두 번째 remove 실패 시 두 PoC exact key의 이전 byte 복원: PASS
- 사용자의 실제 browser profile과 운영 backend: 열지 않음
- 원본 dirty repo `<workspace>/flow-mvp`: 읽기 전용 조사만 수행, stage 0

따라서 byte parity는 자동 테스트가 만든 격리 localStorage fixture와 browser context에
대한 증거다. 사용자의 실제 브라우저 저장소나 운영 backend를 검사했다는 뜻은 아니다.

## 6. 요구 판정 변화

| 구분 | 초기 | 현재 |
| --- | ---: | ---: |
| Primary 전체 | 168 | 168 |
| 열린 Primary gap | 98 | 79 |
| V41 열린 gap | 30 | 13 |
| D1 열린 gap | 22 | 21 |
| D2 열린 gap | 46 | 45 |
| Bridge gap | 24 | 22 |

현재 V41은 충족 53, 부분 10, 미충족 3, 의도적 변경 6, 제외 6이다. 전체 열린
primary gap 79개는 부분 55, 미충족 24, 결정 필요 0으로 구성된다. 복합 부모는 77개,
하위 관찰 조건은 386개이며 충족 242, 부분 61, 미충족 68, 의도적 변경 4,
결정 필요 6, 제외 5다.

누적 `충족` 전환은 `V41-004,005,006,010,019,020,028,033,034,043,047,049,051,065,067,068,070`이다.
이번 A9에서 `V41-028,065,070`을 새로 충족으로 올렸다. `V41-008,058`은 standalone
좌측 destination parity와 화면 비교가 남아 부분을 유지한다. `V41-066.3`의 자동
pointer cancel cleanup은 충족으로 올렸지만 부모 `V41-066`은 실제 touch 증거가 없어
부분을 유지한다. D1·D2와 bridge 판정은 A9로 올리지 않았다.

## 7. 남은 결함과 결정

### A0에서 닫은 PoC 작업 결정

1. 일반 텍스트는 명시적 확인 뒤 Personal Flow로 handoff하고 CreatorDraft는 분리한다.
2. 운영 데이터는 읽기만 하고 변경은 PoC shadow staged command에만 기록한다.
3. production PlatformNav·cobalt는 global owner, v4.1 teal은 workspace 내부 accent다.
4. 한 text editor와 선택형 구조 검토, 작성 틀 1회 삽입, global ghost를 사용한다.
5. 반복·public S3·table/source update는 보존 또는 fail-closed하고 이번 PoC에서 제외한다.
6. React는 제품 구현 정본, standalone은 core 조작 parity를 가진 offline fixture다.

이 여섯 항목은 운영 정책 승인이나 writer 개방이 아니라 다음 격리 구현을 위한 작업
계약이다. 상세한 거절안·owner·write 경계·재검토 조건은 `a0-decision-record.md`에 있다.

### 결정과 무관하게 남은 safe fidelity

- `V41-008,058`: standalone의 중앙 dialog를 좌측 destination으로 맞출지 fixture-only로
  둘지 결정하고, 선택 범위에서 화면 비교를 닫는다.
- `V41-066`: 자동 pointer cancel의 ghost·강조·상태·RAF cleanup은 닫았다. 실제
  Android/iOS touch drag-to-date를 별도 검증한다.
- standalone의 edge-scroll은 화면 밖 task 순서 이동까지만 확인했다. 정확한 화면 밖
  날짜 이동·Undo 증거는 React에만 있다.
- 200% browser zoom과 screen reader를 검사한다.

## 8. 실제 기기·게시·관찰 상태

| 항목 | 상태 |
| --- | --- |
| 실제 Android Chrome | 미실행 |
| 실제 iOS Safari | 미실행 |
| screen reader·OS 글자 확대·browser 200% | 미실행 |
| commit | 미진행 |
| push | 미진행 |
| PR | 미진행 |
| Preview | 미진행 |
| Production | 미진행 |
| 관찰 사용자 | 0명 |

## 9. 다음 단계

다음은 단계 1의 source/personal ownership matrix와 staged transition을 구현하는 것이
주 경로다. A8의 corridor·삽입선·active-scroll·React 화면 밖 날짜 이동은
완료 근거를 보존하고, 남은 실제 touch와 standalone parity만 후속 범위에서 닫는다. 각
후속 단계도 기획, UX/디자인, 개발 설계, 구현, 검증, Exit gate를 모두 통과한 뒤 trace
판정을 갱신한다.
