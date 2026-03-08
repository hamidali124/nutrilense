# AGENTS.md

This repository supports multiple AI coding agents. Use this as the universal execution contract.

## Core sources of truth
- `.github/copilot-instructions.md` for repository-wide guidance.
- `.github/instructions/*.instructions.md` for path-specific standards.
- `.github/prompts` for reusable task workflows.
- `.github/agents` for specialist orchestration and handoffs.
- `.github/skills` for on-demand procedural capabilities.

## Mandatory workflow
1. Build an impact map (mobile/backend/python/tests/docs).
2. Identify compatibility boundaries before editing.
3. Implement minimal-scope changes only.
4. Validate with focused commands first, then broaden if needed.
5. Perform multi-pass review: static diff review, behavior verification, risk review.
6. Report changed files, command outcomes, and residual risks before completion.

## Contract boundaries
- App ↔ backend request/response compatibility.
- Backend ↔ python service payload/status/error compatibility.
- Auth and validation behavior consistency.

## Scope and quality guardrails
- Avoid unrelated refactors and speculative dependency additions.
- Keep changes aligned with existing patterns and architecture.
- Update docs when behavior, setup, or run instructions change.
