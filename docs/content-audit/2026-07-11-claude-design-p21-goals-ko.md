# Claude Design P21 단계별 복붙용 목표

이 문서의 `/goal`은 위에서 아래로 하나씩 실행한다. 한 목표의 완료 기준과 push가 끝나기 전에는 다음 목표를 시작하지 않는다. P21-04 결과에서 사용자 dead end가 확인될 때만 조건부 P21-04B를 사이에 넣는다.

---

## 1. 다음 실행: P21-04 draft lifecycle evidence

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
Claude Design P21 백로그의 P21-04를 해결한다. 새 draft 기능이나 UI 기능을 먼저 추가하지 않고, URL-first miss에서 만들어진 draft가 실제 대기·저장 경로가 된 이후의 저장 실패, 중복 draft, 빈 My Flow/Calendar, 전체 완료 후 남은 개수 0, 오프라인 상태를 모바일 390px과 wide 1024px에서 재현·분류한다. 각 상태가 현재 제품에서 실제로 존재하는지, 사용자가 복구할 수 있는지, 아니면 미구현/해당 없음인지 route-evidence만 보고 판정할 수 있게 한다. P21-01/P21-03과 P18~P20 기준선은 유지한다.

먼저 읽을 파일:
1. AGENTS.md
2. agent.md
3. docs/harness/README.md
4. docs/SERVICE_STRUCTURE.md
5. claude_work/FlowMe UXUI 전체 검토9/FlowMe UX 재검토 P20 마감 (P21 백로그).dc.html
6. docs/content-audit/2026-07-11-claude-design-p21-execution-plan-ko.md
7. docs/content-audit/2026-07-10-claude-design-p21-feedback-intake-ko.md
8. docs/content-audit/2026-07-10-claude-design-p21-01-draft-content-evidence/README.md
9. docs/content-audit/2026-07-10-claude-design-p21-01-draft-content-evidence/route-evidence.json
10. components/flow/AppClient.tsx
11. lib/flow/url-first-supply-queue.ts
12. lib/flow/source-backed-my-flow.ts
13. lib/flow/storage.ts
14. scripts/content-audit/capture-claude-p7-final-review-package.mjs
15. tests/e2e/url-first-user-surface.spec.ts
16. tests/e2e/flow-mvp.spec.ts

핵심 문제:
- P21-01은 정상적인 miss → 3~7개 draft → My Flow 저장 경로를 닫았다.
- 하지만 저장 실패, 같은 URL의 중복 요청, 저장물이 없는 상태, 모든 항목 완료, 오프라인 상태는 screenshot/evidence가 부족하다.
- 없는 상태를 정상처럼 꾸미거나 screenshot fixture만 만들어서는 안 된다.
- 상태가 실제로 미구현이면 미구현으로 기록하고, 사용자 dead end 여부에 따라 별도 최소 복구 목표를 열어야 한다.

구현 원칙:
- 새 기능과 새 IA를 추가하지 않는다.
- 실제 AI API를 추가하지 않는다.
- 저장/실행/export 스키마를 바꾸지 않는다.
- capture를 위해 앱 사용자 화면에 내부 test UI를 추가하지 않는다.
- fixture와 E2E는 기존 localStorage/storage helper를 재사용한다.
- 상태를 재현할 수 없으면 `captured: false`, `reason`, `nextAction`을 기록한다.
- 오류를 성공처럼 표시하거나 live AI처럼 표현하지 않는다.
- P21-01의 3~7개 항목, 기준일 날짜 배치, My Flow/Calendar/export projection을 유지한다.

구현 범위:
1. 상태 inventory
   - draft 저장 실패
   - 동일 canonical URL 중복 요청
   - 빈 My Flow와 빈 Calendar
   - draft 모든 항목 완료 후 남은 개수 0
   - 이미 열린 화면에서 오프라인 전환 후 가능한 로컬 행동

2. 상태별 판단
   - 어떤 trigger/fixture로 재현되는지 기록한다.
   - 사용자가 보는 제목, 상태문, 복구 행동을 분리한다.
   - 복구 행동이 없으면 silent pass하지 않는다.
   - 서버 연결 실패와 브라우저 localStorage 실패를 같은 상태로 묶지 않는다.

