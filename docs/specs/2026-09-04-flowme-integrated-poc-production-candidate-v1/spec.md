# FlowMe 통합 PoC P3-F production candidate 계약

## 현재 판정

- 단계: P3-F
- 범위: `/my?personalWorkspacePoc=v1` 안의 교체 가능한 격리 통합 PoC 후보
- primary 판정: `138/4/3/11/12`, gap 7
- 이번 단계 승격: `V41-001`, `D2-002`, `D2-004`, `D2-007`을 격리 통합 PoC `충족/E4`로만 승격
- Production ready: false
- 운영 schema·writer·migration·provider sync·배포: 미실행
- 실제 Android Chrome·iOS Safari·TalkBack·VoiceOver: 미실행
- 관찰 사용자: 0명
- 자동 검증: candidate+shell `32/32`, additive trace `45/45`, 전체 `npm test` `2,126/2,126`(12개 Node invocation), production build `18/18`, 최종 Playwright `77/77`(6개 spec, Stage 3 포함), docs `4,632/4,632` 통과
- 보안 감사: 실패 — 취약점 2건(`browserslist` 고위험 1, `postcss-selector-parser` 낮음 1), 자동 수정 미실행

이 문서의 `production candidate`는 승인된 제품·데이터 계약을 운영 경계를 건드리지 않는 후보에서 연결해 검증한다는 뜻이다. 운영 구현, 운영 migration 또는 배포 완료를 뜻하지 않는다.

보안 감사 실패는 별도 release risk다. 이를 숨기거나 일곱 primary gap에 합산하지 않으며, 의존성 수정과 전체 재검증 전에는 Production 준비 근거로 사용할 수 없다.

## 목표

P3-E에서 `부분`으로 남긴 네 요구사항을 새 정책 추정으로 닫지 않고, 이미 확정된 정본을 격리 후보에 적용해 다음을 증명한다.

1. 전역 FlowMe shell과 exact-query 개인공간 surface의 시각 owner를 분리한다.
2. `SourceRow → Item → Step → Flow → Bundle/Flow Map` identity를 다중 content 후보에서 검증한다.
3. SourceSnapshot부터 ExportSnapshot까지 여덟 plane의 owner와 변경 경계를 한 통합 흐름에서 검증한다.
4. 작성 구조는 외부 제품의 브랜드가 아니라 세 영역의 역할만 참고한다.
5. 기본 `/my`, 기존 운영 저장 key/schema/writer와 기존 네 saved-plan origin의 원본을 그대로 둔다.

## 정본 우선순위

1. [Canonical Flow Data Model v1](../2026-07-11-canonical-flow-data-model/spec.md)
2. [Canonical Storage and Backend API Contract v1](../2026-07-11-canonical-flow-data-model/storage-api-contract.md)
3. [서비스 구조](../../SERVICE_STRUCTURE.md)
4. [P3-E readiness 계약](../2026-09-04-flowme-integrated-poc-production-readiness-v1/spec.md)
5. [A0 범위 결정](../2026-09-02-flowme-integrated-poc-gap-closure-v1/a0-decision-record.md)
6. [통합 Product UX 계약](../2026-09-03-flowme-integrated-poc-product-ux-pass-v1/design-contract.md)

P3-E planning contract가 위 정본과 다르면 정본을 따른다.

## P3-E 가정 정정

### 1. 전역 token 재선택은 필요하지 않다

`teal`과 `cobalt` 중 하나를 서비스 전체 token으로 다시 고르는 문제가 아니다.

- 전역 운영 shell: 기존 `PlatformNav`와 승인된 ink/cobalt 체계를 유지한다.
- exact-query 개인공간 surface: 흰 본문·회색 탐색·teal 강조·평면 행을 사용한다.
- 로컬 surface token이 전역 token을 덮어쓰지 않는다.
- 기본 `/my`를 다시 디자인하지 않는다.

### 2. identity collision은 document 전체 kind 공통 범위가 아니다

정본 범위는 다음과 같다.

```text
SourceRow stable key: (snapshotId, stableKey)
Canonical node stable key: (contentId, nodeKind, stableKey)
Canonical identity: UUID primary key
Published version: (contentId, versionNo)
```

따라서 같은 문자열 stable key를 서로 다른 node kind가 사용하는 것은 충돌이 아니다. 같은 `(contentId, nodeKind, stableKey)`가 다른 UUID를 가리키거나, 같은 UUID가 다른 canonical identity를 가장할 때 실패한다.

## 네 요구사항의 격리 후보 계약

