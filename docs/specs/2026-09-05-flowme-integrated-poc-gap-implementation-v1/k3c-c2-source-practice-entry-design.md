# K3-C C2 — 원문 비교 연습의 명시적 진입 설계

상태: **C2의 정한 구현·검사 범위 완료**. 최종 A59CFCCA/PK9 후보의 요구별 판정·실제 실행 수·미검사 범위는 [검증 원장 마지막 절](./k3c-c2-source-practice-entry-qa.md)에 있다. §1–7은 2026-09-06 최초 설계 기록이며 당시 제품·테스트·HTML 변경0이다. 후속 승인은 §8에 보존한다. 전체 K3-C·제품 완료 판정과 분리한다.

## 1. 해결할 갭과 유지할 기능

새 Flow를 개인공간에 저장하고 열었을 때는 제목, 진행 상태, 첫 할 일이 먼저 보여야 한다. Flow 열기·화면 렌더·새로고침만으로 합성한 원문 업데이트 알림을 만들지 않는다. P3-D의 원문 비교 기능은 **사용 안내 → 로컬 원문 비교 연습**에서 사용자가 시작할 수 있게 남긴다.

현재 문제는 자동 **저장**이 아니다. 두 런타임이 표시 경로에서 연습용 incoming envelope를 생성하여, 외부에서 실제 변경을 발견한 것처럼 배너를 노출하는 문제다. 이미 보관된 pending/deferred/applied 기록, 결정 내용, 적용된 원문, 그 원문의 Undo는 삭제하거나 자동 해결하지 않는다.

근거는 [실행 계획 §10](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md), [개선 설계 §4.2 S4-R](../2026-09-05-flowme-integrated-poc-ux-audit-v1/improvement-design.md), [BP 감사 P3K-BP-01](../2026-09-05-flowme-integrated-poc-ux-audit-v1/bp-audit.json)이다. 연결 요구사항은 BP-003/040/053/054/073, 여정은 J4다.

## 2. 세 원본 산출물과의 대응

| 원본 | 이번에 적용·유지할 요구 | C2에서 하지 않는 일 |
| --- | --- | --- |
| v4.1 | 폴더·기간·완료가 개인 실행의 중심. 새 Flow의 첫 할 일을 가리지 않으며 실행 날짜·완료·개인 메모·폴더를 보존한다. | 원문 업데이트 기능 자체는 v4.1 원본 범위가 아니다. 기간/순서/날짜 정책을 다시 만들지 않는다. |
| 개발1 | D1-003/005/008/011: 개인 계획과 읽기 전용 원문을 구분하고 Item→Plan 미확정 변경, exact identity, Undo 경계를 유지한다. | 개인 계획 편집·완료 writer를 원문 비교에 사용하지 않는다. 원문 미리보기의 owner 표시 수정은 별도 C1이다. |
| 개발2 | D2-002/004/026 및 P1-E: Base/Mine/Incoming, 완전한 envelope, 명시적 비교·결정·보류, 미해결 적용 차단, stale·전체 적용·Undo를 유지한다. 실제 새 원문이 없을 때 후보를 자동 발명하지 않는다. | 외부 fetch·polling·AI·URL/file 가져오기 UI·공개 버전·CreatorDraft writer를 추가하지 않는다. |

확인한 정본은 `D:/flowme2605/flow-mvp/docs/specs/2026-09-01-personal-workspace-v4-1-prototype/spec.md` 전문, 개발1 `2026-08-19-flowme-after-end-to-end-ui-scenarios-ko.html`의 Item 반영·원문 보호 구간, 개발2 `D:/flowme2605/flow-text-authoring-p1-e-source-update-20260813/docs/specs/2026-08-13-flowme-text-authoring-p1-e-source-update/00-development-goal-ko.md` 전문이다. 원본 대화 전체를 이번에 다시 읽었다는 뜻은 아니다.

[P3-D 후속 정본](../2026-09-04-flowme-integrated-poc-source-update-ownership-v1/spec.md)은 적용 대상을 PoC 개인공간의 source-candidates 저장소로 명시했다. 원래 P1-E의 WorkingSource 반영 뒤 별도 초안 저장 방식으로 되돌리지 않는다. [A0 결정](../2026-09-02-flowme-integrated-poc-gap-closure-v1/a0-decision-record.md)의 개인공간 우선 진입과 개인/원문 owner 분리도 유지한다.

