# S10 기존 제작 저장본: 남은 경로와 독립 QA 자료

2026-09-14 증거 기준. 승인된 독립 A/B profile을 만들고 각각 기존 자료를 한 번 이관했다. A는 fHX에서 저장 이력 읽기·전체 native 판본 복구·Undo·reload를 완료해 revision 5다. B는 개인 연결 검사82확인 뒤 발견한 한 줄 참조의 원본 열기 누락을 수정하고, 새 `Z4OpT7dWj3VCM_mo31U2r`에서 후속119확인으로 두 참조·원래 항목·제작 원문·Back/reload를 마쳤다. B의 revision10·전체 저장값은 그대로다. 두 자료를 합친 한 계정의 검증이나 기존 제작기 전체 동등성으로 확대하지 않는다.

## 요구와 범위

[정본의 P06](spec.md), [최종 S10](final-whole-loop-plan.md)의 기존 제작 저장본 진입·기록 보호는 S07의 현재 Program working/선택 공개만으로 대체하지 않는다. [기존 CreatorDraft 보관함 계약](../2026-09-03-flowme-integrated-poc-creator-draft-library-v1/spec.md)의 PoC 원문 보관함과 원래 개발2 전체 문서 이력을 구별한다.

| 자료 경로 | 실제 저장 계약 | 증명하지 않는 것 |
| --- | --- | --- |
| PoC 기존 보관함 | `flow:poc:personal-workspace:v1:creator-drafts`: raw/title·현재 recordRevision·단일 Undo | native 문서 구조, 여러 판본 이력, 과거 working 임시복구 |
| 원래 개발2 저장본 | `flow:text-authoring:drafts:v1`: schemaVersion 1, drafts와 recoveries, 실제 저장본 document/versionId/revisionId | Program 현재 working과 동일 계정이라는 주장, recovery 자동 병합 |
| 현재 S07 | Program key의 creatorWorkspace working/library/savedHistory | 기존 저장 key를 읽고 가져온 출처·이력의 현재 UI 검증 |

과거 text-input-diagnostic (로컬 전용 근거: `../../../output/playwright/integrated-program/text-input-diagnostic-2026-09-12T11-36-51-484Z.json`)은 `browser-owned-creator` rev2·실제로 남은 rev1 원문과 개인 문서 `doc-9c554b6f-6aad-4daa-8ba5-4c4a57c90aa5`를 보존한다. 현재 ProgramData validator는 통과한다. 그러나 완전한 Program envelope/global Undo가 없으므로 이 자료에서 Undo를 만들어 넣거나 raw를 nativeDocument로 승격하지 않는다. 당시 검사 요약 (로컬 전용 근거: `../../../output/playwright/integrated-program-history/browser-check-summary.json`)은 옛 빌드 범위이며 현재 실행 결과가 아니다.

## 별개로 보존한 A와 B

