# K2-A 변경 파일·인계

2026-09-05. [QA](./k2a-qa.md)의 기능 범위만 검증 완료다. [화면 잔여](./k2a-visual-review.md), 기존 브라우저 2 FAIL, 실제 기기 미실행은 그대로 남긴다. 상위 목표는 계속 진행 중이다.

## 이번 묶음의 제품 delta

| 파일 | K2-A 변경 |
|---|---|
| `lib/flow/personal-workspace-poc-result-projection.ts` | 작성 preview/개인 실행 목적 분리, 개인 완료의 sourceChecked fallback 제거 |
| 같은 경로 `personal-workspace-poc-result-projection.test.ts` | 신규 13개 소유권 검사 |
| `components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx` | 작성 projection purpose 명시 1곳 |
| 같은 경로 `PersonalWorkspacePocSurface.tsx` | 개인 실행 projection purpose 명시 1곳 |
| `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/model.js` | 새 handoff 개인 완료 기본값 버전 상수와 적용 |
| 같은 경로 `standalone.test.cjs` | 신규 13개 검사 |
| `tests/e2e/personal-workspace-k2a-completion-ownership.spec.ts` | 새 브라우저 22개(공통11 × runtime2), 보관된 경계 attachment |
| `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko.html` 및 `2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html` | 기존 generator로 생성. K2-A checkpoint 944606 bytes / F8AFA3CC0059E41D05CDF29F3C168A32AAF3FF023E5A7DC0FF9A297FB03D1D19 |
| `scripts/personal-workspace-poc/serve-p3h1-android-device.mjs` 및 `.test.mjs` | 현재 후보 bytes/SHA |
| `lib/flow/personal-workspace-poc-p3h1-android-evidence.ts` | 현재 후보 bytes/SHA |
| `docs/content-audit/2026-09-04-flowme-integrated-poc-p3h1-android-device-runner-ko-assets/model.js` | 현재 후보 bytes/SHA |
| `tests/e2e/personal-workspace-p3h1-android-device-host.spec.ts` | 현재 후보 bytes/SHA와 기존 locale formatting 검사 |

위 파일의 전체 Git diff가 이번 소유라는 뜻은 아니다. 시작 전에 있던 변경을 보존하고 K2-A 전후 snapshot의 delta만 소유한다. K1-A에서 넣은 viewport 수정 등은 별도의 앞 단계 변경이다. 현재 후보 검사용 수치만 맞췄으며 과거 실제 기기 기록이나 NOT_RUN을 수정하지 않았다.

## 검증·보호

최신 npm 2,249/2,249, standalone 119/119, production build PASS. 신규 browser 22/22, K1-A/선정 Stage2/P3-C/host 회귀 67/67, 추가 기존 boundary 7개 중 5 PASS·2 FAIL. 재실행과 포함된 focused 수를 더하지 않는다. 상세 실행 파일과 시나리오 한계는 QA에 있다.

K2-A 마감 시 문서 검사 16 required files·4,817 local links PASS. 보고서 다섯 viewport에서 document 가로 넘침 0, 깨진 이미지 0, 누락 로컬 링크 0을 확인했다. 보호 snapshot 551개 중 허용된 제품 경로 14개가 시작 시점과 달랐고 예상 밖 변경은 0개였다. 이 수치를 551개 전체 불변이라고 표현하지 않는다.

운영 불변은 새 자동화 context의 sentinel 22개에서 확인했다. 실제 사용자 저장소를 열지 않았다. 실제 Android/iOS/OS IME/보조기술 NOT_RUN, 관찰 사용자 0, commit/push/PR/Preview/Production 없음.

## 다음 묶음

K1-B의 standalone 편집 닫기·저장 실패·Back을 진행한다. 그 뒤 K2-B 기간·순서, K2-C Undo/피드백, K3 원본 UX 정합 순서다. K2-A에서 확인한 Sheet 줄바꿈·toast 겹침·영수증 차이·옛 parity 테스트 계약은 해당 단계의 검증 입력으로 넘긴다.
