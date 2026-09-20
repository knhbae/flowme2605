# FlowMe 통합 PoC 빠른 할 일→Flow 연결 v1 Spec

**작성일:** 2026-09-05  
**상태:** 구현·자동 E4 검증 완료  
**요구사항:** `BP-017`  
**적용 범위:** exact-query 격리 PoC

## 1. 결정 배경

빠른 할 일은 당장 실행할 한 줄을 빠르게 기록하는 항목이고, Flow는 여러 실행 정보를
묶어 계속 관리하는 단위다. 지금까지 통합 PoC에는 QuickItem을 Flow로 정리하는 연결이
없어 두 경험 사이가 끊겨 있었다.

기존 [단계 5 계약](../2026-09-02-flowme-integrated-poc-gap-closure-v1/stage-5-contract.md)은
새 Flow identity, 원본 QuickItem 존치, receipt, Undo 계약이 정해지기 전까지 이 기능을
보류했다. 2026-09-05 사용자 지시에 따라 남은 gap을 계속 해소하기로 했고, 이번 작업에서
아래 계약을 **PoC v1 임시 결정**으로 승인해 `BP-017` 구현을 열었다.

이 결정은 단계 5 전체를 다시 여는 결정이 아니다. recurrence, 공개 후보·immutable
version, table/source 양방향 update는 계속 보류한다. 또한 운영 제품 정책, 운영 schema,
migration 또는 배포 승인이 아니다.

## 2. 목표

사용자가 기존 QuickItem을 잃지 않고 새 one-Item Flow로 정리할 수 있게 한다. 전환은
한 번에 성공하거나 아무것도 바뀌지 않아야 하며, 성공 뒤 Undo와 reload 복구가 가능해야
한다. 모든 쓰기는 PoC 전용 shadow state에만 남고 기존 운영 `flow:*` 데이터는 바뀌지
않아야 한다.

## 3. PoC v1 임시 계약

| 항목 | 계약 |
| --- | --- |
| 원본 QuickItem | 삭제·변형하지 않고 그대로 보존한다. |
| 새 Flow | 사용자가 확인한 Flow 제목으로 authored Flow 하나를 만든다. |
| 새 Item | 원본 QuickItem 제목을 가진 Item 하나만 생성한다. |
| 폴더 | 전환 시점의 QuickItem 폴더를 새 Flow에 복사한다. |
| 실행 날짜 | 전환 시점의 QuickItem 실행 날짜를 새 Item의 개인 실행 위치로 복사한다. |
| 메모 | 전환 시점의 QuickItem 개인 메모를 새 Item의 개인 메모로 복사한다. |
| 완료 | 복사하지 않는다. 원본이 완료 상태여도 새 Item은 열린 상태로 시작한다. |
| receipt | 원본 snapshot과 새 Flow·Item ref, 전환 시각, 계약 버전을 기록한다. |
| 재실행 | 같은 원본의 성공 receipt가 있으면 새 Flow를 중복 생성하지 않고 기존 결과를 연다. |
| 실패 | state와 storage를 모두 원래 bytes로 유지하고 재시도 경로를 제공한다. |
| Undo | 전환 한 건 전체를 하나의 snapshot으로 되돌린다. 원본 QuickItem은 전후 동일하다. |
| reload | 마지막 성공 state와 receipt를 복원한다. 손상된 receipt/payload는 fail-closed한다. |

모든 값은 교체 가능한 versioned PoC contract로 관리한다. 위 선택을 영구 제품 정책으로
해석하지 않는다.

## 4. 데이터와 identity

전환 입력은 정확한 QuickItem ref와 예상 state revision을 요구한다. 구현은 현재 state를
기준으로 새 authored Flow와 Item, authoring handoff receipt, Quick conversion receipt를
계산한다.

Quick conversion receipt는 최소한 다음 사실을 보존한다.

- 계약 version과 conversion/handoff identity
- 원본 QuickItem ref, id, 제목, 메모, 폴더, 실행 날짜
- 생성한 Flow ref, Item ref, Flow 제목
- 완료를 복사하지 않았다는 정책
- 성공 commit 시각

새 Flow·Item ref는 현재 authored Flow identity 규칙으로 만들며 기존 read model과
충돌하면 저장하지 않는다. receipt는 새 Flow·Item·handoff와 서로 참조가 맞아야 유효하다.
손상, 누락, 중복 identity 또는 예상 revision 불일치는 모두 fail-closed한다.

## 5. 원자 transition

`convert-quick-item-to-flow` transition 하나가 아래 변경을 한 번에 계산한다.

1. 새 authored Flow와 첫 Item을 추가한다.
2. 새 Flow의 폴더 membership을 추가한다.
3. 새 Item의 개인 실행 날짜를 추가한다.
4. 원본에 메모가 있으면 새 Item의 개인 메모 overlay를 추가한다.
5. authoring handoff receipt와 Quick conversion receipt를 추가한다.
6. 이 변경 직전 state를 한 칸 Undo snapshot으로 보관한다.

