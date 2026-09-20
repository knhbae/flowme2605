# Native 제작 미반영 입력 복구: 실제 UI 검증

2026-09-20. [요구 대조의 1단계](creator-recovery-fidelity-review.md)를 기존 개발2 B 자료에서 확인했다. 원문 입력 보관 → 결과 확인 → 개인 문서 → 같은 제작 작업 → 새로고침 → 비교 취소 → 명시 반영 → 새로고침 → Undo → 새로고침까지 연결된다. raw-only 초안으로 대체하지 않았다. 제품 코드는 바꾸지 않았다.

## 무엇이 충족됐나

| 요구 | 이번 증거와 판정 |
| --- | --- |
| 입력 보관과 명시 저장본 구분 | 실제 native owner와 다른 QA 문장 한 줄을 키보드로 추가했다. 자동보관 1회로 `nativePendingRawText`만 추가됐고 canonical raw·명시 저장본·전체 native owner는 유지됐다. |
| 결과·개인 실행과 혼동하지 않음 | 결과에 미반영 안내와 이전 구조가 표시됐다. 개인 날짜 10/2, 메모, 20/35% 기록, 두 참조를 포함한 개인 text 전체는 그대로다. 같은 제작 작업으로 돌아오면 pending 원문이 남는다. |
| 새로고침 복구 | 실제 문서 generation이 바뀌는 reload 뒤 입력을 그대로 복구했다. 새로고침 자체는 저장하지 않았다. |
| 비교 취소 | 적용 전 비교를 열고 닫아도 저장값·입력·owner가 그대로다. |
| 명시 구조 반영 | 비교한 구조 적용 1회로 owner revision 1→2, action 1개가 생겼다. pending은 canonical raw에 반영됐고 명시 저장본·개인 실행·공개 판본은 자동 변경되지 않았다. |
| Undo | global Undo 1회로 반영 직전의 전체 개인 workspace, canonical owner와 pending 입력을 복원했다. reload 뒤에도 동일하다. |

현재 fixture의 `reviewGates`는 빈 배열이다. 빈 배열 보존을 안전·권리 근거가 있는 실제 UI 검증으로 확대하지 않는다. 해당 검토 조건·quota·stale 보호는 이번에 별도로 실행한 부모/모델 회귀 검사 근거다. 이번 UI에서는 quota 오류를 주입하지 않았다.

## 실행 원장과 실패 보존

| 실제 실행 | 결과 | 저장 |
| --- | --- | --- |
| 기존 프로필 재개 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-native-pending-resume-2026-09-20T04-59-00-358Z.json`) | 8확인 통과 | 0 |
| 원문 한 줄 보관 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-native-pending-phase-one-2026-09-20T05-00-09-224Z.json`) | 61확인 뒤 QA 직접 JSON 비교 실패 | 1, rev10→11 |
| 결과·개인 Back·재진입 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-native-pending-tail-2026-09-20T05-02-03-663Z.json`) | 10확인 뒤 QA 원문 탭 대기 timeout | 0 |
| 원문 탭·reload·비교 취소 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-native-pending-reload-2026-09-20T05-03-33-120Z.json`) | 15확인 통과 | 0 |
| 명시 sync·reload·Undo·reload (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-native-pending-sync-2026-09-20T05-04-49-132Z.json`) | 26확인 통과 | 2, rev11→12→13 |
| 390/1280 화면 확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-native-pending-capture-2026-09-20T05-06-53-791Z.json`) | 7확인 통과 | 0 |

첫 실패는 비압축 옛 Undo가 첫 성공 저장에서 DAG로 직렬화된 것을 원시 JSON 동일성으로 검사한 QA 오류다. 실제 production decoder 교차검사 5개 (로컬 전용 근거: `../../../output/integrated-product-poc/s10-d2-native-pending-crosscheck-2026-09-20T05-01-09-486Z.json`)에서 decoded envelope 전체가 pending+revision만 변경됐고 모든 actor Undo가 동일함을 확인했다. 소비한 입력 runner를 재실행하지 않았다.

두 번째 실패는 재진입이 마지막 결과 탭을 보존했는데 QA가 원문 탭을 자동으로 예상한 오류다. 실제 상태에서 원문 탭을 명시 선택하고 이어갔다. 최초 실패 JSON과 캡처를 삭제하거나 성공으로 고치지 않았다.

