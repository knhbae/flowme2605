# P27 피드백-원인-업무 매트릭스

## 판정 범례

- `supported`: 기능과 도달 경로가 명확하다.
- `hidden`: 기능은 있으나 발견하기 어렵다.
- `partial`: 일부 상태 또는 surface에서만 일관되게 동작한다.
- `missing`: 사용자 행동 또는 정책이 없다.
- `unsafe_partial`: 동작은 있으나 기록 손실이나 복구 실패 위험이 있다.
- `needs_contract`: UI 전에 소유권·상태 전이 계약이 필요하다.

| 사용자 피드백 | 현재 판정 | 근본 원인 | 채택할 방향 | 담당 slice |
| --- | --- | --- | --- | --- |
| 저장한 Flow 삭제와 rollback | unsafe_partial | `clearFlowLocalProgress` 중심 제거와 보관/삭제 의미 미분리 | 기본은 보관, 즉시 undo, 보관함 복구, 영구 삭제는 별도 데이터 관리 | P27-R01A/B |
| 저장한 Item 삭제와 rollback | partial / needs_contract | 개인 draft tombstone은 있으나 source-backed personal exclusion UI가 없음 | source는 보존하고 개인 사본에서 빼기, stable ID 복구 | P27-R01A/B |
| 홈트가 왜 4주인지 불명확 | partial / needs_contract | 콘텐츠 종료 조건과 bounded preview 범위가 같은 숫자로 표현됨 | `4주 프로그램`과 `앞으로 4주 미리보기`를 분리 | P27-R02A/B |
| 홈트 Calendar 글씨 밀림 | partial | 좁은 7열 grid에 제목·상태·회차 정보를 동시에 표시 | mobile은 주간 strip/agenda, wide는 compact grid + detail | P27-R02B, R06 |
| 홈트 저장 후 My Flow 복잡 | partial | series, occurrence, resource, memo, completion이 한 hierarchy에 노출 | series 정의와 다음 occurrence를 분리하고 현재 행동 하나를 우선 | P27-R02B, R04B |
| 저장한 Flow를 검색해 찾기 어려움 | hidden | 적은 Flow에도 inventory/search chrome이 먼저 노출 | 1~4개는 최근/진행 중 목록, 5개 이상 또는 명시적 행동에서 검색 | P27-R04A/B |
| 저장 전 조정이 개선되지 않음 | partial | 읽기, 구조, batch, export control이 동시에 노출 | 전체 Flow 읽기 우선, `조정` 진입 후 한 operation씩 | P27-R03A/B |
| 영상/URL이 확인 항목에 있어야 하는지 불명확 | needs_contract | resource와 binary subcheck 의미가 섞임 | `실행 자료`와 `확인 항목`을 별도 anatomy로 고정 | P27-R02A, R05 |
| 확인 항목 수정이 어려움 | missing / needs_contract | nested checklist personal overlay와 간단한 edit path가 부족 | 제목/추가/제거/순서만 contextual editor로 제공, source는 보존 | P27-R05 |
| My Flow가 무엇을 보여주려는지 불명확 | partial | 지금 실행, Flow 관리, 저장 receipt, 완료 후 행동이 서로 다른 문법 | `지금`과 `Flow` 역할 고정, full Flow detail grammar 공유 | P27-R04A/B, R07 |
| `/flows` 초기 HTML이 loading뿐 | confirmed_foundation_defect | client-only fallback | 최소 composer/catalog shell SSR + server-document smoke | P27-R00F |
| export 패널과 전체 목록 중복 | partial | scope plan을 보여주면서 content list를 다시 렌더 | 범위·수량·destination만 compact preflight로 표시 | P27-R07 |

## 반드시 구분할 상태 전이

### Flow 수준

`active -> archived -> restored`

- `archived`는 My Flow 기본 목록과 지금 실행에서 숨긴다.
- 실행 기록, 회고, personal overlay, export receipt는 보존한다.
- permanent delete는 archive와 다른 별도 행동이다.

### Item 수준

`included -> personally_excluded/tombstoned -> restored`

- source-backed Item 원본은 삭제하지 않는다.
- user-created Item도 stable personal ID를 유지한다.
- 완료 상태는 삭제 상태가 아니며 execution run에 남는다.

### 반복 수준

`series definition -> bounded visible occurrences -> occurrence execution`

- `4주 미리보기`는 series 종료가 아니다.
- `4주 프로그램`은 source 또는 사용자가 명시한 count/until 근거가 있어야 한다.
- 한 회차 완료/건너뜀/보류는 series 삭제가 아니다.

### 콘텐츠 anatomy

| 구성 | 사용자 질문 | 완료 상태 | 편집 소유권 |
| --- | --- | --- | --- |
| 할 일 | 지금 무엇을 실행할까? | execution run | source + personal override |
| 확인 항목 | 완료했다고 판단하려면 무엇을 확인할까? | item detail 내부 personal subcheck | source 보존 + personal nested overlay |
| 실행 자료 | 무엇을 열어보거나 참고할까? | 완료 상태 없음 | source resource + personal resource overlay |
| 메모 | 실행하면서 무엇을 남길까? | 완료 상태 없음 | personal note |

## 보류해야 할 가정

- `Flow 삭제`가 실제로 영구 삭제를 뜻하는지는 실제 사용자 관찰 전 확정하지 않는다. 기본 CTA는 `보관하기`로 검증한다.
- My Flow 검색 노출 임계값 `5개`는 prototype용 가설이다. 1/3/5/12 Flow fixture로 확인한다.
- nested confirmation item 편집이 모든 source-backed Flow에 필요한지는 콘텐츠 유형별로 확인한다.
- 홈트 4주가 실제 프로그램 종료인지 미리보기인지는 source metadata와 원문 근거를 Flow별로 판정한다.

## 실제 사용자에게 나중에 확인할 질문

1. `삭제`보다 `보관`이 기대에 맞는가, 아니면 즉시 영구 삭제를 찾는가?
2. 저장 직후 전체 Flow에서 가장 먼저 확인하는 것은 날짜, 항목 수, 자료, 첫 할 일 중 무엇인가?
3. 저장한 Flow가 3개, 10개, 30개일 때 찾는 방식이 어떻게 달라지는가?
4. 홈트에서 `앞으로 4주 미리보기`와 `4주 프로그램`을 구분해 이해하는가?
5. 영상 링크를 할 일 본문, 자료 영역, 확인 항목 중 어디에서 찾는가?
6. 확인 항목을 직접 수정할 빈도와 이유는 무엇인가?
