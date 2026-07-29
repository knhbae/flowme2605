# FlowMe P35 MECE 검토 결과와 개발 현황 인수 문서

- 기준일: 2026-07-27
- 대상 작업 트리: `D:\flowme2605\flow-p35-mece-ux-reset`
- 작업 브랜치: `codex/p35-mece-ux-reset`
- 기준 `origin/main`: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- 실제 관찰 사용자 수: `0`

## 1. 이 문서가 정리하는 것

이 문서는 새 UX 검토나 새 백로그 초안이 아니다.

이미 수행한 다음 작업을 기획 세션에 넘길 수 있도록 하나로 정리한다.

1. MECE 관점에서 다시 정한 화면별 책임
2. `P35-01`~`P35-08`에서 실제로 구현한 내용
3. 구현 후 Codex 독립 검토에서 확인된 유지점과 미완성점
4. 검토 결과로 확정한 `P35-R0`~`P35-R7` 보정 순서
5. 현재 개발·테스트·배포 상태

자동 테스트, 스크린샷, 에이전트 시뮬레이션은 실제 사용자 검증이 아니다.

## 2. 한 줄 판정

P35의 큰 방향은 유효하다. 전면 재설계나 데이터 계약 재작성보다,
이미 만든 화면 책임을 유지하면서 저장 전 결과, 저장 후 연결, 콘텐츠별 실행 단위를
제한적으로 다시 조합하는 `bounded_composition_revision`이 필요하다.

Codex 독립 검토의 판정은 다음과 같다.

- P35 방향: `revise`
- 최종 권고: `bounded_composition_revision`
- Blocking: `0`
- High: `6`
- 권장 대안: `C. Artifact preflight + contextual personalization`
- 데이터 migration: 권고하지 않음
- 실제 관찰 사용자 수: `0`

## 3. 이미 확정한 MECE 화면 책임

핵심 원칙은 다음 한 문장이다.

> 한 화면은 한 질문에 답하고, 같은 명령은 하나의 대표 화면에서 소유한다.

### 3.1 Flow 찾기

- Route: `/flows`
- 질문: 어떤 원문이나 메모를 어떤 Flow로 쓸 수 있는가?
- 소유:
  - URL·메모 입력
  - 기존 Flow 찾기
  - 정직한 메모 제안
  - 원문을 확보할 수 없는 상태
- 소유하지 않음:
  - 개인 실행 기록
  - Calendar 실행
  - Flow 보관·삭제

### 3.2 Public Flow 결과

- Route: `/f/[slug]`
- 질문: 저장하거나 가져가면 실제로 무엇이 만들어지는가?
- 소유:
  - 원문과 전체 범위
  - primary artifact 실제 미리보기
  - 가치 있는 secondary artifact 최대 2개
  - 필요한 최소 기준일
  - 저장 전 한 Item의 제목·상세·날짜 조정
  - FlowMe 저장 또는 외부 가져가기 사전 확인
- 소유하지 않음:
  - 전체 구조 편집기
  - 실행 완료
  - 실행 기록

### 3.3 저장 완료 확인

- Route: `/f/[slug]`의 저장 완료 상태
- 질문: 무엇이 정확히 저장됐는가?
- 소유:
  - 저장 이름
  - 전체 항목 수
  - 날짜 범위
  - 출처
  - `저장한 전체 Flow 보기` 한 개의 주 행동
- 소유하지 않음:
  - 네 개의 다음 경로 선택
  - 실행·편집·export 작업판

### 3.4 My Flow library

- Route: `/my`
- 질문: 어느 개인 Flow를 열 것인가?
- 소유:
  - 검색
  - 활성·보관 상태 필터
  - compact Flow 요약
  - Flow 열기
- 소유하지 않음:
  - 목록 안 완료 처리
  - 행별 export
  - Calendar 실행

### 3.5 개인 Flow workspace

