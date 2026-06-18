# 2026-06-01 크리에이터·블로그 기반 배치 (20개)

## 왜 만들었나
공식출처 배치(24개)에 이어 "블로그·유튜브 기반으로도 필요하니까 업데이트 부탁"이라는
요구를 반영했다. FLOW는 공식 포털뿐 아니라 YouTube 크리에이터 채널·블로그·온라인
플랫폼 콘텐츠도 실행 가능한 Flow로 전환할 수 있어야 한다.

- 코드: `lib/flow/contents-batch-260601-creator.ts` (20개 FlowBundle).
- 합류: `seed-flows.ts`의 `baseSeedBundles`에 공식출처 배치 뒤에 추가.
- 분류: 모두 `source_status: 'needs_review'`, `source_precision: 'exact'`.
  비민감 18개 → `audit_now`, 재무민감 2개 → `risk_review`.

## 출처 원칙

### YouTube 크리에이터 기반
- `source_type: 'creator_experience'`, 링크 타입 `creator`.
- 채널 도메인(youtube.com/@handle) 수준 URL만 사용. 확인 안 된 deep-link 금지.

### 블로그·플랫폼 기반
- `source_type: 'reference'`, 링크 타입 `reference`.
- 플랫폼 메인 도메인만 사용(brunch.co.kr, ohou.se 등).

## 사용한 출처 (20개 Flow)
| 영역 | Flow | 출처 |
|---|---|---|
| 요리/레시피 | 레시피 영상 실전 적용 | 백종원의 요리비책 youtube.com/@bbjrecipe |
| 요리/식단 | 한 주 식단·장보기 | 만개의 레시피 10000recipe.com |
| 정리/수납 | 옷장 정리 1일 챌린지 | 오늘의집 ohou.se |
| 정리/수납 | 주방 리셋 정리 | 오늘의집 ohou.se |
| 재테크/재무 | 월간 가계부 시작 | 슈카월드 youtube.com/@ShuKaWorld |
| 재테크/재무 | 월급날 재정 루틴 | 슈카월드 youtube.com/@ShuKaWorld |
| 자기계발/독서 | 30일 독서 습관 | 브런치스토리 brunch.co.kr |
| 자기계발/독서 | 책 한 권 완독 실천 | 브런치스토리 brunch.co.kr |
| 뷰티/스킨케어 | 아침 스킨케어 5분 루틴 | 브런치스토리 brunch.co.kr |
| 뷰티/스킨케어 | 주간 피부 상태 관찰 | 브런치스토리 brunch.co.kr |
| 여행 | 국내여행 D-7 준비 | 에어비앤비 코리아 airbnb.co.kr |
| 여행 | 여행 짐 싸기 체크리스트 | 브런치스토리 brunch.co.kr |
| 홈카페/취미 | 홈카페 루틴 만들기 | 브런치스토리 brunch.co.kr |
| 취미/자기계발 | 새 취미 30일 시작 | 클래스101 class101.net |
| 커리어/취업 | 포트폴리오 제작 4주 플랜 | 원티드 wanted.co.kr |
| 콘텐츠 창작 | 블로그·유튜브 첫 콘텐츠 | 네이버 블로그 blog.naver.com |
| 생활습관 | 아침 루틴 30일 챌린지 | 브런치스토리 brunch.co.kr |
| 디지털 웰빙 | 디지털 디톡스 주간 루틴 | 브런치스토리 brunch.co.kr |
| 반려동물 | 강아지 산책 루틴 | 네이버 펫 pet.naver.com |
| 반려동물 | 반려동물 건강 관찰 기록 | 네이버 펫 pet.naver.com |

## 공식출처 배치와의 차이
| 항목 | 공식출처(24개) | 크리에이터·블로그(20개) |
|---|---|---|
| source_type | official | creator_experience / reference |
| 출처 성격 | 정부 공공 포털 | YouTube 크리에이터·블로그·플랫폼 |
| 민감도 | 의료/재무 12개 risk_review | 재무 2개(가계부·월급날) risk_review |
| 산출물 | 신청서·메모·캘린더 | 시트·메모·캘린더 |

## 좋은 후보의 공통점 (이번 배치 재확인)
1. **반복 실행이 가능한 구조**: 루틴·주간 점검·30일 챌린지 → 캘린더·시트로 자연스럽게 연결.
2. **구체적인 산출물이 있다**: 장보기 목록, 관찰 기록, 포트폴리오 초안, 독서 메모.
3. **크리에이터 영상/글의 "실행 다리" 역할**: 영상을 보는 것과 실제로 따라 하는 것 사이의 간극을 채운다.
4. **민감 영역은 경고와 "관찰/기록" 프레이밍**: 재무 2개는 "투자 조언 아님" 경고 포함.

## 분류 (Stage 0 준수)
- 전부 `source_status: 'needs_review'`, `source_precision: 'exact'`.
- inventory `source_needs_review` 44(이전 24 + 신규 20).
- lifecycle `fix` 99(이전 79 + 신규 20).
- source-review 큐 44: `audit_now` 30 / `risk_review` 14.
- **어떤 라우트도 검증/대표/공개 MVP 아님.** 다음 단계는 source-fit audit.

## 검증
- `npm test`: 179 pass.
- `npm run build`: 성공.
- `npm run docs:check`: 통과.
- HTML 프리뷰 20개 생성: `preview/260601/` 에 추가.
- E2E: 컨테이너 환경 제약으로 미실행.
