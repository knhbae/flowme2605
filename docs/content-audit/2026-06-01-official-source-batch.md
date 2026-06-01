# 2026-06-01 공식출처 기반 배치 (24개)

## 왜 다시 만들었나
직전 generic 배치(34개)에 대한 `2026-06-01-ux-content-evaluation.md` 평가에서
가장 큰 약점은 **Content Fidelity(원본 충실도)** 였다. 34개 중 27개가 "정확한 원본
1건" 없이 도메인 상식으로 만든 큐레이션 체크리스트였고, 이는 FLOW의 정체성(실제
경험/콘텐츠를 실행으로 변환)과 어긋났다.

그래서 generic 배치를 폐기하고, **모든 Flow가 실재하는 한국 공공서비스 포털에
매핑되는** 배치로 다시 만들었다.

- 코드: `lib/flow/contents-batch-260601-official.ts` (24개), `seed-flows.ts`에 합류.
- 폐기: `lib/flow/contents-batch-260601.ts` 삭제.

## 출처 원칙 (허위 출처 금지)
- 각 Flow는 실재하는 공식 포털 서비스에 매핑한다.
- URL은 해당 기관의 **실재 도메인(메인/서비스 랜딩)** 만 사용한다. 확신 없는 깊은
  쿼리스트링 deep-link는 만들지 않는다.
- 대상/금액/조건은 개인 상황·연도에 따라 달라지므로 Flow가 단정하지 않고
  "공식 확인 질문"으로 남긴다.

## 사용한 공식 출처 (24개 Flow)
| 영역 | Flow | 공식 출처 |
|---|---|---|
| 교육/장학 | 국가장학금 신청 | 한국장학재단 kosaf.go.kr |
| 주거/청약 | 주택청약 자격·통장 | 청약홈 applyhome.co.kr |
| 주거/금융 | 전세보증금 반환보증 | 주택도시보증공사 khug.or.kr |
| 복지/지원 | 맞춤형 복지서비스 찾기 | 복지로 bokjiro.go.kr |
| 사업/지원 | 소상공인 정책자금 | 소상공인시장진흥공단 semas.or.kr |
| 고용 | 실업급여(구직급여) | 고용보험 ei.go.kr |
| 고용 | 국민취업지원제도 | 고용24 work24.go.kr |
| 연금 | 국민연금 예상연금 | 국민연금공단 nps.or.kr |
| 건강보험 | 피부양자 등록 | 국민건강보험공단 nhis.or.kr |
| 육아/검진 | 영유아 건강검진 | 국민건강보험 nhis.or.kr |
| 예방접종 | 성인·어르신 접종 | 질병관리청 예방접종도우미 nip.kdca.go.kr |
| 생활행정 | 국민비서 알림 | 정부24 국민비서 gov.kr |
| 여권 | 여권 신규 발급 | 외교부 여권안내 passport.go.kr |
| 여행/안전 | 해외안전여행 | 외교부 0404.go.kr |
| 여행/관세 | 휴대품 면세범위 | 관세청 customs.go.kr |
| 자동차 | 이전등록(명의이전) | 자동차민원 ecar.go.kr |
| 자동차 | 전기차 보조금 | 무공해차 통합누리집 ev.or.kr |
| 세금 | 지방세(재산세·자동차세) | 위택스 wetax.go.kr |
| 세금 | 미환급금 찾기 | 홈택스/정부24 gov.kr |
| 가족 | 출생신고 | 정부24/전자가족관계등록 gov.kr |
| 가족 | 안심상속 원스톱 | 정부24 gov.kr |
| 서류 | 인감/본인서명확인 | 정부24 gov.kr |
| 육아/지원 | 보육료·양육수당 | 복지로/아이사랑 bokjiro.go.kr |
| 병역 | 병역판정검사 | 병무청 mma.go.kr |

## 분류 (Stage 0 준수)
- 전부 `source_status: 'needs_review'`, `source_precision: 'exact'`, 항목
  `source_type: 'official'`.
- inventory `source_needs_review` 24, lifecycle `fix` 79(55→79), source-review
  큐 24(비민감 12 → `audit_now`, 민감 12 → `risk_review`).
- 품질 게이트 보존: legacy 0, remove_candidate 0, keep 15, hide 1, preview 440,
  broad_real_source 0.
- **어떤 라우트도 검증/대표/공개 MVP 아님.** 직접 URL 접근만 가능하며, 다음 단계는
  각 Flow의 공식 페이지를 열어 사용자 여정·간극을 수동 source-fit audit으로 남기는
  것이다(특히 `audit_now` 12개부터).

## 직전 generic 배치와의 차이 (평가 지적 반영)
- **Content Fidelity**: 일반론 → 실재 공식 서비스 매핑(항목 source_type=official,
  detail에 공식 링크 포함).
- **Source/Safety 분리**: 민감(의료/재무) 12개에 경고 + "공식 확인 질문" + 중단/상담
  조건 분리.
- **남은 약점**: URL이 기관 메인/서비스 랜딩 수준이라 "정확한 한 페이지"까지는 아직
  아니다(audit 단계에서 deep-link와 사용자 여정으로 좁혀야 함). 개인 변수(금액·지역)
  입력 산출물 연결도 미구현 — 이전 평가의 UX 백로그가 그대로 유효하다.

## 검증
- `npm test` 179 pass · `npm run build` 성공 · `npm run docs:check` 통과.
- 새 공식 Flow SSR 렌더링 확인(HTTP 200).
- E2E는 컨테이너 환경 제약(Windows Chrome 경로 고정)으로 미실행.