## 3. 현재 호출과 실제 의미

아래 행 번호는 조사 시점 기준이다. 후속 구현에서는 함수 이름으로 다시 확인한다.

| 위치 | 현재 동작 | 최소 변경 방향 |
| --- | --- | --- |
| standalone `app.js` `sourceCandidatePreview` 1424, `renderSourceUpdateBanner` 2941 | 렌더가 `M.prepareLocalSourceCandidateReview`를 호출하여 합성 후보를 만들고 차이 수를 표시한다. | 렌더는 검증된 기존 기록 조회만 한다. 신규 생성은 연습 시작 이벤트만 호출한다. |
| `model.js` `prepareLocalSourceCandidateReview` 2893, `standaloneLocalIncomingSource` 2876 | 실제 저장 사본의 원문에 예시 제목/Item을 추가하고 공유 모델에서 stage한다. 저장 I/O는 없다. | 기존 API와 생성 규칙은 명시적 연습에서 재사용한다. 조회 helper와 분리한다. |
| `app.js` `openSourceUpdateReview` 1430, `refreshSourceUpdateReview` 1602 | 비교 열기·다시 비교도 기본 합성 후보 경로를 사용한다. | 후보 ID를 명시한 기존 기록 열기와 신규 연습 시작을 구분한다. |
| `app.js` `closeSourceUpdateReview` 1468 | defer 함수의 반환 store를 버리고 Flow별 메모리 Set만 남긴다. session의 임시 결정은 닫기 뒤 없어질 수 있다. | 먼저 RED로 현재 결정 보존 범위를 고정한다. 같은 실행 중 연습 store를 보관하되 저장 자동화는 하지 않는다. |
| React `PersonalWorkspacePocSurface.tsx` 4592–4607 | 선택한 authored Flow에서 useMemo로 합성 envelope를 생성한다. 생성 ID가 아닌 기존 후보를 일반적으로 찾지 못한다. | 생성 useMemo를 제거하고 exact target의 기존 후보 목록을 조회한다. 생성은 명시 이벤트로 옮긴다. |
| 같은 파일 `stageSourceUpdateInMemory` 4650, open/defer/resolve | stage·보류·결정은 메모리. 적용/Undo만 기존 source store writer를 호출한다. | 이 저장 경계는 유지한다. 보류가 새로고침에도 저장된다고 안내하지 않는다. |
| `PersonalWorkspacePocSourceUpdateReview.tsx` 339/404/407/436/444 | 로컬 fixture에도 “새 원문에서 …”, “새 원문 다시 받기”를 사용한다. | 로컬 연습임을 제목과 상태에 명시하고 fetch처럼 들리는 표현을 바꾼다. |
| standalone `openGuide` 4831 / React 설정 details 5243 | standalone에는 사용 안내와 접힌 테스트 도구가 있다. React에는 설정만 있다. | standalone 안내를 재사용한다. React는 기존 설정 안에 작은 사용 안내 진입만 추가한다. |

조사 스냅샷: app `DF4E08A9…`, model `C21EDA9A…`, React Surface `CD1CAAB4…`, 공유 source-candidates `746E1A09…`. 동시 작업 때문에 최종 구현 기준 해시는 새로 고정해야 한다.

## 4. 조회·생성·저장 계약

### 4.1 출처를 정확히 표현한다

현재 공유 strict envelope가 허용하는 provenance는 `kind: 'local-fixture'`뿐이다. 검증된 authored lineage와 원문 bytes는 사용자가 저장한 실제 입력이지만, incoming 예시는 로컬 생성물이다. 이를 외부 원문 업데이트·동기화·발견 시각의 증거로 표시하지 않는다. 알 수 없는 provenance를 새 종류로 받아들이지 않는다.

기존 `createPersonalWorkspacePocCurrentSourceFromAuthoredFlow`, standalone `standaloneAuthoredFlowForSourceUpdate`, 공유 store/envelope validator를 재사용한다. 사본·Flow·handoff와 원문 revision/fingerprint를 제목이나 URL 유사도로 대신하지 않는다. 네 saved-plan origin은 계속 읽기 전용이며 lineage가 없는 항목에 연습용 source를 제조하지 않는다. Quick 변환도 실제 지원 조건으로 판정한다.

