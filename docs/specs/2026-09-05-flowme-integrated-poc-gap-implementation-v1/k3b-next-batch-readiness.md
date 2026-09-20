# K3-B 다음 묶음 준비 상태

2026-09-05. **B1 실제 UI 검증 다음에는 B3-a ‘이미 지원하는 제목·메모·날짜의 변경 확인과 저장 영수증’을 가장 작은 구현 묶음으로 권한다.** B2 구간·전체 순서는 승인된 기능이지만 아직 strict 버전·소유 근거·복구 계약 확장이 필요하다. B3-a는 그 필드를 미리 열지 않고, B1에서 실제 저장 가능한 필드의 전후 값과 결과만 닫는다. B2 뒤 section/order 영수증을 연결해야 B3 전체를 완료로 판정할 수 있다.

이 문서는 읽기 전용 준비 조사다. 제품·기존 문서·공용 보고서는 수정하지 않았다. 순서를 작게 나누는 제안이며 새 목표를 등록하거나 후속 제품 구현에 착수한 기록이 아니다.

## 1. 현재 출발선과 근거

- [단계별 실행 계획 §9·10](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md)과 [개선 설계 §7](../2026-09-05-flowme-integrated-poc-ux-audit-v1/improvement-design.md): `K-D1-02,06` 개인 편집/영수증, K3-C의 C1/C2/C3를 독립 묶음으로 승인했다.
- [K3-B 상세 설계 §5·6](./k3b-design.md): B2는 capability 있는 section/order, B3는 same-attempt diff/receipt·한 live owner·5 viewport다. 아직 없는 Plan anchor/include·개인 장소/반복/시간 제거는 추가하지 않는다.
- [진행 원장의 최신 날짜별 기록](./progress.md): B1 source-bound UI 연결과 브라우저 검증이 진행 중이며 B2/B3/K3-C/K4는 남았다. 맨 위 오래된 ‘K3-B 대기’ 표를 최신 구현 상태로 다시 인용하지 않는다.
- [표시 facade QA](./k3b-plan-display-qa.md)의 신규22/관련177은 **순수 API 결과**다. B1 전체·새 UI·새 사용자 HTML·브라우저 검증 완료가 아니다. B1 연결 후보의 실제 시나리오와 final source 증거를 root가 마감한 뒤 다음 제품 변경을 시작한다.
- [D1 감사 원장](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d1-audit.json)의 finding→부모 요구 ID와 실제 React receipt/Plan 화면, 현재 standalone app의 `renderPlanEditor`·`renderReceipt`를 좁게 대조했다. 원본 대화 전체를 다시 읽거나 세 산출물을 재감사한 것은 아니다.

## 2. 바로 구현할 최소 범위: B3-a

| 항목 | 고정할 범위 |
|---|---|
| 요구 연결 | `K-D1-06` → `D1-003, D1-011, D1-018`; K3-B `B-T03, B-T07, B-T14~20` 중 현재 B1 필드/영수증 부분 |
| 사용자 과업 | 같은 Plan에서 Item 메모와 계획 날짜 등을 변경 → 부모에서 실제 변경 확인 → 한 번 저장 → 무엇이 바뀌었는지 확인 → Undo/재시도 |
| 이번 필드 | Flow 제목, Item 제목·개인 메모·계획 날짜 3mode. source/기존 개인/Poc 개인 owner를 구분. section/order는 입력도 가짜 요약도 만들지 않음 |
| 저장 책임 | 기존 C/P/E2/S의 source-bound attempt/target/journal/cleanup 계약 유지. receipt는 그 결과를 표현할 뿐 새 저장 key·별도 Undo history를 소유하지 않음 |
| source 범위 | 실제 B1 편집이 검증된 네 saved origin + authored. capability 미지원/읽기 실패를 receipt 성공으로 우회하지 않음. Quick·CreatorDraft·작성 저장 영수증은 각각 기존 별도 owner |
| 종료 판단 | B1 필드의 저장 전·후 요약과 실패/재시도/Undo가 두 runtime에서 같은 의미. `K-D1-06` 전체 충족은 B2 필드와 남은 전체 시나리오를 확인한 뒤 판정 |

### 한 바퀴의 실행 단계

