# 새 게시 판본·개발계 반영 QA와 결과 원장

2026-10-04 준비 원장. 사용자 직접 ‘승인!’으로 이번32파일 게시·해당 비공개CI·운영 협업·DEV/자동시작 전환·복귀 범위를 확인했다(`user-20261004-memo-date-gaps-publish-dev`). 현재 새 stage·commit·push·Draft PR·원격 CI·DEV/자동 시작 전환·rollback·앱 재시작은 미실행이다. 실제 명령·판본·receipt·결과와 최종 보고를 이어 기록한다. 별도 `results.md`는 생성하지 않는다. 아래 승인 미응답 기록은 승인 전 준비 이력이다.

## 근거 종류와 기준선

| 근거 종류 | 확인 대상 | 현재 판정 |
| --- | --- | --- |
| current repo | 새 release root `D:/flowme2605/flow-memo-date-gaps-release-20261004`, 인수 HEAD `df0670f8086977d9777952e1e5cafb42096effe8` | clean 생성 후 소유26파일 인수. dirty 준비본이며 게시된 clean HEAD는 아직 없음 |
| current repo / 새 조회 | main `efd8b642707b5c8e67b727f23169ae41c43cb5e8` ancestor, PR211 base 계획 | 08:44:25 fresh fetch에서 main/원격 main 일치·main...HEAD 좌0/우26 확인. PR211 OPEN·DRAFT·head df0670f. 게시 직전 재대조 필요 |
| prior artifact / 현재 제공 기준 | `flow-personal-memo-date-20261004`, HEAD df0670f, build `h6dzC_Ix8aPXcsm-UC-Mb` | 이전 완료 receipt와 직전 후보 QA의 기준. 이번 실제 운영 직전 신원/manifest/port fresh 확인을 대신하지 않음 |
| prior artifact | [직전 후보 QA](../2026-10-04-memo-date-feedback-gaps/qa.md)·[결과](../2026-10-04-memo-date-feedback-gaps/results.md) | 신규31 + 기존181 =212/212, npm2,261 PASS, 통합 typecheck 검사기10/10·588 entry 진단0, build `lPblD_VvlR6bemR8EV0l1`, 합성 앱43/43·보고서2/2. 모두 직전 미커밋 후보의 이력 |
| current repo / local branch | `agent/alpha-memo-date-gaps-release-20261004` | 로컬 생성 확인·인수 HEAD df0670f·stage0. 새 commit/원격 branch/PR은 미실행 |
| assumption / 계획 | PR211 위 새 Draft PR | base/head를 게시 직전에 다시 대조. 새 SHA·BUILD_ID·CI run ID를 예측하지 않음 |

이전 PASS를 새 fresh 명령 결과로 기입하지 않는다. 표적·npm·브라우저·보고서 판정은 검사 종류가 달라 합산하지 않으며, 전체26피드백 해결률이나 관찰 사용자 수로 환산하지 않는다.

## source·Git·checkout 식별

각 allowlist 경로의 source raw SHA256은 원 후보 실제 bytes, Git blob은 attrs/설정에 따른 저장 형태, checkout SHA256은 새 게시 HEAD에서 읽은 실제 bytes를 뜻한다. source SHA와 checkout SHA의 무조건 동일을 가정하거나, 다르다는 이유만으로 정규화라고 덮지 않는다. `git ls-files --eol`·attrs·Git blob/정규화 비교와 원본 SHA를 함께 남겨 승인된 줄끝 변환만 설명한다.

