---
name: implement-feature
description: Orchestrated feature delivery with planning, layered implementation, and QA gate.
agent: agent
argument-hint: feature request + constraints + non-goals + acceptance criteria
tools:
	- search
	- web/fetch
	- execute/runInTerminal
	- execute/getTerminalOutput
	- edit/editFiles
	- execute/testFailure
	- agent
---

Use:
- [Workspace instructions](../copilot-instructions.md)
- [Prompts](./implement-feature.prompt.md)
- [Skills](../skills/repo-onboarding/SKILL.md)

Feature request: `${input:feature}`

Execution requirements:
1. Build an impact map (mobile/backend/python/tests/docs) and identify contract boundaries.
2. Produce a dependency-aware implementation plan with verification gates per step.
3. Delegate layer-specific implementation via handoffs to specialist agents.
4. Require each specialist to return changed files, rationale, and command outcomes.
5. Run final QA handoff before completion.
6. Return a delivery summary with: implementation scope, validation matrix, residual risks.
