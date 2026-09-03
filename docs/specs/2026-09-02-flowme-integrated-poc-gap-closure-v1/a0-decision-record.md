# FlowMe 통합 PoC A0 결정 기록

- 작성일: 2026-09-02
- 상태: `POC_WORKING_DECISIONS_LOCKED`
- 적용 범위: 개인공간 v4.1 + 개발 1 + 개발 2의 격리 통합 PoC
- 영구 제품 정책·운영 schema 승인: 아님
- 운영 writer·migration·배포 승인: 아님

## 1. 왜 다시 여섯 가지를 결정했는가

초기 gap closure 계획은 저장 lane, 운영 owner, shell, Authoring 방식, 고급 범위,
standalone 역할을 모두 `결정 필요`로 묶었다. 그러나 세 결과물의 실제 세션과 최신
통합 blueprint를 다시 대조하니 상당수는 이미 사용자 승인 또는 후속 정본으로
결정돼 있었다.

이 기록은 과거 결정을 다시 묻지 않는다. 다음 우선순위로 근거를 해석한다.

1. 이 세션의 사용자 지시와 보호 경계
2. 2026-09-01 통합 blueprint의 명시 결론
3. 개발 1·개발 2 세션에서 사용자가 직접 승인한 후속 계약
4. 개인공간 v4.1 spec·HTML·QA
5. 현재 코드와 자동화 결과 — 구현 여부 근거이며 제품 결정 근거를 대신하지 않음

원본 `<workspace>/flow-mvp`의 dirty·미추적 문서는 읽기 전용 정본으로만
참조했다. 이 기록과 후속 수정은 격리 worktree에만 둔다.

## 2. 결정 상태의 뜻

| 상태 | 뜻 |
| --- | --- |
| `기존 확정 유지` | 이미 사용자 승인 또는 최신 통합 정본에 있는 방향을 다시 묻지 않고 보존한다. |
| `PoC 작업 결정` | 격리 PoC를 검증하기 위한 교체 가능한 선택이다. 운영 정책이나 schema로 승격하지 않는다. |
| `후속 보류` | 현재 PoC가 추정 구현하지 않는다. 별도 권한과 정본이 생길 때 다시 연다. |

## 3. A0-1 — Text Authoring 저장 lane

**선택:** `Authoring draft -> 명시적 개인 Flow handoff` 한 경로를 현재 PoC의 첫
성공 경로로 사용한다. CreatorDraft library와 공개 후보는 다른 소유 영역으로
보존하고 현재 CTA에 섞지 않는다.

- 상태: `기존 확정 유지`
- 첫 화면: `/flows/new?personalWorkspacePoc=v1`의 일반 텍스트 편집기
- 첫 행동: 사용자가 직접 텍스트를 작성하거나 빈 문서에서 작성 틀을 선택
- 완료 CTA: `개인 Flow로 저장`
- 완료 결과: 새 개인 Flow가 `/my?personalWorkspacePoc=v1`의 `미분류`에 나타남
- 화면 owner: Text Authoring route와 authoring document/draft
- 데이터 owner: handoff 전 authoring draft, handoff 후 PoC personal Flow shadow
- 허용 write: `flow:poc:personal-workspace:v1:*`만
- 금지 write: 기존 saved Flow, creator publish, public version, operating completion·memo·date

**선택 이유**

- 통합 blueprint는 개발 2를 `/my` 안의 편집기가 아니라 `만들기 -> 개인 Flow로
  저장`하는 별도 입구로 명시했다.
- 같은 blueprint는 `AuthoringHandoff -> 개인 Flow`를 P1 한 경로로 두고 공개·업데이트를
  P2로 분리했다.
- 현재 세션의 목표도 기능형 개인공간 PoC이며 공개 후보·운영 migration·배포를 제외한다.

**선택하지 않은 안**

- `CreatorDraft only`: 개인공간까지 이어지는 이번 통합 시나리오를 끝내지 못한다.
- 첫 완료 화면의 `개인/제작자 두 갈래`: 현재 검증 과업에 불필요한 선택과 서로 다른
  receipt owner를 동시에 노출한다.

**다시 여는 조건**

- 계정 기반 creator library·revision·publish owner가 생기고,
- creator 초안 저장·검색·복제·보관·재진입의 실제 제품 과업이 승인되며,
- 개인 Flow handoff와 creator publish의 서로 다른 영수증을 사용자에게 설명할 수 있을 때
  `A11`로 다시 연다.

**Acceptance scenario**

