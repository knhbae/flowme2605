# 소유와 반영 경계

기준 작업본은 `D:/flowme2605/flow-ux-journey-20261001`, HEAD `1eb9be68835b71d234995e932d791b4058571fd5`다. 이전 [소유 변경](../2026-10-01-alpha-ux-journey/ownership.md)을 유지하며 아래 범위만 추가한다. root 저장소와 다른 세션의 dirty/미추적 파일은 읽기 전용이다.

| 담당 | 수정 범위 |
| --- | --- |
| 지역 모델 | lib/flow/integrated-poc/folder-document-regions.ts/.test.ts, folder-link-suggestions.ts/.test.ts |
| 편집기 연결 | ProgramTextEditor.tsx, ProgramSpace.tsx, 신규 ProgramFolderRegionEditor.tsx/.module.css와 전용 컴포넌트 검사 |
| 조작 HTML | content-audit/2026-10-01-flowme-folder-writing-lab-ko.html, 전용 inline-model 연결/모델 검사/3110 서버, folder-writing-lab 브라우저 검사 |
| root | AlphaWorkspace.module.css/layout.test.ts, ProgramSpace.module.css/context.test.tsx, ProgramTextEditor.module.css, writing-position.test.ts의 새 callback harness, 합성 cloudflare-release.fixture.ts, folder-writing-regression.config.ts, 설계/QA/보고/색인·SERVICE_STRUCTURE |
| 앱 브라우저 검사 | tests/e2e/folder-writing.browser.ts/.config.ts |
| 보고서 검사 | tests/e2e/folder-writing-report.browser.ts/.config.ts |
| 최종 회귀 연결 보완 | ProgramRecurrence.interaction.test.tsx의 현재 changePeriod callback harness만. 기존 저장 authority/외부 판본/계정/failure assertion 유지 |

범위 reader/helper는 기존 모델을 호출한다. vendor parser·writer·API·schema·Auth·공개 설정을 수정하지 않는다. fixture의 prepareText/externalTextEdit/rejectNextExecute는 in-memory fake repository에만 작동하며 실제 네트워크 API에 위임하지 않는다.

fixture의 연결 재시도는 고정 허용 loopback GET의 ECONNRESET만 최대2회다. Auth/API/HTTP 오류/원격 자산을 재시도하지 않는다. 전체 통합 검사는 기존 비공개 catalog pack을 명시 환경 변수로 읽기만 하며 사본을 이 작업본에 만들지 않는다. 원본 hash는 QA에서 전후 대조한다.

검사 로그·JSON·PNG는 output/ 아래 로컬 전용 근거다. 공개 대상이 아니며 stage하지 않는다. 실계정 파일/비밀번호/개인 자료는 입력이나 보고에 사용하지 않는다.

commit·push·PR·merge·Preview·Production·개발계 교체·DB/Auth/Tunnel 변경은 모두 이번 목표에서 0건으로 유지한다. 기존 공개 앱3105와 Tunnel, 이전 결과물 서버3109는 건드리지 않는다. 신규3110은 독립 HTML,3111은 알려진 HTML/근거 링크의 읽기 전용 미리보기,3106은 합성 QA 앱 전용이다.
