# FlowMe P35-R8~R12 연속 실행 목표

- 작성일: 2026-07-28
- 상태: 사용자 확인 전 연속 실행용 목표
- 작업 위치: `D:\flowme2605\flow-p35-mece-ux-reset`
- 기준 branch: `codex/p35-mece-ux-reset`
- 기준 HEAD / `origin/main`: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- 현재 구현 상태: P35-01~08 및 P35-R0~R7 로컬 미커밋
- 현재 판정: `block_publish`
- 실제 관찰 사용자: `0`
- 이 문서 작성으로 앱 코드는 변경하지 않는다.

## 1. 이 목표의 역할

이 문서는 P35-R8A부터 P35-R12 비교 실험까지를 한 번의 연속 작업으로 진행하기
위한 실행 계약이다.

기존
`p35-r8-claude-design-adoption-plan-ko.md`의 제품 방향과 slice 구조는 유지하되,
다음 운영 방식을 명확히 한다.

1. P35-R8A~R11은 각 기술 검증을 통과하면 사용자 승인 없이 다음 단계로 진행한다.
2. P35-R12는 bounded Todo/Calendar 실험과 비교 evidence 생성까지 진행한다.
3. 전역 탭 이름, 전역 IA, 기존 `/my`의 역할을 바꾸기 직전에 처음 사용자 확인을
   받는다.
4. 각 slice 완료 보고 때문에 작업을 멈추지 않는다. 결과는 실행 로그에 누적한다.
5. migration, 사용자 기록 손실, stable identity 변경처럼 안전 경계를 넘는 경우에만
   예외적으로 중단한다.
6. 자동화, screenshot, agent simulation은 실제 사용자 검증으로 표현하지 않는다.

이 목표가 끝나는 지점은 `P35-H1 Owner Review Gate`다. P35-R13 최종 publish
gate, commit, push, PR, merge, deploy는 이 목표에 포함하지 않는다.

## 2. 실행 권한과 사용자 확인 시점

### 2.1 사용자 확인 없이 진행할 수 있는 작업

- 현재 dirty worktree inventory와 baseline manifest 작성
- current source와 브라우저 상태 재현
- Claude Design, Codex, 기존 P35 evidence 재검토
- pure selector와 presentation helper 추가
- P35-R8A~R11 구현
- P35-R12 bounded experiment 구현
- unit, build, targeted/full E2E 실행
- 390/1024/1440 screenshot 생성
- heuristic persona simulation
- 동일 데이터 계약 안에서의 bounded 재계획
- 구현 순서의 세부 조정
- current/proposed 비교 review package 작성

### 2.2 처음 사용자에게 확인받을 지점

P35-R12에서 다음 세 대안을 실제 화면과 screenshot으로 비교한 뒤 멈춘다.

- A: 현재 `My Flow` 구조 유지
- B: `My Flow` 안에 교차 Flow `할 일` 실행 보기를 두고 Flow library를 함께 유지
- C: 전역 `My Flow` 탭을 `할 일`로 바꾸고 Flow library 진입을 재배치

기본 추천안은 B다.

이유:

- Calendar와 Todo는 익숙한 실행 surface로 사용할 수 있다.
- Flow 전체 구조, source, 반복 정의, Sheet 순서, Memo 기록은 My Flow에 남길 수
  있다.
- 전역 IA를 바꾸지 않고 실제 사용성을 비교할 수 있다.
- 실패하면 experiment를 숨겨 기존 `/my`로 즉시 돌아갈 수 있다.

### 2.3 예외적으로 즉시 중단할 hard stop

아래 중 하나가 발생하면 자동 진행을 멈추고 근거와 선택지를 보고한다.

1. localStorage 또는 저장 schema migration이 필요하다.
2. canonical Flow, personal overlay, execution run, recurrence series/occurrence,
   export identity를 바꿔야 한다.
3. 기존 완료, 메모, 날짜 override, 순서, 회고, export receipt를 삭제하거나
   자동 병합해야 한다.
4. 기존 dirty 파일의 소유권을 구분할 수 없어 사용자 변경을 덮을 위험이 있다.
5. 전역 3탭 IA를 변경하거나 `/my` library를 제거해야 한다.
6. source 내용의 사실성, 권리, 안전 판단을 임의로 확정해야 한다.
7. rollback에 사용자 데이터 삭제나 migration 역변환이 필요하다.
8. 현재 계획의 핵심 전제가 두 개 이상의 대표 Flow에서 동시에 깨져 bounded
   revision으로 해결할 수 없다.

