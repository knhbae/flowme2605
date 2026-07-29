# FlowMe P34 실행 CRUD·조작 문법 통합 프로그램

- **작성일:** 2026-07-25
- **상태:** planning only / app code unchanged
- **판정:** `bounded_revision_first_with_structural_reopen_gate`
- **관찰 사용자:** 0명
- **현재 production:** <https://flowme2605.vercel.app>
- **P33 Draft PR:** <https://github.com/knhbae/flowme2605/pull/156>
- **P33 검토 기준 SHA:** `8c54992ce5628ab2a3884a530a83d2c8226223dc`

## 1. 이 문서의 목적

Claude Design의 `FlowMe P31 구조 검토 요청_04.zip`과 Codex의 P34-01 제안을 현재 P33 소스와 대조해, 다음 개발을 한 단계씩 실행할 수 있는 통합 프로그램으로 정리한다.

이번 프로그램은 다음 두 극단을 모두 피한다.

- 이미 구현된 기능을 다시 만드는 것
- 화면 위치와 문구만 조금 바꾸고 근본적인 조작 혼란을 그대로 두는 것

기본 방향은 **bounded revision**이다. 다만 비교 prototype과 24-cell simulation에서 기준을 만족하지 못하면 My Flow 내부 조작 구조를 크게 다시 설계할 수 있다. 이 경우에도 source, personal overlay, execution run, recurrence occurrence, export identity를 먼저 보존하고, 데이터 계약 변경은 별도 승인 대상으로 분리한다.

## 2. 입력 자료와 증거 우선순위

### 2.1 입력 자료

1. `claude_work/FlowMe P31 구조 검토 요청_04.zip`
2. ZIP 내부 P34 패키지
   - `README.md`
   - `audit.md`
   - `p34-backlog.md`
   - `current-proposed-wireframes.dc.html`
   - `crud-capability-matrix.json`
   - `interaction-consistency-matrix.json`
   - `persona-journey-scorecard.json`
3. P33 Draft PR #156과 branch `codex/p33-integrated-program-plan`
4. P33 publish stabilization evidence
5. 현재 production P32
6. Codex P34-01 Flow lifecycle command surface 제안

### 2.2 판단 우선순위

1. current source와 실제 저장 계약
2. current browser interaction
3. 현재 branch에서 직접 실행한 unit/E2E/build
4. current package screenshot
5. Claude/Codex audit
6. prior design artifact
7. reference pattern
8. heuristic simulation

자동화, screenshot, simulation은 실제 사용자 검증이 아니다. `observed-user count`는 실제 관찰 세션을 수행하기 전까지 0으로 유지한다.

## 3. 먼저 바로잡아야 할 현재 사실

Claude 검토는 `AppClient.tsx`의 파일 크기 제한과 P33 Preview SSO 때문에 일부 기능을 `undetermined` 또는 `missing`으로 판정했다. P34 구현 전에 아래 정정을 기준선으로 고정한다.

| 검토 항목 | Claude/Codex 제안 | P33 current source 대조 | 통합 판단 |
| --- | --- | --- | --- |
| 영구 삭제 API | lifecycle 모듈에 API와 E2E가 없다고 판단 | `lib/flow/storage.ts`의 `permanentlyDeleteSavedFlow`, `AppClient.tsx`의 삭제 dialog·backup, `storage.test.ts`, `p31-mobile-journey-reconstruction.spec.ts`, `url-first-user-surface.spec.ts`에 구현·검증 존재 | 새로 구현하지 않는다. 삭제 key 집합과 canonical/legacy 격리만 재감사한다 |
| 모바일 focused workspace의 보관 | 열린 Flow에는 lifecycle 명령이 없다고 판단 | `my-flow-workspace-management-menu` 안에 `보관` 존재 | 기능 부재가 아니라 아이콘 메뉴 안 발견성 문제다 |
| 와이드 focused workspace의 lifecycle | 목록 카드에만 있다고 판단 | `renderSavedFlowOverviewCard(... workspace: true)`가 관리 메뉴를 포함 | 위치·이름·상태별 command order를 재검증한다 |
| 보관 Flow 직접 복구 | 일부 viewport에만 있다고 판단 | 모바일 archived row에 `my-flow-archived-direct-restore` 존재 | viewport parity와 빈 보관함 진입만 검증·정리한다 |
| recurrence exception | 새 occurrence 저장 계약이 필요하다고 판단 | `occurrenceOverrides`, `reschedule`, `exclude`, `RECURRENCE-ID`, `EXDATE` 계약과 테스트가 이미 존재 | 데이터 모델을 다시 만들지 않는다. 사용자-facing scope와 편집 진입을 연결한다 |
| 이번 회차 날짜 이동 | UI가 없다고 판단 | Calendar detail 편집과 drag에서 한 occurrence 이동 E2E가 존재 | 날짜 이동 외 제목·시간·메모·skip 범위가 비어 있는지 다시 inventory한다 |
| Goal 객체 | A/B/C 중 A 추천 | 현재 진행률·단계·재사용으로 A가 이미 성립 | 별도 Goal 객체는 P34 범위 밖이다 |

