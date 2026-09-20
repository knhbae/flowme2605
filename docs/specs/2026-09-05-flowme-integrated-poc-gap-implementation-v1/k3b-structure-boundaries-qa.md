# K3-B B2 — 구조 metadata의 표시·삭제 경계 독립 QA

기준일: 2026-09-05. [B2 계약 변경안](./k3b-section-order-contract-diff.md), [구간·순서 설계](./k3b-plan-section-order-design.md)와 [독립 설계 리뷰](./k3b-section-order-independent-review.md)를 바탕으로 한다.

## 0. 현재 상태

신규 [structure-plan-boundaries.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/structure-plan-boundaries.test.cjs)의 등록 시나리오 **10개가 P 동결 후 최종 10/10 PASS**했다. P/C 구조 metadata와 PD/D의 순수 표시·삭제 경계에 한정한 결과다. 기존 missing API RED 12개와 이 새 검사를 구분하고, 중간·최종 재실행을 더해 고유 20개나 30개로 세지 않는다.

이 하위 작업이 소유한 파일은 위 새 검사와 이 QA뿐이다. P/C/D/PD/S/M/app, 기존 검사, builder, 사용자 HTML은 수정하지 않는다.

## 1. 실제 구현을 쓰는 fixture와 경계

두 사본을 실제 `M.makeHandoff`·`M.apply(commit-authoring)`로 만든다. 원문은 동일한 제목의 명시 구간 2개와 A1/A2/B1 항목을 가진다. `C.fromLegacy`와 실제 source reader가 fixture를 먼저 검증한다. 구조 metadata v2는 C의 genuine 구조 inspector와 단일 구조 transition으로 생성하며, 존재하지 않는 API를 모의 반환이나 `assert.throws` 성공으로 대신하지 않는다.

- 같은 `step-1` 및 같은 별칭 문자열의 두 사본은 full Flow tuple로 구분한다.
- 원래 Step unknown JSON에는 대상/이웃을 구별하는 private marker와 공백·CRLF·배열 값을 넣는다. 원래 자료의 owner 안에 속하는 unknown은 보존하거나 그 owner 전체와 함께 삭제해야 한다.
- 전체 개인 순서는 A1→B1→A2다. raw Steps·원문·task 배열은 바꾸지 않은 실제 C candidate를 사용한다.
- source rename·순서 교환·Item 추가는 실제 후보 준비/선택/적용 함수를 사용한다. source store 모양을 결과처럼 조작하지 않는다.
- D 검사는 **순수 삭제 계획**의 checkpoint/legacy/source afterRaw를 읽는다. `writes`는 계획 목록이며 실제 Storage API 호출이 아니다. prepared/confirmed journal·복구·cleanup은 별도 S/E2 후속 검사 범위다.

## 2. 등록한 검사 10개

| ID | 검사 목적 | 검증할 핵심 경계 |
| --- | --- | --- |
| SB01 | 실제 C 구조 v2를 PD에서 읽기 | 공개 반환에 저장·편집 token 없음, 공개 editor/planner API 호출 0, ambient DOM/storage 접근 0. 내부 Sa read-context 생성까지 0이라고 주장하지 않음 |
| SB02 | same-id·same-order source 구간 이름 변경과 실제 source Undo | 개인 별칭/전체 순서 보존, 각 실제 source/checkpoint pair를 검사, source를 raw로 다시 쓰지 않음 |
| SB03 | 현재 구조 P와 source read 실패·손상 | PD 정상 raw fallback/표시 state 반환 0, 정상 확인된 `raw:null`과 실패 구분 |
| SB04 | source 내부 순서 교환·Item 추가 | current-P와 실제 reachable Undo-P 모두 prospective source를 차단. 현재의 same-source-order/membership 제한을 넓히지 않음 |
| SB05 | 실제 C Undo와 Undo-only P의 source 실패 | 전체 snapshot 복원 및 기존 updatedAt 예외. no-P current의 실행 전용 표시는 가능해도 candidate에서 reachable Undo 검사를 우회하지 않음 |
| SB06 | 대상 Flow 영구 삭제 계획 | 대상 rawSteps/capture/alias/full refs/Undo 제거, 같은 문자열의 이웃 entry·원문 보존. 직렬화·다음 Quick 추가·Undo 뒤에도 대상 부활 0 |
| SB07 | 저장 자료의 Undo-only 대상 구조 | 실제 C가 만든 두 state의 검증 가능한 persisted pair에서 private Undo 제거. 정상 UI에서 이 history를 직접 생성했다는 주장은 아님 |
| SB08 | owner를 모르는 top-level 값·손상된 current/Undo v2 capture | 기본 알려진 owner 삭제는 성공해야 함. unknown-owner 및 손상 metadata는 입력 exact 보존·계획 쓰기 0 |
| SB09 | 실제 두 source 후보가 있는 대상 삭제와 PD pair | 선택 source owner만 scrub하고 이웃 effective version 보존. 삭제 전 source와 before, 삭제 후 source와 final을 묶어 검사 |
| SB10 | 대상은 구조 없음, 이웃은 v2 구조 있음 | 삭제 대상과 관계없는 entry 및 독립 Quick을 exact 보존. 다른 사본 tuple을 섞은 요청은 0변경 |