명시 sync/Undo 교차검사 8개 (로컬 전용 근거: `../../../output/integrated-product-poc/s10-d2-native-pending-sync-crosscheck-2026-09-20T05-06-23-454Z.json`)는 실제 `applyProgramNativeCreatorOperation`, `makeProgramEnvelope`, `planProgramUndo`로 detached 재실행한 전체 결과가 저장 증거와 같음을 확인했다. 메모리 계산이며 브라우저 실행 수에 합산하지 않는다.

별도 자동 회귀: `node node_modules/tsx/dist/cli.mjs --test components/flow/integrated-poc/ProgramCreatorWorkspace.native.test.tsx lib/flow/integrated-poc/creator-native-workspace.test.ts` — **28개 실행, 28통과, 실패·skip 0**. NCP02/CNW02 검토 요구 보존, NCP03/CNW04 quota·재시도 보호를 포함한다. 전체 `npm test`·build를 새로 실행한 결과가 아니며 기존 전체 검사와 구별한다.

## 화면 평가

담당 에이전트가 아래 4개 파일을 실제 열람했다. 390×844와 1280×720에서 비교 진입 문구와 동작이 보이고, 문서 가로 넘침과 새 console/page error는 0이었다. 비교 영역 캡처는 전체 영역 캡처이므로 한 화면에 모두 들어온다는 뜻이 아니다.

| 화면 | 캡처 |
| --- | --- |
| 390: 미반영 입력·비교 진입 | 화면 (로컬 전용 근거: `../../../output/playwright/integrated-program/native-pending-focus-2026-09-20T05-06-54-091Z-390-pending.png`) |
| 390: 적용 전 비교 | 긴 비교 영역 (로컬 전용 근거: `../../../output/playwright/integrated-program/native-pending-focus-2026-09-20T05-06-54-091Z-390-comparison.png`) |
| 1280: 미반영 입력·비교 진입 | 화면 (로컬 전용 근거: `../../../output/playwright/integrated-program/native-pending-focus-2026-09-20T05-06-54-091Z-1280-pending.png`) |
| 1280: 적용 전 비교 | 비교 영역 (로컬 전용 근거: `../../../output/playwright/integrated-program/native-pending-focus-2026-09-20T05-06-54-091Z-1280-comparison.png`) |

남은 UX 개선점: 한 문장 추가에도 재해석된 두 항목의 동일한 표시 내용이 비교에 반복되어 특히 모바일 비교가 길다. 이번 기능 복구 검증과 별개로 실제 변경점 중심 비교를 개선할 근거다. 375×812·844×390·1024×768의 이 경로는 이번에 검사하지 않았다. 실제 Android/iOS·IME·관찰 사용자 검증은 미실행, 관찰 사용자 0명이다.

## 저장 경계와 인계

- 프로필: `output/playwright/profiles/program-s10-d2-private-20260914`, CLI `program-s10-d2-private-20260914`. 이전 준비된 정확한 프로필을 재개했으며 seed/reset/import는 0이다.
- 제품 진입 전 같은 origin JS를 plain text로 열어 Program/D2/sentinel 3키 SHA를 확인했다. 사라진 이전 observer를 이어붙이지 않고 새 `__nativePendingSept20` 측정을 시작했다. 브라우저가 닫혀 있던 구간의 연속 감시를 주장하지 않는다.
- 관측된 성공 쓰기는 총 3건, 모두 `flow:poc:personal-workspace:v1:program:state`다. 운영 D2 key와 sentinel은 byte-for-byte 동일하고 sessionStorage는 비어 있다. prefix 밖 setItem/removeItem/clear는 0이다.
- frozen build `pIfd2DvMfHy2BICAkWF9L`, route chunk `static/chunks/app/my/page-262f7de3ce9240f3.js`에서 실행했다.
- 최종 revision **13**, SHA256 `5e7f4148ba9a5d5bc528094af76697461265076f6b610377bd1f5bd0da1b7e0c`, generation `1789880691602.9`, observer offset `0`. working `qa-source-private-full`의 pending QA 입력을 Undo 상태 그대로 보존했다. 다음 작업에서 자동 제거하지 않는다.
- 최종 full store/working/native owner/selection 검증 (로컬 전용 근거: `../../../output/integrated-product-poc/s10-d2-native-pending-decode-2026-09-20T05-05-08-572Z.json`)은 모두 ready/valid다.

이 결과는 현재 Program native 미반영 입력 복구의 완료 증거다. 옛 D2 임시복구본의 명시 읽기·선택·인계, 전체 기존 제작기 동등성, S10 전체, 통합 목표 완료를 선언하지 않는다. commit·push·PR·Preview·Production은 모두 하지 않았다.
