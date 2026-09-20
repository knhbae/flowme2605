# 통합 PoC 시나리오 근거 원장 — 2026-09-20

이 원장은 [최종 전체 흐름 계획](final-whole-loop-plan.md)의 S01–S10과 [두 번째 전체 흐름 계획](whole-loop-two-plan.md)의 A–D를 실제 실행 기록에 연결한다. 과거 실행을 최신 빌드에서 다시 실행한 것으로 계산하지 않는다. 최신 App focus 수정 이후 ordinary·Map·제작 핵심 읽기와 F-note 철회까지 반영했다. 아래 명시된 미검증·범위 제한은 그대로 남는다.

## 읽는 법과 집계 경계

- S01–S10은 **10개 시나리오 묶음**, A–D는 목적이 다른 **4개 작업 흐름**이다. A–D가 S01–S10과 겹치므로 14개 독립 요구사항 또는 14회 완주로 합산하지 않는다.
- 아래 숫자는 각 JSON의 실제 완료된 `checks` 수다. 56 checks는 56개 사용자 시나리오가 아니다. 중단 runner의 완료 checks와 후속 runner의 checks도 독립 요구 충족률로 합산하지 않는다.
- `통과`는 명시된 범위의 실제 근거를 뜻한다. 일부 중단된 runner에서 성공한 선행 단계는 그대로 부분 근거이며 원래 실패를 PASS로 바꾸지 않는다. `result:null`은 계획된 단언 수를 실행 수로 세지 않는다.
- JSON 경로의 기본 위치는 `output/playwright/integrated-program/`이다. 모델/store 교차검사는 `output/integrated-product-poc/`이며 브라우저 실행과 별개다. 상세 보고서 링크에는 선행 실패·정확한 이어가기·보존 hash가 있다.
- 이 문서는 기존 산출물을 읽어 정리한 기록이다. 작성 과정에서 제품·테스트·브라우저 상태를 바꾸거나 시나리오를 재실행하지 않았다.

## 빌드 구분

| 표기 | 실제 build ID | 이 원장에서의 의미 |
| --- | --- | --- |
| L1-a | `woSE_lDhna5deiV__L2o6` | 1차 S01–04 실행 및 초기 수정 |
| L1-b | `IW8LsXxwu6E9dExSGidFW` | 1차 S05–08 연속 흐름 |
| L1-c | `b9nco3rcs6kqfn9gSOGEA` | 1차 충돌 선택·복구·S10 후속 |
| L2-a | `fHXfhOF3IXaatFy4hcLAj` | 2차 A 출력 |
| L2-b | `Z4OpT7dWj3VCM_mo31U2r` | 2차 긴 문서 탐색 복귀 개선 |
| L2-c | `pIfd2DvMfHy2BICAkWF9L` | 주간 제작·실행·C 공개/출력/커뮤니티 |
| L2-d | `I0QgDqDV0FBDjrnqn_lci` | 네 origin·D-note/D-week, Redo 결함 발견 |
| 수정 검증판 | `ylSngUBlsuD5I1e8zd_09` | 최소 native 교체 수정 후 B 순서/Undo/Redo, 2탭 복구, 제작 5크기 |
| 최신 마감판 | `gdvy33rCuvCJ3GJ0GP-Xo` | App focus 수정 이후. Map·ordinary·제작 핵심 읽기 및 F-note 철회 완료 |

같은 최신 빌드의 확인 범위와 이전 빌드의 변경 동작 증거를 분리한다. 최신 마감판의 읽기 검사가 이전의 모든 실패 주입·쓰기·native 입력 조합을 재실행했다는 뜻은 아니다.

## S01–S10 요구별 매칭

