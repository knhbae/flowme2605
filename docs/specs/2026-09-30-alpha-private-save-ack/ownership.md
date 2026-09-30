# 게시 범위와 기존 변경 보존

2026-09-30 읽기 감사 및 이전 핵심 UX 변경 복원. 이 문서는 파일 소유권과 게시 경계를 다룬다. 코드 수정, Git index 변경, commit/push/PR/원격 설정 변경은 이 감사에서 실행하지 않았다.

## 확인한 기준점

작업 위치는 `D:/flowme2605/flow-alpha-backup-5d-publish-20260929`, HEAD는 `2b798d4373bc7c3528302ef5656e02acafe2a891`이다. 이전 핵심 UX 시작 직전의 원본 Git 출력에서 modified 31개와 untracked 54개를 확인했다. 현재 파일의 시각이나 기능 이름으로 소유권을 추측하지 않았다.

- 원본 대화 ID: `01a05c9b-1bdb-7e62-9d10-b29f49c3a54e`. 로컬 세션 파일 `rollout-2026-09-01T19-54-24-01a05c9b-1bdb-7e62-9d10-b29f49c3a54e.jsonl`, line 242441, `2026-09-30T11:31:58.807Z`의 Git 출력이 31/54 목록이다.
- 같은 파일의 core UX FileChange 구간은 line 242539~243702다. 이번 복원은 그중 명시한 파일의 변경 이벤트만 읽었다.
- 입력 담당 세션 `01a0f215-56ff-7123-931b-05a43f0cc491`, 개인공간·저장 담당 세션 `01a0f215-0b8f-7751-8b02-8def16302399`, fixture 담당 세션 `01a0f215-9f8f-70a3-b2f4-3e6e816e006d`의 같은 목표 FileChange를 대조했다.
- 개인 `.tmp`, credentials, 실제 계정 원문은 읽거나 복제하지 않았다. 생성한 사본은 아래 두 소스 파일과 공개 가능한 변경 문맥뿐이다.

## 파일별 소유권

| 구분 | 경로 | 판정 |
| --- | --- | --- |
| 이전 UX가 처음 변경한 추적 파일 11개 | `components/flow/integrated-poc/AlphaWorkspace.module.css`, `ProgramSpace.tsx`, `ProgramSpace.module.css`, `ProgramTextEditor.tsx`, `ProgramTextEditor.test.tsx`; `lib/flow/integrated-poc/alpha-persistence/client.ts`, `client.test.ts`; `lib/flow/integrated-poc/alpha-sync/controller.ts`, `controller.test.ts`; `lib/flow/integrated-poc/vendor/text-editor.cjs`, `text-editor.css` | 31개 baseline 목록에 없으며 이전 core UX FileChange에 존재. 그 목표 종료 시점의 HEAD 차이는 core UX 소유다. 이번 ACK의 후속 변경과는 다시 구분한다. |
| 기존 5D와 core UX가 섞인 소스 2개 | `components/flow/integrated-poc/AlphaWorkspace.tsx`, `AlphaWorkspace.test.tsx` | 파일 전체는 게시 대상이 아니다. 아래 복원 patch의 core UX hunk와 이번 ACK hunk만 검토한다. |
| 기존 내용과 core UX가 섞인 문서 4개 | `docs/ROADMAP.md`, `STATUS.md`, `PROJECT_CONTROL.md`, `docs/specs/README.md` | core UX 추가·최종 수정 hunk만 복원했다. 기존 5D·runtime 항목은 제외한다. |
| 기존 변경이며 core UX 소유 아님 | `docs/DECISIONS.md` | 실제 diff는 9/29 노트북/Cloudflare 결정 12줄. core UX의 해당 파일 FileChange는 없으므로 제외한다. |
| core UX 신규 소스·검사 | `components/flow/integrated-poc/ProgramSpace.context.test.tsx`; `lib/flow/integrated-poc/folder-link-slot.ts`, `folder-link-slot.test.ts`, `text-editor-composition-visibility.test.ts`; `scripts/alpha/core-workspace-ux-fixture.ts`, `core-workspace-ux-build-preload.cjs` | baseline untracked 목록에 없고 해당 목표의 추가 이벤트를 확인했다. 제품 파일과 QA 도구의 역할을 구분해 선택한다. |
| core UX 신규 문서 | `docs/specs/2026-09-30-alpha-core-workspace-ux/`의 5개 문서, `docs/content-audit/2026-09-30-flowme-alpha-core-workspace-ux-ko.html` | 해당 목표 소유. 결과 보고서의 로컬 이미지와 문서의 기존 미게시 후속 링크는 clean candidate에서 다시 확인해야 한다. |
| 로컬 QA만 | `.next-core-workspace-ux-20260930/`, `output/playwright/alpha-core-workspace-ux/`, 이 감사의 `output/alpha-private-save-ack/` | 빌드·브라우저·소유권 근거. 게시 대상에 자동 포함하지 않는다. |