SB07은 복구된 자료 검증의 경계 fixture다. 실제 C-issued 구조 state를 Undo로 사용하고, 실제 C의 구조 reset·휴지통 이동으로 만든 current를 조합한다. C가 이 persisted pair를 valid로 인정하는지를 먼저 확인한다. 휴지통 Flow를 편집해 새 구조 권한을 발급하지 않는다. 마지막 Undo가 어떻게 사용자 조작으로 생성되는지까지 검사하는 UI 시나리오와는 다르다.

## 3. 실제 실행과 최종 판정

| 실행 | 실제 결과 | 판정 |
| --- | --- | --- |
| 첫 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-plan-boundaries-first-2026-09-05T14-28-04-467Z.json`) / 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-plan-boundaries-first-2026-09-05T14-28-04-467Z.log`) | 10개 등록, 9 PASS / 1 FAIL | SB06 대상 private marker 사전조건에서 실패. 하니스가 두 번째 M.apply의 clone 이전 첫 Flow 객체에 marker를 넣어 최신 state에는 없었음. 제품 삭제 코드 실패로 판정하지 않음 |
| exactref fixture 수정 후 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-plan-boundaries-corrected-2026-09-05T14-29-26-503Z.json`) / 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-plan-boundaries-corrected-2026-09-05T14-29-26-503Z.log`) | 10/10 PASS, fail/skip/cancel/todo 0, 1,118.131ms | 현재 API의 순수 연결 통과. P 최종 동결 후 합동 재검과 구분 |
| P 동결 후 최종 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-plan-boundaries-final-2026-09-05T14-39-20-648Z.json`) / 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-plan-boundaries-final-2026-09-05T14-39-20-648Z.log`) | **10/10 PASS**, fail/skip/cancel/todo 0, 1,141.8774ms | 같은 신규 파일 10개만 최종 재실행. root의 넓은 합동 회귀와 별도 |

수정은 최신 state에서 저장된 full ref로 두 Flow 객체를 다시 찾고, fixture 입구에서 두 marker가 실제 state에 존재함을 확인한 것이다. 삭제 대상 marker·capture·fullref 제거, 이웃 보존 등의 기대는 그대로다. 제품 파일 수정은 0이다. 수정 전 test SHA는 `647F8C037AD87759B38E42F2CB3481FF54989A7532AB586AB6C6610AB8C71FB2`, 수정 후는 `8CAA48DA7ED0203CBC65696C5370C5C9A76D264A3804BAF14A17CA9E3AE065A1`다.

실제 명령은 다음과 같다. 같은 목록을 첫 실행에는 `structure-plan-boundaries-first`, 하니스 수정 후에는 `structure-plan-boundaries-corrected`, 최종에는 `structure-plan-boundaries-final` label로 실행했다.

```powershell
node docs/specs/2026-09-05-flowme-integrated-poc-gap-implementation-v1/run-check.cjs k3b structure-plan-boundaries-final --test docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/structure-plan-boundaries.test.cjs
```

