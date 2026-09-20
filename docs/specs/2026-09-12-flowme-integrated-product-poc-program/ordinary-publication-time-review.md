# 일반 시간 전달·정확 복귀·문서 메뉴 대조

2026-09-14 · 전체 목표의 중간 결과. [실행 계약](spec.md)의 P02/P04/P06/P07/P08, S02/S04/S07/S09/S10에 해당한다. 공개 작성과 소비는 실제 보존 여행 작성물을 사용했다. 다른 원문·Map 삭제·복합 충돌·전체10상황과 두 전체 개선 루프를 이 결과로 대체하지 않는다.

## 원래 요구와 현재 구현

| 출발 요구 | 발견한 차이 | 이번 연결·수정 |
| --- | --- | --- |
| 개발2 여행 틀의 시간과 시간대 | 원래15:00·Asia/Tokyo가 일반 공개 일정에 구조적으로 전달되지 않음 | 원문 비교의 다섯 번째 선택 필드로 시간/시간대 제공. 기본 미선택, 같은 값/취소0쓰기. 잘못된 입력도 비공개 초안에서 복구하되 공개 거절 |
| 개발1 공개 보기·필요한 항목 출력 | 일반 일정의 날짜만 공개/출력할 수 있었음 | Program 전용 version1 timing, 엄격한 허용 필드. 공개 설명·자료·시간을 선택한 새 불변2판, 항목 선택 TXT/CSV/ICS. 시간대를 임의로 채우거나 없는 종료시각/소요시간을 만들지 않음 |
| v4.1 개인 실행과 원본 분리 | 원래 시각을 가진 사본의 날짜 이동·완료·출력이 연속 검증되지 않음 | 실제 사본에서 개인 날짜09-14·100% 완료·Undo/reload. 원문09-10·15:00·Asia/Tokyo와 개인 실행 구분. 공개 ICS09-10 06:00Z, 개인 ICS09-14 06:00Z |
| 정확한 행으로 복귀 | 주소는 맞지만 일부 실행에서 초점이 MAIN으로 돌아감 | 명시 이동 checkpoint가 준비되는 즉시 이전 클릭/스크롤의 위치 기억을 막고, 해당 이동의 복구가 끝나야 해제. 저장 state/schema를 추가하지 않음 |
| 기존 커뮤니티 입력 복구 | 새 이동 guard 이후 복구 effect 전에 입력한 검색 조건이 이전 값으로 돌아갈 수 있음 | 실제 App 콜백 순서 검사로 재현. 대기 중인 동일 이동의 presentation만 최신 값으로 갱신하고 이동 identity와 해제 순서 보존 |
| 문서 작업 후 본문 조작 | 출력 창을 닫아도 문서 메뉴가 남아 본문을 가림. Escape로 닫히지 않음 | 다음 화면을 열기 직전에 메뉴 닫기. 바깥 pointer/focus·Escape 지원, IME/소비된 Escape 보호. 미저장 이름과 원래 CAS 기준 보존. 짧은 화면의 메뉴 내부 스크롤 |

## 실제 자료와 변경 연속성

보존 프로필 `program-ordinary-source-recovered`의 revision270→272→277→278→282를 이어갔다. 초기화·새 fixture 대체 없이 같은 여행 초안/공개 판본/개인 사본을 사용했다.

- 실제 공개 항목: `publication-line-14329114-22dc-4f70-be57-90129bdacdd5`.
- 새 공개 판본: `version-b4ecee96-2ef3-414c-94a9-07a4cc95831a`.
- 실제 사본: `copy-3849ebc3-4416-4ede-aae2-dd2a6bf02be0`.
- 정본 문서/행: `copy-document-603634d3-3815-42b5-91ee-5ceda890728d` / `source-item-dceb0d17-f2a1-4327-b2e7-08553c1423c6`.

공개/개인 파일6개의 실제 bytes·SHA256, 기존 모든 문서와 Flow·Creator 상태·사본·다른 인물·옛 공개 판본 불변은 `program-ordinary-time-crosscheck.mjs`로 원본 실행 기록과 재대조한다. 이 대조의 확인점 수는 새 자동 테스트 실행 수나 요구 충족률이 아니다.

## 수행한 검증과 실패 구분