위에 열거하지 않은 baseline 31/54 경로는 이번 목표의 소유 파일로 승격하지 않는다. 특히 `AlphaPreservationPanel*`, `AlphaBackupJobs.tsx`, `alpha-backup-jobs/`, `alpha-entry-presentation*`, `alpha-sync/request-budget.ts`, alpha auth/environment/server/backup 변경, laptop/5D 도구·SQL·테스트, 출처 검토 변경, package 파일과 의존성 검사는 그대로 보존한다.

## 혼합 파일의 hunk 복원

`output/alpha-private-save-ack/previous-core-ux.patch`는 혼합된 6개 파일에서 이전 core UX만 분리한 **순수 증가분**이다. 전체 core UX 파일 집합이나 이번 ACK를 담은 완성 게시 patch가 아니다. 적용 기준은 HEAD가 아니라 기존 5D 변경이 이미 있는 pre-core UX 상태다. HEAD에 바로 적용하거나 전체 파일을 stage하는 용도로 사용하지 않는다.

| 파일 | 변경 이벤트 근거 | 순수 증가분 |
| --- | --- | --- |
| AlphaWorkspace.tsx | 입력 담당 line 245; root 243202, 243387, 243461 | 16행 추가·10행 삭제. 관리 접기와 공개 주의 유지, 확정 거절 표시·재시도 안내·결과 미확정 안내 분리 |
| AlphaWorkspace.test.tsx | 입력 담당 line 265; root 243203, 243388, 243462 | 110행 추가. 정보계층 4개 및 알려진 거절 관련 3개 검사 |
| ROADMAP.md | root 242539, 243627 | 4행 추가 |
| STATUS.md | root 242539, 243627 | 8행 추가 |
| specs/README.md | root 242539 | 4행 추가 |
| PROJECT_CONTROL.md | root 242539, 243627 | 4행 추가 |

변경 전 두 소스는 `output/alpha-private-save-ack/core-baseline-AlphaWorkspace.tsx`와 `core-baseline-AlphaWorkspace.test.tsx`에 보관했다. 이름의 baseline은 **이번 ACK 시작 전, 이전 core UX 완료 후**를 뜻한다. 해당 소스에서 이전 core UX 이벤트를 역순으로 적용해 `pre-core-AlphaWorkspace.tsx`와 `pre-core-AlphaWorkspace.test.tsx`를 복원했다. 파일 내용은 LF로 정규화했으며 콘솔 출력 과정의 마지막 빈 줄이 있을 수 있다. 원래 작업 파일을 덮어쓰지 않았다.

검증: 두 파일 각각 4개 이벤트를 역적용한 뒤 정순 재적용하여 캡처 소스와 문자열 동일성을 확인했다. 생성한 net patch도 같은 두 파일의 왕복 동일성 PASS다. 문서는 상단 160줄의 해당 이벤트를 역적용/정순 적용해 동일성을 확인했다. `git apply --numstat`로 6개 경로와 위 행 수의 patch 문법을 검증했다. 실제 Git index나 작업 파일에는 적용하지 않았다. 복원한 pre-core 파일에 5D 코드가 남는 것도 확인했다. 이것은 clean HEAD 재현이나 빌드 성공을 뜻하지 않는다.

