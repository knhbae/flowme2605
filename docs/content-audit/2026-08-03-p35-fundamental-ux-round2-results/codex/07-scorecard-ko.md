# P35 Round 2 · Codex Scorecard

## 판정

- 가중 점수: **55.4/100**
- 권장 통과선: 76/100
- 상위 네 영역 4/5 이상: **불충족**
- Hard fail: **3개**
- 관찰 사용자: **0명**
- 결론: **기획/구현 재수렴 필요. 출시 판단 보류**

## 1. 근본 영역 가중 점수

| 영역 | 가중치 | 점수 | 환산 | 근거 |
|---|---:|---:|---:|---|
| `내 Flow` IA·정보 흐름 | 20 | 3/5 | 12.0 | 0·1개와 selected Flow는 개선. Today/library 관계, 5·20개 수동 근거, 인라인 관리 혼합이 남음 |
| 생명주기 명확성 | 18 | 3/5 | 10.8 | 예시·저장·영수증은 구분. public/saved export 버전과 재진입 의미가 불명확 |
| 결과 투영 무결성 | 17 | 3/5 | 10.2 | 일반 `/f`는 강함. Flow Map parity와 export completion/title drift가 있음 |
| 행동 소유권 | 15 | 2/5 | 6.0 | 공개/저장 export, 여러 edit depth, Flow/Item export가 중복 |
| Progressive disclosure·안전 | 12 | 3/5 | 7.2 | 중요한 운동 주의는 inline. 공통 help 등급과 감산 규칙 없음 |
| 용어·카피 | 10 | 3/5 | 6.0 | 결과형 CTA가 늘었지만 `Flow`와 위계 copy가 반복. 이해도 미검증 |
| 시각적 일관성 | 8 | 2/5 | 3.2 | public sheet, saved inline, blue Item surface, legacy Map가 다른 문법 |
| **합계** | **100** |  | **55.4** |  |

이번 수치는 내부 휴리스틱입니다. `1=핵심 경로 불성립`, `2=경로는 있으나 소유권·예외가 구조적으로 충돌`, `3=핵심 경로는 동작하나 미확인·손실·중복이 남음`, `4=주요 예외까지 한 계약으로 확인`, `5=극단값과 사용자 이해까지 확인`의 공통 anchor를 사용했습니다. 사용자 관찰이 0명이므로 이해도 근거가 필요한 영역은 5점을 줄 수 없습니다.

## 2. Hard fail

`PASS`는 해당 hard fail을 재현하지 않았다는 뜻입니다.

| 항목 | 판정 | 근거 |
|---|---|---|
| 저장 전·후 상태를 구분하지 못함 | PASS | 예시 label과 저장 영수증이 분리 |
| 화면 미리보기와 실제 내보낸 결과가 다름 | **FAIL** | 저장 Item 화면은 checklist에 완료 기준을 포함한다고 안내하지만 실제 payload에서 누락 |
| 지원하지 않는 형식을 정상 결과처럼 제시 | `△` | public 진입 문구는 시트까지 약속하지만 현재 상태의 panel은 1~2개만 노출. XLSX generator는 있어 완전 미지원이 아니라 상태별 안내 불일치로 판정 |
| 중요한 주의가 아이콘 안에만 있음 | PASS | 운동 중단 조건은 inline |
| 같은 편집·내보내기 행동이 여러 깊이에 반복 | **FAIL** | 공개/저장, Flow/Item, Map에 서로 다른 편집 surface와 export 진입이 반복 |
| 취소했는데 초안 저장 또는 기존 상태 손실 | `TBD` | public parent cancel과 saved Item guard는 확인했지만 saved Flow·Map·Back·error 전체 행렬은 미확인 |
| `완료`가 저장과 실행 완료를 모두 의미 | PASS | 저장·적용 CTA가 결과 언어 사용 |
| 같은 Item 수정값이 화면·결과마다 다름 | **FAIL** | Flow Map 7개 적용 후 main preview 8개 |

## 3. U01~U10

