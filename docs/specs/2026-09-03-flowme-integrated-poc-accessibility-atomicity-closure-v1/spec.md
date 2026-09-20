# FlowMe 통합 PoC P3-A 접근성·원자성 정합성 계약

## 목적

P2-C 이후 남은 primary gap 17건 가운데 제품 정책이나 운영 연동을 새로 결정하지 않고 닫을 수 있는 두 건을 처리한다.

- `V41-036`: 사라진 옛 검토 버튼을 되살리는 대신, 현재 통합 shell의 탐색과 선택형 항목 검토 action에 접근 가능한 이름과 focus 복귀를 연결한다.
- `D2-058`: 이미 E4로 확인된 여덟 원자성 하위 조건을 부모 요구의 판정과 일치시킨다. 결과에서 원문으로의 역편집은 이 요구에 섞지 않고 `D2-021`의 의도적 변경 경계로 유지한다.

이 단계는 v4.1·개발1·개발2 전체의 완성을 선언하지 않는다. P3-A가 끝나도 실기 근거 또는 제품 결정이 필요한 primary gap 15건이 남는다.

## 기준선과 목표 snapshot

| 범위 | P2-C 기준선 | P3-A 목표 | 의미 |
|---|---:|---:|---|
| primary 요구 | 168건 | 168건 | 요구 총수는 바꾸지 않는다. |
| 충족 | 128건 | 130건 | `V41-036`, `D2-058`만 승격 후보이다. |
| 부분 | 13건 | 11건 | 두 요구의 실행 증거가 모두 통과한 뒤에만 줄인다. |
| 미충족 | 4건 | 4건 | 이번 단계에서 바꾸지 않는다. |
| primary gap | 17건 | 15건 | 실기 7건, 제품·운영 결정 8건을 남긴다. |

목표 snapshot은 검증 명령이 끝나기 전에는 확정 결과가 아니다. 실행 수치가 비어 있거나 실패가 있으면 두 요구를 `검증 대기`로 표시한다.

## 세 결과물과의 연결

| 결과물 | 이번 단계에서 확인하는 내용 | 바꾸지 않는 내용 |
|---|---|---|
| 개인공간 v4.1 | 모바일 탐색의 접근 가능한 이름, 현재 선택 항목을 검토하는 action의 이름, 닫기·Escape 뒤 opener focus 복귀 | 폴더·기간·이동·완료·Undo의 기존 동작과 운영 `/my` |
| 개발1 | 통합 shell에서 전역 navigation을 한 번만 렌더하는 A0 계약, 선택 항목과 개인공간 projection의 경계 | 네 origin, identity, lifecycle, 저장 경계 |
| 개발2 | 선택형 항목 검토의 접근성, 여덟 원자성 하위 조건과 부모 판정의 정합성 | CreatorDraft library, production canonical adapter, source reverse edit |

## V41-036 UX 계약

### 현재 action mapping

| 예전 정본 역할 | 통합 PoC의 현재 대응 action | 접근성 계약 |
|---|---|---|
| 모바일 탐색 | 전역 또는 local navigation | 보이는 맥락과 일치하는 명시적 이름을 제공한다. 같은 navigation을 중복 렌더하지 않는다. |
| 검토 | 선택된 항목의 선택형 검토 surface 열기 | 어느 항목을 검토하는지 이름에 포함하거나 접근 가능한 설명으로 연결한다. |
| 검토 닫기 | 닫기 버튼 또는 `Escape` | 열었던 control로 focus를 돌려보낸다. 닫기만으로 state·storage mutation을 만들지 않는다. |
| 개인공간 복귀 | 개인공간 보기 | 목적지를 이름으로 식별하고 기존 no-write projection 경계를 유지한다. |

검토 surface가 없는 상태에는 빈 control을 렌더하지 않는다. 전역 검토 버튼을 별도로 추가해 navigation과 local action을 중복시키지 않는다.

### 키보드·focus 수용 조건

