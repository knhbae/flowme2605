# P24-00A 실행 라이프사이클 감사

## 전체 판정

`부분 통과, 외부 관찰 전 수정 필요`다. 핵심 루프는 끊기지 않았지만 Calendar 날짜 정확성과 반복 실행의 중복 표현은 실행 도구 신뢰에 직접 영향을 준다. 이 두 문제를 둔 채 P24-00B 사용자 관찰을 시작하면 제품 개념보다 명백한 오류에 피드백이 집중된다.

이번 감사는 앱 코드를 수정하지 않았다. `69768a1` detached clean worktree에서 단위 테스트, 전체 Playwright, build, dependency audit를 실행했고, 별도 local server에서 5개 페르소나를 Codex가 직접 조작했다.

## Findings

### Blocking - 한국 시간 오전에 기본 날짜가 전날로 잡힘

- 브라우저 시각: `2026-07-14 07:12 KST`, `Intl` timezone `Asia/Seoul`.
- 개인 draft의 `날짜 지정` 기본값: `2026-07-13`.
- 원인: [`lib/flow/date.ts`](../../../lib/flow/date.ts)의 `formatDate`가 `toISOString().slice(0, 10)`으로 UTC 날짜를 만들고, [`components/flow/AppClient.tsx`](../../../components/flow/AppClient.tsx)의 오늘/Calendar 초기값과 occurrence 기준일이 이를 사용한다.
- 영향: KST 00:00~08:59에 오늘 그룹, 기본 날짜, Calendar 월/선택일이 하루 어긋날 수 있다.
- 권장: local calendar date formatter를 별도로 만들고, UTC serialization과 사용자 local date를 구분한다. KST 자정 경계와 여러 timezone fixture를 추가한다.

### Blocking - 익명 사용자가 preview에 접근할 수 없음

- deployment `dpl_3hhwff4iQFJrubYD7T4ivQjUXjUL`은 `READY`다.
- 익명 HEAD 요청은 `302`로 Vercel SSO에 이동한다.
- 영향: P24-00B 외부 관찰 링크로 사용할 수 없다.
- 권장: 관찰 전용 공개 preview 또는 관찰자 인증 절차를 준비하고, 공개 URL에서 모바일 390px smoke를 다시 실행한다.

### High - 반복 Flow의 동일 할 일이 Today에 두 번 보임

- 월간 세탁조 청소를 저장하면 같은 할 일이 `다음 할 일`과 `다음 항목`에 각각 나타난다.
- 두 표현 모두 완료 checkbox와 `열기`를 가져 서로 다른 행동인지 구분되지 않는다.
- 완료 후 두 영역이 동시에 다음 항목으로 이동한다.
- 영향: series/occurrence/다음 콘텐츠가 다른 개념으로 보이지 않고 중복 실행처럼 읽힌다.
- 권장: Today는 실행 가능한 occurrence 한 행만 유지하고, 다음 콘텐츠 예고는 중복 checkbox 없이 보조 정보로 낮춘다.

### High - 빈 URL miss 초안 제출이 허용됨

- miss draft에서 제목과 원하는 결과가 모두 비어 있어도 `초안 준비하기`가 실행됐다.
- 생성 Flow는 fallback 문장 `바로 시작할 Flow를 찾지 못했어요`를 제목으로 사용했다.
- 이후 Flow 제목을 수정해도 자동 생성 항목에는 fallback 오류 문장이 남았다.
- 영향: 오류/상태 문구가 사용자 실행 항목으로 영구 저장되고 Calendar/export까지 전파될 수 있다.
- 권장: 제목 또는 사용자 요청 중 최소 하나를 필수로 검증하고, Flow 제목 변경 시 자동 생성 항목의 provenance와 동기화 정책을 명확히 한다.

### High - 깨끗한 추적 기준선에 high dependency 4건

- `npm ci` 후 `npm audit --json`: critical 0, high 4, moderate 3.
- direct high는 Next 15.3.8과 Playwright 1.52.0 경로다.
- main의 dirty package files에는 별도 업그레이드가 있으므로 현재 추적 기준선 해결로 간주할 수 없다.
- 권장: dependency-only branch에서 호환 업데이트 후 476 unit, 259 E2E, build를 다시 통과시킨다. `npm audit fix --force`는 사용하지 않는다.

### Medium - 완료와 수정 기능은 있으나 일부入口가 깊음

- 이사일 재수정: My Flow → 전체 → 기준일 수정, 약 3 actions.
- 날짜 없는 source-backed 항목 날짜 지정: 열기 → 메모·일정 → 수정, 약 3 actions.
- 완료 취소: 전체 → Flow 펼치기 → 완료 항목 열기 → checkbox, 약 4 actions.
- 기능은 지원되지만 처음 사용하는 사람에게는 숨겨진 상태다.

### Medium - source-backed 상세에서 완료 checkbox가 중복됨