### 4.2 읽기는 생성도 stage도 하지 않는다

제안하는 작은 순수 조회 계층은 검증된 store와 현재 authored identity에서 `{status, candidates, appliedVersion, undoAvailability}`만 만든다. API 이름은 구현 전 고정한다. render·useMemo·C1 검색/선택/미리보기·handoff 완료·reload·Flow 전환에서는 local generator와 stage 호출이 **0회**다.

- 후보 없음: 정상 실행 화면. 비교 배너 없음.
- 기존 pending/deferred: 해당 exact candidate ID의 결정과 상태를 읽는다. “보관된 로컬 비교”에서 다시 열 수 있다. 렌더 중 pending으로 바꾸지 않는다.
- 후보 여러 개: 최신 시각·제목으로 하나를 추정하지 않는다. 명시적인 기존 기록 선택을 제공하며 어느 기록도 삭제하지 않는다. 선택 전 생성·결정 변경은 없다.
- applied: 이미 적용된 source version과 정확한 Undo owner를 유지한다. 기본 fixture ID와 달라도 적용 사실을 누락하지 않는다.
- 손상·읽기 오류·unsupported·다른 사본: 안전 안내와 해당 기능 차단을 유지한다. 빈 store나 새 예시로 대체하지 않는다.

이 조회 결과는 저장 권한이 아니다. 열기·적용·재시도는 현재의 strict stage/apply, source byte/epoch, whole-workspace 및 personal-display 검사를 계속 통과해야 한다. stale 후보가 있다는 이유로 저장 기록을 자동 갱신하지 않는다.

### 4.3 명시 연습도 기존 writer만 사용한다

안내 열기와 기존 기록 조회는 저장 0회다. 사용자가 지원되는 현재 Flow의 “로컬 비교 연습 시작”을 누른 때만 기존 generator와 stage를 실행한다. 생성 대상은 그 Flow의 exact identity·원문 bytes·관찰 epoch에 묶으며 다른 화면의 늦은 콜백으로 재사용하지 않는다.

비교·선택·보류는 메모리 상태다. 같은 실행 중 다시 열 때는 동일 candidate와 결정을 유지한다. 이미 durable store에 있던 pending/deferred/applied는 읽기나 새 연습 때문에 변경하지 않는다. 새로운 임시 보류를 reload까지 남기기 위한 writer/키/자동 저장은 추가하지 않는다. 안내가 필요하면 “적용 전 선택은 이 실행 중에만 유지됩니다.”를 사용한다.

실제 적용과 Undo는 지금의 `flow:poc:personal-workspace:v1:source-candidates` 단일 키, expected raw·readback·rollback과 source/private-owner guard를 그대로 사용한다. 현재 schema, receipt, 독립 Undo, 운영 migration을 추가하지 않는다. `localStorage.clear()`는 금지다.

stale 뒤에는 기존 후보를 보관한 채 “현재 원문으로 다시 비교”를 명시적으로 선택한다. 새 원문 기준 후보를 검증할 수 없다면 사유와 차단을 표시한다. 원래 후보의 Base/Mine/Incoming이나 결정을 덮어서 성공시키지 않는다. “가져오기”는 원본 P1-E의 완전한 로컬 host envelope 수신 계약이며, 이번에 외부 가져오기 기능을 만드는 뜻이 아니다.

## 5. 화면·상태·키보드 설계