1. 일반 텍스트 작성 전 persistent write는 0이다.
2. 명시 저장 한 번이 PoC state에 personal Flow와 lineage를 원자적으로 만든다.
3. 새 Flow는 `미분류`에 중복 없이 나타나고 reload 뒤 다시 열린다.
4. creator/public key와 운영 `flow:*` bytes는 바뀌지 않는다.

**요구 배치:** `D2-005`는 개발 2 원안에서 통합 blueprint의 개인 Flow handoff로
`의도적 변경`; `D2-057`의 draft recovery는 구현을 계속하고 CreatorDraft library는
`A11 후속 보류`; `BP-027,032`의 handoff·lineage는 `A1/A10 구현`으로 보낸다.

## 4. A0-2 — 개발 1 편집·lifecycle·Calendar·export owner

**선택:** 세 층을 구분한다.

1. 현재 PoC의 상세·Calendar는 기존 데이터를 읽는 projection이다.
2. 편집·날짜·완료·휴지통 UX를 통합 PoC에서 검증할 때는 같은 D1 staged
   `Plan -> Item` 문법을 쓰되 결과는 PoC shadow에만 기록한다.
3. 운영 이관은 별도 승인 뒤 기존 개발 1 origin adapter와 날짜·완료·휴지통·export
   owner에 command를 위임한다. 새 운영 저장소나 migration은 만들지 않는다.

- 상태: `기존 확정 유지` + `PoC 작업 결정`
- Item 적용 의미: 부모 Plan draft만 변경, persistent write 0
- Plan 적용 의미: PoC shadow snapshot 한 번만 원자 저장
- 휴지통 문법: `휴지통으로 이동 / 휴지통 / 복원 / 이 기기에서 영구 삭제`
- 현재 허용 write: PoC prefix의 shadow state·draft·receipt만
- 현재 금지 write: 기존 origin writer, lifecycle key, Calendar owner, export receipt owner
- rollback: PoC commit 실패 시 이전 exact bytes 복구, 검증 실패 시 성공 표시 금지

**선택 이유**

- 개발 1에서 네 origin·모든 opener가 하나의 staged Plan transaction을 쓰고 Item은
  Plan draft에만 반영하며 Plan 저장 한 번이 기존 origin owner에 commit하도록 사용자가
  승인했다.
- 휴지통 사용자 문법은 사용자가 직접 요구했지만 내부 archive key/schema/identity는
  보존하도록 확정됐다.
- 통합 blueprint와 이번 세션의 최초 지시는 PoC에서 기존 writer를 호출하지 말고
  전용 shadow로 UX를 검증하라고 명시한다.

**선택하지 않은 안**

- `no-write detail only`: 편집·복구 UX를 실제로 조작할 수 없어 개발 1 통합 검증이
  끝나지 않는다.
- PoC에서 기존 writer 직접 호출: 최초 보호 경계와 운영 데이터 불변 조건을 위반한다.
- 새 공통 operating schema: 개발 1의 origin owner와 identity를 복제한다.

**다시 여는 조건**

- PoC 시나리오·실기·관찰 사용자 근거가 운영 통합을 지지하고,
- writer별 owner·rollback·migration 검토가 별도 승인됐을 때 운영 adapter를 연다.

**Acceptance scenario**

1. 네 origin이 같은 Plan/Item 편집 순서와 닫기·Back·focus 복귀를 쓴다.
2. Item `계획에 반영` 전후 storage mutation은 0이다.
3. Plan apply 한 번만 PoC shadow를 바꾸며 실패·취소·stale은 0건이다.
4. Text·Todo·Calendar projection은 같은 effective Item을 읽는다.
5. 운영 key/value sentinel은 전후 byte-for-byte 동일하다.

**요구 배치:** `D1-010`, `BP-002,006,056`은 `A3/A4/A5 구현`; `BP-049,080`은
projection·editor 구현 뒤 검증; 운영 writer 연결은 `후속 보류`다.

## 5. A0-3 — 전역 shell과 개인공간 시각 문법

**선택:** 전역 서비스 shell과 개인공간 내부 문법을 경쟁시키지 않는다.

- 전역 owner: 기존 production `PlatformNav`, ink/cobalt 문법, 세 주요 목적지
  `Flow 찾기 / 캘린더 / 내 Flow`
- 개인공간 owner: exact-query 내부의 흰 본문·회색 탐색·teal 실행 강조·평면 목록
- 모바일: 전역 navigation은 한 번만 렌더하고, 개인공간 context/action은 한 줄로
  축약한다. 같은 의미의 `새 Flow 만들기` CTA를 header와 본문에 중복하지 않는다.
- standalone: production shell을 흉내 낸 별도 제품으로 만들지 않고 개인공간 내부
  chrome과 검증 범위 표시만 재현한다.