- Route: `/my?selected=<flow>`
- 질문: 이 Flow에서 지금 무엇을 하고 전체 구조를 어떻게 관리하는가?
- 소유:
  - 콘텐츠 형태에 맞는 현재 실행 단위
  - 전체 계획
  - 완료·다시 열기
  - Item 상세·수정·메모
  - whole·selected·current 가져가기
  - Flow 설정·보관·재사용
- 소유하지 않음:
  - 중복 저장 receipt
  - 모든 콘텐츠에 고정된 `다음 행동`
  - 비어 있는 `기록` 탭

### 3.6 Calendar

- Route: `/calendar`
- 질문: 날짜가 정해진 여러 Flow 항목이 언제 있는가?
- 소유:
  - 날짜 있는 항목의 월간 보기
  - Flow 범위 선택
  - 선택일 agenda
  - 완료·다시 열기
  - 개인 Flow 열기
- 소유하지 않음:
  - 날짜 없는 항목 보관함
  - 구조·메모·날짜 상세 편집기
  - Flow lifecycle
  - 실행 회고

### 3.7 실행 기록

- 위치: 개인 Flow workspace의 조건부 disclosure
- 질문: 이 실행에서 어떤 상태 변화가 있었는가?
- 소유:
  - 완료
  - 다시 열기
  - 건너뜀
  - 보류 event
- 소유하지 않음:
  - Item 메모
  - 전체 진행률
  - 재사용 command
  - export

## 4. P35-01~P35-08에서 이미 구현한 것

| Slice | 구현 내용 | 상태 |
| --- | --- | --- |
| `P35-01` | 별도 Home 제거, 저장 상태에 따라 `/flows` 또는 `/my`로 보내는 entry router, 3탭 navigation | 로컬 구현 |
| `P35-02` | public Flow에서 긴 설명보다 실제 결과를 먼저 보여 주는 result-first 구성 | 로컬 구현 |
| `P35-03` | 이름·기준일·포함 항목·반복을 동시에 펼치지 않고 한 번에 한 종류만 조정 | 로컬 구현 |
| `P35-04` | My Flow에서 죽은 Calendar·checklist·routine 분기 제거, Calendar 역할 분리 | 로컬 구현 |
| `P35-05` | My Flow를 library와 선택한 Flow의 focused workspace로 분리 | 로컬 구현 |
| `P35-06` | Calendar를 compact month marker와 선택일 전체 agenda 중심의 date lens로 정리 | 로컬 구현 |
| `P35-07` | export에서 형식보다 whole·selected·current 범위와 count를 먼저 선택 | 로컬 구현 |
| `P35-08` | 위 변경의 로컬 MECE 통합 gate | 로컬 gate 기록 |

이 구현으로 좋아진 부분은 분명하다.

- Home과 Flow 찾기의 중복 책임을 줄였다.
- public 화면에서 실제 저장 결과가 이전보다 빨리 보인다.
- My Flow 목록과 선택한 Flow 작업 공간을 분리했다.
- Calendar가 구조 편집기처럼 커지는 것을 막았다.
- export의 범위와 결과 수량을 이전보다 명시적으로 만들었다.

다만 `P35-08 local gate pass`는 production 배포나 실제 사용자 검증 완료를 뜻하지 않는다.

## 5. 구현 후 Codex가 다시 확인한 미완성점

### High 1. Public 미리보기와 실제 가져가기 결과가 다름

- 화면이 약속한 primary artifact와 실제 export 형식·수량·개인 수정값이 항상
  일치하지 않는다.
- 반복 Flow는 미확정 예시 일정과 저장 후 실제 일정의 의미가 끊긴다.
- 대응: `P35-R1`

### High 2. 저장 완료 확인이 두 번 반복됨

- public receipt 뒤 My Flow에서 다시 receipt와 네 개 행동이 나타난다.
- 사용자는 저장 결과를 확인한 뒤 또 결정을 요구받는다.
- 대응: `P35-R3`

### High 3. My Flow의 고정 분류가 콘텐츠 형태를 무시함

- `다음 행동 / 전체 계획 / 기록`이 날짜형, 체크리스트형, 반복형, Sheet형,
  Memo형에 모두 같은 방식으로 적용된다.
