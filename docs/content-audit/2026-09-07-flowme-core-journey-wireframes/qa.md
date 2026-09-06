# 핵심 여정 와이어프레임 검증 결과

2026-09-07 · 설계 산출물 QA · 제품 구현/출시 판정 아님

## 결과

- 개인 기록·공개 Flow 재사용 2개 클릭 가능한 와이어플로우를 작성했다.
- 브라우저 시뮬레이터 검사 **65/65 PASS**. [항목별 결과](./simulation-results.json), [재실행 스크립트](./simulate.js).
- 1440×900, 1194×834, 1024×768, 390×844에서 문서·공개 Flow·검토 요약의 가로 넘침 0px. 연결 dialog도 각 화면 안에 위치했다.
- 개인 사본·오늘은 1194×834와 390×844에서 추가로 확인했다.
- 최종 검사 구간 page/console error 0, 외부 네트워크 요청 0. 최초 favicon 404는 빈 data favicon으로 수정했다.
- 문서 검사와 scoped closeout 결과는 아래 최종 점검에 기록한다.

## 실제로 확인한 동작

| 영역 | 검사 내용 |
| --- | --- |
| 개인 TXT | 할 일 변환 없이 저장·reload 복원, 필요한 줄만 연결, 취소/빈 선택/중복 연결 차단 |
| 원문·실행 분리 | 오늘은 같은 ID를 표시, 완료 후 원문 복귀, 날짜 미정 필터, 원문 수정 시 기존 실행 상태 보존 |
| 원문 변경 | 변경 전 연결과 현재 문서 비교. 재연결 계약이 없는 상태에서 중복 생성하지 않고 기존 연결 유지 |
| 실패·복구 | 저장 실패 1회 주입, 입력/저장본 보존, 재시도 성공, 손상 데이터 덮어쓰기 차단, 전용 예시 키만 초기화 |
| 재사용 | 사본 없이 TXT 출력, 사본 생성 취소, 개인 사본 버전 연결, 동일 사본 재열기, 실제 reload/브라우저 Back 복귀 |
| 개인·공개 | 미저장 메모는 날짜 조정에도 유지, 외부 출력의 개인 메모 기본 제외/명시 포함, 공개 후보에서 날짜·완료·메모 제외, 공개본 불변 |
| 조작성 | 행동명을 표시한 완료 Undo, 모바일 탐색 버튼, Escape 취소, dialog 안 Tab 순환, reduced-motion |
| 비교안 | 공개 첫 버튼 순서 전환. 비교 UI는 개인 데이터와 Undo 기록을 변경하지 않음 |

TXT 다운로드는 브라우저 download 이벤트와 [실제 출력 파일](./sample-export.txt)을 확인했다. 클립보드 자동 복사의 OS별 성공·외부 앱 붙여넣기는 검사하지 않았다. clipboard API가 실패하면 수동 선택·복사 안내가 나온다.

## 독립 UX 검토와 수정

코드 읽기 기반 독립 검토에서 초기 Blocking 1 / High 4를 찾았다. 다음처럼 수정했고 재검토 시 해당 심각도의 미해결 건은 0이었다.

1. 새로고침을 ‘저장 후 다시 열기’로 표시하던 혼동을 제거했다. 새로고침은 검토 도구에만 두고 hash/history로 같은 문서·사본과 Back을 복원한다.
2. 원문 수정 후 미확정 재연결을 가장하지 않고, 비교·기존 연결 유지로 범위를 제한했다.
3. 공개 후보는 내 사본 항목의 제목만 추출하고 공개 제목은 별도로 입력한다. 개인 실행 필드는 포함하지 않는다.
4. 전역 Undo를 앱 탐색에서 빼고 ‘완료 상태 되돌리기’처럼 해당 저장 피드백에 붙였다. 버튼 배치 비교는 Undo를 만들지 않는다.
5. 메모 저장은 수정했을 때만 활성화·주 행동으로 표시한다. 기본 주 행동은 ‘할 일에서 보기’다.

브라우저 검사에서 dialog Tab이 브라우저 chrome으로 빠지는 경계도 발견해 첫/마지막 초점 순환을 보완했다.

내부 휴리스틱 재평가: User Need Fit 5, Execution Clarity 4, Content Fidelity 4, Portability 3, Cognitive Load 4, Copy Specificity 4, Source/Safety 5, Accessibility/Operability 4. 평균 **4.1/5**. 이는 소스 읽기 평가이며 실제 사용자 점수나 서비스 출시 기준이 아니다. Portability 3은 TXT 전달까지만 시뮬레이션하고 실제 외부 앱 사용은 범위 밖이기 때문이다.

