# FlowMe P28-00 정본 정합 독립 검토

## 1. 전체 판정

최종 판정: `structural_correction_required`

P27을 전면 재설계할 이유는 없다. production에서 다음 기반이 실제로 확인됐다.

- source, personal overlay, execution run, recurrence occurrence, export identity 분리
- 저장 전 포함·날짜·제목/메모·순서 조정
- 저장 receipt와 My Flow 연결
- 완료와 reopen
- Flow 보관·복구와 Item 제외·복구
- 반복 preview horizon과 series 종료 구분
- resource와 subcheck 분리
- Calendar Flow scope, 같은 날짜 grouping, undated tray, 일괄 배치와 undo
- 전체·선택·개별 export scope와 결과 개수

구조적 보정이 필요한 지점은 저장 전 경험이다. 긴 public Flow는 `저장될 전체 Flow`라고 쓰면서 5개만 보여준다. content-native primary artifact를 계산하는 코드가 있지만, 저장 shell과 export eligibility를 일관되게 지배하지 않는다. 더 중요한 문제는 top-level Item이 `todo | calendar`뿐이어서 폭염 경고나 계약 참고자료를 완료 가능한 할 일과 분리할 수 없다는 점이다.

이번 판정은 production 자동 상호작용, current source, 이전 artifact, 공식 reference pattern을 사용한 independent heuristic review다. 실제 관찰 사용자는 `0`명이다.

## 2. Evidence 기준

| evidenceKind | 이번 검토에서 사용한 근거 |
| --- | --- |
| `current_production_interaction` | production 17개 분리 context, 모바일 390·wide 1024 조작 결과와 스크린샷 |
| `current_package_screenshot` | P27 final/production closeout의 8개 상태와 route evidence |
| `current_source` | 정본 main `46e567e` 확인. application source는 마지막 app commit `45b1f42`의 FlowSaveBeforeFrame, artifact plan, overlay, lifecycle, export 계약과 동일 |
| `prior_design_artifact` | 정본 package의 `prior-artifacts/flow-content-usage-preview-ko.html` 5개 사례, 390·1024 조작 결과 |
| `reference_pattern` | Google Calendar, Apple Reminders, Todoist, Notion 공식 도움말 |
| `heuristic_simulation` | 제안 wireflow와 사용자 판단 비용 비교 |
| `inaccessible` | 정본 reconciliation에서 핵심 입력 inaccessible `0`; P27 E2E는 `tests/e2e/p27-foundation.spec.ts`로 확인 |

우선순위는 production interaction, production screenshot, source, structured evidence, prior artifact, reference 순으로 적용했다.

### 2.1 정본 commit과 artifact provenance

정본 prompt와 handoff package는 main `46e567ec09c5eba37ac703529b3d3eccc75e0dde`에서 확인했다. 최초 검토 기준 `45b1f424a9e73a188750eb22691a756b86153231`과의 diff는 정본 package 8개 파일 추가뿐이며 app, components, lib, tests 변경은 `0`이다. 따라서 `46e567e`는 reviewed main, `45b1f42`는 last application-affecting commit으로 분리 기록한다.

최초 검토에서 조작한 `docs/content-audit/2026-07-19-flow-content-usage-preview-ko.html`과 정본 package의 prior artifact SHA-256은 모두 `7D608B993342AEF5F570AA7C967E3DF46A7BC1083BB3BCCA8C631473E451A6C0`이다. 정본 manifest의 byte length `77523`, case count `5`, destination count `4`, observed users `0`도 일치한다. 이 artifact는 계속 `prior_design_artifact`이며 current production으로 승격하지 않는다.

### 2.2 P27 사용자 피드백 종합 reconciliation

정본이 추가로 요구한 `2026-07-21-p27-user-feedback-synthesis`는 P27 이전의 문제를 기록한 requirement provenance다. 해당 문서가 요구한 다음 항목은 current P27 package와 production에서 해소 여부를 다시 확인했다.

