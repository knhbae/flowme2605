# 한국어 Flow 콘텐츠 UI 배치 31개

Date: 2026-06-02

## 목적

`my_tests/260601_contents_check.md`의 피드백을 반영해 한국어 원문 기반 Flow 후보를 다시 골랐다. 이번 배치는 문서 요약이 아니라 실제 UX에서 사용자가 저장할 Flow 항목까지 보이도록 만들었다.

구현 화면:

- `/content-flows`
- 데이터: `lib/flow/korean-flow-content-candidates.ts`
- UI: `components/flow/KoreanFlowContentStudio.tsx`
- 평가 저장 API: `app/api/content-flow-review/route.ts`
- 평가 저장 파일:
  - `docs/content-audit/original-source-review/2026-06-02-korean-flow-content-ui-review-notes.json`
  - `docs/content-audit/original-source-review/2026-06-02-korean-flow-content-ui-review-notes.md`

## 이번 선별 기준

이전 30개 후보의 문제는 세 가지였다.

1. 주제는 좋아도 원문이 개인 사용자가 따라 하기 어렵거나 매력적이지 않았다.
2. Flow 콘텐츠 예시가 설명처럼 보이고, 실제 캘린더/루틴/체크리스트 항목으로 판단하기 어려웠다.
3. 완료 기준이 "메모하기"처럼 억지스러운 경우가 있었다.

이번 기준:

- 사용자가 이미 찾는 생활 문제를 우선한다.
- 원문 안에 반복 주기, 날짜, 체크 항목, 표, 준비물, 결정 지점이 있어야 한다.
- 기본 입력은 2~3개로 제한한다.
- 사진/증빙/상세 기록은 기본값으로 넣지 않는다.
- 아이 놀이/독서는 `루틴 + 콘텐츠 카드 매핑` 구조로 본다.
- 가전/식물/차량/반려동물은 `보유 대상 프로필 + 반복 루틴` 구조로 본다.
- 행정/결혼/이사/시험/여행은 `기준일 + 타임라인` 구조로 본다.
- 민감 영역은 판단이 아니라 일정/체크/메모로 제한한다.

## 카테고리 구성

총 31개:

- 가전 관리: 세탁기, 에어컨, 공기청정기, 로봇청소기, 가습기, 정수기
- 식물 관리: 몬스테라, 스투키
- 반려동물: 고양이 화장실, 강아지 예방접종, 강아지 입양
- 생활 이벤트: 결혼, 이사, 전입신고
- 여행/행정: 출국 준비, 일본 여행, 여권
- 육아/식단/놀이/독서: 이유식, 주말 놀이, 그림책, 권장도서
- 운동/챌린지: 플랭크 30일
- 공부/자격증: 컴활, 한능검
- 차량: 중고차, 에어컨 필터, 소모품, 정기검사
- 돈 관리: 월말 가계부, 비상금 통장

## 대표 원문 근거

원문은 화면의 각 카드에 링크로 붙였다. 이번 검색에서 참고한 대표 근거:

- 세탁기 통세척 방법: https://raga-t.com/entry/%EC%84%B8%ED%83%81%EA%B8%B0-%ED%86%B5%EC%84%B8%EC%B2%99-%EB%B0%A9%EB%B2%95-%EC%99%84%EB%B2%BD-%EA%B0%80%EC%9D%B4%EB%93%9C
- LG 에어컨 필터 청소/교체: https://www.lge.co.kr/support/solutions-20150160251795?cstFlag=Y&mktModelCd=FQ237SAU&svcqr=
- 로봇청소기 관리: https://solidtips.tistory.com/entry/robot-vacuum-maintenance-brush-sensor-dustbin-watertank
- 몬스테라 관리: https://jhbd2.tistory.com/178
- 스투키 관리: https://botanical.house/stuckyi/
- 결혼 준비 타임라인: https://wedding-expo.kr/posts/post-007
- 이사 준비 체크리스트: https://greechii.com/tips/home/moving-checklist/
- 토스 이사 후 체크리스트: https://toss.im/tossfeed/article/after-move-checklist
- 초기 토핑 이유식 식단표: https://family-yes.tistory.com/229
- 플랭크 30일 챌린지: https://khj2510.tistory.com/entry/%ED%94%8C%EB%9E%AD%ED%81%AC-30%EC%9D%BC-%EC%B1%8C%EB%A6%B0%EC%A7%80-%EA%B3%84%ED%9A%8D%ED%91%9C-%EA%B3%B5%EC%9C%A0
- 컴활 2급 필기 합격 후기: https://tea-books.tistory.com/5
- 중고차 구매 체크리스트: https://trendmetriclab.com/guides/used-car-buying-checklist/

## UI 판단

이번 화면은 콘텐츠 후보 평가용이므로 마켓/서비스 첫 화면이 아니라 실험실 UI로 만들었다.

사용자 여정:

1. 카테고리나 검색으로 후보를 고른다.
2. 오른쪽에서 저장하면 생기는 Flow 입력값과 실제 항목을 본다.
3. 모바일 상세 미리보기로 My Flow 상세에 들어갈 밀도를 본다.
4. 1~5점, 후보 유지, 문제 있음, 메모를 남긴다.
5. 저장하면 repo의 JSON/MD 메모 파일에 남는다.

## 다음 프롬프트 기준

앞으로 원문을 Flow로 변환할 때 사용할 프롬프트는 이 구조를 강제해야 한다.

```text
한국어 원문 URL을 보고 FlowMe 후보로 평가해줘.

1. 이 원문이 일반 사용자가 실제로 저장할 만한지 먼저 판단해.
2. 주제 매력만 보지 말고, 원문 안에 날짜/반복/체크항목/표/준비물/결정 지점이 있는지 확인해.
3. 댓글, 조회수, 운영 지속성, 다운로드 자료, 검색 수요 같은 상호작용/수요 신호가 있으면 적어.
4. Flow로 만들 수 없다면 억지로 만들지 말고 reject라고 해.
5. 만들 수 있다면 사용자가 저장했을 때 생길 실제 항목을 3~4개만 써.
6. 입력값은 2~3개 이하로 제한해.
7. 완료 기준은 메모가 아니라 실제 행동 완료로 써.
8. 방법/준비물/영상/구매 링크/주의는 메모로 보내.
9. 민감한 영역은 공식/전문가 판단과 제작자 경험을 분리해.
10. 마지막에 1~5점과 이유를 적어.
```

## 남은 질문

- 아이 놀이/독서처럼 `기존 루틴에 콘텐츠 카드를 매핑하는 UX`가 My Flow 안에서 어떻게 보여야 하는지 별도 설계가 필요하다.
- 가전/식물/차량처럼 `사용자 보유 대상 프로필`이 필요한 Flow는 My Flow의 단순 캘린더/체크 UX만으로 충분한지 검증해야 한다.
- 돈 관리 Flow는 유용하지만 금융 조언처럼 보일 위험이 있어 대표 후보로 올리기 전 문구 기준을 더 엄격히 해야 한다.
- 이번 31개 중 실제 seed/demo로 올릴 5~8개를 사용자 평가 결과로 좁혀야 한다.
