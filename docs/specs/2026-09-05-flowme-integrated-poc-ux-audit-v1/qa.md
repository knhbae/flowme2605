# P3-K 통합 UX 감사 검증

- 날짜: 2026-09-05
- 대상: 세 원본과 통합 PoC의 비교·수정 설계·계획. 제품 구현 변경 없음.
- 열어 보는 보고서 (로컬 전용 근거: `../../content-audit/2026-09-05-flowme-integrated-poc-ux-audit-ko.html`)
- 현재 런타임: React의 기존 production build, 단일 HTML. 실제 기기 아님.

## 범위와 개수

| 구분 | 실제 수·결과 | 해석 |
|---|---:|---|
| 원본 요구 inventory 검산 | 8/8 | 추출·ID·합계 검사. 제품 테스트 아님 |
| 부모 요구 | 254 | v4.1 78 / 개발1 26 / 개발2 64 / 통합 연결 86 |
| 보존한 하위 조건 | 424 | 현재 원자 조건 전수 재실행 아님 |
| 브라우저 진단 기록 | 18 | 범위 내 통과 11, 실패 기록 7. 같은 결함의 런타임별·reload 기록 포함 |
| 메모리상 모델 비교 | 4 | 기간 비교 3, 같은 날짜 순서 비교 1. 모두 React/단일 HTML 차이 확인 |
| 고유 발견 기록 | 26 | 실제 오류·코드 차이·과거 판정 정합성 포함. 독립 결함 26개나 미충족 요구 26개라는 뜻 아님 |
| 원본·제품 캡처 | 59개 파일 | 원본 10, 현재 제품 49. 캡처 호출 61 중 같은 파일 갱신 2회 |
| 제품 browser context | 6 | 진단5개 context와 속성 목록 안정 상태 재캡처1개. 격리 Chromium, 현재 사용자 프로필 미사용 |
| 이번 `npm test` | NOT_RUN, 0개 | 제품 코드 미변경. 과거 성공을 이번 시험 수에 합산하지 않음 |
| 이번 production build | NOT_RUN | P3-J가 만든 기존 build를 실행해 감사 |

과거 P3-J의 `npm test` 2,210/2,210 및 build 성공은 과거 증거다. 부모/하위 요구를 합쳐 합격률을 만들지 않는다. 원장의 기능·UX·UI·증거 상태는 별도이며 코드 확인으로 전체 UI PASS를 부여하지 않았다. 과거 하위 판정은 충족316/부분51/미충족41/의도적변경4/제외12다. 오래된 manifest의313/54/41은 최신 판정이 아니다.

## 일곱 여정과 예외 진단

원시 조작·storage·화면 측정: browser-audit.json (로컬 전용 근거: `../../../output/p3k/browser-audit.json`).

| 진단 ID | 결과 | 실제 확인한 범위 |
|---|---|---|
| K-J1 | 범위 내 통과 | 네 origin이 한 번씩 미분류에 나타남, 선택·상세 열기 |
| K-J6 | 범위 내 통과 | 상세 완료→오늘에서 완료 확인→다시 열기 |
| K-J2 | 동작 통과·UX 차이 | 작성 틀·예시 확인·골격 적용·자유 편집. 전체 원본 UX 일치는 아님 |
| K-X1 | 실패 재현 | React 첫 Item 장소 도움을 연 채 앞에 새 Item을 입력하면 새 Item에 값 적용 |
| K-J4-react | 범위 내 통과 | 명시 저장→영수증→개인공간→reload |
| K-X3-standalone | 실패 재현 | exact draft key 저장 오류에서 반영 안내가 남고 durable draft는 바뀌지 않음 |
| K-X3-reload | 실패 재현 | 위 단일 HTML 입력이 reload 후 사라짐. 별도 독립 결함으로 중복 계산하지 않음 |
| K-J4-standalone | 범위 내 통과 | 명시 저장→영수증→개인공간 열기 |
| K-X3-react | 실패 재현 | exact draft key 오류 뒤 원문 반영 안내가 오류를 덮고 reload에서 값 소실 |
| K-J7-noop-escape | 통과 | 같은 날짜 이동·Escape에서 저장 mutation0, 초점 복귀 |
| K-J5 | 범위 내 통과 | 빠른 할 일 생성→오늘→내일 메뉴 이동→Undo |
| K-J7-standalone-dirty | 실패 재현 | 개인 Plan 제목 수정→Escape에서 확인 없이 버림. 저장0이 UX 통과를 뜻하지 않음 |
| K-J7-mobile-undo | 동작 통과·UX 차이 | 모바일 설정 안 Undo 작동. 이동 직후 발견성은 부족 |
| K-J5-flow-folder | 범위 내 통과 | Flow 폴더 이동·Item 부모 폴더 상속 |
| K-J5-keyboard-periods | 범위 내 통과 | 손잡이 Home 키, 주간·월간·미정 열기. 기간 간 순서 동등성 통과 주장 아님 |
| K-J1-source | UX 요구 미충족 | 선택 전 출처·선택 미리보기 완료 기준 연결 없음 |
| K-J7-trash | 범위 내 통과 | 단일 HTML authored Flow 휴지통→복원. 영구 삭제 미실행 |
| K-X4-source-checked | 불일치 재현 | 같은 `[x]` 원문 신규 저장: React0/1, 단일 HTML1/1 개인 완료 |

