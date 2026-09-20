# B3 React Plan 표시 owner 독립 코드 검토

2026-09-06. [큰 Plan 설계](./k3b-react-large-plan-receipt-design.md)와 root의 첫 Surface 연결을 읽었다. 이 문서는 **코드 경로 검토**이며 아래 후속 패치의 완료나 브라우저 통과를 주장하지 않는다. 제품 수정은 root가 맡는다.

읽은 Surface SHA는 `D001DF60BB9FB6C70594E16A42ECE413679FF12FCEA3582F35C7D23BFAAD26F2`, EditorSurface `8D2C542DBD0A737D44C7F92654694800940A520A15C5CEBFEDD9B2A2AA0DBBB3`, PlanResultSurface `0CC9788814E99973FC383C23A1172279A6E281A53A28A57E8E5D2846AB8E59EE`다. 아래 줄 번호는 이 시점 기준이다.

## 최신 후속 읽기 — 실제 브라우저 판정과 분리

Surface `CE825646BB51CD27ECFD5759420AFB71B8126BF6DE8F8707611CFDC0EEBEA586`를 추가로 읽었다. 이전 결함 표는 최초 발견 이력이며 다음 변경을 확인했다.

- PRO01: actual prepared를 frozen WeakSet query로 분류한다(1067). genuine no-op만 count1 instrument를 우회하고 열린 raw/current revision/source bytes·epoch를 commit 전/후 확인, target/support0 뒤 noopAccepted를 기록한다. 1624의 close는 그 판정으로 새 noop display를 발행한다. raw clean fast path와 normalize 후0인 실제 handler 경로를 구분한다.
- PRO02: final target exact read가 stateRef/setState보다 앞인1457–1472로 이동했다. foreign/unreadable target은 adopt 전에 종료, target이 같고 source만 stale이면 저장 사실은 채택하고 결과 표시만 생략한다.
- PRO03: Undo가 이미 changed인데 owner/source가 stale인2392 분기에 검증된 Undo 저장완료·표시생략 안내를 추가했다. 과거 결과를 다시 발행하거나 rollback하지 않는다.
- PRO04: 결과 닫기와 Undo 완료 뒤2352의 rAF 복귀가 추가됐다. 같은 화면·editor/overlay0을 확인하고 opener 또는 main에 focus한다. 이 읽기 확인은 실제 가림·키보드 focus·scroll PASS가 아니다.
- quickConversionOpen이 Plan overlay에 명시 포함됐다. 자동 source banner는 편집/Plan display/기존 receipt 중 announceBanner=false를 받는다(5188). dialog 자체 오류 알림은 유지되며 [SSR10](./k3b-react-plan-result-ssr-qa.md)의 새2개가 이를 별도 확인한다.

추가 권고: genuine no-op `unchanged()`는 await 뒤 source/target/revision을 확인하지만, 바깥 commit 진입에서 확인한 `planDisplayBinding.current === binding`·같은 attempt/requestId를 내부 후검사에도 반복하면 늦은 callback에 대한 명세와 더 직접 일치한다. 지금 이 조합을 실제 UI로 재현한 새 결함이라고 주장하지 않는다. root에 권고를 전달했다.

이 후속 단계에서 제품 수정0, SSR 신규2 포함 최종10 실행과 코드 읽기만 수행했다. 최초 D001 검토를 최신 Surface 전체 브라우저 통과로 소급하지 않는다.

## 우선 발견과 후속 조치

| ID / 우선순위 | 실제 분기와 위험 | 필요한 최소 조치 / 확인 상태 |
| --- | --- | --- |
| PRO01 / P1 | Surface1059–1076는 actual prepare를 항상 target1 검증 instrument로 감싼다. plan-editor1137/1196의 semantic no-op은 target0이므로 충돌한다. **raw clean**은 transaction672가 handler를 건너뛰어 정상이며, raw dirty→normalize0에서만 문제가 된다. | 실제 prepare가 발급한 no-op의 private identity를 판별하고 source/target/owner current를 확인한 뒤0쓰기 close. summary0를 저장 권한으로 쓰지 않는다. root가 actual UI RED를 확인했고 [분류 API QA](./k3b-react-plan-noop-prepared-qa.md)를 별도 작성했다. Surface 후속 GREEN은 이 문서 범위 밖. |
| PRO02 / P1 | finalize1435의 stateRef/setState가 target exact read1447보다 앞이다. verified 뒤 외부 target이 바뀌면 현재 저장값과 다른 old candidate를 먼저 채택한 다음 failure 안내한다. 추가 writer는 current raw guard로 막히지만 UI의 상태 채택 순서가 잘못된다. | verifiedTargetRaw와 현재 target의 exact 일치를 확인한 뒤 채택. source만 바뀌고 target이 같으면 이미 검증된 저장 사실과 표시 생략을 분리한다. read 오류/foreign target을 임의 overwrite·rollback하지 않는다. root도 동일 분기 확인, 패치 예정. |
| PRO03 / P2 | undoPlanDisplay2346은 commitTransition이 `changed`와 state adopt를 끝낸 뒤 owner/source가 stale이면 status를 갱신하지 않고 return한다. planPresentation 때문에 일반 성공 status 발행은2320에서 생략되어 `saving`이 남을 수 있다. | 실제 확인된 Undo 완료와 결과 표시 생략을 제한 문구로 알린다. stale owner를 되살리거나 Undo/저장 재실행0. root도 동일 분기 확인, 패치 예정. |
| PRO04 / P2 | PlanResult 닫기의 onDismiss는 discard만 실행하고 새 결과 Undo 이후도 opener 복귀가 없다. 결과 버튼에 있던 키보드 focus가 없어질 수 있다. | root가 이미 추적하는 후속 focus gate. 실제 return-point/같은 화면 owner 확인 후 복귀해야 하며 SSR로 focus PASS를 만들지 않는다. |