| 식별자 | 새 결과를 기록할 항목 | 상태 |
| --- | --- | --- |
| 인수 source | source root·32path 집합·각 source raw SHA256/길이, 공개 제외 분류 | 인수 감사: 진입점4개를 뺀 후보22파일의 normalized LF/Git blob/EOF 동일 확인. fixture TS는 CRLF 차이뿐이고 진입점4는 의도된 release delta. 32path 정확·stage0·검사한 secret 패턴0. prepare-inventory.local.json에 각 source/release raw SHA·길이·예상 Git blob 기록. 게시 checkout 대조는 NOT_RUN |
| 게시 판본 | commit SHA·branch·base SHA·PR URL·원격 확인 | NOT_RUN |
| Git blob / checkout | 경로별 blob OID·정규화 비교·checkout SHA256/길이·unexpected diff0 | NOT_RUN |
| compile/runtime/QA/static | source inventory·입력 SHA·BUILD_ID·QA bundle/시나리오 SHA·자산 SHA | 새 build `UW5_mgsa6csV02xqUU40h` exit0. QA bundle `46b46737925a94f9830b358741e42901683b73d975b5d196ff76078e05710cc1`·VM selfcheck exit0. 게시 HEAD/static 동일성 후속 대조 |
| 운영 판본 | app root·source SHA·build·manifest SHA·manager generation·native 신원·port·보호 입력 | fresh 대조 NOT_RUN |

## 새 판본의 필수 검사

| 검사 | 실제 새 실행 상태 | 완료 기준 |
| --- | --- | --- |
| docs:check·scope·공개 제외 | 로컬 준비 PASS / 게시 index 검사 NOT_RUN | sync check·4/4·16 required·7739 links·exit0. expanded allowlist32와 실제32 집합 일치·중복0·stage0. stage 직전 공개 제외 재검사 필요 |
| security:audit·출처/카탈로그 경계 | 로컬 audit PASS / 게시 경계 대조 NOT_RUN | vulnerabilities0·compatibility14/14·fail/skip/cancel0·exit0. 실제 공개 index/비공개 입력은 게시 직전 대조 |
| 신규31·관련 통합·npm test | 로컬 준비 PASS | 새6파일40/40(신규31+기존 context9)·일반 npm15 lane 총2261/2261·모든 fail/skip/cancel0·각 exit0. 직전212 전체 묶음을 이번 실행 수로 옮기지 않음 |
| typecheck:integrated-product-poc | 로컬 준비 PASS | 검사기10/10·588 entry·663 source·진단0·실행 중 source 변경0·exit0 |
| production build | 로컬 준비 PASS | fresh build `UW5_mgsa6csV02xqUU40h`·exit0. 정확 source/input/게시 SHA 대조 후속. served root 재build0 |
| 정확 HEAD required CI | NOT_RUN | 같은 commit의 required jobs·run URL·결론. 실패/취소/재시도는 별도 기록 |
| fresh 합성 앱43·5 viewport | 미게시 로컬 build 43/43 PASS / 게시 HEAD 연결 NOT_RUN | 같은 UW5 build에서 앱30·race2·추가11, 각 CLI exit0·failed0. 오류/허용 prefix 밖 쓰기0·실제 Auth/API 전달0. 게시 후 HEAD/build/source/static 핀과 재검사로 연결해야 함 |
| 오프라인 운영 준비 모델 | 11/11 PASS / 실제 controller·native 실행 검사 NOT_RUN | 승인·게시 HEAD·CI 미결 시 live 인계 거절, 모의 신원 경합·PID 재사용·다른generation/owner/root·정리 미확인·실패/취소 방어. 실제 실행 guard 검증과 구분 |
| DEV 전환·rollback·후보 재진입 | NOT_RUN | 각 exact root/build/자산/health/auth 경계·cleanup receipt |
| 자동 시작 앱대상/guard 정렬 | NOT_RUN | 승인된 최소 diff와 fresh generation이 최종 후보를 가리킴. Task 정의·manager·settings/Tunnel 보호 |
| 최소 앱 정상 재시작1회 | NOT_RUN | exact native owner 종료/회복·새 generation/동일 후보·실측 receipt. 실제 재부팅 시험으로 표현하지 않음 |

### 이번 로컬 준비에서 실제 실행한 검사