| P27 synthesis 요구 | current 판정 | P28 처리 |
| --- | --- | --- |
| Flow archive·undo·restore | complete_verified | P28-04 회귀 유지 |
| source exclusion / personal tombstone / restore | complete_verified | P28-04 회귀 유지 |
| preview horizon과 series end 분리 | complete_verified | P28-05 회귀 유지 |
| resource와 subcheck 분리 | complete_verified | top-level non-action role만 P28-02에서 추가 검토 |
| `/flows` server document | complete_verified | 현재 composer/catalog shell 유지 |
| 저장 전 한 operation씩 조정 | complete_verified | contextual value 위계만 P28-03에서 보강 |
| My Flow adaptive search | complete_verified | wide master-detail만 P28-04에서 보강 |
| Calendar Flow scope와 undated 배치 | complete_verified | P28-05 회귀 유지 |
| compact export와 receipt | complete_verified | destination eligibility만 P28-05에서 결합 |
| 저장 전 전체 결과 우선 | partial | P28-01 핵심 |

과거 synthesis의 상태값을 current truth로 인용하지 않고 production interaction, P27 final evidence, current source로 재판정했다.

## 3. Findings

### Blocking

#### B-01. 비실행 참고정보를 완료 항목과 분리하는 top-level 계약이 없다

| 항목 | 내용 |
| --- | --- |
| route | 향후 폭염 대응, 계약 검토, 부모님 여행 resource Flow |
| viewport | 공통 |
| 재현 | prior 폭염 사례의 실행 2개와 참고·중단·신고 4개를 current `FlowItem`과 generic export projection에 대입 |
| 기대 | action만 완료·Calendar·Todo 대상이고 reference/warning/resource는 읽기·출처·위험 정보로 유지 |
| 실제 | `FlowItem.type`은 `todo | calendar`; generic visible item은 checklist/sheet/memo 대상이며 schedule이 있으면 Calendar 대상 (`personal-structural-overlay.ts:545`) |
| 영향 | 안전 경고가 완료 가능한 체크박스로 바뀌고 export에서 의미가 왜곡될 수 있음 |
| evidenceKind | `current_source`, `prior_design_artifact` |
| 해결 | additive `itemRole`과 destination eligibility를 도입하고 legacy item은 `action`으로 해석. top-level role이 준비되기 전 안전/참고 사례를 public 활성화하지 않음 |
| acceptance marker | `heat-action-reference-390`, unit `non-action rows never gain completion/calendar eligibility` |

근거: `lib/flow/types.ts:100`, `lib/flow/personal-structural-overlay.ts`, [prior 폭염 화면](./screenshots/prior-heat-1024.png).

### High

#### H-01. 긴 Flow의 저장 전 `전체` 표기가 실제 전체를 보여주지 않는다

| 항목 | 내용 |
| --- | --- |
| route | `/f/moving-d30-basic` |
| viewport | 390x844 |
| 재현 | 첫 진입 -> 이사일 확인 -> `저장될 전체 Flow` 영역 읽기 |
| 기대 | 24개 전체 구조를 계산 없이 확인하거나 명시적인 `24개 전체 보기`로 펼침 |
| 실제 | 5개와 `외 19개`; 별도 workbench에는 8개와 `나머지 16개 보기`; 조정 화면에서야 24개가 나타남 |
| 영향 | 그대로 저장하기 전에 빠진 항목·순서·단계를 확인하기 어렵고 `전체`라는 라벨을 과신할 수 있음 |
| evidenceKind | `current_production_interaction`, `current_source` |
| 해결 | 하나의 complete outline을 저장 shell의 canonical projection으로 사용. 모바일은 단계 요약+펼치기, wide는 outline rail/drawer |
| acceptance marker | `moving-24-whole-flow-before-save-390`, `moving-24-whole-flow-before-save-1024` |

근거: [production 화면](./screenshots/moving-save-before-mobile.png), `components/flow/FlowSaveBeforeFrame.tsx:48`.

#### H-02. primary artifact 계산과 실제 저장·export 선택 계약이 분리돼 있다

| 항목 | 내용 |
| --- | --- |
| route | `/f/*`, `/flows`, export preflight |
| viewport | 공통 |
| 재현 | moving, workout, vehicle의 저장 전 workbench와 export를 비교하고 `artifact-plan`, `execution-model`, `export-scope` 확인 |
| 기대 | 콘텐츠별 primary 하나, 유용한 secondary 0~2개, 금지 destination과 손실 사유가 같은 정책에서 파생 |
| 실제 | artifact-plan은 다양한 primary surface를 고르지만 generic export destination은 넓고 checklist/sheet/memo eligibility가 사실상 전역 |
| 영향 | 사용자는 의미 없는 탭을 보고, 개발자는 화면별 예외를 계속 추가하게 됨 |
| evidenceKind | `current_source`, `current_production_interaction` |
| 해결 | `artifactPolicy { primary, secondary, forbidden, lossNotes }`와 item eligibility를 SaveBeforeProjectionVM, receipt, export가 공유 |
| acceptance marker | `artifact-policy-five-cases.json`, `destination-count-parity.e2e` |

