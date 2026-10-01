# 폴더 입력·Flow 진입 UX 개발계 반영 이력

2026-10-01. 제품 첫 게시와 개발계 실행 판정을 분리한다. 최종 원장은 [QA](../specs/2026-10-01-alpha-folder-content-dev-release/qa.md), 상세 결과는 [results](../specs/2026-10-01-alpha-folder-content-dev-release/results.md), 사용자용 요약은 [HTML](../content-audit/2026-10-01-flowme-folder-content-dev-release-ko.html)에 있다.

## 변경과 게시

기존/없는 폴더 이름의 명시 연결·생성 진입, Flow 찾기·판본 읽기·TXT 출력 복귀·개인 사본, 비공개 제작의 진입·복귀 후보를 게시했다. 게시 전 검토에서 원문 공백·별도 documents/flows 참조 표기 변경과 용량 한도의 불가능한 제안을 발견해 같은 소유 범위에서 보완했다.

제안의 현재 줄은 기존 serializer와 같은 canonical 공백 형식만 허용하며 연결 결과의 모든 documents/flows 줄ID·text가 같지 않으면 적용 전에 거절한다. 폴더 100개·binding 5,000개 제한을 그대로 반영한다. 직접 추가 메뉴의 기존 serializer 동작은 유지한다. 제품은 `folder-link-suggestions.ts`, `ProgramTextEditor.tsx`, `AlphaWorkspace.tsx`, `ProgramDiscovery.tsx` 네 파일이다.