- 상태: `기존 확정 유지` + `PoC 작업 결정`
- global shell write: 없음
- 운영 route·token 변경: 없음
- 구현 대상: exact-query 내부 component의 chrome·flat row·responsive CSS

**선택 이유**

- 개발 1 production visual refresh는 전역 cobalt 문법으로 이미 승인·출시됐다.
- v4.1의 white/gray/teal과 한 줄 모바일 header는 개인공간 PoC의 확정 시각·공간 문법이다.
- 둘을 하나의 전역 색상 선택 문제로 만들면 이미 승인된 production shell 또는 v4.1
  내부 UX 중 하나를 불필요하게 폐기하게 된다.

**선택하지 않은 안**

- 전역 shell 전체 teal 교체: 운영 변경·회귀·배포 승인이 필요하다.
- exact-query 안까지 모두 cobalt로 재도색: v4.1 화면 정본의 개인공간 문법을 잃는다.
- `PlatformNav + 두 번째 전역형 header + 상태 띠`: 모바일 본문 시작을 늦추고 주 행동을
  중복한다.

**다시 여는 조건**

- 전체 서비스 visual refresh를 다시 승인하거나,
- 관찰 사용자에서 두 색 체계가 실제 위치·행동 오해를 만든다는 근거가 생길 때다.

**Acceptance scenario**

1. 기본 `/my` DOM·CSS·storage는 바뀌지 않는다.
2. exact-query에서 global nav는 한 번, local context/action은 한 줄이다.
3. 모바일에서 본문 primary CTA는 한 개이고 48px target을 가진다.
4. 390×844, 375×812, 844×390, 1024×768, 1440×900에서 overflow·가림 0이다.

**요구 배치:** `D1-013`은 전역 owner 보존과 local scope 분리로 `충족`;
`V41-001,029,036,053`, `D1-014`, `D2-007,043`의 남은 chrome 차이는 `A9 구현`이다.

## 6. A0-4 — Text Authoring 상호작용

**선택:** `하나의 text source/editor + 파생 결과 preview + 필요할 때만 구조 보정`을
목표 상태로 고정한다.

- 기본 여정: 일반 텍스트 입력 -> 결과
- 구조 검토: blocking issue 또는 사용자 요청 때 drawer/bottom sheet로 선택
- 작성 틀: 빈 문서에서 명시적으로 고르면 같은 editor에 미완성 TXT 골격을 한 번 삽입
- 되돌리기: native undo 한 번으로 전체 삽입 제거, redo로 동일 bytes 복원
- 입력 예시: 모든 Flow 편집에 적용되는 DOM ghost이며 source·selection·clipboard·undo에
  들어가지 않음
- 빈 골격: canonical 객체나 blocking issue를 만들지 않음
- 값이 있지만 잘못된 날짜·시간대 등: 저장 차단과 수정 경로 제공

- 상태: `기존 확정 유지`
- 화면 owner: 같은 Text Authoring editor
- write owner: authoring draft, 명시 handoff 전 personal Flow write 0

**선택 이유**

- 개발 2에서 사용자가 별도 틀 입력 공간을 거절하고 같은 Flow editor에 틀을 넣어
  자유롭게 작성하라고 직접 수정·승인했다.
- 예시 토글 역시 틀 전용이 아니라 전체 Flow 편집의 presentation state로 확정됐다.
- 구조는 필요하지만 모든 문서가 반드시 거치는 중간 화면은 아니라는 후속 결정을
  보존한다.

**선택하지 않은 안**

- 강제 `작성 -> 구조 -> 결과` 3단계 wizard
- 별도 template editor·완성 gate
- canonical 객체를 직접 조작하는 full block editor를 첫 단계에 도입

**다시 여는 조건**

- textarea/CodeMirror 접근성·대용량 편집 한계가 실제 과업에서 반복되거나,
- source round-trip을 보존하면서 block 편집이 더 낫다는 관찰 근거가 있을 때다.

**Acceptance scenario**

1. 일반 문장은 구조 화면 없이 결과까지 간다.
2. picker browse/cancel은 source write 0이다.
3. 틀 선택은 같은 editor에 한 번만 삽입되고 undo/redo가 exact bytes를 복원한다.
4. ghost toggle은 source·selection·scroll·undo를 바꾸지 않는다.
5. IME composing·stale fingerprint·non-empty 전체 틀 삽입은 fail-closed한다.

**요구 배치:** `D2-022,029~039,044,053~056`은 `A6/A7 구현`;
`BP-033,053,074`는 `A1/A6/A10`의 loss gate와 correction 경로로 보낸다.

## 7. A0-5 — recurrence·public S3·table/source update

