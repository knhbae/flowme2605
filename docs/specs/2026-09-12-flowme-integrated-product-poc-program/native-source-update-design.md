# Native 원문 후보 업데이트 연결 설계

상태: 2026-09-13 읽기 전용 원계약 감사와 후속 adapter 설계. 제품 구현·테스트 실행·브라우저 검증 결과가 아니다. [정본](./spec.md), [현재 검증](./current-validation.md)의 전체 범위는 유지한다.

## 조사한 원계약

원본 기준은 `D:/flowme2605/flow-text-authoring-unified-editor-verify-20260831/lib/flow/text-authoring/source-update-service.ts`이다. 파일을 실행하거나 원래 저장소/writer를 import하지 않았다.

| 근거 | 보존할 계약 |
| --- | --- |
| source-update-service.ts:237, 299 | 후보 envelope는 content/source ID, active snapshot, working revision, 외부 버전, 정확 UTF-8 길이/hash, 수집/수신 시각, idempotency를 검증한다. local_synthetic은 실제 fetch나 출처 권한 증거가 아니다. |
| source-update-service.ts:378 | stage는 canonical 복제본에만 후보를 올리고 Base↔Candidate와 Working↔Candidate를 따로 비교한다. 원래 working은 바뀌지 않는다. |
| source-update-service.ts:459 | 변경은 내 값 유지/새 값 수용/나중에 선택한다. 추가는 제외/포함, 삭제는 이전 항목 유지/제거에 대응한다. later는 결정을 다시 open으로 만든다. |
| source-update-service.ts:522, 546, 566 | reload 때 현재 creator 권한을 재검증하고 head가 달라졌으면 stale로 표시한다. defer는 선택·위치를 보존하는 별도 상태다. |
| source-update-service.ts:657, 690 | receipt는 결정 집합, projection options, 이전/결과 aggregate와 working/canonical/projection revision을 묶는다. 수신한 receipt를 결과 재계산으로 검증한다. |
| source-update-service.ts:835 | 모든 변경의 명시 결정 후 apply한다. 정확 결과의 재요청만 replay로 처리한다. 결과는 dirty이며 명시 저장과 구분한다. sourceSnapshot/lastExplicitSave는 보존하고 readyReceipt는 지운다. |
| source-update-service.ts:997, 1037 | Undo는 receipt와 현재 결과가 정확히 일치해야 한다. hydrate는 creatorCanApply=false로 돌려 저장된 allow를 권한으로 쓰지 않는다. |

원래 `source-update-service.test.ts`의 137/159/195/253/310/362/397/486/542행 테스트는 envelope, 권한, 원자 적용/Undo, stale·실패, defer/reentry, receipt 변조, 비기본 반복 projection options를 다룬다. 이번에는 읽었으며 실행하지 않았다.

`navigateLater`라는 이름의 API는 위 서비스/Workspace에서 발견하지 못했다. 원래 Workspace의 `handleDeferSourceCandidate`(TextAuthoringWorkspace.tsx:3727 부근)는 선택 위치를 저장하고 deferred로 바꾼 뒤 비교창을 닫는다. 이를 자동 페이지 이동/자동 적용 계약으로 해석하면 안 된다. Program의 ‘나중에/다른 화면으로’는 아래 입력 보호와 저장 성공 경계를 별도로 연결해야 한다.

## Program 최소 연결

현재 `creator-native-workspace.ts`의 `buildProgramNativeCreatorRawSyncOperation`은 진행 중 sourceState가 있으면 raw sync를 거절한다. `applyProgramNativeCreatorOperation`은 expectedWorking/expectedOwner, pending raw와 정확한 operation, 활성 초안 및 actor를 검사한다. 이 보호를 해제하여 후보를 일반 raw 교체로 처리하지 않는다.

1. Program 전용 optional versioned 후보 owner를 creator working에 둔다. 기존 필드 없는 payload는 읽기만 하고 자동 migration하지 않는다. 실제 위치와 validation 확장은 구현 담당자와 조율한다.
2. owner는 draft/native owner 식별자, base native owner revision/fingerprint, envelope, immutable candidate document, 명시 선택, 상태, 선택 change ID/scroll, 적용 receipt를 담는다. 원본 전체 문서의 역할·포함·순서·review·출처·row identity를 유지한다. raw만으로 기존 full document를 재구성하지 않는다.
3. `stage / decide / defer / reject / apply / undo`는 순수 Program transition으로 노출한다. 저장된 permission은 권한이 아니며 각 mutation/reload에서 현재 actor·초안 소유·보관 상태를 확인한다. sourceOwnerClaim도 권한이 아니다.
4. 서비스의 순수 비교/결정/receipt 의미를 Program 경계에서 재사용한다. 필요한 순수 dependency만 출처/hash를 추적하는 별도 Program vendor 절차로 도입할 수 있다. 원본 앱·repository·운영 writer 직접 import와 전역 이벤트 수신 자동 적용은 금지한다.
5. apply는 최신 expectedWorking/expectedOwner와 후보 세션 CAS를 동시에 검사한다. 계산한 native document/receipt/working raw를 한 Program 저장에 넣는다. canonical JSON key 순서가 바뀐 reload 후에도 구조 비교가 같아야 한다. private execution source 업데이트는 별도 명시 수용이며 제작 후보 적용만으로 개인 기록/공개판본을 변경하지 않는다.
6. 실패한 저장은 성공 mutation 0, 저장 bytes 불변, 후보·선택·입력 유지다. quota의 실패 setItem 시도까지 ‘쓰기 시도 0’이라고 부르지 않는다. 중복 성공은 content revision을 늘리지 않는다.
7. 원서비스 Undo의 beforeApplyState는 해당 제작 aggregate 복구용이다. Program 전체 space를 덮어써 무관 문서·새 개인 기록을 지우지 않는다. 적용 뒤 편집이 있으면 조용한 과거 덮어쓰기를 거절하고 정확한 충돌을 보여준다. 전역 Undo와 후보 Undo의 차이를 UI에 구분한다.

