# P35 Round 2 중립 독립 검토 brief

## 1. 검토 목적

FlowMe의 공개 계획 탐색부터 개인 계획 저장, 실행, 결과 이동까지를 하나의 연결된 사용자 여정으로 검토한다. 화면의 완성도만 보지 말고 다음 사실이 서로 모순 없이 이어지는지 확인한다.

1. 현재 상태가 공개 초안, 저장된 개인 계획, 실행 상태, 생성 결과 중 무엇인지 알 수 있는가.
2. 각 화면의 주 행동과 다음 단계가 분명한가.
3. 한 계획의 같은 Item 집합이 목적지별 결과로 일관되게 투영되는가.
4. 편집, 저장, Item 완료, 결과 생성이 서로 다른 상태 소유자를 가지며 혼동되지 않는가.
5. 도움, 조건, 위험, 복구 정보가 필요한 시점에 발견되고 접근 가능한가.
6. 모바일과 데스크톱에서 정보 순서와 행동 우선순위가 유지되는가.

## 2. 검토할 사용자 여정

- `/flows`: URL·메모 입력, lookup 상태, 후보 선택, empty/error
- `/f/[slug]`: 공개 계획 이해, 날짜 설정, 결과 확인, 계획/Item 편집, 저장
- `/flow-maps/[map]`: 하위 계획 선택, 전체 저장, 보류, 충돌
- `/my`: 빈 상태, 계획 목록, Todo/Today로 표시되는 영역의 역할, 선택 계획, Item 상세·편집·완료·메모, 보관·복원
- 저장된 계획의 결과 이동: 범위 선택, 형식 선택, preview, 확인, 실제 artifact, receipt/history/retry
- not-found, malformed/legacy, storage failure, Back/reload/duplicate/retry

`Todo/Today`가 canonical plan의 저장 view, 일시적 실행 view, 또는 export outcome 중 무엇으로 읽히는지는 **열린 질문**이다. 화면, storage, action 결과를 근거로 역할을 판정하고 미리 한 종류로 가정하지 않는다. Calendar·Checklist·Sheet·Memo 역시 실제 capability와 의미 있는 목적지가 있는지 확인하며, 불가능한 형식은 명확한 unavailable/held 사유가 있는지 본다.

## 3. 근본 질문

| 축 | 중립 질문 |
|---|---|
| State truth | 사용자가 저장·미저장·실행·결과 상태를 잘못 추론할 여지가 있는가? |
| Lifecycle | 입력→검토→편집→저장→실행/이동의 전환과 Back/reload/retry 결과가 예측 가능한가? |
| Action ownership | 같은 label이 다른 mutation을 만들거나, 다른 label이 같은 mutation을 만드는가? |
| Artifact projection | preview·confirmation·actual artifact·receipt가 같은 Item ID/count/field/version/hash를 가리키는가? |
| Information architecture | 첫 viewport에서 현재 상태, 주 행동, 결과, 다음 단계가 올바른 순서로 드러나는가? |
| Disclosure and safety | 되돌릴 수 없거나 손실 가능성이 있는 결과가 행동 전에 보이는가? 세부 설명은 필요할 때 열 수 있는가? |
| Terminology | 브랜드·내부 identity와 사용자가 해야 할 행동·받을 결과가 구분되는가? |
| Accessibility and recovery | keyboard, screen reader, focus, zoom, reduced motion, 오류 복구가 핵심 경로에서 작동하는가? |

## 4. 우선순위

```text
state truth
→ lifecycle
→ action ownership
→ artifact projection
→ information architecture
→ disclosure/safety
→ terminology/accessibility
→ visual polish
```

상위 불변식이 깨지면 색상·간격의 개선으로 상쇄하지 않는다.

## 5. 범위 밖 route debt

- creator
- text authoring
- publishing
- text-to-flow

이 경로가 우연히 노출되면 `OUT_OF_SCOPE_ROUTE_DEBT`로 기록하되 이번 점수와 gate에 섞지 않는다. 내부 type, route, storage key의 전면 rename도 범위 밖이다.

## 6. 독립성·표현 규칙

- finding ID: Codex `CX-###`, Claude Design `CD-###`
- 관찰한 사실, 기대 불변식, 재현 절차, 증거, 반례, 미증명 범위를 분리한다.
- 정적 화면만으로 persistence·payload·artifact 동일성을 단정하지 않는다.
- simulation은 실제 사용자 이해를 증명하지 않는다. 관찰 사용자 수는 `0명`으로 유지한다.
- 지정 시나리오 완료 뒤 `S23 Free exploration`에서 새로운 근본 문제를 자유롭게 탐색한다.