3. E2E 보강
   - 같은 canonical URL을 두 번 요청했을 때 중복 저장 정책을 확인한다.
   - localStorage write failure 또는 동등한 실패 fixture에서 입력 보존/복구 여부를 확인한다.
   - 모든 draft 항목 완료 후 오늘/전체/Calendar 상태와 되돌리기 경로를 확인한다.
   - offline 전환 후 이미 저장된 draft의 로컬 열기·체크·수정 가능 범위를 확인한다.
   - 지원하지 않는 상태는 명시적으로 skip하지 말고 audit reason을 남긴다.

4. capture/evidence 보강
   - 출력 경로:
     docs/content-audit/2026-07-11-claude-design-p21-04-draft-state-evidence/
   - README.md, audit.md, review.html, route-evidence.json, screenshots/를 만든다.
   - 상태별 390px/1024px screenshot을 남긴다.
   - marker 예:
     - draftLifecycleScenarioCount
     - draftSaveFailureScenarioCaptured
     - draftSaveFailureRecoveryVisible
     - draftDuplicateScenarioCaptured
     - draftDuplicateCreatesExtraSavedFlow
     - draftEmptyStateCaptured
     - draftCompletedZeroStateCaptured
     - draftCompletedRemainingCount
     - draftOfflineScenarioCaptured
     - draftOfflineLocalActionsAvailable
     - draftLifecycleInternalHitCount

5. 조건부 판단
   - 저장 실패/중복 상태가 사용자 dead end면 앱을 이번 목표에서 임의로 고치지 않는다.
   - audit에 Blocking/High 여부와 P21-04B 최소 복구 목표 초안을 남긴다.
   - fixture/evidence 공백일 뿐이면 이번 목표 안에서 capture만 보강한다.

회귀 방지:
- normal/wide structural display hit 0 유지
- URL-first visible Markdown 0 유지
- candidate user-copy internal hit 0 유지
- urlFirstMissDraftImpliesLiveAi false 유지
- P21 draft suggested item count 3 이상 유지
- My Flow 완료 체크박스 1종 유지
- public /f save/setup-first 유지
- Calendar compact summary/agenda full detail 유지

검증:
- 상태별 390px/1024px screenshot 확인
- tests/e2e/url-first-user-surface.spec.ts
- 관련 tests/e2e/flow-mvp.spec.ts targeted
- tests/e2e/public-share-cta-order.spec.ts
- tests/e2e/workbench-source-density.spec.ts
- npm.cmd run docs:check
- npm.cmd test
- npm.cmd run build
- capture script 재실행
- git diff --check
- 커밋 및 푸시

완료 기준:
- failure/duplicate/empty/completed/offline 5개 상태가 captured/not-captured/reason으로 분리된다.
- 완료 후 남은 개수 0과 완료 목록/되돌리기 상태가 모순되지 않는다.
- 중복 draft 정책과 오프라인 로컬 동작 범위를 evidence로 판정할 수 있다.
- 사용자 dead end가 있으면 P21-04B가 다음 목표로 명시된다.
- dead end가 없으면 다음 목표가 P21-02 AI gate spec으로 확정된다.
- 최종 응답에서 상태 matrix, 사용자 복구 여부, evidence marker, 검증 결과, 커밋/푸시 상태, 다음 목표를 요약한다.
```

---

## 1-B. 조건부 실행: P21-04B 최소 복구

P21-04에서 실제 사용자 dead end가 확인될 때만 아래 목표를 구체화해 실행한다. 발견된 상태명과 실제 원인을 빈칸에 채운다.

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
P21-04 evidence에서 확인된 [저장 실패/중복/오프라인] 사용자 dead end를 최소 수정한다. 입력과 draft 내용을 보존하고, 기존 draft로 돌아가거나 다시 시도할 수 있는 한 가지 명확한 복구 행동을 제공한다. 새 queue, background sync, 상세 진단 시스템은 만들지 않는다.

반드시 근거로 사용할 파일:
- docs/content-audit/2026-07-11-claude-design-p21-04-draft-state-evidence/README.md
- docs/content-audit/2026-07-11-claude-design-p21-04-draft-state-evidence/audit.md
- docs/content-audit/2026-07-11-claude-design-p21-04-draft-state-evidence/route-evidence.json

완료 기준:
- 실패 전 입력과 제안 항목이 보존된다.
- 복구 행동이 실제로 동작한다.
- 중복 저장이나 성공 오인이 발생하지 않는다.
- P21-01/P21-03과 P18~P20 기준선이 유지된다.
- targeted E2E, npm.cmd test, docs:check, build, git diff --check 후 커밋·푸시한다.
```

