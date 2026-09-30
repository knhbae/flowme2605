# 검증 원장

상태: **같은 요청 저장 결과 표시 구현·원본 합성 검증 완료, 승인된 후보 선행 보완 후 게시 진행 중**. 2026-09-30 실행 결과다. 직전 목표의 성공 결과를 현재 수정의 통과로 이월하지 않았다. 아래 후보 초기 실패·게시 보류는 후속 승인 전 이력이며 마지막 후속 절에서 현재 판정을 구분한다.

기준점: detached HEAD `2b798d4373bc7c3528302ef5656e02acafe2a891`, 시작 시 modified42/untracked63. 기존 5D·런타임·의존성·출처 검토 dirty와 직전 UX 소유 delta를 분리한다. 실제 기기·관찰 사용자·실사용 시험은 제외한다.

이전 실패: `output/playwright/alpha-core-workspace-ux/unknown-same-request.json`은 같은 request receipt로 revision 0→1·operation 1 저장은 성공했지만 mounted 문서의 충돌/미저장 표시가 남았던 합성 시나리오다.

## 구현과 확인 기준

검증된 receipt를 controller snapshot에 노출하고 [순수 확인 gate](../../../lib/flow/integrated-poc/alpha-private-save-ack.ts)를 추가했다. shell에서 요청 ID·kind·계정·예상/receipt/반환 판본·공개 상태 불변·전체 개인공간 변경을 대조한 뒤, mounted 편집기의 제출 스냅샷·입력 세대·현재 workspace/raw·조합 상태를 다시 확인한다. 일치할 때만 committed/dirty/error를 갱신한다. 문자열이 같다는 이유만으로 성공을 추정하지 않으며 textarea 값을 대입하거나 remount하지 않는다.

응답 유실 브라우저 시험에서 추가 결함이 재현됐다. 서버가 이미 저장한 판본을 pending 상태의 주기적 조회가 먼저 읽으면 자기 요청이 외부 변경으로 분류됐다. pending 동안 표시 중인 preimage를 유지하고, 요청 결과가 확정된 뒤 proof와 기존 충돌 분류를 적용하도록 보완했다. 다른 계정·만료 검사는 보류 guard보다 먼저 실행된다. UI recovery는 확인한 문서와 완전히 같고 다른 미저장 입력이 없을 때만 CAS로 정리한다.

### 이번 목표에서 변경한 파일

| 역할 | 파일 |
| --- | --- |
| 순수 저장 확인·45개 회귀 | [alpha-private-save-ack.ts](../../../lib/flow/integrated-poc/alpha-private-save-ack.ts), [test](../../../lib/flow/integrated-poc/alpha-private-save-ack.test.ts) |
| shell·pending 조회·7개 회귀 | [AlphaWorkspace.tsx](../../../components/flow/integrated-poc/AlphaWorkspace.tsx), [test](../../../components/flow/integrated-poc/AlphaWorkspace.test.tsx) |
| mounted 편집기 확인·4개 회귀 | [ProgramTextEditor.tsx](../../../components/flow/integrated-poc/ProgramTextEditor.tsx), [test](../../../components/flow/integrated-poc/ProgramTextEditor.test.tsx) |
| 확인 포트·receipt 연결 | [ProgramSpace.tsx](../../../components/flow/integrated-poc/ProgramSpace.tsx), [document-action.ts](../../../lib/flow/integrated-poc/document-action.ts), [controller.ts](../../../lib/flow/integrated-poc/alpha-sync/controller.ts) |
| 합성 응답 유실·lookup 지연 | [core-workspace-ux-fixture.ts](../../../scripts/alpha/core-workspace-ux-fixture.ts) |
| 계획·상태·근거 | 이 폴더 spec/plan/tasks/qa/ownership, [STATUS](../../STATUS.md), [spec index](../README.md) |

이전 core UX의 별도 소유 변경과 섞인 기존 5D 변경은 [ownership](./ownership.md)에서 분리한다. 위 파일 전체를 그대로 stage해도 된다는 목록은 아니다.

## 시나리오 판정

합성 Chromium은 localhost:3104의 실제 React 편집기·shell과 메모리 fake server를 사용했다. 아래 브라우저 조작은 실제 Supabase 계정/원격 저장이 아니다.