| 실행 기록 | 실제 범위와 판정 |
| --- | --- |
| 시간 선택 첫 실행 (로컬 전용 근거: `../../../output/playwright/integrated-program/ordinary-time-publish-2026-09-14T09-03-22-009Z.json`) | 270→272,4확인 뒤 QA 객체 key 순서 비교 오류. 실제 취소/Escape0쓰기·quota 실패/선택 유지/재시도 기록은 보존 |
| 동일 상태 재개 (로컬 전용 근거: `../../../output/playwright/integrated-program/ordinary-time-publish-resume-2026-09-14T09-04-16-698Z.json`) | 272→277,14확인 완료. 명시 시간 선택·잘못된25:99 초안 저장/reload·수정·새2판·개인/이전 공개 보존 |
| 공개 출력·사본 (로컬 전용 근거: `../../../output/playwright/integrated-program/ordinary-time-consume-2026-09-14T09-06-20-926Z.json`) | 277→278,9확인 완료. 공개 실제3파일·사본 없이 출력0쓰기·선택한 항목으로 실제 사본1개 |
| 개인 실행·파일 (로컬 전용 근거: `../../../output/playwright/integrated-program/ordinary-time-private-2026-09-14T09-09-21-262Z.json`) | 278→282,14확인 뒤 QA가 일반 복귀 안내에 없는 `완료됨` 문구를 요구해 부분 종료. 실제 날짜/완료/Undo·파일3개는 기록됨 |
| 정확 복귀 재현 (로컬 전용 근거: `../../../output/playwright/integrated-program/ordinary-time-return-complete-2026-09-14T09-13-02-605Z.json`) | 282불변,7확인 뒤 실제 editor 초점 timeout. 앞선 QA의 URLSearchParams 환경·documents/flows 위치·조건부 완료 버튼 가정 오류와 구분 |
| 첫 초점 수정 (로컬 전용 근거: `../../../output/playwright/integrated-program/ordinary-time-focus-fixed-2026-09-14T09-24-15-379Z.json`) | EeSt9확인 완료. 같은 자료로 별도9확인2회 반복. 새 전체 상황이나 두 전체 개선 루프로 계산하지 않음 |
| 메뉴 수정 전 (로컬 전용 근거: `../../../output/playwright/integrated-program/document-menu-before-2026-09-14T09-29-38-214Z.json`) | 같은282에서 실제 Escape 닫기 실패 재현. QA 미저장 제목만 원래 입력값으로 되돌렸으며 제품 저장하지 않음 |
| 메뉴 첫 검증 (로컬 전용 근거: `../../../output/playwright/integrated-program/document-menu-fixed-2026-09-14T09-32-47-375Z.json`) | 7확인 뒤 날짜 불일치 때만 있는 inline badge를 QA가 요구해 중단. 원래 행 메뉴의 날짜 바꾸기로 검증 경로를 바로잡았으며 제품 날짜 계약을 바꾸지 않음 |

최종 실행판 `N0qIFd_20k1pri2w99QdI`의 행 복귀9 (로컬 전용 근거: `../../../output/playwright/integrated-program/ordinary-time-focus-release-2026-09-14T09-41-29-133Z.json`), 메뉴37 (로컬 전용 근거: `../../../output/playwright/integrated-program/document-menu-release-2026-09-14T09-42-05-220Z.json`), 커뮤니티 검색/reload/뒤로5 (로컬 전용 근거: `../../../output/playwright/integrated-program/navigation-community-final-2026-09-14T09-40-48-123Z.json`)는 완료했다. 모두282→282·저장 호출0·page/console 오류0이다. 커뮤니티의 매우 짧은 event 순서는 실제 콜백 단위 재현이며 브라우저에서 그 정확한 타이밍까지 재현했다고 주장하지 않는다.

