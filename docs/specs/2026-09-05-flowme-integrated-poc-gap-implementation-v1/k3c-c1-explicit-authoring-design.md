# C1-c1 — 검색 입력의 명시 새 작성과 초안 보호

2026-09-06. C1-b 9183FC 뒤의 **C1-c1 구현 설계**다. 전체 목표를 새로 만들거나 C1 완료로 변경하지 않는다. 최초 작성 시 신규 구현·시험은 미실행이었다. 아래 시작 gate와 당시 계획은 역사 기록으로 보존한다. 현재 구현·검사 범위는 마지막 절과 [요구별 QA](./k3c-c1-explicit-authoring-qa.md)를 따른다.

## 원본 요구와 현재 차이

| 근거 | 유지할 요구 | 현재 9183FC |
| --- | --- | --- |
| 개발1 [Stage 2 §5](../2026-09-02-flowme-integrated-poc-gap-closure-v1/stage-2-contract.md), [C1 설계](./k3c-c1-entry-preview-design.md) | 한 입력의 hit/miss/invalid/memo와 명시 새 작성. 자동 원문·Flow 생성 금지 | 검색은 있지만 `이 내용으로 새 Flow 작성`/`텍스트로 계속` 행동이 없음 |
| 개발2 원문·작성기 보호 / C1 §4.3 | 취소·실패에서 기존 원문·선택·입력 이력 유지 | 검색 왕복은 구현. 새 문서 전환과 외부 library·도움 성공 뒤 조합은 미검사 |
| v4.1 실행 소유 / C1 §2·8 | 명시 handoff 전 폴더·날짜·완료·순서·workspace Undo 무변경 | 새 연결도 작성 초안만 바꿔야 함 |

root는 실제 controller 전문, app의 입구·복귀·새 작성 분기와 M의 draft candidate writer를 읽었다. 별도 read-only 검토와 일치했다. 전체 세션 대화나254부모/424원자 요구를 이번에 다시 전수 판정하지 않았다.

## 범위와 화면

1. 빈 입력에는 새 작성 행동을 활성화하지 않는다. 일반 query hit에서는 보조 행동, memo miss에서는 주 행동 `이 내용으로 새 Flow 작성`, URL miss/invalid에서는 `텍스트로 계속`을 쓴다. 검색은 계속 한 textarea다.
2. 입력의 공백·LF·원문 문자를 그대로 전달한다. 검색 제출 뒤 수정된 **현재 control 값**으로 다시 판정한다. 과거 resolution.rawInput을 그대로 넘기지 않는다.
3. 기존 작성 A가 있다면 무엇이 대체되는지 확인한다. 확인을 열기만 하거나 취소·Escape·Back한 경우 A의 연결 textarea·선택·native Undo와 검색 입력을 유지한다. 저장·Flow 생성0이다.
4. 확인 후에도 현재 source/workspace/draft/library binding을 다시 검사한다. success readback 뒤에만 새 작성 B를 채택한다. 새 문서의 template·helper·creator draft pointer·옛 receipt 소유를 물려주지 않는다.
5. 성공 시 기존 작성 화면에서 B를 표시하고 focus를 원문에 둔다. 이는 **새 문서 전환**이므로 A와 같은 textarea/native Undo 보존을 주장하지 않는다. B를 Flow로 확정하거나 개인공간에 저장하는 행동은 기존 명시 handoff에서만 한다.
6. 실패는 검색 입력과 A를 보존하고 같은 화면에서 원인·재시도를 제공한다. rollback이 확인되지 않거나 외부 값이 바뀌면 재시도/작성 쓰기를 잠그고 자동으로 B나 A를 덮어쓰지 않는다.

## 구현 설계 gate

- 일반 `new-authoring`은 기존 draft를 먼저 지우므로 재사용하지 않는다. 기존 동작과 운영 writer를 변경하지 않는다.
- 새 transition은 private memory ticket에 exact raw·원래 draft bytes·현재 읽기 binding·한 번의 attempt를 결합한다. JSON으로 복제한 ticket, 다른 owner, 재사용/중복 확인은 허용하지 않는다.
- 기존 `M.writeAuthoringDraftCandidate`의 same-before CAS·검증·정확 rollback을 기술적으로 재사용하는 **별도 입구 전환 adapter**를 검토한다. helper의 현재 owner를 가져오거나 helper-only 의미를 전체 저장 정책으로 바꾸지 않는다. adapter의 pure 준비/소비와 실제 current read/쓰기 역할을 나눈다.
- 이 묶음에서 writer의 대상은 기존 PoC draft key 하나다. workspace·source·library·Undo·운영 key는0쓰기다. 원문 전체·Map/URL 미보유를 채우는 schema 변경은 없다.
- 확정 전 차단 상태의 제품 mutation은0. 저장 시도 실패는 set 호출 자체가 있을 수 있으므로 성공 mutation0과 API 호출0을 구분한다. readback 실패의 rollback API도 숨기지 않는다.

## 먼저 실행할 baseline과 검사 묶음

아래는 아직 등록되지 않은 **검사 계획**이며 실행 수가 아니다. 새 spec은 기존13개와 분리한다. 초기 baseline은 실제 정상 작성/검색 전제 뒤 CTA 부재를 확인하고 그 뒤 도달하지 않은 기대는 미실행으로 남긴다.

