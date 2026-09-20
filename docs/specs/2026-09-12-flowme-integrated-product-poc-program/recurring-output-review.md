# 반복 표시·실제 파일·정확한 복귀 대조

2026-09-14 · 실행판 `D8biwP0un2wUDFYJCX81A`. 공개 상세에서 사라지던 반복 규칙과 시간대를 보완하고, 보존된 C3 사본에서 실제 파일 6개와 복귀 경로를 확인했다. [실행 설계](recurring-output-design.md)의 출력 범위만 다룬다. 실제 반복 공개·원본 변경 수용·제안과 전체 목표는 미완료다.

## 원래 요구와 현재 충족 범위

| 요구·원래 산출물 | 발견한 손실 | 이번 구현·판정 |
| --- | --- | --- |
| 개발2의 반복 원문을 개발1 공개 상세에서 그대로 이해 | 규칙이 있는 항목을 ‘날짜 미정’으로 표시 | 요일·종료 조건·원래 시작·시간·시간대를 표시. 두 실제 화면 항목에서 확인 |
| 사본 없이 필요한 내용을 내 도구로 출력 | TXT/CSV에서 반복 의미가 빠지고 ICS에서 제외 | TXT/CSV는 시작 미정이어도 규칙을 보존. ICS는 명시한 범위의 실제 회차를 한 반복 묶음으로 전달 |
| 선택과 개인화는 원본을 바꾸지 않음 | 반복 시작·범위 입력 경로가 없음 | 미정 시작, 유한 회차 범위, 끝없는 반복의 주 범위. 잘못된 입력은 유지하고 출력만 차단. 떠났다가 돌아와도 입력 유지 |
| v4.1 개인 실행 → 개발1 외부 출력 | 시간이 있어도 개인 ICS가 종일 일정으로 바뀜 | 선택한 회차의 실제 시간·시간대, 수용한 일정 판본·출처·완료 기준을 보존. TXT/CSV/ICS 실제 파일 확인 |
| 출력한 정확한 항목으로 재진입 | 모델 근거만 있고 이 반복 사본의 실제 파일 왕복은 미검증 | TXT 파일의 링크 → 같은 사본·판본·첫 회차 → 원래 문서. 자동 내용 수용 없이 기존 데이터 동일 |
| 반복의 변경 비교·제안·실제 공개 | 일반 할 일 중심의 비교·writer와 반복 공개 제한 | 이번에 완료하지 않음. 다음 D 원본 비교/수용·제안, E 실제 공개부터의 연속 검증 |

원래 반복은 한 typed Item이다. ICS의 DTSTART/RDATE는 선택된 회차의 출력 표현이며 원본 반복 정의나 새 운영 schema가 아니다. 명시 첫 시작과 요일이 다른 경우도 기존 계산기의 첫 회차를 보존한다. 끝없는 반복 전체를 출력했다고 하지 않는다. 범위가 겹치는 파일을 모두 가져오면 캘린더에 중복이 생길 수 있음을 화면에 알린다. 실제 외부 캘린더 import는 미실행이다.

## 같은 자료로 실행한 브라우저 시나리오

C3의 revision 10, 공개 계약 fixture 1개, 개인 사본 1개, 참조 3개와 열린 회차 기록 1개를 초기화하지 않고 사용했다. fixture는 실제 사용자 공개나 외부 콘텐츠 검증이 아니다.

