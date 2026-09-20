# K1-A 구현 파일·검증 인계

2026-09-05. 상위 목표는 계속 진행 중이며 K1-A만 제한 범위 검증 완료다. [상세 QA](./k1a-qa.md), [진행 원장](./progress.md), 열어 볼 HTML 보고서 (로컬 전용 근거: `../../content-audit/2026-09-05-flowme-integrated-poc-gap-implementation-ko.html`)를 함께 본다.

## 이번에 수정한 기존 파일

기존 dirty diff 전체가 이번 작업의 소유라는 뜻이 아니다. `output/poc-gap-implementation/before/`의 exact-before와 비교한 이번 delta만 소유한다.

| 경로 | 이번 변경 |
|---|---|
| components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx | 정확 helper ticket, persist-first, stale 재선택, failure/recovery, focus·844 CTA |
| components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.test.tsx | 관련 source-level 회귀 |
| lib/flow/personal-workspace-poc-storage.ts | authoring draft의 CAS·readback·정확 rollback |
| lib/flow/personal-workspace-poc-storage.test.ts | 신규 저장 오류·복구 회귀 |
| docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/app.js | helper ticket·native transaction·임시 값·IME·inline 오류 |
| docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/model.js | helper 전용 draft 저장·restore |
| docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/style.css | 검토가 열린 동안 좁은 중첩 스크롤 해소 |
| docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/standalone.test.cjs | helper 저장 회귀 10개 추가 |
| docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko.html | 원본 builder로 재생성 |
| docs/content-audit/2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html | 같은 bytes의 단일 HTML 재생성 |
| scripts/personal-workspace-poc/serve-p3h1-android-device.mjs | 현재 후보 bytes/SHA 갱신 |
| scripts/personal-workspace-poc/serve-p3h1-android-device.test.mjs | 현재 후보 CLI bytes 회귀 갱신 |
| lib/flow/personal-workspace-poc-p3h1-android-evidence.ts | 현재 후보 bytes/SHA 갱신 |
| docs/content-audit/2026-09-04-flowme-integrated-poc-p3h1-android-device-runner-ko-assets/model.js | 현재 후보 bytes/SHA 갱신 |
| tests/e2e/personal-workspace-p3h1-android-device-host.spec.ts | 현재 후보 bytes/SHA와 상수 기반 표시 기대값 |

현재 후보 갱신은 [P3-J 인계의 기존 계약](../2026-09-05-flowme-integrated-poc-execution-detail-gap-v1/handoff.md)을 따른다. K1-A 종료 후보는 944,305 bytes, SHA-256 `C0262526ECE4668E3E5A5212E52D8CD0FF5721723CE3C98EA9D264E43008C673`이다. 후속 구현에서 현재 후보가 바뀔 수 있다. 과거 Android NOT_RUN·manifest·P3-G/P3-I 역사 기록은 유지했다.

## 새 파일

- tests/e2e/personal-workspace-k1a-helper-safety.spec.ts — 두 runtime의 신규 38개 브라우저 검사.
- 이 spec 폴더의 baseline.cjs, run-check.cjs, progress.md, k1a-design.md, k1a-qa.md, k1a-handoff.md — 범위·비교·실행 근거.
- 이 spec 폴더의 build-report.cjs, report-data.json 및 생성된 한국어 gap-implementation HTML — 단계별 보고서.
- K2-A 준비 문서 k2a-design.md는 다음 단계의 설계다. K1-A 구현 완료 수에 포함하지 않는다.

## 검증과 미실행

실행별 숫자·실패 내역·화면 평가는 QA에 분리했다. 보고서 QA는 `output/poc-gap-implementation/report/browser-qa.json`: 다섯 viewport의 가로 넘침 0, 깨진 이미지·파일 링크 0, console/page error 0. root가 390/1440 캡처를 직접 확인했다. docs:check 16 required files·4,805 links PASS.

실제 Android Chrome·iOS Safari·OS IME·TalkBack/VoiceOver NOT_RUN, 관찰 사용자 0명. commit·push·PR·Preview·Production 모두 미실행이다. production build는 배포가 아니다.

## 이어갈 작업

K2-A 신규 완료 초기값/결과 projection을 검증하고 다음 K1-B dirty 닫기로 진행한다. 원본 네 그룹·한 editor·기술 설명·정보 밀도는 K3-A에 남긴다. 상위 목표를 완료로 닫지 않는다.