## 시각 확인

기존 [v4.1 화면 보존 사본](./reference-v4-1-desktop-month.png)을 직접 읽고, 새 렌더링 PNG를 `view_image`로 비교했다. 원래 파일 경로와 무변경 복사 해시는 [근거 보존 기록](./evidence-context.md)에 남겼다. Figma와 새 이미지 생성은 사용하지 않았다. 기존 디자인의 작은 확장인 코드형 와이어프레임이며, 제품 전면 재설계나 래스터 콘셉트의 픽셀 복제가 아니다.

| 비교 지점 | 기존 → 새 결과 |
| --- | --- |
| 색상 | 흰 본문·옅은 회색 탐색·청록 강조 유지 |
| 배치 | 좌측 탐색+넓은 본문 유지. 모바일에서는 탐색 dialog |
| 목록 | 독립 카드 대신 구분선과 한 줄 항목 유지 |
| 타이포 | 큰 작업 제목과 16px 기본 글씨, 보조 정보는 낮은 위계 |
| 컨트롤 | 저장/연결/외부 전달은 현재 문맥에서만 표시. 시험 도구는 검토 상세로 분리 |
| 반응형 | 1194·1024 가로 태블릿에서 본문이 패널 밖으로 나가지 않음. 390px 모달의 줄 선택·날짜·확인 버튼도 노출 |

상단 여정 선택은 보고서의 실험 도구이며 최종 제품 메뉴 제안이 아니다. 기존 주간·월간·이동 UI를 새 화면에 복제하지 않은 것은 이번 범위에 따른 의도적인 차이다. 새 문서/사본/원문 확인 등 문구는 여정 연결에 필요한 새 동작이며 장식용 섹션은 추가하지 않았다.

주요 화면: [개인 기록](./screen-1194-document.png), [공개 Flow](./screen-1194-public.png), [내 사본](./screen-1194-copy.png), [오늘](./screen-1194-today.png), [모바일 연결 선택](./screen-390-connect.png), [검토 요약](./screen-1194-review.png), [최종 빈 화면](./tablet-final.png).

## 범위 밖과 남은 판단

- 실제 Android/iOS·가로 태블릿 실기기·스크린리더·확대 글꼴·OS Back은 NOT_RUN. 모바일 크기 Chromium 검사로 대체 인증하지 않는다.
- 관찰 사용자 **0명**. 사용자에게 화면이 이해되는지는 다음 리뷰에서 확인한다.
- 기존 제품 테스트·빌드·DB·API·공개 배포는 NOT_RUN. 운영 제품 코드를 변경하지 않았다.
- 문서 다수/검색/삭제/기기 간 보존, 원문 편집의 안정 식별·재연결·연결 해제, 자유 텍스트와 날짜/완료 표기의 양방향 반영은 미확정이다.
- 실제 공개 발행·질문/제안 전송·검토/반영/알림과 외부 앱 왕복은 미구현이다.
- 기존 개발3 K4-A1을 이번 UX 검토로 취소하거나 구현 완료 처리하지 않는다.

## 재실행

HTML 열람은 이 패키지만으로 가능하다. 아래 자동 검사는 별도로 Python, Node/npm, 사용 가능한 `@playwright/cli`와 Chromium 설치를 전제로 한다. `--no-install` 명령은 CLI를 설치하지 않으며, 저장소 의존성 설치만으로 CLI가 준비되었다고 가정하면 안 된다.

두 터미널을 사용한다. 첫 터미널은 저장소 루트에서 이 폴더만 노출하는 로컬 서버를 실행한 채 유지하고, 두 번째 터미널은 같은 저장소 루트에서 CLI 명령을 실행한다. `simulate.js`의 서버 주소는 `127.0.0.1:8767`, 출력 경로는 아래 저장소 상대 경로로 고정돼 있다. 패키지만 따로 옮겼다면 자동 검사 전에 이 두 값을 별도 복사본에서 조정해야 한다.

```powershell
python -m http.server 8767 --bind 127.0.0.1 --directory docs/content-audit/2026-09-07-flowme-core-journey-wireframes
npx.cmd --no-install --package @playwright/cli playwright-cli -s=flowme-journeys-0907 open http://127.0.0.1:8767/index.html
npx.cmd --no-install --package @playwright/cli playwright-cli -s=flowme-journeys-0907 run-code --filename=docs/content-audit/2026-09-07-flowme-core-journey-wireframes/simulate.js
```