이 정정은 Claude 검토의 가치를 부정하지 않는다. 오히려 P34의 핵심을 **기능 추가**에서 **발견성, 조작 문법, 일관된 feedback**으로 좁혀준다.

## 4. 현재 P33 선행 게이트

2026-07-25 확인 기준:

- `origin/main`: `e491d99ca61ecae4fd0dd009f785e737b6a59516`
- P33 remote branch: `8c54992ce5628ab2a3884a530a83d2c8226223dc`
- PR #156: open / draft / not merged
- P33 Preview: 배포됐으나 Vercel SSO 보호
- GitHub Playwright: pass
- GitHub core 묶음: dependency security audit에서 차단

따라서 P34 app 구현은 다음 둘 중 하나에서만 시작한다.

1. P33이 main에 merge되고 production smoke가 끝난 뒤 최신 `origin/main`
2. merge 전 병렬 작업이 승인되면 P33 SHA에서 만든 별도 clean P34 worktree

현재 `D:\flowme2605\flow-mvp`의 WIP branch나 dirty 상태 위에서 P34 app 코드를 직접 수정하지 않는다.

### P33-G0 완료 조건

- `/flows`, `/f/moving-d30-basic`, `/flow-maps/moving-d30`이 같은 canonical 24-item Flow로 이어진다.
- receipt, My Flow, Calendar, export의 title/count/identity가 같다.
- 기존 5-item 개인 사본은 자동 병합·삭제되지 않는다.
- URL lookup preview와 실제 export가 canonical snapshot을 읽는지 확인한다.
- `따로 유지` 또는 active-copy 결정이 reload/restore 뒤 다시 강제되지 않는지 확인한다.
- dependency audit 차단은 P34 UX 변경과 분리된 OPS 작업으로 해결하거나 명시적으로 waive한다.
- P34 기준 branch와 rollback SHA를 기록한다.

P33-G0가 실패하면 P34 app 구현을 중단하고 P33 bounded fix로 되돌아간다.

## 5. P34 제품 목표

사용자는 설명을 읽지 않고도 다음을 예측할 수 있어야 한다.

1. Flow를 열면 어디서 조정·보관·복구할 수 있는가
2. 항목을 완료, 다시 열기, 제외, 복구, 삭제할 때 각각 무엇이 달라지는가
3. 반복 일정에서 이번 회차와 전체 반복 중 어디가 바뀌는가
4. 작업 직후 어디서 되돌릴 수 있는가
5. 가져가기 전에 전체/선택/현재 범위와 수량이 무엇인가
6. 새로고침 뒤에도 같은 개인 상태가 유지되는가

### 사용자-facing 조작 문법 목표

| 대상 | 권장 동사 | 의미 |
| --- | --- | --- |
| 실행 상태 | `완료` / `다시 열기` | 실행 run 상태 |
| 일정 | `날짜 정하기` / `날짜 없애기` | personal schedule |
| source-backed Item | `이 Flow에서 제외` / `다시 포함` | 원본 보존, 개인 projection에서만 제외 |
| personal draft Item | `항목 삭제` / `항목 복구` | 개인 구조 변경 |
| occurrence | `이번 회차 건너뛰기` / `이번 회차 다시 진행` | series는 유지 |
| Flow lifecycle | `보관` / `복구` / `이 기기에서 영구 삭제` | 개인 Flow 사본의 lifecycle |
| export | `Flow 전체 가져가기` / `선택한 N개 가져가기` / `현재 항목 가져가기` | 실행 전 범위와 수량 명시 |

서로 다른 상태를 하나의 쉬운 단어로 억지 통합하지 않는다. 특히 `제외`, `삭제`, `완료`, `건너뛰기`, `보관`은 데이터 소유권이 다르다.

