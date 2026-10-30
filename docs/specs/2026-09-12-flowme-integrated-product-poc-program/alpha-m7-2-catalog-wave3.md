# M7-2 세 번째 콘텐츠 연결 — 오픽 하루 일정 계약

## 9/24 후속 승인 — 연결 실행

사용자가 “후속 오픽 2개 연결은 알아서 진행해주면 되지 않아?”라고 지시했다. 기존 작업 범위의 DEV 계약 적용·앱 연결·별도 QA·로컬 앱 갱신을 진행한다. 동일 범위의 재승인을 요구하지 않는다. 실제001/002를 합성 QA에 사용하지 않고 운영계·발행·배포는 제외한다.

실행 순서는 (1) 지정 DEV validator/권한·기존 자료 hash 확인과 준비된 migration 적용, (2) v3 공용 reader/builder/locator/capability 동시 연결 및 일반 파일·백업 회귀, (3) 별도 QA 계정에서 반입/중복0/편집/인계/Undo/Redo/재열기/백업/복원, (4) 다섯 화면 크기와 전체 회귀 검사다. 원본19행·휴식2행·주차별 ‘3번씩’ 설명·v1/v2 fingerprint·원본 pack은 보존한다. 아래 비활성 판정은 활성화 전 이력이며 최종 결과는 실행 후 갱신한다.

## W3-3/4 후속 실행 — 2026-09-24

### 지연 후속 계획 — 중복 계산과 실자료 시험 분리

직전 연결/검증 실행은 실제 진척으로 분류한다. 이번에는 고정 QA r26의 읽기 전용 요청에서 서버 왕복과 로컬 계산을 나누고, 이미 내려받은 같은 QA 파일을 네트워크 없이 세 번씩 측정한다. 같은 요청의 sealed 직렬화와 detached 직후 중복 JSON 검증만 우선 후보로 삼는다. owner/서명/원문·이력/첨부/최종 한도/백업 전후 대조는 유지하고, 악성 입력·변경 중 snapshot 반례를 검사한다. 개선 효과가 없으면 후보를 채택하지 않는다. 선택 후 표적·npm·빌드·실제 백업 화면을 확인하며 기존 실사용001/002에 합성 자료를 넣지 않는다. 새 DB migration·권한·용량 상향·제품 정책·배포는 이번 후속 범위가 아니다. 실제 자료 작성/기기/명시 복원은 기술 개선과 별도로 남는다.

새 단일 DEV 백업 측정은26,676ms 중 Auth와 두 번의 읽기/전송23,064ms, 나머지 로컬 계산/스케줄링3,613ms였다. 두 읽기는10,102/12,746ms, 생성 자료 변경0·현재r26 불변이다. 이 측정만으로 원격 시간 전부를 DB CPU나 네트워크 지연으로 분해하지 않는다. 기능 검사에서의49초 UI와 legacy handler26.7초는 경로와 시점이 달라 전후 속도 개선율로 비교하지 않는다. 근거: `output/alpha-m72-backup-rpc-diagnostic/2026-09-23T23-40-49-793Z/result.json`.

고정 QA 파일의 네트워크 없는 전후3회 중앙값은 `createAccountBackup` 1,203.50→912.90ms다. 생성된 backup 전체가 원본과 정확히 같고 입력 객체/파일 hash 불변이다. 두 번 수행하던 sealed 직렬화는 요청 안에서 한 번만 계산한다. 단일 직렬화 관측값163.55/156.13ms는 그 작업 자체의 최적화가 아니라 재사용할 작업의 비용이다. 중복 제거로 줄어드는 로컬 비용을 전체 UI 지연 해결로 확대하지 않는다. 압축·복원 요청 한도·최종 envelope 크기·owner/secret/이력/첨부·전후 snapshot·서명 검사는 유지한다.

로컬 측정 근거: `output/alpha-m72-backup-local-cost/2026-09-23T23-45-00-650Z/result.json`(이전), `2026-09-23T23-46-33-595Z/result.json`(후보). 원본 파일 SHA256은`0600acb1b616f62e227764a7c1e5bc53566801b3e1ce45f8ffd34bf847c68037`,19,328,262bytes 원문이며 첨부0의 합성 QA다. 로컬3개 표본·warm-up/순서 효과가 있는 제한된 측정으로, 전체 서비스 벤치마크가 아니다.

변경 파일은`alpha-preservation/backup.ts`·`backup.test.ts`, `alpha-server/preservation-handler.ts`·`preservation-handler.test.ts`, 읽기 전용 로컬 측정기`scripts/alpha/m72-backup-local-cost.ts`와 이 원장/실자료 원장/STATUS다. 새 회귀27개(backup25·handler2)를 추가했다. 독립 코드 검토에서 새 P1/P2는 발견되지 않았으며, 입구`detached` 검사 뒤 외부 참조나`await` 전에 내부 검증을 한다는 경계와 요청 간 캐시가 없음을 확인했다. 구현/전체 검증은 아래 최종 실행 근거로 판정한다.

후속 실제 화면은38/38과 같은 고정 파일의5크기62/62가 통과했다. 새 백업1회·같은 상태 미리보기 각각1회·취소·닫기 뒤 확인1회이며 두 실행 모두 모달 자동 읽기0, 편집/복원 적용0, console/page error0이다. 백업32,173ms, 미리보기29,332/22,743ms는 배경 통합 회귀가 있는 같은 PC의 관찰값이다. 이전49초와의 차이를 이번 두 줄 최적화의 효과라고 판정하지 않는다. 좁은390/375와 짧은844 가로 화면은 내부 스크롤을 사용하며 취소 버튼 가림/가로 넘침0이다. 1024/1440도 버튼과 표가 정상이다. 백업 패널2장과5크기 하단5장을 직접 열어 확인했다. 실기기·스크린리더/시스템 글꼴 확대·관찰 사용자 검증은 미실행이다.

새 파일2,350,487bytes가19,328,262bytes 원문으로 복원된다. 생성 시각·그에 따른 payload integrity·seal proof만 제외하고, **이전/새 백업 전체 원문·계정·공개 문맥·이력·보관·첨부 메타데이터가 정확히 같다**. 동일 snapshot SHA256은`e7517123ac9a46c20d1094be28dd89b56d9fa09e99639e32345afe97fb0f5093`다. 첨부0의 QA이므로 사진 실자료 복원 성공으로 확대하지 않는다. 새 파일 SHA256은`1163fb6591c187c2387fdefaca7dec19e493af14e232b7d3cfe83acb807df8e3`다. 최초 일회성 대조 명령은 ESM/CJS import 방식 오류로 비교 전 중단됐고, 올바른 CJS 로딩으로 다시 실행해 위 전체 일치를 확인했다. 백업 제품 실패가 아니다.

근거는`output/playwright/alpha-m72-backup-ui-readonly/2026-09-23T23-53-37-943Z/result.json`과`2026-09-23T23-55-49-157Z/result.json`이다. preview HTTP200/화면 성공은 확인했지만 보조 response.json 수집의`unreadable-response`는 여전히 남는다. 새 브라우저의 운영 key0→0은 빈 집합 대조이며 실제 사용자 저장소 전체 검증으로 세지 않는다. 최종 DEV 읽기 전용 대조는 보호 계정2/이력502, QA 포함3/528, 공개1·사진8·보관0의 row hash가 전부 같았다. 근거와 표적215 결과는 로컬 전용`output/alpha-m72-backup-local-cost-closeout.json`이다. 새 원격 DDL/자료 쓰기0, 실제001/002 로그인0, 운영계 접근0이다.

| 지연 후속 검사 | 실제 결과·범위 |
| --- | --- |
| 기존 구현의 신규 반례 확인 | backup44/44, 이 중 신규25. 수정 전 동작을 통과하는 입력/거절 경계 고정 |
| 변경 후 보존·전송·UI·handler 회귀 | 215/215. 신규27 포함, 실패/skip/cancel0. 전체 통합과 겹치므로 합산하지 않음 |
| npm test | 2255/2255·소스 변경0: `npm-test-2026-09-23T23-47-47-838Z.json` |
| production build | 통과·소스 변경0: `build-2026-09-23T23-48-09-315Z.json` |
| 타입 | 528진입점·597소스·진단0·소스 변경0: `targeted-types-2026-09-23T23-50-58-005Z.json`. 별도 신규 측정기1진입점 strict 진단0 |
| 전체 통합 | 245파일·2452/2452 통과, 실패/skip/cancel0·실행 중 소스 변경0: `new-tests-2026-09-23T23-48-01-678Z.json` |

자동 검사 JSON은`output/integrated-product-poc/`에 있다. 기존 광범위`npm run test:e2e` 전체 묶음은 재실행하지 않았다. 이번 백업 경로는 실제 앱/DEV에 연결한 위38/62 브라우저 검사로 확인했으며 기본`/my`나 다른 운영 화면 전체 E2E 완료를 주장하지 않는다. 의존성·Auth/RLS·DB 설정·저장 형식·한도·UI 레이아웃은 바꾸지 않았다. 큰 원격 읽기 지연은 미해결이며 작은 로컬 개선을 일상 사용 준비 완료로 바꾸지 않는다.

### 직전 연결 시점 판정 — 오픽 연결·백업·다섯 화면 기능 검사 통과

오픽2개·19항목의 반입→편집/저장→개인 일정→Undo/Redo→별도 QA 복원·새 로그인까지 연결했다. 복원된 QA r26의 **새 백업 API13/13, 실제 화면38/38, 동일 파일의 다섯 화면 추가 검사62/62가 통과**했다. 지원 범위는13Flow·103항목이다. 전체 통합2425/2425·npm2255/2255·타입·production build도 통과했다. 약49초의 큰 백업 처리 지연은 남아 있으며, 실제 사용자의 복원/일상 사용·실기기와 전체 M7-2 완료를 뜻하지 않는다. 아래 실패 기록은 수정 전 이력이다.

이전8초 읽기 제한에서는 실패와 성공이 모두 관찰되어, 전체 역할 제한을 바꾸지 않고 서명 백업 읽기 RPC에만20초를 설정했다. BFF의 기존30초, 원문30MB, 서명·세션·소유자·동일 snapshot 검사는 유지한다.

