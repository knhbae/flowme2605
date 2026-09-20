# P3-G 실제 기기 검사 프로토콜

## 사전 기록

- 검사자:
- 실행 시각:
- build fingerprint 또는 파일 SHA-256:
- 기기 모델:
- OS와 버전:
- browser와 버전:
- 실제 Chrome/Safari 주소와 user agent:
- 보조기술과 설정:
- 글자 크기·화면 확대 설정:
- 실제 기기 여부: 예/아니오

`실제 기기 여부: 아니오`인 결과는 E5-D로 승격하지 않는다. 메신저·파일 앱의
미리보기나 내장 webview도 Android Chrome·iOS Safari 실행으로 세지 않는다. 실제
Chrome/Safari의 주소, user agent, browser version과 검사한 artifact SHA를 함께 남긴다.

## Android Chrome

| ID | 과업 | PASS 기준 |
|---|---|---|
| A1 | 350ms long-press 활성화 전에 손가락을 8px 이상 옮긴다 | 이동 창이 열리지 않고 저장 0 |
| A2 | 항목을 길게 눌러 날짜 목적지를 고른다 | OS native context menu 없이 FlowMe 이동 창만 열리고 한 번 저장 |
| A3 | 활성 drag를 가장자리 scroll 중단·앱 전환 등으로 끊는다 | 취소 상태가 표시되고 이동 창이 닫히며 저장 0. 가능하면 remote event ledger에 `pointercancel` 기록 |
| A4 | `…` 메뉴로 폴더를, keyboard 비드래그 경로로 순서를 옮긴다 | 날짜·폴더·순서가 모두 같은 transition 결과와 저장 횟수를 가짐 |
| A5 | 작성 owner `+`를 열어 키보드를 표시하고 내부 scroll로 마지막 메뉴 행까지 간 뒤 닫고 다시 열어 적용한다 | 닫으면 opener focus 복귀·저장 0, 적용하면 정확히 한 번만 반영 |
| A6 | 마지막 입력과 저장 CTA에 접근하고 키보드를 닫은 뒤 reload한다 | caret·CTA가 visual viewport 안에 있고 마지막 성공 상태만 복원, 운영 데이터 불변 |

## iOS Safari

| ID | 과업 | PASS 기준 |
|---|---|---|
| I1 | 위·아래 safe area가 있는 상태로 개인공간을 연다 | 상단/하단 행동이 notch·home indicator에 가리지 않음 |
| I2 | 항목을 길게 눌러 날짜 목적지를 고른다 | Safari native context menu·scroll conflict 없이 FlowMe 이동 창만 열리고 한 번 저장 |
| I3 | 활성 drag를 화면 밖 이동·앱 전환 등으로 끊는다 | 취소 상태가 표시되고 저장 0. 가능하면 remote event ledger에 `pointercancel` 기록 |
| I4 | `…` 메뉴로 폴더를, keyboard 비드래그 경로로 순서를 옮긴다 | 날짜·폴더·순서가 같은 transition 결과와 저장 횟수를 가짐 |
| I5 | 작성 owner `+`를 열어 키보드를 표시하고 내부 scroll로 마지막 메뉴 행까지 간 뒤 닫고 다시 열어 적용한다 | 닫으면 opener focus 복귀·저장 0, 적용하면 정확히 한 번만 반영 |
| I6 | 마지막 입력과 저장 CTA에 접근하고 키보드를 닫은 뒤 reload한다 | caret·CTA가 visual viewport 안에 있고 마지막 성공 상태만 복원, 운영 데이터 불변 |

## TalkBack·VoiceOver·확대

| ID | 과업 | PASS 기준 |
|---|---|---|
| X1 | landmark와 heading 순서로 개인공간과 작성 화면을 탐색한다 | 중복 shell 없이 현재 화면과 원문 편집기를 식별 |
| X2 | 폴더·오늘·주간·월간·날짜 미정과 작성 Input/Result를 이동한다 | 이름·역할·선택/현재 단계 상태가 전달됨 |
| X3 | 항목 이동 창과 작성 helper/menu를 열고 취소한다 | focus가 열린 표면 안으로 이동하고 닫은 뒤 정확한 opener로 복귀 |
| X4 | Tab·Shift+Tab·Enter/Space·Escape로 날짜·폴더·순서와 작성 helper를 조작한다 | trap 없이 다음 영역으로 나가며 pointer와 같은 결과, 같은 위치는 저장 0 |
| X5 | OS 최대 글자와 실제 browser 200%로 원문·마지막 field·CTA를 탐색한다 | 가로 넘침 없이 caret·마지막 field·CTA 접근 가능 |
| X6 | reduced motion을 켜고 개인공간·작성 전체 과업을 반복한다 | 애니메이션 없이 상태 변화·저장·완료 피드백 인지 가능 |
| X7 | 같은 build에서 개인공간 이동·완료/재열기·작성 helper 닫기/적용을 5회 반복하며 30분 연속 사용한다 | focus trap·ghost overlay·중복 저장·가린 행동·복구 불가 오류 0 |

X7의 `30분·5회`는 P3-G 기술 안정성 검사용 임시 기준이다. 장기 사용자 효용이나
피로도를 검증하는 제품 정책이 아니며, 관찰 사용자 검증으로 세지 않는다.

## 실패 기록

FAIL이면 요구사항 ID, 직전 상태, 정확한 조작 순서, 기대/실제 결과, 저장 호출 수,
스크린샷 또는 화면 녹화 경로를 남긴다. 기기·browser 버전이 없는 결과는 판정
근거로 사용하지 않는다.