## 필요한 화면 흐름

- 현재 원문/내 작업/후보의 차이를 제목·내용·날짜·반복·포함·역할 등 실제 변경 중심으로 보여준다. 연결 ID/receipt JSON은 접힌 상세로 둔다.
- 각 변경에 유지/수용/나중에를 명시한다. 첫 항목 자동 수용, 제목·배열 위치로 ID 추정, 빈 선택 전체 수용을 하지 않는다.
- ‘나중에’는 결정과 위치를 저장한 후 닫는다. Esc/취소는 새 후보 적용 0이며 미저장 선택이 있다면 보존 여부를 분명히 한다. 저장 실패하면 화면 이동하지 않는다.
- 부모의 text/Structure/child 입력 port를 lock→flush/capture→검증한다. dirty/IME/미해석 raw가 남으면 후보 전환·actor 전환·다른 초안 열기를 중단하고 입력을 유지한다. 해제는 finally에서 수행한다.
- 재진입 시 같은 draft/session/change를 복구한다. 누락 대상은 명시 안내하며 다른 글/첫 항목으로 성공처럼 대체하지 않는다. history에는 presentation 식별자만 넣고 후보 raw·비공개 비교 데이터는 넣지 않는다.
- stale이면 이전 후보와 현재 head를 보존한 채 새 비교를 시작할 수 있어야 한다. old 결정을 새 후보에 자동 이식하지 않는다. 권한 상실은 읽기/자기 입력 보존과 적용 금지를 구분한다.
- 적용 성공 뒤 mounted editor는 저장된 matching native owner/raw와 동기화한다. dirty/IME를 덮지 않으며 새 buffer 기준이 맞기 전 재진입을 성공으로 표시하지 않는다. T6e global Undo baseline 결함의 후속 수정은 새 실행판 검증이 필요하다.

## 최소 negative/왕복 검사표

| 사례 | 필수 oracle |
| --- | --- |
| 정상 후보 | 실제 parser로 만든 명시 local fixture, Base/Working/Candidate 분리, stage 때 원문/working 불변 |
| envelope 손상 | 빈 ID, 잘못된 버전/charset/시각/byte hash, CRLF↔LF 차이, 다른 draft/source/base 모두 거절 |
| 권한/재진입 | persisted allow 변조·actor 교체·denied 재허용·보관 초안 적용 거절; read mutation 0 |
| 결정 누락 | later/open 하나라도 있으면 apply 0; 추가/삭제/중복 제목의 정확 ID 선택 |
| 개인 수정 충돌 | Base와 다른 내용/역할/포함/하위 구조를 유지/수용으로 구분; 허위 matches 거절 |
| stale/CAS | stage 후 raw/native/review 변경, 다른 탭 갱신, 요청 중 actor 변경 전부 원문 보존; 새 비교 경로 존재 |
| projection | 기준일·finite/open 반복 범위·시간대 옵션이 receipt와 재계산에 일치; 기본값으로 복귀 금지 |
| 실패/retry | domain 전/commit 전/quota 실패 bytes 불변·선택 유지; retry 성공 1, duplicate 성공 0 추가 변경 |
| canonical roundtrip | 실제 controller serialize/read→authorize→choose→apply→reload→Undo, key 순서 무관 |
| receipt 공격 | decision hash/options/base/result/snapshot 변경·다른 세션 replay·terminal 재적용 거절 |
| Undo 이후 추가 작업 | 무관 Flow/doc/참조/실행 기록 보존; 해당 native head 변경은 조용히 덮지 않음 |
| 화면 왕복 | defer→다른 메뉴→Back/reload 정확 change/scroll; missing target 안내; raw history 유출 0 |
| 입력 보호 | 실제 child port/IME/pending raw/중복 클릭/저장 실패에서 이동 0, 원입력 유지, lock 해제 |
| 공개·운영 경계 | public bytes, 원본 library bytes, 운영 키 before/after 동일; 외부 fetch/publish 0 |

완료 기준은 후보 비교창의 존재가 아니다. 명시 수용·실패 복구·재진입·Undo를 실제 controller와 새 빌드 UI에서 왕복하고, 원본/개인/공개 소유 경계가 유지되어야 한다. 실사용자·실기기·외부 수집 검증과 local synthetic QA는 별도로 보고한다.
