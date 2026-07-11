# FlowMe sensitive source freshness audit evidence

2026-07-12 기준으로 마지막 `source_replacement` 1개와 `risk_review` 13개를 현재 원문·콘텐츠 범위·공개 게이트까지 다시 감사한 패키지입니다. 링크가 열리는 것과 사용자에게 저장·완료·내보내기를 허용하는 판단을 분리했습니다.

## 결론

- 이번 감사: 14개 (`source review queue` 14 → 0)
- 대표 공개 실행 유지: 11개
- 재구성 전 검토 전용: 3개
- 전체 수동 source-fit: 132개 중 승인 46, 재구성 73, 미리보기 12, 숨김 1
- 공개 indexable Flow: 77개, review-only Flow: 540개
- 캡처: 모바일 14장 + wide 7장
- decision 불일치 0, seed/audit 원문 URL 불일치 0, 확인일/콘텐츠 업데이트일 불일치 0, 공개 게이트 불일치 0
- 오래된 문구 hit 0, 제한 route 실행 행동 누출 0, 가로 overflow 0
- indexable 77개 전체 손상 문자열 hit 0
- 공개 원문 네트워크 검사: 151 route / 155 URL, 명시적 404 0, 수동 재확인 10

공개 승격한 11개도 결과를 보장하는 도구로 만들지 않았습니다. 신청 가능성, 의료 판단, 지원 금액처럼 개인 심사가 필요한 값은 공식 조회·상담 결과를 기록하는 행동으로만 남겼습니다. 청약·월간 가계부·월급날 루틴은 URL이 살아 있어도 범위와 조언 경계가 부족해 읽기 전용 상태를 유지합니다.

## 주요 교정

- 전기차 보조금: 잘못된 `지원 확인서 → 계약` 순서를 공식 `구매계약 → 판매점 지원신청 → 선정 → 출고·등록 → 지급신청`으로 바로잡았습니다.
- 성인 예방접종: 개인 접종 일정·무료지원 판정을 없애고 `이력 조회 → 누락 문의 → 의료진 상담 → 예약 → 기록`으로 좁혔습니다.
- 중고차 이전등록: 동작하지 않는 정부24 상세 URL과 근거 없는 처리기간을 제거하고 자동차365·현행 법령으로 교체했습니다.
- 소상공인 정책자금: 고정 인원수와 일반 교육 요건을 제거하고 현재 공고별 대상·제외업종·대출방식·자료 확인으로 바꿨습니다.
- 지방세: broad한 연납·절세 검토를 제거하고 위택스의 현재 부과내역 조회·납부·영수증 확인으로 좁혔습니다.
- 청약: 고정 가점 수치를 제거하고 관심 공고 하나의 자격·일정을 확인하는 준비 구조로 낮췄으며 공개 승격은 보류했습니다.
- 콘텐츠 업데이트 표시는 고정 6월 1일이 아니라 실제 `source_checked_at` 날짜를 따릅니다.

## 파일

- [review.html](./review.html): 승인/제한 결정과 모바일·wide 21장 화면을 함께 보는 보드
- [audit.md](./audit.md): source별 판단, 교정 근거, 남은 위험
- [route-evidence.json](./route-evidence.json): decision, 원문 URL, 공개 게이트, stale copy, viewport marker
- [source-reachability.json](./source-reachability.json): 공개 사용자 route의 원문·항목 링크 네트워크 검사
- [screenshots](./screenshots/): 390px 및 1024px 전체 캡처

## 재현

```powershell
$env:FLOWME_CAPTURE_BASE_URL='http://127.0.0.1:3016'
$env:FLOWME_SOURCE_AUDIT_SLICE='sensitive'
npm.cmd exec -- tsx scripts/content-audit/capture-flow-current-source-freshness-audit.ts
npm.cmd exec -- tsx scripts/content-audit/audit-exposed-source-reachability.ts --strict --output docs/content-audit/2026-07-12-flowme-sensitive-source-freshness-audit-evidence/source-reachability.json
npm.cmd test
npm.cmd run docs:check
npm.cmd run build
```

네트워크 도달 가능성은 의미상 최신성을 보장하지 않습니다. 외부 차단·로그인 redirect·일시 네트워크 오류만으로 삭제를 단정하지도 않습니다. 자동 검증과 화면 캡처는 실제 사용자 관찰을 대체하지 않습니다.
