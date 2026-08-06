# P35 근본 UX Round 2 · Codex 로컬 시뮬레이션 결과

> 기준: `91fb66af063f7041f9442a9dfeb66f9a3e78d723` / `codex/p35-production-mobile-p0`
> 제품 코드 기준선: `b215698`과 동일한 앱 코드
> 검토일: 2026-08-03
> 검토 성격: 로컬 내부 시뮬레이션 + 코드/테스트 추적
> 관찰 사용자: **0명**

## 한 줄 결론

P35는 공개 Flow의 저장 결과와 저장 후 첫 진입을 많이 정리했지만, 아직 출시 판단선에는 못 미칩니다. canonical Item 투영은 대체로 견고한 반면, `내 Flow` 정보 구조, 공개/저장 편집 계약, 내보내기 의미, legacy Flow Map의 미리보기 동등성이 서로 다른 규칙으로 남아 있습니다.

현재 점수는 **55.4/100**, Hard fail은 **3개**입니다.

1. Flow Map에서 7개로 조정해도 메인 미리보기는 원래 8개를 계속 보여 줍니다.
2. 저장 Item 화면은 체크리스트에 완료 기준을 함께 옮긴다고 안내하지만 실제 결과에는 빠집니다.
3. 편집과 내보내기가 공개/저장, Flow/Item의 여러 깊이에 반복되어 기본 소유자가 하나가 아닙니다.

자동 테스트가 통과했다는 사실과 사용자가 이해하기 쉽다는 판단은 구분했습니다.

## 권고안

| 결정 영역 | 권고 | 이유 |
|---|---|---|
| `내 Flow` 첫 화면 | **문맥형 C** | 저장 직후에는 방금 저장한 계획, 일반 재방문에는 최대 3개의 실행 항목과 저장 라이브러리를 연결합니다. Today는 별도 저장소가 아니라 저장 계획의 파생 뷰라고 명시합니다. |
| 내보내기 소유권 | **capability 조건부 C** | 공개 화면은 현재 조정본의 단방향 복사/다운로드만 보조적으로 허용하고, 저장 후 개인 수정·완료·재내보내기의 정본은 `내 Flow`가 소유합니다. |
| 편집 surface | **공통 전체 높이 sheet** | 공개와 저장 화면의 필드·순서·Apply/Cancel 문법을 맞추되, 공개는 working overlay 적용, 저장 화면은 persisted overlay 갱신으로 결과를 구분합니다. |
| 결과 형식 | **기본 1개 + 실제 가능한 보조 형식** | 고정 5개 노출은 빈 캘린더·의미 없는 시트·중복 포맷을 만들 수 있습니다. |
| 사용자 용어 | **Flow + 첫 노출 설명 혼합** | 내부 모델명은 유지하되 CTA와 첫 노출은 `계획 저장`, `캘린더 24개 만들기`처럼 결과를 말합니다. |

## MVP 우선순위

### P0 · 출시 판단 전

- Flow Map 조정값을 메인 미리보기, 저장 CTA, 저장 payload에 동일하게 반영합니다.
- 저장 Item 체크리스트의 완료 기준을 실제 결과에 넣거나, 화면 안내에서 약속을 제거합니다.
- 편집·내보내기의 기본 위치를 하나씩 정하고 공개/저장, Flow/Item의 반복 진입을 정리합니다.
- 공개/저장 Flow 편집을 공통 거래 계약으로 묶고 저장 Flow 설정에도 dirty/discard/focus-return을 추가합니다.
- 공개 export와 저장 export가 무엇의 어느 버전을 보내는지 영수증에 표시합니다.

### P1 · MVP 품질

