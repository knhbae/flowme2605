# Flow Content Generalization Benchmark v1

작성일: 2026-07-21
상태: 완료 · final holdout 기준 미달
범위: source 조사, gold contract, 독립 변환, machine-readable 비교, validator, 정적 HTML 보고서

## 목표

기존 8개 설계 사례로 만든 변환 규칙을 처음 보는 실제 원문 18개에 적용해 일반화 가능성을 검증한다.

```text
실제 원문
→ SourceRow와 확보 경계
→ Flow 가능 여부
→ canonical Item
→ 최소 사용자 입력
→ Calendar / Checklist / Todo / Sheet / Memo
→ source / rights / locale / safety / privacy gate
```

정상 후보만 잘 만드는 것이 아니라 원문이 부족하거나 실행 job이 없는 콘텐츠에서 `source_import_required`, `hold`, `blocked`로 정확히 멈추는 능력을 같은 비중으로 본다.

## 기존 8개와의 경계

이사, K-MOOC, LibriVox, 성인 여권 재발급, 세탁조 조건형 관리, 에어컨 세척 결정, 농작업 폭염 대응, Todoist 로그인 원문 경계는 baseline 회귀 근거일 뿐 새 18개에 포함하지 않는다.

현재 Input Composer HTML과 UX v1.1 산출물은 다른 세션 소유다. 이번 작업은 그 파일을 수정하지 않는다.

## 사전 동결

새 source를 검색하기 전에 다음을 동결했다.

- [baseline rules](./baseline-rules-v1.md)
- [baseline generation prompt](./baseline-prompt-v1.md)
- 원본 prompt/schema/taxonomy/composer contract의 SHA-256

Calibration 결과로는 공통 defect class만 한 차례 고칠 수 있다. Final holdout 결과를 연 뒤에는 규칙을 바꾸지 않는다.

## 포트폴리오

| 구간 | 정상 | 경계 | 합계 | 규칙 수정 |
| --- | ---: | ---: | ---: | --- |
| Calibration | 8 | 4 | 12 | 공통 defect 1회 허용 |
| Final holdout | 4 | 2 | 6 | 금지 |
| 합계 | 12 | 6 | 18 |  |

생성 담당은 정상/경계 gold label, 허용 artifact, gold Item을 보지 않는다. Gold 작성자와 생성 담당은 가능한 한 독립적으로 작업한다.

## 평가 질문

1. 완전한 source에서 source-specific 실행 의미를 보존하는가?
2. 불완전한 source에서 행동과 날짜를 채워 넣지 않고 멈추는가?
3. Item, Field, Memo, Reference, Conditional response, Omission을 구분하는가?
4. 사용자가 실제로 소유한 값만 0~2개 입력하게 하는가?
5. 한 가지 자연 artifact와 필요한 secondary projection만 제안하는가?
6. 공개 가능 여부와 개인용 internal draft 가능 여부를 분리하는가?
7. 저비용 역할과 고성능 역할의 차이가 구조적 수정 비용을 정당화하는가?

## 성공 기준

- invented action/date/repeat: 0
- source-value re-entry: 0
- unscheduled ICS: 0
- source/rights/locale/safety/privacy gate 누락: 0
- source-row 의미 보존율: 90% 이상
- Flow 가능 여부 gold match: 85% 이상
- primary artifact gold match: 85% 이상
- 경계 recall: 100%
- 일반 사례 첫 미리보기 전 필수 사용자 입력: 0~2개
- 사람의 Item 삭제 또는 대수정 비율: 20% 이하

## 최종 결과

Final holdout 6개를 rules, low-cost, high-capability 세 방식으로 실행한 18개 run의 합산 결과다. Calibration 점수는 최종 성능에 대체하지 않았다.

| 지표 | 결과 | 기준 | 판정 |
| --- | ---: | ---: | --- |
| Flow 가능 여부 | 15/18 · 83.3% | 85% 이상 | FAIL |
| 경계 recall | 5/6 · 83.3% | 100% | FAIL |
| SourceRow 획득 | 162/162 · 100% | 참고 | PASS, 단 crawler 검증 아님 |
| SourceRow 의미 보존 | 130/162 · 80.2% | 90% 이상 | FAIL |
| primary artifact | 5/12 · 41.7% | 85% 이상 | FAIL |
| action/date/repeat 발명 | 17 | 0 | FAIL |
| 전체 발명 라벨 | 49 | 0 | FAIL |
| source 값 재입력 | 0 | 0 | PASS |
| 일정 없는 ICS | 0 | 0 | PASS |
| gate 필드 누락 | 0 | 0 | PASS |
| gold gate 불일치 | 22 | 0 | FAIL |
| 첫 미리보기 3개 이상 입력 | 0건 | 0건 | PASS |
| Item 삭제·대수정 | 30/76 · 39.5% | 20% 이하 | FAIL |
| 내부 판정상 바로 사용 가능 | 1/12 · 8.3% | 참고 | 관찰 사용자 검증 아님 |