**선택:** 현재 통합 PoC에는 포함하지 않는다. 원문을 보존하고 material loss가 예상되면
commit을 막는다. 지원한 것처럼 추정 변환하지 않는다.

- recurrence runtime·occurrence 이동: `후속 보류`
- 공개 Flow 저장 S3·공개 후보·버전 update: `후속 보류`
- 표 기반 source update·양방향 갱신: `후속 보류`
- 현재 허용: raw source/lineage 보존, loss manifest, unsupported 안내, correction 또는
  날짜 미정으로 되돌아갈 수 있는 경로
- 현재 금지: 가짜 occurrence ID, 반복 평탄화를 완료로 표현, public writer,
  source row mutation, silent drop

- 상태: `후속 보류`
- write: PoC prefix 밖 0

**선택 이유**

- 이번 세션 최초 경계는 공개 후보·AI·외부 동기화·운영 migration을 제외한다.
- v4.1도 반복 일정을 제외한다.
- 통합 blueprint는 recurrence fidelity를 P1, 공개·업데이트를 P2로 분리했고 중요한
  손실은 저장을 막도록 했다.

**다시 여는 조건**

- recurrence: canonical occurrence identity와 개별 완료 owner가 승인됐을 때
- public: immutable public version·개인 사본·역류 금지·권한 owner가 승인됐을 때
- table/source update: row identity·conflict·add-only/delete 정책과 rollback이 승인됐을 때

**Acceptance scenario**

1. unsupported recurrence/table/public intent는 operating write 없이 멈춘다.
2. raw text·source lineage·unknown fields가 exact round-trip된다.
3. lossFields와 blockingIssues가 사용자에게 보이며 silent drop은 0이다.

**요구 배치:** `BP-019,075`는 현재 `제외`; 관련 D2/V41 고급 요구는 `A10 후속 보류`다.

## 8. A0-6 — standalone 역할

**선택:** React exact-query surface를 제품 구현 정본으로, standalone 단일 HTML을
`오프라인 수동 검토 동반물`로 둔다. standalone은 fixture-only이지만 사용자에게 보이는
핵심 UX는 축약하거나 다르게 만들지 않는다.

**반드시 같은 것**

- 폴더·오늘·주간·월간·날짜 미정 IA와 주요 문구
- QuickItem 생성, 날짜·폴더·순서 이동, 완료·다시 열기, Undo·reload
- 손잡이 짧은 누르기·길게 누르기·메뉴·키보드의 transition 의미
- 왼쪽 목적지·오른쪽 재정렬 corridor, 저장 상태, responsive/accessibility 계약
- Text Authoring의 한 editor·작성 틀·ghost·개인 Flow handoff 사용자 여정

**달라도 되는 것**

- embedded deterministic fixture 대 live 네 origin read
- Next route·React component·production `PlatformNav`
- 실제 operating writer·Calendar/export side effect — 양쪽 모두 현재 금지

- 상태: `PoC 작업 결정`
- 저장: standalone도 같은 PoC prefix의 전용 key만 사용
- 표시 의무: fixture simulation이며 live operating evidence가 아니라는 문구
- 증거 의무: standalone 통과를 React 통과나 실제 기기·관찰 사용자 근거로 대체하지 않음

**선택하지 않은 안**

- 제품 동등 runtime: live origin과 production owner가 없는 단일 파일로는 사실과 다르다.
- 단순 클릭 데모: 사용자가 통합 UX를 검증할 수 없고 과거처럼 화면만 보이거나 버튼이
  무반응인 결과를 반복한다.

**다시 여는 조건**

- 전달·검토가 항상 live Preview에서 가능해 standalone 수요가 없어지거나,
- standalone을 실제 배포 제품으로 승격하는 별도 route·data owner가 승인될 때다.

**Acceptance scenario**

1. 여덟 통합 시나리오를 standalone에서 직접 조작할 수 있다.
2. 같은 사용자 intent가 React와 같은 next-state·receipt 의미를 만든다.
3. fixture/live 차이는 보고서와 화면에서 숨기지 않는다.
4. localStorage write/remove/clear instrumentation에서 허용 prefix 밖 호출이 0이다.

**요구 배치:** standalone의 중앙 dialog와 축약된 날짜/authoring UX는 `A8/A9`의
실제 구현 gap으로 유지한다. live-origin·operating parity는 standalone 합격 조건에서
제외하되 React 검증은 별도로 유지한다.

## 9. A0 요구 9개 배치 결과