첫 게시 exact 33개 경로는 [publication-files.json](../specs/2026-10-01-alpha-folder-content-dev-release/publication-files.json)에 있다. 제품 commit은 `6d534a97d92ec4204c8e625082528318ccacab4e`, branch는 `agent/flow-folder-content-ux-20261001`이다. [Draft PR #207](https://github.com/knhbae/flowme2605/pull/207)의 base는 `agent/flow-ux-journey-20261001`이며 main·기존 PR 병합은 없다. 기존 hook·검사 우회 0이다. 첫 게시 33개와 신규 마감 문서 3개로 총 36개 경로를 관리한다. 마감 게시 범위는 문서와 기존 소유 browser·fixture 2개 보완이며 실행 제품 4파일/runtime build는 그대로다.

## 검증 판정

| 검사 | 이번 결과 | 한계 |
| --- | --- | --- |
| 표적 회귀 | 72/72 = helper 13 + slot 5 + 편집기 54 | 다른 자동 검사와 중복. 고유 요구 수로 합산하지 않는다. |
| 게시 증거 helper·경계 | 최종 helper 12/12 · 기존 boundary 7/7 | source·HEAD·build를 기록하지만 생성 관계를 추정하지 않는다. |
| 타입 | 재검사 564 entry·진단 0·639 source 변경 0 | 첫 검사는 source 변경 1개로 FAIL. 최초 실패를 지우지 않는다. |
| 보안·공개 경계 | 취약점 0·호환 4/4·exact 33개 secret/private payload 0 | 초기 tracked catalog 10,788파일·게시 직후 10,811파일 모두 findings 0이다. exact 33개 bytes의 독립 검사와 구분한다. |
| 최종 npm·통합 | 이번 npm 2,258/2,258·문서 4/4·통합 267파일/2,780/2,780·게시 build PASS | CI core의 총 2,262에서 문서 4건을 분리했다. 통합은 비공개 계약의 공개 허용 요약, 실패/건너뜀/취소·source 변경 0이다. |
| CI 전체 E2E | 760시나리오·759개 첫회 통과+1개 재시도 통과·총 761회 | 기존 personal-workspace PoC S5-S6는 간헐성으로 남긴다. 최초 무실패가 아니다. |
| 마지막 build | `667DI4JldqTDckfQ16wB5` | 제품 `6d534a97`의 마지막 게시 build. 로컬65/외부60과 실제 자산24개를 이 실행 판본에 대조했다. |
| 로컬 앱 | 최종 65/65, 보완 driver 50/50 재시도/실패/건너뜀 0 | 보완 새50 + 기존 exact-name5 + 핵심10, 크기당13개. production 자산 + 합성 Auth/API. |
| 로컬 계측·자산 | boundary 65·overlay 50·화면 130·geometry 120·JS/CSS 24개 path/hash 일치 | source 639개·정적 자산 81개·build 변경 0. |
| CI | 제품 `6d534a97`의 [run 36847986956](https://github.com/knhbae/flowme2605/actions/runs/36847986956) 필수 4 jobs SUCCESS·10:32:22Z 최종 | exact 제품 commit의 private CI를 10:22Z 승인. 마감 문서 판본은 [PR #207의 최신 검사](https://github.com/knhbae/flowme2605/pull/207/checks)에서 별도 확인하며 자기참조 commit/hash를 추정하지 않는다. |
| 교체 후 외부 앱·자산 | 최종 60/60 = 보완50+핵심10, 보완 driver 재시도/실패/건너뜀 0 | 크기당12개. 첫 새50의49 PASS/1 FAIL을 보존한다. 단일 진단1/1 뒤 보완driver local50/remote50통과. 실제 JS/CSS24개 path/hash가 제품build667과 일치한다. |
| 외부 계측 | boundary60·overlay50·화면130·geometry120 | source639·static81·build·보호7 hash 최종 변경0. 반복검사를 고유 요구 수에 합산하지 않는다. |
| 교체 후 health·HTTPS 보호 | local 200·0bytes·no-store·외부 probe 10/10 | 새 실행 build의 무인증·무cookie 보호다. |
| 보고서 QA | render5/5·문서4/4 | 접힘/펼침 가로 넘침·console/page error·깨진 그림·외부 request·relative 링크 오류0, 키보드 details5/5. 대표 상단2장 시각 확인. |

기존 helper 기본 정렬의 `release-v2` source hash는 `7fdcdbd2cad30cd0f20de576fdb63606d4b67d2b09b97ac2b482b1d5a67cc5c4`, 새 게시 증거 helper의 locale 정렬 source hash는 `78fa90ea5f1fad3cfee130c32682847e72f2d133eae968f3d2dfa1f9ecaf3ea9`다. 같은 639개 source의 정렬/hash 알고리즘이 다르므로 값을 혼동하지 않는다. 정적 자산 81개 전체 hash는 `f996ff43be6d68e35545fa55b85cf3159b5351e1a2acf4af1146184a135b7a26`다. 실제 JS/CSS 24개 path/hash와 마지막 build·제품 commit을 대조했다. `prepublish`에 기록된 이전 후보 build는 반영 판본이 아니다.

## 실행·복귀·제외

개발계 앱을 10:35:11Z(19:35:11 KST)에 제품 `6d534a97`·build `667DI4JldqTDckfQ16wB5`로 교체했다. 이전 child 11220/parent 5728의 정확한 경로·시각·부모·3105 소유를 대조한 뒤 그 프로세스만 종료했다. 새 child 10732/launcher 26640은 각각 10:35:11.312541Z/10:35:10.832586Z에 생성돼 loopback 127.0.0.1:3105를 사용한다. Tunnel 3864의 생성시각과 backupJobs off를 유지했다. 교체 후 외부 최종 60/60·HTTPS 보호10/10·실제 자산24개 path/hash가 통과했다. QA3106의 정확한 PID를 정리했고 live3105는 그대로다.

이전 `flow-ux-journey-20261001` build `zEY9jP0Mcmqs90L0HCPvB`를 [runbook](../specs/2026-10-01-alpha-folder-content-dev-release/runbook.md)의 복귀 기준으로 보존하며 실제 복귀 실행은 하지 않았다. 실행 제품 작업본에서는 교체 후 install/build/게시 hook을 더 실행하지 않는다. 마감 문서 head와 실행 제품 commit/build를 구분한다.

Render/Vercel 신규 Preview와 Production 반영은 없다. 자동 배포 차단 상태는 읽기 확인했고 설정 변경 0이다. 실제 계정·DB·Auth·migration·Tunnel/DNS·자동 시작·신규 5D 백업 활성화는 제외한다. 교체 후와 최종 재대조에서 보호7 hash·source639·정적 자산81·build 변경0이다. 로컬·외부 합성 브라우저에서 예상 밖 console/page error·가로 넘침·허용 prefix 밖 Storage 호출·실제 Auth/API 전달0, 공개 fixture bytes·sentinel 동일을 확인했다. 외부에는 의도적 계측 차단/empty script SRI 등의 예상 synthetic telemetry 오류95건을 별도 예외로 보존한다. 총 console 오류0이나 telemetry 검증이라고 쓰지 않는다. 실제 자료를 바꾸는 경로는 실행하지 않아 해당 mutation0이다. 합성 sentinel/API/Auth 검사를 실제 운영 DB 전체의 byte 대조로 표현하지 않는다.

다섯 크기는 390×844·375×812·844×390·1024×768·1440×900의 데스크톱 Chrome 시뮬레이션이며 local13/13·remote12/12씩 통과했다. 로컬·외부 각각 화면130장·geometry120개를 계측했으나 시각 확인은 빈 공개 목록·원문 거절·비공개 제작 수정·TXT 출력 판본 복귀·동명 제안의 대표5장씩이다. 각130장 전수 육안 검토는 아니다. 375패널과844Creator는 세로스크롤이 필요하며 모든 클릭은 스크롤 뒤 정확한 rectangle·중앙 hit를 확인했다. Android Chrome·iOS Safari·OS IME·AT는 NOT_RUN, 이번 관찰 사용자는0명이다. 독립 조작 HTML은 합성 모델이며 native file protocol 검사는 NOT_RUN이다. 직전 앱50/50·HTML25/25는 이전 이력으로 분리한다.

새 피드백 delta 0, #20 실제 환경·원인 미확정, #2 필터 정정을 유지한다. 전체 하위항목 폴더 전환·J13 제작→개인 실행 인계·Flow/Map 전수 품질·복합 일정·공개 운영·장시간 탭·5D 대용량 백업은 후속이다. 원래 254요구·424하위조건의 해결률이나 전면 제품 완성률은 산정하지 않는다. 원본 자료·설정·실제 이메일·원시 검사 output은 공개하지 않는다.

CI 전체 E2E의 기존 `personal-workspace-poc.spec.ts:636` S5-S6는 `toBeVisible`에서 element를 찾지 못한 5,000ms timeout 1회 뒤 재시도 통과했다. 간헐성으로 보존하며 원인은 확정하지 않는다. 이번 표적 72/72와 로컬 앱 65/65의 재시도 0과 구분한다.

외부 첫 검사의 1440×900 C3는 Creator 편집 뒤 합성 mock 원문이8초 poll 동안 그대로여서 실패했다. 첫 실패 직전 readonly를 관측하지 않아 원인을 소급 확정하지 않는다. 소유 browser·fixture2개에 첫save 합성 receipt gate·aria-busy true/notEditable → 해제 → busy false/editable → 입력 즉시 raw assert를 보완했다. 단일1440 진단1/1 PASS 뒤 같은 제품 build의 보완 driver local50/remote50이 모두 재시도/실패/건너뜀0으로 통과했다. 최초FAIL은 보존하며 첫60개 모두통과로 표현하지 않는다. 실행제품 source/build 추가변경0이다.

첫 cross-worktree CLI는 별도 node_modules의 global suite identity 문제로 검사 실행 0개·tool FAIL이었다. 제품 결함으로 판정하지 않는다.

`flow-report-artifact`는 기존 보고서 배치를 재사용하며 게시·반영·자동 QA·관찰 상태를 분리하는 데 사용했다. `humanize-korean` 문구 점검은 핵심 문단의 연결어미 뒤 쉼표 4개만 제거했고 수치·판정·출처를 유지했다. 산출물은 ignored output에만 두었으며 설치본에 변경률 검증 도구가 없어 정량 윤문 등급은 내리지 않았다. 보고서를 다섯 크기에서 렌더하고 링크·키보드 details를 확인했다.
