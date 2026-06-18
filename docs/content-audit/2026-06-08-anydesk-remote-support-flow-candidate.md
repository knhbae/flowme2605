# 2026-06-08 AnyDesk Remote Support Flow Candidate

Purpose: advance the third external-ecosystem roadmap candidate into a concrete FlowMe Stage 0 experiment candidate.

Status: source-to-Flow QA candidate, not validated by user behavior.

## Why This Candidate

AnyDesk remote support setup is a useful FlowMe candidate because users do not only need installation steps. They need a short support-session checklist that tells them:

- whether this is one-time support or repeated management;
- which permissions to allow;
- what not to share or store;
- how to close the session and revoke temporary access.

This expands the FlowMe source map into the digital setup axis. It also tests whether FlowMe can preserve security boundaries without becoming a device-management or security product.

## Source Evidence

Checked on 2026-06-08.

| Source | Evidence Shape | Useful Flow Cues | Boundary |
|---|---|---|---|
| AnyDesk Help, Unattended Access | official help doc | unattended access disabled by default, manual accept/reject when disabled, password setup, 2FA, saved-token reset/revoke, vendor caution | official source; do not rewrite into general security advice beyond source |
| AnyDesk Help, Settings | official help doc | security settings, interactive access, permission profiles, access control list, discovery settings | product feature source, version/settings may change |
| AnyDesk permission management feature page | official product page | users can decide permission degree before/during session; screen sharing can disable permissions; remote support may need broad permissions | marketing page; use only for permission concept |
| 강원컴퓨터 PC 해결 이야기 AnyDesk article | Korean setup article | official download, install, workstation ID, password setting, actual connection | includes direct file download link; FlowMe should point users to official download instead |
| 프로그램 정보마당 AnyDesk security article | Korean security article | one-time vs repeated support, no shared fixed password for one-time support, reduce file/clipboard permissions, check/revoke after session | blog guidance; use as practical support checklist, not official AnyDesk policy |
| Hyper-world AnyDesk guide | Korean guide/search result | official download caution, accept popup, permission settings, scam warning | supporting source only unless page is manually reviewed in detail |

## User Behavior

- User moment: a person is about to receive remote PC help from a vendor, family member, coworker, or support operator.
- Current behavior: search an installation blog, download/run AnyDesk, send ID, approve requests, then forget to remove access settings after support ends.
- Manual breakpoints:
  - installation steps and security decisions are mixed together;
  - users may create unattended-access passwords for one-time support when manual approval is safer;
  - file transfer, clipboard, and input permissions are often left broader than needed;
  - access cleanup after the support session is easy to skip;
  - unknown callers or messenger contacts asking for remote access are a fraud-risk trigger.

## FlowMe Fit

- Input FlowMe can take: support type, support time, trusted helper/vendor name.
- Output FlowMe can produce: one-session setup checklist, session-permission memo, closeout checklist.
- Natural artifact: `internal_check`, with optional memo/share text.
- Minimum anchor: support time or "start now".
- Stage 0 behavior:
  - `open`: user opens the candidate from an AnyDesk setup/security source.
  - `anchor input`: user chooses one-time support or repeated management.
  - `copy/export`: user copies the permission/closeout checklist.
  - `check`: user marks download, identity check, permission review, session close, revoke/cleanup.
  - `feedback`: user reports unclear permission or post-session cleanup gap.

## Conversion Decision

Conversion decision:

- User need: As a user preparing remote support, I need a one-session checklist for installing AnyDesk, approving only the needed permissions, and revoking temporary access after support, so that I can get help without leaving broad remote access behind.
- Content shape: official product help + Korean setup/security articles.
- Primary destination: `internal_check`.
- Structure: `checklist`.
- Action count: 7 source-derived rows.
- Playbook: source-specific setup checklist.
- Exceptions: one-time support should default to manual approval rather than unattended access. Repeated management can show unattended-access requirements, but only with strong password, 2FA/ACL consideration, and revoke guidance.
- Risk/source handling: official product facts, practical security guidance, and fraud warnings stay separate. FlowMe does not store AnyDesk ID, unattended-access password, tokens, session screenshots, or support-chat transcripts.

## Proposed Flow Items

Default mode: one-time support.