Node `v24.17.0`·npm `11.13`으로 새 release root의 `npm ci`가 exit0을 반환했다. 164 packages 설치·vulnerabilities0이며 정상 auth-js debug probe postinstall 패치를 유지했다. `npm run security:audit`, 새6파일 표적 검사, `npm test`, `npm run typecheck:integrated-product-poc`, `npm run docs:check`의 결과는 위 표에 기록했다. root 실행 로그를 문서 작성자가 읽기 대조했으며 같은 결과를 새 실행으로 중복 계산하지 않았다.

로컬 전용 근거는 `.tmp/manual-memo-date-gaps-release-20261004/` 아래 `install.log`, `security.log`, `scoped.log`, `npm-test.log`, `types.log`, `docs.log`, `build.log`다. 원 로그는 공개 제외이며 이 경로는 Markdown 링크가 아니다. `git diff --check`는 exit0, LF→CRLF 경고5개만 보고됐다. 줄끝 경고를 source/blob/checkout 인수 대조 완료로 대신하지 않는다.

문서 작성자의 expanded path 대조는 manifest32·중복0·실제 변경32·release 문서6·차집합0을 확인했다. `node scripts/check-docs.mjs`도16 required·7739 links로 통과했다. 최종 문서 수정 후 정상 `npm run docs:check`를 다시 실행해 sync·4/4·16 required·7739 links·exit0을 확인했고 `git diff --check`도 exit0이었다. 이 문서 재검사는 제품 시험 수에 합산하지 않는다.

게시 영향의 새 읽기 확인에서 같은 repo의 Render autoDeploy=`no`·trigger=`off`·preview=`off`, Vercel 프로젝트/API와 Git UI의 repo 연결·deploy hooks0·현재 후보 `vercel.json`의 `git.deploymentEnabled=false`를 확인했다. 설정은 바꾸지 않았다. PR211의 기존 CI4개 SUCCESS는 base 이력이며 새 release HEAD CI가 아니다. 이 조회는 게시 직전 재확인의 필요성을 없애지 않는다.

fresh build는 exit0·BUILD_ID `UW5_mgsa6csV02xqUU40h`로 완료됐다. 같은 새 release build를 제공하는 격리 QA 앱3106이 Ready771ms로 시작됐고 fixture bundle SHA256은 `46b46737925a94f9830b358741e42901683b73d975b5d196ff76078e05710cc1`이다. VM selfcheck는 exit0이다. QA 앱3106의 준비는 실제 DEV 앱3105 전환이 아니다.

새 CLI의 첫 explicit `browser=chromium` 준비는 headless shell1247 미설치로 exit1이며 제품/UI case 실행0이었다(`browser-open.log`). 이미 검증한 default Chrome headless 설정으로 다시 준비해 exit0을 확인했다(`browser-open-chrome.log`). 보안 옵션은 바꾸지 않았고 실패 기록은 보존했다.

새 미게시 로컬 build의 실제 Chrome 검사는 **앱30/30·race2/2·추가11/11 =43/43 PASS**, 각각 exit0이다. app30.log·races2.log·extra11.log의 build는 모두 UW5다. 앱30의 합성 저장9건/revision9·거절1건·storage40호출, 추가11 종료 저장13건/revision13, race는 독립 빈 profile의 저장2건/revision2를 확인했다. actual clipboard bytes+Ctrl+V, document/period native 날짜 키보드·Tab/Enter, 같은 제목의 정확 ID/원문 행·reload, MD08 현행3표현, 거절 후 retry와 새 입력을 보존했다. 보호 표식/공개 원본 동일, 허용 prefix 밖 setItem/removeItem/clear0, 금지 요청0, 실제 Auth/API 전달0, console/page error0이다. 실제 운영 DB 전후 bytes 검사나 게시 HEAD의 CI/QA 완료 근거는 아니다.