| 시나리오 | 요구와 실제 적용 근거 | 2차 확장 근거 | 남은 해석 경계 |
| --- | --- | --- | --- |
| S01 개인 문서 | 독립 문서·메모·하위 체크·폴더·날짜·휴지통/복원·Undo/reload. 1차 S01–03 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s01-s03-continued-2026-09-14T11-23-56-994Z.json`): L1-a, 35 checks로 세 시나리오의 후속 완료 | B 긴 학습 문서+별도 참조, 검색 0건→해제→복귀. E02–03 | 최신 ordinary 동일 빌드 읽기는 E19. 기존 수행과 최신 재확인을 혼동하지 않음 |
| S02 기간·누적 실행 | 같은 항목 두 날짜 10/20%, 지난 기록 15% 수정, 완료/다시 열기 및 Undo. S01–03 동일 artifact | B 주간 10/5 완료를 남기고 미래 개인 계획 변경, 실제 7회차; 실제 Map 10/12 25%. E05, E07 | 모든 반복 종류·기간 조합을 전수 검사한 것은 아님 |
| S03 구조·이동 | 키보드 하위 트리/날짜 이동, 자기 하위 거절·Escape·Undo. S01–03 동일 artifact | B 같은 제목 두 typed 블록과 하위 체크 cut/paste→Calendar 날짜순→native Undo/Redo→원복. E06 | 이 B 초안은 native owner 구조 명령이 없는 경로. 텍스트 블록 이동을 기존 native 구조 명령 동등성으로 표시하지 않음. 새 주간 원문의 실제 CRLF 입력은 미검증 |
| S04 내 도구 출력 | 등록 출처+미지원 URL/붙여넣기 확인, 실제 TXT/CSV/ICS 6파일, 사본/문서 생성 0. 1차 선행 단계 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s04-s05-recovered-2026-09-14T11-32-16-916Z.json`): L1-a, 35 checks 뒤 S05 실패; artifact 전체 PASS 아님 | A 미지원 학습 자료 실제 3파일; C typed 반복/timezone 실제 3파일 및 출력 중 0쓰기. E01, E10 | 외부 캘린더/스프레드시트 계정 import 미실행 |
| S05 탐색·부분 가져오기 | 정확한 원본 판본/항목, 중복 방지, 두 문서 참조, 같은 실행 복귀·필터 보존. 1차 tail (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s05-tail-scroll-final-2026-09-14T11-57-16-965Z.json`): L1-b, 29 checks | 실제 Map 부분 포함·앵커·진행·참조, C 두 독립 공개본을 정확한 사본으로 가져오기. E07, E11 | 경험 작성은 사용의 필수 단계가 아님. Map 원본 변경 하니스와 실제 저장 프로필을 분리 |
| S06 커뮤니티 | 부분/반대 경험, 22문단·QA 사진, 초안 복구/취소, 부모·하위 답글·반응, 수정/삭제·활동 정확 복귀, 근거 지식·원글 삭제 표시. 1차 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s06-continued-2026-09-14T12-05-40-475Z.json`): L1-b, 39 checks | C Flow 없는 짧은 질문, 다른 로컬 actor 답글, 반응 on/off, 질문 수정·활동→정확 답글→원글. E12 | 실제 서로 다른 사람의 협업 또는 관찰 사용자 검증 아님 |
| S07 제작·선택 공개 | 1개 선택 공개·개인 실행 값 제외·quota/같은 요청 재시도·단일 v1·활동. 초기 29 checks (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s07-2026-09-14T12-19-14-254Z.json`)는 QA 위치 단언 중단, 후속 8 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s07-readonly-tail-2026-09-14T12-22-46-460Z.json`) 완료, L1-b | B 제작 저장/재진입; C 독립 F-note/F-week 선택 공개. E04, E09–10 | F-note 철회는 E18 완료. 모든 공개 정책/운영 게시 승인 아님 |
| S08 원본 업데이트 | S07 v1→v2→옛 v1 제안→v3, 개인 충돌 유지/수용·Undo/reload. 필드 선택 후속 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s08-field-entry-fixed-2026-09-14T13-04-17-144Z.json`): L1-c, 41 checks | D-note 제목 유지/설명 수용/완료 기준 별도 수용, D-week 하위 체크 수용, D-Map 분리 하니스. E13–15 | D-week는 승인된 ‘일정 또는 하위 체크’ 중 하위 체크 분기. typed 일정 변경의 모든 충돌을 이 결과로 대체하지 않음 |
| S09 입력·실패 복구 | 저장 후 화면 알림 실패/실제 reload. 1차 tail (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s09-tail-2026-09-14T13-28-07-986Z.json`): L1-c, 15 checks. 최초 result:null 및 Back/없는 대상 세부 수집 누락은 보존 | 기존 제작 pending/옛 recovery 인계, D 두 탭 stale 입력·modal 복구·owner/Back/reopen. E08, E16 | 1차 누락 구간을 소급 PASS로 바꾸지 않음. 실제 CAS 강제 경합이 아니라 정상 UI의 controller 호출 전 stale 차단 |
| S10 출처·기존 자료 보존 | 네 origin tail (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s10-transfer-tail-2026-09-14T13-43-43-864Z.json`): L1-c, 112 checks; 제작 원문/문서 tail (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-one-s10-creator-readonly-tail-2026-09-14T13-53-22-717Z.json`): 14 checks | 네 origin 재왕복, 실제 Map, native pending/legacy saved/recovery 구별, B 원복/CAS 전체 보존. E07–08, E17 | 네 origin은 기존 합성 QA 자료이며 실제 Map은 별도 프로필. 모든 실제 운영 데이터 이관 완료를 의미하지 않음 |

