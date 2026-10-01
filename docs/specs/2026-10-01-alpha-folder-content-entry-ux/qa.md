# 실행·검증 원장

## 시작

- 새 작업본 HEAD08aa8311·branch agent/flow-folder-content-ux-20261001·dirty0에서 시작했다.
- 최신 origin/main efd8b642와 기존 개발계 branch08aa8311을 읽기 조회했다. remote ref 변경0.
- npm ci는 새 작업본에서만 실행했고223packages/audited224·취약점0이었다. worktree checkout 중 파일 읽기가 먼저 실행되어 일부 경로 부재가 발생했으며, checkout 완료 후 재확인했다. 제품 결함으로 기록하지 않는다.
- UX2에 두 선택의 짧은 검토를 요청했다. 응답은 제안이며 자동 제품 정책/구현 완료가 아니다.

## 실행 결과

| 검사 | 최종 실행 | 판정 / 범위 |
| --- | --- | --- |
| 폴더 helper·편집기 표적 | 59/59 | fail/skip/cancel0. 생성 위치와 부모·깊이·권한·제안 순수성 포함. |
| 콘텐츠 진입·레이아웃 표적 | 89/89 | fail/skip/cancel0. 두 신규 callback 검사 포함. |
| 전체 통합 순수·컴포넌트 | 2,772/2,772 ·267파일 | 09:20:35–09:33:46Z. fail/skip/cancel/source drift0. 기존 읽기 전용 harness·2worker/old-space512MiB/semi-space기본. 최초99FAIL은 아래 별도 보존. |
| npm test | 2,258/2,258 | 08:54:01–08:55:30Z, fail/skip/cancel0, source drift0. |
| 통합 범위 타입 | 564entry | diagnostics0, 639source drift0. |
| production build | PASS | 08:53:33–08:56:15Z, source drift0. 예비 build와 구분. |
| 앱 합성 Chrome |45/45 | 5크기 각각9, first pass, retries0, skip0. |
| 기존 exact-name 폴더 회귀 |5/5 | 5크기각1, retries0. 같은ID/무변경/경로 검사 유지. |
| 독립 HTML 모델 |9/9 | parser/writer·실계정 검사 아님. |
| 독립 HTML Chrome |25/25 | 5크기각5, retries0. 오류 입력 화면 왕복·직접 retry 포함. |
| 최종 보고서 Chrome |5/5 | 마감 수치·파일 목록·게시 상태 반영 뒤5크기 재검사.25개 HTML 본검사와 별도 반복 실행. |
| security:audit |취약점0, 호환4/4 |이 목표의 판본. source drift0. |
| docs:check |4/4 ·16필수 ·6933links | 09:38 실행 성공. 현재 목표·결과·보고서 링크 반영 뒤 검사. |

최종 앱 source 동결639경로 hash `b9555ea7b3d17eb9b6d51e28ba16329e15b6a2d1a297eebaf3796a79b83a342b`. 앱 QA는 build된GET/정적자산만 own3106으로 전달하고 모든 Auth·API·WebSocket은 합성/차단한다. 실제 secret·계정 파일·비공개catalog팩을 사용하지 않는다. 브라우저에서 실제 타이핑·Ctrl+V·클릭·키보드를 수행했지만 저장 응답은 fake server다. 실제 BFF/Auth/RLS·실자료 전체 비교로 확대하지 않는다.

전체 순수·컴포넌트 재실행은 기존 `cloudflare-release-verify.ts`를 사용한다. 보호된 host 설정에서 카탈로그 경로만 골라 원본을 읽기 참조하며 자료/설정 복사·수정·내용 출력은 하지 않는다. OS 실행 환경과 카탈로그 경로·비공개 검증 flag만 검사 프로세스로 전달하고 실제 Auth·signing·계정 정보는 전달하지 않는다. 원본 hash 전후를 대조하고 허용된 집계만 보존하며 raw test output은 보존하지 않는다. 이 검사 자료 경로와 위 합성 브라우저의 자료 경로를 구분한다.

최종 전체 통합은2,772실행/2,772PASS였다. source639·snapshot은 위 동결값과 일치하고 drift0, catalog 원본 hash `723abefdc26243eb1f9b4bcf21730758ecc7a300494ad2ae75293ac5c6dde4be` 전후 동일이다. 실제 계정 정보 전달0·설정 복사0·raw output 보존0. 첫 실패 파일 로딩·중간 종료가 해소돼 총 실행 수가 첫2,751회와 다르며 예상치로 계산하지 않았다.

로컬 원본 증거:

- `output/integrated-product-poc/npm-test-2026-10-01T08-54-01-064Z.json` 및 동명log.
- `output/integrated-product-poc/new-tests-2026-10-01T09-20-35-609Z.public.json`, `output/folder-content-entry/final-full-suite.json`: 허용된 최종 집계와 읽기 참조 경계만 보존.
- `output/integrated-product-poc/build-2026-10-01T08-53-33-299Z.json` 및 동명log.
- `output/integrated-product-poc/targeted-types-2026-10-01T09-02-15-202Z.json`: 타입564entry·diagnostics0·source drift0.
- `output/playwright/folder-content-entry-final-v1/results.json`45, 성공screenshot110·DOM/typography110.
- `output/playwright/folder-writing-entry-old-proposal-final-v3/results.json`5.
- `output/playwright/folder-content-artifact-final-v2/results.json`25.
- `output/playwright/folder-content-artifact-report-final-v2/results.json`5: 최종 보고서의 별도 render 검사.
- `output/folder-content-entry/start.json` 보호7, `final-v1.json` source639, `final-server-v1.json` own QA PID/빌드.
- `output/folder-content-entry/closeout-v1.json`: 마감 보호7hash. 초기 원본과 drift0을 다시 확인했다.