390×844·375×812·844×390·1024×768·1440×900의 화면/대화상자 가로 넘침0, 검사한 닫기/적용/미정 버튼 높이48px·hit-test 도달을 확인했다. root가390·844가로·1440 captures를 직접 열어 검토했다. 짧은 가로 화면은 대화상자 내부 스크롤이 필요하고 상세 조작의 밀도는 이전 UX 후속으로 남는다. 자동 viewport/키보드를 실제 OS picker popup·손가락·실기기/IME/AT 시험으로 표현하지 않는다.

로컬 인수 inventory는32/32·원26+문서6·stage0·22파일 normalized/blob 동일을 기록했다. 최초 준비 helper는 status 문자열의 앞 공백을 trim한 오류로 첫 경로를 잘못 해석해 목록 검사를 거절했다(도구 chunk6bdc42, 제품 변경/쓰기0). trimEnd로 고쳐 inventory.log의 새 exit0을 확인했다. 게시 checkout은 여전히 미검사다. 원본 후보나 원본 피드백·제공본을 수정한 실패가 아니다.

이번 마감 읽기에서 현재 manager는23684·제공build h6dz, 제공 root의 HEAD df0670f·Git clean과 startup manifest SHA256 b86837a50b64a7d06df212b3cc9df40a0f2cc92fbc2ece195dea82bdc7a39c52를 다시 확인했다. 신규 QA3106은 DEV3105를 교체하지 않았다. 이 읽기 snapshot만으로 나중 운영 전환의 native 신원 검사를 생략하지 않는다.

로컬 준비 종료: own CLI 두 세션을 정상 close(exit0), own QA3106 실행 세션을 Ctrl+C로 종료(exit1은 정상 teardown)하고 리스너 부재를 확인했다. 기존3105/26020·13105/23684 리스너는 유지됐다. 읽기 확인용 새 Vercel 탭만 닫았고 사용자 앱/탭은 조작하지 않았다. 최종 docs-final.log는4/4·16required·7739links·exit0, diff check exit0, expanded32·stage0이다. 이번 목표는 **로컬 준비·검증 완료, 게시/CI/DEV 전환은 승인 응답 대기·전체 미완료**다. goal 도구는 active이며 완료/paused/blocked로 바꾸지 않았다.

후속 준비에서 ignored 로컬 `ops-preparation/`에 profile·순수 gate·모의 test 3파일을 만들었다. 승인 reference·게시 HEAD·CI·exact/QA·실행 binding은 null이고 clean=false다. 현재 rollback df0670f/h6dz와 로컬 후보 UW5를 구분하며 이전 controller/native는 출처 경로와 SHA만 기록했다. 실제 도구 import/복사/실행, Task·프로세스·manifest·서버 변경은 없었다. 준비 모델은 입력에 권한을 주장해도 ready/liveActionsAllowed=false이고 Check/Preflight/Probe를 포함한 모든 live 인계를 거절한다.

root가 3파일 전체를 읽고 순수 Node 모의 검사 **11/11·fail/skip/cancel0·exit0**을 실행했다(도구 chunk76346f). 별도 읽기 검토도 차단 결함을 찾지 못했다. 이 숫자는 새 제품 검사나 실제 native guard 검증에 합산하지 않는다. 운영 실행 가능한 controller와 신선한 native 신원·exact posted HEAD/CI 연결은 승인 후 별도 검토·검사해야 한다.

같은 후속 준비에서 피드백 세션의 최신 기록과 원본 두 문서 SHA가 앞선 인수 snapshot 그대로임을 확인했다. 현재 제공본 Git clean·HEAD df0670f·status build h6dz, startup manifest SHA b86837a50b64a7d06df212b3cc9df40a0f2cc92fbc2ece195dea82bdc7a39c52가 유지됐다. 리스너는3105/26020·13105/23684이며3106/3107은 없었다. 이는 읽기 snapshot이고 나중 운영 제어의 native 신원 검사를 대신하지 않는다. 구체 승인 응답은 아직 없으며 게시/CI/DEV 항목은 그대로 NOT_RUN이다.

