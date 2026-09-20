# 기록이 있는 실제 Map의 반복 연결

2026-09-13 · P02/P03/P08·S09/S10의 기존 요구 보완. 전체 목표와 운영 저장 경계는 바꾸지 않는다.

## 입력과 발견한 차이

깨끗한 실제 Map의 연결 전 상태에는 일반 실행 항목이 아니라 읽기 전용 안내 행만 있다. 그 상태에서 일반 기록을 새로 작성한 것처럼 주장하지 않는다. 기존 실제 factory 준비 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-structured-map-fixture.ts`)의 Map2개/Flow3개/보호5키를 그대로 사용하고, 추가 준비 스크립트 (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-structured-map-records-fixture.ts`)로 과거 개인 기록이 있는 상태를 명시 시뮬레이션했다. 개인 날짜2026-10-05·메모·하위 확인, 9/11의15%와9/12의35%, 하위20%, 다른 개인 문서 참조가 있다. 원본 Map/Step/규칙/출처/판본 bytes는 그대로다. 이는 실제 사용자의 과거 데이터나 원본 TXT 변환이 아니다.

ME11의 첫 준비 오류는 하위 항목 조회/소유 sidecar 누락이었으며 제품 결함으로 세지 않는다. 유효한 전체 Program 상태로 고친 뒤 `series-metadata/structure-review-required`가 검토 진입을 차단하는 실제 모델 결함을 확인했다. aak 수정 전 브라우저3확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-records-before-aak-2026-09-13T07-02-16-278Z.json`)도 동일한 준비 상태에서 검토 버튼 비활성·변경0호출·보호5키 동일을 재현했다.

## 설계·개발 경계

- 정확한 savedCopy/Flow/Item과 canonical 개인 행·소속이 일치하고, 검증된 structured 원본 또는 기존 명시 연결 receipt가 있을 때에만 원본 검토에서 개인 기록을 읽는다.
- 개인 기록을 원본 metadata로 역투영하지 않는다. 일반 실행 진입은 여전히 닫혀 있으며, 명시 반복 연결이 기존 보관/하위 항목/진행/참조 보존 transaction을 사용한다.
- 활성 반복 metadata를 개인 체크로 바꾸기, 다른 인물/소속/없는 근거/오래된 token은 거절한다. 원문 품질 보류·운영 key/schema/writer를 변경하지 않는다.
- 원본 Undo는 이전 개인 기록을 원래 문서에 복귀시키고 이미 완료한 반복 회차는 별도로 보존한다. 새 회차에 일반 진행을 복사하지 않는다.
- 새 카드·추가 단계·영구 정책은 만들지 않는다. 기존 비교/보존 기록/취소/오류 화면을 사용한다. 브라우저에서 기록을 실제로 다시 찾을 수 있는지도 검사한다.

`flow-ux-review`의 실행 명확성·접근성 관점에서 검토 진입이 막힌 상태는 높은 우선순위다. 원본/개인 기록 구분과 안전 경고는 유지하며, 긴 원문·기술 정보의 전체 스크롤 부담은 이 수정으로 해결했다고 보지 않는다.

## 검증 진행

ME01~ME12의12검사와 기존 일반↔반복 KE01~KE07의 관련 검사를 확인했다. ME11은 같은 원본의 일반 기록→반복 실행→완료→원본Undo·JSON복구, ME12는 검토 전용/활성 metadata/근거 부재/다른 인물·소속/stale 차단이다. 추가 전체·빌드·브라우저 근거는 [현재 판정](current-validation.md)에 실행판별로 연결한다. 이 문서 작성이나 모델 통과만으로 실제 브라우저/전체10상황·두 개선 루프를 완료 처리하지 않는다.

## 같은 자료의 실제 연결·복구 — 2026-09-13 07:34 UTC

실행판은 `dFRPoLkYQTHkBEr_PlInA`다. 아래는 같은 역사 기록 fixture를 초기화하지 않고 실제 UI로 이어 수행한 별도 기록이다. 확인점 수는 요구 충족률이나 전체 개선 루프 수가 아니다.

| 단계 | 실제 확인과 결과 | 근거 |
| --- | --- | --- |
| 최초 연결 | 기록 비교, 6크기, Escape/취소 0호출, quota의 성공 변경0, 재시도1거래. 모든 과거 행/ID·메모·날짜·15/35/20%·참조를 보관 문서로 보존, 원래 문서의 문서 작업에서 찾기, reload | 19확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-records-activation-navigation-dfr-2026-09-13T07-11-03-837Z.json`) |
| 첫 원본 Undo | 완료한 실제10/1 회차와 일반 기록을 분리 보존. 원래 문서의 모든 행/ID·참조 복구까지13확인 뒤, 너무 이른 화면 snapshot의 진행 표시 assertion 실패 | 원래 실패 기록 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-records-source-undo-resume-dfr-2026-09-13T07-14-45-008Z.json`) |
| 실패 상태 재개 | 이미 Undo된 같은 자료에서 35/20% 표시와 실제 진행 창 열기/Escape, 6크기의 부모 버튼·내부 스크롤 뒤 하위 버튼 접근, 참조 왕복·reload | 22확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-records-restored-navigation-dfr-2026-09-13T07-29-23-546Z.json`) |
| 같은 원본 재적용 | 첫 연결 단축 버튼이 아니라 남아 있는 실제 원본 비교의 선택 적용 사용. 한 거래, 옛 일반 기록/참조·완료 회차·다른 인물/원본 보존, 실제8회차 중 첫 회차 완료 유지 | 8확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-records-reapply-dfr-2026-09-13T07-32-20-957Z.json`) |
| 두 번째 원본 Undo | 실제 같은 완료 회차에서 재개→참조35%→원본 비교/취소→키보드 Undo→원래 행/진행/날짜/메모 복원→reload. 원래12초 제한 안에서 두 진행 버튼을 직접 기다림 | 15확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-records-source-undo-resumed-navigation-dfr-2026-09-13T07-34-10-797Z.json`) |

