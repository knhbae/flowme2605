# K3-B B3 — 현재 보고 HTML 독립 화면·링크 QA

2026-09-06. **검사한 보고서의 다섯 화면에서 페이지 가로 넘침, 핵심 링크 가림, 콘솔·page 오류, 끊어진 로컬 파일 링크는 발견하지 않았다.** 다만 모바일 진행/검증 표는 옆으로 이동해야 마지막 열을 읽을 수 있고, 일부 현재·역사 표기와 npm/build 근거의 최신성은 보완이 필요하다. 보고서 전체 또는 B3 제품 전체가 완성됐다는 판정은 아니다.

제품 기능 검증은 [standalone 통합 QA](./k3b-plan-feedback-integration-qa.md)와 구분한다. 이번 작업은 현재 보고 HTML을 실제 `file://`로 열어 검사했다. 기존 제품·시험·보고 데이터·HTML·CSS를 수정하지 않았다.

## 1. 검사한 정확한 파일

| 대상 | bytes / SHA-256 | 검사 전후 |
| --- | --- | --- |
| 보고 HTML (로컬 전용 근거: `../../content-audit/2026-09-05-flowme-integrated-poc-gap-implementation-ko.html`) | 64,907 / `25B463DF44D1EBB6E115430CA0195EE62EA3E1F6EAEE3C783F3E8896C67E6B8A` | 동일 |
| 상단 CTA의 조작 HTML (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko.html`) | 1,454,070 / `7D1610AACC5C3DF6F33C37BFE7C517700AC8FF56FED9793300E528E05F17E34E` | 동일 |
| 같은 단일 파일 HTML (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html`) | 위 조작 HTML과 bytes/SHA 동일 | 동일 |

처음 검사 해시 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/before-after-hashes.json`)와 후속 검사 해시 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/followup-before-after-hashes.json`)를 각각 남겼다. 이 판정은 위 보고서 SHA에 한정된다. 이후 보고서를 재생성하면 새 파일의 링크·배치를 다시 확인해야 한다.

검사 시각은 첫 자동화 `2026-09-05T17:31:53.925Z`, 저장한 후속 실행 `17:34:04.096Z`다. 한국 시간으로 9월 6일 02:31–02:34다. Chrome `151.0.7922.138`, 새 비영속 headless context, 전용 CLI session을 사용했다. 임시 보고 HTML 사본이나 HTTP route로 대체하지 않았고 실사용 프로필은 열지 않았다. 승인된 로컬 파일 접근 예외를 이 검사에만 사용했다.

## 2. 실제 검사 수와 판정

| 항목 | 실제 범위 | 결과 |
| --- | --- | --- |
| 화면·스크롤 위치 | 5 viewport × 상단/B3 비교/진행/보호 경계 4곳 = 20곳 | 페이지 가로 넘침 0 |
| 핵심 행동 | 상단 3개 + 현재 B3 근거 4개를 5크기에서 검사: 35회 | 전체 rect 화면 안, 높이 44px 이상, focus 성공, 가림 0 |
| 가림 측정 | 행동마다 9점, 합계 315점 `elementFromPoint` | 대상 또는 자손 hit 315/315 |
| 원본 대응 비교 | 4행 × 3셀 × 5크기 = 60셀 | 숨김/가로 잘림 0; 390·375에서 셀별 이름 표시 |
| 키보드 | 390 화면에서 실제 Tab 3회 | 상단 링크 순서·3px focus-visible 확인 |
| 링크 | anchor 112개, 고유 href 97개, 이미지 포함 고유 로컬 resource 97개 | 파일 없음 0, 외부 URL 0 |
| 보고서 이미지 | lazy 이미지 2개를 실제 스크롤한 뒤 decode | 둘 다 complete, 844×390 |
| 캡처 | 고유 viewport PNG 25장 직접 확인 | 캡처 전후 URL/본문/스크롤/초점 변화 0 |
| 브라우저 오류 | console error / page error / failed request | 모두 0 |
| 저장 | 보고서 Storage 호출, CTA로 연 조작 HTML 초기 쓰기 | 모두 0 |

근거는 요약 JSON (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/summary.json`), 원본 브라우저 JSON (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/browser-audit.json`), 링크 전수 목록 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/link-audit.json`), 후속 실제 이미지·CTA 결과 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/cli-followup.json`)다.

이 수는 Playwright에 등록한 25개 테스트가 아니다. 주 검사 run-code 1회와 후속 run-code 2회를 실행했다. 후속 첫 실행은 도구 결과로 확인한 뒤 재현 가능한 JSON을 남기기 위해 같은 검사를 한 번 더 실행했다. 따라서 캡처 호출은 30회지만 고유 PNG는 25장이다. 같은 5장을 새 시나리오로 더하지 않았다.

