# FlowMe P35-02 Public Result-first Evidence

- 작성일: 2026-07-26
- 기준 SHA: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- 작업 branch: `codex/p35-mece-ux-reset`
- acceptance marker: `P35-PUBLIC-RESULT-FIRST`
- 판정: `pass`
- 실제 관찰 사용자 수: `0`

## 결과

public `/f/[slug]` 저장 전 화면을 콘텐츠 설명과 설정 중심 구성에서 실제 결과 중심 구성으로 바꿨다.

화면 순서는 다음과 같다.

1. Flow 제목과 원문
2. 저장될 실제 결과와 항목 수
3. 날짜 범위, 날짜 없음, 반복 일정 요약
4. 필요한 경우에만 최소 입력
5. 결과 수량을 포함한 주 행동

대표 콘텐츠는 자연스러운 결과 형태 하나만 우선한다.

- 이사 준비: Calendar 24개
- 차량 점검: 날짜 없는 Checklist 10개
- 홈트 루틴: 반복 Flow 실행 1개
- 중1 수학 목차: Sheet 8개

저장 전 화면에 있던 결과 형태 탭, 3개 요약 칩, 중복 `전체 흐름`, 중복 세부 실행 목록을 제거했다. 전체 항목은 같은 실제 결과 영역에서 처음 3개를 먼저 보여주고 나머지를 펼쳐 확인한다.

저장 성공 후에는 입력과 저장 명령을 제거하고 별도 receipt frame으로 전환한다. source, sourceTrace, 안전·권리 정보와 Flow 단위 export는 기존 보조 경로를 유지한다.

저장 key, schema, canonical identity, personal overlay, execution run, occurrence, export identity는 변경하지 않았다.

## Evidence

- [상세 audit](./audit.md)
- [route evidence](./route-evidence.json)
- [이사 저장 전 390px](./screenshots/p35-02-moving-save-before-390.png)
- [날짜 없는 차량 점검 저장 전 390px](./screenshots/p35-02-undated-save-before-390.png)
- [반복 홈트 저장 전 1024px](./screenshots/p35-02-routine-save-before-1024.png)
- [학습 Sheet 저장 전 1440px](./screenshots/p35-02-learning-save-before-1440.png)
- [이사 저장 후 receipt 390px](./screenshots/p35-02-moving-receipt-390.png)

## 검증

- `npm.cmd run docs:check`: pass, required 14 / local links 3183
- `npm.cmd test`: pretest 73/73, unit 590/590 pass
- `npm.cmd run build`: pass, `.next/BUILD_ID` present
- P35-02 targeted E2E: 6/6 pass
- 관련 public, Calendar, My Flow, export 회귀 E2E: 119/119 pass
- root/catalog/routine targeted E2E: 4/4 pass
- `git diff --check`: pass, line-ending warning only
- horizontal overflow: 0
- fixed command overlap: 0
- console/page error: 0
- 저장 전 completion control: 0
- 실제 결과 형태 선택 탭: 0
- 중복 전체 Flow heading: 0

자동화, screenshot, heuristic review는 실제 사용자 검증이 아니다.
