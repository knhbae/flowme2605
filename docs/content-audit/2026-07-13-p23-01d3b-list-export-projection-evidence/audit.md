# P23-01D3B Audit

## Consumer Inventory

### 기존 항목별 export

My Flow 상세에는 항목 하나를 메모, 체크리스트, sheet 행, ICS로 가져가는 portable export가
이미 있었다. P23-01D2/D3A에서 개인 draft 항목은 effective title/date/memo와 stable Item
identity를 사용하도록 연결됐다. 이 경로는 유지했다.

### 이번 Flow 전체 list export

기존에는 개인 draft의 add/delete/restore/reorder 결과를 한 번에 내보낼 entry와 builder가
없었다. `buildPersonalStructuralListExportArtifacts`가 D1 projection result를 직접 받아
세 destination을 만든다.

| destination | projection input | 결과 |
|---|---|---|
| checklist | `rowsByDestination.checklist` | ordered checkbox text |
| sheet | `rowsByDestination.sheet` | effective Item당 TSV 한 행 |
| memo | `rowsByDestination.memo` | ordered readable memo |

consumer 안에서 structural 규칙을 다시 구현하지 않는다. 각 destination 입력을 stable ID로
한 번 더 dedupe해 malformed 입력이 중복 행을 만들지 못하게 하고 source 배열은 변경하지 않는다.

## Projection And Execution State

개인 draft의 `MySavedFlow`가 D1 structural projection result를 보유한다. projection을 만들 때
기존 저장 상태를 다음처럼 정규화한다.

- `excluded_on_start`: ephemeral structural selection exclusion으로 병합
- completion checks: `done` 또는 `pending`
- skipped item state: `skipped`
- reopened: membership 유지, unchecked 상태로 표현

이 병합은 저장된 source Item이나 structural overlay를 덮어쓰지 않는다. legacy exclusion을
새 projection consumer가 동일하게 읽기 위한 compatibility adapter다.

## Destination Policy

| 상태 | checklist | sheet | memo |
|---|---:|---:|---:|
| visible source Item | 포함 | 포함 | 포함 |
| unscheduled user Item | 포함 | 포함 | 포함 |
| scheduled user Item | 포함 | 포함 | 포함 |
| tombstoned Item | 제외 | 제외 | 제외 |
| restored Item | 재포함 | 재포함 | 재포함 |
| excluded Item | 제외 | 제외 | 제외 |
| title/date/memo override | 반영 | 반영 | 반영 |
| explicit date removal | 날짜 없음 | 빈 날짜 셀 | 날짜 줄 없음 |
| completed | checked/status 완료 | 완료 | 완료 |
| reopened | unchecked/status 미완료 | 미완료 | 미완료 |
| skipped | unchecked + 스킵 | 스킵 | 스킵 |

personal order는 세 destination 모두에서 유지된다. user-created sheet 행의 source cell은
`원문 없음`으로 표시하며, source Item만 Flow source reference를 행 단위로 가진다. checklist와 memo의
마지막 Flow 원문은 전체 Flow context이며 user-created Item의 provenance를 위조하지 않는다.

## My Flow Entry

개인 draft의 기존 structural control 영역 끝에 접힌 `이 Flow 가져가기`를 추가했다.

- 메모로 복사
- 체크리스트 복사
- 시트로 복사

완료 체크, `열기`, 수정, 삭제, reorder와 분리된 secondary action이다. effective Item이 0개면
버튼을 disabled 처리한다. source-backed Flow에서는 eligibility gate 때문에 entry가 0개다.

## Fixture And User Reachability

실제 UI 경로:

- URL-first miss draft 생성과 My Flow 저장
- source Item title/date/memo 수정
- user Item 추가
- 완료와 완료 취소
- user/source 혼합 reorder
- persistent recovery entry에서 restore
- 세 destination 복사
- reload persistence

fixture로 준비한 상태:

- source Item 하나 excluded
- source Item 하나 tombstoned
- deterministic mixed `orderOverride`

fixture 후의 exclude/tombstone 결과와 persistent restore는 실제 My Flow 화면과 export output으로
검증했다. user-created Item은 날짜를 지정하지 않아도 세 list destination에 도달한다.

## Error And Regression Guards

- destination row는 stable ID로 dedupe해 duplicate row를 0으로 유지한다.
- D1 resolver가 malformed/unknown order ID와 source/user collision에서 source를 보존한다.
- builder는 projection result만 읽고 source 배열이나 source Item을 수정하지 않는다.
- clipboard 실패는 기존 fallback copy helper를 사용하며 My Flow 상태를 변경하지 않는다.
- source-backed/public Flow는 기존 builder와 entry를 유지한다.
- Calendar/ICS는 P23-01D2/D3A 연결을 그대로 사용한다.

## Visual Inspection

390px에서는 세 export 버튼이 한 열로 쌓여 제목과 구조 조작 control을 침범하지 않았다.
1024px에서는 같은 entry가 3열로 정렬되고 ordered Item 목록 아래 secondary action으로 읽혔다.
두 viewport 모두 horizontal overflow는 0이다.

## Next Slice

P23-02는 user-created Item에서 날짜 없음, 날짜 지정, 날짜 제거, 선택 시간, 반복을 실제
사용자 경로로 편집하게 해야 한다. 같은 schedule value가 My Flow, Calendar, ICS와 이번
checklist/sheet/memo projection에 반영되는지 검증해야 한다.
