# 전체2 B — 기존 OPIc Map 진행·참조 연결

2026-09-20. 기존 Map 프로필의 revision8에서 실제 UI로 새 참조 문서 1개, 포함된 첫 주 항목의 10/12 누적 진행25%, 같은 항목 참조 1개를 만들었다. 성공 저장은 3회이며 revision11이다. 원본 변경은 실행하지 않았다. 전체2 B의 제작 기능이나 C/D를 완료한 보고서가 아니다.

## 요구별 실제 근거

| 요구 | 결과 |
| --- | --- |
| 기존 Map을 경험 작성 없이 실행 | 기존 한 달 OPIc의 첫 주 `legacy-item-c7c87ab32ea7c82fceedaf01351516e3`에 10/12·25% 기록. 기존 2주 자료의 기록은 보존 |
| 같은 항목을 개인 문서에서 참조 | `doc-eeadb1e4-e85d-475e-b813-937bf9d06ac4`를 UI로 만들고 task binding 하나 추가. 기간 목록에는 한 행만 표시 |
| 정확한 원래 문서·항목 복귀 | 연결된 항목→원래 문서의 항목 열기로 `legacy-flow-e1ebbec656aee1cafc25a6c8bbac8b96`, textarea caret29가 첫 항목 시작29와 일치. 원문 포커스 해제 후25% 표시 |
| 원본·기간·문서 연결 | 전체 할 일25%→같은 개인 문서→원본·개인 계획 확인→정확한 source owner→같은 개인 문서. 모두 추가 저장0 |
| 새로고침 복구 | 참조 문서의 실제 reload, 전체4개 local key/value와 session bytes 동일. 편집 포커스 해제 후25% 표시 |
| 기존 운영 영역 보호 | QA Map 프로필의 채워진 운영3키 byte-for-byte 동일. 전체 관측 쓰기는 정확한 PoC Program key의 성공 setItem3건. 범위 밖 setItem/removeItem/clear0건 |

## 실패와 후속 검증

아래는 확인점 수이며 서로 중복된다. 요구사항 개수나 신규 자동 테스트 개수로 합산하지 않는다. 모든 artifact는 `output/playwright/integrated-program/` 아래에 있다.

| 실제 artifact | 확인점·결과 |
| --- | --- |
| `whole-two-b-map-execution-resume-2026-09-20T04-59-00-332Z.json` | 6확인·0쓰기. app 진입/4키 정확. 수집기에 performance resource를 누락해 runtimeMatchesBuild=false. 실제 documentBuildId는 일치. 후속 runner에서 route asset까지 대조 |
| `whole-two-b-map-execution-2026-09-20T05-01-02-102Z.json` | 36확인 뒤 QA 불변 가정 실패. 실제3쓰기8→11. 정상 생성/진행/연결 receipt3개도 불변을 요구한 잘못. 기존 receipt2개는 유지 |
| `whole-two-b-map-execution-tail-2026-09-20T05-03-32-130Z.json` | 4확인 뒤 원문 caret 활성행에서25% 버튼을 기대해 실패·0쓰기 |
| `whole-two-b-map-execution-finish-2026-09-20T05-05-12-033Z.json` | 19확인. 원래 문서/기간25%와 source 왕복 확인. 참조 편집 활성행의25% 기대에서 실패·0쓰기 |
| `whole-two-b-map-execution-reload-2026-09-20T05-06-30-727Z.json` | 7확인. 5크기 가로 넘침0. 실제 reload 뒤 textarea 활성행에서25%를 기다려 timeout·0쓰기 |
| `whole-two-b-map-execution-focus-2026-09-20T05-08-50-448Z.json` | 12확인. 정확 원문 caret와 blur 뒤 양쪽25% 복원. resize가 다시 그리는 버튼에 scrollIntoView를 호출해 detached 오류·0쓰기 |
| `whole-two-b-map-execution-captures-2026-09-20T05-09-35-524Z.json` | 9확인 통과·0쓰기. 5크기25% 캡처 및 실제 reload/blur 복원, 전체 bytes 보존·page/console오류0 |

