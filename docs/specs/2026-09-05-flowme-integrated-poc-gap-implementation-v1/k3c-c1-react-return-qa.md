# K3-C C1 React — 검색·미리보기 왕복 검증

2026-09-06 KST. **React의 아래 왕복 범위 구현·검증. C1 전체는 진행 중이다.** [실행 계획](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md) §10과 [C1 설계](./k3c-c1-entry-preview-design.md) §4.3을 따른다. 이전 [읽기 연결 QA](./k3c-c1-react-read-qa.md)의 W3T4 결과는 당시 증거로 보존한다.

## 세 원본 요구와 적용 방식

| 원본 요구 | 수정 전 | 현재 구현·확인 범위 |
| --- | --- | --- |
| 개발1 K-D1-04/10·D1-017·D1-021: 검색→선택→같은 사본 이해 | 실제 개인공간→Back에서 검색어가 빈 값. 보기·선택 월 기대까지 도달 못함 | exact query 안에서 client 이동. 검색어·group/Flow·원문/내 사본·보기·월/선택일·열린 Item을 메모리로 복귀. 실제 Calendar 및 source 상세 왕복 통과 |
| v4.1: 실행 위치를 보고 돌아와도 개인 상태 보존 | 읽기 선택과 실행 저장의 경계를 유지해야 함 | 복귀용 저장 key/Undo 없음. 현재 운영 read model·source/state/draft/library를 다시 읽고 full membership 검증. 과거 DTO를 현재 원문으로 복원하지 않음 |
| 개발2: 작성 원문·도움·native Undo 소유 | 검색 전환 때 작성기를 제거하면 DOM의 입력 이력을 잃을 수 있음 | 같은 화면 안의 작성↔검색은 기존 textarea를 연결된 동일 노드로 유지. 명시 저장 뒤 검색 가능. 실패 입력은 선택 링크와 상단 출구에서 이동 차단, 작성 재개에서 그대로 확인 |
| 개발1·개발2: 현재 source와 개인 사본을 구별 | route 부재 중 source/target ABA를 화면 listener만으로 놓칠 수 있음 | 문서 수명의 단일 observer와 exact binding. 관측 변화·읽기 실패·pending recovery에 옛 ticket 무효화. 새 boot/명시 선택은 새 packet 사용 |

`flow-ux-review`와 UI/UX Pro Max의 예측 가능한 Back 기준을 적용했다. 일반적인 query URL 보관 권고는 승인된 PoC 개인정보·exact gate 경계에 맞지 않아 사용하지 않았다. Figma는 사용하지 않았다. React 검토에서는 전역 listener 중복·서버의 사용자 메모리 공유·지연 초점의 이전 owner 재사용을 확인했다.

## 구현 계약

- 새 순수 memory factory: 버전1, 교체 가능한 최대8개. UUID만 caller가 생성. strict data-only clone/freeze, exact 문자열과 optional presence, 실제 날짜·유한한 양수/0 스크롤 검사. 저장·시각·난수·네트워크 없음.
- browser adapter는 브라우저에서만 한 번 만든다. history에는 `__flowmePocEntryNavigationV1` UUID만 남기며 Next history 필드는 보존한다. 검색어·원문·메모·DTO는 URL/hash/history/storage에 넣지 않는다. hard reload 뒤 검색 복원은 새 영구 기능으로 추가하지 않는다.
- AuthoringRoute의 기존 recovery·손상 gate가 먼저다. draft는 단일 getItem bytes를 기존 decoder에 전달한다. 복귀 group/child/Item과 활성 사본을 현재 packet·catalog로 재검증한다.
- 개인공간과의 route 왕복에서는 저장된 작성 원문 bytes를 복원한다. **그 왕복에서 native Undo까지 보존했다고 주장하지 않는다.** 동일 화면의 작성↔검색 전환에서는 textarea identity와 실제 native Undo를 검사했다.
- `목록으로`는 검색어·선택·보기·원문 owner를 유지하고 exact 행에 초점을 돌린다. 목록 스크롤과 preview 스크롤은 별도이다. child 변경은 기존대로 Text 초기화·상세 닫기, 같은 child는 유지한다.
- 날짜가 없는 사본은 focus/visibility·읽기 행동에서 로컬 현재일을 다시 확인한다. 사본의 지정 기준일과 사용자가 탐색한 월은 덮지 않는다. K4의 기준일 정책을 새로 결정한 것이 아니다.

## 실패 이력과 실제 실행 수