PRO01의 초기 제보는 ‘아무 수정 없이 저장’까지 넓게 표현했으나 transaction의 clean fast path를 확인한 뒤 **raw-dirty semantic no-op**으로 정정했다. 그 정정 전 제보를 별도 제품 결함 수로 더하지 않는다.

## 연결 지점별 확인

| 위치 | 확인한 안전 경계 | 아직 독립 실행하지 않은 부분 |
| --- | --- | --- |
| 956–985 publishPlanDisplay | factory 오류를 catch하고 writer의 exception/rollback 경로로 전달하지 않는다. Plan만 새 memory display, Quick는 기존 v1. 발급 성공 시 old receipt ref/state를 함께 해제 | fault injection으로 display만 실패했을 때 exact 저장/복귀 보존 |
| 1048–1076 prepare/commit | private binding의 같은 attempt 참조·transactionId·draftRevision, actual source bytes/epoch·screen을 검사. evidence와 requestId를 같은 binding에 부착. commit 직전 재검사 | clone/late request·source 교체의 실제 UI 조합 |
| 1408–1482 finalize | actual evidence target1·verified raw/state·revision+1, 같은 binding/evidence/requestId, accepted1회. display failure와 이미 검증된 저장 성공의 문구 분리 | PRO02 순서 수정 및 실제 target read race |
| 1507–1616 close | 큰 canceled/noop에 v1 factory를 쓰지 않는다. child canceled는 baselineParent/draftParent의 같은 Item만 비교. publish는 non-throwing이고 이후 guard/attempt/evidence 정리 | summary 자체 예외를 일반적으로 catch한 것은 아님. 타입/소유권이 맞는100+ close는 브라우저에서 별도 검사해야 함 |
| 1691–1719 failure / EditorSurface | Plan failure는 새 full display를 저장하지만 활성 editor에서는 결과를 별도 렌더하지 않는다. editor error가 alert owner, preview는 off. retry는 private attempt/guard descriptor를 그대로 사용 | 큰 실패→같은 입력 retry와 live 중복 실제 관찰 |
| 1775–1822 open | effective source canonical bytes와 actual opener guard canonical을 대조, 다르면 열지 않는다. source-aware source를 임의 새 guard로 승격하지 않음 | source candidate 후 Plan 편집은 이 제약 안의 부분 지원. 완전 source-aware 동등성으로 보고 금지 |
| 2094–2127 관측/화면 | source event는 epoch증가, workspace event는 결과 owner를 영구 폐기. focus actual raw probe, source state 변경·화면 key 변경·overlay도 폐기 | 실제 두 탭은 미검사. 합성 StorageEvent와 구별. 편집이 열리기 전/준비 중 workspace ABA 전체를 별도 epoch가 보호한다고 주장하지 않음 |
| 2165·2194 일반 owner | Quick editor/receipt는 Plan 결과 폐기, 일반 workspace transition 진입도 폐기. Plan display는 K2C ordinary owner를 중단 | 일반 Quick receipt와 Plan 결과 동시 DOM frame 가능성은 별도 mounted 검사가 필요. 코드만으로 AT 알림0 확정하지 않음 |
| 2327–2359 own Undo | 같은 owner/display 참조, consumed1회, exact success raw/revision/Undo, source bytes/epoch/screen, editor/recovery/overlay0. rAF 뒤 write lock 안에서 동일 isCurrent와 target raw 재검사 | source/key/owner가 lock 전에 바뀌면0쓰기 기대. 실제 fixture 경합은 root가 검사. PRO03 post-commit 상태 안내 보완 필요 |
| 5432·5454 header/mobile | active Plan success owner이면 동일 undoPlanDisplay로 alias, source writer나 standalone C를 호출하지 않음 | 결과를 닫거나 stale로 폐기한 뒤 남는 일반 persisted Undo는 별도 기존 기능. 이를 Plan 결과 권한이 보존된 것으로 설명하지 않음 |

`quickConversionOpen`은 현재 moveTarget 안에서 열려 기존 overlay 차단을 받는다. 이를 별도 overlay 의도로 명시하는 root 안에 동의하지만, 현재 이 한 분기만으로 실제 동시 owner 결함이 재현됐다고 기록하지 않는다.

## 검사와 권한의 구분

[순수20](./k3b-react-plan-display-qa.md)과 [SSR8](./k3b-react-plan-result-ssr-qa.md)은 full counts/페이지/렌더 자료의 정합성을 검사한다. 저장 성공의 actual evidence·현재 권한이나 실제 화면 focus를 증명하지 않는다. summary·display DTO·page slice를 current source/실제 target의 대체물로 사용하지 않는 것이 핵심이다.

이 검토로 제품 source를 수정한 것은 없다. 이후 승인된 no-op 분류 함수는 별도 소유 작업/QA로 분리했다. 실제 브라우저·실기기·보조기술·운영 API 검사를 이 문서에서 새 실행하지 않았으며 관찰 사용자0, commit/push/PR/Preview/Production 없음.
