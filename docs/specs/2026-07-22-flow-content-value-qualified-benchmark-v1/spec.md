# Flow Content Value-Qualified Benchmark v1

## 한 줄 결론

이 벤치마크는 URL을 Flow로 바꾸는 능력보다 먼저, **원문 링크만 저장하는 것보다 실행 가치가 커지는 원문만 고르는 능력**을 검증한다.

## 왜 다시 하는가

`2026-07-21-flow-content-generalization-benchmark-v1`은 낯선 형식과 경계에서 변환기가 멈추는지를 본 Conversion Stress Test다. 신규 URL과 source format 다양성은 확보했지만, 정상 후보에 단일 설정법·단일 영상·단일 레시피처럼 FlowMe가 유지할 실행 상태가 약한 사례가 섞였다. 그 결과는 수정하거나 덮어쓰지 않는다.

이번에는 다음 순서를 동결한다.

1. 후보 발굴
2. 가치 admission
3. source·rights·locale·safety gate
4. 통과 후보 안에서만 형태 다양화
5. calibration/final holdout 동결
6. 세 방식의 블라인드 변환
7. 변환 정확도와 원문 대비 가치의 독립 재검토

## 핵심 질문

- 사용자가 이 원문을 저장하고 다시 돌아올 이유가 있는가?
- Flow가 일정, 반복, 진도, 결정 상태, 실행 체크, 인계 또는 export를 새로 제공하는가?
- 원문 값을 다시 입력하지 않고 0~2개 개인값만으로 시작할 수 있는가?
- 제작자·제공자에게 source-link, 수정, 재사용, 배포의 이익이 설명되는가?
- 행·권리·지역성·안전 근거가 부족할 때 멈추는가?

## 범위

### 포함

- 기존 내부 ledger와 신규 실제 URL을 합친 30~40개 후보 풀
- positive 12개와 boundary control 6개
- rules, low-cost role, high-capability role의 독립 결과
- SourceRow, canonical Item, 최소 입력, projection, provenance, gate, value delta 평가
- JSON·schema·validator·테스트·한국어 HTML 보고서

### 제외

- 앱 runtime, DB, crawler, production LLM API
- Input Composer 및 기존 앱 UX 변경
- 기존 benchmark 결과 수정
- 실제 제작자 허가, 공개 배포, 관찰 사용자 검증
- commit, push, PR, merge, deploy

## 가치 admission 계약

총점은 100점이며, 아래 여섯 축은 서로 대체할 수 없다.

| 축 | 배점 | 확인하는 것 |
|---|---:|---|
| visibleDemand | 20 | 화면에 보이는 조회·저장·평점·신청 규모 또는 공식 고의도 근거 |
| interaction | 20 | 댓글·질문·리뷰·다운로드·반복 참여. 공식 콘텐츠는 의무·손실·갱신 신호로 대체 가능 |
| sourceRowFeasibility | 15 | 실제 행과 provenance를 확보해 행동을 발명하지 않을 수 있는가 |
| creatorBusinessValue | 20 | source-link·업데이트·공유·재사용·전환 경로가 있는가 |
| flowValueDelta | 20 | 링크 저장보다 일정·진도·상태·결정·실행·인계 가치가 명확한가 |
| portfolioExpansion | 5 | 이미 강한 조합을 반복하지 않고 새 user moment를 검증하는가 |

Positive 후보는 80점 이상이어야 하며 다음 hard gate를 모두 통과해야 한다.

- source: 실제 원문과 충분한 행이 확보됨
- rights: 내부 개인용 변환과 공개 가능성을 별도로 기록하고, 허가 없는 재배포를 하지 않음
- locale: 한국 사용자 적용 범위가 확인되거나 비민감한 선택형 콘텐츠임
- safety: 의료·법률·재무·안전 판단을 대체하지 않으며 필요한 검토가 잠김
- oneJob: 한 원문에서 한 사용자 일을 설명할 수 있음
- naturalArtifact: Calendar, Checklist, Todo, Sheet, Memo 중 자연스러운 주 결과물이 있음