단순 테스트 실패, CSS 문제, 컴포넌트 분리, helper 추가, screenshot 차이는 hard
stop이 아니다. 원인을 조사하고 같은 계약 안에서 수정한 뒤 계속 진행한다.

## 3. 정본 자료와 읽기 순서

### 3.1 저장소 원칙

1. `AGENTS.md`
2. `agent.md`
3. `docs/harness/README.md`
4. `docs/PRODUCT_PRINCIPLES.md`
5. `docs/SERVICE_STRUCTURE.md`
6. `docs/DECISIONS.md`의 현재 작업 관련 결정

### 3.2 현재 P35 계획과 correctness evidence

1. `docs/specs/2026-07-26-flowme-mece-ux-reset/p35-r8-claude-design-adoption-plan-ko.md`
2. `docs/content-audit/2026-07-28-p35-r7-independent-review-codex/README.md`
3. `docs/content-audit/2026-07-28-p35-r7-independent-review-codex/next-program.md`
4. `docs/content-audit/2026-07-27-p35-r7-bounded-revision-final-gate/README.md`
5. `docs/specs/2026-07-26-flowme-mece-ux-reset/p35-bounded-revision-developer-handoff-ko.md`

### 3.3 Claude Design 제안

1. `D:\flowme2605\flow-mvp\claude_work\디자인 판정 및 구현 우선순위_0728_1014.zip`
2. ZIP 내부 `FlowMe P35-R7 독립 검토.dc.html`
3. ZIP 내부 `FlowMe Calendar Todo 단순화 UX 비교안.dc.html`
4. ZIP 내부 `FlowMe P35 독립 검토.dc.html`
5. 현재 worktree의
   `claude_work/FlowMe P35 Codex Claude Design 통합 검토 프롬프트.txt`

Claude Design 산출물은 visual/interaction proposal 근거다. current local source와
직접 조작 결과를 덮는 구현 정답으로 사용하지 않는다.

### 3.4 현재 source와 테스트

- `components/flow/AppClient.tsx`
- `components/flow/FlowArtifactDataPreview.tsx`
- `components/flow/FlowExecutionPrimitives.tsx`
- `components/flow/FlowExportPanel.tsx`
- `components/flow/SavedFlowReceiptFrame.tsx`
- `lib/flow/my-flow-shape-aware-workspace.ts`
- recurrence, artifact recommendation, export 관련 helper와 unit test
- `tests/e2e/p35-r0-temporal-first-group.spec.ts`
- `tests/e2e/p35-r1-artifact-preflight-parity.spec.ts`
- `tests/e2e/p35-r4-shape-aware-workspace.spec.ts`
- `tests/e2e/p35-r7-bounded-revision-final-gate.spec.ts`

### 3.5 Evidence 우선순위

1. current local browser interaction
2. current source
3. current command/test result
4. current package screenshot
5. Claude Design proposal
6. official reference pattern
7. heuristic simulation
8. prior artifact

접근할 수 없는 자료는 추측으로 채우지 않고 `evidenceKind: inaccessible`로
기록한다.

## 4. 다시 열지 않을 안정된 계약

다음은 이번 연속 실행에서 유지한다.

- `Flow 찾기 / Calendar / My Flow` 3개 전역 진입
- public Flow의 result-first 첫 화면
- 한 번에 한 종류만 여는 저장 전 조정
- 저장 전에 실제 artifact, 범위, 개수를 확인하는 흐름
- 짧은 saved receipt
- My Flow library와 focused Flow workspace 분리
- Calendar는 날짜 있는 개인 Item을 보는 schedule lens
- export의 `범위 -> 개수 -> 형식 -> receipt` 순서
- 콘텐츠별 primary artifact 1개와 의미 있는 secondary artifact 최대 2개
- source, published Flow, personal overlay, structural overlay, execution run,
  recurrence series/occurrence, export identity 분리
- 기존 localStorage key와 개인 기록
- public preview와 저장 후 completion의 상태 구분
- 완료와 다시 열기의 가역성

다음은 추가하지 않는다.

