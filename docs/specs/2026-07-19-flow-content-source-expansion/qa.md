# Flow 콘텐츠 소스·타깃 확장 검증 v1 QA

## Automated Data Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Candidate ledger | Passed | 36 candidates; Korean 21; global 15; unique URL 36; provider class 35; source format class 34 |
| Coverage | Passed | lifeArea 9/9; planningPattern 7/7; targetCondition 8/8 |
| Deep set | Passed | 12 cases; Korean 9; global 3; official API/open 2 |
| Deep result mix | Passed | ready internal 8; review locked 2; correct hold 2; max 7 Items |
| Source fidelity | Passed | SourceRow accounting 100%; invented facts 0; invented dates 0 |
| Model comparison | Passed | same 6 packets; Terra 92.8; Sol 96.0; both SourceRow 100%; retry 0 |
| P0 decision | Passed | 24 rows; keep 18; replace 5; park 1; representative set 5 |

## Cost Evidence Boundary

- Parallel batch wall time: 283 seconds.
- Lower-cost proxy output reference: 6,153 minified JSON characters; about 1,539 character/4 tokens; 12 repair fields; 18 minutes estimated repair.
- Premium proxy output reference: 6,847 minified JSON characters; about 1,712 character/4 tokens; 3 repair fields; 4.5 minutes estimated repair.
- Individual latency, billing input/output token, and actual API currency cost were not exposed in this session.
- Character/4 is a reference estimate, not billing evidence. Model classes are Codex session proxies, not confirmed public API price SKUs.

## Visual And Repository Checks

| Check | Result | Evidence |
| --- | --- | --- |
| HTML parse | Passed | 14 unique slides; 38 links; 17 local links; missing local link 0 |
| Local link check | Passed | `npm.cmd run docs:check`: 14 required files and 2,382 local links |
| Desktop rendering | Passed | Playwright 1440×1000; slides 1, 6, 7, 10 visually inspected; console error 0 |
| Mobile rendering | Passed | Playwright 390×844; slides 1, 6, 10 visually inspected; sticky nav and one-column layout intact |
| Horizontal overflow | Passed | desktop `1425:1425:false`; mobile `375:375:false`; deep-set table uses intentional inner scroll `344:760` |

Screenshots: `output/playwright/flow-content-source-expansion-20260719/`.

## Review Boundary

- 이번 결과는 research/conversion/backend decision artifact이며 앱 seed·DB·live API 구현이 아니다.
- 자동 QA와 모델 계약 점수는 실제 사용자·제공자 검증이 아니다.
- 원문·반응 지표·권리 정책은 2026-07-19 이후 바뀔 수 있으므로 실행 시 재확인이 필요하다.
- 공개 발행, 제작자 허가, 실제 API 원가, 사용자 가치가 검증됐다고 주장하지 않는다.