`rights pass`는 공개 허가 완료를 뜻하지 않는다. 내부·개인용 링크 기반 변환을 합법적 범위에서 평가할 수 있고, `publicReleaseAllowed`가 별도 잠겨 있음을 뜻한다.

## Value Delta Gate

다음 중 하나 이상의 유지 상태가 있어야 한다.

- 날짜창이나 사용자 기준일로 계산되는 일정
- 반복 주기와 다음 실행 시점
- 여러 행의 진도와 현재 위치
- 비교 기준·선택·보류 이유
- 준비·실행·완료 상태
- 담당자·인계·후속 확인
- 기존 도구로 내보낼 구조화된 행

단순 요약, 한 번 읽고 끝나는 조언, 원문 링크와 사실상 같은 자료 모음은 positive가 아니다.

## 세트 구성

- Positive calibration: 8
- Positive final holdout: 4, 모두 기존 변환 실험에 쓰지 않은 신규 URL
- Boundary calibration: 4
- Boundary final holdout: 2

Positive 12개는 한국어 8개 이상, 제작자·커뮤니티 4개 이상, 공식 고의도 4개 이상을 만족한다. 같은 artifact와 user moment 조합은 최대 2개다. 기존 8개 설계 사례와 이전 18개 benchmark 사례는 positive에서 제외한다.

## 블라인드 독립성

생성 패킷에는 URL·원문 snapshot·SourceRow·허용 입력·공통 규칙만 포함한다. admission 점수, positive/boundary 라벨, gold artifact, 다른 역할 결과는 제공하지 않는다. 각 run에는 역할, 입력·출력 문자 수, 처리 시간, retry, 사람 개입 횟수를 기록한다. 실제 provider token·비용을 측정하지 못하면 추정값을 사실처럼 기록하지 않는다.

## 평가

### 선정

- 80점 이상 positive 비율
- demand 또는 공식 고의도 근거 보유율
- 제작자·커뮤니티 interaction 근거 보유율
- creator/business hypothesis 보유율
- value delta가 명확한 비율
- 구성 조건 충족률
- 탈락 이유 완결성

### 변환

- Flow 가능 여부 일치율
- boundary recall
- SourceRow 의미 보존율
- Item provenance 충족률
- 행동·날짜·반복·완료 기준 발명 수
- source 값 재입력 수
- primary artifact 일치율
- 일정 없는 ICS 수
- gate 누락 수
- Item 삭제·대수정 비율
- 바로 사용 가능한 결과 비율

### 가치 재검토

- 링크 저장보다 낫다
- 첫 행동이 보인다
- 다시 돌아올 상태가 있다
- 기존 도구로 자연스럽게 export된다
- 0~2개 입력으로 시작한다
- creator/source-link loop가 설명된다

이는 내부 전문가 판정이며 실제 사용자 save intent가 아니다.

## 판정 상태

- `go`: source fidelity와 value delta가 모두 충분함
- `modify`: 가치 후보지만 artifact, 압축, gate 또는 문구의 경미한 수정 필요
- `hold`: 가치나 근거가 부족해 positive로 쓰지 않음
- `source_import_required`: 실제 행을 더 확보해야 함
- `blocked`: 접근·권리·지역·안전 조건 때문에 변환하면 안 됨

## 산출물 계약

모든 machine-readable 산출물은 `benchmark-v1.schema.json`과 `validator`로 다음을 검증한다.

- ID와 URL 고유성
- 점수 합산과 80점 hard gate
- 12 positive / 6 boundary 및 split 고정
- 기존 8개·이전 18개 positive 재사용 금지
- 각 Item의 SourceRow provenance
- 최소 입력 0~2개
- 일정 없는 ICS 금지
- 권리와 공개 가능성 분리
- final holdout 이후 규칙 변경 금지
- 자동 QA를 사용자 검증으로 표현하지 않음

## 증거 경계

- 확인된 사실: 원문에서 직접 본 행·수치·접근 상태 또는 저장소에 캡처된 관찰 기록
- 내부 판정: 사용자 job, value delta, artifact, Go/Modify/Hold
- 가설: 제작자·사업 가치와 예상 재방문 경로
- 미검증: 실제 save intent, 전환율, 제작자 허가, provider 비용
