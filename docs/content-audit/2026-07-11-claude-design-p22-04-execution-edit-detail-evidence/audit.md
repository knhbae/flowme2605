# P22-04 My Flow/Calendar 실행 모드와 편집 상세 분리 감사

## 결론

P22-04는 **기본 상세를 실행에, 명시적 상태를 편집에** 배정하는 방식으로 닫았습니다. 사용자는 행에서 할 일 제목과 Flow 맥락을 읽고, 상세에서는 완료 체크와 바로 할 내용을 확인합니다. 제목·날짜·메모 수정과 원문·내보내기는 필요할 때 펼치는 보조 경로입니다.

## 원인 판단

기존 inline 상세는 모바일과 wide의 정책이 달랐습니다.

- 모바일은 `메모·일정`, `원문·내 도구`가 접혀 있었습니다.
- wide는 같은 메모·일정, 원문 링크, 내보내기 버튼, 수정 버튼이 기본으로 노출됐습니다.
- 바깥 행에 있는 제목과 Flow 맥락을 wide 상세에서 다시 반복했습니다.
- 편집 중에도 완료 체크와 실행 체크리스트가 남아 실행과 수정의 책임이 섞였습니다.
- 저장 버튼이 입력 필드 위에 나타나 긴 모바일 편집 뒤 다시 위로 올라가야 했습니다.

데이터 모델 문제가 아니라 한 컴포넌트 안의 viewport별 표시 정책과 상태 위계 문제였습니다.

## 적용한 경계

### 실행 상태

- 바깥 행: 할 일 제목, Flow/date 맥락, `열기`, 행 완료 체크
- 열린 상세: 상세 완료 체크, `닫기`, 바로 할 일, 하위 확인 항목
- 접힌 보조 영역: `메모·일정`, `원문·내 도구`
- 직접 primary action: 최대 2개

### 편집 상태

- 입력: 제목, 해당 할 일 날짜, 시간, 장소, 반복, 메모 및 기존 item-type 전용 필드
- 행동: `수정 취소`, `변경 저장`
- 숨김: 완료 체크, 하위 실행 체크리스트, 원문·내보내기
- 저장 위치: 입력 필드 끝
- 저장 상태: 변경 전 disabled, 변경 후 enabled

### 유지한 것

- 완료 체크와 하위 확인 항목의 별도 저장
- source-backed 원본과 personal overlay 경계
- 날짜 override, Calendar marker/agenda 반영
- 메모/체크리스트/시트/캘린더 export payload
- Calendar Flow group, row 완료 체크, accessible name
- 4탭 IA, public `/f`, Studio 보조 표면 정책

## 화면별 판정

| surface | viewport | 실행 상태 | 편집 상태 |
|---|---:|---|---|
| My Flow | 390 | 행 제목 1회, 완료+닫기, 도구 접힘 | 제목·일정·메모 입력, 취소+저장 |
| My Flow | 1024 | 중복 제목/메타 제거, 완료+닫기 | 동일한 명시적 편집 상태 |
| Calendar | 390 | Flow group/행 제목 유지, 상세는 실행만 | 행 안에서 해당 할 일만 편집 |
| Calendar | 1024 | group/agenda 위계 유지, 도구 접힘 | 동일한 편집 필드와 저장 흐름 |

## Evidence 판정

`route-evidence.json` 기준:

- `defaultPrimaryActionMax: 2`
- `executeVisibleTitleInputCount: 0`
- `executeVisibleDirectEditEntryCount: 0`
- `executeVisibleSourceToolCount: 0`
- `editVisibleCompletionCount: 0`
- `editCancelVisibleScenarioCount: 4`
- `editSaveVisibleScenarioCount: 4`
- `editSaveDisabledBeforeChangeScenarioCount: 4`
- `editSaveEnabledAfterChangeScenarioCount: 4`
- `calendarGroupCompletionPreserved: true`
- `horizontalOverflowCount: 0`

## 회귀 검증

- URL-first personal copy 저장과 항목 overlay 수정 유지
- Calendar 날짜 이동과 routine occurrence 수정 유지
- 원문 링크, 하위 체크리스트, 사용자 메모 복원 유지
- portable memo/checklist/sheet/calendar export 유지
- URL-first visible Markdown 0 및 candidate copy guardrail 유지
- public `/f` 저장 전 preview와 저장 후 completion 경계 유지

## 남은 위험

1. 편집 필드 수가 많은 routine/Calendar 항목은 여전히 세로로 깁니다. 이번에는 상태 혼재만 해소했고 필드 자체를 삭제하지 않았습니다.
2. `메모·일정` 안에 수정 입구를 둔 정책은 기본 실행 집중에는 유리하지만, 처음 수정하려는 사용자의 발견성을 실제 관찰해야 합니다.
3. source/export는 접근 가능하지만 기본 접힘입니다. 반복 사용자가 export를 매번 쓰는 경우 Flow-level export와 item-level 도구의 역할을 다시 검토할 수 있습니다.

## 다음 권장 slice

다음은 새 UI 확장보다 P22-05의 **실제 Calendar·시트·메모 import 결과 검증**이 우선입니다. 화면 구조를 더 손보기 전에 현재 export가 외부 도구에서 제목·날짜·메모·중복 정책을 얼마나 정확히 보존하는지 확인해야 합니다.