첫 3회 거래의 상세 envelope와 압축 Undo는 실제 transition 재생 (로컬 전용 근거: `../../../output/integrated-product-poc/whole-two-b-map-crosscheck-2026-09-20T05-14-09-403Z.json`) 27확인으로 대조했다. createProgramDocument→recordProgramTaskProgress→linkProgramTask와 makeProgramEnvelope·commitProgramEnvelope를 분리된 메모리 저장소에서 실행했다. 새 ID의 UUID 난수만 실제 생성된 두 값으로 공급했으며 결과나 validator는 교체하지 않았다. revision9/10의 원래 full wire는 보관하지 않았으므로 생성된 bytes의 SHA를 당시 관측값과 대조했다. 둘 다 일치하며 실제11의 Undo snapshot도 일치했다. 최종11은 보관한 전체 wire와 byte-for-byte 동일했다. 기존 actor에서 text 이외 필드, text의 기존 flows·다른 구조, 다른 인물·공개 데이터는 유지됐다. 새 receipt는 private-document-create/private-task-progress/private-task-link 각각1개다.

이 교차검증 당시 병렬 제작 복구 작업의 제품 파일11개가 과거 빌드 manifest와 달랐다. 바뀐 경로를 결과에 남겼으며 전체 소스가 동결돼 있다고 주장하지 않는다. 브라우저 실행판은 계속 `pIfd2DvMfHy2BICAkWF9L`이다. 이 detached 검사는 현재 validator와 실제 Map/private/store 함수로 저장된 결과가 정확하게 재생됨을 확인한 것이며, 후속 제작 수정의 새 production build 검증을 대신하지 않는다.

## 진행률이 잠시 안 보인 이유

`vendor/text-editor.cjs`의 render는 textarea가 활성일 때 선택 행을 원문으로 표시한다(797~839행). 이때 진행률 장식 버튼은 만들지 않는다. blur 이벤트는 requestAnimationFrame 뒤 장식을 다시 그린다(195~219행). 이번 원문 재진입과 reload는 원문 편집 위치에 포커스를 돌려주므로 이 계약이 적용됐다. 제목을 실제로 클릭해 편집 포커스를 해제하고 기다리면 같은25%가 다시 보였다. 저장 손실이나 영구 버튼 소실로 판정하지 않으며 runtime을 수정하지 않았다. 활성행/비활성행을 구별하지 않은 QA 가정을 실패 기록에 남겼다.

## 직접 확인한 화면

최종 `whole-two-b-map-execution-captures-2026-09-20T05-09-35/36-*` PNG5개를 직접 열어 확인했다. 390×844·375×812에서 참조 제목과 항목이 줄바꿈되며25%와 메뉴가 보인다. 844×390은 높이가 낮아 항목이 화면 하단에 위치하며 아래 내용은 스크롤이 필요하다. 1024×768·1440×900에서 왼쪽 문서 목록과 참조 본문/25%가 함께 보인다. 가로 넘침0은 측정했지만 전 행동 hit검사나 실기기 검사로 확대하지 않는다.

## 다음 실행값

CLI `map-child-removal-20260914`, 기존 profile `program-map-child-removal-20260914`. 마지막 revision11, SHA256 `bc44eed3ab8d8636f49dd4d8dae5dc70e8428aaeccec9979513ad82e0ddbdd58`, generation `1789880976418.3`, observer `__mapBExecution`, runId `map-b-execution-2026-09-20T04:59:00.851Z`, offset0. 참조 문서 화면이며 미제출 입력/열린 dialog 없음. 다음 D 원본 변경 전에 이 정확한 상태를 다시 읽는다. 기존 seed·처음 mutation runner 재실행 금지.

