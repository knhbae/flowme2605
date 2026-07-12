# 런타임 콘텐츠 재고 분리 감사

## 문제

기존 canonical seed는 정상 사용자 콘텐츠와 생성형 채널 샘플을 함께 담았다. 이 때문에 440개 샘플이 앱 시작 시 생성되고 localStorage 마이그레이션 대상이 되었으며, direct /f URL도 존재했다. 오래된 페이지를 숨겨도 기존 브라우저에는 샘플이 남을 수 있었다.

## 조치

1. 정상 seed에서 flow-preview-* 생성 샘플을 제거했다.
2. 내부 /creators와 /content-flows만 별도 internalReviewBundles를 읽는다.
3. 기존 localStorage 마이그레이션은 flow-preview-*와 미저장 archive를 제거한다. 저장한 archive는 이전 저장본으로 전환해 완료 기록과 메모를 보존한다.
4. 생성 샘플과 archive direct /f URL은 다른 Flow 찾기와 홈 복귀가 가능한 한국어 서비스용 404로 닫았다.
5. 대체 Flow가 지정된 archive는 replacement route가 계속 열리는지 확인한다.
6. /creators의 공개 링크는 source-fit 승인 Flow만 허용한다.
7. 품질 게이트에서 직접 노출이 중단된 구형 Flow Map은 카탈로그에서 현재 대표 Map으로 교체하고 direct route를 404로 닫았다.
8. 정상 /flows와 공개 제작자 프로필에서는 검토 게이트 링크를 제거하고, direct review route에서는 예전 설명·일정·체크 항목을 숨겼다. 내부 preview channel과 /creators 재고는 검토용으로 보존했다.

## 저장한 archive 처리

- 이전 저장본 1개를 개인 기록으로 보존했다.
- 이전 runtime 마이그레이션에서 bundle이 사라진 상태의 canonical 복구: true.
- 모바일/와이드 목록 표시: true/true.
- 완료/메모 보존: true/true.
- 오늘·캘린더 재투영 방지: true.
- 대체 Flow: /f/reading-habit-30day.

## 오래된 콘텐츠 해석