원본 QuickItem, 원본의 placement, 원본의 완료 상태는 transition 대상이 아니다. 검증이나
저장이 실패하면 위 변경 중 일부만 남겨서는 안 된다. 저장 실패 뒤 재시도는 실패 직전과
동일한 revision/snapshot에만 허용한다.

## 6. 사용자 흐름

1. 사용자가 QuickItem의 관리 화면을 연다.
2. `Flow로 정리`를 선택한다.
3. 결과와 보존 범위를 읽고 Flow 이름을 확인하거나 수정한다.
4. `새 Flow 만들기`를 누른다.
5. 저장 성공 시 새 Flow 상세를 바로 열고, 성공 receipt와 Undo를 노출한다.
6. 저장 실패 시 원본과 state는 그대로 두고 실패 이유와 재시도를 노출한다.
7. 이미 전환한 원본에서는 `정리한 Flow 열기`를 제공하고 중복 생성하지 않는다.

취소, Escape, 잘못된 입력, stale state, identity 충돌, 반복 요청은 mutation 0이어야 한다.

## 7. 저장·운영 경계

- 진입점은 `/my?personalWorkspacePoc=v1` exact-query gate다.
- 쓰기는 `flow:poc:personal-workspace:v1:*` namespace에서만 허용한다.
- 기본 `/my`와 기존 운영 key/schema를 변경하지 않는다.
- 기존 `flow:*` 데이터는 읽기와 투영에만 사용한다.
- 기존 완료·메모·날짜·보관·export writer를 호출하지 않는다.
- `localStorage.clear()`를 호출하지 않는다.
- unsupported origin, 잘못된 query, 손상된 state/receipt는 기존 `/my`로 fail-closed한다.
- 실제 사용자 browser profile과 운영 backend를 자동 fixture 증거로 대체하지 않는다.

## 8. 제외 범위

- 원본 QuickItem을 Flow로 바꾸거나 삭제하는 migration
- 완료 상태·completedAt 복사
- 기존 Flow에 Item을 합치는 기능
- 여러 Item 구조를 자동 추론하는 기능
- source-owned 일정 또는 Flow 소속 변경
- 공개 후보, 공개 발행, 계정·cloud, AI, 외부 동기화
- 운영 writer, 운영 schema 변경, 배포

## 9. Acceptance criteria

- 원본 QuickItem의 제목·메모·폴더·날짜·완료 bytes가 전환 전후 동일하다.
- 새 Flow 하나와 열린 Item 하나가 생성된다.
- 폴더·날짜·메모는 전환 시점 snapshot과 일치한다.
- receipt가 원본 snapshot과 새 Flow·Item을 손실 없이 연결한다.
- 취소·Escape·빈/잘못된 제목·stale·충돌·반복 요청·저장 실패는 mutation 0이다.
- 성공 전환은 한 번의 Undo로 원상 복구되고 reload 뒤에도 성공 state가 복원된다.
- 손상된 receipt 또는 payload는 fail-closed한다.
- 허용 prefix 밖 `setItem`·`removeItem`과 모든 `clear` 호출은 0이다.
- 격리 browser context의 operating `flow:*` sentinel은 전후 byte-for-byte 동일하다.
- React와 standalone이 같은 계약과 핵심 사용자 결과를 제공한다.
- 다섯 필수 viewport에서 가로 넘침, console/page error, 핵심 행동 가림이 0이다.
- 자동 QA, 실제 기기, 관찰 사용자, commit·push·PR·배포 상태를 각각 따로 보고한다.

## 10. 현재 증거 상태

2026-09-05 이 패키지 작성 시점에 전달받은 실행 증거는 다음과 같다.

| 증거 | 상태 |
| --- | --- |
| React 순수 모델·state·storage·component focused | 104/104 PASS |
| React Quick→Flow E2E | 1/1 PASS |
| React 필수 viewport matrix | 5/5 PASS |
| standalone 모델·UI 계약 | 92/92 PASS |
| standalone Chromium smoke | 2/2 PASS |
| 전체 `npm test` | 2,201/2,201 PASS |
| production build | 18/18 page PASS |
| 요구 추적 검증 | 60/60 PASS · `BP-017` 충족/E4 |
| 문서 검사 | 16개 필수 문서·4,651개 로컬 링크 PASS |
| 실제 Android Chrome | 미실행 |
| 실제 iOS Safari | 미실행 |
| screen reader·OS 글자 확대·browser 200% | 미실행 |
| 관찰 사용자 | 0명 |
| commit·push·PR·Preview·Production | 모두 미진행 |

위 자동 결과로 `BP-017`의 PoC E4를 닫았다. 이는 실제 기기 또는 관찰 사용자 검증을
뜻하지 않는다. Android/iOS, 보조기술, 운영 backend와 실제 사용자 browser profile,
commit·push·PR·배포 상태는 계속 별도로 남긴다.
