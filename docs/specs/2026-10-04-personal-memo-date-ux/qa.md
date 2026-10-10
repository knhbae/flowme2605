# 메모·날짜 후보 검증

2026-10-04. [목표](spec.md)의 좁은 구현·조작 시안 검증이다. 제품 전체 완성, 원 피드백 환경의 해결, 실제 사용자 검증을 뜻하지 않는다. [요구와 새 인계](requirements.md)·[결과와 후속](results.md)을 함께 본다.

## 판본과 실행 경계

- 작업본 `D:/flowme2605/flow-personal-memo-date-20261004`, 시작 HEAD `58df6bff7c1de4af6c88b38ce15a78bf355fa5f6`, 미커밋 후보.
- 최종 앱 build `kaHxY-yOUnMDKsDT3jBcP`. 통합·npm·build의 소스 659개 SHA256 `59836578010455476cdc32b024f4801c3869e2a534874925545115904bfa321c`, 실행 중 변경 0.
- HTML 최종 140,590 bytes, SHA256 `e0c998de8bf9058e03626b2e1036acc33da06348fe8a633796525c8ec44ad73c`. 최종 보고 접힘 영역을 추가한 뒤 모델 14건과 브라우저 35건을 재실행했다. 이전 30건 판정은 이전 HTML 근거다.
- HTML inline vendor 모델 SHA `c71829a7c755dc99bb6cce7519f856988994542dc05467367fb9c31e2e1dbaaf`, 입력 계획 SHA `353b9efa194f4bfcf92d88b899fe4264879cdee993ef13228772b5a723556bac`가 원본 코드와 일치한다.
- HTML은 3114의 한 파일 GET 전용 preview, 앱은 3106의 합성 설정 production 서버다. DEV 3105/13105·기존 자동 시작·Tunnel을 조작하지 않았다.

## 자동 검사 — 실제 최종 실행 수

| 검사 | 실제 결과 | 범위·주의 |
| --- | --- | --- |
| 새 helper·component + 기존 editor journey | 46/46 PASS | 새 helper 25, 새 component 10, 기존 journey 11. 전체 통합에 포함되는 사례를 다시 실행한 것이며 별도 고유 coverage로 합산하지 않는다 |
| HTML 모델·소스·dirty/proposal 경계 | 14/14 PASS | 실제 vendor 의미·입력 계획과 같은 Item, 전체 snapshot Undo, 미결 결과 출처 |
| 전체 통합 | 283파일·3,029/3,029 PASS | 04:18:31.388~04:29:48.170 UTC, fail/skip/cancel 0, concurrency2·worker512MiB, exit0 |
| `npm test` | 2,261/2,261 PASS | 04:21:05.826~04:21:37.299 UTC, fail/skip/cancel 0, exit0 |
| 통합 타입 검사 | 584 entry·진단0 | inventory 검사 10/10 PASS. 최종 재실행도 source659·변경0 |
| production build | exit0 | 04:18:21.234~04:19:11.611 UTC, 위 exact build |
| docs:check | 4/4 PASS·필수16·로컬 링크7,579 | Skill sync PASS, exit0. 최종 파일 목록 작성 후 실행 |
| 미정 문법 read-only 진단 | 3/3 PASS | 일반 문구/`[미정]`/개별 `- 날짜: 미정`. 브라우저나 원 피드백의 재현으로 세지 않는다 |

상기 수는 검사별 실행 수다. 서로 겹치는 suite·재실행·단언 수를 더해 전체 요구 충족률이나 고유 테스트 개수로 표현하지 않는다. 기존 테스트를 줄이거나 제품 validator를 풀어서 통과시키지 않았다.

전체 통합은 봉인 catalog pack `D:/flowme2605/flow-poc-merge-prep-20260920/lib/flow/integrated-poc/catalog-library-pack.v1.json`을 읽기 전용 환경 경로로 제공했다. 현재 SHA256 `723ABEFDC26243EB1F9B4BCF21730758ECC7A300494AD2AE75293AC5C6DDE4BE`다. pack·credentials·실계정 파일을 이 작업본에 복사하지 않았다. 원시 test 로그는 기존 public recorder가 보존하지 않으며 공개 요약의 aggregate만 기록한다.

## 실제 브라우저 시나리오

Chromium CLI의 실제 DOM·키보드·native input·화면 캡처다. HTML 35/35, 실제 앱 합성 경로 32/32 PASS. 앱의 Auth/API는 모든 요청을 가로채 합성 fake server로 응답했고 실제 서버로 보낸 것은 고정 localhost 문서·정적 파일 GET뿐이다.