#### H-03. 대표 콘텐츠 5개 중 4개가 production에서 실행 가능한 Flow로 연결되지 않는다

| 항목 | 내용 |
| --- | --- |
| route | `/flows` URL lookup |
| viewport | 390x844 |
| 재현 | K-MOOC, 농사로 폭염, 오늘의집 계약, VisitKorea 부모님 여행 URL 각각 제출 |
| 기대 | source 상태와 검증된 전체 Flow 또는 명확한 hold 결과 |
| 실제 | 네 사례 모두 정직하게 `준비된 Flow 없음`; 후보 저장 외에는 artifact를 볼 수 없음 |
| 영향 | P28의 content-native UX 약속을 production으로 검증할 대표군이 이사 하나뿐 |
| evidenceKind | `current_production_interaction`, `prior_design_artifact` |
| 해결 | 계약을 먼저 고친 뒤 source·권리·안전 gate를 통과한 대표 fixture만 단계적으로 등록. miss를 가짜 생성으로 우회하지 않음 |
| acceptance marker | `source-five-case-gate.json`, 각 사례 save-before screenshot |

근거: [K-MOOC miss](./screenshots/source-probe-kmooc-mobile.png), [폭염 miss](./screenshots/source-probe-heat-safety-mobile.png), [계약 miss](./screenshots/source-probe-remodel-contract-mobile.png), [여행 miss](./screenshots/source-probe-parents-travel-mobile.png).

#### H-04. 메모 draft는 정직하지만 장소·순서·날짜 의미를 보존하는 preview가 약하다

| 항목 | 내용 |
| --- | --- |
| route | `/flows` |
| viewport | 390x844 |
| 재현 | 부모님 공주 여행, 4개 장소와 날짜 추후 결정 메모 제출 |
| 기대 | 4개 ordered place item과 미정 날짜를 확인하고 checklist 또는 Calendar 후보를 미리 봄 |
| 실제 | 문장 기반 3개 항목, 첫 항목 중심 날짜 입력, split/merge/reorder는 있으나 content-native artifact preview 없음 |
| 영향 | 첫 preview가 원문 의미와 다르며 사용자가 parser 보정부터 해야 함 |
| evidenceKind | `current_production_interaction`, `heuristic_simulation` |
| 해결 | 감지한 범위와 분할 결과를 먼저 확인하고 장소·순서가 있으면 ordered checklist, 날짜·시간이 채워지면 Calendar로 승격 |
| acceptance marker | `parents-trip-memo-detected-390`, `parents-trip-calendar-promoted-390` |

근거: [production memo 결과](./screenshots/flows-memo-result-mobile.png).

### Medium

#### M-01. 저장 receipt의 전체 확인은 짧은 Flow와 긴 Flow에서 다르게 느껴진다

source-backed moving 5개는 receipt에서 전부 읽힌다. public moving 23개는 단계명·개수와 첫 단계 내용은 보이지만 모든 항목 제목을 즉시 읽으려면 추가 펼침이 필요하다. receipt의 목적은 모든 내용을 다시 편집하는 것이 아니라 저장 성공 확인이므로, `23개 저장·6단계·5개 날짜` 요약과 `전체 Flow 열기`를 첫 시선에 결합하면 충분하다. `current_production_interaction`, `heuristic_simulation`.

#### M-02. 조정 mode는 progressive하지만 콘텐츠별로 필요한 값보다 전체 24행이 먼저 지배한다

포함·날짜·제목/메모·순서를 한 번에 하나씩 보여주는 방식은 P27의 좋은 결정이다. 다만 이사일 같은 Flow-level required value와 특정 항목만 바꾸는 quick edit가 같은 긴 목록 안에 있다. P28-03은 mode를 늘리지 말고 `필요한 값 -> 변경된 항목 -> 전체 상세` 순서로 재배치해야 한다. `current_production_interaction`, `reference_pattern`.

