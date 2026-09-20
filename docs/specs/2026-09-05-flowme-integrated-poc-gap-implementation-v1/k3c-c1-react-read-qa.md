# K3-C C1 — React 읽기 입구 연결, 2026-09-06

이 문서는 W3T4 읽기 연결 당시 기록이다. 이후 React 왕복도 구현했으며 최신 HiAh 검증과 남은 C1-b 범위는 [왕복 QA](./k3c-c1-react-return-qa.md)에 있다. 아래 당시 미구현·시험 수는 역사 근거로 보존한다.

**C1 진행 중.** 이번 확인 범위는 출처 행·원문/내 사본 미리보기·읽기 상세다. 개인공간 왕복의 탐색 상태 복원, standalone의 신규 검색, C2·C3·K4는 완료하지 않았다. 원본 요구는 [C1 설계](./k3c-c1-entry-preview-design.md)와 [현재 작업 기록](./k3c-c1-implementation.md)에 연결한다.

## 요구와 전후 판정

| 원본·기능 | 수정 전 실제 근거 | 현재 결과 | 아직 남은 범위 |
| --- | --- | --- | --- |
| 개발1 D1-017.1/.2, K-D1-04 | R01 실제 출처명·원문 링크 누락 RED | 선택 버튼 밖 독립 HTTP(S) 링크와 보유 출처명. R01 PASS | 누락 출처의 장문/다중 링크 화면 전수 검사 |
| 개발1 D1-017.3~.7 / 개발2 source·개인 분리 | R02 원문 설명·완료 기준 대신 개인 메모만 표시 RED | 원문 설명/기준과 개인 메모를 별도 필드로 표시. 원문 보기에는 개인 메모 없음 | legacy의 전체 원문은 보유하지 않아 복원하지 않음 |
| 개발1 D1-021, K-D1-10 | R03 세 직접 목록이며 기존 네 결과 presenter 미연결 RED | TXT·할 일·캘린더·표의 공통 Result와 전체 refs 재사용. 읽기 화면에서 회차 쓰기 제어 없음 | 전체 origin/occurrence의 화면 조합 전수 검사는 아님 |
| 개발2 설명·메모 소유 | 새 ER21: 공통 Result가 source-only 설명을 memo로 전달 RED | 검증된 source 필드를 기존 sourceAttributes에 전달. imported 개인 메모는 기존 owner에서 읽음 | 저장 schema·원본 문법·writer 변경 없음 |
| v4.1 실행·폴더 상태 보호 | 새 검색/상세가 실행 값을 변경하면 안 됨 | 신규 10개 context에서 모든 제품 저장 호출0·준비 key/value exact | 개인공간 방문 후 Back 복원은 아직 미구현 |
| 원문 변화·손상 gate | 첫 R08은 과거 화면을 폐기했지만 기존 `/my`로 이동, 재확인 안내 없음 | 관측 변화는 읽기 packet을 폐기하고 재확인 안내. 실제 손상 payload의 최초 진입은 기본 `/my` fail-closed | 외부 원문 적용 후 다시 읽기·target ABA·실제 read error 전 조합 |

source 날짜 offset은 원문 기준 상대 일정으로 표시한다. 개인 기준일을 끌어와 원문 절대일이나 시각을 만들지 않는다. 101개 항목과 같은 이름/다른 사본·Map child·네 origin은 순수 검사에서 확인했고, 실제 Map 선택·Text 초기화는 Stage 2 회귀에서도 확인했다. source 후보 generator·writer는 호출하지 않는다.

## 실제 실행과 실패 이력

