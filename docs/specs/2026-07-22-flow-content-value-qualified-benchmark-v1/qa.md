# QA

## 최종 데이터 결과

- 후보 풀: 40개
- value-qualified positive: 12개, 모두 81점 이상이며 hard gate 통과
- boundary control: 6개
- 구성: 한국어 10개, 제작자·커뮤니티 6개, 공식 고의도 6개
- 실제 행이 있는 제작자·커뮤니티 template: 2개
- 반복·진도·일정: 6개, 한 세션·결정: 2개
- 같은 artifact와 user moment 조합: 최대 2개
- calibration/final holdout: positive 8+4, boundary 4+2
- 독립 변환: 18 source × rules/low-cost/high-capability = 54개

## 변환 지표

| 지표 | 규칙 기반 | 저비용 역할 | 고성능 역할 |
|---|---:|---:|---:|
| Flow 가능 여부 | 100% | 100% | 100% |
| boundary recall | 100% | 100% | 100% |
| SourceRow 의미 보존 | 100% | 100% | 100% |
| Item provenance | 100% | 100% | 100% |
| primary artifact | 100% | 66.7% | 88.9% |
| Item 삭제·대수정 | 0% | 0% | 0.43% |
| 바로 사용 가능 | 100% | 66.7% | 88.9% |

Final holdout 6개에서는 primary artifact가 규칙 100%, 저비용 83.3%, 고성능 100%였다. 고성능 역할은 6/6이 바로 사용 가능 판정을 받았다.

- 원문에 없는 행동·날짜·반복·완료 기준: 0건
- source 값 재입력: 0건
- 일정 없는 ICS: 0건
- source·rights·locale·safety·privacy gate 누락: 0건
- 최종 positive 판정: Go 10개, Modify 2개
- boundary 판정: Hold 6개
- 저비용 대비 고성능 paired 결과: 고성능 win 4, tie 14, 저비용 win 0
- 실제 사용자 관찰: 0명

## Holdout 무결성

첫 final 실행을 점수화하기 전에 VQ-11의 2026-09-16 기한이 SourceRow R04가 아니라 R03에 잘못 연결된 gold 생성 오류를 발견했다.

- attempt 1은 `runs/attempt-1-unscored/`에 보존했다.
- source row, 후보, split, 변환 규칙은 변경하지 않았다.
- gold 행 연결만 수정하고 hash를 다시 봉인했다.
- 새로운 독립 agent 두 개로 scored attempt 2를 재실행했다.
- attempt 2 이후 규칙·gold·source mutation은 0건이다.
- 저비용 결과의 `completion:null` 50개는 원문 추적 문구만 채우는 schema normalization으로 원본을 별도 보존했다.
- SourceRow에 명시된 조건형 date offset을 schedule authority로 인정하는 일반 evaluator 오류 수정도 이전 지표와 로그를 보존했다.

## 실행 검증

- `node scripts/content-audit/verify-flow-content-value-qualified-benchmark-v1.mjs` — PASS
- `node --test scripts/content-audit/flow-content-value-qualified-benchmark-v1.test.mjs` — 9/9 PASS
- `node scripts/content-audit/verify-flow-content-value-qualified-benchmark-v1-report.mjs` — PASS
- `npm run docs:check` — PASS, required docs 14개와 local link 2,532개 검증
- `npm test` — PASS, 519/519
- `npm run workflow:closeout -- --scope=...` — PASS, task-owned 신규 경로 8개와 전체 dirty worktree를 분리 확인

## HTML 검토 범위

자동 검증으로 다음을 확인했다.

- 첫 화면에 WEB1, 리모델링 하자 점검, 국가근로장학금 실제 사례 3개
- positive 12개와 boundary 6개 모두 노출
- 세 방식의 결과 카드 54개와 전체 Item 펼쳐보기
- Go/Modify/Hold, class, provider, artifact, evidence, 성공, 의견 불일치, model 필터
- 1440×900 desktop contract와 390×844 mobile contract
- placeholder·`undefined`·`null` 노출 없음

2026-07-23 사용자가 인앱 브라우저에서 다음을 직접 확인하고 `정상`으로 회신했다.

- 첫 화면의 대표 사례 3개가 겹치거나 잘리지 않음
- `Go`, `Boundary`, `High-capability` 필터가 정상 동작
- 창을 휴대폰 폭 정도로 좁혀도 본문이 좌우로 잘리지 않음

agent의 `file://` DOM·스크린샷 접근은 보안 정책상 차단됐으며 다른 브라우저로 우회하지 않았다. 따라서 정확한 1440×900·390×844 viewport contract는 자동 구조 검증, 실제 화면·필터 상태는 사용자 수동 확인으로 분리 기록한다. 이 확인은 보고서 렌더 QA이며 제품 사용성·저장 의향·반복 사용을 관찰한 사용자 검증이 아니다. 근거는 `manual-render-review-v1.json`에 보존했다.

## 범위 보호

- 기존 Generalization Benchmark와 Input Composer 파일은 수정하지 않았다.
- app runtime, DB, crawler, production LLM API를 수정하지 않았다.
- 기존 dirty worktree를 보존했다.
- commit, push, PR, merge, deploy를 수행하지 않았다.
- 자동·에이전트 QA는 실제 사용자 검증이 아니다.
