# Text Authoring 속성 재진입·단순화 PoC 결과

- 목표 ID: `TA-TEXT-AUTHORING-PROPERTY-REENTRY-SIMPLICITY-20260829-01`
- checkout: `D:\flowme2605\flow-text-authoring-flow-view-hybrid-ux-poc-20260828`
- branch / HEAD: `agent/text-authoring-flow-view-hybrid-ux-poc-20260828` / `849d4f6df9580b3b5230457387ec7569d177ef6c`
- boundary: `LOCAL_ONLY`
- external side effect / observed-user sessions: `0 / 0`

## 결론

사용자가 보고한 `장소:` 왼쪽 진입 결함을 격리 successor에서 재현하고 수정했다. 빈 속성의 라벨을 탭하면 콜론 뒤 입력점으로 이동하고, 값이 있는 속성의 라벨을 탭하면 실제 값만 선택한다. 이 계약은 날짜·시간·장소·완료 기준을 포함한 15종 속성에 적용된다. 탭 자체의 source write는 0이며 입력, 한 번 undo, redo에서 원문 prefix와 후행 공백을 보존한다.

정보 tray는 기존 값을 고정 예시 대신 실제 원문 값으로 보여 준다. `9개 더`는 `다른 정보` disclosure로 바뀌고, 펼친 상태에서도 기본 4개를 같은 패널에 유지한다. 추가 9개는 `일정 / 실행 내용 / 참고·출처`로만 구분하며 별도 modal이나 property form을 만들지 않았다.

## 산출물

- 실행 HTML: `flowme-text-authoring-property-reentry-simplicity-poc.html`
- 시각 QA 보고서: `property-reentry-simplicity-qa-report.html`
- spec: `../../specs/2026-08-29-flowme-text-authoring-property-reentry-simplicity-poc/spec.md`
- plan: `../../specs/2026-08-29-flowme-text-authoring-property-reentry-simplicity-poc/plan.md`
- QA contract: `../../specs/2026-08-29-flowme-text-authoring-property-reentry-simplicity-poc/qa.md`

## immutable predecessor

- predecessor: `2026-08-29-flowme-text-authoring-keyboard-property-tray-reliability-poc-results/flowme-text-authoring-keyboard-property-tray-reliability-poc.html`
- SHA-256 before/after: `C0BC3D6ECE3DB98AB48E6FDC5C3A186A129BB44B4614CAA8B2547F6A41A992E7`
- successor SHA-256: `9DE9B546A72E747CEC782AC3DED0F46AFAC4DD55A5754C18D10E85C527F17FDF`

## 변경 계약

| 영역 | 변경 후 |
| --- | --- |
| 빈 속성 재진입 | `라벨: ` 뒤 collapsed caret |
| 기존 속성 재진입 | 실제 raw value 범위만 선택 |
| 일반 text value tap | display와 raw가 동일할 때 해당 위치 caret |
| Markdown link | 좌표 추정 없이 raw value 전체 선택 |
| 정보 tray | 실제 값 또는 `입력 전` 표시 |
| 추가 정보 | 같은 패널에서 기본 4개 유지, 추가 9개를 3그룹으로 펼침 |
| 반복 copy | available/existing 반복 helper와 scroll 안내 제거 |
| source mutation | tap/disclosure 자체 write 0 |

## fresh QA

| 시각(KST) | 명령 | 결과 |
| --- | --- | --- |
| 2026-08-29 09:49:10–09:49:43 | `npx.cmd playwright test --config=playwright.property-reentry-simplicity-poc.config.ts` | `9/9 PASS`, cross-Item owner isolation 포함 |
| 2026-08-29 09:40:37–09:40:39 | predecessor pure + quick-property transaction | `14/14 + 9/9 PASS` |
| 2026-08-29 09:40:39–09:41:31 | `npx.cmd playwright test --config=playwright.keyboard-property-tray-reliability-poc.config.ts` | `16/16 PASS` |
| 2026-08-29 09:41 KST | `npm.cmd run test:text-authoring` | `445/445 PASS` |
| 2026-08-29 09:42 KST | `npm.cmd test` | pretest `175/175 PASS`; main `623/624 PASS`, 기존 source review due gate 1건 실패 |
| 2026-08-29 09:42–09:43 KST | `npm.cmd run build` | `PASS`, 19 static pages |
| 2026-08-29 09:43 KST | `npm.cmd run docs:check` | `PASS`, 16 required files / 4,691 links |
| 2026-08-29 09:43 KST | scoped `git diff --check` | `PASS` |

전체 test의 유일한 실패는 `lib/flow/seed-flows.test.ts`의 `normal user routes fail the standard suite when source review is due`다. 2026-05-21/23 재검토 기한이 지난 source 44건을 보고하며, 이번 신규 successor 경로와 겹치지 않는다. 범위 밖 source 상태를 바꾸지 않았다.

## 브라우저·접근성 경계

- Chrome 자동화로 320, 360, 390px keyboard-open visualViewport proxy와 320px·200% text를 검증했다.
- disclosure keyboard navigation, active option, Escape focus return, 44px control, horizontal overflow `≤1px`를 검증했다.
- Unicode 한글 입력과 composition-safe 기존 계약은 자동화 증거다. 실제 Samsung Keyboard/Gboard, TalkBack/VoiceOver 관찰은 수행하지 않았다.
- 앱 내 브라우저는 로컬 `file://` URL을 정책상 열지 못해 별도 수동 캡처를 생성하지 않았다. 자동화 PASS를 관찰 사용자 검증으로 표현하지 않는다.

## 상태 분리

| 상태 | 결과 |
| --- | --- |
| local edits | 이번 신규 spec/prototype/builder/config/E2E/results 경로에 존재 |
| commit | 0 |
| push | 0 |
| PR | 0 |
| merge | 0 |
| deploy | 0 |
| external/P35 side effect | 0 |
| observed-user sessions | 0 |

production route/store/schema와 기존 dirty 파일은 수정하지 않았다.
