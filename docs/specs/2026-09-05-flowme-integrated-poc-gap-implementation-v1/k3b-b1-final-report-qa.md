# K3-B B1 최종 보고서 HTML 독립 QA

기준일: 2026-09-05. 대상은 단계별 갭 구현 보고서 (로컬 전용 근거: `../../content-audit/2026-09-05-flowme-integrated-poc-gap-implementation-ko.html`)이며, 제품 PoC 기능 재검사가 아니다.

## 0. 현재 판정

최종 보고서 `7B85F27E…`의 다섯 viewport 검사를 통과했다. 375·390 폭에서도 현재 요구사항의 ‘요구·대상 → 수정 전 → 이번 반영·근거’를 가로 스크롤 없이 세로로 읽을 수 있다. 최종 20개 문서 위치에서 가로 넘침 0, 콘솔 오류·page error·실패 요청 0, 주요 링크의 기하·키보드 검사도 통과했다. 자세한 최종 근거는 §6이다.

§1~5는 **수정 전 9ED4A412 보고서의 역사 기록**이다. 첫 검사에서는 페이지가 깨지지는 않았지만 핵심 결과 열이 작은 화면 오른쪽에 숨었다. 그 읽기 문제를 재현한 PNG와 JSON을 그대로 보존했다. 제품 PoC의 전체 기능·원본 요구 충족을 새로 판정한 결과는 아니다.

## 1. 검사 범위와 분모

- Playwright CLI의 새 비영구 Chromium 세션에서 실제 `file:` URL을 열었다. 브라우저 버전은 151.0.7922.138이다. 사용자 브라우저 프로필과 PoC는 열지 않았다.
- 등록 E2E 파일을 새로 실행한 것이 아니다. 보고서 한 문서를 다섯 viewport에서 반복 검사한 브라우저 감사다. viewport 수나 9점 hit-test를 독립 제품 시나리오 수로 더하지 않는다.
- 390×844, 375×812, 844×390, 1024×768, 1440×900 각각에서 맨 위·현재 B1 절·자동 검사 절·맨 아래의 너비를 측정했다. 총 20개 위치 표본이다.
- 상단 주요 링크 3개를 각 viewport에서 스크롤해 노출한 뒤 전체 사각형이 viewport 안에 있고 내부 9점이 실제 링크에 닿는지 확인했다. 링크 15개 표본, 점 135개이며 클릭으로 목적지를 열지는 않았다.
- 상단 PNG 5개와 현재 B1 절 PNG 2개를 `fullPage:false`로 캡처하고 모두 직접 읽었다. 각 캡처 전후 URL·스크롤 위치·본문 텍스트가 동일했다.
- DOM에서 수집한 링크 95개, 고유 href 87개와 이미지 2개의 로컬 파일 존재를 확인했다. 이미지 URL은 기존 href와 중복되어 고유 대상 파일은 87개다. 각 증거 문서 내용이나 과거 검사를 전부 다시 수행한 것은 아니다.

실행 스크립트는 열기 (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-2026-09-05T14-01-24Z/open-report.js`), 화면 감사 (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-2026-09-05T14-01-24Z/inspect-report.js`), 파일 존재·해시 검사 (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-2026-09-05T14-01-24Z/check-links.cjs`), 키보드·표 스크롤 보조 검사 (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-2026-09-05T14-01-24Z/check-report-navigation.js`)에 남겼다. 첫 inline CLI 호출은 PowerShell 인자 인용으로 `SyntaxError`가 났고 `about:blank`에 머물렀다. 이후 파일 기반 `run-code --filename`으로 실행했으며 이를 보고서 page error로 세지 않는다.

## 2. 수정 전 화면별 평가

| viewport | 실제 평가 | 근거 |
| --- | --- | --- |
| 390×844 | 상단 요약·FB17·다음 B2·전체 완료 아님·주요 링크 3개를 읽을 수 있다. 현재 비교표는 가로 스크롤이 필요하며 핵심 결과 열은 기본 화면에서 숨는다. | 상단 (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-2026-09-05T14-01-24Z/report-top-390x844.png`), B1 비교표 (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-2026-09-05T14-01-24Z/report-current-b1-390x844.png`) |
| 375×812 | 상단 줄바꿈과 링크 크기는 정상이다. 현재 표 내부 너비 630px가 317px 영역에 들어가므로 390과 같은 읽기 편의 문제가 있다. | 상단 (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-2026-09-05T14-01-24Z/report-top-375x812.png`) |
| 844×390 | 제목·현재 요약·주요 링크가 첫 화면에서 읽힌다. 보호 경계 이후 내용은 일반 문서 스크롤로 이어진다. 내부 표는 742px 영역에 맞는다. | 상단 (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-2026-09-05T14-01-24Z/report-top-844x390.png`) |
| 1024×768 | 제목·요약·보호 경계·B1 절의 시작이 자연스럽게 이어진다. 링크 가림과 가로 넘침이 없다. | 상단 (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-2026-09-05T14-01-24Z/report-top-1024x768.png`) |
| 1440×900 | 최대 본문 너비 안에 상단과 B1 비교표가 배치된다. B1을 별도 스크롤한 화면에서 세 열·현재 수치·잔여 범위를 함께 읽었다. | 상단 (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-2026-09-05T14-01-24Z/report-top-1440x900.png`), B1 비교표 (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-2026-09-05T14-01-24Z/report-current-b1-1440x900.png`) |

원시 화면 감사 JSON (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-2026-09-05T14-01-24Z/browser-audit.json`): 20개 위치의 `document.scrollWidth - innerWidth` 양수 넘침은 모두 0이다. 상단 링크 15개 표본 모두 `wholeViewport:true`, `hitCount:9/9`다. 별도 고정 오버레이로 핵심 링크가 가려진 경우는 없었다. 기존 역사 표 10개는 `overflow-x:auto`를 사용하며, 작은 화면에서의 **표 내부 스크롤**은 문서 가로 넘침 0과 구분한다.

