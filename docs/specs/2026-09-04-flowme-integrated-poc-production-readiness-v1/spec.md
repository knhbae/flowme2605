# FlowMe 통합 PoC P3-E production readiness 계약

## 현재 판정

- 상태: P3-E planning contract·추적표·검증 리포트와 자동 회귀 완료, 제품 결정·실기 검증 대기
- 이번 단계의 확정 근거: production-target focused 24/24, P3-D canonical 결합 35/35, 전체 `npm test` 2,094/2,094, production build 18/18, trace 37/37, browser 3/3
- 저장소 기능 회귀: green. 다만 dependency security audit의 high 1건·low 1건은 미해결
- Production 승격: 보류

이 문서에서 `production-target`은 운영 전환을 검토하기 위한 교체 가능한 계획 계약을 뜻한다. 운영 schema, 서비스 owner, writer, migration, publish 또는 배포가 구현되었다는 뜻이 아니다.

## 목표

P3-D가 격리 PoC에서 검증한 원문 업데이트와 소유권 경계를 운영 제품으로 확대 해석하지 않도록 다음 단계를 고정한다.

1. `SourceRow → Item → Step → Flow`의 stable identity와 선택적 `Bundle/Flow Map` grouping을 versioned planning contract로 표현한다.
2. SourceSnapshot부터 ExportSnapshot까지 여덟 계층의 논리 owner, 변경 가능성, 파생 규칙을 명시한다.
3. immutable published history 추가 시 기존 version, 개인 overlay, 실행·회차 이력을 변경하지 않는 순수 validator를 둔다.
4. 남은 11개 gap의 선행관계를 계약·디자인·실기 검증으로 분리한다.
5. 날짜 기반 dog source-review 실패를 기능 계약과 분리하되 저장소 승격 hold로 유지한다.

## 정본 우선순위와 충돌 해소

1. [Canonical Flow Data Model v1](../2026-07-11-canonical-flow-data-model/spec.md)이 새 데이터 계약의 정본이다.
2. [Creator Publish Gate and Step Contract](../2026-06-26-creator-publish-step-contract/spec.md)의 Step-first 표현은 역사적 route/export 호환 어댑터로만 유지한다.
3. [Collaborative Authoring & Editability Strategy](../2026-07-29-collaborative-flow-authoring-editability-strategy-v1/spec.md)의 hybrid operating model은 owner 검토 전 권고안이다.
4. [P3-D 원문 업데이트·소유권 계약](../2026-09-04-flowme-integrated-poc-source-update-ownership-v1/spec.md)은 exact-query와 PoC prefix 안의 실행 증거다.
5. [P3-E production-target planning contract](../../../lib/flow/personal-workspace-poc-production-target-contract.ts)는 위 정본을 운영 schema로 구현하지 않고 사전 검증하는 코드 계약이다.

따라서 Item이 최소 독립 상태 단위이고 Step은 Item의 의미 묶음이다. P3-E는 실제 데이터베이스나 배포 서비스를 owner로 지정하지 않는다.

## 보호 경계

- 기본 `/my`와 기존 운영 key/schema/writer를 변경하지 않는다.
- PoC 제품 동작은 계속 `/my?personalWorkspacePoc=v1` exact query와 `flow:poc:personal-workspace:v1:*`에 한정한다.
- P3-E planning contract와 validator는 순수 함수이며 localStorage, 네트워크, 계정, cloud, publish, export writer를 호출하지 않는다.
- 운영 migration, SQL, RLS, API, provider sync, production write를 만들지 않는다.
- 잘못된 version, 알려지지 않은 key, identity collision, dangling/mistyped edge, cycle, history 변조는 fail-closed한다.
- validator 입력은 plain object 또는 null-prototype object만 허용하며 상속된 unknown field가 있는 객체도 fail-closed한다.
- 개인 overlay와 ExecutionRun은 version pointer 이동 과정에서 canonical payload가 달라지면 실패한다.
- 제거된 Item은 개인 상태와 실행 이력이 참조할 수 있도록 identity registry에 남긴다.
- 개인 overlay는 pinned version 시점까지 생성된 retained Item을 참조할 수 있다. ExecutionRun은 자신의 content version에서 active인 Item만 새 상태로 참조한다.

## 남은 11개 gap과 선행관계

P3-D 이후 primary 요구사항의 `부분 8 + 미충족 3`이 다음 11개다.

