# M7-2 신규 이력 중복 축소 — 구현 원장

## 현재 판정

9/23 사용자가 **개발계 이력 개선 적용·별도 시험 계정 검증·로컬 앱 재시작 세 가지를 명시 승인**했고 세 작업을 완료했다. 준비된 migration을 DEV에 적용했으며 적용 전10함수와 적용 후13함수가 로컬 기준과 일치했다. 기존 계정2개·이력502건·보관/공개 자료의 행 직렬화 집계 hash는 시험 종료까지 모두 동일했다. 기존 자료를 재작성하거나 삭제하지 않았다. 별도 신규 QA 계정의 실제 API15검사와 브라우저 저장·Undo/Redo·reload·파일 다운로드/미리보기를 통과했다. 실제001/002의 QA 재사용·운영계·발행은 제외한다. M7-2 전체는 여전히 미완료이며 독립 사본·실자료 명시 복원·실기기/일상 사용은 따로 남는다.

### 9/24 후속 — 압축 전 분할 후보와 실제 자료 대조

**판정: 일부 대형 합성 자료의 작은 변경 증폭은 줄였지만, 실제 텍스트 백업에서는 크기와 새 저장량이 늘었다. 일괄 채택하지 않는다.** 직전 실험의 ‘완성된 gzip을 나누면 전체가 바뀔 수 있음’에 대응해 원문을 먼저 나누고 각 조각을 독립 압축하는 로컬 후보를 구현했다. 실제 앱의 파일 형식·저장 writer·원격 DB는 바꾸지 않았다. M7-2 전체 목표와 기존 승인 세 작업의 완료 상태는 유지한다.

#### 구현·호환 계약

