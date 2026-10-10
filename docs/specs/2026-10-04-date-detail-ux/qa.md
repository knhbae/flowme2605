# 최종 검증 원장

2026-10-04. 최종 후보 build `jAYFY3t3SI-FCYcsQvJG_`, 미커밋 source. 시작 HEAD `a30ab173788f5d9ac4dd553bf8e85073546cf20a`. 아래는 이번 작업본에서 실행한 결과다. 기존43 PASS/CI4/운영7을 새 실행 수에 넣지 않는다. [시나리오별 결과](results.md)와 [요구 대조](requirements.md)를 연결한다.

## 자동 실행

| 실행 | 결과 | 근거 |
| --- | --- | --- |
| 표적82 | PASS82 / FAIL0 / SKIP0 / 취소0, exit0 | `output/playwright/date-detail/targeted-unit-frozen-82-20261004.log` 실제 footer |
| fixture6 | 신규 date-detail2+기존 feedback-gaps4, PASS6/FAIL0/skip0/취소0 | `output/playwright/date-detail/fixture-unit-final.log` |
| 통합 추가 suite | PASS3,071/FAIL0/skip0/취소0,288파일/worker2/512MiB, drift0, exit/verified0 | `output/integrated-product-poc/new-tests-2026-10-04T13-27-55-817Z.json/log`,13:27:55.817–13:45:11.287 UTC |
| npm test | PASS2,261/FAIL0/skip0/취소0, drift0, exit/verified0 | `npm-test-2026-10-04T13-28-19-145Z.json/log`,13:28:19.145–13:30:57.284 UTC |
| 타입 | entry589/source664/diagnostics0/drift0 | `output/integrated-product-poc/targeted-types.json` |
| production build | exit/verified0/drift0 | `build-2026-10-04T13-28-07-062Z.json/log`,13:28:07.062–13:32:33.227 UTC |
| 실제 앱 CLI | core40/40 + faults9/9 + long-title12/12 =61/61,errors0 | `output/playwright/date-detail/app-summary.json` 및 `app-{core,faults,long-title}-results.json`, 정확build/source drift0 |
| 별도 HTML CLI | H01–17 +5크기HI/HC/HE =32/32,errors0 | `output/playwright/date-detail/prototype-results.json`, `prototype-final-cli.log` |
| 문서·closeout | 문서4/4 PASS·closeout exit0·diff check 성공 | 아래 마감 근거 참조. closeout 자체는 테스트 실행/운영 반영 증거가 아님 |

서로 겹치는 실행을 고유 test 수로 합산하지 않는다. 추가 suite는 기존 read-only catalog pack을 명시한 동일 assertions다. SHA256 `723ABEFDC26243EB1F9B4BCF21730758ECC7A300494AD2AE75293AC5C6DDE4BE`가 전후 동일하다.

## 실제 앱 경로와 시험 경계

빈 포트3115에 final production build를 합성 env로 기동했다. fresh CLI 브라우저에 기존 `memo-date-browser-fixture-20261004`를 설치해 가상 `https://alpha.wikiplans.com/alpha`의 정확 GET assets만3115로 전달한다. 주소가 개발 도메인처럼 보여도 실제 DEV를 조작하는 시험이 아니다. 실제 credential/environment secret을 읽지 않았고 Auth·account/API는 모두 합성 응답이다. 실제 backend 전달/쓰기0.

fixture의 forwarding은 기존3106 또는 이번3115의 정확 localhost origin만 받는다. 그 외 host/port·credential·encoded traversal·API·Auth·외부 asset·WebSocket·기존 cookies/localStorage/IDB/serviceWorker profile은 거절한다. default3106은 유지한다. 실제 fixture6과 app61에서 이 경계를 검사했다.

core40: D00/D01A/D01–D19 +6크기별 초기/접힘/펼침18 +보호검사1. faults9: D00/F01–F07/보호검사. 긴제목12: D00 +3크기별 title/nearest hit/실제키보드9 +command0/보호검사2. root가 실제 CLI를 실행했고 독립 리뷰 agent는 코드 검토만 했다.

