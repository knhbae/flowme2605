# M7-2 두 번째 콘텐츠 연결 묶음

## 목표와 경계

사용자의 계속 진행 요청에 따라 [직전 연결 단계](alpha-m7-2-catalog-editing.md)의 미연결 후보32개를 전수 대조하고, 기존 계약으로 손실 없이 연결할 수 있는 저위험 콘텐츠만 추가한다. M7-2 전체 실사용 목표를 대체하지 않는다.

- 사용자 필요: 이전 PoC의 콘텐츠를 다시 작성하지 않고 내 제작 사본으로 편집한 뒤, 확인한 항목만 개인 실행으로 보내고 싶다.
- 원본: 새 외부 콘텐츠가 아니라 고정 `catalog-library-pack.v1.json`의 기존 Flow 구조다. 기존 출처 확인 날짜·원저자·경고·공개 보류 정책을 바꾸지 않는다.
- 결과물: 기존 체크리스트/상대 일정 → 제작 편집문 → 명시 개인 실행. 외부 원문의 현재 사실·권리 재검증이나 공개 발행 승인이 아니다.
- 금지: 실제001/002 시험 쓰기, 원본 pack 수정, 원문 행동/날짜 창/반복을 임의 생성·삭제, 운영계 호출, 계정 자동 반입, commit/push/PR/merge/배포.

## 단계별 계획

1. [x] 후보32개: 정책·위험·원본 필드와 v2 엄격 투영을 대조하고 원본별 판정 기록.
2. [x] 통과 원본의 명시 허용 목록만 확장. 기존 v1/v2 사본 identity·projection fingerprint 유지.
3. [x] 제작 사본·편집·저장·비교·개인 실행·재반입·새로고침·원본 불변 검사. 공통 안내를 새 Item으로 만들지 않음.
4. [x] DEV private validator만 동일 허용 목록으로 확장. 함수 권한·writer 유지, 종료 시 계정 행 다시 대조.
5. [x] 표적/통합/npm/타입/build 및 격리 브라우저·5개 크기 검사. 실제 계정은 읽기 전용으로만 대조.
6. [x] 결과와 미실행·남은 갭을 분리해 원장/현재 상태 연결.

## 판정 원칙

기계적으로 변환 가능하다고 실행을 허용하지 않는다. 위험 등급이 low여도 세금·연금·지원 제도 등 공식 자격/권리 확인이 필요한 주제는 이 저위험 묶음에서 보류한다. 상대 날짜가 있는 콘텐츠는 offset/anchor를 원본대로 유지한다. 일반 텍스트 편집에서 원본 전용 표의 기능까지 지원한 것처럼 표시하지 않는다.

## 현재 상태

이번 연결·전송 보완 묶음은 완료했다. 전수 감사32/32 기계적 투영 통과 중4개·28항목의 비공개 사본 연결을 구현했다. 기존7개를 합해 지원11개·84항목이다. 격리 콘텐츠184/184, 최종 압축 화면28/28·콘텐츠 재검사45/45, 통합2234/2234·npm2255/2255·타입/build 통과다. 누적 용량 검사에서 발견한 백업 전송 결함도 수정했다. 실제 계정에 자동 반입하지 않았다. 압축 전 용량 증가·실제 복원·독립 백업 등의 M7-2 전체 잔여는 아래에 분리하며, 실제 기기·관찰 사용자 검증과 발행은 이번에 실행하지 않았다.

## 32개 원본별 대조

모든 행은 고정 원본의 `real/exact`, `migration_candidate`, 보관 아님과 strict-v2 투영 성공을 확인했다. 아래 보류는 원본 정책을 변경한 것이 아니라 이번 연결 묶음의 판정이다. 외부 원문의 현재 사실·권리를 다시 확인한 결과는 아니다.

