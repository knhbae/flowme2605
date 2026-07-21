# P28 Integrated Audit

## 1. 전체 판단

P28은 최신 owner feedback에서 지적한 여섯 문제를 공통 화면 문법으로 재구성했다. 이전처럼 route별 patch를 추가하지 않고, whole outline, actual-data artifact preview, contextual adjustment, common execution row, routine definition, scalable Calendar scope를 공유한다.

내부 release gate는 통과했다. 다만 observed-user count는 0이므로 “사용자가 만족한다”는 결론은 내리지 않는다.

## 2. 피드백별 결과

| Owner feedback | 구현 결과 | 현재 판정 | 남은 확인 |
| --- | --- | --- | --- |
| Flow 찾기에서도 제목·날짜·내용을 자연스럽게 조정 | URL hit는 준비된 `/f` workspace로 이동하고, 저장 전 outline의 각 row에서 제목·날짜·메모를 수정한다. Flow 개인 제목도 같은 commit에 저장한다. | supported | order/add/remove의 첫 노출 수준은 실제 과업 관찰 필요 |
| 홈트가 복잡하고 4주 고정처럼 보임 | preview horizon과 series end를 분리했다. 주 N회는 요일 선택에서 계산하고, 시간·예상 시간·종료 없음/until/count를 공통 editor로 저장한다. | supported | 모바일에서 설정 길이가 적절한지 관찰 필요 |
| 홈트만 완료/결과/자료 UI가 다름 | workout-only 결과 selector를 제거했다. 실행은 일반 occurrence checkbox/reopen/skip/hold 계약, 원문 영상은 공통 resource block이며 completion control은 없다. | supported | resource 발견성과 note 사용성 관찰 필요 |
| Calendar Flow 필터가 가로로 길어짐 | 1개면 숨김, 2~5개면 compact, 6개 이상이면 검색 가능한 multi-select picker를 사용한다. 선택은 reload 후 유지되고 grid/agenda에 동일 적용된다. | supported | 50개 이상 성능과 최근 Flow 정렬은 후속 관찰 |
| 다섯 형태가 실제 데이터로 보이지 않음 | Flow 실행, Calendar, Checklist/Todo, Sheet, Memo renderer를 실제 effective rows에 연결했다. Flow마다 primary 1개, eligible secondary 최대 2개만 노출한다. | supported | artifact 추천이 콘텐츠 기대와 맞는지 콘텐츠별 관찰 필요 |
| My Flow 구조가 실서비스 수준이 아님 | 모바일은 library list -> selected detail, wide는 bounded rail -> one detail이다. 20개 이상 검색/상태 filter를 제공하고 중복 selector를 제거했다. | supported | 50개 이상, archive density, returning-user scan time 관찰 필요 |

## 3. 선택한 구조

P28-01은 세 대안을 비교했다.

- Outline-first: 전체 구조는 잘 보이지만 저장 결과가 늦게 보임.
- Artifact-first: 결과는 빠르지만 무엇이 저장되는지와 개별 수정이 약함.
- Hybrid: compact outline과 실제 결과를 연속 배치하고, 수정은 row 맥락에서 연다.

Hybrid를 선택한 이유는 FlowMe가 무거운 planner가 아니라 `원문/메모 -> 최소 개인화 -> 실행/가져가기` 계층이기 때문이다. 모바일은 한 줄기 reading order, 1024px은 최대 2개 major pane을 사용한다.

## 4. Route audit

### `/f/moving-d30-basic`

- 초기 모바일: 24개 중 5개와 `외 19개 전체 보기`.
- primary: Calendar 24개 actual-data preview.
- secondary: Checklist 24개.
- row `수정`: 제목·날짜·메모 1 depth.
- personal Flow title, anchor, fixed item date는 source를 변경하지 않고 저장.
- 1024/1440: outline과 result/setup의 최대 2-pane composition.