- 공개 승인 71개: 정상 실행과 index 허용.
- 검토 게이트 86개: 원문 또는 UX 승인 전이며 noindex, 저장/export 차단. “공개 콘텐츠” 수에 포함하지 않고 정상 발견 경로 링크도 0개로 유지한다.
- 검토 게이트 direct route: 예전 실행 미리보기 0개, 목록 항목 0개, 숨김 marker 1개.
- 공개 제작자 프로필은 승인 콘텐츠만 사용하며 처음 12개를 간결한 카드로 보여주고 나머지는 더 보기로 연다. 펼친 미리보기/베타 라벨은 0/0개다.
- 생성 샘플 440개: 실제 콘텐츠가 아닌 구조 검토 재고. runtime과 public route에서 제거.
- 명시적 archive 20개: 출처 불충분 또는 공개 숨김 판정이 확정되어 runtime과 public route에서 제거.
  - digital-detox-weekly: unsupported_source_claims · 원문이 삭제되었고 현재 Flow의 효과 문구를 뒷받침할 수 없습니다.
  - new-hobby-30day: unsupported_source_claims · 플랫폼 홈페이지만으로 30일 실행 행을 근거화할 수 없습니다.
  - real-fitvely-weekly-body-check: source_mismatch · 넓은 채널 출처가 주간 신체 체크 실행 구조를 직접 뒷받침하지 않습니다.
  - skin-weekly-check: explicit_public_hide · 기존 source-fit 감사에서 공개 카탈로그 숨김으로 확정했습니다.
  - real-pet-health-visit-routine: source_mismatch · 현재 원문은 서울시 취약계층 반려동물 의료비 지원 사업이며 일반 병원 방문 기록과 다릅니다. · 대체 pet-health-observation
  - book-finish-one: source_mismatch · 원문은 읽기 습관 팁이며 한 권 완독일과 일일 페이지 계획을 제공하지 않습니다. · 대체 reading-habit-30day
  - real-gov24-resident-register-copy: superseded_duplicate · 같은 정부24 원문을 더 구체적으로 다루는 등본·초본 발급 Flow가 이미 있습니다. · 대체 resident-register-copy-issue
  - study-exam-d30-plan: source_mismatch · 원문은 영어 홈학습 팁이며 범용 시험 D-30 일정과 12개 시험 준비 항목을 직접 뒷받침하지 않습니다.
  - real-sinagong-computer-d30-study: superseded_duplicate · 같은 2026 시나공 컴활 교재를 더 넓은 D-30 실행 순서로 다루는 대표 학습 Flow가 이미 있습니다. · 대체 computer-skills-d30-study
  - real-thankyou-bubu-video-full-body-no-jump: superseded_duplicate · 같은 ThankyouBUBU 영상을 사용하는 홈트 시작 Flow와 실행 구조가 중복됩니다. · 대체 real-thankyou-bubu-home-workout-starter
  - infant-health-checkup-prep: superseded_duplicate · 같은 NHIS 원문을 생년월일과 검진 차수 기준으로 더 완전하게 계산하는 영유아 건강검진 일정 Flow가 있습니다. · 대체 infant-health-checkup-schedule
  - real-ts-vehicle-inspection-prep: superseded_duplicate · 같은 TS 공식 원문을 D-14 준비부터 검사 결과 후속까지 더 구체적으로 다루는 대표 자동차검사 Flow가 있습니다. · 대체 vehicle-inspection-prep
  - moving-dday: superseded_duplicate · 같은 AJD 원문과 다섯 개 마일스톤을 명확한 D-30 일정으로 보존한 정본 Flow가 있습니다. · 대체 curated-ajd-moving-d30
  - wedding-timeline: superseded_duplicate · 같은 원문과 타임라인을 더 구체적인 D-month 일정으로 보존한 정본 Flow가 있습니다. · 대체 curated-wedding-naver-timeline
  - opic-2w: superseded_duplicate · 같은 원문 XLSX의 14일 코스를 날짜별로 보존한 정본 Flow가 있습니다. · 대체 curated-opic-single-mock-review
  - opic-1m: superseded_duplicate · 같은 원문 XLSX의 한 달 반복 계획을 주차별로 보존한 정본 Flow가 있습니다. · 대체 curated-opic-course-row-import
  - new-car-7-step: superseded_duplicate · 같은 겟차 원문의 일곱 단계 구매 절차를 견적 메모와 함께 다루는 정본 Flow가 있습니다. · 대체 curated-new-car-basic
  - reading-book-finish: superseded_duplicate · 같은 원문을 월 4권과 주간 기록으로 구체화한 정본 Flow가 있으며 예전 변환본은 같은 행동을 반복합니다. · 대체 curated-reading-monthly-log
  - homefit-morning-2w: superseded_duplicate · 채널 홈 대신 정확한 Allblanc 아침 운동 영상과 반복 요일을 사용하는 정본 Flow가 있습니다. · 대체 curated-allblanc-morning-workout
  - homefit-video-queue: superseded_duplicate · 채널 홈에서 일반 행동을 반복한 예전 큐 대신 정확한 영상 기반 운동 Flow를 사용합니다. · 대체 curated-allblanc-morning-workout
- 현재 public Flow Map 11개: 카탈로그와 direct route를 허용하고 대표 모바일 화면 overflow 0건.
- 공개 중단 구형 Flow Map 8개: direct route 404 8개, 정상 사용자 route 링크 0개.
- 정상 source freshness: current 120, stale 0, review-due 0, missing 0.

## archive 보류 후보

- 이번 배치에서 확인한 보류 후보는 모두 이관 후 archive했습니다.

## 남은 리스크

- 검토 게이트 86개는 아직 runtime 재고에 남아 있다. 다음 포트폴리오 배치에서 promote / keep-gated / archive를 계속 결정해야 한다.
- 정상 4탭 route는 여전히 큰 AppClient client bundle을 공유한다. 생성 객체 제거와 별개로 route/component split이 필요하다.
- 자동 QA는 실제 사용자 검증을 대신하지 않는다.
