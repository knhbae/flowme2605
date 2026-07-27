# FlowMe MECE UX Reset 시뮬레이션 결과

- 작성일: 2026-07-26
- 범위: `UXR-06`, `UXR-07`
- 대상: [interactive wireflow](../p35-program-review/review.html)
- 구조화 결과: [journey-scorecard.json](../p35-program-review/journey-scorecard.json)
- 실제 관찰 사용자 수: 0명
- 앱 코드 변경: 없음

## 1. 판정

`UXR-00`~`UXR-07`은 구현 전 내부 설계 gate로서 완료했다.

다섯 콘텐츠가 같은 여덟 단계 문법을 사용할 수 있다.

```text
찾기
→ 저장 전 전체 결과
→ 한 종류씩 조정
→ 저장 결과
→ My Flow 목록
→ 개인 Flow 실행
→ Calendar 날짜 확인
→ 가져가기
```

제안 구조의 핵심은 기능 삭제보다 소유권 단일화다.

- My Flow: 저장한 Flow를 찾고 관리
- 개인 Flow: 실행, 완료, 다시 열기, 수정, 메모, 가져가기
- Calendar: 날짜가 있는 여러 Flow를 보고 개인 Flow 열기

이 판정은 interactive prototype과 heuristic simulation 결과다. production 구현 완료 또는 실제 사용자 검증을 의미하지 않는다.

## 2. 시뮬레이션 범위

다음 다섯 사례를 각각 3개 session으로 검토했다.

| 사례 | Session A | Session B | Session C |
| --- | --- | --- | --- |
| 이사 D-30 | 24개 일정·이사일·저장 | 완료·다시 열기·Calendar | 범위 export·재사용 |
| 차량 점검 | 날짜 없는 10개 저장 | 개인 Flow 실행·필요한 날짜 추가 | Checklist export |
| 반복 홈트 | series summary·8회 저장 | occurrence 완료·다시 열기 | Calendar·ICS 역할 |
| 장기 학습 | 8개 단원 순서·저장 | 다음 단원·전체 진도 | Sheet export·재진입 |
| 개인 메모 | 메모를 5개 Item으로 확인 | 포함·이름·순서 조정 | Checklist export·재진입 |

총 15개 journey cell의 current production은 모두 `partial`이었다. 기능이 없어서가 아니라 한 기능이 여러 surface에 분산되거나 한 surface가 여러 목적을 동시에 소유하기 때문이다.

제안 wireflow의 15개 cell은 설계상 `pass`다. 이는 화면 메시지, 주 행동, 소유권과 다음 상태가 충돌하지 않는다는 뜻이며 production 지원 상태가 아니다.

## 3. 복잡도 변화

| 측정 항목 | 현재 production | 제안 |
| --- | ---: | ---: |
| 전역 주 탐색 | Home, Flow 찾기, Calendar, My Flow 4개 | Flow 찾기, Calendar, My Flow 3개 |
| 발견을 소유하는 surface | Home + Flow 찾기 2개 | Flow 찾기 1개 |
| My Flow 상위 mode | 지금, Flow 목록, 완료 3개 | 저장 Flow library 1개 |
| Item 실행 주 소유 surface | My Flow workspace + Calendar | 개인 Flow 1개 |
| Calendar agenda의 행별 명령 | 완료, 열기, 메모, 날짜 이동 | 개인 Flow 열기 |
| 저장 전 주요 결정군 | 결과 형태, 날짜 방식, 조정, 전체 구조, 가져가기 | 최소값, 조정 또는 시작 |
| 개인 Flow 목록 행의 기본 명령 | 여러 실행·편집 명령 | 열기 |
| 한 화면 primary action | 단계에 따라 복수 | 최대 1개 |

My Flow의 완료·보관 상태는 별도 제품 영역이 아니라 같은 library의 필터로 둔다. 개인 Flow 안의 완료·다시 열기와 혼동하지 않는다.

## 4. 브라우저 QA

### 정적 상태

다섯 사례 × 여덟 단계 × 두 viewport, 총 80개 상태를 확인했다.

| 항목 | 390×844 | 1024×768 wireframe |
| --- | --- | --- |
| 가로 overflow | 없음 | 없음 |
| 한 화면 primary action 2개 이상 | 없음 | 없음 |
| 이름 없는 button | 없음 | 없음 |
| 사례별 stage 렌더 실패 | 없음 | 없음 |
| JavaScript console error | 없음 | 없음 |