- AI API 또는 crawler
- account, DB, cloud sync
- OAuth 또는 직접 Calendar/Todo 연동
- heavy planner
- 새 artifact type
- 새 전역 탭
- 운동 analytics 또는 별도 운동 기록 시스템
- 60개 이상 Flow를 위한 새로운 taxonomy
- source-backed 원본 구조 mutation

## 5. 자동 판단 규칙

### 5.1 Routine count와 projection 범위

반복 series와 occurrence 개수를 같은 숫자로 표현하지 않는다.

- series 정의: `반복 계획 1개`
- open-ended series receipt: `반복 계획 1개 · 계속 반복`
- 화면 preview: 실제 다음 occurrence 최대 3개
- finite count: 설정한 전체 회차 수를 표시
- end date: 종료일까지 생성 가능한 회차 수를 표시
- range-bound export: 명시한 날짜 범위와 해당 범위의 occurrence 수를 표시
- RRULE 기반 ICS: 실제 파일의 VEVENT 수와 반복 규칙 1개를 구분
- occurrence 확장형 ICS: 실제 파일에 들어간 VEVENT 수를 표시

임의의 4주를 전체 반복 개수처럼 표현하지 않는다. builder가 실제로 사용하는
projection 범위가 있다면 사용자에게 범위를 함께 표시한다.

### 5.2 Memo와 Checklist

대표 `overseas-safety-register`는 source와 Item을 다시 확인한 뒤 아래 기준으로
자동 판정한다.

- 사용자가 수행하고 완료할 독립 행동과 완료 기준이 중심이면
  `Checklist primary + Memo secondary`
- 읽기, 참고, 기록 보존이 중심이고 완료 의미가 약하면
  `Memo primary`, progress/checkbox 제거

현재 독립 검토에서 source structure가 checklist이고 네 항목이 실행 행동으로
확인됐으므로 기본 추천은 `Checklist primary + Memo secondary`다. 실제 source
근거가 반대인 경우에만 B안으로 변경하고 decision log에 이유를 남긴다.

### 5.3 현재 실행 묶음과 전체 계획

- 현재 실행 묶음만 completion control을 소유한다.
- 전체 계획은 전체 범위, 날짜 구조, 순서, 현재 위치를 소유한다.
- 현재 묶음과 같은 stable Item 행을 전체 계획에 다시 그리지 않는다.
- 전체 계획을 무조건 숨기지 않는다.
- 390px에서는 현재 묶음 다음에 전체 계획 disclosure가 이어진다.
- 접힘 기본값은 screenshot 비교로 결정하되, 저장 직후 전체 결과 확인을
  막지 않는 쪽을 선택한다.

### 5.4 날짜 축과 하단 navigation

Claude screenshot에 제기된 날짜 차이와 bottom navigation 겹침은 먼저 현재
브라우저에서 재현한다.

- 재현되면 해당 slice acceptance에 포함해 수정한다.
- 재현되지 않으면 `not_reproduced_current`로 기록하고 코드를 변경하지 않는다.
- screenshot crop이나 캡처 시점 차이를 제품 버그로 표현하지 않는다.

### 5.5 공통 실행 행

모든 shape의 실행 행은 다음 slot을 공유한다.

1. 날짜, 단계 또는 순서
2. Item 제목
3. 보조 정보 한 줄
4. 선택적 상태
5. 저장 후에만 trailing completion checkbox

public preview에는 completion checkbox를 표시하지 않는다. 제목은 공통 Item detail을
열고, 모바일 visible interaction은 `행 열기 + 완료` 두 개 이하로 유지한다.

## 6. 연속 실행 운영 방식

### 6.1 Stage별 공통 순환

각 Stage는 아래 네 pass를 거친다.

1. Product frame
   - 현재 사용자 문제와 acceptance를 다시 확인한다.
   - Claude/Codex 제안과 current source가 충돌하는지 확인한다.
2. Implement
   - 기존 helper와 component pattern을 우선 사용한다.
   - source와 저장 schema를 mutation하지 않는다.
3. Independent review
   - 구현자가 아닌 review 관점으로 duplicate owner, shape 의미, 접근성,
     portability를 다시 검사한다.
4. Evidence/QA
   - targeted test, build, browser, screenshot, diff 검사를 수행한다.

각 Stage가 통과하면 `execution-log.md`에 결과를 추가하고 사용자에게 묻지 않은 채
다음 Stage로 진행한다.

