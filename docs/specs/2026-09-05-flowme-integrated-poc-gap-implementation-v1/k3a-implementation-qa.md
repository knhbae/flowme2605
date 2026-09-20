# K3-A — 원본 작성 UX 연결·검증 기록

2026-09-05. [단계별 계획](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md)의 **K3-A 제한 범위를 구현·검증했다.** 새 브라우저22/22, 선행 안전회귀38/38, 후속 runtime 경고2/2와 기존 Stage2/P3-C/P2-C/P3-A 관련29/29가 통과했다. npm2,250/2,250·production build·후속 경계/host/메모/source-update15/15도 통과했다. 통합 제품 전체 또는 K3-B/C/K4 완료 판정은 아니다.

## 요구와 현재 연결

| 원본 요구·후속 결정 | 이전 차이 | 이번 적용 | 판정·남은 범위 |
| --- | --- | --- | --- |
| 개발2 한 원문·한 편집기, 현재 행 raw / D2-029~034·037·044·055 | HTML은 textarea 중심이며 React의 Flow 표시·문맥 도움을 생략 | 기존 React 표시 함수를 pure module로 추출. 양쪽이 같은 원문 행/selection/ghost 계약을 쓰며 textarea를 바꾸지 않음 | 새 B01/02/10 PASS. 실제 OS IME·clipboard·원본 CodeMirror 픽셀 복제는 아님 |
| 개발2 구조→항목 정보→네 그룹→속성→값 / D2-035·036·040·043 | 모든 속성 동시 노출 또는 첫 진입부터 일정 그룹 | 공통 chooser와 원래16key 그룹을 사용. context는 구조부터, review는 네 그룹부터 | B03~07 PASS. 16key는 전체 browse, 실제 값 편집 전수와 다름 |
| 개발2 빈 문서 scaffold 우선 / D2-043·045·049·053·056, 후속 P3-C | 완성 raw·compiler 메타·두 적용 버튼이 같은 수준 | 기본 빈 틀·명시 `빈 틀 넣기`, 완성 예시와 검증 정보는 접음. 예시를 연 경우 `이 예시로 시작` | 6scaffold 실제 exact삽입/Undo B08, compiled대표1 B09 PASS. 기존31corpus/6compiled 자산 제거 없음 |
| K1-A stale·실패·재시도·원문 Undo | 새로운 chooser가 값/실패 owner를 지우거나 닫힌 상태를 잘못 판단 | navigation-only dismiss, value/failed/stale owner 유지. 표시와 toggle의 실제 열림 판단을 하나로 통일 | 최종38/38. 한글 조합은 합성 이벤트이며 실제 OS 검사는 미실행 |
| v4.1 반응형·가려진 행동 없음 | React844 입력칸 상단이 탭 아래 가림, HTML844 owner가 내부 스크롤에 일부 잘림 | inline property 편집 중 짧은 가로 화면만 단일 문서 스크롤. HTML own panel scroll-padding/margin 보완 | 양쪽5viewport에서 owner·오류·input·retry 동시 전체bounds/9점 hit PASS. 모든 화면의 시각 완성도 판정은 아님 |
| K3-A 설계§5.2 오류는 접어 감추지 않음 | unavailable compiled warning이 접힌 예시 안에 있었음 | warning을 두 disclosure 밖으로 이동. 예시 적용은0개, 빈 틀은 사용 가능 | missing/runtime·wrong-version 새2개 RED→2/2 PASS. 정상 예시와 저장 경로는 그대로 |

정본과 실제 읽은 원본/후속 결정은 [K3-A 설계](./k3a-design.md)에 연결했다. 이번에 원본 대화를 다시 전수 열람했다고 주장하지 않는다. 저장 뒤 개인 계획을 작성 원문에 역으로 쓰지 않는 최신 계약을 유지한다. `figma-ux-ui-design`의 기존 원본 대조·code-only 경로, `flow-ux-review`의 주 행동/정보 우선순위, `flow-work-closeout`의 소유·검증·공개 상태 분리가 구현과 판정에 영향을 주었다. 새 Figma 파일·전역 디자인 교체·플러그인 설치는 없다.

## 변경 파일

모든 상대 경로는 이 격리 worktree 기준이다. 기존 dirty 전체가 이번 소유라는 뜻은 아니다. 기존 변경 위에 한 최소 diff와 새 파일을 구분하며 원본 worktree는 수정하지 않았다.