## clean candidate의 선행 경계

1. HEAD의 `package.json`은 `brace-expansion: 5.0.9` 전역 override를 갖는다. 기존 5D runbook은 이 버전의 High 취약점과 minimatch 3/5의 CommonJS 함수 API 비호환을 기록한다. 현재 작업 폴더의 소비자별 `1.1.21`·`2.1.7` override와 `scripts/dependency-compatibility.test.mjs`는 core UX 이전 변경이다. 이번 게시에 임의 포함하지 않는다. HEAD 기반 candidate의 보안/설치/빌드 실패는 선행 문제로 기록하고 승인된 범위와 구분한다.
2. 현재 full-worktree `npm test` 성공은 기존 출처 검토 및 package 변경까지 포함한 결과다. core UX만 떼어낸 candidate의 성공 증거로 사용할 수 없다. 기존 출처 freshness gate의 날짜 경과 문제도 별도로 재현해야 한다.
3. 혼합 AlphaWorkspace의 관리 UI 문맥에는 기존 5D의 `preservationBlocked`, backupJobs, recovery 상태가 있다. 순수 UX hunk를 HEAD에 옮길 때 해당 기능을 통째로 복사하지 말고 HEAD의 기존 보호 조건에 맞추어 적용한 뒤 검사해야 한다.
4. core UX 문서에서 기존 untracked `alpha-follow-up-register-20260930.md`, runtime-save-stability spec을 참조한다. 문서 링크 통과를 이유로 이 미소유 파일을 함께 게시하지 않는다. 게시용 문서의 참조 범위 조정이나 선행 문서 게시가 필요하다.

## 원격과 CI 선택지

읽기 조회에서 origin은 `knhbae/flowme2605`, 원격 main은 `efd8b642707b5c8e67b727f23169ae41c43cb5e8`, 기존 열린 PR #204의 head `agent/alpha-m1-persistence-20260921`은 현재 HEAD와 같은 `2b798d43`이다. `gh` 실행과 원격 읽기가 가능하다. fetch로 로컬 ref를 갱신하지 않았다.

- 새 branch에 scoped commit을 push: 기존 PR 범위를 건드리지 않는다. 다만 현재 CI는 `pull_request`와 main push만 받으며 `workflow_dispatch`가 없어 branch push만으로 CI가 시작되지 않는다. CI까지 하려면 별도 PR 생성 또는 승인 범위 안의 workflow 변경이 필요하다.
- 기존 PR #204 head에 push: 기존 PR의 synchronize로 CI가 실행될 수 있다. 동시에 기존 PR의 diff/검토 범위가 확대된다. 단순 CI 실행 수단으로 기존 PR에 다른 목표를 섞지 말고 사용자 게시 의도에 맞는지 판단해야 한다.
- main push/merge: 이번 scoped 게시에 필요하지 않으며 선택하지 않는다.

`.githooks/pre-commit`은 docs:check, pre-push는 verify를 실행한다. 혼합 런타임 폴더에서 pre-push build를 실행하면 보호 중인 `.next`를 바꿀 수 있으므로 검증 가능한 별도 candidate에서 정규 hook을 실행하는 편이 적합하다. hook 우회는 이번 감사의 권고가 아니다.

배포 경계: 현재 추적 `vercel.json`은 `git.deploymentEnabled=false`, CI에는 배포 명령이 없다. 9/26 원장의 Vercel Root Directory/Deploy Hooks 확인 및 Render `autoDeploy=no`·PR preview Off 기록은 과거 근거다. 이 감사에서 외부 호스팅 현재 설정을 다시 조회하지 않았으므로 push 전후 배포 없음까지 새로 확인했다고 말하지 않는다. 현재 개발계 교체·Render/Vercel 수동 배포·Cloudflare/Windows 등록·DB/Auth 변경은 범위 밖이다.

## 9/30 clean candidate 구성과 선행 게이트 재현

