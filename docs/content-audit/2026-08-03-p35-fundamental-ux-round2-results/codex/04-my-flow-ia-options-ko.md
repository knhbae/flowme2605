# `내 Flow` IA Options

## 결론

권고는 **C · 문맥형 진입**입니다.

- 저장 직후: 방금 저장한 Flow의 선택 화면
- 일반 재방문: 오늘 항목 최대 3개 + 저장 라이브러리로 가는 직접 연결. 오늘 항목이 없으면 `오늘 할 일 없음`과 별도 `다음 예정`을 표시
- Today: 별도 저장소가 아니라 저장한 Flow의 파생 실행 뷰
- 저장 라이브러리: 원본 계획, 완료·보관 lifecycle, 검색·필터의 정본 위치

Flow 개수로 탭을 몰래 바꾸지 않고 `receipt`, direct Flow link, 일반 `/my`처럼 **진입 원인**으로 결정합니다.

## 1. 현재 상태

### 잘 된 부분

- 0개: `저장한 Flow가 없습니다`와 `콘텐츠 고르러 가기`를 함께 표시합니다.
- 1개 library: 한 행에 제목·다음 할 일·날짜·진행률이 있습니다.
- 선택 Flow: 다음 3개, 전체 진행, 접힌 전체 계획, 기준일, 전체 export가 한 object context에 있습니다.
- 저장 영수증이 선택 Flow로 직접 이어지는 구조입니다.
- 5개부터 검색/필터, 20개에서 initial 8개+`12개 더 보기`를 쓰는 코드/E2E 계약이 있습니다.

### 남은 문제

- 일반 `/my`의 `지금 할 일`은 오늘만이 아니라 future·undated까지 담아 1개 Flow에서도 19개로 보입니다.
- `Today`가 저장 계획에서 나온 projection이라는 설명이 없습니다.
- `내 실행 공간`, `My Flow`, `할 일을 실행하고 저장한 Flow를 엽니다`, `저장한 계획 관리`, `저장한 Flow`가 위계를 반복합니다.
- 24개 plan의 `Flow 편집`이 전체 인라인 확장으로 바뀌어 실행 화면과 관리 화면을 섞습니다.
- 완료·보관한 계획은 일반 실행과 library lifecycle에서 분리되어야 합니다.

## 2. A/B/C 비교

| 안 | 기본 화면 | 장점 | 위험 |
|---|---|---|---|
| A Today 우선 | cross-Flow 실행 Inbox | 당장 할 일을 빨리 봄 | future/undated/completed가 쌓이면 전체 목록으로 팽창. 원본 계획 찾기 약함 |
| B library 우선 | 저장한 계획 목록 | 0·5·20개 관리와 검색이 명확 | 1개 Flow의 다음 행동까지 한 단계 더 필요 |
| C 문맥형 | 진입 원인별 selected Flow 또는 bounded 실행 요약 | 저장 직후 확인과 일반 실행을 모두 지원 | 오늘/다음 예정/날짜 없음의 구획과 empty state를 명시적으로 관리해야 함 |

## 3. 상태별 판정

| 상태 | A | B | C | 권고 동작 |
|---|---|---|---|---|
| Flow 0개 | 실행 empty를 설명해야 함 | 저장 없음→Flow 찾기가 자연스러움 | B와 동일 | library empty + Flow 찾기 |
| Flow 1개·오늘 행동 있음 | 즉시 실행 | Flow open 1단계 | 저장 직후 selected, 일반 재방문 오늘 항목 | C |
| Flow 1개·날짜 없음 | 긴 undated 목록 또는 0개가 될 수 있음 | 계획 존재는 보임 | selected Flow에서 다음 Item과 날짜 없음 상태 표시 | C |
| Flow 5개 | 실행 항목이 여러 행으로 팽창 | compact library+검색/필터 | 오늘 최대 3개 + library 링크 | C |
| Flow 20개 | 첫 화면 밀도 최고 | 검색/필터+8개 initial이 적합 | 오늘 최대 3개 + B library | C |
| 완료·보관 혼합 | 실행 목록에 완료가 쌓일 수 있음 | lifecycle filter가 명확 | 실행에서는 제외, library에서 관리 | C |
| 방금 저장 | 전체 Inbox로 가면 저장 결과 확인 약함 | 다시 찾아야 함 | 방금 저장한 Flow 상세 | C |
| 오늘 할 일 없음 | 빈 화면 또는 future/undated 혼합 | 계획은 찾음 | `오늘 할 일 없음`을 먼저 확정하고 별도 `다음 예정` 1개. 예정도 없을 때만 `날짜 없는 계획` 1개 | C |