### 6.2 허용되는 재계획

다음은 사용자 승인 없이 가능하다.

- 한 Stage를 A/B 하위 slice로 분리
- pure selector 또는 presentation helper 선행
- 실제 consumer inventory 후 영향 파일 수정
- 테스트가 드러낸 같은-contract correctness bug 수정
- Claude wireframe 대신 current component anatomy에 맞는 구현 선택
- current/proposed screenshot 비교 후 밀도와 disclosure 조정
- 한 Stage 안의 구현 순서 변경
- 새 Medium 이하 finding을 현재 Stage 또는 다음 Stage에 배치

재계획 시 다음을 기록한다.

- 발견
- 기존 가정
- 새 근거
- 변경한 순서 또는 범위
- 유지한 데이터 계약
- rollback
- 검증

새 기능을 편의상 끼워 넣거나 hard stop을 우회하는 재계획은 금지한다.

### 6.3 시뮬레이션

실제 사용자 관찰 대신 다음 heuristic simulation을 사용할 수 있다.

- 처음 저장하는 사용자
- 이사처럼 같은 날짜 묶음을 실행하는 사용자
- 날짜 없는 Checklist 사용자
- 반복 Routine 사용자
- 순서 중심 Sheet 사용자
- 읽기/기록 중심 Memo 사용자
- 20~60개 Flow를 가진 사용자
- keyboard/screen-reader 사용자

각 persona는 최소 다음 세 session을 수행한다.

1. 발견 -> 실제 결과 확인 -> 최소 조정 -> 저장/가져가기
2. receipt -> 실행 -> 완료 -> 다시 열기 -> 수정
3. 기록 확인 -> 전체/선택/현재 export -> 재사용

결과는 `supported / partial / blocked / not_applicable`로 기록한다.
`observed_user` evidence로 기록하지 않는다.

## 7. Stage 0. Baseline과 dirty ownership

### 목표

R0~R7 변경과 이후 변경을 구분할 수 있는 비파괴 기준점을 만든다.

### 작업

1. branch, HEAD, `origin/main`, staged/unstaged/untracked 목록을 기록한다.
2. dirty path를 다음으로 분류한다.
   - P35 기존 구현
   - P35 evidence/docs
   - 사용자 또는 다른 작업
   - 소유권 불명
3. 기존 파일을 stage, revert, delete하지 않는다.
4. baseline file hash와 diff summary를 생성한다.
5. baseline targeted test와 build 결과를 현재 실행으로 기록한다.
6. Routine, Memo, duplicate completion blocker를 current browser에서 다시 재현한다.
7. KST `Asia/Seoul`, 고정 테스트 날짜와 fixture 초기 상태를 명시한다.

### 산출물

`docs/content-audit/2026-07-28-p35-r8-r12-continuous-execution/`

- `README.md`
- `execution-log.md`
- `decision-log.md`
- `baseline-manifest.json`
- `route-evidence.json`
- `journey-scorecard.json`
- `screenshots/`

### 통과 조건

- 기존 dirty 변경을 덮지 않고 이후 변경을 추적할 수 있다.
- 현재 blocker의 route, viewport, fixture, 기대/실제가 기록된다.
- baseline build와 targeted test 결과가 기록된다.
- 소유권 불명 파일과 구현 대상 파일이 충돌하지 않는다.

소유권 충돌이 있으면 hard stop이다. 단순히 dirty 파일이 많다는 이유만으로는
중단하지 않는다.

## 8. Stage 1. P35-R8A Routine execution continuity

### 사용자 문제

월·수·금 계속 반복 Flow에서 첫 회차를 완료하면 다음 회차가 실제로 존재하는데도
`남은 회차가 없습니다.`가 표시된다.

### 고정 fixture

- route: `/f/curated-allblanc-morning-workout` -> `/my`
- timezone: `Asia/Seoul`
- 시작일: `2026-08-03`
- 반복: 월·수·금
- 종료: 계속 반복
- 첫 회차: `2026-08-03`
- 기대 다음 회차: `2026-08-05`

테스트 clock이 필요한 경우 fixture에서 명시적으로 고정한다. 실행 환경의 현재 날짜에
따라 결과가 바뀌게 두지 않는다.

### 구현