| Step | Item | Destination | Completion |
|---:|---|---|---|
| 1 | 지원 상대와 목적 확인 | checklist | 내가 먼저 요청한 지원인지, 상대 이름/업체/작업 범위를 확인했다. |
| 2 | 공식 경로에서 AnyDesk 열기 | checklist | 공식 다운로드 또는 이미 설치된 앱을 사용했고, 출처가 불분명한 실행 파일은 쓰지 않았다. |
| 3 | 일회성/반복 접속 구분 | checklist | 이번 지원이 한 번이면 무인 액세스 암호를 만들지 않고 수동 승인 방식으로 진행하기로 했다. |
| 4 | 접속 요청 승인 전 권한 확인 | checklist | 상대 이름/ID와 목적을 확인하고, 필요 없는 파일 전송/클립보드/프린터 권한은 껐다. |
| 5 | 민감 화면 닫기 | checklist | 금융 사이트, 사내 시스템, 개인 사진/문서 폴더 등 민감 화면을 닫았다. |
| 6 | 세션 종료 확인 | checklist | 지원이 끝난 뒤 원격 세션이 종료됐는지 확인했다. |
| 7 | 임시 접근 정리 | checklist | 무인 액세스, 저장된 로그인, 주소록/최근 연결, 파일전송 권한, 자동시작 필요 여부를 확인했다. |

## Export Shapes

### Checklist Copy

```text
AnyDesk 원격지원 체크

1. 내가 먼저 요청한 지원인지, 상대 이름/업체/작업 범위를 확인했다.
2. 공식 다운로드 또는 이미 설치된 AnyDesk 앱을 사용했다.
3. 한 번만 받는 지원이면 무인 액세스 암호를 만들지 않고 수동 승인으로 진행한다.
4. 접속 요청을 승인하기 전에 상대 이름/ID와 목적을 확인했다.
5. 필요 없는 파일 전송, 클립보드, 프린터, 소리 공유 권한을 껐다.
6. 금융 사이트, 사내 시스템, 개인 사진/문서 폴더 등 민감 화면을 닫았다.
7. 지원이 끝난 뒤 세션 종료, 무인 액세스, 저장된 로그인, 주소록/최근 연결, 자동시작을 확인했다.

주의: 알 수 없는 사람이 전화나 메신저로 원격 접속을 요구하면 먼저 사기 가능성을 확인하세요. AnyDesk ID, 무인 액세스 암호, 인증 코드는 FlowMe에 저장하지 않습니다.
```

### Repeated Management Memo

```text
반복 원격관리용 메모

- 장치 이름:
- 담당자:
- 접속 가능 시간:
- 허용 권한:
- 무인 액세스 사용 여부:
- 2FA/접근 허용 목록 확인:
- 다음 권한 점검일:

암호, AnyDesk ID, 인증 코드는 여기에 적지 않는다.
```

## Source And Risk Separation

### Official/Product Facts

- AnyDesk Help states unattended access is disabled by default, and when it is disabled someone must manually accept or reject the connection request.
- AnyDesk Help describes unattended-access password setup, 2FA for unattended access, and saved login token reset/revoke paths.
- AnyDesk settings documentation groups interactive access, unattended access, permission profiles, privacy settings, and access control list rules under security settings.
- AnyDesk permission materials state users can control the degree of access before or during a session.

### Practical Security Guidance

- One-time support should prefer manual approval.
- Repeated management needs device naming, access scope, password hygiene, and post-session review.
- Permission scope should match the support job.
- Session closeout is part of the user job, not optional cleanup.

### Do Not Store

- AnyDesk ID or alias;
- unattended-access password;
- 2FA code;
- saved-login token;
- session screenshots;
- chat transcript containing support details;
- device password;
- file paths to private folders;
- support vendor account credentials.

### Caution Copy

This Flow is a support-session checklist, not a security guarantee. If an unknown person contacts you first and asks for remote access, do not proceed until you independently verify the vendor or helper.

## Platform And Competitor Notes

| Tool | Current User Use | FlowMe Position |
|---|---|---|
| AnyDesk | remote support tool | source/service being prepared, not a FlowMe integration target |
| TeamViewer | alternative remote support tool | adjacent competitor/source for future comparison |
| Chrome Remote Desktop | account-based remote access alternative | future comparison, but not needed for this Flow |
| Zoom screen share | lower-control screen sharing | useful distinction: screen share vs remote control |
| Notion/Sheets | internal IT support checklist | destination/reference only; FlowMe should keep one-session checklist lightweight |
| KakaoTalk | support appointment or family sharing | memo/share-text destination |