- `scripts/alpha/m72-segmented-codec.mjs`: 실험용 `flowme-local-segmented-backup/1`. 봉인 JSON의 UTF-8 바이트를 먼저 내용 기반으로 나눈 뒤 조각별 gzip/base64와 길이/hash를 기록한다. 기존 gzip 파일과 **새 파일의 bytes는 다르지만, 그 안의 봉인 원문은 공백·한글·이모지까지 동일**하다. 새 파일을 검사한 뒤에는 저장/조회에서 재압축하지 않는다.
- 파일마다 모든 조각을 포함해 이전 파일 없이 독립 복원한다. 선택적인 이전 파일 재사용은 전체 무결성/해제 검사를 통과한 경우에만 가능하다. 정상 gzip header가 달라도 이전 조각의 정확한 압축 bytes를 유지하는 검사를 추가했다. 이전 파일이 손상되면 조용히 재생성하지 않고 실패한다.
- raw30MB와 file30MB는 별도 제한이며 기존 한도를 올리지 않았다. parts 수3,663·raw part131,072bytes·packed part263,168bytes 및 base64 길이를 먼저 검사한다. 모든 raw 길이 합계를 압축 해제 전에 검증하고, part별 해제량/hash→전체 hash→최종 UTF-8/봉인 schema 순서로 확인한다. UTF-8 문자가 조각 경계에서 잘려도 개별 조각을 문자열로 해석하지 않는다.
- compact JSON 왕복 형태만 허용한다. 공백/중복 키/대체 escape는 거절하지만 필드 순서를 writer 순서로 고정하는 계약은 아니다. 구 gzip/구 봉인 JSON은 실험용 명시 호환 router로 읽으며 임의 JSON·알 수 없는 새 형식은 거절한다. **기존 제품 decoder는 새 실험 형식을 지원하지 않는다.**
- [Compression 표준](https://compression.spec.whatwg.org/)의 gzip 스트림을 사용한다. Node의 Buffer/hash와 기존 분할 helper를 사용하는 연구 코드이며, 브라우저·실제 기기의 새 형식 호환 검사로 세지 않는다. 파일 hash 검사는 계정 소유권·서버 seal 인증을 대신하지 않는다.

#### 동일 변경40사례 — 개선과 악화 모두 기록

합성 입력100KB/1MB/5MB와 승인된 보관 백업의 메모리 사본에 각각10가지 변경을 적용했다. 기존 방식과 새 방식 모두 현재 파일 조각 저장 모델에 연결했고 **40/40사례에서 각 형식의 정확한 파일 및 봉인 원문 복원**을 확인했다. 기존 방식의 기준은 봉인 원문을 이번 실행에서 구 codec으로 새로 압축한 파일이다. 원본 보관 파일을 변환/덮어쓰지 않았다.

| 사례 | 기존 방식의 새 조각 비율 | 압축 전 분할 후보 | 해석 |
| --- | ---: | ---: | --- |
|5MB 합성 입력, 서명 모양 필드 변경|100%|0.79%|작은 서명 변경의 전체 압축 변화 방지 |
|5MB 합성 입력, 중간 삽입/삭제|51.19%|1.74%|뒤쪽 조각 재사용 효과 |
|1MB 합성 입력, 중간 문자 수정|10.70%|21.58%|이 경우 악화. 항상 더 좋지는 않음 |
|5MB 합성 입력, 넓은 범위/선택 문자열 전체 변경|100%|100%|변경된 전체 내용을 보존하는 비용은 남음 |
|보관 백업 메모리 사본, 일반 작은 변경|약3.51–3.52%|약5.84%|현재 텍스트 자료에서는 새 저장량 증가 |

비율은 이전 현재 파일에 없는 고유 조각 bytes / 새 파일 bytes다. manifest/DB 부가 공간은 포함하지 않는다. 100KB 합성 입력은 작은 변경에도 새 방식39.65–73.85%였으므로 큰 파일의 좋은 비율을 작은 파일에 일반화하지 않는다.

| 입력 | 기존 gzip 파일 bytes | 분할 후보 bytes | 파일 크기 변화 |
| --- | ---: | ---: | ---: |
|100KB 합성|134,269|134,679|+0.31% |
|1MB 합성|1,339,326|1,343,953|+0.35% |
|5MB 합성|6,695,294|6,719,405|+0.36% |
|보관 백업 메모리 사본|1,667,451|1,970,342|**+18.16%** |

실자료 사본에서 바꾼 가장 긴 문자열은 원문 문자 수의1.92%이며 전체 계정/사진 편집을 대표하지 않는다. 사진0이라는 원본 범위는 [앞선 실자료 검사](alpha-m7-2-personal-trial.md#924-후속--실자료-복원에-필요한-사본과-대상-재확인)의 근거이지, 이번 codec 측정의 사진 개수 검사 결과가 아니다. 수정 사본은 재서명하지 않았으므로 유효한 서버 백업/실제 복원 성공으로 세지 않는다.

#### 로컬 DB 비교와 실패 복구

기존 gzip와 새 분할 gzip 각각 동일한 chunk lab에1MB 합성 자료를 최초1회+8회 갱신했다. 매번 revision과 서명 모양 필드를 함께 바꿨다. **2사례·18회 저장**이며 별도의18개 테스트로 세지 않는다.

| 방식 | checkpoint+chunks 최초 |9회 저장 후|일반 vacuum 후|9회 후 전체 lab |
| --- | ---: | ---: | ---: | ---: |
|기존 gzip 후 분할|1,531,904|7,602,176|7,659,520|7,659,520 |
|압축 전 분할 후보|1,531,904|2,023,424|2,105,344|2,080,768 |

단위는 bytes다. 마지막 열만 accounts/receipts 공간을 포함한다. 두 방식 모두 owner 최신1개였고, 모든 단계의 파일/원문 bytes를 대조했다. 기존 gzip의 새 조각은8회 중4회100%·4회약6.15%, 후보는8회모두약3.98%였다. 이 결과는 단일 연결 PGlite의 relation(테이블+TOAST+index) 공간이며 WAL·실서비스 요금·디스크 쓰기량·지연·장기 무료계정 수용량이 아니다. 실제 DB에는 적용/정리/vacuum을 실행하지 않았다.

새 파일도 owner별 교체·재시도·no-op·과거 요청 재시도 시 최신 유지, 다섯 실패 지점(chunks/manifest/정리/account/receipt)의 전체 rollback을 통과했다. 구 파일은 바이트를 바꾸지 않고 함께 보관/조회했다. 테스트 호출자가 owner를 제공하는 trusted lab이며 실제 Auth/session/서명/명령 domain/Undo/handler를 연결한 결과는 아니다. [PostgreSQL 잠금 계약](https://www.postgresql.org/docs/current/explicit-locking.html)을 따르되 다중 연결 경합을 검사했다고 주장하지 않는다.

#### 현재 실행 근거·변경 범위

- codec **16/16 PASS**, DB **19/19 PASS**(신규7+기존lab12), `npm test`15묶음 **2,255/2,255 PASS**. 실패/skip/cancel0. `output/alpha-m72-segmented-tests.log`, `output/alpha-m72-segmented-pg.log`, `output/alpha-m72-segmented-npm-test.log`.
- 최종 현재 소스에서 위35검사와 기존 순수 분할9검사를 함께 재실행해 **44/44 PASS**. `output/alpha-m72-segmented-final-targeted.log`. 앞선 표적 실행과 겹치므로 고유 검사 수에 중복 합산하지 않는다.
- 문서 검사4/4·skill sync·16필수문서/6,531링크·scoped `git diff --check` PASS. 신규 미추적4스크립트의 공백/실제 내용도 별도 검사했다. 마감 도구는 폴더를 접어 문서2개만 감지한다. `output/alpha-m72-segmented-docs.log`, `output/alpha-m72-segmented-closeout.log`; HEAD `efd8b642`·stage0 유지다.
- 초기 codec 검사에서 반복 part fixture가 실제로 같은 bytes를 반복하지 않아1건 실패했다. 반복 ASCII fixture로 별도 왕복을 확인하도록 고쳤고, 최종16검사는 모두 통과했다. 이를 제품 결함 수정으로 세지 않는다.
- 정본 40사례·DB2사례 결과는 로컬 전용 `output/alpha-m72-segmented-benchmark/2026-09-23T17-39-30.647Z/result.json`에 보존한다. 앞선 개발 실행은 합산하지 않는다. 조각/원문/변경 사본은 RAM에서만 다뤘고 결과에는 수치·hash·fixture 이름만 저장했다. 실제 백업 전후 SHA-256은 `df852d4c3f68412bab812ac0d605e5981bac1da7234e0ca7906b39ebd0dc4a38`로 동일하다. 근거 파일은 공개 Git 링크가 아니다.
- 핵심 직접 소스9개 전후 hash 동일, 제품580소스도 직전 통합 결과와 동일. 모든 runtime/의존성을 전수 hash 검증했다는 뜻은 아니다. 제품/UI 변경이 없어 build·전체 통합·타입·브라우저 검사는 이번에 재실행하지 않았다.
- 신규4파일은 `scripts/alpha/m72-segmented-codec.mjs`, `m72-segmented-codec.test.mjs`, `m72-segmented-benchmark.mjs`, `m72-segmented-pg.test.mjs`다. 문서는 이 원장·STATUS만 갱신한다. 독립 읽기 검토의 문구 과장을 수정했고, 이전 gzip 표현 재사용 검사도 추가했다.
- 원본·실계정·원격 DB·기존 migration·제품 파일 형식/handler·환경값·의존성 변경0. commit·push·PR·merge·Preview·Production 미실행. 실제 기기 미실행, 관찰 사용자0명이다.

#### 다음 구현 조건

이 후보를 모든 자료의 저장 형식으로 자동 채택하지 않는다. 구 파일의 계속 읽기, 새로 검사한 파일의 정확한 보존,30MB/복원 요청 예산, 현재 텍스트 자료에서의 악화, 실제 명령·서명·권한·transaction과의 연결을 함께 판단해야 한다. 기존 자료를 새 형식으로 대량 재작성하거나 보관 기간/사진 범위를 줄이는 정책을 확정하지 않았다.

이번 결과로 저장 비용 대안의 장단점은 확인했지만 M7-2가 완료된 것은 아니다. **독립 사본과 선택된 실자료의 명시 복원은 이 실험 형식 도입을 기다릴 필요가 없다.** 해당 경로는 실자료 원장의 사용자 매체/대상 확인 조건을 유지한다. 남은 콘텐츠 편집 연결·일상 사용·실기기 확인도 별도 잔여로 계속 관리한다.

### 9/24 후속 — 정확한 파일 분할·재사용 실험

**판정: 원래 파일의 정확한 복원은 가능하지만, 압축된 파일을 나누는 것만으로 반복 저장 비용을 해결하지는 못했다.** 로컬 실험용 구현과 검사를 추가했으며 제품 writer·후보 SQL·환경값에는 연결하지 않았다. 앞서 승인된 세 작업은 완료 상태를 유지하고 M7-2 전체 목표는 계속 진행한다.

#### 구현 범위와 안전성

- 완성된 파일 바이트를 내용 기반으로 나누고, 순서·각 조각의 길이/SHA-256·전체 길이/SHA-256을 manifest에 기록한다. 같은 파일을 재압축하거나 날짜를 바꾸지 않고 정확히 재구성한다. 최대 파일30MB·조각 수3,663·조각 최대131,072bytes를 복원 할당 전에 검사한다. 이 수치는 실험용 버전 계약이며 제품 한도나 영구 정책 변경이 아니다.
- 폐기 가능한 메모리 DB에서 owner별 chunks·checkpoint·account revision·receipt를 한 transaction으로 저장한다. 이전 owner의 조각을 빌리지 않으며 같은 owner의 현재 manifest가 참조하지 않는 조각만 정리한다. 입력은 첫 비동기 접근 전 복사한다. 같은 파일과 같은 요청의 재시도는 변경0이고, 과거 요청 재시도가 최신 사본을 되돌리지 않는다.
- chunks·manifest·참조 정리·account·receipt 뒤의 다섯 실패 지점에서 전체 테이블 변경 취소와 이전 다운로드 바이트 유지를 검사했다. SQL digest 제약, 손상/누락/다른 판본 거절도 포함한다.
- **trusted-caller 실험**이다. 실제 Auth·session·도메인 명령·서명·기존 writer/Undo를 연결하지 않았다. anon/authenticated의 테이블 직접 접근 거절은 전체 API 권한 검증이 아니다. 읽기의 owner `FOR SHARE`와 쓰기의 `FOR UPDATE`를 같은 거래에서 사용하지만 단일 연결 PGlite 실행은 실제 동시 경합 검증이 아니다. 잠금 의미는 [PostgreSQL 문서](https://www.postgresql.org/docs/current/explicit-locking.html)를 따른다.

#### 변경 종류별 재사용 — 40사례

합성 입력100KB/1MB/5MB와 승인된 기존 백업의 메모리 사본에 각각10가지 변경을 적용했다. 실제 제품 gzip codec을 사용했고 **40/40사례의 파일 재구성 바이트가 동일**했다. 아래 비율은 이전 현재 파일에 없어서 새로 저장해야 하는 **고유 조각 bytes / 새 파일 bytes**다. manifest·DB 부가 공간은 포함하지 않는다.

| 변경 | 5MB 합성 입력 → 약6.70MB 파일의 새 조각 비율 |
| --- | ---: |
| 동일 파일 |0% |
| 앞/중간/끝의 문자 수정 |1.30–2.05% |
| 메타데이터 추가 |1.33% |
| 중간 삽입/삭제 |51.19% |
| 서명 모양 필드의 한 문자 변경 |100% |
| 넓은 범위/선택 문자열 전체 변경 |100% |

작은100KB 입력에서는 앞/중간/끝 문자 수정에도63.57–88.59%가 새 조각이었다. gzip binary를 별도로 비교해도 서명 모양 변경100%·중간 삽입/삭제 약51%가 남아, base64 포장만 제거하는 것으로 해결되지는 않았다. 실제 저장에서는 서명값도 달라지므로 큰 본문의 한 문자 수정만으로 효과를 일반화할 수 없다.

기존 백업1,667,451bytes는 읽기만 했고 원래 파일의 정확한 재구성을 확인했다. 메모리 사본의 변경 사례는 약3.5% 새 조각이었지만, 수정한 가장 긴 문자열이 원문 문자 수의1.92%에 불과했다. 사진이 포함된 계정 전체의 변경을 대표하지 않는다. 수정 사본은 **유효한 서명을 가진 백업이 아니며 실제 복원/사용자 편집 시험도 아니다.** 원문·수정 사본·조각은 파일이나 원격 서버에 저장하지 않았다. 원본 전후 SHA-256은 `df852d4c3f68412bab812ac0d605e5981bac1da7234e0ca7906b39ebd0dc4a38`로 동일하다.

#### 실제 relation 공간 비교 — 2사례

같은1MB 합성 입력으로 최초1회+8회 갱신을 실행했다. 전체 파일 쪽은 기존 후보 DDL/upsert를 그대로 읽고, 분할 쪽은 위 실험 transaction을 실행했다. **2사례 × 두 방식 ×9회 =36회 저장 경로 실행**이며36개의 독립 테스트로 세지 않는다. 각 저장 후 정확한 파일을 재구성했다.

| 변경 방식 | 전체 파일 테이블: 최초 →9회 후 | checkpoint+chunks: 최초 →9회 후 | 분할 lab 전체:9회 후 |
| --- | ---: | ---: | ---: |
| revision만 변경 |1,458,176 →12,591,104 |1,531,904 →2,416,640 |2,473,984 |
| revision+서명 모양 값 변경 |1,458,176 →12,591,104 |1,531,904 →7,602,176 |7,659,520 |

단위는 bytes다. 마지막 열만 실험용 accounts/receipts 공간을 포함하며, 전체 파일 열에는 실제 계정/receipt 공간이 포함되지 않는다. 서명 모양 값을 함께 바꾼8회 중4회는 새 조각100%,4회는 약6.15%였다. 조건부 절감은 관찰했지만 최악의 전체 재기록은 남았다.

일반 vacuum(`TRUNCATE FALSE`) 후 전체 파일은 두 경우 모두12,632,064bytes, checkpoint+chunks는 각각2,498,560 /7,659,520bytes였다. 이번 비교는 PostgreSQL18.3/PGlite0.5.8의 테이블+TOAST+index relation 크기이며 WAL·네트워크·실서비스 요금·사용자 지연 측정이 아니다. 실제 DB에 vacuum/정리 명령을 실행하지 않았다.

#### 실행 근거·변경 파일

- 순수 모델 **9/9**, 로컬 DB **12/12**, `npm test`15묶음 **2,255/2,255 PASS**. 실패/skip/cancel0. 로그: `output/alpha-m72-chunks-unit.log`, `output/alpha-m72-chunks-pg.log`, `output/alpha-m72-chunks-npm-test.log`.
- 문서 검사4/4·skill sync·16필수문서/6,528링크·`git diff --check` PASS. `output/alpha-m72-chunks-docs.log`, `output/alpha-m72-chunks-closeout.log`. 마감 도구는 미추적 폴더 내부를 접어 문서2개만 감지하므로 신규 스크립트6개를 따로 대조했다. HEAD `efd8b642`·stage0 유지다.
- 정본 측정의 로컬 전용 경로: 40사례 재사용 결과 `output/alpha-m72-checkpoint-chunks-benchmark/2026-09-23T17-20-45.748Z/result.json`, DB 공간2사례 결과 `output/alpha-m72-checkpoint-chunks-storage/2026-09-23T17-22-03.942Z/result.json`. 개발 중 선행 실행은 현재 실행 수에 합산하지 않는다. 결과와 로그는 공개 Git에 포함하지 않는다.
- 각 측정의 핵심 직접 소스6개 전후 hash가 같고 현재 파일과도 같다. 직전 통합 검사의 제품 소스580개도 현재 hash 동일이다. 전체 의존성/runtime hash를 검증했다는 뜻은 아니다. 이번 전체 통합·타입·build·브라우저 검사는 제품/UI 변경이 없어 재실행하지 않았다. 과거 실행 수를 이번 결과에 더하지 않는다.
- 신규 스크립트6개: `scripts/alpha/m72-checkpoint-chunks.mjs`, `m72-checkpoint-chunks.test.mjs`, `m72-checkpoint-chunks-pg.mjs`, `m72-checkpoint-chunks-pg.test.mjs`, `m72-checkpoint-chunks-benchmark.mjs`, `m72-checkpoint-chunks-storage-cost.mjs`. 문서는 이 원장과 STATUS만 갱신한다.
- 독립 읽기 전용 검토에서 선언한 단일 연결·trusted-caller 범위의 중대한 결함은 발견하지 못했다. 실제 인증/다중 연결/실계정/장기 저장의 검증으로 확대하지 않는다.
- 원격·실계정·원본·제품 runtime·후보 SQL·기존 migration·환경·의존성 변경0. commit·push·PR·merge·Preview·Production 미실행. 실제 기기 검사 미실행, 관찰 사용자0명이다.

#### 다음 단계와 유지하는 보장

완성된 단일 gzip 파일의 사후 분할을 최종 구조로 채택하지 않는다. 다음 로컬 비교는 **검사한 파일의 정확한 바이트·독립 복원·계정과의 원자적 확정**을 유지하면서 최악의 전체 변경 비용도 제한할 수 있는지 확인한다. 압축 전 조각/객체별 보존은 파일 계약 변경, 정확한 delta/patch는 복원 체인 길이·기준 파일 보존이라는 별도 위험을 검토해야 한다. 백업 빈도를 줄이거나 이력/사진을 빼는 방식으로 기존 보장을 묵시적으로 낮추지 않는다. 새 보관 정책·외부 저장소·원격 전환은 확정하지 않았다.

기존 백업의 명시 복원은 새 checkpoint 활성화의 선행 조건이 아니다. [실자료 원장](alpha-m7-2-personal-trial.md#924-후속--실자료-복원에-필요한-사본과-대상-재확인)의 독립 매체 선택 후 사본 검사→대상 확인→preview→명시 복원 경로를 그대로 유지한다. M7-2 전체의 실기기/일상 사용·남은 콘텐츠 연결은 여전히 미완료다.

### 9/24 후속 — 최신 사본 한 개의 실제 저장 비용

**판정: 현재의 전체 파일 반복 저장 후보는 활성화하지 않는다.** owner당 최신1행이라는 논리적 개수만으로 실제 저장 공간이 파일1개 수준에 머무른다고 볼 수 없었다. 아래 로컬 실험에서 반복 upsert에 따른 TOAST 공간 증가를 재현했다. 직전 연결/원자성 검사 결과를 취소하는 것은 아니며, 저장 비용이라는 별도 조건을 충족하지 못했다. 기존14 migration·후보 SQL·제품 코드·환경값은 이번에 변경하지 않았다.

#### 측정 설계와 결과

로컬 실험 측정기 `scripts/alpha/m72-checkpoint-cost.mjs`는 후보 SQL의 테이블 DDL과 `ON CONFLICT` 갱신 구문을 그대로 읽는다. 후보 SQL과 측정기는 이번 제품 게시 후보에서 함께 보류하며 로컬에는 보존한다. 기존 제품 gzip codec으로 합성 자료를 압축/해제하고, 메모리 PostgreSQL18.3/PGlite0.5.8에서 세 입력 크기 × 세 갱신 방식, **9사례·153회 저장**을 실행했다. 각 사례는 최초1회 +8회 갱신 → 일반 vacuum →8회 갱신 → 일반 vacuum →FULL 재작성 순서다. 모든 시점의 owner 행은1개였고 마지막 파일 hash·판본을 대조했다.

합성 봉인 모양 JSON은 실제 계정 백업/서명이 아니며, 원문/사진/계정/API는 쓰지 않았다. 아래 bytes는 직접 쿼리한 **테이블+TOAST+index relation 크기**이지 DB 전체·WAL·디스크 쓰기량·네트워크 전송·요금이 아니다. 입력 크기는 합성 미디어 원재료 크기이며 파일 크기와 다르다.

| 합성 입력 | 실제 codec 파일 | 최초 저장 후 | 바뀐 파일8회 갱신 후 | 일반 vacuum 뒤 다시8회 갱신 후 | FULL 재작성 후 |
| ---: | ---: | ---: | ---: | ---: | ---: |
|100,000|134,269|204,800|1,335,296|1,384,448|180,224|
|1,000,000|1,339,326|1,458,176|12,591,104|12,754,944|1,433,600|
|5,000,000|6,695,294|7,020,544|62,578,688|63,234,048|6,995,968|

- **같은 파일을 그대로 다시 지정한 upsert도 같은 relation 증가**를 보였다. 대조군에서 파일 필드는 건드리지 않고 작은 메타데이터만 갱신하면 최초8회 동안 위 최초 크기를 유지했다. 따라서 byte 동일성과 큰 필드를 다시 지정하지 않는 것은 같은 조건이 아니다.
- 일반 vacuum은 끝부분 잘라내기를 끈 `TRUNCATE FALSE`로 재사용 효과를 분리했다. 5MB 입력 사례는62,578,688→62,619,648bytes였고 이어8회 쓰기는63,234,048bytes까지였다. 재사용은 관찰했지만 자동으로 최초 파일 크기로 줄어든 것은 아니다. FULL 결과는 로컬 메모리 DB를 재작성한 대조군이며 원격 DB에 실행할 운영 지침이 아니다.
- 5MB 입력/동일 파일의17회 SQL 입력 합계는113,819,998bytes다. 이를 WAL이나 과금량으로 계산하지 않는다. 바뀐 파일 사례는17개 서로 다른 hash를 확인했다.
- 실제 저장은 판본·내용·백업 시점이 달라지므로 파일 hash도 달라질 수 있다. **같은 hash면 갱신 생략**만 추가해서 전체 문제가 해결됐다고 할 수 없다. 메타데이터 대조군은 현재 제품 저장 경로가 아니다.

PostgreSQL은 큰 값을 TOAST로 따로 보관하고, 변경하지 않은 큰 필드는 재사용할 수 있다고 설명한다. 일반 vacuum의 재사용 공간과 FULL 재작성도 구분한다. 이번 결과 해석에 [TOAST 설명](https://www.postgresql.org/docs/current/storage-toast.html)과 [vacuum 설명](https://www.postgresql.org/docs/current/routine-vacuuming.html)을 사용했다. 실제 Supabase는 autovacuum·동시 연결·WAL·DB 전체 사용량이 추가되므로 이 단일 연결 실험을 무료계 장기 사용 보증으로 확대하지 않는다. [Supabase DB/디스크 용량 안내](https://supabase.com/docs/guides/platform/database-size)는 데이터 크기·WAL·디스크를 구분한다. 이번에는 프로젝트 사용량을 원격 조회하지 않았다.

#### 다음 설계에서 유지할 것과 비교할 대안

| 대안 | 보장·문제 | 현재 판정 |
| --- | --- | --- |
|매 저장마다 전체 파일 upsert|검사한 정확한 파일과 계정 저장의 원자성은 유지하지만 큰 필드 재기록 비용이 발생|현 후보 그대로 활성화하지 않음 |
|변하지 않는 내용/사진 조각과 작은 manifest 분리|정확한 파일 바이트 재구성·계정/manifest 원자성·소유자 격리·이전 조각 참조 정리가 모두 필요. 압축 결과 전체가 바뀌면 조각 재사용도 적을 수 있음|다음 로컬 설계·측정 후보. 아직 구현/정책 확정 아님 |
|파일을 객체 저장소에 두고 DB는 pointer만 보관|큰 DB 필드를 피하지만 객체 업로드와 DB 확정의 실패/재시도/유실·정리 경계를 추가로 해결해야 함|외부 자원·보관 방식 변경 없이 자동 전환하지 않음 |
|요청할 때만 현재 백업 생성|기존 명시 다운로드/복원 경로로 사용 가능. 저장 시 검사한 파일을 나중에도 정확히 보존한다는 조건은 충족하지 못함|현재 경로를 유지하되 새 보장 달성으로 대체하지 않음 |

보관 의미도 비용과 분리한다. 이미 내려받은 사용자 사본, 서버가 자동 보관하는 사본, 원본 사진의 현재 접근권은 서로 다르다. 현재 후보는 일부 원본 사진이 사라져도 사본 바이트를 반환할 수 있고, snapshot이 오래돼 반환하지 않는 사본도 DB에는 남을 수 있다. 향후 구조가 바뀌어도 이 동작을 묵시적 영구 정책으로 확정하지 않는다. 보관 기간·삭제/회수·참조 해제 이후 보존과 비용을 구체안으로 비교한 뒤 필요한 결정만 요청한다.

#### 이번 검증과 변경 범위

- 신규 측정기 검사 **5/5 PASS**, 실패/skip/cancel0. `output/alpha-m72-checkpoint-cost-tests.log`. DDL 추출/변경 감지, 합성 입력 재현, 실제 codec 왕복, 세 갱신 방식의 마지막 hash/1행, 무제한 실행 거절을 확인했다.
- 최종9사례 근거는 로컬 전용 `output/alpha-m72-checkpoint-cost/2026-09-23T17-09-38.923Z/result.json`이다. 소스7파일 전후 hash 동일·최종 현재 파일과도 동일, network 시도0. 앞선 개발용 측정은 현재 실행 수에 더하지 않는다.
- `npm test` **2,255/2,255 PASS**, 실패/skip/cancel0. `output/alpha-m72-checkpoint-cost-npm-test.log`. 직전 통합 검사의 제품 소스580개는 현재 hash 동일이다. 전체 통합·build·타입·브라우저 검사는 이번에 재실행하지 않았고 과거 수치를 이번 실행 수에 더하지 않는다.
- 문서 검사4/4·skill sync·16필수문서/6,524링크·`git diff --check` PASS. `output/alpha-m72-checkpoint-cost-docs.log`, `output/alpha-m72-checkpoint-cost-closeout.log`. 마감 도구는 미추적 `scripts/alpha/` 내부를 접어 문서3개만 감지하므로 신규 스크립트2개를 따로 읽고 검사했다. HEAD `efd8b642`·stage0 유지다.
- 실제 사용자 백업2개를 읽기만 한 결과와 복원 재개 순서는 [실자료 원장](alpha-m7-2-personal-trial.md#924-후속--실자료-복원에-필요한-사본과-대상-재확인)에 분리했다. 새 checkpoint를 켜야 기존 파일 복원을 할 수 있는 것은 아니다.
- 신규2개 스크립트와 이 원장·실자료 원장·STATUS만 변경한다. 원본 백업·실계정·원격 DB·운영 `/my`·기존 migration·후보 SQL 변경0. commit·push·PR·merge·Preview·Production 미실행. 실제 기기 검사 미실행, 관찰 사용자0명이다.

이번 발견은 후보를 그대로 전환하지 않도록 다음 행동을 바꾸는 검증 진척이다. M7-2 전체는 미완료이며 독립 사본·실자료 명시 복원·실기기/일상 사용과 콘텐츠 연결을 계속 남긴다.

### 9/24 후속 — 저장 API와 검사한 백업 파일의 연결

직전 후보의 갭 두 가지, **실제 handler 미연결**과 **검사한 백업을 버린 뒤 다른 날짜/압축 결과로 재생성**하는 문제를 로컬 코드에서 연결했다. 직전 단계는 진전으로 분류하며 M7-2 전체 목표는 유지한다. 새 SQL은 여전히 로컬 후보이고, 원격 DB·환경 파일·실제 계정은 변경하지 않았다.

#### 연결된 흐름과 교체 가능한 계약

- 기존 개인공간 handler가 Auth·전체 도메인·개인 소유권을 검사한 뒤에만 새 M3 `/2` 요청을 서명한다. 각 SQL 호출은 같은 사용자 JWT를 사용한다. `FLOWME_ALPHA_M3_CAPACITY=checkpoint-v1`의 정확한 opt-in에서만 새 경로를 사용하며 미설정은 기존 경로, 다른 값은 네트워크 호출 전503이다. 새 RPC 실패 시 기존 writer로 우회하지 않는다. **실제 환경에 이 값을 설정하지 않았다.**
- `prepareBackupCapacity`는 모든 검사와 SQL 측정이 통과한 경우에만 최초 생성한 봉인 원문/압축 파일을 반환한다. 압축은1회다. 기존 `inspectBackupCapacity`는 내용 없는 수치 보고서만 반환한다. 민감한 백업을 진단 로그에 섞지 않는다.
- M3 최종 요청에 검사한 정확한 파일과 hash를 넣는다. 후보 SQL은 기존 account·receipt·Undo 처리와 같은 거래에서 owner당 최신 checkpoint1개를 함께 확정한다. 실패 시 모두 취소하며, 준비 단계·no-op·기존 receipt 재시도는 checkpoint를 바꾸지 않는다. 이 파생 사본은 기존 백업 원본/ledger에 넣지 않아 순환·매번 과거 사본 누적을 피한다.
- checkpoint 테이블은 비공개 schema·RLS/FORCE RLS·직접 권한0이다. 서명된 읽기 함수가 계정→공개 상태를 잠그고 같은 거래 안에서 전체 snapshot hash와 파일 hash를 확인한다. 없거나 현재 자료와 다르면 null, 손상이면 실패다. 현재 백업이라고 옛 상태를 조용히 반환하지 않는다.
- 백업 요청의 새 `format:checked-file-v1`만 `{schema:flowme-alpha-backup-download/1,file}`을 받는다. opt-in에서 현재 checkpoint가 있으면 같은 파일, 없거나 오래됐으면 현재 자료의 새 백업을 생성한다. RPC 오류/손상/서명 오류는 fresh 경로로 숨기지 않는다. 서버는 소유자·무결성·seal을 확인한다. 구 요청의 sealed 응답 계약은 유지한다.
- 화면은 서버가 보낸 파일을 다시 압축하지 않고 내려받는다. 소유자·파일/내용 무결성을 검사하며 파일명 날짜는 백업에 기록된 시점이다. 브라우저에는 seal 검증 키가 없으므로 브라우저 검사만으로 서버 서명 인증을 주장하지 않는다. 기존 local import·명시 preview/restore·미확정 요청 복구는 그대로다.

함수 권한과 사용자 토큰 경계는 [Supabase Data API 보안 안내](https://supabase.com/docs/guides/api/securing-your-api)를 확인했다. 실제 배포 환경의 Auth/Storage/PostgREST와 다중 연결 경합은 아래 로컬 검사로 대체하지 않는다.

#### 원격 전환 전 미결정 사항 — 적용 승인과 분리

checkpoint는 단순한 숫자 캐시가 아니라 **사진을 포함한 서버 측 전체 파일 사본**이다. 원본 Storage 파일이 없어져도 당시 파일 바이트가 남는다. 후보 테스트는 이 동작을 명시적으로 확인했으며 현재 사진 접근권/TTL을 다시 검사하는 동작으로 몰래 바꾸지 않았다.

1. **보관 기간·사진 사본 범위**: 타인이 공개했던 사진까지 백업에 포함될 수 있다. owner당1개라도 다음 저장/계정 삭제 전까지 남는 현 후보를 영구 정책으로 확정하지 않는다. 실제 사용자 자료에 켜기 전에 보관 기간·삭제/회수·현재 접근권과의 관계를 결정해야 한다.
2. **공간·쓰기 비용**: 매 작은 저장에도 최대30MB 파일을 DB에 다시 쓸 수 있어 TOAST/WAL·백업 비용이 생긴다. 로컬 합성 검사 통과는 무료계정의 장기 사용·성능 증거가 아니다. 기존 한도는 유지하고 실제 부하/크기 측정과 대안을 비교한 뒤 전환한다.
3. **전송 포장**: 파일 자체30MB는 그대로다. 요청 문자열은 명령30MB + 파일 JSON escaping 최대60MB + 인증 목록/포장133,120bytes를 별도로 제한한다. snapshot/checkpoint 응답은 escaping을 포함해60,000,256bytes까지 읽고 내부 파일/내용30MB를 다시 검사한다. 이는 제품 자료 한도 상향이 아니며 실제 gateway에서 이 최악 경계를 확인하지 않았다.
4. **coordinated rollout**: 후보 SQL은 기존 M3 실행 권한을 회수하므로 SQL·새 handler·정확한 환경값을 함께 검증해야 한다. 원격 적용 준비 완료/승인 대기로 표시하지 않는다. 제작·이관/복원·공개 writer 및 다른 사람 활동으로 백업이 커지는 경우는 아직 확대 전이다.

이 항목은 다음 전환의 검토 조건이지, 이미 완료한 세 가지 승인 작업을 다시 여는 조건이 아니다. 기존 실제 계정의 독립 사본·명시 복원 준비도 별도 경로로 계속 남는다.

#### 변경 파일

- 공통 검사/다운로드: `alpha-preservation/backup-capacity.ts`, `backup-capacity.test.ts`, 새 `backup-download.ts`, `backup-download.test.ts`.
- API/서명/연결: `alpha-server/capacity-m3.ts`, 새 `capacity-adapter.ts`, `capacity-adapter.test.ts`, `command-proof.ts`, 기존 `command-handler.ts`, `preservation-handler.ts`, `media-handler.ts`(서명 import 분리).
- 화면/검사: `components/flow/integrated-poc/AlphaPreservationPanel.tsx`, 같은 경로 테스트, 후보 SQL·로컬 PG 테스트, 새 `scripts/alpha/m72-checked-backup-browser.ts`.
- 위 `alpha-*` 상대 경로의 루트는 `lib/flow/integrated-poc/`다. 정본 원장·STATUS·SERVICE_STRUCTURE만 후속 갱신하며 의존성·기존14 migration·기본 `/my`는 바꾸지 않는다.

#### 검증 결과

| 검사 | 실제 실행 결과·근거 |
| --- | --- |
| 관련 표적 |129/129 PASS. 백업 계산38·다운로드7·화면31·M3 coordinator19·adapter10·기존 command handler8·preservation handler16. 실패/skip/cancel0. `output/alpha-m72-capacity-checkpoint-targeted.log` |
| 후보 SQL 연결 |34/34 PASS. 실제14 migration + 후보 SQL을 로컬 WASM PostgreSQL에 적용했다. HTTP handler→실제 SQL→백업 handler→파일 해석도 포함한다. Auth/PostgREST/Storage는 합성 경계이며 실제 서비스 검증이 아니다. `output/alpha-m72-capacity-checkpoint-pg.log` |
| 전체 통합 |240파일, 2,382/2,382 PASS. 실패/skip/cancel0, 실행 중 소스 변경0, 정상 종료0. `output/alpha-m72-capacity-checkpoint-integrated.log` |
| 기본 회귀 |`npm test` 15묶음, 2,255/2,255 PASS. 실패/skip/cancel0. `output/alpha-m72-capacity-checkpoint-npm-test.log` |
| 타입 |strict520진입점·580소스 진단0·실행 중 소스 변경0, 목록/판정 검사10/10 PASS. 새 브라우저 스크립트 별도1진입점 진단0. `output/alpha-m72-capacity-checkpoint-typecheck.log`, `output/alpha-m72-capacity-checkpoint-browser-types.log` |
| 빌드 |production build PASS. `output/alpha-m72-capacity-checkpoint-build.log`. 로컬 산출이며 배포하지 않았다. |
| 브라우저 |실제 React 컴포넌트·합성 백업·격리 Chromium 103/103 PASS, 화면7장. 아래 화면 평가와 범위 제한을 따른다. |
| 문서·작업 마감 |`docs:check` 4/4·skill sync·16필수문서/6,518링크 PASS, `git diff --check` PASS. `output/alpha-m72-capacity-checkpoint-docs.log`, `output/alpha-m72-capacity-checkpoint-closeout.log`. 마감 도구는 미추적 폴더 내부를 접어5경로만 감지하므로 변경 목록의 코드/검사16 + 문서3경로를 별도 대조했다. stage0·HEAD 불변이다. |

표적 검사는 전체 통합 검사와 겹친다. 위 실행 수를 합산해 고유 요구사항 수나 충족률로 표현하지 않는다. 중복으로 시작한 전체 `tsc`는 무출력 상태에서 수동 중단했으며 PASS에 포함하지 않았다. 정본 타입 판정은 정상 종료한 위 두 로그다. 모든 `output/` 원본 근거는 로컬 전용이다.

| 시나리오 | 판정 |
| --- | --- |
| 정상 저장과 검사한 파일 확정 |저장/receipt/checkpoint를 같은 거래에서 확정한다. 계정 revision1·receipt1·checkpoint1과 정확한 다운로드 바이트를 확인했다. |
| 준비·초과·변경·실패 |준비 단계 변경0, 최종 자료/사진/hash 불일치와 checkpoint 기록 실패에서 account·receipt·Undo 변경 취소를 확인했다. |
| 응답 유실·재시도 |같은 명령은 기존 receipt를 반환하며 중복 저장0, 최신 checkpoint를 옛 파일로 바꾸거나 삭제된 사본을 재생성하지 않는다. |
| 현재 파일 다운로드 |재압축을 막은 Chromium에서도 정확한 파일을 내려받고 기록된 날짜를 파일명에 사용했다. 다운로드 SHA-256은 `6c6cd90033d572cde643e6b291d48e20a47de77153fa277495f0e048e63aa126`이다. |
| 손상·다른 소유자·서명 오류 |서버에서 다른 경로로 우회하지 않는다. 브라우저의 손상/다른 소유자 시나리오는 파일 다운로드0·commit0이다. 브라우저 검사는 seal 인증 검사를 대신하지 않는다. |
| 기존/새 계약 |구 sealed 응답 호환, 새 파일 응답, checkpoint 없음/오래됨의 현재 백업 생성, 잘못된 opt-in 거절을 확인했다. |

#### 화면별 평가와 데이터 경계

브라우저 정본은 로컬 전용 `output/playwright/alpha-m72-checked-backup/2026-09-23T16-53-18-888Z/result.json`이다. 공개 Git에는 이 결과 요약만 남긴다. 백업 파일 요청은 합성 응답으로 가로챘으며 실제 앱 서버·로그인·DB에 연결하지 않았다.

| 화면 크기 | 평가 |
| --- | --- |
|390×844|내려받기 버튼 표시·키보드 실행·Escape/포커스 복귀 확인. 긴 대화상자는 세로 스크롤이 필요하다. 손상/다른 소유자 실패 화면도 확인했다. |
|375×812|내려받기와 닫기 경로 확인, 가로 넘침0. 전체 안내가 한 화면에 보이는 구성은 아니다. |
|844×390|낮은 높이에서도 내려받기 실행·Escape 복귀 확인. 스크롤 위치에 따라 제목/하단 안내 일부가 화면 밖이므로 전체 모달의 동시 노출을 통과 기준으로 삼지 않았다. |
|1024×768|다운로드·취소와 안내 표시, 가로 넘침0. |
|1440×900|다운로드·취소와 안내 표시, 가로 넘침0. |

- 다섯 크기의 콘솔 오류·page error·가로 넘침·예기치 않은 외부 요청0, 합성 운영 `flow:*` sentinel은 byte-for-byte 동일하고 Storage 쓰기0이다. 이는 실제 운영 데이터 전체의 재검사가 아니다.
- 이 후속 작업의 원격 접근/변경·실제001/002 접근/변경·운영계 접근/변경은0이다. 기존14 migration을 바꾸지 않았고 후보 SQL만 로컬 메모리 DB에 적용했다. 실제 로컬 앱은 재시작하지 않았다.
- 남은 화면 개선: 기존 성공 안내의 “아래에서” 표현은 실제 버튼 위치와 다르며, 작은 화면의 긴 안내는 스크롤해야 읽힌다. 이번 파일 보존 검증을 전체 사용성 완료로 판정하지 않는다.
- 실제 Android Chrome·iOS Safari 미실행, 실제 두 기기 연동 미실행, 관찰 사용자0명이다.
- commit·push·PR·merge·Preview·Production 모두 미실행이다.

**다음 단계**: 기존 한도 안에서 checkpoint의 크기/저장 비용을 로컬 측정하고, 원본 사진 삭제·권한 변경 때의 보존 의미와 대안을 정리한다. 그 뒤 필요한 보관 정책 결정과 실제 환경의 전송/경합 검증을 거쳐서만 전환한다. 별도로 독립 매체 사본·선택한 실자료의 명시 복원·실기기/일상 사용·남은 콘텐츠 연결을 진행한다. 이 후속 구현은 M7-2 전체 완료가 아니다.

### 9/24 후속 — M3 저장의 원자적 용량 검사 후보

개인공간 M3 저장에 대해 **전체 백업 계산과 SQL 최종 저장을 연결한 로컬 후보**를 구현했다. 아래 동결 snapshot 검사기를 재사용한다. 기존 앱의 저장 경로와 DEV에는 아직 연결하지 않았으며, 이 결과를 현재 앱의 저장 후 백업 보장으로 판정하지 않는다. 앞서 승인된 세 작업은 완료 상태를 유지한다.

#### 구현과 적용 경계

1. SQL에서 기존 writer를 실행해 저장될 결과와 SQL 크기를 계산한 뒤 취소한다. 전체 snapshot을 가져오는 두 번째 준비 요청도 같은 방식으로 취소한다. 두 결과의 전체 hash가 다르면 실제 저장을 요청하지 않는다.
2. 서버 후보가 해당 snapshot으로 현재 사진 바이트·전체 이력·보관 자료·봉인·압축 파일·복원 요청을 실제 계산한다. 초과하거나 검사할 수 없으면 최종 저장 요청은0건이다.
3. 계산을 통과하면 원래 명령, snapshot hash, 검사에 사용한 날짜와 사진별 바이트/hash를 서명할 요청에 묶는다. SQL은 기존 writer를 다시 실행하고 전체 snapshot 및 현재 사진 의존성을 잠금 아래 재확인한다. 달라졌으면 account·새 receipt·Undo의 기존 flag 변경까지 취소한다.
4. 기존 완료 요청은 새 용량 검사를 거치지 않고 같은 receipt를 반환한다. no-op·CAS·idempotency·Undo 오류를 유지하며, 저장 후 응답을 확인할 수 없으면 기존 미확정 요청 복구 경로에 남긴다.

SQL 준비 단계는 예외 블록의 변경 취소와 지역 변수 유지 동작을 사용한다. [PostgreSQL 예외 처리 문서](https://www.postgresql.org/docs/current/plpgsql-control-structures.html#PLPGSQL-ERROR-TRAPPING)가 설명하는 범위이며 외부 연결을 열어 둔 채 사진 다운로드/압축을 기다리지 않는다.

- `lib/flow/integrated-poc/alpha-server/capacity-m3.ts`: 검사·서명용 요청 구성·완료 응답 검증 및 크기 제한이 있는 응답 해석기. 기존 handler의 전체 도메인/소유권 검사와 사용자 JWT/서명 처리를 대체하지 않는다.
- `lib/flow/integrated-poc/alpha-server/capacity-m3.test.ts`: 새 후보19검사.
- `supabase/candidates/flowme_alpha_m72_capacity_m3.sql`: **migration이 아닌 후보**. 기존14 migration은 변경하지 않았다.
- `scripts/alpha/m72-capacity-m3-pg.test.mjs`: 실제 SQL과 JS 검사기를 연결한 로컬22검사.
- 문서는 이 원장과 `docs/STATUS.md`만 갱신한다. 기존 route·handler·UI·다운로드 경로는 바꾸지 않았다.

후보 SQL은 기존 M3 public/private 실행 권한을 취소해 우회를 막는다. 따라서 **route adapter와 함께 전환하기 전에는 단독 적용하면 안 된다**. 단독 적용은 현재 앱 저장을 실패시킨다. 익명/PUBLIC 실행 금지와 기존 lookup은 유지한다. 원격 적용은 이번 작업에 포함하지 않았다.

외부 JSON 안에 snapshot 문자열을 담으면서 escaping으로 커지는 전송 포장만 `2 × 30,000,000 + 256`bytes로 제한한다. 실제 snapshot·계정·백업·복원30MB와 기존 파일/개수 한도를 높인 것이 아니다. 실제 배포 환경의 RPC 전송 한도·성능은 아직 검사하지 않았다.

#### 이번 실행 결과

| 검사 | 실제 결과 |
| --- | --- |
| 새 후보와 관련 회귀 |67/67 PASS: 새19 + 전체 백업 검사기34 + 기존 command handler/HTTP14. 실패/skip/cancel0. `output/alpha-m72-capacity-m3-targeted.log` |
| 로컬 SQL 연결 |22/22 PASS. 기존14 migration과 후보를 로컬 WASM PostgreSQL에 적용. 준비 두 단계 변경0·정상 최종 저장1·초과 시 commit0·Undo rollback·기존 receipt·권한·서명·CAS·사진 취소/삭제/만료·보존 사진 경로 확인. 최종 SQL commit 후 응답 유실→동일 요청 재시도 시 같은 receipt·저장1건 유지 포함. `output/alpha-m72-capacity-m3-pg.log` |
| 실제 백업 확대 경계 |위22검사 중1개. 합성 archive27.4MB + 사진2MB에서 SQL 준비는 통과하지만 최종 전체 백업 계산이 초과해 commit 요청0건. 별도 테스트로 중복 합산하지 않음 |
| 전체 기본 회귀 |`npm test` 15묶음2,255/2,255 PASS. 실패/skip/cancel0. `output/alpha-m72-capacity-m3-npm-test.log` |
| 타입·빌드 |Program515진입점·source575개, 진단0·검사 중 소스 변경0. production build PASS. `output/alpha-m72-capacity-m3-typecheck.log`, `output/alpha-m72-capacity-m3-build.log` |
| 문서·마무리 |docs:check4/4·6,515개 링크·skill 동기화 PASS. scoped closeout과4개 새 파일 직접 검토, git diff --check PASS. closeout은 미추적 상위 폴더를 축약해 문서2개만 표시하므로 새 파일4개를 별도 확인. `output/alpha-m72-capacity-m3-docs.log`, `output/alpha-m72-capacity-m3-closeout.log` |

SQL 테스트의 전후 비교는 account·operations·archives·공개 repository·media·preserved media·rate 자료를 대상으로 한다. 외부 actor alias 추가나 Storage object 삭제를 끼워 넣은 시나리오는 **주입한 변화 자체까지0이라는 뜻이 아니다**. 그 변화 때문에 후보 저장이 취소되고 보호한 자료가 유지되는지 확인한다. 기존14 migration과 후보 파일의 실행 전후 hash도 동일했다. 초기 SQL의 CASE 괄호 오류와 테스트 fixture의 명령 참조 공유를 수정한 뒤 위 최종 결과를 얻었다.

별도 읽기 전용 코드 검토에서 새 blocking defect는 찾지 못했으며, 지적된 응답 유실 후 재시도와 SQL 크기 상한의 직접 대조 공백을 위22검사에 보완했다. SQL budget이 실제 snapshot UTF-8 크기 이상인지 archive0/2개·operation1/4개·다국어/escaping 조합으로 확인했다. 정상 저장은 SQL 출력→로컬 `Response` JSON 포장→실제 후보 응답 해석기로 연결했다. 네트워크 없는 이 검사를 실제 PostgREST/API gateway 검증으로 세지 않는다. 제품 TS/SQL 수정 없이 테스트만 보완한 뒤 SQL22검사를 재실행했다.

검사는 합성 계정·로컬 단일 연결·통제된 순차 변경이다. 실제 Supabase Auth/Storage, 다중 연결 경합, 실제 사진 HTTP와 같지 않다. 네트워크 호출은 금지했고 실제001/002·QA credentials·실제 백업·원격 DB·운영 localStorage에 접근하지 않았다. 이번에 실제 운영 key의 전후 비교를 새로 실행한 것으로 집계하지 않는다. 브라우저·실기기·실자료 복원·전체 통합 suite는 미실행, 관찰 사용자0명이다. commit·push·PR·merge·Preview·Production도 미실행이다.

#### 남은 연결과 판정

- [x] M3 후보의 정상 저장/전부 취소를 로컬 SQL과 실제 백업 codec으로 연결.
- [ ] 기존 HTTP handler의 전체 도메인·소유권 검사, JWT/서명, media resolver와 연결하고 API 오류·응답 유실 회귀 확인.
- [ ] 검사에 사용한 `createdAt`과 실제 다운로드 백업을 고정·보관하는 계약 연결. 같은 길이의 날짜/서명도 압축 결과를 바꿀 수 있으므로, 특정 날짜로 계산한 통과를 나중에 다시 만드는 파일의 통과로 간주하지 않는다.
- [ ] 잠금/별칭/사진의 실제 다중 연결 경합·전송 크기·성능을 확인한 후 후보 migration과 route를 함께 적용할 준비. DEV 적용은 별도 명시 승인 후 진행.
- [ ] creator·preservation v1/v2·social 확대. 보관 행의 DB 생성 시각 등 재실행 시 달라지는 값부터 계약을 맞춘다. 다른 사람의 공개 활동으로 커지는 백업과 이미 초과한 계정의 복구는 별도 항목으로 유지.

저장 경로별 실행 순서3 중 **M3 로컬 후보만 검증 완료**다. 현재 앱의 원자적 차단, 모든 writer와 미래 백업 보장은 미완료다. M7-2의 독립 백업 사본·선택 실자료의 명시 복원·실기기/일상 사용도 그대로 남는다.

### 9/24 후속 — 동결 snapshot의 전체 백업 용량 검사

기존 실행 순서2의 **주어진 한 시점 자료를 계산하는 부분**을 구현·검증했다. 새 `flowme-alpha-backup-capacity/1` 검사기는 실제 백업 생성·파일 압축·복원 요청 함수를 호출한다. 저장 writer나 서버 API에는 아직 연결하지 않았다. 따라서 검사기 완료와 ‘저장 성공 뒤에도 백업 가능’ 문제 해결은 다르다. 승인된 세 작업은 위 판정대로 이미 완료됐으며 이번 검사를 그 승인의 새 조건으로 추가하지 않는다.

1. [x] account·공개 references·모든 operations/archive·현재 첨부·base64·integrity·seal·다운로드 파일·복원 요청의 실제 크기 계산.
2. [x] SQL `jsonb::text`와 JS 직렬화를 별도로 측정. SQL 측정이 없으면 나머지가 통과해도 `incomplete`.
3. [x] 기존 개수·파일/본문 제한, 다국어·escaping·사진 중복·마지막 포장 경계를 검사하고 순수 입력/오류 비노출 확인.
4. [x] 로컬 PostgreSQL의 실제 읽기 함수·행 크기와 대조하고 회귀·타입·빌드 검사.
5. [ ] 실제 writer 안에서 같은 거래의 최종 ledger/archive/첨부까지 검사하고 초과 시 전부 rollback. 기존 실행 순서3의 범위.

#### 검사 계약과 한계

- SQL 예산은 같은 동결 시점에서 측정한 `pairedValueBytes + 128 + Σ(operationRowBytes + 2) + Σ(archiveRowBytes + 2)`다. PostgreSQL의 행 바이트를 JS 문자열 길이로 추정하지 않는다. 외부에서 준 측정값 자체의 진위/동시점은 검사기가 인증하지 않으며 `caller-supplied`로 표시한다.
- 입력 RPC 문자열의 UTF-8 바이트와 canonical JSON, 백업 입력/본문/봉인·다운로드·복원 요청 제한을 따로 확인한다. 실제 API의 outbound `Response.json`에는 별도30MB 검사 조건이 없으므로 해당 크기는 관측값이며 새 제한을 만들지 않았다.
- 파일512개·파일당2,000,000bytes·archive128개·operation100,000개 및 본문30,000,000bytes 계약은 그대로다. archive128은 백업 형식의 제한이며 import writer의 별도 제한과 혼동하지 않는다. 압축률은 추정하지 않고 현행 gzip/base64 codec을 실제 실행한다.
- 사진은 기존 백업 계약대로 현재 account/references/archive의 연결만 담는다. operations는 과거 증거이며 삭제된 과거 사진을 복구하는 의존성 목록으로 바꾸지 않는다. 다른 사람의 비공개 제안도 기존 필터/검증 경계를 유지한다.
- 반환값은 수치·단계·제한·판정뿐이며 원문·계정 ID·파일·proof·원시 예외를 담지 않는다. 비동기 처리 중 입력 변경으로 SQL 미측정이 통과로 바뀌던 결함1건을 별도 검토에서 발견해 수정했다. 최초 입력을 고정하고 실제 수행된 검사로 판정하며, 일반 입력 객체의 getter를 실행하지 않는다. 주입된 미디어/서명 함수는 신뢰하는 코드라는 전제다.
- 모든 결과에 `provided-snapshot-only`, `snapshotConsistency:not-rechecked`, `atomicWriteGuard:false`, `sealAuthentication:not-verified`, `restoration:not-tested`를 남긴다. 서명64hex 형태와 크기를 확인해도 인증한 것은 아니다. 실제 writer 보장·나중의 백업 가능성·실제 복원·실기기 증거로 사용하지 않는다.

#### 이번 실행 결과

| 구분 | 실제 결과 |
| --- | --- |
| 신규 검사기 |34/34 PASS. SQL 수치 경계−1/정확/+1, 최종 봉인된 유효30MB snapshot 경계−1/정확/+1,2MB파일·512개파일·128개archive 경계,100,000개operation **개수 gate만** 확인, 잘못된 소유자/날짜/원문/사진/서명 거절, 비동기 입력 변경·입력 getter 회귀 포함 |
| 관련 기존 회귀 |54/54 PASS. 백업·파일 codec·transport·실제 handler의 mock 검사·본문 경계·타인 공개 문맥/비공개 제안 검사. 신규34와 합계88/88, 실패/skip/cancel0. `output/alpha-m72-capacity-targeted.log` |
| 로컬 PostgreSQL 대조 |5/5 PASS. 기존14 migration을 로컬 WASM PostgreSQL에 실제 적용하고 합성 ledger1개/archive1개의 Unicode·escape를 포함한 signed read/행 직렬화와 대조. `output/alpha-m72-capacity-pg.log` |
| 기본 회귀 |`npm test` 15묶음2,255/2,255 PASS. `output/alpha-m72-capacity-npm-test.log` |
| 타입·빌드 |Program513진입점·source573개, 진단0. production build PASS. `output/alpha-m72-capacity-typecheck.log`, `output/alpha-m72-capacity-build.log` |
| 문서·마무리 |docs:check4/4·6,514개 링크·skill 동기화 PASS. scoped closeout 실행 및 새 파일3개 직접 검토. 미추적 상위 폴더 축약 때문에 closeout 표에는 문서2개만 나오는 한계를 별도로 확인. `output/alpha-m72-capacity-docs.log`, `output/alpha-m72-capacity-closeout.log` |

operation100,000개의 완전한 유효 백업을 생성한 시험은 아니다. SQL30MB 경계는 주입한 측정값의 산술 경계이며, 작은 실제 SQL fixture5검사와 구분한다. 로컬 SQL의 `jsonb::text`는 실제 PostgREST 네트워크 응답을 수집한 증거가 아니다. Auth/Storage는 로컬 의존성 stub이고 단일 연결이므로 실제 Supabase 인증·Storage·다중 연결 경합·성능 검사도 아니다. 최초 PG fixture의 UUID/text 매개변수 추론 충돌1건을 고친 뒤 최종5검사를 통과했다.

새 파일은 `lib/flow/integrated-poc/alpha-preservation/backup-capacity.ts`, 같은 경로의 `backup-capacity.test.ts`, `scripts/alpha/m72-backup-capacity-pg.test.mjs` 세 개다. 이 원장과 STATUS 링크만 갱신하며 기존 writer/handler/codec/UI/migration 내용은 바꾸지 않았다. PG 검사는 검사 전후 합성 자료와14 migration 파일 hash 불변을 확인했다. 실제001/002·credentials·원본 백업·원격 DB·운영 localStorage 접근/쓰기는 이번에 실행하지 않았다. 실제 운영 key 전후 비교를 새로 실행한 것으로 세지 않는다.

이번 브라우저·실기기·실자료 복원 검사는 미실행이며 관찰 사용자0명이다. 화면/API/writer를 바꾸지 않았으므로 앞선 브라우저 결과를 이번 검사 개수에 합산하지 않는다. 전체 통합 suite도 재실행하지 않았다. commit·push·PR·merge·Preview·Production은 모두 미실행이다. 다음은 저장 경로별 원자적 용량 검사이며, 독립 백업 사본·실자료 명시 복원·실기기/일상 사용과 M7-2 전체는 계속 남는다.

### 승인 후 DEV 실행 — 이력 개선 적용·별도 QA 검증

- [x] 적용 직전 migration SHA256 및 원격 기존10함수 본문/권한 재대조.
- [x] `flowme-dev`에 준비된 compact inverse만 적용. 원격 migration version은 `20260923144652`, 로컬 준비 파일은 `20260923095533_flowme_alpha_m72_compact_creator_inverse.sql`이다. 적용 도구가 생성한 원격 시각과 준비 파일 시각을 구분한다.
- [x] 사후13함수와 로컬 기대값 일치, 기존 자료 집계 hash 불변. 원본 행 변경0.
- [x] 승인된3104 앱을 재시작. 이전 PID3480의 명령을 재확인 후 종료했고 정상 시작을 확인했다.
- [x] 기존 실사용 계정과 별개인 `flowme-m72-qa-20260923-1450@example.com`을 DEV에 생성. 가입 확인 메일 발송 없이 관리 화면에서 만들었으며 실제001/002의 비밀번호/세션 파일을 사용하지 않는다. 별도 입력 `.tmp/m72-compact-qa.json`은 Git ignore 대상이다.
- [x] 실제 Auth 두 세션·앱 API·DEV writer 경로15/15 통과. 작업본 생성→명시 저장→편집→Undo→Undo의 Undo 총5건, 동일 요청 재시도는 추가 ledger0건. 계정 비제작 영역·공개 references 불변, 실제 compact 이력 확인, 백업 codec 정확 왕복과 서버 same-state restore preview(read-only) 통과.
- [x] 실제 앱 브라우저 저장·Undo·Redo·reload 및 화면 크기 확인 결과 정리.

로컬 근거: `output/alpha-m72-approved-dev/2026-09-23/migration.json`, `output/alpha-m72-compact-live/2026-09-23T14-50-03.405Z/result.json`. 신규 도구 `scripts/alpha/m72-compact-live.ts`는 명시1entry strict/noEmit 진단0이며 `--run-development-live`와 정확한 QA credential 계약을 요구한다. QA 계정은 생성/로그인 및 합성 데이터 검증용이고 실제 사용자·기기·실자료 복원 증거가 아니다. 계정/원문/토큰/서명은 결과에 저장하지 않는다. 자동 정리나 실제 restore는 실행하지 않았다.

기존 Supabase Advisor WARN1(유출 비밀번호 보호 비활성)·INFO29는 변화 없으며 권한/Auth 설정/요금제를 변경하지 않았다. [비밀번호 보호 안내](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)를 후속으로 유지한다. 아래 '승인 전' 문단은 적용 전 이력이다.

#### 실제 앱 브라우저 확인과 최종 자료 대조

| 경로 | 이번 결과 |
| --- | --- |
| 앱 로딩 | `/alpha` HTTP200, script20/20 HTTP200. 이전 실패3개 해소. 기본 로그인 화면과 실제 제작 작업본이 초기화됨 |
| 저장 | QA r5 작업본을 브라우저에서 수정하고 명시 저장. 작업본 보관과 판본 저장2건으로 r7 도달, 저장 완료 안내 확인 |
| Undo/Redo | 저장 Undo r8, 다시 실행 버튼 활성. Redo r9, 서버 연결 완료 확인. API 검사의 space 정확 복원과 UI 상태 확인을 구분 |
| reload | 제목 `M72 QA browser edit`와 서버 r9 복원. 서버 재조회만으로 새 명령이 생기지 않음 |
| 백업 파일 | 화면에서 생성→내려받기. `C:/Users/HUBERT/Downloads/flowme-account-2026-09-23.json` 3,020bytes, SHA256 `22d53daa39421ef53d0ab01e549eee0a1748b8a6405762c61af220eea6bb99a8`. 실제 파일 decode/validate PASS, QA r9·operations9 확인 |
| 복원 미리보기 | 내려받은 같은 파일을 선택→서버 미리보기에서 ‘이미 같은 자료’·적용 불가 확인. 취소 후 r9·ledger9 그대로. 실제 restore는 실행하지 않음 |
| 화면 크기 |390×844·375×812·844×390·1024×768·1440×900 모두 가로 넘침0, 저장 버튼 가로 경계 내·높이48px. 각각 실제 화면을 확인.375세로·844가로는 편집부가 첫 화면 아래지만 스크롤/키보드로 접근 가능 |
| 키보드·오류 | 저장 버튼 인접 이동에서 포커스와 편집부 노출 확인. 검사 탭의 브라우저 수집 warn/error0. 앱 전 화면·모든 동작·실기기 오류0을 증명한 것은 아님 |
| 종료 | QA 로그아웃, 일시적 viewport 해제. QA 계정·자료는 정확한 재검증 대상을 보존하려고 삭제하지 않음 |

최종 계정은 기존2개+QA1개, ledger는 기존502+QA9건이다. QA9건 중compact inverse7건이며 QA용 actor identity1행도 새로 생겼다. 이는 **QA 생성·시험용 쓰기가 없었다는 뜻이 아니다**. 기존 계정/이력 hash와 보관/공개 repository hash 불변을 별도로 확인했다. 실제 사용 계정 인증정보·원본 백업·운영 프로젝트는 이번 시험에서 읽거나 변경하지 않았다. QA backup에는 사진 fixture가 없으므로 사진 복원 검사를 새로 통과했다고 집계하지 않는다.

최종 로컬 근거 `output/alpha-m72-approved-dev/2026-09-23/final.json`. 화면 캡처는 현재 대화에서 직접 관찰했고 별도 이미지 파일로 보관하지 않았다. 독립 두 클라이언트와 Codex 브라우저를 실제 두 기기나 관찰 사용자로 바꾸어 보고하지 않는다. 실제 Android Chrome/iOS Safari 미실행, 관찰 사용자0명이다.

이번에 제품 코드·의존성·migration 파일 내용은 바뀌지 않았다. 직전 통합2293검사의 source569개 SHA256을 현재와 재대조해 차이0을 확인했다. 따라서 npm2255·전체통합2293·production build는 앞선 실행 근거를 유지하며 이번에 재실행한 개수로 더하지 않는다. 신규 live 도구1개·관련 원장3개가 이번 코드/문서 변경이다. docs:check4/4·6505링크·skill 동기화 PASS, scoped closeout과 실제 파일/내용 검토를 완료했다. closeout은 미추적 scripts 상위 폴더 축약 때문에 새 live 도구를 표에 표시하지 않아 정확한 파일과 소스를 별도로 검토했다. staged0, commit·push·PR·merge·Preview·Production은 모두 미실행이다.

다음 실제 시험은 기존 M7-2 원장의 **다른 기기/매체에 독립 백업 사본 확보 → 선택한 실자료의 명시 복원 → 실제 기기 일상 사용** 순서를 따른다. 이번 소량 QA 성공은 저장 후 전체 백업 가능성 guard·장기 누적 용량·미연결166Flow/Map 편집을 해결하지 않는다. 이 잔여를 본 적용의 완료와 구분한다.

### DEV 사전 확인 — 읽기 전용 완료, 적용·실제 시나리오는 승인 전

9/23 목표 자동 재개에서 준비된 개선과 현재 개발계를 대조했다. 이번에는 `flowme-dev`만 메타데이터·집계로 조회했다. 모든 자료 조회 거래는 `READ ONLY`로 실행했고 write RPC·DDL·로그인·메일·계정 생성·개인 원문/비밀번호 반환은0이다. 원격 적용 승인이나 시험 계정 선택을 자동 재개 메시지에서 추정하지 않았다.

1. [x] 프로젝트 식별·원격 migration·현재 함수/권한·데이터 집계 확인.
2. [x] 로컬 메모리 DB의 적용 전/후 함수 차이를 검사하고 원격 적용 전 기준과 대조.
3. [x] 사후 집계 hash·로컬 앱 자원 응답 확인, 실행 경계를 기록.
4. [ ] 사용자 승인 후에만 compact-inverse 적용·별도 QA 계정 검증. 실제001/002의 합성 QA 사용 금지.

| 확인 | 실제 결과 |
| --- | --- |
| 대상 | `flowme-dev`, ACTIVE_HEALTHY, PostgreSQL17.6. 운영 프로젝트 접근0 |
| 원격 변경 이력 |21건. 과거 임시 probe·복원 시험 이력이 있어 로컬14파일과 개수는 다름. compact helper는 아직 없음 |
| 관련 함수 | 원격10개와 로컬 적용 전10개가 본문 MD5(CR 제거)·인수·search_path·definer/invoker·anon/authenticated 실행권한 모두 일치 |
| 로컬 적용 차이 |18/18 PASS. creator writer 본문1개 변경·private helper3개 추가, 기존 인수/권한/config/security 불변. 신규 helper는 invoker·빈search_path·anon/authenticated 실행권한 없음 |
| 직접 자료 접근 | account는 authenticated 본인 행 SELECT/빈 본인 account INSERT만 허용, 직접 UPDATE/DELETE 불가. ledger/archive/signing key 테이블은 anon/authenticated 직접 접근 불가, 모두 RLS/FORCE RLS |
| Advisor | WARN1(유출 비밀번호 보호 비활성), INFO29(RLS에 policy 없는 내부/복원 시험 테이블). INFO 대상29개는 anon/authenticated 직접 접근0을 추가 확인. 나머지 복원 시험 accounts2개는 policy가 있는 SELECT-only이며 이번 범위에서 그 policy의 모든 사용자 시나리오를 다시 검증한 것은 아님 |
| 자료 전후 관찰 | account2개·ledger502행·archive0행. account/ledger/archive/public 집계 hash 모두 전후 동일. 개별 owner ID·자료 본문·키 값은 반환하지 않음 |
| 로컬 앱 | `/alpha`200, script20개 중17개200·3개400. 기존3104 listener PID3480은 그대로이며 중지/재시작하지 않음. 실제 앱 브라우저 검증 미완료 상태 유지 |

원격 근거는 로컬 `output/alpha-m72-dev-preflight/2026-09-23T13-33-22Z/remote.json`, 최종 로컬18검사는 `2026-09-23T13-37-56.275Z/local.json`이다. 함수/데이터 hash 대조는 조회 시점의 일치 근거이며 전체 raw backup·실제 사용자 JWT·동시 writer·실기기 검증을 대신하지 않는다. 기존 WARN은 [Supabase 비밀번호 보호 안내](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)에 따라 후속으로 남긴다. 이번에 Auth 설정·요금제·접근 정책을 바꾸지 않았다.

승인 후 순서:

- 로컬 앱 실행 상태를 복구하고 자원 오류0·실제 화면 초기화부터 확인한다. 과거의 별도 서버 실행 도구 제한을 다른 실행 수단으로 우회하지 않는다. 현재 실행기는 `npm.cmd run alpha:dev -- --start`이며 `.tmp` 설정/키를 출력하거나 수정하지 않는다.
- migration SHA256 `42cf78c6e1fb4af9885785d5a90fc25a6a227e8b9682fdb350c1f03d39d2b102`와 원격 기준을 직전에 다시 확인한다. 적용은 helper3개 추가+writer1개 교체이며 과거 행 재작성·삭제를 포함하지 않는다.
- 기존 실제 계정과 구별된 새 QA 대상을 명시한다. 기존 `m4-live.ts` 등은 `.tmp/alpha-test-accounts.json`의 두 계정을 자동 사용하므로 그대로 실행하지 않는다. 이 둘은 이미 실사용 귀속 계정이므로 ‘시험 계정’이라는 과거 파일 이름을 허가 근거로 삼지 않는다.
- 별도 QA에서 작은 작성→편집→Undo/Redo→같은 요청 재시도→독립 세션 read→백업/미리보기를 확인한다. 실패·정리 대상은 이번에 만든 정확한 QA ID/요청으로 한정하고, 시험 전후 실제 계정의 account·기존ledger를 대조한다. 기존 자료의 독립 사본·실제 명시 복원·실기기/일상 사용을 이 합성 검증으로 대신하지 않는다.

신규 파일은 `scripts/alpha/m72-compact-preflight-local.mjs` 하나이며 제품·migration·의존성 변경0이다. 최초 도구의 괄호 구문 오류와 v2 함수 이름 오기를 보완하고, 원격 비교와 같은 identity-arguments 표현으로 맞춘 뒤 최종18검사를 실행했다. JS 구문 검사 PASS, docs:check4/4·6503링크·skill 동기화 PASS다. 제품 source569개가 직전 전체 통합 근거와 hash 동일하므로 npm·전체 통합·build·브라우저를 이번에 재실행한 것으로 집계하지 않는다. commit·push·PR·merge·Preview·Production·실기기 미실행, 관찰 사용자0명이다. M7-2 전체 목표는 유지하며 완료 판정을 내리지 않는다.

### 저장 후 백업 가능성 — 조사·실패 재현·부분 후보 검증 완료

9/23의 계속 진행 요청에 따라, 저장 성공 뒤 전체 백업이 한도를 넘는 잔여를 검사한다. 원격 compact-inverse 적용 승인은 아직 확인하지 못했으므로 로컬 PostgreSQL 엔진과 합성 자료만 사용한다. 이번 범위는 writer별 누락 지도와 실행 가능한 실패 재현, 안전한 수정 순서 확정이다. 제품 guard 구현·원격 적용·전체 백업 보장은 별도 판정한다.

1. [x] 계정·이력·archive·첨부·공용 references를 바꾸는 writer와 기존 잠금·오류 계약 조사.
2. [x] 실제 migration SQL에서 정상 저장 성공 후 전체 백업 읽기 거절을 재현. 재시도·Undo·오류 시 불변도 구분.
3. [x] 제품 백업 함수에서 다른 계정의 공개 문맥과 파일/base64/wrapper 비용을 합성 fixture로 확인.
4. [x] 작은 writer guard의 보장 범위와 남는 한계, 적용 순서·완료 기준을 이 원장에 기록하고 도구/문서를 검사.

개인 원본·실제001/002·credentials·원격 DB·배포는 읽거나 변경하지 않는다. 과거 이력을 삭제하거나 공용 references의 의미를 임의로 축소하지 않는다. 계정 하나의 검사로 다른 계정의 공개 활동까지 통제하지 않으며, 합성 부하를 실사용 결과로 계산하지 않는다. 독립 사본·명시 복원·실기기와 기존 compact-inverse DEV 승인을 이 준비 작업의 완료로 대신하지 않는다.

#### 이번에 확인한 문제

로컬 PostgreSQL 엔진에 현행14개 migration과 미적용 compact-inverse를 함께 올리고, 실제 semantic dispatcher·서명 writer로 합성 작업본을 변경했다. JSON escaping 비용을 드러내는 제어문자10만 자 fixture이며 일상적인 원문·휴대폰 성능을 대표하지 않는다. native 문서100회 편집 부하검사를 재개한 것도 아니다.

- 48번째 상태까지 SQL 전체 백업 읽기가 성공했다. 49번째 저장은 성공했고 현재 계정은601,158bytes였지만, 이력은29,433,005bytes로 증가해 직후 전체 백업 읽기는 정확히 `limit`로 거절됐다.
- 첫 저장 다음의48개 제목 변경은 모두 compact inverse였다. 기존 inverse 중복 축소는 유효하지만, 원문을 포함하는 command와 다른 구성요소까지 무제한으로 줄이는 기능은 아니다.
- 같은 요청의 재시도는 이미 성공한 receipt를 반환했고 account·ledger·archive·public 상태 hash는 변하지 않았다. stale revision과 잘못된 서명도 기존 이유로 거절됐다.
- 로컬 후보는 같은 거래 안에서 신규 변경 후 SQL 읽기 한도를 검사하고, 초과 시 예외로 **account·ledger·Undo의 undone 표시까지 함께 rollback**했다. 한도 안의 새 변경은 정상 저장했고 이전 원문은 inverse로 복원됐다. 한도를 이미 넘은 상태에서도 과거 receipt 조회/재시도는 유지했다.

후보 함수 `fixture_guarded_creator`는 검사 실행 중 메모리 DB에만 생성된다. migration이나 제품 코드가 아니다. SQL 읽기 크기만 검사하므로 최종 파일·첨부·개수 한도·다른 writer·실제 동시성까지 보장하지 않는다. 이미 초과한 계정의 감소 작업을 어떤 조건으로 허용할지도 이 후보로 제품 정책을 확정하지 않는다.

백업 references는 계정이 직접 사용한 최소 부분이 아니라 당시의 전역 공개 저장소와 actor 목록을 담는다. 다른 actor 추가·다른 계정 게시만으로도 내 account/ledger 불변인 채 백업이 커졌다. 비공개 제안의 기존 권한 필터는 유지되며, 이를 제거하거나 타인의 private 데이터를 포함시키는 수정은 하지 않았다. 사진3,001bytes는 base64 4,004자와 파일 메타데이터로 늘어났고, integrity·서명 wrapper·복원 요청의 포장도 추가 크기를 차지했다. 파일을 읽을 수 없는 경우는 크기가 작아도 별도로 실패했다.

#### writer별 후속 검사 지도

| 경로 | 함께 계산/검사할 변경 | 현재 판정 |
| --- | --- | --- |
| 개인 변경·Undo | account + command/receipt/inverse ledger | 전체 최종 백업 guard 미구현 |
| 제작 변경·Undo | 위 항목 + 신규 compact inverse | SQL 읽기 한정 로컬 rollback 후보26검사, 제품 미연결 |
| 공개 게시·댓글·반응·제안 | account/ledger + 공용 references·연결 사진 | 다른 owner의 백업도 커질 수 있음; 단일 owner 검사로 전체 보장 불가 |
| 자료 import/restore v1 | account/ledger + 원문 archive·문자열 escaping | 최종 archive/ledger가 추가된 뒤 검사 필요 |
| 사진 포함 restore v2 | 내부 v1 결과 + 보존 사진·base64 비용 | v1 검사만으로 부족; v2 최종 상태의 원자적 검사 필요 |
| 사진 staging/연결 | 파일 상태·실제 bytes·연결 시점 | staging 용량과 백업 본문 크기는 같지 않음 |
| social identity 생성 | 전역 actor 목록 | 개인 revision 변화 없이 다른 계정 백업에 영향 |

account UPDATE trigger 하나는 뒤에 생기는 ledger·archive·사진을 보지 못할 수 있다. 성공 응답 후 거래 종료 때 실패하는 지연 trigger도 현재 오류 계약에 바로 끼워 넣지 않는다. 각 writer의 최종 변경을 같은 거래에서 확인하고 초과 시 전체를 되돌려야 한다. 기존 owner/shared lock 순서·권한·CAS·idempotency를 유지하며, 실제 다중 연결 경합은 DEV에서 별도로 확인한다. [Postgres trigger 문서](https://supabase.com/docs/guides/database/postgres/triggers)를 참고했으나 이번에 제품 trigger를 추가한 것은 아니다.

#### 다음 실행 순서와 완료 기준

1. **준비된 이력 개선의 DEV 검증 — 9/23 승인 후 완료**: 기존 compact-inverse migration hash를 유지해 개발계 적용·별도 QA 저장/Undo/백업을 확인했다. 상단 승인 후 실행 기록이 정본이다. 아래 전체 용량 설계를 그 단계의 새 선행 조건으로 만들지 않는다. 실제001/002를 합성 부하 대상으로 사용하지 않는다.
2. **writer 시점의 완전한 계산 — 9/24 동결 snapshot 계산 부분 완료**: SQL/JS 직렬화 차이, account·references·모든 ledger/archive, 현재 사진/base64, 최종 backup/seal/restore 포장, 각 개수 제한을 대조하는 versioned 검사기를 만들었다. 실제 codec·로컬 SQL 대조는 상단 후속 기록을 따른다. 실제 writer 거래의 최종 시점 측정·현재성 보장은 아직 없으므로 이 단계 전체를 완료로 올리지 않는다.
3. **저장 경로별 원자적 차단 — 9/24 M3 handler·정확한 파일 연결 로컬 검증, 미활성화**: M3→creator→preservation v1/v2→social 순으로 연결하고, 예산 내 새 저장 성공과 초과 시 모든 변경0을 짝지어 검사한다. M3 준비 rollback→전체 백업 계산→최종 SQL 재확인과 검사한 파일의 원자적 보관/다운로드는 상단34검사·HTTP adapter·브라우저 후속 기록을 따른다. 환경값 미설정·DEV 후보 미적용이며 보관/삭제 의미·비용·실제 전송/경합 검증은 남는다. no-op·기존 receipt 재시도·서명/권한/CAS·응답 유실을 유지하며 화면에는 기존 입력 보존과 정확한 실패 이유가 남아야 한다.
4. **공용 증가·이미 초과한 계정의 복구**: 다른 사용자의 행동을 일괄 차단하거나 references/과거 이력을 조용히 생략하지 않는다. 전체 snapshot을 보존하는 분할 백업 등 복구 경로를 비교하고 구 백업 호환·빠진 조각·다른 판본 혼합·손상·명시 복원을 검증한다. 백업 내용 범위·보존 의미·비용이 달라지는 선택만 사용자 결정으로 올린다. 제품 한도·요금제를 지금 영구 확정하지 않는다.

**한 계정의 저장 직후 보장과 미래의 모든 백업 보장은 다른 조건이다.** 2–3만 완료한 뒤 4가 남으면 그 한계를 표시한다. compact inverse 적용이나 이번 재현 검사의 통과를 전체 백업 문제 해결로 올리지 않는다. M7-2의 독립 백업 사본·실제 명시 복원·일상 사용·실기기·미연결 콘텐츠도 그대로 남는다.

#### 이번 실행 결과와 변경 경계

| 검사 | 결과·근거 |
| --- | --- |
| 실제 migration SQL + rollback 후보 | 최종26/26 PASS,14 migration. 로컬 `output/alpha-m72-backup-write-gap/2026-09-23T13-26-04.366Z/result.json`. 메모리 DB·합성 Auth/Storage·단일 연결이며 실제 Supabase 권한/경합/성능 증거 아님 |
| 공개 문맥·사진·파일 포장 | `m72-backup-public-coupling.test.ts` 최종6/6 PASS, 실패/skip/cancel0. 실제 제품 함수·합성 자료이며 server seal 인증·브라우저·실자료 검사가 아님 |
| 새 도구 정적 검사 | JS 구문 검사 PASS, TS 명시1 entry strict 진단0 |
| 기존 npm 회귀 | 2255/2255 PASS, 실패/skip/cancel0, source 변경0. 로컬 `output/integrated-product-poc/npm-test-2026-09-23T13-24-17-938Z.json` |
| 문서·링크·skill 동기화 | docs:check PASS:4/4, local links6501. scoped closeout은 미추적 상위 폴더 축약 때문에 도구2개를 표시하지 않아 실제 파일을 별도로 검토 |
| 기존 통합/build 근거와 코드 대조 | 직전 통합2293의 제품 source569개와 현재 hash 동일, 추가/변경/삭제0. 이번 전체 통합·build는 재실행하지 않음: 제품 변경 없이 검사 도구·문서만 추가. 직전 PASS를 이번 실행 횟수에 넣지 않음 |
| 브라우저·실기기·관찰 사용자 | 이번 미실행. 화면/제품 변경 없음; 직전 전체 앱 재검증 미완료 상태 유지. 관찰 사용자0명 |

초기 SQL22검사 결과는 같은 상위 출력 폴더의 `2026-09-23T13-22-38.245Z`에 보존했다. 독립 검토에서 compact 판정의 SQL NULL 누락과 예산 내 신규 저장 양성 대조 누락을 찾아 보완한 뒤26검사를 다시 실행했다. 두 수를 합산하지 않는다. 새 TS fixture의 부정 type-guard assertion 때문에 발생한 `never` 타입 진단1건도 수정하고6검사·타입 검사를 재실행했다. 기존 결과를 삭제하거나 처음부터 완전했던 것처럼 표시하지 않는다.

이번 소유 파일은 새 검사 도구2개(`scripts/alpha/m72-backup-write-gap.mjs`, `m72-backup-public-coupling.test.ts`)와 이 원장·STATUS·전환 원장의 요약3개다. 제품 코드·migration·의존성·원격 DB·실계정·원본 백업 변경0이다. 메모리 DB 안에서만 생성한 합성 fixture를1회 이전 checkpoint로 되돌렸으며, 실제 이력을 지운 것이 아니다. 검사에 사용한 제품 import·migration·의존성 hash도 실행 전후 동일했다. commit·push·PR·merge·Preview·Production은 각각 미실행이다.

### 한도 실패 안내 후속 — 로컬 구현·모델/컴포넌트 검증 완료

**전체 앱 재검증은 미완료다.** 아래 모델·서버 fixture·격리 컴포넌트·회귀 통과와 구분한다. 원격 적용·실계정·배포를 실행하지 않았고 M7-2 전체도 미완료다.

문서 한도 조정 뒤, 편집 거절이 ‘해결하지 않은 변경’으로 표시되는 오류를 좁은 범위로 수정한다. 문서/owner 크기와 변경 이력 수 초과를 구분하고, 작업본·저장본 복원·출처 비교·서버 응답에서 한도 사유를 잃지 않게 한다. 실패 시 입력/기존 기록 불변, no-op/동일 요청 재시도, 잘못된 입력·위조·충돌의 기존 거절을 검사한다. 서버 응답을 잃은 요청의 확정/재시도 규칙은 변경하지 않는다.

현재 수치·저장 schema·replay·권한 검사는 그대로다. 기존 M7-2 목표의 하위 수정이므로 별도 spec/plan/tasks/qa 문서를 중복 생성하지 않는다. 순서는 원인/안내 정리 → 모델·전달 경로 구현 → 표적/브라우저/회귀 검사 → 이 원장에 결과 기록이다. 원격 compact-inverse migration은 별도 승인 전이며 실제001/002·운영 DB·배포를 변경하지 않는다. 장기100회 전체 계정 부하검사는 이번 완료 조건에 다시 넣지 않는다.

구현한 내용:

- 정상 owner에서 생성한 다음 문서 또는 owner JSON이 기존 한도를 넘으면 `document-capacity`, 변경 이력 수를 넘으면 기존 `history-capacity`로 구분한다. 원본 읽기·위조·불일치·replay 검증은 그대로 거절한다. 정상 후보에서는 추가 직렬화를 하지 않고, 검증 실패 때만 크기를 다시 확인한다.
- 작업본 변경, 구 저장본 복원, 원본 비교의 staging/선택/적용 경로에서 한도 오류를 기존 Program `limit`로 전달한다. 문서 크기를 비교 미해결로 잘못 안내하지 않는다.
- 실제 서버 handler의 semantic dispatch가 한도로 거절하면 쓰기 RPC를 호출하기 전에 `limit`로 응답한다. HTTP adapter와 UI controller가 사유를 보존한다. transient 진단은 복구 저장 schema에 넣지 않는다.
- 서버-only 확정 거절에서도 confirmed 계정은 유지하고 기존 draft 복구 절차를 유지한다. 앞선 응답을 잃은 재시도에서 한도 응답을 받아도 pending을 지우거나 미적용이라고 확정하지 않는다.
- 문서/이력 한도 안내에 입력의 별도 보관을 명시한다. 실제로 자동 정리하거나 새 사본을 만들지 않으며 계정·전체 백업 한도를 무제한으로 바꾸지 않는다.

이번 후속은 **native 후보의 문서/owner/이력 한도와 그 오류 전달** 범위다. 저장 후 계정30MB/전체 백업 가능성을 모든 writer에서 보장하는 preflight, 이미 큰 이력의 축소, 장기 성능과 실제 복원은 여전히 남는다. 새 오류 안내를 그 갭의 완료로 계산하지 않는다.

변경 파일: `native-creator-document.ts`·해당 contract, `creator-native-workspace.ts`, `creator-history.ts`, `creator-native-source-update.ts`·해당 contract·`creator-native-source-store.ts`, `alpha-creator/dispatch.ts`, `alpha-persistence/contract.ts`·`client.ts`, `alpha-sync/http-repository.ts`·`controller.ts`, `alpha-server/creator-command-handler.ts`, `ui-contract.ts`, `ProgramCreatorNativeContext.tsx`. 새 모델 테스트 `native-creator-capacity-errors.test.ts`, 기존 `alpha-server/creator-command-handler.test.ts`·`alpha-persistence/client.test.ts`·`alpha-sync/http-repository.test.ts`·`alpha-sync/creator-controller.test.ts`, 브라우저 도구 `scripts/alpha/m72-capacity-errors-browser.ts`·`m72-capacity-component-browser.ts` 및 이 원장·STATUS·전환 원장까지25개 경로에 이번 변경을 기록했다. 기존 dirty 파일의 다른 변경은 이번 소유로 승격하지 않는다.

서로 중복된 표적/전체 실행 수를 더하지 않는다. 첫 전체 앱 브라우저 시도는 기존3104 서버와 갱신된 build 산출물의 chunk 불일치로 hydration 전에 실패했다. 별도3000 시험 서버 시작도 도구 정책에 막혀 실행하지 못했다. 이를 우회하지 않고, 서버 프로세스가 필요 없는 메모리상 React 컴포넌트 검사로 범위를 나눴다. 컴포넌트의 첫 합성 도메인은 secure-context의 `crypto` 조건을 충족하지 않아 실패했고, 브라우저 요청을 메모리 HTML로만 응답하는 localhost fixture로 수정해 통과했다. 첫 실패 근거는 보존하며 전체 앱 문제가 해결된 것으로 판정하지 않는다.

| 한도 안내 후속 검사 | 현재 실행 결과 | 근거·한계 |
| --- | --- | --- |
| 문서/owner/이력·전이 경계 | 7/7 PASS | `native-creator-capacity-errors.test.ts`: 합성 near4M 문서, 정상 restore 이력의 owner16M 초과,128개 UI journal, no-op/재시도·위조·stale·거절 시 입력/account/revision 동일 |
| 모델·출처 비교·복원·캐시 회귀 | 119/119 PASS | 해당 native/document/absence/source/workspace/history/cache 표적 파일,86.42초. 뒤의 전체 통합과 중복 집계하지 않음 |
| 서버/HTTP/client/controller | 35/35 PASS | 서버 한도 거절의 쓰기 RPC0, 응답 이유 유지, confirmed 불변·draft 보존, 불명확한 재시도 pending 유지. 실제 Supabase 서버 호출 아님 |
| 기존 npm 회귀 | 2255/2255 PASS | 로컬 `output/integrated-product-poc/npm-test-2026-09-23T11-59-37-704Z.json`, 실행 중 source 변경0 |
| 제품 타입 | 509 entry·진단0 | 로컬 `targeted-types-2026-09-23T12-01-49-750Z.json`, source569개·실행 중 변경0 |
| 새 브라우저 도구 타입 | 2 entry·진단0 | 명시 rootNames strict/noEmit. 최초 전체 앱 runner의 존재하지 않는 fixture 진단 필드 참조1건을 자체 request observer로 수정한 뒤 재검사. 전체 앱 실행 통과를 뜻하지 않음 |
| production build | PASS | 로컬 `build-2026-09-23T11-59-27-008Z.json`, 실행 중 source 변경0 |
| 전체 통합 회귀 | 235개 파일·2293/2293 PASS | 로컬 `new-tests-2026-09-23T12-00-32-179Z.json`, 실패/skip/cancel0·실행 중 source 변경0 |
| 실제 앱 화면 | 미완료 | 구3104 서버의 chunk 불일치, 별도3000 시험 서버 시작은 도구 정책에 막혀 실행하지 못함. 기존 서버를 강제로 재시작하거나 다른 실행 수단으로 우회하지 않음 |
| 격리 편집 컴포넌트 브라우저 | 56/56 PASS | 로컬 `output/playwright/alpha-m72-capacity-component/2026-09-23T12-13-42-437Z/result.json`. 실제 React·module CSS, Chromium1개·격리 context2개, 서버 실행0. 실제 앱 전체·로그인·HTTP·DB 검증과 별도 |
| 문서·링크·skill 동기화 | 4/4 및 docs:check PASS | 로컬 `docs-2026-09-23T12-18-30-330Z.json`; 표 결과 추가 후 동일 검사 재실행 |

직전400만 자 빌드와 이번 제품 source569개의 hash를 비교해 수정19개(제품15·기존 테스트4), 신규 테스트1개, 삭제0을 확인했다. 운영 `/my`·기존 운영 writer·Supabase migration 파일 변경0이다. 변경19개에는 이미 dirty였던 파일의 이번 오류 전달 수정만 포함하며, 그 파일들의 과거 다른 diff를 이번 작업으로 주장하지 않는다. 실제 DB 전후 조회를 수행한 증거로 대신하지 않는다.

전체 통합 종료 후569개 source를 다시 hash 대조해 실행본과 변경0·삭제0을 확인했다. scoped closeout과 실제 diff를 검토했으며, 미추적 상위 디렉터리 축약으로 누락되는 alpha 파일은 정확한 경로와 source hash 목록으로 따로 확인했다. 독립 코드 검토에서 이번 수정의 신규 P1/P2는 없었다. 권한/RLS/SQL 변경은 없으며 [Supabase Data API 보안 문서](https://supabase.com/docs/guides/api/securing-your-api)의 인증·객체 권한·행 권한 구분을 기준으로 기존 경계를 확인했다. 원격 권한을 새로 감사한 결과는 아니다.

화면별 판정은375×812·390×844·844×390·1024×768·1440×900에서 **이력 초과**와 **정상 비교 후 합성 한도 응답** 두 상태 모두 PASS다. 메시지 가림·가로 넘침0, 입력/owner 보존, 첫 상태 callback0회·두 번째1회이며 실제 저장은0이다. console/page error0, network0, Storage set/remove/clear0 및 합성 `flow:sentinel` bytes 동일을 확인했다. 대표390px 두 화면을 직접 열어 문구와 입력을 확인했다. 거대 문서/owner 경계는 앞의 모델7개로 검사했으며 이 화면56개에 포함하지 않는다. 전체 앱의 글꼴·공통 프레임이나 실기기 사용성을 평가한 것은 아니다.

이번 후속의 실제 Android Chrome·iOS Safari 검사는 미실행, 관찰 사용자 연구0명이다. commit·push·PR·merge·Preview·Production은 각각 미실행이다. 실제001/002·원격 DEV·운영 DB 변경0이며 원본 백업/자격증명 파일을 읽거나 수정하지 않았다. 준비된 compact-inverse SQL의 SHA256은 기존 `42cf78c6e1fb4af9885785d5a90fc25a6a227e8b9682fdb350c1f03d39d2b102`와 같고 원격 미적용 상태를 유지한다.

다음 실행 경계는 **사용자가 DEV 적용/별도 QA 계정 사용을 승인하면**, 현재 DB 판본 확인 → additive migration → 실제 writer/Undo/백업 확인이다. 실제001/002를 합성 QA 대상으로 사용하거나 과거 ledger를 다시 쓰지 않는다. 독립 백업 사본·실제 명시 복원·일상 사용·실기기·미연결166개/Map과 전체 백업 여유는 기존 M7-2 잔여로 남긴다. 이번 오류 안내의 완료가 그 항목들의 완료나 배포 승인으로 바뀌지 않는다.

**9/23 후속 승인: 문서 한도200만→400만 자 조정과 한도 경계·저장·복구·회귀 검증을 완료했다.** 사용자가 “제한이 크리티컬한거 아니면 늘려서 적당히 해”라고 요청했다. 한도 감사 결과 정합성·권한 규칙이 아닌 교체 가능한 자원 guard여서, 구조 개편을 우선하던 순서를 바꿔 제한적으로 확대했다. 현재 수치는 제품의 영구 용량 정책이 아니다. 원격 DB·실계정은 변경하지 않았다. **전체 계정 복사본100회 연속 시험은70회 checkpoint 이후 중단했고 미완료로 남긴다.** 공개100회 준비 문서의 저장·재열기·백업 통과와 혼동하지 않는다.

이하 이전 판정: 신규 이력 중복 축소와 검증 캐시 v3는 로컬 구현·회귀 검증을 마쳤으나, 같은 문서100회는 기존200만 자에서 미충족이었다. 이전 실패·중단 결과를 새 한도로 통과한 것처럼 다시 쓰지 않는다.

### 승인된 한도 조정 계획

1. [x] 정합성/권한/replay 규칙 및 별도 source·recovery·SQL·전송 한도를 읽기 전용으로 대조.
2. [x] `NATIVE_CREATOR_DOCUMENT_JSON_LIMIT`만 `2_000_000`→`4_000_000`으로 확대. JSON UTF-16 code unit 수이며 UTF-8 bytes와 구분한다.
3. [x] 새 경계 테스트9/9: 공개 vendor100회 문서·saved reader·owner, 정확400만/400만+1, Unicode, 변조/잘못된 DTO, 원문100001자 거절, 실제 UI action128회·129회 거절/변경0.
4. [ ] 원본 백업의 메모리 복사본에서 실제 dispatcher100회 편집·native Undo/재적용·compact inverse/redo·reload/백업 왕복 검사. **미완료**:70회 편집(4반입+작업본 포함 신규75전이) checkpoint까지 확인한 뒤28분47초에 중단했다. 마지막100회 Undo/백업 구간은 실행하지 않았다. 이 무거운 전체 계정 부하검사를 한도 조정 완료의 필수 조건에서 분리한다.
5. [x] 현재400만 자의 실제 문서 경계 fixture, 회귀·타입·build·문서 검사, 최종 결과 기록.

owner1,600만 자·actions128·원문10만 자·계정/백업30MB·캐시 예산은 그대로다. 같은 document 상수를 쓰는 saved-source `documentJson`과 catalog `contentJson/documentJson`도400만 자를 읽는다. source identity·shape·원문 대조·journal replay·owner/session·CAS 검증은 생략하지 않는다. 기존 이력/문서나 사용자 데이터를 다시 쓰거나 삭제하지 않는다.

별도200만 자 한도를 가진 구 D2 history/recovery **가져오기** codec은 그대로이며, 새2–4M 문서를 구 D2 저장 형식으로 역변환하는 호환성을 주장하지 않는다. 신규 Program saved context는 native validator를 사용한다. 구200만 자 클라이언트는 새 대형 문서를 거절하므로 향후 발행 시 client/server 버전 정렬과 열린 구버전 탭 처리가 필요하다. 이번 승인에는 배포·원격 migration·요금제 변경이 포함되지 않는다.

복제·재생·직렬화 비용은 여전히 문서 크기와 함께 증가한다.100회 성공은 해당 fixture의 증거이지 모든 문서100회나 무제한 사용 보장이 아니다. 구조적 중복 축소는 장기 사용 과제로 남기되, 임시 한도 확대만으로 현재 시험이 가능하면 이를 이번 단계의 선행 조건으로 고집하지 않는다.

### 400만 자 후속 검증 기록

| 검사 | 결과 | 근거·범위 |
| --- | --- | --- |
| 신규 경계 테스트 | 9/9 PASS, heap768MB,34.01초 | `native-creator-document-limits.test.ts`; 합성 padding과 정상 공개 문서를 구분 |
| 공개 vendor 문서의 한도 도달 | 128회3,992,185자 유효,129회4,022,897자 거절 | 로컬 `output/alpha-m72-compact-inverse/native-document-limit-4000000.json`; owner action 한도 시험 아님 |
| 실제 dispatcher 문서 경계 | 성공1·거절1·변경0·마지막 상태 백업 왕복 PASS | 로컬 `native-boundary-4000000.json`; vendor127회 준비, 실제 성공 owner action1개 |
| 공개100회 준비 문서의 명시 저장 | 저장·JSON reload·닫기·재열기·백업 왕복 PASS | 로컬 `large-document-save-4000000-catalog-journal.json`; 정상 원본과 대응하는 action100개를 최종 replay 검증한 fixture, 실제 계정 전이는3회 |
| native Undo oracle | 100→Undo의 canonical99 동일, 재적용 후 canonical100 동일, 원문 불변 | inline 메모리 검사, heap512MB. 최종3,193,608자; 실제 계정 저장 시험과 구분 |
| 기존 npm 회귀 | 2255/2255 PASS | `output/integrated-product-poc/npm-test-2026-09-23T11-15-23-166Z.json` |
| 전체 통합 회귀 | 234개 파일·2282/2282 PASS, 실패/skip/cancel0 | `output/integrated-product-poc/new-tests-2026-09-23T11-16-38-129Z.json`; 실행 중 source 변경0 |
| 제품 타입 | 508 entry·진단0·source 변경0 | `output/integrated-product-poc/targeted-types-2026-09-23T11-17-41-242Z.json` |
| 도구 타입 | boundary/limit2개 및 save/simulation2개, 각각 진단0 | 명시 rootNames의 strict/noEmit 검사. 전체 프로젝트 include 사용 안 함 |
| Production build | PASS, 실행 중 source 변경0 | `output/integrated-product-poc/build-2026-09-23T11-17-42-437Z.json` |
| 전체 계정 복사본100회 연속 시험 | 미완료·중단, 마지막 확인70회/신규75전이 | 로컬 `output/alpha-m72-compact-inverse/simulation-100-edits-interrupted.json`; 완료 결과가 아닌 출력 근거의 수동 종료 기록 |

전체 계정 복사본 시험은70회까지 각 전이의 입력 불변·계정 검증·compact inverse/redo의 전체 space 복원을 확인했다.70회 checkpoint의 백업 입력 크기는16,451,561bytes지만 **해당 최종 상태의 백업 생성/왕복은 실행하지 않았다**. 원래100회 후 실행하려던 native Undo/재적용도 이 실행에서는 미실행이다. 원본 파일은 중단 후 별도 SHA256 검사에서 기존 값과 같았다.28분47초에는 매 전이의 전체 hash·여러 검증·역변환 비용이 포함되므로 UI 응답시간으로 환산하지 않는다. 향후 성능 판단은 실제 호출 구간과 중복 검증 비용을 분리해 측정하며, 이 시험의 미완료를100회 준비 문서 검사로 채워 넣지 않는다.

공개100회 준비 문서의 실제 catalog 경로는 input3,731,546bytes→saved account11,194,886bytes였고, 합성 seal을 포함한 백업18,659,995bytes·압축2,425,739bytes가 정확히 왕복했다. 이 fixture는 원래 작은 catalog source와 정상100개 journal을 보존하고 replay로 검증한다.100번의 계정 쓰기를 실행한 것으로 집계하지 않는다. 실제 사용자 계정/원본/원격 DB 접근은0이다.

앞서 별도로 검사한 **큰 saved source 자체를100회 편집 문서로 만든 합성 fixture**는 작업본까지는 유효했지만 저장할 때 account34,763,753bytes가 되어30MB에서 거절됐다. 하위 `executeAlphaCreatorIntent` 저장은 성공했고, 결과 `validateAlphaAccount`가 false인 것을 직접 확인했다. history codec의200만 자 제한이 그 실패 원인은 아니었다. 실패 근거 `large-document-save-4000000.json`과 별도 진단 결과는 보존한다. 이 사례를 통과시키려고 계정30MB를 확대하지 않았다. 문서400만 자 허용이 전체 계정 저장 가능성을 보장하지 않는다는 근거다.

직전 빌드와 비교한 제품 source568개는 계약 상수 파일1개 변경·새 경계 테스트1개 추가·삭제0이다. 한도 상수 외 제품 동작은 바꾸지 않았고, 기존 catalog source 관련 dirty 코드는 그대로 보존했다. 이번 후속의 정확한 변경 범위는 계약·새 한도 테스트·검사 도구4개·기존 원장3개, 총9개 경로다. closeout 도구가 축약한 미추적 폴더 표와 별도로 이9개 경로를 읽고 검토했다.

후속 재현은 `node --import tsx --test lib/flow/integrated-poc/native-creator-document-limits.test.ts`, `node --max-old-space-size=768 --import tsx scripts/alpha/m72-large-document-save.ts --catalog-journal`, `node --max-old-space-size=1536 --import tsx scripts/alpha/m72-compact-inverse-simulation.ts --edits=100`을 사용한다. 첫 두 검사는 공개 fixture이며 마지막은 지정된 로컬 백업의 SHA 일치가 필요하다. 이미 존재하는 측정 결과는 덮어쓰지 않는다.

아래는 **200만 자 한도 당시**의 구현·검증 이력이며, 후속400만 자의 검사 수와 합산하지 않는다.

## 이번 범위

2026-09-23 사용자 계속 진행 요청으로 [용량 측정](alpha-m7-2-backup-capacity.md)의 첫 개선을 구현한다. 기존 큰 목표 M7-2는 유지한다. 이 원장은 기존 승인 프로그램의 하위 변경 계약·계획·QA를 함께 관리하므로 별도 spec/plan/tasks/qa 네 문서를 중복 생성하지 않는다.

- 기존 이력/원문/현재 계정을 다시 쓰거나 지우지 않는다. 향후 creator 거래에서 생성하는 inverse만 더 작은 versioned 표현을 선택한다.
- UI·writer 외부 명령·서명·owner·session·CAS·마지막 거래 Undo·재시도 계약은 유지한다. 클라이언트는 compact patch를 제출할 수 없다.
- 구 full-field inverse와 새 형식을 함께 읽는다. 백업의 과거 operations는 여전히 보존 증거이며 서버 이력으로 재실행하지 않는다.
- 제품 30MB·보존기간·요금제 변경, 실제001/002 부하/복원, 원격 migration/설정 적용, commit/push/PR/merge/배포는 포함하지 않는다. 원격 DEV 적용은 로컬 검증 뒤 별도 실행 경계로 남긴다.
- 누적 시험에서 공개 예제의 작은 검증 캐시 상한 문제를 측정한 뒤, 기존 검증·재생·LRU·변조 차단을 유지하는 캐시 v3도 범위에 추가했다. entry16MiB/total32MiB는 교체 가능한 메모리 계산 예산이며 저장 용량·문서 허용 크기·보존 정책이 아니다. 실제 heap 상한으로 표현하지 않는다.

## 계획

1. [x] 현재 writer/Undo/backup 경계와 직전 용량 재현 기준 확인.
2. [x] 순수 reference codec·악성/경계/property/구형 호환 테스트.
3. [x] additive 로컬 migration에서 DB 내부 inverse 생성·적용만 연결. 공개 grants/명령 schema 확대 없음.
4. [x] 로컬 WASM PostgreSQL에서 실제 SQL·권한·서명·CAS·재시도·Undo/Redo·실패 원자성 검사. 실제 Supabase 서버 검증과 구분.
   - [x] 추가로 발견한 반복 검증 지연을 공개 자료로 대조하고 캐시의 메모리 예산만 조정. 변조·과대 입력·개수/byte LRU 검사는 유지/추가.
5. [ ] 원본 백업의 메모리 복사본에 4개 콘텐츠 추가·작업본·100회 편집을 재현하고 백업 왕복·기존 이력 불변·새 이력 크기를 비교. **100회는 미충족**: 아래 문서 한도에서 먼저 거절된다.
   - [x] 공개 fixture로 한도 직전 성공·직후 거절/변경0·마지막 유효 상태의 백업 왕복을 별도 확인. 100회 누적 성공과 구분.
   - [x] 원본 백업 복사본의 4반입·작업본 열기·10회 편집(총15전이)과 백업 왕복을 별도 완료. 이전75개 이력·원본 파일·개인 기록 불변.
6. [x] 관련/전체 회귀·타입·build·검토·결과 기록. 미적용 DB와 남은 백업 경로/성능 개선을 분리.

## 새 형식 계약

ledger의 `inverse` 최상위 배열은 유지한다. `creatorWorkspace`의 before/after가 모두 객체일 때만 아래 객체를 허용한다. 다른 필드, workspace 생성/삭제/null/타입 전환, 작은 전체 교체는 구형 `{field,present,value?}`를 유지한다.

`{field:'creatorWorkspace',schema:'flowme-alpha-object-inverse/1',changes:[...]}`

- 객체 추가/삭제/값 변경과 같은 길이 배열 원소의 변경은 `set`/`remove` + 문자열 path로 표현한다. `remove`는 객체 키만 허용한다.
- 배열 길이가 바뀌면 공통 prefix/suffix를 보존하는 `splice` 하나를 사용한다. append된 큰 이력 배열의 이전 전체를 다시 저장하지 않기 위해 필요하다. `expectedLength`, `index`, `remove`, `values`를 검증한다. 같은 배열의 다른 하위 patch와는 함께 사용할 수 없다.
- path는 빈 경로·위험 key·중복/상하위 중첩을 거절한다. 배열 index는 canonical 비음수 정수이며 객체의 숫자 문자열 key와 구분한다. 빠진 parent를 자동 생성하거나 범위 밖 index를 append하지 않는다.
- strict JSON·개수/깊이 상한을 적용하고 각 연산은 실제 변경이어야 한다. 전체 적용을 성공한 후에만 account/ledger를 변경한다. compact가 더 크거나 생성 복잡도 상한에 닿으면 구형 전체 값으로 fallback한다.
- DB가 잠근 before/after에서 생성한다. Undo의 Undo도 동일하게 생성한다. 신규 helper는 private schema + invoker + 빈 search_path + PUBLIC/anon/authenticated EXECUTE revoke로 둔다.

## 완료 조건과 제외

손실 없는 역변환, 구형과 혼합 이력의 백업 호환, 현재 데이터/과거 rows 불변, 100회 작은 편집 후 현 한도에서 백업 가능성을 확인하는 것이 당초 조건이다. 이 중 **100회는 미충족으로 남긴다**. 다른 writer·사진/공유 데이터의 무한 증가까지 해결됐다고 주장하지 않는다. 이 개선으로 모든 미래 저장의 백업 가능성이 보장되는 것은 아니므로 native 문서 이력 증가, 저장 전 전체 백업 여유 검사/분할 백업과 브라우저 큰 작업 분리는 후속 범위다.

## 구현 파일과 역할

| 파일 | 역할 |
| --- | --- |
| `supabase/migrations/20260923095533_flowme_alpha_m72_compact_creator_inverse.sql` | DB 내부 diff/apply/legacy 선택과 기존 creator writer의 새 inverse 생성·Undo 해석. 원격 미적용 |
| `lib/flow/integrated-poc/alpha-creator/compact-inverse.ts` | DB 계약을 독립 대조하는 순수 TypeScript reference. UI 명령이나 클라이언트 쓰기 API로 연결하지 않음 |
| `lib/flow/integrated-poc/alpha-creator/compact-inverse.test.ts` | 구조·실패 원자성·구형 호환·임의 중첩 데이터 역변환 |
| `scripts/alpha/m72-inverse-pg-runtime.mjs` | 격리 WASM PostgreSQL + Auth/Storage 최소 의존성 fixture |
| `scripts/alpha/m72-compact-inverse-pg.test.mjs` | 실제 migration·서명 writer·권한·CAS·Undo·실패 rollback·TS/SQL 대조 |
| `scripts/alpha/m72-compact-inverse-simulation.ts` | 실제 백업을 읽어 메모리에서 4반입·작업본 열기·지정 횟수의 실제 dispatcher 실행. 거절 시에도 마지막 유효 상태의 백업을 검사하고 targetReached:false/exit1로 기록 |
| `scripts/alpha/m72-compact-inverse-pg-capacity.ts` | 실제 백업의 메모리 복사본 8전이에서 DB가 만든 inverse·역변환·JSONB 표현 크기 대조 |
| `lib/flow/integrated-poc/native-owner-replay-cache.ts` 및 테스트 | 저장 데이터와 허용 크기를 바꾸지 않는 bounded validation cache v3, 큰 항목 hit·변조·byte LRU 검사 |
| `scripts/alpha/m72-native-replay-probe.ts` | 공개 단일 문서 30편집의 검증 시간·캐시 계산 크기 측정; UI/실계정 검사가 아님 |
| `scripts/alpha/m72-native-document-limit.ts` | 공개 vendor 문서의 JSON 문자 제한 도달 시점 검사. 실제 계정 writer와 구분 |
| `scripts/alpha/m72-native-boundary.ts` | 정상 public saved-source fixture로 실제 dispatcher의 문서 한도 직전/직후와 백업 왕복 검사 |

DB는 `jsonb::text`의 실제 UTF-8 크기, reference는 canonical JSON의 크기로 compact/full-field를 선택한다. 공백 표현 때문에 두 형식의 선택이 바뀌는 경계가 있을 수 있다. 손실 없는 결과와 각 표현에서 더 작은 값 선택이 계약이며, 서로 다른 serializer의 byte 수가 동일하다고 주장하지 않는다.

## 검사 범위와 재현

신규 DB 형식은 클라이언트가 보낸 forward patch에서 거절한다. 이전 전체 값 이력은 그대로 읽으며 새 Undo 거래의 inverse도 같은 생성기를 통과한다. 경로·배열·중첩 충돌·추가 필드·no-op 검사뿐 아니라 적용 중 두 번째 patch 실패와 account UPDATE 뒤 ledger INSERT 실패를 주입해 account/ledger/undone의 원자성을 확인한다.

순수 테스트의 실행 단위 37개 중 1개는 seed 고정 중첩 데이터 300쌍을 검사한다. 300을 별도 테스트 300개로 합산하지 않는다. SQL 검사의 49쌍 역변환과 49쌍 TS 대조도 각각 표시된 검사 단위 수를 따른다.

로컬 SQL 런타임은 PGlite 0.5.8 / PostgreSQL 18.3이며 공식 [PGlite 확장 문서](https://pglite.dev/extensions/)의 pgcrypto로 Node와 HMAC/digest를 대조한다. [PostgreSQL JSON 함수](https://www.postgresql.org/docs/current/functions-json.html)의 `jsonb_set`은 없는 parent에서 조용히 무시하거나 배열 범위 밖에서 추가할 수 있으므로 patch 적용 전 parent·index를 직접 검사한다. helper는 invoker·빈 search_path·직접 실행권한 차단으로 둔다.

깨끗한 checkout에서 SQL 검사를 재현하려면 제품 의존성과 별도로 다음 로컬 검증 의존성이 필요하다. root package/lock은 바꾸지 않는다.

```text
npm.cmd install --prefix output/alpha-m72-inverse-runtime --ignore-scripts --no-audit --no-fund @electric-sql/pglite@0.5.8
node scripts/alpha/m72-inverse-pg-runtime.mjs
node scripts/alpha/m72-compact-inverse-pg.test.mjs
node --import tsx --test lib/flow/integrated-poc/alpha-creator/compact-inverse.test.ts
node --max-old-space-size=1536 --import tsx scripts/alpha/m72-compact-inverse-simulation.ts --edits=10
node --max-old-space-size=1536 --import tsx scripts/alpha/m72-compact-inverse-pg-capacity.ts
node --max-old-space-size=1536 --import tsx scripts/alpha/m72-native-document-limit.ts
node --max-old-space-size=1536 --import tsx scripts/alpha/m72-native-boundary.ts
```

`simulation`과 `pg-capacity`는 스크립트에 지정된 로컬 원본 백업과 정확한 SHA256이 있어야 한다. 원본·전체 계정·백업 내용을 출력하지 않으며 결과에는 수치·hash·boolean만 저장한다. 원본 백업이 없는 공개 checkout에서 실행됐다고 간주하지 않는다. `simulation`의 기본 목표는100회이며 `--edits=1..100`으로 별도 목표를 명시한다.10회 실행은100회 충족 증거가 아니다. 결과 파일은 횟수별로 구분하며 같은 파일을 덮어쓰지 않는다.

Auth/Storage fixture는 실제 Supabase API가 아니다. JWT 인증, 실제 서버 Postgres 버전, 다중 연결 lock 대기·재검사 타이밍, 실제 두 계정·실기기 검증은 미실행이다. 시뮬레이션은 같은 작업본의 첫 Item 제목을 편집한다.100개 문서의 명시 저장이나 사진·공유·Map·모든 콘텐츠 유형의 누적을 검증한 것은 아니다. 파일 codec 포장을 위한 synthetic seal은 실제 서버의 원본 서명을 인증하지 않는다.

## 발견한 실패와 수정

- 로컬 SQL 검사에서 splice의 JSONB 연결 연산자 우선순위 결함을 발견해 괄호로 수정하고 통합 검사를 다시 통과했다.
- 독립 코드 검토에서 시뮬레이션이 파일 codec에 sealed wrapper 대신 backup 본체를 전달하는 결함을 발견했다. 진행 중 시뮬레이션을 중단하고 synthetic sealed wrapper를 추가해 재실행한다. 실제 제품·DB 오류나 사용자 데이터 손실은 아니며, 중단 실행을 100회 완료로 집계하지 않는다.
- 누적100회 시험은 기존 캐시에서40회 checkpoint까지 역변환을 통과했으나 실행이 길어졌다. 공개 probe에서 작은 캐시 상한을 넘는 owner의 반복 검증 지연을 확인해 캐시를 개선하고 다시 시작했다. 최종 코드 실행도40회 checkpoint까지 진행했지만 별도 문서 한도 검사에서64회 불가를 확인해 중단했다. 이 두 중단 실행은100회 완료나 백업 왕복 완료로 세지 않으며 서로 횟수를 더하지 않는다.
- 한도 오류를 예상한 시뮬레이션 도구는 거절된 명령의 입력 불변, 마지막 성공 상태의 백업, 요청/성공 횟수를 따로 기록하도록 보완했다. 명령 거절을 PASS로 바꾸지 않고 exit1로 종료한다.
- 세션 종료 도구는 미추적 상위 폴더를 축약해 신규 코드 파일 일부를 scope 표에서 놓쳤다. `git status --untracked-files=all`의 정확한 신규11개 파일 및 캐시2개·기존 원장2개 변경과 코드/SQL 원문을 별도로 검토한다. 도구가 축약한 scope 표만을 전체 검증 범위로 사용하지 않는다.

## 검증 기록

아래는 캐시 v3를 포함한 최종 제품 코드의 실행 근거다. 이전 캐시의 통합2271·npm2255·build 결과는 별도 로컬 파일로 보존하고 최종 판정에 섞어 합산하지 않는다.

아래 output 경로는 로컬 전용 원본 근거다. 공개 checkout에 존재한다고 가정하지 않는다. 같은 테스트를 표적·전체에서 다시 실행한 수는 독립 사례 수로 더하지 않는다.

| 검사 | 실제 실행 수·결과 | 근거 |
| --- | --- | --- |
| 순수 inverse | 37/37, 내부 seed 고정 300쌍 | `compact-inverse.test.ts` 직접 실행; 전체 통합에도 포함 |
| inverse + 캐시 표적 | 45/45, 큰 항목 hit·변조·byte LRU 포함 | 표적 직접 실행; 전체 통합에도 포함 |
| WASM PostgreSQL 엔진/암호/RLS | 8/8 | `output/alpha-m72-inverse-runtime/probe-result.json` |
| 실제 SQL 통합·업그레이드 | 162/162 | `output/alpha-m72-inverse-runtime/compact-inverse-sql-result.json` |
| 실자료 복사본 → 실제 PG inverse | 8전이 PASS, 생성 TS대조8/8·SQL 역변환8/8 | `output/alpha-m72-compact-inverse/pg-capacity.json` |
| 기존 npm 회귀 | 2255/2255 | `output/integrated-product-poc/npm-test-2026-09-23T10-43-23-828Z.json` |
| 타입 | 507 entry, 진단0; 수집 도구10/10 | `output/integrated-product-poc/targeted-types-2026-09-23T10-42-24-605Z.json` |
| 신규/수정 TS 검사 도구 | 지정5개 entry 및 전이 의존성 진단0 | simulation·pg-capacity·native-replay-probe·native-document-limit·native-boundary만 rootNames로 strict/noEmit 실행 |
| Production build | PASS, static18 | `output/integrated-product-poc/build-2026-09-23T10-52-27-565Z.json` |
| 전체 통합 | 233개 파일·2273/2273, 실패/skip/cancel0 | `output/integrated-product-poc/new-tests-2026-09-23T10-41-02-007Z.json` |
| 문서·링크·동기화 | 검사4/4, 문서 검사 PASS | `output/integrated-product-poc/docs-2026-09-23T11-07-11-567Z.json`; 결과 행 추가 후 동일 검사 재실행 |
| 100회 실제 편집 메모리 시뮬레이션 | 미충족·중단. 문서 한도 때문에100회 불가 | 최종 실행은40회 checkpoint까지, 백업 왕복 완료 아님 |
| 실자료 복사본10회 편집 | 4반입+작업본+10편집, 총15전이·inverse/redo15쌍·백업 왕복 PASS | `output/alpha-m72-compact-inverse/simulation-10-edits.json` |
| 공개 문서 크기 경계 | 0~63 유효,64번째2,026,753자로 거절 | `output/alpha-m72-compact-inverse/native-document-limit.json` |
| 실제 dispatcher 경계 fixture | 성공1·거절1·거절 mutation0·마지막 유효 상태 백업 왕복 PASS | `output/alpha-m72-compact-inverse/native-boundary.json` |

업그레이드 검사는 별도 메모리 DB에 이전13개 migration을 먼저 적용한 뒤 구 writer로 실제 유효 거래2건을 생성한다. 새 migration 직후 account/ledger가 동일한지, 새 writer에서 구형 마지막 거래를 Undo할 수 있는지, 다음 편집부터 compact 이력이 생기는지 대조했다. 기존 이력을 수동으로 델타로 재작성하지 않는다. 신규 migration SHA256: `42cf78c6e1fb4af9885785d5a90fc25a6a227e8b9682fdb350c1f03d39d2b102`.

실자료의 메모리 복사본으로 별도 PostgreSQL 검사도 수행했다. 4반입·작업본 열기·이름 변경3회에서 DB 생성 compact가 reference와 같았고 실제 SQL 역변환8회가 모두 원상복구됐다. 최종 JSON 입력13,892,703bytes, PostgreSQL `jsonb::text` 표현14,151,069bytes로 두 측정 모두 현재30MB 안이다. 후자는 실제 preservation RPC의 전체 응답/파일 크기가 아니라 같은 입력의 DB 직렬화 비교다. request/draft ID와 제목이 100회 시뮬레이션과 달라 소량 byte 차이가 있으며 이를 같은 byte 데이터라고 다루지 않는다.

별도의 실제 백업 복사본10회 편집은 총15전이 모두 성공했다. 이전75개 operations와 원본 파일·원본 객체·references·creator 외 개인 데이터는 그대로였다. 추가 inverse15개의 합계는 구 full-field 비교65,735,425bytes에서430,213bytes로99.35% 줄었다. **기존75개 이력이 줄어든 수치가 아니다.** 최종 백업 입력은 구 형식 비교79,464,771bytes에 비해14,159,559bytes였다. 실제 생성한 backup은14,159,811bytes, 압축 파일은2,089,471bytes이며 decode/validate 후 전체 canonical 값이 같았다. 파일을 실제 계정에 복원한 시험은 아니다. 전체115.494초에는 모든 hash·15쌍 inverse/redo·백업5.634초를 포함하며 UI 응답시간으로 해석하지 않는다. 관측 peak RSS680,566,784bytes 역시 이 Node 검증 프로세스의 값이다.

독립 읽기 전용 코드 검토에서 새 P1/P2는 없었다. 시뮬레이션의 명령 거절과 백업 검증 실패는 구분한다. 후자는 일반 실패/exit1로 끝나며 모든 거절 상황에서 백업이 보장된다고 주장하지 않는다.

최종 제품 source567개의 SHA256을 직전 기준 `npm-test-2026-09-23T09-45-18-253Z.json`의564개와 대조했다. 캐시 구현/테스트2개 수정·삭제0·reference/순수 테스트/신규 migration3개 추가다. 최종 회귀 때와 현재 파일의 hash 차이는0이다. 기본 `/my`, 기존 운영 writer 및 저장 key 구현은 변경하지 않는다. 브라우저에 접속하지 않았으므로 이번 실브라우저 localStorage 전후 byte 검사를 실행했다고 주장하지 않는다. 원격 DB 호출0, 파일 원본 SHA 대조, 메모리 old operations의 canonical hash 대조, 합성 DB의 upgrade 전후 row 대조를 각각 근거로 구분한다.

### 미충족: 문서 자체의 누적 이력 크기

공개 `home-cafe-daily`에서 같은 첫 Item 이름을 정상 vendor API로 변경한 JSON 문서를 매번 검사했다.63회는1,996,045자,64회는2,026,753자라 기존 `NATIVE_CREATOR_DOCUMENT_JSON_LIMIT=2,000,000`을 넘는다. 이 제한은 **문자 수**이며30MB 백업 한도나 캐시32MiB 예산과 다른 경계다. action128회 제한보다 먼저 도달한다. 이때문에 compact inverse만으로100회 장기 편집이 해결됐다고 판정할 수 없다.

별도 공개 경계 fixture는 vendor62회 문서를 정상 saved native source로 감싸 owner를 생성했다. source와 document는 일치하고 owner actions는 생성 시0이다. 이 fixture에서 실제 dispatcher63번째는 성공,64번째는 `unresolved`로 거절됐고 account·operations hash가 같았다. 마지막 유효 상태의 backup encode/decode/validate도 동일 결과로 왕복했다(압축935,558bytes, synthetic seal). 이는 **실제 dispatcher 성공1회·거절1회**이지62회 계정 저장이나63회 writer 누적 성공을 증명하지 않는다. 기존 owner의 action history를 삭제한 것이 아니다.

다음 기술 과제는 문서 내부의 누적 snapshot/history와 owner의 재생 이력을 구분해, 손실 없이 중복을 줄이는 versioned 표현을 검토하는 것이다. 이전 문서·identity·원문·명시 저장 판본·Undo·계정 간 동기화·백업의 호환이 필수다. 문서 한도 확대, 과거 이력 삭제, 임의 checkpoint로 과거를 버리는 방식은 승인하지 않았다. 거절 사유가 일반 `unresolved`로 노출되는 점도 용량 부족을 이해할 수 있는 안내로 개선할 여지가 있다. UI 문구는 이번에 바꾸지 않았다.

### 반복 검증 지연 측정과 캐시 v3

공개 `home-cafe-daily`의 단일 native owner를 정상 API로30회 편집했다. 기존 entry1MiB/total2MiB와 메모리에서만 치환한 후보 entry16MiB/total32MiB를 비교했다. owner 내용·크기·캐시 key+result 계산 크기는 같고 다른 검증 코드는 그대로였다. 30회 시 owner UTF-8은1,185,759bytes, 캐시 계산 크기는4,015,468bytes였다.

| 누적 편집 | 기존 같은 owner 검증3회 범위 | 후보 같은 owner 검증3회 범위 |
| --- | --- | --- |
| 0 | 1.812–2.064ms | 1.427–2.281ms |
| 10 | 622.006–716.303ms | 16.060–21.732ms |
| 20 | 1,958.298–2,040.568ms | 24.911–26.235ms |
| 30 | 3,756.719–4,167.631ms | 40.055–40.484ms |

30회 전체 probe는113.09초→53.82초다. 신규 owner는 여전히 원본부터 검증하므로 전체 제작 과정이100배 빨라졌다는 뜻이 아니다. 단일 공개 자료, Node의 재검증 함수 계측이며 UI 응답·서버 지연·실기기 성능은 미확인이다. 캐시 hit/miss는 직접 계측하지 않았고, 후보의30회 시 heap234,646,048bytes/RSS439,767,040bytes는 한 시점 샘플이지 peak나 기존 대비 증감이 아니다. 근거는 로컬 `output/alpha-m72-native-replay/measurement.json`, `candidate-measurement.json`이다.

측정 후 캐시 v3를 구현했다. exact JSON key·descriptor 검증·return clone·LRU8개·과대값 full replay는 유지한다. 큰 값의 변조와 byte 예산에 따른 퇴출 검사를2개 더해 inverse+캐시 표적45/45가 통과했다. 입력 허용 범위를 확대하거나 변조 검증을 생략하지 않는다. 32MiB는 모듈 전역 캐시의 문자열 환산 예산이지 계정별 할당량이나 전체 heap 상한이 아니다.

최종 코드에서도 공개 probe30회가 완료됐다. 30회 같은 owner 검증은154.023–187.811ms였고, 크기·캐시 산식은 앞선 두 실험과 같았다. 전체152.206초 및 sampled heap111,093,368bytes/RSS384,819,200bytes는 다른 검증과 동시에 실행한 값이므로 후보 실행과 직접 성능·메모리 증감 비교를 하지 않는다. 근거 `output/alpha-m72-native-replay/implemented-measurement.json`. 기존/후보 결과는 덮어쓰지 않았다. probe 출력은 exclusive 생성이므로 이미 결과가 있는 경로의 재실행은 보존을 위해 거절한다.

동시 검증 중 PC 여유 메모리가 약1.3GiB로 줄어 build1회를 중단했다. 별도 도구 타입 검사가 전체 프로젝트를 구성하던 프로세스도 소유 담당자가 중단하고 명시한 entry만 검사하도록 다시 실행했다. 중단 실행은 PASS로 세지 않는다. 제품/자료 오류나 용량 정책 변경이 아니라 로컬 검증 자원 운용 기록이며, 이후 최종 build는 통과했다.

## 직전 200만 자 단계의 남은 순서와 한계

아래1번의 선행 우선순위는 위400만 자 승인으로 변경됐다. 한도 조정은 로컬에서 완료했으며 구조적 이력 축소와 전체 계정100회 부하검사는 후속 성능/장기 용량 과제로 남긴다. 원격 적용과 실제 자료 시험의 승인 경계, 다른 writer/백업 보장/미연결 콘텐츠의 잔여는 그대로다.

1. **우선**: 문서 내부의 반복 snapshot/history 증가를 손실 없이 줄이는 호환 설계·구현을 검토하고 이번에 미충족한100회 편집을 다시 검사한다. 현재 한도/이력 삭제 정책을 새로 정하는 사용자 결정 대기는 아니다. 보존 의미를 바꿔야만 진행할 수 있으면 그때 결정을 요청한다.
2. 별도 승인한 경우 이번 additive migration을 DEV에 적용하고 격리 QA 계정의 실제 writer·Undo·백업을 확인한다. 이는 문서 크기 문제까지 해결한 배포가 아니다. 실제001/002의 시험용 편집은 자동 수행하지 않는다. 승인이 없으면 로컬 검증과 원격 미적용 상태를 유지한다.
3. 다른 private/social writer의 전체 값 inverse, 원본 import archive, 실제 media 증가까지 포함한 **저장 후 전체 백업 가능성 보장**은 아직 미구현이다. 신규 데이터만 작게 만드는 이번 수정으로 이미 큰 과거 이력도 작아졌다고 주장하지 않는다. 전체 백업 기준의 저장 전 여유 검사와 손실 없는 분할 보존을 비교한다. 한도를 높이거나 이력을 지우는 정책으로 대신하지 않는다.
4. 성능은 별도 구간 계측으로 검토한다. 누적 검사에는 dispatch 외에 전체 hash·추가 계정 검증·inverse·redo·원상복구 대조가 반복된다. 총 실행시간을 UI 한 번의 응답시간으로 환산하지 않는다. cache v3는 entry16MiB/total32MiB까지만 보관하며 신규·변경·과대 owner는 full replay한다. 실제 경로의 hit/miss와 구간별 비중은 아직 계측하지 않았다.
5. 제한 실자료의 독립 백업 사본·명시 실제 복원·기기별 일상 사용과 미연결 콘텐츠166개·Map의 제작/개인 실행은 기존 M7-2 원장에 남는다. 이번 저장 형식 수정을 이유로 닫지 않는다.

## 직전 로컬 검증 시점의 발행·관찰 상태 — DEV 적용 전 이력

| 항목 | 이번 작업의 상태 |
| --- | --- |
| commit | 미실행 |
| push | 미실행 |
| PR | 생성/수정 미실행 |
| merge | 미실행 |
| Preview | 배포 미실행 |
| Production | 배포·설정·DB 접근 미실행 |
| DEV migration | 원격 미적용·실계정 변경0, 별도 승인 전 |
| 브라우저 화면 | 390×844·375×812·844×390·1024×768·1440×900 이번 재검사 미실행. 새 DB 형식은 원격 미적용이며 화면/CSS 변경 없음 |
| 실제 기기 | Android Chrome·iOS Safari 미실행 |
| 관찰 사용자 수 | 사용자 연구0명 |

과거 화면 검사 수를 이번 실행 수에 합산하지 않는다. SQL·Node·WASM 검사를 브라우저/실기기/관찰 사용자 근거로 바꾸지 않는다.
