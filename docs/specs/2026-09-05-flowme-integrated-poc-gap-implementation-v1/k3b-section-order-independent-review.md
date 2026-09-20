# B2-a 구간·전체 순서 계약 독립 검토

2026-09-05. 제품과 기존 검사를 수정하지 않은 읽기 검토다. [contract diff](k3b-section-order-contract-diff.md), [B2 설계](k3b-plan-section-order-design.md), [새 12개 계약 검사](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-section-order-contract.test.cjs)를 현행 M/P/C/E2/PD 및 React의 대응 코드와 대조했다.

## 판정

별도 구조 draft/metadata branch, exact full-ref 순열, raw Step 비변경, 기존 단일 Undo를 쓰는 방향은 현재 계층에서 구현 가능하다. 새 운영 정책·새 저장 key·별도 Undo를 추가해야만 구현 가능한 치명적 구조 모순은 발견하지 않았다.

다만 **구현 전에 계약 문구 두 곳을 정정하고, 저장된 의도 보존 규칙을 명확히 해야 한다.** 현재 12개만 GREEN으로 만드는 것으로는 버전 호환·source 이동·Undo와 결과 순서 연결을 검증하지 못한다. 아래 P1은 이미 구현된 B2의 실패가 아니라, 구현 시 데이터 거절·유실 또는 잘못된 지원 주장을 만들 수 있는 계약/회귀 공백의 우선순위다.

검토 시 신규 P/C inspector는 모두 `undefined`였다. 기존 RED 로그 (로컬 전용 근거: `../../../output/k3b/section-order-contract-red-20260905.tap`)의 **12개 0통과/12실패**를 직접 읽었다. 11개는 P inspector, 1개는 C inspector 부재로 중단됐고 이후 기능 assertion에는 도달하지 않았다. 이 검토에서 12개를 재실행하거나 expected-failure PASS로 바꾸지 않았다.

## 1. 구현 전 정정·명문화할 사항

### B2R01 / P1 — same-membership만으로 source 지원 범위를 설명하면 넓다

contract diff 32·132행은 same-membership의 현재 source view를 허용한다고 쓰지만, [P `sourceProjectionBinding`](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-context.js)의 340–355행은 다음을 모두 요구한다.

- 같은 full Flow/Item refs와 Item 수
- 같은 section id·section 배열 순서
- 각 Item의 같은 section membership
- **각 Item의 sourceOrder도 raw Step flatten 순서와 동일**

실제 `M.makeHandoff → commit-authoring → prepare/resolve/applyLocalSourceCandidate → P.readPersonalPlanSourceContext` 메모리 호출로 확인했다.

| 입력 변화 | 실제 source apply | 실제 P 읽기 |
| --- | --- | --- |
| `## One`을 `## Changed`로 rename | changed=true | ok=true |
| 같은 Step 안 A1/A2 위치만 교환; ref 집합·구간 소속 동일 | changed=true | `source-membership-not-supported` |
| A2를 다른 Step으로 이동 | changed=true | `source-membership-not-supported` |

권고: B2-a/b의 현재 허용을 **같은 ref 집합·구간 소속·원문 순서에서의 검증된 source 값 변경**으로 좁혀 기록한다. 개인 `orderedItemRefs` 변경과 원문 sourceOrder 변경은 별개다. 후자는 이 단계에서 지원한다고 쓰지 않는다. 위 메모리 source apply는 실제 앱의 PD preflight나 source writer를 호출한 것이 아니므로, 미지원 source가 현재 앱에서 저장됐다는 증거도 아니다.

최소 RED: 실제 rename positive control 옆에 동일 구간 내부 source 재정렬과 교차 구간 source 이동 negative를 둔다. current와 실제 Undo에 B2 metadata가 있는 경우 모두 새 source 후보 preflight가 막히고 raw/source/개인 순서가 보존되는지 후속 연결에서 확인한다. 제목 유사도나 같은 배열 길이로 통과시키지 않는다.

### B2R02 / P1 — 기존 core 제목 규칙을 강화하면 유효 v1을 깨뜨린다

contract diff 108행의 “title trim/한 줄 제한은 기존 Plan text 규칙을 재사용”은 현재 구현과 일치하지 않는다.

- P 17행 `text()`는 string의 nonblank만 검사한다. `normalized()` 247–271행도 앞뒤 공백 제거·내부 줄바꿈 금지를 하지 않는다.
- React `validateTextDraft()` 648–668행은 nonempty title의 trim-exact를 요구하지만 내부 newline을 별도 거절하지 않는다.
- M 574행 `isSingleLineTitle()`은 존재하지만 현재 호출은 Quick→Flow 변환 1944행이다. P core 제목의 현행 검사가 아니다.

