# 개별 Flow 가져오기 — 로컬 결과

## 실제 바뀐 동작

전체 자료실을 저장하지 않은 계정도 콘텐츠를 읽고 정확한 판본 하나만 제작 사본으로 가져올 수 있다. 전체 자료실 보관은 목록의 접힌 선택 동작이다. 읽기·취소는 저장하지 않으며 기존 사본은 같은 사본을 연다.

제품 변경은 `AlphaCatalogLibrary.tsx` 한 파일이다. 기존 `AlphaCatalogCopyActions`, creator 명령, 정본 판본 대조·보류·중복·미저장 입력 보호는 그대로 재사용한다. 서버·DB·권한·인증·운영 코드 변경은 없다. 합성 자료실 fixture는 명시적으로 주어진 읽기 자료와 단일 import만 추가 지원하며 bulk import는 거절한다.

## 검증

- 기준 b785d08843530e0c4f72baa0654f4398172f51ec에서 독립 작업트리 생성. 기존 작업과 성능 후보 제외.
- 변경 전: 미저장 자료실의 UI action 누락을 표적 회귀로 재현. 서버의 단일 import는 변경 없이 통과했다. 처음의 source-pack 미설정 실패는 환경 문제로 별도 보존했다.
- 관련 UI/controller/import 회귀 51 PASS, fixture 회귀 17 PASS. 전체 기존 Alpha QA의 재실행이나 실제 계정 성공이 아니다.
- 제품 타입: 627 entries, diagnostics 0, 검사 중 source 변화 0. Next build 성공.
- 로컬 build: `aWnyDe09lvoK4jf83qNxB`. production assets + 합성 Auth/CAS. 1440×900/390×844 각각 성공 경로와 명시 저장 거절 경로, 총 4 PASS/FAIL 0/skip 0/retry 0.
- 성공 경로: 읽기→확인 취소→단일 저장→사본 열기→새로고침→같은 사본 다시 열기. 추가 사본 0, 전체 자료실 미저장, 기존 개인 문서/계획 불변.
- 거절 경로: preview와 source 보존, 입력 보관 안내 및 기존 재시도 제한 유지. 서버 거절을 성공으로 표시하거나 자동 재시도하지 않았다.
- 실제 렌더 PNG를 확인했다. 가로 넘침 0, 키보드 버튼 활성화와 복귀 확인. 실물폰·OS IME·사용자 이해도 검증은 아니다.
- 독립 read-only source review에서 새 차단/높음 회귀 없음. 브라우저 검증은 개발3 실행이다.

로컬 원장: `output/playwright/single-source-intake-20261011/local1/wrapper-receipt.json`, `results.json`, `artifacts/`. 원본 결과/이미지는 게시하지 않는다. 최초 재현 기록은 `output/single-flow-intake-20261011/initial-reproduction.json`이다.

## 승인된 추가 출처 보류의 국소 검사 (2026-10-11)

콘텐츠 담당이 재검토한 별도25개에 대해 사용자가 신규 검색·시작만 보류하도록 승인했다. 기존24와 합친 정확49개 목록을 기존 정책에 추가했으며, seed 본문·확인일·출처 신선도 기준은 그대로다. 검토 완료14개는 모두 사용 가능하고, 보류 대상의 기존 개인 날짜·메모·완료 기록과 같은 사본 재열기는 보존한다. 이번 추가 runtime 변경은 `public-source-review-policy.ts` 하나다.

관련 정책·신선도 회귀는 최초58 PASS/1 FAIL이었다. 원인은 이전 공개 경로 개수97을 기대하던 재고 assertion이었다. 승인된25개 보류를 반영한 정확 기대 개수로만 고친 뒤59 PASS/0 FAIL/0 SKIP였다. runtime132 중 일반 경로62·preview/hidden70, 보관 집합21은 그대로다. 90/180일·미래일·누락·현재 일반 경로의 기한 초과 거절은 완화하지 않았다. 제품 타입627 entries/diagnostics0도 통과했다.

원래 실패와 재검사 원장은 `output/single-flow-intake-20261011/hold25-policy/`에 각각 보존한다. 이 검사는 실제 계정 저장·새 제공판 성공이 아니며, 위 `aWny`는 추가 정책 적용 전 로컬 build 이력이다. 이후 정확 새 commit/build/CI/브라우저 결과를 별도로 연결한다.

## 남은 실제 단계

이 문서는 로컬 결과다. 새 게시·CI·Alpha 전환·정상 시험계정 등록·날짜/반복/메모/진행의 실제 재접속 성공은 해당 단계의 새 영수증으로 판정한다. 기존 DB 보완 및 이전 Alpha/CI 결과를 새 후보 성공으로 사용하지 않는다.
