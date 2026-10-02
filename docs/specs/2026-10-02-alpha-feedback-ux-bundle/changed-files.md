# 이번 목표의 변경과 보존 범위

작업 공간은 `D:/flowme2605/flow-flow-execution-ux-20261001`, HEAD는 `9333b29931c838a51a5034e15e908ef0218e154b`다. 직전 목표의 변경이 이미 있던 격리 작업본을 재사용했다. 아래 목록은 이번 목표의 편집 범위이지 전체 dirty diff를 게시해도 된다는 승인이 아니다.

## 제품·테스트

| 경로 | 이번 변경 | 이전 변경 보호 |
| --- | --- | --- |
| `components/flow/integrated-poc/ProgramTextEditor.tsx` | 실제 폴더 위치 preview·snapshot 확인·직접/입력 제안 연결 | 기존 개인 일정·저장 ACK·입력 보존 경로 유지 |
| `components/flow/integrated-poc/ProgramTextEditor.module.css` | 폴더 위치 설명의 줄바꿈·강조 | 기존 스타일 유지 |
| `components/flow/integrated-poc/ProgramSpace.tsx` | 실제 execution 행의 오늘/지난 미완료 제목·날짜 출처 표시 | 같은 행/ID/키/순서·기존 개인 일정 경로 유지 |
| `components/flow/integrated-poc/ProgramSpace.module.css` | 날짜 제목 표시 | 기존 스타일 유지 |
| `components/flow/integrated-poc/ProgramRecurrence.test.tsx` | 이전 내부 변수명 대신 현행 행·키·이동 경로 확인 | 회차 CAS·metadata 보호 유지 |
| `components/flow/integrated-poc/ProgramTextEditor.folder-preview.test.tsx` | 실제 편집기 JSX·선택/확정 guard 검사 | 신규 파일 |
| `components/flow/integrated-poc/ProgramSpace.date-presentation.test.tsx` | 실제 날짜 JSX 행·key·callback 검사 | 신규 파일 |
| `lib/flow/integrated-poc/folder-link-preview.ts`·`.test.ts` | 읽기 전용 실제 삽입 위치·문서/원문/소속 stale 검사 | 신규 파일 |
| `lib/flow/integrated-poc/execution-presentation.ts`·`.test.ts` | 행을 재정렬하지 않는 날짜 표현·canonical 출처 | 신규 파일 |
| `lib/flow/integrated-poc/feedback-writing-regression.test.ts` | 실제 입력 callback·parser/controller 작성 조합 회귀 | 신규 파일 |

제품/검사 12개 경로다. 표적45개는 통합2,901개 및 관련 회귀와 겹치므로 유일 테스트 수로 더하지 않는다. 제목 중간 Enter의 기존 identity 거절은 보호 테스트로 명시했으며 저장 성공 기능으로 바꾸지 않았다.

## 검증 도구

모두 신규이며 합성 입력·소유 출력만 사용한다.

- `scripts/alpha/feedback-ux-browser.ts`: 실제 앱7경로×5크기35/35 PASS·exit0·fullMatrix true·status NONE. 초기~v5 반복25회(16PASS/9FAIL)·첫35 checkpoint·다음34/1·ACK 단일1PASS를 원 결과로 보존한다. 7개 seed·작성4계약·폴더6위치의 parameter-only 검사는 DOM/브라우저 증거가 아니다.
- `scripts/alpha/feedback-ux-date-browser.ts`: `today-source`의 전체/특정/하위 폴더·완료 맥락, 실제 날짜 변경·동일 Item 보호·Undo/reload, 명시 원문 복귀의 focus/caret 검사. 합성 server postimage와 실제 UI ACK를 구별해 진행/날짜 쓰기 각각 Undo enabled 뒤 복귀 키1회를 검사하며 단일1440은1 PASS다. 준비 함수는 초기 합성 account에만 적용한다.
- `scripts/alpha/feedback-ux-date-browser.test.ts`: 날짜 준비 계약5/5 PASS. 정확한 원문·10항목/완료2·3폴더/6소속·진행20·같은 ID·원본 보존을 검사하며 network/DOM은 사용하지 않는다.
- `scripts/alpha/feedback-ux-regression.mjs`: 기존12회귀×5크기, 60회에 local3107·정확한 빌드/자산·합성 Auth 활성화 preflight·경계/완전한 결과 검증을 강제하는 별도 wrapper. 실제60/60 PASS·fail/skip/retry0·exit0을 최종 JSON으로 확인했다. 기존 config/fixture는 변경하지 않는다.
- `scripts/alpha/feedback-ux-regression.test.mjs`: wrapper의 합성 결과 검증과 server preflight10/10 PASS. 이전9/9 이력을 보존하며 실제60회 PASS로 환산하지 않는다.
- `scripts/alpha/feedback-ux-artifact-browser.ts`: 독립 HTML·보고의 다섯 크기 검사.
- `scripts/alpha/feedback-ux-artifact-server.mjs`: loopback3114에서 소유 HTML 두 파일만 제공. 임의 파일/프록시 접근 없음.
- `scripts/alpha/feedback-ux-isolated-build.mjs`: 명시 소유 입력의 production 사본 build·전후 hash.
- `scripts/alpha/feedback-ux-lab-check.mjs`: 독립 HTML 모델/정적 검사.
- `scripts/alpha/feedback-ux-lab-fidelity.test.ts`: 초기 네 줄의 실제 위치 대응과 이후 모델 차이 명시.
- `scripts/alpha/feedback-ux-protection.mjs`: 원본/실행 작업본 Git·소스/자산/보호 설정 hash 대조. 실제 DB snapshot 아님.