| 시나리오 | 결과 | 확인한 근거와 한계 |
| --- | --- | --- |
| S1. 저장 전 unavailable → 같은 요청 확인 | PASS | revision 0→1, operation 1, injected request와 receipt 일치. 편집기 저장됨·거짓 충돌 없음. `unknown-before-final.log` |
| S2. 서버 반영 뒤 응답 유실 + pending 조회 → 같은 요청 확인 | 수정 후 PASS | 첫 `lost-after-390.log`는 dirty 해제 대기 실패·거짓 외부 변경 안내가 재현된 기록이다. 보완 후 revision 1·operation 1, request `1a38de45-6ca9-479c-8e48-036e9333eadf` 일치, 같은 textarea·line IDs, 저장됨·충돌 없음. `lost-after-poll-observation390.log` 및 `lost-after-poll-final390.png` |
| S3. lookup 지연 중 더 새 입력 | 보호 PASS | 첫 제출만 서버에 저장되고 새 입력·dirty 유지. 기존 보수적 충돌/복구 안내가 남는다. 저장됨으로 잘못 확인하지 않는다. `newer-preserved390.log`·`newer-native-verified390.log` |
| S4. lookup 지연 중 조합 입력 | 보호 PASS | receipt 확인 뒤에도 같은 native textarea와 조합 중 raw를 유지하고 dirty를 남김. `composition-resolved1440.log/png`. DOM composition 이벤트를 주입한 합성 검사이며 OS 한글 IME·실제 기기 결과가 아님 |
| S5. receipt 이후 외부 판본 / 개인·공개 필드 불일치 | 모델 PASS | expected+1보다 새 판본, 다른 필드·line ID·public 변화, changed=false 등은 proof 거부. 이번 브라우저에서 실제 두 계정 동시 편집은 하지 않음 |
| S6. lookup 중 계정 전환 | 모델 PASS | 이전 계정 결과를 폐기. 실제 계정 로그인 시험은 하지 않음 |
| S7. 성공 상태 재진입·새로고침 복원 | PASS | 같은 합성 run의 새 탭에서 revision 1·operation 1과 원문/line IDs 복원, dirty=false·충돌 없음, 추가 mutation 0. `reload-five-viewports.log`·`saved-reload1440.png` |
| S8. 다음 정상 편집·저장·서버 되돌리기 | PASS | r1→r2→r3, operation 1→2→3. 다음 입력 저장 후 서버 Undo로 r1 원문 복원, 같은 textarea·line IDs 유지. `normal-next-save-undo.log` |

S3의 첫 `sameTextarea=false` 측정은 복구용 textarea가 앞에 삽입된 뒤 `querySelector('textarea')`를 비교한 측정 오류였다. 실제 편집기 ID로 재확인한 `newer-native-verified390.log`는 nativeConnected=true·sameTextarea=true다. S4의 첫 캡처는 lookup 완료 전이므로 최종 증거는 `composition-resolved1440`만 사용한다. 처음의 제품 실패와 측정 오류 기록을 삭제하거나 성공으로 바꾸지 않았다.

## 자동 검사 — 작업 폴더

| 검사 | 실제 실행 결과 |
| --- | --- |
| 최종 표적 8개 파일 | **187/187 PASS**, fail/skip/cancel 0. `ack-targeted-final2.log` |
| 이번 신규 top-level 검사 | helper 45개 + editor 4개 + shell 7개 = **56개**. 루프 내부 조합은 별도 테스트 수로 더하지 않음 |
| 최종 `npm test` | **exit 0, 17개 실행 그룹 총 2,632회 PASS**, fail/skip/cancel 0. `npm-test-final2.log`. 같은 파일의 중복 실행을 포함하며 표적/독립 검토 수와 합산하지 않음 |
| 격리 production build | **exit 0**, Next 15.5.25, compile 6.8초, 타입 검사·정적 18/18·build trace 완료. `production-build-final2.log`. 보호 중인 일반 `.next`가 아닌 `.next-core-workspace-ux-20260930` 사용 |
| 최종 독립 안전 검토 | 추가 안전 결함 발견 없음. 관련 4파일 **141/141 PASS**. 앞의 표적과 중복이며 합산하지 않음 |
| 문서 검사 | **exit 0**, skill sync·검사 4/4·필수 문서 16개·로컬 링크 6,741개. `docs-check-final2.log` |
| scoped closeout·diff | closeout reporter exit 0, 실제 후보 diff도 검토. reporter 자체는 테스트를 실행하지 않음. `closeout.log`; diff whitespace 오류 0, CRLF 안내는 별도 |

