# 검증·반영 원장

완료. 2026-10-01 05:23 KST에 개발계 앱을 교체했고 외부 HTTPS10/10·배포 bundle의 합성 브라우저10/10·로컬/배포 정적 파일 hash 일치를 확인했다. 임시 QA 서버만 종료했으며 공개 앱과 기존 Tunnel은 유지한다. 이 목표의 완료는 전체 제품/UX 또는 실사용 검증 완료를 뜻하지 않는다.

## 반영한 기능

905c4c31의 핵심 작성·일정 UX와 같은 요청 저장 복구를 개발계에 반영했다. 활성 조합 줄 표시, 선택 줄의 폴더 연결 중복 방지, 날짜·시간 편집, 필터 범위·폴더/문서 맥락, 접을 수 있는 계정 관리, 확정 거절 후 다시 저장, 같은 요청의 성공 receipt 뒤 편집기 저장 상태 정리를 포함한다. 각 기존 요구와 구현의 범위는 [14개 요구 대조](../2026-09-30-alpha-core-workspace-ux/requirements.md)와 [저장 복구 계약](../2026-09-30-alpha-private-save-ack/spec.md)에 따른다. 이전 요구의 남은 판정을 삭제하거나 모두 충족으로 승격하지 않는다.

이번 추가 코드는 Cloudflare exact-origin 호환, 허용 설정만 전달하는 실행기, 기존 legacy 백업의 중복 요청·취소/창 닫기·누적 timeout·전송 한도·늦은 다운로드 보호다. 신규5D는 별도 경로의off 응답만 제공하며 worker·Storage·migration을 가져오지 않았다.

## 이전 근거

905c4c31의 CI는 이전 목표에서 통과했다. 전체 브라우저 760개 중 기존 2개가 재시도 후 통과했으며 무재시도 전부 통과라고 표현하지 않는다. 이번 호스트/백업 호환 코드의 검증 근거로 자동 승계하지 않는다.

## 이번 검사

| 검사 | 실제 실행과 판정 |
| --- | --- |
| clean install·런타임 | Node 24.17.0, pinned Next 15.5.25·Supabase JS 2.116.0. `npm ci` exit0 |
| `npm test` | 15개 실행 그룹·2,258회 PASS, fail/skip/cancel0. 중복 실행을 포함한 횟수다 |
| 전체 통합 | 260개 파일·2,615/2,615 PASS, fail/skip/cancel/sourceChanged0. 동시 worker2·각512MiB. 원시 출력 보관0·공개 요약만 남김 |
| catalog 공급 | 기존 설정의 명시 파일을 읽기 전용으로 참조. 복사0·원문 출력0·계정 credentials 전달0. 전후 SHA256 `723abefdc26243eb1f9b4bcf21730758ecc7a300494ad2ae75293ac5c6dde4be` 동일 |
| 호스트 표적 | 관련7파일53/53 PASS. 운영 환경/다른 호스트/port/query/wildcard/checkpoint/잘못된 proxy/추가 필드 거절 |
| 실행기·QA 네트워크 단위 | 최초6/6, 최종 telemetry 부정 회귀 포함8/8 재실행 PASS. 실 API·Supabase를 proxy하는 경로 없음, ambient Node/proxy/secret/백업 opt-in 전달 없음 |
| 백업 표적 | 신규/관련101개 PASS(Panel·transport38, backup·download·budget58, 서버budget4·checkpoint wrapper1). 전체 통합과 겹치므로 고유 테스트 수로 더하지 않는다 |
| 보안 | 취약점0·소비자 호환4/4 PASS |
| docs | 초기4/4 PASS·필수16문서·로컬 링크6,700개, skill sync PASS. 중간 원장4/4·링크6,702개, 최종 마감4/4·링크6,704개 재검사 PASS |
| 첫 build | compile91s 뒤 응답 한도의 default parameter가 literal type으로 추론되어 타입 오류1. 실행 앱 영향0 |
| 최종 build | default parameter에 `number`만 명시(런타임 동작 변경0). compile9.0s·타입/정적18/18·trace·31route 출력 완료. build `F9QqWgnGf7n_PaVUEavrK` |
| 타입 보완 후 표적 | 영향받는 backup/request/download58/58 재실행 PASS. 위 전체 통합은 이 순수 타입 주석 추가 전 완료됐음을 구분한다 |
| 실행 사전검사 | 기존 설정·signing shape·catalog·후보 build PASS. 새 백업off. 포트 여유와 DB 쓰기 검증은 이 결과에 포함하지 않음 |
| 반영 전 외부 HTTPS | 10/10 PASS. health200빈body/no-store, alpha/callback200, 무인증 보호API401, 신규 backup-jobs503. 실제 계정/쿠키 없음 |