## 두 번째 전체 흐름 A–D 실행 근거

| ID / 흐름 | 완료한 요구·판정 | 실행 artifact와 실제 checks |
| --- | --- | --- |
| E01 / A | 미지원 학습 URL에서 붙여넣기 명시 확인→선택 출력. 실제 TXT 601B·CSV 1157B·ICS 1739B, 전체 출력 구간 0쓰기. CSV BOM/CRLF를 textarea LF와 동일 취급한 초기 QA 실패는 별도 보존 | A tail (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-two-a-tail-2026-09-14T14-02-04-121Z.json`) 53, L2-a. 초기 46과 단순 합산하지 않음. [상세](whole-loop-two-review.md) |
| E02 / B | 3389자 독립 학습 기록+짧은 참조, 같은 제목/하위 체크/비공개 문단·링크, 검색/폴더/reload | 문서 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-two-b-documents-2026-09-14T14-22-14-374Z.json`) 87. 최초 복귀 시 viewport 밖 편집기 문제는 발견 상태이며 E03에서 후속 수정 |
| E03 / B | desktop sidebar scroll을 제한하고 포인터·Tab/Enter·Back으로 같은 원문/커서/내부 스크롤 복귀. 5크기+1194, 0쓰기 | 탐색 tail (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-two-b-navigation-tail-2026-09-14T14-49-54-368Z.json`) 111, L2-b. 844×390은 편집기 일부만 보여 세로 스크롤 필요 |
| E04 / B | 주간 틀 미리보기 취소→원문 생성→native Undo/Redo→저장. 같은 제목의 월/목 항목, 시간·timezone·기간·하위 체크. URL/reload/Back/Forward의 정확한 제작 ID 복귀 수정 | 주간 생성 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-loop-two-b-weekly-create-2026-09-14T15-16-23-520Z.json`) 120; 재진입 finish (로컬 전용 근거: `../../../output/playwright/integrated-program/creator-reentry-finish-2026-09-14T15-40-09-935Z.json`) 166; 속성 tail (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-weekly-properties-tail-2026-09-14T16-04-05-709Z.json`) 28. [상세](weekly-execution-map-review.md) |
| E05 / B | 개인 인계→10/5 완료→미래 계획 10/13·20·27로 변경, 과거 완료와 목요일 회차 보존. 전체 7회차가 맞으며 6개라는 QA 기대 오류로 성공 거래를 반복하지 않음 | 인계/완료 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-weekly-execute-2026-09-20T00-44-34-831Z.json`) 48; 미래 계획 tail (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-weekly-future-tail-2026-09-20T00-54-52-062Z.json`) 79. L2-c |
| E06 / B | 실제 typed 두 블록 cut/paste, 날짜순 noop·일반 정렬 거절·Calendar 취소/적용, native CtrlZ/ShiftZ/Y. 수정 후 원문366자 유지 및 입력 이력으로 전체 원복. **global Undo 미사용** | 독립 제품 검증 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-isolated-final-2026-09-20T06-56-15-738Z.json`) 4; 누적 cut-state tail (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-weekly-order-cut-tail-2026-09-20T07-02-04-387Z.json`) 56; 5크기 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-final-screens-2026-09-20T07-05-11-628Z.json`) 29. 모두 ylSng. [상세](whole-two-b-weekly-order-review.md) |
| E07 / B·S10 | 실제 OPIc Map 개인 계획·부분 포함→10/12 25%→새 참조 문서→같은 항목 복귀/reload. 별도 최신판 읽기 왕복도 완료 | B 캡처 tail (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-map-execution-captures-2026-09-20T05-09-35-524Z.json`) 9, L2-c; 최신 Map 읽기 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-map-focus-readonly-2026-09-20T07-20-17-597Z.json`) **84**, gdvy. 84는 기존69경로+이전 observer 보존15이며 새 시나리오84개 아님. [상세](map-b-execution-review.md) |
| E08 / B·S10 | 기존 네 saved origin을 각 개인 문서→정확한 원문→Back/reload, 0쓰기. 개발2 pending 원문과 canonical 구별, 명시 sync/Undo/reload. 옛 원래 저장본과 recovery도 명시 비교·인계 | 네 origin (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-origins-tail-2026-09-20T05-40-48-793Z.json`) 78, L2-d; pending sync (로컬 전용 근거: `../../../output/playwright/integrated-program/s10-d2-native-pending-sync-2026-09-20T05-04-49-132Z.json`) 26, [pending 상세](native-pending-ui-review.md); legacy 실제 QA 원장 (로컬 전용 근거: `../../../output/playwright/legacy-recovery-2026-09-20T05-25-48-359Z-c698ca1c/QA-SUMMARY.md`), [인계 상세](legacy-recovery-review.md). legacy는 별도3 QA fixture profile, 앱 성공10/준비쓰기6/실패1을 분리 |
| E09 / C | 긴 독립 문서에서 F-note의 선택 체크만 공개. 비공개 문단·메모·날짜·진행·참조는 공개하지 않음. preview/cancel 0쓰기 | F-note 공개 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-c-note-publish-2026-09-20T05-04-16-551Z.json`) 40, L2-c |
| E10 / C | 별도 F-week 두 원본 series 공개. 원래 월/목·시간·Asia/Tokyo·체크 보존. **사본 생성 전에** TXT/CSV/ICS 실제3파일, 2개 bounded series/총6회차, 출력 구간0쓰기 | F-week 공개/출력 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-c-weekly-2026-09-20T05-08-45-050Z.json`) 46, L2-c. 실제 파일: TXT (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-c-weekly-2026-09-20T05-09-07-837Z.txt`), CSV (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-c-weekly-2026-09-20T05-09-07-837Z.csv`), ICS (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-c-weekly-2026-09-20T05-09-07-837Z.ics`) |
| E11 / C | F-week/F-note 정확한 두 판본으로 각각 사본1개. 서로 다른 원문 identity·두 문서·기존 자료 보존. 첫 주간 사본은 이미 저장되어 중복 생성하지 않음 | 사본 tail (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-c-copies-tail-2026-09-20T05-14-38-045Z.json`) 35, L2-c; 첫5 checks 뒤 subcheck map QA 가정 실패 보존 |
| E12 / C | Flow 없는 ‘반복 연습 기록을 어떤 기준으로 정리하는가’ 질문1개, 다른 로컬 actor 답글1개, 반응 on/off·질문 수정·내 활동 정확 복귀. 기존 글/사진/근거/개인 자료 보존 | community tail (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-c-community-tail-2026-09-20T05-23-23-575Z.json`) 76; runtime 읽기 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-c-community-runtime-2026-09-20T05-27-10-009Z.json`) 4, L2-c. 5크기·selector 후속은 [상세](whole-two-c-community-review.md) |
| E13 / D-note | 개인 제목/설명 충돌, 작성자 v2, 옛 v1에서 실제 제안→v3. 개인 제목 유지·설명 수용·완료 기준 별도 수용, 취소/Escape/quota/같은 요청 retry/Undo/reload | v2 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-d-note-v2-2026-09-20T05-43-11-251Z.json`) 31 + 제안 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-d-note-proposal-2026-09-20T05-46-00-518Z.json`) 12 + 수용 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-d-note-accept-2026-09-20T05-47-24-486Z.json`) 65 = 성공 runner checks108, **시나리오108개 아님**, L2-d. [상세](whole-two-d-note-review.md) |
| E14 / D-week | 원래 하위 체크 ID로 실제 제안→작성자 v2→명시 수용→Undo/reload. 10/5 완료·개인 반복 계획·B 제작 owner 보존 | 주간 업데이트 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-d-week-2026-09-20T05-51-10-970Z.json`) 18, L2-d. [상세](whole-two-d-week-review.md) |
| E15 / D-Map | factory 자료에서 삭제·재등장, 자동 포함0·명시 선택·두 주차 복원·새 날짜40%와 기존25% 보존·membership Undo | 분리 component harness (로컬 전용 근거: `../../../output/playwright/map-d-component-harness/map-d-component-2026-09-20T05-26-40-513Z.json`) 13, 실제 store 교차검사 (로컬 전용 근거: `../../../output/integrated-product-poc/map-d-harness-crosscheck-2026-09-20T05-28-20-688Z.json`) 30. **port3643 메모리 하니스**, production 누적 프로필 변경 아님; reload 영속 복구 검증 아님 |
| E16 / D-2탭 | A 새 미제출 제안 중 B 정상 UI로 새 QA 문서1개 생성→A 오래된 제출을 쓰기 전에 차단→입력·선택/B값 보존→modal 안 복구 취소/확정→actor/Back/reopen wrong-owner0 | 수정 후2탭 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-d-two-tab-fixed-2026-09-20T07-05-59-110Z.json`) 28, ylSng. A actor변경2+B 새문서1=성공쓰기3; A observer offset2와 구별. [상세](whole-two-d-two-tab-review.md) |
| E17 / B·D 보존 | B 전체 working/ProgramData/압축 Undo 원복, D 새문서·receipt 외 데이터 보존. Undo는 bounded80 중 기존79 보존·최구1 탈락·새문서1 추가, actor Undo0 | 오프라인 보존 대조 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-d-preservation-2026-09-20T07-11-28-351Z.json`) **20/20**, 실제 codec 해석. 브라우저 시나리오 수에 합산하지 않음 |
| E18 / D 끝단 | F-note만 명시 철회, F-week active 유지. 공개 판본·개인 데이터·Undo 보존, reload. 491→492 review draft1→493 archive1. 최초 중단은 nested selector QA 오류이며 성공한 준비를 반복하지 않음 | 철회 초기 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-note-withdraw-2026-09-20T07-21-37-448Z.json`) 5 checks 뒤 중단; 동일492 tail (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-note-withdraw-tail-2026-09-20T07-23-33-714Z.json`) **21 PASS**, gdvy, 5크기·범위 밖쓰기/page/console0 |
| E19 / 공통 마감 | gdvy ordinary S01/S04/S05/S06/S08 핵심 읽기·복귀·focus. 전체491 bytes 동일, 실제3다운로드/6복귀 URL의 focus/window, 20 viewport 검사에서 핵심44px·hit/overflow0 | 최신 ordinary 읽기 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-focus-ordinary-readonly-2026-09-20T07-20-37-361Z.json`) **167 PASS**, 오류0. 20 viewport 검사는 화면×크기 반복이며20개 독립 요구가 아님 |
| E20 / 제작 마감 | gdvy 같은 제작 owner→같은 개인 문서 왕복, 원문366자/라이브러리/native 상태/지난10/5 완료/미래10/13 계획 보존, 저장0 | 최신 제작 핵심 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-core-creator-2026-09-20T07-26-54-509Z.json`) **13 PASS**, runtime 일치. E06의 ylSng 입력 조작 근거를 최신판에서 다시 쓴 것으로 표시하지 않음 |

## 결함·실패의 현재 분류

| 구분 | 발견 내용 | 수정/현재 판정 |
| --- | --- | --- |
| 제품 결함 → 수정 검증 | 날짜순 정렬 뒤 native Redo에서 동명 첫 줄11자가 사라져366→355자 | 최소 차이 범위만 한 native 거래로 교체. E06의 hook 없는 제품 검사에서 CtrlShiftZ/CtrlY 모두366자, 누적 전체 원복 확인. 진단용 setter 무시 실험은 제품 PASS에 포함하지 않음 |
| 제품 결함 → 수정 검증 | stale 입력 복구 패널이 inspector modal 바깥에 있어 클릭 불가 | modal 내부 복구 경로로 E16 실제 취소/확정·입력 보존 검증. 예전 modal 닫기 우회는 수정 증거가 아님 |
| 제품 결함 → 수정 검증 | 탐색 복귀 시 긴 문서 편집기 화면 밖, 제작 재진입 URL/owner 불일치, 공개/탐색 복귀 필터 손실 | E03/E04 및 1차 S05 후속에 수정 검증. 그 시점 build와 최신판 재검사 구별 |
| 제품 결함 → 최신 수정 검증 | App focus 후속 수정 | E19 gdvy ordinary 실제6복귀 URL focus/window와3다운로드, E20 같은 owner/문서 복귀 확인 |
| QA 실패 보존 | CSV LF/CRLF, 압축 Undo를 배열/원시 JSON으로 비교, 수용된 속성 row ID 불변 오해, 7회차를6으로 기대, 동적 chunk 수집 누락·selector 중복·native dialog 결과 수집 실패 | 실패 artifact 유지, 정확한 성공 상태에서 후속/실제 모델 대조. 이미 성공한 거래를 재seed/재실행해 없애지 않음 |
| 미검증/범위 밖 | 새 주간 실제 CRLF 입력, 기존 native owner 구조 이동 전체 동등성, typed 일정 모든 충돌 조합, 실제 기기·보조기술·외부 계정 import, 장기 백업/복원 호환 | 현재 성공으로 덮지 않음. 새 정책/구현을 이 원장에서 임의 확정하지 않음 |

## 화면 크기와 대표 캡처

모든 크기 숫자는 데스크톱 Chromium viewport다. 실제 Android/iOS 검사로 표현하지 않는다. E06 제작 검사는 각 핵심 행동까지 실제 스크롤한 뒤 visible/hit-test를 확인했고 0 가로 넘침, page/console 오류0이었다. 한 캡처에 모든 버튼이 동시에 보인다는 뜻은 아니다.

| 크기 | 제작 원문·행동, ylSng | 실제 Map 참조 복귀, 최신 gdvy |
| --- | --- | --- |
| 390×844 | 제작390 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-creator-final-390x844.png`) | Map390 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-map-focus-readonly-2026-09-20T07-20-18-927Z-reference-390.png`) |
| 375×812 | 제작375 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-creator-final-375x812.png`) | Map375 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-map-focus-readonly-2026-09-20T07-20-18-927Z-reference-375.png`) |
| 844×390 | 제작844 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-creator-final-844x390.png`) | Map844 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-map-focus-readonly-2026-09-20T07-20-18-927Z-reference-844.png`) |
| 1024×768 | 제작1024 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-creator-final-1024x768.png`) | Map1024 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-map-focus-readonly-2026-09-20T07-20-18-927Z-reference-1024.png`) |
| 1440×900 | 제작1440 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-b-creator-final-1440x900.png`) | Map1440 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-map-focus-readonly-2026-09-20T07-20-18-927Z-reference-1440.png`) |

추가 대표: C 독립 질문375 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-c-community-2026-09-20T05-25-34-282Z-375.png`), C 질문 가로844 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-c-community-2026-09-20T05-25-34-282Z-844.png`), C 반복 공개 미리보기 (로컬 전용 근거: `../../../output/playwright/integrated-program/whole-two-c-weekly-2026-09-20T05-09-07-837Z-preview.png`). 질문 화면은 긴 내용에 세로 스크롤이 필요하며 가로 화면의 상단 제목 일부는 스크롤 밖이다. 화면별 상세 판정은 연결된 개별 보고서에서 확인한다.

## 데이터 불변과 완료 주장 제한

ordinary의 운영 `flow:*` 보호키는 **실제로0개**였으므로 이 프로필만으로 운영 데이터 전수 보호를 증명하지 않는다. 기존 네 origin 전용 프로필은 보호9키+Program1의 byte 동일, 실제 Map은 운영3키+Program1의 byte 동일, 개발2 pending은 원본/sentinel2키 동일 근거를 별도로 유지한다. 서로 다른 프로필의 키 개수를 합산해 한 실제 사용자 자료를 지켰다고 주장하지 않는다.

새 observer 설치 전후에는 저장 wire/hash를 대조했다. 닫힌 브라우저 사이의 모든 순간을 연속 감시했다는 주장은 하지 않는다. 누적 프로필의 seed/import/reset 없이 후속 실행했고, 별도 legacy fixture 준비쓰기와 D-Map 메모리 factory 준비는 앱 시나리오쓰기와 분리했다. `localStorage.clear()`나 허용 밖 성공쓰기를 정상 절차로 사용하지 않았다.

실제 Android Chrome **미실행**, 실제 iOS Safari **미실행**, OS IME/보조기술 **미실행**, 관찰 사용자 **0명**. 로컬 actor 변경과 캡처는 실제 다중 사용자 연구가 아니다. 이 원장 작성의 commit/push/PR/Preview/Production은 **모두 미실행**이다. production build라는 말은 로컬 빌드 형식이며 운영 배포를 뜻하지 않는다. GitHub Pages 개인 실사용·데이터 장기 보존 보장이나 cloud 서비스 도입 준비 완료를 선언하지 않는다.

## 최종 자동 검사 — 브라우저 checks와 별도

| 검사 | 실제 결과 | 근거 |
| --- | --- | --- |
| 통합 신규 suite | 181파일, **1749실행/1749통과**, skip0, 검사 중 소스 변경0 | suite (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-20T07-16-30-391Z.json`) |
| strict | 390진입·421소스, diagnostics0 | strict (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-20T07-17-38-986Z.json`) |
| production build | gdvy PASS | build (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-20T07-16-19-654Z.json`) |
| npm test | **2031실행/2030통과/기존 출처 검토기한 실패1** | npm (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-20T07-18-22-280Z.json`) |
| 기존 승인 회귀 | 201/201 | 승인 회귀 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-20T07-20-09-291Z.json`) |
| 공개 회귀 | 19/19 | 공개 회귀 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-20T07-20-16-440Z.json`) |

위 suite들이 서로 겹칠 수 있으므로 독립 총 테스트 수로 합산하지 않는다. 브라우저 checks와 모델 교차검사도 여기에 더하지 않는다. 전체 판정과 기존 실패·의존성 위험은 [최종 평가](final-evaluation-2026-09-20.md)를 함께 읽는다. 두 목적의 실행 흐름과 최신 핵심 읽기 마감은 근거가 연결되었지만, 실기기/관찰 사용자0·위의 명시적 미검증 범위를 지운 ‘모든 기능과 조합 100%’ 주장은 하지 않는다.