| 구분 | 파일·범위 |
| --- | --- |
| 공유 모델 신규 | `lib/flow/personal-workspace-poc-authoring-chooser.ts`, `personal-workspace-poc-editor-presentation.ts`, `personal-workspace-poc-editor-guidance.ts`, `personal-workspace-poc-authoring-ui-runtime.ts` 및 chooser/guidance 검사 |
| React | `PersonalWorkspacePocAuthoringSurface.tsx`, `PersonalWorkspacePocLiveEditor.tsx`와 해당 기존 검사. 신규 chooser/template/native-layout 검사 파일은 각 QA/실행 목록에 연결 |
| HTML adapter | standalone assets의 `app.js`, `style.css`, `build-single-file.cjs`, 신규 `authoring-ui-runtime.cjs`·runtime.test.cjs·adapter.test.cjs, 기존 standalone.test.cjs의 승인된 UI contract assertion |
| 사용자 조작본 | 단독 HTML (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko.html`), Android용 같은 단일 파일 (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html`) |
| candidate pin | `serve-p3h1-android-device.mjs`·해당검사, `personal-workspace-poc-p3h1-android-evidence.ts`, device runner assets/model.js, host E2E. 최신 후보 SHA/bytes만 갱신. 실제 기기 실행 기록을 새로 만들지 않음 |
| 브라우저 신규·현행화 | K3-A22, template-runtime-warning2 신규. K1-A38 navigation helper와 기록만 현행화. Stage2/P3-C/P2-C/P3-A29는 승인된 helper/disclosure/Tab·경고 contract 현행화 후29/29 PASS. [원래 assertion과 변경점](./k3a-existing-regression-qa.md) |

본문 변경을 정확히 뺀 기존 함수 추출 비교와 `before-presenter`, `before-standalone`, `before-expanded-state`, `before-open-state-transition`, `before-inline-landscape-fix` snapshot을 `output/poc-gap-implementation/k3a/`에 보존했다. B0-M/B0-T 후속 변경은 [별도 K3-B QA](./k3b-memo-owner-qa.md)와 [시간 설계](./k3b-source-time-read-design.md)의 소유 범위다.

## 실제 실행·수정 이력

| 검사 | 실행·결과 | 해석 |
| --- | --- | --- |
| 공유 chooser/속성/guide/source/presentation/LiveEditor | 합동75/75 PASS | 부분 파일 수를 반복 합산하지 않음 |
| 공유+Surface 선정 | 110/110 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3a/shared-and-surface-final-2026-09-05T09-01-02-518Z.json`) PASS | 위75를 포함한 재실행이며 새110개 기능이 아님 |
| React chooser/template/native 신규 | 19/19 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3a/new-ui-and-native-2026-09-05T09-01-55-636Z.json`) PASS | 후속 viewport CSS 검사2 추가 뒤 Authoring suite는 53/53 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3a/react-inline-landscape-focused-2026-09-05.log`) |
| K3-A 브라우저 | 최초19/22 → B01하니스2/2 → 가림수정 focused2/2 → final22/22 → toggle수정 final2 22/22 (로컬 전용 근거: `../../../output/playwright/k3a-authoring-guidance-final2-20260905-01.json`) | native문자별 Undo 전제 오류와 실제 화면 가림을 구별. [상세QA](./k3a-authoring-guidance-browser-qa.md) |
| K1-A 브라우저 |30/38 →37/38 →37/38 → 38/38 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3a/k1a-final2-2026-09-05.json`) | stale owner·도움 높이·renderer/toggle 불일치 수정. 최종 집계 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3a/k1a-final2-summary-2026-09-05.json`) |
| 후속 unavailable 예시 경고 | 0/2 RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3a/template-warning-red-2026-09-05T09-44-22-565Z.json`) → 2/2 PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3a/template-warning-green-2026-09-05T09-45-43-891Z.json`) | 기존 숨김을 허용하던 pure assertion도 설계§5.2대로 정정. 테스트를 열어서 경고를 보이게 만들지 않음 |
| 생성/모델/새runtime·adapter/host unit | 145/145 PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3a/generated-warning-final-2026-09-05T09-47-48-811Z.json`) | 기존119 + 새runtime3 + adapter10 + host13. 최종 경고 분기와 generated exact 일치 포함 |
| 기존 작성 회귀 | 29/29 PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3a/existing-regression-29-first-2026-09-05.json`) | 현행화 뒤 첫 실행. 16key/6scaffold/6compiled/31corpus 실제 범위와 직접 본6/21PNG를 [별도QA](./k3a-existing-regression-qa.md)로 구분 |
| npm test | 2,250/2,250 PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/npm-test-source-time-2026-09-05T09-47-22-449Z.json`) | B0-T Surface 연결 포함. 이후 imported memo 표시/read 변경의 실행은 K3-B 후속으로 분리 |
| production build | PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/production-build-source-time-2026-09-05T09-47-11-890Z.json`),18 정적경로 | BUILD_ID `YfWMdaOcy9e77WdBG3b8W`, Authoring `793388…`·Surface `953991…`. 이전390Y와 구분 |
| 후속 경계·host·memo·source-update | 15/15 PASS (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/boundary-memo-source-update-host-2026-09-05T09-56-02-445Z.json`) | 같은YfWM, HTML1F64: memo3·source-update1·host8·네origin1·exact/corrupt2. 실제 기기/전체source속성 전수 검사가 아님 |