- 첫 packet 검사 **19/19**. 추가 source offset·foreign completion과 공통 Result owner 검사까지 현재 packet **21/21**.
- readonly SSR 첫 **2개 중1 PASS/1 FAIL** → optional prop 적용 뒤2/2. 기본 prop 생략/false 출력 동일, 실행 화면의 회차 제어 유지.
- 공통 owner 수정 후 선정 검사 첫 **95개 중93 PASS/2 FAIL**. 하나는 boot의 storage facade 호출 문자열 변경, 다른 하나는 imported memo라고 정의한 fixture가 모든 description owner를 `none`으로 선언한 모순이었다. 정확 before 사본을 보존하고 facade의 실제 호출 순서·고정 key 검사를 유지했으며, memo fixture의 imported owner를 명시했다. 기존 기대 assertion 삭제0.
- 현재 모델·SSR 선정 검사 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/entry-current-models-2026-09-05T22-55-49-273Z.json`) **95/95**. 신규21·readonly2와 기존72개를 포함하며 이전 실행과 합산하지 않는다.
- 기존 브라우저 baseline3 실제 RED → 첫 연결 **3/3**. 다섯 화면 추가 첫 **9개 중8 PASS/1 FAIL**(관측 source 변화의 재확인 안내). 수정 뒤 현재 브라우저 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-entry-current-20260906-02.json`) **23/23 = 신규10 + 기존 Stage 2 13**. 재시도0.
- 현재 production build (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/entry-react-observed-invalidation-build-2026-09-05T22-53-31-930Z.json`) **PASS**, `W3T4VkF2nIPwJsrZa0lwm`, 정적 생성18. 타입 검사 포함, 배포 아님. 첫 C1 타입 검사는 새 packet의 TypeScript narrowing과 boot raw 속성 때문에 실패했고 제품을 수정했다. 전체 tsconfig PASS로 표현하지 않는다.
- npm test (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-entry-npm-test-2026-09-05T22-49-11-333Z.json`) **2,030 실행 / 2,029 PASS / 1 FAIL**. 기존 source review 기한: 2026-06-07의 콘텐츠4개. 운영 seed/검토일/시험 기대를 변경하지 않았다. source invalidation 안내를 보완하기 전 실행이며 최종 보완은 위95/23/build로 검증했다. npm의 뒤쪽 명령은 중단됐으므로 전체 suite PASS가 아니다.

## 브라우저 크기별 평가