| 원본 slug | 항목 | 이번 판정·남은 검토 |
| --- | ---: | --- |
| fridge-cleanout-weekly-plan | 6 | 보류: 식품 안전·폐기 주의, 재고표 목적지 의미 |
| passport-renewal-docs | 6 | 보류: 발급 자격·사진·수수료 최신성 |
| samsung-aircon-seasonal-check | 5 | 연결: 모델별 관리·건조 주의, 날짜 없는2구간 |
| samsung-washer-filter-cleaning | 10 | 연결: 미세플라스틱 저감장치 범위·물세척 금지·전원 차단,3구간 |
| vehicle-inspection-prep | 10 | 보류: 차량 안전·법정 검사기한 |
| computer-skills-d30-study | 9 | 연결:4구간, D-30/-30/-28/-21/-18/-14/-7/-5/-1,2027 이후 출제기준 재확인 |
| real-samsung-aircon-seasonal-care | 5 | 보류: 기준일 의미·원문 근거 미정의. 방문일로 추측하지 않음 |
| real-pet-registration-check | 5 | 보류: 등록 의무·신고기한·소유자 정보 |
| national-scholarship-apply | 7 | 보류: 자격·종류별 마감·가구 정보 |
| jeonse-guarantee-apply | 6 | 보류: 보증대상·기한·요율·법적 판단 |
| welfare-benefit-finder | 3 | 보류: low 표시와 별개로 소득·자격·지급 민감성 |
| small-business-fund-check | 4 | 보류: 대출·지원금·금리·재무자료 |
| unemployment-benefit-apply | 6 | 보류: 수급자격·법정기한·급여 |
| job-seeker-allowance-apply | 4 | 보류: 지원유형·소득재산·수당 |
| pension-estimate-check | 4 | 보류: low 표시와 별개로 추납·임의가입 재무 판단 |
| adult-vaccine-schedule-check | 5 | 보류: 의료진 판단·건강/접종 정보 |
| first-passport-issue | 4 | 보류: 서류·대리신청·처리기간 |
| overseas-safety-register | 4 | 보류: 여행경보·입국·긴급연락 최신성 |
| customs-traveler-declare | 3 | 보류: 면세·신고·가산세·반입 규정 |
| used-car-ownership-transfer | 5 | 보류: 이전기한·세금·의무보험 |
| ev-subsidy-apply | 7 | 보류: 보조금·지자체 자격·계약/출고 순서 |
| property-local-tax-pay | 2 | 보류: 납부금액·기한·영수증 |
| tax-refund-find | 2 | 보류: low 표시와 별개로 세금·환급계좌·사칭 방지 |
| safe-inheritance-onestop | 5 | 보류: 상속·재산채무·법적 기한 |
| childcare-fee-support-apply | 4 | 보류: 아동/가족 정보·변경일·소급 |
| military-exam-prep | 4 | 보류: 병역행정·건강 정보·연기 판단 |
| home-cafe-daily | 4 | 연결: 추출법1개 선택, 날짜 없는2구간. daily를 반복규칙으로 바꾸지 않음 |
| pet-health-observation | 5 | 보류: 수의학 판단·검사 추천 아님 |
| wedding-vendor-board | 1 | 보류: 견적·계약·단일 항목 보드 의미 |
| source-backed-smishing-response | 3 | 보류: 보안사고 대응·개인정보 취급 |
| curated-new-car-basic | 7 | 보류: 구매·보험·등록·계약 판단 |
| curated-wedding-gongysd-atoz | 4 | 보류:15개 범주 중4개 축약 범위·견적표 |

기계적 전수 검사는 `scripts/alpha/m72-catalog-wave2-audit.ts`로 재현한다. 제품 모듈을 메모리 안에서만 조사하며 허용 목록을 우회해 계정에 저장하지 않는다. 독립 읽기 전용 감사도32/32와 원본 의미를 대조했다. 전문세척예약은 일반 기준일로 지원할 수 있다는 대안이 있었으나, 이번 묶음에서는 날짜 의미를 먼저 확인하기로 했다.

## 보존 계약·UX 검토

