# P35-R6 Calendar 선택일 구성 audit

## 기존 문제

390px Calendar에서 선택일 agenda가 월간 grid 아래에 이어져 날짜를 누른 뒤 결과를
찾기 어려웠다. selected-day 행동이 페이지 스크롤 위치에 의존했고, Calendar 실행
맥락과 global bottom navigation이 경쟁했다.

## 변경

1. 모바일에서 날짜나 event를 누르면 공통 `FlowBottomSheet`를 연다.
2. 선택일 제목, Flow group, 완료 체크, `Flow에서 열기`를 시트 안에 둔다.
3. page scroll을 고정하고 시트 내부만 스크롤한다.
4. Escape와 닫기 후 날짜 trigger로 focus를 돌려준다.
5. 1024px에서는 기존 오른쪽 selected-day agenda를 그대로 유지한다.
6. 완료·다시 열기 알림은 시트가 열렸을 때만 notice layer를 올린다.

## 상태 및 소유권

| Layer | 결과 |
| --- | --- |
| source | 변경 없음 |
| personal overlay | 변경 없음 |
| execution run | 기존 완료/다시 열기 handler 재사용 |
| occurrence | 기존 Calendar row identity 재사용 |
| export | 변경 없음 |
| localStorage | key/schema/migration 변경 없음 |

## 브라우저 evidence

| viewport | 선택 결과 | focus/scroll |
| ---: | --- | --- |
| 390x844 | bottom sheet, 첫 row viewport 안 | sheet 내부 focus, body lock, Escape 후 날짜 복귀 |
| 1024x768 | right-side agenda | 기존 side composition 유지 |

## 품질 판정

- horizontal overflow: `0`
- bottom navigation overlap: `0`
- console/page error: `0`
- selected-day stable identity change: `0`
- Calendar data/projection change: `0`
- wide composition regression: `0`

Evidence kind는 current source, current browser automation, current package screenshot이다.
실제 관찰 사용자 수는 `0`이다.
