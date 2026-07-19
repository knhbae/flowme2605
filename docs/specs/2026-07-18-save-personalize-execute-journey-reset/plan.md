# Save, Personalize, Execute Journey Reset Plan

## Program Decision

전면 IA·데이터 재작성은 하지 않는다. 문구 몇 줄만 줄이는 임시 수정도 하지 않는다. 4탭과 현재 데이터 계약을 보존하면서 **저장 판단, 최소 개인화, 저장 직후 확인, 재방문 실행**의 프레임만 다시 설계하는 bounded journey reset으로 진행한다.

**2026-07-19 execution state:** P24-J0~J4의 결정·구현·로컬 회귀·독립 검토는 완료됐다. P24-J5의 merge, production deploy, public-route 재검증만 남았다. 관찰은 자동 재개하지 않는다.

## Files

| File | Responsibility |
| --- | --- |
| `docs/content-audit/2026-07-18-flowme-save-personalize-execute-journey-review/` | 현재 증거, 참고 패턴, 평가 결과, 와이어프레임, 다음 backlog |
| `docs/specs/2026-07-18-save-personalize-execute-journey-reset/` | 장기 목표, 단계, QA gate |
| `docs/STATUS.md` | 외부 관찰 전 product-readiness gate 상태 |
| `docs/ROADMAP.md` | P24-J0~J5 실행 순서 |
| `docs/content-audit/2026-07-14-flowme-p24-feedback-reconciliation/backlog.md` | 기존 P24 관찰 gate의 보류 사유와 연결 |

## Sequence

### P24-J0 - Journey decision package

앱 코드를 수정하지 않는다.

1. 현재 production의 moving, vehicle, memo draft 여정을 재현한다.
2. 기존 11단계 콘텐츠 편집 시뮬레이션과 Claude Design A/B/F 목업을 대조한다.
3. 설명 block, 저장 전 정보, 저장 후 전체 artifact depth, undated/held 노출을 계수한다.
4. 두 대안 와이어프레임을 만든다.
5. owner walkthrough와 별도 Codex/Claude heuristic review를 실행한다. 외부 참가자는 요청하지 않는다.
6. `keep/change/defer`로 하나의 구현안을 선택한다.

**Exit:** 구현할 화면과 삭제/접기/유지할 정보가 확정된다. 불명확하면 production 코드를 수정하지 않는다.

### P24-J1 - Save-decision surface

대상: moving과 vehicle의 public/save-before shell.

- title, anchor, artifact shape, 전체 item count를 먼저 보인다.
- 1차 행동 `그대로 저장`, 2차 행동 `조정하고 저장`을 분리한다.
- 반복되는 promise copy를 제거하고 출처/주의는 접힌 상세로 유지한다.
- 최소 조정은 Flow 이름, 기준일, 포함 항목만 우선한다.

**Exit:** 사용자가 저장 전 결과와 두 행동의 차이를 설명할 수 있다.

### P24-J2 - Post-save full artifact landing

대상: 저장 직후 `/my` special state.

- 첫 저장 직후 전체 Flow timeline/checklist를 바로 보여준다.
- 확인 banner, Flow 제목, 기준일, 전체 수, 다음 행동을 한 프레임에 둔다.
- `오늘 실행 시작`은 전체 확인 다음 행동이다.
- 재방문 `/my`는 기존 Today-first를 유지한다.

**Exit:** 저장 직후 전체 Flow 확인 depth 0, 재방문 실행 depth는 증가하지 않는다.

### P24-J3 - My Flow, Calendar, held-content cleanup

- My Flow의 Flow 선택 UI를 Calendar filter처럼 보이지 않게 정리한다.
- Calendar grid에는 dated item만 둔다.
- undated item은 `날짜 없는 할 일` tray에서 날짜 배치로 연결한다.
- held/review 콘텐츠는 ordinary Home/Flows/My Flow/Calendar에서 숨긴다.
- 기존 저장 record와 실행 기록은 데이터 관리/복구 경로에 보존한다.

**Exit:** 사용자가 My Flow와 Calendar 역할을 혼동하지 않고, held 콘텐츠가 실행 가능 항목처럼 보이지 않는다.

### P24-J4 - Integrated implementation and regression

- moving, vehicle, memo draft 세 유형에 공통 shell을 적용한다.
- 특정 slug 전용 분기를 만들지 않는다.
- 완료/재개, 날짜 override, 반복, export, public boundary 회귀를 검증한다.
- 390px/1024px 접근성·overflow·console error를 확인한다.

**Exit:** automated Blocking/High 0, reference fixtures와 production parity 유지.

### P24-J5 - Independent production-readiness audit

1. 배포된 production에서 moving, vehicle, memo draft 대표 여정을 처음부터 다시 재현한다.
2. current-browser, current-command, independent reviewer evidence만 사용해 Blocking/High를 판정한다.
3. copy density, post-save whole Flow, My Flow/Calendar 역할, undated tray, held visibility, 접근성, 모바일/와이드 품질을 확인한다.
4. `implementation_complete_observation_not_started` 또는 `not_ready_for_observation`으로 닫는다.
5. P24-00B를 자동 재개하지 않고 owner에게 준비도 판단과 남은 위험을 전달한다.

## Internal Scenario Review Tasks

### Test A - Moving

1. 이사 준비 Flow를 연다.
2. 무엇이 저장되는지 말한다.
3. 그대로 저장할지 조정할지 선택한다.
4. 이사일과 항목 하나를 조정한다.
5. 저장 직후 전체 일정이 맞는지 확인한다.
6. 오늘 할 일과 Calendar가 각각 무엇인지 말한다.

### Test B - Vehicle inspection

1. public Flow를 연다.
2. 날짜 없이 저장 가능한지 판단한다.
3. 전체 checklist를 확인하고 저장한다.
4. 저장 후 항목 하나에 날짜를 넣는다.
5. Calendar와 날짜 없는 tray에서 위치를 확인한다.

## Evaluation Metrics

| Metric | Target |
| --- | --- |
| `savedArtifactPredictableFromPrimarySurface` | true in owner and independent review |
| `saveVsAdjustDistinguished` | true |
| `postSaveWholeFlowActionDepth` | 0 |
| `todayVsCalendarRoleDistinctOnScreen` | true |
| `primaryActionBeforeLongExplanation` | true |
| `heldContentOrdinarySurfaceCount` | 0 |
| `mobileHorizontalOverflowCount` | 0 |
| `blockingInternalReviewFindingCount` | 0 before J1 implementation |
| `externalObservationRequested` | false through P24-J5 |

## Risk Controls

- 시뮬레이션, owner review, 독립 agent review, 실제 관찰을 구분한다.
- 기존 source/detail/caution 정보는 삭제하지 않고 progressive disclosure로 이동한다.
- post-save special state와 returning Today state를 분리해 실행 허브를 약화하지 않는다.
- held 숨김은 record 삭제가 아니라 visibility policy로 구현한다.
- J0에서 앱 코드를 수정하지 않는다.
- 각 implementation slice는 이전 slice의 evidence가 green일 때만 시작한다.
- P24-J5 통과만으로 사용자 검증 완료를 주장하지 않는다. 외부 관찰은 별도 owner decision 뒤에만 연다.