K-X3는 테스트가 PoC의 정확한 draft key에 QuotaExceededError를 주입한 진단이다. 실제 디스크 부족·OS 저장 실패를 시험한 것이 아니다. UI 문구는 일반적인 “원문에 반영했어요”였으며 “저장 성공”이라고 잘못 인용하지 않는다. 오류 처리 후 최종 상태를 확인했다.

K-X2 실제 IME는 미실행이다. standalone의 composing guard 후보를 다음 K1-A 재현 대상으로 남겼다. drag·길게 누르기·pointercancel 전체 동등성, 손상 payload 전체 행렬, 영구 삭제, 실제 OS Back, 전체 사용자 대화는 이번에 전수 재실행·재열람하지 않았다.

## 화면 크기별 평가

| 크기 | 확인 화면 | 평가 |
|---|---|---|
| 390×844 | 양쪽 오늘·빈 작성, React 이동/속성/상세, 원본 비교 | 문서 가로 넘침0. 작성 틀·상단 정보가 실제 입력과 첫 행을 밀어냄. 모바일 Undo는 설정 안에 있음 |
| 375×812 | 양쪽 오늘·빈 작성, React 이동 | 문서 가로 넘침0. 같은 위계·발견성 차이가 좁은 폭에서도 남음 |
| 844×390 | 양쪽 오늘·빈 작성, React 이동 | 문서 가로 넘침0. 원문·helper·목적지 내부 스크롤 필요. 제품 모든 핵심 행동이 항상 보인다고 판정하지 않음 |
| 1024×768 | 양쪽 오늘·빈 작성, React 이동 | 문서 가로 넘침0. 두 pane의 존재와 원본 UX 충족을 구별 |
| 1440×900 | 양쪽 오늘·빈 작성, React 이동 | 문서 가로 넘침0. 빈 원문의 오류/저장 CTA·기술 정보 위계, 로컬 cobalt/teal 차이 확인 |

59개 캡처 파일과 모든 측정은 원시 로그에 연결돼 있다. 원본 D1은 실제 구현 화면이 아니라 당시 UX 제안 HTML이다. 원본 D2는 저장을 금지한 별도 context에서 화면을 확인했으므로 인위적 저장 금지 안내를 원본 제품 결함으로 판정하지 않았다. 모든 캡처를 픽셀별 전수 시각 검토하거나 화면 비교를 관찰 사용자 검증으로 표현하지 않는다.

## 저장 경계와 파일 불변

