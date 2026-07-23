# FlowMe UX 재검토 P25 production 마감 (P26 전체 실행 백로그)

## 1. Executive verdict

**최종 판정: `structural_correction_required`**

P25 production은 저장, 완료/재개, 개인 draft 구조 편집, 날짜 배치/제거, 범위 export, wide Calendar 등 상당한 실행 기능을 실제로 갖췄다. clean `origin/main`에서도 docs, unit, build와 P25 targeted E2E가 통과했다.

그러나 핵심 계약 네 가지가 아직 한 제품처럼 이어지지 않는다.

1. preview용 예시 날짜가 사용자 확인 없이 실제 일정으로 저장된다.
2. 반복 Flow는 public ICS, My Flow export, Calendar에서 서로 다른 개수와 의미를 가진다.
3. 메모의 명확한 다중 행동이 한 item으로 합쳐질 수 있다.
4. 저장 receipt와 기준일 재사용 가능 여부가 route마다 다르다.

이 문제는 색상, spacing, copy polish만으로 해결할 수 없다. P26은 data/interaction contract를 먼저 고치고 그 위에 public, My Flow, Calendar, editor, export의 공통 정보 구조를 다시 세워야 한다.

이번 결과는 **independent automated simulation + heuristic review**다. 실제 관찰 사용자 수는 `0명`이며 실제 사용자 검증으로 표현하지 않는다.

## 2. 검토 기준과 실행 결과

- Production: `https://flowme2605.vercel.app`
- Clean worktree: `origin/main` `192a60a19909c3c9990ddb0955c7b339ac4b7ae7`
- Viewports: `390x844`, `1024x768`
- Journeys: A~F, viewport별 격리된 localStorage
- Current package: P25 final closeout와 source를 비교 근거로 사용
- 앱 코드 변경: 없음

### Verification

| 명령 | 결과 |
|---|---|
| `npm.cmd run docs:check` | 통과, required 14 files / local links 2559 |
| `npm test` | 통과, 526/526 |
| `npm.cmd run build` | 통과, Next 15.5.20 / 18 pages |
| `npx.cmd playwright test tests/e2e/p25-whole-flow-workspace.spec.ts --workers=1` | 통과, 3/3 |
| `npm.cmd run test:e2e -- --workers=1` | 285/286, 1건 실패 |
| 실패 1건 단독 재실행 | 통과, 1/1 |

Full E2E 실패는 `public-share-cta-order.spec.ts`의 washer save-before marker assertion이었다. 단독 재실행은 통과했으므로 product failure로 확정하지 않았고, **full suite가 clean pass였다고도 기록하지 않는다**. P26-19에서 known flake와 실제 계약 실패를 구조적으로 분리해야 한다.

성공한 production journey에서 console/page error와 horizontal overflow는 발견되지 않았다. full-page screenshot에 fixed header/bottom nav가 중간에 한 번 더 합성된 경우는 Playwright capture artifact로 분류했으며 product overlap finding에 포함하지 않았다.

## 3. Findings

### Blocking

#### B-01. 예시 날짜가 실제 실행 날짜로 조용히 저장된다