스크립트는 같은 이름의 PNG·TXT 출력 파일을 다시 만든다. 기존 증거를 보존하려면 별도 체크아웃/복사본에서 실행한다. 결과 JSON은 CLI 출력으로 반환하며 `simulation-results.json`을 자동 갱신하지 않는다. 새 실행 결과를 보존할 때는 이전 기록과 구분해 검토 후 저장한다.

브라우저 플러그인은 `No browser is available`을 반환해 Playwright CLI로 전환했다. CLI에서 `file:`이 차단되어 이 전용 폴더의 loopback HTTP를 사용했다. HTML 본체는 CSS·JS가 인라인이라 파일 자체를 다른 기기로 옮길 수 있지만 file 열기/저장 정책은 실기기에서 별도 확인해야 한다. 검사용 PNG·TXT·JSON은 사용자 요청의 검사 근거로 보존한다.

## 최종 점검

- `npm.cmd run docs:check` PASS: 필수 문서 16개, 로컬 링크 4,650개, skill sync PASS.
- `workflow:closeout --scope=docs/content-audit/2026-09-07-flowme-core-journey-wireframes`: 현재 소유 변경은 새 폴더 1개로 묶여 표시됨. 기존 수정 3개·미추적 39개 묶음은 별도이며 건드리지 않음.
- 최종 브라우저 실행: 65/65 PASS, page/console errors 0, 외부 요청 0. 줄바꿈을 위한 표 첫 열 최소 폭과 접힌 기본 검토 화면까지 재검사함.
- 문서/사본/공개본의 화면 전환을 위한 작은 hash 상태는 이 HTML 안의 설계 예시이지 운영 라우터 변경이 아니다.
- 정본 문서는 지정 정리 세션 담당. 이 세션은 commit·push·PR·merge·deploy를 하지 않음.

## 게시 준비: 패키지 경로 독립화

2026-09-07 재검사. 위 최초 완료 기록과 구분한다.

- 패키지 밖 상대 링크 5개를 내부 근거 요약·기준 이미지로 교체했다. 다른 워크트리의 개발 경로는 당시 출처를 식별하는 텍스트로만 남겼다.
- 원본 v4.1 이미지와 보존 사본의 SHA-256이 같다. 원본 파일·제품 코드·정본 문서는 수정하지 않았다.
- HTML·Markdown 링크의 패키지 내부 경로 해석·파일 존재 검사 PASS. 패키지 밖 링크·누락 파일 0. 인라인 JS 구문과 패키지 텍스트 공백 검사 PASS.
- 폴더 전용 HTTP 서버에서 여정 시뮬레이션 재실행 65/65 PASS, page/console errors 0, 외부 요청 0. 스크립트가 생성하는 PNG·TXT만 다시 만들었고 그 외 추가 검사·최초 캡처는 이전 증거를 유지했다. 기존 `simulation-results.json`의 65개 결과는 최초 완료 기록으로 남겼다.
- 별도 링크 검사에서 HTML의 근거 링크 4개 모두 HTTP 200. 기준 이미지는 실제 링크를 클릭해 1440×900 로딩을 확인했다. 근거 영역을 펼친 1440·1194·1024·390px 화면 모두 가로 넘침 0px, page/console errors 0.
- 첫 재실행은 종료된 로컬 서버 때문에 연결이 거부됐다. 서버 재시작 후 통과했다. 추가 검사의 CLI 인라인 인수 전달 오류는 파일 방식으로 전환해 해결했다. 제품 오류로 집계하지 않는다.
- `npm.cmd run docs:check`, `git diff --check` PASS. 미추적 패키지는 별도 텍스트 검사도 수행했다. scoped closeout에서 이 세션 소유 범위는 해당 폴더 1개다.
- 사용자 관찰·실기기·제품 테스트·배포는 추가 수행하지 않았다. 승인된 commit·push·PR·merge는 지정 정리 세션이 별도 깨끗한 워크트리에서 수행하며 이 검사 결과만으로 완료를 주장하지 않는다.

[링크·펼친 근거 영역 브라우저 검사](./check-package-links.js)는 위와 같은 서버·CLI 조건에서 실행한다. 개인 데이터를 변경하거나 파일을 출력하지 않는다.

```powershell
npx.cmd --no-install --package @playwright/cli playwright-cli -s=flowme-journeys-0907 run-code --filename=docs/content-audit/2026-09-07-flowme-core-journey-wireframes/check-package-links.js
```