최종 C1 코드에서 npm test 재실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-current-npm-test-2026-09-05T23-01-09-316Z.json`)도 **2,030/2,029 PASS/1 FAIL**로 같은 기한 오류다. 중단 뒤 approved201/201 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-current-npm-remainder-approved-2026-09-05T23-01-36-963Z.json`), public19/19 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-current-npm-remainder-public-2026-09-05T23-01-39-710Z.json`)를 별도로 실행해 통과했다. 이전 실패 이력과 합산하지 않는다.

격리 desktop Chromium이다. 390×844·375×812·844×390·1024×768·1440×900에서 각각 입구, 개인 상세, 원문 상세를 캡처했다. 캡처 폴더 (로컬 전용 근거: `../../../output/playwright/k3c-c1-entry-current-20260906-02/`).

| 크기 | 직접 확인한 화면 | 판정·한계 |
| --- | --- | --- |
| 390×844 | 원문 상세 | 설명·기준·원문 offset과 개인공간 CTA가 읽힌다. 하단 전역 탐색은 그대로이며 별도 C3 대상 |
| 375×812 | 검색 입구 | 실제 출처와 독립 링크 표시. 입력·결과·새 작성 버튼 접근. 상단 제목 줄바꿈과 기존 큰 입력 공간 유지 |
| 844×390 | 개인 상세 | 자체 스크롤에서 상세 닫기 접근. 헤더 아래 작은 본문이므로 모든 설명이 첫 화면에 동시에 보인다고 하지 않음 |
| 1024×768 | 개인 상세 | 두 영역 유지, 개인 결과는 오른쪽에서 스크롤. 상세의 모든 필드 동시 노출 판정 아님 |
| 1440×900 | 원문 상세 | 두 영역에서 source 설명/기준/offset 분리와 CTA 확인 |

다섯 크기에서 원문 링크·상세 닫기·원문 완료 기준의 전체 rect와9점 hit test, document/preview/dd의 가로 넘침, 키보드 탭 화살표·Escape 후 실제 opener 초점 복귀를 검사했다. console/pageerror0. 긴 임의 URL/장문 기준과 모든 행동의 전수 hit test는 아직 아니며 **C1 전체 UI 완성 판정은 아니다**. 캡처15개 중 root가 위 표의5개를 직접 읽었다. 자동 캡처15개를 직접 관찰15개로 바꾸지 않는다.

## 데이터·파일 경계

신규10개 context의 JSON 첨부를 root가 실제 읽었다. 각 context에서 `calls:0`, cross-document 수집 `allDocumentCalls:0`, `errors:0`, 전체 준비 key/value `exact:true`. 손상 source의 기본 `/my` 이동 전후도 기록한다. 외부 ABA는 두 storage 알림 fixture이며 저장값을 쓰지 않았다. 실제 사용자 프로필 검사가 아니다. Stage 2의13개에는 명시 작성/저장이 있으므로 그 전체를0쓰기라고 하지 않는다.

보호 원장551개는 재캡처하지 않았다. 22:53:42Z 확인의 허용 변경31개/예상 밖0. 원본 dirty·미추적 파일 정리·stage·삭제 없음. 사용자용 두 HTML은 이전 B3 **7D1610 / 1,454,070bytes**로 남아 있다. React C1을 단일 HTML에도 적용했다고 표시하지 않는다.

현재 제품 파일(짧은 SHA):

| 파일 | 현재 SHA 앞부분 / 역할 |
| --- | --- |
| [entry-read.ts](../../../lib/flow/personal-workspace-poc-entry-read.ts) | 2557E740 / 새 versioned 순수 읽기 packet, genuine source index·state refs·원문 필드 |
| [EntryPreview.tsx](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocEntryPreview.tsx) | 0D871CBD / 새 source/개인 읽기 UI·상세·초점 |
| [AuthoringRoute.tsx](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringRoute.tsx) | 9DB76284 / exact source read·boot 검증 |
| [AuthoringSurface.tsx](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx) | BB1868F4 / 출처 카드·공통 preview·관측 stale 폐기 |
| [ResultPresenter.tsx](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocResultPresenter.tsx) | 761892F9 / optional readonly, 기본 출력 유지 |
| [result-projection.ts](../../../lib/flow/personal-workspace-poc-result-projection.ts) | C57B08E4 / source 설명과 개인 메모 owner 구분 |

관련 새 시험은 `entry-read.test.ts`, `PersonalWorkspacePocResultReadOnly.test.tsx`, `personal-workspace-k3c-entry-characterization.spec.ts`다. 기존 Result fixture·Authoring facade·Stage2 selector 기대는 위 이력대로 최소 수정했다. 정확 before 파일은 `output/poc-gap-implementation/k3c/before-entry-readonly-20260906-01/` 및 `before-entry-tests-20260906-01/`에 보존했다. baseline allowlist에는 scoped Presenter/AuthoringRoute만 추가했으며 원장 재생성0.

## 남은 구현과 공개 상태

다음 연결 C1-R07 수정 전 실제 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-return-baseline-20260906-01.json`)은 **1실행/1FAIL**이다. 실제 개인공간 이동 후 `page.goBack()`으로 돌아오면 입력 `돌아오기`가 빈 문자열이 된다. source/개인 미리보기23개 검사와는 다른 미구현 확인이며, 저장API0·준비 key/value exact·브라우저 오류0이다. 캘린더 선택 월 복원 기대는 검색어 failure 이후 도달하지 못했으므로 그 assertion을 별도 실행 성공으로 세지 않는다.

한국어 HTML 보고서는 C1과 B3를 구분하고 현재 W3T4와 단일 HTML7D의 다른 범위를 명시했다. 보고서 다섯 viewport를 별도로 자동 검사했으며390의 비교/시험 카드와1440의 비교표를 root가 직접 읽었다. 제품 화면 검사 수·관찰 사용자 수에 합산하지 않는다.

다음은 C1의 **목록/개인공간 왕복 presentation memory → standalone 기존 Flow 찾기 → 나머지 source·장문·다섯 화면 대조**다. 이후 C2 명시 비교 연습, C3 로컬 UI, K4 승인 근거 기반 설계 순서를 지킨다. 검색어를 URL나 storage에 저장해서 복귀를 구현하지 않는다. 단순 `<a>`의 전체 문서 이동은 아직 교체하지 않았다. 자정 이후 입구의 현재일 재확인도 navigation 묶음에서 검사한다.

실제 Android Chrome: NOT_RUN. iOS Safari: NOT_RUN. OS IME/OS Back/보조기술: NOT_RUN. 관찰 사용자0명. commit: 미실행. push: 미실행. PR: 미실행. Preview: 미실행. Production: 미실행. 전체 목표 완료 아님.