---

## 2. P21-02 실제 AI 생성 gate spec

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
Claude Design P21 백로그의 P21-02를 spec/gate로 해결한다. 실제 AI API, 모델 SDK, 비밀키, 자동 생성 버튼을 구현하지 않고, P21-01의 결정론적 3~7개 draft 모델을 기반으로 향후 실제 AI가 제목과 실행 항목을 제안할 때 지켜야 할 입력/출력 계약, source/AI/user 경계, 민감 콘텐츠 안전 기준, 실패·비용·개인정보·fallback 정책을 정의한다.

먼저 읽을 파일:
1. AGENTS.md
2. agent.md
3. docs/harness/README.md
4. docs/PRODUCT_PRINCIPLES.md
5. docs/DECISIONS.md
6. docs/IDEAS.md
7. docs/specs/README.md
8. claude_work/FlowMe UXUI 전체 검토9/FlowMe UX 재검토 P20 마감 (P21 백로그).dc.html
9. docs/content-audit/2026-07-11-claude-design-p21-execution-plan-ko.md
10. docs/content-audit/2026-07-10-claude-design-p21-01-draft-content-evidence/README.md
11. docs/content-audit/2026-07-11-claude-design-p21-04-draft-state-evidence/README.md
12. docs/content-audit/2026-07-09-claude-design-p18-05-url-first-edit-model-spec-ko.md
13. docs/content-audit/2026-07-10-claude-design-p19-08-ai-draft-gate-audit-ko.md
14. lib/flow/url-first-supply-queue.ts
15. lib/flow/source-backed-my-flow.ts
16. lib/flow/storage.ts
17. lib/flow/export.ts

구현 원칙:
- 앱 UI와 runtime 코드는 수정하지 않는다.
- 실제 AI 생성이 있는 것처럼 문구를 바꾸지 않는다.
- provider에 종속된 모델명/API를 제품 계약으로 고정하지 않는다.
- AI 결과는 `제안 초안`이며 사용자 확인 전 저장·발행·완료되지 않는다.
- P21-01 결정론적 fallback을 삭제하지 않는다.
- source-backed 원본, AI 제안, 사용자 overlay를 분리한다.
- 건강/법률/재무/안전 콘텐츠는 자동 확정·자동 발행을 금지한다.

spec에 포함할 내용:
1. 사용자 문제와 P21-01의 한계
2. AI slice를 열기 위한 선행 조건
3. provider-neutral 입력 계약
4. 3~7개 draft item 출력 계약
5. 제목/상대 날짜/메모/포함 여부/source context 구조
6. source-backed 원본 → AI 제안 → 사용자 overlay 우선순위
7. 사용자 검토/수정/저장 gate
8. Calendar/My Flow/export projection 규칙
9. timeout, 빈 응답, 부분 응답, 중복, 취소, retry 정책
10. 비용 제한과 입력 길이 제한
11. URL/메모 개인정보와 로그 보존 정책
12. 민감 카테고리 중단/검토 기준
13. 결정론적 fallback 조건
14. telemetry/event 후보와 성공 판단 기준
15. 실제 AI implementation slice의 go/no-go checklist
16. 하지 말아야 할 것
17. 다음 구현 `/goal` 후보

출력:
- docs/specs/2026-07-11-url-first-ai-draft-gate/README.md
- 필요하면 docs/content-audit/2026-07-11-claude-design-p21-02-ai-gate-audit-ko.md

검증:
- 앱 UI/runtime diff 0 확인
- API key/env/package dependency 변경 0 확인
- P21-01 fallback 유지 확인
- docs/specs/README.md 연결 필요 여부 확인
- npm.cmd run docs:check
- git diff --check
- 커밋 및 푸시

