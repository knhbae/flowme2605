# K4-D 통합 설계·후속 구현 gate

2026-09-06. [단계별 실행 계획 §11](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md#11-k4--필드-계약대체-결정-정리)에 따른 설계 패키지다. 아래 화면은 **구현할 상태의 설계**이며 현재 PoC에 새 기준일·포함 선택·원문 정렬 기능이 생겼다는 뜻이 아니다. K1~K3의 실제 구현과 K4의 설계 실험을 구별한다.

## 1. 세 원본을 어떻게 연결했나

| 원본 요구 | 원본 화면·문장 | 현재 차이 | 이번 설계에서 고정한 연결 |
| --- | --- | --- | --- |
| 개발1 D1-006/023 · K-D1-03 | 이사일 선택→날짜 미리보기→최종 확인 (로컬 전용 근거: `../../../../flow-mvp/docs/content-audit/2026-08-19-flowme-after-end-to-end-ui-scenarios-ko.html#moving`) | Calendar의 월 이동은 있지만 개인 기준일을 바꾸는 필드가 아님 | 보는 달·선택 날짜·원문 기준일·개인 기준일을 별도 값으로 표시. 상대 계획 날짜와 실행 위치의 영향도 별도 집계 |
| 개발1 D1-018 · K-D1-05 | 같은 원본의 계획 전체/구간별 포함 수, staged Plan→Item 저장 계약 (로컬 전용 근거: `../../../../flow-plan-edit-trash-structure-unification-20260813/docs/specs/2026-08-13-plan-edit-trash-structure-unification/spec.md`) | 전체 Item 순열을 줄이면 현재 validator가 거절. imported Map 밖의 제외 항목은 현재 catalog에 없음 | 전체 catalog와 순서는 유지. 개인 포함 intent를 별도로 두고 같은 ref로 제외/복원. 전체 수는 ‘이 사본에서 확인한 항목’ 범위만 사용 |
| 개발2 D2-018 · P3K-D2-08 | 원문 문법 §10–11 (로컬 전용 근거: `../../../../flow-text-authoring-review/docs/specs/2026-07-28-flowme-text-authoring-ux-v1/authoring-grammar-logic.md`): 같은 Step의 Item+속성+하위 체크를 명시적으로 이동, 한 revision/Undo | 현재 최초 인계 함수의 line 기반 ID는 정렬 후 같은 논리 Item의 ID 보존 수단이 아님 | 편집 중 WorkingSource의 private block binding과 무손실 순열. 이미 저장된 사본을 재인계하거나 원문 snapshot을 덮지 않음 |
| v4.1의 날짜·기간 순서·완료 보존 | v4.1 spec (로컬 전용 근거: `../../../../flow-mvp/docs/specs/2026-09-01-personal-workspace-v4-1-prototype/spec.md`), [P3-F owner 결정](../2026-09-04-flowme-integrated-poc-production-candidate-v1/decision-contract.md) | 위 새 필드가 실행일·수동 순서·완료를 재초기화할 위험 | fixed/미정 실행 placement, 완료·메모·회차와 TimelineOrder는 별도 owner로 유지. 실행 mode가 inherit인 경우에는 계획을 따라 표시 날짜가 바뀔 수 있음 |

원본 HTML의 사람·항목 수·예시 날짜는 요구를 설명하는 자료다. 실제 이용·성과 근거가 아니다. 원본 대화 전체를 새로 전수 검토했다는 주장도 하지 않는다. 세 원본의 역사 감사 254부모/424원자 판정은 이 설계로 재점수화하지 않는다.

## 2. 화면 설계 — 서로 다른 세 작업을 한 저장으로 합치지 않기

아래 숫자와 날짜는 **화면 문법을 설명하는 예시**다. 실제 화면은 검증된 projection의 값과 개수만 사용해야 한다. `저장`·`원문에 적용`은 후속 저장 gate를 통과한 뒤에만 연결한다. 현재 구현에는 아래 새 control을 추가하지 않았다.

### A. 개인 기준일 미리보기

```text
개인 계획 편집 / 일정
원문 기준일     2026.09.06 · 읽기 전용
현재 개인 기준일 2026.09.06 · 기존 사본 값
새 개인 기준일 [2026.09.13]

날짜 변경 미리보기 · 아직 저장되지 않음
항목             계획 날짜       실행 위치       이유
상대 일정        9/07 → 9/14     9/07 → 9/14    계획 따름
직접 고정한 항목  9/08 → 9/08     9/10 → 9/10    개인/실행 고정
날짜 미정        미정 → 미정      미정 → 미정     미정 유지

[미리보기 닫기]     (저장 경로는 별도 후속 gate)
```

Calendar의 `2026년 9월 ‹ ›`와 선택 날짜는 결과의 조회 영역에 그대로 둔다. 그곳에서 기준일 저장을 시작하지 않는다. 개인 편집에서 검증된 실제 기준일이 없으면 ‘원문 기준일 없음’ 또는 ‘기존 개인 기준일 없음’으로 구분하며 오늘이나 선택 날짜를 대입하지 않는다.

| 화면 상태 | 보여 줄 내용·행동 | write·취소·초점 |
| --- | --- | --- |
| 지원됨 / 입력 전 | 현재 source·개인 owner와 날짜. 새 날짜 입력 및 미리보기 | 입력·조회 durable 0. 입력 label과 오류 연결 |
| 정상 미리보기 | 상대 날짜 변화, 개인 fixed/미정 유지, 실행 표시 영향의 개별 행 | 메모리 결과만. 닫기/Escape는 날짜 입력으로 복귀 |
| 같은 날짜 | ‘계획 날짜가 같아요.’ 실제 intent 차이가 있다면 별도로 설명 | 같은 숫자를 이유로 기존 pin 삭제 금지. 새 성공/Undo 0 |
| 유효하지 않은 날짜 | 해당 입력 옆 원인. 입력값 유지 | 부분 결과·추정 날짜 없이 0 write |
| 일정 근거 없음 / 지원 범위 밖 | 근거가 없는 이유와 읽을 수 있는 기존 계획 | 활성처럼 보이는 저장 버튼을 만들지 않음. 기존 개인 편집은 유지 |
| 원문·사본·관측 세대 변경 | ‘내용이 바뀌어 다시 확인해야 해요.’ 명시 재조회 | 옛 preview 폐기. A→B→A도 옛 권한 복원 금지 |
| 향후 최종 저장·실패 | 기존 Plan 저장 요약/복구 UI와 연결 | 현재 설계 실험은 이 경로를 실행하지 않음 |

새 read-preview의 최초 범위는 actual typed source를 읽을 수 있는 **non-Map 사본과 완전한 authored 일반 상대 일정**이다. Map 공통 기준일, source 없는 개인 추가 상대 일정, 상대 반복, 기준일 해제는 첫 범위에 넣지 않는다. 이 제한 때문에 기존 읽기·반복·Map 기능을 막지는 않는다.

### I. 개인 계획의 포함·제외·복원

```text
개인 계획 편집 / 포함할 항목
이 사본에서 확인한 항목: 포함 2 / 전체 3

준비 구간 · 2개 포함
[포함] 준비하기       9/07 · 완료 기록 있음
[포함] 확인하기       날짜 미정

제외한 항목 1개 [펼치기]
  마무리하기 · 9/08 · 메모/완료 기록 유지 [복원]

변경 요약: 1개 제외 예정 · 원문과 기록은 삭제하지 않음
[취소]          (최종 Plan 저장은 별도 후속 gate)
```

전체 order와 catalog는 그대로다. 제외 목록은 삭제된 항목을 새 ID로 생성하는 화면이 아니다. 현재 catalog에 없는 imported 제외 항목을 ‘복원 가능’으로 표시하지 않는다. 개수의 단위는 source Item이며 반복 회차 수와 섞지 않는다.

원본 홈트 화면에는 **‘포함 회차만 편집’**이라는 요구도 있다(같은 D1 HTML의 홈트 계획 전체 조정). 이번 실험은 source Item을 제외/복원할 때 기존 회차의 identity·날짜·완료가 유지되는지만 검증했다. 개별 occurrence의 선택·제외 기능을 대신하지 않는다. 회차별 membership의 owner·개수·저장·원문 변화 의미는 별도 후속 gate로 남긴다.

| 화면 상태 | 내용·행동 | 보존·오류·취소 |
| --- | --- | --- |
| 포함 / committed | 실제 포함 수·구간·Item | 완료/원문 체크/개인 날짜/실행일 owner 분리 |
| 제외 후보 / staged | 포함 수 감소, 제외 목록으로 이동할 행과 `복원` | 부모 초안만. 전체 order와 source/완료/criteria 0변경 |
| 제외 / committed | 같은 ref의 이전 날짜·메모·완료 기록을 조회 | 새 Item·회차 생성 0. 이 상태의 추가 실행 허용 여부를 실험으로 확정하지 않음 |
| 복원 후보 / staged | 원래 전체 순서에서 해당 행 복귀 | 새 id·완료 초기값·메모 초기화 0 |
| 전체 제외 시도 | 최초 read-preview 범위 밖이라는 이유 | 영구적인 ‘최소 1개’ 제품 정책으로 기록하지 않음 |
| 취소/Escape | 부모 Plan의 staged 범위에 맞춰 취소 | 기존 dirty 확인·계속 편집·버리기 사용. 새 write 0 |
| 원문 변화 / stale | 옛 capture 폐기·재확인 | 기존 C2 추가/삭제·retained·Undo는 그대로. 저장된 새 membership과 원문 변화의 결합은 아직 별도 gate |
| 저장 실패 / Undo / reload | 최종 Plan transaction에서 exact 이전 membership 복원 | current+actual Undo+legacy 검증이 구현되기 전 저장 연결 금지 |

‘새 source Item을 기본 포함할지’는 열려 있는 미리보기의 stale 처리만으로 해결되지 않는다. **이미 membership이 저장된 뒤 source가 바뀌는 경우**를 결정해야 한다. 이를 감추려고 C2의 기존 추가·삭제 처리를 미지원으로 바꾸지 않는다.

### W. 같은 Step의 날짜순을 원문에도 적용

```text
작성 중 원문 / 캘린더 결과
[날짜순을 원문에도 적용]

순서 미리보기 · ‘준비’ 구간만
변경 전                    변경 후
1. 늦은 항목 · 9/08         1. 빠른 항목 · 9/07
2. 빠른 항목 · 9/07         2. 늦은 항목 · 9/08
속성·하위 체크도 각 항목과 함께 이동합니다.
다른 구간과 저장된 사본은 바뀌지 않습니다.

[취소]         [원문에 적용 — 후속 저장 gate 전 연결 안 함]
```

사용 중인 textarea와 native history를 유지한다. 결과 탭·월 이동·정렬 preview만으로는 원문이 바뀌지 않는다. 지원 범위는 하나의 명시 Step, 유효한 고정 날짜가 있는 일반 Item, 검증된 단일 owner block이다. 같은 날짜는 종일→시각→기존 순서다.

| 상태 | 구체 UX·동작 | 검증 기준 |
| --- | --- | --- |
| 읽기 / Calendar 탐색 | 결과만 조회, 정렬 성공 표시 없음 | raw/selection/native edit/draft write 0 |
| preview | 변경 전/후 순서·구간·영향 Item. 정렬 대상 원문을 직접 확인 가능 | Item+속성+하위 체크 본문 exact, Step 횡단 0 |
| 같은 순서 | ‘이미 날짜순이에요.’ 새 성공 receipt 없이 기존 문서 유지 | native edit/revision/Undo 생성 0 |
| 취소/Escape | 같은 editor·논리 Item의 selection/scroll로 복귀 | test-local 역순열과 실제 native Undo를 구별 |
| 지원하지 않는 범위 | 미정·상대·반복·혼합 개행·소유 불명 원문 등의 정확한 이유 | 문법이 유효한 unknown property를 원문 오류로 오인시키지 않음 |
| 작성 중 변경/IME/owner 변경 | preview를 닫거나 적용 차단, 입력 보존 | 옛 helper·정렬 ticket 자동 재결합 0 |
| 향후 적용/Undo | 원문·binding·selection·보관 초안의 한 거래, 한 native Undo | 현재는 미구현. quota/readback/외부 변경/실패 복구와 reload까지 별도 실제 검사 필요 |

실험에서는 LF 또는 CRLF의 한 종류만 지원했다. Item 본문 사이 blank-only 간격은 위치 slot에 두고 본문 안의 빈줄은 Item과 이동한다. 이는 **read-preview 실험의 기술 범위**이며 원본의 모든 whitespace 이동 동작과 동일하다고 판정하지 않는다. 실제 원문 적용 전에는 원본 operations와 빈줄 귀속 차이를 비교 화면으로 확인한다.

### 공통 화면·키보드 기준

390×844·375×812는 한 열의 순서/날짜 변화 카드, 844×390은 하나의 내부 스크롤과 가리지 않는 취소/주 행동, 1024×768·1440×900은 전후 대응 행을 쓴다. 첫/마지막 행과 오류에 키보드로 도달해야 한다. 입력·날짜 선택·포함/복원·비드래그 이동에 drag가 필수여서는 안 된다. dialog에는 명시 제목·초점 trap/복귀를 두고, Escape는 현 단계만 닫는다. 오류를 성공 안내나 하단 고정 버튼이 가리지 않아야 한다.

이 문단은 **후속 제품 화면의 수용 기준**이다. 이번 K4-D에서 제품 UI 다섯 크기·native Undo·실기 검사를 실행했다는 뜻이 아니다. C3 화면 검증은 [C3 QA](./k3c-c3-local-ui-qa.md)에 따로 있다.

## 3. 필드·버전·호환: 지금 정한 것과 아직 정하지 않은 것

| 계층 | 지금 유지하는 계약 | 새 구현에 필요한 gate |
| --- | --- | --- |
| 원문·개인·실행 owner | immutable SourceSnapshot / mutable WorkingSource / PersonalOverlay / ExecutionRun 분리 | owner를 바꾸거나 운영 saved writer를 빌리는 안은 제외 |
| read-preview | 별도 scope의 메모리 DTO. 실제 producer decode·exact tuple·raw/state·관측 epoch에 묶음 | strict 입력·accessor/unknown/clone/foreign/ABA 음성 검사. writable candidate/Undo/성공 권한 반환 금지 |
| React v1 | unknown overlay field 거절, 전체 Item 순열, 현재/Undo 동일 검증 | 새 branch는 구버전 exact decode와 별도 discriminator가 필요. absent field는 현재 동작 유지. 구체 durable 번호는 아직 미정 |
| standalone P / C / E2 | P v1/v2, C v2, E2 v1~v4와 legacy raw·current/actual Undo의 현재 guard 유지 | 새 필드를 old draft/journal로 가장하지 않음. 현재+Undo+archive까지 새 branch를 검증한 뒤에만 연결 |
| source 변화 | 기존 C2 명시 비교·추가·삭제 retained·Undo 보존 | 새 committed membership 정책, 저장된 개인 anchor intent와 새 source 일정의 재결합, typed anchor index 재구성 선행. 단순 재조회는 저장된 새 intent의 의미를 해결하지 않음 |
| WorkingSource binding | 최초 materializer를 reorder updater로 재사용하지 않음 | 편집·native Undo·reload 수명의 stable ID/범위·revision 계약. persistent binding 필요 여부 먼저 검증 |
| atomicity / erasure | PoC prefix 안의 검증된 단일 transaction, 소유 확인 rollback | 새 metadata의 lock/readback/retry/Undo/정확 삭제까지 포함. 이웃·unknown owner/legacy bytes 자동 정리 금지 |

구체 저장 version을 적지 않은 것은 기존 v1에 필드를 임의 추가해도 된다는 뜻이 아니다. 첫 read-only 구현에는 durable version 변경이 필요 없고, 저장 구현 묶음은 새 schema·current/Undo·legacy 설계를 끝내야 시작한다. 중복된 전역 DECISIONS나 새 운영 정책을 만들지 않고 이 승인된 spec의 gate를 정본으로 쓴다.

## 4. 다음 구현 순서와 착수 판정

| 순서 | 작은 목표 | 현재 판정 | 완료 후에 열리는 다음 범위 |
| --- | --- | --- | --- |
| K4-A1 | 검증된 원문 기반 개인 기준일 **순수 read-preview** | 기존 승인 범위로 착수 가능. non-Map typed/완전 authored·set(date)만 | 새 API 음성/상대·fixed·미정·실행 보존·0 write를 통과하면 실제 Plan preview 연결 설계 |
| K4-I1 | 같은 catalog의 포함/제외/복원 **순수 read-preview** | 독립 착수 가능. 전체 catalog/order 유지, 0개는 미결 사유로 차단 | current/Undo·source 변화 규칙이 정해진 뒤 Plan 저장 설계 |
| K4-W1 | 같은 Step의 무손실 순열 **순수 read-preview와 private range binding** | 독립 기술 설계 착수 가능. 첫 제품 planner 전에 blank gap 귀속과 허용 selection 범위를 고정. 테스트 하니스를 그대로 제품으로 승격하지 않음 | native transaction·binding 수명·실패/Undo/Redo/reload가 검증된 뒤 명시 원문 적용 |
| K4-A2 / I2 / W2 | 실제 필드 편집·저장·UI 연결 | 위 gate 선행. 아직 구현·검증 완료 아님 | 양쪽 runtime의 5크기·키보드·취소/저장 오류·Undo/reload·운영 불변 검증 |

앞 세 pure 묶음은 모델 검증을 병렬화할 수 있다. 실제 writer 변경은 한 번에 하나의 owner만 다룬다. 새 source policy나 운영 권한을 추정해야 하는 지점에서는 해당 저장 기능만 멈추고, 안전한 독립 작업은 계속한다.

### 결정이 실제로 필요해지는 시점

| 아직 확정하지 않은 의미 | 영향 | 재검토 시점·추천 |
| --- | --- | --- |
| 개인 기준일 해제·원문 따라가기 | 상대 날짜 전체의 해석, 기존 개인 anchor 복귀 대상 | K4-A2에서 clear/reset control을 연결하기 전. 우선 명시 날짜 지정만 구현 |
| 저장된 개인 기준일 이후 source 기준일/version 변경 | 저장 intent를 유지하면서 새 상대 일정과 어떻게 재결합할지 | K4-A2의 C2 결합 전. PersonalOverlay 보존 owner는 유지하고 숫자 동값·따르기/고정 의미를 따로 확인. 옛 preview 폐기만으로 해결됐다고 하지 않음 |
| Map child별 기준일 | 같은 Map 다른 child에 적용 범위가 번질 수 있음 | Map capability 확대 전. child shadow와 공통 anchor의 영향 비교 후 선택 |
| 전부 제외 / imported 밖 항목 복원 | 빈 Plan 저장·전체 수·복원 권한 | K4-I2 저장 UX 전. 현재 검증된 사본 catalog부터 지원하고 없는 owner 생성 금지 |
| source 추가 후 새 항목의 기본 포함 | whitelist/blacklist가 반대 결과를 만듦 | K4-I2와 C2 결합 전. 자동 포함/자동 제외/명시 선택의 영향 제시. 현재는 어느 기본값도 확정하지 않음 |
| 개별 반복 회차의 포함/제외 | source Item 제외와 다른 단위이며 실행·회차 기록에 영향 | 회차별 선택 UI를 연결하기 전. 원본 홈트 요구와 기존 occurrence owner를 대조하고 Item 단위 필터로 대체하지 않음 |
| 원문 정렬의 빈줄·selection 기술 범위 | source 순서와 선택 위치·lineage | K4-W1 제품 planner 전에 LF/CRLF gap slot과 단일 body/prefix/suffix 선택 범위를 고정. 이 실험의 제한을 원본 문법 전체 지원으로 표현하지 않음 |
| 미정·반복 등 원문 정렬 범위 확대 | 정렬 대표 날짜·원문 순서가 달라짐 | K4-W2 적용 또는 문법 확대 전. 우선 고정 날짜·명확한 블록만 비교하고 원문 bytes 보존 증거 요구 |

이 선택들은 **현재 설계 작업을 막는 사용자 대기 조건이 아니다.** 지금은 read-only 범위를 진행할 수 있다. 저장 기능을 열 때 실제 필요한 선택만 영향·대안·추천과 함께 묻는다.

## 5. 완료 판정과 증거 연결

K4-D의 기획·구체 UX 상태·field/version/legacy gate·설계 실험·후속 착수 경계를 이 패키지로 모았다. [필드 조사](./k4-field-contract-design.md), [기준일 계약](./k4-anchor-preview-contract.md), [포함/복원 설계](./k4-inclusion-membership-design.md), [원문 정렬 설계](./k4-working-source-order-design.md)를 함께 읽는다.

루트가 네 검사 파일을 읽고 합동 34/34 PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/design-simulation-root34-2026-09-06T07-40-18-854Z.json`), 네 파일 strict diagnostics 0 (로컬 전용 근거: `../../../output/poc-gap-implementation/k4/design-simulation-root-strict-2026-09-06T07-40-20-150Z.json`)을 확인했다. 등록 수는 현행 계약4·기준일9·포함12·원문 순서9이며 fixture 변형과 재실행은 합산하지 않는다. 기존 함수의 메모리 실행과 test-local 실험으로, 새 제품 API·실제 저장·native Undo·브라우저 검사는 아니다.

초기 실패도 각 문서에 남겼다. 포함 검사는 Map fixture의 잘못된 중복 포함/제외 및 하니스 타입 오류를 고쳤고, actual current/Undo가 오염 전 유효함을 강화했다. 원문 정렬 실험은 inverse mismatch 뒤 옛 capture가 다시 사용되는 결함을 실제 8PASS/1FAIL로 드러낸 뒤 test-local stale latch를 고쳤다. 이런 실험 수정 수를 제품 갭 해결 수로 세지 않는다.

독립 문서 검토의 P2 보완을 반영했다: 저장된 개인 anchor 이후 source 변화의 의미, W1 전에 고정해야 하는 blank gap/selection 범위, companion 링크를 명시했다. C3의 요구 추적 보완은 [별도 원장](./k3c-c3-current-trace.md)에 있고, K4의 설계 통과로 역사 요구를 PASS로 올리지 않았다.

현재 조작용 PoC의 마지막 제품 후보는 C3 `55C57D51…` HTML / React `lLXF4heLSEAJg53NdomoU`다. K4 문서/하니스는 제품 파일·운영 schema·저장 key를 변경하지 않는다. 실기·보조기술 NOT_RUN, 관찰 사용자 0명, commit/push/PR/Preview/Production 미실행이다.
