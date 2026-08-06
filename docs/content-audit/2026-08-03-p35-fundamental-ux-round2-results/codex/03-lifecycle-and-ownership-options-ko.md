# Lifecycle & Ownership Options

## 결론

저장과 내보내기는 한 화면으로 몰아야 하는 문제가 아니라 **어느 상태의 결과를 누가 소유하는지** 정해야 하는 문제입니다.

권고는 capability 조건부 C입니다.

- 공개 상세: My Flow 정본은 아니지만 브라우저 localStorage에 남는 **현재 조정본**을 단방향으로 복사/다운로드하는 보조 행동
- `내 Flow`: 저장된 개인 계획의 **최신 정본**을 편집·완료·재내보내기하는 기본 위치
- **목표 규칙:** 버전 식별, 재시도 이력, 외부 권한 연결, 다시 보내기가 필요한 기능은 저장 후에만 제공

현재 구현은 이 목표에 아직 도달하지 않았습니다. 공개 조정값은 localStorage에 재로드되고 공개 text/ICS도 메모·일정 metadata 일부를 내보낼 수 있으며, 저장 export 역시 포맷에 따라 실행 완료·subcheck·detail을 잃습니다. 아래 표는 `현재 관찰`과 `권고 계약`을 구분해 읽어야 합니다.

## 1. 목표 상태 모델

| 상태 | 사용자에게 보여야 할 사실 | 허용 행동 |
|---|---|---|
| public example | 예시이며 저장되지 않음 | 결과 이해, 기준일 입력, 편집 시작 |
| public working draft | 현재 브라우저에서 조정한 결과 | Apply/Cancel, 가능한 형식 preview, 단방향 export |
| save committed | 무엇을 몇 개 저장했는지 | 영수증, 방금 저장한 계획 열기 |
| saved personal plan | 개인 제목·날짜·메모·포함·순서가 저장됨 | 편집, 전체/부분 export, 보관 |
| execution state | Item 완료·occurrence·기록 | 완료/다시 열기, Today/Calendar 파생 |
| exported copy | 특정 snapshot을 외부 도구에 복사 | 결과 영수증, 같은 버전 재시도 또는 최신 버전 다시 보내기 |

한 상태의 CTA를 다른 상태의 단어로 부르면 안 됩니다.

- public Apply ≠ 저장
- 계획 저장 ≠ 실행 완료
- 외부 복사 ≠ 자동 동기화
- receipt 확인 ≠ 편집 완료

## 2. 내보내기 소유권 A/B/C

| 안 | 규칙 | 장점 | 비용·반례 |
|---|---|---|---|
| A `내 Flow` 전용 | 무조건 저장한 뒤 export | 정본·재시도·영수증 소유권이 단순 | 날짜 없는 단순 checklist도 내부 저장을 강제. export-first 원칙과 충돌하고 이탈 가능 |
| B 공개+저장 후 | 두 화면 모두 같은 수준의 export | 저장 전 빠른 사용, 저장 후 재사용 | 어느 버전을 보내는지 모호. generator와 receipt가 중복되고 semantic drift 발생 |
| C capability 조건부 | 공개는 브라우저 local working overlay의 단방향 결과, 저장 후는 개인 정본 기반 export | 빠른 사용과 개인 정본을 모두 보존 | 형식·권한·손실 기준을 명확히 정의해야 함 |

### 권고 C의 구체 규칙

#### 공개 상세가 소유하는 목표 범위

- current working snapshot의 clipboard copy 또는 file download
- 외부 계정 연결이 없는 동작
- 실행 상태·완료 이력·개인 장기 메모를 요구하지 않는 동작
- 실패하면 같은 화면에서 단순 재시도
- label: `현재 조정본을 체크리스트로 복사`, `날짜 있는 24개를 캘린더 파일로 받기`

이 범위는 일반 `/f/*` 공개 상세에 대한 권고입니다. 현재 공개 Flow Map은 map-level export가 없고 child Flow 진입 후에만 export할 수 있습니다.

#### `내 Flow`가 소유하는 목표 범위

- 저장된 최신 personal/execution snapshot 중 선택한 포맷이 보존한다고 명시한 필드
- 전체/직접 선택 scope
- 완료 상태·메모·날짜·subcheck 등 개인 상태가 필요한 export
- 외부 권한, 부분 성공, 중복 생성, 다시 보내기, 재시도
- 과거 export와 현재 수정본을 구분하는 receipt
- label: `저장한 계획 24개 옮기기`, `선택한 7개 다시 보내기`

현재 saved export를 곧바로 완전한 authoritative artifact라고 부를 수는 없습니다. ICS는 execution completion을 잃고 list 계열은 subcheck·resource·detail 일부를 입력 단계에서 제외합니다. 따라서 `내 Flow`는 **소유 위치**가 되어야 하지만, 정본성은 포맷별 보존/손실 계약을 통과한 뒤에만 주장합니다.