- Calendar visible range와 분리된 next open occurrence selector
- finite count/end date 종료 조건
- 첫 occurrence 완료와 다시 열기
- series-aware receipt
- 실제 builder 기반 export count
- stable occurrence ID와 ICS UID 비회귀

가능하면 `AppClient.tsx` 안에 또 다른 조건문을 늘리지 않고 pure helper와 unit
test로 분리한다.

### Acceptance

- `2026-08-03` 완료 후 `2026-08-05`가 즉시 표시된다.
- 완료 취소 후 같은 occurrence ID와 날짜가 복구된다.
- 종료 전에는 종료 문구가 없다.
- open-ended receipt는 `반복 계획 1개 · 계속 반복`으로 읽힌다.
- export preflight count는 실제 ICS 출력 방식과 일치한다.
- Calendar/ICS duplicate event 수는 0이다.
- 시간, 날짜, 순서 변경으로 stable UID가 바뀌지 않는다.
- 기존 완료 기록과 날짜 override를 다시 쓰지 않는다.
- 390x844과 1024x768에서 overflow와 fixed overlap이 없다.

### Marker

- `P35-R8A-ROUTINE-NEXT-OCCURRENCE`
- `P35-R8A-SERIES-OCCURRENCE-COUNT`
- `P35-R8A-ROUTINE-STABLE-IDENTITY`

## 9. Stage 2. P35-R8B Artifact semantic continuity

### 사용자 문제

public에서 Memo로 저장한 Flow가 receipt와 My Flow에서는 완료율과 checkbox가 있는
일반 Todo로 바뀐다.

### 구현

1. `overseas-safety-register`의 source, structure, 실제 Item을 다시 판정한다.
2. 5.2의 자동 판정 규칙으로 primary/secondary를 확정한다.
3. public, receipt, workspace, export의 noun, count, command를 통일한다.
4. resource와 실행 Item을 분리한다.
5. Memo라면 progress와 completion을 제거한다.
6. Checklist라면 public부터 완료 가능한 실행 항목으로 표현한다.
7. secondary artifact는 손실과 count를 실행 전에 보여준다.

### Acceptance

- 동일 Flow의 primary 의미가 모든 surface에서 같다.
- Memo mode의 visible completion control과 progress는 0이다.
- Checklist mode의 실행 Item 수와 export row 수가 일치한다.
- resource는 completion denominator에 포함되지 않는다.
- source link와 개인 메모가 유지된다.

### Marker

- `P35-R8B-ARTIFACT-SEMANTIC-CONTINUITY`
- `P35-R8B-RESOURCE-NOT-EXECUTION`

## 10. Stage 3. P35-R8C Single execution owner

### 사용자 문제

같은 날짜의 같은 Item과 checkbox가 `다음 할 일`과 `전체 계획`에 동시에 나타난다.

### 구현

- current group이 completion을 소유한다.
- whole plan의 같은 group은 `현재 위치 · N개` 요약으로 바꾼다.
- whole plan은 전체 날짜와 순서를 계속 보여준다.
- progress denominator는 한 projection에서 계산한다.
- 완료, 다시 열기, snackbar undo를 같은 stable Item에 연결한다.

### Acceptance

- 첫 viewport에서 stable Item 하나당 visible completion control은 1개다.
- 같은 날짜 Item은 한 묶음으로 보인다.
- whole plan에서 전체 Flow 범위와 현재 위치를 확인할 수 있다.
- 완료 후 행이 사라지는 경우에만 snackbar undo가 나타난다.
- 화면에 남는 완료 행은 checkbox로 다시 열 수 있다.
- 완료와 다시 열기 후 count와 Calendar projection이 일치한다.

### Marker

- `P35-R8C-SINGLE-COMPLETION-OWNER`
- `P35-R8C-UNDO-ONLY-WHEN-HIDDEN`

## 11. Stage 4. P35-R9 Shared execution row grammar

### 구현

- Calendar, Checklist, Routine, Sheet, Memo가 공유하는 row slot contract
- public neutral marker
- saved trailing completion
- title/row open으로 공통 Item detail
- inline command 축소
- 긴 제목 wrapping
- Item detail visible close 한 개
- Escape, focus return, keyboard activation

### Acceptance