| context | 샘플 운영 key | PoC storage 호출 | 허용 밖 호출 | 운영 값 전후 | console/page error |
|---|---:|---:|---:|---|---:|
| react-seven-journeys | 7 | 50 | 0 | 동일 | 0 |
| react-authoring | 0 | 49 | 0 | 추가 없음 | 0 |
| standalone-seven-journeys | 0 | 15 | 0 | 추가 없음 | 0 |
| react-draft-failure | 0 | 23 | 0 | 추가 없음 | 0 |
| standalone-source-checked | 0 | 7 | 0 | 추가 없음 | 0 |
| react-property-capture | 0 | 12 | 0 | 추가 없음 | 0 |

감시한 storage 호출156건은 모두 PoC prefix 안이다. `clear` 0, prefix 밖 `setItem/removeItem`0. 최초 context의 운영 샘플7개는 값을 파싱 후 재직렬화하지 않고 raw string으로 비교했다. 이는 실제 사용자 브라우저나 운영 서버 데이터를 전수 검사했다는 뜻이 아니다. fixture 주입은 context 초기 storageState이며 제품 행동의 쓰기와 구분한다. 오류 주입으로 차단된 시도는 실패 진단에 따로 남아 있다.

제품 app/components/lib/styles/public·설정·standalone·기존 trace·지정 원본 자료551개의 시작/종료 SHA-256을 비교해 변경0을 확인했다. 보호 목록 전체는 시작 기록 (로컬 전용 근거: `../../../output/p3k/protected-before.json`), 결과는 종료 기록 (로컬 전용 근거: `../../../output/p3k/protected-after.json`)에 있다. 지정 목록 밖의 모든 원본 파일까지 hash 검증했다고 주장하지 않는다.

## 보고서·문서 검사

보고서 캡처8개는 원본·제품 캡처59개와 별도다. 대표 390/1440 첫 화면, J3 비교와 모바일 원장 화면을 실제 이미지로 검토했다. 첫 캡처가 속성의 상위 문맥 메뉴를 보여 주어, 속성 목록의 안정 상태를 새 격리 context에서 다시 캡처했다. 이 확인에서 16개 속성의 DOM 목록을 기록했으며 추가 독립 시나리오로 세지 않았다. 재캡처 준비 중 잘못된 화면 단계에서 버튼을 기다린 자동화 timeout1회가 있었고 세션을 복구했다. 제품 page error로 세지 않는다.

- 보고서 자동 검사 30/30 PASS: 원장 ID·역사 판정, 필터/검색/페이지 이동/키보드/펼침, 링크311개·근거 파일95개·표시 이미지13개, 다섯 화면 크기. report-qa.json (로컬 전용 근거: `../../../output/p3k/report-qa.json`). 최초 26/27에서 정확 ID 검색이 교차 참조도 포함해 해당 검사를 실패했고, 정확 ID 우선 검색을 구현한 뒤 검사3개를 더해 30/30으로 재실행했다. 제품 테스트 수에 합산하지 않는다.
- `npm.cmd run docs:check`: PASS, 필수 파일16개·로컬 링크4,759개. 첫 실행은 아직 생성 전인 report-qa.json 링크1개로 실패했고 증거 생성 후 재실행했다.
- `npm.cmd run workflow:closeout -- --scope=docs/specs/2026-09-05-flowme-integrated-poc-ux-audit-v1,docs/content-audit/2026-09-05-flowme-integrated-poc-ux-audit`: PASS. 이 명령은 검사 추천기이며 제품 시험을 대신하지 않는다.
- repo→Claude 스킬 동기화 검사: PASS. repo→사용자 Codex 스킬 검사: FAIL, 설치본 차이 유지. 전역 덮어쓰기·설치 없음.

## 공개 상태와 관찰 증거

| 항목 | 상태 |
|---|---|
| 실제 Android Chrome | NOT_RUN |
| 실제 iOS Safari | NOT_RUN |
| TalkBack·VoiceOver | NOT_RUN |
| commit | 안 함 |
| push | 안 함 |
| PR | 안 함 |
| Preview | 안 함 |
| Production | 안 함 |
| 관찰 사용자 | 0명 |

실제 기기·보조기술·사용자 검사는 이번 감사 및 다음 로컬 구현의 완료를 막는 대기 조건으로 두지 않는다. 실행하지 않은 증거를 채웠다고 표현하지 않는다.