검증 도구는11개 경로다. 최종 앱35회+엄격 회귀60회=95개 경로/크기 조합이 PASS다. 신규 반복 이력은131회·121PASS/10FAIL이며 최종35회와 중복되는 원 시도 수다. 목표의 유일95회와 구별한다. env 누락의 build preflight는 브라우저/시나리오0으로 종료돼 실행/앱 FAIL 수에 넣지 않는다. 최종 label `20261002-enabled-final-ui-ack-35-complete`·session6788은 CLI exit0으로 완주했다. 새 driver의 QA source 보호 대상8개에는 공유 wrapper와 이전 목표의 읽기 전용 fixture도 포함되지만, 그 fixture를 이번 소유 목록에 추가하지 않는다. 이 도구들은 동결한 production build의 입력에 포함되지 않는다.

## 문서·산출물

- `docs/STATUS.md`: 격리 후보 검증 완료·원 실패/미결·서비스 미반영 상태.
- `docs/IDEAS.md`: 새 날짜/반복/마감/문법 정책의 후속 조건. 영구 정책 확정 아님.
- `docs/specs/README.md`: 이번 목표 정본 연결.
- `docs/content-audit/2026-10-02-flowme-feedback-ux-bundle-lab-ko.html`: 독립 조작 시안.
- `docs/content-audit/2026-10-02-flowme-feedback-ux-bundle-report-ko.html`: 원 요구→현재 후보→미결, 실제 실행/제안/미실행 분리.
- 이 디렉터리의 `spec.md`, `plan.md`, `tasks.md`, `qa.md`, `requirements.md`, `interaction-contract.md`, `qa-start.md`, `results.md`, `changed-files.md`, `completion-audit.md`: 목표·추적·설계·결과·요구별 검증 누락과 보완/한계.

소유 Git-visible 경로는 제품/검사12+검증 도구11+문서/산출물15=총38개다. 목록의38개가 모두 존재하며 중복/누락0임을 읽기 전용으로 확인했다. 이전 중간 감사의33개에 날짜 helper/test·엄격 wrapper/test·완료 전 감사 문서5개가 추가됐다. `output/`의 JSON·로그·화면은 로컬 전용 원본 근거로 보존하며 공개 게시에 포함하지 않는다.

## 이번 목표에서 편집하지 않은 것

원본 `D:/flowme2605/flow-mvp`, 실행 개발계 `D:/flowme2605/flow-folder-content-ux-20261001`, credentials·외부 pack·실제 계정·DB/Auth/migration·Tunnel/DNS/설정은 읽기 검사 외 변경하지 않았다. 기본 `/my`·운영 storage writer/schema도 바꾸지 않았다.

현재 dirty 작업본의 `AlphaWorkspace`, `ProgramCreatorWorkspace`, `alpha-persistence`, `alpha-social`, `alpha-sync`, 이전 Flow 실행 검증 도구/fixtures, 이전 목표 문서·HTML, `_workspace/`는 직전 소유 변경 또는 보존 대상이다. 이번 목록에 없는 경로는 이번 목표의 소유로 추정하지 않는다. stage·commit·push·PR·merge·개발계 교체·Preview·Production은 미실행이다.

실제 앱 QA는 첫 시도의 부분 실패부터 모든 재실행을 원 JSON으로 보존했다. 활성화 flag의 초기 누락과 후속 invocation의 local port 누락은 실행 안내/호출 전제 문제이며 사용자 오류나 제품 기능 오류로 판정하지 않는다. source의 canonical/하위 Item·최신1개 Undo·허용 UI recovery 계약과 실제 identity/역연산의 정확한 owner/tab shadow 기록·명시 제거·다른 저장값 불변을 확인했다. 실제 편집→inverse의 보관 기록을 읽기·폴더 preview/취소0쓰기의 예외로 넓히지 않는다. 해당 단계의 account/CAS/command/mutation/operation 증분0과 정상 날짜/메모 저장의 합성 명령을 구별하며 실제 외부 API/Auth/DB 전달·운영 쓰기·실서비스/게시/배포0 경계를 유지한다.

엄격60회는 UTC01:43:01.928Z~01:45:45.066Z,60/60 PASS·exit0·자산24개 일치·입력1,193개 차이0이다. 원34/1의Today1440 복귀 timeout은 UI ACK 대기 보완 뒤 단일1PASS와 최종35/35 PASS로 재확인했다. 최종 보고5/5·20checks·소스/응답hash 일치, 보호 다섯 범위 불변, 실제 소유 diff/closeout·독립 요구/판본/경계 대조까지 확인해 이번 범위만 완료 판정한다. blocked 상태 전환은 적용하지 않았다. 목표 범위와38개 소유 경로는 유지한다. 원장26개와 #2/#15/#20 정정도 전수 읽기로 대조했고 원 SHA256 `D862834C3BF1B62D1EE7C12514B5E2389EB33A26283C9C5AFE1D259FE7A30A62`가 유지됐다. 이 문서 갱신 자체는 runtime/fixture/build·원본·실행계 변경을 수반하지 않는다.