모든 성공 기록에서 보호5키 byte-for-byte 동일·허용 prefix 밖 쓰기0·page/console 오류0과 실제 BUILD_ID/route chunk를 확인했다. 작성 위치를 스크롤한 뒤 문서를 바꾸면 기존 `openDocument`가 위치만 저장한다. 취소0호출과 이를 혼동하지 않는다. 22확인은 위치 외 **전체 data와 Undo 불변**을 검사했고 새로고침은 마지막 성공 wire 전체가 동일했다. 두 번째 원본 Undo의 표시 준비는 실제545ms, 참조에서 원래 문서 복귀는 별도22확인에서382ms였다. 누적 앱 전체의3~4초 응답 해결로 확대하지 않는다.

기록·현재 코드 대조12 (로컬 전용 근거: `../../../output/integrated-product-poc/map-records-crosscheck-2026-09-13T07-37-06-289Z.json`)는 처음 일반 문서와 두 차례 Undo 뒤 문서 전체, 진행·참조·완료 회차·다른 인물·genuine model을 비교했다. 현재 제품 파일 집합과 bytes가 dFR 빌드 및 신규1177검사의 소스와 같음도 확인했다. 이는 새 브라우저 실행이나 추가1177검사 실행이 아니다.

### 검사 오류와 제품 결함의 구분