root가 HEAD `2b798d43`에서 만든 별도 detached worktree `D:/flowme2605/flow-alpha-core-ux-publish-20260930`에 소유 변경만 투영했다. 원본 런타임 작업 폴더의 Git index, `.next`, node_modules와 기존 미소유 파일은 변경하지 않았다. 후보의 package/lock·curated seed·출처 검토 파일은 HEAD와 동일함을 재확인했다.

후보 소스는 앞의 전체 소유 추적 파일 11개, 이번 ACK의 `document-action.ts`, 신규 소스/검사/QA 8개와 혼합 AlphaWorkspace 소스·검사에서 분리한 own hunk다. 총 추적 수정 14개다. 그중 순수 추적 12개와 신규 7개(호스트 전용 preload 제외)는 원본과 LF 정규화 후 19/19 동일했다. AlphaWorkspace `present` 함수와 이번 5개 shell ACK 검사 블록도 원본과 동일했다. `currentOwnerRef`는 계정 교체 뒤 ACK를 막는 독립 ref로만 추가했으며 기존 5D의 backupJobs, preservationBlocked, rememberPreservationState, selectAlphaEntryPresentation은 후보 두 파일에 없다.

이전 5D에 종속된 기존 shell 검사 3개 및 core UX의 `closed backup work still exposes ...` 검사 1개를 제외했다. 기존 백업 기능을 삭제한 것이 아니라 HEAD에 없는 미게시 5D 변경을 가져오지 않은 것이다. 따라서 원본 185개 표적(175개와 폴더·IME 10개)과 후보 181개를 같은 집합으로 표현하지 않는다.

신규 core UX spec 5개·ACK spec/plan/tasks/qa 4개와 자체 HTML 보고서를 후보에 복제했다. 기존 STATUS/ROADMAP/PROJECT_CONTROL/DECISIONS/specs index는 통째로 복제하지 않았다. 후보 문서의 미게시 5D 원장·runtime spec 링크는 로컬 전용 근거라는 비링크 표시로 바꿨고, HTML의 미게시 이미지 2개와 후속 원장 링크도 로컬 전용 경로 설명으로 바꿨다. 원본 보고서는 그대로다. QA preload의 HEAD에 없는 backup-jobs-handler alias 검사만 후보에서 제외했으며 후보 빌드는 별도 `.next`에 정규 build로 실행했다.

| 후보 검사 | 관측 결과 |
| --- | --- |
| `npm ci` | exit 0. 후보 node_modules에 220개 설치. 기존 런타임 dependency tree 변경 없음 |
| `security:audit` | **exit 1: High 2건**. brace-expansion 4.0.0~5.0.11의 DoS advisory 3개와 minimatch 의존 관계. HEAD의 5.0.9 override 유지 상태에서 재현 |
| 소비자 API 읽기 확인 | minimatch 3.1.5가 brace-expansion 5.0.9의 object export를 가져옴. `file-a.txt`와 `file-{a,b}.txt` 매칭에서 `TypeError: expand is not a function`, exit 1 |
| `npm test` | **exit 1**. 도달한 출처 그룹 637개 중 636 PASS·1 FAIL. `seed-flows.test.ts:1289`의 `normal user routes fail the standard suite when source review is due`에서 6개 발견. 뒤에 연결된 그룹은 실행되지 않았으며 전체 PASS라고 하지 않음 |
| 출처 gate 대상 | opic-2w, opic-1m, new-car-7-step, moving-dday, wedding-timeline, wedding-vendor-board. 기록된 checkedAt은 모두 `2026-07-01T00:00:00+09:00`. 날짜·gate·원본 자료 수정 없이 재현 |
| 첫 정규 build | 컴파일 성공 뒤 이번 ACK callback의 `next.account possibly null` 타입 오류 발견. root가 proof의 `privateSave.next`를 const로 잡는 동일 수정 적용 |
| 수정 후 정규 build | **exit 0**. Next 15.5.25, compile 8.3초, 타입 검사·정적 18/18·trace/경로 출력 완료. 후보 `.next`만 사용했으며 서버 실행·개발계 교체 없음 |
| 타입 수정 후 최종 표적 | **exit 0: 181/181 PASS**, 실패·취소·skip 0. AlphaWorkspace, ProgramTextEditor, ProgramSpace.context, private-save-ack, client, controller, folder-link-slot, composition-visibility의 8개 파일 |
| 후보 QA fixture build | **exit 0**. 382개 소스, 7,026,023바이트. 파일 생성만 수행했으며 fixture 서버나 브라우저는 시작하지 않음 |
| 후보 문서 검사 | PASS: 4개 검사, 필수 16개, 로컬 링크 6,651개. 이 값은 ownership/최종 QA 원장 재동기화 전 검사다 |
| 소유 범위 확인 | `git diff --check` PASS. dependency/curated/source-review 6경로는 HEAD와 diff 0. stage/commit/push/PR/원격 설정 변경 0 |