1. **기획·재현:** 동일2필드 변경/같은 내용/취소/실패/재시도의 원래 React receipt와 현재 HTML을 같은 fixture로 비교한다. 변경 필드 수와 영향받은 고유 Flow/Item ref 수를 별도 정의한다. B1 미지원 필드는 제외 사유를 명시한다.
2. **UX/디자인:** Item 반영은 부모에 staged, Plan 저장 전에는 실제 전후 값과 영향 수, 성공 뒤에는 같은 결과의 Undo를 제공한다. 실패 입력·confirmed 정리·source gate를 덮지 않는다. ‘제외 0개’ 고정 집계·누적 성공 수·작성 완료 영수증으로 Plan 변경 영수증을 대신하지 않는다.
3. **개발 설계:** genuine 편집 context의 baseline과 현재 draft에서 raw 의미 차이를 구한 뒤 표시용으로 축약한다. 같은 attempt의 diff를 저장 전 요약·saving·success/failure/retry에 연결한다. raw/source hash/복구 JSON은 기본 영수증에 출력하지 않는다.
4. **개발:** standalone의 작은 diff/presenter와 기존 editor result adapter를 우선 연결한다. React는 기존 [요약 helper](../../../lib/flow/personal-workspace-poc-editor-receipt.ts)와 [ReceiptSurface](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocReceiptSurface.tsx)를 재사용하되 아래 owner/축약 후보가 재현될 때만 좁게 고친다. 편집·receipt·K2-C 본문 결과·전역 Undo의 활성 owner를 한 곳으로 유지한다.
5. **검증:** 새 pure/receipt/기존 Plan·K1-B·K2-C 회귀, 전체 npm/build, 두 runtime 실제 시나리오와 390×844·375×812·844×390·1024×768·1440×900을 분리한다. target/journal/API 수·운영 fixture exact·오류/내부 overflow/전체 hit·키보드/복귀·단일 live owner를 확인한다.

### 기존 React helper도 복제 전에 확인할 후보

읽은 `personal-workspace-poc-editor-receipt.ts`는 `textValue`·`memoValue`에서 긴/CRLF 값을 `${length}자`로 먼저 줄이고, `appendChange`가 그 문자열의 동값을 비교한다. **길이가 같은 서로 다른 긴 메모가 0변경으로 요약될 가능성**이 있다. 또 title/schedule inherit의 표시가 항상 ‘원본’이어서 B1의 `existing-personal-baseline`을 같은 뜻으로 표시하는지 대조해야 한다. 이번 조사에서는 실행하지 않았다. 제품 결함 확정/수정 완료로 세지 말고 B3-a의 첫 RED 검사로 삼는다. raw 차이 판정과 bounded 표시를 분리하는 것은 기존 소유 의미를 지키는 기술 보완이며 새 제품 정책이 아니다.

최소 종료 시나리오는 다음과 같다. 이 목록은 실제 등록 테스트 개수가 아니다.

- 같은 Item의 메모·날짜2필드 변경: before/after2개, 고유 Item 영향1개. 별도 Flow 제목 변경은 Flow ref를 따로 센다.
- 빈 메모/공백/CRLF/원문 설명과 같은 개인 메모/동일 길이 다른 긴 메모: raw 변경·owner를 표시 축약으로 잃지 않는다.
- no-op·취소·invalid·source stale: target/journal/새 성공/새 Undo0. failure의 같은 intent 재시도와 double submit은 기존 guard 유지.
- confirmed cleanup 필요: durable 저장 사실과 정리 미완료를 분리. 성공한 것처럼 닫기·Undo 개방0, confirmed rollback0.
- 성공→Undo→reload와 다른 Plan 열기: 이전 receipt/늦은 callback이 다른 대상의 결과로 부활하지 않는다. 원문·실행일·완료·다른 사본 exact 보존.

## 3. B2는 승인된 기능, 다음 기술 gate는 아직 남음

[P2-C 정본](../2026-09-03-flowme-integrated-poc-personal-editing-closure-v1/spec.md)과 [B2 설계](./k3b-plan-section-order-design.md)가 요구하는 것은 `D1-012`의 개인 구간 별칭과 전체 Item 순서다. 방향 자체를 다시 사용자에게 묻지 않는다. 다만 최신 P v1/E2가 section/order를 거절하는 계약을 UI에서 우회하지 않는다.

| source / origin | React 근거 | standalone 다음 허용 경계 |
|---|---|---|
| structural personal-draft | 실제 validated bundle sectionId와 개인 draft capability | 일반 payload는 bundle proof 전달 전 구간 읽기만. origin 문자열로 권한 생성0 |
| memo seed | React imported bundle과 동일 근거라고 볼 수 없음 | exact seed tuple·`outline`·보존 baseline membership의 trusted fixture gate 후보. 아직 자동 허용하지 않음 |
| confirmed authoring-handoff | materializer가 최초 발급한 sectionId/line map | 실제 저장 Step id + exact raw/handoff/Item membership 검증. id 부재/중복을 index fallback으로 보충하지 않음 |
| canonical-personal-copy / source-backed-map / legacy-saved-plan | source-owned/derived 구간 읽기 전용 | 구간도 읽기 전용. **Plan 전체 ref 순서 편집은 구간 제목 권한과 다른 축**으로 기존 공통 범위 유지 |
| Quick→Flow | 검증된 새 handoff/변환 tuple일 때만 | origin 라벨이 아니라 실제 새 Flow lineage 검사. 원래 Quick owner 보존 |

