# P1-01 viewport별 ARIA tree 축약본

**수집 방법:** Playwright `locator.ariaSnapshot()` · current local build `XMbvE5wM3RginexHtEnDx` · `FLOWME_P1_VISUAL_PHASE=before|after`

아래는 각 snapshot의 변경 지점과 앞뒤 맥락을 보존한 축약본이다. `…`는 동일한 원문·목록 행을 생략한 표시이며, 전체 line count와 DOM count는 [README](./README.md)에 기록한다. 실제 보조기기 사용자 세션은 아니다.

## Item 상세

### 390×844

```text
before
- paragraph: 실행할 일
- checkbox "우편물/카드/은행 주소 변경하기 완료 체크"
- button "우편물/카드/은행 주소 변경하기 할 일 수정": 할 일 수정
- group: 메모·일정
- group: 현재 항목 1개 옮기기

after
- checkbox "우편물/카드/은행 주소 변경하기 완료 체크"
- button "우편물/카드/은행 주소 변경하기 수정": 수정
- group: 메모·일정
- group: 현재 항목 1개 옮기기
```

### 1024×768

```text
before
- checkbox "우편물/카드/은행 주소 변경하기 완료 체크"
- button "우편물/카드/은행 주소 변경하기 할 일 수정": 할 일 수정
- button "닫기"
- group: 메모·일정
- group: 현재 항목 1개 옮기기

after
- checkbox "우편물/카드/은행 주소 변경하기 완료 체크"
- button "우편물/카드/은행 주소 변경하기 수정": 수정
- button "닫기"
- group: 메모·일정
- group: 현재 항목 1개 옮기기
```

### 1440×1000

```text
before
- checkbox "우편물/카드/은행 주소 변경하기 완료 체크"
- button "우편물/카드/은행 주소 변경하기 할 일 수정": 할 일 수정
- button "닫기"
- group: 메모·일정
- group: 현재 항목 1개 옮기기

after
- checkbox "우편물/카드/은행 주소 변경하기 완료 체크"
- button "우편물/카드/은행 주소 변경하기 수정": 수정
- button "닫기"
- group: 메모·일정
- group: 현재 항목 1개 옮기기
```

## Flow Map

### 390×844

```text
before
- main:
  - navigation "주요 화면": 계획 찾기 / 캘린더 / 내 계획
  - paragraph: 계획 미리보기 학습 진도
  - heading "중1 수학 목차 진도표" [level=1]
  - term: 내 조건
  - definition: 입력 없음
  - term: 저장 결과
  - definition: 8개 단원 진도표
  - term: 전체
  - definition: 할 일 8개
  - region "저장될 Flow 요약": …
  - paragraph: 선택 8 / 전체 8
  - button "계획 수정"
  - button "내 계획에 저장"

after
- main:
  - navigation "주요 화면": 계획 찾기 / 캘린더 / 내 계획
  - paragraph: 계획 미리보기 학습 진도
  - heading "중1 수학 목차 진도표" [level=1]
  - region "저장될 Flow 요약": …
  - paragraph: 선택 8 / 전체 8
  - button "계획 수정"
  - button "내 계획에 저장"
```

### 1024×768

```text
before
- main:
  - navigation "FLOW 서비스 프레임": FLOW / 계획 찾기 / 캘린더 / 내 계획 / 메뉴
  - paragraph: 계획 미리보기 학습 진도
  - heading "중1 수학 목차 진도표" [level=1]
  - term: 내 조건
  - definition: 입력 없음
  - term: 저장 결과
  - definition: 8개 단원 진도표
  - term: 전체
  - definition: 할 일 8개
  - region "저장될 Flow 요약": …
  - button "내 계획에 저장"
  - button "계획 수정"

after
- main:
  - navigation "FLOW 서비스 프레임": FLOW / 계획 찾기 / 캘린더 / 내 계획 / 메뉴
  - paragraph: 계획 미리보기 학습 진도
  - heading "중1 수학 목차 진도표" [level=1]
  - region "저장될 Flow 요약": …
  - paragraph: 선택 8 / 전체 8
  - button "내 계획에 저장"
  - button "계획 수정"
```

### 1440×1000

```text
before
- main:
  - navigation "FLOW 서비스 프레임": FLOW / 계획 찾기 / 캘린더 / 내 계획 / 메뉴
  - heading "중1 수학 목차 진도표" [level=1]
  - term/definition: 내 조건 / 입력 없음
  - term/definition: 저장 결과 / 8개 단원 진도표
  - term/definition: 전체 / 할 일 8개
  - region "저장될 Flow 요약": …
  - button "내 계획에 저장"
  - button "계획 수정"

after
- main:
  - navigation "FLOW 서비스 프레임": FLOW / 계획 찾기 / 캘린더 / 내 계획 / 메뉴
  - heading "중1 수학 목차 진도표" [level=1]
  - region "저장될 Flow 요약": …
  - paragraph: 선택 8 / 전체 8
  - button "내 계획에 저장"
  - button "계획 수정"
```

## 시작일

### 390×844

```text
before
- paragraph: 계획 미리보기 이사
- heading "이사 D-30 준비" [level=1]
- region "현재 공개 초안 · 24개": …
- complementary "저장 조건과 행동":
  - text: 이사일
  - textbox "이사일": 2027-08-05
  - text: "이사일: 8월 5일 (목)"

after
- paragraph: 계획 미리보기 이사
- heading "이사 D-30 준비" [level=1]
- region "현재 공개 초안 · 24개": …
- complementary "저장 조건과 행동":
  - text: 이사일
  - textbox "이사일": 2027-08-05
```

### 1024×768

```text
before
- heading "이사 D-30 준비" [level=1]
- region "현재 공개 초안 · 24개": …
- complementary "저장 조건과 행동":
  - textbox "이사일": 2027-08-05
  - text: "이사일: 8월 5일 (목)"
  - button "계획 수정"
  - button "내 계획에 저장"

after
- heading "이사 D-30 준비" [level=1]
- region "현재 공개 초안 · 24개": …
- complementary "저장 조건과 행동":
  - textbox "이사일": 2027-08-05
  - button "계획 수정"
  - button "내 계획에 저장"
```

### 1440×1000

```text
before
- heading "이사 D-30 준비" [level=1]
- region "현재 공개 초안 · 24개": …
- complementary "저장 조건과 행동":
  - textbox "이사일": 2027-08-05
  - text: "이사일: 8월 5일 (목)"
  - button "계획 수정"
  - button "내 계획에 저장"

after
- heading "이사 D-30 준비" [level=1]
- region "현재 공개 초안 · 24개": …
- complementary "저장 조건과 행동":
  - textbox "이사일": 2027-08-05
  - button "계획 수정"
  - button "내 계획에 저장"
```

## 엄격 재감사 결론

- Item 완료 checkbox는 3 viewport 모두 1개다. `수정`만 secondary이며 실행 heading만 제거됐다.
- Map은 card/surface `5→4`, 3칸 grid `1→0`이고 선택 수는 action 근처에 남는다.
- 날짜가 비어 있는 직접 접근 Map에서도 모바일 `선택 N / 전체 M · 시작일 필요`가 유지된다.
- 시작일 정상 echo만 사라지고 input, 과거·임박 경고 경로는 유지된다.
