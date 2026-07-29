# P26 전체 실행 백로그 (P26-01 ~ P26-14)

전제: repo의 **P26-00**(이해도·밀도 결정 감사, docs-only)은 그대로 첫 게이트로 유지한다. 아래 백로그는 P26-00 결과에 흡수·조정될 수 있는 항목(04/06/08)을 명시했다. 모든 항목 공통: 4탭 IA·source/personal/run·캘린더 역할·export scope·completion 계약 불변, 390×844/1024×768 overflow·console 0, observed user 0 표기 유지.

## Stage 1 — Foundation / Correctness (순차)

### P26-01 공개 예시·기본 anchor 날짜 정합 ⟵ 최우선
- 문제: 예시 검사일=오늘 → D-14 항목이 과거 날짜로 "다가오는 할 일"에 표시(F-01). 반복 Flow 기본 관리일이 KST 기준 어제로 보일 수 있음(F-04, 재현 필요).
- 사용자 영향: 첫 방문 신뢰·저장 예측 붕괴.
- route: `/f/vehicle-inspection-prep`, `/f/washer-tub-clean-monthly`, 기타 `/f/*`
- UX 방향: 예시 anchor = 오늘+lead-time(D-구조 보존, 예: 검사일 D+21). 기본 날짜 계산 기준 TZ를 사용자 로컬로 통일하고 pre-hydration 프레임과 일치시킴.
- 데이터 영향: 없음(미저장 미리보기·표시 계층만).
- 범위: 예시 anchor 산정, 미리보기 라벨("예시 · 검사일을 8월 10일로 가정"), TZ 재현 테스트. 비범위: 저장 후 projection 규칙.
- 의존성: 없음. 병렬: P26-02와 병렬 가능.
- 검증: 390/1024 캡처, 반대 TZ E2E, "다가오는" 섹션 과거 날짜 0 assertion.
- 접근성: 예시 상태 aria-live 아님·정적 텍스트 유지.
- evidence marker: `examplePastDatedRowCount: 0`, `defaultAnchorTzSource: "client"`.
- 완료 기준: 예시/기본 날짜가 어떤 TZ에서도 과거로 시작하지 않음.

### P26-02 SSR·봇 응답 및 route 정합
- 문제: `/my` 비브라우저 요청에 legacy 제작자 스튜디오 셸 1회 관찰(F-05). `/f/moving-d30-basic` 존재 미검증(F-10).
- 영향: 공유 링크 미리보기·검색 노출이 현재 제품과 다른 IA를 보여줌; 검토·공유 여정 A 진입 불안정.
- route: `/my`, `/f/*` alias 전수.
- 방향: UA/캐시 분기 재현 → 단일 셸로 정리; `/f/` alias 매핑표를 smoke에 포함.
- 데이터 영향: 없음. 범위: SSR 셸·메타·redirect. 비범위: 스튜디오 기능 자체.
- 의존성: 없음(01과 병렬).
- 검증: curl/봇 UA 스냅샷 diff, smoke route 목록 확장.
- marker: `nonBrowserShellMatchesAppShell: true`, `fRouteAliasCoverage`.
- 완료: 모든 공개 진입 route가 동일 IA 셸 반환.

### P26-03 AppClient.tsx 분할 (엔지니어링 건강, 병렬 트랙)
- 문제: 단일 클라이언트 파일 512KB+(F-12). 이후 모든 slice의 회귀·리뷰 비용 증가.
- 방향: surface 단위(My Flow/캘린더/조정/export) 모듈 분리, 동작 불변 리팩터.
- 비범위: UI/카피 변경 0. 검증: 기존 unit 526·E2E 286 green 유지, 번들 diff.
- marker: `appClientMaxFileKb`. 완료: 최대 파일 ≤150KB, 시각 diff 0.
- 의존성: 없음. Stage 2~5와 병렬 진행하되 각 slice 직전 rebase.

## Stage 2 — Core Journey / IA (P26-00 결정 이후, 순차)

### P26-04 public save-before 최소 프레임 + CTA 위계 (P26-00 Public A/B 결정 구현)
- 문제: 저장 결정 표면 3개+, 저장 전 산출물 진입 경쟁(F-02), 설명 밀도(F-07-copy).
- 방향: artifact + source 공개 + 날짜 카드 + **sticky 저장 바 1개**(그대로 저장 primary · 내 버전으로 조정 secondary). 본문 중복 CTA 제거, 산출물은 저장 후로.
- 데이터 영향: 없음. 계약: save-before 완료 컨트롤 0 유지.
- 의존성: P26-00, P26-01. 검증: 저장 결정 표면 카운트 1, 설명 블록 수 before/after, tap depth.
- marker: `saveDecisionSurfaceCount: 1`, `preSaveExportEntryCount: 0`.

