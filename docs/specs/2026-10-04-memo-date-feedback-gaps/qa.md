# 실행 원장

2026-10-04 착수·검증. 아래는 이번 후보에서 실제 실행한 결과다. 이전 goal·외부 Dots·전달 캡처 결과를 새 실행 수에 더하지 않는다.

## 원문 기준

| 읽기 전용 원본 | SHA256 |
| --- | --- |
| `D:/flowme2605/flow-mvp/docs/content-audit/2026-09-28-flowme-use-feedback-session-ko.md` | `BBFC2FA77D1673ECFA6D11AA3B1D276F3225D1907C0C8956BB76780E92724941` |
| `D:/flowme2605/flow-mvp/docs/content-audit/2026-10-04-flowme-ui-retest-comments-handoff-ko.md` | `AD0DE1AE869BBAC2C3D88E0FF983EFF611485E4464CABA83609B1B593B9B5B41` |

최신 피드백 세션 마지막 인계도 동일한 후속을 가리킨다. 원 PDF·ZIP·11개 캡처는 미열람. Library 직접 읽기 도구가 없고 Page 참조 읽기에는 해당 Page ID가 없으므로 임의 URL 다운로드를 하지 않았다.

## 시나리오 기준

| 묶음 | 기대 |
| --- | --- |
| 문서 날짜 / 기간 날짜 | 10/05→10/08 적용 뒤 동일 ID, 개별 날짜 변경, 원문 구획/위치·note/time/진행 보존 |
| 반복 적용 / reload / 기간 왕복 | 마지막 성공만 복원, 정확한 document+line으로 복귀 |
| 부분 선택·붙여넣기 | 선택 부분만 교체, 인접 메모·Item/기록은 현행 계약대로 보존 |
| Undo/Redo | 진짜 committed state 복원과 수동 역편집을 구분 |
| 취소·Escape·동일값·저장 거절 | 성공 저장0 또는 이전 성공 보존, 입력 초안 보존·회복 가능 |
| 미정3표현 | 자유 문장 상속, 명시 구획 미정, 개별 미정의 차이 유지 |
| 390×844·375×812·844×390·1024×768·1440×900 | 가로 넘침0, 주요 조작 도달, console/page error0 |

현재 제공본을 build/install/edit하지 않는다. 로컬 후보만 새로 build하고 합성 계정 fixture를 이용한다. 실제 DB byte 비교·실기기·AT/IME·관찰 사용은 NOT_RUN으로 남긴다.

## 정확한 후보

- root: `D:/flowme2605/flow-memo-date-feedback-gaps-20261004`, detached HEAD `df0670f8086977d9777952e1e5cafb42096effe8` + 이번 소유 변경.
- 정상 production build: 수정 전 `nUqSgiZKW_0U-XIMbQyNB`, 수정 후 `lPblD_VvlR6bemR8EV0l1`. 두 build 모두 exit0. 최종 build 뒤 제품 runtime 추가 변경0; 선택적 callback의 테스트 타입 선언과 QA·문서만 보완했다.
- task-owned QA: `127.0.0.1:3106`. 합성 설정·서명 없는 시험 토큰·fresh 격리 Chromium context만 사용했다. 실제 `/alpha` HTML·정적 자산 GET만 localhost로 전달하며 Auth/API는 메모리 fixture로 응답한다. 제품 계정·DB 요청 전달0.
- 브라우저가 받은 HTML에 정확 build ID가 없으면 설치를 거절한다. cookie/localStorage/IndexedDB origin·다중 탭·service worker·기존 페이지가 있는 context도 controls·routes·navigation 전에 거절한다.
- 설치 callback SHA256: `55ae33e24650329c6e832c0ef10f800e0ba44d41276f2e96a76ec85908a0a0f9`. bundle의 VM self-check는 브라우저 검사 수에 포함하지 않는다.

## 자동 검사 원장