준비 builder (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-final-s10-legacy-creator-fixture.ts`)는 고정된 원본 artifact SHA를 먼저 확인한다. exact source 문자열과 exact Program wire를 그대로 사용한다. 현재 `readNativeCreatorHistory`, 각 판본의 `readNativeCreatorSavedDocument`, `loadProgramStore(storage, validateProgramEnvelope)`를 거치며 reader가 ready라는 사실만으로 full native PASS를 만들지 않는다. 기존 Undo 전체와 원본 실패를 보존한다. 두 계정의 문서·판본·기록을 합치지 않는다.

| | A: 저장 이력 | B: native 개인 연결 |
| --- | --- | --- |
| 원본 | history-full T6e (로컬 전용 근거: `../../../output/playwright/integrated-program-fullnative-next/history-full-t6e-2026-09-12T19-25-58-332Z.json`) | source-private-full fixture (로컬 전용 근거: `../../../output/playwright/integrated-program-source-private-full/fixture-2026-09-12T23-33-57-558Z.json`) |
| 새 불변 fixture | a-history 13:59 (로컬 전용 근거: `../../../output/integrated-product-poc/final-s10-legacy-creator-a-history-2026-09-14T13-59-01-485Z.json`) | b-private 13:59 (로컬 전용 근거: `../../../output/integrated-product-poc/final-s10-legacy-creator-b-private-2026-09-14T13-59-01-485Z.json`) |
| 이관 전 full store 검증 | revision 3, Undo 1 | revision 10, Undo 10 |
| exact 개발2 자료 | `history-qa-original-draft`, 저장본 3개, 전체 native codec 모두 통과 | `original-source-private-full`, 저장본 1개, 전체 native codec 통과 |
| 이관 전 Program working | `creator-08d4d848-ee7d-42cc-9cbf-63d4c6184e84`, 첫 import의 raw working; native 없음 | `qa-source-private-full`, 실제 native owner와 selection |
| 개인 연결 | handoffs 없음, 진행 0. 개인 보호 PASS로 세지 않음 | `doc-eb485173-7519-48fe-9851-d1452a2960c9`; 9/11 20%, 9/12 35%; 정확 같은 task 참조 문서 2개 |
| 원본 이력의 한계 | 당시 full 복구/quota/reload 5확인 후 `Error: undo data` 실패. 실패를 삭제하거나 완료로 변경하지 않음 | 원래 D2 parser/repository와 Program controller가 메모리에서 생성한 QA fixture. 실사용자 자료가 아니며 생성 자료 자체는 브라우저 수행 증거가 아님 |

최종 fixture SHA256:

- A: `ef494c138a38176916c37e39c34c4b8ac1afe3f83811efbb2e74d0eea53e56b3`
- B: `1cbca1608358fbefe6fc6ef69ef9e7ea51e3c9956118aed47efa319b22c43e27`

원본 개발2 key SHA256:

- A: `d161418f25b9b44e0df4c0e074d582cb8f688b75743031efe77691de1a844bce`
- B: `55681cf0737ef150384d7c01f20874e84fedc88d6de7293523cb4ca7ba4a91f0`

원본 artifact·각 source tuple/document·Program wire·431개 runtime source·builder hash는 fixture에 기록했다. 최초 13:58 준비 출력도 삭제하지 않았다. 최종 13:59 출력은 Undo negative case를 실제 `workspace` 손상으로 좁힌 결과다.

## 적용한 독립 profile·쓰기 경계

본체가 두 고유 절대 profile 경로의 부재·빈 저장소와 fixture hash를 확인한 뒤 `program-s10-d2-history-20260914`와 `program-s10-d2-private-20260914`를 각각 승인했다. 두 profile 모두 actor는 `local-user`다. A와 B를 합치거나 기존 네 origin transfer·ordinary·Map profile을 덮어쓰지 않았다.

A에서 회수 가능한 보호 key는 exact D2 key 1개다. 옛 결과가 outside key 2개 보존이라고 보고했지만 다른 sentinel의 문자열은 이 artifact에 없으므로 복구했다고 주장하지 않는다. B는 원본 fixture의 D2 key와 QA sentinel 2개를 정확히 보존한다. 추가 sentinel이 필요하면 새 QA setup임을 명시하고 별도 승인받는다. 기본 Program wire까지 포함하면 A의 exact seed key는 2개, B는 3개다.

제품 boot 전에 local/session Storage의 setItem/removeItem/clear 감시를 설치했다. A의 QA seed 2키와 B의 QA seed 3키는 빈 새 profile을 준비한 호출이며 제품 저장 횟수에 합산하지 않는다. 이후 A의 보호 key 1개와 B의 보호 key 2개를 각각 대조한다. 아래 브라우저 결과는 `fHXfhOF3IXaatFy4hcLAj`와 `static/chunks/app/my/page-262f7de3ce9240f3.js`를 실제 문서·resource에서 확인한 범위다. 이후 빌드의 성공으로 옮겨 적지 않는다.

## 날짜별 실행 증거와 실패 보존

모든 시각은 2026-09-14 UTC이며 각 JSON은 불변 기록이다.

| 구간 | A | B | 판정과 경계 |
| --- | --- | --- | --- |
| 첫 seed 검사 | 14:18 A 실패 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-history-seed-2026-09-14T14-18-21-480Z.json`) | 14:18 B 실패 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-private-seed-2026-09-14T14-18-21-497Z.json`) | 각각 HTTP/build/chunk 3확인 뒤 favicon 경로 가정 오류. 실제 `/icon.svg` redirect였으며 seed 0, local/session 빈 상태를 유지했다. 실패 기록을 삭제하지 않았다. |
| 한 번의 승인된 seed·boot | 14:21 A 14확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-history-seed-fixed-2026-09-14T14-21-02-776Z.json`) | 14:21 B 14확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-private-seed-fixed-2026-09-14T14-21-02-792Z.json`) | 아직 빈 같은 신규 profile에서 경로 검사를 바로잡고 A2/B3 QA key를 한 번 채웠다. 제품 boot 쓰기 0, 모든 저장 bytes 동일. |
| 원래 D2 이력 읽기 | 14:24 A 96확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-history-history-readonly-2026-09-14T14-24-13-991Z.json`) | 14:24 B 68확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-private-history-readonly-2026-09-14T14-24-13-990Z.json`) | 실제 library UI에서 현재 원문·모든 실제 version/revision·전체 document JSON을 대조하고 닫기·동일 working·reload 완료. 전체 Storage 호출 0. A3/B1 저장본 수를 구별한다. |
| A 전체 판본 복구 | 14:37 첫 33확인 후 실패 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-history-restore-2026-09-14T14-37-30-661Z.json`) | 해당 없음 | 실제 v2의 전체 구조 비교·닫기 0쓰기, quota 실패 1회·저장 변화 0, 같은 요청/wire 재시도 성공 1회. revision 4까지 저장했으나 QA 코드가 압축 Undo를 actor 배열로 직접 읽어 멈췄다. |
| A 보존 상태 재개 | 14:42 tail 31확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-history-restore-tail-2026-09-14T14-42-10-309Z.json`) | 해당 없음 | revision 4의 실제 저장 상태를 재검증하고 reload → UI Undo 1회 → revision 5 → reload 완료. 재복구·reseed하지 않았다. |
| B 개인·참조 읽기 | 해당 없음 | 14:38 partial 82확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-private-readonly-2026-09-14T14-38-00-285Z.json`) | 원문과 개인 문서의 날짜/메모 구별, 20/35% 과거 기록 표시, 첫 참조 문서까지 확인. 그 active 한 줄에서 `연결된 할 일 열기`가 없어 중단. global Storage 호출 0, 보호2키·Program bytes 동일, revision 10 유지. 전체 경로 완료가 아니다. |