| 요구사항 | P3-F 수용 조건 | 판정 범위 |
|---|---|---|
| `V41-001` | 전역 PlatformNav 1회, exact-query 내부의 흰/회색/teal·평면 목록, 폴더→날짜→완료, 48px 이상 단일 주 행동, 필수 viewport의 overflow·가림·console/page error 0 | 격리 통합 PoC `충족/E4` |
| `D2-002` | 다중 `contentId`, UUID identity, Snapshot별 SourceRow key, `(contentId,nodeKind)`별 node key, Item 최소 상태, Step 무상태 그룹, optional Bundle·standalone Flow, version append 뒤 identity 보존, invalid graph fail-closed | 격리 통합 PoC `충족/E4` |
| `D2-004` | 여덟 plane 별도 record·owner, deterministic precedence, PublishedVersion 불변, source update 뒤 PersonalOverlay·ExecutionRun 보존, derived immutable ExportSnapshot, cross-owner mutation 차단 | 격리 통합 PoC `충족/E4` |
| `D2-007` | FlowMe navigation·전역 token 유지, 원문/구조·도구/결과 역할만 참고, compact 2-state, sticky CTA 비가림, 외부 브랜드 복제 없음 | 격리 통합 PoC `충족/E4` |

## 데이터 plane과 owner

| plane | 후보 write owner | 후보 규칙 |
|---|---|---|
| SourceSnapshot | source finalizer | finalized record는 immutable |
| WorkingSource | authoring session | source snapshot의 명시적 working fork |
| canonical content | deterministic compiler | 검증된 source에서 파생, 사용자 상태 없음 |
| CreatorDraft | creator draft editor | 개인공간과 분리된 revision |
| PublishedVersion | publication append candidate | 기존 version을 수정하지 않고 append |
| PersonalOverlay | personal copy owner | 제목·메모·폴더·날짜·순서·포함 여부 |
| ExecutionRun | execution owner | 완료·skip·hold·decision·record·occurrence |
| ExportSnapshot | projection snapshot builder | pinned version+reviewed resolution+overlay+run+occurrence의 불변 파생물 |

ExportSnapshot은 이번 단계에서 새 export writer나 외부 provider 호출을 만들지 않는다. 후보 안의 불변 파생 envelope와 receipt 연결만 검증한다.

## 보호 경계

- PoC 진입점은 `/my?personalWorkspacePoc=v1` exact-query다.
- 쓰기는 `flow:poc:personal-workspace:v1:*`에만 허용한다.
- 기존 네 saved-plan origin은 읽기와 projection에만 사용한다.
- 운영 `flow:*` key/value, 기본 `/my`, 기존 writer를 변경하지 않는다.
- `localStorage.clear()`를 호출하지 않는다.
- 잘못된 query, unsupported origin, corrupt/future payload, identity collision, dangling/mistyped edge, cycle, cross-owner mutation은 fail-closed한다.
- drag, 길게 누르기, `…` 메뉴, keyboard 이동은 같은 transition을 사용한다.
- 후보의 모든 추가 계약은 제거 가능한 모듈·fixture·test로 둔다.

## 남은 7개 gap

| 요구사항 | 판정 | 닫는 데 필요한 실제 증거 |
|---|---|---|
| `V41-062` | 미충족 | 실제 Android Chrome의 길게 누르기·목적지·문맥 메뉴·scroll conflict |
| `V41-063` | 미충족 | 실제 iOS Safari의 gesture·safe area·문맥 메뉴·scroll conflict |
| `V41-064` | 미충족 | TalkBack·VoiceOver·OS 최대 글자·browser 200%·장시간 사용 |
| `V41-066` | 부분 | 실제 Android/iOS touch 이동과 cancel |
| `D2-038` | 부분 | 실제 Android/iOS 가상 키보드 위 anchor·scroll·닫기·적용 |
| `D2-042` | 부분 | 320·360·200%와 실제 visualViewport·caret·마지막 field·CTA |
| `D2-061` | 부분 | 전체 Tab·Escape focus return·reduced motion·실제 keyboard·보조기술 |

자동 테스트, Chromium touch simulation, viewport screenshot은 이 일곱 gap의 실기 증거를 대신하지 않는다.

## 제외

- 운영 SQL·RLS·API·schema·migration
- 기존 writer 변경 또는 provider sync
- public publish와 운영 ExportSnapshot writer
- 기본 `/my` 또는 전역 디자인 시스템 변경
- 실제 기기·보조기술 검사를 실행했다고 주장하는 일
- commit, push, PR, Preview, Production

## 성공 기준

1. 네 부모만 `부분 → 충족/E4`로 바뀌고 다른 primary 판정은 변하지 않는다.
2. 집계가 정확히 `138/4/3/11/12`, gap 7이다.
3. 전역 cobalt와 로컬 teal의 owner가 동시에 유지된다.
4. collision 규칙이 `(snapshotId,stableKey)`와 `(contentId,nodeKind,stableKey)`를 따른다.
5. 여덟 plane의 교차-owner write가 실패하고 개인·실행 상태가 version append 뒤 보존된다.
6. 기본 `/my`와 운영 key/value가 전후 byte-for-byte 동일하다.
7. Production ready, 운영 schema/writer/migration/provider sync/deploy는 모두 false로 남는다.