#### M-03. public bundle과 source-backed Flow의 저장 전 모델이 갈라져 있다

source-backed 단계에는 destination과 sourceTrace가 더 강하게 존재하고, generic bundle은 ArtifactWorkbench와 structural overlay를 사용한다. P28 shell을 각각 구현하면 receipt·export·My Flow parity가 다시 깨질 위험이 크다. persistence를 합치기보다 읽기 전용 `SaveBeforeProjectionVM` adapter로 통합해야 한다. `current_source`.

#### M-04. 1024px My Flow는 기능은 갖췄지만 master-detail 이점이 약하다

16개 demo에서는 검색·필터가 나타나고 선택 Flow로 이동할 수 있다. 다만 첫 viewport는 넓어진 모바일 stack처럼 보이며 목록과 선택 Flow 맥락을 동시에 유지하지 못한다. P28-04는 1024 이상에서 inventory rail + selected Flow workspace를 사용하되 모바일 IA를 바꾸지 않는다. `current_production_interaction`, `heuristic_simulation`.

### Low

#### L-01. destination CTA가 실제 결과 수를 더 직접 말할 수 있다

`저장`, `가져가기`보다 `캘린더 일정 24개 확인`, `14주 진도표로 시작`, `Todo 2개 가져가기`, `비교표를 메모로 복사`가 결과를 예측하게 한다. 현재 export preflight의 개수 표시는 좋은 기반이다. `current_production_interaction`, `reference_pattern`.

## 4. P27에서 실제 완료된 범위

| 범위 | 판정 | 검증 근거 |
| --- | --- | --- |
| 4탭 IA와 server document | 완료 | current source, P27 package |
| 저장 전 include/date/title+memo/order | 완료 | production moving adjustment |
| source/personal/run/occurrence/export identity | 완료 | current source, P27 571 unit/339 E2E 기록 |
| Flow 보관·undo·지속 복구 | 완료 | current source, package screenshot |
| source Item 제외·복구, personal Item tombstone | 완료 | current source, targeted E2E |
| 반복 4주 preview와 종료일 없음 | 완료 | production workout |
| occurrence 완료·reopen | 완료 | production/package evidence |
| resource와 subcheck 분리 | 완료 | production workout, current source |
| Calendar Flow filter·same-date·undated tray | 완료 | production Calendar·vehicle |
| 일괄 날짜 배치·이동·undo | 완료 | production vehicle |
| export 전체·선택·개별 scope와 count | 완료 | production source-backed moving |

P27 자동 gate 기록은 pretest `24/24`, unit `571/571`, targeted E2E `12/12`, full E2E `339/339`다. 이번 검토는 이를 production에서 대표 상태로 재확인했지만 사용자 관찰로 승격하지 않는다.

### Claude Design `(10).zip` 대조

archive 안의 가장 최근 관련 보고서 `FlowMe UX 재검토 P26 production 마감 (P27 전체 실행 백로그).dc.html`은 P26 당시 `/flows` server document의 loading-only 상태, `/my`의 5-tab Studio shell, 긴 save-before 본문, Calendar/My Flow 밀도를 지적하고 안정된 identity/projection 계약은 보존하라고 제안했다. current production에서는 `/flows` composer/catalog와 `/my` 4-tab shell이 확인돼 앞의 두 High finding은 P27로 해소됐다. 긴 save-before body와 wide density는 이번 H-01, M-02, M-04로 일부 남아 있다. archive root `review.html`은 P9 guardrail package이므로 최신 current evidence로 사용하지 않았다. 모두 `prior_design_artifact`로만 취급했다.

## 5. Partial 또는 누락된 범위

| 범위 | 상태 | 이유 |
| --- | --- | --- |
| 긴 Flow 저장 전 전체 outline | partial | 5개 summary와 별도 workbench로 분산 |
| content-native primary/secondary policy | partial | surface resolver는 있으나 export/item eligibility와 분리 |
| top-level action/reference/warning/resource role | missing | `FlowItem.type`이 todo/calendar뿐 |
| K-MOOC, 폭염, 계약, 부모님 여행 production Flow | missing | URL lookup miss; 이전 artifact에만 사례 존재 |
| content-native memo detection | partial | 문장 분할·수동 보정은 있으나 장소/순서/결과 preview가 약함 |
| 1024 master-detail My Flow | partial | 기능은 있지만 inventory와 detail 동시 맥락이 약함 |
| 영구 삭제 | deferred_with_reason | P27은 가역 보관/복구 우선, 계정·서버 보존 정책이 없음 |
| cross-device persistence | deferred_with_reason | localStorage 제품 범위 |

