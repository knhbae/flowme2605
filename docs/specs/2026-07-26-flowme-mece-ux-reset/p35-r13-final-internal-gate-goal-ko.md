# P35-R13 최종 내부 검증 목표

> 현재 상태: P35는 [PR #161](https://github.com/knhbae/flowme2605/pull/161)과 merge `4a51b08`로 production 기준선이 되었다. PR/main CI와 Vercel Production이 성공했고, 후속 PR #162 closeout은 canonical URL 도달성과 390px·1024px의 제한된 production smoke `6 / 6`을 기록하지만 원시 artifact를 연결하지 않는다. 저장된 실제 Flow로 literal `/my`와 `/my?experiment=off`를 확인하는 비-fixture E2E `2 / 2`가 bounded release evidence로 추가됐으며 runtime·storage·schema는 바뀌지 않았다. 해당 production smoke는 독립 재실행하지 않았고 관찰 사용자는 `0`이다.

## 1. 승인된 제품 결정

P35-R13은 다음 owner 결정을 정본으로 사용한다.

1. My Flow는 **B안**을 채택한다.
   - 여러 Flow의 실행 항목을 한곳에서 보는 `할 일` 보기를 기본으로 둔다.
   - 기존 `Flow` 보관함과 focused Flow workspace는 제거하지 않는다.
2. 실행 목록 표현은 **A안의 날짜별 묶음**을 채택한다.
   - 날짜가 있는 항목은 정확한 날짜 rail이 날짜를 소유한다.
   - 날짜 없는 항목과 완료 항목은 별도 그룹으로 둔다.
3. 기본 Item 행의 visible command를 최소화한다.
   - 행 전체의 열기 target
   - 오른쪽 완료 checkbox
   - 메모, 수정, export, lifecycle은 상세나 Flow workspace에서 제공
4. 모바일 전체 계획은 저장 receipt에서 처음 들어올 때만 자동으로 펼친다.
   - 새로고침, URL 재진입, Flow 보관함 재진입은 접힌 상태
   - 사용자는 `전체 계획` disclosure로 다시 펼칠 수 있음

## 2. 유지하는 계약

- 상태 기반 `/` entry router와 `Flow 찾기 / 캘린더 / 내 Flow` 3개 primary destination
- public `/f` shell
- canonical Flow와 stable Item identity
- source / personal overlay / execution run / occurrence / export ownership
- 완료와 다시 열기
- 날짜 없음 Item과 Calendar projection 경계
- Flow 전체 / 선택 / 현재 항목 export scope
- 보관 / 복구 / 로컬 영구 삭제 lifecycle
- 기존 localStorage key와 backup/restore 형식

이번 변경은 presentation, selector, navigation composition만 다룬다. migration은 없다.

## 3. 구현 범위

### 3.1 My Flow B안 기본화

- plain `/my`는 `할 일`을 연다.
- `view`, `mode=flow`, `flow` target이 있으면 focused Flow를 연다.
- `할 일 / Flow` 전환은 같은 My Flow 내부에서 이루어진다.
- rollback query `experiment=off`는 P35 production review와 bounded release hardening 동안 유지한다.

### 3.2 날짜별 low-command 행

- dated active Item은 `date:YYYY-MM-DD` group으로 묶는다.
- 같은 날짜에서는 기존 projection order를 유지한다.
- undated와 completed는 별도 group으로 유지한다.
- 그룹이 소유한 날짜를 각 행에 반복하지 않는다.
- 기본 행에서 visible `열기`, `수정`, `메모` 텍스트 command를 표시하지 않는다.
- row-open accessible name에는 Item 제목, Flow, 날짜 맥락을 유지한다.
- 완료 checkbox는 trailing 위치 한 종류만 사용한다.

### 3.3 첫 진입 전체 계획

- 새 public saved receipt primary를 누르면 session marker를 남긴다.
- target Flow workspace가 marker를 한 번만 소비한다.
- 첫 진입은 `data-plan-open=true`다.
- reload와 library re-entry는 `data-plan-open=false`다.
- marker는 `sessionStorage`에만 두며 product persistence와 backup에는 추가하지 않는다.
- legacy post-save receipt도 Flow view와 첫 펼침으로 연결한다.

## 4. 대표 시나리오

1. 이사 D-30
   - public 저장
   - receipt
   - 첫 전체 계획 펼침
   - reload 접힘
   - Flow 보관함 재진입 접힘
2. 날짜 없는 개인 draft
   - undated group
   - 날짜 지정
   - 정확한 날짜 group과 Calendar 이동
   - 날짜 제거
   - 같은 stable Item이 undated로 복귀
3. 반복 Flow
   - series 정의를 실행 행으로 중복하지 않음
   - 현재 occurrence 하나만 표시
   - 완료와 다시 열기가 occurrence identity를 유지
4. 다중 Flow
   - 같은 날짜에 여러 Flow Item 표시
   - Flow context는 읽히되 row command는 증가하지 않음
   - Flow 전체 보기는 inspector 또는 Flow tab에서 제공

## 5. Acceptance

### 390x844

- plain `/my`에서 `할 일`이 selected
- exact-date rail 1개 이상
- 행당 row-open 1개, completion checkbox 1개 이하
- visible row open/edit/note command 0
- first saved entry plan open
- reload/library re-entry plan closed
- horizontal overflow 0
- bottom nav/fixed overlap 0

### 1024x768 및 1440x900

- date-grouped list와 contextual inspector가 구분됨
- Item 선택 전 inspector는 짧은 빈 상태
- Item 선택 후 상세는 inspector 한곳에만 표시
- Flow 전체 보기는 contextual command로 유지
- horizontal overflow와 unnamed focusable 0

## 6. 필수 marker

- `P35-R13-B-INTERNAL-TODO`
- `P35-R13-DATE-GROUPED-LOW-COMMAND-ROW`
- `P35-R13-FIRST-ENTRY-WHOLE-PLAN`
- rollback: `experiment=off`

## 7. 검증

```powershell
npm.cmd run docs:check
npm.cmd test
npm.cmd run build
npx.cmd playwright test tests/e2e/p35-r3-receipt-workspace-continuity.spec.ts tests/e2e/p35-r12-cross-flow-todo-experiment.spec.ts tests/e2e/p35-r13-final-internal-gate.spec.ts --workers=1
npx.cmd playwright test tests/e2e/p35-release-hardening-literal-routes.spec.ts --workers=1
npx.cmd playwright test tests/e2e/p35- --workers=1
npm.cmd run test:e2e -- --workers=1
git diff --check
```

Windows wildcard는 shell에서 직접 확장하지 않을 수 있다. 위 `tests/e2e/p35-`는
Playwright의 path 정규식으로 사용하며, 먼저 `--list`에서 P35 23개 파일이
선택되는지 확인한다.

## 8. Evidence

`docs/content-audit/2026-07-29-p35-r13-final-internal-gate/`

- `README.md`
- `audit.md`
- `route-evidence.json`
- `journey-scorecard.json`
- `screenshot-manifest.json`
- `screenshots/`

이전 R8-R12 결과는 비교 기준일 뿐 현재 실행 결과로 대체하지 않는다.

## 9. 최종 판정

- `publish_ready`
- `bounded_fix_before_publish`
- `block_publish`

판정과 별개로 자동화, screenshot, fixture, agent simulation은 실제 사용자 관찰이 아니다.
`observedUserCount`는 `0`으로 기록한다.

commit, push, PR, merge, Vercel deploy는 별도 요청 전에는 수행하지 않는다.
