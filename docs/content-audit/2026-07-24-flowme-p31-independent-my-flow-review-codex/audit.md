# FlowMe P31 Independent My Flow Review

## Verdict

`my_flow_structural_reopen`

현재 P31은 저장 전 preview, receipt, completion undo, undated Calendar 배치, recurrence identity, personal draft overlay, archive/restore/permanent delete 계약을 안정적으로 갖고 있다. 그러나 My Flow에서 **수정, 전체 export, archive/restore 중 3개가 hidden이거나 5 interactions를 초과**해 정본의 structural reopen 기준 5를 충족한다.

재개 범위는 My Flow 내부 composition이다. 4탭 IA, public `/f`, source/personal/run/occurrence/export 계약은 다시 열지 않는다. 선택안은 B `library -> focused workspace`다.

Observed-user count: **0**. production automation, screenshot, fixture, heuristic simulation은 실제 사용자 검증이 아니다.

## Severity Findings

### High P31-IR-F01: 선택한 Flow의 핵심 조작이 탭과 접힘 영역에 분산된다

- Route: `/my?view=flows`
- Viewport: 390x844, 1024x768
- Start: 저장 Flow 5개 이상, Flow 목록에서 한 Flow를 선택한 상태
- Reproduction:
  1. Flow 목록에서 한 Flow를 연다.
  2. 항목 제목, 날짜, 메모를 바꾸기 위해 전체 계획, 항목 열기, 상세 펼치기, 수정으로 이동한다.
  3. 전체 Flow를 가져가기 위해 기록, 가져가기와 고급 작업, 가져가기를 연다.
  4. 보관 후 reload하고 보관됨 필터에서 복구한다.
- Expected: 선택한 Flow의 자주 쓰는 수정과 가져가기는 3단계 이내, 보관과 복구는 4단계 이내에서 한 객체의 명령으로 예측할 수 있어야 한다.
- Actual: Flow 열기는 2단계지만 항목 수정 6단계, 전체 export 6단계, 보관 후 복구 6단계다. 실행/전체 계획/기록 탭과 별도 고급 disclosure, 관리 메뉴를 오가야 한다.
- Impact: 기능은 존재하지만 사용자가 기능이 없다고 판단하거나, 항목을 실행하는 대신 설정 구조를 탐색하게 된다.
- Evidence: `current_production_interaction`, `current_browser_automation`, `current_source`, `heuristic_simulation`
- Evidence refs: `current-journey-probes.json#moving`, `screenshots/probe-moving-workspace.png`, `components/flow/AppClient.tsx:15255`, `components/flow/AppClient.tsx:15301`, `components/flow/AppClient.tsx:15420`
- Data contract: 없음. source/personal/run/occurrence/export projection은 유지하고 command composition만 바꾼다.
- Resolution: B안의 focused workspace를 채택한다. Flow를 연 뒤 object header 아래에 다음 행동, 빠른 수정, 가져가기, 관리 명령을 모으고 전체 계획과 기록은 progressive disclosure로 둔다.
- Rejected: A안의 문구/간격 조정만으로는 6단계 경로가 줄지 않는다. C안은 단순 checklist와 source Flow까지 run 중심으로 왜곡한다.
- Rollback: 기존 MyFlows projection과 storage를 유지한 채 workspace composition 컴포넌트만 이전 렌더러로 되돌린다.
- Acceptance: `P32-MY-FLOW-FOCUSED-COMMANDS`, screenshots/p32-02-my-flow-focused-390.png, screenshots/p32-02-my-flow-focused-1024.png
- Observed-user question: 설명 없이 제목/날짜 수정, 전체 가져가기, 보관 위치를 각각 찾을 수 있는가?

### High P31-IR-F02: public 이사 Flow 저장 후 전체 기준일을 다시 바꿀 진입이 없다

- Route: `/f/moving-d30-basic -> /my?savedFlow=moving-d30-basic`
- Viewport: 390x844
- Start: 이사일 2030-08-15로 24개 일정을 저장하고 전체 Flow를 연 상태
- Reproduction:
  1. 저장 전 이사일을 입력하고 저장한다.
  2. 저장 완료 receipt에서 전체 Flow 보기를 누른다.
  3. 전체 계획 탭에서 이사일 또는 전체 일정 기준 변경을 찾는다.
  4. 개별 항목 편집과 비교한다.