보조 검사 JSON (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-2026-09-05T14-01-24Z/navigation-audit.json`): 390×844에서 실제 horizontal wheel 입력으로 첫 표 `scrollLeft`가 0에서 298로 바뀌었다. 이는 데스크톱 자동화 입력이며 실제 기기 터치 검사가 아니다. 375 보조 반복은 기존 298 위치를 이어받았으므로 독립적인 추가 이동 성공으로 세지 않는다. 390에서 첫 세 번 Tab은 ‘직접 조작할 PoC 열기 → 단계별 진행 원장 → 현재 개인 계획 편집 설계’ 순서였다. Enter로 링크를 열지는 않았다.

## 3. 파일 연결과 내용의 범위 표시

파일·해시 원시 JSON (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-2026-09-05T14-01-24Z/link-and-hash-audit.json`): 링크 95개/고유 대상 87개가 모두 실제 로컬 파일이고 누락 0, 외부 URL 0이다. 본문 이미지 2개 모두 `complete:true`, `naturalWidth:844`로 로드됐다.

현재 요약과 B1 절은 검증본 FB17, 1,380,751 bytes와 다음 B2 작업을 명시한다. B1의 모델 612/612·UI 16/16·닫기 20/20·저장 16/16·source CAS 2/2·생성 151/151·host 8/8·선정 build gate/시간 5/5·file 1/1은 **기존 실행 근거를 설명하는 보고서 값**이다. 이번 문서 검사에서 이 제품 시험들을 다시 실행하지 않았다. npm 2,250/2,250과 build 18 경로/`qlTYGTWpw4H7HIFB8aU92`도 동일하다.

254개 부모/424개 원자 요구 전체를 전수 재판정하지 않았다는 문구와 B2·B3·K3-C·K4 잔여 항목이 있다. B2의 첫 12 RED는 missing API 때문에 실패한 계약 준비 검사로 적혀 있고 구현 PASS로 제시하지 않는다. 과거 D4C4·B86 절에는 ‘이전 … 시점/기록’ 표지가 붙어 있다. 장문의 역사 기록을 현재 제품 수치와 합산하지 않는다.

## 4. 보호 경계와 불변 증거

| 대상 | 검사 전·후 SHA-256 | bytes |
| --- | --- | ---: |
| 보고서 HTML | `9ED4A412790CC5088A4D58EA29E2C9D8B40BD891794A9F56DEEFDC671B287B79` | 49,717 |
| 사용자 standalone HTML | `FB17FDA35E1141C50359BEE3CC5B85A39DC89F9C0C10809570ADB70B757D8BE3` | 1,380,751 |
| 사용자 Android single-file HTML | `FB17FDA35E1141C50359BEE3CC5B85A39DC89F9C0C10809570ADB70B757D8BE3` | 1,380,751 |

보고서 로드·reload·스크롤 중 console error 0, page error 0, requestfailed 0이다. 보고서 자체 script는 0개다. 새 브라우저 context에서 재로드 전에 설치한 Storage API 관찰의 `setItem`·`removeItem`·`clear` 호출도 0이다. 이 값은 **보고서 읽기 검사**이며 실사용 프로필의 운영 데이터 전체 불변을 새로 검증했다는 뜻은 아니다. 사용자 PoC HTML은 내용 해시만 읽었고 열거나 재생성하지 않았다. B2 개발 중인 메모리 builder·P/C/E2/PD/app 제품 파일, 기존 검사와 candidate pin은 이 검사에서 변경하지 않았다.

## 5. 제외와 후속

최초 후속 계획은 최신 비교표를 모바일에서 세 셀 모두 기본 흐름으로 읽게 하는 것이었다. 실제 generator는 공유 `updates` 렌더러를 사용하므로 최종 변경은 최신 B1을 포함한 요구대조표 6개에 적용됐다. §6에서 이 실제 범위를 구분한다. 과거 기록의 내용과 제품 HTML을 바꾸는 작업은 아니다.

실제 Android Chrome·iOS Safari·OS IME·보조기술 검사: NOT_RUN. 관찰 사용자: 0명. commit·push·PR·Preview·Production: 미실행. 이번 감사에는 제품 테스트 재실행·production build·배포가 없다.

## 6. 모바일 요구대조표 수정 후 최종 검사

