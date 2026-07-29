# P26 /goal 프롬프트 모음

공통 머리말(모든 프롬프트 앞에 붙임):

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.
시작 전: origin/main 최신 clean worktree, production SHA 기록, 익명 접근 확인.
공통 계약: 4탭 IA, source/personal/run/occurrence 소유권, Calendar 역할, export scope, completion/reopen 불변.
공통 검증: docs:check, unit, production build, targeted E2E, 390x844/1024x768 overflow·console 0.
자동 시뮬레이션을 실제 사용자 관찰로 표현하지 않는다(observed users 0 유지).
산출물: docs/content-audit/<날짜>-<slice-id>/ 에 README.md, audit 또는 spec, route-evidence.json, screenshots/.
```

---

## P26-01 예시·기본 anchor 날짜 정합
```text
목표: 공개 /f 예시 미리보기와 반복 Flow 기본 관리일의 날짜 기준을 수정한다.
문제: /f/vehicle-inspection-prep 예시 검사일이 오늘로 잡혀 D-14 항목이 과거(07-06)인데 "다가오는 할 일"로 표시된다. /f/washer-tub-clean-monthly는 KST 오전에 "다음 통세척일"이 어제(7/19)로 보인 관찰이 있다(재현 필요).
작업: 1) 예시 anchor를 오늘+대표 lead time으로 산정해 D-구조가 미래로 시연되게 한다. 예시임을 "예시 · 검사일을 YYYY-MM-DD로 가정" 형식으로 명시한다. 2) 기본 날짜 계산의 기준 TZ를 사용자 로컬로 통일하고 pre-hydration 프레임과 일치시킨다. 반대 TZ(UTC-10, Asia/Seoul) E2E를 추가한다.
비범위: 저장 후 projection 규칙, 카피 리라이트.
완료: 예시/기본 날짜가 어떤 TZ에서도 과거로 시작하지 않고, "다가오는" 섹션 과거 행 0 assertion이 E2E로 고정된다.
marker: examplePastDatedRowCount 0, defaultAnchorTzSource "client".
```

## P26-02 SSR·봇 응답 및 /f route 정합
```text
목표: 비브라우저 요청과 route alias의 정합을 확정한다.
문제: /my를 봇류 UA로 요청했을 때 legacy '제작자 스튜디오' 셸(탐색/제작자/Flow Lab nav)이 응답된 1회 관찰이 있다. /f/moving-d30-basic 은 smoke에 없고 홈은 /flow-maps/moving-d30 으로 연결한다.
작업: 1) UA·캐시 조건별 /my 응답을 재현하고 단일 앱 셸로 정리한다(OG/meta 포함). 2) /f/ alias 전수 매핑표를 만들고 smoke route 목록에 반영한다.
완료: 대표 route 전부에 대해 봇/브라우저 응답 IA 일치, alias 커버리지 문서화.
marker: nonBrowserShellMatchesAppShell true, fRouteAliasCoverage 목록.
```

## P26-03 AppClient.tsx 분할
```text
목표: components/flow/AppClient.tsx(512KB+)를 surface 단위 모듈로 분할하는 동작 불변 리팩터.
작업: My Flow / Calendar / 조정 / batch / export 단위 파일 분리, props/상태 경계 문서화. UI·카피·DOM 구조 변경 0.
완료: 최대 파일 150KB 이하, unit·E2E 전체 green, 대표 화면 pixel diff 0.
비범위: 어떤 UX 변경도 하지 않는다.
```

## P26-04 public save-before 최소 프레임 + CTA 위계
```text
목표: P26-00에서 선택된 Public 프레임을 구현한다.
문제: 저장 결정 표면이 실질 3개+(sticky 저장/본문 저장·조정/산출물 받기)이고 저장 전 export 진입이 저장과 경쟁한다.
작업: artifact + source 공개 + 날짜 카드 + sticky 저장 바 1개(그대로 저장 primary, 내 버전으로 조정 secondary)로 통합. 본문 중복 CTA 제거, 산출물 진입은 저장 후로 이동. 설명 블록 수 before/after 기록.
완료: saveDecisionSurfaceCount 1, preSaveExportEntryCount 0, 저장 전 완료 컨트롤 0 유지.
의존: P26-00 결정, P26-01 머지 후.
```

## P26-05 내 Flow ↔ 캘린더 역할 언어 + 날짜 없는 할 일 개념
```text
목표: 두 탭의 역할이 설명 없이 구분되게 한다.
문제: 두 빈 상태가 "…콘텐츠를 먼저 고르세요" + 동일 CTA로 사실상 같고, '콘텐츠' 용어가 'Flow'와 충돌한다. 날짜 없는 할 일을 왜 두는지 설명이 없다.
작업: 내 Flow 빈 상태 = 실행 관점(오늘/다음/날짜 없는 일), 캘린더 = 날짜 관점(날짜 있는 일만) 카피·CTA 분리. 해당 표면 '콘텐츠' 용어 제거. 내 Flow 날짜 없는 섹션 상단에 1줄 규칙 + '날짜 정하기' 연결.
완료: emptyStateRoleDistinct true, undatedRuleCopyVisible true, 용어 grep 0.
```

## P26-06 intent-first 할 일 조정
```text
목표: P26-00에서 선택된 Editor 프레임을 구현한다.
작업: 조정 진입 시 intent 선택(날짜 정하기/시간 넣기/반복 설정/메모) → 해당 control만 노출. 저장된 고급 값 요약은 계속 표시하고 capability를 숨기지 않는다.
완료: 대표 intent별 tap depth 감소를 수치로 기록(advancedEditTapDepthMax), 저장값 왕복 E2E green.
```

## P26-07 복구·순서 변경 발견성
```text
목표: 삭제 복구와 순서 변경을 찾을 수 있게 한다.
작업: 삭제 직후 스낵바 '되돌리기' + 보류/완료 뷰의 고정 복구 진입, 전체 Flow 일반 모드의 순서 변경 핸들(모바일 long-press 대체 포함, 44px).
완료: 각 경로 E2E 1개 이상, 발견성은 사용자 확인 가정으로 P26 final에 기록.
```

## P26-08 1024 캘린더 2영역 프레임
```text
목표: P26-00에서 선택된 Calendar 프레임을 구현한다.
작업: 기본 grid+agenda 2영역, '날짜 정하기' 큐는 선택 시 보조 pane으로. 역할 계약·완료 컨트롤 위치 불변.
완료: wideCalendarPaneCount 기본 2, 큐 배치/해제 왕복 E2E green, 1024 최대 스캔 폭 기록.
```

## P26-09 반복 회차 표시 언어
```text
목표: 회차 카피를 '다음 회차 · M월 D일 (요일)' 형식으로 통일하고 지난 회차를 명시적 과거형으로 구분한다. projection 규칙 불변. P26-01 이후 실행.
완료: 회차 라벨 스냅샷 테스트, 반대 TZ에서 동일 문자열.
```

## P26-10 export 사후 확인 surface
```text
목표: export 실행 후 결과를 확인시킨다.
작업: 완료 시점에 '형식 · 포함 n개(ICS는 이벤트 n개) · 파일명' 확인 + 최근 export 1줄 기록. count는 기존 canonical plan 값을 재사용하고 재계산하지 않는다.
완료: exportResultSummaryVisible true, plan/result count 일치 assertion.
```

## P26-11 시각 시스템 기준선
```text
목표: 상용 도구 대비 기본 완성도를 끌어올리는 시각 패스.
작업: 1) 날짜 입력을 피커+프리셋(오늘/이번 주말/+2주)으로 교체하고 별도 '입력' 버튼 2단계 커밋 제거 2) 타이포/간격/상태색 토큰 정리 3) 빈 상태에서 '데이터 관리' 강등 4) 카피 가이드(시스템 로그체 금지) 적용.
완료: 표면별 before/after 캡처 보드, 히트타깃 44px 검사, 회귀 E2E green.
```

## P26-12 public /f wide 2-pane
```text
목표: 1024 public /f를 좌 artifact / 우 sticky 날짜+저장 rail 2-pane으로 재구성한다. 모바일과 DOM 순서 공유, P26-04 이후 실행.
완료: 1024 유휴 공백 제거 캡처, 390 회귀 없음, 저장 결정 표면 1 유지.
```

## P26-13 통합 여정 재게이트 + smoke 확장
```text
목표: 6개 대표 여정(이사/차량 undated/월간 반복/메모 draft/다중 Flow/public 첫 방문)을 390/1024로 재실행하고 smoke를 확장한다.
작업: smoke route에 확정된 이사 진입 alias와 다중 Flow 저장 상태 추가, Asia/Seoul + UTC-10 이중 실행.
완료: 여정 6/6, Blocking/High 0, overflow·console 0, journey-scorecard 갱신.
```

## P26-14 P26 final review
```text
목표: P26 종료 판정.
조건: P26-01~13 marker green, 3대 이해도 지표(저장 결정 표면 1 · 빈 상태 역할 분리 · 예시 과거 날짜 0) 충족, evidence 경계(자동/heuristic/owner/observed) 기록.
P27 이월: 계정/동기화, 실제 AI intake, 외부 캘린더 연동, 창작자/마켓, 관찰 15세션.
관찰 전 필수 마감: 날짜 정합류 결함 전부, CTA 단일화, 역할 언어.
```
