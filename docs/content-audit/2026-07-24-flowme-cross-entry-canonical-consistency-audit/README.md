# FlowMe 홈·찾기·저장 경로 정합성 감사

작성일: 2026-07-24

Production: <https://flowme2605.vercel.app>

확인한 `origin/main`: `e491d99ca61ecae4fd0dd009f785e737b6a59516`

현재 production release SHA: `30281a7a8ea9bea1194b4104b5a49b6211c07e3b`

판정: `cross_entry_canonical_flow_reopen`

앱 코드 변경: 없음

실제 관찰 사용자: `0`

## 결론

최근 My Flow focused workspace와 Calendar 실행 구조는 실제 production에 반영되어 있다. 그러나 그 전에 있는 `홈 -> 상세 -> 저장`과 `Flow 찾기 -> 상세 -> 저장`이 아직 하나의 Flow 계약으로 합쳐지지 않았다.

가장 명확한 예는 같은 AJD 이사 원문이다.

- 홈: `/f/moving-d30-basic` -> `이사 D-30 준비` -> 24개 -> 별도 저장 receipt
- Flow 찾기: `/flow-maps/moving-d30` -> `원룸 이사 D-30 일정` -> 5개 -> 즉시 My Flow 이동
- URL lookup: `/f/curated-ajd-moving-d30` -> 5개
- 별도 public alias: `/f/source-backed-moving-d30` -> 5개

홈과 찾기 경로를 차례로 저장하면 My Flow에 `이사 준비 24개`와 `원룸 이사 준비 5개`가 서로 다른 Flow로 동시에 남는다. 이는 `Home, Flow finding, save-before, My Flow, Calendar, export에서 one user-facing Flow object를 사용한다`는 현재 제품 결정과 충돌한다.

## 가장 중요한 발견

### High 1. 같은 원문이 여러 사용자 객체와 저장 grammar로 갈라진다

- 같은 AJD 원문에 사용자 route가 최소 4개다.
- 항목 수가 24개와 5개로 다르다.
- `/f`는 공유 shell과 distinct receipt를 사용한다.
- `/flow-maps`는 4탭 app shell 안의 legacy hybrid frame을 사용하고 저장 즉시 My Flow로 이동한다.
- 두 경로를 모두 저장하면 중복 Flow 2개가 생긴다.

### High 2. 결과 형태 버튼이 일부 Flow에서 작동하지 않는다

`/f/moving-d30-basic`과 `/f/vehicle-inspection-prep`에서 `체크리스트`를 눌러도:

- `aria-pressed`가 `false` 그대로다.
- heading과 실제 미리보기가 Calendar 그대로다.
- 저장 결과도 바뀌지 않는다.

반면 결혼·운동 route에서는 같은 형태의 버튼이 작동한다. 현재 소스는 결과 선택 handler를 `결혼 / 운동 / 러닝` category에만 연결한다. 사용자는 동일한 control을 보고도 Flow에 따라 전혀 다른 반응을 받는다.

### High 3. Flow 찾기 catalog 안에 두 세대의 화면이 함께 있다

모바일 390px의 9개 catalog card:

- 첫 5개: `/flow-maps/*`, `hybrid`, global 4탭 visible, receipt 없음
- 뒤 4개: `/f/*`, `p29-artifact-first`, share shell, receipt 있음

따라서 같은 `Flow 찾기` 목록에서 무엇을 누르느냐에 따라 상세 구조, 조정 범위, 저장 후 이동이 달라진다.

### High 4. 홈 예시는 Flow 찾기에서 다시 찾을 수 있는 집합이 아니다

- 홈의 차량 예시는 `/f/vehicle-inspection-prep`로 연결된다.
- hydrated `/flows` catalog에서 `차량 점검` 검색 결과는 0개다.
- 서버 fallback에는 차량 card가 있으나 client catalog에는 없다.

`전체 찾기`가 홈 예시의 상위 집합으로 동작하지 않는다.