새 관측은 닫혔던 브라우저를 같은 profile로 재개한 뒤 설치했다. 이전 프로세스 관측 연속성은 주장하지 않는다. reload 직전 마지막 수집과 unload 사이 호출 관측 공백 가능성은 전체 bytes 비교와 구분한다.

변경 파일: `program-whole-two-b-map-execution*.cli.js` 7개와 이 원장. 제품 runtime/원본 데이터 수정 없음. commit·push·PR·Preview·Production 없음. 실제 Android/iOS 미실행, 관찰 사용자0명.

## D의 안전한 연결 설계 — 아직 미실행

기존 group은 `flow-group:curated-opic-mock-course`, 새 진행·참조가 붙은 child는 `saved-flow:curated-opic-course-row-import:flow-curated-opic-course-row-import`다. 현재 이미 제외된 다른 child는 `saved-flow:curated-opic-single-mock-review:flow-curated-opic-single-mock-review`다. 이 두 owner를 바꾸어 부르거나 새 자료로 대체하지 않는다.

현재 UI에서 제공되는 안전한 경로는 원본·개인 계획 확인→Map 구성 변경 확인→현재 Map 구성 비교→정확한 2주 child의 명시 재연결→구성 Undo다. 이때 B의 한 달 진행25%·참조 및1~4주 포함/5주 제외, 기존2주 개인 기록을 보존하는 회귀 검사는 가능하다. 그러나 이를 **B에서 새로 실행한 한 달 child의 새 원본 삭제→재등장**으로 보고하면 안 된다.

`legacy-map-membership.ts`의 readProgramLegacyCurrentMapMembership는 실제 로컬 catalog factory에서 전체 catalogMap/snapshot/persistence/bundles를 다시 만든다. membership UI는 그 결과를 비교·선택·수용·Undo하며 임의의 새 source payload를 입력받는 기능은 없다. 이전 `program-map-child-removal-setup.mjs`는 독립 프로필에 처음 한 번 준비한 삭제 QA snapshot을 주입한 도구이며 누적 프로필에서 재실행할 수 없다.

따라서 D의 새 삭제를 하려면 root가 소유한 별도 source-provider 시뮬레이션 계약을 먼저 확정해야 한다. 동일 owner의 한 달 child만 빠진 완전한 source package를 factory 경계에서 제공하고, 다른2주 child가 남아 빈 Map이 되지 않아야 한다. 원본 운영키·누적 PoC snapshot·기존 fixture는 직접 덮지 않는다. 새 원본 도착 자체는 저장0, 비교/선택/Escape0, 명시 제외1, 정확 child 재등장 자동연결0, 명시 복원1, 구성 Undo1을 예상한다. 각 변경 전후 B의 진행 기록·참조 ID·모든 개인 문서·기준일/포함 정책을 고정해 비교한다. 새 child 추가·전체 Map 비우기·운영 source migration은 이 설계 범위 밖이다.

기존 원형은 `legacy-map-membership.test.ts` 13~43행 및 `legacy-map-membership-transition.test.ts` 44~70행에 있다. 테스트 worker 안에서 해당 catalog 배열의 원소만 원본 객체의 복제본으로 교체하고 flowSlugs에서 정확한 child 하나를 뺀다. 실제 snapshot/persistence factory가 전체 package를 만들며 finally에서 원래 원소를 복원한다. 원본 객체·bundle·파일·운영 storage를 변경하지 않는다. 현재 production UI에 이 provider를 주입하는 prop은 찾지 못했다.

최소 구현 제안은 QA-only 번들에서 이 기존 worker 경계를 재사용하는 별도 component browser harness다. 실제 Program membership/legacy UI를 import하고 보관한 revision11 full wire를 읽기 입력으로 strict 검증한 뒤 분리된 메모리 controller에서 사용한다. QA 번들의 factory 원소만 삭제/재등장 전환하며 사용자 비교·수용·Undo는 실제 component/transition/store 함수를 통과한다. 별도 loopback origin의 exact `/my?personalWorkspacePoc=v1`만 허용하고 native local/session Storage writer는 모두 거절·계수한다. production 서버·누적 브라우저 프로필·기존 fixture는 건드리지 않는다. 이 결과는 component browser harness 증거이며 production 전체 route 검증으로 확대하지 않는다. 이 제안은 아직 구현하지 않았다.

