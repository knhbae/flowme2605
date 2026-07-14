# P24 independent production audit

## Findings

### High 1. 전체 E2E gate가 KST 날짜 롤오버에 따라 실패한다

- 영역: QA/release confidence, 제품 기능 결함으로 판정하지 않음
- route: `/flow-maps/moving-d30` -> `/my?savedMap=moving-d30`
- viewport: 390x844
- evidenceKind: `current_command` + `current_browser`
- 재현:
  1. KST 2026-07-15에 테스트를 실행한다.
  2. 이사일을 테스트 고정값 `2026-07-22`로 저장한다.
  3. My Flow Today와 첫 상세를 검사한다.
- 테스트 기대:
  - Today에 `지난 할 일`이 보인다.
  - 첫 상세가 D-30 항목 `견적 후보 2-3곳을 열고...`이다.
- 실제:
  - 2026-07-15는 이사일 D-7이므로 `관리사무소 공유와 주소 변경 대상 확인`이 오늘 항목으로 보인다.
  - 제품의 현재 날짜 선택이 맞지만 assertion이 고정된 과거 상황을 기대한다.
- 영향:
  - 전체 E2E `274`건 중 2건이 독립 재실행에서도 실패한다.
  - 제품 회귀와 fixture 노후화를 CI 결과만으로 구분하기 어렵다.
- 권장:
  - 각 테스트에서 `page.clock.install()`로 기준 시각을 고정하거나, anchor를 실행일 기준 상대값으로 만든다.
  - 사용자 Today 계산은 변경하지 않는다.

관련 테스트:

- `tests/e2e/flow-mvp.spec.ts:1539`
- `tests/e2e/flow-mvp.spec.ts:3893`

전체 직렬 실행에서는 4건이 실패했으나 나머지 2건(`:4271`, `:4502`)은 즉시 독립 재실행에서 통과해 timeout/flaky로 분류했다.

### High 2. 실제 사용자 관찰은 여전히 0/15다

- 영역: release validation gap
- route: `/`, `/flows`, `/my`, `/calendar`, representative `/f/*`
- viewport: 390x844, 1024x768
- evidenceKind: `prior_artifact_comparison` + `current_automated_simulation`
- 기대: 5 persona x 3 session의 실제 관찰과 이해도 기록
- 실제: observed-user session `0`
- 영향:
  - 자동화는 상태와 결과를 증명하지만 사용자가 entry, undo, export scope, 연결/고정 날짜를 이해하는지는 증명하지 못한다.
  - A~G를 UX 승인으로 닫을 수 없다.
- 권장:
  - 현 production URL로 P24-00B 관찰을 실행한다.
  - 진행자가 기능을 설명하지 않고 막힘, 잘못된 예측, 되돌아감, 소요 시간을 기록한다.

### Medium 1. public Flow 모바일의 읽기 길이는 여전히 크다

- route: `/f/vehicle-inspection-prep`
- viewport: 390x844
- evidenceKind: `current_browser` + `heuristic`
- 재현: fresh context에서 route를 열고 전체 페이지를 훑는다.
- 기대: 저장 판단에 필요한 anchor, 첫 행동, 신뢰 근거를 먼저 이해하고 나머지는 필요할 때 연다.
- 실제:
  - sticky `내 Flow에 저장`, 검사일, 첫 행동은 먼저 보인다.
  - 전체 screenshot은 `390x3220`, 약 3.8 viewport 높이다.
  - 실행 preview, 월간 미리보기, 저장 안내, 제작자, 원문, 주의, browse가 한 페이지에 이어진다.
- 판정: 기능 오류는 아니다. 실제 사용자가 저장 전 어느 지점에서 판단을 끝내는지 관찰해야 한다.
- screenshot: `screenshots/inspection-public-vehicle-mobile.png`

### Medium 2. 고급·결정 편집을 열면 모바일 편집 밀도가 높다

- route: `/my` personal/source-backed item detail
- viewport: 390x844
- evidenceKind: `current_browser` + `heuristic`
- 재현: 항목 열기 -> 수정 -> 세부 설정 열기, decision-eligible 항목도 확인한다.
- 기대: 일상 수정은 제목·날짜·시간·메모로 짧고, 드문 설정만 점진적으로 노출된다.
- 실제:
  - 기본 panel은 progressive disclosure를 지킨다.
  - advanced element 높이는 703px, decision-eligible element는 911px이다.
  - 기능과 label은 명확하지만 작은 화면에서 한 번에 훑기에는 길다.
- 판정: A는 supported. 다만 실제 사용자가 `세부 설정`을 부담 없이 사용하고 저장 위치를 놓치지 않는지 관찰해야 한다.

### Medium 3. dependency audit에 moderate 4건이 남아 있다

- evidenceKind: `current_command`
- 결과: critical 0, high 0, moderate 4
- 경로:
  - direct `next` -> `postcss`
  - direct `exceljs` -> `uuid`
- 영향: 현재 production correctness finding은 아니지만 다음 dependency maintenance에서 통제해 처리해야 한다.
- 주의: 현재 `npm audit fix` 제안은 major downgrade를 포함한다. 이번 감사에서 실행하지 않았다.

## Production과 baseline

