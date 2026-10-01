# 개발계 앱 교체·복귀

대상은 `https://alpha.wikiplans.com/alpha`와 기존 Tunnel의127.0.0.1:3105이다. 설정 root는 `D:/flowme2605/flow-alpha-backup-5d-publish-20260929`이며 원본을 수정·복사하지 않는다.

1. 검사를 마친 후보 소스 hash·게시commit·build ID를 결합해 기록한다. build 뒤 source가 달라지면 교체하지 않는다. 기존 launcher의`--check`는 build/config/catalog형태 검사이지 source-build결합 증거가 아니다.
2. 현재 이전 앱은 `D:/flowme2605/flow-alpha-cloudflare-core-ux-20261001`의build `F9QqWgnGf7n_PaVUEavrK`다. child2184/parent10020·생성시각·실행경로·3105소유를 교체 직전에 재검사한다. 예전`Ozum…`build를 이번 최신 복귀본으로 쓰지 않는다.
3. `scripts/alpha/writing-ux-release-evidence.mjs`의capture와assert-preserved/source로 이전build/config·기존설정2개·pack·후보source/build 불변을 검사한다. 출력은hash·개수만, 로컬output은Git제외다.
4. loopback3106에서 현재production JS/CSS와합성Auth/API의핵심동선·모바일delta를 검사한다. 실제 계정/DB로 전달하지 않는다.
5. 검증된 현재 앱 child/launcher만 종료하고 포트공석을 확인한다. 기존Tunnel은 건드리지 않는다. 후보폴더에서 `node --import tsx scripts/alpha/cloudflare-release.ts --settings-root=D:/flowme2605/flow-alpha-backup-5d-publish-20260929`로 시작한다. 백그라운드는숨김창·로컬로그만 사용한다.
6. 외부 health/alpha/callback·무인증보호401·backup-jobs503, 배포자산/QA자산path별hash·다섯크기합성동선을 확인한다. 실패하면새프로세스소유를재확인후종료하고아래복귀한다.

## 게시 hook과 실행 중 build 보호

pre-push의기존verify/build는우회하지않는다. 후보앱을시작하기전게시hook이마지막으로만든build를고정하고3106에서재검사한다. 반영후최종보고서commit은같은검증commit에서만든깨끗한별도게시worktree에서작성/검사/push한다. 실행중인앱의worktree에서는build/install을돌리지않는다. 최종문서commit은제품source변경0임을확인한뒤앱worktree에fast-forward로받고build ID/자산hash를다시대조한다. 최신게시head CI와개발계실행build의근거를따로기록하며문서commit을새제품build로표시하지않는다.

## 복귀

기존core-ux폴더에서 같은실행기에 위settings-root를 전달해기존build를다시시작한다. 이전폴더에서build/install을돌리거나`.next`를변경하지않는다. 포트3105/외부응답·backupoff를확인한다. Tunnel·DB/Auth·원본설정은유지한다. 실제복귀실행여부와준비만한경우를QA에서구분한다.

앱교체중짧은접속중단은가능하다. 기존탭의입력/로그인저장값을지우지않는다. 폰·태블릿에는별도설치없이같은주소가적용되지만저장상태확인후새로고침한다. 노트북·앱·Tunnel은켜져있어야한다. 자동시작/장시간탭안정성은별도후속이다.
