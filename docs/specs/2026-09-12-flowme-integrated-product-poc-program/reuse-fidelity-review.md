# 기존 제작 기능 재사용 정밀 점검

2026-09-13 10:31 갱신: [일반 속성 대조](creator-inspector-addition-review.md)에서 원래 D2가 허용한11속성 추가를 통합 화면이 거절하던 차이를 수정하고, 저장 후 원문 갱신과 inspector 재생성을 분리했다. 최종 Gpl40확인에서 개인 기록·참조·공개 불변과3Undo/reload를 검증했다. 원래 provenance4필드의 제한은 유지한다. 병합/분할 NCUI18/19/20·명시 lineage NL02/03의 모델 근거를 기존 제작 전체 왕복 완료로 세지 않으며 다음 대조 대상으로 유지한다.

## 10:38 병합·분할의 다음 대조 기준

원래 D2 Workspace (로컬 전용 근거: `../../../../flow-text-authoring-structure-template-p0-baseline-20260829/components/flow/text-authoring/TextAuthoringWorkspace.tsx`)의 `handleMergeNext`·`handleSplit`·`handleConfirmCorrection`과 현재 [ProgramCreatorNativeContext](../../../components/flow/integrated-poc/ProgramCreatorNativeContext.tsx), [구조 UI 검사](../../../components/flow/integrated-poc/ProgramCreatorNativeContext.test.tsx), [최초 명시 연결 검사](../../../lib/flow/integrated-poc/creator-native-lineage.test.ts)를 읽었다. 이번 부분은 소스 대조이며 새 병합/분할 브라우저 실행이 아니다.

| 접점 | 원래 동작과 현재 연결 | 다음 증거 |
| --- | --- | --- |
| 합치기 | 둘 다 같은 Step의 다음 항목과 비교 후 명시 적용. 날짜/완료 기준/속성 충돌은 거절. 원문은 유지 | NCUI18 성공/취소·NCUI19 거절은 있음. 기존 개인 진행/메모가 각각 있는 두 항목을 합친 뒤 보관·참조·원본 Undo·개인 인계를 실제 대조 |
| 나누기 | 둘 다 제목의 띄어쓰기 경계, 상세/날짜/자료를 양쪽에 이어 줌. 원문은 유지 | NCUI20 실패 입력 보존/재시도/한 항목 증가. 기존 개인 진행을 임의 복제하지 않는지, 새 항목과 원래 항목의 선택/초점 및 공개 결과를 검사 |
| 나눌 위치 선택 UX | 원래는 중앙에 가까운 경계를 제안하고 확인. 현재는 빈 선택에서 사용자가 경계를 고름 | 동작 축소라고 확정하지 않음. 미선택 실수·입력 부담과 비교 이해도를 평가하고 제안 유지 여부 판단 |
| 최초 개인 연결 | NL02는 한 기존 ID+새 target, NL03은 한 기존 ID+나머지 보관을 명시 선택 | 이미 native 실행으로 연결되고 지난 기록·참조가 있는 사본의 재인계는 별도. 최초 raw→native 연결 검사를 그 전체 조합의 증거로 세지 않음 |
| 선택 공개 | 원문 bytes와 해석된 구조가 다를 수 있음 | 명시 저장본의 병합/분할 결과와 실제 공개 whitelist를 대조. 원문 중복·미선택/개인 정보 유출0, 기존 공개 판본 불변·개인 Undo/reload 확인 |

위 접점의 정상/취소/실패/다시 열기를 한 자료에서 검증한 뒤 다른 원문 구조로 반복한다. 단순 title 수정이나 빈 상태의 두 항목으로만 통과시키지 않는다.

## 이전 대조 기록

2026-09-13 갱신: 아래 최초 차이는 과거 시점이다. 현재는 실제 전체 native 저장본/구조/작성 틀/Calendar 정렬·원본 비교·개인 선택 수용이 연결됐으며, 같은 genuine 원문의 하위 체크·CRLF identity·기록/다중 참조·출력/공개까지 A93에서90확인했다. [현재 판정](current-validation.md)의 빌드·실행 범위와 [상황별 종결](journey-closeout.md)을 우선한다. 이 범위를 원래 제작기의 모든 조작과 모든 원본 형식의 동등성으로 확대하지 않는다. 새 출력 표현 보완은 이후 소스로 따로 검증한다.

2026-09-12 17:55 UTC · 기존 세 산출물의 세부 기능을 새 화면의 존재나 테스트 수로 대체 판정하지 않는다. 현재 제품 범위는 승인 정본 (로컬 전용 근거: `../../../../flow-text-integration-plan-20260908/docs/specs/2026-09-12-flowme-integrated-product-poc-program/spec.md`)을 따른다. 이번 점검은 외부 게시·운영 저장소 수정·새 영구 정책을 승인하지 않는다.