- Expected: 이사일 변경 한 번으로 상대 일정이 다시 계산되고, 개인 고정 날짜와 메모는 유지되어야 한다.
- Actual: production workspace에는 direct anchor와 personal-copy anchor 진입이 모두 없다. 개별 항목 제목/날짜/메모 편집은 가능하다.
- Impact: 재사용할 때 24개 일정을 개별 수정하거나 새로 저장해야 하므로 P1의 두 번째 세션이 끊긴다.
- Evidence: `current_browser_automation`, `current_source`
- Evidence refs: `current-journey-probes.json#moving.whole_anchor_adjustment_reachable=false`, `components/flow/AppClient.tsx:15372`, `tests/e2e/flow-mvp.spec.ts:3842`
- Data contract: 기존 anchor, 개인 날짜 override, effective-date precedence를 재사용할 수 있다. 기존 저장물 migration은 불필요한 것으로 보이나 public saved-flow eligibility를 구현 전 확인해야 한다.
- Resolution: Flow header의 빠른 수정에서 전체 기준일 변경을 제공하고, 개인 고정 날짜를 유지한다는 결과 preview를 저장 전에 보여준다.
- Rejected: 24개 항목을 개별 이동시키지 않는다. 새 Flow로 강제 복제해 과거 run identity를 덮지 않는다.
- Rollback: 기존 anchor를 보존하고 새 기준일 overlay 적용만 취소한다.
- Acceptance: `P32-ANCHOR-REUSE`, screenshots/p32-04-anchor-reuse-390.png
- Observed-user question: 재사용할 때 사용자는 전체 기준일 변경과 새 사본 만들기 중 무엇을 먼저 기대하는가?

### High P31-IR-F03: 보관, 복구, 영구 삭제의 데이터 의미는 맞지만 발견 경로가 분리돼 있다

- Route: `/my?view=flows`
- Viewport: 390x844
- Start: 저장 Flow workspace를 연 상태
- Reproduction:
  1. Flow header의 더보기 메뉴를 열어 보관한다.
  2. reload 후 Flow 목록으로 돌아간다.
  3. 상태 필터를 보관됨으로 바꾼다.
  4. 복구 또는 영구 삭제를 선택하고 backup 확인을 거친다.
- Expected: 한 Flow의 관리 메뉴에서 보관과 삭제의 차이, 되돌릴 수 있는 범위, 다음 위치가 예측되어야 한다.
- Actual: 보관은 object menu, 영구 삭제는 보관됨 inventory, 전체 데이터 관리는 page header에 있다. 데이터 보호는 강하지만 사용자는 삭제가 어디 있는지 알기 어렵다.
- Impact: 삭제 기능이 없다고 오해하거나, 보관과 영구 삭제를 같은 동작으로 이해할 수 있다.
- Evidence: `current_production_interaction`, `current_browser_automation`, `current_source`
- Evidence refs: `current-journey-probes.json#moving.archive`, `screenshots/scale-20-mobile-workspace.png`, `components/flow/AppClient.tsx:14804`, `components/flow/AppClient.tsx:15179`, `lib/flow/personal-flow-lifecycle.ts:135`, `lib/flow/storage.ts:932`
- Data contract: archive/restore와 permanent delete 계약은 그대로 유지한다. UI에서 두 동작을 합치지 않는다.
- Resolution: Flow 관리 sheet에 보관을 기본으로 두고, 보관된 Flow에서만 영구 삭제를 노출한다. 현재 상태와 이동할 위치를 action label에 포함한다.
- Rejected: 즉시 영구 삭제를 primary로 올리지 않는다. 전역 데이터 관리 화면만으로 object lifecycle을 대신하지 않는다.
- Rollback: 기존 관리 메뉴와 보관됨 inventory로 되돌리며 lifecycle record는 손대지 않는다.
- Acceptance: `P32-LIFECYCLE-DISCLOSURE`, screenshots/p32-04-flow-manage-390.png
- Observed-user question: 사용자는 보관과 영구 삭제의 차이를 추가 설명 없이 예측하는가?

### High P31-IR-F04: 검토 정본의 mixed travel route가 production에서 404다

- Route: `/f/real-mofa-overseas-travel-prep`
- Viewport: 390x844, 1024x768
- Start: 독립 검토의 mixed date/check/resource 콘텐츠 shape
- Reproduction:
  1. 정본 프롬프트가 지정한 route를 연다.
  2. HTTP status와 사용자 화면을 기록한다.
  3. 대체 route /f/overseas-safety-register와 artifact shape를 비교한다.
- Expected: 날짜, checklist, resource가 함께 있는 Flow를 current production에서 검증할 수 있어야 한다.
- Actual: 지정 route는 404이고 current E2E도 의도적으로 closed 상태를 요구한다. 대체 route는 200이지만 memo-first 4개 항목이라 같은 shape가 아니다.
- Impact: P4의 source update/export 세션을 동일 객체로 끝까지 검증할 수 없고 handoff package가 current route contract와 어긋난다.
- Evidence: `current_production_interaction`, `current_browser_automation`, `current_source`
- Evidence refs: `current-production-capture.json#mixed-travel`, `current-journey-probes.json#artifact-mixed`, `screenshots/mixed-travel-mobile.png`, `tests/e2e/flow-mvp.spec.ts:5840`
- Data contract: 없음. source safety gate를 우회하거나 closed Flow를 alias하지 않는다.
- Resolution: P32 correctness slice에서 검토 fixture를 유효한 mixed route로 교체하거나, 승인된 mixed Flow가 생길 때까지 이 cell을 blocked로 유지한다.
- Rejected: 안전 검토가 끝나지 않은 MOFA route를 검토 편의를 위해 다시 공개하지 않는다. memo-first 대체 route를 같은 shape라고 주장하지 않는다.
- Rollback: 문서 fixture 변경만 되돌린다. production source gate는 유지한다.
- Acceptance: `P32-MIXED-SHAPE-ROUTE-CONTRACT`, screenshots/p32-01-mixed-shape-route-390.png
- Observed-user question: 없음. 먼저 내부 route/evidence 계약을 고쳐야 한다.