- **Route:** `/f/vehicle-inspection-prep` 및 anchor가 있는 public Flow
- **Viewport:** 390x844, 1024x768
- **재현:** 새 상태에서 날짜를 비워 둠 -> `그대로 저장` -> receipt/My Flow/Calendar 확인
- **기대:** 예시는 미리보기일 뿐이며, 날짜를 고르지 않았으면 undated로 저장되거나 저장 전에 의도를 묻는다.
- **실제:** UI는 `예시 날짜로 미리보기 · 검사일 7월 20일`이라고 말하지만 saved record에는 `anchor: 2026-07-20`이 들어가고 10개 dated item이 생성된다.
- **사용자 영향:** 사용자가 선택하지 않은 날짜가 Today, Calendar, ICS의 실제 일정으로 승격된다. 일정 신뢰를 훼손하는 correctness 문제다.
- **EvidenceKind:** `current_production_interaction`, `current_package_screenshot`, `current_source`, `heuristic_simulation`
- **근거:** [빈 날짜 public](screenshots/B-undated-vehicle-mobile-01-public-undated.png), [저장된 10개 dated Flow](screenshots/B-undated-vehicle-mobile-03-post-save.png), [AppClient preview/save source](https://github.com/knhbae/flowme2605/blob/192a60a19909c3c9990ddb0955c7b339ac4b7ae7/components/flow/AppClient.tsx#L15574-L15775)
- **해결:** P26-01에서 `날짜 정하기 / 날짜 없이 저장 / 예시만 보기`를 명시하고 example을 persisted state에서 금지한다.

### High

#### H-01. 반복 Flow의 public/My Flow/Calendar/ICS 계약이 서로 다르다

- **Route:** `/f/washer-tub-clean-monthly`, `/my`, `/calendar`
- **Viewport:** 390x844, 1024x768
- **재현:** 2026-08-01 시작 -> public ICS -> 저장 -> My Flow export -> Calendar
- **기대:** 같은 saved routine은 같은 series identity와 RRULE을 유지하고 Calendar에는 occurrence만 보인다.
- **실제:** public ICS는 `1 VEVENT + RRULE:FREQ=MONTHLY;BYMONTHDAY=1`; My Flow export는 Calendar `0개`; Calendar에는 날짜 없는 definition 3개와 8월 1일 occurrence 1개가 동시에 보인다.
- **사용자 영향:** 루틴이 1개인지 3개인지, ICS가 가능한지 예측할 수 없고 외부 Calendar로 가져갈 때 결과가 surface마다 달라진다.
- **EvidenceKind:** `current_production_interaction`, `current_package_screenshot`, `current_source`
- **근거:** [public export](screenshots/target-routine-export-mobile-01-public-export.png), [My Flow Calendar 0](screenshots/target-routine-export-mobile-02-my-flow-export.png), [definition+occurrence](screenshots/target-routine-export-wide-03-calendar-series-occurrence.png), [My Flow export eligibility source](https://github.com/knhbae/flowme2605/blob/192a60a19909c3c9990ddb0955c7b339ac4b7ae7/components/flow/AppClient.tsx#L8182-L8245)
- **해결:** P26-03에서 series definition, occurrence, completion, export를 단일 projection으로 통일한다.

#### H-02. 메모의 5개 행동이 한 item으로 합쳐진다

- **Route:** `/flows` -> personal draft -> `/my`
- **Viewport:** 390x844, 1024x768
- **재현:** 제주 여행 예문 입력 -> draft 결과 확인
- **기대:** 항공권, 숙소, 렌터카, 준비물, 체크인이 각각 검토 가능한 action 후보가 된다.
- **실제:** draft 2개만 생기며 두 번째 item에 다섯 clause가 한 문장으로 결합된다.
- **사용자 영향:** memo-to-Flow의 핵심 가치인 실행 단위 분해가 무너지고 사용자가 다시 수동으로 나눠야 한다.
- **EvidenceKind:** `current_production_interaction`, `current_package_screenshot`, `current_source`
- **근거:** [draft split 화면](screenshots/D-personal-memo-mobile-02-draft-split.png), [parser source](https://github.com/knhbae/flowme2605/blob/192a60a19909c3c9990ddb0955c7b339ac4b7ae7/lib/flow/url-first-supply-queue.ts#L112-L131)
- **해결:** P26-04에서 생성 없이 clause 경계를 제안하고 원문-결과 mapping, split/merge review를 제공한다.

#### H-03. moving public 저장은 canonical receipt를 우회하고 기준일 재사용도 없다

- **Route:** `/f/moving-d30-basic`, `/my`
- **Viewport:** 390x844, 1024x768
- **재현:** 이사일 입력 -> 페이지 내 `내 Flow에 저장` -> `내 Flow에서 보기`
- **기대:** 다른 public Flow처럼 `/my?savedFlow=...` receipt에서 24개 전체를 확인하고 이후 이사일을 다시 바꿀 수 있다.
- **실제:** moving 전용 CTA의 link가 `/my`라 receipt 없이 `지금`에 도착한다. item 날짜 override는 가능하지만 saved Flow 전체 anchor 수정 entry는 없다.
- **사용자 영향:** 저장 성공 확신, 전체 Flow 확인, 반복 사용이 route마다 다르며 이사 계획을 새 날짜로 다시 쓰기 어렵다.
- **EvidenceKind:** `current_production_interaction`, `current_package_screenshot`, `current_source`
- **근거:** [저장 후 지금](screenshots/A-moving-mobile-04-my-landing.png), [moving CTA source](https://github.com/knhbae/flowme2605/blob/192a60a19909c3c9990ddb0955c7b339ac4b7ae7/components/flow/AppClient.tsx#L16355-L16378), [settings eligibility source](https://github.com/knhbae/flowme2605/blob/192a60a19909c3c9990ddb0955c7b339ac4b7ae7/components/flow/AppClient.tsx#L3648-L3664)
- **해결:** P26-02 canonical receipt, P26-13 new-anchor run을 순차 적용한다.

#### H-04. 전체 Flow가 계획 outline보다 긴 full-control row 목록에 가깝다

- **Route:** `/my` -> Flow 목록 -> `moving-d30-basic`
- **Viewport:** 특히 390x844, 1024x768도 영향
- **재현:** 저장한 24개 moving Flow 전체 열기
- **기대:** D-30, D-10, D-3, D-1, D-Day, D+1 phase와 기간, 진행을 먼저 파악하고 item detail은 필요할 때 연다.
- **실제:** 24개 row마다 checkbox, 열기, 메모가 반복되고 mobile document가 매우 길다. phase는 하단 `주요 단계만 보기`로 밀려 있다.
- **사용자 영향:** 계획의 구조를 읽기보다 개별 control을 스크롤하게 된다.
- **EvidenceKind:** `current_package_screenshot`, `heuristic_simulation`
- **근거:** [mobile 24 rows](screenshots/A-moving-mobile-05-whole-flow.png), [wide whole Flow](screenshots/A-moving-wide-05-whole-flow.png)
- **해결:** P26-09 phase-grouped outline과 compact execution row를 기본으로 한다.

#### H-05. 모바일 item editor가 Flow 문서 안에서 과도하게 확장된다

- **Route:** `/my` personal draft item detail
- **Viewport:** 390x844; wide는 비교 기준
- **재현:** item 열기 -> 수정 -> 날짜 지정 -> `세부 일정·시간·반복` 펼치기
- **기대:** 간단한 title/date/memo 수정은 짧은 contained surface, advanced fields는 별도 단계다.
- **실제:** Flow rows, reorder, add, export와 같은 카드 안에 title/date/memo/time/duration/repeat가 연속으로 펼쳐진다. wide의 우측 detail pane은 상대적으로 안정적이다.
- **사용자 영향:** 한 item을 고치는 동안 현재 Flow 위치와 save/cancel 경계가 흐려진다.
- **EvidenceKind:** `current_package_screenshot`, `heuristic_simulation`
- **근거:** [mobile basic](screenshots/target-personal-advanced-mobile-01-basic-editor.png), [mobile advanced](screenshots/target-personal-advanced-mobile-02-advanced-editor.png), [wide detail pane](screenshots/target-personal-advanced-wide-02-advanced-editor.png)
- **해결:** P26-10 quick edit/advanced split, mobile sheet, wide detail pane을 공통 editor contract로 만든다.

### Medium

#### M-01. 날짜 미정은 지원되지만 primary path에서 숨겨져 있다

- **Route:** `/f/vehicle-inspection-prep`
- **Viewport:** 390x844, 1024x768
- **재현:** date setup 확인 -> `다른 방법` 펼침
- **기대:** 날짜를 모르는 사용자는 첫 선택에서 undated를 고를 수 있다.
- **실제:** `아직 날짜가 안 정해졌어요`가 collapsed details 안에 있다.
- **사용자 영향:** 예시 날짜를 실제 날짜로 오인하거나 기능 존재를 발견하지 못한다.
- **EvidenceKind:** `current_production_interaction`, `current_package_screenshot`, `reference_pattern`
- **근거:** [hidden option](screenshots/target-explicit-undated-mobile-01-other-methods.png), [explicit undated](screenshots/target-explicit-undated-mobile-02-undated-mode.png)
- **해결:** P26-01/P26-14에서 explicit schedule intent와 inbox 의미를 함께 노출한다.

#### M-02. Export 범위는 좋아졌지만 current item이 별도 surface에 남아 있다

- **Route:** `/my` whole Flow export, item detail export
- **Viewport:** 390x844, 1024x768
- **재현:** whole Flow `가져가기` -> Flow 전체/직접 선택 -> item detail의 도구 확인
- **기대:** `Flow 전체 / 선택 항목 / 현재 항목`이 같은 scope vocabulary와 결과 preview를 사용한다.
- **실제:** whole/selected panel은 count를 잘 보여주지만 current item export는 detail 안의 다른 도구 영역이다.
- **사용자 영향:** scope 개념과 결과 위치를 두 번 학습한다.
- **EvidenceKind:** `current_production_interaction`, `current_source`
- **근거:** [personal export](screenshots/target-personal-advanced-mobile-04-export.png), [FlowExportPanel source](https://github.com/knhbae/flowme2605/blob/192a60a19909c3c9990ddb0955c7b339ac4b7ae7/components/flow/FlowExportPanel.tsx#L44-L214)
- **해결:** P26-16 공통 scope/result sheet로 통합한다.

#### M-03. My Flow와 Calendar 역할은 기능적으로 다르지만 label만으로 충분히 설명되지 않는다

- **Route:** `/my`, `/calendar`
- **Viewport:** 390x844, 1024x768
- **재현:** 3개 Flow 저장 -> My Flow `지금/내 Flow/완료` -> Calendar
- **기대:** My Flow는 실행 queue와 plan inventory, Calendar는 날짜 배치/비교라는 역할이 첫 화면에서 드러난다.
- **실제:** 기능은 분리돼 있으나 page title `내 Flow`와 tab `내 Flow`가 중복된다. Calendar는 별도 global nav여서 mental model이 copy에 의존한다.
- **사용자 영향:** 현재 item을 볼지 Flow 전체를 볼지, Calendar를 써야 할지 탐색 비용이 남는다.
- **EvidenceKind:** `current_package_screenshot`, `heuristic_simulation`
- **근거:** [mobile multi Flow](screenshots/E-returning-multi-flow-mobile-02-my-flow-multiple.png), [wide multi Flow](screenshots/E-returning-multi-flow-wide-02-my-flow-multiple.png)
- **해결:** P26-08에서 `지금 / Flow 목록 / 완료` 역할을 고정한다.

#### M-04. 같은 날짜 다중 Flow는 구분되지만 month cell에서는 제목 비교가 어렵다

- **Route:** `/calendar`
- **Viewport:** 1024x768 중심
- **재현:** moving/washer/vehicle 저장 -> 같은 날짜 Calendar
- **기대:** 어떤 Flow의 어떤 item인지 color 없이도 빠르게 구분한다.
- **실제:** initials와 color가 있으나 month cell title이 짧게 잘리고 full context는 selected-day agenda에서만 확인된다.
- **사용자 영향:** 월간 밀도 비교와 특정 Flow 탐색이 느리다.
- **EvidenceKind:** `current_package_screenshot`, `heuristic_simulation`
- **근거:** [wide multi-flow Calendar](screenshots/E-returning-multi-flow-wide-05-calendar-multiple.png)
- **해결:** P26-15에서 grid는 count/chip, agenda는 Flow group으로 역할을 나눈다.

#### M-05. Safety 설명이 artifact보다 먼저 큰 위계를 차지한다

- **Route:** `/f/new-car-delivery-check`
- **Viewport:** 390x844, 1024x768
- **재현:** Flow 설명을 열지 않고 첫 화면과 12개 list 확인
- **기대:** 12개 저장 artifact가 먼저 보이고 보류 기준은 관련 item 또는 concise safety summary로 연결된다.
- **실제:** `인수 보류 기준`의 여러 bullet과 memo field가 checklist보다 먼저 큰 영역을 사용한다.
- **사용자 영향:** 실행 결과보다 경고 설명을 먼저 읽게 된다. 다만 민감한 의사결정 문구 자체는 제거하면 안 된다.
- **EvidenceKind:** `current_package_screenshot`, `heuristic_simulation`
- **근거:** [mobile public](screenshots/F-public-first-visit-mobile-01-public-skim.png), [wide public](screenshots/F-public-first-visit-wide-01-public-skim.png)
- **해결:** P26-06/P26-17에서 safety를 keep하되 concise summary + relevant detail로 재배치한다.

#### M-06. 완료 취소는 존재하지만 item 이동과 action 위치 변화가 크다

- **Route:** `/my` 지금/Flow 목록/완료, `/calendar`
- **Viewport:** 390x844, 1024x768
- **재현:** item 완료 -> 완료 tab -> reopen
- **기대:** 완료 직후 즉시 undo하고 나중에도 같은 control 의미로 reopen한다.
- **실제:** production에서 complete/reopen은 가능하지만 main simulation의 moving locator는 item 이동 중 timeout했다. isolated targeted E2E는 통과했다.
- **사용자 영향:** 명확한 production bug로 확정할 수는 없지만, optimistic movement와 focus 안정성이 약한 가설이 남는다.
- **EvidenceKind:** `current_production_interaction`, `heuristic_simulation`
- **해결:** P26-12에서 stable undo bar, focus preservation, 동일 action naming을 고정한다.

### Low

#### L-01. 같은 저장 행동의 label과 component가 route별로 다르다

- **Route:** `/f/moving-d30-basic`, 일반 `/f/*`, `/flow-maps/*`
- **Viewport:** 공통
- **재현:** 동일한 저장 의도로 moving public, 일반 public, source-backed Flow Map의 첫 action과 저장 destination 비교
- **기대:** 저장 전 조정 여부와 저장 후 destination이 하나의 action taxonomy로 예측된다.
- **실제:** `내 Flow에 저장`, `그대로 저장`, `조정`, `내 버전으로 조정`이 서로 다른 component와 destination을 가진다.
- **사용자 영향:** 작은 학습 비용이 누적되며 route inconsistency를 숨긴다.
- **EvidenceKind:** `current_source`, `heuristic_simulation`
- **해결:** P26-17에서 action taxonomy와 shared components를 고정한다.

#### L-02. Wide My Flow는 mobile stretch는 아니지만 overview 카드 스택이 길다

- **Route:** `/my`
- **Viewport:** 1024x768
- **재현:** 여러 Flow 저장 -> `/my` 재방문 -> Flow를 고르기 전 all state 스캔
- **기대:** rail에서 Flow를 비교하고 선택 즉시 plan/detail workspace가 안정적으로 유지된다.
- **실제:** left rail이 있고 detail pane도 지원하지만 all state에서는 큰 summary, priority, inventory, Flow cards가 세로로 이어진다.
- **사용자 영향:** desktop에서 비교보다 scrolling이 우세하다.
- **EvidenceKind:** `current_package_screenshot`, `heuristic_simulation`
- **해결:** P26-08/P26-18에서 all overview와 selected workspace를 명확히 분리한다.

## 4. Journey scorecard 요약

| Journey | Overall | Supported | Hidden/Partial/Missing/Blocked |
|---|---|---|---|
| A 이사 준비 | partial | 24개 preview, item date override, completion, whole/selected export | receipt hidden, anchor reuse missing |
| B 날짜 없는 차량 점검 | partial | explicit undated, tray schedule/remove, checklist/ICS count | primary undated hidden, blank save blocked |
| C 반복 루틴 | partial | public RRULE, occurrence complete/reopen | My Flow ICS blocked, series/occurrence partial |
| D 개인 메모 | partial | intake, edit, add/delete/restore/reorder, outputs | segmentation partial, advanced edit hidden |
| E 다중 Flow | partial | inventory, tabs, selected export, 3-pane Calendar | IA and same-day comparison partial |
| F public 첫 방문 | partial | 12-item artifact, save result match, receipt | safety hierarchy and export prediction partial |

전체 구조화 결과는 [journey-scorecard.json](journey-scorecard.json)을 참조한다.

## 5. 화면별 Keep / Change / Remove / Defer

| 화면 | Keep | Change | Remove | Defer |
|---|---|---|---|---|
| Public save-before | 실제 item preview, source label, item count | explicit date intent, one CTA hierarchy | duplicate route CTA, preview-to-save ambiguity | creator/social metrics |
| 저장 직후 | whole Flow count와 outline | decision hub, dated/undated/repeat summary | receipt bypass route | notification prompt |
| 전체 Flow | completion, progress, source link | phase outline, compact rows, detail pane | row마다 반복되는 memo text button | kanban/Gantt |
| My Flow | 지금/완료 concept, multi-flow rail | Flow 목록 label, selected workspace | page/tab `내 Flow` 중복 | team workspace |
| Calendar | wide 3-pane, undated schedule/remove | inbox semantics, Flow grouping | series definitions in undated tray | week time-grid, external sync |
| Item editor | personal title/date/memo, structural schedule | quick/advanced split, mobile sheet | inline full form in Flow document | natural-language scheduler |
| Batch edit | selection, date, export, remove, undo | explicit edit mode and stable toolbar | normal execution mode의 reorder/delete | bulk AI rewrite |
| Completion/reopen | reversible state, occurrence identity | stable immediate undo and focus | ambiguous generic complete label for occurrence | streak/gamification |
| Export | scope-first counts, 4 formats | unified whole/selected/item, result receipt | route-specific export adapters | direct API integration |

## 6. 설명문 처리

### 유지

- 원본 출처 이름과 URL.
- 의료, 세무, 차량 인수 등에서 실제 판단 경계를 바꾸는 safety statement.
- 저장될 item 수, date range, recurrence, omitted count.
- 개인 수정이 원본을 바꾸지 않는다는 한 줄.

### 축약

- `먼저 중요한 날짜만 확인하고, 저장 후 내 Flow에서...` 같은 과정 설명은 result/action 근처 한 문장으로 축약.
- export 설명은 각 format 아래 예상 row/event count로 대체.
- My Flow 역할 설명은 tab heading과 empty state로 구조화.

### 접힘 또는 관련 item으로 이동

- 긴 Flow description.
- sourceTrace와 제작자 상세.
- new-car의 상세 보류 기준과 보류 memo.
- recurring rule의 기술적 설명.
- 완료 후 회고와 원본 correction request.

### 제거

- 같은 저장 성공을 두 번 말하는 banner/CTA.
- control이 이미 보여주는 동작을 다시 설명하는 문장.
- route마다 다른 용어로 반복되는 `가져가기/export/형식 보기` 안내.

## 7. 공식 레퍼런스 비교

외형 복제가 아니라 저장/import -> 개인화 -> 실행 -> 일정 -> 완료 -> 재사용 연결만 비교했다.

| 제품 | 공식 패턴 | FlowMe 판단 | 적용 방식 |
|---|---|---|---|
| [Google Calendar](https://support.google.com/calendar/answer/9901136?hl=en-GB) | 날짜 있는 task만 Calendar에 표시, pending task와 반복 task 별도 관리 | 적용 | Calendar eligibility와 occurrence 표시 규칙을 명시 |
| [Apple Reminders](https://support.apple.com/guide/reminders/view-reminder-lists-remnd854fc47/mac) | Today/Scheduled/All/Completed smart lists | 변형 필요 | My Flow의 지금/Flow 목록/완료 역할을 분리하되 source phase 유지 |
| [Fantastical](https://flexibits.com/fantastical/help/calendar-views) | day/week/month/task view와 keyboard 중심 mini/full window | 변형 필요 | wide Calendar와 compact action surface 참고, 전문 calendar UI 복제 금지 |
| [Things](https://culturedcode.com/things/support/articles/4001304/) | Today/Upcoming/Anytime/Someday/Inbox, 반복 template과 실행 copy 구분 | 적용 | undated inbox, template/run/occurrence separation |
| [Todoist](https://www.todoist.com/help/articles/complete-a-task-with-a-recurring-date-dmI6SVqdP) | 반복 task 완료 후 next occurrence, 짧은 Undo | 적용 | occurrence complete/reopen과 immediate undo |
| [TickTick](https://help.ticktick.com/articles/7055782206349770752) | only this recurrence와 전체 repeat rule 수정 구분 | 적용 | `이번 회차 / 이후 회차 / 반복 전체` scope wording |
| [Microsoft To Do](https://support.microsoft.com/en-US/ToDo/my-day-and-suggestions) | My Day item이 원래 list identity를 유지 | 적용 | 지금 view는 projection이며 source Flow를 옮기지 않음 |
| [Structured](https://help.structured.app/en/articles/338178) | 날짜 없는 Inbox에서 Timeline으로 drag/schedule, 다시 Inbox로 이동 | 적용 | undated tray를 explicit inbox로 정의하고 date removal을 reversible하게 처리 |
| [Sunsama](https://help.sunsama.com/docs/usage-guides/backlog/) | backlog에서 day로 옮기고 timebox할 때 Calendar event 생성 | 변형 필요 | batch scheduling preview만 참고; heavy daily planning ritual은 적용 금지 |
| [Notion Calendar](https://www.notion.com/help/use-notion-calendar-with-notion) | date property가 있는 database item만 Calendar에 표시 | 적용 | export/calendar eligibility를 data property와 일치시킴 |
| [Nike Training Club](https://www.nike.com/help/a/ntc-info) | multi-week program의 phase와 각 workout 실행을 분리하고, workout 안에서는 목적·세트·반복을 명확히 표시 | 변형 필요 | Flow 정의와 occurrence 실행을 분리하되 운동 coaching·미디어 중심 구조는 적용 금지 |
| [TripIt](https://help.tripit.com/en/support/solutions/articles/103000063275-adding-travel-plans-to-tripit) | import 후 itinerary 생성 알림, manual add, review before use | 적용 | 저장 receipt와 전체 artifact 확인, unresolved는 candidate/unfiled로 유지 |

### 적용 금지

- FlowMe를 full replacement planner로 만드는 다층 project management IA.
- account/cloud sync를 core journey의 전제조건으로 두기.
- mobile에 desktop calendar의 모든 view/control을 축소 배치하기.
- AI 결과를 review 없이 source-backed Flow로 publish하기.

## 8. Contract 영향

| 계약 | 현재 위험 | P26 결정 |
|---|---|---|
| Source | memo fragment가 item 경계와 약하게 연결됨 | immutable source + fragment IDs |
| Personal overlay | example anchor와 실제 선택이 구분되지 않음 | explicit schedule intent, fixed overrides 유지 |
| Execution run | route별 receipt/anchor reuse 차이 | canonical save receipt와 independent run |
| Occurrence | definition과 occurrence가 Calendar에서 중복 | Calendar/Today occurrence only |
| Export | public/My Flow recurrence와 scope surface 불일치 | one export plan + result receipt |

## 9. 구조 변경과 visual polish 분리

### 먼저 해야 할 구조 변경

- P26-01~05 date, receipt, recurrence, memo, identity.
- P26-06~16 artifact, My Flow, whole Flow, editor, completion, Calendar, export.

### 그 뒤 할 visual polish

- component/action taxonomy.
- typography, density, color, focus, disabled/error states.
- mobile/wide responsive composition.

구조 contract가 다른 상태에서 CSS를 먼저 통일하면 잘못된 의미가 더 일관돼 보일 뿐이다.

## 10. 자동화로 확인한 것과 남은 가정

### 자동화/소스로 확인

- item/date/status/localStorage projection과 export rows/events.
- 390/1024 overflow, primary control, post-save count.
- public/My Flow recurring ICS 차이.
- memo parser가 예문을 2개로 나누는 결과와 그 원인.
- completion/reopen capability와 route-specific receipt/link behavior.

### 실제 사용자가 나중에 판단해야 하는 가정

- `날짜 없이 저장`이 `예시만 보기`보다 얼마나 자주 선택되는지.
- phase outline이 24개 Flow에서 timeline보다 이해가 빠른지.
- `지금 / Flow 목록 / 완료` label이 기존 todo/calendar 사용자에게 자연스러운지.
- export를 `가져가기`라고 부르는 것이 format 중심 사용자에게 충분한지.
- safety summary를 접었을 때도 차량/의료/세무 사용자가 필요한 경계를 놓치지 않는지.

이 문서는 해당 가정을 실제 사용자 검증으로 결론내리지 않는다.

## 11. 실행 결론

P26-01부터 P26-05까지를 correctness foundation으로 순차적으로 닫는다. P26-02/03/04는 P26-01 이후 병렬 가능하지만 P26-05 통합 gate를 통과하기 전에는 화면 polish를 시작하지 않는다. 그 다음 public receipt/whole Flow/My Flow/editor/Calendar/export를 재구성하고 responsive system과 최종 evidence harness를 적용한다.

전체 구현 순서는 [p26-backlog.md](p26-backlog.md), 바로 실행 가능한 goal은 [p26-goal-prompts.md](p26-goal-prompts.md), 결정 목록은 [decision-matrix.json](decision-matrix.json)을 참조한다.