완료 기준:
- 실제 AI 도입 전에 필요한 계약과 위험 경계가 구현 가능한 수준으로 명확하다.
- AI 결과가 자동 실행·자동 발행되지 않는다.
- source/AI/user 수정 경계가 명확하다.
- 실패 시 P21-01 결정론적 fallback으로 돌아가는 규칙이 있다.
- 이번 단계에서 실제 AI 기능은 추가되지 않는다.
```

---

## 3. P21-05 홈/Calendar 소규모 polish

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
Claude Design P21 백로그의 P21-05를 해결한다. 홈 URL/memo entry의 구분자가 붙어 읽히는 문제와 Calendar 월간 grid의 주요 2개 Flow label이 서로 구분되기 어려운 문제를 inventory한 뒤 최소 수정한다. 새 기능, 새 short-label 스키마, slug별 하드코딩은 만들지 않고, P20의 `주요 2개 + 외 N개` compact summary와 selected-day agenda full detail 기준을 유지한다.

먼저 읽을 파일:
1. AGENTS.md
2. agent.md
3. docs/harness/README.md
4. claude_work/FlowMe UXUI 전체 검토9/FlowMe UX 재검토 P20 마감 (P21 백로그).dc.html
5. docs/content-audit/2026-07-11-claude-design-p21-execution-plan-ko.md
6. docs/content-audit/2026-07-10-claude-design-p21-01-draft-content-evidence/README.md
7. docs/content-audit/2026-07-10-claude-design-p20-05-calendar-grid-compact-evidence/README.md
8. components/flow/AppClient.tsx
9. lib/flow/source-backed-my-flow.ts
10. scripts/content-audit/capture-claude-p7-final-review-package.mjs
11. tests/e2e/flow-mvp.spec.ts

구현 범위:
1. 390/1024px 홈 entry inventory
   - P21-01에서 separator가 이미 닫혔으면 UI를 다시 수정하지 않는다.
   - marker/evidence로 no-op closure를 기록한다.
2. 390/1024px Calendar 같은 날짜 2개/3개 이상 Flow inventory
3. grid의 각 compact label이 색/마커/짧은 제목으로 구분되게 최소 조정
4. 전체 Flow 제목은 agenda, title/aria-label에서 유지
5. 기존 `2개 label + 외 N개` 정책과 horizontal overflow 0 유지

금지:
- 새 Calendar 기능
- 새 필터/탭/범례 panel
- 특정 slug의 표시 이름 하드코딩
- schema 변경
- Calendar grid에 모든 Flow 제목 펼치기

evidence marker 예:
- homeUrlEntrySeparatorPresent
- homeUrlEntryConcatenatedLabelCount
- calendarGridVisibleFlowLabelCount
- calendarGridDistinctVisibleLabelCount
- calendarGridOverflowSummaryVisible
- calendarGridAccessibleFullLabelCount
- calendarSelectedDayAgendaShowsAllFlows
- calendarGridHorizontalOverflowCount

검증:
- 390/1024px `/`
- 390/1024px `/calendar` 같은 날짜 2개/3~5개 Flow
- selected-day agenda full detail 확인
- 완료 체크박스 1종과 진행 숫자 맥락화 회귀 확인
- tests/e2e/flow-mvp.spec.ts targeted
- tests/e2e/url-first-user-surface.spec.ts
- tests/e2e/public-share-cta-order.spec.ts
- tests/e2e/workbench-source-density.spec.ts
- npm.cmd run docs:check
- npm.cmd test
- npm.cmd run build
- capture script 재실행
- git diff --check
- 커밋 및 푸시

완료 기준:
- 홈 entry 문구가 붙어 읽히지 않는다.
- Calendar 같은 날짜의 주요 2개 label이 서로 식별 가능하다.
- 3개 이상은 계속 `외 N개`로 요약된다.
- agenda에서는 모든 Flow와 할 일이 보인다.
- overflow 0과 P18~P21 기준선이 유지된다.
```

---

## 4. P21 사용자 눈검토용 Vercel preview

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
P21-01/P21-03/P21-04/P21-02/P21-05 완료 기준선을 현재 main에서 검증하고 Vercel preview를 배포한다. 새 기능이나 copy 수정은 하지 않고, 사용자가 제품 흐름을 직접 눈으로 확인할 URL과 짧은 시나리오 체크리스트를 제공한다. 발견된 문제는 즉시 섞어 고치지 말고 별도 correction 목표로 분리한다.

