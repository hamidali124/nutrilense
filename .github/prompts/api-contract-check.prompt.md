---
name: api-contract-check
description: Verify request/response consistency between app, Node API, and Python service.
agent: agent
argument-hint: route or endpoint boundary to validate
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
- [Backend rules](../instructions/backend.instructions.md)
- [Python service rules](../instructions/python-service.instructions.md)

Contract area: `${input:contract}`

Checklist:
1. Identify producer/consumer boundaries.
2. Compare payload shapes, field names, types, and defaults.
3. Check error-path compatibility.
4. Check status-code consistency and auth/validation behavior.
5. Propose/implement minimal compatibility fixes.
6. Provide a compatibility summary table, commands run, and residual risks.
