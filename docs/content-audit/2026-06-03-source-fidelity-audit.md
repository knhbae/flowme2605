# 2026-06-03 원문 충실도(할루시네이션) 감사

## 왜 했나
"각 Flow가 정말 원문에서 만들어졌는지, 아니면 할루시네이션으로 작성됐는지
다시 확인하고, 아닌 것은 아니라고 표시해 달라"는 요청에 따라 44개 Flow의
원문 충실도를 점검했다.

## 검증 시도와 한계 (정직한 보고)
- WebFetch / curl로 24개 공식 출처 URL에 접근 시도 → **전부 HTTP 403**
  (정부·기업 사이트의 봇 차단). 페이지 존재 여부(404)조차 자동 확인 불가.
- 즉, **자동 도구로는 원문 대조가 불가능**하다. 아래 판정은 "생성 과정에서
  실제 원문을 읽고 추출했는가"에 대한 정직한 자가 점검 결과이며, 페이지
  내용과의 1:1 대조 검증은 아니다.

## 가장 중요한 사실
**44개 Flow 중 어느 것도 실제 원문 페이지를 열어 내용을 추출해 만든 것이 아니다.**
모두 해당 서비스·주제에 대한 일반 지식으로 작성됐고, `source_url`은 사후에
"그럴듯하게" 붙인 것이다. 그래서 시스템상 전부 `source_status: needs_review`
(검증 전) 상태다. 이번 감사는 그 안에서 위험도를 3단계로 나눈다.

## 판정 기준
| 등급 | 의미 |
|---|---|
| 🟡 절차 기반·링크 미검증 | 서비스·절차는 실재하는 공개 정보이고 내용도 그에 부합하나, 원문 페이지에서 추출하지 않았고 deep-link 경로가 미검증(틀리거나 404 가능) |
| 🔴 원문 미반영 | 특정 창작자/플랫폼을 출처로 표기했으나 그 출처의 특정 콘텐츠에서 만든 것이 아님. 내용은 일반론이고 URL은 채널/플랫폼 홈. 출처 표기에 근거 없음 |

---

## 공식 배치 (24개) — 🟡 절차 기반·링크 미검증
도메인과 절차는 실재 공공서비스 기반이라 **내용 할루시네이션 위험은 낮다**.
다만 다음이 미검증이다:
- deep-link 경로(예: `/ei/eih/eg/eb/ebPersonBnef/retrieveEb010101.do`)가
  실제 그 페이지인지 확인 못 함 → 틀렸거나 404일 수 있음.
- 금액·기간·조건 등 구체 수치는 Flow가 의도적으로 단정하지 않고
  "공식 확인" 질문으로 남겨 둠(할루시네이션 회피 장치).

| Flow | 출처 도메인(실재) | 권고 |
|---|---|---|
| national-scholarship-apply | kosaf.go.kr ✓ | 링크 경로 수동 검증 |
| housing-subscription-account | applyhome.co.kr ✓ | 링크 경로 수동 검증 |
| jeonse-guarantee-apply | khug.or.kr ✓ | 링크 경로 수동 검증 |
| welfare-benefit-finder | bokjiro.go.kr ✓ | 링크 경로 수동 검증 |
| small-business-fund-check | semas.or.kr ✓ | 링크 경로 수동 검증 |
| unemployment-benefit-apply | ei.go.kr ✓ | 링크 경로 수동 검증 |
| job-seeker-allowance-apply | work24.go.kr ✓ | 링크 경로 수동 검증 |
| pension-estimate-check | nps.or.kr ✓ | 링크 경로 수동 검증 |
| health-insurance-dependent | nhis.or.kr ✓ | 링크 경로 수동 검증 |
| infant-health-checkup-schedule | nhis.or.kr ✓ | 링크 경로 수동 검증 |
| adult-vaccine-schedule-check | nip.kdca.go.kr ✓ | 링크 경로 수동 검증 |
| citizen-secretary-alerts | gov.kr ✓ | 링크 경로 수동 검증 |
| first-passport-issue | passport.go.kr ✓ | 링크 경로 수동 검증 |
| overseas-safety-register | 0404.go.kr ✓ | 링크 경로 수동 검증 |
| customs-traveler-declare | customs.go.kr ✓ | 링크 경로 수동 검증 |
| used-car-ownership-transfer | ecar.go.kr ✓ | 링크 경로 수동 검증 |
| ev-subsidy-apply | ev.or.kr ✓ | 링크 경로 수동 검증 |
| property-local-tax-pay | wetax.go.kr ✓ | 링크 경로 수동 검증 |
| tax-refund-find | hometax.go.kr ✓ | 링크 경로 수동 검증 |
| birth-registration-prep | efamily.scourt.go.kr ✓ | 링크 경로 수동 검증 |
| safe-inheritance-onestop | gov.kr ✓ | 링크 경로 수동 검증 |
| seal-or-signature-certificate | gov.kr ✓ | 링크 경로 수동 검증 |
| childcare-fee-support-apply | bokjiro.go.kr ✓ | 링크 경로 수동 검증 |
| military-exam-prep | mma.go.kr ✓ | 링크 경로 수동 검증 |