| 실행 근거 | 확인한 동작 | 판정 |
| --- | --- | --- |
| 첫 실행 2확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-output-d-2026-09-13T20-34-03-318Z.json`) | 기존 자료·새 규칙 표시 | 파일 형식의 라벨을 좁게 찾은 검사 선택자 오류로 중단. 파일/쓰기 0 |
| 재개 32확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-output-d-retry-2026-09-13T20-41-33-867Z.json`) | 미정 시작의 ICS 차단·사본 진입 유지, 0회차 거절·입력 복귀, 키보드 증감, 5크기, 실제 파일 6개, 정확한 복귀 링크 | 해당 행동 통과. 복귀 화면에서 같은 이름의 버튼 2개를 구분하지 못한 검사 오류로 마지막 단언 중단 |
| 같은 복귀 6확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-output-d-finish-2026-09-13T20-43-50-496Z.json`) | 정확한 복귀 영역의 첫 회차·날짜·시간, 원래 문서 재진입, 공개 상세 복귀 | 완료. 앞선 중단을 삭제하거나 처음부터 통과한 기록으로 바꾸지 않음 |

세 기록은 모두 같은 빌드·console/page error 0·허용 prefix 밖 쓰기 0이다. Program 저장 bytes와 revision 10은 그대로다. 이 프로필의 운영 보호키는 **0개**이므로 채워진 운영 데이터 불변을 입증했다고 확대하지 않는다. 확인점 2/32/6을 고유 요구 개수나 전체 개선 루프로 합산하지 않는다.

실제 다운로드 파일:

| 범위 | TXT | CSV | ICS | 확인 |
| --- | --- | --- | --- | --- |
| 공개 원본, 두 반복 각각 2회차 | 893 bytes | 1,122 bytes | 2,181 bytes | 원래 8회 규칙·07:00 Asia/Seoul·실제 선택 2회. ICS의 2개 VEVENT와 4개 발생일 |
| 개인 사본의 첫 회차 1개 | 1,995 bytes | 2,491 bytes | 3,158 bytes | 수용한 일정 판본 1·출처·시간·정확한 개인 복귀 링크. ICS 시작은 2026-11-30T22:00Z, 임의 DTEND 없음 |

파일 경로·본문·SHA256은 32확인 기록의 `downloads`에 보존했다. 실행 시각에 따라 파일의 생성 시각이 달라질 수 있으므로 이 bytes를 영구 제품 값으로 쓰지 않는다.

## 자동 검사

- 최종 전체 재검사 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T20-44-23-051Z.json`): **145파일·1,372실행/1,372통과**, 실패/skip/검사 중 소스 변경 0. 앞선 종료 뒤 제품·테스트 코드를 바꾸지 않고 로컬 서버와 브라우저 작업 부하를 줄여 순차 재실행했다. 아래 실패 기록을 이 성공으로 덮어쓰지 않았다.
- 24개 기록 대조 (로컬 전용 근거: `../../../output/integrated-product-poc/recurring-output-d-crosscheck-2026-09-13T20-51-45-540Z.json`): 최종 검사·build·현재 361소스 hash 동일, 세 브라우저의 실제 실행판 동일, 이전 C3의 전체 저장 자료/revision 10 보존, 실제 파일 6개의 본문·bytes·SHA256 일치. 새 브라우저 실행이나 테스트 개수에 합산하지 않는다.
- 첫 손실 재현 2개는 실패했다. 이후 새 순수 검사 13개·화면 검사 3개를 추가했다. 월말, 명시 첫 시작, COUNT/UNTIL/끝없는 범위, 미정/상대 시작, 손상 입력, DST 중복·없는 시각, 시간대, 기존 일반 출력, 실제 사본 인계·출처·복귀를 검사한다.
- 관련 공개/개인 출력·화면 50/50, 개인 출력 화면 3/3, 후속 시간 기대값의 연결 회귀 16/16 통과. 서로 겹치는 실행 수를 고유 테스트 총수로 더하지 않는다.
- 첫 전체 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T20-18-44-219Z.json`): 145파일·1,372실행/1,368통과/4실패. 기존 종일 출력 기대값 4개를 실제 원문 시간 보존으로 수정했다. 정확한 시간·identity·DTEND 부재를 검사하며 단언을 제거하지 않았다.
- 재검사 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T20-33-27-458Z.json`): 145파일·1,367실행/1,366통과/1실패. `execution-source-reader.test.ts` 프로세스가 Windows exitCode 3221226505로 종료됐다. 같은 시각 보조 PowerShell에서도 메모리 부족이 있었으나 프로세스 종료의 원인을 단정하지 않는다. 해당 파일 단독 재검사는 6/6 통과했다. 최종 전체 재검사는 별도로 기록한다.
- strict (로컬 전용 근거: `../../../output/integrated-product-poc/targeted-types-2026-09-13T20-18-03-831Z.json`): 332개 입력·진단 0. production build (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-13T20-28-44-840Z.json`) 통과·검사 중 소스 변경 0.
- npm test (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-13T20-27-31-465Z.json`): 2,031실행/2,030통과/기존 출처 검토기한 1실패(9개 콘텐츠). 승인 실행 (로컬 전용 근거: `../../../output/integrated-product-poc/approved-tests-2026-09-13T20-28-24-181Z.json`) 201/201, 공개 표면 (로컬 전용 근거: `../../../output/integrated-product-poc/public-tests-2026-09-13T20-28-39-441Z.json`) 19/19. 기존 출처 내용을 수정하지 않았다. 보안 audit는 이번에 재실행하지 않았다.

## 화면 평가와 남은 불편

