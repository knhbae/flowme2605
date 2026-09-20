# 전체 흐름 2 — 두 탭 입력 보호

2026-09-20, **최종 판정 통과: 정상 두 탭 입력 보호·modal 내부 복구·owner 왕복**. 최초 ordinary revision456 검사에서는 복구 UI 결함을 발견했고 아래 기록을 보존했다. 수정 제품의 최종 빌드에서 28개 확인을 통과했다. 초기화·seed·원본 key 쓰기는 없다. 실제 commit CAS 경쟁을 강제한 검사와는 구별한다.

## 통과한 경계

- 탭 A: F-week 개인 사본 `copy-a8ce8780-c504-45c6-b746-fe2a878d3ff5`에서 공개 v2 `version-0230358b-788f-4e70-b2c2-5e4ce18ed57b`의 정확한 항목 `publication-series-704d0c12-a2d3-45e5-82b4-9840d76bd15a`에 설명 제안을 입력했다. 실제 제출 목적이 없는 취소 예정 QA 입력이다.
- 탭 B: 정상 UI로 새 빈 개인 문서 `doc-072293ca-548e-46b5-b6b8-29ae1caad1bb` 하나를 만들었다. ProgramData 차이는 이 문서와 `private-document-create` receipt 한 개뿐이다. 기존 문서·공개 원문·실행 기록은 그대로다.
- 탭 A: 정상 storage event로 다른 탭 저장을 감지했다. 제안 본문·이유·선택 항목·선택 필드가 유지됐다. 오래된 제출은 conflict 안내와 함께 거절됐고 A의 setItem 시도는 0건이었다. B의 저장 문자열도 그대로였다.

이 경로는 `ProgramApp.mutate`의 `deferredSnapshot` guard가 controller 호출 전에 막은 것이다. 실제 commit CAS race를 강제로 유발한 검사가 아니다. 하위 `commitProgramEnvelope`의 CAS 계약은 revision 숫자만 비교하는 것이 아니라 `expectedRaw` 전체 문자열 비교다. event 차단이나 저장값 주입은 하지 않았다.

## 실패한 복구 행동

`입력 버리고 최신 상태 보기` 버튼은 앱의 복구 패널에 있지만, 개인 Flow 설정이 modal dialog로 열린 동안 패널은 backdrop 뒤에 있다. 일반 click이 dialog에 가로막혀 20초 후 중단됐다. force click이나 DOM 변경으로 우회하지 않았다. 실패 화면 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-d-two-tab-recovery-blocked.png`)을 직접 열어 같은 가림을 확인했다.

제품 문제는 **미제출 입력을 보존한 채 외부 변경 복구 패널에 접근할 수 없는 배치**다. 활성 dialog 안에도 같은 복구 동작을 제공하는 방안을 담당자에게 전달했다. 제안 입력을 명시 취소하고 dialog를 닫는 대안은 아직 실행하지 않았다. 복구 취소/확정·owner 변경·Back·재진입 단계는 미실행이다.

## 불변 기록과 체크포인트

기록: `output/playwright/integrated-program/whole-two-d-two-tab-2026-09-20T05-57-14-263Z.json`. 18개 확인 후 위 click 실패. 첫 실행을 다시 돌리지 않았고 A의 미제출 입력과 B 탭을 그대로 유지했다. 실패 runner가 종료 전에 runtimeAssets를 수집하지 못해 최상위 runtimeMatchesBuild는 false지만, **두 탭 모두 mutation 전 document build와 실제 route asset을 별도로 대조한 states 증거가 있다**. 이를 최종 runtime 검증 완료로 바꾸어 적지 않는다.

- 시작 revision 456, SHA `90f0e4586cebeff59d619ca8f1528a8044482ab6bddd93b23a1e0813df8318b2`.
- 현재 revision 457, SHA `87bd4d1f68ddc0d32854f01bb59faca893e8706a6aa4d1913c7042780825f3a2`.
- A generation `1789883503357`, `__september20Resume` offset 0. 동일 문서 hash 이동이어서 새 generation이 아니었다.
- B generation `1789883836302.8`, `__wholeTwoDCas` 저장 호출 1건, Program key setItem만 성공.
- build `I0QgDqDV0FBDjrnqn_lci`, route `static/chunks/app/my/page-36dca8f5a25cbfe1.js`, origin `http://127.0.0.1:3641`.

제품 source/tests 변경 없음. 실제 기기 검사 미실행, 관찰 사용자 0명, commit·push·PR·배포 없음. 이 보고서는 실패 후 후속 실행이 끝나면 별도 근거를 추가하며 원래 실패를 지우지 않는다.