- public completion control 수는 0이다.
- saved executable row completion control 수는 1이다.
- 모바일 row visible interaction은 2개 이하다.
- 다섯 shape의 trailing completion 위치가 시각적으로 일관된다.
- keyboard 사용자가 row open과 completion을 구분할 수 있다.
- visible label과 accessible name의 목적이 일치한다.
- sheet/dialog close 후 원래 trigger로 focus가 돌아간다.

### Marker

- `P35-R9-SHARED-EXECUTION-ROW`
- `P35-R9-PREVIEW-NOT-COMPLETION`
- `P35-R9-DETAIL-SINGLE-CLOSE`

## 12. Stage 5. P35-R10 Shape honesty와 export 단순화

### 구현

- Routine의 series/occurrence count 문법
- Memo/Guide의 title, resource, 기록 문법
- Sheet의 현재 행, 다음 행, 전체 진도표
- export summary owner 한 곳
- `내 버전` 제거 또는 personal-state summary 통합
- 한 Item Flow progress bar 제거
- 반복 날짜와 group 날짜 중복 제거
- 60 Flow 상태 filter에서 content shape 제거

### Acceptance

- export 범위와 총 count는 summary 한 곳에서만 보인다.
- format CTA count와 실제 파일의 row/event 수가 일치한다.
- whole/selected/current 범위를 실행 전에 예측할 수 있다.
- unsupported artifact를 비활성 tab으로 늘어놓지 않는다.
- raw RRULE, Step, Item, source-backed 같은 내부어가 노출되지 않는다.
- 상태 filter는 lifecycle 한 축으로 구성된다.

### Marker

- `P35-R10-SHAPE-HONESTY`
- `P35-R10-EXPORT-SUMMARY-ONE-OWNER`
- `P35-R10-LIBRARY-FILTER-ONE-AXIS`

## 13. Stage 6. P35-R11 Wide workspace와 Routine hierarchy

### 구현

1024px 이상:

- 왼쪽: Flow library rail
- 가운데: 현재 실행 묶음과 전체 계획
- 오른쪽: 현재 context에 필요한 inspector

Routine:

- 반복 계획
- 이번 회차
- 지난 회차

Inspector 후보:

- 진행 요약
- 가져가기
- 기록
- 반복 설정
- Flow 관리

모든 section을 항상 펼치지 않는다. 현재 선택과 shape에 필요한 section만 보여준다.

### Acceptance

- 1024/1440이 모바일 한 열을 늘인 화면처럼 보이지 않는다.
- execution canvas 첫 화면은 현재 실행 묶음을 우선한다.
- inspector는 현재 context의 명령만 소유한다.
- 같은 occurrence가 완료와 미완료로 동시에 나타나지 않는다.
- 390에서는 실행 -> 전체 계획 -> 보조 정보 순서로 읽힌다.
- nested card와 중복 heading이 생기지 않는다.
- 390/1024/1440에서 horizontal overflow와 fixed overlap이 0이다.

### Marker

- `P35-R11-WIDE-EXECUTION-INSPECTOR`
- `P35-R11-ROUTINE-SERIES-CURRENT-HISTORY`

## 14. Stage 7. P35-R12 Todo/Calendar bounded experiment

### 목적

전역 IA를 바꾸기 전에 여러 Flow의 Item을 익숙한 Todo/Calendar 실행 surface로
단순화했을 때 실제로 더 이해하기 쉬운지 비교한다.

### 구현 범위

- 기존 `/my` 안에 opt-in 교차 Flow Todo projection
- 그룹: 오늘, 예정, 날짜 없음, 완료
- 기존 stable Item ID, completion, date override 재사용
- Routine은 현재 occurrence 한 건만 표시
- Sheet는 현재 행 또는 현재 단원만 표시
- resource는 Todo 행에서 제외
- Flow별 보기와 원본 Flow 열기
- Todo, Calendar, Flow detail이 같은 Item detail을 사용
- 날짜 지정 시 Todo 예정과 Calendar에 동시 반영
- 날짜 제거 시 Calendar에서 빠지고 날짜 없음으로 복귀

### 비범위

- 전역 탭 이름 변경
- `/my` library 삭제
- 독립 Calendar Item 생성
- priority, tag, reminder, nested task
- drag-and-drop scheduling
- planner dashboard

### 비교 대안

- A: 현재 focused My Flow workspace
- B: My Flow 안의 Todo 실행 보기 + 기존 Flow library
- C: 전역 `할 일` 탭 전환 mock/prototype