링크 97개는 실제 파일 존재와 경로를 검사했다. 모든 대상 문서의 내용이나 각각의 앱 동작을 실행한 것은 아니다. 상단 “직접 조작할 PoC 열기”는 실제 클릭하여 현재 standalone 파일의 `FlowMe 개인공간` 제목과 오늘 목록이 렌더링되는 것을 확인하고 뒤로 돌아왔다. 이 진입에서 제품 저장은 0회였다. 보고서 본문에 들어 있는 K1-A 역사 이미지 2장은 새 제품 검증 캡처로 세지 않았다. 첫 조회에서 `naturalWidth:0`이었던 것은 offscreen lazy 상태였고, 후속 decode에서 실제 정상 로드를 확인했다.

## 3. 다섯 화면 직접 평가

아래 모든 PNG를 직접 열어 확인했다. 각 링크는 이번 SHA에서 새로 만든 화면이다. 세로 스크롤 밖에 있는 내용을 가려짐으로 계산하지 않되, 접근을 위해 스크롤이 필요한 점은 남겼다.

| 화면 | 직접 확인한 화면 | 평가 |
| --- | --- | --- |
| 390×844 | 상단 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-top-390x844.png`) · B3 비교 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-k3b-feedback-390x844.png`) · 개발2 행 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-source3-390x844.png`) · 진행 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-progress-390x844.png`) · 경계 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-boundary-390x844.png`) | 상단 CTA와 한글 줄바꿈 정상. 비교표가 카드로 바뀌어 요구/수정 전/반영 근거가 유지된다. 진행표 상태 열은 옆으로 이동해야 함 |
| 375×812 | 상단 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-top-375x812.png`) · B3 비교 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-k3b-feedback-375x812.png`) · 개발2 행 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-source3-375x812.png`) · 진행 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-progress-375x812.png`) · 경계 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-boundary-375x812.png`) | 비교 카드 폭 317px에서 글자 잘림 없음. 긴 안내와 동등성 행은 세로 스크롤 필요. 진행/검증 표 마지막 열의 발견성은 부족 |
| 844×390 | 상단 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-top-844x390.png`) · B3 비교 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-k3b-feedback-844x390.png`) · 개발2 행 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-source3-844x390.png`) · 진행 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-progress-844x390.png`) · 경계 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-boundary-844x390.png`) | 높이가 짧아 제목·표·CTA가 한 번에 보이지 않음. 각각 스크롤한 행동은 full rect/9점 검사 통과. sticky 요소에 가리지 않음 |
| 1024×768 | 상단 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-top-1024x768.png`) · B3 비교 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-k3b-feedback-1024x768.png`) · 개발2 행 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-source3-1024x768.png`) · 진행 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-progress-1024x768.png`) · 경계 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-boundary-1024x768.png`) | 비교 3열과 4개 대상 행을 함께 읽을 수 있음. 비교 아래 링크는 필요 시 세로 스크롤. 진행 상태 3열은 가로 이동 없이 보임 |
| 1440×900 | 상단 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-top-1440x900.png`) · B3 비교 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-k3b-feedback-1440x900.png`) · 개발2 행 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-source3-1440x900.png`) · 진행 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-progress-1440x900.png`) · 경계 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/report-boundary-1440x900.png`) | 비교 제목·4행·판정·근거 CTA가 한 화면에 들어옴. 최대 본문 폭 유지. 긴 역사 검증 목록의 정보 밀도는 여전히 높음 |

진행·검증 표는 최소 폭 630px이다. 모바일 표 안의 최대 가로 이동은 390에서 298px, 375에서 313px이며 실제 끝까지 이동하고 원위치로 되돌렸다. 마지막 셀은 DOM과 끝 위치에서 접근 가능하다. **페이지 넘침 0을 “모바일 모든 열이 동시에 보임”으로 바꾸어 보고하지 않는다.**

## 4. 원본 세 결과물과 현재/역사 맥락

B3 비교는 다음 네 행을 유지한다. 이는 B3 관련 매칭의 가독성 검사이며, 세 제품의 전체 요구 목록을 이번에 다시 전수 판정한 것은 아니다.

- v4.1: 개인 계획·실행 분리 → 전용 workspace Undo와 원문 Undo 구분.
- 개발1: 저장·결과·취소 → 실제 정규화 의미, confirmed/reload 구분.
- 개발2: 원문 소유·문맥 → 관측 ABA 뒤 과거 결과·Undo 재사용 차단.
- 두 runtime 동등성: standalone 긴 목록 반영과 React 101건 표시 보완 진행을 구분.

상단과 `#k3b-feedback`은 B3 단일 HTML 반영/React 큰 Plan 보완 중이라고 표시한다. `#k3b-structure`는 “이전 검증본 · K3-B B2 / 889B”로 구분한다. 현재 조작 CTA는 7D1610 파일을 가리킨다. 실제 기기·관찰 사용자·배포가 없고 전체 B3는 아직 완료가 아니라는 안내도 남아 있다.