초기 generated mismatch는 사용자 HTML을 B86으로 동결한 동안의 실제 실패다. assertion을 삭제하지 않고 최종 생성 뒤 통과시켰다. tests에 직접 추가한 새 파일이 모두 `npm test` 기본 목록에 포함됐다고 주장하지 않으며 명시 파일 실행을 따로 기록한다.

## 화면·저장·현재 조작본

React/HTML의390×844·375×812·844×390·1024×768·1440×900은 최종 B11의 fullPage:false 새20PNG와 정확bounds/9점 hit를 함께 확인했다. source/localStorage·chooser/오류/details를 캡처 전후 비교했다. root도 React844/1024 오류 화면과 missing-runtime390 (로컬 전용 근거: `../../../output/playwright/k3a-template-warning-green-20260905-01/personal-workspace-k3a-tem-cf89c-s-the-blank-scaffold-usable/missing-runtime-390x844.png`)을 직접 열었다. 개별 평가와 긴 내용·중복 알림·시각 통일의 잔여는 [브라우저 QA§0/4](./k3a-authoring-guidance-browser-qa.md)에 있다.

K3-A final2는44격리 context/303API, K1-A final2는38context/313API다. 각각 prefix 밖·clear·운영 sentinel/비PoC bytes 불일치·console/page error0이다. 이 수는 서로 다른 등록 검사/내부 fixture 반복이며 관찰 사용자 수가 아니다. 저장 오류의 rollback에는 API가 발생하므로 모든 실패를 `API0`으로 요약하지 않는다. 읽기/취소/no-op과 실제 쓰기 시도를 구별했다.

K3-A 마감 후보 두 HTML은 각각 **1,249,043 bytes**, SHA256 **`1F64F15507D57574BC4E28BC8ADBC4E14A9CA61E1E5056166E7A6C35105CD5B8`**였다. 22/38의 메모리 후보A619(1,249,015bytes)에 unavailable warning 위치만 보완했으며 후속2개·최종 생성145개·기존29개·host8개를 별도로 실행했다. 이후 K3-B 시간 표시 수정으로 현재 파일은 D4C4 후보(1,249,266bytes)로 갱신했다. 이전 후보의 결과를 최신 후보 전체 재실행으로 바꾸지 않으며 [K3-B 시간 검증](./k3b-source-time-qa.md)에 후속 범위를 연결한다. 앱과 HTML의 모든 개인 편집 필드가 같아졌다는 뜻은 아니다.

기본 `/my`와 운영 key/schema/writer는 수정하지 않았다. 보호 검사551파일에서 허용 외 변경0을 확인했고 최신 원장 (로컬 전용 근거: `../../../output/poc-gap-implementation/protected-latest.json`)은 후속 작업마다 갱신한다. 이는 실제 운영 서버 데이터 스캔이 아니라 로컬 소유 보존 및 격리 저장소 시뮬레이션이다.

## 다음 단계와 공개 상태

K3-A의 제한 범위 판정을 마감하고 K3-B를 계속 진행한다. source time·개인 memo owner를 실제로 연결한 뒤, [무손실 adapter gate](./k3b-plan-lossless-gate.md)에 따라 mode/date·session/journal·삭제 소유를 먼저 검증하고 section/order·receipt로 이어간다. 과거 nullable date를 값이 같다는 이유로 inherit로 자동 변환하지 않는다. K3-C와 K4는 계속 계획에 남는다.

실제 Android Chrome/iOS Safari, OS IME·가상키보드·보조기술: **NOT_RUN**. 관찰 사용자 **0명**. commit **미실행**, push **미실행**, PR **미생성**, Preview **미배포**, Production **미배포**. 로컬 production build와 브라우저 자동화는 배포나 실제 기기 관찰이 아니다.