### Medium 1. 홈 차량 card의 약속과 실제 기본 결과가 다르다

홈:

- `차량 점검표를 내 체크리스트로`
- `Checklist · 필요할 때 실행`

실제 target:

- `자동차검사 D-14 준비`
- 조건 `검사일`
- 기본 결과 `캘린더`

사용자가 기대한 일반 차량 점검표가 아니라 검사일 기준의 법정검사 준비 일정이다.

### Medium 2. 반복 Flow의 화면별 표현이 아직 통일되지 않았다

운동 Flow의 현재 동작:

- 저장 전: `월·수·금 · 시간 미정 · 계속 반복`
- Calendar: 7월 27일, 29일, 31일 occurrence와 회차 완료 control이 생성됨
- 날짜 없이 저장한 My Flow: `FREQ=WEEKLY;BYDAY=MO,WE,FR`가 그대로 노출됨

반복 계산 자체는 작동하지만 사용자 문구 projection이 화면마다 다르다.

## 최근 피드백 기준 상태

| 피드백 | 현재 판정 | 확인 내용 |
| --- | --- | --- |
| 홈과 Flow 찾기 역할 구분 | partial | Home은 사용 예, Find는 catalog로 나뉘었지만 같은 콘텐츠 identity가 통일되지 않음 |
| 홈과 Find에서 같은 card 결과 | missing | 이사 원문이 24개/5개 및 서로 다른 저장 객체로 갈림 |
| 결혼 참고표를 별도 진입점으로 분리 | supported | 두 card가 별도 `/f` route이며 자연 artifact가 다름 |
| 저장 전 전체 결과 먼저 보기 | supported_on_public | `/f` route는 actual artifact-first preview 사용 |
| Flow 찾기 저장 전 자연스러운 조정 | partial | `/f`는 title/date/memo/order, `/flow-maps`는 이름과 포함 여부 중심 |
| 5가지 결과 형태의 실제 선택 | partial | preview는 있으나 moving/vehicle의 secondary choice는 작동하지 않음 |
| 운동 반복 설정과 Calendar 회차 | supported_with_copy_gap | 다음 3회차와 Calendar occurrence는 작동, My Flow raw RRULE 노출 |
| My Flow 한 Flow focused workspace | supported_downstream | P32 workspace는 작동하지만 중복 저장 객체를 해결하지 못함 |
| Calendar Flow scope와 item detail | supported_baseline | 현재 route에서 overflow/error 없음, 기존 P31/P32 contract 유지 |
| 보관·복구·영구 삭제 | supported_baseline | 현재 lifecycle contract 유지 |

## 지금 먼저 해야 할 일

새 Home 또는 My Flow visual redesign보다 canonical Flow 정합성을 먼저 닫아야 한다.

1. 같은 source의 public alias, Flow Map, URL lookup 결과를 한 canonical Flow ID로 매핑한다.
2. 이사 Flow의 정본이 24개인지 5개인지 source fidelity와 사용자 job 기준으로 확정한다.
3. `/flow-maps`를 사용자 save grammar에서 제거하거나 canonical `/f`로 안전하게 handoff한다.
4. 기존 localStorage의 중복 저장본을 파괴하지 않는 reconciliation 규칙을 만든다.
5. 결과 형태 control을 모든 eligible Flow에서 실제 선택 가능하게 하거나, 선택할 수 없는 경우 button으로 렌더링하지 않는다.
6. Home 예시가 Find에서 동일한 title/source/result로 재발견되도록 한다.
7. 같은 source를 두 entry에서 저장해도 My Flow object가 하나인지 E2E로 고정한다.

## 파일

- [HTML review](./review.html)
- [상세 audit](./audit.md)
- [route evidence](./route-evidence.json)
- [다음 프로그램](./next-program.md)
- [screenshots](./screenshots/)

자동화, browser interaction, screenshot은 실제 사용자 검증이 아니다.
