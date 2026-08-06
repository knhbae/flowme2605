# `내 Flow` 정보 구조 비교 Study

## 결론

비교 앱에서 가져올 핵심은 카드 모양이 아니라 데이터 관계입니다. `오늘 할 일`을 별도 저장소로 만들지 않고, 저장된 계획에서 날짜와 상태로 추린 파생 화면으로 둡니다. 편집은 어느 진입점에서도 같은 항목 editor를 사용하고, 외부로 옮길 때는 범위·목적지·동기화 여부를 분명히 알립니다.

## 공식 자료 비교

| 앱 | 공식 자료에서 볼 패턴 | FlowMe에 적용할 점 | 가져오지 않을 점 |
|---|---|---|---|
| Todoist | [Today](https://www.todoist.com/help/articles/plan-your-day-with-the-today-view-UVUXaiSs)는 여러 프로젝트에서 오늘 항목을 모으고 원본은 [Projects](https://www.todoist.com/help/articles/introduction-to-projects-TLTjNftLM)에 남음 | `지금 할 일`을 저장한 계획의 파생 실행 화면으로 구성 | 필터·정렬·보기 설정 전체를 MVP에 노출 |
| Things | [Today·Upcoming·Anytime·Someday](https://culturedcode.com/things/support/articles/4001304/)가 행동 가능 시점에 따라 정보를 다르게 노출 | 지금 가능한 것과 저장만 한 계획의 우선순위를 분리 | Area→Project→Heading→Todo 전체 계층 |
| Apple Reminders | [Smart List](https://support.apple.com/en-us/119953)가 여러 원본 목록의 항목을 자동 집계 | 오늘·진행 중·완료를 저장된 계획 위의 자동 보기로 구성 | 상단에 통계 카드 여러 개를 만들어 Flow Map 3칸 문제 재현 |
| Structured | [Timeline과 Inbox](https://help.structured.app/en/articles/338050)는 역할이 달라도 같은 Task Editor를 사용 | 공개와 `내 Flow`에서 동일한 항목 편집 문법 사용 | 날짜·시간·소요시간을 모든 Item에 강제 |
| Sunsama | [Daily Planning](https://help.sunsama.com/docs/usage-guides/daily-planning/)은 계획 선택→과부하 확인→확정→실행의 상태를 분리 | 미리보기→편집→저장→외부 전송의 상태와 경고 시점을 분명히 함 | 매일 수행하는 긴 의식형 wizard |
| Notion | [같은 데이터의 여러 보기](https://www.notion.com/help/views-filters-and-sorts)와 [별도 내보내기 제약](https://www.notion.com/help/export-your-content?slug=export-your-content) | 여러 결과를 같은 canonical 데이터의 투영으로 취급 | 사용자가 속성·필터·보기 설계를 직접 하는 power-user UI |

외부 도구로 옮기는 것은 공유와 자동 동기화와도 다릅니다. Todoist의 [calendar feed](https://www.todoist.com/help/articles/add-a-todoist-calendar-feed-pAk3tk)는 프로젝트 단위의 단방향 연결임을 구분합니다. FlowMe도 무엇을 어디로 몇 개 만들었는지, 이후 수정이 자동 반영되는지, 다시 보내야 하는지를 알려야 합니다.

## FlowMe용 구조 가설

```text
저장된 계획
├─ 지금 할 일: 여러 계획에서 오늘 실행할 Item을 모음
├─ 저장한 계획: 전체 계획 찾기·열기·보관
└─ 선택된 계획 상세
   ├─ 다음 할 일
   ├─ 전체 단계
   ├─ 수정
   └─ 내 도구로 옮기기
```

### `내 Flow` 첫 화면의 검토 순서

1. 오늘 해야 할 일
2. 이어서 할 계획
3. 날짜 없이 저장한 계획
4. 완료·보관은 필터나 별도 화면

이 순서는 확정안이 아닙니다. 저장 직후에는 방금 저장한 계획을 먼저 보여주고, 일반 재방문에는 오늘 할 일을 먼저 보여주는 문맥별 진입과 항상 동일한 기본 화면을 비교해야 합니다.

### 공개 상세 가설

- 계획 내용과 현재 결과
- 실제 지원되는 결과 형식 미리보기
- 하단 보조 `수정`
- 하단 주 행동 `내 계획에 저장`
- 저장 후 선택된 `내 Flow` 상세로 이동

`완료`는 실행 완료와 혼동되므로 저장 CTA 후보에서 제외하고 검토합니다. `더보기`도 기능을 말하지 않으므로 `결과 보기`, `다른 형식 보기`와 비교합니다.

### `내 Flow` 상세 가설

- 제목과 현재 상태
- 다음 할 일
- 전체 단계
- Item을 누르면 공통 Item 상세
- 하단 주 행동 `내 도구로 옮기기`
- 하단 보조 `수정`
- 관리 메뉴에는 보관·삭제·복구처럼 낮은 빈도의 lifecycle 행동만 배치

## 여러 형식 원칙

- 이사 계획: 캘린더·할 일·체크리스트·메모·시트가 모두 의미 있을 수 있음
- 순서형 학습 계획: 할 일·체크리스트·메모 중심, 날짜를 정하면 캘린더 가능
- 참고 자료 모음: 메모·시트 중심
- 반복 루틴: 캘린더·실행 체크 중심
- 날짜와 표 구조가 없는 Flow: 빈 캘린더·시트를 억지로 만들지 않음

지원하지 않는 형식을 회색 탭으로 늘어놓는 안과 완전히 숨기는 안 대신, 필요하면 `날짜를 정하면 캘린더로도 옮길 수 있어요`처럼 조건을 한 번 알려주는 안을 함께 비교합니다.

## 비교 앱을 평가할 때 묻지 않을 것

- 어느 앱의 카드가 더 예쁜가
- 탭 수를 그대로 몇 개 가져올 것인가
- 고급 필터와 프로젝트 계층을 얼마나 복사할 것인가

대신 다음을 묻습니다.

1. 원본 계획과 오늘 보기의 관계가 명확한가?
2. 같은 Item을 어디에서 열어도 같은 editor인가?
3. 저장·실행·내보내기 상태가 분리되는가?
4. 지원 불가 결과를 어떻게 설명하는가?
5. 경고가 실제 결정 시점에 나타나는가?