| 묶음 | 행동·기대 |
| --- | --- |
| 시작 | query hit·memo·URL miss·invalid에서 명시 전0쓰기. 빈 입력 비활성. 이후 exact 새 원문 |
| 최신 값 | 제출 후 입력 수정, 선두LF·공백·emoji·장문 → 현재 control exact 전달 |
| 기존 A | 교체 취소·Escape·Back → 같은 textarea/선택/native Undo·0쓰기 |
| 정상 전환 | draft만 저장1회, current bytes/readback 성공, creator/helper·이전 문서 소유 유출0 |
| 실패 | read·quota·readback·rollback 실패·외부 drift, A/검색값 보존과 안전한 재시도 |
| 중복·입력 | 이중 클릭·늦은 callback·합성 composition → 잘못된 전환0. 실제 OS IME는 별도 |
| 외부 library | 별도 HTTP 문서의 B·A→B→A, 복귀 차단·명시 재조회·revision guard·이웃 보존 |
| 도움 조합 | 성공 뒤 입구 허용. pending/failed/stale/recovery는 현재 작업과 입력 보존 |

모델·실제 앱 baseline → pure adapter → UI → 실패·경계·다섯 화면 → 기존 작성/읽기/Plan 회귀 → npm/build·생성/file·보고서 순서다. 외부 library·helper는 먼저 현재 코드로 판정하고 실제 결함이 있을 때만 수정한다. viewport loop를 고유 테스트 수로 부풀리지 않는다.

## 다음 묶음과 제한

C1-c2는 exact ref로 **기존 실제 개인공간 상세 방문·조작·복귀**를 연결한다. 현재 C1-b의 `entry-workspace`는 내부 읽기 요약이며 이를 대체하지 못한다. 명시 실행 변경 뒤 오래된 preview 복원은 금지하며 같은 메모리 ticket과 새 owner 검증을 설계한다. 이번 c1에 한꺼번에 넣지 않는다.

그 뒤 C2 연습 진입 → C3 정보 밀도·UI → K4 필드 소유·버전·호환 설계를 유지한다. 모든 변경은 격리 worktree·PoC prefix 안에서만 진행한다. 실제 Android/iOS·OSIME/OSBack·보조기술 NOT_RUN, 관찰 사용자0, commit/push/PR/Preview/Production 미실행이다.

## 실제 시작 gate — 2026-09-06

새 spec (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3c-explicit-authoring.spec.ts`)에 **등록2개**를 만들고 root가 전문을 읽었다. 최종 baseline (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1c1-explicit-cta-red-20260906-01.json`)은 **2실행/2FAIL**이다. 실패를 expected-pass나 skip으로 바꾸지 않았다.

| 검사 | 도달한 전제 | 실제 실패 | 뒤쪽 기대 |
| --- | --- | --- | --- |
| E01 | 정상 workspace→찾기→선두/끝 공백·LF exact memo miss, 검색0쓰기 | `이 내용으로 새 Flow 작성` 버튼0개 | 명시 클릭·새 draft 저장·실패/복구 미실행 |
| E02 | 실제 A 입력·durable exact, 찾기 중 같은 연결 textarea hidden/inert, invalid URL exact | `텍스트로 계속` 버튼0개 | 교체 확인·취소·취소 뒤 native Undo·새 문서 저장 미실행 |

2context의 제품 API5회는 A 입력 구간뿐이다. 읽기0·운영 key/value 불일치0·허용 prefix 밖/clear/console/pageerror0이다. 생성HTML9183FC/1,866,335bytes=buildText와 소스·사용자 파일의 전후 exact를 확인했다. HTTP로 제공한 실제 app 검사이며 이 baseline을 실제 기기나 file URL 검사로 부르지 않는다.

최초 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1c1-explicit-baseline-20260906-01.json`)의2FAIL은 캡처 도구가 caret을 숨기며 빈 style 속성을 남겨 DOM exact 검사에서 먼저 발생했다. 이미 CTA count0은 관측했지만 최종 실패 지점은 구분한다. 소유 spec before를 보존한 뒤 `caret:'initial'`만 지정하고 DOM assertion은 유지하여 최종 CTA RED를 얻었다. 제품·기존 spec·builder·사용자 HTML은 변경하지 않았다. 최종 spec SHA 접두사는 `45A4FF7E`다.

이 baseline 뒤 순수 명시 전환 ticket과 draft CAS·실패 복구를 먼저 구현한다. 버튼만 추가하고 뒤쪽 전환 검사를 완료로 처리하지 않는다.

## 현재 구현 — 2026-09-06 C1-c1 standalone 835299

standalone의 private ticket·현재 draft CAS·readback·rollback·초안 교체 확인을 구현했다. HTTP13/13, 실제 사용자 file12/12로 현재 입력 exact 전달·새 문서 소유 분리·취소/실패의 A 보존을 확인했다. file은 HTTP 외부 B CT08을 제외한 같은 시나리오 재검사다. 신규 adapter31은 합동 모델235의 부분 집합이며 숫자를 중복 합산하지 않는다. 생성 두 파일은 각1,891,807bytes / SHA835299D2…이다.

React는 새 문서의 이전 creatorBinding을 제거하는 좁은3줄을 반영했고 actual browser1 RED→PASS다. React 교체 확인·실패 시 A 보존까지 해결한 것은 아니다. 기존 Stage2와 함께 실행한14개는13PASS/겹침1FAIL이었고 원형 단독 실행에서도 재현됐다. 실제 native 관찰 기록의 늦은 전달로 같은17184px² 겹침을 별도 RED로 확인한 뒤 현재 연결 편집기 rect를 사용하도록 관찰 블록을 수정했다. 원형 기대를 유지한 최종15/15와 레이아웃 반복3/3 PASS다.

다음은 React의 초안 교체 보호·standalone 외부 library/helper 조합이다. 그 뒤 C1-c2 실제 개인공간 상세 조작·복귀→C2→C3→K4 순서를 유지한다. 이 설계의 나머지 계획 항목을 자동으로 완료 처리하지 않는다.
