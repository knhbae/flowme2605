# flowme2605

Flow/FlowMe MVP workspace.

## Workspace

- `old_reference/`: curated reference distilled from the legacy `old/` and `claude_ver/` folders.
- `agent.md`: AI-agnostic operating guide for future agent sessions.
- `AGENTS.md`: short entry point for tools that auto-detect agent instructions.
- `docs/STATUS.md`, `docs/ROADMAP.md`, `docs/HISTORY.md`: document memory for current state, future work, and releases.
- `docs/harness/`: AI-agnostic harness roles, SDLC, and QA rules.
- `docs/happy-integration.md`: how to start this project through Happy for mobile/web remote control.

## Remote Agent Access

Happy is installed as a global CLI on this machine. To control future Codex sessions from the Happy mobile or web app, start Codex from this project directory with:

```powershell
cd D:\flowme2605\flow-mvp
happy codex
```

See `docs/happy-integration.md` for the full setup notes.