가장 작은 B2 선행 묶음은 **B2-a ‘capability·버전 contract diff와 순수 RED’**다. full Flow tuple·stable sectionId·exact membership/전 Item permutation을 정하고, 같은 workspace-v2 안의 version별 draft/metadata와 C current/Undo·E2 journal·D 삭제를 함께 검증하는 계획을 확정한다. 구간 별칭은 원본 Step title에 쓰지 않고, Plan 순서는 Step 소속이나 TimelineOrder/date rank로 저장하지 않는다.

동명 구간/같은 local Step id의 다른 사본/교차 Step 순서/원래 순서 복귀/child 뒤 부모 section/order 보존을 포함한다. source 추가 Item·새 구간·기존 ref 삭제는 현재 strict source reader가 미지원인 조합이므로 same-membership부터 연결하고 나머지는 명시 잔여다. B2 전체 완료로 묶어 닫지 않는다. 기존 source 업데이트 지원을 지우거나 view를 raw로 저장해서 통과시키지 않는다.

버전 이름·dual decoder·seed proof 범위는 **구현 전 기술 계약 검토**이지 새로운 영구 제품 정책 선택이 아니다. 출처 없는 구간 소유를 추정하거나 과거 payload를 손실 있게 자동 이관해야만 한다는 대안이 나올 때만 별도 사용자 결정이 필요하다.

## 4. K3-C는 세 개의 독립 후속 묶음

| 묶음 / 요구 연결 | 승인된 구현 범위 | React / standalone·완료 조건 |
|---|---|---|
| C1 출처 선택·preview owner — `K-D1-04,10`; `D1-016,017,019,021~024` | 실제 safe source명/링크/criteria 전달, 공유 원문과 내 사본 preview 목적 구분. 같은 목적의 presenter 재사용 | 양쪽 입구를 비교. 네 origin+authored의 있음/없음/unsafe URL, 개인 변경→재검색→child 변경→preview→복귀의 refs/owner와0쓰기. 기본 Text를 과거 추천 모드로 되돌리지 않음 |
| C2 합성 후보 명시 진입 — `P3K-BP-01`; `BP-003,040,053,054,073` | 새 작성 Flow 첫 열기/reload의 자동 합성 알림을 없애고 사용 안내의 명시 연습으로 옮김 | 두 runtime에서 정상 저장→첫 실행을 확인. 기존 pending/deferred/applied 자료는 보존. 명시 비교의 resolve/apply/stale/cancel/Undo/reload 유지. fetch·운영 writer0 |
| C3 로컬 UI — `K-D1-07,08`, `P3K-V41-04`; `D1-013,014,016,025`, `V41-001/.1/.3` | exact-query local action/selection/focus만 승인 teal, 중복 편집 entry와 기본 기술문구 정리 | React global cobalt와 local teal을 별도 측정. standalone 의미도 대조. 기본 `/my`·PlatformNav·global CSS/token 불변, 오류·원본·복구·접근성 정보 보존, 5 viewport |

C2가 별도 작은 기능 묶음이며 source 저장 계약 확대가 필요 없다. B2 기술 gate 조사와 독립 준비할 수 있지만, root가 같은 app/Surface를 B1/B3와 동시에 편집하지 않도록 소유를 조율한다. C1·C2·C3 중 하나를 끝내고 K3-C 전체 충족으로 집계하지 않는다. 새 theme 선택이나 다시 합성 후보 기능을 승인받을 필요도 없다. P3-D의 기능은 보존하고 기본 진입만 승인 UX로 정리한다.

## 5. 권장 인계 순서와 보류

**B1 UI final 검증/사용자 artifact 일치 → B3-a 현재 필드 영수증 → B2-a contract diff → B2 strict 구현·양쪽 UI/읽기 검증 → B3 section/order 영수증 마감 → K3-C의 C1/C2/C3**를 권한다. B3-a를 먼저 분리하는 것은 현재 지원 필드만으로 사용자가 실제 저장 결과를 검증할 수 있게 하는 작은 순서 조정이다. root가 다음 실행 범위를 확정한 뒤 시작한다. B2-a의 읽기 전용 준비와 C1/C2 source 조사만 충돌 없이 병행할 수 있다.

Plan 기준일/포함·제외/WorkingSource 날짜순 원문 적용은 K4다. 개인 장소·반복·Plan-level 메모·시간 clear나 unknown section owner를 다음 묶음에 끼워 넣지 않는다. 기존 의미로 결정되는 owner/receipt/토큰 문제를 사용자 정책 질문으로 돌려 진행을 멈추지도 않는다.

이번 조사에서 신규 제품·모델·브라우저 실행0, 실제 Android/iOS·IME·보조기술 NOT_RUN, 관찰 사용자0이다. commit/push/PR/Preview/Production 없음. `npm.cmd run docs:check`는 PASS(required files 16, local links 5,689)였다.
