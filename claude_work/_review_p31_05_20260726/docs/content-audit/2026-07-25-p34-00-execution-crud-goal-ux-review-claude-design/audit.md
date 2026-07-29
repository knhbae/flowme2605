# P34-00 실행 CRUD · 목표 UX 독립 검토 — 상세 audit

**REVIEWER_ROLE** `claude_design` · **reviewedAt** 2026-07-25 (UTC 10:5x) · **앱 코드 변경 없음** · **observed-user count 0**

| 항목 | 기록 |
| --- | --- |
| production (P32) | https://flowme2605.vercel.app |
| P33 branch | `codex/p33-integrated-program-plan` |
| 검토 기준 commit | `8c54992ce5628ab2a3884a530a83d2c8226223dc` |
| Draft PR | [#156](https://github.com/knhbae/flowme2605/pull/156) · **open / draft** |
| PR head at review | `8c54992` (stabilization implementation commit `abb0a99` 포함) |
| P33 Preview | **inaccessible** — 익명 요청이 Vercel 인증 화면으로 이동(`vercel_sso_redirect`) |
| 열람 한도 | `components/flow/AppClient.tsx` 512KB 초과 → 열람·검색 불가. 이 파일에만 존재할 수 있는 문구는 `undetermined`로 표기 |

## 0. Overall verdict — `bounded_crud_revision`

FlowMe는 일정·Todo·체크리스트 도구로서 **필요한 CRUD를 대부분 갖고 있다.** 98개 셀 중 supported 60,
by-design missing 13, blocked 0이다. 저장·읽기·수정·완료·재사용·export의 본체는 건강하다.

문제는 **없는 기능이 아니라 파괴적 조작과 반복 조작의 위치·이름**에 몰려 있다.

- 삭제 계열(보관·복구·영구 삭제)이 사용자가 결정하는 화면(열린 Flow)에 없다.
- "이 기기에서 영구 삭제"는 릴리스 노트에는 있으나 **회귀 계약(E2E marker)이 0**이고 lifecycle 모듈에 API가 없다.
- 반복은 **완료만 회차 단위**이고 **수정은 series 단위만**이다.
- 같은 의도(빼기/삭제/제외/보류)가 표면마다 4개 어휘로 나타난다.

따라서 `execution_crud_sufficient`(충분)도 아니고 `structural_crud_reopen`(구조 재오픈)도 아니다.
P32 focused workspace 구조와 P33 canonical identity 계약은 **유지**하고, 위 4가지를 bounded로 고치는 것이 맞다.

## 1. 증거 경계

**사용한 것**

- PR head commit의 source 직접 판독: `lib/flow/personal-flow-lifecycle.ts`, `lib/flow/flow-item-state.ts`, `lib/flow/canonical-flow-storage.ts`, `tests/e2e/p27-foundation.spec.ts` 전문, `tests/e2e/*` 라벨·testid 전역 검색, `components/flow/*` 전역 검색(31개 파일)
- P33 publish stabilization evidence(README·audit·verification.json·route-evidence.json)
- 이 프로젝트에 보존된 current production 화면(390) 8장과 P33 evidence 화면 6장
- 이전 두 검토 패키지(2026-07-24 cross-entry, 2026-07-25 PR review)를 `prior_design_artifact`로만 사용

**사용하지 못한 것**

- P33 Preview 라이브 조작 → `inaccessible`
- Production 라이브 브라우저 조작·console·스크린리더 실측 → 이번 검토에서 수행하지 않음
- `AppClient.tsx` 열람 → 도구 한도 밖

**표기 규칙** 자동화·screenshot·source 판독·heuristic simulation은 사용자 검증이 아니다.
"보인다/작동한다"는 표현은 근거 종류를 항상 함께 적었다.

## 2. Finding (blocking 0 · high 3 · medium 6 · low 3)

### H-1 · high — 열린 Flow에는 삭제 계열 명령이 없다

- **surfaceVersion** shared · **route** `/my` · **viewport** 390 / 1024 / 1440
- **시작 상태** 24개 Flow 1개 저장, 워크스페이스 열림
- **재현** 워크스페이스에서 정리 명령을 찾는다 → 보이는 것은 `이사일 바꾸기` `가져가기` `여러 할 일 조정` `전체 펼치기` 뿐 → 전체 보기로 나가 카드 `⋯ 관리 메뉴` → `보관`
- **기대/실제** 열어본 Flow를 그 자리에서 정리 / 목록으로 되돌아가야 함(tap depth 4)
- **근거** `tests/e2e/p27-foundation.spec.ts`의 lifecycle 시나리오는 전부 `my-flow-overview-card` → `my-flow-management-menu-trigger` → `my-flow-archive-toggle` 경로. 1440 워크스페이스 캡처에도 lifecycle 명령 없음
- **사용자 영향** 삭제 의사결정은 Flow를 열어 내용을 본 직후에 생긴다. 그 순간 경로가 화면 밖이다
- **권장** P34-01 lifecycle 단일 소유자
- **evidenceKind** `current_source`, `current_package_screenshot` · **marker** `P34-LIFECYCLE-SINGLE-OWNER`

### H-2 · high — "이 기기에서 영구 삭제"에 회귀 계약이 없다

- **surfaceVersion** shared · **route** `/my`
- **재현** repo 전역에서 `영구 삭제` 검색 → `docs/STATUS.md`, `docs/DECISIONS.md` 2건만. `tests/e2e` 0건. `personal-flow-lifecycle.ts`에는 `archivePersonalFlow`/`restorePersonalFlow`만 있고 삭제 API 없음. 백업 동기화 대상도 `archivedFlowSlugs`
- **기대/실제** 파괴적 조작에는 가장 강한 테스트가 붙는다 / 릴리스 노트에만 존재
- **판정** 구현 여부 `undetermined`(AppClient 열람 불가). **계약 부재는 confirmed**
- **사용자 영향** 로컬 저장이 유일한 저장소인 제품에서, 되돌릴 수 없는 조작이 회귀 보호 밖에 있다. 부분 삭제로 고아 key가 남으면 목록에서 사라진 Flow의 데이터가 남는다
- **권장** P34-02 · **marker** `P34-PERMANENT-DELETE-KEY-SET`, `P34-PERMANENT-DELETE-ISOLATION`
- **evidenceKind** `current_source`

### H-3 · high — 반복은 완료만 회차 단위, 수정은 series 단위

- **surfaceVersion** shared · **route** `/calendar`, `/my` · **viewport** 390
- **재현** 주3회 반복 저장 → 이번 주 수요일만 시간을 바꾸려 함 → 회차 단위 수정 컨트롤 없음. series 상세는 `data-execution-level="series"`, 완료 컨트롤 0, `캘린더에서 회차별 실행` 링크만
- **근거** `이번 회차 완료 체크`는 존재(`/calendar` 선택일 상세). `이번 회차만`·occurrence scope 문자열은 tests/e2e 0건
- **사용자 영향** 반복 사용자의 일상 조작이 없다. series 전체를 바꾸면 지난 회차의 의미까지 흔들린다
- **권장** P34-04(데이터 영향 높음: occurrence override + ICS `RECURRENCE-ID`/`EXDATE` 계약 확장)
- **evidenceKind** `current_source`

### M-1 · medium — 빼기·삭제·제외·보류가 4개 어휘

저장 전 `저장에 포함` 체크박스 / 저장 후 `Flow에서 빼기` 버튼(+`뺀 항목` 접힌 disclosure에서 복구) / draft `삭제`+confirm / 실행 `보류`.
같은 의도에 네 문법. 복구 위치도 세 곳. → P34-03

### M-2 · medium — undo 주인이 셋

`my-flow-lifecycle-snackbar`+`my-flow-lifecycle-undo`, `my-flow-batch-undo`+`my-flow-batch-undo-action`, Calendar 패널 내부 `되돌리기`.
위치·문구·지속시간 계약이 하나가 아니다. → P34-05

### M-3 · medium — 항목 편집 진입이 두 경로

`my-flow-quick-item-edit`가 있으면 1탭, 없으면 `my-flow-detail-read-summary` 펼치기 → `my-flow-detail-edit-toggle`로 3탭.
E2E 헬퍼 `enterMyFlowDetailEditMode`가 이 분기를 코드로 증명한다. → P34-06

### M-4 · medium — 저장 전 4모드와 저장 후 편집 문법이 다르다

저장 전은 `포함 / 내용 / 일정 / 순서` 모드 스위처, 저장 후는 항목별 editor + 배치 선택.
같은 네 가지 수정을 두 번 배운다. 특히 **순서 변경**은 저장 후 source-backed Flow에서 경로가 달라진다. → P34-03과 함께 라벨 정렬

### M-5 · medium — 모바일 My Flow 첫 화면에 도구 버튼이 사용자 작업과 동급

390 캡처에서 `스튜디오` `데이터 관리`가 탭 위 최상단에 나란히 있다. 첫 시선이 실행이 아니라 도구로 간다.
(`데이터 관리`는 백업/복원이라 보존 가치가 높지만, 위계는 다르다.) → 화면별 Keep/Change 참조

### M-6 · medium — 재방문 판단 신호가 완료 카운트뿐

`전체 0/24 완료` + 단계 그룹만으로는 장기 Flow가 아직 유효한지 판단하기 어렵다.
이것이 목표 관리 B안의 **유일한 근거**이며, 현재로선 관찰 근거가 없어 A안 유지.

### L-1 · low — 보관/복구가 같은 토글

같은 `my-flow-archive-toggle`이 라벨만 바꿔 양방향을 수행한다. 상태 전이 announce 계약 미확인(`inaccessible`).

### L-2 · low — export 3범위가 3위치

`가져가기`(워크스페이스) / `Flow별 가져가기`(다중 저장 receipt) / `현재 항목 가져가기 · 1개`(item 상세 disclosure).

### L-3 · low — 보관함 진입점이 조건부

`my-flow-open-archived`는 보관 이력이 생긴 뒤에만 나타난다. 비어 있어도 존재해야 하는 장소다.

## 3. Flow 삭제·복구 발견성 판정

| 질문 | 판정 | 근거 |
| --- | --- | --- |
| Flow 삭제가 어디서 가능한지 발견되는가 | **hidden** | 목록 카드의 ⋯ 관리 메뉴 안에만. 열린 Flow에는 없음 |
| 보관 / 복구 / 영구 삭제의 차이가 명확한가 | **부분적** | 보관·복구는 스낵바 문구로 명확(`보관했습니다`/`복구했습니다`). 영구 삭제는 문구만 존재하고 결과 고지 미확인 |
| 보관이 데이터 삭제가 아님이 보장되는가 | **supported** | 보관 후에도 `flow:saved:*`와 anchor 값 보존이 assertion으로 고정됨 |
| 보관한 Flow를 다시 찾을 수 있는가 | **hidden** | 진입점이 조건부 노출, wide는 목록 필터 `archived` |

## 4. 목표 관리 A / B / C

- **A. 별도 Goal 객체 없이 Flow 진행률과 완료만** → **추천**
- **B. 목표·마일스톤·검토일만 추가하는 bounded overlay** → **조건부 보류**(observed-user 근거 필요)
- **C. 목표 대시보드·습관·성과 추적** → **적용 금지**

근거: Goal 객체는 제품에 없고(`목표`는 콘텐츠 문구로만 존재), **이미 A의 구성요소가 구현되어 있다** — 완료 카운트, 전체 진행 바, 6단계 그룹(사실상 마일스톤), 재사용 시 완료만 초기화.
FlowMe의 역할은 원문 → 실행 가능한 Flow → 최소 개인화 → 실행/복구/재사용이다. 목표 객체를 추가하면 **비교 대상이 planner로 바뀌고**, 지금 확인된 실제 gap(삭제 발견성·회차 수정·어휘)보다 우선순위가 낮다.
B를 여는 유일한 조건은 실제 사용자 3명 이상이 장기 Flow에서 "다시 볼 날짜"를 스스로 만들려 시도한 관찰이다.

## 5. 문제의 종류 분리

| 종류 | 항목 |
| --- | --- |
| **correctness / 데이터 계약** | H-2(영구 삭제 key 집합·격리), H-3의 occurrence override·ICS 계약 확장 |
| **UX 구조** | H-1(lifecycle 위치), M-3(편집 진입), M-4(저장 전후 문법), L-3(보관함 상시성) |
| **조작 어휘·피드백** | M-1(4어휘), M-2(undo 3주인), L-1(토글 이름), L-2(export 3위치) |
| **visual polish** | M-5(모바일 상단 도구 위계) |
| **관찰 필요(설계 아님)** | M-6, 목표 관리 B안 |

## 6. 잘 되어 있는 것 (회귀시키지 말 것)

- 완료/다시 열기의 accessible name 패턴이 My Flow와 Calendar에서 동일하다.
- export가 예상 수량과 손실(`세부 확인 항목과 자료는 FlowMe에 남습니다`)을 미리 고지한다.
- 보관이 데이터 삭제가 아님이 저장소 assertion으로 고정되어 있다.
- P33이 제외 상태와 개인 메모를 분리해 메모 손실 경로를 닫았다(`personalExcluded`).
- 날짜 배치/되돌리기(10→9→10, 10→7)와 재사용(`지난 실행은 그대로 보관`)이 비파괴다.

## 7. 실제 사용자에게만 확인할 질문 (최대 7)

1. Flow를 정리하려 할 때 "보관"과 "삭제" 중 무엇을 먼저 찾는가, 그리고 어디를 보는가
2. "보관"이 데이터를 지운다고 느끼는가, 숨긴다고 느끼는가
3. 반복 일정에서 "이번 주만" 바꾸려 한 적이 있는가, 그때 무엇을 눌렀는가
4. 항목을 뺄 때 그것이 영구적이라고 생각하는가, 되돌릴 수 있다고 생각하는가
5. 장기 Flow를 중단·재개할 때 무엇을 보고 판단하는가(완료 수 / 남은 날짜 / 다른 신호)
6. "목표"를 FlowMe 안에서 관리하고 싶은가, 아니면 실행만 남기고 싶은가
7. 저장 전 조정과 저장 후 수정이 다른 화면이라는 것을 인지했는가

## 8. 무결성

앱 코드·저장 데이터·의존성·STATUS/ROADMAP·commit·push·PR·merge·deploy를 변경하지 않았다.
실제 사용자 모집·인터뷰·관찰 계획을 작성하지 않았다. 가짜 사용량·리뷰·평점 없음.
자동화·screenshot·fixture·heuristic simulation을 사용자 검증으로 표현하지 않았다. observed-user count는 `0`이다.