### P26-05 내 Flow ↔ 캘린더 역할 언어 + 날짜 없는 할 일 개념
- 문제: 빈 상태 동일(F-03), '콘텐츠' 용어, 날짜 없는 할 일의 이유 미설명(우려 1·5).
- 방향: 내 Flow 빈 상태 = "무엇을 할지"(오늘·다음·날짜 없는 일 실행), 캘린더 = "언제 할지"(날짜 있는 일만). CTA 카피 분리. 내 Flow의 날짜 없는 섹션에 1줄 규칙 + `날짜 정하기` 연결.
- 데이터 영향: 없음. 의존성: 04와 병렬 가능.
- 검증: 두 빈 상태 텍스트 유사도, 용어 grep `콘텐츠` 0(해당 표면), 390/1024.
- marker: `emptyStateRoleDistinct: true`, `undatedRuleCopyVisible: true`.

## Stage 3 — Editing / Execution (Stage 2와 부분 병렬)

### P26-06 intent-first 할 일 조정 (P26-00 Editor A/B 결정 구현)
- 문제: 고급 경로 길이(F-08).
- 방향: 진입 시 intent 4개(날짜 정하기/시간 넣기/반복/메모) → 해당 control만 노출, 저장된 값 요약 유지.
- 계약: overlay 필드 불변, capability 은닉 금지. 의존성: P26-00.
- 검증: 대표 intent별 tap depth before/after, 저장값 왕복 E2E.
- marker: `advancedEditTapDepthMax`.

### P26-07 복구·순서 변경 발견성
- 문제: 기능은 있으나 노출 위치 미확인(F-11).
- 방향: 삭제 직후 스낵바 복구 + 완료/보류 뷰 내 복구 진입 고정; 순서 변경 핸들을 전체 Flow(선택 모드 아님)에서도 노출.
- 검증: 발견성 heuristic 체크리스트 + E2E; 사용자 확인 가정으로 P26 final에 명시 이월.
- 의존성: 없음(06과 병렬).

## Stage 4 — Calendar / Export (Stage 3과 병렬 가능)

### P26-08 1024 캘린더 2영역 프레임 (P26-00 Calendar A/B 결정 구현)
- 문제: queue/grid/agenda 동시 3영역 밀도(F-07).
- 방향: 기본 grid+agenda, `날짜 정하기` 큐는 선택 시 보조 pane. 역할 계약 불변.
- 검증: 1024 스캔 항목 수/최대 행 폭, 큐 왕복 E2E. marker: `wideCalendarPaneCount`.

### P26-09 반복 회차 표시 언어
- 문제: "이번 관리일" 등 회차 카피가 날짜 정합(F-04)과 얽혀 오해 소지.
- 방향: `다음 회차 · 8월 20일 (목)` 형식 통일, 지난 회차는 명시적 과거형. projection 불변.
- 의존성: P26-01 이후.

### P26-10 export 사후 확인 surface
- 문제: 실행 전 예측은 되나 실행 후 결과 확인이 없음(우려 7 잔여).
- 방향: export 완료 시 "ICS 이벤트 n개 · 파일명" 확인 + 최근 export 기록 1줄. plan 계약 위에 result만 추가.
- marker: `exportResultSummaryVisible: true`.

## Stage 5 — Visual System / Responsive (Stage 2 이후, 내부 병렬)

### P26-11 시각 시스템 기준선
- 문제: 상용 대비 기본 완성도(우려 10): raw 날짜 입력(F-09), 빈 상태 위계, 데이터 관리 승격(F-13), 카피 톤(F-14).
- 방향: 날짜 피커+프리셋(오늘/이번 주말/+2주), 타이포·간격·상태색 토큰 정리, 보조 기능 강등, 카피 가이드(시스템 로그체 금지).
- 검증: 표면별 before/after 캡처 보드, 44px 히트타깃 검사.

### P26-12 public /f wide 2-pane
- 문제: 늘어진 단일 컬럼(F-06).
- 방향: 좌 artifact 스크롤 / 우 sticky 날짜+저장 rail. 모바일 DOM 순서 공유.
- 의존성: P26-04 이후.

## Stage 6 — Integration / Final Review (순차, 마지막)

### P26-13 통합 여정 재게이트 + smoke 확장
- 6개 여정(A~F) 재실행, smoke route에 `/f/moving-d30-basic`(또는 확정 alias)·다중 Flow 상태 추가, KST+반대 TZ 이중 실행.
- 완료: 여정 6/6, Blocking/High 0, 390/1024 overflow·console 0.

### P26-14 P26 final review
- 조건: ① P26-01~13 개별 marker green ② 저장 결정 표면 1·빈 상태 역할 분리·예시 과거 날짜 0의 3대 이해도 지표 충족 ③ 자동/heuristic/owner/observed 경계 기록 유지.
- P27 이월: 계정/동기화, 실제 AI intake, 외부 캘린더 직접 연동, 창작자/마켓, 관찰 세션 15회 자체.
- **사용자 관찰 전에 닫을 것**: F-01/F-04류 정합 결함 전부, 저장 결정 표면 단일화, 빈 상태 역할 언어 — 이 상태로 관찰하면 세션이 결함 재발견에 소모됨.

## 실행 순서 요약

순차 축: P26-00 → **P26-01** → (Stage 2: 04→05) → Stage 6.
병렬 가능: 02·03(처음부터), 05(04와), 07(06과), Stage 4(Stage 3과), 11·12(상호).
