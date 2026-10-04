# 선별 게시32파일 manifest

2026-10-04. 직전 [후속 갭 소유26파일](../2026-10-04-memo-date-feedback-gaps/results.md)을 그대로 인수하고 이번 준비 문서6개를 더한 **32파일 allowlist**다. 사용자의 이번 직접 ‘승인!’ 응답으로 선별 게시·해당 CI·운영 협업·DEV 반영/복귀 범위가 허용됐다. 이 승인과 실제 stage·commit·push·Draft PR 성공은 구분해 QA에 기록한다.

STATUS·PROJECT_CONTROL·ROADMAP·specs README4개는 아래 원26파일에 이미 포함돼 있다. 새 목표 진입점의 root 갱신으로 path 수를36으로 늘리지 않는다. 후보 원본/제공본의 미소유 변경은 인수하지 않았다. 삭제·rename·새 dependency·추가 runtime은 이 준비 작업 범위가 아니다.

## 개별 allowlist

| 번호 | 경로 | 인수 구분 |
| --- | --- | --- |
| 1 | `components/flow/integrated-poc/ProgramSpace.context.test.tsx` | 후보 modified |
| 2 | `components/flow/integrated-poc/ProgramSpace.tsx` | 후보 modified / 제품 runtime1 |
| 3 | `docs/PROJECT_CONTROL.md` | 후보 modified / 현재 진입점 |
| 4 | `docs/ROADMAP.md` | 후보 modified / 현재 진입점 |
| 5 | `docs/STATUS.md` | 후보 modified / 현재 진입점 |
| 6 | `docs/specs/README.md` | 후보 modified / 현재 진입점 |
| 7 | `scripts/personal-workspace-poc/memo-date-browser-fixture-20261004.ts` | 후보 modified |
| 8 | `components/flow/integrated-poc/ProgramSpace.date-roundtrip.test.tsx` | 후보 new |
| 9 | `components/flow/integrated-poc/ProgramTextEditor.partial-paste.test.tsx` | 후보 new |
| 10 | `docs/content-audit/2026-10-04-flowme-memo-date-feedback-gaps-report-ko.html` | 후보 new / 검증 요약 |
| 11 | `docs/specs/2026-10-04-memo-date-feedback-gaps/plan.md` | 후보 new |
| 12 | `docs/specs/2026-10-04-memo-date-feedback-gaps/qa.md` | 후보 new |
| 13 | `docs/specs/2026-10-04-memo-date-feedback-gaps/requirements.md` | 후보 new |
| 14 | `docs/specs/2026-10-04-memo-date-feedback-gaps/results.md` | 후보 new |
| 15 | `docs/specs/2026-10-04-memo-date-feedback-gaps/spec.md` | 후보 new |
| 16 | `docs/specs/2026-10-04-memo-date-feedback-gaps/tasks.md` | 후보 new |
| 17 | `docs/specs/2026-10-04-memo-date-feedback-gaps/ux-review.md` | 후보 new |
| 18 | `lib/flow/integrated-poc/text-partial-paste-regression.test.ts` | 후보 new |
| 19 | `lib/flow/integrated-poc/undated-expression-regression.test.ts` | 후보 new |
| 20 | `scripts/personal-workspace-poc/feedback-gaps-browser-fixture-20261004.mjs` | 후보 new |
| 21 | `scripts/personal-workspace-poc/feedback-gaps-fixture.test.ts` | 후보 new |
| 22 | `scripts/personal-workspace-poc/qa-feedback-gaps-app-20261004.js` | 후보 new |
| 23 | `scripts/personal-workspace-poc/qa-feedback-gaps-extra-20261004.js` | 후보 new |
| 24 | `scripts/personal-workspace-poc/qa-feedback-gaps-races-20261004.js` | 후보 new |
| 25 | `scripts/personal-workspace-poc/qa-feedback-gaps-report-20261004.js` | 후보 new |
| 26 | `scripts/personal-workspace-poc/serve-feedback-gaps-report-20261004.mjs` | 후보 new |
| 27 | `docs/specs/2026-10-04-alpha-memo-date-gaps-release/spec.md` | release new |
| 28 | `docs/specs/2026-10-04-alpha-memo-date-gaps-release/plan.md` | release new |
| 29 | `docs/specs/2026-10-04-alpha-memo-date-gaps-release/tasks.md` | release new |
| 30 | `docs/specs/2026-10-04-alpha-memo-date-gaps-release/qa.md` | release new / 이번 결과 원장 |
| 31 | `docs/specs/2026-10-04-alpha-memo-date-gaps-release/manifest.md` | release new |
| 32 | `docs/specs/2026-10-04-alpha-memo-date-gaps-release/runbook.md` | release new |

