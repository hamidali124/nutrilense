---
name: write-tests
description: Add focused tests for changed logic without over-testing internals.
agent: agent
argument-hint: target files or feature behavior needing tests
tools:
	- search
	- edit/editFiles
	- execute/runInTerminal
	- execute/getTerminalOutput
	- execute/testFailure
---

Use:
- [Testing guidance](../instructions/testing.instructions.md)

Scope: `${input:scope}`

Workflow:
1. Identify behaviors that should be asserted.
2. Create a concise test plan: happy path, edge cases, failure paths, contract checks.
3. Create/extend tests close to affected modules.
4. Prefer deterministic fixtures and avoid brittle implementation-detail assertions.
5. Run the narrowest relevant test command(s), then broaden only when needed.
6. Report coverage intent, command outcomes, and any remaining test gaps.