후속 문서 갱신 뒤 정상 docs:check도 sync·4/4·16required·7739links·exit0이었다. 인수 inventory는32/32·원26+준비6·진입점4 delta·나머지22 normalized 동일·stage0을 재확인했고 diff check exit0이었다. 오프라인 준비3파일은 ignored 로컬 근거이므로 공개32경로에 추가하지 않았다. 제품·브라우저 검사를 다시 실행한 결과로 환산하지 않는다.

## 합성 앱43의 새 검사 범위

문서와 기간 상세의 날짜 fill·native 키보드 입력·연속 적용·다시 열기·reload, 같은 제목의 다른 Item과 정확 원문 행, 시간·메모·구획·폴더·진행 기록 보존을 확인한다. 부분 선택 실제 clipboard paste, dirty native Undo의 저장0·저장본 Undo/Redo의 정확 snapshot, 저장 거절·직접 retry·reload, Escape·동일값0명령을 함께 검사한다. 지연 결과의 더 새 날짜 입력/다른 dialog, MD08 자유 문장·명시 미정 구획·개별 미정, 390×844·375×812·844×390·1024×768·1440×900을 새 판본에서 실행한다.

fixture는 새 빈 격리 browser context를 먼저 확인하고 실제 Auth/API를 가로챈다. 고정 localhost GET 자원만 전달하며 이미 사용 중인 profile·cookie·storage·service worker를 받아 초기화하지 않는다. synthetic 보호 표식은 실제 계정 데이터의 byte 비교가 아니다.

## 승인·게시·운영 결과

| 항목 | 현재 상태 | 실제 실행 뒤 남길 근거 |
| --- | --- | --- |
| 승인 질문 | 이번 사용자 직접 ‘승인!’ 확인 | reference user-20261004-memo-date-gaps-publish-dev, allowlist32 게시/해당CI/운영협업/DEV자동시작전환복귀·최소앱재시작1회. 기존 제외 유지 |
| stage / commit / push | 모두 NOT_RUN | 정확32path·hook·SHA·원격 readback |
| 새 Draft PR / CI | 모두 NOT_RUN | PR URL/기준·해당 HEAD required CI |
| 운영 협업 메시지 | 공식 도구 전달 접수 / 준비 결과 대기 | 정확 운영 세션01a10108-d468-7851-a7c9-9a0375dbe158에 새 ops 준비 요청. 실제 제어는 동일HEAD CI/QA 통과 후 별도 실행 인계 |
| DEV / rollback / 최종 인계 | 모두 NOT_RUN | 단계별 guarded receipt·local/external GET |
| 자동 시작 / 정상 앱 재시작 | 모두 NOT_RUN | 최소 manifest diff·generation·회복 receipt |
| main merge / Render·Vercel / Production | 범위 제외 / NOT_RUN | 실행하지 않음 |
| 실제 기기 / IME / AT / 사람 시험 | 범위 제외 / NOT_RUN | 관찰 사용자0명 유지 |

## 한계와 미결

원 PDF/ZIP·원본 캡처는 미열람이다. 원 `10/05→10/08` 재복귀와 이번 guard의 원인 동일성은 미확인이다. native 날짜 선택기 popup·실제 Android/iOS·OS IME·AT·장기 통신·재부팅/절전·실계정 writer/운영 DB byte 비교는 실행하지 않으면 NOT_RUN으로 유지한다. MD08 자유 문장 자동 정책·PC03 반복 공통/회차 메모·PC04 독립 due는 미승인이다. 긴 dialog 조작 밀도 등 [26개 잔여](../2026-10-04-memo-date-feedback-gaps/requirements.md)도 유지한다.

실제 실행 로그·계정·settings·guard 원본·bundle·output·tmp·.next·node_modules는 로컬 전용이다. 공개 원장에는 판본·종류·수·범위·결론만 기록한다. 새 완료 판정은 아직 내리지 않았다.