## 6. 변경 금지 기준선

- 4탭 IA
- public `/f` shell
- P32 library -> focused workspace 기본 구조
- P33 canonical identity와 legacy copy 보존
- source / personal overlay / run / occurrence / export identity 분리
- 완료와 다시 열기의 reversible contract
- Calendar의 dated execution과 undated placement 역할
- whole / selected / current export scope
- source-backed 원본 불변
- 계정, DB, cloud sync, OAuth, AI API 추가 금지
- 가짜 사용자 수, 리뷰 수, 평점 추가 금지

## 7. 설계 대안과 재설계 허용 범위

### 대안 A — bounded relocation

- 기존 handler와 화면 구조를 유지한다.
- lifecycle, edit, export command의 위치와 label만 정리한다.
- 위험과 개발량이 가장 작다.

### 대안 B — shared command grammar + focused workspace 재구성

- Flow header, Item row, Calendar detail이 같은 command model을 소비한다.
- mobile은 object header + command sheet, wide는 inspector command group을 사용한다.
- 기존 P32 구조는 유지하되 command owner를 하나로 만든다.
- 현재 추천 후보이다.

### 대안 C — My Flow 내부 조작 구조 전면 재설계

- library, selected Flow workspace, Item detail, lifecycle, export를 한 interaction architecture로 다시 구성한다.
- `AppClient.tsx`에서 My Flow 관련 composition을 독립 component로 먼저 추출한다.
- 데이터 계약과 4탭 IA는 유지한다.
- visual polish가 아니라 interaction depth와 command ownership을 다시 설계한다.

### C안으로 전환하는 조건

P34-00C prototype simulation에서 아래 중 둘 이상이 발생하면 C안을 연다.

- lifecycle, edit, export 중 두 작업 이상이 3 interactions를 초과한다.
- 같은 의도의 label parity가 90% 미만이다.
- 24-cell 중 hidden/missing이 20%를 넘는다.
- mobile first viewport에서 primary command가 2개 이상 경쟁한다.
- 보조기술 사용자가 같은 Item을 수정하는 데 두 interaction model을 학습해야 한다.
- A/B안으로 High finding 2개 이상을 닫을 수 없다.

C안은 자동 착수하지 않는다. 비교 wireframe, 영향 파일, component extraction plan, rollback을 먼저 승인받는다.

## 8. 전체 실행 순서

```text
P33-G0 production/branch gate
  -> P34-00A current truth audit
  -> P34-00B reference pattern study
  -> P34-00C A/B/C prototype + 24-cell simulation
  -> owner decision
  -> P34-01 lifecycle command surface
  -> P34-02 permanent-delete contract hardening
  -> P34-03 exclusion/delete/hold recovery grammar
  -> P34-04 occurrence editing scope
  -> P34-05 unified undo contract
  -> P34-06 one-path Item edit and structural customization
  -> P34-07 export command consolidation
  -> P34-08 conditional My Flow structural reopen
  -> P34-09 final integration/review
```

P34-01을 끝내기 전 P34-02 이후 app 구현을 섞지 않는다. P34-04는 contract review와 UI rollout을 분리한다.

## 9. 단계별 상세 계획

## P34-00A — current truth와 capability 재감사

### 목적

Claude의 열람 제한과 prior evidence를 현재 소스·실제 브라우저 결과와 분리한다.

### 작업

1. P33 clean baseline과 SHA를 기록한다.
2. lifecycle, permanent delete, Item edit, undo, occurrence override, export command의 실제 call site를 inventory한다.
3. 14 objects x 7 operations CRUD matrix를 current source 기준으로 다시 계산한다.
4. `supported / hidden / partial / missing / by_design_missing / inaccessible`를 구분한다.
5. permanent delete의 실제 key 삭제 범위를 unit fixture로 출력한다.
6. occurrence override가 지원하는 범위를 `date / time / memo / title / skip / restore`로 나눈다.
7. source-backed Flow와 personal draft의 구조 편집 차이를 기록한다.
8. P33 canonical active/inactive copy가 lifecycle 명령에서 독립적으로 보존되는지 확인한다.

### 산출물

- `current-capability-matrix.json`
- `current-command-inventory.json`
- `data-deletion-impact.json`
- `audit.md`

### 완료 조건

- `undetermined`를 실제로 확인 가능한 항목에 남기지 않는다.
- 이미 구현된 기능을 P34 신규 개발 항목으로 중복 등록하지 않는다.
- correctness와 discoverability finding을 분리한다.