첫 실행 해시 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-plan-boundaries-first-hashes-2026-09-05T14-20.json`), 재실행 해시 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-plan-boundaries-corrected-hashes-2026-09-05T14-29.json`): 각 실행 전후 제품 5개 및 해당 검사 파일의 hash가 일치했다.

최종 전후 해시 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-plan-boundaries-final-hashes-2026-09-05T14-34.json`)도 모두 일치한다. P 최종 hash가 앞서 읽고 실행한 중간 `AA3D3EA…`와 같아서 이후 추가 제품 diff는 없다. 아래 제품 해시는 중간과 최종 실행에 공통이다.

| 제품 | 중간·최종 실행 SHA-256 |
| --- | --- |
| P personal-plan-context | `AA3D3EA124BC9C7C752D5FF82A359D075F3C1CEEABC933571C11953C0E3493F4` |
| C workspace-checkpoint | `835FF4320FC8278882876BEDE60AA392734341E4C300309FF9A47515818CF600` |
| PD personal-plan-display | `4453A1350EB5A468CBB27860B682F4BE58BB7699665D396EE340325896197458` |
| D workspace-permanent-delete | `A8448A47E89A3BEE4C9288AA58F71ECEC226A52ED58DFE14E9EAFE9353F97DF3` |
| M model | `9A3334F49975D9EB9B971F7D0CFBE8508D03B59E526F653FF79AC1E4A7D70F67` |

SB01의 공개 저장/편집 token 반환 0·editor/planner 호출 0·ambient getter 호출 0은 실제 PD UMD와 실제 M/C/P를 사용한 검사 결과다. 내부 source 읽기 context 생성까지 없었다는 주장은 아니다. SB06~10의 `writes:[]` 또는 afterRaw는 순수 계획을 검사한 것이므로 실제 source/legacy key에 기록했다는 의미가 아니다. 아직 새 제품 결함은 발견하지 않았다.

### P 변경분의 읽기 검토

B2 이전 P 백업 (로컬 전용 근거: `../../../output/k3b/before-section-order-plan/personal-plan-context.js`)과 `AA3D3EA…`의 diff 전체를 읽었다. 기존 v1 ABI·strict metadata 분기를 유지하면서 구조 version2를 분리하고, 실제 M 작성 저장 알고리즘의 tuple·fingerprint·parser sourceLine·저장 Step id를 검증한다. 표시 index로 owner를 재발급하지 않는다. raw capture와 현재 source inherit 제목을 나누고, 기존 개인 pin을 source와 우연히 같다는 이유로 없애지 않는다. 기존 core planner는 별도 구조 값이 없으면 이전 structure를 보존한다. 구조 editor는 별도 WeakMap을 사용하고 저장 계획에서 source byte·epoch freshness를 다시 확인한다.

읽은 범위에서 추가적인 차단 결함은 발견하지 않았다. 이는 정적 검토이며 별도 PASS 테스트 수를 추가하지 않는다. PD는 현재 strict source/core 표시 facade이고, 별도 structure reader의 결과를 모든 UI/내보내기 소비자에 연결했다는 증거가 아니다. [P 담당 최종 QA](./k3b-section-order-plan-qa.md)의 동결 해시가 중간 diff와 동일함을 확인했다. 그 문서의 29/29·213/213은 해당 담당자의 별도 실행 기록으로, 이 하위 작업에서 재실행하거나 새 고유 수에 합산하지 않았다. 중간 문서 검사는 `required files 16 / local links 5,840` PASS였으며 제품 검사 수에는 더하지 않는다.

## 4. 현재 제외

브라우저·사용자 PoC·generated HTML·실제 storage/journal·운영 키 실측·npm 전체·production build·배포는 이 순수 검사의 범위가 아니다. 실제 기기·OS IME·보조기술은 NOT_RUN, 관찰 사용자 0명이다. commit·push·PR·Preview·Production 미실행. 이 10개가 통과하더라도 E2 v4/S 지속 복구·UI·전체 소비 화면의 B2 완료로 확대하지 않는다.
