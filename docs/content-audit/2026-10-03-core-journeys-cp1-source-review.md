# CP1 출처 재검토와 새 공급 격리

2026-10-03. 작업본 `D:/flowme2605/flow-core-journeys-cp1-20261003`.

사용자가 승인한 선행 보안·출처 검증 해결 범위다. 검토일만 바꿔 기한 검사를 통과시키지 않고, 실제 원문·첨부와 저장된 실행 항목을 대조했다. 원문이 뒷받침하지 않는 항목은 기존 `source_rows` 실행 보류와 `source_mismatch`/`unsupported_source_claims` 공급 격리 계약을 사용했다. 새 정책·hold 타입·schema·일정 계산은 만들지 않았다.

## 결과와 경계

대상은 **14 bundle / 11 primary URL**이다. 실제 검토 범위가 일치하는 7개만 `source_checked_at: 2026-10-03`으로 갱신했다. 원문 불일치 또는 삭제 7개는 기존 검토일·항목·세부 내용·원문 URL·버전을 보존하고 CP1의 새 seed 공급에서 제외했다. 원문이 최근 바뀌었는지, 과거 변환에서 달라졌는지는 이번 원문 대조만으로 구별할 수 없다.

이 문서의 “공급 제외”는 원문 자료나 개인 기록 삭제가 아니다. 정적 원본 bundle과 검토용 package는 남는다. 기존 저장 사본을 삭제하거나 새 판본으로 바꾸지 않는다. 운영 catalog pack, 실제 DB, 계정, 운영 저장소에는 쓰지 않았다. source 상태가 `needs_review`인 기록표와 기존 의료·세금 보류는 검토일 갱신 여부와 무관하게 유지한다.

| 진단 | 원래 공급 | 이번 로컬 공급 |
| --- | ---: | ---: |
| published bundle | 156 | 149 |
| normal user route | 133 | 126 |
| preview/hidden | 23 | 23 |
| current | 119 | 126 |
| review due | 14 | 0 |
| stale / missing metadata | 0 / 0 | 0 / 0 |

마지막 열은 `2026-10-03T05:37:58.191Z`에 실제 진단을 다시 실행한 값이다. 7개 실제 재검토와 7개 공급 제외가 함께 반영된 결과이며, 14개 모두를 검증 완료하거나 의료적 적합성을 승인했다는 뜻이 아니다. 게시·새 build 브라우저 QA·실사용 관찰 근거도 아니다.

## 대상별 처리

| bundle | 원문 키 | 실제 확인값/차이 | 검토일 처리 | disposition |
| --- | --- | --- | --- | --- |
| `source-backed-moving-d30` | A | 현재 D-10/D-3과 저장 D-14/D-7, D-1 사진 대상이 다름 | 06-23 유지 | `source_mismatch` 격리, `moving-d30` 새 실행 보류 |
| `source-backed-middle-school-math-1` | B | 8단원·73개 하위 개념의 이름·순서·개수 일치 | 10-03 갱신 | 기존 candidate 유지 |
| `source-backed-baby-health-checkups` | C | 건강검진 8기간·구강검진 4기간의 월령/일령 표기 일치 | 10-03 갱신 | 기존 의료 실행 보류 유지; 달력 계산 검증 아님 |
| `source-backed-baby-vaccination-schedule` | D | 6개 일반 조회 시점과 공식 조회 우선 조건 확인 | 10-03 갱신 | 기존 의료 실행 보류 유지; 백신별 접종 처방 아님 |
| `source-backed-smishing-response` | E | 118·보호나라·통합신고대응센터 3경로 일치 | 10-03 갱신 | 기존 reject 유지; 신고 실행 없음 |
| `source-backed-year-end-tax-submit` | F | 실제 게시물 없음 응답; 현행 제출 조건 확인 불가 | 06-25 유지 | `unsupported_source_claims` 격리, 기존 세금 보류 유지 |
| `source-backed-picnic-food-safety` | G | 장보기·조리·운반/섭취 3묶음과 1시간 이내 장보기 일치 | 10-03 갱신 | 기존 reject 유지 |
| `curated-opic-single-mock-review` | H | 7/14일 원문 휴식과 회차별 보완·복습 행을 현재 항목이 그대로 보존하지 않음 | 06-29 유지 | `source_mismatch` 격리, OPIC map 새 실행 보류 |
| `curated-opic-course-row-import` | H | 실제 5주 35일; 마지막 휴식 대신 원문 없는 회차 선택 항목 포함 | 06-29 유지 | `source_mismatch` 격리, OPIC map 새 실행 보류 |
| `curated-baby-food-daily-meal-row` | I | 먹은 양·알레르기 O/X의 기록 칸만 확인 | 10-03 갱신 | `needs_review`, 기존 direct route 제한·의료 보류 유지 |
| `curated-baby-food-cube-stock` | I | 재료·만든 날짜·수량의 재고 기록 칸만 확인 | 10-03 갱신 | `needs_review`, 기존 direct route 제한·의료 보류 유지 |
| `curated-reading-monthly-log` | J | 월 5권 선택·미완독 허용과 저장 월 4권·주 1권·30분 일정이 다름 | 06-29 유지 | `source_mismatch` 격리, reading map 새 실행 보류 |
| `curated-child-vaccination-first-year` | K | RV1 2회/RV5 3회 조건이 현재 6개월 RV 3차 항목에서 빠짐 | 06-29 유지 | `source_mismatch` 격리, 기존 의료 보류 유지 |
| `curated-child-vaccination-booster-school-age` | K | Hib·PCV 원문 12~15개월과 저장 15~18개월 묶음이 다름 | 06-29 유지 | `source_mismatch` 격리, 기존 의료 보류 유지 |