A의 최종 wire SHA256은 `9422b2502d848a6ac97d8f47ff9729a93ac99666d554a056feead38378693426`이다. 현재 codec/full validator의 별도 파일 읽기에서 revision 5, Undo 1, 모든 actor workspace와 원래 Undo 동일, receipt 5 유지, source bytes 동일을 확인했다. 복구 중에는 실제 `draft-version-history-qa-2`/`revision-0mjohnw`의 전체 native 문서와 `included:false`를 확인했다. 저장 호출 합계는 실패한 quota 시도 1회와 성공한 복구·Undo 각 1회이며 선행 monitor row를 tail 성공 수에 중복 합산하지 않았다.

원래 T6e의 `undo data` 실패도 남긴다. 당시 before/undo의 spaces/public/actors는 같았고 receipt가 3→5로 남아 전체 data 비교가 실패했다. 현재 `planProgramUndo`는 actor workspace를 복원하되 receipt를 유지한다. 이번 14:37 오류는 그와 별개의 QA 압축 Undo 해석 오류다. 두 오류를 제품 데이터 손실이나 모두 성공한 최초 실행으로 바꿔 표현하지 않는다.

A의 복구 화면 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-history-tail-1789396932105-restored.png`)과 Undo/reload 화면 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-history-tail-1789396932665-undone-reloaded.png`)을 직접 확인했다. 복구 화면은 스크롤된 native 영역의 `이전 준비 · 할 일 · 제외`, 최종 화면은 원래 제작 편집기 복귀를 보여 준다. 1280×720 부분 viewport 2장으로 전체 원문 가시성·여러 해상도·실기기를 검증했다고 하지 않는다. A에는 개인 실행 기록이 0건이므로 이 결과가 B의 비어 있지 않은 개인 기록 보호를 대신하지 않는다.

## 한 줄 참조의 실제 누락과 수정판 검증