- 대응: `P35-R0`, 이후 `P35-R4`

### High 4. 저장 전 Item 수정이 부족함

- 포함 여부만 바꿀 수 있고 제목·상세·개별 날짜는 저장 후에만 수정된다.
- full editor는 필요 없지만 한 Item을 맥락 안에서 고칠 경로는 필요하다.
- 대응: `P35-R2`

### High 5. 메모 초안만 다른 문법을 사용함

- 메모 초안은 14개 입력이 펼쳐진 긴 폼에 가까워 public result-first,
  one-kind adjustment와 맞지 않는다.
- 대응: `P35-R5`

### High 6. 반복 Flow의 preview·receipt·Calendar·export가 끊김

- 시작일이 확정되지 않은 예시 날짜가 실제 일정처럼 보이거나, 저장 뒤 날짜 없는
  한 항목으로 축소되는 경우가 있다.
- 대응: `P35-R1`, 이후 shape 검증

### Medium

- `기록`의 독립 탭 가치가 불명확하다.
- public 가져가기가 여러 disclosure로 길어진다.
- 모바일 Calendar 선택일 상세가 월간 grid 아래 멀리 있다.
- My Flow filter가 상태와 콘텐츠 형태를 섞는다.
- `첫 할 일 시작`이 상세만 열고 완료할 수 없는 경우가 있다.

## 6. 제품 오너 피드백 F01~F07에 대한 기존 판정

| 피드백 | 기존 판정 | 반영 위치 |
| --- | --- | --- |
| Flow 조정에서 상세·날짜도 수정 | 필요. 제목·상세·날짜만 contextual edit로 제공 | `R2` |
| 저장 직후 별도 오늘 할 일 화면이 필요한가 | 별도 Today 화면을 만들지 않음. receipt 뒤 전체 personal Flow workspace로 이동 | `R3` |
| 같은 날짜의 다음 할 일을 묶어 보여야 함 | 필요. 가장 가까운 날짜의 미완료 묶음을 우선 표시 | `R0`, `R4` |
| 저장 전 필요한 artifact와 export를 함께 보여야 함 | 필요. 고정 5개 탭 대신 primary 1개와 secondary 최대 2개 | `R1` |
| 되돌리기 노출 조건 | 행이 사라지는 완료만 즉시 undo. 행이 남으면 같은 위치에서 다시 열기 | 공통 command 규칙 |
| `다음 행동` 정체성이 모호함 | 맞음. 고정 탭을 없애고 콘텐츠 형태별 실행 단위로 대체 | `R4` |
| `기록`이 애매함 | 맞음. event가 있을 때만 조건부 표시하고 메모·회고·재사용과 분리 | `R4` |

## 7. 선택한 설계안과 거절한 설계안

### 선택

`C. Artifact preflight + contextual personalization`

- 먼저 쓸 만한 실제 결과를 보여 준다.
- 저장 전에 필요한 Item만 제한적으로 수정한다.
- FlowMe 저장과 외부 가져가기 결과를 같은 preflight에서 비교한다.
- 기존 personal overlay와 stable identity를 재사용한다.

### 거절

저장 전 full editor

- 첫 useful result가 늦어진다.
- 모바일 폼 복잡도가 다시 커진다.
- source와 personal write path가 섞일 위험이 있다.
- 한 번에 한 종류만 조정한다는 P35 원칙을 되돌린다.

## 8. 검토 이후 확정한 개발 순서

```text
P35-R0 시간 정합성과 첫 날짜 묶음
  -> P35-R1 artifact preflight 정합성
       -> P35-R2 저장 전 contextual Item 수정
       -> P35-R3 receipt와 personal workspace 연결
            -> P35-R4 콘텐츠 형태별 실행 단위와 조건부 기록
            -> P35-R6 모바일 Calendar 선택일 상세
       -> P35-R5 메모 초안 공통 문법
P35-R0~R6
  -> P35-R7 최종 독립 gate
```