1. `Tab`으로 탐색·개인공간 보기·항목 검토에 도달한다.
2. `Enter` 또는 `Space`로 항목 검토를 연다.
3. 닫기 버튼과 `Escape` 모두 opener로 focus를 돌려보낸다.
4. 열기·닫기·Escape만 수행하면 PoC state와 브라우저 저장 호출이 0건이다.
5. React와 독립 HTML에서 같은 역할과 상태 문구를 사용한다.

## D2-058 판정 정합성 계약

부모 요구는 아래 여덟 하위 조건만으로 판정한다. 모두 E4 실행 근거가 있고 이번 집중 회귀가 통과하면 `부분`에서 `충족`으로 올린다.

1. 취소·Escape는 target write 0이다.
2. blank는 target write 0이다.
3. stale은 preflight에서 차단하고 target write 0이다.
4. invalid·foreign·tampered 입력은 fail-closed하고 target write 0이다.
5. storage failure는 이전 state·draft bytes로 rollback한다.
6. 성공은 source lineage·canonical Flow·projection을 한 PoC transaction으로 반영한다.
7. 성공 mutation은 Undo 한 번으로 state와 draft bytes를 함께 복구한다.
8. recovery draft와 durable save를 별도 key와 수명으로 관리한다.

`D2-058`에 결과→source reverse edit를 추가 조건으로 붙이지 않는다. 해당 방향은 `D2-021`에서 `의도적 변경`으로 추적한다.

## 저장·안전 경계

- 진입점은 exact query `/my?personalWorkspacePoc=v1`이다.
- PoC 쓰기·삭제는 `flow:poc:personal-workspace:v1:*` namespace에만 허용한다.
- 기본 `/my`, 운영 `flow:*` 값, 운영 writer·schema는 바꾸지 않는다.
- 보고서 HTML은 저장소 API를 읽거나 쓰지 않는 정적 문서다. 필터와 `<details>` 열림 상태는 메모리에만 둔다.
- 잘못된 query, unsupported origin, 손상 payload의 fail-closed 동작을 유지한다.
- `localStorage.clear()`는 제품 코드와 보고서에서 모두 호출하지 않는다.

## 남은 15건 분리

### 실제 기기·보조기술 근거 7건

`V41-062`, `V41-063`, `V41-064`, `V41-066`, `D2-038`, `D2-042`, `D2-061`은 실제 Android Chrome, iOS Safari, 가상 키보드, TalkBack·VoiceOver, 실제 browser 200% 확대 등의 근거가 필요하다. Chromium 자동화나 캡처를 실기 증거로 바꾸어 쓰지 않는다.

### 제품·운영 결정 8건

`V41-001`, `D2-002`, `D2-004`, `D2-007`, `D2-023`, `D2-026`, `D2-056`, `D2-057`은 shell·token, production adapter, creator/public/export owner, corpus QA surface, source candidate·sync, compiler, CreatorDraft lane의 결정을 요구한다. 별도 승인 전 구현 범위를 넓히지 않는다.

## 수용 기준

1. `V41-036`의 React·독립 HTML mapping, 접근 가능한 이름, 닫기·Escape focus 복귀와 zero-write를 브라우저로 확인한다.
2. `D2-058.1`~`D2-058.8`의 판정과 실제 모델·저장 회귀가 모두 일치한다.
3. 관련 순수 모델·component·standalone·브라우저 회귀와 production build가 통과한다.
4. 390×844, 375×812, 844×390, 1024×768, 1440×900에서 가로 넘침·console error·page error·가려진 핵심 행동이 0건이다.
5. 시나리오 전후 운영 `flow:*` key/value가 byte-for-byte 동일하고 허용 prefix 밖 writer 호출이 0건이다.
6. HTML 보고서는 필터, 세부 근거, 남은 gate, 로컬 원문 링크를 제공하고 브라우저 저장소 API 호출이 0건이다.
7. 실제 기기·보조기술·관찰 사용자·commit·push·PR·Preview·Production 상태를 자동화 근거와 분리해 기록한다.

## 제외

이번 단계에서는 production canonical adapter, CreatorDraft library, 31개 corpus용 운영 surface, source candidate·외부 동기화, source reverse edit, cloud/account, AI, 공개 후보, 운영 migration과 배포를 구현하지 않는다.
