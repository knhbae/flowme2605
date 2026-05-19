# Agent Operating Guide

## Mission

Continue the Flow/FlowMe project pragmatically. Use `old_reference/` as the first context source instead of rereading all of `old/` and `claude_ver/`.

## Context Priority

1. `old_reference/` is the curated working reference.
2. `claude_ver/files.zip` is the latest product direction as of 2026-05-19.
3. `old/FlowMe260316` preserves important execution-app ideas: dependency DAG, EventLog, ContentSnapshot, shift_item, mobile mockups.
4. `old/FlowMe251010web` and `old/FlowMe251010web_clean` preserve Next.js POC implementation patterns.
5. Flutter/Firebase POCs are legacy reference only.

When sources conflict, prefer the newest validated direction: Next.js + TypeScript + Tailwind + Supabase + Vercel, with Phase 1 kept small.

## Product North Star

Flow turns real experience content into executable checklists and schedules. The MVP should help a user copy/export a trusted checklist and start immediately.

Do not let long-term ideas dilute the first version. Community, token economy, advertising, matching, native app, and complex integrations are later phases.

## Current MVP Bias

Start with validation before heavy development.

- Phase 0: manually create one parenting checklist and test it with 10 parents.
- Phase 1: web-only creator editor, public plan page, date input, clipboard/CSV export.
- Avoid Google OAuth, Notion, mobile app, required signup, token/coin, and full AI automation in Phase 1.

## Engineering Defaults

- Prefer Next.js App Router, TypeScript, Tailwind, Supabase, Vercel.
- Keep data relational and typed.
- Preserve immutable versioning for plan items.
- Write tests for date calculation, export formatting, and any versioning or dependency logic.
- If implementing dependency-based execution, test `shift_item` and cycle detection before UI polish.
- Keep UI mobile-first for user-facing flow consumption. Studio/admin screens can use denser desktop layouts.

## Remote Session Access

- Happy CLI is available globally for mobile/web remote control of future Codex sessions.
- Start remote-capable sessions from the project root with `happy codex`.
- Use `happy.cmd codex` on Windows if PowerShell command resolution blocks `happy`.
- See `docs/happy-integration.md` for pairing and app links.

## UX Principles

- Public flow detail is the landing/conversion page.
- Show real stats only when there is enough data. Hide empty social proof sections rather than invent numbers.
- The main signed-in home should prioritize execution: current flows, today’s actionable items, delayed items.
- Use simple copy that matches the actual MVP behavior: clipboard/CSV export is not the same as direct calendar sync.

## Documentation Rules

- Update `old_reference/` only when a new decision supersedes the current summary.
- Do not copy full old documents into the new working area.
- Link back to source paths when a decision depends on a legacy artifact.
- Keep docs short enough that a new agent can read them before coding.

## Safety

- Do not edit or delete files under `old/` or `claude_ver/` unless the user explicitly asks.
- Avoid using legacy secrets or service account files.
- Treat old Firebase service keys and generated artifacts as untrusted legacy material.