1024px wireframe은 1920px review board 안에서 실제 device width 1024px로 확인했다. review board 자체도 viewport 폭을 넘지 않았다.

### 동작 상태

| 동작 | 확인 결과 |
| --- | --- |
| 이사일 변경 | `2026-09-01` 입력 시 첫 D-30 날짜가 `8월 2일`로 재계산 |
| 포함 제외 | 24개 중 1개 제외 시 receipt가 23개로 변경 |
| 개인 이름 | `9월 이사 핵심`이 receipt와 개인 Flow에 유지 |
| 완료 | Item sheet의 `완료`가 실행되고 진행 count가 변경 |
| 다시 열기 | 같은 Item을 열면 `다시 열기`가 보이고 실행 후 미완료로 복구 |
| Item 날짜 | 개인 날짜 `2026-08-08`이 Calendar event로 반영 |
| Item 메모 | `오전 중 확인`이 sheet 재진입 후 유지 |
| Calendar 선택 | 8월 14일과 21일 선택 시 agenda 날짜와 count가 함께 변경 |
| 날짜 없음 | 차량 점검은 Calendar에서 실행 tray 대신 개인 Flow 이동을 안내 |
| export scope | selected 선택 시 CTA와 receipt가 3개로 일치 |
| dialog keyboard | Item sheet는 `Esc`로 닫히고 열었던 Item으로 focus 복귀 |
| dialog focus loop | 첫·마지막 control 사이에서 Tab focus가 sheet 밖으로 이탈하지 않음 |

## 5. 반복 수정 기록

브라우저 검토 중 다음 결함을 발견해 wireflow만 수정했다.

1. Calendar가 8월을 보여주면서 agenda는 7월 25일이던 불일치를 제거했다.
2. Calendar 날짜 선택을 실제 agenda 전환과 연결했다.
3. 390px 상단 사례 control이 세로로 깨지던 줄바꿈을 정리했다.
4. export 범위 button에 범위와 count를 포함한 accessible name을 추가했다.
5. 동작하지 않던 `다른 형식 보기` 명령을 제거했다.
6. Item 날짜·메모를 개인 값으로 유지하고 Calendar에 반영했다.
7. Item sheet의 `Esc`, focus trap, 닫기·완료 후 focus 복귀를 추가했다.

앱 runtime과 저장 스키마는 변경하지 않았다.

## 6. 보존한 계약

- source와 개인 수정은 분리한다.
- 완료는 execution run에 남는다.
- 반복 series와 occurrence는 분리한다.
- export는 whole, selected, current identity를 유지한다.
- source-backed Item 제외는 source 삭제가 아니다.
- 24개 전체판과 기존 5개 간단판은 자동 병합하지 않는다.
- archive, restore, 영구 삭제의 복구 경계는 유지한다.

## 7. Wireflow 한계

- 상태는 브라우저 메모리 안에서만 유지되며 reload persistence를 구현하지 않았다.
- Calendar 월 이동, 검색, lifecycle menu는 구조만 표시하거나 비범위로 뒀다.
- 모든 source-backed Flow의 콘텐츠를 다시 감사하지 않았다.
- 외부 도구 파일을 실제 생성하지 않고 범위와 결과 count만 시뮬레이션했다.
- 자동화와 agent simulation은 실제 사용자 관찰이 아니다.

이 한계는 앱 구현 전에 해결할 기능 누락이 아니라 이번 설계 prototype의 경계다. 실제 구현에서는 현재 저장 계약과 기존 테스트를 재사용한다.

## 8. 승인 결과

2026-07-26 사용자 승인으로 `A_prime`을 채택했다.

1. 별도 Home을 제거하고 `/`를 저장 상태 기반 entry router로 사용한다.
2. My Flow에서 `지금` 실행 mode를 제거하고 저장 Flow library로 한정한다.
3. Calendar는 날짜 lens로 한정하되 동일 run 상태의 `완료 / 다시 열기` primitive 하나만 남긴다.

구현 순서와 rollback은 [A안 개발 handoff](./developer-handoff-a-prime-ko.md)를 따른다.

이 승인 결과만으로 앱 코드를 한꺼번에 수정하지 않는다. P35 handoff의 한 slice씩 구현하고 검증한다.