| 시나리오 | HTML | 실제 앱 합성 | 판정 범위 |
| --- | --- | --- | --- |
| 첫 예시·두 줄 메모·일반 문장 | H01/04 PASS | A01/02/05/16 PASS | 일반 문장을 Item·메모 속성으로 승격하지 않음 |
| 메모 소속·이어쓰기 | H02 PASS | A03~05/15 PASS | direct root/child owner, HTML 같은 제목은 literal text. 실제 Enter 후 같은 Item.note 저장 |
| 날짜 출처·시간만 변경 | 선택 결과 표시 | A06/10~12 PASS | 구획/개별 출처, 시간 변경이 기존 날짜 고정도 유발함을 안내. handler 의미 불변 |
| 같은 위치·미적용·취소·Escape | H05/08~11 PASS | A07~09 PASS | HTML preview/cancel byte equality, 앱 같은 날짜·시간 및 Escape는 command 0 |
| 구조 위치 이동 | H06/07 PASS | 이번 새 DOM 이동 시나리오 없음 | HTML에서 원문 구획은 바뀌어도 기존 날짜·ID·메모·시간 유지. 기존 모델 회귀는 통합에 포함 |
| 실행 날짜만 변경 | H12 PASS | A13 PASS | 개별 날짜 patch, 원문 위치·구획·메모·ID 보존 |
| 10/5→10/8 입력 교차 확인 | 시안 날짜 변경 PASS | F14~17/A14 PASS | 자동 fill·실제 Arrow 키·적용·다시 열기·reload. 날짜 선택기 popup NOT_RUN |
| 기간→같은 원문 | H13/14 PASS | 해당 전달 사례의 기간 편집 경로 NOT_RUN | HTML 동일 ID·원문 caret 복귀. 전달 결함 전체 해결 근거 아님 |
| 저장/reload/Undo | HTML snapshot Undo·reload 초기화 | A11/14~17 PASS | 앱 합성 repository revision9, 9명령. 실제 계정/DB 저장 검사는 아님 |
| 거절·dirty 전환·미결 결과 출처 | H15~18/21/22/25 PASS | component 거절/입력 보존 회귀 PASS | HTML 입력 보존·선택/보기 전환 방지, 비교안만 적용한 결과를 현행으로 오표시하지 않음 |
| 키보드·보고 영역·화면 경계 | H23/24 + V/R5 PASS | VD/VM5 PASS | 아래 5개 viewport, 포커스·44px 목표·스크롤 후 접근성 검사 |
| 외부 쓰기·오류 | H20 PASS | A18 PASS | 금지 storage/network/console/page error 0 |

실제 날짜 키보드 검사는 locale segment를 관측하며 이동했다. 첫 ArrowUp은 `2027-10-05`로 바뀌어 ArrowDown으로 되돌렸고, 다음 segment도 `2026-11-05`를 되돌렸다. day segment에서 `2026-10-06 → 07 → 08`을 실제 키 입력했다. 이 중간 draft는 적용하지 않았으며 최종 10/8만 같은 명령으로 저장했다. 날짜 선택기나 실제 사람 입력을 대신한 근거로 사용하지 않는다.

## 화면별 평가

| 크기 | HTML 본문/창 가로 넘침 | 앱 본문/창 가로 넘침 | 핵심 행동·안내 |
| --- | --- | --- | --- |
| 390×844 | 0px/0px | 0px/0px | 한 열, 날짜/메모 출처 읽기·취소/닫기 도달 |
| 375×812 | 0px/0px | 0px/0px | 좁은 문장 줄바꿈, 44px 이상 닫기·취소 접근 |
| 844×390 | 0px/0px | 0px/0px | 창 내부 세로 스크롤로 핵심 행동 도달. 모든 내용이 한 화면에 동시에 보이는 것은 아님 |
| 1024×768 | 0px/0px | 0px/0px | 편집과 결과 구분, 안내가 창 폭 내에 표시 |
| 1440×900 | 0px/0px | 0px/0px | 문서/결과 두 영역, 닫힌 고급 쟁점·검증 결과 분리 |

최종 screenshot 직접 검토: HTML 1440×900 및 이전 375×812/844×390, 최종 앱 날짜 375×812·메모 844×390, 결과 펼침 390×844. 아래 fidelity 기준 5개를 검토했다: 기존 차분한 배경/테두리 토큰 유지, 문서·결과 계층 유지, 기존 날짜 창 필드/버튼 배치 유지, source 안내를 창 안에서만 표시, 좁고 짧은 화면의 줄바꿈·세로 스크롤·핵심 행동 보존. 전체 UI 새 디자인이나 사람의 사용성 평가가 아니다.

## 보호 데이터 불변 증거

- HTML `setItem/removeItem/clear` 0, 외부 요청0, console/page error0. 임시 memory state만 변경한다.
- 앱 isolated context의 bootstrap에서 만든 합성 sentinel `flow:saved-plans`, `flow:completion:v1`, `other-app:key`는 시나리오 후 문자열 bytes 동일. 실제 운영 브라우저의 자료를 읽거나 비교한 것이 아니다.
- bootstrap 뒤 관측한 앱 storage 호출46개는 모두 `flow:poc:personal-workspace:v1:` prefix. 허용 밖 set/remove 및 clear0. bootstrap sentinel 준비는 제품 mutation 수와 분리했다.
- Auth32·API9 요청을 합성 응답으로 처리. 외부 Auth/API 전달0, 금지 요청0, denied WebSocket/worker 시도0, page/console/bootstrap error0. 같은 합성 public 원본 JSON 불변.
- 현재 제공본 git clean, build `zmK_7Oh9wTK9_B0g6mhnS`를 마감 시 재확인했다. 현재 다른 담당자가 관리하는 PID는 임의 종료하지 않았다. main·Production·DB/Auth/DNS/Tunnel 변경0.

