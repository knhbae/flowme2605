# FlowMe 통합 PoC 빠른 할 일→Flow 연결 v1 Plan

## 1. 실행 원칙

이 작업은 `BP-017` 하나를 닫는 격리 PoC slice다. 순서는 계약 고정, 순수 모델,
원자 저장, React 연결, standalone parity, 최종 검증과 trace 갱신으로 한다. 각 단계에서
운영 writer와 기존 `flow:*` bytes를 건드리지 않았는지 함께 확인한다.

## 2. 단계별 계획

### 단계 1 — 기획·UX 계약 고정

- 원본 QuickItem을 보존하는 이유와 새 one-Item Flow의 역할을 고정한다.
- 제목·메모·폴더·날짜는 전환 시점 snapshot으로 receipt에 남긴다.
- 완료는 복사하지 않고 새 Item을 open으로 시작한다.
- 성공, 취소, 반복 요청, 저장 실패, 재시도, Undo, reload 상태를 정의한다.
- 이번 승인은 PoC v1 임시 결정이며 운영 정책이나 migration이 아님을 기록한다.

**Exit gate:** Stage-5 보류 조건 중 BP-017에 필요한 네 계약이 명시적으로 정해지고,
recurrence·public·table/source 보류 경계는 그대로 남는다.

### 단계 2 — 순수 materialization·identity

- exact Quick ref, 예상 revision, 사용자가 확인한 Flow 제목을 입력으로 받는다.
- 기존 authored Flow materializer를 이용해 Flow 하나와 Item 하나를 계산한다.
- deterministic conversion/handoff identity를 만든다.
- 빈 제목, 줄바꿈 제목, 누락된 QuickItem, stale revision, identity 충돌을 거절한다.

**Exit gate:** 같은 유효 입력은 같은 결과를 만들고, 모든 invalid 입력은 state를 바꾸지
않는다.

### 단계 3 — versioned state·atomic storage

- conversion receipt schema를 versioned snapshot에 추가한다.
- Flow·Item·폴더·날짜·메모·두 receipt·Undo를 한 transition으로 적용한다.
- 원본 QuickItem과 그 placement/completion은 transition에서 제외한다.
- 저장 중 일부가 실패하면 원래 bytes로 복구하고 재시도 정보를 남긴다.
- reload validation과 손상 receipt fail-closed를 구현한다.

**Exit gate:** 성공은 한 번의 state write로 완결되고 실패·stale·충돌·반복 요청은 mutation
0이다.

### 단계 4 — React 제품 흐름

- QuickItem 관리 화면에 `Flow로 정리`를 제공한다.
- 결과와 보존 범위를 짧게 설명하고 Flow 이름을 확인받는다.
- 성공 시 새 Flow 상세를 열고 receipt와 Undo를 제공한다.
- 이미 전환한 항목은 중복 생성 대신 기존 Flow 열기를 제공한다.
- 실패 시 원본을 유지한 채 재시도할 수 있게 한다.

**Exit gate:** 생성→열기→reload→Undo와 실패→재시도가 브라우저에서 실제 조작된다.

### 단계 5 — standalone 핵심 parity

- standalone model에 같은 임시 계약과 검증을 추가한다.
- standalone 관리 화면에 같은 핵심 전환 흐름을 연결한다.
- 단일 파일 HTML과 Android 전달본을 다시 만든다.
- standalone과 React의 원본 보존, 생성 결과, Undo, reload, 실패 결과를 비교한다.

**Exit gate:** 두 surface의 결과 signature가 같고 빌드 산출물과 Android 전달본 bytes가
일치한다.

### 단계 6 — 검증·평가·trace 갱신

- 순수 모델·identity·state·storage·component focused 검증을 실행한다.
- React와 standalone E2E에서 성공, 취소, 오류, retry, reload, Undo를 검사한다.
- 390×844, 375×812, 844×390, 1024×768, 1440×900을 검사한다.
- 가로 넘침, console error, page error, 핵심 행동 가림, 비드래그 경로를 확인한다.
- 전체 `npm test`, production build, docs check를 fresh 실행한다.
- operating sentinel bytes, 허용 prefix 밖 writer, `clear` 호출을 감사한다.
- `BP-017` 판정과 증거 등급을 실제 결과에 맞춰 갱신한다.

**Exit gate:** 자동 검증 수치와 미실행 실기·사용자·게시 상태가 분리된 최종 보고가 있고,
실패한 gate를 숨기지 않는다.

## 3. 현재 진행 상태

| 단계 | 상태 | 현재 근거 |
| --- | --- | --- |
| 1. 계약 고정 | 완료 | 이 spec과 사용자 승인 범위 |
| 2. materialization·identity | 완료 | 확대 focused 104/104에 포함 |
| 3. atomic state·storage | 완료 | 확대 focused 104/104에 포함 |
| 4. React 제품 흐름 | 완료 | 핵심 E2E 1/1 · viewport 5/5 |
| 5. standalone parity | 완료 | 92/92 · Chromium smoke 2/2 · 두 HTML byte-equal |
| 6. 최종 검증·trace | 완료 | npm 2,201/2,201 · build 18/18 · trace 60/60 · docs PASS |

## 4. 중단 조건

아래 상황에서는 추정 구현으로 범위를 넓히지 않는다.

- 원본 QuickItem을 삭제하거나 운영 Flow로 migration해야 하는 경우
- 기존 Flow에 합치기, completion 복사, 여러 Item 자동 구조화 정책이 필요한 경우
- PoC prefix 밖 writer가 필요한 경우
- 공개 후보·계정·cloud·AI·외부 동기화가 필요한 경우
- 운영 배포 또는 실제 사용자 데이터 접근이 필요한 경우

이 경우 현 상태와 가능한 선택지를 보고하고 별도 결정을 받는다.
