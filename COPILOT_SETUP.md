# NutriLens Copilot Power Setup

This repo is now configured with team-shared Copilot customization for VS Code.

## Included
- Always-on instructions: `.github/copilot-instructions.md`
- Cross-agent compatibility instructions: `AGENTS.md`
- Path-specific instructions: `.github/instructions/*.instructions.md`
- Reusable prompts: `.github/prompts/*.prompt.md`
- Custom agents + orchestration: `.github/agents/*.agent.md`
- Skills: `.github/skills/*/SKILL.md`
- Hooks (preview): `.github/hooks/*.json`
- MCP servers: `.vscode/mcp.json`
- Workspace defaults: `.vscode/settings.json`, `.vscode/extensions.json`

## How to use
1. Reload VS Code window.
2. Open Copilot Chat.
3. Type `/` to see prompts and skills.
4. Select an agent from the Agents dropdown (`orchestrator`, `mobile-agent`, etc.).
5. Use handoff buttons from `orchestrator` to move between specialists.

## Recommended workflow
1. Start with `orchestrator` agent for planning and task routing.
2. Handoff to specialist agent (`mobile`, `backend`, `python-ml`) for implementation.
3. Handoff to `qa-agent` for verification summary before finalizing.

## MCP setup
Configured in `.vscode/mcp.json`:
- `github` (HTTP): `https://api.githubcopilot.com/mcp`
- `filesystem` (stdio): `@modelcontextprotocol/server-filesystem` scoped to `${workspaceFolder}`

After reload:
- Run `MCP: List Servers` in Command Palette.
- Start and trust servers when prompted.

## Hooks setup
Hooks are minimal and non-blocking by default:
- `preToolUse` reminder before tool actions.
- `postToolUse` reminder to capture verification details.

## skills.sh integration (optional)
Primary skills are in `.github/skills`. You can additionally import shared skills from the open ecosystem:

```bash
npx skills add owner/repo
```

If imported skills are placed in `.agents/skills`, they are still discoverable due to `chat.agentSkillsLocations` in workspace settings.

## Validation commands
- Frontend tests: `npm test`
- Backend run: `cd server && npm start`
- Python service tests: `cd server/python_service && pytest`

## Known repo note
`server/python_service/QUICK_START.md` references old model filenames. Current model files in `server/python_service/models` are:
- `rf_hypertension.pkl`
- `rf_diabetes.pkl`
- `model_features_hypertension.json`
- `model_features_diabetes.json`