측정은 원인을 구분하는 데 사용했다. 계정 출력82.71ms, 이력 집계/출력218.03ms, 공개 문맥 출력2.17ms였지만, 큰 JSON 합성의 별도 표본은6.31~8.49초로 변동했다. `EXPLAIN ... SERIALIZE TEXT`는 값을 반환하지 않고 직렬화 비용을 측정한다([PostgreSQL 문서](https://www.postgresql.org/docs/17/sql-explain.html)). 진단용 materialized CTE의 임시 블록2453개를 실제 함수의 동일 병목으로 단정하지 않는다. 별도 BFF 진단은 인증2.59초, 두 읽기4.69/5.70초, 전체16.77초였다. CPU 할당량·디스크 용량이 원인으로 확정된 것은 아니다.

JSON 응답을 한 번에 합치는 후보는11사례×호출자3종에서 결과/권한/정렬/거절 의미를 보존했으나 반복 측정의 이득이 일정하지 않아 **DEV에 적용하지 않았다**. 이 읽기 후속의 최종 DB 변경은 함수별 읽기 시간 제한1개뿐이며 로컬50함수 메타데이터와 실제 DEV 적용 전후 본문·권한·자료 hash를 대조했다. 앱의 자동 읽기 보류 수정은 아래에 구분한다.

최종 API 검사는21,957.1ms에 성공했다. 원문19,328,262bytes → 압축 파일2,350,487bytes → 원문 정확히 동일하며, 두 frozen 원본·19개 날짜·최초9개 이력 hash·복원 receipt·기존 개인 기록이 일치한다. 과거 inverse를 메모리에서 적용해 비어 있지 않은 r9의 전체 계정 hash도 재구성했다. 이 검사는 서버 Undo를 새로 실행한 것이 아니다. 추가 자료 쓰기0, 실제001/002 사용0, 현재 QA r26/이력26 유지다. 약22초 지연과 한정된 표본의 안정성 한계는 남는다.

근거는 로컬 전용 `output/alpha-m72-backup-rpc-diagnostic/2026-09-23T22-57-04-587Z/result.json`, `output/alpha-m72-preservation-read-compose/2026-09-23T22-58-41-603Z/result.json`, `output/alpha-m72-catalog-wave3-final-read/2026-09-23T23-01-20-086Z/result.json`이다. 준비된 코드·기존 실패를 성공으로 세지 않고 새 실행 결과로 판정했다. 실제 화면의 다운로드/동일 상태 미리보기 검사는 아래에 별도로 기록한다.

### 실제 화면 재검사 — 자동 읽기와 백업의 병행 발견

로컬 앱을 재빌드·재시작한 뒤 실제 Chromium과 DEV API로 검사했다. 첫 실행은 동기화 중 disabled 버튼을 너무 일찍 판정한 검사기 결함으로 백업0회에서 중단됐다. 준비 상태 대기를 추가한 두 번째 실행은 로그인 준비5,803ms, 패널의390×844/1440×900 가로 넘침0·백업 버튼 표시/키보드 접근까지14검사를 통과했으나 백업1회 뒤180초 안에 다운로드 링크가 나타나지 않았다. 파일 검증·같은 상태 미리보기·취소는 이 실행에서 미실행이다.

DB 로그의23:10:22.176 UTC에는`flowme_alpha_social_read_v1`,23:10:26.572에는`flowme_alpha_preservation_read_v1`의SQL57014가 있었다. 당시 화면은20초 주기로 자동 읽기를9번 보냈다. 코드상 동기화 controller의 busy와 보존 패널의 busy가 분리되어 있어 두 읽기는 겹칠 수 있다. 이것만으로 시간 초과의 단일 원인이나 잠금 경합을 확정하지 않는다. 계정·이력·공개·사진의 전후 hash는 전부 동일하다.

검사기는 응답/실패 안내 수집이 빠져 있어 보완했다. 이후에는 안전한 응답 코드·소요 시간·화면 상태만 기록하고 명시 실패 시 즉시 멈추며, 자격정보·원문·trace는 남기지 않는다. 초기 실패 증거는`output/playwright/alpha-m72-backup-ui-readonly/2026-09-23T23-08-20-360Z/result.json`, 실제 백업 실패와 패널2장은`2026-09-23T23-09-38-741Z/`에 보존했다. 화면을 직접 열어 핵심 행동·줄바꿈을 확인했으며 QA 이메일은 마스킹했다. 원격 대조/계획 측정은`output/alpha-m72-wave3-read-budget-remote.json`이다.

후속 수정 범위는 보존 모달이 열린 동안 자동 timer/focus/online/visibility 읽기만 보류하고 닫은 뒤 다시 확인하는 것이다. 인증 재연결·필수 저장 결과 확인·수동 확인·진행 중 요청은 유지하며, 서버의 백업 전후 snapshot 검사·복원 CAS·세션·권한 검사는 생략하지 않는다. 적용 후 실제 화면을 재검사하기 전에는 이 변경으로 백업 오류가 해결됐다고 판정하지 않는다.

이 수정을 적용한 실제 UI 후속은 **38/38 통과**했다. 모달 열린90,096ms 동안 신규 자동 읽기0, 닫은 뒤 확인1회였으며, 실제 백업1회/같은 파일 미리보기1회/취소/마지막r26 보존을 확인했다. 파일2,350,491bytes가19,328,262bytes로 정확히 풀리고 원래 계정과 같다. 계정+공개 문맥 hash는`64d2924d90309636dc456d056f57d4f2552b33d7c6c454e6c9719139c897b845`로 전후 일치한다. 첨부0·이력26의 합성 QA라서 사진 복구 검증을 추가로 주장하지 않는다.

백업 UI49,288ms, 같은 상태 미리보기27,729ms로 **성능 문제는 남는다**. 같은 PC에서 통합 회귀2 worker를 실행 중인 기능 관찰값이며 실기기 성능/통제된 전후 벤치마크가 아니다. timeout 단일 원인을 확정하거나 반복 사용의 안정성을 보장하지 않는다. page/console error0·범위 밖 요청0·복원 적용0이고, 새 브라우저의 운영`flow:*` 키는0→0(빈 집합)이다. 이전 격리 콘텐츠 검사의 운영 합성 key3개 byte 동일 결과와 구분한다.

근거는`output/playwright/alpha-m72-backup-ui-readonly/2026-09-23T23-24-21-274Z/`의`result.json`·4장·로컬 비공개 QA 파일이다. 백업 HTTP200/ok와 미리보기 HTTP200/화면 성공을 확인했으나 Playwright의 별도 preview 응답 본문 수집은`unreadable-response`다. 이 진단 한계를 제품 실패 또는 응답 본문 검사 통과로 바꾸지 않는다. 좁은 preview section 캡처의 상하가 잘려 모바일 취소 접근은 이38개 검사만으로 판정하지 않았다.

다운로드한 같은 파일의 SHA256 `0600acb1b616f62e227764a7c1e5bc53566801b3e1ce45f8ffd34bf847c68037`을 고정한 추가 검사는 **62/62 통과**했다. 새 백업0·미리보기1·복원 적용0·편집0이다. 모달 내부를 실제로 스크롤해 제목→현재/복원 후 개수→취소 버튼에 접근하고, 다섯 크기에서 취소 버튼의 키보드 초점과 화면 안 표시를 확인했다. 마지막390×844에서 실제 취소·닫기 뒤 재확인1회와 계정 불변을 검사했다. 모달44,774ms 동안 자동 읽기0·console/page error0·범위 밖 요청0이며 실제 계정은 사용하지 않았다.

| 백업 미리보기 크기 | 화면별 평가 |
| --- | --- |
| 390×844 | 내부 스크롤로 개수와 같은 상태 안내·취소 버튼 접근. 최종 취소 클릭과 닫기 확인 |
| 375×812 | 안내와 버튼 문구 줄바꿈 정상. 가로 넘침 없이 키보드로 취소 접근 |
| 844×390 | 짧은 가로 화면은 내부 세로 스크롤 필요. 하단 안내와 취소 버튼 가림 없음 |
| 1024×768 | 개수 표와 하단 취소 정상 표시. 버튼 키보드 초점 확인 |
| 1440×900 | 표·안내·취소 버튼 정상 표시. 가로 넘침 없음 |

근거는`output/playwright/alpha-m72-backup-ui-readonly/2026-09-23T23-29-15-929Z/result.json`과 크기별 top/counts/bottom 캡처15장이다. 하단5장은 직접 열어 안내/버튼과 줄바꿈을 확인했다. 이로써 앞선 잘린 캡처의 취소 접근 증거를 보완했다. 미리보기31,960ms는 역시 같은 PC의 기능 관찰값이며 성능 완료 판정이 아니다. 별도 응답 본문 수집의`unreadable-response`는 동일하게 남는다. 실제 Android/iOS 검사나 관찰 사용자 검증으로 세지 않는다.

자동 읽기 변경의 표적 회귀는106/106(신규6개), npm2255/2255, 타입528진입점·진단0·597소스, production build가 통과했다. 로그인 재연결·진행 중 읽기·미확정 저장 확인·늦은 editor flush·계정 교체·unmount·숨김/busy 닫기·snapshot 소실 뒤 자동 읽기 복귀를 검사했다. 로컬 근거는`output/integrated-product-poc/npm-test-2026-09-23T23-19-47-456Z.json`, `build-2026-09-23T23-19-58-644Z.json`, `targeted-types-2026-09-23T23-21-49-392Z.json`이다. 직전 실행 수와 합산하지 않는다.

### 연결한 범위

DEV에 두 locator를 적용하고 공용 builder/reader/native owner/일반 파일 반입/백업 경로를 함께 열었다. 활성 대상은 **13개 Flow·103항목**이다. 전체 원본177개·Flow Map26개는 그대로이며 나머지164개 Flow를 편집 가능으로 세지 않는다. 두 오픽의 원본19행, 휴식2행, 주차별 ‘3번씩’ 묶음과 모든 출처 필드·v1/v2 fingerprint를 유지했다. 원본 pack은 수정하지 않았다.

정상 v3는 지정된 고정 원본과 완전히 같아야 한다. 변조한 본문/문서/식별자, 잘못된 버전과 비허용 origin은 계속 거절한다. 공용 reader만 먼저 열었던 준비 단계의 우회 문제는 이제 서버와 reader를 함께 활성화한 정상 반입으로 대체되며, 과거 차단 결과는 아래 이력으로 보존한다.

### 실행에서 발견하고 수정한 결함

1. **브라우저 임시 저장 용량 초과.** 14행 초안을 열고 편집할 때 원본·working·confirmed·pending/draft가 반복되어 sessionStorage에5,311,952자를 쓰려다 `QuotaExceededError`가 났다. 원본/입력 삭제나 브라우저 제한 완화로 해결하지 않았다. M3 탭 복구에만 versioned 무손실 JSON 참조 codec을 적용했다. 같은 재현 fixture는5,311,016→1,391,412자, 별도 제작 입력까지 UTF-16 합계4,502,910bytes다. M1의 기존 키/plain 형식은 유지하며 M3도 기존 plain을 읽을 수 있다. 실제 문자열 CAS·읽기 후 확인·소유자/자료 validation·확장30MB/깊이120 제한을 유지한다. 손상·quota 실패는 계속 쓰기를 막는다. 이 변경은 모든 크기의 저장 성공이나 브라우저 종료 후 sessionStorage 보존을 보장하지 않는다.
2. **실제 QA 저장 시간 초과.** 첫 원격 반입/열기/편집은 성공했으나5.7MB 저장은 실패했다. DEV 로그의`2026-09-23T21:20:02.477Z`에서8초 statement timeout을 확인했다. 제작 RPC를20초로 늘린 뒤 같은 요청의 저장은 성공했지만, 다음7.36MB 개인 실행 인계는20초를 초과했다. 최종 설정은 [공식 함수별 제한](https://supabase.com/docs/guides/database/postgres/timeouts)에 따라 **제작 저장/Undo RPC30초·BFF35초·브라우저60초**다. 전체 역할/DB 제한과 일반 읽기·로그인 제한은 늘리지 않았다. 서명·세션·CAS·원본/계정 검사·권한·RPC 본문은 그대로다. 응답이 불확실하면 같은 요청의 receipt를 먼저 확인한다. 이 설정에서도 인계가 실패했으므로 추가 상향으로 해결하지 않고 병목을 조사한다.
3. **큰 JSON 검사와 임시 파일 비용.** 첫 container CTE 수정은296사례에서 기존 판정을 보존했지만 DEV 인계 실패가 남았다. 원격 읽기 계획에서 JSON 검사에 임시 블록18,261개 쓰기가 있었고, 전체 QA 사본의 로컬 RPC는 성공했다. 최종 방식은 [PostgreSQL의 strict JSONPath](https://www.postgresql.org/docs/17/functions-json.html)를 사용해 동일한30MB/깊이120/금지 키 검사를 수행한다. 깊이121 존재 검사와0~120 범위의 위험 키 탐색으로 한도를 지키고 SQL NULL은 거절하고 JSON null은 기존처럼 허용한다. 원래 전체 CTE·중간 container CTE·최종 migration을616사례로 대조해 판정 차이0, 역할/권한/행 불변을 확인했다. 명시 계정 검사와 table CHECK도 생략하지 않았다.

최종 JSONPath를 적용한 로컬 QA 사본의 전체 RPC는1.17초, 직전 별도 container 실행은5.64초였다. 동일 next account와 r14를 대조했다. DEV 적용 전후50개 함수 중 해당 본문만 바뀌었고 계정/이력/공개/사진 hash가 같았다. DEV 읽기의 임시 블록은0이 됐지만 측정 시간은 변동이 커 일정 배수의 성능 향상을 보장하지 않는다. 글로벌 work_mem·DB 요금제·용량을 늘리지 않았다. 이 측정과 실제 후속 API 결과는 구분한다.

4. **계정 검사에서 큰 인수를 매번 계산하는 비용.** JSONPath 뒤에도 보존 시험의 working 저장이 table CHECK에서30초를 넘었다. 현재 QA r24의 읽기 검사에서 JSON 검사만174ms, 전체 계정 검사는7,309ms였다. root 재구성/복사 대안은5,372/3,989ms여서 채택하지 않았다. [PL/pgSQL 실행 계획 재사용](https://www.postgresql.org/docs/17/runtime-config-query.html#GUC-PLAN-CACHE-MODE)을 비교하면 별도 읽기 실행의 custom3,059ms/generic635ms였다. 해당 private 계정 검사 함수에만 `plan_cache_mode=force_generic_plan`을 설정했다. 함수 본문·기존 모든 검사·table CHECK·권한은 그대로이며 전역/역할 설정은 바꾸지 않는다. 로컬65사례를 호출자 auto/custom/generic에서 대조했고, 호출 후 원래 설정 복귀·SQL162검사도 통과했다. DEV50함수 중 설정1개만 달라지고 자료 hash는 전부 같았다. 단일 함수 표본의 시간을 전체 앱 응답 시간으로 일반화하지 않는다.

위 결함은 별도 QA/격리 브라우저에서 발견했다. 기존001/002를 재현용으로 사용하지 않았다. 최초 실패 저장은 receipt가 없고 QA r12, 이어진 저장 성공 후 인계 실패는 receipt가 없고 r13으로 남은 것을 확인했다. 재시도는 동일 requestId·동일 입력으로 한정하며 첫 반입을 다시 실행하거나 자료를 정리하지 않는다.

5. **복원 후 새 백업 읽기 시간 초과.** r26의 약9.84MB 계정과9.99MB 이력을 합친 읽기에서8초 timeout이 발생했다. 보관 원문은0개이며30MB 초과로 판정된 것이 아니다. 큰 paired 인수를 쓰는 private 백업 읽기 함수에만 같은 계획 재사용 설정을 적용했다. 로컬10사례×호출자3종의 정상/서명/소유자/세션/용량 거절 결과가 같고 호출 후 설정이 복귀한다. 실제 migration 적용 전후50함수 중 설정1개만 다르고 모든 data hash가 같았다. 본문·기존 definer·빈 search_path·ACL과 시간/용량 한도는 변경하지 않았다. 로컬 시간 개선은 작은 합성 표본의 결과여서 실제 백업 성공으로 대신하지 않는다.

### 원격 변경과 자료 경계

- 지정 DEV `flowme-dev`만 사용. 운영 프로젝트·Auth 설정·메일·서비스 가입·공개 발행·배포는 변경하지 않았다.
- locator migration의 원격 기록은`20260923211140 / flowme_alpha_m72_catalog_wave3`다. 로컬 파일의 생성 시각과 원격 적용 번호는 다르며 과거 migration history를 repair하지 않았다.
- 이어서`20260923213245 / flowme_alpha_m72_creator_timeout`, `20260923214850 / flowme_alpha_m72_json_validation_cost`, `20260923215241 / flowme_alpha_m72_creator_transaction_budget`, `flowme_alpha_m72_jsonpath_validation`을 적용했다. public RPC의 본문 MD5 `ecceb1920f758742ed90f82bb7eaa371`, invoker·빈 search_path·ACL은 적용 전후 동일하며 최종 함수별 제한은30초다. private JSON validator의 최종 본문 MD5는`8354eef8b42407f53cca7029bd46b4ee`다.
- locator 적용 전후 계정3개·이력511개·보관/공개/사진 row aggregate hash가 전부 같았다. 최종 QA 복원 r26 뒤에도 실제 계정2개·이력502개, 공개/사진/보관 hash는 전부 같았다. 별도 QA의 의도한 변경17건만 더해 전체 이력은528개다. 실제 계정의 합성 시험·정리·복원은 하지 않았다.
- 추가로`20260923223159 / flowme_alpha_m72_account_validation_plan`을 적용했다. private 계정 검사 본문 MD5 `b2cb9209a90a861ea76fe15b0af62ae3`는 그대로이며 `plan_cache_mode`만 함수 범위로 추가됐다.
- 마지막 `20260923224416 / flowme_alpha_m72_preservation_read_plan`도 private 백업 읽기의 설정1개만 추가한다. 본문 MD5 `34e11452575d030bbeda755362272bd8`와 권한은 같다.
- 이후 `20260923230057 / flowme_alpha_m72_preservation_read_budget`으로 public 서명 백업 읽기에만20초를 설정했다. 로컬 파일은`20260923225859_flowme_alpha_m72_preservation_read_budget.sql`이며, public 본문 MD5 `7175c65cb1e3035dd538bfe3d256d0da`, invoker·빈 search_path·ACL은 동일하다. 전역/역할/로그인/제작 한도·함수 본문·용량은 바꾸지 않았다.
- 보안 advisor의 기존 [WARN1: 유출 비밀번호 차단 미설정](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [INFO29: RLS가 켜진 무정책 테이블](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)은 별도 잔여다. 통과를 위해 RLS 정책이나 권한을 열지 않았다. 관측 시각과 순서를 제외한 기존 항목은 같았다.

### 최종 검증

아래 실제 실행 수는 서로 겹치는 회귀를 포함하므로 합산하지 않는다. 최초 검사에서 실패한 저장과 실행 중 파일 변경으로 최종 근거에서 제외한 검사는 성공으로 바꾸지 않는다. 별도 DEV QA의 후속 결과는 아래에 따로 기록한다.

| 자동 검사 | 실제 결과와 소스 시점 |
| --- | --- |
| 전체 통합 모델·저장·UI 회귀 | 245파일·2425/2425. 자동 읽기 보류 신규6개 포함, 최종 소스 기준 실패/skip/cancel0·실행 중 소스 변경0 |
| 최종 npm test | 2255/2255. 실패/skip/cancel0·소스 변경0 |
| 최종 production build / 타입 | 읽기20초 migration 포함 앱 빌드 성공·실행 중 소스 변경0. 타입528진입점·진단0·소스597개·실행 중 변경0 |
| 최종 요청 제한·handler·repository | 18/18. DB30초/BFF35초/브라우저60초, 제작 이외 경로 유지 |
| 최종 함수별 제한 SQL | 1/1. 해당 RPC 설정 이외 본문·ACL·역할·정책·행 불변 |
| locator SQL | 9/9. 원본177개+unknown의178사례와 malformed34사례 포함; 사례를 별도 테스트 수로 더하지 않음 |
| 저장·Undo SQL 회귀 | 테스트 파일1개 안의162/162검사. 최종30초/JSONPath/계정·백업 읽기 계획/백업 읽기20초 migration까지 전부 적용. 실제 JWT/RLS 검사가 아닌 로컬 DB fixture |
| JSON validator 동일성 | 최종 JSONPath1/1, 내부616사례 판정 불일치0. 최종 migration/후보 본문 동일. DEV 읽기 전용 경계14사례도 통과. 중간 container296사례는 이전 근거 |
| 계정 검사 계획 설정 | 1/1, 내부65사례를 호출자 설정3종에서 대조. 판정·본문·권한·역할 설정 불변, 호출 후 설정 복귀 |
| 백업 읽기 계획 설정 | 1/1, 내부10사례×호출자 설정3종. 정상 대형 응답·서명/소유자/세션/30MB 초과 거절 결과 동일, 권한/행 불변 |
| 백업 읽기20초 / handler 회귀 | 설정 SQL1 + 기존 handler17 = 18/18. 해당 설정 이외50함수 본문/권한/역할/정책/행과 BFF30초 불변. 로컬 설정 검사는 원격 실제 시간 제한 검사의 대체가 아님 |
| 미채택 응답 합성 후보 | 1/1, 내부11사례×호출자3종의 전체 응답 hash 일치. 원격 적용0·성능 효과 미확정 |
| 복원 후 실제 DEV 새 백업 | 13/13. 새 로그인·19.33MB 원문/2.35MB 파일·원문/날짜/기존 이력/비어 있지 않은 r9 역산·자료 불변 |
| 실제 DEV 화면의 백업/동일 상태 비교 | 38/38. 다운로드1·미리보기1·취소·자동 읽기0/닫기 확인1·자료 변경0 |
| 같은 파일·다섯 크기 추가 검사 | 62/62. 새 백업0·미리보기1·내부 스크롤/키보드·390 취소·자료 변경0 |
| 복구 codec·기존 M1/M3/M4 저장 회귀 | 58/58, 이 중 새 codec7검사. 전체 통합에도 포함 |
| 자료실 UI 표적 | 24/24. 전체 통합에도 포함 |
| 최종 익명 화면 smoke | 13/13. /alpha HTTP200, 로그인 폼 표시,390/1440폭 넘침0·console/page error0·쓰기0. DEV Auth 설정 GET1회만 허용 |
| 최종 문서 | 4/4·skill sync·로컬 링크 검사 통과. 소스 변경0 |

최종 소스의 로컬 전용 자동 검사 근거: `output/integrated-product-poc/new-tests-2026-09-23T23-20-26-642Z.json`, `npm-test-2026-09-23T23-19-47-456Z.json`, `build-2026-09-23T23-19-58-644Z.json`, `targeted-types-2026-09-23T23-21-49-392Z.json`. 통합은2 worker·512MB 실행 한도로12분58초 걸렸고 모든 소스 hash가 실행 전후 같다. 표적106은 전체 통합과 겹쳐 합산하지 않는다. 별도 SQL/표적 로그는 `output/alpha-m72-wave3-timeout-final.log`, `alpha-m72-wave3-timeout-pg-final.log`, `alpha-m72-wave3-compact-final.log`, `alpha-m72-wave3-json-final.log`다. 과거2411검사 통과 실행은 소스 변경3건이 있어 최종 근거에서 제외했다. 광범위한 기존 `npm run test:e2e` 묶음은 이번에 재실행하지 않았으며 위 경로별 실제 브라우저 결과와 구분한다.

최종 SQL 근거는 `output/alpha-m72-inverse-runtime/compact-inverse-sql-result.json`(신규 JSONPath migration hash 포함), `output/alpha-m72-jsonpath-validation/2026-09-23T22-08-01-980Z/result.json`이다. 실제 QA 사본 로컬 RPC는 `output/alpha-m72-catalog-wave3-live/2026-09-23T22-08-50-904Z/result.json`이며, 이 실행의 before/candidate 라벨은 모두 최종 JSONPath다. 성능 비교에는 별도 직전22:02 실행만 사용한다.

계획 설정의 추가 근거는 `output/alpha-m72-account-plan/2026-09-23T22-30-57-313Z/result.json` 및 최종 migration 전체를 적용한 `output/alpha-m72-wave3-plan-compact-final.log`(1파일·162검사)다.

백업 읽기 계획의 최종 근거는 `output/alpha-m72-preservation-read-plan/2026-09-23T22-43-53-021Z/result.json`이다. 그 뒤 전체 migration을 포함한162검사도 재실행해 `output/alpha-m72-inverse-runtime/compact-inverse-sql-result.json`의 migration 목록과 함께 보존했다.

직전 단계의 타입 파일은 `output/integrated-product-poc/targeted-types-2026-09-23T22-43-56-115Z.json`, 문서는 같은 폴더의 `docs-2026-09-23T22-51-33-445Z.json`이다. 당시 원격 경계는 `output/alpha-m72-wave3-closeout-remote.json`에 보존했으며 마지막 실패한 백업 읽기 전후도 모두 동일하다. 자동 읽기 수정 뒤 최종 타입/빌드/통합 근거는 위의23시19분 이후 실행이다.

읽기20초 후 재실행 근거: `output/integrated-product-poc/npm-test-2026-09-23T23-03-06-002Z.json`(2255/2255), `build-2026-09-23T23-03-57-782Z.json`, `targeted-types-2026-09-23T23-08-57-347Z.json`이다. SQL162검사의 최종 파일은`output/alpha-m72-inverse-runtime/compact-inverse-sql-result.json`이며 읽기20초 migration hash를 포함한다. 앞선 파일과 테스트 수를 합산하지 않는다.

### 별도 DEV QA — 콘텐츠 연결·명시 복원 및 최초 백업 실패 이력

최초 QA r9에서 반입·열기·편집3건으로 r12, 시간 제한 수정 후 명시 저장1건으로 r13이다. 중복 반입과 비교 취소는 성공 변경0이다. JSONPath 적용 전의 개인 실행 인계는30초 설정에서도 실패했다(왕복38,327.8ms, DB SQLSTATE57014, `2026-09-23T21:58:50.953Z`). 직후 서버 읽기로 r13 유지·동일 요청8 receipt 없음·추가 변경0을 확인했다.

JSONPath 적용 후 동일 요청8은 성공했다. 두 콘텐츠의 원문/출처 보존·편집/저장·개인 실행19행과 정확한 날짜·각 Undo/Redo가 실제 API에서 통과했다. 첫 인계 왕복41.67초, 두 번째22.67초였다. 중복/취소/비허용 locator 거절은 성공 변경0이다. 비허용 locator 응답은`revision-conflict`였으므로 이를`invalid` 응답 검사로 표현하지 않는다.

이후 working 보존 요청21은43.81초 뒤`unavailable`로 끝났지만 후속 조회에서 receipt와r24가 확인됐다. 실제 저장은 성공했고, 응답 실패를 데이터 변경0으로 세지 않는다. 같은 요청을 재실행하지 않고 확정된r24부터 보존 검사만 이어간다. 이 실행의19개 검사 통과는 백업/명시 복원·새 재로그인까지 통과했다는 뜻이 아니다.

첫 보존 후속(22:21 UTC)은 서명 백업·무손실 파일 변환·동일 상태 preview까지 통과했으나 임시 working 저장이 실패했다. receipt 없음과r24 유지를 재확인했으며 명시 복원은 실행하지 않았다. 위 계정 검사 계획 수정을 적용한 뒤 **새 임시 편집1회로r25, 명시 복원1회로r26**이 됐다. 편집42.98초·복원27.36초였으며 복원 후 새 비밀번호 로그인에서도 시스템 revision만 제외한 전체 계정 hash가 원래r24와 같았다. 이때 실제001/002 접근0, 추가 정리·재반입0이다.

| 실제 DEV 시나리오 | 판정 |
| --- | --- |
| 두 원본 반입·원문/출처/휴식/주차 의미 보존 | 통과. 정확한 frozen 원본2개 |
| 제작 사본 편집·저장·다시 열기 | 통과. 마지막 성공 내용 보존 |
| 기준일 인계·두 콘텐츠 각각 Undo/Redo | 통과. 14+5행·19개 날짜 일치 |
| 중복·비교 취소 | 성공 변경0 |
| 잘못된 locator | 거절·변경0. 실제 거절 사유는 revision-conflict여서 validator 자체 검증과 구분 |
| 서명 백업·압축 파일 roundtrip | 통과. r24 원문17,139,303bytes → 파일2,088,707bytes → 원문 정확히 동일 |
| 같은 백업·복원 비교 취소 | same=true/canApply=false, 취소 전후 계정 동일 |
| 임시 편집 후 명시 복원 | 통과. r25→26·개인공간 정확히 일치 |
| 복원 후 새 로그인 | 통과. revision을24로 정규화한 전체 계정 SHA256 `e305cd2c05c481d2ca25628e3a01b92cc1c271880efef5b73bcc017ad6fe8b40` 일치 |
| 복원 뒤 새 백업 | 초기 미통과: 첫9.84초, 계획 재사용 수정 후18.61초 모두 HTTP200 안의 ok=false/unavailable·DB timeout. 이후 읽기20초 적용 후21.96초 성공·13검사 통과. 복원 자체의 실패로 오기하지 않음 |

22:32 실행은12개 검사를 통과했지만 마지막 백업에서 멈췄으므로 파일의pass=false를 보존한다. 당시 stage가explicit-qa-restore로 남은 표기 문제는 검사기에 보완했으며 원본 결과 파일은 덮어쓰지 않았다. 보완 증거 `post-restore-read-only.json`에서 복원 receipt와 새 로그인 결과를 분리했다. 자동 QA를 실자료 복원·관찰 사용자 검증으로 세지 않는다.

보호 자료의 전후 row-JSON aggregate MD5: 계정2개 `67bfe8aa96fca6c790bb9ff014a23fc7`, 이력502개 `a793b56a8af1ea99164c63116b4d8b7d`, 공개1개 `330fe3319139ed53704135eec51d8a36`, 사진8개 `f52007799b665e289d1da539ca91a4b4`로 각각 동일하다. 보관/복원 사진은0개 그대로다. 이는 SQL 직렬화 행 집합의 비교이며 디스크 물리 바이트나 실제 사용자 브라우저의 전체 storage 캡처를 뜻하지 않는다.

최초 실패 근거는 `output/alpha-m72-catalog-wave3-live/2026-09-23T21-58-06-744Z/result.json`이며 핵심 연결 결과는 `2026-09-23T22-10-32-601Z/result.json` 및 `requests.json`이다. 두 JSON의pass=false는 각 실행이 중단된 사실 그대로 보존한다. 후속 성공으로 기존 실패 파일을 덮어쓰지 않는다.

보존 후속 근거는 같은 상위 폴더의 `2026-09-23T22-21-16-701Z/result.json`, `2026-09-23T22-32-31-374Z/result.json`·`post-restore-read-only.json`이다. 첫 실패·후속 복원 성공·새 백업 실패를 각각 보존한다.

마지막 읽기 전용 검사는 `output/alpha-m72-catalog-wave3-final-read/2026-09-23T22-46-51-923Z/result.json`이다. 새 로그인·r26 계정과 과거r24의 revision 제외 hash 일치2검사는 통과했지만 백업1회가18,606.7ms 뒤 실패했다. DEV 로그22:47:13.032 UTC의SQLSTATE57014로 DB 시간 초과를 확인했다. 추가 쓰기0·재시도0·로그아웃 성공이며 이후 codec·최초9이력·r9 역산 검사는 실행되지 않았다. 준비된 검사 코드가 있다는 이유로 해당 검사를 통과로 세지 않는다.

### 남은 결함과 다음 작업

- **백업 신뢰성과 지연:** r26 새 백업/원문/이력 검사는 통과했다. 읽기 한도20초는 기능 차단 해소이며21.96초의 전체 응답 시간을 줄이는 최적화는 아니다. 장기 누적·30MB 근접 상태·반복 사용의 안정성은 검증되지 않았다. 일부 이력을 빼지 않으며 보관 폴더 선택을 성능 개선 조건으로 두지 않는다.
- **반응 속도:** 격리 UI에서도14행 적용/저장에약10초, 실제 DEV 요청에는20~43초가 걸린 사례가 있다. 무손실 원본과 복구 계약을 유지하면서 반복 검증/복제 비용을 줄이고, 실제 화면에서 지연·실패 후 마지막 확정 상태를 다시 검사한다. 안정적인 일상 사용 완료 판정은 보류한다.
- **후속 검증:** 현재r26의 화면 다운로드·동일 상태 미리보기·다섯 크기 취소 접근은 확인했다. 다음 기술 작업은 배경 회귀 부하가 없는 조건에서 기존 원문과 복구 계약을 보존하는 지연 재측정/개선이다. 반입·편집·복원을 처음부터 반복하거나 실제001/002를 합성 QA에 사용하지 않는다. 필요한 기존 범위는 승인돼 있어 같은 질문을 다시 하지 않는다.
- **별도 잔여:** 나머지164Flow/Map 구조 연결, 실제 기기·실자료 일상 사용, 실제 자료의 명시 복원은 M7-2 전체의 별도 잔여다. 독립 백업 위치는 사용자 선택으로 두고 기술 작업을 막지 않는다. 이번 변경에 새 제품 정책 결정이나 유료 설정은 필요하지 않았다.

**브라우저 기능 검사는 두 콘텐츠 모두 통과했다.** Chromium 합성 계정·격리 API와 실제 dispatcher를 사용했으며 실제 Supabase/RLS 검사는 아래 별도 QA 결과와 구분한다. 14행127개,5행91개 assertion 통과다. 원격 전달0·실제 계정 사용0·허용 prefix 밖 쓰기0·합성 운영 key/value3개 byte-for-byte 동일, 원본 자료실 hash 불변, console/page error0을 확인했다.

| 화면/연결 시나리오 | 2주14행 | 1달5행 |
| --- | --- | --- |
| 자료실 검색·원본 상세·출처/원본 행 대조 | 통과; 휴식2행 보존 | 통과; ‘3번씩’ 주차 묶음 유지 |
| 사본 미리보기 취소/Escape | 성공 mutation0 | 성공 mutation0 |
| 실패 주입·같은 요청 재시도·중복 반입 | 실패 mutation0,사본1개,중복0 | 동일 |
| 항목 편집·제작 초안 저장 | 통과; 개인 실행은 아직0 | 동일 |
| 기준일·윤년·날짜미정·키보드 해제 | 원본 offset14개 대조 | 원본 offset5개 대조 |
| 개인 실행 비교 취소/Escape·명시 연결 | 취소0,문서1개·14행 | 취소0,문서1개·5행 |
| 실행의 원본 안내·재진입·reload | 원본 제목/출처와 마지막 성공 상태 보존 | 동일 |

다섯 크기 모두 상세의 핵심 버튼과 기준일 입력을 키보드로 접근했고, 가로 넘침0·기준일 입력 가림0이다. 기준일 viewport10장(두 콘텐츠×5크기)을 직접 열어 확인했다.

| 크기 | 화면 평가 |
| --- | --- |
| 390×844 | 기준일·설명·해제 버튼 표시. 결과 종류는 줄바꿈, 행은 세로 스크롤 |
| 375×812 | 좁은 화면에서도 가로 넘침 없음. 메모 탭은 다음 줄이며 스크롤로 접근 |
| 844×390 | 짧은 가로 화면에서 기준일·해제 버튼 가림 없음. 본문은 스크롤 |
| 1024×768 | 날짜·원본 검토 안내·결과 행 표시 정상 |
| 1440×900 | 긴 출처 URL은 줄바꿈하며 원본 제목/상세 보존 |

브라우저 반응 속도는 별도 결함이다. 첫 수정본의14행 구조 적용은 성공했지만20초 검사 대기를 초과했다. 기능 재검사는60초 상한 안에서 완료를 확인하면서 시간을 별도 기록했고, 같은 PC의 후속 실행에서 구조 적용10,747ms·명시 저장10,183ms였다. 원격 통신 없는 격리 검사에서도 느리므로 이를 네트워크만의 문제나 사용성 완료로 판정하지 않는다. 배경 검사 부하가 있는 단일 PC 측정이며 성능 벤치마크/실기기 성능으로 일반화하지 않는다.

로컬 전용 근거:

- `output/playwright/alpha-m72-catalog-editing/2026-09-23T21-38-19-986Z-curated-opic-single-mock-review/result.json` 및`storage-diagnostics.json`:127검사,quota실패0,조작 시간.
- `output/playwright/alpha-m72-catalog-editing/2026-09-23T21-36-08-921Z-curated-opic-course-row-import/result.json`:91검사.
- 초기 quota실패(21:19/21:24),수정 후20초 검사 대기 초과(21:35)는 별도 폴더에 그대로 보존한다. 기존 실패 근거를 덮어쓰지 않았다.

Android Chrome·iOS Safari 실기기 미실행, 관찰 사용자0명. 스크린리더/시스템 글꼴 확대/dark mode는 이번 검사 범위가 아니다.

### 이번 변경 파일과 발행 상태

| 영역 | 이번에 수정·추가한 파일 |
| --- | --- |
| 공용 콘텐츠 연결 | `lib/flow/integrated-poc/catalog-content.ts`, 같은 폴더의 `catalog-content-v3.test.ts`, `catalog-content-v3-lifecycle.test.ts`, `catalog-content-v2.test.ts`, `catalog-content-wave2.test.ts`, `catalog-content-import.test.ts` |
| 자료실 UI | `components/flow/integrated-poc/AlphaCatalogLibrary.tsx`, `AlphaCatalogLibrary.test.tsx` |
| 보존 중 자동 읽기 | `components/flow/integrated-poc/AlphaWorkspace.tsx`, `AlphaWorkspace.test.tsx`; `AlphaPreservationPanel.test.tsx`의 기존 소스 정규식1개만 새 guard 위치에 맞춤 |
| 탭 복구 | `lib/flow/integrated-poc/alpha-persistence/recovery-codec.ts`, `recovery-codec.test.ts`, `local-recovery.ts`, `alpha-sync/recovery.ts` |
| 요청 제한 | `lib/flow/integrated-poc/alpha-creator/request-budget.ts`, `request-budget.test.ts`, `alpha-server/creator-command-handler.ts`, `alpha-sync/http-repository.ts` |
| 시뮬레이션·SQL 검사 | `scripts/alpha/m72-catalog-editing-browser.ts`, `m72-catalog-wave3-live.ts`, `m72-catalog-wave3-final-read.ts`, `m72-catalog-wave3-pg.test.mjs`, `m72-creator-timeout-pg.test.mjs`, `m72-json-validation-pg.test.mjs`, `m72-jsonpath-validation-pg.test.mjs`, `m72-account-plan-pg.test.mjs`, `m72-preservation-read-plan-pg.test.mjs` |
| DEV SQL | `supabase/migrations/20260923212945_flowme_alpha_m72_creator_timeout.sql`, `20260923214740_flowme_alpha_m72_json_validation_cost.sql`, `20260923215123_flowme_alpha_m72_creator_transaction_budget.sql`, `20260923220650_flowme_alpha_m72_jsonpath_validation.sql`, `20260923222928_flowme_alpha_m72_account_validation_plan.sql`, `20260923224300_flowme_alpha_m72_preservation_read_plan.sql`; 동일 본문 비교용 `supabase/candidates/m72-json-validation.sql`, `m72-json-validation-jsonpath.sql`, `m72-account-plan.sql`, `m72-preservation-read-plan.sql` |
| 원장·구조 | 이 문서, `alpha-m7-2-personal-trial.md`, `docs/STATUS.md`, `docs/SERVICE_STRUCTURE.md` |

백업 후속에서 추가한 파일은`supabase/migrations/20260923225859_flowme_alpha_m72_preservation_read_budget.sql`, `scripts/alpha/m72-preservation-read-budget-pg.test.mjs`, `m72-backup-rpc-diagnostic.ts`, `m72-backup-ui-readonly.ts`다. 미채택 대안은`supabase/candidates/m72-preservation-read-compose.sql`와`scripts/alpha/m72-preservation-read-compose-pg.test.mjs`로 격리했다. 후보는 앱/DEV 미연결이며 새 원격 schema나 writer를 만들지 않는다.

오픽 locator migration `20260923190436_flowme_alpha_m72_catalog_wave3.sql`은 이전에 준비한 파일을 이번에 DEV 적용한 것이다. 동일 파일에 남아 있던 이전 수정이나 그 밖의 dirty/미추적 파일을 이번 작업 소유로 세지 않는다. 원래 `D:\flowme2605\flow-mvp`는 수정·정리·stage하지 않았다.

직전591→593소스 대조는 중간 단계 이력이다. 후속 자동 읽기 수정과 최종 SQL을 포함한597소스의 npm·통합·타입·빌드를 다시 검사했고 실행 중 변경0이다. 앱 코드는 최종 빌드 뒤 변경하지 않았다. closeout reporter는 미추적 상위 폴더를 묶어 출력하므로 그 scope 개수로 실제 변경 파일 수를 대신하지 않는다. 위 파일 목록과 직접 검토를 기준으로 소유 범위를 기록했다.

실제 화면38+62검사 뒤 DEV를 읽기 전용으로 다시 대조했다. 보호 계정2개·이력502개, QA 포함 전체 계정3개·이력528개, 공개/사진/보관 hash가 모두 검사 전과 같다. 로컬 전용 `output/alpha-m72-wave3-read-budget-remote.json`의`afterFinalUi`에 최종 대조를 추가했다. SQL 행 집합 hash 비교이며 디스크 물리 바이트나 실제 사용자 브라우저 storage 전체 보존의 증거로 확대하지 않는다.

마감 문서 검사 `output/integrated-product-poc/docs-2026-09-23T23-38-11-849Z.json`은4/4·skill sync·필수16파일/로컬 링크6574개 통과, 실행 중 소스 변경0이다. 종료 시 `/alpha` HTTP200, stage0, branch `agent/alpha-m1-persistence-20260921`, HEAD `efd8b642`, `git diff --check` 오류0을 재확인했다. 줄바꿈 변환 안내는 기존 작업 파일의 경고이며 자동 변환·정리를 실행하지 않았다.

commit 없음 / push 없음 / PR 없음 / merge 없음 / Preview 없음 / Production 없음. 개발계 SQL 적용과 로컬 앱 재시작을 운영 배포로 세지 않는다. 실제 기기 미실행 / 관찰 사용자0명. 원본 증거는 `output/`에 로컬 보존하며 공개 대상에 추가하지 않는다.

## 활성화 전 판정 — 2026-09-24 이력

**오픽 계획표 2개·19항목의 후보 변환을 구현했지만, 앱에서 가져오기·편집·저장할 수 있도록 활성화하지 않았다.** 기존 지원은 11개·84항목 그대로다. 전체 원본 177개 중 연결되지 않은 166개에 이번 후보 2개도 포함된다. M7-2 전체 목표는 진행 중이다.

W3-2의 기준일 어댑터·실제 제작 UI 연결, 전체 통합2407/2407·격리 브라우저85검사를 완료했다. W3-3은 서버 계약 후보의 로컬 DB9검사·기존 저장/Undo162검사와 DEV 읽기 전용 대조까지 진행했다. 새 원격 migration·v3 활성화와 해당 콘텐츠 전체 화면 검증(W3-4)은 아직 하지 않았다. 아래의 W3-1/W3-2 수치는 이전 단계 이력이며 이번 검사와 합산하지 않는다.

승인된 compact 이력 DEV 적용·별도 QA 계정 검증·로컬 앱 재시작은 [이전 실행 기록](alpha-m7-2-compact-inverse.md)에 완료로 남아 있다. 이 문서는 그 승인을 다시 요청하거나 신규 DB 변경의 승인으로 확대하지 않는다. 독립 사본·선택 자료의 명시 복원·실제 기기/일상 사용은 [실자료 원장](alpha-m7-2-personal-trial.md)의 잔여다.

## 목적과 적용 범위

사용자는 이전 PoC의 Flow 콘텐츠를 다시 쓰지 않고 제작 사본으로 편집한 뒤 개인 실행으로 연결하려 한다. [직전 묶음](alpha-m7-2-catalog-wave2.md) 이후 남은 구조 중 `duration_days:1`이 있는 상대 일정을 조사했다. 원본은 고정 `catalog-library-pack.v1.json`이다. 새 외부 콘텐츠 전환, 출처 날짜 갱신, 권리 재승인, 공개 발행은 하지 않는다.

`flow-content-conversion`의 원본 대조·실행 단위 보존 기준을 적용했다. 기존 원본 행을 유지하며 설명에 있는 반복 학습을 자동 반복이나 새 일별 항목으로 만들지 않는다. 이사·독서 계획 후보는 출처 분류와 작성된 날짜 간격의 의미를 더 확인해야 하므로 이번 범위에 넣지 않았다. 중학교 수학의 phase/개념 구분은 별도 계약이 필요하다.

## 원본별 대조

| 고정 원본 | 원본 단위 | 후보 표현 | 보존·금지 사항 |
| --- | --- | --- | --- |
| `curated-opic-single-mock-review` | 오픽 모의고사 2주 계획표, 1구간·14행 | 시작일 기준 D+0…D+13, 시간 없는 하루 일정 | 연습·복습·휴식 2행 유지. 휴식 행의 기존 완료 문구도 임의 수정하지 않음 |
| `curated-opic-course-row-import` | 오픽 모의고사 1달 반복계획, 1구간·5행 | D+0/7/14/21/28, 시간 없는 하루 일정 | 주차별 묶음과 ‘3번씩’ 문구 보존. 30일 일별 항목·자동 반복을 만들지 않음 |

두 원본은 기존 Mansour OPIC 워크북 행이다. [이전 원본 추적 정본](../2026-07-05-url-lookup-production-slice/spec.md)과 [19행 추적 기록](../2026-07-05-url-lookup-production-slice/tasks.md)을 대조했다. 원저자 링크·원본 필드·2026-06-29 확인 날짜는 그대로다. 외부 페이지의 현재 사실이나 링크 생존을 새로 검증한 결과는 아니다.

## 활성화 전 후보 계약 — 이력

- 새 후보 버전 `flowme-catalog-content-v3`를 사용한다. 기존 v1/v2 본문·identity·fingerprint를 재발급하지 않는다.
- 두 slug의 고정 원본과 완전히 같은 자료만 인정한다. 단순 fingerprint 재계산으로 원본 변경을 합법화할 수 없다.
- timeline/start_date, calendar Item, 정수 day_offset, 정확히 숫자 1인 duration_days만 대상이다. 날짜 창·시간·시간대·반복·다른 기간은 거절한다.
- immutable bundle에는 `duration_days:1`을 그대로 둔다. 편집용 canonical은 상대 날짜와 시간 부재로 한 번의 종일 일정을 표현한다. `durationMinutes:1440`을 넣지 않는다.
- title·상세·방법·완료 기준·주의·링크 종류·순서·identity와 원본 전체를 대조한다. 출처를 official로 승격하거나 확인 완료로 바꾸지 않는다.
- 후보 전용 build/validate/project 함수에서만 처리한다. 공용 reader·native owner·계정·정상 locator·자료실 capability는 v3를 거절한다. 실제 writer, SQL, UI, 원본 pack에는 연결하지 않았다.

## 단계별 계획과 종료 조건

| 단계 | 할 일·종료 조건 | 상태 |
| --- | --- | --- |
| W3-1 원본·모델 | 2개 원본의 실행 단위/기간/출처를 대조하고 v3 후보를 격리. v1/v2 golden과 정상 반입 차단 검사 | 후보 구현·표적/전체 회귀 완료 |
| W3-2 캘린더 연결 | 기준일을 넣어도 제작 캘린더가 비는 경로 수정. 문서 원문/원본 식별자는 보존하고 개인 실행·결과 캘린더 날짜를 대조 | 완료. 표적90·통합2407·브라우저85·npm2255·타입/빌드/문서 통과 |
| W3-3 저장 활성화 | 별도 서버 계약 및 정상 import/중복0/편집/저장/인계/Undo/백업 검사. 로컬·서버 버전 일치 후 capability 개방 | 개발계 기능 검사 통과. 편집·저장·19행 인계·Undo/Redo·명시 복원·새 로그인과 복원 뒤 새 백업13검사 확인. 성능·실사용과 M7-2 전체 잔여는 별도 |
| W3-4 UI·회귀 | 새 v3 콘텐츠의 실제 반입 연결 화면에서 출처·휴식·반복 의미·명시 인계·실패 안내와 5개 크기 검사. 자동 QA와 실기기 분리 | 기능 검사 통과. 격리14행127/5행91, 실제 DEV 백업 화면38+동일 파일5크기62, 통합2425·npm2255·타입/빌드 통과. 처리 지연·실사용 완료는 별도 미해결 |

W3-1을 전체 콘텐츠 연결 완료로 세지 않는다. 전체 M7-2의 백업·복원·실사용 잔여를 위 단계로 대체하지 않는다.

## 발견·수정 및 미해결

### 후보의 일반 파일 반입 우회 — 수정

첫 구현은 normal locator와 UI를 닫았지만 공용 `validateCatalogContent`가 v3를 읽도록 했다. 그 결과 후보 native owner를 포함한 자료를 일반 로컬 파일 반입 함수에 전달하면 빈 계정으로 가져올 준비가 성공했다. 명시 catalog locator의 서버 허용 목록과 다른 경로였다. 독립 읽기 전용 검토와 로컬 재현에서 모두 확인했다. 실제 서버에 전송하거나 저장하지 않았다.

공용 reader의 v3 수용을 제거하고 후보 전용 함수로 분리했다. 정상 native 생성·재읽기·계정 검증·locator·일반 파일 반입·백업 생성 거절을 회귀 검사로 고정했다. 임시로 파일 반입 일부 필드만 막는 검사는 추가하지 않았다. 후보를 정식으로 켤 때 전체 경로를 다시 검증해야 한다.

### 제작 캘린더의 기준일 — 최초 재현과 후속 수정

순수 개인 실행 날짜 함수는 명시 기준일로 19항목의 날짜를 계산하며, 기준일이 없으면 날짜를 만들어 넣지 않는다. 반면 고정 D2 `buildAuthoringArtifactProjection`은 `options.anchor` 대신 문서 헤더의 `rawAnchorDate(document)`만 읽는다. 후보 문서에 기준일을 옵션으로 전달해도 calendar rows가 0개이고 `relative_anchor_required`가 남았다.

위 내용은 W3-1 당시 함수와 native reader를 직접 호출한 모델 재현이다. 당시에는 브라우저에서 같은 현상을 관찰하지 않았고 vendor 사본도 수정하지 않았다. W3-2 후속은 아래에 구분한다. ‘개인 날짜 계산 성공’을 ‘캘린더/export 완료’로 보고하지 않는다.

기존 `ProgramCreatorWorkspace`의 개인 계획 기준일은 인계/lineage 입력으로 전달된다. 제작 결과 컴포넌트에는 같은 입력이 연결되어 있지 않으므로 모델 옵션 문제와 UI 전달 문제를 구분해야 한다. W3-2에서는 이전 UX 요구와 각 기준일의 소유 범위를 먼저 대조한다. 개인 실행 기준일을 원본 rawText에 자동 삽입하거나 기존 source identity를 바꾸는 해결책은 사용하지 않는다.

## W3-2 후속 — 개인 기준일과 제작 결과 연결 (2026-09-24)

### 요구 대조와 설계

[알파 전환의 날짜 구분](alpha-transition.md), [콘텐츠 반입 경계](alpha-m7-2-content-intake.md), [제작 원문 업데이트 설계](native-source-update-design.md)를 대조했다. 원본 일정·개인 기준일·개인 실행 날짜는 별개이며, 개인 설정을 rawText에 자동 삽입하지 않는다. 기존 개인 인계의 `nativeAnchor` 입력과 기본값은 유지한다. 새 제품 정책이나 저장 schema를 정하지 않는다.

- 고정 D2 26파일은 그대로 둔다. Program 소유의 projection v2 파생본과 출처 SHA256·전체 delta manifest를 추가했다. 원본 hash 재발급, getter/proxy, 원문에 기준일 줄 덧붙이기는 사용하지 않는다.
- 명시한 기준일이 있으면 상대 일정의 미리보기와 인계가 그 값을 사용한다. 고정 날짜는 바뀌지 않는다. 입력을 지우면 현재 초안의 마지막 인계 기준일, 없으면 원문 기준일 순으로 사용한다. 모두 없으면 날짜 미정이다. 이는 기존 인계의 fallback이며 저장/API 의미를 바꾸지 않는다. 입력·보기 변경은 저장 명령이 아니다.
- 기준일을 결과 위로 옮겼다. 실제 적용 날짜와 ‘마지막 인계 기준으로 보기’ 또는 ‘원문 기준으로 보기’를 안내한다. 입력을 지우는 버튼 실행 후 키보드 초점은 날짜 입력으로 돌아간다. 비교창이 열려 있는 동안 기준일은 잠긴다. 기존 개인 기록은 명시 비교·적용 전에는 바뀌지 않는다.
- 상대 반복은 같은 기준일로 시작일을 계산한다. 해결된 `recurrence_requires_start_date` 진단만 읽기 결과에서 제거하며 원래 진단과 원문은 보존한다. 잘못된 규칙·종료일 역전·잘못된 링크·출처 검토 차단은 유지한다.
- 기준일 옵션을 생략하면 이전 projector의 전체 출력과 동일하다. v1/v2 fingerprint·v3 일반 반입 차단은 유지한다. v3 후보 19행의 계산은 별도 모델 검사이며 실제 반입 완료가 아니다.

### 검사 진행 상태

표적90/90(모델27, UI/기존 회귀/반입 차단51, 인계 fallback12) 및 타입524진입점·진단0을 확인했다. 직접 추가한 신규 검사는11개이며 기존 검사 수와 구분한다. 초기 UI 검사1건은 테스트의 텍스트 도우미가 숫자0을 생략해 실패했다. 실제 숫자 child를 검사하도록 고치고 재실행51/51을 통과했다. 제품 UI 실패로 집계하지 않는다. 최종 전체 통합243파일·2407/2407, npm2255/2255, production build, 격리 브라우저85를 통과했다. 전체 통합은 공유 fixture의 import 실행도 포함한 실제 실행 수이며 표적 수와 합산하지 않는다. 실패/skip/cancel0·실행 중 소스 변경0이다. 문서4/4·skill sync·로컬 링크 검사도 통과했다.

추가 대조에서 이미 인계한 초안은 입력이 비면 마지막 인계 기준일을 재사용하는 기존 계약을 확인했다. 이를 미리보기에도 적용해 ‘입력을 비우면 항상 원문 기준’이라는 초기 안내를 고쳤다. 기존 인계 있음/없음·null·다른 초안·명시 입력 우선과 원문 header 충돌을 검사했다. 진행 중 첫 전체 통합 실행은 이 보완 때문에 명시 중단했으며 통과로 집계하지 않는다. 첫 npm/build 통과는 보완 전 중간 근거로 보존하고 최종 소스에서 다시 실행한다.

읽기 전용 추가 검토에서 P1/P2 지적은 없었다. 이 검토를 자동 테스트·브라우저 관찰 대신 사용하지 않는다. 원격 DB·실제 계정·운영 key를 수정하는 작업은 이 단계에 포함하지 않는다.

### 격리 브라우저 시뮬레이션

새 production build로 승인된 로컬 Alpha 서버를 갱신했다. 실제 `/alpha` 화면을 별도 Chromium context에서 조작하며 Auth/REST/API 요청을 가로채고 현재 creator dispatcher로 메모리 계정만 갱신했다. 실제 Supabase/RLS·실제 사용자 계정 검사가 아니다. 고정 원본 `portfolio-4week` 1개·6항목을 사용했다.

| 시나리오 | 결과 |
| --- | --- |
| 원본 상세→취소/Escape→실패 주입→재시도→사본 가져오기 | 통과. 취소·실패 성공 mutation0, 사본1개, 중복 재반입 변경0 |
| 사본 제목 편집→명시 저장 | 통과. 원본 자료실 hash 불변·인계 전 개인 실행 문서0 |
| 결과에서 개인 기준일 변경 | 통과. 6개 날짜를 원본 day_offset의 UTC 날짜 계산과 대조. 변경/해제 저장값·mutation 수 불변 |
| 원문 기준으로 보기 | 통과. 기준일 없는 원문은 캘린더0·날짜 미정, 키보드 초점은 날짜 입력으로 복귀 |
| 개인 실행 비교→Escape/취소 | 통과. 비교 중 기준일 잠금, 닫으면 잠금 해제·계정 snapshot 불변 |
| 미리보기→개인 실행 명시 인계 | 통과. 6개 비교 날짜 일치·개인 문서1개·출처에 원래 제목 유지 |
| 기존 인계 초안 재진입→기준일 입력 해제→비교 취소 | 통과. 마지막 인계 기준일2026-10-01과 결과6행 일치·계정 snapshot 불변 |
| 새로고침 | 통과. 마지막 성공 계정·원본 자료실 유지. 기준일 입력은 임시 보기 상태이며 새 저장 설정으로 만들지 않음 |
| 저장 경계 | 허용 prefix 밖 set/remove/clear0, 합성 운영 key/value3개 byte-for-byte 동일. 원격 전달0·실제 계정 사용0 |

85개 assertion 통과, 검사용 메모리 성공 mutation5건·의도한 실패1건이다. UI 취소가 HTTP 요청 자체를 전혀 만들지 않았다는 주장과 성공 mutation0을 혼동하지 않는다. 실제 계정의 전체 운영 데이터를 새로 캡처한 것은 아니다.

### 화면별 평가

| 크기 | 확인 결과 |
| --- | --- |
| 390×844 | 기준일 입력·안내·해제 버튼 정상. 결과 종류는 줄바꿈되며 세로 스크롤로 접근 |
| 375×812 | 위와 같음. 작은 화면의 메모 탭은 다음 줄에 표시되며 가로 넘침 없음 |
| 844×390 | 가로 화면에서도 기준일 입력·해제·결과 탭 조작 가능. 본문은 세로 스크롤 |
| 1024×768 | 입력과 설명·결과 행 정상, 키보드 초점과 입력 외곽 가림 없음 |
| 1440×900 | 캘린더6행과 원본 검토 안내 표시, 원문 링크·내용 유지 |

다섯 크기 모두 실제 브라우저의 viewport 캡처를 열어 확인했다. 원본 상세와 기준일 화면의 가로 넘침0, 기준일 입력 가림0, console/page error0이다. 캡처는 24장이다. 화면 회전 실기기, 화면 읽기 프로그램, 시스템 글꼴 확대, dark mode는 이번에 검사하지 않았다. Android Chrome·iOS Safari 실기기 미실행, 관찰 사용자0명이다. `ui-ux-pro-max`의 폼 입력·피드백 기준은 실제 적용 날짜 안내와 해제 후 초점 복귀에만 적용했으며 일반 디자인을 새로 정하지 않았다.

### W3-2 변경 파일과 불변 경계

- [native-creator-projection.ts](../../../lib/flow/integrated-poc/native-creator-projection.ts), [delta manifest](../../../lib/flow/integrated-poc/native-creator-projection.manifest.json), [검사](../../../lib/flow/integrated-poc/native-creator-projection.test.ts): Program 소유 읽기 projection v2와 전체 파생 차이 추적.
- [native-creator-document.ts](../../../lib/flow/integrated-poc/native-creator-document.ts): 공용 reader의 계산 함수 연결만 변경. 이전 용량·원본 codec 변경은 이번 추가가 아니다.
- [ProgramCreatorWorkspace.tsx](../../../components/flow/integrated-poc/ProgramCreatorWorkspace.tsx), [ProgramCreatorNativeContext.tsx](../../../components/flow/integrated-poc/ProgramCreatorNativeContext.tsx): 기준일 전달·우선순위·설명·비교 잠금·키보드 복귀.
- [UI 검사](../../../components/flow/integrated-poc/ProgramCreatorNativeContext.test.tsx), [route 검사](../../../components/flow/integrated-poc/ProgramCreatorWorkspace.route.test.tsx), [인계 검사](../../../lib/flow/integrated-poc/creator-native-execution.test.ts), [v3 차단 검사 설명](../../../lib/flow/integrated-poc/catalog-content-v3-lifecycle.test.ts), [브라우저 시나리오](../../../scripts/alpha/m72-catalog-editing-browser.ts): 모델/실제 UI 연결과 기존 인계 fallback.
- 이 원장·[STATUS](../../STATUS.md): 판정·근거·남은 단계. 총13파일 범위이며 같은 파일의 기존 변경을 이번 신규 구현으로 세지 않는다.

고정 vendor26파일·원본 pack SHA256 보존을 재확인했다. 저장 schema·기존 완료/메모/보관/export writer·v3 일반 반입·서버 계약·SQL·환경 설정은 바꾸지 않았다. 파생 projector 원본 SHA256은 `3867ffece55aae7c24dc959b5538aa69548cba0774b1b25dd0271a5b466b41f0`다. 원래 `flow-mvp`와 미소유 자료는 수정·정리·stage하지 않았다.

직전 W3-1의582개 소스 hash와 최종 빌드의585개 소스를 대조했다. 위 범위의 기존7파일만 달라졌고575파일은 동일하며 신규3파일은 projector·manifest·검사다. 브라우저 검사 스크립트와 문서는 이 소스 집합 밖이므로 별도 범위13파일로 기록한다.

로컬 브라우저 근거: `output/playwright/alpha-m72-catalog-editing/2026-09-23T18-48-00-789Z/result.json` 및 동일 폴더의 화면24장. 해당 근거는 로컬 전용이며 공개 대상에 추가하지 않는다. npm2255 통과(`npm-test-2026-09-23T18-43-26-339Z.json`), production build 통과(`build-2026-09-23T18-43-40-048Z.json`), 타입524진입점·진단0(`targeted-types-2026-09-23T18-46-50-440Z.json`), 전체 통합2407 통과(`new-tests-2026-09-23T18-43-15-345Z.json`); 모두 실행 중 소스 변경0이다. 최종 통합은 worker2개·heap512MiB의 기존 실행 한도로 약11분40초 걸렸으며 제품 한도나 assertion을 줄이지 않았다.

남은 작업: W3-3의 서버/로컬 버전 일치·정상 반입/편집/저장/인계/Undo/백업 검사 후 capability를 여는 순서다. 현재 오픽2개를 가져올 수 있다고 안내하지 않는다. 이 projection 수정은 ICS 등 외부 export writer의 검증 완료도 아니다. 독립 사본·실자료 명시 복원·실기기/일상 사용은 별도 원장의 잔여다.

이번 발행: commit 없음 / push 없음 / PR 없음 / merge 없음 / Preview 없음 / Production 없음. 기존 승인 세 작업을 다시 요청하지 않으며 새 서버 migration 승인으로 확대하지 않는다.

## W3-3 준비 — 서버 계약 후보·배포 전 대조 (2026-09-24)

### 범위와 적용 순서

이번 사용자 재확인인 ‘그 세가지 승인’은 이미 완료한 compact 이력 개선 DEV 적용·별도 시험 계정 검증·로컬 재시작에 대응한다. 이를 오픽 계약의 새 원격 변경 승인으로 확대하지 않는다. 오픽2개에 한정한 DEV 검증 함수 변경·별도 QA 검사·로컬 갱신 여부를 별도 질문으로 제시했다. 이전 완료 작업을 다시 실행하거나 재승인 대기로 되돌리지 않는다.

1. **완료: 서버 후보·이전 기준 대조.** Supabase CLI2.117.0의 `migration new`로 새 파일을 만들었다. 기존 `alpha_creator_commit_v1(jsonb)`의 허용 slug 목록에 두 오픽 식별자만 추가한다. 단일 함수 본문의 나머지 문장, invoker·빈 search_path·실행권한 제한은 그대로다. 새 테이블·writer·정책·사용자 자료 변경은 없다.
2. **대기: 지정 DEV 적용.** 새 범위가 승인되면 `flowme-dev`의 함수/권한과 기존 계정·이력 보존 기준을 다시 확인하고 해당 migration만 적용한다. 전체 `db push`, 과거 migration 번호 repair, 운영계 접근은 하지 않는다. 적용 후13개 허용·164개 원본 및 unknown 거절과 기존 권한/행 불변을 확인한다.
3. **미실행: reader와 capability의 일괄 연결.** 서버 계약 확인 뒤 정확한 v3 frozen payload만 공용 reader/builder/locator에 연결한다. generic 파일 반입·계정 읽기·백업 복원 경로도 함께 검사한다. 정상 v3를 계속 ‘우회’로 취급하거나, UI만 닫아 놓고 공용 reader를 먼저 여는 방식은 사용하지 않는다. v1/v2 golden·원본 pack은 유지한다.
4. **미실행: 별도 QA·화면.** 실제001/002를 합성 시험에 사용하지 않는다. 허용된 별도 QA 계정에서 명시 preview→반입→중복0→편집/저장→기준일/명시 인계→Undo/Redo→reload→서명 백업/preview/명시 복원까지 확인한다. 실패·취소 변경0과 다른 계정 불변을 검사한 뒤 다섯 화면 크기를 확인한다. 실기기·관찰 사용자 검사는 별도다.

현재 앱 지원11개·84항목과 v3 반입 거절을 유지했다. 준비한 SQL 파일이 존재하는 것과 실제 DEV에 적용된 것은 다르다. 이 단계는 W3-3 전체 완료가 아니다.

### 현재 DEV 읽기 전용 대조

프로젝트 `wkmzcxpnojobxrgebapw`의 이름 `flowme-dev`·정상 상태를 확인했다. 현재 마지막 migration은 `20260923144652 / flowme_alpha_m72_compact_creator_inverse`이며 오픽 migration은 없다. 기존 private validator의 본문은 wave2와 같다.

로컬 기존 migration으로 만든50개 함수의 본문 hash·invoker/definer·search_path·일반 사용자 권한을 원격과 대조했다. **50개 본문 및 anon/authenticated 권한 일치**. 전체 metadata는34개가 동일하고 public16개는 원격에 `service_role` 실행 grant가 추가로 존재한다. 로컬 fixture와 원격의 차이를 지우거나 권한을 수정하지 않았으며 완전 동일이라고 기록하지 않는다. 이번 대상인 private validator의 metadata는 동일하다. 이 조회는 실제 계정 payload를 읽거나 DB를 변경하지 않았다.

Supabase 스킬의 최신 문서 확인·최소 권한 기준을 적용했다. [공식 함수 문서](https://supabase.com/docs/guides/database/functions)의 invoker·고정 search_path·명시 실행 권한 제한을 유지한다. changelog의2026 breaking 항목을 확인했으며 이번 작업은 새 public 테이블 노출·Realtime·확장 설치·Auth/로그 API를 변경하지 않는다.

### 실제 실행 결과

| 검사 | 이번 결과·한계 |
| --- | --- |
| 신규 로컬 DB 테스트 | 9/9. 전체177원본+unknown의178 locator 사례, malformed34사례, 금지 필드/중복 변경, 기존 Undo envelope, 함수/정책/권한 보존, 반복 적용·원본 hash 검사. 사례 수를 독립 테스트 수에 더하지 않음 |
| 기존 compact 체크포인트 대조 | 18/18. 과거13→14 migration 경계를 이름으로 고정. 후속 migration을 제외한다는 사실을 출력에 명시 |
| 기존 저장/Undo DB 회귀 | 162/162. 본 회귀 DB에는 이번 후보를 포함한 전체15 migration을 적용. 서명·CAS·중복·실패 원자성·계정 분리·legacy/compact Undo 회귀 통과 |
| v3 비활성·기존 콘텐츠 회귀 | 19/19. v3 정상 locator/계정/일반 파일/백업 차단, 원문19행·휴식2행·날짜 의미, 기존11개 fingerprint와 허용 범위 유지 |
| npm test | 2255/2255. 실패/skip/cancel0, 실행 중 소스 변경0 |
| 전체 통합·타입·production build | 이번 준비 단계에서는 재실행하지 않음. 앱/공용 모델·UI 변경이 없고 기존585소스 hash가 전부 동일함. 직전 W3-2 결과를 이번 실행 수로 집계하지 않음 |
| 새 브라우저·실기기·실계정·복원 | 미실행. SQL 후보 검사로 실제 오픽 반입/서명 백업 성공을 주장하지 않음 |

독립 읽기 전용 검토에서 위4개 코드 파일의 P1/P2 지적은 없었다. SQL은 서명된 envelope의 필드 경계를 검사하고 전체 원문/계정 의미 검증은 trusted dispatcher가 담당한다. 로컬 DB의 빈 creatorWorkspace envelope 수용 검사는 실제 계정 수용의 증거가 아니다. Auth/Storage는 의존성 fixture이고 실제 Supabase 인증·동시 연결 검사는 아니다.

### 변경 파일·근거·남은 경계

- [migration 후보](../../../supabase/migrations/20260923190436_flowme_alpha_m72_catalog_wave3.sql): 새2개 locator만 추가, **원격 미적용**. SHA256 `bbe90c09bc1ec2975cafb03a0628830b5a794df9ebef11f4cd7bfe045e1059f2`.
- [신규 PostgreSQL 검사](../../../scripts/alpha/m72-catalog-wave3-pg.test.mjs): 위9개 독립 테스트.
- [compact preflight](../../../scripts/alpha/m72-compact-preflight-local.mjs), [compact DB 회귀](../../../scripts/alpha/m72-compact-inverse-pg.test.mjs): ‘마지막 migration=compact’ 가정을 제거하고 역사적 compact 경계를 명시. 기존 assert를 줄이지 않음.
- 이 원장과 [STATUS](../../STATUS.md): 현재 판정과 적용 순서. 총6파일 범위다. output 근거는 로컬 전용으로 별도 보존한다.

로컬 근거: `output/alpha-m72-wave3-store/2026-09-23T19-06-54.073Z/local-pg.json`, `output/alpha-m72-wave3-store/remote-readonly-20260923T190935.json`, `output/alpha-m72-dev-preflight/2026-09-23T19-07-38.791Z/local.json`, `output/alpha-m72-inverse-runtime/compact-inverse-sql-result.json`, `output/integrated-product-poc/npm-test-2026-09-23T19-07-49-340Z.json`.

원본 pack 및 이전14 migration 파일 hash 불변, 직전585소스 불변이다. 신규 SQL만 소스 집합에 추가됐다. 원격 DDL/DML·실계정 쓰기·운영계 접근·브라우저 저장소 조작0이며 실제 운영 key 전체를 다시 캡처한 검사는 아니다. 원래 `flow-mvp`와 미소유 파일을 수정·삭제·stage하지 않았다. commit 없음 / push 없음 / PR 없음 / merge 없음 / Preview 없음 / Production 없음 / 관찰 사용자0명. 독립 백업·실자료 명시 복원·일상 사용·M7-2 전체는 진행 중이다.

## W3-1 검사 코드 수정 이력

초기 lifecycle 검사는 no-op에도 빈 Undo 배열을 적용해 2건 실패했다. 제품 codec이 빈 배열을 거절하는 정상 동작이어서 검사 도우미를 수정했다. 이어 캘린더 행 수 기대가 14/5 대신 0으로 실패해 위 미해결을 확인했다. 최종 코드는 runtime activation을 보류했으므로 lifecycle 성공 검사를 그대로 남기지 않고 반입 거절 검사와 순수 편집/Undo·날짜 검사로 분리했다. 순수 편집 함수 반환값을 결과 wrapper로 착각한 검사도 수정했다. 이 실패들을 실제 서버 결함·해결 완료로 합산하지 않는다.

첫 타입 검사에서 신규 검사 코드의 암시적 any 진단2건이 나왔다. Item/ItemDetail 타입을 명시했고 최종 진단0을 확인했다. 병행하던 첫 전체 통합 실행은 수정 전에 중단했다. 해당 실행의 exit code는 실패로 보존하며 통과 개수에 더하지 않는다. 최종 전체 실행은 수정 후 새로 시작했다.

## W3-1 검증 이력 (직전 단계)

| 검사 | 결과·범위 |
| --- | --- |
| 최종 신규 표적 | 12/12 통과. 2개 원본 전체/19행·잘못된 기간/필드 거절·직렬화 후보 재검사·정상 반입 차단·순수 편집/Undo·월/연도/윤일 날짜 계산 |
| 기존 관련 표적 | 중간 후보 시점65/65. 최종 전체 통합에서 v1/v2 golden·기존11개 가져오기/편집/저장/개인 인계/reload를 다시 통과 |
| 타입 | 진입점522·진단0. 검사 수집/실행결과 기록기 검사10/10, 실행 중 소스 변경0 |
| npm test | 2255/2255 통과, 실패/skip/cancel0·실행 중 소스 변경0 |
| production build | 통과. 실행 중 소스 변경0. 로컬 빌드이며 배포 아님 |
| 전체 통합 | 242파일·2394/2394 통과. 실패/skip/cancel0·실행 중 소스 변경0. 신규12개 포함이며 표적 수와 합산하지 않음 |
| 문서 | 검사4/4·skill sync·로컬 링크 검사 통과 |
| 브라우저·5개 화면 크기 | 390×844·375×812·844×390·1024×768·1440×900 모두 이번에는 미실행. 비활성 후보와 모델 검사이며 UI를 바꾸지 않음 |
| 실제 Android/iOS·일상 사용 | 미실행 |
| 실제 계정·DB·HTTP·스토리지 조작 | 실행하지 않음. 검사 입력은 고정 콘텐츠/메모리 fixture이며 실제 백업·계정에 저장하지 않음 |

초기 메모리 fixture에서 수행했던 dispatch/handoff·inverse·백업 시도는 최종 활성 경로의 증거가 아니다. 서버 operation ledger Undo·서명 다운로드·명시 실제 복원 완료로 세지 않는다.

로컬 원본 근거는 `output/alpha-m72-catalog-wave3-*.log` 및 `output/integrated-product-poc/`의 실행 기록에 있다. 해당 output은 로컬 전용이며 저장소에 stage/공개하지 않는다. 실패 재현은 `alpha-m72-catalog-wave3-intake-before.log`, 최종 표적은 `alpha-m72-catalog-wave3-isolated-final.log`다.

최종 소스 고정 실행 기록: `new-tests-2026-09-23T18-09-39-702Z.json`, `npm-test-2026-09-23T18-07-50-734Z.json`, `build-2026-09-23T18-09-39-681Z.json`, `targeted-types-2026-09-23T18-09-16-030Z.json`. 앞의 세 실행은 exit0·변경된 소스0이며 타입 진단0이다. 시간은 UTC이고 이 문서의 날짜는 한국 시간이다.

## W3-1 변경 파일

| 파일 | 이번 변경 |
| --- | --- |
| [catalog-content.ts](../../../lib/flow/integrated-poc/catalog-content.ts) | 비활성 v3 후보의 검증·변환. 공용 reader는 기존 v1/v2만 허용 |
| [catalog-content-v3.test.ts](../../../lib/flow/integrated-poc/catalog-content-v3.test.ts) | 원본/일정/출처/identity·변조 거절·native 비활성 검사 |
| [catalog-content-v3-lifecycle.test.ts](../../../lib/flow/integrated-poc/catalog-content-v3-lifecycle.test.ts) | 계정·파일 반입·백업 거절, 순수 날짜/편집/Undo 및 캘린더 잔여 재현. 이름과 달리 활성 lifecycle 성공을 주장하지 않음 |
| 이 원장·[STATUS](../../STATUS.md) | 단계별 판정·실패/수정·검증·남은 작업 연결 |

## W3-1 불변·소유권·발행

- 격리 worktree: `D:\flowme2605\flow-poc-merge-prep-20260920`, branch `agent/alpha-m1-persistence-20260921`, HEAD `efd8b642`.
- 원본 pack SHA-256: `723abefdc26243eb1f9b4bcf21730758ecc7a300494ad2ae75293ac5c6dde4be`. 직전 전체 회귀의 보존 hash와 일치한다.
- 직전 통합 기록의580소스를 대조해 기존 파일은 `catalog-content.ts` 하나만 달라졌고 나머지579개는 hash가 같다. 신규 검사2파일을 합한 현재 소스 집합은582개다. 원본 vendor/SQL/라우트/UI는 변경하지 않았다.
- `catalog-content.ts`의 후보 계약, 신규 v3 검사 2파일, 이 원장과 STATUS의 연결만 이번 범위다. 다른 dirty/미추적 파일은 포함·정리·stage하지 않는다. 원래 `flow-mvp`는 건드리지 않았다.
- 공용 운영 writer·기존 운영 key/schema·원격 DB·실계정 자료·환경/자격 정보 변경 없음. 이 턴에 운영 브라우저 key 전체를 캡처한 것은 아니므로 새 byte-for-byte 브라우저 검증으로 주장하지 않는다.
- commit 없음 / push 없음 / PR 없음 / merge 없음 / Preview 없음 / Production 없음 / 관찰 사용자 0명.