| 방식 | Flow | 경계 recall | 의미 보존 | artifact | core 발명 | 삭제·대수정 | 통과 target |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| rules | 66.7% | 50.0% | 68.5% | 50.0% | 16 | 25.8% | 3/11 |
| low-cost | 83.3% | 100% | 73.1% | 25.0% | 0 | 100% | 5/11 |
| high-capability | 100% | 100% | 99.1% | 50.0% | 1 | 4.2% | 7/11 |

고성능 방식은 Flow 가능 여부, 경계 정지, 의미 보존에서 가장 안정적이었다. 그러나 NHI 교과표를 전체 날짜 Calendar로 축약했고 주민등록증 재발급을 Checklist로 판정해 primary artifact는 50%에 머물렀다. 저비용 방식은 core 행동·날짜·반복 발명은 없었지만 반복되는 추상 title과 관찰 불가능한 completion 때문에 모든 생성 Item에 대수정 판정이 필요했다.

## 일반화 판정

- 비교적 강함: 명시된 연령 창과 사용자 anchor가 결합되는 영유아 검진 Calendar, 명확히 부적용인 해외 의료 일정의 보수적 정지, 고정 job이 없는 갱신형 컬렉션 정지.
- 아직 약함: 표의 핵심 상태를 Sheet로 보존할지 날짜 범위를 Calendar로 축약할지, 한 행정 job을 Todo로 둘지 준비 Checklist로 펼칠지, source가 허용하는 completion을 구체적으로 쓰는 일.
- 만들지 말아야 함: 로그인·구매 뒤 실제 행이 있는 콘텐츠, 홍보 문구뿐인 강좌, bounded job이 없는 조언 글, 개별 행을 가져오지 않은 컬렉션, 한국 적용성이 없는 해외 의료 일정, 계속 변하는 템플릿 라이브러리.
- 저비용 적용 범위: source completeness와 locale 경계를 먼저 결정하는 보수적 stop gate, source 값 재입력 방지, ICS 구조 금지 검사는 활용 가능하다. 사용자 공개용 Item 문구와 artifact 선택에는 바로 쓰기 어렵다.
- 고성능 필요 범위: 의료·locale 경계, 행이 많은 원문의 의미 보존, 복합 source role 판정. 다만 고성능만으로 artifact 선택을 맡기지 말고 retained-state 규칙과 후검증을 결합해야 한다.

## Gold와 측정의 불확실성

독립 source-only gold audit은 Flow 가능 여부 88.9%, state 72.2%, primary artifact 83.3%, 필수 입력 44.4%만 일치했다. 특히 GB-15 NHI 교과표와 GB-17 영국 예방접종표에서 이견이 있었다. 이견을 본 뒤 gold를 수정하지 않았고 final holdout에도 예외를 추가하지 않았다. 따라서 최종 점수는 재현 가능한 내부 기준 점수이지 객관적 사용자 정답률이 아니다.

모든 방식이 같은 동결 SourceRow packet을 입력으로 사용했다. 100% SourceRow 획득률은 packet 회계 결과이며 production crawler의 추출 일반화를 증명하지 않는다. provider API를 사용하지 않았고 token, 처리 시간, 실제 비용은 노출되지 않아 `null`로 유지했다.

## 증거 경계

이 benchmark는 원문 조사, 동결 packet, 규칙 실행, 독립 agent 비교, 자동 validator와 브라우저 QA다. Production LLM provider의 실제 가격·지연, 실제 crawler 성공률, 공개 권리 승인, 관찰 사용자 유용성을 증명하지 않는다.

## 범위 밖

- app runtime과 기존 seed
- DB, 계정, persistence migration
- production crawler 또는 LLM API
- Input Composer/UX 파일
- commit, push, PR, merge, deploy
- 공개 승인 또는 실제 사용자 검증 주장