- 기존 v1 두 결과 fingerprint `680ac14c`/`9e37ede2`, 기존 v2 다섯 결과 `50b28c88`/`59f3bf14`/`ac0069b1`/`03d85ebc`/`98c137dd` 그대로다. 추가 허용 목록 외 v2 본문·versionId 계산·투영 알고리즘은 변경하지 않았다.
- 삼성2개는 공식 출처, 컴활·홈카페의 Item 출처는 참고 자료다. 컴활의 대한상의 보조 링크만 official이며 전체 출처를 공식으로 승격하지 않는다.
- 원본의 설명·방법·완료 기준·주의·링크·상대 날짜를 canonical 편집 필드와 대조했다. Flow/구간 공통 안내는 기존 원본 보기에서 보존한다. 컴활의 원래 학습표·export 설명이 있다고 현재 편집기가 그 전용 기능까지 제공한다고 주장하지 않는다.
- `flow-ux-review` 기준으로 자료실의 ‘검증된 콘텐츠’라는 표현을 삭제했다. 자동 QA를 원본 최신성·사용자 검증으로 읽지 않도록 현재 연결 가능한 수만 표시하며, 숫자는 계약에서 계산한다. 새 탭·설명 카드·추가 입력은 만들지 않았다.
- 검토의 낮은 항목: Portability3(기존 개인 실행 연결이며 학습 전용 시트 기능 검증 아님), Cognitive Load3(긴 원본의 스크롤·자료실 탐색은 유지). 이를 공개 품질 승인 점수나 사용자 평가로 쓰지 않는다.

## DEV 경계

