# URL·메모 진입 정합성 감사

## 발견한 문제

홈 CTA는 URL과 메모를 모두 받을 수 있다고 안내했지만 `/flows`의 입력은 `type="url"`, visible label `원문 URL`이었다. 브라우저 자체 검증 때문에 일반 메모는 제출되지 않았고, 메모 초안 helper는 internal lab에서만 호출됐다. 이는 카피만의 문제가 아니라 첫 사용자 여정이 끊기는 런타임 결함이었다.

## 결정

1. `/flows`의 첫 입력을 `URL 또는 메모`로 통합한다.
2. 올바른 URL은 기존 canonical lookup을 그대로 사용한다.
3. URL이 아닌 텍스트는 개인 메모 초안으로 분류한다.
4. 메모 초안은 사용자가 쓴 문장만 할 일로 나눈다. 외부 사실이나 조언을 덧붙이지 않는다.
5. 기준일은 선택값으로 두고, 저장 후 My Flow에서 다시 수정할 수 있게 기존 draft edit path를 재사용한다.
6. 메모 원문은 `source_title: 내 메모`, `source_url` 없음으로 보존해 URL/source-backed 원본과 구분한다.

## UI 판단

- `/flows` H1을 `URL·메모로 Flow 찾기`로 바꿔 카탈로그 저장보다 intake 행동을 먼저 설명했다.
- 입력 결과를 별도 카드로 중첩하지 않고 입력 카드 안의 구분선 아래에 이어 붙였다.
- 모바일은 한 열, wide는 제목/기준일 두 열로 배치했다.
- `이사 견적을 비교한다 정리하기` 같은 기계적 문장을 `이사 견적을 비교하기`로 보정했다.
- 메모 초안에 `자동으로 내용을 덧붙이지 않고`라는 경계를 노출해 live AI로 오해하지 않게 했다.

## 데이터 경계

- 기존 seed/source-backed bundle은 변경하지 않았다.
- 기존 URL miss candidate queue와 canonical identity는 변경하지 않았다.
- 메모 초안은 개인 `draft` bundle이며 공개 Flow가 아니다.
- 기존 저장/완료/export record 형식과 `url-draft-*` 실행 경로를 재사용한다.
- 메모 원문은 draft `raw_text`의 `처음 붙여넣은 메모` 영역에 보존한다.

## 아웃데이트 콘텐츠 처리

과거 screenshot과 review package는 변경 이력 참고용으로만 사용했다. 현재 서비스 판단에는 runtime indexing policy를 통과한 콘텐츠와 현재 production build만 사용했다. review-gated 직접 `/f` route나 retired content는 이번 사용자 여정의 정상 성공 화면으로 포함하지 않았다.

## 남은 리스크

- 현재 메모 분해는 규칙 기반이며 복잡한 표, 긴 문단, 시간 표현을 정교하게 해석하지 않는다.
- 날짜는 자동 추론하지 않고 사용자가 기준일을 선택한다.
- 메모에서 기존 공개 Flow 추천으로 연결하는 의미 검색은 아직 없다.
- 메모 초안의 항목별 on/off와 저장 전 문구 편집은 저장 후 My Flow 편집 경로에 남아 있다.

다음 개선은 이 제약을 숨기는 것이 아니라, 긴 메모 fixture에서 규칙 기반 초안의 품질과 저장 후 수정 depth를 관찰한 뒤 결정해야 한다.
