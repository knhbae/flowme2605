# P35-R3 Receipt and workspace continuity audit

## 변경 전

public 저장 완료 화면에서 `내 Flow에서 시작`과 `캘린더에서 보기`가 함께
노출됐고, My Flow의 legacy post-save hub에서는 첫 할 일, 전체 Flow,
Calendar, export 네 경로가 경쟁했다. public primary는
`/my?savedFlow={slug}`로 이동해 저장 완료 정보를 다시 보여줬다.

## 변경 후

1. public receipt의 source 링크는 provenance로 유지하되 명령은 한 개다.
2. `저장한 전체 Flow 보기`가 선택된 Flow workspace를 직접 연다.
3. mobile과 wide가 같은 href와 action label을 쓴다.
4. My Flow의 legacy handoff는 기존 URL 호환을 위해 유지하되 행동은
   `저장한 전체 Flow 보기` 한 개로 축소한다.
5. focused workspace에서 다음 날짜 묶음, 전체 계획, 기록, Calendar와
   export를 맥락에 따라 이어서 사용할 수 있다.

## 데이터 영향

- source Item 변경: 없음
- personal overlay 변경: 없음
- execution run 변경: 없음
- occurrence identity 변경: 없음
- export identity 변경: 없음
- localStorage schema/migration 변경: 없음
- 변경 범위: receipt composition과 route handoff

## Browser result

| Route/state | Viewport | 결과 | Evidence kind |
| --- | ---: | --- | --- |
| `/f/moving-d30-basic` 저장 완료 | 390x844 | primary 1, Calendar 경쟁 action 0 | current browser automation |
| `/my?view=flows&flow=moving-d30-basic` | 390x844 | 같은 Flow workspace 직접 선택 | current browser automation |
| `/f/moving-d30-basic` 저장 완료 | 1024x768 | primary 1, source provenance 유지 | current browser automation |
| `/my?view=flows&flow=moving-d30-basic` | 1024x768 | library/detail에서 같은 Flow 선택 | current browser automation |
| `/my?savedFlow=moving-d30-basic` | 390x844 | legacy hub primary 1 | current browser automation |

실제 관찰 사용자 수는 `0`이다.