## P34-00B — reference pattern 비교

### 목적

FlowMe를 무거운 planner로 만들지 않으면서 익숙한 조작 패턴을 차용한다.

### 비교 대상

- Calendar 제품: event detail, occurrence vs series scope, reschedule, undo
- Todo 제품: task edit, complete/reopen, project/list archive
- Notion류 문서 제품: object overflow, trash, restore, destructive confirmation
- 루틴·운동 제품: series summary, current occurrence, skip/rest day
- 여행·프로젝트 제품: whole plan, day grouping, checklist recovery

### 비교 질문

1. 사용자가 object를 열었을 때 관리 command는 어디에 있는가
2. 파괴적 command는 어떤 단계와 문구로 보호하는가
3. edit와 complete가 같은 row에서 어떻게 구분되는가
4. occurrence와 series 범위를 언제 묻는가
5. undo는 어디에, 얼마나 오래, 어떤 focus 정책으로 나타나는가
6. mobile과 wide에서 command anatomy가 어떻게 유지되는가

### 원칙

- 최신 제품 화면과 공식 도움말을 직접 확인한다.
- UI를 그대로 복제하지 않고 interaction rule만 추출한다.
- 로그인·유료벽으로 확인하지 못한 항목은 `inaccessible`로 표기한다.
- reference pattern은 제품 정답이 아니라 prototype 입력이다.

### 산출물

- `reference-command-pattern-matrix.md`
- `reference-screenshots/`
- FlowMe에 적용/비적용 이유

## P34-00C — A/B/C prototype과 24-cell simulation

### prototype 범위

1. active Flow management
2. archived Flow restore/delete
3. Item quick edit/exclude/restore
4. occurrence edit scope
5. undo feedback
6. export scope

### viewport

- 390x844
- 1024x768
- 1440x900

### persona 8종

1. 이사 기준일 역산 사용자
2. 날짜 없는 차량 체크 사용자
3. 반복 홈트 사용자
4. 장기 학습·진도 사용자
5. URL/메모 개인 draft 사용자
6. 20개 이상 Flow 재방문 사용자
7. export 중심 사용자
8. keyboard·저시력 사용자

### persona당 세션

**Session A — 발견·저장·열기**

- source 또는 draft에서 Flow를 저장한다.
- My Flow에서 다시 찾고 focused workspace를 연다.

**Session B — 조정·실행**

- 제목·날짜·메모 수정
- Item 제외/복구 또는 draft 삭제/복구
- 완료/다시 열기
- Calendar projection 확인
- 반복이면 한 occurrence 이동/skip

**Session C — lifecycle·이동**

- Flow 보관
- 즉시 undo
- reload 뒤 보관함에서 복구
- export 범위 선택
- 영구 삭제 dialog 취소
- 별도 fixture에서 영구 삭제와 source 재발견 확인

### 기록 필드

- route
- viewport
- fixture와 초기 localStorage
- 목표
- interaction count
- visible/reachable
- label prediction
- expected / actual
- reload persistence
- Calendar/export parity
- keyboard/focus
- recovery path
- evidenceKind
- severity

### 대안 선택 기준

- 핵심 command 도달 2 interactions 이하
- Item edit 1 interaction
- hidden lifecycle command 0
- 같은 상태의 label parity 100%
- destructive action의 예상 결과 오답 0
- horizontal overflow 0
- unnamed focusable 0
- console/page error 0
- 24-cell의 missing 0, hidden 1 이하

simulation 결과가 기준을 넘지 못하면 코드 구현 전에 plan을 수정한다.

## P34-01 — Flow lifecycle command surface

### 목적

Flow를 보고 정리하려는 순간 `보관 / 복구 / 영구 삭제 경로`를 예측할 수 있게 한다.

### 중요한 전제

archive, restore, permanent delete handler를 새로 만들지 않는다. current source의 handler와 storage contract를 재사용한다.

### 범위

1. mobile/wide에 동일한 `Flow 관리` accessible name을 제공한다.
2. active Flow command order를 통일한다.
   - Flow 조정
   - 새 실행으로 다시 쓰기
   - 원문 보기
   - 보관