## 5. 남은 보고서 개선 사항

| ID | 판정 | 근거·필요한 후속 |
| --- | --- | --- |
| BR3-01 | 최신성 미반영 | B3 문단이 npm/build의 마지막 완료 근거를 B2라고 설명하고 검사 표도 B2 로그를 연결한다. 실제 B3 build `kRHgiytNCXX5ItPRDSDUe`, 제한5개 회귀, npm 2,029 PASS/1 FAIL 및 후속201+19 결과는 이미 [통합 QA §6](./k3b-plan-feedback-integration-qa.md)에 있다. 보고서 담당자가 최종 React 후보와 함께 현재/역사를 갱신해야 한다. 현재 npm 실패를 숨겨서는 안 됨 |
| BR3-02 | 역사 명칭 혼동 위험 | 역사 B1 문단의 “직접 조작할 HTML은 FB17입니다”, 검사 표의 “현재 HTML…현행889B”가 현재 B3 7D1610 표기와 공존한다. 역사 절 안이라는 문맥은 있으나, 각 행의 이름도 “당시 B1/B2 검증본”으로 한정하면 오독을 줄일 수 있음 |
| BR3-03 | 모바일 표 읽기 제한 | 진행/검증 표의 상태·실행 범위 열은 가로 이동 전 대부분 보이지 않는다. 파일 링크와 행동을 막지는 않지만 진행 판정을 빠르게 훑기 어렵다. 후속 보고서 편집에서 카드 전환/줄바꿈 또는 옆으로 이동 안내를 검토할 수 있음. 제품 UI 변경 요청은 아님 |
| BR3-04 | 문장·정보 밀도 | `source`, `pin`, `confirmed`, `raw`, `journal` 등 기술어와 숫자가 좁은 열에서 이어진다. 근거는 보존하되 요약 문장을 짧게 하고 상세 근거로 분리할 여지가 있음. 실제 사용자 관찰로 확인한 문제라고 표현하지 않음 |

위 항목은 이 독립 검사에서 제품 또는 보고 HTML을 고치지 않고 root에 전달했다. 핵심 행동 가림이나 링크 실패로 판정한 것은 없다. 실제 화면 크기별 가독성 평가와 파일 존재 검사가 통과해도 설명의 최신성까지 자동으로 통과하는 것은 아니다.

## 6. 재현 파일과 실행 경계

검사 코드는 주 검사 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/inspect-report.js`), 후속 검사 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/inspect-followup.js`), CLI 실행·해시 기록 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/run-audit.cjs`), 집계 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/analyze-audit.cjs`), 격리 설정 (로컬 전용 근거: `../../../output/playwright/k3b-b3-report-20260906-01/cli.config.json`)에 있다. 전용 CLI session을 먼저 열고 저장소에서 실행한다. 재실행은 위 해시와 비교해 별도 결과로 남겨야 한다.

보고 스킬의 근거·미실행 분리와 브라우저 스킬의 실제 로컬 파일 검사를 적용했다. Figma 작업은 없으며 보고서의 기존 화면을 검토했다. Storage 계측은 fresh context에 한정되고 사용자의 실제 운영 저장소 전체를 조사한 증거가 아니다.

문서 검사 첫 실행은 이 신규 QA의 캡처 링크 이름 5곳에서 실패했다. 실제 파일명 `report-k3b-feedback-*`로 바로잡고 `npm run docs:check`를 다시 실행해 **16 required files / 6,252 local links PASS**를 확인했다. 검사한 보고 HTML의 링크 실패가 아니라 새 QA 작성 중 오류다. 전용 `k3b-b3-report-20260906` 브라우저 session만 정상 종료했고 기존 제품 서버는 그대로 두었다.

- 실제 Android Chrome / iOS Safari / OS IME / 보조기술: **NOT_RUN**.
- 관찰 사용자: **0명**.
- commit / push / PR / Preview / Production: **없음**.
- 보고서·제품·기존 시험 변경: **0**. 신규 QA 문서·재현 스크립트·JSON·캡처만 작성했다.
