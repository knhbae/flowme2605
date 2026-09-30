# 핵심 UX·저장 복구 개발계 선별 반영

## 승인과 기준

사용자의 10/1 ‘다음 목표잡고 ㄱㄱ’는 직전 제안인 핵심 UX·저장 복구 개선의 노트북·Cloudflare 개발계 안전 반영을 승인한다. 시작점은 `905c4c3133708d5f396c5d1d275168d6fdc69220`이다. [저장 복구 계약](../2026-09-30-alpha-private-save-ack/spec.md)과 [기존 변경 소유 원장](../2026-09-30-alpha-private-save-ack/ownership.md)을 보존한다.

현재 실행 앱은 별도 mixed 작업 폴더의 build `OzumXeWoxE3M0moIOghh_`, loopback 3105다. 이 폴더의 기존 dirty·미추적 파일은 미소유다. 원본 코드·설정·자료를 복사하거나 수정·stage·게시하지 않는다. 독립 후보에서 현재 호스팅 및 활성 legacy 백업 계약에 필요한 코드를 새로 작성한다.

## 반영 계약

- `alpha.wikiplans.com`의 기존 Tunnel을 유지한다. 개발계 Supabase만 기존 설정으로 사용하고 Auth·DB·SQL·Tunnel 설정은 변경하지 않는다.
- Cloudflare 모드는 명시한 HTTPS origin과 정확한 callback/Host/forwarded HTTPS/Origin을 검사한다. wildcard·다른 호스트·운영 프로젝트·checkpoint 모드는 거절한다.
- 실행기는 기존 승인 설정 파일을 읽어 허용 key만 자식 프로세스에 전달한다. secret을 출력·복사·기록하지 않는다. catalog는 명시한 기존 파일을 읽기 전용으로 참조한다.
- 신규 5D 백업은 항상 off다. 새 jobs·worker·Storage·lease·migration 구현은 가져오지 않는다. 기존 legacy 백업의 지연·취소·시간/크기 제한·중복 요청 보호를 유지한다.
- 후보는 별도 폴더에서 빌드하고 loopback QA 포트로 먼저 검사한다. 기존 실행 build와 설정은 rollback용으로 그대로 둔다. 준비가 끝난 뒤 확인된 기존 앱 프로세스만 교체하며 Tunnel은 중단하지 않는다.
- 일반 `/my`, 개인 자료, 운영 storage/schema, main과 기존 PR #204는 변경하지 않는다. 실사용 계정 쓰기·복원·백업 요청은 실행하지 않는다.

## 평가와 완료 조건

1. 호스트/환경 부정 회귀, legacy 백업 지연·취소·실패 회귀와 관련 기존 테스트 통과.
2. 현재 후보의 `npm test`, production build, docs 검사, 보안 감사 통과.
3. 브라우저에서 합성 네트워크 fixture로 실제 후보 bundle의 작성·폴더·날짜/시간·저장·reload 및 ACK 복구를 확인. 실제 DB 쓰기와 구분한다.
4. 다섯 viewport(390×844, 375×812, 844×390, 1024×768, 1440×900)의 핵심 행동, 가로 넘침·console/page error를 검사.
5. 이전 앱의 exact build/시작 방법을 기록하고 실패 시 복귀 가능한 상태에서 앱만 교체.
6. 외부 HTTPS health/alpha/callback·off 경로와 후보 build를 확인. 실제 사용자가 검증한 것으로 표현하지 않는다.

새 소유권 승인이나 설정/데이터 변경 없이는 위 경계를 지키기 어려우면 안전한 대안을 확인한 뒤 필요한 범위를 사용자에게 묻는다.

## 제외와 남은 작업

main 병합, Render/Vercel 배포, Windows 자동 시작 등록·재부팅, 5D 대용량 시험·활성화, 6~9 후속 기능, 실제 OS IME·iOS·보조기술·사용자 시험은 이번 목표에 포함하지 않는다. 복구된 첫 저장의 server Undo 제한은 기존 미해결 사항이며 정상 다음 저장 Undo와 구분한다.
