# P3-F 결정 계약

## 계약 상태

- 계약 ID: `flowme-integrated-isolated-production-candidate-v1`
- 적용 범위: `/my?personalWorkspacePoc=v1`
- 분류: 교체 가능한 격리 통합 PoC 후보
- primary 승격: `V41-001`, `D2-002`, `D2-004`, `D2-007` → `충족/E4`
- production 승인: 아니오
- operating schema/writer/migration/provider sync/deploy: 없음

## 확정 결정과 미확정 운영 선택의 분리

| 주제 | 이미 확정되어 후보에 적용하는 결정 | 이번 단계에서 확정하지 않는 것 |
|---|---|---|
| visual owner | 전역 FlowMe ink/cobalt·PlatformNav, exact-query 내부 white/gray/teal·flat | 서비스 전체 token 재선택 |
| hierarchy | SourceRow→Item→Step→Flow→optional Bundle | 운영 DB migration 시점 |
| identity | UUID identity, snapshot/source-row tuple, content/kind/node tuple | 실제 발급 서비스·DB sequence |
| version | immutable published append와 stable identity | 운영 publish authority·transaction 배포 |
| personal/execution | canonical update보다 별도 owner이며 상태 보존 | 장기 retention·erasure 운영 정책 |
| export | effective projection에서 파생한 immutable snapshot | 운영 export writer·provider sync |
| authoring UI | 원문 / 구조·도구 / 결과 역할과 mobile compact 단계 | 외부 제품의 visual/brand 복제 |

## Identity 규칙

```text
source row identity  = UUID
source row key       = (snapshotId, stableKey)
content identity     = UUID contentId
node identity        = UUID
node stable binding  = (contentId, nodeKind, stableKey)
version identity     = (contentId, versionNo)
```

- 같은 stable key를 서로 다른 `nodeKind`가 쓰는 것은 허용한다.
- 같은 tuple이 서로 다른 UUID에 묶이거나 같은 UUID가 서로 다른 identity를 나타내면 실패한다.
- Item은 독립 상태를 소유한다. Step은 Item을 묶지만 completion을 소유하지 않는다.
- Bundle/Flow Map은 선택적이다. 한 content가 standalone Flow만 가져도 유효하다.
- version에서 제거된 Item도 registry와 기존 personal/execution 참조를 위해 보존한다.

이 규칙은 P3-E의 `한 planning document 안에서 kind를 가로지르는 collision` 가정을 대체한다.

## Visual owner 규칙

```text
global application shell -> existing PlatformNav + ink/cobalt
exact-query local surface -> white body + gray navigation + teal accent + flat rows
```

- 로컬 token은 component scope 밖으로 나가지 않는다.
- PlatformNav를 복제하지 않는다.
- 기본 `/my`의 route·DOM·style·writer를 바꾸지 않는다.
- teal/cobalt 중 하나를 전역 token으로 다시 선택하지 않는다.

## 여덟 plane 규칙

1. SourceSnapshot은 finalized immutable evidence다.
2. WorkingSource는 명시적으로 분기한 mutable authoring source다.
3. canonical content는 검증된 source에서 결정적으로 파생한다.
4. CreatorDraft는 creator가 명시 저장하는 별도 revision이다.
5. PublishedVersion은 append-only immutable record다.
6. PersonalOverlay는 개인 제목·메모·폴더·날짜·순서·포함 여부를 소유한다.
7. ExecutionRun은 완료·skip·hold·decision·record·occurrence를 소유한다.
8. ExportSnapshot은 pinned version, reviewed resolution, overlay, run, occurrence에서 파생한 immutable envelope다.

P3-F 후보는 각 plane의 record와 mutation 권한을 구분한다. 실제 조직·서비스 owner, RLS, 보존기간, erasure workflow를 배포했다고 주장하지 않는다.

## Version transition 규칙

1. 새 PublishedVersion은 predecessor 뒤에 append한다.
2. 기존 version과 identity binding은 변경하지 않는다.
3. explicit resolution을 적용한 effective projection만 pointer 이동 후보가 된다.
4. PersonalOverlay와 ExecutionRun payload는 pointer 이동 전후 동일하다.
5. 새 version에서 제거된 Item은 새 run state의 대상이 될 수 없다.
6. ExportSnapshot은 입력 refs와 hash를 고정하고 외부 writer를 호출하지 않는다.
7. 교차-owner write, stale base, incomplete resolution은 전체 transition을 거부한다.

## Primary verdict 계약

P3-F는 네 요구사항의 제품 의미가 운영에 완전히 구현됐다고 판정하지 않는다. 다음 좁은 의미로만 승격한다.

| ID | verdict | evidence | decision |
|---|---|---|---|
| `V41-001` | 충족 | E4 | 격리 PoC 승인 |
| `D2-002` | 충족 | E4 | 격리 PoC 승인 |
| `D2-004` | 충족 | E4 | 격리 PoC 승인 |
| `D2-007` | 충족 | E4 | 격리 PoC 승인 |

남은 primary gap은 `V41-062`, `V41-063`, `V41-064`, `V41-066`, `D2-038`, `D2-042`, `D2-061`뿐이다.

## Subcheck 계약

P3-E에서 네 부모를 이미 21개 subcheck로 나눴다. P3-F는 새 subcheck를 추가하지 않고 그중 E4 미달 10개에만 override를 적용한다.

- `V41-001.1`, `V41-001.3`
- `D2-002.3`, `D2-002.5`, `D2-002.6`
- `D2-004.5`, `D2-004.8`
- `D2-007.1`, `D2-007.2`, `D2-007.4`

## 금지되는 확대 해석

- 운영 schema, SQL, RLS, API 또는 migration이 구현됐다.
- 기존 saved-plan writer가 canonical writer로 전환됐다.
- provider fetch/sync 또는 public publish가 구현됐다.
- 전역 디자인 token을 바꿨다.
- 실제 Android/iOS·TalkBack·VoiceOver를 검사했다.
- Preview 또는 Production에 배포했다.

위 문장은 모두 false로 유지한다.

## 검증 종료 상태

- candidate data 26개와 product shell 6개: `32/32` 통과
- P2-B~P3-F additive trace: `45/45` 통과
- 전체 `npm test`: `2,126/2,126` 통과, 12개 Node invocation
- production build: static page `18/18` 통과
- 최종 Playwright: `77/77` 통과(6개 spec, Stage 3 포함)
- docs check: 필수 파일 16개, 로컬 링크 `4,632/4,632` 통과
- security audit: 실패, 취약점 2건(`browserslist` 고위험 1, `postcss-selector-parser` 낮음 1), 자동 수정 미실행

보안 감사 실패와 실제 기기·보조기술 미실행 때문에 이 계약은 Production 승인으로 전환되지 않는다. 검증 수치가 운영 schema·writer·migration·provider sync 또는 배포를 승인하지도 않는다.