첫 표적 실패 2개는 UI recovery store를 `read()`하기 전에 보관하려던 테스트 준비 오류였고 테스트를 수정했다. 첫 후보 build에서 새 callback의 nullable account 타입 오류가 발견돼 proof가 가진 `next`를 const로 잡는 코드로 수정했다. 이 실패 기록도 그대로 보존한다. 전체 E2E·원격 CI·정규 앱 서버에 대한 브라우저 재검사는 이번 실행에서 하지 않았다.

## 브라우저 화면 평가

저장 완료한 대표 문서의 **5개 크기**에서 가로 넘침 0, fixture errors/page-error 수집 0, 금지 네트워크 0이었다. 편집기의 원문·추가·날짜순 정렬 버튼을 각각 스크롤해 중앙 hit-test로 검사했다. 모두 enabled·화면 가로 안·가림 없음, 높이 48px이었다.

| 크기 | scrollWidth | 가로 넘침 | 검사한 버튼 가림 |
| --- | --- | --- | --- |
| 390×844 | 390 | 0 | 0 |
| 375×812 | 375 | 0 | 0 |
| 844×390 | 844 | 0 | 0 |
| 1024×768 | 1024 | 0 | 0 |
| 1440×900 | 1440 | 0 | 0 |

이는 현재 저장 표시 경로의 기하/접근 검사다. 이전 15화면 검사와 합산하지 않으며 모든 화면의 시인성·사용성 평가나 사용자 검증으로 표현하지 않는다. 수정 후 390 저장 화면, 1440 저장·조합 보호 화면 PNG를 직접 확인했다. 모바일 세로 밀도, 구조 Tab/Shift+Tab 계약은 별도 후속이며 이번 목표에서 개선하지 않았다.

### 남은 저장 이력 제약

S2처럼 응답 유실 뒤 pending 조회가 저장 후 판본을 먼저 읽으면, **복구된 해당 저장의 서버 Undo는 제공되지 않는다**. 성공 화면에서 버튼 disabled를 관측했고 독립 읽기 검토로 HEAD에도 같은 조건이 있음을 확인했다. client가 confirmed r0를 조회한 r1로 대체하며, controller의 복구 이력 생성은 retained preimage의 판본이 pending.expectedRevision과 같을 때만 가능하다. 이번 shell guard는 표시 중인 입력만 유지하며 이 이력 계약을 바꾸지 않는다. S8의 후속 정상 저장 Undo 성공은 이 미충족 경로의 통과를 뜻하지 않는다.

재개 조건: 개인 저장 복구의 Undo 이력을 보완하는 후속 범위에서 pending preimage 보존·계정/외부 판본 차단·서버 operation proof 계약과 회귀를 함께 검토한다. 이를 숨기거나 검증 없이 Undo를 활성화하지 않는다. 현재 목표의 정확한 저장 표시 성공과 전체 U14/Undo UX 완료를 구분한다.

## 데이터·런타임 경계

브라우저 모든 최종 관측에서 remoteWrites=0·realAccounts=0·storageforbidden=[]·blocked=[]·operationalUnchanged=true다. fixture의 `flow:saved-plans`, `flow:completion:v1`, 다른 앱 sentinel bytes를 보존했고 저장 쓰기/삭제는 정확한 PoC prefix 안이었다. 실제 사용자 DB 전체 불변 검사를 새로 한 것은 아니다. 개인 `.tmp`·credentials·실제 원문·DB/Auth를 읽거나 조작하지 않았다.

최종 3105 listener는 PID5656, 20249 Tunnel은 PID3864로 유지됐다. 일반 BUILD_ID `OzumXeWoxE3M0moIOghh_`와 next.config.ts·next-env.d.ts·tsconfig.next.json·`.next/BUILD_ID` SHA256은 시작 기준과 같다. QA 전용 3104 PID2412를 사용했으며 일반 서버·터널을 재시작하거나 개발계 runtime을 교체하지 않았다. 따라서 alpha.wikiplans.com에는 이번 UX/ACK가 아직 반영되지 않았다.

