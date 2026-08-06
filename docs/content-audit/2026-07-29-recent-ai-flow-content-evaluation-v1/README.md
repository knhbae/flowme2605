# 최근 AI FLOW 콘텐츠 유용성·변환 품질 평가 v1

평가일: 2026-07-29  
평가 기준: archive `a8d977b1a968e102d7aa8bfc64598845c2302ccc`의 2026-07-29 Full-Corpus Lab  
판정 범위: 콘텐츠 논리와 실행 artifact. 실제 사용자 검증, 권리 승인, production 반영을 뜻하지 않는다.

## 결론

최근 신규 19건은 **원문 선택과 user job은 대체로 쓸 만하지만, 현재 상태 그대로 저장·실행할 수 있는 Public MVP 승인 후보는 0건**이다.

| 구분 | 결과 | 의미 |
|---|---:|---|
| Keep | 0 | Public MVP gate와 추적성 gate를 모두 통과한 후보 없음 |
| Revise | 11 | 같은 원문·user job을 유지한 bounded 수정으로 개선 가능 |
| Park | 8 | 원문 전체 행, child source, 지역 적용성 또는 activation 증거가 더 필요 |
| Reject | 0 | 원문이나 user job 자체를 폐기해야 할 후보는 없음 |
| 8차원 전체 평균 | 3.06 / 5 | Draft 경계 수준 |
| 평균 3.5 이상 | 4 / 19 | B04, C01, C02, C06 |
| Execution Clarity 4 이상 | 0 / 19 | 공통 `doneWhen` 부재가 가장 큰 원인 |
| Source/Safety 4 이상 | 3 / 19 | B04, B07, C01 |
| 실제 관찰 사용자 | 0 | 내부 review·validator·browser QA만 존재 |

따라서 질문에 대한 직접 답은 다음과 같다.

- **사용자에게 쓸 만한가?** 17개 실행형 후보는 내부 프로토타입·수정 후보로 쓸 만하다. 특히 `한 공간 정리정돈`, `코딩테스트 Kit`, `호스 커넥터 교체`, `Lemon drizzle cake`는 평균 3.75로 가장 가깝다.
- **제대로 FLOW화했는가?** 아직 아니다. 원문 행을 Item으로 옮기는 데는 성공했지만, 완료 기준·안전 경계·정식 SourceRef·개인 일정 연결까지 포함한 실행 계약은 완성하지 못했다.
- **AI가 원문에 없는 행동을 대량 발명했는가?** 신규 실행형 17건의 225 Items는 모두 `sourceRowIds`와 직접 연결돼 대량 발명 징후는 없다. 다만 일부 원문이 부분 캡처이고, 잘못된 목적지·계층 평탄화·조건문을 Todo로 활성화한 문제가 있다.

## 평가 대상 확정

7월 29일 직접 확인한 신규 URL 24건을 출발점으로 삼았다.

| 처리 | 수 | 내용 |
|---|---:|---|
| 신규 정상 평가 | 19 | 실행형 FLOW 17건 + field-template 2건 |
| 기존 user job에 병합 | 3 | 출생신고, 국내여행 준비물, 해외여행 준비물 |
| Historical 제외 | 1 | 2026 취학통지·예비소집 |
| Boundary 제외 | 1 | roadmap.sh 루트 |

전체 Gallery 156건은 이전 91건과 historical preview 45건이 섞이므로 이번 “최근 만든 콘텐츠”의 분모로 사용하지 않았다.

## 공통 구조 감사

