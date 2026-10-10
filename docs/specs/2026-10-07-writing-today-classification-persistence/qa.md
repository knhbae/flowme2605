# 검사 원장

## 첫 실행

chunk `bb5719`: 표적 31개 중 29 PASS/2 FAIL, skip 0. 합성 HTTP 저장 3개는 PASS. 실패 둘은 신규 검사 준비 오류였다.

- PWC04: 메모 본문을 넣기 전의 `lines.length=0`으로 참조를 삽입해 비어 있지 않은 메모 첫 줄에 연결하려 했음. 기존 정상 삽입 규칙이 거절했다. 최신 문서 끝에 연결하도록 검사 준비를 수정했다.
- 날짜 표시 추가 검사: render가 `hiddenRows`를 실제 fold metadata에서 다시 계산하는데 외부에서 Set만 바꿨음. 존재하지 않는 접힘 조작을 성공 근거로 사용하지 않고 실제 active property 음성 조건을 검사한다.

첫 실패는 보존하며 수정 후 실행 결과를 별도로 기록한다. 이 문서는 제품·실제 서버 성공 원장이 아니다.

## 최종 로컬 source 검사

날짜 표시 시안 두 개는 수치가 뷰포트 밖에 놓이는 반례를 독립 검토로 확인해 채택하지 않았다. vendor/text-editor.cjs와 날짜 표시 검사는 이전 uWm 바이트로 복원했다. 중간31/57 PASS는 미채택 시안의 검사이며 최종 수에 합산하지 않는다. 중간30 PASS/1 FAIL은 바뀐 시안과 기존 기대 문구의 불일치였다.

최종 실행 chunk `6fbb22`: 관련6파일50 PASS/0 FAIL/0 SKIP. 기존 HTTP repository·controller·server handler와 fake CAS 저장소를 거쳐 분류·날짜·진행·본문·메모 연결을 저장하고, 아무 로컬 데이터가 없는 새 controller로 읽었다. 실패한 commit은 입력/원 pending 명령을 보존하며 정상 같은-ID 재시도로1회 저장된다. 잃은 ACK는 기존 receipt로 해결되고 두 번째 쓰기가 없다. 메모 연결 해제는 참조 줄/binding을 제거하지만 문서·canonical Item·진행 기록을 남긴다. 실제 Auth/DB/network가 아닌 합성 서버 결과다.

제품 타입:613 entry/688 source hashes, diagnostics0/sourceChanged0, chunk `d7c643`, exit0. `npm run build`: exit0, chunk `7825d9`, build `C9B61sdg-S1rMPIp0vRta`. 기존 Q2와 uWm 결과는 역사 근거로 재사용하며 현재 실행 수와 합산하지 않는다.

## 새 source의 브라우저 조작

전용 Chromium의 component host3134에서 데스크톱과390×844를 확인했다. 이 host는 실제 제품 컴포넌트+가상 tab sessionStorage이며 Next 서버·실계정 저장이 아니다. manifest의218 source 핀을 현재 제품과 연결하며 위 Next build는 참조 판본이다.

- 제목·위치를 고르지 않고 일반 글과 할 일2개를 작성했다. 같은 Item에 업무/생활 분류를 지정했다.
- 콘텐츠 초기 날짜 미정인 생활 항목에는 테스트의 명시 개인 설정으로 오늘을 지정했다. 원문사실로 보정하지 않는다. 오늘에서 업무를 다음 날로 미루고 생활을 완료했다. 날짜가 달라도 업무 분류에서 같은 Item을 찾고 완료한 생활 항목도 다시 찾았다.
- 원래 글에서 native keyboard로 이어 썼다. 메모 글은 명시적으로1개만 만들고 업무 항목에만 연결했다. 새 상세 버튼을 Enter로 활성화해 해당 메모의 같은 참조 줄로 돌아갔다.
- 기본 이름 생성 폼은 더보기의 접힌 영역임을 확인했다. 새 글/Item/사본이 보기 이동이나 reload로 늘지 않았다. 원래 글+명시 메모2개, canonical Item2개, 사본0.
- 390px에서 분류→연결 메모→원래 글→오늘→reload를 확인했다. 날짜·분류·완료·메모 관계·ID/raw·진행 기록이 동일하며 document scrollWidth390/viewport390, 콘솔 오류0, 실제 backend쓰기0이다. 실제 휴대폰은 아니다.

초기 CLI 두 실행은 모듈 로딩(require/dynamic import) 제한으로 UI 조작 전에 실패했다. 이후 여정에서 편집기 presentation 겉면을 클릭해 native textarea에 가로막혔다. 그 전까지 완료한 날짜/완료를 보존하고 현재 입력창에서 남은 이어쓰기/메모만 진행했다. selector 실패를 제품 결함으로 세지 않고 입력창 native 키 조작으로 최종 마감했다. 완료한 변이는 반복하지 않았다. 최종 desktop `04:03:40Z`, mobile `04:04:10Z`.

원자료는 ignored `output/playwright/writing-today-classification-persistence/`의 final-targeted-tests.txt, desktop-result.json, mobile-result.json, 캡처 및 source manifest다. 원문·가상 ID/raw/캡처는 공개 Git에 포함하지 않는다. 로컬 근거 경로는 공개 다운로드 링크가 아니다.

## 아직 수행하지 않은 범위