5·20개는 app의 `demo=ux5`, `demo=ux20` fixture와 E2E 계약을 확인했습니다. 이번 수동 브라우저 재생은 개발 서버 timeout으로 끝내지 못했으므로 사용자 관찰이나 수동 `O` 근거로 쓰지 않습니다.

## 4. C안 route contract

| 진입 | landing | URL/상태 원칙 |
|---|---|---|
| public 저장 영수증→이어하기 | 방금 저장한 selected Flow | `flow=<slug>` intent가 명시적 |
| library 행 open | 선택한 Flow | 사용자가 object를 명시적으로 선택 |
| 일반 `/my` | bounded 실행 요약 | 오늘 최대 3개. 오늘이 없으면 empty와 별도 다음 예정, 저장 library 바로가기 유지 |
| `/my?view=flows` | library | 관리 의도 명시 |
| 완료/보관 notification | 해당 lifecycle filter | 숨겨진 자동 탭 전환 금지 |
| direct Item deep link | Item detail + owning Flow context | 닫으면 진입 전 surface로 복귀 |

### 일반 `/my`의 bounded 실행 요약

1. `오늘 할 일`에는 오늘 미완료만 최대 3개 표시
2. 오늘 항목이 없으면 `오늘 할 일 없음`을 표시
3. 그 아래 별도 `다음 예정`에 가장 가까운 미래 Item 1개 표시
4. 예정도 없으면 별도 `날짜 없는 계획`에 첫 실행 Item 1개 표시
5. 각 row에 owning Flow를 quiet metadata로 표시
6. `저장한 Flow N개 보기`를 항상 인접 제공

## 5. 정보 위계

```text
My Flow
├─ 오늘 할 일: 저장 계획에서 파생된 오늘 항목 최대 3개
├─ 다음 예정 또는 날짜 없는 계획: 오늘 항목이 없을 때 별도 1개
├─ 저장한 Flow: 원본 계획 library
│  └─ 선택 Flow
│     ├─ 다음 1~3개
│     ├─ 진행률
│     ├─ 전체 계획(기본 접힘)
│     ├─ Item 상세
│     └─ 관리/내보내기
└─ 보관함: 완료/보관/복구 lifecycle
```

Today, Calendar, library가 데이터를 따로 저장하지 않습니다. 모두 underlying stable Flow/Item identity와 source/personal/execution state에서 파생됩니다. 화면별 composite key 문자열은 달라도 같은 Item을 추적해야 합니다.

## 6. 현재 정본 충돌

`docs/DECISIONS.md:76`의 과거 B1 결정은 선택 Flow 안에 `다음 행동/전체 계획/기록`을 둔다고 설명하지만, 같은 문단은 library의 `지금/Flow 목록/완료`를 유지합니다. 더 오래된 결정에는 single saved dated Flow가 Today로 자동 진입한다는 규칙도 남아 있습니다 (`DECISIONS.md:803,947`).

현재 UI와 Round 2 권고는 다음으로 수렴합니다.

- 선택 Flow: 다음 1~3개 + 진행률 + 기본 접힌 전체 계획
- 완료 control: Item 상세의 단일 소유
- 일반 `/my`: 오늘/다음 예정/날짜 없음을 구분한 bounded cross-Flow execution
- library: 검색·필터·보관 lifecycle

기획 확정 뒤 `DECISIONS.md`와 `SERVICE_STRUCTURE.md`에서 자동 전환·local tab·완료 소유권에 관한 예전 문구를 한 번에 정리해야 합니다.

## 7. Acceptance matrix

| fixture | 반드시 확인할 것 |
|---|---|
| 0 | empty copy, Flow 찾기, Today/library 혼동 없음 |
| 1 dated | 저장 직후 selected Flow, 일반 재방문 next 1~3 |
| 1 undated | 계획 존재와 실행 가능 여부 구분 |
| 5 | 오늘 최대 3개, library 검색/필터 threshold |
| 20 | initial 8, 더 보기, 검색·상태 필터, 390px 성능 |
| completed mixed | Today에서 완료 제외, library에서 진행/완료 filter |
| archived | 일반 실행에서 제외, 복구/영구 삭제 위치 명확 |
| no today | `오늘 할 일 없음`, 별도 다음 예정 1개, 예정이 없을 때만 날짜 없는 계획 1개 |

각 fixture에서 첫 행동 성공, 원본 Flow 찾기, 선택 Flow 열기, 완료 되돌리기, 전체 export까지 측정합니다.
