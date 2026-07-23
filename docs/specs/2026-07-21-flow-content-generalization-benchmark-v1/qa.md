# QA contract

## Hard gates

1. 새 18개는 기존 Input Composer 8개와 case ID·canonical URL이 겹치지 않는다.
2. 최소 10개는 이전 변환 lab에 쓰지 않은 URL이다.
3. manifest와 split은 생성 전에 hash로 봉인한다.
4. acquired SourceRow는 정확히 한 역할을 갖는다.
5. 생성 Item은 SourceRow 또는 명시적 사용자 문장으로 추적된다.
6. source가 partial/metadata-only/missing이면 canonical Item과 usable projection을 만들지 않는다.
7. 일정이 없는 Item은 ICS event와 download action이 없다.
8. source-derived 값은 사용자 입력으로 다시 노출되지 않는다.
9. primaryArtifact는 `calendar/checklist/todo/sheet/memo` 중 하나이며 `hybrid`가 아니다.
10. rights, public export, personal preview와 source completeness는 독립적으로 기록한다.
11. safety, locale, privacy review 상태를 누락하지 않는다.
12. final holdout 결과 생성 이후 revised rules hash가 바뀌지 않는다.

## 품질 지표

- feasibility gold match >= 0.85
- primary artifact gold match >= 0.85
- source semantic retention >= 0.90
- boundary recall = 1.00
- invented action/date/repeat = 0
- source re-entry = 0
- unscheduled ICS = 0
- required user inputs per positive case <= 2
- major edit or Item deletion rate <= 0.20

## 주장 경계

- 자동 검증: JSON shape, enum, reference integrity, split seal, metric recomputation, negative mutation rejection.
- agent 검토: source fidelity, gold adjudication, 저비용/고성능 비교.
- 아직 하지 않은 것: production provider 비용, crawler runtime, public rights approval, observed-user usefulness.

## 실행 결과

- 18개 case, calibration 12 + final holdout 6, normal 12 + boundary 6 고정.
- exact URL novelty: 16/18. 최소 10개 신규 URL 기준 통과.
- rules/low-cost/high-capability의 54개 run과 sealed split 검증 통과.
- Final holdout: Flow 83.3%, 경계 recall 83.3%, 의미 보존 80.2%, artifact 41.7%, 삭제·대수정 39.5%로 목표 미달.
- source re-entry 0, unscheduled ICS 0, gate 필드 누락 0, 첫 미리보기 입력 2개 초과 0건.
- adjudication에서 core action/date/repeat 발명 17건, 전체 발명 49건, gate gold 불일치 22건 확인.
- provider API 미사용. 시간·token·실제 비용은 측정하지 않았고 `null`이다.
- Playwright 1440×900 / 390×844: 18 case, 54 role card, cover 실제 사례 GB-14·GB-16·GB-17, 가로 넘침 0, console error 0.
- 필터: hold 4건, 공식 11건, 표·파일 2건, low-cost 18 card, 의견 불일치 5건, reset 18건 확인.
- 자동·agent-assisted internal QA이며 observed-user validation이 아니다.

## 검증 명령

- `validate-generalization-v1.test.mjs`: 16/16 PASS.
- `evaluate-generalization-v1.test.mjs`: 10/10 PASS.
- full portfolio validator: 18 case, 54 independent run, split 12+6, seal PASS.
- evaluator: 54 run, 파생 JSON 5개 출력 PASS.
- 정적 HTML verifier: 18 case, 54 role card PASS.
- Playwright browser verifier: 1440×900 / 390×844와 필터 상호작용 PASS.
- `npm.cmd test`: 519/519 PASS.
- `npm.cmd run docs:check`: 14 required files, 2,475 local links PASS.
