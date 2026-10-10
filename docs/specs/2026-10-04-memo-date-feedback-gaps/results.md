# 메모·날짜 후속 갭 결과

2026-10-04. 이번 목표는 **격리 후보 구현·검증·보고까지 완료**다. 개발계 반영과 제품 전체 UX 완성은 아니다. [요구별 대조](requirements.md)·[실행 원장](qa.md)·[짧은 HTML 보고서](../../content-audit/2026-10-04-flowme-memo-date-feedback-gaps-report-ko.html)를 함께 본다.

## 구현한 기능과 확인한 기존 지원

날짜 바로가기의 저장 응답이 늦게 도착할 때 이후 날짜 입력이나 새로 연 다른 항목의 날짜 초안을 덮어쓰는 결함을 재현했다. `ProgramSpace`에서 항목 ID·대화상자 세대·입력 세대를 함께 확인해, 요청이 시작된 입력에만 성공 결과를 반영하도록 수정했다. 시간만 새로 입력하거나 같은 항목을 닫았다 다시 여는 경우도 보호한다. 저장 command·CAS·원문 모델·schema·기존 정상 성공과 unchanged 처리는 바꾸지 않았다.

새 기능으로 더하지 않은 기존 지원도 확인했다. 문서/기간에서 날짜 fill·native 키보드 적용, 같은 제목의 독립 항목과 정확 원문 복귀, 부분 선택 clipboard 붙여넣기, native 초안 Undo와 성공 snapshot Undo/Redo, 저장 거절 후 직접 재저장·reload는 현재 경로에서 통과했다. MD08 세 표현은 현행 parser 의미를 유지했다.

원 피드백의 ‘10/05→10/08 변경 후 복귀’는 정상 경로에서 재현하지 못했다. 이번 지연 응답 결함이 원 관찰의 원인이라고 단정하지 않는다. 원 PDF/ZIP은 미열람이다.

## 변경한 파일

모든 경로는 이번 새 clean 작업본 기준이며 원본 dirty/제공 worktree 소유 파일을 가져오지 않았다.

| 구분 | 파일 |
| --- | --- |
| 제품 runtime 1 | [ProgramSpace.tsx](../../../components/flow/integrated-poc/ProgramSpace.tsx) |
| 기존 테스트 문맥 1 | [ProgramSpace.context.test.tsx](../../../components/flow/integrated-poc/ProgramSpace.context.test.tsx) — 새 ref를 두 AST 평가 문맥에 전달 |
| 신규 날짜 10 | [ProgramSpace.date-roundtrip.test.tsx](../../../components/flow/integrated-poc/ProgramSpace.date-roundtrip.test.tsx) |
| 신규 부분 선택 14 | [컴포넌트8](../../../components/flow/integrated-poc/ProgramTextEditor.partial-paste.test.tsx)·[모델/저장6](../../../lib/flow/integrated-poc/text-partial-paste-regression.test.ts) |
| 신규 MD08 3 | [undated-expression-regression.test.ts](../../../lib/flow/integrated-poc/undated-expression-regression.test.ts) |
| fixture 보호 4 | [feedback-gaps-fixture.test.ts](../../../scripts/personal-workspace-poc/feedback-gaps-fixture.test.ts) |
| 기존 fixture 보완 | [memo-date-browser-fixture-20261004.ts](../../../scripts/personal-workspace-poc/memo-date-browser-fixture-20261004.ts) — fresh 상태 선검사·opt-in 지연/거절·exact build 보호 |
| 새 fixture bundle 생성 | [feedback-gaps-browser-fixture-20261004.mjs](../../../scripts/personal-workspace-poc/feedback-gaps-browser-fixture-20261004.mjs) |
| 실제 앱 시나리오 | [앱30](../../../scripts/personal-workspace-poc/qa-feedback-gaps-app-20261004.js)·[race2](../../../scripts/personal-workspace-poc/qa-feedback-gaps-races-20261004.js)·[추가11](../../../scripts/personal-workspace-poc/qa-feedback-gaps-extra-20261004.js) |
| 보고서 검사 도구 | [보고서 QA](../../../scripts/personal-workspace-poc/qa-feedback-gaps-report-20261004.js)·[단일 HTML localhost server](../../../scripts/personal-workspace-poc/serve-feedback-gaps-report-20261004.mjs) |
| 목표/요구/계획/결과 | 이 spec 폴더의 `spec.md`, `plan.md`, `tasks.md`, `requirements.md`, `qa.md`, `results.md`, [별도 UX 검토](ux-review.md) |
| 현재 진입점 | `docs/STATUS.md`, `docs/PROJECT_CONTROL.md`, `docs/ROADMAP.md`, `docs/specs/README.md`의 최신 절편 안내 |
| 읽기용 결과 | `docs/content-audit/2026-10-04-flowme-memo-date-feedback-gaps-report-ko.html` |