- `내 Flow`를 문맥형 C로 정리하고 0·1·5·20개 상태의 acceptance test를 고정합니다.
- 날짜 입력 아래 동일 날짜 echo를 삭제하고 변경 결과는 미리보기 한 곳에서 확인하게 합니다.
- 저장 Flow TSV 제목, 저장 ICS 완료 상태, 공개 Checklist/Memo 중복처럼 형식별 손실을 보존 또는 사전 고지합니다.
- Item 상세의 파란 장식 surface, `실행할 일`, `할 일 수정`을 감산합니다.
- 공개 상세의 primary 행동을 하나로 줄이고 행 수정·계획 편집·내보내기의 노출 순서를 다시 정합니다.
- 도움·주의를 삭제/도움말/짧은 안내/필수 인라인의 네 등급으로 고정합니다.
- snapshot provenance를 산출물과 영수증에 남깁니다.
- legacy Flow Map을 일반 Flow projection/editor adapter로 흡수합니다.

`Flow` 용어 이해도는 구현 목록이 아니라 처음 보는 사용자 과업으로 별도 검증합니다.

## 산출물

| 파일 | 내용 |
|---|---|
| [01-local-simulation-findings-ko.md](./01-local-simulation-findings-ko.md) | S01~S13 재현, U01~U10 판정, Hard fail, 우선순위 |
| [02-data-ui-architecture-ko.md](./02-data-ui-architecture-ko.md) | source→canonical→projection→UI/export 추적과 구조적 원인 |
| [03-lifecycle-and-ownership-options-ko.md](./03-lifecycle-and-ownership-options-ko.md) | 저장·영수증·내보내기 생명주기와 A/B/C 대안 |
| [04-my-flow-ia-options-ko.md](./04-my-flow-ia-options-ko.md) | `내 Flow` 0·1·5·20개 상태와 A/B/C IA 비교 |
| [05-editor-projection-contract-ko.md](./05-editor-projection-contract-ko.md) | 공통 편집기 계약, projection eligibility, 손실표 |
| [06-copy-disclosure-review-ko.md](./06-copy-disclosure-review-ko.md) | 용어·CTA·도움·주의·접근성 규칙 |
| [07-scorecard-ko.md](./07-scorecard-ko.md) | 55.4/100 점수, gate, 대안 결정표 |
| [screenshots/](./screenshots/) | 390×844·1440×1000 로컬 캡처 36장 |

## 증거 경계

| 구분 | 이번 결과에서 의미 |
|---|---|
| 실제 구현 | 현재 HEAD의 코드와 로컬 런타임에서 확인한 상태 |
| 제품 오너 의견 | U01~U10 문제 제기. 외부 사용자 행동 관찰이 아님 |
| 내부 시뮬레이션 | Playwright로 상태를 바꾸고 결과를 확인한 것. 사용자 검증이 아님 |
| 자동 테스트 | 명시된 계약의 회귀 여부. 이해도·선호를 증명하지 않음 |
| `TBD` | 합법적 fixture가 없거나 로컬 재현이 끝나지 않아 판단을 보류한 상태 |

## 이번 기획 세션에서 Owner가 확정할 3가지

1. 저장 전에는 1회성 복사·다운로드만 허용하고, 저장 후에는 개인 수정본의 다시 내보내기를 맡길지.
2. 저장 직후와 일반 재방문을 구분하는 **문맥형 My Flow C안**을 채택할지.
3. 수학 Flow Map을 별도 방식으로 유지할지, 일반 Flow와 같은 편집·결과 구조로 합칠지.

## 검증 상태

- `npm.cmd run test:p35-p0`: **40/40 통과**
- export/Todo 관련 추가 단위 테스트: **33/33 통과**
- 390×844: 공개 상세, 기준일, 공개 편집, 저장 영수증, `내 Flow`, 저장 편집, Item 상세, Flow Map 확인
- 1440×1000: 공개 Flow, `내 Flow`, Flow Map 확인; 가로 overflow 0
- `demo=ux5` 수동 재진입은 개발 서버가 응답하지 않아 종료했습니다. 5·20·50개는 코드/E2E fixture 존재를 확인했지만 이번 수동 관찰을 `O`로 올리지 않았습니다.
- 커밋·푸시·PR·배포: 하지 않음