- 실제 수정은 `legacy-reconcile.ts`/`legacy-transaction.ts`의 **과거 기록이 있는 Map의 원본 검토 진입 차단**과 그 ME11/ME12 회귀다. 일반 실행/외부 tuple/보류 guard는 유지한다.
- `ProgramTextEditor` 또는 원래 vendor는 이번 재검증에서 변경하지 않았다. 최초 snapshot 실패를 영구적인 진행 표시 결함으로 확정하지 않는다. 원래12초 제한을 늘리지 않고 실제 대상의 렌더·접근을 검사했다.
- 속성 순서 비교 실패 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-records-activation-dfr-2026-09-13T07-06-44-839Z.json`), 일반 보관함 locator 실패 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-records-activation-final-dfr-2026-09-13T07-09-23-725Z.json`), resize 중 detached (로컬 전용 근거: `../../../output/playwright/integrated-program/map-records-restored-dfr-2026-09-13T07-25-34-419Z.json`), 내부 스크롤 밖 하위 버튼 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-records-restored-dfr-render-2026-09-13T07-25-56-999Z.json`), 작성 위치 저장을 내용 변경으로 간주 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-records-restored-scroll-dfr-2026-09-13T07-27-29-908Z.json`)한 실패를 보존했다. JSON 필드 순서는 정렬하되 모든 값/배열 순서를 비교하며 보호 storage raw 비교는 그대로다.
- 재연결에서 최초 연결 버튼을 찾음 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-records-reconnect-dfr-2026-09-13T07-30-17-615Z.json`), 열린 비교를 다시 접음 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-records-source-undo-final-dfr-2026-09-13T07-32-35-227Z.json`), 다른 화면에서 시작한 재개 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-records-source-undo-expanded-dfr-2026-09-13T07-33-36-405Z.json`)도 제품 유실이 아니었다. 현재 화면/펼침 상태를 읽고 이미 저장된 같은 자료로 재개했다. 실패 파일을 지우거나 PASS로 고치지 않았다.

### 화면 평가와 남은 범위

375×812·390×844·844×390·1024×768·1194×834·1440×900에서 이 경로의44px 부모 버튼·내부 스크롤 후 하위 버튼·포커스·hit-test·가로 넘침을 확인했다. 실제 Enter/Escape와 참조 왕복도 실행했다. 실제 Android/iOS 터치·OS 입력기·보조기술 검증은 아니다.

1024px 복원 결과 (로컬 전용 근거: `../../../output/playwright/integrated-program-structured-map/map-records-restored-overview-1024-1789284963530.png`), 375px (로컬 전용 근거: `../../../output/playwright/integrated-program-structured-map/map-records-restored-overview-375-1789284963387.png`), 기존 기록 보관 문서 (로컬 전용 근거: `../../../output/playwright/integrated-program-structured-map/map-records-retained-1024-1789283471515.png`)를 직접 확인했다. 복원 캡처는 문서 제목까지 스크롤한 결과이며 앱 상단이 항상 보인다는 증거가 아니다. 별도 캡처3확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-records-capture-dfr-2026-09-13T07-36-01-742Z.json`)은 저장0호출이다.

이 경로의 실행 명확성·접근성은2→4로 평가한다. 원본 검토에 진입하고 기록을 다시 찾을 수 있다. 인지 부담은2로 남긴다. 모바일에서 제목/날짜의 긴 줄바꿈과 이중 스크롤, 상단의 전역 미연결 안내, 원본 비교의 긴 JSON·기술 필드, 정상 기록 보존을 `복구 중`이라고 부르는 표현은 개선 대상이다. 원문/출처/주의·개인 이력을 삭제해 해결하지 않는다. 새 카드나 설명을 추가하지 않았으며 Figma는 사용하지 않았다.

원본 Undo 이후 추가 개인 진행 저장까지 이22/15확인이 증명하는 것은 아니다. 공통/하위 기준일·포함/제외·새 원본·외부 출력과 개인 반복 계획을 함께 사용한 실제 Map 상황, 기존 제작의 모든 조작, 전체10상황·두 전체 개선 루프는 계속 남는다. 새 실행·백업·재공개 정책·실기기/외부계정/관찰사용자0·Git 발행/배포와 보고서 렌더 차단 경계를 유지한다.