| ID | 현재 | 권고 구현 후 예상 | 구현 후 검증 | 이유·증거 |
|---|---|---|---|---|
| U01 export는 `내 Flow`에서 | `△` | `O` | `TBD` | capability 조건부 public copy + saved authoritative export |
| U02 도움·주의 체계 | `X` | `O` | `TBD` | 삭제/inline/help/safety 등급 필요 |
| U03 `내 Flow` 전체 IA | `△` | `O` | `TBD` | 문맥형 C와 0·1·5·20 acceptance |
| U04 Item 감산 | `X` | `O` | `TBD` | 파란 surface·중복 heading 제거 |
| U05 Flow Map 3칸 | `X` | `O` | `TBD` | selected/total만 CTA 근처에, applied preview 통일 |
| U06 시작일 중복 | `X` | `O` | `TBD` | input echo 삭제 |
| U07 CTA·여러 형식·저장 후 이동 | `△` | `O` | `TBD` | 기본 1+eligible secondary, receipt direct selected Flow |
| U08 공개/저장 editor 통일 | `X` | `O` | `TBD` | 공통 전체 높이 sheet transaction |
| U09 공개 상세 역할 감산 | `X` | `△` | `TBD` | primary 1개로 줄여도 실제 사용자 first-5-sec 검증 필요 |
| U10 `Flow` 용어 이해 | `TBD` | `TBD` | `TBD` | 사용자 관찰 0명 |

`권고 구현 후 예상`은 설계 가설이며 완료 판정이 아닙니다.

## 4. 대안 결정표

| 결정 | A | B | C | Codex 권고 | 기각/보류 이유 |
|---|---|---|---|---|---|
| 내보내기 소유권 | `내 Flow` 전용 | 공개+저장 후 동급 | capability 조건부 | **C** | A는 단순 copy에도 저장 강제, B는 버전·generator 중복 |
| `내 Flow` 첫 화면 | Today 우선 | library 우선 | 문맥형 | **C** | A는 행 수 팽창, B는 저장 직후/1개 실행에 한 단계 추가 |
| 편집 surface | 별도 page | 전체 높이 sheet | inline | **B** | page는 깊이 증가, inline은 보기/편집 혼합과 mobile overlap |
| 결과 형식 노출 | 고정 5개 | 가능한 형식 전부 | 기본 1+조건 안내 | **C** | 고정 5개는 빈/무의미 결과, 전부 노출은 선택 과부하 |
| 사용자 용어 | Flow 유지 | 계획으로 치환 | Flow+결과 설명 | **C** | 전면 치환 효과 미검증, 내부 모델·브랜드 비용 큼 |

## 5. 제안 반증

| 제안 | 반례 | 판정 |
|---|---|---|
| export를 My Flow에만 둔다 | 날짜 없는 checklist 단순 복사에도 저장을 강제 | 자동 채택 금지 |
| 도움·주의를 모두 `? / !`에 숨긴다 | 통증·영구 삭제·중복 생성은 보이지 않으면 피해 | 기각 |
| 모든 Flow에 5개 형식 | 날짜 없는 calendar, 필드 없는 sheet, 미구현 Todo | 기각 |
| 하단 CTA를 `완료`로 통일 | 저장·적용·실행 완료가 같은 뜻 | 기각 |
| Flow Map 3칸 모두 삭제 | 일부 선택에서 선택/전체 수를 예측 못함 | 부분 기각: CTA 근처 1개 summary 유지 |
| public/saved editor를 완전히 같은 결과로 만든다 | commit target은 working vs persisted로 다름 | grammar만 통일 |
| Flow를 전면 `계획`으로 바꾼다 | 이해도 evidence 없이 브랜드·route 비용 발생 | 보류 |

## 6. 출시에 필요한 evidence

| 영역 | 남은 evidence |
|---|---|
| IA | 0·1·5·20·완료·보관·오늘 없음 수동 QA + 사용자 과업 |
| lifecycle | public working/saved/exported version 설명 과업 |
| projection | format loss golden test와 Flow Map adapter parity |
| editor | public/saved/Map Apply/Cancel/Back/error/focus matrix |
| safety | 도움을 열지 않고 중단 조건 발견, screen reader 검증 |
| copy | 처음 보는 사용자의 클릭 결과 설명 |
| extreme | 50 Item, 긴 한글, mixed date/repeat, partial support 390px |

## 7. Gate 재평가 조건

- 점수 76 이상
- 상위 네 영역 각각 4/5 이상
- Hard fail 0
- 390×844와 1440×1000 overflow/overlap 0
- console/page error/failed request 0
- 실제 사용자 관찰을 내부 simulation과 별도 집계