대형 미커밋 작업 트리의 충돌을 피하기 위한 기본 실행 순서는 다음과 같다.

```text
R0 -> R1 -> R2 -> R3 -> R4 -> R5 -> R6 -> R7
```

각 slice는 구현, targeted test, 관련 회귀, 390·1024 screenshot, rollback 확인을
마친 뒤 다음 slice로 넘어간다.

## 9. 각 남은 slice의 목적

### P35-R0. 시간 정합성과 첫 실행 묶음

- 과거 파생 일정이 있으면 저장 전에 한 줄로 알린다.
- 저장 후 오늘 또는 가장 가까운 미래 날짜의 미완료 항목을 날짜 묶음으로 보여 준다.
- 미래가 없으면 가장 가까운 과거 미완료 날짜를 사실대로 보여 준다.
- 지난 항목은 삭제·완료 처리하지 않고 접힌 목록에 보존한다.
- My Flow와 Calendar의 제목·날짜·수량·stable identity를 맞춘다.

### P35-R1. Primary artifact preflight 정합성

- public preview와 실제 외부 가져가기가 같은 artifact plan을 읽게 한다.
- primary 1개, eligible secondary 최대 2개만 보여 준다.
- artifact 이름, count, destination, 빠지는 정보를 일치시킨다.
- 반복 schedule의 예시값과 확정된 개인값을 구분한다.

### P35-R2. 저장 전 contextual Item 수정

- 한 Item을 한 번에 연다.
- 제목, 상세, 개별 날짜만 수정한다.
- 변경 전후 artifact count와 날짜 범위를 같은 화면에서 갱신한다.
- source를 수정하지 않고 저장 후 personal overlay로 이어 간다.

### P35-R3. Receipt와 personal workspace 연결

- receipt를 저장 이름, count, date range, source 확인으로 축소한다.
- 주 행동은 `저장한 전체 Flow 보기` 한 개로 둔다.
- 중복 receipt와 네 개의 post-save 행동 선택판을 제거한다.
- 선택한 Flow의 전체 workspace로 직접 연결한다.

### P35-R4. 콘텐츠 형태별 실행 단위와 조건부 기록

- 날짜형: 가장 가까운 날짜의 미완료 묶음
- 체크리스트형: 다음 1~3개와 전체 목록
- 반복형: 현재 occurrence와 series 요약
- Sheet형: 현재 row와 다음 row
- Memo·Guide형: 관련 section, 인위적인 다음 행동 없음
- 실행 기록은 event가 있을 때만 표시한다.

### P35-R5. 메모 초안 공통 result grammar

- 14-input 긴 폼보다 파싱된 실제 결과를 먼저 보여 준다.
- 첫 화면 quick value는 전체 제목과 선택적 첫 날짜 정도로 제한한다.
- Item 수정은 R2 editor를 재사용한다.
- R1 preflight와 R3 receipt·workspace를 재사용한다.

### P35-R6. 모바일 Calendar 선택일 상세

- 390px에서는 날짜 선택 후 agenda를 bottom sheet로 연다.
- 1024px의 side agenda는 유지한다.
- 완료 primitive를 재사용하고 Flow 열기는 My Flow workspace로 연결한다.
- Escape와 focus return을 보장한다.

### P35-R7. 최종 독립 gate

- 5개 콘텐츠 형태 x 3개 session 재검증
- 390x844, 1024x768, 핵심 1440x900 검증
- source·personal·run·occurrence·export 정합성
- overflow, fixed overlap, accessible name, keyboard focus
- docs, unit, build, targeted·full E2E
- 자동 검증과 실제 사용자 관찰 결과 분리

## 10. 현재 실제 개발 상태

### 완료된 검토·설계

- `UXR-00`~`UXR-09`
- A-prime 방향 승인
- `P35-01`~`P35-08` 로컬 구현과 evidence
- P35 구현 후 Codex 독립 재검토
- `bounded_composition_revision`과 `R0`~`R7` 순서 확정

### 현재 구현된 P35-R0

