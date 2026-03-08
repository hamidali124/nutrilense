---
name: safe-refactor
description: Refactor for readability/maintainability with behavior preserved.
agent: agent
argument-hint: target module + refactor goal + constraints
tools:
	- search
	- execute/runInTerminal
	- execute/getTerminalOutput
	- edit/editFiles
	- execute/testFailure
	- agent
---

Use:
- [Workspace instructions](../copilot-instructions.md)

Refactor target: `${input:target}`

Rules:
1. Preserve public behavior and external contracts.
2. Prefer small, reviewable commits worth of change.
3. Do not mix unrelated cleanups.
4. Add/adjust tests where behavior-risk exposure exists.
5. Run two-pass review: static diff review then behavior verification.
6. Summarize confidence, residual risk, and rollback note.