| 화면/상태 | 표시와 다음 행동 | 비변경·회복 경계 |
| --- | --- | --- |
| 새 Flow 첫 실행 | 기존 제목·진행·첫 Item. 새 합성 배너 없음. | 기존 실제 보관 기록이 있으면 그 기록은 숨겨 없애지 않는다. |
| 사용 안내 | 선택된 Flow 제목, “기기에 저장된 원문으로 비교 과정을 연습합니다. 외부 원문을 확인하지 않습니다.”, 주 행동 “로컬 비교 연습 시작” | Flow 미선택 시 “연습할 Flow를 먼저 열어 주세요.” 자동 첫 Flow 선택 금지. |
| 미지원/읽기 오류 | 지원되지 않는 원문 또는 저장소를 읽지 못한 사유. 연습 시작 비활성 | 재확인도 자동 후보 생성 없이 읽기만 한다. |
| 기존 비교 | “보관된 로컬 비교 · 결정 N/M”, “비교 이어가기” | deferred/resolutions 보존. 복수 기록은 선택 후 연다. |
| 비교 창 | “로컬 원문 비교 연습”, “예시 원문에서 N곳이 달라집니다.” 기존 3방향 비교·선택·적용 재사용 | 원본 source, 개인 보정, 실행 값을 섞지 않는다. 미해결/나중에 선택은 적용 차단. |
| stale/실패 | 원인과 현재 선택 유지. “현재 원문으로 다시 비교” 또는 기존 재시도 | source 불일치에 blind retry 없음. 성공 문구·신규 Undo 없음. |
| 적용/Undo 성공 | “연습용 원문 변경을 이 사본에 적용했습니다.”, 해당 source Undo | B3 Plan/Quick 영수증과 source Undo를 혼용하지 않는다. |

안내와 비교 창은 동시에 쌓지 않는다. 안내를 닫은 뒤 비교를 열고 첫 미결정 항목에 초점을 둔다. Escape·닫기·backdrop은 기존 보류 의미를 유지하며 저장하지 않는다. 돌아갈 버튼이 사라졌으면 해당 Flow의 안내 진입 또는 제목으로 초점을 돌린다. pending·editor·recovery의 기존 우선권을 우회하지 않는다. 이미 완료된 B3 저장 사실을 지우거나 성공 Undo의 owner를 바꾸지 않는다.

새 전체 테마·색상·마법사·상단 주 행동을 만들지 않는다. 기존 비교 컴포넌트에 로컬 연습 표시 변형만 추가하는 안을 우선한다. “외부 동기화 아님”을 여러 곳에 반복하지 않고 진입 설명과 비교 제목에 남긴다. 상태 알림은 실제 적용/실패에 필요한 한 곳에서 문맥을 포함해 읽고 초점을 빼앗지 않는다.

## 6. 단계별 구현·검증 제안

1. **C2-R 계약 RED:** 생성 spy와 actual validator fixture로 아래 R01–R08을 먼저 등록한다. 기존 호출 때문에 실패한 기대와 fixture 오류를 분리한다.
2. **C2-M 조회 분리:** strict 기존 후보 선택/적용 사실 조회를 만들고 양쪽 generator 호출을 명시 이벤트로 제한한다. 공유 runtime 재생성은 root 승인 범위에서만 한다.
3. **C2-U 진입·문구:** 기존 사용 안내/설정에 연결하고 비교 열기·보류·refresh의 candidate owner를 유지한다. C1에는 CTA나 생성 호출을 넣지 않는다.
4. **C2-V 통합 검증:** 실제 양쪽 UI, 기존 P3-D 적용·Undo·stale, B3 영수증 회귀와 5개 화면 크기를 함께 검사한다. 저장 경계가 확인된 후 HTML 두 파일을 생성하고 실제 로컬 파일을 검증한다.

| 계획 ID | 반드시 확인할 기대 |
| --- | --- |
| R01 | 새 authored Flow 저장·열기·reload·재선택과 C1 미리보기: generator/stage 0, 알림 0, 읽기로 인한 저장 0. |
| R02 | 지원 Flow의 명시 연습만 생성. 미선택·네 legacy origin·불완전 lineage·Quick 미지원에서 생성 0. |
| R03 | 기본 fixture ID와 다른 pending/deferred 및 복수 후보를 exact target으로 읽고 원본 bytes/결정을 보존. 다른 사본 노출 0. |
| R04 | applied 기록·source version·owned Undo를 reload 뒤 유지. 새 연습이 이전 기록을 삭제/해결하지 않음. |
| R05 | 같은 실행의 비교 닫기/보류/재진입 결정 보존. durable 미저장과 저장된 기록을 구별. duplicate·cancel·same choice 저장 0. |
| R06 | stale raw·관찰 ABA·늦은 콜백·다른 candidate/Flow·읽기 오류·손상·unknown provenance에서 새 성공/자동 재생성/덮기 0. |
| R07 | 실제 선택→전체 적용→Undo→reload. WorkingSource/CreatorDraft/개인 title·memo·schedule·section·order·완료·운영 sentinel 불변. source writer의 허용 키/API 수는 별도 집계. |
| R08 | editor/recovery/pending 우선권, B3 receipt/일반 Undo와 source Undo의 경합, 저장 실패 후 재시도와 no-fake-success. |
| U01–U05 | 390×844, 375×812, 844×390, 1024×768, 1440×900에서 첫 Item, 안내 시작/닫기, 비교 첫·마지막 선택, 적용·취소·오류 재시도에 스크롤 접근. full rect와 다중 hit point, 가로 넘침·console/page error 0. |
| U06 | 키보드 Tab trap·Escape·실제 버튼 초점 복귀·비드래그 경로·200% 확대와 reduced motion. 안내/비교 중첩 0. |