## D component harness 실행 결과 — 위 제안 이후 승인 실행

QA-only `program-map-d-harness.tsx`와3643 로컬 서버를 구현했다. 실제 ProgramLegacyMapMembership·ProgramReferencePanel 및 실제 createProgramController/transition/strict store를 사용한다. 기존 B의 revision11 캡처를 변경 없이 읽고 SHA를 검증하며, controller writer는 분리된 메모리 변수에만 기록한다. `Storage.prototype.setItem/removeItem/clear`는 모두 호출을 계수한 뒤 거절한다. `/my`, 잘못된값v2, 추가query는404이고 exact gate만200을 확인했다. 이 서버는 production3641이 아니며 실제 라우트 전체 검증을 대체하지 않는다.

첫 시도는 기존2주 제외를 유지한 채 한 달까지 제외해 모든 child를 제외하려 했다. 기존 `validateAbsences`의 전체 child 제외 금지 계약에 따라 메모리 commit0,11유지로 거절됐다. 개인 기준일/planSelections 결함이라는 초기 의심은 코드 조사로 철회했다. 첫 실패 (로컬 전용 근거: `../../../output/playwright/map-d-component-harness/map-d-component-2026-09-20T05-21-05-651Z.json`)의9확인과40초 대기 timeout을 보존했다. 영구 제품 정책을 바꾸지 않았다.

이후 책임자 승인에 따라 같은 비교에서 **한 달 제외 + 정확한 재등장2주 명시 연결**을 선택했다. UI가 한 달 삭제와2주 재등장을 각각 표시함을 읽은 뒤 두 incoming 선택을 명시했다. 이2주 membership 복원은 허용한 delta이며 개인 기록/문서/참조/planSelections는 모두 보존했다.

| 단계 | 실제 메모리 결과 | 보존·경계 |
| --- | --- | --- |
| 한 달 삭제 제공·비교·Escape | 저장0 | captured11 exact |
| 한 달 제외·2주 재연결 명시 | 11→12 | 한 달만 제외. B참조는 읽기/원문 복귀 가능, 실행 변경은 보호 |
| 동일 한 달 재등장 제공 | 자동연결0·저장0 | 원래 진행25% 및 참조 유지 |
| 한 달 명시 복원 | 12→13 | 두 child 활성. 동일 원문/참조에서 실행 가능 |
| 복원 뒤10/13 진행40% | 13→14 | 10/12의25% 유지, 새 날짜40% 추가 |
| 구성 전용 Undo | 14→15 | 한 달만 다시 제외,2주 활성 유지.25/40 기록·문서·참조·개인 계획 모두 보존 |

positive runner는35확인 뒤 접힌 details 안의 Undo 버튼을 snapshot에서 찾지 못해 중단했다. 이어 결과 수집기가 중간상태마다 전체 누적 wire를 중복 출력해100MB pipe한도를 넘었다. 원래 `map-d-component-2026-09-20T05-25-07-698Z.log`를 보존했으며 이 실행의 완전한 JSON 결과는 없다. 성공한3거래를 다시 실행하거나 입력을 바꾸지 않았다. 기존14의 compact readback에서 details를 열고 Undo만 이어 후속13확인 (로컬 전용 근거: `../../../output/playwright/map-d-component-harness/map-d-component-2026-09-20T05-26-40-513Z.json`)을 통과했다. 이 결과에는 시작14/최종15 full wire 각각1회, 각 거래 revision/hash 및 실제 factory가 만든 source package2종이 있다.