## 실제 원문과 확인 범위

### A. AJD 이사 준비

Primary: [AJD 이사 준비 체크리스트](https://www.ajd.co.kr/contents/basic-tip/detail/이사_준비_체크리스트_완벽정리!_엑셀_Xls_PDF_노션_notion_첨부-23363).

오늘 정상 본문을 읽었다. 표시된 수정일은 2026-06-30이며 표는 D-30, D-10, D-3, D-1, D-Day로 나뉜다. 청소 예약은 D-30, 폐기물·주소·관리 관련 준비는 D-10에 있다. 저장 bundle의 D-14/D-7 배치와 다르다. D-1은 가구·가전 사진인데 현재 항목은 계량기·집 상태 사진까지 포함한다. 저장 항목은 원문 exact 일정이라고 설명하며 파생 일정 구분이 없다. 임의로 날짜나 사진 대상을 고치지 않고 보류했다. 같은 URL을 쓰는 다른 기존 bundle의 내용·판본은 이번 대상에 포함하지 않았다.

### B. Mathbang 중1 수학 목차

Primary: [Mathbang 중1 수학 목차](https://mathbang.net/13).

오늘 본문 전체 목차와 로컬 `mathUnits`를 대조했다. 게시 표시는 2025-07-04, 2022 개정 교육과정이다. 8단원의 하위 개념 수 `[8, 14, 12, 4, 15, 6, 6, 8]`, 합계 73개와 이름·순서가 일치했다. 학습 날짜나 소요 기간은 원문에서 만들지 않는다. 검토일만 갱신했다.

### C. 찾기쉬운 생활법령 영유아 검진

Primary: [영유아 건강검진 시기 안내](https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=1&cciNo=2&cnpClsNo=2&csmSeq=1138&popMenu=ov).

오늘 실제 표를 읽었다. 법령정보 기준 표시는 2026-09-15이다. 건강검진 14~35일, 4~6/9~12/18~24/30~36/42~48/54~60/66~71개월 및 구강검진 18~29/30~41/42~53/54~65개월 표기가 저장된 12기간과 일치했다. 원문에는 이 기간과 검사 내용이 있으나, 로컬의 30일 단위 월령 근사 offset을 임상적으로 정확한 개인별 날짜라고 검증한 것은 아니다. `baby-health-schedule`의 기존 `publicExecutionEnabled:false`를 유지한다. 원문 검사 구간 확인과 캘린더/의료 적용은 별도다.

### D. 질병관리청 예방접종도우미

Primary: [질병관리청 표준 예방접종 일정표](https://nip.kdca.go.kr/irhp/infm/goVcntInfo.do?menuCd=115&menuLv=1).

오늘 페이지와 [실제 연결된 2026 일정 이미지](https://nip.kdca.go.kr/irhp/images/egovframework/rte/infm/Immunization_Schedule_for_Children_2026.jpg)를 정상 브라우저로 읽었다. 페이지의 최종 검토일은 2024-01-15이고, 현재 미리보기는 2026 표다. 확대 링크에 구형 2023 이미지가 남아 있어 페이지 날짜·이미지 연도·오늘 검토일을 합치지 않는다.

저장된 항목은 출생·2/4/6개월·12~15개월·18개월 이후의 일반적인 공식 조회 행동 6개다. 백신명이나 접종 회차를 새로 처방하지 않고, 예방접종도우미의 실제 조회와 의료기관 확인을 우선하는 조건을 보존한다. 이 범위만 재검토했다. 기존 의료 실행 보류는 유지하며 지연 접종·백신별 조건의 개인 적용을 승인하지 않는다. Node TLS 연결은 실패했으나 보안 설정을 낮추지 않고 정상 Chrome으로 확인했다.

### E. KISA 스미싱·큐싱 공격 대응

Primary: [KISA 스미싱·큐싱 공격 대응](https://www.kisa.or.kr/1020601).

오늘 정상 Chrome에서 실제 본문과 링크를 읽었다. 최종 수정 표시는 2025-04-28이다. 118, 카카오톡 보호나라의 스미싱/큐싱 메뉴, 전자통신금융사기 통합신고대응센터의 스미싱 문자 신고 경로가 저장된 3항목과 일치했다. [KISA 스팸 대응 안내](https://spam.kisa.or.kr/spam/main.do)도 의심 URL을 실행하지 않는 조건의 참고로 읽었다. 상담·신고·메시지 전송은 하지 않았다. 악성 여부 판정, 인증번호·계좌정보 저장으로 확대하지 않았고 기존 reject 판정도 바꾸지 않았다. 일반 HTTP 도구의 인증서/수집 실패를 보안 해제로 우회하지 않았다.

### F. 국세청 연말정산 제출

Primary: [저장된 국세청 게시물 URL](https://www.nts.go.kr/nts/na/ntt/selectNttInfo.do?mi=6489&nttSn=1330438).

오늘 HTTP 응답은 시스템 안내였고 정상 브라우저는 게시물이 없다는 안내를 표시했다. 기존 D-3/D-1/마감일 항목과 현행 귀속연도·회사별 조건을 확인하지 못했다. 다른 홈택스 페이지로 근거를 바꿔 채우거나 세금 내용·마감일을 새로 만들지 않았다. 검토일 2026-06-25와 내용은 보존한다. 기존 `official_freshness` 실행 보류에 더해 해당 bundle만 새 seed 공급에서 격리했다.

### G. 식품의약품안전처 나들이 식품 안전

Primary: [식품의약품안전처 나들이철 카드뉴스](https://www.mfds.go.kr/brd/m_827/view.do?company_cd=&company_nm=&itm_seq_1=0&multi_itm_seq=0&page=2&seq=3608&srchFr=&srchTo=&srchTp=&srchWord=).

오늘 실제 카드뉴스 본문·대체 텍스트를 읽었다. 게시일은 2022-07-07이다. 저장된 장보기, 손 씻기·조리, 냉장 운반·섭취 전 확인의 3묶음은 원문의 해당 행동을 보존한다. 실온 식품부터 어패류까지의 구입 순서와 1시간 이내 장보기도 일치했다. 원문 전체 안전 기준을 완전한 실행표로 가져왔다고 주장하지 않는다. 전날/당일 배치는 개인 준비용 배치이지 식약처의 법정 기한이 아니다. 검토일만 갱신하고 기존 reject를 유지했다.

### H. Mansour OPIC 원문과 실제 XLSX

Primary: [Mansour OPIC 모의고사 공부 방법](https://mansour.tistory.com/entry/%EC%98%A4%ED%94%BD-%EB%AA%A8%EC%9D%98%EA%B3%A0%EC%82%AC-%EA%B3%B5%EB%B6%80-%EB%B0%A9%EB%B2%95).

오늘 게시글과 실제 연결된 `오픽 모의고사 공부 계획표_오픽만수르.xlsx`를 읽었다. 게시일은 2023-08-08이다. 공개 첨부를 메모리에서 직접 파싱했으며 파일을 수정하거나 다시 게시하지 않았다. 2주 코스 `B7:O15`는 두 차례 5일 연습·보완·복습, 다음 날 정리, 7/14일 휴식이다. 저장본은 휴식일에도 추가 학습을 배치하며 일부 회차의 보완·복습을 분리하지 않는다. 1달 코스 `B7:O30`는 실제 5주 35일이고 마지막 일요일도 휴식이다. 현재 마지막 행의 시험 전 회차 선택은 원문 행이 아니다.

오늘 받은 실제 첨부는 HTTP 200, 18,132 bytes, SHA-256 `1489f4c5b8fe9faaedfe9686cf3dd0db9c9032e1b210a2787a048f6c4223a16d`였다(`2026-10-03T05:06:37.627Z`). [기존 09-30 검토 기록](2026-09-30-core-ux-publish-source-review.md)의 첨부 해시와 같다. 파일이 같아도 현재 파생 항목의 원문 일치를 뜻하지 않는다. 과거 hash만으로 판단하지 않고 오늘 표를 다시 읽었다. 원문/파생 추가가 구분되기 전까지 두 bundle과 map의 새 실행을 보류한다. 글의 성적 보장 문구와 파일 재이용 권한은 새로 채택하지 않았다.

### I. Naver 이유식 식단·재고 기록표

Primary: [제작자 이유식 식단표](https://blog.naver.com/01695258757/222768860919).

오늘 원문이 실제 제공하는 공개 iframe 본문과 정상 브라우저 본문을 읽었다. 게시일은 2022-06-11이고 첨부 ZIP 이름에는 `241208` 수정 표기가 있다. 공개 글의 먹은 양·알레르기 O/X, 큐브 재료·만든 날짜·남은 수량 기록 설명은 현재 두 bundle의 기록 칸과 일치했다. 식단 시작 월령·메뉴·알레르기 판단·보관 기간의 의료적 적합성은 이 검토 대상이 아니다.

공개 본문에 제공된 접근 방법으로 실제 PDF도 읽기 전용 확인했다. D+180 식단표 2쪽은 45,180 bytes, SHA-256 `9b0daec9f90454009b917ccffb1f7bf67e18112702f35ec2bd76d918121649f0`, 재고표 1쪽은 20,244 bytes, SHA-256 `c4f833b6c1ed1cbb22ff2e64c5b0151a70e4d161a9613705ddb78239d2d4f1de`였다. PDF의 CJK 추출은 일부 깨져서 PDF 전체 행·메뉴의 완전 일치를 주장하지 않는다. HWP/ZIP 전체 표를 import하지 않았다. 공개 본문에서 확인한 기록 칸 범위만 검토일에 반영한다.

두 bundle의 `source_status:needs_review`, `medical_sensitive`, 해당 map의 direct route 제한과 별도 이유식 map의 기존 의료 보류를 모두 유지했다. 글의 보안 설정 완화 조언을 따르지 않았고 비밀번호·원문 파일 본문은 저장/보고서에 복제하지 않는다.

### J. Naver 독서 기록

Primary: [Naver 월별 독서 기록 원문](https://blog.naver.com/naristyle87/222978131890).

오늘 원문이 실제 제공하는 공개 iframe 본문을 읽었다. 게시일은 2023-01-08이다. 작성자는 아침 1시간 읽기 또는 쓰기, 취침 전 전자책, 월 5권 선정, 미완독과 계획 변경 허용을 설명한다. 현재 bundle은 월 4권·주 1권, 30분 읽기와 고정 일차를 원문 exact 일정으로 설명한다. 원문과 파생 계획이 구별되지 않는다. 본문을 고치거나 새 읽기 정책을 만들지 않고 검토일 06-29 유지·공급 격리·새 실행 보류로 닫았다.

### K. KHMS 어린이 예방접종 표

Primary: [KHMS 어린이 예방접종](https://khms.or.kr/healthy_life/prevention/vaccination_child).

오늘 실제 페이지와 [연결된 일정 이미지](https://khms.or.kr/assets/images/healthy_life/prevention/prevention3-1.png)를 정상 브라우저로 읽었고, D의 질병관리청 2026 표를 참고 비교했다. KHMS 본문/이미지에는 현재 개정·검토 연도가 표시되지 않아 최신 공식 일정이라고 확정하지 않는다.

원문 표의 RV1 2회/RV5 3회 조건이 현재 6개월 RV 3차 항목에서는 빠진다. 추가 접종 묶음에서도 Hib·PCV의 원문 12~15개월 구간과 현재 15~18개월 배치가 다르다. 이 조건을 임의로 고치거나 새 의료 권고를 만들지 않았다. 두 bundle의 내용·06-29 검토일을 보존하고 기존 의료 실행 보류를 유지한 채 새 seed 공급에서 격리했다. 개인별 실제 일정은 공식 조회/의료기관 확인 대상이다.

## 구현·보존 계약

- 격리 7개는 `RUNTIME_ARCHIVED_FLOW_POLICIES`에 기존 사유로만 추가했다. 원본 `sourceBackedMyFlowBundles`는 삭제하지 않는다. 새 공급은 기존 `mergeSourceBackedMyFlowBundles` 제외 계약을 따른다.
- moving/OPIC/reading map은 기존 `publicExecutionEnabled:false`, `executionHoldReason:source_rows`를 사용한다. 직접 검토 package와 원문 경로는 유지하고, 새 저장·파일 받기·일반 발견성만 막는다. 기존 의료/세금 hold는 바꾸지 않는다.
- 범용 `source_rows` 보류 안내는 “이 페이지에서 새 저장·파일 받기 불가”와 “원문 대비 항목·일정·조건 확인 필요”를 설명한다. 특정 Funmom 난이도 조건은 Funmom URL 요약에만 보존한다. 다른 자료의 보류 사유를 난이도 선정이라고 표시하지 않는다.
- 14 bundle 전체에서 `source_checked_at`만 정규화한 자료 해시는 변경 전후 `b216a1d5daad3e4d28623d859d153f07663d8db5a1080bb491334ef18a2a8c6f`로 같다. 항목·날짜 offset·세부 문구·원문 메타데이터·버전이 바뀌지 않았음을 검사한다.
- 인계 직전 기존 Map 저장 경로가 full bundle 없이 saved record·map snapshot·persistence만 저장하는 경우를 확인했다. 기존 archive 복구는 canonical seed만 찾아 해당 source-backed 사본을 놓칠 수 있었다. `storage.ts`의 읽기 복구 후보에 nonseed source 원본만 추가했으며, 유효한 정확 `flow:saved:<slug>` 기록이 있는 때만 기존 retired draft로 복구한다. saved slug, personalCopyKey, sourceFlowSlug/sourceFlowKey 및 저장된 public bundle의 원본 ID가 있는 경우 서로 일치해야 한다. 기존 canonical seed 복구 조건·writer·key/schema는 바꾸지 않는다.
- 합성 저장소에서 full bundle 보존과 record-only/완전 map snapshot/partial snapshot의 기존 7사본 복구, 개인 제목·체크 유지, 읽기 쓰기 0회와 전체 key/value 불변을 확인했다. saved key가 없거나 삭제된 경우, snapshot만 남은 경우, null/파손 record, 다른 slug·source ID·personal copy ID, 다른 owner namespace 또는 다른 ID의 stored public source는 복구하지 않는다. 스냅샷을 저장 의사로 간주하거나 archive를 새 public 공급으로 되돌리지 않는다. 기존 flat legacy 저장 계약을 다른 actor의 자료를 읽는 새 계약으로 확장하지 않았다. 실제 사용자 저장소에 복구를 실행하거나 모든 과거 사본을 전수 확인한 것은 아니다.
- actor·writer·identity·권한·CAS·parser·recurrence·canonical registry·source update 적용 정책·운영 catalog pack은 변경하지 않았다. 새 원문/파생 구조 설계 및 의료 내용 수정을 이번 일로 승인하지 않는다.

## 검증과 인계

현재 작업본에서 최초 source 신규 테스트는 변경 전 1 pass / 4 fail → 변경 후 5/5 pass였다. 추가 record-only 복구 검사도 보완 전 fail → 보완 후 pass를 확인했다. 최종 source 신규 테스트는 7/7 pass다. 자료 해시, 실제 검토 7개와 기존 의료/reject 유지, 격리 7개의 날짜 미갱신·새 공급 제외, 새 실행 보류와 검토 package 보존, 저장된 개인 사본의 0쓰기 보존과 잘못된 복구 거절을 검사한다.

- `node --import tsx --test lib/flow/source-backed-cp1-source-review.test.ts lib/flow/seed-flows.test.ts lib/flow/source-backed-my-flow.test.ts lib/flow/source-freshness.test.ts lib/flow/storage.test.ts lib/flow/url-first-lookup.test.ts`: **246/246 pass**.
- `node --import tsx --test components/flow/SourceBackedFlowMapPage.cp1-source-review.test.tsx lib/flow/source-backed-manual-registration-report.test.ts lib/flow/effective-flow-map-result.test.ts components/flow/SourceBackedFlowMapSaveButton.test.tsx components/flow/SourceBackedFlowMapChooseChildExperience.test.tsx`: **27/27 pass**.
- 합계 **273/273 pass**. 신규 hold SSR 검사 2개 포함. 기존 공개 hit/홈페이지/catalog/QA-pass 기대값은 새 source hold에 맞춰 정확한 blocked 기대값으로 갱신했으며 나머지 원문행·사본·projection 검사를 유지했다. SSR은 실제 브라우저나 사용자 관찰 검증이 아니다.
- 출처 기한 진단: published149 / current126 / reviewDue0 / stale0 / missing0. 원래 canonical seed153·기존 seed 격리21 count는 그대로다. 추가 7개는 source-backed 공급의 격리 목록이므로 canonical seed 테스트는 해당 목록의 seed 교집합을 비교한다.
- npm 전체·type·build·새 build 브라우저 QA·게시/개발 앱 교체는 CP1 담당 소유다. 이 문서는 해당 완료를 선언하지 않는다. 신규 테스트 2파일은 기존 package의 정적 test 목록에 없어 위 명령으로 별도 실행/인계한다.
- CP1 담당의 첫 전체 npm 검사는 2개 기존 seed 테스트 기대값에서 실패했다. canonical archive만 예상한 검사와 공급 indexing68 기대값이다. 7개 정확 격리 목록과 raw source 원문 보존, historical replacement 3개가 현재는 보류라는 사실, indexing61을 검사하도록 갱신했다. 61이라는 수만 낮추지 않고 격리 7개가 공급에 없고 원문 검토 자료에는 있는지 검사한다. 그 뒤 위 273개를 다시 실행했다. 최신 전체 npm/type/build는 CP1 담당이 새 freeze에서 재실행한다.
- 소유 diff를 직접 검토했고 scoped closeout reporter를 실행했다. `git diff --check` 및 `node scripts/check-docs.mjs`도 통과했다. 마지막 두 검사는 전체 제품 QA를 대체하지 않는다.

소유 파일은 아래 **15개**뿐이다. 공통 QA/manifest/package/lock/alias migration 문서는 CP1 담당이 별도로 관리한다. 이 작업자는 commit/push/PR/publish를 실행하지 않는다.

1. `lib/flow/runtime-content-policy.ts`
2. `lib/flow/source-backed-my-flow.ts`
3. `lib/flow/source-backed-expansion-260625.ts`
4. `lib/flow/source-backed-curated-260630.ts`
5. `components/flow/SourceBackedFlowMapPage.tsx`
6. `lib/flow/url-first-lookup.ts`
7. `lib/flow/source-backed-my-flow.test.ts`
8. `lib/flow/source-freshness.test.ts`
9. `lib/flow/url-first-lookup.test.ts`
10. `lib/flow/source-backed-manual-registration-report.test.ts`
11. `lib/flow/source-backed-cp1-source-review.test.ts` (신규)
12. `components/flow/SourceBackedFlowMapPage.cp1-source-review.test.tsx` (신규)
13. `lib/flow/storage.ts`
14. `lib/flow/seed-flows.test.ts`
15. `docs/content-audit/2026-10-03-core-journeys-cp1-source-review.md` (신규)

잔여: 격리 자료의 원문/파생 구분과 정확한 행 수정은 별도 검토가 필요하며 이번에 구현하지 않았다. 의료·세금 내용의 적합성 재구성, 재이용 권한 확대, 실제 기기·IME/AT, 관찰 사용자 검증도 미완료다. 합성 검사 결과를 실제 사용자 전체 데이터 보존 보장으로 확대하지 않는다.
