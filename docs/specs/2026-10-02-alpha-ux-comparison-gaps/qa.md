# 실제 실행 기록

## 10/3 승인 범위 마감 검증

[사용자의 범위 수정](spec.md#103-승인된-완료-범위-수정)을 명세·계획·체크·마감 판정·상태 진입점·HTML 설명에 반영했다. UX-D01/02는 NOT_RUN 후속이다. 실제 브라우저를 실행하거나 같은 차단 작업을 다른 경로로 대행하지 않았다.

수정 전후 제품5파일·모형 검사 파일6개의 SHA256, HTML 내부 script SHA256 `EA6B7A00A4123CA3FFFE55FE6B9A856EB62A3C369F57EF7ACA8416475D4AAE09`, build `ViQGyXzeL-q-3GEbFJGgZ`와 HEAD `d1cc8dd1cbc1a220054f458aea369393642f71ed`가 모두 같았다. HTML 설명만 변경됐으며 새 전체 HTML SHA256은 `AD694E22CEA6FF82FE86AE4594D70182C56A3929BEBBE4EF929E195B6616CC53`이다. 기존 제품 r6·npm·빌드를 이번 새 실행으로 합산하지 않는다.

| 이번 실제 확인 | 결과와 범위 |
| --- | --- |
| 순수 모형 재검사 | `node --test docs/content-audit/2026-10-02-flowme-ux-comparison-gaps-ko-assets/model.test.cjs`: 48/48 PASS·fail/skip/cancel0·exit0. 정적/순수 상태/저장 대역/VM이며 실제 DOM·렌더 아님 |
| 문서 검사 | `npm.cmd run docs:check`: 회귀4/4·skill-sync·필수16문서·로컬7334링크·exit0. 최종 마감 기록 추가 후 같은 검사를 다시 확인하며 누적8개로 합산하지 않음 |
| 소유·실제 diff | 명시한 exact path로 scoped closeout exit0. modified12/untracked8 묶음을 확장한 기존 소유28파일(제품5·테스트8·문서/HTML15)과 일치. 처음 stem scope의 불완전 목록은 전체 소유 판정에 사용하지 않음. reporter는 테스트 실행/통과 인증이 아님 |
| 독립 감사 | r6 원JSON/첨부30경계·165JSON/80PNG 존재, 최종 npm/빌드 snapshot·현재 제품654파일 drift0,720자산 hash drift0 확인. 추가 필수 구현·제품 QA 잔여 없음. 새 기능 검사 수에 합산하지 않음 |
| 개발계 작업본 보존 | 읽기 Git clean·기존 build `o7dgg9b72_7ai0rqQ5gXU` 유지. 서버 종료·재시작·환경/데이터 수정 없음 |
| Git 형식 검사 | `git diff --check` exit0. 네 기존 문서의 LF→CRLF 경고만 있으며 오류0. stage·commit·push 없음 |

이번 변경은 소유 문서/HTML 설명11파일이다. 새 앱·브라우저·실기기 실행0, 관찰 사용자0명. UX-D01/02 NOT_RUN 후속, 실제 계정/DB/Auth/Tunnel/DNS·서비스 교체·게시/배포0이다. 이전 검사 실패와 미확정 원인은 아래 이력에 보존한다.

## 10/3 기획 인수 검증

UX2의 최신 인수 문서·근거 JSON·현재 소스를 읽었다. 00:55:06 UTC에 JSON이 가리키는24파일의 현재 hash가 사후 스냅샷과 일치함을 확인했다. 문서 보완 전 qa.md hash1개는 비교 대상에서 제외했다. 이24개를 기능 테스트 수나 실행 판본 인증으로 보고하지 않는다. 인수 문서 SHA256은 `ca15c2e6b43a1cbadb5920b0befd4b04142f9b364aa5c4960e9a125b99024e36`, JSON은 `eca887d736f7d99319fd649c56772540ea9c8da1bd27ac4c461e841f2f72ab86`다.

이번 변경은 STATUS·results·tasks·qa·completion-audit의 기획 인수 연결이다. 제품5파일·조작 HTML·모형 검사 파일의 읽기 hash와 후보 build `ViQGyXzeL-q-3GEbFJGgZ`를 기준으로 보존을 확인한다. 기능 실행 PASS/FAIL0/0, 새 HTML 렌더·시안 DOM/클릭·실기기·관찰 사용자 검사0이다. 제품/runtime·계정/DB/Auth/DNS/Tunnel·서비스 변경·게시/배포도 이번 재개에서는 없다. 이전 별도 요청의 alpha 연결 복구를 이 목표의 서비스 변경이나 QA로 합산하지 않는다.

외부 UX2 직전 턴의 서버8/8은 그 세션에서 실행한 검사다. 모형47/47은10/2 이전 기록이며 이번 재실행이 아니다. regular의 대표 이동과 모바일/태블릿 첫 화면 폭 측정은 SR01~05 재현·portable 검사·개발3 별도 HTML 렌더를 통과시킨 근거가 아니다. 자세한 인수 판정은 [현재 결과](results.md#103-기획-인수-후-현재-판정)를 따른다.

독립 읽기 검토도 시안5건을 제품의 새 확정 결함으로 전이할 근거가 없고 두 독립 HTML 검사 잔여가 유지됨을 확인했다. 문서 검사 첫 실행은 회귀4/4 통과 뒤 새 절의 외부 절대 파일 링크2개를 거절했다. 이를 로컬 전용 경로 설명으로 정정하고 다시 실행해 skill-sync·회귀4/4·필수16문서·로컬7317링크 검사 및 exit0을 확인했다. 앞선 검사를 새 실행4개와 합산하지 않는다. 제품5파일·HTML·모형 검사 파일7개의 인수 전후 hash 변경도0이다. scoped closeout은 추천·소유 목록 점검이며 기능/화면 검증을 실행한 도구가 아니다.

## 이전 실제 실행과 수신 이력

2026-10-02. 새 작업본 `flow-ux-comparison-gaps-20261002`, 기준 `d1cc8dd1`. 실제 계정·DB·운영 쓰기는 하지 않는다. 자동검사 표는 현재 실행만 집계하며 과거 QA 수치를 가져오지 않는다. UX2의 후속 원본 QA·기존 캡처 검토는 별도 항목으로 구분한다. 원 로그·화면·JSON은 `output/`의 로컬 전용 근거다.

현재 앱 판정은 [여섯 번째 검사](#여섯-번째-검사--저장-안내-보완-후보-r6)의 **30/30 PASS·터미널 exit 0**다. 빌드는 `ViQGyXzeL-q-3GEbFJGgZ`이며 관련 110개·npm 2,258개·제품 타입·production build를 같은 제품 소스로 확인했다. 이전 r5의 30 PASS와 통합 2,931 PASS는 해당 판본의 근거로 보존하며 합산하지 않는다. 직전 256/4MiB 실행의 2 FAIL·5회 부족 원인은 미확정이다. 아래 이력의 ‘미실행/NOT_RUN/최신’은 해당 시점의 범위다. 새 HTML 렌더·이 세션의 독립 시안 DOM/클릭 NOT_RUN은 현재도 유지한다.

## 현재 수신 — UX2 portable 정적 검토

2026-10-03 KST. `FLOWME-STATIC-REVIEW-20261002-1821UTC`를 수신하고 전체 외부 보고서·현재 portable 소스·제품 대응 코드를 읽었다. [수신 대조](../../content-audit/2026-10-03-flowme-ux2-static-review-followup-ko.md)에 파일 해시·정확한 소스 행·C요구 연결·묶음별 후속을 남겼다. 외부가 보고한 원본 공통5건의 소스 경로를 확인했으며 제품의 동일 결함5건으로 확대하지 않았다. 줄바꿈은 제품에 이미 처리되고, 다른 구조로 구현된 필터·초점/입력 경로와 미반영 가이드를 구분했다.

전달 보고서와 소유 비교 HTML1개·외부 UX2 원본 HTML4개의 읽기 전후 해시는 같다. 제품/원본 수정0·브라우저/기능/AT/IME 실행0·새 기능 PASS/FAIL0/0이다. 기존 모형48/48·제품r6 30/30은 재실행하지 않았다. 해시 일치·소스 경로 확인을 실제 클릭/화면 PASS로 집계하지 않으며 새 HTML/독립 시안의 필수 렌더 잔여는 유지한다.

수신 처리의 문서 변경은 새 대조1개와 기존 요구·UX 검토·계획·체크·QA·결과·STATUS7개, 총8파일이다. scoped closeout reporter는 미추적 명세 폴더를 펼치지 않아2경로만 감지했으며 실제 변경 수로 사용하지 않았다. 새 문서 전체 diff와 기존 파일의 변경 구간을 따로 읽었다. 문서 검사 실행은4/4 PASS·exit0, skill sync와필수16파일/로컬 링크7,307개 검사도 통과했다. 이는 문서 검증이며 새 제품 기능·렌더 PASS가 아니다. 독립 소스 감사에서 후속 제안의 자동 저장을 정책 확정처럼 읽을 수 있는 문장을 제안형으로 바로잡았다.

후속 세 턴의 [최종 차단 감사](completion-audit.md#수신-검토-재개-후-세-턴의-차단-감사)에서 원 도구 응답·현재 해시/build·QA 프로세스 부재와 같은 두 필수 렌더 미실행을 확인했다. 수신 대조의 진전은 보존하고 소유 분류/완료 감사의 정정·읽기를 새 화면 검사로 세지 않는다. 안전한 필수 작업을 소진했고 접근 제한이 남아 goal 도구의blocked 반환을 확인했다. 미완료 체크·원 범위는 유지한다.

## 현재 재개 — 로컬 앱 화면과 거절 원문 확인

2026-10-03 KST. 사용자의 로컬 서버 검사 요청 이후 인앱 브라우저에 열린 `http://127.0.0.1:3105/alpha`를 직접 읽고 로그인 화면을 캡처했다. 화면 아래에는 ‘개발 설정 또는 브라우저 저장소를 확인해 주세요. 서버 연결을 시작하지 않았습니다.’가 표시됐다. 해당 탭에서 수집된 console error/warn은0개이며 로그인·가입·복구 요청이나 개인 자료 편집은 실행하지 않았다. 이는 로그인 화면의 실제 관찰1건이며 앱 동선 전체의 통과나 새 HTML/UX2 시안 렌더를 증명하지 않는다.

현재 제공 작업본은 Git clean·기존 build `o7dgg9b72_7ai0rqQ5gXU`, listener는127.0.0.1:3105/PID17704다. 고정 `/alpha` GET은HTTP200·HTML build 일치지만 공개 설정의 복귀 주소는 `https://alpha.wikiplans.com/auth/callback`이다. 제공 소스의 `isAlphaBrowserOrigin`은 현재 origin과 복귀 주소 origin의 일치를 요구하고, `getAlphaBrowserClient`는 불일치 시 SDK 생성 전에 거절한다. 안내 문구는 여러 초기화 예외를 받는 공통 catch이므로 문구만으로 원인을 단정하지 않았고, 이번 주소 불일치는 공개 설정과 코드로 확인했다. 이 catch는 console에 기록하지 않아 console0도 연결 성공을 증명하지 않는다. 따라서 이 서버의127.0.0.1 주소에서 나온 안내를 브라우저 자동화 차단·서버 종료·새 제품 결함으로 판정하지 않는다. HTTP200을 실제 로그인 사용 가능의 증거로 안내한 설명은 정정한다. 로컬용 합성 시험 설정, 별도3107 검사와 현재 외부 주소용 서버는 서로 다른 근거다.

사용자의 ‘어디에 명시되어 있나’ 질문에 따라 이 세션의 원 실행 로그를 읽었다. `rollout-2026-09-01T19-54-24-01a05c9b-1bdb-7e62-9d10-b29f49c3a54e.jsonl`의 response_item276806은2026-10-02T17:41:50.970Z(2026-10-03 02:41:50 KST)의 실제 도구 거절이다. 별도 요약이나 이 QA 문서를 원 거절 응답으로 취급하지 않는다. 응답에는 다음 문구가 있다.

> The requested URL protocol is not allowed. Allowed protocols: "http:", "https:". The agent must not attempt to achieve the same outcome via workaround, indirect execution, raw CDP or browser commands, alternate browser surfaces, or policy circumvention.

원 응답에는 ‘모든 로컬 HTTP 앱 검사 금지’나 ‘HTTP 미러’라는 개별 문구가 없다. 전자는 근거 없는 확대 설명으로 정정한다. 차단된 원 HTML을 HTTP로 다시 노출하는 행동을 같은 결과를 얻는 우회로 판단한 것은 위 응답에 대한 적용이며, 원문 인용과 구분한다. 정책 설정자나 `file:` 허용 스위치는 확인되지 않았다. 이번에 직접 확인한 기존 HTTP 앱 화면은 별도 허용 대상이며, 같은 원 HTML의 차단을 해소한 증거가 아니다.

위 관찰을 정리한 시점의 goal 반환은active·미완료였다. 원 목표·두 필수 렌더·전체 완료 체크는 유지했다. 관찰과 설명 정정을 실제 새 근거로 기록하되 r6 30개·npm·build·모형48개를 재실행한 결과로 합산하지 않는다. 후속 확인에서 원 HTML·UX2 QA·r6 결과 hash와 후보 build는 그대로이고 실행 중 QA는0개다. 로컬 검사 재개 후 서버 확인, 직접 관찰·원문 추적, 기록 정정에 걸쳐 세 목표 턴 이상 같은 필수 렌더 제한이 남았다. 새 근거가 있었던 턴을 진전 없음으로 바꾸지 않지만 현재 더 진행할 안전한 필수 작업은 없어 goal을blocked로 전환하고 반환을 확인했다. 새 HTML/독립 UX2 DOM·클릭은NOT_RUN, 전체 목표는미완료다. 현재 상태는STATUS의 해당 항목을 따른다.

## 이전 재개 — 원 보고서 직접 접근 재확인

2026-10-03 KST. 같은 전체 목표의 당시 재개 첫 턴이다. 현재 CUA 문서를 다시 읽고 새 보고서의 원 `file:///D:/flowme2605/flow-ux-comparison-gaps-20261002/docs/content-audit/2026-10-02-flowme-ux-comparison-gaps-ko.html`을 인앱 브라우저로 직접 요청했다. 원 실행 로그의 거절 시각은02:41:50 KST다. 앞선02:43 표기는 이 원 응답 시각과 맞지 않아 정정했다. 도구는 `The requested URL protocol is not allowed`와 허용 프로토콜 `http:`/`https:` 및 같은 작업의 우회 금지를 반환했다. HTTP 미러를 그 우회에 포함한 판단과 원 응답의 실제 문구는 위 항목에서 구분했다. 접근 요청1건 거절·새 렌더/조작 검사0건이다. UX2 시안에 같은 거절 요청을 반복하거나 새 화면 PASS로 기록하지 않았다.

주 담당자와 독립 읽기 감사에서 원 명세5조건·대표18군/26피드백·결과/후속을 다시 대조했다. 피드백 `98B6B5267DC982925DB7948DBD7ED52A017AC1E3365246B99FABA547FD78EDC4`, UX2 QA `1D2876331CC332CF78B3A1841070E62F343E17E64B715C633A6CE7F55051573D`, r6 원 JSON `0A6C66FD025163AB11125ABE6D18155CEFD4775574BA2A00A436E26D121A5404`, 수정 HTML `8F2C56239F5F5AD57FFB8A245EC823109C1FBA1B1091155C9EACF97B8A28DB80`, 모형 검사 소스 `6F50B9B89693AABB6943BB88F7A1C9F7B75C99A2481815C1B64DDBDF39AE8F96`는 이전 기록과 같다. 후보 build는 `ViQGyXzeL-q-3GEbFJGgZ`, 제공 작업본은 Git clean·기존 build `o7dgg9b72_7ai0rqQ5gXU`다. 기존 r6 30PASS와 모형48PASS를 이번에 다시 실행한 결과로 합산하지 않는다.

두 필수 렌더 외 새 안전한 필수 작업은 찾지 못했다. 실행 중인 검사 handle에 대한 verified wait도 아니다. 원 목표·완료 조건·게시/운영 제외 범위를 유지하고, 이전 blocked 횟수를 새 재개에 이어 세지 않는다. 이번 첫 턴의 goal은 active·미완료다. 상태 문서 갱신은 새 구현/테스트 진전이 아니다.

02:44 KST 문서 검사4개가 모두 통과했다. 실패·건너뜀·취소는0이고 exit0이다. 스킬 동기화와 필수16파일·로컬7,285링크 검사, `git diff --check`도 통과했다. 이번 편집은 STATUS와 이 QA 두 파일에 한정하며 제품·HTML·검사 소스는 바꾸지 않았다. closeout 보고서는 추적 중인 STATUS만 집계하고 미추적 명세 폴더 안의 QA는 집계하지 않으므로, 실제 편집 파일 수는 보고서의1개가 아닌2개다. 전체 npm·빌드·앱30개를 다시 실행한 결과가 아니다.

### 이번 재개의 세 턴 차단 판정

2026-10-03 02:47 KST. 이번 재개의 첫 턴은 원 보고서 주소의 직접 접근 거절과 최신 요구/근거의 독립 읽기 감사, 두 번째 턴은 파일·빌드·미완료 조건과 실행 중 검사 부재 확인, 세 번째 턴은 동일 근거와 차단의 최종 확인이다. 상태 문서 수정과 끝난 검사 결과 읽기를 새 구현/필수 검사 진전으로 세지 않는다. 세 턴 모두 같은 필수 화면 접근 제한이 남았으며 이전 재개의 blocked 횟수는 합산하지 않는다.

최종 읽기에서 HTML·모형 검사·피드백·UX2 QA·r6 결과 hash와 후보 build는 위 기록과 같았다. 해당 QA 프로세스는0개이고 기존 r6 실행은 종료됐으므로 verified wait가 아니다. 제공 작업본은 Git clean·기존 build를 유지했다. 독립 감사에서도 두 필수 렌더 외 새 안전한 필수 작업은 찾지 못했다. 같은 전체 goal을 `blocked`로 전환했고 도구의 반환 상태를 확인했다. 전체 완료 조건과 두 미완료 체크는 유지한다. 단순 추가 승인이나 HTTP 미러·대체 브라우저·간접 실행으로 우회하지 않고, 허용된 접근 환경이 실제로 바뀐 뒤 남은 검사를 재개한다. 후속 UX-N1 구현이나 정책 선택으로 현재 완료 기준을 대체하지 않는다.

## 허용된 정적·모형 검사 재개

2026-10-03 01:38 KST 기록. 사용자의 ‘가능한 방법으로 진행해줘’에 따라 기존 `model.test.cjs`를 Node로 실행했다. **42/42 PASS·fail/skip/cancel0·exit0**, 정적8·순수 상태15·저장8·VM UI11이다. 재실행한 같은42개이며 과거 검사와 합산하지 않는다. 이 실행은 브라우저나 HTML 렌더러를 시작하지 않았고 수작업 DOM 대역의 이벤트/모형만 확인했다.

검사 대상 HTML SHA-256 `0EE365B57DC20345DB4F632D559E85F791EBB908ED0D11885EDA227D7D18D11E`, 검사 소스 SHA-256 `88308D6DAFCCF6C3EEF92AF936DB7A6FB74E24366C77BF19D0237B58F42C4C8F`다. 실제 파일 저장소·계정·DB에 쓰지 않았고 전용 key/보호 sentinel 검사는 합성 Map에 대한 근거다. 원 피드백과 UX2 QA hash도 직전과 같다.

실제 새 HTML 렌더·이 세션의 독립 UX2 DOM/클릭은 계속 **NOT_RUN**이다. 이번 재개 요청을 완료 기준 축소 승인으로 해석하지 않았으며, HTTP 미러·다른 브라우저·간접 렌더를 실행하지 않았다. 목표는 재개된 active·미완료 상태이고 이전 blocked 감사는 해당 시점의 이력이다. 기존 앱30PASS·npm2258PASS·build를 이번에 다시 실행했다고 표현하지 않는다.

### 재개 중 발견한 모형 저장 경계 결함

2026-10-03 01:45 KST 기록. 독립 코드 검토에서 허용된 2,000자 제어문자가 JSON에서는 최대 6배로 커지는 문제를 찾았다. 기존 `parse`의 18,000자 한도는 정상 상태를 거절하지만 writer는 그 상태를 저장할 수 있었다. 그 결과 성공·확정 거절·두 결과 불명 상태를 다시 읽을 때 잠겼다. 실제 제품/계정의 결함이나 브라우저에서 관찰한 문제로 판정하지 않는다.

회귀6개를 추가한 뒤 주 담당자가 직접 **48실행 / 43PASS / 5FAIL·exit1**을 확인했다. 기존42개와 새 초대형 payload 거절1개는 통과했고, 정상 본문을 성공·확정 거절·unknown-before·unknown-after로 보관/다시 읽는4개와 VM 저장→재열기1개가 실패했다. 원 실패는 `parse`의 null 반환과 재열기 잠금이다.

HTML 모형에 `MAX_TEXT * 6 * 4 + 2048 = 50,048`자의 직렬화 한도를 적용했다. 본문은 ack·remote·input·pending 또는 rejected의 최대4개이며 나머지 필드는 기존 계약으로 제한돼 있다. 2,000자 입력·소유자·schema·요청 identity는 바꾸지 않았고, writer도 쓰기 전 동일한 `parse(raw)`를 통과해야 한다. 크기 제한을 없애거나 실제 앱 저장 한도를 늘린 변경이 아니다.

수정 뒤 같은 Node 검사 **48/48 PASS·fail/skip/cancel0·exit0**다. 새6개는 정상 제어문자의 네 결과 상태 round-trip/전용 key 재진입, VM 저장→재열기, 100,000자 여백을 붙인 정상 JSON의 거절/0쓰기를 검사한다. 같은48개 red→green이며 43+48로 합산하지 않는다. 전용 key밖 쓰기·remove/clear0과 보호 sentinel 불변은 합성 Map의 근거다. 실제 localStorage·앱·계정·DB는 접근하지 않았다.

수정 후 HTML SHA-256 `8F2C56239F5F5AD57FFB8A245EC823109C1FBA1B1091155C9EACF97B8A28DB80`, 검사 소스 SHA-256 `6F50B9B89693AABB6943BB88F7A1C9F7B75C99A2481815C1B64DDBDF39AE8F96`. 위 최초42개 실행의 hash는 수정 전 이력이다. 실제 렌더·독립 UX2 DOM/클릭은 여전히 NOT_RUN이며 현재 앱 빌드/30개 화면 검사를 새로 실행하거나 완료 조건을 축소하지 않았다. 같은 목표는 active·미완료다.

독립 후속 검토에서 최대 카운터·ID를 넣은 네 상태의 순수 Node 진단은 모두 재해석됐고, 최대 직렬화48,395자·본문 외395자로 한도 이내였다. 이 진단을 회귀48개에 추가 합산하지 않는다. 같은 전용 key·소유자·결과 불명 계약과 렌더 미실행 표기는 유지됐다. 관계가 HTML 모형→검사 파일로 명확해 별도 관계 지도 도구는 실행하지 않았다.

01:48 KST 마감 점검은 문서4/4·skill sync·필수16파일/로컬7,281링크 PASS·exit0, `git diff --check` exit0이다. scope reporter는 modified1/untracked3 경로를 표시하지만 untracked 폴더 안 실제 파일 개수나 검사 통과를 인증하지 않는다. 이번 재개에서 편집한7파일(HTML·검사·STATUS·QA·results·tasks·completion-audit)은 직접 읽어 확인했으며 이전 소유27파일 안의 변경이다. 앱 코드를 바꾸지 않아 npm/제품 build/앱 브라우저를 다시 실행하지 않았다. 제공 작업본 Git clean·기존 build와 원 피드백/UX2 QA hash 불변을 읽기로 확인했다. 소스·계정·운영 자료 삭제나 게시/서비스 교체는 없다.

### 허용 검사 후 현재 차단 상태

01:55 KST 현재 확인에서 r6/수정HTML/검사/피드백/UX2 QA hash와 후보 build는 그대로다. 직전 턴의 읽기 전용 제품654파일 snapshot도 최종 검증 build와 일치했다. 원 명세5조건의 독립 감사는 두 필수 렌더 외에 빠진 필수 구현을 찾지 못했다. 이번 재개 세 턴에 같은 제한이 남았고 현재 실행 중인 필수 화면 검사를 기다리는 상태도 아니므로 전체 goal은 blocked·미완료다. 첫 턴의48검사 red→green 진전은 보존한다. 후속 상태 문서나 기존 결과 읽기를 새 구현/검사 실행으로 합산하지 않는다. [세 턴 차단 감사와 재개 조건](completion-audit.md#허용-검사-재개-후-세-턴의-차단-감사)을 따른다. 실제 HTML/독립 UX2 DOM·클릭 NOT_RUN과 원 완료 조건을 유지한다.

## 판정 기준

사용자 담당자의 새 3107 실행을 독립 확인한 뒤 r6 검사를 마쳤다. 이후 blocked 판정과 최신 정적·모형 재개를 구분하며 현재 상태는 위 재개 기록과 [STATUS](../../STATUS.md)를 따른다. 아래 실패 이력을 삭제하거나 전체 목표 완료로 바꾸지 않는다. 새 HTML/독립 시안의 필수 화면 근거는 여전히 미실행이다. [최종 차단 감사](completion-audit.md#r6와-후속-범위-확정-후-렌더-차단-감사)에서 당시 세 턴의 진전과 반복된 차단을 구분한다. 상태 문서 변경은 새 앱 검사 실행으로 세지 않는다.

- 구현: 실제 client/controller와 컴포넌트 연결을 검사한다. 수락 mock만으로 controller 지원을 인정하지 않는다.
- 데이터: 같은 Item/사본/초안 identity, 원문·원판·다른 필드 보존, 거절·취소의 mutation0을 확인한다.
- 결과: 명확한 거절과 결과 불명을 구별한다. 결과 불명은 원 요청 확인만 허용하며 새 저장/게시로 처리하지 않는다.
- 조작: 현재 화면에서 다음 행동과 결과를 확인한다. 클릭 전 중심점 hit-test로 핵심 행동의 가림을 검사한다. UC5는 실제 버튼 focus+Enter 경로다.
- 화면: 390×844, 375×812, 844×390, 1024×768, 1440×900. 최종 페이지 가로 넘침≤1px, page error0, 허용하지 않은 console error0. 이는 좁은 대표 동선 검사이며 앱 전체 접근성 인증은 아니다.
- HTTP 앱은 실제 HTML/JS/CSS를 읽는다. Auth/API는 deny-by-default 합성 응답으로 처리하며 실제 Auth/API 전달0, 실제 계정 mutation0이다. 받아온 JS/CSS는 해당 판본 `.next/static`의 SHA-256과 맞춘다.
- UX2 시안·새 HTML의 코드/VM 검사를 실제 렌더/실기기/관찰 사용자 검사로 합산하지 않는다.

## 자동 검사

| 실행 | 실제 결과 | 근거 / 범위 |
| --- | --- | --- |
| SR01 최초 순수 모델 재현 | 1실행 / 1실패 | 확정 거절 뒤 corrected participation-save가 `unresolved`. 거절의 account/public mutation0 |
| 수정 후 새 회귀+관련 6파일 | 79/79 PASS | 신규17+기존62. target·CAS·세션·unknown ACK·replay·복구 저장 실패·no-op 보호. 구현 담당자의 실제 실행 |
| AlphaWorkspace 실제 JSX/callback 검사 | 66/66 PASS | 이번 신규 SRUI01~03 포함. 기존 pending/external/native/private 보호 회귀 |
| `npm test` 기록 실행 | 2,258/2,258 PASS | `output/integrated-product-poc/npm-test-2026-10-02T07-04-38-106Z.json`; fail/skip/cancel0, source drift0 |
| 최초 전체 통합 검사 | 2,902실행 / 2,804PASS / 98FAIL | private catalog pack 경로가 없어89건 ENOENT·4건 파생 invalid·4건 file-level failure·1건503이 발생. source drift0. 원 JSON/log 보존. 누락 환경과 제품 실패를 구분 |
| pack 읽기 전용 전체 통합 재검사 | 279파일 / 2,921/2,921 PASS | `new-tests-2026-10-02T07-18-15-427Z.public.json`; fail/skip/cancel0, source654/drift0. 기존 승인 pack을 읽기만 했으며 hash 불변, credentials 전달0·settings 복사0. raw private output 보존/게시0 |
| 표적 타입 | 579 entry / 진단0 | `targeted-types.json`; source654, drift0. 신규 초안 회귀 포함 |
| 확장 브라우저/fixture 타입 | 3 entry / 진단0 | browser.ts·fixture.ts·next-env.d.ts와 import를 저장 없이 검사. 제품 타입579와 별도이며3을 요구/시나리오 수에 더하지 않음 |
| 최종 기록 build | exit0 / drift0 | `build-2026-10-02T07-05-25-003Z.json`. 공개 dummy key로 합성 QA 번들 생성. DB 요청/로그인 없음 |
| 준비용 npm/build | 각각 exit0 | 로그 집계 없는 첫 npm 실행은 위 2,258과 중복 합산하지 않음. 준비 build와 최종 기록 build를 구별 |
| 독립 변경 검토 | P0/P1/P2 발견0 | 정적 source trace·diff 검토. 실행 QA/보안 인증 아님 |
| 최초 HTML 정적/순수/저장/VM UI | 42/42 PASS | 수정 전 정적8·state15·storage8·VM UI11. 실제 브라우저 렌더가 아님 |
| 재개 후 HTML 저장 경계 보완 | 48실행/43PASS/5FAIL → 수정 후48/48 PASS | 기존42+새6. 정상2,000자 제어문자/네 결과 상태/재열기·초대형 정상 JSON 거절. 브라우저·실제 localStorage 검사가 아님 |
| 최초 문서 검사 | 4/4 PASS | Dots 대조 추가 전 정상 |
| Dots 추가 직후 문서 검사 | validator4/4 PASS / 실제 link검사 FAIL | 새 보고서의 상대 code link13개에 줄 번호를 붙여 file로 해석됐음. 보고서 링크만 바로잡고 재검사. 문서 gate를 변경하지 않음 |
| 최종 문서 재검사 | 4/4 PASS / 실제 link검사 PASS | Dots 대조와 결과 문서 반영 후 정상. 최초 link 실패는 별도 보존 |
| 의존성 read-only audit | 취약점0 / 호환성4/4 PASS | `audit-2026-10-02T07-22-27-782Z.json`; drift0 |

검사 실행 수와 제품 요구 충족 수는 다른 값이다. 18개 대표 요구군/26개 피드백 전체가 통과했다는 뜻이 아니다.

## 현재 개발계 브라우저 — 수정 전 기준

대상은 실제 `https://alpha.wikiplans.com/alpha`의 동결 판본 `o7dgg9b72_7ai0rqQ5gXU`다. 앱/static GET만 허용하고 모든 Auth/API는 합성 서버다. 실제 자료를 새로 만들거나 수정하지 않았다.

| 실행 label | 결과 | 실패 해석 |
| --- | --- | --- |
| `baseline` / UC3 단일 | 0PASS / 1FAIL | 테스트 진입 버튼 이름 오류. 제품 결함으로 세지 않음 |
| `baseline-driver2` / UC3 단일 | 0PASS / 1FAIL | textarea label locator 오류. 화면에 입력은 남아 있음. 제품 retry 완료/실패 판정과 구별 |
| `baseline-driver3` / UC3 단일 | 0PASS / 1FAIL | 실제 제품 red: 명확한 거절에 ‘다른 기기 변경과 입력 보호’가 보임. 거절 당시 account/ledger 변화0·입력 보존 확인 |
| `baseline-journeys` / 3경로×5크기 | 5PASS / 10FAIL | UC2 통과. UC1 다중 status locator, UC4 합성 fixture의 허용 read query 누락. 자동화 결함이며 우회/guard 제거 없이 수정 |
| `baseline-journeys-driver2` / 3경로×5크기 | 10PASS / 5FAIL | UC2/UC4 통과. UC1은 reload 후 기간 탭 복원을 기대한 테스트 가정. 현재 저장 데이터 복원과 선택 탭 복원 계약을 구별 |
| `baseline-journeys-driver3` / 3경로×5크기 | 15/15 PASS | UC1 reload 뒤 기간을 다시 열어 같은 Item/메모 보존 확인. UC2 사본 생성. UC4 추가 입력 보존·동일 요청 receipt 확인 |
| `baseline-copy-execution` / UC2×5크기 | 5/5 PASS | 공개 원판→개인 사본→완료까지 확장. 원판과 사본 source identity 불변 확인. 이전UC2 재실행이며 유일 동선 수로 중복 합산하지 않음 |
| `baseline-r05-20261002a` / UC6 선택 | 실제 시나리오0 / 실행 실패 | full title 정규식에 `^UC6`를 사용해 선택0건. 결과 파일 보존. 기능 실패로 세지 않음 |
| `baseline-r05-20261002b` / UC6×5 | 0PASS / 5FAIL | 합성 문서 제목에도 검색어가 있어 문서명 검색으로 추가 Item이 매칭됨. 현 검색 계약에 맞춰 seed를 수정. 제품 오류로 판정하지 않음 |
| `baseline-r05-20261002c` / UC6×5 | 0PASS / 5FAIL | 시간 입력의 실제 접근 이름과 exact locator가 달랐음. 실제 화면을 확인해 selector만 보완 |
| `baseline-r05-20261002d` / UC6×5 | 5/5 PASS | 조회 교차·필터 해제0쓰기·구획/개별 날짜·미정 시간 유지·직접 삭제·identity/reload. 마지막 개별 예외의 날짜/시간 재검증을 추가한 다음 실행과 구분 |
| `baseline-r05-20261002e` / UC6×5 | 5/5 PASS | 최종 개별 예외10/9·11:20과 다른 inherited Item10/3을 다시 검사.38.2초·fail/skip/retry0. d와 같은 경로 재검사라 유일 수를 늘리지 않음 |
| `baseline-authored-versioned-20261002a` | 시나리오0 / 실행 전 실패 | Windows command wrapper가 regex의 `\|`를 해석. 결과 JSON 없음. 설치된 실행기를 직접 사용하고 `UC[12]`로 선택. 정책 차단 우회가 아님 |
| `baseline-authored-versioned-20261002b` / 확장 UC1·UC2×5 | 10/10 PASS | 신규 할 일→날짜/시간→완료→원문 행/초점 복귀→reload. 이전v1 선택→TXT/정확 판본 복귀→목록 이탈0쓰기→v1사본 완료. 두 public 판본 전체 불변 |

원 실패 JSON을 덮지 않았다. label별 `output/playwright/ux-comparison-<label>/results.json` 및 artifacts에 남겼다. 보완된 최종 실행과 초기 실패를 합쳐 유일 시나리오 수로 부풀리지 않는다.

Cloudflare의 SRI telemetry script는 합성 네트워크 경계에서 빈 응답으로 처리한다. 해당 script의 예상 SRI console error는 문서 로드당1건으로 별도 집계한다. 이를 전체 console error0으로 보고하지 않으며 analytics 검증도 아니다. 다른 console error/page error는0이어야 한다.

주 담당자가 UC1·완료 확장 UC2·UC4의 최종 캡처15장(각5크기)을 직접 확인했다. 새 실행으로 합산하지 않는다. 375px 탭 줄바꿈, 짧은 가로 화면의 스크롤, 복구 패널과 본문의 거리, 원 요청 확인 후 추가 미저장 입력의 상태 표현은 [UX 추가 검토](ux-review.md)에 남겼다. 가로 넘침/데이터 검사 PASS를 화면 밀도·발견성·상태 이해의 완료 판정으로 쓰지 않는다.

새 보강 결과는 원래15+5와 합산해 유일 동선을 늘리지 않는다. 최신 기준판의 서로 다른 경로는 확장 UC1·확장 UC2·기존 UC4·추가 UC6의4경로×5크기다. 보강15건 모두 실제 Auth/API 전달0, sentinel 불변, asset24개 hash drift0, overflow0, fail/skip/retry0이다. 각 최종 reporter를 직접 읽었으며 원문 복귀 가로 화면·이전 공개 판본 큰 화면·미정 시간 보존390px의 새 캡처3장도 직접 확인했다. UC6 최종 추가 단언은 e의5/5로 확인했고 d의 최초 통과와 구별한다. 독립 감사에서도15개 reporter·24개 자산·경계·public hash·허용 field를 읽어 실제 전달 경로0과 기존 assertion 약화가 없음을 확인했다. 합성 저장 수는 UC1=4·UC2=2·UC6=3이며 실제 계정 변경 수가 아니다.

## 최초 후보 브라우저 준비 이력 — r1 실행 전

`tests/e2e/ux-comparison-gaps.config.ts`는 서버를 자동 실행하지 않는다. 이번 도구가 새 시험 서버 시작을 정책상 거절했으므로 다른 shell·앱 창·helper로 우회하지 않았다. 3105 서비스는 계속 제공 중이다.

이 최초 준비 시점에는3107 시작을 사용자에게 요청했고30개가 모두 NOT_RUN이었다. Ready 후 build ID/HTTP 상태를 읽기로 확인하고 `FLOWME_CLOUDFLARE_QA_MODE=local`에서 확장 UC1~5와 추가 UC6×5크기를 수행하도록 준비했다. UC3 수정→자동 재보관과 UC5 동일 입력→키보드 직접 재시도를 분리하며 이후r1~r4와 이전 판본의 실제 실행은 아래 기록을 따른다.

새 서버 실행 안내는 채팅에 제공했다. 환경은 `FLOWME_ALPHA_ENABLED=development-only`, Supabase URL의 실제 공개 project host + `fixture-publishable-key`, Google auth false다. 실제 계정으로 로그인하지 않으며 `.env`/로컬 계정 비밀번호 파일을 복사하지 않는다. 시작 후에도 실 Auth/API는 fixture가 처리한다.

후보 검사 실행에는 `FLOWME_CLOUDFLARE_QA_MODE=local`과 `FLOWME_CLOUDFLARE_QA_LOCAL_PORT=3107`을 함께 지정한다. 공유 fixture의 기본3106을 새 후보로 오인하지 않는다. 등록 설명을 포함한 최신 `BUILD_ID=uk3lDCe15ZBcBMDTakvs7`와 자산 hash가 먼저 맞아야 한다. 이전 `QPmwH8VUzqedJwExucc5A`는 등록 설명 추가 전 검사 기록이며 현재 후보로 사용하지 않는다.

## 후보3107 재개와 실행 설정 교정

사용자의 Ready 확인·‘재개해’ 이후3107/PID9580의 HTTP200과 HTML의 build `uk3lDCe15ZBcBMDTakvs7`, 참조 static25개가 로컬에 존재함을 확인했다. `candidate-r1`으로30개 검사를 시작했으나 UC1·UC2(390×844)가 각각 로그인 이메일 필드를 기다리다60초 timeout FAIL했다. 실제 캡처는 ‘개발계 연결이 꺼져 있습니다’다. 검사 handle86521을 Ctrl+C로 중단했고 exit1을 확인했다. 완료된2개는2FAIL, 나머지28개는 중단 포함 최종 판정 없음이며 JSON reporter는 생성되지 않았다. 실패 캡처/문맥은 `output/playwright/ux-comparison-candidate-r1/artifacts/`에 보존한다. 제품 기능30개를 실행/통과했다고 기록하지 않는다.

에이전트의 앞선 수동 실행 안내에 `NEXT_PUBLIC_SUPABASE_*`를 넣고 실제 runtime의 `FLOWME_ALPHA_STAGE/PROJECT_REF/SUPABASE_URL/PUBLISHABLE_KEY/REDIRECT_URL`와 hosted trial 값이 빠져 있었다. `app/alpha/page.tsx`는 force-dynamic이고 `readAlphaAuthConfig`는 `FLOWME_ALPHA_*`만 읽는다. HTTP200과 build 일치는 충분한 로그인 준비 증거가 아니었다. 사용자 입력이나 제품 여정의 결함으로 분류하지 않으며, 실제 Supabase 설정·계정·DB를 변경하거나 앱을 재빌드하지 않는다.

실행 중인 **3107 시험 서버의 PowerShell**에서 Ctrl+C로 그 서버만 종료하고 아래를 같은 창에서 실행한다. 기존3105나 다른 서버는 종료하지 않는다. 공개 host와 합성 키만 사용하며 실제 signing/catalog/계정 설정은 복사하지 않는다.

```powershell
Set-Location 'D:\flowme2605\flow-ux-comparison-gaps-20261002'
$env:VERCEL_ENV='preview'
$env:FLOWME_ALPHA_ENABLED='development-only'
$env:FLOWME_ALPHA_STAGE='preview'
$env:FLOWME_ALPHA_PROJECT_REF='wkmzcxpnojobxrgebapw'
$env:FLOWME_ALPHA_SUPABASE_URL='https://wkmzcxpnojobxrgebapw.supabase.co'
$env:FLOWME_ALPHA_PUBLISHABLE_KEY='sb_publishable_synthetic_release'
$env:FLOWME_ALPHA_REDIRECT_URL='https://alpha.wikiplans.com/auth/callback'
$env:FLOWME_ALPHA_HOSTING='cloudflare-laptop-v1'
$env:FLOWME_ALPHA_TUNNEL_ORIGIN='https://alpha.wikiplans.com'
$env:FLOWME_ALPHA_M3_CAPACITY='on-demand-v1'
npm.cmd run start -- --hostname 127.0.0.1 --port 3107
```

재실행의 fail-closed 보강: candidate label은 명시 local3107이 아니면 config 단계에서 거절한다. beforeAll에서 고정 문서 GET(redirect 금지)만 읽어 현재 build·`sb_publishable_synthetic_release`·비활성 화면 없음을 기존 순수 guard와 같은 기준으로 검사한다. UC4의 `lookups.every`만으로 빈 조회 목록을 통과시키지 않고 실제 조회1건 이상도 확인한다. 후속 실제 실행/타입 검사는 결과가 생긴 뒤 별도로 기록한다. 서버 재시작 도구 거절은 다른 shell/helper로 우회하지 않는다.

보강 검사 이력: 기존 순수 사전 검사/보고 guard10/10 PASS. candidate의 포트 누락·3106·remote mode 세 negative config는3/3 거절됐고, 명시 local3107에서는30개가 목록화됐다. 목록화는 브라우저 실행이 아니다. 최초 `.mjs` 재사용 import에서 타입7016과 Playwright의 `import.meta` 로더 오류가 발생했다. 임시 타입 선언으로 타입만 통과시켰으나 로더 문제는 남아, 해당 import와 이번에 만든 임시 선언을 제거하고 동일한 세 조건을 beforeAll의 boolean 단언으로 적용했다. 서버 HTML/설정값을 실패 로그에 통째로 남기지 않는다. 최종 browser/fixture 타입3entry는2026-10-02T10:35:32.098Z 진단0이다.

현재 비활성 서버를 대상으로 `candidate-preflight-r2`의 UC1/390×844 한 항목만 진단 실행했다. beforeAll에서 합성 키 없음이 즉시 거절됐고 제품 본문은0ms로 실행되지 않았다. 실제 reporter는 expected0/unexpected1/skipped0/flaky0, duration1160.48ms, 프로세스exit1이다. 이는 후보 여정1PASS가 아니라 준비 실패1건이다. Windows Node24.17.0 종료 과정의 `UV_HANDLE_CLOSING` assertion 메시지도 함께 보존하며 제품 page error로 분류하지 않는다. 원결과는 `output/playwright/ux-comparison-candidate-preflight-r2/results.json`과 같은 폴더 artifacts다. 수정 환경으로 재시작하기 전에는30개 전체를 다시 돌리지 않는다.

## 두 번째 재개 — 후보 설치 상태 교정

사용자의 ‘됐데’ 뒤3107/PID20376은 HTTP200, build `uk3lDCe15ZBcBMDTakvs7`, 합성 publishable key, 비활성 gate 없음으로 확인됐다. `candidate-r3`은2026-10-02T11:39:54.499Z에 시작해197872.565ms 동안 UC1~UC6×다섯 크기30개를 실행했다. reporter는 expected0/unexpected30/skipped0/flaky0이고 프로세스exit1이다. 전부 최종 `Outside-prefix storage calls` 경계에서 FAIL했다. 결과는 로컬 `output/playwright/ux-comparison-candidate-r3/results.json`과 artifacts에 보존한다. 이 실패는 r1/r2의 로그인 준비 실패와 다르다.

실제 설치된 auth-js 2.116.0의 deprecated lock-debug initializer가 custom storage와 무관하게 `globalThis.localStorage`의 무작위 `lswt-*` 키를 set/remove했다. 기존 [M2 조사/보정 기록](../2026-09-12-flowme-integrated-product-poc-program/alpha-m2-auth.md#검증-중-발견수정한-결함)과 같은 원인이다. 후보 ESM/CJS `locks.js`와 build chunk에는 active initializer가 남았고 frozen live dependency/번들에는 기존 보정이 적용돼 있다. postinstall이 생략됐는지 이후 덮였는지는 확정하지 못했다. 임시 키가 지워져도 prefix 밖 호출0 경계를 충족하지 못하며, 검사 예외나 전역 Storage monkeypatch를 추가하지 않는다.

후보 dependency의 ancestor/realpath와 두 파일의 hardlink 목록이 후보 내부만 가리키는 것을 독립 읽기 감사와 주 담당자의 `fsutil hardlink list`로 확인했다. 기존 `npm.cmd run postinstall`을 실행해 정확한 pinned initializer와 두 생성 파일만 보정했다. 보정 후 ESM hash는 `eb920902ad614aa82c1739d6d4faba556bd40c9cacc10aaeff9082337fe471bd`, CJS는 `4faa9193268643b61eebb622027b204c149e3a591ab9686f84fa3583f2fccfeb`이며 frozen의 기존 보정과 일치한다. 앱 source·저장 key/schema·로그인 정책·lock/세션 알고리즘·dependency 버전은 변경하지 않았다.

주 담당자의 최초 호환 검사2개는1PASS/1FAIL, postinstall 후 동일2/2 PASS다. `npm.cmd run test:alpha-auth`는 순수/정적27개와 호환2개, 총29/29 PASS·fail/skip/cancel0이다. 단독2개와29개를 유일 검사 수로 합산하지 않는다. 실제 Supabase/Auth/DB 요청은 이 검사에서 실행하지 않았다. SDK source·공식 changelog와 초기화 문서도 읽었으며 이 작업에 적용할 새 migration/인증 정책은 없다.

r3의 경계 실패는 sentinel byte 비교 및 `release-boundary`/정확 자산 확인보다 먼저 발생했다. 따라서 r3의 운영 데이터 불변·최종 console/overflow·자산 검증을 전체 PASS로 보고하지 않는다. 모든 UC6 세부 동작도 후속 재검사에서 다시 확인한다. 기능 단언 또는 캡처 생성이 최종 PASS를 대신하지 않는다.

등록 메뉴의 r3 캡처5장은 독립 시각 감사가 모두 읽었고 주 담당자는390×844/844×390도 직접 확인했다. 문구의 가로 잘림은 없으나 모바일의 어절 분리와 메뉴 밀도는 남는다. fullPage PNG 높이는928/980/560/923/923px로 지정 viewport보다 커 메뉴 하단이 최초 화면 안에 들어간다는 근거가 아니다. 다음 UC1에는 fullPage=false 캡처, enabled 메뉴 버튼의 실제 Tab 순회·포커스·viewport/hit-test 및 무활성화 검사를 추가했다. 최종 브라우저 타입3entry는11:52:45.567Z 진단0이며 이 보강은 아직 실제 재실행 전이다. `lswt-` helper 토큰 자체는 보정 후에도 남을 수 있어 active initializer와 실제 호출을 검사한다.

이어진 독립 읽기 검토에서 복귀·가림·포커스 표시의 검사 공백을 찾았다. Escape 뒤 원문 값/무저장은 검사했지만 실제 textarea 초점·선택 위치 복귀를 확인하지 않았고, 중심 한 점의 hit-test만으로는 dialog scrollport/고정 header의 일부 가림을 놓칠 수 있었다. 기존 native `focus(undefined)`의 기억된 selection 복귀 계약에 맞춰 메뉴 직전 start/end/direction과 Escape 후 값·초점을 비교하고, Tab 순회마다 중심·상하좌우 변 중점의 5점을 검사하도록 UC1을 보강했다. 각 Tab 뒤 `:focus-visible`·outline 스타일/양의 너비를 확인하고 색도 기록한다. 이는 CSS 포커스 표시의 적용 검사이며 색 대비나 전체 outline의 픽셀 가시성을 증명하지 않는다. 첨부에 `sampledOcclusionPoints:5`를 명시하며 모든 픽셀·접근성 전체 검증으로 확대하지 않는다. 이 seed의 메뉴 버튼은 모두 enabled이므로 disabled 건너뛰기를 실제 검증했다는 주장도 하지 않는다. 최종12:08:26.677Z 타입3entry 진단0이며 제품 코드나 검사 개수는 늘리지 않았다. 새 단언의 브라우저 실행은 NOT_RUN이다.

후보 재빌드/새30개 검사는 아직 미실행이다. 사용자에게3107 시험 서버만 Ctrl+C로 종료하도록 요청했고 제공 중인3105는 유지한다. 후보의 이전 생성 build/cache를 필요 시 정확한 후보 내부 경로에서 보존하고 재빌드하며, 새 build가 확인된 뒤 동일 합성 설정으로3107을 다시 시작한다. 서버 시작 정책을 다른 shell/helper로 우회하지 않는다. 이전 r1/r2/r3·자동검사·외부 UX2 근거는 그대로 보존한다.

## 세 번째 재개 — SDK 교정 빌드

사용자의 ‘확인해봐’ 뒤3107 listener가 없고 종전PID20376도 종료된 것을 확인했다.3105/PID16368은 유지되며 제공 worktree의 Git은 clean이었다. 같은 전체 목표는 active로 재개했고 새 빌드만 후보 내부에서 만들었다. 외부 Supabase changelog와 초기화 문서를 읽었으나 dependency 버전·Auth/DB/로그인 설정은 바꾸지 않았다.

후보 root/`.next`/`.tmp`의 실제 경로와 reparse 없음, 정확한 원 build ID·대상 내부 경로·목적지 미존재·3107 종료를 검사한 뒤 기존 전체 `.next`를 recoverable `.tmp/ux-comparison-unpatched-sdk-build-20261002-1243`으로 옮겼다. old build `uk3lDCe15ZBcBMDTakvs7`, cache 및 r1/r2/r3 결과를 삭제하지 않았다. frozen3105·원본 dirty·개인 설정은 이동/복사하지 않았다.

기존 build wrapper를 동일 합성 `FLOWME_ALPHA_*` 설정으로 실행했다. `output/integrated-product-poc/build-2026-10-02T12-45-01-006Z.json`은 시작12:45:01.006Z·종료12:46:55.217Z, exit/verifiedExit0·source654/drift0다. 새 build ID는 `dB-EkvCezLLLLzP1402bB`다. build의 testExecutions0은 검사 실패0건의 기능 PASS를 뜻하지 않는다. 같은 pinned 설치 호환 검사는 이번에도2/2 PASS했으며 이전29개에 포함되는 재실행이므로 유일 검사 수에 더하지 않는다.

주 담당자가 새 SDK chunk의 실제 hash·debug literal 부재·lswt helper 존재를 읽었고 독립 읽기 감사가 client JS71개를 AST로 확인했다. parse 오류0, 디코딩된 `supabase.gotrue-js.locks.debug` 키/해당 키 호출0이며 SDK header·오류/lock 모듈은 남아 있다. 새 `static/chunks/5895-726955c3fac87c6e.js`의 SHA256은 `22ae9fb430451de878a8827bdc79a487b502aa92788de5141867d3604dc9bdac`다. 검사 전후 build ID와 sorted `[relativePath,SHA256]` manifest hash `a6601b47054949f0140f46f828a597e4cf543b60a9447dfe363a9cf4713c99c9`가 동일하고 changed/added는 없다. 같은 기준은 보관된 이전 SDK chunk에서 키/호출1건을 잡았으며 frozen에서는0이었다. ESM/CJS pinned2.116.0 보정/hash도 유지됐다. 이는 컴파일 산출물 검사이며 브라우저 Storage 호출·sentinel·최종 자산 불변/console·접근성 PASS가 아니다.

현재는 사용자에게 기존3107 PowerShell 창에서 같은 합성 설정으로 서버를 다시 시작하도록 요청했다. 새 창이면 [전체 실행 안내](#후보3107-재개와-실행-설정-교정)를 사용한다. Ready 후 새 build ID·합성 로그인·비활성 gate 부재를 고정 GET으로 확인하고 새 label의 UC1~UC6×5크기30개를 실행한다. 서버 시작 도구 거절과 HTML file: 차단을 우회하지 않는다. 후보 새30개와 HTML 실제 렌더는 아직 NOT_RUN이며 전체 목표 완료·개발계 교체·게시/배포도 아니다.

### 교정 빌드 후 재시작 대기

새 빌드 이후 세 차례 연속 목표 턴에서3107 listener·시험/검사 프로세스가 없음을 확인했다.12:59 UTC에도3105/PID16368만 유지되고 새 build `dB-EkvCezLLLLzP1402bB`·원 피드백 hash는 그대로이며 `candidate-r4/results.json`은 없다. 실행 중인 QA 작업의 verified wait가 아니고 같은 재시작 차단의 반복이다. [목표 차단 감사](completion-audit.md#교정-빌드-후-재시작-대기-감사)에 따라 전체 목표는 blocked로 기록하며 준비된 새30개/HTML 검사를 통과로 올리지 않는다. 위 합성 설정으로 사용자가3107을 시작한 뒤 정확 판본/활성화를 확인해 재개한다. 기존 도구 차단을 우회하거나3105를 교체하지 않았다.

## 네 번째 재개 — 후보 r4와 메뉴 Tab 경계

사용자 재시작 뒤3107/PID17268의 HTTP200·정확 build `dB-EkvCezLLLLzP1402bB`·합성 키·비활성 gate 부재를 확인했다. r4는2026-10-02T13:12:28.350Z에 시작해169915.688ms 동안30개를 실제 실행했다. 원 reporter `output/playwright/ux-comparison-candidate-r4/results.json`은 expected25/unexpected5/skipped0/flaky0이며 모든 retry0이다. 실행 handle은 종료됐으나 주 담당자가 원 terminal exitCode를 보존하지 못했으므로 별도 exit1 확인이라고 주장하지 않는다.

| 동선 | 다섯 크기 결과 | 실제 확인과 남은 범위 |
| --- | --- | --- |
| UC1 등록 설명/개인 작성→실행 | 0PASS/5FAIL | 모두 browser.ts의 마지막 Tab→첫 닫기 `toBeFocused` 실패. 중간 버튼 Tab·가림·outline과 viewport 캡처는 수행. 실제 최종 focus 대상, Escape/선택 복귀·후속 신규 작성/실행/reload·최종 저장 경계는 미도달 |
| UC2 선택 판본→출력/이탈→개인 사본 실행 | 5/5PASS | v2→v1 명시 선택/TXT/정확 판본 복귀/이탈0쓰기, v1사본 완료와 공개 원본 불변 |
| UC3 확정 거절→수정→재저장 | 5/5PASS | 실제 주입 거절은rate-limited 한 종류. 같은 초안 ID·새 요청 ID, 변경 필드 participationDrafts만. 거절 상태 화면 캡처는 없음 |
| UC4 결과 불명→추가 입력→원 receipt 확인 | 5/5PASS | lookup1은 유실 원 요청 ID와 동일. 추가 execute/새 입력 송신 없음 |
| UC5 확정 거절→키보드 직접 재시도 | 5/5PASS | rate-limited 거절 후 새 요청 ID로 한 번 저장, 공개 게시 없음. invalid/limit 전체의 브라우저 검사와는 다름. r4 최종 캡처는 저장 후라 거절 상태 레이아웃 증거가 아님 |
| UC6 폴더/기간/검색·날짜 구획/개별 예외·미정 시간 | 5/5PASS | 교집합/빈 결과 탈출0쓰기·Item ID/일정/메모/시간 경계와reload |

통과25개의 release-boundary/exact-asset-check/viewport 첨부는 실제API/Auth 전달0·forwardedSupabase0·prefix밖 저장0·합성 sentinel byte 불변·page/console/전체console0·최종doc/body overflow0이다. 실제 fetched unique static24개를 현재 후보와 SHA256 대조해 drift0이다. 이는 실제 사용자 계정/DB 전수 snapshot이 아니다. UC1에는 이 첨부가 없어25개 근거를 전체30개로 확대하지 않는다.

독립 시각 검토자는 실제PNG18장을, 담당자는 대표3장을 직접 읽었다. 등록 문구는 다섯 크기 모두 가로 잘림이 없으나375/390px 어절 분리와 긴 메뉴 밀도가 남는다. 마지막 버튼은 focus 이동 시 내부 스크롤과 outline이 화면 안에 보이며844×390에서도 잘리지 않는다. r4의 UC3/5 최종 PNG는 재저장 이후이므로 거절 안내·재시도 동선의 시각 증거로 사용하지 않는다. fullPage PNG도 viewport 안 핵심 행동 표시를 증명하지 않는다.

기존 showModal에 별도 endpoint 처리가 없음을 확인했고 [W3C modal keyboard 기준](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)에 따라 ProgramTextEditor의 dialog-local plain Tab/Shift+Tab 끝점만 순환하도록 보완했다. 버튼/설명/저장 동작은 늘리지 않았다. 중간 input/date/time/select/textarea/summary의 native Tab을 가로채지 않고 disabled/fieldset·hidden/inert·음수tabIndex·비렌더/visibility-hidden·hidden input을 제외한다. 기존 Escape/closePanel/선택 복귀와 데이터 writer는 유지한다. 실제 초점이 본문이나 주소창으로 이동했다고 단정하지 않는다.

새6개는 수정 전6FAIL(미구현 함수/handler), 수정 후 전체 편집기64/64 PASS·exit0이다. 이6개는64개에 포함되며 native 폼 내부 필드/닫힌 details/fieldset 조건은 모형이라 실제 브라우저 검사로 확대하지 않는다. 제품 타입579entry 진단0·source654/drift0, browser/fixture3entry 진단0을 확인했다. 이어 npm wrapper `npm-test-2026-10-02T13-26-51-481Z.json`은2258/2258·exit/verifiedExit0·source654/drift0이다. UC1 역방향 focus/5점 가림/outline과 UC3/5의 거절 문구·재시도 버튼 fullPage=false 캡처를 추가했지만 새 실행은 아직 없다. 캡처는 상태와 재시도 버튼의 화면 내 표시를 검사하며 본문 입력값 기록을 입력창 동시 가시성 증거로 사용하지 않는다.

Tab 보완 후 최초 통합 wrapper `new-tests-2026-10-02T13-25-22-924Z.json`은279파일·2912실행/2814PASS/98FAIL·skip/cancel0·exit/verifiedExit1·source654/drift0이다. 에이전트가 기존 catalog 읽기 경로를 실행 환경에서 빠뜨렸다. 오류는 ENOENT89건, invalid 반환4건·catalog handler503/200 불일치1건, 해당 파일 실패4건이며 누락된 후보의 기본pack 경로를 가리킨다. 제품 단언을 변경하지 않고 기존 승인 원pack SHA256 `723ABEFDC26243EB1F9B4BCF21730758ECC7A300494AD2AE75293AC5C6DDE4BE`를 확인한 뒤 exact 파일을 읽기만 하는 환경으로 전체 재검사를 실행했다.

그 재검사 `new-tests-2026-10-02T13-39-32-829Z.public.json`은13:39:32.829~13:51:13.992 UTC,279파일·2,926실행/2,924PASS/2FAIL·skip/cancel0·exit/verifiedExit1·source654/drift0이다. worker2·heap256MiB/semi4MiB이며 raw private output은 저장/게시하지 않았다. 원pack hash는 전후 동일하다. 직전2,925개에 새6개를 더한 예상2,931보다5회 적지만, 공개 집계만으로 실패 파일·worker 종료·OOM을 확정할 수 없다. 과거 다른 검사에서의 heap 오류를 이번 원인으로 옮기지 않는다. 마지막09:31 통합PASS를 현재 변경의 최종PASS로 올리지 않는다.

13:54:49.126~14:09:59.493 UTC에 같은279파일을 기존 기본 worker2·heap512MiB로 실행한 로컬 진단은 **2,931/2,931 PASS·fail/skip/cancel0·exit/verifiedExit0**이다. 로컬 `failure-diagnostic-2026-10-02T13-54-49-126Z.summary.json`에 source654/drift0·snapshot SHA256 `155906eacf69ff041dcd4feb1453c855f8acb8276a75364c96a3cac0fd09613e`를 남겼고 이는 직전256/4MiB 실행의 전체 source snapshot과 동일하다. 원pack bytes 불변, heap fatal 표식 없음, raw 출력 비보존이다. 입력279파일과 예상2,931개가 모두 실행됐으며 이전 실행 수와 합산하지 않는다. 실행 자원 bound가 달라도 제품 단언·소스·저장 한도는 바꾸지 않았다. 현재 소스의 전체 통합 PASS는 확인했지만 앞선2FAIL의 근본 원인/OOM은 확정하지 않는다.

원 출력은 메모리에서만 분석하고 수집 목록에 허용된 파일명·고정 오류 enum·숫자 종료 코드·고정 signal·heap 오류 표식 여부만 남겼다. 임시 진단기와 sanitized summary는 ignored 로컬 근거이며 원private 출력/계정/설정은 보존·게시하지 않는다. 독립 읽기 검토에서 실패 추출의 YAML 블록/중첩 귀속과 삭제 경로 감지 한계를 확인했으므로 실패 목록을 고유 실패 수·정확한 원인 파일·OOM 인과관계 증거로 쓰지 않는다. 이번 실행의 실패 목록은 비었고 종료 코드/전체 집계·동일 전체 source snapshot을 함께 확인했다.

사용자에게3107만 Ctrl+C 종료하도록 요청했고13:56 UTC 읽기에서3107 listener 없음과3105/PID16368 유지를 확인했다. exact 후보 `.next`/`.tmp` 경로·reparse 아님·기존 build ID·3107 종료를 확인한 뒤 이전 `dB-EkvCezLLLLzP1402bB`를 `.tmp/ux-comparison-pre-tab-build-20261002-2310/`에 recoverable하게 보관했다. 삭제/정리하지 않았다.

동일 합성 runtime 값으로 실행한 `build-2026-10-02T14-10-32-009Z.public.json`은14:10:32.009~14:12:45.602 UTC·exit/verified0·source654/drift0·snapshot SHA256 `155906eacf69ff041dcd4feb1453c855f8acb8276a75364c96a3cac0fd09613e`다. 실제 새 `.next/BUILD_ID`는 `nHVy52oCY9_WJd3Vo4TMH`이며 보관된 이전 ID도 확인했다. frozen3105/PID16368/build `o7dgg9b72_7ai0rqQ5gXU`와 clean Git은 그대로다. 실제 DB/Auth 요청·환경 파일 복사·서비스 교체는 없었다.

이 시점에는사용자에게 같은 합성 설정의3107 재시작을 요청했고r5는 실행 전이었다. 이후외부 재시작·사전 확인·실제r5 실행 결과는아래 최신 항목에 기록했다. 기존r1~r4와 첫 실패를 보존한다. HTML/시안의 file: 정책 차단은 별도이며 다른 실행 경로로 우회하지 않는다. 같은 전체 목표는 active지만 아직 완료가 아니다.

## 다섯 번째 검사 — Tab 보완 후보 r5

사용자 담당 실행 기록은14:25:13 UTC 별도 PowerShell PID25400, 서버PID1348 시작14:25:16·Ready1772ms다. root는14:29:13 UTC listener, 이후 `/alpha` HTTP200·정확 build `nHVy52oCY9_WJd3Vo4TMH`·합성 publishable key·활성 gate를 독립 확인했다.3105/PID16368은 유지했고 새 서버를 도구로 시작하거나 정책 차단을 우회하지 않았다.

로컬 전용 `output/playwright/ux-comparison-candidate-r5/results.json`은14:30:32.984 UTC 시작·170254.991ms·30PASS/0FAIL·retry/skip/flaky0·errors0이다. 실제 실행 session57784의 종료 코드0도 확인했다. 여섯 시나리오×다섯 크기이며 이전r4 실행 수와 합산하지 않는다.

독립 읽기 감사는155개 JSON 첨부와PNG75개 존재, last-run의passed/failedTests0을 확인했다. 결과JSON SHA256은 `27c9054b568421a39487fb7b1fc5f19e923e112774752041b7cd523cf5b52c23`다.24고유 경로의720개 hash 기록 모두 현재 파일과 일치한다. 실제 시나리오 retry0과 별도로 local GET proxy에는 connection-reset 전송 재시도 최대2가 있으며 실제 전송 재시도 횟수는 기록하지 않았다.

| 시나리오 | 실제 결과 | 좁은 확인 범위 |
| --- | --- | --- |
| UC1 작성→같은 Item 기간 실행→reload | 5/5 PASS | 등록 안내의 contextual/fresh 제외,13버튼 Tab·양방향 끝점·5점 가림·focus-visible/3px outline, Escape 원문 focus/selection·0쓰기, 신규 작성·일정 취소/적용·완료/기록·원문 복귀·reload |
| UC2 공개 선택 판본→출력 또는 개인 사본→완료 | 5/5 PASS | v2→명시v1,TXT bytes·정확 판본 복귀·출력 후 이탈0쓰기, v1사본 identity·공개 원본 불변 |
| UC3 명확 거절→수정 후 자동 재보관 | 5/5 PASS | rate-limited 주입, 본문 수정 뒤 자동 저장·같은 초안·새 wire ID, participationDrafts만 변경, 안내/재시도 버튼 viewport·5점 가림·입력값 보존. 버튼 직접 재시도는 아래UC5와 구분 |
| UC4 결과 불명→추가 입력→원 요청 확인 | 5/5 PASS | 유실 execute ID와 같은 lookup1, 수정 입력 보존·새 입력 execute 없음 |
| UC5 명확 거절→키보드 직접 재시도 | 5/5 PASS | rate-limited 주입, focus+Enter·새 wire ID·한 번 저장·공개 게시 없음, 거절 안내/버튼 viewport 확인 |
| UC6 폴더/기간/검색·구획/예외·날짜 미정 | 5/5 PASS | 조회 교집합·빈 결과 탈출0쓰기, ID/원일정/메모/시간 보존·개별 예외·직접 시간 삭제·reload |

30개 전부release-boundary와exact-asset-check를 직접 읽었다. 실제API/Auth/Supabase 전달0·prefix밖 set/remove/clear0·세 합성 sentinel key/value byte 불변·page/console/전체console0·최종doc/body overflow0이다. 각 경우 실제 받아온 unique static24개를 후보 `.next/static`과SHA256 대조해 drift0이다. 이는 실제 계정·DB 전수 불변 증명이 아니다. base fixture의API/mutation0을 overlay까지 모두0이라는 뜻으로 사용하지 않는다. overlay는전체90합성 mutation·100command, 합성Auth 처리285건이며 실제 외부 저장이 아니다. telemetry도 미검증이다.

UC1 메뉴·UC3/5 거절 상태 PNG는 테스트 outputPath에 저장됐고 JSON 첨부와 구분한다. 주 담당자는375×812 최초 메뉴·844×390 역방향 끝점 초점·375×812 UC5 거절 viewport3장을 직접 보았다. 메뉴의 어절 분리/긴 내부 목록과 복구 안내의 밀도는 남는다. 거절 안내·재시도 버튼이 화면에 있다는 단언은 본문 입력창까지 동시에 보인다는 증거가 아니다. invalid/limit 등 모든 거절 원인의 실제 화면, native 폼/닫힌 details/disabled fieldset 전수, IME/touch/보조기술도 이번30개로 통과 처리하지 않는다. 새 HTML/독립 시안의 NOT_RUN과 전체 목표 미완료는 유지한다.

독립 시각 검토자는 새35장을 직접 읽었다. 다섯 크기의UC1 메뉴/끝점/역방향 초점15장과UC3/UC5 거절viewport10장, 두 시나리오의fullPage 최종10장이다. 주요 조작을 막는 잘림/가림은 발견하지 못했다. 다만 **Medium**: 확정 거절에도 ‘입력을 보관한 뒤 새로고침’ 안내와 ‘초안 저장 다시 시도’가 함께 보여 다음 행동이 경쟁한다. `ui-contract.ts`의 공통 저장 안내와 `ProgramCommunity`의 해당 버튼 연결을 다음 좁은 개선 범위로 기록한다. unknown ACK 확인/재전송 계약을 바꾸라는 제안은 아니다. **Low**:375/390px 등록 설명의 어절 분리가 남는다. UC5 최종 PNG는저장 본문·성공 상태가 보이고UC3 최종은reload 후초안 목록이 접혀 있어 본문 시각 확인 근거가 아니다. 검토35와담당3의중복은새검사 수에 합산하지 않는다.

보고 반영 후14:41 UTC 재검사는 문서validator4/4·16필수파일/7,259로컬링크PASS, HTML 정적/저장/VM42/42 PASS였다. scoped closeout과 실제 변경 내용을 읽었고diff --check exit0을 확인했다. 이것은 새HTML 렌더 근거가 아니다. 제공 작업본은clean Git·기존build `o7dgg9b72_7ai0rqQ5gXU`·3105/PID16368,3107/PID1348 유지이며 원피드백hash `98B6...EDC4`도 이전과 같았다. 이번 후속은 보고 상태 교정이며 제품 소스/새 정책/서비스 교체/게시 변경은 없다.

## 저장 거절 안내 후속 구현 — r5 이후

r5 거절 캡처의 Medium 갭을 `flow-copy-editor`로 보완했다. 변경 범위는 Community의 참여 초안 저장 오류와 AlphaWorkspace의 선택적 안내 함수 연결이다. live controller의 같은 owner·확정 거절 proof·pending/busy/external/storage/disposed 부재·social participation-save·실패한 draft/expected의 canonical 완전 일치를 확인했을 때만 ‘초안을 저장하지 못했습니다. 입력은 남아 있습니다.’를 표시한다. 다음 렌더에 proof가 무효면 기존 안내로 돌아가며, canonical 비교 실패는 예외를 내보내지 않는다.

다른 submit/perform/media 오류는 문자열 setter가 save metadata를 제거한다. 재시도 등록과 실제 queue dispatch 때 이전 save-origin alert만 지운다. 앞선 A가 진행 중일 때 B를 등록→A 거절→B 시작 순서의 경합을 추가 red 회귀로 잡았다. 명령·공통 오류 의미·client/controller·DB/storage schema·writer·CAS/retry 권한은 이번 안내 수정에서 변경하지 않았다. 새 UI 소유 파일은 ProgramCommunity.tsx/test 두 개이며 전체 소유는 27파일이다.

| 실제 실행 | 결과 | 근거와한계 |
| --- | --- | --- |
| 새안내회귀 최초red | 8실행/0PASS/8FAIL | 코드연결과save-origin metadata가없던수정전source. 실제기능8개실패로확대해석하지않음 |
| 새큐경합red | 1실행/0PASS/1FAIL | B등록뒤A의실패안내가도착해Bdispatch에남는실제callback 순서 |
| 최종UI/관련retry 회귀 | 110/110 PASS·exit0 | `node --import tsx --test components/flow/integrated-poc/ProgramCommunity.test.tsx components/flow/integrated-poc/AlphaWorkspace.test.tsx lib/flow/integrated-poc/alpha-sync/social-draft-retry.test.ts`. 새9개포함. 최초green109와재실행110을합산하지않음 |
| 소스고정npm test | 2,258/2,258 PASS·exit/verified0 | `npm-test-2026-10-02T14-59-27-289Z.public.json`,14:59:27.289~15:00:58.504UTC·fail/skip/cancel0·source654/drift0·snapshot`be72fd97f22ba041e528a1a08f5eec5e6d4f007963e33e70a39b13b7de9afef9`·raw출력비보존 |
| 소스고정제품타입 | 579entry·진단0·exit0·source654/drift0 | `program-check.mjs` 재실행. source고정최종record는output의targeted-types.json. 브라우저3entry검사도진단0이지만실제렌더아님 |
| 중간변경중검사 | npm2258PASS/0FAIL이나verified2,제품진단0이나exit1 |14:57npm과병렬타입검사도중큐경합test/component2파일이변경됐다. 최종판정근거에서제외하고소스고정뒤재실행했다. 실패원인을제품테스트실패로바꾸지않음 |
| 안내 수정 후 production build | `ViQGyXzeL-q-3GEbFJGgZ` exit/verified0·source654 drift0 | `build-2026-10-02T15-07-21-313Z.public.json`,15:07:21.313~15:10:32.639UTC. snapshot `be72fd97f22ba041e528a1a08f5eec5e6d4f007963e33e70a39b13b7de9afef9`는 최종 npm/타입과 같음. raw 출력 비보존 |
| 안내 수정 후 HTTP 화면 | **r6 30/30 PASS·터미널 exit 0** | 새 build ID·합성 key·활성 gate를 독립 확인한 뒤 실제 실행. UC3 두 거절→수정본 직접 저장, UC3/5 안내 전체·성공 후 오류 소멸 포함. 아래 r6 원결과와 이전 r5를 구분 |

독립 읽기 검토는 live authority/owner/입력 완전 일치·non-save 오류 분리와 브라우저 assertion 범위를 확인했다. 처음 발견한 큐 경합은 추가 회귀와 dispatch 직전 clear로 해결된 것을 재확인했다. 이 검토는 화면 실행이나 새 테스트 개수가 아니다. UC3/5에는 거절 alert의 새 문구/새로고침 없음 assertion을 추가했고, UC4에는 확정 거절 문구 없음과 기존 원 receipt 확인을 유지했다. 준비한 assertion을 PASS로 표현하지 않는다.

원 목표와 운영 경계·HTML/독립 시안 NOT_RUN은 유지하며 전체 목표 완료·서비스 반영·commit/push/PR/merge/Preview/Production은 없다. 관찰 사용자 0명, 이번 목표의 실기기는 미실행이다. UTC10/2 검사는 한국 시간10/3에 걸쳐 있으며 문서 날짜는 목표 시작10/2를 유지한다.

후속 마감 검사는 문서 validator 4/4·필수16파일/로컬7,262링크, HTML 정적/저장/VM 42/42, 브라우저 타입3entry 진단0(15:04:05.832 UTC), `git diff --check` exit0이었다. scoped closeout은 소유27파일/19path를 조사하고 검사 권장사항만 출력했다. 실제 product diff를 읽었으며 제공 작업본의 Git은 clean, build `o7dgg9b72_7ai0rqQ5gXU`,3105/PID16368과3107/PID1348은 유지됐다. 원 피드백 hash도 `98B6B5267DC982925DB7948DBD7ED52A017AC1E3365246B99FABA547FD78EDC4`로 같았다. 이 검사나 상태 확인을 안내 수정 후의 production build/실제 브라우저 PASS로 합산하지 않는다.

그 뒤 담당자가15:06:00 UTC에 전용 콘솔에서 정상 Ctrl+C로 3107/PID1348을 종료했다. 여기서 listener·PID 부재와3105/PID16368 유지를 두 번 확인했다. candidate root/`.next`/`.tmp`의 실제 경로·reparse 부재·원 build ID·목적지 미존재를 확인한 뒤 r5 전체 빌드를 recoverable `.tmp/ux-comparison-pre-notice-build-20261003`에 보관했다. 원본이나 환경 파일은 이동/복사하지 않았다. 독립 읽기 감사도 보관된 build의고유24자산/720hash가 r5 원 결과와 모두 같은 것을 확인했다.

새 빌드 종료 후 `BUILD_ID=ViQGyXzeL-q-3GEbFJGgZ`, public build JSON hash `0893ef4f8902a0f12ba5ce2ef54df79a6f670de715ec634435b586b1bd889e96`를 확인했다. 담당자에게 같은 합성 환경의3107 재시작을 이 세션에서 요청했다. UC3/5의 alert 전체도 status/retry와같이 viewport 및5점 가림 대상으로 추가했고 성공 후 alert/재시도 버튼0개를 단언한다. e2e 파일은 integration source654 범위 밖의 별도 검사 코드이며 제품 빌드의 source drift 근거로 포함했다고 주장하지 않는다. 최종 browser3entry 타입 진단0은 준비 근거이고 새 화면PASS가 아니다.

r6의 UC3은 최초 거절→본문 수정→수정본의 자동 저장도 확정 거절→버튼의 직접 저장→reload까지 준비했다. 두 거절 동안 저장본 불변, 수정 입력 보존, 서로 다른 두 거절 request ID와 새 명시 저장 ID·한 번의 성공을 확인하도록 보강했다. UC5의 같은 입력 키보드 재시도와 구별하며, 준비된 추가 동선을 실행했다고 보고하지 않는다. r5의 UC3 자동 저장 성공 근거는 그대로 보존한다.

## 여섯 번째 검사 — 저장 안내 보완 후보 r6

사용자 담당자는 2026-10-02 15:14:27 UTC에 전용 PowerShell PID19052에서 3107을 다시 켰다. 서버 PID7588의 시작은 15:14:31.1965881 UTC, Ready 2.2초다. 여기서는 15:15:38.898 UTC에 `/alpha` HTTP200·정확 build `ViQGyXzeL-q-3GEbFJGgZ`·합성 publishable key·활성 gate를 독립 확인했다. 3105/PID16368과 기존 판본은 유지했다. 시작 호출이 종료된 뒤 서버가 살아 있다는 사용자의 실행 확인도 별도로 보존한다.

`output/playwright/ux-comparison-candidate-r6/results.json`은 15:16:01.142 UTC 시작·217142.366ms·**30/30 PASS**다. session28713의 마지막 세 PASS와 `30 passed (3.6m)`, 터미널 exit0을 주 담당자가 직접 확인했다. 모든 시나리오 attempt1·retry0, FAIL/skip/flaky/errors0이다. 이전 r5와 같은 여섯 시나리오×다섯 크기이며 합산하지 않는다. r6의 UC3은 수정 후 재거절과 명시 버튼 저장을 결합한 새 경로다.

| 시나리오 | 실제 결과 | 이번 판본의 확인 범위 |
| --- | --- | --- |
| UC1 개인 작성→같은 Item 기간 실행→reload | 5/5 PASS | 등록 안내, 13개 메뉴 조작·양방향 Tab 끝점·초점/5점 가림, Escape 선택 복귀·0쓰기, 새 작성·일정 취소/적용·완료/기록·원문 복귀·reload |
| UC2 공개 선택 판본→출력 또는 개인 사본→완료 | 5/5 PASS | 명시 v1 선택, TXT bytes·정확 판본 복귀·출력 후 이탈0쓰기, 개인 사본 identity·공개 원본 불변 |
| UC3 거절→수정→재거절→버튼 직접 저장→reload | 5/5 PASS | 두 rate-limited 거절 동안 저장본·진단 불변과 수정 입력 보존, 서로 다른 두 거절 ID와 새 직접 저장 ID, pointer 버튼 성공 실행1회·같은 초안·공개 원본 불변 |
| UC4 결과 불명→추가 입력→원 요청 확인 | 5/5 PASS | 유실 execute와 같은 receipt lookup, 추가 입력 보존·새 입력 execute 없음, 확정 거절용 짧은 안내 없음 |
| UC5 거절→키보드 직접 저장 | 5/5 PASS | 같은 입력의 focus+Enter, 새 wire ID·성공 실행1회·공개 게시 없음 |
| UC6 폴더/기간/검색·날짜 구획/예외·미정 시간 | 5/5 PASS | 조회 교집합·빈 결과 해제0쓰기, 같은 Item ID·원일정·메모·시간 보존과 개별 예외·reload |

| 화면 크기 | 실행 수 | 오류·최종 가로 넘침 | 거절 안내·상태·재시도 |
| --- | --- | --- | --- |
| 390×844 | 6/6 PASS | page/console0·doc/body overflow0 | UC3 첫/수정본 거절·UC5, 전체 viewport/5점 가림 PASS |
| 375×812 | 6/6 PASS | page/console0·doc/body overflow0 | 같은 검사 PASS. 좁은 어절 분리는 별도 UX 잔여 |
| 844×390 | 6/6 PASS | page/console0·doc/body overflow0 | 같은 검사 PASS. 본문 입력창 전체의 동시 가시성을 뜻하지 않음 |
| 1024×768 | 6/6 PASS | page/console0·doc/body overflow0 | 같은 검사 PASS |
| 1440×900 | 6/6 PASS | page/console0·doc/body overflow0 | 같은 검사 PASS |

독립 읽기 감사는 원 JSON 첨부165개를 해석하고 PNG80개 존재·last-run passed/failedTests0을 확인했다. 결과 JSON SHA256은 `0a6c66fd025163ab11125abe6d18155cefd4775574ba2a00a436e26d121a5404`다. 각 경우 실제 fetched static24개, 총720개 hash를 현재 `.next`와 대조해 drift0을 확인했다. scenario retry0과 GET proxy의 최대2 connection-reset 전송 재시도 설정은 별개이며 실제 전송 재시도 횟수는 기록하지 않았다.

30개 모두 실제API/Auth/Supabase 전달0·허용 prefix 밖 set/remove/clear0·세 합성 sentinel key/value byte 불변·공개 원본 불변·page/console/전체console0·최종doc/body overflow0이다. 합성 overlay는 **90 mutations / 105 commands**, 합성 Auth290회다. base fixture의 mutation0을 전체 합성 변경0이라는 뜻으로 쓰지 않는다. 실제 계정/DB 전수 snapshot이나 telemetry 검증도 아니다.

거절 viewport15개는 UC3 첫/수정본 거절과 UC5×다섯 크기다. 안내 전체·저장 상태·버튼 모두 화면 안에 있고 ‘새로고침’ 문구가 없으며, UC3/5 성공 뒤 story alert와 재시도 버튼은0개다. 수정 입력의 값/저장본 검사는 본문 입력창까지 화면 안에 온전히 동시에 보인다는 증거가 아니다. 주 담당자는 수정본375px·최초844×390·UC5거절390px, UC5성공375px·수정본1440px의 실제 PNG5장을 직접 읽었다. 겹치는 감사/이미지를 추가 테스트 수로 합산하지 않는다.

독립 시각 검토자는 실제 PNG26장을 직접 읽었다. 거절 viewport15장·UC5성공 fullPage5장, UC1 최초 메뉴375/390px2장·마지막/역방향 초점375/844px4장이다. r5의 Medium 안내 경쟁은 해결됐으며 새 Medium/High나 핵심 버튼/포커스 가림은 발견하지 못했다. 성공5장에서 안내/재시도 소멸·같은 본문·저장 완료가 보인다. Low 잔여는 새 안내의 ‘있습/니다’·‘있/습니다’와 등록 안내의 ‘바꿔/도’·‘바/꿔도’다. 초기 메뉴 하단은 내부 스크롤 뒤에 있으나 끝점 초점 캡처는 접근 가능함을 보여 준다. 처음 찾기 쉬운지는 미확인이다. 수정본 거절375/844/1024px에서는 본문이 화면 밖이고390px는 줄 일부,1440px는 짧은 문장만 보이며 입력창 전체는 잘린다. 따라서 본문 전체 동시 가시성을 PASS로 올리지 않는다. [UX 판정](ux-review.md#후보-r6의-안내와-화면-재검토)에 연결하며 PNG26과 담당5는 겹치는 읽기 관찰이라 새 테스트로 합산하지 않는다.

관련110·npm2258·타입579와 새 build는 최종 제품 snapshot `be72fd97f22ba041e528a1a08f5eec5e6d4f007963e33e70a39b13b7de9afef9`의 근거다. r6 검사 코드는 제품 source654 범위 밖이며 브라우저 타입3entry 진단0(15:15:14.621 UTC)을 따로 확인했다. r5의 통합2931을 안내 수정 후 전체 통합 재실행으로 표시하지 않는다. rate-limited 외 모든 거절·공개/제안 전체 retry·IME/touch/AT·실기기·관찰 사용자는 미검증이다. HTML/독립 시안 NOT_RUN과 전체 목표 미완료, 미반영/게시 제외는 유지한다.

r6 보고 반영 뒤 문서 검사4/4·필수16파일/로컬7,264링크, HTML 정적/저장/VM42/42, diff 공백검사 exit0을 확인했다. 15:28:11 UTC scoped closeout은 소유27파일에 해당하는19prefix를 조사했고 권장사항만 출력했다. 실제 runtime/e2e diff도 읽었다. 15:28:32 UTC에는 3107/PID7588·시작15:14:31.1965881, frozen3105/PID16368·시작05:58:56.9139464와 기존build `o7dgg9b72_7ai0rqQ5gXU`·clean Git을 확인했다.3106 listener는 없다. 원 피드백hash `98B6B5267DC982925DB7948DBD7ED52A017AC1E3365246B99FABA547FD78EDC4`는 직전과 같다. 이 상태 확인은 실제 DB 전체 불변이나 추가 기능 테스트가 아니며 서버/원본/계정/설정·서비스 교체·게시 변경은 없다.

## 완료 감사 후속 — 다음 업무 범위 고정

직전 목표 턴은 r6의 실제 실행·화면/원결과 감사와 보고 반영으로 진전이 있었다. 이번 후속에서는 원 피드백hash `98B6...EDC4`와 UX2 QAhash `1D287...573D`가 같고, 후보build `ViQGyXzeL-q-3GEbFJGgZ`·r6 결과가 유지됨을 읽었다. last-run은 실제 `artifacts/.last-run.json`의passed/failedTests0이다. 처음 상위 폴더에서 찾은 경로 오류는 검사 실패나 reporter 부재가 아니었다.

요구별 독립 감사에서 ‘다음 UX 개선 범위 확정’이 후보 목록에만 남은 문서 누락1건을 발견했다. [UX-N1 초안 복구 화면](results.md#다음-ux-개선-범위--초안-복구-화면)의 대상·6상태·감산/보존·제외·설계 산출물·5완료 기준을 results에 고정하고 요구/UX/마감 감사/계획/체크/STATUS/HTML에서 연결했다. 재감사는 이 누락이 해소됐고 최종 UI·새 정책·후속 구현으로 과장하지 않았음을 확인했다. 이는 실제 후속 범위 보완이며 r6 앱 검사를 다시 실행했다는 뜻은 아니다.

문서 검사4/4·필수16파일/로컬7,270링크를 확인했고, QA/계획의 연결 추가 뒤 최종 로컬링크는7,272개 PASS·diff 공백검사 exit0이다. HTML 정적/저장/VM 첫 실행은41PASS/1FAIL: 추가 fragment 링크를 기존 검사가 파일 경로 전체로 판정했다. 테스트를 바꾸지 않고 같은 결과 문서로 가는 중복 진입을 합쳐 fragment 없는 기존 링크에 ‘검사 결과·다음 UX 범위’ 이름을 썼다. 최종42/42PASS·exit0이다. 이42개는 제품 화면 검사나 새 정책 검사가 아니다. 제품 소스·빌드·서버·원본 시안/피드백·계정/DB/Auth·운영 설정·게시를 변경하지 않았고 소유27파일은 유지한다.15:38 UTC 문서 scope 마감 점검과 실제 후속 변경을 읽었으며 frozen Git은clean·기존build이고r6 JSONhash도같다. 전체 목표의 필수 잔여는 새 HTML/독립 시안 렌더로, 기존 도구 차단을 우회하지 않으며 active·미완료를 유지한다.

## 필수 렌더 차단의 최종 상태 기록

2026-10-03 KST. r6 재개 뒤 세 턴의 같은 렌더 차단과 실제 앱 검사·UX-N1 범위 보완의 진전을 구분했다. 현재 완료 감사·STATUS·결과·문서 진입점은 blocked·미완료로 맞췄으며 두 필수 렌더 체크와 전체 완료 체크는 해제하지 않았다. 앞선 active 표현은 당시 기록이다. 15:44:56 UTC 문서 scope closeout은 권장 검사만 출력했다. 실제 문서 검사는4/4·필수16파일·로컬7,275링크 PASS, diff 공백검사는 exit0이다. 이번 상태 문서 변경으로 앱/npm/build/HTML 모형을 재실행한 것은 아니다. 서버·제품 소스·원본·계정/DB·운영 설정·게시/배포는 변경하지 않았다.

## 사용자 검사 재개 요청 — 직접 접근 재확인

2026-10-03 KST(16:00~16:01 UTC). 사용자의 ‘남은 검사 ㄱㄱ’ 이후 기존 격리 작업본·소유 경계를 읽고, 현재 브라우저 인벤토리에서 인앱 브라우저에 열린 탭이 없음을 확인했다. 남은 보고서의 원 file: 주소를 `cua.createBrowserTab("iab", ..., { visible: true })`로 직접 요청했다. 브라우저 도구가 **Browser Use rejected this action due to browser security policy**로 거절했으며, 허용 프로토콜을 **http:, https:**로 명시했다. 오류는 workaround·indirect execution·raw CDP/browser commands·alternate browser surfaces·policy circumvention으로 같은 결과를 얻으려는 시도도 금지했다.

따라서 HTTP 미러나 다른 브라우저로 재시도하지 않았다. 프로토콜 단계에서 막혔으므로 보고서 DOM·클릭·화면 검사는 시작하지 못했고 UX2 시안에도 같은 file: 접근을 반복하지 않았다. **접근 요청1건 거절, 실제 새 렌더/조작 검사0건**이며 두 항목은 NOT_RUN이다. 과거 앱30PASS나 모형42PASS를 새 실행 수에 합산하지 않는다. 이는 사용자 재개 요청 후 첫 차단 확인이며 이전 차단 감사의 연속 턴 수를 이어 세지 않는다. 기존 goal 상태 blocked를 새로 변경하거나 완료 처리하지 않았다.

제품 코드·시안/HTML·원본 피드백·서버/운영 설정은 변경하지 않았고 이 접근 실패 기록과 STATUS만 갱신했다. 다음 진행에는 허용된 접근 환경의 실제 변화 또는 사용자에 의한 완료 범위 조정이 필요하다. 접근 제한을 새 승인만으로 우회하지 않는다.

## 검사 재개 후 최종 차단 판정

사용자 검사 재개 요청의 직접 거절 턴부터 새로 세어, 후속 근거/독립 감사·사용자 설정 질문 처리 턴과 이번 목표 턴까지 세 연속 턴에 같은 필수 렌더 차단이 유지됐다. 후속 자동 재개에서 goal은 active였지만 허용 환경의 변화나 새 렌더 근거는 없었다. 문서에 남은 첫 접근 시점의 기존 blocked 표현은 당시 기록이며, 이번에는 [새 차단 감사](completion-audit.md#사용자-검사-재개-후-세-턴의-차단-감사)에 따라 다시 blocked로 전환한다. 목표 범위 축소·전체 완료·정책 우회·새 기능 추가는 하지 않는다. 새 렌더/조작 실행0건, r6 결과·HTML·build·원 피드백/UX2 QA hash 불변과 실행 중 QA 부재를 확인했다. 공식 설정 조회와 독립 읽기 감사는 실제 렌더 검사 수에 합산하지 않는다.

## HTML/실기기/관찰 상태

- UX2 네 시안: 최초 `file:` 접근은 차단됐고 이 세션의 새 DOM/클릭 검사는 여전히 **NOT_RUN**. 이후 원본 UX2 세션에 사용자 요청의 HTTP 미리보기·네 안×3크기·8여정·모형47/47이 추가됐다. 해당 기록과 기존 캡처18장을 읽은 근거는 아래에 따로 남긴다. 원본을 현재도 ‘어느 세션에서도 렌더되지 않았다’고 보고하지 않는다. 여기서 HTTP 미러·다른 브라우저·CDP·외부 렌더 도구로 차단을 우회하지 않았다.
- 새 조작 HTML: 별도 모형 artifact. 정적/VM 검사와 실제 렌더 결과를 분리한다. 실제 렌더는 현재 **NOT_RUN**.
- 실제 Android Chrome / iOS Safari: 이번 목표에서 **NOT_RUN**.
- 관찰 사용자: **0명**, 요청대로 보류.

### UX2 후속 원본의 재확인 — 별도 세션 근거

08:26 UTC 이후 외부 원본의 spec·QA·fidelity·completion-audit·design-brief·journey-review와 `core.js`/`app.js`를 다시 읽었다. 원본 QA의47/47·서버8/8·네 안×3크기와8여정은 **UX2의 보고된 실행**이며 이번 자동검사 실행 수가 아니다. 이전37/37과 초기 미실행을 후속 검증이 대체한 사실을 구분한다. 원본 QA는 A 중심의 대표8여정이지4안×8여정 전수도 아니다.

주 담당자가 `screenshots/{tool,community,service,knowledge}-{mobile,tablet,desktop}.jpg`12장 및 `state-{progress,export,private-copy,question,publish,save-error}.jpg`6장을 직접 시각 검토했다. 원본/캡처를 복사하거나 새 HTML을 실행하지 않았다. JPEG 픽셀은375×811/1009×757/1425×891이고, 원본 QA의 CSS viewport390×844/1024×768/1440×900과 다르다. 이미지 자체로 DOM overflow0·초점 복귀·console0을 독립 증명하지 않는다.

새 근거로 문서 시작·통합 글 피드·오늘 시작·가이드/단계 탐색·모바일4보기와 제품6보기의 차이를 구체화했다. Today 포함 범위, 같은 날짜의 진행 기록 단위, 모형 개선 제안/Undo/저장 실패, 출력/판본의 기능 비등가도 [UX 대조](ux-review.md#ux2-후속-원본과-시안별-제품-차이)에 기록했다. 시안의 작은 localStorage 모형을 제품 권한/CAS/parser/writer로 채택하지 않았다.

`qa.md`/`core.js`/`app.js` hash는 UX 대조에 남겼고 독립 읽기 감사와 일치한다. 원본 앱/시안/계정/DB/서버를 여기서 수정하지 않았다. 실제 저장 파일·외부 import·IME/touch/AT·사용자 선호·새 후보30개·새 HTML 렌더의 남은 상태도 바꾸지 않는다.

## 쓰기·반영 경계

현재 개발계·원본 Flow/dirty/untracked·개인 실데이터·DB/Auth/Tunnel/DNS를 수정하지 않았다. 실제 DB 전수 snapshot으로 불변을 증명했다고 표현하지 않는다. 브라우저 합성 시나리오의 운영 sentinel key/value byte 불변과 prefix 밖 set/remove/clear0을 독립 근거로 남긴다. 로컬 새 작업본의 client/controller/UI만 변경했다.

commit / push / PR / merge / 개발계 교체 / Preview / Production: 이번 목표에서 모두 없음. HTML 파일·로컬 source 변경과 서비스 반영을 구별한다.

최신 읽기 재검사: 현재 제공 판본의 `post-hook-proof.mjs assert`는 clean `d1cc8dd1`, compile inputs1,204·artifact316·drift0을 확인했다. 종전 전체 switch guard는 `original-git-drift`로 실패했다. 이는 피드백 소유 세션의 Dots 자료 추가 후 원본 Git 상태가 바뀐 사실과 연결된다. 보호8개 중7개 hash는 같고 달라진1개는 원 피드백 정본이며 현재 Dots 링크를 읽은 hash와 일치한다. guard baseline을 바꾸거나 예외로 통과시키지 않았고 서비스 교체도 하지 않았다. 이전 시점의 보호8개 불변 PASS와 현재7개 불변/원본 외부 변경을 구분한다.

## 추가 Dots 검토

사용자가 피드백 세션에 원본을 보관했음을 알려 [Dots 대조](dots-review.md)를 추가했다. PDF16쪽 텍스트와2·11·12·16쪽 렌더, 피드백 정본, 관련 source를 확인했다. PDF hash는 원 Dots 업로드와 같다. Dots30건 시뮬레이션을 이번 자동검사/관찰 사용자/후보 QA 수에 넣지 않는다.

독립 진단3건에서 동일 UTC 시각의 로컬 날짜가 서울10/2·UTC10/2·로스앤젤레스10/1로 나왔다. Dots의 실제 브라우저 timezone과 자정 복귀는 미검증이다. 피드백 정본 hash가 사용자 지정 세션의 Dots 링크 추가로 `D862...A62`에서 `FF6740672AD344EB9871A3FF81E4539118119F046565BF8739E4B0A1F6BDB6B0`으로 바뀌었다. 이 변경은 원 소유 세션의 외부 변경이며 여기서 작성한 변경이 아니다. 원본 문서·PDF는 읽기만 했다.

### 자유 편집 Dots의 후속 대조와 메모리 진단

현재 최신 정본에는 별도 자유 편집 보고서도 연결됐다. 현재 피드백 hash는 `98B6B5267DC982925DB7948DBD7ED52A017AC1E3365246B99FABA547FD78EDC4`다. 직전 `FF674...B6B0`은 일정 보고서 추가 시점의 역사값으로 보존한다. 새 README hash `C806ED5FA2222DB3080BAFFBBF1BD96F550A2069B379BC1F13DF4F709ADE4FEA`, PDF11쪽 hash `46EC77901C6D8FE7FE3BAD0B6CA581BFEDB3069CDFCE881D3597EFD7EB5F460F`, 원본 v11 spec hash `622839498B628C1DEFF38D77AEEE927BB1AB0B82883CAE6C800BCB4A334B3E7C`를 읽었다. PDF 전체 텍스트와6·7·10쪽 원화면을 확인했다. Dots 당시 build ID는 미확인이다.

주 담당자가 다음 **9개 메모리 진단**을 실제 실행했고 fail/skip/cancel0이다. 외부 Auth/API/실 storage 호출0이며 fake commit의 호출 수는 실제 저장 수가 아니다. 로컬 ignored 스크립트는 `.tmp`에 보존한다. 이9개를 기존 npm2,258·통합2,921·브라우저 실행 수에 합산하지 않는다.

| 실제 진단 | 결과 | 확인한 좁은 범위 |
| --- | --- | --- |
| FE-D1~D6 순수 모델 | 6/6 PASS | raw2→삽입3→역편집3, 원줄ID·registry 유지, snapshot2/JSON roundtrip3 구별, blank/들여쓴 memo 대조, 구조subcheck+canonical/50% 이력 유지, 사본의 새ID/완료/개별 날짜·이력 비복제/원본 보호, 단일 같은 문서 재배치 |
| FE-D7~D9 실제 draft 함수 | 3/3 PASS | 미저장 역편집은 committed2/commit0; 중간fake save성공 뒤 역편집은3/fake commit2; fake save거절 후 역편집은2/거절 attempt1 |

실행은 `node --test .tmp/dots-free-edit-diagnostics.test.cjs`와 `npx.cmd tsx --test .tmp/dots-free-edit-draft-diagnostics.test.ts`다. script hash는 각각 `CDFDEB9505C0AC8083FE184C2A89F82FDE4897CE19C5838BD7055BFDBC689560`, `2C9F0457C135D3B314DD0E752D62A2E14E46EEA4D020B3BB9D0C9C14C3AB561F`다. 실제 ProgramTextEditor의 draft 함수를 기존 JSX transpile/VM 방식으로 읽었으며 브라우저 DOM 렌더/clipboard 검사로 표현하지 않는다.

별도 읽기 감사2개도 v11의 등록 유지와 수정 전 UI의 상태 발견성 공백을 확인했다. 원본 이동 회귀 소스는 읽기 근거로만 사용했고 이번에 실행하지 않았다. agent의 추가 메모리 관찰을 정식 test 수에 중복 합산하지 않는다. 상세 FE01~FE06·코드 연결·정책 경계는 [Dots 대조](dots-review.md#추가-자유-편집-피드백--fe01fe06)에 둔다. 이 진단 단계에서는 parser/writer/메모·복사 정책과 실제 앱을 변경하지 않았으며, 아래 후속 후보 구현과 구별한다. 후보30개·새 HTML 렌더는 여전히 미실행이다.

## FE01 등록 설명의 후속 후보 구현·재검사 — r1 이전 이력

기존 `ProgramTextEditor`의 행 메뉴에만 canonical 구조 하위 원줄의 등록/기록 유지 설명을 추가했다. 별도 registry 상태·버튼·writer·parser·저장 정책은 추가하지 않았다. 실제 서비스가 아닌 격리 후보다.

| 실행 | 실제 결과 | 근거 / 한계 |
| --- | --- | --- |
| 새 메뉴 회귀 최초 red | 4실행 / 1PASS / 3FAIL | 안내가 없어서 positive/close/current-state 검사가 실패. 기존 근거와 별도 |
| 동일4개 green / 전체 컴포넌트 | 4/4 / 58/58 PASS | `node --import tsx --test components/flow/integrated-poc/ProgramTextEditor.test.tsx`. 새4는58에 포함하며 합산하지 않음 |
| 최신 npm test | 2,258/2,258 PASS | `npm-test-2026-10-02T09-25-52-196Z.json`; fail/skip/cancel0, source drift0. 직전 동일2,258과 합산하지 않음 |
| 최신 전체 통합 재검사 | 279파일 / 2,925/2,925 PASS | `new-tests-2026-10-02T09-31-07-376Z.public.json`; fail/skip/cancel0·source654/drift0. 새 메뉴4개 포함, 원pack hash 불변·credentials 전달/설정 복사0 |
| 최신 제품 타입 | 579entry / 진단0 | `targeted-types-2026-10-02T09-27-34-300Z.json`; source654/drift0 |
| 최신 production build | exit0 / drift0 | `build-2026-10-02T09-27-45-267Z.json`, build `uk3lDCe15ZBcBMDTakvs7`. 공개 dummy QA 설정만 사용 |
| 보강 browser/fixture 타입 | 3entry / 진단0 | 09:34:11.858Z, ignored `.tmp/check-ux-comparison-browser-types.mjs`; noEmit/import 검사이며 브라우저 실행 아님 |
| 실제 UC1 seed callback 진단 | 1/1 PASS | ignored `.tmp/dots-registration-fixture.test.ts`, hash `5DBE1448148B1C4203C90B91A85C14034361E2C42E3DF266CCE1C9458F919DD0`. source AST의 실제 `prepareAccount` callback만 VM으로 실행 |
| 실제 중첩 참조의 추가 진단 | 최종2/2 PASS | ignored `.tmp/subcheck-nested-reference-audit.test.ts`, hash `543F6B23336A38BA8D87FCA830AF2E9A794D2B8E9AADECF31D2C129CB31AB47C`. 구조subcheck지만 rowMeta.kind=task임을 실제 모델/JSX에서 확인 |
| HTML 정적/모형 재검사 | 42/42 PASS | UI 상태 설명의 보고만 업데이트. 실제 render는 NOT_RUN |
| 문서 중간 / 마감 재검사 | 각각4/4 PASS·links PASS | `docs-2026-10-02T09-34-02-905Z.json`과`docs-2026-10-02T09-42-46-101Z.json`. 마감16필수파일·7,238로컬링크, git diff --check exit0 |

독립 읽기 검토가 UC1 합성 자료의 마지막 날짜 구획이 기존 ‘새 할 일 date=null’ 요구를 깨는 점을 찾았다. 자료 끝에 `[미정]`을 복원하고 실제 callback 진단으로 등록된 child/신규 child 구분·40% 이력·무일정 신규 작성·기존ID 보존을 확인했다. 브라우저 실패가 발생한 것이 아니며 실제 후보 실행은 여전히0이다. 합성 seed 수정으로 parser 동작이나 기존 제품 요구를 완화하지 않았다.

참조 부정 검사 공백이라는 독립 검토의 초기 추론은 후속 진단으로 철회했다. 실제 중첩 참조는 itemList에서 제외되어 rowMeta의 kind가 task로 남는다. 진단 작성 중2회는 잘못된 기대/도우미 의존성 누락으로 각0/2 FAIL했고 수정 뒤2/2 PASS다. 메모리에서 `!isReference`만 제거한 변이도2/2 PASS했으므로 그 조건을 독립 증명했다고 보고하지 않는다. 원 파일을 변이·수정하지 않았고 새2진단/변이/재실행은 정식 통합 또는 요구 완료 수에 합산하지 않는다. 주 담당자도 정상2/2를 별도로 확인했다.

후속 scoped closeout은25개 확장 소유 파일(도구의 폴더 묶음17path)을 확인했으며 추천만 하고 검증을 실행하지 않았다. 실제 diff와 frozen clean Git/build `o7dgg9b72_7ai0rqQ5gXU`도 읽었다. 기존 자유 편집9진단은 현재 소스에서도9/9로 재확인했지만 유일9개와 중복 합산하지 않는다.

기존 승인 catalog pack을 읽기만 하는 최신 전체279파일 재검사는09:31:07.376Z~09:44:55.276Z에2,925/2,925 PASS·exit0이었다. source654/drift0, source snapshot hash `a7b90400e49acf18d7ceac97afab3cdb3cfed2d508489e80cf7a633fdd05137e`다. wrapper가 catalog bytes 불변/hash `723abefdc26243eb1f9b4bcf21730758ecc7a300494ad2ae75293ac5c6dde4be`·credentials 전달0·settings 복사0을 확인했다. raw private output을 저장/게시하지 않았다. 이전2,921 결과는 등록 설명 추가 전 이력으로 보존하며 실행 수를 합산하지 않는다.

UC1×5 안에 등록된 하위 항목/새 하위 체크의 키보드 메뉴·Escape0쓰기·계정/원문 보존과 메뉴 내부 overflow 단언을 준비했다. 지금 이 준비를 실행 PASS로 표시하지 않는다. 전체 후보30개·새 HTML 렌더·실제 clipboard/저장 경계별 앱 Undo/reload는 NOT_RUN이다. 원본/Dots 문서·3105 서비스·계정·DB/Auth·설정·게시에는 변경이 없다.
