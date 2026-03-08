---
name: bug-triage
description: High-rigor bug triage with deterministic reproduction, root-cause ranking, and QA closure.
agent: agent
argument-hint: bug report + expected behavior + observed behavior + reproduction clues
tools:
	- search
	- execute/runInTerminal
	- execute/getTerminalOutput
	- edit/editFiles
	- execute/testFailure
	- agent
---

Use these instructions and produce a concise execution log:
- [Workspace instructions](../copilot-instructions.md)
- [Testing guidance](../instructions/testing.instructions.md)

Task input: `${input:bug}`

Required workflow:
1. Clarify expected vs actual behavior.
2. Identify likely files/modules and rank top root-cause hypotheses before editing.
3. Reproduce with the smallest deterministic steps and capture evidence.
4. Implement the smallest root-cause fix and avoid unrelated cleanup.
5. Add or update tests proving pre-fix failure and post-fix pass when feasible.
6. Validate with focused tests first, then broader checks if needed.
7. Run QA handoff and return: changed files, root cause, validation evidence, follow-up risks.