| 요구 | A0 전 | A0 결과 | 다음 owner |
| --- | --- | --- | --- |
| `V41-001` | 부분 | 구현 | `A9` local chrome·flat row |
| `D1-010` | 결정 필요 | 구현 | `A3/A4` staged shadow lifecycle |
| `D1-013` | 결정 필요 | 충족 | production global owner 보존, 회귀만 유지 |
| `D2-005` | 결정 필요 | 의도적 변경 | personal handoff 유지, creator lane은 `A11` 보류 |
| `BP-002` | 부분 | 구현 | `A3/A4/A5` D1 owner 문법의 shadow adapter |
| `BP-006` | 부분 | 구현 | owner matrix에 따라 단계별 연결 |
| `BP-019` | 결정 필요 | 제외 | recurrence 승인 전 fail-closed |
| `BP-056` | 결정 필요 | 구현 | no-write projection + shadow commands |
| `BP-075` | 결정 필요 | 제외 | public P2 별도 승인 |

분류 합계는 `구현 5 / 충족 1 / 의도적 변경 1 / 후속 제외 2`이며 누락은 0이다.

## 10. 화면·데이터 owner matrix

| 사용자 작업 | route/surface | read owner | PoC write owner | 운영 후속 owner | 현재 상태 |
| --- | --- | --- | --- | --- | --- |
| 네 origin 찾기 | `/my?personalWorkspacePoc=v1` | 기존 saved-plan adapters | 없음 | 기존 D1 owners | read 구현 |
| 폴더·기간 정리 | 개인공간 | composed effective Item | PoC workspace shadow | 별도 승인 | 구현 중 |
| Flow·Item 편집 | 선택 Plan/detail | D1 effective Plan | staged PoC draft/snapshot | D1 classified origin writer | 다음 `A3` |
| 완료·다시 열기 | Today/detail/period | effective execution state | PoC shadow | D1 completion owner | shadow 구현 |
| Calendar 확인 | `/calendar` 또는 PoC period | Calendar projection | PoC shadow만 | 기존 Calendar controller | cross-route 후속 |
| 일반 텍스트 작성 | `/flows/new?personalWorkspacePoc=v1` | authoring document | PoC authoring draft | authoring owner | 부분 구현 |
| 개인 Flow handoff | Authoring 완료 | parsed preview·lineage | PoC personal Flow transaction | existing atomic saved Flow owner | PoC 구현 |
| CreatorDraft/public | creator/publish | 해당 owner | 없음 | 별도 P2 owner | 제외 |

## 11. 단계 0 Exit gate

- [x] A0-1~A0-6에 선택안과 이유가 있다.
- [x] 선택하지 않은 안과 다시 여는 조건이 있다.
- [x] 화면·route·read/write owner가 있다.
- [x] 허용 namespace와 금지 writer가 있다.
- [x] 구현 package와 acceptance scenario가 있다.
- [x] A0 primary 4개와 bridge 5개가 구현·충족·의도적 변경·제외 중 하나에 배치됐다.
- [x] 영구 제품 정책·운영 writer·migration을 승인한 것으로 표현하지 않는다.

## 12. 다음 단계

단계 1은 `A1 + A3/A4의 UI 없는 기반`이다.

1. source·authoring·personal·execution ownership을 필드 단위 contract로 고정한다.
2. unknown property·원문·source order·lineage를 보존하는 loss manifest를 만든다.
3. D1 staged `Item -> Plan draft -> Plan apply`를 PoC shadow transition으로 구현한다.
4. save/no-op/failure/retry/Undo receipt와 multi-key late-failure byte rollback을 구현한다.
5. 네 origin·malformed·unsupported·duplicate·cancel·stale·failure·reload를 순수 모델과
   storage instrumentation으로 검증한다.

단계 1 동안에도 기본 `/my`, 기존 `flow:*`, 운영 writer, dirty 원본, commit·push·PR·배포는
변경하지 않는다.

## 13. 근거 위치

- 통합 blueprint: `docs/specs/2026-09-01-flowme-integration-blueprint-v0/spec.md`
- 개인공간 v4.1: `docs/specs/2026-09-01-personal-workspace-v4-1-prototype/spec.md`
- 개발 1 기준 대화: `D1 baseline session`
- 개발 1 staged/lifecycle spec: `<workspace>/flow-plan-edit-trash-structure-unification-20260813/docs/specs/2026-08-13-plan-edit-trash-structure-unification/spec.md`
- 개발 2 기준 대화: `D2 baseline session`
- 개발 2 최신 한 편집기 spec: `<workspace>/flow-text-authoring-structure-template-inline-baseline-20260830/docs/specs/2026-08-30-flowme-text-authoring-unified-editor-guidance-poc/spec.md`
- 현재 추적 자료: `../../content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-ko.html`