## 시나리오별 경계

F1타이핑2성공명령/2mutation. F2새 이름 paste2/2. F3입력거절은0mutation, retry·연결·Undo 합계3/3·총시도4. F4명시연결거절은0mutation, 성공입력·retry·Undo3/3·총시도4. F5부분/선택/합성조합1/1. C1빈공개0/0. C2공개글 있음/없음 각개인가져오기만1/1; 읽기·출력·복귀0추가. C3private working3+명시save2=5/5. 제안·닫기·Escape·panel취소의 추가command/storage0은 별도assert했다.

45개 앱 경계 첨부에서 외부prefix쓰기0·page error0·unexpected console0·실API/실Supabase전달0·운영sentinel/publicbytes 동일. 정적JS/CSS24개path/hash일치, maxoverflow0. 실제 클릭 전 fullrectangle과 elementFromPoint를 확인해 숨겨진 행동을 강제로 클릭하지 않았다. 폰/태블릿은 데스크톱 Chrome viewport이며 실제 기기가 아니다.

## 초기 오류 / 수정과 최종 판정의 구분

- 첫 전체 통합은08:54:15–09:18:18Z에267파일·2,751회 중2,652PASS/99FAIL이었다. 새 작업본의 비추적 catalog 원본 부재에서 직접ENOENT89·모듈 로딩4·handler503 후속1·dispatch invalid후속4가 파생됐다. 나머지1은 backup-capacity의old-space256MiB/semi-space4MiB heap 초과(exit134)다. 제품 용량 제한을 변경하지 않았으며 동일 백업 용량 파일은512/4MiB로38/38PASS를 확인했다. assertions/제품코드 수정 없이 읽기 전용 자료 경로와 시험 메모리만 보완해 전체를 재실행한다. 로딩 실패가 해소되면 총 실행 수가 늘 수 있으며 최초99FAIL을 삭제하거나 PASS로 바꾸지 않는다.
- 첫 npm 실행은2,258검사가 모두통과했지만 그동안 폴더4source가 수정되어 verifier exit2였다. 최종 source가 아니므로 후속 동결판본의 실행으로 대체했다. 첫log/json은 보존한다.
- 앱 예비390 5PASS/3FAIL은 판본 selector2개 및 catalog 합성 route 누락1개였다. 새 fixture의 exact route/selector를 고치고 frozen45개로 검증했다. 실서비스 장애로 판정하지 않는다. 예비 후선별case 통과도 별도로 보존한다.
- 기존 폴더 회귀5FAIL은 region의 접근성 이름이 기존→일반 제안으로 바뀐 기대문구 불일치였다. literal1곳만 동기화해5/5. sameID/0writes/fullpath 검사를 완화하지 않았다. v1collection은outputguard로거절되어실browser0, v2실패5와v3성공5를 보존한다.
- HTML첫20개는15PASS/5FAIL. reload의 초기화면은내공간인데 바로내활동초안을찾던selector 동선 누락이었다. 내활동 진입을 추가해20/20.
- 이후 독립 검토에서 HTML실패입력의 화면간유실 위험을 찾아 pending buffer/제안숨김/직접retry를 구현했다. 새HTML5를 포함한최종25/25는그이후판본이다. 제품앱결함으로소급하지않는다.
- 도구의 `file://` 직접 방문은 protocol보안정책으로차단됐다. 다른surface/명령으로우회하지않았고 native-file render는미실행이다. 정상 loopback HTTP artifact QA와 구분한다. 파일전달은외부asset없는HTML이며 사용자브라우저미리보기의JS실행지원은확정하지않는다.

## 보호 파일과 게시

현재live작업본의 buildID/config/tsconfig, 기존서버설정2개, privatecatalog팩, 원본feedbackledger의7개hash 전후drift0. 3105앱과기존Tunnel을교체/중단하지않았다. 합성운영key/value와공개hash불변은실DB전체불변의byte대조증거가아니다. 실계정/DB/Auth에쓰기를진행한도구0·실API전달0이다.

## 게시·기기 경계

commit/push/PR/merge/Preview/Production/개발계 교체 미실행. 실제 계정/DB/Auth/Tunnel/DNS 변경0. 실제 기기·OS IME·AT·관찰 사용자 시험은 미실행으로 유지한다.

## 임시 환경 정리

자체 QA3106은 앱 검사 뒤 정확한 PID/부모/명령/포트 확인 후 종료했고 마감 listener0이다. HTML QA3114/PID28240도 같은 소유 확인을 거쳐 종료했다. 의도적으로 종료한 서버 session의 exit1은 테스트 실패가 아니며 원본 증거·HTML·소스는 삭제하지 않았다. IAB의 자체 보고서 탭만 닫고390×844 임시 viewport를 reset했다. 기존3105/PID11220와 Tunnel/PID3864는 실행을 유지하며 보호7·source639의 마감drift0이다.