실제 C source-bound inspector → P captured validator → C transition으로 `'  기존 제목  '`과 `'첫 줄\n둘째 줄'`을 각각 넣었다. 두 값 모두 captured=true, changed=true, `C.validateCheckpoint=true`, overlay exact 보존이었다. 따라서 새 B2 공통 text 검사로 모든 v1/v2 core 제목에 trim/newline 금지를 적용하면 이미 유효한 개인 자료가 차단될 수 있다.

권고: **기존 core title/items/memo decode 의미는 그대로 유지**한다. 새로운 section 입력에 적용할 정확 규칙과 그 근거를 별도로 명시한다. 이번 독립 검토가 section 정책을 새로 확정하지는 않는다. memo를 제목 검사에 태우거나 공백·개행을 자동 정리하지 않는다.

최소 RED: 위 두 유효 v1 제목과 공백/CRLF memo를 가진 current+Undo에서 B2 열기/no-op/구조-only 저장/실제 Undo가 값을 exact 보존한다. 신규 section 값 검사의 허용·거절은 별도 assertion으로 작성한다.

### B2R03 / P1 — 저장할 때의 정규화와 나중에 source가 같아진 경우를 구별해야 한다

contract diff 75행의 “실제 차이가 하나 이상”은 **처음 저장하는 후보의 명시 변경 판정**으로는 맞다. 그러나 이후 reader/decoder가 현재 source와 비교해 차이가 없다는 이유로 저장된 section override를 거절하거나 지우면 안 된다.

현재 B1은 P `normalizedSourceIntent()` 591–604행에서 열 당시 draft와 같으면 기존 저장 의도를 다시 보존한다. B2에도 같은 구별이 필요하다.

예: raw 구간 A → 검증된 source 구간 B → 사용자가 개인 별칭 A를 명시 저장 → source Undo로 A가 다시 보임. 마지막 상태에서 화면 문자열이 같아도 저장된 개인 A 의도는 아직 존재한다. unrelated core memo 편집이나 읽기가 이를 자동 inherit로 바꾸면 다음 source 변경 때 개인 값이 사라진다.

권고: rawSteps capture는 owner/provenance 검증, captured source-before-personal은 새 입력의 inherit baseline, 저장된 section/order는 기존 의도로 구분한다. raw/source 현재 값과 우연히 같아졌다는 이유만으로 자동 삭제하지 않는다. **명시 inherit 또는 원래 순서 복귀**가 해당 override를 제거하는 경로다. 이 규칙을 metadata validator와 normalized structure helper에 같이 적용해야 한다.

최소 RED: source B 뒤 명시 개인 A가 raw A와 같아도 유효 저장됨; source Undo/동일 값 source 적용 후 읽기·unrelated core 저장은 structure exact 유지; 명시 inherit만 해당 별칭 제거; 다른 구간·다른 사본·기존 core memo 유지. B2A10의 bytes/epoch drift 거절만으로는 이 의도 보존을 검사하지 못한다.

## 2. 방향은 맞지만 최소 회귀를 더해야 하는 연결점

### B2R04 / P1 — old core writer의 선택 entry 재생성

현재 P `withPlannedMetadata()` 494–504행은 선택 entry를 `{binding,legacyPlanFields,overlay}`로 새로 만들거나 entry 전체를 지운다. dual decoder만 열고 이 경로를 그대로 쓰면 구조가 사라질 수 있다. C `finishPersonalPlanTransition()`은 현재 timeline metadata/Undo를 검사하지만 향후 section/order 보존을 대신 증명하지 않는다.

contract diff 86행이 exact 보존 또는 explicit unavailable을 이미 요구하는 것은 적절하다. 다만 B2A07은 **반대 방향인 core→구조 첫 저장**만, B2A08은 새 구조 API의 reset만 검사한다. 구조→기존 core writer 왕복이 없다.

최소 RED: 선택 Flow에 section+order가 있는 v2에서 기존 B1 raw/source core 변경을 호출한다. 지원하는 경로라면 선택 entry의 structure와 이웃 entry exact 유지, 지원하지 않는 경로라면 checkpoint/Undo exact 불변과 명시 unavailable을 요구한다. 구조-only entry의 core 변경, 마지막 core override 제거도 포함한다. E2 child에는 parent v2 structure를 copy한 뒤 **자기 Item 필드만** 바꾸는 actual child apply를 사용한다.