C는 비교 prototype까지만 만든다. current production route와 전역 navigation에
적용하지 않는다.

### Acceptance

- 다섯 shape에서 빈 그룹이나 잘못된 실행 행이 생기지 않는다.
- Routine은 현재 occurrence 한 건만 보인다.
- Sheet의 전체 순서는 Flow detail에서 유지된다.
- resource는 Todo completion 대상이 아니다.
- Todo와 Calendar는 같은 stable Item ID와 completion을 읽는다.
- 날짜 지정/제거 왕복 후 duplicate copy나 ghost event가 없다.
- 390에서 조밀하지만 제목과 control이 겹치지 않는다.
- experiment를 끄면 기존 `/my`로 데이터 변경 없이 돌아간다.

### Marker

- `P35-R12-CROSS-FLOW-TODO-EXPERIMENT`
- `P35-R12-TODO-CALENDAR-SAME-ITEM`
- `P35-R12-DATE-REMOVE-RETURNS-UNDATED`
- `P35-R12-EXPERIMENT-ROLLBACK`

## 15. Cross-slice 검증

### 각 Stage

- 관련 unit test
- 관련 targeted Playwright E2E
- `npm.cmd run build`
- 390x844, 1024x768 browser inspection
- `git diff --check`
- docs 변경 시 `npm.cmd run docs:check`

### R8C, R10, R12 cluster 종료

- `npm.cmd test`
- 이전 P35 targeted E2E
- source/personal/run/occurrence/export identity regression

### P35-H1 전

- `npm.cmd ci`
- `npm.cmd run docs:check`
- `npm.cmd test`
- `npm.cmd run build`
- P35 targeted E2E 전체
- `npm.cmd run test:e2e`
- `git diff --check`

full E2E가 환경 자원 문제로 실패하면 제품 실패로 즉시 단정하지 않는다. 원인과
실패 spec을 기록하고 `--workers=1`로 재확인한다. 기능 assertion 실패를 timeout
증가로 덮지 않는다.

### Browser gate

- 390x844
- 1024x768
- 1440x900
- horizontal overflow
- fixed/sticky overlap
- console/page error
- keyboard focus order
- focus trap과 focus return
- accessible name
- 긴 제목 wrapping
- completion/reopen
- 날짜 지정/제거
- series/occurrence count
- export count와 파일 내용
- reload persistence
- backup/restore

## 16. P35-H1 Owner Review Gate

Stage 0~7과 전체 검증이 끝나면 다음 package를 만든 뒤 작업을 멈춘다.

`docs/content-audit/2026-07-28-p35-r8-r12-owner-review-gate/`

- `README.md`
- `review.html`
- `audit.md`
- `decision-options-ko.md`
- `route-evidence.json`
- `journey-scorecard.json`
- `screenshot-manifest.json`
- `screenshots/current/`
- `screenshots/proposed-a/`
- `screenshots/proposed-b/`
- `screenshots/proposed-c/`

### review.html 필수 구성

1. R8A~R11에서 해결한 correctness와 중복 문제
2. Calendar/Checklist/Routine/Sheet/Memo 다섯 shape 비교
3. public -> receipt -> My Flow -> Calendar -> export 연속성
4. 390/1024/1440 current/proposed
5. A/B/C Todo/Calendar 대안
6. stable identity와 개인 기록 보존 결과
7. 남은 Blocking/High/Medium/Low
8. 자동 검증과 실제 사용자 미검증 구분
9. rollback 시 되돌아가는 화면
10. 추천안과 사용자 결정 질문

### 사용자에게 묻는 질문

질문은 최대 세 개로 제한한다.

1. 전역 탭은 `My Flow`로 유지하고 내부에 `할 일` 실행 보기를 두는 B안을
   적용할 것인가?
2. 모바일 전체 계획은 현재 실행 묶음 아래에서 기본 접힘으로 둘 것인가, 범위
   확인을 위해 기본 펼침으로 둘 것인가?
3. 추가 수정 후 R13 final gate로 갈 것인가, 현재 결과로 R13을 시작할 것인가?

### 이 지점에서 반드시 멈출 것

- 전역 `My Flow -> 할 일` 변경 금지
- global navigation 변경 금지
- R13 실행 금지
- commit, push, PR, merge, deploy 금지