core는390×844,375×812,844×390,600×800,1024×768,1440×900. 문서/dialog 가로 overflow0, 핵심 action48px(기준44이상)·scroll 후center hit·화면 안 조작 가능, console/page error0. 초기에 모든 버튼이 한 화면에 보인다는 주장은 하지 않는다. 날짜 heading은 새 창에서 sticky 제목 아래·scrollTop0이다.

긴 제목은375×812,844×390,1440×900에서 title max-height3줄 및 내부 overflow를 유지하며 같은 전체 제목을 보존한다. 기본216+복귀 확인3=219 실제 Tab/Shift+Tab. 문서 밖 전이3건은 `document.hasFocus()=false` BODY이며 다음1회 같은 방향 키로 같은 열린 dialog에 복귀했다. 특정 Chrome UI의 직접 관찰로 단정하지 않는다. [HTML 순차 초점 규칙](https://html.spec.whatwg.org/multipage/interaction.html#sequential-focus-navigation)의 UA controls 경계를 참고하되, 앱 controls는 모두visible/hit 유지·dialog밖DOM/초점 있는BODY/최대2회내미복귀는FAIL이다.

실제 screenshot375/390초기·844펼침/긴제목·600/1024/1440초기·긴제목375를 열어 렌더를 검사했다. 캡처와 HTML 비교/의도적 편차는 [UX 검토](ux-review.md)에 기록했다.

## 실패·수정·재실행 이력

1. 초기 관련47건 중41PASS/6FAIL: 같은 이벤트의 새 task 선택 전에 이전 대상 progress 값을 baseline으로 읽었다. 선택한 정확 target의 저장 기록에서 초기값을 읽도록 보완.
2. 독립 review: ACK 기준 ref가 업데이트돼도 같은 성공 문구/no-op은 React render를 만들지 않을 수 있음. transient state로 보완, DX14에서 자동 committed tree를 검증. 새15개DX 포함 표적82PASS.
3. 초기 type1진단: 새 test union narrowing 부족. assertion narrow를 수정한 최종589 entry 진단0.
4. source 편집 도중 실행한 중간npm/build/type는 source guard 실패 또는 중단으로 보존. compile 성공만으로 final PASS로 사용 안 함.
5. 통합 초기 catalog fixture ENOENT 및 source 교정 중 중단은 진단 실행. 최종 read-only pack을 명시했다. 256MiB/2worker 통합은3,065실행·3,063PASS/2FAIL, backup-capacity/catalog-content-v3-lifecycle worker가 exit134/heap 한도로 종료됐다. 제품 제한이나 asserts를 바꾸지 않고512MiB/2worker로288파일 전체 재실행해3,071PASS.
6. 첫 앱 판본의 SDK 금지 debug storage 탐지: install은 ignore-scripts였고 기존 pinned SDK postinstall debug-probe patch와 Next cache가 불일치했다. 기존 patch를 실행하고 이 작업본의 owned `.next/cache`만 `.tmp/prepatch-next-cache-20261004`로 회복 가능하게 이동해 새 build. SDK dependency/lockfile·기존DEV 변경0. 최종 금지 storage0.
7. 첫 조작 HTML의 reopen scroll/title overlap 수정. selector/rAF/outputdir 준비 오류도 분리. 최종32PASS.
8. 중간 실제 앱P__ core는22PASS/1FAIL(390 펼침)이며 재현도동일. raw expanded.apply y19.05–67.05,scroll369,stickyheader DIV에가려hitfalse. 단순 retry로 덮지 않고task-only scroll padding116.5/end6·focus margin 중복 제거·DX15추가. finaljAY 첫 core40PASS. 초기 FAIL JSON/log 보존.
9. 긴 제목 첫3PASS/1FAIL은 native 순회의 문서밖 전이를 앱 control처럼 검사함. document focus/전후raw와최대2회 내 실제키복귀 조건을추가. 영구 focus loss 예외를허용하지않으며 제품focus trap추가0. final12PASS/219키/3회복귀.

## 재실행 방법

현재 작업본에서 표적은 `node --import tsx --test`로 DX/date-roundtrip/private-schedule/context/date-presentation/core-personal/touch-move/TextEditor.context 여덟 묶음 실행. fixture는 `date-detail-fixture.test.ts`, `feedback-gaps-fixture.test.ts` 두 파일이다. 통합은 읽기 전용 pack env를 지정하고 `node scripts/personal-workspace-poc/program-verify.mjs new-tests 2 512`. 기본은 `program-verify.mjs npm-test`, `program-check.mjs`, `program-verify.mjs build`다.

빌드 후 `build-date-detail-browser-fixture-20261004.mjs`로 CLI callbacks 생성, `start-date-detail-qa-20261004.mjs`로 전용3115를 시작한다. fresh CLI about:blank에서fixture/core/faults를 실행하며, 별도freshcontext에서long-fixture/long-title. `record-date-detail-qa-20261004.mjs`는 실제CLI로그를 JSON으로 직렬화하고정확build/source/경계를 검증할뿐 새 browser/server/API를 실행하지 않는다. 조작HTML은 exactGET전용3116 또는 로컬file로만 연다. 다른 서버·실제로그인profile로 시험하지 않는다.

## NOT_RUN / 제외

전체 역사적 `npm run test:e2e` suite는 이번 미실행이다. 대신 변경된 사용자 경로를 실제 앱61+HTML32의 표적 CLI E2E로 검사했다. dependency/lockfile·운영 배포 절차를 바꾸지 않아 새 `security:audit`/CI dispatch는 이번 목표에서 미실행. 직전audit/CI를 이번 실행수로 주장하지 않는다.

실제Android/iOS·IME·AT·native날짜popup·실DBbyte비교·실제Auth메일/계정시험·관찰사용자·서버전환/복귀·commit/push/PR/Preview/Production은NOT_RUN/범위밖. backend 전달0·합성account불변을 실제DB검사로 표현하지 않는다. 조회/접기/Escape/원문이동0commands와 source/owner 원자회귀는 이번 범위이며 physical drag/pointercancel 전체는 새검사아니다.

원본 근거는 output의 로컬 전용이다. 요약과 과거실패를 보존하며 raw를 공개Git에 자동포함하지 않는다.

## 문서·소유 경로 마감

13:54:55.631–13:54:57.453 UTC 문서 검사4/4 PASS, exit/verified0·source 변경0이다. `output/integrated-product-poc/docs-2026-10-04T13-54-55-631Z.json/log`에 skill sync와 필수 문서16개·로컬 링크7,792개 검사를 기록했다. 마감 문서 수정 뒤14:01:16.685–14:01:18.879 UTC 재실행도4/4 PASS·exit/verified0·source 변경0이며 `docs-2026-10-04T14-01-16-685Z.json/log`에 보존했다. 실행 수를 앱 시나리오61개에 더하지 않는다.

13:54:58.470 UTC `workflow:closeout`은 scoped report를 생성하고 exit0으로 끝났다. 범위는 `components/flow/integrated-poc,docs,scripts/personal-workspace-poc,scripts/content-audit`다. 이 보고서의 수정9·미추적11은 디렉터리 묶음을 포함한20경로이며, `git status --untracked-files=all`로 펼친 소유 파일은 [manifest](manifest.md)의27개다. 자동 권고 목록을 실제 테스트 수행 결과로 사용하지 않았다. root의 실제 diff 검토와 독립 읽기 전용 경계 검토를 마쳤고 `git diff --check`도 성공했다.

읽기용 결과 HTML은 로컬 file에서390×844·1440×900 렌더를 확인했다. 가로 overflow·page/console error0이며 키보드로 근거 disclosure를 열고 조작 HTML 링크로 이동했다. `output/playwright/date-detail/report-browser-final-cli.log`의 `pass:true`와 세 캡처가 근거다. 최초 링크 수 기대값 오류는 이전 로그에 남겼으며 별도32개 조작 HTML 결과와 구별한다.

개발계 반영은 미실행이다. 14:01:40.495 UTC 제공 작업본 HEAD `a30ab173...`·Git clean·3105 HTTP200/기존 build `i1cCVh7vp0aJTTKyEAtMY` 존재·새 후보 build 부재를 읽기 확인했다. 기존3105·관리13105·지원3106/3107을 시작/종료하거나 설정을 바꾸지 않았다. 이번 소유 시험 서버의 검사 종료는 제품 반영이 아니다.