## 6. 다섯 콘텐츠 여정

### 이사 준비

`Flow 발견 -> 이사일 -> 5/24 summary -> Calendar workbench -> 조정 -> 저장 -> receipt -> My Flow/Calendar -> 완료/reopen -> export -> 다시 쓰기`가 동작한다. 사용자가 내리는 핵심 결정은 이사일 하나다. 불필요한 결정은 적지만 `전체`를 확인하려면 화면 내 서로 다른 두 projection을 해석해야 한다. 권장안은 24개 outline과 Calendar를 한 shell에 두고 primary CTA를 `24개 일정으로 시작`으로 바꾸는 것이다. `current_production_interaction`.

### K-MOOC 14주

URL 제출 직후 `준비된 Flow 없음`에서 멈춘다. 이 상태의 정직성은 유지해야 한다. 이전 artifact의 14주 Sheet, 3/14 진도, 공식 일정만 Calendar로 보내는 구조는 의미적으로 적합하지만 production 계약은 아니다. 첫 결과 전 필수 입력은 0개, 이미 수강 중일 때만 현재 주차를 묻는 게 맞다. `current_production_interaction`, `prior_design_artifact`, `heuristic_simulation`.

### 농작업 폭염 대응

URL miss에서 멈춘다. 이전 artifact는 실행 2개와 참고·중단·신고 4개를 잘 구분하고 반복 Calendar를 만들지 않았다. 현재 top-level 계약으로 구현하면 참고정보도 완료 항목이 될 위험이 있어, 콘텐츠 추가보다 role/eligibility가 선행해야 한다. `current_production_interaction`, `current_source`, `prior_design_artifact`.

### 인테리어·리모델링 계약 검토

URL miss에서 멈춘다. 자연스러운 결과는 비교 Sheet와 기록 Memo이며 날짜는 사용자가 실제 기한을 넣을 때만 생긴다. source/rights 상태를 개인화 입력으로 해결하면 안 된다. 실행 항목, 비교 기록, 참고자료를 role로 분리한 뒤 public 가능 여부를 별도로 gate해야 한다. `current_production_interaction`, `prior_design_artifact`, `heuristic_simulation`.

### 부모님 여행 동선

URL은 miss지만 메모 draft로 우회할 수 있다. 현재는 4개 장소가 3개 문장으로 분할돼 사용자가 구조를 고쳐야 한다. 날짜·시각 전에는 ordered checklist가 가장 자연스럽고, 날짜와 각 방문 시각을 넣은 뒤 Calendar를 primary로 승격해야 한다. 이 전환은 destination 탭 선택이 아니라 입력 결과로 설명해야 한다. `current_production_interaction`, `prior_design_artifact`, `heuristic_simulation`.

## 7. A/B/C 저장 전 UX 비교

| 대안 | 장점 | 한계 | 판정 |
| --- | --- | --- | --- |
| A. 전역 5개 Gallery | 처음 보는 사람이 결과군을 빠르게 이해 | 콘텐츠가 늘수록 모바일을 점유하고 사례 선택을 먼저 학습 | primary로 사용하지 않음 |
| B. Flow별 Artifact-first | 실제 Flow를 찾은 뒤 가장 명확하고 확장 가능 | empty 상태에서 제품 결과를 상상하기 어려움 | 감지 후 구조로 채택 |
| C. Hybrid | empty 이해와 실제 작업을 연결 | 두 상태 전환을 명확히 설계해야 함 | 권장 |

권장 C는 5개 카드를 홈에 영구 노출하는 안이 아니다. `/flows` empty에는 composer와 2~3개의 작은 결과 예시만 둔다. `source_found`, `existing_flow_found`, `proposal_ready` 이후에는 B로 전환해 해당 콘텐츠의 primary artifact와 전체 Flow만 보여준다.

## 8. 권장 UX 구조

### 공통 약속

`URL·메모 -> source 상태 -> 저장될 전체 Flow -> primary artifact -> 필요한 사용자 값 -> 최소 조정 -> 명시적 결과 CTA -> receipt -> 같은 My Flow 문법`