root가 보고서 generator의 `updates` 표에 `update-comparison`과 셀별 `data-label`을 붙였다. 620px 이하에서 세 셀을 세로로 쌓고 각 셀 앞에 라벨을 표시한다. 이 렌더러를 쓰는 요구대조표는 최신 B1 포함 6개다. 별도 시험 수치 등 나머지 표 4개는 기존 내부 가로 스크롤을 유지한다. 데스크톱 표의 열 구조는 유지한다. 이 하위 작업은 generator/HTML을 수정하지 않고 결과만 검증했다.

새 비영구 브라우저 세션에서 같은 실제 `file:` URL을 열었다. 최종 브라우저 JSON (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-final-2026-09-05T14-10-00Z/browser-audit.json`), 파일·해시 JSON (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-final-2026-09-05T14-10-00Z/link-and-hash-audit.json`), 키보드 JSON (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-final-2026-09-05T14-10-00Z/keyboard-audit.json`), 전후 내용·상단 PNG 일치 JSON (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-final-2026-09-05T14-10-00Z/consistency-audit.json`)에 결과를 남겼다.

| viewport | 최종 직접 평가와 수치 | 현재 B1 화면 |
| --- | --- | --- |
| 390×844 | 첫 요구 카드의 세 라벨과 근거까지 기본 세로 흐름에서 읽힌다. 6행 18셀 모두 가로폭 안에 있고 비교표 너비 `332/332px`, 각 셀의 scroll/client 너비도 일치한다. | PNG (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-final-2026-09-05T14-10-00Z/report-current-b1-390x844.png`) |
| 375×812 | 긴 원문·검사 설명이 셀 안에서 줄바꿈된다. ‘이번 반영·근거’ 라벨과 내용이 옆으로 숨지 않는다. 6행 18셀 모두 가로폭 안, 비교표 `317/317px`다. | PNG (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-final-2026-09-05T14-10-00Z/report-current-b1-375x812.png`) |
| 844×390 | 세 열 표를 유지한다. 첫 요구의 세 칸이 같은 화면에서 읽히며 이후 행은 문서 스크롤로 이어진다. 비교표 `742/742px`다. | PNG (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-final-2026-09-05T14-10-00Z/report-current-b1-844x390.png`) |
| 1024×768 | 세 열과 긴 설명이 정렬돼 있고 고정 가림이 없다. 비교표 `922/922px`다. | PNG (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-final-2026-09-05T14-10-00Z/report-current-b1-1024x768.png`) |
| 1440×900 | 현재 요구 6행·B1 실행 수치·잔여 범위를 함께 읽을 수 있다. 비교표 `1078/1078px`이며 기존 데스크톱 열 구조를 유지한다. | PNG (로컬 전용 근거: `../../../output/playwright/k3b-b1-report-final-2026-09-05T14-10-00Z/report-current-b1-1440x900.png`) |

다섯 viewport의 20개 문서 위치 모두 가로 넘침 0이다. 주요 링크 15개 표본은 전체 사각형이 viewport 안에 있고 각 9점 hit를 통과했다. 새 문서를 연 뒤 실제 Tab을 세 번씩 눌러 다섯 viewport에서 같은 상단 링크 순서·전체 노출·중심 hit를 확인했다. 이 15번 Tab은 별도 제품 시나리오 15개가 아니다. PoC 링크는 Enter나 클릭으로 열지 않았다.

PNG는 상단 5개+현재 B1 절 5개, 총 10개다. 모두 `fullPage:false`이며 캡처 전후 URL·스크롤·본문 텍스트가 동일했다. 현재 B1 PNG 5개를 직접 읽었다. 상단 PNG 5개는 앞서 직접 읽은 수정 전 상단과 **파일 bytes가 완전히 같아** 같은 시각 상태임을 확인했다. B1 현재 문구·상단 요약·모든 링크 값도 수정 전과 동일했다.

링크 95개/고유 대상 87개 모두 존재, 외부 URL·누락 0, 이미지 2개 정상 로드다. console error·page error·실패 요청·관측 Storage API 쓰기 모두 0이다. 최종 보고서 해시는 `7B85F27E6BA152013A173A6C4E03F9773BF8F082A4CB13C0BF62BC2ED852AB9F`, 53,069 bytes다. 사용자 HTML 두 개는 §4의 **FB17 / 1,380,751 bytes 그대로**다. 최종 검사를 위한 스크립트의 닫는 괄호 오타 1회는 실행 전 `SyntaxError`로 끝나 수정했다. 보고서 오류나 제품 RED가 아니며 실제 측정·PNG는 고친 스크립트의 성공 실행 결과다.

CSS `display:block` 표와 `::before` 라벨의 실제 화면 읽기는 확인했지만, 스크린리더가 표 관계와 라벨을 어떻게 읽는지는 **미검사**다. 이를 접근성 전체 통과로 판정하지 않는다. 실제 기기·OS IME·보조기술 NOT_RUN, 관찰 사용자 0명과 공개 작업 미실행 상태는 그대로다. 재검 전후를 중복 합산해 제품 테스트 개수나 요구 충족률을 늘리지 않는다.
