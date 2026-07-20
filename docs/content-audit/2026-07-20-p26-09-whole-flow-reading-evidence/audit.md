# P26-09 audit

## 원인

기존 전체 Flow는 3개와 24개를 같은 방식으로 펼쳤다. 긴 날짜형 Flow에서는 단계, 같은 날짜, 완료율, 메모 action이 행마다 반복되어 첫 화면에서 기간과 다음 행동을 읽기 어려웠다. 반대로 짧은 checklist까지 접으면 확인 비용이 늘어난다.

## 구현

### Pure reading model

`whole-flow-reading.ts`는 consumer가 받은 effective row를 수정하지 않고 다음 값만 만든다.

- content mode: timeline, checklist, routine, project, record
- 기존 section label 기반 group
- Flow/group date range
- completed/total count
- 같은 날짜의 연속 cluster
- long disclosure 여부와 기본 open group
- next actionable row ID

10개 이하는 모두 열고, 11개 이상은 다음 미완료 항목이 있는 group만 기본으로 연다. group에 없는 새 row나 잘못된 날짜도 유실하지 않는다.

### Adaptive outline

| 형태 | 초기 표현 | 긴 Flow 처리 |
| --- | --- | --- |
| timeline/project | 단계 수, 기간, 완료 수 | 다음 단계만 open |
| checklist | 묶음 또는 체크 수 | 10개 이하는 all visible |
| routine | 구간 또는 구성 수 | 정의 row identity 유지 |
| record | 기존 section 순서 | source order 유지 |

별도 timeline view toggle은 추가하지 않았다. 날짜형 Flow의 단계 outline 자체가 현재 필요한 시점과 순서를 보여주며, 임의 view가 늘어나면 P26-08 local IA를 다시 복잡하게 만들기 때문이다.

### Row hierarchy

행에는 완료, 제목, 필요한 날짜/기준, `열기`만 둔다. 같은 날짜가 이어지면 shared date header를 한 번 사용한다. 실행 메모는 detail section으로 이동했다. 이 과정에서 기존 note handler가 상세를 닫는 결함을 browser regression에서 발견해, 열린 같은 item의 상세에서는 detail을 보존하도록 수정했다.

### 범위 경계

- source-backed/published Flow: adaptive outline 적용
- post-save receipt: 같은 read-only grouping 적용
- 개인 structural draft mobile editor: 기존 add/delete/restore/reorder renderer 유지
- 개인 structural draft wide whole workspace와 batch contract: 유지
- Calendar, recurrence expansion, export plan: 입력과 identity 변경 없음

P26-11에서 structural mode를 새 outline grammar에 통합한다. 이번 단계에서 구조 편집 control을 억지로 phase row 안에 섞지 않았다.

## 시나리오

| 시나리오 | route/fixture | viewport | 결과 | evidenceKind |
| --- | --- | ---: | --- | --- |
| 짧은 routine 3개 | washer monthly saved Flow | 390x844 | 3개 모두 visible | current_browser |
| 경계 checklist 10개 | vehicle inspection saved Flow | 390x844 | 10개 모두 visible | current_browser |
| 긴 timeline 24개 | moving-d30-basic | 390x844 | 6단계, 기본 1단계/4행, 전체 24행 | current_browser |
| 긴 timeline detail | moving-d30-basic | 390x844 | row memo 0, detail memo reachable/saveable | current_browser |
| 긴 timeline wide | moving-d30-basic | 1024x768 | outline + detail pane | current_browser |
| held multi-Flow receipt | baby-health source-backed fixture | 390x844 | canonical 18, 기본 14, expanded 18 | current_browser |

## 회귀 검증

- source-backed Flow 전체/선택 export와 item export
- personal draft batch date move, date clear, selected export, tombstone, undo
- 완료 후 persistent reopen
- execution note private/source-correction 저장, completion aggregation, run reuse
- P25 post-save and whole-Flow workspace
- P26-07 receipt/decision hub

## 검증 경계

스크린샷과 DOM, keyboard, local state, download/copy contract를 자동화로 확인했다. 실제 사용자가 24개 Flow에서 단계명과 기간을 충분히 이해하는지, 10개 all-visible threshold가 적정한지는 관찰하지 않았다.

## 잔여 위험

1. 10개 checklist는 의도적으로 모두 보이므로 실제 사용자가 길다고 느끼면 threshold가 아니라 checklist-specific chunking을 다시 검토해야 한다.
2. personal structural draft mobile은 P26-11 전까지 기존 control-dense renderer다.
3. group label 품질은 source content의 section 품질에 의존한다. generic section은 P26-17 copy/content audit 대상이다.
4. `flow-mvp.spec.ts` 전체 단일 실행은 P26-08에서 10분 제한을 넘겼으므로 P26-19 shard/full gate에서 다시 집계한다.
