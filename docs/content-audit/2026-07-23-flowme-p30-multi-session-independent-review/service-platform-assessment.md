# FlowMe P30 서비스·플랫폼 평가

## 평가 전제

이 평가는 실제 사용자 관찰이 아니라 production interaction, browser automation, current source, fixture와 heuristic simulation에 기반한다. `observedUserCount=0`이다. 점수는 5점 척도이며 현재 구현 능력과 멀티세션 연속성을 함께 본다.

| 가치 축 | 점수 | 판정 | 근거 |
| --- | ---: | --- | --- |
| 가치 제안 명확성 | 3.0 | revise | artifact는 먼저 보이지만 날짜 방식, 조정, 결과 선택, export, 저장이 같은 여정에서 경쟁한다. 모바일 홈도 `/flows`의 축약판처럼 보여 시작/이어가기와 탐색 역할이 분리되지 않는다. |
| source 신뢰와 provenance | 4.0 | keep | source-backed Flow와 개인 수정 경계, source correction draft가 분리된다. 개인 초안의 private 표시는 약하다. |
| artifact 품질과 destination 적합성 | 4.0 | revise | Calendar, checklist, sheet, memo projection과 count는 일치했지만 날짜 precedence 결함으로 실제 ICS 신뢰가 깨졌다. |
| 개인화 자유도와 복잡도 균형 | 3.0 | revise | 조정 기능은 충분하지만 빠른 수정, 상세 수정, 실행 기록, 관리 기능의 노출 계층이 약하다. 조정 저장한 `/f` Flow의 post-save anchor 설정도 없다. |
| 실행·완료·복구 연속성 | 3.0 | revise | Item 완료/reopen, 날짜 배치 undo와 개인 항목 복구는 작동한다. 그러나 Flow-level 영구 삭제는 없고 모바일 보관 Flow 복구가 짧은 undo 이후 끊긴다. 날짜 없는 재사용도 막힌다. |
| My Flow·Calendar·export 정합성 | 3.0 | revise first | title/count/stable identity는 대체로 일치하지만 최신 날짜가 Calendar/ICS에서 무시되는 Blocking 결함이 있다. |
| 재방문·재사용 이유 | 3.5 | revise | 회고, source correction, 새 run, 과거 run은 제공된다. 현재 실행 수정과 새 실행의 경계가 일부 끊긴다. |
| creator/source correction loop | 3.0 | defer | 전송 전 correction draft는 분리되지만 실제 creator 전달은 구현되지 않았다. 현재 범위에서는 정직하게 표시된다. |
| 기본 화면 인지 부하 | 2.0 | revise first | 11/24 cell이 설명에 의존했고 지정 시나리오 interaction depth가 191회였다. 결혼·운동 저장 전과 My Flow의 실행·관리·회고·export가 공통 surface에 누적된다. |
| 접근성·responsive operability | 3.0 | revise | focus visibility, accessible name, sheet Escape/return, 320px reflow는 양호하다. save primary까지 Tab 16회이고 cancel focus return이 빠졌다. |
| 20~60개 Flow scale | 3.0 | evidence gap | fixture에서는 검색, scope, same-day identity, batch/undo가 작동했다. 실제 축적 데이터의 성능과 탐색성은 미검증이다. |

## 가장 약한 가치 사슬 3개

### 1. 콘텐츠 이해 -> 첫 행동 -> 실행

artifact 자체는 먼저 보이지만 사용자는 같은 여정에서 날짜 방식, 전체 구조, 조정, destination, export, 저장을 구분해야 한다. My Flow에서는 다음 행동과 함께 전체 계획, item 편집, 일괄 조정, 회고, source correction, 재사용, export, 관리가 누적된다. 24개 cell 중 11개가 설명 없이 이해되기 어려웠다는 점은 기능 지원과 직관성이 다르다는 증거다.

결정: P31-02~05를 coordinated simplification으로 다시 묶는다. 각 frame의 기본 질문과 primary action을 하나로 제한하고 고급 기능은 문맥별 disclosure로 이동한다.

### 2. 개인화 -> 실행 -> Calendar/export 날짜 신뢰

현재 가장 약한 사슬이다. 저장 전 item 날짜는 draft, 저장 후 item 날짜는 execution override에 저장되지만 resolver가 draft를 먼저 읽는다. 사용자의 최신 수정이 내부 실행과 외부 artifact에서 달라질 수 있어 FlowMe가 맡겠다고 한 portable execution 역할 자체를 훼손한다.

결정: P31-01에서 선행 수정한다. 시각 변경이나 설명 추가로 해결하지 않는다.

### 3. 발견 -> 저장 -> 실행 -> 재사용

`/flows`의 이사 검색 결과는 5-item map이며 검토 대상 `/f/moving-d30-basic`은 24-item Flow다. 둘 다 이사 준비 job으로 읽히지만 사용자는 variant 관계와 저장 범위를 알 수 없다. public 링크로 들어온 사용자와 내부 발견 사용자가 다른 object lifecycle을 시작한다.

또한 날짜 없는 차량 점검은 저장, 실행, Calendar tray까지 자연스럽지만 재사용에서 날짜가 필수가 된다. 발견 identity와 reuse mode를 각각 별도 기능처럼 추가하지 않고, 선택한 Flow와 현재 실행 mode가 lifecycle에서 유지되도록 P31-02와 P31-03에 통합한다.

## Surface별 판단