- `git fetch origin --prune` 후 `origin/main`: `1f0361209fac3cdd85c67cf64496ff5d5dd9fb9d`
- clean worktree: `D:\flowme2605\.tmp\flowme-p24-independent-production-review`
- branch: `codex/p24-independent-production-review`
- GitHub check:
  - Docs, Unit, Build: success
  - Playwright E2E: success at merge time
- GitHub deployment:
  - environment: Production
  - SHA: `1f036120...`
  - state: success
  - protected deployment URL: `flowme2605-61usach7j-flowme.vercel.app`
- public alias:
  - `https://flowme2605.vercel.app`
  - anonymous HTTP 200
  - P24 production E2E 14/14 pass

보호된 per-deployment URL은 앱 대신 Vercel 보호 화면을 반환하므로 공개 alias와 asset fingerprint를 직접 비교하지 못했다. GitHub deployment record와 공개 alias의 current production test를 결합해 판정했다.

## Correctness results

### KST와 날짜 projection

- KST 오전 local date 기본값: pass
- Today / 전체 목록 / Calendar / ICS date override 일치: pass
- 날짜 이동 전 날짜 0건, 새 날짜 1건: pass
- 날짜 제거 후 Calendar/ICS 제외, list export 유지: prior full-suite current run에서 pass

### 재사용과 anchor

- 새 anchor로 상대 일정 재계산: pass
- `내가 바꾼 날짜 유지`: pass
- 고정 날짜와 연결 날짜 분리: pass
- 과거 실행과 새 실행 분리: current local full-suite 해당 테스트 pass

### 반복

- Allblanc 4주 occurrence: production pass
- sibling occurrence completion/reopen: production pass
- 개인 draft recurrence Calendar 확장: production pass
- RRULE/ICS 일치: production pass
- skip/held keyboard accessible name은 current local full-suite에서 pass, 실제 사람 이해는 미검증

### draft와 hydration

- memo split items 전체 표시와 whole export: production pass
- 빈 miss 저장 차단: production pass
- memo-only user copy: production pass
- `/flows` hard navigation/reload: production pass
- public save 직후 `/my` hydration: production pass

## Claude Design A~G 판정

### A. Progressive editor: supported

- 기본 panel: 날짜, 시간, 메모 중심
- 장소·반복은 접힌 `세부 설정`
- decision field는 eligible item에서만 나타남
- 남은 위험: advanced/decision panel 모바일 밀도

### B. Completion undo: supported

- 완료 직후 snackbar와 `실행 취소`
- 완료 목록에서 checked row를 다시 해제 가능
- detail 안에 중복 완료 control 없음

### C. Calendar unscheduled tray: supported

- 날짜 없는 항목 수와 선택 list 노출
- 선택 후 날짜 preview와 적용
- undo와 reload persistence
- 남은 위험: 사용자가 Calendar에서 이 entry를 스스로 찾는지

### D. Export scope first: supported

- `전체 Flow`와 `선택한 항목`을 format 전에 선택
- 선택 count 표시
- calendar/checklist/sheet/memo가 같은 범위를 읽음

### E. Linked/fixed date modes: supported

- 새 anchor 전체 재계산과 개인 고정 날짜 유지 선택 분리
- Today와 Calendar가 같은 결과 사용
- 남은 위험: copy만 보고 정책 차이를 정확히 예측하는지

### F. One occurrence/one control: supported

- Today runnable row는 완료 control 1개
- detail 안 완료 control 0개
- 다음 예정은 control-free preview
- wide에서 보인 두 actionable row는 서로 다른 stable row key와 제목이었다.

### G. Inline execution notes: supported

- 실행 row에서 한 번 열어 개인 메모/원문 알릴 점 선택
- 완료 후 두 종류를 별도 집계
- 과거 실행에서도 기록 유지

## Accessibility와 layout

현재 production route inspection 10건:

- 390x844 및 1024x768
- horizontal overflow 0
- mobile fixed-navigation interactive overlap 0
- console/page error 0
- visible interactive element의 이름 누락 0
- `/flows` hard reload resolved true

추가 production E2E:

- public save keyboard path pass
- 개인 draft add/complete/reopen/delete/undo keyboard path pass
- reorder/recovery Enter/Space path pass
- recurring skip/held accessible names와 keyboard path는 current local full-suite pass

## 실제 사용자에게 확인할 질문

1. 홈에서 설명 없이 URL/메모 entry를 첫 시작점으로 고르는가?
2. public `/f`에서 저장 결정을 내리기 전 실제로 어디까지 읽는가?
3. 완료 직후 `실행 취소`와 나중의 완료 목록 해제를 모두 찾는가?
4. Calendar에서 날짜 없는 항목을 스스로 발견하고 배치하는가?
5. `전체 Flow`와 `선택한 항목` export 결과를 실행 전에 맞게 예측하는가?
6. `새 이사일에 맞추기`와 `내가 바꾼 날짜 유지` 차이를 설명 없이 이해하는가?
7. `내 메모`와 `원문에 알릴 점`을 적절히 구분하는가?
8. advanced editor를 열었을 때 저장 버튼과 현재 편집 범위를 놓치지 않는가?

## 자동화와 관찰의 경계

- current command: 설치, docs, unit, build, audit, local E2E
- current browser: public production route, localStorage 기반 user simulation, download/clipboard, screenshot
- prior artifact: 이전 P24 package의 목표와 비교에만 사용
- heuristic: 텍스트 길이, 시각 밀도 평가
- observed user: 0건
