# Happy Integration

Happy is a CLI wrapper for running Codex or Claude Code with mobile/web remote control. It is not a project SDK and does not need to be installed into this repository.

## Current Setup

- Happy CLI is installed globally on this Windows machine.
- Verified installed version: `1.1.8`.
- CLI launcher paths:
  - `C:\nvm4w\nodejs\happy`
  - `C:\nvm4w\nodejs\happy.cmd`
- This repository remains connected to GitHub and Vercel separately.

## Start a Happy-Controlled Codex Session

Run this from a normal interactive terminal, not from Codex's non-interactive tool shell:

```powershell
cd D:\flowme2605\flow-mvp
happy codex
```

Then choose mobile app or web browser authentication and pair the session from:

- iOS app: https://apps.apple.com/app/happy-coder/id6748654969
- Android app: https://play.google.com/store/apps/details?id=engineering.happy.app
- Web app: https://app.happy.engineering

## Operational Notes

- Existing Codex desktop sessions cannot be retroactively wrapped by Happy. Start a new session with `happy codex`.
- If PowerShell blocks `happy`, use `happy.cmd codex`.
- If authentication opens an interactive prompt, complete it directly in the terminal so QR/app pairing can render correctly.
- Continue using `D:\flowme2605\flow-mvp` as the project root for GitHub, Vercel, and agent work.

## References

- GeekNews note: https://news.hada.io/topic?id=28500
- Happy GitHub repository: https://github.com/slopus/happy