| 그룹 | 요구사항 | 현재 의미 | 선행관계 |
|---|---|---|---|
| identity | `D2-002` | production-target 전체 계층 계약은 생겼지만 운영 ID/schema는 미승인 | P3-E validator → 제품 owner 승인 → 저장 설계 |
| owner | `D2-004` | 여덟 논리 역할은 정했지만 실제 서비스 owner는 미지정 | `D2-002` 승인 뒤 owner·권한·보존기간 결정 |
| design | `V41-001` | v4 문법은 보존하지만 teal/cobalt 운영 token 미결정 | product shell/token 공동 디자인 결정 |
| design | `D2-007` | compact 구조는 있으나 production shell 미결정 | `V41-001`과 같은 결정에서 함께 닫음 |
| Android | `V41-062` | 수정 후 Android Chrome 실기 증거 없음 | final shell/token과 안정 build 뒤 실행 |
| iOS | `V41-063` | iOS Safari 실기 증거 없음 | final shell/token과 안정 build 뒤 실행 |
| accessibility | `V41-064` | screen reader·글자·browser 확대 실기 증거 없음 | final UI 뒤 TalkBack·VoiceOver·zoom 실행 |
| touch | `V41-066` | 자동 pointer 계약은 있으나 실제 touch 이동·cancel 없음 | Android/iOS 세션에서 함께 검증 |
| keyboard | `D2-038` | 실제 가상 키보드의 anchor·scroll·닫기·적용 미검증 | Android/iOS 세션과 같은 build에서 검증 |
| small screen | `D2-042` | 실제 keyboard/visualViewport에서 마지막 내용·CTA 미검증 | `D2-038`과 같은 시나리오로 검증 |
| unified editor | `D2-061` | 자동 접근성·reflow는 있으나 실기 screen reader/200% 미검증 | `V41-064`와 같은 실기 접근성 세션 |

### 권장 실행 순서

```text
D2-002 planning contract
  → product identity decision
  → D2-004 operating owner/authority decision
      → 운영 저장·migration 설계(이번 단계 제외)

V41-001 + D2-007 shell/token decision
  → stable candidate build
  → Android/iOS: V41-062, V41-063, V41-066, D2-038, D2-042
  → accessibility: V41-064, D2-061
```

실기 검사 결과가 디자인 문제를 발견하면 design gate로 돌아간다. 자동 브라우저는 이 실기 근거를 대신하지 않는다.

## Dog catalog-preview hold

기존 날짜 기반 감사 항목 `dog-adoption-first-week:review_due:2026-06-04`는 P3-E identity/owner 코드와 직접 관련 없는 콘텐츠 항목이다. 감사 결과는 `catalog_preview`로 정리됐으며 production 일반 실행에는 아직 적합하지 않다.

- 테스트 날짜를 임의로 바꾸지 않고 source mismatch를 그대로 남긴다.
- catalog preview 노출은 유지하되 일반 사용자 production 경로에는 포함하지 않는다.
- focused contract, 저장소 회귀, 콘텐츠 production eligibility를 각각 분리한다.
- 콘텐츠 refresh 또는 새 source 승인이 끝나기 전에는 이 Flow를 근거로 Production readiness를 선언하지 않는다.

## 범위

### 포함

- versioned production-target planning contract
- stable identity registry와 version별 active identity graph
- 여덟 owner layer의 logical responsibility
- immutable published history append 검증
- 개인 copy pointer 이동과 overlay/run 보존 검증
- collision, dangling edge, cycle, history tamper negative fixtures
- 11개 gap dependency map과 P3-D subcheck 해석 보정

### 제외·보류

- production schema·SQL·RLS·API·migration
- 실제 service/repository owner 지정
- public publish·ExportSnapshot writer·provider sync
- 운영 `/my` 또는 saved-plan writer 변경
- production shell/token 확정
- Android Chrome·iOS Safari·TalkBack·VoiceOver 실기
- 관찰 사용자 검증
- commit, push, PR, Preview, Production

## 성공 기준

1. planning contract가 자신을 운영 schema나 승인된 production contract로 표현하지 않는다.
2. 모든 version의 graph가 SourceRow에서 Flow까지 완전하고 acyclic하며 Bundle/Flow Map은 0개 또는 1개의 선택적 grouping이다.
3. 한 planning document 안에서 kind를 가로지르는 stable ID와 kind-scoped stable key collision을 차단한다. 여러 content 문서 전역 uniqueness는 별도 production registry 결정으로 남긴다.
4. published history는 1부터 시작하는 단일 predecessor append이며 기존 record를 수정하지 않는다.
5. 구조적 version transition은 대상 copy의 pointer만 옮기고 personal overlay와 execution payload를 보존한다. review 결정과 VersionResolution receipt는 이 계약의 증거가 아니다.
6. 제거된 Item의 identity와 기존 개인·실행 참조가 유효하게 남는다.
7. P3-D subcheck 통과를 production transaction 증거로 확대하지 않는다.
8. focused, full test, build, docs, browser, actual device, observed user 결과를 각각 분리한다.

1~7의 순수 계약과 전체 test/build/docs/browser 근거를 확보했다. production multi-content registry, review 결정·VersionResolution receipt, 실제 owner, final shell/token, Android/iOS·보조기술 실기는 [QA 문서](./qa.md)의 미결정·미실행 항목이다. 이 때문에 `Production ready` 판정은 false다.