3. active Flow에서 영구 삭제를 직접 노출하지 않는다.
4. 보관 실행 뒤 `되돌리기`를 같은 lifecycle feedback contract로 제공한다.
5. archived row 첫 viewport에 `복구`를 직접 제공한다.
6. 영구 삭제는 archived state의 danger zone에서만 제공한다.
7. 보관함 진입은 0건일 때도 위치를 유지하되, 빈 상태가 primary task를 방해하지 않게 한다.
8. Calendar에서는 lifecycle command를 중복하지 않고 `Flow에서 열기`로 연결한다.
9. menu/sheet 종료 뒤 원래 trigger로 focus를 돌린다.

### UI 선택

- 390: object header의 icon menu 또는 명시적 `Flow 관리` command. 둘을 prototype에서 비교한다.
- 1024/1440: inspector의 `Flow 관리` group과 rail row overflow가 같은 command model을 사용한다.
- mobile/wide가 같은 label과 order를 사용하되 레이아웃을 단순 확대하지 않는다.

### Acceptance

- active Flow에서 archive까지 2 interactions 이하
- archive -> undo -> archive -> reload -> restore 성공
- archived row restore 1 interaction
- active Flow permanent delete control 0
- archived Flow permanent delete entry 1
- focus return, Escape, aria-live 통과
- Calendar active projection은 archive 뒤 0, restore 뒤 원복
- canonical active/inactive copy가 서로 삭제되지 않음

### Marker

- `P34-01-FLOW-MANAGEMENT-OWNER`
- `P34-01-ACTIVE-ARCHIVE-390`
- `P34-01-ARCHIVED-DIRECT-RESTORE`
- `P34-01-LIFECYCLE-PARITY-1024`
- `P34-01-ARCHIVE-UNDO`

### Rollback

새 command composition만 제거한다. lifecycle 저장 값과 기존 handler는 변경하지 않는다.

## P34-02 — permanent-delete contract 재감사와 hardening

### 목적

이미 존재하는 영구 삭제가 모든 개인 데이터만 정확히 지우고 다른 Flow와 published source를 보존하는지 증명한다.

### 작업

1. `permanentlyDeleteSavedFlow`의 삭제 key manifest를 명시적으로 만든다.
2. source-backed personal copy와 personal draft를 별도 fixture로 검증한다.
3. 다음 개인 데이터를 확인한다.
   - saved relation
   - title/date/memo overlay
   - Item drafts와 structural overlay
   - completion state
   - run history와 reflection
   - recurrence/occurrence state
   - archive metadata
   - canonical reconciliation metadata의 해당 copy reference
4. published source와 다른 legacy/canonical copy는 보존한다.
5. backup을 받은 뒤에만 삭제 가능한 강제 정책이 필요한지 prototype에서 판단한다.
6. partial failure와 malformed key가 있어도 다른 Flow를 지우지 않게 한다.
7. 삭제 뒤 같은 source를 다시 발견·저장할 수 있게 한다.

### Acceptance

- target personal key 잔존 0
- unrelated Flow key change 0
- published source 삭제 0
- reload ghost row 0
- source-backed 재발견/재저장 가능
- cancel/Escape 시 storage change 0
- backup file에 삭제 전 target data가 포함

### Marker

- `P34-02-PERMANENT-DELETE-MANIFEST`
- `P34-02-PERMANENT-DELETE-ISOLATION`
- `P34-02-PUBLISHED-SOURCE-PRESERVED`
- `P34-02-BACKUP-BEFORE-DELETE`

### Stop condition

삭제 범위가 여러 모듈에 흩어져 있으면 UI rollout을 중단하고 pure deletion plan + adapter를 먼저 만든다. 기존 schema migration은 별도 승인 없이는 하지 않는다.

## P34-03 — 제외·삭제·보류와 recovery grammar

### 목적

쉬운 한 단어로 상태를 뭉개지 않으면서, 사용자가 같은 위치에서 결과와 복구 방법을 예측하게 한다.

### 상태표

| 상태 | source 보존 | personal structure | run | projection | 복구 |
| --- | --- | --- | --- | --- | --- |
| 완료 | 유지 | 유지 | done | 유지 | 다시 열기 |
| 제외 | 유지 | personal exclusion | 무관 | active projection 제외 | 다시 포함 |
| draft 삭제 | 해당 없음 | tombstone | 기록 보존 | active projection 제외 | 항목 복구 |
| occurrence 건너뜀 | series 유지 | 유지 | skipped | 해당 회차만 제외/표시 | 이번 회차 다시 진행 |
| Flow 보관 | 유지 | 유지 | 유지 | active inventory/Calendar 제외 | 복구 |
| 영구 삭제 | public source 유지 | 개인 데이터 삭제 | 삭제 | 삭제 | 불가 |

