# Text Authoring 예시 inventory와 추적성

## 기준

- 검증 시각: 2026-08-25 KST
- source owner: `components/flow/text-authoring/examples.ts`
- generated fixture: `components/flow/text-authoring/validated-examples.generated.json`
- contract test: `lib/flow/text-authoring/demo-examples.test.ts`
- `examples.ts` SHA-256: `12A8BB6DF70160865BDC116F9B57A5AA9D436F7D41BC6C7DAC245306FAF58BAC`
- generated fixture SHA-256: `6EC8F4DDFEB34C20EF0745412094ADA356BDDE250D96B3EFAC6DE5A1B18256E4`

현재 PoC 수정 전 source에는 아래 31개가 모두 남아 있었다. 따라서 이번 작업은 삭제된 콘텐츠를 새로 만드는 작업이 아니라, `--product` standalone 조합에서 가려진 선택지를 다시 노출하고 회귀를 고정하는 작업이다. `raw SHA`는 각 `rawText`의 SHA-256 앞 16자리이며 원문 동일성 확인용이다.

## 렌더링 순서

| 순서 | group | scenario | 화면 label | raw SHA |
| ---: | --- | --- | --- | --- |
| 1 | 작성 문법 | `simple` | 작성 형식 한눈에 | `718bf9a7f21a3f91` |
| 2 | 기존 FLOW 콘텐츠 | `content-moving-d30` | 이사 D-30 체크리스트 | `04edbcbbc43a53be` |
| 3 | 기존 FLOW 콘텐츠 | `content-vehicle-inspection` | 자동차검사 D-14 준비 | `ff5928cad28b7f6c` |
| 4 | 기존 FLOW 콘텐츠 | `content-allblanc-7day` | Allblanc 7일 영상 챌린지 | `02e9c7e1d5371a83` |
| 5 | 기존 FLOW 콘텐츠 | `content-kmooc-14` | K-MOOC 14주 학습 목록 | `f67266467c8400c5` |
| 6 | 기존 FLOW 콘텐츠 | `content-librivox-38` | LibriVox 38장 듣기 목록 | `cf1ef981c03319ee` |
| 7 | 기존 FLOW 콘텐츠 | `content-new-car-14` | 신차 구매 8단계 | `6d2737bacde892ba` |
| 8 | 기존 FLOW 콘텐츠 | `content-official-safety-4` | 해외여행 안전정보·영사조력 | `82490485a6b631d0` |
| 9 | 기존 FLOW 콘텐츠 | `content-jeju-memo-5` | 제주 여행 개인 메모 | `21a4c03437886aeb` |
| 10 | 날짜·반복 바꿔보기 | `change-relative-no-anchor` | 상대 날짜 · 실제 기준일 없음 | `7f37e56b7c4ee660` |
| 11 | 날짜·반복 바꿔보기 | `change-relative-anchor-aug` | 상대 날짜 · 8월 기준일 적용 | `f8fee873c586f9cf` |
| 12 | 날짜·반복 바꿔보기 | `change-relative-anchor-sep` | 상대 날짜 · 9월 기준일로 변경 | `e5bd858d6354f680` |
| 13 | 날짜·반복 바꿔보기 | `change-relative-to-absolute` | 상대 날짜를 절대 날짜로 명시 | `98e0bceaa3ccfd75` |
| 14 | 날짜·반복 바꿔보기 | `change-mixed-dated-undated` | 날짜 있음 + 날짜 없음 혼합 | `1e3878749281a9d7` |
| 15 | 날짜·반복 바꿔보기 | `change-time-timezone-duration` | 시간·시간대·소요 시간 추가 | `65c55173d57481bd` |
| 16 | 날짜·반복 바꿔보기 | `change-daily-repeat-until-date` | 매일 반복 + 종료일 | `1c1e1db8f48cd163` |
| 17 | 날짜·반복 바꿔보기 | `change-same-day-timed-agenda` | 같은 날 여러 일정 · 시간순 | `aba099d1c39b7da9` |
| 18 | 날짜·반복 바꿔보기 | `change-repeat-condition-weekly` | 매주 반복 + 실행 조건 | `651b06f29374b7fc` |
| 19 | 날짜·반복 바꿔보기 | `change-latest-grammar-showcase` | 최신 문법 한눈에 · 3회 반복 | `9a30085b97449c70` |
| 20 | 날짜·반복 바꿔보기 | `change-repeat-condition-monthly` | 매월 반복 + 변경된 조건 | `dbcefef0cbd11e38` |
| 21 | 이전 입력·표 형식 | `compat-legacy-aliases` | 이전 초안 별칭 읽기 | `0761f09ab9ac9f85` |
| 22 | 이전 입력·표 형식 | `compat-title-h1-wins` | H1과 저장 제목 충돌 | `ce2d1a8deaee949e` |
| 23 | 이전 입력·표 형식 | `compat-resource-links` | 공식 링크 + 이전 구분자 | `3efba432f2a3c4e9` |
| 24 | 이전 입력·표 형식 | `compat-tab-table` | 탭 표 | `873c1bec0b7f62fb` |
| 25 | 이전 입력·표 형식 | `compat-csv-table` | CSV 표 | `39c7258e6f33f0dd` |
| 26 | 이전 입력·표 형식 | `compat-markdown-table` | Markdown 표 | `5a35763005eef184` |
| 27 | 예외 처리 | `error-unknown-property` | 정의되지 않은 속성 · 설명 보존 | `18b501c069133557` |
| 28 | 예외 처리 | `error-ambiguous-date` | 연도 없는 날짜 | `5d673483a36357e6` |
| 29 | 예외 처리 | `error-invalid-relative-date` | 지원하지 않는 상대 날짜 | `e56aee6328c49880` |
| 30 | 예외 처리 | `error-url-only` | URL만 붙여 넣음 | `190b4acf8d15748f` |
| 31 | 예외 처리 | `error-explanatory-prose` | 표식 없는 설명문 · TXT 보존 | `66e7ca25b3f61c5b` |

## 경계

- 위 31개는 현재 repo의 기존 검증 fixture다. 외부 원문을 이번 작업에서 새로 복제하지 않았다.
- 대표 5개 목록은 별도 product-mode 축소 표현으로 유지한다.
- 예시 선택은 source를 바꿔 projection을 다시 계산하지만, 선택 자체를 durable save나 사용자 검증으로 표현하지 않는다.
- 자동화와 화면 캡처의 관찰 사용자 수는 `0`이다.