사용자가 A/B/C와 전체 계획 기본값을 결정한 뒤 별도 목표로 R13을 시작한다.

## 17. Rollback

| Stage | rollback 단위 | 데이터 영향 |
| --- | --- | --- |
| Stage 0 | manifest와 evidence만 제거 | 없음 |
| R8A | next-occurrence selector와 formatter 사용 해제 | 없음 |
| R8B | artifact recommendation/presentation mapping 복귀 | 없음 |
| R8C | duplicate suppression 해제 | 없음 |
| R9 | shared row component 사용 해제 | 없음 |
| R10 | shape formatter와 export summary 복귀 | 없음 |
| R11 | wide composition wrapper 복귀 | 없음 |
| R12 | experiment opt-in 숨김 | 없음 |

rollback은 기존 완료, 메모, 날짜, 순서, recurrence, export receipt를 삭제하거나
재작성하지 않는다.

## 18. 완료 상태 보고

P35-H1에서 다음을 한 번에 보고한다.

1. 기준 branch와 SHA
2. Stage별 변경 파일
3. 자동 재계획 내역
4. Claude Design/Codex 제안 중 채택, 수정 채택, 보류 항목
5. 유지한 데이터 계약
6. Routine continuity 결과
7. Memo/Checklist 의미 정합 결과
8. single completion owner 결과
9. shared row와 wide workspace 결과
10. Todo/Calendar A/B/C 비교
11. unit/build/E2E/browser 결과
12. screenshot와 review package 경로
13. 남은 위험
14. observed-user count `0`
15. local edit, commit, push, PR, merge, deploy 상태
16. 사용자가 답해야 할 최대 세 질문

## 19. 복붙용 연속 실행 `/goal`

```text
/goal

D:\flowme2605\flow-p35-mece-ux-reset 기준으로 진행해줘.

목표:
FlowMe P35-R8A부터 P35-R12 bounded experiment와 owner review package까지 연속
진행한다. 각 기술 slice가 acceptance를 통과하면 별도 사용자 승인 없이 다음
slice로 진행하고, P35-H1 Owner Review Gate에서만 멈춘다.

정본:
docs/specs/2026-07-26-flowme-mece-ux-reset/
p35-r8-r12-continuous-execution-goal-ko.md

먼저:
1. AGENTS.md
2. agent.md
3. docs/harness/README.md
4. 위 정본 문서
5. 정본 문서에 적힌 Codex/Claude Design/current evidence
를 읽는다.

실행 권한:
- Stage 0 baseline inventory와 manifest
- P35-R8A, R8B, R8C, R9, R10, R11 구현
- P35-R12 bounded Todo/Calendar experiment
- 필요한 current browser 재현
- Claude Design/Codex 제안 재검토
- heuristic persona simulation
- 같은 데이터 계약 안에서의 bounded 재계획
- unit, build, targeted/full E2E
- 390/1024/1440 screenshot과 owner review package

진행 규칙:
- 각 Stage의 marker, targeted test, build, browser acceptance를 통과하면 멈추지
  말고 다음 Stage로 간다.
- Stage 결과는 execution-log와 evidence에 누적한다.
- current source와 current browser evidence를 prior artifact보다 우선한다.
- 기존 dirty 변경을 stage/revert/delete하지 않는다.
- source, personal overlay, execution run, recurrence series/occurrence,
  export identity를 유지한다.
- migration이나 사용자 기록 손실이 필요하면 즉시 중단한다.
- 전역 3탭 IA와 /my library는 P35-H1 전까지 바꾸지 않는다.
- 자동 QA와 simulation을 실제 사용자 검증으로 표현하지 않는다.

첫 사용자 확인 시점:
Stage 0~R12와 전체 검증을 완료하고
docs/content-audit/2026-07-28-p35-r8-r12-owner-review-gate/
에 review.html, A/B/C 비교, screenshot, evidence를 만든 뒤 멈춘다.

이 목표에서는 하지 않을 것:
- P35-R13
- 전역 My Flow -> 할 일 탭 변경
- storage/schema migration
- AI, DB, cloud sync, OAuth
- commit, push, PR, merge, deploy

완료 보고:
Stage별 변경, 재계획, 데이터 계약, 검증, screenshot, review package, 남은 위험,
observed-user count 0, publish 상태와 사용자가 결정할 최대 세 질문을 요약한다.
```