최종 전체 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-14T09-37-23-814Z.json`)는159파일1571실행/1571통과/skip0, strict358진입/진단0, build (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-14T09-37-13-368Z.json`) 통과다. npm (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-14T09-39-58-466Z.json`)은2031실행/2030통과/기존 출처 검토 기한1실패/skip0, 승인 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-14T09-41-37-466Z.json`)201/201, 공개 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-14T09-41-44-268Z.json`)19/19다. 출처 기한을 임의 갱신해 통과시키지 않았다. 이전 의존성5건은 미해결이며 이번에는 audit를 새로 실행하지 않았다.

중간 전체1566실행의10실패는 기존 App 테스트 double에 새 pending ref를 제공하지 않아 발생했다. double을 실제 ref와 맞춘 뒤 기존 단언을 그대로 통과했다. 추가 콜백 순서 검사에서는 커뮤니티 새 검색이 이전 값으로 돌아가는 실제 로직 실패1건을 재현·수정했다. 메뉴 테스트의 optional boolean 타입 오류1건도 수정했다. 마지막 소스를 동결한 전체1571과 이전 성공/실패를 구분한다.

38대조 (로컬 전용 근거: `../../../output/integrated-product-poc/ordinary-time-crosscheck-2026-09-14T09-43-42-054Z.json`)는 최종 검사/build/현재388소스 일치,270→282 자료 연속성·이전 개인/공개 불변·실제6파일을 확인한다. 서로 다른 실행판의 공개/소비와 최종 복귀·메뉴 회귀를 한 번의 동일 최종판 전체 여정으로 표시하지 않는다.

## 변경 파일

- 일반 시간 계약/읽기/제안/출력: `lib/flow/integrated-poc/{contract,program-data,public-ordinary-time,publication,publication-ordinary-source,output,private-space,execution-source,private-output,proposal-comparison}.ts`, `public-ordinary-time.test.ts`.
- 공개/사본 UI: `components/flow/integrated-poc/{ProgramPublicationTiming,ProgramPublicationSourceReview,ProgramPublisher,ProgramCopyInspector,ProgramDiscovery,ProgramCopyProposal}.tsx`, `ProgramPublisher.test.tsx`.
- 복귀/메뉴: `ProgramApp.tsx`, `ProgramApp.navigation.test.tsx`, `ProgramSpace.tsx`, `ProgramSpace.module.css`, `ProgramSpace.document-menu.test.tsx`, `lib/flow/integrated-poc/writing-navigation-race.test.ts`.
- 실제 QA/대조: `scripts/personal-workspace-poc/program-ordinary-time-{publish,consume,private,return}.cli.js`, `program-document-menu.cli.js`, `program-navigation-community-regression.cli.js`, `program-ordinary-time-crosscheck.mjs`.
- 현재 문서: 이 원장·`ordinary-publication-time-design.md`·`current-checkpoint.md`·`integration-seams.json`, 소유한 `docs/STATUS.md` 최상단 PoC 메모, 캡처 보고서. 이전 실패 기록·기존 운영 본문·미소유 파일은 삭제/정리하지 않음.

## 화면 평가와 남은 부담

시간 입력과 복귀/메뉴 동작은390×844·375×812·844×390·1024×768·1440×900에서 검사했다. 지정 행동의44px·hit test·가로 넘침0을 확인했으며 전체 제품의 모든 행동이 가려지지 않는다는 뜻은 아니다.

- 실제 공개 시간/출력 (로컬 전용 근거: `../../../output/playwright/integrated-program/ordinary-time-public1024-1789376782798.png`): 원래09-10·15:00·Asia/Tokyo와 선택 범위1/2를 확인. 사본 없이 파일 받기와 선택 사본 만들기 구분.
- 375px 메뉴 후 본문 (로컬 전용 근거: `../../../output/playwright/integrated-program/document-menu-clear-375-1789378474175.png`), 1024px (로컬 전용 근거: `../../../output/playwright/integrated-program/document-menu-clear-1024-1789378474950.png`): 가리던 메뉴가 닫힘.375px의 긴 원문 줄바꿈과 본문 내부 스크롤 부담은 여전히 큼. 완료 행의 희미한 정보도 전체 시인성 평가에 남김.
- 원래 QA 소개문에 남은 ‘첫 항목만 공개’는 작성 초기의 설명이다. 이후 공항 항목을 추가한2판과 설명이 맞지 않으므로 이 예시 문구를 제품 정책이나 정확한 선택 범위 안내로 사용하지 않는다.

## 보호·미실행·후속

모든 기록에서 허용 prefix 밖 저장 호출0, 기존 저장 bytes 불변. 이 실제 QA 프로필의 운영 key는0개이므로 채워진 운영 데이터 불변의 증거로 확대하지 않는다. 최종 전체에 포함된 [controller 검사](../../../lib/flow/integrated-poc/controller.test.ts)는 공백까지 가진 `flow:operating` 값을 채우고 전후 정확 값·Program key 쓰기를 검사한다. 이전 [Map18 실제 UI](map-catalog-change-review.md)의 운영 원형2키/표식1키와는 다른 근거다.

소스 baseline4781개 중4778개 동일·승인된 공유 접점3개·예상 밖 변경0. STATUS 경계 (로컬 전용 근거: `../../../output/integrated-product-poc/status-note-boundary-2026-09-14T09-47-29-512Z.json`)는 최상단 PoC 메모 외 운영 본문을 원래 hash로 복원해 byte 동일을 확인했다. scoped closeout과 `git diff --check`도 실행했다. 보고서 정적219확인 (로컬 전용 근거: `../../../output/integrated-product-poc/report-static-2026-09-14T09-47-29-868Z.json`)은 링크·PNG5개·스크립트/구조만 검사하며 HTML 렌더 통과가 아니다. 보호 근거 추가 뒤 문서 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/docs-2026-09-14T09-49-04-238Z.json`)도 통과했다. 문서 링크 검사는 기능/화면 검증과 구별한다.

실제 Android Chrome/iOS Safari·OS IME·보조기술·외부 Calendar/Sheet import 미실행, 관찰 사용자0. 로컬 예시 인물은 실제 다중 사용자/서버 권한 검증이 아니다. commit/push/PR/merge/Preview/Production/외부 게시 미실행. Figma 미사용: 기존 코드와 실제 화면을 대조한 Code-only 보완이며 보고서 HTML의 기존 URL 보안정책 차단은 우회하지 않는다.

다음은 실제 Map 새 상위 판본 삭제·복합 개인 필드 충돌·다른 원문의 의미 보존, 같은 최종판 S01~S10의 전체 평가와 다른 목적/자료의 두 번째 전체 개선이다. 새 실행·전체 백업·공개 철회/신고 정책은 별도 미확정 경계다.