### 콘텐츠별 policy

| 사례 | 첫 결과 | 첫 결과 전 입력 | secondary | 숨길 결과 |
| --- | --- | --- | --- | --- |
| 이사 | 상대 일정 Calendar | 이사일 1개 | Checklist, Memo | Sheet가 새 정보를 주지 않으면 숨김 |
| K-MOOC | 14주 progress Sheet | 0개 | 공식 기한 Calendar | 일반 Memo, 가짜 반복 Calendar |
| 폭염 | 안전 guidance + 실행 2개 | 0개; 작업일은 선택 | Todo 2개 | 반복 Calendar, 참고정보 체크박스 |
| 계약 | 비교 Sheet | 0개 | Memo | 날짜 없는 Calendar, 참고자료 Todo |
| 부모님 여행 | ordered checklist; 시간 입력 후 Calendar | 여행일 1개, 시각은 점진적 | Memo | 비어 있는 Sheet |

### 모바일 390 wireframe

```text
┌──────────────────────────────┐
│ 원문 확인됨 · AJD        출처 │
├──────────────────────────────┤
│ 원룸 이사 D-30 준비          │
│ 24개 · 6단계 · 날짜 24개     │
│ [24개 전체 보기]             │
├──────────────────────────────┤
│ Calendar 결과                │
│ 7/02 견적 후보               │
│ 7/18 청소·폐기물             │
│  ...                         │
│ [Checklist도 보기]           │
├──────────────────────────────┤
│ 이사일 *  [2026-08-01]       │
│ [필요한 항목만 조정]         │
├──────────────────────────────┤
│ [24개 일정으로 시작]         │
│ 외부 Calendar용 파일         │
└──────────────────────────────┘
```

스크롤 순서는 source, 전체 결과, primary artifact, required value, action이다. sticky 영역의 primary는 하나만 둔다.

### wide 1024 wireframe

```text
┌───────────────┬──────────────────────────────┐
│ 원문·전체 Flow │ Calendar 결과                │
│ 24개 / 6단계   │ 월간 + 선택 날짜 agenda      │
│ ▾ D-30 4개     │                              │
│ ▸ D-14 5개     ├──────────────────────────────┤
│ ▸ D-7  6개     │ 이사일 2026-08-01            │
│ ...            │ [필요한 항목만 조정]          │
│                │ [24개 일정으로 시작]          │
└───────────────┴──────────────────────────────┘
```

1024에서는 2열을 기본으로 한다. 이전 artifact의 고정 3열은 5/5 wide 사례에서 overflow가 확인됐으므로 적용하지 않는다. 3열은 `>=1280px`에서만 compact source rail, primary artifact, contextual values로 확장한다.

### My Flow와 Calendar

- My Flow는 Flow inventory와 전체 구조·실행 상태를 소유한다.
- Calendar는 날짜 projection과 배치·이동을 소유한다.
- 1024 My Flow는 왼쪽 inventory, 오른쪽 selected Flow workspace를 사용한다.
- Calendar의 Flow filter, undated tray, occurrence wrapper는 P27 구조를 유지한다.
- non-action role은 완료 control과 undated tray에 들어가지 않는다.

## 9. 데이터·migration·회귀 위험

### 보존할 계약

source, personal overlay, run, occurrence, export identity와 current localStorage key는 다시 만들지 않는다. pre-save edit는 새로운 저장소가 아니라 existing personal overlay의 ephemeral draft로 만들고 저장 시 atomic commit한다.

### additive 계약

```ts
type ItemRole = 'action' | 'reference' | 'warning' | 'resource' | 'record' | 'decision';

type ArtifactPolicy = {
  primary: ArtifactSurface;
  secondary: ArtifactSurface[];
  forbidden: ArtifactSurface[];
  lossNotes: Partial<Record<ArtifactSurface, string[]>>;
};
```

legacy item은 resolver에서 `action`으로 취급한다. P28-01 shell은 migration 없이 adapter로 구현할 수 있다. P28-02에서 non-action 대표 콘텐츠를 활성화하기 전에 role/eligibility backfill과 malformed fallback unit test가 필요하다.

### 주요 회귀 위험