## 별도 게시 후보 — 승인 전 실패 이력

후보: `D:/flowme2605/flow-alpha-core-ux-publish-20260930`, detached HEAD `2b798d43`. 이전 이벤트로 core UX 소유 hunk를 복원하고 이번 ACK만 합쳤다. 소유 범위·제외 파일·현재 CI 선택지는 [ownership](./ownership.md)을 따른다.

- `npm ci` exit 0, 표적 **183/183 PASS**, 정규 production build exit 0(compile 7.5초·정적 18/18), fixture build·문서 검사·diff 검사 PASS.
- 원본 표적 187개 중 HEAD에 없는 미게시 5D에 종속된 4개는 제외했다. 기존 백업 기능을 삭제하거나 그 검사를 통과한 것으로 계산하지 않는다.
- **security:audit FAIL: High 2건**. HEAD의 brace-expansion 5.0.9 전역 override를 유지한 후보에서 재현됐다. minimatch 소비자 API도 `TypeError: expand is not a function`으로 실패했다.
- **npm test FAIL**: 도달한 출처 그룹 637개 중 636 PASS·1 FAIL. opic-2w, opic-1m, new-car-7-step, moving-dday, wedding-timeline, wedding-vendor-board의 출처 검토가 due다. 이후 `&&` 그룹은 실행되지 않았다.
- 원본 폴더의 기존 의존성/출처 검토 수정은 미소유이므로 후보에 포함하지 않았다. 날짜나 검증 기준만 바꿔 통과시키지 않았다. 후보 browser·원격 CI 미실행, staged 0.

원본 폴더 npm test 성공을 이 후보의 전체 gate PASS로 대체하지 않는다. 현재 자동 배포 차단은 외부 설정에서 재확인하지 않았고 CI 실행 경로도 아직 선택하지 않았다. 앞의 실패를 해결하기 전 게시 가능으로 판정하지 않는다.

## 승인 전 게시 상태와 다음 행동

| 항목 | 이번 목표 상태 |
| --- | --- |
| commit | 0 — 게시 후보의 선행 gate 해결 범위 답변 대기 |
| push | 0 |
| PR | 생성·갱신·merge 0; 기존 #204는 읽기 조회만 |
| CI | 미실행 |
| 개발계 반영 / Preview / Render / Production | 모두 미실행 |
| 실제 Android Chrome / iOS Safari | 모두 미실행 |
| 실사용 시험 / 관찰 사용자 수 | 미실행 / 0명 |

사용자에게 선행 보안·출처 검증 실패 해결을 이번 목표에 포함할지 질문했다. 승인하면 기존 수정의 소유를 추정해 복사하지 않고 관련 변경을 검토·해결·재검증한다. 보류를 선택하면 구현/검증 결과와 이 게시 후보를 보존한다. 안전한 push 전에는 현재 자동 배포 차단과 새 branch/기존 PR/CI 경로를 확인하며 배포는 별도 승인 대상이다. 남은 모바일 밀도·구조 키보드 계약·6~9/5D 목표는 이번 통과로 완료 처리하지 않는다.

로컬 원본 증거는 원본 폴더의 `output/alpha-private-save-ack/`와 이전 `output/playwright/alpha-core-workspace-ux/`, 후보의 `output/alpha-private-save-ack/`에 있다. 로그·화면·빌드 산출물은 로컬 전용이며 공개 후보에 포함하지 않는다.

## 승인 후 후보 보완·재검증 — 2026-09-30

사용자는 선행 보안·출처 검증 해결을 포함하고, 기존 PR에 섞지 않는 새 브랜치·별도 Draft PR 경로로 진행하도록 승인했다. 후보에서 새로 구현한 [소비자별 호환 보안 수정](./security-prerequisite.md)과 [기존 원문 6건 대조](../../content-audit/2026-09-30-core-ux-publish-source-review.md)를 소유 범위에 추가했다. 기존 미소유 5D·런타임·개인 데이터는 포함하지 않는다.

