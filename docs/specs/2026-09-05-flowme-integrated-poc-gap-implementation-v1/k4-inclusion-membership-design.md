# K4-D — 현재 사본의 포함·제외·복원 검증 패키지

상태: **설계 시뮬레이션 12/12 PASS, 제품 API·저장·UI 미구현**. 2026-09-06 검증. 다음 구현 후보는 현재 검증된 동일 사본 catalog를 대상으로 하는 메모리 읽기 preview다. 전체 0개 포함, 새 source Item의 기본 포함 여부, imported catalog 밖 복원은 이번에 결정하지 않는다.

## 1. 요구와 실제 근거

| 근거 | 직접 확인한 요구 | 이번 범위와 구분 |
| --- | --- | --- |
| [구현 계획 §11](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md#11-k4--필드-계약대체-결정-정리), [개선 설계 §8](../2026-09-05-flowme-integrated-poc-ux-audit-v1/improvement-design.md#8-설계-gate-지금-추정-구현하지-않을-것) | 포함/제외/복원 상태, identity·기준·완료 보존을 먼저 순수 시뮬레이션으로 검증. 제품 연결과 구분 | 이 문서와 신규 test만 작성. 운영 writer·기존 schema 변경 없음 |
| D1 실제 HTML (로컬 전용 근거: `../../../../flow-mvp/docs/content-audit/2026-08-19-flowme-after-end-to-end-ui-scenarios-ko.html`), 848–909행 | 현재 선택/전체 수, 구간별 포함 수, 원문 완료 기준, Item 임시 반영 뒤 Plan 마지막 확정 | 예시의 24/24는 현재 제품 데이터나 0개 저장 허용의 근거가 아님 |
| 같은 D1 HTML, 1201–1245행 | 반복 계획의 포함 회차 및 한 회차의 날짜·메모 조정 | KI03은 source Item 전체를 숨겼다 복원할 때 기존 회차를 보존하는 검사다. **개별 occurrence 포함 선택은 검증하지 않음** |
| D1 편집 정본 (로컬 전용 근거: `../../../../flow-plan-edit-trash-structure-unification-20260813/docs/specs/2026-08-13-plan-edit-trash-structure-unification/spec.md`), 23–35·60–74행 | 네 origin의 staged Plan→Item 거래, 실제 날짜 의도, identity/run/occurrence/export UID 보존, reload 결과 일치 | 원본의 운영 연결·무새schema 경계와 격리 PoC의 새 field/version 설계를 혼동하지 않음. 실제 저장·reload·export 필터 연결은 후속 |
| [P3-F 결정](../2026-09-04-flowme-integrated-poc-production-candidate-v1/decision-contract.md), 61–82행 | PersonalOverlay는 개인 포함 여부, ExecutionRun은 완료·회차를 소유. SourceSnapshot과 WorkingSource 분리 | 개인 overlay 소유 여부를 다시 미정으로 돌리지 않음. 구체 저장 field와 버전은 아직 고정하지 않음 |
| [K4 필드 계약 §3·§5](./k4-field-contract-design.md#3-포함제외복원--순열과-membership을-분리) | 전체 순열과 membership 분리, imported 사전 제외, current/Undo/legacy 검증 | 아래의 작은 읽기 범위와 후속 저장 gate를 분리 |

이 작업에서는 위 원본 파일과 현재 코드의 해당 부분을 읽었다. 실제 원본 대화 전체를 재조회한 것은 아니다.

## 2. owner와 보존 단위

개념상 `C`는 현재 검증된 사본의 **전체 Item catalog**, `O`는 `C`의 exact full-ref 순열, `I`는 미리 볼 포함 subset이다. 저장 field 이름을 확정하는 표기가 아니다.

- `O`를 줄여 제외를 표현하지 않는다. `I`가 달라져도 `C`, `O`, Step 소속, 원문 순서는 그대로 둔다.
- identity는 `savedCopyId + flowId + itemId`에서 나온 exact ref다. 동명 제목, 같은 구간 이름, local id, 배열 index로 owner를 만들지 않는다.
- source 설명·완료 기준과 개인 메모는 별도다. 빈 메모, 공백, CRLF와 명시적인 같은 날짜 fixed pin·unscheduled를 그대로 보존한다.
- Plan 포함에서 제외해도 실행일, timeline 표시 정책, 완료, occurrence ID와 회차별 완료·이동 기록을 지우거나 다시 만들지 않는다. `timelinePolicy: excluded`, 휴지통, 영구 삭제를 재사용하지 않는다.
- 현재 시뮬레이션은 반복 행의 `sourceItemRef`로 전체 series를 골라낸다. 한 occurrence만 제외하는 별도 단위는 아직 설계·구현 gate이며, D1의 포함 회차 요구가 충족되었다고 하지 않는다.

현재 [React state](../../../lib/flow/personal-workspace-poc-state.ts) 328–379행은 overlay unknown field를 거절하고, 742–747행은 전체 순열을 검증한다. [Plan editor](../../../lib/flow/personal-workspace-poc-plan-editor.ts) 789–817행과 [Result](../../../lib/flow/personal-workspace-poc-result-projection.ts) 1135–1140행도 전체 Item 집합을 요구한다. standalone P의 `fullPermutation`/`normalizeStructureDraft` 역시 subset order를 허용하지 않는다. 이 경계를 약화하지 않는다.

## 3. 상태표

| 상태/행동 | 표시·소유 의미 | 쓰기 및 보존 | 이번 검증 |
| --- | --- | --- | --- |
| 현재 포함 | 현재 사본 catalog와 전체 순서에서 읽음 | 입력 원본·개인 상태 그대로 | 실제 reader/Result 사용 |
| 제외 후보 | 부모 초안에서 `I`만 줄이고 제외될 행도 보유 | source/state/전체 order 변경 0 | test-local preview |
| 다시 포함 후보 | 같은 exact ref를 `I`에 다시 넣음 | 새 id·기준·메모·완료 초기값 생성 0 | subset→restore exact |
| 취소 또는 owner 변화 | 메모리 ticket 폐기. 관측 A→B→A에도 재사용 금지 | 쓰기 0, 자동 재기준화 없음 | test-local cancel/drift |
| 제외 저장 완료 | 별도 membership intent가 확정된 상태 | 전체 catalog와 개인/실행 정보를 계속 보유 | **미구현** |
| 저장 실패·복구 | 입력/선택 유지, 현재 저장 owner의 검증 결과 우선 | 다른 데이터 덮기 금지, 불확실하면 완료 안내 금지 | **새 membership 저장 미검사** |
| 실제 Undo·reload | 거래 직전 전체 상태/metadata를 복원하고 같은 결과 사용 | revision·identity·원문 손실 없음 | 기존 API의 제약만 검사. 새 membership Undo/reload 미구현 |

개수는 현재 catalog의 Item 기준 `선택 n / 현재 사본 m`으로 설명할 수 있다. 반복 row 수는 별도이며, 지금 자료로 `원문 전체 m`이라고 단정하지 않는다. 순수 검사는 실제 Result의 행을 골라 보여 주는 실험이다. 포함 subset으로 Text/Todo/Calendar/Sheet나 다운로드 결과를 새로 만드는 제품 코드를 구현한 것은 아니다.

## 4. origin·원문 변화 경계

### 현재 사본 안에서 확인한 범위

실제 reader로 `source-backed-map`, `personal-draft`, `canonical-personal-copy`, `legacy-saved-plan` 네 origin을 만들고 각 사본의 full-ref catalog를 검사했다. 실제 authoring materializer는 별도 반복 fixture를 공급한다. 이 사실은 각 origin의 새 저장 capability를 부여하지 않는다.

[read-model](../../../lib/flow/personal-workspace-poc-read-model.ts) 1189–1201행은 Map의 `includedStepIdsByFlow`/`excludedStepIdsByFlow`로 **PoC catalog 생성 전에** 원문 항목을 걸러낸다. KI08의 원문 bundle에는 3개가 있지만 현재 Map 사본 catalog에는 2개만 있다. 빠진 항목은 이번 복원 대상이 아니다.

[기존 Map Result](../../../lib/flow/effective-flow-map-result.ts) 187–284행에는 excluded/canonical rows를 읽는 별도 경로가 있다. 이를 재사용해 바깥 catalog까지 복원하려면 actual imported owner와 source identity를 검증하는 읽기 DTO gate가 필요하다. 제목이나 원문 문자열로 빠진 row를 합성하지 않는다.

### 기존 C2와 새 membership을 구분

KI09는 실제 C2의 source 추가, 삭제 수용 후 retained ref, 실제 source Undo가 계속 동작함을 확인한다. 개인/실행 frame도 변경하지 않는다. **K4가 없던 기존 C2를 전면 미지원으로 바꾸지 않는다.**

열린 K4 preview는 source raw/version, catalog, 개인 상태 또는 관측 generation이 바뀌면 옛 ticket을 폐기한다. 새로 읽는 것은 명시 재조회다. 이는 **열린 세션의 freshness**만 해결한다.

향후 저장된 membership이 있는 상태에서 source에 새 Item이 추가되면 별도의 재조정 계약이 필요하다. whitelist는 새 Item을 제외하고 blacklist는 포함하는 차이가 있으므로 저장 이름만 정해서 해결할 수 없다. `source use-incoming` 선택을 개인 포함 동의로 간주하지도 않는다. 초기/current 및 candidate의 올바른 source pair와 reachable Undo를 검사하면서, 새 Item 기본값 또는 명시 선택 절차를 정해야 한다. 이 선택 전에는 committed membership의 source 변화를 지원 완료로 표시하지 않는다.

## 5. field·버전·legacy 연결 gate

이번 test-local ticket은 WeakMap 안에만 있고 제품 state에 직렬화할 수 없다. 제품 버전 번호, metadata key, `includedRefs`/`excludedRefs` 중 저장 표현은 선택하지 않았다.

| 연결점 | 후속 구현에서 고정할 최소 계약 | 이번 근거 |
| --- | --- | --- |
| 읽기 preview | 검증된 current catalog/fullorder, exact owner와 source/state capture, input descriptor 검증, 결과 `display-only` 성격. clock·candidate·writer 권한 없음 | 실험은 실제 reader/Result/state와 test-local ticket 사용. 제품 API 없음 |
| React draft/state | 새 field를 명시적으로 version/validator에 연결. absent old payload는 기존 동작, 자동 migration 0. current와 genuine Undo 모두 검증 | KI10: 유효한 adjacent current/Undo에 unknown field를 넣으면 거절 |
| standalone P/C | 기존 P ABI·v1/v2 core/structure 보존. full order와 별도 membership. current/Undo 및 legacy/archive reserved 충돌 검사 | KI11: 실제 연속 전환 2회로 만든 current/Undo의 오염 직전 유효성 확인 후 거절. KI12: guessed draft field 거절, 기존 title 전환/Undo 허용 |
| E2/S 저장 | 새 draft/intent decoding, genuine capture와 fresh bytes/epoch, 1회 revision 및 exact before Undo. 외부값/불확실 rollback을 덮지 않음 | **신규 membership 저장·journal·fault/recovery 미검사** |
| PD/source 표시 | 새 metadata current/source pair 및 실제 reachable Undo pair 검사. source read 실패를 정상 raw 표시로 우회하지 않음 | 기존 경계 유지 요구. 신규 membership 합성 미구현 |
| 영구 삭제 D | 대상 exact owner의 새 개인 metadata 제거, 이웃/unknown owner 보호. 마지막 root 삭제 및 private bytes 완료 조건 유지 | **신규 metadata scrub 미구현·미검사** |
| 읽기 소비자 | 개인 결과·기간·실행 목록·완료 분모·export가 각 목적에 맞게 `I`를 소비하되 `C/O`를 잃지 않음. 원문 보기는 포함 여부와 별개 | 현재 전체 Result 재계산의 불변만 검사. subset 소비자 연결은 후속 |

현재 `personalPlanOverlays`나 `personalPlanContextV1`에 임의 field를 붙여 지원된 것으로 읽게 하지 않는다. 기존 unknown-field 거절은 새 기능의 PASS가 아니라 **아직 버전 연결이 없다는 경계 증거**다.

## 6. 실제 신규 검사와 실행 이력

신규 test (로컬 전용 근거: `./k4-inclusion-membership-simulation.test.ts`)는 12개를 등록했다. 네 origin, 반복 3회, 여러 음성 입력은 각 등록의 하위 검사이며 별도 개수로 합산하지 않는다.

| 등록 | 확인한 범위 |
| --- | --- |
| KI01 | 실제 네 origin reader, source criteria, 원본/운영 fixture bytes, 쓰기 0 |
| KI02 | 네 origin의 same-owner subset→restore; fullorder·메모·날짜·완료와 기존 전체 Result exact |
| KI03 | 실제 반복 3행의 occurrence identity·완료·이동 날짜 보존, source Item 단위 복원 |
| KI04 | subset order는 실제 ref validator에서 거절; 동명 section/전체 순서 보존; timeline 제외와 구분 |
| KI05 | foreign/unknown/duplicate/local-only ref, clone/prototype ticket, getter/추가 array field 거절; getter 호출 0 |
| KI06 | raw/state/Flow/generation 변화 및 관측 ABA 후 ticket 부활 0; cancel 쓰기 0 |
| KI07 | 0개는 미결 상태로 표시; whitelist/blacklist가 새 ref에 다른 결과를 내는 수학적 반례 |
| KI08 | 실제 imported Map 사전 제외로 catalog 밖 Item 복원 권한 없음 |
| KI09 | 실제 C2 추가·삭제 retained·source Undo 보존과 옛 preview ticket 폐기 |
| KI10 | 실제 React current/genuine Undo의 unknown membership 거절; old absent field 동일 |
| KI11 | 실제 standalone current/genuine Undo·legacy/archive의 reserved metadata 경계; 원래 legacy exact |
| KI12 | actual C/P의 임의 membership draft 거절; 기존 개인 title write 후보와 Undo는 계속 유효 |

| 실행 | 실제 결과와 분류 |
| --- | --- |
| 최초 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/inclusion-simulation-20260906-01/first.tap`) | 11 PASS / 1 FAIL. KI08의 Map fixture에 같은 Item을 included와 excluded 양쪽에 넣어 strict reader가 거절한 **하니스 오류**. 제품 inclusion 실패 아님 |
| 최초 strict (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/inclusion-simulation-20260906-01/strict-first.log`) | assertion의 success narrowing 뒤 reason 접근, 기존 JSON import에 필요한 resolveJsonModule 옵션 누락. test/실행 옵션만 정정 |
| 첫 정정 (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/inclusion-simulation-20260906-01/corrected.tap`), 첫 최종 묶음 (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/inclusion-simulation-20260906-01/final.json`) | 각각 12/12 PASS. 첫 최종 strict 0. 역사 실행이며 아래와 중복 합산하지 않음 |
| KI11 전제 독립 확인 (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/inclusion-simulation-20260906-01/ki11-precondition-audit.tap`) | 1/1 PASS. 원래 동일 state/Undo 조합도 현재 C가 유효하게 허용함을 실제 확인. 이후 더 직접적인 연속 실제 전환 2회 fixture로 강화 |
| 검토 후 최종 (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/inclusion-simulation-20260906-01/review-final.json`) | **12/12 PASS, fail/skip 0, strict exit 0**. 검사 전후 제품/제공 HTML 18개 SHA exact |

최종 test SHA-256: `EEDAAA6C27F1D4D960261F02D13F3694317EC25C3AF377F8BF5482FC8A4772F8`. 최초 수정 전 사본은 before-first-corrections.test.ts (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/inclusion-simulation-20260906-01/before-first-corrections.test.ts`), KI11 검토 전 사본은 before-ki11-review.test.ts (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/inclusion-simulation-20260906-01/before-ki11-review.test.ts`)에 각각 보존했다.

재실행: `node output/poc-gap-implementation/k4/inclusion-simulation-20260906-01/run-evidence.cjs`. runner (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/inclusion-simulation-20260906-01/run-evidence.cjs`)는 Node/tsx test와 해당 파일 strict tsc를 실행하고 전후 18개 SHA 및 전체 TAP를 출력한다. 기존 characterization 4개는 이번 12개와 다른 역사 검사이며 수정하거나 새로 합산하지 않았다.

문서 검사는 docs-check.log (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/inclusion-simulation-20260906-01/docs-check.log`)에 기록했다: 16 required files / 6,820 local links PASS. scoped closeout (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/inclusion-simulation-20260906-01/closeout.log`)은 실행했으나 파일별 scope의 신규 파일을 0개로 집계했다. 실제 `git status --short -- <두 경로>`에서는 이 문서와 test 두 파일이 `??`이며, 이를 이번 소유 범위로 직접 확인했다. reporter의 0개를 변경 없음의 증거로 사용하지 않는다.

## 7. 다음 범위와 남은 결정

지금 진행 가능한 최소 구현 후보는 **현재 검증된 동일 catalog의 읽기 전용 preview**다. 전체 catalog/fullorder와 별개인 포함 후보를 메모리에 보유하고, 같은 ref 복원·취소·drift 폐기만 연결한다. 제품 API/type·지원 origin의 proof 및 소비자 출력 범위를 루트가 먼저 확정해야 한다.

아직 정하지 않은 것은 0개 포함 상태의 허용/저장/빈 결과 문법, 새 source Item의 기본 포함 및 저장된 membership 재조정, imported catalog 밖 복원 자료 공급, 개별 occurrence 포함 단위다. 현재 catalog의 nonempty preview부터 검토한다고 해서 이 선택들을 금지 정책으로 확정한 것은 아니다. test의 `empty-plan-policy-not-decided`도 제품 거절 코드가 아니다.

이 패키지는 제품·schema·writer·기존 test·공유 보고서·HTML을 변경하지 않았다. 실제 browser/5viewport/native Undo/새 membership reload·저장·복구·기기·배포·관측 사용자 검사는 수행하지 않았다. Node 메모리에서 호출한 기존 순수 transition을 durable 저장 성공으로 세지 않는다. commit/push/PR/merge/deploy는 하지 않았다.