실제4거래 detached 재생30확인 (로컬 전용 근거: `../../../output/integrated-product-poc/map-d-harness-crosscheck-2026-09-20T05-28-20-688Z.json`)도 통과했다. captured11에서 삭제/복원 preview·apply, 진행 기록, 구성 Undo를 실제 생산 함수와 strict store로 재생했다.12/13/14/15 각 결과 SHA가 관측값과 일치하며 실제14/15의 전체 wire·Undo도 정확히 같았다. 누적 실험 프로필에 결과를 다시 주입하지 않았다.

390px (로컬 전용 근거: `../../../output/playwright/map-d-component-harness/map-d-undo-2026-09-20T05-26-43-799Z-390.png`)와 1440px (로컬 전용 근거: `../../../output/playwright/map-d-component-harness/map-d-undo-2026-09-20T05-26-43-920Z-1440.png`) 캡처를 직접 확인했다. 제외 안내,25/40 이력, 같은 원문ID를 읽을 수 있고 가로 넘침0이다. QA harness의 긴 원문 표시이며 제품 UX 완성도 평가로 확대하지 않는다. page error0, native Storage write0. 초기 `/favicon.ico`404 console error1건은 harness 결함으로 남겼다(React DevTools info와 구분). 운영 라우트 console0 주장에 포함하지 않는다.

분리된 harness 최종값: memory revision15, SHA `d1634d7c724db2067714e712c3d81933dca80b2468baa02fda01e00aa1324f2a`, CLI `map-d-component-20260920`, 서버 process handle49492/port3643. 메모리만 사용하므로 reload는 캡처11을 다시 읽으며 **누적 저장 복구 증거가 아니다**. 원래 Map 프로필은 이 작업에서 접근/변경하지 않았다. 제품 runtime·factory 원본 파일 변경0, 외부 배포0.

## 최종 동일 빌드 Map 왕복 — 2026-09-20

기존 누적 Map 프로필을 그대로 사용해 production 로컬3641의 `ylSngUBlsuD5I1e8zd_09`, `static/chunks/app/my/page-a578091b8c44e11b.js`에서 69/69확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-map-readonly-2026-09-20T06-56-51-250Z.json`)을 통과했다. 원본→같은 개인 문서→전체 할 일의10/12·25%→참조→같은 원문 항목(caret29)→원본→참조와 실제 reload를 검증했다. 시작은 앱 실행 전 같은 origin의 JS plaintext이며, 새 관찰자를 설치한 뒤 앱 진입 직후부터 저장 호출0을 확인했다. 이전 live 문서의 별도 drain4확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-map-live-drain-2026-09-20T06-56-27-128Z.json`)은 기존 observer의 쓰기·위반0과 bytes를 보존한 증거다. 이 drain의 runtimeMatchesBuild=false는 이전 빌드 문서이기 때문이며 최종69확인의 runtimeMatchesBuild=true와 구분한다.

전후 Program revision11과 운영3키 전체 bytes가 동일하고 local/session setItem·removeItem·clear 호출0, page error0, console error0이다. 최종 SHA는 `bc44eed3ab8d8636f49dd4d8dae5dc70e8428aaeccec9979513ad82e0ddbdd58`, generation `1789887511856`, observer `__finalMapRead`, runId `final-map-readonly-2026-09-20T06-56-52-182Z`, offset0이다. 이 값이 위의 이전 B 실행값을 대신하는 다음 실행 기준이다. reload는 새 generation의 관찰이며 unload 사이 관찰 연속성으로 확대하지 않는다. 운영키 `flow:map:saved:curated-opic-mock-course`, `flow:map:persistence:curated-opic-mock-course`, `flow:membership-private-sentinel` 각각의 전후 SHA도 artifact에 보관했다.