| 후보 최종 검사 | 실제 결과 |
| --- | --- |
| npm test | exit 0, **15개 실행 그룹·2,258회 PASS**, fail/skip/cancel 0. 그룹별 177·455·68·78·38·24·40·7·27·29·23·432·640·201·19. 중복 실행 포함, 원본 2,632회나 표적 검사와 합산하지 않음. `candidate-npm-test-final.log` |
| 표적 8개 파일 | **183/183 PASS**, fail/skip/cancel 0. 미게시 5D 종속 4개를 제외한 후보 코드 집합. `candidate-targeted-final.log` |
| production build | exit 0, compile 12.0초·타입·정적 18/18·trace 완료. 후보의 일반 `.next`만 사용. 실제 개발계 build 교체 없음. `candidate-build-final.log` |
| security:audit | exit 0, 취약점 전 등급 **0**, 실제 glob/readdir-glob API·패턴 호환성 **4/4 PASS**. 감사 임계값 유지. `candidate-security-final.log` |
| 출처 관련 회귀 | 담당 4개 파일 **145/145 PASS**. 6개 Flow만 원문 대조일을 추가하고 업체 보드 URL 1곳만 교정. 생성일·Item/Step·순서·의료 보류·공개 정책 유지 |
| 독립 보안·출처 변경 검토 | 차단 결함·검증 우회 발견 없음. 호환성 4/4, seed/freshness 81/81 및 npm audit 0을 별도 확인. 중복 수는 합산하지 않음 |
| 후보 fixture 생성 | exit 0, 382개 소스·7,026,407 bytes. 이 행 자체는 브라우저 통과를 뜻하지 않음 |
| 최종 후보 문서 검사 | exit 0, skill sync·4/4·필수 16파일·로컬 링크 6,687개. `candidate-docs-final.log` |

### 후보 자체 브라우저·배포 경계 재확인

최종 후보 fixture를 별도 QA3104(PID18068)에서 실행했다. 기존 owned QA3104만 교체했으며 실제3105 PID5656·Tunnel20249 PID3864는 유지했다. 별도 CLI `candidate-ack` 세션의 **390×844**에서 응답 유실 뒤 own pending focus poll 및 3초 lookup을 거쳐 같은 요청 복구를 확인했다. request `a2a88e3c-1f42-4bd9-88cf-788fbd192919`, revision1·operation1, execute1+lookup1이며 중복 execute는 없다. dirty=false, committed/server/raw/native 일치, 같은 textarea·line IDs, 거짓 충돌 없음이다. 같은 run reload는 revision1·operation1·추가 mutation/API0이다.

로컬 근거는 `candidate-ack-observation390.log`, `candidate-ack-reload390.log`, `candidate-ack-390.png`, `candidate-ack-reload390.png`, `candidate-ack-reload390-top.png`다. PNG를 직접 열어 원문과 저장됨을 확인했다. remoteWrites/realAccounts/금지 쓰기/차단 요청/오류0, 운영 sentinel bytes 동일, 가로 넘침0이다. 복구된 최초 저장의 서버 Undo disabled는 위 제약대로 남는다. OS IME·실제 기기·관찰 사용자 검증이 아니다. 원본 폴더의 다섯 크기 결과를 후보의 새 실행으로 더하지 않는다.