정상 시험계정의 새 분류/메모 실제 서버 저장·탭 종료 뒤 새 접속, 새 CI 성공/Alpha 전환, 실물폰/OS 한글 IME/처음 쓰는 사용자 관찰: NOT_RUN. synthetic CAS의 새 빈 controller와 브라우저 tab reload는 실제 서버 새 접속 증명이 아니다.

## 정상 게시 뒤 CI 진입 경로 보완

정상 commit/push로 `f592e12753fc80cf6c3150c3eda286d622db5f5e`를 기존 Draft PR213에 게시했다. 기존 pre-push hook의 docs/단위검사/build가 통과했고 해당 로컬 build는 `Y3J_Kr2YAVnnjyvZjorG5`다. 원래 C9B의 component UI 결과를 Y3J Next 화면 검사라고 바꾸지 않는다. 제품 소스 바이트는 같고 새 게시 판본과 빌드는 별도다.

CI `37570202088`의 Docs/Unit/Build 작업은 타입·build·core 검사를 통과했으나 portable private journey에서 기본 닫힌 이름 생성 폼에 바로 fill하여 실패했다. first failure는 `ci-failure-37570202088/core-job-log.txt`와 classification.json에 보존한다. 실패를 일반 저장 결함으로 판정하지 않았다.

현재 화면의 더보기→이름 생성·다른 날짜 보기·할 일 추가 진입을 기존 E2E3파일에 연결했다. 기존 날짜·원문·순서·no-op·quota·Undo·sentinel·geometry assertions, timeout, skip, 보안 경계는 변경하지 않았다. 실제 제품 수정은 추가하지 않았다.

좁은 로컬 검사: portable1 PASS(chunk `8c0e6f`), canonical Flow boundary1 PASS(초기7case 실행), workspace3751 PASS(`3d416b`), 나머지4 viewport와 ordering5 PASS(`51b941`). 고유8사례이며 반복 수를 합산하지 않는다. 초기 workspace375 실패는 원문 이동의 비동기 완료 전에 더보기 상태를 읽은 시험 race였다. 쓰기 목적지의 표시를 기다린 후 정상 메뉴를 열도록 수정했다. 초기 실패/중단 원자료를 보존하고 실패한 여정을 PASS로 덮어쓰지 않는다. 나머지5의 source 전후 안정과 raw는 `ci-navigation-followup/result.json`·remaining-five-output.txt에 있다.

기존 사용자 Chrome은 입력값을 읽거나 쓰지 않고 정상 시험계정 일치 boolean·서버 연결·편집기 저장됨·dirty0을 관측했다(`04:18:56Z`). 새 후보 실제 저장이나 신규 접속은 아직 실행하지 않았다. 현재 제공 Alpha는 c287/eWX이며 기존 HoldCurrent 실행 전 거절 기록을 보존한다.

## 비공개 계약 검사 하네스 보완

후속 게시 `23b0012b34d72a5473f2d192626fc982375882c8`의 CI `37571422608`에서 Docs/Unit/Build와 일반 E2E는 통과했지만 비공개 계약 검사는3240개 중3224 PASS/16 FAIL이었다. 연동 gate의 실패는 이 결과를 올바르게 반영했다. 공개 CI에는 개별 실패 상세가 없으므로 기존 로컬 검사로 진단했다. 로컬도305파일/3240개 중3224 PASS/16 FAIL, sourceChanged0이었다. 숫자는 같지만 두 실행의 private pack 바이트 동일성을 입증하지 않았으므로 같은 실패 사례라고 확정하지 않는다.

로컬16개는 기본 닫힌 추가 메뉴를 예전 open 속성으로 찾는 검사1개, 행 렌더에 필요한 progress/value 문맥 누락1개, 현재 기본 이동 callback과 맞지 않는 문자열1개, 원문 복귀에 필요한 pendingSourceFocus/dataRef/초점 소유 문맥 누락12개, 이미 값 비교로 바뀐 캐시 guard를 예전 reference 비교 문자열로 찾는 검사1개였다. 제품 코드·저장 계약·guard는 수정하지 않았다.

관련 테스트5파일만 정상 화면/초점 계약에 맞췄다. collections/context/journey의48개와 writing-navigation/writing-position의9개가 각 표적 실행에서 모두 통과했다. 고유57개이며 기존50개나 CI 실행 수에 합산하지 않는다. 입력·조합·잠금·권한·Item/문서 ID·원문·진행 기록·caret·화면 위치·단일 form·쓰기 횟수·App/Alpha 초점 소유 검증을 보존했다. skip/timeout/검사 생략은 없다. 첫3파일 실행47 PASS/1 FAIL은 evaluator 임시 변수명 충돌이며 수정 후48 PASS다. 두 파일 초기4 PASS/5 FAIL도 별도 보존했다.

실패와 최종 표적 raw는 ignored `output/ci-failure-37571422608/` 및 `output/playwright/writing-today-classification-persistence/focus-harness-*`에 남긴다. 이후 Git checkout 줄바꿈을 맞춘 파일은 변환 전후 SHA와 동일 clean object를 별도 연결한다. 줄바꿈 변환을 새 사용자 동작 검사로 세지 않는다. 새 정확 HEAD CI·Alpha 적용·실계정 저장/새 접속 성공은 실제 결과가 나오기 전까지 NOT_RUN이다.