- dated Flow의 temporal presentation pure adapter
- 오늘·미래·과거·날짜 없음 분류
- 같은 날짜 미완료 Item 묶음
- 지난 Item accessible disclosure
- public 저장 전 과거 항목 compact warning
- 완료 -> 되돌리기 -> 다시 완료 -> reload 상태 유지
- My Flow와 Calendar의 같은 날짜 묶음 정합성
- 390px·1024px R0 screenshot

### 현재 검증 상태

- R0 pure adapter unit: `7 / 7` 통과
- 전체 unit: pretest `79 / 79`, test `590 / 590` 통과
- R0 targeted Playwright: `3 / 3` 통과
- 기존 R0 영향 E2E 실패 6건: 단일 행을 가정한 오래된 selector를 날짜 묶음 기준으로
  수정한 뒤 개별 재실행 `6 / 6` 통과
- `docs:check`: 통과
- production build: 통과
- R0 screenshot: 3장 생성 및 시각 확인
- 첫 full E2E: `358 / 359`
  - 기존 URL-first 장기 시나리오가 상세 편집 버튼 대기 중 4분 timeout
  - 같은 시나리오 단독 직렬 재실행 `1 / 1` 통과
- 최종 full E2E 직렬 재실행: `359 / 359` 통과
- R0 evidence 문서: 작성 완료
- R0 owner checkpoint: 미완료

## 11. R0 다음 단계로 넘어가기 전 owner 확인

다음 세 가지를 내부 owner가 확인하기 전 `P35-R1`을 시작하지 않는다.

1. 저장 전 지난 일정 경고가 불필요하게 길거나 불안감을 키우지 않는가?
2. 같은 날짜의 미완료 항목 묶음이 390px 한 화면에서 읽히는가?
3. `지난 할 일 N개 보기`가 삭제·누락이 아니라 보존된 목록으로 이해되는가?

이는 내부 owner review이며 실제 사용자 검증으로 계산하지 않는다.

## 12. 고정해서 유지할 계약

다음은 후속 기획에서 다시 열지 않는다.

- `Flow 찾기 / Calendar / My Flow` 3탭
- 별도 Home 제거와 entry router
- public `/f/[slug]` shell
- source와 published Flow
- personal overlay와 structural overlay
- execution run
- recurrence series와 occurrence
- whole·selected·current export identity와 receipt
- stable Item ID
- 기존 localStorage key와 snapshot schema

## 13. 이번 프로그램의 비범위

- 4번째 전역 탭
- 새 Today route
- 저장 전 full editor
- full planner 또는 goal dashboard
- Calendar 전체 재설계
- account, DB, cloud sync
- AI API, crawler
- Google Calendar·Todoist·Notion OAuth
- storage migration
- source·run·occurrence·export identity 재작성

## 14. Publish 상태

| 단계 | 현재 상태 |
| --- | --- |
| local P35 변경 | 존재 |
| commit | 없음 |
| push | 없음 |
| PR | 없음 |
| main merge | 없음 |
| Preview deploy | 기존 주소는 있으나 독립 검토 당시 인증 때문에 직접 조작하지 못함 |
| Production deploy | 없음 |
| 실제 관찰 사용자 | 0명 |

현재 작업 트리의 대형 미커밋 P35 baseline을 reset, clean, checkout, stash하면 안 된다.
원래 `D:\flowme2605\flow-mvp`의 dirty worktree도 건드리지 않는다.

## 15. 정본 산출물

### MECE 설계

- `docs/content-audit/2026-07-26-flowme-mece-ux-reset/README.md`
- `docs/content-audit/2026-07-26-flowme-mece-ux-reset/review.html`
- `docs/specs/2026-07-26-flowme-mece-ux-reset/plan.md`
- `docs/specs/2026-07-26-flowme-mece-ux-reset/design-package.md`
- `docs/specs/2026-07-26-flowme-mece-ux-reset/simulation.md`

### P35-01~08 구현 evidence

