# 옛 D2 임시복구본의 명시 인계 — 설계 초안

2026-09-15. [요구 대조 원장](creator-recovery-fidelity-review.md)의 다음 단위를 구체화한 검토용 제안이다. 현재 구현·실행 완료를 뜻하지 않는다. 이번 작업은 원래 D2와 현재 Program 소스 읽기 및 이 문서 작성뿐이며 제품 테스트·브라우저 실행·프로필 변경은 0이다. 다른 정본·runtime은 수정하지 않는다.

## 고정 요구와 설계 선택

원래 D2의 명시 저장본과 임시 작업을 구별하고, 실제 남은 복구본을 읽어 사용자가 고른 자료만 Program 작성 중 상태로 이어간다. 명시 저장 이력 복구를 복구본 인계로 재명명하거나 복구본을 가짜 저장 판본으로 만들지 않는다. 운영 key는 읽기 전용이며 삭제·정규화 재저장·migration·자동 병합·원래 저장소 writer 호출은 금지한다. 현재 native 미반영 입력 UI 검증을 먼저 마친 뒤 이 단위를 진행한다.

아래 화면 이름·새 DTO/파일 이름·기본 선택·인계 대상 전략은 **제안**이다. 기존 기능 재사용 요구를 구체화하는 초안이며 영구 제품 정책으로 확정하지 않는다. 구현 전 마지막 절의 선택을 검토하고 입력/출력 계약을 고정한다.

## 1. 원래 자료와 현재 접점