### 범위

1. shared `CommandVocabulary` 또는 presentation map을 만든다.
2. 저장 전과 저장 후의 include/exclude 문구를 결과 중심으로 맞춘다.
3. source-backed 제외와 personal draft 삭제를 같은 storage operation으로 합치지 않는다.
4. Flow workspace 안에 `제외·삭제한 항목` recovery entry를 한 위치에서 제공한다.
5. resource 숨김/복구가 필요하면 Item recovery와 별도 group으로 둔다.
6. 실제 count를 표시한다.

### Acceptance

- 서로 같은 상태는 동일 label 100%
- 서로 다른 상태는 accessible description으로 의미가 구분됨
- recovery entry 2 interactions 이하
- personal note/date/completion 손실 0
- legacy `excluded_on_start` read compatibility 유지

## P34-04 — 반복 occurrence 편집 범위

### 목적

이미 존재하는 occurrence override와 ICS exception 계약을 사용자가 이해할 수 있는 UI로 연결한다.

### P34-04A current contract audit

- 현재 지원: date reschedule, exclude, restore, stable occurrence ID, EXDATE, RECURRENCE-ID
- 추가 확인: time, duration, memo, title, held/skipped, future-series revision
- source-backed routine과 personal draft routine 차이
- past done/reopened 기록 보존

지원 여부가 확인되기 전 새 recurrence schema를 만들지 않는다.

### P34-04B UI scope

1. occurrence detail에서 `이번 회차만 / 이후 회차 / 전체 반복` 범위를 명시한다.
2. 기본값은 `이번 회차만`.
3. 이번 회차만에서는 date/time/duration/memo와 skip만 허용한다.
4. weekday, interval, end mode는 series scope에서만 허용한다.
5. 변경 전 영향 수량을 보여준다.
6. exception이 있는 occurrence에 간단한 상태 표시와 원래 일정 복구를 제공한다.

### P34-04C Calendar/ICS parity

- UI occurrence count = Calendar count = ICS exception count
- occurrence identity와 series UID 유지
- 다른 occurrence 변화 0
- 완료/다시 열기 state 유지
- DST/timezone fixture 유지

### Acceptance

- one occurrence date/time change after reload 유지
- 다른 occurrence change count 0
- skip -> restore 가능
- past completion loss 0
- duplicate Calendar row/VEVENT 0
- scope radio keyboard 조작 가능

### Structural reopen

기존 occurrence model이 title/memo/time override를 안전하게 표현하지 못할 때만 별도 data RFC를 연다. UI 개발 중 임시 field를 localStorage에 추가하지 않는다.

## P34-05 — undo contract 단일화

### 목적

lifecycle, completion, batch move, Calendar placement가 같은 feedback 원칙을 사용하게 한다.

### 범위

1. shared `UndoNotice` presentation contract를 정의한다.
2. action별 undo 가능 여부와 timeout을 표로 고정한다.
3. mobile은 4탭 위 safe area, wide는 작업 영역과 가까운 위치를 사용한다.
4. 새 notice가 오면 이전 undo가 어떻게 처리되는지 명시한다.
5. undo가 불가능한 영구 삭제에는 notice를 만들지 않는다.
6. focus를 강제로 이동하지 않고 `role=status`로 announce한다.

### 정책표

| 행동 | 즉시 undo | 사전 confirm |
| --- | --- | --- |
| 완료/다시 열기 | 예 | 아니오 |
| 제외/복구 | 예 | 아니오 |
| 날짜 이동 | 예 | batch일 때 preview |
| Flow 보관/복구 | 예 | 아니오 |
| occurrence skip | 예 | 아니오 |
| 영구 삭제 | 아니오 | 예 |

### Acceptance

- 동일 action의 notice label/position parity
- fixed overlap 0
- keyboard undo 가능
- reload 전후 persistence 정책 명확
- 중복 undo owner 0

## P34-06 — Item edit 한 경로와 구조 조정

### 목적

빠른 수정 가능 여부에 따라 1탭/3탭으로 갈리는 현재 진입을 하나로 만든다.

### 범위