| 실행 | 결과 | 로컬 원본 증거 | 집계 방법 |
| --- | --- | --- | --- |
| 수정 전 신규 날짜 회귀 | 4 PASS / 2 FAIL, 6실행 | date agent 도구 출력 | 늦은 응답의 실제 failing regression; 최종에 합산하지 않음 |
| runtime 수정 뒤 기존 회귀 최초 | 114 PASS / 2 FAIL, 116실행, exit1 | date agent session63656, chunk `b0d212` | 5파일의 기존 AST 평가 문맥2곳에 ref 누락으로 ReferenceError. 문맥 보완 후 최종212에서 모두 통과. 별도 로그 파일 없음 |
| 수정 후 신규 날짜 회귀 | 10/10 PASS | `.tmp/feedback-gaps/date-final-typed.log` | dialog·입력 세대·같은 항목 재열기·시간 새 입력·정상/unchanged 성공 |
| 신규 부분 선택 회귀 | 14/14 PASS | `.tmp/feedback-gaps/new-tests.log`의 날짜10+부분14 | 컴포넌트8, 모델/저장 owner6 |
| 신규 미정 표현·fixture 보호 | 7/7 PASS | `.tmp/feedback-gaps/fixture-undated-tests.log` | MD08 3, 격리/GET 경계4 |
| 관련 16파일 최종 합동 | 212/212 PASS, skip/cancel0, exit0 | `.tmp/feedback-gaps/scoped-final-typed.log` | 기존181 + 신규31; 위 신규를 다시 더하지 않음 |
| `npm test` 수정 후 | 2,261/2,261 PASS, skip/cancel0, exit0 | `.tmp/feedback-gaps/npm-test-final.log` | 15 lane: 177+455+68+78+38+24+40+7+27+29+23+432+640+204+19 |
| 통합 타입검사 최종 | 검사기10/10 PASS; 588 entry, 진단0; exit0 | `.tmp/feedback-gaps/typecheck-corrected.log` | 테스트 선택 callback 선언3건을 보완한 뒤 재실행 |
| production build 수정 후 | PASS, exit0 | `.tmp/feedback-gaps/build-final.log` | `lPblD_VvlR6bemR8EV0l1` |

표의 반복 실행은 별도 실행 이력이지 제품 요구 커버리지 백분율이 아니다. npm 기본 lane과 통합 제품 표적 lane도 전역 고유 개수로 합산하지 않는다. 최초 `npm ci` 도구 세션은 종료 출력을 회수하지 못했으므로 성공 exit를 주장하지 않는다. 이후 `npm ls --depth=0`의 exit0과 실제 test/build 실행은 확인했다.

## 브라우저 시나리오

| 묶음 | 수정 전 / 최종 | 확인 |
| --- | --- | --- |
| BR01 저장 shortcut 지연 중 새 날짜 입력 | FAIL / PASS | 제출한 날짜만 저장하고, 이후 입력한 10/08 초안을 덮어쓰지 않음 |
| BR02 A 요청 지연 중 B 상세 열기 | FAIL / PASS | A만 저장하고 B의 10/12 초안·저장값 보존 |
| FG01~08 날짜 fill·키보드·취소·reload | PASS | 문서·기간에서 10/05→10/08, 동일 Item·메모/시간/소속·다른 항목 보존, 동일값/Escape 성공 명령0 |
| FG09~10 기간 5종·원문 복귀 | PASS | 오늘/주간/월간/미정/전체의 예상 포함·제외와 선택 원문 복귀 |
| FG11~15 부분 clipboard·두 Undo 경로 | PASS | 실제 Clipboard API 읽기 확인 뒤 Ctrl+V, 성공 snapshot Undo/Redo, debounce 전 native Ctrl+Z의 저장0 |
| FG16~18 저장 거절·직접 재저장·reload | PASS | 이전 서버 성공값 보존, 초안 유지, 다시 저장 성공 뒤 최신 성공 복원 |
| FG19~20 미정 이동 | PASS | 동일 Item의 실행 날짜만 미정, 시간09:00·메모·원문 위치 유지 |
| FG21 5개 viewport | PASS | 각 화면 가로/대화상자 넘침0, 닫기·적용·미정 버튼 도달 가능 |
| FG22 저장/요청 경계 | PASS | 허용 prefix 밖 set/remove/clear0, 보호 bytes 동일, 공개 원본 불변, 실제 Auth/API 전달0, 오류0 |
| EX01~05 기간 native 키보드·같은 제목 | PASS | B 날짜만10/15→10/16, 같은 제목 A/B의 서로 다른 ID 유지, 정확 B line ID·sourceIndex로 원문 복귀 |
| EX06~10 MD08 세 표현·미정 목록·reload | PASS | 자유 문장은 11/09 상속, `[미정]`은 새 미정 구획, 개별 속성은 원구획을 유지한 미정 |
| EX11 경계 재확인 | PASS | 보호 bytes·공개 원본·요청 전달·오류 다시 확인 |

