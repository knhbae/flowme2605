# 통합 PoC Git 보존 — 2026-09-20 실행 근거

현재 실행 상태는 [알파 원장](alpha-transition.md)에 연결한다. 이 문서는 M1 전에 현재 기능형 PoC·검증·계획을 Git 기준점으로 보존하는 작업의 근거다. 수정·검증과 발행 상태를 구분하며, 아래 과거 실패는 후속 성공으로 지우지 않는다.

## 승인과 경계

- 사용자: 필요한 코드 commit/push 가능, 배포는 별도 승인. 현재 목표는 안전한 보존과 Draft PR이다. 누구나 가입·Google 우선/이메일 대안·초기 무료 검증은 [결정 로그](../../DECISIONS.md#2026-09-20---실사용-알파-인증가입무료-검증과-발행-권한)가 정본이다.
- 후속 승인: 기존 출처 검토 기한 실패와 의존성 취약점을 실제 수정·재검증한다. 날짜만 올리기, hook/CI 생략, 검증 실패 은폐는 하지 않는다.
- 금지: merge·Preview/Production 배포, 저장소 visibility 변경, DB/Auth/환경변수/유료 설정 변경, 기존 사용자 데이터·원래 flow-mvp dirty 수정, 미소유 변경 일괄 stage.

## 시작 상태와 소유 근거

branch `agent/personal-workspace-v4-1-poc-20260901`, HEAD `6e4b44fe2f61b7086b8bbc61c30b5aa39dd4390e`. 12:08 UTC 기준 modified193/untracked478(디렉터리 요약 포함), index 비어 있음. GitHub `knhbae/flowme2605`는 이미 PUBLIC이고 해당 head의 PR은 없었다. 원격 main은 `b4a25a4fc85c99de32fb4282a00a9293ee532952`; 현재 head와 1/10 diverged. main 전체를 덮어쓰거나 병합하지 않는다.

최종 PoC의 421-source manifest와 현재 bytes는421/421 일치했다. 다만 이는 전체 재현 의존성 목록이 아니다. Route를 포함한 TypeScript 읽기 그래프는1018 source, integrated 밖 변경 dependency56개를 참조한다. 예전 PoC library/StructureDraft/UI 및 CSS·테스트 파일 자료를 추가 확인해야 한다.

| 분류 | 근거 / 처리 |
| --- | --- |
| integrated-poc 419개 + Route/ResultPresenter2개 | 최종 build manifest421 및 현재 SHA 일치. 보존 핵심 후보 |
| 기존 personal-workspace-poc·StructureDraft·creator library·package script | 9/3 P3-B/C tasks, 9/5 gap candidates/QA의 구현·소유 근거를 따름. 9/12 이전 dirty라는 이유만으로 버리지 않음 |
| DateGroupedTodoList/MyPlanExecutionSurface | K2-C QA에 작업 전 clean·승인·before SHA·optional slot 변경 명시. 좁은 기존 diff 보존 |
| dog-adoption source-fit와 관련5파일 | 9/4 감사와 P3-E 인계에 채택 근거. 콘텐츠 보류 변경으로 분리하며 metadata/현재 hold를 최신 main으로 덮지 않음 |
| 7/27 architecture60파일 | 9/12 보호hash 동일·의미 diff0. 정리/복원/stage하지 않음 |
| output·test-results·프로필·임시 캡처 | 일괄 포함 금지. 테스트 필수 합성 fixture 및 공개 검토된 직접 참조 근거만 별도 선정 |

현재 tests 중 일부가 인접 D2 worktree나 ignored output의 BEFORE 파일을 참조하므로 clean checkout 재현 수리가 필요하다. 로컬 PASS만으로 공개 PR의 CI 재현을 보장하지 않는다.

## 첫 실행 검사 — 수정 전

| 검사 | 결과 |
| --- | --- |
| `npm.cmd test` | FAIL. 마지막 묶음634실행/633PASS/1FAIL. 앞선 pretest 묶음을 포함한 총 실행 수는 recorder로 다시 집계 예정. 같은 명령의 재실행을 고유 테스트 수에 합산하지 않음 |
| 실패 내용 | `normal user routes fail the standard suite when source review is due`: 일반 실행 콘텐츠9개 기한 경과. 실제 원문 검토 또는 유효한 기존 승인 검토 근거로만 처리 |
| `npm.cmd run security:audit` | FAIL: low1/moderate1/high2/critical1, 합계5. Next·sharp·browserslist·baseline-browser-mapping·postcss-selector-parser |
| `npm.cmd run build` | PASS, Next15.5.21, 정적18페이지. 로컬 build이며 배포 아님 |
| 통합 신규 검사 | 수정 전181파일 1749/1749 PASS. 수정 후 재검사는 아래 별도 기록 |

수정 전 실패를 성공으로 덮어쓰지 않는다. 기존 9/7 main의 의미 감사와 현재9/4 dog hold는 일부 충돌하므로 좁은 적용과 별도 회귀가 필요하다. kids-printable은9/7 검토 대상이 아니므로 새 검토가 필요하다.

## 배포 보호

현재 GitHub hooks0이며 GitHub Pages 조회는404다. Vercel 프로젝트 조회의 `idOrName` 오류 뒤 사용자가 Chrome에 로그인했다. 대시보드에서 `knhbae/flowme2605` 연결 프로젝트는 `flowme2605` 하나, Root Directory는 빈 값(저장소 루트), deploy hook 없음, Ignored Build Step은 Automatic임을 읽었다. 연결 프로젝트 관리 목록에도 하나만 있었다. 설정 Save/Apply·Disconnect·Deploy는 누르지 않았다.

`vercel.json`에는 정확한 현재 브랜치의 `git.deploymentEnabled=false`를 추가했다. 기존 네 branch/glob 규칙은 보존한다. [공식 Git 설정](https://vercel.com/docs/project-configuration/git-configuration)에 따른 branch 단위 예방이며, push 후 실제 원격·배포 목록을 확인한다. GitHub CI에는 배포 명령이 없다. 9/3의 기존 HEAD Preview는 이번 배포가 아니며, 목표 시작 이후 새 배포와 직접 배포 명령은 아직0이다.

## 수정과 공개 범위

- Next15.5.21→15.5.25, sharp0.35.3→0.35.4와 호환 범위의 audit fix를 적용했다. `--force`와 major framework 전환은 쓰지 않았다. 재검사 취약점0.
- [출처 처리](../../content-audit/2026-09-20-flow-source-freshness-preservation/README.md): 8개는 실제9/7 감사 근거 재사용. kids는 원문 행이 현재7항목/기간 배치를 뒷받침하지 못해 실제 preview hold. 임의 최신일 갱신 없음, 기존 dog hold 보존.
- recovery 테스트4개의 sibling import를 기존 byte-identical vendor25개+누락2개로 교체했다. [원본 source fixture6개](../../../tests/fixtures/poc-source-baselines/README.md)는 lossless 압축·SHA 검증으로 포함했다. 앱에서 legacy writer를 새 호출하지 않는다.
- Git의 줄바꿈 변환이 provenance를 깨지 않도록 `.gitattributes`에서 native vendor·versioned template snapshot·해시 고정 실행 HTML의 원본 bytes를 보존한다. 일반 PoC 소스는 LF로 고정해 Windows checkout에서도 source 구문 검사가 재현되게 했다. Publisher의 문장 검사는 같은 guard·호출 순서를 유지하고 CRLF/LF만 허용한다.
- 사용자가 코드·요약 공개/원본 증거 로컬 보존을 승인했다. [공개 범위 도구](../../../scripts/personal-workspace-poc/checkpoint-scope.mjs)는 명시 경로만 선정하고 output·프로필·사진·zip을 stage하지 않는다. 1018개 약21.9MB이며 7/27 의미 diff0 자료는 제외한다. 테스트에 필요한 실행 HTML2개는 화면 증거가 아니라 원본 해시가 고정된 공개 코드로 포함했다.
- [원문/참조 원장](git-local-evidence-manifest.json): 문서189개/링크2760개를 local-only 표시로 변환했다. 최초 원문 byte 백업, 원래href, source/published SHA, 치환 offset을 보존했다. 역구성 검사는 링크 표현 외 판정·숫자·본문이 동일함을 확인했다. 약1.16GiB의 원본 캡처·상태 기록은 로컬에 남는다.
- [현행 브라우저3시나리오](../../../tests/e2e/integrated-product-poc-portable.spec.ts)와 전용 명령을 추가했다. CI에 통합1749/strict/브라우저 검사를 더했으며 기존 전체 E2E job을 제거·skip하지 않았다.

## 수정 후 검사와 남은 회귀

| 검사 | 실제 결과 / 범위 |
| --- | --- |
| npm test | 2253/2253 PASS, skip0. 출처 새 회귀2개 포함. 과거2031 실패 실행은 뒤의 승인201/public19 묶음 전에 중단됐으므로 같은 분모가 아님 |
| 통합 model/component | 181파일1749/1749 PASS, skip0, 실행 중 source변경0. 첫 재검사1748/1749의 catalog 기대 날짜1개는 실제9/7 감사일을 반영해 고친 뒤 전체 재실행 |
| strict | 392진입점/424source 진단0. 신규 recovery source2개가 포함됨 |
| build | Next15.5.25 production build PASS, 정적18페이지. 로컬 build이며 배포 아님 |
| security | 취약점0. 폐기 예정 의존성의 npm 경고와 audit 취약점을 구분 |
| portable browser | 3고유 시나리오 첫3/3와 반복6/6 PASS. gate·개인 날짜/완료/Undo/reload·공개 사본의 private/public 분리. 후속 baseURL origin 주입 보완판3/3 재통과(28.0초). 고유 시나리오3, 최종 작성 과정의 성공 실행 총12회이며12개 독립 시나리오가 아님 |
| 운영 경로 browser | 빈 사용자 root 진입과 public Text/Todo/Calendar readonly24행 대표2개 PASS(11.5초). 전체 운영 회귀를 뜻하지 않음 |
| 기존 v4.1 E2E | S1–4/S7–8 대표1개 실제FAIL: 현행 Program에 옛 `personal-workspace-poc-shell`이 없다. 과거 UI/저장 owner 전제와 현재 앱이 다르다. 해당 파일이나 assertion을 삭제·skip하지 않음 |
| clean archive | 최종 npm2253/2253·통합1749/1749·strict392진입점/424source 진단0·build18페이지·audit 취약점0·브라우저3/3(20.6초) PASS. npm ci와 docs6238링크도 PASS. Windows의 별도 staged archive 검사이며 Linux CI 결과가 아님 |

clean archive의 최초npm778중777PASS/1FAIL은 template fixture8개 줄바꿈, 다음943중933PASS/10FAIL은 pinned 실행HTML 미포함, 다음1397중1393PASS/4FAIL은 소스 문자열의 LF 전제였다. 원본 해시·실행파일·PoC LF 고정 후 위 전체 검사로 재검증했다. integrated 최초1748/1749의 LF문장 실패와 archive 교체 중 build의 sourceChanged 무효 기록도 지우지 않았다. 최종 npm·통합·build·audit의 sourceChanged0, 공통424source hash 일치와 브라우저 종료 후 hash 차이0을 확인했다.

최종 재현 원본은 로컬 전용 근거다: `D:/flowme2605/.checkpoint-rehearsal-20260920/output/integrated-product-poc/`의 `npm-test-2026-09-20T12-52-23-549Z`, `new-tests-2026-09-20T12-53-40-546Z`, `targeted-types-2026-09-20T12-58-04-344Z`, `build-2026-09-20T12-58-08-591Z`, `audit-2026-09-20T12-58-57-001Z`. 브라우저 결과는 같은 checkout의 `output/playwright/portable-program/`에 남긴다.

전체 E2E 통과나 merge-ready 판정은 아니다. 옛 화면의 기대를 현재 Program의 같은 요구에 다시 대응시키고, 역사 재현과 현행 회귀를 명시 분리해야 한다. 단순 selector 변경이나 테스트 제외만으로 요구 충족을 선언하지 않는다. 이 작업은 다음 회귀 정합화의 선행 사실로 남기며 M1 기능 구현을 시작하지 않는다.

브라우저는 새로운 임시 context의 합성 sentinel을 사용했다. 성공/실패/reload 후 운영 sentinel bytes 동일, 허용 PoC prefix 밖 set/remove·clear0, console/page error0을 해당 새 시나리오에서 확인했다. 사용자의 실제 데이터나 기존 누적 프로필을 열지 않았다. 실제 Android/iOS 검사 미실행, 관찰 사용자0.

## 남은 실행

1. [x] 사용자 결정 반영과 공개 가능한 파일 allowlist·의존성·민감정보 점검.
2. [x] 승인된 기존 검증 실패/취약점 및 외부 worktree 의존 테스트 수정.
3. [x] 새 checkout 기준 docs·통합 tests/strict·npm/build/security·현행 대표 E2E 재현. 기존 전체 E2E 실패는 별도 잔여 항목.
4. [ ] staged diff/비밀·개인자료·파일크기 점검 후 commit.
5. [ ] 자동배포 차단 확인 후 branch push·Draft PR·원격 결과 확인. main 병합/배포는 하지 않음.

발행 전 상태: stage1018·이번 목표 commit0·push0·PR0·merge0·Preview0·Production0. 제한된 secret 패턴 탐지0, staged output/이미지/zip0. 이는 모든 비밀·개인정보 부재의 자동 보증은 아니다. CRLF 원본 vendor, 과거 Markdown 줄바꿈/EOF와 이전 source의 공백 경고는 보존했고 일괄 정리하지 않았다. 실제 기기 검사 미실행, 관찰 사용자0.