390×844·375×812·844×390·1024×768·1440×900 PNG5개를 직접 열어 확인했다. 좁은 세로 화면은 제목·항목이 줄바꿈되고, 가로844 화면은 세로 스크롤을 쓰지만25%와 행 메뉴에 접근할 수 있다. 태블릿·데스크톱은 목록과 본문이 분리되어 보인다. 각 화면25% 조절 버튼은 실제44px 높이, viewport 안 표시·hit 검사 통과, 가로 넘침0이다. 375px (로컬 전용 근거: `../../../output/playwright/integrated-program/final-map-readonly-2026-09-20T06-56-52-182Z-reference-375.png`) · 844px (로컬 전용 근거: `../../../output/playwright/integrated-program/final-map-readonly-2026-09-20T06-56-52-182Z-reference-844.png`) · 1440px (로컬 전용 근거: `../../../output/playwright/integrated-program/final-map-readonly-2026-09-20T06-56-52-182Z-reference-1440.png`). QA 결과의 `metrics.height`는 버튼 높이44가 viewport 높이를 덮은 필드명 충돌이 있어 해상도 근거로 쓰지 않았다. 실제 PNG 헤더의5개 크기와 실행 스크립트의 viewport 배열로 확인했으며 원래 결과를 덮거나 재실행하지 않았다.

이번 검사는 최종 빌드의 기존 Map 읽기 왕복이다. 위3643의 삭제·재등장 component harness와 별도 판정이며, 누적 프로필에 harness 결과를 주입하지 않았다. 실제 Android Chrome/iOS Safari 미실행, 관찰 사용자0명, commit·push·PR·외부 배포 없음.

### 포커스 수정 후 최종 빌드 재확인

공개 파일 복귀의 포커스 수정으로 빌드가 바뀌어, 위69확인은 이전 빌드 근거로 보존하고 `gdvy33rCuvCJ3GJ0GP-Xo`에서 84/84확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-map-focus-readonly-2026-09-20T07-20-17-597Z.json`)을 다시 통과했다. route chunk는 동일하며 실제 document build ID와 runtimeMatchesBuild=true를 확인했다. 같은69개 핵심 확인에 이전 관찰자 보존15개 확인을 더한 수이지 새 요구사항84개가 아니다. 이전 문서 drain4확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/final-map-focus-drain-2026-09-20T07-20-03-536Z.json`)→동일 origin plaintext→새 관찰자→앱 진입으로 진행했으며 기존 observer 배열을 초기화하지 않았다.

원본·canonical 문서·10/12의25%·참조·정확한 원문 caret29·reload 결과가 모두 같고, 운영3키와 Program revision11의 전체 bytes도 같다. 새 관찰자와 기존 관찰자 모두 쓰기0, page/console error0이다. **현재 다음 실행값**은 SHA `bc44eed3ab8d8636f49dd4d8dae5dc70e8428aaeccec9979513ad82e0ddbdd58`, generation `1789888922481.8`, observer `__finalMapReadFocus`, runId `final-map-focus-readonly-2026-09-20T07-20-18-927Z`, offset0이다.

새 PNG5개도 직접 확인했다. 390×844·375×812·844×390·1024×768·1440×900 크기를 PNG 헤더와 대조했고, 이번 metrics는 `viewportWidth`·`viewportHeight`·`controlHeight`를 구분한다. 모든25% 버튼은44px·viewport 안 표시·hit 통과, 가로 넘침0이다. 375px (로컬 전용 근거: `../../../output/playwright/integrated-program/final-map-focus-readonly-2026-09-20T07-20-18-927Z-reference-375.png`) · 844px (로컬 전용 근거: `../../../output/playwright/integrated-program/final-map-focus-readonly-2026-09-20T07-20-18-927Z-reference-844.png`) · 1440px (로컬 전용 근거: `../../../output/playwright/integrated-program/final-map-focus-readonly-2026-09-20T07-20-18-927Z-reference-1440.png`). 화면 평가는 위와 같으며 실기기·관찰 사용자 검증이나3643 harness의 운영 라우트 검증으로 확대하지 않는다. 이번 재검사에서 제품 코드·기존 데이터·ordinary 프로필은 수정하거나 조작하지 않았다.