---

## 크리에이터 배치 (20개) — 🔴 원문 미반영
특정 창작자/플랫폼 이름을 출처로 달았지만, **그 채널·플랫폼의 특정 영상/글에서
만든 게 아니다.** 내용은 일반적인 how-to이고 URL은 전부 채널/플랫폼 홈이다.
→ 출처 표기와 실제 내용 사이에 근거 연결이 없다. 가장 정리가 필요한 그룹.

| Flow | 표기 출처 | 문제 |
|---|---|---|
| recipe-video-execute | 백종원의 요리비책 YouTube | 특정 영상 아님, 채널 홈만 |
| weekly-meal-plan | 만개의 레시피 | 특정 레시피 아님, 사이트 홈만 |
| closet-organize-1day | 오늘의집 | 특정 콘텐츠 아님, 사이트 홈만 |
| kitchen-reset-organize | 오늘의집 | 특정 콘텐츠 아님, 사이트 홈만 |
| monthly-household-budget | 슈카월드 YouTube | 특정 영상 아님, 채널 홈만 |
| payday-finance-routine | 슈카월드 YouTube | 특정 영상 아님 + 재무민감 |
| reading-habit-30day | 브런치스토리 | 특정 글 아님, 플랫폼 홈만 |
| book-finish-one | 브런치스토리 | 특정 글 아님, 플랫폼 홈만 |
| morning-skincare-routine | 브런치스토리 | 특정 글 아님, 플랫폼 홈만 |
| skin-weekly-check | 브런치스토리 | 특정 글 아님, 플랫폼 홈만 |
| domestic-trip-d7 | 에어비앤비 코리아 | 특정 가이드 아님, 사이트 홈만 |
| travel-packing-list | 브런치스토리 | 특정 글 아님, 플랫폼 홈만 |
| home-cafe-daily | 브런치스토리 | 특정 글 아님, 플랫폼 홈만 |
| new-hobby-30day | 클래스101 | 특정 클래스 아님, 사이트 홈만 |
| portfolio-4week | 원티드 커리어 가이드 | 특정 글 아님, 사이트 홈만 |
| blog-youtube-start | 네이버 블로그 가이드 | 특정 가이드 아님, 플랫폼 홈만 |
| morning-routine-30day | 브런치스토리 | 특정 글 아님, 플랫폼 홈만 |
| digital-detox-weekly | 브런치스토리 | 특정 글 아님, 플랫폼 홈만 |
| dog-walk-routine | 네이버 펫 | 특정 콘텐츠 아님, 플랫폼 홈만 |
| pet-health-observation | 네이버 펫 | 특정 콘텐츠 아님, 플랫폼 홈만 |

특히 **브런치스토리 1개 도메인에 8개 Flow**가 몰려 있어, 일반 자기계발
콘텐츠에 브랜드만 붙인 패턴이 뚜렷하다.

## 권고 (다음 액션)
1. **크리에이터 20개**: 출처 표기를 "특정 원문 기반"에서 "일반 가이드(특정
   출처 없음)"로 바로잡거나, 진짜 특정 영상/글 URL을 정해 그 내용으로 다시
   작성. 현 상태로는 공개·대표 콘텐츠로 쓰면 안 됨.
2. **공식 24개**: deep-link 경로를 사람이 직접 한 번씩 눌러 검증하거나,
   검증 전까지는 도메인 루트로 되돌리는 게 안전.
3. 모든 Flow는 이미 `needs_review`이므로 검증 전 공개/대표 승격 금지 원칙 유지.

## 표시 방법
- `preview/260601/index.html`에 Flow별 🔴/🟡 배지와 범례를 추가.
- 각 프리뷰 페이지 상단에 동일 등급 배너를 삽입.