### B2R05 / P1 — 기간/Calendar의 동률 baseline이 자동 연결되지는 않는다

P가 전체 ref 순서를 반환해도 현재 기간은 C `projectWith()` 227–239행에서 raw task 배열 index를 sourceOrder로 사용한다. `timeline-result-rank.js` 7–25행은 그 C 날짜 그룹 rank를 모든 source task에 반환하고, `M.resultContextRank()` 989행 이하와 Calendar 소비자가 해당 rank를 사용한다. 따라서 텍스트·Plan만 새 순서를 쓰도록 연결하면 **수동 TimelineOrder가 없는 같은 시간의 Calendar/기간은 이전 순서를 계속 보일 수 있다.**

이는 raw task/Step을 재정렬해야 한다는 뜻이 아니다. 계약의 reader 연결 단계에서 validated full-ref 개인 순서를 **read-only tie baseline**으로 전달할 구체 지점이 필요하다. 현재 C group과 result rank의 실제 소비 경로가 같아야 하며, 수동 order와 시간 우선순위는 유지한다. 임의 UI order/권한 flag를 raw storage candidate로 전달하는 방식은 피한다.

최소 RED: 같은 날짜·같은 시간·no manual에서 A1/B1/A2가 Plan·기간·Calendar의 합의된 동률 순서로 이어짐; 수동 TimelineOrder와 서로 다른 시간에서는 기존 우선순위가 유지됨. 다른 날짜/사본과 회차 fallback 범위도 불변. B2A05의 `orderedItemRefs` 배열만 확인하는 것으로 이 소비자 결과를 통과 판정하지 않는다.

### B2R06 / P2 — authored proof의 빈 구간·implicit 혼합

M `parseSource()`는 parsed Step에 sourceLine을 저장하지 않는다. Item sourceLine은 있다. `commit-authoring` 2158–2166행은 빈 구간을 저장에서 빼지만 id 번호는 원래 parsed stepIndex를 사용한다.

메모리 확인 결과:

- `## Empty → ## One → A1`은 저장 Step이 `step-2` 하나다. stored index 0으로 `step-1`을 발급/비교하면 정상 owner를 거절하거나 다른 owner로 만든다.
- 구간 없는 Item 뒤 `## One → A1`은 `step-1='할 일'`, `step-2='One'`이다. 첫 derived는 readonly, 둘째 명시 구간은 proof를 통과할 수 있어야 한다.

계약 문구는 이 경우를 제대로 구분한다. B2A02의 전부 implicit, B2A09의 missing/duplicate만으로는 이 정상 혼합 proof를 보장하지 못한다. heading line 재구성은 같은 지원 문법으로 검증하되 parsed/stored 자료를 고쳐 채우지 않는다.

최소 RED: 빈 선행 구간/gapped id, implicit+explicit 혼합, CRLF, 동명 구간. sourceLine/Step membership/id를 한 곳씩 바꾸면 해당 Flow의 section 권한만 사라지고 independently valid 전체 order는 남는지 확인한다. readonly sectionId가 null인 복수 구간도 표시 catalog에서 하나로 합치지 않아야 한다.

### B2R07 / P1 — Undo snapshot 보존과 실제 Undo 실행은 다르다

새 검사는 `result.undo === before`와 v1 Undo 저장을 검사하지만 `C.undoCheckpoint()`를 호출하지 않는다. 현재 실제 Undo 349–360행은 `updatedAt`만 기존 M 규칙으로 바꾸고 나머지 state를 복원하며 Undo를 null로 만든다. v2 current/v1 Undo와 v1 current/v2 Undo의 dual decoder가 이 실제 경로에서 작동하는지 확인해야 한다.

최소 RED: 구조 첫 저장 → 실제 C Undo → C/PD 읽기 및 reload decode; 구조+core reset → 실제 Undo → structure·core 복원; timestamp 예외 외 exact 동일. current P 없음/Undo만 v2인 source preflight도 actual C Undo를 통해 검사한다. 이후 E2 journal4 prepared/confirmed와 D 삭제는 이미 문서에 후속 gate로 적혀 있으므로 이번 12개 통과에 포함시키지 않는다.

## 3. 호환·소유권 대조에서 모순을 발견하지 않은 부분