보안과 출처 검토는 후보에서 직접 재현한 선행 게시 게이트다. 기존 작업 폴더의 관련 변경을 허락 없이 포함하거나 취약점 기준·출처 날짜를 낮추지 않았다. 사용자 판단 전에는 이 후보를 게시 가능으로 판정하지 않는다. 후보에서 브라우저 QA·CI·관찰 사용자 검증을 새로 수행한 것은 아니다. root의 원본 worktree QA와 후보의 검사를 분리한다.

## pending 조회 보호 동기화 후 재검증

후속 합성 브라우저에서 발견된 pending 조회의 조기 외부 변경 판정을 막기 위해 root의 `present` 함수 최신 내용을 후보에 동기화했다. 같은 계정 확인 후 `if (next.pending && currentData.current) return;`에서 표시 중인 baseline을 유지하고, receipt가 해소된 다음 기존 전체 ACK gate를 통과시킨다. pending own poll 후 ACK 성공과 pending foreign revision 후 실제 충돌의 회귀 2개도 가져왔다. 5D·dependency·출처 검토 변경은 추가하지 않았다.

이 동기화 후 후보의 최종 표적은 **183/183 PASS**(원본 187개에서 5D 종속 4개 제외), 실패·취소·skip 0이다. 정규 production build도 **exit 0**, compile 7.5초·타입 검사·정적 18/18·최종 trace/경로 출력 완료다. QA fixture를 다시 빌드해 382개 소스·7,026,078바이트를 생성했으며 서버·브라우저는 시작하지 않았다. 순수 파일 19/19 원본 일치, 혼합 두 파일의 5D 식별자 부재, 보호 dependency/출처 6경로의 HEAD diff 0과 staged 0을 다시 확인했다. 앞의 보안 High 2건·출처 6건 선행 게이트는 해결하거나 우회하지 않았으며 게시 판정은 계속 보류다.

## 최종 문서 연결

root가 마감한 ACK `qa.md`와 `tasks.md`를 후보에 동기화했다. 후보 STATUS는 HEAD 위에 이번 ACK 최상단 블록과 직전 core UX 소유 블록만 14줄 추가했다. 미게시 서버 실행/5D 원장의 문맥은 가져오지 않았으며 해당 참조는 로컬 전용 근거라는 비링크 설명으로 바꿨다. specs index에는 ACK의 `spec.md#목표와-경계`와 QA/작업/소유 원장 링크만 4줄 추가했다. 원본 STATUS·QA·tasks·index는 이 담당이 수정하지 않았다.

변경 파일 링크·마감 결과·관측한 복구 저장 Undo 제약을 담은 최종 QA/tasks 재동기화 후 후보 문서 검사 PASS: 테스트 4개·필수 문서 16개·로컬 링크 6,680개. diff 검사 PASS, staged 0이다. 후보는 추적 수정 16개와 신규 19개, 총 35경로이며 commit/push/원격 변경은 없다. 앞의 코드 검증 및 선행 보안·출처 실패 판정은 그대로다.

## 2026-09-30 선행 수정 승인 후 게시 범위

