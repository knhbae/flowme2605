# FlowMe P35-03 One Adjustment Kind Evidence

- 작성일: 2026-07-26
- 기준 SHA: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- 작업 branch: `codex/p35-mece-ux-reset`
- acceptance marker: `P35-ADJUST-ONE-KIND`
- 판정: `pass`
- 실제 관찰 사용자 수: `0`

## 결과

public `/f/[slug]`의 저장 전 조정을 다음 네 종류로 분리했다.

- 이름
- 기준일 또는 이사일
- 포함 항목
- 반복

한 번에 하나의 조정 panel만 열리고, 현재 결과와 조정 후 결과를 같은 화면에서 비교한다. 변경 적용은 저장과 분리되며 취소 또는 `Escape`는 적용 전 값을 버리고 원래 `Flow 조정` trigger로 focus를 돌린다.

콘텐츠와 무관한 조정 종류는 숨긴다.

- 이사 Flow: 이름, 이사일, 포함 항목
- 날짜 없는 차량 점검: 이름, 포함 항목
- 반복 홈트: 이름, 시작일, 포함 항목, 반복

저장 전에는 항목별 제목·날짜·메모·순서 편집을 노출하지 않는다. 이 고급 개인 편집은 저장 후 My Flow의 기존 personal overlay와 structural overlay 경로를 사용한다.

포함 항목에서 24개 중 2개를 제외하면 actual result, 저장 CTA, export preflight가 모두 22개를 읽는다. source 24개는 삭제되지 않으며 기존 `personalExcluded` 계약만 사용한다.

새 localStorage key, schema, migration, 임시 settings object는 추가하지 않았다.

## Evidence

- [상세 audit](./audit.md)
- [route evidence](./route-evidence.json)
- [이름 조정 390px](./screenshots/p35-03-adjust-name-390.png)
- [기준일 조정 390px](./screenshots/p35-03-adjust-anchor-390.png)
- [포함 항목 조정 1024px](./screenshots/p35-03-adjust-items-1024.png)
- [반복 조정 1440px](./screenshots/p35-03-adjust-routine-1440.png)

## 검증

- `npm.cmd run docs:check`: pass, required 14 / local links 3189
- `npm.cmd test`: pretest 73/73, unit 590/590 pass
- `npm.cmd run build`: pass
- P35-03 targeted E2E: 5/5 pass
- 변경된 과거 여정 targeted E2E: 10/10 pass
- horizontal overflow: 0
- fixed command overlap: 0
- console/page error: 0
- 열린 조정 panel 최대 수: 1
- public 저장 전 항목별 고급 편집 control: 0
- source mutation: 0
- `git diff --check`: pass, line-ending warning only

자동화, screenshot, heuristic review는 실제 사용자 검증이 아니다.
