# P26-07 audit

## 원인

P26-02에서 route와 count correctness는 고정됐지만 기존 receipt는 `바로 시작`과 `내 Flow 열기`만 제공했다. Calendar와 export는 receipt 밖에서 저장한 Flow를 다시 찾아야 했고, 날짜형·날짜 없음·반복·다중 Flow가 같은 성공 카드로만 보였다.

## 구현

### 공통 허브

`PostSaveDecisionHub`가 success status, Flow 제목, compact metrics, whole-Flow outline, 다음 행동을 한 프레임으로 구성한다. mobile DOM order는 receipt -> metrics -> actions -> outline이며 wide에서는 outline과 action rail을 두 열로 배치한다.

### 공통 요약

`buildPostSaveDecisionSummary`는 canonical receipt와 동일한 effective item을 입력으로 받는다. valid local date만 날짜 범위에 포함하고 malformed date는 행을 삭제하지 않고 날짜 없음으로 남긴다. recurrence occurrence 여러 개는 같은 series key를 한 번만 센다.

### export

single Flow는 action hub에서 현재 Flow 전체 export panel을 직접 연다. multi-Flow는 child Flow 제목과 effective count를 먼저 고른다. 기존 `FlowExportPanel` builder와 destination 정책을 재사용했고, source/personal overlay/run/occurrence schema는 바꾸지 않았다.

### focus

export를 열면 export region으로 focus가 이동하고 닫으면 `가져가기` 버튼으로 돌아간다. receipt에서 workspace로 이동하면 post-save panel이 사라진 뒤 workspace가 focus target이 된다.

## 시나리오

| 시나리오 | route | viewport | 결과 | evidenceKind |
| --- | --- | ---: | --- | --- |
| public 날짜 없음 | `/f/vehicle-inspection-prep -> /my?savedFlow=...` | 390 | 10개, 날짜 없음 10개, 4개 경로, Flow 전체 export | current_browser |
| 기준일 역산형 | `/flow-maps/moving-d30 -> /my?savedMap=...` | 1024 | 5개, 기간·2단계, 첫 항목 시작 | current_browser |
| multi-Flow | `/flow-maps/curated-opic-mock-course` | 1024 | 2 Flow/19개, Flow별 export picker | current_browser |
| URL-first hit | `/flows -> /my?savedMap=middle-school-math-1` | 1024 | canonical receipt parity | current_browser |
| 메모 draft | `/flows -> /my?savedFlow=url-draft-*` | 390 | 3개, dated 1/undated 2 | current_browser |
| review held | `/my?demo=source-backed&savedMap=baby-health-schedule` | 390 | 전체 보관 artifact, execution action 0 | current_browser |

## 회귀

- reload는 저장 record를 다시 만들지 않는다.
- held Flow의 기존 실행 차단을 유지한다.
- post-save outline은 completion control을 만들지 않는다.
- 실제 completion은 workspace row 왼쪽 checkbox에서만 시작한다.
- existing export builder, Calendar projection, source-backed records는 변경하지 않는다.
- 전체 Flow 회귀 1차에서 접근성 트리에 `저장된 전체 Flow` heading이 두 번 노출되는 1건을 발견했다. 숨은 중복 heading을 제거했고 해당 IA 시나리오와 hub 전용 시나리오 `5 / 5`가 통과했다.
- public 교차 테스트는 P26-06 이후의 read-only preview/detail control을 completion control로 간주하던 낡은 assertion을 제거했다. 저장 전 completion checkbox `0`, 항목 단위 export `0`, Flow 단위 export secondary는 그대로 검증한다.
- 5개 파일 병렬 실행에서 발생한 route/click timeout은 단일 worker 재실행에서 재현되지 않았고 관련 묶음 `46 / 46`이 통과했다.

## 잔여 위험

1. 긴 Flow는 receipt에서 모든 row를 보여 여전히 길다. P26-09에서 phase disclosure와 adaptive outline이 필요하다.
2. multi-Flow aggregate export 계약은 아직 없다. P26-16 전까지 Flow별 범위를 명시한다.
3. 저장 직후 개인 조정은 전체 Flow workspace를 거쳐야 한다. quick editor는 P26-10/11에서 연결한다.
4. 실제 사용자가 네 경로의 hierarchy를 이해하는지는 아직 관찰하지 않았다.