위의 High 2건·출처 6건 실패와 게시 보류는 **선행 수정 승인 전 시점의 기록**이다. 실패 이력을 삭제하거나 당시 검사를 성공으로 바꾸지 않는다. 이후 사용자가 보안·출처 검증 해결을 이번 목표에 포함하도록 승인했고, 별도 branch와 Draft PR을 사용하는 게시 경로도 승인했다. 기존 PR 204의 범위 확대, main 병합, 배포, 기존 개발계 교체는 이 승인에 포함하지 않는다. 이 소유권 감사 담당은 branch 생성·stage·commit·push·PR 작성·호스팅 변경을 실행하지 않았다.

새 후보에서 해결한 경로는 다음 9개뿐이다. 원본 dirty worktree의 dependency·출처 변경 전체를 복제한 것이 아니며, 앞서 보호한 5D·runtime·개인 자료 경계는 유지한다.

| 승인 후 추가 범위 | 경로 |
| --- | --- |
| 의존성 보안·실제 소비자 호환성 4개 | `package.json`, `package-lock.json`, `scripts/dependency-compatibility.test.mjs`, `docs/specs/2026-09-30-alpha-private-save-ack/security-prerequisite.md` |
| 원문 6건의 개별 검토·회귀 5개 | `docs/content-audit/2026-07-01-curated-source-app-seed-v1.json`, `lib/flow/curated-source-app-seed.ts`, `lib/flow/seed-flows.test.ts`, `lib/flow/source-freshness.test.ts`, `docs/content-audit/2026-09-30-core-ux-publish-source-review.md` |

의존성 변경은 소비자별 `brace-expansion` 고정과 회귀 검사다. High 감사 기준을 낮추지 않았다. 출처 JSON은 직접 검토한 6개 Flow의 개별 확인일과 업체 보드 원문 URL 한 곳만 변경했다. 전역 생성일, 기존 archive·의료 보류 정책과 실제 현재 날짜 freshness 검사를 유지한다. 공개 원문을 요청한 출처 검토와 비공개 catalog 요청은 별개이며, 이 소유권 감사에서는 비공개 catalog에 외부 요청을 보내지 않았다.

최신 후보 로그를 읽어 확인한 결과는 다음과 같다. 이 감사에서 테스트나 build를 추가 실행하지 않았다.

| 최신 후보 로그 | 확인 결과 |
| --- | --- |
| `candidate-npm-test-final.log` | 15개 실행 그룹, 합계 2,258 PASS, 각 그룹 fail 0 |
| `candidate-targeted-final.log` | 183/183 PASS, fail·cancelled·skipped 0 |
| `candidate-security-final.log` | 취약점 0, 실제 소비자 호환성 4/4 PASS |
| `candidate-build-final.log` | compile 12.0초, 타입 검사 이후 정적 18/18 및 최종 trace/경로 출력 완료 |

로그 위치는 후보의 로컬 전용 `output/alpha-private-save-ack/`다. 앞의 compile 7.5초는 이전 실행이며 최신 실행과 구분한다. 별도 독립 검토 통과는 상위 작업자의 검토 기록에 근거하고, CI 통과나 실제 사용자 검증으로 바꾸어 쓰지 않는다.

현재 게시 후보는 **44경로: 추적 수정 22개 + 신규 22개**다. 기존 소유 범위 35경로에 승인된 9경로를 더한 수다. 정확한 파일 목록과 파일별 SHA-256은 로컬 전용 `output/alpha-private-save-ack/publish-manifest-20260930.json`에 기록한다. 이는 캡처 시점의 manifest이며 상위 작업자가 이후 마감 문서를 수정하면 해당 hash를 다시 대조해야 한다.

파일 목록에 build 산출물, `output/`, `.next*`, `.tmp/`, `.env*`, `node_modules/`, 비공개 raw catalog, 실제 계정 자료는 없다. `.github/workflows`와 `.githooks`의 HEAD diff는 0이고 staged 파일도 0이다. QA 도구 소스 2개는 게시 후보에 포함하지만 도구가 생성한 catalog·bundle·브라우저 증거는 포함하지 않는다. `.agents` 런타임 snapshot 역시 이 44경로에 포함하지 않는다. 이 기록은 scoped 게시 준비 확인이며 아직 commit/push/CI 완료를 주장하지 않는다.
