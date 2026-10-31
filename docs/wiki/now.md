# 지금 FlowMe

2026-10-31 08:46 KST · 총괄(Claude) 갱신 · ★ = 사용자가 결정하거나 직접 할 일

운영 Alpha는 **N1**(`ZPtHXxThwLF_W1ZVPP4Nb`, commit `f41bf41b`)이다. 10/31 03:2x에 반영했다. 롤백 대상은 R4h `G6Wq8au6Uip5_oSxr9Ldf`이다.

N1에 들어간 것:
- 쓰기 A(모든 문서), UX 개편 R5~R8
- 입력 유실·성능 수정, 폰 틀 W1
- 폴더 줄: B0, 이름 되돌림, ⇤·⇥ 막기
- 유휴 중지, 보관 안내
- QA 3차와 실폰에서 찾은 결함 수정(fix2~fix3)
- 메모 계정 잠김 막기(fix4), 마지막 줄 여백(fix5)

## 사용자 할 일 (★)

- ★ 실계정 본인 체크(약 16분, 편할 때). 진행표는 `planning/context-20261030/FEEDBACK-ROUND.md` 2판이다.
  - A0: 새 계정 첫 화면
  - S5: 001형·002형 문서에서 쓰기·체크·하위 추가·저장·재열기
- ★ 실폰 짧은 확인 한 번(약 17분, 쪼개도 됨). "시작"이라고 보내면 주소를 연다.
  - W 표 `planning/s4-20261030/S4-W-SHEET.md`(8분), N3 표 `S4-N3-SHEET.md`(9분)
  - 둘 다 페이지 v8(N3 `6544a3b0` 위, `000becfb`) 하나에서 한다.
  - N3 통합 QA가 GO면 N2를 건너뛰고 N3를 바로 반영한다. 그러면 실폰 확인도 한 번으로 끝난다.
- ★ 외부 DB 백업. `D:\FlowMe-Secrets\N1\pgpass.conf.txt`의 줄을 `*:*:postgres:*:<비밀번호>`로 바꾸면 코덱스가 세션 풀러로 백업을 뜬다. 직접 주소는 IPv6 전용이라 실패했다.

## N1 반영 기록

- 근거
  - 코덱스 확인: fix2 결함 둘 해소, fix3 17/18(남은 1조건은 fix5로 해소), fix4 GO, fix5 GO
  - 실폰 S4 1·2회차 통과(삼성 Android·Chrome·천지인, 결과 `s4-tunnel-20261030/S4-RESULT.md`)
  - 보안 정적 리뷰: 막는 위험 없음
  - 총괄 검사: 342/342, 앱 tsc 0
  - 반영 직전 Inspect 통과
- 반영 전 백업: DB 안 사본 `flowme_snapshot_n1_20261031`(8표, 행 수·md5 일치)
- 반영 직후 확인
  - supervisor: N1 실행 중
  - 공개 경로: /alpha 200, / 307, /flows 404, /api/alpha/health 200, /my 200
- 기록: `revision-n1/orchestrator/POSTDEPLOY-RESULT-claude.md`(스크래치 원장)
- 알려진 한계
  - 키보드를 닫았다가 한 번에 다시 열면 커서 줄이 12px 가린다. wnext2에서 고쳤다.
  - npm audit NOT_RUN
  - iOS·Gboard·두벌식 실폰 미확인

## 지금 하는 일

| 담당 | 일 |
| --- | --- |
| 코덱스 | N3 통합 QA(우선). 이어서 C9 구현·source-review 11/21 재확인·운영 기록 보존 5판·W16 `- /` 폴더 고르기 구현(`agent/alpha-w16-20261031`, 기반 N3). 외부 백업 재시도(★ 뒤) |
| 개발 세션 | I7 끝(`04973f4c`, 435/435, 코덱스 리뷰 중). C5 월간 격자(`agent/alpha-c5-20261031`, I7 위) |
| 기타 세션 | Flow 콘텐츠 FC1 목록·FC2 상세(`agent/alpha-fc12-20261031`, 기반 N3) |
| 기획 세션 | N3 실폰 짧은 확인표 끝(`planning/s4-20261030/S4-N3-SHEET.md`, 약 9분) |
| UX 세션 | S4 페이지 v8 끝(`000becfb`, 390 확인 통과), 대기 |

## 다음 운영 묶음 N2 (W 묶음)

- 후보: `agent/alpha-wnext3-20261031` `763651bc`
  - 구성: N1 + W8·W9a·W2·W5·W6·W3·W4·W12 + 높이·알약 수정
  - 리뷰: 코덱스 전부 APPROVE
  - 통합 QA: GO(`inbox/wnext3-qa-final-20261031-0538.md`)
  - 보안 정적 검토: APPROVE
- 반영 묶음은 봉인과 Inspect를 통과했다(`D:/flowme-work/codex/n2-deploy-20261031-01a168e3/revision-n2/`, 빌드 `mmmwO6qIvFWpPbC_3Sj6w`). Deploy는 아직 하지 않았다.
- 반영 조건
  - ★ N1 실계정 S5
  - ★ W 실폰 짧은 확인(약 8분, 진행표 `planning/s4-20261030/S4-W-SHEET.md`, 페이지 v7 `072405f3`)
  - 반영 직전 DB 안 백업 새로 뜨기(총괄)
## 그다음 묶음 N3

- 후보: `agent/alpha-n3-20261031` `6544a3b0`, 시험 429/429
  - 구성: N2 + W11 보관 입력 알림 우선(쓰기·오늘·분류)과 옛 키 정리, 이름표 들여쓰기, W15 폴더 이동 알림·모든 문서 적용·되돌리기, 17px 문서 높이, 전송량 probe 2판(기본 꺼짐)
  - 리뷰: 조각마다 코덱스 APPROVE
  - 통합 QA: 코덱스 진행 중
- probe를 켜려면 supervisor 3줄 변경과 DB 함수 적용이 따로 필요하다. 적용 순서 2판(`inbox/egress-probe2-apply-order-20261031.md`)에 리뷰 지적 2건(`null` 거부, 정리 SQL `IF EXISTS`)이 반영돼 있다. N3를 꺼짐으로 반영한 뒤 켠다.

## Supabase 전송량 (10/30 초과)

- 청구기간 10/12~11/12 동안 9.56 GB / 5 GB를 썼다. 유예는 11/29까지다.
- 유휴 중지가 N1과 함께 운영에 들어갔다. 입력이 10분 없으면 자동 읽기를 멈춘다.
- 서버 판본 확인 1차(`8862fab0`)는 리뷰가 끝났다. 10/31 사용자가 PoC 기간 DB 변경을 허용했으니, 총괄이 시점을 정해 적용한다. 변경 없는 비율이 90%면 하루 약 5.4 GB → 0.54 GB로 추정한다.

## 미검증

- 실계정에서 N1 동작(S5, 위 ★)
- iOS·Gboard·두벌식 한글 입력
- 001의 196자 로컬 보관본 보존(R1 때 쓰던 크롬 프로필에 있음)
- 관측 사용자 검증 전부(관측 사용자 0)

[진행판](backlog.md) · [아이디어·피드백](ideas.md) · [문서 지도](docs.md) · [용어집](glossary.md) · [제품 맥락](product.md) · [운영 런북](ops.md) · [시스템 지도](system.md) · [담당표](owners.md) · [결정 기록](decision-log.md) · [위키 사용법](README.md)
