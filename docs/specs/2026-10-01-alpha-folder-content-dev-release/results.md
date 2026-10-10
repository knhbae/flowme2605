# 폴더 입력·Flow 진입 UX 개발계 반영 결과

## 현재 판정

2026-10-01. 소유 33개 파일을 제품 commit `6d534a97d92ec4204c8e625082528318ccacab4e`로 push하고 [Draft PR #207](https://github.com/knhbae/flowme2605/pull/207)을 만들었다. base는 `agent/flow-ux-journey-20261001`이며 main·기존 PR 병합은 없다. 제품 판본의 [CI run 36847986956](https://github.com/knhbae/flowme2605/actions/runs/36847986956) 필수 4개 jobs는 10:32:22Z에 모두 SUCCESS를 확인했다.

마지막 게시 build는 `667DI4JldqTDckfQ16wB5`다. 이번 CI core의 npm 2,258/2,258·문서 4/4, 비공개 계약의 공개 허용 요약 267파일·2,780/2,780, 전체 E2E 760시나리오·759개 첫회 통과+1개 재시도 통과(총 761회)를 확인했다. 10:35:11Z에 같은 build로 개발계 앱을 교체했고 로컬 health 200·외부 HTTPS 보호 10/10을 확인했다. 외부 새 50개 첫 검사는 49 PASS/1 FAIL로 보존하며, 보완 driver local50/remote50은 모두 재시도/실패/건너뜀 0으로 통과했다. 최종 집계는 local65(보완50+기존exact5+core10)/remote60(보완50+core10)이다. 실제 JS/CSS 24개 path/hash도 같은 제품 build와 일치했다.

이전 build `zEY9jP0Mcmqs90L0HCPvB`를 복귀 기준으로 보존한다. 첫 게시 33개와 신규 마감 3개로 총 36개 경로를 관리한다. 마감 게시 범위는 기존 문서 5개(STATUS·plan·qa·runbook·tasks), 기존 browser·fixture 2개, 신규 결과·HTML·PR 이력 3개로 총 10개다. 별도 게시본의 마감 head와 실행 제품 commit/build를 분리한다.

전체 근거는 [검증 원장](qa.md), 정확한 게시 경로는 [manifest](publication-files.json), 교체·복귀 절차는 [runbook](runbook.md)에 있다. 사용자용 요약은 [HTML 보고서](../../content-audit/2026-10-01-flowme-folder-content-dev-release-ko.html)다.

## 이번 보완과 유지

| 범위 | 최종 제품 변경 | 판정의 경계 |
| --- | --- | --- |
| 폴더 연결 제안 | 자식 없는 미연결 목록 메모에서 정확한 기존 폴더ID를 고르거나 기존 패널로 새 폴더를 명시 생성한다. | 입력만으로 자동 생성·연결하지 않는다. 하위 목록 전체 전환은 후속이다. |
| 원문 보존 보완 | 현재 줄은 기존 serializer의 canonical 공백 형식만 허용한다. 연결 결과의 모든 documents/flows 줄ID·text가 같지 않으면 적용 전에 거절한다. | 제안 경로만 보호한다. 직접 추가 메뉴의 기존 serializer 동작은 유지한다. |
| 용량 보완 | 폴더 100개·binding 5,000개에서 불가능한 제안을 숨긴다. | 기존 모델 제약을 반영했다. 용량 확대나 새 정책 확정이 아니다. |
| Flow 진입 | 공개 글 유무와 무관한 Flow 찾기, 선택 판본 읽기, TXT 출력 복귀, 개인 사본 저장을 연결한다. | 합성 공개 Flow 1개·판본 1개다. 실제 외부 도구 import·공개 콘텐츠 전수 품질 검사는 아니다. |
| 비공개 제작 | Flow 찾기에서 기존 비공개 제작으로 이동하고 명시 생성·편집·저장·내 활동 복귀를 연결한다. | J13 제작→개인 실행 인계의 새 end-to-end는 미검사다. 개인 기록의 자동 공개는 없다. |

제품 변경은 `folder-link-suggestions.ts`, `ProgramTextEditor.tsx`, `AlphaWorkspace.tsx`, `ProgramDiscovery.tsx` 네 파일이다. parser·writer·schema·CSS·DB migration·운영 설정 변경은 없다. 직전 후보의 기본 기능과 게시 전 원문·용량 보완을 구분하며 v4.1·개발1·개발2의 원래 254요구·424하위조건이나 전체 제품 완성률로 환산하지 않는다. 원래 요구 연결과 부분 판정은 [직전 결과](../2026-10-01-alpha-folder-content-entry-ux/results.md)를 유지한다. 마감의 신규 문서 3개 외에 기존 소유 browser·fixture 2개를 검사 보완한다. 이미 첫 33개 목록에 든 경로이므로 고유 관리 경로는 총 36개다. 실행 제품 source/build를 바꾼 것으로 표현하지 않는다.

## 현재 검증

| 검사 | 이번 결과 | 범위 |
| --- | --- | --- |
| 표적 회귀 | 72/72, 실패/건너뜀/취소 0 | helper 13 + 기존 slot 5 + 편집기 54. canonical 공백, 폴더 99/100, binding 4,999/5,000, 별도 documents/flows 원문 거절·동일 원문 성공·직접 메뉴 동작. |
| 최종 증거 helper | 12/12 | HEAD·source·build·정적 자산 기록. 기록값으로 생성 관계를 추정하지 않는다. |
| 기존 release boundary | 7/7 | 기존 외부 요청 허용 경계. helper 검사와 합산해 고유 요구 수를 만들지 않는다. |
| 타입·source | 564 entry, 진단 0, source 639개 변경 0, exit 0 | 수정 종료 후 재검사. 첫 검사는 source 변경 1개를 감지해 FAIL로 보존한다. |
| 보안·호환 | 취약점 0, 호환 4/4 | 이번 audit. 초기 tracked catalog 10,788파일·게시 직후 10,811파일 모두 findings 0이다. exact 첫 게시 33개 파일 bytes의 독립 검사와 구분한다. |
| 정확한 게시 파일 | secret/private payload 0 | 기존 합성 fixture·과거 공개 경로의 신호를 실제 계정/credential/비공개 원문 추가로 판정하지 않는다. |
| 최종 npm·전체 통합 | 이번 npm 2,258/2,258·문서 4/4·통합 267파일/2,780/2,780·게시 build PASS | CI core 총 2,262에서 문서 4건을 분리했다. 통합은 비공개 계약의 공개 허용 요약이며 실패/건너뜀/취소·source 변경 0이다. |
| CI 전체 E2E | 760시나리오·759개 첫회 통과+1개 재시도 통과·총 761회 | 기존 personal-workspace PoC S5-S6는 간헐성으로 남긴다. 최초 무실패가 아니다. |
| 로컬 앱 | 최종 65/65, 보완 driver 50/50 재시도/실패/건너뜀 0 | 보완 새 50 + 기존 exact-name 5 + 핵심 10. 크기당 13개. 실제 production 자산 + 합성 Auth/API. |
| 로컬 계측·자산 | boundary 65·overlay 50·화면 130·geometry 120·JS/CSS 24개 path/hash 일치 | source 639개·정적 자산 81개·build 변경 0. 실제 클릭은 스크롤 뒤 정확한 rectangle·중앙 hit를 확인했다. |
| 교체 전 외부 보호 | 10/10 | 이전 실행 앱의 무인증·무cookie 검사다. 새 판본 반영 후 결과가 아니다. |
| 교체 후 health·보호 | local 200·0bytes·no-store, 외부 probe 10/10 | 새 실행 build의 무인증·무cookie 보호. 새 backupJobs off를 유지한다. |
| 교체 후 외부 앱 | 최종 60/60 = 보완50+핵심10, 보완 driver 재시도/실패/건너뜀 0 | 크기당 12개. 첫 새 50개의 49 PASS/1 FAIL을 보존한다. 저장/입력 제한 단일 진단 1/1 후 같은 제품 build에서 driver 보완50이 통과했다. 최초 원인은 미확정이다. |
| 외부 계측·자산 | boundary60·overlay50·화면130·geometry120·실제 JS/CSS 24개 path/hash 일치 | 제품 build667과 동일하다. source639·static81·build·보호7 hash 최종 변경0. 반복50을 고유 요구 수에 추가하지 않는다. |
| 보고서 화면·문서 | render 5/5·문서 4/4 | 접힘/펼침 가로 넘침·console/page error·깨진 그림·외부 request·relative 링크 오류 0. 키보드 details 5/5. 대표 모바일/데스크톱 상단 2장 시각 확인. |

기존 helper 기본 정렬 방식의 source 동결 `release-v2`는 `7fdcdbd2cad30cd0f20de576fdb63606d4b67d2b09b97ac2b482b1d5a67cc5c4`다. 새 게시 증거 helper의 locale 정렬 source hash는 `78fa90ea5f1fad3cfee130c32682847e72f2d133eae968f3d2dfa1f9ecaf3ea9`다. 같은 639개 source를 다른 정렬/hash 방식으로 계산했으므로 두 값을 혼동하지 않는다. 정적 자산 81개 전체 hash는 `f996ff43be6d68e35545fa55b85cf3159b5351e1a2acf4af1146184a135b7a26`다. 실제 JS/CSS 24개 path/hash와 마지막 build·제품 commit을 대조했다. `prepublish`의 이전 후보 build 기록은 현재 실행 build가 아니다.

## 화면·시나리오

| 화면 | 최종 로컬 앱 | 교체 후 외부 앱 |
| --- | --- | --- |
| 390×844 | 13/13 · 빈 공개 목록 화면 시각 확인 | 12/12 · 빈 공개 목록 대표 화면 확인 |
| 375×812 | 13/13 · 원문 변경 거절 패널 시각 확인. 패널 안 세로 스크롤 필요 | 12/12 · 원문 거절 패널 확인. 패널 안 세로 스크롤 필요 |
| 844×390 | 13/13 · 비공개 제작 편집 시각 확인. 세로 스크롤 필요 | 12/12 · 비공개 제작 수정 확인. 세로 스크롤 필요 |
| 1024×768 | 13/13 · TXT 출력의 같은 판본 복귀 시각 확인 | 12/12 · TXT 출력의 같은 판본 복귀 확인 |
| 1440×900 | 13/13 · 동명 폴더 경로 선택 시각 확인 | 12/12 · 동명 경로 확인. 첫 C3 실패 후 driver 보완 재검증 통과 |

검사 동선은 기존 이름·동명 경로의 명시 연결, 없는 이름 붙여넣기·생성 위치·취소·이름 변경 거절·재시도, 실패 입력·직접 재저장·Undo/reload, 부분/IME/잠금/무효 상태의 제안 제한, 공백 원문 연결/reload, 공개 글 유무의 Flow 찾기·읽기·출력 복귀·개인 사본, 비공개 제작·내 활동 복귀다. 최종 동선은 로컬·외부에서 통과했다. 초기 실패와 반복을 보존하고 고유 요구 충족률로 합산하지 않는다.

로컬·외부 각각 화면 130장·geometry 120개를 계측했고 대표 5장씩 시각 확인했다. 각 130장을 전수 육안 검토했다고 주장하지 않는다. 모든 클릭은 스크롤 뒤 정확한 rectangle·중앙 hit를 확인했다. 다섯 화면은 데스크톱 Chrome의 크기 시뮬레이션이다. 실제 Android Chrome·iOS Safari·OS IME·AT는 NOT_RUN이며 이번 관찰 사용자는 0명이다.

## 게시·반영·자료 보호

- commit/push: 제품 `6d534a97`의 첫 게시 33개 파일 완료. 기존 hook·검사 우회 0.
- PR/CI: Draft PR #207·제품 commit `6d534a97`의 필수 4 jobs SUCCESS, 10:32:22Z 최종. exact 제품 commit의 private CI를 10:22Z 승인했다. 마감 문서 판본은 [PR #207의 최신 검사](https://github.com/knhbae/flowme2605/pull/207/checks)에서 확인한다. 자기참조 commit/hash를 추정하지 않으며 main·기존 PR 병합 없음.
- Cloudflare 개발계: 10:35:11Z(19:35:11 KST) 앱 교체. 제품 `6d534a97`·build `667DI4JldqTDckfQ16wB5`, 새 backupJobs off. 이전 `flow-ux-journey-20261001` build를 복귀 기준으로 보존하며 실제 복귀 실행은 하지 않았다.
- Preview: Render/Vercel 신규 Preview 배포 없음. 기존 자동 배포 차단 상태를 읽기 확인했고 설정 변경 0.
- Production: 반영 없음. 실제 계정·DB·Auth·migration·Tunnel/DNS·자동 시작·새 5D 백업 활성화는 제외한다.

교체 후와 최종 재대조에서 보호 대상 7개 hash·source 639개·정적 자산 81개·build 변경 0이다. 로컬·외부 합성 브라우저의 예상 밖 console/page error·가로 넘침·허용 prefix 밖 Storage 호출·실제 Auth/API 전달은 0이다. 외부에는 의도적 계측 차단/empty script SRI 등 예상 synthetic telemetry 오류 95건이 별도 예외로 있다. 전체 console 오류0이나 telemetry 검증으로 표현하지 않는다. 합성 공개 fixture bytes와 sentinel은 동일하다. 실제 계정·DB·Auth 자료를 바꾸는 경로는 실행하지 않아 해당 mutation은 0이며 합성 API·Auth·sentinel fixture 불변을 실제 운영 DB 전체의 byte 대조로 확대하지 않는다. 일반 입력 저장과 제안 닫기·취소·화면 이동의 추가 명령 0을 구분한다. 원본 자료·비공개 설정·credential·원시 JSON/로그/화면은 공개 파일에 포함하지 않는다.

새 피드백 delta 0이며 #20의 실제 사용자 환경과 원인은 미확정이다. #2의 필터 정정은 기존 판정을 유지한다. 전체 하위항목 폴더 전환, J13 개인 실행 인계, Flow/Map 전수 품질, 복합 일정·공개 운영 정책·장시간 탭·자동 시작·5D 대용량 백업은 후속이다.

교체 직전 이전 child 11220/parent 5728의 경로·생성시각·부모·3105 소유를 대조한 뒤 그 프로세스만 종료했다. 새 child 10732/launcher 26640은 각각 10:35:11.312541Z/10:35:10.832586Z에 생성됐고 loopback 127.0.0.1:3105를 사용한다. Tunnel 3864의 생성시각은 유지했다. 실행 제품 작업본에서는 교체 후 install/build/게시 hook을 더 실행하지 않는다. 마감 문서 head와 실제 실행 제품 commit/build를 구분한다.

CI 전체 E2E의 재시도는 기존 `personal-workspace-poc.spec.ts:636` S5-S6의 `toBeVisible` 검사에서 element를 찾지 못한 5,000ms timeout 1회다. 재시도 통과한 간헐성으로 기록하며 원인을 확정하지 않는다. 이번 표적 72/72·로컬 앱 65/65의 재시도 0과 구분한다.

외부 첫 검사 C3는 1440×900의 Creator 수정 뒤 합성 mock의 원문이 8초 poll 동안 그대로여서 실패했다. 최초 실패 직전 readonly 상태를 관측하지 않았으므로 검사 타이밍을 원인으로 소급 확정하지 않는다. 전체 첫 60개가 모두 통과했다고 쓰지 않는다. 소유 browser·fixture 2개에 첫 save 합성 receipt gate·aria-busy true/notEditable → 해제 → busy false/editable → 입력 즉시 raw assert를 보완했다. 단일 1440 진단 1/1 PASS 뒤 보완 driver local50/remote50은 모두 재시도/실패/건너뜀0으로 통과했다. 실행 제품 source/build 추가 변경0이며 최초 FAIL을 보존한다. QA3106의 정확한 PID를 정리했고 live3105는 그대로다.

보완 driver의 첫 cross-worktree CLI 호출은 별도 node_modules의 global suite identity 문제로 검사 0개 실행·tool FAIL이었다. 제품 결함으로 판정하지 않으며 원장에 보존한다.

## 이전 이력과 도구의 기여

직전 후보의 통합 267파일·2,772/2,772, npm 2,258/2,258, 앱 50/50, 독립 HTML 25/25는 이전 판본의 이력이다. 이번 최종 검사로 재사용하지 않는다. [독립 조작 HTML](../../content-audit/2026-10-01-flowme-folder-content-entry-prototype-ko.html)은 합성 모델이며 앱 parser/writer·계정 동기화 검증이 아니다. 이전 검사는 loopback HTTP에서 실시했고 native file protocol은 NOT_RUN이다.

`flow-report-artifact` 기준으로 기존 HTML 배치를 재사용하고 제품 게시·실행 앱·자동 검사·실기기·관찰 상태를 구분했다. `humanize-korean`은 핵심 문단의 연결어미 뒤 쉼표 4개만 제거하고 수치·판정·출처를 유지했다. 점검 산출물은 ignored output에만 두었다. 설치본에 변경률 검증 도구가 없어 정량 윤문 등급은 내리지 않았다. 최종 보고서를 다섯 크기에서 렌더하고 키보드 details와 링크를 확인했다. 보고서 작성은 실제 계정·서버 설정 변경을 포함하지 않는다.