- `docs/content-audit/2026-07-26-p35-01-entry-router-evidence/`
- `docs/content-audit/2026-07-26-p35-02-public-result-first-evidence/`
- `docs/content-audit/2026-07-26-p35-03-adjust-one-kind-evidence/`
- `docs/content-audit/2026-07-26-p35-04-my-flow-safe-split-evidence/`
- `docs/content-audit/2026-07-26-p35-05-my-flow-library-workspace-evidence/`
- `docs/content-audit/2026-07-26-p35-06-calendar-lens-evidence/`
- `docs/content-audit/2026-07-26-p35-07-export-scope-first-evidence/`
- `docs/content-audit/2026-07-26-p35-08-final-mece-gate/`

### Codex 구현 후 독립 재검토

- `docs/content-audit/2026-07-27-p35-owner-feedback-independent-review-codex/README.md`
- `docs/content-audit/2026-07-27-p35-owner-feedback-independent-review-codex/review.html`
- `docs/content-audit/2026-07-27-p35-owner-feedback-independent-review-codex/audit.md`
- `docs/content-audit/2026-07-27-p35-owner-feedback-independent-review-codex/next-program.md`
- `docs/content-audit/2026-07-27-p35-owner-feedback-independent-review-codex/surface-ownership.json`
- `docs/content-audit/2026-07-27-p35-owner-feedback-independent-review-codex/keep-move-remove-command-matrix.json`
- `docs/content-audit/2026-07-27-p35-owner-feedback-independent-review-codex/decision-matrix.json`
- `docs/content-audit/2026-07-27-p35-owner-feedback-independent-review-codex/completion-audit.md`
- `docs/content-audit/2026-07-27-p35-owner-feedback-independent-review-codex/screenshots/`

### 후속 개발 정본

- `docs/specs/2026-07-26-flowme-mece-ux-reset/p35-bounded-revision-developer-handoff-ko.md`

### 현재 R0 evidence

- `docs/content-audit/2026-07-27-p35-r0-temporal-first-group-evidence/`

## 16. 기획 세션에서 결정할 것

기획 세션은 P35 전체 방향을 다시 백지화하지 않는다.

다음만 순서대로 결정한다.

1. R0 owner checkpoint 3개 항목의 승인 또는 수정
2. R1에서 public preview와 external result의 명칭·수량·손실 표현
3. R2에서 허용할 저장 전 Item 편집 깊이
4. R3 저장 완료 확인에서 남길 정보와 단일 주 행동
5. R4 콘텐츠 형태별 첫 실행 단위와 기록 노출 조건
6. R5 메모 proposal의 첫 화면 입력 수
7. R6 모바일 선택일 상세 container

결정하지 않을 것:

- 3탭 IA 재개방
- 별도 Home 부활
- 고정 5개 artifact 탭
- 저장 전 full editor
- 데이터 계약 또는 migration
- heavy planner 기능

## 17. 기획 세션 전달용 요약

FlowMe는 `원문·메모 -> 실제 결과 미리보기 -> 최소 개인화 -> My Flow 실행 또는
외부 가져가기 -> 완료·재사용`의 portable execution layer다.

P35에서 별도 Home을 제거하고 3탭으로 정리했으며, public result-first, 한 번에 한
종류의 조정, My Flow library/workspace 분리, Calendar date lens, scope-first
export를 로컬 구현했다.

구현 후 Codex 독립 검토는 큰 구조를 유지하되 여섯 연결을 고치라고 판정했다.
public preview와 export 정합성, 중복 저장 확인, 콘텐츠 형태를 무시한 My Flow,
저장 전 Item 편집 부족, 메모 긴 폼, 반복 Flow 일정 의미 불일치다.

따라서 전면 재설계 대신 `R0`~`R7` bounded revision을 진행한다. 현재 `R0`의
과거 일정 경고와 같은 날짜 첫 실행 묶음은 구현됐고 자동 검증을 완료했다.
owner가 모바일 경고·날짜 묶음·지난 항목 disclosure를 확인한 뒤에만 `R1`로
넘어간다.