처음 legacy handler 표적에서 기존 catalog 관련2개가 candidate에 기본 pack이 없어 ENOENT로 실패했다. 승인된 기존 파일을 참조하는 전체 통합에서는 같은 테스트를 포함해 통과했다. 원본을 복사하거나 테스트를 제거하지 않았다.

로컬 전용 근거는 `output/integrated-product-poc/new-tests-latest.public.json`, `output/alpha-cloudflare-release/`, `output/playwright/cloudflare-release-local/`와 후보의 `candidate-npm-test.log`, `candidate-build-final.log`다. 위 원본 출력은 Git 게시 대상이 아니다.

## 브라우저 시뮬레이션

실제 production JS/CSS와 합성 Auth/account/CAS/receipt를 조합한다. 모든 Supabase 및 alpha API 쓰기를 가로채며 실제 DB로 전달하지 않는다. after-commit unavailable와20초 interval poll은 합성 timer 진행 검사다. 실제 벽시계20초 대기·기기 동기화 시험으로 표현하지 않는다.

최종 로컬 검사는10개·10회 PASS, retry/flaky/fail/skip0(41.47s)다. 390×844·375×812·844×390·1024×768·1440×900 각각 작성/ACK 복구2개를 통과했다. 문서·폴더 작성, 날짜2026-10-10·시간09:30, 같은 요청 ACK 확인 후 dirty/conflict 해제, reload 복원, 핵심 click의 전체 rect·center hit와 Escape 초점 복귀를 검사했다. 문서 작성별 합성 mutation4건, ACK 복구별1건이며 reload 후 추가 mutation0이다. 실제 API·Supabase 전달0, prefix 밖 쓰기0, 운영 sentinel byte 동일, console/page error0, 가로 넘침0이다. 각 경우 실제 production 정적 asset24개의 path/SHA256을 기록했다.

초기 중단 run은 완료2FAIL(폴더 선택칸 이름/저장 status 중복 지정)만 확정이며 정확한 전체 시도 수는 미확정이다. selector를 보완한390×844 선행2/2는 PASS했다. 이어 full10회는9PASS/1FAIL:844×390의 기본 scrollIntoView 정렬에서 버튼 rect가 경계 밖이었다. centered native scroll로 검증 대상을 중앙에 놓되 viewport/hit-test 기준은 완화하지 않았고 landscape 선행1/1과 최종10/10이 통과했다. 완결된 run은 합계23회(22PASS/1FAIL), 초기 확정2FAIL을 합하면 최소25회이며 전체 정확한 시도 수로 표현하지 않는다. 제품 코드/build 변경 없이 검사 helper만 보완했다. 별도 로컬 `run-ledger.md`에 실패 이력을 보존했다.

root가 모바일390×844·landscape844×390·desktop1440×900의 실제 PNG를 열어 제목·기간탭·작성/저장 동선의 표시를 확인했다. 전체 UX 완성 판정이나 실제 기기·관찰 사용자 검증으로 확대하지 않는다.

반영 후 원격 최종10개·10회도PASS, retry/flaky/fail/skip0(45.97s)다. 같은 다섯 viewport에서 작성/날짜·시간/reload와 같은 요청 ACK 복구를 각각 통과했다. 실 API·Supabase·telemetry 전달0, prefix 밖 쓰기0, 운영 sentinel byte 동일, page error0, 가로 넘침0이다. root가 원격390×844 저장 복구 PNG도 열어 저장됨·입력 보존·중복 복구 안내 없음 상태를 확인했다.