19:32 갱신: 아래 최초 차이 표는 당시 판정이다. 6lO에서 Calendar 상대/반복 순서·native Undo·재인계, T6e에서 전체 native 문서 복구와 StructureDraft 부모 연결까지 진척됐다. [현재 판정](current-validation.md)에 소스/실행판/실제 결함을 분리한다. 원래 D2의 merge/split·상세 inspector(실제16 patch필드)·원본 후보 세션도 재사용 대상임을 확인했다. 현재 native 구조 일부 조작을 원래 전체 제작 UX 동등성으로 세지 않는다. 원본 후보의 local synthetic host를 실제 외부 수집·게시로 표현하지 않는다.

| 요구/기존 실제 기능 | 확인한 원본 | 현재 차이 | 구현·검증 종료 조건 |
| --- | --- | --- | --- |
| 저장 이력 목록·이전 저장본 복구 | 개발2 storage.ts (로컬 전용 근거: `../../../../flow-text-authoring-structure-template-p0-baseline-20260829/lib/flow/text-authoring/storage.ts`)의 `restoreVersion`은 선택한 `version.document` 전체를 새 저장본으로 저장. Workspace (로컬 전용 근거: `../../../../flow-text-authoring-structure-template-p0-baseline-20260829/components/flow/text-authoring/TextAuthoringWorkspace.tsx`)의 history UI에서 정확한 version을 선택·복구 | Program library one-Undo, 실행 인계 판본, 개인문서 checkpoint는 서로 다른 기능. 기존 arbitrary saved history 재사용 완료가 아님 | 실제 남아있는 history를 읽기 전용 검증·목록·비교하고 명시 복구를 Program 한 거래로 기록. 원문 이외 canonical/구조/선택/검토 정보의 보존·편집 범위도 대조. raw만 복구한 단계는 부분이며 전체 document 복구로 세지 않음. 실패/중복/stale0·Undo/reload·개인실행/공개 불변 |
| Calendar 결과에 맞춘 같은 Step의 원문 정렬 | 개발2 Workspace의 `calendarSourceAlignment`: eligible Calendar rows의 Item별 최초 rank를 사용. 상대/반복 전면 차단 없음 | Program `creator-source-order.ts`는 상대/반복 항목이 섞이면 구간 전체를 차단 | 기존 조회기간/anchor/최초 회차 rank와 미정 항목 위치를 대조해 명시 비교·원문 block 순열로 재사용. 회차마다 원문 항목을 복제하지 않음. 기존 fixed-date native Undo 성공은 보존하되 전체 지원 동등성으로 확대하지 않음 |
| StructureDraft 변수 편집·빈 원문 복구·연결 해제 | 원 P0 spec (로컬 전용 근거: `../../../../flow-text-authoring-writing-template-ux-review-20260829/docs/specs/2026-08-29-flowme-p0-structure-template-development-starter/spec.md`)의 화면/통합 계약과 개발 handoff (로컬 전용 근거: `../../../../flow-text-authoring-structure-template-p0-baseline-20260829/docs/specs/2026-08-29-flowme-p0-structure-template-development/handoff.md`). 당시 UI 미구현·core 존재 | 검증 예시6개→빈 원문 적용은 보존했지만 변수 form·blank sidecar 복구·detach와 같지 않음. 기존 화면 삭제 회귀가 아니라 승인 설계·코어의 미연결 | 기존 reducer/compiler/planner 재사용, Program 선택 version필드로만 sidecar 저장. 선택/편집만으로 raw 변경0, 명시 materialize 1callback/한 nativeUndo, fingerprint/IME/stale/quota, raw-empty reload·pinned값·detach raw불변을 실제 확인 |
| 자료·영상 링크 | 원 grammar의 `자료`는 resource URL | 관련 링크 보존은 현재 범위. binary 첨부 업로드의 확정·구현 근거는 확인하지 못함 | 파일/TSV 입력과 binary 첨부 저장을 구분. 업로드를 기존 손실 기능으로 자동 추가하지 않음 |

실행 순서는 실제 저장본 복구 → 기존 정렬 지원 대조/연결 → StructureDraft form/sidecar 연결로 잡는다. 이 순서는 전체 목표를 세 기능으로 축소하지 않는다. 각각 실제 UI에서 시작/변경/실패/취소/Undo/다른 화면·reload까지 확인하고 [현재 판정](current-validation.md)에 소스·실행판·근거를 따로 기록한다.

기존 운영 writer를 가져와 호출하지 않는다. 원본 저장소와 다른 worktree는 읽기만 하고, 실제 원본 version ID를 가짜 Program revision으로 바꾸지 않는다. 과거 이력이 없으면 그 사실을 알리고 이력을 합성하지 않는다. 원본과 독립적인 새 실행·전체 백업/기기 이동·재공개 정책은 별도 의사결정 후보로 둔다.
