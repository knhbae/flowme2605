# Visual system

“순수 polish”와 “구조적 composition 변경”을 분리해서 적는다.
아래에서 **[C]** 는 composition 변경(구현 slice와 함께 승인 필요), **[P]** 는 token/CSS만 바꾸면 되는 항목이다.

## 1. Typography [P]

| 역할 | 크기 / 두께 | 용도 |
| --- | --- | --- |
| screen title | 20–21 / 700 / letter-spacing -0.02em | 화면 제목 1개 |
| receipt title | 23 / 700 | 저장 결과에서만 사용하는 한 단계 큰 제목 |
| focus title | 16.5 / 700 | 다음 할 일 카드의 제목 |
| row title | 14–14.5 / 500 | 목록 행 |
| section label | 12.5 / 600 | 섹션 헤더 |
| meta | 11.5–12.5 / 400 | 날짜·개수·상태 |
| button | 14.5–15 / 600–700 | 컨트롤 |

한글 본문 line-height 1.45–1.6, 설명 문단만 1.65. compact work surface(목록·달력)에는 hero scale을 쓰지 않는다 — 20px을 넘는 글자는 화면당 1개.

## 2. Spacing [P]

4px 그리드. 사용하는 값은 4 / 6 / 8 / 10 / 14 / 18 / 26만.
- 화면 padding 18, wide는 18–24
- 카드 내부 14
- 행 세로 8–9 (+ 행 사이 1px hairline)
- 블록 사이 14
- 하단 고정 영역과 본문 사이 96–120 (겹침 방지)

## 3. Color roles

| role | 값 | 의미 |
| --- | --- | --- |
| canvas | `#f4f5f7` | 화면 바탕 |
| surface | `#ffffff` | 카드·행 |
| hairline | `#e4e7eb` / 행 사이 `#f2f4f6` | 경계 |
| ink | `#16191d` | 본문·primary 버튼 |
| muted | `#616b76` / `#8a939d` | 설명·메타 |
| source | `oklch(0.52 0.10 268)` (tint `oklch(0.975 0.012 268)`) | 원문·다음 행동 강조 |
| execution | `oklch(0.52 0.10 155)` (tint `oklch(0.975 0.015 155)`) | 완료·성공 |
| attention | `oklch(0.55 0.12 65)` | 재검토 필요 표기(제품 화면에서는 거의 쓰지 않음) |
| danger | `oklch(0.52 0.10 25)` | 영구 삭제 |

세 accent는 chroma·lightness를 공유하고 hue만 다르다. 배경 gradient를 쓰지 않는다.

**정보 종류 구분 [C]**
- source(원문에서 온 값): 회색 메타 + 원문 링크. 색을 입히지 않는다.
- personal(내가 바꾼 값): 라벨에 `내` 접두 + 값은 ink. 예 `내 메모`, `이 할 일 날짜`.
- execution(실행 상태): 완료만 execution 색. 진행률 막대는 쓰지 않고 `n / N 완료` 텍스트로.

## 4. Elevation과 경계 [P]

- 기본은 1px hairline + radius 12. 그림자 없음.
- 그림자는 화면 위로 뜨는 것에만: sheet `0 -8px 40px #16191d33`, 토스트 `0 6px 24px #16191d40`.
- **카드 안에 카드를 넣지 않는다.** 섹션은 헤더 + hairline으로 나눈다.
- 화면 전체를 떠 있는 카드처럼 만들지 않는다(canvas 위에 바로 목록).

## 5. 상태 [P]

| 상태 | 표현 |
| --- | --- |
| selected | 달력 cell: ink 채움 + 흰 글자 / 행: 왼쪽 2px source 바 |
| completed | 제목 취소선 + `#a5adb6`, 토글 execution 채움 + ✓ |
| excluded | 제목 취소선 + `#a5adb6`, 토글 라벨 `포함`, 개수에서 제외 |
| archived | 목록의 보관 필터에서만, 제목 muted + `보관됨` 배지 |
| disabled | opacity .45 + `cursor:not-allowed` + **비활성 이유를 title/보조 텍스트로 반드시 표기** |

completed와 excluded는 같은 취소선을 쓰되 **토글의 모양이 다르다**(사각 채움 vs 텍스트 버튼). 같은 색 채움을 쓰지 않는다.

## 6. Compact row anatomy [C]

```text
[ 완료 토글 30x30 ] [ 제목 14.5 / 1줄~2줄 ................ ] 
                    [ 메타 11.5 · 날짜 · 메모 있음 · 제외됨 ]
```
- 행 전체 최소 높이 48(터치 44 이상 보장).
- 행에 버튼은 최대 2개(완료 토글 + 행 본문). 세 번째 command는 detail로 보낸다.
- 오른쪽 chevron을 쓰지 않는다(행 전체가 열기라는 규칙으로 충분).

## 7. Detail sheet / inspector anatomy [C]

- 390: 하단 sheet, 최대 높이 82%, radius 18 상단, 닫기 버튼 36x36 좌상단 kicker 옆.
- 1024·1440: 오른쪽 inspector(고정 폭 300–340), sheet를 쓰지 않는다.
- 순서 고정: kicker(Flow 이름 · 섹션) → 제목 → 날짜 → 메모 → 완료 기준 → 완료 버튼.
- 완료 버튼은 sheet의 유일한 filled 버튼이고 항상 맨 아래.

## 8. Mobile / wide composition [C]

| 화면 | 390 | 1024 | 1440 |
| --- | --- | --- | --- |
| 찾기 | 단일 column | 카드 2열 | 카드 3열, 최대 폭 1200 |
| 공개 Flow | 결과 + 하단 고정 입력·시작 | 결과 canvas + 오른쪽 340 inspector(입력·시작) | 동일, canvas 최대 폭 760 |
| 조정 · receipt · 가져가기 | 단일 column | 중앙 720 | 중앙 720 |
| My Flow | 목록 | 목록 + 오른쪽 선택 미리보기 | master-detail |
| 개인 Flow | 다음 하나 + 구조 | 구조 canvas + 오른쪽 Item inspector | 동일 |
| Calendar | grid 위 / agenda 아래 | grid + 오른쪽 agenda pane | 동일, grid cell 높이 증가 |

wide에서 모바일 카드를 가로로 늘이지 않는다. 조정·receipt·가져가기는 **의도적으로 동일**하다 — 결정이 하나인 화면이라 두 pane이 필요 없다.

## 9. 이번 reset에서 하지 않는 것

- 색 팔레트 교체, 로고·브랜드 변경
- 아이콘 세트 도입(현재 텍스트 라벨로 충분하고, 아이콘 버튼은 accessible name 부채를 늘린다)
- 애니메이션 추가(전환은 상태 변화 즉시 반영 + 토스트로 충분)
