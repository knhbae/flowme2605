# 현재 상태와 증거 지도

## 기준

- 앱 코드 기준: `b215698`
- 브랜치: `codex/p35-production-mobile-p0`
- 확인일: 2026-08-03
- 기본 캡처: 로컬 production build, 390×844
- 확인 성격: 내부 재현과 코드 확인. 실제 사용자 관찰 아님

## 가장 중요한 현재 사실

1. 공개 Flow 상세와 `내 Flow` 양쪽 모두 내보내기를 갖고 있습니다.
2. 공개 Flow 편집은 전체 높이 패널이지만 `내 Flow`의 Flow 편집은 기존 내용 아래로 펼쳐집니다.
3. 공개 화면은 내부적으로 여러 결과 모양을 지원하지만 한 종류만 보여줍니다.
4. 내보내기는 4종을 명시적으로 지원하고 Todo는 독립 대상으로 연결되지 않았습니다.
5. 저장 뒤에는 자동으로 `내 Flow`로 가지 않고 영수증에서 한 번 더 눌러야 합니다.
6. 활성 레거시 Flow Map에는 별도의 3칸 요약과 다른 편집기가 남아 있습니다.

## 활성 화면 지도

| 경로/상태 | 현재 역할 | 확인된 문제 | 증거 |
|---|---|---|---|
| `/flows` | Flow 목록과 상세 진입 | `더보기` 뒤 상세가 미리보기·편집·저장·내보내기를 모두 소유 | 이전 P35 보고서와 로컬 재현 |
| `/f/moving-d30-basic` | 저장 전 공개 상세 | 한 형식만 표시, Flow별 저장 CTA, 행별 수정, Flow 편집, 저장 전 내보내기 | [01](./screenshots/01-public-date-selected-duplicate.png), [02](./screenshots/02-public-flow-editor.png), [03](./screenshots/03-public-item-editor.png) |
| 날짜 입력 직후 | 기준일 적용 | 입력란 바로 아래 같은 날짜가 한 번 더 표시 | [01](./screenshots/01-public-date-selected-duplicate.png) |
| 공개 저장 직후 | 저장 영수증 | `내 Flow에서 이어하기`를 다시 눌러야 함 | [이전 보고서 after-04](../2026-08-03-p35-feedback-before-after/assets/after-04-receipt.png) |
| 공개 내보내기 | 저장 전 외부 결과 생성 | `내 Flow` 내보내기와 소유권 중복. 현재 범위에서 가능한 형식만 표시 | [13](./screenshots/13-public-export-panel-current.png) |
| `/my?view=flows&flow=...` | 선택된 저장 Flow 실행·관리 | 다음 할 일, 전체 계획, 편집, 내보내기가 한 화면에 겹침 | [04](./screenshots/04-my-flow-management-menu.png), [05](./screenshots/05-my-flow-editor-inline.png), [14](./screenshots/14-my-flow-export-panel-current.png) |
| `Flow 관리 → Flow 편집` | 저장된 Flow 수정 | 공개 editor와 달리 현재 내용 아래 인라인으로 일정 설정과 전체 계획이 펼쳐짐 | [05](./screenshots/05-my-flow-editor-inline.png) |
| Item 상세 | 완료·수정·메모·단일 내보내기 | 파란 표면, `실행할 일`, `할 일 수정`, 중첩된 기능 | [06](./screenshots/06-my-flow-item-detail-current.png) |
| `/my`의 `저장한 Flow` | 저장 라이브러리 | `지금 할 일`과 동등한 탭인지 상하 관계인지 불명확 | [07](./screenshots/07-my-flow-saved-library.png) |
| `/my`의 `지금 할 일` | 여러 Flow의 실행 Item 집계 | 저장된 원본 Flow의 파생 화면이라는 관계를 사용자에게 어떻게 보여줄지 미확정 | [08](./screenshots/08-my-flow-today-view.png) |
| `/flow-maps/middle-school-math-1` | 활성 레거시 Flow Map | `내 조건 / 저장 결과 / 전체` 3칸과 별도 편집 문법 | [09](./screenshots/09-flow-map-three-column-summary.png), [10](./screenshots/10-flow-map-adjustment.png) |
| `/f/vehicle-inspection-prep` | 체크리스트형 대표 Flow | 날짜형 Flow와 미리보기·CTA 모양 비교 필요 | [11](./screenshots/11-public-checklist-shape.png) |
| `/f/curated-allblanc-morning-workout` | 반복 루틴·안전 주의 대표 Flow | 중요한 운동 주의를 아이콘 뒤에 숨기면 안 되는 반례 | [12](./screenshots/12-public-routine-shape.png), [13](./screenshots/13-public-export-panel-current.png) |

## 현재 구현의 갈래

### 편집 surface

| 작업 | 현재 surface | 문제 |
|---|---|---|
| 공개 Flow 전체 편집 | `PublicFlowAdjustmentPanel` 전체 높이 dialog | 저장 후 editor와 다름 |
| 공개 Item 편집 | 별도 전체 높이 dialog | Flow 편집 내부와도 한 단계 더 분리됨 |
| 저장된 Flow 편집 | 개인 사본·기준일·일괄 조정 유형에 따라 현재 화면 아래 인라인 | 긴 Flow에서 보기와 편집 맥락이 섞임 |
| 저장된 Item 편집 | Item 상세 안의 또 다른 전체 화면 editor | 공통 필드·적용/취소 문법 확인 필요 |
| Flow Map 편집 | 별도의 legacy dialog | 일반 `/f/*`와 구조가 다름 |