로컬 migration `20260923081212_flowme_alpha_m72_catalog_wave2.sql`은 직전 private validator의 허용 locator4개만 더했다. 계정·공개 데이터 쓰기, writer/CAS/Undo/서명/한도/권한 변경은 없다. [함수 권한 기준](https://supabase.com/docs/guides/database/functions)에 따라 security invoker와 private 실행권한 회수를 유지한다. Supabase 변경 기록의 관련 breaking 항목도 확인했으며 이번 일반 private 함수 변경에 해당하는 항목은 없었다.

DEV 순수 SQL **44/44**: 허용11, 보류28·미지정1 거절, foreign field/owner 주입 거절2, anon/authenticated private 실행권한 없음2. 재현 SQL: `scripts/alpha/m72-catalog-wave2-check.sql`.

사전/사후 계정 hash 일치: 001 r427 `ec238c58ca90c85af1ea22d79f4435db`,002 r75 `6e7a1dd580d1482b0534cd8c344d81df`, operation427/75. MD5는 동일성 확인용이지 인증 서명이 아니다. 실제 계정과 operation 수는 변경하지 않았다.

DEV 기록의 migration version은 `20260923081407`이며 이름은 `flowme_alpha_m72_catalog_wave2`다. CLI로 만든 로컬 파일 timestamp와 원격 적용 도구가 기록한 timestamp가 다르다. 임의 repair/전체 DB push는 하지 않았으며 이후 CLI 동기화 전 이 대응을 확인해야 한다. 보안 Advisor는 기존 INFO29(의도적으로 policy 없는 private/lab RLS)·WARN1(유출 비밀번호 보호 비활성) 그대로다. 경고를 통과 처리하거나 유료 옵션을 활성화하지 않았다.

## 발견한 백업 결함과 수정

실제002 백업을 읽고 메모리에서만 신규4개를 순차 반입했다. 실제 계정/파일에 저장하지 않았고, 실제 dispatcher의 전체 inverse와 기존75개 operation을 포함해 누적 크기를 측정했다. 무결성은 확인했지만 이 가상 누적 자료에 실제 서버 서명을 발급하지 않았다.

| 지점 | 계정 bytes | 예상 expanded backup bytes | 기존 raw 복원 요청 bytes |
| --- | ---: | ---: | ---: |
| 기존 자료 | 3,890,227 | 11,104,765 | — |
| 에어컨 자가점검 추가 | 4,286,788 | 13,972,617 | 15,823,212 |
| 필터 청소 추가 | 4,789,886 | 17,343,569 | 19,660,145 |
| 컴활 추가 | 5,995,144 | 21,919,769 | 24,838,575 |
| 홈카페 추가 | 6,260,897 | 26,761,702 | **30,321,258** |

원본이30MB 이하여도 `sourceRaw`를 JSON 문자열로 한 번 더 감싸면30MB를 넘었다. 기존 서버의 복원 가능 크기 검사 때문에 이 상태에서는 새 백업 발급도 거절될 수 있었다. 기록을 삭제하거나 제한을 높여 해결하지 않았다.

- 큰 **restore** 요청만 기존 gzip 백업 codec으로 `sourceFile`에 담는다. 작은 요청과 local import는 기존 계약을 유지한다.
- wire30MB·압축 해제30MB 모두 유지. 압축 해제는 인증 후 수행하고, 두 source 필드 동시 전달·임의 import·손상/위조/다른 계정 자료는 거절한다.
- 원문 SHA·백업 integrity·소유자·서명·명시 확인·현재 revision·동일 요청 재시도는 기존 검사 그대로다. DB writer·서명·저장 schema를 바꾸지 않았다.
- 화면의 pending 기록에는 압축 전 원문과 같은 requestId를 유지한다. 화면 종료 중 늦게 끝난 압축은 전송하지 않는다. 최초 전송 전 실패와 이미 보낸 요청의 불확실한 재시도를 구분한다.
- 백업 발급·화면 복원·읽기 전용 파일 검사·계정 백업 도구가 같은 transport 예산을 사용한다.

최종 실제 메모리 측정: 압축 파일3,847,523B, 최대 예약 commit 요청**3,848,867B**, preview3,847,616B. 두 경로 모두 원문 exact roundtrip과 예산 일치 통과. 원본 backup SHA/객체·공개 references·비creator 필드 불변, 중복 반입 변경0, 서버 호출0, 파일 쓰기0다. 재현: `scripts/alpha/m72-catalog-wave2-capacity.ts`.

**이 수정은 기록 증가 자체를 해결하지 않는다.** 위 네 번의 반입만으로 expanded 백업의 남은 여유는3,238,298B다. 이후 사본 편집·저장·개인 실행·사진·이력의 누적까지30MB 안이라는 검증이 아니며, 네 개 연속 반입을 실제 계정의 장기 사용 권장으로 해석하면 안 된다. 기록 보존을 유지하는 용량 관리/분할·증분 백업 설계는 다음 안전성 갭으로 남긴다.

## 시나리오·화면 검증

격리 Chromium에서 실제 화면과 dispatcher를 사용하되 인증/서버 응답은 fixture로 분리했다. 실제 계정·DB에 시험 자료를 쓰지 않았다. 네 콘텐츠 모두 원본→사본 생성→편집→명시 저장→비교→개인 실행→새로고침을 수행했다.

| 콘텐츠 | 검사 결과 | 특화 대조 |
| --- | ---: | --- |
| 에어컨 자가점검 | 45/45 | 공식 출처·모델별 안내 |
| 미세플라스틱 저감장치 필터 청소 | 47/47 | 제품 범위·물세척 금지·전원 안내 |
| 컴활 D-30 | 47/47 | 참고 출처/공식 보조 링크·2027 이후 재확인·상대 날짜 |
| 홈카페 | 45/45 | 참고 출처·날짜 없음·반복 자동 생성 없음 |

184는 네 소스별 반복 실행의 합이며 고유 사용자 시나리오184개가 아니다. 각 실행에서 미리보기·취소/Escape 무변경, 저장 실패와 같은 요청 재시도, 원본 불변과 새로고침을 확인했다. 콘솔/page error·외부 요청 전달·허용 prefix 밖 앱 쓰기0, 합성 운영 storage bytes 동일이다.

| 화면 크기 | 평가 |
| --- | --- |
| 390×844 | 주요 제작 행동 접근 가능·가로 넘침0 |
| 375×812 | 좁은 화면에서도 주요 버튼 잘림/겹침0 |
| 844×390 | 낮은 높이는 세로 스크롤 필요, 행동 접근·가로 넘침0 |
| 1024×768 | 원본·사본 행동 구분과 접근 유지 |
| 1440×900 | 주요 행동·원본 구조 정상, 긴 콘텐츠의 정보 밀도는 개선 여지 |

대표375/844/1440 캡처를 직접 열어 확인했다. 실제 Android Chrome/iOS Safari·보조기술 검사는 미실행, 관찰 사용자0명이다. 원문 현재성이나 기기 검증으로 이 결과를 확대하지 않는다.

근거는 로컬 전용 `output/playwright/alpha-m72-catalog-editing/` 아래 `2026-09-23T08-19-51-274Z-samsung-aircon-seasonal-check`, `08-20-02-764Z-samsung-washer-filter-cleaning`, `08-21-29-608Z-computer-skills-d30-study`, `08-21-49-821Z-home-cafe-daily`의 `result.json`·화면이다. 뒤 세 경로도 날짜 접두사 `2026-09-23T`를 포함한다. 콘텐츠 검사는08:13 빌드 기준이며, 이후 압축 전송 수정의 검증은 별도 기록한다.

최종08:29 빌드의 압축 복원 화면은 **28/28** 통과했다. 합성 원문16,000,092B가 기존 요청에서는32,000,178B로 커지는 경우를 재현했다. 실제 화면의 새 preview 요청21,140B·commit 요청21,401B, 압축 전후 SHA 일치다. 파일 선택만으로 요청0, 미확인 적용 차단, 취소/Escape commit0, 미리보기 응답 실패, 명시 확인 후 실패→reload→lookup→같은 ID/원문 재시도를 검사했다. 다섯 화면에서 넘침0·취소 행동 접근, 콘솔/page error·외부 전달·prefix 밖 쓰기0, 합성 운영 storage 불변이다. 375×812 화면은 주 담당자도 직접 확인했다. 이 합성 파일은 유효한 서버 서명/DB 복원의 증거가 아니며 서명 검사는 별도 서버 테스트로 검증했다.

근거: 로컬 전용 `output/playwright/alpha-m72-preservation-transport/2026-09-23T08-35-01-185Z/result.json` 및 PNG6개. 첫 실행은 pending UI가 뜬 시점을 전송 종료로 잘못 가정해19개 이후 멈췄다. 실패 응답이 표시되는 시점까지 기다리도록 runner만 고친 뒤 전체28개를 재실행했다.

같은 최종 빌드에서 홈카페의 사본 편집→개인 실행 전체 경로를 **45/45** 다시 통과했다. 근거: 로컬 전용 `output/playwright/alpha-m72-catalog-editing/2026-09-23T08-35-37-682Z-home-cafe-daily/result.json`. 최종 빌드 검사 합계73개와 앞선 콘텐츠184개는 별도 실행이며45개는 중복 회귀 실행이다. 압축 복원 캡처5개 크기도 모두 직접 열어 확인했다. 좁은 화면의 상태 안내 일부는 아래로 스크롤해야 보이지만 확인/취소/적용 버튼은 접근 가능했다.

## 자동 검사와 실패 이력

아래 근거 파일과 본문의08:xx 빌드 시각은 UTC다(KST17:xx). 원본 pack SHA-256은 전후 `723abefdc26243eb1f9b4bcf21730758ecc7a300494ad2ae75293ac5c6dde4be`로 동일하다. 앞선 콘텐츠 검사 빌드와 최종 빌드 사이 제품 source hash 차이는 보존 화면/handler/transport와 그 테스트6파일뿐이다.

- 콘텐츠/자료실/기존 migration 표적24/24, 새 migration/32개 감사2/2 통과.
- 최종 새/기존 migration 검사3/3 재실행 통과(위 검사와 중복).
- 압축 transport·서버·화면·오프라인/백업 도구 표적 **75/75** 통과.
- 1차 통합 전체 검사는 용량 결함 수정 전에 중단했으므로 통과 근거로 사용하지 않는다.
- 최초 표적 실행은 UI 비동기 단계가 늘어나 기존 ‘두 번의 microtask 후 응답 도착’ 가정에서 대기했다. 임의 대기 시간을 늘리지 않고 실제 요청 시작 신호를 기다리도록 검사 도구를 고친 뒤75개 전체를 다시 실행했다.
- 최종 npm **2,255/2,255**, 실패/skip/cancel0. 근거: `npm-test-2026-09-23T08-30-35-588Z.json`.
- 최종 production build PASS, 근거: `build-2026-09-23T08-29-17-439Z.json`.
- 제품 strict 타입505진입점·진단0·소스564개. 변경된 도구9진입점 별도 strict 검사도 진단0이다.
- npm/build/제품 타입 검사 중 제품 소스 변경0. 위 JSON은 `output/integrated-product-poc/`의 로컬 전용 근거다.
- 최종 통합 **2,234/2,234**,232개 테스트 파일, 실패/skip/cancel0. 근거: `new-tests-2026-09-23T08-30-24-562Z.json`. 2workers/각512MiB 실행, 소스 변경0. 실행13분이며 검사 수를 줄이거나 assertion을 완화하지 않았다.
- 문서 검사 `docs:check` PASS(문서 검사4/4 포함), scoped closeout·diff whitespace 검사 PASS. closeout 도구의 untracked 폴더 집계는 개별 파일을 모두 펼치지 않으므로 아래 실제 변경 목록과 함께 대조했다.
- 저장소 전체 `test:e2e` 묶음은 재실행하지 않았다. 이번 브라우저 근거는 위 실제 화면을 사용하는 격리 표적 runner 범위이며, 실제 API/기기/관찰 검사로 확대하지 않는다.

읽기 전용 독립 코드 검토에서 신규 P1/P2 발견0. 압축 해제 전 인증·restore-only·한도·서명/계정·CAS/재시도·pending 보호를 대조했다. 이는 결함 부재 증명이나 실제 사용자 검증이 아니다. `flow-work-closeout`의 범위 점검과 `flow-direction-capture`에 따라 이번 상태/후속만 기존 원장에 연결했으며 새 영구 정책을 확정하지 않았다.

## 이번 변경 파일

- 콘텐츠: `catalog-content.ts`, `catalog-content-v2.test.ts`, 신규 `catalog-content-wave2.test.ts`.
- 화면: `AlphaCatalogLibrary.tsx/.test.tsx`, `AlphaPreservationPanel.tsx/.test.tsx`.
- 보존: 신규 `alpha-preservation/transport.ts/.test.ts`, `alpha-server/preservation-handler.ts/.test.ts`.
- 도구: `m7-personal-backup-check.ts/.test.ts`, `m72-capture-account-backup.ts`, `m72-catalog-editing-schema.test.ts`, `m72-catalog-editing-browser.ts`; 신규 `m72-catalog-wave2-audit.ts`, `m72-catalog-wave2-schema.test.ts`, `m72-catalog-wave2-check.sql`, `m72-catalog-wave2-capacity.ts`, `m72-preservation-transport-browser.ts`.
- DEV: 위 allowlist migration1개.
- 기록: 이 원장, `docs/STATUS.md`, `alpha-transition.md`, 직전 연결 원장의 후속 링크.

경로 기준: 계약/모델은 `lib/flow/integrated-poc/`, 화면은 `components/flow/integrated-poc/`, 도구는 `scripts/alpha/`다. 기존 `catalog-content-import.test.ts`의 동적 전수 검사는11개로 확대 실행되지만 그 파일을 이번에 수정하지 않았다. 이전부터 미추적이던 파일을 이번 신규 파일로 잘못 세지 않는다.

## 남은 갭과 발행 상태

177개 중11개 연결, **166개 미연결**: review-required87·archived21·not-enabled28·unsupported-shape29·projection-loss1. Map26개의 제작 편집도 별도다. 다음 묶음은 수만 늘리는 작업보다 누적 이력의 백업 용량 관리와, 표·반복·기간·Map을 손실 없이 연결하는 계약을 구분해 진행한다. 민감 주제는 공식 사실·안전/권리·날짜 의미를 확인하기 전 활성화하지 않는다.

M7-2 전체에는 독립 매체 백업 사본, 실제 계정의 명시 복원, 제한 일상 사용과 실기기 검증이 남는다. 기존 목표를 완료로 전환하지 않는다.

| 항목 | 이번 상태 |
| --- | --- |
| 실제001/002 자료 변경 | 0건 |
| commit | 미실행 |
| push | 미실행 |
| PR | 미생성 |
| merge | 미실행 |
| Preview | 미배포 |
| Production | 미배포·호출0 |
| 실제 Android Chrome / iOS Safari | 미실행 |
| 관찰 사용자 | 0명 |