최종 독립 판정은 앱30 + race2 + 추가11 = **43/43 PASS**다. 추가 검사의 새 context 준비를 위해 앱30을 다시 실행했고 이것은 별도 반복 실행이다. 동일 검사 개수를 고유 판정43에 더하지 않았다.

로컬 증거 root: `output/playwright/feedback-gaps/`. `baseline-races.log`는 0PASS/2FAIL, `final-races.log`는 2PASS/0FAIL, `final-app-verified.log`는 30PASS/0FAIL, `final-extra-verified.log`는 11PASS/0FAIL이다. 추가 검사의 준비 재실행은 `extra-app-prerequisite.log` 30/30이다. 앱 최종 synthetic 성공 명령9·revision9, 거절1·storage call40; 추가 종료 시 성공 명령13·revision13이다. 테스트 context마다 저장 원장이 다르므로 이 수를 서로 합쳐 운영 mutation 수로 해석하지 않는다.

중단 이력은 그대로 보존했다. headed context의 clipboard 읽기 빈 값(`final-app-first.log`: 14PASS 뒤 중단), 잘못된 summary locator(`final-app-headless.log`: 16PASS 뒤 중단), 추가 검사 caret를 이전 줄로 옮긴 harness 오류(`final-extra.log`: 4PASS 뒤 중단)는 제품 결함으로 집계하지 않는다. clipboard 내용 선확인·실제 aria-label selector·정확 target offset을 고친 뒤 새 격리 context에서 재실행했다. 기존 로그를 PASS로 덮어쓰지 않았다. CLI expression syntax 오류는 `.tmp/feedback-gaps/browser-extra-state.log`에 남았으며 제품 명령을 실행하지 않았다.

## 화면·UX 평가

| 크기 | 측정 | 픽셀/조작 평가 |
| --- | --- | --- |
| 390×844 | overflow0, dialog0, 주요 버튼 높이48px | 날짜/시간 세로 배치가 읽히며 버튼 가림 없음. 진행·이동 조작은 dialog 내부 스크롤 필요 |
| 375×812 | overflow0, dialog0, 주요 버튼 높이48px | 작은 폭도 적용/취소 가능; 실제 손가락·키보드 검사는 별도 |
| 844×390 | overflow0, dialog0, 주요 버튼 높이48px | 짧은 가로 창에서 날짜와 바로가기 노출; 아래 진행/연결부는 내부 스크롤로 도달 |
| 1024×768 | overflow0, dialog0, 주요 버튼 높이48px | 모든 측정 대상 도달 가능; 전체 사용 흐름 편의까지 입증한 것은 아님 |
| 1440×900 | overflow0, dialog0, 주요 버튼 높이48px | 제목·날짜 출처·주요 조작이 분리되지만 한 창의 진행/연결/이동 영역은 길고 밀도가 높음 |

캡처 `period-{width}x{height}.png` 5개는 로컬에 보존했다. root는 390·844가로·1440 실제 캡처 픽셀을 직접 검토했고 나머지는 DOM/버튼 hit-test·캡처를 실행했다. 새 버튼·새 모드·두 번째 편집기를 만들지 않고 기존 수정 결과만 보호했다. 긴 dialog의 조작 밀도는 다음 UX 재구성 후보이며 이번 범위에서 임의로 기능을 숨기지 않았다.

## 보호 근거와 미실행

