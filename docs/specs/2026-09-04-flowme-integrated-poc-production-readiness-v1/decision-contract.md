# P3-E production-target 결정 계약

## 계약 상태

- 계약 ID: `flowme-production-target-identity-owner-planning-v1`
- 분류: 교체 가능한 planning contract
- production 승인: 아니오
- operating schema 소유: 아니오
- runtime writer: 없음
- migration: 없음

코드 정본은 [personal-workspace-poc-production-target-contract.ts](../../../lib/flow/personal-workspace-poc-production-target-contract.ts)다.

## Canonical identity 결정

```text
SourceRow --evidence_for--> Item
Item      --grouped_by----> Step
Step      --belongs_to----> Flow
Flow      --published_in--> Bundle/Flow Map  (optional grouping)
```

- Item이 완료·결정·기록·보류·일정 조정을 독립적으로 소유하는 최소 단위다.
- Step은 Item을 묶는 semantic grouping이며 완료 상태를 소유하지 않는다.
- 한 Item은 정확히 하나의 Step으로, 한 Step은 하나의 Flow로 연결한다. Bundle/Flow Map은 version 안에 0개 또는 1개인 선택적 discovery grouping이며, 있을 때 각 Flow가 그 grouping에 연결된다.
- 한 SourceRow는 둘 이상의 Item을 지지할 수 있고 한 Item은 둘 이상의 SourceRow 근거를 가질 수 있다.
- published version마다 active graph를 검증하되 stable identity registry는 version 밖에 유지한다.
- 제거된 Item은 active graph에서 빠져도 기존 개인 overlay와 실행 history 때문에 registry에서 삭제하지 않는다.

이 결정은 데이터베이스 ID 생성 방식, UUID 포맷, 테이블명, API ID를 확정하지 않는다.
stable ID collision 검사는 한 planning document 안에서 entity kind를 가로질러 적용한다. 여러 `contentId` 문서 전역 uniqueness는 production multi-content registry 결정 전까지 보장한다고 주장하지 않는다.

## 여덟 owner layer

아래 owner는 실제 조직·서비스가 아니라 승인 전 logical role이다.

| 계층 | logical read owner | logical write owner | mutability | derivation |
|---|---|---|---|---|
| SourceSnapshot | source-evidence-reader | source-ingestion-finalizer | immutable-versioned | finalized exact source evidence |
| WorkingSource | authoring-session | authoring-session | mutable-revisioned | SourceSnapshot의 명시적 working fork |
| canonical | canonical-content-reader | canonical-content-compiler | derived-immutable | 검증된 SourceRow→Flow와 선택적 Bundle projection |
| CreatorDraft | creator-draft-reader | creator-draft-editor | mutable-revisioned | creator-owned explicit draft fork |
| PublishedVersion | published-content-reader | publication-append-planner | immutable-versioned | sealed canonical payload 후보. review proof는 계약 밖 |
| PersonalOverlay | personal-copy-owner | personal-copy-owner | mutable-revisioned | inclusion/title/schedule/memo 개인 변경 |
| ExecutionRun | execution-run-owner | execution-run-owner | append-only-events | completion/skip/hold/decision/record/occurrence |
| ExportSnapshot | export-artifact-reader | projection-snapshot-builder | derived-immutable | pinned version+overlay+run+occurrence. resolution receipt는 대기 |

각 행의 `operatingOwnerAssigned`는 false다. 실제 service owner, write authority, RLS, retention, erasure는 제품 결정 뒤 별도 계약으로 만든다.

## Immutable version 결정

1. published history는 version 1부터 시작하는 단일 append-only predecessor chain이다.
2. 기존 version의 hash, sealed timestamp, active graph, edge를 변경하지 않는다.
3. current pointer 이동은 새 immutable version append와 같은 구조적 transition에서만 허용한다.
4. stable ID와 stable key binding은 기존 record를 교체하지 않는다.
5. 대상 personal copy는 pinned version pointer만 이동할 수 있다.
6. PersonalOverlay와 ExecutionRun은 canonical payload가 같아야 한다.
7. 제거 Item identity는 retained personal state와 제거 전 version에 pin된 execution history가 끝나기 전까지 registry에 남는다. 제거 version의 새 run 상태는 그 Item을 참조할 수 없다.

이 계약은 review됐음을 증명하지 않는다. Item별 added/changed/removed 결정, VersionResolution receipt, reviewer·적용 시점·권한은 production gate로 남는다. 실제 publish transaction, database lock, CAS, audit event 또는 rollback writer도 구현하지 않는다.

## P3-D subcheck 보정

`D2-026.1~.5`의 격리 PoC 통과는 유지한다. 다만 다음과 같이 production 의미를 제한한다.

| subcheck | P3-D에서 확인한 것 | P3-E에서 금지하는 확대 해석 |
|---|---|---|
| `D2-026.1` | local candidate의 immutable envelope와 무결성 fingerprint | PublishedVersion 저장·보안 서명·provider 인증 완료 |
| `D2-026.2` | Base·내 작업·새 원문 비교와 명시 선택 | production content review·권한·moderation 완료 |
| `D2-026.3` | PoC store의 unresolved·stale·tampered fail-closed | 운영 API·DB·동시성·RLS 차단 완료 |
| `D2-026.4` | 한 PoC key의 전체 resolution set·CAS/readback/rollback | production multi-table transaction·audit log 완료 |
| `D2-026.5` | PoC exact before snapshot Undo와 reload | immutable public history rollback·장기 복구 정책 완료 |

P3-E validator는 production-target 데이터 계약을 추가하지만 이 subcheck의 판정을 production 구현으로 승격하지 않는다.

## 요구사항 판정

### `D2-002` 부분 유지

전체 hierarchy와 identity collision/cycle 규칙은 planning contract에서 검증한다. 그러나 production SourceRow/Snapshot ID 발급, persisted Step grouping, Bundle/Flow Map storage, 운영 adapter는 미승인이다.

### `D2-004` 부분 유지

여덟 logical owner role과 precedence는 계획됐다. 실제 service owner, authority, storage, retention, privacy, ExportSnapshot writer는 정해지지 않았다.

따라서 두 요구사항은 E4 planning evidence가 늘어나더라도 `충족`으로 올리지 않는다.

## 11 gap 결정 묶음

| 묶음 | ID | 닫는 데 필요한 결정/증거 |
|---|---|---|
| data contract | `D2-002`, `D2-004` | 제품 identity·owner 승인 후 운영 설계 |
| visual system | `V41-001`, `D2-007` | production shell/token 공동 결정 |
| actual devices | `V41-062`, `V41-063`, `V41-066`, `D2-038`, `D2-042` | Android/iOS 실제 touch·keyboard·visualViewport |
| accessibility | `V41-064`, `D2-061` | TalkBack·VoiceOver·글자/200% 실기 |

## 아직 필요한 제품 결정

1. stable ID 발급 주체와 source canonicalization version 변경 정책
2. 여러 content 문서 전역 uniqueness를 담당할 production registry 범위
3. PublishedVersion publish authority와 review/audit owner
4. Item별 VersionResolution decision·receipt·적용 시점 계약
5. PersonalOverlay·ExecutionRun retention과 removed Item 보존기간
6. ExportSnapshot 생성·보관·폐기 owner
7. saved-plan 네 origin에 immutable Base를 제공할지 여부
8. production shell/token의 teal/cobalt 선택
9. catalog preview 상태인 dog source의 refresh 또는 대체 source 승인

이 결정 전에는 운영 migration과 production writer를 시작하지 않는다.