### `/f/curated-allblanc-morning-workout`

- 요일, 시간, duration, 종료 조건을 `SavedFlowRoutineDefinition`에 저장.
- `end: none | until | count`; 4주는 preview horizon일 뿐 암묵적 end가 아님.
- workout-only `강도 낮춤 / 휴식으로 변경` completion UI 0.
- 원문 영상/resource checkbox 0.

### `/my?demo=ux20&view=flows`

- 390: library list와 selected detail을 동시에 쌓지 않고 drill-in/back.
- 1024/1440: 18rem rail + one selected workspace.
- duplicate selected-Flow selector 0.
- 27개 fixture에서 search visible, horizontal overflow 0.
- 개인 structural reorder가 section regrouping으로 되돌아가지 않도록 non-contiguous group order를 보존한다.

### `/calendar?demo=ux12`

- 12개 Flow fixture에서 horizontal chip count 0.
- searchable multi-select, selected count, reset/apply, Escape focus return.
- selected Flow slug를 localStorage에 저장하고 stale slug는 item loss 없이 무시.
- ordinary task와 routine occurrence는 같은 execution row shell을 사용한다.

### Five shapes

- Flow execution: `/f/curated-allblanc-morning-workout`
- Calendar: `/f/moving-d30-basic`
- Checklist: `/f/used-car-buying-check`
- Sheet: `/f/source-backed-middle-school-math-1`
- Memo: `/f/overseas-safety-register`

각 화면은 실제 rows를 렌더하며 고정 5-tab gallery를 만들지 않는다. not-applicable destination은 focusable control로 남기지 않는다.

## 5. 상태와 데이터 경계

- Source: canonical item/title/detail/schedule/source URL을 보존한다.
- Personal overlay: Flow 개인 제목, item alias/date/memo/include/order를 저장한다.
- Routine definition: weekday/time/duration/end만 저장하고 occurrence 완료를 넣지 않는다.
- Execution run: completion/reopen/skip/hold를 유지한다.
- Projection: whole outline, artifact preview, My Flow, Calendar, export가 같은 effective identity를 읽는다.

P28은 additive field만 사용했고 기존 localStorage record를 읽는 fallback을 유지한다. slug별 새로운 completion state나 consumer별 임시 item identity를 만들지 않았다.

## 6. 검증 기록

| Gate | 결과 | Evidence kind |
| --- | --- | --- |
| `npm.cmd test` | 584/584 pass | current_command |
| `npm.cmd run build` | 18/18 routes pass | current_command |
| P28 Playwright | 7/7 pass | current_browser, automated_simulation |
| full Playwright, final | 346/346 pass with 2 workers | current_browser, automated_simulation |
| first full Playwright | 339/346; 3 stale selectors + 4 resource/navigation failures | current_command |
| failed 7 isolated replay | 7/7 pass with 1 worker | current_browser |
| screenshots | 19, 390/1024/1440 | current_package_screenshot |
| horizontal overflow | 0 in P28 matrix | current_browser |
| console/page errors | 0 in P28 matrix | current_browser |
| observed users | 0 | observed_user |

## 7. 독립 검토에서 반박할 항목

1. 모바일 save-before의 `outline -> artifact -> setup` 순서가 설명 없이 이해되는가?
2. 24개 Flow 기본 5개 disclosure가 충분한가, 아니면 단계별 summary가 먼저여야 하는가?
3. routine에서 빈도·시간·종료를 한 화면에 두는 것이 여전히 과한가?
4. My Flow에서 library rail의 card 정보량이 Flow를 다시 찾는 데 충분한가?
5. Calendar picker가 12개에서는 좋아도 50개에서 검색 의존적이지 않은가?
6. five-shape primary 추천이 실제 사용자 목적과 맞는가?

이 질문은 자동화로 답하지 않는다. 독립 디자인 review와 owner review에서 `keep / change / defer`로 판정한다.
