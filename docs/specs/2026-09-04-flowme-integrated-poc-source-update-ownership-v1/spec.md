# FlowMe 통합 PoC P3-D 원문 업데이트·소유권 계약

## 현재 판정

- 구현 상태: 격리 PoC 수직 슬라이스 구현 완료
- P3-D 기능 기준: 통과 근거 확보
- 저장소 전체 green: 보류. `npm test` 1,849개 중 현재 날짜에 의존하는 기존 source review 규칙 1건이 실패했다.
- P3-D 자동 검증: 강화한 React keyboard/backdrop E2E를 포함해 재확인 완료
- 최종 마감: 요구사항 추적표·검증 리포트 동기화 뒤 확정한다.

이 판정은 production canonical schema, publish/export owner, 외부 동기화 또는 운영 migration의 완료를 뜻하지 않는다.

## 목적

P3-C 뒤에 남은 개발2 핵심 공백 `D2-002`, `D2-004`, `D2-026`을 같은 수직 흐름에서 검증한다. 저장 완료된 `authoring-handoff` Flow 한 건에 로컬 새 원문 후보를 연결하고, 사용자가 기준 원문·내 작업·새 원문을 비교해 모든 차이를 해결한 뒤 한 번에 적용하고 되돌릴 수 있게 한다.

이번 단계는 운영 migration이 아니다. canonical 계층과 여덟 데이터 소유자는 PoC용 교체 가능 계약으로만 명시한다. 네 운영 saved-plan origin은 계속 읽기 전용이며, exact raw source가 없는 origin에는 업데이트 후보를 합성하지 않는다.

## 보호 경계

- 진입점은 `/my?personalWorkspacePoc=v1` exact query다.
- 기본 `/my`, 운영 key/schema/writer, 기존 Flow 원문은 바꾸지 않는다.
- PoC write는 `flow:poc:personal-workspace:v1:*`만 허용한다.
- 후보 저장 key는 `flow:poc:personal-workspace:v1:source-candidates` 하나다.
- `localStorage.clear()`와 prefix 밖 `setItem`/`removeItem`은 금지한다.
- 외부 fetch·sync·publish·export·account/cloud writer는 호출하지 않는다.
- 잘못된 version, 손상 payload, unsupported origin, stale/tampered candidate는 fail-closed한다.
- 개인 폴더·날짜·순서·완료·회차 기록은 source version 적용과 Undo 전후에 그대로 남아야 한다.

## 세 결과물의 역할

| 결과물 | 이번 단계에서 연결한 것 |
|---|---|
| v4.1 개인공간 | Flow 상세, 개인 실행 overlay, 한 번 Undo, reload 복구, 운영 데이터 불변 |
| 개발1 | 네 saved-plan origin의 read-only projection과 충돌 없는 identity |
| 개발2 | SourceRow→Item→Step→Flow→Bundle/Flow Map 경계, 원문 후보 envelope, 3-way 비교, 원자 적용 |

## canonical 계층의 실제 PoC 범위

| 계층 | 구현된 PoC 계약 | 아직 승인하지 않은 것 |
|---|---|---|
| SourceRow | `sourceOrder`에서 교체 가능한 `sourceRowProjectionKey`를 만들고 stable Item ref에 연결한다. exact raw bytes는 SourceSnapshot/envelope가 보존한다. | production SourceRow ID와 영구 line identity schema |
| Item | 기존 Item은 `savedCopyId + flowId + itemId` ref를 유지한다. 선택한 추가·삭제 결과도 개인 overlay와 실행 ref를 깨지 않게 투영한다. | 새·삭제 Item의 운영 migration 정책 |
| Step | 현재 Item마다 파생 `stepProjectionRef` 하나를 만든다. | persisted Step owner와 다대다 grouping 정책 |
| Flow | 기존 Flow ref·savedCopyId·flowId를 유지한 채 effective source version을 합성한다. | production canonical adapter 승인 |
| Bundle / Flow Map | `bundleFlowMapRef: null`로 미연결을 명시한다. | Bundle/Flow Map owner와 저장 schema |

자동 유사도 매칭은 하지 않는다. 기존 Item ref를 유지할 수 있는 명시 매핑만 적용한다. 이 adapter의 SourceRow와 Step은 파생 projection이며 운영 entity로 표현하지 않는다.

## 데이터 소유권의 실제 PoC 범위

| 계층 | read owner / write owner | 변경 정책 | PoC 상태 |
|---|---|---|---|
| SourceSnapshot | `authoring-handoff-lineage` / 없음 | immutable exact confirmed source bytes | 구현 |
| WorkingSource | `authoring-draft` / `authoring-draft` | 사용자가 편집한 working copy | 구현, source apply와 분리 |
| canonical | PoC versioned projection adapter / 없음 | source에서 deterministic 파생 | 구현 |
| CreatorDraft | creator draft library / creator draft library | 명시 저장 전용 | 구현, source apply와 분리 |
| PublishedVersion | 없음 / 없음 | 이번 PoC에서 파생·저장하지 않음 | 미구현·미소유 |
| PersonalOverlay | personal workspace shadow / personal workspace shadow | 개인 편집 transition만 변경 | 기존 구현 보존 |
| ExecutionRun | personal workspace shadow / personal workspace shadow | 날짜·완료·회차 transition만 변경 | 기존 구현 보존 |
| ExportSnapshot | 없음 / 없음 | writer와 projection을 만들지 않음 | 미구현·미소유 |

