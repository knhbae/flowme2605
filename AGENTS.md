# FLOW Agent Entry Point

This repository uses an AI-agnostic harness. Any coding agent should start with:

1. [agent.md](./agent.md)
2. [docs/STATUS.md](./docs/STATUS.md)
3. [docs/ROADMAP.md](./docs/ROADMAP.md)
4. [docs/harness/README.md](./docs/harness/README.md)

Do not assume Claude-specific tools are available. If a tool supports subagents, use the roles in [docs/harness/ROLES.md](./docs/harness/ROLES.md). If not, run the same phases manually and keep implementation, review, and QA as separate passes.

Core commands:

```powershell
npm install
npm test
npm run build
npm run test:e2e
npm run dev
```

