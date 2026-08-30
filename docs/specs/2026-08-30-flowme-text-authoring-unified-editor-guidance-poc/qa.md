# QA · 한 편집기 작성 틀과 입력 예시 PoC

## 판정 원칙

자동화 QA, 브라우저 확인, 실제 관찰 사용자 검증을 분리한다. 이 문서의 사용자 수는 0이며, 자동화 통과를 사용성 검증 완료로 표현하지 않는다.

## 필수 contract

- 6개 구조 틀 exact bytes·transaction 1회·첫 caret offset·undo/redo
- non-empty, stale host/source, ABA dispatch, IME composition에서 write 0
- blank heading/item/subcheck/property의 canonical output·hard issue 0
- blank 행과 유효한 형제 행의 부분 해석
- 값이 있는 invalid 날짜·시간대의 기존 오류 유지
- 구조 메뉴 순서·관계·`항목 정보` 문구
- editor-wide 예시 derivation과 origin independence
- 예시 토글 source/selection/scroll/clipboard/dispatch/undo 불변

## 브라우저 시나리오

1. 빈 Flow 편집기에서 6개 틀을 각각 선택한다.
2. 별도 textarea·초안 CTA 없이 현재 CodeMirror에 exact scaffold가 보이는지 확인한다.
3. 첫 `# ` 뒤 focus, 한 번의 undo로 empty, redo로 exact 복원을 확인한다.
4. 일부 행만 채운 뒤 완성된 형제 Item만 결과에 나타나고 `[ ]`, `할 일`, 빈 Step이 생기지 않는지 확인한다.
5. 빈 날짜는 중립, 잘못 입력한 날짜는 visible error인지 확인한다.
6. 직접 작성·문맥별 `+`·틀·기존 문서에서 같은 예시 토글이 동작하는지 확인한다.
7. 순수 텍스트 전환 때 `+`와 토글이 사라지고 Flow 복귀 때 상태가 복구되는지 확인한다.
8. 메뉴에서 `하위 확인`과 `항목 정보`가 같은 parent group, `새 단계`가 outdent인지 확인한다.
9. 320×640, 390×844, 844×390, 320px+200%에서 가로 overflow와 가림을 확인한다.
10. keyboard-only, Escape, native Tab 이동, focus return, 44px target, reduced motion을 확인한다.

## Fresh 결과

2026-08-31 KST에 commit `53386931bd648b1b4c529dd3d6291692cd002362`의 새 detached verification checkout에서 다시 실행했다. 명령별 별도 시작·종료 시각은 수집하지 않았으므로 만들지 않는다. 자동화, headless 브라우저, 수동 화면 확인과 관찰 사용자는 서로 다른 근거다.

| 검증 | 상태 | 결과 |
| --- | --- | --- |
| controller unit | PASS | 7/7, exit 0 |
| parser/model targeted | PASS | 56/56, exit 0 |
| successor Playwright | PASS | 14/14 |
| inherited property re-entry regression | PASS | 9/9 |
| combined Playwright | PASS | 23/23, exit 0, 각 test의 console error·pageerror 0 |
| shared Text Authoring | PASS | structure template 51/51 + Text Authoring 371/371 = 422/422, exit 0 |
| full test | **NOT GREEN** | 623/624, exit 1. 수정하지 않은 `lib/flow/seed-flows.test.ts`의 날짜 민감 `review_due` 기대 0/실제 44 실패 |
| build | PASS | Next.js 15.5.21, 정적 페이지 19개, exit 0 |
| docs:check | PASS | required files 16개, local links 4,650개, exit 0 |
| embedded artifact parse | PASS | module script 5개, stylesheet 5개 |
| manual local visual check | PASS WITH LIMIT | 390×844 picker/editor 화면 확인. 실제 Android/iOS 기기는 실행하지 않음 |
| mobile/a11y automation | PASS WITH LIMIT | 320·360·390 keyboard proxy, 844×390, 320+200%, keyboard-only, Escape/Tab, 44px, reduced motion |
| observed users | NOT RUN | 0명 |

### 실행 명령

```text
node --test docs/specs/2026-08-30-flowme-text-authoring-unified-editor-guidance-poc/prototype/unified-editor-guidance-controller.test.mjs
node scripts/build-text-authoring-unified-editor-guidance-poc.mjs
npx.cmd tsx --test lib/flow/text-authoring/parser.blank-scaffold.test.ts lib/flow/text-authoring/parser.test.ts lib/flow/text-authoring/flow-view-model.test.ts
npx.cmd playwright test tests/e2e/text-authoring-unified-editor-guidance-poc.spec.ts tests/e2e/text-authoring-property-reentry-simplicity-poc.spec.ts --config=playwright.unified-editor-guidance-poc.config.ts
npm.cmd run test:text-authoring
npm.cmd test
npm.cmd run build
npm.cmd run docs:check
npm.cmd run security:audit
```

### full test 실패 경계

실패한 suite는 현재 날짜 2026-08-31에서 seed source review가 기한을 넘었다고 판단한다. 이 작업은 해당 fixture와 test를 수정하지 않았고, 이번 편집기 기능과 직접 관련된 targeted·shared·browser·build 검증은 모두 통과했다. 따라서 전체 suite를 PASS로 표현하지 않으며, 날짜 기준 또는 기대값의 별도 소유권 결정을 남긴다.

### 결과물 무결성

- HTML bytes: `2,814,564`
- HTML SHA-256: `1B7BC8D4ED432121CE5F8787E21C37131120E3A2079E28DE8A2008396FE9C0D4`
- predecessor HTML은 exact SHA guard를 통과했고 수정하지 않았다.
- 6개 TXT scaffold는 successor-local snapshot으로 versioning되며 SHA-256은 `1278E7EF1EC7A00F332FE56B38609054E412FA5FE014FC6B9DA8849B3628AEAF`다.
