# P22-05 외부 Calendar·시트·메모 왕복 감사

## 문제와 범위

기존 evidence는 다운로드 payload를 코드 안에서만 검사했습니다. 사용자가 파일을 받은 뒤 실제 도구에서 제목·날짜·메모가 유지되는지, 다시 생성하거나 다시 가져올 때 중복을 어떻게 다룰지는 확인되지 않았습니다.

이번 slice는 provider 연동이나 양방향 sync를 만들지 않았습니다. 대표 3개 Flow와 개인 수정 항목을 동일 export 코드로 생성해 실제 Office 앱과 독립 iCalendar parser에서 읽었습니다.

## 관찰 방법

### 시트

Microsoft Excel 16.0.20131.20112에서 `.xlsx`를 읽기 전용으로 열었습니다. `실행표`의 실제 행 수, 사용자 메모가 있는 행의 제목·날짜·메모를 fixture 기대값과 비교했습니다.

### 메모

Microsoft Word 16.0.20131.20112에서 UTF-8 `.txt`를 읽기 전용으로 열었습니다. 제목·사용자 메모와 깨진 `??:` label의 잔존 여부를 확인했습니다.

### 캘린더

`ical.js 2.2.1`로 대표 3개 multi-event ICS와 개인 1개 event ICS를 파싱했습니다. 이벤트 수, 제목, 날짜, 사용자 메모, UID 고유성, 줄 길이를 확인했습니다.

Outlook COM은 생성 fixture뿐 아니라 ASCII 최소 표준 fixture도 열지 못했습니다. 이 결과는 생성 파일만의 실패로 판정할 수 없으므로 `Outlook/MAPI 환경 blocked`로 분리했습니다. 기본 캘린더에는 쓰지 않았습니다.

## 수정한 결함

1. 메모 export 설명 label이 `??:`로 깨져 있었습니다. `설명:`으로 복구했습니다.
2. Flow-level ICS 설명에 영어 구조 label과 사용자 메모 누락이 있었습니다. 사용자어 label과 `내 메모`를 반영했습니다.
3. ICS 줄 접기가 JavaScript 글자 수 기준이어서 한글 줄이 75 octets를 넘을 수 있었습니다. UTF-8 byte 기준으로 바꿨습니다.
4. 내부 source metadata의 `sourceTrace`, `source-backed`, `Step`, `Item`이 export 설명으로 내려갈 수 있었습니다. 원본 metadata는 유지하고 사용자 projection에서만 제거·치환했습니다.
5. 개인 TSV header와 빈 제목 fallback에 `Step`이 보였습니다. 사용자 결과물에서는 `할 일`을 사용합니다.

## 결과

| 형식 | 실제/외부 도구 | 결과 | 제목 | 날짜 | 사용자 메모 |
| --- | --- | --- | --- | --- | --- |
| `.xlsx` | Microsoft Excel | 3/3 통과 | 3/3 | 3/3 | 3/3 |
| `.txt` | Microsoft Word | 3/3 통과 | 3/3 | 해당 문서에 포함 | 3/3 |
| `.ics` | ical.js parser | 3/3 + 개인 1/1 통과 | 통과 | 통과 | 통과 |
| `.ics` | Microsoft Outlook | blocked | 미확인 | 미확인 | 미확인 |

대표 3개 Flow의 재생성 결과는 calendar UID set, sheet projection, memo payload가 모두 안정적이었습니다. 생성 `.xlsx` binary 자체는 workbook timestamp 때문에 hash 교체 정책을 쓰지 않고 sheet projection을 비교했습니다.

## 중복 정책

- **캘린더:** 동일 Flow/item 재생성은 UID를 유지합니다. provider별 merge/dedupe는 보장하지 않습니다. 다시 가져올 때 이전 전용 Flow 캘린더를 지우거나 새 전용 캘린더에 가져옵니다.
- **시트:** 안정 item ID를 사용자 열로 노출하지 않습니다. 기존 파일에 append하지 않고 재생성 파일로 교체합니다.
- **메모:** export block ID를 삽입하지 않습니다. 같은 문서에 반복 paste하지 않고 기존 블록을 교체합니다.

## 실패 복구 문구

- 캘린더: `가져오기가 안 되면 캘린더 앱의 가져오기 메뉴에서 .ics 파일을 직접 선택하세요. 다시 가져올 때는 이전에 만든 Flow 캘린더를 먼저 지워 중복을 피하세요.`
- 시트: `파일이 열리지 않으면 다운로드한 .xlsx 파일을 Excel에서 직접 여세요. 다시 받았다면 이전 파일 대신 새 파일을 사용하세요.`
- 메모: `문서가 깨져 보이면 UTF-8로 다시 열고, 기존 내용에 덧붙이지 말고 새 내용으로 교체하세요.`

이번에는 위 문구를 서비스 화면에 상시 노출하지 않았습니다. 실제 provider별 실패가 확인되기 전에 설명 문구를 늘리지 않고 evidence 정책으로 먼저 고정했습니다.

## Acceptance 판정

| 기준 | 판정 | 근거 |
| --- | --- | --- |
| 대표 형식별 import 성공 | 부분 충족 | Excel·Word·독립 calendar parser 통과, 실제 Calendar 앱 미확인 |
| 날짜·제목·메모 fidelity | 충족 | 대표 3개 및 개인 항목 projection/actual-open 기록 |
| 중복 import 정책 | 정책 충족·실사용 미확인 | stable UID와 replace 정책 정의, provider duplicate 관찰은 남음 |
| 실패 복구 문구 | 충족 | 형식별 복구 문구 정의 |
| provider sync 비확장 | 충족 | API, 계정, 양방향 sync 추가 없음 |

## 남은 리스크와 다음 순서

P22-05를 완전히 닫기 전에 설정된 Google Calendar, Apple Calendar 또는 Outlook profile 하나에서 아래만 수동 확인하면 됩니다.

1. `artifacts/moving-d30/calendar.ics`를 새 전용 캘린더로 가져옵니다.
2. 이벤트 24개, 첫 날짜 2026-07-16, 제목과 `내 메모`를 확인합니다.
3. 같은 파일을 한 번 더 가져와 중복 동작을 기록합니다.
4. 전용 캘린더를 삭제해 원상 복구합니다.

이 한 건 외에는 P22-06 완료 Flow 재사용·버전 갱신 정책 spec으로 넘어갈 수 있습니다.