기존 editor는 커서가 없는 행에만 참조 열기 버튼을 표시했다. 한 줄짜리 문서는 커서행 외의 행이 없어서 원래 항목을 열 수 없었다. 실제 결함을 QA selector 오류로 처리하거나 빈 줄을 추가해 우회하지 않았다.

[ProgramTextEditor](../../../components/flow/integrated-poc/ProgramTextEditor.tsx)의 행 메뉴에 `연결된 항목 보기`를 연결했다. 정상 참조의 exact task·원래 문서를 확인하고 기존 reference 패널을 연다. 원본 vendor, 저장소, schema는 바꾸지 않았다. 일반 행·잘못된 identity·잠금·읽기 전용·조합 중 입력을 구별하고, 기존 보관된 원본의 읽기 경로와 저장 실패 시 입력 보호를 유지한다. 해당 파일18개 검사 중 신규3개가 이 회귀이며 실제 키보드 조작 검증과 구별한다.

수정판 후속119확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-private-tail-2026-09-14T14-48-41-653Z.json`)은 실패 상태의 첫 참조에서 새 build로 실제 reload한 뒤 이어갔다. 첫 참조는 포인터, 두 번째 참조는 Enter로 행 메뉴와 패널을 열었다. Escape는 저장 없이 편집기 포커스/원래 선택을 복원했다. 두 경로 모두 canonical 개인 문서의 정확한 첫 행으로 이동하고 실제 Back으로 같은 참조에 돌아왔다. 원래 handoff 원문을 읽고 `제작 계속하기`로 동일 native working을 연 뒤 Back과 reload까지 마쳤다.

모든 local/session key/value bytes 동일, 전체 Storage 호출0, 보호2키 동일, 새 page/console 오류0이다. 최종 revision10 wire SHA는 `df5287addbb67c01262903458a3307ce01fa1f9f4a3ace59ce9b8c1cb5367129`다. 개인 날짜2026-10-02·메모·20/35% 기록·두 참조와 원본 날짜2026-09-20·전체 native 문서/이력은 함께 보존됐다.

참조1 패널 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-private-tail-2026-09-14T14-48-43-107Z-reference-1-panel.png`), 참조2 패널 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-private-tail-2026-09-14T14-48-43-107Z-reference-2-panel.png`), 제작 원문 복귀 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-private-tail-2026-09-14T14-48-43-107Z-native-return.png`), 최종 개인 문서 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-private-tail-2026-09-14T14-48-43-107Z-final-private.png`)를 직접 확인했다. 1280×720 네 캡처이며 긴 native 원문 전체의 일치는 DOM와 저장값으로 대조했다. 다중 해상도와 실제 기기 확인을 이 네 장으로 대신하지 않는다.

### B 참조 메뉴 반응형 후속 확인

별도 반응형 결과 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-reference-responsive-2026-09-14T14-56-24-607Z.json`)는 같은 `Z4OpT7dWj3VCM_mo31U2r`에서 218확인을 통과했다. 375×812, 390×844, 844×390, 1024×768, 1440×900의 한 줄 참조 행 메뉴 → 연결된 항목 보기 → 원래 문서 버튼을 확인했다. 버튼은 모두 44px 이상이며 명시적인 내부 스크롤 뒤 전체 노출·중앙 hit·가로 넘침 없음이 확인됐다. 원래 문서 버튼을 새로 클릭하지 않았으므로 정확한 원본 이동·Back/reload의 근거는 앞선119결과다.

844×390에서는 메뉴의 연결된 항목 보기 버튼이 처음에는 중앙 hit를 통과하지 못했다. 패널 scrollTop `0→25` 뒤 접근 가능했고, 원래 문서 버튼은 `25→43` 스크롤 뒤 44px 전체가 노출됐다. **초기 가림이 없었다는 판정이 아니라 내부 세로 스크롤로 접근 가능하다는 판정**이다. 나머지 네 크기의 검사 대상 버튼은 패널 scrollTop 변경 없이 접근했다. Escape/닫기 후 편집기 초점 복귀를 확인했고, 마지막에는 1280×720의 원래 개인 문서로 돌아왔다.