| 위험 | 대응 |
| --- | --- |
| pre-save 수정이 저장 전 source/persistent overlay를 오염 | ephemeral overlay, cancel 시 write 0, save 시 atomic commit |
| public bundle과 source-backed Flow가 다른 projection 사용 | 공통 SaveBeforeProjectionVM adapter |
| non-action item이 completion/export에 포함 | 역할별 projection eligibility invariant |
| artifact policy 변경으로 기존 export count 변동 | old fixture parity + five-case policy fixture |
| Calendar filter/occurrence identity 손상 | P27 targeted E2E를 mandatory regression으로 유지 |
| slug override 증가 | current artifact-plan을 초기 fallback으로만 사용하고 policy evidence를 fixture로 고정 |

## 10. 공식 reference pattern

외형이나 기능 목록을 복사하지 않고 다음 연결 방식만 참고했다.

| 제품 | 확인한 공식 패턴 | FlowMe 판단 |
| --- | --- | --- |
| [Google Calendar Tasks](https://support.google.com/calendar/answer/9901136?hl=en-uk) | task에 날짜·시간·설명을 점진적으로 추가하고 dated task만 Calendar에 표시 | 적용: 날짜 없는 action을 먼저 저장하고 필요할 때 배치 |
| [Apple Reminders 목록](https://support.apple.com/en-mide/guide/iphone/iph82596cb20/ios) | section/subtask, collapse, multi-select와 일괄 날짜·이동·완료 | 변형 적용: 긴 Flow outline과 batch adjustment |
| [Apple Reminders 세부값](https://support.apple.com/en-us/102484) | 날짜·시간·장소·링크를 선택적으로 추가 | 적용: source에 없는 사용자 값만 묻기 |
| [Todoist section](https://www.todoist.com/help/articles/introduction-to-sections-rOrK0aEn) | section은 구조이고 완료 task가 아님 | 적용: 단계·reference를 completion에서 분리 |
| [Todoist task](https://www.todoist.com/help/articles/introduction-to-tasks-080OAXric) | 빠른 입력, 완료, reopen, 반복 처리 | 적용: 같은 위치의 완료/reopen; P27 유지 |
| [Notion views](https://www.notion.com/help/views-filters-and-sorts) | 같은 canonical data를 목적에 맞는 view로 투영 | 변형 적용: source는 하나, artifact는 eligibility에 따라 제한 |
| [Notion database view guide](https://www.notion.com/help/guides/when-to-use-each-type-of-database-view) | 작업 목적에 따라 table/calendar/list를 선택 | 적용: 모든 Flow에 모든 destination을 강제하지 않음 |

적용 금지: 앱을 범용 project database로 확장하는 것, 다섯 destination을 항상 탭으로 노출하는 것, source/reference를 완료 task로 변환하는 것.

## 11. 실제 사용자 관찰 전 필요한 gate

1. 다섯 사례 모두 source scope와 rights/safety decision이 문서화돼야 한다.
2. non-action item이 completion·Calendar·Todo export에 들어가는 건수가 0이어야 한다.
3. save-before, receipt, My Flow, Calendar, export의 item identity와 count mismatch가 0이어야 한다.
4. long Flow 24개와 course 14주 전체를 저장 전에 열어볼 수 있어야 한다.
5. 390·1024에서 overflow, fixed overlap, 이름 없는 control, keyboard trap, console/page error가 0이어야 한다.
6. cancel/retry/export failure에서 source와 personal draft 손실이 없어야 한다.
7. 자동 QA 결과에 `observedUserSessions: 0`을 유지해야 한다.

## 12. 실제 사용자에게만 확인 가능한 질문

- `/flows` empty의 작은 결과 예시가 입력을 돕는가, 방해하는가?
- 긴 Flow에서 단계 요약만으로 저장 확신이 생기는가, 모든 항목 제목을 펼치는가?
- 이사 Flow에서 `Calendar 먼저`가 자연스러운가?
- 부모님 여행에서 날짜·시각 입력 전 checklist, 입력 후 Calendar로 바뀌는 이유가 이해되는가?
- `보관`, `제외`, `복구` 문구가 삭제 기대와 맞는가?
- search 노출 임계값 5가 실제 저장량에서 적절한가?
- primary 하나와 secondary 제안 방식이 destination 선택권을 과도하게 제한한다고 느끼는가?

이 질문은 P28 내부 구현 gate를 통과한 뒤에만 의미가 있다. 이번 검토는 답을 주장하지 않는다.