### Medium P31-IR-F05: 모바일 집중 workspace에서도 global과 local navigation이 동시에 경쟁한다

- Route: `/my?view=flows`
- Viewport: 390x844
- Start: 한 Flow를 연 dedicated mobile workspace
- Reproduction:
  1. Flow 목록에서 한 Flow를 연다.
  2. 첫 viewport의 My Flow global tabs와 Flow local tabs를 함께 센다.
  3. 지금/Flow 목록/완료와 실행/전체 계획/기록의 의미를 비교한다.
- Expected: Flow를 연 뒤에는 back, Flow identity, 다음 행동, object commands가 우선이고 global 분류는 한 단계 뒤로 물러나야 한다.
- Actual: global 3 tabs, Flow header와 관리 메뉴, local 3 tabs가 연속해서 나타난다. 5/20/60개 mobile list 첫 viewport에는 21개 focusable command가 보인다.
- Impact: 지금과 실행, 완료와 기록을 같은 수준의 선택지로 오해할 수 있고 한 Flow에 집중하기 어렵다.
- Evidence: `current_production_screenshot`, `current_browser_automation`, `heuristic_simulation`, `reference_pattern`
- Evidence refs: `screenshots/probe-moving-workspace.png`, `screenshots/scale-20-mobile-list.png`, `current-production-capture.json#scaleResults`
- Data contract: 없음. URL view와 selected Flow state를 유지하면서 표시 우선순위만 바꾼다.
- Resolution: Flow drill-in 중 global local-tab strip을 숨기고 back으로 목록의 filter/scroll을 복구한다. object workspace 안에서는 next action과 전체 계획을 한 세로 흐름으로 둔다.
- Rejected: 탭 이름을 더 길게 설명하지 않는다. 4탭 global IA를 다시 열지 않는다.
- Rollback: 기존 global/local tab strip 렌더링으로 복귀한다.
- Acceptance: `P32-MOBILE-OBJECT-FOCUS`, screenshots/p32-02-my-flow-focused-390.png
- Observed-user question: 한 Flow를 연 상태에서 사용자는 global 상태와 Flow 내부 상태를 구분하는가?

### Medium P31-IR-F06: 현재 dependency audit가 high 취약점으로 실패한다

- Route: `build/release gate`
- Viewport: not_applicable
- Start: origin/main a2e1d72dadda0104f97682ae662dfbc113a85318, package-lock 고정
- Reproduction:
  1. npm.cmd ci를 실행한다.
  2. npm.cmd run security:audit를 실행한다.
- Expected: high severity dependency advisory가 없어야 한다.
- Actual: Next 15.5.21 내부 postcss에 1 high, 1 moderate advisory가 남아 audit가 실패한다. 제안된 force fix는 Next 9.3.3으로의 breaking change다.
- Impact: 현재 UX 판정과 별개인 release/security risk다. 자동 force fix는 제품 회귀를 만들 수 있다.
- Evidence: `current_command`
- Evidence refs: `npm.cmd run security:audit`, `package.json#next=15.5.21`
- Data contract: 없음.
- Resolution: 별도 dependency remediation 작업으로 분리하고 Next 호환 패치가 나온 뒤 unit/build/full E2E를 다시 통과시킨다.
- Rejected: 이번 UX 검토에서 npm audit fix --force를 실행하지 않는다.
- Rollback: package-lock 변경을 만들지 않았다.
- Acceptance: `SECURITY-AUDIT-HIGH-0`, not_applicable
- Observed-user question: 없음.


## What Works

- 1/5/20/60 Flow에서 원하는 Flow open depth는 2였다.
- mobile 20/60은 8개 row 뒤 더보기, wide는 searchable rail을 사용했다.
- production capture 25개 surface와 8개 scale state에서 horizontal overflow 0, unnamed focusable 0이었다.
- vehicle undated scheduling/undo, routine occurrence completion/reopen, draft add/delete/undo/reload, Calendar sheet Escape/focus return이 production에서 동작했다.
- targeted P31 E2E 5/5, full E2E는 병렬 실행 306/310 뒤 환경 failure 4개를 serial retry해 4/4 통과했다.

## Remaining Evidence Gaps

- 실제 사용자 관찰 0명
- cross-device/account persistence는 범위 밖
- production error injection을 하지 않아 export retry는 source/test evidence만 사용
- 60 Flow는 fixture_only이며 real user data와 performance telemetry가 아님
- P31 Claude Design 완성 대안은 package에서 확인되지 않음
