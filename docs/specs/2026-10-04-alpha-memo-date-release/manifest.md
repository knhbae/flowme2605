# 선별 게시 manifest

2026-10-04, 사용자 ‘승인’으로 선별 게시·CI·DEV/자동 시작 전환·복귀·운영 협업이 허용됐다. [직전 소유30경로](../2026-10-04-personal-memo-date-ux/ownership.md)를 그대로 인수하고 이번 문서6개를 추가한 **승인36경로**다. 실제 stage 직전 개별 경로의 집합 일치를 다시 확인한다. 새 runtime·테스트·dependency 변경은 이 준비 목표에서 하지 않았다.

## 허용 경로

1. 직전 ownership의 개별30경로. 그중 STATUS/PROJECT_CONTROL/ROADMAP/specs README4개에는 이번 목표의 현재 진입점만 추가한다.
2. `docs/specs/2026-10-04-alpha-memo-date-release/spec.md`
3. `docs/specs/2026-10-04-alpha-memo-date-release/plan.md`
4. `docs/specs/2026-10-04-alpha-memo-date-release/tasks.md`
5. `docs/specs/2026-10-04-alpha-memo-date-release/qa.md`
6. `docs/specs/2026-10-04-alpha-memo-date-release/manifest.md`
7. `docs/specs/2026-10-04-alpha-memo-date-release/runbook.md`

추가가 필요하면 목적·소유·보호 경계를 먼저 기록하고 이 목록을 갱신한다. `git add .`·와일드카드 stage·hook 우회·미소유 변경 인수는 사용하지 않는다.

## 원격/branch 계획

- 저장소 `knhbae/flowme2605`, public. 기존Draft PR210 head `agent/ux-comparison-gaps-20261002` /58df.
- 새 branch `agent/alpha-memo-date-release-20261004`를 위PR210head에서 생성했다. stage·commit·push는 아직 실행하지 않았다.
- 새 Draft PR은 기존 PR210 위의 차이만 공개한다. 기존25commit을 새 기여로 표현하지 않는다. main 병합은 제외한다.
- 정상 Git hook은 `.githooks/pre-commit`·`.githooks/pre-push`다. skip 변수를 설정하지 않는다.

## Git 밖의 로컬 자료

`.tmp/`·`output/`·`.playwright-cli/`·`.next/`·`node_modules/`·원본 feedback/PDF/ZIP·계정 파일·봉인 catalog 입력·환경 파일·startup private profile·raw 운영로그는 allowlist 밖이다. public 원장이라는 파일명도 자동 공개 승인이 아니다. 기존 generated 증거는 로컬에 보존하고 summary만 문서화한다.

10/4 05:07~05:10 UTC 읽기 확인에서 Render 해당서비스의 autoDeploy=no·trigger=off·PR previews=off, Vercel 후보의 scalar `git.deploymentEnabled:false` 및 해당 프로젝트 저장소연결 유지·deploy hook 없음을 확인했다. [현재 QA](qa.md)에 조회 범위를 기록했다. 수동 배포나 모든 외부 자동화를 차단했다고 주장하지 않는다. 실제 push 직전 현재 설정/후보파일을 다시 읽어 확인하며, 확인 실패나 Git 자동 배포 활성 상태이면 게시를 중단한다. 설정을 임의로 바꾸지 않는다.
