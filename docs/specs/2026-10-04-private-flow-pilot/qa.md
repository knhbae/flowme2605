# 합성·정상 로그인·DEV 실행 원장

요청 `FLOWME-FINISH-PRIVATE-PILOT-20261004-1400-DEV3`. 제품 source와 실행 판본을 각 실행에 연결한다. B 합성 검사는 완료했고, 정상 계정의 B 저장과 새 DEV 반영은 아직 미실행이다.

## A 재확인 — 기존 실행, 새 시나리오 실행 아님

- `output/playwright/date-detail/app-summary.json`: build `jAYFY3t3SI-FCYcsQvJG_`, core40/faults9/long-title12=61 PASS, sourceDrift0, Auth/API 전달0·실제 backend 쓰기0.
- `prototype-results.json`: 별도 HTML32 PASS. [직전 QA](../2026-10-04-date-detail-ux/qa.md)의 다섯 크기·600보조·키보드·가로·취소·실패/재시도·Undo·reload와 NOT_RUN을 보존한다.
- runtime SHA256: ProgramSpace.tsx `E0B791244153DFE3083DE87024671C065F1D93F8FD520420A1E12BF1FD388C07`, CSS `CD0E72C34EE4610A7EFF076E67E8AD34E14ECC7BA86B71863B10A1B194738CB5`.
- 정확 build source ledger `output/integrated-product-poc/build-2026-10-04T13-28-07-062Z.json` SHA256 `7E5654CCD982D8558A818B30858BF13D714D3ECC99DAEEA0609D60E76E4000F8`.
- A 소유27파일의 manifest와 Git 상태는 일치한다. A 검사 종료 후 전용 시험 서버를 종료했고 B 준비를 위해 동일 jAY build의 합성 시험 서버만 다시 시작했다. 실제 제공 build와 포트 소유권은 검사 직전에 다시 확인한다. 프로세스·운영 원본 근거는 로컬 비공개로 보존한다. 기존 DEV/관리/지원 서버는 변경0.

## B 입력·합성

root의 같은 요청 ID 임시 지원 입력을 인수했다. 외부 원문·실개인정보·공개 발행0인 가상4항목으로 순수 파서 blocking0, 초기 개인 메모4개는 빈값·시간4개는 null이다. 검사표 A01–A10은 명시 제작 저장/인계·기간 포함/제외·10/05→10/08·인계 후 개인 메모·부분 실제 복붙/native Undo·취소/no-op·저장/reload·지원 저장본Undo/Redo·같은 계획 재열기·완료 다시 열기를 구분한다. 패킷 원문·기대표·hash·실등록 ID·raw는 로컬 비공개 근거에만 보존한다. 원래 콘텐츠·기획·테스트 담당의 정본 완료는 미확인이다.

B 신규 fixture PB01–PB12의 이전12 PASS는 이력이다. 15:30 UTC 최신 실행은 PB13의 실제 account/creator endpoint 분리·교차 요청 거절과 PB14의 CLI VM clone realm을 포함해14 PASS/0 FAIL/0 SKIP/0 CANCEL(4.69초)다. 빈 계정·기존 working/save/raw-handoff reducer·semantic receipt/lookup/CAS·source 보존·creator/private Undo·허용3115 GET·bundle realm·입력 없는 generator 거절을 검사했다. 반복 실행 수를 기능 수로 합산하지 않는다. 기존 A fixture는 creator 명령을 차단하므로 B 성공처럼 쓰지 않는다.

15:35 UTC 최종 새 빈 Chromium 실행은 A01–A10 10/10 PASS, 세부 assertion89/89 PASS, screenshot14개다. build는 위 jAY와 동일하고 runtime 두 SHA는 변경0이다. 콜백 SHA256은 `d49715738d8483fd63138eed9e162d9665d0fc8fee9525e872b0a2017b25337b`다. raw 원장은 로컬 `output/playwright/private-pilot/core-final-result.json`에 있으며 원문·실등록 ID·캡처를 포함하므로 공개 Git에 넣지 않는다.

| ID | 실제 합성 화면 조작·판정 | 결과 |
| --- | --- | --- |
| A01 | 실제 clipboard 원문 입력·명시 제작 저장·reload 후 원문/title 정확 복원 | PASS |
| A02 | 결과 보기 읽기0변경·명시 개인 인계1문서/4Item·분리 소유/유일 ID | PASS |
| A03 | 오늘/주간/월간/미정/전체와 짧고 긴 날짜 총8기간 조회의 포함·제외·같은 Item 원문 복귀 | PASS |
| A04 | native 날짜 키보드10/05→10/08·추가 시간0·저장/재열기/reload·원본/동료 보존 | PASS |
| A05 | 인계 후 개인 메모 추가·부분 실제 clipboard 붙여넣기·저장 전 native Undo·서버 변경0 | PASS |
| A06 | 미적용 날짜의 원문 복귀 차단·Escape 취소와 같은 값 적용의 성공 mutation0 | PASS |
| A07 | 실제 완료·기존 당일 진행 기록·reload의 날짜/메모/완료 보존 | PASS |
| A08 | 메모 저장 후 지원하는 서버 snapshot Undo/Redo·정확 개인 snapshot 복구 | PASS |
| A09 | 같은 계획 재열기·새 run/복제/초기화0·완료/메모/동일 ID 보존 | PASS |
| A10 | 명시 완료 다시 열기·기존 같은 날짜 진행 기록의 percent만0·날짜/메모/ID 보존 | PASS |