| 실행 | 실제 결과·해석 |
| --- | --- |
| 기존 R07 baseline (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-return-baseline-20260906-01.json`) | 1실행/1FAIL. 실제 빈 검색어 결함. 저장0·운영 fixture 불변 |
| 순수 memory 최초 로드 | 모듈이 아직 없어 파일 로드 실패1, 시험 본문0. 16개 제품 RED로 세지 않음 |
| listReturn 추가 전/후 | 기존 모델로18실행17PASS/1RED → 최종18/18 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/entry-navigation-list-return-final18-2026-09-05T23-25-11-034Z.json`). 기존16 포함 |
| 첫 타입/빌드 | Flow의 `tasks` 대신 실제 `items` 계약, ref 초기값, legacy `txt` 별칭 타입을 수정. 최초 빌드 실패도 보존 |
| 첫 확장36개 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-return-expanded-20260906-01.json`) | 33PASS/3FAIL. 모바일2개의60px 복귀 차이는 안내 영역이 빠진 실제 문제. 나머지1개는 다문자 입력이 한 native Undo로 묶인다는 하니스 전제 오류 |
| 안내 수정 후36개 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-return-expanded-20260906-02.json`) | 36/36PASS. 입력은 단일 `insertText` transaction으로 정리하고 Undo 기대는 유지 |
| 자정 검사 최초2실행 | 지정 anchor가 있는 fixture에서 현재 월로 바뀌길 기대한 잘못된 시험. 사본 기준일을 지키는 제품을 오류로 판정하지 않는다. 현재일 의존 사본/지정 anchor 사본으로 나눔 |
| 현재일·기준일2개 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-return-date-owner-20260906-01.json`) | 2/2PASS. 아래38개에 포함된 재실행 |
| 이전 현재일 후보 브라우저 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-return-current-20260906-04.json`) | 2yOFC 빌드에서38/38PASS. 아래 최종38개와 같은 등록 시험이며 중복 합산하지 않음 |
| 후속 전체 rect·9점5개 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-return-hit-final-20260906-02.json`) | 5/5PASS. 위 왕복5개의 강화 재실행. 새 고유5개로 더하지 않음 |
| 현재 모델·SSR (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/entry-return-final-candidate-models-2026-09-05T23-57-33-790Z.json`) | **113/113PASS**. navigation18 + 이전95. 더 작은87개 실행도 포함 관계 |
| production build (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/entry-return-final-build-2026-09-05T23-51-10-846Z.json`) | **HiAhDAh-TgaCKpB_m4CgB**, Surface AA926C91. 타입·18개 정적 생성PASS. 배포 아님 |
| 최신 npm test (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-return-final-candidate-npm-2026-09-05T23-57-36-203Z.json`) | **2,030실행/2,029PASS/1FAIL**. 기존 source review due: banana-peanut-recipe-video, monstera-care-routine, water-purifier-filter-cycle, plank-30-day-challenge(2026-06-07). 운영 seed·시간·기대값 변경0 |
| npm 중단 뒤 별도 실행 | approved201/201 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-return-final-approved-2026-09-06T00-00-52-387Z.json`), public19/19 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-return-final-public-corrected-2026-09-06T00-01-30-066Z.json`). public 재실행 최초 명령은 존재하지 않는 script 이름으로 본문0/실행 실패였으며 올바른 기존 명령으로 다시 실행. npm 전체 PASS로 합산하지 않음 |
| K1-A/K3-A 최초 추가 회귀 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-return-authoring-regression-20260906-01.json`) | 30실행29PASS/1FAIL. KA-B02 마지막 다중행 선택 뒤3행이 raw가 아닌 presented. 첫 현재행/속성 owner 검사는 통과. 동일 시험 단독 재현도1FAIL |
| 지연 초점 수정 후 반복 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-ka-b02-focus-20260906-02.json`) | 기존 기대를 바꾸지 않고 같은 KA-B02를3회 실행해3PASS. 새로운3개로 합산하지 않음 |
| 최종 K1-A/K3-A React (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/k3c-return-final-authoring-20260906-02.json`) | **30/30PASS**, retries0. 기존 두 spec 수정0. 경계 기록41개·API146회, 운영 불일치·금지 prefix·clear·브라우저 오류0 |
| 최종 후보 첫38개 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-return-final-20260906-05.json`) | 37PASS/1FAIL. 기본 /my가 정상적으로 붙이는 sort=next를 시험의 /my$ 기대가 거부. 실제 fail-closed와 저장0·bytes exact는 통과. 제품 수정 없이 허용하는 기본 URL 두 형태만 검사하도록 하니스 수정 |
| 최종 합동 브라우저 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-return-final-20260906-06.json`) | **38/38PASS**, retries0·skip0·flaky0. 왕복15 + 읽기10 + Stage2 기존13. 다섯 링크 full rect·9점, 숨긴 작성 heading과 읽기 heading의 중복 방지도 포함 |

## 왕복 시나리오 판정

추가 작성 회귀에서 확인한 `closeOverlay`의 지연 RAF는 C1 전 코드와 동일했다. 닫기 직후 새 키보드 입력이 들어왔는데 옛 opener로 초점을 돌려 새 선택을 덮었다. 닫는 순간의 작성기·원문·선택과 현재 activeElement를 비교하고, 새로운 사용자 행동이 있으면 옛 복귀를 취소하도록 수정했다. 기존 시험의 현재행/다중행 기대와 입력을 약화하지 않았다. 읽기 복귀 역시 한 번 적용한 초기 snapshot을 후속 검색에 다시 적용하지 않도록 했다.

| 시나리오 | 결과 |
| --- | --- |
| 검색→Calendar→다음 월→개인공간→실제 Back | 검색어·선택한 사본·Calendar 탭·선택 월 복원PASS |
| 원문 owner·상세 열기→개인공간→Back, 다섯 크기 | 같은 브라우저 문서, owner·Item·스크롤·링크 초점 복원PASS. history에 검색어 없음 |
| Escape 상세 닫기→목록으로→같은 Flow 재선택 | 실제 source Item opener→목록 행 초점, 검색/원문 owner 유지PASS |
| 방문 중 source/state/운영 sentinel A→B→A | 다른 격리 page의 실제 storage event 후 이전 ticket 폐기, 새 검색 가능PASS. 외부 주입은 제품 호출 계수에서 제외 |
| 기존 작성 초안이 있는 상태에서 검색·route 복귀·작성 재개 | 검색과 저장 원문 각자 유지PASS |
| 정상 초안 저장 뒤 동일 화면 검색·작성 재개 | textarea 객체 동일·검색0쓰기·실제 Ctrl+ZPASS |
| draft 저장 실패→검색→두 출구→작성 재개 | 실패 입력·기존 저장값·동일 textarea 유지PASS |
| history.replaceState 실패·reload | 출구 이동0, 다시 로드하면 검색은 빈 값. 저장0PASS |
| 자정 focus와 명시 월/사본 기준일 | 현재일 fallback만 갱신, 명시 월/anchor 유지PASS |

## 다섯 화면 직접 평가

최종 HiAh 빌드38개 실행의 `return-source-*.png`5개를 root가 직접 읽었다. 캡처 폴더 (로컬 전용 근거: `../../../output/playwright/k3c-return-final-20260906-06/`)에 source/list10개와 기존 읽기15개가 있다. 자동 캡처 수와 직접 읽은 수를 구분한다.

| 크기 | 확인한 상태·한계 |
| --- | --- |
| 390×844 | source 상세·목록 버튼·링크와 아래 기존 nav 확인. 복귀60px 차이 수정 후 현재 스크롤 유지 |
| 375×812 | 원문 안내 자연스러운 줄바꿈, source 필드·닫기·링크 확인. 위 header는 현재 스크롤 밖에 있음 |
| 844×390 | 기존 compact header 아래 내부 스크롤의 끝 위치 복귀. 링크 접근 가능. 원문 설명·닫기가 동시에 첫 화면에 있다는 뜻 아님 |
| 1024×768 | 왼쪽 검색 유지, 오른쪽 상세/링크로 돌아옴. 강화 검사에서 링크 rect bottom768, 전체9점PASS. 화면 끝에 붙는 여백 개선은 C3 |
| 1440×900 | 두 pane와 source/개인 owner 분리. 링크 rect bottom900, 전체9점PASS. 제목은 내부 스크롤 위쪽에 있을 수 있음 |

왕복5개 전체에 페이지 가로 넘침0·Escape/목록 opener·source owner·링크 초점을 검사했다. 후속5개에서 링크 전체 rect/9점도 통과했다. 이전 C1 읽기10개는 원문 링크·닫기·기준의 hit test와 preview/dd 넘침, console/pageerror0을 재검사했다. 모든 긴 문자열·모든 Item의 전수 화면 검사나 실제 기기 검사는 아니다.

## 운영 데이터·변경 파일

15개 왕복 시나리오의 준비/종료 key/value와 제품 storage API를 첨부했다. 순수 읽기·왕복 구간의 호출0, errors0, 준비 key/value exact. 정상 작성·native Undo 시험은 **검색 구간만0쓰기**이며 작성 행위는 허용 prefix에 기록하므로 시나리오 전체를0쓰기로 표시하지 않는다. 저장 실패 주입도 실제 성공한 저장과 구분한다. 실제 사용자 브라우저 프로필은 읽거나 변경하지 않았다.

읽기10개의 전체 구간과 왕복15개의 읽기 구간, 총25개 경계 첨부를 최종 JSON에서 확인했다. 각 호출0·errors0·준비/종료 bytes 동일이다. 작성 회귀30개는 별도41개 경계 첨부에서 API146회이며, 허용 prefix 밖·clear·운영 bytes 불일치0이다.

보호 원장551개 유지. 2026-09-06T00:01:31.331Z의 허용 변경31/예상 밖0. 원본 `D:\flowme2605\flow-mvp`의 dirty·미추적 파일 수정/삭제/stage0. exact before는 `output/poc-gap-implementation/k3c/before-entry-return-20260906-01/`에 보존했다.

| 제품 파일 | SHA 앞부분·역할 |
| --- | --- |
| [entry-navigation.ts](../../../lib/flow/personal-workspace-poc-entry-navigation.ts) | 06773332 · 순수 메모리 계약 |
| [entry-navigation-browser.ts](../../../lib/flow/personal-workspace-poc-entry-navigation-browser.ts) | 636D5EB6 · browser-only 관측·현재 binding·opaque history |
| [AuthoringRoute](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringRoute.tsx) | DC225A53 · 새 boot·복귀 membership·pinned draft decoder |
| [AuthoringSurface](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocAuthoringSurface.tsx) | AA926C91 · client 왕복·목록·초안 보호·현재일·지연 초점 경합 보호 |
| [EntryPreview](../../../components/flow/personal-workspace-poc/PersonalWorkspacePocEntryPreview.tsx) | E230550F · controlled presentation·owner별 상세 초점 |

시험 변경: 새 `entry-navigation.test.ts`, 현재 소유 `personal-workspace-k3c-entry-return.spec.ts`와 characterization의 정상 /my URL 기대. 기존 AuthoringSurface SSR의 직접 storage 객체 기대는 pinned single-read adapter 검증으로 바꾸고 같은 decoder·corrupt gate 기대를 유지했다. 기존 K1-A/K3-A 회귀 파일은 이 보고 시점까지 변경0.

## 다음 순서·공개 상태

다음은 C1-b standalone 읽기 입구 → 원문 변화/장문/다섯 화면 동등성 → C2 명시 비교 연습 → C3 로컬 UI → K4 근거·호환 설계 순서다. standalone은 `render()`로 작성기를 제거하지 않고 별도 읽기 host에서 조회해야 native Undo를 보호할 수 있다는 읽기 조사를 마쳤다. 제품 구현은 아직 시작하지 않았다. seed의 Map에는 실제 group membership·대표 URL이 없으므로 유사한 제목의 catalog를 붙여 보충하지 않는다. 별도 읽기 fixture의 범위와 누락 상태를 설계에서 구분한다.

사용자가 직접 여는 두 단일 HTML은 여전히 B3 **7D1610 / 1,454,070bytes**다. 이번 React 왕복이 그 HTML에 이미 들어갔다고 표시하지 않는다. 기본 `/my`·운영 key/schema/writer·전역 CSS·배포 설정 변경0. 앱 공통 nav·OS Back을 포함한 모든 미저장 이탈 경로의 전수 검사는 이번 두 출구 시험 범위 밖이다.

Android Chrome NOT_RUN. iOS Safari NOT_RUN. 실제 OS IME/OS Back/보조기술 NOT_RUN. 관찰 사용자0명. commit 미실행. push 미실행. PR 미실행. Preview 미실행. Production 미실행. 전체 목표는 active이며 완료 처리하지 않는다.

## 보고서와 인계 확인

한국어 보고서 (로컬 전용 근거: `../../content-audit/2026-09-05-flowme-integrated-poc-gap-implementation-ko.html`)는 React의 현재 성공과 단일 HTML의 새2RED baseline을 구분한다. 최종 파일 SHA `49605ECAC117CDE2F4670985E55D2DF6BFC8B4336056632BDDD677895C0061B4`. 보고서 검사 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-return-report-20260906-02.json`)는 등록5개/5PASS, 재시도0이며 각 크기에서 top/왕복/이전읽기/시험20캡처를 생성했다. Root는 그중 왕복390/1440 두 장을 직접 읽었다. 이전 보고서5회도 같은 등록 시험의 재실행이며 제품 시험 수에 합산하지 않는다.

보고서의 새/이전 C1 링크 전체 rect·9점·키보드 초점, 로컬 href 존재, 이미지 decode, 페이지 가로 넘침0·console/pageerror0·캡처 전후 파일 SHA 동일을 검사했다. 앱 패널 열기는 `queued`였으므로 사용자 화면에 이미 표시됐다고 주장하지 않는다.

문서 검사 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1-return-docs-final-2026-09-06T00-19-14-834Z.json`)는 필수16개·로컬 링크6,344개PASS다. 00:16:14Z closeout은 이번 scoped13개 경로만 추천했고 실제 테스트 통과를 대신하지 않는다. 실제 Route/Surface/EntryPreview diff와 새 memory/browser 파일을 검토했으며 소유 React3개 `git diff --check`는0이다. 전체 미소유 diff나 전수 E2E 통과 판정은 아니다.