1. 모든 executable Item row에 동일한 `수정` entry를 제공한다.
2. accessible name에 Item title과 수정 목적을 포함한다.
3. 제목·날짜·시간·메모는 progressive editor로 연다.
4. 완료 control과 수정 entry를 분리한다.
5. source-backed exclusion, draft deletion, reorder를 advanced structure section으로 모은다.
6. 저장 전 `포함 / 내용 / 일정 / 순서`와 저장 후 edit grammar를 같은 command vocabulary로 맞춘다.
7. date removal을 source-backed personal copy와 draft 모두에서 검증한다.

### 추가 capability gate

source-backed 개인 사본에 user-created Item 추가가 필요한지는 prototype과 simulation으로 결정한다.

착수 조건:

- 8 persona 중 3개 이상이 저장 후 새 Item을 추가하려고 시도
- 기존 draft-only 구조가 실제 user job을 막음
- source 원본과 personal addition을 명확히 구분 가능

조건을 통과하면 기존 personal structural overlay를 source-backed copy까지 확장하는 별도 slice로 분리한다. 특정 slug 전용 기능은 금지한다.

### Acceptance

- six content shapes edit depth 1
- title/date/memo projection parity
- completion state loss 0
- 390에서 row control overlap 0
- edit cancel 후 unsaved change 0

## P34-07 — export command 위치와 범위 통합

### 목적

whole / selected / current export를 같은 Flow workspace에서 예측하게 한다.

### 범위

1. Flow-level `가져가기` entry 한 곳에서 scope를 선택한다.
2. 현재 항목 export는 Item detail에서 shortcut을 유지할 수 있으나 같은 export plan을 연다.
3. action label에 범위와 실제 수량을 포함한다.
4. primary artifact 1개와 secondary 최대 2개 원칙을 유지한다.
5. unsupported destination은 disabled tab으로 늘어놓지 않는다.
6. export receipt에 source와 personal copy identity를 유지한다.

### Acceptance

- preview count = actual row/event count
- scope mismatch 0
- hidden export path 0
- whole/selected/current label parity 100%
- internal term hit 0

## P34-08 — 조건부 My Flow 구조 재설계

이 단계는 P34-00C의 C안 전환 조건을 만족할 때만 연다.

### 허용 범위

- `AppClient.tsx`에서 아래 component를 behavior-neutral extraction
  - `MyFlowLibrary`
  - `MyFlowWorkspaceHeader`
  - `FlowManagementMenu`
  - `ItemCommandSheet`
  - `UndoNoticeHost`
  - `OccurrenceEditor`
  - `ExportScopeSheet`
- mobile: library -> selected Flow -> selected Item의 drill-in hierarchy 재구성
- wide: rail -> plan canvas -> inspector 책임 재정의
- object별 command model을 pure view model로 통합

### 금지

- localStorage key 재작성
- canonical identity 변경
- 4탭 IA 변경
- Home/Find/Calendar 전체 재설계
- Goal dashboard, habit analytics, social feed 추가

### extraction gate

component extraction 전후 DOM marker, E2E, screenshot에 의도하지 않은 변화가 0이어야 한다. extraction과 visual redesign을 같은 commit으로 섞지 않는다.

## P34-09 — final integration과 독립 검토

### 검증

1. docs check
2. unit
3. production build와 `.next/BUILD_ID`
4. targeted lifecycle/edit/recurrence/export E2E
5. full E2E, 가능하면 workers=1 연속 2회
6. 390/1024/1440 browser capture
7. keyboard-only journey
8. screen reader accessible-name audit
9. overflow/fixed overlap
10. console/page error
11. backup -> delete -> restore rehearsal
12. P33 canonical 24/5 copy safety regression

### 24-cell 재실행

P34-00C와 같은 persona/session을 현재 production candidate에서 다시 실행한다.

목표:

- supported 24
- partial/hidden/missing/blocked 0
- destructive result prediction mismatch 0
- command label mismatch 0
- horizontal overflow 0
- unnamed focusable 0
- console/page error 0

### publish 단계

local edit, commit, push, Draft PR, merge, Preview, production deploy를 각각 별도 상태로 기록한다. 자동화 통과를 실제 사용자 검증으로 표현하지 않는다.

## 10. Goal·milestone 방향

P34에서는 별도 Goal 객체를 추가하지 않는다.

현재 유지:

- Flow title
- 전체 진행률
- 단계 group
- 다음 행동
- 완료 기록
- 재사용

Goal overlay를 다시 검토하는 조건:

- 실제 사용자 3명 이상이 장기 Flow에서 별도 목표 문장이나 다시 볼 날짜를 스스로 만들려 함
- 완료 수와 단계만으로 재방문 판단이 어렵다는 관찰이 반복됨