- 최종 실제 브라우저 fixture: `flow:saved-plans`, `flow:completion:v1`, 다른 앱 key의 bytes 동일. 이 값은 **합성 보호 표식**이며 실제 사용자 localStorage를 읽거나 초기화하지 않았다. test bootstrap이 표식을 심은 뒤 제품 set/remove/clear를 추적했다.
- 최초·최종 원문2개 SHA256 동일. 제공 worktree HEAD `df0670f...`·Git clean·build `h6dzC_Ix8aPXcsm-UC-Mb` 동일. manager `13105`의 appStarts2·tunnelStarts1과 3105의 기존 PID26020 유지. 자동시작 manifest SHA256 `B86837A50B64A7D06DF212B3CC9DF40A0F2CC92FBC2ECE195DEA82BDC7A39C52` 동일. PID는 관측값이며 종료 대상으로 사용하지 않았다.
- 제품 runtime은 `ProgramSpace.tsx`만 변경. 기존 `/my`·schema·writer·Auth/API·DB·DNS·Tunnel 수정0, prefix 밖 브라우저 쓰기0, 실제 Auth/API 전달0. 실제 DB 전후 byte 비교는 실행하지 않았으며 ‘운영 DB bytes를 직접 비교했다’고 주장하지 않는다.
- NOT_RUN: 원 PDF/ZIP·11원본 캡처 재열람, 원사용 환경의 동일 원인 확정, native 선택기 popup, 실제 Android Chrome/iOS Safari, OS 한국어 IME, AT, 이번 전체 E2E/CI, 반복 공통/회차·독립 due·실계정 쓰기, 재부팅/절전/장기 통신, 관찰 사용자 시험. native date **키보드 입력**과 실제 Chromium clipboard는 실행했으므로 이 둘을 미실행으로 표시하지 않는다.
- 관찰 사용자0명. commit/push/PR/Preview/Production/DEV 교체0. 이전 PR·CI·배포 근거를 이번 실행 결과로 가져오지 않았다.

## 보고서·문서·마감

읽기용 HTML은 기존 메모·날짜 artifact의 paper/green 스타일을 재사용했다. CLI의 직접 `file:` navigation은 protocol 제한으로 거절돼 `report-open.log`에 남겼다. file 접근 옵션을 풀지 않았으며, 보고서1개만 제공하는 task-owned localhost3118의 지원 HTTP 경로에서 렌더했다. 임의 파일·디렉터리·Auth/API를 제공하는 server는 만들지 않았다.

`output/playwright/feedback-gaps/report-browser.log`의390×844·1440×900 렌더2/2 PASS: overflow0·깨진 이미지0·본문14px 미만0·문서 링크 높이44px·console/page error0. 두 실제 캡처를 root가 직접 확인했다. 모바일에서는 같은 요구 표를 세로 카드로 보이며 desktop은 열 비교를 유지한다. 앱의43판정과 보고서2판정은 별도다.

문서 검사: `npm run docs:check`, 4/4 PASS와16required·local links 검사 성공. 최종 링크 수는 `.tmp/feedback-gaps/docs-closeout.log`를 따른다. scoped closeout reporter는 실행 자체만 exit0이며 권장 검사를 실제 test PASS로 집계하지 않았다. `.tmp/feedback-gaps/closeout-final.log`는 전체변경과scope 일치이고 untracked spec폴더를 묶은20paths; `git status --untracked-files=all`의 실제26소유파일과 구분한다. 실제 diff·신규 테스트·fixture·시나리오·보고서·현재 문서도 별도로 확인했다.

08:29:41 UTC 최종 읽기 확인은 `.tmp/feedback-gaps/protected-closeout.public.json`이다. 자신의 QA3106·보고서3118 리슨 없음, 기존3105/PID26020만 리슨. serving HEAD/build/clean, manager23684·appStarts2·tunnelStarts1, 원문2·manifest SHA가 기준값과 같다. 자신의 현재 CLI browser4개와 앞서 닫은 시험 browser2개만 정리했다. 사용자 브라우저는 닫지 않았다. server 종료의 Ctrl+C exit1은 정상적인 자신의 실행 정리이며 build/test 실패로 세지 않는다. 데이터·소스 삭제0.