- `personalPlanContextV1` key의 이름을 유지하고 안쪽 version/contract를 dual decode하는 것은 기술적으로 가능하다. P module ABI VERSION=1을 유지하므로 현재 C·PD의 module 존재 검사와 충돌을 만들 필요가 없다. metadata v2라는 이유로 운영 schema를 바꾸는 계약도 아니다.
- 전체 순서와 section 별칭 권한을 분리한 것은 맞다. seed `outline`이나 source adapter가 만든 index fallback을 title 편집 권한으로 인정하지 않는 최신 diff가 이전 설계의 seed 검토 후보보다 우선한다.
- `structure` 안에 선택 Flow rawSteps/refs/proof/별칭/order를 모으는 설계는 exact owner 삭제에 연결할 수 있다. D entry scrub·source pending/effective/Undo·확정 journal cleanup 회귀는 여전히 별도 필요하다.
- 원문 Step membership을 유지하면서 A1/B1/A2의 전체 선형 순서를 표현할 수 있다. section별 재flatten은 기능 누락이므로 별도 reader 순서를 소비해야 한다.
- E2 v4가 실제 historical source snapshot과 before→draft→C candidate 재도출을 쓰고 v1/2/3를 보존하는 방향은 B1 v3의 검증 패턴을 확장할 수 있다. 새로운 version만 추가했다고 old recovery가 자동 호환되는 것은 아니며 S 분류 힌트·actual decoder·prepared/reopen·confirmed cleanup까지 묶어야 한다.

## 4. 권고하는 다음 최소 묶음

기존 12개의 긍정 기능 목표를 유지하고, 위 R01–R07을 다음의 최소 회귀 묶음으로 추가한다. **예정 목록이며 새 테스트 등록/실행 수가 아니다.**

1. source rename positive + 내부 재정렬/소속 이동 negative + 명시 별칭 A/source B/Undo 의도 보존.
2. 기존 v1 공백/개행 title·memo 보존 + 구조 이후 B1 core writer/actual child 왕복.
3. authored proof의 빈 구간과 혼합 구간, forged line/id/membership 대비.
4. 실제 C Undo + PD current/Undo-v2 source gate.
5. reader 연결 단계에서 같은 시간의 Plan/기간/Calendar 동률과 수동 TimelineOrder 우선순위.

E2 v4·storage faults·D cleanup·두 runtime UI/5 viewport는 contract diff가 후속으로 남긴 그대로 분리한다. 이번 리뷰가 미지원 source 이동을 새로 허용하거나 제품 정책 결정을 요구하는 근거는 아니다. 기존 경계를 지킨 채 계약을 좁히고 검증할 수 있다.

## 5. 이번 검토의 증거와 한계

실행한 것은 **새 등록 검사 0개**, 제품 모델에 대한 제한된 메모리 진단이다. source 변화 3종, authored proof 2종, 현재 v1 text 2종을 실제 M/P/C 함수로 확인했다. 이 7종 입력을 새 테스트 7개 PASS로 집계하지 않는다. storage/browser/실제 사용자 profile은 사용하지 않았다. 새 API의 순열/구간/Undo 구현 검증은 아직 수행할 수 없다.

읽은 계약 diff SHA `66039651E8250BE01A0DA650B11F49083581DF618E63C5B4D6DF166C3423C53B`, B2 설계 SHA `8B0A1847BE47D9562DB43C398FEAEF8A5CA2C87EAB2A2456C863B4D8BC37D537`, 새 12개 spec SHA `44D0D522F8D787E47B17C0C3BF716D1BCFF702AD478B30AE2AED9F196F47901D`다.

현재 제품 hash는 contract diff의 B1 최종 기준과 같았다: P `9DE68BE271BD4026338A41229A4AB757F0EB4FA17C99DE23B6209C6A8F47C358`, C `6E874DEBB90EBDCAABB725914428317ED0ADCE947B88E25DE6A038FD75AB7E57`, E2 `CAC276CB5DDC4BF2E9748905186F31914F33E8F01B8BEAEA84E7C1742A1A2BB4`, PD `4453A1350EB5A468CBB27860B682F4BE58BB7699665D396EE340325896197458`, M `9A3334F49975D9EB9B971F7D0CFBE8508D03B59E526F653FF79AC1E4A7D70F67`.

이 파일만 신규 작성했다. P/C/E2/PD/app/기존 검사/HTML 수정 0건, commit·push·PR·배포 0건. B2 브라우저·실제 Android/iOS·IME·보조기술 검사 미실행, 관찰 사용자 0명.