390×844·375×812·844×390·1024×768·1440×900 상세에서 가로 넘침0을 새 실행으로 확인했고 main이 캡처도 열람했다. 낮은 가로 화면은 dialog 내부 스크롤을 사용한다. 이번 B 기하 검사는 새 전체 키보드·AT 도달 검사로 확대하지 않는다. 이전 A61의 키보드·초점/스크롤 검사는 별도 근거다. native date picker·독립 메모 cancel control·OS IME/AT·실기기 검사는 NOT_RUN 또는 미지원으로 구분한다.

성공 요청11·합성 revision11, creator saved record1/개인 문서1/4Item을 유지했다. 원 creator 원문·동료 Item/원문 밖 line ID·public/source·운영 sentinel은 정확 보존됐다. Auth/API 전달·실제 backend쓰기·허용 prefix 밖 저장/clear·금지 요청·page/console error는 모두0이다. 이는 정상 계정의 RLS/DB byte 검사나 관찰 사용자 검증이 아니다.

실패 이력도 보존한다. 첫 실행은 fixture가 제작 endpoint를 잘못 분류해 A01 FAIL, 다음2회는 CLI VM의 host-realm clone으로 명시 저장 invalid였다. PB13/PB14와 callback-local clone으로 고쳤으며 제품 validator/global 변경0이다. 이후 A04의 helper를 포함한 시간 label 선택과 A10의 JS object key 순서 비교 실패를 콜백에서만 수정했다. 마지막 재실행이 통과했으며 이전 실패를 PASS로 고치지 않았다. PB14 최초 회귀는 sandbox URLSearchParams 누락으로1 FAIL 후 대역 환경을 바로잡아14/14 재실행했다. runtime·저장/API/schema 변경0이다.

## A root 독립 재실행

root의 로컬 비공개 독립 실행 요약을 직접 읽고 현재 source2/build와 대조했다. 원본은 공개 Git에 포함하지 않는다. 요약 SHA256 `bfe5f70d92a042b83ae7e40f5ff28b405884f488cc80ad01964813f106248f11`, 기록14:24:21.372UTC, 새 빈 브라우저 core40/faults9/long-title12=61 PASS/0 FAIL, 전후 jAY/두 runtime SHA와 현재값 일치·drift0이다. Auth/API forwarding0·금지 저장 호출0·sentinel/public 그대로·console/page error0·realBackendWrites0·realLoginUI=false·관찰0이다. 개발3 기존61과 별개의 독립 재실행이며 기능122개 완료라는 뜻은 아니다.

root의3117 시도는 원 fixture 허용 origin 밖이라 실행 전에 중단했고 root 소유 서버만 종료했다. 실제 독립61은 개발3가 유지한3115를 이용했으며 원 fixture 경계를 변경하지 않았다.

## 정상 로그인 UI

14시대 UTC CUA Chrome의 정상 `https://alpha.wikiplans.com/alpha`에서 로그인 폼을 확인한 뒤, 같은 정상 UI에서 개인공간과 `서버와 연결됨` 표시를 확인했다. `내 활동 → Flow 만들기 → 제작 초안`으로 이동했다. `빈 제작 원문 만들기` 클릭 시 기존 미저장 원문 보호 안내가 나와 `계속 편집`으로 보존했다. 원문 뷰의 제목 빈값·기존 본문 존재만 DOM boolean으로 확인했고 본문값은 출력하지 않았다. 기존 입력 저장/폐기/덮어쓰기0, 새 B 쓰기0이다. 최소 정상 사용자 처리 또는 별도 빈 시험계정의 직접 로그인 필요 상태를 root에 인계했다. 새 B 원문 입력·저장·개인 인계·reload는 아직 NOT_RUN이다. 연결 표시를 실제 RLS/DB 또는 B 전체 통과 근거로 확장하지 않는다. credential/profile/token/session 추출·서비스role·DB 직접주입0이다.

## DEV 반영·복귀

14:01:40.495 UTC의 읽기 관측은 현재 a30/기존 i1c 제공이며 후보 jAY 부재였다. 운영 담당의 기존7단계 결과와 현재 manager 절차는 역사적/읽기 근거로만 대조한다. 과거 PID/creation·approval ref·CI·receipt를 이번 제어 pin으로 재사용하지 않는다. 새 후보 전환·복귀·최종 제공판은 모두 NOT_RUN이다.

## 게시·실기기·관찰

새 commit/push/PR/CI dispatch/main merge/Production0. 최초 `PUBLICATION-HOLD` 후 부모의 정확 public 저장소·branch·날짜UX/일반 파일럿 검증 code/docs·민감정보 제외·merge금지 질문에 대한 사용자 승인을 공식 read_thread에서 직접 확인했다. 14:38UTC 새 구체 승인 범위에 한해 보류가 해제됐으며 최종 소유 diff를 선별 중이다. 대상은 public `knhbae/flowme2605`, branch `agent/alpha-date-detail-ux-20261004`다. 새 원문·개인자료·실등록 ID·raw 로그/캡처·credentials·운영자료는 공개 범위 밖이다. 도구 명시 거부 시 중단하고 우회하지 않는다. 정상 운영 방식 변경·DB/Auth/schema/DNS/Tunnel/보안 설정 변경0. 실제 Android/iOS·IME·AT NOT_RUN, 관찰 사용자0명. 원본 출력·캡처는 로컬 output/root 근거 폴더에만 보존한다.