원격 첫10회는 Cloudflare가 HTML에 삽입한 통계 script가 unknown-network 차단에 걸려10FAIL, 두 번째10회는 exact script를 빈JS로 합성하자 integrity 검사에 걸려10FAIL이다. 모두 제품 시나리오 뒤 검증 fixture의 환경 차이에서 실패했으며 이후 전체 boundary는 실행되지 않았으므로 그때 완전 통과라고 주장하지 않는다. HTML integrity나 Cloudflare 설정을 바꾸지 않았다. 최종에는 관찰된exact URL GET만 합성하고 빈JS의exact SHA512/SRI 오류 문장만 예상 오류로 분리했다. 각 경우 예상 합성SRI 오류2건(초기/reload), 그 외 console error0이며 **전체 console error0으로 표현하지 않는다**. 통계 기능 자체는 미검증이다. 원격 총 실제 실행30회(20FAIL/10PASS), 모두retry0이고 실패 원장은 보존한다.

로컬/원격10쌍 모두 정적 파일24개 path/SHA256이 완전히 같다. manifest SHA256은 `a20ef2e7b6e06ec90810a328114c520b36e45e6738c8fc1a0152c5f37718329e`다. 로컬 전용 `output/playwright/cloudflare-release-remote-readonly/local-remote-asset-comparison.json`, 최종 `results.json`·PNG·각 `run-ledger.md`에 근거가 있다. 개별 브라우저 시나리오 결과는 다음과 같다.

| 화면 | 작성·폴더·날짜/시간·reload | 같은 요청 ACK·입력 보존·reload | 평가 범위 |
| --- | --- | --- | --- |
| 390×844 | 로컬/원격PASS | 로컬/원격PASS | 모바일 크기의 Chromium 합성 검사 |
| 375×812 | 로컬/원격PASS | 로컬/원격PASS | 모바일 크기의 Chromium 합성 검사 |
| 844×390 | 로컬/원격PASS | 로컬/원격PASS | 가로 화면·스크롤 후 핵심 버튼 접근 |
| 1024×768 | 로컬/원격PASS | 로컬/원격PASS | 중간 크기 화면 |
| 1440×900 | 로컬/원격PASS | 로컬/원격PASS | 데스크톱 크기 화면 |

## 반영·복귀

이전 mixed 폴더와 build·Tunnel을 보존했다. 교체 전 Next 설정/타입 설정/build ID와 기존 운영 설정2개, 총6개 file hash를 로컬 전용 `before-swap.json`에 캡처하고 종료 직전 재대조했다. PID·parent·생성 시각·3105 listener가 일치한 이전 child5656과 launcher6568만 종료했다. 2026-10-01 05:23:06 KST에 후보 launcher10020/child2184가127.0.0.1:3105를 열었다. build는 `F9QqWgnGf7n_PaVUEavrK`, 신규 backup-jobs는off다. Tunnel3864·설정·DB/Auth·기존 build는 변경하지 않았다.

반영 후 외부 HTTPS10/10 PASS: health200빈body/no-store, alpha/callback200, 무인증 보호API401, backup-jobs503. 계정 credentials·쿠키·실사용 쓰기0이다. 배포 bundle의 브라우저 시나리오와 로컬/외부 asset hash 대조도 통과했다. 후보 QA3106(launcher19660/child21916)만 PID·parent·생성 시각·실행 경로 대조 후 종료했다. 종료 후 외부HTTPS10/10을 다시 통과했고 공개3105 child2184/launcher10020·Tunnel3864는 유지된다. 기존6개 파일 hash도 전후6/6동일하다. [복귀 절차](./runbook.md)에 따라 기존 build를 다시 띄울 수 있으며 복귀를 실제 실행한 것은 아니다.

## 변경 파일·소유권

이번 후보는 clean905 기준의소유36개 경로다. 이전 mixed dirty·실제 계정 파일·설정/.env/catalog/원시 증거·의존성/lockfile·workflow/hook 변경은0이다. 코드가 사용 중인 원본 설정/catalog는 읽기 전용 참조이며 Git에 포함하지 않는다.