| Surface | Keep | Revise | Defer |
| --- | --- | --- | --- |
| `/` | 4탭 IA와 실제 product 진입 | 처음 방문은 실제 사용 사례, 재방문은 next action·최근 Flow. `/flows` 카드 반복 제거 | social feed, marketing 확장 |
| `/flows` | URL/memo entry와 lookup 상태 | canonical public/map 관계, external source link, 결과 한 줄과 natural artifact. 중복 `Flow 열기` 제거 | creator marketplace, 실제 계약 전 usage/review metric |
| public `/f` | artifact-first preview, 최소 anchor, 별도 receipt | content/state별 primary artifact 1개, 조정·secondary artifact·export 점진 노출, export 전 count/example/loss | full editor |
| My Flow | rail/canvas/inspector, next action, whole Flow, completion/reopen | 모바일 목록 인라인 확장 대신 dedicated Flow workspace. `실행·전체 계획·기록` 외 기능은 문맥별 접힘. 완료·일정·포함·보관·삭제의 동사를 분리하고 보관 행에 직접 복구 제공 | account/cloud sync |
| Calendar | selected-day agenda, undated tray, batch/undo | 일정 보기와 Flow scope·날짜 배치 mode 분리, mobile item bottom sheet, effective date precedence 반영 | 외부 Calendar OAuth |
| Export | whole/selected/current, count, loss preview | 현재 문맥에서 필요할 때 sheet로 진입, 최신 날짜 parity | duplicate import tracking |
| Routine | series 설정, next occurrences, occurrence completion/reopen | history는 evidence가 생길 때만 | workout tracker화 |
| Reflection | private reflection/source correction 분리 | 없음 | creator 전달 backend |

## 현재 visual hierarchy 판단

- 390px: artifact와 primary action은 첫 viewport에 있지만 관련 control과 설명을 순서대로 통과하는 비용이 높다. save primary까지 keyboard Tab 16회가 필요했다.
- 1024px: rail, canvas, inspector 역할은 분리되지만 한 workspace 안의 action 종류가 많다. composition이 정돈됐다는 사실이 interaction이 단순하다는 뜻은 아니다.
- 1440px: 넓은 공간을 활용하지만 결과, 조정, 관리 기능이 동시에 보일 때 사용자가 지금 해야 할 행동이 약해질 수 있다.
- 따라서 P31은 full visual reset이 아니지만 correctness correction만으로도 부족하다. 기존 component와 data boundary를 보존한 coordinated interaction simplification이 필요하다.

## 공식 reference pattern 비교

| 제품 | 확인한 공식 패턴 | FlowMe 결정 |
| --- | --- | --- |
| Todoist | Today는 여러 project의 오늘 일에 집중하고 날짜 없는 항목은 project/filter에서 찾는다. 모바일 navigation은 Today, Upcoming, Search/Browse를 분리한다. | Home은 실행 초점, Flow 찾기는 탐색으로 분리 |
| Apple Reminders | Today, Scheduled, All, Completed가 서로 다른 Smart List다. | `지금·Flow 목록·완료` 역할 유지, 한 화면에 모두 펼치지 않음 |
| Notion Home | 최근 페이지, shortcut, 일정, My Tasks를 모으고 Search/Library/Marketplace는 별도다. | Home을 재방문 continuity와 실제 사용 사례에 사용 |
| Notion Marketplace | 실제 추가 수, rating, review, 최근 업데이트를 template 신뢰 정보로 제공한다. | 실제 telemetry·review contract 전에는 usage/review 수 defer |
| Strava | feed card가 activity 종류에 맞는 통계와 한 가지 notable achievement를 선택한다. | Flow 카드에 모든 chip을 넣지 않고 결과를 구분하는 정보만 표시 |
| Nike Training Club | 단일 workout은 duration·sets/reps·실행 guidance를, program은 단계와 진도를 중심으로 보여준다. | 단일 운동과 다회 program의 surface/label을 구분 |
| Google Calendar | 모바일 event 상세는 별도 edit 문맥으로 확장하고 필요할 때 상세 필드를 연다. | Calendar item을 인라인 확장하지 않고 bottom sheet로 분리 |
| Apple Calendar | 월간 compact/stacked/detail view와 event detail/edit가 분리된다. | month 탐색과 item 편집의 interaction layer 분리 |
| Wanderlog | itinerary는 day별로 읽고 map, batch move, route는 문맥별 기능으로 제공된다. | 결혼·이사 같은 timeline Flow를 단계/날짜 그룹으로 읽게 함 |

Reference URLs와 적용·보류 판단은 `mobile-feedback-supplement.md`와 `mobile-feedback-evidence.json`에 기록했다. 외형이나 기능 목록을 복제하지 않고 Home 역할, card density, detail layer와 content-specific artifact 문법만 차용한다.

## 실제 사용자에게만 확인 가능한 질문

1. 저장 전 24개 중 제외할 항목을 찾는 비용이 허용 가능한가?
2. 저장 후 `현재 실행 조정`과 `새 실행으로 다시 쓰기`를 자연스럽게 구분하는가?
3. 날짜 없는 할 일을 의도된 상태로 이해하고 My Flow와 Calendar tray의 역할 차이를 받아들이는가?
4. export에서 format보다 whole, selected, current 범위를 먼저 선택하는 문법이 자연스러운가?
5. 개인 초안과 공개 Flow의 경계를 현재 copy만으로 확신하는가?
6. routine에서 과거 occurrence history를 FlowMe 안에서 다시 볼 필요가 있는가?
7. 실제 20~60개 Flow를 쓸 때 검색, scope, same-day agenda가 충분히 빠르고 이해 가능한가?