| 검사 | 결과 | 판정 |
|---|---:|---|
| SourceRow | 290 | frozen snapshot 근거 존재 |
| Canonical Item | 225 | 17개 실행형 후보 |
| Item → `sourceRowIds` 직접 연결 | 225 / 225 | 원문 행 추적 가능 |
| Item → canonical `SourceRef` 객체 | 0 / 225 | Keep 차단 |
| 관찰 가능한 `doneWhen` | 0 / 225 | Execution Clarity 4 불가 |
| Item schedule | 0 / 225 | 날짜가 필요한 후보도 personal activation 미완성 |
| `cautionMemoIds` 연결 | 0 / 225 | 안전 요구 12건의 경계가 readiness 문자열에만 존재 |
| Primary destination이 빈 후보 | 2 / 19 | A01·C05 Sheet가 generated지만 0행 |
| Production runtime import | 0 / 19 | 정적 research gallery에만 존재 |

부분 캡처 4건은 source row omission disposition이 없으므로 원문 전체 충실성을 증명하지 못한다.

- A01 결혼 추가금: `12/110`
- A02 단체관람: `12/30`
- A08 종합소득세: `10/20+`
- B06 레몬 위크엔드: `12/19`

## 항목별 평가표

점수 순서는 `필요 적합 / 실행 명확 / 원문 충실 / 이동성 / 인지 부하 / 문구 구체성 / 출처·안전 / 조작 가능`이다.  
`Park`는 원문 가치가 없다는 뜻이 아니라, 현재 증거로는 수정 범위를 닫을 수 없다는 뜻이다.

