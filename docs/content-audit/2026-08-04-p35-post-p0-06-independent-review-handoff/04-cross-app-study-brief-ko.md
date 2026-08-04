# 비교 앱 study brief

> 확인일: 2026-08-04
> 자료 원칙: 공식 도움말·제품 문서만 사용
> 목적: 화면을 복사하지 않고 정보 관계와 상태 전이 원칙을 비교

## 핵심 결론

`내 Flow`를 `오늘 할 일`과 `저장한 Flow`라는 두 저장소로 나누기보다, 저장된 하나의 계획을 상황별로 보여주는 구조를 우선 검토한다.

```text
저장된 계획
├─ 오늘/지금: 날짜·실행 상태로 자동 추린 파생 화면
├─ 저장한 계획: 전체 계획을 회수·수정·보관하는 library
└─ 캘린더·할 일/체크리스트·시트·메모: 같은 계획의 목적지별 결과
```

이 관계가 먼저 성립하지 않으면 버튼·색상·popup을 정리해도 화면 간 예외가 다시 생긴다.

## 비교 대상

| 앱 | 공식 자료에서 확인할 패턴 | FlowMe에 적용할 질문 | 그대로 가져오지 않을 것 |
|---|---|---|---|
| Todoist | [Today](https://www.todoist.com/help/articles/plan-your-day-with-the-today-view-UVUXaiSs)는 여러 프로젝트 중 오늘 날짜가 있는 task를 모으고 날짜 없는 task는 원본 project에 남김 | Today는 저장 계획의 파생인가? 날짜 없는 Item의 집은 어디인가? | 고급 필터·정렬·보기 설정 전체 |
| Things | [Today·Upcoming·Anytime·Someday](https://culturedcode.com/things/support/articles/4001304/)는 행동 가능한 시점에 따라 같은 task의 노출 우선순위를 바꿈 | 지금 할 수 있는 것과 저장만 한 계획의 위계를 어떻게 나눌까? | Area→Project→Heading→Todo 전체 계층 |
| Apple Reminders | [List·Smart List·template](https://support.apple.com/en-us/119953)는 원본 list와 자동 집계·재사용 template을 구분 | 저장 계획·Today·재사용 copy를 같은 것으로 오인하지 않게 할 수 있는가? | 상단 통계 카드와 Smart List control의 과도한 노출 |
| Structured | [Task 생성·편집](https://help.structured.app/en/articles/338050)은 진입 위치가 달라도 같은 task editor를 사용 | 공개와 saved Item이 같은 editor family를 쓸 수 있는가? | 모든 Item에 시간·소요시간 강제 |
| Sunsama | [Daily Planning](https://help.sunsama.com/docs/usage-guides/daily-planning/)은 계획 선택·확정·실행 상태를 분리 | 미리보기·수정·저장·실행·옮기기의 경계를 어떻게 보일까? | 매일 수행하는 긴 wizard와 설명문 |
| Notion | [Database views](https://www.notion.com/help/views-filters-and-sorts)는 한 데이터의 여러 보기를 제공 | 여러 결과 형식이 canonical 계획의 projection인가? | 사용자가 속성·filter·view를 설계하는 power-user UI |

## 화면별 적용 질문

### 공개 계획 상세

- 사용자는 원본 결과를 읽는가, 자신의 저장본을 실행하는가?
- 자연스러운 주 결과 1개와 현재 가능한 보조 결과만 보이는가?
- `수정`은 session draft를 바꾸고 `내 계획에 저장`은 personal copy를 만드는지 알 수 있는가?
- 결과 미리보기와 실제 외부 결과 생성이 구분되는가?

### `내 계획` 첫 화면

- 오늘 항목이 0개면 빈 Today card 자체를 숨기는가?
- 저장 계획 1개면 search를 강제하지 않는가?
- 5개에서는 안정적인 목록, 20개에서는 최소 검색·상태 filter가 필요한가?
- 저장 직후에는 방금 저장한 계획을 선택하고, 일반 재방문에서도 library 위치는 고정되는가?

### 선택 계획 상세

- 다음 할 일과 전체 계획 중 무엇이 먼저 보이는가?
- 주 행동 `내 도구로 옮기기`, 보조 행동 `수정`의 역할이 명확한가?
- 완료·메모는 Item 상세가 소유하고 Flow 전체 행동과 중복되지 않는가?
- 보관·삭제·복구는 저빈도 관리 메뉴로 물러나는가?

### 여러 결과 형식

- 이사 계획: 캘린더·할 일/체크리스트·메모·시트가 모두 의미 있을 수 있음
- 날짜 없는 학습 계획: 할 일/체크리스트·메모 중심, 날짜를 정한 뒤 캘린더 가능
- 참고 자료 모음: 메모·시트 중심
- 반복 루틴: 캘린더·반복 실행 check 중심
- 지원하지 않는 형식을 빈 tab으로 보여주지 않고 필요한 조건이나 불가 이유를 알리는가?

## benchmark를 잘못 사용하는 경우

- 유명 앱의 카드 모양과 색을 그대로 복사함
- FlowMe MVP에 프로젝트 계층·협업·고급 필터를 추가함
- 캘린더·할 일 앱을 대체하는 무거운 workspace로 확장함
- Today를 별도 canonical 저장소로 만듦
- Notion처럼 사용자가 projection schema를 직접 설계하게 함
- 비교 앱이 한다는 이유만으로 실제 FlowMe 데이터·실패·rollback 검증 없이 적용함

비교 앱은 가설을 만드는 근거다. FlowMe의 결정은 canonical 데이터, export-first, local storage·rollback, 실제 content capability를 함께 통과해야 한다.