### 결과 형식

| 구분 | 현재 상태 |
|---|---|
| 내부 미리보기 종류 | 캘린더, 체크리스트, 시트, 메모, Flow 실행 |
| 공개 상세 노출 | 콘텐츠마다 한 종류. 선택 UI 비활성 |
| 내보내기 종류 | 캘린더, 체크리스트, 시트, 메모 |
| Todo | 데이터 의미에는 있으나 독립 미리보기·내보내기 대상으로 연결되지 않음 |
| 날짜 없음 | 캘린더 불가 안내 후 가능한 형식만 표시 |

## 활성·조건부·비활성 구분

### 기본 경로에서 활성

- `/flows`
- `/f/*`
- `/my`의 `지금 할 일 / 저장한 Flow`
- 공개·`내 Flow` 내보내기
- 일반 Flow와 Flow Map의 서로 다른 편집기
- `/flow-maps/middle-school-math-1`

### 조건부로 살아 있음

- `/my?experiment=off`: 이전 Flow 중심 화면
- 저장 방식에 따른 개인 사본·기준일·일괄 편집기

### 기본 경로에서 비활성

- 공개 상세의 과거 별도 설정 섹션
- 공개 ArtifactWorkbench 내부 내보내기 토글. 현재 내보내기 패널은 상위 공개 상세가 소유

검토자는 비활성 코드를 현재 사용자 경험으로 착각하지 않아야 합니다.

## 관련 소스

- [AppClient.tsx](../../../components/flow/AppClient.tsx): 공개 상세, 저장, `내 Flow`, Item 상세, 내보내기 진입
- [PublicFlowAdjustmentPanel.tsx](../../../components/flow/PublicFlowAdjustmentPanel.tsx): 공개 Flow 편집
- [FlowExportPanel.tsx](../../../components/flow/FlowExportPanel.tsx): 내보내기 범위와 형식
- [FlowArtifactDataPreview.tsx](../../../components/flow/FlowArtifactDataPreview.tsx): 결과 모양 미리보기
- [FlowExecutionPrimitives.tsx](../../../components/flow/FlowExecutionPrimitives.tsx): 실행 관련 공통 요소
- [SourceBackedFlowMapPage.tsx](../../../components/flow/SourceBackedFlowMapPage.tsx): 레거시 Flow Map

## 캡처 전체 목록

| # | 파일 | 검토 목적 |
|---:|---|---|
| 01 | [시작일 중복](./screenshots/01-public-date-selected-duplicate.png) | 입력과 결과 피드백의 중복 |
| 02 | [공개 Flow 편집](./screenshots/02-public-flow-editor.png) | 전체 높이 editor와 현재/조정 후 요약 |
| 03 | [공개 Item 편집](./screenshots/03-public-item-editor.png) | Flow editor 내부 Item 거래 |
| 04 | [내 Flow 관리 메뉴](./screenshots/04-my-flow-management-menu.png) | 편집·원문·보관의 소유권 |
| 05 | [내 Flow 인라인 편집](./screenshots/05-my-flow-editor-inline.png) | 공개 editor와 다른 surface |
| 06 | [내 Flow Item 상세](./screenshots/06-my-flow-item-detail-current.png) | 파란 표면, 문구, 메모·전송 중첩 |
| 07 | [저장한 Flow](./screenshots/07-my-flow-saved-library.png) | 저장 라이브러리 IA |
| 08 | [지금 할 일](./screenshots/08-my-flow-today-view.png) | cross-Flow 실행 IA |
| 09 | [Flow Map 3칸](./screenshots/09-flow-map-three-column-summary.png) | 잔여 요약 구조 |
| 10 | [Flow Map 편집](./screenshots/10-flow-map-adjustment.png) | 일반 Flow와 다른 편집 문법 |
| 11 | [체크리스트형](./screenshots/11-public-checklist-shape.png) | 결과 모양과 CTA 다양성 |
| 12 | [반복 루틴형](./screenshots/12-public-routine-shape.png) | 반복과 안전 주의 |
| 13 | [공개 내보내기](./screenshots/13-public-export-panel-current.png) | 저장 전 내보내기와 지원 형식 |
| 14 | [내 Flow 내보내기](./screenshots/14-my-flow-export-panel-current.png) | 저장 후 내보내기와 소유권 중복 |

## 아직 증거가 부족한 부분

- 저장 Flow 5개·20개에서의 탐색 성능
- 개인 사본형 Flow의 편집 surface 전체
- 외부 내보내기 실패, 권한 거절, 부분 성공, 중복 생성, 재시도
- 편집 중 뒤로가기와 저장하지 않은 변경 복구
- 키보드·스크린리더에서 도움말/주의 dialog
- 실제 외부 캘린더·할 일·메모·시트 round-trip
- 처음 보는 사용자의 `Flow` 용어 이해

이 항목은 이번 Codex 시뮬레이션에서 가능한 범위까지 확인하되, 확인하지 못한 결과는 `TBD`로 남깁니다.
