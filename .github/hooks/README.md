# Hooks (Preview)

This repository uses policy-driven Copilot hooks in `.github/hooks`:

- `pre-tool-use.json`
- `post-tool-use.json`
- `lifecycle.json`

Hook scripts are located in `.github/hooks/scripts` and enforce high-rigor behavior:

- `pre-tool-use.cjs`
	- Blocks dangerous destructive terminal commands.
	- Requests manual approval for large edit batches or hook-file edits.
- `post-tool-use.cjs`
	- Injects validation follow-ups after edits/tests.
- `session-start.cjs`
	- Injects orchestration context at session and subagent start.
- `stop-gate.cjs`
	- Blocks first stop attempt until validation evidence is summarized.

## Notes
- VS Code hooks are preview features and may change.
- Hook files in `.github/hooks/*.json` use VS Code compatible hook format.
- Keep hooks fast and deterministic.
- Avoid hardcoding secrets in hook commands.
- Review hook scripts like production automation code.