| No. | FLOW·원문 | Source row → 구조·목적지 | 첫 행동·완료 상태 | 8차원 점수 · 평균 | Hard fail·최저점 | 판정·우선 수정 | 사용자 증거 |
|---:|---|---|---|---|---|---|---|
| A01 | [서울시 결혼 준비 추가금 체크 110선](https://news.seoul.go.kr/economy/archives/562367) | `12/110` → `0 Step / 0 Item` · Sheet `0행` | 첫 행동 없음 · 완료 N/A | `4/1/2/1/2/2/3/2` · **2.13** | `QH-04`, `QH-05` · 110선 주장과 빈 결과 | **Park** · 전체 110행 확보 또는 12행 샘플로 제목 축소, 실제 견적 Sheet activation | 0 |
| A02 | [서울상상나라 단체관람](https://www.seoulchildrensmuseum.org/news/boardView.do?bbsCnum=300&id=935) | `12/30` → `4 Step / 12 Item` · Checklist | 홈페이지 사전 예약 · `doneWhen 0/12`, 날짜 `0/12` | `5/2/4/3/3/2/2/3` · **3.00** | `QH-03` · 누락 18행, 인솔 주의 미연결 | **Park** · 30행 disposition, 예약·승인·당일 날짜 연결, 아동 인솔 caution | 0 |
| A03 | [전세 계약 단계별 체크](https://contents.kakaopay.com/contents/2056) | `8/8` → `3 Step / 8 Item` · Checklist | 주변 시세 비교 · `doneWhen 0/8` | `5/2/4/3/3/2/2/3` · **3.00** | `CH-09` · checkbox가 법률 안전 판정을 대신할 위험 | **Revise** · 증빙 상태·공식 확인처·전문가 중단 조건 | 0 |
| A05 | [집 소방시설 점검](https://nfa.go.kr/nfa/safetyinfo/residentialfire/residentialfire/) | `11/11` → `3 Step / 11 Item` · Checklist | 설치 대상 범위 확인 · `doneWhen 0/11` | `5/2/4/3/2/2/2/3` · **2.88** | `QH-03`, `CH-09` · 설치·사실·대응 혼합, 안전 기준 없음 | **Revise** · 설치/검사/교체 상태 분리, 전문가 점검 중단 조건 | 0 |
| A07 | [장애인 버스요금 지원](https://news.seoul.go.kr/welfare/dsbus/ko/conts/view.do?menuId=K_USAGE_INFO) | `7/7` → `1 Step / 7 Item` · Checklist | 신청자격 체크리스트 · `doneWhen 0/7` | `5/2/4/3/4/2/2/3` · **3.13** | `QH-06` · 상세·receipt·PII 경계 없음 | **Revise** · 신청 유형별 서류, 공식 사이트 전환, 접수 상태를 완료 기준으로 | 0 |
| A08 | [종합소득세 신고 여부·기한](https://b.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7664&mi=2224) | `10/20+` → `1 Step / 10 Item` · Todo | 세법 조건문 자체가 첫 Todo · due `0/10` | `5/1/2/2/2/2/1/2` · **2.13** | `QH-04`, `CH-09` · 조건 판정 전 Todo 활성화 | **Park** · 전체 조건 재캡처, 적용 분기 후 해당 Todo·due만 생성 | 0 |
| B03 | [냉장고 파먹기 평일 5일](https://ohou.se/advices/8086) | `5/5` → `5 Step / 5 Item` · Sheet | 월요일 두 메뉴 · `doneWhen 0/5` | `4/2/4/4/4/2/3/3` · **3.25** | 없음 · 레시피·장보기·완료 정보 부족 | **Revise** · 메뉴별 링크·장보기 상태, weekStart가 있을 때만 날짜 계산 | 0 |
| B04 | [한 공간 정리정돈 7단계](https://ohou.se/advices/28) | `7/7` → `1 Step / 7 Item` · Checklist | 어디부터 시작할지 정하기 · `doneWhen 0/7` | `5/3/4/4/4/3/4/3` · **3.75** | 없음 · 완료 기준·SourceRef 부재 | **Revise** · 공간명 personal overlay, 사진·분류·수납 상태를 doneWhen으로 | 0 |
| B05 | [신박 수납 프로젝트 5개](https://ohou.se/advices/9345) | `5/5` 제목만 → `1 Step / 5 Item` · Todo | 쓰레기 봉투 수납 · child 절차 없음 | `3/2/4/3/4/2/2/3` · **2.88** | `QH-06` · 프로젝트명만 있고 다음 행동 없음 | **Park** · 루트는 선택 큐, 선택 후 child source를 별도 import | 0 |
| B06 | [레몬 위크엔드 베이킹](https://wtable.co.kr/recipes/YVHyCaPf13UspJnCxQyBDroh) | `12/19` → `2 Step / 12 Item` · Checklist | 달걀 실온 준비 · 반죽 합치기에서 끝남 | `4/2/2/3/3/2/2/3` · **2.63** | `QH-04` · 완결 세션을 약속하지만 굽기·완성 누락 | **Park** · 19행 전체, 오븐 주의, 굽기·식힘 완료 기준 | 0 |
| B07 | [인테리어 상담·견적 비교](https://ohou.se/advices/12360) | `6/6` → `1 Step / 6 Item` · Checklist | 공사 방식 이해 · `doneWhen 0/6` | `5/2/4/3/3/2/4/3` · **3.25** | 없음 · 비교 user job에 Checklist만으로 부족 | **Revise** · 준비는 Checklist, 업체별 범위·견적·평가는 Sheet | 0 |
| B08 | [밑반찬 10종 주간 비축](https://ohou.se/advices/8563) | `5/5` → `5 Step / 5 Item` · Checklist | 월요일 두 반찬 · `doneWhen 0/5` | `4/2/3/3/3/2/3/3` · **2.88** | 없음 · 두 반찬을 한 완료 단위로 묶음 | **Revise** · 반찬 10개를 독립 Item으로, 요일은 pacing으로 | 0 |
| C01 | [코딩테스트 Kit 47문제](https://school.programmers.co.kr/learn/challenges?tab=algorithm_practice_kit) | `47/47` → `10 Step / 47 Item` · Todo | 완주하지 못한 선수 · `doneWhen 0/47` | `5/3/5/4/3/3/4/3` · **3.75** | 없음 · 완료·계정 권한·SourceRef 부재 | **Revise** · 문제 URL·난이도 유지, 채점 통과/풀이 기록 완료 기준 | 0 |
| C02 | [정원 호스 커넥터 교체](https://www.ifixit.com/Guide/How+to+Fix+a+Leaking+Garden+Hose+Connector/189188) | `6/6` → `1 Step / 6 Item` · Checklist | 호스 분리 · `doneWhen 0/6` | `5/3/5/4/4/4/2/3` · **3.75** | `QH-03` · 칼·플라이어·규격 주의 없음 | **Revise** · 급수 분리·보호·중단 조건, 5/8 규격, 누수 없음 완료 기준 | 0 |
| C03 | [Ice Age Trail Junior Ranger](https://www.nps.gov/iatr/learn/kidsyouth/junior-ranger.htm) | `12/12` → `2 Step / 12 Item` · Checklist | FOOTSTEPS OF MAMMOTHS · `doneWhen 0/12` | `4/3/4/3/3/3/2/3` · **3.13** | `QH-03` · 보호자·야외·지역·privacy 경계 없음 | **Park** · 활동 장소 분리, 보호자 주의, Wisconsin·asset 적용성 검토 | 0 |
| C04 | [Origami for Everyone](https://www.instructables.com/Origami-For-Everyone/) | `41/41` → `1 Step / 41 Item` · Todo | Open Cube Modular Origami · child 링크만 있음 | `4/3/3/4/3/3/3/3` · **3.25** | 없음 · 소개 30 vs 목록 41, 제작자별 권리 | **Park** · 날짜 있는 41-link snapshot으로 명명, 선택 후 child import | 0 |
| C05 | [Cold Food Storage Chart](https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts) | `53/53` → `0 Step / 0 Item` · Sheet `0행` | 첫 행동 없음 · activation 없음 | `5/1/4/1/2/2/2/2` · **2.38** | `QH-04`, `QH-05` · generated Sheet가 비어 있음 | **Park** · 53행 Sheet, 식품·상태·기준일 activation, 한국 적용성 검토 | 0 |
| C06 | [Lemon drizzle cake](https://www.bbcgoodfood.com/recipes/lemon-drizzle-cake) | `8/8` → `1 Step / 8 Item` · Checklist | 오븐 예열 · `doneWhen 0/8` | `5/3/5/4/4/4/2/3` · **3.75** | `QH-03` · 오븐·알레르기·영국 단위 경계 없음 | **Revise** · 화상·알레르기 주의, fan oven 단위, 굽기·식힘 완료 기준 | 0 |
| C08 | [Podcast Workflow](https://www.todoist.com/templates/podcast-workflow) | `23/23` → `4 Step / 23 Item` · Checklist | 1-page overview 작성 · `doneWhen 0/23` | `5/3/3/3/2/4/3/3` · **3.25** | 없음 · Todo parent/subtask를 평탄화하고 장비 중복 | **Revise** · Todo primary, 원문 계층·집계 보존, 연락처 private overlay | 0 |

## Hard fail 해석

| 코드 | 이번 평가에서의 의미 |
|---|---|
| `QH-03` | 위험 행동 또는 민감 판단의 주의·중단 기준이 실행 화면에 없음 |
| `QH-04` | 제목·generated 상태가 약속한 결과와 실제 결과가 다름 |
| `QH-05` | 주요 행동의 자연스러운 목적지가 비었거나 불명확함 |
| `QH-06` | 이름·기능만 있고 사용자의 다음 행동과 완료 결과를 말하지 않음 |
| `CH-09` | 법률·세무·안전 판단을 체크 완료가 대신하는 것처럼 보임 |

Hard fail이 있다고 자동 Reject하지 않았다. 같은 원문과 user job으로 고칠 수 있으면 Revise, 전체 source import·지역 적용성·child source가 더 필요하면 Park로 두었다.

## 우선 수정 순서

### 1. 공통 변환 계약부터 고친다

1. `Item.sourceRowIds` 직접 연결을 정식 `SourceRef`와 source locator로 승격한다.
2. 225개 Item에 source-specific `doneWhen`을 만들되 원문에 없는 결과는 발명하지 않는다.
3. 안전 요구 12건의 caution·중단 조건을 readiness 문자열에서 실제 Item/Memo/export로 이동한다.
4. 사용자 날짜가 필요한 후보만 overlay 이후 schedule을 생성하고 날짜 없는 Item에는 VEVENT를 만들지 않는다.
5. primary projection이 `generated`이면 destination record가 1개 이상인지 gate로 막는다.

### 2. 첫 수리 파동

| 우선 | 후보 | 이유 | 목표 |
|---:|---|---|---|
| 1 | B04 한 공간 정리정돈 | 안전·권리 외 구조 위험이 가장 낮음 | 완료 기준을 붙여 첫 internal approval candidate로 |
| 2 | C01 코딩테스트 Kit | 47/47 원문·분류·Todo fit이 강함 | URL·채점 완료·parent/child 표현 보강 |
| 3 | C02 호스 수리 | 원문·절차·문구가 강함 | 도구 안전·부품 규격·라이선스 경계 |
| 4 | C06 Lemon drizzle cake | 8/8 원문·절차·문구가 강함 | 오븐·알레르기·단위·완료 기준 |
| 5 | A07 버스요금 지원 | user need와 7단계가 명확함 | 공식 사이트·PII·receipt 계약 |

### 3. Park 해제 조건

- A01: 110개 전체 source row 또는 정직한 12개 샘플 범위
- A02: 30개 전체 row disposition과 관람일·아동 인솔 계약
- A08: 세무 조건 전체와 개인별 applicability 분기
- B05: 선택한 프로젝트의 child source
- B06: 19개 전체 조리 행
- C03: 지역·보호자·asset·privacy 적용성
- C04: 30/41 freshness와 제작자별 권리
- C05: 실제 Sheet activation과 한국 식품안전 적용성

## 검증 경계

- 원문 평가는 archive의 2026-07-29 frozen snapshot과 captured SourceRow를 기준으로 했다.
- 고위험·시효성 원문의 현재 상태를 live re-fetch하지 않았다. A03·A05·A07·A08·C05는 public 승격 전에 반드시 다시 확인해야 한다.
- full-corpus의 내부 validator·agent review·browser QA는 artifact QA다. 사용자 저장·첫 행동·완료·재방문을 관찰한 세션은 0건이다.
- 신규 19건은 `research_only`이며 앱 runtime, seed, DB, API, public `/f`에 반영되지 않았다.
- 이 평가 작업에서도 앱 코드, seed, canonical runtime logic, commit, push, PR, merge, deploy를 변경하지 않았다.

## 근거

- 신규 24건·원문 행: `docs/specs/2026-07-29-flow-content-ui-full-corpus-validation-handoff-v1/new-source-verification-v1.json`
- 포함·중복·제외: `docs/specs/2026-07-29-flow-content-ui-full-corpus-validation-handoff-v1/corpus-inclusion-exclusion-v1.json`
- 실제 Flow·Step·Item: `docs/specs/2026-07-29-flow-content-ui-full-corpus-validation-handoff-v1/content-ui-view-model-v1.json`
- projection 결과: `docs/specs/2026-07-29-flow-content-ui-full-corpus-validation-handoff-v1/projection-ui-results-v1.json`
- 내부 재판독: `docs/specs/2026-07-29-flow-content-ui-full-corpus-validation-handoff-v1/content-value-readjudication-v1.json`
- 수동 semantic provenance: `docs/specs/2026-07-29-flow-content-ui-full-corpus-validation-handoff-v1/semantic-provenance-manual-adjudication-v1.json`
- Gallery: `docs/content-audit/2026-07-29-flow-content-ui-full-corpus-gallery-v1-ko.html`
- 평가 데이터: [evaluation-matrix.json](./evaluation-matrix.json)

위 정본 입력은 `D:/flowme2605/flow-content-logic-final`의 archive `a8d977b`에 있다. 이 README와 matrix만 현재 `flow-mvp`에서 새로 작성한 평가 산출물이다.