2026-09-30 UTC(한국 시각 10/1)의 읽기 조회로 Git 게시 경계를 확인했다. Render My Workspace의 연결 서비스는 `flowme-alpha-trial` 한 개이며 기존 브랜치·`autoDeploy=no`·trigger Off·PR preview Off다. Vercel 상세 조회 오류 뒤 로그인된 UI를 읽었다. `flowme2605`의 연결 저장소는 `knhbae/flowme2605`, Root Directory는 빈 값, Deploy Hooks는 없다. 팀 프로젝트 목록의 나머지 다섯 카드는 Git 미연결(`Connect Git Repository`)이고 기존 보조 head 프로젝트도 Git 미연결을 직접 확인했다. 현재 root [vercel.json](../../../vercel.json)의 `git.deploymentEnabled=false`는 그대로다. [공식 문서](https://vercel.com/docs/project-configuration/git-configuration#turning-off-all-automatic-deployments)도 이 값이 모든 브랜치 Git 자동 배포를 끈다고 설명한다. Ignored Build Step의 Automatic을 배포 차단으로 계산하지 않았다. 설정·요금제·도메인·인증 변경0이며 이 절은 push 후 실제 배포 수 관측을 대신하지 않는다.

최종 문서 검사·commit/push·CI는 다음 후속 기록에서 실제 결과로 갱신한다. 새 브랜치는 `agent/alpha-core-ux-save-ack-20260930`, 별도 Draft PR의 base는 기존 #204 head `agent/alpha-m1-persistence-20260921`이다. 기존 PR을 확대하거나 main에 병합하지 않는다. 비공개 CI는 기존 reviewer gate를 유지하며 배포 승인을 대신하지 않는다.

## 첫 게시·CI 실패와 승인된 회귀 보완 — 2026-10-01

commit `3f2e31e065fb4c01810acdd27f40c0605858b4c8`의 44경로를 새 브랜치에 push하고 [Draft PR #205](https://github.com/knhbae/flowme2605/pull/205)를 만들었다. commit hook 문서4/4, push hook은 제품 테스트2,258회·문서4개 및 production build(compile4.3초·정적18/18)를 실제 실행해 통과했다. 제품/문서 합계2,262회는 다른 실행과 합산하지 않는다. main `efd8b642`·기존 #204 head `2b798d43`는 그대로다. push 후 Render 최신 배포는 기존9/26의 `2b798d43`이며 Vercel 새 배포 조회0이다. 호스팅·인증·DB 설정 변경0이다.

### 첫 CI는 실패 — 통과로 이월하지 않음

[첫 실행 36734445926](https://github.com/knhbae/flowme2605/actions/runs/36734445926)의 Docs/Unit/Build는 보안·게시 경계·전체 verify·auth 단위·타입 검사를 통과한 뒤 portable의 옛 `날짜 적용` 버튼에서 실패했다. 뒤 auth UI는 미실행, private contract는 skipped, Integrated contract gate는 이를 정확히 FAIL로 판정했다. 전체 E2E는 **760개 중751 passed·8 failed·1 flaky**였다. 실패는 portable1개·workspace6개·과거 월간1개다. flaky1개는 기존 P24 Calendar/held 회귀이며 확정 통과와 구분한다.

현재 UI의 `날짜·시간 적용` 및 `보관 위치`와 관리 메뉴를 실제로 여는 동선으로 테스트를 보완했다. 과거 월간 test는 실행 날짜에 따라 두 예시 항목 중 하나가 다음 달로 넘어가 28 기대/29 실제가 됐다. 해당 제품 소스는 기준 head와 동일하며 이 예시 하나만 9월15일에 고정했다. 화면 숫자를 기대값으로 복사하거나 28을29로 바꾸지 않았다.

### 후속 로컬 실행

| 검사 | 실제 결과 |
| --- | --- |
| portable 현재 제품 | **4/4 PASS**, 날짜2026-10-10·시간09:30 동시 저장, 완료/Undo/reload·private copy·운영 bytes 검사 유지. `portable-e2e-after-ux-label-fixed.log` |
| auth mocked HTTP | **30/30 PASS**, 로그인/만료/오류/PKCE/계정 전환/SDK cleanup·격리 및 5크기 키보드 화면. `auth-e2e-after-ux-race-fixed.log` |
| workspace 현재 제품 | **6/6 PASS**, 다섯 크기 폴더·기간·완료/다시열기·미정·Undo/reload와 menu/keyboard/drag/touch-hold·pointercancel/Escape/취소/no-op/quota. `workspace-merge-e2e-after-ux-label-fixed.log` |
| 과거 월간 예시 | **1/1 PASS**, 844×390·9월15일 anchor, 빈 날짜28→추가27→Undo28·저장 오류/복구·패널 내부 스크롤 검증 유지. `historical-month-e2e-followup.log`. historical build compile11.7초·정적10/10 통과. 현재 제품40개와 별도 집합 |
| 독립 diff 검토 | 기존 운영 key/허용 prefix·격리·실패/Undo 검증 유지, force/skip/retries/global timeout/제품·권한 변경0 |

로컬 보완 중 portable 시간 필드의 전체 label exact 매칭 실패2회와 auth의 일회성 메뉴 확인 race1회도 보존했다. 시간 label prefix를 type=time 검사와 함께 사용하고, 동일 actor 가시성 검사를 메뉴 확인과 함께 기존8초 안에서 다시 평가했다. workspace의 `문서 폴더` 구 label 실패를 확인한 첫 로컬 실행은 나머지 동일 대기를 중단했고, 실제 `보관 위치`로 보완 후6개 모두 통과했다. 실패 로그를 삭제하거나 완료된 실행으로 합산하지 않는다.

로컬 브라우저 합계는 현재40개+과거1개=**41/41 PASS**다. 다른 실행이나 원본 worktree의 검사 수와 합산하지 않는다. 실제 계정/원격 쓰기0이며 각 시나리오의 운영 byte·허용 storage 경계를 유지했다. 로컬 QA 종료 후3104/3694/3695 listener0, 보호3105 PID5656·Tunnel20249 PID3864와 실제 BUILD_ID/설정 hash는 시작 기준 그대로다.

이 문서는 후속 commit 전 검증 스냅샷이다. 최종 후속 commit·CI 판정은 PR #205 본문·checks를 최신 원장으로 사용한다. 기존 reviewer gate를 유지하고 사용자가 승인한 해당 commit의 비공개 검사만 실행한다. 배포·개발계 교체·merge·실제 기기·관찰 사용자 시험은 미실행이며 원시 로그·trace·PNG는 로컬 전용이다.

## 두 번째 CI와 고정 catalog 비교 보완 — 2026-10-01

[두 번째 실행36740962662](https://github.com/knhbae/flowme2605/actions/runs/36740962662)은 head `6fe4290cfe5f460d49ac0e716caf55b519fc619f`의 **FAIL**이다. Docs/Unit/Build는 verify2,258회·build·portable4/4·auth30/30을 포함해 SUCCESS, 전체 Playwright는 **760/760 PASS**였다. 비공개 통합 검사는 실제 **2,588회 중2,587 PASS·1 FAIL**, skip/cancel/sourceChanged0이며 Integrated contract gate가 이를 정확히 FAIL로 판정했다. 원래의 reviewer gate로 해당 head만 승인했고 workflow·환경 규칙·배포는 변경하지 않았다. 이전760개 통과는 다음 head의 CI 통과를 대신하지 않는다.

실패1개는 `catalog-library.test.ts`의 현재 source field 비교였다. 원본 frozen version은9월23일을 보존하지만 이번 승인된 여섯 source review는9월30일이다. 문서에 명시된 같은 local sealed source를 읽어 해당 테스트 **1개 실행·1 FAIL**을 재현했다. 본문을 바꿔 해결하거나 고정 원본/검증 서명을 새로 만들지 않았다. 원시 오류 객체는 로컬 전용이며 공개 실패 요약에 포함하지 않는다.

보완한 한 파일은 기존10개와 부정 회귀3개, **13/13 PASS**, fail/skip/cancel0이다. 여섯slug의 과거/현재 확인일·갱신일과 업체 URL·파생type을 양쪽 정확히 검사한 뒤 비교용 clone만 과거값으로 되돌려 전체 hash를 대조한다. 비승인slug 날짜, 승인slug 제목/원문/Item, 잘못된 날짜/URL/type을 거절하며 frozen에 새 날짜를 넣어도 validator가 거절한다. 기존 Map/variant/count/descriptor/tamper/현재seed독립성·seal 검사를 유지한다. 독립 diff 검토에서 차단 결함·포괄적 비교 제외는 발견되지 않았다.

표적 실행 전후 source는263,439bytes·SHA256 `6b3f02a35149c52e889f92ad7f42c2ba97298755788c272d5e01d35837ee3659`로 동일하다. 안전 집계는 로컬 `private-catalog-retention-after-summary.json`이며 원본·개인 계정 자료를 게시하지 않는다. 전체 통합 재검사와 다음 exact-head CI는 별도 결과로 기록한다.

같은 원본을 사용한 전체 통합 재검사는 `2026-09-30T16:36:22Z`→`16:44:52Z`에 실제 실행했다. **256파일·2,591/2,591 PASS**, exit/verifiedExit0, fail/skip/cancel0·sourceChanged0이다. 기존2,588회에 부정 회귀3개를 더한 집합이며 npm test·표적13개와 합산하지 않는다. 기존 concurrency2·heap512MiB를 사용했고 worker/assertion/검증 기준은 줄이지 않았다. 종료 후 원본의 크기·SHA도 위 값 그대로다. 로컬 producer 요약/로그는 `output/integrated-product-poc/new-tests-2026-09-30T16-36-22-123Z.json` 및 같은 이름 `.log`다. 다음 원격 CI 결과는 PR #205 본문·checks에 exact-head별로 기록한다.
