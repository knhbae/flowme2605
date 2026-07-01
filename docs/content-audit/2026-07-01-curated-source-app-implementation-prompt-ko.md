# 엄선 원컨텐츠 9개 앱 적용 구현 프롬프트

## 목표

FlowMe 앱 구현 세션은 아래 seed 파일을 읽고, 엄선 원컨텐츠 9개를 앱에서 노출/저장/실행/내보내기 할 수 있는 데이터로 연결한다. 이번 handoff 패키지는 앱 구현을 하지 않은 상태에서 만든 입력 자료다.

## 반드시 사용할 파일

- Seed JSON: [2026-07-01-curated-source-app-seed-v1.json](./2026-07-01-curated-source-app-seed-v1.json)
- 데이터 매핑 노트: [2026-07-01-curated-source-app-data-mapping-ko.md](./2026-07-01-curated-source-app-data-mapping-ko.md)
- QA 체크리스트: [2026-07-01-curated-source-app-qa-checklist-ko.md](./2026-07-01-curated-source-app-qa-checklist-ko.md)
- 원본 normalized 기준: [2026-07-01-curated-source-normalized-flow-draft-data-ko.json](./2026-07-01-curated-source-normalized-flow-draft-data-ko.json)

## 먼저 읽을 기준 문서

- [AGENTS.md](../../AGENTS.md)
- [agent.md](../../agent.md)
- [docs/harness/README.md](../harness/README.md)
- [Source-to-Flow Conversion Gate](../flow-rules/source-to-flow-conversion-gate.md)
- [Content Conversion Playbooks](../flow-rules/content-conversion-playbooks.md)
- [Flow Content Source Selection](../flow-rules/flow-content-source-selection.md)

## 구현 범위

- 앱 seed/registry 또는 source-backed map 구조에 9개 bundle을 연결한다.
- 콘텐츠 세부는 seed의 `contentBundles[].flows[].steps[]`를 기준으로 삼는다.
- `status`가 `source_import_required` 또는 `partial_draft`인 bundle은 사용자에게 준비 상태를 노출하되, 내부 검토 문구를 그대로 보여주지 않는다.
- 기존 public Flow, My Flow, export 동선과 맞는 가장 작은 변경으로 연결한다.

## 절대 하지 말 것

- seed에 없는 Step/Item을 새로 만들지 않는다.
- `memoHint` 같은 generic fallback 문구를 만들지 않는다.
- 먹은 양, 통증, 이상반응, 견적 상세, 운동 상태를 별도 Field로 분리하지 않는다.
- review, audit, 기획 설명을 사용자 화면에 노출하지 않는다.
- normalized 파일의 Step 순서를 임의로 재배열하지 않는다.
- Park/보류 상태를 억지로 “완성 콘텐츠”처럼 보이게 하지 않는다.

## UI 원칙

- 첫 화면은 9개 콘텐츠를 카드형 목록으로 보여준다.
- 카드에는 제목, 사용자용 상태, 권장 Flow, Flow/Step/Item 개수, source 링크만 간단히 둔다.
- Flow 상세에서는 Step을 접기/펼치기 가능한 세로 목록으로 표시한다.
- Item은 체크할 문장만 보이고, 수량/상태/source URL/주의사항은 memo/detail 영역에 둔다.
- 모바일에서는 JSON 원문을 그대로 보여주지 않는다. 카드, 스텝, 메모, 출처 링크로 나누어 읽게 한다.
- 사용자가 입력하는 값은 시작일, 종료/목표일, 반복 요일, 제목, 메모 수준으로 제한한다.

## Export 원칙

- Calendar: Step 기준 날짜/반복 + `itemTitle`을 일정 제목으로 쓴다. `memo`, `detail`, `sourceUrl`은 설명에 둔다.
- Checklist: Flow 아래 Step 섹션을 만들고 `items[].itemTitle`만 체크 항목으로 둔다.
- Sheet: bundle, flow, step, itemTitle, memo, sourceUrl, sourceTrace, status 열을 유지한다.
- Export 데이터에 내부 review 문구를 넣지 않는다.

## 적용 대상 요약

| # | bundleId | 제목 | 상태 | 권장 Flow | Flow/Step/Item |
|---:|---|---|---|---|---:|
| 1 | `funmom-study-routine-map` | 펀맘 공부 루틴 | 자료 보강 후 시작 | `funmom-hangul-2w` | 3/17/17 |
| 2 | `opic-plan-map` | 오픽 모의고사 계획 | 바로 시작 가능 | `opic-2w` | 2/19/19 |
| 3 | `baby-food-map` | 초기 이유식 식단표 | 바로 시작 가능 | `baby-150-start` | 5/21/21 |
| 4 | `reading-routine-map` | 독서 루틴 | 일부 보강 후 시작 | `reading-book-finish` | 2/5/5 |
| 5 | `new-car-map` | 신차 구매 | 바로 시작 가능 | `new-car-7-step` | 1/7/7 |
| 6 | `vaccination-map` | 영유아 예방접종 | 일부 보강 후 시작 | `vaccination-official` | 1/7/7 |
| 7 | `moving-map` | 이사 준비 | 바로 시작 가능 | `moving-dday` | 1/5/8 |
| 8 | `wedding-map` | 결혼 준비 | 바로 시작 가능 | `wedding-timeline` | 2/6/8 |
| 9 | `homefit-map` | Allblanc 홈트 루틴 | 일부 보강 후 시작 | `homefit-morning-2w` | 2/4/4 |

## 검증 기준

- seed JSON 파싱이 성공해야 한다.
- 9개 콘텐츠가 앱에서 누락 없이 보인다.
- 각 콘텐츠의 권장 Flow가 바로 열려야 한다.
- 모바일에서 Step/Item/memo/sourceUrl을 확대 없이 확인할 수 있어야 한다.
- source 링크가 외부 URL로 열려야 한다.
- `memoHint`, review 문구, 내부 기획 문구가 사용자 UI에 노출되지 않아야 한다.
- calendar/checklist/sheet export가 같은 seed에서 일관되게 생성되어야 한다.