| 실제 근거 | 설계에 적용할 사실 |
| --- | --- |
| 원래 storage.ts 146–159행 (로컬 전용 근거: `../../../../flow-text-authoring-structure-template-p0-baseline-20260829/lib/flow/text-authoring/storage.ts#L146`) | recovery는 `recoveryId/draftId/document/revisionId/recoveredAt`와 호환용 `savedAt`, 선택적 `serviceRecovery`, 단계/선택/출력 맥락을 가진다. recovery 시각은 명시 저장 시각이 아니다. |
| 원래 autosave 867–895행 (로컬 전용 근거: `../../../../flow-text-authoring-structure-template-p0-baseline-20260829/lib/flow/text-authoring/storage.ts#L867`) / saveCoherentRecovery 897–938행 (로컬 전용 근거: `../../../../flow-text-authoring-structure-template-p0-baseline-20260829/lib/flow/text-authoring/storage.ts#L897`) | 일반 recovery의 revision은 document revision이다. coherent recovery의 document는 마지막 canonical 문서이고 바깥 revision은 `serviceRecovery.workingSource.revisionId`다. 따라서 두 revision 불일치만으로 손상이라고 판단하면 정상 미반영 입력을 잃는다. |
| 원래 service-state.ts 88–96행 (로컬 전용 근거: `../../../../flow-text-authoring-structure-template-p0-baseline-20260829/lib/flow/text-authoring/service-state.ts#L88`), 547–568행 (로컬 전용 근거: `../../../../flow-text-authoring-structure-template-p0-baseline-20260829/lib/flow/text-authoring/service-state.ts#L547`) | serviceRecovery는 실제 sourceSnapshot과 workingSource를 보존한다. `currentRevisionPair`는 coherent일 때만 있으며, 없다는 사실은 복구본 손상이나 빈 입력을 뜻하지 않는다. canonical/projection 전체 서비스 상태가 담긴 객체도 아니다. |
| 원래 회귀 180–208행 (로컬 전용 근거: `../../../../flow-text-authoring-structure-template-p0-baseline-20260829/lib/flow/text-authoring/service-state.test.ts#L180`), 338–368행 (로컬 전용 근거: `../../../../flow-text-authoring-structure-template-p0-baseline-20260829/lib/flow/text-authoring/service-state.test.ts#L338`) | 미반영 working 텍스트와 pair 없음, 첫 명시 저장 전 recovery가 실제 원래 지원 사례다. 이번에는 해당 테스트를 실행하지 않았다. |
| 원래 loadNewerRecovery 953–963행 (로컬 전용 근거: `../../../../flow-text-authoring-structure-template-p0-baseline-20260829/lib/flow/text-authoring/storage.ts#L953`), Workspace 1033–1041행 (로컬 전용 근거: `../../../../flow-text-authoring-structure-template-p0-baseline-20260829/components/flow/text-authoring/TextAuthoringWorkspace.tsx#L1033`), 복구 UI 4380–4416행 (로컬 전용 근거: `../../../../flow-text-authoring-structure-template-p0-baseline-20260829/components/flow/text-authoring/TextAuthoringWorkspace.tsx#L4380`) | 저장본보다 새로운 복구본과 첫 저장 전 복구본을 구분했다. 복구/표시 닫기/버리기는 별개였다. Program은 원래 key 삭제가 금지되므로 원래 `clearRecovery`를 연결할 수 없다. 원래 UI는 document와 stage/selectedItemId/primaryArtifact를 전달했으며 모든 serviceRecovery 상태를 복원했다고 확대하지 않는다. |
| 원래 storage read 611–627행 (로컬 전용 근거: `../../../../flow-text-authoring-structure-template-p0-baseline-20260829/lib/flow/text-authoring/storage.ts#L611`) | repository reader는 문서·이력·상태를 정규화하고 시각 alias를 보충한다. 원래 repository를 생성해 읽기 포트로 재사용하지 않는다. 실제 wire를 직접 읽는 순수 decoder로 원본 바이트를 보존한다. |
| 현재 [history codec 12–43행](../../../lib/flow/integrated-poc/creator-history-codec.ts#L12), [library UI 26–40행](../../../components/flow/integrated-poc/ProgramCreatorDraftLibrary.tsx#L26) | 저장 이력 reader는 recoveries를 열거하지 않는다. UI가 명시 read를 하고 mutate 내부에서 원래 wire를 다시 읽어 비교하는 접점은 재사용할 수 있다. 기존 saved-history decoder의 의미는 바꾸지 않는다. |
| 현재 [native source 10–11행](../../../lib/flow/integrated-poc/native-creator-document-contract.ts#L10), [saved reader 38–42행](../../../lib/flow/integrated-poc/native-creator-document.ts#L38) | native source는 현재 `storageKey/draftId/versionId/revisionId/documentJson`인 **저장 판본 전용**이다. recoveryId를 versionId로 위장해서 기존 validator를 통과시키는 shortcut은 금지한다. |
| 현재 [working validator 17–26행](../../../lib/flow/integrated-poc/creator-workspace-validation.ts#L17), [workspace validator 50–54행](../../../lib/flow/integrated-poc/creator-workspace-validation.ts#L50) | native canonical raw와 pending raw는 별개다. 새 미저장 working은 `baseRecordRevision:null`이며 같은 ID의 library record가 없어야 한다. `nativePendingRawText`는 native owner가 있고 canonical raw와 다를 때만 가능하다. |
| 현재 [controller 35–89행](../../../lib/flow/integrated-poc/controller.ts#L35), [store 153–207행](../../../lib/flow/integrated-poc/program-store.ts#L153) | Program 한 envelope의 CAS/readback·협력 writer lock·실패/불확실 상태 보호를 재사용한다. readback 뒤 알림 실패는 저장 실패가 아니며 재인계하면 안 된다. 다른 key와의 분산 transaction은 아니다. |

## 2. 화면 흐름 제안

기존 `PoC 설정 → 기존 제작 초안 가져오기` 안에 저장 이력과 구별한 `개발2 임시 작업 읽기` 진입을 둔다. 페이지 진입·접힘 열기만으로 읽기/인계를 자동 실행하지 않는다. 실제 읽기 버튼 이후에도 저장 호출은 0이다.

1. **목록 읽기:** 제목, 원래 draft/recovery 식별값, 복구 시각, `마지막 저장 이후` / `첫 저장 전` / `저장본보다 오래되거나 같은 시각`을 보여 준다. 날짜만 보고 어느 항목도 자동 선택하거나 인계하지 않는다. 자료 없음, 읽기 불가, 손상, 지원하지 않는 구조는 별도 상태다. 초안 제목이 같아도 ID로 구별한다.
2. **명시 선택·비교:** 선택한 recovery의 실제 canonical 원문과 미반영 working 원문을 구분한다. 기존 durable record가 있으면 그 저장 시각·revision·원문을 비교 기준으로만 읽는다. 첫 저장 전이면 없는 저장본을 만들어 빈 비교 판본으로 표시하지 않는다. 원래 stage/선택 항목/출력 맥락과 적용 가능 여부, 전체 native 구조/복구 JSON은 필요한 경우 펼쳐 볼 수 있다. 사적인 raw는 URL/hash/history.state에 넣지 않는다.
3. **현재 작업 보호:** Program 작업이 명시 저장본과 다르거나 자식 inspector·raw·IME 입력이 남아 있으면 인계를 막고 현재 제작기로 돌아갈 수 있게 한다. 목록을 열거나 인계 버튼을 누르는 것만으로 현재 working을 자동 저장·삭제하지 않는다. 자동 복구 저장이 끝났다는 사실도 현재 working을 덮을 권한이 아니다. 사용자가 기존 제작기의 명시 저장/계속 편집 경로를 처리한 뒤 목록을 다시 읽고 재선택한다.
4. **확인·인계:** `이 임시 작업으로 제작 이어가기`를 명시 실행한다. 확인 화면에는 옛 원본·명시 저장 이력·개인 실행·공개물은 바뀌지 않으며, Program의 작성 중 상태로만 보관한다고 알린다. 인계 버튼 재입력·선택 변경은 pending 동안 잠근다. 저장 성공 확인 전 화면을 닫거나 성공 문구를 내지 않는다.
5. **복구된 제작 화면:** canonical 구조와 미반영 입력을 함께 보존한다. 아직 동기화하지 않은 pending raw가 있으면 현재 native 비교/적용 경계를 재사용하고 명시 저장/인계/공개를 우회하지 않는다. 원래 선택 항목이 정확히 존재하고 입력을 가리지 않을 때만 복귀시킨다. 명시 저장은 사용자가 나중에 별도 실행한다.

실패/취소 시 선택·비교 원문·현재 Program 입력은 보존한다. Escape/닫기는 읽기 세션만 닫고 trigger로 초점을 돌린다. 원래 복구본을 버리는 버튼은 만들지 않는다. 좁은 화면의 비교 영역은 전체 페이지를 가리는 다중 패널 대신 명확한 접힘/내부 스크롤을 제안하며, 44px 조작·키보드·가로 화면에서 실제 접근을 따로 검증한다.

## 3. 읽기 codec와 유효성 계약 제안

새 순수 `legacy-creator-recovery-codec`는 `string|null → 읽기 결과`로 시작한다. UI 포트는 `getItem`만 받는다. 파서·repository·Storage writer·네트워크를 decoder에 주입하지 않는다. 원본 wire 전체와 선택 entry의 원형 JSON을 보존하고 실행 가능 문자열을 평가하지 않는다.

| 입력 조건 | 제안 판정 |
| --- | --- |
| key 없음 / getItem throw / JSON 손상 / schema 불일치 | 각각 empty / unavailable / corrupt / unsupported. 임의 초기화·기본 fixture 없음. |
| root, 위험 key, 문자열/배열/객체 한계 | 기존 JSON 안전 guard를 재사용한다. 후보 초기 한계는 history reader의 wire 10,000,000자·raw 100,000자와 native document 2,000,000자를 넘지 않도록 잡고 recovery 개수 한계는 별도 명시한다. 이는 검토할 방어 한계이지 기존 모든 자료의 지원 선언이 아니다. |
| ownership 또는 identity 불일치 | creator만 대상. map key = draftId, recoveryId와 실제 documentId를 검사한다. 같은 제목을 관계 근거로 쓰지 않는다. 개인/제안 문서는 읽기 목록에서 구별하여 인계하지 않는다. |
| recoveredAt/savedAt | recoveredAt 우선, 없는 옛 자료는 원래 호환 alias savedAt을 읽기 파생값으로만 사용한다. 원형을 수정하지 않는다. 유효한 시각만 비교하고 두 값의 모순은 자동 정정하지 않는다. 동일 시각 순서는 ID로 안정화하되 자동 선택하지 않는다. |
| durable record 존재 | 같은 draftId의 실제 record만 비교한다. recoveredAt > lastSavedAt인 자료를 `마지막 저장 이후`로 표시한다. 이전/같은 시각 자료는 삭제하거나 최신이라고 부르지 않는다. 그 인계 허용 여부는 마지막 절의 검토 사항이다. durable record가 손상됐으면 비교 기준을 없다고 위장하지 않는다. |
| 일반 recovery(serviceRecovery 없음) | 실제 native document 전체 validator를 통과해야 한다. 바깥 revisionId = document.revision.revisionId를 확인하고 working raw는 document.rawText다. |
| coherent recovery(serviceRecovery 있음) | owner = local_recovery, recovery/draft/time 식별값, sourceSnapshot/workingSource의 owner·sourceSnapshotId·revision·raw·시각 연결을 검사한다. 바깥 revisionId는 workingSource.revisionId와 비교한다. canonical document revision과 달라도 정상 미반영 상태일 수 있다. source fingerprint는 원래 알고리즘으로 재계산 가능한 부분만 검증한다. |
| currentRevisionPair 존재/부재 | 부재를 손상으로 처리하지 않는다. 존재할 때 available canonical raw/parser ID/working revision과의 정합성을 검사한다. snapshot에 없는 projection 상태를 새로 만들어 pair 검증을 통과시키지 않는다. 원래 pair와 sourceSnapshot은 provenance로 보존하며 Program의 확정/ready 권한으로 쓰지 않는다. |
| native DTO 미지원·정확 관계 불명 | 원래 wire와 선택을 유지하고 `전체 제작 상태를 안전하게 이어갈 수 없음`으로 막는다. raw만 가져온 성공으로 축소하지 않는다. 알 수 없는 중요한 필드를 버리거나 재파싱해 성공시키지 않는다. |
| 빈 raw 또는 공백/CRLF | trim·개행 정규화로 import 원문을 덮지 않는다. 정상 첫 저장 전/빈 미반영 입력도 지원해야 한다. DOM textarea의 개행 표현과 저장 원형 bytes 비교는 따로 기록한다. sidecar만 있고 이 key에 recovery가 없으면 다른 key를 임의 합성하지 않는다. |

손상 한 행 때문에 전체 목록을 막을지 유효한 다른 행은 읽기 허용할지는 제안으로 남긴다. 최소 안전 계약은 손상 행을 숨기고 `모두 정상`으로 표시하지 않고, 선택한 행 및 관계 기준의 완전한 검증 없이는 인계하지 않는 것이다. 실제 선택 raw를 console이나 에러 메시지에 출력하지 않는다.

## 4. Program owner와 손실 없는 매핑 제안

**권장안:** 기존 native source의 저장 판본 branch를 그대로 유지하고, 구별 가능한 recovery provenance branch를 추가한다. 예시 이름은 `kind:'legacy-recovery'`이며 실제 storageKey/draftId/recoveryId/recoveredAt, canonical document JSON, 원래 recovery JSON과 working/source 관계를 담는다. 저장 판본 branch와 달리 versionId를 요구하거나 생성하지 않는다. 기존 source/selection/context/history/replay validator와 모든 consumer가 두 출처를 명시적으로 처리하도록 먼저 영향 목록을 만든다. 새 branch를 `readNativeCreatorSavedDocument`에 무조건 허용하는 식으로 저장 판본의 의미를 흐리지 않는다.

| Program 값 | 인계 제안 |
| --- | --- |
| Program draftId | 새 Program ID를 사용한다. 원래 draftId/recoveryId는 provenance 안에 보존한다. 같은 제목·기존 imported draft와 자동 합치지 않는다. 이 전략은 아래 검토 사항이다. |
| native owner.document / working.rawText | 실제 recovery.document 전체와 그 raw를 그대로 쓴다. canonical item/row identity, 제외/검토/출처 상태를 보존하며 raw 재파싱으로 owner를 재생성하지 않는다. |
| nativePendingRawText | serviceRecovery.workingSource.rawText가 canonical raw와 다르면 exact 값을 넣는다. 같으면 필드를 만들지 않는다. 미반영 입력이 비어 있어도 차이를 보존한다. 원래 sourceSnapshot/working revision은 별도 provenance로 유지하고 pending 텍스트만 남긴 뒤 버리지 않는다. |
| baseRecordRevision/library/savedHistory | 새 working은 null이며 Program library record와 가짜 저장 이력을 만들지 않는다. 옛 durable record/history는 원래 key에 그대로 있고 필요하면 비교 provenance로만 보존한다. 명시 저장은 인계 뒤 다른 사용자 거래다. |
| nativeSelection/recordUi | saved-version tuple과 recovery tuple을 구별한다. stage/primaryArtifact는 현재 지원 값만 적용한다. selectedItemId가 exact document에 없으면 원래 값은 provenance에 남기고 선택 미복구를 표시하며 첫 항목으로 임의 대체하지 않는다. focusTarget은 임의 CSS selector나 코드로 실행하지 않는다. |
| StructureDraft | 이 key에 없는 옛 sidecar를 붙이거나 현재 다른 working의 structure를 이식하지 않는다. 기존 Program sidecar는 보호 집합에 포함한다. 별도 sidecar import는 이번 단위에 포함하지 않는다. |
| 개인 실행·공개·과거 저장본 | 생성/수정/삭제 0. 옛 readyReceipt나 currentRevisionPair로 공개 가능 상태를 부여하지 않는다. |

현재 Program working은 하나뿐이다. [setProgramCreatorWorking](../../../lib/flow/integrated-poc/creator-workspace.ts#L62)의 expectedWorking CAS만 맞는다고 덮어쓰면 안 된다. UI input lock/flush 포트, 명시 저장본과의 dirty 비교, exact expectedSpace를 함께 검사한다. 인계 시 현재 working 교체와 원래 값의 Program Undo 보존은 명시 거래 범위로 보여 준다. 기존 작업을 따로 보존할 다중 working 보관함은 이 문서에서 새 기능으로 추가하지 않는다.

## 5. 순수 transition·거래·재시도

제안 모델 함수는 `previewLegacyRecoveryHandoff(data, selection, actualLegacyRaw)`와 `handoffLegacyRecovery(data, request, actualLegacyRaw, now)`로 분리한다. 이름은 미확정이며 함수가 직접 저장하거나 시간/ID를 생성하지 않는다. 요청에는 actor, requestId, 새 Program ID, preview 시각, exact 원래 wire/선택 tuple, expectedSpace/expectedWorking, 검증된 mapping fingerprint를 고정한다.

1. 프리뷰는 읽기만 한다. actor는 현재 기존 reader와 같은 local-user 범위로 제한하고 다른 actor/타인 자료를 추정 연결하지 않는다.
2. 확정 시 현재 UI의 pending/composition/자식 입력과 source 변경을 다시 검사한다. Program mutate의 exclusive 구간에서 원래 key를 다시 읽고 프리뷰의 **전체 wire**와 비교한다. 같은 선택 행이라도 원래 wire가 바뀌면 다시 읽고 선택하도록 한다. Program disk 변경은 기존 controller가 conflict로 처리한다.
3. 순수 transition은 완전 검증한 새 working/provenance와 요청 receipt만 반환한다. 기존 public, 개인 text/기록/참조, library/history/handoff/source session, 다른 actor는 exact 불변이다. 첫 성공의 Program envelope revision +1, 허용 receipt +1, global Undo 1단위를 기대한다. working 복구 보관을 명시 library 저장으로 세지 않는다.
4. 원래 key 전체와 모든 prefix 밖 저장값은 바뀌지 않아야 한다. Program 성공 writer는 1회지만 quota/throw-after-write/readback 불확실 상황의 시도·정확 rollback은 기존 store 규칙으로 별도 센다. 실패를 언제나 writer 시도0이라고 단정하지 않는다. 변경 전 validation/stale/cancel은 0쓰기다.
5. 실패 전 preview/request/선택/원문을 보존한다. quota 등 명확한 미커밋 뒤에는 같은 requestId/targetId/시각/원래 wire로 재시도한다. 저장 성공 후 presentation 실패는 이미 성공이므로 UI 반영 재시도만 하고 같은 인계를 새로 요청하지 않는다.
6. receipt의 fingerprint는 선택한 recovery 전체와 mapping/target ID를 묶는다. 같은 request의 재호출은 결과 provenance가 그대로 존재할 때만 0변경 성공이다. 인계 뒤 편집했거나 Undo로 결과가 사라졌다면 receipt만 보고 되살리지 않는다. 다른 requestId의 같은 recovery 재선택도 이전 연결을 검사해 중복 생성을 자동 허용하지 않는다. 재인계가 필요한 경우의 별도 명시 동작은 검토 후 결정한다.

**원래 key와 Program key의 교차 transaction 한계:** Program lock은 원래 D2 writer를 잠그지 않는다. 최종 getItem 비교는 읽은 시점의 exact snapshot 인계를 보장할 뿐, 그 뒤 다른 탭의 원래 저장이 절대 발생하지 않는다는 보장은 아니다. 인계 뒤 원래 key가 바뀌었다면 `선택한 복구본은 인계됨 / 원래 자료는 이후 변경됨`을 구분한다. 이미 확인한 Program 성공을 임의 rollback하거나 원래 key를 되돌리지 않는다. 더 강한 동시성 요구가 나오면 별도 계약 검토가 필요하다.

## 6. 개발 순서 제안

| 단계 | 좁은 작업 단위·검토 완료 조건 |
| --- | --- |
| 0. 선행 확인 | 현재 native 미반영 UI 복구 결과를 연결한다. 과거 저장본 full native 복구와 raw-only working 결과로 대체하지 않는다. |
| 1. 읽기 codec | 원래 일반/coherent/첫 저장 전 실제 형식과 source 관계를 검증하는 순수 reader·회귀를 먼저 추가한다. 원래 repository 호출0, getItem 이외 주입 접근을 throw로 검사한다. 원래 작성 helper를 쓰는 테스트는 메모리 자료 생성으로 한정하고 브라우저 seed에 쓰지 않는다. |
| 2. 출처/owner 확장 | recovery 전용 provenance, native 초기 owner/replay/selection/working/context/history의 round-trip을 설계·구현한다. 기존 saved-version branch와 검증 강도를 그대로 유지한다. validator import cycle·엄격 shape/용량·구판 payload 읽기0쓰기를 대조한다. |
| 3. 순수 인계와 controller | expectedSpace/working/source CAS, dirty 차단, 정확 허용 delta, receipt idempotency/Undo, 실제 store failure/readback/presentation 경계를 테스트한다. 인계 후 후속 명시 저장·복제·재진입이 recovery 출처를 잃지 않는지 검사한다. |
| 4. UI 연결 | 기존 library read 진입에 목록·비교·확정·실패 재시도를 연결한다. 실제 root 콜백 및 input lock 순서를 테스트하고 성공 전 navigation 금지·현재 입력 보존·포커스 복귀를 확인한다. |
| 5. 실제 UI 검증 | 승인된 exact predecessor/build에서 실제 read→선택→비교→명시 인계→pending 재진입→비교/명시 반영을 실행한다. 새 원본 key 자료가 필요하면 별도 승인된 QA 자료 준비로 분리하고 누적 profile/실제 원래 key를 덮지 않는다. 최초 실패는 보존하고 같은 상태 tail만 검토 후 실행한다. |

구현 예상 접점은 새 recovery codec/contract/transition, 기존 native source·context·working 검증, ProgramCreatorDraftLibrary와 부모 입력 보호다. 이 문서 작성은 그 파일 변경 권한이나 구현 완료를 뜻하지 않는다.

## 7. 테스트 행렬과 종료 근거

| 사례 | 모델/부모·저장 검사 | 실제 UI에서 확인할 것 |
| --- | --- | --- |
| 저장 이후 일반 recovery | exact document/revision·durable 관계, 원래 history 불변 | 같은 제목의 다른 draft와 구별하고 선택·취소·인계 |
| 첫 저장 전 recovery | durable 없음·library 증가0·base null, 빈 raw 허용 | 없는 저장 이력을 만들지 않고 제작 재진입 |
| 미반영 coherent recovery | canonical A / working B / 바깥 working revision의 정상 차이, pair 없음 허용 | B를 보여 주고 A 구조는 미반영으로 표시; reload 뒤 B exact 유지 |
| coherent pair 있음 | available source/parser/working 관계 검증, ready 승격0 | 이미 같은 raw인 경우 가짜 pending 경고나 불필요 재반영 없음 |
| 공백·빈 pending·CRLF·한글 | 원형 문자열/원래 ID 정확 보존; raw-only fallback 금지 | DOM 표현과 wire 비교 분리, 실제 IME는 실기기 증거와 합성 회귀 구별 |
| 단계·선택·출력 맥락 | 유효 값 적용, missing Item 무단 대체0, 원래 메타 보존 | 이동 직후 가려진 포커스/다른 Item 이동 없음, 실패/닫기 정확 복귀 |
| 오래된/동시각 복구본·시각 alias | 원래 시각 보존, 최신 판정과 선택정책 분리 | 오래된 자료를 최신으로 오인시키지 않음 |
| 손상 root/entry/관계·미지원 DTO/한계 | 명시 error, 파서 재생성·writer0 | 선택/원래 입력 유지, 위험 항목을 정상 목록으로 숨기지 않음 |
| 현재 working dirty/자식 입력/IME | flush 성공과 명시 저장을 혼동하지 않음, stale closure/actor 교체 차단 | 경고만으로 입력 삭제·인계되지 않음 |
| source 또는 Program 다른 탭 변경 | exact wire/space CAS 거절0변경 | 재읽기 전 자동 재시도/다른 항목 선택 없음 |
| quota·throw-after-write·readback 미확정 | 기존 store의 정확 readback/rollback/recovery-required, 이중 커밋0 | 실패 선택 보존·같은 요청 재시도; 원래 실패 artifact 보존 |
| 성공 뒤 알림 실패·중복·Undo | receipt/결과 provenance 대조, 성공 재저장0, Undo 후 자동 부활0 | 화면 반영 재시도와 새 인계 구별, Undo/reload exact 결과 |
| 모바일·키보드·긴 raw | 부모 handler 회귀와 geometry 검사는 별도 | 375×812, 390×844, 844×390, 1024×768, 1440×900에서 필수 조작/스크롤/초점; 실기기 완료 주장 금지 |

완료 보고에는 실제 원래 draft/recovery/document/working revision과 Program draft ID, predecessor/final raw SHA·envelope revision, 명시 저장/receipt/Undo delta, 전체 보호 bytes, pending/canonical 비교, 빌드, 실패 및 후속 artifact를 함께 남긴다. 단위/부모 회귀, 실제 브라우저, 화면 직접 검토, 실기기·관찰 사용자는 각각 분리한다. 무작정 기존 검사를 반복해서 두 번째 전체 목적 루프의 완료로 세지 않는다.

## 8. 구현 전 검토할 선택

| 선택 | 권장안과 이유 |
| --- | --- |
| 새 Program working vs 이미 import한 draft에 복구 적용 | **새 미저장 Program working 권장.** 기존 저장본·개인 실행 연결을 건드리지 않고 원래 미완료 자료를 보존한다. 같은 imported draft에 붙이는 방식은 명시 대상·base/history/handoff 관계의 추가 계약이 필요하므로 자동 선택하지 않는다. |
| 오래되거나 같은 시각인 recovery | **목록에서 시각 관계를 표시하고 기본 인계 대상에서는 제외하는 안 권장.** 원래 loadNewerRecovery와 맞춘다. 필요할 때 별도 명시 선택을 허용할지는 실제 남은 자료와 요구를 검토해 결정한다. 삭제는 어느 안에서도 없다. |
| 손상 행과 정상 행이 함께 있음 | **root/관계 기준 손상은 차단, 독립 entry 오류는 드러내고 검증된 다른 선택만 허용하는 안 권장.** 적용 전 오류 격리 범위와 한계를 테스트로 고정한다. 전체를 조용히 정상 처리하지 않는다. |
| 이미 인계한 같은 recovery 다시 선택 | **기존 인계 결과를 안내하고 0쓰기 재열기 우선 권장.** 현재 편집·Undo 상태가 달라졌으면 자동 덮어쓰기/중복 생성을 막는다. 새 복사 재인계가 필요하면 별도 명시 계약으로 검토한다. |
| 현 UI가 지원하지 않는 옛 focus/stage 세부 맥락 | **원래 값을 provenance로 보존하고 미복구를 표시하는 안 권장.** 기본 첫 Item으로 몰래 바꾸지 않는다. canonical/미반영 원문이 무손실로 이어지는 기능과 옛 UI 완전 재현을 구별한다. |

이 선택들은 새 영구 복구 정책이 아니다. 아래 실행 기록에서 채택한 범위만 이번 PoC의 교체 가능한 계약으로 구현했다.

## 9. 구현·실행 정본 연결 — 2026-09-20

[개발2 임시 작업 복구 구현·검증 원장](legacy-recovery-review.md)을 현재 구현과 실행 판정의 정본으로 연결한다. 앞 절의 설계 제안 전체를 완료로 읽지 않는다. 새 미저장 working, 저장본보다 새 recovery만 인계, 독립 오류 표시/관계 손상 차단, exact 기존 결과 0쓰기 재열기와 Undo 후 자동 부활 금지를 구현했다. saved-version reader/restore 의미와 원래 저장소 읽기 전용 경계를 유지했다.

원래 helper로 메모리에서 생성한 일반 first-save-before/coherent pending/newer-than-saved 자료 3종은 별도 승인된 신규 QA 프로필에 한 번씩만 준비했다. 기존 누적 프로필/사용자 원본에는 seed하지 않았다. setup 6회와 앱 성공 거래 10회, quota 실패 1회는 구별한다. 실제 브라우저 원장 (로컬 전용 근거: `../../../output/playwright/legacy-recovery-2026-09-20T05-25-48-359Z-c698ca1c/QA-SUMMARY.md`)에 최초 실패 4건과 상태 초기화 없이 이어간 결과를 남겼다. 실제 Android/iOS와 관찰 사용자는 0이며 통합 목표 전체 완료를 뜻하지 않는다.

실제 10거래의 strict decode·순수 인계·forward/Undo·store exact wire 교차검사는 detached 결과 (로컬 전용 근거: `../../../output/playwright/legacy-recovery-2026-09-20T05-25-48-359Z-c698ca1c/detached-2026-09-20T05-50-25-852Z.json`)에 있다. 빌드 기준 source/test hash 417개 변경 0건을 확인했다. 다른 후보를 dirty 작업에 교차 인계하는 UI 검사와 별도 보류 UX는 원장 한계로 남긴다.