## 인수와 정규화 증거

source root는 `D:/flowme2605/flow-memo-date-feedback-gaps-20261004`, release root는 `D:/flowme2605/flow-memo-date-gaps-release-20261004`다. source raw SHA256/길이·source 예상 Git blob·인수 checkout SHA256/길이와 diff를 각각 기록한다. source 원26파일은 수정하지 않는다. 현재 진입점4개에 추가한 release 안내와 새6문서는 의도된 release delta로 별도 표시한다.

Git이 attrs/설정에 따라 LF/CRLF를 정규화하면 source raw SHA와 checkout SHA가 다를 수 있다. raw SHA는 원 bytes 보존 근거, Git blob은 저장 형태 동일성, checkout SHA는 실제 새 판본 인수 근거다. line-ending 설명만으로 content 차이를 허용하지 않으며 예상 Git blob/정규화 비교·경로별 diff로 승인된 변환인지 확인한다. 원시 SHA·개별 blob/checkout 원장은 로컬 전용이고 공개 요약은 [QA](qa.md)에 둔다.

실제 stage 직전 `git diff --name-only`와 expanded untracked path를 합쳐 이32파일과 집합 일치시킨다. 디렉터리로 접힌 status 수를 파일 수로 쓰지 않는다. `git add .`·와일드카드 stage·hook skip·allowlist 밖 path를 사용하지 않는다. 정상 pre-commit의 docs:check와 pre-push의 verify를 유지한다.

## branch·원격·외부 배포 경계

로컬 head `agent/alpha-memo-date-gaps-release-20261004` 생성은 확인했다. 새 commit/원격 branch/PR은 미실행이고, base 계획은 `agent/alpha-memo-date-release-20261004` / [Draft PR211](https://github.com/knhbae/flowme2605/pull/211)이다. 게시 직전에 실제 branch/base SHA·remote drift·main ancestor를 다시 확인한다. 새 PR은 PR211 위32파일 차이만 설명하고 기존 누적 commit을 새 기여로 표시하지 않는다. main merge는 하지 않는다.

게시 직전 Render/Vercel의 현재 Git 자동 배포·PR preview·deploy hook과 후보 Git deployment guard를 읽기 확인한다. 이전 off 관측을 현재 설정으로 재사용하지 않는다. 조회 실패/자동 배포 활성/새 외부 배포 영향이 있으면 게시하지 않고 현재 설정을 보존한다. 이 목표는 Render/Vercel 설정 변경이나 외부 배포를 승인하지 않는다.

## 공개 제외

원본 직접 피드백/PDF/ZIP·계정과 개인정보·실제/합성 상태 원본·catalog pack raw·로그·capture·trace·생성 bundle·`output/`·`.tmp/`·`.playwright-cli/`·`.next/`·`node_modules/`·환경/credentials·startup private profile/manifest 원본·운영 receipt는 allowlist 밖이다. QA 시나리오 **소스**와 개인정보 없는 검증 **요약**만 위 allowlist에 포함한다. 파일명에 public/summary가 있어도 범위 밖 원본을 자동 공개하지 않는다.

이 목록에 추가가 필요한 경우 기존 authorized scope인지 먼저 대조하고 소유·공개 영향·검증을 기록한다. 현재32파일 승인 질문을 임의로 확장하지 않는다.