조건을 통과해도 최대 범위는 `목표 한 줄 + 다시 볼 날짜`다. dashboard, habit score, performance analytics는 열지 않는다.

## 11. 공통 데이터 안전 체크리스트

- source Item mutation 0
- personal note loss 0
- completion/reopened loss 0
- occurrence identity change 0
- export identity change 0
- canonical active/inactive copy auto merge 0
- unrelated Flow key deletion 0
- published source deletion 0
- malformed legacy data 때문에 정상 Flow loss 0
- backup/restore round trip loss 0

## 12. 공통 접근성 체크리스트

- visible label과 accessible name의 목적 일치
- icon-only button tooltip과 accessible name
- menu/dialog/sheet Escape
- focus trap과 trigger focus return
- destructive dialog의 초기 focus는 `취소`
- radio group/checkbox/segmented control keyboard 조작
- notice는 `role=status`
- bottom navigation은 main 작업 뒤 focus
- 44px 이상 touch target
- reduced motion에서도 상태 이해 가능

## 13. 계획 변경 프로토콜

각 slice 종료 시 다음 중 하나만 선택한다.

- `keep`: 현재 방향 유지
- `adjust`: acceptance는 맞지만 hierarchy/copy 수정
- `split`: 데이터 위험과 UI 작업을 분리
- `reopen`: 현재 구조로 High finding을 닫을 수 없어 P34-08로 전환
- `defer`: observed-user 또는 external dependency가 필요

계획을 바꾸는 트리거:

- current source가 review 가정과 다름
- 데이터 migration 필요성이 발견됨
- regression이 P33 canonical identity를 건드림
- prototype이 tap-depth/label-parity 기준을 통과하지 못함
- reference pattern이 FlowMe portable execution 원칙과 충돌
- 실제 사용자 관찰이 내부 simulation과 반대 결과를 보임

변경 이유와 영향 범위는 plan 문서에 기록하고, 구현 완료처럼 STATUS에 쓰지 않는다.

## 14. 예상 산출물

P33-G0 통과 후 아래 canonical spec으로 승격한다.

```text
docs/specs/2026-07-25-p34-execution-crud-ux/
  spec.md
  plan.md
  tasks.md
  qa.md
```

slice별 evidence:

```text
docs/content-audit/2026-07-25-p34-00-current-truth/
docs/content-audit/2026-07-25-p34-00-command-prototypes/
docs/content-audit/2026-07-25-p34-01-flow-lifecycle-evidence/
docs/content-audit/2026-07-25-p34-02-delete-contract-evidence/
docs/content-audit/2026-07-25-p34-03-command-grammar-evidence/
docs/content-audit/2026-07-25-p34-04-occurrence-edit-evidence/
docs/content-audit/2026-07-25-p34-05-undo-contract-evidence/
docs/content-audit/2026-07-25-p34-06-item-edit-evidence/
docs/content-audit/2026-07-25-p34-07-export-command-evidence/
docs/content-audit/2026-07-25-p34-final-review-package/
```

각 evidence에는 최소 다음을 남긴다.

- `README.md`
- `audit.md`
- `route-evidence.json`
- screenshot manifest
- 390/1024/1440 screenshots
- 실행한 명령과 정확한 결과
- `evidenceKind`
- observed-user count

## 15. 즉시 다음 실행 목표

다음 작업은 app 구현이 아니라 **P33-G0 + P34-00A current truth audit**이다.

1. P33 PR과 branch 기준선을 확정한다.
2. P33 known publish gaps와 dependency gate를 분리한다.
3. P34 검토의 `undetermined/missing`을 current source로 교정한다.
4. 실제 lifecycle/delete/occurrence/edit/export capability matrix를 다시 만든다.
5. P34-01이 순수 composition 변경인지 데이터 변경인지 확정한다.
6. 그 결과를 보고 P34-00B/C prototype으로 넘어간다.

이 gate를 건너뛰고 P34-01을 구현하면 이미 존재하는 영구 삭제와 occurrence override를 중복 구현할 위험이 있다.

## 16. 이번 계획 작업의 변경 범위

- 앱 코드 변경 없음
- storage/schema 변경 없음
- STATUS/ROADMAP 변경 없음
- commit/push/PR/merge/deploy 없음
- observed-user validation 없음

이 문서는 Claude Design과 Codex의 제안을 current source와 대조한 통합 planning artifact다. 실제 구현 완료 증거가 아니다.
