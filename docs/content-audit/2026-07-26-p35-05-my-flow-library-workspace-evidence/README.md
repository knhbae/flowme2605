# FlowMe P35-05 My Flow Library / Focused Workspace Evidence

- 작성일: 2026-07-26
- 기준 SHA: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- 작업 branch: `codex/p35-mece-ux-reset`
- 판정: `pass`
- 실제 관찰 사용자: `0`

## 결과

`/my`를 저장한 Flow를 찾는 라이브러리와 한 Flow에 집중하는 작업 공간으로
단순화했다. 기존 상위 `지금`, `완료` 화면은 제거하고 완료 항목도 선택한
Flow의 전체 계획 안에서 확인하고 다시 열도록 했다.

모바일에서는 한 행에 Flow 제목, 진행, 다음 행동, 열기 한 가지 명령만 둔다.
Flow를 열면 다음 행동, 전체 계획, 기록을 같은 객체 문맥에서 전환한다.
와이드에서는 라이브러리 레일과 선택한 Flow 캔버스를 분리하되 별도의 데이터
모델이나 저장 경로를 만들지 않았다.

## Acceptance marker

- `P35-MY-LIBRARY-ONLY`
- `P35-PERSONAL-SINGLE-FOCUS`

## 규모별 확인

| 상태 | 결과 |
| --- | --- |
| 1 Flow, 390px | 검색/필터를 숨기고 compact row 1개와 open action 1개 |
| 5 Flow, 390px | 같은 row 문법 유지 |
| 20 Flow, 390px | 첫 8개 표시, 검색/상태 필터, 나머지 12개 점진 노출 |
| 20 Flow, 1024px | library rail 20개 + 선택한 Flow canvas |
| 60 Flow, 1440px | bounded searchable rail 60개, row command 1개 |

## Evidence

- [상세 audit](./audit.md)
- [route evidence](./route-evidence.json)
- [1 Flow 모바일](./screenshots/p35-05-my-library-1-390.png)
- [20 Flow 모바일](./screenshots/p35-05-my-library-20-390.png)
- [선택한 Flow 모바일](./screenshots/p35-05-personal-flow-390.png)
- [20 Flow 와이드 작업 공간](./screenshots/p35-05-my-library-workspace-1024.png)
- [60 Flow 데스크톱 라이브러리](./screenshots/p35-05-my-library-60-1440.png)

## 현재 slice 검증

- P35-05 전용 E2E: 5/5 pass
- P24 완료/다시 열기 회귀: 1/1 pass
- P25 whole Flow workspace: 3/3 pass
- P26 My Flow local IA: 4/4 pass
- P34 lifecycle 및 관련 회귀: 5/5 pass
- P35-04 My Flow/Calendar split 회귀: 2/2 pass
- production build: pass
- 390/1024/1440 horizontal overflow: 0
- visible unnamed interactive control: 0
- console/page error: 0

자동화, fixture, screenshot 검증은 실제 사용자 관찰이 아니다.