- Today 행의 왼쪽 checkbox가 있는 상태에서 상세를 열면 상세 헤더에 같은 accessible label의 checkbox가 다시 나타난다.
- 완료 action이 두 위치에 동시에 있어 P19의 1종 패턴 의도와 어긋난다.

## 페르소나별 결과

### 1. 기준일 역산형 이사 준비

`/flow-maps/moving-d30`에서 `이사일` 의미가 명확했고, `2026-08-15` 저장 후 D-30 항목과 Calendar가 계산됐다. My Flow 전체 보기에서 `이사일 바꾸기`와 “따로 바꾼 날짜 유지” 정책도 확인했다. 390/1024 Calendar overflow는 없었다.

판정: 기능은 `supported`, 기준일 재수정 발견성은 `hidden`.

### 2. 날짜 없는 체크리스트

`/f/vehicle-inspection-prep`의 저장 전 checkbox는 `저장 전 미리보기 선택`으로 읽혔고, 저장 후 My Flow에서는 실제 완료 checkbox로 전환됐다. `/f/travel-packing-list` 항목에 날짜를 추가하자 Calendar marker와 agenda에 같은 항목이 나타났다.

판정: 저장 전후 경계는 `supported`, 날짜 추가入口는 `hidden`, 날짜 제거는 이번 수동 시뮬레이션에서는 `partial`.

### 3. 반복 루틴

`/f/washer-tub-clean-monthly`에서 시작일, 월간 회차, 완료 후 다음 회차, 완료 취소를 확인했다. 그러나 Today가 같은 할 일을 두 번 표현했다.

판정: 상태 전이는 `supported`, 현재 화면 표현은 `partial`.

### 4. URL miss 개인 초안

miss copy는 live AI를 과장하지 않았다. My Flow 착지 후 항목 추가, 이동, 삭제, 제목/날짜/메모, 09:30·45분·매주 설정과 Calendar recurrence를 확인했다. 반면 필수 입력 검증과 local date 정확성 오류가 발견됐다.

판정: 기능 범위는 `supported`, 안전한 첫 사용은 `partial`.

### 5. 공개 Flow 완료, 회고, 수정 메모, 재사용

완료 Flow fixture에서 개인 회고와 원본 수정 메모가 서로 다른 localStorage record로 저장됐다. 수정 메모에는 “아직 누구에게도 전송되지 않아요”가 표시됐다. `이 Flow 다시 쓰기`로 새 이사일을 입력하자 이전 24/24 완료 snapshot과 feedback을 run registry에 보존하고 새 active run을 생성했다.

판정: `supported`. 단, 완료 상태는 fixture로 준비했으므로 실제 24개 완주 관찰로 표현하지 않는다.

## 자동 검증

- `npm.cmd test`: 476 passed, 0 failed.
- `npx playwright test`: 259 passed, 0 failed, 8.9m.
- `npm.cmd run build`: pass.
- 브라우저 390px/1024px: 확인한 시나리오의 horizontal overflow 0, console error 0.
- screenshot: 24.

자동 회귀가 모두 통과해도 위 세 가지 사용자 여정 오류를 잡지 못했다. 따라서 P24부터는 assertion 통과와 여정 품질 판정을 별도 결과로 유지해야 한다.

## 데이터와 운영 위험

1. localStorage 중심이라 계정·다른 기기 복원은 없다.
2. source v2와 personal tombstone/order/alias의 three-way merge review는 아직 없다.
3. 오래된 `codex/flow-20-content-ux` branch는 main에 자동 merge하면 안 된다. 18개 고유 commit을 audit해 archive 또는 selective cherry-pick한다.
4. main dirty worktree의 docs, skills, CI, package 변경은 이번 감사 commit에 포함하지 않는다.
5. actual observed user session은 0이다.

## 권장 순서

1. `P24-00A-FIX1`: local date correctness와 timezone boundary.
2. `P24-00A-FIX2`: 반복 Today 중복 및 source-backed detail 완료 checkbox 중복.
3. `P24-00A-FIX3`: miss draft 필수 입력과 fallback title propagation.
4. `P24-00A-OPS`: 공개 관찰 preview, dependency upgrade, dirty/branch cleanup.
5. 독립 Claude Code 회귀 감사.
6. `P24-00B`: 실제 사용자 5명 이상, 1인 3회 관찰.
7. `P24-00C`: 관찰 근거로 P24-01 source merge와 UX 개선 우선순위 재정렬.

## 실제 사용자에게 확인할 질문

1. 이사일을 나중에 다시 바꿀 수 있다는 것을 설명 없이 찾는가?
2. 날짜 없는 체크리스트에 날짜를 붙이는 경로를 예상할 수 있는가?
3. 반복 Flow에서 “이번 회차 완료”와 “다음 항목”을 구분하는가?
4. URL miss 초안이 자동 생성인지 직접 다듬는 초안인지 정확히 이해하는가?
5. 완료 후 회고, 원본 수정 메모, 다시 쓰기 중 어떤 행동을 먼저 기대하는가?
6. Calendar/ICS/checklist/sheet/memo 중 실제로 가져가는 destination은 무엇인가?