원본 로그·capture·bundle·빌드·의존성은 `.tmp/feedback-gaps`와 `output/playwright/feedback-gaps`의 gitignored 로컬 증거다. 보고서 공개 가능 여부와 원본 증거 공개는 구분하며 이번에 게시하지 않았다.

최종 Git 확장 목록은 소유26파일(기존 modified7·신규19)이다. scope reporter는 untracked spec 폴더를 한 경로로 묶으므로 path 수20과 실제 파일 수26을 구분한다. 삭제·rename·stage0.

## 테스트와 시뮬레이션

- 신규 모델/컴포넌트/fixture: 31개. 관련 기존181개와 합동 실행 **212/212 PASS**.
- `npm test`: **2,261/2,261 PASS**, 15 lane, fail/skip/cancel0, exit0. 위 표적 검사와 전역 고유 건수로 합산하지 않는다.
- 통합 타입검사: 검사기10/10 PASS, 588 entry의 진단0, exit0. 최초 테스트 선언 오류3건은 보완했고 실패 로그는 남겼다.
- production build: 수정본 `lPblD_VvlR6bemR8EV0l1`, exit0.
- 실제 Chromium 앱: 앱30·race2·추가11 = **43/43 판정 PASS**. 앱30 준비 재실행과 중단된 harness 시도는 중복/실패 이력으로 별도 보존했다.
- 읽기용 보고서: 390×844·1440×900 실제 렌더2/2 PASS, overflow/깨진 이미지/console/page error0. 앱43과 별도로 집계했다.
- 저장 오류·같은 값·Escape·dirty native Undo의 명령 수, 정확한 ID·원문·저장 snapshot, 보호값과 외부 전달을 함께 확인했다. 자세한 시나리오별 결과·반복 수·초기 FAIL은 [QA](qa.md)에 있다.

‘두 이벤트 cut→paste’는 일반 원문 복사와 명시 이동을 구분한다. 기록 없는 원 항목을 잘라 저장한 뒤 다시 붙이면 새 ID와 목적지 구획일이 생긴다. 진행 기록이 있는 항목을 cut하면 거절하고, 명시 이동은 기존 ID/날짜/기록을 보존한다. 이것을 자동 ID 재결합·공통/회차 메모 정책으로 바꾸지 않았다.

## 브라우저 화면별 평가

390×844·375×812·844×390·1024×768·1440×900에서 문서 가로 넘침과 dialog 넘침0, 닫기/적용/미정 버튼 높이48px·hit-test 도달을 확인했다. console/page error0. root가 모바일390·가로844·데스크톱1440 capture를 직접 검토했다. 짧은 가로 화면은 dialog 내부 스크롤이 필요하다.

시각 정보는 읽히지만 날짜·진행·이동·문서 연결이 한 창에 모여 밀도가 높다. 다음 UX 검토에서 조작을 목적별로 묶을 후보이며 이번 구현은 화면 재설계가 아니다. 자동 viewport 검사를 실제 손가락 조작·OS 날짜 선택기·보조공학 검증으로 표현하지 않는다.

## 운영 데이터 불변 근거