`PublishedVersion`, `ExportSnapshot`, provider sync는 빈 placeholder를 owner가 있는 것처럼 표현하지 않는다.

## 후보 envelope

후보는 다음을 한 번에 고정한다.

- schema/adapter/compiler version
- `candidateId`, `targetFlowRef`, base source revision
- Base·Working·Incoming exact raw text와 UTF-8 byte 길이/consistency hash
- source owner와 `local-fixture` provenance
- deterministic change set과 기존 Item ref 명시 매핑
- envelope integrity hash와 idempotency key

consistency hash는 손상 검출용이며 보안 서명으로 표현하지 않는다. stage·resolve·apply 직전에 envelope과 현재 source revision을 다시 검증한다.

## 상태 전이

durable review 상태는 `pending`, `deferred`, `applied`만 저장한다. `comparing`, `ready`, `applying`, `undoing`, `failed`, `stale`는 현재 사용자 동작을 설명하는 UI 상태 또는 차단 결과다.

- 각 차이는 `내 작업 유지`, `새 원문 선택`, `나중에 결정` 중 하나다.
- unresolved 또는 `나중에 결정`이 하나라도 있으면 적용할 수 없다.
- Escape, backdrop, 나중에, 같은 선택은 적용 mutation 0이다.
- 적용은 다음 store 전체를 먼저 계산한 뒤 단일 key를 한 번 교체한다.
- 저장 전 expected bytes 확인, 저장 후 readback 검증, 실패 시 이전 bytes 복원을 수행한다.
- 성공 기록은 before/result hash, decision hash, source revision과 side-effect 0을 보존한다.
- 같은 후보를 다시 적용하면 `already-applied`로 끝나며 revision과 write를 중복 생성하지 않는다.
- Undo는 적용 직후 보존한 exact before snapshot을 한 번 복원한다.

pointer cancel은 원문 비교 화면 자체에 drag gesture가 없으므로 P3-D 직접 기준이 아니다. 기존 이동 기능의 pointer-cancel 무저장 계약은 관련 개인공간 회귀에서 계속 검증한다.

## 정보 구조와 UX

- 업데이트 알림은 해당 `authoring-handoff` Flow 상세 안에서만 보인다.
- 알림 행동은 `달라진 N곳 비교`와 `나중에`다.
- 비교 제목은 `새 원문과 내 작업 비교`다.
- 데스크톱은 drawer/dialog 안의 세 열, 좁은 화면은 `기준 원문 / 내 작업 / 새 원문` 탭을 쓴다.
- 상시 세 번째 pane은 만들지 않는다.
- 미해결 개수를 문장으로 표시하고 완료 전 적용 버튼을 비활성화한다.
- 성공 뒤 `이전 원문으로 되돌리기`를 제공한다.
- 내부 용어인 canonical, hash, receipt, revision은 사용자 화면에 노출하지 않는다.
- 열 때 첫 미해결 선택에 focus하고, focus trap·Escape defer·opener focus return을 지킨다.
- 핵심 target은 최소 44px, 200% reflow와 reduced motion을 지원한다.

## 지원 범위

첫 대상은 exact `authoring.rawText`와 source lineage를 가진 저장 완료 `authoring-handoff` Flow다. 네 운영 saved-plan origin은 exact immutable Base 계약이 없으므로 이번 단계에서 업데이트 후보를 만들지 않는다. unsupported origin에서는 update control과 write가 없다.

React와 standalone은 같은 versioned candidate transition/storage runtime 계약을 사용한다. 두 surface의 검증 fixture ID와 변경 내용은 같다고 가정하지 않는다.

## 성공 판정

1. D2-026.1~.5는 격리 PoC의 model·storage·React·standalone 실행 증거가 모두 있어야 한다.
2. D2-002와 D2-004는 PoC adapter/owner 계약의 실제 연결 범위만 인정하며 production schema 완료로 표현하지 않는다.
3. focused model/component, 관련 회귀, React·standalone 브라우저, production build 결과를 서로 분리해 기록한다.
4. 다섯 viewport에서 가로 넘침, console/page error, 가려진 핵심 행동, 44px 미만 핵심 target이 0이어야 한다.
5. 시나리오 전후 non-PoC `flow:*` key/value가 byte-for-byte 같아야 한다.
6. 전체 `npm test`가 실패하면 P3-D 자체 근거와 무관 여부를 적되 저장소 전체 green과 최종 승격은 보류한다.

실제 Android Chrome, iOS Safari, 보조기술, 관찰 사용자 검증은 자동 브라우저와 별도로 보고한다.
