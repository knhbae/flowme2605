# P26-04 감사 기록

## 시작 상태

P25에서 빈 miss 저장 차단, generic filler 제거, 저장 전 포함/제외와 제목 수정, stable suggestion ID의 기본선은 이미 구현돼 있었다. 현재 남은 오류는 쉼표 목록의 한 절만 action vocabulary에 없으면 전체 목록이 한 item으로 남는 점이었다.

대표 제주 입력은 주제 문장 하나와 행동 다섯 개를 담지만 기존 parser는 행동 목록을 하나의 긴 항목으로 유지했다. 또한 저장 전 화면은 결과 제목만 보여 원문 한 조각이 몇 항목으로 나뉘었는지 확인하기 어려웠고, 합치기·직접 나누기·순서 변경이 없었다.

## 구현 계약

### deterministic segmentation

1. newline, checkbox bullet, ordinal, 문장부호, arrow를 먼저 source fragment로 나눈다.
2. 쉼표/`그리고` 목록은 2개 절이면 모두 action-like일 때만, 3개 이상이면 60% 이상이 action-like일 때 나눈다.
3. `여권, 지갑, 우산 챙기기`처럼 마지막 절만 행동인 목적어 목록은 하나로 유지한다.
4. 짧은 날짜·행사 주제 뒤에 3개 이상 행동 목록이 오면 주제는 Flow 제목 맥락으로 유지하고 item으로 중복하지 않는다.
5. parser는 사용자 문구를 정규화할 뿐 새 행동이나 세부 정보를 만들지 않는다.

### identity와 소유권

- source fragment ID: 입력 kind, 원문 순서, 원문 text의 deterministic hash.
- suggestion ID: source fragment ID와 분리된 action text의 deterministic hash.
- manual split/merge ID: parent suggestion과 사용자 입력의 deterministic hash.
- 저장 item ID: 기존 personal draft prefix와 suggestion ID를 결합한다.
- 저장된 `FlowItemDetail`에는 `source_fragment_ids`와 `source_fragment_text`를 additive하게 보존한다.
- source 입력, personal review 결과, 저장된 execution item은 서로 덮어쓰지 않는다.

### 저장 전 UI

390px에서는 source fragment를 한 disclosure로 접고 결과 rows를 아래에 둔다. 1024px에서는 source를 왼쪽, 결과와 조정 control을 오른쪽에 둔다. 같은 fragment가 5개 결과를 만들더라도 원문을 5번 반복하지 않는다.

이 화면의 체크는 완료가 아니라 저장 포함 여부다. 위/아래는 결과 순서, `나누기`는 사용자 line break, `합치기`는 바로 앞 결과와의 결합이다. 저장 시 포함된 결과만 연속 `dayOffset`과 `order`를 받는다.

## 브라우저 시나리오

| 단계 | route | viewport | 결과 | evidenceKind |
| --- | --- | --- | --- | --- |
| 제주 메모 입력 | `/flows` | 390x844 | 5개 result, source group 1개 | `current_browser` |
| 원문/결과 비교 | `/flows` | 1024x768 | 2열, 원문 반복 0 | `current_browser` |
| 합치기 → 재분할 | `/flows` | 1024x768 | 5 → 4 → 5, fragment ownership 유지 | `current_browser` |
| keyboard reorder | `/flows` | 1024x768 | Enter로 한 칸 이동 | `current_browser` |
| 한 항목 제외·저장 | `/my?savedFlow=...` | 1024x768 | receipt 4개 | `current_browser` |
| reload·Flow 전체 export | `/my` | 390x844 | saved/reload/memo export 4개, 순서 일치 | `current_browser` |

## 오류 방어

- 빈 항목은 저장하지 않는다.
- 저장할 item이 0개면 기존 save guard가 차단한다.
- manual split은 2줄 이상, 전체 12개 이하로 제한한다.
- 동일 title은 parser 단계에서 중복 제안하지 않는다.
- source fragment ID와 item ID를 사용자 화면/export에 노출하지 않는다.
- legacy candidate와 sparse memo에는 generic 최소 개수를 채우지 않는다.

## 시각 참고 반영

`2026-07-19-flow-content-usage-preview-ko.html`의 compact source identity와 destination count 원칙을 참고했다. 긴 intro나 audit 설명을 복제하지 않고, 원문 fragment 하나와 실제 저장 결과만 가까이 배치했다.

## 잔여 위험

1. 언어별 parser가 아니라 한국어 중심 bounded heuristic이다.
2. source fragment의 reorder/merge migration은 P26-05 identity gate에서 malformed·legacy fixture를 더 확장해야 한다.
3. 실제 사용자의 발견성과 copy 이해도는 자동화로 증명하지 않는다.