이 증거는 합성 namespace 보호·접근 차단과 기존 제공본을 바꾸지 않았다는 범위다. 실제 운영 DB의 전 테이블 byte 비교나 로그인 상태까지 검증했다고 주장하지 않는다.

## 실패·수정·미실행 기록

| 실행 | 실제 결과와 처리 |
| --- | --- |
| 최초 통합, catalog pack 미공급 | 3,006실행/2,906PASS/100FAIL, exit1, source 변경0. 공개 recorder는 개별 원시 실패를 보존하지 않았다. sealed pack을 read-only로 제공한 최종 같은 전체 suite가 3,029PASS다. 100개 원인을 개별 확정했다고 쓰지 않는다 |
| 최초 시간-only 표시 코드 | 선언되지 않은 `row.subcheck` 접근으로 타입 TS2339·build exit1. 실제 선언 `row.time`으로 고쳤고 최종 타입·build·회귀 PASS |
| 수정 중 통합 재실행 | 코드 수정이 필요해 진행 중 실행을 정상 중단. 미완료이며 PASS/FAIL 전체 수로 세지 않음 |
| helper/component fixture 초기 | 참조 속성 추가가 writer에 거절되던 fixture·AST selector를 수정. 제품 보호를 제거하지 않았고 최종 helper25/component10 PASS |
| 최초 앱 브라우저 | A01~10 도달 후 합성 명령 해석 실패로 저장 미확정. CLI VM의 foreign object를 strict plain-object validator가 거절한 fixture 문제. raw JSON을 callback realm에서 재해석하도록 수정하고 malformed JSON·기존 field allowlist를 유지. 새 profile 최종32PASS |
| CUA·file 직접 열기 | CUA 초기 inventory timeout, CLI file protocol 제한. 이 새 artifact는 범위를 제한한 HTTP preview로 검사했다. 과거 UX2 file 검사 생략 이력을 이번 PASS로 바꾸지 않음 |
| 실제 Android/iOS·AT/한글 IME | NOT_RUN. 브라우저 크기 변경·캡처를 실제 기기 검증으로 표현하지 않음 |
| 전체 `npm run test:e2e` | NOT_RUN. 기존 전체 브라우저 suite를 이번에 다시 돌린 것은 아니다. 좁은 표시 변경에 관련 모델/컴포넌트·전체 통합·실제 앱 합성32건을 실행했으며 다른 route의 UI 성공으로 확대하지 않음 |
| 새 인계 PDF/ZIP·11캡처 | 미열람. 전달 PASS/후보/NOT_RUN을 requirements에 별도 기록 |
| 새 commit/push/PR/CI·DEV/main/Production | NOT_RUN, 이번 목표의 후보 검증 후 별도 승인 단계 |

## 로컬 전용 근거와 재실행

`output/integrated-product-poc/*-latest.public.json`과 `targeted-types.json`, `output/playwright/memo-date/{html-browser.public.json,app-browser.public.json}` 및 viewport PNG는 ignored 로컬 근거다. 보고서의 판정·실행 수는 여기 요약했으며 원본 근거는 아직 Git에 게시하지 않았다. 보고서만으로 다른 기기에서 로컬 파일이 열릴 것이라고 보장하지 않는다.

재실행 입구: `npm.cmd run typecheck:integrated-product-poc`, 새 helper/component/journey 3파일의 `node --import tsx --test`, `node --test scripts/content-audit/build-memo-date-ux-20261004.test.mjs`, 기존 `program-verify.mjs new-tests 2`/`npm-test`/`build`. CLI DOM 검사는 task-owned server·신규 isolated profile에 fixture를 설치한 뒤 `qa-memo-date-{html,app}-20261004.js` callback을 실행한다. 실제 계정 profile에서 fixture를 실행하지 않는다.

최종 closeout reporter는 04:45:54.910 UTC 전체 변경 scope의 runtime3·tests3·tooling4 및 문서/HTML 그룹을 수집했다. 처음 파일 stem을 directory scope처럼 전달한 보고서는 runtime을 누락해 올바른 디렉터리 scope로 다시 실행했다. 실제 diff는 개별30파일로 펼쳐 소유 목록과 대조했고 whitespace 오류0이다. reporter는 검사 추천 도구이며 test/build PASS를 직접 발급하지 않는다. 서비스 구조·route·영구 결정 변경은 없고 기존 IDEAS 연결과 STATUS/spec 층만 갱신했다.