이는 **미실행 검증 계획**이다. 테스트 수는 실제 등록 후 보고하며 모델·VM·브라우저·재실행 수를 합쳐 독립 시나리오 수로 부풀리지 않는다. 실제 Android Chrome/iOS Safari는 NOT_RUN, 관찰 사용자 0명이다.

## 7. 구현 전 확인할 좁은 지점과 인계

- standalone 닫기에서 버리는 defer 반환값과 React 메모리 유지 차이는 actual RED로 확인한다. 메모리 세션 보존은 가능하지만 새 durable 보류 정책으로 확대하지 않는다.
- 복수 기존 후보와 applied 기록을 기본 생성 ID 없이 조회할 수 있어야 한다. 현재 store validator/API를 우회한 얕은 DTO 신뢰로 해결하지 않는다.
- source 변경 후 신규 비교가 기존 current/base 계약상 불가능한 경우, 새 후보 규칙을 추정하지 말고 기존 shared 모델의 허용 경계를 먼저 확인한다. 해당 후보만 사유와 함께 차단하며 정상 기존 기록을 삭제하지 않는다.
- C1 담당자와 경계를 확인했다. C1 검색·선택·미리보기는 후보 생성 0회이며 C2 연습 CTA를 넣지 않는다.

이 문서는 저장소 근거로 작성했다. `flow-ux-review`로 불필요한 반복 안내를 줄였고, UX 검색의 제출 피드백·문맥 있는 상태 알림 원칙만 사용했다. Figma: **NOT_USED**. 화면을 만들거나 브라우저로 검증했다는 증거가 아니다. commit/push/PR/Preview/Production은 진행하지 않았다.

## 8. C2-R/M 기술 범위 승인 — 2026-09-06

사용자가 승인한 실행 계획 §10과 §1–7에 따라 진행한다. 이 승인은 새 provenance·영구 보류 저장·운영 source writer를 허용하지 않는다. C1-c2 제공 HTML615418은 C2 검증이 끝날 때까지 보존한다. root는 정본 계획/P3-D와 현재 구현을 읽고 독립 조사와 대조했다.

첫 소유 범위는 공유 모듈의 순수 `inspectPersonalWorkspacePocSourceCandidateCatalog` 1개와 신규 시험이다. exact target5필드·기존 current/store validator로 기존 후보와 적용 사실·실제 Undo owner만 읽는다. getter·손상·다른 사본에 fail-closed하며 생성/stage/clock/IO, raw 본문 또는 쓰기 ticket 반환0이다. 기존 validator/schema/transition은 바꾸지 않는다. `canUndo`는 현재 기록의 표시 자격이지 저장 권한이 아니다.

별도로 양쪽 실제 render/open/resolve/defer callback의4개 RED·양성 대조와 기존 source writer/React RAF 경계의8개 검사 후보를 등록한다. 후자는 candidate readback 시 foreign X 복구 덮기와 종료된 화면의 늦은 apply/Undo를 분리한다. 아직 실제 실패를 확인하기 전에는 코드 위험으로만 기록한다. React source 경로에는 현재 Web Lock 호출이 없으므로 해당 검사를 lock 경합이라고 표현하지 않는다.

조회 이후 UI 구현은 사용 안내의 명시 시작, exact 기록 선택·보류 결정 보존, source-only current 재비교를 기존 presenter와 writer에 연결한다. source writer 안전성 변경은 실제 RED와 영향 범위를 root가 검토한 뒤 좁게 진행한다. 모델·VM·브라우저 및 기존 baseline 실행 수를 각각 기록하며 최종 사용자 HTML은 합동 검증 후 생성한다. 전체 목표는 active다.