## 승인된 안전 종료 후속

`whole-two-d-two-tab-safe-exit-2026-09-20T06-02-00-773Z.json`: 미제출 QA 제안을 명시 취소하고 modal을 닫은 뒤 바깥 복구 패널의 입력 유지/최신 내용 불러오기를 실행했다. 5개 확인 통과, runtime I0 일치. Program wire는 rev457/hash `87bd4d1f68ddc0d32854f01bb59faca893e8706a6aa4d1913c7042780825f3a2` 그대로이며 이 과정의 저장 호출은 0건이다. 탭 B는 상태 확인 후 닫았다.

이 대안은 **modal 안의 복구 UI 결함을 해결한 것으로 세지 않는다**. 해당 결함의 소스 수정은 별도 담당자가 진행했고 새 production build에서 정상 두 탭 UI와 내부 복구 취소/확정을 다시 검사할 예정이다. owner 변경·Back·재진입은 해당 후속에서 완료해야 한다.

## 수정 제품의 최종 검사

`whole-two-d-two-tab-fixed-2026-09-20T07-05-59-110Z.json`: 28개 확인 통과. build `ylSngUBlsuD5I1e8zd_09`와 실제 route chunk를 양쪽 탭의 mutation 전에 대조했으며 최종 runtime도 일치한다.

1. 누적 ordinary rev488의 기존 F-week 사본에서 같은 v2 항목의 취소 예정 설명 제안을 입력했다. 제안은 제출·반영되지 않았다.
2. 같은 context의 탭 B에서 새 빈 QA 문서 `doc-aaca648d-63d0-4147-9036-e370e3a10c46`를 정상 UI로 만들었다. rev489의 데이터 차이는 이 문서와 `private-document-create` receipt 한 개뿐이다. 탭 B의 허용 key setItem 1건을 확인했다.
3. A의 본문·이유·항목·필드 선택을 보존하고, 오래된 제출은 저장 전에 거절했다. B의 문자열은 그대로였다.
4. 복구 패널이 열린 modal **안에 있음**을 확인했다. force click 없이 `입력 버리고 최신 상태 보기 → 입력 유지`와 다시 `버리고 불러오기`를 실행했다. 취소는 입력을 보존했고 확정은 B의 저장값을 유지한 채 미제출 입력만 버렸다. 복구에 의한 저장 호출은 0건이다.
5. 기존 다른 local actor로 바꾸고 Back한 뒤 원래 actor로 돌아와 같은 사본·항목을 다시 열었다. 버린 제안이 나타나지 않았으며 다른 owner에 원문/제안이 기록되지 않았다. inspector와 B 탭을 닫아 미제출 입력 없이 인계했다.

최종 rev491, SHA `92867ecb9e7204bf0b12e11e589bf497854dab8c77855f59d716cfa8a22a045d`, generation `1789887807183.4`, A observer offset2. A의 두 저장은 actor 선택/복귀이며 B의 새 문서 저장 1건과 구분한다. 최종 ProgramData는 B 저장 직후와 정확히 같고 운영 localStorage·sessionStorage는 시작과 동일하다. 기존 saved library·공개 콘텐츠·사본·개인 실행 기록은 바뀌지 않았다.

성공 저장은 **총 3건(A의 actor 변경 2건 + B의 새 문서 1건)**이다. `whole-two-b-d-preservation-2026-09-20T07-11-28-351Z.json`의 파일 기반 교차검사 20/20에서 이 수와 허용 key만 사용했음을 다시 대조했다. Undo는 실제 codec으로 펼쳐 확인했다. local-user의 기존 80개 중 79개가 정확히 유지되고, 상한80 정책에 따라 가장 오래된 1개가 빠지며 새 문서 만들기 Undo 1개가 추가됐다. 그 새 Undo의 workspace는 문서 생성 전과 정확히 같다. actor 변경은 Undo를 추가하지 않았고 다른 두 actor의 Undo도 그대로다. 따라서 CAS에 대해 전체 Undo가 byte-for-byte 같다고 주장하지 않는다.

최초 실패와 최종 성공을 합쳐 성공 한 번으로 덮어쓰지 않는다. 정상 storage event와 stale-input guard를 검사했으며 `commitProgramEnvelope` 내부에서 강제로 경쟁을 만든 CAS race는 실행하지 않았다. 실제 기기 검사 미실행, 관찰 사용자 0명, commit·push·PR·Preview·Production 배포 없음.
