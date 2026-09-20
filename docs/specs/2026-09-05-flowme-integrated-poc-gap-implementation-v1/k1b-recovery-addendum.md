# K1-B 저장 복구 보완 계약

2026-09-05. 독립 코드 검토에서 발견한 `recovery-required → reload`의 성공 오인을 막기 위한 개발 설계다. [K1-B 설계](./k1b-design.md) §5.2의 ‘target key 하나만 쓰기’는 아래 **target 1개 + PoC 복구 기록 1개**로 보완한다. 운영 schema·제품 정책 변경은 아니다. 이 문서는 구현/시험 통과 기록이 아니다.

## 발견한 누락

Plan/Quick 저장 후 candidate가 쓰였지만 readback/rollback을 검증하지 못하면 현재 화면은 잠긴다. 그러나 메모리 잠금만으로는 새로고침 후 그 유효 candidate를 마지막 성공 상태와 구별할 수 없다. 기존 React의 journal 의미는 참고하되 React schema·운영 journal·Authoring draft writer를 호출하지 않는다.

## 저장 계약

- 내용 target은 기존 `flow:poc:personal-workspace:v1:standalone-integrated` 그대로다.
- 복구 기록은 정확히 `flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v1`에만 쓴다. version은 이 PoC adapter의 교체 가능한 계약이다.
- 기록에는 검증 가능한 대상 key, before/candidate exact bytes, 편집 scope·session·attempt, 부모/root baseline과 draft를 보관한다. DOM·focus 객체·다른 저장소 내용은 포함하지 않는다.
- target 변경 전에 기록 쓰기와 exact readback을 확인한다. 다른 기록이 이미 있거나 읽을 수 없으면 target을 쓰지 않는다.
- target exact readback 뒤 같은 journal을 `prepared → confirmed`로 바꾸고 exact readback을 확인하면 durable commit이다. 이후 자기 confirmed 기록의 제거·부재를 확인하여 일반 화면으로 복귀한다. 내용 target write 1회와 journal write/remove 횟수를 별도 보고한다. 모든 저장 호출이 1회라고 표현하지 않는다.
- confirmed 쓰기의 throw-after/readback 오류를 prepared 실패로 처리하지 않는다. 실제 phase가 confirmed이고 target이 exact candidate이면 저장은 확정된 상태다. 읽을 수 없으면 확정 여부를 추측하지 않고 잠근다. confirmed 정리 실패는 ‘저장 완료·정리 확인 필요’로 구분하고 이미 확정된 target을 롤백하지 않는다.
- prepared 실패만 검증 가능한 이전 상태 복구 대상이다. target이 exact before/candidate인지, journal이 이 attempt의 exact prepared bytes인지 각각 직전 확인하며 제3자 값은 덮어쓰지 않는다. 복구 또는 journal 정리를 확증할 수 없으면 기록을 보존하고 잠근다.
- 같은 위치·유효하지 않은 입력·stale before·취소·Item staged apply는 journal 포함 추가 쓰기 0이어야 한다.
- localStorage가 원자적 CAS를 제공한다고 주장하지 않는다. 이 구현은 동기 구간의 exact-byte guard와 감지한 외부 변경 보존이다.

## 현재 화면과 새로고침

현재 편집의 복구 불확실 상태에서는 입력을 보여 주되 저장·닫기·Undo·배경 변경을 막고, 명시적인 ‘저장 상태 다시 확인’ 경로를 제공한다. 확인만으로 임의의 candidate를 성공으로 승격하지 않는다.

초기 진입은 일반 restored/seed 판정 전에 복구 기록을 읽는다. pending/unknown/corrupt/unreadable 기록이 있으면 일반 화면을 복구된 성공 상태로 보여 주거나 다른 writer를 호출하지 않는다. 읽기만으로 target/journal을 자동 변경하지 않는다.

사용자가 이전 상태 복구를 요청했을 때 prepared journal과 target을 함께 재확인한다. target이 exact candidate라면 before로 복원하고 readback한 뒤 자기 journal을 제거·확인한다. target이 이미 before이면 내용 target은 다시 쓰지 않는다. 제3값·읽기 실패·잘못된 journal은 덮어쓰지 않는다. 복구 확인 뒤 보관된 root draft를 다시 열어 사용자가 검토·저장할 수 있게 한다. 편집을 다시 열었다는 이유로 자동 저장하지 않는다.

새로고침에서 confirmed journal과 exact candidate를 확인하면 durable commit임을 구분한다. 명시적인 정리 확인으로 journal만 지우고 target을 보존한다. absent/pending/confirmed/foreign 상태와 재요청을 각각 처리하고 target 재쓰기나 성공 처리의 중복을 막는다. UI 영수증을 사용자가 보았다는 증거와 durable commit 증거는 다르다.

초기 no-op/invalid/stale는 journal 생성 전에 검사한다. prepared를 쓴 뒤 target drift를 감지한 경우는 target 쓰기 0이지 전체 호출 0이 아니다. 명시적 journal 정리도 일반 no-op 저장과 구분해 센다.

일반 초기화는 pending 복구 중 사용할 수 없다. 정상 상태에서 복구 기록은 이미 없어야 하며, 미확정 기록을 reset으로 지워 문제를 감추지 않는다. `localStorage.clear()`는 계속 금지다.

## 추가 검증

모델은 journal 준비/target 쓰기/readback/cleanup/rollback 각 경계의 throw-before·throw-after·wrong readback, foreign target/journal, 중복 retry/outcome, null before, 손상/unknown version을 구분한다. 초기 journal 읽기 mutation 0, explicit recovery 성공만 복원·cleanup 쓰기를 허용한다.

브라우저는 failure→현재 화면 재확인→retry, failure→reload gate→명시 복구→draft 보존→저장, corrupt/unknown/foreign/read-error gate, background/reset/Undo/일반 writer 차단을 검사한다. 기존 12개 닫기·focus·Back 검사 및 source/개인 완료/운영 sentinel 회귀를 다시 실행한다. 실제 실행 수와 미실행 경계는 QA에 따로 기록한다.
