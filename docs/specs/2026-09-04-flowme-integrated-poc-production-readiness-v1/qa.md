# P3-E QA 계약과 현재 증거

## 현재 확정 증거

이번 문서 작성 시점에 P3-E 코드 대상으로 확인한 결과만 적는다.

| 검증 | 상태 | 실제 실행 수 | 범위 |
|---|---:|---:|---|
| production-target planning contract focused | 통과 | 24/24 | 계약 경계, 두 정상 version, standalone Flow, structural append transition, 제거 Item 보존, future·removed Item run 차단, stored history 순서, prototype input, invalid/collision/cycle/history·state 변조 |
| P3-D canonical + P3-E planning contract 결합 focused | 통과 | 35/35 | 기존 PoC adapter와 새 production-target planning 경계의 비충돌 |
| P3-E 문서 내부·정본 링크 검사 | 통과 | 16/16 | 새 문서 6개의 로컬 Markdown link target 존재 확인 |

두 실행은 일부 테스트를 공유하므로 59개 독립 테스트로 합산하지 않는다. P3-E 고유 실행 수는 24개다.

## 순수 계약 판정 기준

1. `contractVersion`이 정확하지 않거나 알려지지 않은 key가 있으면 실패한다.
2. `operatingSchemaOwned`, `runtimeWriterImplemented`, `migrationImplemented`는 모두 false다.
3. stable ID는 한 planning document 안에서 kind를 넘어 충돌이 없어야 한다.
4. stable key는 `(planning document, kind)` 범위에서 하나의 ID만 가리킨다.
5. 각 published version은 SourceRow→Item→Step→Flow로 이어지며 Bundle/Flow Map은 0개 또는 1개의 선택적 grouping이다.
6. dangling endpoint, relation-kind 불일치, duplicate edge, cycle을 차단한다.
7. published history는 `versionNo=1`에서 시작하는 단일 predecessor chain이다.
8. current pointer는 마지막 sealed immutable version을 가리킨다.
9. 새 version 적용은 기존 version record와 identity registry record를 변경하지 않는다.
10. 구조적 transition에서 대상 personal copy의 pinned pointer 외 copy payload는 바뀌지 않는다. review 결정과 VersionResolution receipt는 검증하지 않는다.
11. personal overlay와 ExecutionRun canonical payload는 그대로다.
12. removed Item은 active graph에서 빠질 수 있지만 registry, 개인 overlay, 제거 전 version에 pin된 실행 history에서는 유지된다.
13. 개인 overlay는 pinned version보다 미래에 생긴 Item을 참조할 수 없다.
14. ExecutionRun의 Item 상태는 자신의 content version에서 active인 Item만 참조한다. 따라서 미래 Item뿐 아니라 그 version에서 제거된 Item도 새 참조로 받지 않는다.
15. published history 배열 자체가 versionNo와 predecessor append 순서여야 한다.
16. public validator는 plain object 또는 null-prototype object만 받고 custom prototype 입력은 거부한다.

여러 `contentId` 문서에 걸친 ID uniqueness는 이 validator의 판정 범위가 아니다. production multi-content registry 범위와 VersionResolution decision/receipt는 제품 결정 대기다.

## Negative matrix

| 입력 | 기대 결과 |
|---|---|
| unknown contract version | `unsupported-contract-version` |
| 운영 schema 소유 주장 또는 unknown owner key | `invalid-document` |
| 한 planning document 안의 cross-kind stable ID collision | `identity-id-collision` |
| kind-scoped stable key collision | `stable-key-collision` |
| dangling endpoint | `edge-endpoint-invalid` |
| 잘못된 kind relation | `edge-relation-invalid` |
| graph cycle | `identity-cycle` |
| non-linear history | `version-history-not-linear` |
| 잘못된 current pointer | `current-version-invalid` |
| 기존 version hash 변경 | `existing-version-mutated` |
| 기존 identity 교체 | `identity-registry-mutated` |
| 개인 overlay 변경 | `personal-overlay-mutated` |
| execution/occurrence 변경 | `execution-run-mutated` |
| 외부 Item ref | `personal-overlay-invalid` 또는 `execution-run-invalid` |
| older version보다 미래인 Item overlay/run ref | `personal-overlay-invalid` 또는 `execution-run-invalid` |
| run content version에서 제거된 Item ref | `execution-run-invalid` |
| custom prototype에 숨긴 unknown owner field | `invalid-document` |

## 최종 자동 검증

| 검증 | 상태 | 실제 실행 수 | 판정 범위 |
|---|---:|---:|---|
| P3-E package script | 통과 | 24/24 | production-target planning contract |
| P3-D canonical 결합 | 통과 | 35/35 | 기존 PoC adapter와 새 계약 비충돌 |
| dog source focused | 통과 | 121/121 | mismatch·preview hold·seed 날짜 보존 |
| P2-B~P3-E trace asset | 통과 | 37/37 | 254개 추적 row, primary gap 11 유지 |
| 전체 `npm test` | 통과 | 2,094/2,094 | 11개 Node test invocation |
| production build | 통과 | 18/18 | compile·type·static route |
| 전체 docs check | 통과 | 필수 16개·로컬 링크 4,617개 | skill sync와 문서 링크 |
| PoC + local report browser | 통과 | 3/3 | 필수 5 viewport, keyboard, Undo, reload, 오류·가림·overflow 0 |
| 운영 bytes 불변 | 통과 | browser 1개 end-to-end 시나리오 | prefix 밖 set/remove 0, clear 0, non-PoC bytes 동일 |
| dependency security audit | 실패 | 취약점 2건 | `browserslist` high 1, `postcss-selector-parser` low 1; 자동 수정 미실행 |

## Dog catalog-preview hold

`dog-adoption-first-week:review_due:2026-06-04`의 source mismatch 감사는 완료됐고 disposition은 `catalog_preview`다. 전체 회귀는 green이지만 이 결과가 해당 Flow의 production eligibility를 뜻하지는 않는다. 콘텐츠 refresh 또는 대체 source 승인이 끝날 때까지 일반 사용자 production 경로에는 포함하지 않는다.

## 자동 검증과 실기 분리

- Android Chrome: 미실행
- iOS Safari: 미실행
- TalkBack: 미실행
- VoiceOver: 미실행
- OS 최대 글자 및 browser 200%: 미실행
- 관찰 사용자: 0명

자동 테스트, Chromium viewport, screenshot은 위 항목을 대체하지 않는다.