## Product Decision

- A/B/C: `A-`.
- Why: clear setup sequence, strong user risk, and a distinct digital setup axis. The minus is because FlowMe must avoid appearing to endorse remote access or provide security assurance.
- Next action: keep as a `/content-flows` review candidate after dorm and elementary candidates. It needs a very visible "do not store secrets" boundary.
- Do not build:
  - AnyDesk integration;
  - device/address book storage;
  - password vault;
  - remote session log;
  - support-ticket product;
  - scam detection claim;
  - security certification or guarantee.

## Rubric Summary

- User Need Fit: 4
- Execution Clarity: 5
- Content Fidelity: 4
- Portability: 4
- Cognitive Load: 4
- Copy Specificity: 5
- Source/Safety: 5
- Accessibility/Operability: 4

Top fixes before UI promotion:

1. Default to one-time manual approval, not unattended access.
2. Put `AnyDesk ID/암호/인증코드는 저장하지 않음` near the first action and copy/export area.
3. Separate setup steps from closeout steps visually.
4. Add an early "내가 먼저 요청한 지원인가?" gate before installation instructions.

## Recommendation

Promote this as the third detailed Phase 1 candidate, but keep it behind dorm and elementary for first UI implementation.

Reason:

- It expands FlowMe into digital setup and security-aware checklists.
- It requires stricter caution copy and could be misread as security advice if the UI is too confident.

Preferred implementation path:

1. Add as `/content-flows` review candidate after the two life-transition candidates.
2. First screen should show `지원 상대 확인` and `한 번이면 수동 승인` before setup detail.
3. Use no persistent anchor by default; optional support time only.
4. Put closeout checklist in the primary artifact, not hidden in secondary notes.

## Review UI Pass

Updated on 2026-06-08 after dorm and elementary review work.

What changed in `/content-flows`:

- The first visible action is now `누가 먼저 요청한 지원인지 확인`, not installation.
- The execution preview defaults one-time support to `수동 승인`.
- The sensitive boundary is visible in the primary checklist: AnyDesk address, password, and auth values are not stored.
- Closeout remains in the primary artifact through `세션 종료와 보안 설정 확인`.
- On mobile, selecting the candidate scrolls the execution preview into the first viewport instead of leaving it below the candidate rail.

Verification:

- `npx tsx --test lib/flow/korean-flow-content-candidates.test.ts` passed 14 tests.
- `npm run build` passed.
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "content flows studio renders saved execution previews for every candidate|content flows studio keeps the execution preview near the first mobile viewport"` passed 2 tests.
- Visual evidence: `output/playwright/content-flows-anydesk-mobile-after.png`.

Current decision: keep AnyDesk as a `/content-flows` review candidate. Do not add a public `/f/[slug]` route until the digital setup axis is compared against at least one adjacent remote-support or screen-share alternative.

Follow-up comparison completed: [2026-06-08 Remote Support Adjacent Service Comparison](./2026-06-08-remote-support-adjacent-service-comparison.md).

Updated product stance: keep AnyDesk as a review candidate, but treat the stronger future candidate as a generic remote-help precheck that asks the user to choose screen share only, one-time remote control, or repeated/unattended management before opening a tool.

## Source Snapshot

- AnyDesk Help, "Set up Unattended Access", opened 2026-06-08: `https://support.anydesk.com/docs/unattended-access`
- AnyDesk Help, "AnyDesk client settings", opened 2026-06-08: `https://support.anydesk.com/docs/settings`
- AnyDesk, "Remote Access Permission Management", opened 2026-06-08: `https://anydesk.com/en/features/permission-management`
- 강원컴퓨터 PC 해결 이야기, "원격 제어 프로그램 애니데스크(AnyDesk) 다운로드 및 설치 방법", opened 2026-06-08: `https://gwinfo.tistory.com/696`
- 프로그램 정보마당, "애니데스크(AnyDesk) 설치 방법과 보안 설정 - 원격 접속 전 확인할 점", opened 2026-06-08: `https://ktpinformation.com/anydesk-guide/`
- Hyper-world, "애니데스크 (AnyDesk) 무료 다운로드 & 사용법 완벽 가이드", search lead checked 2026-06-08: `https://hyper-world.co.kr/?p=1057`