검증할 사용자 시나리오:
1. `/` → URL/메모 entry → `/flows`
2. miss → 3~7개 제안 확인 → 기준일 지정 → My Flow 저장
3. `/my`에서 제목/날짜/메모/포함 여부 수정
4. `/calendar`에서 같은 날짜 2개와 3개 이상 Flow 확인
5. duplicate/empty/completed/offline 상태 확인
6. `/u/my-flow-studio` 초안 선반 확인
7. public `/f/vehicle-inspection-prep` 저장 전 preview와 저장 후 completion 확인

검증:
- npm.cmd run docs:check
- npm.cmd test
- npm.cmd run build
- targeted Playwright
- git diff --check
- Vercel 배포 성공 확인

완료 기준:
- 사용자가 열 수 있는 Vercel URL이 제공된다.
- 각 시나리오의 확인 순서와 기대 결과가 1~2문장으로 제공된다.
- 사용자 피드백 전 P21 final package를 만들지 않는다.
- 새 문제는 수정하지 않고 correction 목표 후보로 기록한다.
```

---

## 5. P21 final review package

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
Claude Design P21 백로그의 개선 루프를 마감 감사한다. 새 기능을 추가하지 않고 P21-01 결정론적 3~7개 draft, P21-03 구조형 문구 hit 0, P21-04 lifecycle 상태 evidence, P21-02 실제 AI gate spec, P21-05 홈/Calendar polish와 사용자 Vercel 눈검토 결과가 유지되는지 확인한다. Claude Design이 GitHub 소스·문서·시나리오별 screenshot만 보고 P22 backlog를 Blocking/High/Medium/Low로 산출할 수 있는 최신 P21 final review package를 만든다.

먼저 읽을 파일:
1. AGENTS.md
2. agent.md
3. docs/harness/README.md
4. claude_work/FlowMe UXUI 전체 검토9/FlowMe UX 재검토 P20 마감 (P21 백로그).dc.html
5. docs/content-audit/2026-07-11-claude-design-p21-execution-plan-ko.md
6. docs/content-audit/2026-07-10-claude-design-p21-01-draft-content-evidence/README.md
7. docs/content-audit/2026-07-11-claude-design-p21-04-draft-state-evidence/README.md
8. docs/specs/2026-07-11-url-first-ai-draft-gate/README.md
9. docs/content-audit/2026-07-11-claude-design-p21-05-entry-calendar-polish-evidence/README.md
10. scripts/content-audit/capture-claude-p7-final-review-package.mjs
11. tests/e2e/url-first-user-surface.spec.ts
12. tests/e2e/public-share-cta-order.spec.ts
13. tests/e2e/workbench-source-density.spec.ts
14. tests/e2e/flow-mvp.spec.ts

출력 경로:
docs/content-audit/2026-07-11-claude-design-p21-final-review-package/
- README.md
- audit.md
- review.html
- route-evidence.json
- prompt-ko.md
- screenshots/

필수 scenario:
1. 처음 온 사용자: `/` → `/flows`
2. URL hit/custom-start 사용자
3. URL miss → 3~7개 draft 사용자
4. draft 저장 후 My Flow 수정 사용자
5. failure/duplicate/empty/completed/offline draft lifecycle
6. Calendar 같은 날짜 2개/3개 이상 Flow 사용자
7. public `/f` 저장 전 preview → 저장 후 completion 사용자
8. Studio 초안 선반 사용자
9. `/restart` release-preview와 `/flow-lab` internal-console

검증:
- 390px/1024px screenshot scenario matrix
- normal/internal/structural/Markdown/raw ISO guardrail 0
- draft suggested item count 3 이상
- dates from anchor true
- live AI implied false
- lifecycle state marker 판정 가능
- Calendar compact summary/agenda full detail 유지
- public pre-save/post-save boundary 유지
- npm.cmd run docs:check
- npm.cmd test
- npm.cmd run build
- targeted Playwright
- git diff --check
- 커밋 및 푸시

완료 기준:
- P21-01~P21-05가 완료/조건부 보류로 명확히 기록된다.
- 최신 screenshot/evidence package와 P22 복붙용 prompt가 준비된다.
- 실제 AI가 아직 없다는 사실과 AI gate 조건이 정확히 전달된다.
- Claude Design이 단순 UI polish가 아니라 제품/UX/AI 도입 순서를 포함한 P22 backlog를 작성하도록 prompt가 구체적이다.
```