#### 저장을 요구하는 capability

- 외부 계정 OAuth 연결
- 자동 동기화 또는 refresh
- 실패 queue·부분 성공·중복 방지
- export history
- 완료 상태 또는 occurrence export
- 동일 계획의 반복 export

## 3. 저장 영수증

현재 영수증은 저장 완료를 한 문장과 한 primary CTA로 표시합니다.

```text
내 Flow에 저장됨
캘린더 24개를 저장했어요
이사 D-30 준비 · 8월 2일 - 9월 2일
[내 Flow에서 이어하기]
```

다만 같은 public URL로 돌아오면 영수증만 계속 보이고 public detail로 돌아가는 길이 없습니다. 아래처럼 상태와 의도를 나눕니다.

| 재진입 의도 | 기본 결과 |
|---|---|
| 방금 저장 | 영수증→선택 Flow 상세 |
| 같은 공유 링크 재방문 | `저장한 개인본 보기`와 `원본 미리보기 보기`를 구분 |
| 이미 저장한 상태에서 새 조정 | 기존 개인본 덮어쓰기/사본 만들기 선택 전까지 저장 금지 |

중복 저장을 막기 위해 public detail 자체를 없애기보다, 원본과 개인본의 관계를 설명해야 합니다.

## 4. 목표 export 영수증 contract

현재 receipt가 확인하는 것은 scope, destination, count, filename, stable identity입니다. exact source/personal/execution version, export history, `같은 버전 재시도`는 아직 없습니다. 아래는 현행 필드 목록이 아니라 목표 계약입니다.

| 필드 | 예시 |
|---|---|
| source state | 저장 전 조정본 / 저장한 개인본 |
| snapshot | personal v3 · execution v8 또는 derived hash |
| scope | Flow 전체 24개 / 직접 선택 7개 |
| format | calendar / checklist / memo / sheet |
| destination | 파일 다운로드 / clipboard / Google Calendar 등 |
| result | 성공 22, 제외 2, 실패 0 |
| omitted | 날짜 없는 2개, 완료 상태 미지원 등 |
| sync | 단방향 복사, 자동 동기화 아님 |
| next action | 결과 열기 / 실패한 2개 다시 시도 / 최신본 다시 보내기 |

현재 error receipt는 다시 시도하라는 문장만 있고 전용 retry action·backoff·상세 원인이 없습니다. pending lock과 예외 후 재활성화는 있어 같은 버튼을 다시 누를 수 있습니다.

## 5. 실패·취소·중복 상태

| 상태 | 필수 동작 |
|---|---|
| 권한 거절 | 저장 상태 유지, 외부에는 0개 생성, 권한 다시 연결 CTA |
| 부분 성공 | 성공/실패 Item ID와 개수 분리, 실패한 것만 재시도 |
| 중복 생성 위험 | 같은 snapshot+destination이면 경고 또는 idempotency key |
| 최신 개인본과 과거 export 다름 | `같은 버전 재시도`와 `최신본 다시 보내기` 분리 |
| 사용자가 취소 | export history에 실패로 기록하지 않고 pending만 해제 |
| 날짜 없는 Item | calendar 제외 수와 다른 가능한 형식 제시 |
| routine 축약 | recurring event 1개로 줄어드는 필드를 전송 전 명시 |

## 6. 생명주기 CTA 사전

| 역할 | 권장 CTA | 쓰지 말아야 할 말 |
|---|---|---|
| working draft 적용 | `이 내용으로 적용` | 저장, 완료 |
| 개인 계획 저장 | `캘린더 24개로 시작`, `계획 저장` | 완료 |
| 저장 영수증 | `방금 저장한 계획 열기` | 계속, 다음 |
| saved edit | `변경 저장` | 적용 완료 |
| 실행 상태 | `완료`, `다시 열기` | 저장 |
| export | `캘린더 파일 받기`, `체크리스트 복사` | 완료 |
| destructive | `보관`, `영구 삭제` | 제거 |

## 7. 승인 기준

다음이 모두 통과해야 C안을 `O`로 판정합니다.

- 같은 Item fixture로 public working snapshot과 saved persisted snapshot의 차이를 설명할 수 있음
- 영수증에 버전, 범위, 형식, 개수, 손실, 단방향 여부가 보임
- 권한 거절·부분 성공·중복·재시도에서 내부 저장 상태가 손실되지 않음
- public export를 쓰지 않아도 save-first 경로에 불필요한 우회가 없고, 반대로 단순 copy에 저장을 강제하지 않음
- 사용자 5명이 `어느 버전을 어디로 보냈는지`를 영수증만 보고 설명할 수 있음