| 묶음 | 변경 파일 |
| --- | --- |
| 호스트·off 경로9 | `app/api/alpha/health/route.ts`, `app/api/alpha/backup-jobs/route.ts`, `route.test.ts`; `alpha-auth/config.ts`, `alpha-persistence/environment.ts`, `alpha-server/render-readiness.ts`, `alpha-server/cloudflare-hosting.test.ts`, `catalog-library-source.ts`, `catalog-hosting-boundary.test.ts` |
| 기존 백업9 | `AlphaPreservationPanel.tsx`, `.test.tsx`; `alpha-preservation/backup.ts`, `backup-request.ts`, `.test.ts`, `transport.ts`, `.test.ts`; `alpha-server/preservation-handler.ts`, `.test.ts` |
| 실행·검증 도구5 | `scripts/alpha/cloudflare-release.ts`, `cloudflare-release-contract.ts`, `.test.ts`, `cloudflare-release-probe.ts`, `cloudflare-release-verify.ts` |
| 브라우저4 | `tests/e2e/cloudflare-release.config.ts`, `.fixture.ts`, `.browser.ts`, `.boundary.test.ts` |
| 문서9 | `docs/STATUS.md`, `HISTORY.md`, `SERVICE_STRUCTURE.md`, `specs/README.md`; 이 spec의 `spec.md`, `plan.md`, `tasks.md`, `qa.md`, `runbook.md` |

축약한 domain 파일의 root는 `lib/flow/integrated-poc/`, component root는 `components/flow/integrated-poc/`다. 원본 증거는 기존 승인대로 로컬에만 남긴다.

## 게시·데이터 경계

새 코드와 검증 문서는 `agent/alpha-cloudflare-core-ux-20261001` 로컬 후보에 보존한다. 해당 소유36경로만 로컬 커밋 대상으로 확인했으며 최종 commit ID는 Git HEAD와 로컬 배포 manifest/마감 답변에서 확인한다. 이번 추가 push·새PR·merge·Render/Preview/Production 배포는0이다. 이전905·PR205는 그대로이며 remote main `efd8b642`, PR204 head `2b798d43`, PR205 head `905c4c31` 불변을 읽기 확인했다. 기존 운영 `flow:*` sentinel의 byte 동일은 합성 브라우저 근거이며 실제 사용자 DB 전체를 전후 검사했다는 뜻이 아니다. 실제 계정 요청/쓰기0·DB/Auth 설정 변경0·기존 설정/빌드6개 hash 동일로 이번 조작 경계를 확인했다.

## 남은 작업과 도구의 기여

- 모바일 세로 밀도와 들여쓰기/내어쓰기의 구조 키보드 계약은 별도 개선이다. 반대 키를 Undo라고 임의 결정하지 않는다.
- 같은 요청 복구로 확정된 첫 저장의 server Undo 제한은 남아 있다. 정상 다음 저장 Undo와 구분한다.
- Windows 자동 시작·재부팅/절전 복귀와 장시간 열린 탭 전체 안정성은 이번 목표에 포함하지 않았다. 노트북과 앱·Tunnel이 켜져 있어야 접속한다.
- 원래6~9 후속과5D 대용량/활성화는 기존 원장을 유지한 보류 작업이다. 이번 개발계 반영 때문에 필수로 끌어오지 않는다.

세션 시작/마감 절차는 mixed 원본과소유36경로를 분리하고 과거 CI와 현재검사를 구분하게 했다. 독립 리뷰는 호스트·비밀값·백업의 기존 검증 경계를 대조했다. Playwright는 실제 배포JS/CSS의10쌍 행동과hash를 확인했지만 Auth/DB는 합성이며 기기/사용자 근거가 아니다. 설정전달·fixture allowlist로 실제 계정/임의 외부 네트워크를 열지 않았고 Cloudflare 통계SRI는 예상 합성 오류로 원문을 남겼다.

## 미실행

실사용 계정 쓰기, 실제 DB 복원, 새 백업 경로 활성화, 실제 Android/iOS/보조기술, 관찰 사용자 시험은 미실행이다.