브라우저는 fresh 합성 profile만 사용했다. 운영 계정/DB에 Auth/API를 전달한 횟수0, 기존 prefix 밖 setItem/removeItem/clear0, 합성 운영 key 표식 bytes와 공개 원본 동일. 실제 DB 전후 byte 비교는 NOT_RUN이다. 기존 `/my`·writer·schema·계정/DB/Auth/DNS/Tunnel 파일 변경0.

제공 작업본은 계속 HEAD `df0670f...`, build `h6dzC_Ix8aPXcsm-UC-Mb`, Git clean이었다. 기존 app PID26020·manager23684·appStarts2·tunnelStarts1, 자동시작 manifest hash 동일을 읽기 전용 확인했다. 원본 피드백2개 hash도 착수값과 같다. QA 서버는 새 작업본의3106만 사용했으며 정리할 때에도 자신의 실행 세션만 종료한다.

## 남은 결함·의사결정·미실행

| 항목 | 상태 | 다음 처리 |
| --- | --- | --- |
| 원 관찰의 날짜 재복귀·native picker popup | 동일 원인 미확인 / popup NOT_RUN | 정확 조작/원 캡처가 확보되면 재현. 이번 race와 같은 원인이라고 추정해 닫지 않음 |
| 자유 문구 ‘날짜 미정’ 자동 명령화 | 현재는 일반 문장. 자동 전환 미승인 | `[미정]`/개별 속성의 현행 지원 안내와 새 문법 결정을 분리 |
| 복제·반복·공통/회차 메모·독립 due | PC03/PC04 미결 | UX 계약·소유/기간/회차/기록 보존을 먼저 합의 후 개발 |
| 메모 자연 본문·빈 줄 종료·시간만 편집 시 날짜 상속 | 별도 정책 미결 | 원래 원장 유지; 이번 표시·guard 수정으로 정책을 확정하지 않음 |
| 긴 상세 창의 조작 밀도·시간 발견성·폴더 개념·공개 콘텐츠 진입 | 넓은 UX 후속 | [26개 표](requirements.md)에서 원 관찰/기존 지원/추가 시험을 구분해 선택 |
| 실제 Android/iOS·OS IME·AT·장기 통신 | NOT_RUN | 현재 자동 브라우저 결과와 합산 금지. 관찰 사용은 사용자 요청에 따라 보류 |
| 지연 요청 중 컴포넌트 unmount | 이번 신규 직접 검사 NOT_RUN | 새 mount를 덮는 경로는 리뷰에서 발견하지 못했으나 unmount 보호 검증 완료를 주장하지 않음 |
| 5D/F6~F10·운영 후속·이전 CI E2E 재시도4건 | 이전 원장 잔여 | 이번 좁은 목표의 숨은 선행 조건으로 붙이지 않음 |

다음 권장 절편은 **이 guard 수정과 회귀·증거를 선별 게시하고, 같은 판본의 CI/QA를 거쳐 개발계에 반영**하는 것이다. 새 제품 정책 묶음과 긴 dialog의 UX 재구성은 별도 목표로 잡는다. 기존 게시 승인을 이번 새 소유 변경의 무제한 반영 승인으로 확대하지 않았다.

## 게시·배포·관찰 원장

| 항목 | 이번 목표 |
| --- | --- |
| commit | 미실행 |
| push | 미실행 |
| PR | 신규 생성/수정 미실행 |
| CI | 새 외부 실행 미실행 |
| 개발계 교체 | 미실행; 기존 제공본 유지 |
| Preview | 미실행 |
| Production | 미실행 |
| 실제 기기 | 미실행 |
| 관찰 사용자 | 0명 |

독립 검토에서 fixture의 기존 profile 선거절과 race의 canonical 저장 판정 두 P2를 지적받아 보완했다. 재검토는 두 건 해결·추가 중대한 결함 없음, 별도 날짜10+fixture4 테스트14/14 PASS였다. 전체 제품 요구 커버리지를 퍼센트로 계산하지 않는다.
