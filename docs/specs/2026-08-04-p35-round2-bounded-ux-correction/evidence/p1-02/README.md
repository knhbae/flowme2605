# P1-02 Q3-B 문구·도움말 증거

**상태:** `PASS — LOCAL INTERNAL EVIDENCE`

이 디렉터리는 `q3Copy=off`로 재현한 before와 default-on implemented 화면, copy assertion, keyboard/focus 결과를 보존한다. 실제 사용자 관찰은 `0명`이다.

## 캡처 manifest

| Surface | Before | Implemented | Viewport |
|---|---:|---:|---|
| discovery `/flows` | 3 | 3 | 390×844, 1024×768, 1440×1000 |
| public `/f/moving-d30-basic` | 3 | 3 | 동일 |
| saved `/my?demo=ux20` | 3 | 3 | 동일 |
| Map `/flow-maps/middle-school-math-1` | 3 | 3 | 동일 |
| 합계 | 12 | 12 | PNG 24장 |

파일명은 `before|after-{discovery|public|my|map}-{390|1024|1440}.png` 규칙을 쓴다. before는 legacy 문구 복구 증거이지 과거 배포 화면을 다시 캡처한 것이 아니다.

## 검증 ledger

- independent source audit: core owned route blocker `0`
- focused integrated: `67/67 PASS`
- default P1-02 E2E: `12/12 PASS`
- rollback P1-02 E2E: `11 PASS + 1 intentional SKIP` — optional Q3 icon 부재가 rollback 계약
- latest P1 visual + Q3: `17/17 PASS`
- affected P0 regression: `39/39 PASS`
- P35 P0 `345/345`, full unit/workflow `1,070/1,070` (`114 + 345 + 611`), build `18/18`
- latest built runtime: `nl0mVLcBPXxwtO73FtGGF`, test-only port `3114`, HTTP `200`
- 4개 화면 모두 viewport horizontal overflow `0`, unnamed visible interactive `0`, 원인 미확인 console/page/request error `0`
- discovery/public/my/Map × 390/1024/1440 × before/after PNG `24장`을 최신 build에서 재생성했다.
- help `?`: Enter·Space open, Escape close, opener focus return PASS
- caution `!`: Enter open, Escape close, opener focus return PASS; inline one-way warning 유지
- exact `q3Copy=off`: URL 유지, raw local/session storage exact-equal; uppercase `OFF`는 default-on

해석과 문구 계약은 [P1-02 closeout](../../p1-02-closeout.md), [copy inventory](../../p1-02-copy-inventory.md), [help/disclosure matrix](../../p1-02-help-disclosure-matrix.md)를 따른다.

이 증거는 core owned Q3 route의 local internal PASS만 증명한다. 생성 artifact 안의 잔여 Flow 라벨과 format field parity는 P1-03, Text Authoring/creator의 별도 editor route는 이 프로그램 밖이다. commit·push·PR·CI·merge·Preview·Production은 수행하지 않았다.