375×812·390×844·844×390·1024×768·1440×900에서 시작일·회차 수·다운로드의 15측정을 수행했다. 모두 높이 44px 이상, 가로 넘침 0, 중앙 hit-test 통과다. 키보드 위/아래 화살표가 같은 범위 값을 바꾼다. 전체 메뉴·모든 초점 순서·실제 기기 검증으로 확대하지 않는다.

375px (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-output-d-1789332095306-public-375.png`) · 844×390 (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-output-d-1789332095306-public-844.png`) · 1024px (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-output-d-1789332095306-public-1024.png`) · 1440px 원본과 출력 (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-output-d-finish-1789332231988-public-1440.png`) · 개인 출력 (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-output-d-1789332095306-private-1440.png`) · 정확한 복귀 (로컬 전용 근거: `../../../output/playwright/integrated-program/recurring-output-d-finish-1789332231780-return-1024.png`)를 직접 확인했다.

기능은 연결됐지만 긴 설명과 출력 옵션 때문에 스크롤이 많다. 844×390에서는 다운로드를 보려면 위쪽 맥락이 화면 밖으로 나가고, 넓은 화면에서는 긴 오른쪽 출력 칸 옆이 빈다. 개인 출력의 긴 회차 목록·중복 안내와 문서 작업 메뉴가 편집 화면을 가리는 부담도 남는다. 이 증거로 ‘사용성 검증 완료’나 관찰 사용자 선호를 주장하지 않는다. 기존 UI를 재사용하고 필요할 때만 반복 입력을 펼치도록 한 UX 검토 결과다. Figma 작업은 하지 않았다.

## 변경·보호·다음 작업

제품/테스트 15파일: `public-output-recurrence.ts`/검사, `output.ts`, `navigation.ts`, `transient-output.ts`, `private-output.ts`, `private-output-occurrences.ts`/검사, `creator-source-to-private-journey.test.ts`, `program-recurrence-plan-state.test.ts`, `ProgramDiscovery.tsx`/CSS/검사, `ProgramApp.tsx`, `ProgramPrivateOutput.tsx`. 별도 실행 설계·이 원장·현재 판정·요구/진행/종료 원장·캡처 보고서와 브라우저/근거 대조 스크립트를 갱신한다.

보호 파일 4,781개 중 4,779개 동일, 기존 route/PoC 상태 문서의 두 접점 외 예상 밖 변경 0이다. native 원본 26파일·819,423bytes와 v11 vendor integrity를 확인했다. 운영 key가 채워진 `program-store.test.ts`의 경계 검사와 운영 키가 없는 이번 브라우저를 구분한다. `localStorage.clear()`나 기존 운영 writer를 호출하지 않는다.

운영 STATUS 본문 대조 (로컬 전용 근거: `../../../output/integrated-product-poc/status-note-boundary-2026-09-13T20-54-13-047Z.json`)는 현재 PoC 안내만 제외하면 원래 SHA256 `027ff9ad6a1dcafec1ef48bf7138f7eb6eb53f24cf4b72ad6abd857797c106d8`과 동일함을 확인했다. 문서 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/docs-2026-09-13T20-54-13-903Z.json`) 통과, 보고서 정적 검사 (로컬 전용 근거: `../../../output/integrated-product-poc/report-static-2026-09-13T20-54-13-466Z.json`) 179확인/실패 0·이미지 4개다. HTML 실제 렌더는 URL 정책 차단으로 미검증이다. 최종 소스·파일 재대조 24 (로컬 전용 근거: `../../../output/integrated-product-poc/recurring-output-d-crosscheck-2026-09-13T20-54-49-391Z.json`)도 통과했다. 이 대조들을 새 자동 테스트나 브라우저 시나리오로 합산하지 않는다.

다음 순서: 반복 metadata의 원본 필드 비교·선택 수용·하위 확인 → 반복 제안/채택과 복구 근거 → 같은 실제 작성물의 공개부터 개인 실행·출력·수용·Undo/reload. 기존 개인 계획 후 시작 변경, 실제 새 Map 판본의 삭제/다른 반복, 여섯 틀 전체 동등성, 긴 화면·누적 자료, 전체 10상황·두 전체 개선 루프는 남는다.

실제 Android Chrome·iOS Safari·OS IME·보조기술·외부 도구 import는 미실행. 관찰 사용자 0명. commit·push·PR·merge·Preview·Production·외부 게시 미실행. 보고서 HTML 렌더는 기존 URL 정책 차단을 유지하며 우회하지 않는다. 전체 완료 보고가 아니다.