최종 B revision `10`, raw SHA `df5287addbb67c01262903458a3307ce01fa1f9f4a3ace59ce9b8c1cb5367129`를 유지했다. 전체 local/session 저장 바이트와 보호2키는 동일하며, global writer `0`, dirty `0`, page/console 오류 `0`이다. 원래 제작 원문·이력과 개인 날짜·20/35% 기록·메모·두 참조도 전체 바이트 비교 범위에 포함된다. 최초82확인의 실패와119후속·seed·A 이력은 별도 증거로 그대로 보존한다.

검사 담당 에이전트가 다음10캡처를 모두 실제 열람했다. 실제 기기 검증으로 확대하지 않는다.

| 크기 | 행 메뉴 | 참조 패널 |
| --- | --- | --- |
| 375×812 | 메뉴 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-reference-responsive-2026-09-14T14-56-25-763Z-375-menu.png`) | 패널 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-reference-responsive-2026-09-14T14-56-25-763Z-375-panel.png`) |
| 390×844 | 메뉴 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-reference-responsive-2026-09-14T14-56-25-763Z-390-menu.png`) | 패널 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-reference-responsive-2026-09-14T14-56-25-763Z-390-panel.png`) |
| 844×390 | 메뉴 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-reference-responsive-2026-09-14T14-56-25-763Z-844-menu.png`) | 패널 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-reference-responsive-2026-09-14T14-56-25-763Z-844-panel.png`) |
| 1024×768 | 메뉴 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-reference-responsive-2026-09-14T14-56-25-763Z-1024-menu.png`) | 패널 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-reference-responsive-2026-09-14T14-56-25-763Z-1024-panel.png`) |
| 1440×900 | 메뉴 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-reference-responsive-2026-09-14T14-56-25-763Z-1440-menu.png`) | 패널 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-reference-responsive-2026-09-14T14-56-25-763Z-1440-panel.png`) |

## 범위 밖으로 남는 원래 제작 상태

`PoC 설정 → 기존 제작 초안 가져오기 → 개발2 제작기의 저장 이력 → 개발2 저장 이력 읽기`와 A의 명시 전체 판본 복구/Undo는 위 범위에서 완료했다. A는 이미 import된 이력을 사용했으므로 이번 실행으로 최초 import를 새로 검증한 것은 아니다.

B의 기존 개인 연결 경로는 위 후속 검사에서 완료했다. 첫 실패82확인은 삭제하거나 최초 실행 전체 성공으로 바꾸지 않는다. 최초 native 인계·원본 변경 수용을 이번의 읽기 왕복으로 새로 증명한 것은 아니다.

현재 [UI reader](../../../components/flow/integrated-poc/ProgramCreatorDraftLibrary.tsx)는 임시복구본과 구조 템플릿 sidecar를 가져오지 않는다고 표시한다. [history import](../../../lib/flow/integrated-poc/creator-history.ts)는 현재 원문과 실제 이력을 가져오고, full native context는 실제 판본의 명시 복구에서 검증한다. 이 제한을 기존 제작기 전체 working 동등성 완료로 확대하지 않는다. 남은 working/recovery 요구는 정본과 별도 대조가 필요하며 이번 QA를 위해 새 복구 정책을 만들지 않는다.

[제작 working·임시복구·sidecar 요구 대조](creator-recovery-fidelity-review.md)에 원래 기능과 현재 구현·검증의 차이, 옛 복구본의 명시 읽기·선택·인계 잔여를 기록한다.

## 검증 상태

`npx.cmd tsx scripts/personal-workspace-poc/program-final-s10-legacy-creator-fixture.ts`의 준비 검증은 그대로 보존한다. A/B 모두 exact full envelope, source tuple, full native codec, Undo를 확인했고 B의 개인 기록·참조도 확인했다. 각 자료에서 분리 clone의 source revision 불일치·invalid native document·손상된 Undo workspace를 거절했다. 이 준비 명령의 메모리 저장 writer 시도와 브라우저 호출은 0이며, 이후 승인된 실제 브라우저 동작 수는 위 원장과 구분한다.

현 판정은 A의 저장 이력/전체 판본 복구 경로와 B의 기존 개인 연결 읽기 경로 완료다. native working·임시복구·sidecar를 포함한 기존 제작기 전체 동등성이나 S10 전체 완료로 확대하지 않는다. 다음 갱신은 남은 working/recovery 요구 대조 또는 최종 실행판 전체 연결의 새로운 증거가 생길 때 한다.
