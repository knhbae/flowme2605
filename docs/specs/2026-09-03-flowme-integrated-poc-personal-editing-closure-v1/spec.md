# FlowMe 통합 PoC P2-C 개인 편집 완결성 계약

## 목적

v4.1 개인공간, 개발1 구조 편집, 개발2 Text Authoring 결과물을 한 제품 흐름으로 합치는 과정에서 남은 개인 편집 갭을 닫는다. 이 문서는 영구 제품 정책이나 운영 schema가 아니라 `/my?personalWorkspacePoc=v1`에서만 유효한 교체 가능한 PoC v1 계약이다.

## 기준과 충돌 판정

| ID | 이번 단계 판정 | 근거 |
|---|---|---|
| D1-012 | 구현 | `personal-draft`와 materialized `authoring-handoff`의 stable section만 개인 shadow 제목 편집을 허용한다. canonical·Map·legacy·derived label은 편집 affordance를 만들지 않는다. |
| D2-021 | 의도적 변경 | 예전 양방향 source/result 수정 요구보다 최신 A0 소유권 결정을 우선한다. 작성 원문 변경은 결과에 즉시 투영하지만, 저장 뒤 개인 title·memo·schedule 변경은 원문을 역수정하지 않는다. |
| D2-035 | 구현 | 날짜·상대 날짜·시간·시간대·장소·소요 시간·완료 기준·조건·하위 체크·설명·자료·반복/종료·안내·주의·출처 16종을 실제 source transaction에 연결한다. |
| D2-036 | 구현 | 단순 값은 active editor 안의 비고정 inline form, 상대 날짜·시간대·반복 설정만 bounded dependent surface를 쓴다. |
| D2-039 | 구현 | 기존 값은 raw 값만 선택하고 빈 값은 prefix 뒤 collapsed caret로 진입한다. 하위 체크는 source line identity로 정확한 instance를 선택한다. |

P2-B 문서에 남은 “D2-023 모든 속성 picker/editor” 표기는 잘못된 ID다. D2-023은 31개 콘텐츠 예시 보존이며, 속성 잔여 ID는 D2-035·D2-036·D2-039다.

## 저장·소유권 경계

- 진입점은 exact query `/my?personalWorkspacePoc=v1`이다.
- 쓰기·삭제는 `flow:poc:personal-workspace:v1:*` 안에서만 허용한다.
- 운영 `flow:*` 값과 `/my` 기본 화면 및 writer/schema는 변경하지 않는다.
- section 제목은 stable section ref별 `PersonalPlanOverlay.sectionTitles`에 한 번만 저장한다. Item마다 복제하지 않는다.
- 작성 원문 transaction과 저장된 개인 Flow shadow transaction은 합치지 않는다.
- rawText, source item membership, source schedule, unknown fields는 section/개인 계획 편집으로 바뀌지 않는다.
- store version은 v1을 유지하고 새 필드는 optional로 읽어 기존 payload를 복구한다.

## 전이 계약

### 구간 제목

- 편집 가능: 개인 소유이며 stable section ref가 있는 `personal-draft`, `authoring-handoff`.
- 읽기 전용: canonical, Map, legacy, source-owned, 날짜·D-day·반복·상태 등 derived label.
- 빈 제목, foreign/read-only section ref, duplicate section ref, stale source/state, 같은 값, 취소, Escape는 mutation 0이다.
- 성공은 Plan 단위 transition 1회, PoC 저장 1회, Undo snapshot 1개다.
- 같은 section ref를 읽는 Text·Todo·Calendar·Sheet·TXT 및 상세 화면은 같은 effective title을 보여야 한다.

### Authoring 속성

- singleton 속성은 없으면 한 줄 삽입, 하나면 값만 교체, 같은 값은 mutation 0, 중복이면 fail-closed한다.
- 안내·주의는 동일 문구면 mutation 0, 다른 문구면 distinct line을 append한다.
- 하위 체크는 `  - [ ] 제목` child action으로 추가하며 다른 Item이나 property를 건드리지 않는다.
- 자료와 출처는 별도 속성으로 유지하고 bare HTTP(S) URL과 Markdown link를 받는다.
- 소요 시간은 양의 정수 `분|시간`, 날짜·시간·IANA timezone·상대 날짜·반복/종료는 bounded grammar로 검증한다.
- 시간+시간대, 반복+종료 동시 적용은 Item span 하나를 바꾸는 단일 SourceChange와 native Undo 1회다.
- invalid, dependency 부족, duplicate, stale, protected, composition, cancel, Escape, no-op은 mutation 0이다.

## UX 계약

- 첫 chooser는 `일정 / 실행 / 내용 / 더 보기` 네 그룹으로만 나눈다.
- 날짜·시간·텍스트·장소·소요·완료·조건·링크·안내·주의·출처·하위 체크의 단순 입력은 editor 내부 inline panel이고 fixed/absolute/sticky가 아니다.
- 상대 날짜, 시간+시간대, 반복+종료만 작은 화면 sheet/넓은 화면 popover인 dependent surface를 허용한다.
- 기존 값의 `값 선택`은 쓰지 않고 같은 textarea를 focus한다. Markdown link는 raw 값 전체를 선택한다.
- UI는 “원문 변경→결과 즉시 갱신”과 “저장 뒤 개인 계획 변경→원문 불변”을 구분해 설명한다.
- 성공·같은 값·실패·취소 상태를 구분하고 핵심 행동은 키보드만으로도 가능해야 한다.

## 수용 기준

1. D1-012, D2-035, D2-036, D2-039의 순수 모델·component·browser 증거가 모두 연결된다.
2. D2-021은 의도적 변경 근거와 raw source 불변 테스트가 있다.
3. 독립 HTML과 React 경로가 같은 catalog/전이/상태 문구를 제공한다.
4. 기존 v4.1 이동·완료·Undo·reload·다중 origin 회귀가 통과한다.
5. 390×844, 375×812, 844×390, 1024×768, 1440×900에서 가로 넘침·console error·page error·가려진 핵심 행동이 0건이다.
6. 시나리오 전후 운영 `flow:*` key/value 직렬화가 byte-for-byte 동일하고 허용 prefix 밖 writer 호출이 0건이다.
7. 실제 Android Chrome, iOS Safari, 관찰 사용자를 실행하지 않았다면 각각 미실행·0명으로 기록한다.

## 제외

운영 migration, 운영 writer/schema 변경, source row 역편집, cloud/account, AI, 공개 후보, 외부 동기화, 배포, commit·push·PR은 이번 단계에서 하지 않는다.
